// O METRÔ (T26): os sons, todos sintetizados no Web Audio (nada pra baixar),
// saindo pelo mesmo mestre do jogo (respeita o volume dos efeitos e o mudo).
// O trem (o ronco grave e o tec-tec dos trilhos), o seu coração (acelera com
// ele perto), os passos dele (mais altos quanto mais perto), o apito, o
// rádio do Núcleo, a porta. E um zumbido de medo que sobe com a distância.

import { audioCtx, saidaSom } from "../som"

let ruido: AudioBuffer | null = null
function bufRuido(c: AudioContext) {
  if (ruido && ruido.sampleRate === c.sampleRate) return ruido
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 2), c.sampleRate)
  const d = b.getChannelData(0)
  // ruído marrom (mais grave: o trem)
  let u = 0
  for (let i = 0; i < d.length; i++) { u = (u + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = u * 3.5 }
  ruido = b
  return b
}
let branco: AudioBuffer | null = null
function bufBranco(c: AudioContext) {
  if (branco && branco.sampleRate === c.sampleRate) return branco
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  branco = b
  return b
}

function env(c: AudioContext, t: number, pico: number, dur: number, ataque = 0.002) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  return g
}
function tom(c: AudioContext, out: AudioNode, t: number, f: number, pico: number, dur: number, tipo: OscillatorType = "sine", fFim?: number, ataque = 0.002) {
  const o = c.createOscillator()
  o.type = tipo
  o.frequency.setValueAtTime(f, t)
  if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t + dur)
  o.connect(env(c, t, pico, dur, ataque)).connect(out)
  o.start(t); o.stop(t + dur + 0.03)
}
function chiado(c: AudioContext, out: AudioNode, t: number, tipo: BiquadFilterType, f: number, q: number, pico: number, dur: number, fFim?: number, ataque = 0.002) {
  const n = c.createBufferSource()
  n.buffer = bufBranco(c)
  n.loop = true
  const fl = c.createBiquadFilter()
  fl.type = tipo; fl.frequency.setValueAtTime(f, t); fl.Q.value = q
  if (fFim) fl.frequency.exponentialRampToValueAtTime(fFim, t + dur)
  n.connect(fl).connect(env(c, t, pico, dur, ataque)).connect(out)
  n.start(t); n.stop(t + dur + 0.03)
}

export class SomMetro {
  private c: AudioContext | null = null
  private out: AudioNode | null = null
  private ronco: GainNode | null = null
  private medoG: GainNode | null = null
  private fontes: AudioScheduledSourceNode[] = []
  private proximoCoracao = 0
  ligado = false

  // no primeiro toque (a política de autoplay)
  ligar() {
    if (this.ligado) return
    const c = audioCtx(), out = saidaSom()
    if (!c || !out) return
    this.c = c; this.out = out; this.ligado = true
    const t = c.currentTime
    // o ronco do trem: ruído marrom passando num grave + a nota do motor
    const n = c.createBufferSource(); n.buffer = bufRuido(c); n.loop = true
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260; lp.Q.value = 0.7
    this.ronco = c.createGain(); this.ronco.gain.setValueAtTime(0.0001, t); this.ronco.gain.exponentialRampToValueAtTime(0.5, t + 1.2)
    n.connect(lp).connect(this.ronco).connect(out)
    const m = c.createOscillator(); m.type = "sawtooth"; m.frequency.value = 54
    const mf = c.createBiquadFilter(); mf.type = "lowpass"; mf.frequency.value = 140
    const mg = c.createGain(); mg.gain.value = 0.05
    m.connect(mf).connect(mg).connect(this.ronco)
    // o zumbido do medo: duas notas quase iguais (batimento), sobe com ele perto
    this.medoG = c.createGain(); this.medoG.gain.value = 0
    const a = c.createOscillator(); a.type = "triangle"; a.frequency.value = 110
    const b = c.createOscillator(); b.type = "triangle"; b.frequency.value = 116.5
    const hp = c.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 400; hp.Q.value = 0.8
    a.connect(hp); b.connect(hp); hp.connect(this.medoG).connect(out)
    for (const s of [n, m, a, b]) { s.start(t); this.fontes.push(s) }
  }

  desligar() {
    for (const s of this.fontes) try { s.stop() } catch {}
    this.fontes = []
    this.ronco?.disconnect(); this.medoG?.disconnect()
    this.ligado = false
  }

  // por quadro: o medo (0–1) e se o trem está no apagão
  quadro(medo: number, tempo: number, ativo: boolean) {
    const c = this.c
    if (!c || !this.medoG || !this.ronco) return
    this.medoG.gain.setTargetAtTime(ativo ? medo * medo * 0.07 : 0, c.currentTime, 0.15)
    // o coração: 70 → 165 bpm
    if (ativo && tempo >= this.proximoCoracao) {
      const bpm = 72 + medo * 95
      this.proximoCoracao = tempo + 60 / bpm
      const t = c.currentTime + 0.01, v = 0.12 + medo * 0.28
      tom(c, this.out!, t, 62, v, 0.16, "sine", 40)
      tom(c, this.out!, t + 0.16, 55, v * 0.7, 0.14, "sine", 38)
    }
  }

  // o tec-tec da emenda do trilho (os dois truques do vagão)
  trilho() {
    const c = this.c; if (!c) return
    const t = c.currentTime + 0.005
    for (const [dt, v] of [[0, 0.16], [0.11, 0.12]] as const) {
      chiado(c, this.out!, t + dt, "bandpass", 900, 2.5, v, 0.07)
      tom(c, this.out!, t + dt, 120, v * 0.6, 0.08, "sine", 70)
    }
  }

  passoVoce() { const c = this.c; if (!c) return; chiado(c, this.out!, c.currentTime, "bandpass", 1800, 1.5, 0.05, 0.05) }
  passoGuarda(perto: number) {
    const c = this.c; if (!c) return
    const v = 0.05 + perto * 0.32, t = c.currentTime
    tom(c, this.out!, t, 85, v, 0.12, "sine", 50)
    chiado(c, this.out!, t, "lowpass", 600, 0.7, v * 0.5, 0.08)
  }
  apito() {
    const c = this.c; if (!c) return
    const t = c.currentTime + 0.02
    for (let i = 0; i < 2; i++) {
      const o = c.createOscillator(); o.type = "square"; o.frequency.setValueAtTime(2750, t + i * 0.42)
      const lfo = c.createOscillator(); lfo.frequency.value = 28; const lg = c.createGain(); lg.gain.value = 90
      lfo.connect(lg).connect(o.frequency)
      const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2800; f.Q.value = 4
      o.connect(f).connect(env(c, t + i * 0.42, 0.13, i ? 0.6 : 0.3, 0.01)).connect(this.out!)
      o.start(t + i * 0.42); lfo.start(t + i * 0.42); o.stop(t + i * 0.42 + 0.7); lfo.stop(t + i * 0.42 + 0.7)
    }
  }
  radio() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    chiado(c, this.out!, t, "bandpass", 2200, 1.2, 0.08, 0.5, 1600, 0.01)
    tom(c, this.out!, t + 0.04, 1180, 0.05, 0.07, "square")
    tom(c, this.out!, t + 0.5, 880, 0.04, 0.06, "square")
  }
  esbarrou() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    tom(c, this.out!, t, 110, 0.35, 0.18, "sine", 60)
    chiado(c, this.out!, t, "lowpass", 900, 0.8, 0.25, 0.12)
    tom(c, this.out!, t + 0.03, 240, 0.06, 0.25, "triangle", 170, 0.03) // o "ei!" de quem levou o esbarrão
  }
  empurrou() { const c = this.c; if (!c) return; const t = c.currentTime; chiado(c, this.out!, t, "bandpass", 500, 1, 0.16, 0.1); tom(c, this.out!, t, 140, 0.12, 0.1, "sine", 90) }
  portinha() { const c = this.c; if (!c) return; chiado(c, this.out!, c.currentTime, "highpass", 2500, 0.7, 0.07, 0.3, 5000, 0.04) }
  apagao() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    tom(c, this.out!, t, 70, 0.4, 0.3, "square", 35)
    chiado(c, this.out!, t, "bandpass", 120, 3, 0.2, 0.3)
    this.ronco?.gain.setTargetAtTime(0.8, t, 0.1) // no escuro, o trem fica mais alto
  }
  voltaLuz() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    for (let i = 0; i < 3; i++) tom(c, this.out!, t + i * 0.05, 120, 0.06, 0.04, "square")
    this.ronco?.gain.setTargetAtTime(0.5, t, 0.3)
  }
  violao() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    // as cordas arrebentando: um acorde que desafina pra baixo + o estalo
    for (const [i, f] of [82.4, 110, 146.8, 196, 246.9, 329.6].entries()) tom(c, this.out!, t + i * 0.012, f, 0.09, 1.1, "sawtooth", f * 0.9)
    chiado(c, this.out!, t, "highpass", 3000, 0.5, 0.3, 0.06)
    tom(c, this.out!, t, 60, 0.35, 0.25, "sine", 35)
  }
  pego() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    tom(c, this.out!, t, 55, 0.6, 0.6, "sine", 30)
    chiado(c, this.out!, t, "lowpass", 400, 1, 0.4, 0.4)
    tom(c, this.out!, t + 0.05, 233, 0.08, 1.6, "sawtooth", 220, 0.2)
    tom(c, this.out!, t + 0.05, 247, 0.08, 1.6, "sawtooth", 233, 0.2)
    this.ronco?.gain.setTargetAtTime(0.15, t, 0.6)
    this.medoG?.gain.setTargetAtTime(0, t, 0.3)
  }
  portaAbre() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    tom(c, this.out!, t, 784, 0.12, 0.5, "sine"); tom(c, this.out!, t + 0.32, 622, 0.12, 0.7, "sine")
    chiado(c, this.out!, t + 0.4, "highpass", 1800, 0.6, 0.12, 0.55, 4500, 0.05)
  }
  pulou() {
    const c = this.c; if (!c) return
    const t = c.currentTime
    chiado(c, this.out!, t, "bandpass", 400, 0.6, 0.5, 1.6, 2500, 0.08) // o vento da curva
    this.ronco?.gain.setTargetAtTime(0.0001, t + 0.2, 0.5)
    this.medoG?.gain.setTargetAtTime(0, t, 0.2)
  }
}
