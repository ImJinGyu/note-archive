const KEY = 'note-archive-unlocked'

export function isUnlocked(noteId: string): boolean {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return false
    const ids: string[] = JSON.parse(raw)
    return ids.includes(noteId)
  } catch {
    return false
  }
}

export function setUnlocked(noteId: string) {
  try {
    const raw = sessionStorage.getItem(KEY)
    const ids: string[] = raw ? JSON.parse(raw) : []
    if (!ids.includes(noteId)) ids.push(noteId)
    sessionStorage.setItem(KEY, JSON.stringify(ids))
  } catch {}
}

export function clearUnlocked(noteId: string) {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return
    const ids: string[] = JSON.parse(raw)
    sessionStorage.setItem(KEY, JSON.stringify(ids.filter(id => id !== noteId)))
  } catch {}
}
