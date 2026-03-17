'use client'

import { useState, useEffect } from 'react'

export type LicenseItem = {
  name: string        // 자격/면허사항
  date: string        // 취득일
  expiry: string      // 유효기간
  issuer: string      // 발행기관
}
export type LicenseContent = { items: LicenseItem[] }

interface Props {
  content: LicenseContent
  isEditing: boolean
  onChange: (content: LicenseContent) => void
}

const emptyItem = (): LicenseItem => ({ name: '', date: '', expiry: '', issuer: '' })

export default function LicenseBlock({ content, isEditing, onChange }: Props) {
  const [items, setItems] = useState<LicenseItem[]>(content.items?.length ? content.items : [emptyItem()])

  useEffect(() => {
    setItems(content.items?.length ? content.items : [emptyItem()])
  }, [content])

  const commit = (newItems: LicenseItem[]) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  const updateItem = (idx: number, field: keyof LicenseItem, val: string) =>
    commit(items.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  const addItem = () => commit([...items, emptyItem()])
  const removeItem = (idx: number) => commit(items.filter((_, i) => i !== idx))

  /* ── VIEW MODE ── */
  if (!isEditing) {
    const hasContent = items.some(it => it.name || it.issuer)
    if (!hasContent) {
      return <p className="text-sky-700 text-sm italic py-4 text-center">자격/면허 정보가 없습니다. 편집 모드에서 추가해주세요.</p>
    }
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(186,230,253,0.7)', background: 'rgba(240,249,255,0.5)' }}>
        {/* 헤더 행 */}
        <div
          className="grid text-xs font-bold text-sky-800 px-4 py-2"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr', background: 'rgba(186,230,253,0.6)', borderBottom: '1px solid rgba(147,210,255,0.4)' }}
        >
          <span>자격/면허사항</span>
          <span>취득일</span>
          <span>유효기간</span>
          <span>발행기관</span>
        </div>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="grid px-4 py-3 hover:bg-sky-50/40 transition-colors"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 1.5fr',
              borderBottom: idx < items.length - 1 ? '1px solid rgba(186,230,253,0.6)' : undefined,
            }}
          >
            <span className="text-sm font-semibold text-sky-900 truncate pr-2">{item.name || <span className="text-sky-300 italic font-normal">미입력</span>}</span>
            <span className="text-sm text-sky-700 truncate pr-2">{item.date || <span className="text-sky-300 italic">-</span>}</span>
            <span className="text-sm text-sky-700 truncate pr-2">{item.expiry || <span className="text-sky-300 italic">-</span>}</span>
            <span className="text-sm text-sky-700 truncate">{item.issuer || <span className="text-sky-300 italic">-</span>}</span>
          </div>
        ))}
      </div>
    )
  }

  /* ── EDIT MODE ── */
  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(186,230,253,0.7)' }}>
        {/* 헤더 */}
        <div
          className="grid text-xs font-bold text-sky-800 px-3 py-2"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1.5fr 28px', background: 'rgba(186,230,253,0.6)', borderBottom: '1px solid rgba(147,210,255,0.4)' }}
        >
          <span>자격/면허사항 *</span>
          <span>취득일</span>
          <span>유효기간</span>
          <span>발행기관</span>
          <span />
        </div>

        {items.map((item, idx) => (
          <div
            key={idx}
            className="grid items-center gap-2 px-3 py-2"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 1.5fr 28px',
              borderBottom: idx < items.length - 1 ? '1px solid rgba(186,230,253,0.5)' : undefined,
              background: 'rgba(240,249,255,0.6)',
            }}
          >
            <input
              value={item.name}
              onChange={e => updateItem(idx, 'name', e.target.value)}
              placeholder="자격증/면허명"
              className="bg-white/80 border border-sky-200 rounded-lg px-2.5 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
            />
            <input
              value={item.date}
              onChange={e => updateItem(idx, 'date', e.target.value)}
              placeholder="YYYY-MM"
              className="bg-white/80 border border-sky-200 rounded-lg px-2.5 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
            />
            <input
              value={item.expiry}
              onChange={e => updateItem(idx, 'expiry', e.target.value)}
              placeholder="영구/YYYY-MM"
              className="bg-white/80 border border-sky-200 rounded-lg px-2.5 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
            />
            <input
              value={item.issuer}
              onChange={e => updateItem(idx, 'issuer', e.target.value)}
              placeholder="발행기관명"
              className="bg-white/80 border border-sky-200 rounded-lg px-2.5 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              disabled={items.length === 1}
              className="w-7 h-7 flex items-center justify-center text-sky-400 hover:text-red-400 disabled:opacity-20 transition-colors flex-shrink-0"
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
        className="flex items-center gap-2 text-sm text-sky-500 hover:text-sky-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        항목 추가
      </button>
    </div>
  )
}
