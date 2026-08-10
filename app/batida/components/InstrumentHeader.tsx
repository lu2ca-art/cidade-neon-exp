"use client"

import { useRouter } from "next/navigation"

export function InstrumentHeader({
  accent,
  label,
  playing,
  onTogglePlay,
  backHref = "/batida",
}: {
  accent: string
  label: string
  playing: boolean
  onTogglePlay: () => void
  backHref?: string
}) {
  const router = useRouter()
  return (
    <div className="flex items-center justify-between mb-2 flex-shrink-0">
      <button
        type="button"
        onClick={() => router.push(backHref)}
        aria-label="Voltar"
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.12)" }}
      >
        <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <p className="text-white/20 text-[9px] tracking-[0.3em] uppercase font-mono">{label}</p>
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={playing ? "Pausar" : "Tocar"}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{ background: `${accent}18`, border: `1.5px solid ${accent}50` }}
      >
        {playing ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill={accent}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill={accent}><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
    </div>
  )
}
