'use client'

import { useState, useEffect } from 'react'
import { FeatureListContent, FeatureItem } from '@/lib/supabase'
import InlineEmojiPicker from '@/components/ui/InlineEmojiPicker'

interface FeatureListBlockProps {
  content: FeatureListContent
  isEditing: boolean
  onChange: (content: FeatureListContent) => void
}

const LABEL_COLORS = [
  'text-sky-800',
  'text-violet-500',
  'text-emerald-500',
  'text-amber-500',
  'text-rose-500',
  'text-indigo-500',
]

export default function FeatureListBlock({ content, isEditing, onChange }: FeatureListBlockProps) {
  const [localItems, setLocalItems] = useState<FeatureItem[]>(content.items || [])

  useEffect(() => {
    setLocalItems(content.items || [])
  }, [content])

  const update = (items: FeatureItem[]) => {
    setLocalItems(items)
    onChange({ items })
  }

  const addItem = () =>
    update([
      ...localItems,
      {
        icon: '⭐',
        label: `${localItems.length + 1}번째`,
        title: '기능 제목',
        description: '기능에 대한 설명을 입력하세요',
      },
    ])

  const updateItem = (index: number, field: keyof FeatureItem, value: string) => {
    update(localItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeItem = (index: number) => update(localItems.filter((_, i) => i !== index))

  if (isEditing) {
    return (
      <div className="space-y-3">
        {localItems.map((item, index) => (
          <div key={index} className="bg-sky-50/60 border border-sky-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <InlineEmojiPicker value={item.icon} onChange={(v) => updateItem(index, 'icon', v)} />
              <input
                value={item.label}
                onChange={(e) => updateItem(index, 'label', e.target.value)}
                placeholder="레이블 (예: 1번째)"
                className="w-24 bg-white border border-sky-200 rounded px-2 py-1 text-xs text-sky-900 outline-none focus:border-sky-400"
              />
              <input
                value={item.title}
                onChange={(e) => updateItem(index, 'title', e.target.value)}
                placeholder="기능 제목"
                className="flex-1 bg-white border border-sky-200 rounded px-2 py-1 text-sm text-sky-900 font-semibold outline-none focus:border-sky-400"
              />
              <button onClick={() => removeItem(index)} className="text-sky-700 hover:text-red-400 transition-colors p-1 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              value={item.description}
              onChange={(e) => updateItem(index, 'description', e.target.value)}
              placeholder="기능 설명"
              className="w-full bg-white border border-sky-200 rounded px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400"
            />
          </div>
        ))}
        <button
          onClick={addItem}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sky-800 text-sm hover:border-sky-400 hover:text-sky-700 transition-all"
        >
          + 항목 추가
        </button>
      </div>
    )
  }

  if (!localItems.length) {
    return <div className="text-sky-700 text-sm italic py-4 text-center">항목이 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      {localItems.map((item, index) => (
        <div key={index} className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-sky-100 border-2 border-sky-200 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            {item.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${LABEL_COLORS[index % LABEL_COLORS.length]}`}>
                {item.label}
              </span>
              <span className="text-sky-950 font-bold text-base leading-tight">{item.title}</span>
            </div>
            <p className="text-sky-800 text-sm mt-0.5">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
