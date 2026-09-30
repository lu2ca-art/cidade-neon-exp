// Som da Linha 222 — um AudioContext só, criado no primeiro toque (política
// de autoplay). Tudo que toca música passa por um GainNode, porque no iOS
// HTMLMediaElement.volume é somente-leitura: sem o grafo, fade e ducking
// simplesmente não acontecem no celular.

import { TONS } from "./tons"

let ctx: AudioContext | null = null
let master: GainNode | null = null

export function audioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 1
    master.connect(ctx.destination)
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}

function saida(): AudioNode | null {
  audioCtx()
  return master
}

// ── Ambiente ────────────────────────────────────────────────
// Sem ruído de fundo: o LU2CA pediu silêncio fora da música e do motor
// (a chuva sintetizada virou "ruído infernal"). As funções ficam como
// no-op pra quem ainda chama.
export function ligarChuva() {}
export function volumeChuva(_v: number, _seg = 0.8) {}

export function mudo(m: boolean) {
  const c = audioCtx()
  if (!c || !master) return
  master.gain.setTargetAtTime(m ? 0 : 1, c.currentTime, 0.1)
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
export function estatica() {
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
  g.gain.value = 0.12
  src.connect(bp).connect(g).connect(out)
  src.start()
  return {
    volume: (v: number) => g.gain.setTargetAtTime(v, c.currentTime, 0.05),
    // gira o "dial": move a faixa de ruído (soa como procurar estação)
    sintonizar: (hz: number) => bp.frequency.setTargetAtTime(hz, c.currentTime, 0.04),
    parar: () => { try { src.stop() } catch {} },
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
    el.addEventListener("play", () => { this.detector?.ligar(); this.emitir() })
    el.addEventListener("pause", () => { this.detector?.desligar(); this.emitir() })
    el.addEventListener("ended", () => { this.aoFim?.(); this.emitir() })
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
        node.connect(this.gain).connect(out)
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

  tocar(src: string, aoFim?: () => void, vol = 1) {
    const el = this.garantir()
    this.aoFim = aoFim ?? null
    if (this.src !== src) {
      this.detector?.esfriar(src)
      el.src = src
      this.src = src
    }
    if (this.gain && ctx) this.gain.gain.setValueAtTime(vol, ctx.currentTime)
    el.play().catch(() => {})
  }

  volume(v: number) {
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
    else if (this.el) this.el.volume = Math.max(0, Math.min(1, v))
  }

  pausar() { this.el?.pause() }
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
