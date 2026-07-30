"use client"

import { useState } from "react"

// Ferramenta de dev pra ver o /drive num viewport de celular de verdade
// dentro do navegador desktop — o iframe tem sua PRÓPRIA janela (seu
// window.innerWidth/innerHeight são o w/h daqui, não os do desktop que tá
// rodando essa página), então o matchMedia("(max-width:640px)") do /drive
// dispara certinho e o ResizeObserver do stage também mede o tamanho real
// do iframe. Isso resolve o problema de não ter como emular mobile de
// verdade nas ferramentas de automação de navegador disponíveis.
const DEVICES = [
  { id: "se",   label: "iPhone SE",      w: 375, h: 667 },
  { id: "14",   label: "iPhone 14",      w: 390, h: 844 },
  { id: "14pm", label: "iPhone 14 Pro Max", w: 430, h: 932 },
  { id: "and",  label: "Android médio",  w: 412, h: 915 },
]

export default function MobilePreviewPage() {
  const [deviceId, setDeviceId] = useState(DEVICES[1].id)
  const [route, setRoute] = useState("/drive")
  const [reloadKey, setReloadKey] = useState(0)
  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[1]

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", fontFamily: "monospace" }}>
        {DEVICES.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setDeviceId(d.id)}
            style={{
              padding: "6px 12px", borderRadius: 8, cursor: "pointer",
              background: d.id === deviceId ? "#7c3aed" : "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 12,
            }}
          >
            {d.label} ({d.w}×{d.h})
          </button>
        ))}
        <input
          value={route}
          onChange={(e) => setRoute(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 12, width: 140 }}
        />
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", fontSize: 12 }}
        >
          ↻ recarregar
        </button>
      </div>
      <p style={{ fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
        {device.label} — {device.w}×{device.h}px (viewport real do iframe, isMobile deve disparar certinho)
      </p>
      <div style={{
        width: device.w, height: device.h, borderRadius: 28, overflow: "hidden",
        border: "10px solid #1a1a1f", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", flexShrink: 0,
      }}>
        <iframe
          key={`${device.id}-${route}-${reloadKey}`}
          src={route}
          style={{ width: device.w, height: device.h, border: "none", display: "block" }}
          title="Mobile preview"
        />
      </div>
    </div>
  )
}
