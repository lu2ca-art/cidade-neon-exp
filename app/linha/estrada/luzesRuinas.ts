// ONDE AS RUÍNAS ACENDEM (RuinasLuz.tsx): letreiros, tambores de fogo e varais
// de luz, sorteados com semente fixa (sempre iguais) sobre as peças postas.
// Cada coisa é conferida com raio na malha de verdade da peça (não na caixa de
// colisão, que é o pé dela): o letreiro só vai onde tem parede de fachada nas
// duas pontas, o varal só liga duas fachadas de verdade do outro lado da rua.
// Roda uma vez, quando o subúrbio monta (algumas centenas de raios).

import * as THREE from "three"

import type { PecaPosta } from "./ruinas"
import { PECAS_RUINAS } from "./ruinasDados"

export type Letreiro = { x: number; y: number; z: number; rumo: number; larg: number; alt: number; cel: number; cor: number; fase: number }
export type Tambor = { x: number; y: number; z: number; fase: number }
export type Varal = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; flecha: number; cores: number }
export type LuzesRuinas = { letreiros: Letreiro[]; tambores: Tambor[]; varais: Varal[] }

type MundoMin = { livre: (x: number, z: number, folga: number) => boolean; chao: (x: number, z: number) => number }

// a parte da fachada no atlas das ruínas (à direita é concreto/entulho)
const U_FACHADA = 0.868
// palavras do atlas de letreiros (RuinasLuz.tsx, LETREIROS): 0–11 palavras, 12–15 tubos
export const N_PALAVRAS = 12

function semente(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sortearLuzes(pecas: { posta: PecaPosta; malha: THREE.Mesh }[], M: MundoMin, colisores: number[]): LuzesRuinas {
  const rnd = semente(0x5eb0b)
  const malhas = pecas.map((p) => p.malha)
  // (as matrizes do mundo já vêm em dia: RuinasSuburbio chama updateMatrixWorld)
  const ray = new THREE.Raycaster()
  const o = new THREE.Vector3(), d = new THREE.Vector3()
  // o raio bate numa fachada (e não no concreto da quebra) da malha `so` (ou de outra, se `so` for null)
  const fachada = (ox: number, oy: number, oz: number, dx: number, dz: number, longe: number, so: THREE.Mesh | null, nao?: THREE.Mesh) => {
    o.set(ox, oy, oz); d.set(dx, 0, dz)
    ray.set(o, d); ray.near = 0; ray.far = longe
    const h = ray.intersectObjects(so ? [so] : malhas, false)[0]
    if (!h || (nao && h.object === nao) || !h.uv || h.uv.x >= U_FACHADA) return null
    return h
  }
  // dentro de alguma caixa de colisão das ruínas (com folga)?
  const dentro = (x: number, z: number, folga: number) => {
    for (let k = 0; k < colisores.length; k += 9) {
      const dx = x - colisores[k], dz = z - colisores[k + 1], s = colisores[k + 2], c = colisores[k + 3]
      const lx = dx * c - dz * s, lz = dx * s + dz * c
      if (Math.abs(lx) < colisores[k + 4] + folga && Math.abs(lz) < colisores[k + 5] + folga) return true
    }
    return false
  }

  const letreiros: Letreiro[] = [], tambores: Tambor[] = [], varais: Varal[] = []
  for (const { posta: p, malha } of pecas) {
    const P = PECAS_RUINAS[p.peca]
    if (P.nome.startsWith("entulho")) continue
    const inteira = !P.nome.includes("_")
    const [cx, cz, hx, hz] = P.caixas[0]
    const s = Math.sin(p.giro), c = Math.cos(p.giro)
    const bx = p.x + cx * c + cz * s, bz = p.z - cx * s + cz * c
    // as 4 faces da caixa do pé: normal pra fora (mundo), meia profundidade e meia largura
    const faces = [
      { nx: c, nz: -s, h: hx, w: hz }, { nx: -c, nz: s, h: hx, w: hz },
      { nx: s, nz: c, h: hz, w: hx }, { nx: -s, nz: -c, h: hz, w: hx },
    ]
    // a parede em (face, deslocamento na face, altura sobre o chão daquele ponto)
    const parede = (f: (typeof faces)[number], t: number, alt: number) => {
      const tx = -f.nz, tz = f.nx
      const fx = bx + f.nx * (f.h + 4) + tx * t, fz = bz + f.nz * (f.h + 4) + tz * t
      const h = fachada(fx, M.chao(fx, fz) + alt, fz, -f.nx, -f.nz, 7, malha)
      return h ? { p: h.point, tx, tz } : null
    }

    // LETREIRO (~1 em 3): no térreo (a 3,2 m, a altura da loja), ou mais alto
    // no prédio inteiro. Precisa de fachada no meio e nas duas pontas.
    if (rnd() < 0.36 && letreiros.length < 80) {
      const f = faces[Math.floor(rnd() * 4)]
      const tubo = rnd() < 0.25
      const larg = tubo ? 4.5 + rnd() * 2 : 3.2, alt = 0.8
      const t = (rnd() * 2 - 1) * Math.max(0, f.w - larg / 2 - 0.6)
      const y = inteira && rnd() < 0.35 ? 6.5 + rnd() * 4 : 3.2 + rnd() * 0.5
      const meio = parede(f, t, y)
      if (meio && parede(f, t - larg / 2, y) && parede(f, t + larg / 2, y)) {
        letreiros.push({
          x: meio.p.x + f.nx * 0.12, y: meio.p.y, z: meio.p.z + f.nz * 0.12, rumo: Math.atan2(f.nx, f.nz),
          larg, alt, cel: tubo ? N_PALAVRAS + Math.floor(rnd() * 4) : Math.floor(rnd() * N_PALAVRAS),
          cor: Math.floor(rnd() * 6), fase: rnd(),
        })
      }
    }

    // TAMBOR DE FOGO (~1 em 7): encostado na fachada (1,8 m dela), às vezes dois
    if (rnd() < 0.15 && tambores.length < 40) {
      const f = faces[Math.floor(rnd() * 4)]
      const w = parede(f, (rnd() * 2 - 1) * f.w * 0.7, 1.2)
      if (w) {
        const n = rnd() < 0.35 ? 2 : 1
        for (let k = 0; k < n; k++) {
          const x = w.p.x + f.nx * 1.8 + w.tx * k * 1.1, z = w.p.z + f.nz * 1.8 + w.tz * k * 1.1
          if (dentro(x, z, 0.6) || !M.livre(x, z, 1)) continue
          tambores.push({ x, y: M.chao(x, z), z, fase: rnd() })
        }
      }
    }

    // VARAL DE LUZ (~1 em 3): da fachada desta peça até a fachada de outra do
    // outro lado da rua (8 a 24 m), a 5–6,5 m do chão
    if (rnd() < 0.36 && varais.length < 45) {
      const f = faces[Math.floor(rnd() * 4)]
      const a = parede(f, (rnd() * 2 - 1) * f.w * 0.6, 5 + rnd() * 1.5)
      if (a) {
        const b = fachada(a.p.x + f.nx * 0.3, a.p.y, a.p.z + f.nz * 0.3, f.nx, f.nz, 24, null, malha)
        if (b && b.distance > 7.7) {
          const mx = (a.p.x + b.point.x) / 2, mz = (a.p.z + b.point.z) / 2
          if (!varais.some((v) => Math.hypot((v.ax + v.bx) / 2 - mx, (v.az + v.bz) / 2 - mz) < 7)) {
            varais.push({
              ax: a.p.x + f.nx * 0.05, ay: a.p.y, az: a.p.z + f.nz * 0.05,
              bx: b.point.x - f.nx * 0.05, by: b.point.y, bz: b.point.z - f.nz * 0.05,
              flecha: 0.5 + rnd() * 0.8, cores: Math.floor(rnd() * 3),
            })
          }
        }
      }
    }
  }
  return { letreiros, tambores, varais }
}
