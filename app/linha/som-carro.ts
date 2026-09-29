// Som do carro: motor sintetizado com marchas, vento, pneu, zebra, baque
// e whoosh. Nada de sample — tudo Web Audio, reage à velocidade real.

import { audioCtx } from "./som"

export const MARCHAS = [0, 0.2, 0.4, 0.6, 0.8, 1.45]

export function vib(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

/* ─── motor de som ──────────────────────────────────────── */
export function montarMotor() {
  const c = audioCtx()
  if (!c) return null
  const out = c.createGain()
  out.gain.value = 0
  out.gain.setTargetAtTime(1, c.currentTime, 0.4)
  out.connect(c.destination)

  const o1 = c.createOscillator()
  o1.type = "sawtooth"
  const o2 = c.createOscillator()
  o2.type = "square"
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 500
  lp.Q.value = 4
  const mg = c.createGain()
  mg.gain.value = 0.05
  o1.connect(lp)
  o2.connect(lp)
  lp.connect(mg).connect(out)

  const ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
  const d = ruido.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const fonteRuido = (f: number, q: number, tipo: BiquadFilterType) => {
    const s = c.createBufferSource()
    s.buffer = ruido
    s.loop = true
    const bf = c.createBiquadFilter()
    bf.type = tipo
    bf.frequency.value = f
    bf.Q.value = q
    const g = c.createGain()
    g.gain.value = 0
    s.connect(bf).connect(g).connect(out)
    s.start()
    return { s, g }
  }
  const vento = fonteRuido(900, 0.4, "bandpass")
  const pneu = fonteRuido(2600, 9, "bandpass")
  const zebra = fonteRuido(140, 1, "lowpass")
  o1.start()
  o2.start()

  let ultimaMarcha = 1
  return {
    atualizar(pct: number, acel: boolean, curvaPneu: number, naZebra: boolean, turbo: boolean) {
      const t = c.currentTime
      let m = 1
      while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
      const lo = MARCHAS[m - 1]
      const hi = MARCHAS[m]
      const rpm = Math.max(0, Math.min(1, (pct - lo) / (hi - lo)))
      const f = 42 + rpm * 95 + m * 9 + (turbo ? 18 : 0)
      o1.frequency.setTargetAtTime(f, t, 0.04)
      o2.frequency.setTargetAtTime(f / 2, t, 0.04)
      lp.frequency.setTargetAtTime(300 + rpm * 1500 * (acel ? 1 : 0.5) + (turbo ? 900 : 0), t, 0.05)
      mg.gain.setTargetAtTime(0.035 + (acel ? 0.03 : 0.01), t, 0.08)
      vento.g.gain.setTargetAtTime(pct * pct * 0.13, t, 0.1)
      pneu.g.gain.setTargetAtTime(curvaPneu * 0.07, t, 0.05)
      zebra.g.gain.setTargetAtTime(naZebra ? 0.5 : 0, t, 0.03)
      if (m !== ultimaMarcha) {
        if (m > ultimaMarcha) {
          mg.gain.cancelScheduledValues(t)
          mg.gain.setValueAtTime(0.005, t)
          mg.gain.linearRampToValueAtTime(0.06, t + 0.14)
          vib(14)
        }
        ultimaMarcha = m
      }
      return m
    },
    parar() {
      out.gain.setTargetAtTime(0, c.currentTime, 0.2)
      setTimeout(() => {
        try { o1.stop(); o2.stop(); vento.s.stop(); pneu.s.stop(); zebra.s.stop() } catch {}
        out.disconnect()
      }, 800)
    },
    baque() {
      const s = c.createOscillator()
      const g = c.createGain()
      s.type = "sine"
      s.frequency.setValueAtTime(90, c.currentTime)
      s.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.35)
      g.gain.setValueAtTime(0.6, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
      s.connect(g).connect(out)
      s.start()
      s.stop(c.currentTime + 0.45)
    },
    whoosh() {
      const s = c.createBufferSource()
      s.buffer = ruido
      const bf = c.createBiquadFilter()
      bf.type = "bandpass"
      bf.Q.value = 1.2
      bf.frequency.setValueAtTime(400, c.currentTime)
      bf.frequency.exponentialRampToValueAtTime(3000, c.currentTime + 0.3)
      const g = c.createGain()
      g.gain.setValueAtTime(0.35, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
      s.connect(bf).connect(g).connect(out)
      s.start()
      s.stop(c.currentTime + 0.45)
    },
  }
}

