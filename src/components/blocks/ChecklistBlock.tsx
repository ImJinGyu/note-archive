'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChecklistContent, ChecklistItem } from '@/lib/supabase'

interface ChecklistBlockProps {
  content: ChecklistContent
  isEditing: boolean
  onChange: (content: ChecklistContent) => void
  noteId?: string
  noteTitle?: string
}

function getDueDateStatus(dateStr?: string): 'overdue' | 'today' | 'future' | null {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  if (due < today) return 'overdue'
  if (due.getTime() === today.getTime()) return 'today'
  return 'future'
}

const STATUS_STYLES = {
  overdue: 'bg-red-100 text-red-600 border-red-200',
  today:   'bg-orange-100 text-orange-600 border-orange-200',
  future:  'bg-sky-100 text-sky-600 border-sky-200',
}

export default function ChecklistBlock({ content, isEditing, onChange, noteId, noteTitle }: ChecklistBlockProps) {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(content.items || [])
  const [registering, setRegistering] = useState(false)
  const [registerMsg, setRegisterMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    setLocalItems(content.items || [])
  }, [content])

  const update = (items: ChecklistItem[]) => {
    setLocalItems(items)
    onChange({ items })
  }

  const addItem = () => update([...localItems, { text: '', checked: false }])

  const updateItem = (index: number, updated: Partial<ChecklistItem>) =>
    update(localItems.map((item, i) => i === index ? { ...item, ...updated } : item))

  const removeItem = (index: number) =>
    update(localItems.filter((_, i) => i !== index))

  const checkedCount = localItems.filter((i) => i.checked).length
  const progress = localItems.length > 0 ? Math.round((checkedCount / localItems.length) * 100) : 0

  const progressColor = progress === 100
    ? 'from-emerald-400 to-green-500'
    : progress >= 50
    ? 'from-sky-700 to-indigo-400'
    : 'from-sky-700 to-sky-800'

  const handleRegisterCalendar = async () => {
    if (!noteId) return
    const targets = localItems.filter(i => !i.checked && i.due_date)
    if (!targets.length) {
      setRegisterMsg({ type: 'err', text: '마감일이 있는 미완료 항목이 없습니다.' })
      setTimeout(() => setRegisterMsg(null), 3000)
      return
    }
    setRegistering(true)
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id ?? null
    const now = new Date().toISOString()
    const events = targets.map(item => {
      const status = getDueDateStatus(item.due_date)
      const color = status === 'overdue' ? 'rose' : status === 'today' ? 'orange' : 'sky'
      return {
        title: `[${noteTitle || '노트'}] ${item.text}`,
        description: item.sub || null,
        start_date: item.due_date!,
        end_date: null,
        start_time: null,
        end_time: null,
        color,
        all_day: true,
        user_id: userId,
        created_at: now,
      }
    })
    const { error } = await supabase.from('events').insert(events)
    setRegistering(false)
    if (error) {
      setRegisterMsg({ type: 'err', text: `등록 실패: ${error.message}` })
    } else {
      setRegisterMsg({ type: 'ok', text: `✅ ${events.length}개 항목이 캘린더에 등록됐습니다.` })
    }
    setTimeout(() => setRegisterMsg(null), 4000)
  }

  /* ── EDIT MODE ── */
  if (isEditing) {
    return (
      <div className="space-y-3">
        {localItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-sky-900">
              <span>{checkedCount}/{localItems.length} 완료</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="space-y-2">
          {localItems.map((item, index) => (
            <div key={index} className="space-y-1">
              {/* Main item */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateItem(index, { checked: !item.checked })}
                  className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                    item.checked ? 'bg-sky-500 border-sky-500' : 'border-sky-700 hover:border-sky-500'
                  }`}
                >
                  {item.checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateItem(index, { text: e.target.value })}
                  placeholder={`항목 ${index + 1}...`}
                  className={`flex-1 bg-sky-50/80 border border-sky-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400 transition-all ${
                    item.checked ? 'text-sky-700 line-through' : 'text-sky-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-sky-700 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Sub-description + due date */}
              <div className="flex items-center gap-2 pl-7">
                <span className="text-sky-700 text-xs flex-shrink-0">└</span>
                <input
                  type="text"
                  value={item.sub || ''}
                  onChange={(e) => updateItem(index, { sub: e.target.value })}
                  placeholder="추가 설명..."
                  className="flex-1 bg-white/60 border border-sky-200/70 rounded-lg px-3 py-1 text-xs text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-700"
                />
                <input
                  type="date"
                  value={item.due_date || ''}
                  onChange={(e) => updateItem(index, { due_date: e.target.value || undefined })}
                  className="bg-white/60 border border-sky-200/70 rounded-lg px-2 py-1 text-xs text-sky-900 outline-none focus:border-sky-400 transition-colors"
                  title="마감일"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 text-sm text-sky-800 hover:text-sky-700 transition-colors mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          항목 추가
        </button>
      </div>
    )
  }

  /* ── VIEW MODE ── */
  if (!localItems.length) {
    return (
      <div className="text-sky-700 text-sm italic py-4 text-center">
        체크리스트가 없습니다. 편집 모드에서 추가해주세요.
      </div>
    )
  }

  const hasDueItems = localItems.some(i => !i.checked && i.due_date)

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-sky-900">{checkedCount}/{localItems.length} 완료</span>
          <span className={progress === 100 ? 'text-emerald-500 font-medium' : 'text-sky-800 font-medium'}>
            {progress}%{progress === 100 && ' 🎉'}
          </span>
        </div>
        <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500 ease-out`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--dm-border)', background: 'var(--dm-surface-item)' }}>
        {localItems.map((item, index) => {
          const dueSt = getDueDateStatus(item.due_date)
          return (
            <div
              key={index}
              className="group"
              style={index < localItems.length - 1 ? { borderBottom: '1px solid var(--dm-border)' } : undefined}
            >
              <div
                onClick={() => updateItem(index, { checked: !item.checked })}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-sky-50/60 transition-colors"
              >
                <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all mt-0.5 ${
                  item.checked
                    ? 'bg-sky-500 border-sky-500 shadow-sm'
                    : 'border-sky-700 group-hover:border-sky-500'
                }`}>
                  {item.checked && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm leading-relaxed transition-all ${
                      item.checked ? 'text-sky-700 line-through' : 'text-sky-900'
                    }`}>
                      {item.text || <span className="text-sky-700 italic">빈 항목</span>}
                    </span>
                    {dueSt && !item.checked && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${STATUS_STYLES[dueSt]}`}>
                        {dueSt === 'overdue' ? '⚠ 마감 초과' : dueSt === 'today' ? '📅 오늘 마감' : `📅 ${item.due_date}`}
                      </span>
                    )}
                  </div>
                  {item.sub && (
                    <p className="text-xs text-sky-800 mt-0.5 leading-relaxed">{item.sub}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 캘린더 등록 버튼 */}
      {noteId && hasDueItems && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRegisterCalendar}
            disabled={registering}
            className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {registering ? '등록 중...' : '캘린더 등록'}
          </button>
          {registerMsg && (
            <span className={`text-xs ${registerMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
              {registerMsg.text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
