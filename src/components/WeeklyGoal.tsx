'use client'

import { useEffect, useState } from 'react'
import type { Note } from '@/lib/supabase'

interface Props {
  notes: Note[]
}

const STORAGE_KEY = 'note-archive-weekly-goal'

interface GoalData {
  target: number
  weekStart: string // ISO 'YYYY-MM-DD'
}

function getThisWeekStart(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const day = now.getDay() // 0=일
  now.setDate(now.getDate() - day) // 이번 주 일요일
  return now.toISOString().slice(0, 10)
}

export default function WeeklyGoal({ notes }: Props) {
  const [target, setTarget] = useState(5)
  const [inputVal, setInputVal] = useState('5')
  const [editing, setEditing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const weekStart = getThisWeekStart()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved: GoalData = JSON.parse(raw)
        if (saved.weekStart === weekStart) {
          // 같은 주 → 불러오기
          setTarget(saved.target)
          setInputVal(String(saved.target))
        } else {
          // 주가 바뀜 → 리셋
          const reset: GoalData = { target: saved.target, weekStart }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(reset))
          setTarget(saved.target)
          setInputVal(String(saved.target))
        }
      } else {
        // 최초 — 기본값 5
        const init: GoalData = { target: 5, weekStart }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(init))
      }
    } catch {}
  }, [])

  const saveTarget = (val: number) => {
    const clamped = Math.min(20, Math.max(1, val))
    setTarget(clamped)
    setInputVal(String(clamped))
    setEditing(false)
    try {
      const weekStart = getThisWeekStart()
      const data: GoalData = { target: clamped, weekStart }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {}
  }

  // 이번 주 수정 수 계산
  const weekStart = mounted ? getThisWeekStart() : ''
  const weekCount = notes.filter(n => {
    if (!weekStart) return false
    return new Date(n.updated_at) >= new Date(weekStart)
  }).length

  const progress = target > 0 ? Math.min(weekCount / target, 1) : 0
  const pct = Math.round(progress * 100)
  const achieved = weekCount >= target

  if (!mounted) return null

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--dm-surface-panel)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56,170,230,0.30)',
        boxShadow: '0 4px 32px rgba(0,80,160,0.14)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-widest mb-0.5">Weekly Goal</p>
          <h3 className="text-base font-bold text-sky-900">주간 목표</h3>
        </div>
        {achieved && (
          <span className="text-xl animate-bounce" title="목표 달성!">🎉</span>
        )}
      </div>

      {/* 목표 설정 */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-sky-600">이번 주 목표:</span>
        {editing ? (
          <input
            type="number"
            min={1}
            max={20}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={() => saveTarget(parseInt(inputVal) || target)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTarget(parseInt(inputVal) || target)
              if (e.key === 'Escape') { setInputVal(String(target)); setEditing(false) }
            }}
            autoFocus
            className="w-14 text-center text-sm font-bold text-sky-900 bg-white/70 border border-sky-300 rounded-lg px-2 py-1 outline-none focus:border-sky-500"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="px-2 py-1 rounded-lg text-sm font-bold text-sky-800 hover:bg-white/60 border border-transparent hover:border-sky-200 transition-all"
            title="클릭하여 목표 수정"
          >
            {target}개
          </button>
        )}
        <span className="text-xs text-sky-400">(1~20)</span>
      </div>

      {/* 진행률 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-sky-600">
            <span className="font-bold text-sky-800">{weekCount}</span> / {target}개 수정
          </span>
          <span className="text-xs font-bold text-sky-700">{pct}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(186,230,253,0.5)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: achieved
                ? 'linear-gradient(90deg, #34d399, #10b981)'
                : 'linear-gradient(90deg, #38bdf8, #0ea5e9)',
              boxShadow: achieved ? '0 0 8px rgba(52,211,153,0.4)' : '0 0 8px rgba(56,189,248,0.4)',
            }}
          />
        </div>
      </div>

      {/* 상태 메시지 */}
      {achieved ? (
        <p className="text-xs text-emerald-600 font-semibold text-center py-1">
          🎉 이번 주 목표를 달성했어요! 훌륭합니다!
        </p>
      ) : (
        <p className="text-xs text-sky-500 text-center">
          {target - weekCount > 0 ? `목표까지 ${target - weekCount}개 더 수정하면 달성!` : '거의 다 왔어요!'}
        </p>
      )}
    </div>
  )
}
