'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleReset = async () => {
    setError('')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다.')
    if (password !== confirm) return setError('비밀번호가 일치하지 않습니다.')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(error.message)

    setDone(true)
    setTimeout(() => router.push('/'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className="rounded-2xl p-8 max-w-md w-full shadow-xl"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)' }}
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔑</div>
          <h2 className="text-sky-950 font-bold text-xl">비밀번호 재설정</h2>
        </div>

        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-emerald-600 font-semibold">비밀번호가 변경되었습니다.</p>
            <p className="text-sky-800 text-sm mt-1">잠시 후 메인으로 이동합니다...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder="새 비밀번호 (6자 이상)"
              className="w-full bg-white border border-sky-200 rounded-xl px-4 py-3 text-sky-900 outline-none focus:border-sky-400 transition-colors"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError('') }}
              placeholder="새 비밀번호 확인"
              className="w-full bg-white border border-sky-200 rounded-xl px-4 py-3 text-sky-900 outline-none focus:border-sky-400 transition-colors"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-60"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
            <Link href="/" className="block text-center text-sky-800 text-sm hover:text-sky-700 transition-colors">
              ← 메인으로
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
