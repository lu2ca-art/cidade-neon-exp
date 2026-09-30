// A programação da 222 FM. Uma rádio de verdade, não uma playlist em loop:
//
// - cada lugar tem uma "sacola" embaralhada: nenhuma música repete até
//   tocar todas; o ciclo seguinte reembaralha sem começar pela última
// - a posição fica guardada por lugar (localStorage): voltar pro subúrbio
//   continua de onde parou, não recomeça do começo
// - ESTREIA: quando você cumpre uma missão, a música daquela estação estreia
//   na 222.0 — é a próxima a tocar, com o locutor apresentando
// - VINHETA: entre uma música e outra, o locutor pirata fala (ou o Núcleo
//   invade). Rascunho: o LU2CA grava na voz dele depois

import { ESTACOES, estacao, type EstacaoId } from "./data"
import { FREQUENCIAS, faixasDe, type FreqId } from "./radio"

export interface Faixa { titulo: string; src: string }

interface Sacola { ordem: string[]; i: number }
interface Estado { sacolas: Partial<Record<FreqId, Sacola>>; estreias: string[]; n: number }

const CHAVE = "cn-linha-222-radio"
let estado: Estado | null = null

function ler(): Estado {
  if (estado) return estado
  try {
    const raw = localStorage.getItem(CHAVE)
    estado = raw ? { sacolas: {}, estreias: [], n: 0, ...JSON.parse(raw) } : { sacolas: {}, estreias: [], n: 0 }
  } catch {
    estado = { sacolas: {}, estreias: [], n: 0 }
  }
  return estado!
}
function gravar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)) } catch {}
}

function embaralhar(l: string[], evitarPrimeiro?: string) {
  const a = [...l]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  // a última do ciclo anterior só volta na segunda metade do novo
  const k = evitarPrimeiro ? a.indexOf(evitarPrimeiro) : -1
  if (a.length > 2 && k >= 0 && k < a.length / 2) {
    const j = a.length - 1 - Math.floor(Math.random() * Math.floor(a.length / 2));
    [a[k], a[j]] = [a[j], a[k]]
  }
  return a
}

export interface Proxima {
  faixa: Faixa
  estreia?: EstacaoId
  vinheta: { de: string; texto: string } | null
}

// a próxima música do lugar (e o que o locutor fala antes dela)
export function proxima(id: FreqId, objetos: EstacaoId[], ctx: Contexto): Proxima | null {
  const e = ler()
  let lista = faixasDe(FREQUENCIAS.find((f) => f.id === id)!, objetos, null)
  if (!lista.length) lista = faixasDe(FREQUENCIAS[0], objetos, null)
  if (!lista.length) return null
  const srcs = lista.map((f) => f.src)
  const achar = (src: string) => lista.find((f) => f.src === src)!

  // sacola: tira as que saíram do repertório, põe as novas logo em seguida
  let s = e.sacolas[id]
  if (!s) s = e.sacolas[id] = { ordem: embaralhar(srcs), i: 0 }
  s.ordem = s.ordem.filter((x) => srcs.includes(x))
  const novas = srcs.filter((x) => !s!.ordem.includes(x))
  if (novas.length) s.ordem.splice(Math.min(s.i, s.ordem.length), 0, ...embaralhar(novas))
  if (s.i >= s.ordem.length) {
    const ultima = s.ordem[s.ordem.length - 1]
    s.ordem = embaralhar(srcs, ultima)
    s.i = 0
  }

  // estreia: missão cumprida cuja música ainda não tocou na 222.0. Conta
  // como tocada neste ciclo (não repete logo depois)
  if (id === "linha") {
    const nova = objetos.find((o) => !e.estreias.includes(o) && srcs.includes(estacao(o).audio))
    if (nova) {
      e.estreias.push(nova)
      const src = estacao(nova).audio
      const k = s.ordem.indexOf(src)
      if (k >= s.i) { s.ordem.splice(k, 1); s.ordem.splice(s.i, 0, src); s.i++ }
      e.n++
      gravar()
      return { faixa: achar(src), estreia: nova, vinheta: vinhetaEstreia(nova) }
    }
  }

  const src = s.ordem[s.i++]
  e.n++
  gravar()
  // o locutor não fala toda vez: fala a cada 2 músicas, e o Núcleo invade de vez em quando
  const vinheta = e.n % 2 === 0 ? vinhetaDe(id, ctx, e.n) : null
  return { faixa: achar(src), vinheta }
}

// ── o que o locutor fala ────────────────────────────────────────────

export interface Contexto {
  nome: string
  objetos: EstacaoId[]
  carregando: string | null // "o cantil", "BBX de carona"…
}

const LUGAR: Record<FreqId, string[]> = {
  linha: [
    "222.0, a frequência que o núcleo esqueceu de desligar",
    "se vc tá ouvindo isso, vc ainda tá acordado",
    "chove na cidade neon. de novo. a gente toca por cima",
    "essa próxima vai pra quem tá dirigindo sem saber pra onde",
  ],
  suburbio: [
    "69.9, subúrbio xenom. aqui a festa é na garagem",
    "no subúrbio o sinal do núcleo chega fraco. aproveita",
  ],
  crypto: [
    "88.7, lá do mirante. sem voz, só o que sobra quando tira a letra",
    "daqui de cima a cidade parece calma. não é",
  ],
  live: [
    "111.3, a arena. gravado ao vivo, com erro e tudo",
    "o núcleo odeia ao vivo. não dá pra otimizar o que acontece uma vez só",
  ],
  full: [
    "222.4, a avenida. aqui toca o arquivo, as que ninguém lembra",
    "umas dessas o núcleo apagou o nome. a música ficou",
  ],
}

const NUCLEO = [
  "esta frequência não é licenciada. recomendamos retornar à sua playlist personalizada ✓",
  "detectamos emoção não otimizada neste veículo ✓",
  "sua atenção é importante para nós. por favor, volte ao feed ✓",
]

function vinhetaDe(id: FreqId, c: Contexto, n: number): { de: string; texto: string } {
  if (n % 7 === 0) return { de: "NÚCLEO", texto: NUCLEO[Math.floor(n / 7) % NUCLEO.length] }
  if (c.carregando && n % 3 === 0) return { de: "222 FM", texto: `atenção: kombi circulando com ${c.carregando}. se virem, não viram` }
  const l = LUGAR[id]
  return { de: "222 FM", texto: l[Math.floor(n / 2) % l.length] }
}

const ESTREIA: Partial<Record<EstacaoId, string>> = {
  chuva: "alguém regou a flor da estação 1. pela primeira vez na 222: CHUVA",
  copo: "o mp3 do copo americano pegou sinal. pela primeira vez na 222: Copo Americano",
  dopamina: "a estação 3 respirou. pela primeira vez na 222, inteira, sem pular: DopaminA",
  sexta: "o BBX saiu de casa. essa é dele: Sexta-Feira",
  ontem: "o caderno tá completo. pela primeira vez na 222: Sabe Ontem?",
  nectar: "o violão voltou pra estação 6. antes de todo mundo: Nectar",
}

function vinhetaEstreia(id: EstacaoId) {
  return { de: "222 FM", texto: ESTREIA[id] ?? `pela primeira vez na 222: ${estacao(id).faixa}` }
}

// se a música tocando agora é deste lugar (pra não trocar à toa ao voltar)
export function ehDoLugar(id: FreqId, src: string | null, objetos: EstacaoId[]) {
  if (!src) return false
  return faixasDe(FREQUENCIAS.find((f) => f.id === id)!, objetos, null).some((f) => f.src === src)
}

export const TODAS_FAIXAS: Faixa[] = [
  ...FREQUENCIAS.flatMap((f) => f.faixas),
  ...ESTACOES.map((e) => ({ titulo: e.faixa, src: e.audio })),
]
