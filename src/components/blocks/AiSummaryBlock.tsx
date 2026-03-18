'use client'

import { useState, useEffect } from 'react'

type AiSummaryContent = {
  summary: string
  lastGeneratedAt: string | null
  sourceBlockTypes: string[]
}

interface Props {
  content: AiSummaryContent
  isEditing: boolean
  onChange: (content: AiSummaryContent) => void
  // 같은 탭의 텍스트 블록 내용을 외부에서 주입
  tabTextContent?: string
}

export default function AiSummaryBlock({ content, isEditing, onChange, tabTextContent }: Props) {
  const [local, setLocal] = useState<AiSummaryContent>(content)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setLocal(content) }, [content])

  const update = (next: AiSummaryContent) => {
    setLocal(next)
    onChange(next)
  }

  const handleGenerate = async () => {
    const text = tabTextContent || local.summary
    if (!text?.trim()) {
      setError('요약할 텍스트 블록이 없습니다. 같은 탭에 텍스트 블록을 추가하세요.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const { summary } = await res.json()
      const next: AiSummaryContent = {
        summary,
        lastGeneratedAt: new Date().toISOString(),
        sourceBlockTypes: local.sourceBlockTypes,
      }
      update(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : '요약 생성 실패')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return null
    const d = new Date(iso)
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-200/60 text-xs text-violet-700">
          <p className="font-semibold mb-1">AI 요약 블록</p>
          <p>같은 탭의 텍스트/코드 블록 내용을 바탕으로 AI가 요약을 생성합니다.</p>
          <p className="mt-1">API 키는 <code className="bg-violet-100 px-1 rounded">.env.local</code>의 <code className="bg-violet-100 px-1 rounded">GEMINI_API_KEY</code>를 사용합니다. (Google AI Studio 무료)</p>
        </div>
        {local.summary && (
          <div className="p-3 rounded-xl bg-white/70 border border-sky-200/60 text-sm text-sky-900 whitespace-pre-wrap">
            {local.summary}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {local.summary ? (
        <div className="relative">
          <div className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="pl-6 pr-3 py-3 rounded-xl bg-gradient-to-br from-violet-50/80 to-purple-50/60 border border-violet-200/60">
            <p className="text-sm text-sky-900 whitespace-pre-wrap leading-relaxed">{local.summary}</p>
            {local.lastGeneratedAt && (
              <p className="text-[10px] text-violet-400 mt-2">마지막 생성: {formatDate(local.lastGeneratedAt)}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="text-3xl mb-2">🤖</div>
          <p className="text-sm text-sky-600 mb-1">AI 요약이 아직 생성되지 않았습니다</p>
          <p className="text-xs text-sky-400">아래 버튼을 클릭해 요약을 생성하세요</p>
        </div>
      )}

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">{error}</div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-400 hover:to-purple-500 disabled:opacity-60 transition-all shadow-sm"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            요약 생성 중...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {local.summary ? 'AI 재요약' : 'AI 요약 생성'}
          </>
        )}
      </button>
    </div>
  )
}
