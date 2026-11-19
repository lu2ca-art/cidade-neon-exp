"use client"

// O MAPA NOVO DENTRO DO JOGO (18/11, o dono: "quero ver dentro do jogo"). É a
// cartografia em 3D (o disco de vinil, o subúrbio em anel, os túneis colados no
// cone; mapa-ilustrado.md), servida do próprio site em /mapa-ilustrado e aberta
// por cima do jogo. Ela chega com onde você está (#voce=x,z) e a missão de agora
// (#missao=ep). "Aceitar missão" lá dentro avisa aqui: marca o destino da missão
// (o mesmo "ir" dos cartões) e fecha. (19/11) A bolinha do minimapa abre e fecha; o Esc também fecha.
//
// (19/11, o dono) o holo fica ligado por cima do mapa: o mapa mora logo acima da cena 3D
// e embaixo do HUD (z 5+); a bolinha (o minimapa) continua à vista e fecha o mapa.
//
// Desempenho: fechado, nem existe (o iframe só nasce ao abrir).

import { useEffect, useMemo, useRef } from "react"
import type { MundoDisco } from "../estrada/mundoDisco"
import type { HistoriaDisco } from "./historia"
import { pontoVia } from "../estrada/alvoMissao"
import { PISTAS } from "../estrada/pistas"
import { cartaoDe, cartoesDe } from "./cartoes"
import { EPISODIOS, episodioDaMissao } from "./episodios"
import type { MissaoId } from "./portas"

type PoseMin = { via: number; u: number; wx?: number; wz?: number; livreOk?: boolean; voo?: boolean }

export function MapaNovo({ M, historia, pose, missao, onIr, onFechar }: {
  M: MundoDisco
  historia: HistoriaDisco
  pose: React.RefObject<PoseMin>
  missao?: MissaoId | null
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
    const cs = cartoesDe(historia), agora = cs.find((c) => c.estado === "aberto" && c.proxima)
    const escolhida = missao ? episodioDaMissao(missao) : null
    if (escolhida) q.set("missao", escolhida.id)
    else if (agora) q.set("missao", agora.ep.id)
    // (19/11, o dono) na cidade, só o nome das faixas já liberadas (as missões feitas)
    q.set("faixas", cs.filter((c) => c.estado === "feito").map((c) => PISTAS.find((p) => p.id === c.ep.musica)?.faixa).filter(Boolean).join(","))
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

  return (
    <div role="dialog" aria-label="o mapa da Cidade Neon" onPointerDown={(e) => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 4, background: "#05040a" }}>
      <iframe src={src} title="o mapa da Cidade Neon" style={{ width: "100%", height: "100%", border: 0, display: "block" }} />
    </div>
  )
}
