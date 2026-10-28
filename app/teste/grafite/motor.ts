// O motor do grafite: gesto (ligar pontos) -> a arte do artista pinta em spray.
// Quatro camadas de canvas empilhadas: parede (estática), brilho (CSS blur),
// arte (acumula o spray) e fx (gesto + partículas, a única redesenhada por quadro).
// O laço só roda quando há o que animar.
import type { Grafite, Pt, Traco } from "./tipos"
import { acordarAudio, assinou, blip, chocalho, spray, silenciar } from "./spray"

export type Estado = "esperando" | "ligando" | "revelando" | "pronto"
export interface Camadas { parede: HTMLCanvasElement; brilho: HTMLCanvasElement; arte: HTMLCanvasElement; fx: HTMLCanvasElement }
export interface Chamadas { estado: (e: Estado) => void; completou: (g: Grafite) => void }

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; max: number; r: number; cor: string }
const MAX_PART = 140
const DURACAO_ALVO = 3.6 // segundos de spray (sem as pausas)

declare global { interface Window { __grafite?: { quadros: number[]; estado: Estado; pontos: Pt[]; caixa: { x: number; y: number; s: number } } } }

const tam = (t: Traco) => t.pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - t.pts[i - 1][0], p[1] - t.pts[i - 1][1]) : 0), 0)

export class Motor {
  private c: Camadas
  private cb: Chamadas
  private cx: Record<keyof Camadas, CanvasRenderingContext2D>
  private W = 0; private H = 0; private dpr = 1; private S = 100; private ox = 0; private oy = 0
  private g: Grafite | null = null
  private estado: Estado = "esperando"
  private idx = 0 // quantos pontos já foram ligados
  private ponteiro: Pt | null = null
  private pressionado = false
  private raf = 0
  private ultimo = 0
  private t = 0
  private part: Particula[] = []
  // revelação
  private comp: number[] = []
  private ti = 0; private d = 0; private pausa = 0; private veloc = 80
  private brilhoFinal = 0

  constructor(c: Camadas, cb: Chamadas) {
    this.c = c; this.cb = cb
    const ctx = (el: HTMLCanvasElement) => el.getContext("2d")!
    this.cx = { parede: ctx(c.parede), brilho: ctx(c.brilho), arte: ctx(c.arte), fx: ctx(c.fx) }
    const fx = c.fx
    fx.addEventListener("pointerdown", this.baixo)
    fx.addEventListener("pointermove", this.mexe)
    fx.addEventListener("pointerup", this.solta)
    fx.addEventListener("pointercancel", this.solta)
    window.__grafite = { quadros: [], estado: "esperando", pontos: [], caixa: { x: 0, y: 0, s: 0 } }
  }

  destruir() {
    cancelAnimationFrame(this.raf); this.raf = 0
    const fx = this.c.fx
    fx.removeEventListener("pointerdown", this.baixo)
    fx.removeEventListener("pointermove", this.mexe)
    fx.removeEventListener("pointerup", this.solta)
    fx.removeEventListener("pointercancel", this.solta)
    silenciar()
  }

  // ---------- layout ----------
  dimensionar(W: number, H: number) {
    this.W = W; this.H = H
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_200_000 / Math.max(1, W * H)))
    for (const k of Object.keys(this.c) as (keyof Camadas)[]) {
      const el = this.c[k]
      el.width = Math.round(W * this.dpr); el.height = Math.round(H * this.dpr)
      this.cx[k].setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    }
    this.S = Math.min(W * 0.88, H * 0.7)
    this.ox = (W - this.S) / 2; this.oy = (H - this.S) / 2 - H * 0.02
    this.pintarParede()
    this.repintarArte()
    this.publicar()
    this.acordar()
  }

  private px = (p: Pt): Pt => [this.ox + (p[0] / 100) * this.S, this.oy + (p[1] / 100) * this.S]

  private publicar() {
    const w = window.__grafite
    if (!w) return
    w.estado = this.estado
    w.pontos = this.g ? this.g.gesto.map(this.px) : []
    w.caixa = { x: this.ox, y: this.oy, s: this.S }
  }

  private pintarParede() {
    const { W, H } = this, x = this.cx.parede
    const gr = x.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, "#1b1726"); gr.addColorStop(0.55, "#120f1b"); gr.addColorStop(1, "#0b0911")
    x.fillStyle = gr; x.fillRect(0, 0, W, H)
    // tijolos
    const bh = Math.max(18, H / 34), bw = bh * 2.4
    x.strokeStyle = "rgba(255,255,255,0.045)"; x.lineWidth = 1
    x.beginPath()
    for (let r = 0, y = 0; y < H + bh; r++, y += bh) {
      x.moveTo(0, y); x.lineTo(W, y)
      for (let xx = (r % 2 ? bw / 2 : 0); xx < W; xx += bw) { x.moveTo(xx, y); x.lineTo(xx, y + bh) }
    }
    x.stroke()
    // tijolos mais claros/escuros (determinístico)
    let s = 7
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let r = 0, y = 0; y < H; r++, y += bh) for (let xx = (r % 2 ? -bw / 2 : 0); xx < W; xx += bw) {
      const v = rnd(); if (v < 0.35) { x.fillStyle = v < 0.17 ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.12)"; x.fillRect(xx + 1, y + 1, bw - 2, bh - 2) }
    }
    for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(255,255,255,${0.02 + rnd() * 0.05})`; x.fillRect(rnd() * W, rnd() * H, 1.2, 1.2) }
    // luz do túnel no alto + vinheta
    const l = x.createRadialGradient(W / 2, -H * 0.05, 0, W / 2, -H * 0.05, H * 0.8)
    l.addColorStop(0, "rgba(120,90,200,0.22)"); l.addColorStop(1, "rgba(120,90,200,0)")
    x.fillStyle = l; x.fillRect(0, 0, W, H)
    const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8)
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)")
    x.fillStyle = v; x.fillRect(0, 0, W, H)
  }

  // ---------- API ----------
  usar(g: Grafite, jaTem: boolean) {
    this.g = g
    this.comp = g.tracos.map(tam)
    this.part.length = 0
    this.idx = 0; this.pressionado = false; this.ponteiro = null
    this.limparArte()
    spray(0)
    if (jaTem) { this.pintarTudo(); this.mudar("pronto") } else this.mudar("esperando")
    this.publicar(); this.acordar()
  }

  refazer() { if (this.g) this.usar(this.g, false) }

  private mudar(e: Estado) {
    this.estado = e
    if (window.__grafite) window.__grafite.estado = e
    this.cb.estado(e)
  }

  // ---------- gesto ----------
  private pos(e: PointerEvent): Pt {
    const r = this.c.fx.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  private alvo(): Pt | null { return this.g && this.idx < this.g.gesto.length ? this.px(this.g.gesto[this.idx]) : null }
  private raio() { return Math.max(34, this.S * 0.1) }

  private baixo = (e: PointerEvent) => {
    if (this.estado !== "esperando" && this.estado !== "ligando") return
    acordarAudio()
    try { this.c.fx.setPointerCapture(e.pointerId) } catch {}
    this.pressionado = true
    this.ponteiro = this.pos(e); this.testar(this.ponteiro, this.ponteiro)
    this.acordar()
  }
  private mexe = (e: PointerEvent) => {
    if (!this.pressionado) return
    const a = this.ponteiro ?? this.pos(e), b = this.pos(e)
    this.ponteiro = b
    this.testar(a, b)
  }
  private solta = () => { this.pressionado = false; if (this.estado === "ligando") this.ponteiro = null }

  // liga o próximo ponto se o trecho a→b passou perto dele (pega arrasto rápido)
  private testar(a: Pt, b: Pt) {
    for (let guarda = 0; guarda < 3; guarda++) {
      const al = this.alvo(); if (!al || !this.g) return
      if (this.idx === 0 && Math.hypot(b[0] - al[0], b[1] - al[1]) > this.raio()) return
      if (distSeg(al, a, b) > this.raio()) return
      this.idx++
      blip(this.idx - 1)
      if (this.idx >= this.g.gesto.length) { this.comecarRevelacao(); return }
      this.mudar("ligando")
    }
  }

  // ---------- revelação ----------
  private comecarRevelacao() {
    if (!this.g) return
    this.mudar("revelando"); this.pressionado = false; this.ponteiro = null
    this.ti = 0; this.d = 0; this.pausa = 0.5
    const total = this.comp.reduce((a, l, i) => a + l / (this.g!.tracos[i].vel ?? 1), 0)
    this.veloc = Math.max(70, total / DURACAO_ALVO)
    if (window.__grafite) window.__grafite.quadros = []
    chocalho(0.45)
  }

  private pontoEm(t: Traco, dist: number): Pt {
    let acc = 0
    for (let i = 1; i < t.pts.length; i++) {
      const a = t.pts[i - 1], b = t.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1])
      if (acc + l >= dist || i === t.pts.length - 1) { const u = l ? Math.min(1, Math.max(0, (dist - acc) / l)) : 0; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u] }
      acc += l
    }
    return t.pts[0]
  }

  // pinta o trecho [d0,d1] do traço (em unidades da caixa) nas camadas arte e brilho
  private pintar(t: Traco, d0: number, d1: number) {
    const lista: Pt[] = [this.pontoEm(t, d0)]
    let acc = 0
    for (let i = 1; i < t.pts.length; i++) {
      acc += Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1])
      if (acc > d0 && acc < d1) lista.push(t.pts[i])
    }
    lista.push(this.pontoEm(t, d1))
    const P = lista.map(this.px)
    const w = (t.largura / 100) * this.S
    const { arte, brilho } = this.cx
    // brilho: largo e opaco (o CSS borra), sem acumular alpha
    brilho.strokeStyle = t.cor; brilho.lineCap = "round"; brilho.lineJoin = "round"; brilho.lineWidth = w * 2.8
    brilho.beginPath(); brilho.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) brilho.lineTo(P[i][0], P[i][1]); if (P.length === 1) brilho.lineTo(P[0][0] + 0.1, P[0][1]); brilho.stroke()
    // arte: o traço de tinta e o miolo quente
    arte.lineCap = "round"; arte.lineJoin = "round"
    arte.strokeStyle = t.cor; arte.lineWidth = w
    arte.beginPath(); arte.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) arte.lineTo(P[i][0], P[i][1]); if (P.length === 1) arte.lineTo(P[0][0] + 0.1, P[0][1]); arte.stroke()
    arte.strokeStyle = "rgba(255,255,255,0.5)"; arte.lineWidth = Math.max(1, w * 0.3)
    arte.beginPath(); arte.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) arte.lineTo(P[i][0], P[i][1]); if (P.length === 1) arte.lineTo(P[0][0] + 0.1, P[0][1]); arte.stroke()
    // respingos de spray em volta
    let compPx = 0
    for (let i = 1; i < P.length; i++) compPx += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])
    const n = Math.min(40, Math.ceil(compPx / 3) + 2)
    arte.fillStyle = t.cor
    for (let i = 0; i < n; i++) {
      const q = P[Math.floor(Math.random() * P.length)]
      const a = Math.random() * 6.283, r = w * (0.6 + Math.random() * 1.1)
      arte.globalAlpha = 0.25 + Math.random() * 0.4
      arte.fillRect(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r, 1.2, 1.2)
    }
    arte.globalAlpha = 1
  }

  private pintarTudo() {
    if (!this.g) return
    this.g.tracos.forEach((t, i) => this.pintar(t, 0, this.comp[i]))
  }
  private limparArte() {
    this.cx.arte.clearRect(0, 0, this.W, this.H); this.cx.brilho.clearRect(0, 0, this.W, this.H)
  }
  private repintarArte() {
    this.limparArte()
    if (this.g && this.estado === "pronto") this.pintarTudo()
  }

  private emitir(p: Pt, cor: string, n: number, forca = 1) {
    for (let i = 0; i < n; i++) {
      if (this.part.length >= MAX_PART) this.part.shift()
      const a = Math.random() * 6.283, v = (20 + Math.random() * 70) * forca
      this.part.push({ x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, vida: 0, max: 0.35 + Math.random() * 0.5, r: 0.8 + Math.random() * 1.8, cor })
    }
  }

  private atualizarRevelacao(dt: number) {
    const g = this.g!
    if (this.pausa > 0) { this.pausa -= dt; spray(0); return }
    const tr = g.tracos[this.ti], len = this.comp[this.ti]
    const d1 = Math.min(len, this.d + this.veloc * (tr.vel ?? 1) * dt)
    this.pintar(tr, this.d, d1)
    const cabeca = this.px(this.pontoEm(tr, d1))
    this.emitir(cabeca, tr.cor, 3)
    spray(1)
    this.d = d1
    if (this.d >= len - 1e-6) {
      this.ti++; this.d = 0; this.pausa = 0.12; spray(0)
      if (this.ti >= g.tracos.length) {
        spray(0); assinou()
        const c = this.px([50, 50])
        g.tracos.forEach((t) => this.emitir([c[0] + (Math.random() - 0.5) * this.S * 0.7, c[1] + (Math.random() - 0.5) * this.S * 0.7], t.cor, 5, 1.6))
        this.brilhoFinal = 1
        this.mudar("pronto")
        this.cb.completou(g)
      }
    }
  }

  // ---------- laço ----------
  acordar() { if (!this.raf) { this.ultimo = 0; this.raf = requestAnimationFrame(this.laco) } }

  private laco = (agora: number) => {
    this.raf = 0
    const bruto = this.ultimo ? agora - this.ultimo : 0
    this.ultimo = agora
    const dt = Math.min(bruto / 1000, 1 / 30) // passo limitado: um engasgo não pula a animação
    this.t += dt
    if (this.estado === "revelando") {
      if (bruto > 0 && window.__grafite) window.__grafite.quadros.push(bruto)
      this.atualizarRevelacao(dt)
    }
    for (const p of this.part) { p.vida += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.vx *= 0.97 }
    this.part = this.part.filter((p) => p.vida < p.max)
    if (this.brilhoFinal > 0) this.brilhoFinal = Math.max(0, this.brilhoFinal - dt * 1.6)
    this.desenhar()
    const vivo = this.estado !== "pronto" || this.part.length > 0 || this.brilhoFinal > 0
    if (vivo) this.raf = requestAnimationFrame(this.laco)
  }

  private desenhar() {
    const x = this.cx.fx
    x.clearRect(0, 0, this.W, this.H)
    const g = this.g
    if (g && (this.estado === "esperando" || this.estado === "ligando")) {
      const pts = g.gesto.map(this.px)
      // o traço do jogador
      if (this.idx > 0) {
        x.strokeStyle = "rgba(255,255,255,0.9)"; x.lineWidth = 4; x.lineCap = "round"; x.lineJoin = "round"
        x.shadowColor = "#22e6ff"; x.shadowBlur = 10
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < this.idx; i++) x.lineTo(pts[i][0], pts[i][1])
        if (this.pressionado && this.ponteiro) x.lineTo(this.ponteiro[0], this.ponteiro[1])
        x.stroke(); x.shadowBlur = 0
      }
      // guia tracejada até o próximo
      if (this.idx < pts.length && this.idx > 0) {
        x.setLineDash([4, 8]); x.strokeStyle = "rgba(255,255,255,0.25)"; x.lineWidth = 2
        x.beginPath(); x.moveTo(pts[this.idx - 1][0], pts[this.idx - 1][1]); x.lineTo(pts[this.idx][0], pts[this.idx][1]); x.stroke(); x.setLineDash([])
      }
      pts.forEach((p, i) => {
        const feito = i < this.idx, prox = i === this.idx
        const pulso = prox ? 1 + Math.sin(this.t * 6) * 0.12 : 1
        x.beginPath(); x.arc(p[0], p[1], 15 * pulso, 0, 6.283)
        x.fillStyle = feito ? "#22e6ff" : "rgba(10,8,18,0.8)"; x.fill()
        x.lineWidth = prox ? 3 : 2; x.strokeStyle = feito ? "#ffffff" : prox ? "#ffd23f" : "rgba(34,230,255,0.7)"; x.stroke()
        x.fillStyle = feito ? "#0a0812" : "#fff"; x.font = "700 14px system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"
        x.fillText(String(i + 1), p[0], p[1] + 0.5)
      })
    }
    for (const p of this.part) {
      x.globalAlpha = 1 - p.vida / p.max
      x.fillStyle = p.cor
      x.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r)
    }
    x.globalAlpha = 1
    if (this.brilhoFinal > 0) {
      // piscada do brilho ao assinar
      this.c.brilho.style.opacity = String(0.55 + this.brilhoFinal * 0.4)
    } else if (this.c.brilho.style.opacity !== "0.55") this.c.brilho.style.opacity = "0.55"
  }
}

function distSeg(p: Pt, a: Pt, b: Pt) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy
  const u = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0
  return Math.hypot(p[0] - (a[0] + dx * u), p[1] - (a[1] + dy * u))
}
