'use client'

import { useState, useEffect, useRef } from 'react'
import type { BlockType } from '@/lib/supabase'

const BLOCK_TYPES: { type: BlockType; label: string; icon: string; description: string }[] = [
  { type: 'text',        label: '텍스트',    icon: '📝', description: 'Markdown 형식 텍스트' },
  { type: 'code',        label: '코드',      icon: '💻', description: '구문 강조 코드 블록' },
  { type: 'tip',         label: '팁',        icon: '💡', description: '아이콘과 항목 목록' },
  { type: 'steps',       label: '단계',      icon: '🪜', description: '번호가 있는 단계별 가이드' },
  { type: 'table',       label: '테이블',    icon: '📊', description: '동적 행/열 테이블' },
  { type: 'checklist',   label: '체크리스트',icon: '✅', description: '진행률 표시 체크리스트' },
  { type: 'image',       label: '이미지',    icon: '🖼️', description: '이미지 업로드 및 캡션' },
  { type: 'math',        label: '수식',      icon: '🔢', description: 'LaTeX 수식 렌더링' },
  { type: 'timer',       label: '타이머',    icon: '⏱️', description: '뽀모도로 집중 타이머' },
  { type: 'poll',        label: '투표',      icon: '🗳️', description: '선택지 투표 및 결과 시각화' },
  { type: 'mindmap',     label: '마인드맵',  icon: '🗺️', description: '계층적 마인드맵 다이어그램' },
  { type: 'embed',       label: '임베드',    icon: '🔗', description: 'YouTube·Gist·링크 임베드' },
  { type: 'keyword',     label: '키워드',    icon: '🔑', description: '번호 + 키워드 + 예시 목록' },
  { type: 'flow',        label: '흐름도',    icon: '➡️', description: '가로 단계 흐름 다이어그램' },
  { type: 'featurelist', label: '기능 목록', icon: '⭐', description: '아이콘 + 번호 + 제목 + 설명' },
  { type: 'keyvalue',    label: 'Key-Value', icon: '🗝️', description: 'Key → Value 쌍 목록' },
  { type: 'list',        label: '리스트',    icon: '📋', description: '점/번호/화살표/체크 스타일 목록' },
  { type: 'credential',  label: '계정정보',  icon: '🔐', description: 'URL / ID / PW 저장 + 복사' },
  { type: 'license',     label: '자격/면허', icon: '🪪', description: '자격증 및 면허 정보 관리' },
  { type: 'link',        label: '노트 링크', icon: '🔗', description: '다른 노트를 참조로 연결' },
  { type: 'ai_summary',  label: 'AI 요약',   icon: '🤖', description: 'Claude AI가 탭 내용을 요약' },
  { type: 'file',        label: '파일',      icon: '📎', description: '파일 첨부 및 미리보기' },
]

interface Props {
  query: string
  onSelect: (type: BlockType) => void
  onClose: () => void
  anchorRect?: DOMRect | null
}

export default function SlashCommand({ query, onSelect, onClose, anchorRect }: Props) {
  const [activeIdx, setActiveIdx] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = BLOCK_TYPES.filter(bt =>
    !query || bt.label.toLowerCase().includes(query.toLowerCase()) ||
    bt.type.toLowerCase().includes(query.toLowerCase()) ||
    bt.description.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => { setActiveIdx(0) }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIdx]) onSelect(filtered[activeIdx].type)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filtered, activeIdx, onSelect, onClose])

  // 활성 항목 스크롤
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  if (filtered.length === 0) return null

  const style: React.CSSProperties = anchorRect
    ? { position: 'fixed', top: anchorRect.bottom + 4, left: anchorRect.left, zIndex: 9999 }
    : { position: 'relative' }

  return (
    <div
      style={style}
      className="w-72 rounded-2xl shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.preventDefault()}
    >
      <div
        ref={listRef}
        className="max-h-72 overflow-y-auto"
        style={{ background: 'var(--dm-surface-modal)', border: '1px solid var(--dm-border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="px-3 py-2 border-b border-sky-100">
          <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-widest">블록 유형 선택 / ↑↓ 탐색 / Enter 선택</p>
        </div>
        {filtered.map((bt, i) => (
          <button
            key={bt.type}
            onClick={() => onSelect(bt.type)}
            onMouseEnter={() => setActiveIdx(i)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
              i === activeIdx ? 'bg-sky-100' : 'hover:bg-sky-50'
            }`}
          >
            <span className="text-lg w-8 h-8 flex items-center justify-center rounded-lg bg-sky-100 flex-shrink-0">{bt.icon}</span>
            <div>
              <p className="text-sm font-medium text-sky-900">{bt.label}</p>
              <p className="text-xs text-sky-500">{bt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
