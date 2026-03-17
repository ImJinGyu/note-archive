'use client'
import { useState, useEffect } from 'react'
import { signIn, signUp } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

interface AuthModalProps {
  isOpen: boolean
  initialTab?: 'login' | 'signup'
  onClose: () => void
  onSuccess: () => void
}

export default function AuthModal({ isOpen, initialTab = 'login', onClose, onSuccess }: AuthModalProps) {
  const { showToast } = useToast()
  const [mode, setMode] = useState<'login' | 'signup'>(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // initialTab이 바뀌면 mode도 동기화
  useEffect(() => {
    setMode(initialTab)
    setError('')
    setEmail('')
    setPassword('')
  }, [initialTab, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('올바른 이메일 형식을 입력해주세요.'); return }
    if (password.length < 6) { setError('비밀번호는 최소 6자 이상이어야 합니다.'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password)
        if (err) throw err
        if (!rememberMe) {
          // 자동 로그인 해제 시 세션 토큰을 sessionStorage로 이동 (브라우저 종료 시 만료)
          const key = Object.keys(localStorage).find(k => k.includes('supabase') && k.includes('auth'))
          if (key) {
            sessionStorage.setItem(key, localStorage.getItem(key) ?? '')
            localStorage.removeItem(key)
          }
        }
        showToast('로그인되었습니다!', 'success')
        onSuccess()
        onClose()
      } else {
        const { error: err } = await signUp(email, password)
        if (err) throw err
        showToast('회원가입 완료! 이메일을 확인해주세요.', 'success')
        setMode('login')
        setPassword('')
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? '오류가 발생했습니다.'
      setError(
        msg === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않습니다.' :
        msg === 'User already registered' ? '이미 가입된 이메일입니다.' : msg
      )
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative"
        style={{ background: 'rgba(255, 255, 255, 0.22)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.45)' }}
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-xl leading-none"
        >
          ×
        </button>

        {/* 로고 */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
            📝
          </div>
          <h2 className="text-xl font-bold text-white drop-shadow">Note Archive</h2>
          <p className="text-sm text-white/80 mt-1 drop-shadow">나만의 지식 창고</p>
        </div>

        {/* 타이틀 */}
        <h3 className="text-lg font-bold text-white drop-shadow mb-5 text-center">
          {isLogin ? '로그인' : '회원가입'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 */}
          <div>
            <label className="block text-sm font-semibold text-white drop-shadow mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-sky-950 placeholder-sky-400/70 outline-none focus:border-sky-400 focus:bg-white/70 transition-all"
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-white drop-shadow mb-1.5">비밀번호</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isLogin ? '비밀번호 입력' : '최소 6자 이상'}
                className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 pr-11 text-sky-950 placeholder-sky-400/70 outline-none focus:border-sky-400 focus:bg-white/70 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPwd
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  }
                </svg>
              </button>
            </div>
          </div>

          {/* 에러 */}
          {error && (
            <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* 자동 로그인 (로그인 탭에서만) */}
          {isLogin && (
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                  rememberMe
                    ? 'bg-sky-500 border-sky-500'
                    : 'bg-transparent border-white/30 group-hover:border-white/60'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-white font-medium drop-shadow">
                자동 로그인 <span className="text-white/70 text-xs font-normal">(로그인 상태 유지)</span>
              </span>
            </label>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-sky-900/40 transition-all disabled:opacity-60 mt-2"
          >
            {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
          </button>
        </form>

        {/* 하단 전환 링크 */}
        <p className="text-center text-sm text-white/80 drop-shadow mt-5">
          {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
          <button
            onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError('') }}
            className="text-white font-bold underline underline-offset-2 hover:text-sky-200 transition-colors"
          >
            {isLogin ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}
