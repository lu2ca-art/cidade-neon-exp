// A SINUCA (T17): a cabeça do Mubarak. Ele olha as tacadas possíveis (bola
// da vez → caçapa com o caminho livre), simula as melhores com a MESMA física
// do jogo e escolhe a que encaçapa e deixa a branca boa pra próxima. Depois
// erra um pouco, como gente (NIVEL). Roda em pedaços (generator): o jogo
// chama alguns milissegundos por quadro e a tela não engasga.

import { R, L, W, H, VMAX, CACAPAS, CABECEIRA, clonar, tacar, passo, cabe, type Mesa } from "./fisica"
import { alvos, julgar, type Regras } from "./regras"

export const NIVEL = {
  erroAng: 0.011, // rad de desvio (desvio-padrão): ~0,6° ("de leve": dá pra ganhar dele)
  erroVel: 0.06,
  candidatos: 5, // quantas tacadas ele simula de verdade
}

export interface Plano { ang: number; vel: number; ex: number; ey: number; mao: { x: number; y: number } | null }

const livre = (m: Mesa, ax: number, ay: number, bx: number, by: number, ignorar: number[]) => {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey
  for (const b of m.bolas) {
    if (!b.ativa || ignorar.includes(b.id)) continue
    let t = ((b.x - ax) * ex + (b.y - ay) * ey) / l2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const dx = b.x - (ax + ex * t), dy = b.y - (ay + ey * t)
    if (dx * dx + dy * dy < 4 * R * R * 0.98) return false
  }
  return true
}

interface Cand { ang: number; vel: number; geo: number; alvo: number }

// as tacadas diretas boas a partir de onde está a branca
function geometricas(m: Mesa, ids: number[], cx: number, cy: number): Cand[] {
  const out: Cand[] = []
  for (const id of ids) {
    const o = m.bolas.find((b) => b.id === id && b.ativa)
    if (!o) continue
    for (const p of CACAPAS) {
      // mira um tiquinho pra dentro da boca
      const mx = p.bx + (p.x - p.bx) * 0.3, my = p.by + (p.y - p.by) * 0.3
      let dx = mx - o.x, dy = my - o.y
      const d2 = Math.hypot(dx, dy); dx /= d2; dy /= d2
      // caçapa do meio: ângulo muito fechado não entra
      if (p.bx === 0 && Math.abs(dy) < 0.45) continue
      const gx = o.x - dx * 2 * R, gy = o.y - dy * 2 * R
      let ux = gx - cx, uy = gy - cy
      const d1 = Math.hypot(ux, uy); if (d1 < 1e-3) continue
      ux /= d1; uy /= d1
      const cos = ux * dx + uy * dy
      if (cos < 0.25) continue
      if (!livre(m, cx, cy, gx, gy, [0, id]) || !livre(m, o.x, o.y, mx, my, [0, id])) continue
      const geo = (cos * cos) / (0.4 + d1 + 1.6 * d2)
      // velocidade: o suficiente pra chegar com sobra
      const vel = Math.min(VMAX * 0.75, 0.9 + 1.5 * (d1 * 0.6 + d2 / Math.max(0.35, cos)))
      out.push({ ang: Math.atan2(uy, ux), vel, geo, alvo: id })
    }
  }
  return out.sort((a, b) => b.geo - a.geo)
}

// onde pôr a branca na mão: atrás de uma tacada reta boa
function ondePor(m: Mesa, ids: number[], cabeceira: boolean): { x: number; y: number } {
  let melhor = { x: CABECEIRA, y: 0 }, nota = -1
  for (const id of ids) {
    const o = m.bolas.find((b) => b.id === id && b.ativa)
    if (!o) continue
    for (const p of CACAPAS) {
      let dx = p.bx - o.x, dy = p.by - o.y
      const d2 = Math.hypot(dx, dy); dx /= d2; dy /= d2
      if (p.bx === 0 && Math.abs(dy) < 0.5) continue
      if (!livre(m, o.x, o.y, p.bx, p.by, [0, id])) continue
      for (const dist of [0.25, 0.4, 0.15]) {
        const x = o.x - dx * (2 * R + dist), y = o.y - dy * (2 * R + dist)
        if (cabeceira && x > CABECEIRA) continue
        if (!cabe(m, x, y, 0) || !livre(m, x, y, o.x, o.y, [0, id])) continue
        const n = 1 / (0.3 + d2 + dist)
        if (n > nota) { nota = n; melhor = { x, y } }
      }
    }
  }
  if (nota < 0) {
    // nada reto: qualquer lugar livre perto da cabeceira
    for (let k = 0; k < 40; k++) {
      const x = cabeceira ? CABECEIRA - Math.random() * 0.4 : (Math.random() - 0.5) * (L - 4 * R)
      const y = (Math.random() - 0.5) * (W - 4 * R)
      if (cabe(m, x, y, 0)) return { x, y }
    }
  }
  return melhor
}

const gauss = () => { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

export function* pensar(m0: Mesa, r: Regras): Generator<void, Plano, void> {
  const ativos = m0.bolas.filter((b) => b.ativa).map((b) => b.id)
  const ids = alvos(r, ativos)
  let base = m0
  let mao: Plano["mao"] = null
  if (r.mao) {
    mao = ondePor(m0, ids, r.mao === "cabeceira")
    base = clonar(m0)
    const c = base.bolas[0]
    c.x = mao.x; c.y = mao.y; c.ativa = true; c.parada = true; c.vx = c.vy = c.wx = c.wy = c.wz = 0
  }
  const c = base.bolas[0]
  yield

  // a quebra: forte, no meio
  if (r.quebra) {
    const ang = Math.atan2(-c.y, L / 4 - c.x) + gauss() * 0.004
    return { ang, vel: VMAX * (0.92 + Math.random() * 0.08), ex: 0, ey: 0.1, mao }
  }

  const cands = geometricas(base, ids, c.x, c.y).slice(0, NIVEL.candidatos)
  yield
  let melhor: (Plano & { nota: number }) | null = null
  const variantes = [[1, 0], [0.75, 0], [1.25, -0.5]] as const
  for (const cd of cands) {
    for (const [fv, ey] of variantes) {
      const sim = clonar(base)
      tacar(sim, cd.ang, Math.min(VMAX, cd.vel * fv), 0, ey)
      let n = 0
      while (passo(sim, 2 * H) && n < 18000) { if (++n % 200 === 0) yield }
      const j = julgar(r, ativos, sim)
      let nota = cd.geo
      if (j.r.fim) nota += j.r.fim.vencedor === r.vez ? 1000 : -1000
      else if (j.falta) nota -= 50
      else if (j.continua) {
        // a branca ficou boa pra próxima?
        const b = sim.bolas[0]
        const prox = geometricas(sim, alvos(j.r, sim.bolas.filter((x) => x.ativa).map((x) => x.id)), b.x, b.y)
        nota += 100 + (prox[0]?.geo ?? 0) * 20 + Math.min(prox.length, 4)
      }
      if (!melhor || nota > melhor.nota) melhor = { ang: cd.ang, vel: Math.min(VMAX, cd.vel * fv), ex: 0, ey, mao, nota }
    }
    yield
  }

  if (!melhor || melhor.nota < 50) {
    // defesa: só encostar numa bola dele, sem cometer falta
    for (const id of ids) {
      const o = base.bolas.find((b) => b.id === id && b.ativa)
      if (!o || !livre(base, c.x, c.y, o.x, o.y, [0, id])) continue
      const ang = Math.atan2(o.y - c.y, o.x - c.x)
      for (const vel of [1.4, 2.2]) {
        const sim = clonar(base)
        tacar(sim, ang, vel, 0, 0)
        let n = 0
        while (passo(sim, 2 * H) && n < 18000) { if (++n % 200 === 0) yield }
        const j = julgar(r, ativos, sim)
        const nota = j.falta ? -60 : j.continua ? 100 : 10
        if (!melhor || nota > melhor.nota) melhor = { ang, vel, ex: 0, ey: 0, mao, nota }
      }
      yield
    }
  }
  if (!melhor) {
    // nada livre: bate forte na mais perto e reza
    let alvo = base.bolas.find((b) => b.ativa && ids.includes(b.id))
    let dm = Infinity
    for (const b of base.bolas) if (b.ativa && ids.includes(b.id)) { const d = Math.hypot(b.x - c.x, b.y - c.y); if (d < dm) { dm = d; alvo = b } }
    const ang = alvo ? Math.atan2(alvo.y - c.y, alvo.x - c.x) : Math.random() * Math.PI * 2
    melhor = { ang, vel: 3, ex: 0, ey: 0, mao, nota: 0 }
  }
  // a mão humana
  return { ang: melhor.ang + gauss() * NIVEL.erroAng, vel: Math.max(0.3, melhor.vel * (1 + gauss() * NIVEL.erroVel)), ex: melhor.ex, ey: melhor.ey, mao }
}
