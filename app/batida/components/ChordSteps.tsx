"use client"

import type { DegreeInfo } from "../lib/theory"

// editor de acordes por passo pra guitarra/piano — cada passo guarda o GRAU
// da escala (ou null), e só os graus "desbloqueados" pelo baixo (ou todos,
// se o baixo ainda não definiu nada) podem ser usados
export function ChordSteps({
  steps,
  chords,
  currentStep,
  playing,
  onSetStep,
  onPreviewChord,
  accent,
}: {
  steps: (number | null)[]
  chords: DegreeInfo[]
  currentStep: number | null
  playing: boolean
  onSetStep: (stepIdx: number, degree: number | null) => void
  onPreviewChord: (degree: number) => void
  accent: string
}) {
  const cycle = (stepIdx: number) => {
    const current = steps[stepIdx]
    if (current === null) { onSetStep(stepIdx, chords[0]?.degree ?? null); return }
    const idx = chords.findIndex((c) => c.degree === current)
    if (idx === -1 || idx === chords.length - 1) { onSetStep(stepIdx, null); return }
    onSetStep(stepIdx, chords[idx + 1].degree)
  }

  return (
    <div className="flex-1 flex flex-col justify-center gap-3 min-h-0">
      {/* paleta de acordes disponíveis na tonalidade */}
      <div>
        <p className="text-white/25 text-[9px] font-mono tracking-widest mb-1.5">ACORDES DISPONÍVEIS</p>
        <div className="flex flex-wrap gap-1.5">
          {chords.map((c) => (
            <button
              key={c.degree}
              type="button"
              onClick={() => onPreviewChord(c.degree)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all active:scale-95"
              style={{ background: `${accent}18`, border: `1px solid ${accent}50`, color: accent }}
            >
              {c.chordName}
              <span className="text-white/30 ml-1">{c.romanNumeral}</span>
            </button>
          ))}
        </div>
      </div>

      {/* trilho de passos */}
      <div>
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
                onClick={() => cycle(stepIdx)}
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
    </div>
  )
}
