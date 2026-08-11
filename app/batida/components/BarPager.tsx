"use client"

// navegador de compasso — só aparece quando o padrão tem mais de 1 compasso.
// a grade sempre mostra UM compasso por vez (mobile não tem espaço pra 32+
// passos numa tela só); isso escolhe qual.
export function BarPager({
  bars,
  activeBar,
  onChange,
  playingBar,
  accent,
}: {
  bars: number
  activeBar: number
  onChange: (bar: number) => void
  playingBar: number | null
  accent: string
}) {
  if (bars <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5 mb-2 flex-shrink-0">
      {Array.from({ length: bars }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="w-7 h-7 rounded-lg text-[10px] font-mono transition-all active:scale-90 relative"
          style={{
            background: activeBar === i ? `${accent}28` : "rgba(255,255,255,0.04)",
            border: `1px solid ${activeBar === i ? accent : "rgba(255,255,255,0.12)"}`,
            color: activeBar === i ? accent : "rgba(255,255,255,0.4)",
          }}
        >
          {i + 1}
          {playingBar === i && (
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 4px ${accent}` }} />
          )}
        </button>
      ))}
    </div>
  )
}
