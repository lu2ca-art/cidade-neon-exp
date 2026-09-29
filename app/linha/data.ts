// Linha 222 — a cidade como uma linha de metrô: 9 estações, uma por faixa
// do Vol.1. Cada estação tem alguém acordado (personagem), um objeto
// (Bloco 1 dos 18 objetos, ver vault/projetos/cidade-neon/narrativa-conceito.md)
// e uma prova curta dentro da própria conversa.
//
// Personagem ↔ faixa ↔ objeto seguem a tabela decidida pelo LU2CA em 10/set.
// Datas seguem o roadmap de 28/09 (cadência de 14 dias, sempre quarta).

export type EstacaoId =
  | "chuva" | "copo" | "dopamina" | "sexta" | "ontem"
  | "nectar" | "ojala" | "swav" | "rollercoaster"

export type ProvaId = "regar" | "sintonia" | "respira" | "espelho" | "caderno" | "violao"

export type ObjetoId =
  | "flor" | "mp3" | "relogio" | "espelho" | "caderno"
  | "violao" | "camisa" | "lanterna" | "guarda-chuva"

export interface Estacao {
  id: EstacaoId
  n: number
  faixa: string
  personagem: string
  objeto: ObjetoId
  objetoNome: string
  cor: string
  audio: string
  // meia-noite de Brasília do dia do lançamento; null = já lançada
  lancamento: string | null
  // par de palavras-chave (X × Y) da faixa
  luz: string
  sombra: string
  // uma linha à la Calvino — o bairro descrito como emoção
  cidade: string
  ouvir: string
  prova?: ProvaId
}

const busca = (faixa: string) =>
  `https://open.spotify.com/search/${encodeURIComponent(`LU2CA ${faixa}`)}`

export const ESTACOES: Estacao[] = [
  {
    id: "chuva", n: 1, faixa: "CHUVA", personagem: "Ella",
    objeto: "flor", objetoNome: "a flor", cor: "#2fe8ff",
    audio: "/audio/tracks/222-chuva.mp3", lancamento: null,
    luz: "leveza", sombra: "tormenta",
    cidade: "chove faz três anos e ninguém abre o guarda-chuva",
    ouvir: "https://ditto.fm/chuva-lu2ca", prova: "regar",
  },
  {
    id: "copo", n: 2, faixa: "Copo Americano", personagem: "Mubarak",
    objeto: "mp3", objetoNome: "o mp3", cor: "#ff6a35",
    audio: "/audio/tracks/222-copo-americano.mp3", lancamento: null,
    luz: "retomada", sombra: "repetição",
    cidade: "o bar fecha e abre no mesmo copo",
    ouvir: busca("Copo Americano"), prova: "sintonia",
  },
  {
    id: "dopamina", n: 3, faixa: "DopaminA", personagem: "Notti",
    objeto: "relogio", objetoNome: "o relógio", cor: "#5dffa0",
    audio: "/audio/tracks/dopamina.mp3", lancamento: null,
    luz: "presença", sombra: "ansiedade",
    cidade: "os relógios andam duas vezes mais rápido que as pessoas",
    ouvir: busca("Dopamina"), prova: "respira",
  },
  {
    id: "sexta", n: 4, faixa: "Sexta-Feira", personagem: "BBX",
    objeto: "espelho", objetoNome: "o espelho", cor: "#ff3fb0",
    audio: "/audio/tracks/sextafeira.mp3", lancamento: null,
    luz: "amor próprio", sombra: "fomo",
    cidade: "todo mundo tá num rolê que só existe no celular",
    ouvir: busca("Sexta-Feira"), prova: "espelho",
  },
  {
    id: "ontem", n: 5, faixa: "Sabe Ontem?", personagem: "Alohan",
    objeto: "caderno", objetoNome: "o caderno", cor: "#ffc857",
    audio: "/audio/tracks/sabe-ontem.mp3", lancamento: "2026-09-30T00:00:00-03:00",
    luz: "sonho", sombra: "frustração",
    cidade: "a gente sonhou alto aqui. aí amanheceu",
    ouvir: "https://ditto.fm/sabe-ontem", prova: "caderno",
  },
  {
    id: "nectar", n: 6, faixa: "Nectar", personagem: "LU2CA",
    objeto: "violao", objetoNome: "o violão", cor: "#b38cff",
    audio: "/audio/tracks/nectar.mp3", lancamento: "2026-10-14T00:00:00-03:00",
    luz: "aceitação", sombra: "vergonha",
    cidade: "o que sobra quando você para de ter vergonha de sentir",
    ouvir: busca("Nectar"), prova: "violao",
  },
  {
    id: "ojala", n: 7, faixa: "Ojalá", personagem: "D-Bee",
    objeto: "camisa", objetoNome: "a camisa da seleção", cor: "#3d7bff",
    audio: "/audio/tracks/ojala.mp3", lancamento: "2026-10-28T00:00:00-03:00",
    luz: "esperança", sombra: "destino",
    cidade: "carnaval fora de época, amor com data pra acabar",
    ouvir: busca("Ojalá"),
  },
  {
    id: "swav", n: 8, faixa: "Swav", personagem: "Tony Gordo",
    objeto: "lanterna", objetoNome: "a lanterna", cor: "#ffe14d",
    audio: "/audio/tracks/swav.mp3", lancamento: "2026-11-11T00:00:00-03:00",
    luz: "coragem", sombra: "repressão",
    cidade: "o apagão mais longo da história. alguém tá com uma lanterna",
    ouvir: busca("Swav"),
  },
  {
    id: "rollercoaster", n: 9, faixa: "Rollercoaster", personagem: "Nizzy",
    objeto: "guarda-chuva", objetoNome: "o guarda-chuva", cor: "#ff5b5b",
    audio: "/audio/tracks/rollercoaster.mp3", lancamento: "2026-11-25T00:00:00-03:00",
    luz: "recomeço", sombra: "medo",
    cidade: "a montanha-russa parou lá em cima e ninguém desce",
    ouvir: busca("Rollercoaster"),
  },
]

export const UNTITLED = "https://untitled.stream/buy/project/E9hOiyu7mwDoijTgQ3cwQ"

export function estacao(id: EstacaoId): Estacao {
  return ESTACOES.find((e) => e.id === id)!
}

export function lancada(e: Estacao, agora = Date.now()) {
  return !e.lancamento || new Date(e.lancamento).getTime() <= agora
}

// Toda estação pode ser visitada desde o início (ler, ouvir a prévia de quem
// já saiu). O que destrava por nível é a MISSÃO de cada uma — a prova que
// dá o objeto:
// - estações já lançadas + Sabe Ontem? (drop da semana): a partir de
//   "curioso", ou seja, depois de descobrir a própria estação no grupo
// - Nectar (estação do próprio LU2CA): prévia a partir de "ativista"
//   (4 objetos), antes da data — tier de antecipação, ver CLAUDE.md do repo
// - Ojalá, Swav, Rollercoaster: só no dia do lançamento. Até lá a estação
//   fica no escuro, com contagem e lembrete no calendário
export type Missao =
  | { ok: true }
  | { ok: false; motivo: "estacao" | "nivel" | "data"; quando?: string }

export function missao(e: Estacao, nivel: number, agora = Date.now()): Missao {
  if (!e.prova || (e.id !== "nectar" && e.id !== "ontem" && !lancada(e, agora)))
    return { ok: false, motivo: "data", quando: e.lancamento ?? undefined }
  if (nivel < 1) return { ok: false, motivo: "estacao" }
  if (e.id === "nectar" && nivel < 3 && !lancada(e, agora)) return { ok: false, motivo: "nivel" }
  return { ok: true }
}

export const NIVEIS = [
  { nome: "observador", como: "entra na cidade", libera: "o mapa inteiro, pra explorar" },
  { nome: "curioso", como: "descobre sua estação no grupo", libera: "as missões das estações abertas" },
  { nome: "cúmplice", como: "junta 2 objetos", libera: "o turbo do carro" },
  { nome: "ativista", como: "junta 4 objetos", libera: "a estação 6, do LU2CA, antes de todo mundo" },
  { nome: "nectar", como: "pega o violão", libera: "a cidade inteira, pra sempre" },
] as const

export function nivelDe(p: { estacao: EstacaoId | null; objetos: EstacaoId[] }) {
  if (p.objetos.includes("nectar")) return 4
  if (p.objetos.length >= 4) return 3
  if (p.objetos.length >= 2) return 2
  if (p.estacao) return 1
  return 0
}

export function dataCurta(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })
}
