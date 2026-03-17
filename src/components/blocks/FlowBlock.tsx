'use client'

import { useState, useEffect } from 'react'
import { FlowContent, FlowStep } from '@/lib/supabase'

interface FlowBlockProps {
  content: FlowContent
  isEditing: boolean
  onChange: (content: FlowContent) => void
}

export default function FlowBlock({ content, isEditing, onChange }: FlowBlockProps) {
  const [localTitle, setLocalTitle] = useState(content.title || '')
  const [localSteps, setLocalSteps] = useState<FlowStep[]>(content.steps || [])

  useEffect(() => {
    setLocalTitle(content.title || '')
    setLocalSteps(content.steps || [])
  }, [content])

  const update = (title: string, steps: FlowStep[]) => {
    setLocalTitle(title)
    setLocalSteps(steps)
    onChange({ title, steps })
  }

  const updateStep = (index: number, field: keyof FlowStep, value: string | boolean) => {
    update(localTitle, localSteps.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const addStep = () =>
    update(localTitle, [...localSteps, { title: `단계 ${localSteps.length + 1}`, subtitle: '설명', active: false }])

  const removeStep = (index: number) =>
    update(localTitle, localSteps.filter((_, i) => i !== index))

  if (isEditing) {
    return (
      <div className="space-y-4">
        <input
          value={localTitle}
          onChange={(e) => update(e.target.value, localSteps)}
          placeholder="흐름도 제목 (예: 전체 자동 검사 흐름)"
          className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 font-semibold outline-none focus:border-sky-400 text-center"
        />
        <div className="space-y-2">
          {localSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 bg-sky-50/60 border border-sky-200 rounded-xl p-3">
              <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <input
                value={step.title}
                onChange={(e) => updateStep(index, 'title', e.target.value)}
                placeholder="단계 제목"
                className="flex-1 bg-white border border-sky-200 rounded px-2 py-1 text-sm text-sky-900 font-semibold outline-none focus:border-sky-400"
              />
              <input
                value={step.subtitle}
                onChange={(e) => updateStep(index, 'subtitle', e.target.value)}
                placeholder="부제목"
                className="flex-1 bg-white border border-sky-200 rounded px-2 py-1 text-sm text-sky-900 outline-none focus:border-sky-400"
              />
              <label className="flex items-center gap-1.5 text-xs text-sky-900 flex-shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={step.active || false}
                  onChange={(e) => updateStep(index, 'active', e.target.checked)}
                  className="accent-sky-500"
                />
                활성
              </label>
              <button onClick={() => removeStep(index)} className="text-sky-700 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addStep}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sky-800 text-sm hover:border-sky-400 hover:text-sky-700 transition-all"
        >
          + 단계 추가
        </button>
      </div>
    )
  }

  if (!localSteps.length) {
    return <div className="text-sky-700 text-sm italic py-4 text-center">단계가 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      {localTitle && (
        <h3 className="text-center text-sky-900 font-bold text-base">{localTitle}</h3>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-0 min-w-max mx-auto w-fit">
          {localSteps.map((step, index) => (
            <div key={index} className="flex items-center">
              <div className="flex flex-col items-center gap-2 w-28">
                <span
                  className={`w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center shadow-sm transition-colors ${
                    step.active
                      ? 'bg-sky-500 text-white ring-2 ring-sky-300 ring-offset-1'
                      : 'bg-sky-100 text-sky-900 border border-sky-200'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="text-center">
                  <p className={`text-sm font-bold leading-tight ${step.active ? 'text-sky-900' : 'text-sky-950'}`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-sky-700 mt-0.5 leading-tight">{step.subtitle}</p>
                </div>
              </div>
              {index < localSteps.length - 1 && (
                <div className="flex items-start pt-4 mx-1">
                  <svg className="w-5 h-5 text-sky-700 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
