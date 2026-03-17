'use client'

import { useState, useEffect } from 'react'
import { TipContent } from '@/lib/supabase'

const TIP_ICONS = ['💡', '⚠️', '✅', '❌', '📌', '🔥', '⭐', '🎯', '💬', '🔔', '🛑', '💎', '🧠', '🚀', '📝']

interface TipBlockProps {
  content: TipContent
  isEditing: boolean
  onChange: (content: TipContent) => void
}

export default function TipBlock({ content, isEditing, onChange }: TipBlockProps) {
  const [localIcon, setLocalIcon] = useState(content.icon || '💡')
  const [localItems, setLocalItems] = useState<string[]>(content.items || [])

  useEffect(() => {
    setLocalIcon(content.icon || '💡')
    setLocalItems(content.items || [])
  }, [content])

  const update = (icon: string, items: string[]) => {
    onChange({ icon, items })
  }

  const addItem = () => {
    const newItems = [...localItems, '']
    setLocalItems(newItems)
    update(localIcon, newItems)
  }

  const updateItem = (index: number, value: string) => {
    const newItems = localItems.map((item, i) => i === index ? value : item)
    setLocalItems(newItems)
    update(localIcon, newItems)
  }

  const removeItem = (index: number) => {
    const newItems = localItems.filter((_, i) => i !== index)
    setLocalItems(newItems)
    update(localIcon, newItems)
  }

  const selectIcon = (icon: string) => {
    setLocalIcon(icon)
    update(icon, localItems)
  }

  const iconColors: Record<string, string> = {
    '💡': 'bg-yellow-50 border-yellow-300',
    '⚠️': 'bg-orange-50 border-orange-300',
    '✅': 'bg-green-50 border-green-300',
    '❌': 'bg-red-50 border-red-300',
    '📌': 'bg-blue-50 border-blue-300',
    '🔥': 'bg-orange-50 border-orange-300',
    '⭐': 'bg-yellow-50 border-yellow-300',
    '🎯': 'bg-purple-50 border-purple-300',
  }
  const colorClass = iconColors[localIcon] || 'bg-sky-50 border-sky-200'

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-sky-900 font-medium mb-2 block">아이콘 선택:</label>
          <div className="flex flex-wrap gap-2">
            {TIP_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectIcon(i)}
                className={`w-9 h-9 text-xl rounded-lg transition-all flex items-center justify-center ${
                  localIcon === i
                    ? 'bg-sky-500/20 ring-1 ring-sky-500 shadow-sm'
                    : 'bg-sky-100/80 hover:bg-sky-200/80'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-sky-900 font-medium">항목:</label>
          {localItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sky-800 text-sm w-4 text-right flex-shrink-0">{index + 1}.</span>
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={`항목 ${index + 1}...`}
                className="flex-1 bg-sky-50/80 border border-sky-200 rounded-lg px-3 py-2 text-sky-900 placeholder-sky-300 text-sm outline-none focus:border-sky-400 transition-all"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-sky-700 hover:text-red-400 transition-colors p-1 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 text-sm text-sky-800 hover:text-sky-700 transition-colors mt-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            항목 추가
          </button>
        </div>
      </div>
    )
  }

  if (!localItems.length) {
    return (
      <div className="text-sky-700 text-sm italic py-4 text-center">
        내용이 없습니다. 편집 모드에서 항목을 추가해주세요.
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <ul className="space-y-2">
        {localItems.map((item, index) => (
          <li key={index} className="flex items-start gap-3 text-sky-900">
            <span className="text-xl flex-shrink-0 leading-tight mt-0.5">{index === 0 ? localIcon : '•'}</span>
            <span className="text-sm leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
