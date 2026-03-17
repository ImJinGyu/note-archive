'use client'

import { useState, useEffect } from 'react'

export type CredentialAccount = { username: string; password: string }
export type CredentialItem = { label: string; url: string; accounts: CredentialAccount[]; memo: string }
export type CredentialContent = { items: CredentialItem[] }

interface Props {
  content: CredentialContent
  isEditing: boolean
  onChange: (content: CredentialContent) => void
}

const emptyAccount = (): CredentialAccount => ({ username: '', password: '' })
const emptyItem = (): CredentialItem => ({ label: '', url: '', accounts: [emptyAccount()], memo: '' })

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="복사"
      className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg transition-all ${
        copied ? 'bg-emerald-100 text-emerald-600' : 'bg-sky-100/70 hover:bg-sky-200 text-sky-800'
      }`}
    >
      {copied ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

export default function CredentialBlock({ content, isEditing, onChange }: Props) {
  const normalize = (raw: CredentialContent): CredentialItem[] => {
    if (!raw?.items?.length) return [emptyItem()]
    return raw.items.map((item) => ({
      label: item.label ?? '',
      url: item.url ?? '',
      memo: item.memo ?? '',
      // 구 버전(username/password 직접) 호환 처리
      accounts: (item as { accounts?: CredentialAccount[]; username?: string; password?: string }).accounts?.length
        ? (item as { accounts: CredentialAccount[] }).accounts
        : [{ username: (item as { username?: string }).username ?? '', password: (item as { password?: string }).password ?? '' }],
    }))
  }

  const [items, setItems] = useState<CredentialItem[]>(() => normalize(content))
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setItems(normalize(content))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  const commit = (newItems: CredentialItem[]) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  const updateItemField = (iIdx: number, field: 'label' | 'url' | 'memo', val: string) =>
    commit(items.map((it, i) => i === iIdx ? { ...it, [field]: val } : it))

  const updateAccount = (iIdx: number, aIdx: number, field: keyof CredentialAccount, val: string) =>
    commit(items.map((it, i) => i !== iIdx ? it : {
      ...it,
      accounts: it.accounts.map((ac, j) => j === aIdx ? { ...ac, [field]: val } : ac),
    }))

  const addAccount = (iIdx: number) =>
    commit(items.map((it, i) => i !== iIdx ? it : { ...it, accounts: [...it.accounts, emptyAccount()] }))

  const removeAccount = (iIdx: number, aIdx: number) =>
    commit(items.map((it, i) => i !== iIdx ? it : {
      ...it,
      accounts: it.accounts.length > 1 ? it.accounts.filter((_, j) => j !== aIdx) : it.accounts,
    }))

  const addItem    = () => commit([...items, emptyItem()])
  const removeItem = (iIdx: number) => commit(items.filter((_, i) => i !== iIdx))

  const pwKey = (iIdx: number, aIdx: number) => `${iIdx}-${aIdx}`
  const togglePw = (key: string) => setShowPw(prev => ({ ...prev, [key]: !prev[key] }))

  /* ── VIEW MODE ── */
  if (!isEditing) {
    const hasContent = items.some(it => it.label || it.url || it.accounts.some(a => a.username || a.password))
    if (!hasContent) {
      return <p className="text-sky-700 text-sm italic py-4 text-center">정보가 없습니다. 편집 모드에서 추가해주세요.</p>
    }
    return (
      <div className="space-y-3">
        {items.map((item, iIdx) => (
          <div
            key={iIdx}
            className="rounded-xl overflow-hidden border border-sky-300/50"
            style={{ background: 'rgba(240,249,255,0.85)' }}
          >
            {/* 헤더 */}
            {item.label && (
              <div
                className="px-4 py-2.5 flex items-center gap-2"
                style={{ background: 'rgba(186,230,253,0.6)', borderBottom: '1px solid rgba(147,210,255,0.4)' }}
              >
                <span className="text-base">🔐</span>
                <span className="text-sm font-bold text-sky-800 flex-1 truncate">{item.label}</span>
              </div>
            )}

            <div className="px-4 py-3 space-y-2">
              {/* URL */}
              {item.url && (
                <div className="flex items-center gap-2">
                  <div className="w-6 flex-shrink-0 flex justify-center">
                    <svg className="w-3.5 h-3.5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <span className="text-xs text-sky-800 font-semibold w-7 flex-shrink-0">URL</span>
                  <span className="flex-1 text-xs text-sky-700 truncate font-mono">{item.url}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="링크 열기"
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-sky-100/70 hover:bg-sky-200 text-sky-800 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <CopyBtn value={item.url} />
                </div>
              )}

              {/* 계정 목록 */}
              {item.accounts.map((ac, aIdx) => {
                const key = pwKey(iIdx, aIdx)
                const hasAny = ac.username || ac.password
                if (!hasAny) return null
                return (
                  <div
                    key={aIdx}
                    className={`space-y-1.5 ${item.accounts.length > 1 ? 'border border-sky-200/60 rounded-lg p-2' : ''}`}
                  >
                    {item.accounts.length > 1 && (
                      <p className="text-xs font-semibold text-sky-800 mb-1">계정 {aIdx + 1}</p>
                    )}
                    {ac.username && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 flex-shrink-0 flex justify-center">
                          <svg className="w-3.5 h-3.5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-xs text-sky-800 font-semibold w-7 flex-shrink-0">ID</span>
                        <span className="flex-1 text-sm text-sky-900 font-medium truncate">{ac.username}</span>
                        <CopyBtn value={ac.username} />
                      </div>
                    )}
                    {ac.password && (
                      <div className="flex items-center gap-2">
                        <div className="w-6 flex-shrink-0 flex justify-center">
                          <svg className="w-3.5 h-3.5 text-sky-700" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-xs text-sky-800 font-semibold w-7 flex-shrink-0">PW</span>
                        <span className="flex-1 text-sm text-sky-900 font-mono tracking-wider truncate">
                          {showPw[key] ? ac.password : '•'.repeat(Math.min(ac.password.length, 16))}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePw(key)}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-sky-100/70 hover:bg-sky-200 text-sky-800 transition-all"
                          title={showPw[key] ? '숨기기' : '보기'}
                        >
                          {showPw[key] ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                        <CopyBtn value={ac.password} />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 메모 */}
              {item.memo && (
                <div className="flex items-start gap-2 pt-1 border-t border-sky-200/50 mt-2">
                  <div className="w-6 flex-shrink-0 flex justify-center pt-0.5">
                    <svg className="w-3.5 h-3.5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <p className="flex-1 text-xs text-sky-900 leading-relaxed break-all">{item.memo}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ── EDIT MODE ── */
  return (
    <div className="space-y-4">
      {items.map((item, iIdx) => (
        <div key={iIdx} className="rounded-xl border border-sky-300/50 overflow-hidden" style={{ background: 'rgba(240,249,255,0.7)' }}>
          {/* 항목 헤더 */}
          <div className="flex items-center justify-between px-3 py-2" style={{ background: 'rgba(186,230,253,0.5)', borderBottom: '1px solid rgba(147,210,255,0.3)' }}>
            <span className="text-xs font-bold text-sky-700">항목 {iIdx + 1}</span>
            {items.length > 1 && (
              <button type="button" onClick={() => removeItem(iIdx)} className="text-sky-700 hover:text-red-400 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="p-3 space-y-2">
            {/* 사이트명 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-800 font-semibold w-14 flex-shrink-0">사이트명</span>
              <input
                value={item.label}
                onChange={e => updateItemField(iIdx, 'label', e.target.value)}
                placeholder="예: Google"
                className="flex-1 bg-white/80 border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
              />
            </div>

            {/* URL */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-sky-800 font-semibold w-14 flex-shrink-0">URL</span>
              <input
                value={item.url}
                onChange={e => updateItemField(iIdx, 'url', e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-white/80 border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300 font-mono"
              />
            </div>

            {/* 계정 목록 */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900">계정 목록</span>
                <button
                  type="button"
                  onClick={() => addAccount(iIdx)}
                  className="flex items-center gap-1 text-xs text-sky-800 hover:text-sky-700 bg-sky-100 hover:bg-sky-200 px-2 py-1 rounded-lg transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  계정 추가
                </button>
              </div>

              {item.accounts.map((ac, aIdx) => {
                const key = pwKey(iIdx, aIdx)
                return (
                  <div
                    key={aIdx}
                    className="rounded-lg border border-sky-200/70 p-2.5 space-y-2"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-sky-800">계정 {aIdx + 1}</span>
                      {item.accounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAccount(iIdx, aIdx)}
                          className="text-sky-700 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* 아이디 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-sky-800 font-semibold w-14 flex-shrink-0">아이디</span>
                      <input
                        value={ac.username}
                        onChange={e => updateAccount(iIdx, aIdx, 'username', e.target.value)}
                        placeholder="이메일 또는 아이디"
                        className="flex-1 bg-white/80 border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
                      />
                    </div>

                    {/* 비밀번호 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-sky-800 font-semibold w-14 flex-shrink-0">비밀번호</span>
                      <div className="flex-1 relative">
                        <input
                          type={showPw[key] ? 'text' : 'password'}
                          value={ac.password}
                          onChange={e => updateAccount(iIdx, aIdx, 'password', e.target.value)}
                          placeholder="비밀번호 입력"
                          className="w-full bg-white/80 border border-sky-200 rounded-lg px-3 py-1.5 pr-9 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300"
                        />
                        <button
                          type="button"
                          onClick={() => togglePw(key)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sky-700 hover:text-sky-700 transition-colors"
                        >
                          {showPw[key] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 메모 */}
            <div className="flex items-start gap-2">
              <span className="text-xs text-sky-800 font-semibold w-14 flex-shrink-0 pt-2">메모</span>
              <textarea
                value={item.memo}
                onChange={e => updateItemField(iIdx, 'memo', e.target.value)}
                placeholder="추가 메모 (선택사항)"
                rows={2}
                className="flex-1 bg-white/80 border border-sky-200 rounded-lg px-3 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-400 transition-colors placeholder-sky-300 resize-none"
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 text-sky-800 text-sm hover:border-sky-400 hover:text-sky-700 transition-all"
      >
        + 사이트 추가
      </button>
    </div>
  )
}
