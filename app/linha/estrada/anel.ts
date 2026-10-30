// AS BORDAS DA ROTATÓRIA (T61, item 4 da ordem combinada, LU2CA 21/10: "a
// face da direita da pista tem sempre a cor da próxima entrada e a da
// esquerda, a da próxima depois dela, alternando num degradê: o que era da
// esquerda passa pra direita, vira entrada, e aquela cor some").
//
// Na rotatória de cima (sem espiral, 29/10), andando no anel: a borda da
// direita mostra a cor da próxima saída; a da esquerda, a da saída seguinte.
// Logo depois de passar uma saída, as cores escorregam: a da esquerda vem pra
// direita e a da saída seguinte entra na esquerda (o degradê). Só contam as
// saídas abertas (a de uma pista apagada fica fechada, sem cor).
// A conta é pura (sem desenho): o Corrida.tsx pinta as bordas e os trilhos.

import { hexRgb } from "./distritos"
import type { AnelDisco } from "./mundoDisco"

export const ANEL_CFG = {
  degrade: 0.45, // fração do trecho entre duas saídas em que as cores escorregam (logo depois de passar a saída)
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

const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

// a cor da borda (lado +1 = direita, −1 = esquerda) no ponto U do anel
export function corNoAnel(an: { L: number }, sds: Saida[], U: number, lado: number): [number, number, number] | null {
  if (!sds.length) return null
  const { ant, prox, seg, f } = saidasEmVolta(an, sds, U)
  const k = Math.min(1, f / ANEL_CFG.degrade), t = k * k * (3 - 2 * k)
  // antes do degradê: a direita ainda é a que acabou de passar, a esquerda a próxima
  if (lado > 0) return mix(hexRgb(ant.cor), hexRgb(prox.cor), sds.length > 1 ? t : 1)
  return mix(hexRgb(prox.cor), hexRgb(seg.cor), sds.length > 1 ? t : 1)
}
