// A VIDA NAS RUÍNAS DO SUBÚRBIO (05/11). Bíblia, 4: "o subúrbio é exponencial,
// é onde rola toda a vida". Aqui mora só a lógica (sem React): onde a gente
// anda, onde para pra conversar, quem dança no palco. O desenho (uma malha
// instanciada, a animação no vertex shader) fica em VidaSuburbio.tsx.
//
// AS RUAS. As ruínas (ruinasDados.ts) são quadras de 40 m com ruas de 12 m numa
// grade; os eixos ficam em x = -948 + 52·i e z = -732 + 52·j. Cada trecho de rua
// entre dois cruzamentos vira uma aresta com duas calçadas (a 4 m do eixo de
// cada lado). Uma calçada só vale se nenhum ponto dela (de 3 em 3 m) cai em
// pista/torre (M.livre), numa caixa de colisão das ruínas ou num lugar do chão
// (bar, oficina, palco, quadra, a rampa do túnel, a torre). Quem anda segue a
// calçada até o cruzamento, atravessa (um trecho reto de esquina a esquina) e
// sorteia a próxima rua. Sem física, sem navmesh: segmentos de reta.
//
// QUEM PARA. Grupinhos em volta dos tambores de fogo (luzesRuinas.ts), na porta
// do bar e dançando na frente do palco (no BPM da rádio: VidaSuburbio.tsx).

import { MEIA_RUA, VOLTA_RUA } from "../disco/corridaRua"
import { CHAO_LUGARES, GIRO_BAR, SUBURBIO } from "../disco/historia"
import { naBocaLocal, BOCA } from "./chao"
import type { LuzesRuinas } from "./luzesRuinas"
import type { NivelQualidade } from "./qualidade"

type MundoMin = { livre: (x: number, z: number, folga: number) => boolean; chao: (x: number, z: number) => number }

// ── quanto de cada coisa, por nível de qualidade ("baixo" = leve) ──
export const QUANTO: Record<NivelQualidade, { andantes: number; fogo: number; bar: number; palco: number; bichos: number; roupas: number; fumaca: number; tambores: number }> = {
  //      gente andando, tambores com roda, gente no bar e no palco, bichos, varais de roupa, fumaça por tambor (e em quantos tambores)
  // (09/11, o povo) andantes, bar e palco são o TETO, com o povo todo: quanto aparece
  // vem da história (VIDA_POVO). No celular (médio e leve) a soma é a mesma de antes:
  // a plateia do palco cresce trocando com quem anda, nunca mais gente no total
  alto: { andantes: 90, fogo: 10, bar: 14, palco: 40, bichos: 8, roupas: 22, fumaca: 3, tambores: 41 },
  medio: { andantes: 44, fogo: 8, bar: 7, palco: 18, bichos: 6, roupas: 14, fumaca: 2, tambores: 24 },
  baixo: { andantes: 22, fogo: 4, bar: 5, palco: 11, bichos: 3, roupas: 6, fumaca: 1, tambores: 12 },
}

export const EIXOS = { x0: -948, z0: -732, passo: 52 }
const CALCADA = 4 // a calçada: a 4 m do eixo (a rua tem 6 m de meia largura)
const BORDA = 5 // a calçada para a 5 m do cruzamento (dali atravessa)
const AMOSTRA = 3

export type No = { x: number; z: number; ar: number[] }
export type Aresta = {
  a: number; b: number; ux: number; uz: number; L: number
  // as duas calçadas (lado -1 e +1): vale? e a altura do chão de 3 em 3 m
  ok: [boolean, boolean]; alt: [Float32Array, Float32Array]
  // alguma calçada dela fica no traçado da corrida de rua (durante a corrida ninguém entra)
  corrida: boolean
}
export type Ruas = { nos: No[]; ar: Aresta[] }

export function semente(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// dentro de alguma caixa de colisão das ruínas (com folga)? (o formato de ruinas.ts: 9 números por caixa)
export function dentroDasRuinas(colisores: number[], x: number, z: number, folga: number) {
  for (let k = 0; k < colisores.length; k += 9) {
    const dx = x - colisores[k], dz = z - colisores[k + 1]
    const r = colisores[k + 4] + colisores[k + 5] + folga
    if (dx * dx + dz * dz > r * r) continue
    const s = colisores[k + 2], c = colisores[k + 3]
    const lx = dx * c - dz * s, lz = dx * s + dz * c
    if (Math.abs(lx) < colisores[k + 4] + folga && Math.abs(lz) < colisores[k + 5] + folga) return true
  }
  return false
}

// perto de um lugar do chão (a fachada, o tablado, a quadra, a rampa)?
const RAIO_LUGAR: Partial<Record<keyof typeof CHAO_LUGARES, number>> = { bar: 10, oficina: 11, palco: 10, quadra: 22, torre: 9, goteira: 4 }
export function noLugar(x: number, z: number, folga = 0) {
  for (const [id, r] of Object.entries(RAIO_LUGAR)) {
    const l = CHAO_LUGARES[id as keyof typeof CHAO_LUGARES]
    const rr = r! + folga
    if ((x - l.x) ** 2 + (z - l.z) ** 2 < rr * rr) return true
  }
  const { s, v } = naBocaLocal(x, z)
  return s > -BOCA.comp - 4 - folga && s < BOCA.tunel + 2 && Math.abs(v) < BOCA.meia + 3 + folga
}

const livreAPe = (M: MundoMin, colisores: number[], x: number, z: number) =>
  M.livre(x, z, 1.2) && !dentroDasRuinas(colisores, x, z, 0.8) && !noLugar(x, z)

// ── O TRAÇADO DA CORRIDA DE RUA (disco/corridaRua.ts): uma grade de 4 m no
// subúrbio marcando o que fica a menos de MEIA_RUA + 2,5 m da linha do meio.
// Feita uma vez (os ~800 pontos da volta carimbam a vizinhança); depois, uma
// leitura por pessoa por quadro, só durante a corrida ──
const GR = { x0: SUBURBIO.x - SUBURBIO.r - 20, z0: SUBURBIO.z - SUBURBIO.r - 20, cel: 4, n: Math.ceil((SUBURBIO.r * 2 + 40) / 4) }
let grade: Uint8Array | null = null
function gradeCorrida() {
  if (grade) return grade
  const g = new Uint8Array(GR.n * GR.n)
  const raio = MEIA_RUA + 2.5, rc = Math.ceil(raio / GR.cel)
  for (const p of VOLTA_RUA) {
    const ci = Math.floor((p.x - GR.x0) / GR.cel), cj = Math.floor((p.z - GR.z0) / GR.cel)
    for (let i = ci - rc; i <= ci + rc; i++) for (let j = cj - rc; j <= cj + rc; j++) {
      if (i < 0 || j < 0 || i >= GR.n || j >= GR.n) continue
      const cx = GR.x0 + (i + 0.5) * GR.cel, cz = GR.z0 + (j + 0.5) * GR.cel
      if ((cx - p.x) ** 2 + (cz - p.z) ** 2 < (raio + GR.cel * 0.5) ** 2) g[j * GR.n + i] = 1
    }
  }
  return (grade = g)
}
export function naCorrida(x: number, z: number) {
  const g = gradeCorrida()
  const i = Math.floor((x - GR.x0) / GR.cel), j = Math.floor((z - GR.z0) / GR.cel)
  return i >= 0 && j >= 0 && i < GR.n && j < GR.n && g[j * GR.n + i] === 1
}

// ── a grade de ruas (uma vez por mundo) ──
const cacheRuas = new WeakMap<object, Ruas>()
export function ruasDoSuburbio(M: MundoMin, colisores: number[]): Ruas {
  const ja = cacheRuas.get(M)
  if (ja) return ja
  const R = SUBURBIO.r - 14
  const nos: No[] = []
  const idx = new Map<string, number>()
  for (let i = -2; i <= 12; i++) for (let j = -7; j <= 7; j++) {
    const x = EIXOS.x0 + EIXOS.passo * i, z = EIXOS.z0 + EIXOS.passo * j
    if ((x - SUBURBIO.x) ** 2 + (z - SUBURBIO.z) ** 2 > R * R) continue
    // o cruzamento é onde se atravessa: sem pilar de pista nem lugar no meio
    if (!M.livre(x, z, 2.5) || noLugar(x, z)) continue
    idx.set(`${i}:${j}`, nos.length)
    nos.push({ x, z, ar: [] })
  }
  const ar: Aresta[] = []
  for (const [k, a] of idx) {
    const [i, j] = k.split(":").map(Number)
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      const b = idx.get(`${i + di}:${j + dj}`)
      if (b === undefined) continue
      const A = nos[a], B = nos[b]
      const L = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / L, uz = (B.z - A.z) / L
      const n = Math.ceil((L - 2 * BORDA) / AMOSTRA)
      const ok: [boolean, boolean] = [true, true]
      const alt: [Float32Array, Float32Array] = [new Float32Array(n + 1), new Float32Array(n + 1)]
      for (let q = 0; q < 2; q++) {
        const s = q ? 1 : -1
        for (let m = 0; m <= n; m++) {
          const t = Math.min(L - BORDA, BORDA + m * AMOSTRA)
          const x = A.x + ux * t - uz * s * CALCADA, z = A.z + uz * t + ux * s * CALCADA
          if (!livreAPe(M, colisores, x, z)) { ok[q] = false; break }
          alt[q][m] = M.chao(x, z)
        }
      }
      if (!ok[0] && !ok[1]) continue
      let corrida = false
      for (let t = BORDA; t <= L - BORDA && !corrida; t += AMOSTRA) corrida = naCorrida(A.x + ux * t, A.z + uz * t)
      const e = ar.length
      ar.push({ a, b, ux, uz, L, ok, alt, corrida })
      A.ar.push(e); B.ar.push(e)
    }
  }
  const r = { nos, ar }
  cacheRuas.set(M, r)
  return r
}

// o ponto da calçada: aresta, lado (0/1), distância desde `a` (t)
export function naCalcada(R: Ruas, e: number, q: number, t: number, out: { x: number; y: number; z: number }, cal = CALCADA) {
  const E = R.ar[e], A = R.nos[E.a], s = q ? 1 : -1
  out.x = A.x + E.ux * t - E.uz * s * cal
  out.z = A.z + E.uz * t + E.ux * s * cal
  const f = Math.max(0, (t - BORDA) / AMOSTRA), alt = E.alt[q], m = Math.min(alt.length - 2, Math.floor(f))
  const w = Math.min(1, f - m)
  out.y = alt[m] * (1 - w) + alt[m + 1] * w
  return out
}

// ── QUEM ANDA (gente e bicho: o mesmo andar) ──
export type Andante = {
  // a pose (o que o desenho lê)
  x: number; y: number; z: number; rumo: number
  // o trecho de agora: calçada (e >= 0) ou travessia (e = -1, de (x0,z0,y0) a (x1,z1,y1))
  e: number; q: number; dir: 1 | -1; t: number; len: number
  x0: number; z0: number; y0: number; x1: number; z1: number; y1: number
  no: number // o cruzamento no fim da calçada
  v: number // velocidade de passeio (m/s)
  vAgora: number
  fase: number // o passo (radianos, o shader balança as pernas com isso)
  semente: number // 0–1: a cor, o corpo, o jeito
  escala: number
  cal: number // a distância da calçada até o eixo
  vis: number // 0–1: aparece/some encolhendo
  desvio: number // o passo de lado pra abrir caminho (m, pra direita do rumo)
  espera: number // quanto tempo está parado esperando o jogador passar (s)
  turno: number // 1 na rua, 0 em casa (dia e noite: queNoTurno)
}

const _p = { x: 0, y: 0, z: 0 }

function comecarCalcada(R: Ruas, w: Andante, e: number, q: number, de: number) {
  const E = R.ar[e]
  w.e = e; w.q = q
  w.dir = E.a === de ? 1 : -1
  w.no = E.a === de ? E.b : E.a
  w.len = E.L - 2 * BORDA
  w.t = 0
}

// o ponto onde começa a calçada (e, q) saindo do nó `de`
function inicioDaCalcada(R: Ruas, e: number, q: number, de: number, cal: number) {
  const E = R.ar[e]
  return naCalcada(R, e, q, E.a === de ? BORDA : E.L - BORDA, _p, cal)
}

// chegou no cruzamento: sorteia a próxima rua (não volta, se der) e atravessa até ela
function proximaRua(R: Ruas, w: Andante, rnd: () => number, evitar?: (e: number) => boolean) {
  const N = R.nos[w.no]
  const veio = w.e
  let opc = N.ar.filter((e) => e !== veio && !(evitar && evitar(e)))
  if (!opc.length) opc = N.ar.filter((e) => !(evitar && evitar(e)))
  if (!opc.length) opc = N.ar
  const e2 = opc[Math.floor(rnd() * opc.length)]
  const E2 = R.ar[e2]
  const q2 = E2.ok[0] && E2.ok[1] ? (rnd() < 0.5 ? 0 : 1) : E2.ok[1] ? 1 : 0
  const de = w.no
  // a travessia: daqui até o começo da próxima calçada
  const ini = inicioDaCalcada(R, e2, q2, de, w.cal)
  w.x0 = w.x; w.z0 = w.z; w.y0 = w.y
  w.x1 = ini.x; w.z1 = ini.z; w.y1 = ini.y
  const L = Math.hypot(w.x1 - w.x0, w.z1 - w.z0)
  // guarda a calçada que vem (e2, q2, de) no próprio andante: e = -1 até chegar
  comecarCalcada(R, w, e2, q2, de)
  if (L > 0.3) { w.len = L; w.t = 0; w.e = -1 - e2 } // (e < 0: atravessando rumo a -1-e)
}

export function criarAndantes(R: Ruas, n: number, rnd: () => number, bicho = false): Andante[] {
  const out: Andante[] = []
  if (!R.ar.length) return out
  for (let k = 0; k < n; k++) {
    let e = 0, q = 0
    for (let tent = 0; tent < 20; tent++) {
      e = Math.floor(rnd() * R.ar.length)
      const E = R.ar[e]
      q = E.ok[0] && E.ok[1] ? (rnd() < 0.5 ? 0 : 1) : E.ok[1] ? 1 : 0
      if (E.ok[q]) break
    }
    const E = R.ar[e]
    const sem = rnd()
    const w: Andante = {
      x: 0, y: 0, z: 0, rumo: 0, e: 0, q: 0, dir: 1, t: 0, len: 1, x0: 0, z0: 0, y0: 0, x1: 0, z1: 0, y1: 0, no: 0,
      v: bicho ? 0.7 + rnd() * 0.9 : 1.05 + rnd() * 0.5, vAgora: 0, fase: rnd() * 6.28, semente: sem,
      escala: bicho ? 1 : 0.92 + rnd() * 0.16, cal: bicho ? 5.2 : CALCADA - 0.6 + rnd() * 1.2, vis: 1, desvio: 0, espera: 0, turno: 1,
    }
    comecarCalcada(R, w, e, q, rnd() < 0.5 ? E.a : E.b)
    w.t = rnd() * w.len
    posicionar(R, w)
    out.push(w)
  }
  return out
}

// a pose no trecho de agora (sem o desvio)
export function posicionar(R: Ruas, w: Andante) {
  if (w.e < 0) {
    const f = w.t / w.len
    w.x = w.x0 + (w.x1 - w.x0) * f; w.z = w.z0 + (w.z1 - w.z0) * f; w.y = w.y0 + (w.y1 - w.y0) * f
    w.rumo = Math.atan2(w.x1 - w.x0, w.z1 - w.z0)
    return
  }
  const E = R.ar[w.e]
  const tE = w.dir > 0 ? BORDA + w.t : E.L - BORDA - w.t
  naCalcada(R, w.e, w.q, tE, _p, w.cal)
  w.x = _p.x; w.y = _p.y; w.z = _p.z
  w.rumo = Math.atan2(E.ux * w.dir, E.uz * w.dir)
}

// anda `d` metros (troca de trecho quando acaba)
export function andar(R: Ruas, w: Andante, d: number, rnd: () => number, evitar?: (e: number) => boolean) {
  w.t += d
  let guarda = 0
  while (w.t >= w.len && guarda++ < 3) {
    const sobra = w.t - w.len
    if (w.e < 0) {
      // acabou a travessia: entra na calçada guardada
      w.e = -1 - w.e
      w.len = R.ar[w.e].L - 2 * BORDA
      w.t = sobra
    } else {
      proximaRua(R, w, rnd, evitar)
      w.t = sobra
    }
  }
  posicionar(R, w)
}

// ── QUEM PARA: os grupinhos (fogo, bar) e quem dança no palco ──
// modo 1: conversando (parado, gesticula); 2: dançando; quando: 0 fogo, 1 bar, 2 palco
// `ordem` (09/11, o povo): 0–1, quem chega primeiro; só aparece quem tem ordem <= o povo de agora
export type Parado = { x: number; y: number; z: number; rumo: number; modo: 1 | 2; quando: 0 | 1 | 2; semente: number; escala: number; vis: number; dx: number; dz: number; turno: number; ordem: number }

// ── DIA E NOITE (n = U.noite das luzes das ruínas: 0 de dia, 1 de noite) ──
// De dia a rua é cheia: todo mundo que anda, uns poucos na porta do bar e uns
// dançando no palco. De noite quase dois terços de quem anda vai pra casa, e
// acendem as rodas no fogo, o bar enche e o palco lota. Cada um tem a sua hora
// (pela semente), então a troca é aos poucos, entre 17 h e 19 h.
const hora = (semente: number) => (semente * 7.31 + 0.17) % 1
export function querNaRua(quem: "andante" | 0 | 1 | 2, semente: number, n: number, povo = 0) {
  const h = hora(semente)
  if (quem === "andante") return h > 0.62 * n ? 1 : 0
  if (quem === 0) return n > 0.25 + 0.5 * h ? 1 : 0 // o fogo
  // (o povo) quanto mais gente com a gente, mais fica de dia também
  if (quem === 1) return h < 0.4 + 0.3 * povo || n > 0.2 + 0.6 * h ? 1 : 0 // o bar
  return h < 0.25 + 0.5 * povo || n > 0.2 + 0.6 * h ? 1 : 0 // o palco
}
// quem está perto da câmera não some nem aparece do nada (só troca de turno
// longe, a mais de 40 m): ninguém encolhe na cara do jogador
export function trocarTurno(o: { turno: number; x: number; z: number }, quer: number, cx: number, cz: number) {
  if (quer !== o.turno && (o.x - cx) ** 2 + (o.z - cz) ** 2 > 1600) o.turno = quer
  return o.turno
}

// ── ABRIR CAMINHO (sem física): o jogador a menos de 3 m ──
// Quem anda e vê o jogador na frente para (até 2,5 s; depois segue, já de lado)
// e dá um passo de lado, pro lado contrário dele. Quem está parado recua um pouco.
// Devolve a velocidade de agora (o desenho soma o desvio na pose).
export const PERTO_JOGADOR = 3
export function abrirCaminho(w: Andante, px: number, pz: number, dt: number) {
  const dx = w.x - px, dz = w.z - pz, d2 = dx * dx + dz * dz
  const fx = Math.sin(w.rumo), fz = Math.cos(w.rumo)
  let alvoV = w.v, alvoD = 0
  if (d2 < PERTO_JOGADOR * PERTO_JOGADOR) {
    const d = Math.sqrt(d2)
    // a direita do rumo é (fz, -fx); o desvio vai pro lado de lá do jogador
    const lado = dx * fz - dz * fx >= 0 ? 1 : -1
    alvoD = (lado * (PERTO_JOGADOR - d) * 1.7) / PERTO_JOGADOR + lado * 0.5
    if (-(dx * fx + dz * fz) > 0 && w.espera < 2.5) { alvoV = 0; w.espera += dt }
  } else w.espera = Math.max(0, w.espera - dt)
  w.desvio += (Math.max(-2, Math.min(2, alvoD)) - w.desvio) * Math.min(1, dt * 3)
  w.vAgora += (alvoV - w.vAgora) * Math.min(1, dt * 5)
}
export function recuar(p: { x: number; z: number; dx: number; dz: number }, px: number, pz: number, dt: number) {
  const dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz)
  let ax = 0, az = 0
  if (d < PERTO_JOGADOR && d > 0.01) { const f = Math.min(1, (PERTO_JOGADOR - d) * 0.6) / d; ax = dx * f; az = dz * f }
  const k = Math.min(1, dt * 3)
  p.dx += (ax - p.dx) * k; p.dz += (az - p.dz) * k
}

export function criarParados(M: MundoMin, colisores: number[], luzes: LuzesRuinas, Q: (typeof QUANTO)["alto"], rnd: () => number): Parado[] {
  const out: Parado[] = []
  const pode = (x: number, z: number) => M.livre(x, z, 0.6) && !dentroDasRuinas(colisores, x, z, 0.35)
  const pessoa = (x: number, z: number, olhaX: number, olhaZ: number, modo: 1 | 2, quando: 0 | 1 | 2, ordem = 0) =>
    out.push({ x, y: M.chao(x, z), z, rumo: Math.atan2(olhaX - x, olhaZ - z), modo, quando, semente: rnd(), escala: 0.92 + rnd() * 0.16, vis: 1, dx: 0, dz: 0, turno: 1, ordem })

  // em volta do fogo: os tambores mais perto do bar (onde a vida acontece), um por roda
  const bar = CHAO_LUGARES.bar
  const tambores = [...luzes.tambores].sort((a, b) => (a.x - bar.x) ** 2 + (a.z - bar.z) ** 2 - ((b.x - bar.x) ** 2 + (b.z - bar.z) ** 2))
  const rodas: { x: number; z: number }[] = []
  for (const t of tambores) {
    if (rodas.length >= Q.fogo) break
    if (rodas.some((r) => (r.x - t.x) ** 2 + (r.z - t.z) ** 2 < 16)) continue
    const n = 2 + Math.floor(rnd() * 3)
    const a0 = rnd() * 6.28
    let pos = 0
    for (let k = 0; k < 7 && pos < n; k++) {
      const a = a0 + (k * 6.28) / 7 + (rnd() - 0.5) * 0.3
      const r = 1.15 + rnd() * 0.3
      const x = t.x + Math.sin(a) * r, z = t.z + Math.cos(a) * r
      if (!pode(x, z)) continue
      pessoa(x, z, t.x, t.z, 1, 0)
      pos++
    }
    if (pos) rodas.push({ x: t.x, z: t.z })
  }

  // na porta do bar: rodinhas de 2 a 4 na calçada da frente (a porta vira pro deserto)
  const rot = GIRO_BAR, fx = Math.sin(rot), fz = Math.cos(rot), rx = Math.cos(rot), rz = -Math.sin(rot)
  const lugaresBar = [[-4.5, 7.5], [1.5, 9.5], [5.5, 6.8], [-1, 13], [7, 12]]
  let noBar = 0
  for (const [lx, lf] of lugaresBar) {
    if (noBar >= Q.bar) break
    const cx = bar.x + rx * lx + fx * lf, cz = bar.z + rz * lx + fz * lf
    const n = Math.min(Q.bar - noBar, 2 + Math.floor(rnd() * 3))
    const a0 = rnd() * 6.28
    for (let k = 0; k < n; k++) {
      const a = a0 + (k * 6.28) / n
      const x = cx + Math.sin(a) * 0.75, z = cz + Math.cos(a) * 0.75
      if (!pode(x, z)) continue
      pessoa(x, z, cx, cz, 1, 1, noBar / Q.bar)
      noBar++
    }
  }

  // na frente do palco, dançando (de frente pro tablado). (o povo) a ordem é da frente
  // pro fundo: os primeiros colam no tablado, os últimos lotam a rua lá atrás
  const pl = CHAO_LUGARES.palco
  const prot = Math.atan2(-pl.x, -pl.z), pfx = Math.sin(prot), pfz = Math.cos(prot), prx = Math.cos(prot), prz = -Math.sin(prot)
  for (let k = 0, tent = 0; k < Q.palco && tent < Q.palco * 4; tent++) {
    const ordem = k / Q.palco
    const lx = (rnd() * 2 - 1) * (5.5 + ordem * 6), lf = 6.5 + ordem * 13 + (rnd() - 0.5) * 2
    const x = pl.x + prx * lx + pfx * lf, z = pl.z + prz * lx + pfz * lf
    if (!pode(x, z) || out.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 0.8)) continue
    pessoa(x, z, pl.x + prx * lx * 0.5, pl.z + prz * lx * 0.5, 2, 2, ordem)
    k++
  }
  return out
}
