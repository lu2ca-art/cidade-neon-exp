"use client"

// Rádio horizontal fino — barra que ocupa o bottom-center da tela.
// Layout: [freq/estação] · [dial arrastável largo] · [prev/play/next] · [vol slider]
// Usado só na 3ª pessoa. Na 1ª pessoa quem exibe é o CarPanelDisplay
// (HTML 3D dentro do painel do carro).

import { useCallback } from "react"
import { ALL_TIERS, TIER_META } from "@/lib/radio-tiers"
import { freqOf, pctForFreq } from "@/lib/radio-stations"
import type { UseCarRadioReturn } from "@/hooks/useCarRadio"
import type { GameFunnelState } from "@/app/providers/GameFunnelProvider"

export interface RadioMusicalPanelProps {
  radio: UseCarRadioReturn
  funnelRadioAccepted: GameFunnelState["radioAccepted"]
  volume: number
  onVolumeChange: (v: number) => void
}

export function RadioMusicalPanel({
  radio,
  funnelRadioAccepted,
  volume,
  onVolumeChange,
}: RadioMusicalPanelProps) {
  const activeMeta = TIER_META[radio.activeTier]

  const handleDialDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const upd = (clientX: number) => {
        const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
        radio.setDialPct(pct)
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      upd(e.clientX)
      const onMove = (ev: PointerEvent) => upd(ev.clientX)
      const onUp = () => {
        if (radio.hoverTier) radio.selectTier(radio.hoverTier)
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
      }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    },
    [radio]
  )

  return (
    <div
      className="pointer-events-auto absolute bottom-6 left-1/2 z-10 flex w-[min(90vw,720px)] -translate-x-1/2 items-center gap-4 rounded-full border border-white/15 bg-gradient-to-r from-[#3a2410] via-[#2a1808] to-[#3a2410] px-5 py-2 shadow-2xl backdrop-blur-md"
      style={{ boxShadow: `0 8px 32px rgba(${hexToRgb(activeMeta.color)}, 0.28)` }}
    >
      {/* ── Bloco esquerdo: display freq + estação ── */}
      <div className="flex min-w-[9rem] items-center gap-2 border-r border-white/10 pr-3">
        <button
          onClick={radio.powerToggle}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border transition"
          style={{
            color: radio.radioOn ? "#22ff88" : "#666",
            borderColor: radio.radioOn ? "#22ff88" : "#666",
          }}
          aria-label="power"
        >
          <span className="text-[10px] font-bold">{radio.radioOn ? "◉" : "○"}</span>
        </button>
        <div className="min-w-0">
          <div className="font-mono text-xl font-bold leading-none" style={{ color: activeMeta.color }}>
            {activeMeta.freq}
          </div>
          <div className="truncate text-[9px] font-mono uppercase tracking-widest text-[#c9a97a]">
            {radio.radioOn ? (radio.radioTrack?.title ?? activeMeta.label) : "off"}
          </div>
        </div>
      </div>

      {/* ── Dial arrastável (ocupa espaço central) ── */}
      <div className="flex-1">
        <div
          className="relative h-6 cursor-pointer select-none rounded"
          onPointerDown={handleDialDrag}
          style={{ touchAction: "none" }}
        >
          {/* trilho escuro */}
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-[#0a0a0a] shadow-inner" />
          {/* ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <div
              key={pct}
              className="absolute top-1/2 h-2.5 w-[1px] -translate-y-1/2 bg-[#c9a97a]/40"
              style={{ left: `${pct * 100}%` }}
            />
          ))}
          {/* Marcadores das estações aceitas */}
          {ALL_TIERS.map((t) => {
            if (!funnelRadioAccepted[t]) return null
            const meta = TIER_META[t]
            const pct = pctForFreq(freqOf(t))
            const active = t === radio.activeTier
            return (
              <div
                key={t}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pct * 100}%` }}
                title={`${meta.freq} · ${meta.label}`}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: active ? 11 : 7,
                    height: active ? 11 : 7,
                    background: meta.color,
                    boxShadow: `0 0 ${active ? 10 : 5}px ${meta.color}`,
                  }}
                />
              </div>
            )
          })}
          {/* Ponteiro dourado */}
          <div
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${radio.dialPct * 100}%` }}
          >
            <div
              className="h-6 w-[2px]"
              style={{ background: "#ffcc00", boxShadow: "0 0 6px #ffcc00" }}
            />
            <div
              className="absolute -top-1 left-1/2 -translate-x-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "5px solid #ffcc00",
                filter: "drop-shadow(0 0 3px #ffcc00)",
              }}
            />
          </div>
        </div>
        {/* escala mini */}
        <div className="mt-0.5 flex justify-between text-[7px] font-mono text-[#c9a97a]/70">
          <span>69.9</span>
          <span style={{ color: "#ffcc00" }}>{radio.dialFreq.toFixed(1)} MHz</span>
          <span>222.4</span>
        </div>
      </div>

      {/* ── Controles: prev/play/next centralizados ── */}
      <div className="flex flex-shrink-0 items-center gap-1.5 border-l border-r border-white/10 px-3">
        <button
          onClick={radio.prevTrack}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
          aria-label="anterior"
        >
          <span className="text-xs">◀◀</span>
        </button>
        <button
          onClick={radio.powerToggle}
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-white transition"
          style={{
            borderColor: activeMeta.color,
            background: radio.radioOn ? `${activeMeta.color}33` : "rgba(255,255,255,0.05)",
            boxShadow: radio.radioOn ? `0 0 12px ${activeMeta.color}66` : "none",
          }}
          aria-label={radio.radioOn ? "pausar" : "tocar"}
        >
          <span className="text-sm">{radio.radioOn ? "❚❚" : "▶"}</span>
        </button>
        <button
          onClick={radio.nextTrack}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10"
          aria-label="próxima"
        >
          <span className="text-xs">▶▶</span>
        </button>
      </div>

      {/* ── Vol -/+ com slider fino ── */}
      <div className="flex min-w-[8rem] flex-shrink-0 items-center gap-1.5">
        <button
          onClick={() => onVolumeChange(Math.max(0, volume - 0.1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-white hover:bg-white/10"
          aria-label="volume -"
        >
          −
        </button>
        <div className="relative h-1.5 flex-1 rounded bg-black">
          <div
            className="absolute inset-y-0 left-0 rounded"
            style={{
              width: `${volume * 100}%`,
              background: `linear-gradient(90deg, ${activeMeta.color}88, ${activeMeta.color})`,
              boxShadow: `0 0 6px ${activeMeta.color}`,
            }}
          />
        </div>
        <button
          onClick={() => onVolumeChange(Math.min(1, volume + 0.1))}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/5 text-sm text-white hover:bg-white/10"
          aria-label="volume +"
        >
          +
        </button>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}
