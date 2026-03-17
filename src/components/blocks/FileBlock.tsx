'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { FileContent, FileItem } from '@/lib/supabase'

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼️'
  if (type.startsWith('video/')) return '🎬'
  if (type.startsWith('audio/')) return '🎵'
  if (type === 'application/pdf') return '📄'
  if (type.includes('word') || type.includes('document')) return '📝'
  if (type.includes('excel') || type.includes('spreadsheet')) return '📊'
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return '🗜️'
  if (type.startsWith('text/')) return '📃'
  return '📎'
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

const PREVIEWABLE_EXTS = ['md', 'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts']

function canPreview(file: FileItem): boolean {
  return (
    file.type.startsWith('image/') ||
    file.type === 'application/pdf' ||
    file.type.startsWith('text/') ||
    PREVIEWABLE_EXTS.includes(getFileExtension(file.name))
  )
}

function PdfPreview({ dataUrl }: { dataUrl: string }) {
  const blobUrl = useMemo(() => {
    try {
      const base64 = dataUrl.split(',')[1]
      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      return URL.createObjectURL(blob)
    } catch {
      return null
    }
  }, [dataUrl])

  useEffect(() => {
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [blobUrl])

  if (!blobUrl) return <div className="p-3 text-center text-sm text-sky-400 italic">PDF를 불러올 수 없습니다.</div>

  return (
    <div className="p-3">
      <iframe src={blobUrl} className="w-full rounded-lg border border-sky-200" style={{ height: '500px' }} title="PDF 미리보기" />
    </div>
  )
}

function FilePreview({ file }: { file: FileItem }) {
  const ext = getFileExtension(file.name)

  if (file.type.startsWith('image/')) {
    return (
      <div className="p-3">
        <img src={file.dataUrl} alt={file.name} className="max-w-full max-h-96 rounded-lg object-contain mx-auto block" />
      </div>
    )
  }

  if (file.type === 'application/pdf') {
    return <PdfPreview dataUrl={file.dataUrl} />
  }

  if (file.type.startsWith('text/') || PREVIEWABLE_EXTS.includes(ext)) {
    let textContent = ''
    try {
      const base64 = file.dataUrl.split(',')[1]
      const binaryStr = atob(base64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
      }
      textContent = new TextDecoder('utf-8').decode(bytes)
    } catch {
      textContent = '파일 내용을 읽을 수 없습니다.'
    }
    return (
      <div className="p-3">
        <pre className="text-xs text-sky-900 bg-sky-50 p-3 rounded-lg overflow-auto max-h-60 border border-sky-200 whitespace-pre-wrap break-words">
          {textContent}
        </pre>
      </div>
    )
  }

  return <div className="p-3 text-center text-sm text-sky-400 italic">미리보기를 지원하지 않는 파일 형식입니다</div>
}

interface FileBlockProps {
  content: FileContent
  isEditing: boolean
  onChange: (content: FileContent) => void
}

export default function FileBlock({ content, isEditing, onChange }: FileBlockProps) {
  const [localFiles, setLocalFiles] = useState<FileItem[]>(content.files || [])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalFiles(content.files || [])
  }, [content])

  const updateFiles = (files: FileItem[]) => {
    setLocalFiles(files)
    onChange({ files })
  }

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    Array.from(newFiles).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        const fileItem: FileItem = { name: file.name, size: file.size, type: file.type, dataUrl, showPreview: false }
        setLocalFiles((prev) => {
          const updated = [...prev, fileItem]
          onChange({ files: updated })
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    updateFiles(localFiles.filter((_, i) => i !== index))
  }

  const togglePreview = (index: number) => {
    updateFiles(localFiles.map((f, i) => i === index ? { ...f, showPreview: !f.showPreview } : f))
  }

  const downloadFile = (file: FileItem) => {
    const link = document.createElement('a')
    link.href = file.dataUrl
    link.download = file.name
    link.click()
  }

  if (isEditing) {
    return (
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-sky-300/70 hover:border-sky-400 hover:bg-sky-50/50'
          }`}
        >
          <div className="text-3xl mb-2">📁</div>
          <p className="text-sky-700 text-sm">파일을 드래그하거나 <span className="text-sky-500 font-medium">클릭하여 업로드</span></p>
          <p className="text-sky-400 text-xs mt-1">모든 파일 형식 지원</p>
          <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
        </div>

        {localFiles.length > 0 && (
          <div className="space-y-2">
            {localFiles.map((file, index) => (
              <div key={index} className="bg-sky-50/60 border border-sky-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <span className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sky-900 text-sm font-medium truncate">{file.name}</p>
                    <p className="text-sky-400 text-xs">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canPreview(file) && (
                      <button
                        type="button"
                        onClick={() => togglePreview(index)}
                        className="text-xs text-sky-600 hover:text-sky-800 transition-colors px-2 py-1 rounded bg-sky-100 border border-sky-200"
                      >
                        {file.showPreview ? '닫기' : '미리보기'}
                      </button>
                    )}
                    <button type="button" onClick={() => removeFile(index)} className="text-sky-400 hover:text-red-400 transition-colors p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {file.showPreview && (
                  <div className="border-t border-sky-200 bg-white/50">
                    <FilePreview file={file} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!localFiles.length) {
    return <div className="text-sky-400 text-sm italic py-4 text-center">파일이 없습니다. 편집 모드에서 추가해주세요.</div>
  }

  return (
    <div className="space-y-3">
      {localFiles.map((file, index) => (
        <div key={index} className="bg-sky-50/60 border border-sky-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 p-3">
            <span className="text-2xl flex-shrink-0">{getFileIcon(file.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sky-900 text-sm font-medium truncate">{file.name}</p>
              <p className="text-sky-400 text-xs">{formatFileSize(file.size)} · {file.type || '알 수 없는 형식'}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {canPreview(file) && (
                <button
                  onClick={() => togglePreview(index)}
                  className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors px-2 py-1 rounded bg-sky-100 border border-sky-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {file.showPreview ? '닫기' : '미리보기'}
                </button>
              )}
              <button
                onClick={() => downloadFile(file)}
                className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors px-2 py-1 rounded bg-sky-100 border border-sky-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                다운로드
              </button>
            </div>
          </div>
          {file.showPreview && (
            <div className="border-t border-sky-200 bg-white/50">
              <FilePreview file={file} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
