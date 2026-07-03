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

// ─────────────────────────────────────────────────────────────────────────────
// CIDADE NEON — tracklist oficial (ordem da playlist)
// audioUrl: null enquanto o arquivo ainda não foi enviado.
// Quando subir os previews, nomeie os arquivos exatamente como indicado em
// `audioFile` e passe a URL para `audioUrl`.
//
// Convenção de nome de arquivo:  <TITULO_UPPERCASE_SEM_ACENTO>.mp3
// Ex.: sextafeira → SEXTAFEIRA.mp3  |  qm é vc? → QM_E_VC.mp3
// ─────────────────────────────────────────────────────────────────────────────
export const ALBUM_TRACKS: Track[] = [
  {
    id: 1, title: "sextafeira",
    masked: "s*****ira",     duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: SEXTAFEIRA.mp3
  },
  {
    id: 2, title: "nectar",
    masked: "n****r",        duration: "0:22", durationSec: 22,
    playable: true, color: "#FF6B9D",
    audioUrl: null, // arquivo: NECTAR.mp3
  },
  {
    id: 3, title: "copo americano",
    masked: "c*** a*****no", duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COPO%20AMERICANO%20%28MASTER%29-jPjZxju7Z5bxrhmi3XF7pgqkoZGajw.mp3",
    // arquivo: COPO_AMERICANO.mp3
  },
  {
    id: 4, title: "dopaminA",
    masked: "d*****nA",      duration: "0:22", durationSec: 22,
    playable: true, color: "#FF9D6B",
    audioUrl: null, // arquivo: DOPAMINA.mp3
  },
  {
    id: 5, title: "ojalá",
    masked: "o***á",         duration: "0:22", durationSec: 22,
    playable: true, color: "#6B9DFF",
    audioUrl: null, // arquivo: OJALA.mp3
  },
  {
    id: 6, title: "swav",
    masked: "s**v",          duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: SWAV.mp3
  },
  {
    id: 7, title: "cliche",
    masked: "c****e",        duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: CLICHE.mp3
  },
  {
    id: 8, title: "sabe ontem?",
    masked: "s*** o****?",   duration: "0:22", durationSec: 22,
    playable: true, color: "#FFD93D",
    audioUrl: null, // arquivo: SABE_ONTEM.mp3
  },
  {
    id: 9, title: "hollywood",
    masked: "h*****ood",     duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: HOLLYWOOD.mp3
  },
  {
    id: 10, title: "stylist",
    masked: "s*****t",       duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: STYLIST.mp3
  },
  {
    id: 11, title: "oasis",
    masked: "o***s",         duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: OASIS.mp3
  },
  {
    id: 12, title: "astronauta",
    masked: "a*******a",     duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: ASTRONAUTA.mp3
  },
  {
    id: 13, title: "CHUVA",
    masked: "C***A",         duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28MASTER%29-gjxdvkaY9bF5PpjHELCGqT3NrahEsG.mp3",
    // arquivo: CHUVA.mp3
  },
  {
    id: 14, title: "qm é vc?",
    masked: "q* é v*?",      duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: QM_E_VC.mp3
  },
  {
    id: 15, title: "rollercoaster",
    masked: "r*******ster",  duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: ROLLERCOASTER.mp3
  },
  {
    id: 16, title: "tédio",
    masked: "t***o",         duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: null, // arquivo: TEDIO.mp3
  },
]

// Alias para compatibilidade com código legado que importava CIDADE_NEON_TRACKS
export const CIDADE_NEON_TRACKS = ALBUM_TRACKS

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
      // Auto-avanca para a proxima faixa playable (com ou sem audio)
      const nextIdx = ALBUM_TRACKS.findIndex((t, i) => i > _trackIdx && t.playable)
      if (nextIdx >= 0) {
        const next = ALBUM_TRACKS[nextIdx]
        _trackIdx = nextIdx
        setTrackIdx(nextIdx)
        setElapsed(0)
        if (next?.audioUrl) {
          el.src = next.audioUrl
          el.currentTime = 0
          el.play().then(() => { setPlaying(true); startTick() }).catch(() => {})
        }
        // sem audioUrl: apenas troca o estado visual da faixa
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
    if (!track?.playable) return
    const el = getAudioEl()
    if (!el) return

    stopTick()
    _trackIdx = index
    setTrackIdx(index)

    if (track.audioUrl) {
      // Troca src apenas se for uma faixa diferente
      if (el.src !== track.audioUrl) {
        el.src = track.audioUrl
        el.currentTime = 0
      }
      setElapsed(Math.floor(el.currentTime))
      el.play().then(() => { setPlaying(true); startTick() }).catch(() => {})
    } else {
      // Sem audio: pausa o player atual, marca como "tocando" visualmente
      el.pause()
      if (el.src) { el.src = ""; el.currentTime = 0 }
      setElapsed(0)
      setPlaying(true)
      startTick()
    }
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
    // Avanca para a proxima faixa da lista (playable), incluindo as sem audio
    const nextIdx = ALBUM_TRACKS.findIndex((t, i) => i > _trackIdx && t.playable)
    if (nextIdx >= 0) play(nextIdx)
  }, [play])

  const prev = useCallback(() => {
    const el = getAudioEl()
    // Se passou de 3s, volta pro inicio da faixa atual
    if (el && el.currentTime > 3) { el.currentTime = 0; setElapsed(0); return }
    // Senao, vai para a faixa anterior
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
