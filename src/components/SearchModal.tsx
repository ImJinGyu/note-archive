'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Note, Tab, Block, BlockType } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { isUnlocked, setUnlocked } from '@/lib/lockSession'

// 블록 타입별 검색 가능 텍스트 추출
function extractText(type: BlockType, content: Record<string, unknown>): string {
  try {
    switch (type) {
      case 'text':
        return (content.markdown as string) || ''
      case 'code':
        return (content.code as string) || ''
      case 'tip':
        return ((content.items as string[]) || []).join(' ')
      case 'steps':
        return ((content.steps as { title: string; description: string }[]) || [])
          .map(s => `${s.title} ${s.description}`).join(' ')
      case 'table':
        return [
          ...((content.columns as string[]) || []),
          ...((content.rows as string[][]) || []).flat(),
        ].join(' ')
      case 'checklist':
        return ((content.items as { text: string }[]) || []).map(i => i.text).join(' ')
      case 'keyword':
        return ((content.items as { title: string; subtitle: string; example: string }[]) || [])
          .map(i => `${i.title} ${i.subtitle} ${i.example}`).join(' ')
      case 'flow':
        return ((content.steps as { title: string; subtitle: string }[]) || [])
          .map(s => `${s.title} ${s.subtitle}`).join(' ')
      case 'featurelist':
        return ((content.items as { title: string; description: string }[]) || [])
          .map(i => `${i.title} ${i.description}`).join(' ')
      case 'keyvalue':
        return ((content.items as { key: string; value: string }[]) || [])
          .map(i => `${i.key} ${i.value}`).join(' ')
      case 'list':
        return ((content.items as { text: string }[]) || []).map(i => i.text).join(' ')
      case 'credential':
        return ((content.items as { label: string; url: string; memo: string }[]) || [])
          .map(i => `${i.label} ${i.url} ${i.memo || ''}`).join(' ')
      case 'license':
        return ((content.items as { name: string; issuer: string }[]) || [])
          .map(i => `${i.name} ${i.issuer}`).join(' ')
      default:
        return ''
    }
  } catch { return '' }
}

const BLOCK_META: Record<BlockType, { icon: string; label: string }> = {
  text:        { icon: '📝', label: '텍스트' },
  code:        { icon: '💻', label: '코드' },
  tip:         { icon: '💡', label: '팁' },
  steps:       { icon: '🪜', label: '단계' },
  table:       { icon: '📊', label: '테이블' },
  checklist:   { icon: '✅', label: '체크리스트' },
  file:        { icon: '📎', label: '파일' },
  keyword:     { icon: '🔑', label: '키워드' },
  flow:        { icon: '➡️', label: '흐름도' },
  featurelist: { icon: '⭐', label: '기능 목록' },
  keyvalue:    { icon: '🗝️', label: 'Key-Value' },
  list:        { icon: '📋', label: '리스트' },
  credential:  { icon: '🔐', label: '계정정보' },
  license:     { icon: '🪪', label: '자격/면허' },
  link:        { icon: '🔗', label: '노트 링크' },
  poll:        { icon: '🗳️', label: '투표' },
  mindmap:     { icon: '🗺️', label: '마인드맵' },
  embed:       { icon: '🔗', label: '임베드' },
  image:       { icon: '🖼️', label: '이미지' },
  math:        { icon: '🔢', label: '수식' },
  timer:       { icon: '⏱️', label: '타이머' },
  ai_summary:  { icon: '🤖', label: 'AI 요약' },
}

type SearchResultItem = {
  noteId: string
  noteIcon: string
  noteTitle: string
  isLocked: boolean
  passwordHash: string | null
  matchType: 'note' | 'block'
  blockType?: BlockType
  preview: string
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200/80 text-yellow-900 rounded-sm not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function truncateAround(text: string, query: string, radius = 55): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  const end = Math.min(text.length, idx + query.length + radius)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

interface Props {
  onClose: () => void
}

export default function SearchModal({ onClose }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 잠금 노트 처리 상태
  const [lockedNote, setLockedNote] = useState<SearchResultItem | null>(null)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwChecking, setPwChecking] = useState(false)
  const pwRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { if (lockedNote) setTimeout(() => pwRef.current?.focus(), 50) }, [lockedNote])

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (lockedNote) { setLockedNote(null); setPwInput(''); setPwError('') } else onClose() }
      if (lockedNote) return
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && results[selectedIdx]) handleNavigate(results[selectedIdx])
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose, results, selectedIdx, lockedNote])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)

    const lower = q.toLowerCase()
    const { data: notesData } = await supabase
      .from('notes')
      .select('id, icon, title, description, tags, is_locked, password_hash')
      .is('deleted_at', null)

    const notes: Note[] = (notesData || []) as Note[]
    const noteMap = new Map<string, Note>(notes.map(n => [n.id, n]))

    const { data: tabsData } = await supabase
      .from('tabs')
      .select('id, note_id')
      .in('note_id', notes.map(n => n.id))

    const tabs: Tab[] = (tabsData || []) as Tab[]
    const tabNoteMap = new Map<string, string>(tabs.map(t => [t.id, t.note_id]))
    const tabIds = tabs.map(t => t.id)
    if (!tabIds.length) { setResults([]); setLoading(false); return }

    const { data: blocksData } = await supabase
      .from('blocks')
      .select('id, tab_id, type, title, content')
      .in('tab_id', tabIds)

    const blocks: Block[] = (blocksData || []) as Block[]
    const items: SearchResultItem[] = []

    for (const note of notes) {
      const inTitle = note.title.toLowerCase().includes(lower)
      const inDesc = note.description?.toLowerCase().includes(lower)
      const inTags = note.tags?.some(t => t.toLowerCase().includes(lower))
      if (inTitle || inDesc || inTags) {
        items.push({
          noteId: note.id, noteIcon: note.icon, noteTitle: note.title,
          isLocked: note.is_locked, passwordHash: note.password_hash,
          matchType: 'note',
          preview: truncateAround(note.description || note.title, q),
        })
      }
    }

    const lockedNotesAdded = new Set<string>()

    for (const block of blocks) {
      const noteId = tabNoteMap.get(block.tab_id)
      if (!noteId) continue
      const note = noteMap.get(noteId)
      if (!note) continue

      // 잠금 노트: 내용 검색은 하되 결과는 마스킹, 노트당 1개만 추가
      if (note.is_locked) {
        if (lockedNotesAdded.has(noteId)) continue
        const text = [block.title || '', extractText(block.type as BlockType, block.content)].join(' ')
        if (text.toLowerCase().includes(lower)) {
          lockedNotesAdded.add(noteId)
          items.push({
            noteId, noteIcon: note.icon, noteTitle: note.title,
            isLocked: true, passwordHash: note.password_hash,
            matchType: 'block', blockType: block.type as BlockType,
            preview: '',
          })
        }
        continue
      }

      const text = [block.title || '', extractText(block.type as BlockType, block.content)].join(' ')
      if (text.toLowerCase().includes(lower)) {
        items.push({
          noteId, noteIcon: note.icon, noteTitle: note.title,
          isLocked: note.is_locked, passwordHash: note.password_hash,
          matchType: 'block', blockType: block.type as BlockType,
          preview: truncateAround(text, q),
        })
      }
    }

    const countByNote = new Map<string, number>()
    const deduped = items.filter(item => {
      const cnt = countByNote.get(item.noteId) || 0
      if (cnt >= 4) return false
      countByNote.set(item.noteId, cnt + 1)
      return true
    })

    setResults(deduped.slice(0, 30))
    setSelectedIdx(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, doSearch])

  const handleNavigate = (item: SearchResultItem) => {
    if (item.isLocked) {
      setLockedNote(item)
      setPwInput('')
      setPwError('')
    } else {
      router.push(`/notes/${item.noteId}`)
      onClose()
    }
  }

  const handlePasswordSubmit = async () => {
    if (!lockedNote?.passwordHash || !pwInput.trim()) return
    setPwChecking(true)
    const ok = await bcrypt.compare(pwInput, lockedNote.passwordHash)
    setPwChecking(false)
    if (ok) {
      setUnlocked(lockedNote.noteId)
      router.push(`/notes/${lockedNote.noteId}`)
      onClose()
    } else {
      setPwError('비밀번호가 틀렸습니다.')
      setPwInput('')
      pwRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ background: 'rgba(2,12,30,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* 잠금 노트 비밀번호 입력 */}
      {lockedNote && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--dm-surface-modal)', border: '1px solid var(--dm-border)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl flex-shrink-0">
                {lockedNote.noteIcon}
              </div>
              <div>
                <p className="text-sm font-bold text-sky-900">{lockedNote.noteTitle}</p>
                <p className="text-xs text-sky-600 flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  잠금 노트, 비밀번호를 입력하세요
                </p>
              </div>
            </div>
            <input
              ref={pwRef}
              type="password"
              value={pwInput}
              onChange={(e) => { setPwInput(e.target.value); setPwError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit() }}
              placeholder="숫자 비밀번호..."
              inputMode="numeric"
              maxLength={6}
              className={`w-full rounded-xl px-4 py-2.5 text-sky-900 text-sm outline-none border transition-all ${
                pwError ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-400'
              }`}
            />
            {pwError && <p className="text-xs text-red-500 mt-1.5">{pwError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setLockedNote(null); setPwInput(''); setPwError('') }}
                className="flex-1 py-2 rounded-xl border border-sky-200 text-sky-700 text-sm hover:bg-sky-50 transition-all"
              >취소</button>
              <button
                onClick={handlePasswordSubmit}
                disabled={pwChecking || !pwInput.trim()}
                className="flex-1 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 disabled:opacity-50 transition-all"
              >{pwChecking ? '확인 중...' : '열기'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 검색창 */}
      {!lockedNote && (
        <div className="w-full max-w-2xl mt-20 mx-4">
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--dm-surface-modal)', border: '1px solid var(--dm-border)' }}
          >
            {/* 검색 입력 */}
            <div className="flex items-center gap-3 px-5 py-4">
              {loading ? (
                <svg className="w-5 h-5 text-sky-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="노트 제목, 태그, 블록 내용 검색..."
                className="flex-1 bg-transparent text-sky-900 placeholder-sky-300 text-[15px] outline-none font-medium"
              />
              {query && (
                <button onClick={() => setQuery('')} className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 hover:bg-sky-200 flex items-center justify-center transition-colors">
                  <svg className="w-3 h-3 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <div className="flex-shrink-0 flex items-center gap-1 ml-1">
                <kbd className="text-[10px] text-sky-400 bg-sky-100/80 border border-sky-200/60 rounded px-1.5 py-0.5 font-mono">Esc</kbd>
              </div>
            </div>

            {/* 구분선 */}
            {(results.length > 0 || query) && (
              <div className="h-px bg-gradient-to-r from-transparent via-sky-200/60 to-transparent mx-4" />
            )}

            {/* 결과 목록 */}
            <div className="max-h-[55vh] overflow-y-auto">
              {!query && (
                <div className="py-10 flex flex-col items-center gap-2 text-sky-300">
                  <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-sm text-sky-400">노트 제목, 태그, 블록 내용을 모두 검색합니다</p>
                </div>
              )}
              {query && !loading && results.length === 0 && (
                <div className="py-10 flex flex-col items-center gap-2">
                  <p className="text-3xl">🔍</p>
                  <p className="text-sm text-sky-400">검색 결과가 없습니다</p>
                  <p className="text-xs text-sky-300">"{query}"와 일치하는 내용이 없습니다</p>
                </div>
              )}
              {results.map((item, idx) => {
                const isSelected = selectedIdx === idx
                return (
                  <button
                    key={`${item.noteId}-${item.matchType}-${idx}`}
                    onClick={() => handleNavigate(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-5 py-3.5 flex items-center gap-3.5 transition-all border-b border-sky-50 last:border-0 group ${
                      isSelected ? 'bg-sky-500/8' : 'hover:bg-sky-50/50'
                    }`}
                    style={isSelected ? { background: 'rgba(14,165,233,0.07)' } : undefined}
                  >
                    {/* 노트 아이콘 */}
                    <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                      style={{ background: isSelected ? 'rgba(14,165,233,0.12)' : 'var(--dm-surface-subtle)', border: '1px solid var(--dm-border)' }}>
                      {item.noteIcon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[13px] font-bold text-sky-900 truncate">
                          {highlight(item.noteTitle, query)}
                        </span>
                        {item.isLocked && (
                          <svg className="w-3 h-3 text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        {item.matchType === 'block' && item.blockType && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] text-sky-500 bg-sky-100/80 px-1.5 py-0.5 rounded-md border border-sky-200/50 font-medium">
                            {BLOCK_META[item.blockType]?.icon} {BLOCK_META[item.blockType]?.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sky-500 leading-relaxed truncate">
                        {item.isLocked
                          ? <span className="text-sky-400 italic">🔒 클릭하여 잠금 해제 후 열기</span>
                          : highlight(item.preview, query)
                        }
                      </p>
                    </div>

                    <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-all ${isSelected ? 'text-sky-400 translate-x-0.5' : 'text-sky-200 group-hover:text-sky-300'}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )
              })}
            </div>

            {/* 하단 힌트 */}
            {results.length > 0 && (
              <div className="px-5 py-2.5 border-t border-sky-100/60 flex items-center gap-4 text-[11px] text-sky-300"
                style={{ background: 'var(--dm-surface-item)' }}>
                <span className="flex items-center gap-1"><kbd className="bg-sky-100/80 border border-sky-200/40 rounded px-1 py-0.5 font-mono text-sky-400">↑↓</kbd> 이동</span>
                <span className="flex items-center gap-1"><kbd className="bg-sky-100/80 border border-sky-200/40 rounded px-1 py-0.5 font-mono text-sky-400">↵</kbd> 열기</span>
                <span className="ml-auto text-sky-400 font-medium">{results.length}개 결과</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
