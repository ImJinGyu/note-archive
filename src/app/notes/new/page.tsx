'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import EmojiPicker from '@/components/EmojiPicker'
import TagInput from '@/components/TagInput'
import { useToast } from '@/components/ui/Toast'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import bcrypt from 'bcryptjs'

const validatePassword = (pwd: string): string | null => {
  if (!/^\d+$/.test(pwd)) return '숫자만 입력 가능합니다.'
  if (pwd.length < 4) return '최소 4자리 이상 입력하세요.'
  if (pwd.length > 6) return '최대 6자리까지 입력 가능합니다.'
  return null
}

function PasswordChecklist({ password }: { password: string }) {
  const onlyDigits = /^\d*$/.test(password)
  const checks = [
    { label: '숫자만 입력', pass: onlyDigits && password.length > 0 },
    { label: '4~6자리', pass: password.length >= 4 && password.length <= 6 },
  ]
  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.label} className={`flex items-center gap-1.5 text-xs font-medium ${c.pass ? 'text-emerald-500' : 'text-red-400'}`}>
          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${c.pass ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
            {c.pass ? '✓' : '✗'}
          </span>
          {c.label}
        </li>
      ))}
    </ul>
  )
}

export default function NewNotePage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [icon, setIcon] = useState('📝')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/')
    })
  }, [router])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isLocked, setIsLocked] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; password?: string }>({})
  const [confirmSave, setConfirmSave] = useState(false)

  const validate = (): boolean => {
    const newErrors: { title?: string; password?: string } = {}
    if (!title.trim()) {
      newErrors.title = '제목을 입력해주세요.'
    }
    if (isLocked && !password.trim()) {
      newErrors.password = '잠금 설정 시 비밀번호를 입력해주세요.'
    }
    if (isLocked && password.trim()) {
      const pwdError = validatePassword(password)
      if (pwdError) newErrors.password = pwdError
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      let passwordHash: string | null = null
      if (isLocked && password) {
        passwordHash = await bcrypt.hash(password, 10)
      }

      // Get current user for user_id
      const { data: { user } } = await supabase.auth.getUser()

      const { data: note, error: noteError } = await supabase
        .from('notes')
        .insert({
          icon,
          title: title.trim(),
          description: description.trim() || null,
          tags,
          is_locked: isLocked,
          password_hash: passwordHash,
          user_id: user?.id ?? null,
        })
        .select()
        .single()

      if (noteError) throw noteError

      // Create default tab
      const { error: tabError } = await supabase
        .from('tabs')
        .insert({
          note_id: note.id,
          name: '메인',
          order_index: 0,
        })

      if (tabError) throw tabError

      router.refresh()
      router.push('/')
    } catch (err: unknown) {
      console.error('Failed to save note:', err)
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? String(err)
      showToast(`노트 저장에 실패했습니다: ${msg}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sky-700 hover:text-sky-900 transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            돌아가기
          </Link>
          <h1 className="text-sky-950 font-semibold">새 노트 만들기</h1>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Emoji picker */}
          <div>
            <label className="block text-sm font-medium text-sky-700 mb-3">아이콘 선택</label>
            <EmojiPicker value={icon} onChange={setIcon} />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-sky-700 mb-2">
              제목 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) setErrors({ ...errors, title: undefined })
              }}
              placeholder="노트 제목을 입력하세요..."
              className={`w-full bg-white/75 border rounded-xl px-4 py-3 text-sky-900 placeholder-sky-400 outline-none text-base font-medium transition-all ${
                errors.title
                  ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : 'border-sky-300/60 focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]'
              }`}
            />
            {errors.title && (
              <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-sky-700 mb-2">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="노트에 대한 간략한 설명을 입력하세요..."
              rows={3}
              className="w-full bg-white/75 border border-sky-300/60 rounded-xl px-4 py-3 text-sky-900 placeholder-sky-400 outline-none resize-none focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)] transition-all"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-sky-700 mb-2">태그</label>
            <TagInput tags={tags} onChange={setTags} />
            <p className="mt-1.5 text-xs text-sky-800">Enter 또는 쉼표(,)로 태그를 추가할 수 있습니다.</p>
          </div>

          {/* Lock */}
          <div className="border border-sky-300/50 rounded-xl p-4 bg-white/50">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setIsLocked(!isLocked)}
                className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  isLocked ? 'bg-sky-500' : 'bg-sky-200'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isLocked ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </div>
              <div>
                <span className="text-sky-900 font-medium text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  암호 설정
                </span>
                <p className="text-xs text-sky-900 mt-0.5">비밀번호로 노트를 보호합니다.</p>
              </div>
            </label>

            {isLocked && (
              <div className="mt-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors({ ...errors, password: undefined })
                    }}
                    placeholder="숫자 4~6자리 입력..."
                    maxLength={6}
                    inputMode="numeric"
                    className={`w-full bg-white/80 border rounded-lg px-4 py-2.5 pr-10 text-sky-900 placeholder-sky-400 outline-none text-sm transition-all ${
                      errors.password
                        ? 'border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                        : 'border-sky-300/60 focus:border-sky-500 focus:shadow-[0_0_0_3px_rgba(14,165,233,0.1)]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-700 hover:text-sky-900 transition-colors"
                  >
                    {showPassword ? (
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
                {password && <PasswordChecklist password={password} />}
                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {title && (
            <div>
              <label className="block text-sm font-medium text-sky-700 mb-2">미리보기</label>
              <div className="bg-white/50 border border-sky-200/60 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1">
                    <h3 className="text-sky-950 font-semibold">{title}</h3>
                    {description && (
                      <p className="text-sky-900 text-sm mt-1">{description}</p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((tag) => (
                          <span key={tag} className="text-xs bg-sky-500/10 text-sky-800 border border-sky-500/30 rounded-full px-2 py-0.5">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isLocked && (
                    <svg className="w-4 h-4 text-sky-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href="/"
              className="flex-1 text-center px-6 py-3 rounded-xl border-2 border-sky-400 text-sky-800 bg-white/40 hover:bg-white/70 hover:border-sky-500 hover:text-sky-950 transition-all font-medium"
            >
              취소
            </Link>
            <button
              onClick={() => { if (validate()) setConfirmSave(true) }}
              disabled={saving}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-sky-500/30 hover:shadow-sky-500/50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  저장 중...
                </span>
              ) : '저장'}
            </button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={confirmSave}
        title="노트 저장"
        message={`"${title}" 노트를 저장하시겠습니까?`}
        confirmLabel="저장"
        cancelLabel="취소"
        variant="info"
        onConfirm={() => { setConfirmSave(false); handleSave() }}
        onCancel={() => setConfirmSave(false)}
      />
    </div>
  )
}
