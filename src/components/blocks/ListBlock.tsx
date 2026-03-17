'use client'

import { useState, useEffect, useRef } from 'react'

export type ListStyle = 'bullet' | 'numbered' | 'arrow' | 'check'
export type ListItem = { text: string }
export type ListContent = { style: ListStyle; items: ListItem[] }

interface ListBlockProps {
  content: ListContent
  isEditing: boolean
  onChange: (content: ListContent) => void
}

const STYLE_OPTIONS: { value: ListStyle; label: string; icon: string }[] = [
  { value: 'bullet', label: '점', icon: '•' },
  { value: 'numbered', label: '번호', icon: '1.' },
  { value: 'arrow', label: '화살표', icon: '→' },
  { value: 'check', label: '체크', icon: '✓' },
]

const BULLET_ICONS: Record<ListStyle, (i: number) => React.ReactNode> = {
  bullet: () => <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 mt-2" />,
  numbered: (i) => <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>,
  arrow: () => <span className="text-sky-400 font-bold flex-shrink-0">→</span>,
  check: () => (
    <span className="w-4 h-4 rounded border-2 border-sky-400 flex items-center justify-center flex-shrink-0">
      <svg className="w-2.5 h-2.5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  ),
}

export default function ListBlock({ content, isEditing, onChange }: ListBlockProps) {
  const [localStyle, setLocalStyle] = useState<ListStyle>(content.style || 'bullet')
  const [localItems, setLocalItems] = useState<ListItem[]>(content.items || [])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setLocalStyle(content.style || 'bullet')
    setLocalItems(content.items || [])
  }, [content])

  const update = (items: ListItem[], style?: ListStyle) => {
    const newStyle = style ?? localStyle
    setLocalItems(items)
    if (style) setLocalStyle(style)
    onChange({ style: newStyle, items })
  }

  const updateItem = (index: number, text: string) =>
    update(localItems.map((item, i) => (i === index ? { text } : item)))

  const addItem = (afterIndex?: number) => {
    const newItem = { text: '' }
    const newItems =
      afterIndex !== undefined
        ? [...localItems.slice(0, afterIndex + 1), newItem, ...localItems.slice(afterIndex + 1)]
        : [...localItems, newItem]
    update(newItems)
    const focusIdx = afterIndex !== undefined ? afterIndex + 1 : newItems.length - 1
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 30)
  }

  const removeItem = (index: number) => {
    const newItems = localItems.filter((_, i) => i !== index)
    update(newItems)
    if (index > 0) setTimeout(() => inputRefs.current[index - 1]?.focus(), 30)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem(index)
    } else if (e.key === 'Backspace' && localItems[index].text === '' && localItems.length > 1) {
      e.preventDefault()
      removeItem(index)
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        {/* Style selector */}
        <div className="flex gap-1.5">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => update(localItems, opt.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                localStyle === opt.value
                  ? 'bg-sky-500 text-white border-sky-500'
                  : 'bg-white text-sky-600 border-sky-200 hover:border-sky-400'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-1.5">
          {localItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sky-300 text-sm w-5 text-center flex-shrink-0 select-none">
                {localStyle === 'numbered' ? `${index + 1}.` : localStyle === 'arrow' ? '→' : localStyle === 'check' ? '✓' : '•'}
              </span>
              <input
                ref={(el) => { inputRefs.current[index] = el }}
                value={item.text}
                onChange={(e) => updateItem(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder="항목 입력..."
                className="flex-1 bg-white border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors"
              />
              <button
                onClick={() => removeItem(index)}
                className="text-sky-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => addItem()}
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
    <ul className="space-y-2">
      {localItems.map((item, index) => (
        <li key={index} className="flex items-start gap-3 text-sky-800 text-sm leading-relaxed">
          {BULLET_ICONS[localStyle](index)}
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  )
}
