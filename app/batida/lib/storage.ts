// ─── persistência dos 4 slots de música (IndexedDB) ─────────────────────────
// IndexedDB porque as faixas de voz guardam Blob de áudio de verdade — não
// cabe em localStorage/sessionStorage de forma confiável.

import { MAX_SLOTS, type Song } from "./types"

const DB_NAME = "b4tida-db"
const DB_VERSION = 1
const STORE = "slots"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "slot" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadAllSlots(): Promise<(Song | null)[]> {
  if (typeof indexedDB === "undefined") return Array(MAX_SLOTS).fill(null)
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const results: (Song | null)[] = Array(MAX_SLOTS).fill(null)
      const rows = req.result as { slot: number; song: Song }[]
      rows.forEach((r) => { if (r.slot >= 0 && r.slot < MAX_SLOTS) results[r.slot] = r.song })
      resolve(results)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveSlot(slot: number, song: Song): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put({ slot, song: { ...song, updatedAt: Date.now() } })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteSlot(slot: number): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(slot)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
