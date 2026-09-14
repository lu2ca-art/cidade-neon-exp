"use client"

import { createContext, useContext, useRef, useState, useCallback, useEffect, type ReactNode } from "react"
import { track as trackEvent, type MusicSource } from "@/lib/analytics"

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
// audioUrl aponta pros mesmos cortes de 22s já usados no rádio do carro
// (public/audio/tracks/) — as prévias oficiais do álbum são as mesmas faixas,
// só que aqui reunidas numa única lista completa (ver reward-gating em
// /spotify/auto-chuva: só toca de verdade depois de unlocked.finalCompleted)
export const ALBUM_TRACKS: Track[] = [
  {
    id: 1, title: "sextafeira",
    masked: "s*****ira",     duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/sextafeira.mp3",
  },
  {
    id: 2, title: "nectar",
    masked: "n****r",        duration: "0:22", durationSec: 22,
    playable: true, color: "#FF6B9D",
    audioUrl: "/audio/tracks/nectar.mp3",
  },
  {
    id: 3, title: "copo americano",
    masked: "c*** a*****no", duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/222-copo-americano.mp3",
  },
  {
    id: 4, title: "dopaminA",
    masked: "d*****nA",      duration: "0:22", durationSec: 22,
    playable: true, color: "#FF9D6B",
    audioUrl: "/audio/tracks/dopamina.mp3",
  },
  {
    id: 5, title: "ojalá",
    masked: "o***á",         duration: "0:22", durationSec: 22,
    playable: true, color: "#6B9DFF",
    audioUrl: "/audio/tracks/ojala.mp3",
  },
  {
    id: 6, title: "swav",
    masked: "s**v",          duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/swav.mp3",
  },
  {
    id: 7, title: "cliche",
    masked: "c****e",        duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/cliche.mp3",
  },
  {
    id: 8, title: "sabe ontem?",
    masked: "s*** o****?",   duration: "0:22", durationSec: 22,
    playable: true, color: "#FFD93D",
    audioUrl: "/audio/tracks/sabe-ontem.mp3",
  },
  {
    id: 9, title: "hollywood",
    masked: "h*****ood",     duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/hollywood.mp3",
  },
  {
    id: 10, title: "stylist",
    masked: "s*****t",       duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/stylist.mp3",
  },
  {
    id: 11, title: "oasis",
    masked: "o***s",         duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/oasis.mp3",
  },
  {
    id: 12, title: "astronauta",
    masked: "a*******a",     duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/astronauta.mp3",
  },
  {
    id: 13, title: "CHUVA",
    masked: "C***A",         duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/222-chuva.mp3",
  },
  {
    id: 14, title: "qm é vc?",
    masked: "q* é v*?",      duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/qm-e-vc.mp3",
  },
  {
    id: 15, title: "rollercoaster",
    masked: "r*******ster",  duration: "0:22", durationSec: 22,
    playable: true,
    audioUrl: "/audio/tracks/rollercoaster.mp3",
  },
]

// Alias para compatibilidade com código legado que importava CIDADE_NEON_TRACKS
export const CIDADE_NEON_TRACKS = ALBUM_TRACKS

interface AudioPlayerContextType {
  currentTrack: Track | null
  trackIdx: number
  playing: boolean
  elapsed: number
  play: (trackIndex: number, source?: MusicSource) => void
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

const MILESTONES = [25, 50, 75, 100] as const

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [trackIdx, setTrackIdx] = useState(_trackIdx)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Estado do "playthrough" atual, pra music_progress/music_abandoned —
  // não é estado de componente porque play() precisa ler/escrever fora do
  // ciclo de render (dentro do handler de "ended" e no próprio play()).
  const currentPlayRef = useRef<{ id: number; durationSec: number; milestonesFired: Set<number> } | null>(null)
  const playCountRef = useRef<Record<number, number>>({})

  const stopTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }, [])

  const checkMilestones = useCallback((pct: number) => {
    const cur = currentPlayRef.current
    if (!cur) return
    for (const m of MILESTONES) {
      if (pct >= m && !cur.milestonesFired.has(m)) {
        cur.milestonesFired.add(m)
        trackEvent("music_progress", { track_id: cur.id, milestone: m })
      }
    }
  }, [])

  // Sempre dispara music_play_started (marca o início do playthrough); a
  // partir da 2ª vez que a MESMA faixa toca, dispara também music_replayed.
  // Arma o playthrough atual pro milestone/abandonment tracking acima.
  const beginPlaythrough = useCallback((track: Track, source: MusicSource) => {
    currentPlayRef.current = { id: track.id, durationSec: track.durationSec, milestonesFired: new Set() }
    const count = (playCountRef.current[track.id] ?? 0) + 1
    playCountRef.current[track.id] = count

    trackEvent("music_play_started", {
      track_id: track.id,
      track_name: track.title ?? track.masked ?? `track-${track.id}`,
      source,
    })
    if (count > 1) {
      trackEvent("music_replayed", { track_id: track.id, replay_number: count })
    }
  }, [])

  // Dispara music_abandoned se o playthrough atual for interrompido antes
  // de quase terminar (troca de faixa, stop, fechar aba) — completar até o
  // fim não conta como abandono, é coberto pelo milestone 100 acima.
  const emitAbandonIfIncomplete = useCallback((reason: string) => {
    const el = getAudioEl()
    const cur = currentPlayRef.current
    if (!el || !cur) return
    const positionMs = Math.floor(el.currentTime * 1000)
    const totalMs = cur.durationSec * 1000
    const pct = totalMs > 0 ? Math.min(100, (positionMs / totalMs) * 100) : 0
    if (pct < 98) {
      trackEvent("music_abandoned", {
        track_id: cur.id,
        position_ms: positionMs,
        total_ms: totalMs,
        position_pct: Math.round(pct),
        reason,
      })
    }
  }, [])

  const startTick = useCallback(() => {
    stopTick()
    tickRef.current = setInterval(() => {
      const el = getAudioEl()
      const cur = currentPlayRef.current
      if (el) {
        setElapsed(Math.floor(el.currentTime))
        if (cur && cur.durationSec > 0) checkMilestones((el.currentTime / cur.durationSec) * 100)
      }
    }, 250)
  }, [stopTick, checkMilestones])

  // Fecha o playthrough em andamento quando a aba é escondida/fechada —
  // sem isso, um usuário que fecha no meio de uma faixa nunca gera
  // music_abandoned (nem play() nem "ended" rodam nesse caso).
  useEffect(() => {
    const handlePageHide = () => emitAbandonIfIncomplete("closed")
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") emitAbandonIfIncomplete("tab_hidden")
    }
    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibility)
    return () => {
      window.removeEventListener("pagehide", handlePageHide)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [emitAbandonIfIncomplete])

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
      // Terminou de verdade (não abandono) — garante que o milestone 100%
      // seja registrado mesmo se o último tick de 250ms não chegou a rodar.
      checkMilestones(100)
      currentPlayRef.current = null
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
          beginPlaythrough(next, "other")
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
  }, [startTick, stopTick, checkMilestones, beginPlaythrough])

  const play = useCallback((index: number, source: MusicSource = "other") => {
    const track = ALBUM_TRACKS[index]
    if (!track?.playable) return
    const el = getAudioEl()
    if (!el) return

    // Trocando de faixa no meio de outra que não tinha terminado — registra
    // o abandono da anterior antes de começar a nova.
    if (currentPlayRef.current && currentPlayRef.current.id !== track.id) {
      emitAbandonIfIncomplete("track_change")
    }

    stopTick()
    _trackIdx = index
    setTrackIdx(index)

    beginPlaythrough(track, source)

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
  }, [startTick, stopTick, emitAbandonIfIncomplete, beginPlaythrough])

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
    emitAbandonIfIncomplete("stopped")
    currentPlayRef.current = null
    const el = getAudioEl()
    if (el) { el.pause(); el.src = "" }
    setPlaying(false)
    stopTick()
  }, [stopTick, emitAbandonIfIncomplete])

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
