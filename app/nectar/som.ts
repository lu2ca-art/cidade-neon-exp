// som mínimo da leitura (a página roda fora da Linha 222, então tem o seu)

let ctx: AudioContext | null = null
export function ac() {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}

const PENTA = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99]
export function nota(i: number, vol = 0.18) {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = "sine"
  o.frequency.value = PENTA[((i % 8) + 8) % 8]
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 1.5)
}

let drone: { g: GainNode; os: OscillatorNode[] } | null = null
export function ligarDrone(on: boolean) {
  const c = ac()
  if (!c) return
  if (on && !drone) {
    const g = c.createGain()
    g.gain.value = 0
    const lp = c.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 700
    const os = [73.42, 110, 146.83, 220].map((f, i) => {
      const o = c.createOscillator()
      o.type = i % 2 ? "triangle" : "sine"
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 5
      o.connect(lp)
      o.start()
      return o
    })
    lp.connect(g).connect(c.destination)
    drone = { g, os }
  }
  if (drone) drone.g.gain.setTargetAtTime(on ? 0.05 : 0, c.currentTime, on ? 2 : 0.5)
}

export function vib(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

function tom(c: AudioContext, f: number, t: number, dur: number, vol: number, tipo: OscillatorType = "sine") {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = tipo
  o.frequency.value = f
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + dur + 0.05)
}

// os quatro sons da pergunta "o que você sente?" — cada um é um sentimento
// (vazio, culpa, impulso, tédio), sem palavra
export function somDoSentimento(i: number) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + 0.02
  if (i === 0) {
    // vazio: um grave que quase não existe, tremendo
    const o = c.createOscillator()
    const g = c.createGain()
    const lfo = c.createOscillator()
    const lg = c.createGain()
    o.frequency.value = 55
    lfo.frequency.value = 3
    lg.gain.value = 0.05
    lfo.connect(lg).connect(g.gain)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.14, t + 0.8)
    g.gain.linearRampToValueAtTime(0.0001, t + 2.4)
    o.connect(g).connect(c.destination)
    o.start(t); lfo.start(t)
    o.stop(t + 2.5); lfo.stop(t + 2.5)
  } else if (i === 1) {
    // culpa: acorde menor com um coração batendo por baixo
    ;[293.66, 349.23, 440].forEach((f) => tom(c, f, t, 2.2, 0.06, "triangle"))
    ;[0, 0.28, 1, 1.28].forEach((d, k) => tom(c, k % 2 ? 50 : 60, t + d, 0.25, 0.3))
  } else if (i === 2) {
    // impulso: arpejo rápido subindo, sem respirar
    ;[293.66, 392, 523.25, 698.46, 880, 1174.66, 1567.98].forEach((f, k) => tom(c, f, t + k * 0.06, 0.18, 0.08, "square"))
  } else {
    // tédio: a mesma nota, igual, de novo
    ;[0, 0.45, 0.9, 1.35].forEach((d) => tom(c, 392, t + d, 0.3, 0.1, "sine"))
  }
}
