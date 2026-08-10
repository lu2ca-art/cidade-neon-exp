"use client"

export interface StepGridRow {
  id: string
  label: string
  color: string
}

// grade booleana de passos — usada pela bateria (4 linhas) e pelo baixo
// (7 linhas = graus da escala)
export function StepGrid({
  rows,
  steps,
  cells,
  currentStep,
  playing,
  onToggle,
  accent,
  onPreviewRow,
}: {
  rows: StepGridRow[]
  steps: number
  cells: Record<string, boolean[]>
  currentStep: number | null
  playing: boolean
  onToggle: (rowId: string, stepIdx: number) => void
  accent: string
  onPreviewRow?: (rowId: string) => void
}) {
  return (
    <div className="flex-1 flex flex-col justify-center gap-1.5 min-h-0">
      <div className="grid gap-1 pl-12" style={{ gridTemplateColumns: `repeat(${steps}, minmax(0, 1fr))` }}>
        {Array.from({ length: steps }, (_, i) => (
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

      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPreviewRow?.(row.id)}
            className="w-10 flex-shrink-0 text-left text-[8px] font-mono tracking-widest text-white/40 active:text-white/70"
          >
            {row.label}
          </button>
          <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: `repeat(${steps}, minmax(0, 1fr))` }}>
            {(cells[row.id] ?? []).map((on, stepIdx) => (
              <button
                key={stepIdx}
                type="button"
                onClick={() => onToggle(row.id, stepIdx)}
                className="aspect-square rounded-md transition-all active:scale-90"
                style={{
                  background: on ? row.color : "rgba(255,255,255,0.05)",
                  boxShadow: on ? `0 0 8px ${row.color}90` : "none",
                  border: stepIdx === currentStep && playing ? `2px solid ${accent}60` : "2px solid transparent",
                  opacity: on ? 1 : 0.7,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
