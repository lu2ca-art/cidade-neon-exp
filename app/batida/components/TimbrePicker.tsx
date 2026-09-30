"use client"

// timbres tirados das faixas vêm depois dos sintetizados, com nome "DA …"/"DO …"
const daFaixa = (label: string) => /^D[AO] /.test(label)

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
      <div className="grid grid-cols-4 gap-1.5">
        {labels.map((label, i) => [
          daFaixa(label) && !daFaixa(labels[i - 1] ?? "") ? (
            <p key="sec" className="col-span-4 text-[8px] font-mono uppercase tracking-[0.25em] mt-1" style={{ color: accent }}>
              tirados das faixas
            </p>
          ) : null,
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
          </button>,
        ])}
      </div>
      <p className="text-white/25 text-[9px] font-mono mt-1 text-center">efeito: {effects[value]}</p>
    </div>
  )
}
