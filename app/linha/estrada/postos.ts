// As bombas de rua (LU2CA 14/10: "bombas espalhadas pelo mapa pra que o carro
// não fique sofrendo toda hora"). Além do posto do LU2CA, umas bombas
// simples na beira da pista: encosta, abastece, segue. Dados leves.

import type { FreqId } from "../radio"

export interface Bomba { id: string; area: FreqId; u: number; lado: 1 | -1 }

// longe das portas, dos canteiros, do parque e das bifurcações
export const BOMBAS: Bomba[] = [
  { id: "bomba-mirante", area: "crypto", u: 750, lado: 1 },
  { id: "bomba-arena", area: "live", u: 1110, lado: 1 },
  { id: "bomba-avenida", area: "full", u: 220, lado: 1 },
]

// chegando: de 90 m antes até 20 m depois (dá tempo de frear)
export function pertoDe(L: number, fechada: boolean, alvo: number, u: number) {
  let d = alvo - u
  if (fechada) d = ((d % L) + L * 1.5) % L - L / 2
  return d > -20 && d < 90
}
