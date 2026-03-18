'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Note, Tab, Block } from '@/lib/supabase'

interface MergeModalProps {
  currentNoteId: string
  onClose: () => void
  onMerged: () => void
}

export default function MergeModal({ currentNoteId, onClose, onMerged }: MergeModalProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [deleteOriginal, setDeleteOriginal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const fetchNotes = async () => {
      const { data } = await supabase
        .from('notes')
        .select('*')
        .is('deleted_at', null)
        .neq('id', currentNoteId)
        .order('updated_at', { ascending: false })
      if (data) setNotes(data)
      setLoading(false)
    }
    fetchNotes()
  }, [currentNoteId])

  const handleMerge = async () => {
    if (!selectedNote) return
    setMerging(true)

    // 선택한 노트의 탭 fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sourceTabsRaw } = await (supabase as any)
      .from('tabs')
      .select('*')
      .eq('note_id', selectedNote.id)
      .order('order_index')
    const sourceTabs = (sourceTabsRaw ?? []) as Tab[]

    if (sourceTabs.length > 0) {
      // 현재 노트의 기존 탭 수 파악 (새 탭 order_index 결정)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingTabsRaw } = await (supabase as any)
        .from('tabs')
        .select('order_index')
        .eq('note_id', currentNoteId)
        .order('order_index', { ascending: false })
        .limit(1)
      const existingTabs = (existingTabsRaw ?? []) as Pick<Tab, 'order_index'>[]

      let nextOrderIndex = existingTabs.length > 0
        ? existingTabs[0].order_index + 1
        : 0

      for (const sourceTab of sourceTabs) {
        // 현재 노트에 새 탭 생성
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newTabRaw } = await (supabase as any)
          .from('tabs')
          .insert({
            note_id: currentNoteId,
            name: sourceTab.name,
            order_index: nextOrderIndex,
          })
          .select()
          .single()
        const newTab = newTabRaw as Tab | null

        if (newTab) {
          // 원본 탭의 블록 fetch
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: sourceBlocksRaw } = await (supabase as any)
            .from('blocks')
            .select('*')
            .eq('tab_id', sourceTab.id)
            .order('order_index')
          const sourceBlocks = (sourceBlocksRaw ?? []) as Block[]

          if (sourceBlocks.length > 0) {
            // 새 탭에 블록 복사
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('blocks').insert(
              sourceBlocks.map((b) => ({
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

        nextOrderIndex++
      }
    }

    // 원본 삭제 옵션
    if (deleteOriginal) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('notes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', selectedNote.id)
    }

    setMerging(false)
    onMerged()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl"
        style={{
          background: 'var(--dm-surface-modal)',
          backdropFilter: 'blur(24px)',
          border: '1px solid var(--dm-border)',
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-sky-200/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔀</span>
            <h2 className="text-sky-950 font-bold text-lg">노트 병합</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-400 hover:text-sky-700 hover:bg-sky-100 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4">
          {!confirmed ? (
            <>
              <p className="text-xs text-sky-600 mb-3">
                선택한 노트의 탭과 블록이 현재 노트에 추가됩니다.
              </p>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <svg className="w-6 h-6 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-10 text-sky-500 text-sm">병합할 수 있는 다른 노트가 없습니다.</div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                        selectedNote?.id === note.id
                          ? 'bg-sky-100/80 border-sky-400 shadow-sm'
                          : 'border-transparent hover:border-sky-200'
                      }`}
                    >
                      <span className="text-xl flex-shrink-0">{note.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sky-950 font-medium text-sm truncate">{note.title}</p>
                        {note.description && (
                          <p className="text-sky-500 text-xs truncate">{note.description}</p>
                        )}
                      </div>
                      {note.is_locked && (
                        <svg className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {selectedNote?.id === note.id && (
                        <svg className="w-4 h-4 text-sky-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* 원본 처리 */}
              {selectedNote && (
                <div className="mt-4 p-3 rounded-xl border border-sky-200/60" style={{ background: 'var(--dm-surface-subtle)' }}>
                  <p className="text-xs font-semibold text-sky-700 mb-2">원본 노트 처리</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteOriginal"
                        checked={!deleteOriginal}
                        onChange={() => setDeleteOriginal(false)}
                        className="accent-sky-500"
                      />
                      <span className="text-sm text-sky-800">원본 유지</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteOriginal"
                        checked={deleteOriginal}
                        onChange={() => setDeleteOriginal(true)}
                        className="accent-sky-500"
                      />
                      <span className="text-sm text-sky-800">원본 삭제 (휴지통)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-sky-300 text-sky-800 text-sm font-medium hover:bg-sky-50 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => setConfirmed(true)}
                  disabled={!selectedNote}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  다음
                </button>
              </div>
            </>
          ) : (
            /* 최종 확인 */
            <>
              <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 mb-4">
                <p className="text-sm text-sky-800 font-medium mb-1">병합 확인</p>
                <p className="text-xs text-sky-600">
                  <span className="font-semibold">{selectedNote?.icon} {selectedNote?.title}</span>의
                  탭과 블록을 현재 노트에 추가합니다.
                  {deleteOriginal && ' 원본 노트는 휴지통으로 이동됩니다.'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmed(false)}
                  disabled={merging}
                  className="flex-1 py-2.5 rounded-xl border border-sky-300 text-sky-800 text-sm font-medium hover:bg-sky-50 transition-all disabled:opacity-50"
                >
                  뒤로
                </button>
                <button
                  onClick={handleMerge}
                  disabled={merging}
                  className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 transition-all disabled:opacity-70 shadow-sm flex items-center justify-center gap-2"
                >
                  {merging ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      병합 중...
                    </>
                  ) : '병합 확인'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
