// Progresso da Linha 222 — localStorage próprio (não mexe no funil antigo
// `cidade-neon-funnel-v3`, que continua servindo o /drive e o hub).

import type { EstacaoId } from "./data"
import type { ChatId } from "./roteiros"
import { montarFio, type Perfil } from "./missoes"
import type { Modo } from "./ligacoes"

export type Item =
  | { k: "msg"; texto: string; de?: string; eu?: boolean }
  | { k: "nucleo"; texto: string }
  | { k: "sistema"; texto: string }
  | { k: "audio"; src: string; titulo: string; de?: string }
  | { k: "video"; src: string; legenda?: string; de?: string }
  | { k: "voz"; fala: string; src?: string; de?: string }
  | { k: "loop"; titulo: string; video?: number; de?: string }
  | { k: "prova"; id: string; feita?: boolean; pulou?: boolean }
  | { k: "objeto"; estacao: EstacaoId; memoria?: number; extra?: string }
  | { k: "tarefa"; estacao: EstacaoId; feita?: boolean }
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
  // recompensas já dadas por minigames da versão anterior (NECTAR, B4TIDA…)
  legado: string[]
  // recordes do fliperama e da estrada
  melhorVolta: number
  jogados: Record<string, number>
  // o fio das missões (ordem que saiu do quiz) e o jeito de jogar
  fio: EstacaoId[]
  perfil: Perfil | null
  // coisas buscadas no mapa: "agua:0", "pagina:2"…
  itens: string[]
  // conversa parada esperando a busca: índice do passo "tarefa"
  pausas: Partial<Record<ChatId, number>>
  // o Núcleo: quantas invasões já rolaram e se derrubou a 222 (aí a cidade
  // fica cinza até religar a antena)
  nucleo: { invasoes: number; caido: boolean }
  // ligações de voz já feitas (atendidas ou recusadas) — ligacoes.ts
  ligacoes: string[]
  // o jeito que cada pessoa entrou em contato (ligação, texto, áudio) e o
  // último sorteado — o próximo nunca repete
  modos: Partial<Record<EstacaoId, Modo>>
  ultimoModo: Modo | null
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
  legado: [],
  melhorVolta: 0,
  jogados: {},
  fio: [],
  perfil: null,
  itens: [],
  pausas: {},
  nucleo: { invasoes: 0, caido: false },
  ligacoes: [],
  modos: {},
  // a D-Bee abre com ligação: a primeira pessoa vem de outro jeito
  ultimoModo: "ligacao",
}

export function carregar(): Save {
  if (typeof window === "undefined") return VAZIO
  try {
    const raw = localStorage.getItem(CHAVE)
    if (!raw) return VAZIO
    const s: Save = { ...VAZIO, ...JSON.parse(raw) }
    // quem já tinha estação antes do fio existir ganha um, pelas respostas
    if (s.estacao && !s.fio.length) s.fio = montarFio(s.pesos, s.estacao, s.perfil)
    return s
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
