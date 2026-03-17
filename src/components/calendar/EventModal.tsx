'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { CalendarEvent, EventColor } from '@/lib/supabase'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

/*
  SQL (Supabase에서 직접 실행):

  CREATE TABLE events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    color TEXT DEFAULT 'sky',
    all_day BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE events ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own events" ON events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
*/

const COLOR_OPTIONS: { value: EventColor; bg: string; label: string }[] = [
  { value: 'sky',     bg: 'bg-sky-500',     label: '하늘색' },
  { value: 'violet',  bg: 'bg-violet-500',  label: '보라색' },
  { value: 'emerald', bg: 'bg-emerald-500', label: '초록색' },
  { value: 'rose',    bg: 'bg-rose-500',    label: '분홍색' },
  { value: 'orange',  bg: 'bg-orange-500',  label: '주황색' },
  { value: 'indigo',  bg: 'bg-indigo-500',  label: '남색' },
]

interface EventModalProps {
  event: CalendarEvent | null      // null → 생성 모드
  defaultDate?: string             // 날짜 셀 클릭 시 기본 날짜 (YYYY-MM-DD)
  userId: string
  onClose: () => void
  onSaved: () => void
  onDeleted?: () => void
}

export default function EventModal({ event, defaultDate, userId, onClose, onSaved, onDeleted }: EventModalProps) {
  const isEdit = !!event

  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(event?.all_day ?? true)
  const [startDate, setStartDate] = useState(event?.start_date ?? defaultDate ?? '')
  const [endDate, setEndDate] = useState(event?.end_date ?? '')
  const [startTime, setStartTime] = useState(event?.start_time ?? '')
  const [endTime, setEndTime] = useState(event?.end_time ?? '')
  const [color, setColor] = useState<EventColor>(event?.color ?? 'sky')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!startDate) { setError('시작일을 입력해주세요.'); return }
    setSaving(true)
    setError('')

    const payload = {
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      all_day: allDay,
      start_date: startDate,
      end_date: endDate || null,
      start_time: (!allDay && startTime) ? startTime : null,
      end_time: (!allDay && endTime) ? endTime : null,
      color,
      updated_at: new Date().toISOString(),
    }

    let dbError
    if (isEdit && event) {
      const { error: e } = await supabase.from('events').update(payload).eq('id', event.id)
      dbError = e
    } else {
      const { error: e } = await supabase.from('events').insert({ ...payload, created_at: new Date().toISOString() })
      dbError = e
    }

    setSaving(false)
    if (dbError) { setError(dbError.message); return }
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!event) return
    setDeleting(true)
    await supabase.from('events').delete().eq('id', event.id)
    setDeleting(false)
    onDeleted?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-panel rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-sky-900">
            {isEdit ? '일정 수정' : '일정 추가'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/50 text-sky-800 hover:text-sky-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <label className="block text-xs font-semibold text-sky-700 mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목을 입력하세요"
              className="w-full bg-white/70 border border-sky-300/50 rounded-xl px-3 py-2 text-sky-900 placeholder-sky-400 text-sm outline-none focus:border-sky-500 focus:bg-white/90 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-xs font-semibold text-sky-700 mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="설명 (선택)"
              rows={2}
              className="w-full bg-white/70 border border-sky-300/50 rounded-xl px-3 py-2 text-sky-900 placeholder-sky-400 text-sm outline-none focus:border-sky-500 focus:bg-white/90 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all resize-none"
            />
          </div>

          {/* 종일 토글 */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-sky-700">종일</label>
            <button
              type="button"
              onClick={() => setAllDay(!allDay)}
              className={`relative w-10 h-5 rounded-full transition-all ${allDay ? 'bg-sky-500' : 'bg-sky-200'}`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${allDay ? 'left-5' : 'left-0.5'}`}
              />
            </button>
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-sky-700 mb-1">시작일 *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/70 border border-sky-300/50 rounded-xl px-3 py-2 text-sky-900 text-sm outline-none focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-sky-700 mb-1">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full bg-white/70 border border-sky-300/50 rounded-xl px-3 py-2 text-sky-900 text-sm outline-none focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all"
              />
            </div>
          </div>

          {/* 시간 (종일 아닐 때만) */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-sky-700 mb-1">시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-white/70 border border-sky-300/50 rounded-xl px-3 py-2 text-sky-900 text-sm outline-none focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sky-700 mb-1">종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white/70 border border-sky-300/50 rounded-xl px-3 py-2 text-sky-900 text-sm outline-none focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)] transition-all"
                />
              </div>
            </div>
          )}

          {/* 색상 */}
          <div>
            <label className="block text-xs font-semibold text-sky-700 mb-2">색상</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-sky-400 scale-110'
                      : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-rose-600 text-xs bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex items-center gap-2 mt-6">
          {isEdit && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="px-3 py-2 text-sm font-medium rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '삭제'}
            </button>
          )}
          <div className="flex-1" />
          <>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-xl border-2 border-sky-400 text-sky-800 bg-white/40 hover:bg-white/70 hover:border-sky-500 transition-all"
            >
              취소
            </button>
            <button
              onClick={() => { if (title.trim()) setConfirmSave(true) }}
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white transition-all shadow-md disabled:opacity-50"
            >
              {saving ? '저장 중...' : isEdit ? '수정' : '저장'}
            </button>
          </>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmSave}
        title={isEdit ? '일정 수정' : '일정 저장'}
        message={isEdit ? `"${title}" 일정을 수정하시겠습니까?` : `"${title}" 일정을 저장하시겠습니까?`}
        confirmLabel={isEdit ? '수정' : '저장'}
        cancelLabel="취소"
        variant="info"
        onConfirm={() => { setConfirmSave(false); handleSave() }}
        onCancel={() => setConfirmSave(false)}
      />
      <ConfirmDialog
        isOpen={confirmDelete}
        title="일정 삭제"
        message={`"${event?.title}" 일정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
