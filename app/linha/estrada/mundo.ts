// O mapa da Linha 222: cada frequência da rádio é um lugar da cidade com o
// seu próprio circuito. Você fica no lugar (e na rádio dele) enquanto
// quiser; no fim de cada volta a pista abre numa bifurcação com placas —
// a faixa da esquerda dá mais uma volta, as da direita saem pros outros
// lugares. Mudar de música = mudar de caminho. Rádio trancada = saída com
// barreira até juntar sinal.
//
// Os cinco circuitos ficam num anel em volta de um vão central, cada um
// numa altura; as saídas cruzam o vão em viadutos de alturas diferentes.
// Cada circuito começa (u = 0) no ponto virado pro vão: é ali a bifurcação.

import * as THREE from "three"
import { ESTACOES, type EstacaoId } from "../data"
import { FREQUENCIAS, type FreqId } from "../radio"
import { MEIA, PASSO, amostrar, derivar, rng, suave, type Pista } from "./pista"
import { DISTRITOS, type Distrito, type DistritoId } from "./distritos"

export const FAIXA = 7 // largura de cada faixa de saída na bifurcação
export const GARFO = 260 // trecho largo antes da bifurcação
export const RETA = 330 // trecho reto, plano e sem inclinação antes dela
export const ENTRADA_U = 60 // onde a rampa de chegada encosta no circuito
const ANEL = 860 // raio do anel onde ficam os circuitos

export type Destino = FreqId | "vol2"

export interface Territorio {
  id: FreqId
  lugar: string
  pra: string // "indo pro mirante", "a saída pra arena"
  distrito: DistritoId
  raio: number
  alt: number
  harm: [number, number, number][] // forma: (harmônico, amplitude, fase)
  relevo: [number, number, number][] // altura: (harmônico, metros, fase)
  kBank: number
  predio: Distrito["predio"]
  tunel?: [number, number] // trecho coberto (fração do loop)
}

export const TERRITORIOS: Territorio[] = [
  { id: "linha", lugar: "cidade neon", pra: "pra cidade neon", distrito: "neonio", raio: 470, alt: 3, harm: [[3, 0.16, 0.4], [5, 0.06, 1.2]], relevo: [[2, 6, 0.3], [3, 3, 1]], kBank: 30, predio: "torres" },
  { id: "suburbio", lugar: "subúrbio xenom", pra: "pro subúrbio xenom", distrito: "xenonio", raio: 320, alt: -5, harm: [[2, 0.2, 0.9], [4, 0.08, 0.2]], relevo: [[3, 1.5, 0]], kBank: 24, predio: "casas" },
  { id: "crypto", lugar: "o mirante", pra: "pro mirante", distrito: "helio", raio: 300, alt: 36, harm: [[3, 0.12, 2], [6, 0.05, 0.5]], relevo: [[2, 16, 0.8], [5, 4, 0.2]], kBank: 28, predio: "aberto" },
  { id: "live", lugar: "a arena", pra: "pra arena", distrito: "radonio", raio: 300, alt: 12, harm: [[2, 0.3, 0]], relevo: [[1, 4, 0.5]], kBank: 42, predio: "torres", tunel: [0.28, 0.5] },
  { id: "full", lugar: "a avenida", pra: "pra avenida", distrito: "criptonio", raio: 330, alt: 22, harm: [[4, 0.14, 0.6], [2, 0.1, 1.5]], relevo: [[3, 8, 0.5]], kBank: 30, predio: "brancas" },
]

export const VOL2 = { lugar: "vol.2 · em obra", pra: "pro vol.2", distrito: "argonio" as DistritoId }

export function territorio(id: FreqId) {
  return TERRITORIOS.find((t) => t.id === id)!
}
export function distritoDe(id: FreqId): Distrito {
  const d = territorio(id).distrito
  return DISTRITOS.find((x) => x.id === d)!
}

export interface Faixa {
  para: Destino
  via: number // índice da saída (-1 = sem estrada: vol.2)
  x: number // centro da faixa no circuito, na bifurcação
}

export interface Via extends Pista {
  id: string
  tipo: "circuito" | "saida" | "entrada"
  t: FreqId // circuito/entrada: o lugar; saída: pra onde vai
  de?: FreqId // saída: de onde vem
  estacoes: { id: EstacaoId; u: number }[]
  rampas: number[]
  orbs: { u: number; x: number }[]
  turbos: { u: number; x: number }[]
  faixas: Faixa[]
}

export interface Mundo {
  vias: Via[]
  circuito: Record<FreqId, number>
  entrada: Record<FreqId, number>
  livre: (x: number, z: number, folga: number) => boolean
}

type Base = { S: THREE.Vector3; T: THREE.Vector3; out: THREE.Vector3; alt: number }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function via(p: Pista, id: string, tipo: Via["tipo"], t: FreqId, de?: FreqId): Via {
  return Object.assign(p, { id, tipo, t, de, estacoes: [], rampas: [], orbs: [], turbos: [], faixas: [] })
}

function colares(v: Via, r: () => number, u0: number, u1: number, passo: number) {
  for (let u = u0; u < u1; u += passo * (0.7 + r() * 0.6)) {
    if (v.rampas.some((ru) => Math.abs(ru - u) < 40)) continue
    const x0 = (r() - 0.5) * (MEIA * 1.3)
    const dx = (r() - 0.5) * 0.9
    for (let k = 0; k < 6; k++) v.orbs.push({ u: u + k * 7, x: Math.max(-MEIA + 1.5, Math.min(MEIA - 1.5, x0 + dx * k)) })
  }
}

function montarCircuito(t: Territorio, k: number, nSaidas: number): { v: Via; b: Base } {
  const r = rng(222 + k * 31)
  const ang = -Math.PI / 2 + (k * Math.PI * 2) / TERRITORIOS.length
  const C = V(Math.cos(ang) * ANEL, 0, Math.sin(ang) * ANEL)
  const th0 = Math.atan2(-C.z, -C.x) // virado pro vão central
  const rr = (th: number) => t.raio * (1 + t.harm.reduce((s, [h, a, f]) => s + a * Math.sin(h * th + f), 0))
  const out = V(Math.cos(th0), 0, Math.sin(th0))
  const T = V(Math.sin(th0), 0, -Math.cos(th0))
  const S = C.clone().addScaledVector(out, rr(th0)).setY(t.alt)
  const r0 = rr(th0)
  const dIni = 240 / r0
  const dFim = 430 / r0
  const N = Math.max(9, Math.round((Math.PI * 2 * t.raio) / 180))
  const pts = [S.clone(), S.clone().addScaledVector(T, 110)]
  for (let i = 0; i <= N; i++) {
    const th = th0 - dIni - (i * (Math.PI * 2 - dIni - dFim)) / N
    const jan = Math.sin((Math.PI * i) / N) ** 0.6
    const h = t.alt + t.relevo.reduce((s, [hh, a, f]) => s + a * Math.sin(hh * th + f), 0) * jan
    const R = rr(th)
    pts.push(V(C.x + Math.cos(th) * R, h, C.z + Math.sin(th) * R))
  }
  pts.push(S.clone().addScaledVector(T, -300), S.clone().addScaledVector(T, -150))
  const p = amostrar(pts, true)
  const L = p.L

  // rampas: sobe suave 18m e cai de uma vez — o carro decola sozinho
  const rampas = [0.3, 0.64].map((f) => f * L)
  for (const u0 of rampas) {
    const i0 = Math.floor(u0 / PASSO)
    const sobe = Math.floor(18 / PASSO)
    for (let j = 0; j < sobe; j++) p.py[(i0 + j) % p.n] += 2.4 * suave(j / sobe)
  }
  // bifurcação e emenda de chegada: sem inclinação
  const jan = (i: number) => {
    const u = i * PASSO
    return Math.min(suave((L - RETA - u) / 80), suave((u - 110) / 80))
  }
  derivar(p, t.kBank, jan)
  // a pista abre pra direita antes da bifurcação: uma faixa por saída
  for (let i = 0; i < p.n; i++) {
    const u = i * PASSO
    if (u > L - GARFO) p.dir[i] = MEIA + nSaidas * FAIXA * suave((u - (L - GARFO)) / 120)
  }
  const v = via(p, `circuito:${t.id}`, "circuito", t.id)
  v.rampas = rampas
  colares(v, r, 160, L - RETA - 40, 150)
  for (const ru of rampas) for (let q = 0; q < 4; q++) v.orbs.push({ u: ru + 24 + q * 6, x: 0 })
  for (let u = 320; u < L - RETA - 60; u += 380 + r() * 200) v.turbos.push({ u, x: (r() - 0.5) * MEIA })
  if (t.id === "linha") {
    // as 9 estações do vol.1 moram no centro, na ordem da linha
    const u0 = 200
    const u1 = L - RETA - 120
    v.estacoes = ESTACOES.map((e, i) => ({ id: e.id, u: u0 + ((i + 0.5) / ESTACOES.length) * (u1 - u0) }))
  }
  return { v, b: { S, T, out, alt: t.alt } }
}

function montarSaida(a: Base, b: Base, k: number, slot: number, par: number, de: FreqId, para: FreqId): Via {
  const ck = MEIA + (k + 0.5) * FAIXA
  const sg = k % 2 ? -1 : 1
  const P0 = a.S.clone().addScaledVector(a.out, ck)
  const P1 = a.S.clone().addScaledVector(a.T, 60).addScaledVector(a.out, ck + 5 + 4 * k).setY(a.alt + sg * 1.5 * (1 + k * 0.5))
  const P2 = a.S.clone().addScaledVector(a.T, 170).addScaledVector(a.out, ck + 35 + 24 * k).setY(a.alt + sg * 7 * (1 + k * 0.3))
  const Q3 = b.S.clone().addScaledVector(b.T, -430).addScaledVector(b.out, 70 + slot * 30).setY(b.alt + 16 + slot * 5)
  const Q2 = b.S.clone().addScaledVector(b.T, -330).addScaledVector(b.out, -(34 + slot * 10)).setY(b.alt + 11 + slot * 3)
  const Q1 = b.S.clone().addScaledVector(b.T, -250).addScaledVector(b.out, -(30 + slot * 3)).setY(b.alt + 3)
  const J = b.S.clone().addScaledVector(b.T, -170).addScaledVector(b.out, -28).setY(b.alt)
  // meio do caminho: viaduto, cada saída numa altura
  const M = P2.clone().add(Q3).multiplyScalar(0.5)
  const lado = V(-(Q3.z - P2.z), 0, Q3.x - P2.x).normalize()
  M.addScaledVector(lado, ((par % 3) - 1) * 18)
  M.y = Math.max(a.alt, b.alt) + 22 + ((par * 3) % 7) * 7
  for (const q of [P1, P2]) q.y = Math.max(q.y, -4)
  const p = amostrar([P0, P1, P2, M, Q3, Q2, Q1, J], false)
  const L = p.L
  // começa com a largura de uma faixa (encostada nas vizinhas), abre depois
  for (let i = 0; i < p.n; i++) {
    const w = FAIXA / 2 + (MEIA - FAIXA / 2) * suave((i * PASSO) / 150)
    p.esq[i] = -w
    p.dir[i] = w
  }
  derivar(p, 22, (i) => Math.min(suave((i * PASSO - 120) / 80), suave((L - i * PASSO - 60) / 80)))
  const v = via(p, `${de}>${para}`, "saida", para, de)
  const r = rng(900 + par * 13)
  colares(v, r, 260, L - 200, 170)
  v.turbos.push({ u: L * 0.45, x: 0 })
  return v
}

function montarEntrada(b: Base, t: FreqId): Via {
  const P = (ao: number, lado: number, dy = 0) => b.S.clone().addScaledVector(b.T, ao).addScaledVector(b.out, lado).setY(b.alt + dy)
  const p = amostrar([P(-170, -28), P(-100, -19), P(-45, -9), P(5, -2.5), P(ENTRADA_U - 15, 0), P(ENTRADA_U, 0)], false)
  // encosta por cima do asfalto do circuito, um dedo acima (sem z-fighting)
  for (let i = 0; i < p.n; i++) p.py[i] += 0.04 * suave((i * PASSO) / 60)
  derivar(p, 0)
  return via(p, `entrada:${t}`, "entrada", t)
}

export function montarMundo(): Mundo {
  const vias: Via[] = []
  const circuito = {} as Record<FreqId, number>
  const entrada = {} as Record<FreqId, number>
  const bases = {} as Record<FreqId, Base>
  const ordem = FREQUENCIAS.map((f) => f.id)
  // o centro sai pra todo lugar; os outros saem pro centro e pros vizinhos
  // do anel. Ordem das faixas = ordem de custo da rádio, então as abertas
  // são sempre as mais perto do meio da pista
  const destinos = (id: FreqId): Destino[] => {
    if (id === "linha") return [...ordem.filter((o) => o !== id), "vol2"]
    const k = ordem.indexOf(id)
    const viz = new Set<FreqId>(["linha", ordem[k - 1] ?? "linha", ordem[k + 1] ?? "linha"])
    return ordem.filter((o) => o !== id && viz.has(o))
  }

  TERRITORIOS.forEach((t, k) => {
    const { v, b } = montarCircuito(t, k, destinos(t.id).length)
    circuito[t.id] = vias.length
    vias.push(v)
    bases[t.id] = b
  })
  for (const t of TERRITORIOS) {
    entrada[t.id] = vias.length
    vias.push(montarEntrada(bases[t.id], t.id))
  }
  let par = 0
  for (const t of TERRITORIOS) {
    const c = vias[circuito[t.id]]
    destinos(t.id).forEach((d, k) => {
      const x = MEIA + (k + 0.5) * FAIXA
      if (d === "vol2") { c.faixas.push({ para: d, via: -1, x }); return }
      const slot = TERRITORIOS.filter((o) => o.id !== d && destinos(o.id).includes(d)).findIndex((o) => o.id === t.id)
      c.faixas.push({ para: d, via: vias.length, x })
      vias.push(montarSaida(bases[t.id], bases[d], k, slot, par++, t.id, d))
    })
  }

  // grade espacial das amostras: pra cidade não nascer em cima da pista
  const CEL = 40
  const grade = new Map<string, number[]>()
  for (const v of vias) {
    for (let i = 0; i < v.n; i += 3) {
      const key = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`
      let l = grade.get(key)
      if (!l) grade.set(key, (l = []))
      l.push(v.px[i], v.pz[i], Math.max(-v.esq[i], v.dir[i]))
    }
  }
  const livre = (x: number, z: number, folga: number) => {
    const cx = Math.floor(x / CEL)
    const cz = Math.floor(z / CEL)
    const alcance = Math.ceil((folga + 40) / CEL)
    for (let a = -alcance; a <= alcance; a++)
      for (let b = -alcance; b <= alcance; b++) {
        const l = grade.get(`${cx + a},${cz + b}`)
        if (!l) continue
        for (let q = 0; q < l.length; q += 3) if (Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + folga) return false
      }
    return true
  }
  return { vias, circuito, entrada, livre }
}

// qual faixa da bifurcação o carro pegou (null = segue no circuito)
export function faixaEm(v: Via, x: number, abertas: number): Faixa | null {
  if (x <= MEIA || !abertas) return null
  const k = Math.min(abertas - 1, Math.floor((x - MEIA) / FAIXA))
  return v.faixas[k] ?? null
}
