// Som do carro: só o motor (pedido do LU2CA — nada de vento, pneu ou
// chiado). Sintetizado com marchas, reage à velocidade real e só ronca
// de verdade quando acelera; solto, vira um ronco baixinho.

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
  // mistura do carro bem abaixo da música (pedido do LU2CA)
  out.gain.setTargetAtTime(0.32, c.currentTime, 0.4)
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
  mg.gain.value = 0
  o1.connect(lp)
  o2.connect(lp)
  lp.connect(mg).connect(out)
  o1.start()
  o2.start()

  let ultimaMarcha = 1
  let rev = 0 // empurrão de giro do turbo, decai sozinho
  return {
    atualizar(pct: number, acel: boolean, turbo: boolean) {
      const t = c.currentTime
      let m = 1
      while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
      const lo = MARCHAS[m - 1]
      const hi = MARCHAS[m]
      const rpm = Math.max(0, Math.min(1, (pct - lo) / (hi - lo)))
      rev *= 0.94
      const f = 42 + rpm * 95 + m * 9 + (turbo ? 18 : 0) + rev * 30
      o1.frequency.setTargetAtTime(f, t, 0.04)
      o2.frequency.setTargetAtTime(f / 2, t, 0.04)
      lp.frequency.setTargetAtTime(260 + rpm * 1500 * (acel ? 1 : 0.35) + (turbo ? 900 : 0), t, 0.05)
      // parado ou solto: quase mudo. acelerando: ronca
      const vivo = pct > 0.02 ? 1 : 0.3
      mg.gain.setTargetAtTime((acel ? 0.065 : 0.008) * vivo, t, acel ? 0.08 : 0.25)
      if (m !== ultimaMarcha) {
        if (m > ultimaMarcha && acel) {
          mg.gain.cancelScheduledValues(t)
          mg.gain.setValueAtTime(0.005, t)
          mg.gain.linearRampToValueAtTime(0.065, t + 0.14)
          vib(14)
        }
        ultimaMarcha = m
      }
      return m
    },
    parar() {
      out.gain.setTargetAtTime(0, c.currentTime, 0.2)
      setTimeout(() => {
        try { o1.stop(); o2.stop() } catch {}
        out.disconnect()
      }, 800)
    },
    // pouso: um baque grave, sem chiado
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
    // turbo / decolagem: o motor sobe o giro de uma vez
    whoosh() {
      rev = 1
    },
  }
}
