const KEY = 'note-archive-recent'
const MAX = 10

export type RecentNote = {
  id: string
  title: string
  icon: string
  visitedAt: string
}

export function getRecentNotes(): RecentNote[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RecentNote[]) : []
  } catch {
    return []
  }
}

export function addRecentNote(note: RecentNote) {
  try {
    const all = getRecentNotes().filter(n => n.id !== note.id)
    all.unshift({ ...note, visitedAt: new Date().toISOString() })
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX)))
  } catch {}
}

export function removeRecentNote(id: string) {
  try {
    const all = getRecentNotes().filter(n => n.id !== id)
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}
