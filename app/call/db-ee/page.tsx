"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

const CALL_DURATION = 18
const AUDIO_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Upset%20Girl%20-%20Piercing%2CBright%2CMetallic_%20%7Bangry%7DAlo%CC%82%2C%20ta%CC%81%20...-zrwhQAqz6hiwo6Cx6U6z2NBOfoxNRU.mp3"

export default function DBeeCallPage() {
  const router = useRouter()
  const { updateCinematicStep, updateCallState } = useGameFunnel()

  const [isActive, setIsActive] = useState(false)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const startedRef = useRef(false)

  // Auto-answer after 1.2s
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const t = setTimeout(() => {
      setIsActive(true)
      updateCinematicStep("active-call")
      updateCallState({ answered: true })

      // Play D-Bee audio
      const audio = new Audio(AUDIO_URL)
      audio.volume = 0.8
      audio.play().catch(() => {})
      audioRef.current = audio
    }, 1200)

    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Call timer - 18s then hacker
  useEffect(() => {
    if (!isActive) return

    timerRef.current = setInterval(() => {
      setDuration(prev => {
        const next = prev + 1
        if (next >= CALL_DURATION) {
          if (timerRef.current) clearInterval(timerRef.current)
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
          updateCinematicStep("hacker-takeover")
          router.push("/hacker")
        }
        return next
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isActive, router, updateCinematicStep])

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleEndCall = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (timerRef.current) clearInterval(timerRef.current)
    updateCinematicStep("hacker-takeover")
    router.push("/hacker")
  }

  const toggleMute = () => {
    setIsMuted(m => {
      if (audioRef.current) audioRef.current.muted = !m
      return !m
    })
  }

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${(s % 60).toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className={`w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative ${!isActive ? "animate-vibrate" : ""}`}
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
      >
        {/* BG gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C1C1E] to-black" />

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="relative z-10 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs flex-shrink-0">
          <span className="font-semibold w-12">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* Caller info */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-12">
          <div className="relative">
            <div className={`w-[120px] h-[120px] rounded-full overflow-hidden mb-4 ring-4 ring-white/20 ${!isActive ? "animate-pulse" : ""}`}>
              <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={120} height={120} className="w-full h-full object-cover" priority />
            </div>
            {!isActive && (
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: "2s" }} />
            )}
          </div>
          <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
          <p className="text-[#A0A0A0] text-[18px]">mobile</p>
          {isActive ? (
            <p className="text-[#34C759] text-[20px] font-light mt-2 tabular-nums">{fmt(duration)}</p>
          ) : (
            <p className="text-[#A0A0A0] text-[16px] mt-2">Chamada recebida...</p>
          )}

          {/* Audio wave indicator when active */}
          {isActive && (
            <div className="flex items-end gap-[3px] mt-6 h-6">
              {[1,2,3,4,5,4,3,2,1].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-[#34C759] animate-eq"
                  style={{
                    height: `${h * 4}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${0.4 + Math.random() * 0.3}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Call actions */}
        <div className="relative z-10 px-6 pb-10">
          {isActive ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-8">
                <button type="button" onClick={toggleMute} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isMuted ? "bg-white" : "bg-[#48484A]"}`}>
                    <svg className={`w-7 h-7 ${isMuted ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                    </svg>
                  </div>
                  <span className="text-white text-[11px]">mudo</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                  </div>
                  <span className="text-white text-[11px]">teclado</span>
                </button>
                <button type="button" onClick={() => setIsSpeaker(s => !s)} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSpeaker ? "bg-white" : "bg-[#48484A]"}`}>
                    <svg className={`w-7 h-7 ${isSpeaker ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  </div>
                  <span className="text-white text-[11px]">alto-falante</span>
                </button>
              </div>
              <div className="flex justify-center">
                <button type="button" onClick={handleEndCall} className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform">
                  <svg className="w-9 h-9 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-center gap-16">
              <div className="flex flex-col items-center gap-2 opacity-40">
                <div className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center">
                  <svg className="w-9 h-9 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </div>
                <span className="text-white text-xs">Recusar</span>
              </div>
              <div className="flex flex-col items-center gap-2 opacity-40">
                <div className="w-[72px] h-[72px] rounded-full bg-[#34C759] flex items-center justify-center">
                  <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </div>
                <span className="text-white text-xs">Aceitar</span>
              </div>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10"><div className="w-32 h-1 bg-white/30 rounded-full" /></div>
      </div>

      <style jsx>{`
        @keyframes vibrate { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-2px)} 20%,40%,60%,80%{transform:translateX(2px)} }
        .animate-vibrate{animation:vibrate .3s linear infinite}
        @keyframes eq { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        .animate-eq{animation:eq ease-in-out infinite;transform-origin:bottom}
      `}</style>
    </div>
  )
}
