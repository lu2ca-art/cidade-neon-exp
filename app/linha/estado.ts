// Progresso da Linha 222 — localStorage próprio (não mexe no funil antigo
// `cidade-neon-funnel-v3`, que continua servindo o /drive e o hub).

import type { EstacaoId } from "./data"
import type { ChatId } from "./roteiros"

export type Item =
  | { k: "msg"; texto: string; de?: string; eu?: boolean }
  | { k: "nucleo"; texto: string }
  | { k: "sistema"; texto: string }
  | { k: "audio"; src: string; titulo: string; de?: string }
  | { k: "video"; src: string; legenda?: string; de?: string }
  | { k: "prova"; id: string; feita?: boolean; pulou?: boolean }
  | { k: "objeto"; estacao: EstacaoId }
  | { k: "revelacao"; estacao: EstacaoId }

export interface Save {
  nome: string
  estacao: EstacaoId | null
  pesos: Partial<Record<EstacaoId, number>>
  objetos: EstacaoId[]
  linha: string
  xp: number
  dias: string[]
  completos: ChatId[]
  logs: Partial<Record<ChatId, Item[]>>
  ecosVistos: EstacaoId[]
  recordes: Partial<Record<EstacaoId, number>>
  // sinal acumulado na estrada — destrava as frequências da rádio
  sinal: number
  freq: string
}

const CHAVE = "cn-linha-222"

export const VAZIO: Save = {
  nome: "",
  estacao: null,
  pesos: {},
  objetos: [],
  linha: "",
  xp: 0,
  dias: [],
  completos: [],
  logs: {},
  ecosVistos: [],
  recordes: {},
  sinal: 0,
  freq: "linha",
}

export function carregar(): Save {
  if (typeof window === "undefined") return VAZIO
  try {
    const raw = localStorage.getItem(CHAVE)
    if (!raw) return VAZIO
    return { ...VAZIO, ...JSON.parse(raw) }
  } catch {
    return VAZIO
  }
}

export function gravar(s: Save) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(s))
  } catch {}
}

export function apagar() {
  try {
    localStorage.removeItem(CHAVE)
  } catch {}
}

export function hoje() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

// dias seguidos acordado, contando até hoje (ou ontem, se ainda não voltou hoje)
export function sequencia(dias: string[]) {
  const set = new Set(dias)
  const d = new Date(`${hoje()}T12:00:00`)
  if (!set.has(hoje())) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(d.toLocaleDateString("sv-SE"))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
