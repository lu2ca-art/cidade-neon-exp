// B4TIDA estúdio — o motor (ao vivo e no render offline).
//
// Agenda à frente do tempo real (lookahead): cada semicolcheia sai no
// relógio de áudio, então nada atrasa. Toca a SEÇÃO em loop ou a MÚSICA
// inteira (a ordem do arranjo). Cada faixa tem a sua mesa de som (volume,
// pan, envios de reverb e delay, e o efeito da voz). O que você toca ao vivo
// com o "gravar" ligado cai na semicolcheia mais próxima (quantizado),
// descontando o atraso do som no seu ouvido.

import { createMixBus, type MixBus } from "../lib/mixgraph"
import { audiveis, passosDa, segPorPasso, type Evento, type Faixa, type Musica, type Secao } from "./tipos"
import { tocarNota, tocarPad } from "./sons"

const LOOKAHEAD = 0.12
const INTERVALO_MS = 25

export interface Mesa { entrada: GainNode; pan: StereoPannerNode; vol: GainNode; rev: GainNode; dly: GainNode; efeito: string }

// a mesa de uma faixa (usada ao vivo e no render)
export function montarMesa(ctx: BaseAudioContext, bus: MixBus, f: Faixa): Mesa {
  const entrada = ctx.createGain()
  const pan = ctx.createStereoPanner()
  const vol = ctx.createGain()
  const rev = ctx.createGain()
  const dly = ctx.createGain()
  let ultimo: AudioNode = entrada
  // o efeito da voz (presets de rua, rádio, chuva)
  if (f.inst === "voz") {
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 90
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -22
    comp.ratio.value = 3.5
    comp.attack.value = 0.006
    comp.release.value = 0.2
    ultimo.connect(hp)
    hp.connect(comp)
    ultimo = comp
    if (f.efeitoVoz === "radio") {
      const bp = ctx.createBiquadFilter()
      bp.type = "bandpass"
      bp.frequency.value = 1500
      bp.Q.value = 0.9
      const ws = ctx.createWaveShaper()
      const k = 18
      const c = new Float32Array(1024)
      for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) }
      ws.curve = c
      ultimo.connect(bp)
      bp.connect(ws)
      ultimo = ws
    } else if (f.efeitoVoz === "rua") {
      const sh = ctx.createBiquadFilter()
      sh.type = "highshelf"
      sh.frequency.value = 4500
      sh.gain.value = 4
      const pk = ctx.createBiquadFilter()
      pk.type = "peaking"
      pk.frequency.value = 300
      pk.gain.value = -3
      ultimo.connect(pk)
      pk.connect(sh)
      ultimo = sh
    }
  }
  ultimo.connect(pan)
  pan.connect(vol)
  vol.connect(bus.master)
  vol.connect(rev)
  rev.connect(bus.reverbBus)
  vol.connect(dly)
  dly.connect(bus.delayBus)
  const m = { entrada, pan, vol, rev, dly, efeito: f.efeitoVoz ?? "" }
  ajustarMesa(ctx, m, f, false)
  return m
}

export function ajustarMesa(ctx: BaseAudioContext, m: Mesa, f: Faixa, ouvindo: boolean) {
  const t = ctx.currentTime
  const extraChuva = f.inst === "voz" && f.efeitoVoz === "chuva"
  const set = (p: AudioParam, v: number) => (ouvindo ? p.setTargetAtTime(v, t, 0.015) : (p.value = v))
  set(m.vol.gain, f.vol)
  set(m.pan.pan, f.pan)
  set(m.rev.gain, Math.min(1, f.reverb + (extraChuva ? 0.45 : 0)))
  set(m.dly.gain, Math.min(1, f.delay + (extraChuva ? 0.25 : 0)))
}

// toca os eventos de uma faixa num passo (ao vivo e no render)
export function tocarPasso(ctx: BaseAudioContext, out: AudioNode, f: Faixa, eventos: Evento[] | undefined, passo: number, t: number, bpm: number) {
  if (!eventos) return
  const spp = segPorPasso(bpm)
  for (const e of eventos) {
    if (e.p !== passo) continue
    if (f.inst === "bateria") tocarPad(ctx, out, t, f.som, e.n, e.v)
    else if (f.inst !== "voz") tocarNota(ctx, out, t, f.inst, f.som, [e.n], e.d * spp * 0.95, e.v)
  }
}

export const swingDe = (passo: number, swing: number, bpm: number) => (passo % 2 === 1 ? swing * segPorPasso(bpm) * 0.66 : 0)

interface Tique { t: number; bloco: number; secao: string; passo: number }

export class Motor {
  ctx: AudioContext
  bus: MixBus
  private mesas = new Map<string, Mesa>()
  private m: Musica | null = null
  private vozes = new Map<string, AudioBuffer>() // chave do clipe → áudio
  private timer: number | null = null
  private prox = 0
  private bloco = 0
  private passo = 0
  private contagem = 0 // passos de contagem que faltam
  private tiques: Tique[] = []
  private fontesVoz: AudioBufferSourceNode[] = []
  tocando = false
  modo: "secao" | "musica" = "secao"
  secao = ""
  metronomo = false
  atrasoSaida = 0.03 // o som chega no ouvido depois (s)
  onBloco?: (secao: string, inicio: number, fim: number) => void
  onFim?: () => void

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AC({ latencyHint: "interactive" })
    this.bus = createMixBus(this.ctx)
    this.atrasoSaida = Math.min(0.3, (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) + 0.01)
  }

  destruir() {
    this.parar()
    try { void this.ctx.close() } catch {}
  }

  setMusica(m: Musica) {
    this.m = m
    // mesas novas pras faixas novas; as que sumiram saem
    for (const f of m.faixas) {
      const atual = this.mesas.get(f.id)
      if (!atual || (f.inst === "voz" && atual.efeito !== (f.efeitoVoz ?? ""))) {
        if (atual) atual.vol.disconnect()
        this.mesas.set(f.id, montarMesa(this.ctx, this.bus, f))
      } else ajustarMesa(this.ctx, atual, f, true)
    }
    for (const id of [...this.mesas.keys()]) if (!m.faixas.some((f) => f.id === id)) { this.mesas.get(id)!.vol.disconnect(); this.mesas.delete(id) }
    if (!m.secoes.some((s) => s.id === this.secao)) this.secao = m.secoes[0]?.id ?? ""
  }

  setVoz(chave: string, b: AudioBuffer) { this.vozes.set(chave, b) }
  temVoz(chave: string) { return this.vozes.has(chave) }

  private blocos(): Secao[] {
    if (!this.m) return []
    if (this.modo === "secao") { const s = this.m.secoes.find((x) => x.id === this.secao); return s ? [s] : [] }
    return this.m.arranjo.map((id) => this.m!.secoes.find((s) => s.id === id)).filter((s): s is Secao => !!s)
  }

  // começa (com contagem de 1 compasso se for gravar)
  tocar(contar = false, deBloco = 0) {
    if (this.tocando || !this.m) return
    void this.ctx.resume()
    this.tocando = true
    this.bloco = Math.min(deBloco, Math.max(0, this.blocos().length - 1))
    this.passo = 0
    this.contagem = contar ? 16 : 0
    this.prox = this.ctx.currentTime + 0.08
    this.tiques = []
    this.timer = window.setInterval(() => this.agendar(), INTERVALO_MS)
    this.agendar()
  }

  parar() {
    this.tocando = false
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null }
    for (const s of this.fontesVoz) { try { s.stop() } catch {} }
    this.fontesVoz = []
  }

  private clique(t: number, forte: boolean) {
    const o = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    o.frequency.value = forte ? 1760 : 1180
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(forte ? 0.32 : 0.2, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    o.connect(g).connect(this.ctx.destination)
    o.start(t)
    o.stop(t + 0.06)
  }

  private agendar() {
    const m = this.m
    if (!this.tocando || !m) return
    const spp = segPorPasso(m.bpm)
    while (this.prox < this.ctx.currentTime + LOOKAHEAD) {
      if (this.contagem > 0) {
        const k = 16 - this.contagem
        if (k % 4 === 0) this.clique(this.prox, k === 0)
        this.contagem--
        this.prox += spp
        continue
      }
      const bl = this.blocos()
      if (!bl.length) { this.parar(); return }
      if (this.bloco >= bl.length) {
        if (this.modo === "musica" && this.onFim) { const fim = this.onFim; window.setTimeout(fim, Math.max(0, (this.prox - this.ctx.currentTime) * 1000)); this.parar(); return }
        this.bloco = 0
      }
      const s = bl[this.bloco]
      const n = passosDa(s)
      const t = this.prox + swingDe(this.passo, m.swing, m.bpm)
      if (this.passo === 0) {
        const fim = this.prox + n * spp
        this.onBloco?.(s.id, this.prox, fim)
        // a voz gravada daquela seção começa junto
        for (const f of audiveis(m)) {
          const c = s.voz[f.id]
          const b = c && this.vozes.get(c.chave)
          const mesa = this.mesas.get(f.id)
          if (!b || !mesa) continue
          const src = this.ctx.createBufferSource()
          src.buffer = b
          src.connect(mesa.entrada)
          src.start(this.prox)
          src.stop(fim + 0.05)
          this.fontesVoz.push(src)
          src.onended = () => { this.fontesVoz = this.fontesVoz.filter((x) => x !== src) }
        }
      }
      if (this.metronomo && this.passo % 4 === 0) this.clique(this.prox, this.passo % 16 === 0)
      for (const f of audiveis(m)) {
        const mesa = this.mesas.get(f.id)
        if (mesa) tocarPasso(this.ctx, mesa.entrada, f, s.eventos[f.id], this.passo, t, m.bpm)
      }
      this.tiques.push({ t: this.prox, bloco: this.bloco, secao: s.id, passo: this.passo })
      if (this.tiques.length > 128) this.tiques.splice(0, this.tiques.length - 128)
      this.prox += spp
      this.passo++
      if (this.passo >= n) { this.passo = 0; this.bloco++ }
    }
  }

  // onde a música está AGORA (o que você está ouvindo), pra cabeça de leitura
  posicao(): { secao: string; passo: number; bloco: number } | null {
    if (!this.tocando || !this.tiques.length) return null
    const ouvido = this.ctx.currentTime - this.atrasoSaida
    let ult: Tique | null = null
    for (const q of this.tiques) { if (q.t <= ouvido) ult = q; else break }
    if (!ult) return null
    const spp = segPorPasso(this.m!.bpm)
    return { secao: ult.secao, passo: ult.passo + Math.min(0.999, (ouvido - ult.t) / spp), bloco: ult.bloco }
  }

  // um toque ao vivo: em que passo ele cai (quantizado)
  quantizar(): { secao: string; passo: number } | null {
    if (!this.tocando || !this.tiques.length || this.contagem > 0) return null
    const ouvido = this.ctx.currentTime - this.atrasoSaida
    let melhor: Tique | null = null
    for (const q of this.tiques) if (!melhor || Math.abs(q.t - ouvido) < Math.abs(melhor.t - ouvido)) melhor = q
    return melhor ? { secao: melhor.secao, passo: melhor.passo } : null
  }

  // ouvir na hora (tocar no pad/tecla)
  ouvir(f: Faixa, n: number[], v = 0.85, dur = 0.5) {
    void this.ctx.resume()
    const mesa = this.mesas.get(f.id)
    if (!mesa) return
    const t = this.ctx.currentTime + 0.005
    if (f.inst === "bateria") tocarPad(this.ctx, mesa.entrada, t, f.som, n[0], v)
    else if (f.inst !== "voz") tocarNota(this.ctx, mesa.entrada, t, f.inst, f.som, n, dur, v)
  }

  mesa(id: string) { return this.mesas.get(id) }

  configurar(o: { modo?: "secao" | "musica"; secao?: string; metronomo?: boolean; onBloco?: ((secao: string, inicio: number, fim: number) => void) | null }) {
    if (o.modo) this.modo = o.modo
    if (o.secao !== undefined) this.secao = o.secao
    if (o.metronomo !== undefined) this.metronomo = o.metronomo
    if (o.onBloco !== undefined) this.onBloco = o.onBloco ?? undefined
  }
  get emContagem() { return this.contagem > 0 }
}
