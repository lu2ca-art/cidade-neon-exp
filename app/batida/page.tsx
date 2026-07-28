"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"
import { sendMinimizeConsole } from "@/app/providers/AudioBridge"

// ─── B4TIDA — construtor de batida, teste de confirmação #2 ─────────────────
// Sequenciador de 4 trilhas x 8 passos, tocando em loop constante. Existe uma
// batida-alvo escondida (nunca mostrada visualmente) — o jogador só a ouve
// via "OUVIR ORIGINAL" (usos limitados) e via o próprio som do que constrói.
// "COMPARAR" revela, por alguns segundos, quais células batem com o alvo
// (pista tipo mastermind) sem entregar o valor certo de quem errou.
// Vence ao reconstruir o padrão exato.

const ACCENT = "#FF6B6B"
type RowId = "kick" | "snare" | "hat" | "perc"
const STEPS = 8
const STEP_MS = 260
const PREVIEWS_MAX = 3

const ROWS: { id: RowId; label: string; color: string }[] = [
  { id: "kick", label: "KICK", color: "#FF6B6B" },
  { id: "snare", label: "SNARE", color: "#00E5FF" },
  { id: "hat", label: "HAT", color: "#FFD93D" },
  { id: "perc", label: "PERC", color: "#A78BFA" },
]

const TARGET: Record<RowId, boolean[]> = {
  kick: [true, false, false, false, true, false, true, false],
  snare: [false, false, true, false, false, false, true, false],
  hat: [true, false, true, true, false, true, false, true],
  perc: [false, true, false, false, true, false, false, false],
}

function emptyPattern(): Record<RowId, boolean[]> {
  return {
    kick: Array(STEPS).fill(false),
    snare: Array(STEPS).fill(false),
    hat: Array(STEPS).fill(false),
    perc: Array(STEPS).fill(false),
  }
}

function triggerKick(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(150, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.15)
  gain.gain.setValueAtTime(0.9, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.22)
}

function triggerSnare(ctx: AudioContext) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.2)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "highpass"
  filter.frequency.value = 1200
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.6, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start()
}

function triggerHat(ctx: AudioContext) {
  const bufferSize = Math.floor(ctx.sampleRate * 0.06)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "highpass"
  filter.frequency.value = 6000
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.35, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start()
}

function triggerPerc(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "triangle"
  osc.frequency.setValueAtTime(520, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08)
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.14)
}

function triggerRow(ctx: AudioContext, rowId: RowId) {
  if (rowId === "kick") triggerKick(ctx)
  else if (rowId === "snare") triggerSnare(ctx)
  else if (rowId === "hat") triggerHat(ctx)
  else triggerPerc(ctx)
}

export default function BatidaPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  const globalAudio = useAudioPlayer()

  const alreadyDone = state.confirmations.c2.done
  const [pattern, setPattern] = useState<Record<RowId, boolean[]>>(emptyPattern)
  const [locked, setLocked] = useState(alreadyDone)
  const [currentStep, setCurrentStep] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [previewsLeft, setPreviewsLeft] = useState(PREVIEWS_MAX)
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const patternRef = useRef(pattern)
  const previewingRef = useRef(false)
  const previewLeftStepsRef = useRef(0)

  useEffect(() => { updateCinematicStep("confirmation-2") }, [updateCinematicStep])
  useEffect(() => { patternRef.current = pattern }, [pattern])

  // monta o AudioContext compartilhado (bateria sintetizada) uma vez
  useEffect(() => {
    if (alreadyDone) return
    globalAudio.pause()
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AudioCtx()
    } catch {
      // Web Audio indisponível — o jogo fica mudo, mas ainda jogável visualmente
    }
    return () => { try { ctxRef.current?.close() } catch {} }
  }, [alreadyDone]) // eslint-disable-line react-hooks/exhaustive-deps

  // clock do sequenciador — avança o passo em loop constante
  useEffect(() => {
    if (alreadyDone || locked) return
    const id = setInterval(() => setCurrentStep((s) => (s + 1) % STEPS), STEP_MS)
    return () => clearInterval(id)
  }, [alreadyDone, locked])

  // dispara som do passo atual: padrão do jogador, ou do alvo durante preview
  useEffect(() => {
    if (alreadyDone || locked) return
    const ctx = ctxRef.current
    if (!ctx) return
    const source = previewingRef.current ? TARGET : patternRef.current
    ROWS.forEach((r) => { if (source[r.id][currentStep]) triggerRow(ctx, r.id) })
    if (previewingRef.current) {
      previewLeftStepsRef.current -= 1
      if (previewLeftStepsRef.current <= 0) {
        previewingRef.current = false
        setPreviewing(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, alreadyDone, locked])

  // checa vitória sempre que o padrão do jogador muda
  useEffect(() => {
    if (alreadyDone || locked) return
    const isMatch = ROWS.every((r) => TARGET[r.id].every((v, i) => v === pattern[r.id][i]))
    if (isMatch) {
      setLocked(true)
      completeConfirmation(2, { attempts, matchPercent: 100 })
    }
  }, [pattern, alreadyDone, locked, attempts, completeConfirmation])

  const toggleCell = (rowId: RowId, stepIdx: number) => {
    if (previewing || locked || alreadyDone) return
    setPattern((prev) => ({ ...prev, [rowId]: prev[rowId].map((v, i) => (i === stepIdx ? !v : v)) }))
    if (ctxRef.current) triggerRow(ctxRef.current, rowId)
  }

  const startPreview = () => {
    if (previewsLeft <= 0 || previewing || locked) return
    setPreviewsLeft((p) => p - 1)
    previewingRef.current = true
    previewLeftStepsRef.current = STEPS
    setPreviewing(true)
  }

  const compare = () => {
    if (showHint || locked) return
    setAttempts((a) => a + 1)
    setShowHint(true)
    setTimeout(() => setShowHint(false), 1800)
  }

  // ── RESULTADO ──────────────────────────────────────────────────────────
  if (locked || alreadyDone) {
    return (
      <div className="h-dvh flex items-center justify-center overflow-hidden" style={{ background: "#0a0206" }}>
        <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: ACCENT }} />
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div className="relative w-28 h-28 mb-8">
              <div className="absolute inset-0 rounded-full animate-pulse" style={{ backgroundColor: `${ACCENT}18`, boxShadow: `0 0 60px ${ACCENT}40` }} />
              <div className="absolute inset-3 rounded-full" style={{ backgroundColor: `${ACCENT}12` }} />
              <div className="absolute inset-7 rounded-full flex items-center justify-center" style={{ backgroundColor: `${ACCENT}10` }}>
                <span className="text-3xl font-black" style={{ color: ACCENT }}>B</span>
              </div>
            </div>

            <p className="text-white/30 text-[10px] tracking-[0.35em] uppercase mb-3">padrao reconstruido</p>
            <h1 className="text-2xl font-black tracking-wide mb-4" style={{ color: ACCENT }}>BATIDA COMPLETA</h1>
            <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-[260px]">
              voce achou o tempo certo de novo. nao tinha texto pra ler — so tinha que escutar.
            </p>

            <p className="text-white/40 text-sm mb-1">voce desbloqueou uma recompensa.</p>
            <p className="text-white/20 text-xs mb-6">descubra na conversa com Nizzy, pelo N3XO.</p>

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

  // ── SEQUENCIADOR ──────────────────────────────────────────────────────
  return (
    <div className="h-dvh flex items-center justify-center overflow-hidden select-none" style={{ background: "#0a0206" }}>
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}12 0%, transparent 60%)` }} />

        <div className="relative z-10 flex flex-col h-full px-5 pt-14 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
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
            <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-mono">B4TIDA</p>
          </div>

          <p className="text-white/40 text-sm text-center mb-1">reconstrua a batida escondida.</p>
          <p className="text-white/20 text-xs text-center mb-6 max-w-[280px] mx-auto">
            escute o original, monte sua versao, compare. so vence tocando o padrao exato.
          </p>

          {/* Controles */}
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={startPreview}
              disabled={previewsLeft <= 0 || previewing}
              className="flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-30"
              style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}40`, color: ACCENT }}
            >
              {previewing ? "ouvindo..." : `ouvir original (${previewsLeft})`}
            </button>
            <button
              type="button"
              onClick={compare}
              disabled={showHint}
              className="flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}
            >
              comparar
            </button>
          </div>

          {/* Grade do sequenciador */}
          <div className="flex-1 flex flex-col justify-center gap-3">
            {/* Marcadores de passo / playhead */}
            <div className="grid gap-1.5 pl-14" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}>
              {Array.from({ length: STEPS }, (_, i) => (
                <div key={i} className="h-1 rounded-full" style={{ background: i === currentStep ? ACCENT : "rgba(255,255,255,0.08)", boxShadow: i === currentStep ? `0 0 6px ${ACCENT}` : "none" }} />
              ))}
            </div>

            {ROWS.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <span className="w-12 flex-shrink-0 text-[9px] font-mono tracking-widest text-white/40">{row.label}</span>
                <div className="grid gap-1.5 flex-1" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}>
                  {pattern[row.id].map((on, stepIdx) => {
                    const correct = TARGET[row.id][stepIdx] === on
                    return (
                      <button
                        key={stepIdx}
                        type="button"
                        onClick={() => toggleCell(row.id, stepIdx)}
                        className="aspect-square rounded-lg transition-all active:scale-90"
                        style={{
                          background: on ? row.color : "rgba(255,255,255,0.05)",
                          boxShadow: on ? `0 0 8px ${row.color}90` : "none",
                          border: showHint
                            ? `2px solid ${correct ? "#22ff88" : "#ff3b5c"}`
                            : stepIdx === currentStep
                              ? `2px solid ${ACCENT}60`
                              : "2px solid transparent",
                          opacity: on ? 1 : 0.7,
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <p className="text-white/15 text-[10px] font-mono text-center mt-6">tentativas de comparacao: {attempts}</p>
        </div>
      </div>
    </div>
  )
}
