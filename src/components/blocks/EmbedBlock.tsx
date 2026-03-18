'use client'

import { useState, useEffect } from 'react'

export type EmbedContent = {
  url: string
  embedType: 'youtube' | 'github-gist' | 'link'
  title?: string
  description?: string
  thumbnail?: string
}

interface EmbedBlockProps {
  content: EmbedContent
  isEditing: boolean
  onChange: (content: EmbedContent) => void
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v')
    }
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split('?')[0] || null
    }
  } catch {}
  return null
}

function detectEmbedType(url: string): EmbedContent['embedType'] {
  if (!url) return 'link'
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') return 'youtube'
    if (u.hostname === 'gist.github.com') return 'github-gist'
  } catch {}
  return 'link'
}

export default function EmbedBlock({ content, isEditing, onChange }: EmbedBlockProps) {
  const [localUrl, setLocalUrl] = useState(content.url || '')
  const [localEmbedType, setLocalEmbedType] = useState<EmbedContent['embedType']>(content.embedType || 'link')
  const [localTitle, setLocalTitle] = useState(content.title || '')
  const [localDescription, setLocalDescription] = useState(content.description || '')
  const [localThumbnail, setLocalThumbnail] = useState(content.thumbnail || '')

  useEffect(() => {
    setLocalUrl(content.url || '')
    setLocalEmbedType(content.embedType || 'link')
    setLocalTitle(content.title || '')
    setLocalDescription(content.description || '')
    setLocalThumbnail(content.thumbnail || '')
  }, [content])

  const buildContent = (overrides: Partial<EmbedContent> = {}): EmbedContent => ({
    url: localUrl,
    embedType: localEmbedType,
    title: localTitle,
    description: localDescription,
    thumbnail: localThumbnail,
    ...overrides,
  })

  const handleUrlChange = (url: string) => {
    const embedType = detectEmbedType(url)
    setLocalUrl(url)
    setLocalEmbedType(embedType)
    onChange(buildContent({ url, embedType }))
  }

  const handleFieldChange = (field: keyof EmbedContent, value: string) => {
    if (field === 'title') setLocalTitle(value)
    if (field === 'description') setLocalDescription(value)
    if (field === 'thumbnail') setLocalThumbnail(value)
    onChange(buildContent({ [field]: value }))
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <label className="text-xs text-sky-600 font-medium mb-1 block">URL</label>
          <input
            value={localUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... 또는 https://gist.github.com/..."
            className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
          />
        </div>
        {localUrl && (
          <div className="flex items-center gap-2 text-xs text-sky-600 bg-sky-50/60 rounded-lg px-3 py-2 border border-sky-200">
            <span className="font-medium">감지된 유형:</span>
            <span className={`px-2 py-0.5 rounded-full font-semibold ${
              localEmbedType === 'youtube' ? 'bg-red-100 text-red-600' :
              localEmbedType === 'github-gist' ? 'bg-gray-100 text-gray-700' :
              'bg-sky-100 text-sky-700'
            }`}>
              {localEmbedType === 'youtube' ? 'YouTube' : localEmbedType === 'github-gist' ? 'GitHub Gist' : '링크'}
            </span>
          </div>
        )}
        {localEmbedType === 'link' && (
          <>
            <div>
              <label className="text-xs text-sky-600 font-medium mb-1 block">제목 (선택)</label>
              <input
                value={localTitle}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="링크 제목"
                className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-sky-600 font-medium mb-1 block">설명 (선택)</label>
              <input
                value={localDescription}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="링크 설명"
                className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-sky-600 font-medium mb-1 block">썸네일 URL (선택)</label>
              <input
                value={localThumbnail}
                onChange={(e) => handleFieldChange('thumbnail', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full bg-white/70 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400"
              />
            </div>
          </>
        )}
      </div>
    )
  }

  if (!localUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-sky-400">
        <span className="text-3xl mb-2">🔗</span>
        <p className="text-sm">URL을 입력하세요</p>
      </div>
    )
  }

  // YouTube
  if (localEmbedType === 'youtube') {
    const videoId = extractYoutubeId(localUrl)
    if (!videoId) {
      return (
        <div className="text-sm text-sky-600 bg-sky-50 rounded-xl p-4 border border-sky-200">
          YouTube 영상 ID를 추출할 수 없습니다. URL을 확인해 주세요.
        </div>
      )
    }
    return (
      <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
          style={{ border: 'none', display: 'block' }}
        />
      </div>
    )
  }

  // GitHub Gist
  if (localEmbedType === 'github-gist') {
    return (
      <div className="rounded-xl overflow-hidden border border-sky-200" style={{ height: 400 }}>
        <iframe
          src={localUrl}
          title="GitHub Gist"
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full"
          style={{ border: 'none', display: 'block' }}
        />
      </div>
    )
  }

  // Link card
  return (
    <a
      href={localUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-4 p-4 rounded-xl border border-sky-200 bg-white/60 hover:bg-sky-50/60 hover:border-sky-300 transition-all group"
    >
      {localThumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localThumbnail}
          alt={localTitle || 'thumbnail'}
          className="w-20 h-20 object-cover rounded-lg border border-sky-100 flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      )}
      <div className="flex-1 min-w-0">
        {localTitle ? (
          <p className="text-sm font-semibold text-sky-900 group-hover:text-sky-700 transition-colors truncate">{localTitle}</p>
        ) : (
          <p className="text-sm font-semibold text-sky-700 truncate">{localUrl}</p>
        )}
        {localDescription && (
          <p className="text-xs text-sky-600 mt-1 line-clamp-2">{localDescription}</p>
        )}
        <p className="text-xs text-sky-400 mt-1.5 truncate">{localUrl}</p>
      </div>
      <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5 group-hover:text-sky-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}
