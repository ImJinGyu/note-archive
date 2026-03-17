'use client'

import { useState, useEffect } from 'react'
import { KeywordContent, KeywordItem } from '@/lib/supabase'
import InlineEmojiPicker from '@/components/ui/InlineEmojiPicker'

interface KeywordBlockProps {
  content: KeywordContent
  isEditing: boolean
  onChange: (content: KeywordContent) => void
}

export default function KeywordBlock({ content, isEditing, onChange }: KeywordBlockProps) {
  const [localItems, setLocalItems] = useState<KeywordItem[]>(content.items || [])

  useEffect(() => {
    setLocalItems(content.items || [])
  }, [content])

  const update = (items: KeywordItem[]) => {
    setLocalItems(items)
    onChange({ items })
  }

  const addItem = () =>
    update([...localItems, { icon: '🔑', title: '키워드', subtitle: '설명을 입력하세요', example: '예시를 입력하세요' }])

  const updateItem = (index: number, field: keyof KeywordItem, value: string) => {
    update(localItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeItem = (index: number) => update(localItems.filter((_, i) => i !== index))

  if (isEditing) {
    return (
      <div className="space-y-3">
        {localItems.map((item, index) => (
          <div key={index} className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </span>
              <InlineEmojiPicker value={item.icon} onChange={(v) => updateItem(index, 'icon', v)} />
              <input
                value={item.title}
                onChange={(e) => updateItem(index, 'title', e.target.value)}
                placeholder="키워드 제목"
                className="flex-1 min-w-[80px] bg-white border border-sky-200 rounded px-2 py-1 text-sm text-sky-900 font-semibold outline-none focus:border-sky-400"
              />
              <span className="text-sky-300">—</span>
              <input
                value={item.subtitle}
                onChange={(e) => updateItem(index, 'subtitle', e.target.value)}
                placeholder="부제목"
                className="flex-1 min-w-[80px] bg-white border border-sky-200 rounded px-2 py-1 text-sm text-sky-600 outline-none focus:border-sky-400"
              />
              <button onClick={() => removeItem(index)} className="text-sky-400 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={item.example}
              onChange={(e) => updateItem(index, 'example', e.target.value)}
              placeholder="예시 텍스트 (예: &quot;백엔드&quot;, &quot;서버&quot; → 백엔드 스킬 활성화)"
              rows={2}
              className="w-full bg-sky-950/5 border border-sky-200 rounded-lg px-3 py-2 text-xs text-sky-800 font-mono outline-none focus:border-sky-400 resize-none"
            />
          </div>
        ))}
        <button
          onClick={addItem}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sky-500 text-sm hover:border-sky-400 hover:text-sky-700 transition-all"
        >
          + 항목 추가
        </button>
      </div>
    )
  }

  if (!localItems.length) {
    return <div className="text-sky-400 text-sm italic py-4 text-center">항목이 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      {localItems.map((item, index) => (
        <div key={index} className="space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="w-7 h-7 rounded-full bg-sky-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 shadow-sm">
              {index + 1}
            </span>
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            <span className="text-sky-950 font-bold text-base">{item.title}</span>
            <span className="text-sky-300 font-light">—</span>
            <span className="text-sky-500 text-sm">{item.subtitle}</span>
          </div>
          {item.example && (
            <div className="ml-10 bg-sky-950/5 border-l-2 border-sky-400/60 rounded-r-lg px-3 py-2">
              <p className="text-sky-800 text-sm font-mono">{item.example}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
