'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Note } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import { isUnlocked, setUnlocked } from '@/lib/lockSession'

export type LinkedNote = {
  noteId: string
  noteIcon: string
  noteTitle: string
  memo: string
  isLocked?: boolean
  passwordHash?: string | null
}
export type LinkContent = { links: LinkedNote[] }

interface Props {
  content: LinkContent
  isEditing: boolean
  onChange: (content: LinkContent) => void
  currentNoteId?: string
}

const emptyLink = (): LinkedNote => ({ noteId: '', noteIcon: '', noteTitle: '', memo: '', isLocked: false, passwordHash: null })

export default function LinkBlock({ content, isEditing, onChange, currentNoteId }: Props) {
  const router = useRouter()
  const [links, setLinks] = useState<LinkedNote[]>(content.links?.length ? content.links : [emptyLink()])
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoaded, setNotesLoaded] = useState(false)

  // 패스워드 모달 상태
  const [lockedTarget, setLockedTarget] = useState<LinkedNote | null>(null)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwChecking, setPwChecking] = useState(false)
  const pwRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLinks(content.links?.length ? content.links : [emptyLink()])
  }, [content])

  useEffect(() => {
    if (lockedTarget) setTimeout(() => pwRef.current?.focus(), 50)
  }, [lockedTarget])

  // 편집 모드일 때만 노트 목록 fetch (is_locked, password_hash 포함)
  useEffect(() => {
    if (!isEditing || notesLoaded) return
    supabase
      .from('notes')
      .select('id, icon, title, is_locked, password_hash')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        const all = (data ?? []) as Note[]
        setNotes(currentNoteId ? all.filter(n => n.id !== currentNoteId) : all)
        setNotesLoaded(true)
      })
  }, [isEditing, notesLoaded])

  const commit = (newLinks: LinkedNote[]) => {
    setLinks(newLinks)
    onChange({ links: newLinks })
  }

  const updateLink = (idx: number, field: keyof LinkedNote, val: string) =>
    commit(links.map((l, i) => i === idx ? { ...l, [field]: val } : l))

  const selectNote = (idx: number, note: Note) =>
    commit(links.map((l, i) => i === idx ? {
      ...l,
      noteId: note.id,
      noteIcon: note.icon,
      noteTitle: note.title,
      isLocked: note.is_locked,
      passwordHash: note.password_hash,
    } : l))

  const addLink = () => commit([...links, emptyLink()])
  const removeLink = (idx: number) => commit(links.filter((_, i) => i !== idx))

  const handleLinkClick = (link: LinkedNote) => {
    if (link.isLocked) {
      setLockedTarget(link)
      setPwInput('')
      setPwError('')
    } else {
      router.push(`/notes/${link.noteId}`)
    }
  }

  const handlePasswordSubmit = async () => {
    if (!lockedTarget?.passwordHash || !pwInput.trim()) return
    setPwChecking(true)
    const ok = await bcrypt.compare(pwInput, lockedTarget.passwordHash)
    setPwChecking(false)
    if (ok) {
      setUnlocked(lockedTarget.noteId)
      router.push(`/notes/${lockedTarget.noteId}`)
      setLockedTarget(null)
    } else {
      setPwError('비밀번호가 틀렸습니다.')
      setPwInput('')
      pwRef.current?.focus()
    }
  }

  /* ── VIEW MODE ── */
  if (!isEditing) {
    const hasContent = links.some(l => l.noteId)

    const pwModal = lockedTarget && typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
        style={{ background: 'rgba(2,12,30,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setLockedTarget(null) }}
      >
        <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--dm-surface-modal)', border: '1px solid var(--dm-border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl flex-shrink-0">
              {lockedTarget.noteIcon}
            </div>
            <div>
              <p className="text-sm font-bold text-sky-900">{lockedTarget.noteTitle}</p>
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
            onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); if (e.key === 'Escape') setLockedTarget(null) }}
            placeholder="숫자 비밀번호..."
            inputMode="numeric"
            maxLength={6}
            className={`w-full rounded-xl px-4 py-2.5 text-sky-900 text-sm outline-none border transition-all ${
              pwError ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-400'
            }`}
          />
          {pwError && <p className="text-xs text-red-500 mt-1.5">{pwError}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setLockedTarget(null)} className="flex-1 py-2 rounded-xl border border-sky-200 text-sky-700 text-sm hover:bg-sky-50 transition-all">취소</button>
            <button
              onClick={handlePasswordSubmit}
              disabled={pwChecking || !pwInput.trim()}
              className="flex-1 py-2 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 disabled:opacity-50 transition-all"
            >{pwChecking ? '확인 중...' : '열기'}</button>
          </div>
        </div>
      </div>,
      document.body
    )

    if (!hasContent) {
      return <p className="text-sky-700 text-sm italic py-4 text-center">연결된 노트가 없습니다. 편집 모드에서 추가해주세요.</p>
    }
    return (
      <div className="space-y-2">
        {pwModal}

        {links.filter(l => l.noteId).map((link, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleLinkClick(link)}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-md group text-left"
            style={{ background: 'var(--dm-surface-card)', border: '1px solid var(--dm-border)' }}
          >
            <span className="text-2xl flex-shrink-0">{link.noteIcon || '📝'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-sky-900 group-hover:text-sky-700 transition-colors truncate">
                  {link.noteTitle}
                </p>
                {link.isLocked && (
                  <svg className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {link.memo && (
                <p className="text-xs text-sky-600 mt-0.5 leading-relaxed">{link.memo}</p>
              )}
            </div>
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    )
  }

  /* ── EDIT MODE ── */
  return (
    <div className="space-y-3">
      {links.map((link, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-sky-200/70 p-3 space-y-2"
          style={{ background: 'var(--dm-surface-card)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800">링크 {idx + 1}</span>
            {links.length > 1 && (
              <button type="button" onClick={() => removeLink(idx)} className="text-sky-400 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 노트 선택 */}
          <div>
            <p className="text-xs text-sky-700 font-semibold mb-1">연결할 노트</p>
            {!notesLoaded ? (
              <div className="text-xs text-sky-500 py-2">노트 목록 불러오는 중...</div>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-sky-200/60 divide-y divide-sky-100" style={{ background: 'var(--dm-surface-card)' }}>
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => selectNote(idx, note)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      link.noteId === note.id ? 'bg-sky-100 text-sky-900 font-semibold' : 'hover:bg-sky-50 text-sky-800'
                    }`}
                  >
                    <span className="flex-shrink-0">{note.icon}</span>
                    <span className="truncate flex-1">{note.title}</span>
                    {note.is_locked && (
                      <svg className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {link.noteId === note.id && (
                      <svg className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 메모 */}
          <input
            value={link.memo}
            onChange={e => updateLink(idx, 'memo', e.target.value)}
            placeholder="메모 (선택사항)"
            className="w-full bg-white/80 border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
          />
        </div>
      ))}

      <button type="button" onClick={addLink} className="flex items-center gap-2 text-sm text-sky-500 hover:text-sky-700 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        링크 추가
      </button>
    </div>
  )
}
