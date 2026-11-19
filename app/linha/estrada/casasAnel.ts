// AS CASAS DO ANEL (19/11, o dono: "aquele mapa flutuante é o do jogo"). O subúrbio é o anel
// na beira da cratera (historia.ts, CRATERA): no mapa ilustrado ele é cheio de casinhas
// baixas; aqui também. Caixas simples (uma malha só, CasasAnel.tsx), com colisão no mesmo
// formato dos prédios e das ruínas (Campo.tsx). Fora de: pista e torre (M.livre: nada embaixo
// do asfalto), lugares do chão, rua da corrida, o bairro antigo (os 101 prédios e as ruínas).
// Só as contas (sem three): a posição é sorteada com semente fixa, igual em toda máquina.

import { CHAO_LUGARES, CRATERA, SUBURBIO, beiraCratera } from "../disco/historia"
import { CANTOS_RUA } from "../disco/corridaRua"

export const CASAS_ANEL_CFG = {
  quantas: 1300, // o alvo (as que não cabem, ficam de fora)
  tentativas: 6000,
  folgaLugar: 95, // m de um lugar do chão
  folgaRua: 30, // m da rua da corrida
  folgaBairro: 60, // m além do raio do bairro antigo
  folgaPista: 6, // m além da borda do asfalto (M.livre)
  margem: 50, // m depois da beira da cratera
}

export type CasaAnel = { x: number; y: number; z: number; w: number; d: number; h: number; giro: number; cor: number }
type MundoMin = { livre: (x: number, z: number, folga: number) => boolean; chao: (x: number, z: number) => number }

export const CORES_CASAS = ["#7d6a58", "#4f7c86", "#8c5638", "#5b6e8f", "#9a8a70", "#6a4a5a"]

function semente(s: number) {
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const ateRua = (x: number, z: number) => {
  let m = Infinity
  for (let i = 0; i < CANTOS_RUA.length; i++) {
    const [ax, az] = CANTOS_RUA[i], [bx, bz] = CANTOS_RUA[(i + 1) % CANTOS_RUA.length]
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)))
    m = Math.min(m, Math.hypot(x - ax - t * dx, z - az - t * dz))
  }
  return m
}

const cache = new WeakMap<object, { casas: CasaAnel[]; colisores: number[] }>()
export function casasDoAnel(M: MundoMin, evitar: number[] = []): { casas: CasaAnel[]; colisores: number[] } {
  const ja = cache.get(M)
  if (ja) return ja
  const C = CASAS_ANEL_CFG, r = semente(5), casas: CasaAnel[] = [], colisores: number[] = []
  const lugares = Object.values(CHAO_LUGARES)
  // as casas não se encostam: uma grade de 40 m com as já postas
  const grade = new Map<string, number[]>(), CEL = 40
  const perto = (x: number, z: number, raio: number) => {
    const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL)
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const l = grade.get(`${cx + a},${cz + b}`); if (l) for (let q = 0; q < l.length; q += 3) if (Math.hypot(l[q] - x, l[q + 1] - z) < l[q + 2] + raio + 4) return true }
    return false
  }
  // as ruínas (e o que mais vier): os colisores de quem já está ali (x, z, .., meia largura, meio fundo)
  for (let q = 0; q < evitar.length; q += 9) { const x = evitar[q], z = evitar[q + 1], key = `${Math.floor(x / CEL)},${Math.floor(z / CEL)}`; let l = grade.get(key); if (!l) grade.set(key, (l = [])); l.push(x, z, Math.hypot(evitar[q + 4], evitar[q + 5])) }
  for (let i = 0; i < C.tentativas && casas.length < C.quantas; i++) {
    const a = r() * Math.PI * 2, d = beiraCratera(a) + C.margem + Math.pow(r(), 1.7) * (CRATERA.larg - C.margem)
    const x = CRATERA.x + Math.cos(a) * d, z = CRATERA.z + Math.sin(a) * d
    const w = 8 + r() * 14, fd = 6 + r() * 10, h = 4 + r() * 9, giro = r() * Math.PI * 2, cor = Math.floor(r() * CORES_CASAS.length), raio = Math.hypot(w, fd) / 2
    if (Math.hypot(x - SUBURBIO.x, z - SUBURBIO.z) < SUBURBIO.r + C.folgaBairro) continue
    if (lugares.some((l) => Math.hypot(l.x - x, l.z - z) < C.folgaLugar)) continue
    if (ateRua(x, z) < C.folgaRua) continue
    if (!M.livre(x, z, raio + C.folgaPista)) continue
    if (perto(x, z, raio)) continue
    // assenta no chão mais baixo do pé (as dunas inclinam), um pouco enterrada
    const s = Math.sin(giro), c = Math.cos(giro)
    let y = Infinity
    for (const [p, q] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const lx = (p * w) / 2, lz = (q * fd) / 2; y = Math.min(y, M.chao(x + lx * c + lz * s, z - lx * s + lz * c)) }
    y -= 0.4
    casas.push({ x, y, z, w, d: fd, h, giro, cor })
    const key = `${Math.floor(x / CEL)},${Math.floor(z / CEL)}`
    let l = grade.get(key); if (!l) grade.set(key, (l = [])); l.push(x, z, raio)
    // o colisor: centro, rumo (tx, tz), meias medidas, topo, chão e o campo de força bem abaixo do chão
    colisores.push(x, z, s, c, w / 2, fd / 2, y + h, y, y - 100)
  }
  const out = { casas, colisores }
  cache.set(M, out)
  return out
}
