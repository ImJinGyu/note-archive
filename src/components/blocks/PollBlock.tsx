'use client'

import { useState, useEffect } from 'react'

export type PollContent = {
  question: string
  options: string[]
  multiSelect: boolean
}

interface PollBlockProps {
  content: PollContent
  isEditing: boolean
  onChange: (content: PollContent) => void
  blockId?: string
}

const STORAGE_PREFIX = 'note-archive-poll-'

export default function PollBlock({ content, isEditing, onChange, blockId }: PollBlockProps) {
  const [localQuestion, setLocalQuestion] = useState(content.question || '')
  const [localOptions, setLocalOptions] = useState<string[]>(content.options || [])
  const [localMultiSelect, setLocalMultiSelect] = useState(content.multiSelect || false)
  const [voted, setVoted] = useState<number[]>([])
  const [votes, setVotes] = useState<Record<number, number>>({})

  useEffect(() => {
    setLocalQuestion(content.question || '')
    setLocalOptions(content.options || [])
    setLocalMultiSelect(content.multiSelect || false)
  }, [content])

  // 투표 데이터 로드
  useEffect(() => {
    if (!blockId || isEditing) return
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${blockId}`)
      if (saved) {
        const parsed = JSON.parse(saved) as { voted: number[]; votes: Record<number, number> }
        setVoted(parsed.voted || [])
        setVotes(parsed.votes || {})
      }
    } catch {}
  }, [blockId, isEditing])

  const savePoll = (nextVoted: number[], nextVotes: Record<number, number>) => {
    if (!blockId) return
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${blockId}`, JSON.stringify({ voted: nextVoted, votes: nextVotes }))
    } catch {}
  }

  const handleVote = (index: number) => {
    let nextVoted: number[]
    if (localMultiSelect) {
      nextVoted = voted.includes(index) ? voted.filter((i) => i !== index) : [...voted, index]
    } else {
      nextVoted = voted.includes(index) ? [] : [index]
    }
    const nextVotes = { ...votes }
    // 기존 투표 취소
    voted.forEach((i) => {
      if (!nextVoted.includes(i)) {
        nextVotes[i] = Math.max(0, (nextVotes[i] || 0) - 1)
      }
    })
    // 새 투표 추가
    nextVoted.forEach((i) => {
      if (!voted.includes(i)) {
        nextVotes[i] = (nextVotes[i] || 0) + 1
      }
    })
    setVoted(nextVoted)
    setVotes(nextVotes)
    savePoll(nextVoted, nextVotes)
  }

  const handleReset = () => {
    const nextVotes = { ...votes }
    voted.forEach((i) => {
      nextVotes[i] = Math.max(0, (nextVotes[i] || 0) - 1)
    })
    setVoted([])
    setVotes(nextVotes)
    savePoll([], nextVotes)
  }

  const update = (question: string, options: string[], multiSelect: boolean) => {
    setLocalQuestion(question)
    setLocalOptions(options)
    setLocalMultiSelect(multiSelect)
    onChange({ question, options, multiSelect })
  }

  const addOption = () => update(localQuestion, [...localOptions, `옵션 ${localOptions.length + 1}`], localMultiSelect)
  const removeOption = (i: number) => update(localQuestion, localOptions.filter((_, idx) => idx !== i), localMultiSelect)
  const updateOption = (i: number, val: string) => update(localQuestion, localOptions.map((o, idx) => (idx === i ? val : o)), localMultiSelect)

  if (isEditing) {
    return (
      <div className="space-y-4">
        <input
          value={localQuestion}
          onChange={(e) => update(e.target.value, localOptions, localMultiSelect)}
          placeholder="질문을 입력하세요"
          className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 font-semibold outline-none focus:border-sky-400"
        />
        <div className="space-y-2">
          {localOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-sky-100 border border-sky-300 text-xs text-sky-700 font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`선택지 ${i + 1}`}
                className="flex-1 bg-white border border-sky-200 rounded px-2 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400"
              />
              <button
                onClick={() => removeOption(i)}
                className="text-sky-400 hover:text-red-400 transition-colors p-1 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addOption}
          className="w-full py-2 rounded-xl border-2 border-dashed border-sky-300 text-sky-700 text-sm hover:border-sky-400 transition-all"
        >
          + 선택지 추가
        </button>
        <label className="flex items-center gap-2 text-sm text-sky-800 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={localMultiSelect}
            onChange={(e) => update(localQuestion, localOptions, e.target.checked)}
            className="accent-sky-500 w-4 h-4"
          />
          복수 선택 허용
        </label>
      </div>
    )
  }

  const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <p className="text-sky-900 font-semibold text-base">{localQuestion || '질문 없음'}</p>
      {localMultiSelect && (
        <p className="text-xs text-sky-500">복수 선택 가능</p>
      )}
      <div className="space-y-2">
        {localOptions.map((opt, i) => {
          const count = votes[i] || 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isSelected = voted.includes(i)
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              className={`w-full text-left rounded-xl overflow-hidden border transition-all ${
                isSelected
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-sky-200 bg-white/60 hover:border-sky-300 hover:bg-sky-50/50'
              }`}
            >
              <div className="relative px-4 py-2.5">
                {/* 배경 막대 */}
                <div
                  className={`absolute inset-0 transition-all duration-500 ${isSelected ? 'bg-sky-200/60' : 'bg-sky-100/40'}`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-sky-500 bg-sky-500' : 'border-sky-300'}`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-sky-900 font-medium">{opt}</span>
                  </div>
                  <span className="text-xs text-sky-600 flex-shrink-0 font-medium">
                    {count}표 ({pct}%)
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-sky-500">총 {totalVotes}표</span>
        {voted.length > 0 && (
          <button
            onClick={handleReset}
            className="text-xs text-sky-400 hover:text-sky-600 transition-colors underline"
          >
            투표 취소
          </button>
        )}
      </div>
    </div>
  )
}
