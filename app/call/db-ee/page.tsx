"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

export default function DBeeCallPage() {
  const router = useRouter()
  const { updateCinematicStep, updateCallState } = useGameFunnel()

  const [callDuration, setCallDuration] = useState(0)
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStarted = useRef(false)

  const CALL_DURATION = 15

  // Auto-answer after 1.2s
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const t = setTimeout(() => {
      setIsCallActive(true)
      updateCinematicStep("active-call")
      updateCallState({ answered: true })
    }, 1200)

    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Call timer -- 15s then go to hacker
  useEffect(() => {
    if (!isCallActive) return

    timerRef.current = setInterval(() => {
      setCallDuration((prev) => {
        const next = prev + 1
        if (next >= CALL_DURATION) {
          if (timerRef.current) clearInterval(timerRef.current)
          updateCinematicStep("hacker-takeover")
          router.push("/hacker")
        }
        return next
      })
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isCallActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className={`w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col ${!isCallActive ? "animate-vibrate" : ""}`}
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
      >
        {/* Dark gradient BG */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-black" />

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs flex-shrink-0">
          <span className="font-semibold w-12">21:47</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5"/><rect x="4.5" y="4" width="3" height="8" rx="0.5"/><rect x="9" y="1" width="3" height="11" rx="0.5"/><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3"/></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none"/><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white"/><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4"/></svg>
          </div>
        </div>

        {/* WhatsApp badge */}
        <div className="relative z-20 flex justify-center mt-2 mb-4">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
            <span className="text-white/70 text-xs font-medium">WhatsApp Audio</span>
          </div>
        </div>

        {/* Caller info */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-start pt-4">
          {/* Avatar */}
          <div className="relative mb-6">
            {!isCallActive && (
              <>
                <div className="absolute inset-[-12px] rounded-full border border-white/10 animate-ping-slow" />
                <div className="absolute inset-[-24px] rounded-full border border-white/5 animate-ping-slow" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            <div className={`w-28 h-28 rounded-full overflow-hidden ring-2 shadow-lg ${isCallActive ? "ring-[#25D366]/30 shadow-[#25D366]/10" : "ring-[#25D366]/40 shadow-[#25D366]/20 animate-pulse-slow"}`}>
              <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={112} height={112} className="w-full h-full object-cover" priority />
            </div>
          </div>

          <h1 className="text-white text-[28px] font-semibold mb-1">D-Bee</h1>

          {isCallActive ? (
            <>
              <p className="text-[#25D366] text-lg font-medium tabular-nums">{formatTime(callDuration)}</p>
              {/* Audio wave indicator */}
              <div className="flex items-end gap-[3px] mt-4 h-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-[#25D366] animate-wave"
                    style={{ animationDelay: `${i * 0.1}s`, height: `${8 + Math.sin(i * 0.8) * 10}px` }}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-white/50 text-sm mb-1">Chamada de audio do WhatsApp</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                <p className="text-[#25D366] text-sm">Conectando...</p>
              </div>
            </>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="relative z-20 px-8 pb-12">
          {isCallActive ? (
            <>
              <div className="flex justify-center gap-8 mb-8">
                <button type="button" onClick={() => setIsMuted(!isMuted)} className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? "bg-white" : "bg-white/10"}`}>
                    <svg className={`w-6 h-6 ${isMuted ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
                  </div>
                  <span className="text-white/60 text-xs">Mudo</span>
                </button>
                <button type="button" onClick={() => setIsSpeakerOn(!isSpeakerOn)} className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isSpeakerOn ? "bg-white" : "bg-white/10"}`}>
                    <svg className={`w-6 h-6 ${isSpeakerOn ? "text-black" : "text-white"}`} fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                  </div>
                  <span className="text-white/60 text-xs">Audio</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                  </div>
                  <span className="text-white/60 text-xs">Teclado</span>
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => { updateCinematicStep("hacker-takeover"); router.push("/hacker") }}
                  className="w-16 h-16 rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-red-500/30"
                >
                  <svg className="w-7 h-7 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white/30 animate-pulse" />
                <p className="text-white/30 text-xs">Conectando automaticamente...</p>
              </div>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20"><div className="w-32 h-1 bg-white/20 rounded-full" /></div>
      </div>

      <style jsx>{`
        @keyframes vibrate { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-2px)} 20%,40%,60%,80%{transform:translateX(2px)} }
        @keyframes pulse-slow { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.85;transform:scale(1.03)} }
        @keyframes ping-slow { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.6);opacity:0} }
        @keyframes wave { 0%,100%{height:4px} 50%{height:18px} }
        .animate-vibrate{animation:vibrate .3s linear infinite}
        .animate-pulse-slow{animation:pulse-slow 2s ease-in-out infinite}
        .animate-ping-slow{animation:ping-slow 2s ease-out infinite}
        .animate-wave{animation:wave .6s ease-in-out infinite}
      `}</style>
    </div>
  )
}
