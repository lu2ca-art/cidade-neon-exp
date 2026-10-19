// O MAPA É UM DISCO (LU2CA 18/10): cada pista é uma faixa do Vol.1, saindo
// da torre no centro da cidade. A vista de cima é o desenho dele
// (polvo-desenho.json, feito no editor); a altura é nossa: todas as pistas
// sobem e descem (gente que vive nos altos e baixos) sem nunca encostar uma
// na outra. Decisões: ~/vault/projetos/cidade-neon/mapa-disco-decisoes.md
//
// Cada pista é UMA estrada de 4 faixas (2 por sentido, canteiro aberto, as 4
// na mesma altura e deitando juntas na curva). Por baixo, como as ruas do mapa
// novo (mundoRede.ts), são vias de mão única no mesmo eixo.
//
// A TORRE (LU2CA 19/10: "as pistas começam em volta da torre, da mesma maneira
// que terminam, numa rotatória; a espiral liga todos os andares"):
//   - a espiral de fora sobe em volta da torre (mão única). Cada linha se liga
//     nela no seu ângulo: a alça de entrada (quem chega da pista) e, logo
//     depois, a alça de saída (quem vai pra pista). Chegou da sua linha, pode
//     sair nela de novo (outra volta) ou subir até a saída de outra linha
//   - no topo, uma curva leva pra espiral de dentro, que desce até a base e
//     volta pra espiral de fora: dá pra chegar em qualquer andar
// Uma volta na pista (saída → ida → balão → volta → entrada) dura meia música
// na velocidade da pista (2 × BPM km/h): o desenho é aparado ou ampliado.
// As bordas são parede (pista de Gran Turismo: quem quiser sair, voa).

import * as THREE from "three"
import { amostrar, derivar, type Pista } from "./pista"
import type { Onde, Via } from "./mundo"
import type { MundoRede, Projecao } from "./mundoRede"
import type { Rede } from "../rede/rede"
import type { FreqId } from "../radio"
import { CANTEIROS } from "./canteiros"
import { PISTAS, volta as voltaDaMusica } from "./pistas"
import DESENHO from "./polvo-desenho.json"

const MEIA_PISTA = 8.4 // meia largura da pista: 4 faixas, 2 por sentido, canteiro aberto (LU2CA 19/10)
const BANK_K = 46 // quanto a curva deita por unidade de curvatura (Horizon: curva de corrida)
const BANK_MAX = 0.4 // ~23°
const BANK_JAN = 20 // a inclinação entra e sai em ±40 m (amostras de 2 m)
const ESCALA = DESENHO.escala_km // metros por unidade do desenho (1000 unidades = escala_km km)
const FOLGA = 9 // altura livre mínima onde duas pistas se cruzam
const RAMPA_MAX = 0.075 // inclinação máxima (7,5%)
const TETO = 95 // nenhuma pista acima disso
const CHAO = -12 // o deserto embaixo de tudo
const R_BALAO = 45 // raio do balão da ponta (a 200 km/h, com a curva deitada)
const D_BALAO = 100 // do fim da pista até o centro do balão
// a torre
const R_SOBE = 64 // a espiral de fora (sobe), raio do eixo
const R_DESCE = 34 // a espiral de dentro (desce)
const NUCLEO = 16 // o prédio da torre
const PASSO_ESPIRAL = 11 // metros que a espiral sobe por volta (folga entre as voltas)
const Y_BASE = 8 // a base da espiral
const DIST_COMECO = R_SOBE + 64 // a pista começa a esta distância do centro (as alças cabem antes)
const ALCA = 0.42 // rad entre a entrada e a saída de cada linha
const ANTES = 0.42 // a saída fica um pouco antes do ângulo da pista (a alça sai pra frente)
const GAP = 0.5 // rad mínimos entre uma linha e a próxima na espiral
const TRANSF = 0.8 // rad da curva entre as duas espirais
export const V_TORRE = 26 // m/s na torre (~95 km/h): a espiral é de passear

export type ParteDisco = "ida" | "volta" | "balao" | "saida" | "entrada" | "sobe" | "desce" | "transf"
export type DiscoInfo = { pista: number; parte: ParteDisco }
export type CentralDisco = { x: number; z: number; raio: number; nucleo: number; topo: number; andares: { y: number; cor: string; nome: string; ang: number }[] }
// onde a Kombi pousa vindo do ar: a via (no sentido do rumo), o u, o lado e a altura do asfalto
export type Pouso = { via: number; u: number; x: number; y: number; cx: number; cz: number; tx: number; tz: number }
export type MundoDisco = MundoRede & { disco: true; pistas: { nome: string; cor: string; ida: number; volta: number; saida: number; entrada: number; lado: 1 | -1 }[]; info: DiscoInfo[]; central: CentralDisco; pousar: (x: number, z: number, y: number, dx: number, dz: number, margem?: number) => Pouso | null; chaoDeserto: number }
// as partes que são a torre (sem a música da pista)
export const naTorre = (p: ParteDisco | undefined) => p === "entrada" || p === "sobe" || p === "desce" || p === "transf"

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

const comprimento = (c: THREE.Vector2[]) => { let L = 0; for (let i = 1; i < c.length; i++) L += c[i].distanceTo(c[i - 1]); return L }

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
  // (19/10, "fluidez nas curvas") média móvel de ±10 m: tira as quinas do
  // traçado (desvio de 1–2 m nas curvas mais fechadas) e mantém as pontas
  const liso = pos.map((p, k) => {
    if (k < 5 || k > n - 6) return p.clone()
    const m = new THREE.Vector2()
    for (let j = -5; j <= 5; j++) m.add(pos[k + j])
    return m.multiplyScalar(1 / 11)
  })
  for (let k = 0; k < n; k++) pos[k] = liso[k]
  for (let k = 0; k < n; k++) {
    const a = pos[Math.max(0, k - 2)], b = pos[Math.min(n - 1, k + 2)]
    tan.push(b.clone().sub(a).normalize())
  }
  return { pos, tan, L: (n - 1) * 2, n }
}

// o balão da ponta (uma gota): sai do eixo, abre suave, contorna o círculo pela
// frente e volta pro eixo no outro sentido. Sem degrau na curvatura
function gota(c: THREE.Vector2, f: THREE.Vector2, R = R_BALAO, D = D_BALAO) {
  const r = new THREE.Vector2(-f.y, f.x), pts: THREE.Vector2[] = []
  const em = (fw: number, lat: number) => c.clone().addScaledVector(f, fw).addScaledVector(r, lat)
  for (let q = 0; q <= 12; q++) { const k = q / 12, e = (1 - Math.cos(Math.PI * k)) / 2; pts.push(em(D * k, R * e)) }
  for (let q = 1; q < 16; q++) { const th = Math.PI / 2 - (q / 16) * Math.PI; pts.push(em(D + R * Math.cos(th), R * Math.sin(th))) }
  for (let q = 12; q >= 0; q--) { const k = q / 12, e = (1 - Math.cos(Math.PI * k)) / 2; pts.push(em(D * k, -R * e)) }
  return pts
}
const L_GOTA = comprimento(gota(new THREE.Vector2(), new THREE.Vector2(0, 1)))

type Fixo = { p: THREE.Vector2; y: number; pista: number } // um pedaço de pista de altura já decidida (alças)
type Central = { x: number; z: number }

// a altura de cada pista: ondas próprias, começando na altura da alça; depois
// as pistas se afastam onde se cruzam (relaxação), sem passar da rampa máxima
function alturas(T: ReturnType<typeof reamostrar>[], C: Central, hIni: number[], topo: number, fixos: Fixo[]) {
  const H = T.map((t, k) => {
    const h = new Float32Array(t.n)
    const a = 0.7 + k * 0.53, b = 1.9 + k * 1.1
    for (let i = 0; i < t.n; i++) {
      const s = i * 2
      const onda = 26 + 11 * Math.sin(s / (140 + k * 9) + a) + 6 * Math.sin(s / (61 + k * 4) + b)
      const w = Math.min(1, s / 260), e = w * w * (3 - 2 * w)
      h[i] = hIni[k] * (1 - e) + onda * e
    }
    return h
  })
  const CEL = 24
  // as amostras de cada pista + o balão da ponta inteiro (na altura do fim)
  const amostras = T.map((t) => {
    const l: { p: THREE.Vector2; i: number }[] = []
    for (let i = 0; i < t.n; i += 2) l.push({ p: t.pos[i], i })
    for (const p of gota(t.pos[t.n - 1], t.tan[t.n - 1])) l.push({ p, i: t.n - 1 })
    return l
  })
  const grade = new Map<string, number[]>()
  amostras.forEach((l, k) => l.forEach(({ p, i }, q) => { const key = `${Math.floor(p.x / CEL)},${Math.floor(p.y / CEL)}`; let g = grade.get(key); if (!g) grade.set(key, (g = [])); g.push(k, i, q) }))
  const vizinhos = (p: THREE.Vector2, f: (k: number, i: number, q: number) => void) => {
    const cx = Math.floor(p.x / CEL), cz = Math.floor(p.y / CEL)
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = grade.get(`${cx + a},${cz + b}`); if (!l) continue
      for (let q = 0; q < l.length; q += 3) f(l[q], l[q + 1], l[q + 2])
    }
  }
  const pares: [number, number, number, number][] = []
  amostras.forEach((l, k) => {
    for (const { p: pk, i } of l) vizinhos(pk, (k2, i2, q2) => {
      if (k2 < k || (k2 === k && i2 <= i + 60)) return // a mesma pista: só se volta sobre si mesma
      if (pk.distanceTo(amostras[k2][q2].p) < 2 * MEIA_PISTA + 2) pares.push([k, i, k2, i2])
    })
  })
  // a torre: nada passa pelo meio dela; quem cruza passa por cima da espiral
  const coluna: [number, number][] = []
  amostras.forEach((l, k) => { for (const { p, i } of l) if (Math.hypot(p.x - C.x, p.y - C.z) < R_SOBE + MEIA_PISTA + 10) coluna.push([k, i]) })
  // as alças (altura fixa): a pista que passa perto desvia
  const obst: [number, number, number][] = []
  for (const f of fixos) vizinhos(f.p, (k2, i2, q2) => {
    if (k2 === f.pista && i2 < 40) return // a própria pista sai da alça
    if (f.p.distanceTo(amostras[k2][q2].p) < 2 * MEIA_PISTA + 2) obst.push([k2, i2, f.y])
  })
  const empurra = (h: Float32Array, ii: number, v: number, sig: number) => { for (let j = Math.max(1, ii - 2 * sig); j < Math.min(h.length, ii + 2 * sig); j++) h[j] += v * Math.exp(-0.5 * ((j - ii) / sig) ** 2) }
  const rampa = (teto: number) => {
    for (let k = 0; k < H.length; k++) {
      const h = H[k]
      h[0] = hIni[k]
      for (let j = 1; j < h.length; j++) h[j] = Math.max(4, Math.min(teto, h[j], h[j - 1] + RAMPA_MAX * 2), h[j - 1] - RAMPA_MAX * 2)
      for (let j = h.length - 2; j > 0; j--) h[j] = Math.min(Math.max(h[j], h[j + 1] - RAMPA_MAX * 2), h[j + 1] + RAMPA_MAX * 2)
    }
  }
  const SIG = 60
  for (let it = 0; it < 400; it++) {
    let ruim = 0
    for (const [k, i, k2, i2] of pares) {
      const d = H[k][i] - H[k2][i2]
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      // quem já está mais alto sobe, o outro desce; quem está embaixo sem espaço não desce
      const sinal = d > 0 || (d === 0 && k > k2) ? 1 : -1
      const deBaixo = sinal > 0 ? H[k2][i2] : H[k][i]
      const noChao = deBaixo - (FOLGA - Math.abs(d)) / 2 < 4.5
      const falta = (FOLGA - Math.abs(d)) / (noChao ? 1 : 2) + 0.3
      if (!(noChao && sinal < 0)) empurra(H[k], i, sinal * falta, SIG)
      if (!(noChao && -sinal < 0)) empurra(H[k2], i2, -sinal * falta, SIG)
    }
    for (const [kk, ii] of coluna) { const d = H[kk][ii] - topo; if (d < FOLGA) { ruim++; empurra(H[kk], ii, FOLGA - d + 0.3, SIG) } }
    for (const [kk, ii, y] of obst) { const d = H[kk][ii] - y; if (Math.abs(d) < FOLGA) { ruim++; empurra(H[kk], ii, (d >= 0 ? 1 : -1) * (FOLGA - Math.abs(d) + 0.3), SIG) } }
    rampa(Infinity)
    if (!ruim) break
  }
  // 2ª fase: o que ainda encosta, quem está em cima sobe (com teto: aí desce o de baixo)
  for (let it = 0; it < 300; it++) {
    let ruim = 0
    for (const [k, i, k2, i2] of pares) {
      const d = H[k][i] - H[k2][i2]
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      const [ka, ia, kb, ib] = d >= 0 ? [k, i, k2, i2] : [k2, i2, k, i]
      const falta = FOLGA - Math.abs(d) + 0.3
      if (H[ka][ia] + falta <= TETO) empurra(H[ka], ia, falta, SIG); else empurra(H[kb], ib, -falta, SIG)
    }
    for (const [kk, ii] of coluna) { const d = H[kk][ii] - topo; if (d < FOLGA) { ruim++; empurra(H[kk], ii, FOLGA - d + 0.3, SIG) } }
    for (const [kk, ii, y] of obst) { const d = H[kk][ii] - y; if (Math.abs(d) < FOLGA) { ruim++; empurra(H[kk], ii, (d >= 0 ? 1 : -1) * (FOLGA - Math.abs(d) + 0.3), SIG) } }
    rampa(TETO)
    if (!ruim) break
  }
  for (let k = 0; k < H.length; k++) { const h = H[k]; for (let j = 1; j < h.length; j++) h[j] = Math.max(Math.min(h[j], h[j - 1] + RAMPA_MAX * 2), h[j - 1] - RAMPA_MAX * 2) }
  const sobra = pares.filter(([k, i, k2, i2]) => Math.abs(H[k][i] - H[k2][i2]) < FOLGA - 1).length + obst.filter(([k, i, y]) => Math.abs(H[k][i] - y) < FOLGA - 1).length + coluna.filter(([k, i]) => H[k][i] < topo + FOLGA - 1).length
  return { H, sobra }
}

// vira via no formato do mapa novo (plana: a torre não deita na curva)
function viaDe(pts: THREE.Vector3[], id: string, tipo: string, bairro: string, cor: string, plana = false): Via {
  const p = amostrar(pts, false) as Pista
  derivar(p, 0)
  // a inclinação: curvatura suavizada em ±40 m, deita até ~23°, e some nas
  // pontas da via (na emenda com o balão, as duas inclinações batem em zero)
  for (let i = 0; i < p.n; i++) {
    let c = 0, k = 0
    for (let j = Math.max(0, i - BANK_JAN); j <= Math.min(p.n - 1, i + BANK_JAN); j++) { c += p.curv[j]; k++ }
    const borda = Math.min(1, Math.min(i, p.n - 1 - i) / 30)
    p.bank[i] = plana ? 0 : Math.max(-BANK_MAX, Math.min(BANK_MAX, (c / k) * BANK_K)) * borda * borda * (3 - 2 * borda)
    p.esq[i] = -MEIA_PISTA; p.dir[i] = MEIA_PISTA
  }
  return Object.assign(p, {
    id, tipo: "rua" as const, t: "linha" as FreqId, disco: true, cor, // a cor da linha (a do diagrama)
    estacoes: [], rampas: [], orbs: [] as { u: number; x: number; y?: number }[], turbos: [], faixas: [], chegadas: [], livre: [0, p.L] as [number, number],
    rede: { aresta: 0, ida: true, de: -1, para: -1, par: -1, tipo, bairro },
  }) as unknown as Via
}

// uma cúbica de Bézier entre dois pontos com as tangentes dadas (a cada ~2 m)
function bezier(a: THREE.Vector2, ta: THREE.Vector2, b: THREE.Vector2, tb: THREE.Vector2, forca = 0.4) {
  const L = a.distanceTo(b), a1 = a.clone().addScaledVector(ta, L * forca), b1 = b.clone().addScaledVector(tb, -L * forca), pts: THREE.Vector2[] = []
  const n = Math.max(4, Math.ceil(L / 2))
  for (let q = 0; q <= n; q++) {
    const t = q / n, m = 1 - t
    pts.push(a.clone().multiplyScalar(m * m * m).addScaledVector(a1, 3 * m * m * t).addScaledVector(b1, 3 * m * t * t).addScaledVector(b, t * t * t))
  }
  return pts
}

let CACHE: MundoDisco | null = null
export function montarMundoDisco(): MundoDisco {
  if (CACHE) return CACHE
  const B = DESENHO.bracos
  const brutos = B.map((b) => tracado(b.pts))
  // ── o lugar da torre: o mais livre perto do meio dos desenhos ──
  const T0 = brutos.map((c) => reamostrar(c))
  const med = (l: number[]) => [...l].sort((a, b) => a - b)[Math.floor(l.length / 2)]
  const meio = { x: med(T0.map((t) => t.pos[0].x)), z: med(T0.map((t) => t.pos[0].y)) }
  const ocupado: number[] = []
  T0.forEach((t) => { for (let i = 0; i < t.n; i += 3) ocupado.push(t.pos[i].x, t.pos[i].y); const c = t.pos[t.n - 1].clone().addScaledVector(t.tan[t.n - 1], D_BALAO); ocupado.push(c.x, c.y) })
  let C = { x: meio.x, z: meio.z }, nota = -Infinity
  for (let dx = -300; dx <= 300; dx += 20) for (let dz = -300; dz <= 300; dz += 20) {
    const x = meio.x + dx, z = meio.z + dz
    let f = Infinity
    for (let q = 0; q < ocupado.length; q += 2) f = Math.min(f, Math.hypot(ocupado[q] - x, ocupado[q + 1] - z))
    const n = Math.min(f, 110) - 0.1 * Math.hypot(dx, dz)
    if (n > nota) { nota = n; C = { x, z } }
  }
  const Cv = new THREE.Vector2(C.x, C.z)

  // ── cada pista começa no ponto do desenho mais perto da torre (fica o lado
  // mais comprido) e tem o comprimento de meia música (apara ou amplia) ──
  const faixas = B.map((b) => PISTAS.find((p) => p.faixa === b.nome) ?? null)
  const T = brutos.map((c, k) => {
    let iMin = -1, dMin = Infinity
    c.forEach((p, i) => { const d = p.distanceTo(Cv); if (d >= DIST_COMECO && d < dMin) { dMin = d; iMin = i } })
    if (iMin < 0) iMin = 0
    const antes = comprimento(c.slice(0, iMin + 1)), depois = comprimento(c.slice(iMin))
    let kept = depois >= antes ? c.slice(iMin) : c.slice(0, iMin + 1).reverse()
    const fx = faixas[k]
    if (fx) {
      // a volta = alça de saída + ida + balão + volta + alça de entrada
      const alca = 1.25 * (kept[0].distanceTo(Cv) - R_SOBE) + 20
      const alvo = Math.max(300, (voltaDaMusica(fx) - L_GOTA - 2 * alca) / 2)
      const tem = comprimento(kept)
      if (tem > alvo) {
        // longa demais: perde a ponta
        let acc = 0, j = 1
        for (; j < kept.length && acc + kept[j].distanceTo(kept[j - 1]) < alvo; j++) acc += kept[j].distanceTo(kept[j - 1])
        kept = kept.slice(0, j)
      } else if (tem < alvo) {
        // curta demais: amplia a partir do começo (a forma fica)
        const s = alvo / tem, o = kept[0].clone()
        kept = kept.map((p) => p.clone().sub(o).multiplyScalar(s).add(o))
      }
    }
    return reamostrar(kept)
  })

  // ── a espiral de fora: cada linha no seu ângulo, uma depois da outra subindo ──
  const ang = (p: THREE.Vector2) => Math.atan2(p.y - C.z, p.x - C.x)
  const ordem = T.map((t, k) => ({ k, a: ang(t.pos[0]) })).sort((x, y) => x.a - y.a)
  // começa no maior vão entre duas linhas (a base da espiral fica lá)
  let maiorVao = -1, iv = 0
  ordem.forEach((o, i) => { const prox = ordem[(i + 1) % ordem.length].a + (i === ordem.length - 1 ? Math.PI * 2 : 0); if (prox - o.a > maiorVao) { maiorVao = prox - o.a; iv = (i + 1) % ordem.length } })
  const seq = [...ordem.slice(iv), ...ordem.slice(0, iv)]
  const phiE: number[] = [], phiS: number[] = [] // por pista: a entrada e a saída na espiral (ângulo desenrolado)
  let cursor = seq[0].a - ANTES - ALCA - 0.6
  const phiIni = cursor
  for (const { k, a } of seq) {
    let e = a - ANTES - ALCA
    while (e < cursor + GAP) e += Math.PI * 2
    phiE[k] = e; phiS[k] = e + ALCA
    cursor = phiS[k]
  }
  const phiFim = cursor + 0.6
  const yEsp = (phi: number) => Y_BASE + PASSO_ESPIRAL * (phi - phiIni) / (Math.PI * 2)
  const topo = yEsp(phiFim)
  const naEspiral = (phi: number, R = R_SOBE) => new THREE.Vector2(C.x + R * Math.cos(phi), C.z + R * Math.sin(phi))
  const tanEspiral = (phi: number) => new THREE.Vector2(-Math.sin(phi), Math.cos(phi)) // o sentido de phi crescente
  // as alças: saída (espiral → começo da pista) e entrada (fim da volta → espiral)
  const hIni = T.map((_, k) => yEsp((phiE[k] + phiS[k]) / 2))
  // (cada alça passa por um ponto logo fora da espiral, perto do ângulo da
  // ligação: assim ela só encosta na espiral onde liga, e não corta outra volta)
  const radial = (phi: number) => new THREE.Vector2(Math.cos(phi), Math.sin(phi))
  const juntar = (a: THREE.Vector2[], b: THREE.Vector2[]) => [...a, ...b.slice(1)]
  const alcas = T.map((t, k) => {
    const S = t.pos[0], tS = t.tan[0]
    const ws = naEspiral(phiS[k] + 0.35, R_SOBE + 26), tws = radial(phiS[k] + 0.35).multiplyScalar(0.7).add(tanEspiral(phiS[k] + 0.35).multiplyScalar(0.7)).normalize()
    const we = naEspiral(phiE[k] - 0.35, R_SOBE + 26), twe = radial(phiE[k] - 0.35).multiplyScalar(-0.7).add(tanEspiral(phiE[k] - 0.35).multiplyScalar(0.7)).normalize()
    const saida = juntar(bezier(naEspiral(phiS[k]), tanEspiral(phiS[k]), ws, tws, 0.35), bezier(ws, tws, S, tS))
    const entrada = juntar(bezier(S, tS.clone().negate(), we, twe), bezier(we, twe, naEspiral(phiE[k]), tanEspiral(phiE[k]), 0.35))
    const lin = (pts: THREE.Vector2[], ya: number, yb: number) => pts.map((_, i) => ya + (yb - ya) * (i / (pts.length - 1)))
    return { saida, entrada, hs: lin(saida, yEsp(phiS[k]), hIni[k]), he: lin(entrada, hIni[k], yEsp(phiE[k])) }
  })
  // as alças de linhas diferentes que se cruzam: o meio de uma sobe, o da outra
  // desce (as pontas ficam: a ligação na espiral e o começo da pista)
  {
    const lista = alcas.flatMap((a, k) => [{ k, pts: a.saida, h: a.hs }, { k, pts: a.entrada, h: a.he }])
    for (let it = 0; it < 120; it++) {
      let ruim = 0
      for (let x = 0; x < lista.length; x++) for (let y = x + 1; y < lista.length; y++) {
        const A = lista[x], Bq = lista[y]
        if (A.k === Bq.k) continue
        for (let i = 10; i < A.pts.length - 10; i += 2) for (let j = 10; j < Bq.pts.length - 10; j += 2) {
          if (A.pts[i].distanceTo(Bq.pts[j]) > 2 * MEIA_PISTA + 2) continue
          const d = A.h[i] - Bq.h[j]
          if (Math.abs(d) >= FOLGA) continue
          ruim++
          const sg = d >= 0 ? 1 : -1, falta = (FOLGA - Math.abs(d)) / 2 + 0.2
          const mexer = (L: typeof A, c: number, s2: number) => {
            const n = L.h.length
            for (let q = 1; q < n - 1; q++) {
              const borda = Math.min(1, Math.min(q, n - 1 - q) / 10) // as pontas não mexem
              L.h[q] += s2 * falta * Math.exp(-0.5 * ((q - c) / 14) ** 2) * borda
            }
          }
          mexer(A, i, sg); mexer(Bq, j, -sg)
        }
      }
      if (!ruim) break
    }
  }
  const fixos: Fixo[] = []
  alcas.forEach((a, k) => {
    a.saida.forEach((p, i) => { if (i % 3 === 0) fixos.push({ p, y: a.hs[i], pista: k }) })
    a.entrada.forEach((p, i) => { if (i % 3 === 0) fixos.push({ p, y: a.he[i], pista: k }) })
  })
  const { H, sobra } = alturas(T, C, hIni, topo, fixos)

  const V3 = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, p.y)
  const vias: Via[] = []
  const info: DiscoInfo[] = []
  const nos: { saem: number[] }[] = []
  const no = () => (nos.push({ saem: [] }), nos.length - 1)
  const ligar = (vi: number, de: number, para: number) => { const r = vias[vi].rede!; r.de = de; r.para = para; nos[de].saem.push(vi) }
  const nova = (v: Via, inf: DiscoInfo) => { vias.push(v); info.push(inf); return vias.length - 1 }
  const pistas: MundoDisco["pistas"] = []
  const COR_TORRE = "#ff6a35"

  // ── a espiral de fora, partida em trechos entre os pontos de entrada e saída ──
  const marcos = [phiIni, ...T.flatMap((_, k) => [phiE[k], phiS[k]]), phiFim].sort((a, b) => a - b)
  const noDe = new Map<number, number>()
  for (const m of marcos) noDe.set(m, no())
  const trechoEspiral = (a: number, b: number, R: number, ya: number, yb: number) => {
    const pts: THREE.Vector3[] = [], n = Math.max(3, Math.ceil(((b - a) * R) / 5))
    for (let q = 0; q <= n; q++) { const phi = a + (b - a) * (q / n); pts.push(V3(naEspiral(phi, R), ya + (yb - ya) * (q / n))) }
    return pts
  }
  for (let i = 0; i < marcos.length - 1; i++) {
    const a = marcos[i], b = marcos[i + 1]
    const vi = nova(viaDe(trechoEspiral(a, b, R_SOBE, yEsp(a), yEsp(b)), `disco:torre:sobe${i}`, "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "sobe" })
    ligar(vi, noDe.get(a)!, noDe.get(b)!)
  }
  // ── o topo: a curva pra dentro, a espiral de dentro descendo, a curva pra fora ──
  const yTopo = yEsp(phiFim)
  const curvaEntre = (phiA: number, rA: number, rB: number, y: number) => {
    const pts: THREE.Vector3[] = [], n = 24
    for (let q = 0; q <= n; q++) { const t = q / n, e = t * t * (3 - 2 * t); pts.push(V3(naEspiral(phiA + TRANSF * t, rA + (rB - rA) * e), y)) }
    return pts
  }
  const nTopo2 = no()
  const viT = nova(viaDe(curvaEntre(phiFim, R_SOBE, R_DESCE, yTopo), "disco:torre:topo", "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "transf" })
  ligar(viT, noDe.get(phiFim)!, nTopo2)
  // a descida: o bastante pra não passar de 7,5%, e acabando no ângulo da base da espiral de fora
  const dy = yTopo - Y_BASE
  const minDesce = dy / (RAMPA_MAX * R_DESCE)
  const ini2 = phiFim + TRANSF, alvoAng = phiIni - TRANSF
  let desce = alvoAng - ini2
  while (desce < minDesce) desce += Math.PI * 2
  const viD = nova(viaDe(trechoEspiral(ini2, ini2 + desce, R_DESCE, yTopo, Y_BASE), "disco:torre:desce", "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "desce" })
  const nDesce = no()
  ligar(viD, nTopo2, nDesce)
  const viB = nova(viaDe(curvaEntre(ini2 + desce, R_DESCE, R_SOBE, Y_BASE), "disco:torre:base", "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "transf" })
  ligar(viB, nDesce, noDe.get(phiIni)!)

  // ── as pistas: alça de saída → ida → balão → volta → alça de entrada ──
  T.forEach((t, k) => {
    const b = B[k], bairro = b.nome === "Nectar" ? "cidade" : "disco", h = H[k], a = alcas[k]
    const idx: number[] = []
    for (let i = 0; i < t.n - 1; i += 3) idx.push(i)
    if (t.n - 1 - idx[idx.length - 1] < 2) idx.pop()
    idx.push(t.n - 1)
    const ida = idx.map((i) => V3(t.pos[i], h[i])), volta = [...idx].reverse().map((i) => V3(t.pos[i], h[i]))
    const s3 = a.saida.map((p, i) => V3(p, a.hs[i]))
    const e3 = a.entrada.map((p, i) => V3(p, a.he[i]))
    const balao = gota(t.pos[t.n - 1], t.tan[t.n - 1]).map((p) => V3(p, h[t.n - 1]))
    const nS = no(), nPonta = no(), nPonta2 = no(), nV = no()
    const iSai = nova(viaDe(s3, `disco:${k}:saida`, "rampa", "disco", b.cor, true), { pista: k, parte: "saida" })
    const iIda = nova(viaDe(ida, `disco:${k}:ida`, "avenida", bairro, b.cor), { pista: k, parte: "ida" })
    const iBp = nova(viaDe(balao, `disco:${k}:balao`, "rampa", "disco", b.cor), { pista: k, parte: "balao" })
    const iVolta = nova(viaDe(volta, `disco:${k}:volta`, "avenida", bairro, b.cor), { pista: k, parte: "volta" })
    const iEnt = nova(viaDe(e3, `disco:${k}:entrada`, "rampa", "disco", b.cor, true), { pista: k, parte: "entrada" })
    ligar(iSai, noDe.get(phiS[k])!, nS); ligar(iIda, nS, nPonta); ligar(iBp, nPonta, nPonta2); ligar(iVolta, nPonta2, nV); ligar(iEnt, nV, noDe.get(phiE[k])!)
    // a meia-volta: ida e volta são as duas mãos do mesmo traçado
    vias[iIda].rede!.par = iVolta; vias[iVolta].rede!.par = iIda
    vias[iVolta].rede!.ida = false // o mesmo asfalto da ida: não desenha de novo
    // de que lado a alça de saída abre (pra placa e pro volante): + = direita
    const vs = vias[iSai], q = Math.min(vs.n - 1, 12)
    const lado: 1 | -1 = (vs.px[q] - vs.px[0]) * -vs.tz[0] + (vs.pz[q] - vs.pz[0]) * vs.tx[0] >= 0 ? 1 : -1
    pistas.push({ nome: b.nome, cor: b.cor, ida: iIda, volta: iVolta, saida: iSai, entrada: iEnt, lado })
  })

  // anéis como partitura (LU2CA 18/10): a 2 × BPM km/h, toda faixa dá uma
  // batida a cada 33,3 m. Um anel por batida, em compassos de 4; o lado
  // desenha uma melodia suave; um compasso a cada 8 vem no alto (só pulando)
  const BATIDA = 100 / 3
  pistas.forEach((p, k) => {
    for (const vi of [p.ida, p.volta]) {
      const v = vias[vi]
      for (let b = 2; b * BATIDA < v.L - 60; b++) {
        const comp = Math.floor(b / 4), tempo = b % 4
        if (comp % 4 === 3) continue // respiro: um compasso sem anel a cada 4
        const x = 3.4 * Math.sin(comp * 0.9 + tempo * 0.55 + k * 1.3)
        const alto = comp % 8 === 5
        v.orbs.push({ u: b * BATIDA, x, ...(alto ? { y: 3.4 + (tempo === 1 || tempo === 2 ? 1.2 : 0) } : {}) })
      }
    }
  })

  // a grade das amostras (pra cidade não nascer em cima da pista, nem dentro da torre)
  const CEL = 40
  const grade = new Map<string, number[]>()
  for (const v of vias) for (let i = 0; i < v.n; i += 3) {
    const key = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`
    let l = grade.get(key); if (!l) grade.set(key, (l = []))
    l.push(v.px[i], v.pz[i], MEIA_PISTA + 10, v.py[i]) // prédio a 10 m da borda: a câmera passa
  }
  const perto = (x: number, z: number, raio: number, f: (q: number[], k: number) => boolean) => {
    const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL), r = Math.ceil(raio / CEL)
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) {
      const l = grade.get(`${cx + a},${cz + b}`); if (!l) continue
      for (let q = 0; q < l.length; q += 4) if (f(l, q)) return true
    }
    return false
  }
  const livre = (x: number, z: number, folga: number) => Math.hypot(x - C.x, z - C.z) > R_SOBE + MEIA_PISTA + 14 + folga && !perto(x, z, folga + 40, (l, q) => Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + folga)
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

  // ── o pouso (o voo): a pista mais alta logo abaixo da Kombi ──
  const CP = 16, gp = new Map<string, number[]>()
  vias.forEach((v, vi) => { for (let i = 0; i < v.n; i++) { const k = `${Math.floor(v.px[i] / CP)},${Math.floor(v.pz[i] / CP)}`; let l = gp.get(k); if (!l) gp.set(k, (l = [])); l.push(vi, i) } })
  // margem: até onde, de lado, ainda conta (o ímã do pouso procura mais longe)
  const pousar = (x: number, z: number, y: number, dx: number, dz: number, margem = MEIA_PISTA): Pouso | null => {
    const cx = Math.floor(x / CP), cz = Math.floor(z / CP), R = Math.ceil(margem / CP)
    let melhor: Pouso | null = null, nota = -Infinity
    for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) {
      const l = gp.get(`${cx + a},${cz + b}`); if (!l) continue
      for (let q = 0; q < l.length; q += 2) {
        const v = vias[l[q]], i = l[q + 1]
        const ox = x - v.px[i], oz = z - v.pz[i]
        const lon = ox * v.tx[i] + oz * v.tz[i]
        if (Math.abs(lon) > 1.2) continue // a amostra certa (a cada 2 m)
        const lat = ox * -v.tz[i] + oz * v.tx[i]
        if (Math.abs(lat) > margem) continue
        const ys = v.py[i] - lat * Math.sin(v.bank[i])
        if (ys > y + 0.6) continue // está acima da Kombi: passa por baixo dela
        // a mais alta embaixo; entre ida e volta (mesmo asfalto), a que anda pro mesmo lado
        const n = ys * 10 + (dx * v.tx[i] + dz * v.tz[i] > 0 ? 1 : 0) - Math.max(0, Math.abs(lat) - MEIA_PISTA) * 2
        if (n > nota) { nota = n; melhor = { via: l[q], u: i * 2 + lon, x: lat, y: ys, cx: v.px[i], cz: v.pz[i], tx: v.tx[i], tz: v.tz[i] } }
      }
    }
    return melhor
  }
  const circuito = { linha: pistas[0].ida, suburbio: daPista("Sexta-Feira").ida, crypto: daPista("DopaminA").ida, live: daPista("Sabe Ontem?").ida, full: daPista("Swav").ida } as Record<FreqId, number>
  const rede: Rede = { nos: [], arestas: [], retornos: [] }
  const saidas = nos.map((n) => n.saem)
  // sem direção livre no disco: nunca é chamado, mas o formato pede
  const projetar = (): Projecao | null => null
  const conflitos = sobra ? [`${sobra} trechos de pista com menos de ${FOLGA - 1} m de folga`] : []
  const central: CentralDisco = { x: C.x, z: C.z, raio: R_SOBE, nucleo: NUCLEO, topo, andares: pistas.map((p, k) => ({ y: hIni[k], cor: p.cor, nome: p.nome, ang: (phiE[k] + phiS[k]) / 2 })) }
  CACHE = { vias, circuito, livre, vao, conflitos, onde, ligacoes: { rede, saidas }, chao: () => CHAO, projetar, disco: true, pistas, info, central, pousar, chaoDeserto: CHAO + 0.4 }
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
