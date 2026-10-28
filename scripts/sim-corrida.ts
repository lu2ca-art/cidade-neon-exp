// simula a corrida das trincheiras (T13) sem tela: o piloto automático dá a
// volta com cada veículo; confere portões, chegada, rivais. bun scripts/sim-corrida.ts
import { FISICA, L_VOLTA, VEICULOS } from "../app/teste/trincheiras/corrida"
import { PASSO, corridaInicial, estadoInicial, passo, passoCorrida, piloto } from "../app/teste/trincheiras/fisica"

console.log("volta:", Math.round(L_VOLTA), "m")
for (const v of VEICULOS) {
  const s = estadoInicial(), c = corridaInicial("contagem", v)
  let t = 0
  while (c.fase !== "chegou" && t < 200) {
    passo(s, piloto(s), PASSO, FISICA[v], c.fase === "contagem", c.tempo)
    passoCorrida(c, s, PASSO, v, () => {})
    t += PASSO
  }
  console.log(v, { fase: c.fase, tempo: c.tempo.toFixed(2), cp: c.cp, parciais: c.parciais.map((p) => p.toFixed(1)), lugar: c.lugar, rivais: c.rivais.map((r) => `${r.nome} ${r.fim?.toFixed(1)}`), voos: s.voos })
}
