"use client"

// ─── grid de passos do modo PRO ─────────────────────────────────────────────
// Entende ChordStepEntry (voicing customizada, não só grau) — por isso não
// reaproveita o ChordStepStrip, que é hard-coded pra grau + lookup em
// DegreeInfo. Alvo de drop da esteira: a resolução de "em qual passo eu
// soltei" é geometria simples contra o retângulo desse grid.
import type { RefObject } from "react"
import { midiToNoteName } from "../lib/theory"
import type { ChordStepEntry } from "../lib/types"

// resolve o índice do passo a partir de um clientX contra o retângulo do
// grid — usado pelo pai (ProChordPage) durante o arrasto, sem precisar de
// nenhuma lib de drag-and-drop
export function stepIndexAtX(containerRect: DOMRect, stepCount: number, clientX: number): number | null {
  const local = clientX - containerRect.left
  if (local < 0 || local > containerRect.width) return null
  return Math.min(stepCount - 1, Math.max(0, Math.floor((local / containerRect.width) * stepCount)))
}

function stepLabel(entry: ChordStepEntry): string {
  if (entry === null) return "·"
  if (typeof entry === "number") return String(entry + 1)
  if (entry.midi.length === 1) return midiToNoteName(entry.midi[0])
  return `${entry.midi.length}×`
}

export function VoicingStepGrid({
  steps,
  currentStep,
  playing,
  dragOverStep,
  accent,
  onClearStep,
  gridRef,
}: {
  steps: ChordStepEntry[]
  currentStep: number | null
  playing: boolean
  dragOverStep: number | null
  accent: string
  onClearStep: (stepIdx: number) => void
  gridRef?: RefObject<HTMLDivElement | null>
}) {
  return (
    <div className="flex-shrink-0">
      <div className="grid gap-1 mb-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1 rounded-full"
            style={{
              background: i === currentStep && playing ? accent : "rgba(255,255,255,0.08)",
              boxShadow: i === currentStep && playing ? `0 0 6px ${accent}` : "none",
            }}
          />
        ))}
      </div>
      <div ref={gridRef} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((entry, stepIdx) => {
          const filled = entry !== null
          const dragOver = dragOverStep === stepIdx
          return (
            <button
              key={stepIdx}
              type="button"
              onClick={() => { if (filled) onClearStep(stepIdx) }}
              className="aspect-square rounded-md flex items-center justify-center text-[8px] font-mono transition-all active:scale-90"
              style={{
                background: dragOver ? `${accent}45` : filled ? `${accent}30` : "rgba(255,255,255,0.05)",
                boxShadow: filled || dragOver ? `0 0 8px ${accent}60` : "none",
                border: stepIdx === currentStep && playing ? `2px solid ${accent}90` : dragOver ? `2px dashed ${accent}` : "2px solid transparent",
                color: filled ? accent : "rgba(255,255,255,0.25)",
              }}
            >
              {stepLabel(entry)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
