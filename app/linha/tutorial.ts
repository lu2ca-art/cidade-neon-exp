// O TUTORIAL (05/10, LU2CA): depois da casa da D-Bee, uma checklist na tela.
// Cada item é um comando completo e vale 10 NEON. Começa com "Encha o tanque
// e dirija até a Cidade Neon" (a D-Bee liga no caminho e conta a história:
// ligacoes.ts, dbee-historia-1); chegando, a missão do bar é o tutorial.
//
// "tanque" e "drewboy" ficam guardados em save.tutorial; o resto é lido do save.

import type { Save } from "./estado"
import type { EstacaoId } from "./data"

export type ItemTutorial = "tanque" | "posto" | "mubarak" | "drewboy"

export interface Bloco { titulo: string; lig: "dbee-historia-1" | null; itens: ItemTutorial[] }

export const BLOCOS: Bloco[] = [
  // os primeiros passos (06/10, LU2CA); depois, a missão do Mubarak
  { titulo: "primeiros passos", lig: "dbee-historia-1", itens: ["tanque", "posto"] },
  { titulo: "missão · Mubarak", lig: null, itens: ["mubarak", "drewboy"] },
]

// a primeira missão da cidade (o tutorial anda junto com ela)
export const PRIMEIRA: EstacaoId = "copo"

// cada item marcado vale isso
export const NEON_POR_ITEM = 10

export const ITENS: Record<ItemTutorial, { texto: string; dica: string }> = {
  tanque: { texto: "Dirija até a Cidade Neon", dica: "a estrada leva até a cidade" },
  posto: { texto: "Encha o tanque no posto", dica: "o posto fica na Cidade Neon" },
  mubarak: { texto: "Resgate o Mubarak no bar", dica: "o bar fica na Cidade Neon" },
  drewboy: { texto: "Leve o Mubarak até a casa do Drewboy no subúrbio", dica: "o subúrbio fica embaixo da cidade" },
}

export function feito(s: Save, i: ItemTutorial): boolean {
  switch (i) {
    case "tanque":
    case "posto":
    case "drewboy":
      return (s.tutorial ?? []).includes(i)
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
