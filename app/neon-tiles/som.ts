// Som do GUITAR DRIVER. A faixa passa por um filtro: quando você erra, ele
// fecha e a música "abafa" (no Guitar Hero a guitarra some; aqui só temos
// a mix, então abafar é o equivalente honesto). A galera é ruído filtrado
// que cresce com o medidor. Baquetas no count-in, grito no fim.

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

function ruido(c: AudioContext, seg = 2) {
  const b = c.createBuffer(1, c.sampleRate * seg, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return b
}

export async function carregarBuffer(url: string) {
  const c = ac()
  if (!c) throw new Error("sem áudio")
  const r = await fetch(url)
  return c.decodeAudioData(await r.arrayBuffer())
}

// só o grave da faixa, pra gerar as notas do baixo a partir do baixo real
export async function soGrave(buf: AudioBuffer) {
  const off = new OfflineAudioContext(1, buf.length, buf.sampleRate)
  const src = off.createBufferSource()
  src.buffer = buf
  const lp = off.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 220
  lp.Q.value = 0.9
  src.connect(lp).connect(off.destination)
  src.start()
  return off.startRendering()
}

export interface Show {
  tocar: (buf: AudioBuffer, emSeg?: number) => void
  tempo: () => number // segundos da faixa
  errou: () => void
  acertou: () => void
  galera: (nivel: number) => void // 0..1
  grito: (forte: boolean) => void
  baqueta: () => void
  neon: (on: boolean) => void
  parar: () => void
}

export function montarShow(): Show | null {
  const c = ac()
  if (!c) return null
  const out = c.createGain()
  out.connect(c.destination)
  const filtro = c.createBiquadFilter()
  filtro.type = "lowpass"
  filtro.frequency.value = 20000
  const vol = c.createGain()
  vol.gain.value = 0.95
  filtro.connect(vol).connect(out)

  // galera: ruído rosado com um pouco de "vogal" (banda em ~900Hz)
  const g1 = c.createBufferSource()
  g1.buffer = ruido(c, 3)
  g1.loop = true
  const bp = c.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = 900
  bp.Q.value = 0.7
  const galeraG = c.createGain()
  galeraG.gain.value = 0.02
  g1.connect(bp).connect(galeraG).connect(out)
  g1.start()

  let src: AudioBufferSourceNode | null = null
  let inicio = 0
  let offset = 0

  return {
    tocar(buf, emSeg = 0) {
      src?.stop()
      src = c.createBufferSource()
      src.buffer = buf
      src.connect(filtro)
      inicio = c.currentTime + 0.05
      offset = emSeg
      src.start(inicio, emSeg)
    },
    tempo: () => (src ? c.currentTime - inicio + offset : 0),
    errou() {
      const t = c.currentTime
      filtro.frequency.cancelScheduledValues(t)
      filtro.frequency.setValueAtTime(420, t)
      filtro.frequency.exponentialRampToValueAtTime(20000, t + 0.55)
      // "clanc" de corda errada
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = "sawtooth"
      o.frequency.setValueAtTime(92, t)
      o.frequency.exponentialRampToValueAtTime(60, t + 0.18)
      g.gain.setValueAtTime(0.09, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      o.connect(g).connect(out)
      o.start(t)
      o.stop(t + 0.25)
    },
    acertou() {
      /* a própria música é a recompensa: só garante o filtro aberto */
    },
    galera(n) {
      galeraG.gain.setTargetAtTime(0.015 + n * n * 0.09, c.currentTime, 0.4)
      bp.frequency.setTargetAtTime(700 + n * 700, c.currentTime, 0.6)
    },
    grito(forte) {
      const t = c.currentTime
      const s = c.createBufferSource()
      s.buffer = ruido(c, 3)
      const f = c.createBiquadFilter()
      f.type = "bandpass"
      f.frequency.value = forte ? 1400 : 500
      f.Q.value = 0.5
      const g = c.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(forte ? 0.35 : 0.18, t + 0.3)
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.8)
      s.connect(f).connect(g).connect(out)
      s.start(t)
      s.stop(t + 3)
    },
    baqueta() {
      const t = c.currentTime
      const s = c.createBufferSource()
      s.buffer = ruido(c, 0.2)
      const f = c.createBiquadFilter()
      f.type = "highpass"
      f.frequency.value = 2500
      const g = c.createGain()
      g.gain.setValueAtTime(0.5, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      s.connect(f).connect(g).connect(out)
      s.start(t)
    },
    neon(on) {
      vol.gain.setTargetAtTime(on ? 1.1 : 0.95, c.currentTime, 0.2)
    },
    parar() {
      try { src?.stop() } catch {}
      try { g1.stop() } catch {}
      out.gain.setTargetAtTime(0, c.currentTime, 0.2)
      setTimeout(() => out.disconnect(), 800)
    },
  }
}
