// O MUNDO DA CIDADE NOVA (motor do mapa livre, etapa 2): a rede de ruas
// (linha/rede) vira chão de verdade, em metros. Cada rua é amostrada a cada
// 4 m (posição, altura suavizada, direção); a expressa sobe nos pilares no
// trecho elevado; o relevo afunda debaixo das ruas pra nada atravessar o
// asfalto. Tudo sai daqui pra cena (Cidade.tsx) e pros mapas.

import * as THREE from "three"
import { ESCALA, H, W, altura, bairro, costa, type Bairro } from "../linha/rede/terreno"
import { montarRede, type Aresta, type Rede, type TipoVia } from "../linha/rede/rede"
import { LUGARES_CIDADE, type LugarCidade } from "./lugares"

export const ALT = 0.6 // metros de altura por unidade da maquete
export const MAR = 3
export const PASSO = 4
export const ELEVADA = 14
export const LARG: Record<TipoVia, number> = { expressa: 20, avenida: 16, orla: 16, principal: 12, rua: 9, beco: 6, tunel: 12, serpentina: 10, terra: 9, rampa: 9 }
export const VMAX: Record<TipoVia, number> = { expressa: 44, avenida: 28, orla: 28, principal: 20, rua: 15, beco: 9, tunel: 30, serpentina: 18, terra: 22, rampa: 18 }

// unidades da maquete → metros
export const mx = (x: number) => (x - W / 2) * ESCALA
export const mz = (y: number) => (y - H / 2) * ESCALA
export const ux = (X: number) => X / ESCALA + W / 2
export const uy = (Z: number) => Z / ESCALA + H / 2
export const chao = (x: number, y: number) => (y > costa(x) ? -6 : altura(x, y) * ALT)

// uma rua amostrada: x, y (alto), z e a distância acumulada
export interface Trilha { e: Aresta; n: number; px: Float32Array; py: Float32Array; pz: Float32Array; s: Float32Array; len: number; larg: number; calcada: boolean }

function amostrar(e: Aresta): Trilha {
  // reamostra a polilinha (em unidades) a cada PASSO metros
  const pts = e.pts.map(([x, y]) => [mx(x), mz(y), x, y] as [number, number, number, number])
  const xs: number[] = [], zs: number[] = [], us: [number, number][] = []
  let resto = 0
  xs.push(pts[0][0]); zs.push(pts[0][1]); us.push([pts[0][2], pts[0][3]])
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1])
    let t = PASSO - resto
    while (t <= d) { const f = t / d; xs.push(a[0] + (b[0] - a[0]) * f); zs.push(a[1] + (b[1] - a[1]) * f); us.push([a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f]); t += PASSO }
    resto = d - (t - PASSO)
  }
  const ult = pts[pts.length - 1]; xs.push(ult[0]); zs.push(ult[1]); us.push([ult[2], ult[3]])
  const n = xs.length
  // a altura: o chão, suavizado (sem degrau); no trecho elevado, os pilares
  const bruto = us.map(([x, y]) => Math.max(MAR + 0.5, chao(x, y)) + 0.3)
  const elev = us.map(([x]) => (e.elevada || (e.tipo === "expressa" && x > 600 && x < 1640) ? 1 : 0))
  const janela = e.tipo === "expressa" ? 30 : 8
  const py = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    let s = 0, k = 0, el = 0
    for (let j = Math.max(0, i - janela); j <= Math.min(n - 1, i + janela); j++) { s += bruto[j]; el += elev[j]; k++ }
    py[i] = s / k + (el / k) * ELEVADA
  }
  const s = new Float32Array(n)
  for (let i = 1; i < n; i++) s[i] = s[i - 1] + Math.hypot(xs[i] - xs[i - 1], zs[i] - zs[i - 1])
  return { e, n, px: Float32Array.from(xs), py, pz: Float32Array.from(zs), s, len: s[n - 1], larg: LARG[e.tipo], calcada: e.tipo !== "terra" && e.tipo !== "expressa" && e.tipo !== "rampa" && e.tipo !== "serpentina" }
}

// o ponto da rua a s metros do começo: posição e direção (de a pra b)
export function naTrilha(t: Trilha, s: number, pos: THREE.Vector3, dir: THREE.Vector3) {
  const c = Math.max(0, Math.min(t.len, s))
  let lo = 0, hi = t.n - 1
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t.s[m] <= c) lo = m; else hi = m }
  const f = (c - t.s[lo]) / Math.max(0.001, t.s[hi] - t.s[lo])
  pos.set(t.px[lo] + (t.px[hi] - t.px[lo]) * f, t.py[lo] + (t.py[hi] - t.py[lo]) * f, t.pz[lo] + (t.pz[hi] - t.pz[lo]) * f)
  dir.set(t.px[hi] - t.px[lo], t.py[hi] - t.py[lo], t.pz[hi] - t.pz[lo]).normalize()
}

// um lugar encostado na rua: o ponto da rua (onde a Kombi para) e a fachada
export interface PoseLugar { l: LugarCidade; t: number; i: number; X: number; Y: number; Z: number; fx: number; fz: number; ang: number; no: number }
export interface Mundo { rede: Rede; trilhas: Trilha[]; lugares: PoseLugar[] }
let cache: Mundo | null = null
export function montarMundo(): Mundo {
  if (cache) return cache
  const rede = montarRede()
  const trilhas = rede.arestas.map(amostrar)
  const lugares = LUGARES_CIDADE.map((l) => {
    const X = mx(l.x), Z = mz(l.y)
    let bt = 0, bi = 0, bd = Infinity
    trilhas.forEach((t, ti) => { if (t.e.tipo === "expressa" || t.e.tipo === "rampa") return; for (let i = 2; i < t.n - 2; i++) { const d = Math.hypot(t.px[i] - X, t.pz[i] - Z); if (d < bd) { bd = d; bt = ti; bi = i } } })
    const t = trilhas[bt], i = bi
    const dx = t.px[i + 1] - t.px[i - 1], dz = t.pz[i + 1] - t.pz[i - 1], k = Math.hypot(dx, dz) || 1, rx = -dz / k, rz = dx / k
    const off = l.lado * (t.larg / 2 + (t.calcada ? 3 : 1) + 10)
    // o cruzamento mais perto do lugar (o destino da rota)
    let no = rede.nos[0].id, dn = Infinity
    for (const n of rede.nos) { if (!n.arestas.includes(t.e.id)) continue; const d = Math.hypot(mx(n.x) - t.px[i], mz(n.y) - t.pz[i]); if (d < dn) { dn = d; no = n.id } }
    return { l, t: bt, i, X: t.px[i], Y: t.py[i], Z: t.pz[i], fx: t.px[i] + rx * off, fz: t.pz[i] + rz * off, ang: Math.atan2(-rx * l.lado, -rz * l.lado), no }
  })
  cache = { rede, trilhas, lugares }
  return cache
}

// ── a grade de busca: os pontos de rua perto de um lugar ──
const CEL = 64
function grade(m: Mundo) {
  const g = new Map<string, { t: number; i: number }[]>()
  m.trilhas.forEach((t, ti) => { for (let i = 0; i < t.n; i++) { const k = `${Math.floor(t.px[i] / CEL)},${Math.floor(t.pz[i] / CEL)}`; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push({ t: ti, i }) } })
  return g
}
export function ruaPerto(m: Mundo, g: ReturnType<typeof grade>, X: number, Z: number, raio: number) {
  let melhor: { t: number; i: number; d: number } | null = null
  const cx = Math.floor(X / CEL), cz = Math.floor(Z / CEL), r = Math.ceil(raio / CEL)
  for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
    for (const p of g.get(`${cx + a},${cz + b}`) ?? []) {
      const t = m.trilhas[p.t], d = Math.hypot(t.px[p.i] - X, t.pz[p.i] - Z) - t.larg / 2
      if (d < raio && (!melhor || d < melhor.d)) melhor = { ...p, d }
    }
  }
  return melhor
}

// ── o relevo: a grade de altura, afundada debaixo das ruas ──
export function geoRelevo(m: Mundo, segX = 260, segZ = 182) {
  const g = grade(m)
  const geo = new THREE.PlaneGeometry(W * ESCALA, H * ESCALA, segX, segZ); geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position, cor = new Float32Array(pos.count * 3)
  const COR: Record<Bairro, [number, number, number]> = { cidade: [0.2, 0.17, 0.3], suburbio: [0.42, 0.3, 0.2], mirante: [0.25, 0.38, 0.22], arena: [0.48, 0.3, 0.16], deserto: [0.72, 0.52, 0.3], campo: [0.3, 0.36, 0.2], orla: [0.82, 0.74, 0.55], mar: [0.15, 0.4, 0.5] }
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Z = pos.getZ(i), x = ux(X), y = uy(Z)
    let h = chao(x, y)
    const r = ruaPerto(m, g, X, Z, 46)
    if (r) { const t = m.trilhas[r.t]; const elev = t.py[r.i] - (Math.max(MAR + 0.5, chao(ux(t.px[r.i]), uy(t.pz[r.i]))) + 0.3) > 4; if (!elev) h = Math.min(h, t.py[r.i] - 0.9 - Math.max(0, r.d) * 0.02) }
    pos.setY(i, h)
    const c = COR[bairro(x, y)]
    const n = 0.85 + ((Math.sin(X * 0.013) + Math.cos(Z * 0.011)) * 0.5 + 1) * 0.08
    cor[i * 3] = c[0] * n; cor[i * 3 + 1] = c[1] * n; cor[i * 3 + 2] = c[2] * n
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3)); geo.computeVertexNormals()
  return { geo, grade: g }
}

// ── as ruas viram fitas: o asfalto, as calçadas, a faixa do meio ──
export function geoRuas(m: Mundo) {
  const asf: number[] = [], calc: number[] = [], faixa: number[] = [], muro: number[] = []
  const quad = (arr: number[], a: number[], b: number[], c: number[], d: number[]) => arr.push(...a, ...b, ...c, ...b, ...d, ...c)
  for (const t of m.trilhas) {
    const L = t.larg / 2
    for (let i = 0; i < t.n - 1; i++) {
      const dx = t.px[i + 1] - t.px[i], dz = t.pz[i + 1] - t.pz[i], k = Math.hypot(dx, dz) || 1, rx = -dz / k, rz = dx / k
      const P = (j: number, o: number, dy = 0) => [t.px[j] + rx * o, t.py[j] + dy, t.pz[j] + rz * o]
      quad(asf, P(i, -L), P(i, L), P(i + 1, -L), P(i + 1, L))
      if (t.calcada) for (const lado of [-1, 1]) quad(calc, P(i, lado * L), P(i, lado * (L + 3), 0.22), P(i + 1, lado * L), P(i + 1, lado * (L + 3), 0.22))
      // a faixa tracejada no meio (a cada 12 m acende 6)
      if (t.e.tipo !== "beco" && t.e.tipo !== "terra" && Math.floor(t.s[i] / 6) % 2 === 0) quad(faixa, P(i, -0.15, 0.04), P(i, 0.15, 0.04), P(i + 1, -0.15, 0.04), P(i + 1, 0.15, 0.04))
      // a mureta da expressa elevada
      const alto = t.e.tipo === "expressa" || t.e.tipo === "rampa"
      if (alto) for (const lado of [-1, 1]) quad(muro, P(i, lado * L, 0), P(i, lado * L, 1.1), P(i + 1, lado * L, 0), P(i + 1, lado * L, 1.1))
    }
  }
  const mk = (a: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); g.computeVertexNormals(); return g }
  return { asfalto: mk(asf), calcada: mk(calc), faixa: mk(faixa), muro: mk(muro) }
}

// ── as construções e os postes, ao longo das ruas, sem cair em cima de rua ──
export interface Lote { x: number; y: number; z: number; w: number; h: number; d: number; a: number; tipo: "torre" | "casa" | "galpao"; cor: number }
export function lotes(m: Mundo, g: ReturnType<typeof grade>) {
  let sem = 17
  const rnd = () => ((sem = (sem * 16807) % 2147483647) / 2147483647)
  const out: Lote[] = [], postes: { x: number; y: number; z: number; a: number; cor: number }[] = [], pilares: { x: number; y: number; z: number; h: number }[] = []
  const ocup = new Set<string>()
  for (const t of m.trilhas) {
    const bz = t.e.bairro, cid = bz === "cidade", sub = bz === "suburbio", are = bz === "arena", orl = bz === "orla", mir = bz === "mirante"
    const passo = cid ? 7 : sub ? 3 : are ? 8 : orl ? 9 : mir ? 14 : 0
    for (let i = 2; i < t.n - 2; i++) {
      const dx = t.px[i + 1] - t.px[i - 1], dz = t.pz[i + 1] - t.pz[i - 1], k = Math.hypot(dx, dz) || 1, rx = -dz / k, rz = dx / k
      const ang = Math.atan2(dx, dz)
      // os pilares da expressa elevada
      const solo = Math.max(MAR, chao(ux(t.px[i]), uy(t.pz[i])))
      if ((t.e.tipo === "expressa" || t.e.tipo === "rampa") && t.py[i] - solo > 5 && i % 10 === 0) pilares.push({ x: t.px[i], y: solo, z: t.pz[i], h: t.py[i] - solo })
      // os postes (não no deserto)
      if (bz !== "deserto" && bz !== "campo" && i % 9 === 0) for (const lado of [-1, 1]) {
        const o = lado * (t.larg / 2 + 1.5)
        postes.push({ x: t.px[i] + rx * o, y: t.py[i] + 0.2, z: t.pz[i] + rz * o, a: ang + (lado > 0 ? 0 : Math.PI), cor: cid ? 0 : sub ? 1 : 2 })
      }
      if (!passo || i % passo !== 0 || t.e.tipo === "expressa" || t.e.tipo === "rampa") continue
      for (const lado of [-1, 1]) {
        const w = cid ? 14 + rnd() * 12 : sub ? 6 + rnd() * 4 : are ? 18 + rnd() * 10 : 9 + rnd() * 6
        const off = t.larg / 2 + (t.calcada ? 3.5 : 1.5) + w / 2 + rnd() * 2
        const X = t.px[i] + rx * off * lado, Z = t.pz[i] + rz * off * lado
        const ck = `${Math.floor(X / 10)},${Math.floor(Z / 10)}`
        if (ocup.has(ck)) continue
        // a fachada de um lugar fica livre
        if (m.lugares.some((p) => Math.hypot(p.fx - X, p.fz - Z) < 24 + w / 2)) continue
        const perto = ruaPerto(m, g, X, Z, w * 0.75 + 2)
        if (perto && perto.d < w * 0.6) continue
        ocup.add(ck)
        const yb = chao(ux(X), uy(Z))
        if (yb < MAR + 0.3) continue
        const centro = Math.max(0, 1 - Math.hypot(ux(X) - 1000, uy(Z) - 590) / 420)
        const h = cid ? 14 + rnd() * rnd() * 50 + centro * (30 + rnd() * 90) : sub ? 4 + rnd() * 7 : are ? 8 + rnd() * 14 : 5 + rnd() * 6
        out.push({ x: X, y: Math.min(yb, t.py[i]) - 1, z: Z, w, h, d: cid ? w : w * (0.8 + rnd() * 0.5), a: ang, tipo: cid ? "torre" : are ? "galpao" : "casa", cor: rnd() })
      }
    }
  }
  return { lotes: out, postes, pilares }
}

// o que é cada lugar, pro HUD
export const NOME_BAIRRO: Record<Bairro, string> = { cidade: "a cidade neon", suburbio: "o subúrbio", mirante: "o mirante", arena: "a arena", deserto: "o deserto", orla: "a orla", campo: "a estrada", mar: "a orla" }
// o clima de cada área (o céu e a névoa da noite)
export const CLIMA: Record<Bairro, { ceu: string; nevoa: string; perto: number; longe: number }> = {
  cidade: { ceu: "#1a0b33", nevoa: "#3a1f5f", perto: 120, longe: 1400 },
  suburbio: { ceu: "#1a0f08", nevoa: "#3a2414", perto: 60, longe: 900 },
  mirante: { ceu: "#120a2e", nevoa: "#2a2050", perto: 200, longe: 2600 },
  arena: { ceu: "#1a0606", nevoa: "#4a1a10", perto: 100, longe: 1500 },
  deserto: { ceu: "#2a1206", nevoa: "#6a3a1a", perto: 300, longe: 4200 },
  orla: { ceu: "#0a2030", nevoa: "#1a4a5a", perto: 200, longe: 2600 },
  campo: { ceu: "#141024", nevoa: "#2a2440", perto: 150, longe: 2000 },
  mar: { ceu: "#0a2030", nevoa: "#1a4a5a", perto: 200, longe: 2600 },
}
