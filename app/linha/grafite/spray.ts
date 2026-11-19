// O som do spray (Web Audio, sem arquivo): chiado de ruído filtrado + chocalho da lata + estalos.
// (T64) no mundo: o mesmo AudioContext e a mesma saída de efeitos do jogo (respeita volume e mudo)
import { audioCtx, saidaSom } from "../som"
let ruido: AudioBuffer | null = null
let chiado: { g: GainNode; f: BiquadFilterNode; fonte: AudioBufferSourceNode } | null = null

function pegar(): AudioContext | null {
  try {
    const c = audioCtx()
    if (c && c.state === "suspended") void c.resume()
    return c
  } catch { return null }
}
const destino = (c: AudioContext): AudioNode => saidaSom() ?? c.destination

function bufRuido(c: AudioContext) {
  if (!ruido) {
    ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = ruido.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ruido
}

/** chamar dentro de um gesto do usuário (toque/clique) pra liberar o áudio */
export function acordarAudio() { pegar() }

export function blip(i: number) {
  const c = pegar(); if (!c) return
  const t = c.currentTime
  const o = c.createOscillator(), g = c.createGain()
  o.type = "triangle"; o.frequency.value = 440 * Math.pow(2, (i * 2) / 12)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
  o.connect(g).connect(destino(c)); o.start(t); o.stop(t + 0.2)
}

/** a lata sendo chacoalhada: estalos curtos de ruído */
export function chocalho(dur = 0.45) {
  const c = pegar(); if (!c) return
  const t0 = c.currentTime
  const n = 7
  for (let i = 0; i < n; i++) {
    const t = t0 + (i / n) * dur + Math.random() * 0.02
    const s = c.createBufferSource(); s.buffer = bufRuido(c)
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2200 + Math.random() * 2600; f.Q.value = 3
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    s.connect(f).connect(g).connect(destino(c)); s.start(t, Math.random()); s.stop(t + 0.06)
  }
}

/** o chiado do spray: liga/desliga suave; `nivel` 0..1 */
export function spray(nivel: number) {
  const c = pegar(); if (!c) return
  if (!chiado) {
    const fonte = c.createBufferSource(); fonte.buffer = bufRuido(c); fonte.loop = true
    const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2800
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 6500; f.Q.value = 0.6
    const g = c.createGain(); g.gain.value = 0
    fonte.connect(hp).connect(f).connect(g).connect(destino(c)); fonte.start()
    chiado = { g, f, fonte }
  }
  const t = c.currentTime
  chiado.g.gain.setTargetAtTime(nivel > 0 ? 0.16 + Math.random() * 0.04 : 0, t, nivel > 0 ? 0.02 : 0.05)
  chiado.f.frequency.setTargetAtTime(6000 + Math.random() * 1800, t, 0.05)
}

/** o "pronto": um brilho que sobe */
export function assinou() {
  const c = pegar(); if (!c) return
  const t = c.currentTime
  ;[660, 990, 1320].forEach((fr, i) => {
    const o = c.createOscillator(), g = c.createGain()
    o.type = "sine"; o.frequency.value = fr
    g.gain.setValueAtTime(0.0001, t + i * 0.07); g.gain.exponentialRampToValueAtTime(0.16, t + i * 0.07 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.5)
    o.connect(g).connect(destino(c)); o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.55)
  })
}

export function silenciar() {
  if (chiado) chiado.g.gain.value = 0
}
