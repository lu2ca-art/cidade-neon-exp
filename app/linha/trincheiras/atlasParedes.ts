// (08/11) O ATLAS DAS PAREDES LIVRES (docs/t64.md): uma textura só, 512×512, com os
// 8 espaços de 256×128, um por parede pintável. Existe só com a câmera perto de
// alguma delas (ParedesPintadas.tsx, <Perto>); longe, nem canvas nem textura.
// Sem nada por quadro: pinta na montagem e, depois, só o espaço do desenho que
// mudou (a textura sobe pra GPU uma vez por desenho).
//
// O que cada parede mostra: o desenho dela; ou a tag antiga do save (quem pintou
// antes de existirem várias paredes), com os cantos marcados; ou a moldura
// "pinte aqui"; ou, antes da missão, o cadeado e o que libera.

import * as THREE from "three"
import { LARGURA_SPRAY, LARG_PAREDE, MAX_PAREDES, decodificar, riscar } from "../grafite/paredes"
import type { TagLivre } from "../grafite/tipos"
import type { LugarGrafite } from "./geo"

const LADO = 512, SL = 256, SA = 128
const FUNDO = "#0b0812", MARCA = "#22e6ff"
const LARGURA = (LARGURA_SPRAY * SL) / LARG_PAREDE // a espessura do spray no atlas, em pixels

export type EstadoParedes = { desenhos: readonly string[]; tag: TagLivre | null; livre: boolean; tranca: string }
let est: EstadoParedes = { desenhos: [], tag: null, livre: false, tranca: "faça a missão dos túneis" }
let atlas: { c: HTMLCanvasElement; t: THREE.CanvasTexture } | null = null
let versaoTag = 0
const pintado: string[] = [] // o que está em cada espaço agora

const chaveDe = (i: number) => (est.desenhos[i] ? `d${est.desenhos[i]}` : est.tag ? `t${versaoTag}` : est.livre ? "l" : `c${est.tranca}`)

function moldura(g: CanvasRenderingContext2D, x0: number, y0: number, cor: string) {
  g.setLineDash([12, 9]); g.lineWidth = 3; g.strokeStyle = cor
  g.strokeRect(x0 + 8, y0 + 8, SL - 16, SA - 16); g.setLineDash([])
}
// a tag antiga no lugar: os cantos dizem que dá pra pintar por cima
function cantos(g: CanvasRenderingContext2D, x0: number, y0: number) {
  g.strokeStyle = MARCA; g.lineWidth = 3; g.beginPath()
  const m = 8, t = 20, x1 = x0 + SL - m, y1 = y0 + SA - m, xa = x0 + m, ya = y0 + m
  g.moveTo(xa, ya + t); g.lineTo(xa, ya); g.lineTo(xa + t, ya)
  g.moveTo(x1 - t, ya); g.lineTo(x1, ya); g.lineTo(x1, ya + t)
  g.moveTo(xa, y1 - t); g.lineTo(xa, y1); g.lineTo(xa + t, y1)
  g.moveTo(x1 - t, y1); g.lineTo(x1, y1); g.lineTo(x1, y1 - t)
  g.stroke()
}
function texto(g: CanvasRenderingContext2D, txt: string, cx: number, y: number, fonte: string, cor: string) {
  g.font = fonte; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = cor; g.fillText(txt, cx, y)
}
// quebra o aviso em até 3 linhas que cabem na parede
function linhas(g: CanvasRenderingContext2D, txt: string, larg: number) {
  const out: string[] = []
  let l = ""
  for (const p of txt.split(" ")) {
    const t = l ? `${l} ${p}` : p
    if (l && g.measureText(t).width > larg) { out.push(l); l = p } else l = t
  }
  if (l) out.push(l)
  return out.slice(0, 3)
}
function cadeado(g: CanvasRenderingContext2D, cx: number, y: number) {
  g.strokeStyle = g.fillStyle = "#f2eefa"; g.lineWidth = 4
  g.beginPath(); g.arc(cx, y - 4, 8, Math.PI, 0); g.stroke()
  g.fillRect(cx - 12, y - 4, 24, 18)
}

function pintarEspaco(g: CanvasRenderingContext2D, i: number) {
  const x0 = (i % 2) * SL, y0 = Math.floor(i / 2) * SA, cx = x0 + SL / 2
  g.save()
  g.beginPath(); g.rect(x0, y0, SL, SA); g.clip()
  g.fillStyle = FUNDO; g.fillRect(x0, y0, SL, SA)
  const d = decodificar(est.desenhos[i])
  if (d) {
    for (const t of d.tracos) riscar(g, t.pts, t.cor, x0, y0, SL / LARG_PAREDE, LARGURA)
  } else if (est.tag) {
    for (const t of est.tag.tracos) riscar(g, t.pts, t.cor, x0, y0, SL / 200, LARGURA) // a tag antiga: caixa de 200×100
    cantos(g, x0, y0)
  } else if (est.livre) {
    moldura(g, x0, y0, MARCA)
    texto(g, "PAREDE LIVRE", cx, y0 + 52, "900 28px ui-sans-serif, system-ui, sans-serif", MARCA)
    texto(g, "pinte aqui", cx, y0 + 84, "700 18px ui-monospace, monospace", "#f2eefa")
  } else {
    moldura(g, x0, y0, "rgba(242,238,250,.45)")
    cadeado(g, cx, y0 + 30)
    g.font = "700 15px ui-monospace, monospace"
    linhas(g, est.tranca, SL - 40).forEach((l, k) => texto(g, l, cx, y0 + 62 + k * 19, g.font, "rgba(242,238,250,.85)"))
  }
  g.restore()
  pintado[i] = chaveDe(i)
}

/** o que o save diz (GrafiteTrincheiras): repinta só os espaços que mudaram */
export function definirParedes(novo: EstadoParedes) {
  if (novo.tag !== est.tag) versaoTag++
  est = novo
  if (!atlas) return
  const g = atlas.c.getContext("2d")!
  let mudou = false
  for (let i = 0; i < MAX_PAREDES; i++) if (pintado[i] !== chaveDe(i)) { pintarEspaco(g, i); mudou = true }
  if (mudou) atlas.t.needsUpdate = true
}

export function montarAtlasParedes() {
  const c = document.createElement("canvas"); c.width = LADO; c.height = LADO
  const g = c.getContext("2d")!
  for (let i = 0; i < MAX_PAREDES; i++) pintarEspaco(g, i)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  atlas = { c, t }
  return t
}
export function desmontarAtlasParedes(t: THREE.CanvasTexture) {
  t.dispose()
  if (atlas?.t === t) { atlas.c.width = 0; atlas.c.height = 0; atlas = null }
}

// a parede que está sendo pintada: o Mundo das Trincheiras leva a câmera até ela e
// para o piloto. `d` = a que distância a parede enche o retângulo do painel
export const PAREDE_ABERTA: { l: LugarGrafite | null; d: number } = { l: null, d: 16 }
export const FOV_PAREDE = 66
