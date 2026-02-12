"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

export default function DBeeCallPage() {
  const router = useRouter()
  const { state, updateCinematicStep, updateCallState } = useGameFunnel()
  
  const [callDuration, setCallDuration] = useState(0)
  const [isCallActive, setIsCallActive] = useState(false)
  const [hackerProgress, setHackerProgress] = useState(0)
  const [hackerLines, setHackerLines] = useState<string[]>([])
  const [showGlitch, setShowGlitch] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  const CALL_DURATION = 15 // 15 seconds exact
  
  const HACKER_LINES_DATA = [
    "> conexao estabelecida",
    "> interceptando stream...",
    "> [0x7F4E2D9A] bypass ativo",
    "> IP: 192.168.███.███",
    "> PORT: 443 >> REDIRECT",
    "> ssh root@cidade-neon",
    "> AUTH_TOKEN: ██████████",
    "> decrypting packets...",
    "> kernel32.dll injected",
    "> FIREWALL: DISABLED",
  ]

  const handleAnswer = useCallback(() => {
    setIsCallActive(true)
    updateCallState({ answered: true })
    updateCinematicStep("active-call")
  }, [updateCallState, updateCinematicStep])

  const handleDecline = useCallback(() => {
    router.push("/")
  }, [router])

  // Auto-answer the call 1s after mount (arriving from incoming-call accept)
  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => {
      handleAnswer()
    }, 1000)
    return () => clearTimeout(timer)
  }, [handleAnswer])

  // Call timer and hacker takeover
  useEffect(() => {
    if (!isCallActive) return
    
    const interval = setInterval(() => {
      setCallDuration((prev) => {
        const newDuration = prev + 1
        updateCallState({ duration: newDuration })
        
        // Calculate hacker progress based on call duration
        // 0-3s: minimal, 3-10s: increasing, 10-15s: nearly full
        let progress = 0
        if (newDuration <= 3) {
          progress = newDuration * 5 // 0-15%
        } else if (newDuration <= 10) {
          progress = 15 + ((newDuration - 3) * 8) // 15-71%
        } else {
          progress = 71 + ((newDuration - 10) * 6) // 71-100%
        }
        
        setHackerProgress(progress)
        updateCallState({ hackerProgress: progress })
        
        // Add hacker lines progressively
        const lineIndex = Math.floor((newDuration / CALL_DURATION) * HACKER_LINES_DATA.length)
        if (lineIndex < HACKER_LINES_DATA.length) {
          setHackerLines((prev) => {
            if (prev.length < lineIndex + 1) {
              return [...prev, HACKER_LINES_DATA[lineIndex]]
            }
            return prev
          })
        }
        
        // Toggle glitch effect
        if (newDuration > 3 && Math.random() > 0.7) {
          setShowGlitch(true)
          setTimeout(() => setShowGlitch(false), 100)
        }
        
        // End call and transition to hacker screen
        if (newDuration >= CALL_DURATION) {
          clearInterval(interval)
          updateCinematicStep("hacker-takeover")
          router.push("/hacker")
        }
        
        return newDuration
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isCallActive, router, updateCallState, updateCinematicStep])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className="w-full max-w-[100vw] md:max-w-[400px] h-screen md:h-[844px] relative flex flex-col"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
      >
        {/* Background with hacker overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-[#1C1C1E] to-black transition-opacity duration-500"
          style={{ opacity: 1 - (hackerProgress / 200) }}
        />
        
        {/* Hacker overlay that grows progressively */}
        <div 
          className="absolute inset-0 bg-black transition-opacity duration-300 overflow-hidden"
          style={{ opacity: hackerProgress / 100 }}
        >
          <div className="p-4 font-mono text-xs text-green-500 overflow-hidden">
            {hackerLines.map((line, i) => (
              <div 
                key={i} 
                className="animate-fade-in"
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  textShadow: "0 0 10px rgba(0, 255, 0, 0.5)"
                }}
              >
                {line}
              </div>
            ))}
          </div>
          
          {/* Progress bar */}
          {hackerProgress > 20 && (
            <div className="absolute bottom-32 left-4 right-4">
              <div className="text-green-500 text-xs font-mono mb-1">SYSTEM BREACH: {Math.min(hackerProgress, 100).toFixed(0)}%</div>
              <div className="h-2 bg-green-900/50 rounded overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${Math.min(hackerProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Glitch effect */}
        {showGlitch && (
          <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay animate-pulse" />
        )}
        
        {/* iPhone Notch */}
        <div className="relative z-20 h-[54px] flex items-center justify-center flex-shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        </div>

        {/* Status Bar */}
        <div className="relative z-10 h-[44px] flex items-center justify-between px-6 text-white text-sm pt-2">
          <span className="font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="white" viewBox="0 0 24 24"><path d="M2 17h2v4H2zm5-5h2v9H7zm5-5h2v14h-2zm5-5h2v19h-2z" /></svg>
            <svg className="w-6 h-4" fill="white" viewBox="0 0 24 24">
              <rect x="2" y="7" width="18" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" />
              <rect x="4" y="9" width="12" height="6" rx="1" fill="white" />
            </svg>
          </div>
        </div>

        {/* Caller Info */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-12">
          <div className="relative">
            <div className={`w-[120px] h-[120px] rounded-full overflow-hidden mb-4 ring-4 ring-white/20 ${!isCallActive ? "animate-pulse" : ""}`}>
              <Image src="/images/avatar-dbee.jpg" alt="D-Bee" width={120} height={120} className="w-full h-full object-cover" />
            </div>
            {!isCallActive && (
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: "2s" }} />
            )}
          </div>
          <h1 className="text-white text-[32px] font-semibold mb-1">D-Bee</h1>
          <p className="text-[#A0A0A0] text-[18px] font-normal">mobile</p>
          {isCallActive ? (
            <p className="text-white text-[20px] font-light mt-2 tabular-nums">{formatTime(callDuration)}</p>
          ) : (
            <p className="text-[#34C759] text-[16px] font-normal mt-2 animate-pulse">Conectando...</p>
          )}
        </div>

        {/* Call Actions */}
        <div className="relative z-10 pb-[34px] px-6">
          {isCallActive ? (
            <>
              {/* Active call buttons */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <button type="button" className="flex flex-col items-center gap-2">
                  <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  </div>
                  <span className="text-white text-xs">silenciar</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-2">
                  <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </div>
                  <span className="text-white text-xs">alto-falante</span>
                </button>
                <button type="button" className="flex flex-col items-center gap-2">
                  <div className="w-[64px] h-[64px] rounded-full bg-[#48484A] flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                  <span className="text-white text-xs">FaceTime</span>
                </button>
              </div>
              
              {/* End call button */}
              <div className="flex justify-center">
                <button 
                  type="button"
                  onClick={() => router.push("/hacker")}
                  className="w-[72px] h-[72px] rounded-full bg-[#FF3B30] flex items-center justify-center min-h-[44px] min-w-[44px]"
                >
                  <svg className="w-9 h-9 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            /* Connecting state - auto-answers in 1s */
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-[72px] h-[72px] rounded-full bg-[#34C759] flex items-center justify-center animate-pulse">
                  <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                </div>
                <span className="text-[#34C759] text-sm font-medium">Conectando...</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes vibrate {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-vibrate { animation: vibrate 0.5s infinite; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}
