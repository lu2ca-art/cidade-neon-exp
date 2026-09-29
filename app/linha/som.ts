// Som da Linha 222 — um AudioContext só, criado no primeiro toque (política
// de autoplay). Tudo que toca música passa por um GainNode, porque no iOS
// HTMLMediaElement.volume é somente-leitura: sem o grafo, fade e ducking
// simplesmente não acontecem no celular.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let chuvaGain: GainNode | null = null
let chuvaLigada = false

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

function ruidoBuffer(c: AudioContext, seg = 2) {
  const buf = c.createBuffer(1, c.sampleRate * seg, c.sampleRate)
  const d = buf.getChannelData(0)
  let ult = 0
  for (let i = 0; i < d.length; i++) {
    // ruído marrom: mais grave e macio que o branco, soa como chuva longe
    const b = Math.random() * 2 - 1
    ult = (ult + 0.02 * b) / 1.02
    d[i] = ult * 3.2
  }
  return buf
}

// ── Chuva ambiente ──────────────────────────────────────────
export function ligarChuva() {
  const c = audioCtx()
  const out = saida()
  if (!c || !out || chuvaLigada) return
  chuvaLigada = true
  const src = c.createBufferSource()
  src.buffer = ruidoBuffer(c, 4)
  src.loop = true
  const hp = c.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 400
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 2600
  chuvaGain = c.createGain()
  chuvaGain.gain.value = 0
  chuvaGain.gain.linearRampToValueAtTime(0.16, c.currentTime + 3)
  src.connect(hp).connect(lp).connect(chuvaGain).connect(out)
  src.start()
}

export function volumeChuva(v: number, seg = 0.8) {
  const c = audioCtx()
  if (!c || !chuvaGain) return
  chuvaGain.gain.cancelScheduledValues(c.currentTime)
  chuvaGain.gain.setTargetAtTime(v, c.currentTime, seg / 3)
}

export function mudo(m: boolean) {
  const c = audioCtx()
  if (!c || !master) return
  master.gain.setTargetAtTime(m ? 0 : 1, c.currentTime, 0.1)
}

// ── Notas ───────────────────────────────────────────────────
// pentatônica menor em Ré — qualquer sequência soa bem, ninguém "erra"
const PENTA = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99]

export function gota(i: number) {
  const c = audioCtx()
  const out = saida()
  if (!c || !out) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = "sine"
  o.frequency.value = PENTA[i % PENTA.length]
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
    parar: () => { try { src.stop() } catch {} },
  }
}

// ── Player único ────────────────────────────────────────────
// Um elemento <audio> por vez no jogo inteiro: nota de voz, faixa da prova,
// rádio. Tocar qualquer coisa pausa o que estava tocando e abaixa a chuva.

type Ouvinte = (s: { src: string | null; tocando: boolean; t: number; dur: number }) => void

class Player {
  el: HTMLAudioElement | null = null
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
    el.addEventListener("play", () => { volumeChuva(0.04); this.emitir() })
    el.addEventListener("pause", () => { volumeChuva(0.16); this.emitir() })
    el.addEventListener("ended", () => { volumeChuva(0.16); this.aoFim?.(); this.emitir() })
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

  tocar(src: string, aoFim?: () => void) {
    const el = this.garantir()
    this.aoFim = aoFim ?? null
    if (this.src !== src) {
      el.src = src
      this.src = src
    }
    if (this.gain && ctx) this.gain.gain.setValueAtTime(1, ctx.currentTime)
    el.play().catch(() => {})
  }

  volume(v: number) {
    if (this.gain && ctx) this.gain.gain.setTargetAtTime(v, ctx.currentTime, 0.05)
    else if (this.el) this.el.volume = Math.max(0, Math.min(1, v))
  }

  pausar() { this.el?.pause() }

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
