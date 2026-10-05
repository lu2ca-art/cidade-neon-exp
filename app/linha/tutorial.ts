// O TUTORIAL (novo começo, fatia 2 — 05/10, LU2CA): depois da casa da D-Bee
// e da reta, a primeira volta na cidade é uma checklist na tela. Cada bloco
// começa com uma ligação curta dela (ligacoes.ts: dbee-a, dbee-b, dbee-c) e
// cada item marcado ganha um comentário dela. A primeira missão (o Mubarak,
// no bar) é o próprio tutorial: ninguém mais chama antes do bloco dele.
//
// Quase tudo é lido do save (não precisa marcar à mão): só "ouvir" e
// "missoes" ficam guardados em save.tutorial.

import type { Save } from "./estado"
import type { EstacaoId } from "./data"

export type ItemTutorial = "ouvir" | "missoes" | "falar" | "acordar" | "disco"

export interface Bloco { lig: "dbee-a" | "dbee-b" | "dbee-c"; itens: ItemTutorial[] }

export const BLOCOS: Bloco[] = [
  { lig: "dbee-a", itens: ["ouvir", "missoes"] },
  { lig: "dbee-b", itens: ["falar", "acordar"] },
  { lig: "dbee-c", itens: ["disco"] },
]

// a primeira missão da cidade (o tutorial anda junto com ela)
export const PRIMEIRA: EstacaoId = "copo"

export const ITENS: Record<ItemTutorial, { texto: string; dica: string; comenta: string }> = {
  ouvir: { texto: "dirigir até a 222 voltar", dica: "acelera e segue a pista", comenta: "ouviu? é ela" },
  missoes: { texto: "ver quem precisa de você", dica: "o botão MISSÕES, lá em cima", comenta: "isso. ninguém precisa rodar perdido aqui" },
  falar: { texto: "atender quem te chamar", dica: "a conversa chega na tela da kombi", comenta: "ele falou com vc. comigo ele nem atende mais" },
  acordar: { texto: "ir até lá e acordar essa pessoa", dica: "é só passar na frente do lugar", comenta: "um. a rede começou" },
  disco: { texto: "comprar um disco com o seu neon", dica: "celular → LOJA DE DISCOS", comenta: "agora sim. a kombi tem voz" },
}

export function feito(s: Save, i: ItemTutorial): boolean {
  const marcados = s.tutorial ?? []
  switch (i) {
    case "ouvir":
    case "missoes":
      return marcados.includes(i)
    case "falar":
      return s.objetos.length > 0 || Object.keys(s.pausas).some((k) => k !== "abertura")
    case "acordar":
      return s.objetos.length > 0
    case "disco":
      return (s.discos ?? []).length > 0
  }
}

// o tutorial vale pra quem começou pela casa da D-Bee e ainda não terminou
export function emTutorial(s: Save) {
  return !!s.casa && !(s.tutorial ?? []).includes("fim")
}

// o bloco em que a pessoa está (o primeiro com item faltando)
export function blocoAtual(s: Save): number {
  const i = BLOCOS.findIndex((b) => b.itens.some((it) => !feito(s, it)))
  return i < 0 ? BLOCOS.length : i
}

// a ligação do bloco já rolou (atendida ou não)?
export function ligou(s: Save, b: number) {
  return b < BLOCOS.length && s.ligacoes.includes(BLOCOS[b].lig)
}
