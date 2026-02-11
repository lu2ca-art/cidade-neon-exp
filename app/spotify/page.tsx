"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

const tracks = [
  { id: 1, title: "CHUVA", duration: "3:24", durationSeconds: 204 },
  { id: 2, title: "Copo Americano", duration: "2:58", durationSeconds: 178 },
]

export default function SpotifyPage() {
  const router = useRouter()
  const [currentTrack, setCurrentTrack] = useState(tracks[0])
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isGlitching, setIsGlitching] = useState(false)
  const hasTransitioned = useRef(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const triggerGlitch = useCallback(() => {
    if (hasTransitioned.current) return
    hasTransitioned.current = true
    setIsGlitching(true)
    setTimeout(() => {
      router.push("/hacker")
    }, 600)
  }, [router])

  useEffect(() => {
    if (!isPlaying || !isMounted) return

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1

        // Trigger glitch between 20-25 seconds
        if (newTime >= 22 && !hasTransitioned.current) {
          triggerGlitch()
        }

        if (newTime >= currentTrack.durationSeconds) {
          // Move to next track
          const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id)
          if (currentIndex < tracks.length - 1) {
            setCurrentTrack(tracks[currentIndex + 1])
            return 0
          }
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
  }, [isPlaying, currentTrack, triggerGlitch, isMounted])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleTrackSelect = (track: (typeof tracks)[0]) => {
    setCurrentTrack(track)
    setProgress(0)
    setElapsedTime(0)
    setIsPlaying(true)
  }

  if (!isMounted) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <div
      className={`min-h-screen bg-black text-white overflow-x-hidden ${isGlitching ? "animate-glitch" : ""}`}
      style={{ fontFamily: 'Circular, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      {/* Glitch Overlay */}
      {isGlitching && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-[#00FF66] opacity-20 animate-flicker" />
          <div className="absolute inset-0 bg-black opacity-80 animate-pulse" />
          <div
            className="absolute inset-0"
            style={{
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,102,0.1) 2px, rgba(0,255,102,0.1) 4px)",
            }}
          />
        </div>
      )}

      <div className="w-full max-w-[100vw] md:max-w-[400px] mx-auto min-h-screen flex flex-col">
        {/* Header with Playlist Cover */}
        <div className="relative">
          {/* Gradient Background */}
          <div
            className="absolute inset-0 h-[320px]"
            style={{
              background: "linear-gradient(180deg, #5038a0 0%, #1a1a1a 70%, #000000 100%)",
            }}
          />

          {/* Status Bar */}
          <div className="relative h-[44px] flex items-center justify-between px-4 text-white text-sm">
            <span className="font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                <path d="M2 17h2v4H2zm5-5h2v9H7zm5-5h2v14h-2zm5-5h2v19h-2z" />
              </svg>
              <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24">
                <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
              </svg>
              <svg className="w-6 h-4" fill="white" viewBox="0 0 24 24">
                <rect x="2" y="7" width="18" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" />
                <rect x="4" y="9" width="12" height="6" rx="1" fill="white" />
                <path d="M21 10v4c1 0 1.5-.5 1.5-2s-.5-2-1.5-2z" fill="white" />
              </svg>
            </div>
          </div>

          {/* Back Button */}
          <div className="relative px-4 py-2">
            <button className="w-8 h-8 flex items-center justify-center" aria-label="Voltar">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Playlist Cover */}
          <div className="relative flex flex-col items-center px-4 pt-4 pb-6">
            <div className="w-[200px] h-[200px] rounded-lg overflow-hidden shadow-2xl mb-6 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🌃</div>
                <span className="text-white font-bold text-lg tracking-wide">CIDADE NEON</span>
              </div>
            </div>

            {/* Playlist Info */}
            <h1 className="text-2xl font-bold text-white mb-1">Cidade Neon</h1>
            <p className="text-[#B3B3B3] text-sm mb-2">LU2CA</p>
            <p className="text-[#B3B3B3] text-xs">2 músicas • 6 min</p>

            {/* Action Buttons */}
            <div className="flex items-center gap-6 mt-4">
              <button className="text-[#B3B3B3] hover:text-white" aria-label="Curtir">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
              <button className="text-[#B3B3B3] hover:text-white" aria-label="Download">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
              <button className="text-[#B3B3B3] hover:text-white" aria-label="Mais opções">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              <button
                className="w-14 h-14 rounded-full bg-[#1DB954] flex items-center justify-center ml-4 active:scale-95 transition-transform"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? "Pausar" : "Reproduzir"}
              >
                {isPlaying ? (
                  <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="flex-1 px-4 pb-[140px]">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              className="w-full flex items-center gap-3 py-3 hover:bg-white/5 rounded-md transition-colors text-left"
              onClick={() => handleTrackSelect(track)}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded flex items-center justify-center text-xs">
                {currentTrack.id === track.id && isPlaying ? (
                  <div className="flex items-end gap-[2px] h-4">
                    <div className="w-[3px] bg-[#1DB954] animate-bounce" style={{ animationDelay: "0ms", height: "60%" }} />
                    <div className="w-[3px] bg-[#1DB954] animate-bounce" style={{ animationDelay: "150ms", height: "100%" }} />
                    <div className="w-[3px] bg-[#1DB954] animate-bounce" style={{ animationDelay: "300ms", height: "40%" }} />
                  </div>
                ) : (
                  <span className="text-white/60">{index + 1}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${currentTrack.id === track.id ? "text-[#1DB954]" : "text-white"}`}>
                  {track.title}
                </p>
                <p className="text-[#B3B3B3] text-sm">LU2CA</p>
              </div>
              <span className="text-[#B3B3B3] text-sm">{track.duration}</span>
              <button className="p-2 text-[#B3B3B3]" aria-label="Mais opções">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </button>
          ))}
        </div>

        {/* Now Playing Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-white/10">
          {/* Mini Player */}
          <div className="max-w-[400px] mx-auto">
            <div className="px-2 py-2">
              <div className="flex items-center gap-3 p-2 bg-[#404040] rounded-lg">
                <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600 to-pink-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{currentTrack.title}</p>
                  <p className="text-[#B3B3B3] text-xs">LU2CA</p>
                </div>
                <button className="p-2 text-white" aria-label="Conectar dispositivo">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                <button
                  className="p-2 text-white"
                  onClick={() => setIsPlaying(!isPlaying)}
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

              {/* Progress Bar */}
              <div className="mt-1 px-2">
                <div className="h-[2px] bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-1000 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-[#B3B3B3]">
                  <span>{formatTime(elapsedTime)}</span>
                  <span>{currentTrack.duration}</span>
                </div>
              </div>
            </div>

            {/* Bottom Navigation */}
            <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)]">
              <button className="flex flex-col items-center gap-1 text-white" aria-label="Início">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
                <span className="text-[10px]">Início</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-[#B3B3B3]" aria-label="Buscar">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-[10px]">Buscar</span>
              </button>
              <button className="flex flex-col items-center gap-1 text-[#B3B3B3]" aria-label="Sua Biblioteca">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <span className="text-[10px]">Biblioteca</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes glitch {
          0% {
            transform: translate(0);
            filter: hue-rotate(0deg);
          }
          10% {
            transform: translate(-5px, 2px);
            filter: hue-rotate(90deg);
          }
          20% {
            transform: translate(5px, -2px);
            filter: hue-rotate(180deg);
          }
          30% {
            transform: translate(-3px, 3px);
            filter: hue-rotate(270deg);
          }
          40% {
            transform: translate(3px, -3px);
            filter: hue-rotate(360deg);
          }
          50% {
            transform: translate(-2px, 1px);
          }
          60% {
            transform: translate(2px, -1px);
          }
          70% {
            transform: translate(-1px, 2px);
          }
          80% {
            transform: translate(1px, -2px);
          }
          90% {
            transform: translate(0);
          }
          100% {
            transform: translate(0);
          }
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.5;
          }
          75% {
            opacity: 0.1;
          }
        }

        .animate-glitch {
          animation: glitch 0.3s ease-in-out infinite;
        }

        .animate-flicker {
          animation: flicker 0.1s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
