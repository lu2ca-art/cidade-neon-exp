// Os sons da montanha-russa, sintetizados: a corrente estalando na subida, o
// vento que cresce com a velocidade e o ronco das rodas no trilho.

let ctx: AudioContext | null = null
export function ac() {
  if (typeof window === "undefined") return null
  if (!ctx) { const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!AC) return null; ctx = new AC() }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

function ruido(c: AudioContext, seg: number) {
  const b = c.createBuffer(1, Math.ceil(c.sampleRate * seg), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

export function estalo() {
  const c = ac(); if (!c) return
  const t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
  s.buffer = ruido(c, 0.04); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 3
  g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.035)
  s.connect(f).connect(g).connect(c.destination); s.start(t)
}

// vento + rodas: um laço contínuo, o volume e o brilho seguem a velocidade
export function criarVento() {
  const c = ac(); if (!c) return null
  const vento = c.createBufferSource(); vento.buffer = ruido(c, 2); vento.loop = true
  const fv = c.createBiquadFilter(); fv.type = "lowpass"; fv.frequency.value = 300
  const gv = c.createGain(); gv.gain.value = 0
  vento.connect(fv).connect(gv).connect(c.destination)
  const roda = c.createOscillator(); roda.type = "sawtooth"; roda.frequency.value = 40
  const fr = c.createBiquadFilter(); fr.type = "lowpass"; fr.frequency.value = 160
  const gr = c.createGain(); gr.gain.value = 0
  roda.connect(fr).connect(gr).connect(c.destination)
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
    o.connect(g).connect(c.destination); o.start(t + d); o.stop(t + d + 0.7)
  }
}
