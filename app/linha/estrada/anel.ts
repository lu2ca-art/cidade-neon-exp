// AS LINHAS NO CHÃO DA ROTATÓRIA (T61b, LU2CA 30/10: "quem guia é uma linha
// no chão na cor da pista daquela entrada. A linha da próxima entrada fica
// sempre na faixa da direita; a da entrada seguinte a ela, na faixa do meio.
// Quando você passa uma entrada, a do meio vira a próxima e a linha dela vai
// para a direita").
//
// Andando no anel (mão única, o centro à esquerda), o asfalto tem até duas
// linhas de neon:
//   - a da PRÓXIMA saída, na faixa da direita (seguindo nela, você sai);
//   - a da saída SEGUINTE, na faixa do meio.
// Logo depois de passar uma saída, a linha do meio escorrega pra direita (ela
// virou a próxima) e a linha da nova seguinte acende no meio (degradê). Só
// contam as saídas abertas (a de uma pista apagada fica fechada, sem linha).
// Antes (T61) quem dizia isso eram as bordas e os guard rails; agora as bordas
// ficam na cor da torre e quem guia é o chão.
// A conta é pura (sem desenho): o Corrida.tsx monta as linhas UMA vez, numa
// malha só, quando a pista é montada (nada por quadro).

import { hexRgb } from "./distritos"
import type { AnelDisco } from "./mundoDisco"

export const ANEL_CFG = {
  degrade: 0.45, // fração do trecho entre duas saídas em que a linha escorrega do meio pra direita (logo depois de passar a saída)
  xDireita: 6.3, // o meio da faixa da direita (a pista tem 4 faixas: ±2,1 e ±6,3 m do eixo)
  xMeio: 2.1, // o meio da faixa do meio (a segunda, contando da direita)
  largura: 0.8, // m: a largura da linha no chão
}

type Saida = AnelDisco["saidas"][number]

// as saídas em volta de U (posição no anel, em metros): a última que passou, a próxima e a seguinte
export function saidasEmVolta(an: { L: number }, sds: Saida[], U: number) {
  const L = an.L
  const ord = [...sds].sort((a, b) => a.u - b.u)
  const u = ((U % L) + L) % L
  let k = ord.findIndex((s) => s.u > u)
  if (k < 0) k = 0
  const prox = ord[k], seg = ord[(k + 1) % ord.length], ant = ord[(k - 1 + ord.length) % ord.length]
  // quanto já andou desde a última saída (0 → 1 até a próxima)
  const de = ((u - ant.u) % L + L) % L, gap = ((prox.u - ant.u) % L + L) % L || L
  return { ant, prox, seg, f: Math.min(1, de / gap) }
}

export type LinhaGuia = { x: number; cor: [number, number, number]; brilho: number }

// as duas linhas no ponto U do anel: [a da próxima saída, a da seguinte]
// (null: sem linha ali). x: o deslocamento do eixo (+ = direita); brilho 0–1
export function linhasNoAnel(an: { L: number }, sds: Saida[], U: number): [LinhaGuia | null, LinhaGuia | null] {
  if (!sds.length) return [null, null]
  const { prox, seg, f } = saidasEmVolta(an, sds, U)
  // com uma saída só, ela já é a próxima desde sempre (fica na direita)
  if (sds.length === 1) return [{ x: ANEL_CFG.xDireita, cor: hexRgb(prox.cor), brilho: 1 }, null]
  const k = Math.min(1, f / ANEL_CFG.degrade), t = k * k * (3 - 2 * k)
  const proxima: LinhaGuia = { x: ANEL_CFG.xMeio + (ANEL_CFG.xDireita - ANEL_CFG.xMeio) * t, cor: hexRgb(prox.cor), brilho: 1 }
  const seguinte: LinhaGuia | null = t > 0.02 ? { x: ANEL_CFG.xMeio, cor: hexRgb(seg.cor), brilho: t } : null
  return [proxima, seguinte]
}
