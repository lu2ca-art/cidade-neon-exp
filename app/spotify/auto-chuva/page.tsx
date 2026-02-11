"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

type SpotifyView = "now-playing" | "album"

const TRACKS = [
  { id: 1, title: "CHUVA", duration: "3:24", durationSeconds: 204, playable: true },
  { id: 2, title: "Copo Americano", duration: "2:58", durationSeconds: 178, playable: true },
  { id: 3, title: null, duration: "3:12", durationSeconds: 192, playable: false },
  { id: 4, title: null, duration: "2:45", durationSeconds: 165, playable: false },
  { id: 5, title: null, duration: "3:01", durationSeconds: 181, playable: false },
]

export default function SpotifyAutoPage() {
  const router = useRouter()
  const { updateCinematicStep, updateSpotifyState, state } = useGameFunnel()

  const [view, setView] = useState<SpotifyView>("now-playing")
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(state.perAppState.spotifyAuto.currentTime)
  const [progress, setProgress] = useState(0)
  const [showNotification, setShowNotification] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isRepeat, setIsRepeat] = useState(false)
  const hasTriggeredNotif = useRef(false)
  const isFirstPlay = useRef(!state.perAppState.spotifyAuto.completed)

  const currentTrack = TRACKS[currentTrackIndex]

  useEffect(() => {
    updateCinematicStep("spotify-auto")
  }, [updateCinematicStep])

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1
        updateSpotifyState({ currentTime: newTime })
        if (newTime === 13 && isFirstPlay.current && !hasTriggeredNotif.current) {
          hasTriggeredNotif.current = true
          setShowNotification(true)
        }
        if (newTime >= currentTrack.durationSeconds) {
          if (currentTrackIndex === 0) {
            setCurrentTrackIndex(1)
            return 0
          }
          setIsPlaying(false)
          return prev
        }
        return newTime
      })
      setProgress((prev) => {
        const increment = 100 / currentTrack.durationSeconds
        if (prev >= 100) return 0
        return prev + increment
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying, currentTrack, currentTrackIndex, updateSpotifyState])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleNotificationClick = () => {
    setShowNotification(false)
    isFirstPlay.current = false
    updateSpotifyState({ completed: true })
    updateCinematicStep("whatsapp-notification")
    router.push("/whatsapp/grupo")
  }

  const handleBack = useCallback(() => {
    if (view === "now-playing") {
      setView("album")
    } else {
      router.push("/")
    }
  }, [view, router])

  const handleTrackSelect = (index: number) => {
    if (!TRACKS[index].playable) return
    setCurrentTrackIndex(index)
    setElapsedTime(0)
    setProgress(0)
    setIsPlaying(true)
    setView("now-playing")
  }

  const handlePrevTrack = () => {
    if (elapsedTime > 3) {
      setElapsedTime(0)
      setProgress(0)
    } else if (currentTrackIndex > 0 && TRACKS[currentTrackIndex - 1].playable) {
      setCurrentTrackIndex((i) => i - 1)
      setElapsedTime(0)
      setProgress(0)
    }
  }

  const handleNextTrack = () => {
    if (currentTrackIndex < 1 && TRACKS[currentTrackIndex + 1].playable) {
      setCurrentTrackIndex((i) => i + 1)
      setElapsedTime(0)
      setProgress(0)
    }
  }

  'use client'

  import { useState, useEffect, useRef } from 'react'
  import { useRouter } from 'next/navigation'
  import Image from 'next/image'
  import { useGameFunnel } from '@/app/providers/GameFunnelProvider'

  export default function SpotifyAutoPage() {
    const router = useRouter()
    const { updateSpotifyState } = useGameFunnel()

    // ───────────── STATES ─────────────
    const [view, setView] = useState<'album' | 'now-playing'>('album')
    const [isPlaying, setIsPlaying] = useState(true)
    const [progress, setProgress] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [showNotification, setShowNotification] = useState(false)

    const durationInSeconds = 120
    const didInit = useRef(false)

    // ───────────── INIT PROVIDER SAFE ─────────────
    useEffect(() => {
      if (didInit.current) return
      didInit.current = true

      updateSpotifyState(prev => ({
        ...prev,
        screen: 'auto-chuva',
        currentTrack: 'CHUVA'
      }))
    }, [updateSpotifyState])

    // ───────────── PROGRESS TIMER SAFE ─────────────
    useEffect(() => {
      if (!isPlaying) return

      const interval = window.setInterval(() => {
        setElapsedTime(prev => {
          if (prev >= durationInSeconds) {
            clearInterval(interval)
            return durationInSeconds
          }
          return prev + 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }, [isPlaying])

    // ───────────── PROGRESS CALCULATION ─────────────
    useEffect(() => {
      setProgress((elapsedTime / durationInSeconds) * 100)

      if (elapsedTime === 20) {
        setShowNotification(true)
      }

      if (elapsedTime === durationInSeconds) {
        router.push('/home')
      }
    }, [elapsedTime, router])

    // ───────────── HANDLERS ─────────────
    const handleBack = () => router.back()

    const handleNotificationClick = () => {
      setShowNotification(false)
      router.push('/whatsapp')
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // ───────────── UI ─────────────
    return (
      <div className="min-h-screen bg-black flex items-center justify-center touch-manipulation">
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col bg-[#121212] overflow-x-hidden">

          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

          {/* Status bar */}
          <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs">
            <span className="font-semibold w-12">9:41</span>
            <span>🔋</span>
          </div>

          {/* Notification */}
          {showNotification && (
            <button
              type="button"
              onClick={handleNotificationClick}
              className="absolute top-[50px] left-2 right-2 z-50 bg-white text-black rounded-xl p-3 shadow-xl"
            >
              WhatsApp • Cidade Neon
            </button>
          )}

          {/* Album View */}
          {view === 'album' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              <Image
                src="/images/album-cover.jpg"
                alt="CHUVA - LU2CA"
                width={200}
                height={200}
                className="rounded-lg mb-6"
              />

              <button
                type="button"
                onClick={() => setView('now-playing')}
                className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center active:scale-95 transition-transform min-h-[44px]"
              >
                ▶
              </button>
            </div>
          )}

          {/* Now Playing */}
          {view === 'now-playing' && (
            <div className="flex-1 flex flex-col justify-center px-6">

              <Image
                src="/images/album-cover.jpg"
                alt="CHUVA - LU2CA"
                width={250}
                height={250}
                className="rounded-lg mb-6"
              />

              <div className="w-full mb-4">
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-white/40 text-xs">
                  <span>{formatTime(elapsedTime)}</span>
                  <span>2:00</span>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsPlaying(p => !p)}
                  className="w-14 h-14 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform min-h-[44px]"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
              </div>
            </div>
          )}

          {/* Bottom safe area */}
          <div className="pb-[env(safe-area-inset-bottom,8px)]" />

        </div>
      </div>
    )
  }

