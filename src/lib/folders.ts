export interface Folder {
  id: string
  name: string
  icon: string
  noteIds: string[]
}

const STORAGE_KEY = 'note-archive-folders'

export function getFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Folder[]
  } catch {
    return []
  }
}

function saveFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders))
  } catch {}
}

export function createFolder(name: string, icon: string): Folder {
  const folders = getFolders()
  const folder: Folder = {
    id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    icon,
    noteIds: [],
  }
  saveFolders([...folders, folder])
  return folder
}

export function renameFolder(id: string, name: string): void {
  const folders = getFolders().map((f) => (f.id === id ? { ...f, name } : f))
  saveFolders(folders)
}

export function deleteFolder(id: string): void {
  saveFolders(getFolders().filter((f) => f.id !== id))
}

export function addNoteToFolder(folderId: string, noteId: string): void {
  const folders = getFolders().map((f) => {
    if (f.id !== folderId) return f
    if (f.noteIds.includes(noteId)) return f
    return { ...f, noteIds: [...f.noteIds, noteId] }
  })
  saveFolders(folders)
}

export function removeNoteFromFolder(folderId: string, noteId: string): void {
  const folders = getFolders().map((f) => {
    if (f.id !== folderId) return f
    return { ...f, noteIds: f.noteIds.filter((id) => id !== noteId) }
  })
  saveFolders(folders)
}

export function getNoteFolder(noteId: string): Folder | null {
  return getFolders().find((f) => f.noteIds.includes(noteId)) ?? null
}
