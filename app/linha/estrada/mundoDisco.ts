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
//   - a espiral de fora sobe em volta da torre (mão única, o centro sempre à
//     esquerda). Cada linha se liga nela no seu ângulo por UMA alça de 4
//     faixas (o tronco, que começa no PORTÃO da linha): as 2 faixas da direita
//     de quem sai, as 2 de quem chega. Perto da espiral o tronco se abre em
//     dois ramos: primeiro a saída (pela direita), depois a chegada (entra
//     pela direita). Nada se sobrepõe; entre uma linha e a próxima há VAO
//     metros de espiral livre (a placa, ver o portão e decidir)
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
import DESENHO from "./polvo-desenho.json"
import { chaoEm, geoChao } from "./chao"

const MEIA_PISTA = 8.4 // meia largura da pista: 4 faixas, 2 por sentido, canteiro aberto (LU2CA 19/10)
const BANK_K = 46 // quanto a curva deita por unidade de curvatura (Horizon: curva de corrida)
const BANK_MAX = 0.4 // ~23°
const BANK_JAN = 20 // a inclinação entra e sai em ±40 m (amostras de 2 m)
const ESCALA = DESENHO.escala_km // metros por unidade do desenho (1000 unidades = escala_km km)
const FOLGA = 9 // altura livre mínima onde duas pistas se cruzam
const RAMPA_MAX = 0.1 // inclinação máxima (10%)
const TETO = 140 // nenhuma pista acima disso
const CHAO = -12 // o deserto embaixo de tudo
const R_BALAO = 45 // raio do balão da ponta (a 200 km/h, com a curva deitada)
const D_BALAO = 100 // do fim da pista até o centro do balão
// a torre (LU2CA 19/10, 2ª rodada: "a espiral com um diâmetro bem maior, tempo
// de ver qual a entrada e decidir; o tanto de volta deixa tonto")
const R_SOBE = 130 // a espiral de fora (sobe), raio do eixo
const R_DESCE = 92 // a espiral de dentro (desce)
const NUCLEO = 52 // o prédio da torre
const RA_CABECA = 195 // a torre principal ocupa a cabeça do desenho (a torre 3 fica a 304 m: não cresce mais que isso)
const PASSO_ESPIRAL = 11 // metros que a espiral sobe por volta (folga entre as voltas)
const Y_BASE = 8 // a base da espiral
const RAMO = 50 // m: do eixo da espiral até onde a alça vira tronco (e o arco que o ramo come)
const VAO = 150 // m de espiral livre entre o portão de uma linha e a saída da próxima (a placa, ver e decidir)
const TRANSF = 0.8 // rad da curva entre as duas espirais
export const V_TORRE = 26 // m/s na torre (~95 km/h): a espiral é de passear
// as torres das pontas (LU2CA 19/10): cada uma junta 3 linhas pelo fim
const R_PONTA = 66
const RA_PONTA = 118 // até onde a torre da ponta ocupa (as linhas chegam nessa borda)
const RAMO_PONTA = 36
const GRUPOS = [["Nectar", "Sexta-Feira", "Ojalá"], ["Rollercoaster", "Swav", "DopaminA"], ["Copo Americano", "CHUVA", "Sabe Ontem?"]]

export type ParteDisco = "ida" | "volta" | "balao" | "saida" | "entrada" | "sobe" | "desce" | "transf"
export type DiscoInfo = { pista: number; parte: ParteDisco; torre: number } // torre: 0 = a principal, 1–3 = as das pontas, -1 = pista
export type CentralDisco = { x: number; z: number; raio: number; nucleo: number; topo: number; andares: { y: number; cor: string; nome: string; ang: number }[] }
// onde a Kombi pousa vindo do ar: a via (no sentido do rumo), o u, o lado e a altura do asfalto
export type Pouso = { via: number; u: number; x: number; y: number; cx: number; cz: number; tx: number; tz: number }
export type MundoDisco = MundoRede & { disco: true; pistas: { nome: string; cor: string; ida: number; volta: number; saida: number; entrada: number; lado: 1 | -1 }[]; info: DiscoInfo[]; central: CentralDisco; torres: CentralDisco[]; ladoSaida: Map<number, 1 | -1>; pousar: (x: number, z: number, y: number, dx: number, dz: number, margem?: number) => Pouso | null; teto: (x: number, z: number, y: number, margem?: number) => number | null; chaoDeserto: number; chaoEm: (x: number, z: number) => number }
// os trechos da espiral sabem onde a borda de fora se abre e a faixa pintada da saída
export type SinaisEspiral = { abreFora?: [number, number][]; pintaSaida?: { u0: number; u1: number; cor: string }[] }
// as espirais (qualquer torre): a Kombi passeia
export const naEspiral = (p: ParteDisco | undefined) => p === "sobe" || p === "desce" || p === "transf"
// a torre principal (sem a música da pista: ela some e volta em fade)
export const naTorre = (i: DiscoInfo | undefined) => !!i && i.torre === 0 && (naEspiral(i.parte) || i.parte === "entrada")
// uma torre da ponta (a música da pista continua tocando)
export const naTorreDaPonta = (i: DiscoInfo | undefined) => !!i && i.torre > 0 && (naEspiral(i.parte) || i.parte === "entrada")

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
function reamostrar(c: THREE.Vector2[], suavizar = true) {
  const acc = [0]
  for (let i = 1; i < c.length; i++) acc.push(acc[i - 1] + c[i].distanceTo(c[i - 1]))
  // (20/10) a última amostra cai bem no fim (o passo estica uns cm): a emenda
  // com a próxima via não fica com buraco
  const L = acc[acc.length - 1], n = Math.max(2, Math.round(L / 2) + 1), passo = L / (n - 1)
  const pos: THREE.Vector2[] = [], tan: THREE.Vector2[] = []
  let j = 0
  for (let k = 0; k < n; k++) {
    const s = Math.min(L, k * passo)
    while (j < c.length - 2 && acc[j + 1] < s) j++
    const t = (s - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j])
    pos.push(c[j].clone().lerp(c[j + 1], t))
  }
  // (19/10, "fluidez nas curvas") média móvel de ±10 m: tira as quinas do
  // traçado (desvio de 1–2 m nas curvas mais fechadas) e mantém as pontas
  const liso = pos.map((p, k) => {
    if (!suavizar || k < 5 || k > n - 6) return p.clone()
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

// (LU2CA 20/10: "lapidar as curvas que parecem falhas") onde o desenho dobra
// numa quina (raio de 5–11 m numa pista de 17 m de largura: o asfalto de dentro
// se dobra por cima dele mesmo), arredonda só ali até o raio mínimo. As pontas
// ficam presas (os portões não mudam) e o resto do traçado é o desenho exato
const R_MIN = 38
function lapidar(c: THREE.Vector2[]) {
  const n = c.length, K = 4, PRESO = 12
  const raio = (i: number) => {
    const a = c[i - K], b = c[i], d = c[i + K]
    const ab = a.distanceTo(b), bd = b.distanceTo(d), ad = a.distanceTo(d)
    const area2 = Math.abs((b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x))
    return area2 < 1e-6 ? Infinity : (ab * bd * ad) / (2 * area2)
  }
  // cada rodada: a média gaussiana do traçado (σ crescendo) entra só em volta
  // das quinas, com peso que some devagar (sem degrau no desenho)
  for (let it = 0; it < 40; it++) {
    const ruins: number[] = []
    for (let i = K; i < n - K; i++) if (raio(i) < R_MIN) ruins.push(i)
    if (!ruins.length) break
    const sig = Math.min(16, 5 + it), W = Math.ceil(sig * 2.5)
    const peso = new Float32Array(n)
    for (const i of ruins) for (let j = Math.max(PRESO, i - W); j <= Math.min(n - 1 - PRESO, i + W); j++) { const t = Math.abs(j - i) / W; peso[j] = Math.max(peso[j], t < 0.5 ? 1 : 1 - (t - 0.5) * 2) }
    const nova = c.map((p, i) => {
      if (!peso[i]) return p.clone()
      const m = new THREE.Vector2()
      let ws = 0
      for (let q = -W; q <= W; q++) { const j = Math.max(0, Math.min(n - 1, i + q)), w = Math.exp(-0.5 * (q / sig) ** 2); m.addScaledVector(c[j], w); ws += w }
      m.multiplyScalar(1 / ws)
      return p.clone().lerp(m, peso[i])
    })
    for (let i = 0; i < n; i++) c[i].copy(nova[i])
  }
  return c
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

// um "fio" é tudo que tem altura a decidir: as pistas (ondas próprias) e as
// alças das torres (presas nas duas pontas: a espiral e o começo/fim da pista)
// (fixo: as alças. A altura é a do perfil, e quem cede num cruzamento é a pista)
type Fio = { pos: THREE.Vector2[]; tan: THREE.Vector2[]; hIni: number; hFim: number | null; dono: number; gota: boolean; isenta: number; onda: boolean; fixo?: number[] }
type Coluna = { x: number; z: number; r: number; topo: number } // a área de uma torre

// a altura de cada fio; depois os fios se afastam onde se cruzam (relaxação),
// sem passar da rampa máxima e sem atravessar torre
function alturas(F: Fio[], colunas: Coluna[]) {
  const H = F.map((f, k) => {
    const n = f.pos.length, h = new Float32Array(n)
    const a = 0.7 + k * 0.53, b = 1.9 + k * 1.1
    for (let i = 0; i < n; i++) {
      const s = i * 2, sf = (n - 1 - i) * 2
      if (f.fixo) { h[i] = f.fixo[i]; continue }
      if (!f.onda) { h[i] = f.hFim === null ? f.hIni : f.hIni + (f.hFim - f.hIni) * (i / (n - 1)); continue }
      const onda = 26 + 11 * Math.sin(s / (140 + k * 9) + a) + 6 * Math.sin(s / (61 + k * 4) + b)
      const w = Math.min(1, s / 260), e = w * w * (3 - 2 * w)
      let y = f.hIni * (1 - e) + onda * e
      if (f.hFim !== null) { const wf = Math.min(1, sf / 260), ef = wf * wf * (3 - 2 * wf); y = f.hFim * (1 - ef) + y * ef }
      h[i] = y
    }
    return h
  })
  const CEL = 24
  const amostras = F.map((f) => {
    const l: { p: THREE.Vector2; i: number }[] = []
    for (let i = 0; i < f.pos.length; i += 2) l.push({ p: f.pos[i], i })
    if (f.gota) for (const p of gota(f.pos[f.pos.length - 1], f.tan[f.tan.length - 1])) l.push({ p, i: f.pos.length - 1 })
    return l
  })
  const grade = new Map<string, number[]>()
  amostras.forEach((l, k) => l.forEach(({ p, i }, q) => { const key = `${Math.floor(p.x / CEL)},${Math.floor(p.y / CEL)}`; let g = grade.get(key); if (!g) grade.set(key, (g = [])); g.push(k, i, q) }))
  const pares: [number, number, number, number][] = []
  amostras.forEach((l, k) => {
    for (const { p: pk, i } of l) {
      const cx = Math.floor(pk.x / CEL), cz = Math.floor(pk.y / CEL)
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const g = grade.get(`${cx + a},${cz + b}`); if (!g) continue
        for (let q = 0; q < g.length; q += 3) {
          const k2 = g[q], i2 = g[q + 1]
          if (k2 < k) continue
          if (k2 === k ? i2 <= i + 60 : F[k].dono === F[k2].dono) continue // a pista com as alças dela: são emendadas
          if (pk.distanceTo(amostras[k2][g[q + 2]].p) < 2 * MEIA_PISTA + 2) pares.push([k, i, k2, i2])
        }
      }
    }
  })
  // as torres: nada passa pelo meio delas (a alça da própria torre pode)
  const coluna: [number, number, number][] = []
  amostras.forEach((l, k) => { for (const { p, i } of l) colunas.forEach((c, ci) => { if (ci !== F[k].isenta && Math.hypot(p.x - c.x, p.y - c.z) < c.r) coluna.push([k, i, c.topo]) }) })
  const preso = (k: number, j: number) => j === 0 || (F[k].hFim !== null && j === F[k].pos.length - 1)
  const empurra = (k: number, ii: number, v: number, sig: number) => {
    const h = H[k]
    if (F[k].fixo) return
    for (let j = Math.max(0, ii - 2 * sig); j < Math.min(h.length, ii + 2 * sig); j++) {
      if (preso(k, j)) continue
      // perto das pontas presas, o empurrão some (a emenda não dá degrau)
      // (20/10) suave e mais longo (era linear em 40 m: virava uma rampa de 15% no portão)
      const bl = Math.min(1, j / 24, F[k].hFim !== null ? (h.length - 1 - j) / 24 : 1), borda = bl * bl * (3 - 2 * bl)
      h[j] += v * Math.exp(-0.5 * ((j - ii) / sig) ** 2) * borda
    }
  }
  const rampa = (teto: number) => {
    for (let k = 0; k < H.length; k++) {
      const h = H[k], f = F[k], n = h.length
      if (f.fixo) continue
      h[0] = f.hIni
      if (f.hFim !== null) h[n - 1] = f.hFim
      const r = (f.onda ? RAMPA_MAX : 0.15) * 2 // as alças (acesso, na velocidade da torre) podem ser mais íngremes
      for (let j = 1; j < n; j++) h[j] = Math.max(4, Math.min(teto, h[j], h[j - 1] + r), h[j - 1] - r)
      if (f.hFim !== null) h[n - 1] = f.hFim
      for (let j = n - 2; j > 0; j--) h[j] = Math.min(Math.max(h[j], h[j + 1] - r), h[j + 1] + r)
    }
  }
  const SIG = 60
  const sigDe = (k: number) => (F[k].onda ? SIG : 14)
  const colunasRodada = () => {
    let ruim = 0
    for (const [kk, ii, topo] of coluna) { const d = H[kk][ii] - topo; if (d < FOLGA) { ruim++; empurra(kk, ii, FOLGA - d + 0.3, sigDe(kk)) } }
    return ruim
  }
  for (let it = 0; it < 900; it++) {
    let ruim = 0
    for (const [k, i, k2, i2] of pares) {
      const d = H[k][i] - H[k2][i2]
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      const sinal = d > 0 || (d === 0 && k > k2) ? 1 : -1
      const deBaixo = sinal > 0 ? H[k2][i2] : H[k][i]
      const noChao = deBaixo - (FOLGA - Math.abs(d)) / 2 < 4.5
      const falta = (FOLGA - Math.abs(d)) / (noChao ? 1 : 2) + 0.3
      if (!(noChao && sinal < 0)) empurra(k, i, sinal * falta, sigDe(k))
      if (!(noChao && -sinal < 0)) empurra(k2, i2, -sinal * falta, sigDe(k2))
    }
    ruim += colunasRodada()
    rampa(Infinity)
    if (!ruim) break
  }
  for (let it = 0; it < 700; it++) {
    let ruim = 0
    for (const [k, i, k2, i2] of pares) {
      const d = H[k][i] - H[k2][i2]
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      const [ka, ia, kb, ib] = d >= 0 ? [k, i, k2, i2] : [k2, i2, k, i]
      const falta = FOLGA - Math.abs(d) + 0.3
      if (H[ka][ia] + falta <= TETO) empurra(ka, ia, falta, sigDe(ka)); else empurra(kb, ib, -falta, sigDe(kb))
    }
    ruim += colunasRodada()
    rampa(TETO)
    if (!ruim) break
  }
  rampa(TETO)
  // 3ª fase: o que ainda sobra (pontos isolados), um empurrão local só pra cima
  for (let it = 0; it < 300; it++) {
    let ruim = 0
    for (const [k, i, k2, i2] of pares) {
      const d = H[k][i] - H[k2][i2]
      if (Math.abs(d) >= FOLGA) continue
      ruim++
      const [ka, ia] = d >= 0 ? [k, i] : [k2, i2]
      empurra(ka, ia, FOLGA - Math.abs(d) + 0.3, 25)
    }
    rampa(TETO)
    if (!ruim) break
  }
  // (20/10, "lapidar") a rampa máxima deixa quinas (de +10% pra −10% em 2 m):
  // alisa o perfil das pistas (média móvel, 3 passadas de ±16 m), com as
  // pontas planas na altura do portão (o tronco é plano: sem dobra na emenda).
  // Depois, o que voltou a encostar sobe de novo, devagar, e alisa outra vez
  // quem encosta em quem (pra o alisar nunca tirar a folga que a relaxação deu)
  const parDe = new Map<string, [number, number][]>()
  for (const [k, i, k2, i2] of pares) {
    const a = `${k}:${i}`, b = `${k2}:${i2}`
    let la = parDe.get(a); if (!la) parDe.set(a, (la = [])); la.push([k2, i2])
    let lb = parDe.get(b); if (!lb) parDe.set(b, (lb = [])); lb.push([k, i])
  }
  const cabe = (k: number, j: number, y: number) => {
    const l = parDe.get(`${k}:${j}`)
    if (l) for (const [k2, i2] of l) if (Math.abs(y - H[k2][i2]) < FOLGA && Math.abs(H[k][j] - H[k2][i2]) >= Math.abs(y - H[k2][i2])) return false
    for (const [kk, ii, topo] of coluna) if (kk === k && ii === j && y < topo + FOLGA && y < H[k][j]) return false
    return true
  }
  const alisar = () => {
    for (let k = 0; k < H.length; k++) {
      const f = F[k]
      if (!f.onda) continue
      const h = H[k], n = h.length, R = 8
      const ini = f.hIni, fim = f.hFim ?? h[n - 1]
      for (let pass = 0; pass < 3; pass++) {
        const src = Float32Array.from(h)
        const em = (j: number) => (j < 0 ? ini : j >= n ? fim : src[j])
        for (let j = 1; j < n - 1; j++) {
          let t = 0
          for (let q = -R; q <= R; q++) t += em(j + q)
          const y = t / (2 * R + 1)
          if (cabe(k, j, y)) h[j] = y
        }
        h[0] = ini; if (f.hFim !== null) h[n - 1] = fim
      }
    }
  }
  const encostam = () => pares.filter(([k, i, k2, i2]) => Math.abs(H[k][i] - H[k2][i2]) < FOLGA - 1).length + coluna.filter(([k, i, topo]) => H[k][i] < topo + FOLGA - 1).length
  for (let volta = 0; volta < 6; volta++) {
    alisar()
    const e = encostam()
    if (!e) break
    for (let it = 0; it < 200; it++) {
      let ruim = 0
      for (const [k, i, k2, i2] of pares) {
        const d = H[k][i] - H[k2][i2]
        if (Math.abs(d) >= FOLGA) continue
        ruim++
        const [ka, ia] = d >= 0 ? [k, i] : [k2, i2]
        empurra(ka, ia, FOLGA - Math.abs(d) + 0.6, 30)
      }
      ruim += colunasRodada()
      rampa(TETO)
      if (!ruim) break
    }
  }
  // as pontas: nos últimos 90 m antes de cada portão a pista vai assentando
  // (Hermite: chega no tronco plano sem quina). Se isso encostar em alguém, volta
  // (cada ponta separada; tenta 90 m, 140 m, 60 m e 40 m e fica com a que não encosta)
  for (let k = 0; k < H.length; k++) {
    const f = F[k]
    if (!f.onda) continue
    const h = H[k], n = h.length
    const m = (j: number) => (h[j + 1] - h[j - 1]) / 4
    for (const ponta of [0, 1]) {
      if (ponta && f.hFim === null) continue
      for (const N0 of [45, 70, 30, 20]) {
        const N = Math.min(N0, Math.floor(n / 4)), antes = encostam(), copia = Float32Array.from(h)
        if (!ponta) { const mi = m(N), yi = h[N]; for (let j = 1; j < N; j++) h[j] = hermite(j / N, f.hIni, 0, yi, mi, N * 2) }
        else { const a = n - 1 - N, ma = m(a), ya = h[a]; for (let j = a + 1; j < n - 1; j++) h[j] = hermite((j - a) / N, ya, ma, f.hFim!, 0, N * 2) }
        if (encostam() <= antes) break
        h.set(copia)
      }
    }
  }
  const sobra = pares.filter(([k, i, k2, i2]) => Math.abs(H[k][i] - H[k2][i2]) < FOLGA - 1).length + coluna.filter(([k, i, topo]) => H[k][i] < topo + FOLGA - 1).length
  return { H, sobra }
}

// vira via no formato do mapa novo (plana: a torre não deita na curva)
// (metade: só as 2 faixas da direita, as da alça; o eixo é a linha do meio do tronco)
function viaDe(pts: THREE.Vector3[], id: string, tipo: string, bairro: string, cor: string, plana = false, metade = false): Via {
  const p = amostrar(pts, false, true) as Pista
  derivar(p, 0)
  // a inclinação: curvatura suavizada em ±40 m, deita até ~23°, e some nas
  // pontas da via (na emenda com o balão, as duas inclinações batem em zero)
  for (let i = 0; i < p.n; i++) {
    let c = 0, k = 0
    for (let j = Math.max(0, i - BANK_JAN); j <= Math.min(p.n - 1, i + BANK_JAN); j++) { c += p.curv[j]; k++ }
    const borda = Math.min(1, Math.min(i, p.n - 1 - i) / 30)
    p.bank[i] = plana ? 0 : Math.max(-BANK_MAX, Math.min(BANK_MAX, (c / k) * BANK_K)) * borda * borda * (3 - 2 * borda)
    p.esq[i] = metade ? 0 : -MEIA_PISTA; p.dir[i] = MEIA_PISTA
  }
  // (20/10) a inclinação nunca pula: no máximo ~1° a cada 2 m (ida e volta)
  const DB = 0.018
  for (let i = 1; i < p.n; i++) p.bank[i] = Math.max(p.bank[i - 1] - DB, Math.min(p.bank[i - 1] + DB, p.bank[i]))
  for (let i = p.n - 2; i >= 0; i--) p.bank[i] = Math.max(p.bank[i + 1] - DB, Math.min(p.bank[i + 1] + DB, p.bank[i]))
  return Object.assign(p, {
    id, tipo: "rua" as const, t: "linha" as FreqId, disco: true, cor, // a cor da linha (a do diagrama)
    estacoes: [], rampas: [], orbs: [] as { u: number; x: number; y?: number }[], turbos: [], faixas: [], chegadas: [], livre: [0, p.L] as [number, number],
    rede: { aresta: 0, ida: true, de: -1, para: -1, par: -1, tipo, bairro },
  }) as unknown as Via
}

// a altura numa curva de transição (Hermite): sai de y0 com a rampa m0 e chega
// em y1 com a rampa m1 (rampas em m/m, L = o comprimento): sem quina de rampa
function hermite(t: number, y0: number, m0: number, y1: number, m1: number, L: number) {
  const t2 = t * t, t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * L * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * L * m1
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
  const idDe = (nome: string) => B.findIndex((b) => b.nome === nome)
  // ── (LU2CA 19/10: "atenha exatamente ao desenho, isso é minha arte também")
  // a torre principal fica na CABEÇA do desenho (o círculo do editor); as das
  // pontas, nas trifurcações (onde as 3 linhas se encontram). O pedaço que o
  // desenho tem dentro de uma torre fica dentro dela; fora, o traçado é exato ──
  const cabeca = P(500, 500)
  const C = { x: cabeca.x, z: cabeca.y }
  // em cada grupo, a ponta de cada linha que fica longe da cabeça (a outra está nela)
  const pontaLonge = (k: number) => { const c = brutos[k]; return c[0].distanceTo(cabeca) > c[c.length - 1].distanceTo(cabeca) ? "inicio" as const : "fim" as const }
  const ptDe = (k: number, ponta: "inicio" | "fim") => (ponta === "inicio" ? brutos[k][0] : brutos[k][brutos[k].length - 1])
  type Membro = { k: number; ponta: "inicio" | "fim" }
  const defs: { C: { x: number; z: number }; R: number; Rd: number; RA: number; nucleo: number; ramo: number; membros: Membro[]; nome: string }[] = [
    { C, R: R_SOBE, Rd: R_DESCE, RA: RA_CABECA, nucleo: NUCLEO, ramo: RAMO, membros: [], nome: "central" },
  ]
  GRUPOS.forEach((nomes, g) => {
    const ks = nomes.map(idDe).filter((k) => k >= 0)
    const ms = ks.map((k) => ({ k, ponta: pontaLonge(k) }))
    const pts = ms.map((m) => ptDe(m.k, m.ponta))
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cz = pts.reduce((a, p) => a + p.y, 0) / pts.length
    // (cada linha chega no seu andar: um estacionamento com a espiral ligando os
    // andares. A que fica colada na cabeça encolhe pra não encostar na central)
    const RA = Math.min(RA_PONTA, Math.hypot(cx - C.x, cz - C.z) - RA_CABECA - 6)
    const R = Math.min(R_PONTA, RA - RAMO_PONTA - 12)
    defs.push({ C: { x: cx, z: cz }, R, Rd: R - 24, RA, nucleo: R - 24 - MEIA_PISTA - 8, ramo: RAMO_PONTA, membros: ms, nome: `torre ${g + 1}` })
  })
  // a outra ponta de cada linha liga na torre principal
  B.forEach((_, k) => {
    const longe = defs.slice(1).find((d) => d.membros.some((m) => m.k === k))?.membros.find((m) => m.k === k)?.ponta
    defs[0].membros.push({ k, ponta: longe === "inicio" ? "fim" : "inicio" })
  })
  // ── corta cada desenho na borda das torres das suas duas pontas ──
  const T = brutos.map((c, k) => {
    const tIni = defs.find((d) => d.membros.some((m) => m.k === k && m.ponta === "inicio"))!
    const tFim = defs.find((d) => d.membros.some((m) => m.k === k && m.ponta === "fim"))!
    const dist = (p: THREE.Vector2, d: typeof tIni) => Math.hypot(p.x - d.C.x, p.y - d.C.z)
    let a = 0, b = c.length - 1
    while (a < c.length - 2 && dist(c[a], tIni) < tIni.RA) a++
    while (b > a + 2 && dist(c[b], tFim) < tFim.RA) b--
    // (arredondar as quinas junta os pontos: reamostra de novo a cada 2 m)
    return reamostrar(lapidar(reamostrar(c.slice(a, b + 1), false).pos), false)
  })
  const fimDe = new Array<number>(B.length).fill(1) // todas terminam numa torre (sem balão)
  const juntar = (a: THREE.Vector2[], b: THREE.Vector2[]) => [...a, ...b.slice(1)]
  const torres = defs.map((d, t) => {
    // a espiral anda no sentido de s, e o ângulo de verdade é -s: quem sobe tem
    // o centro à ESQUERDA, então a borda de fora é a direita, a mão do trânsito
    // (os carros andam do lado +x de cada via) — as alças saem e entram por ali
    const naEsp = (s: number, R = d.R) => new THREE.Vector2(d.C.x + R * Math.cos(s), d.C.z - R * Math.sin(s))
    const tanEsp = (s: number) => new THREE.Vector2(-Math.sin(s), -Math.cos(s)) // o sentido de s crescente
    const radial = (s: number) => new THREE.Vector2(Math.cos(s), -Math.sin(s))
    // onde cada membro encosta (o PORTÃO da linha) e pra onde a pista "sai" da torre
    const liga = d.membros.map((m) => {
      const tt = T[m.k]
      return m.ponta === "inicio" ? { ...m, P: tt.pos[0], fora: tt.tan[0].clone() } : { ...m, P: tt.pos[tt.n - 1], fora: tt.tan[tt.n - 1].clone().negate() }
    })
    const sDe = liga.map((l) => -Math.atan2(l.P.y - d.C.z, l.P.x - d.C.x))
    // cada linha ocupa uma janela [saída, chegada] em volta do ângulo do portão;
    // entre uma janela e a próxima, VAO metros de espiral livre
    const w = d.ramo / d.R, vao = VAO / d.R
    // a subida começa logo depois do maior vão entre os portões
    const ordem = sDe.map((a, i) => ({ i, a })).sort((x, y) => x.a - y.a)
    let maiorVao = -1, iv = 0
    ordem.forEach((o, i) => { const prox = ordem[(i + 1) % ordem.length].a + (i === ordem.length - 1 ? Math.PI * 2 : 0); if (prox - o.a > maiorVao) { maiorVao = prox - o.a; iv = (i + 1) % ordem.length } })
    const phiIni = ordem[iv].a - w - 0.5
    // a varredura: subindo, a próxima janela é a do portão que vem primeiro e
    // ainda cabe (assim cada volta junta quantas linhas couberem: poucas voltas)
    const phiQ: number[] = [], phiS: number[] = [], phiE: number[] = []
    let cursor = phiIni + 0.5 - 1e-6
    const resta = new Set(liga.map((_, i) => i))
    while (resta.size) {
      let melhor = -1, qMelhor = Infinity
      for (const i of resta) {
        let q = sDe[i]
        while (q - w < cursor) q += Math.PI * 2
        while (q - Math.PI * 2 - w >= cursor) q -= Math.PI * 2
        if (q < qMelhor) { qMelhor = q; melhor = i }
      }
      resta.delete(melhor)
      phiQ[melhor] = qMelhor; phiS[melhor] = qMelhor - w; phiE[melhor] = qMelhor + w
      cursor = phiE[melhor] + vao
    }
    const phiFim = Math.max(cursor - vao + 0.6, phiIni + Math.PI * 2)
    const yEsp = (s: number) => Y_BASE + PASSO_ESPIRAL * (s - phiIni) / (Math.PI * 2)
    // a alça: o tronco (portão → o ponto Q, logo fora da espiral) e dois ramos.
    // A saída vem da espiral (antes do Q) e a chegada vai pra ela (depois do Q),
    // cada uma com as 2 faixas da direita do mesmo eixo: lado a lado, sem nunca
    // se sobrepor. O tronco é plano, na altura do portão
    const alcas = liga.map((l, i) => {
      const Q = naEsp(phiQ[i], d.R + d.ramo), rq = radial(phiQ[i])
      const tronco = bezier(Q, rq, l.P, l.fora, 0.35)
      const ramoS = bezier(naEsp(phiS[i]), tanEsp(phiS[i]), Q, rq, 0.45)
      const ramoE = bezier(Q, rq.clone().negate(), naEsp(phiE[i]), tanEsp(phiE[i]), 0.45)
      const saida = juntar(ramoS, tronco), entrada = juntar([...tronco].reverse(), ramoE)
      return { ...l, saida, entrada, nTronco: tronco.length, hJ: yEsp(phiQ[i]), ySai: yEsp(phiS[i]), yEnt: yEsp(phiE[i]), hs: [] as number[], he: [] as number[] }
    })
    return { t, d, naEsp, phiE, phiS, phiQ, phiIni, phiFim, yEsp, topo: yEsp(phiFim), alcas }
  })
  // ── as alturas: as pistas e as alças juntas (cada alça presa na espiral e na pista) ──
  const fios: Fio[] = T.map((tt, k) => ({ pos: tt.pos, tan: tt.tan, hIni: Y_BASE, hFim: null, dono: k, gota: fimDe[k] < 0, isenta: -1, onda: true }))
  for (const tw of torres) for (const a of tw.alcas) {
    if (a.ponta === "inicio") fios[a.k].hIni = a.hJ; else fios[a.k].hFim = a.hJ
    const Lt = comprimento(a.saida.slice(a.saida.length - a.nTronco))
    const rs = reamostrar(a.saida), re = reamostrar(a.entrada)
    a.saida = rs.pos; a.entrada = re.pos
    // o tronco plano na altura do portão; o ramo vai até a altura da espiral
    const ramo = rs.L - Lt
    // (20/10) o ramo sai da espiral com a rampa dela e chega no tronco plano
    // sem quina (Hermite), e a chegada faz o caminho inverso
    const mEsp = PASSO_ESPIRAL / (Math.PI * 2 * tw.d.R)
    const ps = rs.L / (rs.n - 1), pe = re.L / (re.n - 1)
    a.hs = rs.pos.map((_, q) => (q * ps >= ramo ? a.hJ : hermite(q * ps / ramo, a.ySai, mEsp, a.hJ, 0, ramo)))
    a.he = re.pos.map((_, q) => (q * pe <= Lt ? a.hJ : hermite((q * pe - Lt) / (re.L - Lt), a.hJ, 0, a.yEnt, mEsp, re.L - Lt)))
    fios.push({ pos: rs.pos, tan: rs.tan, hIni: a.hs[0], hFim: a.hJ, dono: a.k, gota: false, isenta: tw.t, onda: false, fixo: a.hs })
    fios.push({ pos: re.pos, tan: re.tan, hIni: a.hJ, hFim: a.he[a.he.length - 1], dono: a.k, gota: false, isenta: tw.t, onda: false, fixo: a.he })
  }
  const colunas: Coluna[] = torres.map((tw) => ({ x: tw.d.C.x, z: tw.d.C.z, r: tw.d.R + MEIA_PISTA + 10, topo: tw.topo }))
  const { H: HF, sobra } = alturas(fios, colunas)
  const H = HF.slice(0, T.length)

  const V3 = (p: THREE.Vector2, y: number) => new THREE.Vector3(p.x, y, p.y)
  const vias: Via[] = []
  const info: DiscoInfo[] = []
  const nos: { saem: number[] }[] = []
  const no = () => (nos.push({ saem: [] }), nos.length - 1)
  const ligar = (vi: number, de: number, para: number) => { const r = vias[vi].rede!; r.de = de; r.para = para; nos[de].saem.push(vi) }
  const nova = (v: Via, inf: DiscoInfo) => { vias.push(v); info.push(inf); return vias.length - 1 }
  const pistas: MundoDisco["pistas"] = []
  const COR_TORRE = "#ff6a35"

  // ── as espirais de cada torre (partidas nos pontos de entrada e saída) ──
  const noTorre = torres.map((tw) => {
    const { t, d, naEsp, phiE, phiS, phiIni, phiFim, yEsp } = tw
    const marcos = [phiIni, ...d.membros.flatMap((_, i) => [phiE[i], phiS[i]]), phiFim].sort((a, b) => a - b)
    const noDe = new Map<number, number>()
    for (const m of marcos) noDe.set(m, no())
    const trecho = (a: number, b: number, R: number, ya: number, yb: number) => {
      const pts: THREE.Vector3[] = [], n = Math.max(3, Math.ceil(((b - a) * R) / 5))
      for (let q = 0; q <= n; q++) { const phi = a + (b - a) * (q / n); pts.push(V3(naEsp(phi, R), ya + (yb - ya) * (q / n))) }
      return pts
    }
    // de quem é cada saída / chegada (a cor da linha)
    const corS = new Map(tw.alcas.map((al, i) => [phiS[i], B[al.k].cor]))
    const temE = new Set(phiE)
    for (let i = 0; i < marcos.length - 1; i++) {
      const a = marcos[i], b = marcos[i + 1]
      const v = viaDe(trecho(a, b, d.R, yEsp(a), yEsp(b)), `disco:torre${t}:sobe${i}`, "rampa", "disco", COR_TORRE, true)
      // (sinalização) onde a borda de fora se abre (a alça sai ou chega: sem
      // guard rail) e a faixa da direita pintada na cor da linha até a saída
      const abre: [number, number][] = [], pinta: { u0: number; u1: number; cor: string }[] = []
      if (corS.has(a)) { abre.push([0, Math.min(v.L, 75)]); pinta.push({ u0: 0, u1: Math.min(v.L, 30), cor: corS.get(a)! }) }
      if (temE.has(b)) abre.push([Math.max(0, v.L - 75), v.L])
      if (corS.has(b)) pinta.push({ u0: Math.max(0, v.L - 150), u1: v.L, cor: corS.get(b)! })
      Object.assign(v, { abreFora: abre, pintaSaida: pinta })
      const vi = nova(v, { pista: -1, parte: "sobe", torre: t })
      ligar(vi, noDe.get(a)!, noDe.get(b)!)
    }
    const yTopo = yEsp(phiFim)
    // (20/10) a curva entre as espirais chega com a rampa de uma e sai com a da
    // outra (antes era plana: uma quina de até 6% de rampa no topo e na base)
    const curvaEntre = (phiA: number, rA: number, rB: number, y: number, m0 = 0, m1 = 0) => {
      const pts: THREE.Vector3[] = [], n = 24, Lc = TRANSF * (rA + rB) / 2
      for (let q = 0; q <= n; q++) { const s2 = q / n, e = s2 * s2 * (3 - 2 * s2); pts.push(V3(naEsp(phiA + TRANSF * s2, rA + (rB - rA) * e), hermite(s2, y, m0, y, m1, Lc))) }
      return pts
    }
    const nTopo2 = no(), nDesce = no()
    // a descida tem o passo da subida (11 m por volta: nunca encosta nela mesma)
    // e nunca é mais íngreme que 7,5%; a curva do topo (onde nada passa em cima)
    // cobre o ângulo que faltar pra descida acabar bem na base da espiral de fora
    // a descida fecha o ângulo (acaba bem na base da espiral de fora): entre a
    // rampa máxima da torre (9%) e o passo mínimo (9,5 m por volta), o mais perto de 11 m
    const dyT = yTopo - Y_BASE
    const lo = dyT / (0.09 * d.Rd), hi = (Math.PI * 2 * dyT) / 9.5, ideal = (Math.PI * 2 * dyT) / PASSO_ESPIRAL
    const alvoFim = phiIni - TRANSF
    let desce = ideal
    {
      let melhor = Infinity
      const base0 = phiFim + TRANSF
      for (let m = -20; m <= 20; m++) {
        let dd = alvoFim - base0 + m * Math.PI * 2
        if (dd < lo || dd > hi) continue
        if (Math.abs(dd - ideal) < melhor) { melhor = Math.abs(dd - ideal); desce = dd }
      }
    }
    const angTopo = TRANSF
    const mSobe = PASSO_ESPIRAL / (Math.PI * 2 * d.R), mDesce = -(yTopo - Y_BASE) / (desce * d.Rd)
    ligar(nova(viaDe(curvaEntre(phiFim, d.R, d.Rd, yTopo, mSobe, mDesce), `disco:torre${t}:topo`, "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "transf", torre: t }), noDe.get(phiFim)!, nTopo2)
    const ini2 = phiFim + angTopo
    ligar(nova(viaDe(trecho(ini2, ini2 + desce, d.Rd, yTopo, Y_BASE), `disco:torre${t}:desce`, "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "desce", torre: t }), nTopo2, nDesce)
    ligar(nova(viaDe(curvaEntre(ini2 + desce, d.Rd, d.R, Y_BASE, mDesce, mSobe), `disco:torre${t}:base`, "rampa", "disco", COR_TORRE, true), { pista: -1, parte: "transf", torre: t }), nDesce, noDe.get(phiIni)!)
    return noDe
  })

  // ── as pistas: [torre principal] saída → ida → [torre da ponta] → volta → entrada ──
  const alcaDe = (k: number, ponta: "inicio" | "fim") => { for (const tw of torres) for (let i = 0; i < tw.alcas.length; i++) if (tw.alcas[i].k === k && tw.alcas[i].ponta === ponta) return { tw, i, a: tw.alcas[i] }; return null }
  T.forEach((tt, k) => {
    const b = B[k], bairro = b.nome === "Nectar" ? "cidade" : "disco", h = H[k]
    const idx: number[] = []
    for (let i = 0; i < tt.n - 1; i += 3) idx.push(i)
    if (tt.n - 1 - idx[idx.length - 1] < 2) idx.pop()
    idx.push(tt.n - 1)
    const ida = idx.map((i) => V3(tt.pos[i], h[i])), volta = [...idx].reverse().map((i) => V3(tt.pos[i], h[i]))
    const ini = alcaDe(k, "inicio")!, fim = alcaDe(k, "fim")
    const nIda0 = no(), nIda1 = no(), nVolta0 = no(), nVolta1 = no()
    const alca3 = (pts: THREE.Vector2[], hs: number[]) => pts.map((p, i) => V3(p, hs[i]))
    // a torre principal: a saída pra ida, a entrada vinda da volta
    const t0 = ini.tw.t
    const iSai = nova(viaDe(alca3(ini.a.saida, ini.a.hs), `disco:${k}:saida${t0}`, "rampa", "disco", b.cor, true, true), { pista: k, parte: "saida", torre: t0 })
    const iEnt = nova(viaDe(alca3(ini.a.entrada, ini.a.he), `disco:${k}:entrada${t0}`, "rampa", "disco", b.cor, true, true), { pista: k, parte: "entrada", torre: t0 })
    ligar(iSai, noTorre[t0].get(ini.tw.phiS[ini.i])!, nIda0)
    ligar(iEnt, nVolta1, noTorre[t0].get(ini.tw.phiE[ini.i])!)
    const iIda = nova(viaDe(ida, `disco:${k}:ida`, "avenida", bairro, b.cor), { pista: k, parte: "ida", torre: -1 })
    const iVolta = nova(viaDe(volta, `disco:${k}:volta`, "avenida", bairro, b.cor), { pista: k, parte: "volta", torre: -1 })
    ligar(iIda, nIda0, nIda1); ligar(iVolta, nVolta0, nVolta1)
    if (fim) {
      // a torre da ponta: a ida entra na espiral; a saída dela começa a volta
      const t = fim.tw.t
      const iE2 = nova(viaDe(alca3(fim.a.entrada, fim.a.he), `disco:${k}:entrada${t}`, "rampa", "disco", b.cor, true, true), { pista: k, parte: "entrada", torre: t })
      const iS2 = nova(viaDe(alca3(fim.a.saida, fim.a.hs), `disco:${k}:saida${t}`, "rampa", "disco", b.cor, true, true), { pista: k, parte: "saida", torre: t })
      ligar(iE2, nIda1, noTorre[t].get(fim.tw.phiE[fim.i])!)
      ligar(iS2, noTorre[t].get(fim.tw.phiS[fim.i])!, nVolta0)
    } else {
      const iBp = nova(viaDe(gota(tt.pos[tt.n - 1], tt.tan[tt.n - 1]).map((p) => V3(p, h[tt.n - 1])), `disco:${k}:balao`, "rampa", "disco", b.cor), { pista: k, parte: "balao", torre: -1 })
      ligar(iBp, nIda1, nVolta0)
    }
    // a meia-volta: ida e volta são as duas mãos do mesmo traçado
    vias[iIda].rede!.par = iVolta; vias[iVolta].rede!.par = iIda
    vias[iVolta].rede!.ida = false // o mesmo asfalto da ida: não desenha de novo
    // de que lado a alça de saída da torre principal abre (pra placa e pro volante): + = direita
    const vs = vias[iSai], q = Math.min(vs.n - 1, 12)
    const lado: 1 | -1 = (vs.px[q] - vs.px[0]) * -vs.tz[0] + (vs.pz[q] - vs.pz[0]) * vs.tx[0] >= 0 ? 1 : -1
    pistas.push({ nome: b.nome, cor: b.cor, ida: iIda, volta: iVolta, saida: iSai, entrada: iEnt, lado })
  })
  // o lado de cada alça de saída (de qualquer torre), pra placa da espiral
  const ladoSaida = new Map<number, 1 | -1>()
  vias.forEach((vs, vi) => { if (info[vi].parte !== "saida") return; const q = Math.min(vs.n - 1, 12); ladoSaida.set(vi, (vs.px[q] - vs.px[0]) * -vs.tz[0] + (vs.pz[q] - vs.pz[0]) * vs.tx[0] >= 0 ? 1 : -1) })

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
  const livre = (x: number, z: number, folga: number) => torres.every((tw) => Math.hypot(x - tw.d.C.x, z - tw.d.C.z) > tw.d.R + MEIA_PISTA + 14 + folga) && !perto(x, z, folga + 40, (l, q) => Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + folga)
  const vao = (x: number, z: number, y: number) => !perto(x, z, 40, (l, q) => l[q + 3] < y - 3 && Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + 2)

  // ── onde mora cada coisa: na pista do personagem (fração da ida) ──
  const daPista = (nome: string) => pistas.find((p) => p.nome === nome)!
  const POS: Record<string, [string, number]> = {
    // (LU2CA 20/10) o bar é o prólogo, na primeira pista acesa (a missão do
    // Copo Americano não é mais no bar)
    "lugar:bar": ["Nectar", 0.55], "lugar:casa-drewboy": ["Sexta-Feira", 0.45], "lugar:balada": ["Sexta-Feira", 0.9], "lugar:beco": ["Sexta-Feira", 0.7],
    "lugar:escondido": ["CHUVA", 0.85], "lugar:topo": ["DopaminA", 0.9], "lugar:casa-shows": ["Sabe Ontem?", 0.88],
    "lugar:posto": ["Nectar", 0.68], "lugar:oficina": ["Nectar", 0.86], "lugar:palco-swav": ["Swav", 0.5], "lugar:palco-nectar": ["Nectar", 0.6], "lugar:palco-rollercoaster": ["Rollercoaster", 0.6], "lugar:palco-copo": ["Copo Americano", 0.6], "lugar:plataforma": ["Nectar", 0.42], "lugar:casa-dbee": ["Ojalá", 0.94],
    "pagina:oficina": ["Nectar", 0.86], "pagina:fliperama": ["DopaminA", 0.55], "pagina:galeria": ["Swav", 0.6], "pagina:ginasio": ["Rollercoaster", 0.4],
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
  // (LU2CA 20/10, B15: "as pistas não têm física de baixo pra cima") o teto: a
  // via mais baixa logo ACIMA da Kombi (o fundo do asfalto dela), na largura
  // da pista. null = céu aberto
  const teto = (x: number, z: number, y: number, margem = MEIA_PISTA + 0.6): number | null => {
    const cx = Math.floor(x / CP), cz = Math.floor(z / CP), R = Math.ceil(margem / CP)
    let menor: number | null = null
    for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) {
      const l = gp.get(`${cx + a},${cz + b}`); if (!l) continue
      for (let q = 0; q < l.length; q += 2) {
        const v = vias[l[q]], i = l[q + 1]
        const ox = x - v.px[i], oz = z - v.pz[i]
        if (Math.abs(ox * v.tx[i] + oz * v.tz[i]) > 1.2) continue
        const lat = ox * -v.tz[i] + oz * v.tx[i]
        if (lat < v.esq[i] - 0.6 || lat > v.dir[i] + 0.6) continue
        const ys = v.py[i] - lat * Math.sin(v.bank[i])
        if (ys <= y) continue
        if (menor === null || ys < menor) menor = ys
      }
    }
    return menor
  }
  const circuito = { linha: pistas[0].ida, suburbio: daPista("Sexta-Feira").ida, crypto: daPista("DopaminA").ida, live: daPista("Sabe Ontem?").ida, full: daPista("Swav").ida } as Record<FreqId, number>
  const rede: Rede = { nos: [], arestas: [], retornos: [] }
  const saidas = nos.map((n) => n.saem)
  // sem direção livre no disco: nunca é chamado, mas o formato pede
  const projetar = (): Projecao | null => null
  const conflitos = sobra ? [`${sobra} trechos de pista com menos de ${FOLGA - 1} m de folga`] : []
  const torresOut: CentralDisco[] = torres.map((tw) => ({ x: tw.d.C.x, z: tw.d.C.z, raio: tw.d.R, nucleo: tw.d.nucleo, topo: tw.topo, andares: tw.alcas.map((a, i) => ({ y: a.hJ, cor: B[a.k].cor, nome: B[a.k].nome, ang: -tw.phiQ[i] })) }))
  CACHE = { vias, circuito, livre, vao, conflitos, onde, ligacoes: { rede, saidas }, chao: chaoEm, projetar, disco: true, pistas, info, central: torresOut[0], torres: torresOut, ladoSaida, pousar, teto, chaoDeserto: CHAO + 0.4, chaoEm }
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

// o chão: as dunas e o lixão (chao.ts)
export const geoChaoDisco = geoChao
