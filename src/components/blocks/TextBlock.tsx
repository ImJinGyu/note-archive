'use client'

import { useState, useEffect } from 'react'
import { TextContent } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

interface TextBlockProps {
  content: TextContent
  isEditing: boolean
  onChange: (content: TextContent) => void
}

export default function TextBlock({ content, isEditing, onChange }: TextBlockProps) {
  const [localMarkdown, setLocalMarkdown] = useState(content.markdown || '')

  useEffect(() => {
    setLocalMarkdown(content.markdown || '')
  }, [content.markdown])

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-sky-900 mb-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          Markdown 지원
        </div>
        <textarea
          value={localMarkdown}
          onChange={(e) => {
            setLocalMarkdown(e.target.value)
            onChange({ markdown: e.target.value })
          }}
          placeholder="마크다운으로 작성하세요...&#10;&#10;# 제목&#10;**굵게** *기울임* `코드`&#10;- 목록 항목&#10;> 인용문"
          rows={10}
          className="w-full bg-sky-50/80 border border-sky-200 rounded-lg px-4 py-3 text-sky-900 placeholder-sky-300 outline-none resize-y font-mono text-sm focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] transition-all"
        />
      </div>
    )
  }

  if (!localMarkdown) {
    return <div className="text-sky-700 text-sm italic py-4 text-center">내용이 없습니다. 편집 모드에서 작성해주세요.</div>
  }

  return <div className="prose-dark"><ReactMarkdown>{localMarkdown}</ReactMarkdown></div>
}
