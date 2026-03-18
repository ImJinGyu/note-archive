'use client'

import { useState } from 'react'
import type { Note, Tab, Block, BlockType } from '@/lib/supabase'

interface Props {
  note: Note
  tabs: Tab[]
  blocks: Block[]
  onClose: () => void
}

// 블록 → Markdown 변환
function blockToMarkdown(block: Block): string {
  const c = block.content
  const title = block.show_title && block.title ? `\n**${block.title}**\n\n` : '\n'

  switch (block.type as BlockType) {
    case 'text':
      return `${title}${(c.markdown as string) || ''}\n`

    case 'code': {
      const lang = (c.language as string) || ''
      const code = (c.code as string) || ''
      return `${title}\`\`\`${lang}\n${code}\n\`\`\`\n`
    }

    case 'tip': {
      const items = (c.items as string[]) || []
      return `${title}> 💡 ${items.join('\n> ')}\n`
    }

    case 'steps': {
      const steps = (c.steps as { title: string; description: string; code?: string; language?: string }[]) || []
      return title + steps.map((s, i) =>
        `**${i + 1}. ${s.title}**\n${s.description ? s.description + '\n' : ''}${s.code ? `\`\`\`${s.language || ''}\n${s.code}\n\`\`\`` : ''}`
      ).join('\n\n') + '\n'
    }

    case 'table': {
      const cols = (c.columns as string[]) || []
      const rows = (c.rows as string[][]) || []
      if (!cols.length) return ''
      const header = `| ${cols.join(' | ')} |`
      const separator = `| ${cols.map(() => '---').join(' | ')} |`
      const body = rows.map(row => `| ${row.join(' | ')} |`).join('\n')
      return `${title}${header}\n${separator}\n${body}\n`
    }

    case 'checklist': {
      const items = (c.items as { text: string; checked: boolean; sub?: string }[]) || []
      return title + items.map(i =>
        `- [${i.checked ? 'x' : ' '}] ${i.text}${i.sub ? ` *(${i.sub})*` : ''}`
      ).join('\n') + '\n'
    }

    case 'keyword': {
      const items = (c.items as { icon: string; title: string; subtitle: string; example: string }[]) || []
      return title + items.map((i, idx) =>
        `**${idx + 1}. ${i.icon} ${i.title}**\n*${i.subtitle}*\n> ${i.example}`
      ).join('\n\n') + '\n'
    }

    case 'flow': {
      const steps = (c.steps as { title: string; subtitle: string }[]) || []
      return `${title}${steps.map(s => `**${s.title}** (${s.subtitle})`).join(' → ')}\n`
    }

    case 'featurelist': {
      const items = (c.items as { icon: string; label: string; title: string; description: string }[]) || []
      return title + items.map(i =>
        `- ${i.icon} **[${i.label}] ${i.title}**: ${i.description}`
      ).join('\n') + '\n'
    }

    case 'keyvalue': {
      const items = (c.items as { key: string; value: string }[]) || []
      return title + items.map(i => `- **${i.key}**: ${i.value}`).join('\n') + '\n'
    }

    case 'list': {
      const items = (c.items as { text: string }[]) || []
      const style = c.style as string
      return title + items.map((i, idx) => {
        if (style === 'numbered') return `${idx + 1}. ${i.text}`
        if (style === 'arrow') return `→ ${i.text}`
        if (style === 'check') return `- [x] ${i.text}`
        return `- ${i.text}`
      }).join('\n') + '\n'
    }

    case 'credential': {
      const items = (c.items as { label: string; url: string; memo: string }[]) || []
      return title + items.map(i =>
        `**${i.label}**${i.url ? `\nURL: ${i.url}` : ''}${i.memo ? `\n메모: ${i.memo}` : ''}`
      ).join('\n\n') + '\n'
    }

    case 'license': {
      const items = (c.items as { name: string; date: string; expiry: string; issuer: string }[]) || []
      return title + items.map(i =>
        `- **${i.name}** | 취득: ${i.date} | 유효: ${i.expiry} | 발행: ${i.issuer}`
      ).join('\n') + '\n'
    }

    case 'link': {
      const links = (c.links as { noteTitle: string; noteId: string; memo: string }[]) || []
      return title + links.filter(l => l.noteId).map(l =>
        `- 🔗 **${l.noteTitle}**${l.memo ? ` — ${l.memo}` : ''}`
      ).join('\n') + '\n'
    }

    case 'file': {
      const files = (c.files as { name: string; size: number }[]) || []
      return title + files.map(f => `- 📎 ${f.name} (${Math.round(f.size / 1024)}KB)`).join('\n') + '\n'
    }

    default:
      return ''
  }
}

function generateMarkdown(note: Note, tabs: Tab[], blocks: Block[]): string {
  const lines: string[] = []
  lines.push(`# ${note.icon} ${note.title}`)
  if (note.description) lines.push(`\n> ${note.description}`)
  if (note.tags?.length) lines.push(`\n태그: ${note.tags.map(t => `#${t}`).join(' ')}`)
  lines.push(`\n업데이트: ${new Date(note.updated_at).toLocaleDateString('ko-KR')}`)
  lines.push('\n---\n')

  const sortedTabs = [...tabs].sort((a, b) => a.order_index - b.order_index)

  for (const tab of sortedTabs) {
    const tabBlocks = blocks
      .filter(b => b.tab_id === tab.id)
      .sort((a, b) => a.order_index - b.order_index)

    lines.push(`## ${tab.name}\n`)
    for (const block of tabBlocks) {
      lines.push(blockToMarkdown(block))
    }
    lines.push('---\n')
  }

  return lines.join('\n')
}

export default function ExportModal({ note, tabs, blocks, onClose }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleMarkdown = () => {
    setExporting(true)
    const md = generateMarkdown(note, tabs, blocks)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${note.title.replace(/[^\w\s가-힣]/g, '')}.md`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    onClose()
  }

  const handlePrint = () => {
    // 인쇄 스타일로 현재 페이지 PDF 출력
    window.print()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-panel rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-sky-900">노트 내보내기</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50 text-sky-500 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-sky-600 mb-4">
          <span className="font-bold text-sky-800">{note.icon} {note.title}</span>의 전체 내용을 내보냅니다.
        </p>

        <div className="space-y-3">
          {/* Markdown */}
          <button
            onClick={handleMarkdown}
            disabled={exporting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-left"
            style={{ background: 'var(--dm-surface-card)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-xl flex-shrink-0">
              📄
            </div>
            <div>
              <p className="text-sm font-bold text-sky-900">Markdown (.md)</p>
              <p className="text-xs text-sky-600 mt-0.5">모든 블록을 Markdown 형식으로 다운로드</p>
            </div>
            <svg className="w-4 h-4 text-sky-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* PDF via print */}
          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-sky-200 hover:border-sky-400 hover:bg-sky-50/50 transition-all text-left"
            style={{ background: 'var(--dm-surface-card)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl flex-shrink-0">
              🖨️
            </div>
            <div>
              <p className="text-sm font-bold text-sky-900">PDF 저장</p>
              <p className="text-xs text-sky-600 mt-0.5">브라우저 인쇄 → PDF로 저장 선택</p>
            </div>
            <svg className="w-4 h-4 text-sky-400 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm font-semibold rounded-xl border-2 border-sky-400 text-sky-800 bg-white/40 hover:bg-white/70 transition-all"
        >
          취소
        </button>
      </div>
    </div>
  )
}
