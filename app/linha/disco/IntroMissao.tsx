"use client"

// O BALÃO DA INTRODUÇÃO (trilha sonora, 05/11): quem pede a missão fala, por cima
// do mundo (sem tela preta, sem cutscene), com a música seguindo um pouco mais
// baixa. Toque pra começar; "depois" fecha e deixa pra próxima chegada.
// Os textos: disco/introMissoes.ts (rascunho).

import { useEffect } from "react"
import { abaixarUmPouco } from "../som"

export function IntroMissao({ quem, texto, cor, onBora, onDepois }: { quem: string; texto: string; cor: string; onBora: () => void; onDepois: () => void }) {
  // a fala por cima: a música abaixa um pouco (não para)
  useEffect(() => { abaixarUmPouco(true); return () => abaixarUmPouco(false) }, [])
  useEffect(() => {
    // (revisão 05/11) na captura e sem propagar: o Enter/espaço do balão não chega na
    // estrada (o espaço lá é turbo/propulsor; a estrada ouve na janela, na volta)
    const k = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onBora() }
      else if (e.key === "Escape") { e.stopPropagation(); onDepois() }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  }, [onBora, onDepois])
  return (
    <div
      role="dialog"
      aria-label={`${quem} fala`}
      style={{
        position: "fixed", left: 16, right: 16, bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)", zIndex: 60,
        maxWidth: 460, margin: "0 auto", pointerEvents: "auto",
        background: "rgba(8, 8, 16, 0.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        border: `1px solid ${cor}`, borderRadius: 14, padding: "12px 14px 10px",
        boxShadow: `0 0 18px ${cor}55`, color: "#f2f2f7", fontSize: 15, lineHeight: 1.4,
      }}
      onClick={onBora}
    >
      <b style={{ color: cor, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>{quem}</b>
      <p style={{ margin: "4px 0 10px" }}>{texto}</p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDepois() }} style={{ background: "none", border: 0, color: "#a8a8b8", fontSize: 13, padding: "8px 4px", cursor: "pointer" }}>depois</button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onBora() }} style={{ background: cor, border: 0, color: "#08080f", fontWeight: 700, fontSize: 14, borderRadius: 999, padding: "8px 18px", cursor: "pointer" }}>bora ▸</button>
      </div>
    </div>
  )
}
