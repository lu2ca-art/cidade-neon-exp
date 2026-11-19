// Confere o traçado da corrida de rua do subúrbio (disco/corridaRua.ts): só
// calcula, não desenha nada. Mede o comprimento da volta, a folga até a parede
// mais perto (as caixas das ruínas), os pilares das pistas, os lugares do chão,
// a rampa do túnel e a borda do subúrbio; e imprime o traçado em ASCII.
//   bun scripts/corrida-rua-conferir.ts
import { montarMundoDisco } from "../app/linha/estrada/mundoDisco"
import { ruinasNoMundo } from "../app/linha/estrada/ruinas"
import { pilaresDoMundo } from "../app/linha/estrada/pistaQuadras"
import { CHAO_LUGARES, SUBURBIO } from "../app/linha/disco/historia"
import { BOCA } from "../app/linha/estrada/chao"
import { CANTOS_RUA, L_RUA, VOLTA_RUA, PORTOES_RUA } from "../app/linha/disco/corridaRua"

const M = montarMundoDisco()
const { colisores } = ruinasNoMundo(M)
const pil = pilaresDoMundo(M).filter(([x, , z]) => Math.hypot(x - SUBURBIO.x, z - SUBURBIO.z) < SUBURBIO.r + 60)
const parede = (x: number, z: number) => {
  let m = Infinity
  for (let q = 0; q < colisores.length; q += 9) {
    const [cx, cz, s, c, hx, hz] = colisores.slice(q, q + 6)
    const dx = x - cx, dz = z - cz, lx = dx * c - dz * s, lz = dx * s + dz * c
    m = Math.min(m, Math.hypot(Math.max(0, Math.abs(lx) - hx), Math.max(0, Math.abs(lz) - hz)))
  }
  return m
}
let folga = Infinity, pilar = Infinity, borda = Infinity
const lug: Record<string, number> = {}
for (const p of VOLTA_RUA) {
  folga = Math.min(folga, parede(p.x, p.z))
  for (const [x, , z] of pil) pilar = Math.min(pilar, Math.hypot(x - p.x, z - p.z))
  borda = Math.min(borda, SUBURBIO.r - Math.hypot(p.x - SUBURBIO.x, p.z - SUBURBIO.z))
  for (const [id, l] of Object.entries(CHAO_LUGARES)) lug[id] = Math.min(lug[id] ?? Infinity, Math.hypot(l.x - p.x, l.z - p.z))
  lug["rampa do túnel"] = Math.min(lug["rampa do túnel"] ?? Infinity, Math.hypot(BOCA.x - BOCA.ax * 30 - p.x, BOCA.z - BOCA.az * 30 - p.z))
}
console.log(`volta: ${L_RUA.toFixed(0)} m (${CANTOS_RUA.length} cantos, ${VOLTA_RUA.length} pontos, ${PORTOES_RUA.length} portões)`)
console.log(`folga até a parede: ${folga.toFixed(1)} m · pilar mais perto: ${pilar.toFixed(1)} m · da borda do subúrbio: ${borda.toFixed(1)} m`)
console.log("lugares:", Object.entries(lug).filter(([, v]) => v < 200).map(([k, v]) => `${k} ${v.toFixed(0)} m`).join(" · "))
// o ASCII: 8 m por letra, o norte (z menor) em cima
const C = 8, x0 = -920, x1 = -500, z0 = -910, z1 = -500
const W = Math.ceil((x1 - x0) / C), H = Math.ceil((z1 - z0) / C)
const g = Array.from({ length: H }, () => Array(W).fill(" "))
for (let i = 0; i < H; i++) for (let k = 0; k < W; k++) if (parede(x0 + k * C + C / 2, z0 + i * C + C / 2) < 0.01) g[i][k] = "#"
const pos = (x: number, z: number) => [Math.floor((z - z0) / C), Math.floor((x - x0) / C)]
for (const p of VOLTA_RUA) { const [i, k] = pos(p.x, p.z); if (g[i]?.[k] !== undefined) g[i][k] = "·" }
PORTOES_RUA.forEach((p, n) => { const [i, k] = pos(p.x, p.z); if (g[i]?.[k] !== undefined) g[i][k] = n === 0 ? "S" : n < 10 ? String(n) : "A" })
for (const [id, l] of Object.entries(CHAO_LUGARES)) { const [i, k] = pos(l.x, l.z); if (g[i]?.[k] !== undefined) g[i][k] = id[0].toUpperCase() }
console.log(g.map((r) => r.join("").trimEnd()).join("\n"))
