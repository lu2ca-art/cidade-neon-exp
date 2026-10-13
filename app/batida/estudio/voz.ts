// B4TIDA estúdio — a voz sem atraso.
//
// O microfone entra no MESMO relógio da música: um AudioWorklet copia cada
// amostra que chega, junto com o instante do relógio de áudio em que ela
// chegou. Assim dá pra recortar exatamente o pedaço que corresponde à seção.
// O atraso de ida e volta (o som sai do alto-falante, você canta junto, a
// voz volta pelo microfone) é MEDIDO uma vez (calibrar: o app toca cliques e
// ouve eles pelo microfone) e descontado no recorte. Sem calibrar, usa o que
// o navegador informa. O cancelamento de eco, a supressão de ruído e o ganho
// automático do navegador ficam DESLIGADOS (pioram o som e somam atraso).

const CODIGO_WORKLET = `
class Gravador extends AudioWorkletProcessor {
  constructor() { super(); this.ligado = false; this.port.onmessage = (e) => { this.ligado = e.data === "ligar" } }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (this.ligado && ch) this.port.postMessage({ quadro: currentFrame, dados: ch.slice(0) })
    return true
  }
}
registerProcessor("gravador-b4tida", Gravador)
`

const CHAVE_ATRASO = "b4tida-atraso-voz"

export function atrasoSalvo(): number | null {
  try { const v = localStorage.getItem(CHAVE_ATRASO); return v ? Number(v) : null } catch { return null }
}

export class Microfone {
  private ctx: AudioContext
  private stream: MediaStream | null = null
  private no: AudioWorkletNode | null = null
  private pedacos: { quadro: number; dados: Float32Array }[] = []
  private ligado = false

  constructor(ctx: AudioContext) { this.ctx = ctx }

  get aberto() { return !!this.no }

  async abrir() {
    if (this.no) return
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    })
    const url = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: "application/javascript" }))
    await this.ctx.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const fonte = this.ctx.createMediaStreamSource(this.stream)
    this.no = new AudioWorkletNode(this.ctx, "gravador-b4tida", { numberOfInputs: 1, numberOfOutputs: 0 })
    this.no.port.onmessage = (e) => { if (this.ligado) this.pedacos.push(e.data) }
    fonte.connect(this.no)
  }

  fechar() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.no?.disconnect()
    this.no = null
    this.stream = null
  }

  // atraso de ida e volta: o que o navegador diz (sem calibrar)
  atrasoEstimado() {
    const entrada = (this.stream?.getAudioTracks()[0]?.getSettings() as { latency?: number } | undefined)?.latency ?? 0.012
    return Math.min(0.4, (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) + entrada)
  }

  atraso() { return atrasoSalvo() ?? this.atrasoEstimado() }

  comecar() {
    this.pedacos = []
    this.ligado = true
    this.no?.port.postMessage("ligar")
  }

  parar() {
    this.ligado = false
    this.no?.port.postMessage("desligar")
  }

  // recorta [t0, t0+dur] do relógio de áudio (já com o atraso descontado)
  recortar(t0: number, dur: number, atraso = this.atraso()): AudioBuffer | null {
    if (!this.pedacos.length) return null
    const sr = this.ctx.sampleRate
    const ini = Math.round((t0 + atraso) * sr)
    const n = Math.round(dur * sr)
    const out = this.ctx.createBuffer(1, n, sr)
    const d = out.getChannelData(0)
    for (const p of this.pedacos) {
      const a = p.quadro - ini
      if (a + p.dados.length < 0 || a >= n) continue
      for (let i = Math.max(0, -a); i < p.dados.length && a + i < n; i++) d[a + i] = p.dados[i]
    }
    // bordas suaves (sem estalo no loop)
    const f = Math.min(256, n >> 3)
    for (let i = 0; i < f; i++) { d[i] *= i / f; d[n - 1 - i] *= i / f }
    return out
  }

  // calibrar: toca 8 cliques pelo alto-falante e mede quando eles voltam
  async calibrar(): Promise<number | null> {
    await this.abrir()
    const sr = this.ctx.sampleRate
    const t0 = this.ctx.currentTime + 0.4
    const passo = 0.5
    const cliques = Array.from({ length: 8 }, (_, i) => t0 + i * passo)
    for (const t of cliques) {
      const o = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      o.frequency.value = 2000
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.9, t + 0.001)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03)
      o.connect(g).connect(this.ctx.destination)
      o.start(t)
      o.stop(t + 0.04)
    }
    this.comecar()
    await new Promise((r) => setTimeout(r, (0.4 + 8 * passo + 0.5) * 1000))
    this.parar()
    // pra cada clique, o primeiro pico forte depois dele
    const sinal = this.recortar(t0 - 0.05, 8 * passo + 0.4, 0)
    if (!sinal) return null
    const d = sinal.getChannelData(0)
    let ruido = 0
    for (let i = 0; i < Math.min(d.length, sr * 0.04); i++) ruido = Math.max(ruido, Math.abs(d[i]))
    const limiar = Math.max(0.02, ruido * 4)
    const medidas: number[] = []
    for (const t of cliques) {
      const a = Math.round((t - (t0 - 0.05)) * sr)
      for (let i = a; i < Math.min(d.length, a + sr * 0.45); i++) {
        if (Math.abs(d[i]) > limiar) { medidas.push((i - a) / sr); break }
      }
    }
    if (medidas.length < 5) return null
    medidas.sort((a, b) => a - b)
    const v = medidas[Math.floor(medidas.length / 2)]
    try { localStorage.setItem(CHAVE_ATRASO, String(v)) } catch {}
    return v
  }
}

// AudioBuffer → WAV (mono/estéreo 16-bit), com metadados opcionais (LIST/INFO)
export function paraWav(b: AudioBuffer, info?: Record<string, string>): Blob {
  const nc = b.numberOfChannels, sr = b.sampleRate, n = b.length
  const dados = n * nc * 2
  // bloco de informação (título, artista, comentário)
  const partes: Uint8Array[] = []
  if (info) {
    const enc = new TextEncoder()
    const subs: Uint8Array[] = []
    for (const [k, v] of Object.entries(info)) {
      const txt = enc.encode(v + "\0")
      const pad = txt.length % 2
      const sub = new Uint8Array(8 + txt.length + pad)
      sub.set(enc.encode(k.slice(0, 4).padEnd(4, " ")), 0)
      new DataView(sub.buffer).setUint32(4, txt.length, true)
      sub.set(txt, 8)
      subs.push(sub)
    }
    const tam = 4 + subs.reduce((s, x) => s + x.length, 0)
    const lista = new Uint8Array(8 + tam)
    lista.set(enc.encode("LIST"), 0)
    new DataView(lista.buffer).setUint32(4, tam, true)
    lista.set(enc.encode("INFO"), 8)
    let o = 12
    for (const x of subs) { lista.set(x, o); o += x.length }
    partes.push(lista)
  }
  const extra = partes.reduce((s, x) => s + x.length, 0)
  const ab = new ArrayBuffer(44 + extra + dados)
  const v = new DataView(ab)
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  w(0, "RIFF"); v.setUint32(4, 36 + extra + dados, true); w(8, "WAVE")
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true)
  let o = 36
  for (const p of partes) { new Uint8Array(ab, o, p.length).set(p); o += p.length }
  w(o, "data"); v.setUint32(o + 4, dados, true); o += 8
  const chs = Array.from({ length: nc }, (_, c) => b.getChannelData(c))
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) { const x = Math.max(-1, Math.min(1, chs[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7fff, true); o += 2 }
  return new Blob([ab], { type: "audio/wav" })
}
