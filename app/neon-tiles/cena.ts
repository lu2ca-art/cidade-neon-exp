// Desenho do GUITAR DRIVER em canvas 2D: o palco (banda + galera + luz),
// o braço em perspectiva com as notas, e as cutscenes. Tudo procedural.

import type { Instrumento, Modelo, Palco } from "./dados"

export const LANES = 4
export const COR_LANE = ["#5dffa0", "#ff3d5a", "#ffe14d", "#2fe8ff"] // verde, vermelho, amarelo, azul (GH)

export interface Nota {
  id: number
  lane: number
  t: number // segundos na faixa
  dur: number // segundos (0 = nota curta)
  estrela: boolean
  acertou: boolean
  errou: boolean
  segurando: boolean
  soltou: boolean
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}

function rnd(seed: number) {
  const x = Math.sin(seed * 999.13) * 43758.5453
  return x - Math.floor(x)
}

/* ─── palco ────────────────────────────────────────────── */
export interface EstadoPalco {
  palco: Palco
  energia: number // 0..1 (medidor da galera)
  neon: boolean
  batida: number // 0..1, pulso no tempo
  t: number
  instrumento: Instrumento
  modelo: Modelo
  vaia?: boolean
}

export function desenharPalco(g: CanvasRenderingContext2D, w: number, h: number, e: EstadoPalco) {
  const cor = e.neon ? "#b38cff" : e.palco.cor
  // fundo
  const bg = g.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, "#05040f")
  bg.addColorStop(0.55, hexA(cor, 0.18))
  bg.addColorStop(1, "#05040f")
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)

  // telão de LED
  const tw = w * 0.7
  const th = h * 0.2
  const tx = (w - tw) / 2
  const ty = h * 0.06
  g.fillStyle = "#0a0a18"
  g.fillRect(tx, ty, tw, th)
  for (let x = 0; x < 24; x++)
    for (let y = 0; y < 7; y++) {
      const v = Math.sin(x * 0.5 + e.t * 3 + y * 0.8) * 0.5 + 0.5
      g.fillStyle = hexA(cor, 0.12 + v * 0.35 * (0.5 + e.batida * 0.5))
      g.fillRect(tx + (x * tw) / 24 + 1, ty + (y * th) / 7 + 1, tw / 24 - 2, th / 7 - 2)
    }
  g.fillStyle = "rgba(255,255,255,0.9)"
  g.font = `700 ${Math.round(th * 0.36)}px "Arial Narrow", system-ui, sans-serif`
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.fillText(e.neon ? "MODO NEON" : "LU2CA", w / 2, ty + th / 2)

  // treliça com spots girando no tempo
  g.fillStyle = "#1a1a2e"
  g.fillRect(0, ty - 10, w, 6)
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < 6; i++) {
    const x = (w / 6) * (i + 0.5)
    const ang = Math.sin(e.t * 1.3 + i) * 0.5 + (i % 2 ? 0.2 : -0.2)
    const len = h * 0.85
    const lx = x + Math.sin(ang) * len
    const ly = ty + Math.cos(ang) * len
    const gr = g.createLinearGradient(x, ty, lx, ly)
    const c2 = i % 2 ? cor : "#ffffff"
    gr.addColorStop(0, hexA(c2, 0.28 + e.batida * 0.25))
    gr.addColorStop(1, hexA(c2, 0))
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(x, ty - 4)
    g.lineTo(lx - 60, ly)
    g.lineTo(lx + 60, ly)
    g.closePath()
    g.fill()
  }
  g.globalCompositeOperation = "source-over"

  // chão do palco
  const py = h * 0.62
  g.fillStyle = "#0c0b1c"
  g.fillRect(0, py, w, h - py)
  g.fillStyle = hexA(cor, 0.5)
  g.fillRect(0, py, w, 2)

  // banda: baterista ao fundo, baixista e LU2CA
  const bob = Math.sin(e.t * Math.PI * 2 * 1.8) * 3 * (0.4 + e.energia)
  // a banda fica no fundo do palco, acima do braço — como no GH, o show
  // acontece atrás das notas
  const fundo = h * 0.5
  desenharBateria(g, w * 0.5, fundo - h * 0.01, h * 0.12, cor, e.batida)
  desenharMusico(g, w * 0.2, fundo, h * 0.2, e.instrumento === "baixo" ? e.modelo.corpo : "#9b8cff", "baixo", bob, e.t, cor)
  desenharMusico(g, w * 0.8, fundo, h * 0.21, e.instrumento === "guitarra" ? e.modelo.corpo : "#ff6a35", "guitarra", -bob, e.t + 0.4, cor)

  // fumaça
  g.globalCompositeOperation = "lighter"
  for (let i = 0; i < 5; i++) {
    const x = ((e.t * 12 + i * 170) % (w + 200)) - 100
    const gr = g.createRadialGradient(x, py, 0, x, py, 120)
    gr.addColorStop(0, hexA(cor, 0.08))
    gr.addColorStop(1, hexA(cor, 0))
    g.fillStyle = gr
    g.fillRect(x - 120, py - 120, 240, 240)
  }
  g.globalCompositeOperation = "source-over"

  // galera em primeiro plano
  desenharGalera(g, w, h, e.palco.publico, e.energia, e.t, cor, e.vaia)
}

function desenharBateria(g: CanvasRenderingContext2D, x: number, y: number, s: number, cor: string, batida: number) {
  g.fillStyle = "#0a0a14"
  g.beginPath()
  g.ellipse(x, y - s * 0.28, s * 0.35, s * 0.3, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = hexA(cor, 0.7)
  g.lineWidth = 2
  g.stroke()
  // pratos piscam na batida
  for (const k of [-1, 1]) {
    g.fillStyle = hexA("#ffe9a8", 0.35 + batida * 0.6)
    g.beginPath()
    g.ellipse(x + k * s * 0.55, y - s * 0.7, s * 0.2, s * 0.04, k * 0.2, 0, Math.PI * 2)
    g.fill()
  }
  // baterista
  g.fillStyle = "#07060e"
  g.beginPath()
  g.arc(x, y - s * 0.95 - batida * 3, s * 0.12, 0, Math.PI * 2)
  g.fill()
  g.fillRect(x - s * 0.13, y - s * 0.85, s * 0.26, s * 0.3)
}

function desenharMusico(g: CanvasRenderingContext2D, x: number, y: number, s: number, corInst: string, tipo: Instrumento, bob: number, t: number, luz: string) {
  const topo = y - s + bob
  // contraluz
  g.save()
  g.shadowColor = luz
  g.shadowBlur = 18
  g.fillStyle = "#06050c"
  // pernas
  g.fillRect(x - s * 0.1, y - s * 0.42, s * 0.07, s * 0.42)
  g.fillRect(x + s * 0.03, y - s * 0.42, s * 0.07, s * 0.42)
  // tronco
  g.beginPath()
  g.roundRect(x - s * 0.13, topo + s * 0.2, s * 0.26, s * 0.42, s * 0.05)
  g.fill()
  // cabeça (cabelo volumoso)
  g.beginPath()
  g.arc(x, topo + s * 0.1, s * 0.1, 0, Math.PI * 2)
  g.fill()
  g.restore()
  // instrumento atravessado no corpo
  g.save()
  g.translate(x, topo + s * 0.5)
  g.rotate(-0.45 + Math.sin(t * 5) * 0.05)
  const comp = tipo === "baixo" ? s * 0.78 : s * 0.62
  g.fillStyle = "#1a1a24"
  g.fillRect(-comp * 0.1, -s * 0.018, comp, s * 0.036) // braço
  g.fillStyle = corInst
  g.shadowColor = corInst
  g.shadowBlur = 14
  g.beginPath()
  g.ellipse(-comp * 0.12, 0, s * 0.13, s * 0.1, 0, 0, Math.PI * 2) // corpo
  g.fill()
  g.restore()
}

function desenharGalera(g: CanvasRenderingContext2D, w: number, h: number, publico: number, energia: number, t: number, cor: string, vaia?: boolean) {
  const n = Math.min(70, Math.max(6, Math.round(publico / 8)))
  const base = h
  for (let fila = 0; fila < 3; fila++) {
    const qt = Math.round(n / 3) + fila * 3
    for (let i = 0; i < qt; i++) {
      const sd = fila * 100 + i
      const x = ((i + rnd(sd) * 0.8) / qt) * w
      const pulo = vaia ? 0 : Math.max(0, Math.sin(t * 7 + rnd(sd) * 6)) * 10 * energia
      const s = h * (0.1 + fila * 0.035)
      const y = base - fila * h * 0.035 + (fila === 2 ? 0 : 0) - pulo
      g.fillStyle = fila === 2 ? "#020205" : fila === 1 ? "#07060f" : "#0b0a18"
      g.beginPath()
      g.arc(x, y - s * 0.8, s * 0.2, 0, Math.PI * 2)
      g.fill()
      g.fillRect(x - s * 0.28, y - s * 0.62, s * 0.56, s * 0.7)
      // mãos pra cima quando a galera tá quente
      if (energia > 0.55 && !vaia && rnd(sd + 7) < energia) {
        g.fillRect(x - s * 0.3, y - s * 1.35, s * 0.08, s * 0.6)
        if (rnd(sd + 3) < 0.35) {
          // celular / isqueiro aceso
          g.globalCompositeOperation = "lighter"
          g.fillStyle = hexA(rnd(sd) < 0.5 ? "#ffffff" : cor, 0.9)
          g.fillRect(x - s * 0.31, y - s * 1.45, s * 0.1, s * 0.12)
          g.globalCompositeOperation = "source-over"
        }
      }
    }
  }
}

/* ─── braço (highway) em perspectiva ──────────────────── */
export interface EstadoBraco {
  notas: Nota[]
  agora: number
  janela: number // segundos visíveis à frente
  apertadas: boolean[]
  neon: boolean
  modelo: Modelo
  flashes: { lane: number; ate: number; tipo: "ok" | "erro" }[]
  multi: number
}

export function geometriaBraco(w: number, h: number) {
  const baseW = Math.min(w * 0.94, 520)
  const topoW = baseW * 0.22
  const yBase = h * 0.86
  const yTopo = h * 0.3
  return { baseW, topoW, yBase, yTopo, cx: w / 2 }
}

// z: 0 = linha de acerto, 1 = horizonte
function proj(z: number, lane: number, gb: ReturnType<typeof geometriaBraco>) {
  const p = 1 / (1 + z * 3.2)
  const y = gb.yTopo + (gb.yBase - gb.yTopo) * ((p - 1 / 4.2) / (1 - 1 / 4.2))
  const k = (y - gb.yTopo) / (gb.yBase - gb.yTopo)
  const larg = gb.topoW + (gb.baseW - gb.topoW) * k
  const x = gb.cx - larg / 2 + (larg / LANES) * (lane + 0.5)
  return { x, y, s: larg / LANES }
}

export function desenharBraco(g: CanvasRenderingContext2D, w: number, h: number, e: EstadoBraco) {
  const gb = geometriaBraco(w, h)
  const trilho = e.neon ? "#b38cff" : e.modelo.braco
  // braço
  g.save()
  g.beginPath()
  g.moveTo(gb.cx - gb.topoW / 2, gb.yTopo)
  g.lineTo(gb.cx + gb.topoW / 2, gb.yTopo)
  g.lineTo(gb.cx + gb.baseW / 2, gb.yBase + 30)
  g.lineTo(gb.cx - gb.baseW / 2, gb.yBase + 30)
  g.closePath()
  const gr = g.createLinearGradient(0, gb.yTopo, 0, gb.yBase)
  gr.addColorStop(0, "rgba(5,4,15,0)")
  gr.addColorStop(0.25, hexA(trilho, e.neon ? 0.55 : 0.8))
  gr.addColorStop(1, hexA(trilho, 0.95))
  g.fillStyle = gr
  g.fill()
  g.clip()
  // trastes correndo (sensação de velocidade)
  const passo = 0.25
  const fase = (e.agora % passo) / passo
  for (let k = 0; k < 10; k++) {
    const z = ((k - fase) * passo) / e.janela
    if (z < 0 || z > 1) continue
    const a = proj(z, 0, gb)
    const b = proj(z, LANES - 1, gb)
    g.strokeStyle = `rgba(255,255,255,${0.14 * (1 - z)})`
    g.lineWidth = 2 * (1 - z) + 0.5
    g.beginPath()
    g.moveTo(a.x - a.s / 2, a.y)
    g.lineTo(b.x + b.s / 2, b.y)
    g.stroke()
  }
  // cordas
  for (let l = 0; l < LANES; l++) {
    const a = proj(1, l, gb)
    const b = proj(0, l, gb)
    g.strokeStyle = hexA(COR_LANE[l], e.apertadas[l] ? 0.8 : 0.25)
    g.lineWidth = e.apertadas[l] ? 3 : 1.5
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y + 30)
    g.stroke()
  }
  g.restore()

  // notas (de trás pra frente)
  const vis = e.notas.filter((n) => n.t + n.dur >= e.agora - 0.2 && n.t <= e.agora + e.janela)
  for (let i = vis.length - 1; i >= 0; i--) {
    const n = vis[i]
    const z0 = (n.t - e.agora) / e.janela
    const cor = n.estrela ? "#ffffff" : COR_LANE[n.lane]
    // cauda da nota longa
    if (n.dur > 0) {
      const z1 = Math.min(1, (n.t + n.dur - e.agora) / e.janela)
      const zi = Math.max(0, z0)
      if (z1 > zi) {
        const a = proj(zi, n.lane, gb)
        const b = proj(z1, n.lane, gb)
        g.strokeStyle = hexA(n.soltou ? "#555566" : COR_LANE[n.lane], n.segurando ? 1 : 0.7)
        g.lineWidth = a.s * (n.segurando ? 0.22 : 0.16)
        g.lineCap = "round"
        g.beginPath()
        g.moveTo(a.x, a.y)
        g.lineTo(b.x, b.y)
        g.stroke()
      }
    }
    if (n.acertou || z0 < -0.05) continue
    if (z0 > 1) continue
    const p = proj(Math.max(0, z0), n.lane, gb)
    const r = p.s * 0.36
    g.save()
    g.globalAlpha = n.errou ? 0.25 : 1
    g.shadowColor = cor
    g.shadowBlur = n.estrela ? 22 : 12
    g.fillStyle = "#0b0a14"
    g.beginPath()
    g.ellipse(p.x, p.y, r, r * 0.55, 0, 0, Math.PI * 2)
    g.fill()
    g.lineWidth = Math.max(2, r * 0.22)
    g.strokeStyle = cor
    g.stroke()
    g.fillStyle = n.estrela ? hexA("#b38cff", 0.9) : hexA(cor, 0.85)
    g.beginPath()
    g.ellipse(p.x, p.y - r * 0.05, r * 0.55, r * 0.3, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }

  // linha de acerto: os 4 botões
  for (let l = 0; l < LANES; l++) {
    const p = proj(0, l, gb)
    const r = p.s * 0.38
    const ap = e.apertadas[l]
    g.save()
    g.shadowColor = COR_LANE[l]
    g.shadowBlur = ap ? 26 : 8
    g.lineWidth = 4
    g.strokeStyle = COR_LANE[l]
    g.fillStyle = ap ? hexA(COR_LANE[l], 0.55) : "rgba(10,10,20,0.85)"
    g.beginPath()
    g.ellipse(p.x, p.y, r, r * 0.55, 0, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.restore()
  }
  // explosões de acerto / erro
  g.globalCompositeOperation = "lighter"
  for (const f of e.flashes) {
    const vida = (f.ate - e.agora) / 0.25
    if (vida <= 0) continue
    const p = proj(0, f.lane, gb)
    const cor = f.tipo === "ok" ? (e.neon ? "#b38cff" : COR_LANE[f.lane]) : "#ff2436"
    const rr = p.s * (0.5 + (1 - vida) * 0.9)
    const gr2 = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr)
    gr2.addColorStop(0, hexA(cor, 0.9 * vida))
    gr2.addColorStop(1, hexA(cor, 0))
    g.fillStyle = gr2
    g.fillRect(p.x - rr, p.y - rr, rr * 2, rr * 2)
    if (f.tipo === "ok") {
      g.strokeStyle = hexA("#ffffff", vida)
      g.lineWidth = 2
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        g.beginPath()
        g.moveTo(p.x + Math.cos(a) * rr * 0.4, p.y + Math.sin(a) * rr * 0.25)
        g.lineTo(p.x + Math.cos(a) * rr * 0.9, p.y + Math.sin(a) * rr * 0.5)
        g.stroke()
      }
    }
  }
  g.globalCompositeOperation = "source-over"
}

/* ─── cutscenes ──────────────────────────────────────────── */
export type Tomada = "fachada" | "backstage" | "contagem" | "final"

export function desenharTomada(
  g: CanvasRenderingContext2D, w: number, h: number, tomada: Tomada, t: number,
  d: { palco: Palco; modelo: Modelo; contagem?: number; sucesso?: boolean; grana?: number },
) {
  const cor = d.palco.cor
  g.fillStyle = "#04030b"
  g.fillRect(0, 0, w, h)
  if (tomada === "fachada") {
    // rua molhada, prédio, letreiro piscando, chuva
    const zoom = 1 + t * 0.04
    g.save()
    g.translate(w / 2, h / 2)
    g.scale(zoom, zoom)
    g.translate(-w / 2, -h / 2)
    g.fillStyle = "#0b0a1c"
    g.fillRect(w * 0.08, h * 0.12, w * 0.84, h * 0.62)
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 7; x++) {
        if (rnd(x * 7 + y) < 0.45) {
          g.fillStyle = hexA(rnd(x + y * 3) < 0.7 ? "#ffcf8a" : cor, 0.5)
          g.fillRect(w * 0.12 + x * w * 0.11, h * 0.16 + y * h * 0.05, w * 0.05, h * 0.028)
        }
      }
    const pisca = Math.sin(t * 9) > -0.6 ? 1 : 0.25
    g.fillStyle = "#020208"
    g.fillRect(w * 0.1, h * 0.5, w * 0.8, h * 0.1)
    g.shadowColor = cor
    g.shadowBlur = 30 * pisca
    g.fillStyle = hexA(cor, pisca)
    g.font = `700 ${Math.round(w * 0.058)}px "Arial Narrow", system-ui, sans-serif`
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.fillText(d.palco.fachada, w / 2, h * 0.55, w * 0.76)
    g.shadowBlur = 0
    // porta com luz vazando
    const gr = g.createLinearGradient(0, h * 0.62, 0, h)
    gr.addColorStop(0, hexA(cor, 0.35))
    gr.addColorStop(1, hexA(cor, 0))
    g.fillStyle = gr
    g.fillRect(w * 0.4, h * 0.62, w * 0.2, h * 0.38)
    g.restore()
    // chão molhado refletindo
    g.fillStyle = hexA(cor, 0.1)
    g.fillRect(0, h * 0.78, w, h * 0.22)
  } else if (tomada === "backstage") {
    // corredor, silhueta de costas com o instrumento, luz do palco no fim
    const gr = g.createRadialGradient(w / 2, h * 0.45, 10, w / 2, h * 0.45, w * 0.8)
    gr.addColorStop(0, hexA(cor, 0.55))
    gr.addColorStop(0.35, hexA(cor, 0.12))
    gr.addColorStop(1, "rgba(0,0,0,0)")
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
    g.strokeStyle = "rgba(255,255,255,0.06)"
    for (let k = 0; k < 8; k++) {
      g.beginPath()
      g.moveTo(0, h * 0.1 + k * 12)
      g.lineTo(w / 2 - 40, h * 0.45)
      g.moveTo(w, h * 0.1 + k * 12)
      g.lineTo(w / 2 + 40, h * 0.45)
      g.stroke()
    }
    desenharMusico(g, w / 2, h * 0.96, h * 0.62 * (1 + t * 0.03), d.modelo.corpo, d.modelo.tipo, 0, t, cor)
  } else if (tomada === "contagem") {
    const n = d.contagem ?? 0
    g.fillStyle = hexA(cor, 0.08 + (n > 0 ? 0.05 : 0))
    g.fillRect(0, 0, w, h)
    g.fillStyle = "#fff"
    g.shadowColor = cor
    g.shadowBlur = 40
    g.font = `800 ${Math.round(h * 0.3)}px "Arial Narrow", system-ui, sans-serif`
    g.textAlign = "center"
    g.textBaseline = "middle"
    if (n > 0) g.fillText(String(n), w / 2, h / 2)
    g.shadowBlur = 0
    // baquetas se cruzando
    for (const k of [-1, 1]) {
      g.save()
      g.translate(w / 2 + k * 40, h * 0.78)
      g.rotate(k * (0.5 + Math.abs(Math.sin(t * 8)) * 0.3))
      g.fillStyle = "#e9e3d5"
      g.fillRect(-4, -110, 8, 120)
      g.restore()
    }
  } else if (tomada === "final") {
    const ok = d.sucesso
    // galera enorme de mãos pra cima, papel picado caindo
    const e = { palco: d.palco, energia: ok ? 1 : 0.05, neon: false, batida: ok ? Math.abs(Math.sin(t * 6)) : 0, t, instrumento: d.modelo.tipo, modelo: d.modelo, vaia: !ok }
    desenharPalco(g, w, h, e)
    if (ok) {
      for (let i = 0; i < 60; i++) {
        const x = (rnd(i) * w + t * 20 * (rnd(i + 1) - 0.5)) % w
        const y = ((rnd(i + 9) * h + t * (80 + rnd(i) * 80)) % h)
        g.fillStyle = ["#ff3fb0", "#2fe8ff", "#ffc857", "#ffffff"][i % 4]
        g.fillRect(x, y, 6, 9)
      }
    }
  }
  // barras de cinema
  g.fillStyle = "#000"
  g.fillRect(0, 0, w, h * 0.09)
  g.fillRect(0, h * 0.91, w, h * 0.09)
}
