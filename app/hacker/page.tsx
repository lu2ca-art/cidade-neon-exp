"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

const HACKER_LINES = [
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
  "> sudo rm -rf /system/security/*",
  "> CHMOD 777 /all/access",
  "> voce ta ouvindo?",
  "> isso nao e aleatorio",
  "> tem gente aqui",
  "> procurando",
  "> .",
  "> ..",
  "> ...",
  "",
  "ACCESS GRANTED",
]

export default function HackerPage() {
  const router = useRouter()
  const { updateCinematicStep, updateHackerState, state } = useGameFunnel()
  
  const [lines, setLines] = useState<string[]>(state.perAppState.hacker.lines)
  const [currentLineIndex, setCurrentLineIndex] = useState(state.perAppState.hacker.lines.length)
  const [showGlitch, setShowGlitch] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [progress, setProgress] = useState(state.perAppState.hacker.progress)

  const ranRef = useRef(false)
  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    setIsMounted(true)
    updateCinematicStep("hacker-takeover")
  }, [updateCinematicStep])

  // Initial glitch effect
  useEffect(() => {
    if (!isMounted) return
    const timer = setTimeout(() => {
      setShowGlitch(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [isMounted])

  // Sequential text reveal - FAST
  useEffect(() => {
    if (showGlitch || currentLineIndex >= HACKER_LINES.length || !isMounted) return

    const delay = currentLineIndex === HACKER_LINES.length - 1 ? 1500 : 80 + Math.random() * 120

    const timer = setTimeout(() => {
      const newLine = HACKER_LINES[currentLineIndex]
      setLines((prev) => [...prev, newLine])
      setCurrentLineIndex((prev) => prev + 1)
      
      const newProgress = ((currentLineIndex + 1) / HACKER_LINES.length) * 100
      setProgress(newProgress)
      updateHackerState({ 
        lines: [...lines, newLine], 
        progress: newProgress 
      })
      
      // End and transition to Spotify
      if (currentLineIndex === HACKER_LINES.length - 1) {
        setTimeout(() => {
          updateHackerState({ completed: true })
          updateCinematicStep("spotify-auto")
          router.push("/drive")
        }, 1500)
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [currentLineIndex, showGlitch, isMounted, lines, router, updateCinematicStep, updateHackerState])

  if (!isMounted) {
    return <div className="min-h-screen bg-black" />
  }

  return (
    <div className="min-h-screen bg-black text-[#00FF66] font-mono overflow-hidden relative">
      {/* Glitch Entry Effect */}
      {showGlitch && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute inset-0 animate-glitch-entry">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,102,0.03) 2px, rgba(0,255,102,0.03) 4px)",
              }}
            />
            <div className="absolute inset-0 bg-[#00FF66] opacity-10 animate-flicker" />
          </div>
        </div>
      )}

      {/* Scanlines Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
        }}
      />

      {/* CRT Glow Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-5"
        style={{
          boxShadow: "inset 0 0 100px rgba(0,255,102,0.05)",
        }}
      />

      {/* Main Content */}
      <div
        className="w-full max-w-[100vw] md:max-w-[400px] mx-auto min-h-screen flex flex-col p-6 pt-0"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
        }}
      >
        {/* iPhone Notch */}
        <div className="relative z-30 h-[54px] flex items-center justify-center flex-shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" style={{ boxShadow: "0 0 0 1px rgba(0,255,102,0.1)" }} />
        </div>
        {/* Terminal Lines - no scroll, text fits screen */}
        <div className="flex-1 flex flex-col justify-end pb-4">
          {lines.map((line, index) => (
            <div
              key={index}
              className="mb-1 animate-fade-in"
              style={{
                animationDelay: `${index * 80}ms`,
              }}
            >
              <span
                className={`text-[11px] tracking-wide ${
                  line === "ACCESS GRANTED" || line === "ACESSO GARANTIDO" ? "text-[#00FF66] font-bold text-base block text-center mt-2" : ""
                }`}
                style={{
                  textShadow: "0 0 8px rgba(0,255,102,0.4)",
                }}
              >
                {line}
              </span>
            </div>
          ))}

          {/* Blinking Cursor */}
          {currentLineIndex >= HACKER_LINES.length && (
            <div className="mt-4">
              <span
                className="inline-block w-3 h-6 bg-[#00FF66] animate-blink"
                style={{
                  boxShadow: "0 0 10px rgba(0,255,102,0.8), 0 0 20px rgba(0,255,102,0.4)",
                }}
              />
            </div>
          )}

          {/* Typing indicator while showing lines */}
          {currentLineIndex < HACKER_LINES.length && lines.length > 0 && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className="inline-block w-2 h-5 bg-[#00FF66] animate-blink"
                style={{
                  boxShadow: "0 0 10px rgba(0,255,102,0.8)",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Random Glitch Effects */}
      <div className="fixed inset-0 pointer-events-none z-20">
        <div className="absolute top-[20%] left-0 right-0 h-[2px] bg-[#00FF66] opacity-0 animate-scan-line" />
      </div>

      <style jsx>{`
        @keyframes glitch-entry {
          0% {
            transform: translateX(-100%);
            opacity: 1;
          }
          20% {
            transform: translateX(0);
          }
          40% {
            transform: translateX(10px) skewX(-5deg);
          }
          60% {
            transform: translateX(-10px) skewX(5deg);
          }
          80% {
            transform: translateX(5px);
            opacity: 0.8;
          }
          100% {
            transform: translateX(0);
            opacity: 0;
          }
        }

        @keyframes flicker {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
          75% {
            opacity: 0.05;
          }
        }

        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scan-line {
          0% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.5;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        .animate-glitch-entry {
          animation: glitch-entry 0.8s ease-out forwards;
        }

        .animate-flicker {
          animation: flicker 0.15s ease-in-out infinite;
        }

        .animate-blink {
          animation: blink 1s step-end infinite;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }

        .animate-scan-line {
          animation: scan-line 4s linear infinite;
        }
      `}</style>
    </div>
  )
}
