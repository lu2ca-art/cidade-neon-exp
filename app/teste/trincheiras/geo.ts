// As malhas das trincheiras, montadas uma vez só (T11). Desempenho: o mapa
// inteiro sai em 6 desenhos (o concreto, o neon, o vidro + os fachos de luz,
// as raízes, os grafites e placas, a poeira), sem luz de ponto nenhuma.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import {
  AVENIDAS, COR_AVENIDA, COR_TORRE, CURVA, LEITO, NOME_AVENIDA, NOME_TORRE, PRACA, TETO, TORRES, TORRE_R, type P2,
} from "./mapa"

const BEIRA = 4 // a laje do teto pra fora da parede
const ALTO_TORRE = 160

// um ponto do perfil da seção: lateral (do meio), altura e cor
type Pf = { l: number; y: number; c: THREE.Color }
const C = (h: string) => new THREE.Color(h)
const LEITO_COR = C("#3d3348"), PAREDE_COR = C("#55436a"), ALTO_COR = C("#4a3d63")

// meia seção, do meio pra fora
function meiaSecao(): Pf[] {
  const s: Pf[] = [{ l: 0, y: 0, c: LEITO_COR }, { l: LEITO, y: 0, c: LEITO_COR }]
  for (let j = 1; j <= 7; j++) {
    const f = (j / 7) * (Math.PI / 2)
    s.push({ l: LEITO + CURVA * Math.sin(f), y: CURVA * (1 - Math.cos(f)), c: PAREDE_COR })
  }
  s.push({ l: LEITO + CURVA, y: TETO, c: ALTO_COR })
  s.push({ l: LEITO + CURVA + BEIRA, y: TETO, c: ALTO_COR })
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

// os pontos da avenida que ficam fora das praças (ali o chão é da praça)
function trecho(pts: P2[], de: P2, ate: P2, folga: number) {
  let k0 = 0, k1 = pts.length - 1
  while (k0 < k1 && Math.hypot(pts[k0].x - de.x, pts[k0].z - de.z) < folga) k0++
  while (k1 > k0 && Math.hypot(pts[k1].x - ate.x, pts[k1].z - ate.z) < folga) k1--
  return [k0, k1] as const
}

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
  const n = g.attributes.position.count, col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { col[i * 3] = cor.r; col[i * 3 + 1] = cor.g; col[i * 3 + 2] = cor.b }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3))
  return g
}

// um anel (ou arco) deitado no chão, de raio r0 a r1, entre os ângulos
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

// os arcos da praça que não são boca de avenida
function arcosDaPraca(i: number): [number, number][] {
  const t = TORRES[i], a = TORRES[(i + 1) % 3].c, b = TORRES[(i + 2) % 3].c
  const bocas = [Math.atan2(a.z - t.c.z, a.x - t.c.x), Math.atan2(b.z - t.c.z, b.x - t.c.x)]
  const meia = Math.asin((LEITO + CURVA) / PRACA)
  // percorre o círculo e corta as duas bocas
  const cortes = bocas.map((x) => [x - meia, x + meia] as [number, number]).sort((p, q) => p[0] - q[0])
  const arcos: [number, number][] = []
  arcos.push([cortes[0][1], cortes[1][0]])
  arcos.push([cortes[1][1], cortes[0][0] + Math.PI * 2])
  return arcos
}

// a parede da praça: o mesmo perfil da avenida, girado em volta
function paredePraca(i: number) {
  const t = TORRES[i], half = meiaSecao().slice(1) // do fim do leito pra fora
  const r0 = PRACA - CURVA - LEITO // o "meio" virtual: o leito acaba em PRACA - CURVA
  const geos: THREE.BufferGeometry[] = []
  for (const [a0, a1] of arcosDaPraca(i)) {
    const seg = Math.max(4, Math.round((a1 - a0) * 18))
    const pos: number[] = [], col: number[] = [], idx: number[] = [], m = half.length
    for (let j = 0; j <= seg; j++) {
      const a = a0 + ((a1 - a0) * j) / seg, c = Math.cos(a), s = Math.sin(a)
      for (const p of half) { const r = r0 + p.l; pos.push(t.c.x + c * r, p.y, t.c.z + s * r); col.push(p.c.r, p.c.g, p.c.b) }
      if (j < seg) for (let q = 0; q < m - 1; q++) { const A = j * m + q, B = A + m; idx.push(A, A + 1, B, A + 1, B + 1, B) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3))
    g.setIndex(idx)
    geos.push(g)
  }
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

// ruído barato e fixo (o mapa sai sempre igual)
function rnd(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

// ── 1. o concreto (leito, paredes, praças, torres): um desenho ──
export function geoConcreto() {
  const geos: THREE.BufferGeometry[] = []
  const r = rnd(7)
  for (const av of AVENIDAS) {
    const nrm = normais(av.pts)
    const [k0, k1] = trecho(av.pts, TORRES[av.de].c, TORRES[av.ate].c, Math.sqrt(PRACA * PRACA - (LEITO + CURVA) ** 2) - 1.5)
    // manchas no leito: o rio que secou deixou marcas
    const mancha = av.pts.map(() => 0.85 + r() * 0.3)
    for (let q = 0; q < SECAO.length - 1; q++) {
      const a = SECAO[q], b = SECAO[q + 1]
      geos.push(fita(av.pts, nrm, k0, k1, a.l, b.l, a.y, b.y, (k) => a.c.clone().multiplyScalar(Math.abs(a.l) <= LEITO && Math.abs(b.l) <= LEITO ? mancha[k] : 1)))
    }
  }
  for (const t of TORRES) {
    // o chão da praça e a parede em volta
    const chao = new THREE.CircleGeometry(PRACA - CURVA + 2, 48); chao.rotateX(-Math.PI / 2); chao.translate(t.c.x, -0.01, t.c.z)
    geos.push(pintar(semUV(chao), LEITO_COR))
    geos.push(...paredePraca(t.i))
    // a laje em volta (pra o vidro da praça encostar)
    // a torre: sobe atravessando o vidro, até a rua lá em cima
    const tor = new THREE.CylinderGeometry(TORRE_R, TORRE_R, ALTO_TORRE, 20, 1, true); tor.translate(t.torre.x, ALTO_TORRE / 2, t.torre.z)
    geos.push(pintar(semUV(tor), C("#3a3058")))
  }
  const todos = geos.map(soPosCor)
  const g = mergeGeometries(todos, false)!
  g.computeVertexNormals()
  return g
}

// ── 2. o neon (as linhas do leito, as lâmpadas, os anéis das torres): um desenho ──
export function geoNeon() {
  const geos: THREE.BufferGeometry[] = []
  for (const av of AVENIDAS) {
    const nrm = normais(av.pts), cor = C(COR_AVENIDA[av.i])
    const [k0, k1] = trecho(av.pts, TORRES[av.de].c, TORRES[av.ate].c, PRACA - CURVA)
    for (const l of [-1, 1]) {
      // a linha onde o leito vira parede, e a de cima, onde a parede fica em pé
      geos.push(fita(av.pts, nrm, k0, k1, l * (LEITO - 0.18), l * (LEITO + 0.12), 0.04, 0.05, cor))
      geos.push(fita(av.pts, nrm, k0, k1, l * (LEITO + CURVA - 0.02), l * (LEITO + CURVA - 0.02), CURVA - 0.05, CURVA + 0.12, cor.clone().multiplyScalar(0.55)))
    }
    // as lâmpadas na parede em pé, de 15 em 15 m, alternando os lados
    const quente = C("#ffcf8a")
    for (let k = k0 + 4, lado = 1; k < k1 - 4; k += 8, lado = -lado) {
      const p = av.pts[k], n = nrm[k], l = lado * (LEITO + CURVA - 0.05)
      geos.push(semUV(quadro(p.x + n.x * l, 10.2, p.z + n.z * l, -n.x * lado, -n.z * lado, 1.6, 0.35, quente)))
    }
    // as setas no chão, a cada 60 m: pra onde a volta segue
    for (let k = k0 + 20; k < k1 - 10; k += 30) {
      const p = av.pts[k], q = av.pts[k + 1], ang = Math.atan2(q.x - p.x, q.z - p.z)
      for (const lado of [-0.7, 0.7]) {
        const s = new THREE.PlaneGeometry(0.22, 2.2); s.rotateX(-Math.PI / 2); s.rotateY(ang + lado); s.translate(p.x, 0.03, p.z)
        geos.push(pintar(semUV(s), cor.clone().multiplyScalar(0.6)))
      }
    }
  }
  const cT = C(COR_TORRE)
  for (const t of TORRES) {
    for (const [a0, a1] of arcosDaPraca(t.i)) geos.push(anelChao(t.c.x, t.c.z, PRACA - CURVA - 0.2, PRACA - CURVA + 0.15, 0.04, a0, a1, cT, 24))
    // os anéis da torre, de baixo até sumir lá em cima
    for (const h of [0.15, 4.5, 14, 26, 42, 64, 92, 128]) {
      const a = new THREE.CylinderGeometry(TORRE_R + 0.06, TORRE_R + 0.06, h < 1 ? 0.3 : 0.5, 24, 1, true); a.translate(t.torre.x, h, t.torre.z)
      geos.push(pintar(semUV(a), cT))
    }
    // a porta do elevador, virada pra praça
    const dx = t.c.x - t.torre.x, dz = t.c.z - t.torre.z, d = Math.hypot(dx, dz), nx = dx / d, nz = dz / d
    geos.push(semUV(quadro(t.torre.x + nx * (TORRE_R + 0.08), 1.6, t.torre.z + nz * (TORRE_R + 0.08), nx, nz, 2.4, 3.2, C("#ffcf8a"))))
  }
  return mergeGeometries(geos.map(soPosCor), false)!
}

// ── 3. o vidro do teto (areia e sol) e os fachos de luz das torres: um desenho ──
export function geoVidro() {
  const geos: THREE.BufferGeometry[] = []
  const r = rnd(11)
  for (const av of AVENIDAS) {
    const nrm = normais(av.pts)
    const [k0, k1] = trecho(av.pts, TORRES[av.de].c, TORRES[av.ate].c, Math.sqrt(PRACA * PRACA - (LEITO + CURVA) ** 2) - 1.5)
    // o sol passa pela areia do vidro em manchas
    const sol = av.pts.map((_, k) => { const v = 0.5 + 0.5 * Math.sin(k * 0.07 + av.i) * Math.sin(k * 0.023 + 1.3); return C("#ff9a3c").multiplyScalar(0.02 + v * 0.07 + r() * 0.015) })
    geos.push(fita(av.pts, nrm, k0, k1, -(LEITO + CURVA), LEITO + CURVA, TETO, TETO, (k) => sol[k]))
  }
  for (const t of TORRES) {
    const v = anelChao(t.c.x, t.c.z, 0, PRACA, TETO, 0, Math.PI * 2, C("#ff9a3c").multiplyScalar(0.06), 40)
    geos.push(v)
    // o facho que desce da rua pela torre (mais forte em cima)
    const f = new THREE.CylinderGeometry(TORRE_R + 3, TORRE_R + 7, TETO, 20, 1, true); f.translate(t.torre.x, TETO / 2, t.torre.z)
    const pos = f.attributes.position, col = new Float32Array(pos.count * 3), c = C(COR_TORRE)
    for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) / TETO) * 0.22; col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k }
    f.setAttribute("color", new THREE.BufferAttribute(col, 3))
    geos.push(semUV(f))
  }
  return mergeGeometries(geos.map(soPosCor), false)!
}

// ── 4. as raízes da cidade-árvore, penduradas do vidro: um desenho (instâncias) ──
export function raizes(): { geo: THREE.BufferGeometry; mats: THREE.Matrix4[]; cores: THREE.Color[] } {
  const geo = new THREE.CylinderGeometry(0.32, 0.03, 1, 5, 3)
  geo.translate(0, -0.5, 0) // o topo no zero: pendura do teto
  // torce um pouco (raiz não é reta)
  const p = geo.attributes.position
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 3.1) * 0.12); p.setZ(i, p.getZ(i) + Math.cos(y * 2.3) * 0.1) }
  geo.computeVertexNormals()
  const r = rnd(23), mats: THREE.Matrix4[] = [], cores: THREE.Color[] = []
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3()
  const por = (x: number, z: number, comp: number, grosso: number) => {
    e.set((r() - 0.5) * 0.5, r() * Math.PI * 2, (r() - 0.5) * 0.5); q.setFromEuler(e)
    s.set(grosso, comp, grosso); v.set(x, TETO + 0.2, z)
    mats.push(m.compose(v, q, s).clone())
    cores.push(C(r() < 0.18 ? "#6af2d0" : "#3a2618").multiplyScalar(0.7 + r() * 0.5))
  }
  for (const av of AVENIDAS) {
    const nrm = normais(av.pts)
    for (let k = 10; k < av.pts.length - 10; k += 2) {
      if (r() > 0.55) continue
      const pt = av.pts[k], n = nrm[k]
      // mais perto das paredes (o meio fica livre pra câmera)
      const lado = r() < 0.5 ? -1 : 1, l = lado * (LEITO + CURVA - r() * 7)
      por(pt.x + n.x * l, pt.z + n.z * l, 1.5 + r() * 4.5, 0.6 + r() * 1.4)
    }
  }
  for (const t of TORRES) for (let j = 0; j < 36; j++) {
    const a = r() * Math.PI * 2, d = 10 + r() * (PRACA - 12)
    por(t.c.x + Math.cos(a) * d, t.c.z + Math.sin(a) * d, 1 + r() * 3.5, 0.6 + r() * 1.2)
  }
  return { geo, mats, cores }
}

// ── 5. os grafites (lugar do T12) e as placas: um desenho, uma textura ──
// a textura: 4 grafites (512×256) em cima e 8 placas (512×128) embaixo
export function texturaAtlas() {
  const c = document.createElement("canvas"); c.width = 1024; c.height = 1024
  const g = c.getContext("2d")!
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024)
  const tags: [string, string, string][] = [["LU2CA", "#ff3fb0", "#2fe8ff"], ["XENOM", "#b4ff8a", "#9b8cff"], ["222", "#ffc857", "#ff3fb0"], ["RAIZ", "#2fe8ff", "#ffc857"]]
  tags.forEach(([txt, a, b], i) => {
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
  })
  const placa = (txt: string, cor: string, slot: number) => {
    const x0 = (slot % 2) * 512, y0 = 512 + Math.floor(slot / 2) * 128
    g.fillStyle = "#07060c"; g.fillRect(x0 + 4, y0 + 4, 504, 120)
    g.font = "800 54px ui-monospace, monospace"; g.textAlign = "center"; g.textBaseline = "middle"
    g.shadowColor = cor; g.shadowBlur = 18; g.fillStyle = cor; g.fillText(txt, x0 + 256, y0 + 66); g.shadowBlur = 0
  }
  NOME_TORRE.forEach((n, i) => placa(n, COR_TORRE, i))
  NOME_AVENIDA.forEach((n, i) => placa(n, COR_AVENIDA[i], 3 + i))
  placa("SUBIR · RUA", "#ffcf8a", 6)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
const uvGrafite = (i: number): [number, number, number, number] => { const x = (i % 2) * 0.5, y = 1 - (Math.floor(i / 2) + 1) * 0.25; return [x, y, x + 0.5, y + 0.25] }
const uvPlaca = (s: number): [number, number, number, number] => { const x = (s % 2) * 0.5, y = 0.5 - (Math.floor(s / 2) + 1) * 0.125; return [x, y, x + 0.5, y + 0.125] }

// os lugares de grafite (o T12 troca o desenho e o gesto)
export type LugarGrafite = { x: number; y: number; z: number; nx: number; nz: number; av: number }
export function lugaresGrafite(): LugarGrafite[] {
  const l: LugarGrafite[] = []
  for (const av of AVENIDAS) {
    const nrm = normais(av.pts)
    for (let k = 40, lado = 1; k < av.pts.length - 40; k += 45, lado = -lado) {
      const p = av.pts[k], n = nrm[k], d = lado * (LEITO + CURVA - 0.06)
      l.push({ x: p.x + n.x * d, y: 8.1 - 0.0, z: p.z + n.z * d, nx: -n.x * lado, nz: -n.z * lado, av: av.i })
    }
  }
  return l
}

export function geoAtlas() {
  const geos: THREE.BufferGeometry[] = []
  const branco = C("#ffffff")
  lugaresGrafite().forEach((g, i) => geos.push(quadro(g.x, g.y - 0.2, g.z, g.nx, g.nz, 7, 3.5, C("#d8d0e8"), uvGrafite(i % 4))))
  for (const t of TORRES) {
    const dx = t.c.x - t.torre.x, dz = t.c.z - t.torre.z, d = Math.hypot(dx, dz), nx = dx / d, nz = dz / d
    // o nome da torre, alto, e o "subir" em cima da porta
    geos.push(quadro(t.torre.x + nx * (TORRE_R + 1.6), 8.4, t.torre.z + nz * (TORRE_R + 1.6), nx, nz, 8, 2, branco, uvPlaca(t.i)))
    geos.push(quadro(t.torre.x + nx * (TORRE_R + 0.5), 3.8, t.torre.z + nz * (TORRE_R + 0.5), nx, nz, 3.2, 0.8, branco, uvPlaca(6)))
  }
  // o nome de cada avenida, na boca, dos dois lados
  for (const av of AVENIDAS) {
    const nrm = normais(av.pts)
    for (const [k, sentido] of [[24, 1], [av.pts.length - 25, -1]] as const) {
      const p = av.pts[k], n = nrm[k], q = av.pts[k + sentido], fx = (q.x - p.x), fz = (q.z - p.z), f = Math.hypot(fx, fz)
      // a placa pendurada do vidro, de frente pra quem entra
      geos.push(quadro(p.x + n.x * 0, 9.4, p.z + n.z * 0, -fx / f, -fz / f, 8, 2, branco, uvPlaca(3 + av.i)))
    }
  }
  return mergeGeometries(geos.map((g) => { for (const k of Object.keys(g.attributes)) if (!["position", "color", "uv"].includes(k)) g.deleteAttribute(k); return g }), false)!
}

// ── 6. a poeira no ar (luz do vidro batendo): um desenho, parada ──
export function geoPoeira() {
  const r = rnd(5), pos: number[] = []
  for (const av of AVENIDAS) for (let k = 0; k < av.pts.length; k++) {
    if (r() > 0.6) continue
    const p = av.pts[k], l = (r() - 0.5) * 2 * (LEITO + CURVA)
    const a = av.pts[Math.min(av.pts.length - 1, k + 1)], dx = a.x - p.x, dz = a.z - p.z, n = Math.hypot(dx, dz) || 1
    pos.push(p.x - (dz / n) * l, 0.5 + r() * (TETO - 1), p.z + (dx / n) * l)
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  return g
}
