const KEY = 'note-archive-pinned'
const MAX_PINS = 5

export function getPinnedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? (JSON.parse(saved) as string[]) : []
  } catch {
    return []
  }
}

export function togglePin(id: string): boolean {
  const current = getPinnedIds()
  const alreadyPinned = current.includes(id)
  let next: string[]
  if (alreadyPinned) {
    next = current.filter((pid) => pid !== id)
  } else {
    if (current.length >= MAX_PINS) {
      // 가장 오래된 핀 제거 후 새 핀 추가
      next = [...current.slice(1), id]
    } else {
      next = [...current, id]
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {}
  return !alreadyPinned
}

export function isPinned(id: string): boolean {
  return getPinnedIds().includes(id)
}
