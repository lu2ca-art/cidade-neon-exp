// A SINUCA (T17): o jogo. Junta a física (passo fixo), as regras, a cabeça
// do Mubarak, o desenho e o toque. Nada aqui usa React: o componente
// (Sinuca.tsx) só cria o Jogo, manda o puxar do taco e o efeito, e recebe o
// placar (aoHud) quando ele muda, nunca por quadro.
//
// Toque:
//  • arrastar na mesa gira a mira em volta da branca (longe = mais fino);
//    tocar sem arrastar mira direto no ponto;
//  • puxar a partir da branca = estilingue: a direção é o contrário do puxão,
//    a força é o tamanho; soltar = tacada;
//  • o puxador embaixo (no componente) faz o mesmo com mais controle;
//  • bola na mão: arrastar a branca pra onde quiser.
// Teclado: ←/→ mira (shift = rápido), ↑/↓ força, espaço tacar.

import { L, W, R, H, VMAX, CABECEIRA, PE, CACAPAS, rack, novaMesa, tacar, passo, emMovimento, cabe, mirar, type Mesa } from "./fisica"
import { Vista, Bolas, pintarMesa, pintarTaco } from "./desenho"
import { novasRegras, julgar, alvos, type Regras, type Modo } from "./regras"
import { pensar, type Plano } from "./ia"
import { somBola, somTabela, somCacapa, somTaco, acordarSom } from "./som"
import { vib } from "../som-carro"

export type Fase = "mirar" | "rolando" | "ia" | "fim"
export interface Hud {
  modo: Modo
  fase: Fase
  vez: 0 | 1
  grupos: Regras["grupos"]
  naMesa: number[] // ids das bolas coloridas na mesa
  msg: string
  mao: boolean
  fim: Regras["fim"]
  tacadas: number
}

const velDe = (f: number) => 0.25 + Math.pow(f, 1.3) * (VMAX - 0.25)
const forcaDe = (v: number) => Math.pow(Math.max(0, (v - 0.25) / (VMAX - 0.25)), 1 / 1.3)
const suave = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
const difAng = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

interface Caindo { id: number; x: number; y: number; px: number; py: number; t: number }

export class Jogo {
  private g: CanvasRenderingContext2D
  private vista!: Vista
  private fundo!: HTMLCanvasElement
  private taco!: HTMLCanvasElement
  private bolas = new Bolas()
  private dpr = 1
  mesa!: Mesa
  regras!: Regras
  ang = 0
  forca = 0
  ex = 0
  ey = 0
  fase: Fase = "mirar"
  private msg = ""
  private ativosAntes: number[] = []
  private caindo: Caindo[] = []
  private ultimaCaida = 0
  private acc = 0
  private ultimo = 0
  private raf = 0
  private sujo = true
  private tacoAnim = 0 // >0: o taco indo pra frente depois da tacada
  private tacoAng = 0
  // o Mubarak
  private ia: Generator<void, Plano, void> | null = null
  private plano: Plano | null = null
  private iaT = 0
  private iaAng0 = 0
  private iaMao0: { x: number; y: number } | null = null
  // o toque
  private arrasto: null | { tipo: "girar" | "estilingue" | "mover"; ult: number; x0: number; y0: number; mexeu: boolean; id: number } = null
  private maoValida = true
  // medidas (pra scripts/desempenho)
  quadros: number[] = []
  trabalho: number[] = []
  passos = 0

  constructor(private canvas: HTMLCanvasElement, public modo: Modo, private aoHud: (h: Hud) => void, private aoFim?: (f: NonNullable<Regras["fim"]>) => void) {
    this.g = canvas.getContext("2d", { alpha: false })!
    this.novo(modo)
    this.medir()
    canvas.addEventListener("pointerdown", this.down)
    canvas.addEventListener("pointermove", this.move)
    canvas.addEventListener("pointerup", this.up)
    canvas.addEventListener("pointercancel", this.up)
    window.addEventListener("keydown", this.tecla)
    this.raf = requestAnimationFrame(this.quadro)
  }

  destruir() {
    cancelAnimationFrame(this.raf)
    this.canvas.removeEventListener("pointerdown", this.down)
    this.canvas.removeEventListener("pointermove", this.move)
    this.canvas.removeEventListener("pointerup", this.up)
    this.canvas.removeEventListener("pointercancel", this.up)
    window.removeEventListener("keydown", this.tecla)
  }

  novo(modo: Modo = this.modo) {
    this.modo = modo
    this.mesa = novaMesa(rack())
    this.regras = novasRegras(modo)
    this.caindo = []
    this.ia = null; this.plano = null
    this.forca = 0; this.ex = 0; this.ey = 0
    this.ang = 0
    this.bolas.ori.clear()
    if (this.bolas.S > 0) for (const b of this.mesa.bolas) this.bolas.garantir(b.id)
    this.fase = "mirar"
    this.msg = modo === "mubarak" ? "a quebra é sua" : "treino: a quebra"
    this.sujo = true
    this.hud()
  }

  // o tamanho mudou: refaz a mesa e os sprites
  medir() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.max(1, Math.round(r.width * this.dpr)), h = Math.max(1, Math.round(r.height * this.dpr))
    this.canvas.width = w; this.canvas.height = h
    this.vista = new Vista(w, h, this.dpr)
    this.fundo = pintarMesa(this.vista)
    this.taco = pintarTaco(this.vista.s)
    this.bolas.medir(R * this.vista.s, this.vista.retrato)
    for (const b of this.mesa.bolas) this.bolas.garantir(b.id)
    this.sujo = true
  }

  private hud() {
    this.aoHud({
      modo: this.modo, fase: this.fase, vez: this.regras.vez, grupos: this.regras.grupos,
      naMesa: this.mesa.bolas.filter((b) => b.ativa && b.id > 0).map((b) => b.id),
      msg: this.msg, mao: !!this.regras.mao, fim: this.regras.fim, tacadas: this.regras.tacadas,
    })
  }

  get minhaVez() { return this.fase === "mirar" && (this.modo === "pratica" || this.regras.vez === 0) }

  // ── o que o componente chama ──
  puxar(f: number) {
    acordarSom()
    if (!this.minhaVez) return
    this.forca = Math.max(0, Math.min(1, f)); this.sujo = true
  }
  soltar() {
    if (!this.minhaVez) return
    if (this.forca < 0.02) { this.forca = 0; this.sujo = true; return }
    this.atirar(this.ang, velDe(this.forca))
  }
  efeito(ex: number, ey: number) {
    const n = Math.hypot(ex, ey)
    const k = n > 1 ? 1 / n : 1
    this.ex = ex * k; this.ey = ey * k; this.sujo = true
  }

  private atirar(ang: number, vel: number) {
    this.ativosAntes = this.mesa.bolas.filter((b) => b.ativa).map((b) => b.id)
    somTaco(forcaDe(vel)); vib(12)
    this.tacoAng = ang; this.tacoAnim = 0.12
    tacar(this.mesa, ang, vel, this.ex, this.ey)
    this.regras.mao = null
    this.forca = 0
    this.fase = "rolando"
    this.acc = 0
    this.msg = ""
    this.hud()
  }

  // ── o quadro ──
  private quadro = (t: number) => {
    this.raf = requestAnimationFrame(this.quadro)
    const dtMs = this.ultimo ? t - this.ultimo : 16.7
    this.ultimo = t
    const dt = Math.min(0.05, dtMs / 1000)
    const t0 = performance.now()
    if (this.quadros.length < 20000) this.quadros.push(dtMs)

    if (this.fase === "rolando") this.rolar(dt)
    else if (this.fase === "ia") this.pensarIA(dt, t0)
    if (this.tacoAnim > 0) { this.tacoAnim = Math.max(0, this.tacoAnim - dt); this.sujo = true }
    if (this.caindo.length) {
      for (const c of this.caindo) c.t += dt
      this.caindo = this.caindo.filter((c) => c.t < 0.35)
      this.sujo = true
    }
    if (this.sujo) { this.desenhar(); this.sujo = false }
    if (this.trabalho.length < 20000) this.trabalho.push(performance.now() - t0)
  }

  private rolar(dt: number) {
    const m = this.mesa
    this.acc += dt
    let n = 0
    while (this.acc >= H && n < 60) { passo(m); this.acc -= H; n++ }
    this.passos += n
    for (const b of m.bolas) if (b.ativa && !b.parada) this.bolas.rolar(b, dt)
    // os sons do que bateu neste quadro (no máximo uns poucos, os mais fortes)
    const ev = m.eventos
    if (ev && ev.length) {
      let bolasN = 0, tabN = 0
      ev.sort((a, b) => b.v - a.v)
      for (const e of ev) {
        if (e.t === "bola" && bolasN < 3) { somBola(e.v); bolasN++ }
        else if (e.t === "tabela" && tabN < 2) { somTabela(e.v); tabN++ }
        else if (e.t === "cacapa") {
          somCacapa(e.v)
          const p = this.cacapaXY(e.c)
          const b = m.bolas.find((x) => x.id === e.id)!
          this.caindo.push({ id: e.id, x: b.x, y: b.y, px: p[0], py: p[1], t: 0 })
          if (e.id !== 0) vib(20)
        }
      }
      ev.length = 0
    }
    this.sujo = true
    if (!emMovimento(m)) this.fimDaTacada()
  }

  private cacapaXY(c: number): [number, number] {
    // o centro do buraco
    return [CACAPAS[c].x, CACAPAS[c].y]
  }

  private fimDaTacada() {
    const j = julgar(this.regras, this.ativosAntes, this.mesa)
    const vezAntes = this.regras.vez
    this.regras = j.r
    const m = this.mesa
    if (j.devolverBranca) {
      const c = m.bolas[0]
      c.ativa = true; c.parada = true; c.vx = c.vy = c.wx = c.wy = c.wz = 0
      const p = this.lugarLivre(CABECEIRA, 0)
      c.x = p.x; c.y = p.y
    }
    if (j.recolocar8) {
      const b = m.bolas.find((x) => x.id === 8)!
      b.ativa = true; b.parada = true; b.vx = b.vy = b.wx = b.wy = b.wz = 0
      const p = this.lugarLivre(PE, 0, 8)
      b.x = p.x; b.y = p.y
    }
    const ehMubarak = this.modo === "mubarak"
    if (j.r.fim) {
      this.fase = "fim"
      const ganhou = j.r.fim.vencedor === 0
      this.msg = ehMubarak ? (ganhou ? "você ganhou do Mubarak" : "o Mubarak ganhou") : ganhou ? "mesa limpa!" : "a 8 caiu antes da hora"
      this.hud()
      this.aoFim?.(j.r.fim)
      return
    }
    let msg = j.msg
    if (!msg) {
      if (j.continua) msg = this.regras.vez === 0 || !ehMubarak ? "boa! joga de novo" : "o Mubarak continua"
      else if (ehMubarak && this.regras.vez !== vezAntes) msg = this.regras.vez === 0 ? "sua vez" : "vez do Mubarak"
    }
    if (this.regras.mao && (!ehMubarak || this.regras.vez === 0)) msg += msg ? " · bola na mão" : "bola na mão: arrasta a branca"
    this.msg = msg
    if (ehMubarak && this.regras.vez === 1) this.comecarIA()
    else { this.fase = "mirar"; this.mirarNaMelhor() }
    this.sujo = true
    this.hud()
  }

  private lugarLivre(x0: number, y0: number, id = 0) {
    for (let r = 0; r < 0.5; r += 0.01) for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, x = x0 - r * Math.abs(Math.cos(a)) * (id === 0 ? 1 : -1), y = y0 + r * Math.sin(a)
      if (cabe(this.mesa, x, y, id)) return { x, y }
    }
    return { x: x0, y: y0 }
  }

  // começa a vez apontando pra bola boa mais perto (a linha-guia já mostra algo útil)
  private mirarNaMelhor() {
    const c = this.mesa.bolas[0]
    const ids = alvos(this.regras, this.mesa.bolas.filter((b) => b.ativa).map((b) => b.id))
    let dm = Infinity
    for (const b of this.mesa.bolas) {
      if (!b.ativa || !ids.includes(b.id)) continue
      const d = Math.hypot(b.x - c.x, b.y - c.y)
      if (d < dm) { dm = d; this.ang = Math.atan2(b.y - c.y, b.x - c.x) }
    }
  }

  // ── o Mubarak ──
  private comecarIA() {
    this.fase = "ia"
    this.ia = pensar(this.mesa, this.regras)
    this.plano = null
    this.iaT = 0
    this.iaAng0 = this.ang
    this.ex = 0; this.ey = 0
    this.msg = "o Mubarak está pensando…"
  }

  private pensarIA(dt: number, t0: number) {
    this.iaT += dt
    if (!this.plano && this.ia) {
      // uns poucos ms por quadro
      while (performance.now() - t0 < 4) {
        const r = this.ia.next()
        if (r.done) {
          this.plano = r.value; this.ia = null
          this.iaT = 0; this.iaAng0 = this.ang
          const c = this.mesa.bolas[0]
          this.iaMao0 = this.plano.mao ? { x: c.x, y: c.y } : null
          break
        }
      }
      return
    }
    const p = this.plano
    if (!p) return
    const c = this.mesa.bolas[0]
    // 1) põe a branca (se for bola na mão)  2) mira devagar  3) puxa  4) tacada
    const tMao = p.mao ? 0.6 : 0
    if (p.mao && this.iaMao0) {
      const k = suave(this.iaT / tMao)
      c.x = this.iaMao0.x + (p.mao.x - this.iaMao0.x) * k
      c.y = this.iaMao0.y + (p.mao.y - this.iaMao0.y) * k
    }
    const tMira = 0.9
    const km = suave((this.iaT - tMao) / tMira)
    this.ang = this.iaAng0 + difAng(p.ang - this.iaAng0) * km
    const tPuxa = 0.55
    const kp = suave((this.iaT - tMao - tMira - 0.15) / tPuxa)
    this.forca = forcaDe(p.vel) * kp
    this.ex = p.ex; this.ey = p.ey
    this.sujo = true
    if (this.iaT > tMao + tMira + 0.15 + tPuxa + 0.12) {
      if (p.mao) { c.x = p.mao.x; c.y = p.mao.y }
      this.ang = p.ang
      this.plano = null
      this.atirar(p.ang, p.vel)
    }
  }

  // ── o toque ──
  private mundo(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect()
    const sx = (e.clientX - r.left) * this.dpr, sy = (e.clientY - r.top) * this.dpr
    return [this.vista.mx(sx, sy), this.vista.my(sx, sy)]
  }

  private down = (e: PointerEvent) => {
    acordarSom()
    if (!this.minhaVez || this.arrasto) return
    const [x, y] = this.mundo(e)
    const c = this.mesa.bolas[0]
    const d = Math.hypot(x - c.x, y - c.y)
    // no celular o dedo é grosso: a branca "pega" num raio maior
    const pega = Math.max(3 * R, 22 * this.dpr / this.vista.s)
    let tipo: "girar" | "estilingue" | "mover" = "girar"
    if (this.regras.mao && d < pega) tipo = "mover"
    else if (d < pega) tipo = "estilingue"
    this.arrasto = { tipo, ult: Math.atan2(y - c.y, x - c.x), x0: x, y0: y, mexeu: false, id: e.pointerId }
    this.canvas.setPointerCapture?.(e.pointerId)
    e.preventDefault()
  }

  private move = (e: PointerEvent) => {
    const a = this.arrasto
    if (!a || e.pointerId !== a.id || !this.minhaVez) return
    const [x, y] = this.mundo(e)
    const c = this.mesa.bolas[0]
    if (!a.mexeu && Math.hypot(x - a.x0, y - a.y0) * this.vista.s > 6 * this.dpr) a.mexeu = true
    if (!a.mexeu) return
    if (a.tipo === "mover") {
      let nx = Math.max(-L / 2 + R, Math.min(L / 2 - R, x)), ny = Math.max(-W / 2 + R, Math.min(W / 2 - R, y))
      if (this.regras.mao === "cabeceira") nx = Math.min(nx, CABECEIRA)
      c.x = nx; c.y = ny
      this.maoValida = cabe(this.mesa, nx, ny, 0)
    } else if (a.tipo === "estilingue") {
      const vx = c.x - x, vy = c.y - y
      const d = Math.hypot(vx, vy)
      if (d > R) this.ang = Math.atan2(vy, vx)
      this.forca = Math.max(0, Math.min(1, (d - 2 * R) / 0.32))
    } else {
      const ang = Math.atan2(y - c.y, x - c.x)
      this.ang += difAng(ang - a.ult)
      a.ult = ang
    }
    this.sujo = true
  }

  private up = (e: PointerEvent) => {
    const a = this.arrasto
    if (!a || e.pointerId !== a.id) return
    this.arrasto = null
    if (!this.minhaVez) return
    const [x, y] = this.mundo(e)
    const c = this.mesa.bolas[0]
    if (a.tipo === "mover") {
      if (!this.maoValida) { const p = this.lugarLivre(c.x, c.y); c.x = p.x; c.y = p.y; this.maoValida = true }
    } else if (a.tipo === "estilingue") {
      if (this.forca > 0.03) this.atirar(this.ang, velDe(this.forca))
      else this.forca = 0
    } else if (!a.mexeu) {
      this.ang = Math.atan2(y - c.y, x - c.x)
    }
    this.sujo = true
  }

  private tecla = (e: KeyboardEvent) => {
    acordarSom()
    if (!this.minhaVez) return
    const k = e.shiftKey ? 0.02 : 0.002
    if (e.key === "ArrowLeft") this.ang += k
    else if (e.key === "ArrowRight") this.ang -= k
    else if (e.key === "ArrowUp") this.forca = Math.min(1, this.forca + 0.05)
    else if (e.key === "ArrowDown") this.forca = Math.max(0, this.forca - 0.05)
    else if (e.key === " ") { if (this.forca > 0.02) this.atirar(this.ang, velDe(this.forca)); else this.forca = 0.5 }
    else return
    e.preventDefault()
    this.sujo = true
  }

  // pra teste: uma tacada direta
  tacadaTeste(ang: number, forca: number) {
    if (!this.minhaVez) return false
    this.ang = ang
    this.atirar(ang, velDe(forca))
    return true
  }

  // ── o desenho ──
  private desenhar() {
    const g = this.g, v = this.vista, m = this.mesa, S = this.bolas.S
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.drawImage(this.fundo, 0, 0)
    const meu = this.minhaVez
    // bola na mão atrás da linha: escurece o resto
    if (this.regras.mao === "cabeceira" && this.fase !== "rolando") {
      const x0 = v.x(CABECEIRA, -W / 2), y0 = v.y(CABECEIRA, -W / 2), x1 = v.x(L / 2, W / 2), y1 = v.y(L / 2, W / 2)
      g.fillStyle = "rgba(0,0,0,0.22)"
      g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0))
    }
    // as sombras
    const off = this.bolas.r * 0.22
    for (const b of m.bolas) {
      if (!b.ativa) continue
      g.drawImage(this.bolas.sombra, v.x(b.x, b.y) - S + off, v.y(b.x, b.y) - S + off * 1.3)
    }
    // as bolas caindo (encolhem indo pro fundo do buraco)
    for (const c of this.caindo) {
      const k = suave(c.t / 0.35)
      const x = c.x + (c.px - c.x) * k, y = c.y + (c.py - c.y) * k
      const sp = this.bolas.sprite.get(c.id)
      if (!sp) continue
      const e = 1 - 0.45 * k
      g.globalAlpha = 1 - k * 0.9
      g.drawImage(sp, v.x(x, y) - (S * e) / 2, v.y(x, y) - (S * e) / 2, S * e, S * e)
      g.globalAlpha = 1
    }
    this.bolas.atualizar()
    for (const b of m.bolas) {
      if (!b.ativa) continue
      g.drawImage(this.bolas.sprite.get(b.id)!, v.x(b.x, b.y) - S / 2, v.y(b.x, b.y) - S / 2)
    }
    const c = m.bolas[0]
    const cx = v.x(c.x, c.y), cy = v.y(c.x, c.y)
    const lw = 1.6 * this.dpr
    // bola na mão: o anel
    if (this.regras.mao && this.fase === "mirar" && meu) {
      g.strokeStyle = this.maoValida ? "rgba(63,246,255,0.9)" : "rgba(255,60,80,0.95)"
      g.lineWidth = lw; g.setLineDash([4 * this.dpr, 4 * this.dpr])
      g.beginPath(); g.arc(cx, cy, this.bolas.r * 1.9, 0, Math.PI * 2); g.stroke(); g.setLineDash([])
    }
    // a linha-guia
    const mirando = this.fase === "mirar" || (this.fase === "ia" && !this.ia)
    if (mirando && c.ativa) {
      const mi = mirar(m, this.ang)
      const gx = v.x(mi.gx, mi.gy), gy = v.y(mi.gx, mi.gy)
      const ids = alvos(this.regras, m.bolas.filter((b) => b.ativa).map((b) => b.id))
      const errada = mi.tipo === "bola" && !ids.includes(mi.alvo)
      const a = this.fase === "ia" ? 0.35 : 0.9
      g.lineCap = "round"
      const linha = (x0: number, y0: number, x1: number, y1: number, alpha: number) => {
        g.strokeStyle = `rgba(63,246,255,${alpha * 0.25})`; g.lineWidth = lw * 3.2
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
        g.strokeStyle = `rgba(255,255,255,${alpha})`; g.lineWidth = lw
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
      }
      // da borda da branca até a fantasma
      const dx = Math.cos(this.ang), dy = Math.sin(this.ang)
      linha(v.x(c.x + dx * R, c.y + dy * R), v.y(c.x + dx * R, c.y + dy * R), gx, gy, a)
      g.strokeStyle = errada ? "rgba(255,70,90,0.95)" : `rgba(255,255,255,${a})`; g.lineWidth = lw
      g.beginPath(); g.arc(gx, gy, this.bolas.r, 0, Math.PI * 2); g.stroke()
      if (errada) {
        const k = this.bolas.r * 0.55
        g.beginPath(); g.moveTo(gx - k, gy - k); g.lineTo(gx + k, gy + k); g.moveTo(gx + k, gy - k); g.lineTo(gx - k, gy + k); g.stroke()
      } else if (mi.tipo === "bola") {
        const o = m.bolas.find((b) => b.id === mi.alvo)!
        const lo = 0.05 + 0.3 * mi.corte, lb = 0.04 + 0.16 * (1 - mi.corte)
        linha(v.x(o.x, o.y), v.y(o.x, o.y), v.x(o.x + mi.ox * lo, o.y + mi.oy * lo), v.y(o.x + mi.ox * lo, o.y + mi.oy * lo), a * 0.9)
        if (lb > 0.05 && (mi.bx || mi.by)) linha(gx, gy, v.x(mi.gx + mi.bx * lb, mi.gy + mi.by * lb), v.y(mi.gx + mi.bx * lb, mi.gy + mi.by * lb), a * 0.5)
      } else if (mi.tipo === "tabela") {
        const lr = 0.18
        linha(gx, gy, v.x(mi.gx + mi.bx * lr, mi.gy + mi.by * lr), v.y(mi.gx + mi.bx * lr, mi.gy + mi.by * lr), a * 0.45)
      }
    }
    // o taco
    if ((mirando && c.ativa) || this.tacoAnim > 0) {
      const ang = this.tacoAnim > 0 ? this.tacoAng : this.ang
      const sa = v.ang(ang)
      // atrás da branca: recua com a força; depois da tacada, avança e some
      const recuo = this.tacoAnim > 0 ? -0.01 + (this.tacoAnim / 0.12) * 0.03 : 0.012 + this.forca * 0.22
      const dist = (R + recuo) * v.s
      g.save()
      g.globalAlpha = this.tacoAnim > 0 ? this.tacoAnim / 0.12 : 1
      const co = Math.cos(sa + Math.PI), si = Math.sin(sa + Math.PI)
      g.setTransform(co, si, -si, co, cx, cy)
      g.drawImage(this.taco, dist, -this.taco.height / 2)
      g.restore()
    }
  }
}

