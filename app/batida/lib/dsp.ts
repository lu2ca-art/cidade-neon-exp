// ─── utilitários de DSP compartilhados (Web Audio) ──────────────────────────
// Tudo aqui funciona tanto com AudioContext (tempo real) quanto com
// OfflineAudioContext (render pro export) — nunca lemos ctx.currentTime,
// sempre recebemos o tempo absoluto como parâmetro.

export function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2048
  const curve = new Float32Array(n)
  const k = amount * 100
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
  }
  return curve
}

export function createDistortion(ctx: BaseAudioContext, amount: number): WaveShaperNode {
  const shaper = ctx.createWaveShaper()
  shaper.curve = makeDistortionCurve(amount)
  shaper.oversample = "2x"
  return shaper
}

// impulso de reverb algorítmico (ruído branco com decaimento exponencial) —
// não depende de nenhum arquivo de áudio externo
export function createImpulseResponse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate
  const length = Math.max(1, Math.floor(rate * seconds))
  const impulse = ctx.createBuffer(2, length, rate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

// LFO simples aplicado a um AudioParam (usado pro tremolo do Rhodes e pro
// auto-wah do baixo funk) — agenda a curva inteira de uma vez, funciona
// igual em tempo real e no render offline
export function scheduleLfo(param: AudioParam, startTime: number, durSec: number, opts: { rateHz: number; base: number; depth: number; steps?: number }) {
  const steps = opts.steps ?? Math.max(8, Math.floor(durSec * opts.rateHz * 8))
  const curve = new Float32Array(steps)
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * durSec
    curve[i] = opts.base + Math.sin(2 * Math.PI * opts.rateHz * t) * opts.depth
  }
  param.setValueCurveAtTime(curve, startTime, durSec)
}

export function connectChain(nodes: AudioNode[]): AudioNode {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1])
  return nodes[nodes.length - 1]
}
