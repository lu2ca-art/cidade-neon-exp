// As malhas da corrida (T13), montadas uma vez: os portões (um desenho cada),
// o trilho do grind (um desenho) e os corredores dos rivais e do fantasma
// (um desenho cada: o corpo e o veículo fundidos numa malha só).

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { Portao, Veiculo } from "./corrida"
import { AVENIDAS, CURVA, LEITO, SALOES, SUBIDA_MAX, TETO, type P2 } from "./mapa"

// a altura de verdade da parede curva a "e" metros do leito (sem o limite)
const alturaParede = (e: number) => (e <= 0 ? 0 : CURVA - Math.sqrt(Math.max(0, CURVA * CURVA - e * e)))
export const TRILHO_E = SUBIDA_MAX - 0.05
export const TRILHO_Y = alturaParede(TRILHO_E)

// ── o portão: o contorno do túnel (o leito, as curvas e as paredes), em neon ──
const ALTO = TETO - 3, LARG = 0.7
function contorno(): [number, number][] {
  const m: [number, number][] = []
  const dentro = 0.35
  m.push([LEITO + CURVA - dentro, ALTO])
  for (let j = 7; j >= 0; j--) {
    const f = (j / 7) * (Math.PI / 2)
    m.push([LEITO + (CURVA - dentro) * Math.sin(f), 0.06 + (CURVA - dentro) * (1 - Math.cos(f))])
  }
  const esq = m.map(([l, y]) => [-l, y] as [number, number]).reverse()
  return [...esq, ...m, [-LEITO, 0.06]] // a esquerda sobe, a barra de cima, a direita desce, o leito volta
}
export function geoPortao(p: Portao): THREE.BufferGeometry {
  const c = contorno(), pos: number[] = [], idx: number[] = []
  const cx = 0, cy = ALTO / 2
  for (let i = 0; i < c.length - 1; i++) {
    const [l0, y0] = c[i], [l1, y1] = c[i + 1]
    let ml = -(y1 - y0), my = l1 - l0
    const L = Math.hypot(ml, my) || 1; ml /= L; my /= L
    // a faixa cresce pra dentro do túnel (pro meio da seção)
    if (ml * (cx - l0) + my * (cy - y0) < 0) { ml = -ml; my = -my }
    const q = [[l0, y0], [l1, y1], [l1 + ml * LARG, y1 + my * LARG], [l0 + ml * LARG, y0 + my * LARG]]
    const b = pos.length / 3
    for (const [l, y] of q) pos.push(p.x + p.lx * l, y, p.z + p.lz * l)
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

// ── o trilho do grind: na beira de cima da parede curva, dos dois lados de cada rio ──
export function geoTrilho(): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = []
  const e0 = TRILHO_E - 0.3, e1 = TRILHO_E + 0.12
  const y0 = alturaParede(e0) + 0.03, y1 = alturaParede(e1) + 0.03
  for (const av of AVENIDAS) {
    const pts = av.pts, n = pts.length
    const fora = (p: P2) => SALOES.every((t) => Math.hypot(p.x - t.c.x, p.z - t.c.z) > t.r + 2)
    let k0 = 0, k1 = n - 1
    while (k0 < k1 && !fora(pts[k0])) k0++
    while (k1 > k0 && !fora(pts[k1])) k1--
    for (const s of [-1, 1]) {
      const base = pos.length / 3
      for (let k = k0; k <= k1; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1
        const nx = (-(b.z - a.z) / L) * s, nz = ((b.x - a.x) / L) * s, p = pts[k]
        pos.push(p.x + nx * (LEITO + e0), y0, p.z + nz * (LEITO + e0), p.x + nx * (LEITO + e1), y1, p.z + nz * (LEITO + e1))
        if (k < k1) { const i = base + (k - k0) * 2; idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3) }
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

// ── o corredor dos rivais e do fantasma: corpo + veículo numa malha só ──
function pintar(g: THREE.BufferGeometry, cor: THREE.Color) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { c[i * 3] = cor.r; c[i * 3 + 1] = cor.g; c[i * 3 + 2] = cor.b }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3))
  g.deleteAttribute("uv")
  return g
}
const caixa = (w: number, h: number, d: number, x: number, y: number, z: number, cor: THREE.Color, rx = 0) => {
  const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); return pintar(g, cor)
}
const roda = (r: number, x: number, y: number, z: number, cor: THREE.Color, largura = 0.05) => {
  const g = new THREE.CylinderGeometry(r, r, largura, 12); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return pintar(g, cor)
}

export function geoCorredor(veiculo: Veiculo, corHex: string): THREE.BufferGeometry {
  const cor = new THREE.Color(corHex), escuro = new THREE.Color("#1b1530"), pele = new THREE.Color("#5a3a26"), branco = new THREE.Color("#f2eefa")
  const neon = cor.clone().lerp(branco, 0.35)
  const g: THREE.BufferGeometry[] = []
  const cabeca = (y: number, z = 0) => { const s = new THREE.SphereGeometry(0.15, 10, 8); s.translate(0, y, z); g.push(pintar(s, pele)); g.push(caixa(0.32, 0.07, 0.32, 0, y + 0.11, z, escuro)) }
  if (veiculo === "moto") {
    // a moto: pneus grossos, o tanque e o banco, o paralama alto; o piloto de capacete
    g.push(roda(0.38, 0, 0.38, 0.66, escuro, 0.16), roda(0.38, 0, 0.38, -0.62, escuro, 0.16))
    g.push(roda(0.18, 0, 0.38, 0.66, neon, 0.17), roda(0.18, 0, 0.38, -0.62, neon, 0.17))
    g.push(caixa(0.2, 0.3, 0.5, 0, 0.5, 0, escuro), caixa(0.32, 0.2, 0.42, 0, 0.82, 0.18, cor), caixa(0.22, 0.08, 0.6, 0, 0.86, -0.32, escuro))
    g.push(caixa(0.2, 0.03, 0.42, 0, 0.8, -0.78, cor, 0.35), caixa(0.06, 0.9, 0.06, 0, 0.75, 0.55, branco, -0.42), caixa(0.7, 0.04, 0.04, 0, 1.25, 0.38, escuro))
    g.push(caixa(0.26, 0.22, 0.03, 0, 1.15, 0.5, branco, -0.35))
    g.push(caixa(0.13, 0.7, 0.15, -0.2, 0.78, -0.05, escuro, 0.25), caixa(0.13, 0.7, 0.15, 0.2, 0.78, -0.05, escuro, 0.25))
    g.push(caixa(0.42, 0.58, 0.26, 0, 1.38, 0.08, cor, 0.6))
    g.push(caixa(0.1, 0.48, 0.1, -0.28, 1.38, 0.34, cor, 1.15), caixa(0.1, 0.48, 0.1, 0.28, 1.38, 0.34, cor, 1.15))
    const cap = new THREE.SphereGeometry(0.19, 10, 8); cap.translate(0, 1.8, 0.3); g.push(pintar(cap, branco))
    g.push(caixa(0.24, 0.08, 0.08, 0, 1.82, 0.46, neon))
  } else if (veiculo === "bmx") {
    // a bicicleta: duas rodas, o quadro e o guidão; o piloto em pé nos pedais
    g.push(roda(0.3, 0, 0.3, 0.52, escuro, 0.06), roda(0.3, 0, 0.3, -0.5, escuro, 0.06))
    g.push(roda(0.12, 0, 0.3, 0.52, neon, 0.07), roda(0.12, 0, 0.3, -0.5, neon, 0.07))
    g.push(caixa(0.05, 0.05, 0.95, 0, 0.42, 0, cor, -0.15), caixa(0.05, 0.4, 0.05, 0, 0.55, 0.45, cor), caixa(0.6, 0.04, 0.04, 0, 0.78, 0.42, escuro))
    g.push(caixa(0.4, 0.55, 0.24, 0, 1.25, 0.1, cor, 0.5)) // tronco inclinado pra frente
    g.push(caixa(0.12, 0.6, 0.12, -0.14, 0.75, 0.0, escuro), caixa(0.12, 0.6, 0.12, 0.14, 0.75, 0.0, escuro))
    g.push(caixa(0.1, 0.45, 0.1, -0.22, 1.05, 0.32, cor, 0.9), caixa(0.1, 0.45, 0.1, 0.22, 1.05, 0.32, cor, 0.9))
    cabeca(1.55, 0.3)
  } else {
    if (veiculo === "skate") {
      // o shape e as rodas; o corpo de lado, base aberta
      g.push(caixa(0.26, 0.04, 0.86, 0, 0.13, 0, cor))
      for (const z of [-0.28, 0.28]) for (const x of [-0.1, 0.1]) g.push(roda(0.05, x, 0.06, z, neon, 0.05))
      g.push(caixa(0.13, 0.78, 0.15, 0, 0.55, -0.22, escuro), caixa(0.13, 0.78, 0.15, 0, 0.55, 0.22, escuro))
    } else {
      // os patins: as duas pernas com a bota e as rodas
      for (const x of [-0.13, 0.13]) {
        g.push(caixa(0.15, 0.8, 0.17, x, 0.58, 0, escuro), caixa(0.16, 0.16, 0.32, x, 0.14, 0.05, branco))
        for (const z of [-0.08, 0.04, 0.16]) g.push(roda(0.035, x, 0.04, z, neon, 0.05))
      }
    }
    g.push(caixa(0.44, 0.62, 0.26, 0, 1.28, 0, cor))
    g.push(caixa(0.1, 0.55, 0.1, -0.3, 1.25, 0, cor), caixa(0.1, 0.55, 0.1, 0.3, 1.25, 0, cor))
    cabeca(1.74)
  }
  const m = mergeGeometries(g.map((x) => (x.index ? x.toNonIndexed() : x)), false)!
  m.computeVertexNormals()
  m.computeBoundingSphere()
  return m
}
