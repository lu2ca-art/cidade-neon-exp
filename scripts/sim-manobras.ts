// confere o grind e o embalo do skate e as manobras da BMX, sem tela
import { FISICA } from "../app/teste/trincheiras/corrida"
import { PASSO, estadoInicial, passo, type Entrada } from "../app/teste/trincheiras/fisica"
import { AVENIDAS, VOLTA } from "../app/teste/trincheiras/mapa"

const E = (o: Partial<Entrada>): Entrada => ({ frente: false, re: false, esq: false, dir: false, pulo: false, jato: false, ...o })
function noRio(v: "skate" | "bmx" | "patins", kmh: number, angulo: number) {
  const s = estadoInicial(), a = AVENIDAS[0].pts, p = a[60], q = a[61]
  const yaw = Math.atan2(q.x - p.x, q.z - p.z) + angulo
  Object.assign(s, { x: p.x, z: p.z, yaw, vx: Math.sin(yaw) * kmh / 3.6, vz: Math.cos(yaw) * kmh / 3.6 })
  s.onde = { ...s.onde, e: -8 }; s.iVolta = 60
  return s
}
// 1) skate: entra na parede em diagonal segurando o grind
{
  const s = noRio("skate", 90, 0.5); let maxV = 0, grindT = 0
  for (let t = 0; t < 4; t += PASSO) { passo(s, E({ jato: true, frente: true }), PASSO, FISICA.skate, false, t); if (s.grind) grindT += PASSO; maxV = Math.max(maxV, Math.hypot(s.vx, s.vz)) }
  console.log("skate grind:", { grinds: s.total.grinds, grindT: grindT.toFixed(2), kmhMax: Math.round(maxV * 3.6), aindaNoTrilho: s.grind, y: s.y.toFixed(2) })
}
// 2) skate: sem empurrar, seguindo o rio pelo meio x zigue-zague de parede a parede (o embalo)
for (const zig of [false, true]) {
  const s = noRio("skate", 80, 0)
  for (let t = 0; t < 10; t += PASSO) {
    const k = (s.iVolta + 11) % VOLTA.length, a = VOLTA[k], b = VOLTA[(k + 1) % VOLTA.length]
    const L = Math.hypot(b.x - a.x, b.z - a.z), lado = zig ? (Math.floor(t / 1.1) % 2 ? 1 : -1) * 13 : 0
    const ax = a.x + ((b.z - a.z) / L) * lado, az = a.z - ((b.x - a.x) / L) * lado
    let dif = Math.atan2(ax - s.x, az - s.z) - s.yaw; dif = Math.atan2(Math.sin(dif), Math.cos(dif))
    passo(s, E({ esq: dif > 0.04, dir: dif < -0.04 }), PASSO, FISICA.skate, false, t)
  }
  console.log(zig ? "skate zigue-zague 10 s:" : "skate pelo meio 10 s:", Math.round(Math.hypot(s.vx, s.vz) * 3.6), "km/h, andou", Math.round(s.dist), "m")
}
// 3) BMX: pula, manobra, cai limpo; e outra que cai no meio
for (const tarde of [false, true]) {
  const s = noRio("bmx", 90, 0); let t = 0
  passo(s, E({ pulo: true, frente: true }), PASSO, FISICA.bmx, false, t)
  const quando = tarde ? 0.7 : 0.05
  const v0 = Math.hypot(s.vx, s.vz)
  for (; t < 2; t += PASSO) passo(s, E({ frente: false, jato: t > quando && t < quando + 0.1 }), PASSO, FISICA.bmx, false, t)
  console.log(tarde ? "BMX manobra tarde:" : "BMX manobra cedo:", { manobras: s.total.manobras, tombos: s.total.tombos, antes: Math.round(v0 * 3.6), depois: Math.round(Math.hypot(s.vx, s.vz) * 3.6), aviso: s.aviso?.txt })
}
