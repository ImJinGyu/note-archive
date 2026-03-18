'use client'

import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setTimeout(() => setShowBanner(false), 2000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all"
      style={{
        background: isOnline
          ? 'rgba(16,185,129,0.95)'
          : 'rgba(239,68,68,0.95)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {isOnline ? (
        <>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-white">인터넷에 다시 연결됐습니다</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01M9.172 9.172A4 4 0 0112 8m0 0a4 4 0 012.828 1.172M12 8V4" />
          </svg>
          <span className="text-white">오프라인 상태입니다. 저장 기능이 제한됩니다.</span>
        </>
      )}
    </div>
  )
}
