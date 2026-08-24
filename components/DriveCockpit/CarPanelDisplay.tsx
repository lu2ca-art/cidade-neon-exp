"use client"

// Display do painel da Kombi (em 3D) — usa <Html transform> do drei pra
// ancorar HTML ao mesh do rádio 3D. 3 páginas swipeable com pontos:
//   • Rádio (sintonia + play/pause + faixa)
//   • Apps (HUB dock — SINT0NIA, N3XO, FR3Q_, NECTAR, etc)
//   • Mapa (minimapa da cidade)
// Isso substitui os overlays HTML flutuantes na 1ª pessoa.

import { Html } from "@react-three/drei"
import Link from "next/link"
import { useState } from "react"
import { AppIcon } from "@/components/AppIcon"
import { HUB_APPS, HUB_TILES, type HubAppUnlockState } from "@/lib/hub-apps"
import { KOMBI_LAYOUT } from "@/lib/kombi-layout"
import { ALL_TIERS, TIER_META } from "@/lib/radio-tiers"
import { freqOf, pctForFreq } from "@/lib/radio-stations"
import type { UseCarRadioReturn } from "@/hooks/useCarRadio"
import type { GameFunnelState } from "@/app/providers/GameFunnelProvider"

type Page = "radio" | "apps" | "mapa"

export interface CarPanelDisplayProps {
  radio: UseCarRadioReturn
  funnelRadioAccepted: GameFunnelState["radioAccepted"]
  hubUnlock: HubAppUnlockState
  volume: number
  onVolumeChange: (v: number) => void
  onOpenPhone: () => void
  /** Se true, some (usado quando algum modal HTML está aberto — porta-luvas
   *  ou celular — pra não sobrepor). */
  hidden?: boolean
}

export function CarPanelDisplay({
  radio,
  funnelRadioAccepted,
  hubUnlock,
  volume,
  onVolumeChange,
  onOpenPhone,
  hidden = false,
}: CarPanelDisplayProps) {
  const [page, setPage] = useState<Page>("radio")
  if (hidden) return null
  const r = KOMBI_LAYOUT.radio
  // Posição do Html: exatamente na face frontal do rádio 3D. Ligeiro offset
  // em Z (+0.02) pra ficar na frente da moldura.
  const htmlPos: [number, number, number] = [
    r.position[0],
    r.position[1],
    r.position[2] + 0.025,
  ]
  return (
    <Html
      transform
      position={htmlPos}
      rotation={r.rotation as [number, number, number]}
      distanceFactor={0.35}
      style={{ pointerEvents: "auto" }}
    >
      <div
        style={{
          width: 480,
          height: 190,
          // SEM border/bg — a moldura do rádio 3D é a moldura visual.
          padding: 6,
          fontFamily: "monospace",
          color: "#fff",
          userSelect: "none",
        }}
      >
        {/* HEADER TABS */}
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {(["radio", "apps", "mapa"] as Page[]).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                flex: 1,
                padding: "3px 6px",
                fontSize: 10,
                fontFamily: "monospace",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                background: page === p ? TIER_META[radio.activeTier].color : "rgba(255,255,255,0.05)",
                color: page === p ? "#000" : "#c9a97a",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* CONTEÚDO POR PÁGINA */}
        {page === "radio" && <PageRadio radio={radio} funnelRadioAccepted={funnelRadioAccepted} volume={volume} onVolumeChange={onVolumeChange} />}
        {page === "apps" && <PageApps hubUnlock={hubUnlock} />}
        {page === "mapa" && <PageMapa />}
      </div>
    </Html>
  )
}

// ─── Página RÁDIO ────────────────────────────────────────────────────────────
function PageRadio({
  radio,
  funnelRadioAccepted,
  volume,
  onVolumeChange,
}: {
  radio: UseCarRadioReturn
  funnelRadioAccepted: GameFunnelState["radioAccepted"]
  volume: number
  onVolumeChange: (v: number) => void
}) {
  const activeMeta = TIER_META[radio.activeTier]
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: 1, background: "#000", padding: "4px 8px", borderRadius: 3 }}>
          <div style={{ fontSize: 20, fontWeight: "bold", color: activeMeta.color, lineHeight: 1 }}>{activeMeta.freq}</div>
          <div style={{ fontSize: 8, color: "#c9a97a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {radio.radioOn ? (radio.radioTrack?.title ?? activeMeta.label) : "OFF"}
          </div>
        </div>
        <button
          onClick={radio.powerToggle}
          style={{
            width: 24, height: 24, borderRadius: "50%",
            border: `1px solid ${radio.radioOn ? "#22ff88" : "#666"}`,
            background: "transparent",
            color: radio.radioOn ? "#22ff88" : "#666",
            fontSize: 12, cursor: "pointer",
          }}
        >
          {radio.radioOn ? "◉" : "○"}
        </button>
      </div>
      {/* dial */}
      <div
        style={{ position: "relative", height: 14, marginTop: 6, cursor: "pointer" }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const upd = (cx: number) => radio.setDialPct(Math.max(0, Math.min(1, (cx - rect.left) / rect.width)))
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
        }}
      >
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, transform: "translateY(-50%)", background: "#0a0a0a", borderRadius: 1 }} />
        {ALL_TIERS.map((t) => {
          if (!funnelRadioAccepted[t]) return null
          const meta = TIER_META[t]
          const pct = pctForFreq(freqOf(t))
          const active = t === radio.activeTier
          return (
            <div key={t} style={{
              position: "absolute", top: "50%", left: `${pct * 100}%`,
              transform: "translate(-50%,-50%)",
              width: active ? 9 : 6, height: active ? 9 : 6,
              borderRadius: "50%", background: meta.color,
              boxShadow: `0 0 ${active ? 8 : 4}px ${meta.color}`,
            }}/>
          )
        })}
        <div style={{ position: "absolute", top: 0, left: `${radio.dialPct * 100}%`, transform: "translateX(-50%)", width: 2, height: 14, background: "#ffcc00", boxShadow: "0 0 4px #ffcc00" }} />
      </div>
      {/* controles + vol */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, justifyContent: "center" }}>
        <button onClick={() => onVolumeChange(Math.max(0, volume - 0.1))} style={btn(24)}>−</button>
        <button onClick={radio.prevTrack} style={btn(28)}>◀◀</button>
        <button onClick={radio.powerToggle} style={{ ...btn(32), border: `2px solid ${activeMeta.color}`, background: radio.radioOn ? `${activeMeta.color}33` : "transparent" }}>
          {radio.radioOn ? "❚❚" : "▶"}
        </button>
        <button onClick={radio.nextTrack} style={btn(28)}>▶▶</button>
        <button onClick={() => onVolumeChange(Math.min(1, volume + 0.1))} style={btn(24)}>+</button>
      </div>
      <div style={{ marginTop: 4, height: 2, background: "#000", borderRadius: 1 }}>
        <div style={{
          height: "100%", width: `${volume * 100}%`,
          background: activeMeta.color, borderRadius: 1,
          boxShadow: `0 0 4px ${activeMeta.color}`,
        }}/>
      </div>
    </div>
  )
}

// ─── Página APPS ─────────────────────────────────────────────────────────────
// Grid 4x3 com TODOS os apps (tiles do jogo primeiro, dock utilitário depois).
// Sem botão "abrir celular" — os apps são acessíveis direto daqui.
function PageApps({ hubUnlock }: { hubUnlock: HubAppUnlockState; onOpenPhone?: () => void }) {
  const all = [...HUB_TILES, ...HUB_APPS]
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {all.slice(0, 9).map((app) => {
        const unlocked = app.unlocked(hubUnlock)
        const inner = (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: 6, borderRadius: 6,
              background: unlocked ? app.color : "rgba(255,255,255,0.06)",
              opacity: unlocked ? 1 : 0.35,
              color: "#fff",
              minHeight: 38,
            }}
            title={app.label}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
              <AppIcon icon={app.icon} size={20} />
            </div>
            <span style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {app.label}
            </span>
          </div>
        )
        if (!unlocked) return <div key={app.id}>{inner}</div>
        if (app.external) {
          return (
            <a key={app.id} href={app.route} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              {inner}
            </a>
          )
        }
        return (
          <Link key={app.id} href={app.route} style={{ textDecoration: "none" }}>
            {inner}
          </Link>
        )
      })}
    </div>
  )
}

// ─── Página MAPA ─────────────────────────────────────────────────────────────
function PageMapa() {
  return (
    <div style={{ height: 90, position: "relative", background: "#001a10", borderRadius: 4, overflow: "hidden" }}>
      {/* pistas (linhas horizontais/verticais) */}
      {[-30, -15, 0, 15, 30].map((y) => (
        <div key={y} style={{ position: "absolute", left: 0, right: 0, top: `${50 + y}%`, height: 1, background: "#00ff8844" }} />
      ))}
      {[-30, -15, 0, 15, 30].map((x) => (
        <div key={x} style={{ position: "absolute", top: 0, bottom: 0, left: `${50 + x}%`, width: 1, background: "#00ff8844" }} />
      ))}
      {/* posição do carro (ponto rosa central) */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: "translate(-50%, -50%)",
        width: 8, height: 8, borderRadius: "50%",
        background: "#ff2d78", boxShadow: "0 0 8px #ff2d78",
      }}/>
      <div style={{
        position: "absolute", bottom: 4, left: 4,
        fontSize: 8, color: "#00ff88", textTransform: "uppercase", letterSpacing: "0.1em",
      }}>MAPA · CIDADE NEON</div>
    </div>
  )
}

function btn(size: number): React.CSSProperties {
  return {
    width: size, height: size, borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.2)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff", cursor: "pointer",
    fontSize: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
  }
}
