// OS CARROS DA CIDADE (LU2CA 16/10: "carros mais estilizados, que se
// pareçam de fato carros e não qualquer forma"). Cada modelo nasce do perfil
// lateral (o capô, o para-brisa, o teto, o porta-malas) extrudado na
// largura: a carroceria pintada embaixo, a estufa de vidro escura, o teto,
// as quatro rodas, os faróis acesos e as lanternas vermelhas. Três malhas
// por modelo: a pintada (a cor de cada carro), a escura e as luzes.
// A frente do carro é o +Z.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

interface Perfil {
  nome: string
  L: number; W: number; H: number // comprimento, largura, altura do teto
  cint: number // a linha de cintura (onde começa o vidro)
  capo: number // a altura do capô na frente
  cab: [number, number] // a estufa: de onde (trás) até onde (frente), em x
  incl: [number, number] // a inclinação do vidro de trás e do para-brisa
  roda: number
  cacamba?: boolean // picape: a caçamba aberta atrás da cabine
  luminoso?: boolean // táxi: o luminoso no teto
  cores: string[]
}

export const MODELOS: Perfil[] = [
  { nome: "sedã", L: 4.5, W: 1.8, H: 1.45, cint: 0.95, capo: 0.9, cab: [-1.3, 1.05], incl: [0.45, 0.65], roda: 0.32, cores: ["#e8e8ec", "#1a1c22", "#9aa0aa", "#3a4a6a", "#7a1c22", "#2a2e36"] },
  { nome: "hatch", L: 3.9, W: 1.75, H: 1.5, cint: 0.98, capo: 0.92, cab: [-1.75, 0.85], incl: [0.15, 0.6], roda: 0.31, cores: ["#d8202a", "#f2f2f2", "#2a6ad8", "#ffc21a", "#3a3a40", "#4aa86a"] },
  { nome: "suv", L: 4.7, W: 1.9, H: 1.75, cint: 1.12, capo: 1.05, cab: [-2.05, 0.95], incl: [0.2, 0.55], roda: 0.38, cores: ["#1a1c22", "#e8e8ec", "#5a6270", "#2a3a2a", "#6a4a2a"] },
  { nome: "picape", L: 5.2, W: 1.9, H: 1.8, cint: 1.1, capo: 1.05, cab: [-0.6, 1.25], incl: [0.05, 0.55], roda: 0.4, cacamba: true, cores: ["#e8e8ec", "#8a1c1c", "#1a1c22", "#3a4a5a"] },
  { nome: "van", L: 4.9, W: 1.95, H: 2.05, cint: 1.15, capo: 1.0, cab: [-2.3, 1.55], incl: [0.02, 0.5], roda: 0.34, cores: ["#f2f2f2", "#c8c8cc", "#2a4a8a"] },
  { nome: "táxi", L: 4.5, W: 1.8, H: 1.45, cint: 0.95, capo: 0.9, cab: [-1.3, 1.05], incl: [0.45, 0.65], roda: 0.32, luminoso: true, cores: ["#ffd21a"] },
]

const extrudar = (pts: [number, number][], w: number) => {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 })
  g.translate(0, 0, -w / 2); g.rotateY(-Math.PI / 2) // o comprimento (x) vira o z: a frente no +Z
  return g
}
const pintar = (g: THREE.BufferGeometry, cor: string) => {
  const c = new THREE.Color(cor), n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3)); return g
}
const juntar = (gs: THREE.BufferGeometry[]) => {
  const limpas = gs.map((g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!["position", "normal", "color"].includes(k)) n.deleteAttribute(k); return n })
  const m = mergeGeometries(limpas, false)!; m.computeVertexNormals(); return m
}

export interface Modelo { perfil: Perfil; pintada: THREE.BufferGeometry; escura: THREE.BufferGeometry; luzes: THREE.BufferGeometry }

export function montarModelos(): Modelo[] {
  return MODELOS.map((p) => {
    const { L, W, H, cint, capo, cab, incl, roda } = p, x0 = -L / 2, x1 = L / 2, cl = roda * 0.75
    // a carroceria: o porta-malas, a cintura e o capô caindo pra frente
    const corpo: [number, number][] = p.cacamba
      ? [[x0, cl], [x0, cint], [cab[0], cint], [cab[1], cint], [x1 - 0.5, capo], [x1, capo - 0.2], [x1, cl]]
      : [[x0, cl], [x0, cint - 0.12], [x0 + 0.18, cint], [cab[1], cint], [x1 - 0.35, capo], [x1, capo - 0.18], [x1, cl]]
    // a estufa de vidro e o teto
    const estufa: [number, number][] = [[cab[0], cint - 0.02], [cab[0] + incl[0], H - 0.07], [cab[1] - incl[1], H - 0.07], [cab[1], cint - 0.02]]
    const teto: [number, number][] = [[cab[0] + incl[0] - 0.03, H - 0.08], [cab[1] - incl[1] + 0.03, H - 0.08], [cab[1] - incl[1] + 0.03, H], [cab[0] + incl[0] - 0.03, H]]
    const pintadas: THREE.BufferGeometry[] = [extrudar(corpo, W), extrudar(teto, W - 0.06)]
    if (p.cacamba) {
      // as paredes da caçamba
      for (const z of [-1, 1]) { const b = new THREE.BoxGeometry(0.08, cint - cl + 0.25, cab[0] - x0); b.translate(z * (W / 2 - 0.04), (cint + cl) / 2 + 0.1, (x0 + cab[0]) / 2); pintadas.push(b) }
      const t = new THREE.BoxGeometry(W, cint - cl + 0.25, 0.08); t.translate(0, (cint + cl) / 2 + 0.1, x0 + 0.04); pintadas.push(t)
    }
    const escuras: THREE.BufferGeometry[] = [pintar(extrudar(estufa, W - 0.1), "#0e1420")]
    for (const fx of [x0 + roda * 2.3, x1 - roda * 2.4]) for (const z of [-1, 1]) {
      const r = new THREE.CylinderGeometry(roda, roda, 0.26, 14); r.rotateZ(Math.PI / 2); r.translate(z * (W / 2 + 0.02), roda, fx); escuras.push(pintar(r, "#0a0a0c"))
      const aro = new THREE.CylinderGeometry(roda * 0.55, roda * 0.55, 0.28, 10); aro.rotateZ(Math.PI / 2); aro.translate(z * (W / 2 + 0.02), roda, fx); escuras.push(pintar(aro, "#8a8e98"))
    }
    if (p.cacamba) { const f = new THREE.BoxGeometry(W - 0.16, 0.06, cab[0] - x0 - 0.1); f.translate(0, cint - 0.25, (x0 + cab[0]) / 2); escuras.push(pintar(f, "#1a1a1e")) }
    // as luzes: faróis na frente, lanternas atrás (e o luminoso do táxi)
    const luzes: THREE.BufferGeometry[] = []
    for (const z of [-1, 1]) {
      const f = new THREE.BoxGeometry(0.42, 0.14, 0.06); f.translate(z * (W / 2 - 0.32), capo - 0.25, x1 + 0.02); luzes.push(pintar(f, "#fff4d8"))
      const t = new THREE.BoxGeometry(0.38, 0.16, 0.06); t.translate(z * (W / 2 - 0.3), cint - 0.2, x0 - 0.02); luzes.push(pintar(t, "#ff2a36"))
    }
    if (p.luminoso) { const s = new THREE.BoxGeometry(0.7, 0.18, 0.3); s.translate(0, H + 0.1, (cab[0] + cab[1]) / 2); luzes.push(pintar(s, "#fff2a0")) }
    return { perfil: p, pintada: juntar(pintadas.map((g) => pintar(g, "#ffffff"))), escura: juntar(escuras), luzes: juntar(luzes) }
  })
}
