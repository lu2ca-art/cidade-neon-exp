// OS LUGARES da cidade (04/10): onde as coisas acontecem FORA do celular.
// Você chega de Kombi, encosta devagar na vaga do lugar, a câmera corta e a
// cena acontece ali (cenas.ts). O arco inteiro e os 14 lugares estão em
// ~/vault/universo/arco.md e lugares.md — aqui só os que já existem no jogo.
//
// Posição: u (metros) num circuito, do lado `lado` (1 = direita, por onde
// ficam as estações; -1 = esquerda). Na cidade neon a esquerda é o lado de
// dentro do anel (o subúrbio, a Linha 9), então os lugares de lá ficam à
// direita, nos vãos entre estações.

import type { EstacaoId } from "./data"
import type { FreqId } from "./radio"

export type LugarId = "bar" | "casa-drewboy" | "balada"

export interface Lugar {
  id: LugarId
  nome: string // "o bar"
  no: string // "no bar" (pra frase: "encosta no bar")
  letreiro: string // o neon da fachada
  area: FreqId
  u: number
  lado: 1 | -1
  cor: string // a cor do lugar (a da estação de quem mora/está lá)
  acento: string // detalhe (a cor pessoal: porta, toldo)
  // quem aparece na frente do lugar durante a cena
  gente: { quem: string; cor: string }[]
  dono?: EstacaoId
}

export const LUGARES: Record<LugarId, Lugar> = {
  bar: {
    id: "bar", nome: "o bar", no: "no bar", letreiro: "O COPO", area: "linha", u: 1530, lado: 1,
    cor: "#ff6a35", acento: "#ffc857", dono: "copo",
    gente: [{ quem: "Mubarak", cor: "#ff6a35" }, { quem: "ela", cor: "#ff3f7a" }],
  },
  "casa-drewboy": {
    id: "casa-drewboy", nome: "a casa do Drewboy", no: "na casa do Drewboy", letreiro: "AP 222", area: "suburbio", u: 560, lado: -1,
    cor: "#ff3fb0", acento: "#7fe8ff", dono: "sexta",
    gente: [{ quem: "Drewboy", cor: "#ff3fb0" }],
  },
  balada: {
    id: "balada", nome: "a balada", no: "na balada", letreiro: "SEXTA", area: "linha", u: 2185, lado: 1,
    cor: "#ff3fb0", acento: "#b38cff", dono: "sexta",
    gente: [{ quem: "Drewboy", cor: "#ff3fb0" }],
  },
}

export function lugar(id: LugarId) {
  return LUGARES[id]
}

// a vaga: um trecho da beira da pista, do lado do lugar
export const VAGA = 18 // m de comprimento
