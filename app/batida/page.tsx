"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"

// ─── B4TIDA — beat-maker livre, teste de confirmação #2 ─────────────────────
// Sequenciador de 4 trilhas x 8 passos, tocando em loop constante. Sem
// padrão escondido pra copiar: a pessoa monta os próprios beats, escolhe
// entre 4 kits e o BPM que quiser, e salva até 4 beats diferentes na sessão
// (sessionStorage — some sozinho quando a aba fecha). Salvar o 4º completa
// a missão, mas o app continua liberado pro resto da sessão depois disso.

const ACCENT = "#FF6B6B"
type RowId = "kick" | "snare" | "hat" | "perc"
type KitId = "sintetico" | "808" | "acustico" | "lofi"
const STEPS = 8
const MAX_SLOTS = 4
const SESSION_KEY = "cn-batida-session"

const ROWS: { id: RowId; label: string; color: string }[] = [
  { id: "kick", label: "KICK", color: "#FF6B6B" },
  { id: "snare", label: "SNARE", color: "#00E5FF" },
  { id: "hat", label: "HAT", color: "#FFD93D" },
  { id: "perc", label: "PERC", color: "#A78BFA" },
]

const KIT_IDS: KitId[] = ["sintetico", "808", "acustico", "lofi"]
const KIT_LABEL: Record<KitId, string> = {
  sintetico: "SINTÉTICO",
  "808": "808",
  acustico: "ACÚSTICO",
  lofi: "LO-FI",
}

// parâmetros de síntese por kit — mesma técnica (osciladores + ruído
// filtrado via Web Audio), só timbres diferentes por kit
const KIT_PARAMS: Record<KitId, {
  kick: { freqStart: number; freqEnd: number; decay: number }
  snare: { durSec: number; filter: BiquadFilterType; cutoff: number; decay: number }
  hat: { durSec: number; filter: BiquadFilterType; cutoff: number; decay: number }
  perc: { freqStart: number; freqEnd: number; decay: number; wave: OscillatorType }
}> = {
  sintetico: {
    kick: { freqStart: 150, freqEnd: 45, decay: 0.2 },
    snare: { durSec: 0.2, filter: "highpass", cutoff: 1200, decay: 0.18 },
    hat: { durSec: 0.06, filter: "highpass", cutoff: 6000, decay: 0.05 },
    perc: { freqStart: 520, freqEnd: 300, decay: 0.12, wave: "triangle" },
  },
  "808": {
    kick: { freqStart: 95, freqEnd: 32, decay: 0.34 },
    snare: { durSec: 0.22, filter: "bandpass", cutoff: 1800, decay: 0.14 },
    hat: { durSec: 0.05, filter: "highpass", cutoff: 8500, decay: 0.04 },
    perc: { freqStart: 180, freqEnd: 90, decay: 0.16, wave: "sine" },
  },
  acustico: {
    kick: { freqStart: 130, freqEnd: 55, decay: 0.22 },
    snare: { durSec: 0.22, filter: "bandpass", cutoff: 900, decay: 0.2 },
    hat: { durSec: 0.07, filter: "highpass", cutoff: 5000, decay: 0.07 },
    perc: { freqStart: 700, freqEnd: 500, decay: 0.1, wave: "triangle" },
  },
  lofi: {
    kick: { freqStart: 110, freqEnd: 40, decay: 0.36 },
    snare: { durSec: 0.24, filter: "lowpass", cutoff: 2200, decay: 0.28 },
    hat: { durSec: 0.08, filter: "lowpass", cutoff: 4000, decay: 0.09 },
    perc: { freqStart: 400, freqEnd: 260, decay: 0.18, wave: "sine" },
  },
}

function emptyPattern(): Record<RowId, boolean[]> {
  return {
    kick: Array(STEPS).fill(false),
    snare: Array(STEPS).fill(false),
    hat: Array(STEPS).fill(false),
    perc: Array(STEPS).fill(false),
  }
}

function triggerKick(ctx: AudioContext, p: typeof KIT_PARAMS.sintetico.kick) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = "sine"
  osc.frequency.setValueAtTime(p.freqStart, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(p.freqEnd, ctx.currentTime + p.decay * 0.7)
  gain.gain.setValueAtTime(0.9, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + p.decay)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + p.decay + 0.02)
}

function triggerNoise(ctx: AudioContext, p: { durSec: number; filter: BiquadFilterType; cutoff: number; decay: number }, vol: number) {
  const bufferSize = Math.floor(ctx.sampleRate * p.durSec)
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = p.filter
  filter.frequency.value = p.cutoff
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(vol, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + p.decay)
  noise.connect(filter).connect(gain).connect(ctx.destination)
  noise.start()
}

function triggerPerc(ctx: AudioContext, p: typeof KIT_PARAMS.sintetico.perc) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = p.wave
  osc.frequency.setValueAtTime(p.freqStart, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(p.freqEnd, ctx.currentTime + p.decay * 0.6)
  gain.gain.setValueAtTime(0.5, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + p.decay)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + p.decay + 0.02)
}

function triggerRow(ctx: AudioContext, rowId: RowId, kit: KitId) {
  const p = KIT_PARAMS[kit]
  if (rowId === "kick") triggerKick(ctx, p.kick)
  else if (rowId === "snare") triggerNoise(ctx, p.snare, 0.6)
  else if (rowId === "hat") triggerNoise(ctx, p.hat, 0.35)
  else triggerPerc(ctx, p.perc)
}

// ─── SALVAMENTO (só na sessão — sessionStorage some quando a aba fecha) ─────
interface SavedBeat {
  id: string
  kit: KitId
  bpm: number
  pattern: Record<RowId, boolean[]>
}
type Slot = SavedBeat | null

function loadSlots(): Slot[] {
  if (typeof window === "undefined") return [null, null, null, null]
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return [null, null, null, null]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [null, null, null, null]
    const slots: Slot[] = [null, null, null, null]
    for (let i = 0; i < MAX_SLOTS; i++) slots[i] = parsed[i] ?? null
    return slots
  } catch {
    return [null, null, null, null]
  }
}

function saveSlots(slots: Slot[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(slots)) } catch {}
}

export default function BatidaPage() {
  const router = useRouter()
  const { completeConfirmation, updateCinematicStep, state } = useGameFunnel()
  const globalAudio = useAudioPlayer()

  const [kit, setKit] = useState<KitId>("sintetico")
  const [bpm, setBpm] = useState(115)
  const [pattern, setPattern] = useState<Record<RowId, boolean[]>>(emptyPattern)
  const [currentStep, setCurrentStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [slots, setSlots] = useState<Slot[]>(() => loadSlots())
  const [justCompleted, setJustCompleted] = useState(false)

  const ctxRef = useRef<AudioContext | null>(null)
  const patternRef = useRef(pattern)
  const kitRef = useRef(kit)
  const stepMs = 60000 / bpm / 2

  useEffect(() => { updateCinematicStep("confirmation-2") }, [updateCinematicStep])
  useEffect(() => { patternRef.current = pattern }, [pattern])
  useEffect(() => { kitRef.current = kit }, [kit])

  // monta o AudioContext compartilhado (bateria sintetizada) uma vez
  useEffect(() => {
    globalAudio.pause()
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctxRef.current = new AudioCtx()
    } catch {
      // Web Audio indisponível — o jogo fica mudo, mas ainda jogável visualmente
    }
    return () => { try { ctxRef.current?.close() } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // clock do sequenciador — avança o passo em loop constante, no BPM atual
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setCurrentStep((s) => (s + 1) % STEPS), stepMs)
    return () => clearInterval(id)
  }, [playing, stepMs])

  // dispara som do passo atual, no kit atual
  useEffect(() => {
    if (!playing) return
    const ctx = ctxRef.current
    if (!ctx) return
    ROWS.forEach((r) => { if (patternRef.current[r.id][currentStep]) triggerRow(ctx, r.id, kitRef.current) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, playing])

  const toggleCell = (rowId: RowId, stepIdx: number) => {
    setPattern((prev) => ({ ...prev, [rowId]: prev[rowId].map((v, i) => (i === stepIdx ? !v : v)) }))
    if (ctxRef.current) triggerRow(ctxRef.current, rowId, kit)
  }

  const clearGrid = () => setPattern(emptyPattern())

  const saveToSlot = useCallback((slotIdx: number) => {
    const beat: SavedBeat = { id: `${Date.now()}`, kit, bpm, pattern }
    setSlots((prev) => {
      const next = [...prev]
      next[slotIdx] = beat
      saveSlots(next)
      const filledCount = next.filter(Boolean).length
      if (filledCount >= MAX_SLOTS && !state.confirmations.c2.done) {
        completeConfirmation(2, { savedCount: MAX_SLOTS })
        setJustCompleted(true)
      }
      return next
    })
  }, [kit, bpm, pattern, state.confirmations.c2.done, completeConfirmation])

  const loadSlot = (slotIdx: number) => {
    const beat = slots[slotIdx]
    if (!beat) { saveToSlot(slotIdx); return }
    setKit(beat.kit); setBpm(beat.bpm); setPattern(beat.pattern)
  }

  const clearSlot = (e: React.MouseEvent, slotIdx: number) => {
    e.stopPropagation()
    setSlots((prev) => {
      const next = [...prev]
      next[slotIdx] = null
      saveSlots(next)
      return next
    })
  }

  return (
    <div className="h-dvh flex items-center justify-center overflow-hidden select-none" style={{ background: "#0a0206" }}>
      <div className="w-full max-w-[100vw] md:max-w-[400px] h-[100dvh] md:h-[844px] flex flex-col relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 0%, ${ACCENT}12 0%, transparent 60%)` }} />

        <div className="relative z-10 flex flex-col h-full px-5 pt-12 pb-5 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => router.push("/?screen=home")}
              aria-label="Inicio"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)" }}
            >
              <svg className="w-3.5 h-3.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="5" y="3" width="14" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="17" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
            <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-mono">B4TIDA</p>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pausar" : "Tocar"}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: `${ACCENT}18`, border: `1.5px solid ${ACCENT}50` }}
            >
              {playing ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill={ACCENT}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill={ACCENT}><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
          </div>

          <p className="text-white/40 text-xs text-center mb-2 flex-shrink-0">
            monte seus beats — crie e salve até 4 pra completar a missão.
          </p>

          {/* Kit + BPM */}
          <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
            {KIT_IDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKit(k)}
                className="flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wide transition-all active:scale-95"
                style={{
                  background: kit === k ? `${ACCENT}22` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${kit === k ? ACCENT + "80" : "rgba(255,255,255,0.1)"}`,
                  color: kit === k ? ACCENT : "rgba(255,255,255,0.4)",
                }}
              >
                {KIT_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <span className="text-[9px] font-mono text-white/30 tracking-widest flex-shrink-0">BPM</span>
            <input
              type="range"
              min={70}
              max={160}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="flex-1 accent-[#FF6B6B]"
              style={{ height: 4 }}
            />
            <span className="text-[11px] font-mono text-white/60 w-8 text-right flex-shrink-0">{bpm}</span>
          </div>

          {/* Grade do sequenciador */}
          <div className="flex-1 flex flex-col justify-center gap-2 min-h-0">
            <div className="grid gap-1.5 pl-12" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}>
              {Array.from({ length: STEPS }, (_, i) => (
                <div key={i} className="h-1 rounded-full" style={{ background: i === currentStep && playing ? ACCENT : "rgba(255,255,255,0.08)", boxShadow: i === currentStep && playing ? `0 0 6px ${ACCENT}` : "none" }} />
              ))}
            </div>

            {ROWS.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <span className="w-10 flex-shrink-0 text-[9px] font-mono tracking-widest text-white/40">{row.label}</span>
                <div className="grid gap-1.5 flex-1" style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}>
                  {pattern[row.id].map((on, stepIdx) => (
                    <button
                      key={stepIdx}
                      type="button"
                      onClick={() => toggleCell(row.id, stepIdx)}
                      className="aspect-square rounded-lg transition-all active:scale-90"
                      style={{
                        background: on ? row.color : "rgba(255,255,255,0.05)",
                        boxShadow: on ? `0 0 8px ${row.color}90` : "none",
                        border: stepIdx === currentStep && playing ? `2px solid ${ACCENT}60` : "2px solid transparent",
                        opacity: on ? 1 : 0.7,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Limpar grade */}
          <button
            type="button"
            onClick={clearGrid}
            className="mt-3 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
          >
            limpar grade
          </button>

          {/* Slots de salvar */}
          <div className="flex gap-2 mt-2 flex-shrink-0">
            {slots.map((beat, i) => (
              <button
                key={i}
                type="button"
                onClick={() => loadSlot(i)}
                className="relative flex-1 py-2 rounded-xl text-[9px] font-mono uppercase tracking-wide transition-all active:scale-95"
                style={{
                  background: beat ? `${ACCENT}18` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${beat ? ACCENT + "60" : "rgba(255,255,255,0.12)"}`,
                  color: beat ? ACCENT : "rgba(255,255,255,0.35)",
                }}
              >
                {beat ? `BEAT ${i + 1}` : `SALVAR ${i + 1}`}
                {beat && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => clearSlot(e, i)}
                    aria-label={`Apagar beat ${i + 1}`}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: "#1a0a0e", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.6)", fontSize: 9, lineHeight: 1 }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Aviso de missão completa — some sozinho, não trava o app */}
          {justCompleted && (
            <div
              className="absolute left-5 right-5 z-20 rounded-xl px-4 py-3 text-center"
              style={{ bottom: "18%", background: "rgba(10,2,6,0.95)", border: `1px solid ${ACCENT}60`, boxShadow: `0 0 20px ${ACCENT}40` }}
            >
              <p className="text-sm font-bold" style={{ color: ACCENT }}>4 BEATS SALVOS</p>
              <p className="text-white/40 text-[10px] mt-1">missão completa — descubra na conversa com Nizzy, pelo N3XO. o estúdio continua liberado.</p>
              <button
                type="button"
                onClick={() => setJustCompleted(false)}
                className="mt-2 text-[10px] font-mono uppercase tracking-widest"
                style={{ color: ACCENT }}
              >
                fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
