// A LINHA 9 NO MAPA-DISCO (09/11, bíblia §13 e §14): metrô e Rollercoaster são uma coisa
// só, um monotrilho dentro da cidade. O trilho é um laço por cima das ruas: sai da torre
// central por uma rua, chega numa torre da ponta, volta por outra rua, e assim nas 3.
// Só o traçado e as contas (sem three, sem React). O desenho de fora e a viagem
// por dentro moram em Linha9.tsx; as torres descem pros túneis (disco/elevadores.ts).

import type { MundoDisco } from "./mundoDisco"

export const CONFIG_LINHA9 = {
  altura: 12, // m do asfalto até o topo da viga
  passo: 4, // m entre as amostras do trilho
  vel: 34, // m/s do trem normal
  fatorViagem: 2, // a viagem rápida: sentado, o trem anda de verdade este tanto a mais
  acel: 6, // m/s²
  freio: 3, // m/s² chegando na estação
  espera: 6, // s parado em cada estação (o trem visto de fora)
  vagoes: 4, // o trem visto de fora
  vagao: 13.8, // m (com o engate)
  piso: 0.75, // m do topo da viga até o chão do vagão
  raioEstacao: 46, // m: perto o bastante pra entrar (nas estações de rua)
  verTrem: 900, // m da câmera até o trem: mais longe, o trem de fora não conta nada
  verViga: 1500, // m da câmera até um trecho da viga
  cadaPilar: 32, // m entre os pórticos
}

export type TipoParada = "centro" | "torre" | "rua"
export interface Parada {
  s: number // onde fica no trilho
  x: number; y: number; z: number
  rumo: number
  tipo: TipoParada
  torre: number // 0 = a central, 1–3 = as das pontas (na rua, a torre para onde vai)
  // onde a pessoa sai (via e u da rede)
  via: number; u: number
}
export interface Pilar { s: number; x: number; z: number; base: number; topo: number; rx: number; rz: number }
export interface Linha9 {
  px: Float32Array; py: Float32Array; pz: Float32Array
  n: number; L: number
  paradas: Parada[]
  pilares: Pilar[]
}
export interface PontoTrilho { x: number; y: number; z: number; tx: number; ty: number; tz: number }
export const novoPonto = (): PontoTrilho => ({ x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 1 })

type Marca = Omit<Parada, "s" | "x" | "y" | "z" | "rumo"> & { i: number }

export function montarLinha9(M: MundoDisco): Linha9 {
  const C = CONFIG_LINHA9
  const xs: number[] = [], ys: number[] = [], zs: number[] = []
  const marcas: Marca[] = []
  const pil: (Omit<Pilar, "s" | "base"> & { i: number })[] = []
  const por = (x: number, y: number, z: number) => { xs.push(x); ys.push(y); zs.push(z) }
  const centro = M.torres[0]
  // uma rua inteira, numa direção, pelo eixo da via (amostras de 2 m)
  const rua = (via: number, inverte: boolean, torre: number) => {
    const v = M.vias[via], n = v.n
    const meio = xs.length + Math.floor(n / 4)
    for (let k = 0; k < n; k += 2) {
      const i = inverte ? n - 1 - k : k
      if (k % Math.round(C.cadaPilar / 2) === 0) { // amostras de 2 m
        const off = v.dir[i] + 1.5
        pil.push({ i: xs.length, x: v.px[i] - v.tz[i] * off, z: v.pz[i] + v.tx[i] * off, topo: v.py[i] + C.altura - 0.8, rx: v.px[i], rz: v.pz[i] })
      }
      por(v.px[i], v.py[i] + C.altura, v.pz[i])
    }
    marcas.push({ i: meio, tipo: "rua", torre, via, u: (inverte ? n - 1 - Math.floor(n / 2) : Math.floor(n / 2)) * 2 })
  }
  // a curva em volta da torre, de onde o trilho está até o começo da próxima rua
  const arco = (cx: number, cz: number, para: { x: number; y: number; z: number }) => {
    const x0 = xs[xs.length - 1], y0 = ys[ys.length - 1], z0 = zs[zs.length - 1]
    const a0 = Math.atan2(z0 - cz, x0 - cx), r0 = Math.hypot(x0 - cx, z0 - cz), r1 = Math.hypot(para.x - cx, para.z - cz)
    const da = Math.atan2(Math.sin(Math.atan2(para.z - cz, para.x - cx) - a0), Math.cos(Math.atan2(para.z - cz, para.x - cx) - a0))
    const n = Math.max(2, Math.ceil(Math.abs(da) * Math.max(r0, r1) / C.passo))
    for (let k = 1; k < n; k++) {
      const t = k / n, a = a0 + da * t, r = r0 + (r1 - r0) * t
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r, y = y0 + (para.y - y0) * t
      if (k % 8 === 0) pil.push({ i: xs.length, x, z, topo: y - 0.8, rx: x, rz: z })
      por(x, y, z)
    }
  }
  const pontoDe = (via: number, inverte: boolean) => {
    const v = M.vias[via], i = inverte ? v.n - 1 : 0
    return { x: v.px[i], y: v.py[i] + C.altura, z: v.pz[i] }
  }
  // as duas ruas mais curtas de cada torre da ponta, com a ida sempre a partir do centro
  const grupos = [1, 2, 3].map((t) => {
    const T = M.torres[t]
    const dist = (x: number, z: number, a: { x: number; z: number }) => Math.hypot(x - a.x, z - a.z)
    return M.pistas
      .map((p) => {
        const v = M.vias[p.ida]
        return { via: p.ida, L: v.L, fimNaPonta: dist(v.px[v.n - 1], v.pz[v.n - 1], T) < dist(v.px[0], v.pz[0], T), perto: Math.min(dist(v.px[0], v.pz[0], T), dist(v.px[v.n - 1], v.pz[v.n - 1], T)) }
      })
      .filter((q) => q.perto < 320)
      .sort((a, b) => a.L - b.L)
      .slice(0, 2)
      .map((q) => ({ ...q, torre: t }))
  }).filter((g) => g.length === 2)

  grupos.forEach((g, ig) => {
    const [a, b] = g, t = a.torre, T = M.torres[t]
    marcas.push({ i: xs.length, tipo: "centro", torre: 0, via: M.aneis[0].vias[0], u: 4 })
    rua(a.via, !a.fimNaPonta, t)
    marcas.push({ i: xs.length + 4, tipo: "torre", torre: t, via: M.aneis[t].vias[0], u: 4 })
    arco(T.x, T.z, pontoDe(b.via, b.fimNaPonta))
    rua(b.via, b.fimNaPonta, 0)
    const prox = grupos[(ig + 1) % grupos.length][0]
    arco(centro.x, centro.z, pontoDe(prox.via, !prox.fimNaPonta))
  })

  // o asfalto ondula; o trilho não: suaviza a altura (duas passadas, ±10 amostras, em laço)
  const N = xs.length
  for (let p = 0; p < 2; p++) {
    const c = ys.slice()
    let soma = 0
    const J = 10
    for (let i = -J; i <= J; i++) soma += c[(i + N) % N]
    for (let i = 0; i < N; i++) {
      ys[i] = soma / (2 * J + 1)
      soma += c[(i + J + 1) % N] - c[(i - J + N) % N]
    }
  }
  // comprimento acumulado e reamostragem uniforme
  const acc = new Float64Array(N + 1)
  for (let i = 0; i < N; i++) { const q = (i + 1) % N; acc[i + 1] = acc[i] + Math.hypot(xs[q] - xs[i], zs[q] - zs[i], ys[q] - ys[i]) }
  const L = acc[N], n = Math.ceil(L / C.passo), passo = L / n
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n)
  for (let k = 0, i = 0; k < n; k++) {
    const s = k * passo
    while (i < N - 1 && acc[i + 1] < s) i++
    const q = (i + 1) % N, f = (s - acc[i]) / Math.max(1e-6, acc[i + 1] - acc[i])
    px[k] = xs[i] + (xs[q] - xs[i]) * f; py[k] = ys[i] + (ys[q] - ys[i]) * f; pz[k] = zs[i] + (zs[q] - zs[i]) * f
  }
  const paradas: Parada[] = marcas.map((m) => {
    const s = acc[Math.min(N, m.i)], k = Math.round(s / passo) % n, q = (k + 1) % n
    return { s, x: px[k], y: py[k], z: pz[k], rumo: Math.atan2(px[q] - px[k], pz[q] - pz[k]), tipo: m.tipo, torre: m.torre, via: m.via, u: m.u }
  }).sort((a, b) => a.s - b.s)
  const pilares: Pilar[] = pil.map(({ i, ...o }) => ({ ...o, s: acc[Math.min(N, i)], base: M.chaoEm(o.x, o.z) - 2, topo: ys[Math.min(N - 1, i)] - 0.8 }))
  return { px, py, pz, n, L, paradas, pilares }
}

// uma por mundo (o Corrida remonta; o traçado não muda)
const GUARDADA = new WeakMap<MundoDisco, Linha9>()
export function linha9De(M: MundoDisco) {
  let l = GUARDADA.get(M)
  if (!l) { l = montarLinha9(M); GUARDADA.set(M, l) }
  return l
}

// o ponto do trilho em s (m, em laço), sem alocar
export function pontoLinha9(l: Linha9, s: number, o: PontoTrilho) {
  const f0 = ((s % l.L) + l.L) % l.L, x = (f0 / l.L) * l.n
  const i = Math.floor(x) % l.n, q = (i + 1) % l.n, f = x - Math.floor(x)
  o.x = l.px[i] + (l.px[q] - l.px[i]) * f
  o.y = l.py[i] + (l.py[q] - l.py[i]) * f
  o.z = l.pz[i] + (l.pz[q] - l.pz[i]) * f
  const d = Math.hypot(l.px[q] - l.px[i], l.py[q] - l.py[i], l.pz[q] - l.pz[i]) || 1
  o.tx = (l.px[q] - l.px[i]) / d; o.ty = (l.py[q] - l.py[i]) / d; o.tz = (l.pz[q] - l.pz[i]) / d
  return o
}

// até onde vai quem entra na parada i: a próxima torre (ou o centro) no sentido do trem
export function destinoDe(l: Linha9, i: number): number {
  const n = l.paradas.length
  for (let k = 1; k <= n; k++) { const j = (i + k) % n; if (l.paradas[j].tipo !== "rua") return j }
  return (i + 1) % n
}
export const nomeDaParada = (p: Parada) => (p.tipo === "centro" ? "o centro" : p.tipo === "torre" ? `a torre ${p.torre}` : "a rua")
/** quantos metros de trilho, no sentido do trem, de `de` até `ate` */
export const trilhoEntre = (l: Linha9, de: number, ate: number) => ((ate - de) % l.L + l.L) % l.L

// as estações em que dá pra entrar daqui (no anel de uma torre, as dela; na rua, a mais perto)
export function estacoesPerto(M: MundoDisco, l: Linha9, x: number, z: number, via: number, saida: number[]) {
  saida.length = 0
  const info = M.info[via]
  const anel = info?.parte === "anel" ? info.torre : -1
  for (let i = 0; i < l.paradas.length; i++) {
    const p = l.paradas[i]
    if (p.tipo === "rua" ? Math.hypot(p.x - x, p.z - z) < CONFIG_LINHA9.raioEstacao : p.torre === anel) saida.push(i)
  }
  return saida
}

// a estação mais perto de um ponto (a fuga da história começa nela)
export function paradaMaisPerto(l: Linha9, x: number, z: number) {
  let m = 0, d = Infinity
  for (let i = 0; i < l.paradas.length; i++) { const p = l.paradas[i], q = Math.hypot(p.x - x, p.z - z); if (q < d) { d = q; m = i } }
  return m
}
