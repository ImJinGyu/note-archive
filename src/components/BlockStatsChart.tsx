'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { BlockType } from '@/lib/supabase'

interface Props {
  userId: string
}

interface BlockStat {
  type: BlockType
  count: number
}

const BLOCK_COLORS: Record<string, string> = {
  text:        '#38bdf8', // sky-400
  code:        '#a78bfa', // violet-400
  checklist:   '#34d399', // emerald-400
  tip:         '#fb923c', // orange-400
  steps:       '#60a5fa', // blue-400
  table:       '#4ade80', // green-400
  file:        '#facc15', // yellow-400
  keyword:     '#f472b6', // pink-400
  flow:        '#818cf8', // indigo-400
  featurelist: '#2dd4bf', // teal-400
  keyvalue:    '#fbbf24', // amber-400
  list:        '#86efac', // green-300
  credential:  '#fca5a5', // red-300
  license:     '#c4b5fd', // violet-300
  link:        '#7dd3fc', // sky-300
}

const BLOCK_LABELS: Record<string, string> = {
  text:        '텍스트',
  code:        '코드',
  checklist:   '체크리스트',
  tip:         '팁',
  steps:       '단계',
  table:       '테이블',
  file:        '파일',
  keyword:     '키워드',
  flow:        '흐름도',
  featurelist: '기능목록',
  keyvalue:    '키-값',
  list:        '리스트',
  credential:  '크리덴셜',
  license:     '라이선스',
  link:        '링크',
}

export default function BlockStatsChart({ userId }: Props) {
  const [stats, setStats] = useState<BlockStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      try {
        // 1차 시도: join 쿼리
        const { data, error } = await supabase
          .from('blocks')
          .select('type, tabs!inner(note_id, notes!inner(user_id))')
          .eq('tabs.notes.user_id', userId)

        if (!error && data) {
          const freq: Record<string, number> = {}
          data.forEach((row: { type: string }) => {
            freq[row.type] = (freq[row.type] || 0) + 1
          })
          setStats(
            Object.entries(freq)
              .map(([type, count]) => ({ type: type as BlockType, count }))
              .sort((a, b) => b.count - a.count)
          )
          setLoading(false)
          return
        }

        // 2차 시도: 순차 fetch
        const { data: notesData } = await supabase
          .from('notes')
          .select('id')
          .eq('user_id', userId)
          .is('deleted_at', null)

        if (!notesData || notesData.length === 0) {
          setStats([])
          setLoading(false)
          return
        }

        const noteIds = notesData.map((n: { id: string }) => n.id)

        const { data: tabsData } = await supabase
          .from('tabs')
          .select('id')
          .in('note_id', noteIds)

        if (!tabsData || tabsData.length === 0) {
          setStats([])
          setLoading(false)
          return
        }

        const tabIds = tabsData.map((t: { id: string }) => t.id)

        const { data: blocksData } = await supabase
          .from('blocks')
          .select('type')
          .in('tab_id', tabIds)

        if (!blocksData) {
          setStats([])
          setLoading(false)
          return
        }

        const freq2: Record<string, number> = {}
        blocksData.forEach((b: { type: string }) => {
          freq2[b.type] = (freq2[b.type] || 0) + 1
        })
        setStats(
          Object.entries(freq2)
            .map(([type, count]) => ({ type: type as BlockType, count }))
            .sort((a, b) => b.count - a.count)
        )
      } catch {
        setStats([])
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  const total = stats.reduce((s, b) => s + b.count, 0)

  // SVG 도넛 차트
  const SIZE = 120
  const STROKE = 18
  const R = (SIZE - STROKE) / 2
  const CIRC = 2 * Math.PI * R
  const CENTER = SIZE / 2

  let cumulativeAngle = -Math.PI / 2 // 12시 방향 시작

  const arcs = stats.map(stat => {
    const fraction = total > 0 ? stat.count / total : 0
    const angle = fraction * 2 * Math.PI
    const startAngle = cumulativeAngle
    cumulativeAngle += angle

    const x1 = CENTER + R * Math.cos(startAngle)
    const y1 = CENTER + R * Math.sin(startAngle)
    const x2 = CENTER + R * Math.cos(startAngle + angle)
    const y2 = CENTER + R * Math.sin(startAngle + angle)
    const largeArc = angle > Math.PI ? 1 : 0

    return {
      ...stat,
      d: `M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`,
      color: BLOCK_COLORS[stat.type] || '#94a3b8',
      fraction,
    }
  })

  const top3 = stats.slice(0, 3)

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
      <div className="mb-4">
        <p className="text-xs font-semibold text-sky-700 uppercase tracking-widest mb-0.5">Block Analytics</p>
        <h3 className="text-base font-bold text-sky-900">블록 타입 통계</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-8 h-8 border-2 border-sky-300 border-t-sky-600 rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center py-10 text-sky-400 text-sm">
          블록 데이터가 없습니다
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* 도넛 차트 */}
          <div className="relative flex-shrink-0">
            <svg width={SIZE} height={SIZE}>
              {/* 배경 원 */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={R}
                fill="none"
                stroke="rgba(186,230,253,0.4)"
                strokeWidth={STROKE}
              />
              {/* 각 섹터 */}
              {arcs.map((arc, i) => (
                <path
                  key={i}
                  d={arc.d}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={STROKE}
                  strokeLinecap="butt"
                  opacity={0.9}
                />
              ))}
            </svg>
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-extrabold text-sky-900 leading-none">{total}</span>
              <span className="text-[10px] text-sky-500 mt-0.5">블록</span>
            </div>
          </div>

          {/* 범례 + 요약 */}
          <div className="flex-1 min-w-0 w-full">
            {/* TOP3 요약 */}
            <div className="mb-3 px-3 py-2 rounded-xl" style={{ background: 'var(--dm-surface-subtle)', border: '1px solid var(--dm-border)' }}>
              <p className="text-[10px] font-semibold text-sky-600 mb-1.5">TOP 3 블록</p>
              <div className="flex gap-2 flex-wrap">
                {top3.map((s, i) => (
                  <span
                    key={s.type}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: BLOCK_COLORS[s.type] + '22', color: BLOCK_COLORS[s.type], border: `1px solid ${BLOCK_COLORS[s.type]}44` }}
                  >
                    {i + 1}. {BLOCK_LABELS[s.type] || s.type} ({s.count})
                  </span>
                ))}
              </div>
            </div>

            {/* 범례 목록 (스크롤) */}
            <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
              {stats.map(stat => {
                const pct = total > 0 ? Math.round(stat.count / total * 100) : 0
                return (
                  <div key={stat.type} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: BLOCK_COLORS[stat.type] || '#94a3b8' }}
                    />
                    <span className="text-xs text-sky-800 flex-1 min-w-0 truncate">
                      {BLOCK_LABELS[stat.type] || stat.type}
                    </span>
                    <span className="text-xs font-semibold text-sky-700 tabular-nums">{stat.count}</span>
                    <span className="text-[10px] text-sky-400 tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
