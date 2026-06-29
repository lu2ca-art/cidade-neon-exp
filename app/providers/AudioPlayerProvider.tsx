"use client"

import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from "react"

export interface Track {
  id: number
  title: string | null
  masked?: string
  duration: string
  durationSec: number
  playable: boolean
  audioUrl: string | null
  color?: string
}

// --- CIDADE NEON (zona central do mapa) ---
export const CIDADE_NEON_TRACKS: Track[] = [
  { id: 101, title: "sextafeira",      masked: "s*****ira",     duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 102, title: "nectar",          masked: "n****r",        duration: "0:22", durationSec: 22, playable: false, audioUrl: null, color: "#FF6B9D" },
  { id: 103, title: "copo americano",  masked: "c*** a*****no", duration: "0:22", durationSec: 22, playable: true,  audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COPO%20AMERICANO%20%28MASTER%29-jPjZxju7Z5bxrhmi3XF7pgqkoZGajw.mp3" },
  { id: 104, title: "dopaminA",        masked: "d*****nA",      duration: "0:22", durationSec: 22, playable: false, audioUrl: null, color: "#FF9D6B" },
  { id: 105, title: "ojalá",           masked: "o***á",         duration: "0:22", durationSec: 22, playable: false, audioUrl: null, color: "#6B9DFF" },
  { id: 106, title: "swav",            masked: "s**v",          duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 107, title: "cliche",          masked: "c****e",        duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 108, title: "sabe ontem?",     masked: "s*** o****?",   duration: "0:22", durationSec: 22, playable: false, audioUrl: null, color: "#FFD93D" },
  { id: 109, title: "hollywood",       masked: "h*****ood",     duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 110, title: "stylist",         masked: "s*****t",       duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 111, title: "oasis",           masked: "o***s",         duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 112, title: "astronauta",      masked: "a*******a",     duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 113, title: "CHUVA",           masked: "C***A",         duration: "0:22", durationSec: 22, playable: true,  audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28MASTER%29-gjxdvkaY9bF5PpjHELCGqT3NrahEsG.mp3" },
  { id: 114, title: "qm é vc?",        masked: "q* é v*?",      duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 115, title: "rollercoaster",   masked: "r*******ster",  duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
]

// --- SUBÚRBIO XÊNON (primeira zona do mapa) ---
export const SUBURBIO_XENON_TRACKS: Track[] = [
  { id: 201, title: "tédio",           masked: "t***o",         duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 202, title: "faixa 2",         masked: "f**** 2",       duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 203, title: "faixa 3",         masked: "f**** 3",       duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
  { id: 204, title: "faixa 4",         masked: "f**** 4",       duration: "0:22", durationSec: 22, playable: false, audioUrl: null },
]

// Lista unificada para o AudioPlayer (Subúrbio primeiro, depois Cidade Neon)
export const ALBUM_TRACKS: Track[] = [
  ...SUBURBIO_XENON_TRACKS,
  ...CIDADE_NEON_TRACKS,
]

interface AudioPlayerContextType {
  currentTrack: Track | null
  trackIdx: number
  playing: boolean
  elapsed: number
  play: (trackIndex: number) => void
  pause: () => void
  resume: () => void
  toggle: () => void
  seekTo: (seconds: number) => void
  next: () => void
  prev: () => void
  stopAndClear: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext)
  if (!ctx) throw new Error("useAudioPlayer must be used within AudioPlayerProvider")
  return ctx
}

// Module-level singleton — survives React re-renders and page navigations
// Only created once in the browser, never on the server
let _audioEl: HTMLAudioElement | null = null
let _trackIdx = 0

export function getAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  if (!_audioEl) {
    _audioEl = new Audio()
    _audioEl.volume = 0.8
    _audioEl.preload = "auto"
  }
  return _audioEl
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [trackIdx, setTrackIdx] = useState(_trackIdx)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])

  const startTick = useCallback(() => {
    stopTick()
    tickRef.current = setInterval(() => {
      const el = getAudioEl()
      if (el) setElapsed(Math.floor(el.currentTime))
    }, 250)
  }, [stopTick])

  // Sync playing state from singleton on mount (handles back-navigation)
  useEffect(() => {
    const el = getAudioEl()
    if (!el) return
    if (!el.paused) {
      setPlaying(true)
      setTrackIdx(_trackIdx)
      setElapsed(Math.floor(el.currentTime))
      startTick()
    }
  }, [startTick])

  // Attach ended handler on mount, clean up on unmount
  useEffect(() => {
    const el = getAudioEl()
    if (!el) return

    const handleEnded = () => {
      stopTick()
      setPlaying(false)
      // Auto-advance to next playable track
      const nextIdx = ALBUM_TRACKS.findIndex((t, i) => i > _trackIdx && t.playable)
      if (nextIdx >= 0) {
        const next = ALBUM_TRACKS[nextIdx]
        if (next?.audioUrl) {
          el.src = next.audioUrl
          el.currentTime = 0
          _trackIdx = nextIdx
          setTrackIdx(nextIdx)
          setElapsed(0)
          el.play().then(() => { setPlaying(true); startTick() }).catch(() => {})
        }
      }
    }

    el.addEventListener("ended", handleEnded)
    return () => {
      el.removeEventListener("ended", handleEnded)
      stopTick()
    }
  }, [startTick, stopTick])

  const play = useCallback((index: number) => {
    const track = ALBUM_TRACKS[index]
    if (!track?.playable || !track.audioUrl) return
    const el = getAudioEl()
    if (!el) return

    stopTick()
    // Only change src if switching to a different track
    if (_trackIdx !== index || el.src !== track.audioUrl) {
      el.src = track.audioUrl
      el.currentTime = 0
    }
    _trackIdx = index
    setTrackIdx(index)
    setElapsed(Math.floor(el.currentTime))
    el.play().then(() => { setPlaying(true); startTick() }).catch(() => {})
  }, [startTick, stopTick])

  const pause = useCallback(() => {
    const el = getAudioEl()
    if (el) el.pause()
    setPlaying(false)
    stopTick()
  }, [stopTick])

  const resume = useCallback(() => {
    const el = getAudioEl()
    if (!el || !el.src) return
    el.play().then(() => { setPlaying(true); startTick() }).catch(() => {})
  }, [startTick])

  const toggle = useCallback(() => {
    const el = getAudioEl()
    if (!el) return
    if (!el.paused) pause()
    else resume()
  }, [pause, resume])

  const seekTo = useCallback((seconds: number) => {
    const el = getAudioEl()
    if (el) { el.currentTime = seconds; setElapsed(seconds) }
  }, [])

  const next = useCallback(() => {
    const nextIdx = ALBUM_TRACKS.findIndex((t, i) => i > _trackIdx && t.playable)
    if (nextIdx >= 0) play(nextIdx)
  }, [play])

  const prev = useCallback(() => {
    const el = getAudioEl()
    if (el && el.currentTime > 3) { el.currentTime = 0; setElapsed(0); return }
    for (let i = _trackIdx - 1; i >= 0; i--) {
      if (ALBUM_TRACKS[i].playable) { play(i); return }
    }
  }, [play])

  const stopAndClear = useCallback(() => {
    const el = getAudioEl()
    if (el) { el.pause(); el.src = "" }
    setPlaying(false)
    stopTick()
  }, [stopTick])

  const currentTrack = ALBUM_TRACKS[trackIdx] ?? null

  return (
    <AudioPlayerContext.Provider value={{
      currentTrack,
      trackIdx,
      playing,
      elapsed,
      play,
      pause,
      resume,
      toggle,
      seekTo,
      next,
      prev,
      stopAndClear,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  )
}
