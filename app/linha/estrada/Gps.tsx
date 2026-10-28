"use client"

// O GPS (T42, LU2CA jogada 1, 22/10: "algum ícone que você pode mirar numa
// barra de gps como tinha na versão antiga [...] pra ficar minimalista mas
// funcional"). Uma barra fininha em cima, no meio: o meio é pra onde a Kombi
// aponta; o ícone da missão corre pra esquerda/direita conforme o alvo fica
// pra lá. Alinhou o ícone no meio, está indo certo. Atrás (fora da barra), o
// ícone fica preso na borda com a setinha do lado pra virar.
//
// E (J2:32) o checklist pelo mapa: na vista do drone, um cartão com SÓ o
// próximo passo; e (J1) as viagens rápidas pros minijogos e o piloto
// automático infinito (o botão ∞ do lado da barra).
//
// Desempenho: nada na cena 3D. É DOM; a barra se atualiza ~15×/s escrevendo
// só um transform e um texto (sem React por quadro).

import { useEffect, useRef, useState } from "react"
import "./gps.css"
import type { Mundo } from "./mundo"
import { noMundo, type Marca } from "./Mapa"
import { ICONE_MISSAO, type ChecklistHolo } from "./Holo"
import { CHAO_LUGARES, type LugarChao } from "../disco/historia"

// ── os números ──
export const GPS_CFG = {
  campo: 100, // graus pra cada lado que cabem na barra (o resto fica preso na borda)
  passoMs: 66, // a cada quanto a barra se refaz (~15×/s)
  perto: 30, // m: chegou (some o número)
}

export interface PoseGps { via: number; u: number; x: number; v: number; voo?: boolean; livreOk?: boolean; wx?: number; wz?: number; rumo?: number }
export interface AlvoGps { x: number; z: number; cor: string; nome: string }
export interface RefsAlvo {
  marca: React.RefObject<Marca | null>
  vaga: React.RefObject<{ via: number; u: number; cor: string; nome: string } | null>
  chao: LugarChao | null
  livre: { x: number; z: number; cor: string } | null
  // (T44) um racha valendo: a chegada vem antes de tudo
  racha?: React.RefObject<{ alvo: AlvoGps | null } | null>
}

// o destino em metros do mundo: a mesma ordem do drone e do automático
// (a marca do mapa, a vaga da missão, o lugar do chão, o ponto livre das dunas)
export function destinoMundo(M: Mundo, r: RefsAlvo): AlvoGps | null {
  const rc = r.racha?.current?.alvo
  if (rc) return { x: rc.x, z: rc.z, cor: rc.cor, nome: rc.nome }
  const mk = r.marca.current
  if (mk) { const w = noMundo(M, mk); return { x: w.x, z: w.z, cor: mk.cor, nome: mk.nome } }
  const vg = r.vaga.current
  if (vg) { const w = noMundo(M, vg); return { x: w.x, z: w.z, cor: vg.cor, nome: vg.nome } }
  if (r.chao && "disco" in M) { const c = CHAO_LUGARES[r.chao]; return { x: c.x, z: c.z, cor: c.cor, nome: c.nome.toLowerCase() } }
  if (r.livre) return { x: r.livre.x, z: r.livre.z, cor: r.livre.cor, nome: "o subúrbio" }
  return null
}

// onde a Kombi está e pra onde aponta (no chão/voo, o rumo dela; na pista, a da pista)
export function poseMundo(M: Mundo, p: PoseGps) {
  if ((p.voo || p.livreOk) && p.wx !== undefined && p.wz !== undefined) return { x: p.wx, z: p.wz, rumo: p.rumo ?? 0 }
  const k = noMundo(M, p)
  return { x: k.x - k.tz * p.x, z: k.z + k.tx * p.x, rumo: Math.atan2(k.tx, k.tz) }
}

// o ângulo do alvo em relação à frente (graus): negativo = à esquerda, positivo = à direita
export function anguloAlvo(pose: { x: number; z: number; rumo: number }, alvo: { x: number; z: number }) {
  const dif = Math.atan2(alvo.x - pose.x, alvo.z - pose.z) - pose.rumo
  return (-Math.atan2(Math.sin(dif), Math.cos(dif)) * 180) / Math.PI
}

const metros = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`)

export function Gps({ M, pose, refs, icone, escondido = false, infinito, onInfinito }: {
  M: Mundo
  pose: React.RefObject<PoseGps>
  refs: RefsAlvo
  // a missão pegada (o ícone dela); sem, um ponto na cor do alvo
  icone?: string | null
  escondido?: boolean
  infinito: boolean
  onInfinito: () => void
}) {
  const barra = useRef<HTMLDivElement>(null)
  const alvoEl = useRef<HTMLSpanElement>(null)
  const distEl = useRef<HTMLElement>(null)
  const [alvo, setAlvo] = useState<{ cor: string; nome: string } | null>(null)
  const refsAtual = useRef(refs)
  refsAtual.current = refs

  useEffect(() => {
    if (escondido) return
    let ultimo = "", vivo = true
    const passo = () => {
      if (!vivo) return
      const p = pose.current
      const d = p ? destinoMundo(M, refsAtual.current) : null
      const chave = d ? `${d.cor}|${d.nome}` : ""
      if (chave !== ultimo) { ultimo = chave; setAlvo(d ? { cor: d.cor, nome: d.nome } : null) }
      const b = barra.current, a = alvoEl.current
      if (!d || !p || !b || !a) return
      const k = poseMundo(M, p)
      const ang = anguloAlvo(k, d)
      const dist = Math.hypot(d.x - k.x, d.z - k.z)
      const C = GPS_CFG, meia = b.clientWidth / 2
      const f = Math.max(-1, Math.min(1, ang / C.campo))
      a.style.transform = `translateX(${(f * meia).toFixed(1)}px)`
      a.dataset.ang = String(Math.round(ang))
      a.classList.toggle("is-borda", Math.abs(ang) > C.campo)
      a.classList.toggle("is-esq", ang < 0)
      a.classList.toggle("is-mira", Math.abs(ang) < 6)
      if (distEl.current) distEl.current.textContent = dist < C.perto ? "aqui" : metros(dist)
    }
    passo()
    const t = setInterval(passo, GPS_CFG.passoMs)
    return () => { vivo = false; clearInterval(t) }
  }, [M, pose, escondido])

  if (escondido) return null
  const forma = icone ? ICONE_MISSAO[icone] : null
  return (
    <div className="l-gps" onPointerDown={(e) => e.stopPropagation()}>
      <div ref={barra} className={`l-gps-barra${alvo ? "" : " is-vazia"}`} style={{ ["--cor" as string]: alvo?.cor ?? "#2fe8ff" }} role="img" aria-label={alvo ? `GPS: ${alvo.nome}` : "GPS"}>
        <i className="l-gps-meio" aria-hidden="true" />
        {alvo && (
          <span ref={alvoEl} className="l-gps-alvo" aria-hidden="true">
            <svg viewBox="0 0 24 24">{forma ? <path d={forma} /> : <circle cx="12" cy="12" r="4" />}</svg>
            <b ref={distEl} className="l-gps-dist" />
          </span>
        )}
      </div>
      <button type="button" className={`l-gps-auto${infinito ? " is-on" : ""}`} aria-pressed={infinito} aria-label={infinito ? "desligar o piloto automático" : "piloto automático infinito"} title={infinito ? "o automático está levando: toca pra pegar o volante" : "deixar no automático (pra só curtir)"} onClick={onInfinito}>∞</button>
    </div>
  )
}

// (J2:32) o checklist pelo mapa: só o próximo passo
export function proximoPasso(c: ChecklistHolo) {
  const i = c.passos.findIndex((p) => p.estado === "agora")
  const k = i >= 0 ? i : c.passos.findIndex((p) => p.estado !== "feita")
  return k < 0 ? null : { passo: c.passos[k], n: k + 1, de: c.passos.length }
}

export function ProximoPasso({ checklist }: { checklist: ChecklistHolo }) {
  const pp = proximoPasso(checklist)
  const forma = ICONE_MISSAO[checklist.chave]
  return (
    <div className="l-proximo" style={{ ["--cor" as string]: checklist.cor }} role="status" onPointerDown={(e) => e.stopPropagation()}>
      {forma && <svg viewBox="0 0 24 24" aria-hidden="true"><path d={forma} /></svg>}
      <div>
        <small>{checklist.titulo}{pp ? ` · ${pp.n} de ${pp.de}` : ""}</small>
        <b>{pp ? `▸ ${pp.passo.nome}` : "✓ tudo feito"}</b>
      </div>
    </div>
  )
}

// (J1) as viagens rápidas pros minijogos: na hora, sem gastar as viagens dos anéis
export const MINIJOGOS = [
  { chave: "pagina:ginasio", nome: "o ginásio", jogo: "basquete · ping pong", cor: "#ff9000" },
  { chave: "pagina:fliperama", nome: "o fliperama", jogo: "as máquinas", cor: "#ff6a35" },
  { chave: "parque", nome: "a montanha-russa", jogo: "o parque", cor: "#ff5b5b" },
] as const
export interface Rapida { chave: string; nome: string; jogo: string; cor: string; via: number; u: number }
export function rapidasDo(M: Mundo, apagada?: boolean[] | null): Rapida[] {
  if (!("disco" in M)) return []
  return MINIJOGOS.flatMap((m) => {
    const o = M.onde?.(m.chave)
    return o && o.via >= 0 && !apagada?.[o.via] ? [{ ...m, via: o.via, u: o.u }] : []
  })
}

export function ViagensRapidas({ lista, onViajar }: { lista: Rapida[]; onViajar: (r: Rapida) => void }) {
  if (!lista.length) return null
  return (
    <nav className="l-rapidas" aria-label="viagem rápida pros minijogos" onPointerDown={(e) => e.stopPropagation()}>
      <small>viagem rápida</small>
      {lista.map((r) => (
        <button key={r.chave} type="button" data-chave={r.chave} style={{ ["--cor" as string]: r.cor }} onClick={() => onViajar(r)}>
          <b>{r.nome}</b><em>{r.jogo}</em>
        </button>
      ))}
    </nav>
  )
}
