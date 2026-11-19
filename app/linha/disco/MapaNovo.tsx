"use client"

// O MAPA NOVO DENTRO DO JOGO (18/11, o dono: "quero ver dentro do jogo"). É a
// cartografia em 3D (o disco de vinil, o subúrbio em anel, os túneis colados no
// cone; mapa-ilustrado.md), servida do próprio site em /mapa-ilustrado e aberta
// por cima do jogo. Ela chega com onde você está (#voce=x,z) e a missão de agora
// (#missao=ep). "Aceitar missão" lá dentro avisa aqui: marca o destino da missão
// (o mesmo "ir" dos cartões) e fecha. (19/11) A bolinha do minimapa abre e fecha; o Esc também fecha.
//
// Desempenho: fechado, nem existe (o iframe só nasce ao abrir).

import { useEffect, useMemo, useRef, useState } from "react"
import type { MundoDisco } from "../estrada/mundoDisco"
import type { HistoriaDisco } from "./historia"
import { pontoVia } from "../estrada/alvoMissao"
import { cartaoDe, cartoesDe } from "./cartoes"
import { EPISODIOS } from "./episodios"
import type { MissaoId } from "./portas"

type PoseMin = { via: number; u: number; wx?: number; wz?: number; livreOk?: boolean; voo?: boolean }

export function MapaNovo({ M, historia, pose, onIr, onFechar }: {
  M: MundoDisco
  historia: HistoriaDisco
  pose: React.RefObject<PoseMin>
  onIr: (id: MissaoId) => void
  onFechar: () => void
}) {
  // o endereço, montado uma vez ao abrir: onde a pessoa está e a missão aberta de agora
  const src = useMemo(() => {
    const q = new URLSearchParams()
    const p = pose.current
    if (p) {
      const w = (p.livreOk || p.voo) && p.wx !== undefined && p.wz !== undefined ? { x: p.wx, z: p.wz } : pontoVia(M, p.via, p.u)
      if (w) q.set("voce", `${Math.round(w.x)},${Math.round(w.z)}`)
    }
    const agora = cartoesDe(historia).find((c) => c.estado === "aberto" && c.proxima)
    if (agora) q.set("missao", agora.ep.id)
    return `/mapa-ilustrado/index.html#${q.toString()}`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cb = useRef({ onIr, onFechar, historia })
  cb.current = { onIr, onFechar, historia }
  useEffect(() => {
    const msg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !e.data || e.data.mapaNeon !== 1) return
      const { onIr, onFechar, historia } = cb.current
      if (e.data.tipo === "aceitar") {
        const ep = EPISODIOS.find((x) => x.id === e.data.ep)
        const id = ep ? cartaoDe(historia, ep).proxima : null
        if (id) onIr(id)
      }
      onFechar()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); cb.current.onFechar() } }
    window.addEventListener("message", msg)
    window.addEventListener("keydown", esc, true)
    return () => { window.removeEventListener("message", msg); window.removeEventListener("keydown", esc, true) }
  }, [])

  // (19/11, o dono) sai do mapa pela bolinha (o minimapa), no mesmo lugar dela: sem botão de entrar ou sair
  const [bola] = useState(() => {
    const r = typeof document !== "undefined" ? document.querySelector(".l-mapa-mini")?.getBoundingClientRect() : null
    return r && r.width > 0 ? { left: r.left, top: r.top, size: r.width } : null
  })

  return (
    <div role="dialog" aria-label="o mapa da Cidade Neon" onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "#05040a" }}>
      <iframe src={src} title="o mapa da Cidade Neon" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
      {bola && (
        <button type="button" aria-label="voltar pro jogo" onClick={() => cb.current.onFechar()}
          style={{ position: "fixed", left: bola.left, top: bola.top, width: bola.size, height: bola.size, borderRadius: "50%", zIndex: 61, cursor: "pointer",
            border: "2px solid #4dffd2", background: "radial-gradient(circle, #10142acc 55%, #05040acc)", boxShadow: "0 0 18px -2px #4dffd2", color: "#e9fff8", display: "grid", placeItems: "center" }}>
          <svg viewBox="0 0 24 24" width={Math.round(bola.size * 0.32)} height={Math.round(bola.size * 0.32)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15 M15 6v15" /></svg>
        </button>
      )}
    </div>
  )
}
