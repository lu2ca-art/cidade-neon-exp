"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"

type CallState = "ringing" | "dismissed" | "callback"

export function IncomingCallLoop({ onAccept }: { onAccept: () => void }) {
  const [callState, setCallState] = useState<CallState>("ringing")
  const [missedCount, setMissedCount] = useState(0)

  const handleDecline = useCallback(() => {
    setCallState("dismissed")
    setMissedCount(c => c + 1)
  }, [])

  // After declining, show missed-call screen briefly, then D-Bee calls back
  useEffect(() => {
    if (callState !== "dismissed") return
    const t1 = setTimeout(() => setCallState("callback"), 1800)
    return () => clearTimeout(t1)
  }, [callState])

  // "Callback" shows a brief blank then rings again
  useEffect(() => {
    if (callState !== "callback") return
    const t2 = setTimeout(() => setCallState("ringing"), 1200)
    return () => clearTimeout(t2)
  }, [callState])

  const phoneFont: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
  }

  // ── Missed call / callback screen ──
  if (callState === "dismissed" || callState === "callback") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div
          className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col items-center justify-center relative"
          style={phoneFont}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

          {/* Missed call icon */}
          <div className="w-16 h-16 rounded-full bg-[#FF3B30]/20 flex items-center justify-center mb-4 animate-fade-in">
            <svg className="w-7 h-7 text-[#FF3B30] rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </div>

          <p className="text-[#FF3B30] text-lg font-semibold mb-1">Chamada perdida</p>
          <p className="text-white/50 text-sm">D-Bee</p>

          {missedCount > 1 && (
            <p className="text-white/30 text-xs mt-3">
              {missedCount} chamadas perdidas
            </p>
          )}

          {callState === "callback" && (
            <div className="flex items-center gap-2 mt-6 animate-fade-in">
              <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <p className="text-[#25D366] text-sm">D-Bee ligando de volta...</p>
            </div>
          )}

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <div className="w-32 h-1 bg-white/20 rounded-full" />
          </div>
        </div>

        <style jsx>{`
          @keyframes fade-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          .animate-fade-in{animation:fade-in .4s ease-out forwards}
        `}</style>
      </div>
    )
  }

  // ── Ringing screen ──
  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] bg-gradient-to-b from-[#1C1C1E] to-black flex flex-col animate-vibrate relative"
        style={phoneFont}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        <div className="h-[50px] flex-shrink-0" />

        <div className="flex-1 flex flex-col items-center justify-start pt-6">
          {/* Avatar + pulse rings */}
          <div className="relative">
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden mb-4 animate-pulse-slow ring-4 ring-white/20">
              <Image
                src="/images/avatar-dbee.jpg"
                alt="D-Bee"
                width={120}
                height={120}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping-slow" />
          </div>

          <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
          <p className="text-[#A0A0A0] text-[18px]">mobile</p>

          {missedCount > 0 ? (
            <p className="text-[#25D366] text-[16px] mt-2">Ligando de novo...</p>
          ) : (
            <p className="text-[#A0A0A0] text-[16px] mt-2">Chamada recebida...</p>
          )}
        </div>

        {/* Buttons */}
        <div className="px-8 pb-12">
          <div className="flex justify-center gap-12 mb-8">
            <button type="button" className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 9.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5-2.02-4.5-4.5-4.5z" />
                </svg>
              </div>
              <span className="text-white text-xs">Lembrar</span>
            </button>
            <button type="button" className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-[#48484A] flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
              </div>
              <span className="text-white text-xs">Mensagem</span>
            </button>
          </div>

          <div className="flex justify-center gap-16">
            {/* Decline */}
            <button type="button" onClick={handleDecline} className="flex flex-col items-center gap-2">
              <div className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform">
                <svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
              <span className="text-white text-xs">Recusar</span>
            </button>

            {/* Accept */}
            <button type="button" onClick={onAccept} className="flex flex-col items-center gap-2">
              <div className="w-[72px] h-[72px] rounded-full bg-[#34C759] flex items-center justify-center active:scale-95 transition-transform">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
              <span className="text-white text-xs">Aceitar</span>
            </button>
          </div>
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      <style jsx>{`
        @keyframes vibrate { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-2px)} 20%,40%,60%,80%{transform:translateX(2px)} }
        @keyframes pulse-slow { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.8;transform:scale(1.02)} }
        @keyframes ping-slow { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.5);opacity:0} }
        .animate-vibrate{animation:vibrate .3s linear infinite}
        .animate-pulse-slow{animation:pulse-slow 2s ease-in-out infinite}
        .animate-ping-slow{animation:ping-slow 2s ease-out infinite}
      `}</style>
    </div>
  )
}
