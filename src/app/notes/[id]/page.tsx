'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, Note, Tab, Block, BlockType } from '@/lib/supabase'
import TextBlock from '@/components/blocks/TextBlock'
import CodeBlock from '@/components/blocks/CodeBlock'
import TipBlock from '@/components/blocks/TipBlock'
import StepsBlock from '@/components/blocks/StepsBlock'
import TableBlock from '@/components/blocks/TableBlock'
import ChecklistBlock from '@/components/blocks/ChecklistBlock'
import FileBlock from '@/components/blocks/FileBlock'
import KeywordBlock from '@/components/blocks/KeywordBlock'
import FlowBlock from '@/components/blocks/FlowBlock'
import FeatureListBlock from '@/components/blocks/FeatureListBlock'
import KeyValueBlock from '@/components/blocks/KeyValueBlock'
import ListBlock from '@/components/blocks/ListBlock'

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: 'text', label: '텍스트', icon: '📝', description: 'Markdown 형식 텍스트' },
  { type: 'code', label: '코드', icon: '💻', description: '구문 강조 코드 블록' },
  { type: 'tip', label: '팁', icon: '💡', description: '아이콘과 항목 목록' },
  { type: 'steps', label: '단계', icon: '🪜', description: '번호가 있는 단계별 가이드' },
  { type: 'table', label: '테이블', icon: '📊', description: '동적 행/열 테이블' },
  { type: 'checklist', label: '체크리스트', icon: '✅', description: '진행률 표시 체크리스트' },
  { type: 'file', label: '파일', icon: '📎', description: '파일 첨부 및 미리보기' },
  { type: 'keyword', label: '키워드', icon: '🔑', description: '번호 + 키워드 + 예시 목록' },
  { type: 'flow', label: '흐름도', icon: '➡️', description: '가로 단계 흐름 다이어그램' },
  { type: 'featurelist', label: '기능 목록', icon: '⭐', description: '아이콘 + 번호 + 제목 + 설명' },
  { type: 'keyvalue', label: 'Key-Value', icon: '🗝️', description: 'Key → Value 쌍 목록' },
  { type: 'list', label: '리스트', icon: '📋', description: '점/번호/화살표/체크 스타일 목록' },
]

const BLOCK_TYPES_PER_PAGE = 7

const BLOCK_PREVIEW_SAMPLES: Record<BlockType, Record<string, unknown>> = {
  text: { markdown: '## 마크다운 텍스트\n\n**굵게**, *기울임*, `인라인 코드`\n\n- 항목 1\n- 항목 2\n\n> 인용문 예시' },
  code: { language: 'javascript', code: 'function greet(name) {\n  return `Hello, ${name}!`\n}\n\nconsole.log(greet("World"))' },
  tip: { icon: '💡', items: ['첫 번째 팁 내용입니다', '두 번째 팁 내용입니다', '세 번째 팁 내용입니다'] },
  steps: { steps: [{ title: '패키지 설치', description: '의존성 설치', code: 'npm install', language: 'bash' }, { title: '서버 실행', description: '개발 서버 시작', code: 'npm run dev', language: 'bash' }] },
  table: { columns: ['이름', '역할', '상태'], rows: [['홍길동', '개발자', '✅ 완료'], ['김철수', '디자이너', '🔄 진행중'], ['이영희', 'PM', '📋 대기']] },
  checklist: { items: [{ text: '기획 완료', checked: true }, { text: '디자인 완료', checked: true }, { text: '개발 진행 중', checked: false }, { text: '테스트', checked: false }] },
  file: { files: [{ name: 'README.md', size: 2048, type: 'text/markdown', dataUrl: '', showPreview: false }, { name: 'diagram.png', size: 512000, type: 'image/png', dataUrl: '', showPreview: false }] },
  keyword: { items: [{ icon: '🔑', title: '키워드', subtitle: '특정 단어 감지', example: '"백엔드", "서버", "API" → 백엔드 스킬 활성화' }, { icon: '🎯', title: '의도 파악', subtitle: '요청 패턴 분석', example: '"만들어줘", "추가해줘" → 해당 영역 스킬 활성화' }] },
  flow: { title: '전체 처리 흐름', steps: [{ title: '요청 입력', subtitle: '명령 전달', active: false }, { title: 'AI 분석', subtitle: '컨텍스트 로딩', active: true }, { title: '작업 수행', subtitle: '코드 생성', active: false }, { title: '결과 출력', subtitle: '완료', active: false }] },
  featurelist: { items: [{ icon: '⚡', label: '1번째', title: '빠른 처리', description: '실시간 데이터 처리 지원' }, { icon: '🔒', label: '2번째', title: '보안 강화', description: '암호화 및 인증 시스템' }, { icon: '🔄', label: '3번째', title: '자동 동기화', description: '변경 사항 자동 반영' }] },
  keyvalue: { items: [{ key: 'URL', value: 'https://tejhpzltljxwvtlmrsxi.supabase.co' }, { key: 'Framework', value: 'Next.js 14 App Router' }, { key: 'Database', value: 'Supabase (PostgreSQL)' }, { key: 'Styling', value: 'Tailwind CSS' }] },
  list: { style: 'bullet', items: [{ text: '첫 번째 항목' }, { text: '두 번째 항목' }, { text: '세 번째 항목' }] },
}

const DEFAULT_CONTENT: Record<BlockType, Record<string, unknown>> = {
  text: { markdown: '' },
  code: { language: 'javascript', code: '' },
  tip: { icon: '💡', items: [''] },
  steps: { steps: [{ title: '', description: '', code: '', language: 'bash' }] },
  table: { columns: ['열 1', '열 2', '열 3'], rows: [['', '', ''], ['', '', '']] },
  checklist: { items: [{ text: '', checked: false }] },
  file: { files: [] },
  keyword: { items: [{ icon: '🔑', title: '키워드', subtitle: '설명을 입력하세요', example: '예시를 입력하세요' }] },
  flow: { title: '전체 흐름', steps: [{ title: '시작', subtitle: '첫 번째 단계', active: false }, { title: '진행', subtitle: '두 번째 단계', active: true }, { title: '완료', subtitle: '마지막 단계', active: false }] },
  featurelist: { items: [{ icon: '⭐', label: '1번째', title: '기능 제목', description: '기능에 대한 설명' }] },
  keyvalue: { items: [{ key: 'Key', value: 'Value' }] },
  list: { style: 'bullet', items: [{ text: '' }] },
}

export default function NoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string

  const [note, setNote] = useState<Note | null>(null)
  const [tabs, setTabs] = useState<Tab[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingBlocks, setEditingBlocks] = useState<Record<string, boolean>>({})
  const [showBlockTypeModal, setShowBlockTypeModal] = useState(false)
  const [blockTypePage, setBlockTypePage] = useState(0)
  const [hoveredBlockType, setHoveredBlockType] = useState<BlockType | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [tabNameInput, setTabNameInput] = useState('')
  const tabInputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const pendingChanges = useRef<Record<string, Record<string, unknown>>>({})
  const pendingTitles = useRef<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: noteData } = await supabase.from('notes').select('*').eq('id', noteId).single()
    if (!noteData) {
      router.push('/')
      return
    }
    setNote(noteData)

    const { data: tabsData } = await supabase
      .from('tabs')
      .select('*')
      .eq('note_id', noteId)
      .order('order_index')

    if (tabsData && tabsData.length > 0) {
      setTabs(tabsData)
      setActiveTabId(tabsData[0].id)

      const { data: blocksData } = await supabase
        .from('blocks')
        .select('*')
        .in('tab_id', tabsData.map((t: Tab) => t.id))
        .order('order_index')

      if (blocksData) {
        setBlocks(blocksData)
      }
    } else {
      setTabs([])
    }

    setLoading(false)
  }, [noteId, router])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/'); return }
      fetchData()
    })
  }, [fetchData, router])

  useEffect(() => {
    if (editingTabId && tabInputRef.current) {
      tabInputRef.current.focus()
      tabInputRef.current.select()
    }
  }, [editingTabId])

  const activeTabBlocks = blocks
    .filter((b) => b.tab_id === activeTabId)
    .sort((a, b) => a.order_index - b.order_index)

  // Tab operations
  const addTab = async () => {
    const newOrder = tabs.length
    const { data, error } = await supabase
      .from('tabs')
      .insert({ note_id: noteId, name: `탭 ${tabs.length + 1}`, order_index: newOrder })
      .select()
      .single()

    if (!error && data) {
      setTabs([...tabs, data])
      setActiveTabId(data.id)
    }
  }

  const deleteTab = async (tabId: string) => {
    if (tabs.length <= 1) return
    await supabase.from('tabs').delete().eq('id', tabId)
    setBlocks(blocks.filter((b) => b.tab_id !== tabId))
    const newTabs = tabs.filter((t) => t.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id || null)
    }
  }

  const renameTab = async (tabId: string, newName: string) => {
    if (!newName.trim()) return
    await supabase.from('tabs').update({ name: newName.trim() }).eq('id', tabId)
    setTabs(tabs.map((t) => t.id === tabId ? { ...t, name: newName.trim() } : t))
    setEditingTabId(null)
  }

  // Block operations
  const addBlock = async (type: BlockType) => {
    if (!activeTabId) return
    setShowBlockTypeModal(false)

    const orderIndex = activeTabBlocks.length

    const { data, error } = await supabase
      .from('blocks')
      .insert({
        tab_id: activeTabId,
        type,
        title: null,
        show_title: false,
        content: DEFAULT_CONTENT[type],
        order_index: orderIndex,
      })
      .select()
      .single()

    if (!error && data) {
      setBlocks([...blocks, data])
      setEditingBlocks({ ...editingBlocks, [data.id]: true })
    }
  }

  const updateBlockContent = (blockId: string, content: Record<string, unknown>) => {
    pendingChanges.current[blockId] = content
  }

  const updateBlockTitle = (blockId: string, title: string) => {
    pendingTitles.current[blockId] = title
    // Still update local display for the title input field
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, title } : b))
  }

  const toggleBlockTitle = async (blockId: string, showTitle: boolean) => {
    await supabase.from('blocks').update({ show_title: showTitle }).eq('id', blockId)
    setBlocks(blocks.map((b) => b.id === blockId ? { ...b, show_title: showTitle } : b))
  }

  const deleteBlock = async (blockId: string) => {
    await supabase.from('blocks').delete().eq('id', blockId)
    const updatedBlocks = blocks.filter((b) => b.id !== blockId)
    const tabBlocks = updatedBlocks
      .filter((b) => b.tab_id === activeTabId)
      .sort((a, b) => a.order_index - b.order_index)
    const reordered = tabBlocks.map((b, i) => ({ ...b, order_index: i }))
    await Promise.all(
      reordered.map((b) => supabase.from('blocks').update({ order_index: b.order_index }).eq('id', b.id))
    )
    setBlocks([
      ...updatedBlocks.filter((b) => b.tab_id !== activeTabId),
      ...reordered,
    ])
    setDeleteConfirm(null)
    // Clean up any pending changes for this block
    delete pendingChanges.current[blockId]
    delete pendingTitles.current[blockId]
  }

  const moveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const tabBlocks = activeTabBlocks
    const idx = tabBlocks.findIndex((b) => b.id === blockId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === tabBlocks.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const newBlocks = [...tabBlocks]
    const temp = newBlocks[idx]
    newBlocks[idx] = { ...newBlocks[swapIdx], order_index: idx }
    newBlocks[swapIdx] = { ...temp, order_index: swapIdx }

    await supabase.from('blocks').update({ order_index: idx }).eq('id', newBlocks[idx].id)
    await supabase.from('blocks').update({ order_index: swapIdx }).eq('id', newBlocks[swapIdx].id)

    setBlocks([
      ...blocks.filter((b) => b.tab_id !== activeTabId),
      ...newBlocks,
    ])
  }

  const toggleEditing = (blockId: string) => {
    setEditingBlocks((prev) => ({ ...prev, [blockId]: !prev[blockId] }))
  }

  const handleComplete = async () => {
    setSaving(true)
    // Capture before clearing — updater runs async, ref would be empty by then
    const changes = { ...pendingChanges.current }
    const titles = { ...pendingTitles.current }

    await Promise.all([
      ...Object.entries(changes).map(([blockId, content]) =>
        supabase.from('blocks').update({ content }).eq('id', blockId)
      ),
      ...Object.entries(titles).map(([blockId, title]) =>
        supabase.from('blocks').update({ title }).eq('id', blockId)
      ),
    ])

    setBlocks(prev => prev.map(b => ({
      ...b,
      ...(changes[b.id] !== undefined ? { content: changes[b.id] } : {}),
      ...(titles[b.id] !== undefined ? { title: titles[b.id] } : {}),
    })))

    pendingChanges.current = {}
    pendingTitles.current = {}
    setSaving(false)
    setIsEditMode(false)
  }

  const handleStartEdit = () => {
    pendingChanges.current = {}
    pendingTitles.current = {}
    setIsEditMode(true)
  }

  const blockTypeInfo = (type: BlockType) => BLOCK_TYPES.find((bt) => bt.type === type)

  const renderViewBlock = (block: Block) => {
    return (
      <div key={block.id} className="glass-card rounded-xl overflow-hidden shadow-sm">
        {block.show_title && block.title && block.type !== 'keyvalue' && (
          <div className="px-5 pt-4 pb-1">
            <h3 className="text-sky-950 font-semibold text-base flex items-center gap-2">
              <span className="text-base">{blockTypeInfo(block.type)?.icon}</span>
              {block.title}
            </h3>
            <div className="mt-2 h-px bg-sky-300/60" />
          </div>
        )}
        <div className="p-5">
          {block.type === 'text' && (
            <TextBlock
              content={block.content as Parameters<typeof TextBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'code' && (
            <CodeBlock
              content={block.content as Parameters<typeof CodeBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'tip' && (
            <TipBlock
              content={block.content as Parameters<typeof TipBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'steps' && (
            <StepsBlock
              content={block.content as Parameters<typeof StepsBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'table' && (
            <TableBlock
              content={block.content as Parameters<typeof TableBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'checklist' && (
            <ChecklistBlock
              content={block.content as Parameters<typeof ChecklistBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'file' && (
            <FileBlock
              content={block.content as Parameters<typeof FileBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'keyword' && (
            <KeywordBlock
              content={block.content as Parameters<typeof KeywordBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'flow' && (
            <FlowBlock
              content={block.content as Parameters<typeof FlowBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'featurelist' && (
            <FeatureListBlock
              content={block.content as Parameters<typeof FeatureListBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'keyvalue' && (
            <KeyValueBlock
              content={block.content as Parameters<typeof KeyValueBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'list' && (
            <ListBlock
              content={block.content as Parameters<typeof ListBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
        </div>
      </div>
    )
  }

  const renderEditBlock = (block: Block) => {
    const isEditing = editingBlocks[block.id] || false
    const idx = activeTabBlocks.findIndex((b) => b.id === block.id)
    const info = blockTypeInfo(block.type)

    return (
      <div key={block.id} className="block-container glass-card rounded-xl overflow-hidden">
        {/* Block toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-sky-300/70 bg-sky-100/60">
          <div className="flex items-center gap-2">
            <span className="text-base">{info?.icon}</span>
            <span className="text-xs text-sky-600 font-medium">{info?.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* Toggle title */}
            <button
              onClick={() => toggleBlockTitle(block.id, !block.show_title)}
              title={block.show_title ? '제목 숨기기' : '제목 표시'}
              className={`p-1.5 rounded-lg transition-all text-xs ${
                block.show_title
                  ? 'text-sky-500 bg-sky-500/10'
                  : 'text-sky-400 hover:text-sky-700 hover:bg-sky-100'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>

            {/* Edit/Preview toggle */}
            <button
              onClick={() => toggleEditing(block.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isEditing
                  ? 'bg-sky-500/20 text-sky-600'
                  : 'text-sky-500 hover:text-sky-700 hover:bg-sky-100'
              }`}
            >
              {isEditing ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  미리보기
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  편집
                </>
              )}
            </button>

            {/* Move up */}
            <button
              onClick={() => moveBlock(block.id, 'up')}
              disabled={idx === 0}
              title="위로 이동"
              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-700 hover:bg-sky-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>

            {/* Move down */}
            <button
              onClick={() => moveBlock(block.id, 'down')}
              disabled={idx === activeTabBlocks.length - 1}
              title="아래로 이동"
              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-700 hover:bg-sky-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Delete */}
            {deleteConfirm === block.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteBlock(block.id)}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-500 border border-red-400/40 rounded-lg hover:bg-red-500/30 transition-all"
                >
                  삭제
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-2 py-1 text-xs text-sky-500 hover:text-sky-700 transition-all"
                >
                  취소
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(block.id)}
                title="블록 삭제"
                className="p-1.5 rounded-lg text-sky-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Block content */}
        <div className="p-4">
          {block.show_title && block.type !== 'keyvalue' && (
            <input
              type="text"
              value={block.title || ''}
              onChange={(e) => updateBlockTitle(block.id, e.target.value)}
              placeholder="블록 제목..."
              className="w-full bg-transparent border-b border-sky-200 pb-2 mb-4 text-sky-950 font-semibold text-base outline-none placeholder-sky-300 focus:border-sky-500 transition-colors"
            />
          )}

          {block.type === 'text' && (
            <TextBlock
              content={block.content as Parameters<typeof TextBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'code' && (
            <CodeBlock
              content={block.content as Parameters<typeof CodeBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'tip' && (
            <TipBlock
              content={block.content as Parameters<typeof TipBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'steps' && (
            <StepsBlock
              content={block.content as Parameters<typeof StepsBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'table' && (
            <TableBlock
              content={block.content as Parameters<typeof TableBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'checklist' && (
            <ChecklistBlock
              content={block.content as Parameters<typeof ChecklistBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'file' && (
            <FileBlock
              content={block.content as Parameters<typeof FileBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'keyword' && (
            <KeywordBlock
              content={block.content as Parameters<typeof KeywordBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'flow' && (
            <FlowBlock
              content={block.content as Parameters<typeof FlowBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'featurelist' && (
            <FeatureListBlock
              content={block.content as Parameters<typeof FeatureListBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'keyvalue' && (
            <KeyValueBlock
              content={block.content as Parameters<typeof KeyValueBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'list' && (
            <ListBlock
              content={block.content as Parameters<typeof ListBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="w-8 h-8 animate-spin text-sky-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sky-700 text-sm">노트 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!note) return null

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/50 hover:bg-white/80 border border-white/60 text-sky-800 hover:text-sky-950 font-medium transition-all group flex-shrink-0"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm hidden sm:inline">돌아가기</span>
          </Link>

          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="text-2xl flex-shrink-0">{note.icon}</span>
            <div className="min-w-0">
              <h1 className="text-sky-950 font-semibold text-base leading-tight truncate">
                {note.title}
              </h1>
              {note.tags && note.tags.length > 0 && (
                <div className="flex gap-1.5 mt-0.5 overflow-hidden">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-xs text-sky-500 flex-shrink-0">#{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {note.is_locked && (
              <div className="flex items-center gap-1 text-xs text-sky-700 bg-sky-100/70 px-2 py-1 rounded-full border border-sky-200/60">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                잠김
              </div>
            )}

            {isEditMode ? (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-500 text-white hover:bg-sky-400 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    저장 중...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    완료
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-sky-700 hover:text-sky-900 bg-white/50 hover:bg-white/70 border border-sky-200/60 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                편집
              </button>
            )}
          </div>
        </div>

        {isEditMode && (
          <div className="border-t border-sky-200/40 bg-sky-500/5 px-4 sm:px-6 py-1.5">
            <p className="max-w-5xl mx-auto text-xs text-sky-600 flex items-center gap-1.5">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              편집 중 — 완료 버튼을 클릭하면 저장 후 보기 모드로 돌아갑니다
            </p>
          </div>
        )}
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs bar */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)' }}>
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`group relative flex items-center gap-1 flex-shrink-0 rounded-lg transition-all ${
                  activeTabId === tab.id
                    ? 'bg-sky-500/20 text-sky-600 shadow-sm'
                    : 'text-sky-800 hover:text-sky-600 hover:bg-white/50'
                }`}
              >
                {isEditMode && editingTabId === tab.id ? (
                  <input
                    ref={tabInputRef}
                    value={tabNameInput}
                    onChange={(e) => setTabNameInput(e.target.value)}
                    onBlur={() => renameTab(tab.id, tabNameInput || tab.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameTab(tab.id, tabNameInput || tab.name)
                      if (e.key === 'Escape') setEditingTabId(null)
                    }}
                    className="bg-transparent outline-none text-sm px-3 py-2 w-24 text-sky-900"
                  />
                ) : (
                  <button
                    onClick={() => setActiveTabId(tab.id)}
                    onDoubleClick={() => {
                      if (isEditMode) {
                        setEditingTabId(tab.id)
                        setTabNameInput(tab.name)
                      }
                    }}
                    className="text-sm px-4 py-2 font-medium"
                  >
                    {tab.name}
                  </button>
                )}

                {isEditMode && tabs.length > 1 && editingTabId !== tab.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteTab(tab.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 mr-1.5 text-sky-400 hover:text-red-400 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {isEditMode && (
              <button
                onClick={addTab}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sky-500 hover:text-sky-700 hover:bg-white/50 transition-all flex-shrink-0 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Blocks */}
        <div className="space-y-4">
          {activeTabBlocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-3xl mb-4">
                📄
              </div>
              <h3 className="text-sky-950 font-semibold mb-2">빈 탭입니다</h3>
              <p className="text-sky-600 text-sm mb-6 max-w-xs">
                {isEditMode
                  ? '블록을 추가해서 노트를 작성해보세요.'
                  : '편집 버튼을 눌러 블록을 추가해보세요.'}
              </p>
              {isEditMode && (
                <button
                  onClick={() => { setBlockTypePage(0); setShowBlockTypeModal(true) }}
                  className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  블록 추가
                </button>
              )}
            </div>
          ) : (
            <>
              {isEditMode
                ? activeTabBlocks.map(renderEditBlock)
                : activeTabBlocks.map(renderViewBlock)
              }

              {isEditMode && (
                <div className="pt-2">
                  <button
                    onClick={() => { setBlockTypePage(0); setShowBlockTypeModal(true) }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-sky-400/70 text-sky-700 font-semibold hover:border-sky-500 hover:bg-white/40 hover:text-sky-900 transition-all text-sm"
                    style={{ background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    블록 추가
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Block Type Modal */}
      {showBlockTypeModal && (() => {
        const totalPages = Math.ceil(BLOCK_TYPES.length / BLOCK_TYPES_PER_PAGE)
        const pageItems = BLOCK_TYPES.slice(blockTypePage * BLOCK_TYPES_PER_PAGE, (blockTypePage + 1) * BLOCK_TYPES_PER_PAGE)
        const previewType = hoveredBlockType
        const previewSample = previewType ? BLOCK_PREVIEW_SAMPLES[previewType] : null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/40 p-4"
            onClick={() => setShowBlockTypeModal(false)}
          >
            <div
              className="rounded-2xl w-full shadow-2xl animate-slide-up flex overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.9)',
                maxWidth: hoveredBlockType ? '800px' : '440px',
                transition: 'max-width 0.2s ease',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left: block type list */}
              <div className="w-[440px] flex-shrink-0 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sky-950 font-semibold text-lg">블록 유형 선택</h3>
                    {totalPages > 1 && (
                      <span className="text-xs text-sky-400 bg-sky-100 px-2 py-0.5 rounded-full">
                        {blockTypePage + 1} / {totalPages}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowBlockTypeModal(false)}
                    className="text-sky-400 hover:text-sky-700 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 grid grid-cols-1 gap-1.5">
                  {pageItems.map((bt) => (
                    <button
                      key={bt.type}
                      onClick={() => addBlock(bt.type)}
                      onMouseEnter={() => setHoveredBlockType(bt.type)}
                      onMouseLeave={() => setHoveredBlockType(null)}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-all text-left group ${
                        hoveredBlockType === bt.type ? 'bg-sky-50 shadow-sm' : 'hover:bg-sky-50/60'
                      }`}
                    >
                      <span className={`text-2xl w-10 h-10 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                        hoveredBlockType === bt.type ? 'bg-sky-200/80' : 'bg-sky-100/80 group-hover:bg-sky-200/80'
                      }`}>
                        {bt.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sky-950 font-medium text-sm">{bt.label}</p>
                        <p className="text-sky-500 text-xs mt-0.5">{bt.description}</p>
                      </div>
                      <svg className={`w-4 h-4 ml-auto transition-colors flex-shrink-0 ${hoveredBlockType === bt.type ? 'text-sky-600' : 'text-sky-300 group-hover:text-sky-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-sky-300/50">
                    <button
                      onClick={() => setBlockTypePage((p) => Math.max(0, p - 1))}
                      disabled={blockTypePage === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-sky-600 hover:text-sky-800 hover:bg-sky-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      이전
                    </button>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setBlockTypePage(i)}
                          className={`w-2 h-2 rounded-full transition-all ${i === blockTypePage ? 'bg-sky-500' : 'bg-sky-200 hover:bg-sky-300'}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setBlockTypePage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={blockTypePage === totalPages - 1}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-sky-600 hover:text-sky-800 hover:bg-sky-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      다음
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Right: preview panel */}
              {hoveredBlockType && previewSample && (
                <div className="flex-1 border-l border-sky-300/50 bg-sky-50/40 p-6 overflow-y-auto" style={{ maxHeight: '600px', minWidth: 0 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-base">{BLOCK_TYPES.find(b => b.type === hoveredBlockType)?.icon}</span>
                    <span className="text-sky-800 font-semibold text-sm">{BLOCK_TYPES.find(b => b.type === hoveredBlockType)?.label} 미리보기</span>
                    <span className="ml-auto text-[10px] text-sky-400 bg-sky-100 px-2 py-0.5 rounded-full">샘플</span>
                  </div>
                  <div className="bg-white/80 rounded-xl p-4 border border-sky-300/50 shadow-sm text-sm">
                    {hoveredBlockType === 'text' && (
                      <TextBlock content={previewSample as Parameters<typeof TextBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'code' && (
                      <CodeBlock content={previewSample as Parameters<typeof CodeBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'tip' && (
                      <TipBlock content={previewSample as Parameters<typeof TipBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'steps' && (
                      <StepsBlock content={previewSample as Parameters<typeof StepsBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'table' && (
                      <TableBlock content={previewSample as Parameters<typeof TableBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'checklist' && (
                      <ChecklistBlock content={previewSample as Parameters<typeof ChecklistBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'file' && (
                      <FileBlock content={previewSample as Parameters<typeof FileBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'keyword' && (
                      <KeywordBlock content={previewSample as Parameters<typeof KeywordBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'flow' && (
                      <FlowBlock content={previewSample as Parameters<typeof FlowBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'featurelist' && (
                      <FeatureListBlock content={previewSample as Parameters<typeof FeatureListBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'keyvalue' && (
                      <KeyValueBlock content={previewSample as Parameters<typeof KeyValueBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'list' && (
                      <ListBlock content={previewSample as Parameters<typeof ListBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                  </div>
                  <p className="text-center text-xs text-sky-400 mt-3">클릭하면 이 블록이 추가됩니다</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
