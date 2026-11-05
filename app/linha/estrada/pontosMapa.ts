// (notas 04/11, o dono: "o mapa precisa ser mais funcional. No minimapa tá cheio
// de ícones desde o começo, o que não reflete no mapa em tela cheia") O QUE O
// MAPA MOSTRA, numa função só. O minimapa, o mapa grande (2D) e o drone (o mapa
// em tela cheia) leem daqui: os mesmos pontos, com as mesmas regras.
//
// As regras:
// - as missões (o mapaMissoes da page): a de agora destacada, as que dá pra
//   pegar, as feitas apagadas (alvoMissao.ts dá o ponto, o mesmo do gatilho)
// - os lugares das pistas só nas pistas acesas (as apagadas escondem os delas)
// - os lugares do chão do subúrbio só quando já existem pro jogador (a fase da
//   história diz quais) ou quando são o alvo de agora
// - um lugar que é o ponto de uma missão aberta não aparece duas vezes: fica o
//   ícone da missão
// - sem os canteiros de flor (pontinhos demais; eles se acham na rua)

import { posicao, type Mundo } from "./mundo"
import { PASSO } from "./pista"
import { LUGARES } from "../lugares"
import { PAGINAS } from "../paginas"
import { PARQUE } from "./Parque"
import { CHAO_FIXOS, CHAO_LUGARES, type LugarChao } from "../disco/historia"
import { pontoDoAlvo, type LugarMissao } from "./alvoMissao"

export type TipoPonto = "lugar" | "posto" | "parque" | "chao" | "missao"
export interface PontoMapa {
  id: string
  nome: string
  cor: string
  tipo: TipoPonto
  x: number
  y: number
  z: number
  // na pista (os lugares das pistas): pra marcar o destino e a rota
  via?: number
  u?: number
  // as missões
  agora?: boolean
  feita?: boolean
  icone?: string
}
// o ícone de missão que a page manda (o mesmo de antes; Mapa.tsx reexporta)
export interface IconeMapa { id: string; faixa: string; cor: string; agora: boolean; feita?: boolean; icone?: string; lugar?: LugarMissao }

// os lugares do chão que já existem pro jogador, por fase da história
const CHAO_POR_FASE: Record<string, readonly LugarChao[]> = {
  minhoca: [], casa: [], dunas: [],
  bar: ["bar"],
  oficina: ["bar", "oficina"],
  subir: ["bar", "oficina"],
  nectar: ["bar", "oficina"],
}
export function chaoNoMapa(fase: string | null | undefined, alvo: LugarChao | null): LugarChao[] {
  const base = fase && CHAO_POR_FASE[fase] ? CHAO_POR_FASE[fase] : CHAO_FIXOS
  return alvo && !base.includes(alvo) ? [...base, alvo] : [...base]
}

function noVia(M: Mundo, via: number, u: number) {
  const v = M.vias[via]
  const i = v.fechada ? ((Math.round(u / PASSO) % v.n) + v.n) % v.n : Math.max(0, Math.min(v.n - 1, Math.round(u / PASSO)))
  return { x: v.px[i], y: v.py[i], z: v.pz[i] }
}
const yChao = (M: Mundo, x: number, z: number) => (M as unknown as { chaoEm?: (x: number, z: number) => number }).chaoEm?.(x, z) ?? 0

export function pontosDoMapa(M: Mundo, o: { apagada?: boolean[] | null; missoes?: IconeMapa[] | null; fase?: string | null; alvoChao?: LugarChao | null }): PontoMapa[] {
  const out: PontoMapa[] = []
  const disco = "disco" in M
  // as missões primeiro: os lugares delas (abertas) não se repetem embaixo
  const ocupados = new Set<string>()
  if (disco) for (const m of o.missoes ?? []) {
    if (!m.lugar) continue
    const w = pontoDoAlvo(M, m.lugar)
    if (!w) continue
    if (!m.feita) ocupados.add(m.lugar.lugar ? `l:${m.lugar.lugar}` : `c:${m.lugar.chao}`)
    out.push({ id: m.id, nome: m.faixa, cor: m.cor, tipo: "missao", x: w.x, y: w.y, z: w.z, agora: m.agora, feita: m.feita, icone: m.icone ?? m.id })
  }
  const ap = o.apagada
  for (const l of Object.values(LUGARES)) {
    if (l.segredo || l.soChao || (l.soDisco && !disco)) continue
    // (notas 04/11) no disco a casa da D-Bee é só no deserto (o chão), não numa pista
    if (disco && (l.id === "casa-dbee" || l.id === "bar")) continue
    if (ocupados.has(`l:${l.id}`)) continue
    const p = posicao(M, `lugar:${l.id}`, l.area, l.u, l.lado, l.via)
    if (p.via < 0 || ap?.[p.via]) continue
    out.push({ id: l.id, nome: l.nome, cor: l.cor, tipo: l.id === "posto" ? "posto" : "lugar", ...noVia(M, p.via, p.u), via: p.via, u: p.u })
  }
  for (const lp of PAGINAS) {
    if (lp.lugar) continue
    const p = posicao(M, `pagina:${lp.id}`, lp.area, lp.u, lp.lado)
    if (p.via < 0 || ap?.[p.via]) continue
    out.push({ id: lp.id, nome: lp.nome, cor: lp.cor, tipo: "lugar", ...noVia(M, p.via, p.u), via: p.via, u: p.u })
  }
  {
    const p = posicao(M, "parque", PARQUE.area, PARQUE.u, PARQUE.lado)
    if (p.via >= 0 && !ap?.[p.via]) out.push({ id: "parque", nome: "o parque", cor: "#ff5b5b", tipo: "parque", ...noVia(M, p.via, p.u), via: p.via, u: p.u })
  }
  if (disco) for (const k of chaoNoMapa(o.fase, o.alvoChao ?? null)) {
    if (ocupados.has(`c:${k}`)) continue
    const c = CHAO_LUGARES[k]
    out.push({ id: `chao:${k}`, nome: c.nome, cor: c.cor, tipo: "chao", x: c.x, y: yChao(M, c.x, c.z), z: c.z })
  }
  return out
}
