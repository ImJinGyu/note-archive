'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { CalendarEvent, EventColor } from '@/lib/supabase'
import EventModal from './EventModal'

const COLOR_STYLE: Record<EventColor, string> = {
  sky:     '#0ea5e9',
  violet:  '#8b5cf6',
  emerald: '#10b981',
  rose:    '#f43f5e',
  orange:  '#f97316',
  indigo:  '#6366f1',
}

const COLOR_DOT: Record<EventColor, string> = {
  sky:     'bg-sky-400',
  violet:  'bg-violet-400',
  emerald: 'bg-emerald-400',
  rose:    'bg-rose-400',
  orange:  'bg-orange-400',
  indigo:  'bg-indigo-400',
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_SLOTS = 3
const SLOT_HEIGHT = 22   // px per event slot
const DATE_ROW_H = 30    // px for date number row

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface PositionedEvent {
  event: CalendarEvent
  startCol: number   // 0–6 within this week
  endCol: number     // 0–6 within this week
  slot: number       // vertical stack index
  isStart: boolean   // event starts in this week
  isEnd: boolean     // event ends in this week
}

function positionWeekEvents(weekDates: Date[], events: CalendarEvent[]): PositionedEvent[] {
  const w0 = weekDates[0]
  const w6 = weekDates[6]
  const w0Str = toDateStr(w0.getFullYear(), w0.getMonth(), w0.getDate())
  const w6Str = toDateStr(w6.getFullYear(), w6.getMonth(), w6.getDate())

  const MS_DAY = 86400000

  // Events that overlap this week
  const relevant = events
    .filter(ev => {
      const evEnd = ev.end_date || ev.start_date
      return ev.start_date <= w6Str && evEnd >= w0Str
    })
    .sort((a, b) => {
      // Longer events first so they get lower slot numbers
      const aLen = new Date((a.end_date || a.start_date)).getTime() - new Date(a.start_date).getTime()
      const bLen = new Date((b.end_date || b.start_date)).getTime() - new Date(b.start_date).getTime()
      if (bLen !== aLen) return bLen - aLen
      return a.start_date.localeCompare(b.start_date)
    })

  const slots: { startCol: number; endCol: number }[][] = []
  const result: PositionedEvent[] = []

  for (const ev of relevant) {
    const evStart = new Date(ev.start_date + 'T00:00:00')
    const evEnd = new Date((ev.end_date || ev.start_date) + 'T00:00:00')
    const rawStart = Math.round((evStart.getTime() - w0.getTime()) / MS_DAY)
    const rawEnd   = Math.round((evEnd.getTime()   - w0.getTime()) / MS_DAY)
    const startCol = Math.max(0, rawStart)
    const endCol   = Math.min(6, rawEnd)

    // Find first free slot
    let slot = 0
    for (;;) {
      if (!slots[slot]) { slots[slot] = []; break }
      const conflict = slots[slot].some(r => !(r.endCol < startCol || r.startCol > endCol))
      if (!conflict) break
      slot++
    }
    if (!slots[slot]) slots[slot] = []
    slots[slot].push({ startCol, endCol })

    result.push({ event: ev, startCol, endCol, slot, isStart: rawStart >= 0, isEnd: rawEnd <= 6 })
  }

  return result
}

interface CalendarViewProps {
  userId: string
  initialOpen?: boolean
  onModalClose?: () => void
}

export default function CalendarView({ userId, initialOpen = false, onModalClose }: CalendarViewProps) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [events, setEvents]   = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; event: CalendarEvent | null; defaultDate?: string }>
    ({ open: initialOpen, event: null })

  useEffect(() => { if (initialOpen) setModal({ open: true, event: null }) }, [initialOpen])

  const firstDay = toDateStr(year, month, 1)
  const lastDay  = toDateStr(year, month, new Date(year, month + 1, 0).getDate())

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
    setEvents((data as CalendarEvent[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

  // Build 6-week grid
  const startOffset = new Date(year, month, 1).getDay()
  const weeks: Date[][] = Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => new Date(year, month, 1 - startOffset + w * 7 + d))
  )

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  const thisMonthEvents = events.filter(ev => ev.start_date >= firstDay && ev.start_date <= lastDay)

  const openCreate = (ds: string) => setModal({ open: true, event: null, defaultDate: ds })
  const openEdit   = (ev: CalendarEvent, e: React.MouseEvent) => { e.stopPropagation(); setModal({ open: true, event: ev }) }
  const closeModal = () => { setModal({ open: false, event: null }); onModalClose?.() }

  const formatTime      = (t: string | null) => t ? t.slice(0, 5) : ''
  const formatDateLabel = (ds: string) => {
    const d = new Date(ds + 'T00:00:00')
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`
  }

  const CELL_BORDER = '1px solid rgba(147,210,255,0.3)'
  const BG_IN    = 'rgba(255,255,255,0.72)'
  const BG_OUT   = 'rgba(224,240,255,0.38)'

  return (
    <div className="space-y-5">
      {/* ── Calendar card ── */}
      <div
        className="rounded-2xl overflow-hidden shadow-lg"
        style={{ background: 'rgba(230,245,255,0.95)', border: '1px solid rgba(147,210,255,0.5)', backdropFilter: 'blur(20px)' }}
      >
        {/* Navigation */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ background: 'rgba(186,230,253,0.7)', borderBottom: CELL_BORDER }}
        >
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-200/60 text-sky-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-lg font-bold text-sky-900 px-3 min-w-[130px] text-center select-none">{year}년 {month + 1}월</h2>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-sky-200/60 text-sky-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
          <button onClick={goToday} className="px-4 py-1.5 text-sm font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white transition-colors shadow-sm">오늘</button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7" style={{ background: 'rgba(214,238,255,0.8)', borderBottom: CELL_BORDER }}>
          {WEEKDAYS.map((day, i) => (
            <div key={day} className={`py-2.5 text-center text-xs font-bold tracking-wide ${i===0?'text-rose-500':i===6?'text-indigo-600':'text-sky-700'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid body */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-sky-700 text-sm">불러오는 중...</div>
        ) : (
          <div>
            {weeks.map((week, weekIdx) => {
              const positioned = positionWeekEvents(week, events)
              const maxSlot    = positioned.reduce((m, pe) => Math.max(m, pe.slot), -1)
              const slotCount  = Math.min(maxSlot + 1, MAX_SLOTS)
              const eventAreaH = slotCount * SLOT_HEIGHT + (slotCount > 0 ? 4 : 0)
              const rowH       = DATE_ROW_H + eventAreaH

              // +N hidden counts per day
              const hiddenCount: Record<number, number> = {}
              positioned.filter(pe => pe.slot >= MAX_SLOTS).forEach(pe => {
                for (let c = pe.startCol; c <= pe.endCol; c++)
                  hiddenCount[c] = (hiddenCount[c] ?? 0) + 1
              })

              return (
                <div
                  key={weekIdx}
                  className="relative grid grid-cols-7"
                  style={{
                    borderBottom: weekIdx < 5 ? CELL_BORDER : 'none',
                    height: `${rowH}px`,
                  }}
                >
                  {/* ── Column backgrounds + date numbers ── */}
                  {week.map((date, col) => {
                    const inMonth = date.getMonth() === month
                    const ds      = toDateStr(date.getFullYear(), date.getMonth(), date.getDate())
                    const isToday = ds === todayStr
                    return (
                      <div
                        key={col}
                        onClick={() => openCreate(ds)}
                        className="cursor-pointer group absolute"
                        style={{
                          top: 0, bottom: 0,
                          left:  `${col / 7 * 100}%`,
                          width: `${1 / 7 * 100}%`,
                          background: inMonth ? BG_IN : BG_OUT,
                          borderRight: col < 6 ? CELL_BORDER : 'none',
                        }}
                      >
                        {/* date number */}
                        <div className="flex justify-end pt-1 pr-1.5">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold select-none transition-colors ${
                            isToday    ? 'bg-sky-500 text-white shadow' :
                            !inMonth   ? 'text-sky-700' :
                            col === 0  ? 'text-rose-500' :
                            col === 6  ? 'text-indigo-600' :
                                         'text-sky-800'
                          }`}>
                            {date.getDate()}
                          </span>
                        </div>
                        {/* +N hidden */}
                        {hiddenCount[col] && (
                          <div
                            className="absolute text-[10px] font-bold text-sky-800 px-1 cursor-pointer"
                            style={{ bottom: 2, right: 4 }}
                          >
                            +{hiddenCount[col]}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ── Event bars (absolutely positioned) ── */}
                  {positioned.filter(pe => pe.slot < MAX_SLOTS).map(pe => {
                    const barLeft  = pe.startCol / 7 * 100
                    const barWidth = (pe.endCol - pe.startCol + 1) / 7 * 100
                    const gapL = pe.isStart ? 3 : 0
                    const gapR = pe.isEnd   ? 3 : 0
                    const radTL = pe.isStart ? 6 : 0
                    const radBL = pe.isStart ? 6 : 0
                    const radTR = pe.isEnd   ? 6 : 0
                    const radBR = pe.isEnd   ? 6 : 0

                    return (
                      <div
                        key={pe.event.id + '-' + weekIdx}
                        onClick={(e) => openEdit(pe.event, e)}
                        className="absolute flex items-center overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10"
                        style={{
                          top:    `${DATE_ROW_H + pe.slot * SLOT_HEIGHT + 2}px`,
                          height: `${SLOT_HEIGHT - 3}px`,
                          left:   `calc(${barLeft}% + ${gapL}px)`,
                          width:  `calc(${barWidth}% - ${gapL + gapR}px)`,
                          backgroundColor: COLOR_STYLE[pe.event.color],
                          borderRadius: `${radTL}px ${radTR}px ${radBR}px ${radBL}px`,
                          paddingLeft: 7,
                          paddingRight: 4,
                        }}
                        title={pe.event.title}
                      >
                        {/* Show title only when starts in this week or at week boundary */}
                        {(pe.isStart || pe.startCol === 0) && (
                          <span className="text-white text-[11px] font-semibold truncate leading-none select-none">
                            {!pe.event.all_day && pe.event.start_time && (
                              <span className="opacity-80 mr-1 text-[10px]">{formatTime(pe.event.start_time)}</span>
                            )}
                            {pe.event.title}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── This month event list ── */}
      {thisMonthEvents.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden shadow-md"
          style={{ background: 'rgba(230,245,255,0.95)', border: '1px solid rgba(147,210,255,0.4)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ background: 'rgba(186,230,253,0.7)', borderBottom: CELL_BORDER }}>
            <svg className="w-4 h-4 text-sky-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <h3 className="text-sm font-bold text-sky-800">{month + 1}월 일정 ({thisMonthEvents.length}개)</h3>
          </div>
          <div className="divide-y divide-sky-100/60">
            {thisMonthEvents.map(ev => (
              <button
                key={ev.id}
                onClick={() => setModal({ open: true, event: ev })}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-sky-50/60 transition-colors text-left group"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLOR_STYLE[ev.color] }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-sky-900">{ev.title}</span>
                    {ev.all_day ? (
                      <span className="text-[10px] bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded-full font-medium">종일</span>
                    ) : ev.start_time ? (
                      <span className="text-xs text-sky-800">{formatTime(ev.start_time)}{ev.end_time ? ` ~ ${formatTime(ev.end_time)}` : ''}</span>
                    ) : null}
                  </div>
                  <p className="text-xs text-sky-800 mt-0.5">
                    {formatDateLabel(ev.start_date)}
                    {ev.end_date && ev.end_date !== ev.start_date && ` ~ ${formatDateLabel(ev.end_date)}`}
                  </p>
                  {ev.description && <p className="text-xs text-sky-900/80 mt-0.5 truncate">{ev.description}</p>}
                </div>
                <svg className="w-4 h-4 text-sky-700 group-hover:text-sky-800 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && thisMonthEvents.length === 0 && (
        <div className="rounded-2xl py-10 text-center" style={{ background: 'rgba(230,245,255,0.7)', border: '1px solid rgba(147,210,255,0.3)' }}>
          <p className="text-sky-700 text-sm">이번 달 일정이 없습니다.</p>
          <p className="text-sky-700 text-xs mt-1">날짜를 클릭하거나 상단의 일정 추가 버튼을 눌러보세요.</p>
        </div>
      )}

      {/* EventModal */}
      {modal.open && (
        <EventModal
          event={modal.event}
          defaultDate={modal.defaultDate}
          userId={userId}
          onClose={closeModal}
          onSaved={fetchEvents}
          onDeleted={fetchEvents}
        />
      )}
    </div>
  )
}
