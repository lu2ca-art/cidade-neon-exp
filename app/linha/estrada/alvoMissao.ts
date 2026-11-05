// (missões claras, 02/11, o dono: "mostra no mapa o lugar marcado, mas quando
// chego lá a missão não inicia") A FONTE ÚNICA DA POSIÇÃO DE UMA MISSÃO.
//
// Antes: o ícone do mapa e o feixe do drone ficavam na PISTA da faixa da missão
// (uDaMissao), enquanto o gatilho era o lugar dela (a vaga de um lugar da
// cidade, ou um ponto do chão do subúrbio). Dois pontos diferentes: chegava no
// ícone e nada acontecia. Agora o mapa, o drone, o GPS, o feixe-guia, a
// distância do Nexo e o gatilho de chegada leem o MESMO ponto, daqui.
//
// O ponto de um lugar da cidade é o meio da pista em frente à vaga (via, u): o
// mesmo que o GPS (destinoMundo) e o automático já usam. O do chão é o
// CHAO_LUGARES (o mesmo do gatilho do chão).

import { useSyncExternalStore } from "react"
import { posicao, type Mundo } from "./mundo"
import { PASSO } from "./pista"
import { LUGARES, type LugarId } from "../lugares"
import { CHAO_LUGARES, type LugarChao } from "../disco/historia"

export type LugarMissao = { lugar?: LugarId; chao?: LugarChao }
export interface PontoAlvo { x: number; y: number; z: number; via?: number; u?: number }

// ── os números da chegada (o designer ajusta aqui) ──
export const CHEGADA_MISSAO = {
  // raio (m, no plano) em volta do ponto que já conta como "chegou"
  lugar: 38, // um lugar da cidade (de Kombi, de patins, voando, em qualquer faixa)
  chao: 32, // um lugar do chão do subúrbio
  // diferença de altura máxima (m): lá em cima na pista não vale pro chão de baixo, e vice-versa
  alturaLugar: 26,
  alturaChao: 14,
  // perto assim (m) e ainda não começou: o Nexo diz o que fazer ali
  avisar: 160,
}

// o ponto de uma via (o mesmo cálculo do noMundo do mapa)
export function pontoVia(M: Mundo, via: number, u: number): PontoAlvo | null {
  const v = M.vias[via]
  if (!v) return null
  const i = v.fechada ? ((Math.round(u / PASSO) % v.n) + v.n) % v.n : Math.max(0, Math.min(v.n - 1, Math.round(u / PASSO)))
  return { x: v.px[i], y: v.py[i], z: v.pz[i], via, u }
}

// a altura do chão (o mundo do disco sabe; sem ele, 0)
const yChao = (M: Mundo, x: number, z: number) => (M as unknown as { chaoEm?: (x: number, z: number) => number }).chaoEm?.(x, z) ?? 0

// onde fica um lugar de missão no mundo (null = não tem ponto)
export function pontoDoAlvo(M: Mundo, l: LugarMissao | null | undefined): PontoAlvo | null {
  if (!l) return null
  if (l.chao) { const c = CHAO_LUGARES[l.chao]; return { x: c.x, y: yChao(M, c.x, c.z), z: c.z } }
  if (l.lugar) {
    const L = LUGARES[l.lugar]
    if (!L) return null
    const o = posicao(M, `lugar:${L.id}`, L.area, L.u, L.lado, L.via)
    if (o.via < 0) return null
    return pontoVia(M, o.via, o.u)
  }
  return null
}

// chegou? (x, y, z = onde o jogador está agora: a Kombi ou o patins)
export function chegouNoAlvo(l: LugarMissao, p: PontoAlvo, x: number, y: number, z: number): "sim" | "alto" | "baixo" | null {
  const r = l.chao ? CHEGADA_MISSAO.chao : CHEGADA_MISSAO.lugar
  if (Math.hypot(x - p.x, z - p.z) > r) return null
  const dy = y - p.y, lim = l.chao ? CHEGADA_MISSAO.alturaChao : CHEGADA_MISSAO.alturaLugar
  return dy > lim ? "alto" : dy < -lim ? "baixo" : "sim"
}

// ── O GUIA (o Nexo lê daqui): a distância até o alvo da missão e, perto dele
// sem ter começado, o que fazer ali. Uma loja fora do React: a Corrida escreve
// (de 300 em 300 ms) e só o pedacinho do notch se refaz, quando o texto muda ──
export type Guia = { metros: number; dica: string; vira: -1 | 0 | 1 }
let GUIA: Guia = { metros: -1, dica: "", vira: 0 }
const ouvintes = new Set<() => void>()
export function escreverGuia(metros: number, dica: string) {
  // de 10 em 10 m perto; de 50 em 50 longe (menos troca de texto)
  const m = metros < 0 ? -1 : metros < 300 ? Math.round(metros / 10) * 10 : Math.round(metros / 50) * 50
  if (m === GUIA.metros && dica === GUIA.dica) return
  GUIA = { metros: m, dica, vira: GUIA.vira }
  ouvintes.forEach((f) => f())
}
// (05/11) sem o cartão de GPS: a setinha da próxima curva (o Gps escreve; 0 = reto)
export function escreverVira(lado: number) {
  const v = (lado > 0 ? 1 : lado < 0 ? -1 : 0) as Guia["vira"]
  if (v === GUIA.vira) return
  GUIA = { ...GUIA, vira: v }
  ouvintes.forEach((f) => f())
}
// (trilha de pedras) quem olha de fora do React (de tempos em tempos) lê direto
export const lerGuia = (): Guia => GUIA
export function useGuia(): Guia {
  return useSyncExternalStore((f) => { ouvintes.add(f); return () => { ouvintes.delete(f) } }, () => GUIA, () => GUIA)
}
export const textoMetros = (m: number) => (m < 0 ? "" : m <= 30 ? "aqui" : m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${m} m`)
