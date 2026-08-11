"use client"

import type { DegreeInfo } from "../lib/theory"

// escolhe qual acorde está "armado" — é ele que aparece no braço/teclado e
// que os toques no trilho de passos colocam na música
export function ChordPalette({
  chords,
  armedDegree,
  onArm,
  accent,
}: {
  chords: DegreeInfo[]
  armedDegree: number | null
  onArm: (degree: number) => void
  accent: string
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2 flex-shrink-0">
      {chords.map((c) => {
        const armed = armedDegree === c.degree
        return (
          <button
            key={c.degree}
            type="button"
            onClick={() => onArm(c.degree)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all active:scale-95"
            style={{
              background: armed ? accent : `${accent}18`,
              border: `1px solid ${accent}70`,
              color: armed ? "#0a0206" : accent,
              fontWeight: armed ? 700 : 400,
            }}
          >
            {c.chordName}
            <span style={{ opacity: 0.55 }} className="ml-1">{c.romanNumeral}</span>
          </button>
        )
      })}
    </div>
  )
}
