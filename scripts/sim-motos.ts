// simula as motos das trincheiras (T14) sem tela: o piloto automático da moto
// dá as 2 voltas pela linha do meio e depois pelas paredes; confere portões,
// voltas, chegada, rivais, wall-ride e pousos. bun scripts/sim-motos.ts
import { FISICA } from "../app/teste/trincheiras/corrida"
import { PASSO, corridaInicial, estadoInicial, passo, passoCorrida } from "../app/teste/trincheiras/fisica"
import { pilotoMoto } from "../app/teste/trincheiras/moto"

for (const parede of [false, true]) {
  const s = estadoInicial(), c = corridaInicial("contagem", "moto")
  let t = 0, yMax = 0, kmhMax = 0
  while (c.fase !== "chegou" && t < 400) {
    passo(s, pilotoMoto(s, parede), PASSO, FISICA.moto, c.fase === "contagem", c.tempo)
    passoCorrida(c, s, PASSO, "moto", () => {})
    if (s.parede) yMax = Math.max(yMax, s.y)
    kmhMax = Math.max(kmhMax, Math.hypot(s.vx, s.vz) * 3.6)
    t += PASSO
  }
  // deixa os rivais terminarem (pra ver os tempos deles)
  for (let k = 0; k < 120 * 30 && c.rivais.some((r) => r.fim == null); k++) { c.tempo += PASSO; for (const r of c.rivais) if (r.fim == null) { r.d += r.v * PASSO; if (r.d >= 1784 * c.voltas) r.fim = c.tempo } }
  console.log(parede ? "pelas paredes" : "pelo meio", {
    fase: c.fase, tempo: c.tempo.toFixed(2), volta: c.volta, cp: c.cp, parciais: c.parciais.map((p) => p.toFixed(1)), lugar: c.lugar,
    rivais: c.rivais.map((r) => `${r.nome} ${r.fim?.toFixed(1)}`), paredes: s.total.paredes, paredeMaxT: s.paredeMaxT.toFixed(1), yMaxParede: yMax.toFixed(1),
    voos: s.voos, pousos: s.total.pousos, tombos: s.total.tombos, kmhMax: Math.round(kmhMax),
  })
}

// as manobras: pulo no leito (sem mexer, nivelando, segurando o peso pra trás), a empinada e um voo da parede com backflip
import { AVENIDAS } from "../app/teste/trincheiras/mapa"
import type { Entrada } from "../app/teste/trincheiras/fisica"
const V = FISICA.moto
function noLeito(vel: number) {
  const s = estadoInicial(), a = AVENIDAS[0].pts[60], b = AVENIDAS[0].pts[61]
  s.x = a.x; s.z = a.z; s.yaw = Math.atan2(b.x - a.x, b.z - a.z); s.vx = Math.sin(s.yaw) * vel; s.vz = Math.cos(s.yaw) * vel
  s.ant = { x: s.x, z: s.z, y: 0, yaw: s.yaw }
  return s
}
const E = (o: Partial<Entrada>): Entrada => ({ frente: false, re: false, esq: false, dir: false, pulo: false, jato: false, ...o })
function rodar(nome: string, s: ReturnType<typeof estadoInicial>, ent: (t: number) => Entrada, dur: number) {
  const v0 = Math.hypot(s.vx, s.vz)
  let t = 0, ultimo = ""
  const avisos: string[] = []
  while (t < dur) { passo(s, ent(t), PASSO, V, false, t); if (s.aviso && s.aviso.txt !== ultimo) { ultimo = s.aviso.txt; avisos.push(ultimo) } t += PASSO }
  console.log(nome, { kmh: `${Math.round(v0 * 3.6)} → ${Math.round(Math.hypot(s.vx, s.vz) * 3.6)}`, tombos: s.total.tombos, pousos: s.total.pousos, flips: s.total.flips, avisos })
}
rodar("pulo sem mexer", noLeito(28), (t) => E({ frente: true, pulo: t < 0.02 }), 1.5)
rodar("pulo nivelando (▼ no fim)", noLeito(28), (t) => E({ frente: t > 0.5 ? false : true, re: t > 0.45 && t < 0.62, pulo: t < 0.02 }), 1.5)
rodar("pulo segurando ▼", noLeito(28), (t) => E({ pulo: t < 0.02, re: true }), 1.5)
rodar("empinada segurando", noLeito(25), () => E({ frente: true, jato: true }), 2)
rodar("empinada no pulso", noLeito(25), (t) => E({ frente: true, jato: t % 0.5 < 0.22 }), 3)
// voo da parede: sobe reto (devagar ao longo, rápido pra fora), segura ▼ pra dar a volta
{
  const s = noLeito(0), a = AVENIDAS[0].pts[60], b = AVENIDAS[0].pts[61], L = Math.hypot(b.x - a.x, b.z - a.z)
  const nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L
  s.yaw = Math.atan2(nx, nz); s.vx = nx * 30; s.vz = nz * 30
  for (const ate of [0.9, 1.0, 1.1, 1.2]) {
    const s2 = { ...s, ant: { ...s.ant }, total: { ...s.total } }
    rodar(`voo da parede, backflip (▼ até ${ate} s)`, s2, (t) => E({ frente: t < 0.3, re: t > 0.35 && t < ate }), 3.5)
  }
}
