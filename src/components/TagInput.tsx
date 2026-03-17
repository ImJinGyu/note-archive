'use client'

import { useState, KeyboardEvent } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

export default function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = (value: string) => {
    const trimmed = value.trim().replace(/,/g, '')
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  return (
    <div className="min-h-[44px] flex flex-wrap gap-2 items-center bg-[#f0f9ff] dark:bg-[#0d1117] border border-sky-200 dark:border-[#30363d] rounded-lg px-3 py-2 focus-within:border-sky-500 dark:focus-within:border-[#38bdf8] focus-within:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] transition-all">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 bg-sky-500/10 dark:bg-[#38bdf8]/10 text-sky-500 dark:text-[#38bdf8] border border-sky-500/30 dark:border-[#38bdf8]/30 rounded-full px-3 py-0.5 text-sm"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="ml-1 text-sky-500/60 dark:text-[#38bdf8]/60 hover:text-sky-500 dark:hover:text-[#38bdf8] transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? 'Enter 또는 쉼표로 태그 추가...' : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sky-900 dark:text-[#c9d1d9] placeholder-sky-400 dark:placeholder-[#8b949e] text-sm"
      />
    </div>
  )
}
