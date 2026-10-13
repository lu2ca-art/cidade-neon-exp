// GUITAR DRIVER — os instrumentos desenhados como os de verdade (SVG gerado).
//
// Proporções reais: a escala (pestana → ponte) manda em tudo; os trastes caem
// na posição de verdade (o 12º no meio da escala), o corpo tem a largura e o
// comprimento relativos à escala de cada modelo. Sem marca: os formatos são os
// clássicos que todo mundo reconhece (corpo duplo-corte, single-cut, offset,
// V, semi-acústica; baixo P, J, pássaro, violino), com nomes da Cidade Neon.
//
// svgInstrumento() devolve o SVG em texto: serve no HTML (menus, loja) e no
// canvas do palco (vira imagem e vai na mão do músico).

import type { Instrumento } from "./dados"

export type Forma = "duplo" | "tele" | "offset" | "v" | "single" | "sg" | "semi" | "pbass" | "jbass" | "passaro" | "violino"
export type Acabamento = "liso" | "sunburst" | "natural" | "preto" | "perola" | "metalico" | "chuva" | "adesivos" | "holografico"

export interface Visual {
  forma: Forma
  cor: string // cor da pintura (base do acabamento "liso")
  pintura: "solida" | "sunburst" | "cereja" | "natural" | "metalica"
  escudo?: "branco" | "preto" | "tartaruga" | "perola" | null
  escala: "jacaranda" | "maple" | "ebano"
  ferragem: "cromo" | "dourado" | "preto"
  captadores: ("s" | "h" | "p" | "j" | "mini")[]
  ponte: "trem" | "tune" | "tele" | "baixo" | "trapezio"
  cabeca: "seis" | "tres" | "quatro" | "duas"
  marcacao: "pontos" | "blocos" | "trapezios"
  friso?: boolean
  fs?: boolean // f-holes (semi / violino)
}

const PI = Math.PI

/* ─── geometria ─────────────────────────────────────────── */
type P = [number, number]

// contorno suave fechado (Catmull-Rom → Bézier) por uma lista de pontos
function curva(pts: P[], fechar = true) {
  const n = pts.length
  const g = (i: number) => pts[fechar ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  const fim = fechar ? n : n - 1
  for (let i = 0; i < fim; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2)
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + (fechar ? "Z" : "")
}
const f = (v: number) => (Math.round(v * 10) / 10).toString()

// contornos normalizados: x em meias-larguras (-1..1), y de 0 (topo do corpo) a 1 (fundo)
const CORPOS: Record<Forma, P[]> = {
  duplo: [[0.17, 0.02], [0.23, -0.02], [0.28, -0.1], [0.34, -0.16], [0.42, -0.17], [0.5, -0.12], [0.6, 0.0], [0.72, 0.15], [0.8, 0.27], [0.79, 0.38], [0.86, 0.52], [0.98, 0.68], [0.98, 0.83], [0.84, 0.95], [0.5, 1.01], [0, 1.02], [-0.5, 1.01], [-0.84, 0.95], [-0.98, 0.83], [-1.0, 0.68], [-0.9, 0.52], [-0.82, 0.39], [-0.84, 0.26], [-0.78, 0.08], [-0.7, -0.1], [-0.6, -0.24], [-0.5, -0.31], [-0.4, -0.3], [-0.32, -0.22], [-0.25, -0.1], [-0.17, 0.02]],
  tele: [[0.27, 0.12], [0.42, 0.12], [0.62, 0.14], [0.8, 0.24], [0.86, 0.4], [0.84, 0.56], [0.96, 0.74], [0.9, 0.92], [0.5, 1.0], [-0.5, 1.0], [-0.92, 0.92], [-0.98, 0.74], [-0.86, 0.56], [-0.86, 0.36], [-0.82, 0.12], [-0.66, -0.02], [-0.5, -0.02], [-0.4, 0.06], [-0.27, 0.12]],
  offset: [[0.27, 0.1], [0.4, 0.06], [0.5, -0.02], [0.62, 0.0], [0.72, 0.14], [0.86, 0.34], [0.8, 0.5], [0.96, 0.7], [0.96, 0.86], [0.7, 0.98], [0.1, 1.0], [-0.5, 0.96], [-0.92, 0.84], [-1.0, 0.64], [-0.86, 0.46], [-0.92, 0.26], [-0.84, 0.02], [-0.7, -0.16], [-0.54, -0.18], [-0.44, -0.06], [-0.27, 0.1]],
  v: [[0.24, 0.06], [0.42, 0.24], [0.66, 0.56], [0.94, 0.92], [0.96, 1.02], [0.82, 1.04], [0.5, 0.78], [0.2, 0.62], [0, 0.6], [-0.2, 0.62], [-0.5, 0.78], [-0.82, 1.04], [-0.96, 1.02], [-0.94, 0.92], [-0.66, 0.56], [-0.42, 0.24], [-0.24, 0.06]],
  single: [[0.2, 0.08], [0.27, 0.0], [0.34, -0.03], [0.4, 0.04], [0.44, 0.16], [0.52, 0.22], [0.66, 0.26], [0.78, 0.36], [0.82, 0.48], [0.9, 0.6], [0.97, 0.74], [0.92, 0.88], [0.66, 0.99], [0, 1.03], [-0.66, 0.99], [-0.94, 0.88], [-0.99, 0.72], [-0.9, 0.56], [-0.86, 0.44], [-0.88, 0.28], [-0.78, 0.12], [-0.58, 0.02], [-0.36, 0.0], [-0.2, 0.08]],
  sg: [[0.26, 0.12], [0.38, 0.1], [0.48, -0.06], [0.58, -0.08], [0.64, 0.04], [0.72, 0.3], [0.86, 0.5], [0.94, 0.72], [0.82, 0.92], [0.4, 1.0], [-0.4, 1.0], [-0.82, 0.92], [-0.94, 0.72], [-0.86, 0.5], [-0.72, 0.3], [-0.68, 0.04], [-0.6, -0.1], [-0.5, -0.08], [-0.4, 0.1], [-0.26, 0.12]],
  semi: [[0.26, 0.1], [0.36, 0.06], [0.46, -0.02], [0.58, -0.02], [0.72, 0.1], [0.88, 0.28], [0.82, 0.46], [0.98, 0.64], [0.98, 0.84], [0.74, 0.98], [0, 1.02], [-0.74, 0.98], [-0.98, 0.84], [-0.98, 0.64], [-0.82, 0.46], [-0.88, 0.28], [-0.72, 0.1], [-0.58, -0.02], [-0.46, -0.02], [-0.36, 0.06], [-0.26, 0.1]],
  pbass: [[0.17, 0.02], [0.23, -0.04], [0.29, -0.12], [0.36, -0.18], [0.45, -0.18], [0.53, -0.11], [0.62, 0.02], [0.7, 0.16], [0.76, 0.3], [0.74, 0.42], [0.86, 0.56], [0.98, 0.71], [0.96, 0.86], [0.82, 0.96], [0.5, 1.01], [0, 1.02], [-0.5, 1.01], [-0.84, 0.96], [-0.99, 0.84], [-0.99, 0.68], [-0.88, 0.53], [-0.8, 0.4], [-0.84, 0.24], [-0.8, 0.04], [-0.72, -0.14], [-0.62, -0.28], [-0.5, -0.35], [-0.4, -0.33], [-0.31, -0.24], [-0.24, -0.1], [-0.17, 0.02]],
  jbass: [[0.17, 0.02], [0.23, -0.05], [0.3, -0.14], [0.38, -0.2], [0.47, -0.19], [0.55, -0.1], [0.62, 0.05], [0.68, 0.2], [0.7, 0.32], [0.66, 0.44], [0.8, 0.58], [0.94, 0.73], [0.9, 0.88], [0.72, 0.98], [0.3, 1.02], [-0.3, 1.02], [-0.78, 0.97], [-0.97, 0.84], [-0.96, 0.66], [-0.84, 0.5], [-0.76, 0.38], [-0.82, 0.2], [-0.78, 0.0], [-0.7, -0.18], [-0.6, -0.32], [-0.48, -0.38], [-0.38, -0.35], [-0.3, -0.25], [-0.24, -0.1], [-0.17, 0.02]],
  passaro: [[0.22, -0.3], [0.3, -0.1], [0.42, 0.06], [0.62, 0.16], [0.78, 0.3], [0.72, 0.42], [0.9, 0.6], [0.94, 0.82], [0.7, 0.98], [0, 1.02], [-0.6, 0.98], [-0.9, 0.84], [-0.98, 0.62], [-0.92, 0.44], [-1.02, 0.24], [-0.96, 0.04], [-0.78, -0.2], [-0.6, -0.34], [-0.44, -0.3], [-0.22, -0.3]],
  violino: [[0.22, 0.04], [0.42, 0.02], [0.62, 0.08], [0.72, 0.2], [0.66, 0.36], [0.56, 0.46], [0.7, 0.6], [0.84, 0.78], [0.76, 0.94], [0.4, 1.02], [-0.4, 1.02], [-0.76, 0.94], [-0.84, 0.78], [-0.7, 0.6], [-0.56, 0.46], [-0.66, 0.36], [-0.72, 0.2], [-0.62, 0.08], [-0.42, 0.02], [-0.22, 0.04]],
}

// escudo (pickguard) por formato, nas mesmas coordenadas do corpo
const ESCUDOS: Partial<Record<Forma, P[]>> = {
  duplo: [[0.17, 0.02], [0.27, 0.0], [0.34, 0.06], [0.4, 0.18], [0.44, 0.32], [0.56, 0.48], [0.58, 0.62], [0.44, 0.74], [0.2, 0.82], [-0.06, 0.84], [-0.3, 0.8], [-0.46, 0.66], [-0.6, 0.46], [-0.66, 0.26], [-0.6, 0.08], [-0.42, -0.02], [-0.17, 0.02]],
  tele: [[0.27, 0.13], [0.36, 0.14], [0.4, 0.3], [0.34, 0.5], [0.1, 0.58], [-0.3, 0.6], [-0.58, 0.52], [-0.64, 0.32], [-0.56, 0.12], [-0.27, 0.13]],
  offset: [[0.27, 0.1], [0.42, 0.1], [0.56, 0.22], [0.66, 0.44], [0.66, 0.66], [0.4, 0.82], [-0.2, 0.86], [-0.62, 0.74], [-0.76, 0.52], [-0.74, 0.22], [-0.56, 0.02], [-0.27, 0.1]],
  single: [[0.2, 0.36], [0.36, 0.42], [0.42, 0.56], [0.36, 0.66], [0.24, 0.62], [0.2, 0.48]],
  sg: [[0.27, 0.13], [0.44, 0.16], [0.56, 0.3], [0.48, 0.5], [0.28, 0.66], [-0.1, 0.72], [-0.46, 0.64], [-0.62, 0.42], [-0.6, 0.2], [-0.42, 0.1], [-0.27, 0.13]],
  semi: [[0.2, 0.34], [0.36, 0.38], [0.44, 0.52], [0.38, 0.62], [0.26, 0.58], [0.2, 0.46]],
  pbass: [[0.24, 0.1], [0.36, 0.1], [0.46, 0.28], [0.44, 0.44], [0.58, 0.58], [0.5, 0.72], [0.1, 0.78], [-0.28, 0.76], [-0.5, 0.6], [-0.56, 0.38], [-0.56, 0.18], [-0.44, 0.06], [-0.24, 0.1]],
  jbass: [[0.24, 0.1], [0.36, 0.1], [0.44, 0.28], [0.4, 0.42], [0.5, 0.52], [0.34, 0.6], [-0.1, 0.56], [-0.46, 0.52], [-0.56, 0.36], [-0.56, 0.16], [-0.44, 0.06], [-0.24, 0.1]],
  passaro: [[0.16, 0.22], [0.36, 0.3], [0.4, 0.52], [0.3, 0.64], [0.14, 0.58], [0.1, 0.38]],
}

interface Dim { W: number; H: number; cx: number; nut: number; ponte: number; corpoTopo: number; corpoL: number; corpoHW: number; trastes: number; cordas: number; larguraPestana: number; larguraPonte: number; cabecaTopo: number }

function dimensoes(v: Visual, tipo: Instrumento): Dim {
  const baixo = tipo === "baixo"
  const escala = baixo ? 540 : 400
  const nut = baixo ? 150 : 128
  const ponte = nut + escala
  // corpo relativo à escala (valores reais aproximados)
  const prop: Record<Forma, [number, number, number]> = {
    // [meia-largura/escala, comprimento/escala, onde o corpo começa (fração da escala a partir da pestana)]
    duplo: [0.25, 0.7, 0.66], tele: [0.25, 0.66, 0.68], offset: [0.27, 0.74, 0.64], v: [0.32, 0.76, 0.66],
    single: [0.27, 0.7, 0.64], sg: [0.24, 0.62, 0.62], semi: [0.3, 0.74, 0.66],
    pbass: [0.19, 0.53, 0.7], jbass: [0.18, 0.53, 0.7], passaro: [0.2, 0.64, 0.66], violino: [0.17, 0.48, 0.72],
  }
  const [hw, l, ini] = prop[v.forma]
  const corpoTopo = nut + escala * ini
  const corpoL = escala * l
  const H = corpoTopo + corpoL + 12
  return {
    W: 240, H, cx: 120, nut, ponte, corpoTopo, corpoL, corpoHW: escala * hw,
    trastes: baixo ? 20 : v.forma === "single" || v.forma === "semi" ? 22 : 21,
    cordas: baixo ? 4 : 6, larguraPestana: baixo ? 24 : 25, larguraPonte: baixo ? 36 : 33,
    cabecaTopo: 8,
  }
}

const mapa = (d: Dim) => (p: P): P => [d.cx + p[0] * d.corpoHW, d.corpoTopo + p[1] * d.corpoL]
const posTraste = (d: Dim, n: number) => d.nut + (d.ponte - d.nut) * (1 - Math.pow(2, -n / 12))

/* ─── cores ─────────────────────────────────────────────── */
function mistura(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t))
  return `#${c.map((x) => x.toString(16).padStart(2, "0")).join("")}`
}

const FERRAGEM = {
  cromo: ["#f4f6fb", "#a9b0bf", "#5d6472"],
  dourado: ["#fff1b8", "#d4a640", "#7a5a12"],
  preto: ["#6a6a72", "#26262c", "#0c0c10"],
}

/* ─── o desenho ─────────────────────────────────────────── */
export function svgInstrumento(v: Visual, tipo: Instrumento, acabamento: Acabamento = "liso", id = "i"): string {
  const d = dimensoes(v, tipo)
  const m = mapa(d)
  const fe = FERRAGEM[v.ferragem]
  const corpoPts = CORPOS[v.forma].map(m)
  const corpoD = curva(corpoPts)
  const baixo = tipo === "baixo"
  const p = `${id}-${v.forma}`
  const out: string[] = []

  // pintura conforme o acabamento escolhido
  let pintura = v.pintura
  let cor = v.cor
  if (acabamento === "sunburst") pintura = "sunburst"
  else if (acabamento === "natural") pintura = "natural"
  else if (acabamento === "preto") { pintura = "solida"; cor = "#0d0d10" }
  else if (acabamento === "perola") { pintura = "solida"; cor = "#ece6d6" }
  else if (acabamento === "metalico") { pintura = "metalica" }

  const defs: string[] = []
  // sombra projetada
  defs.push(`<filter id="${p}-sombra" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".55"/></filter>`)
  // pintura
  const cxP = d.cx, cyP = d.corpoTopo + d.corpoL * 0.62
  if (pintura === "sunburst" || pintura === "cereja") {
    const [c0, c1, c2] = pintura === "sunburst" ? ["#f2b544", "#b5370f", "#1c0703"] : ["#ff7a4d", "#b0101c", "#2a0306"]
    defs.push(`<radialGradient id="${p}-tinta" cx="${cxP}" cy="${cyP}" r="${d.corpoHW * 1.15}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c0}"/><stop offset=".45" stop-color="${c0}"/><stop offset=".72" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`)
  } else if (pintura === "natural") {
    defs.push(`<linearGradient id="${p}-tinta" x1="0" x2="1"><stop offset="0" stop-color="#c98d4c"/><stop offset=".5" stop-color="#e2b373"/><stop offset="1" stop-color="#b97c3c"/></linearGradient>`)
    defs.push(`<pattern id="${p}-veio" width="240" height="14" patternUnits="userSpaceOnUse"><path d="M0 7 Q60 2 120 8 T240 6" stroke="#8a5523" stroke-opacity=".28" fill="none" stroke-width="1.2"/><path d="M0 12 Q80 9 150 13 T240 11" stroke="#7a4a1c" stroke-opacity=".18" fill="none"/></pattern>`)
  } else if (pintura === "metalica") {
    defs.push(`<linearGradient id="${p}-tinta" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mistura(cor, "#ffffff", 0.35)}"/><stop offset=".5" stop-color="${cor}"/><stop offset="1" stop-color="${mistura(cor, "#000000", 0.55)}"/></linearGradient>`)
    defs.push(`<pattern id="${p}-flake" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".5" fill="#fff" opacity=".35"/><circle cx="4" cy="5" r=".4" fill="#fff" opacity=".25"/></pattern>`)
  } else {
    defs.push(`<linearGradient id="${p}-tinta" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mistura(cor, "#ffffff", 0.12)}"/><stop offset="1" stop-color="${mistura(cor, "#000000", 0.32)}"/></linearGradient>`)
  }
  if (acabamento === "holografico") {
    defs.push(`<linearGradient id="${p}-holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2fe8ff"/><stop offset=".3" stop-color="#b38cff"/><stop offset=".55" stop-color="#ff3fb0"/><stop offset=".8" stop-color="#ffc857"/><stop offset="1" stop-color="#5dffa0"/></linearGradient>`)
  }
  // brilho do verniz (uma faixa de luz em diagonal)
  defs.push(`<linearGradient id="${p}-verniz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".32" stop-color="#fff" stop-opacity=".0"/><stop offset=".4" stop-color="#fff" stop-opacity=".32"/><stop offset=".46" stop-color="#fff" stop-opacity=".0"/><stop offset=".7" stop-color="#fff" stop-opacity=".0"/><stop offset=".76" stop-color="#fff" stop-opacity=".12"/><stop offset=".8" stop-color="#fff" stop-opacity="0"/></linearGradient>`)
  defs.push(`<radialGradient id="${p}-borda" cx=".5" cy=".55" r=".62"><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>`)
  // metais
  defs.push(`<linearGradient id="${p}-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fe[0]}"/><stop offset=".5" stop-color="${fe[1]}"/><stop offset="1" stop-color="${fe[2]}"/></linearGradient>`)
  defs.push(`<radialGradient id="${p}-knob" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${fe[0]}"/><stop offset=".55" stop-color="${fe[1]}"/><stop offset="1" stop-color="${fe[2]}"/></radialGradient>`)
  defs.push(`<linearGradient id="${p}-corda" x1="0" x2="1"><stop offset="0" stop-color="#8d929c"/><stop offset=".5" stop-color="#f3f5f8"/><stop offset="1" stop-color="#7d828c"/></linearGradient>`)
  // escala (madeira do braço)
  const escalaCor = v.escala === "maple" ? ["#f0cf94", "#d9a965"] : v.escala === "ebano" ? ["#1d1714", "#0c0907"] : ["#4a2a1a", "#2c160c"]
  defs.push(`<linearGradient id="${p}-escala" x1="0" x2="1"><stop offset="0" stop-color="${escalaCor[1]}"/><stop offset=".5" stop-color="${escalaCor[0]}"/><stop offset="1" stop-color="${escalaCor[1]}"/></linearGradient>`)
  const madeiraBraco = v.escala === "maple" ? "#e9c587" : v.forma === "single" || v.forma === "sg" || v.forma === "semi" || v.forma === "violino" ? "#7a3f1e" : "#dcb06e"
  defs.push(`<linearGradient id="${p}-braco" x1="0" x2="1"><stop offset="0" stop-color="${mistura(madeiraBraco, "#000", 0.25)}"/><stop offset=".5" stop-color="${madeiraBraco}"/><stop offset="1" stop-color="${mistura(madeiraBraco, "#000", 0.25)}"/></linearGradient>`)
  defs.push(`<clipPath id="${p}-clip"><path d="${corpoD}"/></clipPath>`)

  out.push(`<g filter="url(#${p}-sombra)">`)

  /* cabeça (headstock) */
  const cab = cabeca(v, d, p, fe)
  out.push(cab)

  /* braço por trás do corpo */
  const lN = d.larguraPestana / 2, lB = (d.larguraPestana + 9) / 2
  const fimBraco = d.corpoTopo + d.corpoL * 0.16
  out.push(`<path d="M${d.cx - lN} ${d.nut} L${d.cx + lN} ${d.nut} L${d.cx + lB} ${fimBraco} L${d.cx - lB} ${fimBraco} Z" fill="url(#${p}-braco)"/>`)

  /* corpo */
  const tinta = acabamento === "holografico" ? `url(#${p}-holo)` : `url(#${p}-tinta)`
  out.push(`<path d="${corpoD}" fill="${tinta}"/>`)
  if (pintura === "natural") out.push(`<path d="${corpoD}" fill="url(#${p}-veio)"/>`)
  if (pintura === "metalica") out.push(`<path d="${corpoD}" fill="url(#${p}-flake)"/>`)
  out.push(`<path d="${corpoD}" fill="url(#${p}-borda)"/>`)
  if (v.friso) out.push(`<path d="${corpoD}" fill="none" stroke="#efe5c8" stroke-width="2.2"/><path d="${corpoD}" fill="none" stroke="#1a120a" stroke-width=".6" stroke-opacity=".6" transform="translate(${d.cx} ${d.corpoTopo + d.corpoL / 2}) scale(.985) translate(${-d.cx} ${-(d.corpoTopo + d.corpoL / 2)})"/>`)
  else out.push(`<path d="${corpoD}" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="1"/>`)

  // f-holes
  if (v.fs) {
    for (const k of [-1, 1]) {
      const [fx, fy] = m([k * 0.6, 0.62])
      const hgt = d.corpoL * 0.26
      out.push(`<path d="M${fx} ${fy - hgt / 2} c${-k * 6} ${hgt * 0.2} ${k * 6} ${hgt * 0.35} ${-k * 1} ${hgt * 0.5} c${-k * 7} ${hgt * 0.15} ${k * 5} ${hgt * 0.35} ${k * 1} ${hgt * 0.5}" stroke="#0a0604" stroke-width="3.4" fill="none" stroke-linecap="round"/>`)
      out.push(`<circle cx="${fx}" cy="${fy - hgt / 2}" r="2.4" fill="#0a0604"/><circle cx="${fx + k * 1}" cy="${fy + hgt / 2}" r="2.4" fill="#0a0604"/>`)
    }
  }

  // escudo
  const escPts = ESCUDOS[v.forma]
  if (escPts && v.escudo) {
    const escD = curva(escPts.map(m))
    if (v.escudo === "tartaruga") {
      defs.push(`<filter id="${p}-tartf"><feTurbulence type="fractalNoise" baseFrequency=".09 .05" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .2  0 0 0 0 .04  0 0 0 -2.2 1.35"/><feComposite in2="SourceGraphic" operator="in"/></filter>`)
    }
    const escFill = v.escudo === "branco" ? "#f1efe8" : v.escudo === "preto" ? "#111114" : v.escudo === "perola" ? "#e9e6ef" : "#2a0d04"
    out.push(`<path d="${escD}" fill="${escFill}" stroke="${v.escudo === "preto" ? "#e8e4da" : "#1a1a1a"}" stroke-opacity=".35" stroke-width="1.2"/>`)
    // tartaruga: manchas orgânicas (ruído) por cima do marrom escuro
    if (v.escudo === "tartaruga") out.push(`<path d="${escD}" fill="#c0601c" filter="url(#${p}-tartf)" opacity=".9"/>`)
    // parafusos do escudo
    escPts.forEach((q, i) => { if (i % 3 === 0) { const [sx, sy] = m([q[0] * 0.93, q[1] + (q[1] < 0.5 ? 0.02 : -0.02)]); out.push(`<circle cx="${f(sx)}" cy="${f(sy)}" r="1.3" fill="url(#${p}-knob)"/>`) } })
  }

  /* escala (fretboard) sobre o corpo, até o último traste */
  const yFim = posTraste(d, d.trastes) + 6
  const larg = (y: number) => d.larguraPestana + ((d.larguraPonte - d.larguraPestana) * (y - d.nut)) / (d.ponte - d.nut)
  out.push(`<path d="M${d.cx - larg(d.nut) / 2} ${d.nut} L${d.cx + larg(d.nut) / 2} ${d.nut} L${d.cx + larg(yFim) / 2 + 1} ${yFim} L${d.cx - larg(yFim) / 2 - 1} ${yFim} Z" fill="url(#${p}-escala)"/>`)
  if (v.friso && !baixo) out.push(`<path d="M${d.cx - larg(d.nut) / 2} ${d.nut} L${d.cx - larg(yFim) / 2 - 1} ${yFim} M${d.cx + larg(d.nut) / 2} ${d.nut} L${d.cx + larg(yFim) / 2 + 1} ${yFim}" stroke="#efe5c8" stroke-width="1.3"/>`)
  // marcações
  const casas = baixo ? [3, 5, 7, 9, 12, 15, 17, 19] : [3, 5, 7, 9, 12, 15, 17, 19, 21]
  for (const n of casas) {
    if (n > d.trastes) continue
    const y = (posTraste(d, n - 1) + posTraste(d, n)) / 2
    const w = larg(y)
    const corM = v.escala === "maple" ? "#1c1410" : "#efe9dc"
    if (v.marcacao === "pontos") {
      if (n === 12) out.push(`<circle cx="${f(d.cx - w * 0.22)}" cy="${f(y)}" r="2" fill="${corM}"/><circle cx="${f(d.cx + w * 0.22)}" cy="${f(y)}" r="2" fill="${corM}"/>`)
      else out.push(`<circle cx="${d.cx}" cy="${f(y)}" r="2" fill="${corM}"/>`)
    } else {
      const h = (posTraste(d, n) - posTraste(d, n - 1)) * 0.55
      const tp = v.marcacao === "trapezios" ? 0.12 : 0
      out.push(`<path d="M${f(d.cx - w * 0.3)} ${f(y - h / 2)} L${f(d.cx + w * (0.3 - tp))} ${f(y - h / 2)} L${f(d.cx + w * 0.3)} ${f(y + h / 2)} L${f(d.cx - w * (0.3 - tp))} ${f(y + h / 2)} Z" fill="#eee7f2" opacity=".92"/>`)
    }
  }
  // trastes
  for (let n = 1; n <= d.trastes; n++) {
    const y = posTraste(d, n)
    const w = larg(y)
    out.push(`<line x1="${f(d.cx - w / 2)}" y1="${f(y)}" x2="${f(d.cx + w / 2)}" y2="${f(y)}" stroke="url(#${p}-metal)" stroke-width="1.1"/>`)
  }
  // pestana
  out.push(`<rect x="${d.cx - lN - 0.5}" y="${d.nut - 2.5}" width="${d.larguraPestana + 1}" height="3" fill="#f3efe2"/>`)

  /* captadores */
  out.push(captadores(v, d, p, baixo))

  /* ponte */
  out.push(ponte(v, d, p, baixo))

  /* controles (knobs, chave, jack) */
  out.push(controles(v, d, p, baixo))

  /* cordas */
  const n = d.cordas
  const yCordaFim = v.ponte === "trapezio" ? d.corpoTopo + d.corpoL * 0.97 : d.ponte + (v.ponte === "trem" ? 4 : 2)
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n - 0.5
    const x0 = d.cx + t * (d.larguraPestana - 3)
    const x1 = d.cx + t * (d.larguraPonte - 4)
    const esp = baixo ? 1.4 - i * 0.18 : 1.05 - i * 0.12
    out.push(`<line x1="${f(x0)}" y1="${d.nut}" x2="${f(x1)}" y2="${f(yCordaFim)}" stroke="url(#${p}-corda)" stroke-width="${f(Math.max(0.45, esp))}"/>`)
  }

  /* verniz por cima de tudo no corpo */
  out.push(`<path d="${corpoD}" fill="url(#${p}-verniz)"/>`)

  /* acabamentos com desenho */
  if (acabamento === "chuva") {
    out.push(`<g clip-path="url(#${p}-clip)">`)
    for (let i = 0; i < 26; i++) {
      const x = d.cx - d.corpoHW + ((i * 37) % 100) / 100 * d.corpoHW * 2
      const y = d.corpoTopo + ((i * 53) % 100) / 100 * d.corpoL
      out.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="2.2" ry="3.4" fill="#cdf6ff" opacity=".75"/><ellipse cx="${f(x - 0.6)}" cy="${f(y - 1)}" rx=".7" ry="1" fill="#fff"/>`)
    }
    out.push(`</g>`)
  }
  if (acabamento === "adesivos") {
    const [ax, ay] = m([-0.5, 0.82]), [bx, by] = m([0.55, 0.3]), [cx2, cy2] = m([0.58, 0.82])
    out.push(`<g clip-path="url(#${p}-clip)"><g transform="translate(${f(ax)} ${f(ay)}) rotate(-12)"><rect x="-22" y="-10" width="44" height="20" rx="3" fill="#ffc857"/><text x="0" y="5" text-anchor="middle" font-size="13" font-weight="900" font-family="Arial Black, sans-serif" fill="#120a14">222</text></g>`
      + `<g transform="translate(${f(bx)} ${f(by)}) rotate(14)"><circle r="11" fill="#ff3fb0"/><text y="4" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="Arial Black, sans-serif">NEON</text></g>`
      + `<g transform="translate(${f(cx2)} ${f(cy2)}) rotate(8)"><rect x="-17" y="-8" width="34" height="16" fill="#2fe8ff"/><text y="4" text-anchor="middle" font-size="8" font-weight="900" fill="#05202a" font-family="Arial Black, sans-serif">LINHA 9</text></g></g>`)
  }
  out.push(`</g>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.W} ${f(d.H)}" width="${d.W}" height="${f(d.H)}"><defs>${defs.join("")}</defs>${out.join("")}</svg>`
}

function cabeca(v: Visual, d: Dim, p: string, fe: string[]) {
  const top = d.cabecaTopo
  const cx = d.cx
  const lN = d.larguraPestana / 2
  const o: string[] = []
  const madeira = v.cabeca === "tres" || v.forma === "violino" ? "#141016" : v.escala === "maple" ? "#e9c587" : "#dcb06e"
  const corCabeca = v.forma === "duplo" || v.forma === "tele" || v.forma === "offset" || v.forma === "pbass" || v.forma === "jbass" ? (v.cor && v.pintura === "solida" && v.forma === "offset" ? v.cor : madeira) : madeira
  let path = ""
  let tarraxas: P[] = []
  if (v.cabeca === "seis") {
    // seis em linha: a cabeça se alarga pro lado das cordas graves
    path = `M${cx - lN} ${d.nut} L${cx - lN - 2} ${d.nut - 30} C${cx - lN - 8} ${d.nut - 60} ${cx - lN - 10} ${top + 30} ${cx - lN + 2} ${top + 6} C${cx - lN + 14} ${top - 4} ${cx + lN + 20} ${top + 2} ${cx + lN + 22} ${top + 20} C${cx + lN + 24} ${top + 40} ${cx + lN + 10} ${top + 54} ${cx + lN + 4} ${top + 70} L${cx + lN} ${d.nut} Z`
    for (let i = 0; i < 6; i++) tarraxas.push([cx - lN - 4 + 0, top + 18 + i * ((d.nut - top - 34) / 6)])
    tarraxas = tarraxas.map(([x, y]) => [x, y])
  } else if (v.cabeca === "quatro") {
    path = `M${cx - lN} ${d.nut} L${cx - lN - 3} ${d.nut - 40} C${cx - lN - 10} ${d.nut - 80} ${cx - lN - 12} ${top + 30} ${cx - lN + 2} ${top + 6} C${cx - lN + 14} ${top - 4} ${cx + lN + 22} ${top + 2} ${cx + lN + 24} ${top + 22} C${cx + lN + 26} ${top + 46} ${cx + lN + 10} ${top + 66} ${cx + lN + 4} ${top + 84} L${cx + lN} ${d.nut} Z`
    for (let i = 0; i < 4; i++) tarraxas.push([cx - lN - 6, top + 26 + i * ((d.nut - top - 50) / 4)])
  } else if (v.cabeca === "duas") {
    path = `M${cx - lN} ${d.nut} L${cx - lN - 8} ${top + 24} C${cx - lN - 8} ${top + 4} ${cx + lN + 8} ${top + 4} ${cx + lN + 8} ${top + 24} L${cx + lN} ${d.nut} Z`
    for (let i = 0; i < 2; i++) { tarraxas.push([cx - lN - 10, top + 40 + i * 40]); tarraxas.push([cx + lN + 10, top + 40 + i * 40]) }
  } else {
    // três de cada lado (open book)
    const hTop = d.nut - 118
    path = `M${cx - lN} ${d.nut} L${cx - lN - 14} ${hTop + 10} C${cx - lN - 15} ${hTop} ${cx - 10} ${hTop - 8} ${cx} ${hTop + 2} C${cx + 10} ${hTop - 8} ${cx + lN + 15} ${hTop} ${cx + lN + 14} ${hTop + 10} L${cx + lN} ${d.nut} Z`
    for (let i = 0; i < 3; i++) { tarraxas.push([cx - lN - 18, hTop + 22 + i * 30]); tarraxas.push([cx + lN + 18, hTop + 22 + i * 30]) }
  }
  // tarraxas (as chaves pra fora da cabeça) por trás
  for (const [x, y] of tarraxas) {
    const lado = x < cx ? -1 : 1
    const bx = v.cabeca === "seis" || v.cabeca === "quatro" ? x - 14 : x + lado * 12
    o.push(`<ellipse cx="${f(bx)}" cy="${f(y)}" rx="${v.cabeca === "quatro" ? 9 : 7}" ry="${v.cabeca === "quatro" ? 6 : 4.5}" fill="url(#${p}-knob)" stroke="#000" stroke-opacity=".4"/>`)
    o.push(`<rect x="${f(Math.min(bx, x))}" y="${f(y - 1.6)}" width="${f(Math.abs(bx - x))}" height="3.2" fill="url(#${p}-metal)"/>`)
  }
  o.push(`<path d="${path}" fill="${corCabeca}" stroke="#000" stroke-opacity=".45"/>`)
  // pinos e buchas das tarraxas por cima da cabeça
  for (const [x, y] of tarraxas) o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${v.cabeca === "quatro" ? 3.4 : 2.6}" fill="url(#${p}-knob)" stroke="#000" stroke-opacity=".5" stroke-width=".6"/>`)
  // logo genérico da cidade (sem marca de verdade)
  o.push(`<text x="${cx + (v.cabeca === "tres" ? 0 : 4)}" y="${v.cabeca === "tres" ? d.nut - 70 : d.nut - (v.cabeca === "quatro" ? 60 : 44)}" text-anchor="middle" font-size="7" font-weight="800" font-family="Georgia, serif" font-style="italic" fill="${madeira === "#141016" ? "#e8d9a8" : "#2a1a0e"}" opacity=".85" transform="rotate(${v.cabeca === "tres" ? 0 : -90} ${cx + (v.cabeca === "tres" ? 0 : 4)} ${v.cabeca === "tres" ? d.nut - 70 : d.nut - (v.cabeca === "quatro" ? 60 : 44)})">Neon</text>`)
  return o.join("")
}

function captadores(v: Visual, d: Dim, p: string, baixo: boolean) {
  const o: string[] = []
  const pos = v.captadores.length
  const larg = d.larguraPonte + 6
  // posições ao longo do caminho entre o fim da escala e a ponte
  const ini = posTraste(d, d.trastes) + 14
  const fim = d.ponte - (baixo ? 40 : 22)
  for (let i = 0; i < pos; i++) {
    const k = pos === 1 ? 0.55 : i / (pos - 1)
    const y = ini + (fim - ini) * k
    const tipo = v.captadores[i]
    if (tipo === "s") {
      o.push(`<rect x="${d.cx - larg / 2}" y="${f(y - 5.5)}" width="${larg}" height="11" rx="5.5" fill="${v.escudo === "preto" ? "#f1efe8" : v.escudo === "branco" || v.escudo === "perola" ? "#f6f4ee" : "#111"}" stroke="#000" stroke-opacity=".5"/>`)
      for (let c = 0; c < 6; c++) o.push(`<circle cx="${f(d.cx + ((c + 0.5) / 6 - 0.5) * (larg - 8))}" cy="${f(y)}" r="1.25" fill="url(#${p}-metal)"/>`)
    } else if (tipo === "h" || tipo === "mini") {
      const h = tipo === "mini" ? 14 : 20
      const w = tipo === "mini" ? larg - 2 : larg + 2
      o.push(`<rect x="${f(d.cx - w / 2 - 3)}" y="${f(y - h / 2 - 3)}" width="${f(w + 6)}" height="${h + 6}" rx="3" fill="#121214"/>`)
      o.push(`<rect x="${f(d.cx - w / 2)}" y="${f(y - h / 2)}" width="${f(w)}" height="${h}" rx="2.5" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
      for (let c = 0; c < 6; c++) o.push(`<circle cx="${f(d.cx + ((c + 0.5) / 6 - 0.5) * (w - 8))}" cy="${f(y - h * 0.2)}" r="1.15" fill="#3a3d45"/>`)
    } else if (tipo === "p") {
      // o captador dividido do baixo P: duas metades desencontradas
      for (const k of [-1, 1]) {
        const yy = y + k * 5
        const x0 = k < 0 ? d.cx - larg / 2 - 2 : d.cx - 1
        o.push(`<rect x="${f(x0)}" y="${f(yy - 6)}" width="${f(larg / 2 + 3)}" height="12" rx="3" fill="#111" stroke="#000"/>`)
        for (let c = 0; c < 2; c++) o.push(`<circle cx="${f(x0 + 5 + c * ((larg / 2 - 7)))}" cy="${f(yy)}" r="1.6" fill="url(#${p}-metal)"/>`)
      }
    } else if (tipo === "j") {
      o.push(`<rect x="${d.cx - larg / 2 - 2}" y="${f(y - 6)}" width="${larg + 4}" height="12" rx="2" fill="#111" stroke="#000"/>`)
      for (let c = 0; c < 4; c++) o.push(`<circle cx="${f(d.cx + ((c + 0.5) / 4 - 0.5) * (larg - 4))}" cy="${f(y)}" r="1.6" fill="url(#${p}-metal)"/>`)
    }
  }
  return o.join("")
}

function ponte(v: Visual, d: Dim, p: string, baixo: boolean) {
  const o: string[] = []
  const w = d.larguraPonte + 8
  const y = d.ponte
  if (v.ponte === "trem") {
    o.push(`<rect x="${d.cx - w / 2 - 4}" y="${y - 6}" width="${w + 8}" height="22" rx="3" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
    for (let c = 0; c < 6; c++) o.push(`<rect x="${f(d.cx + ((c + 0.5) / 6 - 0.5) * (w - 4) - 2.2)}" y="${y - 3 + (c % 2) * 2}" width="4.4" height="8" rx="1" fill="#d7dbe3" stroke="#000" stroke-opacity=".35"/>`)
    o.push(`<rect x="${d.cx + w / 2 - 2}" y="${y + 10}" width="22" height="2" rx="1" fill="url(#${p}-metal)" transform="rotate(20 ${d.cx + w / 2} ${y + 11})"/>`)
  } else if (v.ponte === "tune") {
    o.push(`<rect x="${d.cx - w / 2}" y="${y - 3}" width="${w}" height="6" rx="3" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
    o.push(`<rect x="${d.cx - w / 2 - 2}" y="${y + 16}" width="${w + 4}" height="7" rx="3.5" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
    for (const k of [-1, 1]) o.push(`<circle cx="${d.cx + k * (w / 2 + 3)}" cy="${y}" r="2.6" fill="url(#${p}-knob)"/>`)
  } else if (v.ponte === "tele") {
    o.push(`<path d="M${d.cx - w / 2 - 6} ${y - 30} L${d.cx + w / 2 + 6} ${y - 30} L${d.cx + w / 2 + 6} ${y + 14} Q${d.cx} ${y + 22} ${d.cx - w / 2 - 6} ${y + 14} Z" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
    o.push(`<rect x="${d.cx - (w + 6) / 2}" y="${y - 22}" width="${w + 6}" height="12" rx="6" fill="#111"/>`)
    for (let c = 0; c < 3; c++) o.push(`<rect x="${f(d.cx + ((c + 0.5) / 3 - 0.5) * (w - 2) - 4)}" y="${y - 3}" width="8" height="6" rx="2" fill="#e3e6ec"/>`)
  } else if (v.ponte === "baixo") {
    o.push(`<rect x="${d.cx - w / 2 - 3}" y="${y - 6}" width="${w + 6}" height="26" rx="2" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
    for (let c = 0; c < 4; c++) o.push(`<rect x="${f(d.cx + ((c + 0.5) / 4 - 0.5) * (w - 2) - 3)}" y="${y - 3}" width="6" height="10" rx="1.5" fill="#dfe3ea" stroke="#000" stroke-opacity=".3"/>`)
  } else if (v.ponte === "trapezio") {
    o.push(`<rect x="${d.cx - w / 2}" y="${y - 3}" width="${w}" height="6" rx="3" fill="url(#${p}-metal)"/>`)
    const yb = d.corpoTopo + d.corpoL * 0.97
    o.push(`<path d="M${d.cx - w / 2} ${y + 30} L${d.cx + w / 2} ${y + 30} L${d.cx + 6} ${yb} L${d.cx - 6} ${yb} Z" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".4"/>`)
  }
  if (baixo) void 0
  return o.join("")
}

function controles(v: Visual, d: Dim, p: string, baixo: boolean) {
  const o: string[] = []
  const m = mapa(d)
  const knob = (q: P, r = 6) => {
    const [x, y] = m(q)
    o.push(`<circle cx="${f(x)}" cy="${f(y + 1.5)}" r="${r}" fill="#000" opacity=".45"/>`)
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="url(#${p}-knob)" stroke="#000" stroke-opacity=".5" stroke-width=".7"/>`)
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${r * 0.55}" fill="none" stroke="#000" stroke-opacity=".25"/>`)
  }
  const chave = (q: P, rot = 0) => {
    const [x, y] = m(q)
    o.push(`<g transform="rotate(${rot} ${f(x)} ${f(y)})"><circle cx="${f(x)}" cy="${f(y)}" r="4.2" fill="url(#${p}-metal)"/><rect x="${f(x - 1.2)}" y="${f(y - 11)}" width="2.4" height="11" rx="1.2" fill="#efe9da"/></g>`)
  }
  switch (v.forma) {
    case "duplo":
      knob([0.5, 0.66], 5.5); knob([0.42, 0.74], 5.5); knob([0.32, 0.81], 5.5); chave([0.56, 0.54], 30); break
    case "tele":
      { const [a, b] = m([0.54, 0.6]), [c, e] = m([0.6, 0.84]); o.push(`<path d="M${f(a - 6)} ${f(b)} L${f(c - 6)} ${f(e)} L${f(c + 6)} ${f(e)} L${f(a + 6)} ${f(b)} Z" fill="url(#${p}-metal)" stroke="#000" stroke-opacity=".3" transform="rotate(-14 ${f(a)} ${f(b)})"/>`) }
      knob([0.6, 0.72], 5); knob([0.66, 0.82], 5); break
    case "offset":
      knob([0.62, 0.7], 5.5); knob([0.5, 0.8], 5.5); chave([-0.5, 0.18], 0); break
    case "v":
      knob([0.42, 0.74], 6); knob([0.56, 0.86], 6); knob([0.7, 0.98], 6); chave([-0.36, 0.5], -30); break
    case "single":
    case "semi":
      knob([0.5, 0.68], 6.5); knob([0.66, 0.78], 6.5); knob([0.38, 0.8], 6.5); knob([0.54, 0.9], 6.5); chave(v.forma === "semi" ? [-0.6, 0.24] : [-0.62, 0.22], 0); break
    case "sg":
      knob([0.5, 0.7], 6); knob([0.62, 0.8], 6); knob([0.36, 0.8], 6); knob([0.48, 0.9], 6); chave([-0.5, 0.48], 0); break
    case "pbass":
      knob([0.52, 0.82], 6); knob([0.36, 0.9], 6); break
    case "jbass":
      { const [a, b] = m([0.38, 0.72]); o.push(`<rect x="${f(a - 6)}" y="${f(b - 6)}" width="12" height="${f(d.corpoL * 0.24)}" rx="6" fill="url(#${p}-metal)" transform="rotate(-48 ${f(a)} ${f(b)})"/>`) }
      knob([0.4, 0.72], 5.5); knob([0.52, 0.8], 5.5); knob([0.64, 0.88], 5.5); break
    case "passaro":
      knob([0.5, 0.74], 6); knob([0.62, 0.84], 6); knob([0.4, 0.88], 6); break
    case "violino":
      { const [a, b] = m([0.0, 0.3]); o.push(`<rect x="${f(a - 22)}" y="${f(b - 6)}" width="44" height="12" rx="3" fill="#111"/><circle cx="${f(a - 12)}" cy="${f(b)}" r="2.5" fill="url(#${p}-knob)"/><circle cx="${f(a + 12)}" cy="${f(b)}" r="2.5" fill="url(#${p}-knob)"/>`) }
      break
  }
  // jack de saída
  const [jx, jy] = m(v.forma === "tele" ? [0.86, 0.66] : v.forma === "v" ? [0.0, 0.66] : [0.86, 0.84])
  o.push(`<circle cx="${f(jx)}" cy="${f(jy)}" r="4" fill="url(#${p}-metal)"/><circle cx="${f(jx)}" cy="${f(jy)}" r="1.8" fill="#111"/>`)
  if (baixo) void 0
  return o.join("")
}

// tamanho natural (pra o canvas saber a proporção)
export function tamanhoInstrumento(v: Visual, tipo: Instrumento) {
  const d = dimensoes(v, tipo)
  return { w: d.W, h: d.H }
}

// canvas: a imagem do instrumento pronta pra desenhar (com cache)
const cacheImg = new Map<string, HTMLImageElement>()
export function imagemInstrumento(chave: string, v: Visual, tipo: Instrumento, acabamento: Acabamento) {
  const k = `${chave}:${acabamento}`
  let img = cacheImg.get(k)
  if (!img) {
    img = new Image()
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgInstrumento(v, tipo, acabamento, chave.replace(/[^a-z0-9]/gi, "")))}`
    cacheImg.set(k, img)
  }
  return img
}

void PI
