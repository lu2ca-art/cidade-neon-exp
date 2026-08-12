"use client"

import type { StrumPattern } from "../lib/patterns"

// escolher um padrão auto-preenche o compasso ativo com o acorde armado nas
// posições do padrão — dá pra ajustar manualmente depois no trilho abaixo
export function AutoplayPicker({
  patterns,
  onApply,
  accent,
}: {
  patterns: StrumPattern[]
  onApply: (pattern: StrumPattern) => void
  accent: string
}) {
  if (patterns.length === 0) return null
  return (
    <div className="mb-2 flex-shrink-0">
      <span className="text-[9px] font-mono text-white/30 tracking-widest">AUTOPLAY</span>
      <div className="flex flex-wrap gap-1.5 mt-1">
        {patterns.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            className="px-2.5 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wide transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${accent}50`, color: accent }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
