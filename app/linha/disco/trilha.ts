// A TRILHA (T40): o som que troca a cada missão e o fade do buraco de minhoca.
// Sem import do som.ts de propósito: recebe o contexto de áudio de fora (deps),
// então roda igual no jogo e nos testes (com um contexto de mentira).
//
// - Trilha: o som da missão (uma faixa do public/audio ou a batida do tambor
//   sintetizada). Entra em fade, sai em fade (nunca corta seco = sem estalo),
//   e dá pra preparar antes (preload) pra não ter atraso quando a cena abre.
// - curvaMinhoca / aplicarFadeMinhoca: a música da Kombi chega no buraco de
//   minhoca distorcida e abafada e vai ficando limpa, junto com o fade-in.

import type { SomMissao } from "./sons"

// ── os tipos mínimos do Web Audio que a gente usa (o contexto real encaixa) ──
export interface ParamLike {
  value: number
  setValueAtTime(v: number, t: number): unknown
  linearRampToValueAtTime(v: number, t: number): unknown
  setTargetAtTime(v: number, t: number, tc: number): unknown
  setValueCurveAtTime(c: Float32Array, t: number, d: number): unknown
  cancelScheduledValues(t: number): unknown
}
export interface NoLike { connect(d: unknown): unknown; disconnect(d?: unknown): void }
export interface GainLike extends NoLike { gain: ParamLike }
export interface OscLike extends NoLike { type: string; frequency: ParamLike; start(t: number): void; stop(t: number): void }
export interface CtxLike {
  currentTime: number
  createGain(): GainLike
  createOscillator(): OscLike
  createMediaElementSource(el: unknown): NoLike
}
export interface AudioLike {
  src: string; loop: boolean; preload: string; currentTime: number; paused: boolean
  play(): Promise<void> | void; pause(): void
}
export interface DepsTrilha {
  ctx(): CtxLike | null
  saida(): unknown
  novoAudio(): AudioLike
}

const FADE_ENTRADA = 0.7
const FADE_SAIDA = 0.5

interface Canal {
  src: string
  el: AudioLike | null
  gain: GainLike | null
}

export class Trilha {
  atual: SomMissao | null = null
  private canais = new Map<string, Canal>()
  private mestre: GainLike | null = null
  private segurando = false
  private tambor: { gain: GainLike; timer: ReturnType<typeof setInterval>; proximo: number; passo: number } | null = null
  constructor(private d: DepsTrilha) {}

  // o ganho geral da trilha (o "segurar": um jogo aberto no holo cala a trilha)
  private raiz(): GainLike | null {
    const c = this.d.ctx(), out = this.d.saida()
    if (!c || !out) return null
    if (!this.mestre) {
      this.mestre = c.createGain()
      this.mestre.gain.value = this.segurando ? 0 : 1
      this.mestre.connect(out)
    }
    return this.mestre
  }

  segurar(sim: boolean) {
    this.segurando = sim
    const c = this.d.ctx()
    if (c && this.mestre) this.mestre.gain.setTargetAtTime(sim ? 0 : 1, c.currentTime, 0.12)
  }

  private canal(def: Extract<SomMissao, { tipo: "faixa" }>): Canal | null {
    const ja = this.canais.get(def.src)
    if (ja) return ja
    const c = this.d.ctx(), raiz = this.raiz()
    if (!c || !raiz) return null
    const el = this.d.novoAudio()
    el.preload = "auto"
    el.loop = true
    el.src = def.src
    ;(el as unknown as { crossOrigin?: string }).crossOrigin = "anonymous"
    const gain = c.createGain()
    gain.gain.value = 0
    try { c.createMediaElementSource(el).connect(gain); gain.connect(raiz) } catch { return null }
    const novo = { src: def.src, el, gain }
    this.canais.set(def.src, novo)
    return novo
  }

  // carrega o arquivo antes (a missão pegada): quando a cena abre, já está pronto
  preparar(def: SomMissao | null) {
    if (def && def.tipo === "faixa") this.canal(def)
  }

  entrar(def: SomMissao | null) {
    if (!def) return this.sair()
    if (this.atual === def) return
    const velho = this.atual
    if (velho) this.apagar(velho, FADE_SAIDA)
    this.atual = def
    const c = this.d.ctx()
    if (!c) return
    if (def.tipo === "faixa") {
      const ch = this.canal(def)
      if (!ch || !ch.el || !ch.gain) return
      // veio de uma saída em andamento: recomeça do ponto onde parou se ainda tocava
      if (ch.el.paused) { try { ch.el.currentTime = 0 } catch {} }
      ch.gain.gain.cancelScheduledValues(c.currentTime)
      ch.gain.gain.setValueAtTime(ch.gain.gain.value, c.currentTime)
      ch.gain.gain.linearRampToValueAtTime(def.vol, c.currentTime + FADE_ENTRADA)
      try { const r = ch.el.play(); if (r && typeof r.catch === "function") r.catch(() => {}) } catch {}
    } else {
      this.ligarTambor(def)
    }
  }

  sair() {
    const velho = this.atual
    this.atual = null
    if (velho) this.apagar(velho, FADE_SAIDA)
  }

  private apagar(def: SomMissao, seg: number) {
    const c = this.d.ctx()
    if (def.tipo === "faixa") {
      const ch = this.canais.get(def.src)
      if (!ch || !ch.gain || !c) return
      ch.gain.gain.cancelScheduledValues(c.currentTime)
      ch.gain.gain.setValueAtTime(ch.gain.gain.value, c.currentTime)
      ch.gain.gain.linearRampToValueAtTime(0, c.currentTime + seg)
      // só pausa depois do fade, e só se ninguém voltou pra ela nesse meio tempo
      setTimeout(() => { if (this.atual !== def && ch.el) { try { ch.el.pause() } catch {} } }, seg * 1000 + 60)
    } else {
      this.desligarTambor(seg)
    }
  }

  // ── o tambor da D-Bee: sintetizado, agendado no relógio do áudio ──
  // um tom grave (a pele) com a nota caindo e um estalinho agudo (a borda).
  // Compasso de 8 passos: batida no 1, 4 e 7, borda no 3 e no 6 (swing leve)
  private ligarTambor(def: Extract<SomMissao, { tipo: "tambor" }>) {
    const c = this.d.ctx(), raiz = this.raiz()
    if (!c || !raiz) return
    this.desligarTambor(0.05)
    const gain = c.createGain()
    gain.gain.value = 0
    gain.connect(raiz)
    gain.gain.setValueAtTime(0, c.currentTime)
    gain.gain.linearRampToValueAtTime(def.vol, c.currentTime + FADE_ENTRADA)
    const dur = 60 / def.bpm / 2 // um passo = meia batida
    const t = { gain, timer: 0 as unknown as ReturnType<typeof setInterval>, proximo: c.currentTime + 0.05, passo: 0 }
    const agendar = () => {
      const cc = this.d.ctx()
      if (!cc) return
      while (t.proximo < cc.currentTime + 0.15) {
        const p = t.passo % 8
        if (p === 0 || p === 3 || p === 6) this.pele(cc, t.gain, t.proximo, p === 0 ? 1 : 0.75, p === 3 ? 118 : 96)
        if (p === 2 || p === 5 || p === 7) this.borda(cc, t.gain, t.proximo + (p === 5 ? dur * 0.12 : 0), p === 7 ? 0.5 : 0.7)
        t.proximo += dur
        t.passo++
      }
    }
    agendar()
    t.timer = setInterval(agendar, 40)
    this.tambor = t
  }

  private pele(c: CtxLike, saida: GainLike, quando: number, forca: number, grave: number) {
    const o = c.createOscillator(), g = c.createGain()
    o.type = "sine"
    o.frequency.setValueAtTime(grave * 1.9, quando)
    o.frequency.linearRampToValueAtTime(grave, quando + 0.09)
    g.gain.setValueAtTime(0.0001, quando)
    g.gain.linearRampToValueAtTime(0.9 * forca, quando + 0.006)
    g.gain.linearRampToValueAtTime(0, quando + 0.42)
    o.connect(g); g.connect(saida)
    o.start(quando); o.stop(quando + 0.45)
  }

  private borda(c: CtxLike, saida: GainLike, quando: number, forca: number) {
    const o = c.createOscillator(), g = c.createGain()
    o.type = "triangle"
    o.frequency.setValueAtTime(330, quando)
    o.frequency.linearRampToValueAtTime(210, quando + 0.05)
    g.gain.setValueAtTime(0.0001, quando)
    g.gain.linearRampToValueAtTime(0.28 * forca, quando + 0.004)
    g.gain.linearRampToValueAtTime(0, quando + 0.12)
    o.connect(g); g.connect(saida)
    o.start(quando); o.stop(quando + 0.14)
  }

  private desligarTambor(seg: number) {
    const t = this.tambor
    if (!t) return
    this.tambor = null
    clearInterval(t.timer)
    const c = this.d.ctx()
    if (c) {
      t.gain.gain.cancelScheduledValues(c.currentTime)
      t.gain.gain.setValueAtTime(t.gain.gain.value, c.currentTime)
      t.gain.gain.linearRampToValueAtTime(0, c.currentTime + seg)
    }
    // as batidas já agendadas morrem sozinhas dentro do fade
    setTimeout(() => { try { t.gain.disconnect() } catch {} }, seg * 1000 + 500)
  }
}

// ── a música da Kombi no buraco de minhoca ──
// Entra distorcida, abafada, baixinha e um pouco grave demais (o ritmo mais
// lento); vai ficando limpa, aberta, no volume e no ritmo normais.
export const PONTOS_MINHOCA = 64
export interface CurvaMinhoca {
  nivel: Float32Array // 0 → 1
  molhado: Float32Array // a parte distorcida: 0.9 → 0
  seco: Float32Array // 0.1 → 1
  corte: Float32Array // o passa-baixa (Hz): 380 → 20000
  ritmo: Float32Array // a velocidade da faixa: 0.9 → 1
}
export function curvaMinhoca(n = PONTOS_MINHOCA): CurvaMinhoca {
  const nivel = new Float32Array(n), molhado = new Float32Array(n), seco = new Float32Array(n), corte = new Float32Array(n), ritmo = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1)
    const suave = p * p * (3 - 2 * p)
    nivel[i] = Math.pow(p, 1.4)
    molhado[i] = 0.9 * Math.pow(1 - p, 1.5)
    seco[i] = 1 - molhado[i]
    corte[i] = 380 * Math.pow(20000 / 380, Math.pow(suave, 0.85))
    ritmo[i] = 0.9 + 0.1 * suave
  }
  return { nivel, molhado, seco, corte, ritmo }
}

// a curva de distorção (saturação dura) do caminho "molhado"
export function curvaDistorcao(k = 70, n = 1024): Float32Array<ArrayBuffer> {
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    c[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x))
  }
  return c
}

// os nós que o toca-discos expõe pro fade (som.ts monta; o teste usa os de mentira)
export interface NosFade {
  nivel: GainLike
  molhado: GainLike
  seco: GainLike
  filtro: { frequency: ParamLike }
}
// agenda o fade inteiro no relógio do áudio (sem timer, sem quadro): `seg` segundos
export function aplicarFadeMinhoca(c: Pick<CtxLike, "currentTime">, nos: NosFade, seg: number) {
  const k = curvaMinhoca()
  const t0 = c.currentTime
  const d = Math.max(0.1, seg)
  const rampa = (p: ParamLike, v: Float32Array) => { p.cancelScheduledValues(t0); p.setValueCurveAtTime(v, t0, d) }
  rampa(nos.nivel.gain, k.nivel)
  rampa(nos.molhado.gain, k.molhado)
  rampa(nos.seco.gain, k.seco)
  rampa(nos.filtro.frequency, k.corte)
  return k
}
