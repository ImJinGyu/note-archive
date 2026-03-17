'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Block, Note, Tab } from '@/lib/supabase'

interface Props {
  block: Block
  currentNoteId: string
  onClose: () => void
  onMoved: (blockId: string) => void   // block removed from current tab (move)
  onCopied: () => void                 // block stays (copy)
}

export default function BlockTransferModal({ block, currentNoteId, onClose, onMoved, onCopied }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string>('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [selectedTabId, setSelectedTabId] = useState<string>('')
  const [mode, setMode] = useState<'copy' | 'move'>('copy')
  const [loading, setLoading] = useState(true)
  const [tabsLoading, setTabsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Fetch all notes
  useEffect(() => {
    supabase
      .from('notes')
      .select('id, icon, title')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        setNotes((data ?? []) as Note[])
        setLoading(false)
      })
  }, [])

  // Fetch tabs when note selected
  useEffect(() => {
    if (!selectedNoteId) { setTabs([]); setSelectedTabId(''); return }
    setTabsLoading(true)
    supabase
      .from('tabs')
      .select('*')
      .eq('note_id', selectedNoteId)
      .order('order_index', { ascending: true })
      .then(({ data }) => {
        const tabList = (data ?? []) as Tab[]
        setTabs(tabList)
        setSelectedTabId(tabList[0]?.id ?? '')
        setTabsLoading(false)
      })
  }, [selectedNoteId])

  // Escape key
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  const handleConfirm = async () => {
    if (!selectedNoteId || !selectedTabId) { setError('노트와 탭을 선택해주세요.'); return }
    setSaving(true)
    setError('')

    // Get max order_index of target tab
    const { data: targetBlocks } = await supabase
      .from('blocks')
      .select('order_index')
      .eq('tab_id', selectedTabId)
      .order('order_index', { ascending: false })
      .limit(1)

    const newOrder = targetBlocks?.length ? (targetBlocks[0].order_index as number) + 1 : 0

    // Insert block into target tab
    const { error: insertErr } = await supabase.from('blocks').insert({
      tab_id: selectedTabId,
      type: block.type,
      title: block.title,
      show_title: block.show_title,
      content: block.content,
      order_index: newOrder,
    })

    if (insertErr) { setError(insertErr.message); setSaving(false); return }

    if (mode === 'move') {
      // Delete original block
      await supabase.from('blocks').delete().eq('id', block.id)
      onMoved(block.id)
    } else {
      onCopied()
    }
    onClose()
  }

  const otherNotes = notes.filter(n => n.id !== currentNoteId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-sky-900">블록 복사 / 이동</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/50 text-sky-500 hover:text-sky-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 복사 / 이동 선택 */}
          <div>
            <p className="text-xs font-semibold text-sky-700 mb-2">작업 선택</p>
            <div className="grid grid-cols-2 gap-2">
              {(['copy', 'move'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    mode === m
                      ? 'bg-sky-500 border-sky-500 text-white shadow-md'
                      : 'border-sky-200 text-sky-700 bg-white/60 hover:border-sky-400'
                  }`}
                >
                  {m === 'copy' ? '📋 복사' : '✂️ 이동'}
                </button>
              ))}
            </div>
            <p className="text-xs text-sky-500 mt-1.5">
              {mode === 'copy' ? '원본 블록은 그대로 유지됩니다.' : '원본 블록은 삭제됩니다.'}
            </p>
          </div>

          {/* 노트 선택 */}
          <div>
            <p className="text-xs font-semibold text-sky-700 mb-2">대상 노트 선택</p>
            {loading ? (
              <div className="text-xs text-sky-500 py-3 text-center">불러오는 중...</div>
            ) : otherNotes.length === 0 ? (
              <div className="text-xs text-sky-500 py-3 text-center">다른 노트가 없습니다.</div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-sky-200/60 divide-y divide-sky-100" style={{ background: 'rgba(240,249,255,0.7)' }}>
                {otherNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedNoteId(note.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      selectedNoteId === note.id
                        ? 'bg-sky-100 text-sky-900'
                        : 'hover:bg-sky-50/70 text-sky-800'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{note.icon}</span>
                    <span className="text-sm font-medium truncate">{note.title}</span>
                    {selectedNoteId === note.id && (
                      <svg className="w-4 h-4 text-sky-500 flex-shrink-0 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 탭 선택 */}
          {selectedNoteId && (
            <div>
              <p className="text-xs font-semibold text-sky-700 mb-2">붙여넣을 탭 선택</p>
              {tabsLoading ? (
                <div className="text-xs text-sky-500 py-2 text-center">탭 불러오는 중...</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTabId(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                        selectedTabId === tab.id
                          ? 'bg-sky-500 border-sky-500 text-white'
                          : 'border-sky-200 text-sky-700 bg-white/60 hover:border-sky-400'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-semibold rounded-xl border-2 border-sky-400 text-sky-800 bg-white/40 hover:bg-white/70 transition-all"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !selectedNoteId || !selectedTabId}
            className="flex-1 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white transition-all shadow-md disabled:opacity-50"
          >
            {saving ? '처리 중...' : mode === 'copy' ? '복사하기' : '이동하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
