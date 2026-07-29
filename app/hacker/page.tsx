"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"

// ── MATRIZ EM PERSPECTIVA — mesma direção/ponto de fuga da "estrada em
// perspectiva" da tela inicial (app/page.tsx, fase "start": ponto de fuga
// no topo-centro, abrindo em leque até a base da tela). Em vez de chuva
// vertical plana (colunas paralelas), os caracteres nascem pequenos perto
// do ponto de fuga e crescem/se espalham em direção à base, dando a mesma
// sensação de profundidade/direção do resto da experiência ──
function MatrixPerspective() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener("resize", resize)

    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*アイウエオカキクケコ"
    // ponto de fuga no topo-centro, leque abrindo até a base — mesma
    // geometria de x1=50,y1=0 -> [18,34,50,66,82],y=100 da tela inicial
    const VANISH_X = 0.5
    const LANE_COUNT = 30
    const lanes = Array.from({ length: LANE_COUNT }, (_, i) => ({
      baseX: (i + 0.5) / LANE_COUNT,
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.22,
      char: chars[Math.floor(Math.random() * chars.length)],
    }))

    let raf = 0
    const draw = () => {
      const W = canvas.width, H = canvas.height
      ctx.fillStyle = "rgba(0,0,0,0.14)"
      ctx.fillRect(0, 0, W, H)
      for (const lane of lanes) {
        lane.t += lane.speed * 0.012
        if (lane.t > 1) { lane.t = 0; lane.char = chars[Math.floor(Math.random() * chars.length)] }
        else if (Math.random() > 0.94) lane.char = chars[Math.floor(Math.random() * chars.length)]
        // interpola do ponto de fuga (topo-centro) até a posição da base —
        // mesmo leque/direção da estrada da tela inicial
        const x = (VANISH_X + (lane.baseX - VANISH_X) * lane.t) * W
        const y = lane.t * H
        const size = 8 + lane.t * 22
        ctx.globalAlpha = 0.2 + lane.t * 0.6
        ctx.fillStyle = "#00FF66"
        ctx.font = `${size}px monospace`
        ctx.fillText(lane.char, x, y)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.5 }} />
}

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
    <div className="h-dvh bg-black text-[#00FF66] font-mono overflow-hidden relative">
      {/* Matriz em perspectiva — mesma direção/ponto de fuga da estrada da
          tela inicial (app/page.tsx, fase "start"), atrás de tudo */}
      <div className="fixed inset-0 z-0">
        <MatrixPerspective />
      </div>

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
        className="w-full max-w-[100vw] md:max-w-[400px] mx-auto h-full flex flex-col p-6 pt-0 overflow-y-auto"
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
