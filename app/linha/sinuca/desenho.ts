// A SINUCA (T17): o desenho. Canvas 2D, vista de cima (como o 8 Ball Pool).
// A mesa é pintada UMA vez numa tela de fundo (só refaz quando muda o
// tamanho). As bolas são esferas de verdade: cada pixel da bola procura a cor
// numa textura da bola (o número, a listra) girada pela orientação dela, com
// luz e brilho já calculados. Só a bola que girou é repintada, então parada
// a mesa custa quase nada.

import { L, W, R, SEGS, CACAPAS, TABELA, CANTO, MEIO, CABECEIRA, PE, type Bola } from "./fisica"

export const CORES: Record<number, string> = {
  1: "#ffc61a", 2: "#2a6bff", 3: "#ff2d3a", 4: "#8a3df0", 5: "#ff7a1a", 6: "#18b45a", 7: "#b0203a", 8: "#121016",
}
export const corDe = (id: number) => (id === 0 ? "#f4f1ea" : CORES[id > 8 ? id - 8 : id])
const MADEIRA = 0.07
export const BORDA = TABELA + MADEIRA

const NEON_ROSA = "#ff3fb0"
const NEON_CIANO = "#3ff6ff"

// ── a vista: mundo (m) → tela (px do aparelho). Em pé (retrato) a mesa fica
// deitada no comprido, a cabeceira embaixo ──
export class Vista {
  retrato = false
  s = 1 // px por metro
  cx = 0; cy = 0
  constructor(public w: number, public h: number, public dpr: number) {
    this.retrato = h > w * 1.05
    const comp = L + 2 * BORDA, larg = W + 2 * BORDA
    const folga = 0.94
    this.s = this.retrato ? Math.min((w * folga) / larg, (h * folga) / comp) : Math.min((w * folga) / comp, (h * folga) / larg)
    this.cx = w / 2; this.cy = h / 2
  }
  x(wx: number, wy: number) { return this.retrato ? this.cx - wy * this.s : this.cx + wx * this.s }
  y(wx: number, wy: number) { return this.retrato ? this.cy - wx * this.s : this.cy - wy * this.s }
  // tela → mundo
  mx(sx: number, sy: number) { return this.retrato ? (this.cy - sy) / this.s : (sx - this.cx) / this.s }
  my(sx: number, sy: number) { return this.retrato ? (this.cx - sx) / this.s : (this.cy - sy) / this.s }
  // ângulo do mundo → ângulo na tela (y da tela pra baixo)
  ang(a: number) { return this.retrato ? Math.atan2(-Math.cos(a), -Math.sin(a)) : -a }
}

function tela(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h))
  return c
}

// ── a mesa (uma vez) ──
export function pintarMesa(v: Vista): HTMLCanvasElement {
  const c = tela(v.w, v.h)
  const g = c.getContext("2d")!
  const P = (x: number, y: number): [number, number] => [v.x(x, y), v.y(x, y)]
  const ret = (x0: number, y0: number, x1: number, y1: number) => {
    const [ax, ay] = P(x0, y0), [bx, by] = P(x1, y1)
    return [Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay)] as const
  }
  const poli = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], i) => { const [a, b] = P(x, y); if (i) g.lineTo(a, b); else g.moveTo(a, b) }); g.closePath() }
  const l = L / 2, w = W / 2, s = v.s

  // o bar no escuro
  const fundo = g.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, Math.max(v.w, v.h) * 0.75)
  fundo.addColorStop(0, "#1c1030"); fundo.addColorStop(1, "#050208")
  g.fillStyle = fundo; g.fillRect(0, 0, v.w, v.h)

  // a madeira, com o neon rosa vazando por baixo
  const [rx, ry, rw, rh] = ret(-l - BORDA, -w - BORDA, l + BORDA, w + BORDA)
  const raio = 0.05 * s
  g.save()
  g.shadowColor = NEON_ROSA; g.shadowBlur = 0.12 * s
  g.fillStyle = "#1a0f26"
  g.beginPath(); g.roundRect(rx, ry, rw, rh, raio); g.fill()
  g.restore()
  const mad = g.createLinearGradient(rx, ry, rx + rw, ry + rh)
  mad.addColorStop(0, "#3a2050"); mad.addColorStop(0.5, "#24133a"); mad.addColorStop(1, "#160b24")
  g.fillStyle = mad; g.beginPath(); g.roundRect(rx, ry, rw, rh, raio); g.fill()
  g.strokeStyle = "rgba(255,63,176,0.55)"; g.lineWidth = Math.max(1, 0.004 * s)
  g.beginPath(); g.roundRect(rx + 0.006 * s, ry + 0.006 * s, rw - 0.012 * s, rh - 0.012 * s, raio * 0.8); g.stroke()

  // o pano
  const [px, py, pw, ph] = ret(-l - TABELA, -w - TABELA, l + TABELA, w + TABELA)
  const pano = g.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, Math.max(pw, ph) * 0.62)
  pano.addColorStop(0, "#137089"); pano.addColorStop(0.6, "#0d4f66"); pano.addColorStop(1, "#08303f")
  g.fillStyle = pano; g.fillRect(px, py, pw, ph)
  // o feltro: um granulado bem leve
  const gr = tela(96, 96), gg = gr.getContext("2d")!
  const id = gg.createImageData(96, 96)
  for (let i = 0; i < id.data.length; i += 4) { const k = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = k; id.data[i + 3] = 22 }
  gg.putImageData(id, 0, 0)
  g.save(); g.globalCompositeOperation = "overlay"; g.fillStyle = g.createPattern(gr, "repeat")!; g.fillRect(px, py, pw, ph); g.restore()

  // marcas: a linha de saída e o ponto do pé
  g.strokeStyle = "rgba(255,255,255,0.10)"; g.lineWidth = Math.max(1, 0.0025 * s)
  g.beginPath(); g.moveTo(...P(CABECEIRA, -w)); g.lineTo(...P(CABECEIRA, w)); g.stroke()
  g.fillStyle = "rgba(255,255,255,0.18)"
  for (const x of [PE, CABECEIRA]) { g.beginPath(); g.arc(...P(x, 0), 0.006 * s, 0, Math.PI * 2); g.fill() }
  // o 222 no meio do pano, quase sumindo
  g.save(); g.fillStyle = "rgba(63,246,255,0.05)"; g.font = `900 ${Math.round(0.2 * s)}px "Arial Black", system-ui, sans-serif`
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("222", v.cx, v.cy); g.restore()

  // as caçapas
  for (const p of CACAPAS) {
    const [x, y] = P(p.x, p.y), r = (p.r + 0.006) * s
    const bur = g.createRadialGradient(x, y, r * 0.2, x, y, r)
    bur.addColorStop(0, "#000"); bur.addColorStop(0.75, "#05020a"); bur.addColorStop(1, "#1b0d26")
    g.fillStyle = bur; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    g.save(); g.shadowColor = NEON_ROSA; g.shadowBlur = 0.03 * s
    g.strokeStyle = NEON_ROSA; g.lineWidth = Math.max(1, 0.005 * s)
    g.beginPath(); g.arc(x, y, r + 0.004 * s, 0, Math.PI * 2); g.stroke(); g.restore()
  }

  // as tabelas (borracha), com o nariz em neon ciano
  const c_ = CANTO, m = MEIO, t = TABELA
  const tabs: [number, number][][] = []
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) tabs.push([[sx * (l - c_), sy * w], [sx * m, sy * w], [sx * (m - 0.012), sy * (w + t)], [sx * (l - c_ + t), sy * (w + t)]])
  for (const sx of [-1, 1]) tabs.push([[sx * l, -(w - c_)], [sx * l, w - c_], [sx * (l + t), w - c_ + t], [sx * (l + t), -(w - c_ + t)]])
  for (const tb of tabs) {
    poli(tb)
    const [ax, ay] = P(...tb[0]), [bx, by] = P(...tb[3])
    const lg = g.createLinearGradient(ax, ay, bx, by)
    lg.addColorStop(0, "#0f5a70"); lg.addColorStop(1, "#06283a")
    g.fillStyle = lg; g.fill()
  }
  g.save(); g.shadowColor = NEON_CIANO; g.shadowBlur = 0.02 * s
  g.strokeStyle = "rgba(63,246,255,0.75)"; g.lineWidth = Math.max(1, 0.0035 * s); g.lineCap = "round"
  for (const sg of SEGS) { g.beginPath(); g.moveTo(...P(sg.ax, sg.ay)); g.lineTo(...P(sg.bx, sg.by)); g.stroke() }
  g.restore()

  // os diamantes na madeira
  g.fillStyle = "rgba(255,200,87,0.8)"
  const dd = 0.008 * s, mid = t + MADEIRA / 2
  const losango = (x: number, y: number) => { const [a, b] = P(x, y); g.beginPath(); g.moveTo(a, b - dd); g.lineTo(a + dd, b); g.lineTo(a, b + dd); g.lineTo(a - dd, b); g.closePath(); g.fill() }
  for (const k of [-3, -2, -1, 1, 2, 3]) for (const sy of [-1, 1]) losango((k * L) / 8, sy * (w + mid))
  for (const k of [-1, 0, 1]) for (const sx of [-1, 1]) losango(sx * (l + mid), (k * W) / 4)

  // a luz do lampião em cima da mesa
  const luz = g.createRadialGradient(v.cx, v.cy, 0, v.cx, v.cy, Math.max(pw, ph) * 0.55)
  luz.addColorStop(0, "rgba(255,236,210,0.10)"); luz.addColorStop(1, "rgba(255,236,210,0)")
  g.fillStyle = luz; g.fillRect(px, py, pw, ph)
  return c
}

// ── as bolas: esfera por pixel ──
const TW = 256, TH = 128

function texturaDa(id: number): Uint32Array {
  const c = tela(TW, TH), g = c.getContext("2d")!
  const cor = corDe(id)
  const listrada = id > 8
  g.fillStyle = listrada ? "#f4f1ea" : cor; g.fillRect(0, 0, TW, TH)
  if (listrada) { g.fillStyle = cor; g.fillRect(0, TH * 0.2, TW, TH * 0.6) }
  if (id === 0) {
    // a branca: pontinhos vermelhos (dá pra ver o efeito girar)
    g.fillStyle = "#e3262f"
    for (const u of [0, 0.25, 0.5, 0.75, 1]) { g.beginPath(); g.ellipse(u * TW, TH / 2, 4.5, 7, 0, 0, Math.PI * 2); g.fill() }
    g.fillRect(0, 0, TW, 3); g.fillRect(0, TH - 3, TW, 3)
  } else {
    // o número, dos dois lados
    for (const u of [0, 0.5, 1]) {
      g.save(); g.translate(u * TW, TH / 2)
      g.fillStyle = "#f8f5ee"; g.beginPath(); g.ellipse(0, 0, 14.5, 23, 0, 0, Math.PI * 2); g.fill()
      g.scale(0.63, 1); g.fillStyle = "#111"; g.font = `900 ${id > 9 ? 25 : 29}px "Arial Black", system-ui, sans-serif`
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(id), id > 9 ? -1 : 0, 2)
      g.restore()
    }
  }
  return new Uint32Array(g.getImageData(0, 0, TW, TH).data.buffer.slice(0))
}

// a orientação de cada bola: matriz 3×3 (coluna k = eixo k da bola no mundo)
export type Ori = Float64Array
export function oriInicial(rand = Math.random): Ori {
  // o número virado pra cima (como no triângulo), girado à toa
  const a = rand() * Math.PI * 2, t = (rand() - 0.5) * 0.5
  const o = new Float64Array(9)
  // eixo x da bola → +z (pra cima); eixo z → horizontal
  const zx = Math.cos(a), zy = Math.sin(a)
  o[0] = 0; o[3] = 0; o[6] = 1 // coluna 0 = (0,0,1)
  o[2] = zx; o[5] = zy; o[8] = 0 // coluna 2
  o[1] = o[5] * o[6] - o[8] * o[3]; o[4] = o[8] * o[0] - o[2] * o[6]; o[7] = o[2] * o[3] - o[5] * o[0] // y = z × x
  girar(o, -zy, zx, 0, t)
  return o
}
// gira a orientação em torno do eixo (ax,ay,az) unitário, ângulo th (Rodrigues), e reortonormaliza
export function girar(o: Ori, ax: number, ay: number, az: number, th: number) {
  const c = Math.cos(th), s = Math.sin(th), k = 1 - c
  const r00 = c + ax * ax * k, r01 = ax * ay * k - az * s, r02 = ax * az * k + ay * s
  const r10 = ay * ax * k + az * s, r11 = c + ay * ay * k, r12 = ay * az * k - ax * s
  const r20 = az * ax * k - ay * s, r21 = az * ay * k + ax * s, r22 = c + az * az * k
  for (let j = 0; j < 3; j++) {
    const a = o[j], b = o[3 + j], d = o[6 + j]
    o[j] = r00 * a + r01 * b + r02 * d
    o[3 + j] = r10 * a + r11 * b + r12 * d
    o[6 + j] = r20 * a + r21 * b + r22 * d
  }
  // Gram–Schmidt nas colunas 0 e 1; a 2 = 0 × 1
  let n = Math.hypot(o[0], o[3], o[6]); o[0] /= n; o[3] /= n; o[6] /= n
  const p = o[1] * o[0] + o[4] * o[3] + o[7] * o[6]
  o[1] -= p * o[0]; o[4] -= p * o[3]; o[7] -= p * o[6]
  n = Math.hypot(o[1], o[4], o[7]); o[1] /= n; o[4] /= n; o[7] /= n
  o[2] = o[3] * o[7] - o[6] * o[4]; o[5] = o[6] * o[1] - o[0] * o[7]; o[8] = o[0] * o[4] - o[3] * o[1]
}

export class Bolas {
  r = 0 // raio em px do aparelho
  S = 0 // lado do sprite
  private nX!: Float32Array; private nY!: Float32Array; private nZ!: Float32Array
  private luz!: Float32Array; private bri!: Float32Array; private alf!: Float32Array; private aro!: Float32Array
  private tex = new Map<number, Uint32Array>()
  sprite = new Map<number, HTMLCanvasElement>()
  private img = new Map<number, ImageData>()
  ori = new Map<number, Ori>()
  sujo = new Set<number>()
  sombra!: HTMLCanvasElement
  retrato = false
  pixels = 0 // quantos pixels pintou no último quadro (pra medir)

  medir(r: number, retrato: boolean) {
    this.retrato = retrato
    this.r = r
    const S = (this.S = Math.ceil(r * 2) + 2)
    const n = S * S
    this.nX = new Float32Array(n); this.nY = new Float32Array(n); this.nZ = new Float32Array(n)
    this.luz = new Float32Array(n); this.bri = new Float32Array(n); this.alf = new Float32Array(n); this.aro = new Float32Array(n)
    // a luz: do lampião, um pouco pra cima-esquerda na tela
    let lx = -0.35, ly = 0.45, lz = 0.82
    const ln = Math.hypot(lx, ly, lz); lx /= ln; ly /= ln; lz /= ln
    let hx = lx, hy = ly, hz = lz + 1
    const hn = Math.hypot(hx, hy, hz); hx /= hn; hy /= hn; hz /= hn
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const k = j * S + i
      const x = (i + 0.5 - S / 2) / r, y = -(j + 0.5 - S / 2) / r
      const d = Math.hypot(x, y)
      const a = Math.max(0, Math.min(1, (1 - d) * r + 0.5))
      this.alf[k] = a
      if (a <= 0) continue
      const dd = Math.min(d, 0.999)
      const f = d > 0 ? dd / d : 0
      const nx = x * f, ny = y * f, nz = Math.sqrt(1 - dd * dd)
      this.nX[k] = nx; this.nY[k] = ny; this.nZ[k] = nz
      const lam = Math.max(0, nx * lx + ny * ly + nz * lz)
      this.luz[k] = 0.28 + 0.8 * lam
      const sp = Math.max(0, nx * hx + ny * hy + nz * hz)
      this.bri[k] = Math.pow(sp, 60) * 255 + Math.pow(sp, 6) * 28
      // o aro: o neon ciano do bar refletindo na borda de baixo
      this.aro[k] = Math.pow(1 - nz, 3) * Math.max(0, -ny * 0.7 + nx * 0.3 + 0.3)
    }
    // a sombra
    const sh = tela(S * 2, S * 2), g = sh.getContext("2d")!
    const gr = g.createRadialGradient(S, S, 0, S, S, r * 1.25)
    gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(0.7, "rgba(0,0,0,0.25)"); gr.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = gr; g.fillRect(0, 0, S * 2, S * 2)
    this.sombra = sh
    this.sprite.clear(); this.img.clear()
    for (const id of this.ori.keys()) this.sujo.add(id)
  }

  garantir(id: number) {
    if (!this.tex.has(id)) this.tex.set(id, texturaDa(id))
    if (!this.ori.has(id)) { this.ori.set(id, oriInicial()); this.sujo.add(id) }
    if (!this.sprite.has(id)) {
      const c = tela(this.S, this.S)
      this.sprite.set(id, c)
      this.img.set(id, c.getContext("2d")!.createImageData(this.S, this.S))
      this.sujo.add(id)
    }
  }

  // gira pelo ω da física durante dt
  rolar(b: Bola, dt: number) {
    const w = Math.hypot(b.wx, b.wy, b.wz)
    if (w * dt < 1e-4) return
    girar(this.ori.get(b.id)!, b.wx / w, b.wy / w, b.wz / w, w * dt)
    this.sujo.add(b.id)
  }

  pintar(id: number) {
    this.garantir(id)
    const o = this.ori.get(id)!, tex = this.tex.get(id)!, img = this.img.get(id)!
    const out = new Uint32Array(img.data.buffer)
    // tela → mundo: em pé, x_mundo = y_tela, y_mundo = −x_tela
    // local = Oᵀ · mundo
    let a00, a01, a02, a10, a11, a12, a20, a21, a22
    if (this.retrato) {
      // mundo = (Y, −X, Z)
      a00 = -o[3]; a01 = o[0]; a02 = o[6]
      a10 = -o[4]; a11 = o[1]; a12 = o[7]
      a20 = -o[5]; a21 = o[2]; a22 = o[8]
    } else {
      a00 = o[0]; a01 = o[3]; a02 = o[6]
      a10 = o[1]; a11 = o[4]; a12 = o[7]
      a20 = o[2]; a21 = o[5]; a22 = o[8]
    }
    const n = this.S * this.S
    const nX = this.nX, nY = this.nY, nZ = this.nZ, luz = this.luz, bri = this.bri, alf = this.alf, aro = this.aro
    const U = TW / (2 * Math.PI)
    let pix = 0
    for (let k = 0; k < n; k++) {
      const al = alf[k]
      if (al <= 0) { out[k] = 0; continue }
      pix++
      const x = nX[k], y = nY[k], z = nZ[k]
      const lx = a00 * x + a01 * y + a02 * z
      const ly = a10 * x + a11 * y + a12 * z
      const lz = a20 * x + a21 * y + a22 * z
      let u = (Math.atan2(ly, lx) * U + TW / 2) | 0
      if (u >= TW) u = TW - 1; else if (u < 0) u = 0
      let v = ((1 - lz) * 0.5 * TH) | 0
      if (v >= TH) v = TH - 1; else if (v < 0) v = 0
      const t = tex[v * TW + u]
      const li = luz[k], br = bri[k], ar = aro[k]
      let rr = (t & 255) * li + br + ar * 40
      let gg = ((t >> 8) & 255) * li + br + ar * 230
      let bb = ((t >> 16) & 255) * li + br + ar * 255
      if (rr > 255) rr = 255; if (gg > 255) gg = 255; if (bb > 255) bb = 255
      out[k] = (((al * 255) | 0) << 24) | ((bb | 0) << 16) | ((gg | 0) << 8) | (rr | 0)
    }
    this.sprite.get(id)!.getContext("2d")!.putImageData(img, 0, 0)
    this.pixels += pix
  }

  // repinta só o que girou
  atualizar() {
    this.pixels = 0
    for (const id of this.sujo) this.pintar(id)
    this.sujo.clear()
  }
}

// ── o taco ──
export function pintarTaco(s: number): HTMLCanvasElement {
  const comp = Math.round(1.45 * s), esp = Math.max(4, Math.round(0.03 * s))
  const c = tela(comp, esp), g = c.getContext("2d")!
  // fino na ponta (x=0), grosso no cabo
  const meio = esp / 2
  const fino = 0.0065 * s, grosso = 0.0135 * s
  const corpo = new Path2D()
  corpo.moveTo(0, meio - fino); corpo.lineTo(comp, meio - grosso); corpo.lineTo(comp, meio + grosso); corpo.lineTo(0, meio + fino); corpo.closePath()
  const mad = g.createLinearGradient(0, 0, comp, 0)
  mad.addColorStop(0, "#f0e2c4"); mad.addColorStop(0.012, "#f0e2c4")
  mad.addColorStop(0.013, "#2a6bff"); mad.addColorStop(0.03, "#2a6bff") // o giz e a virola
  mad.addColorStop(0.031, "#fbf7ee"); mad.addColorStop(0.055, "#fbf7ee")
  mad.addColorStop(0.056, "#d9b98a"); mad.addColorStop(0.6, "#b0814f")
  mad.addColorStop(0.601, "#1b1024"); mad.addColorStop(1, "#0d0814")
  g.fillStyle = mad; g.fill(corpo)
  // o brilho de cima
  const bri = g.createLinearGradient(0, meio - grosso, 0, meio + grosso)
  bri.addColorStop(0, "rgba(255,255,255,0.0)"); bri.addColorStop(0.35, "rgba(255,255,255,0.35)"); bri.addColorStop(0.6, "rgba(255,255,255,0)"); bri.addColorStop(1, "rgba(0,0,0,0.35)")
  g.fillStyle = bri; g.fill(corpo)
  // a faixa neon no cabo
  g.fillStyle = NEON_ROSA
  g.fillRect(comp * 0.62, meio - grosso, comp * 0.012, grosso * 2)
  g.fillRect(comp * 0.66, meio - grosso, comp * 0.004, grosso * 2)
  return c
}
