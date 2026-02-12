"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"

/* ────────────────────────────────────────────────────────
   SELF-CONTAINED CALL PAGE
   Phases: connecting (1s) -> active (15s timer) -> transition -> /hacker
   No GameFunnel context — direct localStorage writes only.
   ──────────────────────────────────────────────────────── */

function patchFunnel(fn: (s: Record<string, unknown>) => Record<string, unknown>) {
  try {
    const raw = localStorage.getItem("cidade-neon-funnel-v2")
    if (!raw) return
    const s = JSON.parse(raw)
    localStorage.setItem("cidade-neon-funnel-v2", JSON.stringify({ ...fn(s), lastVisitedAt: Date.now() }))
  } catch { /* noop */ }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`

export default function CallPage() {
  const [phase, setPhase] = useState<"connecting" | "active" | "glitch">("connecting")
  const [seconds, setSeconds] = useState(0)
  const [hackerPct, setHackerPct] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeaker, setIsSpeaker] = useState(false)
  const ran = useRef(false)

  /* --- 1. Auto-connect after 1s --- */
  useEffect(() => {
    if (ran.current) return
    ran.current = true
    patchFunnel((s) => ({ ...s, cinematicStep: "active-call" }))
    const t = setTimeout(() => setPhase("active"), 1200)
    return () => clearTimeout(t)
  }, [])

  /* --- 2. 15-second call timer + progressive hacker overlay --- */
  useEffect(() => {
    if (phase !== "active") return
    const id = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1
        // hacker interference grows from 5s to 15s
        if (next >= 5) setHackerPct(Math.min(((next - 5) / 10) * 100, 100))
        if (next >= 15) {
          clearInterval(id)
          setPhase("glitch")
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  /* --- 3. Glitch -> navigate to /hacker --- */
  useEffect(() => {
    if (phase !== "glitch") return
    patchFunnel((s) => ({
      ...s,
      cinematicStep: "hacker-takeover",
      perAppState: {
        ...(s.perAppState as Record<string, unknown>),
        call: { duration: 15, hackerProgress: 100, answered: true },
      },
    }))
    const t = setTimeout(() => {
      window.location.href = "/hacker"
    }, 1400)
    return () => clearTimeout(t)
  }, [phase])

  /* hacker overlay values */
  const isGlitching = phase === "glitch"
  const showHacker = hackerPct > 0 || isGlitching

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
      <div
        className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] relative flex flex-col"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}
      >
        {/* BG gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-black" />

        {/* Hacker interference overlay */}
        {showHacker && (
          <div
            className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-700"
            style={{ opacity: isGlitching ? 1 : hackerPct / 100 }}
          >
            <div className="absolute inset-0 bg-black" style={{ opacity: hackerPct / 150 }} />
            <div
              className="absolute inset-0"
              style={{
                background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,102,.04) 2px,rgba(0,255,102,.04) 4px)",
              }}
            />
            {/* Random static blocks */}
            {Array.from({ length: Math.floor(hackerPct / 15) }).map((_, i) => (
              <div
                key={i}
                className="absolute bg-[#00FF66]"
                style={{
                  top: `${10 + ((i * 37) % 80)}%`,
                  left: `${(i * 23) % 90}%`,
                  width: `${20 + (i * 13) % 40}px`,
                  height: "2px",
                  opacity: 0.15 + (hackerPct / 300),
                }}
              />
            ))}
            {/* Glitch text leaking through */}
            {hackerPct > 40 && (
              <div className="absolute bottom-32 left-4 right-4 font-mono text-[#00FF66] text-xs space-y-1" style={{ opacity: hackerPct / 100 }}>
                {hackerPct > 40 && <p style={{ opacity: 0.4 }}>{"> interceptando..."}</p>}
                {hackerPct > 60 && <p style={{ opacity: 0.5 }}>{"> ssh root@cidade-neon"}</p>}
                {hackerPct > 80 && <p style={{ opacity: 0.7 }}>{"> FIREWALL: DISABLED"}</p>}
              </div>
            )}
          </div>
        )}

        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-[126px] h-[34px] bg-black rounded-b-[18px]" />

        {/* Status bar */}
        <div className="relative z-20 h-[50px] flex items-end justify-between px-6 pb-1 text-white text-xs flex-shrink-0">
          <span className="font-semibold w-12">
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-3" fill="white" viewBox="0 0 16 12"><rect x="0" y="6" width="3" height="6" rx="0.5" /><rect x="4.5" y="4" width="3" height="8" rx="0.5" /><rect x="9" y="1" width="3" height="11" rx="0.5" /><rect x="13" y="0" width="3" height="12" rx="0.5" opacity="0.3" /></svg>
            <svg className="w-6 h-3" fill="white" viewBox="0 0 25 12"><rect x="0" y="1" width="22" height="10" rx="2" stroke="white" strokeWidth="1" fill="none" /><rect x="1.5" y="2.5" width="16" height="7" rx="1" fill="white" /><rect x="23" y="4" width="2" height="4" rx="0.5" fill="white" opacity="0.4" /></svg>
          </div>
        </div>

        {/* Main content */}
        <div className="relative z-20 flex-1 flex flex-col items-center pt-12">
          {/* WhatsApp call badge */}
          <div className="flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
            <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            <span className="text-white/70 text-xs font-medium">WhatsApp Audio</span>
          </div>

          {/* Avatar */}
          <div className="relative mb-5">
            <div
              className={`w-28 h-28 rounded-full overflow-hidden ring-2 transition-all duration-500 ${
                phase === "connecting"
                  ? "ring-[#25D366]/50 animate-pulse"
                  : isGlitching
                    ? "ring-[#00FF66] shadow-[0_0_30px_rgba(0,255,102,.5)]"
                    : "ring-white/20"
              }`}
            >
              <Image
                src="/images/avatar-dbee.jpg"
                alt="D-Bee"
                width={112}
                height={112}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isGlitching ? "brightness-150 contrast-125 hue-rotate-90" : ""
                }`}
                priority
              />
            </div>
            {/* Active call audio wave indicator */}
            {phase === "active" && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-[#25D366] rounded-full animate-bounce"
                    style={{
                      height: `${6 + Math.random() * 10}px`,
                      animationDelay: `${i * 0.12}s`,
                      animationDuration: "0.6s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Name */}
          <h1
            className={`text-white text-2xl font-semibold mb-1 transition-all duration-300 ${
              isGlitching ? "text-[#00FF66] blur-[1px]" : ""
            }`}
          >
            D-Bee
          </h1>

          {/* Status */}
          {phase === "connecting" && (
            <p className="text-[#25D366] text-sm animate-pulse">Conectando...</p>
          )}
          {phase === "active" && (
            <p className="text-white/60 text-lg tabular-nums font-light">{fmt(seconds)}</p>
          )}
          {phase === "glitch" && (
            <p className="text-[#00FF66] text-sm font-mono animate-pulse tracking-widest">
              {"[INTERCEPTADO]"}
            </p>
          )}

          {/* Encryption badge during call */}
          {phase === "active" && seconds < 5 && (
            <div className="mt-4 flex items-center gap-1.5 text-white/30 text-xs">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
              </svg>
              <span>Criptografia ponta-a-ponta</span>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="relative z-20 px-8 pb-10">
          {phase === "active" && (
            <>
              {/* Control buttons */}
              <div className="flex justify-center gap-6 mb-8">
                <button
                  type="button"
                  onClick={() => setIsSpeaker(!isSpeaker)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      isSpeaker ? "bg-white" : "bg-white/10"
                    }`}
                  >
                    <svg
                      className={`w-6 h-6 ${isSpeaker ? "text-black" : "text-white"}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  </div>
                  <span className="text-white/60 text-[11px]">Alto-falante</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                      isMuted ? "bg-white" : "bg-white/10"
                    }`}
                  >
                    <svg
                      className={`w-6 h-6 ${isMuted ? "text-black" : "text-white"}`}
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                    </svg>
                  </div>
                  <span className="text-white/60 text-[11px]">Mudo</span>
                </button>

                <button type="button" className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 19c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM6 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12-8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </div>
                  <span className="text-white/60 text-[11px]">Teclado</span>
                </button>
              </div>

              {/* Hang up */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setPhase("glitch")}
                  className="w-16 h-16 rounded-full bg-[#FF3B30] flex items-center justify-center active:scale-95 transition-transform shadow-lg shadow-red-500/30"
                >
                  <svg className="w-7 h-7 text-white rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {phase === "connecting" && (
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#25D366]/20 flex items-center justify-center animate-pulse">
                <svg className="w-7 h-7 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
          <div className="w-32 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Glitch flash overlay */}
        {isGlitching && (
          <div className="absolute inset-0 z-40 pointer-events-none">
            <div className="absolute inset-0 bg-[#00FF66]/10" style={{ animation: "glitchFlash 0.15s ease-in-out infinite" }} />
            <div className="absolute inset-0" style={{ animation: "glitchShift 0.2s ease-in-out infinite", background: "repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,255,102,.08) 1px,rgba(0,255,102,.08) 2px)" }} />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes glitchFlash {
          0%,100%{opacity:.1}
          25%{opacity:.3}
          50%{opacity:.05}
          75%{opacity:.25}
        }
        @keyframes glitchShift {
          0%{transform:translateX(0)}
          25%{transform:translateX(-3px) skewX(-1deg)}
          50%{transform:translateX(2px)}
          75%{transform:translateX(-1px) skewX(1deg)}
          100%{transform:translateX(0)}
        }
      `}</style>
    </div>
  )
}
