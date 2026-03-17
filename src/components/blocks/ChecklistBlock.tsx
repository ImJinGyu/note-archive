'use client'

import { useState, useEffect } from 'react'
import { ChecklistContent, ChecklistItem } from '@/lib/supabase'

interface ChecklistBlockProps {
  content: ChecklistContent
  isEditing: boolean
  onChange: (content: ChecklistContent) => void
}

export default function ChecklistBlock({ content, isEditing, onChange }: ChecklistBlockProps) {
  const [localItems, setLocalItems] = useState<ChecklistItem[]>(content.items || [])

  useEffect(() => {
    setLocalItems(content.items || [])
  }, [content])

  const update = (items: ChecklistItem[]) => {
    setLocalItems(items)
    onChange({ items })
  }

  const addItem = () => {
    update([...localItems, { text: '', checked: false }])
  }

  const updateItem = (index: number, updated: Partial<ChecklistItem>) => {
    update(localItems.map((item, i) => i === index ? { ...item, ...updated } : item))
  }

  const removeItem = (index: number) => {
    update(localItems.filter((_, i) => i !== index))
  }

  const checkedCount = localItems.filter((i) => i.checked).length
  const progress = localItems.length > 0 ? Math.round((checkedCount / localItems.length) * 100) : 0

  const progressColor = progress === 100
    ? 'from-emerald-400 to-green-500'
    : progress >= 50
    ? 'from-sky-400 to-indigo-400'
    : 'from-sky-400 to-sky-500'

  if (isEditing) {
    return (
      <div className="space-y-3">
        {localItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-sky-600">
              <span>{checkedCount}/{localItems.length} 완료</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
              <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        <div className="space-y-2">
          {localItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateItem(index, { checked: !item.checked })}
                className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  item.checked
                    ? 'bg-sky-500 border-sky-500'
                    : 'border-sky-300 hover:border-sky-500'
                }`}
              >
                {item.checked && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItem(index, { text: e.target.value })}
                placeholder={`항목 ${index + 1}...`}
                className={`flex-1 bg-sky-50/80 border border-sky-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-sky-400 transition-all ${
                  item.checked ? 'text-sky-400 line-through' : 'text-sky-900'
                }`}
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
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
          type="button"
          onClick={addItem}
          className="flex items-center gap-2 text-sm text-sky-500 hover:text-sky-700 transition-colors mt-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          항목 추가
        </button>
      </div>
    )
  }

  if (!localItems.length) {
    return (
      <div className="text-sky-400 text-sm italic py-4 text-center">
        체크리스트가 없습니다. 편집 모드에서 추가해주세요.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-sky-600">{checkedCount}/{localItems.length} 완료</span>
          <span className={progress === 100 ? 'text-emerald-500 font-medium' : 'text-sky-500 font-medium'}>
            {progress}%{progress === 100 && ' 🎉'}
          </span>
        </div>
        <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
          <div className={`h-full bg-gradient-to-r ${progressColor} rounded-full transition-all duration-500 ease-out`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      <div className="space-y-2">
        {localItems.map((item, index) => (
          <div
            key={index}
            onClick={() => updateItem(index, { checked: !item.checked })}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer group"
          >
            <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
              item.checked
                ? 'bg-sky-500 border-sky-500 shadow-sm'
                : 'border-sky-300 group-hover:border-sky-500'
            }`}>
              {item.checked && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm leading-relaxed transition-all ${
              item.checked ? 'text-sky-400 line-through' : 'text-sky-900'
            }`}>
              {item.text || <span className="text-sky-300 italic">빈 항목</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
