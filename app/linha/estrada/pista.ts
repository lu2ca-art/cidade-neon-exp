// As vias da Linha 222: cada pedaço de estrada (os circuitos das rádios e
// as saídas entre eles) é uma spline pré-amostrada.
//
// Mesma ideia do Horizon Drive (Shopify): nada de motor de física nem
// raycast. O carro vive em coordenadas da própria via — distância
// percorrida (u) e deslocamento lateral (x) — e tudo o que importa (altura,
// direção, curvatura, inclinação da curva, largura) é lido de uma tabela.
// É isso que deixa a direção fluida e barata a 60fps no celular.

import * as THREE from "three"

export const MEIA = 8 // meia largura da pista (m) — larga: 4+ Kombis lado a lado
export const PASSO = 2 // resolução da amostragem (m)

export interface Pista {
  L: number
  n: number
  fechada: boolean // circuito (dá a volta) ou via aberta (saída, entrada)
  px: Float32Array
  py: Float32Array
  pz: Float32Array
  tx: Float32Array // tangente (xz normalizada, y separado)
  tz: Float32Array
  ty: Float32Array
  curv: Float32Array // curvatura com sinal (1/m), + = curva pra direita
  bank: Float32Array // inclinação da curva (rad), + = lado direito mais baixo
  esq: Float32Array // borda esquerda (x, negativo)
  dir: Float32Array // borda direita (x, positivo) — abre na bifurcação
}

export function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

export function suave(t: number) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

// amostra a spline em passos de PASSO metros. Depois de mexer em py (relevo,
// rampas), chamar derivar() pra tangentes, curvatura e inclinação.
export function amostrar(pontos: THREE.Vector3[], fechada: boolean): Pista {
  const curva = new THREE.CatmullRomCurve3(pontos, fechada, "centripetal")
  const Lr = curva.getLength()
  const n = fechada ? Math.floor(Lr / PASSO) : Math.floor(Lr / PASSO) + 1
  const L = fechada ? n * PASSO : (n - 1) * PASSO
  const f = () => new Float32Array(n)
  const p: Pista = { L, n, fechada, px: f(), py: f(), pz: f(), tx: f(), ty: f(), tz: f(), curv: f(), bank: f(), esq: f(), dir: f() }
  const v = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    curva.getPointAt(fechada ? i / n : Math.min(1, (i * PASSO) / Lr), v)
    p.px[i] = v.x
    p.py[i] = v.y
    p.pz[i] = v.z
    p.esq[i] = -MEIA
    p.dir[i] = MEIA
  }
  return p
}

function idx(p: Pista, i: number) {
  return p.fechada ? ((i % p.n) + p.n) % p.n : Math.max(0, Math.min(p.n - 1, i))
}

// kBank: quanto a pista inclina por unidade de curvatura (pista de corrida:
// a curva fechada deita pra dentro). janela(i) 0..1 zera onde não pode
// inclinar (bifurcação, emendas).
export function derivar(p: Pista, kBank = 28, janela?: (i: number) => number) {
  const { n } = p
  for (let i = 0; i < n; i++) {
    const a = idx(p, i - 1)
    const b = idx(p, i + 1)
    const dx = p.px[b] - p.px[a]
    const dz = p.pz[b] - p.pz[a]
    const len = Math.hypot(dx, dz) || 1
    p.tx[i] = dx / len
    p.tz[i] = dz / len
    p.ty[i] = (p.py[b] - p.py[a]) / (Math.max(1, b - a) * PASSO)
  }
  for (let i = 0; i < n; i++) {
    const a = idx(p, i - 3)
    const b = idx(p, i + 3)
    const ang = Math.atan2(p.tz[b], p.tx[b]) - Math.atan2(p.tz[a], p.tx[a])
    const d = Math.atan2(Math.sin(ang), Math.cos(ang))
    p.curv[i] = d / (Math.max(1, b - a) * PASSO)
  }
  // inclinação: curvatura suavizada (±24m), limitada a ~18°
  const R = 12
  for (let i = 0; i < n; i++) {
    let s = 0
    let c = 0
    for (let k = -R; k <= R; k++) {
      const j = i + k
      if (!p.fechada && (j < 0 || j >= n)) continue
      s += p.curv[idx(p, j)]
      c++
    }
    const b = Math.max(-0.32, Math.min(0.32, (s / c) * kBank))
    p.bank[i] = b * (janela ? janela(i) : 1)
  }
  return p
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
  bank: number
  esq: number
  dir: number
}

export function novaAmostra(): Amostra {
  return { x: 0, y: 0, z: 0, tx: 1, ty: 0, tz: 0, curv: 0, bank: 0, esq: -MEIA, dir: MEIA }
}

export function amostra(p: Pista, u: number, out: Amostra) {
  const uu = p.fechada ? ((u % p.L) + p.L) % p.L : Math.max(0, Math.min(p.L - 1e-3, u))
  const f = uu / PASSO
  const i = Math.min(p.n - 1, Math.floor(f))
  const j = p.fechada ? (i + 1) % p.n : Math.min(p.n - 1, i + 1)
  const t = f - Math.floor(f)
  const l = (arr: Float32Array) => arr[i] + (arr[j] - arr[i]) * t
  out.x = l(p.px)
  out.y = l(p.py)
  out.z = l(p.pz)
  out.tx = l(p.tx)
  out.ty = l(p.ty)
  out.tz = l(p.tz)
  const n = Math.hypot(out.tx, out.tz) || 1
  out.tx /= n
  out.tz /= n
  out.curv = l(p.curv)
  out.bank = l(p.bank)
  out.esq = l(p.esq)
  out.dir = l(p.dir)
  return out
}

// ponto do mundo a partir de (u, x lateral, altura acima da pista)
export function mundo(p: Pista, u: number, x: number, h: number, a: Amostra, out: THREE.Vector3) {
  amostra(p, u, a)
  // direita = tangente × cima, deitada pela inclinação da curva
  const c = Math.cos(a.bank)
  return out.set(a.x - a.tz * x * c, a.y - x * Math.sin(a.bank) + h, a.z + a.tx * x * c)
}

// ponto do mundo direto da tabela (índice de amostra)
export function pontoI(p: Pista, i: number, x: number, h: number, out: THREE.Vector3) {
  const c = Math.cos(p.bank[i])
  return out.set(p.px[i] - p.tz[i] * x * c, p.py[i] - x * Math.sin(p.bank[i]) + h, p.pz[i] + p.tx[i] * x * c)
}

export function du(p: Pista, a: number, b: number) {
  if (!p.fechada) return b - a
  // distância com sinal de a até b, pelo caminho mais curto no loop
  let d = (b - a) % p.L
  if (d > p.L / 2) d -= p.L
  if (d < -p.L / 2) d += p.L
  return d
}
