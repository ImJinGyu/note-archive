import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

export type BlockType = 'text' | 'code' | 'tip' | 'steps' | 'table' | 'checklist' | 'file' | 'keyword' | 'flow' | 'featurelist' | 'keyvalue' | 'list'

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

// Document type
export type Document = {
  id: string
  name: string
  content: string
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
