'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export type TimerContent = {
  focusMinutes: number
  breakMinutes: number
  label: string
}

interface TimerBlockProps {
  content: TimerContent
  isEditing: boolean
  onChange: (content: TimerContent) => void
}

type Phase = 'focus' | 'break'

const RADIUS = 54
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function TimerBlock({ content, isEditing, onChange }: TimerBlockProps) {
  const [localContent, setLocalContent] = useState<TimerContent>({
    focusMinutes: content.focusMinutes ?? 25,
    breakMinutes: content.breakMinutes ?? 5,
    label: content.label ?? '집중',
  })

  // 타이머 상태 (편집과 무관하게 유지)
  const [phase, setPhase] = useState<Phase>('focus')
  const [remaining, setRemaining] = useState(localContent.focusMinutes * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifyPermRef = useRef<NotificationPermission>('default')

  useEffect(() => {
    setLocalContent({
      focusMinutes: content.focusMinutes ?? 25,
      breakMinutes: content.breakMinutes ?? 5,
      label: content.label ?? '집중',
    })
  }, [content])

  // content 변경 시 타이머 리셋 (설정 저장 후 반영)
  const totalSeconds = phase === 'focus'
    ? localContent.focusMinutes * 60
    : localContent.breakMinutes * 60

  const requestNotifyPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'granted') {
      notifyPermRef.current = 'granted'
      return
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      notifyPermRef.current = result
    } else {
      notifyPermRef.current = 'denied'
    }
  }, [])

  const sendNotification = useCallback((title: string, body: string) => {
    if (notifyPermRef.current === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' })
      } catch {}
    }
  }, [])

  const handlePhaseComplete = useCallback((completedPhase: Phase) => {
    if (completedPhase === 'focus') {
      setSessions((s) => s + 1)
      sendNotification('집중 완료!', `${localContent.label} 세션이 끝났습니다. 휴식 시간입니다.`)
      setPhase('break')
      setRemaining(localContent.breakMinutes * 60)
    } else {
      sendNotification('휴식 완료!', '다시 집중할 시간입니다.')
      setPhase('focus')
      setRemaining(localContent.focusMinutes * 60)
    }
    setRunning(false)
  }, [localContent, sendNotification])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            // phase complete will be handled by the effect below
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [running])

  // Detect when remaining hits 0 while running
  useEffect(() => {
    if (remaining === 0 && !running && intervalRef.current === null) {
      // Only trigger if we were previously running (check sessions changed or phase)
      // We use a flag approach: if remaining is 0 it means timer just finished
      // This fires once after interval clears
    }
  }, [remaining, running])

  // Better approach: track if timer reached zero
  const prevRunning = useRef(false)
  useEffect(() => {
    if (prevRunning.current && !running && remaining === 0) {
      handlePhaseComplete(phase)
    }
    prevRunning.current = running
  })

  const start = async () => {
    await requestNotifyPermission()
    setRunning(true)
  }

  const pause = () => setRunning(false)

  const reset = () => {
    setRunning(false)
    setPhase('focus')
    setRemaining(localContent.focusMinutes * 60)
    setSessions(0)
  }

  const update = (partial: Partial<TimerContent>) => {
    const next = { ...localContent, ...partial }
    setLocalContent(next)
    onChange(next)
    // 타이머 리셋
    setRunning(false)
    setPhase('focus')
    setRemaining((partial.focusMinutes ?? next.focusMinutes) * 60)
    setSessions(0)
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 1
  const dashOffset = CIRCUMFERENCE * (1 - progress)

  const phaseLabel = phase === 'focus' ? localContent.label || '집중' : '휴식'
  const phaseColor = phase === 'focus' ? '#0ea5e9' : '#34d399'

  if (isEditing) {
    return (
      <div className="space-y-4">
        {/* 설정 영역 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-sky-600 font-medium mb-1">집중 시간 (분)</label>
            <input
              type="number"
              min={1}
              max={120}
              value={localContent.focusMinutes}
              onChange={(e) => update({ focusMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-white/70 text-sky-900 text-sm outline-none focus:border-sky-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-sky-600 font-medium mb-1">휴식 시간 (분)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={localContent.breakMinutes}
              onChange={(e) => update({ breakMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-white/70 text-sky-900 text-sm outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-sky-600 font-medium mb-1">라벨</label>
          <input
            type="text"
            value={localContent.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="집중, 공부, 독서 등"
            className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-white/70 text-sky-900 text-sm outline-none focus:border-sky-400 transition-colors"
          />
        </div>

        {/* 미리보기용 타이머 인터페이스 */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <p className="text-xs text-sky-500 mb-3 font-medium">미리보기</p>
          <TimerDisplay
            timeStr={timeStr}
            phaseLabel={phaseLabel}
            phaseColor={phaseColor}
            dashOffset={dashOffset}
            sessions={sessions}
            running={running}
            onStart={start}
            onPause={pause}
            onReset={reset}
          />
        </div>
      </div>
    )
  }

  // 뷰 모드: 타이머 인터페이스
  return (
    <TimerDisplay
      timeStr={timeStr}
      phaseLabel={phaseLabel}
      phaseColor={phaseColor}
      dashOffset={dashOffset}
      sessions={sessions}
      running={running}
      onStart={start}
      onPause={pause}
      onReset={reset}
    />
  )
}

// 분리된 타이머 UI 컴포넌트
function TimerDisplay({
  timeStr,
  phaseLabel,
  phaseColor,
  dashOffset,
  sessions,
  running,
  onStart,
  onPause,
  onReset,
}: {
  timeStr: string
  phaseLabel: string
  phaseColor: string
  dashOffset: number
  sessions: number
  running: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
}) {
  const SIZE = 140

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* 페이즈 레이블 */}
      <div
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: `${phaseColor}20`, color: phaseColor }}
      >
        {phaseLabel}
      </div>

      {/* 원형 프로그레스 + 시간 */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90" style={{ display: 'block' }}>
          {/* 배경 원 */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(186,230,253,0.5)"
            strokeWidth={10}
          />
          {/* 진행 원 */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={phaseColor}
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        {/* 시간 텍스트 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-sky-900 tabular-nums">{timeStr}</span>
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center gap-3">
        {running ? (
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-100 border border-sky-200 text-sky-700 text-sm font-medium hover:bg-sky-200 transition-all"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
            일시정지
          </button>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all shadow-sm hover:opacity-90"
            style={{ backgroundColor: phaseColor }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            시작
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          title="리셋"
          className="p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-500 hover:text-sky-700 hover:bg-sky-100 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 완료 세션 수 */}
      {sessions > 0 && (
        <p className="text-xs text-sky-500">
          완료 세션: <span className="font-semibold text-sky-700">{sessions}</span>회
        </p>
      )}
    </div>
  )
}
