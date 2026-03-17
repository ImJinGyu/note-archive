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

  const filteredNotes = notes.filter((note) => {
    const matchesTab = activeTab === 'all' || (activeTab === 'locked' && note.is_locked)
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesTab && matchesSearch
  })

  const handleNoteClick = (note: Note) => {
    if (note.is_locked) {
      setPasswordModal({ note })
    } else {
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

  const orderedNotes = useMemo(() => {
    if (!noteOrder.length) return filteredNotes
    return [...filteredNotes].sort((a, b) => {
      const ai = noteOrder.indexOf(a.id)
      const bi = noteOrder.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }, [filteredNotes, noteOrder])

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
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-base shadow-md">
              📝
            </div>
            <h1 className="text-xl font-bold text-sky-900 drop-shadow">Note Archive</h1>
          </div>
          <div className="flex items-center gap-3">
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
            <span className="text-sm text-sky-800 hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-1.5 text-sm font-medium rounded-xl bg-white/50 hover:bg-white/70 border border-white/40 text-sky-700 hover:text-red-600 transition-all"
            >
              로그아웃
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
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 relative">

        {/* Dashboard top panel */}
        <div className="rounded-2xl mb-8 overflow-hidden" style={{ background: 'rgba(210,235,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(56,170,230,0.30)', boxShadow: '0 4px 32px rgba(0,80,160,0.14)' }}>
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
        </div>

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
                className={`relative group transition-all duration-150 ${
                  dragOverId === note.id && draggedId !== note.id
                    ? 'ring-2 ring-sky-400 ring-offset-2 rounded-xl scale-[1.02]'
                    : ''
                }`}
              >
                {/* 드래그 핸들 — 호버 시 표시, 이것만 draggable */}
                <div
                  draggable
                  onDragStart={(e) => {
                    handleDragStart(e, note.id)
                    const card = (e.currentTarget as HTMLElement).parentElement
                    if (card) e.dataTransfer.setDragImage(card, 24, 24)
                  }}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => e.stopPropagation()}
                  title="드래그하여 순서 변경"
                  className="absolute top-2.5 left-2.5 z-20 w-6 h-6 flex items-center justify-center rounded-md cursor-grab active:cursor-grabbing transition-opacity opacity-20 group-hover:opacity-100"
                  style={{ background: 'rgba(255,255,255,0.85)', boxShadow: '0 1px 4px rgba(0,80,160,0.15)' }}
                >
                  <svg className="w-3 h-3 text-sky-700" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9"  cy="5"  r="1.5"/>
                    <circle cx="15" cy="5"  r="1.5"/>
                    <circle cx="9"  cy="12" r="1.5"/>
                    <circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9"  cy="19" r="1.5"/>
                    <circle cx="15" cy="19" r="1.5"/>
                  </svg>
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
