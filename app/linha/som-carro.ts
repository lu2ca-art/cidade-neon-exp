// Som do carro: só o motor (pedido do LU2CA — nada de vento, pneu ou
// chiado). Desde 02/10 é um murmúrio grave e redondo, bem embaixo da
// música: antes era dente-de-serra + quadrada, que soava como ruído.
// Agora só senoides graves, filtradas, que sobem de leve com o giro e
// quase somem com o pé fora. Quem dá a sensação de acelerar é a vibração
// (tremor), não o volume.

import { audioCtx } from "./som"

export const MARCHAS = [0, 0.2, 0.4, 0.6, 0.8, 1.45]

// vibração de evento (pouso, turbo, finta…): marca a hora, pra o tremor
// da aceleração não atropelar o padrão no meio
let ultimoEvento = 0
export function vib(p: number | number[]) {
  ultimoEvento = performance.now()
  try { navigator.vibrate?.(p) } catch {}
}

// Tremor de aceleração: pulsos curtos e leves enquanto acelera. A API de
// vibração não tem força, então a intensidade vem do ritmo e da duração:
// devagar = um toque leve de vez em quando; rápido = pulsos mais longos e
// mais juntos. Só no celular que vibra (Android; o iPhone não deixa site
// vibrar). intensidade: 0–1
let proxTremor = 0
export function tremor(acelerando: boolean, intensidade: number) {
  const agora = performance.now()
  if (!acelerando || intensidade <= 0.02) return
  if (agora - ultimoEvento < 400 || agora < proxTremor) return
  const k = Math.min(1, intensidade)
  const dur = Math.round(5 + k * 11) // 5ms → 16ms
  proxTremor = agora + 300 - k * 190 // a cada 300ms → 110ms
  try { navigator.vibrate?.(dur) } catch {}
}

/* ─── motor de som ──────────────────────────────────────── */
export function montarMotor() {
  const c = audioCtx()
  if (!c) return null
  const out = c.createGain()
  out.gain.value = 0
  // mistura do carro bem abaixo da música (pedido do LU2CA)
  out.gain.setTargetAtTime(0.28, c.currentTime, 0.6)
  out.connect(c.destination)

  // dois tons graves e limpos (fundamental e quinta), sem harmônico áspero
  const o1 = c.createOscillator()
  o1.type = "sine"
  const o2 = c.createOscillator()
  o2.type = "triangle"
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 220
  lp.Q.value = 0.5
  const mg = c.createGain()
  mg.gain.value = 0
  const g2 = c.createGain()
  g2.gain.value = 0.35
  o1.connect(lp)
  o2.connect(g2).connect(lp)
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
      // giro sobe pouco (é murmúrio, não grito) e devagar
      const f = 46 + rpm * 38 + m * 5 + (turbo ? 8 : 0) + rev * 12
      o1.frequency.setTargetAtTime(f, t, 0.12)
      o2.frequency.setTargetAtTime(f * 1.5, t, 0.12)
      lp.frequency.setTargetAtTime(180 + rpm * 160 * (acel ? 1 : 0.4) + (turbo ? 80 : 0), t, 0.15)
      // parado ou solto: some. acelerando: um fundo baixinho
      const vivo = pct > 0.02 ? 1 : 0.2
      mg.gain.setTargetAtTime((acel ? 0.03 : 0.004) * vivo, t, acel ? 0.25 : 0.5)
      if (m !== ultimaMarcha) {
        // troca de marcha: só um respiro no volume, sem tranco
        if (m > ultimaMarcha && acel) {
          mg.gain.cancelScheduledValues(t)
          mg.gain.setValueAtTime(0.018, t)
          mg.gain.linearRampToValueAtTime(0.03, t + 0.25)
          vib(10)
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
      g.gain.setValueAtTime(0.25, c.currentTime)
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
