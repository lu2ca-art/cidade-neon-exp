// O CHÃO DO MAPA-DISCO (LU2CA 20/10: "dunas procedurais como base do mapa;
// uma parte da cidade são dunas, outra parte lixo: mesmo formato, só muda a
// textura e os objetos no solo"). Uma função só de altura serve pro desenho,
// pra física (a Kombi pisa exatamente no que se vê: a grade interpolada) e pra
// base dos prédios.
//   - as dunas: cristas compridas num rumo (o vento), deformadas pelo ruído,
//     e ondulações grandes por cima. Na cidade, mais baixas (as pistas passam
//     a 4 m do chão no mínimo); fora dela, o deserto cheio
//   - o lixão: manchas grandes dentro da cidade (o mesmo relevo, outra cor,
//     carros despencados meio enterrados e pneus)

import * as THREE from "three"
import { CASA, SAIDA_CASA } from "../disco/historia"

export const CHAO = -12
const TAM = 9000 // m de lado
const SEG = 256 // a grade (35 m por célula; os morros pedem um pouco mais que as dunas)

function hash(ix: number, iz: number) { const s = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453; return s - Math.floor(s) }
// ruído de valor suave (0–1)
function ruido(x: number, z: number) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz)
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1)
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz
}
function fbm(x: number, z: number) { return (ruido(x, z) * 0.5 + ruido(x * 2.03 + 5.2, z * 2.03 + 1.3) * 0.25 + ruido(x * 4.1 + 9.1, z * 4.1 + 3.7) * 0.125) / 0.875 }
const suave = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// a crista da duna (0 no vale, 1 na crista) e a altura (m, mundo)
function crista(x: number, z: number) {
  const ang = 0.6, u = x * Math.cos(ang) + z * Math.sin(ang)
  return 1 - Math.abs(Math.sin(u / 95 + fbm(x / 420, z / 420) * 5))
}
function dunas(x: number, z: number) {
  const r = Math.hypot(x, z)
  const duna = Math.pow(crista(x, z), 1.8) * (0.5 + 0.8 * fbm(x / 260 + 7, z / 260 + 3))
  const onda = fbm(x / 900 + 11, z / 900 + 5)
  // na cidade, um terço da altura (o chão nunca chega perto das pistas)
  return CHAO + (duna * 11 + onda * 9 - 4) * (0.35 + 0.65 * suave(900, 1500, r))
}

// ── OS MORROS (LU2CA 22/10, 3.1/3.2: "um deserto de verdade: dunas e morros
// enormes espalhados, não em todo lugar, que dão dinâmica à velocidade e pulos
// altos"). Cada morro é uma duna gigante: comprida, com a crista afiada; o lado
// do vento é a rampa (sobe devagar, ~0,3), o outro lado cai a pique (~0,6).
// Vindo rápido pela rampa, a crista lança a Kombi (a física já decola quando o
// chão cai mais rápido que a queda). Só fora da cidade (r > ~1,9 km) e longe da
// casa da D-Bee. Sempre os mesmos, no mesmo lugar
type Morro = { x: number; z: number; ca: number; sa: number; L: number; W: number; H: number }
const VENTO = 0.6 // o mesmo rumo das cristas das dunas
const MORROS: Morro[] = (() => {
  const ms: Morro[] = []
  const novo = (x: number, z: number, H: number, L: number, W: number, ang: number) => ms.push({ x, z, ca: Math.cos(ang), sa: Math.sin(ang), L, W, H })
  // o primeiro: no caminho da casa pra cidade (~600 m), a rampa virada pra casa
  // (o primeiro pulo grande; dá pra ver da queda)
  const dx = -SAIDA_CASA.x, dz = -SAIDA_CASA.z, d = Math.hypot(dx, dz)
  novo(CASA.x + (dx / d) * 620 + (dz / d) * 60, CASA.z + (dz / d) * 620 - (dx / d) * 60, 38, 300, 260, Math.atan2(dz, dx))
  // dois de lado, perto da queda: a referência do relevo quando ela cai
  novo(CASA.x - 520, CASA.z + 380, 52, 360, 300, VENTO + 0.3)
  novo(CASA.x + 260, CASA.z - 560, 30, 260, 220, VENTO - 0.2)
  // o resto, espalhado no anel do deserto
  let k = 0
  while (ms.length < 17 && k < 400) {
    k++
    const a = hash(k, 91) * Math.PI * 2, rr = 2000 + hash(k, 17) * 1600
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr
    const H = 24 + hash(k, 5) * 34, L = 220 + hash(k, 7) * 220, W = 200 + hash(k, 9) * 140
    if (Math.hypot(x - CASA.x, z - CASA.z) < L + 260) continue
    if (ms.some((m) => Math.hypot(m.x - x, m.z - z) < m.L + L + 120)) continue
    novo(x, z, H, L, W, VENTO + (hash(k, 3) - 0.5) * 0.8)
  }
  return ms
})()
// a altura dos morros num ponto (0 fora deles). u: através da crista (o vento
// vem de u < 0), v: ao longo dela
function morros(x: number, z: number) {
  let h = 0
  for (const m of MORROS) {
    const px = x - m.x, pz = z - m.z
    const v = (-px * m.sa + pz * m.ca) / m.L
    if (v <= -1 || v >= 1) continue
    const c = px * m.ca + pz * m.sa
    const u = c < 0 ? -c / m.W : c / (m.W * 0.5)
    if (u >= 1) continue
    const tv = 1 - v * v, f = 1 - u
    // a crista afiada (a curva vai a zero suave no pé) e as pontas arredondadas
    h = Math.max(h, m.H * f * f * tv * tv * (0.85 + 0.15 * ruido(x / 60, z / 60)))
  }
  return h
}

// a casa e a saída dela: o chão plano (na altura da duna ali), pra nada ficar
// enterrado nem voando; a transição suave até as dunas
const CX = (CASA.x + SAIDA_CASA.x) / 2, CZ = (CASA.z + SAIDA_CASA.z) / 2
const PLANO_R = 110, PLANO_T = 260
let hCasa: number | null = null
export function alturaExata(x: number, z: number) {
  const h = dunas(x, z) + morros(x, z)
  const dc = Math.hypot(x - CX, z - CZ)
  if (dc >= PLANO_T) return h
  hCasa ??= dunas(CX, CZ)
  return hCasa + (h - hCasa) * suave(PLANO_R, PLANO_T, dc)
}
// o lixão (0–1): manchas dentro da cidade
export function zonaLixo(x: number, z: number) {
  const r = Math.hypot(x, z)
  return suave(0.5, 0.6, fbm(x / 600 + 20, z / 600 - 8)) * (1 - suave(1000, 1300, r))
}

// a grade de alturas (a física lê daqui, interpolada: igual ao desenho)
let GRADE: Float32Array | null = null
function grade() {
  if (GRADE) return GRADE
  const n = SEG + 1, g = new Float32Array(n * n)
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) g[iz * n + ix] = alturaExata(-TAM / 2 + (ix / SEG) * TAM, -TAM / 2 + (iz / SEG) * TAM)
  return (GRADE = g)
}
export function chaoEm(x: number, z: number) {
  const g = grade(), n = SEG + 1, c = TAM / SEG
  const fx = Math.max(0, Math.min(SEG - 1e-6, (x + TAM / 2) / c)), fz = Math.max(0, Math.min(SEG - 1e-6, (z + TAM / 2) / c))
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz
  const a = g[iz * n + ix], b = g[iz * n + ix + 1], d = g[(iz + 1) * n + ix], e = g[(iz + 1) * n + ix + 1]
  // (o mesmo triângulo da PlaneGeometry: a diagonal vai de (ix, iz+1) a (ix+1, iz))
  return tx + tz <= 1 ? a + (b - a) * tx + (d - a) * tz : e + (d - e) * (1 - tx) + (b - e) * (1 - tz)
}

// o desenho do chão: a areia (mais clara na crista, mais escura no vale) e o
// lixão (cinza-ferrugem, manchado)
export function geoChao() {
  const g = grade(), n = SEG + 1
  const geo = new THREE.PlaneGeometry(TAM, TAM, SEG, SEG)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position, cor = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Z = pos.getZ(i)
    const ix = Math.round((X + TAM / 2) / (TAM / SEG)), iz = Math.round((Z + TAM / 2) / (TAM / SEG))
    pos.setY(i, g[iz * n + ix])
    const c = crista(X, Z), l = zonaLixo(X, Z), m = ruido(X / 35, Z / 35)
    const areia = 0.72 + c * 0.28 - m * 0.06
    const sr = 0.66 * areia, sg = 0.48 * areia, sb = 0.3 * areia
    const ferr = m > 0.62 ? 1 : 0
    const lr = 0.17 + ferr * 0.14 + m * 0.05, lg = 0.15 + ferr * 0.05 + m * 0.04, lb = 0.16 + m * 0.04
    cor[i * 3] = sr + (lr - sr) * l; cor[i * 3 + 1] = sg + (lg - sg) * l; cor[i * 3 + 2] = sb + (lb - sb) * l
  }
  geo.computeVertexNormals()
  // o relevo de longe (a queda): um sol baixo assado na cor (o material tem
  // emissivo forte, que achata a luz) e a encosta íngreme mais escura
  const nor = geo.attributes.normal, sx = -0.55, sy = 0.62, sz = -0.56
  for (let i = 0; i < pos.count; i++) {
    const nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i)
    const luz = Math.max(0, nx * sx + ny * sy + nz * sz)
    const alto = Math.max(0, Math.min(1, (pos.getY(i) - CHAO) / 50))
    const k = (0.62 + 0.5 * luz) * (0.92 + 0.16 * alto) * (0.75 + 0.25 * ny)
    cor[i * 3] *= k; cor[i * 3 + 1] *= k; cor[i * 3 + 2] *= k
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3))
  return geo
}

// os objetos do lixão: carros despencados (que não carregavam ninguém) meio
// enterrados, e pneus. Sempre os mesmos, no mesmo lugar
export function lixoNoChao(livre: (x: number, z: number) => boolean) {
  const carros: THREE.Matrix4[] = [], pneus: THREE.Matrix4[] = [], coresCarro: THREE.Color[] = []
  const o = new THREE.Object3D()
  const PALETA = ["#5a2f2a", "#3d4a5c", "#6b6150", "#2c2c34", "#7a3b1f", "#41553f", "#8a7d6a"]
  let k = 0
  for (let x = -1300; x <= 1300; x += 26) for (let z = -1300; z <= 1300; z += 26) {
    const h1 = hash(x * 0.37, z * 0.53)
    const jx = x + (hash(x, z) - 0.5) * 22, jz = z + (hash(z, x) - 0.5) * 22
    const l = zonaLixo(jx, jz)
    if (l < 0.5 || h1 > 0.42 * l || !livre(jx, jz)) continue
    const y = chaoEm(jx, jz)
    if (hash(jx, jz * 1.7) < 0.6) {
      o.position.set(jx, y + 0.25, jz)
      o.rotation.set((hash(jx, 1) - 0.5) * 0.9, hash(jz, 2) * Math.PI * 2, (hash(jx, jz) - 0.5) * (hash(k, 3) < 0.2 ? Math.PI : 0.8))
      o.scale.set(1, 1, 1); o.updateMatrix()
      carros.push(o.matrix.clone()); coresCarro.push(new THREE.Color(PALETA[k % PALETA.length]))
    } else {
      o.position.set(jx, y + 0.15, jz)
      o.rotation.set(Math.PI / 2 + (hash(jx, 4) - 0.5) * 0.6, hash(jz, 5) * Math.PI, 0)
      o.scale.setScalar(0.9 + hash(k, 6) * 0.5); o.updateMatrix()
      pneus.push(o.matrix.clone())
    }
    k++
  }
  return { carros, pneus, coresCarro }
}
