"use client"

import type { DegreeInfo } from "../lib/theory"

// trilho de passos (um compasso por vez) — toca no passo pra colocar o
// acorde ARMADO ali (toca de novo pra tirar). A escolha de qual acorde fica
// armado acontece na paleta acima, que também alimenta o braço/teclado.
export function ChordStepStrip({
  steps,
  chords,
  armedDegree,
  currentStep,
  playing,
  onSetStep,
  accent,
}: {
  steps: (number | null)[]
  chords: DegreeInfo[]
  armedDegree: number | null
  currentStep: number | null
  playing: boolean
  onSetStep: (stepIdx: number, degree: number | null) => void
  accent: string
}) {
  const toggle = (stepIdx: number) => {
    if (armedDegree === null) return
    onSetStep(stepIdx, steps[stepIdx] === armedDegree ? null : armedDegree)
  }

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
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((degree, stepIdx) => {
          const chord = degree !== null ? chords.find((c) => c.degree === degree) : null
          return (
            <button
              key={stepIdx}
              type="button"
              onClick={() => toggle(stepIdx)}
              className="aspect-square rounded-md flex items-center justify-center text-[8px] font-mono transition-all active:scale-90"
              style={{
                background: chord ? `${accent}30` : "rgba(255,255,255,0.05)",
                boxShadow: chord ? `0 0 8px ${accent}60` : "none",
                border: stepIdx === currentStep && playing ? `2px solid ${accent}90` : "2px solid transparent",
                color: chord ? accent : "rgba(255,255,255,0.25)",
              }}
            >
              {chord ? chord.chordName : "·"}
            </button>
          )
        })}
      </div>
    </div>
  )
}
