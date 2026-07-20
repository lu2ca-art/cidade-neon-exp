"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"
import { sendCarRadioMute, sendMinimizeConsole } from "@/app/providers/AudioBridge"
import { ALL_TIERS, TIER_META, PREVIEW_TRACK, nextTierToTune, type Tier } from "@/lib/radio-tiers"

// ─── SINT0NIA — hub de rádio ─────────────────────────────────────────────────
// Não é mais um teste de confirmação — é o lugar onde a pessoa sintoniza,
// quando quiser, cada frequência que uma missão já liberou. Sem alvo visível
// no dial — só o áudio (estática vs. música) e o medidor de sinal guiam a
// busca até a frequência REAL da próxima estação liberada. Depois de
// sintonizada, uma estação fica disponível pra sempre — sem precisar
// sintonizar de novo.

const ACCENT = "#00E5FF"
const FREQ_MIN = 60.0
const FREQ_MAX = 230.0
// faixa 60-230 MHz é bem mais larga que a antiga (88-108, só decorativa) —
// tolerância e zona de "esquentando" escaladas na mesma proporção (~8.5x)
// pra manter a dificuldade de busca equivalente
const TOLERANCE = 3.0
const CLARITY_RANGE = 27
const LOCK_MS = 2600

export default function SintonizadorPage() {
  const router = useRouter()
  const { setState, state } = useGameFunnel()
  const globalAudio = useAudioPlayer()

  const confirmationCount = state.confirmationCount
  const finalCompleted = state.unlocked.finalCompleted
  const radioAccepted = state.radioAccepted
  const pendingTier = nextTierToTune(confirmationCount, finalCompleted, radioAccepted)
  const target = pendingTier ? parseFloat(TIER_META[pendingTier].freq) : null

  const [freq, setFreq] = useState(() => {
    if (target === null) return (FREQ_MIN + FREQ_MAX) / 2
    let f = FREQ_MIN + Math.random() * (FREQ_MAX - FREQ_MIN)
    let guard = 0
    while (Math.abs(f - target) < 15 && guard < 20) { f = FREQ_MIN + Math.random() * (FREQ_MAX - FREQ_MIN); guard++ }
    return Math.round(f * 10) / 10
  })
  const [locked, setLocked] = useState(false)
  const [lockProgress, setLockProgress] = useState(0)
  const [dragging, setDragging] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const freqRef = useRef(freq)
  freqRef.current = freq

  // silencia o rádio do carro (se aberto dentro de /drive) enquanto o
  // sintonizador toca seu próprio áudio — volta ao normal ao sair
  useEffect(() => {
    sendCarRadioMute(true)
    return () => sendCarRadioMute(false)
  }, [])

  // monta música (real, da estação sendo sintonizada) + estática (ruído
  // sintetizado via Web Audio) uma vez, só se tiver uma estação pendente
  useEffect(() => {
    if (!pendingTier) return
    globalAudio.pause()

    const audio = new Audio(PREVIEW_TRACK[pendingTier])
    audio.loop = true
    audio.volume = 0
    audio.play().catch(() => {})
    audioElRef.current = audio

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      noise.loop = true
      const gain = ctx.createGain()
      gain.gain.value = 0
      noise.connect(gain).connect(ctx.destination)
      noise.start()
      ctxRef.current = ctx
      noiseGainRef.current = gain
    } catch {
      // Web Audio indisponível — segue só com a música (sem estática sintetizada)
    }

    return () => {
      audio.pause()
      audio.src = ""
      try { ctxRef.current?.close() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTier])

  // loop principal: mistura música/estática pela distância até o alvo e
  // acumula (ou perde) o progresso de "travar o sinal"
  useEffect(() => {
    if (!pendingTier || target === null || locked) return
    const tick = (ts: number) => {
      const dt = lastTsRef.current ? ts - lastTsRef.current : 16
      lastTsRef.current = ts

      const dist = Math.abs(freqRef.current - target)
      const clarity = Math.max(0, 1 - dist / CLARITY_RANGE)
      if (audioElRef.current) audioElRef.current.volume = Math.min(1, clarity) * 0.9
      if (noiseGainRef.current) noiseGainRef.current.gain.value = Math.min(1, 1 - clarity) * 0.3

      const inRange = dist <= TOLERANCE
      setLockProgress((p) => {
        const next = inRange ? p + dt / LOCK_MS : p - dt / (LOCK_MS * 0.55)
        return Math.max(0, Math.min(1, next))
      })

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = 0
    }
  }, [target, pendingTier, locked])

  // trava quando o progresso enche — sintoniza aquele tier pra sempre
  useEffect(() => {
    if (lockProgress >= 1 && !locked && pendingTier) {
      setLocked(true)
      if (audioElRef.current) audioElRef.current.volume = 1
      if (noiseGainRef.current) noiseGainRef.current.gain.value = 0
      setState(prev => ({ ...prev, radioAccepted: { ...prev.radioAccepted, [pendingTier]: true } }))
    }
  }, [lockProgress, locked, pendingTier, setState])

  const updateFromClientX = useCallback((clientX: number) => {
    const el = barRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setFreq(Math.round((FREQ_MIN + pct * (FREQ_MAX - FREQ_MIN)) * 10) / 10)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked || !pendingTier) return
    setDragging(true)
    updateFromClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    updateFromClientX(e.clientX)
  }
  const endDrag = () => setDragging(false)

  const pct = (freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)
  const dist = target !== null ? Math.abs(freq - target) : 999
  const clarity = Math.max(0, 1 - dist / CLARITY_RANGE)

  // ── RESULTADO — acabou de travar o sinal agora ──────────────────────────
  if (locked && pendingTier) {
    const meta = TIER_META[pendingTier]
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#020a0c" }}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: meta.color }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: `${meta.color}18`, boxShadow: `0 0 60px ${meta.color}40` }} />
              <div className="absolute inset-3 rounded-full" style={{ backgroundColor: `${meta.color}12` }} />
              <div className="absolute inset-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${meta.color}10` }}>
                <span style={{ color: meta.color, fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{meta.freq}</span>
              </div>
            </div>

            <p className="text-white/30 text-[10px] tracking-[0.35em] uppercase mb-3">sinal travado</p>
            <h1 className="text-2xl font-black tracking-wide mb-2" style={{ color: meta.color }}>{meta.label}</h1>
            <p className="text-white/40 text-sm mb-10">{meta.freq} FM — sintonizada pra sempre</p>

            <button
              type="button"
              onClick={() => { sendMinimizeConsole(); router.push("/?screen=home") }}
              aria-label="Inicio"
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 mx-auto"
              style={{ background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.15)", boxShadow: "0 0 0 1px rgba(255,255,255,0.04)" }}
            >
              <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── HUB — sem nada novo pra sintonizar agora (nenhuma missão pendente de
  // liberar estação, ou tudo que já liberou já foi sintonizado) ───────────
  if (!pendingTier) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#020a0c" }}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
          <div className="relative z-10 flex flex-col h-full px-6 pt-14 pb-10">
            <div className="flex items-center justify-between mb-8">
              <button
                type="button"
                onClick={() => router.push("/?screen=home")}
                aria-label="Inicio"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)" }}
              >
                <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
                </svg>
              </button>
              <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-mono">SINT0NIA</p>
              <div className="w-9" />
            </div>

            <p className="text-white/40 text-sm text-center mb-1">favoritos</p>
            <p className="text-white/20 text-xs text-center mb-10 max-w-[260px] mx-auto">
              {confirmationCount === 0
                ? "complete a primeira missão pra liberar a primeira frequência"
                : "cada frequência liberada fica sintonizada pra sempre"}
            </p>

            <div className="flex-1 flex flex-col gap-3">
              {ALL_TIERS.map((tier: Tier) => {
                const meta = TIER_META[tier]
                const unlocked = radioAccepted[tier]
                return (
                  <div
                    key={tier}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                    style={{
                      background: unlocked ? `${meta.color}12` : "rgba(255,255,255,0.03)",
                      border: `1px solid ${unlocked ? meta.color + "40" : "rgba(255,255,255,0.08)"}`,
                      opacity: unlocked ? 1 : 0.5,
                    }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: unlocked ? `${meta.color}22` : "rgba(255,255,255,0.06)" }}
                    >
                      {unlocked ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={meta.color} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v8"/><path d="M18.36 6.64a9 9 0 11-12.73 0"/></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-mono text-sm font-bold" style={{ color: unlocked ? meta.color : "rgba(255,255,255,0.5)" }}>{meta.label}</p>
                      <p className="font-mono text-xs text-white/30">{meta.freq} FM · {unlocked ? "sintonizada" : "bloqueada"}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SINTONIZADOR — tem uma frequência nova pra sintonizar agora ─────────
  const meta = TIER_META[pendingTier]
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden select-none" style={{ background: "#020a0c" }}>
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${meta.color}12 0%, transparent 60%)` }} />

        <div className="relative z-10 flex flex-col h-full px-6 pt-14 pb-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              type="button"
              onClick={() => router.push("/?screen=home")}
              aria-label="Inicio"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)" }}
            >
              <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-mono">SINT0NIA</p>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center">
            <p className="text-white/40 text-sm text-center mb-1 max-w-[260px]">gire até o sinal ficar limpo.</p>
            <p className="text-white/20 text-xs text-center mb-10 max-w-[240px]">
              nova frequência liberada: <span style={{ color: meta.color }}>{meta.label}</span> — sem numero certo pra mirar, so o som e o medidor. segura no ponto ate travar.
            </p>

            {/* Readout digital */}
            <div className="flex items-baseline gap-2 mb-2">
              <span
                className="font-mono font-bold text-5xl tabular-nums"
                style={{ color: ACCENT, textShadow: `0 0 18px ${ACCENT}80` }}
              >
                {freq.toFixed(1)}
              </span>
              <span className="text-white/30 text-sm font-mono">MHz</span>
            </div>

            {/* Medidor de sinal */}
            <div className="flex items-center gap-1 mb-10 h-6">
              {Array.from({ length: 12 }, (_, i) => {
                const barLevel = (i + 1) / 12
                const active = clarity >= barLevel - 0.04
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-sm transition-all duration-150"
                    style={{
                      height: 6 + i * 1.4,
                      background: active ? ACCENT : "rgba(255,255,255,0.08)",
                      boxShadow: active ? `0 0 6px ${ACCENT}80` : "none",
                    }}
                  />
                )
              })}
            </div>

            {/* Barra de sintonia */}
            <div
              ref={barRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerLeave={endDrag}
              className="relative w-full h-16 rounded-2xl touch-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* ticks */}
              <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
                {Array.from({ length: 21 }, (_, i) => (
                  <div key={i} className="w-px" style={{ height: i % 5 === 0 ? 16 : 8, background: "rgba(255,255,255,0.15)" }} />
                ))}
              </div>
              {/* needle */}
              <div
                className="absolute top-1 bottom-1 w-1 rounded-full transition-[left] duration-75"
                style={{
                  left: `calc(${pct * 100}% - 2px)`,
                  background: ACCENT,
                  boxShadow: `0 0 12px ${ACCENT}`,
                }}
              />
            </div>

            <div className="flex justify-between w-full mt-2 mb-8 px-0.5">
              <span className="text-white/20 text-[10px] font-mono">{FREQ_MIN.toFixed(1)}</span>
              <span className="text-white/20 text-[10px] font-mono">{FREQ_MAX.toFixed(1)}</span>
            </div>

            {/* Progresso de trava */}
            <div className="w-full">
              <div className="flex justify-between mb-1.5">
                <span className="text-white/30 text-[10px] font-mono uppercase tracking-widest">
                  {lockProgress > 0.02 ? "travando sinal..." : "procurando"}
                </span>
                <span className="text-white/30 text-[10px] font-mono">{Math.round(lockProgress * 100)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-full rounded-full transition-[width] duration-100"
                  style={{ width: `${lockProgress * 100}%`, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
