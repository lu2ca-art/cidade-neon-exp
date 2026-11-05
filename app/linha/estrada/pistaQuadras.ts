// (leveza, cidade grande, 05/11) A PISTA E A CIDADE EM QUADRAS.
//
// Com as ruas do tamanho da faixa (docs/ruas-faixa.md) o mundo ficou ~1,7× maior
// e o asfalto, as faixas, os postes (+ reflexo + luz) e os pilares eram UMA malha
// pro mundo inteiro: a esfera dela pegava tudo, então ia inteira pra placa todo
// quadro (o que estava atrás da câmera e depois da névoa também). Aqui eles são
// partidos em quadras (a grade dos prédios, `QUADRA_DISCO`): cada quadra é uma
// malha com a sua esfera, o three corta a que está fora da tela e o useFrame da
// névoa esconde a que está depois dela (`cortarPelaNevoa`).
//
// Uso (Corrida.tsx):
//   const camadas = montarGeoPista(M, circuitos)            // as fitas de sempre
//   const pedacos = partirFitas([...camadas.faixas], QUADRA) // uma malha por quadra
//   const ks = postesDoMundo(M)  ·  const pil = pilaresDoMundo(M)
// O scripts/contar-quadras.ts usa as mesmas funções (sem tela) pra contar.
// docs/leveza-cidade-grande.md

import * as THREE from "three"
import { fita } from "./geo"
import { ABRE, distritoDe, territorio, type Mundo, type Via } from "./mundo"
import { MEIA, PASSO, type Pista } from "./pista"
import { DISTRITOS, hexRgb, type Distrito } from "./distritos"
import type { SinaisEspiral } from "./mundoDisco"

/** O lado da quadra dos prédios no disco (m): uma malha por quadra e cara. */
export const QUADRA_DISCO = 900
/** O lado da quadra da pista, dos postes e dos pilares no disco (m). Fora do disco, uma quadra só. */
export const QUADRA_PERTO = 300
export const quadraDo = (M: object) => ("disco" in M ? QUADRA_PERTO : Infinity)

export const COR_APAGADA = hexRgb("#2a2838")

/**
 * Guarda a cor acesa de uma fita (e, opcional, quais quads tingem) em userData,
 * para `tingirApagadas` trocar a cor no atributo que já existe.
 * @example const g = guardarCor(fita(vias, ..., { via, cor }), acesoPorQuad)
 */
export function guardarCor(g: THREE.BufferGeometry, tinge?: number[]) {
  g.userData.cor0 = Float32Array.from((g.getAttribute("color") as THREE.BufferAttribute).array as Float32Array)
  if (tinge) g.userData.tinge = Uint8Array.from(tinge)
  return g
}
/** Pinta de cinza escuro os vértices das vias apagadas (aVia); o resto volta à cor acesa. Não aloca. */
export function tingirApagadas(g: THREE.BufferGeometry, apagada: boolean[] | null) {
  const cor0 = g.userData.cor0 as Float32Array | undefined
  const via = g.getAttribute("aVia") as THREE.BufferAttribute | undefined
  const at = g.getAttribute("color") as THREE.BufferAttribute | undefined
  if (!cor0 || !via || !at) return
  const tinge = g.userData.tinge as Uint8Array | undefined
  const arr = at.array as Float32Array
  for (let v = 0; v < via.count; v++) {
    const o = v * 3
    if (apagada && apagada[via.getX(v)] && (!tinge || tinge[v >> 2] === 1)) { arr[o] = COR_APAGADA[0]; arr[o + 1] = COR_APAGADA[1]; arr[o + 2] = COR_APAGADA[2] }
    else { arr[o] = cor0[o]; arr[o + 1] = cor0[o + 1]; arr[o + 2] = cor0[o + 2] }
  }
  at.needsUpdate = true
}

// cor de cada trecho: o lugar do circuito; nas saídas, metade de cada lado
export const distI = (v: Via, i: number): Distrito => distritoDe(v.tipo === "saida" && i < v.n / 2 ? v.de! : v.t)
const RGB = new Map<string, [number, number, number]>()
for (const d of DISTRITOS) for (const c of [...d.trilho, ...d.luz]) RGB.set(c, hexRgb(c))
const rgb = (c: string) => RGB.get(c) ?? hexRgb(c)

/** As vias que fazem circuito (o mapa de sempre) ou a ida de cada rua (o mapa novo/disco). */
export const circuitosDe = (M: Mundo) => (M.vias as Via[]).filter((v) => v.tipo === "circuito" || (v.tipo === "rua" && v.rede?.ida))

/**
 * As fitas da pista (o asfalto, as faixas, as bordas, as linhas, os guard rails
 * e as saias), cada uma uma malha pro mundo todo, como sempre foram montadas.
 * Quem desenha parte elas em quadras com `partirFitas`.
 */
export function montarGeoPista(M: Mundo, circuitos: Via[]) {
    // (disco) a volta é o mesmo asfalto da ida: desenha uma vez só
    const vias = (M.vias as Via[]).filter((v) => !((v as Via & { disco?: boolean }).disco && v.rede && !v.rede.ida))
    const U = (i: number) => i * PASSO
    // nunca um trilho atravessando pista: some onde a pista divide, onde
    // outra encosta chegando, e no começo/fim das saídas (coladas no circuito)
    const divide = (v: Via, i: number, lado: number) => v.faixas.some((f) => f.lado === lado && Math.abs(i - Math.floor(f.u / PASSO)) <= 1)
    const chegando = (v: Via, i: number) => v.chegadas.some((c) => U(i) > c.u - 220 && U(i) < c.u + 10)
    // (disco) a borda de dentro de cada mão é o meio da pista: lá é linha, não guard rail
    const doDisco = (p: Pista) => !!(p as Via & { disco?: boolean }).disco
    // (desempenho) o desenho das pistas do disco usa uma amostra a cada 6 m (a física, a cada 2)
    const passoD = (p: Pista) => (doDisco(p) ? 3 : 1)
    // (os atos) pista apagada: o neon dela fica num cinza escuro
    const indice = new Map((M.vias as Via[]).map((v, i) => [v, i]))
    // (27/10, drone v2) cada vértice sabe a via (o drone acende só as da rota)
    const via = (p: Pista) => indice.get(p as Via) ?? 0
    // (leveza A) a cor ACESA de sempre: o cinza das apagadas é pintado por cima,
    // no atributo de cor da malha que já existe (tingirApagadas), sem refazer a pista
    const corDe = (p: Pista) => (p as Via & { cor?: string }).cor
    // o começo e o fim do balão: as duas pernas ainda se sobrepõem (sem trilho lá)
    // (e nas emendas da torre: as alças se separam da espiral e uma da outra)
    const gargalo = (p: Pista, i: number) => {
      const id = (p as Via).id, u = U(i)
      if (/:balao$/.test(id)) return u < 75 || u > p.L - 75
      // (alças: meia pista; a saída nasce em cima da espiral, a chegada morre nela)
      if (/:saida\d+$/.test(id)) return u < 35
      if (/:entrada\d+$/.test(id)) return u > p.L - 35
      return false
    }
    // (espiral) onde a borda de fora se abre pra uma alça: sem guard rail nem borda
    const abertoFora = (p: Pista, i: number) => ((p as Via & SinaisEspiral).abreFora ?? []).some(([a, b]) => U(i) >= a && U(i) <= b)
    const CIANO = hexRgb("#2fe8ff"), ROSA = hexRgb("#ff3fb0"), BRANCO: [number, number, number] = [1, 1, 1]
    const trilhoE = (p: Pista, i: number) => {
      const v = p as Via
      const u = U(i)
      if (doDisco(p)) return !gargalo(p, i)
      if (v.id === "deserto") return u > 90 && (u < 900 || u > v.L - 900) && u < v.L - 230
      if (v.tipo === "circuito") return !divide(v, i, -1)
      return !(v.lado! > 0 && u < 90) && u < v.L - 230
    }
    const trilhoD = (p: Pista, i: number) => {
      const v = p as Via
      const u = U(i)
      if (doDisco(p)) return !gargalo(p, i) && !abertoFora(p, i)
      if (v.id === "deserto") return u < 900 || u > v.L - 900
      if (v.tipo === "circuito") return !divide(v, i, 1) && !chegando(v, i)
      return !(v.lado! < 0 && u < 90)
    }
    const rails = (lado: number) => {
      // (leveza A) quais quads são o trecho aceso da listra (o escuro fica escuro)
      const aceso: number[] = []
      const g = fita(vias, (p, i) => (lado < 0 ? p.esq[i] - 0.25 : p.dir[i] + 0.25), 0.75, 0, {
        passo: passoD,
        via,
        vertical: true,
        incluir: lado < 0 ? trilhoE : trilhoD,
        // (disco) o guard rail na cor da linha
        cor: (p, i) => { const k = Math.floor(i / 10) % 2; aceso.push(k); return k ? rgb(corDe(p) ?? distI(p as Via, i).trilho[lado < 0 ? 0 : 1]) : [0.05, 0.05, 0.12] },
      })
      return guardarCor(g, aceso)
    }
    const semEmenda = (p: Pista, i: number) => {
      const v = p as Via
      if (v.tipo === "circuito") return !divide(v, i, -1) && !divide(v, i, 1)
      return U(i) > 60 && U(i) < v.L - 120
    }
    // tracejado que separa a faixa de saída da pista que fica
    const divisoria = (lado: number) => fita(circuitos, lado * MEIA - 0.12, lado * MEIA + 0.12, 0.045, {
      via,
      incluir: (p, i) => i % 5 < 3 && (p as Via).faixas.some((f) => f.lado === lado && U(i) > f.u - ABRE + 110 && U(i) < f.u),
    })
    return {
      chao: fita(vias, (p, i) => p.esq[i] - 0.25, (p, i) => p.dir[i] + 0.25, 0.01, { passo: passoD, via }),
      // (disco) cada mão tem 2 faixas: um tracejado só, no meio dela
      // (disco) 4 faixas: o tracejado separa as duas de cada sentido (±4,2 m)
      // (alças: meia pista, só o tracejado de dentro dela)
      faixas: [-MEIA / 3, MEIA / 3].map((x) => guardarCor(fita(vias, (p) => (doDisco(p) ? Math.sign(x) * 4.2 : x) - 0.1, (p) => (doDisco(p) ? Math.sign(x) * 4.2 : x) + 0.1, 0.04, { passo: passoD, via, incluir: (p, i) => i % 6 < 3 && (doDisco(p) ? !gargalo(p, i) && (x < 0 ? p.esq[i] < -4.2 : p.dir[i] > 4.2) : semEmenda(p, i)), cor: (p) => (doDisco(p) ? rgb(corDe(p)!) : CIANO) }))),
      // (disco) as duas bordas na cor da linha
      bordas: [-1, 1].map((l) => guardarCor(fita(vias, (p, i) => (l < 0 ? p.esq[i] + 0.23 : p.dir[i] - 0.47), (p, i) => (l < 0 ? p.esq[i] + 0.47 : p.dir[i] - 0.23), 0.04, { passo: passoD, via, incluir: (p, i) => (doDisco(p) ? !gargalo(p, i) && !(l > 0 && abertoFora(p, i)) : semEmenda(p, i)), cor: (p) => (doDisco(p) ? rgb(corDe(p)!) : l < 0 ? CIANO : ROSA) }))),
      // (disco) a linha contínua branca no meio (o canteiro é aberto: só pintura)
      linhasGarfo: [divisoria(-1), divisoria(1), fita(vias, -0.14, 0.14, 0.045, { passo: passoD, via, incluir: (p, i) => doDisco(p) && !gargalo(p, i) })],
      railE: rails(-1),
      railD: rails(1),
      saiaE: fita(vias, (p, i) => p.esq[i] - 0.25, 1.8, -1.8, { vertical: true, passo: passoD, incluir: (p, i) => semEmenda(p, i) && trilhoE(p, i) }),
      saiaD: fita(vias, (p, i) => p.dir[i] + 0.25, 1.8, -1.8, { vertical: true, passo: passoD, incluir: (p, i) => semEmenda(p, i) && trilhoD(p, i) }),
    }
}

/** A chave da quadra de um ponto (no plano XZ). Com `Q` infinito, tudo é a quadra "0". */
export function chaveQuadra(x: number, z: number, Q: number) {
  return Q < Infinity ? `${Math.floor(x / Q)},${Math.floor(z / Q)}` : "0"
}

type Arr = Float32Array | Uint32Array | Uint16Array | Int32Array | Uint8Array

/**
 * ITENS EM QUADRAS, UMA DRAW CALL SÓ. Os itens (quads de fita, postes, pilares,
 * luzes) ficam ordenados por quadra; `escolher` decide quais quadras estão a até
 * `lim` metros da câmera e `copiar` junta só elas no buffer que vai pra placa
 * (o índice da fita, as matrizes das instâncias). Partir em malhas separadas
 * (como os prédios) multiplicava as draw calls (14 → 54 numa vista típica,
 * scripts/contar-quadras.ts); aqui continua uma por material e só o que está
 * perto é desenhado. A troca é rara (a câmera andou ou a névoa mudou) e quem
 * chama espalha as cópias pelos quadros.
 *
 * O mapa índice original → (quadra, índice local) fica em `quadra`/`local`
 * (e `ordem`, a posição na ordem das quadras): `apagarPostes` usa ele.
 * @example const em = new EmQuadras(xz, 300); if (em.escolher(cx, cz, 1350)) n = em.copiar(src, dst, 16)
 */
export class EmQuadras {
  readonly n: number
  /** índice original → posição na ordem das quadras */
  readonly ordem: Int32Array
  /** índice original → quadra / índice dentro da quadra */
  readonly quadra: Int32Array
  readonly local: Int32Array
  /** as quadras: centro, raio, primeiro item (na ordem), quantos, quantos estão fora */
  readonly cel: { x: number; z: number; r: number; i0: number; n: number; fora: number }[] = []
  private fora: Uint8Array
  private dentro: Uint8Array
  private ux = NaN
  private uz = NaN
  private ulim = NaN
  private sujo = true
  /** quantos itens a última `copiar` deixou no buffer */
  total = 0

  /** `xz`: x, z de cada item (2 por item). `Q`: o lado da quadra (Infinity = uma só). */
  constructor(xz: ArrayLike<number>, readonly Q: number) {
    const n = (this.n = Math.floor(xz.length / 2))
    const chave = new Map<string, number>()
    const cq = new Int32Array(n)
    for (let i = 0; i < n; i++) {
      const k = chaveQuadra(xz[i * 2], xz[i * 2 + 1], Q)
      let c = chave.get(k)
      if (c === undefined) { chave.set(k, (c = this.cel.length)); this.cel.push({ x: 0, z: 0, r: 0, i0: 0, n: 0, fora: 0 }) }
      cq[i] = c; this.cel[c].n++
    }
    let i0 = 0
    for (const c of this.cel) { c.i0 = i0; i0 += c.n; c.n = 0 }
    this.ordem = new Int32Array(n); this.quadra = cq; this.local = new Int32Array(n)
    for (let i = 0; i < n; i++) {
      const c = this.cel[cq[i]]
      this.local[i] = c.n; this.ordem[i] = c.i0 + c.n++
      c.x += xz[i * 2]; c.z += xz[i * 2 + 1]
    }
    for (const c of this.cel) { c.x /= c.n || 1; c.z /= c.n || 1 }
    for (let i = 0; i < n; i++) { const c = this.cel[cq[i]]; c.r = Math.max(c.r, Math.hypot(xz[i * 2] - c.x, xz[i * 2 + 1] - c.z)) }
    if (!(Q < Infinity)) for (const c of this.cel) c.r = Infinity
    this.fora = new Uint8Array(n)
    this.dentro = new Uint8Array(this.cel.length)
  }

  /** Reordena um array por item (`passo` valores por item) na ordem das quadras. */
  ordenar<T extends Arr>(a: T, passo: number): T {
    const b = new (a.constructor as new (n: number) => T)(a.length)
    for (let i = 0; i < this.n; i++) b.set(a.subarray(i * passo, (i + 1) * passo), this.ordem[i] * passo)
    return b
  }

  /** O item (índice original) não vai pra placa (ex.: o poste de uma pista apagada). */
  marcarFora(i: number, fora: boolean) {
    const p = this.ordem[i], v = fora ? 1 : 0
    if (this.fora[p] === v) return
    this.fora[p] = v
    this.cel[this.quadra[i]].fora += fora ? 1 : -1
    this.sujo = true
  }

  /**
   * Decide as quadras a até `lim` m de (x, z) (a borda da quadra, não o centro).
   * Só olha de novo se a câmera andou `passo` m ou o limite mudou; devolve true
   * se o conjunto mudou (aí é hora de `copiar`).
   */
  escolher(x: number, z: number, lim: number, passo = 40): boolean {
    if (!this.sujo && Math.abs(lim - this.ulim) < passo && (x - this.ux) ** 2 + (z - this.uz) ** 2 < passo * passo) return false
    this.ux = x; this.uz = z; this.ulim = lim
    let mudou = this.sujo
    for (let c = 0; c < this.cel.length; c++) {
      const q = this.cel[c], r = lim + q.r
      const v = (q.x - x) ** 2 + (q.z - z) ** 2 < r * r ? 1 : 0
      if (this.dentro[c] !== v) { this.dentro[c] = v; mudou = true }
    }
    this.sujo = false
    return mudou
  }

  /** Copia (de `src`, já na ordem das quadras) os itens das quadras escolhidas, sem os de fora, pro começo de `dst`. Devolve quantos itens. */
  copiar(src: Arr, dst: Arr, passo: number): number {
    let o = 0
    for (let c = 0; c < this.cel.length; c++) {
      if (!this.dentro[c]) continue
      const q = this.cel[c]
      if (!q.fora) { dst.set(src.subarray(q.i0 * passo, (q.i0 + q.n) * passo), o * passo); o += q.n; continue }
      for (let p = q.i0; p < q.i0 + q.n; p++) if (!this.fora[p]) { dst.set(src.subarray(p * passo, (p + 1) * passo), o * passo); o++ }
    }
    return (this.total = o)
  }
}

/**
 * As fitas de um mesmo material (as de `fita`: 4 vértices e 6 índices por quad,
 * em sequência) juntas numa malha só, com os quads ordenados por quadra: posição,
 * normal, uv, cor, aVia (o drone), a cor acesa (`cor0`) e quais quads tingem
 * (`tinge`, pra `tingirApagadas`). O índice que vai pra placa é refeito por
 * `escolherFita` com só as quadras perto. As fontes são descartadas (dispose).
 * @example const neon = fitaEmQuadras([...bordas, railE, railD], 300)
 */
export function fitaEmQuadras(fontes: THREE.BufferGeometry[], Q: number): { g: THREE.BufferGeometry; em: EmQuadras; indice: Uint32Array | Uint16Array } {
  const temVia = fontes.some((g) => !!g.getAttribute("aVia"))
  const temCor0 = fontes.some((g) => !!g.userData.cor0)
  const nv = fontes.reduce((s, g) => s + Math.floor(g.getAttribute("position").count / 4) * 4, 0), nq = nv / 4
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), cor = new Float32Array(nv * 3)
  const via = new Float32Array(temVia ? nv : 0), cor0 = new Float32Array(temCor0 ? nv * 3 : 0), tinge = new Uint8Array(temCor0 ? nq : 0)
  const xz = new Float32Array(nq * 2)
  let v0 = 0
  for (const g of fontes) {
    const n = Math.floor(g.getAttribute("position").count / 4) * 4
    const P = g.getAttribute("position").array as Float32Array
    pos.set(P.subarray(0, n * 3), v0 * 3)
    const N = g.getAttribute("normal")?.array as Float32Array | undefined
    if (N) nor.set(N.subarray(0, n * 3), v0 * 3); else for (let v = v0; v < v0 + n; v++) nor[v * 3 + 1] = 1
    const U = g.getAttribute("uv")?.array as Float32Array | undefined
    if (U) uv.set(U.subarray(0, n * 2), v0 * 2)
    const C = g.getAttribute("color")?.array as Float32Array | undefined
    if (C) cor.set(C.subarray(0, n * 3), v0 * 3); else cor.fill(1, v0 * 3, (v0 + n) * 3)
    const V = g.getAttribute("aVia")?.array as Float32Array | undefined
    if (temVia && V) via.set(V.subarray(0, n), v0)
    if (temCor0) {
      const c0 = g.userData.cor0 as Float32Array | undefined, ti = g.userData.tinge as Uint8Array | undefined
      cor0.set((c0 ?? cor.subarray(v0 * 3, (v0 + n) * 3)).subarray(0, n * 3), v0 * 3)
      for (let q = 0; q < n / 4; q++) tinge[v0 / 4 + q] = c0 ? (ti ? ti[q] : 1) : 0
    }
    for (let q = 0; q < n / 4; q++) {
      const o = (v0 + q * 4) * 3
      xz[(v0 / 4 + q) * 2] = (pos[o] + pos[o + 3] + pos[o + 6] + pos[o + 9]) / 4
      xz[(v0 / 4 + q) * 2 + 1] = (pos[o + 2] + pos[o + 5] + pos[o + 8] + pos[o + 11]) / 4
    }
    v0 += n
    g.dispose()
  }
  const em = new EmQuadras(xz, Q)
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(em.ordenar(pos, 12), 3))
  g.setAttribute("normal", new THREE.BufferAttribute(em.ordenar(nor, 12), 3))
  g.setAttribute("uv", new THREE.BufferAttribute(em.ordenar(uv, 8), 2))
  g.setAttribute("color", new THREE.BufferAttribute(em.ordenar(cor, 12), 3))
  if (temVia) g.setAttribute("aVia", new THREE.BufferAttribute(em.ordenar(via, 4), 1))
  if (temCor0) { g.userData.cor0 = em.ordenar(cor0, 12); g.userData.tinge = em.ordenar(tinge, 1) }
  // o índice completo (na ordem das quadras) e o que vai pra placa (só as quadras perto)
  const indice = nv > 65535 ? new Uint32Array(nq * 6) : new Uint16Array(nq * 6)
  for (let q = 0, b = 0; q < nq * 6; q += 6, b += 4) { indice[q] = b; indice[q + 1] = b + 1; indice[q + 2] = b + 2; indice[q + 3] = b + 1; indice[q + 4] = b + 3; indice[q + 5] = b + 2 }
  const ind = new THREE.BufferAttribute(indice.slice(), 1)
  ind.setUsage(THREE.DynamicDrawUsage)
  g.setIndex(ind)
  g.computeBoundingSphere()
  return { g, em, indice }
}

/** Refaz o índice da fita com só as quadras escolhidas (sobe só o pedaço usado). */
export function copiarFita(f: { g: THREE.BufferGeometry; em: EmQuadras; indice: Uint32Array | Uint16Array }) {
  const ind = f.g.getIndex()!
  const n = f.em.copiar(f.indice, ind.array as Uint32Array | Uint16Array, 6)
  f.g.setDrawRange(0, n * 6)
  ind.clearUpdateRanges(); ind.addUpdateRange(0, Math.max(1, n * 6)); ind.needsUpdate = true
}

/** O ponto de um poste: a via (índice), a amostra, o lado e onde ele cai (o eixo da via, pra escolher a quadra). */
export type PontoPoste = { v: Via; k: number; lado: number; vi: number; x: number; z: number }

const noTunel = (v: Via, i: number) => {
  const tt = territorio(v.t).tunel
  return v.tipo === "circuito" && !!tt && i / v.n > tt[0] && i / v.n < tt[1]
}

/**
 * Os postes: a cada 24 m dos dois lados (12 amostras; no mapa novo a cada 40 m e
 * um sentido só), nunca no túnel, no meio do deserto, nem em cima de outra pista.
 * A ordem é o índice global do poste (o de `apagarPostes`).
 */
export function postesDoMundo(M: Mundo): PontoPoste[] {
  const ks: PontoPoste[] = []
  for (const [vi, v] of (M.vias as Via[]).entries()) {
    // (no mapa novo: um sentido só, e os postes a cada 40 m)
    if (v.tipo === "rua" && !v.rede?.ida) continue
    // (os atos, 20/10) a pista apagada é escura de verdade: sem poste aceso
    // (leveza A: todos montados; os das apagadas somem em apagarPostes)
    for (let k = 0; k < v.n; k += v.tipo === "rua" ? 20 : 12) {
      const u = k * PASSO
      if (v.tipo === "saida" && (u < 150 || u > v.L - 240)) continue
      // o deserto não tem poste (só perto da cidade)
      if (v.id === "deserto" && u > 900 && u < v.L - 900) continue
      if (noTunel(v, k)) continue
      for (const lado of [-1, 1]) {
        if ((v as Via & { disco?: boolean }).disco && (/:(balao|saida|entrada)$/.test(v.id) || /^disco:torre:/.test(v.id)) && (u < 75 || u > v.L - 75)) continue
        if (v.tipo === "circuito") {
          if (v.faixas.some((f) => f.lado === lado && u > f.u - 4 && u < f.u + 140)) continue
          if (lado > 0 && v.chegadas.some((c) => u > c.u - 240 && u < c.u + 10)) continue
        }
        ks.push({ v, k, lado, vi, x: v.px[k], z: v.pz[k] })
      }
    }
  }
  return ks
}

/** Os pilares embaixo das vias (a cada 40 m; só onde descer até a água não fura outra pista). [x, y, z] */
export function pilaresDoMundo(M: Mundo): [number, number, number][] {
  const pil: [number, number, number][] = []
  // (no mapa novo as duas vias de uma rua passam no mesmo eixo: um sentido só)
  for (const v of M.vias as Via[]) { if (v.tipo === "rua" && !v.rede?.ida) continue; for (let k = 0; k < v.n; k += 20) if (v.py[k] > -9 && M.vao(v.px[k], v.pz[k], v.py[k])) pil.push([v.px[k], v.py[k], v.pz[k]]) }
  return pil
}

/**
 * Esconde (`visible`) o que está depois da névoa: a esfera inteira além de `lim`
 * metros da câmera. Pras malhas partidas em quadras (prédios, pista, postes,
 * pilares). Não aloca.
 * @example cortarPelaNevoa(quadras, camera.position, fog.far + 400)
 */
export function cortarPelaNevoa(lista: { o: THREE.Object3D; e: THREE.Sphere }[], cam: THREE.Vector3, lim: number) {
  for (let i = 0; i < lista.length; i++) {
    const { o, e } = lista[i]
    const r = lim + e.radius
    o.visible = e.center.distanceToSquared(cam) < r * r
  }
}

/**
 * Uma grade de pontos no plano XZ (as gotas): cada célula guarda os índices
 * dos pontos dela, pra o laço por quadro olhar só as células perto da câmera.
 * @example const g = new GradeXZ(pos, 150); const n = g.perto(x, z, 450, buf); for (let j = 0; j < n; j++) buf[j]
 */
export class GradeXZ {
  private cel = new Map<number, number[]>()
  constructor(pos: Float32Array, readonly lado: number) {
    for (let i = 0; i < pos.length / 3; i++) {
      const k = this.chave(Math.floor(pos[i * 3] / lado), Math.floor(pos[i * 3 + 2] / lado))
      let l = this.cel.get(k); if (!l) this.cel.set(k, (l = [])); l.push(i)
    }
  }
  private chave(cx: number, cz: number) { return (cx + 4096) * 8192 + (cz + 4096) }
  /** Escreve em `buf` os índices dos pontos das células que encostam no círculo (x, z, r); devolve quantos. Não aloca (buf do tamanho dos pontos). */
  perto(x: number, z: number, r: number, buf: Int32Array) {
    const L = this.lado, x0 = Math.floor((x - r) / L), x1 = Math.floor((x + r) / L), z0 = Math.floor((z - r) / L), z1 = Math.floor((z + r) / L)
    let n = 0
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const l = this.cel.get(this.chave(cx, cz)); if (!l) continue
      for (let j = 0; j < l.length; j++) buf[n++] = l[j]
    }
    return n
  }
}
