'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Note } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

interface TrashModalProps {
  isOpen: boolean
  onClose: () => void
  onRestore: () => void
}

export default function TrashModal({ isOpen, onClose, onRestore }: TrashModalProps) {
  const { showToast } = useToast()
  const [trashedNotes, setTrashedNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Note | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchTrashed = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('notes')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setTrashedNotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOpen) fetchTrashed()
  }, [isOpen, fetchTrashed])

  const handleRestore = async (note: Note) => {
    setProcessing(note.id)
    const { error } = await supabase.from('notes').update({ deleted_at: null }).eq('id', note.id)
    if (error) {
      showToast('복구에 실패했습니다.', 'error')
    } else {
      showToast(`"${note.title}" 노트가 복구되었습니다.`, 'success')
      setTrashedNotes((prev) => prev.filter((n) => n.id !== note.id))
      onRestore()
    }
    setProcessing(null)
  }

  const handlePermanentDelete = async () => {
    if (!permanentDeleteTarget) return
    setProcessing(permanentDeleteTarget.id)
    const { error } = await supabase.from('notes').delete().eq('id', permanentDeleteTarget.id)
    if (error) {
      showToast('영구 삭제에 실패했습니다.', 'error')
    } else {
      showToast(`"${permanentDeleteTarget.title}" 노트가 영구 삭제되었습니다.`, 'success')
      setTrashedNotes((prev) => prev.filter((n) => n.id !== permanentDeleteTarget.id))
    }
    setPermanentDeleteTarget(null)
    setProcessing(null)
  }

  const handleEmptyTrash = async () => {
    if (trashedNotes.length === 0) return
    setLoading(true)
    const ids = trashedNotes.map((n) => n.id)
    const { error } = await supabase.from('notes').delete().in('id', ids)
    if (error) {
      showToast('휴지통 비우기에 실패했습니다.', 'error')
    } else {
      showToast('휴지통을 비웠습니다.', 'success')
      setTrashedNotes([])
    }
    setLoading(false)
  }

  const formatDeletedDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return '오늘'
    if (days === 1) return '어제'
    if (days < 7) return `${days}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--dm-surface-modal)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.9)', maxHeight: '85vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-sky-300/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-sky-950 font-bold text-lg">휴지통</h2>
              <p className="text-sky-800 text-xs">{trashedNotes.length}개의 삭제된 노트</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {trashedNotes.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all"
              >
                휴지통 비우기
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sky-700 hover:text-sky-700 hover:bg-sky-100 transition-all text-xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 88px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <svg className="w-7 h-7 animate-spin text-sky-700 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sky-800 text-sm">불러오는 중...</p>
            </div>
          ) : trashedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-5xl mb-4">🗑️</div>
              <h3 className="text-sky-900 font-semibold mb-1">휴지통이 비어있습니다</h3>
              <p className="text-sky-800 text-sm">삭제된 노트가 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {trashedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-sky-300/50 hover:border-sky-200 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-xl flex-shrink-0">
                    {note.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sky-950 font-semibold text-sm truncate">{note.title}</p>
                      {note.is_locked && (
                        <svg className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {note.description && (
                        <p className="text-sky-800 text-xs truncate max-w-[200px]">{note.description}</p>
                      )}
                      <span className="text-sky-700 text-xs flex-shrink-0">
                        {note.deleted_at ? formatDeletedDate(note.deleted_at) : ''} 삭제
                      </span>
                    </div>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {note.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] text-sky-800 bg-sky-50 border border-sky-300/50 px-1.5 py-0.5 rounded-full">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(note)}
                      disabled={processing === note.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      복구
                    </button>
                    <button
                      onClick={() => setPermanentDeleteTarget(note)}
                      disabled={processing === note.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-all disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      영구삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Permanent delete confirm */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPermanentDeleteTarget(null)}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slide-up"
            style={{ background: 'var(--dm-surface-card)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.9)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-2xl mx-auto mb-3">
                ⚠️
              </div>
              <h3 className="text-sky-950 font-bold text-lg">영구 삭제</h3>
              <p className="text-sky-900 text-sm mt-2">
                <span className="font-semibold text-sky-900">"{permanentDeleteTarget.title}"</span> 노트를 영구 삭제하시겠습니까?<br />
                <span className="text-red-500 font-medium">이 작업은 되돌릴 수 없습니다.</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPermanentDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-sky-200 text-sky-700 font-semibold hover:bg-sky-50 transition-all text-sm"
              >
                취소
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={!!processing}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all text-sm disabled:opacity-60"
              >
                {processing ? '삭제 중...' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
