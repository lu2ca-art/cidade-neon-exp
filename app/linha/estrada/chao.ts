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
import { CASA, CHAO_LUGARES, QUEDA, SAIDA_CASA, SUBURBIO } from "../disco/historia"

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
  return h ? h * suave(140, 320, corredorQueda(x, z)) : 0
}
// (22/10) a queda: a Kombi cai até ~900 m antes da casa, a ~45 m do chão, e
// voa reto até ela. Nessa faixa (1,2 km atrás da casa, no rumo da queda) nenhum
// morro: só as dunas. A distância (m) até essa faixa
const QX = Math.sin(QUEDA.rumo), QZ = Math.cos(QUEDA.rumo)
function corredorQueda(x: number, z: number) {
  const px = x - CASA.x, pz = z - CASA.z
  const t = Math.max(-1200, Math.min(0, px * QX + pz * QZ))
  return Math.hypot(px - QX * t, pz - QZ * t)
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
// o chão da grade (sem a boca do túnel)
function chaoGrade(x: number, z: number) {
  const g = grade(), n = SEG + 1, c = TAM / SEG
  const fx = Math.max(0, Math.min(SEG - 1e-6, (x + TAM / 2) / c)), fz = Math.max(0, Math.min(SEG - 1e-6, (z + TAM / 2) / c))
  const ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz
  const a = g[iz * n + ix], b = g[iz * n + ix + 1], d = g[(iz + 1) * n + ix], e = g[(iz + 1) * n + ix + 1]
  // (o mesmo triângulo da PlaneGeometry: a diagonal vai de (ix, iz+1) a (ix+1, iz))
  return tx + tz <= 1 ? a + (b - a) * tx + (d - a) * tz : e + (d - e) * (1 - tx) + (b - e) * (1 - tz)
}
// a altura do chão (a física e o desenho): a grade, menos a rampa da boca do túnel
export function chaoEm(x: number, z: number) {
  return naQuadra(x, z, chaoGrade(x, z)) - fundoBoca(x, z)
}

// ── (T57) A QUADRA (a do Alohan, T10): um piso de cimento plano no chão do
// subúrbio, com as linhas, as duas cestas e o alambrado (disco/LugaresChao).
// O chão em volta assenta no piso (a Kombi roda nele, sem degrau) ──
const QL = CHAO_LUGARES.quadra
export const QUADRA = {
  x: QL.x, z: QL.z,
  // o comprimento da quadra aponta pro centro do subúrbio (de lado pra quem chega)
  rot: Math.atan2(SUBURBIO.x - QL.x, SUBURBIO.z - QL.z) + Math.PI / 2,
  comp: 34, larg: 21, // o piso (a quadra 28 × 15 e a folga em volta)
  topo: 0,
}
export function quadraLocal(x: number, z: number) {
  const dx = x - QUADRA.x, dz = z - QUADRA.z, c = Math.cos(QUADRA.rot), sn = Math.sin(QUADRA.rot)
  return { a: dx * c - dz * sn, b: dx * sn + dz * c }
}
function naQuadra(x: number, z: number, h: number) {
  const { a, b } = quadraLocal(x, z)
  const fora = Math.max(Math.abs(a) - QUADRA.larg / 2, Math.abs(b) - QUADRA.comp / 2)
  if (fora > 3) return h
  if (!QUADRA.topo) {
    let mx = -1e9
    for (let i = -1; i <= 1; i += 0.125) for (let j = -1; j <= 1; j += 0.125) {
      const pa = (i * QUADRA.larg) / 2, pb = (j * QUADRA.comp) / 2, c = Math.cos(QUADRA.rot), sn = Math.sin(QUADRA.rot)
      mx = Math.max(mx, chaoGrade(QUADRA.x + pa * c + pb * sn, QUADRA.z - pa * sn + pb * c))
    }
    QUADRA.topo = mx + 0.12
  }
  return fora <= 0 ? QUADRA.topo : QUADRA.topo + (h - QUADRA.topo) * suave(0, 3, fora)
}

// ── (T57) A BOCA DO TÚNEL (o dono, 28/10: "as coisas acontecem no mundo, de
// verdade"): no subúrbio, o chão afunda numa rampa até a entrada escura das
// trincheiras. É o chão mesmo (a Kombi desce a rampa): um pedaço do relevo com
// a vala, desenhado mais fino que a grade (o resto da grade ali afunda e fica
// escondido embaixo dele). O fundo da rampa é a porta: CHAO_LUGARES.tuneis ──
const BP = CHAO_LUGARES.tuneis
const BL = Math.hypot(BP.x - SUBURBIO.x, BP.z - SUBURBIO.z)
// o rumo da rampa (desce indo do subúrbio pra porta) e o de lado
export const BOCA = {
  x: BP.x, z: BP.z,
  ax: (BP.x - SUBURBIO.x) / BL, az: (BP.z - SUBURBIO.z) / BL,
  comp: 40, // o comprimento da rampa (m)
  fundo: 6.5, // quanto desce (m)
  meia: 6.5, // a meia largura da vala (m)
  plano: 6, // o trecho plano lá embaixo, antes da porta
}
// s: ao longo da rampa (0 na porta, negativo subindo); v: de lado
export function naBocaLocal(x: number, z: number) {
  const dx = x - BOCA.x, dz = z - BOCA.z
  return { s: dx * BOCA.ax + dz * BOCA.az, v: -dx * BOCA.az + dz * BOCA.ax }
}
// quanto o chão desce num ponto (0 fora da vala)
export function fundoBoca(x: number, z: number) {
  const { s, v } = naBocaLocal(x, z)
  if (s > 0.6 || s < -BOCA.comp - 0.5 || Math.abs(v) > BOCA.meia + 1.6) return 0
  // a rampa (suave nas duas pontas) e o plano lá embaixo
  const t = Math.max(0, Math.min(1, (s + BOCA.comp) / (BOCA.comp - BOCA.plano)))
  const desce = BOCA.fundo * t * t * (3 - 2 * t)
  // a parede da porta (s > 0) e as paredes de lado (o muro de arrimo cobre a quina)
  const lado = 1 - suave(BOCA.meia, BOCA.meia + 1.5, Math.abs(v))
  const porta = 1 - suave(0, 0.6, s)
  return desce * lado * porta
}
// está lá embaixo, na frente da porta (onde ela leva pras trincheiras)
export function naBoca(x: number, z: number) {
  const { s, v } = naBocaLocal(x, z)
  return s > -BOCA.plano - 6 && s < 1.5 && Math.abs(v) < BOCA.meia + 0.5
}
// o pedaço da grade que a boca ocupa (células inteiras: a borda bate com o chão em volta)
const RECORTE = (() => {
  const c = TAM / SEG, m = BOCA.comp + 30
  const i0 = (v: number) => Math.floor((v + TAM / 2) / c), i1 = (v: number) => Math.ceil((v + TAM / 2) / c)
  return { ix0: i0(BOCA.x - m), ix1: i1(BOCA.x + m), iz0: i0(BOCA.z - m), iz1: i1(BOCA.z + m) }
})()
// o desenho do pedaço com a vala (a mesma cor do chão; a vala, de concreto)
export function geoBoca() {
  const c = TAM / SEG, K = 16
  const nx = RECORTE.ix1 - RECORTE.ix0, nz = RECORTE.iz1 - RECORTE.iz0
  const geo = new THREE.PlaneGeometry(nx * c, nz * c, nx * K, nz * K)
  geo.rotateX(-Math.PI / 2)
  const cx = -TAM / 2 + ((RECORTE.ix0 + RECORTE.ix1) / 2) * c, cz = -TAM / 2 + ((RECORTE.iz0 + RECORTE.iz1) / 2) * c
  geo.translate(cx, 0, cz)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, chaoEm(pos.getX(i), pos.getZ(i)))
  geo.computeVertexNormals()
  const cor = new Float32Array(pos.count * 3), nor = geo.attributes.normal
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Z = pos.getZ(i)
    corDoChao(X, Z, pos.getY(i), nor.getX(i), nor.getY(i), nor.getZ(i), cor, i)
    // a vala: concreto escuro, mais escuro lá no fundo
    const f = Math.min(1, fundoBoca(X, Z) / 0.8)
    if (f > 0) {
      const k = 1 - 0.35 * (fundoBoca(X, Z) / BOCA.fundo)
      cor[i * 3] += (0.2 * k - cor[i * 3]) * f; cor[i * 3 + 1] += (0.19 * k - cor[i * 3 + 1]) * f; cor[i * 3 + 2] += (0.23 * k - cor[i * 3 + 2]) * f
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3))
  return geo
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
  }
  geo.computeVertexNormals()
  const nor = geo.attributes.normal
  for (let i = 0; i < pos.count; i++) corDoChao(pos.getX(i), pos.getZ(i), pos.getY(i), nor.getX(i), nor.getY(i), nor.getZ(i), cor, i)
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3))
  // (T57) embaixo do pedaço da boca do túnel, a grade afunda (fica escondida; as
  // normais e as cores ficam as de antes, pra borda não mudar de luz)
  for (let iz = RECORTE.iz0 + 1; iz < RECORTE.iz1; iz++) for (let ix = RECORTE.ix0 + 1; ix < RECORTE.ix1; ix++) {
    const i = iz * n + ix
    pos.setY(i, pos.getY(i) - 30)
  }
  return geo
}
// a cor do chão num ponto: a areia (mais clara na crista) ou o lixão, e o
// relevo de longe (a queda): um sol baixo assado na cor (o material tem
// emissivo forte, que achata a luz) e a encosta íngreme mais escura
function corDoChao(X: number, Z: number, y: number, nx: number, ny: number, nz: number, cor: Float32Array, i: number) {
  const c = crista(X, Z), l = zonaLixo(X, Z), m = ruido(X / 35, Z / 35)
  const areia = 0.72 + c * 0.28 - m * 0.06
  const sr = 0.66 * areia, sg = 0.48 * areia, sb = 0.3 * areia
  const ferr = m > 0.62 ? 1 : 0
  const lr = 0.17 + ferr * 0.14 + m * 0.05, lg = 0.15 + ferr * 0.05 + m * 0.04, lb = 0.16 + m * 0.04
  const sx = -0.55, sy = 0.62, sz = -0.56
  const luz = Math.max(0, nx * sx + ny * sy + nz * sz)
  const alto = Math.max(0, Math.min(1, (y - CHAO) / 50))
  const k = (0.62 + 0.5 * luz) * (0.92 + 0.16 * alto) * (0.75 + 0.25 * ny)
  cor[i * 3] = (sr + (lr - sr) * l) * k; cor[i * 3 + 1] = (sg + (lg - sg) * l) * k; cor[i * 3 + 2] = (sb + (lb - sb) * l) * k
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
