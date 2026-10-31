// O METRÔ (T26): o piloto automático (?auto). Serve pro teste e pra medir:
// olha 5 m pra frente e escolhe a faixa com mais folga. `erro` (0–1) faz ele
// errar de propósito às vezes (pra ver o guarda pegar).

import { BAIAS, BANCO, GANG, MEIA, NV, PASSAGEM, RAIO, WL, inicioVagao } from "./mundo"
import type { Fuga } from "./jogo"

function meiaLivre(z: number) {
  for (let i = 0; i < NV; i++) {
    const a = inicioVagao(i)
    if (z >= a && z <= a + WL) {
      const zl = z - a
      return BAIAS.some(([b0, b1]) => zl >= b0 + 0.2 && zl <= b1 - 0.2) ? MEIA - RAIO : BANCO - RAIO
    }
    if (z > a + WL && z < a + WL + GANG) return PASSAGEM - RAIO
  }
  return BANCO - RAIO
}

export function pilotar(f: Fuga, erro = 0, r = Math.random) {
  const v = f.voce
  let melhor = v.x, custoMelhor = Infinity
  for (let x = -1.05; x <= 1.0501; x += 0.05) {
    let c = Math.abs(x - v.x) * 0.6
    for (let dz = 0.4; dz <= 5; dz += 0.4) {
      const m = meiaLivre(v.z + dz)
      if (Math.abs(x) > m) c += (Math.abs(x) - m) * 40 / dz
    }
    for (const p of f.gente) {
      const dz = p.z - v.z
      if (dz < -0.2 || dz > 5.5) continue
      const folga = Math.abs(x - p.x) - (RAIO + 0.27)
      if (folga < 0.12) c += (0.12 - folga) * 60 / Math.max(0.6, dz)
    }
    for (const p of f.planta.postes) {
      const dz = p.z - v.z
      if (dz < -0.2 || dz > 4) continue
      const folga = Math.abs(x - p.x) - (RAIO + p.r)
      if (folga < 0.08) c += (0.08 - folga) * 50 / Math.max(0.6, dz)
    }
    if (c < custoMelhor) { custoMelhor = c; melhor = x }
  }
  f.lado = Math.max(-1, Math.min(1, (melhor - v.x) * 4))
  // um erro de vez em quando: segue reto
  if (erro > 0 && r() < erro) f.lado = 0
  // empurra quem está colado na frente
  for (const p of f.gente) {
    const dz = p.z - v.z
    if (dz > 0 && dz < 1.1 && Math.abs(p.x - v.x) < RAIO + 0.27) { f.pedeEmpurrar = true; break }
  }
}
