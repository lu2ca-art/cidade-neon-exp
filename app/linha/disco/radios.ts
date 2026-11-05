// AS DUAS RÁDIOS (05/11; bíblia §6 e §9; docs/radios.md). O dono: "no subúrbio pega
// a rádio do subúrbio, que fala sobre as coisas que acontecem no subúrbio — o gancho
// pras missões do subúrbio. Na cidade toca a Rádio Cidade Neon (por enquanto só as
// faixas do volume 1), que leva pras missões da cidade." E: "a rádio tem que ser
// algo mais livre, toca nos túneis e na cidade."
//
// - RÁDIO XENOM (a 69.9, FreqId "suburbio"): subúrbio, túneis e deserto. Toca o que
//   NÃO é do vol. 1 (o catálogo antigo, o arquivo, os discos de domínio público) e o
//   locutor fala entre as músicas (disco/vinhetasXenom.ts)
// - RÁDIO CIDADE NEON (a 222.0, FreqId "linha"): na cidade. Só o vol. 1 (a completa
//   onde já tem voz, o instrumental onde não), em ordem de álbum embaralhada de leve.
//   Antes da faixa de uma missão disponível, uma linha curta leva pra ela
// - a estação muda sozinha com a zona do som (radioAntiga.ts), com uma folga pra não
//   picotar na borda, e troca suave: chiado de sintonia, a música sai e a outra entra
//   em fade. O jogador ainda troca à mão (o menu da rádio): vale até a próxima zona
// - a faixa da rua (a regra da música contínua) segue por baixo; rádio ligada manda.
//   Na cidade, entrar numa rua com a Cidade Neon ligada PEDE a faixa da rua: ela é a
//   próxima da rádio (não corta a que está tocando)
//
// Desempenho: nada por quadro. A zona só chama quando muda; o resto roda na troca de música.

import { PISTAS, faixaDaPista, type PistaId } from "../estrada/pistas"
import { luzDasPistas, pistasFeitas } from "../estrada/atos"
import type { EstacaoId } from "../data"
import { ARQUIVO, FREQUENCIAS, VINIS, type FreqId } from "../radio"
import { chiadoCurto, fonteSom, player } from "../som"
import type { HistoriaDisco } from "./historia"
import { MISSOES13, disponiveis, feita13, normalizarMissao, type MissaoId } from "./portas"
import { aoMudarZona, type ZonaSom } from "./radioAntiga"
import { LOCUTOR_XENOM, VINHETAS_XENOM, type VinhetaXenom } from "./vinhetasXenom"

export type EstacaoRadio = "xenom" | "cidade"
export interface FaixaRadio { titulo: string; src: string; pista?: PistaId }
export interface VinhetaRadio { de: string; texto: string; audio: string | null; cor: string }

export const ESTACOES_RADIO: Record<EstacaoRadio, { freq: FreqId; nome: string; cor: string }> = {
  xenom: { freq: "suburbio", nome: "RÁDIO XENOM", cor: "#ff2d78" },
  cidade: { freq: "linha", nome: "RÁDIO CIDADE NEON", cor: "#2fe8ff" },
}
export const estacaoDaZona = (z: ZonaSom): EstacaoRadio => (z === "cidade" ? "cidade" : "xenom")
export const estacaoDaFreq = (f: FreqId | null | undefined): EstacaoRadio | null =>
  f === "suburbio" ? "xenom" : f === "linha" ? "cidade" : null

// ── o repertório ──
// Cidade Neon: o vol. 1, na ordem do álbum (PISTAS), a completa se a voz já saiu
export function faixasDaEstacao(e: EstacaoRadio, agora = Date.now()): FaixaRadio[] {
  if (e === "cidade") {
    return PISTAS.map((p) => {
      const src = faixaDaPista(p, agora)
      return { titulo: src === p.inst ? `${p.faixa} · inst` : p.faixa, src, pista: p.id }
    }).filter((f) => !!f.src)
  }
  // Xenom: tudo que já existe no jogo e não é do vol. 1
  const sub = FREQUENCIAS.find((f) => f.id === "suburbio")?.faixas ?? []
  return [...sub, ...ARQUIVO, ...VINIS]
}

// ── a frequência agora (uma pro jogo inteiro: estrada, túneis, salas) ──
// começa na estação da última zona (o jogo volta de onde parou): sem chiado à toa ao abrir
const CHAVE_ZONA = "cn-radios-zona"
let freqAgora: FreqId = (() => {
  try { return typeof localStorage !== "undefined" && localStorage.getItem(CHAVE_ZONA) === "cidade" ? "linha" : "suburbio" } catch { return "suburbio" }
})()
const ouvintesFreq = new Set<(f: FreqId) => void>()
let pendente: ReturnType<typeof setTimeout> | null = null
const cancelarPendente = () => { if (pendente) { clearTimeout(pendente); pendente = null } }
export const radioFreq = {
  get: () => freqAgora,
  /** a pessoa trocou (o menu) ou a estrada sintonizou: vale até a próxima zona */
  set(f: FreqId) {
    if (f === freqAgora) return
    cancelarPendente()
    freqAgora = f
    ouvintesFreq.forEach((o) => o(f))
  },
  ouvir(o: (f: FreqId) => void) { ouvintesFreq.add(o); return () => { ouvintesFreq.delete(o) } },
}

// ── quem toca a próxima: a estrada quando está montada; senão a página ──
type Tocador = (f: FreqId, entrada: boolean) => void
const tocadores: Tocador[] = []
/** fundo = o tocador da página (fica embaixo de quem chegar, mesmo registrando depois) */
export function registrarTocador(t: Tocador, fundo = false) {
  if (fundo) tocadores.unshift(t); else tocadores.push(t)
  return () => { const i = tocadores.lastIndexOf(t); if (i >= 0) tocadores.splice(i, 1) }
}

// ── a troca pela zona ──
/** segundos numa zona nova antes de trocar a estação (a borda da cidade não picota) */
export const FOLGA_ZONA = 4
/** fade da troca (s): a música sai, o chiado passa, a outra entra */
export const FADE_TROCA = 0.45

function trocarPara(f: FreqId) {
  if (f === freqAgora) return
  freqAgora = f
  ouvintesFreq.forEach((o) => o(f))
  if (fonteSom.get() !== "radio") return
  chiadoCurto()
  player.volume(0, FADE_TROCA / 3)
  const n = player.tocadas
  setTimeout(() => tocadores[tocadores.length - 1]?.(f, true), FADE_TROCA * 1000)
  // (revisão 05/11) ninguém tocou nada (sem próxima, a 222 fora do ar, sem tocador):
  // a faixa de antes não fica a zero, volta. (+1 s: o locutor atrasa o play em 0,9 s)
  setTimeout(() => { if (player.tocadas === n) player.volume(1, 0.3) }, FADE_TROCA * 1000 + 1200)
}

let ligada = false
/** liga a troca por zona (uma vez; a página chama) */
export function ligarRadiosPorZona() {
  if (ligada) return () => {}
  ligada = true
  const sair = aoMudarZona((z, antes) => {
    cancelarPendente()
    const e = estacaoDaZona(z)
    if (antes === null || e !== estacaoDaZona(antes)) { try { localStorage.setItem(CHAVE_ZONA, e) } catch {} }
    const f = ESTACOES_RADIO[e].freq
    if (f === freqAgora) return
    if (antes === null) return trocarPara(f) // a primeira zona: na hora
    pendente = setTimeout(() => { pendente = null; trocarPara(f) }, FOLGA_ZONA * 1000)
  })
  return () => { ligada = false; cancelarPendente(); sair() }
}

// ── o que a rádio sabe do jogo (a página atualiza; as vinhetas leem) ──
interface Contexto { h: HistoriaDisco | null; objetos: EstacaoId[] }
let contexto: Contexto = { h: null, objetos: [] }
export function definirContextoRadio(c: Contexto) { contexto = c }

function missoesAgora(): { ativa: MissaoId | null; disp: MissaoId[]; feitas: MissaoId[] } {
  const h = contexto.h
  if (!h || (h.fase !== "carreira" && h.fase !== "livre")) return { ativa: null, disp: [], feitas: h?.feitas13 ?? [] }
  const a = normalizarMissao(h.missao)
  const ativa = a && !feita13(h, a) ? a : null
  const disp = disponiveis(h, luzDasPistas(pistasFeitas(contexto.objetos))).filter((id) => id !== ativa)
  return { ativa, disp, feitas: h.feitas13 ?? [] }
}

// ── a programação (a posição fica guardada: voltar continua de onde parou) ──
interface Estado { ordem: Partial<Record<EstacaoRadio, string[]>>; i: Partial<Record<EstacaoRadio, number>>; n: number; ultima: string | null }
const CHAVE = "cn-radios"
let est: Estado | null = null
function ler(): Estado {
  if (est) return est
  const vazio: Estado = { ordem: {}, i: {}, n: 0, ultima: null }
  try { const raw = localStorage.getItem(CHAVE); est = raw ? { ...vazio, ...JSON.parse(raw) } : vazio } catch { est = vazio }
  return est!
}
const gravar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(est)) } catch {} }

// a ordem do álbum embaralhada de leve: só vizinhas trocam de lugar (de vez em quando)
function albumLeve(l: string[]) {
  const a = [...l]
  for (let i = 0; i < a.length - 1; i++) if (Math.random() < 0.3) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; i++ }
  return a
}
function embaralhar(l: string[]) {
  const a = [...l]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

// o pedido da rua: entrou numa rua com a Cidade Neon ligada, a faixa dela é a próxima
let pedidoRua: PistaId | null = null
export function pedirFaixaDaRua(p: PistaId) {
  if (freqAgora !== "linha" || fonteSom.get() !== "radio") { pedidoRua = null; return }
  const f = faixasDaEstacao("cidade").find((x) => x.pista === p)
  pedidoRua = f && f.src !== player.src ? p : null
}

export interface ProximaRadio { faixa: FaixaRadio; vinheta: VinhetaRadio | null }

/** a próxima música da estação e o que o locutor fala antes dela */
export function proximaDaEstacao(e: EstacaoRadio): ProximaRadio | null {
  const lista = faixasDaEstacao(e)
  if (!lista.length) return null
  const s = ler()
  const srcs = lista.map((f) => f.src)
  const achar = (src: string) => lista.find((f) => f.src === src)!
  s.n++
  // o pedido da rua passa na frente (uma vez)
  if (e === "cidade" && pedidoRua) {
    const f = lista.find((x) => x.pista === pedidoRua)
    pedidoRua = null
    if (f && f.src !== s.ultima) {
      s.ultima = f.src
      gravar()
      return { faixa: f, vinheta: vinhetaCidade(f, s.n, true) }
    }
  }
  let ordem = (s.ordem[e] ?? []).filter((x) => srcs.includes(x))
  let i = s.i[e] ?? 0
  if (ordem.length !== srcs.length) { ordem = e === "cidade" ? albumLeve(srcs) : embaralhar(srcs); i = 0 }
  // não repete a última (o pedido da rua, a virada do ciclo)
  for (let k = 0; k < 2; k++) {
    if (i >= ordem.length) { ordem = e === "cidade" ? albumLeve(srcs) : embaralhar(srcs); i = 0 }
    if (ordem[i] === s.ultima && ordem.length > 1) { i++; continue }
    break
  }
  if (i >= ordem.length) i = 0
  const src = ordem[i]
  s.ordem[e] = ordem
  s.i[e] = i + 1
  s.ultima = src
  gravar()
  const faixa = achar(src)
  return { faixa, vinheta: e === "xenom" ? vinhetaXenom(s.n) : vinhetaCidade(faixa, s.n, false) }
}

/** a música tocando agora é desta estação? (pra não trocar à toa ao voltar) */
export function ehDaEstacao(e: EstacaoRadio, src: string | null) {
  return !!src && faixasDaEstacao(e).some((f) => f.src === src)
}

// ── o locutor ──
// Xenom: fala entre toda música. 2 de cada 3: a missão (a ativa, as disponíveis);
// a outra: o clima (ou a fase da história, ou o subúrbio comentando o que já foi feito)
const usadas: string[] = [] // as últimas que passaram (não repetir logo)
function vinhetaXenom(n: number): VinhetaRadio {
  const m = missoesAgora()
  const fase = contexto.h?.fase
  const cabe = (x: VinhetaXenom) => {
    if (x.fase) return x.fase === fase
    if (!x.missao) return false
    if (x.quando === "ativa") return x.missao === m.ativa
    if (x.quando === "disponivel") return m.disp.includes(x.missao)
    return m.feitas.includes(x.missao)
  }
  const ganchos = VINHETAS_XENOM.filter((x) => cabe(x) && x.quando !== "feita")
  // o subúrbio primeiro: a missão de lá antes da fofoca da cidade
  ganchos.sort((a, b) => peso(b, m.ativa) - peso(a, m.ativa))
  const resto = VINHETAS_XENOM.filter((x) => (!x.missao && !x.fase) || (x.quando === "feita" && cabe(x)))
  const pool = ganchos.length && n % 3 !== 0 ? ganchos.slice(0, 4) : resto
  const x = pool.find((y) => !usadas.includes(y.id)) ?? pool[n % pool.length]
  usadas.push(x.id)
  if (usadas.length > 6) usadas.shift()
  return { de: LOCUTOR_XENOM, texto: x.texto, audio: x.audio, cor: ESTACOES_RADIO.xenom.cor }
}
const peso = (x: VinhetaXenom, ativa: MissaoId | null) =>
  (x.fase ? 3 : 0) + (x.missao === ativa ? 2 : 0) + (x.missao && MISSOES13[x.missao].onde === "suburbio" ? 1 : 0)

// Cidade Neon (RASCUNHO): antes da faixa de uma missão que dá pra fazer agora, quem
// pede fala o porquê (o pedido da missão). Fora isso, o nome da rádio de vez em quando
const ID_CIDADE = [
  "rádio cidade neon. o vol. 1 inteiro, do jeito que ele saiu",
  "222.0, cidade neon. a rua toca, a gente acompanha",
  "rádio cidade neon. chove lá fora, a gente toca por cima",
]
function vinhetaCidade(f: FaixaRadio, n: number, daRua: boolean): VinhetaRadio | null {
  const de = ESTACOES_RADIO.cidade.nome, cor = ESTACOES_RADIO.cidade.cor
  const nome = f.titulo.replace(/ · inst$/, "")
  const m = missoesAgora()
  const id = f.pista ? (Object.keys(MISSOES13) as MissaoId[]).find((k) => MISSOES13[k].faixa === f.pista && MISSOES13[k].onde === "cidade") : undefined
  if (id && (id === m.ativa || m.disp.includes(id))) {
    const ms = MISSOES13[id]
    return { de, texto: `${nome}. ${ms.quem}: ${ms.pedido}`, audio: null, cor }
  }
  if (daRua) return { de, texto: `você entrou na rua dela. ${nome}`, audio: null, cor }
  return n % 4 === 0 ? { de, texto: ID_CIDADE[(n / 4) % ID_CIDADE.length], audio: null, cor } : null
}
