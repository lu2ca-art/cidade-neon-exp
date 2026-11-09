// OS LEGUMES DA FEIRA: desenhos nossos, em poucos triângulos. Cada um é um perfil
// girado no eixo Y; o cortado é o mesmo perfil pela metade, com a cara do corte
// colorida por dentro (o miolo é a graça). Sem textura e sem luz: a sombra e o
// brilho são assados na cor do vértice. `aTinta` diz o que a cor da instância
// pinta (o pimentão colorido: a casca e a parede).

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { ItemFeiraId } from "./feira"

type Cor = [number, number, number]
interface Molde {
  r: number[]; y: number[]
  casca: (t: number, ang: number) => Cor
  miolo: (zn: number, t: number) => Cor
  lobos?: number
  tinta?: number
}
const hex = (n: number): Cor => [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
const mix = (a: Cor, b: Cor, k: number): Cor => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]
const luz = (c: Cor, k: number): Cor => [c[0] * k, c[1] * k, c[2] * k]

const SEGS = 14
function casca(m: Molde, ph0: number, phiLen: number): THREE.BufferGeometry {
  const P: number[] = [], C: number[] = [], T: number[] = []
  const n = m.r.length
  const yMin = Math.min(...m.y), yMax = Math.max(...m.y), rMax = Math.max(...m.r)
  const lobo = (a: number) => (m.lobos ? 1 + 0.13 * Math.cos(a * m.lobos) : 1)
  const ponto = (i: number, a: number): [number, number, number, Cor] => {
    const r = m.r[i] * lobo(a), x = Math.cos(a) * r, z = Math.sin(a) * r, y = m.y[i]
    const t = (y - yMin) / (yMax - yMin || 1)
    // a sombra assada: mais clara em cima e do lado de fora, um brilho no alto
    const sombra = 0.62 + 0.4 * t + 0.16 * (x / (rMax || 1)) - 0.08 * (z / (rMax || 1))
    const brilho = i >= n - 3 && Math.abs(a - 2.3) < 0.7 ? 1.18 : 1
    return [x, y, z, luz(m.casca(t, a), Math.min(1.35, sombra * brilho))]
  }
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < SEGS; k++) {
    const a0 = ph0 + (phiLen * k) / SEGS, a1 = ph0 + (phiLen * (k + 1)) / SEGS
    const q = [ponto(i, a0), ponto(i, a1), ponto(i + 1, a1), ponto(i + 1, a0)]
    for (const j of [0, 1, 2, 0, 2, 3]) { const v = q[j]; P.push(v[0], v[1], v[2]); C.push(...v[3]); T.push(m.tinta ?? 0) }
  }
  return comAtributos(P, C, T)
}
function comAtributos(P: number[], C: number[], T: number[]) {
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3))
  g.setAttribute("aTinta", new THREE.Float32BufferAttribute(T, 1))
  return g
}
// a cara do corte (plano x = 0, virada pra +x): faixas ao longo do perfil
function cara(m: Molde): THREE.BufferGeometry {
  const P: number[] = [], C: number[] = [], T: number[] = []
  const COL = 8
  const yMin = Math.min(...m.y), yMax = Math.max(...m.y)
  const tDe = (y: number) => (y - yMin) / (yMax - yMin || 1)
  for (let i = 0; i < m.r.length - 1; i++) for (let k = 0; k < COL; k++) {
    const zn0 = -1 + (2 * k) / COL, zn1 = -1 + (2 * (k + 1)) / COL
    const pts: [number, number][] = [[m.r[i], m.y[i]], [m.r[i + 1], m.y[i + 1]]]
    const q: [number, number, number][] = [[zn0, pts[0][0], pts[0][1]], [zn1, pts[0][0], pts[0][1]], [zn1, pts[1][0], pts[1][1]], [zn0, pts[1][0], pts[1][1]]]
    for (const j of [0, 1, 2, 0, 2, 3]) {
      const [zn, r, y] = q[j]
      P.push(0, y, zn * r); C.push(...m.miolo(zn, tDe(y))); T.push(m.tinta ?? 0)
    }
  }
  return comAtributos(P, C, T)
}
const tira = (a: number) => a - Math.floor(a)

const MOLDES: Record<ItemFeiraId, Molde> = {
  cogumelo: {
    r: [0.028, 0.05, 0.054, 0.06, 0.15, 0.18, 0.155, 0.09, 0],
    y: [0, 0, 0.11, 0.135, 0.125, 0.165, 0.225, 0.262, 0.272],
    casca: (t, a) => {
      if (t < 0.5) return hex(0xefe3c8)
      const pinta = tira(a * 2.7) < 0.32 && tira(t * 7.3) < 0.4 ? 0.8 : 1
      return luz(mix(hex(0xb5784a), hex(0xd8a878), t), pinta)
    },
    miolo: (zn, t) => {
      if (Math.abs(zn) > 0.42 && t > 0.42 && t < 0.62) return tira(zn * 9) < 0.5 ? hex(0x5a3a26) : hex(0x8a6448)
      return mix(hex(0xfaf1dc), hex(0xecdcb8), Math.abs(zn))
    },
  },
  cenoura: {
    r: [0, 0.03, 0.048, 0.062, 0.072, 0.074, 0.058, 0.012],
    y: [-0.26, -0.2, -0.1, 0, 0.08, 0.14, 0.18, 0.19],
    casca: (t) => { const k = tira(t * 11) < 0.13 ? 0.82 : 1; return luz(mix(hex(0xe2641a), hex(0xff8a2c), t), k) },
    miolo: (zn) => {
      const a = Math.abs(zn)
      return a < 0.42 ? hex(0xffb35c) : a < 0.5 ? hex(0xd9702a) : mix(hex(0xff8b2e), hex(0xef6e1d), a)
    },
  },
  abobrinha: {
    r: [0.02, 0.05, 0.06, 0.063, 0.06, 0.05, 0.02],
    y: [-0.24, -0.2, -0.1, 0, 0.1, 0.2, 0.24],
    casca: (t, a) => {
      const risco = Math.abs(tira(a * 1.6) - 0.5) < 0.1 ? hex(0x7fb05a) : hex(0x2e7a32)
      return tira(t * 17 + a * 3) < 0.2 ? mix(risco, hex(0xcfe59a), 0.5) : t > 0.92 || t < 0.08 ? hex(0x4f6e2a) : risco
    },
    miolo: (zn, t) => {
      const a = Math.abs(zn)
      if (a > 0.93) return hex(0x2e7a32)
      if (a > 0.3 && a < 0.58 && tira(t * 13) < 0.3) return hex(0xefe3b4)
      return mix(hex(0xdfe9a4), hex(0xf4f0c6), 1 - a)
    },
  },
  pimentao: {
    r: [0, 0.07, 0.13, 0.145, 0.135, 0.105, 0.062, 0],
    y: [-0.15, -0.14, -0.08, 0.01, 0.1, 0.14, 0.16, 0.16],
    lobos: 3,
    tinta: 1,
    casca: (t) => mix(hex(0xbfbfbf), hex(0xffffff), Math.min(1, t * 1.5)),
    miolo: (zn, t) => {
      const a = Math.abs(zn)
      if (a > 0.84) return hex(0xfff1e0)
      if (a < 0.26 && t > 0.3 && t < 0.7) return hex(0xe8dfa8) // as sementes presas no meio
      return luz(hex(0xf9f4ea), 0.55)
    },
  },
}

// o toquinho e o verde do que tem (só nas inteiras e numa das metades)
function detalhe(id: ItemFeiraId): THREE.BufferGeometry | null {
  if (id === "cenoura") {
    const fia: THREE.BufferGeometry[] = []
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2
      const g = new THREE.ConeGeometry(0.018, 0.14, 4).toNonIndexed()
      g.rotateZ(0.5); g.rotateY(a); g.translate(Math.cos(a) * 0.04, 0.26, Math.sin(a) * 0.04)
      fia.push(pintado(g, hex(0x3fa63a)))
    }
    return mergeGeometries(fia, false)
  }
  if (id === "pimentao") { const g = new THREE.CylinderGeometry(0.018, 0.024, 0.07, 5).toNonIndexed(); g.translate(0, 0.195, 0); return pintado(g, hex(0x3a8a3a)) }
  return null
}
function pintado(g: THREE.BufferGeometry, c: Cor) {
  const n = g.attributes.position.count, C = new Float32Array(n * 3), T = new Float32Array(n)
  for (let i = 0; i < n; i++) { C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; T[i] = 0 }
  g.setAttribute("color", new THREE.BufferAttribute(C, 3)); g.setAttribute("aTinta", new THREE.BufferAttribute(T, 1))
  g.deleteAttribute("normal"); g.deleteAttribute("uv")
  return g
}

export function geoLegume(id: ItemFeiraId, metade: boolean): THREE.BufferGeometry {
  const m = MOLDES[id]
  const partes = metade ? [casca(m, Math.PI / 2, Math.PI), cara(m)] : [casca(m, 0, Math.PI * 2)]
  const d = !metade ? detalhe(id) : null
  if (d) partes.push(d)
  const g = mergeGeometries(partes, false)!
  g.computeBoundingSphere()
  return g
}
/** o raio do legume, pra acertar o corte */
export const RAIO_LEGUME: Record<ItemFeiraId, number> = { cogumelo: 0.18, cenoura: 0.22, abobrinha: 0.22, pimentao: 0.16 }
/** a cor do que voa quando corta (o miolo) */
export const COR_FAISCA: Record<ItemFeiraId, number> = { cogumelo: 0xecdcb8, cenoura: 0xff9a3a, abobrinha: 0xdfe9a4, pimentao: 0xfff1e0 }

// o material único das instâncias: cor do vértice × cor da instância só onde aTinta = 1
export function matLegume() {
  const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aTinta;")
      .replace("#include <color_vertex>", "#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.xyz = color.xyz * mix(vec3(1.0), instanceColor.xyz, aTinta);\n#endif")
  }
  return m
}
