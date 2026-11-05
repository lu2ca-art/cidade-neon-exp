// mede cada rua do disco: o comprimento de uma volta, a velocidade da pista
// (2 × BPM km/h, sem turbo), o tempo da volta e a duração da faixa.
//   bun scripts/medir-ruas.ts            a tabela do mundo como está
//   bun scripts/medir-ruas.ts --ajustar  acha ESCALA_GRUPO e ALONGA (mundoDisco.ts)
//                                        pra cada volta ≈ a faixa (um pouco mais)
// docs/ruas-faixa.md
import { ESCALA_GRUPO, V_TORRE, montarMundoDisco, type MundoDisco } from "../app/linha/estrada/mundoDisco"
import { PISTAS, velocidade } from "../app/linha/estrada/pistas"

// o arquivo que toca hoje (ffprobe em public/audio/pistas): o instrumental
// enquanto a voz não sai. O alvo é o mais longo entre ele e PISTAS.duracao
const INST: Record<string, number> = { ontem: 159.0, copo: 174.1, swav: 188.5, sexta: 201.8, rollercoaster: 295.4, dopamina: 150.9, chuva: 188.4, ojala: 175.2, nectar: 154.9 }
const alvoDe = (id: string, dur: number) => Math.max(dur, INST[id] ?? 0)
const GRUPOS = [["Nectar", "Sexta-Feira", "Ojalá"], ["Rollercoaster", "Swav", "DopaminA"], ["Copo Americano", "CHUVA", "Sabe Ontem?"]]

type Medida = { nome: string; ida: number; volta: number; kmh: number; t: number; alvo: number; razao: number }
function medir(M: MundoDisco): Medida[] {
  return M.pistas.map((p, k) => {
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
      const ex = ent.px[ent.n - 1], ez = ent.pz[ent.n - 1]
      let uE = 0, dm = Infinity
      an.vias.forEach((vi, j) => { const v = M.vias[vi]; for (let i = 0; i < v.n; i++) { const d = Math.hypot(v.px[i] - ex, v.pz[i] - ez); if (d < dm) { dm = d; uE = an.ini[j] + i * (v.L / (v.n - 1)) } } })
      anel = (((s.u - uE) % an.L) + an.L) % an.L
    }
    const v = velocidade(fx), rua = L(p.ida) + L(p.volta) + alcas
    const t = rua / v + anel / V_TORRE, alvo = alvoDe(fx.id, fx.duracao)
    return { nome: p.nome, ida: L(p.ida), volta: rua + anel, kmh: v * 3.6, t, alvo, razao: t / alvo }
  })
}

function extensao(M: MundoDisco) {
  let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity
  for (const v of M.vias) for (let i = 0; i < v.n; i++) { xmin = Math.min(xmin, v.px[i]); xmax = Math.max(xmax, v.px[i]); zmin = Math.min(zmin, v.pz[i]); zmax = Math.max(zmax, v.pz[i]) }
  return { xmin, xmax, zmin, zmax }
}

function tabela(M: MundoDisco) {
  const r = medir(M), e = extensao(M)
  console.log("| pista | ida (m) | volta inteira (m) | km/h | volta (s) | faixa (s) | volta / faixa |\n|---|---|---|---|---|---|---|")
  for (const m of r) console.log(`| ${m.nome} | ${Math.round(m.ida)} | ${Math.round(m.volta)} | ${m.kmh.toFixed(0)} | ${m.t.toFixed(0)} | ${m.alvo.toFixed(0)} | ${m.razao.toFixed(2).replace(".", ",")} |`)
  console.log(`mundo: x ${Math.round(e.xmin)}…${Math.round(e.xmax)}, z ${Math.round(e.zmin)}…${Math.round(e.zmax)}; conflitos: ${JSON.stringify(M.conflitos)}`)
  console.log("torres:", M.torres.map((t) => `(${Math.round(t.x)}, ${Math.round(t.z)}) r${Math.round(t.raio)}`).join(" | "))
}

// o alvo: a volta um pouco acima da faixa (o "pelo menos" da bíblia)
const META = 1.03
if (process.argv.includes("--ajustar")) {
  // 1) a escala de cada grupo: a primeira linha do grupo a chegar na meta (as outras se alongam depois)
  const lo = [1, 1, 1], hi = [5, 5, 5]
  for (let it = 0; it < 14; it++) {
    const s = lo.map((_, g) => (lo[g] + hi[g]) / 2)
    const r = medir(montarMundoDisco({ escala: s, alonga: {} }))
    GRUPOS.forEach((nomes, g) => { const mx = Math.max(...nomes.map((n) => r.find((m) => m.nome === n)!.razao)); if (mx < META) lo[g] = s[g]; else hi[g] = s[g] })
  }
  const esc = lo.map((_, g) => +((lo[g] + hi[g]) / 2).toFixed(3))
  // 2) o alongamento de cada linha (as do grupo que ainda não chegam)
  const nomes = GRUPOS.flat(), al: Record<string, number> = {}, alo: Record<string, number> = {}, ahi: Record<string, number> = {}
  for (const n of nomes) { alo[n] = 1; ahi[n] = 8 }
  for (let it = 0; it < 16; it++) {
    for (const n of nomes) al[n] = (alo[n] + ahi[n]) / 2
    const r = medir(montarMundoDisco({ escala: esc, alonga: al }))
    for (const n of nomes) { if (r.find((m) => m.nome === n)!.razao < META) alo[n] = al[n]; else ahi[n] = al[n] }
  }
  for (const n of nomes) al[n] = +((alo[n] + ahi[n]) / 2).toFixed(3)
  for (const n of nomes) if (al[n] < 1.002) delete al[n]
  console.log("export const ESCALA_GRUPO =", JSON.stringify(esc))
  console.log("export const ALONGA: Record<string, number> =", JSON.stringify(al))
  tabela(montarMundoDisco({ escala: esc, alonga: al }))
} else {
  console.log("ESCALA_GRUPO", ESCALA_GRUPO)
  tabela(montarMundoDisco())
}
