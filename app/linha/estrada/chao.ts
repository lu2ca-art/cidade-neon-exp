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

export const CHAO = -12
const TAM = 9000 // m de lado
const SEG = 200 // a grade (45 m por célula)

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
export function alturaExata(x: number, z: number) {
  const r = Math.hypot(x, z)
  const duna = Math.pow(crista(x, z), 1.8) * (0.5 + 0.8 * fbm(x / 260 + 7, z / 260 + 3))
  const onda = fbm(x / 900 + 11, z / 900 + 5)
  // na cidade, um terço da altura (o chão nunca chega perto das pistas)
  return CHAO + (duna * 11 + onda * 9 - 4) * (0.35 + 0.65 * suave(900, 1500, r))
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
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3)); geo.computeVertexNormals()
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
