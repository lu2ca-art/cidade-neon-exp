// A REDE DE RUAS (o mapa livre, decisão do LU2CA em 15/10): as vias do
// diorama v5 viram um grafo de verdade. Cruzamento é onde duas ruas do mesmo
// nível se encontram (a expressa é elevada sobre a cidade e o subúrbio: só
// liga nas rampas). Todas as ruas são de mão dupla; nas retas compridas há
// RETORNOS pra voltar sem dar a volta no mapa. Você marca o destino e a rota
// (o caminho mais curto) leva até lá — não tem bifurcação pra escolher.

import { ESCALA, altura, bairro, costa, type Bairro } from "./terreno"

export type TipoVia = "expressa" | "avenida" | "orla" | "principal" | "rua" | "beco" | "tunel" | "serpentina" | "terra" | "rampa"
type P2 = [number, number]
interface ViaDef { id: string; tipo: TipoVia; pts: P2[]; fechada?: boolean; elevada?: [number, number] } // elevada: trecho em x

// velocidade de cruzeiro de cada tipo (m/s) — pra estimar o tempo da rota
export const VEL: Record<TipoVia, number> = { expressa: 32, avenida: 20, orla: 20, principal: 15, rua: 11, beco: 7, tunel: 22, serpentina: 13, terra: 15, rampa: 14 }

const orla: P2[] = []
for (let x = 900; x <= 1980; x += 40) orla.push([x, costa(x) - 58])

export const VIAS: ViaDef[] = [
  // a via expressa: chão no deserto, elevada da cidade até a arena
  { id: "expressa", tipo: "expressa", pts: [[0, 700], [260, 690], [520, 650], [760, 610], [1010, 575], [1240, 610], [1420, 700], [1560, 810], [1700, 920]], elevada: [600, 1640] },
  { id: "desce-orla", tipo: "avenida", pts: [[1700, 920], [1740, 950], [1780, costa(1780) - 58]] },
  { id: "orla", tipo: "orla", pts: orla },
  // a cidade: o anel e as duas diagonais
  { id: "anel", tipo: "avenida", pts: [[700, 560], [800, 420], [1010, 370], [1220, 430], [1330, 560], [1260, 760], [1010, 830], [780, 760]], fechada: true },
  { id: "diagonal-1", tipo: "avenida", pts: [[800, 420], [920, 600], [1010, 830]] },
  { id: "diagonal-2", tipo: "avenida", pts: [[1220, 430], [1100, 620], [780, 760]] },
  { id: "centro-1", tipo: "rua", pts: [[800, 420], [900, 480], [1010, 500], [1100, 470], [1220, 430]] },
  { id: "centro-2", tipo: "rua", pts: [[1010, 370], [1010, 500], [1060, 560]] },
  { id: "centro-3", tipo: "rua", pts: [[700, 560], [820, 650], [940, 700], [1060, 700], [1180, 680], [1330, 560]] },
  // as rampas da expressa
  { id: "rampa-oeste", tipo: "rampa", pts: [[760, 610], [730, 590], [700, 560]] },
  { id: "rampa-leste", tipo: "rampa", pts: [[1240, 610], [1290, 590], [1330, 560]] },
  { id: "rampa-arena", tipo: "rampa", pts: [[1560, 810], [1565, 790], [1570, 770]] },
  // o subúrbio: a principal descendo até a orla e os becos
  { id: "principal", tipo: "principal", pts: [[780, 760], [700, 880], [760, 1000], [900, 1050], [1060, 1120], [1120, 1210]] },
  { id: "principal-2", tipo: "principal", pts: [[1010, 830], [1000, 950], [1080, 1060], [1060, 1120]] },
  { id: "rua-do-bar", tipo: "rua", pts: [[520, 660], [520, 760], [560, 860], [640, 920], [700, 960], [760, 1000]] },
  { id: "rua-da-feira", tipo: "rua", pts: [[760, 1000], [720, 1080], [800, 1140], [900, 1150]] },
  { id: "beco-1", tipo: "beco", pts: [[900, 1050], [920, 1110], [900, 1150]] },
  { id: "beco-2", tipo: "beco", pts: [[640, 920], [600, 1010], [660, 1080], [720, 1080]] },
  { id: "beco-3", tipo: "beco", pts: [[1060, 1120], [980, 1180], [900, 1150]] },
  { id: "beco-4", tipo: "beco", pts: [[1000, 950], [900, 980], [800, 940], [700, 880]] },
  // a arena e o mirante
  { id: "arena", tipo: "avenida", pts: [[1260, 760], [1380, 840], [1500, 780], [1570, 770]] },
  { id: "arena-volta", tipo: "rua", pts: [[1570, 770], [1620, 720], [1680, 780], [1620, 840]], fechada: true },
  { id: "tunel", tipo: "tunel", pts: [[1330, 560], [1400, 500], [1450, 440]] },
  { id: "serpentina", tipo: "serpentina", pts: [[1450, 440], [1530, 430], [1470, 390], [1580, 370], [1500, 330], [1620, 320], [1560, 285], [1640, 270], [1610, 300]] },
  // o deserto: o zigue-zague até a prisão e a estrada da casa da D-Bee
  { id: "prisao", tipo: "terra", pts: [[260, 690], [230, 620], [300, 590], [200, 540], [280, 500], [170, 460], [240, 420], [140, 390], [120, 360]] },
  { id: "dbee", tipo: "terra", pts: [[260, 690], [210, 840], [130, 960], [110, 990]] },
]

// ── geometria ──
function spline(pts: P2[], fechada: boolean, passo = 8): P2[] {
  const n = pts.length, out: P2[] = []
  const at = (i: number) => (fechada ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))])
  const segs = fechada ? n : n - 1
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
    const k = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / passo))
    for (let s = 0; s < k; s++) {
      const t = s / k, t2 = t * t, t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(fechada ? out[0] : pts[n - 1])
  return out
}
function cruza(a: P2, b: P2, c: P2, d: P2): number | null {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0]
  if (Math.abs(den) < 1e-9) return null
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999 ? t : null
}

// ── o grafo ──
export interface No { id: number; x: number; y: number; arestas: number[] }
export interface Aresta { id: number; via: string; tipo: TipoVia; a: number; b: number; pts: P2[]; m: number; elevada: boolean; bairro: Bairro }
export interface Retorno { aresta: number; f: number; x: number; y: number }
export interface Rede { nos: No[]; arestas: Aresta[]; retornos: Retorno[] }

const elevadoEm = (v: ViaDef, p: P2) => !!v.elevada && p[0] > v.elevada[0] && p[0] < v.elevada[1]

let cache: Rede | null = null
export function montarRede(): Rede {
  if (cache) return cache
  const linhas = VIAS.map((v) => ({ v, pts: spline(v.pts, !!v.fechada) }))
  // os cortes de cada via: índices (com fração) onde vira nó
  const cortes = linhas.map((l) => [{ i: 0, p: l.pts[0] }, { i: l.pts.length - 1, p: l.pts[l.pts.length - 1] }] as { i: number; p: P2 }[])
  // 1) cruzamentos no meio, só entre ruas do mesmo nível
  for (let A = 0; A < linhas.length; A++) for (let B = A + 1; B < linhas.length; B++) {
    const la = linhas[A], lb = linhas[B]
    for (let i = 0; i < la.pts.length - 1; i++) for (let j = 0; j < lb.pts.length - 1; j++) {
      const t = cruza(la.pts[i], la.pts[i + 1], lb.pts[j], lb.pts[j + 1]); if (t === null) continue
      const p: P2 = [la.pts[i][0] + (la.pts[i + 1][0] - la.pts[i][0]) * t, la.pts[i][1] + (la.pts[i + 1][1] - la.pts[i][1]) * t]
      if (elevadoEm(la.v, p) !== elevadoEm(lb.v, p)) continue // viaduto: passa por cima
      cortes[A].push({ i: i + t, p }); cortes[B].push({ i: j + 0.5, p })
    }
  }
  // 2) as pontas de cada via encostam na rua mais perto (vira um T), em qualquer nível (as rampas)
  linhas.forEach((la, A) => {
    for (const ponta of [la.pts[0], la.pts[la.pts.length - 1]]) {
      let melhor: { B: number; i: number; d: number; p: P2 } | null = null
      linhas.forEach((lb, B) => {
        if (B === A) return
        lb.pts.forEach((q, i) => { const d = Math.hypot(q[0] - ponta[0], q[1] - ponta[1]); if (d < 22 && (!melhor || d < melhor.d)) melhor = { B, i, d, p: q } })
      })
      if (melhor) { const m = melhor as { B: number; i: number; d: number; p: P2 }; cortes[m.B].push({ i: m.i, p: m.p }) }
    }
  })
  // 3) os nós: pontos de corte próximos viram o mesmo nó
  const nos: No[] = []
  const no = (p: P2) => {
    for (const n of nos) if (Math.hypot(n.x - p[0], n.y - p[1]) < 24) return n.id
    nos.push({ id: nos.length, x: p[0], y: p[1], arestas: [] }); return nos.length - 1
  }
  const arestas: Aresta[] = []
  linhas.forEach((l, A) => {
    const cs = [...cortes[A]].sort((a, b) => a.i - b.i).filter((c, k, arr) => k === 0 || c.i - arr[k - 1].i > 1.5)
    for (let k = 0; k < cs.length - 1; k++) {
      const i0 = cs[k].i, i1 = cs[k + 1].i
      const pts: P2[] = [cs[k].p, ...l.pts.slice(Math.ceil(i0 + 0.01), Math.floor(i1) + 1), cs[k + 1].p]
      let m = 0; for (let q = 1; q < pts.length; q++) m += Math.hypot(pts[q][0] - pts[q - 1][0], pts[q][1] - pts[q - 1][1])
      const a = no(cs[k].p), b = no(cs[k + 1].p)
      if (a === b && m < 40) continue
      const meio = pts[Math.floor(pts.length / 2)]
      const e: Aresta = { id: arestas.length, via: l.v.id, tipo: l.v.tipo, a, b, pts, m: m * ESCALA, elevada: elevadoEm(l.v, meio), bairro: bairro(meio[0], meio[1]) }
      arestas.push(e); nos[a].arestas.push(e.id); if (b !== a) nos[b].arestas.push(e.id)
    }
  })
  // 4) os retornos: nas retas compridas, um a cada ~800 m
  const retornos: Retorno[] = []
  for (const e of arestas) {
    if (e.m < 1000 || e.tipo === "beco" || e.tipo === "serpentina") continue
    const n = Math.floor(e.m / 800)
    for (let k = 1; k <= n; k++) { const f = k / (n + 1), p = pontoEm(e, f); retornos.push({ aresta: e.id, f, x: p[0], y: p[1] }) }
  }
  cache = { nos, arestas, retornos }
  return cache
}

// o ponto a uma fração do comprimento da aresta
export function pontoEm(e: Aresta, f: number): P2 {
  const alvo = (f * e.m) / ESCALA
  let acc = 0
  for (let i = 1; i < e.pts.length; i++) {
    const d = Math.hypot(e.pts[i][0] - e.pts[i - 1][0], e.pts[i][1] - e.pts[i - 1][1])
    if (acc + d >= alvo) { const t = (alvo - acc) / (d || 1); return [e.pts[i - 1][0] + (e.pts[i][0] - e.pts[i - 1][0]) * t, e.pts[i - 1][1] + (e.pts[i][1] - e.pts[i - 1][1]) * t] }
    acc += d
  }
  return e.pts[e.pts.length - 1]
}

export function noMaisPerto(r: Rede, x: number, y: number) {
  let m = r.nos[0], d = Infinity
  for (const n of r.nos) { const k = Math.hypot(n.x - x, n.y - y); if (n.arestas.length && k < d) { d = k; m = n } }
  return m
}

// a rota: o caminho mais RÁPIDO (Dijkstra pelo tempo) de um nó até outro
export function rota(r: Rede, de: number, ate: number): { arestas: number[]; nos: number[]; seg: number; m: number } | null {
  const dist = new Float64Array(r.nos.length).fill(Infinity), ant = new Int32Array(r.nos.length).fill(-1), pela = new Int32Array(r.nos.length).fill(-1)
  const feito = new Uint8Array(r.nos.length)
  dist[de] = 0
  for (;;) {
    let u = -1, du = Infinity
    for (let i = 0; i < r.nos.length; i++) if (!feito[i] && dist[i] < du) { du = dist[i]; u = i }
    if (u < 0 || u === ate) break
    feito[u] = 1
    for (const ei of r.nos[u].arestas) {
      const e = r.arestas[ei], v = e.a === u ? e.b : e.a, t = e.m / VEL[e.tipo]
      if (dist[u] + t < dist[v]) { dist[v] = dist[u] + t; ant[v] = u; pela[v] = ei }
    }
  }
  if (!isFinite(dist[ate])) return null
  const arestas: number[] = [], nos: number[] = [ate]
  let m = 0
  for (let v = ate; v !== de; v = ant[v]) { arestas.unshift(pela[v]); nos.unshift(ant[v]); m += r.arestas[pela[v]].m }
  return { arestas, nos, seg: dist[ate], m }
}

export const alturaM = (x: number, y: number) => altura(x, y) * 0.5 // metros, achatada pro jogo
