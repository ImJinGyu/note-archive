'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import ReactMarkdown from 'react-markdown'

type Document = {
  id: string
  name: string
  description: string
  content: string
  created_at: string
  updated_at: string
}

interface DocsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DocsModal({ isOpen, onClose }: DocsModalProps) {
  const { showToast } = useToast()
  const [docs, setDocs] = useState<Document[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newDocName, setNewDocName] = useState('')
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [descInput, setDescInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const descInputRef = useRef<HTMLInputElement>(null)

  const selectedDoc = docs.find((d) => d.id === selectedId) ?? null

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) {
      setDocs(data)
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
    }
    setLoading(false)
  }, [selectedId])

  useEffect(() => {
    if (isOpen) fetchDocs()
  }, [isOpen, fetchDocs])

  const handleSelect = (doc: Document) => {
    setSelectedId(doc.id)
    setIsEditing(false)
  }

  const startEditDesc = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingDescId(doc.id)
    setDescInput(doc.description || '')
    setTimeout(() => descInputRef.current?.focus(), 50)
  }

  const saveDesc = async (docId: string) => {
    const { error } = await supabase.from('documents').update({ description: descInput }).eq('id', docId)
    if (!error) {
      setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, description: descInput } : d))
    }
    setEditingDescId(null)
  }

  const startEdit = () => {
    if (!selectedDoc) return
    setEditContent(selectedDoc.content)
    setEditName(selectedDoc.name)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  const saveEdit = async () => {
    if (!selectedDoc) return
    setSaving(true)
    const { error } = await supabase
      .from('documents')
      .update({ name: editName.trim() || selectedDoc.name, content: editContent })
      .eq('id', selectedDoc.id)
    if (error) {
      showToast('저장에 실패했습니다.', 'error')
    } else {
      showToast('저장됐습니다.', 'success')
      setDocs((prev) =>
        prev.map((d) =>
          d.id === selectedDoc.id
            ? { ...d, name: editName.trim() || d.name, content: editContent }
            : d
        )
      )
      setIsEditing(false)
    }
    setSaving(false)
  }

  const createDoc = async () => {
    if (!newDocName.trim()) return
    const { data, error } = await supabase
      .from('documents')
      .insert({ name: newDocName.trim(), content: '', description: '' })
      .select()
      .single()
    if (error) {
      showToast('생성에 실패했습니다.', 'error')
    } else if (data) {
      setDocs((prev) => [...prev, data])
      setSelectedId(data.id)
      setIsCreating(false)
      setNewDocName('')
      setEditContent('')
      setEditName(data.name)
      setIsEditing(true)
    }
  }

  const deleteDoc = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) {
      showToast('삭제에 실패했습니다.', 'error')
    } else {
      showToast('문서가 삭제됐습니다.', 'success')
      const remaining = docs.filter((d) => d.id !== id)
      setDocs(remaining)
      if (selectedId === id) setSelectedId(remaining[0]?.id ?? null)
    }
    setDeleteTarget(null)
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const content = e.target?.result as string
        const { data, error } = await supabase
          .from('documents')
          .insert({ name: file.name, content, description: '' })
          .select()
          .single()
        if (error) {
          showToast(`"${file.name}" 업로드 실패`, 'error')
        } else if (data) {
          setDocs((prev) => [...prev, data])
          setSelectedId(data.id)
          showToast(`"${file.name}" 업로드 완료`, 'success')
        }
      }
      reader.readAsText(file, 'utf-8')
    })
  }

  const downloadDoc = (doc: Document) => {
    const blob = new Blob([doc.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full rounded-3xl shadow-2xl overflow-hidden flex animate-slide-up"
        style={{
          maxWidth: '960px',
          maxHeight: '88vh',
          background: 'var(--dm-surface-modal)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.9)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Sidebar ── */}
        <div
          className="w-56 flex-shrink-0 flex flex-col border-r border-sky-300/50"
          style={{ background: 'var(--dm-surface-card)' }}
        >
          {/* Sidebar header */}
          <div className="px-4 py-4 border-b border-sky-300/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-sky-900 font-bold text-sm">문서 가이드</span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setIsCreating(true); setNewDocName('') }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                새 문서
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="파일 업로드"
                className="p-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-900 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* New doc name input */}
          {isCreating && (
            <div className="px-3 py-2 border-b border-sky-300/50 bg-sky-50">
              <input
                autoFocus
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createDoc()
                  if (e.key === 'Escape') setIsCreating(false)
                }}
                placeholder="파일명.md"
                className="w-full text-xs bg-white border border-sky-200 rounded-lg px-2 py-1.5 outline-none focus:border-sky-400 text-sky-900"
              />
              <div className="flex gap-1 mt-1.5">
                <button onClick={createDoc} className="flex-1 text-xs py-1 rounded bg-sky-500 text-white font-medium hover:bg-sky-400 transition-all">생성</button>
                <button onClick={() => setIsCreating(false)} className="flex-1 text-xs py-1 rounded bg-sky-100 text-sky-900 hover:bg-sky-200 transition-all">취소</button>
              </div>
            </div>
          )}

          {/* Doc list */}
          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <div className="px-4 py-6 text-center text-xs text-sky-700">불러오는 중...</div>
            ) : docs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl mb-2">📂</p>
                <p className="text-xs text-sky-700">문서가 없습니다.<br />새 문서를 만들거나<br />파일을 업로드하세요.</p>
              </div>
            ) : (
              docs.map((doc) => (
                <div
                  key={doc.id}
                  className={`group mx-2 mb-0.5 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                    selectedId === doc.id
                      ? 'bg-white shadow-sm border border-sky-300/50'
                      : 'hover:bg-white/60'
                  }`}
                  onClick={() => handleSelect(doc)}
                >
                  {/* 파일명 행 */}
                  <div className="flex items-center gap-2">
                    <svg className={`w-3.5 h-3.5 flex-shrink-0 ${selectedId === doc.id ? 'text-sky-800' : 'text-sky-700'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className={`text-xs font-semibold truncate flex-1 ${selectedId === doc.id ? 'text-sky-800' : 'text-sky-700'}`}>{doc.name}</span>
                    {deleteTarget === doc.id ? (
                      <div className="flex gap-0.5 flex-shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id) }} className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold">삭제</button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(null) }} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-900">취소</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc.id) }}
                        className="opacity-0 group-hover:opacity-100 text-sky-700 hover:text-red-400 transition-all flex-shrink-0"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* 설명 행 */}
                  <div className="ml-5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                    {editingDescId === doc.id ? (
                      <input
                        ref={descInputRef}
                        value={descInput}
                        onChange={(e) => setDescInput(e.target.value)}
                        onBlur={() => saveDesc(doc.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveDesc(doc.id)
                          if (e.key === 'Escape') setEditingDescId(null)
                        }}
                        placeholder="설명 입력..."
                        className="w-full text-[10px] bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5 outline-none focus:border-sky-400 text-sky-700"
                      />
                    ) : (
                      <button
                        onClick={(e) => startEditDesc(doc, e)}
                        className="text-[10px] text-left w-full truncate transition-colors"
                        style={{ color: doc.description ? '#0ea5e9' : 'rgba(148,163,184,0.7)' }}
                        title="클릭하여 설명 편집"
                      >
                        {doc.description || '설명 추가...'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Content header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sky-300/50 flex-shrink-0">
            {isEditing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 text-sky-900 font-bold text-base bg-transparent outline-none border-b border-sky-300 focus:border-sky-500 mr-4 py-0.5"
              />
            ) : (
              <h2 className="text-sky-900 font-bold text-base truncate flex-1 mr-4">
                {selectedDoc?.name ?? '문서를 선택하세요'}
              </h2>
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              {selectedDoc && !isEditing && (
                <>
                  <button
                    onClick={() => downloadDoc(selectedDoc)}
                    title="다운로드"
                    className="p-2 rounded-lg text-sky-700 hover:text-sky-700 hover:bg-sky-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-sky-700 hover:text-sky-900 bg-sky-100 hover:bg-sky-200 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    편집
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 rounded-lg text-sm text-sky-900 hover:bg-sky-100 transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        저장 중...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        저장
                      </>
                    )}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sky-700 hover:text-sky-700 hover:bg-sky-100 transition-all text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content body */}
          <div className="flex-1 overflow-y-auto">
            {!selectedDoc ? (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <div className="text-5xl mb-4">📄</div>
                <p className="text-sky-900 font-semibold mb-1">문서를 선택하거나 만들어보세요</p>
                <p className="text-sky-700 text-sm">좌측에서 문서를 선택하거나 .md 파일을 업로드하세요</p>
              </div>
            ) : isEditing ? (
              <div className="h-full p-6">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Markdown으로 작성하세요..."
                  className="w-full h-full min-h-[400px] bg-sky-50/60 border border-sky-200 rounded-xl px-4 py-3 text-sky-900 font-mono text-sm outline-none resize-none focus:border-sky-400 focus:bg-white transition-all"
                  style={{ minHeight: 'calc(88vh - 160px)' }}
                />
              </div>
            ) : (
              <div className="px-8 py-6">
                {selectedDoc.content ? (
                  <div className="prose-dark max-w-none">
                    <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-4xl mb-3">✏️</div>
                    <p className="text-sky-800 text-sm">문서가 비어 있습니다.</p>
                    <button
                      onClick={startEdit}
                      className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-sky-100 text-sky-700 hover:bg-sky-200 transition-all"
                    >
                      편집 시작
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
