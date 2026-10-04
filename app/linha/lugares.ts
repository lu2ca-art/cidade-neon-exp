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

export type LugarId = "bar" | "casa-drewboy" | "balada" | "escondido" | "topo" | "casa-shows" | "beco" | "posto" | "plataforma"

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
  // lugar SEM missão e sem marcador: ninguém vê. Só aparece depois de dar a
  // volta no circuito (quantas, depende do tom da pessoa) — o beco
  segredo?: true
}

export const LUGARES = {
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
} as Record<LugarId, Lugar>

// (fase 1 do arco: Ella, Notti, Alohan)
LUGARES.escondido = {
  id: "escondido", nome: "o lugar escondido", no: "no lugar escondido", letreiro: "· · ·", area: "suburbio", u: 1300, lado: -1,
  cor: "#2fe8ff", acento: "#5dffa0", dono: "chuva",
  gente: [{ quem: "Ella", cor: "#2fe8ff" }],
}
LUGARES.topo = {
  id: "topo", nome: "o terraço", no: "no terraço", letreiro: "TERRAÇO", area: "crypto", u: 950, lado: 1,
  cor: "#5dffa0", acento: "#e6f0ff", dono: "dopamina",
  gente: [{ quem: "Notti", cor: "#5dffa0" }],
}
LUGARES["casa-shows"] = {
  id: "casa-shows", nome: "a casa de shows", no: "na casa de shows", letreiro: "ONTEM", area: "live", u: 1250, lado: 1,
  cor: "#ffc857", acento: "#ff3fb0", dono: "ontem",
  gente: [{ quem: "Alohan", cor: "#ffc857" }],
}

// (ep. 2: o Nectar)
LUGARES.posto = {
  id: "posto", nome: "o posto", no: "no posto", letreiro: "POSTO 24H", area: "linha", u: 3110, lado: 1,
  cor: "#b38cff", acento: "#e6f0ff", dono: "nectar",
  gente: [{ quem: "LU2CA", cor: "#b38cff" }],
}
LUGARES.plataforma = {
  id: "plataforma", nome: "a estação 6 da Linha 9", no: "na estação 6", letreiro: "LINHA 9 · 6", area: "linha", u: 2293, lado: -1,
  cor: "#e6f0ff", acento: "#b38cff", dono: "nectar",
  gente: [{ quem: "policial", cor: "#e6f0ff" }],
}

// o beco dos três letreiros (arco, lugar 3): depois do terraço da Notti.
// As três ruas brilhantes dão a volta e devolvem pro começo; o beco cinza
// fica entre elas, e ninguém olha. A moradora de rua mora no fundo
LUGARES.beco = {
  id: "beco", nome: "o beco", no: "no beco", letreiro: "", area: "crypto", u: 1300, lado: -1,
  cor: "#8a8f9e", acento: "#5dffa0", dono: "dopamina", segredo: true,
  gente: [{ quem: "a moradora", cor: "#8a8f9e" }],
}

export function lugar(id: LugarId) {
  return LUGARES[id]
}

// a vaga: um trecho da beira da pista, do lado do lugar
export const VAGA = 18 // m de comprimento
