"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

type SpotifyView = "now-playing" | "album"

const TRACKS = [
  { id: 1, title: "CHUVA", duration: "3:24", durationSeconds: 204 },
  { id: 2, title: "Copo Americano", duration: "2:58", durationSeconds: 178 },
  { id: 3, title: "Nectar", duration: "3:12", durationSeconds: 192 },
  { id: 4, title: "Dopamina", duration: "2:45", durationSeconds: 165 },
  { id: 5, title: "Sabe Ontem?", duration: "3:01", durationSeconds: 181 },
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

  // Play timer
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1
        updateSpotifyState({ currentTime: newTime })

        // Show WhatsApp notification at 13 seconds during first play
        if (newTime === 13 && isFirstPlay.current && !hasTriggeredNotif.current) {
          hasTriggeredNotif.current = true
          setShowNotification(true)
        }

        if (newTime >= currentTrack.durationSeconds) {
          // Next track
          if (currentTrackIndex < TRACKS.length - 1) {
            setCurrentTrackIndex((i) => i + 1)
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
      // From album view, go to phone home
      router.push("/")
    }
  }, [view, router])

  const handleTrackSelect = (index: number) => {
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
    } else if (currentTrackIndex > 0) {
      setCurrentTrackIndex((i) => i - 1)
      setElapsedTime(0)
      setProgress(0)
    }
  }

  const handleNextTrack = () => {
    if (currentTrackIndex < TRACKS.length - 1) {
      setCurrentTrackIndex((i) => i + 1)
      setElapsedTime(0)
      setProgress(0)
    }
  }

  // ─── NOW PLAYING VIEW ───
  if (view === "now-playing") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div
          className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative flex flex-col"
          style={{ fontFamily: 'Circular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        >
          {/* Background gradient from album art */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, #3b1d5e 0%, #1a0e2e 40%, #121212 70%, #000000 100%)",
            }}
          />

          {/* iPhone Notch */}
          <div className="relative z-20 h-[54px] flex items-center justify-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
          </div>

          {/* WhatsApp Notification */}
          {showNotification && (
            <button
              type="button"
              onClick={handleNotificationClick}
              className="absolute top-[60px] left-3 right-3 z-50 animate-slide-down"
            >
              <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
                <div className="w-10 h-10 rounded-[10px] bg-[#25D366] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  </svg>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-black font-semibold text-sm">WhatsApp</p>
                    <span className="text-[#8e8e93] text-xs">agora</span>
                  </div>
                  <p className="text-black font-medium text-xs">Cidade Neon</p>
                  <p className="text-[#8e8e93] text-xs truncate">D-Bee: Voce chegou.</p>
                </div>
              </div>
            </button>
          )}

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-2">
            <button type="button" onClick={handleBack} className="p-2 -ml-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m7-7l-7 7 7 7" />
              </svg>
            </button>
            <div className="text-center">
              <p className="text-white/60 text-[10px] uppercase tracking-widest">TOCANDO DO ALBUM</p>
              <p className="text-white text-xs font-semibold">Cidade Neon</p>
            </div>
            <button type="button" className="p-2 -mr-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </div>

          {/* Album Art */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-[320px] aspect-square rounded-lg overflow-hidden shadow-2xl shadow-black/60 mb-8">
              <Image
                src="/images/album-cover.jpg"
                alt="CHUVA - LU2CA"
                width={320}
                height={320}
                className="w-full h-full object-cover"
                priority
              />
            </div>

            {/* Track Info */}
            <div className="w-full flex items-start justify-between mb-6">
              <div className="min-w-0 flex-1">
                <h1 className="text-white text-xl font-bold truncate">{currentTrack.title}</h1>
                <p className="text-white/60 text-sm">LU2CA</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLiked(!isLiked)}
                className="p-2 flex-shrink-0"
                aria-label={isLiked ? "Descurtir" : "Curtir"}
              >
                {isLiked ? (
                  <svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full mb-4">
              <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="relative h-full">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"
                    style={{ left: `calc(${progress}% - 6px)` }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-2 text-white/40 text-[11px] tabular-nums">
                <span>{formatTime(elapsedTime)}</span>
                <span>{currentTrack.duration}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="w-full flex items-center justify-between px-4">
              <button
                type="button"
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-2 ${isShuffle ? "text-[#1DB954]" : "text-white/60"}`}
                aria-label="Aleatório"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                </svg>
                {isShuffle && <div className="w-1 h-1 bg-[#1DB954] rounded-full mx-auto mt-1" />}
              </button>

              <button type="button" onClick={handlePrevTrack} className="p-2 text-white">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center active:scale-95 transition-transform"
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? (
                  <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button type="button" onClick={handleNextTrack} className="p-2 text-white">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setIsRepeat(!isRepeat)}
                className={`p-2 ${isRepeat ? "text-[#1DB954]" : "text-white/60"}`}
                aria-label="Repetir"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
                {isRepeat && <div className="w-1 h-1 bg-[#1DB954] rounded-full mx-auto mt-1" />}
              </button>
            </div>

            {/* Bottom action row */}
            <div className="w-full flex items-center justify-between mt-6 px-2">
              <button type="button" className="p-2 text-white/60" aria-label="Dispositivos">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </button>
              <button type="button" className="p-2 text-white/60" aria-label="Fila">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Home Indicator */}
          <div className="relative z-10 pb-2 flex justify-center">
            <div className="w-32 h-1 bg-white/30 rounded-full" />
          </div>
        </div>

        <style jsx>{`
          @keyframes slide-down {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .animate-slide-down { animation: slide-down 0.3s ease-out; }
        `}</style>
      </div>
    )
  }

  // ─── ALBUM VIEW ───
  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative flex flex-col bg-[#121212]"
        style={{ fontFamily: 'Circular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        {/* iPhone Notch */}
        <div className="relative z-20 h-[54px] flex items-center justify-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        </div>

        {/* WhatsApp Notification */}
        {showNotification && (
          <button
            type="button"
            onClick={handleNotificationClick}
            className="absolute top-[60px] left-3 right-3 z-50 animate-slide-down"
          >
            <div className="bg-[#f2f2f7]/95 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
              <div className="w-10 h-10 rounded-[10px] bg-[#25D366] flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-black font-semibold text-sm">WhatsApp</p>
                  <span className="text-[#8e8e93] text-xs">agora</span>
                </div>
                <p className="text-black font-medium text-xs">Cidade Neon</p>
                <p className="text-[#8e8e93] text-xs truncate">D-Bee: Voce chegou.</p>
              </div>
            </div>
          </button>
        )}

        {/* Header with Gradient */}
        <div className="relative">
          <div
            className="absolute inset-0 h-[360px]"
            style={{
              background: "linear-gradient(180deg, #3b1d5e 0%, #1f1035 40%, #121212 100%)",
            }}
          />

          {/* Back Button */}
          <div className="relative px-4 py-2">
            <button type="button" onClick={handleBack} className="p-2 -ml-2" aria-label="Voltar">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Album Cover + Info */}
          <div className="relative flex flex-col items-center px-6 pt-2 pb-6">
            <div className="w-[180px] h-[180px] rounded-md overflow-hidden shadow-2xl shadow-black/80 mb-5">
              <Image
                src="/images/album-cover.jpg"
                alt="Cidade Neon"
                width={180}
                height={180}
                className="w-full h-full object-cover"
              />
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">Cidade Neon</h1>
            <p className="text-white/60 text-sm mb-1">LU2CA</p>
            <p className="text-white/40 text-xs">Album - 2025 - {TRACKS.length} musicas</p>

            {/* Action Row */}
            <div className="flex items-center gap-6 mt-4 w-full">
              <div className="flex items-center gap-4">
                <button type="button" className="text-white/60" aria-label="Curtir">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button type="button" className="text-white/60" aria-label="Download">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <button type="button" className="text-white/60" aria-label="Mais">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="19" cy="12" r="2" />
                  </svg>
                </button>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIsShuffle(!isShuffle)} className={`p-1 ${isShuffle ? "text-[#1DB954]" : "text-white/60"}`}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => { handleTrackSelect(0) }}
                  className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Reproduzir"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 overflow-y-auto px-4 pb-[100px]">
          {TRACKS.map((track, index) => (
            <button
              key={track.id}
              type="button"
              className="w-full flex items-center gap-3 py-3 hover:bg-white/5 rounded-md transition-colors text-left"
              onClick={() => handleTrackSelect(index)}
            >
              <div className="w-8 text-center">
                {currentTrackIndex === index && isPlaying ? (
                  <div className="flex items-end justify-center gap-[2px] h-4">
                    <div className="w-[3px] bg-[#1DB954] rounded-sm animate-eq-1" />
                    <div className="w-[3px] bg-[#1DB954] rounded-sm animate-eq-2" />
                    <div className="w-[3px] bg-[#1DB954] rounded-sm animate-eq-3" />
                  </div>
                ) : (
                  <span className="text-white/40 text-sm">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${currentTrackIndex === index ? "text-[#1DB954]" : "text-white"}`}>
                  {track.title}
                </p>
                <p className="text-white/40 text-xs">LU2CA</p>
              </div>
              <span className="text-white/40 text-xs">{track.duration}</span>
              <button type="button" className="p-1 text-white/30" aria-label="Mais opcoes">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
            </button>
          ))}
        </div>

        {/* Mini Player Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <div className="bg-[#181818] border-t border-white/5">
            {/* Mini player content */}
            <div className="px-2 pt-2">
              <button
                type="button"
                onClick={() => setView("now-playing")}
                className="w-full"
              >
                <div className="flex items-center gap-3 p-2 bg-[#2a2a2a] rounded-lg">
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                    <Image src="/images/album-cover.jpg" alt="Album" width={40} height={40} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white text-sm font-medium truncate">{currentTrack.title}</p>
                    <p className="text-white/40 text-xs">LU2CA</p>
                  </div>
                  <button
                    type="button"
                    className="p-2 text-white/60"
                    onClick={(e) => { e.stopPropagation(); }}
                    aria-label="Dispositivos"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="p-2 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsPlaying(!isPlaying)
                    }}
                    aria-label={isPlaying ? "Pausar" : "Reproduzir"}
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </button>

              {/* Progress line */}
              <div className="px-2 mt-1">
                <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)]">
              <button type="button" className="flex flex-col items-center gap-1 text-white" aria-label="Inicio">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span className="text-[10px]">Inicio</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-1 text-white/40" aria-label="Buscar">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-[10px]">Buscar</span>
              </button>
              <button type="button" className="flex flex-col items-center gap-1 text-white/40" aria-label="Biblioteca">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-[10px]">Biblioteca</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        @keyframes eq-1 {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        @keyframes eq-2 {
          0%, 100% { height: 10px; }
          50% { height: 4px; }
        }
        @keyframes eq-3 {
          0%, 100% { height: 6px; }
          50% { height: 16px; }
        }
        .animate-eq-1 { animation: eq-1 0.8s ease-in-out infinite; }
        .animate-eq-2 { animation: eq-2 0.6s ease-in-out infinite; }
        .animate-eq-3 { animation: eq-3 0.9s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
