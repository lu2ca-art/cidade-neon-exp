// OS SONS DA FEIRA (nossos, sintetizados, pelo mesmo mestre do jogo): cada legume
// tem o seu estalo, a faca bate na tábua e o desconto sobe num degrau de nota.

import { bip, ruido } from "./pecas/sons"
import type { ItemFeiraId } from "./feira"

export function somCorte(id: ItemFeiraId) {
  // o toc da faca na tábua, depois do legume
  bip(170, 0.05, "square", 0.07, 0.035, 95)
  if (id === "cenoura") { ruido(0.05, 0.42, 0, 9000); bip(2300, 0.03, "square", 0.05, 0, 900); bip(240, 0.06, "triangle", 0.18, 0.005, 110) }
  else if (id === "pimentao") { ruido(0.07, 0.3, 0, 5800); bip(540, 0.1, "triangle", 0.16, 0, 240) }
  else if (id === "abobrinha") { ruido(0.09, 0.32, 0, 2800); ruido(0.05, 0.16, 0.022, 7000) }
  else { ruido(0.06, 0.22, 0, 1700); bip(320, 0.07, "sine", 0.15, 0, 170) }
}
// o desconto: um degrau por corte naquele item
const DEGRAUS = [392, 440, 494, 587, 659, 784]
export function somDesconto(nivel: number) {
  const f = DEGRAUS[Math.max(0, Math.min(DEGRAUS.length - 1, nivel - 1))]
  bip(f, 0.1, "triangle", 0.09)
  bip(f * 2, 0.08, "sine", 0.045, 0.02)
}
// fechou a conta: a campainha do caixa e as moedas
export function somPagar() {
  bip(1047, 0.28, "triangle", 0.13)
  bip(1319, 0.28, "triangle", 0.1, 0.09)
  for (let k = 0; k < 5; k++) ruido(0.03, 0.1, 0.17 + k * 0.05, 8000)
}
