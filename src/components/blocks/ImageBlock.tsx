'use client'

import { useState, useEffect, useRef } from 'react'

export type ImageContent = {
  dataUrl: string
  caption: string
  alt: string
}

interface ImageBlockProps {
  content: ImageContent
  isEditing: boolean
  onChange: (content: ImageContent) => void
}

export default function ImageBlock({ content, isEditing, onChange }: ImageBlockProps) {
  const [localContent, setLocalContent] = useState<ImageContent>({
    dataUrl: content.dataUrl || '',
    caption: content.caption || '',
    alt: content.alt || '',
  })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalContent({
      dataUrl: content.dataUrl || '',
      caption: content.caption || '',
      alt: content.alt || '',
    })
  }, [content])

  const update = (partial: Partial<ImageContent>) => {
    const next = { ...localContent, ...partial }
    setLocalContent(next)
    onChange(next)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      update({ dataUrl, alt: file.name })
    }
    reader.readAsDataURL(file)
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        {/* 이미지 선택 영역 */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-sky-300/70 rounded-xl p-6 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-all"
        >
          {localContent.dataUrl ? (
            <img
              src={localContent.dataUrl}
              alt={localContent.alt || '업로드된 이미지'}
              className="max-w-full max-h-64 rounded-lg object-contain mx-auto block mb-2"
            />
          ) : (
            <>
              <div className="text-4xl mb-2">🖼️</div>
              <p className="text-sky-700 text-sm">
                이미지를 <span className="text-sky-800 font-medium">클릭하여 선택</span>
              </p>
              <p className="text-sky-500 text-xs mt-1">JPG, PNG, GIF, WebP 등 지원</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {localContent.dataUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-sky-600 hover:text-sky-800 underline transition-colors"
          >
            이미지 변경
          </button>
        )}

        {/* 캡션 입력 */}
        <input
          type="text"
          value={localContent.caption}
          onChange={(e) => update({ caption: e.target.value })}
          placeholder="이미지 캡션 (선택사항)"
          className="w-full px-3 py-2 rounded-lg border border-sky-200 bg-white/70 text-sky-900 text-sm placeholder-sky-300 outline-none focus:border-sky-400 transition-colors"
        />
      </div>
    )
  }

  // 뷰 모드
  if (!localContent.dataUrl) {
    return (
      <div className="text-sky-700 text-sm italic py-4 text-center">
        이미지가 없습니다. 편집 모드에서 추가해주세요.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <img
          src={localContent.dataUrl}
          alt={localContent.alt || localContent.caption || '이미지'}
          onClick={() => setLightboxOpen(true)}
          className="max-w-full max-h-96 rounded-xl object-contain mx-auto block cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
        />
        {localContent.caption && (
          <p className="text-center text-sky-600 text-sm italic">{localContent.caption}</p>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={localContent.dataUrl}
              alt={localContent.alt || localContent.caption || '이미지'}
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />
            {localContent.caption && (
              <p className="text-center text-white/80 text-sm mt-2">{localContent.caption}</p>
            )}
          </div>
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none transition-colors"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
