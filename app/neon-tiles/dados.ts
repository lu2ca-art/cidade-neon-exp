// GUITAR DRIVER — carreira, palcos, instrumentos e o save.
//
// Estrutura de Guitar Hero 1: você começa na garagem e vai subindo de
// palco com as estrelas que ganha; cada show paga uma grana; a grana compra
// instrumento e acabamento na loja. Instrumentos e artes ainda são
// placeholders (nome + cor + formato) — a camada visual de verdade entra
// depois, sem mexer na lógica.

export type Instrumento = "guitarra" | "baixo"

export interface Faixa {
  id: string
  titulo: string
  bpm: number
  audio: string
  cor: string
  acento: string
  abre?: string // data de liberação (T-21 / lançamento)
}

export const FAIXAS: Faixa[] = [
  { id: "chuva", titulo: "CHUVA", bpm: 95, audio: "/audio/tracks/222-chuva.mp3", cor: "#2fe8ff", acento: "#1a3fa0" },
  { id: "copo", titulo: "COPO AMERICANO", bpm: 110, audio: "/audio/tracks/222-copo-americano.mp3", cor: "#ff6a35", acento: "#ff3fb0" },
  { id: "dopamina", titulo: "DOPAMINA", bpm: 128, audio: "/audio/tracks/dopamina.mp3", cor: "#5dffa0", acento: "#7c3aed" },
  { id: "sexta", titulo: "SEXTA-FEIRA", bpm: 105, audio: "/audio/tracks/sextafeira.mp3", cor: "#ff3fb0", acento: "#ffc857" },
  { id: "ontem", titulo: "SABE ONTEM?", bpm: 100, audio: "/audio/tracks/sabe-ontem.mp3", cor: "#ffc857", acento: "#ff6a35", abre: "2026-09-30T00:00:00-03:00" },
  { id: "nectar", titulo: "NECTAR", bpm: 96, audio: "/audio/tracks/nectar.mp3", cor: "#b38cff", acento: "#2fe8ff", abre: "2026-10-14T00:00:00-03:00" },
]

export function faixaAberta(f: Faixa, agora = Date.now()) {
  return !f.abre || new Date(f.abre).getTime() <= agora
}

export interface Palco {
  id: string
  nome: string
  lugar: string
  estrelas: number // estrelas totais pra destravar
  cache: number // grana base por show
  publico: number // tamanho da galera (desenho)
  cor: string // luz dominante
  fachada: string // letreiro da cutscene
  fala: string // o dono do lugar, no fim
}

// bairros da cidade como palcos — a paleta segue os gases nobres
// (xenônio azul-violeta, neônio laranja-vermelho, argônio lavanda…)
export const PALCOS: Palco[] = [
  { id: "garagem", nome: "a garagem", lugar: "subúrbio xenom", estrelas: 0, cache: 40, publico: 6, cor: "#6d7bff", fachada: "GARAGEM · ENSAIO ABERTO", fala: "valeu por não quebrar nada. toma, pro busão" },
  { id: "bar", nome: "bar do copo", lugar: "centro", estrelas: 6, cache: 120, publico: 22, cor: "#ff6a35", fachada: "BAR DO COPO · HOJE: LU2CA", fala: "o bar nunca vendeu tanto copo americano. volta sexta" },
  { id: "laje", nome: "festa na laje", lugar: "morro", estrelas: 14, cache: 280, publico: 60, cor: "#b38cff", fachada: "LAJE 222 · ENTRADA 1 KG DE ALIMENTO", fala: "a vizinhança inteira subiu. isso aqui é seu" },
  { id: "casa", nome: "casa 222", lugar: "rua da linha", estrelas: 24, cache: 650, publico: 180, cor: "#e6f0ff", fachada: "CASA 222 · INGRESSOS ESGOTADOS", fala: "esgotou em 4 minutos. o núcleo tá de olho em vc" },
  { id: "arena", nome: "arena neon", lugar: "o festival", estrelas: 36, cache: 1600, publico: 600, cor: "#ff3fb0", fachada: "FESTIVAL CIDADE NEON · PALCO PRINCIPAL", fala: "a cidade inteira cantou junto. isso não se compra" },
]

export interface Modelo {
  id: string
  tipo: Instrumento
  nome: string
  preco: number
  corpo: string // cor do corpo (placeholder de arte)
  braco: string // cor do braço / trilho
  forma: "strato" | "jaguar" | "flying" | "semi" | "precision" | "jazz"
  bonus?: string
}

export const MODELOS: Modelo[] = [
  { id: "g-xenom", tipo: "guitarra", nome: "Xenom Standard", preco: 0, corpo: "#6d7bff", braco: "#1a1c3a", forma: "strato" },
  { id: "g-neon", tipo: "guitarra", nome: "Centro Jaguar", preco: 350, corpo: "#ff6a35", braco: "#2a1408", forma: "jaguar", bonus: "+10% grana" },
  { id: "g-flying", tipo: "guitarra", nome: "Túnel Flying", preco: 900, corpo: "#ff2d3d", braco: "#140608", forma: "flying", bonus: "modo NEON dura +2s" },
  { id: "g-semi", tipo: "guitarra", nome: "Semi Nectar", preco: 1800, corpo: "#b38cff", braco: "#1a0f2a", forma: "semi", bonus: "+20% grana" },
  { id: "b-argon", tipo: "baixo", nome: "Morro Precision", preco: 0, corpo: "#9b8cff", braco: "#161230", forma: "precision" },
  { id: "b-kripton", tipo: "baixo", nome: "Núcleo Jazz", preco: 500, corpo: "#e6f0ff", braco: "#20222e", forma: "jazz", bonus: "+10% grana" },
]

export const ACABAMENTOS = [
  { id: "liso", nome: "liso", preco: 0 },
  { id: "chuva", nome: "gotas de chuva", preco: 150 },
  { id: "adesivos", nome: "adesivos da linha 222", preco: 300 },
  { id: "holografico", nome: "holográfico", preco: 700 },
]

export interface Save {
  grana: number
  estrelas: Record<string, number> // `${palco}:${faixa}:${instrumento}` → 0..5
  recordes: Record<string, number> // mesma chave → pontos
  modelo: Record<Instrumento, string>
  acabamento: string
  possui: string[]
  instrumento: Instrumento
  dificuldade: "facil" | "medio" | "dificil"
  concluidas: string[] // faixas terminadas (pro funil antigo: 4 = confirmação 3)
}

export const SAVE_VAZIO: Save = {
  grana: 0,
  estrelas: {},
  recordes: {},
  modelo: { guitarra: "g-xenom", baixo: "b-argon" },
  acabamento: "liso",
  possui: ["g-xenom", "b-argon", "liso"],
  instrumento: "guitarra",
  dificuldade: "medio",
  concluidas: [],
}

const CHAVE = "cn-guitar-driver"

export function carregar(): Save {
  try {
    const r = localStorage.getItem(CHAVE)
    return r ? { ...SAVE_VAZIO, ...JSON.parse(r) } : SAVE_VAZIO
  } catch {
    return SAVE_VAZIO
  }
}

export function gravar(s: Save) {
  try { localStorage.setItem(CHAVE, JSON.stringify(s)) } catch {}
}

export function totalEstrelas(s: Save) {
  // conta a melhor nota de cada faixa em cada palco (qualquer instrumento)
  const melhor: Record<string, number> = {}
  for (const [k, v] of Object.entries(s.estrelas)) {
    const [p, f] = k.split(":")
    const kk = `${p}:${f}`
    melhor[kk] = Math.max(melhor[kk] ?? 0, v)
  }
  return Object.values(melhor).reduce((a, b) => a + b, 0)
}

export function estrelasPor(pct: number) {
  if (pct >= 0.95) return 5
  if (pct >= 0.85) return 4
  if (pct >= 0.7) return 3
  if (pct >= 0.5) return 2
  if (pct >= 0.25) return 1
  return 0
}
