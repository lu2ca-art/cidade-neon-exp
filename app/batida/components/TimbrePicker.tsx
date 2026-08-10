"use client"

export function TimbrePicker({
  labels,
  effects,
  value,
  onChange,
  accent,
}: {
  labels: readonly string[]
  effects: readonly string[]
  value: number
  onChange: (i: number) => void
  accent: string
}) {
  return (
    <div className="mb-2 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => onChange(i)}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wide transition-all active:scale-95"
            style={{
              background: value === i ? `${accent}22` : "rgba(255,255,255,0.04)",
              border: `1px solid ${value === i ? accent + "80" : "rgba(255,255,255,0.1)"}`,
              color: value === i ? accent : "rgba(255,255,255,0.4)",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-white/25 text-[9px] font-mono mt-1 text-center">efeito: {effects[value]}</p>
    </div>
  )
}
