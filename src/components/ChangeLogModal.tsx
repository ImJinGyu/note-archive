'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type HistoryEntry = {
  id: string
  note_id: string
  message: string
  changed_at: string
}

/*
  Supabase SQL Editor에서 실행:

  CREATE TABLE IF NOT EXISTS note_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE note_history ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own history" ON note_history
    FOR ALL USING (
      note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    )
    WITH CHECK (
      note_id IN (SELECT id FROM notes WHERE user_id = auth.uid())
    );
*/

interface SaveReasonModalProps {
  onConfirm: (message: string) => void
  onCancel: () => void
}

export function SaveReasonModal({ onConfirm, onCancel }: SaveReasonModalProps) {
  const [msg, setMsg] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="glass-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
        <h2 className="text-base font-bold text-sky-900 mb-1">변경 사유 기록 (선택)</h2>
        <p className="text-xs text-sky-500 mb-3">무엇을 수정했는지 간단히 남겨보세요.</p>
        <input
          type="text"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="예: 체크리스트 항목 추가, 코드 수정..."
          className="w-full bg-white/75 border border-sky-300/60 rounded-xl px-4 py-2.5 text-sky-900 placeholder-sky-400 outline-none focus:border-sky-500 transition-all text-sm mb-4"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') onConfirm(msg) }}
          maxLength={200}
        />
        <div className="flex gap-3">
          <button
            onClick={() => onConfirm('')}
            className="flex-1 py-2.5 rounded-xl border-2 border-sky-200 text-sky-600 text-sm font-medium hover:bg-sky-50 transition-all"
          >
            건너뛰기
          </button>
          <button
            onClick={() => onConfirm(msg)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold hover:from-sky-400 hover:to-blue-500 transition-all"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

interface HistoryPanelProps {
  noteId: string
  onClose: () => void
}

export function HistoryPanel({ noteId, onClose }: HistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await (supabase as any)
        .from('note_history')
        .select('*')
        .eq('note_id', noteId)
        .order('changed_at', { ascending: false })
        .limit(30)
      setEntries(data ?? [])
      setLoading(false)
    })()
  }, [noteId])

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = (now.getTime() - d.getTime()) / 1000
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4 mb-4 sm:mb-0" style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-sky-900">변경 이력</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50 text-sky-500 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-2">
          {loading && <p className="text-sm text-sky-500 text-center py-4">불러오는 중...</p>}
          {!loading && entries.length === 0 && (
            <p className="text-sm text-sky-400 text-center py-8">저장된 이력이 없습니다.<br/>저장 시 변경 사유를 남겨보세요.</p>
          )}
          {entries.map(e => (
            <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/60 border border-sky-200/50">
              <div className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-sky-900 font-medium">{e.message || '(사유 없음)'}</p>
                <p className="text-xs text-sky-400 mt-0.5">{formatTime(e.changed_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export async function saveHistoryEntry(noteId: string, message: string): Promise<string | null> {
  const text = message.trim() || '저장됨'
  const { error } = await (supabase as any).from('note_history').insert({ note_id: noteId, message: text })
  if (error) {
    console.error('[변경이력 저장 실패]', error)
    return error.message
  }
  return null
}
