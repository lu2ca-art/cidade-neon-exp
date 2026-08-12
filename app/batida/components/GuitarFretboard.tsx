"use client"

// ─── braço de violão simulado, estilo Smart Guitar do GarageBand ───────────
// Sem modelo 3D nem samples de corda — a "guitarra" aqui é pura simulação
// harmônica. Tem dois modos:
// - "auto" (PLAY): pega o acorde armado (grau + qualidade da tonalidade) e
//   calcula a pestana móvel correspondente (shape E, a mesma técnica que um
//   violonista usa pra tocar qualquer acorde em qualquer casa), e deixa a
//   pessoa dedilhar (tap) ou dar rasgado (arrastar o dedo cruzando as
//   cordas) nessa forma fixa.
// - "free" (PRO): a pessoa escolhe corda E casa livremente, tocando
//   qualquer nota em qualquer posição — não existe pestana automática, cada
//   toque acende só a corda/casa tocada e desvanece.
// Em ambos os modos, cada corda tocada pulsa um brilho que desvanece,
// animado quadro a quadro.

import { useEffect, useRef } from "react"
import type { ArmedChord, ChordQuality } from "../lib/theory"

// afinação padrão, corda 6 (Mi grave) -> corda 1 (Mi agudo), em MIDI
const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64]
const STRING_LABELS = ["E", "A", "D", "G", "B", "e"]
const VISIBLE_FRETS = 5
const FLASH_MS = 260
const OPEN_ZONE = 0.4 // fração do primeiro traste tratada como "corda solta"

export function computeBarreShape(rootPc: number, quality: ChordQuality): number[] {
  // casa da pestana: distância em semitons da corda Mi grave (classe 4) até a
  // tônica do acorde — isso é o que torna a forma "móvel" pra qualquer tom
  const barre = ((rootPc - 4) % 12 + 12) % 12
  if (quality === "maj") return [barre, barre + 2, barre + 2, barre + 1, barre, barre]
  if (quality === "min") return [barre, barre + 2, barre + 2, barre, barre, barre]
  return [barre, barre + 1, barre + 2, barre, barre + 2, barre] // dim, aproximado
}

export function GuitarFretboard({
  chord,
  accent,
  onNote,
  mode = "auto",
  baseFret: baseFretProp = 0,
}: {
  chord: ArmedChord | null
  accent: string
  onNote: (midi: number, info?: { string: number; fret: number }) => void
  mode?: "auto" | "free"
  baseFret?: number // só usado em mode="free", controlado pelo pai
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const fretsRef = useRef<number[]>([0, 0, 0, 0, 0, 0]) // shape auto (modo "auto")
  const freeFretsRef = useRef<(number | null)[]>([null, null, null, null, null, null]) // toques livres (modo "free")
  const chordRef = useRef(chord)
  const accentRef = useRef(accent)
  const modeRef = useRef(mode)
  const baseFretRef = useRef(baseFretProp)
  const sizeRef = useRef({ w: 320, h: 168, dpr: 1 })
  const flashRef = useRef<number[]>([0, 0, 0, 0, 0, 0])
  const strokeRef = useRef<{ active: boolean; lastString: number | null }>({ active: false, lastString: null })
  const rafRef = useRef<number | null>(null)

  const frets = chord ? computeBarreShape(chord.rootPc, chord.quality) : [0, 0, 0, 0, 0, 0]
  fretsRef.current = frets
  chordRef.current = chord
  accentRef.current = accent
  modeRef.current = mode

  const autoBaseFret = (() => {
    const played = frets.filter((f) => f > 0)
    const minFret = played.length ? Math.min(...played) : 0
    return minFret <= 1 ? 0 : minFret - 1
  })()
  baseFretRef.current = mode === "free" ? baseFretProp : autoBaseFret

  function draw() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { w, h, dpr } = sizeRef.current
    const accentColor = accentRef.current
    const activeChord = chordRef.current
    const isFree = modeRef.current === "free"
    const currentFrets = isFree ? freeFretsRef.current : fretsRef.current
    const baseFret = baseFretRef.current
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const padL = 34
    const padR = 16
    const padT = 18
    const padB = 22
    const boardW = w - padL - padR
    const boardH = h - padT - padB
    const stringGap = boardH / 5
    const fretGap = boardW / VISIBLE_FRETS
    const now = performance.now()

    ctx.fillStyle = "rgba(255,255,255,0.02)"
    ctx.fillRect(padL, padT, boardW, boardH)

    ctx.strokeStyle = "rgba(255,255,255,0.18)"
    ctx.lineWidth = 1
    for (let i = 0; i <= VISIBLE_FRETS; i++) {
      const x = padL + i * fretGap
      ctx.beginPath()
      ctx.moveTo(x, padT)
      ctx.lineTo(x, padT + boardH)
      ctx.stroke()
    }
    if (baseFret === 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(padL, padT)
      ctx.lineTo(padL, padT + boardH)
      ctx.stroke()
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.35)"
      ctx.font = "10px monospace"
      ctx.textAlign = "left"
      ctx.fillText(`${baseFret + 1}ª`, 3, padT - 5)
    }

    // barra da pestana (translúcida, cobre as 6 cordas na casa em questão) —
    // só existe no modo auto, que toca uma forma fixa; no modo livre não há
    // "forma" nenhuma, cada corda tem sua própria casa independente
    if (!isFree && activeChord) {
      const barre = Math.min(...currentFrets.filter((f): f is number => f !== null))
      if (barre > 0) {
        const rel = barre - baseFret
        if (rel >= 1 && rel <= VISIBLE_FRETS) {
          const x = padL + (rel - 0.5) * fretGap
          ctx.fillStyle = `${accentColor}1c`
          ctx.beginPath()
          ctx.roundRect(x - fretGap * 0.42, padT - 4, fretGap * 0.84, boardH + 8, 8)
          ctx.fill()
        }
      }
    }

    for (let s = 0; s < 6; s++) {
      const y = padT + s * stringGap
      const flashAge = now - flashRef.current[s]
      const flashT = flashAge < FLASH_MS ? 1 - flashAge / FLASH_MS : 0
      ctx.strokeStyle = flashT > 0 ? accentColor : "rgba(255,255,255,0.4)"
      ctx.lineWidth = (0.6 + (5 - s) * 0.35) * (1 + flashT * 1.5)
      if (flashT > 0) { ctx.shadowColor = accentColor; ctx.shadowBlur = 8 * flashT }
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(padL + boardW, y)
      ctx.stroke()
      ctx.shadowBlur = 0
      ctx.fillStyle = "rgba(255,255,255,0.3)"
      ctx.font = "8px monospace"
      ctx.textAlign = "right"
      ctx.fillText(STRING_LABELS[s], padL - 6, y + 3)
    }

    // pontos das notas tocadas — no modo auto mostra a forma inteira sempre;
    // no modo livre só mostra enquanto o brilho da corda ainda não apagou
    // (é um "toque", não uma forma persistente)
    if (isFree || activeChord) {
      currentFrets.forEach((f, s) => {
        if (f === null) return
        const y = padT + s * stringGap
        const flashAge = now - flashRef.current[s]
        const flashT = flashAge < FLASH_MS ? 1 - flashAge / FLASH_MS : 0
        if (isFree && flashT <= 0) return
        if (f === 0) {
          // corda solta — anel vazado logo acima da pestana
          ctx.strokeStyle = flashT > 0 ? accentColor : "rgba(255,255,255,0.5)"
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(padL + 8, y, 5, 0, Math.PI * 2)
          ctx.stroke()
          return
        }
        const rel = f - baseFret
        if (rel < 1 || rel > VISIBLE_FRETS) return
        const x = padL + (rel - 0.5) * fretGap
        ctx.shadowColor = accentColor
        ctx.shadowBlur = 10 + flashT * 14
        ctx.fillStyle = accentColor
        ctx.beginPath()
        ctx.arc(x, y, 6.5 + flashT * 2.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      })
    }

    if (flashRef.current.some((t) => now - t < FLASH_MS)) {
      rafRef.current = requestAnimationFrame(draw)
    } else {
      rafRef.current = null
    }
  }

  function requestDraw() {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(draw)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      sizeRef.current = { w: rect.width, h: rect.height, dpr }
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      draw()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => { ro.disconnect(); if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { draw() })

  function stringAt(clientY: number): number | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const { h } = sizeRef.current
    const padT = 18
    const padB = 22
    const boardH = h - padT - padB
    const stringGap = boardH / 5
    const localY = clientY - rect.top
    const idx = Math.round((localY - padT) / stringGap)
    return idx >= 0 && idx <= 5 ? idx : null
  }

  // resolve a casa tocada a partir do X (só usado no modo "free") — a
  // primeira fração do traste mais próximo do rastilho conta como corda
  // solta quando a janela visível começa na casa 0
  function fretAt(clientX: number): number | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const { w } = sizeRef.current
    const padL = 34
    const padR = 16
    const boardW = w - padL - padR
    const fretGap = boardW / VISIBLE_FRETS
    const localX = clientX - rect.left
    const rel = (localX - padL) / fretGap
    if (rel < 0 || rel > VISIBLE_FRETS) return null
    if (baseFretRef.current === 0 && rel < OPEN_ZONE) return 0
    const cell = Math.min(VISIBLE_FRETS, Math.max(1, Math.floor(rel) + 1))
    return baseFretRef.current + cell
  }

  function playString(s: number) {
    if (!chordRef.current) return
    const midi = OPEN_STRING_MIDI[s] + fretsRef.current[s]
    flashRef.current[s] = performance.now()
    requestDraw()
    onNote(midi)
  }

  function playFreeCell(s: number, fret: number) {
    freeFretsRef.current[s] = fret
    flashRef.current[s] = performance.now()
    requestDraw()
    onNote(OPEN_STRING_MIDI[s] + fret, { string: s, fret })
  }

  function playAt(clientX: number, clientY: number) {
    const s = stringAt(clientY)
    if (s === null) return
    if (modeRef.current === "free") {
      const f = fretAt(clientX)
      if (f !== null) playFreeCell(s, f)
    } else {
      playString(s)
    }
  }

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-xl relative touch-none select-none"
      style={{ height: 168, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}30` }}
      onPointerDown={(e) => {
        strokeRef.current = { active: true, lastString: stringAt(e.clientY) }
        playAt(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (!strokeRef.current.active) return
        const s = stringAt(e.clientY)
        if (s !== null && s !== strokeRef.current.lastString) {
          strokeRef.current.lastString = s
          playAt(e.clientX, e.clientY)
        }
      }}
      onPointerUp={() => { strokeRef.current.active = false }}
      onPointerLeave={() => { strokeRef.current.active = false }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {mode === "auto" && !chord && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/25 text-[10px] font-mono">escolha um acorde abaixo</span>
        </div>
      )}
    </div>
  )
}
