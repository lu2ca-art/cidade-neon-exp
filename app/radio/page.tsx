"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"

/* ─── STATIONS ────────────────────────────────────────── */
interface Station {
  id: string
  name: string
  freq: number
  color: string
  nowPlaying: string
  audioUrl: string
  placeholder?: boolean
}

const STATIONS: Station[] = [
  {
    id: "cidade-neon",
    name: "RADIO CIDADE NEON",
    freq: 88.5,
    color: "#00e5ff",
    nowPlaying: "LU2CA — CHUVA (MASTER)   ///   TRANSMISSAO AO VIVO DA CIDADE NEON",
    audioUrl:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/CHUVA%20%28MASTER%29-gjxdvkaY9bF5PpjHELCGqT3NrahEsG.mp3",
  },
  {
    id: "suburbio-xenom",
    name: "RADIO SUBURBIO XENOM",
    freq: 104.7,
    color: "#ff5fae",
    nowPlaying: "SINAL CRIPTOGRAFADO   ///   TRANSMISSAO INDISPONIVEL   ///   EM BREVE",
    audioUrl: "",
    placeholder: true,
  },
]

const FREQ_MIN = 87.5
const FREQ_MAX = 108.0

export default function RadioPage() {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const [activeId, setActiveId] = useState(STATIONS[0].id)
  const [scanning, setScanning] = useState(false)
  const [dialFreq, setDialFreq] = useState(STATIONS[0].freq)
  const [powered, setPowered] = useState(true)

  const active = STATIONS.find((s) => s.id === activeId) ?? STATIONS[0]

  /* ── LCD scrolling text ── */
  const lcdText = powered
    ? scanning
      ? "SCANNING...   PROCURANDO SINAL...   "
      : active.placeholder
        ? `${active.name}   ///   ${active.nowPlaying}   `
        : `${active.name}   >>>   ${active.nowPlaying}   `
    : "— — —   OFFLINE   — — —   "

  /* ── Tune to a station: animate needle scan, then lock ── */
  const tuneTo = useCallback(
    (station: Station) => {
      if (!powered || station.id === activeId || scanning) return
      setScanning(true)
      // stop current audio while scanning
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const start = dialFreq
      const end = station.freq
      const duration = 1100
      const t0 = performance.now()

      const step = (now: number) => {
        const p = Math.min((now - t0) / duration, 1)
        // ease in-out with a little jitter to feel like scanning
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
        const jitter = p < 0.92 ? (Math.random() - 0.5) * 0.6 : 0
        setDialFreq(Number((start + (end - start) * eased + jitter).toFixed(1)))
        if (p < 1) {
          requestAnimationFrame(step)
        } else {
          setDialFreq(end)
          setActiveId(station.id)
          setScanning(false)
        }
      }
      requestAnimationFrame(step)
    },
    [powered, activeId, scanning, dialFreq],
  )

  /* ── Audio follows the locked station ── */
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (!powered || scanning || active.placeholder || !active.audioUrl) return
    const audio = new Audio(active.audioUrl)
    audio.loop = true
    audio.volume = 0.85
    audio.play().catch(() => {})
    audioRef.current = audio
    return () => {
      audio.pause()
    }
  }, [activeId, powered, scanning, active.placeholder, active.audioUrl])

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause()
    }
  }, [])

  const needlePct = ((dialFreq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * 100

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-5 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Voltar"
            className="p-2 -ml-2 text-white/70 active:scale-90 transition-transform"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-mono text-xs tracking-[0.3em] text-white/50 uppercase">FM RECEIVER</span>
        </div>

        {/* Radio device */}
        <div
          className="rounded-3xl p-5 flex-1 flex flex-col"
          style={{
            background: "linear-gradient(160deg, #12121a 0%, #0a0a0f 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          {/* LCD display with scrolling text */}
          <div
            className="rounded-xl px-4 py-3 mb-5 overflow-hidden relative"
            style={{
              background: powered ? "#04150f" : "#0a0a0a",
              border: `1px solid ${powered ? active.color + "55" : "rgba(255,255,255,0.06)"}`,
              boxShadow: powered ? `inset 0 0 20px ${active.color}22` : "none",
            }}
          >
            {/* scanline overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.35) 2px 3px)",
              }}
            />
            <div className="flex items-center justify-between mb-2 relative">
              <span
                className="font-mono text-[10px] tracking-widest"
                style={{ color: powered ? active.color : "#555" }}
              >
                {powered ? (active.placeholder ? "NO SIGNAL" : "● ON AIR") : "STANDBY"}
              </span>
              <span
                className="font-mono text-[10px] tracking-widest tabular-nums"
                style={{ color: powered ? active.color : "#555" }}
              >
                {dialFreq.toFixed(1)} MHz
              </span>
            </div>
            <div className="relative h-5 overflow-hidden">
              <div
                className="whitespace-nowrap font-mono text-sm tracking-wider absolute"
                style={{
                  color: powered ? active.color : "#555",
                  textShadow: powered ? `0 0 8px ${active.color}88` : "none",
                  animation: powered ? "radio-marquee 14s linear infinite" : "none",
                }}
              >
                {lcdText}
                {lcdText}
              </div>
            </div>
          </div>

          {/* Frequency scanner */}
          <div className="mb-6">
            <div className="relative h-14">
              {/* tick scale */}
              <div className="absolute inset-x-0 top-0 flex justify-between font-mono text-[9px] text-white/30 tabular-nums">
                {[88, 92, 96, 100, 104, 108].map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
              {/* track */}
              <div
                className="absolute inset-x-0 top-6 h-[2px] rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}
              />
              {/* station markers */}
              {STATIONS.map((s) => {
                const pct = ((s.freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)) * 100
                return (
                  <div
                    key={s.id}
                    className="absolute top-[19px] w-[2px] h-3 rounded-full"
                    style={{ left: `${pct}%`, background: s.color, opacity: s.id === activeId ? 1 : 0.4 }}
                  />
                )
              })}
              {/* needle */}
              <div
                className="absolute top-3 w-[2px] h-8 rounded-full transition-none"
                style={{
                  left: `${needlePct}%`,
                  background: active.color,
                  boxShadow: `0 0 10px ${active.color}, 0 0 20px ${active.color}88`,
                }}
              />
            </div>
            {scanning && (
              <p className="font-mono text-[10px] text-white/40 tracking-widest mt-1 text-center animate-pulse">
                SCANNING FREQUENCY...
              </p>
            )}
          </div>

          {/* Station presets (no track controls) */}
          <div className="space-y-3 mt-auto">
            <p className="font-mono text-[10px] text-white/30 tracking-[0.25em] uppercase">Estacoes</p>
            {STATIONS.map((s) => {
              const isActive = s.id === activeId && !scanning
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => tuneTo(s)}
                  disabled={!powered || scanning}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-transform active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: isActive ? `${s.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? s.color + "88" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: isActive ? s.color : "transparent",
                      border: `2px solid ${s.color}`,
                      boxShadow: isActive ? `0 0 10px ${s.color}` : "none",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm tracking-wide" style={{ color: isActive ? s.color : "#fff" }}>
                      {s.name}
                    </p>
                    <p className="font-mono text-[10px] text-white/40 tracking-wide truncate">
                      {s.placeholder ? "EM BREVE — SINAL BLOQUEADO" : `${s.freq.toFixed(1)} MHz`}
                    </p>
                  </div>
                  {s.placeholder && (
                    <span className="font-mono text-[9px] text-white/40 border border-white/15 rounded px-1.5 py-0.5 tracking-widest">
                      LOCK
                    </span>
                  )}
                </button>
              )
            })}

            {/* Power */}
            <button
              type="button"
              onClick={() => setPowered((p) => !p)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl mt-2 transition-transform active:scale-[0.98]"
              style={{
                background: powered ? "rgba(0,229,255,0.10)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${powered ? "rgba(0,229,255,0.4)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke={powered ? "#00e5ff" : "#888"}
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v9m6.36-6.36a9 9 0 11-12.72 0" />
              </svg>
              <span
                className="font-mono text-xs tracking-widest"
                style={{ color: powered ? "#00e5ff" : "#888" }}
              >
                {powered ? "POWER ON" : "POWER OFF"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes radio-marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  )
}
