import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 자동로그인 여부에 따라 localStorage / sessionStorage를 동적으로 선택하는 storage adapter.
// 로그인 직전에 localStorage.setItem('remember_me', 'true'|'false') 를 설정해두면
// Supabase가 세션을 쓸 때 이 adapter가 적절한 스토리지에 저장함.
// try/catch로 Edge 등 브라우저별 storage 오류에 대비함.
const authStorageAdapter = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key) ?? sessionStorage.getItem(key)
    } catch { return null }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      const remember = localStorage.getItem('remember_me') !== 'false'
      if (remember) {
        localStorage.setItem(key, value)
        sessionStorage.removeItem(key)
      } else {
        sessionStorage.setItem(key, value)
        localStorage.removeItem(key)
      }
    } catch { /* 저장 실패 무시 */ }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    } catch { /* 무시 */ }
  },
}

// HMR 시 모듈 재평가로 인한 다중 인스턴스 생성 방지 (AbortError: Lock broken 방지)
// globalThis 대신 모듈 수준 변수 사용 — Edge 호환성 문제 없음
// eslint-disable-next-line prefer-const
let _client: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (_client) return _client
  _client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: authStorageAdapter,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  return _client
})()

export type Note = {
  id: string
  icon: string
  title: string
  description: string | null
  tags: string[]
  is_locked: boolean
  password_hash: string | null
  user_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Tab = {
  id: string
  note_id: string
  name: string
  order_index: number
  created_at: string
}

export type BlockType = 'text' | 'code' | 'tip' | 'steps' | 'table' | 'checklist' | 'file' | 'keyword' | 'flow' | 'featurelist' | 'keyvalue' | 'list' | 'credential' | 'license' | 'link' | 'poll' | 'mindmap' | 'embed' | 'image' | 'math' | 'timer' | 'ai_summary'

// Image block content
export type ImageContent = {
  dataUrl: string
  caption: string
  alt: string
}

// Math block content
export type MathContent = {
  latex: string
  displayMode: boolean
}

// Timer block content
export type TimerContent = {
  focusMinutes: number
  breakMinutes: number
  label: string
}

// NOTE: Supabase DB constraint must be updated to include new types.
// Run the following SQL in Supabase SQL editor:
// ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_type_check;
// ALTER TABLE blocks ADD CONSTRAINT blocks_type_check
//   CHECK (type IN ('text','code','tip','steps','table','checklist','file','keyword','flow','featurelist','keyvalue','list','credential','license','link','poll','mindmap','embed','image','math','timer'));

export type Block = {
  id: string
  tab_id: string
  type: BlockType
  title: string | null
  show_title: boolean
  content: Record<string, unknown>
  order_index: number
  created_at: string
  updated_at: string
}

// Text block content
export type TextContent = {
  markdown: string
}

// Code block content
export type CodeContent = {
  language: string
  code: string
}

// Tip block content
export type TipContent = {
  icon: string
  items: string[]
}

// Steps block content
export type StepItem = {
  title: string
  description: string
  code?: string
  language?: string
}
export type StepsContent = {
  steps: StepItem[]
}

// Table block content
export type TableContent = {
  columns: string[]
  rows: string[][]
}

// Checklist block content
export type ChecklistItem = {
  text: string
  checked: boolean
  sub?: string
  due_date?: string  // 'YYYY-MM-DD'
}
export type ChecklistContent = {
  items: ChecklistItem[]
}

// File block content
export type FileItem = {
  name: string
  size: number
  type: string
  dataUrl: string
  showPreview: boolean
}
export type FileContent = {
  files: FileItem[]
}

// Keyword block content
export type KeywordItem = {
  icon: string
  title: string
  subtitle: string
  example: string
}
export type KeywordContent = {
  items: KeywordItem[]
}

// Flow block content
export type FlowStep = {
  title: string
  subtitle: string
  active?: boolean
}
export type FlowContent = {
  title: string
  steps: FlowStep[]
}

// Feature list block content
export type FeatureItem = {
  icon: string
  label: string
  title: string
  description: string
}
export type FeatureListContent = {
  items: FeatureItem[]
}

// KeyValue block content
export type KVItem = { key: string; value: string }
export type KeyValueContent = { items: KVItem[] }

// List block content
export type ListStyle = 'bullet' | 'numbered' | 'arrow' | 'check'
export type ListItem = { text: string }
export type ListContent = { style: ListStyle; items: ListItem[] }

// License block content
export type LicenseItem = { name: string; date: string; expiry: string; issuer: string }
export type LicenseContent = { items: LicenseItem[] }

// Credential block content
export type CredentialAccount = { username: string; password: string }
export type CredentialItem = { label: string; url: string; accounts: CredentialAccount[]; memo: string }
export type CredentialContent = { items: CredentialItem[] }

// Document type
export type Document = {
  id: string
  name: string
  content: string
  created_at: string
  updated_at: string
}

// Calendar Event types
export type EventColor = 'sky' | 'violet' | 'emerald' | 'rose' | 'orange' | 'indigo'

export type CalendarEvent = {
  id: string
  user_id: string | null
  title: string
  description: string | null
  start_date: string   // 'YYYY-MM-DD'
  end_date: string | null
  start_time: string | null  // 'HH:MM'
  end_time: string | null
  color: EventColor
  all_day: boolean
  created_at: string
  updated_at: string
}

// Auth helpers
export async function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
