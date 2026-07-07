"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"
import { sendCarRadioMute, sendMinimizeConsole } from "@/app/providers/AudioBridge"

// ─── SINT0NIA — tutorial de rádio como teste de confirmação #1 ───────────────
// Arraste o dial por uma faixa de 88.0 a 108.0 MHz procurando o ponto exato
// onde o sinal fica limpo. Sem alvo visível — só o áudio (estática vs. música)
// e o medidor de sinal guiam a busca. Segurar no ponto certo por tempo
// suficiente "trava o sinal" e completa o teste.

const ACCENT = "#00E5FF"
const FREQ_MIN = 88.0
const FREQ_MAX = 108.0
const TOLERANCE = 0.35
const LOCK_MS = 2600
const TRACK_URL = "/audio/tracks/inst-nectar.mp3"

function randomFreq() {
  return Math.round((FREQ_MIN + 2 + Math.random() * (FREQ_MAX - FREQ_MIN - 4)) * 10) / 10
}

export default function SintonizadorPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  const globalAudio = useAudioPlayer()

  const alreadyDone = state.confirmations.c1.done
  const [target] = useState(() => (alreadyDone ? state.confirmations.c1.lockedFreq ?? randomFreq() : randomFreq()))
  const [freq, setFreq] = useState(() => {
    let f = randomFreq()
    let guard = 0
    while (Math.abs(f - target) < 4 && guard < 20) { f = randomFreq(); guard++ }
    return f
  })
  const [locked, setLocked] = useState(alreadyDone)
  const [lockProgress, setLockProgress] = useState(alreadyDone ? 1 : 0)
  const [dragging, setDragging] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef(0)
  const freqRef = useRef(freq)
  freqRef.current = freq

  useEffect(() => { updateCinematicStep("confirmation-1") }, [updateCinematicStep])

  // silencia o rádio do carro (se aberto dentro de /drive) enquanto o teste
  // toca seu próprio áudio — volta ao normal ao sair
  useEffect(() => {
    sendCarRadioMute(true)
    return () => sendCarRadioMute(false)
  }, [])

  // monta música (real) + estática (ruído sintetizado via Web Audio) uma vez
  useEffect(() => {
    if (alreadyDone) return
    globalAudio.pause()

    const audio = new Audio(TRACK_URL)
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
  }, [alreadyDone])

  // loop principal: mistura música/estática pela distância até o alvo e
  // acumula (ou perde) o progresso de "travar o sinal"
  useEffect(() => {
    if (alreadyDone || locked) return
    const tick = (ts: number) => {
      const dt = lastTsRef.current ? ts - lastTsRef.current : 16
      lastTsRef.current = ts

      const dist = Math.abs(freqRef.current - target)
      const clarity = Math.max(0, 1 - dist / 3.2)
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
  }, [target, alreadyDone, locked])

  // trava quando o progresso enche
  useEffect(() => {
    if (lockProgress >= 1 && !locked && !alreadyDone) {
      setLocked(true)
      if (audioElRef.current) audioElRef.current.volume = 1
      if (noiseGainRef.current) noiseGainRef.current.gain.value = 0
      completeConfirmation(1, { lockedFreq: target })
    }
  }, [lockProgress, locked, alreadyDone, target, completeConfirmation])

  const updateFromClientX = useCallback((clientX: number) => {
    const el = barRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setFreq(Math.round((FREQ_MIN + pct * (FREQ_MAX - FREQ_MIN)) * 10) / 10)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked || alreadyDone) return
    setDragging(true)
    updateFromClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    updateFromClientX(e.clientX)
  }
  const endDrag = () => setDragging(false)

  const pct = (freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN)
  const dist = Math.abs(freq - target)
  const clarity = Math.max(0, 1 - dist / 3.2)

  // ── RESULTADO ──────────────────────────────────────────────────────────
  if (locked || alreadyDone) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "#020a0c" }}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: ACCENT }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: `${ACCENT}18`, boxShadow: `0 0 60px ${ACCENT}40` }} />
              <div className="absolute inset-3 rounded-full" style={{ backgroundColor: `${ACCENT}12` }} />
              <div className="absolute inset-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${ACCENT}10` }}>
                <span style={{ color: ACCENT, fontFamily: "monospace", fontWeight: 700, fontSize: 15 }}>{target.toFixed(1)}</span>
              </div>
            </div>

            <p className="text-white/30 text-[10px] tracking-[0.35em] uppercase mb-3">sinal travado</p>
            <h1 className="text-2xl font-black tracking-wide mb-4" style={{ color: ACCENT }}>SINT0NIA ENCONTRADA</h1>
            <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-[260px]">
              voce parou de girar no escuro e achou o ponto exato. isso nao e sorte — e atencao.
            </p>

            <p className="text-white/40 text-sm mb-1">voce desbloqueou uma recompensa.</p>
            <p className="text-white/20 text-xs mb-6">descubra na conversa com Alohan, pelo N3XO.</p>

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

  // ── SINTONIZADOR ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden select-none" style={{ background: "#020a0c" }}>
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}12 0%, transparent 60%)` }} />

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
            <p className="text-white/20 text-xs text-center mb-10 max-w-[240px]">sem numero certo pra mirar — so o som e o medidor. segura no ponto ate travar.</p>

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
