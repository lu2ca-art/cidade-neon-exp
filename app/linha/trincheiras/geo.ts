// As malhas das trincheiras, montadas uma vez só (T11). Desempenho: sem luz de
// ponto nenhuma; (05/11) o mapa cresceu (~5,7 km de túnel), então ele sai em
// PEDAÇOS: cada rio cortado em trechos de ~200 m e cada salão, um pedaço. Cada
// pedaço tem até 6 desenhos (o concreto, o neon, o vidro + fachos, os grafites e
// placas, as raízes, a poeira), com os materiais divididos entre todos; o
// Trincheiras.tsx só mostra os pedaços perto da câmera (o resto some na névoa).

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import {
  AVENIDAS, CURVA, COR_TORRE, LEITO, MEIA, MUROS, NOME_AVENIDA, NOME_SALAO, PORTA, SALOES, TETO, TORRE_R, TRECHOS_RIO, TREM,
  type Avenida, type Caixa, type P2, type Salao,
} from "./mapa"
import { GRAFITES } from "../grafite/grafites"
import type { Grafite, TagLivre } from "../grafite/tipos"
import { MAX_PAREDES } from "../grafite/paredes"

const BEIRA = 4 // a laje do teto pra fora da parede
const ALTO_TORRE = 160

// um ponto do perfil da seção: lateral (do meio), altura e cor
type Pf = { l: number; y: number; c: THREE.Color }
const C = (h: string) => new THREE.Color(h)
const LEITO_COR = C("#3d3348"), PAREDE_COR = C("#55436a"), ALTO_COR = C("#4a3d63")

// meia seção, do meio pra fora (o teto na altura "alto")
function meiaSecao(alto = TETO): Pf[] {
  const s: Pf[] = [{ l: 0, y: 0, c: LEITO_COR }, { l: LEITO, y: 0, c: LEITO_COR }]
  for (let j = 1; j <= 7; j++) {
    const f = (j / 7) * (Math.PI / 2)
    s.push({ l: LEITO + CURVA * Math.sin(f), y: CURVA * (1 - Math.cos(f)), c: PAREDE_COR })
  }
  s.push({ l: MEIA, y: alto, c: ALTO_COR })
  s.push({ l: MEIA + BEIRA, y: alto, c: ALTO_COR })
  return s
}
const SECAO: Pf[] = (() => { const m = meiaSecao(); return [...m.slice(1).reverse().map((p) => ({ ...p, l: -p.l })), ...m] })()

// a normal (pra esquerda) de uma linha em cada ponto
function normais(pts: P2[]) {
  return pts.map((_, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]
    const dx = b.x - a.x, dz = b.z - a.z, n = Math.hypot(dx, dz) || 1
    return { x: -dz / n, z: dx / n }
  })
}
const NORMAIS = AVENIDAS.map((a) => normais(a.pts))

// os pontos do rio que ficam fora dos salões das pontas (ali o chão é do salão).
// "folga" é a distância do centro do salão onde o rio começa a valer
function trecho(av: Avenida, folga: (s: Salao) => number) {
  const pts = av.pts, de = SALOES[av.de], ate = SALOES[av.ate], fd = folga(de), fa = folga(ate)
  let k0 = 0, k1 = pts.length - 1
  while (k0 < k1 && Math.hypot(pts[k0].x - de.c.x, pts[k0].z - de.c.z) < fd) k0++
  while (k1 > k0 && Math.hypot(pts[k1].x - ate.c.x, pts[k1].z - ate.c.z) < fa) k1--
  return [k0, k1] as const
}
// a parede e o vidro do rio encostam na parede do salão (o raio dele)
const folgaParede = (s: Salao) => Math.sqrt(s.r * s.r - MEIA * MEIA) - 1.5
const folgaChao = (s: Salao) => s.r - CURVA

// uma "fita" ao longo de uma linha: de lateral l0 a l1, altura y0 a y1
function fita(pts: P2[], nrm: P2[], k0: number, k1: number, l0: number, l1: number, y0: number, y1: number, cor: THREE.Color | ((k: number) => THREE.Color)) {
  const pos: number[] = [], col: number[] = [], idx: number[] = []
  for (let k = k0; k <= k1; k++) {
    const p = pts[k], n = nrm[k], c = typeof cor === "function" ? cor(k) : cor
    pos.push(p.x + n.x * l0, y0, p.z + n.z * l0, p.x + n.x * l1, y1, p.z + n.z * l1)
    col.push(c.r, c.g, c.b, c.r, c.g, c.b)
    if (k < k1) { const i = (k - k0) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

// um quadrado em pé, virado pra (nx, nz), com cor (e, opcional, UV)
function quadro(cx: number, cy: number, cz: number, nx: number, nz: number, w: number, h: number, cor: THREE.Color, uv?: [number, number, number, number]) {
  const g = new THREE.PlaneGeometry(w, h)
  g.rotateY(Math.atan2(nx, nz)); g.translate(cx, cy, cz)
  if (uv) {
    const [u0, v0, u1, v1] = uv, a = g.attributes.uv as THREE.BufferAttribute
    a.setXY(0, u0, v1); a.setXY(1, u1, v1); a.setXY(2, u0, v0); a.setXY(3, u1, v0)
  }
  return pintar(g, cor)
}

// um anel (ou arco) deitado, de raio r0 a r1, entre os ângulos
function anelChao(cx: number, cz: number, r0: number, r1: number, y: number, a0: number, a1: number, cor: THREE.Color, seg = 48) {
  const pos: number[] = [], col: number[] = [], idx: number[] = []
  for (let j = 0; j <= seg; j++) {
    const a = a0 + ((a1 - a0) * j) / seg, s = Math.sin(a), c = Math.cos(a)
    pos.push(cx + c * r0, y, cz + s * r0, cx + c * r1, y, cz + s * r1)
    col.push(cor.r, cor.g, cor.b, cor.r, cor.g, cor.b)
    if (j < seg) { const i = j * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}
// uma faixa em pé, curva (um pedaço de cilindro), de raio r, entre ângulos e alturas
function faixaCurva(cx: number, cz: number, r: number, a0: number, a1: number, y0: number, y1: number, cor: THREE.Color, seg = 8) {
  const pos: number[] = [], col: number[] = [], idx: number[] = []
  for (let j = 0; j <= seg; j++) {
    const a = a0 + ((a1 - a0) * j) / seg, c = Math.cos(a), s = Math.sin(a)
    pos.push(cx + c * r, y0, cz + s * r, cx + c * r, y1, cz + s * r)
    col.push(cor.r, cor.g, cor.b, cor.r, cor.g, cor.b)
    if (j < seg) { const i = j * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}
// uma caixa deitada ao longo de (ax, az), de comprimento c, largura l e altura h, no chão
function caixaAo(x: number, z: number, ax: number, az: number, c: number, l: number, h: number, y0: number, cor: THREE.Color) {
  const g = new THREE.BoxGeometry(c, h, l)
  g.rotateY(Math.atan2(-az, ax)); g.translate(x, y0 + h / 2, z)
  return pintar(semUV(g), cor)
}

// as bocas de um salão (o ângulo de cada rio que chega nele)
function bocas(s: Salao): number[] {
  return AVENIDAS.flatMap((a) => (a.de === s.i ? [a.pts[3]] : a.ate === s.i ? [a.pts[a.pts.length - 4]] : []))
    .map((p) => Math.atan2(p.z - s.c.z, p.x - s.c.x))
}
// os arcos da parede do salão que não são boca de rio
function arcosDoSalao(s: Salao): [number, number][] {
  const meia = Math.asin(Math.min(1, MEIA / s.r))
  const bs = bocas(s).sort((a, b) => a - b)
  if (!bs.length) return [[0, Math.PI * 2]]
  const arcos: [number, number][] = []
  for (let j = 0; j < bs.length; j++) {
    const a0 = bs[j] + meia, a1 = (j + 1 < bs.length ? bs[j + 1] : bs[0] + Math.PI * 2) - meia
    if (a1 > a0) arcos.push([a0, a1])
  }
  return arcos
}

// a parede do salão: o mesmo perfil do rio, girado em volta (até o teto do salão)
function paredeSalao(s: Salao) {
  const half = meiaSecao(s.alto).slice(1) // do fim do leito pra fora
  const r0 = s.r - MEIA // o "meio" virtual: o leito acaba em r - CURVA
  const geos: THREE.BufferGeometry[] = []
  for (const [a0, a1] of arcosDoSalao(s)) {
    const seg = Math.max(4, Math.round((a1 - a0) * Math.max(18, s.r * 0.4)))
    const pos: number[] = [], col: number[] = [], idx: number[] = [], m = half.length
    for (let j = 0; j <= seg; j++) {
      const a = a0 + ((a1 - a0) * j) / seg, c = Math.cos(a), sn = Math.sin(a)
      for (const p of half) { const r = r0 + p.l; pos.push(s.c.x + c * r, p.y, s.c.z + sn * r); col.push(p.c.r, p.c.g, p.c.b) }
      if (j < seg) for (let q = 0; q < m - 1; q++) { const A = j * m + q, B = A + m; idx.push(A, A + 1, B, A + 1, B + 1, B) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    geos.push(g)
  }
  // em cima de cada boca, a parede do salão fecha do teto do rio até o teto do salão
  const meia = Math.asin(Math.min(1, MEIA / s.r))
  for (const b of bocas(s)) geos.push(faixaCurva(s.c.x, s.c.z, s.r, b - meia, b + meia, TETO - 0.5, s.alto, ALTO_COR))
  return geos
}

function semUV(g: THREE.BufferGeometry) { g.deleteAttribute("uv"); return g }
function soPosCor(g: THREE.BufferGeometry) {
  const x = g.index ? g.toNonIndexed() : g
  for (const k of Object.keys(x.attributes)) if (k !== "position" && k !== "color") x.deleteAttribute(k)
  return x
}
function pintar(g: THREE.BufferGeometry, cor: THREE.Color) {
  const n = g.attributes.position.count, col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { col[i * 3] = cor.r; col[i * 3 + 1] = cor.g; col[i * 3 + 2] = cor.b }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3))
  return g
}

// ruído barato e fixo por posição (o mapa sai sempre igual, em qualquer pedaço)
function h3(a: number, b: number, c: number) {
  let s = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0
  s = Math.imul(s ^ (s >>> 13), 1274126177) >>> 0
  return ((s ^ (s >>> 16)) >>> 0) / 4294967296
}
function rnd(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

// ── a textura dos grafites (T12/T64) e das placas: uma só ──
// 4 grafites (512×256) em cima e 16 placas (512×64) embaixo.
// (T64) os 3 primeiros espaços são os grafites do T12 (GRAFITES, os rascunhos até o
// dono mandar os desenhos): sem assinar, a parede mostra os PONTOS (o gesto, numerado,
// pra o jogador ligar); assinado, a arte pintada. O 4º espaço é a tag fixa "LU2CA".
// Assinar repinta só aquele pedaço da textura (uma vez, nada por quadro):
// definirGrafitesAssinados (ao carregar o save) e assinarGrafiteNaParede (no gesto).
const TAG_FIXA: [string, string, string] = ["LU2CA", "#ff3fb0", "#2fe8ff"]
export const GRAFITES_NA_PAREDE: Grafite[] = GRAFITES.slice(0, 3)
const assinados = new Set<string>()
let atlasAtual: { c: HTMLCanvasElement; t: THREE.CanvasTexture } | null = null

// as placas: 0..5 os salões, 6..12 os rios, 13 o "subir", 14 o metrô, 15 a porta
const PLACA_SALAO = (i: number) => i
const PLACA_RIO = (i: number) => 6 + i
const PLACA_SUBIR = 13, PLACA_METRO = 14, PLACA_PORTA = 15

function pintarTag(g: CanvasRenderingContext2D, i: number, [txt, a, b]: [string, string, string]) {
  const x0 = (i % 2) * 512, y0 = Math.floor(i / 2) * 256
  g.save(); g.translate(x0 + 256, y0 + 128); g.rotate((i % 2 ? 1 : -1) * 0.06)
  g.font = `900 ${txt.length > 4 ? 120 : 150}px ui-sans-serif, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"
  g.lineJoin = "round"
  g.lineWidth = 26; g.strokeStyle = "#0b0812"; g.strokeText(txt, 0, 0)
  g.lineWidth = 12; g.strokeStyle = b; g.strokeText(txt, 0, 0)
  const gr = g.createLinearGradient(0, -70, 0, 70); gr.addColorStop(0, a); gr.addColorStop(1, b)
  g.fillStyle = gr; g.fillText(txt, 0, 0)
  // os escorridos
  g.fillStyle = a
  for (let k = 0; k < 7; k++) { const x = -180 + k * 60 + (k % 3) * 9; g.fillRect(x, 40, 5, 30 + ((k * 37) % 50)) }
  g.restore()
}

// um grafite do T12 no espaço i do atlas: a arte (assinado) ou os pontos do gesto
function pintarGrafite(g: CanvasRenderingContext2D, i: number, gr: Grafite, feito: boolean) {
  const x0 = (i % 2) * 512, y0 = Math.floor(i / 2) * 256
  g.save()
  g.fillStyle = "#000"; g.fillRect(x0, y0, 512, 256)
  // a caixa 0..100 do grafite vira um quadrado de 236 px no meio do espaço
  const S = 236, ox = x0 + 256 - S / 2, oy = y0 + 10
  const m = (p: [number, number]): [number, number] => [ox + (p[0] / 100) * S, oy + (p[1] / 100) * S]
  g.lineCap = "round"; g.lineJoin = "round"
  if (feito) {
    for (const t of gr.tracos) {
      g.strokeStyle = t.cor; g.lineWidth = Math.max(2, (t.largura / 100) * S)
      g.shadowColor = t.cor; g.shadowBlur = 10
      g.beginPath(); t.pts.forEach((p, k) => { const [a, b] = m(p); if (k) g.lineTo(a, b); else g.moveTo(a, b) }); g.stroke()
    }
    g.shadowBlur = 0
  } else {
    // os pontos: a guia tracejada, os círculos numerados (o 1 em amarelo)
    g.setLineDash([10, 12]); g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 4
    g.beginPath(); gr.gesto.forEach((p, k) => { const [a, b] = m(p); if (k) g.lineTo(a, b); else g.moveTo(a, b) }); g.stroke(); g.setLineDash([])
    gr.gesto.forEach((p, k) => {
      const [a, b] = m(p)
      g.beginPath(); g.arc(a, b, 15, 0, 6.283); g.fillStyle = "#0a0812"; g.fill()
      g.lineWidth = 4; g.strokeStyle = k === 0 ? "#ffd23f" : "#22e6ff"; g.shadowColor = g.strokeStyle; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0
      g.fillStyle = "#fff"; g.font = "800 18px ui-sans-serif, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"
      g.fillText(String(k + 1), a, b + 1)
    })
  }
  g.restore()
}

// (T64, 06/11) o grafite livre: a tag do jogador no lugar da "LU2CA" fixa (o 4º
// espaço, 1 em cada 4 paredes). Pinta uma vez, ao carregar ou ao terminar a tag
let tagLivre: TagLivre | null = null
function pintarTagLivre(g: CanvasRenderingContext2D, i: number, t: TagLivre) {
  const x0 = (i % 2) * 512, y0 = Math.floor(i / 2) * 256, k = 512 / 200
  g.save()
  g.fillStyle = "#000"; g.fillRect(x0, y0, 512, 256)
  g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = 10
  for (const tr of t.tracos) {
    const p = tr.pts
    if (p.length < 2) continue
    g.strokeStyle = tr.cor; g.shadowColor = tr.cor; g.shadowBlur = 12
    g.beginPath(); g.moveTo(x0 + p[0] * k, y0 + p[1] * k)
    for (let j = 2; j < p.length; j += 2) g.lineTo(x0 + p[j] * k, y0 + p[j + 1] * k)
    if (p.length === 2) g.lineTo(x0 + p[0] * k + 0.1, y0 + p[1] * k)
    g.stroke()
  }
  g.restore()
}
function pintarEspaco(g: CanvasRenderingContext2D, i: number) {
  const gr = GRAFITES_NA_PAREDE[i]
  if (gr) pintarGrafite(g, i, gr, assinados.has(gr.id))
  else if (tagLivre && tagLivre.tracos.length) pintarTagLivre(g, i, tagLivre)
  else pintarTag(g, i, TAG_FIXA)
}
/** a tag livre do save (null = a "LU2CA" fixa): repinta só os espaços sem grafite do T12 */
export function definirTagLivre(t: TagLivre | null) {
  if (t === tagLivre) return
  tagLivre = t
  if (!atlasAtual) return
  const g = atlasAtual.c.getContext("2d")!
  for (let i = GRAFITES_NA_PAREDE.length; i < 4; i++) pintarEspaco(g, i)
  atlasAtual.t.needsUpdate = true
}

export function texturaAtlas() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1024
  const g = c.getContext("2d")!
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024)
  for (let i = 0; i < 4; i++) pintarEspaco(g, i)
  const placa = (txt: string, cor: string, slot: number) => {
    const x0 = (slot % 2) * 512, y0 = 512 + Math.floor(slot / 2) * 64
    g.fillStyle = "#07060c"; g.fillRect(x0 + 3, y0 + 3, 506, 58)
    g.font = `800 ${txt.length > 16 ? 30 : 38}px ui-monospace, monospace`; g.textAlign = "center"; g.textBaseline = "middle"
    g.shadowColor = cor; g.shadowBlur = 14; g.fillStyle = cor; g.fillText(txt, x0 + 256, y0 + 34); g.shadowBlur = 0
  }
  NOME_SALAO.forEach((n, i) => placa(n, COR_TORRE, PLACA_SALAO(i)))
  NOME_AVENIDA.forEach((n, i) => placa(n, AVENIDAS[i].cor, PLACA_RIO(i)))
  placa("SUBIR · RUA", "#ffcf8a", PLACA_SUBIR)
  placa("METRÔ · LINHA 9", "#ff7a3c", PLACA_METRO)
  placa("↑ SUBÚRBIO", "#ffcf8a", PLACA_PORTA)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  atlasAtual = { c, t }
  return t
}

// repinta os espaços dos grafites (só os que mudaram) e manda a textura de novo pra GPU
function repintar(ids: string[]) {
  if (!atlasAtual || !ids.length) return
  const g = atlasAtual.c.getContext("2d")!
  GRAFITES_NA_PAREDE.forEach((gr, i) => { if (ids.includes(gr.id)) pintarEspaco(g, i) })
  atlasAtual.t.needsUpdate = true
}
// os grafites já assinados (do save): chamar ao entrar nos túneis
export function definirGrafitesAssinados(ids: readonly string[]) {
  const mudou = GRAFITES_NA_PAREDE.filter((gr) => ids.includes(gr.id) !== assinados.has(gr.id)).map((gr) => gr.id)
  assinados.clear(); ids.forEach((id) => assinados.add(id))
  repintar(mudou)
}
// o jogador acabou de assinar um: a parede passa a mostrar a arte
export function assinarGrafiteNaParede(id: string) {
  if (assinados.has(id)) return
  assinados.add(id)
  repintar([id])
}
const uvGrafite = (i: number): [number, number, number, number] => { const x = (i % 2) * 0.5, y = 1 - (Math.floor(i / 2) + 1) * 0.25; return [x, y, x + 0.5, y + 0.25] }
const uvPlaca = (s: number): [number, number, number, number] => { const x = (s % 2) * 0.5, y = 0.5 - (Math.floor(s / 2) + 1) * 0.0625; return [x, y, x + 0.5, y + 0.0625] }

// os lugares de grafite. (T64) `slot` é o espaço do atlas (0..3) e `grafite` o id
// do grafite do T12 que mora ali (null = a tag fixa, nada pra assinar).
// av = o rio (>= 0) ou -1 - salão; k = o ponto do rio (pra saber em que pedaço fica)
export type LugarGrafite = { x: number; y: number; z: number; nx: number; nz: number; av: number; k: number; slot: number; grafite: string | null; w: number; h: number }
let lugaresCache: LugarGrafite[] | null = null
export function lugaresGrafite(): LugarGrafite[] {
  if (lugaresCache) return lugaresCache
  const l: LugarGrafite[] = []
  const por = (g: Omit<LugarGrafite, "slot" | "grafite">) => { const slot = l.length % 4; l.push({ ...g, slot, grafite: GRAFITES_NA_PAREDE[slot]?.id ?? null }) }
  // nos rios: na parede em pé, de 90 em 90 m, alternando os lados
  for (const av of AVENIDAS) {
    const nrm = NORMAIS[av.i], [ka, kb] = trecho(av, folgaParede)
    for (let k = ka + 20, lado = 1; k < kb - 20; k += 45, lado = -lado) {
      const p = av.pts[k], n = nrm[k], d = lado * (MEIA - 0.06)
      por({ x: p.x + n.x * d, y: CURVA + 3.6, z: p.z + n.z * d, nx: -n.x * lado, nz: -n.z * lado, av: av.i, k, w: 10, h: 5 })
    }
  }
  // no salão do grafite: a parede inteira, em duas fileiras, e os muros das trincheiras
  for (const s of SALOES) {
    if (s.tipo !== "grafite") continue
    for (const [a0, a1] of arcosDoSalao(s)) {
      const n = Math.max(1, Math.floor(((a1 - a0) * s.r) / 16))
      for (let j = 0; j < n; j++) {
        const a = a0 + ((j + 0.5) / n) * (a1 - a0), c = Math.cos(a), sn = Math.sin(a), r = s.r - 0.06
        por({ x: s.c.x + c * r, y: j % 2 ? CURVA + 12 : CURVA + 4, z: s.c.z + sn * r, nx: -c, nz: -sn, av: -1 - s.i, k: 0, w: 12, h: 6 })
      }
    }
    for (const m of MUROS) for (const lado of [-1, 1]) {
      const nx = -m.az * lado, nz = m.ax * lado
      por({ x: m.c.x + nx * (m.meioL + 0.04), y: 1.9, z: m.c.z + nz * (m.meioL + 0.04), nx, nz, av: -1 - s.i, k: 0, w: 6, h: 3 })
    }
  }
  lugaresCache = l
  return l
}
// (T64) o lugar de grafite mais perto de (x, z), até `raio` metros no chão (o grafite
// fica no alto da parede: conta só a distância no plano). Só os que têm grafite
export function grafitePerto(x: number, z: number, raio = 14): LugarGrafite | null {
  let melhor: LugarGrafite | null = null, d2m = raio * raio
  for (const l of lugaresGrafite()) {
    if (!l.grafite) continue
    const d2 = (l.x - x) ** 2 + (l.z - z) ** 2
    if (d2 < d2m) { d2m = d2; melhor = l }
  }
  return melhor
}

// (08/11, docs/t64.md) AS PAREDES LIVRES: 8 lugares das paredes da tag, onde cada um
// recebe o desenho dele (atlasParedes.ts). Uma perto da entrada em três rios (a
// rampa da descida, o rio A, o rio E) e o resto espalhado no salão do grafite. A
// ordem é a identidade da parede no save: não mexer sem migrar
let paredesCache: LugarGrafite[] | null = null
export function paredesLivres(): LugarGrafite[] {
  if (paredesCache) return paredesCache
  const tags = lugaresGrafite().filter((l) => !l.grafite)
  const out: LugarGrafite[] = []
  for (const av of [6, 0, 4]) { const t = tags.find((l) => l.av === av); if (t) out.push(t) }
  const salao = tags.filter((l) => l.av < 0 && l.w >= 10), falta = MAX_PAREDES - out.length
  for (let j = 0; j < falta && salao.length; j++) { const l = salao[Math.floor((j * salao.length) / falta)]; if (!out.includes(l)) out.push(l) }
  for (const l of tags) { if (out.length >= MAX_PAREDES) break; if (!out.includes(l)) out.push(l) } // a reserva, se o mapa mudar
  paredesCache = out.slice(0, MAX_PAREDES)
  return paredesCache
}
// a parede livre mais perto de (x, z), até `raio` metros no chão: o índice dela (-1 = nenhuma)
export function paredeLivrePerto(x: number, z: number, raio = 14): number {
  let melhor = -1, d2m = raio * raio
  paredesLivres().forEach((l, i) => {
    const d2 = (l.x - x) ** 2 + (l.z - z) ** 2
    if (d2 < d2m) { d2m = d2; melhor = i }
  })
  return melhor
}
// as 8 paredes numa malha só (um desenho; a textura é a do atlas das paredes livres)
export function geoParedesLivres() {
  return fundir(paredesLivres().map((l, i) => quadro(l.x, l.y, l.z, l.nx, l.nz, l.w, l.h, C("#d8d0e8"), uvGrafite(i))), true)!
}

// ── as raízes da cidade-árvore, penduradas do vidro (fundidas no pedaço) ──
const RAIZ = (() => {
  const geo = new THREE.CylinderGeometry(0.32, 0.03, 1, 5, 3, true)
  geo.translate(0, -0.5, 0) // o topo no zero: pendura do teto
  // torce um pouco (raiz não é reta)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 3.1) * 0.12); p.setZ(i, p.getZ(i) + Math.cos(y * 2.3) * 0.1) }
  geo.deleteAttribute("uv"); geo.deleteAttribute("normal")
  return geo
})()
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3()
function raiz(geos: THREE.BufferGeometry[], x: number, z: number, y: number, comp: number, grosso: number, r: () => number) {
  _e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5); _q.setFromEuler(_e)
  _s.set(grosso, comp, grosso); _v.set(x, y + 0.2, z)
  const g = RAIZ.clone().applyMatrix4(_m.compose(_v, _q, _s))
  geos.push(pintar(g, C(r() < 0.18 ? "#6af2d0" : "#3a2618").multiplyScalar(0.7 + r() * 0.5)))
}

// ── os pedaços ──
type Camadas = { concreto: THREE.BufferGeometry[]; neon: THREE.BufferGeometry[]; vidro: THREE.BufferGeometry[]; atlas: THREE.BufferGeometry[]; raizes: THREE.BufferGeometry[]; poeira: number[] }
export type Pedaco = {
  x: number; z: number; r: number // o círculo que cobre o pedaço (pra mostrar só os perto)
  concreto: THREE.BufferGeometry | null; neon: THREE.BufferGeometry | null; vidro: THREE.BufferGeometry | null
  atlas: THREE.BufferGeometry | null; raizes: THREE.BufferGeometry | null; poeira: THREE.BufferGeometry | null
}
const novas = (): Camadas => ({ concreto: [], neon: [], vidro: [], atlas: [], raizes: [], poeira: [] })
const QUENTE = C("#ffcf8a"), BRANCO = C("#ffffff")

// um trecho de rio, de k0 a k1
function trechoRio(av: Avenida, k0: number, k1: number, L: Camadas) {
  const pts = av.pts, nrm = NORMAIS[av.i], cor = C(av.cor)
  const [ka, kb] = trecho(av, folgaParede), [kn0, kn1] = trecho(av, folgaChao)
  const lo = Math.max(k0, ka), hi = Math.min(k1, kb)
  if (hi > lo) {
    // o concreto; manchas no leito: o rio que secou deixou marcas
    for (let q = 0; q < SECAO.length - 1; q++) {
      const a = SECAO[q], b = SECAO[q + 1], noLeito = Math.abs(a.l) <= LEITO && Math.abs(b.l) <= LEITO
      L.concreto.push(fita(pts, nrm, lo, hi, a.l, b.l, a.y, b.y, noLeito ? (k) => a.c.clone().multiplyScalar(0.85 + h3(av.i, k, 7) * 0.3) : a.c))
    }
    // o vidro: o sol passa pela areia em manchas
    const sol = (k: number) => { const v = 0.5 + 0.5 * Math.sin(k * 0.07 + av.i) * Math.sin(k * 0.023 + 1.3); return C("#ff9a3c").multiplyScalar(0.02 + v * 0.07 + h3(av.i, k, 11) * 0.015) }
    L.vidro.push(fita(pts, nrm, lo, hi, -MEIA, MEIA, TETO, TETO, sol))
  }
  const nlo = Math.max(k0, kn0), nhi = Math.min(k1, kn1)
  if (nhi > nlo) for (const l of [-1, 1]) {
    // a linha onde o leito vira parede, e a de cima, onde a parede fica em pé
    L.neon.push(fita(pts, nrm, nlo, nhi, l * (LEITO - 0.25), l * (LEITO + 0.15), 0.04, 0.05, cor))
    L.neon.push(fita(pts, nrm, nlo, nhi, l * (MEIA - 0.02), l * (MEIA - 0.02), CURVA - 0.06, CURVA + 0.16, cor.clone().multiplyScalar(0.55)))
  }
  // as lâmpadas na parede em pé, de 16 em 16 m, alternando os lados
  for (let k = kn0 + 4, lado = 1; k < kn1 - 4; k += 8, lado = -lado) {
    if (k < k0 || k >= k1) continue
    const p = pts[k], n = nrm[k], l = lado * (MEIA - 0.05)
    L.neon.push(semUV(quadro(p.x + n.x * l, TETO * 0.62, p.z + n.z * l, -n.x * lado, -n.z * lado, 2.4, 0.45, QUENTE)))
  }
  // as setas no chão, a cada 60 m: pra onde a volta segue
  for (let k = kn0 + 20; k < kn1 - 10; k += 30) {
    if (k < k0 || k >= k1) continue
    const p = pts[k], q = pts[k + 1], ang = Math.atan2(q.x - p.x, q.z - p.z)
    for (const lado of [-0.7, 0.7]) {
      const s = new THREE.PlaneGeometry(0.3, 3.2); s.rotateX(-Math.PI / 2); s.rotateY(ang + lado); s.translate(p.x, 0.03, p.z)
      L.neon.push(pintar(semUV(s), cor.clone().multiplyScalar(0.6)))
    }
  }
  // o nome do rio nas duas bocas, pendurado do vidro, de frente pra quem entra
  for (const [k, sentido] of [[ka + 6, 1], [kb - 6, -1]] as const) {
    if (k < k0 || k >= k1 || k <= 0 || k >= pts.length - 1) continue
    const p = pts[k], q = pts[k + sentido], fx = q.x - p.x, fz = q.z - p.z, f = Math.hypot(fx, fz)
    L.atlas.push(quadro(p.x, TETO - 2, p.z, -fx / f, -fz / f, 14, 1.75, BRANCO, uvPlaca(PLACA_RIO(av.i))))
  }
  // as raízes: mais perto das paredes (o meio fica livre pra câmera)
  for (let k = Math.max(ka, 10); k < Math.min(kb, pts.length - 10); k += 2) {
    if (k < k0 || k >= k1 || h3(av.i, k, 1) > 0.5) continue
    const r = rnd(av.i * 100003 + k), pt = pts[k], n = nrm[k]
    const lado = r() < 0.5 ? -1 : 1, l = lado * (MEIA - r() * 9)
    raiz(L.raizes, pt.x + n.x * l, pt.z + n.z * l, TETO, 2 + r() * 6.5, 0.8 + r() * 1.8, r)
  }
  // a poeira no ar (a luz do vidro batendo)
  for (let k = Math.max(k0, ka); k < Math.min(k1, kb); k++) {
    if (h3(av.i, k, 5) > 0.45) continue
    const r = rnd(av.i * 7919 + k * 31), p = pts[k], n = nrm[k], l = (r() - 0.5) * 2 * MEIA
    L.poeira.push(p.x + n.x * l, 0.5 + r() * (TETO - 1), p.z + n.z * l)
  }
}

// um salão inteiro
function salao(s: Salao, L: Camadas) {
  const r = rnd(1000 + s.i * 77)
  const cT = C(COR_TORRE)
  // o chão e a parede em volta
  // (o chão vai um pouco além do leito: cobre também os cantos das bocas, até onde o rio começa)
  const fp = folgaParede(s), chao = new THREE.CircleGeometry(Math.max(s.r - CURVA + 2, Math.hypot(fp, LEITO) + 0.5), 64); chao.rotateX(-Math.PI / 2); chao.translate(s.c.x, -0.01, s.c.z)
  L.concreto.push(pintar(semUV(chao), LEITO_COR))
  L.concreto.push(...paredeSalao(s))
  for (const [a0, a1] of arcosDoSalao(s)) L.neon.push(anelChao(s.c.x, s.c.z, s.r - CURVA - 0.25, s.r - CURVA + 0.2, 0.04, a0, a1, cT, Math.max(8, Math.round((a1 - a0) * 24))))
  // o vidro lá em cima
  L.vidro.push(anelChao(s.c.x, s.c.z, 0, s.r, s.alto, 0, Math.PI * 2, C("#ff9a3c").multiplyScalar(0.06), 48))
  // o nome do salão em cada boca, de frente pra quem chega pelo rio
  for (const b of bocas(s)) {
    const c = Math.cos(b), sn = Math.sin(b), d = Math.sqrt(s.r * s.r - MEIA * MEIA) - 3
    L.atlas.push(quadro(s.c.x + c * d, TETO - 2, s.c.z + sn * d, c, sn, 14, 1.75, BRANCO, uvPlaca(PLACA_SALAO(s.i))))
  }
  if (s.torre) {
    // a torre: sobe atravessando o vidro, até a rua lá em cima
    const t = s.torre
    const tor = new THREE.CylinderGeometry(TORRE_R, TORRE_R, ALTO_TORRE, 20, 1, true); tor.translate(t.x, ALTO_TORRE / 2, t.z)
    L.concreto.push(pintar(semUV(tor), C("#3a3058")))
    for (const h of [0.15, 4.5, 14, 26, 42, 64, 92, 128]) {
      const a = new THREE.CylinderGeometry(TORRE_R + 0.06, TORRE_R + 0.06, h < 1 ? 0.3 : 0.5, 24, 1, true); a.translate(t.x, h, t.z)
      L.neon.push(pintar(semUV(a), cT))
    }
    // a porta do elevador, virada pro salão; em cima, o nome e o "subir"
    const nx = -s.fora.x, nz = -s.fora.z
    L.neon.push(semUV(quadro(t.x + nx * (TORRE_R + 0.08), 1.6, t.z + nz * (TORRE_R + 0.08), nx, nz, 2.4, 3.2, QUENTE)))
    L.atlas.push(quadro(t.x + nx * (TORRE_R + 1.6), 9, t.z + nz * (TORRE_R + 1.6), nx, nz, 12, 1.5, BRANCO, uvPlaca(PLACA_SALAO(s.i))))
    L.atlas.push(quadro(t.x + nx * (TORRE_R + 0.5), 3.8, t.z + nz * (TORRE_R + 0.5), nx, nz, 4, 0.5, BRANCO, uvPlaca(PLACA_SUBIR)))
    // o facho que desce da rua pela torre (mais forte em cima)
    const f = new THREE.CylinderGeometry(TORRE_R + 3, TORRE_R + 8, s.alto, 20, 1, true); f.translate(t.x, s.alto / 2, t.z)
    const pos = f.attributes.position, col = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) / s.alto) * 0.22; col[i * 3] = cT.r * k; col[i * 3 + 1] = cT.g * k; col[i * 3 + 2] = cT.b * k }
    f.setAttribute("color", new THREE.BufferAttribute(col, 3))
    L.vidro.push(semUV(f))
  }
  if (s.tipo === "metro") metro(L)
  if (s.tipo === "grafite") for (const m of MUROS) muro(m, L)
  if (s.tipo === "descida") porta(PORTA, L)
  // os grafites dos salões
  for (const g of lugaresGrafite()) if (g.av === -1 - s.i && !paredesLivres().includes(g)) L.atlas.push(quadro(g.x, g.y, g.z, g.nx, g.nz, g.w, g.h, C("#d8d0e8"), uvGrafite(g.slot)))
  // as raízes e a poeira
  const nr = Math.round(s.r * 0.9)
  for (let j = 0; j < nr; j++) {
    const a = r() * Math.PI * 2, d = 8 + r() * (s.r - 10)
    raiz(L.raizes, s.c.x + Math.cos(a) * d, s.c.z + Math.sin(a) * d, s.alto, 2 + r() * 9, 0.8 + r() * 1.8, r)
  }
  for (let j = 0; j < s.r * 4; j++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (s.r - 2)
    L.poeira.push(s.c.x + Math.cos(a) * d, 0.5 + r() * (s.alto - 2), s.c.z + Math.sin(a) * d)
  }
}

// o salão do metrô: a linha 9 parada na plataforma (3 vagões), a faixa amarela e a placa
// (06/11) o trem em si agora é o carro do metro.glb (TremTuneis.tsx); estas caixas
// ficam de reserva (enquanto baixa, ou se falhar): geoTremCaixas
export function geoTremCaixas() {
  const L = novas()
  const t = TREM, ax = t.ax, az = t.az, nx = -az, nz = ax
  const corpo = C("#2a2440"), teto = C("#3a3058"), janela = C("#6af2ff").multiplyScalar(0.75), faixa = C("#ff7a3c")
  const vag = (t.meioC * 2 - 2) / 3
  for (const j of [-1, 0, 1]) {
    const u = j * (vag + 1), x = t.c.x + ax * u, z = t.c.z + az * u
    L.concreto.push(caixaAo(x, z, ax, az, vag, t.meioL * 2, t.alto - 0.5, 0.25, corpo))
    L.concreto.push(caixaAo(x, z, ax, az, vag - 0.6, t.meioL * 2 - 0.4, 0.5, t.alto - 0.25, teto))
    for (const lado of [-1, 1]) {
      const px = x + nx * lado * (t.meioL + 0.03), pz = z + nz * lado * (t.meioL + 0.03)
      L.neon.push(semUV(quadro(px, 2.9, pz, nx * lado, nz * lado, vag - 3, 1.1, janela)))
      L.neon.push(semUV(quadro(px, 1.3, pz, nx * lado, nz * lado, vag - 1, 0.22, faixa)))
    }
  }
  // os faróis nas duas pontas
  for (const s of [-1, 1]) {
    const x = t.c.x + ax * s * (t.meioC + 0.03), z = t.c.z + az * s * (t.meioC + 0.03)
    L.neon.push(semUV(quadro(x, 1.2, z, ax * s, az * s, t.meioL * 1.6, 0.4, QUENTE)))
  }
  return { concreto: fundir(L.concreto, false, true), neon: fundir(L.neon) }
}

function metro(L: Camadas) {
  const t = TREM, ax = t.ax, az = t.az, nx = -az, nz = ax // n: pra dentro do salão
  // os trilhos (saem pelas duas pontas até a parede) e a plataforma do lado de dentro
  for (const l of [-0.75, 0.75]) L.concreto.push(caixaAo(t.c.x + nx * l, t.c.z + nz * l, ax, az, t.meioC * 2 + 40, 0.18, 0.18, 0, C("#77708a")))
  const plat = 9
  L.concreto.push(caixaAo(t.c.x + nx * (t.meioL + 0.4 + plat / 2), t.c.z + nz * (t.meioL + 0.4 + plat / 2), ax, az, t.meioC * 2 + 6, plat, 0.06, 0, C("#4b4258")))
  L.neon.push(caixaAo(t.c.x + nx * (t.meioL + 1.3), t.c.z + nz * (t.meioL + 1.3), ax, az, t.meioC * 2 + 6, 0.35, 0.02, 0.07, C("#ffd23f")))
  // a placa, pendurada em cima da plataforma, virada pro salão
  L.atlas.push(quadro(t.c.x + nx * (t.meioL + 6), 9, t.c.z + nz * (t.meioL + 6), nx, nz, 16, 2, BRANCO, uvPlaca(PLACA_METRO)))
}

// um muro das trincheiras (o grafite vai por cima, nos dois lados)
function muro(m: Caixa, L: Camadas) {
  L.concreto.push(caixaAo(m.c.x, m.c.z, m.ax, m.az, m.meioC * 2, m.meioL * 2, m.alto, 0, PAREDE_COR))
  L.neon.push(caixaAo(m.c.x, m.c.z, m.ax, m.az, m.meioC * 2 + 0.1, m.meioL * 2 + 0.1, 0.12, m.alto, C("#ff3fb0")))
}

// a porta de entrada: escura, com o neon em volta; em cima, "↑ SUBÚRBIO"
function porta(p: Caixa, L: Camadas) {
  const nx = -p.az, nz = p.ax // pra dentro do salão (a porta está no fundo, "fora")
  const dentro = { x: p.c.x + nx * (p.meioL + 0.03), z: p.c.z + nz * (p.meioL + 0.03) }
  L.concreto.push(caixaAo(p.c.x, p.c.z, p.ax, p.az, p.meioC * 2, p.meioL * 2, p.alto, 0, C("#1b1426")))
  L.neon.push(semUV(quadro(dentro.x, 4.5, dentro.z, nx, nz, p.meioC * 2 - 3, 8.6, C("#3a2410"))))
  const neon = C("#ff3fb0")
  L.neon.push(semUV(quadro(dentro.x + p.ax * (p.meioC - 1.2), 4.6, dentro.z + p.az * (p.meioC - 1.2), nx, nz, 0.35, 9, neon)))
  L.neon.push(semUV(quadro(dentro.x - p.ax * (p.meioC - 1.2), 4.6, dentro.z - p.az * (p.meioC - 1.2), nx, nz, 0.35, 9, neon)))
  L.neon.push(semUV(quadro(dentro.x, 9.1, dentro.z, nx, nz, p.meioC * 2 - 2.1, 0.35, neon)))
  L.atlas.push(quadro(dentro.x + nx * 0.02, 11.2, dentro.z + nz * 0.02, nx, nz, 10, 1.25, BRANCO, uvPlaca(PLACA_PORTA)))
}

function fundir(geos: THREE.BufferGeometry[], comUV = false, normais = false) {
  if (!geos.length) return null
  const lista = comUV
    ? geos.map((g) => { const x = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(x.attributes)) if (!["position", "color", "uv"].includes(k)) x.deleteAttribute(k); return x })
    : geos.map(soPosCor)
  const g = mergeGeometries(lista, false)!
  if (normais) g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}
function fechar(L: Camadas, x: number, z: number, r: number): Pedaco {
  let poeira: THREE.BufferGeometry | null = null
  if (L.poeira.length) { poeira = new THREE.BufferGeometry(); poeira.setAttribute("position", new THREE.Float32BufferAttribute(L.poeira, 3)); poeira.computeBoundingSphere() }
  return {
    x, z, r,
    concreto: fundir(L.concreto, false, true), neon: fundir(L.neon), vidro: fundir(L.vidro), atlas: fundir(L.atlas, true),
    raizes: fundir(L.raizes, false, true), poeira,
  }
}

// o mapa inteiro, em pedaços (uma vez, ao descer)
export function montarPedacos(): Pedaco[] {
  const out: Pedaco[] = []
  for (const tr of TRECHOS_RIO) {
    const L = novas(), av = AVENIDAS[tr.av]
    trechoRio(av, tr.k0, tr.k1, L)
    for (const g of lugaresGrafite()) if (g.av === av.i && g.k >= tr.k0 && g.k < tr.k1 && !paredesLivres().includes(g)) L.atlas.push(quadro(g.x, g.y, g.z, g.nx, g.nz, g.w, g.h, C("#d8d0e8"), uvGrafite(g.slot)))
    const x = (tr.min.x + tr.max.x) / 2, z = (tr.min.z + tr.max.z) / 2
    out.push(fechar(L, x, z, Math.hypot(tr.max.x - tr.min.x, tr.max.z - tr.min.z) / 2 + MEIA + 4))
  }
  for (const s of SALOES) { const L = novas(); salao(s, L); out.push(fechar(L, s.c.x, s.c.z, s.r + 4)) }
  return out
}
