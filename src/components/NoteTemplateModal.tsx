'use client'

import { useState, useEffect } from 'react'
import type { BlockType } from '@/lib/supabase'

export type NoteTemplateTab = {
  name: string
  blocks: Array<{
    type: BlockType
    title: string | null
    show_title: boolean
    content: Record<string, unknown>
  }>
}

export type NoteTemplate = {
  id: string
  name: string
  tabs: NoteTemplateTab[]
  createdAt: string
  // legacy fields (pre-multi-tab)
  tabName?: string
  blocks?: Array<{
    type: BlockType
    title: string | null
    show_title: boolean
    content: Record<string, unknown>
  }>
}

const BLOCK_ICON: Record<string, string> = {
  text: '📝', code: '💻', tip: '💡', steps: '🪜', table: '📊',
  checklist: '✅', file: '📎', keyword: '🔑', flow: '➡️',
  featurelist: '⭐', keyvalue: '🗝️', list: '📋',
  credential: '🔐', license: '🪪', link: '🔗',
}

const STORAGE_KEY = 'note-archive-templates'

export function loadTemplates(): NoteTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as NoteTemplate[]) : []
  } catch {
    return []
  }
}

export function saveTemplate(template: NoteTemplate) {
  try {
    const all = loadTemplates()
    all.unshift(template)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

export function deleteTemplate(id: string) {
  try {
    const all = loadTemplates().filter((t) => t.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {}
}

interface Props {
  onSelect: (template: NoteTemplate) => void
  onClose: () => void
}

export default function NoteTemplateModal({ onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([])
  const [selected, setSelected] = useState<NoteTemplate | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  const handleDelete = (id: string) => {
    deleteTemplate(id)
    setTemplates(loadTemplates())
    if (selected?.id === id) setSelected(null)
    setDeleteConfirm(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="glass-panel rounded-2xl p-6 w-full max-w-xl shadow-2xl mx-4" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-sky-900">템플릿 선택</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50 text-sky-500 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sky-800 font-medium">저장된 템플릿이 없습니다</p>
            <p className="text-xs text-sky-600 mt-1">노트 편집 모드에서 탭을 템플릿으로 저장할 수 있습니다.</p>
          </div>
        ) : (
          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* Template list */}
            <div className="w-48 flex-shrink-0 space-y-2 overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`group relative cursor-pointer rounded-xl px-3 py-2.5 transition-all border ${
                    selected?.id === t.id
                      ? 'bg-sky-100 border-sky-400 shadow-sm'
                      : 'bg-white/50 border-sky-200/60 hover:border-sky-300 hover:bg-sky-50/60'
                  }`}
                >
                  <p className="text-sm font-semibold text-sky-900 truncate pr-5">{t.name}</p>
                  <p className="text-xs text-sky-600 mt-0.5">
                    {t.tabs ? `${t.tabs.length}개 탭 · ${t.tabs.reduce((s, tab) => s + tab.blocks.length, 0)}개 블록` : `${t.blocks?.length ?? 0}개 블록 · ${t.tabName}`}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(t.id) }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-sky-400 hover:text-red-400 transition-all p-0.5"
                    title="삭제"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {deleteConfirm === t.id && (
                    <div
                      className="absolute inset-0 rounded-xl bg-red-50/95 border border-red-300 flex flex-col items-center justify-center gap-1.5 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs text-red-700 font-medium">삭제할까요?</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleDelete(t.id)} className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600">삭제</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-0.5 rounded bg-white border border-sky-300 text-sky-700 hover:bg-sky-50">취소</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Preview */}
            <div className="flex-1 overflow-y-auto">
              {selected ? (
                <div className="space-y-3">
                  {(selected.tabs ?? [{ name: selected.tabName ?? '탭', blocks: selected.blocks ?? [] }]).map((tab, ti) => (
                    <div key={ti}>
                      <p className="text-xs font-semibold text-sky-700 mb-1.5 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {tab.name} ({tab.blocks.length}개)
                      </p>
                      <div className="space-y-1 pl-2">
                        {tab.blocks.map((b, i) => (
                          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50/80 border border-sky-200/60">
                            <span className="text-sm flex-shrink-0">{BLOCK_ICON[b.type] ?? '📦'}</span>
                            <p className="text-xs font-medium text-sky-900">
                              {b.show_title && b.title ? b.title : b.type}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sky-600 text-sm">
                  템플릿을 선택하세요
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-5 pt-4 border-t border-sky-200/60">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-sky-300 text-sky-800 text-sm font-medium hover:bg-sky-50 transition-all">
            취소
          </button>
          <button
            onClick={() => { if (selected) { onSelect(selected); onClose() } }}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-40 hover:from-sky-400 hover:to-blue-500 transition-all"
          >
            이 템플릿으로 시작
          </button>
        </div>
      </div>
    </div>
  )
}
