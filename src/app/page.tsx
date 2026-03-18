'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, Note } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import NoteCard from '@/components/NoteCard'
import PasswordModal from '@/components/PasswordModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import AuthModal from '@/components/auth/AuthModal'
import TrashModal from '@/components/TrashModal'
import DocsModal from '@/components/DocsModal'
import AccountModal from '@/components/AccountModal'
import bcrypt from 'bcryptjs'
import ContributionGraph from '@/components/ContributionGraph'
import BlockStatsChart from '@/components/BlockStatsChart'
import WeeklyGoal from '@/components/WeeklyGoal'
import { getPinnedIds, togglePin } from '@/lib/pinnedNotes'
import { getRecentNotes, addRecentNote, RecentNote } from '@/lib/recentNotes'
import FolderModal from '@/components/FolderModal'
import { getFolders, Folder } from '@/lib/folders'
import SearchModal from '@/components/SearchModal'

export default function HomePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'locked'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [passwordModal, setPasswordModal] = useState<{ note: Note } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null)
  const [deletePasswordNote, setDeletePasswordNote] = useState<Note | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<Note | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // 폴더
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [showFolderModal, setShowFolderModal] = useState(false)

  // 핀 고정
  const [pinnedIds, setPinnedIds] = useState<string[]>([])

  // 최근 본 노트
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])

  // Drag-and-drop order
  const [noteOrder, setNoteOrder] = useState<string[]>([])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragOrderRef = useRef<string[]>([])

  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // MFA AAL 체크: nextLevel이 aal2인데 currentLevel이 aal1이면 MFA 미완료 → user 설정 안 함
  const checkAalAndSetUser = async (sessionUser: typeof user) => {
    if (!sessionUser) { setUser(null); return }
    try {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
        setUser(null) // MFA 완료 전 → 대시보드 진입 차단
      } else {
        setUser(sessionUser)
      }
    } catch {
      // AAL 체크 실패 시 세션 유저 그대로 사용 (fail-open)
      setUser(sessionUser)
    }
  }

  useEffect(() => {
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        await checkAalAndSetUser(session?.user ?? null)
      })
      .catch(() => {
        setUser(null)
      })
      .finally(() => {
        setAuthLoading(false)
      })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // setTimeout으로 Supabase 내부 auth lock 컨텍스트 밖에서 실행
      // mfa.verify()가 lock 보유 중 onAuthStateChange를 호출할 때
      // checkAalAndSetUser 내부의 mfa.getAuthenticatorAssuranceLevel()이
      // 같은 lock을 요청하면 영원히 대기하는 데드락 발생 → 0ms 지연으로 해결
      setTimeout(() => checkAalAndSetUser(session?.user ?? null), 0)
    })
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // localStorage에서 핀 로드
  useEffect(() => {
    setPinnedIds(getPinnedIds())
  }, [])

  // 최근 본 노트 로드
  useEffect(() => {
    setRecentNotes(getRecentNotes())
  }, [notes])

  // 폴더 로드
  useEffect(() => {
    setFolders(getFolders())
  }, [])

  const handleTogglePin = (note: Note) => {
    togglePin(note.id)
    setPinnedIds(getPinnedIds())
  }

  const handleDuplicateNote = async (note: Note) => {
    const { data: newNote, error } = await supabase
      .from('notes')
      .insert({
        icon: note.icon,
        title: `${note.title} (복사)`,
        description: note.description,
        tags: note.tags,
        is_locked: false,
        user_id: user?.id,
      })
      .select()
      .single()

    if (error || !newNote) {
      showToast('복제 실패: ' + (error?.message || ''), 'error')
      return
    }

    const { data: sourceTabs } = await supabase.from('tabs').select('*').eq('note_id', note.id).order('order_index')
    if (sourceTabs && sourceTabs.length > 0) {
      for (const tab of sourceTabs) {
        const { data: newTab } = await supabase
          .from('tabs')
          .insert({ note_id: newNote.id, name: tab.name, order_index: tab.order_index })
          .select()
          .single()

        if (!newTab) continue

        const { data: blocks } = await supabase.from('blocks').select('*').eq('tab_id', tab.id).order('order_index')
        if (blocks && blocks.length > 0) {
          await supabase.from('blocks').insert(
            blocks.map(b => ({
              tab_id: newTab.id,
              type: b.type,
              title: b.title,
              show_title: b.show_title,
              content: b.content,
              order_index: b.order_index,
            }))
          )
        }
      }
    }

    showToast(`"${note.title}" 노트가 복제되었습니다.`, 'success')
    await fetchNotes()
    router.push(`/notes/${newNote.id}`)
  }

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    // deleted_at 컬럼이 있으면 휴지통 필터, 없으면 전체 조회
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      // deleted_at 컬럼 미생성 시 폴백
      const { data: fallback } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false })
      if (fallback) setNotes(fallback)
    } else if (data) {
      setNotes(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Ctrl+K 전역 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filteredNotes = notes.filter((note) => {
    const matchesTab = activeTab === 'all' || (activeTab === 'locked' && note.is_locked)
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTag = !selectedTag || (note.tags?.includes(selectedTag) ?? false)
    const matchesFolder = !selectedFolderId || (
      folders.find(f => f.id === selectedFolderId)?.noteIds.includes(note.id) ?? false
    )
    return matchesTab && matchesSearch && matchesTag && matchesFolder
  })

  const handleNoteClick = (note: Note) => {
    if (note.is_locked) {
      setPasswordModal({ note })
    } else {
      addRecentNote({ id: note.id, title: note.title, icon: note.icon, visitedAt: new Date().toISOString() })
      router.push(`/notes/${note.id}`)
    }
  }

  const handlePasswordConfirm = async (password: string): Promise<boolean> => {
    if (!passwordModal) return false
    const hash = passwordModal.note.password_hash
    if (!hash) return false

    const isValid = await bcrypt.compare(password, hash)
    if (isValid) {
      setPasswordModal(null)
      router.push(`/notes/${passwordModal.note.id}`)
    }
    return isValid
  }

  // 삭제 요청 - 잠금 노트면 비밀번호 먼저 확인
  const handleDeleteRequest = (note: Note) => {
    if (note.is_locked) {
      setDeletePasswordNote(note)
    } else {
      setDeleteTarget(note)
    }
  }

  // 잠금 노트 삭제 전 비밀번호 확인
  const handleDeletePasswordConfirm = async (password: string): Promise<boolean> => {
    if (!deletePasswordNote?.password_hash) return false
    const isValid = await bcrypt.compare(password, deletePasswordNote.password_hash)
    if (isValid) {
      const note = deletePasswordNote
      setDeletePasswordNote(null)
      setDeleteTarget(note)
    }
    return isValid
  }

  // 소프트 삭제 (휴지통으로 이동)
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleteTarget.id)
    if (error) {
      showToast(`삭제에 실패했습니다: ${error.message}`, 'error')
    } else {
      showToast(`"${deleteTarget.title}" 노트가 휴지통으로 이동되었습니다.`, 'success')
      await fetchNotes()
    }
    setDeleteTarget(null)
  }

  // localStorage에서 순서 복원
  useEffect(() => {
    if (!user) return
    try {
      const saved = localStorage.getItem(`note-archive-order-${user.id}`)
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        dragOrderRef.current = parsed
        setNoteOrder(parsed)
      }
    } catch {}
  }, [user])

  // notes 변경 시: 기존 순서 유지 + 새 노트는 맨 앞에 추가
  useEffect(() => {
    if (!user || notes.length === 0) return
    const noteIds = notes.map(n => n.id)
    const existing = dragOrderRef.current.filter(id => noteIds.includes(id))
    const newOnes = noteIds.filter(id => !existing.includes(id))
    const merged = [...newOnes, ...existing]  // 새 노트는 맨 앞
    dragOrderRef.current = merged
    setNoteOrder(merged)
    localStorage.setItem(`note-archive-order-${user.id}`, JSON.stringify(merged))
  }, [notes, user])

  // 드래그 핸들러
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragOverId) setDragOverId(id)
  }
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return }
    const newOrder = [...dragOrderRef.current]
    const fromIdx = newOrder.indexOf(draggedId)
    const toIdx   = newOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggedId)
    dragOrderRef.current = newOrder
    setNoteOrder(newOrder)
    if (user) localStorage.setItem(`note-archive-order-${user.id}`, JSON.stringify(newOrder))
    setDraggedId(null)
    setDragOverId(null)
  }
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null) }

  const lockedCount = notes.filter((n) => n.is_locked).length

  // 전체 태그 통계 (태그 필터용)
  const allTagStats = useMemo(() => {
    const freq: Record<string, number> = {}
    notes.forEach(n => n.tags?.forEach(t => { freq[t] = (freq[t] || 0) + 1 }))
    return Object.entries(freq).sort((a, b) => b[1] - a[1])
  }, [notes])

  // 핀된 노트 (filteredNotes 중)
  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => pinnedIds.includes(n.id)).slice(0, 5),
    [filteredNotes, pinnedIds]
  )

  const orderedNotes = useMemo(() => {
    const unpinned = filteredNotes.filter((n) => !pinnedIds.includes(n.id))
    if (!noteOrder.length) return unpinned
    return [...unpinned].sort((a, b) => {
      const ai = noteOrder.indexOf(a.id)
      const bi = noteOrder.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [filteredNotes, noteOrder, pinnedIds])

  const isLanding = !authLoading && !user

  // ── 단일 return: AuthModal이 항상 같은 트리 위치에 있어야 MFA step 보존됨 ──
  return (
    <div className="min-h-screen">

      {/* ── 비로그인 랜딩 페이지 ── */}
      {isLanding && (
        <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
          <div className="w-full max-w-2xl mb-3 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs text-white"
            style={{ background: 'rgba(14,100,180,0.55)', border: '1px solid rgba(100,180,255,0.5)', backdropFilter: 'blur(8px)' }}>
            <span className="text-sm">ℹ️</span>
            <span>본 서비스는 실제 상업용 서비스가 아닌 개인 프로젝트 및 개인 사용 목적으로 운영되는 서비스입니다.</span>
          </div>
          <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(10, 20, 50, 0.62)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="flex justify-between items-center pt-6 px-2">
              <div className="w-8" />
              <span className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs text-white/80 font-medium">
                <span className="text-base">📝</span> Note Archive
              </span>
            </div>
            <div className="text-center px-8 pt-6 pb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-4">
                나만의 지식을<br />
                <span style={{ background: 'linear-gradient(90deg, #7dd3fc, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  스마트하게 관리
                </span>
              </h1>
              <p className="text-white/60 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
                아이디어, 코드 스니펫, 학습 내용을 탭과 블록으로 구조화하여<br className="hidden sm:block" />
                한 곳에서 체계적으로 관리하세요.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-8 pb-10">
              <button
                onClick={() => { setAuthTab('login'); setShowAuthModal(true) }}
                className="group rounded-2xl p-5 text-left transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-3 shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base mb-1">로그인</h3>
                <p className="text-white/50 text-xs leading-relaxed">기존 계정으로 내 노트에 접근하세요.</p>
              </button>
              <button
                onClick={() => { setAuthTab('signup'); setShowAuthModal(true) }}
                className="group rounded-2xl p-5 text-left transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base mb-1">회원가입</h3>
                <p className="text-white/50 text-xs leading-relaxed">무료로 시작하고 어디서든 접근하세요.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 로그인된 대시보드 ── */}
      {!isLanding && user && (<>
      {/* Header */}
      <header className="glass-header fixed top-0 left-0 right-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-base shadow-md">
              📝
            </div>
            <h1 className="text-xl font-bold text-sky-900 drop-shadow">Note Archive</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(true)}
              title="전체 검색 (Ctrl+K)"
              className="p-2 rounded-xl bg-white/30 hover:bg-white/50 border border-white/40 text-sky-700 hover:text-sky-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowAccount(true)}
              title="계정 설정"
              className="p-2 rounded-xl bg-white/30 hover:bg-white/50 border border-white/40 text-sky-700 hover:text-sky-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              onClick={() => setShowDocs(true)}
              title="문서 가이드"
              className="p-2 rounded-xl bg-white/30 hover:bg-white/50 border border-white/40 text-sky-700 hover:text-sky-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button
              onClick={() => setShowTrash(true)}
              title="휴지통"
              className="p-2 rounded-xl bg-white/30 hover:bg-white/50 border border-white/40 text-sky-700 hover:text-red-500 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <Link
              href="/calendar"
              title="캘린더"
              className="p-2 rounded-xl bg-white/30 hover:bg-white/50 border border-white/40 text-sky-700 hover:text-sky-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </Link>
            <button
              onClick={() => setShowFolderModal(true)}
              title="폴더 관리"
              className="p-2 rounded-xl bg-white/30 hover:bg-white/50 border border-white/40 text-sky-700 hover:text-sky-800 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
            </button>
            <Link
              href="/notes/new"
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              새 노트
            </Link>
            {user && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  title="프로필"
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all border-2 border-white/60"
                >
                  {user.email?.[0]?.toUpperCase() ?? '?'}
                </button>
                {showProfileMenu && (
                  <div
                    className="absolute right-0 top-10 z-50 w-52 rounded-2xl shadow-xl border border-sky-200/60 overflow-hidden"
                    style={{ background: 'var(--dm-surface-modal)', backdropFilter: 'blur(16px)' }}
                    onMouseLeave={() => setShowProfileMenu(false)}
                  >
                    <div className="px-4 py-3 border-b border-sky-100">
                      <p className="text-xs text-sky-500 font-medium">로그인 계정</p>
                      <p className="text-sm text-sky-900 font-semibold truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setShowProfileMenu(false); supabase.auth.signOut() }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative pt-24">

        {/* Dashboard top panel */}
        <div className="rounded-2xl mb-8 overflow-hidden" style={{ background: 'var(--dm-surface-panel)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56,170,230,0.30)', boxShadow: '0 4px 32px rgba(0,80,160,0.14)' }}>
          {/* Hero row */}
          <div className="px-6 pt-6 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-sky-800 uppercase tracking-widest mb-1">My Workspace</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-sky-950 leading-tight">
                나의 <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #0ea5e9, #6366f1)' }}>스토리지</span>
              </h2>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-700 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="노트 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/70 border border-sky-300/50 rounded-xl pl-10 pr-9 py-2.5 text-sky-900 placeholder-sky-400 text-sm outline-none focus:border-sky-500 focus:bg-white/90 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-700 hover:text-sky-900 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mx-6" style={{ background: 'linear-gradient(90deg, rgba(14,165,233,0.15), rgba(99,102,241,0.1), transparent)' }} />

          {/* Stats + Tabs row */}
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
            {/* Stats */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.12)' }}>
                  <svg className="w-4 h-4 text-sky-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-sky-900 leading-none block">{notes.length}</span>
                  <span className="text-xs text-sky-800">전체</span>
                </div>
              </div>
              <div className="w-px h-8 bg-sky-100" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                  <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-sky-900 leading-none block">{lockedCount}</span>
                  <span className="text-xs text-sky-800">잠김</span>
                </div>
              </div>
              <div className="w-px h-8 bg-sky-100" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)' }}>
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </div>
                <div>
                  <span className="text-xl font-bold text-sky-900 leading-none block">{notes.length - lockedCount}</span>
                  <span className="text-xs text-sky-800">공개</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-sky-900 shadow-sm'
                    : 'text-sky-700 hover:text-sky-900'
                }`}
              >
                전체
                <span className={`ml-1.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  activeTab === 'all' ? 'bg-sky-100 text-sky-800' : 'text-sky-700'
                }`}>{notes.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('locked')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'locked'
                    ? 'bg-white text-sky-900 shadow-sm'
                    : 'text-sky-700 hover:text-sky-900'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                잠김
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                  activeTab === 'locked' ? 'bg-sky-100 text-sky-800' : 'text-sky-700'
                }`}>{lockedCount}</span>
              </button>
            </div>

          </div>

          {/* 주간 목표 */}
          <div className="px-6 pb-4 border-t border-sky-100/60 pt-4">
            <WeeklyGoal notes={notes} />
          </div>

          {/* 전체 태그 필터 */}
          {allTagStats.length > 0 && (
            <div className="px-6 py-3 border-t border-sky-100/60">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-xs font-semibold text-sky-700">태그로 필터</p>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="ml-1 text-xs text-sky-500 hover:text-sky-700 underline transition-colors"
                  >
                    전체 보기
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allTagStats.map(([tag, cnt]) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={selectedTag === tag
                      ? { background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.5)', color: 'var(--dm-text)', fontWeight: 700 }
                      : { background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)', color: 'var(--dm-text-muted)' }
                    }
                  >
                    <span>#{tag}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={selectedTag === tag
                        ? { background: 'rgba(14,165,233,0.25)', color: 'var(--dm-text)' }
                        : { background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }
                      }
                    >{cnt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 폴더 필터 */}
          {folders.length > 0 && (
            <div className="px-6 py-3 border-t border-sky-100/60">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
                <p className="text-xs font-semibold text-sky-700">폴더로 필터</p>
                {selectedFolderId && (
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className="ml-1 text-xs text-sky-500 hover:text-sky-700 underline transition-colors"
                  >
                    전체 보기
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(selectedFolderId === folder.id ? null : folder.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={selectedFolderId === folder.id
                      ? { background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(14,165,233,0.5)', color: 'var(--dm-text)', fontWeight: 700 }
                      : { background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)', color: 'var(--dm-text-muted)' }
                    }
                  >
                    <span>{folder.icon}</span>
                    <span>{folder.name}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={selectedFolderId === folder.id
                        ? { background: 'rgba(14,165,233,0.25)', color: 'var(--dm-text)' }
                        : { background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }
                      }
                    >{folder.noteIds.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 최근 본 노트 */}
        {!loading && recentNotes.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="text-sm">🕐</span>
              최근 본 노트
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {recentNotes.slice(0, 8).map((rn) => {
                const note = notes.find(n => n.id === rn.id)
                if (!note) return null
                return (
                  <button
                    key={rn.id}
                    onClick={() => handleNoteClick(note)}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all hover:scale-105"
                    style={{ background: 'var(--dm-surface-input)', border: '1px solid var(--dm-border-subtle)', backdropFilter: 'blur(8px)' }}
                  >
                    <span className="text-lg">{rn.icon}</span>
                    <span className="text-sm font-medium text-sky-900 max-w-[120px] truncate">{rn.title}</span>
                  </button>
                )
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* 핀 고정된 노트 섹션 */}
        {!loading && pinnedNotes.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span className="text-sm">📌</span>
              고정됨
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedNotes.map((note) => (
                <div key={note.id} className="group">
                  {/* 상단 액션 바 */}
                  <div className="flex items-center justify-between px-3 py-1.5 mx-1 mt-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(186,230,253,0.55)', border: '1px solid rgba(125,200,240,0.4)' }}>
                    <span className="text-xs font-medium text-sky-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                      고정됨
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleTogglePin(note) }}
                      title="핀 해제"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/60 hover:bg-red-50 text-sky-600 hover:text-red-400 transition-all text-xs font-medium"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ outline: '2px solid rgba(14,165,233,0.35)', borderRadius: '0.75rem' }}>
                    <NoteCard
                      note={note}
                      onClick={() => handleNoteClick(note)}
                      onEdit={() => router.push(`/notes/${note.id}/edit`)}
                      onDelete={() => handleDeleteRequest(note)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-sky-100/80" />
                </div>
                <div className="h-4 bg-sky-100/80 rounded mb-2" />
                <div className="h-3 bg-sky-100/80 rounded mb-1 w-3/4" />
                <div className="h-3 bg-sky-100/80 rounded mb-3 w-1/2" />
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-sky-100/80 rounded-full" />
                  <div className="h-5 w-12 bg-sky-100/80 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">
              {searchQuery ? '🔍' : activeTab === 'locked' ? '🔓' : '📭'}
            </div>
            <h3 className="text-sky-900 font-semibold text-lg mb-2 drop-shadow">
              {searchQuery
                ? '검색 결과가 없습니다'
                : activeTab === 'locked'
                ? '잠긴 노트가 없습니다'
                : '노트가 없습니다'}
            </h3>
            <p className="text-sky-900 text-sm mb-6 text-center max-w-xs">
              {searchQuery
                ? `"${searchQuery}"에 해당하는 노트를 찾을 수 없습니다.`
                : '새 노트를 만들어 아이디어와 지식을 기록해보세요.'}
            </p>
            {!searchQuery && activeTab === 'all' && (
              <Link
                href="/notes/new"
                className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                첫 번째 노트 만들기
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {orderedNotes.map((note) => (
              <div
                key={note.id}
                onDragOver={(e) => handleDragOver(e, note.id)}
                onDrop={(e) => handleDrop(e, note.id)}
                className={`group transition-all duration-150 ${
                  dragOverId === note.id && draggedId !== note.id
                    ? 'ring-2 ring-sky-400 ring-offset-2 rounded-xl scale-[1.02]'
                    : ''
                }`}
              >
                {/* 카드 상단 액션 바 — 호버 시 표시 */}
                <div className="flex items-center justify-between px-3 py-1.5 mx-1 mt-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(186,230,253,0.55)', border: '1px solid rgba(125,200,240,0.4)' }}>
                  <div className="flex items-center gap-2">
                    {/* 드래그 핸들 */}
                    <div
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, note.id)
                        const card = (e.currentTarget as HTMLElement).closest('.group') as HTMLElement
                        if (card) e.dataTransfer.setDragImage(card, 24, 24)
                      }}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => e.stopPropagation()}
                      title="드래그하여 순서 변경"
                      className="w-7 h-7 flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing bg-white/60 hover:bg-white/90 text-sky-600 hover:text-sky-800 transition-all"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="9"  cy="5"  r="1.5"/>
                        <circle cx="15" cy="5"  r="1.5"/>
                        <circle cx="9"  cy="12" r="1.5"/>
                        <circle cx="15" cy="12" r="1.5"/>
                        <circle cx="9"  cy="19" r="1.5"/>
                        <circle cx="15" cy="19" r="1.5"/>
                      </svg>
                    </div>
                    {/* 복제 버튼 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDuplicateTarget(note) }}
                      title="노트 복제"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/60 hover:bg-white/90 text-sky-600 hover:text-sky-800 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  {/* 핀 토글 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(note) }}
                    title="핀 고정"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/60 hover:bg-white/90 text-sky-600 hover:text-sky-800 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </div>

                <div className={`transition-all duration-150 ${draggedId === note.id ? 'opacity-40 scale-95' : ''}`}>
                  <NoteCard
                    note={note}
                    onClick={() => handleNoteClick(note)}
                    onEdit={() => router.push(`/notes/${note.id}/edit`)}
                    onDelete={() => handleDeleteRequest(note)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 글쓰기 잔디 */}
        <div className="mt-8">
          <ContributionGraph notes={notes} />
        </div>

        {/* 블록 타입 통계 */}
        <div className="mt-6 mb-8">
          <BlockStatsChart userId={user.id} />
        </div>

      </main>

      {/* Password Modal */}
      {passwordModal && (
        <PasswordModal
          noteTitle={passwordModal.note.title}
          noteIcon={passwordModal.note.icon}
          onConfirm={handlePasswordConfirm}
          onClose={() => setPasswordModal(null)}
        />
      )}

      {/* 잠금 노트 삭제 비밀번호 확인 */}
      {deletePasswordNote && (
        <PasswordModal
          noteTitle={deletePasswordNote.title}
          noteIcon={deletePasswordNote.icon}
          confirmLabel="확인"
          onConfirm={handleDeletePasswordConfirm}
          onClose={() => setDeletePasswordNote(null)}
        />
      )}

      {/* Duplicate Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!duplicateTarget}
        title="노트 복제"
        message={`"${duplicateTarget?.title}" 노트를 복제하시겠습니까? 탭과 블록이 모두 복사됩니다.`}
        confirmLabel="복제"
        cancelLabel="취소"
        variant="info"
        onConfirm={() => { const n = duplicateTarget; setDuplicateTarget(null); if (n) handleDuplicateNote(n) }}
        onCancel={() => setDuplicateTarget(null)}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="휴지통으로 이동"
        message={`"${deleteTarget?.title}" 노트를 휴지통으로 이동하시겠습니까? 휴지통에서 복구하거나 영구 삭제할 수 있습니다.`}
        confirmLabel="휴지통으로 이동"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Docs Modal */}
      <DocsModal
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />

      {/* Trash Modal */}
      <TrashModal
        isOpen={showTrash}
        onClose={() => setShowTrash(false)}
        onRestore={fetchNotes}
      />

      {/* Account Modal */}
      {user && (
        <AccountModal
          isOpen={showAccount}
          user={user}
          onClose={() => setShowAccount(false)}
          onSignOut={() => { setShowAccount(false); fetchNotes() }}
        />
      )}

      {/* Search Modal */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}

      {/* Folder Modal */}
      <FolderModal
        isOpen={showFolderModal}
        notes={notes}
        onClose={() => setShowFolderModal(false)}
        onFoldersChange={() => setFolders(getFolders())}
      />
      </>)}

      {/* ── AuthModal: 항상 동일한 트리 위치 (랜딩/대시보드 전환 시 리마운트 방지) ── */}
      <AuthModal
        isOpen={showAuthModal}
        initialTab={authTab}
        onClose={() => setShowAuthModal(false)}
        onSuccess={fetchNotes}
      />
    </div>
  )
}
