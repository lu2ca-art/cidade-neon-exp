"use client"

// ─── esteira de acordes (modo PRO) ──────────────────────────────────────────
// Cada nota tocada no braço/teclado livre entra num buffer. Enquanto novas
// notas continuam chegando dentro da janela de agrupamento, elas se juntam
// no mesmo item; quando a janela fecha sem nova nota, o buffer vira um item
// definitivo da esteira. Isso faz um dedilhado (várias cordas em sequência
// rápida) ou um acorde tocado no teclado virarem UM item só — e uma nota
// isolada, tocada devagar, virar um item de 1 nota.
import { useCallback, useEffect, useRef, useState } from "react"

export interface TrayNote {
  midi: number
  meta?: { string: number; fret: number }
}

export interface TrayItem {
  id: string
  notes: TrayNote[]
  createdAt: number
}

// janela deslizante de agrupamento — folgada o suficiente pra cobrir o
// stagger de 12ms/corda que triggerGuitarChord já usa internamente
const GROUP_WINDOW_MS = 180

export function useNoteTray(maxItems = 40) {
  const [items, setItems] = useState<TrayItem[]>([])
  const pendingRef = useRef<{ id: string; notes: TrayNote[]; timer: number | null }>({ id: "", notes: [], timer: null })

  const flush = useCallback(() => {
    const p = pendingRef.current
    if (p.notes.length === 0) return
    const item: TrayItem = { id: p.id, notes: [...p.notes], createdAt: Date.now() }
    setItems((prev) => [...prev, item].slice(-maxItems))
    pendingRef.current = { id: "", notes: [], timer: null }
  }, [maxItems])

  const registerNote = useCallback((note: TrayNote) => {
    const p = pendingRef.current
    if (p.timer !== null) window.clearTimeout(p.timer)
    if (p.notes.length === 0) p.id = `tray-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    if (!p.notes.some((n) => n.midi === note.midi)) p.notes.push(note)
    p.timer = window.setTimeout(flush, GROUP_WINDOW_MS)
  }, [flush])

  useEffect(() => () => { if (pendingRef.current.timer !== null) window.clearTimeout(pendingRef.current.timer) }, [])

  const removeItem = useCallback((id: string) => setItems((prev) => prev.filter((i) => i.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])

  return { items, registerNote, removeItem, clear }
}
