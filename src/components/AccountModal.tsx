'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useToast } from '@/components/ui/Toast'

type Tab = 'account' | '2fa' | 'ip' | 'withdraw'

interface BlockedIP {
  id: string
  ip: string
  reason: string | null
  blocked_at: string
}

interface AccountModalProps {
  isOpen: boolean
  user: User
  onClose: () => void
  onSignOut: () => void
}

export default function AccountModal({ isOpen, user, onClose, onSignOut }: AccountModalProps) {
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('account')

  // 비밀번호 변경
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // 2FA
  const [factors, setFactors] = useState<{ id: string; friendly_name?: string; status: string }[]>([])
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [enrollFactorId, setEnrollFactorId] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [tfaLoading, setTfaLoading] = useState(false)

  // IP 차단
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([])
  const [newIP, setNewIP] = useState('')
  const [newIPReason, setNewIPReason] = useState('')
  const [ipLoading, setIPLoading] = useState(false)

  // 회원탈퇴
  const [withdrawPwd, setWithdrawPwd] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawConfirm, setWithdrawConfirm] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadFactors()
      loadBlockedIPs()
      setTab('account')
      setEnrolling(false)
      setWithdrawConfirm(false)
      setPwdError('')
    }
  }, [isOpen])

  const loadFactors = async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp ?? [])
  }

  const loadBlockedIPs = async () => {
    const { data } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false })
    setBlockedIPs(data ?? [])
  }

  // ── 비밀번호 변경 ──────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwdError('')
    if (!currentPwd || !newPwd || !confirmPwd) return setPwdError('모든 필드를 입력해주세요.')
    if (newPwd.length < 6) return setPwdError('새 비밀번호는 6자 이상이어야 합니다.')
    if (newPwd !== confirmPwd) return setPwdError('새 비밀번호가 일치하지 않습니다.')
    if (currentPwd === newPwd) return setPwdError('현재 비밀번호와 동일합니다.')

    setPwdLoading(true)
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPwd,
    })
    if (verifyError) {
      setPwdLoading(false)
      return setPwdError('현재 비밀번호가 올바르지 않습니다.')
    }

    const { error } = await supabase.auth.updateUser({ password: newPwd })
    setPwdLoading(false)
    if (error) return setPwdError(error.message)

    showToast('비밀번호가 변경되었습니다.', 'success')
    setCurrentPwd('')
    setNewPwd('')
    setConfirmPwd('')
  }

  // ── 2FA 등록 ─────────────────────────────────────────────────────────
  const handle2FAEnroll = async () => {
    setTfaLoading(true)
    // 이전 등록 시도 중 검증 안 된 factor가 남아있으면 먼저 제거 (실패해도 계속 진행)
    const { data: existing } = await supabase.auth.mfa.listFactors()
    const unverified = existing?.totp?.filter(f => f.status !== 'verified') ?? []
    for (const f of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: f.id })
    }
    // friendlyName에 타임스탬프를 넣어 중복 이름 충돌 방지
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `totp-${Date.now()}`,
    })
    setTfaLoading(false)
    if (error || !data) return showToast('2FA 설정 실패: ' + error?.message, 'error')
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setEnrollFactorId(data.id)
    setTotpCode('')
    setEnrolling(true)
  }

  const handle2FAVerify = async () => {
    setTfaLoading(true)
    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: enrollFactorId })
      if (challengeErr || !challenge) {
        showToast('챌린지 생성 실패: ' + (challengeErr?.message ?? ''), 'error')
        return
      }
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrollFactorId,
        challengeId: challenge.id,
        code: totpCode,
      })
      if (error) {
        showToast('코드가 올바르지 않습니다: ' + error.message, 'error')
        return
      }
      // 검증 성공 — 남아있는 unverified factor 정리 (실패해도 무시)
      try {
        const { data: afterFactors } = await supabase.auth.mfa.listFactors()
        const oldUnverified = afterFactors?.totp?.filter(f => f.id !== enrollFactorId && f.status !== 'verified') ?? []
        for (const f of oldUnverified) {
          await supabase.auth.mfa.unenroll({ factorId: f.id })
        }
      } catch { /* 정리 실패는 무시 */ }

      showToast('2FA가 활성화되었습니다!', 'success')
      setEnrolling(false)
      setQrCode('')
      setTotpCode('')
      loadFactors()
    } catch (e) {
      console.error('2FA verify error:', e)
      showToast('오류가 발생했습니다.', 'error')
    } finally {
      setTfaLoading(false)
    }
  }

  const handle2FAUnenroll = async (factorId: string) => {
    setTfaLoading(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    setTfaLoading(false)
    if (error) return showToast('비활성화 실패: ' + error.message, 'error')
    showToast('2FA가 비활성화되었습니다.', 'success')
    loadFactors()
  }

  // ── IP 차단 ──────────────────────────────────────────────────────────
  const handleAddIP = async () => {
    const trimmed = newIP.trim()
    if (!trimmed) return
    // 간단한 IP 형식 검증
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
      return showToast('올바른 IPv4 주소를 입력하세요. (예: 192.168.1.1)', 'error')
    }
    setIPLoading(true)
    const { error } = await supabase
      .from('blocked_ips')
      .insert({ ip: trimmed, reason: newIPReason.trim() || null })
    setIPLoading(false)
    if (error) return showToast('추가 실패: ' + error.message, 'error')
    setNewIP('')
    setNewIPReason('')
    loadBlockedIPs()
    showToast('IP가 차단되었습니다.', 'success')
  }

  const handleUnblockIP = async (id: string) => {
    await supabase.from('blocked_ips').delete().eq('id', id)
    loadBlockedIPs()
    showToast('차단이 해제되었습니다.', 'success')
  }

  // ── 회원탈퇴 ─────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!withdrawPwd) return
    setWithdrawLoading(true)

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: withdrawPwd,
    })
    if (verifyError) {
      setWithdrawLoading(false)
      return showToast('비밀번호가 올바르지 않습니다.', 'error')
    }

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: user.id }),
    })
    setWithdrawLoading(false)
    if (!res.ok) {
      const data = await res.json()
      return showToast('탈퇴 실패: ' + data.error, 'error')
    }
    await supabase.auth.signOut()
    showToast('탈퇴가 완료되었습니다.', 'success')
    onSignOut()
    onClose()
  }

  if (!isOpen) return null

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'account', label: '내 계정', icon: '👤' },
    { id: '2fa', label: '2단계 인증', icon: '🔐' },
    { id: 'ip', label: 'IP 차단', icon: '🛡️' },
    { id: 'withdraw', label: '회원탈퇴', icon: '⚠️' },
  ]

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(28px)', border: '1px solid rgba(255,255,255,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-300/50">
          <h2 className="text-sky-950 font-bold text-lg">계정 설정</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sky-400 hover:text-sky-700 hover:bg-sky-100 transition-all text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sky-300/50">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-3 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                tab === t.id
                  ? 'text-sky-600 border-b-2 border-sky-500 bg-sky-50/60'
                  : 'text-sky-400 hover:text-sky-600 hover:bg-sky-50/30'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">

          {/* ── 내 계정 ── */}
          {tab === 'account' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-sky-500 uppercase tracking-wide">이메일 (아이디)</label>
                <div className="mt-1.5 px-4 py-3 bg-sky-50 rounded-xl border border-sky-300/50 text-sky-900 text-sm font-medium font-mono">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-sky-500 uppercase tracking-wide">비밀번호 변경</label>
                <div className="mt-2 space-y-2.5">
                  <input
                    type="password"
                    value={currentPwd}
                    onChange={(e) => { setCurrentPwd(e.target.value); setPwdError('') }}
                    placeholder="현재 비밀번호"
                    className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors"
                  />
                  <input
                    type="password"
                    value={newPwd}
                    onChange={(e) => { setNewPwd(e.target.value); setPwdError('') }}
                    placeholder="새 비밀번호 (6자 이상)"
                    className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors"
                  />
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); setPwdError('') }}
                    placeholder="새 비밀번호 확인"
                    className="w-full bg-white border border-sky-200 rounded-xl px-4 py-2.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors"
                  />
                  {pwdError && <p className="text-red-400 text-xs">{pwdError}</p>}
                  <button
                    onClick={handleChangePassword}
                    disabled={pwdLoading}
                    className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all disabled:opacity-60"
                  >
                    {pwdLoading ? '변경 중...' : '비밀번호 변경'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 2단계 인증 ── */}
          {tab === '2fa' && (
            <div className="space-y-4">
              {factors.filter(f => f.status === 'verified').length === 0 && !enrolling && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🔐</div>
                  <h3 className="text-sky-900 font-semibold mb-2">2단계 인증이 비활성화 상태입니다</h3>
                  <p className="text-sky-500 text-sm mb-6">
                    Google Authenticator 등 TOTP 앱으로 계정을 보호하세요.
                  </p>
                  <button
                    onClick={handle2FAEnroll}
                    disabled={tfaLoading}
                    className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all disabled:opacity-60"
                  >
                    {tfaLoading ? '설정 중...' : '2FA 활성화'}
                  </button>
                </div>
              )}

              {enrolling && qrCode && (
                <div className="space-y-4">
                  <div className="bg-sky-50 rounded-xl p-4 border border-sky-300/50">
                    <p className="text-sm text-sky-700 font-medium mb-3">1. 인증 앱으로 QR 코드를 스캔하세요</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div className="flex justify-center">
                      <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-xl" />
                    </div>
                    <p className="text-xs text-sky-500 text-center mt-3">
                      또는 직접 입력:{' '}
                      <code className="bg-white px-2 py-0.5 rounded border border-sky-200 font-mono text-xs select-all">
                        {secret}
                      </code>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-sky-700 font-medium mb-2">2. 인증 앱에 표시된 6자리 코드를 입력하세요</p>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full bg-white border border-sky-200 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-sky-900 outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEnrolling(false); setQrCode(''); setTotpCode('') }}
                      className="flex-1 py-2.5 rounded-xl border border-sky-200 text-sky-600 text-sm hover:bg-sky-50 transition-all"
                    >
                      취소
                    </button>
                    <button
                      onClick={handle2FAVerify}
                      disabled={totpCode.length !== 6 || tfaLoading}
                      className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all disabled:opacity-60"
                    >
                      {tfaLoading ? '확인 중...' : '활성화 완료'}
                    </button>
                  </div>
                </div>
              )}

              {factors.filter(f => f.status === 'verified').length > 0 && !enrolling && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-emerald-700 font-semibold text-sm">2FA 활성화됨</p>
                      <p className="text-emerald-600 text-xs">TOTP 인증이 설정되어 있습니다.</p>
                    </div>
                  </div>
                  {factors.filter(f => f.status === 'verified').map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handle2FAUnenroll(f.id)}
                      disabled={tfaLoading}
                      className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-all disabled:opacity-60"
                    >
                      {tfaLoading ? '처리 중...' : '2FA 비활성화'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── IP 차단 ── */}
          {tab === 'ip' && (
            <div className="space-y-4">
              <div className="bg-sky-50 rounded-xl p-4 border border-sky-300/50 space-y-2.5">
                <label className="text-xs font-semibold text-sky-500 uppercase tracking-wide">IP 차단 추가</label>
                <div className="flex gap-2">
                  <input
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    placeholder="192.168.1.1"
                    className="flex-1 bg-white border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 font-mono outline-none focus:border-sky-400 transition-colors"
                  />
                  <button
                    onClick={handleAddIP}
                    disabled={!newIP.trim() || ipLoading}
                    className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold disabled:opacity-60 transition-all whitespace-nowrap"
                  >
                    {ipLoading ? '...' : '차단'}
                  </button>
                </div>
                <input
                  value={newIPReason}
                  onChange={(e) => setNewIPReason(e.target.value)}
                  placeholder="차단 사유 (선택)"
                  className="w-full bg-white border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors"
                />
              </div>

              {blockedIPs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sky-400 text-sm">차단된 IP가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {blockedIPs.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-sky-300/50 shadow-sm">
                      <div>
                        <p className="text-sky-900 font-mono text-sm font-semibold">{item.ip}</p>
                        {item.reason && <p className="text-sky-500 text-xs mt-0.5">{item.reason}</p>}
                        <p className="text-sky-400 text-xs mt-0.5">{new Date(item.blocked_at).toLocaleString('ko-KR')}</p>
                      </div>
                      <button
                        onClick={() => handleUnblockIP(item.id)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 text-xs font-medium transition-all"
                      >
                        해제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── 회원탈퇴 ── */}
          {tab === 'withdraw' && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <h3 className="text-red-700 font-semibold mb-2 flex items-center gap-2">⚠️ 회원탈퇴 안내</h3>
                <ul className="text-red-600 text-sm space-y-1 list-disc list-inside">
                  <li>모든 노트와 블록 데이터가 영구 삭제됩니다.</li>
                  <li>삭제된 데이터는 복구할 수 없습니다.</li>
                  <li>탈퇴 후 동일 이메일로 재가입이 가능합니다.</li>
                </ul>
              </div>

              {!withdrawConfirm ? (
                <button
                  onClick={() => setWithdrawConfirm(true)}
                  className="w-full py-3 rounded-xl border-2 border-red-300 text-red-500 font-semibold hover:bg-red-50 transition-all"
                >
                  탈퇴 진행
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sky-700 text-sm font-medium">확인을 위해 현재 비밀번호를 입력해주세요.</p>
                  <input
                    type="password"
                    value={withdrawPwd}
                    onChange={(e) => setWithdrawPwd(e.target.value)}
                    placeholder="비밀번호"
                    className="w-full bg-white border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setWithdrawConfirm(false); setWithdrawPwd('') }}
                      className="flex-1 py-2.5 rounded-xl border border-sky-200 text-sky-600 text-sm hover:bg-sky-50 transition-all"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={!withdrawPwd || withdrawLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm font-semibold disabled:opacity-60 transition-all"
                    >
                      {withdrawLoading ? '처리 중...' : '탈퇴하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
