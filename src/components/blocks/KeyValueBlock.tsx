'use client'

import { useState, useEffect } from 'react'

export type KVItem = { key: string; value: string }
export type KeyValueContent = { items: KVItem[] }

interface KeyValueBlockProps {
  content: KeyValueContent
  isEditing: boolean
  onChange: (content: KeyValueContent) => void
}

export default function KeyValueBlock({ content, isEditing, onChange }: KeyValueBlockProps) {
  const [localItems, setLocalItems] = useState<KVItem[]>(content.items || [])
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (value: string, index: number) => {
    navigator.clipboard.writeText(value)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  useEffect(() => {
    setLocalItems(content.items || [])
  }, [content])

  const update = (items: KVItem[]) => {
    setLocalItems(items)
    onChange({ items })
  }

  const updateItem = (index: number, field: 'key' | 'value', value: string) =>
    update(localItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)))

  const addItem = () => update([...localItems, { key: '', value: '' }])

  const removeItem = (index: number) => update(localItems.filter((_, i) => i !== index))

  if (isEditing) {
    return (
      <div className="space-y-2">
        {localItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={item.key}
              onChange={(e) => updateItem(index, 'key', e.target.value)}
              placeholder="Key"
              className="w-2/5 bg-white border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 font-semibold outline-none focus:border-sky-400 transition-colors"
            />
            <span className="text-sky-300 flex-shrink-0 font-light text-lg">→</span>
            <input
              value={item.value}
              onChange={(e) => updateItem(index, 'value', e.target.value)}
              placeholder="Value"
              className="flex-1 bg-white border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-700 outline-none focus:border-sky-400 transition-colors"
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
    <div className="flex flex-wrap gap-2">
      {localItems.map((item, index) => (
        <div key={index} className="flex items-center gap-0 rounded-lg overflow-hidden border border-sky-200 shadow-sm text-sm">
          <span className="px-3 py-1.5 bg-sky-500 text-white font-semibold whitespace-nowrap">{item.key}</span>
          <span className="px-3 py-1.5 bg-white text-sky-700 whitespace-nowrap">{item.value}</span>
          <button
            onClick={() => copyToClipboard(item.value, index)}
            title="복사"
            className="px-2 py-1.5 bg-white border-l border-sky-100 text-sky-300 hover:text-sky-500 hover:bg-sky-50 transition-colors"
          >
            {copiedIndex === index ? (
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
