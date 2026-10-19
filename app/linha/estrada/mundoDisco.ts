// O MAPA É UM DISCO (LU2CA 18/10): cada pista é uma faixa do Vol.1, saindo
// da torre no centro da cidade. A vista de cima é EXATAMENTE o desenho dele
// (polvo-desenho.json, feito no editor); a altura é nossa: todas as pistas
// sobem e descem (gente que vive nos altos e baixos) sem nunca encostar uma
// na outra. Decisões: ~/vault/projetos/cidade-neon/mapa-disco-decisoes.md
//
// Cada pista vira quatro vias de mão única, no formato das ruas do mapa novo
// (mundoRede.ts), pra o carro, a rota, o trânsito e os lugares funcionarem
// igual:
//   ida (2 faixas, à direita do traçado) → balão da ponta → volta (2 faixas,
//   do outro lado) → balão da torre → ida de novo
// e na torre, no fim da volta, a outra opção: a rampa pro andar de cima.
// A linha contínua do meio é parede (a pista é de Gran Turismo: parede
// invisível segura a Kombi no percurso; quem quiser sair, voa).

import * as THREE from "three"
import { amostrar, derivar, type Pista } from "./pista"
import type { Mundo, Onde, Via } from "./mundo"
import type { MundoRede, Projecao } from "./mundoRede"
import type { Rede } from "../rede/rede"
import type { FreqId } from "../radio"
import { CANTEIROS } from "./canteiros"
import DESENHO from "./polvo-desenho.json"

const MEIA_MAO = 4.2 // meia largura de cada mão (2 faixas)
const ESCALA = DESENHO.escala_km // metros por unidade do desenho (1000 unidades = escala_km km)
const ANDAR = 9 // altura entre os andares da torre
const ANDAR0 = 8 // o primeiro andar
const FOLGA = 9 // altura livre mínima onde duas pistas se cruzam
const RAMPA_MAX = 0.075 // inclinação máxima (7,5%)
const CHAO = -12 // o deserto embaixo de tudo
const R_BALAO = 45 // raio do balão (a 200 km/h, com a curva deitada)
const D_BALAO = 100 // do fim da pista até o centro do balão
// o balão da torre é o box: curto e fechado (passa devagar), pra os andares
// empilhados não ocuparem o centro inteiro da cidade
const R_TORRE = 20
const D_TORRE = 34

export type DiscoInfo = { pista: number; parte: "ida" | "volta" | "balao" | "torre" | "rampa" }
export type MundoDisco = MundoRede & { disco: true; pistas: { nome: string; cor: string; ida: number; volta: number }[]; info: DiscoInfo[] }

const P = (x: number, y: number) => new THREE.Vector2((x - 500) * ESCALA, (y - 500) * ESCALA)

// o mesmo Catmull-Rom do editor (uniforme), denso, pra o traçado ser o desenho
function tracado(pts: number[][]): THREE.Vector2[] {
  const out: THREE.Vector2[] = []
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[k - 1] || pts[k], p1 = pts[k], p2 = pts[k + 1], p3 = pts[k + 2] || p2
    for (let s = 0; s < 14; s++) {
      const t = s / 14, t2 = t * t, t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
      out.push(P(f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])))
    }
  }
  const u = pts[pts.length - 1]
  out.push(P(u[0], u[1]))
  return out.filter((p, i) => i === 0 || p.distanceTo(out[i - 1]) > 0.5)
}

// reamostra o traçado a cada 2 m: posição, tangente e o comprimento acumulado
function reamostrar(c: THREE.Vector2[]) {
  const acc = [0]
  for (let i = 1; i < c.length; i++) acc.push(acc[i - 1] + c[i].distanceTo(c[i - 1]))
  const L = acc[acc.length - 1], n = Math.floor(L / 2) + 1
  const pos: THREE.Vector2[] = [], tan: THREE.Vector2[] = []
  let j = 0
  for (let k = 0; k < n; k++) {
    const s = Math.min(L, k * 2)
    while (j < c.length - 2 && acc[j + 1] < s) j++
    const t = (s - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j])
    pos.push(c[j].clone().lerp(c[j + 1], t))
  }
  for (let k = 0; k < n; k++) {
    const a = pos[Math.max(0, k - 2)], b = pos[Math.min(n - 1, k + 2)]
    tan.push(b.clone().sub(a).normalize())
  }
  return { pos, tan, L: (n - 1) * 2, n }
}

// a altura de cada pista: ondas próprias + o andar da torre no começo; depois
// as pistas se afastam onde se cruzam (relaxação), sem passar da rampa máxima
function alturas(T: ReturnType<typeof reamostrar>[]) {
  const H = T.map((t, k) => {
    const h = new Float32Array(t.n)
    const a = 0.7 + k * 0.53, b = 1.9 + k * 1.1
    for (let i = 0; i < t.n; i++) {
      const s = i * 2
      const onda = 26 + 11 * Math.sin(s / (140 + k * 9) + a) + 6 * Math.sin(s / (61 + k * 4) + b)
      const torre = ANDAR0 + k * ANDAR
      const w = Math.min(1, s / 260)
      h[i] = torre * (1 - w * w * (3 - 2 * w)) + onda * (w * w * (3 - 2 * w))
    }
    return h
  })
  // os pares de amostras perto o bastante pra encostar (a pista tem ~17 m de largura)
  const CEL = 24
  // as amostras de cada pista + o círculo do balão da ponta (que fica na altura do fim)
  const amostras = T.map((t) => {
    const l: { p: THREE.Vector2; i: number }[] = []
    for (let i = 0; i < t.n; i += 2) l.push({ p: t.pos[i], i })
    const c = t.pos[t.n - 1], f = t.tan[t.n - 1], r = new THREE.Vector2(-f.y, f.x), cb = c.clone().addScaledVector(f, D_BALAO)
    for (let a = 0; a < 12; a++) { const th = (a / 12) * Math.PI * 2; l.push({ p: cb.clone().addScaledVector(r, Math.cos(th) * (R_BALAO + MEIA_MAO)).addScaledVector(f, Math.sin(th) * (R_BALAO + MEIA_MAO)), i: t.n - 1 }) }
    return l
  })
  const grade = new Map<string, number[]>()
  amostras.forEach((l, k) => l.forEach(({ p, i }, q) => { const key = `${Math.floor(p.x / CEL)},${Math.floor(p.y / CEL)}`; let g = grade.get(key); if (!g) grade.set(key, (g = [])); g.push(k, i, q) }))
  const pares: [number, number, number, number][] = []
  amostras.forEach((l, k) => {
    for (const { p: pk, i } of l) {
      const cx = Math.floor(pk.x / CEL), cz = Math.floor(pk.y / CEL)
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = grade.get(`${cx + a},${cz + b}`); if (!l) continue
        for (let q = 0; q < l.length; q += 3) {
          const k2 = l[q], i2 = l[q + 1]
          if (k2 < k || (k2 === k && i2 <= i + 60)) continue // a mesma pista: só se volta sobre si mesma
          if (pk.distanceTo(amostras[k2][l[q + 2]].p) < 24) pares.push([k, i, k2, i2])
        }
      }
    }
  })
  // os balões da torre ficam no andar (altura fixa): a pista que passa perto desvia
  const obst: [number, number, number][] = [] // pista, amostra, altura do obstáculo
  T.forEach((t, k) => {
    const c = t.pos[0], f = t.tan[0].clone().negate(), r = new THREE.Vector2(-f.y, f.x), y = ANDAR0 + k * ANDAR
    const pts: THREE.Vector2[] = []
    for (let q = 0; q <= 6; q++) { const e = q / 6; pts.push(c.clone().addScaledVector(f, D_TORRE * e).addScaledVector(r, (R_TORRE + MEIA_MAO) * Math.sin(Math.PI / 2 * e))); pts.push(c.clone().addScaledVector(f, D_TORRE * e).addScaledVector(r, -(R_TORRE + MEIA_MAO) * Math.sin(Math.PI / 2 * e))) }
    for (let a = 0; a < 12; a++) { const th = (a / 12) * Math.PI * 2; pts.push(c.clone().addScaledVector(f, D_TORRE + Math.cos(th) * (R_TORRE + MEIA_MAO)).addScaledVector(r, Math.sin(th) * (R_TORRE + MEIA_MAO))) }
    for (const p of pts) {
      const cx = Math.floor(p.x / CEL), cz = Math.floor(p.y / CEL)
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const l = grade.get(`${cx + a},${cz + b}`); if (!l) continue
        for (let q = 0; q < l.length; q += 3) {
          const k2 = l[q], i2 = l[q + 1]
          if (k2 === k && i2 < 40) continue // o começo da própria pista sai do balão
          if (p.distanceTo(amostras[k2][l[q + 2]].p) < 24) obst.push([k2, i2, y])
        }
      }
    }
  })
  const SIG = 40 // o empurrão espalha ±80 m
  for (let it = 0; it < 400; it++) {
    let ruim = 0
    for (const [k, i, k2, i2] of pares) {
      const d = H[k][i] - H[k2][i2]
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      // quem já está mais alto sobe, o outro desce (no empate, a pista de número maior sobe)
      const sinal = d > 0 || (d === 0 && k > k2) ? 1 : -1
      const falta = (FOLGA - Math.abs(d)) / 2 + 0.3
      for (const [kk, ii, sg] of [[k, i, sinal], [k2, i2, -sinal]] as const) {
        const h = H[kk]
        for (let j = Math.max(1, ii - 2 * SIG); j < Math.min(h.length, ii + 2 * SIG); j++) h[j] += sg * falta * Math.exp(-0.5 * ((j - ii) / SIG) ** 2)
      }
    }
    for (const [kk, ii, y] of obst) {
      const d = H[kk][ii] - y
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      const sg = d >= 0 ? 1 : -1, falta = FOLGA - Math.abs(d) + 0.3, h = H[kk]
      for (let j = Math.max(1, ii - 2 * SIG); j < Math.min(h.length, ii + 2 * SIG); j++) h[j] += sg * falta * Math.exp(-0.5 * ((j - ii) / SIG) ** 2)
    }
    // a torre fica no andar; a rampa nunca passa de 7,5%; nada abaixo de 4 m
    for (let k = 0; k < H.length; k++) {
      const h = H[k]
      h[0] = ANDAR0 + k * ANDAR
      for (let j = 1; j < h.length; j++) h[j] = Math.max(4, Math.min(h[j], h[j - 1] + RAMPA_MAX * 2), h[j - 1] - RAMPA_MAX * 2)
      for (let j = h.length - 2; j > 0; j--) h[j] = Math.min(Math.max(h[j], h[j + 1] - RAMPA_MAX * 2), h[j + 1] + RAMPA_MAX * 2)
    }
    if (!ruim) break
  }
  for (let k = 0; k < H.length; k++) { const h = H[k]; for (let j = 1; j < h.length; j++) h[j] = Math.max(Math.min(h[j], h[j - 1] + RAMPA_MAX * 2), h[j - 1] - RAMPA_MAX * 2) }
  const sobra = pares.filter(([k, i, k2, i2]) => Math.abs(H[k][i] - H[k2][i2]) < FOLGA - 1).length + obst.filter(([k, i, y]) => Math.abs(H[k][i] - y) < FOLGA - 1).length
  return { H, sobra }
}

// vira via no formato do mapa novo
function viaDe(pts: THREE.Vector3[], id: string, tipo: string, bairro: string): Via {
  const p = amostrar(pts, false) as Pista
  derivar(p, 26)
  for (let i = 0; i < p.n; i++) { p.esq[i] = -MEIA_MAO; p.dir[i] = MEIA_MAO }
  return Object.assign(p, {
    id, tipo: "rua" as const, t: "linha" as FreqId, disco: true,
    estacoes: [], rampas: [], orbs: [] as { u: number; x: number; y?: number }[], turbos: [], faixas: [], chegadas: [], livre: [0, p.L] as [number, number],
    rede: { aresta: 0, ida: true, de: -1, para: -1, par: -1, tipo, bairro },
  }) as unknown as Via
}

let CACHE: MundoDisco | null = null
export function montarMundoDisco(): MundoDisco {
  if (CACHE) return CACHE
  const B = DESENHO.bracos
  const T = B.map((b) => reamostrar(tracado(b.pts)))
  const { H, sobra } = alturas(T)
  const V3 = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, p.y)
  const dir = (t: THREE.Vector2) => new THREE.Vector2(-t.y, t.x) // a direita de quem anda (o x lateral da Corrida)

  const vias: Via[] = []
  const info: DiscoInfo[] = []
  const nos: { saem: number[] }[] = []
  const no = () => (nos.push({ saem: [] }), nos.length - 1)
  const ligar = (vi: number, de: number, para: number) => { const r = vias[vi].rede!; r.de = de; r.para = para; nos[de].saem.push(vi) }
  const pistas: MundoDisco["pistas"] = []
  const andarDe = (k: number) => ANDAR0 + k * ANDAR

  // cada pista: os pontos da ida (à direita do traçado) e da volta (do outro lado)
  const pontas = T.map((t, k) => {
    const h = H[k], ida: THREE.Vector3[] = [], volta: THREE.Vector3[] = []
    // de 3 em 3 amostras, sempre com as duas pontas (a emenda com o balão é exata)
    const idx: number[] = []
    for (let i = 0; i < t.n - 1; i += 3) idx.push(i)
    if (t.n - 1 - idx[idx.length - 1] < 2) idx.pop()
    idx.push(t.n - 1)
    for (const i of idx) { const r = dir(t.tan[i]); ida.push(V3(t.pos[i].clone().addScaledVector(r, MEIA_MAO + 0.2), h[i])) }
    for (const i of [...idx].reverse()) { const r = dir(t.tan[i]); volta.push(V3(t.pos[i].clone().addScaledVector(r, -(MEIA_MAO + 0.2)), h[i])) }
    return { ida, volta }
  })
  // o balão (uma gota): da mão direita abre suave pra fora, contorna o círculo
  // pela frente e volta suave pela mão esquerda. Sem degrau na curvatura
  const balao = (c: THREE.Vector2, t: THREE.Vector2, y: number, olhando: 1 | -1, R = R_BALAO, D = D_BALAO) => {
    const f = t.clone().multiplyScalar(olhando), r = dir(f), W = MEIA_MAO + 0.2, pts: THREE.Vector3[] = []
    const em = (fw: number, lat: number) => V3(c.clone().addScaledVector(f, fw).addScaledVector(r, lat), y)
    const S = 12 // pontos de cada abertura
    for (let q = 0; q <= S; q++) { const k = q / S, e = (1 - Math.cos(Math.PI * k)) / 2; pts.push(em(D * k, W + (R - W) * e)) }
    for (let q = 1; q < 16; q++) { const th = Math.PI / 2 - (q / 16) * Math.PI; pts.push(em(D + R * Math.cos(th), R * Math.sin(th))) }
    for (let q = S; q >= 0; q--) { const k = q / S, e = (1 - Math.cos(Math.PI * k)) / 2; pts.push(em(D * k, -(W + (R - W) * e))) }
    return pts
  }

  const ini: number[] = [], fim: number[] = [] // por pista: o nó onde começa a ida, o nó onde termina a volta
  T.forEach((t, k) => {
    const b = B[k], bairro = b.nome === "Nectar" ? "cidade" : "disco"
    const nIni = no(), nPonta = no(), nPonta2 = no(), nFim = no()
    ini.push(nIni); fim.push(nFim)
    const iIda = vias.push(viaDe(pontas[k].ida, `disco:${k}:ida`, "avenida", bairro)) - 1; info.push({ pista: k, parte: "ida" })
    const iBp = vias.push(viaDe(balao(t.pos[t.n - 1], t.tan[t.n - 1], H[k][t.n - 1], 1), `disco:${k}:balao`, "rampa", "disco")) - 1; info.push({ pista: k, parte: "balao" })
    const iVolta = vias.push(viaDe(pontas[k].volta, `disco:${k}:volta`, "avenida", bairro)) - 1; info.push({ pista: k, parte: "volta" })
    const iBt = vias.push(viaDe(balao(t.pos[0], t.tan[0], andarDe(k), -1, R_TORRE, D_TORRE), `disco:${k}:torre`, "rampa", "disco")) - 1; info.push({ pista: k, parte: "torre" })
    ligar(iIda, nIni, nPonta); ligar(iBp, nPonta, nPonta2); ligar(iVolta, nPonta2, nFim); ligar(iBt, nFim, nIni)
    // a meia-volta: ida e volta são as duas mãos do mesmo traçado
    vias[iIda].rede!.par = iVolta; vias[iVolta].rede!.par = iIda
    pistas.push({ nome: b.nome, cor: b.cor, ida: iIda, volta: iVolta })
  })
  // (19/10) a ligação entre as pistas vem no passo do voo, com a espiral da
  // torre desenhada de verdade: as rampas diretas cruzavam os balões dos andares
  // anéis: colares ao longo das pistas (a partitura de verdade vem com a música)
  for (const p of pistas) for (const vi of [p.ida, p.volta]) {
    const v = vias[vi]
    for (let u = 120; u < v.L - 80; u += 260) for (let q = 0; q < 6; q++) v.orbs.push({ u: u + q * 7, x: ((q % 3) - 1) * 1.4 })
  }

  // a grade das amostras (pra cidade não nascer em cima da pista)
  const CEL = 40
  const grade = new Map<string, number[]>()
  for (const v of vias) for (let i = 0; i < v.n; i += 3) {
    const key = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`
    let l = grade.get(key); if (!l) grade.set(key, (l = []))
    l.push(v.px[i], v.pz[i], MEIA_MAO + 11, v.py[i]) // prédio a 10 m da borda: a câmera passa
  }
  const perto = (x: number, z: number, raio: number, f: (q: number[], k: number) => boolean) => {
    const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL), r = Math.ceil(raio / CEL)
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const l = grade.get(`${cx + a},${cz + b}`); if (!l) continue
      for (let q = 0; q < l.length; q += 4) if (f(l, q)) return true
    }
    return false
  }
  const livre = (x: number, z: number, folga: number) => !perto(x, z, folga + 40, (l, q) => Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + folga)
  const vao = (x: number, z: number, y: number) => !perto(x, z, 40, (l, q) => l[q + 3] < y - 3 && Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + 2)

  // ── onde mora cada coisa: na pista do personagem (fração da ida) ──
  const daPista = (nome: string) => pistas.find((p) => p.nome === nome)!
  const POS: Record<string, [string, number]> = {
    "lugar:bar": ["Copo Americano", 0.82], "lugar:casa-drewboy": ["Sexta-Feira", 0.45], "lugar:balada": ["Sexta-Feira", 0.9], "lugar:beco": ["Sexta-Feira", 0.7],
    "lugar:escondido": ["CHUVA", 0.85], "lugar:topo": ["DopaminA", 0.9], "lugar:casa-shows": ["Sabe Ontem?", 0.88],
    "lugar:posto": ["Nectar", 0.3], "lugar:plataforma": ["Nectar", 0.7], "lugar:casa-dbee": ["Ojalá", 0.94],
    "pagina:oficina": ["Copo Americano", 0.35], "pagina:fliperama": ["DopaminA", 0.55], "pagina:galeria": ["Swav", 0.6], "pagina:ginasio": ["Rollercoaster", 0.4],
    "pagina:shows": ["Sabe Ontem?", 0.6], "parque": ["Rollercoaster", 0.8],
    "bomba:bomba-mirante": ["Swav", 0.3], "bomba:bomba-arena": ["Rollercoaster", 0.6], "bomba:bomba-avenida": ["Ojalá", 0.5],
  }
  const tabela = new Map<string, Onde>()
  for (const [k, [nome, f]] of Object.entries(POS)) { const vi = daPista(nome).ida; tabela.set(k, { via: vi, u: vias[vi].L * f, lado: 1 }) }
  // a pista da Nectar é a das flores (LU2CA 18/10): os canteiros moram nela
  const nec = daPista("Nectar")
  CANTEIROS.forEach((c, i) => {
    const vi = i % 2 ? nec.volta : nec.ida, v = vias[vi]
    tabela.set(`flor:${c.id}`, { via: vi, u: v.L * (0.08 + 0.84 * ((Math.floor(i / 2) + 0.5) / Math.ceil(CANTEIROS.length / 2))), lado: 1 })
  })
  // a abertura procura a via "deserto": a ida da Ojalá (a da D-Bee) faz esse papel
  vias[daPista("Ojalá").ida].id = "deserto"

  const onde = (chave: string) => tabela.get(chave) ?? null
  const circuito = { linha: pistas[0].ida, suburbio: daPista("Sexta-Feira").ida, crypto: daPista("DopaminA").ida, live: daPista("Sabe Ontem?").ida, full: daPista("Swav").ida } as Record<FreqId, number>
  const rede: Rede = { nos: [], arestas: [], retornos: [] }
  const saidas = nos.map((n) => n.saem)
  // sem direção livre no disco: nunca é chamado, mas o formato pede
  const projetar = (): Projecao | null => null
  const conflitos = sobra ? [`${sobra} trechos de pista com menos de ${FOLGA - 1} m de folga`] : []
  CACHE = { vias, circuito, livre, vao, conflitos, onde, ligacoes: { rede, saidas }, chao: () => CHAO, projetar, disco: true, pistas, info }
  return CACHE
}

// a rota no disco: mão única, pelo grafo das vias (o mais curto em metros)
export function calcularRotaDisco(M: MundoDisco, de: { via: number; u: number }, ate: { via: number; u: number }) {
  if (de.via === ate.via && ate.u >= de.u) return { trechos: [{ via: de.via, u0: de.u, u1: ate.u }], metros: ate.u - de.u }
  const { saidas } = M.ligacoes
  const dist = new Map<number, number>(), ant = new Map<number, number>()
  const fila: [number, number][] = []
  for (const vi of saidas[M.vias[de.via].rede!.para] ?? []) { dist.set(vi, M.vias[de.via].L - de.u); fila.push([dist.get(vi)!, vi]) }
  while (fila.length) {
    fila.sort((a, b) => a[0] - b[0])
    const [d, vi] = fila.shift()!
    if (d > (dist.get(vi) ?? Infinity)) continue
    if (vi === ate.via) break
    for (const w of saidas[M.vias[vi].rede!.para] ?? []) {
      const nd = d + M.vias[vi].L
      if (nd < (dist.get(w) ?? Infinity)) { dist.set(w, nd); ant.set(w, vi); fila.push([nd, w]) }
    }
  }
  if (!dist.has(ate.via)) return null
  const cadeia: number[] = []
  for (let v: number | undefined = ate.via; v !== undefined; v = ant.get(v)) cadeia.unshift(v)
  const trechos = [{ via: de.via, u0: de.u, u1: M.vias[de.via].L }]
  for (const vi of cadeia.slice(0, -1)) trechos.push({ via: vi, u0: 0, u1: M.vias[vi].L })
  trechos.push({ via: ate.via, u0: 0, u1: ate.u })
  return { trechos, metros: dist.get(ate.via)! + ate.u }
}

// o chão: deserto até o horizonte
export function geoChaoDisco() {
  const geo = new THREE.PlaneGeometry(9000, 9000, 60, 60)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position, cor = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Z = pos.getZ(i)
    pos.setY(i, CHAO - 0.5 + Math.sin(X * 0.004) * Math.cos(Z * 0.005) * 2.5)
    const n = 0.85 + ((Math.sin(X * 0.013) + Math.cos(Z * 0.011)) * 0.5 + 1) * 0.08
    cor[i * 3] = 0.62 * n; cor[i * 3 + 1] = 0.44 * n; cor[i * 3 + 2] = 0.27 * n
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3)); geo.computeVertexNormals()
  return geo
}
