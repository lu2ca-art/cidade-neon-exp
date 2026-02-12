"use client"

import { useState, useEffect, useRef } from "react"

/* ────────────────────────────────────────────────────────
   SELF-CONTAINED HACKER PAGE
   No GameFunnel context dependency for rendering.
   State updates via direct localStorage writes.
   ──────────────────────────────────────────────────────── */

const LINES = [
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

function patchFunnel(fn: (s: Record<string, unknown>) => Record<string, unknown>) {
  try {
    const raw = localStorage.getItem("cidade-neon-funnel-v2")
    if (!raw) return
    const s = JSON.parse(raw)
    localStorage.setItem("cidade-neon-funnel-v2", JSON.stringify({ ...fn(s), lastVisitedAt: Date.now() }))
  } catch { /* noop */ }
}

export default function HackerPage() {
  const [lines, setLines] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [showGlitch, setShowGlitch] = useState(true)
  const [mounted, setMounted] = useState(false)
  const ran = useRef(false)

  /* mark step on mount */
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    setMounted(true)
    patchFunnel((s) => ({ ...s, cinematicStep: "hacker-takeover" }))
  }, [])

  /* initial glitch flash */
  useEffect(() => {
    if (!mounted) return
    const t = setTimeout(() => setShowGlitch(false), 800)
    return () => clearTimeout(t)
  }, [mounted])

  /* sequential line reveal */
  useEffect(() => {
    if (showGlitch || idx >= LINES.length || !mounted) return

    const delay = idx === LINES.length - 1 ? 1500 : 80 + Math.random() * 120

    const t = setTimeout(() => {
      const newLine = LINES[idx]
      setLines((prev) => [...prev, newLine])
      setIdx((prev) => prev + 1)

      /* end -> mark completed, go to spotify */
      if (idx === LINES.length - 1) {
        setTimeout(() => {
          patchFunnel((s) => ({
            ...s,
            cinematicStep: "spotify-auto",
            perAppState: {
              ...(s.perAppState as Record<string, unknown>),
              hacker: { progress: 100, lines: LINES, completed: true },
            },
          }))
          window.location.href = "/spotify/auto-chuva"
        }, 1500)
      }
    }, delay)

    return () => clearTimeout(t)
  }, [idx, showGlitch, mounted])

  if (!mounted) return <div className="min-h-screen bg-black" />

  return (
    <div className="min-h-screen bg-black text-[#00FF66] font-mono overflow-hidden relative">
      {/* Glitch Entry */}
      {showGlitch && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute inset-0" style={{ animation: "glitchEntry .8s ease-out forwards" }}>
            <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,102,.03) 2px,rgba(0,255,102,.03) 4px)" }} />
            <div className="absolute inset-0 bg-[#00FF66] opacity-10" style={{ animation: "flicker .15s ease-in-out infinite" }} />
          </div>
        </div>
      )}

      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none z-10" style={{ background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.3) 2px,rgba(0,0,0,.3) 4px)" }} />
      <div className="fixed inset-0 pointer-events-none z-[5]" style={{ boxShadow: "inset 0 0 100px rgba(0,255,102,.05)" }} />

      {/* Content */}
      <div className="w-full max-w-[100vw] md:max-w-[400px] mx-auto min-h-screen flex flex-col p-6 pt-0" style={{ paddingBottom: "env(safe-area-inset-bottom,24px)" }}>
        {/* Notch */}
        <div className="relative z-30 h-[54px] flex items-center justify-center flex-shrink-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[126px] h-[34px] bg-black rounded-b-[18px]" style={{ boxShadow: "0 0 0 1px rgba(0,255,102,.1)" }} />
        </div>

        {/* Terminal */}
        <div className="flex-1 flex flex-col justify-center">
          {lines.map((line, i) => (
            <div key={i} className="mb-4" style={{ animation: "fadeIn .5s ease-out forwards", animationDelay: `${i * 100}ms`, opacity: 0 }}>
              <span
                className={`text-lg md:text-xl tracking-wide ${line === "ACCESS GRANTED" ? "text-2xl font-bold tracking-[.3em]" : ""}`}
                style={{ textShadow: line === "ACCESS GRANTED" ? "0 0 30px rgba(0,255,102,.9),0 0 60px rgba(0,255,102,.6)" : "0 0 10px rgba(0,255,102,.5)" }}
              >
                {line}
              </span>
              {line === "ACCESS GRANTED" && (
                <div className="mt-2 h-[2px] mx-auto bg-gradient-to-r from-transparent via-[#00FF66] to-transparent animate-pulse" style={{ width: "60%" }} />
              )}
            </div>
          ))}

          {/* Blinking cursor */}
          {idx < LINES.length && lines.length > 0 && (
            <div className="mt-2 flex items-center">
              <span className="inline-block w-2 h-5 bg-[#00FF66]" style={{ animation: "blink 1s step-end infinite", boxShadow: "0 0 10px rgba(0,255,102,.8)" }} />
            </div>
          )}
        </div>
      </div>

      {/* Scan line */}
      <div className="fixed inset-0 pointer-events-none z-20">
        <div className="absolute top-[20%] left-0 right-0 h-[2px] bg-[#00FF66] opacity-0" style={{ animation: "scanLine 4s linear infinite" }} />
      </div>

      <style jsx>{`
        @keyframes glitchEntry { 0%{transform:translateX(-100%);opacity:1} 20%{transform:translateX(0)} 40%{transform:translateX(10px) skewX(-5deg)} 60%{transform:translateX(-10px) skewX(5deg)} 80%{transform:translateX(5px);opacity:.8} 100%{transform:translateX(0);opacity:0} }
        @keyframes flicker { 0%,100%{opacity:.1} 50%{opacity:.3} 75%{opacity:.05} }
        @keyframes blink { 0%,50%{opacity:1} 51%,100%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanLine { 0%{top:0;opacity:0} 10%{opacity:.5} 90%{opacity:.5} 100%{top:100%;opacity:0} }
      `}</style>
    </div>
  )
}
