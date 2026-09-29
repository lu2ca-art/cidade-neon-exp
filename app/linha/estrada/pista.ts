// A pista da Linha 222: um loop fechado por cima da cidade alagada.
//
// Mesma ideia do Horizon Drive (Shopify): nada de motor de física nem
// raycast. O carro vive em coordenadas da própria pista — distância
// percorrida (u) e deslocamento lateral (x) — e tudo o que importa (altura,
// direção, curvatura) é lido de uma tabela pré-amostrada da spline. É isso
// que deixa a direção fluida e barata a 60fps no celular.

import * as THREE from "three"
import { ESTACOES, type EstacaoId } from "../data"

export const MEIA = 8 // meia largura da pista (m) — larga: 4+ Kombis lado a lado
export const PASSO = 2 // resolução da amostragem (m)

export interface Pista {
  L: number
  n: number
  px: Float32Array
  py: Float32Array
  pz: Float32Array
  tx: Float32Array // tangente (xz normalizada, y separado)
  tz: Float32Array
  ty: Float32Array
  curv: Float32Array // curvatura com sinal (1/m), + = curva pra direita
  estacoes: { id: EstacaoId; u: number }[]
  rampas: number[]
  orbs: { u: number; x: number }[]
  turbos: { u: number; x: number }[]
}

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function suave(t: number) {
  return t * t * (3 - 2 * t)
}

export function montarPista(seed = 222): Pista {
  const r = rng(seed)
  // pontos de controle num anel irregular: curvas longas, nenhuma fechada
  const pts: THREE.Vector3[] = []
  const N = 26
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    const raio = 760 + (r() - 0.5) * 300 + Math.sin(a * 3) * 110
    const h = Math.sin(a * 2 + 0.7) * 10 + Math.sin(a * 5) * 4
    pts.push(new THREE.Vector3(Math.cos(a) * raio, h, Math.sin(a) * raio))
  }
  const curva = new THREE.CatmullRomCurve3(pts, true, "centripetal")
  const L = curva.getLength()
  const n = Math.floor(L / PASSO)
  const px = new Float32Array(n)
  const py = new Float32Array(n)
  const pz = new Float32Array(n)
  const tx = new Float32Array(n)
  const ty = new Float32Array(n)
  const tz = new Float32Array(n)
  const curv = new Float32Array(n)
  const p = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    curva.getPointAt(i / n, p)
    px[i] = p.x
    py[i] = p.y
    pz[i] = p.z
  }

  // o mirante (bairro do hélio): a pista sobe ~22m entre 49% e 61% do loop
  for (let i = 0; i < n; i++) {
    const f = i / n
    if (f > 0.47 && f < 0.63) py[i] += 22 * Math.sin(((f - 0.47) / 0.16) * Math.PI) ** 2
  }

  // rampas: sobe suave 18m e cai de uma vez — o carro decola sozinho
  const rampas: number[] = []
  for (let k = 0; k < 5; k++) rampas.push(((k + 0.35) / 5) * L)
  for (const u0 of rampas) {
    const i0 = Math.floor(u0 / PASSO)
    const sobe = Math.floor(18 / PASSO)
    for (let j = 0; j < sobe; j++) py[(i0 + j) % n] += 2.4 * suave(j / sobe)
  }

  // tangentes e curvatura
  for (let i = 0; i < n; i++) {
    const a = (i - 1 + n) % n
    const b = (i + 1) % n
    const dx = px[b] - px[a]
    const dz = pz[b] - pz[a]
    const len = Math.hypot(dx, dz) || 1
    tx[i] = dx / len
    tz[i] = dz / len
    ty[i] = (py[b] - py[a]) / (2 * PASSO)
  }
  for (let i = 0; i < n; i++) {
    const a = (i - 3 + n) % n
    const b = (i + 3) % n
    const ang = Math.atan2(tz[b], tx[b]) - Math.atan2(tz[a], tx[a])
    const d = Math.atan2(Math.sin(ang), Math.cos(ang))
    curv[i] = d / (6 * PASSO)
  }

  // estações: arcos igualmente espaçados, na ordem da linha
  // as 9 estações do vol.1 moram no centro (bairro do neônio, primeira metade)
  const estacoes = ESTACOES.map((e, i) => ({ id: e.id, u: ((i + 0.5) / ESTACOES.length) * 0.5 * L }))

  // orbs em colares de 6, desenhando uma linha que dá gosto seguir
  const orbs: { u: number; x: number }[] = []
  for (let u = 120; u < L - 40; u += 90 + r() * 70) {
    if (rampas.some((ru) => Math.abs(ru - u) < 40)) continue
    const x0 = (r() - 0.5) * (MEIA * 1.3)
    const dx = (r() - 0.5) * 0.9
    for (let k = 0; k < 6; k++) orbs.push({ u: u + k * 7, x: Math.max(-MEIA + 1.5, Math.min(MEIA - 1.5, x0 + dx * k)) })
  }
  // no ar, em cima das rampas, vale o dobro
  for (const ru of rampas) for (let k = 0; k < 4; k++) orbs.push({ u: ru + 24 + k * 6, x: 0 })

  const turbos: { u: number; x: number }[] = []
  for (let u = 300; u < L - 60; u += 380 + r() * 200) turbos.push({ u, x: (r() - 0.5) * MEIA })

  return { L, n, px, py, pz, tx, ty, tz, curv, estacoes, rampas, orbs, turbos }
}

// leitura interpolada da tabela
export interface Amostra {
  x: number
  y: number
  z: number
  tx: number
  ty: number
  tz: number
  curv: number
}

export function amostra(p: Pista, u: number, out: Amostra) {
  const uu = ((u % p.L) + p.L) % p.L
  const f = uu / PASSO
  const i = Math.floor(f) % p.n
  const j = (i + 1) % p.n
  const t = f - Math.floor(f)
  out.x = p.px[i] + (p.px[j] - p.px[i]) * t
  out.y = p.py[i] + (p.py[j] - p.py[i]) * t
  out.z = p.pz[i] + (p.pz[j] - p.pz[i]) * t
  out.tx = p.tx[i] + (p.tx[j] - p.tx[i]) * t
  out.ty = p.ty[i] + (p.ty[j] - p.ty[i]) * t
  out.tz = p.tz[i] + (p.tz[j] - p.tz[i]) * t
  const l = Math.hypot(out.tx, out.tz) || 1
  out.tx /= l
  out.tz /= l
  out.curv = p.curv[i] + (p.curv[j] - p.curv[i]) * t
  return out
}

// ponto do mundo a partir de (u, x lateral, altura acima da pista)
export function mundo(p: Pista, u: number, x: number, h: number, a: Amostra, out: THREE.Vector3) {
  amostra(p, u, a)
  // direita = tangente × cima
  const rx = -a.tz
  const rz = a.tx
  return out.set(a.x + rx * x, a.y + h, a.z + rz * x)
}

export function du(p: Pista, a: number, b: number) {
  // distância com sinal de a até b, pelo caminho mais curto no loop
  let d = (b - a) % p.L
  if (d > p.L / 2) d -= p.L
  if (d < -p.L / 2) d += p.L
  return d
}
