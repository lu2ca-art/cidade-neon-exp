// O TUTORIAL (05/10, LU2CA): depois da casa da D-Bee, uma checklist na tela.
// Cada item é um comando completo e vale 10 NEON. Começa com "Encha o tanque
// e dirija até a Cidade Neon" (a D-Bee liga no caminho e conta a história:
// ligacoes.ts, dbee-historia); chegando, a missão do bar é o tutorial.
//
// "tanque" fica guardado em save.tutorial; o resto é lido do save.

import type { Save } from "./estado"
import type { EstacaoId } from "./data"

export type ItemTutorial = "tanque" | "mubarak"

export interface Bloco { lig: "dbee-historia" | null; itens: ItemTutorial[] }

export const BLOCOS: Bloco[] = [
  { lig: "dbee-historia", itens: ["tanque"] },
  { lig: null, itens: ["mubarak"] },
]

// a primeira missão da cidade (o tutorial anda junto com ela)
export const PRIMEIRA: EstacaoId = "copo"

// cada item marcado vale isso
export const NEON_POR_ITEM = 10

export const ITENS: Record<ItemTutorial, { texto: string; dica: string }> = {
  tanque: { texto: "Encha o tanque e dirija até a Cidade Neon", dica: "a estrada leva até a cidade" },
  mubarak: { texto: "Resgate o Mubarak no bar", dica: "o bar fica na Cidade Neon" },
}

export function feito(s: Save, i: ItemTutorial): boolean {
  switch (i) {
    case "tanque":
      return (s.tutorial ?? []).includes("tanque")
    case "mubarak":
      return s.objetos.includes("copo")
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

// a ligação do bloco já rolou (atendida ou não)? Bloco sem ligação: sim
export function ligou(s: Save, b: number) {
  if (b >= BLOCOS.length) return true
  const lig = BLOCOS[b].lig
  return !lig || s.ligacoes.includes(lig)
}
