// O GPS TIPO WAZE (T58, LU2CA jogada das 13 missões, 28/10: "o GPS precisamos
// de uma versão otimizadassa, tipo um Waze da vida, tá muito ruim de localizar
// no mapa"). A conta (sem desenho): a rota pelas vias até o destino da missão,
// as manobras (onde virar, onde pegar a rampa), a distância, o tempo e o
// "saiu da rota: recalculando". Quem desenha: o cartão (Gps.tsx), a faixa no
// chão da pista (RotaPista.tsx) e o minimapa (Mapa.tsx) — os três leem o NAV.
//
// O grafo é o mesmo dos pilotos: as vias de mão única do disco
// (ligacoes.saidas: por cruzamento, as vias que saem dele). A busca segue a
// mesma regra da física no cruzamento: não dá meia-volta (a outra mão) a não
// ser numa rua sem saída, e não entra em pista apagada.

import type { Mundo } from "./mundo"
import type { MundoDisco } from "./mundoDisco"
import { naAnel } from "./mundoDisco"
import { PASSO } from "./pista"
import type { Rota, Trecho } from "./rota"

// ── os números ──
export const NAV_CFG = {
  refazMs: 250, // a cada quanto a rota se refaz
  vMin: 12, // m/s: a velocidade mínima pra conta do tempo (parado não vira "∞ min")
  vSuave: 0.6, // 1/s: a média da velocidade (o tempo não pula)
  avisa: 650, // m: a manobra aparece no cartão a partir daqui (antes, "segue")
  recalcMs: 1600, // quanto tempo o "recalculando" fica na tela
  retoGraus: 22, // abaixo disso, a manobra é "segue reto"
  faixaAntes: 170, // m antes da rampa: a faixa no chão já puxa pro lado da saída
}

export type TipoManobra = "rampa" | "vira" | "reto" | "torre" | "chega" | "sai" | "mira"
export interface Manobra {
  dist: number // m da Kombi até a manobra (ao longo da rota)
  tipo: TipoManobra
  lado: -1 | 0 | 1 // -1 esquerda, 1 direita
  via: number // a via que a manobra pega (-1: chegada)
  texto: string // "pega a rampa à direita"
  pista?: string // o nome da pista do outro lado (a rampa da Nectar)
}
export interface DestinoNav { x: number; z: number; cor: string; nome: string; via?: number; u?: number; chao?: boolean }

// o estado (mutável, fora do React: quem desenha lê quando quer)
export const NAV = {
  ativo: false,
  versao: 0, // muda a cada refeita (a faixa no chão se reescreve)
  destino: null as DestinoNav | null,
  rota: null as Rota | null, // pelas vias (null: em linha reta, no chão/voando)
  reta: false, // sem rota pelas vias: a linha reta até o destino
  saida: null as { x: number; z: number } | null, // (destino fora da pista) onde a rota deixa a pista
  metros: -1, // o total até o destino
  segundos: -1,
  manobras: [] as Manobra[],
  proxima: null as Manobra | null,
  recalc: 0, // performance.now() do último "recalculando"
  recalculos: 0,
  vMedia: 0,
  // o que a última rota esperava (pra saber se a Kombi saiu dela)
  esperado: [] as number[],
  viaAnt: -1,
  // (teste/medida, só com ?medir) um destino posto à mão
  alvoTeste: null as { via: number; u: number } | null,
}

const frenteDe = (L: number, de: number, ate: number) => (((ate - de) % L) + L) % L

// os cruzamentos: as vias que saem do fim de `vi`, como a física escolhe (sem a outra mão, se houver outra)
function saidasDe(M: MundoDisco, vi: number) {
  const V = M.vias[vi]
  if (!V.rede) return []
  const todas = M.ligacoes.saidas[V.rede.para] ?? []
  const sem = todas.filter((w) => w !== V.rede!.par)
  return sem.length ? sem : todas
}

// a rota mais curta (Dijkstra pelas vias). Igual à calcularRotaDisco, com a regra do cruzamento
export function rotaNav(M: Mundo, de: { via: number; u: number }, ate: { via: number; u: number }, apagada?: boolean[] | null): Rota | null {
  const D = M as MundoDisco
  if (!D.ligacoes || !M.vias[de.via]?.rede || !M.vias[ate.via]) return null
  const Vd = M.vias[de.via]
  if (de.via === ate.via && (ate.u >= de.u || Vd.fechada)) {
    const d = Vd.fechada ? frenteDe(Vd.L, de.u, ate.u) : ate.u - de.u
    return { trechos: [{ via: de.via, u0: de.u, u1: de.u + d }], metros: d }
  }
  const pode = (w: number) => !apagada?.[w] || w === ate.via || w === de.via
  const dist = new Map<number, number>(), ant = new Map<number, number>()
  const fila: [number, number][] = []
  const resto = Math.max(0, Vd.L - de.u)
  for (const w of saidasDe(D, de.via)) if (pode(w)) { dist.set(w, resto); ant.set(w, de.via); fila.push([resto, w]) }
  while (fila.length) {
    let k = 0
    for (let i = 1; i < fila.length; i++) if (fila[i][0] < fila[k][0]) k = i
    const [d, vi] = fila[k]
    fila[k] = fila[fila.length - 1]; fila.pop()
    if (d > (dist.get(vi) ?? Infinity)) continue
    if (vi === ate.via) break
    const nd = d + M.vias[vi].L
    for (const w of saidasDe(D, vi)) {
      if (!pode(w) || nd >= (dist.get(w) ?? Infinity)) continue
      dist.set(w, nd); ant.set(w, vi); fila.push([nd, w])
    }
  }
  if (!dist.has(ate.via)) return null
  // (o destino pode estar atrás na mesma via: a cadeia começa nele e volta até a saída da via de agora)
  const cadeia: number[] = [ate.via]
  for (let v = ant.get(ate.via), n = 0; v !== undefined && v !== de.via && n < 4096; v = ant.get(v), n++) cadeia.unshift(v)
  const trechos: Trecho[] = [{ via: de.via, u0: de.u, u1: Vd.L }]
  for (const vi of cadeia.slice(0, -1)) trechos.push({ via: vi, u0: 0, u1: M.vias[vi].L })
  trechos.push({ via: ate.via, u0: 0, u1: ate.u })
  return { trechos, metros: dist.get(ate.via)! + ate.u }
}

// pra onde a via aponta no começo / no fim
function rumoVia(M: Mundo, vi: number, fim: boolean) {
  const V = M.vias[vi], i = fim ? V.n - 1 : Math.min(V.n - 1, 8)
  return { tx: V.tx[i], tz: V.tz[i] }
}
// o ângulo (graus) de `b` em relação a `a` no cruzamento: + = à direita
function curva(M: Mundo, a: number, b: number) {
  const A = rumoVia(M, a, true), B = rumoVia(M, b, false)
  const reto = A.tx * B.tx + A.tz * B.tz, direita = A.tx * B.tz - A.tz * B.tx
  return (Math.atan2(direita, reto) * 180) / Math.PI
}

const LADO = (l: number) => (l > 0 ? "à direita" : "à esquerda")
// as manobras da rota: só onde há escolha (cruzamento com mais de uma saída) e
// onde sem fazer nada a Kombi iria pro outro lado
export function manobrasDa(M: Mundo, r: Rota, destino: DestinoNav | null): Manobra[] {
  const D = M as MundoDisco
  const out: Manobra[] = []
  let dist = 0
  for (let i = 0; i < r.trechos.length - 1; i++) {
    const t = r.trechos[i], a = t.via, b = r.trechos[i + 1].via
    dist += t.u1 - t.u0
    if (!D.ligacoes) continue
    const cands = saidasDe(D, a)
    if (cands.length < 2) continue
    const ib = D.info?.[b], ia = D.info?.[a]
    const nomePista = ib && ib.pista >= 0 ? D.pistas?.[ib.pista]?.nome : undefined
    const sai = cands.find((w) => D.info?.[w]?.parte === "saida")
    const segue = cands.find((w) => naAnel(D.info?.[w]?.parte))
    if (sai !== undefined && segue !== undefined) {
      // (T61) a rotatória de cima: sem nada, ela segue dando a volta; a saída é a
      // faixa pintada (e a borda da direita na cor dela)
      if (b === sai) {
        const l = D.ladoSaida?.get(sai) ?? 1
        out.push({ dist, tipo: "rampa", lado: l, via: b, texto: nomePista ? `sai da rotatória ${LADO(l)} · ${nomePista}` : `sai da rotatória ${LADO(l)}`, pista: nomePista })
      }
      continue
    }
    // um cruzamento comum: sem nada, ela vai na mais reta
    let maisReta = cands[0], melhor = Infinity
    for (const w of cands) { const g = Math.abs(curva(M, a, w)); if (g < melhor) { melhor = g; maisReta = w } }
    const ang = curva(M, a, b)
    if (b === maisReta && Math.abs(ang) < NAV_CFG.retoGraus * 2) continue
    const lado: -1 | 0 | 1 = Math.abs(ang) < NAV_CFG.retoGraus ? 0 : ang > 0 ? 1 : -1
    const torre = ib && (ib.parte === "entrada" || naAnel(ib.parte)) && !(ia && naAnel(ia.parte))
    if (torre) out.push({ dist, tipo: "torre", lado, via: b, texto: lado ? `entra na rotatória ${LADO(lado)}` : "entra na rotatória", pista: nomePista })
    else if (lado === 0) out.push({ dist, tipo: "reto", lado, via: b, texto: "segue reto no cruzamento", pista: nomePista })
    else out.push({ dist, tipo: "vira", lado, via: b, texto: `vira ${LADO(lado)}`, pista: nomePista })
  }
  const nome = destino?.nome ?? "o destino"
  out.push(destino?.chao
    ? { dist: r.metros, tipo: "sai", lado: 0, via: -1, texto: `deixa a pista: ${nome} fica ali embaixo` }
    : { dist: r.metros, tipo: "chega", lado: 0, via: -1, texto: `chega no destino · ${nome}` })
  return out
}

// o ponto da via mais perto de um lugar do chão (cache por lugar): a rota leva até ali
const _perto = new Map<string, { via: number; u: number; d: number }>()
function pistaPerto(M: Mundo, chave: string, x: number, z: number, apagada?: boolean[] | null) {
  const k = `${chave}|${apagada?.map((a) => (a ? 1 : 0)).join("") ?? ""}`
  const c = _perto.get(k)
  if (c) return c
  let m = { via: -1, u: 0, d: Infinity }
  const D = M as MundoDisco
  M.vias.forEach((v, vi) => {
    if (apagada?.[vi] || !v.rede) return
    // só as pistas (as rampas e as torres ficam no alto)
    const p = D.info?.[vi]?.parte
    if (p && p !== "ida" && p !== "volta" && p !== "balao") return
    for (let i = 0; i < v.n; i += 2) {
      const d = Math.hypot(v.px[i] - x, v.pz[i] - z)
      if (d < m.d) m = { via: vi, u: i * PASSO, d }
    }
  })
  _perto.set(k, m)
  return m
}

export interface PoseNav { via: number; u: number; x: number; v: number; voo?: boolean; livreOk?: boolean; wx?: number; wz?: number; rumo?: number }

const fmtMin = (s: number) => (s < 50 ? "< 1 min" : `${Math.max(1, Math.round(s / 60))} min`)
export const fmtTempo = (s: number) => (s < 0 ? "" : fmtMin(s))
export const fmtMetros = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`)

// refaz tudo (o Gps chama a cada NAV_CFG.refazMs). `ang`: o ângulo do destino (graus, + direita) pra linha reta
export function refazerNav(M: Mundo, p: PoseNav | null, destino: DestinoNav | null, dt: number, ang: number, apagada?: boolean[] | null) {
  const N = NAV, C = NAV_CFG
  N.versao++
  if (!p || !destino) {
    N.ativo = false; N.destino = null; N.rota = null; N.manobras = []; N.proxima = null; N.metros = N.segundos = -1; N.esperado = []; N.viaAnt = -1; N.saida = null
    return
  }
  const v = Math.abs(p.v)
  N.vMedia += (v - N.vMedia) * Math.min(1, dt * C.vSuave)
  N.ativo = true
  N.destino = destino
  const livre = !!(p.voo || p.livreOk) && p.wx !== undefined
  // saiu da rota? (a via de agora não é nenhuma das que a rota esperava)
  if (!livre && p.via !== N.viaAnt) {
    // (a próxima via da rota, ou uma logo depois: a 4×/s uma via curtinha pode passar entre duas olhadas)
    const i = N.esperado.indexOf(N.viaAnt), k = N.esperado.indexOf(p.via)
    if (N.viaAnt >= 0 && N.esperado.length && !(i >= 0 && k > i && k <= i + 3)) { N.recalc = performance.now(); N.recalculos++ }
    N.viaAnt = p.via
  }
  if (livre) N.viaAnt = -1
  let rota: Rota | null = null
  N.saida = null
  if (!livre) {
    if (destino.via !== undefined && destino.u !== undefined) rota = rotaNav(M, { via: p.via, u: p.u }, { via: destino.via, u: destino.u }, apagada)
    else {
      // o destino fora da pista (o chão do subúrbio): a rota vai até a pista mais perto dele
      const pp = pistaPerto(M, destino.nome, destino.x, destino.z, apagada)
      if (pp.via >= 0) {
        rota = rotaNav(M, { via: p.via, u: p.u }, pp, apagada)
        const V = M.vias[pp.via], i = Math.max(0, Math.min(V.n - 1, Math.round(pp.u / PASSO)))
        N.saida = { x: V.px[i], z: V.pz[i] }
      }
    }
  }
  N.rota = rota
  N.reta = !rota
  if (rota) {
    N.esperado = rota.trechos.map((t) => t.via)
    N.manobras = manobrasDa(M, rota, { ...destino, chao: destino.via === undefined })
    const extra = N.saida ? Math.hypot(destino.x - N.saida.x, destino.z - N.saida.z) : 0
    N.metros = rota.metros + extra
  } else {
    N.esperado = []
    const k = livre ? { x: p.wx!, z: p.wz! } : null
    const d = k ? Math.hypot(destino.x - k.x, destino.z - k.z) : -1
    N.metros = d
    const lado: -1 | 0 | 1 = Math.abs(ang) < C.retoGraus ? 0 : ang > 0 ? 1 : -1
    N.manobras = [lado === 0
      ? { dist: Math.max(0, d), tipo: "mira", lado, via: -1, texto: `segue reto até ${destino.nome}` }
      : { dist: 0, tipo: "mira", lado, via: -1, texto: `vira ${LADO(lado)} pra ${destino.nome}` }]
  }
  N.proxima = N.manobras[0] ?? null
  N.segundos = N.metros >= 0 ? N.metros / Math.max(C.vMin, N.vMedia) : -1
}

// a faixa no chão: o lado (m, + direita) por onde ela passa a `d` m da Kombi
// (perto de uma rampa, ela já puxa pra faixa da saída, como o Waze mostrando a pista certa)
export function ladoDaFaixa(d: number) {
  const C = NAV_CFG
  for (const m of NAV.manobras) {
    if (m.tipo !== "rampa") continue
    const falta = m.dist - d
    if (falta < -10 || falta > C.faixaAntes) continue
    const k = falta < 0 ? 1 : 1 - falta / C.faixaAntes
    return m.lado * 5.6 * (k * k * (3 - 2 * k))
  }
  return 0
}
