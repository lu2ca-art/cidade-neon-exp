// B4TIDA estúdio (v2) — o modelo da música.
//
// Uma música tem faixas (instrumentos) e SEÇÕES (verso, refrão…); cada seção
// tem o seu tamanho em compassos e, pra cada faixa, os eventos tocados ali.
// O ARRANJO é a ordem das seções na música inteira. A posição é em
// semicolcheias (16 por compasso, 4/4).

export const PASSOS_POR_COMPASSO = 16
export const MAX_FAIXAS = 8

export type Inst = "bateria" | "baixo" | "teclas" | "guitarra" | "pad" | "voz"

export const INST_NOME: Record<Inst, string> = { bateria: "bateria", baixo: "baixo", teclas: "teclas", guitarra: "guitarra", pad: "pad", voz: "voz" }
export const INST_COR: Record<Inst, string> = { bateria: "#ff6b6b", baixo: "#00e5ff", teclas: "#a78bfa", guitarra: "#ffd93d", pad: "#ff3fb0", voz: "#4ade80" }

// os 8 pads da bateria (ordem dos pads na tela, de baixo pra cima como numa MPC)
export const PADS = ["bumbo", "caixa", "chimbal", "aberto", "palma", "perc", "tom", "prato"] as const
export type Pad = (typeof PADS)[number]
export const PAD_NOME: Record<Pad, string> = { bumbo: "bumbo", caixa: "caixa", chimbal: "chimbal", aberto: "chimbal aberto", palma: "palma", perc: "percussão", tom: "tom", prato: "prato" }

export interface Evento {
  p: number // posição (semicolcheia) dentro da seção
  n: number // bateria: índice do pad; melódico: nota MIDI
  d: number // duração em semicolcheias (bateria: 1)
  v: number // força 0..1
}

export interface ClipeVoz {
  chave: string // o áudio fica no IndexedDB (armazem.ts) com esta chave
  dur: number // segundos
}

export interface Faixa {
  id: string
  inst: Inst
  som: string // kit / timbre (sons.ts)
  vol: number
  pan: number // -1..1
  reverb: number
  delay: number
  mudo: boolean
  solo: boolean
  efeitoVoz?: "limpo" | "rua" | "radio" | "chuva"
}

export interface Secao {
  id: string
  nome: string
  compassos: 1 | 2 | 4 | 8
  eventos: Record<string, Evento[]> // por faixa
  voz: Record<string, ClipeVoz> // por faixa de voz
}

export interface Musica {
  versao: 2
  id: string
  nome: string
  bpm: number
  tom: number // 0 = Dó
  modo: "major" | "minor"
  swing: number // 0..0.6
  faixas: Faixa[]
  secoes: Secao[]
  arranjo: string[] // ids das seções na ordem da música
  criadaEm: number
  atualizadaEm: number
}

export const novoId = (p = "x") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export const NOMES_SECAO = ["intro", "verso", "refrão", "ponte", "final", "solo", "pré", "drop"]

export function novaSecao(nome = "verso", compassos: Secao["compassos"] = 2): Secao {
  return { id: novoId("s"), nome, compassos, eventos: {}, voz: {} }
}

export function novaFaixa(inst: Inst, som?: string): Faixa {
  const padrao: Record<Inst, string> = { bateria: "pack:chuva", baixo: "s:1", teclas: "s:1", guitarra: "s:0", pad: "s:0", voz: "voz" }
  return { id: novoId("f"), inst, som: som ?? padrao[inst], vol: inst === "pad" ? 0.65 : 0.85, pan: 0, reverb: inst === "pad" || inst === "voz" ? 0.2 : 0.06, delay: 0, mudo: false, solo: false, efeitoVoz: inst === "voz" ? "limpo" : undefined }
}

export function musicaVazia(): Musica {
  const s = novaSecao("verso", 2)
  return { versao: 2, id: novoId("m"), nome: "", bpm: 96, tom: 9, modo: "minor", swing: 0, faixas: [], secoes: [s], arranjo: [s.id], criadaEm: Date.now(), atualizadaEm: Date.now() }
}

export const passosDa = (s: Secao) => s.compassos * PASSOS_POR_COMPASSO
export const segPorPasso = (bpm: number) => 60 / bpm / 4

// faixas que soam agora (solo manda)
export function audiveis(m: Musica) {
  const temSolo = m.faixas.some((f) => f.solo)
  return m.faixas.filter((f) => !f.mudo && (!temSolo || f.solo))
}
