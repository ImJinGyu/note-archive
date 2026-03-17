'use client'

import { useState, useEffect } from 'react'
import { CodeContent } from '@/lib/supabase'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'sql', 'html',
  'css', 'json', 'yaml', 'bash', 'shell', 'markdown', 'plaintext',
]

interface CodeBlockProps {
  content: CodeContent
  isEditing: boolean
  onChange: (content: CodeContent) => void
}

export default function CodeBlock({ content, isEditing, onChange }: CodeBlockProps) {
  const [localCode, setLocalCode] = useState(content.code || '')
  const [localLanguage, setLocalLanguage] = useState(content.language || 'javascript')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setLocalCode(content.code || '')
    setLocalLanguage(content.language || 'javascript')
  }, [content.code, content.language])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(localCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <label className="text-xs text-sky-600 font-medium">언어:</label>
          <select
            value={localLanguage}
            onChange={(e) => {
              setLocalLanguage(e.target.value)
              onChange({ code: localCode, language: e.target.value })
            }}
            className="bg-sky-100/80 border border-sky-200 rounded-lg px-3 py-1.5 text-sky-900 text-sm outline-none focus:border-sky-400 transition-all cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        <textarea
          value={localCode}
          onChange={(e) => {
            setLocalCode(e.target.value)
            onChange({ code: e.target.value, language: localLanguage })
          }}
          placeholder="// 코드를 입력하세요..."
          rows={12}
          className="code-input w-full bg-sky-50/80 border border-sky-200 rounded-lg px-4 py-3 text-sky-900 placeholder-sky-300 outline-none resize-y text-sm focus:border-sky-400 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] transition-all"
          spellCheck={false}
        />
      </div>
    )
  }

  if (!localCode) {
    return (
      <div className="text-sky-400 text-sm italic py-4 text-center">
        코드가 없습니다. 편집 모드에서 작성해주세요.
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border border-sky-200">
      <div className="flex items-center justify-between bg-sky-100/80 px-4 py-2 border-b border-sky-200">
        <span className="text-xs text-sky-600 font-medium uppercase tracking-wider">
          {localLanguage || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-500">복사됨!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              복사
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={localLanguage || 'javascript'}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: 0, background: '#0d1117', fontSize: '0.875rem', lineHeight: '1.6' }}
        showLineNumbers
        lineNumberStyle={{ color: '#6e7681', fontSize: '0.75rem', minWidth: '2.5em' }}
      >
        {localCode}
      </SyntaxHighlighter>
    </div>
  )
}
