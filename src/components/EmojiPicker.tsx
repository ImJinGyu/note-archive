'use client'

import { useState } from 'react'

const EMOJI_CATEGORIES = {
  '자주 사용': ['📝', '📌', '⭐', '🔥', '💡', '🎯', '📚', '🚀', '✅', '🎨', '💻', '🔧', '📊', '🗂️', '📋'],
  '개발': ['💻', '🖥️', '⌨️', '🖱️', '🔧', '🛠️', '⚙️', '🔩', '🐛', '🔍', '📦', '🗃️', '🧩', '🔌', '💾'],
  '학습': ['📚', '📖', '✏️', '📐', '📏', '🎓', '🏫', '📝', '🗒️', '📓', '📔', '📕', '📗', '📘', '📙'],
  '아이디어': ['💡', '🧠', '🌟', '✨', '⚡', '🎯', '🎪', '🌈', '🔮', '🪄', '🎭', '🏆', '🎖️', '🥇', '🎗️'],
  '업무': ['📊', '📈', '📉', '💼', '📁', '🗂️', '📋', '📌', '📍', '📎', '🖇️', '✂️', '🗑️', '💳', '🏷️'],
  '일상': ['☕', '🍵', '🎮', '🎵', '🎬', '📷', '🏃', '🧘', '🌙', '☀️', '🌊', '🌿', '🦋', '🌸', '🍀'],
}

interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
}

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('자주 사용')

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 text-4xl rounded-xl border-2 border-dashed border-sky-200 dark:border-[#30363d] hover:border-sky-500 dark:hover:border-[#38bdf8] hover:bg-sky-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center"
      >
        {value}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#161b22] border border-sky-200 dark:border-[#30363d] rounded-xl shadow-2xl p-3 w-72 animate-fade-in">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1 mb-3 border-b border-sky-200 dark:border-[#30363d] pb-2">
              {Object.keys(EMOJI_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    activeCategory === cat
                      ? 'bg-sky-500/20 dark:bg-[#38bdf8]/20 text-sky-800 dark:text-[#38bdf8]'
                      : 'text-sky-900 dark:text-[#8b949e] hover:text-sky-900 dark:hover:text-[#c9d1d9] hover:bg-sky-100 dark:hover:bg-[#21262d]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Emoji grid */}
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji)
                    setIsOpen(false)
                  }}
                  className={`w-8 h-8 text-lg rounded hover:bg-sky-100 dark:hover:bg-[#21262d] transition-all flex items-center justify-center ${
                    value === emoji ? 'bg-sky-500/20 dark:bg-[#38bdf8]/20 ring-1 ring-sky-500 dark:ring-[#38bdf8]' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
