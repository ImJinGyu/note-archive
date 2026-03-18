'use client'

import { useState, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export type MathContent = {
  latex: string
  displayMode: boolean
}

interface MathBlockProps {
  content: MathContent
  isEditing: boolean
  onChange: (content: MathContent) => void
}

export default function MathBlock({ content, isEditing, onChange }: MathBlockProps) {
  const [localContent, setLocalContent] = useState<MathContent>({
    latex: content.latex ?? 'E = mc^2',
    displayMode: content.displayMode ?? true,
  })
  const [renderError, setRenderError] = useState<string | null>(null)
  const [rendered, setRendered] = useState<string>('')

  useEffect(() => {
    setLocalContent({
      latex: content.latex ?? 'E = mc^2',
      displayMode: content.displayMode ?? true,
    })
  }, [content])

  useEffect(() => {
    if (!localContent.latex.trim()) {
      setRendered('')
      setRenderError(null)
      return
    }
    try {
      const html = katex.renderToString(localContent.latex, {
        displayMode: localContent.displayMode,
        throwOnError: true,
        output: 'html',
      })
      setRendered(html)
      setRenderError(null)
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : '수식 렌더링 오류')
      setRendered('')
    }
  }, [localContent.latex, localContent.displayMode])

  const update = (partial: Partial<MathContent>) => {
    const next = { ...localContent, ...partial }
    setLocalContent(next)
    onChange(next)
  }

  const previewHtml = (() => {
    if (!localContent.latex.trim()) return ''
    try {
      return katex.renderToString(localContent.latex, {
        displayMode: localContent.displayMode,
        throwOnError: true,
        output: 'html',
      })
    } catch {
      return ''
    }
  })()

  if (isEditing) {
    return (
      <div className="space-y-3">
        {/* 모드 토글 */}
        <div className="flex items-center gap-3">
          <span className="text-sky-700 text-sm font-medium">표시 방식:</span>
          <button
            type="button"
            onClick={() => update({ displayMode: false })}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
              !localContent.displayMode
                ? 'bg-sky-500 text-white border-sky-500'
                : 'text-sky-600 border-sky-200 hover:bg-sky-50'
            }`}
          >
            인라인
          </button>
          <button
            type="button"
            onClick={() => update({ displayMode: true })}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
              localContent.displayMode
                ? 'bg-sky-500 text-white border-sky-500'
                : 'text-sky-600 border-sky-200 hover:bg-sky-50'
            }`}
          >
            블록
          </button>
        </div>

        {/* LaTeX 입력 */}
        <textarea
          value={localContent.latex}
          onChange={(e) => update({ latex: e.target.value })}
          placeholder="LaTeX 수식 입력 (예: E = mc^2, \frac{a}{b}, \sum_{i=0}^{n})"
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-white/70 text-sky-900 text-sm font-mono placeholder-sky-300 outline-none focus:border-sky-400 resize-y transition-colors"
        />

        {/* 미리보기 */}
        {localContent.latex.trim() && (
          <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3">
            <p className="text-xs text-sky-500 mb-2 font-medium">미리보기</p>
            {previewHtml ? (
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="overflow-x-auto"
              />
            ) : (
              <p className="text-red-500 text-xs italic">수식 오류, 입력을 확인해 주세요.</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // 뷰 모드
  if (!localContent.latex.trim()) {
    return (
      <div className="text-sky-700 text-sm italic py-4 text-center">
        수식이 없습니다. 편집 모드에서 LaTeX를 입력해주세요.
      </div>
    )
  }

  if (renderError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/60 p-4">
        <p className="text-red-600 text-sm font-medium mb-1">수식 렌더링 오류</p>
        <p className="text-red-500 text-xs font-mono">{renderError}</p>
        <p className="text-red-400 text-xs mt-2 italic">편집 모드에서 LaTeX 문법을 확인해주세요.</p>
      </div>
    )
  }

  return (
    <div
      className={`overflow-x-auto ${localContent.displayMode ? 'py-2 text-center' : 'inline'}`}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  )
}
