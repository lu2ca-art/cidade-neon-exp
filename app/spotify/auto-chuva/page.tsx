"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

export default function SpotifyAutoPage() {
  const router = useRouter()
  const { updateCinematicStep, updateSpotifyState, state } = useGameFunnel()
  
  const [currentTime, setCurrentTime] = useState(state.perAppState.spotifyAuto.currentTime)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  
  const PLAY_DURATION = 15 // 15 seconds
  const TRACK_DURATION = 180 // Fake track duration for display

  useEffect(() => {
    updateCinematicStep("spotify-auto")
  }, [updateCinematicStep])

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 1
        updateSpotifyState({ currentTime: newTime })
        
        // Show WhatsApp notification at 13 seconds
        if (newTime === 13) {
          setShowNotification(true)
        }
        
        // End and transition at 15 seconds
        if (newTime >= PLAY_DURATION) {
          clearInterval(interval)
          updateSpotifyState({ completed: true })
          updateCinematicStep("whatsapp-notification")
          
          // Auto-transition after notification shows
          setTimeout(() => {
            router.push("/whatsapp/grupo")
          }, 2000)
        }
        
        return newTime
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isPlaying, router, updateCinematicStep, updateSpotifyState])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleNotificationClick = () => {
    router.push("/whatsapp/grupo")
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div 
        className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative flex flex-col"
        style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #121212 50%, #000000 100%)" }}
      >
        {/* WhatsApp Notification */}
        {showNotification && (
          <button 
            type="button"
            onClick={handleNotificationClick} 
            className="absolute top-12 left-4 right-4 z-50 animate-slide-down"
          >
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-3 flex items-center gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-black font-semibold text-sm">Cidade Neon</p>
                <p className="text-gray-600 text-xs">Convite para grupo</p>
              </div>
              <span className="text-gray-400 text-xs">agora</span>
            </div>
          </button>
        )}

        {/* Status Bar */}
        <div className="h-[44px] flex items-center justify-between px-6 text-white text-sm pt-2">
          <span className="font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M2 17h2v4H2zm5-5h2v9H7zm5-5h2v14h-2zm5-5h2v19h-2z" /></svg>
            <svg className="w-6 h-4" fill="white" viewBox="0 0 24 24">
              <rect x="2" y="7" width="18" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" />
              <rect x="4" y="9" width="12" height="6" rx="1" fill="white" />
            </svg>
          </div>
        </div>

        {/* Album Art */}
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="w-full max-w-[300px] aspect-square rounded-lg overflow-hidden shadow-2xl mb-8 relative">
            <Image 
              src="/images/album-cover.jpg" 
              alt="CHUVA - LU2CA" 
              fill 
              className="object-cover"
            />
            {/* Animated pulse overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-end gap-1 h-8">
                    <div className="w-1 bg-white animate-eq-1 rounded-full" />
                    <div className="w-1 bg-white animate-eq-2 rounded-full" />
                    <div className="w-1 bg-white animate-eq-3 rounded-full" />
                    <div className="w-1 bg-white animate-eq-4 rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="text-center mb-4">
            <h1 className="text-white text-2xl font-bold mb-1">CHUVA</h1>
            <p className="text-white/60 text-base">LU2CA</p>
          </div>

          {/* Auto-play indicator */}
          <div className="bg-[#1DB954]/20 rounded-full px-4 py-2 mb-6">
            <p className="text-[#1DB954] text-sm font-medium">Reproduzindo automaticamente...</p>
          </div>

          {/* Progress Bar (disabled, just for show) */}
          <div className="w-full max-w-[300px] mb-4">
            <div className="h-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(currentTime / TRACK_DURATION) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-white/50 text-xs mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(TRACK_DURATION)}</span>
            </div>
          </div>

          {/* Controls (disabled) */}
          <div className="flex items-center justify-center gap-8 opacity-50">
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </div>
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            </div>
            <div className="w-8 h-8 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="pb-8 flex justify-center">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>

        {/* Hidden audio element for potential real audio */}
        <audio ref={audioRef} />
      </div>

      <style jsx>{`
        @keyframes slide-down {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
        
        @keyframes eq-1 {
          0%, 100% { height: 8px; }
          50% { height: 24px; }
        }
        @keyframes eq-2 {
          0%, 100% { height: 16px; }
          50% { height: 8px; }
        }
        @keyframes eq-3 {
          0%, 100% { height: 12px; }
          50% { height: 28px; }
        }
        @keyframes eq-4 {
          0%, 100% { height: 20px; }
          50% { height: 12px; }
        }
        .animate-eq-1 { animation: eq-1 0.8s ease-in-out infinite; }
        .animate-eq-2 { animation: eq-2 0.6s ease-in-out infinite; }
        .animate-eq-3 { animation: eq-3 0.9s ease-in-out infinite; }
        .animate-eq-4 { animation: eq-4 0.7s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
