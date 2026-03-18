// Supabase SQL Editor에서 실행:
// CREATE TABLE note_comments (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//   content TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users manage own comments" ON note_comments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
// CREATE POLICY "Users read all comments" ON note_comments FOR SELECT USING (true);

'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Comment {
  id: string
  note_id: string
  user_id: string
  content: string
  created_at: string
}

interface NoteCommentsProps {
  noteId: string
  userId: string
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export default function NoteComments({ noteId, userId }: NoteCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchComments = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('note_comments')
      .select('*')
      .eq('note_id', noteId)
      .order('created_at', { ascending: false })
    if (data) setComments(data as Comment[])
    setLoading(false)
  }, [noteId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return
    setSubmitting(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('note_comments').insert({
      note_id: noteId,
      user_id: userId,
      content: content.trim(),
    })
    if (!error) {
      setContent('')
      await fetchComments()
    }
    setSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    setDeletingId(commentId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('note_comments').delete().eq('id', commentId)
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    setDeletingId(null)
  }

  return (
    <div
      className="mt-8 rounded-2xl overflow-hidden"
      style={{
        background: 'var(--dm-surface-panel)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--dm-border)',
        boxShadow: '0 2px 16px rgba(0,80,160,0.08)',
      }}
    >
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-sky-200/60 flex items-center gap-2">
        <span className="text-base">💬</span>
        <h3 className="text-sky-900 font-bold text-sm">댓글</h3>
        {!loading && (
          <span className="text-xs text-sky-500 bg-sky-100 px-2 py-0.5 rounded-full">{comments.length}</span>
        )}
      </div>

      <div className="p-5">
        {/* 입력 영역 */}
        <div className="mb-5">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="댓글을 입력하세요..."
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm text-sky-950 placeholder-sky-400 outline-none resize-none transition-all"
            style={{
              background: 'var(--dm-surface-input)',
              border: '1px solid var(--dm-border)',
              boxShadow: 'inset 0 1px 3px rgba(0,80,160,0.05)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.border = '1px solid rgba(14,165,233,0.6)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = '1px solid rgba(186,230,253,0.8)'
              e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,80,160,0.05)'
            }}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-sky-500 text-white hover:bg-sky-400 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
              등록
            </button>
          </div>
        </div>

        {/* 댓글 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-5 h-5 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-sky-400 text-sm">
            아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-xl p-4"
                style={{
                  background: 'var(--dm-surface-card)',
                  border: '1px solid var(--dm-border)',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }}
                    >
                      {comment.user_id === userId ? 'Me' : '?'}
                    </div>
                    <span className="text-xs text-sky-500">{timeAgo(comment.created_at)}</span>
                  </div>
                  {comment.user_id === userId && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      title="댓글 삭제"
                      className="p-1 rounded-lg text-sky-300 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-sky-900 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
