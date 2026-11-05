// AS RUÍNAS DO SUBÚRBIO (nota do dono, 03/11: "adicione mais desse modelo do
// subúrbio no mapa [...] uma cidade mais destruída com essa que temos, pra
// poder ter a física certinha ali também com os objetos").
//
// O traçado e as peças vêm do Blender (blender/scripts/suburbio_ruinas.py →
// ruinasDados.ts + public/models/suburbio-ruinas.glb): quadras de 40 m e ruas de
// 12 m no chão do subúrbio (SUBURBIO), longe dos lugares do chão. Aqui cada
// peça assenta no relevo (o ponto mais baixo do pé dela, um pouco enterrada:
// as dunas inclinam), sai de onde o mundo não está livre (pista, torre) e vira
// caixa de colisão no mesmo formato dos prédios (Campo.tsx, COL_PASSO).

import { CHAO_LUGARES } from "../disco/historia"
import { PECAS_RUINAS, TRACO_RUINAS } from "./ruinasDados"

export type PecaPosta = { peca: number; x: number; y: number; z: number; giro: number }
type MundoMin = { livre: (x: number, z: number, folga: number) => boolean; chao: (x: number, z: number) => number }

// (a parede mais perto de um lugar do chão: o traçado já deixa 30 m ou mais; aqui
// confere de novo com os lugares de verdade, se algum mudar de lugar)
const FOLGA_LUGAR = 20
const ENTERRA = 0.4

const cache = new WeakMap<object, { postas: PecaPosta[]; colisores: number[] }>()

export function ruinasNoMundo(M: MundoMin): { postas: PecaPosta[]; colisores: number[] } {
  const ja = cache.get(M)
  if (ja) return ja
  const postas: PecaPosta[] = []
  const colisores: number[] = []
  const lugares = Object.values(CHAO_LUGARES)
  for (let k = 0; k < TRACO_RUINAS.length; k += 4) {
    const pi = TRACO_RUINAS[k], x = TRACO_RUINAS[k + 1], z = TRACO_RUINAS[k + 2], giro = (TRACO_RUINAS[k + 3] * Math.PI) / 2
    const P = PECAS_RUINAS[pi]
    if (!P || !M.livre(x, z, P.raio * 0.6)) continue
    const s = Math.sin(giro), c = Math.cos(giro)
    // as caixas no mundo (centro, rumo, meias medidas) e o chão mais baixo embaixo delas
    const caixas = P.caixas.map(([cx, cz, hx, hz, topo]) => ({ wx: x + cx * c + cz * s, wz: z - cx * s + cz * c, hx, hz, topo }))
    let perto = false
    for (const b of caixas) for (const l of lugares) {
      const dx = l.x - b.wx, dz = l.z - b.wz, lx = dx * c - dz * s, lz = dx * s + dz * c
      if (Math.hypot(Math.max(0, Math.abs(lx) - b.hx), Math.max(0, Math.abs(lz) - b.hz)) < FOLGA_LUGAR) perto = true
    }
    if (perto) continue
    let y = Infinity
    for (const b of caixas) for (const [a, d] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const lx = a * b.hx, lz = d * b.hz
      y = Math.min(y, M.chao(b.wx + lx * c + lz * s, b.wz - lx * s + lz * c))
    }
    y -= ENTERRA
    postas.push({ peca: pi, x, y, z, giro })
    // cada caixa: x, z, rumo (tx, tz), meia largura, meio fundo, topo, chão e o
    // topo do campo de força: bem abaixo do chão, pra cerca holográfica não
    // aparecer nas ruínas (a pé a gente encosta na parede, não num campo)
    for (const b of caixas) colisores.push(b.wx, b.wz, s, c, b.hx, b.hz, y + b.topo, y, y - 100)
  }
  const r = { postas, colisores }
  cache.set(M, r)
  return r
}

// quantos triângulos as ruínas põem na tela (todas montadas)
export const triRuinas = (postas: PecaPosta[]) => postas.reduce((t, p) => t + PECAS_RUINAS[p.peca].tri, 0)
