// GUITAR DRIVER — carreira, palcos, instrumentos e o save.
//
// Estrutura de Guitar Hero 1: você começa na garagem e vai subindo de
// palco com as estrelas que ganha; cada show paga uma grana; a grana compra
// instrumento e acabamento na loja. Instrumentos e artes ainda são
// placeholders (nome + cor + formato) — a camada visual de verdade entra
// depois, sem mexer na lógica.

import type { Acabamento, Visual } from "./instrumentos"

export type Instrumento = "guitarra" | "baixo"

export interface Faixa {
  id: string
  titulo: string
  bpm: number
  audio: string
  cor: string
  acento: string
  abre?: string // data de liberação (T-21 / lançamento)
  t0?: number // o 1º tempo da grade (s)
  // as notas desenhadas das stems reais (public/gd/<id>.json) e o áudio em
  // camadas (o seu instrumento separado do resto): errou, a sua parte some
  gd?: boolean
}

export const FAIXAS: Faixa[] = [
  { id: "chuva", titulo: "CHUVA", bpm: 79, t0: 0.016, gd: true, audio: "/audio/tracks/222-chuva.mp3", cor: "#2fe8ff", acento: "#1a3fa0" },
  { id: "copo", titulo: "COPO AMERICANO", bpm: 80, t0: 0.063, gd: true, audio: "/audio/tracks/222-copo-americano.mp3", cor: "#ff6a35", acento: "#ff3fb0" },
  { id: "dopamina", titulo: "DOPAMINA", bpm: 125, t0: 0.06, gd: true, audio: "/audio/tracks/dopamina.mp3", cor: "#5dffa0", acento: "#7c3aed" },
  { id: "sexta", titulo: "SEXTA-FEIRA", bpm: 88, t0: 0.014, gd: true, audio: "/audio/tracks/sextafeira.mp3", cor: "#ff3fb0", acento: "#ffc857" },
  { id: "ontem", titulo: "SABE ONTEM?", bpm: 100, t0: 0.013, gd: true, audio: "/audio/tracks/sabe-ontem.mp3", cor: "#ffc857", acento: "#ff6a35", abre: "2026-09-30T00:00:00-03:00" },
  { id: "nectar", titulo: "NECTAR", bpm: 79, t0: 0.016, gd: true, audio: "/audio/tracks/nectar.mp3", cor: "#b38cff", acento: "#2fe8ff", abre: "2026-10-14T00:00:00-03:00" },
  // as próximas do Vol.1: notas prontas; o áudio em camadas sobe perto de cada lançamento
  { id: "ojala", titulo: "OJALÁ", bpm: 118, t0: 0.275, gd: true, audio: "/audio/tracks/ojala.mp3", cor: "#3d7bff", acento: "#ffc857", abre: "2026-10-28T00:00:00-03:00" },
  { id: "swav", titulo: "SWAV", bpm: 135, t0: 0.019, gd: true, audio: "/audio/tracks/swav.mp3", cor: "#ff9000", acento: "#2fe8ff", abre: "2026-11-11T00:00:00-03:00" },
  { id: "rollercoaster", titulo: "ROLLERCOASTER", bpm: 104, t0: 0.024, gd: true, audio: "/audio/tracks/rollercoaster.mp3", cor: "#ff3fb0", acento: "#b38cff", abre: "2026-11-25T00:00:00-03:00" },
]

export function faixaAberta(f: Faixa, agora = Date.now()) {
  return !f.abre || new Date(f.abre).getTime() <= agora
}

export interface Rival {
  nome: string
  habilidade: number // 0..1: chance de acertar cada nota
  faixa: string // a música do duelo
  ataquesPorMin: number
}

// o que o Guitar Driver lê do save do jogo (cn-linha-222) pra saber quais
// lugares você já conhece e o quanto a cidade te conhece
export interface SaveLinha { casa?: boolean; tutorial?: string[]; objetos?: string[]; reliquias?: string[]; popularidade?: number }

export interface Palco {
  id: string // o mesmo id do lugar no jogo (app/linha/lugares.ts)
  nome: string
  lugar: string
  setlist: string[] // ids das faixas deste palco
  rival: Rival | null // o dono da noite (duelo opcional)
  cache: number // NEON por show com 5 estrelas e casa cheia
  capacidade: number // quanta gente cabe
  cor: string // luz dominante
  fachada: string // letreiro da cutscene
  conhecer: string // o que fazer no jogo pra este palco abrir
  abre: (l: SaveLinha) => boolean
}

const fez = (l: SaveLinha, o: string) => !!l.objetos?.includes(o)
const tut = (l: SaveLinha, i: string) => !!l.tutorial?.includes(i)

// os palcos são os lugares da história: conforme você conhece um lugar na
// cidade, ele abre aqui, com um ângulo próprio (cenarios.ts)
export const PALCOS: Palco[] = [
  { id: "casa-dbee", nome: "a casa da d-bee", lugar: "o deserto", setlist: ["ontem", "chuva", "ojala"], rival: null, cache: 30, capacidade: 6, cor: "#ff9a5c", fachada: "A CASA NO DESERTO", conhecer: "a abertura do jogo", abre: (l) => !!l.casa },
  { id: "posto", nome: "o posto", lugar: "a beira da estrada", setlist: ["nectar", "copo"], rival: null, cache: 40, capacidade: 15, cor: "#ffd23a", fachada: "POSTO 24H", conhecer: "encher o tanque no posto", abre: (l) => tut(l, "posto") },
  { id: "bar", nome: "o bar", lugar: "o centro", setlist: ["copo", "ontem"], rival: { nome: "a banda cover da esquina", habilidade: 0.68, faixa: "copo", ataquesPorMin: 2.5 }, cache: 60, capacidade: 40, cor: "#ff6a35", fachada: "O COPO · HOJE: LU2CA", conhecer: "resgatar o Mubarak no bar", abre: (l) => tut(l, "mubarak") || fez(l, "copo") },
  { id: "casa-drewboy", nome: "a casa do drewboy", lugar: "o subúrbio", setlist: ["sexta", "chuva"], rival: { nome: "o vizinho do som alto", habilidade: 0.6, faixa: "sexta", ataquesPorMin: 2 }, cache: 50, capacidade: 12, cor: "#ff3fb0", fachada: "AP 222", conhecer: "levar o Mubarak até a casa do Drewboy", abre: (l) => tut(l, "drewboy") || fez(l, "sexta") },
  { id: "escondido", nome: "a casa da ella", lugar: "o subúrbio", setlist: ["chuva", "nectar"], rival: null, cache: 50, capacidade: 10, cor: "#5dffa0", fachada: "· · ·", conhecer: "a missão da Ella", abre: (l) => fez(l, "chuva") },
  { id: "balada", nome: "a balada", lugar: "o centro", setlist: ["sexta", "dopamina"], rival: { nome: "o DJ da casa", habilidade: 0.78, faixa: "dopamina", ataquesPorMin: 3 }, cache: 100, capacidade: 200, cor: "#b38cff", fachada: "SEXTA", conhecer: "a noite da balada com o Drewboy", abre: (l) => fez(l, "sexta") },
  { id: "topo", nome: "o terraço", lugar: "o mirante", setlist: ["dopamina", "swav"], rival: null, cache: 90, capacidade: 60, cor: "#2fe8ff", fachada: "TERRAÇO", conhecer: "a missão da Notti", abre: (l) => fez(l, "dopamina") },
  { id: "casa-shows", nome: "a casa de shows", lugar: "o túnel", setlist: ["ontem", "sexta", "copo"], rival: { nome: "a banda da casa", habilidade: 0.85, faixa: "ontem", ataquesPorMin: 3.5 }, cache: 150, capacidade: 300, cor: "#ffc857", fachada: "ONTEM", conhecer: "a missão do Alohan", abre: (l) => fez(l, "ontem") },
  { id: "plataforma", nome: "o vagão da linha 9", lugar: "a estação 6", setlist: ["nectar", "rollercoaster"], rival: null, cache: 120, capacidade: 30, cor: "#e6f0ff", fachada: "LINHA 9 · 6", conhecer: "o episódio do Nectar", abre: (l) => fez(l, "nectar") },
  { id: "beco", nome: "o beco", lugar: "o mirante", setlist: ["dopamina", "copo"], rival: null, cache: 80, capacidade: 25, cor: "#9b8cff", fachada: "", conhecer: "achar o beco cinza", abre: (l) => !!l.reliquias?.includes("relicario") },
  { id: "arena", nome: "a arena neon", lugar: "o festival", setlist: ["rollercoaster", "sexta", "copo", "chuva"], rival: { nome: "o headliner", habilidade: 0.92, faixa: "sexta", ataquesPorMin: 4 }, cache: 600, capacidade: 2000, cor: "#ff3fb0", fachada: "FESTIVAL CIDADE NEON", conhecer: "a cidade inteira te conhecer (popularidade 80)", abre: (l) => (l.popularidade ?? 0) >= 80 },
]

// a plateia vem da popularidade: no começo, uma pessoa (a multidão de 1)
export function publicoDe(p: Palco, popularidade: number) {
  return Math.max(1, Math.min(p.capacidade, Math.round(1 + Math.pow(Math.max(0, popularidade), 1.6) * 0.5)))
}

export type Dificuldade = "facil" | "medio" | "dificil" | "expert"
export const DIFICULDADES: { id: Dificuldade; nome: string; ouve: string }[] = [
  { id: "facil", nome: "fácil", ouve: "o pulso: onde a música bate" },
  { id: "medio", nome: "médio", ouve: "o groove: o balanço da parte" },
  { id: "dificil", nome: "difícil", ouve: "a frase: a nota sobe e desce, e os acordes" },
  { id: "expert", nome: "expert", ouve: "tudo: as notas fantasmas, os detalhes da gravação" },
]

// o que conta pros desafios (sai de cada show)
export interface Feito {
  palco: string
  faixa: string
  dificuldade: Dificuldade
  pct: number
  maxSeq: number
  estrelas: number
  neonUsos: number
  semErro: boolean
  terminou: boolean
}

export interface Desafio { id: string; palco: string; texto: string; neon: number; ok: (f: Feito) => boolean }
const ord = (d: Dificuldade) => ["facil", "medio", "dificil", "expert"].indexOf(d)
export const DESAFIOS: Desafio[] = [
  { id: "garagem-70", palco: "casa-drewboy", texto: "acerte 70% das notas de uma música", neon: 30, ok: (f) => f.terminou && f.pct >= 0.7 },
  { id: "garagem-25", palco: "casa-drewboy", texto: "faça 25 notas seguidas", neon: 30, ok: (f) => f.maxSeq >= 25 },
  { id: "garagem-neon", palco: "casa-drewboy", texto: "ligue o NEON numa música", neon: 40, ok: (f) => f.neonUsos >= 1 },
  { id: "bar-80", palco: "bar", texto: "acerte 80% das notas no médio ou acima", neon: 60, ok: (f) => f.terminou && f.pct >= 0.8 && ord(f.dificuldade) >= 1 },
  { id: "bar-50", palco: "bar", texto: "faça 50 notas seguidas", neon: 60, ok: (f) => f.maxSeq >= 50 },
  { id: "bar-4e", palco: "bar", texto: "tire 4 estrelas", neon: 80, ok: (f) => f.estrelas >= 4 },
  { id: "laje-90", palco: "balada", texto: "acerte 90% das notas", neon: 100, ok: (f) => f.terminou && f.pct >= 0.9 },
  { id: "laje-100", palco: "balada", texto: "faça 100 notas seguidas", neon: 120, ok: (f) => f.maxSeq >= 100 },
  { id: "laje-neon3", palco: "balada", texto: "ligue o NEON 3 vezes numa música", neon: 120, ok: (f) => f.neonUsos >= 3 },
  { id: "casa-dif", palco: "casa-shows", texto: "termine uma música no difícil", neon: 200, ok: (f) => f.terminou && ord(f.dificuldade) >= 2 },
  { id: "casa-150", palco: "casa-shows", texto: "faça 150 notas seguidas", neon: 200, ok: (f) => f.maxSeq >= 150 },
  { id: "casa-95", palco: "casa-shows", texto: "acerte 95% das notas", neon: 250, ok: (f) => f.terminou && f.pct >= 0.95 },
  { id: "arena-expert", palco: "arena", texto: "termine uma música no expert", neon: 400, ok: (f) => f.terminou && f.dificuldade === "expert" },
  { id: "arena-fc", palco: "arena", texto: "toque uma música inteira sem errar", neon: 500, ok: (f) => f.terminou && f.semErro },
  { id: "arena-5e", palco: "arena", texto: "tire 5 estrelas", neon: 400, ok: (f) => f.estrelas >= 5 },
]

export interface Modelo {
  id: string
  tipo: Instrumento
  nome: string
  preco: number // NEON
  descricao: string // o modelo real em que se inspira (sem marca)
  visual: Visual
  bonus?: string
  // cores pro palco e pra pista (derivadas do visual)
  corpo: string
  braco: string
}

const m = (id: string, tipo: Instrumento, nome: string, preco: number, descricao: string, visual: Visual, corpo: string, braco: string, bonus?: string): Modelo =>
  ({ id, tipo, nome, preco, descricao, visual, corpo, braco, bonus })

// os instrumentos: formatos clássicos de verdade, sem marca (instrumentos.ts desenha)
export const MODELOS: Modelo[] = [
  m("g-xenom", "guitarra", "Xenom Standard", 0, "corpo duplo-corte, 3 captadores simples, alavanca", { forma: "duplo", cor: "#c23b22", pintura: "sunburst", escudo: "branco", escala: "jacaranda", ferragem: "cromo", captadores: ["s", "s", "s"], ponte: "trem", cabeca: "seis", marcacao: "pontos" }, "#d0602a", "#2a160c"),
  m("g-linha", "guitarra", "Linha 9 Custom", 450, "corpo chapado de um corte, ponte de chapa, twang", { forma: "tele", cor: "#e8c070", pintura: "natural", escudo: "preto", escala: "maple", ferragem: "cromo", captadores: ["s", "s"], ponte: "tele", cabeca: "seis", marcacao: "pontos" }, "#e2b373", "#3a2a14", "+10% de cachê"),
  m("g-jaguar", "guitarra", "Centro Offset", 800, "corpo assimétrico de surf, escudo tartaruga", { forma: "offset", cor: "#5fb8a6", pintura: "solida", escudo: "tartaruga", escala: "jacaranda", ferragem: "cromo", captadores: ["s", "s"], ponte: "trem", cabeca: "seis", marcacao: "pontos" }, "#5fb8a6", "#1c2a28", "janela de acerto um pouco maior"),
  m("g-sg", "guitarra", "Laje SG", 1300, "corpo fino de chifres pontudos, 2 humbuckers", { forma: "sg", cor: "#7a0e12", pintura: "solida", escudo: "preto", escala: "jacaranda", ferragem: "cromo", captadores: ["h", "h"], ponte: "tune", cabeca: "tres", marcacao: "trapezios" }, "#8a1418", "#1a0a0a", "a galera enche mais rápido"),
  m("g-copo", "guitarra", "Copo Single-Cut", 1900, "single-cut de tampo arqueado, friso creme, 2 humbuckers", { forma: "single", cor: "#b0101c", pintura: "cereja", escudo: "perola", escala: "jacaranda", ferragem: "dourado", captadores: ["h", "h"], ponte: "tune", cabeca: "tres", marcacao: "trapezios", friso: true }, "#c0281a", "#1a0a06", "+20% de cachê"),
  m("g-flying", "guitarra", "Túnel V", 2400, "corpo em V, pra palco grande", { forma: "v", cor: "#e8e8ec", pintura: "solida", escudo: null, escala: "ebano", ferragem: "preto", captadores: ["h", "h"], ponte: "tune", cabeca: "tres", marcacao: "pontos" }, "#e8e8ec", "#101014", "modo NEON dura +2 s"),
  m("g-semi", "guitarra", "Semi Nectar", 3200, "semi-acústica de dois cortes, f-holes", { forma: "semi", cor: "#b38cff", pintura: "sunburst", escudo: "preto", escala: "jacaranda", ferragem: "dourado", captadores: ["h", "h"], ponte: "tune", cabeca: "tres", marcacao: "blocos", friso: true, fs: true }, "#d08a3a", "#1a0f06", "+30% de cachê"),
  m("b-morro", "baixo", "Morro Precision", 0, "o baixo clássico de 4 cordas, captador dividido", { forma: "pbass", cor: "#c23b22", pintura: "sunburst", escudo: "tartaruga", escala: "jacaranda", ferragem: "cromo", captadores: ["p"], ponte: "baixo", cabeca: "quatro", marcacao: "pontos" }, "#d0602a", "#2a160c"),
  m("b-nucleo", "baixo", "Núcleo Jazz", 700, "corpo offset, 2 captadores de barra, timbre que corta", { forma: "jbass", cor: "#f1ede0", pintura: "solida", escudo: "tartaruga", escala: "maple", ferragem: "cromo", captadores: ["j", "j"], ponte: "baixo", cabeca: "quatro", marcacao: "blocos" }, "#f1ede0", "#3a2a14", "+10% de cachê"),
  m("b-violino", "baixo", "Violino 222", 1500, "baixo de corpo de violino, leve e oco", { forma: "violino", cor: "#c2731f", pintura: "sunburst", escudo: null, escala: "jacaranda", ferragem: "cromo", captadores: ["mini", "mini"], ponte: "trapezio", cabeca: "duas", marcacao: "pontos", friso: true, fs: true }, "#c2731f", "#1a0f06", "a galera enche mais rápido"),
  m("b-passaro", "baixo", "Pássaro Noturno", 2600, "corpo comprido de asa, 2 humbuckers", { forma: "passaro", cor: "#101014", pintura: "solida", escudo: "branco", escala: "jacaranda", ferragem: "cromo", captadores: ["h", "h"], ponte: "baixo", cabeca: "quatro", marcacao: "pontos" }, "#202028", "#0c0c10", "modo NEON dura +2 s"),
]

export const ACABAMENTOS: { id: Acabamento; nome: string; preco: number }[] = [
  { id: "liso", nome: "de fábrica", preco: 0 },
  { id: "sunburst", nome: "sunburst", preco: 150 },
  { id: "natural", nome: "madeira natural", preco: 150 },
  { id: "preto", nome: "preto", preco: 120 },
  { id: "perola", nome: "branco pérola", preco: 120 },
  { id: "metalico", nome: "metálico", preco: 300 },
  { id: "chuva", nome: "gotas de chuva", preco: 250 },
  { id: "adesivos", nome: "adesivos da linha 9", preco: 350 },
  { id: "holografico", nome: "holográfico", preco: 900 },
]

export interface Save {
  estrelas: Record<string, number> // `${palco}:${faixa}:${instrumento}` → 0..5
  recordes: Record<string, number> // mesma chave → pontos
  modelo: Record<Instrumento, string>
  acabamentos: Record<string, Acabamento> // por modelo
  possui: string[] // modelos e acabamentos comprados (`acab:<modelo>:<acabamento>`)
  instrumento: Instrumento
  dificuldade: Dificuldade
  concluidas: string[] // faixas terminadas (pro funil antigo: 4 = confirmação 3)
  atraso: number | null // calibração (s): o quanto o som chega atrasado no ouvido
  desafios: string[] // desafios cumpridos
  batalhas: string[] // palcos em que ganhou o duelo
  vistos: string[] // cutscenes já vistas
}

export const SAVE_VAZIO: Save = {
  estrelas: {},
  recordes: {},
  modelo: { guitarra: "g-xenom", baixo: "b-morro" },
  acabamentos: {},
  possui: ["g-xenom", "b-morro"],
  instrumento: "guitarra",
  dificuldade: "medio",
  concluidas: [],
  atraso: null,
  desafios: [],
  batalhas: [],
  vistos: [],
}

// um palco abre quando você conhece o lugar no jogo
export function palcoAberto(l: SaveLinha, p: Palco) {
  return p.abre(l)
}

const CHAVE = "cn-guitar-driver"

export function carregar(): Save {
  try {
    const r = localStorage.getItem(CHAVE)
    if (!r) return SAVE_VAZIO
    const s = { ...SAVE_VAZIO, ...JSON.parse(r) } as Save
    // saves antigos: modelos que mudaram de nome voltam pro de fábrica
    for (const t of ["guitarra", "baixo"] as Instrumento[]) if (!MODELOS.some((m) => m.id === s.modelo[t])) s.modelo = { ...s.modelo, [t]: SAVE_VAZIO.modelo[t] }
    s.possui = Array.from(new Set([...SAVE_VAZIO.possui, ...(s.possui ?? [])]))
    if (!DIFICULDADES.some((d) => d.id === s.dificuldade)) s.dificuldade = "medio"
    return s
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
