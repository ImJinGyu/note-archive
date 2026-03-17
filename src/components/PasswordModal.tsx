'use client'

import { useState } from 'react'

interface PasswordModalProps {
  noteTitle: string
  noteIcon: string
  confirmLabel?: string
  onConfirm: (password: string) => Promise<boolean>
  onClose: () => void
}

export default function PasswordModal({ noteTitle, noteIcon, confirmLabel = '열기', onConfirm, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    const success = await onConfirm(password)
    if (!success) {
      setError('비밀번호가 올바르지 않습니다.')
      setPassword('')
    }
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay bg-black/70">
      <div
        className="glass-panel rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex flex-col items-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-3xl mb-3">
            {noteIcon}
          </div>
          <div className="text-center">
            <h2 className="text-sky-950 font-semibold text-lg">{noteTitle}</h2>
            <p className="text-sky-600 text-sm mt-1 flex items-center justify-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              이 노트는 잠겨 있습니다
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="비밀번호 입력..."
              autoFocus
              className={`w-full bg-white border rounded-lg px-4 py-3 text-sky-900 placeholder-sky-400 outline-none transition-all ${
                error
                  ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : 'border-sky-200 focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]'
              }`}
            />
            {error && (
              <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border-2 border-sky-400 text-sky-800 bg-white/40 hover:bg-white/70 hover:border-sky-500 hover:text-sky-950 transition-all font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  확인 중...
                </span>
              ) : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
