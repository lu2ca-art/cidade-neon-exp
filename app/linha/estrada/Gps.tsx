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
// automático (o volante do lado da barra; era o ∞). (piloto, 05/11, o dono:
// "o mapa é como se fosse um copiloto") com destino, o piloto leva a Kombi pela
// rota e para lá; sem, passeia pela rua. Só de Kombi (a pé/patins/moto, some).
// Ver docs/piloto.md.
//
// Desempenho: nada na cena 3D. É DOM; a barra se atualiza ~15×/s escrevendo
// só um transform e um texto (sem React por quadro).

import { useEffect, useRef, useState } from "react"
import "./gps.css"
import type { Mundo } from "./mundo"
import { noMundo, type Marca } from "./Mapa"
import { ICONE_MISSAO, type ChecklistHolo } from "./Holo"
import { CHAO_LUGARES, type LugarChao } from "../disco/historia"
import { PORTOES_RUA, RUA, SEQ_RUA } from "../disco/corridaRua"
import { NAV, NAV_CFG, fmtMetros, refazerNav, type DestinoNav } from "./nav"
import { escreverVira } from "./alvoMissao"

// ── os números ──
export const GPS_CFG = {
  campo: 100, // graus pra cada lado que cabem na barra (o resto fica preso na borda)
  passoMs: 66, // a cada quanto a barra se refaz (~15×/s)
  perto: 30, // m: chegou (some o número)
}

export interface PoseGps { via: number; u: number; x: number; v: number; voo?: boolean; livreOk?: boolean; wx?: number; wz?: number; rumo?: number }
export interface AlvoGps { x: number; z: number; cor: string; nome: string; via?: number; u?: number }
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
  if (rc) return { x: rc.x, z: rc.z, cor: rc.cor, nome: rc.nome, via: rc.via, u: rc.u }
  // (revisão 3) a corrida de rua valendo: o próximo portão (não a marca da D-Bee nem a missão)
  const er = RUA.e
  if (er.fase === "contagem" || er.fase === "valendo") {
    const g = PORTOES_RUA[SEQ_RUA[er.cp] ?? 0]
    if (g) return { x: g.x, z: g.z, cor: "#2fe8ff", nome: er.cp >= SEQ_RUA.length - 1 ? "a chegada" : "o próximo portão" }
  }
  const mk = r.marca.current
  if (mk && mk.wx !== undefined && mk.wz !== undefined) return { x: mk.wx, z: mk.wz, cor: mk.cor, nome: mk.nome }
  if (mk) { const w = noMundo(M, mk); return { x: w.x, z: w.z, cor: mk.cor, nome: mk.nome, via: mk.via, u: mk.u } }
  const vg = r.vaga.current
  if (vg) { const w = noMundo(M, vg); return { x: w.x, z: w.z, cor: vg.cor, nome: vg.nome, via: vg.via, u: vg.u } }
  if (r.chao && "disco" in M) { const c = CHAO_LUGARES[r.chao]; return { x: c.x, z: c.z, cor: c.cor, nome: c.nome.toLowerCase() } }
  if (r.livre) return { x: r.livre.x, z: r.livre.z, cor: r.livre.cor, nome: "o subúrbio" }
  // (T58, só com ?medir) o destino posto à mão pelo teste/medida
  const t = NAV.alvoTeste
  if (t && M.vias[t.via]) { const w = noMundo(M, t); return { x: w.x, z: w.z, cor: "#2fe8ff", nome: "o ponto do teste", via: t.via, u: t.u } }
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

const metros = fmtMetros

export function Gps({ M, pose, refs, icone, escondido = false, infinito, onInfinito, semPiloto = false, apagada = null }: {
  M: Mundo
  pose: React.RefObject<PoseGps>
  refs: RefsAlvo
  // a missão pegada (o ícone dela); sem, um ponto na cor do alvo
  icone?: string | null
  escondido?: boolean
  infinito: boolean
  onInfinito: () => void
  // (piloto) a pé, de patins, de moto ou noutro veículo: sem o botão
  semPiloto?: boolean
  // (T58) as pistas apagadas (a rota não entra nelas)
  apagada?: boolean[] | null
}) {
  const barra = useRef<HTMLDivElement>(null)
  const apagadaRef = useRef(apagada)
  apagadaRef.current = apagada
  const alvoEl = useRef<HTMLSpanElement>(null)
  const distEl = useRef<HTMLElement>(null)
  const [alvo, setAlvo] = useState<{ cor: string; nome: string } | null>(null)
  const refsAtual = useRef(refs)
  refsAtual.current = refs

  useEffect(() => {
    if (escondido) { refazerNav(M, null, null, 0, 0); NAV.vivo = false; return }
    NAV.vivo = true
    if (typeof window !== "undefined" && /[?&]medir/.test(location.search)) (window as unknown as Record<string, unknown>).__nav = NAV
    let ultimo = "", vivo = true, tNav = 0
    const passo = () => {
      if (!vivo) return
      const p = pose.current
      const d = p ? destinoMundo(M, refsAtual.current) : null
      const chave = d ? `${d.cor}|${d.nome}` : ""
      if (chave !== ultimo) { ultimo = chave; setAlvo(d ? { cor: d.cor, nome: d.nome } : null); tNav = 0 }
      const b = barra.current, a = alvoEl.current
      const agora = performance.now()
      // (T58) a rota pelas vias, as manobras, o tempo: 4×/s
      if (agora - tNav >= NAV_CFG.refazMs) {
        const dtN = tNav ? (agora - tNav) / 1000 : 0
        tNav = agora
        const k0 = d && p ? poseMundo(M, p) : null
        refazerNav(M, p ?? null, d as DestinoNav | null, dtN, k0 && d ? anguloAlvo(k0, d) : 0, apagadaRef.current)
        // (05/11, dono: "não quero essa placa") sem o cartão de GPS: a navegação
        // fica só no notch. No máximo a setinha da próxima curva vai pra lá
        const m = NAV.proxima
        escreverVira(d && m && (m.tipo === "vira" || m.tipo === "mira" || m.tipo === "rampa") && m.dist < 160 ? m.lado : 0)
      }
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
    return () => { vivo = false; NAV.vivo = false; clearInterval(t); refazerNav(M, null, null, 0, 0); escreverVira(0) }
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
      {!semPiloto && (
        <button type="button" data-info="piloto" className={`l-gps-auto${infinito ? " is-on" : ""}`} aria-pressed={infinito} aria-label={infinito ? "desligar o piloto" : "piloto automático"} title={infinito ? "o piloto está levando: toca, vira ou acelera pra pegar o volante" : alvo ? `piloto: leva até ${alvo.nome}` : "piloto: passeia pela rua (pra curtir a música)"} onClick={onInfinito}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2" /><path d="M3.8 11.2h6.3M13.9 11.2h6.3M12 14v6.4" /></svg>
        </button>
      )}
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
