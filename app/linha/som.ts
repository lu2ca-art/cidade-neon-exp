// Som da Linha 222 — um AudioContext só, criado no primeiro toque (política
// de autoplay). Tudo que toca música passa por um GainNode, porque no iOS
// HTMLMediaElement.volume é somente-leitura: sem o grafo, fade e ducking
// simplesmente não acontecem no celular.

import { TONS } from "./tons"
import { Trilha, aplicarFadeMinhoca, curvaDistorcao, curvaMinhoca, type CtxLike, type DepsTrilha, type NosFade } from "./disco/trilha"
import { track, type MusicSource } from "@/lib/analytics"
import { CROSSFADE, VOL_SEM_INST, albumComprado, comecaPelaCompleta, definirFaixaRua, marcarCompletaOuvida, type FaixaContinua } from "./disco/musicaContinua"

// (T40b) A MESA DE MIXAGEM (lib/mesa.ts): o AudioContext único do jogo, os 4
// canais (música, ambiente, efeitos, vozes), o volume geral, o mudo, a
// prioridade (a voz abaixa a música) e o limitador no fim. Aqui só se usa
import { CANAIS, VOLUMES, canal, definirVolume, mesaCtx, mudo as mudoMesa, registrarMusicaTocando, registrarSegurar, volumeEfetivo, vozAbaixa, type Canal, type CanalVolume } from "@/lib/mesa"
export { VOLUMES, definirVolume, CANAIS, type CanalVolume, type Canal }

let ctx: AudioContext | null = null
export function audioCtx(): AudioContext | null {
  ctx = mesaCtx()
  return ctx
}

// os efeitos (e o que não tem canal próprio) saem pelo volume dos efeitos
function saida(): AudioNode | null { return canal("efeitos") }
export const saidaEfeitos = saida
function saidaCanal(k: Canal): AudioNode | null { return canal(k) }
// (T40b) o vento, a chuva: o canal do ambiente
export const saidaAmbiente = () => canal("ambiente")
// (tambor, 22/10) quem sintetiza som fora daqui sai pelo mesmo mestre (respeita o mudo)
export function saidaSom(): AudioNode | null { return saida() }
// (T40) a trilha das missões sai pelo volume da música (respeita o mudo), mas
// SEM o abafo: o som da missão é o som do lugar, não vem "de outro cômodo"
export function saidaMusicaLimpa(): AudioNode | null { return saidaCanal("musica") }

// A MÚSICA ABAFADA (05/10, LU2CA): durante a missão (dentro de um lugar) e
// quando o telefone toca, o rádio e o toca-discos continuam, mais baixos e
// sem agudo, como se viessem de outro cômodo. Os dois passam por aqui
let abafoF: BiquadFilterNode | null = null
let abafoG: GainNode | null = null
function abafo(): AudioNode | null {
  const c = audioCtx()
  const out = saidaCanal("musica")
  if (!c || !out) return null
  if (!abafoF || !abafoG) {
    abafoF = c.createBiquadFilter()
    abafoF.type = "lowpass"
    abafoF.frequency.value = 20000
    abafoG = c.createGain()
    abafoF.connect(abafoG).connect(out)
  }
  return abafoF
}
let abafando = 0
// (LU2CA 19/10) um jogo aberto no holo: a música PARA (o jogo tem o som dele);
// fechou, ela volta de onde estava. A voz de um personagem só abafa
let silenciando = 0
// (T40) a Kombi cala porque o som de uma missão entrou: a música para, mas a
// trilha da missão (que também sai por aqui) segue
let silenciandoKombi = 0
// (trilha sonora, 05/11) o "duck" leve: uma cena, uma peça, a introdução de uma
// missão. A música segue no lugar (faz parte do cenário), só um pouco mais baixa
let abaixando = 0
const VOL_DUCK_LEVE = 0.7
// (tv do holo, 05/11) a TV do holo tocando um vídeo: a música do jogo (a pista,
// a rádio, o disco: tudo passa pelo abafo) vai a zero em fade e SEGUE andando
// por baixo (a música contínua não para nem perde o ponto); a TV pausou ou
// fechou, ela volta. Ver disco/TvHolo.tsx
let pelaTv = false
// (revisão 05/11) a voz do locutor da rádio (as vinhetas com áudio) cala junto com a
// música: a TV tocando e o fazer música (silenciar) zeram este ganho. As outras vozes
// (ligação, nota de voz, personagens) passam sempre
let vozLocutorG: GainNode | null = null
let vozEhLocutor = false
function aplicarLocutor() {
  const c = audioCtx()
  if (!c || !vozLocutorG) return
  const mudo = vozEhLocutor && (silenciando > 0 || pelaTv)
  vozLocutorG.gain.setTargetAtTime(mudo ? 0 : 1, c.currentTime, 0.2)
}
function aplicarAbafo() {
  aplicarLocutor()
  const c = audioCtx()
  if (!c || !abafo() || !abafoF || !abafoG) return
  const on = abafando > 0, mudo = silenciando > 0 || silenciandoKombi > 0 || pelaTv, leve = abaixando > 0
  abafoF.frequency.setTargetAtTime(on ? 650 : 20000, c.currentTime, on ? 0.2 : 0.5)
  abafoG.gain.setTargetAtTime(mudo ? 0 : on ? 0.4 : leve ? VOL_DUCK_LEVE : 1, c.currentTime, on || mudo || leve ? 0.2 : 0.5)
}
/** abaixa um pouco a música (sem abafar): a cena, a peça, a introdução da missão */
export function abaixarUmPouco(sim: boolean) {
  abaixando = Math.max(0, abaixando + (sim ? 1 : -1))
  aplicarAbafo()
}
/** a TV do holo tocando (true) ou parada/fechada (false): a música do jogo a zero, em fade */
export function calarPraTv(sim: boolean) {
  if (sim === pelaTv) return
  pelaTv = sim
  aplicarAbafo()
}
export function abafar(sim: boolean) {
  abafando = Math.max(0, abafando + (sim ? 1 : -1))
  aplicarAbafo()
}
// a onda da música que está saindo (a pista, a rádio ou o disco: tudo passa
// pelo abafo). O holo desenha a rádio com ela. false = nada tocando ainda
let ondaA: AnalyserNode | null = null
export function ondaMusica(buf: Uint8Array<ArrayBuffer>): boolean {
  const c = audioCtx()
  if (!c || !abafo() || !abafoG) return false
  if (!ondaA) {
    ondaA = c.createAnalyser()
    ondaA.fftSize = 256
    ondaA.smoothingTimeConstant = 0.5
    abafoG.connect(ondaA)
  }
  ondaA.getByteTimeDomainData(buf)
  return true
}
export function silenciarKombi(sim: boolean) {
  silenciandoKombi = Math.max(0, silenciandoKombi + (sim ? 1 : -1))
  pistaSom.segurar(silenciando > 0 || silenciandoKombi > 0)
  aplicarAbafo()
}
// (revisão 05/11) UMA MÚSICA POR VEZ: entrou algo com música própria (um jogo do holo,
// o Guitar Driver, a batida, o tambor, uma peça com a faixa dela ou no ritmo da rua),
// quem toca por fora do grafo e não dá pra calar (a TV do holo, o YouTube) fecha antes
const aoMusicaPropriaF = new Set<() => void>()
export function aoMusicaPropria(f: () => void) { aoMusicaPropriaF.add(f); return () => { aoMusicaPropriaF.delete(f) } }
export function musicaPropria() { aoMusicaPropriaF.forEach((f) => f()) }
export function silenciar(sim: boolean) {
  if (sim) musicaPropria()
  silenciando = Math.max(0, silenciando + (sim ? 1 : -1))
  pistaSom.segurar(silenciando > 0 || silenciandoKombi > 0)
  trilha.segurar(silenciando > 0)
  aplicarAbafo()
}
// (T40b) "nunca duas músicas": um app solto (o Guitar Driver, o fliperama) que
// toca a música dele segura a do jogo pela mesa
registrarSegurar(silenciar)

// ── A MÚSICA SÓ PARA PRA FAZER MÚSICA (trilha sonora, 05/11; bíblia 9) ──
// A batida, o Guitar Driver, o tambor e os instrumentos na casa da D-Bee: a
// música do jogo (a rádio, o toca-discos, a faixa da rua) some em fade e PAUSA
// (não fica andando muda); saiu, volta de onde estava. Conta quem pediu.
// Fora disso nada para: missão, peça, sala e cena só abaixam um pouco.
let fazendo = 0
let pausaFazer: ReturnType<typeof setTimeout> | null = null
const pausadosFazer = { radio: false, disco: false }
// (revisão 05/11) a pausa do fazer música já valeu (passou o fade): o que mandarem
// tocar agora (a troca de estação pela zona, a troca completa ⇄ instrumental, o
// próximo disco) fica pronto e parado, e entra junto quando ele sai
let musicaPausada = false
export function fazerMusica(sim: boolean) {
  const antes = fazendo
  fazendo = Math.max(0, fazendo + (sim ? 1 : -1))
  if (antes === 0 && fazendo > 0) {
    silenciar(true) // o fade (setTargetAtTime no grafo)
    if (pausaFazer) clearTimeout(pausaFazer)
    pausaFazer = setTimeout(() => {
      pausaFazer = null
      if (fazendo === 0) return
      musicaPausada = true
      if (player.tocando) { pausadosFazer.radio = true; player.pausar() }
      if (disco.tocando) { pausadosFazer.disco = true; disco.el?.pause() }
      pistaSom.pausarPraMusica()
    }, 900)
  } else if (antes > 0 && fazendo === 0) {
    if (pausaFazer) { clearTimeout(pausaFazer); pausaFazer = null }
    musicaPausada = false
    if (pausadosFazer.radio) { pausadosFazer.radio = false; player.retomar() }
    if (pausadosFazer.disco) { pausadosFazer.disco = false; disco.el?.play().catch(() => {}) }
    pistaSom.voltarDaMusica()
    silenciar(false)
  }
}
export const fazendoMusica = () => fazendo > 0
// o fliperama (lib/mesa) pergunta antes de tocar o laço dele
registrarMusicaTocando(() => fazendo === 0 && (player.tocando || disco.tocando || pistaSom.tocando))

// ── Ambiente ────────────────────────────────────────────────
// Sem ruído de fundo: o LU2CA pediu silêncio fora da música e do motor
// (a chuva sintetizada virou "ruído infernal"). As funções ficam como
// no-op pra quem ainda chama.
export function ligarChuva() {}
export function volumeChuva(_v: number, _seg = 0.8) {}

export function mudo(m: boolean) {
  audioCtx()
  mudoMesa(m)
}

// ── Notas ───────────────────────────────────────────────────
// As notas de interface (bolinhas da estrada, mensagens, provas) tocam a
// pentatônica do TOM DA MÚSICA que está tocando agora — detectado ao vivo
// (ver detector de tom lá embaixo). Sem música, fica em Ré menor.
// Pentatônica: qualquer sequência soa bem, ninguém "erra".

export interface Tom { tonica: number; modo: "maior" | "menor" }
const NOMES = ["Dó", "Dó#", "Ré", "Ré#", "Mi", "Fá", "Fá#", "Sol", "Sol#", "Lá", "Lá#", "Si"]
let tomAtual: Tom | null = null
export function tomDaMusica() { return tomAtual }
// (disco) a pista sabe o tom da faixa dela: as notas do jogo (anéis) afinam nele
export function definirTom(t: Tom) { tomAtual = t }
export function nomeDoTom(t: Tom) { return `${NOMES[t.tonica]} ${t.modo}` }

function notaNoTom(i: number) {
  const tom = tomAtual ?? { tonica: 2, modo: "menor" as const }
  const esc = tom.modo === "maior" ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10]
  const grau = ((i % 8) + 8) % 8
  let base = 60 + tom.tonica
  if (base > 66) base -= 12 // tônica entre Dó4 e Fá#4
  const midi = base + esc[grau % 5] + 12 * Math.floor(grau / 5)
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function gota(i: number) {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = "sine"
  o.frequency.value = notaNoTom(i)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(0.22, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 1.3)
}

// corda dedilhada (Karplus-Strong simplificado com buffer de ruído curto)
export function corda(freq: number, vol = 0.35) {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return
  const t = c.currentTime
  const dur = 2.4
  const n = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  const periodo = Math.max(2, Math.round(c.sampleRate / freq))
  for (let i = 0; i < periodo; i++) d[i] = Math.random() * 2 - 1
  for (let i = periodo; i < n; i++) d[i] = (d[i - periodo] + d[i - periodo + 1]) * 0.4985
  const src = c.createBufferSource()
  src.buffer = buf
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 3200
  const g = c.createGain()
  g.gain.value = vol
  src.connect(lp).connect(g).connect(out)
  src.start(t)
}

// Violão (Karplus-Strong de verdade): linha de atraso com afinação
// fracionária (allpass), ataque com posição da palheta, decaimento
// esticado nos graves e um corpo de madeira (dois picos de ressonância).
// Cada nota é calculada uma vez e guardada.
const notasViolao = new Map<number, AudioBuffer>()
export function bufferViolao(c: BaseAudioContext, freq: number) {
  const chave = Math.round(freq * 10)
  const pronto = notasViolao.get(chave)
  if (pronto) return pronto
  const sr = c.sampleRate
  const dur = Math.min(4, 1.6 + 220 / freq)
  const n = Math.floor(sr * dur)
  const buf = c.createBuffer(1, n, sr)
  const d = buf.getChannelData(0)
  const P = sr / freq - 0.5 // o filtro de média atrasa meia amostra
  const N = Math.floor(P)
  const frac = P - N
  const ap = (1 - frac) / (1 + frac) // allpass que acerta a fração
  // ruído de ataque, filtrado pela posição da palheta (13% da corda)
  const linha = new Float32Array(N + 1)
  const pal = Math.max(1, Math.round(N * 0.13))
  for (let i = 0; i <= N; i++) linha[i] = Math.random() * 2 - 1
  for (let i = N; i >= pal; i--) linha[i] -= linha[i - pal] * 0.9
  const S = Math.min(0.9985, 0.994 + freq / 40000) // grave sustenta mais
  let idx = 0
  let apX = 0
  let apY = 0
  for (let i = 0; i < n; i++) {
    const a0 = linha[idx]
    const a1 = linha[(idx + 1) % (N + 1)]
    const media = S * 0.5 * (a0 + a1)
    const y = ap * media + apX - ap * apY
    apX = media
    apY = y
    linha[idx] = y
    d[i] = a0
    idx = (idx + 1) % (N + 1)
  }
  // envelope: ataque de 3 ms, fim suave
  for (let i = 0; i < 132 && i < n; i++) d[i] *= i / 132
  for (let i = Math.floor(n * 0.85); i < n; i++) d[i] *= (n - i) / (n * 0.15)
  notasViolao.set(chave, buf)
  return buf
}

export function violao(freq: number, vol = 0.32, quando = 0) {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return
  const t = c.currentTime + quando
  const src = c.createBufferSource()
  src.buffer = bufferViolao(c, freq)
  // corpo do violão: ressonâncias de ar (~100 Hz) e do tampo (~220 Hz)
  const ar = c.createBiquadFilter()
  ar.type = "peaking"; ar.frequency.value = 105; ar.Q.value = 2.2; ar.gain.value = 5
  const tampo = c.createBiquadFilter()
  tampo.type = "peaking"; tampo.frequency.value = 230; tampo.Q.value = 1.6; tampo.gain.value = 3.5
  const brilho = c.createBiquadFilter()
  brilho.type = "lowpass"; brilho.frequency.value = 4200
  const g = c.createGain()
  g.gain.value = vol
  src.connect(ar).connect(tampo).connect(brilho).connect(g).connect(out)
  src.start(t)
}

export function drone(on: boolean, alvo = 0.12) {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return
  if (!droneNodes && on) {
    const g = c.createGain()
    g.gain.value = 0
    const lp = c.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 500
    const oscs = [146.83, 220, 293.66].map((f, i) => {
      const o = c.createOscillator()
      o.type = i === 0 ? "sine" : "triangle"
      o.frequency.value = f
      o.connect(lp)
      o.start()
      return o
    })
    lp.connect(g).connect(out)
    droneNodes = { g, lp, oscs }
  }
  if (!droneNodes) return
  droneNodes.g.gain.setTargetAtTime(on ? alvo : 0, c.currentTime, on ? 1.2 : 0.6)
  droneNodes.lp.frequency.setTargetAtTime(on ? 1400 : 400, c.currentTime, 1.5)
}
let droneNodes: { g: GainNode; lp: BiquadFilterNode; oscs: OscillatorNode[] } | null = null

export function pararDrone() {
  if (!droneNodes) return
  droneNodes.oscs.forEach((o) => { try { o.stop() } catch {} })
  droneNodes = null
}

// ── Estática (prova de sintonia) ───────────────────────────
export function estatica(v0 = 0.12) {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return null
  const src = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.35)
  src.buffer = buf
  src.loop = true
  const bp = c.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 1800
  bp.Q.value = 0.6
  const g = c.createGain()
  g.gain.value = v0
  src.connect(bp).connect(g).connect(out)
  src.start()
  return {
    volume: (v: number) => g.gain.setTargetAtTime(v, c.currentTime, 0.05),
    // gira o "dial": move a faixa de ruído (soa como procurar estação)
    sintonizar: (hz: number) => bp.frequency.setTargetAtTime(hz, c.currentTime, 0.04),
    parar: () => { try { src.stop() } catch {} },
  }
}

// dinheiro caiu na conta: uma moedinha, baixinho
export function moeda() {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return
  const t = c.currentTime
  ;[1568, 2093].forEach((f, i) => {
    const o = c.createOscillator()
    o.type = "triangle"
    o.frequency.value = f
    const g = c.createGain()
    g.gain.setValueAtTime(0, t + i * 0.07)
    g.gain.linearRampToValueAtTime(0.05, t + i * 0.07 + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.25)
    o.connect(g).connect(out)
    o.start(t + i * 0.07)
    o.stop(t + i * 0.07 + 0.3)
  })
}

// o vento do deserto (a abertura): ruído grave que sobe e desce devagar
export function vento(v0 = 0.16) {
  const c = audioCtx()
  const out = saidaAmbiente()
  if (!c || !out) return null
  const src = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate)
  const d = buf.getChannelData(0)
  let ult = 0
  for (let i = 0; i < d.length; i++) { ult = ult * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = ult * 6 }
  src.buffer = buf
  src.loop = true
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 520
  const g = c.createGain()
  g.gain.value = 0
  g.gain.setTargetAtTime(v0, c.currentTime, 1.5)
  // as rajadas: um LFO lento no volume
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.13
  const lg = c.createGain()
  lg.gain.value = v0 * 0.5
  lfo.connect(lg).connect(g.gain)
  src.connect(lp).connect(g).connect(out)
  src.start(); lfo.start()
  return {
    parar: () => { g.gain.setTargetAtTime(0, c.currentTime, 0.8); setTimeout(() => { try { src.stop(); lfo.stop() } catch {} }, 3000) },
  }
}

// chiado de dial entre uma música e outra (~1 s, varrendo a frequência)
export function chiadoCurto() {
  const e = estatica()
  if (!e) return
  e.volume(0.09)
  const t0 = Date.now()
  const iv = setInterval(() => {
    const k = (Date.now() - t0) / 1000
    e.sintonizar(600 + 2400 * Math.abs(Math.sin(k * 9)))
    if (k > 0.8) e.volume(0)
    if (k > 1.1) { clearInterval(iv); e.parar() }
  }, 40)
}

// troca de câmera (dentro ⇄ fora): um sopro de dial quase inaudível, sobe e
// desce junto com o fade da tela (~0,6 s)
export function chiadoCamera() {
  const e = estatica(0)
  if (!e) return
  e.volume(0.022)
  const t0 = Date.now()
  const iv = setInterval(() => {
    const k = (Date.now() - t0) / 1000
    e.sintonizar(900 + 1800 * Math.abs(Math.sin(k * 6)))
    if (k > 0.32) e.volume(0)
    if (k > 0.65) { clearInterval(iv); e.parar() }
  }, 40)
}

// ── Player único ────────────────────────────────────────────
// Um elemento <audio> por vez no jogo inteiro: nota de voz, faixa da prova,
// rádio. Tocar qualquer coisa pausa o que estava tocando.

type Ouvinte = (s: { src: string | null; tocando: boolean; t: number; dur: number }) => void

// ── Detector de tom ─────────────────────────────────────────
// Cromagrama ao vivo (energia por classe de nota, 80Hz–2kHz) com média
// móvel de ~4s, comparado com os perfis de Krumhansl-Kessler de maior e
// menor nas 12 tônicas. Troca de tom só quando o novo vence duas leituras
// seguidas (histerese), pra não ficar pulando no meio de uma frase.
const KK_MAIOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const KK_MENOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function pearson(a: ArrayLike<number>, b: number[], rot: number) {
  let ma = 0, mb = 0
  for (let i = 0; i < 12; i++) { ma += a[i]; mb += b[i] }
  ma /= 12
  mb /= 12
  let num = 0, da = 0, db = 0
  for (let i = 0; i < 12; i++) {
    const x = a[i] - ma
    const y = b[(i - rot + 12) % 12] - mb
    num += x * y
    da += x * x
    db += y * y
  }
  return num / (Math.sqrt(da * db) || 1)
}

class DetectorDeTom {
  private croma = new Float32Array(12)
  private buf: Float32Array<ArrayBuffer> | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private n = 0
  private candidato: string | null = null
  private votos = 0
  fixo = false

  constructor(private analyser: AnalyserNode, private sr: number) {}

  ligar() {
    if (this.timer) return
    this.buf ??= new Float32Array(this.analyser.frequencyBinCount)
    this.timer = setInterval(() => this.ler(), 200)
  }
  desligar() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
  // faixa nova: a memória esfria rápido pra acompanhar o tom novo
  esfriar(src: string) {
    for (let i = 0; i < 12; i++) this.croma[i] *= 0.25
    this.candidato = null
    this.n = 0
    const conhecido = TONS[src]
    this.fixo = !!conhecido
    if (conhecido) tomAtual = conhecido
  }

  private ler() {
    const buf = this.buf!
    this.analyser.getFloatFrequencyData(buf)
    const quadro = new Float32Array(12)
    const hz = this.sr / this.analyser.fftSize
    const k0 = Math.ceil(80 / hz)
    const k1 = Math.min(buf.length - 1, Math.floor(2000 / hz))
    let total = 0
    for (let k = k0; k <= k1; k++) {
      const db = buf[k]
      if (!isFinite(db) || db < -90) continue
      const mag = Math.pow(10, db / 20)
      const pc = ((Math.round(12 * Math.log2((k * hz) / 440)) + 69) % 12 + 12) % 12
      quadro[pc] += mag
      total += mag
    }
    if (total <= 0) return
    for (let i = 0; i < 12; i++) this.croma[i] = this.croma[i] * 0.975 + (quadro[i] / total) * 0.025
    // faixa conhecida: o tom vem da tabela (tons.ts); o detector só manda
    // no que não está lá
    if (this.fixo) return
    if (++this.n % 5 !== 0 || this.n < 20) return
    let melhor: Tom = { tonica: 0, modo: "maior" }
    let r = -Infinity
    for (let t = 0; t < 12; t++) {
      const rM = pearson(this.croma, KK_MAIOR, t)
      if (rM > r) { r = rM; melhor = { tonica: t, modo: "maior" } }
      const rm = pearson(this.croma, KK_MENOR, t)
      if (rm > r) { r = rm; melhor = { tonica: t, modo: "menor" } }
    }
    if (r < 0.35) return // leitura fraca: mantém o tom de antes
    const chave = `${melhor.tonica}${melhor.modo}`
    if (!tomAtual) { tomAtual = melhor; return }
    if (tomAtual.tonica === melhor.tonica && tomAtual.modo === melhor.modo) { this.candidato = null; return }
    if (this.candidato === chave) {
      if (++this.votos >= 3) { tomAtual = melhor; this.candidato = null; this.votos = 0 }
    } else { this.candidato = chave; this.votos = 1 }
  }
}

// ── Medição (PostHog) ───────────────────────────────────────
// Conta no próprio tocador, não em quem chama: toda música que COMEÇA A
// SOAR de verdade (evento "playing") vira music_play_started uma vez por
// faixa, e as faixas do LU2CA ainda marcam até onde foram ouvidas (25/50/
// 75/100%). É o passo "ouviu no jogo" do funil da mentoria.
const ehLu2ca = (src: string) => src.startsWith("/audio/tracks/")
const nomeDe = (src: string) => decodeURIComponent(src.split("/").pop() ?? src).replace(/\.mp3$/, "")
function medir(el: HTMLAudioElement, source: MusicSource) {
  let contada: string | null = null
  let marcos = new Set<number>()
  const atual = () => { try { return new URL(el.currentSrc || el.src).pathname } catch { return el.src } }
  el.addEventListener("playing", () => {
    if ((el.currentSrc || el.src).startsWith("data:")) return // o silêncio que destrava o deck no iPhone
    const src = atual()
    if (src === contada) return
    contada = src
    marcos = new Set()
    track("music_play_started", { track_id: src, track_name: nomeDe(src), source, place_id: "linha-222", lu2ca: ehLu2ca(src) })
  })
  el.addEventListener("timeupdate", () => {
    const src = atual()
    if (src !== contada || !ehLu2ca(src) || !el.duration) return
    const pct = (el.currentTime / el.duration) * 100
    for (const m of [25, 50, 75] as const) {
      if (pct >= m && !marcos.has(m)) { marcos.add(m); track("music_progress", { track_id: src, milestone: m, source, lu2ca: true }) }
    }
  })
  el.addEventListener("ended", () => {
    const src = atual()
    if (src === contada && ehLu2ca(src) && !marcos.has(100)) { marcos.add(100); track("music_progress", { track_id: src, milestone: 100, source, lu2ca: true }) }
    contada = null // a mesma faixa de novo (repetir) conta como outra vez
  })
}

// ── A RÁDIO ANTIGA (trilha sonora, 05/11; o dono: "desde quando ele chega do
// deserto no subúrbio Xenom, começa a rádio, com filtro de som de rádio antigo").
// No subúrbio a rádio soa como rádio velho: passa-banda (~300–3400 Hz), uma
// saturação leve e um chiado bem baixinho. Na cidade, limpa. Tudo no grafo do
// Web Audio (nada por quadro em JS): UM filtro (biquad passa-banda), um
// waveshaper e dois ganhos que trocam em fade (seco ⇄ molhado). Desligada, o
// caminho molhado sai do grafo (desempenho). Quem decide onde está: radioAntiga.ts
// (18/11, o dono) NO DESERTO, SINAL RUIM: a mesma rádio velha, mais estreita, com
// mais chiado e o sinal indo e voltando (dois osciladores lentos no ganho, no grafo)
const RADIO_ANTIGA = {
  centro: 1010, // Hz: o meio de 300–3400 (média geométrica)
  q: 0.45, // largo: ~3 oitavas
  ganho: 1.5, // o passa-banda come volume: compensa
  saturacao: 2.2, // a curva tanh (suave; 0 = sem)
  chiado: 0.014, // o volume do chiado (só com a rádio tocando)
  fade: 0.35, // constante de tempo da troca (s)
  // o sinal ruim (deserto)
  ruimCentro: 1250,
  ruimQ: 1.1,
  ruimChiado: 0.055,
  ruimFalha: 0.32, // quanto o sinal cai (0 = firme)
}
let ra: { c: AudioContext; src: AudioNode; seco: GainNode; filtro: BiquadFilterNode; molhado: GainNode; chiadoG: GainNode; falha: GainNode; chiado: AudioBufferSourceNode | null; ligado: boolean; solto: ReturnType<typeof setTimeout> | null } | null = null
let radioAntigaQuer: boolean | "ruim" = false
let bufChiado: AudioBuffer | null = null // o ruído do chiado: feito uma vez
function montarRadioAntiga(c: AudioContext, src: AudioNode, dst: AudioNode) {
  const seco = c.createGain()
  seco.gain.value = 1
  src.connect(seco).connect(dst)
  const filtro = c.createBiquadFilter()
  filtro.type = "bandpass"
  filtro.frequency.value = RADIO_ANTIGA.centro
  filtro.Q.value = RADIO_ANTIGA.q
  const shaper = c.createWaveShaper()
  const n = 512, curva = new Float32Array(n), k = RADIO_ANTIGA.saturacao
  for (let i = 0; i < n; i++) { const x = (i * 2) / (n - 1) - 1; curva[i] = Math.tanh(k * x) / Math.tanh(k) }
  shaper.curve = curva
  const molhado = c.createGain()
  molhado.gain.value = 0
  // o sinal que vai e volta: um ganho no meio, puxado por dois osciladores lentos
  const sinal = c.createGain()
  sinal.gain.value = 1
  filtro.connect(shaper).connect(sinal).connect(molhado).connect(dst)
  const falha = c.createGain()
  falha.gain.value = 0
  for (const hz of [0.13, 0.41]) { const o = c.createOscillator(); o.frequency.value = hz; o.connect(falha); o.start() }
  falha.connect(sinal.gain)
  const chiadoG = c.createGain()
  chiadoG.gain.value = 0
  chiadoG.connect(filtro)
  ra = { c, src, seco, filtro, molhado, chiadoG, falha, chiado: null, ligado: false, solto: null }
  aplicarRadioAntiga()
}
function aplicarRadioAntiga() {
  if (!ra) return
  const r = ra, t = r.c.currentTime, on = !!radioAntigaQuer, ruim = radioAntigaQuer === "ruim"
  r.filtro.frequency.setTargetAtTime(ruim ? RADIO_ANTIGA.ruimCentro : RADIO_ANTIGA.centro, t, RADIO_ANTIGA.fade)
  r.filtro.Q.setTargetAtTime(ruim ? RADIO_ANTIGA.ruimQ : RADIO_ANTIGA.q, t, RADIO_ANTIGA.fade)
  r.falha.gain.setTargetAtTime(ruim ? RADIO_ANTIGA.ruimFalha : 0, t, RADIO_ANTIGA.fade)
  if (on && !r.ligado) {
    r.ligado = true
    if (r.solto) { clearTimeout(r.solto); r.solto = null }
    try { r.src.connect(r.filtro) } catch {}
  }
  r.seco.gain.setTargetAtTime(on ? 0 : 1, t, RADIO_ANTIGA.fade)
  r.molhado.gain.setTargetAtTime(on ? RADIO_ANTIGA.ganho : 0, t, RADIO_ANTIGA.fade)
  // o chiado: só com a rádio no ar (um loop de 2 s de ruído, no relógio do áudio)
  const chia = on && player.tocando
  if (chia && !r.chiado) {
    if (!bufChiado) {
      const len = Math.floor(r.c.sampleRate * 2), d = (bufChiado = r.c.createBuffer(1, len, r.c.sampleRate)).getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    }
    const s = r.c.createBufferSource()
    s.buffer = bufChiado; s.loop = true
    s.connect(r.chiadoG); s.start()
    r.chiado = s
  }
  r.chiadoG.gain.setTargetAtTime(chia ? (ruim ? RADIO_ANTIGA.ruimChiado : RADIO_ANTIGA.chiado) : 0, t, 0.2)
  if (!chia && r.chiado) { const s = r.chiado; r.chiado = null; setTimeout(() => { try { s.stop(); s.disconnect() } catch {} }, 900) }
  if (!on && r.ligado) {
    if (r.solto) clearTimeout(r.solto)
    r.solto = setTimeout(() => { r.solto = null; if (!radioAntigaQuer && r.ligado) { r.ligado = false; try { r.src.disconnect(r.filtro) } catch {} } }, RADIO_ANTIGA.fade * 5000)
  }
}
/** no subúrbio e nos túneis (true) a rádio soa como rádio antigo; no deserto
 *  ("ruim") como rádio antigo com sinal ruim; na cidade (false), limpa.
 *  Barato: só mexe no grafo quando muda (pode chamar a cada quadro) */
export function radioAntiga(sim: boolean | "ruim") {
  if (sim === radioAntigaQuer) return
  radioAntigaQuer = sim
  aplicarRadioAntiga()
}

// (começo novo, 05/11) O PLAY QUE O NAVEGADOR BARROU não falha calado. No iPhone o
// primeiro play() fora de um toque (a rádio Xenom liga sozinha no quadro, ao chegar no
// subúrbio) é recusado: aí ele acontece no próximo toque/tecla do jogador; se falhar
// de novo, no seguinte. `ainda()` diz se aquele som ainda é o que devia tocar
const GESTOS_SOM = ["pointerdown", "touchend", "keydown"] as const
const armadosSom = new WeakSet<HTMLAudioElement>()
function armarNoGesto(el: HTMLAudioElement, ainda: () => boolean) {
  if (typeof window === "undefined" || armadosSom.has(el)) return
  armadosSom.add(el)
  const tenta = () => {
    for (const ev of GESTOS_SOM) window.removeEventListener(ev, tenta, true)
    armadosSom.delete(el)
    if (!ainda() || !el.paused) return
    try { void audioCtx()?.resume() } catch {}
    el.play().catch((e: { name?: string } | undefined) => { if (e?.name !== "AbortError") armarNoGesto(el, ainda) })
  }
  for (const ev of GESTOS_SOM) window.addEventListener(ev, tenta, true)
}
export function tocarOuNoGesto(el: HTMLAudioElement, ainda: () => boolean) {
  el.play().catch((e: { name?: string } | undefined) => { if (e?.name !== "AbortError") armarNoGesto(el, ainda) })
}

// (começo novo, 05/11) uma cena, peça ou sala aberta (a página marca): a rádio troca de
// faixa sem o chiado do dial e sem a vinheta na rádio (a vinheta é pulada)
export const somCena = { aberta: false }

class Player {
  el: HTMLAudioElement | null = null
  detector: DetectorDeTom | null = null
  gain: GainNode | null = null
  src: string | null = null
  ouvintes = new Set<Ouvinte>()
  private fontes = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()

  private garantir() {
    if (this.el) return this.el
    const el = new Audio()
    el.preload = "auto"
    el.crossOrigin = "anonymous"
    el.addEventListener("timeupdate", () => this.emitir())
    el.addEventListener("play", () => { this.detector?.ligar(); this.emitir(); aplicarRadioAntiga() })
    el.addEventListener("pause", () => { this.detector?.desligar(); this.emitir(); aplicarRadioAntiga() })
    el.addEventListener("ended", () => { this.aoFim?.(); this.emitir() })
    medir(el, "radio")
    const c = audioCtx()
    const out = saida()
    if (c && out) {
      try {
        const node = c.createMediaElementSource(el)
        this.fontes.set(el, node)
        this.gain = c.createGain()
        this.analyser = c.createAnalyser()
        this.analyser.fftSize = 256
        this.analyser.smoothingTimeConstant = 0.6
        node.connect(this.gain)
        // (trilha sonora, 05/11) a rádio passa pela RÁDIO ANTIGA (no subúrbio, o
        // filtro de rádio velho; na cidade, limpa) antes do abafo
        montarRadioAntiga(c, this.gain, abafo() ?? out)
        this.gain.connect(this.analyser)
        const ouvido = c.createAnalyser()
        ouvido.fftSize = 16384
        ouvido.smoothingTimeConstant = 0
        this.gain.connect(ouvido)
        this.detector = new DetectorDeTom(ouvido, c.sampleRate)
      } catch {}
    }
    this.el = el
    return el
  }

  aoFim: (() => void) | null = null
  analyser: AnalyserNode | null = null
  private dados = new Uint8Array(128)

  // energia dos graves (0–1) — as luzes da cidade pulsam com isso
  grave() {
    if (!this.analyser || !this.el || this.el.paused) return 0
    this.analyser.getByteFrequencyData(this.dados)
    let s = 0
    for (let i = 1; i < 7; i++) s += this.dados[i]
    return s / (6 * 255)
  }

  // entrada (s): a música entra em fade (a troca de estação, rádios.ts); 0 = direto
  /** quantas vezes tocar() foi chamado (a troca de estação confere se algo entrou) */
  tocadas = 0
  tocar(src: string, aoFim?: () => void, vol = 1, entrada = 0) {
    this.tocadas++
    const el = this.garantir()
    this.aoFim = aoFim ?? null
    if (this.src !== src) {
      this.detector?.esfriar(src)
      el.src = src
      this.src = src
    }
    if (this.gain && ctx) {
      const g = this.gain.gain, t = ctx.currentTime
      g.cancelScheduledValues(t)
      if (entrada > 0) { g.setValueAtTime(0, t); g.setTargetAtTime(vol, t, entrada / 3) }
      else g.setValueAtTime(vol, t)
    }
    if (musicaPausada) { pausadosFazer.radio = true; this.emitir(); return }
    tocarOuNoGesto(el, () => this.el === el && this.src === src && fonteAtual === "radio" && !musicaPausada)
  }

  // seg: a constante de tempo do fade (o padrão é quase na hora)
  volume(v: number, seg = 0.05) {
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(v, ctx.currentTime, seg)
    else if (this.el) this.el.volume = Math.max(0, Math.min(1, v))
  }

  // música lá embaixo enquanto alguém fala, e volta devagar depois. Conta
  // quem pediu (nota de voz, ligação inteira): só volta quando todos soltam.
  // (T40b) agora é a prioridade da mesa: abaixa TODA a música (a trilha da
  // missão também, que antes passava por cima da voz) e o ambiente
  abaixar(sim: boolean) { vozAbaixa(sim) }

  pausar() { this.el?.pause() }
  // volta a tocar o que tava tocando, sem mexer no que vem depois
  retomar() { this.el?.play().catch(() => {}) }
  get tocando() { return !!this.el && !this.el.paused }

  alternar(src: string, aoFim?: () => void) {
    if (this.src === src && this.el && !this.el.paused) this.pausar()
    else this.tocar(src, aoFim)
  }

  emitir() {
    const el = this.el
    const s = { src: this.src, tocando: !!el && !el.paused, t: el?.currentTime ?? 0, dur: el?.duration || 0 }
    this.ouvintes.forEach((f) => f(s))
  }

  ouvir(f: Ouvinte) {
    this.ouvintes.add(f)
    return () => { this.ouvintes.delete(f) }
  }
}

export const player = new Player()

// ── Voz ─────────────────────────────────────────────────────
// Áudio de voz (nota de voz, ligação) num canal SEPARADO da música: a
// música não para, só abaixa bastante enquanto a pessoa fala, e volta
// quando acaba. Dá pra ouvir dirigindo, sem tirar a rádio/vinil do lugar.
// Sem arquivo gravado ainda (rascunho), a fala sai na voz do navegador.
type OuvinteVoz = (s: { id: string | null; tocando: boolean; t: number; dur: number }) => void

class Voz {
  el: HTMLAudioElement | null = null
  id: string | null = null
  tocando = false
  private ouvintes = new Set<OuvinteVoz>()
  private sintese: SpeechSynthesisUtterance | null = null

  private garantir() {
    if (this.el) return this.el
    const el = new Audio()
    el.preload = "auto"
    el.crossOrigin = "anonymous"
    el.addEventListener("timeupdate", () => this.emitir())
    el.addEventListener("ended", () => this.parou())
    el.addEventListener("pause", () => { if (this.tocando && !el.ended) this.parou() })
    const c = audioCtx()
    const out = saidaCanal("vozes")
    if (c && out) {
      try { const g = c.createGain(); c.createMediaElementSource(el).connect(g).connect(out); vozLocutorG = g } catch {}
    } else el.volume = volumeEfetivo("vozes")
    this.el = el
    return el
  }

  // id: quem é (pra a bolha saber se é ela que tá tocando)
  tocar(id: string, src?: string, fala?: string, tom = 1) {
    this.parar()
    this.id = id
    this.tocando = true
    vozEhLocutor = id === "vinheta-radio"
    player.abaixar(true)
    // (LU2CA 19/10) um personagem falando: a música da pista abafa por baixo
    abafar(true)
    if (src) {
      const el = this.garantir()
      aplicarLocutor()
      el.src = src
      el.currentTime = 0
      el.play().catch(() => this.parou())
    } else if (fala && typeof speechSynthesis !== "undefined") {
      const u = new SpeechSynthesisUtterance(fala)
      u.lang = "pt-BR"
      u.pitch = tom
      u.rate = 1.05
      u.volume = volumeEfetivo("vozes") // (T40b) a voz do navegador fica fora do grafo: respeita o geral e o mudo assim
      u.onend = () => this.parou()
      u.onerror = () => this.parou()
      this.sintese = u
      speechSynthesis.speak(u)
    } else this.parou()
    this.emitir()
  }

  parar() {
    if (!this.tocando) return
    this.el?.pause()
    if (this.sintese) { speechSynthesis.cancel(); this.sintese = null }
    this.parou()
  }

  private parou() {
    if (!this.tocando) return
    this.tocando = false
    this.sintese = null
    player.abaixar(false)
    abafar(false)
    this.emitir()
  }

  emitir() {
    const s = { id: this.id, tocando: this.tocando, t: this.el?.currentTime ?? 0, dur: this.el?.duration || 0 }
    this.ouvintes.forEach((f) => f(s))
  }

  ouvir(f: OuvinteVoz) {
    this.ouvintes.add(f)
    return () => { this.ouvintes.delete(f) }
  }
}

export const voz = new Voz()

// ── TOCA-DISCOS ─────────────────────────────────────────────
// Canal próprio, separado do rádio. É analógico: nada interrompe o disco —
// nem voz, nem Núcleo, nem sintonia, nem estreia. Rádio e disco nunca
// tocam juntos (quem escolhe é a pessoa: fonteSom).
type OuvinteDisco = (s: { src: string | null; tocando: boolean }) => void
class Disco {
  el: HTMLAudioElement | null = null
  fx: { nivel: GainNode; molhado: GainNode; seco: GainNode; filtro: BiquadFilterNode; shaper: WaveShaperNode } | null = null
  private minhocaTimer: ReturnType<typeof setInterval> | null = null
  src: string | null = null
  private ouvintes = new Set<OuvinteDisco>()
  private garantir() {
    if (this.el) return this.el
    const el = new Audio()
    el.preload = "auto"
    el.crossOrigin = "anonymous"
    // pelo grafo (o abafado da missão e do telefone): volume num GainNode
    const c = audioCtx()
    const dst = abafo()
    if (c && dst) {
      try {
        // (T40) a entrada do buraco de minhoca: passa-baixa + um caminho distorcido
        // que se mistura com o limpo. Fora da minhoca é transparente (nivel 1,
        // seco 1, molhado desligado)
        const g = c.createGain()
        g.gain.value = 0.9
        const filtro = c.createBiquadFilter()
        filtro.type = "lowpass"
        filtro.frequency.value = 20000
        const seco = c.createGain()
        const molhado = c.createGain()
        molhado.gain.value = 0
        const nivel = c.createGain()
        const shaper = c.createWaveShaper()
        shaper.curve = curvaDistorcao()
        c.createMediaElementSource(el).connect(filtro)
        filtro.connect(seco).connect(nivel)
        shaper.connect(molhado).connect(nivel)
        nivel.connect(g).connect(dst)
        this.fx = { nivel, molhado, seco, filtro, shaper }
      } catch { el.volume = 0.9 }
    } else el.volume = 0.9
    // o disco toca inteiro: acabou uma faixa, entra a próxima
    el.addEventListener("ended", () => { if (this.fila.length > 1) this.proxima(); else this.emitir() })
    el.addEventListener("pause", () => this.emitir())
    el.addEventListener("play", () => this.emitir())
    medir(el, "toca-discos")
    this.el = el
    return el
  }
  fila: string[] = []
  i = 0
  get tocando() { return !!this.el && !this.el.paused }
  // um disco inteiro (as faixas em ordem, voltando pro começo no fim)
  tocarLista(fila: string[], i = 0) {
    if (!fila.length) return
    this.fila = fila
    this.i = i % fila.length
    this.tocarFaixa(fila[this.i])
  }
  proxima() { if (this.fila.length) this.tocarLista(this.fila, this.i + 1) }
  tocar(src: string) {
    this.fila = [src]
    this.i = 0
    this.tocarFaixa(src)
  }
  private tocarFaixa(src: string) {
    const el = this.garantir()
    if (this.src !== src) { el.src = src; this.src = src }
    el.currentTime = 0
    if (musicaPausada) pausadosFazer.disco = true
    else tocarOuNoGesto(el, () => this.el === el && this.src === src && fonteAtual === "disco" && !musicaPausada)
    this.emitir()
  }
  parar() { this.saindo = null; this.el?.pause(); this.emitir() }
  // (começo novo, 05/11) a rádio Xenom chegando: o disco antigo sai em fade (seg) e
  // para. `depois` roda no fim (quem liga a rádio). Sem o grafo, para direto
  private saindo: ReturnType<typeof setTimeout> | null = null
  sairEmFade(seg: number, depois: () => void) {
    const el = this.el, fx = this.fx, c = ctx
    if (!el || el.paused || !fx || !c) { depois(); return }
    const g = fx.nivel.gain, t = c.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    g.linearRampToValueAtTime(0, t + seg)
    const id = setTimeout(() => {
      if (this.saindo !== id) return
      this.saindo = null
      el.pause()
      const t2 = c.currentTime
      g.cancelScheduledValues(t2)
      g.setValueAtTime(1, t2)
      this.emitir()
      depois()
    }, seg * 1000)
    this.saindo = id
  }
  // (T40) o fade-in do buraco de minhoca: a faixa chega distorcida, abafada e
  // baixinha e vai ficando limpa em `seg` segundos. Tudo agendado no relógio do
  // áudio; o ritmo (a velocidade da faixa) acompanha por um timer leve
  entradaMinhoca(seg: number) {
    const el = this.garantir()
    const c = audioCtx()
    const fx = this.fx
    if (!c || !fx) return
    const k = aplicarFadeMinhoca(c, fx, seg)
    try { fx.filtro.connect(fx.shaper) } catch {}
    const pitch = el as HTMLAudioElement & { preservesPitch?: boolean }
    pitch.preservesPitch = false
    const ini = performance.now()
    if (this.minhocaTimer) clearInterval(this.minhocaTimer)
    const fim = () => {
      if (this.minhocaTimer) clearInterval(this.minhocaTimer)
      this.minhocaTimer = null
      el.playbackRate = 1
      pitch.preservesPitch = true
      try { fx.filtro.disconnect(fx.shaper) } catch {} // o caminho distorcido sai de cena (desempenho)
    }
    this.minhocaTimer = setInterval(() => {
      const p = (performance.now() - ini) / (seg * 1000)
      if (p >= 1) return fim()
      el.playbackRate = k.ritmo[Math.min(k.ritmo.length - 1, Math.floor(p * (k.ritmo.length - 1)))]
    }, 100)
  }
  emitir() { const s = { src: this.src, tocando: this.tocando }; this.ouvintes.forEach((f) => f(s)) }
  ouvir(f: OuvinteDisco) { this.ouvintes.add(f); return () => { this.ouvintes.delete(f) } }
}
export const disco = new Disco()

// qual aparelho tá ligado na Kombi: rádio, toca-discos ou nenhum
export type Fonte = "radio" | "disco" | "off"
const CHAVE_FONTE = "cn-linha-fonte"
let fonteAtual: Fonte = "off"
try { const f = typeof localStorage !== "undefined" ? localStorage.getItem(CHAVE_FONTE) : null; if (f === "radio" || f === "disco") fonteAtual = f } catch {}
const ouvintesFonte = new Set<(f: Fonte, auto?: boolean) => void>()
// (T40) A RÁDIO SÓ PEGA PERTO DAS PISTAS. Fora do alcance (no deserto, ou longe
// das pistas), ligar a rádio deixa no toca-discos; chegou perto de uma pista, a
// rádio que a pessoa quis volta sozinha (auto = true avisa quem toca a faixa).
// `discoPadrao`: o disco que toca se o toca-discos ainda não tem nenhum
let radioPega = true
let radioAdiada = false
const retomarDisco = () => {
  if (disco.el && disco.src) disco.el.play().catch(() => {})
  else if (fonteSom.discoPadrao.length) disco.tocarLista(fonteSom.discoPadrao)
}
export const fonteSom = {
  discoPadrao: [] as string[],
  get: () => fonteAtual,
  radioPega: () => radioPega,
  set(f: Fonte, auto = false) {
    let voltaDisco = auto
    if (f === "radio" && !radioPega) { radioAdiada = true; f = "disco"; voltaDisco = true }
    else if (!auto) radioAdiada = false
    if (f === fonteAtual) { if (f === "disco" && voltaDisco && !disco.tocando) retomarDisco(); return }
    fonteAtual = f
    // nunca os dois juntos
    if (f !== "disco") disco.parar()
    if (f !== "radio") player.pausar()
    if (f === "disco" && voltaDisco) retomarDisco()
    try { localStorage.setItem(CHAVE_FONTE, f) } catch {}
    ouvintesFonte.forEach((o) => o(f, auto))
  },
  pega(sim: boolean) {
    if (sim === radioPega) return
    radioPega = sim
    if (!sim && fonteAtual === "radio") { radioAdiada = true; this.set("disco", true) }
    else if (sim && radioAdiada) { radioAdiada = false; this.set("radio", true) }
  },
  ouvir(o: (f: Fonte, auto?: boolean) => void) { ouvintesFonte.add(o); return () => { ouvintesFonte.delete(o) } },
}

// ── A PISTA É O TOCA-DISCOS (mapa-disco 18/10; MÚSICA CONTÍNUA 03/11; A MÚSICA
// DA MISSÃO 08/11) ──────────────────────────────────────────────────────────
// Na rua toca o instrumental da pista. Aceitou uma missão com faixa, a completa
// dela toca do começo, UMA vez inteira: nada pausa (troca de pista, peça, cena,
// turbo, celular), no máximo abaixa e volta. Acabou, fica o instrumental em
// loop. A regra mora em disco/musicaContinua.ts; aqui é o som
// (docs/musica-continua.md).
//
// Dois <audio> ("decks") reaproveitados pra sempre: um soa, o outro espera com a
// outra versão já carregando. Os dois só tocam juntos durante o crossfade
// (iPhone: nada de duas músicas soando por mais que isso). Volume só por GainNode.
type Papel = "completa" | "inst"
interface Deck { el: HTMLAudioElement; gain: GainNode | null; src: string | null; parada: ReturnType<typeof setTimeout> | null }
// um silêncio de 10 ms: destrava os decks no primeiro toque (iOS barra play() de
// um <audio> que nunca tocou dentro de um toque)
const SILENCIO = "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=="
const tocarSemErro = (el: HTMLAudioElement) => { try { const r = el.play(); if (r && typeof r.catch === "function") r.catch(() => {}) } catch {} }
class PistaSom {
  private decks: Deck[] = []
  private ativo = -1
  private grafo = false
  private mestre: GainNode | null = null
  private filtro: BiquadFilterNode | null = null
  private analyser: AnalyserNode | null = null
  private dados = new Uint8Array(128)
  /** a faixa da pista agora (null = nada tocando) */
  faixa: FaixaContinua | null = null
  /** o que soa: a completa ou o instrumental */
  modo: Papel = "completa"
  // a experiência da completa ainda está valendo (tocando ela, ou o instrumental
  // no lugar dela durante a missão); false = já acabou, fica o instrumental
  private completaViva = false
  /** (08/11) a completa da missão está soando: a troca de pista e as cenas não mexem nela */
  daMissao = false
  // aceitou com a rádio mandando no som: a música da missão espera a rádio sair
  private pendente: { f: FaixaContinua; missao: string } | null = null
  // (18/11, o dono) a faixa da missão aceita: aceitar começa o INSTRUMENTAL dela;
  // a completa (com voz) só toca andando na pista dela
  private faixaMissao: FaixaContinua | null = null
  private missaoId: string | null = null
  // o instrumental da missão está soando fora da pista dela (o deserto não cala ele)
  private instDaMissao = false
  // a pista onde ele está agora (null = fora das pistas)
  private naPista: string | null = null
  private emMissao = 0
  private aplicarAgendado = false
  private segurando = false
  // o "duck" do mestre (no ar, rádio por cima, pista apagada): só volume/filtro
  private noAr = false
  private radio = false
  private abafada = false
  private ultCorte = -1
  private ultAlvo = -1

  private criarDecks() {
    if (this.decks.length || typeof window === "undefined") return
    for (let i = 0; i < 2; i++) {
      const el = new Audio()
      el.preload = "auto"
      el.crossOrigin = "anonymous"
      const d: Deck = { el, gain: null, src: null, parada: null }
      el.addEventListener("ended", () => this.fimDoDeck(d))
      medir(el, "toca-discos")
      this.decks.push(d)
    }
  }
  private garantir() {
    this.criarDecks()
    if (this.grafo) return
    const c = audioCtx(), dst = abafo()
    if (!c || !dst) return
    try {
      this.mestre = c.createGain()
      this.filtro = c.createBiquadFilter()
      this.filtro.type = "lowpass"
      this.filtro.frequency.value = 20000
      this.analyser = c.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.6
      this.filtro.connect(this.mestre).connect(dst)
      this.mestre.connect(this.analyser)
      for (const d of this.decks) {
        d.gain = c.createGain()
        d.gain.gain.value = 0
        c.createMediaElementSource(d.el).connect(d.gain).connect(this.filtro)
      }
      this.grafo = true
      this.aplicarMestre(true)
    } catch {}
  }
  /** primeiro toque na página: um play/pause mudo de um silêncio em cada deck */
  destravar() {
    this.criarDecks()
    for (const d of this.decks) {
      if (d.src) continue
      const el = d.el
      el.muted = true
      el.src = SILENCIO
      try {
        const r = el.play()
        const fim = () => { if (!d.src) { el.pause(); el.removeAttribute("src") } el.muted = false }
        if (r && typeof r.then === "function") r.then(fim, fim)
        else fim()
      } catch { el.muted = false }
    }
  }

  // ── volume de cada deck (rampas no relógio do áudio: sem estalo) ──
  private rampa(d: Deck, para: number, seg: number) {
    const c = audioCtx()
    if (!d.gain || !c) { d.el.volume = Math.max(0, Math.min(1, para)); return }
    const g = d.gain.gain, t = c.currentTime
    g.cancelScheduledValues(t)
    g.setValueAtTime(g.value, t)
    if (seg <= 0.01) g.setValueAtTime(para, t)
    else g.linearRampToValueAtTime(para, t + seg)
  }
  // posiciona no segundo `t` (se o arquivo ainda não carregou, assim que carregar,
  // contando o tempo que passou: a troca da missão cai no mesmo ponto)
  private posicionar(el: HTMLAudioElement, t: number) {
    if (el.readyState >= 1) { try { el.currentTime = t } catch {} ; return }
    const t0 = performance.now()
    el.addEventListener("loadedmetadata", () => {
      try { el.currentTime = t > 0 ? t + (performance.now() - t0) / 1000 : 0 } catch {}
    }, { once: true })
  }
  private volDe(papel: Papel) {
    return papel === "inst" && this.faixa?.semInst ? VOL_SEM_INST : 1
  }

  // põe o `papel` da faixa pra soar a partir de `desde` (null = do ponto onde o
  // deck que soa está), em crossfade de `fade` segundos
  private tocar(papel: Papel, desde: number | null, fade: number, loop: boolean) {
    const f = this.faixa
    if (!f) return
    this.garantir()
    if (!this.decks.length) return
    const src = papel === "completa" ? f.completa : f.inst
    const vol = this.volDe(papel)
    // (revisão 05/11) fazendo música: troca o deck parado, sem tocar; volta junto (voltarDaMusica)
    const calado = musicaPausada
    if (calado) { this.pausadaPraMusica = true; fade = 0 }
    const cur = this.ativo >= 0 ? this.decks[this.ativo] : null
    this.modo = papel
    // mesmo arquivo (a faixa sem voz ainda: a completa É o instrumental): sem troca
    if (cur && cur.src === src) {
      if (cur.parada) { clearTimeout(cur.parada); cur.parada = null }
      cur.el.loop = loop
      if (desde !== null) this.posicionar(cur.el, desde)
      if (cur.el.paused && !calado) tocarSemErro(cur.el)
      this.rampa(cur, vol, fade)
      return
    }
    const ponto = desde ?? (cur ? cur.el.currentTime : 0)
    const novo = cur ? this.decks[1 - this.ativo] : this.decks[0]
    if (novo.parada) { clearTimeout(novo.parada); novo.parada = null }
    this.rampa(novo, 0, 0)
    if (novo.src !== src) { novo.el.src = src; novo.src = src }
    novo.el.loop = loop
    this.posicionar(novo.el, ponto)
    if (!calado) tocarSemErro(novo.el)
    this.rampa(novo, vol, fade)
    this.ativo = this.decks.indexOf(novo)
    if (cur && calado) {
      this.rampa(cur, 0, 0)
      if (cur.parada) { clearTimeout(cur.parada); cur.parada = null }
      cur.el.pause()
    } else if (cur) {
      this.rampa(cur, 0, fade)
      // o que saiu para depois do fade e fica esperando com a outra versão
      cur.parada = setTimeout(() => { cur.parada = null; cur.el.pause(); this.prepararOcioso() }, fade * 1000 + 80)
    } else setTimeout(() => this.prepararOcioso(), 2500)
  }
  // o deck parado já carrega a outra versão (completa ⇄ instrumental) pra troca
  // da missão sair sem atraso
  private prepararOcioso() {
    const f = this.faixa
    if (!f || !this.completaViva || this.ativo < 0 || f.inst === f.completa) return
    const ocioso = this.decks[1 - this.ativo]
    if (!ocioso || ocioso.parada || !ocioso.el.paused) return
    const src = this.modo === "completa" ? f.inst : f.completa
    if (ocioso.src !== src) { ocioso.el.preload = "auto"; ocioso.el.src = src; ocioso.src = src }
  }

  /** entrou numa pista: a faixa dela do início (a mesma faixa: segue tocando).
   *  A pista da missão aceita: a completa, com voz (18/11, o dono) */
  tocarFaixa(f: FaixaContinua, fade = CROSSFADE) {
    this.naPista = f.id
    if (this.daMissao) return
    if (this.faixaMissao && this.faixaMissao.id === f.id) return this.comecarCompleta(this.faixaMissao)
    if (this.faixa && this.faixa.id === f.id && this.tocando) return
    this.instDaMissao = false
    this.faixa = f
    definirFaixaRua(f.id)
    definirTom(f.tom)
    this.completaViva = comecaPelaCompleta(f)
    const papel: Papel = this.completaViva && this.emMissao === 0 ? "completa" : "inst"
    this.tocar(papel, 0, fade, papel === "inst" ? !this.completaViva : albumComprado())
  }
  /** (18/11, o dono) aceitou a missão: começa o INSTRUMENTAL da faixa dela, onde
   *  quer que ele esteja. Já na pista dela: a completa, com voz. Depois, andar na
   *  pista da missão é o que faz a música tocar de verdade (tocarFaixa) */
  tocarDaMissao(f: FaixaContinua, missao: string) {
    this.pendente = null
    this.faixaMissao = f
    this.missaoId = missao
    if (fonteSom.get() === "radio") { this.pendente = { f, missao }; return }
    this.iniciarDaMissao(f)
  }
  private iniciarDaMissao(f: FaixaContinua) {
    // a mesma precedência de entrar numa pista: o disco e a rádio parada saem
    player.pausar()
    disco.parar()
    if (this.naPista === f.id) return this.comecarCompleta(f)
    if (this.daMissao) return // uma completa de missão anterior ainda soando: termina e cai no instrumental
    const cur = this.ativo >= 0 ? this.decks[this.ativo] : null
    this.faixa = f
    definirFaixaRua(f.id)
    definirTom(f.tom)
    this.completaViva = false
    this.instDaMissao = true
    if (cur && cur.src === f.inst && !cur.el.paused) { this.modo = "inst"; cur.el.loop = true; return }
    this.tocar("inst", 0, CROSSFADE, true)
  }
  /** na pista da missão: a completa, do início. Nada a interrompe (nem a troca de pista) */
  private comecarCompleta(f: FaixaContinua) {
    const cur = this.ativo >= 0 ? this.decks[this.ativo] : null
    this.faixa = f
    definirFaixaRua(f.id)
    definirTom(f.tom)
    this.completaViva = true
    this.daMissao = true
    this.instDaMissao = false
    if (cur && cur.src === f.completa && !cur.el.paused) { this.modo = "completa"; cur.el.loop = false; return }
    this.tocar("completa", 0, CROSSFADE, false)
  }
  /** desligou o som (o disco no lugar da rádio segue mandando): a completa que esperava começa agora */
  soltarPendente() {
    const p = this.pendente
    if (!p || fonteSom.get() !== "off") return
    this.pendente = null
    this.iniciarDaMissao(p.f)
  }
  /** a missão que esperava a rádio saiu (feita ou largada): não começa mais */
  esquecerPendente(missaoAgora: string | null) {
    if (this.pendente && this.pendente.missao !== missaoAgora) this.pendente = null
    // a missão saiu (feita ou largada): a pista dela volta a ser uma pista como as outras
    if (this.missaoId && this.missaoId !== missaoAgora) { this.faixaMissao = null; this.missaoId = null }
  }
  /** missão/peça/cena começou (true) ou terminou (false). Conta quem pediu e
   *  decide um tique depois: cena → cena não faz vai-e-volta */
  missao(sim: boolean) {
    this.emMissao = Math.max(0, this.emMissao + (sim ? 1 : -1))
    if (this.aplicarAgendado) return
    this.aplicarAgendado = true
    setTimeout(() => { this.aplicarAgendado = false; this.aplicarMissao() }, 0)
  }
  private aplicarMissao() {
    const f = this.faixa
    if (!f || !this.completaViva || this.daMissao || this.ativo < 0) return
    const quer: Papel = this.emMissao > 0 ? "inst" : "completa"
    if (quer === this.modo) return
    const el = this.decks[this.ativo].el
    const t = el.currentTime
    const dur = el.duration && isFinite(el.duration) && this.modo === "completa" ? el.duration : f.dur
    if (quer === "completa" && t >= dur - CROSSFADE) {
      // a completa já teria acabado: fica o instrumental, em loop
      marcarCompletaOuvida(f.id)
      this.completaViva = albumComprado()
      if (!this.completaViva) { el.loop = true; return }
    }
    // o instrumental no lugar da completa toca uma vez (o fim dele = o fim dela)
    this.tocar(quer, t, CROSSFADE, quer === "inst" ? false : albumComprado())
  }
  // um deck chegou ao fim (só acontece sem loop: a completa, ou o instrumental no lugar dela)
  private fimDoDeck(d: Deck) {
    const f = this.faixa
    if (!f || this.decks[this.ativo] !== d) return
    this.daMissao = false
    marcarCompletaOuvida(f.id)
    if (albumComprado()) {
      const papel: Papel = this.emMissao > 0 ? "inst" : "completa"
      return this.tocar(papel, 0, CROSSFADE, papel === "completa")
    }
    this.completaViva = false
    this.tocar("inst", 0, CROSSFADE, true)
  }

  /** a cada quadro (barato: só manda alvo novo quando muda). Não pausa nem muda
   *  o ritmo: no ar abafa e abaixa, a rádio ligada cala por cima, pista apagada abafa */
  estado(noAr: boolean, radio = false, abafada = false) {
    if (noAr === this.noAr && radio === this.radio && abafada === this.abafada) return
    this.noAr = noAr; this.radio = radio; this.abafada = abafada
    this.aplicarMestre(false)
  }
  private aplicarMestre(forcar: boolean) {
    const c = audioCtx()
    if (!c || !this.filtro || !this.mestre) return
    const corte = this.noAr ? 700 : this.abafada ? 900 : 20000
    const alvo = this.segurando || this.radio ? 0 : this.noAr ? 0.4 : this.abafada ? 0.6 : 1
    if (forcar || corte !== this.ultCorte) { this.ultCorte = corte; this.filtro.frequency.setTargetAtTime(corte, c.currentTime, 0.08) }
    if (forcar || alvo !== this.ultAlvo) { this.ultAlvo = alvo; this.mestre.gain.setTargetAtTime(alvo, c.currentTime, this.radio || this.segurando ? 0.25 : 0.08) }
  }
  // (trilha sonora, 05/11) fazer música (som.ts fazerMusica): a faixa pausa de
  // verdade (já em silêncio) e volta do mesmo ponto
  private pausadaPraMusica = false
  pausarPraMusica() {
    const e = this.el
    if (this.faixa && e && !e.paused) { e.pause(); this.pausadaPraMusica = true }
  }
  voltarDaMusica() {
    if (!this.pausadaPraMusica) return
    this.pausadaPraMusica = false
    const e = this.el
    if (this.faixa && e && e.paused) tocarSemErro(e)
  }
  /** um jogo no holo / um show com o som dele: abaixa a zero, a faixa SEGUE andando */
  segurar(sim: boolean) {
    if (sim === this.segurando) return
    this.segurando = sim
    this.aplicarMestre(false)
  }
  /** saiu da cidade (o deserto): some em fade e para. O instrumental da missão
   *  aceita fica (18/11, o dono): ele acompanha até a pista dela */
  sair(fadeSeg = 2) {
    this.naPista = null
    if (this.instDaMissao && this.faixaMissao) return
    this.daMissao = false
    this.pendente = null
    if (!this.faixa || this.ativo < 0) return
    const d = this.decks[this.ativo]
    this.faixa = null
    definirFaixaRua(null)
    this.rampa(d, 0, fadeSeg)
    if (d.parada) clearTimeout(d.parada)
    d.parada = setTimeout(() => { d.parada = null; if (!this.faixa) d.el.pause() }, fadeSeg * 1000 + 80)
  }
  /** para já (fora da página) */
  parar() {
    this.faixa = null
    this.daMissao = false
    this.instDaMissao = false
    this.naPista = null
    this.pendente = null
    definirFaixaRua(null)
    for (const d of this.decks) { if (d.parada) { clearTimeout(d.parada); d.parada = null } d.el.pause() }
  }
  /** o arquivo que soa agora (o holo e os óculos mostram) */
  get src() { return this.faixa && this.ativo >= 0 ? this.decks[this.ativo].src : null }
  get el() { return this.ativo >= 0 ? this.decks[this.ativo]?.el ?? null : null }
  get tocando() { const e = this.el; return !!this.faixa && !!e && !e.paused }
  // os graves da faixa (as luzes da cidade pulsam com isso)
  grave() {
    const e = this.el
    if (!this.analyser || !e || e.paused) return 0
    this.analyser.getByteFrequencyData(this.dados)
    let s = 0
    for (let i = 1; i < 7; i++) s += this.dados[i]
    return s / (6 * 255)
  }
}
export const pistaSom = new PistaSom()
fonteSom.ouvir(() => pistaSom.soltarPendente())
if (typeof window !== "undefined") {
  const destravar = () => {
    pistaSom.destravar()
    for (const ev of ["pointerdown", "touchend", "keydown"]) window.removeEventListener(ev, destravar, true)
  }
  for (const ev of ["pointerdown", "touchend", "keydown"]) window.addEventListener(ev, destravar, true)
}
// teste (fora da produção): o estado do toca-discos da pista
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  ;(window as unknown as { __pistaSom?: () => unknown }).__pistaSom = () => ({ faixa: pistaSom.faixa?.id ?? null, src: pistaSom.src, modo: pistaSom.modo, tocando: pistaSom.tocando, t: pistaSom.el ? +pistaSom.el.currentTime.toFixed(1) : null, loop: pistaSom.el?.loop ?? null })
  // teste: pula pro fim da faixa (ver a troca pro instrumental em loop)
  ;(window as unknown as { __pistaSomFim?: () => void }).__pistaSomFim = () => { const el = pistaSom.el; if (el && el.duration) el.currentTime = Math.max(0, el.duration - 1.5) }
}

// ── (T40) a trilha das missões, ligada ao contexto de áudio do jogo ──
export const trilha = new Trilha({
  ctx: () => audioCtx() as unknown as CtxLike | null,
  saida: () => saidaMusicaLimpa(),
  novoAudio: () => new Audio() as unknown as ReturnType<DepsTrilha["novoAudio"]>,
})
export { curvaMinhoca }
export type { NosFade }
