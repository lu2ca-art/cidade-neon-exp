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

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentTrack = ALBUM_TRACKS[trackIdx] ?? null

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Sync elapsed time with audio element
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      if (audioRef.current) {
        setElapsed(Math.floor(audioRef.current.currentTime))
      }
    }, 250)
  }, [])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const play = useCallback((index: number) => {
    const track = ALBUM_TRACKS[index]
    if (!track?.playable || !track.audioUrl) return

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute("src")
      audioRef.current = null
    }

    const audio = new Audio(track.audioUrl)
    audio.volume = 0.8
    audio.addEventListener("ended", () => {
      // Auto-advance to next playable track
      const nextIdx = ALBUM_TRACKS.findIndex((t, i) => i > index && t.playable)
      if (nextIdx >= 0) {
        setTrackIdx(nextIdx)
        // Small delay to let state settle
        setTimeout(() => {
          const nextTrack = ALBUM_TRACKS[nextIdx]
          if (nextTrack?.audioUrl) {
            const nextAudio = new Audio(nextTrack.audioUrl)
            nextAudio.volume = 0.8
            nextAudio.addEventListener("ended", () => {
              setPlaying(false)
              stopTimer()
            })
            nextAudio.play().catch(() => {})
            audioRef.current = nextAudio
          }
        }, 100)
      } else {
        setPlaying(false)
        stopTimer()
      }
    })

    audio.play().catch(() => {})
    audioRef.current = audio
    setTrackIdx(index)
    setElapsed(0)
    setPlaying(true)
    startTimer()
  }, [startTimer, stopTimer])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setPlaying(false)
    stopTimer()
  }, [stopTimer])

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
      startTimer()
    }
  }, [startTimer])

  const toggle = useCallback(() => {
    if (playing) pause()
    else resume()
  }, [playing, pause, resume])

  const seekTo = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds
      setElapsed(seconds)
    }
  }, [])

  const next = useCallback(() => {
    const nextIdx = ALBUM_TRACKS.findIndex((t, i) => i > trackIdx && t.playable)
    if (nextIdx >= 0) play(nextIdx)
  }, [trackIdx, play])

  const prev = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0
      setElapsed(0)
      return
    }
    // Find previous playable track
    for (let i = trackIdx - 1; i >= 0; i--) {
      if (ALBUM_TRACKS[i].playable) {
        play(i)
        return
      }
    }
  }, [trackIdx, play])

  const stopAndClear = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute("src")
      audioRef.current = null
    }
    setPlaying(false)
    stopTimer()
  }, [stopTimer])

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
