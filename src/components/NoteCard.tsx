'use client'

import { Note } from '@/lib/supabase'

interface NoteCardProps {
  note: Note
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}

const TAG_COLORS = [
  'bg-blue-500/15 text-blue-700 border-blue-500/30',
  'bg-purple-500/15 text-purple-700 border-purple-500/30',
  'bg-green-500/15 text-green-700 border-green-500/30',
  'bg-orange-500/15 text-orange-700 border-orange-500/30',
  'bg-pink-500/15 text-pink-700 border-pink-500/30',
  'bg-cyan-500/15 text-cyan-700 border-cyan-500/30',
]

function getTagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  if (days < 365) return `${Math.floor(days / 30)}개월 전`
  return `${Math.floor(days / 365)}년 전`
}

export default function NoteCard({ note, onClick, onEdit, onDelete }: NoteCardProps) {
  return (
    <div
      onClick={onClick}
      className="note-card glass-card rounded-xl p-5 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-4xl select-none">{note.icon}</div>
        <div className="flex items-center gap-2">
          {note.is_locked && (
            <span className="flex items-center gap-1 text-xs text-sky-700 bg-sky-100 px-2 py-1 rounded-full border border-sky-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              잠김
            </span>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg bg-sky-100 text-sky-600 hover:bg-sky-200 transition-colors"
              title="편집"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
              title="삭제"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sky-900 font-semibold text-base mb-1.5 group-hover:text-sky-600 transition-colors line-clamp-1">
        {note.title}
      </h3>

      {/* Description */}
      {note.description && (
        <p className="text-sky-700 text-sm mb-3 line-clamp-2 leading-relaxed">
          {note.description}
        </p>
      )}

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getTagColor(tag)}`}
            >
              #{tag}
            </span>
          ))}
          {note.tags.length > 4 && (
            <span className="text-xs px-2 py-0.5 rounded-full border border-sky-200 text-sky-600">
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-sky-100">
        <span className="text-xs text-sky-500">{formatDate(note.updated_at)}</span>
        <span className="text-xs text-sky-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          열기
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  )
}
