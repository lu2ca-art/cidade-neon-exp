"use client"

// ─── contexto compartilhado entre TODAS as páginas do B4TIDA ───────────────
// Vive no layout.tsx, então sobrevive à navegação entre /batida/bateria,
// /batida/baixo etc. (layouts do App Router não remontam entre rotas irmãs).
// Guarda a música em edição, os 4 slots salvos, e a ÚNICA instância do motor
// de áudio (evita recriar AudioContext a cada troca de página).

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react"
import { BatidaEngine } from "./engine"
import { loadAllSlots, saveSlot as persistSlot, deleteSlot as persistDeleteSlot } from "./storage"
import { emptySong, MAX_SLOTS, MAX_TRACKS, songHasRoomForTrack, type Song, type Track } from "./types"

interface CurrentSongContextType {
  song: Song
  slotIndex: number | null
  slots: (Song | null)[]
  slotsLoaded: boolean
  engine: BatidaEngine | null
  startNewSong: () => void
  openSlot: (i: number) => void
  deleteSlot: (i: number) => Promise<void>
  patchSong: (updater: (prev: Song) => Song) => void
  addTrack: (track: Track) => Promise<boolean> // false se não coube (limite de 5)
  updateTrackFx: (trackId: string, fx: Partial<Track["fx"]>) => void
  removeTrack: (trackId: string) => void
  canAddTrack: boolean
}

const Ctx = createContext<CurrentSongContextType | null>(null)

// último slot em edição — sobrevive a um reload/link direto (a árvore React
// inteira remonta nesse caso, então o slotIndex em memória não basta)
const ACTIVE_SLOT_KEY = "b4tida-active-slot"

function readActiveSlot(): number | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(ACTIVE_SLOT_KEY)
  if (raw === null) return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 && n < MAX_SLOTS ? n : null
}

function writeActiveSlot(i: number | null) {
  try {
    if (i === null) window.localStorage.removeItem(ACTIVE_SLOT_KEY)
    else window.localStorage.setItem(ACTIVE_SLOT_KEY, String(i))
  } catch {}
}

export function CurrentSongProvider({ children }: { children: ReactNode }) {
  const [song, setSong] = useState<Song>(() => emptySong(`song-${Date.now()}`))
  const [slotIndex, setSlotIndexState] = useState<number | null>(null)
  const [slots, setSlots] = useState<(Song | null)[]>(Array(MAX_SLOTS).fill(null))
  const [slotsLoaded, setSlotsLoaded] = useState(false)
  const engineRef = useRef<BatidaEngine | null>(null)

  const setSlotIndex = useCallback((i: number | null) => {
    setSlotIndexState(i)
    writeActiveSlot(i)
  }, [])

  useEffect(() => {
    try {
      engineRef.current = new BatidaEngine()
    } catch {
      engineRef.current = null
    }
    return () => { engineRef.current?.destroy() }
  }, [])

  // ao carregar, retoma automaticamente o último slot em edição (se ainda
  // existir) — evita perder a música ao dar refresh ou abrir um link direto
  useEffect(() => {
    loadAllSlots().then((s) => {
      setSlots(s)
      setSlotsLoaded(true)
      const active = readActiveSlot()
      if (active !== null && s[active]) {
        setSlotIndexState(active)
        setSong(s[active] as Song)
      }
    }).catch(() => setSlotsLoaded(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.setSong({ bpm: song.bpm, rootNote: song.rootNote, mode: song.mode })
  }, [song.bpm, song.rootNote, song.mode])

  const startNewSong = useCallback(() => {
    setSlotIndex(null)
    setSong(emptySong(`song-${Date.now()}`))
  }, [setSlotIndex])

  const openSlot = useCallback((i: number) => {
    setSlotIndex(i)
    setSong(slots[i] ?? emptySong(`song-${Date.now()}`))
  }, [slots, setSlotIndex])

  const deleteSlot = useCallback(async (i: number) => {
    await persistDeleteSlot(i)
    setSlots((prev) => { const next = [...prev]; next[i] = null; return next })
    if (slotIndex === i) {
      setSong(emptySong(`song-${Date.now()}`))
      setSlotIndex(null)
    }
  }, [slotIndex, setSlotIndex])

  // grava a música atual no slot dela (ou no primeiro slot livre, se ainda
  // não tinha um) — é a autosave que dispara ao adicionar um instrumento
  const persistCurrent = useCallback(async (nextSong: Song) => {
    let idx = slotIndex
    if (idx === null) {
      idx = slots.findIndex((s) => s === null)
      if (idx === -1) idx = MAX_SLOTS - 1 // sem slot livre — sobrescreve o último
      setSlotIndex(idx)
    }
    persistSlot(idx, nextSong).catch(() => {})
    setSlots((prev) => {
      const next = [...prev]
      next[idx as number] = nextSong
      return next
    })
  }, [slotIndex, slots])

  const patchSong = useCallback((updater: (prev: Song) => Song) => {
    setSong((prev) => updater(prev))
  }, [])

  const canAddTrack = songHasRoomForTrack(song) || song.tracks.length < MAX_TRACKS

  const addTrack = useCallback(async (track: Track): Promise<boolean> => {
    if (song.tracks.length >= MAX_TRACKS) return false
    const next: Song = { ...song, tracks: [...song.tracks, track], updatedAt: Date.now() }
    setSong(next)
    await persistCurrent(next)
    return true
  }, [song, persistCurrent])

  const updateTrackFx = useCallback((trackId: string, fx: Partial<Track["fx"]>) => {
    const next: Song = {
      ...song,
      tracks: song.tracks.map((t) => (t.id === trackId ? { ...t, fx: { ...t.fx, ...fx } } : t)),
    }
    setSong(next)
    persistCurrent(next)
    engineRef.current?.setTrackFx(trackId, fx)
  }, [song, persistCurrent])

  const removeTrack = useCallback((trackId: string) => {
    const next: Song = { ...song, tracks: song.tracks.filter((t) => t.id !== trackId) }
    setSong(next)
    persistCurrent(next)
  }, [song, persistCurrent])

  return (
    <Ctx.Provider
      value={{
        song,
        slotIndex,
        slots,
        slotsLoaded,
        engine: engineRef.current,
        startNewSong,
        openSlot,
        deleteSlot,
        patchSong,
        addTrack,
        updateTrackFx,
        removeTrack,
        canAddTrack,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useCurrentSong() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useCurrentSong deve estar dentro de CurrentSongProvider")
  return ctx
}
