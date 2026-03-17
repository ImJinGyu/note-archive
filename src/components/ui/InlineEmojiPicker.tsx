'use client'

import { useState, useEffect, useRef } from 'react'

const EMOJIS = [
  '🔑','🎯','💡','⚡','🔥','✅','📌','🚀','🛠️','⚙️',
  '📦','🔍','💻','🌟','✨','🎨','📊','🗂️','📋','💼',
  '🧩','🔌','🐛','📝','🏆','🥇','🎖️','🔮','🪄','🎭',
  '🌈','🌊','🌿','🦋','🌸','🍀','☕','🎵','🎬','📷',
  '🧠','💎','🔒','🔓','🌐','📡','🛡️','⭐','🎪','🎗️',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','❓',
  '1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','➡️','⬆️','⬇️','↩️','🔄',
]

interface Props {
  value: string
  onChange: (emoji: string) => void
}

export default function InlineEmojiPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg bg-sky-100 hover:bg-sky-200 border border-sky-200 flex items-center justify-center text-base transition-all hover:scale-110"
        title="아이콘 변경"
      >
        {value}
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 z-[200] rounded-xl shadow-2xl p-2 grid grid-cols-7 gap-0.5"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', border: '1px solid rgba(14,165,233,0.2)', width: '210px' }}
        >
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false) }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all hover:bg-sky-100 hover:scale-110 ${value === emoji ? 'bg-sky-200 ring-1 ring-sky-400' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
