"use client"

import { useRouter } from "next/navigation"
import { PRO_ACCENT } from "../lib/types"

// alterna entre a página PLAY (casual, braço/teclado + paleta de acordes) e
// a página PRO (esteira de acordes + grid de voicing) do mesmo instrumento
export function ModeToggle({
  mode,
  instrument,
  accent,
}: {
  mode: "play" | "pro"
  instrument: "guitarra" | "piano"
  accent: string
}) {
  const router = useRouter()
  const playHref = `/batida/${instrument}`
  const proHref = `/batida/${instrument}/pro`

  return (
    <div className="flex gap-1.5 mb-2 flex-shrink-0">
      <button
        type="button"
        onClick={() => router.push(playHref)}
        className="flex-1 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all active:scale-95"
        style={{
          background: mode === "play" ? `${accent}25` : "rgba(255,255,255,0.04)",
          border: `1px solid ${mode === "play" ? accent : "rgba(255,255,255,0.12)"}`,
          color: mode === "play" ? accent : "rgba(255,255,255,0.35)",
          fontWeight: mode === "play" ? 700 : 400,
        }}
      >
        play
      </button>
      <button
        type="button"
        onClick={() => router.push(proHref)}
        className="flex-1 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all active:scale-95"
        style={{
          background: mode === "pro" ? `${PRO_ACCENT}25` : "rgba(255,255,255,0.04)",
          border: `1px solid ${mode === "pro" ? PRO_ACCENT : "rgba(255,255,255,0.12)"}`,
          color: mode === "pro" ? PRO_ACCENT : "rgba(255,255,255,0.35)",
          fontWeight: mode === "pro" ? 700 : 400,
          boxShadow: mode === "pro" ? `0 0 10px ${PRO_ACCENT}50` : "none",
        }}
      >
        pro
      </button>
    </div>
  )
}
