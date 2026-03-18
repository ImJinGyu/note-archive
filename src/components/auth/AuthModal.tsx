'use client'
import { useState, useEffect, useRef } from 'react'
import { signIn, signUp, supabase } from '@/lib/supabase'
import { translateError } from '@/lib/authErrors'
import { useToast } from '@/components/ui/Toast'

interface AuthModalProps {
  isOpen: boolean
  initialTab?: 'login' | 'signup'
  onClose: () => void
  onSuccess: () => void
}

type Step = 'credentials' | 'mfa' | 'forgot'

// ── Rate limiting (localStorage) ────────────────────────────────────────────
const RL_KEY = 'rl_login'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

function getRateLimit(email: string) {
  try {
    const store = JSON.parse(localStorage.getItem(RL_KEY) || '{}')
    return store[email] ?? { count: 0, lockedUntil: null }
  } catch { return { count: 0, lockedUntil: null } }
}

function setRateLimit(email: string, count: number, lockedUntil: number | null) {
  try {
    const store = JSON.parse(localStorage.getItem(RL_KEY) || '{}')
    store[email] = { count, lockedUntil }
    localStorage.setItem(RL_KEY, JSON.stringify(store))
  } catch { /* noop */ }
}

function clearRateLimit(email: string) {
  try {
    const store = JSON.parse(localStorage.getItem(RL_KEY) || '{}')
    delete store[email]
    localStorage.setItem(RL_KEY, JSON.stringify(store))
  } catch { /* noop */ }
}

function ModalCard({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="rounded-3xl shadow-2xl p-8 max-w-md w-full animate-slide-up relative"
        style={{ background: 'rgba(255, 255, 255, 0.22)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.45)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all text-xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  )
}

export default function AuthModal({ isOpen, initialTab = 'login', onClose, onSuccess }: AuthModalProps) {
  const { showToast } = useToast()
  const [mode, setMode] = useState<'login' | 'signup'>(initialTab)
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  // MFA
  const [mfaFactorId, setMfaFactorId] = useState('')
  const [mfaChallengeId, setMfaChallengeId] = useState('')
  const [totpCode, setTotpCode] = useState('')

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  // Lockout countdown
  const [lockoutSec, setLockoutSec] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMode(initialTab)
    setStep('credentials')
    setError('')
    setEmail('')
    setPassword('')
    setTotpCode('')
    setForgotSent(false)
    setLockoutSec(0)
    setEmailNotConfirmed(false)
    setResendSent(false)
  }, [initialTab, isOpen])

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSec > 0) {
      timerRef.current = setInterval(() => {
        setLockoutSec((s) => {
          if (s <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setError('')
            return 0
          }
          return s - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [lockoutSec])

  // MFA step에서 닫기 시 AAL1 세션 강제 제거
  const handleClose = async () => {
    if (step === 'mfa') {
      await supabase.auth.signOut()
      setStep('credentials')
    }
    onClose()
  }

  if (!isOpen) return null

  // ── 로그인 제출 ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('올바른 이메일 형식을 입력해주세요.'); return }
    if (password.length < 6) { setError('비밀번호는 최소 6자 이상이어야 합니다.'); return }

    // Rate limit check
    const rl = getRateLimit(email)
    if (rl.lockedUntil && Date.now() < rl.lockedUntil) {
      const remaining = Math.ceil((rl.lockedUntil - Date.now()) / 1000)
      setLockoutSec(remaining)
      const min = Math.ceil(remaining / 60)
      setError(`로그인이 잠겼습니다. 약 ${min}분 후 다시 시도하세요.`)
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        // 로그인 전에 remember_me 플래그 설정 — storage adapter가 이 값을 보고 세션 저장 위치 결정
        localStorage.setItem('remember_me', rememberMe ? 'true' : 'false')

        const { error: err } = await signIn(email, password)
        if (err) {
          // 이메일 미인증 처리
          if (err.message === 'Email not confirmed') {
            setEmailNotConfirmed(true)
            setError('이메일 인증이 완료되지 않았습니다. 가입 시 받은 인증 메일을 확인해주세요.')
            setLoading(false)
            return
          }
          // Rate limit 업데이트
          const newCount = (rl.count ?? 0) + 1
          if (newCount >= MAX_ATTEMPTS) {
            const lockedUntil = Date.now() + LOCKOUT_MS
            setRateLimit(email, newCount, lockedUntil)
            const min = LOCKOUT_MS / 60000
            setError(`로그인 ${MAX_ATTEMPTS}회 실패로 ${min}분간 잠깁니다.`)
            setLockoutSec(LOCKOUT_MS / 1000)
          } else {
            setRateLimit(email, newCount, null)
              setError(`${translateError(err.message)} (${newCount}/${MAX_ATTEMPTS}회 실패)`)
          }
          setLoading(false)
          return
        }

        // 로그인 성공 → rate limit 초기화
        clearRateLimit(email)

        // MFA 확인
        const { data: factorsData } = await supabase.auth.mfa.listFactors()
        const verifiedFactor = factorsData?.totp?.find((f) => f.status === 'verified')
        if (verifiedFactor) {
          const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: verifiedFactor.id })
          if (!challengeErr && challenge) {
            setMfaFactorId(verifiedFactor.id)
            setMfaChallengeId(challenge.id)
            setStep('mfa')
            setLoading(false)
            return
          }
        }

        showToast('로그인되었습니다!', 'success')
        onSuccess()
        onClose()
      } else {
        // 회원가입
        const { data: signUpData, error: err } = await signUp(email, password)
        if (err) throw err
        // identities가 비어있으면 이미 가입된 이메일 (Supabase 이메일 인증 활성 시 동작)
        if (signUpData.user && signUpData.user.identities?.length === 0) {
          setError('이미 가입된 이메일입니다.')
          setLoading(false)
          return
        }
        showToast('회원가입 완료! 인증 메일을 확인해주세요.', 'success')
        setMode('login')
        setPassword('')
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? '오류가 발생했습니다.'
      setError(translateError(msg))
    } finally {
      setLoading(false)
    }
  }

  // ── MFA 검증 ─────────────────────────────────────────────────────────────
  const handleMFAVerify = async () => {
    if (totpCode.length !== 6) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code: totpCode,
      })
      if (error) { setError('인증 코드가 올바르지 않습니다.'); return }
      showToast('로그인되었습니다!', 'success')
      onSuccess()
      onClose()
    } catch (e) {
      console.error('MFA verify error:', e)
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // ── 비밀번호 찾기 ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!forgotEmail || !/\S+@\S+\.\S+/.test(forgotEmail)) {
      setError('올바른 이메일을 입력해주세요.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setForgotSent(true)
  }

  const handleResendConfirmation = async () => {
    setResendLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendLoading(false)
    if (error) { setError(error.message); return }
    setResendSent(true)
  }

  const isLogin = mode === 'login'

  // ── MFA 화면 ─────────────────────────────────────────────────────────────
  if (step === 'mfa') {
    return (
      <ModalCard onClose={handleClose}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h3 className="text-lg font-bold text-white drop-shadow">2단계 인증</h3>
          <p className="text-sm text-white/70 mt-1">인증 앱에 표시된 6자리 코드를 입력하세요.</p>
        </div>
        <input
          type="text"
          value={totpCode}
          onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
          placeholder="000000"
          maxLength={6}
          autoFocus
          className="w-full bg-white/75 border border-sky-300/50 rounded-xl px-4 py-4 text-sky-950 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-sky-400 focus:bg-white/90 transition-all mb-4"
        />
        {error && <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2 mb-4">{error}</p>}
        <button
          onClick={handleMFAVerify}
          disabled={totpCode.length !== 6 || loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-lg disabled:opacity-60 transition-all"
        >
          {loading ? '확인 중...' : '인증'}
        </button>
        <button onClick={handleClose} className="w-full mt-3 text-sm text-white/70 hover:text-white transition-colors">
          ← 로그인으로 돌아가기
        </button>
      </ModalCard>
    )
  }

  // ── 비밀번호 찾기 화면 ────────────────────────────────────────────────────
  if (step === 'forgot') {
    return (
      <ModalCard onClose={handleClose}>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📧</div>
          <h3 className="text-lg font-bold text-white drop-shadow">비밀번호 재설정</h3>
          <p className="text-sm text-white/70 mt-1">가입한 이메일로 재설정 링크를 보내드립니다.</p>
        </div>
        {forgotSent ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-white font-semibold mb-1">이메일이 전송되었습니다!</p>
            <p className="text-white/70 text-sm">받은 편지함을 확인해주세요.</p>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <input
              type="email"
              value={forgotEmail}
              onChange={(e) => { setForgotEmail(e.target.value); setError('') }}
              placeholder="가입한 이메일 주소"
              className="w-full bg-white/75 border border-sky-300/50 rounded-xl px-4 py-3 text-sky-950 placeholder-sky-600 outline-none focus:border-sky-400 focus:bg-white/90 transition-all"
            />
            {error && <p className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-lg disabled:opacity-60 transition-all"
            >
              {loading ? '전송 중...' : '재설정 이메일 전송'}
            </button>
          </form>
        )}
        <button onClick={() => { setStep('credentials'); setForgotSent(false); setError('') }} className="w-full mt-4 text-sm text-white/70 hover:text-white transition-colors">
          ← 로그인으로 돌아가기
        </button>
      </ModalCard>
    )
  }

  // ── 로그인 / 회원가입 화면 ────────────────────────────────────────────────
  return (
    <ModalCard onClose={handleClose}>
      <div className="text-center mb-7">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
          📝
        </div>
        <h2 className="text-xl font-bold text-white drop-shadow">Note Archive</h2>
        <p className="text-sm text-white/80 mt-1 drop-shadow">나만의 스토리지</p>
      </div>

      <h3 className="text-lg font-bold text-white drop-shadow mb-5 text-center">
        {isLogin ? '로그인' : '회원가입'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-white drop-shadow mb-1.5">이메일</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            placeholder="example@email.com"
            className="w-full bg-white/75 border border-sky-300/50 rounded-xl px-4 py-3 text-sky-950 placeholder-sky-600 outline-none focus:border-sky-400 focus:bg-white/90 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white drop-shadow mb-1.5">비밀번호</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              placeholder={isLogin ? '비밀번호 입력' : '최소 6자 이상'}
              className="w-full bg-white/75 border border-sky-300/50 rounded-xl px-4 py-3 pr-11 text-sky-950 placeholder-sky-600 outline-none focus:border-sky-400 focus:bg-white/90 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-700 hover:text-sky-700 transition-colors"
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

        {error && (
          <div className="text-sm text-red-300 bg-red-900/30 border border-red-500/30 rounded-xl px-3 py-2">
            <p>{error}</p>
            {lockoutSec > 0 && (
              <span className="block text-xs mt-1 text-red-400">
                남은 시간: {Math.floor(lockoutSec / 60)}:{String(lockoutSec % 60).padStart(2, '0')}
              </span>
            )}
            {emailNotConfirmed && (
              <div className="mt-2 pt-2 border-t border-red-500/20">
                {resendSent ? (
                  <p className="text-xs text-green-300">✓ 인증 메일을 재전송했습니다. 받은 편지함을 확인해주세요.</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendLoading}
                    className="text-xs text-sky-300 hover:text-sky-200 underline underline-offset-2 transition-colors disabled:opacity-60"
                  >
                    {resendLoading ? '전송 중...' : '인증 메일 재전송'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isLogin && (
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
                  rememberMe ? 'bg-sky-500 border-sky-500' : 'bg-transparent border-white/30 group-hover:border-sky-300/50'
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-white font-medium drop-shadow">자동 로그인</span>
            </label>
            <button
              type="button"
              onClick={() => { setStep('forgot'); setForgotEmail(email); setError('') }}
              className="text-sm text-white/70 hover:text-white transition-colors underline underline-offset-2"
            >
              비밀번호 찾기
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || lockoutSec > 0}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold shadow-lg shadow-sky-900/40 transition-all disabled:opacity-60 mt-2"
        >
          {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
        </button>
      </form>

      <p className="text-center text-sm text-white/80 drop-shadow mt-5">
        {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
        <button
          onClick={() => { setMode(isLogin ? 'signup' : 'login'); setError('') }}
          className="text-white font-bold underline underline-offset-2 hover:text-sky-200 transition-colors"
        >
          {isLogin ? '회원가입' : '로그인'}
        </button>
      </p>
    </ModalCard>
  )
}
