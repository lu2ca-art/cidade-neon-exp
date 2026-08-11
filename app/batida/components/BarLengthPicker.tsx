"use client"

import { BAR_LENGTH_CHOICES, type BarLength } from "../lib/types"

export function BarLengthPicker({
  value,
  onChange,
  accent,
}: {
  value: BarLength
  onChange: (bars: BarLength) => void
  accent: string
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
      <span className="text-[9px] font-mono text-white/30 tracking-widest flex-shrink-0">COMPASSOS</span>
      <div className="flex gap-1 flex-1">
        {BAR_LENGTH_CHOICES.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className="flex-1 py-1 rounded-md text-[10px] font-mono transition-all active:scale-95"
            style={{
              background: value === b ? `${accent}25` : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === b ? accent : "rgba(255,255,255,0.12)"}`,
              color: value === b ? accent : "rgba(255,255,255,0.4)",
            }}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  )
}
