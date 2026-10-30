// Os sons do ginásio, sintetizados (nada de arquivo): a bola quicando, a
// rede, a raquete, a torcida.
import { canal, mesaCtx } from "@/lib/mesa"

// (T40b) o contexto e a saída são os da mesa de mixagem (lib/mesa.ts): um só
// no jogo inteiro, com o volume, o mudo e o limitador
export function ac() { return mesaCtx() }
const fx = (c: AudioContext) => canal("efeitos") ?? c.destination
function ruido(c: AudioContext, seg: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seg), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}
export function quica(forca = 1) {
  const c = ac(); if (!c) return
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain()
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.12)
  g.gain.setValueAtTime(0.5 * forca, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
  o.connect(g).connect(fx(c)); o.start(t); o.stop(t + 0.16)
}
export function rede() {
  const c = ac(); if (!c) return
  const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = ruido(c, 0.4); f.type = "highpass"; f.frequency.value = 3500
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
  s.connect(f).connect(g).connect(fx(c)); s.start(t)
}
export function aro() {
  const c = ac(); if (!c) return
  const t = c.currentTime
  for (const fr of [620, 935]) { const o = c.createOscillator(), g = c.createGain(); o.type = "triangle"; o.frequency.value = fr; g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); o.connect(g).connect(fx(c)); o.start(t); o.stop(t + 0.42) }
}
export function raquete(agudo = false) {
  const c = ac(); if (!c) return
  const t = c.currentTime, o = c.createOscillator(), g = c.createGain()
  o.type = "square"; o.frequency.value = agudo ? 1200 : 900
  g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
  o.connect(g).connect(fx(c)); o.start(t); o.stop(t + 0.06)
}
export function torcida(forte = false) {
  const c = ac(); if (!c) return
  const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = ruido(c, 1.6); f.type = "bandpass"; f.frequency.value = forte ? 1300 : 900; f.Q.value = 0.6
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(forte ? 0.3 : 0.15, t + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5)
  s.connect(f).connect(g).connect(fx(c)); s.start(t)
}
