"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
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
]

const CALL_DURATION = 15

export default function DBeeCallPage() {
  const router = useRouter()
  const { updateCinematicStep, updateCallState, updateHackerState } = useGameFunnel()

  const [phase, setPhase] = useState<"connecting" | "active" | "transitioning">("connecting")
  const [seconds, setSeconds] = useState(0)
  const [hackerPct, setHackerPct] = useState(0)
  const [visibleLines, setVisibleLines] = useState(0)
  const [glitch, setGlitch] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasStarted = useRef(false)

  /* ── 1. Auto-answer after 1.2 s ─────────────────── */
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const t = setTimeout(() => {
      updateCinematicStep("active-call")
      updateCallState({ answered: true })
      setPhase("active")
    }, 1200)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── 2. Call timer (runs only when active) ──────── */
  useEffect(() => {
    if (phase !== "active") return

    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1

        // Hacker progress: ramps up slowly then fast
        let pct = 0
        if (next <= 3) pct = next * 5
        else if (next <= 10) pct = 15 + (next - 3) * 8
        else pct = 71 + (next - 10) * 6
        setHackerPct(Math.min(pct, 100))

        // Hacker terminal lines
        const lineIdx = Math.floor((next / CALL_DURATION) * HACKER_LINES.length)
        setVisibleLines(Math.min(lineIdx + 1, HACKER_LINES.length))

        // Sporadic glitch
        if (next > 3 && Math.random() > 0.65) {
          setGlitch(true)
          setTimeout(() => setGlitch(false), 120)
        }

        // End of call -> transition to hacker page
        if (next >= CALL_DURATION) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase("transitioning")
          updateCinematicStep("hacker-takeover")
          updateHackerState({ completed: false, progress: 0 })
          setTimeout(() => router.push("/hacker"), 600)
        }

        return next
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`

  /* ═══════════════════ RENDER ══════════════════════ */
  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
      >
        {/* ── Backgrounds ────────────────────────── */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#1C1C1E] to-black transition-opacity duration-700"
          style={{ opacity: 1 - hackerPct / 200 }}
        />
        <div
          className="absolute inset-0 bg-black transition-opacity duration-500 overflow-hidden"
          style={{ opacity: hackerPct / 100 }}
        >
          {/* Terminal lines */}
          <div className="p-4 pt-20 font-mono text-xs leading-6 text-green-500 select-none">
            {HACKER_LINES.slice(0, visibleLines).map((line, i) => (
              <div
                key={i}
                className="opacity-0 animate-[fadeUp_.3s_ease-out_forwards]"
                style={{
                  animationDelay: `${i * 80}ms`,
                  textShadow: "0 0 8px rgba(0,255,0,.5)",
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {/* Progress bar */}
          {hackerPct > 20 && (
            <div className="absolute bottom-36 left-4 right-4 font-mono">
              <p className="text-green-500 text-[11px] mb-1">
                SYSTEM BREACH: {hackerPct.toFixed(0)}%
              </p>
              <div className="h-[6px] bg-green-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${hackerPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Glitch overlay */}
        {glitch && <div className="absolute inset-0 z-20 bg-red-500/10 mix-blend-overlay pointer-events-none" />}

        {/* ── Notch ──────────────────────────────── */}
        <div className="relative z-20 h-[54px] flex items-center justify-center flex-shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" />
        </div>

        {/* ── Status bar ─────────────────────────── */}
        <div className="relative z-10 h-[32px] flex items-center justify-between px-6 text-white/80 text-[13px]">
          <span className="font-semibold">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg className="w-[14px] h-[14px]" fill="white" viewBox="0 0 24 24"><path d="M2 17h2v4H2zm5-5h2v9H7zm5-5h2v14h-2zm5-5h2v19h-2z" /></svg>
            <svg className="w-[22px] h-[12px]" viewBox="0 0 25 12" fill="none">
              <rect x=".5" y=".5" width="21" height="11" rx="2.167" stroke="white" strokeOpacity=".35" />
              <rect x="2" y="2" width="14" height="8" rx="1.333" fill="white" />
              <path opacity=".4" d="M23 4v4.5c.83-.42 1.33-1.26 1.33-2.25S23.83 4.42 23 4z" fill="white" />
            </svg>
          </div>
        </div>

        {/* ── Caller info ────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col items-center pt-8">
          <div className="relative mb-3">
            <div className={`w-[110px] h-[110px] rounded-full overflow-hidden ring-[3px] ring-white/20 ${phase === "connecting" ? "animate-pulse" : ""}`}>
              <Image
                src="/images/avatar-dbee.jpg"
                alt="D-Bee"
                width={110}
                height={110}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            {phase === "connecting" && (
              <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" style={{ animationDuration: "2s" }} />
            )}
          </div>

          <h1 className="text-white text-[28px] font-semibold leading-tight">D-Bee</h1>
          <p className="text-[#A0A0A0] text-[15px] mt-0.5">mobile</p>

          {phase === "connecting" && (
            <p className="text-[#34C759] text-[15px] mt-3 animate-pulse">Conectando...</p>
          )}
          {phase === "active" && (
            <p className="text-white text-[20px] font-light mt-3 tabular-nums tracking-wider">
              {fmt(seconds)}
            </p>
          )}
          {phase === "transitioning" && (
            <p className="text-red-500 text-[15px] mt-3 animate-pulse font-mono">
              CONEXAO COMPROMETIDA
            </p>
          )}
        </div>

        {/* ── Call buttons ────────────────────────── */}
        <div className="relative z-10 pb-10 px-6">
          {phase === "active" ? (
            <>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  {
                    label: "silenciar",
                    icon: (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    ),
                    stroke: true,
                  },
                  {
                    label: "alto-falante",
                    icon: (
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    ),
                    stroke: false,
                  },
                  {
                    label: "teclado",
                    icon: (
                      <path d="M12 7a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4zm0 6a2 2 0 100-4 2 2 0 000 4z" />
                    ),
                    stroke: false,
                  },
                ].map((btn) => (
                  <button key={btn.label} type="button" className="flex flex-col items-center gap-1.5">
                    <div className="w-[60px] h-[60px] rounded-full bg-white/10 flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill={btn.stroke ? "none" : "currentColor"}
                        stroke={btn.stroke ? "currentColor" : "none"}
                        strokeWidth={btn.stroke ? 2 : 0}
                        viewBox="0 0 24 24"
                      >
                        {btn.icon}
                      </svg>
                    </div>
                    <span className="text-white/70 text-[11px]">{btn.label}</span>
                  </button>
                ))}
              </div>

              {/* End call */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current)
                    setPhase("transitioning")
                    updateCinematicStep("hacker-takeover")
                    setTimeout(() => router.push("/hacker"), 400)
                  }}
                  className="w-[68px] h-[68px] rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform"
                >
                  <svg className="w-8 h-8 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </button>
              </div>
            </>
          ) : phase === "connecting" ? (
            <div className="flex justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-[68px] h-[68px] rounded-full bg-[#34C759]/80 flex items-center justify-center animate-pulse">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* transitioning */
            <div className="flex justify-center">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          <div className="w-32 h-1 bg-white/20 rounded-full" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
