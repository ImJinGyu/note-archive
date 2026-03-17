'use client'
import { useState, useEffect, useRef } from 'react'

export const BACKGROUNDS = [
  { id: 'bg1', label: '하늘 1', url: '/bg1.jpg', thumb: '/bg1.jpg' },
  { id: 'bg2', label: '하늘 2', url: '/bg2.jpg', thumb: '/bg2.jpg' },
  { id: 'bg3', label: '하늘 3', url: '/bg3.jpg', thumb: '/bg3.jpg' },
  { id: 'bg4', label: '하늘 4', url: '/bg4.jpg', thumb: '/bg4.jpg' },
  { id: 'bg5', label: '하늘 5', url: '/bg5.jpg', thumb: '/bg5.jpg' },
]

export const BG_STORAGE_KEY = 'note-archive-bg'

export function applyBackground(url: string) {
  document.body.style.cssText = `
    background-image: url('${url}') !important;
    background-size: cover !important;
    background-position: center center !important;
    background-repeat: no-repeat !important;
    background-attachment: scroll !important;
  `
}

export default function BackgroundPicker() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('bg1')
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(BG_STORAGE_KEY) ?? 'bg1'
    setCurrent(saved)
    const bg = BACKGROUNDS.find(b => b.id === saved) ?? BACKGROUNDS[0]
    applyBackground(bg.url)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (bg: typeof BACKGROUNDS[0]) => {
    setCurrent(bg.id)
    localStorage.setItem(BG_STORAGE_KEY, bg.id)
    applyBackground(bg.url)
    setOpen(false)
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        title="배경 변경"
        className="p-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white transition-all"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 rounded-2xl shadow-2xl p-3 w-[230px]"
          style={{ background: 'rgba(10,20,50,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <p className="text-white/60 text-xs font-medium mb-2.5 px-1">배경 선택</p>
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUNDS.map(bg => (
              <button
                key={bg.id}
                onClick={() => handleSelect(bg)}
                className={`relative rounded-xl overflow-hidden transition-all hover:scale-105 ${
                  current === bg.id ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-transparent scale-105' : ''
                }`}
                style={{ aspectRatio: '16/9' }}
              >
                {/* 이미지 미리보기 */}
                <img src={bg.thumb} alt={bg.label} className="w-full h-full object-cover" />

                {/* 라벨 */}
                <div className="absolute inset-0 flex items-end justify-center pb-1 bg-gradient-to-t from-black/50 to-transparent">
                  <span className="text-white text-[9px] font-semibold drop-shadow-md">{bg.label}</span>
                </div>

                {/* 선택 체크 */}
                {current === bg.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-sky-400 flex items-center justify-center shadow">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
