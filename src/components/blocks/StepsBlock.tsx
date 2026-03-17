'use client'

import { useState, useEffect } from 'react'
import { StepsContent, StepItem } from '@/lib/supabase'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'bash', 'sql', 'html', 'css', 'json', 'plaintext']

interface StepsBlockProps {
  content: StepsContent
  isEditing: boolean
  onChange: (content: StepsContent) => void
}

export default function StepsBlock({ content, isEditing, onChange }: StepsBlockProps) {
  const [localSteps, setLocalSteps] = useState<StepItem[]>(content.steps || [])
  const [expandedCode, setExpandedCode] = useState<number | null>(null)

  useEffect(() => {
    setLocalSteps(content.steps || [])
  }, [content])

  const updateSteps = (steps: StepItem[]) => {
    setLocalSteps(steps)
    onChange({ steps })
  }

  const addStep = () => {
    updateSteps([...localSteps, { title: '', description: '', code: '', language: 'bash' }])
  }

  const updateStep = (index: number, updated: Partial<StepItem>) => {
    updateSteps(localSteps.map((s, i) => i === index ? { ...s, ...updated } : s))
  }

  const removeStep = (index: number) => {
    updateSteps(localSteps.filter((_, i) => i !== index))
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        {localSteps.map((step, index) => (
          <div key={index} className="bg-sky-50/80 border border-sky-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-xs text-sky-600 font-medium">단계 {index + 1}</span>
              </span>
              <button
                type="button"
                onClick={() => removeStep(index)}
                className="text-sky-400 hover:text-red-400 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              value={step.title}
              onChange={(e) => updateStep(index, { title: e.target.value })}
              placeholder="단계 제목..."
              className="w-full bg-white/80 border border-sky-200 rounded-lg px-3 py-2 text-sky-900 placeholder-sky-300 text-sm outline-none focus:border-sky-400 transition-all font-medium"
            />
            <textarea
              value={step.description}
              onChange={(e) => updateStep(index, { description: e.target.value })}
              placeholder="설명 (선택사항)..."
              rows={2}
              className="w-full bg-white/80 border border-sky-200 rounded-lg px-3 py-2 text-sky-900 placeholder-sky-300 text-sm outline-none resize-none focus:border-sky-400 transition-all"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-sky-600">코드 (선택사항):</label>
                <select
                  value={step.language || 'bash'}
                  onChange={(e) => updateStep(index, { language: e.target.value })}
                  className="bg-sky-100/80 border border-sky-200 rounded px-2 py-1 text-sky-900 text-xs outline-none focus:border-sky-400 transition-all cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={step.code || ''}
                onChange={(e) => updateStep(index, { code: e.target.value })}
                placeholder="# 코드 (선택사항)..."
                rows={3}
                className="code-input w-full bg-white/80 border border-sky-200 rounded-lg px-3 py-2 text-sky-900 placeholder-sky-300 text-xs outline-none resize-y focus:border-sky-400 transition-all"
                spellCheck={false}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-2 text-sm text-sky-500 hover:text-sky-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          단계 추가
        </button>
      </div>
    )
  }

  if (!localSteps.length) {
    return (
      <div className="text-sky-400 text-sm italic py-4 text-center">
        단계가 없습니다. 편집 모드에서 추가해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {localSteps.map((step, index) => (
        <div key={index} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
              {index + 1}
            </div>
            {index < localSteps.length - 1 && (
              <div className="w-0.5 flex-1 bg-gradient-to-b from-sky-300 to-transparent mt-2 min-h-[24px]" />
            )}
          </div>
          <div className="flex-1 pb-4">
            {step.title && (
              <h4 className="text-sky-950 font-semibold mb-1 text-base">{step.title}</h4>
            )}
            {step.description && (
              <p className="text-sky-600 text-sm mb-2 leading-relaxed">{step.description}</p>
            )}
            {step.code && (
              <div className="rounded-lg overflow-hidden border border-sky-200">
                <div className="flex items-center justify-between bg-sky-100/80 px-3 py-1.5 border-b border-sky-200">
                  <span className="text-xs text-sky-600 uppercase tracking-wider">{step.language || 'bash'}</span>
                  <button
                    onClick={() => setExpandedCode(expandedCode === index ? null : index)}
                    className="text-xs text-sky-600 hover:text-sky-800 transition-colors"
                  >
                    {expandedCode === index ? '접기' : '펼치기'}
                  </button>
                </div>
                <SyntaxHighlighter
                  language={step.language || 'bash'}
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, background: '#0d1117', fontSize: '0.8rem', maxHeight: expandedCode === index ? 'none' : '120px', overflow: 'auto' }}
                >
                  {step.code}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
