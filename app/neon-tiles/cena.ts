// Desenho do GUITAR DRIVER em canvas 2D: o palco (banda + galera + luz),
// o braço em perspectiva com as notas, e as cutscenes. Tudo procedural.

import type { Instrumento, Modelo, Palco } from "./dados"
import { desenharCenario } from "./cenarios"

export const LANES = 4
export const COR_LANE = ["#2bd14f", "#ff2b3a", "#ffd21a", "#2a8cff"] // verde, vermelho, amarelo, azul (as cores clássicas)

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
  frase?: number // frase de NEON (todas acertadas = enche o tubo)
  ataque?: boolean // batalha: acertar a frase dá um ataque
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
  imgs?: Partial<Record<Instrumento, HTMLImageElement>> // os instrumentos de verdade (instrumentos.ts)
  publico?: number // quanta gente veio (sai da popularidade)
  show?: boolean // durante o show a galera fica dos lados da pista (como no GH)
}

export function desenharPalco(g: CanvasRenderingContext2D, w: number, h: number, e: EstadoPalco) {
  const cor = e.neon ? "#b38cff" : e.palco.cor
  // cada lugar da cidade tem o seu cenário e o seu ângulo (cenarios.ts)
  const disp = desenharCenario(g, w, h, e.palco.id, { t: e.t, cor, batida: e.batida, energia: e.energia, neon: e.neon })
  if (!disp) {
    // a arena: o palco grande com telão de LED
    const bg = g.createLinearGradient(0, 0, 0, h)
    bg.addColorStop(0, "#05040f")
    bg.addColorStop(0.55, hexA(cor, 0.18))
    bg.addColorStop(1, "#05040f")
    g.fillStyle = bg
    g.fillRect(0, 0, w, h)
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
    const py = h * 0.62
    g.fillStyle = "#0c0b1c"
    g.fillRect(0, py, w, h - py)
    g.fillStyle = hexA(cor, 0.5)
    g.fillRect(0, py, w, 2)
  } else if (e.neon) {
    // o modo NEON tinge qualquer lugar
    g.fillStyle = hexA("#b38cff", 0.18)
    g.fillRect(0, 0, w, h)
  }

  // a banda, no palco de cada lugar (no fundo, atrás do braço, como no GH)
  const bob = Math.sin(e.t * Math.PI * 2 * 1.8) * 3 * (0.4 + e.energia)
  const fundo = disp ? disp.fundo : h * 0.5
  const k = disp ? disp.escala : 1
  const bx = disp ? disp.baixo[0] : w * 0.2
  const gx = disp ? disp.guitarra[0] : w * 0.8
  const bat = disp ? disp.bateria : [w * 0.5, h * 0.12]
  if (bat) desenharBateria(g, bat[0], fundo - h * 0.01, h * 0.12 * k, cor, e.batida)
  desenharMusico(g, bx, fundo, h * 0.2 * k, e.instrumento === "baixo" ? e.modelo.corpo : "#9b8cff", "baixo", bob, e.t, cor, e.imgs?.baixo)
  desenharMusico(g, gx, fundo, h * 0.21 * k, e.instrumento === "guitarra" ? e.modelo.corpo : "#ff6a35", "guitarra", -bob, e.t + 0.4, cor, e.imgs?.guitarra)

  if (!disp) {
    const py = h * 0.62
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
  }

  // a galera em primeiro plano: quanta gente veio (no começo, uma pessoa)
  if (e.show) desenharGaleraLados(g, w, h, e.publico ?? 40, e.energia, e.t, cor, fundo, e.vaia)
  else desenharGalera(g, w, h, e.publico ?? 40, e.energia, e.t, cor, e.vaia)
}

// durante o show: a galera dos dois lados da pista, em perspectiva (quanto
// mais perto, maior). Com 1 pessoa, ela fica sozinha na frente, à esquerda.
function desenharGaleraLados(g: CanvasRenderingContext2D, w: number, h: number, publico: number, energia: number, t: number, cor: string, fundo: number, vaia?: boolean) {
  const gb = geometriaBraco(w, h)
  const n = publico <= 40 ? publico : Math.min(120, Math.round(40 + (publico - 40) / 10))
  const y0 = Math.max(fundo + h * 0.02, gb.yTopo + h * 0.08)
  const y1 = gb.yBase + h * 0.06
  const filas = Math.max(1, Math.min(7, Math.ceil(n / 8)))
  for (let i = 0; i < n; i++) {
    const sd = i * 7 + 3
    // da frente pra trás: as primeiras pessoas ficam mais perto (embaixo)
    const fila = filas - 1 - (i % filas)
    const y = y0 + ((fila + 0.5) / filas) * (y1 - y0) + (rnd(sd) - 0.5) * h * 0.015
    const k = (y - gb.yTopo) / (gb.yBase - gb.yTopo)
    const meia = (gb.topoW + (gb.baseW - gb.topoW) * Math.min(1.1, k)) / 2
    const borda = gb.cx - meia - 6
    if (borda < 8) continue
    const s = h * (0.05 + k * 0.08)
    const lado = n === 1 ? -1 : i % 2 ? 1 : -1
    const fx = 0.12 + rnd(sd + 1) * 0.8
    const x = lado < 0 ? borda * fx : w - borda * fx
    const pulo = vaia ? 0 : Math.max(0, Math.sin(t * 7 + rnd(sd) * 6)) * 8 * energia
    const yy = y - pulo
    g.fillStyle = "#06050c"
    g.save()
    g.shadowColor = cor
    g.shadowBlur = 6
    g.beginPath()
    g.arc(x, yy - s * 0.8, s * 0.2, 0, Math.PI * 2)
    g.fill()
    g.fillRect(x - s * 0.26, yy - s * 0.62, s * 0.52, s * 0.75)
    g.restore()
    if (energia > 0.5 && !vaia && rnd(sd + 5) < energia) {
      g.fillStyle = "#06050c"
      g.fillRect(x + (lado < 0 ? s * 0.12 : -s * 0.2), yy - s * 1.3, s * 0.08, s * 0.6)
      if (rnd(sd + 9) < 0.3) {
        g.globalCompositeOperation = "lighter"
        g.fillStyle = hexA(rnd(sd) < 0.5 ? "#ffffff" : cor, 0.9)
        g.fillRect(x + (lado < 0 ? s * 0.11 : -s * 0.21), yy - s * 1.4, s * 0.1, s * 0.12)
        g.globalCompositeOperation = "source-over"
      }
    }
  }
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

function desenharMusico(g: CanvasRenderingContext2D, x: number, y: number, s: number, corInst: string, tipo: Instrumento, bob: number, t: number, luz: string, img?: HTMLImageElement) {
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
  // o instrumento atravessado no corpo: o desenho de verdade (braço pra cima e pra esquerda)
  g.save()
  g.translate(x + s * 0.02, topo + s * 0.56)
  g.rotate(-1.02 + Math.sin(t * 5) * 0.04)
  if (img && img.complete && img.naturalWidth) {
    const alt = (tipo === "baixo" ? 1.02 : 0.86) * s
    const larg = (alt * img.naturalWidth) / img.naturalHeight
    // o corpo do instrumento fica na mão (≈ 75% da altura da imagem)
    g.shadowColor = luz
    g.shadowBlur = 10
    g.drawImage(img, -larg / 2, -alt * 0.76, larg, alt)
  } else {
    const comp = tipo === "baixo" ? s * 0.78 : s * 0.62
    g.fillStyle = "#1a1a24"
    g.fillRect(-s * 0.018, -comp, s * 0.036, comp)
    g.fillStyle = corInst
    g.shadowColor = corInst
    g.shadowBlur = 14
    g.beginPath()
    g.ellipse(0, s * 0.02, s * 0.13, s * 0.1, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

function desenharGalera(g: CanvasRenderingContext2D, w: number, h: number, publico: number, energia: number, t: number, cor: string, vaia?: boolean) {
  // até 40 pessoas, uma silhueta cada; depois disso a multidão adensa
  const n = publico <= 40 ? publico : Math.min(110, Math.round(40 + (publico - 40) / 12))
  const filas = n <= 6 ? 1 : n <= 20 ? 2 : 3
  let feitos = 0
  for (let fila = filas - 1; fila >= 0; fila--) {
    const qt = fila === filas - 1 ? n - Math.floor((n * (filas - 1)) / filas) : Math.floor(n / filas)
    for (let i = 0; i < qt && feitos < n; i++, feitos++) {
      const sd = fila * 100 + i
      // pouca gente: em pé, espalhada perto do palco (a multidão de 1 no meio)
      const x = qt === 1 ? w * 0.5 : ((i + 0.5 + (rnd(sd) - 0.5) * 0.6) / qt) * w
      const pulo = vaia ? 0 : Math.max(0, Math.sin(t * 7 + rnd(sd) * 6)) * 10 * energia
      const s = h * (0.1 + fila * 0.035)
      const y = h - fila * h * 0.035 - pulo
      g.fillStyle = fila === 2 ? "#020205" : fila === 1 ? "#07060f" : "#0b0a18"
      g.beginPath()
      g.arc(x, y - s * 0.8, s * 0.2, 0, Math.PI * 2)
      g.fill()
      g.fillRect(x - s * 0.28, y - s * 0.62, s * 0.56, s * 0.7)
      if (energia > 0.55 && !vaia && rnd(sd + 7) < energia) {
        g.fillRect(x - s * 0.3, y - s * 1.35, s * 0.08, s * 0.6)
        if (rnd(sd + 3) < 0.35) {
          g.globalCompositeOperation = "lighter"
          g.fillStyle = hexA(rnd(sd) < 0.5 ? "#ffffff" : cor, 0.9)
          g.fillRect(x - s * 0.31, y - s * 1.45, s * 0.1, s * 0.12)
          g.globalCompositeOperation = "source-over"
        }
      }
    }
  }
}

/* ─── a pista (highway) no estilo Guitar Hero ─────────── */
// O braço de madeira em perspectiva, com trilhos de metal nas bordas; as
// linhas de compasso correm no tempo da música (a grade da faixa); as notas
// são botões 3D (base escura, anel colorido, miolo branco); as notas longas
// têm cauda que treme quando você segura; no acerto sobe chama e faísca; os
// botões do pé do braço afundam quando você aperta.

export interface Particula { x: number; y: number; vx: number; vy: number; vida: number; cor: string; tam: number }

export interface EstadoBraco {
  notas: Nota[]
  agora: number
  janela: number // segundos visíveis à frente
  apertadas: boolean[]
  neon: boolean
  modelo: Modelo
  flashes: { lane: number; ate: number; tipo: "ok" | "erro"; perfeito?: boolean }[]
  multi: number
  bpm: number
  t0: number
  particulas: Particula[]
  invertido?: boolean // ataque da batalha: trilhas trocadas
  apagao?: boolean // ataque da batalha: só dá pra ver perto do pé
  tremor?: number // 0..1, tremida de câmera (erro)
}

export function geometriaBraco(w: number, h: number) {
  const baseW = w * 0.96
  const topoW = baseW * 0.3
  const yBase = h * 0.84
  const yTopo = h * 0.2
  return { baseW, topoW, yBase, yTopo, cx: w / 2 }
}

const K = 2.6 // força da perspectiva
// z: 0 = linha de acerto, 1 = horizonte
function proj(z: number, lane: number, gb: ReturnType<typeof geometriaBraco>, lanes = LANES) {
  const p = 1 / (1 + z * K)
  const p1 = 1 / (1 + K)
  const k = (p - p1) / (1 - p1)
  const y = gb.yTopo + (gb.yBase - gb.yTopo) * k
  const larg = gb.topoW + (gb.baseW - gb.topoW) * k
  const x = gb.cx - larg / 2 + (larg / lanes) * (lane + 0.5)
  return { x, y, s: larg / lanes, larg, k }
}

// a madeira do braço (textura vertical que corre com a música)
let texMadeira: HTMLCanvasElement | null = null
function madeira() {
  if (texMadeira) return texMadeira
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 512
  const g = c.getContext("2d")!
  const gr = g.createLinearGradient(0, 0, 256, 0)
  gr.addColorStop(0, "#1a0d07")
  gr.addColorStop(0.5, "#2e170c")
  gr.addColorStop(1, "#1a0d07")
  g.fillStyle = gr
  g.fillRect(0, 0, 256, 512)
  // veios
  for (let i = 0; i < 70; i++) {
    const x = rnd(i) * 256
    g.strokeStyle = `rgba(${rnd(i + 3) < 0.5 ? "90,45,20" : "10,4,2"},${0.15 + rnd(i + 5) * 0.25})`
    g.lineWidth = 0.6 + rnd(i + 7) * 1.6
    g.beginPath()
    g.moveTo(x, 0)
    for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 3, y)
    g.stroke()
  }
  texMadeira = c
  return c
}

function desenharGema(g: CanvasRenderingContext2D, x: number, y: number, r: number, cor: string, estrela: boolean, alfa: number) {
  g.save()
  g.globalAlpha = alfa
  const ry = r * 0.5
  // corpo (a espessura da nota, embaixo)
  g.fillStyle = "#08070c"
  g.beginPath()
  g.ellipse(x, y + ry * 0.45, r, ry, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = hexA(cor, 0.55)
  g.beginPath()
  g.ellipse(x, y + ry * 0.3, r, ry, 0, 0, Math.PI)
  g.fill()
  // tampa: anel colorido
  const anel = g.createLinearGradient(x, y - ry, x, y + ry)
  anel.addColorStop(0, "#ffffff")
  anel.addColorStop(0.25, estrela ? "#bff0ff" : cor)
  anel.addColorStop(1, estrela ? "#3aa6d8" : hexA(cor, 1))
  g.fillStyle = anel
  g.beginPath()
  g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2)
  g.fill()
  // aro escuro e miolo branco (o "botão")
  g.fillStyle = "#101018"
  g.beginPath()
  g.ellipse(x, y, r * 0.56, ry * 0.56, 0, 0, Math.PI * 2)
  g.fill()
  const miolo = g.createRadialGradient(x - r * 0.12, y - ry * 0.2, 0, x, y, r * 0.42)
  miolo.addColorStop(0, "#ffffff")
  miolo.addColorStop(1, estrela ? "#9fe6ff" : "#d9dbe6")
  g.fillStyle = miolo
  g.beginPath()
  g.ellipse(x, y, r * 0.38, ry * 0.38, 0, 0, Math.PI * 2)
  g.fill()
  if (estrela) {
    // nota de NEON: estrela por cima e brilho azul
    g.shadowColor = "#7fdcff"
    g.shadowBlur = r * 0.9
    g.fillStyle = "#ffffff"
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? r * 0.16 : r * 0.36
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.55)
    }
    g.closePath()
    g.fill()
  }
  // reflexo
  g.globalAlpha = alfa * 0.6
  g.fillStyle = "#ffffff"
  g.beginPath()
  g.ellipse(x - r * 0.35, y - ry * 0.45, r * 0.22, ry * 0.12, -0.2, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

export function desenharBraco(g: CanvasRenderingContext2D, w: number, h: number, e: EstadoBraco) {
  const gb = geometriaBraco(w, h)
  const tremor = e.tremor ?? 0
  g.save()
  if (tremor > 0) g.translate((Math.random() - 0.5) * 8 * tremor, (Math.random() - 0.5) * 5 * tremor)
  const beat = 60 / e.bpm
  // o braço pulsa de leve no tempo (cabeça da batida)
  const fb = ((e.agora - e.t0) / beat) % 1
  const pulso = Math.pow(1 - (fb < 0 ? fb + 1 : fb), 4)
  const lanes = LANES

  // ── a madeira, em fatias (perspectiva) ──
  const tex = madeira()
  const N = 70
  const pxPorSeg = 260
  for (let i = 0; i < N; i++) {
    const z0 = i / N, z1 = (i + 1) / N
    const a = proj(z0, 0, gb), b = proj(z1, 0, gb)
    const v = (((e.agora + z0 * e.janela) * pxPorSeg) % tex.height + tex.height) % tex.height
    const altura = Math.max(1, ((z1 - z0) * e.janela * pxPorSeg))
    const sy = tex.height - v - altura
    g.globalAlpha = 1
    g.drawImage(tex, 0, Math.max(0, sy), tex.width, Math.min(altura, tex.height), gb.cx - a.larg / 2, b.y, a.larg, a.y - b.y + 0.8)
  }
  // neblina no fundo (a pista some no horizonte) e brilho do NEON
  const neb = g.createLinearGradient(0, gb.yTopo, 0, gb.yBase)
  neb.addColorStop(0, "rgba(4,3,12,1)")
  neb.addColorStop(0.3, "rgba(4,3,12,0.5)")
  neb.addColorStop(0.6, "rgba(4,3,12,0)")
  g.fillStyle = neb
  const trap = () => {
    g.beginPath()
    g.moveTo(gb.cx - gb.topoW / 2, gb.yTopo)
    g.lineTo(gb.cx + gb.topoW / 2, gb.yTopo)
    g.lineTo(gb.cx + gb.baseW / 2, gb.yBase + 40)
    g.lineTo(gb.cx - gb.baseW / 2, gb.yBase + 40)
    g.closePath()
  }
  trap()
  g.fill()
  if (e.neon) {
    g.globalCompositeOperation = "lighter"
    const az = g.createLinearGradient(0, gb.yTopo, 0, gb.yBase)
    az.addColorStop(0, "rgba(60,160,255,0)")
    az.addColorStop(1, `rgba(60,160,255,${0.22 + pulso * 0.12})`)
    g.fillStyle = az
    trap()
    g.fill()
    g.globalCompositeOperation = "source-over"
  }

  // ── linhas de compasso e de tempo (no tempo da faixa) ──
  const kIni = Math.ceil((e.agora - e.t0) / beat - 0.5)
  for (let k = kIni; ; k++) {
    const tb = e.t0 + k * beat
    const z = (tb - e.agora) / e.janela
    if (z > 1) break
    if (z < -0.05) continue
    const a = proj(Math.max(0, z), 0, gb)
    const compasso = ((k % 4) + 4) % 4 === 0
    g.strokeStyle = compasso ? `rgba(255,255,255,${0.55 * (1 - z)})` : `rgba(255,255,255,${0.2 * (1 - z)})`
    g.lineWidth = (compasso ? 3 : 1.4) * (0.4 + a.k)
    g.beginPath()
    g.moveTo(gb.cx - a.larg / 2, a.y)
    g.lineTo(gb.cx + a.larg / 2, a.y)
    g.stroke()
  }
  // as divisões entre trilhas (cordas)
  for (let l = 1; l < lanes; l++) {
    const a = proj(1, l - 0.5, gb), b = proj(0, l - 0.5, gb)
    g.strokeStyle = "rgba(255,255,255,0.12)"
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y + 40)
    g.stroke()
  }
  // trilhos de metal nas bordas
  for (const lado of [-1, 1]) {
    const a = proj(1, 0, gb), b = proj(0, 0, gb)
    const xa = gb.cx + (lado * a.larg) / 2, xb = gb.cx + (lado * gb.baseW) / 2
    const gr = g.createLinearGradient(0, gb.yTopo, 0, gb.yBase)
    gr.addColorStop(0, "rgba(200,210,230,0)")
    gr.addColorStop(0.4, e.neon ? "#9fe6ff" : "#b8bfd0")
    gr.addColorStop(1, e.neon ? "#e6faff" : "#f2f4fa")
    g.strokeStyle = gr
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(xa, a.y)
    g.lineTo(xb, b.y + 40)
    g.stroke()
    g.strokeStyle = "rgba(0,0,0,0.6)"
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(xa - lado * 3, a.y)
    g.lineTo(xb - lado * 4, b.y + 40)
    g.stroke()
  }

  const laneDe = (l: number) => (e.invertido ? lanes - 1 - l : l)

  // ── caudas das notas longas ──
  const vis = e.notas.filter((n) => n.t + n.dur >= e.agora - 0.2 && n.t <= e.agora + e.janela)
  for (let i = vis.length - 1; i >= 0; i--) {
    const n = vis[i]
    if (n.dur <= 0) continue
    const z0 = Math.max(0, (n.t - e.agora) / e.janela)
    const z1 = Math.min(1, (n.t + n.dur - e.agora) / e.janela)
    if (z1 <= z0) continue
    const L = laneDe(n.lane)
    const cor = n.soltou ? "#4a4a58" : e.neon && n.segurando ? "#8fe3ff" : COR_LANE[n.lane]
    const passos = 18
    g.beginPath()
    const lados: { x: number; y: number; s: number }[] = []
    for (let k = 0; k <= passos; k++) {
      const z = z0 + ((z1 - z0) * k) / passos
      const p = proj(z, L, gb)
      const onda = n.segurando ? Math.sin(e.agora * 40 + z * 30) * p.s * 0.05 : 0
      lados.push({ x: p.x + onda, y: p.y, s: p.s * (n.segurando ? 0.2 : 0.15) })
    }
    lados.forEach((q, k) => (k ? g.lineTo(q.x - q.s / 2, q.y) : g.moveTo(q.x - q.s / 2, q.y)))
    for (let k = lados.length - 1; k >= 0; k--) g.lineTo(lados[k].x + lados[k].s / 2, lados[k].y)
    g.closePath()
    g.save()
    if (n.segurando) { g.shadowColor = cor; g.shadowBlur = 16 }
    g.fillStyle = hexA(cor, n.segurando ? 1 : 0.8)
    g.fill()
    g.restore()
  }

  // ── as notas (de trás pra frente) ──
  for (let i = vis.length - 1; i >= 0; i--) {
    const n = vis[i]
    const z0 = (n.t - e.agora) / e.janela
    if (n.acertou || z0 < -0.08 || z0 > 1) continue
    // apagão (ataque): a pista some longe do pé
    if (e.apagao && z0 > 0.32) continue
    const p = proj(Math.max(-0.08, z0), laneDe(n.lane), gb)
    const alfa = n.errou ? 0.22 : Math.min(1, (1 - z0) * 3.5)
    desenharGema(g, p.x, p.y, p.s * 0.4, e.neon && n.estrela ? "#9fe6ff" : COR_LANE[n.lane], n.estrela, alfa)
  }

  // ── a linha de acerto e os botões (frets) ──
  const base = proj(0, 0, gb)
  g.fillStyle = "rgba(0,0,0,0.55)"
  g.fillRect(gb.cx - base.larg / 2, base.y - base.s * 0.22, base.larg, base.s * 0.44)
  g.fillStyle = `rgba(255,255,255,${0.35 + pulso * 0.3})`
  g.fillRect(gb.cx - base.larg / 2, base.y - 1.5, base.larg, 3)
  for (let l = 0; l < lanes; l++) {
    const cor = COR_LANE[l]
    const p = proj(0, laneDe(l), gb)
    const r = p.s * 0.42
    const ap = e.apertadas[l]
    const dy = ap ? r * 0.12 : 0
    g.save()
    // base metálica
    const met = g.createLinearGradient(p.x, p.y - r * 0.5, p.x, p.y + r * 0.6)
    met.addColorStop(0, "#f2f4fa")
    met.addColorStop(0.5, "#7c8292")
    met.addColorStop(1, "#2a2d36")
    g.fillStyle = met
    g.beginPath()
    g.ellipse(p.x, p.y + r * 0.14, r * 1.04, r * 0.56, 0, 0, Math.PI * 2)
    g.fill()
    // anel colorido
    g.shadowColor = cor
    g.shadowBlur = ap ? 30 : 6
    g.fillStyle = ap ? cor : hexA(cor, 0.85)
    g.beginPath()
    g.ellipse(p.x, p.y + dy, r * 0.9, r * 0.47, 0, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
    // miolo: escuro solto, aceso apertado
    const mi = g.createRadialGradient(p.x, p.y + dy - r * 0.1, 0, p.x, p.y + dy, r * 0.6)
    if (ap) { mi.addColorStop(0, "#ffffff"); mi.addColorStop(1, cor) } else { mi.addColorStop(0, "#2a2a36"); mi.addColorStop(1, "#08080c") }
    g.fillStyle = mi
    g.beginPath()
    g.ellipse(p.x, p.y + dy, r * 0.6, r * 0.31, 0, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }

  // ── chamas, faíscas e erros ──
  g.globalCompositeOperation = "lighter"
  for (const f of e.flashes) {
    const vida = (f.ate - e.agora) / 0.35
    if (vida <= 0 || vida > 1) continue
    const p = proj(0, laneDe(f.lane), gb)
    if (f.tipo === "ok") {
      // a chama: sobe do botão e some
      const alt = p.s * (1.1 + (1 - vida) * 0.7)
      const larg = p.s * 0.42 * (0.6 + vida * 0.4)
      const cor = e.neon ? "#8fe3ff" : COR_LANE[f.lane]
      const gr = g.createLinearGradient(p.x, p.y, p.x, p.y - alt)
      gr.addColorStop(0, hexA("#ffffff", vida))
      gr.addColorStop(0.25, hexA("#ffd27a", vida * 0.9))
      gr.addColorStop(0.6, hexA(cor, vida * 0.6))
      gr.addColorStop(1, hexA(cor, 0))
      g.fillStyle = gr
      for (const k of [-1, 0, 1]) {
        g.beginPath()
        g.moveTo(p.x - larg + k * larg * 0.4, p.y)
        g.quadraticCurveTo(p.x + k * larg * 0.8 + Math.sin(e.agora * 30 + k) * larg * 0.2, p.y - alt * (k ? 0.6 : 1), p.x + larg * 0.2 + k * larg * 0.4, p.y - alt * (k ? 0.75 : 1.05))
        g.quadraticCurveTo(p.x + larg * 0.4 + k * larg * 0.3, p.y - alt * 0.4, p.x + larg + k * larg * 0.4, p.y)
        g.closePath()
        g.fill()
      }
      const gl = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 0.9)
      gl.addColorStop(0, hexA(cor, 0.7 * vida))
      gl.addColorStop(1, hexA(cor, 0))
      g.fillStyle = gl
      g.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2)
    } else {
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 0.7)
      gr.addColorStop(0, hexA("#ff2436", 0.6 * vida))
      gr.addColorStop(1, hexA("#ff2436", 0))
      g.fillStyle = gr
      g.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2)
    }
  }
  // faíscas
  for (const q of e.particulas) {
    g.fillStyle = hexA(q.cor, Math.min(1, q.vida * 2))
    g.fillRect(q.x, q.y, q.tam, q.tam)
  }
  g.globalCompositeOperation = "source-over"
  g.restore()
}

// solta faíscas de um acerto (o page.tsx guarda a lista e chama andarParticulas)
export function soltarFaiscas(lista: Particula[], w: number, h: number, lane: number, cor: string, n = 10, invertido = false) {
  const gb = geometriaBraco(w, h)
  const p = proj(0, invertido ? LANES - 1 - lane : lane, gb)
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
    const v = 120 + Math.random() * 380
    lista.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.4 + Math.random() * 0.4, cor: Math.random() < 0.5 ? "#ffffff" : cor, tam: 2 + Math.random() * 3 })
  }
  if (lista.length > 260) lista.splice(0, lista.length - 260)
}

export function andarParticulas(lista: Particula[], dt: number) {
  for (const q of lista) {
    q.x += q.vx * dt
    q.y += q.vy * dt
    q.vy += 900 * dt
    q.vida -= dt
  }
  for (let i = lista.length - 1; i >= 0; i--) if (lista[i].vida <= 0) lista.splice(i, 1)
}

/* ─── o HUD do show (desenhado no canvas) ──────────────── */
// À esquerda: os pontos e o multiplicador (o anel com as 10 luzes da
// sequência). À direita: o medidor da galera (ponteiro, vermelho→verde) e o
// tubo do NEON. No meio, os avisos de sequência.
export interface EstadoHud {
  pontos: number
  seq: number
  multi: number
  galera: number // 0..1
  neon: number // 0..1
  neonAtivo: boolean
  aviso?: { texto: string; ate: number; cor: string } | null
  agora: number
  duelo?: { voce: number; rival: string; ataque?: string | null; cartas: number } | null
  progresso: number // 0..1 da faixa
}

export function desenharHud(g: CanvasRenderingContext2D, w: number, h: number, e: EstadoHud) {
  const dpr = w / Math.max(1, g.canvas.clientWidth || w)
  const u = Math.min(w, h * 0.6) / 400 // unidade de tamanho
  g.save()
  const yHud = h * 0.93
  // ── pontos e multiplicador (esquerda) ──
  const mx = 44 * u, my = yHud
  const r = 26 * u
  g.fillStyle = "rgba(6,6,14,0.85)"
  g.beginPath()
  g.arc(mx, my, r + 5 * u, 0, Math.PI * 2)
  g.fill()
  const luzes = e.multi >= 4 ? 10 : e.seq % 10
  for (let i = 0; i < 10; i++) {
    const a0 = -Math.PI / 2 + (i / 10) * Math.PI * 2 + 0.05
    const a1 = a0 + (Math.PI * 2) / 10 - 0.1
    g.strokeStyle = i < luzes ? (e.neonAtivo ? "#8fe3ff" : ["#5dffa0", "#ffe14d", "#ff9000", "#ff3fb0"][Math.min(3, e.multi - 1)] ?? "#ff3fb0") : "rgba(255,255,255,0.12)"
    g.lineWidth = 5 * u
    g.beginPath()
    g.arc(mx, my, r, a0, a1)
    g.stroke()
  }
  g.fillStyle = e.neonAtivo ? "#8fe3ff" : "#ffffff"
  g.font = `900 ${Math.round(20 * u)}px "Arial Black", "Arial Narrow", system-ui, sans-serif`
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.fillText(`x${e.multi}`, mx, my + 1 * u)
  // pontos
  g.textAlign = "left"
  g.font = `800 ${Math.round(19 * u)}px ui-monospace, "SF Mono", Menlo, monospace`
  g.fillStyle = "#ffffff"
  g.shadowColor = "rgba(0,0,0,0.8)"
  g.shadowBlur = 6
  g.fillText(e.pontos.toLocaleString("pt-BR"), mx + r + 12 * u, my - 7 * u)
  g.font = `700 ${Math.round(9 * u)}px ui-monospace, Menlo, monospace`
  g.fillStyle = "rgba(255,255,255,0.55)"
  g.fillText(e.seq >= 4 ? `${e.seq} seguidas` : "pontos", mx + r + 12 * u, my + 11 * u)
  g.shadowBlur = 0

  // ── medidor da galera (direita): arco vermelho→amarelo→verde com ponteiro ──
  const gx = w - 50 * u, gy = yHud + 10 * u, gr = 34 * u
  g.fillStyle = "rgba(6,6,14,0.85)"
  g.beginPath()
  g.arc(gx, gy, gr + 6 * u, Math.PI, 0)
  g.closePath()
  g.fill()
  const fatias: [number, string][] = [[0, "#ff2436"], [0.33, "#ffe14d"], [0.66, "#5dffa0"]]
  fatias.forEach(([ini, cor], i) => {
    const fim = i < 2 ? fatias[i + 1][0] : 1
    g.strokeStyle = cor
    g.globalAlpha = e.galera >= ini ? 1 : 0.35
    g.lineWidth = 8 * u
    g.beginPath()
    g.arc(gx, gy, gr, Math.PI + ini * Math.PI + 0.03, Math.PI + fim * Math.PI - 0.03)
    g.stroke()
  })
  g.globalAlpha = 1
  const ang = Math.PI + e.galera * Math.PI
  g.strokeStyle = "#ffffff"
  g.lineWidth = 3 * u
  g.beginPath()
  g.moveTo(gx, gy)
  g.lineTo(gx + Math.cos(ang) * (gr - 3 * u), gy + Math.sin(ang) * (gr - 3 * u))
  g.stroke()
  g.fillStyle = "#ffffff"
  g.beginPath()
  g.arc(gx, gy, 4 * u, 0, Math.PI * 2)
  g.fill()
  g.font = `700 ${Math.round(8 * u)}px ui-monospace, Menlo, monospace`
  g.textAlign = "center"
  g.fillStyle = e.galera < 0.25 && Math.sin(e.agora * 12) > 0 ? "#ff2436" : "rgba(255,255,255,0.6)"
  g.fillText("GALERA", gx, gy + 10 * u)

  // ── tubo do NEON (acima do medidor) ──
  const tx = w - 92 * u, ty = yHud - 44 * u, tw = 84 * u, th = 10 * u
  g.fillStyle = "rgba(6,6,14,0.85)"
  g.beginPath()
  g.roundRect(tx - 3 * u, ty - 3 * u, tw + 6 * u, th + 6 * u, 8 * u)
  g.fill()
  const tubo = g.createLinearGradient(tx, 0, tx + tw, 0)
  tubo.addColorStop(0, "#3a7bff")
  tubo.addColorStop(1, "#9fe6ff")
  g.fillStyle = tubo
  g.shadowColor = "#7fdcff"
  g.shadowBlur = e.neon >= 0.5 ? 14 + Math.sin(e.agora * 10) * 6 : 0
  g.beginPath()
  g.roundRect(tx, ty, Math.max(0.01, tw * e.neon), th, 5 * u)
  g.fill()
  g.shadowBlur = 0
  g.strokeStyle = "rgba(255,255,255,0.25)"
  g.lineWidth = 1
  g.beginPath()
  g.roundRect(tx, ty, tw, th, 5 * u)
  g.stroke()
  g.fillStyle = "rgba(255,255,255,0.7)"
  g.font = `800 ${Math.round(8 * u)}px ui-monospace, Menlo, monospace`
  g.textAlign = "right"
  g.fillText(e.neonAtivo ? "NEON LIGADO" : e.neon >= 0.5 ? "NEON PRONTO · toque" : "NEON", tx + tw, ty - 7 * u)

  // ── progresso da faixa (linha fina no topo) ──
  g.fillStyle = "rgba(255,255,255,0.12)"
  g.fillRect(0, 0, w, 3 * dpr)
  g.fillStyle = "#ffffff"
  g.fillRect(0, 0, w * e.progresso, 3 * dpr)

  // ── duelo (batalha) ──
  if (e.duelo) {
    const bw = w * 0.7, bx = (w - bw) / 2, by = h * 0.06
    g.fillStyle = "rgba(6,6,14,0.85)"
    g.beginPath()
    g.roundRect(bx - 6, by - 18 * u, bw + 12, 34 * u, 10 * u)
    g.fill()
    g.fillStyle = "#ff2436"
    g.fillRect(bx, by, bw, 8 * u)
    g.fillStyle = "#5dffa0"
    g.fillRect(bx, by, bw * e.duelo.voce, 8 * u)
    g.fillStyle = "#ffffff"
    g.fillRect(bx + bw * e.duelo.voce - 2, by - 4 * u, 4, 16 * u)
    g.font = `800 ${Math.round(9 * u)}px ui-monospace, Menlo, monospace`
    g.textAlign = "left"
    g.fillText("VOCÊ", bx, by - 7 * u)
    g.textAlign = "right"
    g.fillText(e.duelo.rival.toUpperCase(), bx + bw, by - 7 * u)
    g.textAlign = "center"
    if (e.duelo.cartas > 0) { g.fillStyle = "#8fe3ff"; g.fillText(`${e.duelo.cartas} ataque${e.duelo.cartas > 1 ? "s" : ""} na mão · toque NEON`, w / 2, by + 22 * u) }
    if (e.duelo.ataque) { g.fillStyle = "#ff3fb0"; g.font = `900 ${Math.round(14 * u)}px "Arial Black", system-ui, sans-serif`; g.fillText(e.duelo.ataque, w / 2, by + 40 * u) }
  }

  // ── aviso grande (sequência, NEON, perdeu a sequência) ──
  if (e.aviso && e.aviso.ate > e.agora) {
    const vida = Math.min(1, (e.aviso.ate - e.agora) / 0.4)
    const escala = 1 + (1 - Math.min(1, (e.aviso.ate - e.agora) / 1.4)) * 0.15
    g.save()
    g.translate(w / 2, h * 0.36)
    g.scale(escala, escala)
    g.globalAlpha = vida
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.font = `900 ${Math.round(30 * u)}px "Arial Black", "Arial Narrow", system-ui, sans-serif`
    g.lineWidth = 6 * u
    g.strokeStyle = "rgba(0,0,0,0.85)"
    g.strokeText(e.aviso.texto, 0, 0)
    g.fillStyle = e.aviso.cor
    g.shadowColor = e.aviso.cor
    g.shadowBlur = 20
    g.fillText(e.aviso.texto, 0, 0)
    g.restore()
  }
  g.restore()
}

/* ─── cutscenes ──────────────────────────────────────────── */
export type Tomada = "fachada" | "backstage" | "contagem" | "final" | "estrada" | "cartaz"

export function desenharTomada(
  g: CanvasRenderingContext2D, w: number, h: number, tomada: Tomada, t: number,
  d: { palco: Palco; modelo: Modelo; contagem?: number; sucesso?: boolean; grana?: number; imgs?: Partial<Record<Instrumento, HTMLImageElement>>; titulo?: string; sub?: string; publico?: number },
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
    g.fillText(d.palco.fachada || d.palco.nome.toUpperCase(), w / 2, h * 0.55, w * 0.76)
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
    desenharMusico(g, w / 2, h * 0.96, h * 0.62 * (1 + t * 0.03), d.modelo.corpo, d.modelo.tipo, 0, t, cor, d.imgs?.[d.modelo.tipo])
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
  } else if (tomada === "estrada") {
    // a Kombi atravessando a cidade à noite, de lado, a caminho do próximo palco
    const ceu = g.createLinearGradient(0, 0, 0, h)
    ceu.addColorStop(0, "#05040f")
    ceu.addColorStop(0.55, hexA(cor, 0.25))
    ceu.addColorStop(0.62, "#07060f")
    g.fillStyle = ceu
    g.fillRect(0, 0, w, h)
    // estrelas
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + rnd(i) * 0.5})`; g.fillRect(rnd(i + 1) * w, rnd(i + 2) * h * 0.4, 1.5, 1.5) }
    // prédios em duas camadas (parallax)
    for (const [cam, vel, alt, tom] of [[0, 40, 0.3, "#0d0b1e"], [1, 110, 0.22, "#151230"]] as [number, number, number, string][]) {
      const larg = w * 0.14
      const off = (t * vel) % larg
      for (let i = -1; i < 9; i++) {
        const x = i * larg - off
        const hh = h * alt * (0.5 + rnd(i + Math.floor((t * vel) / larg) + cam * 50) * 0.8)
        const y = h * 0.62 - hh
        g.fillStyle = tom
        g.fillRect(x, y, larg - 4, hh)
        for (let j = 0; j < 8; j++) {
          if (rnd(i * 13 + j + cam * 7 + Math.floor((t * vel) / larg)) < 0.35) {
            g.fillStyle = hexA(rnd(j + i) < 0.6 ? "#ffcf8a" : cor, 0.7)
            g.fillRect(x + 6 + (j % 3) * (larg / 3.4), y + 10 + Math.floor(j / 3) * 16, larg / 6, 7)
          }
        }
      }
    }
    // a pista
    g.fillStyle = "#0b0a12"
    g.fillRect(0, h * 0.62, w, h * 0.38)
    g.fillStyle = "#ffe14d"
    const tr = (t * 420) % 90
    for (let x = -tr; x < w; x += 90) g.fillRect(x, h * 0.76, 46, 4)
    // postes passando
    for (let i = 0; i < 3; i++) {
      const x = w - (((t * 300 + i * (w / 3 + 80)) % (w + 160)) - 80)
      g.fillStyle = "#1c1a28"
      g.fillRect(x, h * 0.36, 4, h * 0.26)
      const lz = g.createRadialGradient(x, h * 0.37, 0, x, h * 0.37, 70)
      lz.addColorStop(0, "rgba(255,210,140,0.5)")
      lz.addColorStop(1, "rgba(255,210,140,0)")
      g.fillStyle = lz
      g.fillRect(x - 70, h * 0.3, 140, 140)
    }
    // a Kombi (de lado), balançando de leve
    const kx = w * 0.5, ky = h * 0.71 + Math.sin(t * 9) * 1.5, kl = w * 0.46, ka = kl * 0.42
    g.save()
    g.translate(kx - kl / 2, ky - ka)
    g.fillStyle = "#e9e3d5" // metade de cima
    g.beginPath()
    g.roundRect(0, 0, kl, ka * 0.55, [ka * 0.3, ka * 0.18, 0, 0])
    g.fill()
    g.fillStyle = cor // metade de baixo
    g.beginPath()
    g.roundRect(0, ka * 0.5, kl, ka * 0.42, [0, 0, ka * 0.12, ka * 0.12])
    g.fill()
    g.fillStyle = "#e9e3d5" // o V da frente
    g.beginPath()
    g.moveTo(kl * 0.86, ka * 0.5)
    g.lineTo(kl, ka * 0.36)
    g.lineTo(kl, ka * 0.62)
    g.closePath()
    g.fill()
    g.fillStyle = "#1a2236" // janelas
    for (let i = 0; i < 4; i++) g.fillRect(kl * (0.06 + i * 0.2), ka * 0.1, kl * 0.16, ka * 0.26)
    g.fillStyle = hexA("#ffcf8a", 0.4)
    g.fillRect(kl * 0.06, ka * 0.1, kl * 0.16, ka * 0.26)
    // farol varrendo a estrada
    const fa = g.createLinearGradient(kl, 0, kl + w * 0.4, 0)
    fa.addColorStop(0, "rgba(255,240,200,0.45)")
    fa.addColorStop(1, "rgba(255,240,200,0)")
    g.fillStyle = fa
    g.beginPath()
    g.moveTo(kl, ka * 0.66)
    g.lineTo(kl + w * 0.4, ka * 0.4)
    g.lineTo(kl + w * 0.4, ka * 1.05)
    g.closePath()
    g.fill()
    // rodas girando
    for (const rx of [kl * 0.2, kl * 0.8]) {
      g.fillStyle = "#08070c"
      g.beginPath()
      g.arc(rx, ka * 0.93, ka * 0.17, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = "#9aa0ae"
      g.lineWidth = 2
      for (let k = 0; k < 3; k++) {
        const a = t * 14 + (k * Math.PI * 2) / 3
        g.beginPath()
        g.moveTo(rx, ka * 0.93)
        g.lineTo(rx + Math.cos(a) * ka * 0.1, ka * 0.93 + Math.sin(a) * ka * 0.1)
        g.stroke()
      }
    }
    g.restore()
    legenda(g, w, h, d.titulo, d.sub, cor)
  } else if (tomada === "cartaz") {
    // o cartaz do palco novo colado no muro
    g.fillStyle = "#0a0912"
    g.fillRect(0, 0, w, h)
    for (let y = 0; y < h; y += 26) for (let x = (y / 26) % 2 ? -20 : 0; x < w; x += 52) { g.fillStyle = "#13111d"; g.fillRect(x, y, 48, 22) }
    const zoom = 0.9 + Math.min(1, t * 1.6) * 0.1
    g.save()
    g.translate(w / 2, h * 0.46)
    g.rotate(-0.04)
    g.scale(zoom, zoom)
    const cw = w * 0.74, ch = h * 0.5
    g.shadowColor = cor
    g.shadowBlur = 40
    g.fillStyle = "#f1ece0"
    g.fillRect(-cw / 2, -ch / 2, cw, ch)
    g.shadowBlur = 0
    g.fillStyle = cor
    g.fillRect(-cw / 2 + 12, -ch / 2 + 12, cw - 24, ch * 0.5)
    g.fillStyle = "#0a0912"
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.font = `900 ${Math.round(cw * 0.11)}px "Arial Black", system-ui, sans-serif`
    g.fillText((d.titulo ?? d.palco.nome).toUpperCase(), 0, ch * 0.12, cw - 30)
    g.font = `700 ${Math.round(cw * 0.05)}px ui-monospace, Menlo, monospace`
    g.fillText(d.sub ?? d.palco.lugar, 0, ch * 0.3, cw - 30)
    g.fillStyle = "#ffffff"
    g.font = `900 ${Math.round(cw * 0.13)}px "Arial Black", system-ui, sans-serif`
    g.fillText("LU2CA", 0, -ch * 0.25)
    g.restore()
  } else if (tomada === "final") {
    const ok = d.sucesso
    // galera enorme de mãos pra cima, papel picado caindo
    const e = { palco: d.palco, energia: ok ? 1 : 0.05, neon: false, batida: ok ? Math.abs(Math.sin(t * 6)) : 0, t, instrumento: d.modelo.tipo, modelo: d.modelo, vaia: !ok, imgs: d.imgs, publico: d.publico }
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

function legenda(g: CanvasRenderingContext2D, w: number, h: number, titulo?: string, sub?: string, cor = "#ffffff") {
  if (!titulo) return
  g.save()
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.font = `900 ${Math.round(w * 0.075)}px "Arial Black", system-ui, sans-serif`
  g.lineWidth = 6
  g.strokeStyle = "rgba(0,0,0,0.8)"
  g.strokeText(titulo.toUpperCase(), w / 2, h * 0.84, w * 0.9)
  g.fillStyle = "#ffffff"
  g.shadowColor = cor
  g.shadowBlur = 18
  g.fillText(titulo.toUpperCase(), w / 2, h * 0.84, w * 0.9)
  if (sub) {
    g.shadowBlur = 0
    g.font = `700 ${Math.round(w * 0.032)}px ui-monospace, Menlo, monospace`
    g.fillStyle = cor
    g.fillText(sub, w / 2, h * 0.88, w * 0.9)
  }
  g.restore()
}
