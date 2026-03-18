'use client'

import { useState, useEffect } from 'react'
import {
  Folder,
  getFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  addNoteToFolder,
  removeNoteFromFolder,
} from '@/lib/folders'
import { Note } from '@/lib/supabase'

interface FolderModalProps {
  isOpen: boolean
  notes: Note[]
  onClose: () => void
  onFoldersChange: () => void
}

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📚', '📖', '🗃️', '💼', '🎯', '⭐', '🔖', '🏷️', '📌']

export default function FolderModal({ isOpen, notes, onClose, onFoldersChange }: FolderModalProps) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📁')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFolders(getFolders())
    }
  }, [isOpen])

  const refresh = () => {
    const updated = getFolders()
    setFolders(updated)
    onFoldersChange()
  }

  const handleCreate = () => {
    if (!newName.trim()) return
    createFolder(newName.trim(), newIcon)
    setNewName('')
    setNewIcon('📁')
    refresh()
  }

  const handleRename = (id: string) => {
    if (!editingName.trim()) return
    renameFolder(id, editingName.trim())
    setEditingId(null)
    setEditingName('')
    refresh()
  }

  const handleDelete = (id: string) => {
    deleteFolder(id)
    if (expandedId === id) setExpandedId(null)
    refresh()
  }

  const handleToggleNote = (folderId: string, noteId: string, isInFolder: boolean) => {
    if (isInFolder) {
      removeNoteFromFolder(folderId, noteId)
    } else {
      addNoteToFolder(folderId, noteId)
    }
    refresh()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        style={{ background: 'var(--dm-surface-modal)', backdropFilter: 'blur(20px)', border: '1px solid var(--dm-border)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-100/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🗂️</span>
            <h2 className="text-base font-bold text-sky-900">폴더 관리</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-sky-100/60 text-sky-600 hover:text-sky-800 transition-all text-lg"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* 새 폴더 만들기 */}
          <div>
            <p className="text-xs font-semibold text-sky-700 mb-2">새 폴더 만들기</p>
            <div className="flex gap-2 items-center">
              {/* 아이콘 선택 */}
              <div className="relative group">
                <button
                  className="w-9 h-9 rounded-lg border border-sky-200 bg-white/70 flex items-center justify-center text-lg hover:bg-sky-50 transition-all"
                  title="아이콘 선택"
                >
                  {newIcon}
                </button>
                <div className="absolute left-0 top-full mt-1 z-10 hidden group-focus-within:flex group-hover:flex flex-wrap gap-1 p-2 rounded-xl shadow-xl bg-white/95 border border-sky-100 w-48">
                  {FOLDER_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setNewIcon(ic)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-base hover:bg-sky-100 transition-all ${newIcon === ic ? 'bg-sky-100 ring-2 ring-sky-400' : ''}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                placeholder="폴더 이름"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                className="flex-1 rounded-lg border border-sky-200 bg-white/70 px-3 py-2 text-sm text-sky-900 placeholder-sky-400 outline-none focus:border-sky-400 focus:bg-white/90 transition-all"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                추가
              </button>
            </div>
          </div>

          {/* 폴더 목록 */}
          {folders.length === 0 ? (
            <div className="text-center py-8 text-sky-700/60 text-sm">
              <div className="text-3xl mb-2">📂</div>
              아직 폴더가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-sky-700 mb-1">폴더 목록</p>
              {folders.map((folder) => (
                <div key={folder.id} className="rounded-xl border border-sky-100/80 bg-white/60 overflow-hidden">
                  {/* Folder row */}
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <span className="text-base">{folder.icon}</span>
                    {editingId === folder.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(folder.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="flex-1 rounded border border-sky-300 bg-white/80 px-2 py-1 text-sm text-sky-900 outline-none focus:border-sky-500"
                      />
                    ) : (
                      <span className="flex-1 text-sm font-semibold text-sky-900">{folder.name}</span>
                    )}
                    <span className="text-xs text-sky-600 bg-sky-100/60 px-1.5 py-0.5 rounded-full">{folder.noteIds.length}</span>

                    {editingId === folder.id ? (
                      <>
                        <button onClick={() => handleRename(folder.id)} className="text-xs text-sky-600 hover:text-sky-800 font-semibold transition-colors px-1">저장</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-sky-500 hover:text-sky-700 transition-colors px-1">취소</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setExpandedId(expandedId === folder.id ? null : folder.id)
                          }}
                          title="노트 관리"
                          className="p-1 rounded text-sky-500 hover:text-sky-700 hover:bg-sky-100/60 transition-all text-xs"
                        >
                          {expandedId === folder.id ? '▲' : '▼'}
                        </button>
                        <button
                          onClick={() => { setEditingId(folder.id); setEditingName(folder.name) }}
                          title="이름 변경"
                          className="p-1 rounded text-sky-500 hover:text-sky-700 hover:bg-sky-100/60 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(folder.id)}
                          title="폴더 삭제"
                          className="p-1 rounded text-sky-500 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Note list (expanded) */}
                  {expandedId === folder.id && (
                    <div className="border-t border-sky-100/60 px-3 py-2 space-y-1 max-h-48 overflow-y-auto">
                      <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-widest mb-1.5">노트 추가 / 제거</p>
                      {notes.length === 0 ? (
                        <p className="text-xs text-sky-500/70">노트가 없습니다.</p>
                      ) : (
                        notes.map((note) => {
                          const isInFolder = folder.noteIds.includes(note.id)
                          return (
                            <label key={note.id} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-sky-50/60 transition-all">
                              <input
                                type="checkbox"
                                checked={isInFolder}
                                onChange={() => handleToggleNote(folder.id, note.id, isInFolder)}
                                className="rounded border-sky-300 accent-sky-500"
                              />
                              <span className="text-sm">{note.icon}</span>
                              <span className="text-sm text-sky-900 truncate flex-1">{note.title}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-sky-100/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium rounded-xl bg-white/50 hover:bg-white/80 border border-sky-200 text-sky-700 transition-all"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
