'use client'

import { useMemo, useState } from 'react'
import type { Note } from '@/lib/supabase'

interface Props {
  notes: Note[]
}

export default function ContributionGraph({ notes }: Props) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null)

  const { dayCounts, activeDays, totalEdits, weeks, yearStart } = useMemo(() => {
    // 364일(52주) 기준 — 오늘 포함
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 364일 전 (52주 * 7일)
    const start = new Date(today)
    start.setDate(start.getDate() - 363)

    // 이번 연도 1월 1일
    const yearStart = new Date(today.getFullYear(), 0, 1)

    // 날짜별 카운트 집계 (updated_at 기준)
    const dayCounts: Record<string, number> = {}
    notes.forEach(note => {
      const d = new Date(note.updated_at)
      d.setHours(0, 0, 0, 0)
      if (d >= start && d <= today) {
        const key = d.toISOString().slice(0, 10)
        dayCounts[key] = (dayCounts[key] || 0) + 1
      }
    })

    // 올해 활동 통계
    let activeDays = 0
    let totalEdits = 0
    Object.entries(dayCounts).forEach(([dateStr, cnt]) => {
      const d = new Date(dateStr)
      if (d >= yearStart) {
        if (cnt > 0) activeDays++
        totalEdits += cnt
      }
    })

    // 52주 배열 생성 (각 주는 7일 배열, 일요일~토요일)
    // start를 직전 일요일로 맞춤
    const gridStart = new Date(start)
    const dow = gridStart.getDay() // 0=일, 6=토
    gridStart.setDate(gridStart.getDate() - dow)

    const weeks: Array<Array<{ date: string; count: number } | null>> = []
    const cursor = new Date(gridStart)
    while (cursor <= today) {
      const week: Array<{ date: string; count: number } | null> = []
      for (let d = 0; d < 7; d++) {
        const c = new Date(cursor)
        c.setDate(c.getDate() + d)
        if (c > today || c < start) {
          week.push(null)
        } else {
          const key = c.toISOString().slice(0, 10)
          week.push({ date: key, count: dayCounts[key] || 0 })
        }
      }
      weeks.push(week)
      cursor.setDate(cursor.getDate() + 7)
    }

    return { dayCounts, activeDays, totalEdits, weeks, yearStart }
  }, [notes])

  const cellColor = (count: number) => {
    if (count === 0) return 'bg-transparent border border-sky-100'
    if (count === 1) return 'bg-sky-100'
    if (count === 2) return 'bg-sky-300'
    if (count === 3) return 'bg-sky-500'
    return 'bg-sky-700'
  }

  const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

  // 월 라벨: 각 주의 첫 날(일요일)이 해당 월의 1일 이후 처음 등장하는 위치에 표시
  const monthLabels = useMemo(() => {
    const labels: Array<{ weekIdx: number; label: string }> = []
    let lastMonth = -1
    weeks.forEach((week, wi) => {
      const firstCell = week.find(c => c !== null)
      if (!firstCell) return
      const d = new Date(firstCell.date)
      const m = d.getMonth()
      if (m !== lastMonth) {
        labels.push({ weekIdx: wi, label: `${m + 1}월` })
        lastMonth = m
      }
    })
    return labels
  }, [weeks])

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--dm-surface-panel)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--dm-border)',
        boxShadow: '0 4px 32px rgba(0,80,160,0.14)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-widest mb-0.5">Writing Activity</p>
          <h3 className="text-base font-bold text-sky-900">글쓰기 잔디</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-sky-600">
            올해 <span className="font-bold text-sky-800">{activeDays}일</span> 활동,{' '}
            <span className="font-bold text-sky-800">{totalEdits}개</span> 수정
          </p>
        </div>
      </div>

      {/* 그래프 */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* 월 라벨 행 */}
          <div className="flex mb-1 ml-6">
            {weeks.map((_, wi) => {
              const label = monthLabels.find(l => l.weekIdx === wi)
              return (
                <div key={wi} className="w-3 mr-0.5 flex-shrink-0">
                  {label && (
                    <span className="text-[9px] text-sky-500 font-medium whitespace-nowrap">{label.label}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 요일 라벨 + 셀 */}
          <div className="flex gap-0">
            {/* 요일 라벨 */}
            <div className="flex flex-col gap-0.5 mr-1.5">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="w-4 h-3 flex items-center justify-end">
                  {(i % 2 === 0) && (
                    <span className="text-[9px] text-sky-400 font-medium">{label}</span>
                  )}
                </div>
              ))}
            </div>

            {/* 주 컬럼들 */}
            <div className="flex gap-0.5">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-0.5">
                  {week.map((cell, di) => {
                    if (!cell) {
                      return <div key={di} className="w-3 h-3 rounded-sm opacity-0" />
                    }
                    return (
                      <div
                        key={di}
                        className={`w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125 ${cellColor(cell.count)}`}
                        onMouseEnter={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setTooltip({
                            date: cell.date,
                            count: cell.count,
                            x: rect.left + rect.width / 2,
                            y: rect.top - 8,
                          })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 색상 범례 */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px] text-sky-400">적음</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            className={`w-3 h-3 rounded-sm ${cellColor(level)}`}
          />
        ))}
        <span className="text-[10px] text-sky-400">많음</span>
      </div>

      {/* 툴팁 (fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg text-xs font-medium pointer-events-none shadow-lg"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(7,89,133,0.95)',
            color: '#e0f2fe',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(56,189,248,0.3)',
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip.date} · {tooltip.count}개 수정
        </div>
      )}
    </div>
  )
}
