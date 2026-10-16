// A RÁDIO DA CIDADE NOVA (etapa 3; as regras do LU2CA em 15/10). A música
// não depende do lugar: cada frequência é uma rádio e todas tocam as faixas
// LANÇADAS, inteiras; a que ainda não teve a missão liberada toca abafada
// (sem chiado). O catálogo antigo fica abafado até todas as missões. Prévia
// não lançada nunca entra. (Quando a rádio nova do jogo subir, isto vira a
// mesma coisa que linha/radio.ts.)

import { ESTACOES, lancada, type EstacaoId } from "../linha/data"
import { ARQUIVO, FREQUENCIAS, type FreqId } from "../linha/radio"

export interface Faixa { titulo: string; src: string; abafada: boolean }

const saiu = (titulo: string, agora: number) => {
  const e = ESTACOES.find((x) => titulo.toLowerCase().startsWith(x.faixa.toLowerCase()))
  return !e || lancada(e, agora)
}
const ganhou = (titulo: string, objetos: string[]) => {
  const e = ESTACOES.find((x) => titulo.toLowerCase().startsWith(x.faixa.toLowerCase()))
  return !!e && objetos.includes(e.id)
}

export function faixasDaRadio(id: FreqId, objetos: string[], agora = Date.now()): Faixa[] {
  const f = FREQUENCIAS.find((x) => x.id === id)!
  const lancadas = ESTACOES.filter((e) => lancada(e, agora))
  const todas = lancadas.length > 0 && lancadas.every((e) => objetos.includes(e.id as EstacaoId))
  const vol1 = lancadas.map((e) => ({ titulo: e.faixa, src: e.audio, abafada: !objetos.includes(e.id) }))
  if (id === "linha") return vol1
  if (id === "full") return [...vol1, ...ARQUIVO.map((x) => ({ ...x, abafada: !todas }))]
  if (id === "suburbio") return f.faixas.map((x) => ({ ...x, abafada: !todas }))
  return f.faixas.filter((x) => saiu(x.titulo, agora)).map((x) => ({ ...x, abafada: !ganhou(x.titulo, objetos) }))
}

// o aparelho: um <audio> passando por um filtro (abafa sem chiado)
export class Radio {
  private el: HTMLAudioElement | null = null
  private ctx: AudioContext | null = null
  private filtro: BiquadFilterNode | null = null
  private fila: Faixa[] = []
  private i = 0
  freq: FreqId = "linha"
  agora: Faixa | null = null
  ligada = false
  aoMudar: (() => void) | null = null

  private garantir() {
    if (this.el) return
    this.el = new Audio(); this.el.crossOrigin = "anonymous"; this.el.preload = "auto"
    this.el.addEventListener("ended", () => this.proxima())
    try {
      this.ctx = new AudioContext()
      const src = this.ctx.createMediaElementSource(this.el)
      this.filtro = this.ctx.createBiquadFilter(); this.filtro.type = "lowpass"; this.filtro.frequency.value = 20000; this.filtro.Q.value = 0.7
      src.connect(this.filtro).connect(this.ctx.destination)
    } catch {}
  }
  sintonizar(id: FreqId, objetos: string[]) {
    this.freq = id
    const l = faixasDaRadio(id, objetos)
    // embaralha (cada rádio é uma programação, não uma playlist em ordem)
    for (let k = l.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [l[k], l[j]] = [l[j], l[k]] }
    this.fila = l; this.i = -1
    if (this.ligada) this.proxima()
    else this.aoMudar?.()
  }
  ligar() {
    this.garantir(); this.ligada = true
    if (this.ctx?.state === "suspended") void this.ctx.resume()
    if (!this.agora) this.proxima(); else void this.el!.play().catch(() => {})
    this.aoMudar?.()
  }
  desligar() { this.ligada = false; this.el?.pause(); this.aoMudar?.() }
  proxima() {
    if (!this.fila.length || !this.el) { this.agora = null; this.aoMudar?.(); return }
    this.i = (this.i + 1) % this.fila.length
    const f = this.fila[this.i]; this.agora = f
    if (this.filtro && this.ctx) this.filtro.frequency.setTargetAtTime(f.abafada ? 900 : 20000, this.ctx.currentTime, 0.2)
    this.el.src = f.src
    if (this.ligada) void this.el.play().catch(() => {})
    this.aoMudar?.()
  }
  // dentro de um lugar ou no mapa: o som baixa
  volume(v: number) { if (this.el) this.el.volume = Math.max(0, Math.min(1, v)) }
  parar() { this.el?.pause(); void this.ctx?.close() }
}

export const RADIOS = FREQUENCIAS.map((f) => ({ id: f.id, freq: f.freq, nome: f.nome, cor: f.cor }))
