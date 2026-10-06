// O mapa da Linha 222: cada frequência da rádio é um lugar da cidade com o
// seu próprio circuito. Você fica no lugar (e na rádio dele) enquanto
// quiser; no fim de cada volta a pista abre em bifurcações de três: uma
// saída de cada lado e o meio, que fica. Mudar de música = mudar de
// caminho. Rádio trancada = saída com barreira até juntar sinal.
//
// Os cinco circuitos ficam num anel em volta de um vão central, cada um
// numa altura; as saídas cruzam o vão em viadutos. Regra dura: nenhuma
// pista encosta em outra — só se cruzam com FOLGA de altura (conferido na
// montagem por conflitos()). Cada saída chega no destino num ponto só dela,
// alternando os lados, então também nunca se juntam antes de chegar.

import * as THREE from "three"
import { ESTACOES, type EstacaoId } from "../data"
import { FREQUENCIAS, type FreqId } from "../radio"
import { MEIA, PASSO, amostrar, derivar, rng, suave, type Pista } from "./pista"
import { DISTRITOS, type Distrito, type DistritoId } from "./distritos"

export const FAIXA = 7 // largura da faixa de saída
export const CK = MEIA + FAIXA / 2 // centro da faixa de saída, a partir do eixo
export const ABRE = 240 // a faixa de saída começa a abrir isso antes da bifurcação
const ANEL = 940 // raio do anel onde ficam os circuitos
const FOLGA = 7.5 // viaduto: altura livre mínima entre duas pistas que se cruzam

export type Destino = FreqId

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
  reta: number // reta plana antes do fim da volta (onde ficam as bifurcações)
  predio: Distrito["predio"]
  tunel?: [number, number] // trecho coberto (fração do loop)
  // circuito que mora DENTRO do anel de outro, mais baixo (o subúrbio fica
  // embaixo da cidade neon, no chão)
  dentro?: FreqId
}

export const TERRITORIOS: Territorio[] = [
  { id: "linha", reta: 300, lugar: "cidade neon", pra: "pra cidade neon", distrito: "neonio", raio: 560, alt: 3, harm: [[3, 0.16, 0.4], [5, 0.06, 1.2]], relevo: [[2, 6, 0.3], [3, 3, 1]], kBank: 30, predio: "torres" },
  { id: "suburbio", reta: 260, lugar: "subúrbio xenom", pra: "pro subúrbio xenom", distrito: "xenonio", raio: 255, alt: -8, harm: [[2, 0.12, 0.9], [4, 0.05, 0.2]], relevo: [[3, 0.8, 0]], kBank: 18, predio: "casas", dentro: "linha" },
  { id: "crypto", reta: 300, lugar: "o mirante", pra: "pro mirante", distrito: "helio", raio: 300, alt: 36, harm: [[3, 0.12, 2], [6, 0.05, 0.5]], relevo: [[2, 16, 0.8], [5, 4, 0.2]], kBank: 28, predio: "aberto" },
  { id: "live", reta: 300, lugar: "a arena", pra: "pra arena", distrito: "radonio", raio: 300, alt: 12, harm: [[2, 0.3, 0]], relevo: [[1, 4, 0.5]], kBank: 42, predio: "torres", tunel: [0.28, 0.5] },
  { id: "full", reta: 300, lugar: "a avenida", pra: "pra avenida", distrito: "criptonio", raio: 330, alt: 22, harm: [[4, 0.14, 0.6], [2, 0.1, 1.5]], relevo: [[3, 8, 0.5]], kBank: 30, predio: "brancas" },
]

export const VOL2 = { lugar: "vol.2 · em obra", distrito: "argonio" as DistritoId }

export function territorio(id: FreqId) {
  return TERRITORIOS.find((t) => t.id === id)!
}
export function distritoDe(id: FreqId): Distrito {
  const d = territorio(id).distrito
  return DISTRITOS.find((x) => x.id === d)!
}

export interface Faixa {
  para: FreqId
  via: number // índice da saída
  u: number // onde a pista divide (no circuito)
  lado: 1 | -1 // direita / esquerda
}

export interface Via extends Pista {
  id: string
  tipo: "circuito" | "saida"
  t: FreqId // circuito: o lugar; saída: pra onde vai
  de?: FreqId // saída: de onde vem
  lado?: 1 | -1 // saída: lado por onde sai
  chega?: { u: number; lado: 1 | -1 } // saída: onde encosta no destino
  estacoes: { id: EstacaoId; u: number }[]
  rampas: number[]
  orbs: { u: number; x: number }[]
  turbos: { u: number; x: number }[]
  faixas: Faixa[] // circuito: as saídas
  chegadas: { u: number; lado: 1 | -1 }[] // circuito: onde as saídas encostam
  livre: [number, number] // circuito: trecho entre as chegadas e as bifurcações (onde moram estações e missões)
}

export interface Mundo {
  vias: Via[]
  circuito: Record<FreqId, number>
  livre: (x: number, z: number, folga: number) => boolean
  // pilar pode descer daqui (x, z, altura) até a água sem furar outra pista?
  vao: (x: number, z: number, y: number) => boolean
  conflitos: string[]
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

function via(p: Pista, id: string, tipo: Via["tipo"], t: FreqId, de?: FreqId): Via {
  return Object.assign(p, { id, tipo, t, de, estacoes: [], rampas: [], orbs: [], turbos: [], faixas: [], chegadas: [], livre: [0, p.L] as [number, number] })
}

// ponto do mundo sobre um circuito: u (m), lateral (m), altura extra (m)
function em(v: Pista, u: number, lat: number, dy = 0) {
  const i = ((Math.round(u / PASSO) % v.n) + v.n) % v.n
  const c = Math.cos(v.bank[i])
  return V(v.px[i] - v.tz[i] * lat * c, v.py[i] - lat * Math.sin(v.bank[i]) + dy, v.pz[i] + v.tx[i] * lat * c)
}

function colares(v: Via, r: () => number, u0: number, u1: number, passo: number) {
  for (let u = u0; u < u1; u += passo * (0.7 + r() * 0.6)) {
    if (v.rampas.some((ru) => Math.abs(ru - u) < 40)) continue
    const x0 = (r() - 0.5) * (MEIA * 1.3)
    const dx = (r() - 0.5) * 0.9
    for (let k = 0; k < 6; k++) v.orbs.push({ u: u + k * 7, x: Math.max(-MEIA + 1.5, Math.min(MEIA - 1.5, x0 + dx * k)) })
  }
}

// saídas de cada lugar: o centro tem duas bifurcações (4 saídas); os
// outros têm uma — direita volta pro centro, esquerda vai pro vizinho.
// As ligações formam um desenho sem cruzamento no vão (centro→todos +
// vizinhos do anel), pra nenhuma pista precisar passar por cima de outra
// no meio do caminho.
export const PROXIMO: Record<FreqId, FreqId> = { linha: "linha", suburbio: "linha", crypto: "live", live: "full", full: "live" }
function saidasDe(id: FreqId): { para: FreqId; split: 0 | 1; lado: 1 | -1 }[] {
  if (id === "linha") return [
    { para: "crypto", split: 0, lado: -1 },
    { para: "live", split: 1, lado: 1 }, { para: "full", split: 1, lado: -1 },
  ]
  if (id === "suburbio") return [{ para: "linha", split: 0, lado: 1 }]
  return [{ para: "linha", split: 0, lado: 1 }, { para: PROXIMO[id], split: 0, lado: -1 }]
}

// as ruas que DESCEM da cidade neon pro subúrbio: pela esquerda (o lado de
// dentro do anel), nos vãos entre estações, longe das rampas de pulo
export const DESCIDAS = [1316, 1968, 2618]
// O DESERTO (05/10, LU2CA): um bairro do mesmo mapa, fora da cidade. Uma
// estrada sai da cidade neon pela direita (lado de fora do anel), vai pro
// norte, dá uma volta enorme pelo deserto (o deserto "infinito") e volta
// pra cidade pela entrada do outro lado. A casa da D-Bee fica nela; o jogo
// começa lá. Mesmo céu, mesmo horizonte: a cidade inteira lá longe
export const DESERTO = { sai: 1100, chega: 2900, raio: 2100 }
// onde a pista do circuito abre faixa: as bifurcações do fim da volta e,
// na cidade, as descidas
function aberturas(t: Territorio, L: number): { u: number; lado: 1 | -1 }[] {
  const out = saidasDe(t.id).map((s) => ({ u: L - SPLITS[s.split], lado: s.lado }))
  if (t.id === "linha") for (const u of DESCIDAS) out.push({ u, lado: -1 })
  if (t.id === "linha") out.push({ u: DESERTO.sai, lado: 1 })
  return out
}
export const SPLITS = [60, 360] // distância da bifurcação até o fim da volta
const CHEGADA0 = 400 // primeira chegada: passa por baixo de onde as saídas sobem
const CHEGADA_PASSO = 200

function montarCircuito(t: Territorio, k: number, nChegadas: number): Via {
  const r = rng(222 + k * 31)
  const kc = t.dentro ? TERRITORIOS.findIndex((o) => o.id === t.dentro) : k
  const ang = -Math.PI / 2 + (kc * Math.PI * 2) / TERRITORIOS.length
  const C = V(Math.cos(ang) * ANEL, 0, Math.sin(ang) * ANEL)
  const th0 = Math.atan2(-C.z, -C.x) // virado pro vão central
  const rr = (th: number) => t.raio * (1 + t.harm.reduce((s, [h, a, f]) => s + a * Math.sin(h * th + f), 0))
  const out = V(Math.cos(th0), 0, Math.sin(th0))
  const T = V(Math.sin(th0), 0, -Math.cos(th0))
  const S = C.clone().addScaledVector(out, rr(th0)).setY(t.alt)
  const r0 = rr(th0)
  const dIni = 240 / r0
  const dFim = (t.reta + 130) / r0
  const N = Math.max(9, Math.round((Math.PI * 2 * t.raio) / 180))
  const pts = [S.clone(), S.clone().addScaledVector(T, 110)]
  for (let i = 0; i <= N; i++) {
    const th = th0 - dIni - (i * (Math.PI * 2 - dIni - dFim)) / N
    const jan = Math.sin((Math.PI * i) / N) ** 0.6
    const h = t.alt + t.relevo.reduce((s, [hh, a, f]) => s + a * Math.sin(hh * th + f), 0) * jan
    const R = rr(th)
    pts.push(V(C.x + Math.cos(th) * R, h, C.z + Math.sin(th) * R))
  }
  pts.push(S.clone().addScaledVector(T, -t.reta), S.clone().addScaledVector(T, -t.reta * 0.66), S.clone().addScaledVector(T, -t.reta * 0.33))
  const p = amostrar(pts, true)
  const L = p.L
  const fimChegadas = CHEGADA0 + (nChegadas - 1) * CHEGADA_PASSO + 40

  // rampas: sobe suave 18m e cai de uma vez — o carro decola sozinho
  const livre0 = fimChegadas + 60
  const livre1 = L - SPLITS[1] - ABRE - 120
  // rampas de pulo (no subúrbio não: é rua de bairro, e as descidas encostam lá)
  const rampas = t.dentro ? [] : [0.3, 0.7].map((f) => livre0 + f * (livre1 - livre0))
  for (const u0 of rampas) {
    const i0 = Math.floor(u0 / PASSO)
    const sobe = Math.floor(18 / PASSO)
    for (let j = 0; j < sobe; j++) p.py[(i0 + j) % p.n] += 2.4 * suave(j / sobe)
  }
  // bifurcações e chegadas: sem inclinação
  const jan = (i: number) => {
    const u = i * PASSO
    return Math.min(suave((L - SPLITS[1] - ABRE - 80 - u) / 80), suave((u - fimChegadas) / 80))
  }
  derivar(p, t.kBank, jan)
  const v = via(p, `circuito:${t.id}`, "circuito", t.id)
  v.rampas = rampas
  v.livre = [livre0, livre1]
  // a pista ganha uma faixa do lado de cada saída antes de dividir
  for (const s of aberturas(t, L)) {
    const uk = s.u
    for (let i = 0; i < p.n; i++) {
      const u = i * PASSO
      if (u < uk - ABRE || u > uk) continue
      const w = FAIXA * suave((u - (uk - ABRE)) / 120)
      if (s.lado > 0) p.dir[i] = MEIA + w
      else p.esq[i] = -MEIA - w
    }
  }
  colares(v, r, livre0, livre1, 150)
  for (const ru of rampas) for (let q = 0; q < 4; q++) v.orbs.push({ u: ru + 24 + q * 6, x: 0 })
  for (let u = livre0 + 150; u < livre1; u += 380 + r() * 200) v.turbos.push({ u, x: (r() - 0.5) * MEIA })
  if (t.id === "linha") {
    // as 9 estações do vol.1 moram no centro, na ordem da linha
    v.estacoes = ESTACOES.map((e, i) => ({ id: e.id, u: livre0 + ((i + 0.5) / ESTACOES.length) * (livre1 - livre0) }))
  }
  return v
}

function montarSaida(A: Via, B: Via, s: { split: 0 | 1; lado: 1 | -1 }, e: number, extra: number): Via {
  const u = A.L - SPLITS[s.split]
  // cruzamento em dois andares: quem SAI sobe logo em viaduto; quem CHEGA
  // vem rente ao chão por baixo — as duas nunca se encostam
  const pts: THREE.Vector3[] = s.lado > 0
    ? [em(A, u, CK), em(A, u + 60, CK + 6, 2.5), em(A, u + 150, CK + 32, 9), em(A, u + 230, CK + 80, 16)]
    : // saída da esquerda: sobe e cruza por cima do próprio circuito
      [em(A, u, -CK), em(A, u + 70, -(CK + 4), 3), em(A, u + 160, -(CK - 1), 10), em(A, u + 250, CK + 20, 17), em(A, u + 330, CK + 85, 24)]
  // chega pelo lado do vão (direita), num ponto só dela
  const fim = [em(B, e - 420, 120), em(B, e - 280, 48), em(B, e - 170, 21), em(B, e - 90, 8), em(B, e - 30, 1.2), em(B, e, 0)]
  // meio do caminho: mão inglesa ao contrário — cada sentido fica do seu
  // lado da corda, então ida e volta nunca se encostam
  const a0 = pts[pts.length - 1]
  const b0 = fim[0]
  const M = a0.clone().add(b0).multiplyScalar(0.5)
  const dir = b0.clone().sub(a0).setY(0).normalize()
  M.addScaledVector(V(-dir.z, 0, dir.x), 18)
  M.y = Math.max(a0.y, b0.y) + 6 + extra
  for (const q2 of [...pts, ...fim]) q2.y = Math.max(q2.y, -4)
  const p = amostrar([...pts, M, ...fim], false)
  const L = p.L
  // começa da largura de uma faixa (colada no circuito) e abre depois
  for (let i = 0; i < p.n; i++) {
    const w = FAIXA / 2 + (MEIA - FAIXA / 2) * suave((i * PASSO) / 110)
    p.esq[i] = -w
    p.dir[i] = w
  }
  // encosta no destino um dedo acima do asfalto dele (sem z-fighting)
  for (let i = 0; i < p.n; i++) p.py[i] += 0.04 * suave((i * PASSO - (L - 90)) / 60)
  derivar(p, 22, (i) => Math.min(suave((i * PASSO - 130) / 80), suave((L - i * PASSO - 320) / 80)))
  const v = via(p, `${A.t}>${B.t}`, "saida", B.t, A.t)
  v.lado = s.lado
  v.chega = { u: e, lado: 1 }
  const r = rng(900 + A.n + B.n)
  colares(v, r, 260, L - 320, 170)
  for (let tu = 300; tu < L - 330; tu += 320) v.turbos.push({ u: tu, x: 0 })
  return v
}

// a descida pro subúrbio: sai pela faixa da esquerda (o lado de dentro do
// anel), desce passando por baixo do trilho da Linha 9 e encosta no
// subúrbio pelo lado de fora dele, andando no mesmo sentido
function montarDescida(A: Via, B: Via, u: number): { v: Via; e: number } {
  const ini = [em(A, u, -CK), em(A, u + 55, -(CK + 6), -0.6), em(A, u + 120, -(CK + 30), -3)]
  // o ponto do subúrbio mais perto de onde a descida aponta, um pouco à frente
  const alvo = em(A, u + 200, -(CK + 110), 0)
  let melhor = 0, d0 = Infinity
  for (let i = 0; i < B.n; i++) {
    const d = Math.hypot(B.px[i] - alvo.x, B.pz[i] - alvo.z)
    if (d < d0) { d0 = d; melhor = i }
  }
  const e = (melhor * PASSO + 140) % B.L
  const fim = [em(B, e - 150, 46), em(B, e - 90, 14), em(B, e - 35, 1.5), em(B, e, 0)]
  const p = amostrar([...ini, ...fim], false)
  // a curva não passa do chão do subúrbio
  const piso = Math.min(...fim.map((q) => q.y))
  for (let i = 0; i < p.n; i++) p.py[i] = Math.max(p.py[i], piso)
  for (let i = 0; i < p.n; i++) {
    const w = FAIXA / 2 + (MEIA - FAIXA / 2) * suave((i * PASSO) / 90)
    p.esq[i] = -w
    p.dir[i] = w
  }
  for (let i = 0; i < p.n; i++) p.py[i] += 0.04 * suave((i * PASSO - (p.L - 70)) / 50)
  derivar(p, 18, (i) => Math.min(suave((i * PASSO - 90) / 60), suave((p.L - i * PASSO - 160) / 60)))
  const v = via(p, `${A.t}>${B.t}@${u}`, "saida", B.t, A.t)
  v.lado = -1
  v.chega = { u: e, lado: 1 }
  return { v, e }
}

// a estrada do deserto: sai da cidade, vai longe e volta (via aberta)
function montarDeserto(A: Via): Via {
  const u = DESERTO.sai
  const e = DESERTO.chega
  // o centro da cidade neon (o meio do circuito)
  let cx = 0, cz = 0
  for (let i = 0; i < A.n; i++) { cx += A.px[i]; cz += A.pz[i] }
  cx /= A.n
  cz /= A.n
  const ini = [em(A, u, CK), em(A, u + 60, CK + 6, -0.6), em(A, u + 150, CK + 40, -1.6), em(A, u + 260, CK + 110, -2)]
  // a volta pelo deserto: um arco grande em volta da cidade, pelo norte
  const arco: THREE.Vector3[] = []
  const N = 18
  for (let k = 0; k <= N; k++) {
    const th = (-8 - (k * 164) / N) * (Math.PI / 180)
    const R = DESERTO.raio * (1 + 0.06 * Math.sin(k * 1.7))
    // plano, sempre acima da areia (Corrida: o chão do deserto em y -0.25)
    arco.push(V(cx + Math.cos(th) * R, 0.4, cz + Math.sin(th) * R))
  }
  const fim = [em(A, e - 520, 300, 0), em(A, e - 420, 120), em(A, e - 280, 48), em(A, e - 170, 21), em(A, e - 90, 8), em(A, e - 30, 1.2), em(A, e, 0)]
  const p = amostrar([...ini, ...arco, ...fim], false)
  const L = p.L
  // a altura: plana no deserto (0.4, acima da areia) e só nas pontas sobe
  // suave até a pista da cidade (os pontos de ligação herdam a inclinação
  // das curvas dela e faziam a estrada afundar e subir dezenas de metros)
  const y0 = p.py[0]
  const y1 = p.py[p.n - 1]
  for (let i = 0; i < p.n; i++) {
    const u = i * PASSO
    const a = suave(u / 220)
    const b = suave((L - u) / 220)
    p.py[i] = 0.4 + (y0 - 0.4) * (1 - a) + (y1 - 0.4) * (1 - b)
  }
  for (let i = 0; i < p.n; i++) {
    const w = FAIXA / 2 + (MEIA - FAIXA / 2) * suave((i * PASSO) / 110)
    p.esq[i] = -w
    p.dir[i] = w
  }
  for (let i = 0; i < p.n; i++) p.py[i] += 0.04 * suave((i * PASSO - (L - 90)) / 60)
  derivar(p, 14, (i) => Math.min(suave((i * PASSO - 130) / 80), suave((L - i * PASSO - 320) / 80)))
  const v = via(p, "deserto", "saida", "linha", "linha")
  v.lado = 1
  v.chega = { u: e, lado: 1 }
  return v
}

// duas pistas não podem se encostar: onde as projeções se sobrepõem, a
// diferença de altura tem que ser de pelo menos FOLGA. Exceções: a saída
// colada no circuito de onde sai (início) e no de onde chega (fim).
export function conflitos(vias: Via[]): { a: number; b: number; ua: number; ub: number; dy: number }[] {
  const CEL = 30
  const grade = new Map<string, number[]>()
  vias.forEach((v, vi) => {
    for (let i = 0; i < v.n; i += 2) {
      const key = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`
      let l = grade.get(key)
      if (!l) grade.set(key, (l = []))
      l.push(vi, i)
    }
  })
  const achados = new Map<string, { a: number; b: number; ua: number; ub: number; dy: number }>()
  const permitido = (va: Via, ia: number, vb: Via) => {
    if (va.tipo !== "saida") return false
    const u = ia * PASSO
    if (vb.tipo === "circuito" && vb.t === va.de && u < 150) return true
    if (vb.tipo === "circuito" && vb.t === va.t && u > va.L - 300) return true
    return false
  }
  vias.forEach((va, a) => {
    for (let i = 0; i < va.n; i += 2) {
      const cx = Math.floor(va.px[i] / CEL)
      const cz = Math.floor(va.pz[i] / CEL)
      const wa = Math.max(-va.esq[i], va.dir[i]) + 1.5
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const l = grade.get(`${cx + dx},${cz + dz}`)
          if (!l) continue
          for (let q = 0; q < l.length; q += 2) {
            const b = l[q]
            const j = l[q + 1]
            if (b < a) continue
            const vb = vias[b]
            if (b === a) {
              const d = Math.abs(i - j) * PASSO
              if (Math.min(d, va.fechada ? va.L - d : d) < 120) continue
            }
            const wb = Math.max(-vb.esq[j], vb.dir[j]) + 1.5
            if (Math.hypot(va.px[i] - vb.px[j], va.pz[i] - vb.pz[j]) > wa + wb) continue
            const dy = Math.abs(va.py[i] - vb.py[j])
            if (dy >= FOLGA) continue
            if (permitido(va, i, vb) || permitido(vb, j, va)) continue
            const key = `${a}-${b}`
            const ant = achados.get(key)
            if (!ant || dy < ant.dy) achados.set(key, { a, b, ua: i * PASSO, ub: j * PASSO, dy })
          }
        }
    }
  })
  return [...achados.values()]
}

export function montarMundo(): Mundo {
  const circuito = {} as Record<FreqId, number>
  const circs: Via[] = []
  const chegam = (id: FreqId) => TERRITORIOS.filter((o) => saidasDe(o.id).some((s) => s.para === id)).map((o) => o.id)
  TERRITORIOS.forEach((t, k) => {
    circuito[t.id] = circs.length
    circs.push(montarCircuito(t, k, chegam(t.id).length))
  })
  // chegada de cada origem: um ponto só dela, alternando esquerda/direita
  for (const t of TERRITORIOS) {
    const c = circs[circuito[t.id]]
    c.chegadas = chegam(t.id).map((_, k) => ({ u: CHEGADA0 + k * CHEGADA_PASSO, lado: 1 as const }))
  }
  // a volta do deserto chega na cidade (depois das chegadas de sempre)
  circs[circuito.linha].chegadas.push({ u: DESERTO.chega, lado: 1 })
  // monta as saídas; onde duas se encostam, a de maior índice sobe
  const extra = new Map<string, number>()
  let vias: Via[] = []
  let restos: ReturnType<typeof conflitos> = []
  for (let it = 0; it < 16; it++) {
    vias = [...circs]
    circs.forEach((c) => (c.faixas = []))
    {
      const A = circs[circuito.linha]
      const B = circs[circuito.suburbio]
      B.chegadas = B.chegadas.slice(0, chegam("suburbio").length)
      for (const u of DESCIDAS) {
        const { v, e } = montarDescida(A, B, u)
        A.faixas.push({ para: "suburbio", via: vias.length, u, lado: -1 })
        B.chegadas.push({ u: e, lado: 1 })
        vias.push(v)
      }
    }
    {
      const A = circs[circuito.linha]
      A.faixas.push({ para: "linha", via: vias.length, u: DESERTO.sai, lado: 1 })
      vias.push(montarDeserto(A))
    }
    for (const t of TERRITORIOS) {
      const A = circs[circuito[t.id]]
      for (const s of saidasDe(t.id)) {
        const B = circs[circuito[s.para]]
        const k = chegam(s.para).indexOf(t.id)
        const id = `${t.id}>${s.para}`
        A.faixas.push({ para: s.para, via: vias.length, u: A.L - SPLITS[s.split], lado: s.lado })
        vias.push(montarSaida(A, B, s, B.chegadas[k].u, extra.get(id) ?? 0))
      }
    }
    restos = conflitos(vias)
    const mexer = restos.filter((c) => vias[c.b].tipo === "saida" || vias[c.a].tipo === "saida")
    if (!mexer.length) break
    // sobe o viaduto da que está mais no meio do caminho (é o meio que o
    // ajuste levanta)
    for (const c of mexer) {
      const va = vias[c.a]
      const vb = vias[c.b]
      const meio = (v: Via, u: number) => (v.tipo === "saida" ? Math.abs(u / v.L - 0.5) : 9)
      const alvo = meio(va, c.ua) <= meio(vb, c.ub) ? va : vb
      extra.set(alvo.id, (extra.get(alvo.id) ?? 0) + 8)
    }
  }

  // grade espacial das amostras: pra cidade não nascer em cima da pista
  const CEL = 40
  const grade = new Map<string, number[]>()
  for (const v of vias) {
    for (let i = 0; i < v.n; i += 3) {
      const key = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`
      let l = grade.get(key)
      if (!l) grade.set(key, (l = []))
      l.push(v.px[i], v.pz[i], Math.max(-v.esq[i], v.dir[i]), v.py[i])
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
        for (let q = 0; q < l.length; q += 4) if (Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + folga) return false
      }
    return true
  }
  const vao = (x: number, z: number, y: number) => {
    const cx = Math.floor(x / CEL)
    const cz = Math.floor(z / CEL)
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++) {
        const l = grade.get(`${cx + a},${cz + b}`)
        if (!l) continue
        for (let q = 0; q < l.length; q += 4) if (l[q + 3] < y - 3 && Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + 2) return false
      }
    return true
  }
  const nomes = restos.map((c) => `${vias[c.a].id}@${Math.round(c.ua)} × ${vias[c.b].id}@${Math.round(c.ub)} (dy ${c.dy.toFixed(1)})`)
  return { vias, circuito, livre, vao, conflitos: nomes }
}

// saída que o carro pega ao cruzar u0→u1 na posição lateral x (null = fica).
// `escolha` = o lado que a pessoa já marcou antes da bifurcação: vale mesmo
// que o carro não tenha chegado inteiro na faixa (era isso que travava)
export function saidaEm(v: Via, u0: number, u1: number, x: number, aberta: (f: Faixa) => boolean, escolha = 0): Faixa | null {
  for (const f of v.faixas) {
    if (!(u0 < f.u && u1 >= f.u)) continue
    if ((f.lado * x > MEIA * 0.55 || f.lado === escolha) && aberta(f)) return f
  }
  return null
}

// qual lugar a próxima saída tem que ser pra chegar em `alvo` saindo de
// `aqui`: o centro liga com todo mundo; os outros ligam com o centro e com
// o vizinho do anel
export function rumo(aqui: FreqId, alvo: FreqId): FreqId | null {
  if (aqui === alvo) return null
  if (aqui === "linha" || PROXIMO[aqui] === alvo) return alvo
  return "linha"
}
