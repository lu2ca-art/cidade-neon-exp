// Progresso da Linha 222 — localStorage próprio (não mexe no funil antigo
// `cidade-neon-funnel-v3`, que continua servindo o /drive e o hub).

import type { EstacaoId } from "./data"
import { ROTEIROS, type ChatId, type Tom } from "./roteiros"
import { montarFio, type Perfil } from "./missoes"
import type { Flor } from "./recursos"
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
  | { k: "presente" }

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
  // o jardim (recurso da missão da Ella) e se ele é o papel de parede
  jardim: Flor[]
  papel: boolean
  // dicas que o jogo já deu (tutorial do rádio × toca-discos…)
  dicas: string[]
  // o violão que a D-Bee dá no fim da leitura NECTAR (abre o app VIOLÃO)
  violao: boolean
  // quantas vezes respondeu em cada tom (dormindo / acordando / acordado)
  tons: Record<Tom, number>
  // as relíquias do ritual do deserto que já nasceram (cenas.ts)
  reliquias: string[]
  // quantas vezes a pessoa saiu de um lugar com a escolha errada (o bar:
  // beber). A missão fica aberta e o mundo estranha até ela fazer a certa
  loops: Record<string, number>
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
  jardim: [],
  papel: false,
  dicas: [],
  violao: false,
  tons: { dormindo: 0, acordando: 0, acordado: 0 },
  reliquias: [],
  loops: {},
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
    const bruto = JSON.parse(raw)
    const s: Save = { ...VAZIO, ...bruto }
    // quem já tinha estação antes do fio existir ganha um, pelas respostas
    if (s.estacao && !s.fio.length) s.fio = montarFio(s.pesos, s.estacao, s.perfil)
    s.pausas = acertarPausas(s.pausas)
    // quem já tinha o violão pelo caminho antigo (missão do LU2CA) continua com ele
    // (só em save antigo, de antes do campo existir: depois do ep. 2 o
    // violão pode ter ficado no trem mesmo com a estação 6 feita)
    if (bruto.violao === undefined && s.objetos.includes("nectar")) s.violao = true
    return s
  } catch {
    return VAZIO
  }
}

// A conversa parada guarda o ÍNDICE do passo (a tarefa ou a chegada). Quando
// um roteiro ganha falas novas antes desse ponto, o índice antigo cai um
// pouco antes: anda até a próxima parada (tarefa/chegar) do roteiro.
function acertarPausas(p: Save["pausas"]): Save["pausas"] {
  const out = { ...p }
  for (const [id, pos] of Object.entries(p) as [ChatId, number][]) {
    const passos = ROTEIROS[id as keyof typeof ROTEIROS]?.passos
    if (!passos || pos === undefined) continue
    const parada = (i: number) => passos[i]?.t === "tarefa" || passos[i]?.t === "chegar" || passos[i]?.t === "lugar"
    if (parada(pos)) continue
    // a abertura só para na leitura NECTAR
    const leitura = passos.findIndex((x) => x.t === "leitura")
    if (id === "abertura" && leitura >= 0) { out[id] = leitura; continue }
    // missão que virou de LUGAR (04/10): a conversa só para no convite
    const lugar = passos.findIndex((x) => x.t === "lugar")
    if (lugar >= 0) { out[id] = lugar; continue }
    let i = pos
    while (i < passos.length && !parada(i)) i++
    if (i < passos.length) out[id] = i
  }
  return out
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

// começar do início de verdade: o progresso da Linha, a leitura NECTAR (a
// D-Bee pede de novo) e as preferências da Kombi (câmera, rádio/disco)
export function recomecar() {
  apagar()
  try {
    for (const k of ["cn-nectar-leitura", "cn-linha-fonte", "cn-linha-cam"]) localStorage.removeItem(k)
  } catch {}
  location.reload()
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
