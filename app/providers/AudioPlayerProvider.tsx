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

export const ALBUM_TRACKS: Track[] = [
  { id: 1, title: null, masked: "1. n**t**", duration: "3:12", durationSec: 192, playable: false, audioUrl: null, color: "#FF6B9D" },
  { id: 2, title: null, masked: "2. d******A", duration: "2:45", durationSec: 165, playable: false, audioUrl: null, color: "#FF9D6B" },
  { id: 3, title: "COPO AMERICANO", masked: "3. C*** A*******", duration: "2:58", durationSec: 178, playable: true, audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COPO%20AMERICANO%20%28MASTER%29-jPjZxju7Z5bxrhmi3XF7pgqkoZGajw.mp3" },
  { id: 4, title: null, masked: "4. *j**a", duration: "3:18", durationSec: 198, playable: false, audioUrl: null, color: "#6B9DFF" },
  { id: 5, title: null, masked: "5. ******e", duration: "2:33", durationSec: 153, playable: false, audioUrl: null },
  { id: 6, title: null, masked: "6. ****r", duration: "3:45", durationSec: 225, playable: false, audioUrl: null },
  { id: 7, title: null, masked: "7. s*** o****?", duration: "2:50", durationSec: 170, playable: false, audioUrl: null, color: "#FFD93D" },
  { id: 8, title: null, masked: "8. *****a", duration: "3:01", durationSec: 181, playable: false, audioUrl: null },
  { id: 9, title: "CHUVA", masked: "9. C***A", duration: "3:24", durationSec: 204, playable: true, audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28MASTER%29-gjxdvkaY9bF5PpjHELCGqT3NrahEsG.mp3" },
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

function getAudioEl(): HTMLAudioElement | null {
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
