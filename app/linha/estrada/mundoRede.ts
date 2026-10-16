// O JOGO NO MAPA NOVO (LU2CA 16/10: "melhorar o que já existia e transportar
// tudo pra essa nova abordagem do mapa"). A rede de ruas (linha/rede, o v5)
// vira vias da própria Corrida — o mesmo carro, a mesma direção, o mesmo HUD,
// o celular, as missões. Cada rua vira DUAS vias, uma por mão (a gente anda
// sempre pra frente na via, u crescente): no fim de uma, a Corrida escolhe a
// próxima que sai daquele cruzamento (a da rota marcada; sem rota, a mais
// reta ou a do lado que você segura). O relevo e o mar do v5 ficam embaixo:
// o nível do mar bate com a água de sempre (−12).

import * as THREE from "three"
import { montarRede, rota as rotaRede, type Rede } from "../rede/rede"
import { ESCALA, H, W, altura, bairro, costa } from "../rede/terreno"
import { amostrar, derivar, type Pista } from "./pista"
import type { FreqId } from "../radio"
import type { Mundo, Onde, Via } from "./mundo"
import { CANTEIROS } from "./canteiros"

export const MAO = 5.5 // meia largura de cada mão (m)
const ALT = 0.6 // metros de altura por unidade da maquete
const BASE = -15 // o nível do mar (3 m no v5) cai na água de sempre (−12)
const ELEVADA = 14

const mx = (x: number) => (x - W / 2) * ESCALA
const mz = (y: number) => (y - H / 2) * ESCALA
const ux = (X: number) => X / ESCALA + W / 2
const uy = (Z: number) => Z / ESCALA + H / 2
// a altura do chão (m, já no nível da Corrida) num ponto do mundo
export function chaoEm(X: number, Z: number) {
  const x = ux(X), y = uy(Z)
  return (y > costa(x) ? -6 : altura(x, y) * ALT) + BASE
}
const AREA: Record<string, FreqId> = { cidade: "linha", suburbio: "suburbio", mirante: "crypto", arena: "live", orla: "full", deserto: "linha", campo: "linha", mar: "full" }

export interface Ligacoes {
  rede: Rede
  saidas: number[][] // por cruzamento: as vias que saem dele
}
export type MundoRede = Mundo & { ligacoes: Ligacoes; chao: (x: number, z: number) => number }

function viaDaRua(rede: Rede, ai: number, ida: boolean): Via {
  const e = rede.arestas[ai]
  const pts = (ida ? e.pts : [...e.pts].reverse()).map(([x, y]) => new THREE.Vector3(mx(x), 0, mz(y)))
  // tira pontos colados (a spline não gosta)
  const limpos = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 4)
  if (limpos.length < 2) limpos.push(limpos[0].clone().add(new THREE.Vector3(1, 0, 1)))
  const p = amostrar(limpos, false) as Pista
  derivar(p, 0)
  // a mão: o centro da via vai pro lado direito da rua
  for (let i = 0; i < p.n; i++) { p.px[i] += -p.tz[i] * MAO; p.pz[i] += p.tx[i] * MAO }
  // a altura: o chão suavizado; a expressa sobe nos pilares no trecho elevado
  const bruto = new Float32Array(p.n), elev = new Float32Array(p.n)
  for (let i = 0; i < p.n; i++) {
    bruto[i] = Math.max(-11.5, chaoEm(p.px[i], p.pz[i])) + 0.3
    const x = ux(p.px[i])
    elev[i] = e.tipo === "expressa" && x > 600 && x < 1640 ? 1 : 0
  }
  const jan = e.tipo === "expressa" ? 60 : 16
  for (let i = 0; i < p.n; i++) {
    let s = 0, el = 0, k = 0
    for (let j = Math.max(0, i - jan); j <= Math.min(p.n - 1, i + jan); j++) { s += bruto[j]; el += elev[j]; k++ }
    p.py[i] = s / k + (el / k) * ELEVADA
    p.esq[i] = -MAO; p.dir[i] = MAO
  }
  derivar(p, 6)
  const meio = e.pts[Math.floor(e.pts.length / 2)]
  const v = Object.assign(p, {
    id: `${e.via}:${ai}${ida ? ">" : "<"}`, tipo: "rua" as const, t: AREA[bairro(meio[0], meio[1])],
    estacoes: [], rampas: [], orbs: [] as { u: number; x: number }[], turbos: [], faixas: [], chegadas: [], livre: [0, p.L] as [number, number],
    rede: { aresta: ai, ida, de: ida ? e.a : e.b, para: ida ? e.b : e.a, par: -1, tipo: e.tipo, bairro: e.bairro },
  }) as unknown as Via
  // as bolinhas de sinal: uns colares pelas ruas compridas
  if (p.L > 500) for (let u = 200; u < p.L - 150; u += 520) for (let k = 0; k < 6; k++) v.orbs.push({ u: u + k * 7, x: ((k % 3) - 1) * 1.6 })
  return v
}

let CACHE: MundoRede | null = null
export function montarMundoRede(): MundoRede {
  if (CACHE) return CACHE
  const rede = montarRede()
  const vias: Via[] = []
  rede.arestas.forEach((_, ai) => { vias.push(viaDaRua(rede, ai, true)); vias.push(viaDaRua(rede, ai, false)) })
  for (let k = 0; k < vias.length; k += 2) { vias[k].rede!.par = k + 1; vias[k + 1].rede!.par = k }
  // a estrada da casa da D-Bee (saindo da casa) faz o papel da via "deserto" da abertura
  const dbee = vias.find((v) => v.id.startsWith("dbee:") && !v.rede!.ida)
  if (dbee) dbee.id = "deserto"
  const saidas: number[][] = rede.nos.map(() => [])
  vias.forEach((v, i) => saidas[v.rede!.de].push(i))
  // cada área aponta pra rua mais comprida dela (quem ainda procura por "área")
  const circuito = {} as Record<FreqId, number>
  for (const id of ["linha", "suburbio", "crypto", "live", "full"] as FreqId[]) {
    let melhor = 0, L = -1
    // (a "linha" é a cidade neon: o deserto e o campo também caem em "linha", mas não contam aqui)
    vias.forEach((v, i) => { if (v.t === id && (id !== "linha" || v.rede!.bairro === "cidade") && v.L > L) { L = v.L; melhor = i } })
    circuito[id] = melhor
  }
  // a grade das amostras: pra cidade não nascer em cima da rua
  const CEL = 40
  const grade = new Map<string, number[]>()
  for (const v of vias) for (let i = 0; i < v.n; i += 3) {
    const key = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`
    let l = grade.get(key); if (!l) grade.set(key, (l = []))
    l.push(v.px[i], v.pz[i], Math.max(-v.esq[i], v.dir[i]), v.py[i])
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
  // ── onde fica cada coisa no mapa novo (a distribuição do LU2CA, 14/10) ──
  const POS: Record<string, [number, number]> = {
    "lugar:bar": [640, 920], "lugar:casa-drewboy": [705, 875], "lugar:escondido": [915, 1100], "lugar:beco": [610, 1010],
    "lugar:balada": [915, 590], "lugar:posto": [1105, 615], "lugar:plataforma": [1010, 495],
    "lugar:topo": [1610, 305], "lugar:casa-shows": [1630, 715], "lugar:casa-dbee": [115, 985],
    "pagina:ginasio": [1000, 945], "pagina:galeria": [830, 655], "pagina:fliperama": [715, 1085], "pagina:oficina": [990, 1175],
    "parque": [1440, 1080],
    "bomba:bomba-mirante": [1450, 440], "bomba:bomba-arena": [1500, 780], "bomba:bomba-avenida": [1250, 1160],
  }
  // encosta no lado de dentro (a calçada) da mão mais perto
  const encostar = (x: number, y: number): Onde => {
    const X = mx(x), Z = mz(y)
    let best: Onde = { via: 0, u: 0, lado: 1 }, bd = Infinity
    vias.forEach((v, vi) => {
      if (v.rede!.tipo === "expressa" || v.rede!.tipo === "rampa") return
      for (let i = 20; i < v.n - 20; i += 2) {
        const dx = X - v.px[i], dz = Z - v.pz[i], d = Math.hypot(dx, dz)
        const direita = dx * -v.tz[i] + dz * v.tx[i] > 0
        const nota = d + (direita ? 0 : 12)
        if (nota < bd) { bd = nota; best = { via: vi, u: i * 2, lado: 1 } }
      }
    })
    return best
  }
  const tabela = new Map<string, Onde>()
  for (const [k, [x, y]] of Object.entries(POS)) tabela.set(k, encostar(x, y))
  // os canteiros da Ella: espalhados pelas ruas da cidade, do subúrbio e da orla
  const lugarVago = (vi: number, u: number) => [...tabela.values()].every((o) => { const a = vias[o.via], b = vias[vi], ia = Math.floor(o.u / 2), ib = Math.floor(u / 2); return Math.hypot(a.px[ia] - b.px[ib], a.pz[ia] - b.pz[ib]) > 120 })
  const ruasDaElla = vias.map((v, vi) => ({ v, vi })).filter(({ v }) => v.rede!.ida && ["rua", "avenida", "principal", "orla", "beco"].includes(v.rede!.tipo) && ["cidade", "suburbio", "orla"].includes(v.rede!.bairro))
  const total = ruasDaElla.reduce((a, r) => a + r.v.L, 0)
  let acc = 0, k = 0
  const passo = total / CANTEIROS.length
  for (const { v, vi } of ruasDaElla) {
    for (let u = 60; u < v.L - 60 && k < CANTEIROS.length; u += 20) {
      if (acc + u < (k + 0.5) * passo) continue
      if (!lugarVago(vi, u)) continue
      tabela.set(`flor:${CANTEIROS[k].id}`, { via: vi, u, lado: 1 }); k++
    }
    acc += v.L
  }
  const onde = (chave: string) => tabela.get(chave) ?? null
  CACHE = { vias, circuito, livre, vao, conflitos: [], ligacoes: { rede, saidas }, chao: chaoEm, onde }
  return CACHE
}

// ── a rota no mapa novo: o caminho mais curto pelos cruzamentos, em trechos
// de via (o mesmo formato da rota de sempre: rota.ts) ──
export function calcularRotaRede(M: MundoRede, de: { via: number; u: number }, ate: { via: number; u: number }) {
  const A = M.vias[de.via], B = M.vias[ate.via]
  if (!A?.rede || !B?.rede) return null
  if (de.via === ate.via && ate.u >= de.u) return { trechos: [{ via: de.via, u0: de.u, u1: ate.u }], metros: ate.u - de.u }
  const r = rotaRede(M.ligacoes.rede, A.rede.para, B.rede.de)
  if (!r) return null
  const trechos = [{ via: de.via, u0: de.u, u1: A.L }]
  let metros = A.L - de.u
  r.arestas.forEach((ai, k) => {
    const vi = 2 * ai + (M.ligacoes.rede.arestas[ai].a === r.nos[k] ? 0 : 1)
    trechos.push({ via: vi, u0: 0, u1: M.vias[vi].L }); metros += M.vias[vi].L
  })
  trechos.push({ via: ate.via, u0: 0, u1: ate.u }); metros += ate.u
  return { trechos, metros }
}

// ── o relevo do v5 debaixo das ruas (afunda onde passa rua no chão) ──
export function geoRelevoRede(M: MundoRede, segX = 220, segZ = 154) {
  const geo = new THREE.PlaneGeometry(W * ESCALA, H * ESCALA, segX, segZ); geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position, cor = new Float32Array(pos.count * 3)
  const COR: Record<string, [number, number, number]> = { cidade: [0.16, 0.13, 0.24], suburbio: [0.36, 0.25, 0.17], mirante: [0.2, 0.32, 0.18], arena: [0.42, 0.25, 0.14], deserto: [0.66, 0.47, 0.27], campo: [0.25, 0.3, 0.17], orla: [0.78, 0.7, 0.52], mar: [0.12, 0.3, 0.4] }
  // os pontos de rua no chão, numa grade, pra afundar o relevo embaixo
  const CEL = 48, g = new Map<string, number[]>()
  for (const v of M.vias) for (let i = 0; i < v.n; i += 4) {
    if (v.py[i] - chaoEm(v.px[i], v.pz[i]) > 6) continue // elevada: o chão fica
    const k = `${Math.floor(v.px[i] / CEL)},${Math.floor(v.pz[i] / CEL)}`; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(v.px[i], v.pz[i], v.py[i])
  }
  for (let i = 0; i < pos.count; i++) {
    const X = pos.getX(i), Z = pos.getZ(i)
    let h = chaoEm(X, Z)
    const cx = Math.floor(X / CEL), cz = Math.floor(Z / CEL)
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = g.get(`${cx + a},${cz + b}`); if (!l) continue
      for (let q = 0; q < l.length; q += 3) { const d = Math.hypot(l[q] - X, l[q + 1] - Z); if (d < 46) h = Math.min(h, l[q + 2] - 1 - d * 0.02) }
    }
    pos.setY(i, h)
    const c = COR[bairro(ux(X), uy(Z))] ?? COR.campo
    const n = 0.85 + ((Math.sin(X * 0.013) + Math.cos(Z * 0.011)) * 0.5 + 1) * 0.08
    cor[i * 3] = c[0] * n; cor[i * 3 + 1] = c[1] * n; cor[i * 3 + 2] = c[2] * n
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cor, 3)); geo.computeVertexNormals()
  return geo
}
