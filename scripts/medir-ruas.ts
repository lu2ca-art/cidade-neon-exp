// mede cada rua do disco: o comprimento de uma volta, a velocidade da pista
// (2 × BPM km/h, sem turbo), o tempo da volta e a duração da faixa.
// bun scripts/medir-ruas.ts
import { montarMundoDisco, V_TORRE } from "../app/linha/estrada/mundoDisco"
import { PISTAS, velocidade } from "../app/linha/estrada/pistas"

// o arquivo que toca hoje (ffprobe em public/audio/pistas): o instrumental
// enquanto a voz não sai. O alvo é o mais longo entre ele e PISTAS.duracao
const INST: Record<string, number> = { ontem: 159.0, copo: 174.1, swav: 188.5, sexta: 201.8, rollercoaster: 295.4, dopamina: 150.9, chuva: 188.4, ojala: 175.2, nectar: 154.9 }
export const alvoDe = (id: string, dur: number) => Math.max(dur, INST[id] ?? 0)

const M = montarMundoDisco()
const t0 = Date.now()
const linhas: string[] = []
let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity
for (const v of M.vias) for (let i = 0; i < v.n; i++) { xmin = Math.min(xmin, v.px[i]); xmax = Math.max(xmax, v.px[i]); zmin = Math.min(zmin, v.pz[i]); zmax = Math.max(zmax, v.pz[i]) }
M.pistas.forEach((p, k) => {
  const fx = PISTAS.find((q) => q.faixa === p.nome)!
  const L = (vi: number) => M.vias[vi].L
  const vias = M.info.map((f, vi) => ({ f, vi })).filter(({ f }) => f.pista === k)
  const alcas = vias.filter(({ f }) => f.parte === "saida" || f.parte === "entrada").reduce((a, { vi }) => a + L(vi), 0)
  // o anel da ponta: da chegada desta linha até a saída dela (mão única)
  const tp = vias.find(({ f }) => f.parte === "entrada" && f.torre > 0)?.f.torre
  let anel = 0
  if (tp !== undefined) {
    const an = M.aneis.find((a) => a.torre === tp)!
    const s = an.saidas.find((x) => x.pista === k)!
    const ent = M.vias[vias.find(({ f }) => f.parte === "entrada" && f.torre === tp)!.vi]
    // o fim da entrada encosta no anel: acha o u do anel mais perto
    const ex = ent.px[ent.n - 1], ez = ent.pz[ent.n - 1]
    let uE = 0, dm = Infinity
    an.vias.forEach((vi, j) => { const v = M.vias[vi]; for (let i = 0; i < v.n; i++) { const d = Math.hypot(v.px[i] - ex, v.pz[i] - ez); if (d < dm) { dm = d; uE = an.ini[j] + i * (v.L / (v.n - 1)) } } })
    anel = (((s.u - uE) % an.L) + an.L) % an.L
  }
  const v = velocidade(fx)
  const rua = L(p.ida) + L(p.volta) + alcas
  const t = rua / v + anel / V_TORRE
  const alvo = alvoDe(fx.id, fx.duracao)
  linhas.push([p.nome, Math.round(L(p.ida)), Math.round(rua + anel), (v * 3.6).toFixed(0), t.toFixed(0), alvo.toFixed(0), (t / alvo).toFixed(2)].join("\t"))
})
console.log("pista\tida(m)\tvolta(m)\tkm/h\tt volta(s)\tfaixa(s)\trazão")
console.log(linhas.join("\n"))
console.log("mundo:", Math.round(xmin), Math.round(xmax), Math.round(zmin), Math.round(zmax), "conflitos:", M.conflitos, "ms", Date.now() - t0)
console.log("torres:", M.torres.map((t) => `${Math.round(t.x)},${Math.round(t.z)} r${Math.round(t.raio)}`).join(" | "))
