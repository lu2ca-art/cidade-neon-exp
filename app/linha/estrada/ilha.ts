// A ILHA POR BAIXO (19/11, o dono: "aquele mapa flutuante novo é o do jogo"). O mundo é um
// disco flutuando (historia.ts, ILHA): o chão acaba na beira (chao.ts, beiraDaIlha) e dali
// pendura o cone, a raiz da ilha. Os túneis são tubos construídos por fora do cone, colados
// nele, com uma parede sempre virada pro céu (mapa-ilustrado.md, 18/11):
//   - a rede de verdade (trincheiras/mapa.ts, copiada em ilha.json) mantém o ângulo; a
//     distância ao centro vira a descida pelo cone: a borda da rede fica lá em cima, o meio
//     perto da ponta; A DESCIDA fica no rumo da boca do túnel (CHAO_LUGARES.tuneis)
//   - em planta, cada ponto cai exatamente onde está no mapa ilustrado: o salão TORRE n fica
//     embaixo da torre n (as torres do vinil saíram de lá)
// Só as contas (sem React): geometrias prontas, montadas uma vez.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { CHAO_LUGARES, ILHA } from "../disco/historia"
import { CHAO, alturaExata } from "./chao"
import REDE from "./ilha.json"

type Rio = { c: string; p: number[] }
type Salao = { n: string; x: number; z: number; r: number }
const RIOS = (REDE as { rios: Rio[] }).rios
const SALOES = (REDE as { sal: Salao[] }).sal

export const ILHA_CFG = {
  aneis: 26, // anéis do cone, de cima até a ponta
  gomos: 240, // em volta
  tubo: 30, // m, o raio do túnel
  rio: 6, // m, o rio de neon dentro dele
  costela: 95, // m entre as costelas de reforço
  riMapa: 2450, // m, o raio da ilha no mapa ilustrado (a planta dos túneis sai dele)
}

// o cone do jogo: o raio e a altura numa fração f (0 na beira, 1 na ponta)
const coneR = (f: number) => ILHA.r * Math.pow(1 - f, 1.3)
const coneY = (f: number) => CHAO - 14 - ILHA.fundo * Math.pow(f, 1.05)
// a fração do cone com esse raio (o inverso de coneR)
const fDoRaio = (r: number) => 1 - Math.pow(Math.max(0, Math.min(1, r / ILHA.r)), 1 / 1.3)

export function geoCone() {
  const { aneis: NK, gomos: NS } = ILHA_CFG
  const pos = new Float32Array((NK + 1) * NS * 3), cor = new Float32Array((NK + 1) * NS * 3), idx: number[] = []
  let s = 99
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  const c = new THREE.Color(), cA = new THREE.Color("#a97c4c"), cB = new THREE.Color("#2a1c14"), cC = new THREE.Color("#0d0a10")
  for (let k = 0; k <= NK; k++) for (let g = 0; g < NS; g++) {
    const f = k / NK, a = (g / NS) * Math.PI * 2, i = (k * NS + g) * 3
    let x: number, y: number, z: number
    if (k === 0) { x = ILHA.x + Math.cos(a) * ILHA.r; z = ILHA.z + Math.sin(a) * ILHA.r; y = alturaExata(x, z) }
    else { const rr = coneR(f) * (0.97 + 0.05 * r()); x = ILHA.x + Math.cos(a) * rr; z = ILHA.z + Math.sin(a) * rr; y = coneY(f) + (r() - 0.5) * 30 }
    pos[i] = x; pos[i + 1] = y; pos[i + 2] = z
    c.copy(cA).lerp(cB, Math.min(1, f * 1.6)).lerp(cC, Math.max(0, f - 0.6))
    cor[i] = c.r; cor[i + 1] = c.g; cor[i + 2] = c.b
  }
  for (let k = 0; k < NK; k++) for (let g = 0; g < NS; g++) {
    const a = k * NS + g, b = k * NS + ((g + 1) % NS), cc = (k + 1) * NS + g, d = (k + 1) * NS + ((g + 1) % NS)
    idx.push(a, cc, b, b, cc, d)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// ── a rede no cone ──
const RMAX = Math.max(...RIOS.flatMap((r) => { const o: number[] = []; for (let k = 0; k < r.p.length; k += 2) o.push(Math.hypot(r.p[k], r.p[k + 1])); return o }), ...SALOES.map((s) => Math.hypot(s.x, s.z)))
const DESC = SALOES.find((s) => s.n === "A DESCIDA")!
const FASE = Math.atan2(CHAO_LUGARES.tuneis.z - ILHA.z, CHAO_LUGARES.tuneis.x - ILHA.x) - Math.atan2(DESC.z, DESC.x)
// um ponto da rede (x, z locais) colado por fora do cone: `fora` afasta (m)
export function naCasca(x: number, z: number, fora = 0) {
  const a = Math.atan2(z, x) + FASE, fm = 0.05 + (1 - Math.hypot(x, z) / RMAX) * 0.78
  // o raio em planta é o do mapa ilustrado (os salões das torres embaixo das torres)
  const rPlanta = ILHA_CFG.riMapa * Math.pow(1 - fm, 1.3) * 1.03
  const f = fDoRaio(rPlanta), r = rPlanta + ILHA_CFG.tubo * 0.9 + fora
  return new THREE.Vector3(ILHA.x + Math.cos(a) * r, coneY(f) + ILHA_CFG.tubo * 0.5, ILHA.z + Math.sin(a) * r)
}

export type TubosIlha = { casca: THREE.BufferGeometry; rios: { geo: THREE.BufferGeometry; cor: string }[]; costelas: THREE.Matrix4[]; saloes: { p: THREE.Vector3; r: number; n: string }[] }
export function tubosDaIlha(): TubosIlha {
  const cascas: THREE.BufferGeometry[] = [], rios: TubosIlha["rios"] = [], costelas: THREE.Matrix4[] = []
  const o = new THREE.Object3D()
  for (const rio of RIOS) {
    const pts: THREE.Vector3[] = []
    for (let k = 0; k < rio.p.length; k += 2) pts.push(naCasca(rio.p[k], rio.p[k + 1]))
    if (pts.length < 2) continue
    const cv = new THREE.CatmullRomCurve3(pts), L = cv.getLength(), n = Math.max(40, Math.round(L / 40))
    cascas.push(new THREE.TubeGeometry(cv, n, ILHA_CFG.tubo, 12, false))
    rios.push({ geo: new THREE.TubeGeometry(cv, n, ILHA_CFG.rio, 6, false), cor: rio.c })
    // as costelas de reforço, como as de um túnel construído
    for (let u = ILHA_CFG.costela / 2; u < L; u += ILHA_CFG.costela) {
      const t = u / L, p = cv.getPointAt(t), tg = cv.getTangentAt(t)
      o.position.copy(p); o.lookAt(p.clone().add(tg)); o.scale.setScalar(1); o.updateMatrix()
      costelas.push(o.matrix.clone())
    }
  }
  const saloes = SALOES.map((s) => ({ p: naCasca(s.x, s.z, -ILHA_CFG.tubo * 0.3), r: Math.max(60, s.r * 1.5), n: s.n }))
  return { casca: mergeGeometries(cascas)!, rios, costelas, saloes }
}
