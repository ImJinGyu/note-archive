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
import CredentialBlock from '@/components/blocks/CredentialBlock'
import LicenseBlock from '@/components/blocks/LicenseBlock'
import BlockTransferModal from '@/components/BlockTransferModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

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
  { type: 'credential', label: '계정정보', icon: '🔐', description: 'URL / ID / PW 저장 + 복사' },
  { type: 'license', label: '자격/면허', icon: '🪪', description: '자격증 및 면허 정보 관리' },
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
  credential: { items: [{ label: 'Google', url: 'https://google.com', accounts: [{ username: 'user@gmail.com', password: 'password123!' }, { username: 'work@gmail.com', password: 'workpass456!' }], memo: '구글 계정' }] },
  license: { items: [{ name: '정보처리기사', date: '2022-11', expiry: '영구', issuer: '한국산업인력공단' }, { name: '운전면허 1종 보통', date: '2019-03', expiry: '영구', issuer: '경찰청' }] },
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
  credential: { items: [{ label: '', url: '', accounts: [{ username: '', password: '' }], memo: '' }] },
  license: { items: [{ name: '', date: '', expiry: '', issuer: '' }] },
}

export default function NoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string
  const { showToast } = useToast()

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
  const [saving, setSaving] = useState(false)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<string | null>(null)
  const [transferBlock, setTransferBlock] = useState<Block | null>(null)

  const pendingChanges = useRef<Record<string, Record<string, unknown>>>({})
  const pendingTitles = useRef<Record<string, string>>({})

  // 책 형식 페이지 모드 (탭별)
  const [tabPageMode, setTabPageMode] = useState<Record<string, boolean>>({})
  const [tabCurrentPage, setTabCurrentPage] = useState<Record<string, number>>({})
  const [tabAnimDir, setTabAnimDir] = useState<Record<string, 'next' | 'prev'>>({})
  const [animKey, setAnimKey] = useState(0)
  const [availableH, setAvailableH] = useState(600)
  const [innerH, setInnerH] = useState(0)
  const innerBlockRef = useRef<HTMLDivElement>(null)
  const blocksAreaRef = useRef<HTMLDivElement>(null)

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

  // 페이지 모드 localStorage 복원
  useEffect(() => {
    if (!noteId) return
    try {
      const saved = localStorage.getItem(`note-page-mode-${noteId}`)
      if (saved) setTabPageMode(JSON.parse(saved))
    } catch {}
  }, [noteId])

  // 사용 가능한 높이 측정
  useEffect(() => {
    const measure = () => {
      const raf = requestAnimationFrame(() => {
        if (blocksAreaRef.current) {
          const top = blocksAreaRef.current.getBoundingClientRect().top
          setAvailableH(Math.max(window.innerHeight - top - 120, 360))
        }
      })
      return raf
    }
    const raf = measure()
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure) }
  }, [loading])

  // 내부 콘텐츠 높이 측정 (ResizeObserver) — loading 포함으로 블록 로드 후 재측정
  useEffect(() => {
    const attach = () => {
      const el = innerBlockRef.current
      if (!el) return null
      const obs = new ResizeObserver(() => setInnerH(el.scrollHeight))
      obs.observe(el)
      requestAnimationFrame(() => {
        if (innerBlockRef.current) setInnerH(innerBlockRef.current.scrollHeight)
      })
      return obs
    }
    const obs = attach()
    return () => obs?.disconnect()
  }, [activeTabId, tabPageMode, animKey, loading])

  const togglePageMode = (tabId: string) => {
    setTabPageMode(prev => {
      const next = { ...prev, [tabId]: !prev[tabId] }
      try { localStorage.setItem(`note-page-mode-${noteId}`, JSON.stringify(next)) } catch {}
      return next
    })
    setTabCurrentPage(prev => ({ ...prev, [tabId]: 0 }))
  }

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

    if (error) {
      showToast(`블록 생성 실패: ${error.message}`, 'error')
    } else if (data) {
      setBlocks([...blocks, data])
      setEditingBlocks({ ...editingBlocks, [data.id]: true })
    }
  }

  const updateBlockContent = (blockId: string, content: Record<string, unknown>) => {
    pendingChanges.current[blockId] = content
  }

  // 뷰 모드에서 즉시 DB 저장 (체크리스트 체크 상태 등)
  const saveBlockNow = async (blockId: string, content: Record<string, unknown>) => {
    await supabase.from('blocks').update({ content, updated_at: new Date().toISOString() }).eq('id', blockId)
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, content } : b))
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
    // Clean up any pending changes for this block
    delete pendingChanges.current[blockId]
    delete pendingTitles.current[blockId]
  }

  const copyBlock = async (block: Block) => {
    const newOrder = activeTabBlocks.length
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        tab_id: block.tab_id,
        type: block.type,
        title: block.title ? `${block.title} (복사)` : null,
        show_title: block.show_title,
        content: block.content,
        order_index: newOrder,
      })
      .select()
      .single()
    if (!error && data) setBlocks([...blocks, data])
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
    const info = blockTypeInfo(block.type)
    const headerLabel = (block.show_title && block.title) ? block.title : (info?.label ?? block.type)
    return (
      <div key={block.id} className="glass-card rounded-xl overflow-hidden shadow-sm">
        {/* 항상 표시되는 헤더 */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-sky-300/70 bg-sky-100/60">
          <span className="text-base">{info?.icon}</span>
          <span className="text-sm font-semibold text-sky-800">{headerLabel}</span>
        </div>
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
              onChange={(c) => saveBlockNow(block.id, c as Record<string, unknown>)}
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
          {block.type === 'credential' && (
            <CredentialBlock
              content={block.content as Parameters<typeof CredentialBlock>[0]['content']}
              isEditing={false}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'license' && (
            <LicenseBlock
              content={block.content as Parameters<typeof LicenseBlock>[0]['content']}
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

            {/* Copy */}
            <button
              onClick={() => copyBlock(block)}
              title="블록 복사 (현재 탭)"
              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-700 hover:bg-sky-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Transfer to other note */}
            <button
              onClick={() => setTransferBlock(block)}
              title="다른 노트로 복사/이동"
              className="p-1.5 rounded-lg text-sky-400 hover:text-sky-700 hover:bg-sky-100 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
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
            <button
              onClick={() => setConfirmDeleteBlock(block.id)}
              title="블록 삭제"
              className="p-1.5 rounded-lg text-sky-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
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
          {block.type === 'credential' && (
            <CredentialBlock
              content={block.content as Parameters<typeof CredentialBlock>[0]['content']}
              isEditing={isEditing}
              onChange={(c) => updateBlockContent(block.id, c as Record<string, unknown>)}
            />
          )}
          {block.type === 'license' && (
            <LicenseBlock
              content={block.content as Parameters<typeof LicenseBlock>[0]['content']}
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
                onClick={() => setConfirmComplete(true)}
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
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
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

        {/* 높이 측정 기준점 */}
        <div ref={blocksAreaRef} />

        {/* Blocks */}
        {(() => {
          const isPageMode = !isEditMode && !!activeTabId && !!tabPageMode[activeTabId]
          const currentPageNum = (activeTabId ? tabCurrentPage[activeTabId] : 0) ?? 0
          const totalPages = Math.max(1, Math.ceil(innerH / availableH))

          if (activeTabBlocks.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-3xl mb-4">📄</div>
                <h3 className="text-sky-950 font-semibold mb-2">빈 탭입니다</h3>
                <p className="text-sky-600 text-sm mb-6 max-w-xs">
                  {isEditMode ? '블록을 추가해서 노트를 작성해보세요.' : '편집 버튼을 눌러 블록을 추가해보세요.'}
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
            )
          }

          return (
            <>
              {/* 책 형식 페이지 보기 */}
              {isPageMode ? (() => {
                const animDir = activeTabId ? (tabAnimDir[activeTabId] ?? 'next') : 'next'
                const goNext = () => {
                  if (!activeTabId || currentPageNum >= totalPages - 1) return
                  setTabAnimDir(p => ({ ...p, [activeTabId]: 'next' }))
                  setAnimKey(k => k + 1)
                  setTabCurrentPage(p => ({ ...p, [activeTabId]: currentPageNum + 1 }))
                }
                const goPrev = () => {
                  if (!activeTabId || currentPageNum <= 0) return
                  setTabAnimDir(p => ({ ...p, [activeTabId]: 'prev' }))
                  setAnimKey(k => k + 1)
                  setTabCurrentPage(p => ({ ...p, [activeTabId]: currentPageNum - 1 }))
                }
                const wheelCooldown = { current: false }
                const handleWheel = (e: React.WheelEvent) => {
                  e.preventDefault()
                  if (wheelCooldown.current) return
                  wheelCooldown.current = true
                  setTimeout(() => { wheelCooldown.current = false }, 500)
                  if (e.deltaY > 0) goNext(); else goPrev()
                }
                return (
                  <div style={{ position: 'relative' }}>
                    <style>{`
                      @keyframes book-in-next {
                        from { transform: translateX(5%); opacity: 0; }
                        to   { transform: translateX(0);  opacity: 1; }
                      }
                      @keyframes book-in-prev {
                        from { transform: translateX(-5%); opacity: 0; }
                        to   { transform: translateX(0);   opacity: 1; }
                      }
                    `}</style>

                    {/* 좌우 화살표 + 클립 래퍼 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

                      {/* 이전 화살표 */}
                      <button
                        onClick={goPrev}
                        disabled={currentPageNum === 0}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(14,165,233,0.35)', boxShadow: '0 2px 8px rgba(14,165,233,0.15)', backdropFilter: 'blur(8px)' }}
                      >
                        <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* 콘텐츠 클립 영역 */}
                      <div style={{ flex: 1, height: `${availableH}px`, overflow: 'hidden', position: 'relative' }} onWheel={handleWheel}>
                        {/* 애니메이션 래퍼 (x축 슬라이드) */}
                        <div
                          key={animKey}
                          style={{
                            animation: `${animDir === 'next' ? 'book-in-next' : 'book-in-prev'} 0.32s cubic-bezier(.4,0,.2,1) both`,
                          }}
                        >
                          {/* y축 오프셋 래퍼 */}
                          <div
                            ref={innerBlockRef}
                            className="space-y-4"
                            style={{ transform: `translateY(-${currentPageNum * availableH}px)` }}
                          >
                            {activeTabBlocks.map(renderViewBlock)}
                          </div>
                        </div>
                      </div>

                      {/* 다음 화살표 */}
                      <button
                        onClick={goNext}
                        disabled={currentPageNum >= totalPages - 1}
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-all disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(14,165,233,0.35)', boxShadow: '0 2px 8px rgba(14,165,233,0.15)', backdropFilter: 'blur(8px)' }}
                      >
                        <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* 페이지 인디케이터 */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (!activeTabId) return
                            setTabAnimDir(p => ({ ...p, [activeTabId]: i > currentPageNum ? 'next' : 'prev' }))
                            setAnimKey(k => k + 1)
                            setTabCurrentPage(p => ({ ...p, [activeTabId]: i }))
                          }}
                          className={`rounded-full transition-all ${i === currentPageNum ? 'w-5 h-2 bg-sky-500' : 'w-2 h-2 bg-sky-300 hover:bg-sky-400'}`}
                        />
                      ))}
                      <span
                        className="text-sm font-bold ml-2"
                        style={{ color: '#0c4a6e' }}
                      >
                        {currentPageNum + 1} / {totalPages}
                      </span>
                    </div>
                  </div>
                )
              })() : (
                /* 일반 스크롤 보기 */
                <div className="space-y-4">
                  {isEditMode ? activeTabBlocks.map(renderEditBlock) : activeTabBlocks.map(renderViewBlock)}
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
                </div>
              )}
            </>
          )
        })()}
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
                    {hoveredBlockType === 'credential' && (
                      <CredentialBlock content={previewSample as Parameters<typeof CredentialBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                    {hoveredBlockType === 'license' && (
                      <LicenseBlock content={previewSample as Parameters<typeof LicenseBlock>[0]['content']} isEditing={false} onChange={() => {}} />
                    )}
                  </div>
                  <p className="text-center text-xs text-sky-400 mt-3">클릭하면 이 블록이 추가됩니다</p>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* 페이지 모드 플로팅 토글 버튼 */}
      {!isEditMode && activeTabId && (
        <button
          onClick={() => togglePageMode(activeTabId)}
          title={tabPageMode[activeTabId] ? '스크롤 보기로 전환' : '한 화면 페이지 보기로 전환'}
          className={`fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${
            tabPageMode[activeTabId]
              ? 'bg-sky-500 text-white shadow-sky-300'
              : 'bg-white/90 text-sky-500 border border-sky-200 hover:border-sky-400'
          }`}
          style={{ backdropFilter: 'blur(12px)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </button>
      )}

      {/* 완료(저장) 확인 */}
      <ConfirmDialog
        isOpen={confirmComplete}
        title="변경사항 저장"
        message="편집한 내용을 저장하고 보기 모드로 전환하시겠습니까?"
        confirmLabel="저장"
        cancelLabel="취소"
        variant="info"
        onConfirm={() => { setConfirmComplete(false); handleComplete() }}
        onCancel={() => setConfirmComplete(false)}
      />

      {/* 블록 삭제 확인 */}
      <ConfirmDialog
        isOpen={confirmDeleteBlock !== null}
        title="블록 삭제"
        message="이 블록을 삭제하시겠습니까? 삭제된 블록은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => { const id = confirmDeleteBlock; setConfirmDeleteBlock(null); if (id) deleteBlock(id) }}
        onCancel={() => setConfirmDeleteBlock(null)}
      />

      {/* 블록 복사/이동 모달 */}
      {transferBlock && (
        <BlockTransferModal
          block={transferBlock}
          currentNoteId={noteId}
          onClose={() => setTransferBlock(null)}
          onMoved={(blockId) => {
            setBlocks(prev => prev.filter(b => b.id !== blockId))
            delete pendingChanges.current[blockId]
            delete pendingTitles.current[blockId]
          }}
          onCopied={() => {}}
        />
      )}
    </div>
  )
}
