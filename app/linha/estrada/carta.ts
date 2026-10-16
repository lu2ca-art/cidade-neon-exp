// A CARTA DA CIDADE (o mapa grande e o minimapa do mapa novo, LU2CA 16/10:
// "o mapa tá bizarro de ruim… um monte de linha aleatória, sem estética").
// Pintada uma vez, com a estética do diorama v5 que ele aprovou: o relevo
// sombreado com a cor de cada bairro, a praia, o mar ficando fundo, as ruas
// com contorno e espessura pelo tipo, e os nomes dos bairros. Depois o mapa
// só desenha essa imagem embaixo (girando, no minimapa) e põe por cima a
// rota, os lugares e a Kombi.

import { BAIRROS, H, W, altura, costa, fbm } from "../rede/terreno"
import { montarRede } from "../rede/rede"

export const PX = 0.7 // pixels da carta por unidade da maquete

const COR: Record<string, [number, number, number]> = {
  cidade: [62, 46, 104], suburbio: [150, 98, 62], mirante: [70, 116, 72], arena: [158, 86, 46], deserto: [206, 158, 98], campo: [92, 108, 64],
}
const VIA: Record<string, { cor: string; w: number; tracejado?: boolean }> = {
  expressa: { cor: "#ff3fb0", w: 7 }, avenida: { cor: "#efe4ff", w: 5 }, orla: { cor: "#bff6ff", w: 5 }, principal: { cor: "#ffd27a", w: 4.5 },
  rua: { cor: "#e6e1ef", w: 3.2 }, beco: { cor: "#f2b48c", w: 2.2 }, tunel: { cor: "#9a9ab8", w: 4, tracejado: true },
  serpentina: { cor: "#d4ffb0", w: 3.4 }, terra: { cor: "#c99256", w: 3, tracejado: true }, rampa: { cor: "#ff8ad0", w: 3 },
}

function corDoChao(x: number, y: number): [number, number, number] {
  const c = costa(x)
  if (y > c) {
    // o mar: mais claro na beira, fundo longe dela
    const fundo = Math.min(1, (y - c) / 260)
    return [32 - fundo * 18, 120 - fundo * 62, 150 - fundo * 52]
  }
  let sr = 0, sg = 0, sb = 0, sw = 0
  const add = (k: [number, number, number], w: number) => { sr += k[0] * w; sg += k[1] * w; sb += k[2] * w; sw += w }
  add(COR.campo, 0.25)
  for (const [nome, b] of Object.entries(BAIRROS)) {
    const d = Math.hypot((x - b.x) / b.rx, (y - b.y) / b.ry) + (fbm(x / 160, y / 160) - 0.5) * 0.45
    const w = Math.max(0, 1.15 - d) ** 3 * 6
    if (w > 0) add(COR[nome], w)
  }
  let r = sr / sw, g = sg / sw, b = sb / sw
  // a praia (só na orla)
  const praia = Math.max(0, 1 - (c - y) / 70)
  if (x > 880) { r += (236 - r) * praia; g += (214 - g) * praia; b += (164 - b) * praia }
  return [r, g, b]
}

let CARTA: HTMLCanvasElement | null = null
export function cartaPronta() { return CARTA }

// pinta a carta (≈ meio segundo no celular): chamar uma vez, fora do primeiro quadro
export function pintarCarta(): HTMLCanvasElement {
  if (CARTA) return CARTA
  const cw = Math.round(W * PX), ch = Math.round(H * PX)
  // o chão numa grade de ¼ da resolução (o relevo é suave; a ampliação suaviza):
  // a altura de cada ponto é calculada uma vez e a sombra sai dos vizinhos
  const lw = Math.round(cw / 4), lh = Math.round(ch / 4)
  const baixo = document.createElement("canvas"); baixo.width = lw; baixo.height = lh
  const gb = baixo.getContext("2d")!, img = gb.createImageData(lw, lh), d = img.data
  const passo = W / lw
  const alt = new Float32Array(lw * lh)
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) alt[j * lw + i] = altura((i + 0.5) * passo, (j + 0.5) * passo)
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
    const x = (i + 0.5) * passo, y = (j + 0.5) * passo
    const [r, g, b] = corDoChao(x, y)
    // a sombra do relevo: a luz vem do noroeste
    let s = 1
    if (y < costa(x)) {
      const A = (ii: number, jj: number) => alt[Math.min(lh - 1, Math.max(0, jj)) * lw + Math.min(lw - 1, Math.max(0, ii))]
      const dx = A(i + 1, j) - A(i - 1, j), dy = A(i, j + 1) - A(i, j - 1)
      s = Math.max(0.55, Math.min(1.35, 1 + (-dx - dy) * 0.006))
    }
    const o = (j * lw + i) * 4
    d[o] = r * s; d[o + 1] = g * s; d[o + 2] = b * s; d[o + 3] = 255
  }
  gb.putImageData(img, 0, 0)
  const c = document.createElement("canvas"); c.width = cw; c.height = ch
  const g = c.getContext("2d")!
  g.imageSmoothingEnabled = true; g.drawImage(baixo, 0, 0, cw, ch)
  // as ruas: o contorno escuro primeiro, depois a cor (as maiores por cima)
  const rede = montarRede()
  g.save(); g.scale(PX, PX); g.lineCap = "round"; g.lineJoin = "round"
  const ordem = ["terra", "beco", "rua", "serpentina", "tunel", "principal", "rampa", "orla", "avenida", "expressa"]
  const caminho = (pts: [number, number][]) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))) }
  for (const tipo of ordem) for (const e of rede.arestas.filter((a) => a.tipo === tipo)) {
    const v = VIA[tipo]
    g.setLineDash([]); g.strokeStyle = "rgba(10,8,20,0.85)"; g.lineWidth = (v.w + 2.6) / PX * 0.7; caminho(e.pts); g.stroke()
    if (v.tracejado) g.setLineDash([10, 7])
    g.strokeStyle = v.cor; g.lineWidth = v.w / PX * 0.7; caminho(e.pts); g.stroke()
  }
  g.setLineDash([])
  g.restore()
  // os nomes dos bairros
  g.textAlign = "center"; g.textBaseline = "middle"
  const nome = (txt: string, x: number, y: number, tam = 26) => {
    g.font = `900 ${tam}px "Arial Black", system-ui, sans-serif`
    g.lineWidth = 5; g.strokeStyle = "rgba(10,8,20,0.75)"; g.strokeText(txt, x * PX, y * PX)
    g.fillStyle = "rgba(255,255,255,0.92)"; g.fillText(txt, x * PX, y * PX)
  }
  nome("A CIDADE NEON", 1000, 690); nome("O SUBÚRBIO", 780, 1220); nome("O MIRANTE", 1700, 200); nome("A ARENA", 1600, 880)
  nome("O DESERTO", 200, 800); nome("A ORLA", 1650, 1010, 22); nome("o mar", 1750, 1250, 20)
  CARTA = c
  return c
}
