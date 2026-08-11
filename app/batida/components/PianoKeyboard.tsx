"use client"

// ─── teclado simulado, estilo Smart Piano do GarageBand ────────────────────
// Um oitava real (Dó a Si), desenhada em canvas — o acorde armado acende as
// teclas que formam ele (tônica marcada, terça e quinta destacadas), mas
// qualquer tecla pode ser tocada, como um teclado de verdade. Tocar pulsa um
// brilho que desvanece quadro a quadro.

import { useEffect, useRef } from "react"
import type { ArmedChord } from "../lib/theory"

const WHITE_SEMIS = [0, 2, 4, 5, 7, 9, 11]
const BLACK_SEMIS = [1, 3, null, 6, 8, 10, null] // null = sem tecla preta depois (E-F e B-C)
const BASE_MIDI = 60 // C4
const FLASH_MS = 220

function chordTones(chord: ArmedChord): { root: number; third: number; fifth: number } {
  const third = chord.quality === "maj" ? 4 : 3
  const fifth = chord.quality === "dim" ? 6 : 7
  return { root: chord.rootPc % 12, third: (chord.rootPc + third) % 12, fifth: (chord.rootPc + fifth) % 12 }
}

export function PianoKeyboard({
  chord,
  accent,
  onNote,
}: {
  chord: ArmedChord | null
  accent: string
  onNote: (midi: number) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 320, h: 150, dpr: 1 })
  const chordRef = useRef(chord)
  const accentRef = useRef(accent)
  const flashRef = useRef<Map<number, number>>(new Map())
  const rafRef = useRef<number | null>(null)

  chordRef.current = chord
  accentRef.current = accent

  function draw() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { w, h, dpr } = sizeRef.current
    const accentColor = accentRef.current
    const activeChord = chordRef.current
    const tones = activeChord ? chordTones(activeChord) : null
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const whiteW = w / 7
    const now = performance.now()

    for (let i = 0; i < 7; i++) {
      const semi = WHITE_SEMIS[i]
      const midi = BASE_MIDI + semi
      const flashAge = now - (flashRef.current.get(semi) ?? -Infinity)
      const flashT = flashAge < FLASH_MS ? 1 - flashAge / FLASH_MS : 0
      const isRoot = tones && semi === tones.root
      const isTone = tones && (semi === tones.root || semi === tones.third || semi === tones.fifth)
      const x = i * whiteW
      ctx.fillStyle = flashT > 0 ? `${accentColor}55` : isTone ? `${accentColor}22` : "rgba(255,255,255,0.92)"
      if (flashT > 0 || isTone) { ctx.shadowColor = accentColor; ctx.shadowBlur = flashT > 0 ? 14 * flashT : 6 }
      ctx.beginPath()
      ctx.roundRect(x + 1.5, 0, whiteW - 3, h, [0, 0, 6, 6])
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = "rgba(0,0,0,0.35)"
      ctx.lineWidth = 1
      ctx.stroke()
      if (isRoot) {
        ctx.fillStyle = accentColor
        ctx.beginPath()
        ctx.arc(x + whiteW / 2, h - 16, 4, 0, Math.PI * 2)
        ctx.fill()
      }
      void midi
    }

    const blackW = whiteW * 0.58
    const blackH = h * 0.6
    for (let i = 0; i < 7; i++) {
      const semi = BLACK_SEMIS[i]
      if (semi === null) continue
      const midi = BASE_MIDI + semi
      const flashAge = now - (flashRef.current.get(semi) ?? -Infinity)
      const flashT = flashAge < FLASH_MS ? 1 - flashAge / FLASH_MS : 0
      const isRoot = tones && semi === tones.root
      const isTone = tones && (semi === tones.root || semi === tones.third || semi === tones.fifth)
      const x = (i + 1) * whiteW - blackW / 2
      ctx.fillStyle = flashT > 0 ? accentColor : isTone ? `${accentColor}cc` : "#0a0a0f"
      if (flashT > 0 || isTone) { ctx.shadowColor = accentColor; ctx.shadowBlur = flashT > 0 ? 16 * flashT : 8 }
      ctx.beginPath()
      ctx.roundRect(x, 0, blackW, blackH, [0, 0, 4, 4])
      ctx.fill()
      ctx.shadowBlur = 0
      if (isRoot) {
        ctx.fillStyle = "#0a0a0f"
        ctx.beginPath()
        ctx.arc(x + blackW / 2, blackH - 12, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      void midi
    }

    let stillFlashing = false
    flashRef.current.forEach((t) => { if (now - t < FLASH_MS) stillFlashing = true })
    rafRef.current = stillFlashing ? requestAnimationFrame(draw) : null
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

  function keyAt(clientX: number, clientY: number): number | null {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const whiteW = rect.width / 7
    const blackW = whiteW * 0.58
    const blackH = rect.height * 0.6
    if (y <= blackH) {
      for (let i = 0; i < 7; i++) {
        const semi = BLACK_SEMIS[i]
        if (semi === null) continue
        const bx = (i + 1) * whiteW - blackW / 2
        if (x >= bx && x <= bx + blackW) return semi
      }
    }
    const wi = Math.min(6, Math.max(0, Math.floor(x / whiteW)))
    return WHITE_SEMIS[wi]
  }

  function playSemi(semi: number) {
    flashRef.current.set(semi, performance.now())
    requestDraw()
    onNote(BASE_MIDI + semi)
  }

  return (
    <div
      ref={wrapRef}
      className="w-full rounded-xl overflow-hidden touch-none select-none"
      style={{ height: 150, border: `1px solid ${accent}30` }}
      onPointerDown={(e) => { const s = keyAt(e.clientX, e.clientY); if (s !== null) playSemi(s) }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  )
}
