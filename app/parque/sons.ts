// Os sons da montanha-russa, sintetizados: a corrente estalando na subida, o
// vento que cresce com a velocidade e o ronco das rodas no trilho.

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

// (T40b) o ruído do estalo é feito uma vez (antes: um buffer novo a cada estalo)
let estaloBuf: AudioBuffer | null = null
export function estalo() {
  const c = ac(); if (!c) return
  const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = estaloBuf && estaloBuf.sampleRate === c.sampleRate ? estaloBuf : (estaloBuf = ruido(c, 0.04)); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 3
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.035)
  s.connect(f).connect(g).connect(fx(c)); s.start(t)
}

// vento + rodas: um laço contínuo, o volume e o brilho seguem a velocidade
export function criarVento() {
  const c = ac(); if (!c) return null
  const vento = c.createBufferSource(); vento.buffer = ruido(c, 2); vento.loop = true
  const fv = c.createBiquadFilter(); fv.type = "lowpass"; fv.frequency.value = 300
  const gv = c.createGain(); gv.gain.value = 0
  vento.connect(fv).connect(gv).connect(canal("ambiente") ?? c.destination) // (T40b) o vento é ambiente
  const roda = c.createOscillator(); roda.type = "sawtooth"; roda.frequency.value = 40
  const fr = c.createBiquadFilter(); fr.type = "lowpass"; fr.frequency.value = 160
  const gr = c.createGain(); gr.gain.value = 0
  roda.connect(fr).connect(gr).connect(fx(c))
  vento.start(); roda.start()
  return {
    vel(v: number) {
      const t = c.currentTime, k = Math.min(1, v / 28)
      gv.gain.setTargetAtTime(0.02 + k * k * 0.5, t, 0.08)
      fv.frequency.setTargetAtTime(300 + k * 2600, t, 0.08)
      gr.gain.setTargetAtTime(v > 0.3 ? 0.04 + k * 0.08 : 0, t, 0.1)
      roda.frequency.setTargetAtTime(30 + v * 2.2, t, 0.1)
    },
    parar() {
      const t = c.currentTime
      gv.gain.setTargetAtTime(0, t, 0.1); gr.gain.setTargetAtTime(0, t, 0.1)
      setTimeout(() => { try { vento.stop(); roda.stop() } catch {} }, 600)
    },
  }
}

export function sino() {
  const c = ac(); if (!c) return
  const t = c.currentTime
  for (const [f, d] of [[880, 0], [1320, 0.12]] as const) {
    const o = c.createOscillator(), g = c.createGain()
    o.type = "triangle"; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.6)
    o.connect(g).connect(fx(c)); o.start(t + d); o.stop(t + d + 0.7)
  }
}
