"use client"

export function AddTrackBar({
  accent,
  trackCount,
  maxTracks,
  canAdd,
  onAdd,
  addLabel = "adicionar faixa",
  disabledReason,
}: {
  accent: string
  trackCount: number
  maxTracks: number
  canAdd: boolean
  onAdd: () => void
  addLabel?: string
  disabledReason?: string
}) {
  return (
    <div className="mt-2 flex-shrink-0">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[9px] font-mono text-white/30 tracking-widest">FAIXAS DA MÚSICA</span>
        <span className="text-[9px] font-mono text-white/40">{trackCount}/{maxTracks}</span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        className="w-full py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40"
        style={{ background: `${accent}20`, border: `1px solid ${accent}70`, color: accent }}
      >
        {trackCount >= maxTracks ? "limite de 5 faixas atingido" : addLabel}
      </button>
      {!canAdd && disabledReason && (
        <p className="text-white/30 text-[9px] font-mono mt-1 text-center">{disabledReason}</p>
      )}
    </div>
  )
}
