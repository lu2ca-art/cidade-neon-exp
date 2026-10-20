// OS TRÊS ATOS (LU2CA 20/10). Cada ato tem uma linha fixa, sempre a primeira
// (as missões 1, 4 e 7), e duas variáveis, na ordem que o player quiser. Só as
// pistas disponíveis acendem o neon (na pista e no mapa); as feitas ficam
// acesas pra sempre, com as atividades delas. O resto da cidade fica apagado.
// Decisões: ~/vault/projetos/cidade-neon/mapa-disco-decisoes.md

import { PISTAS } from "./pistas"
import type { EstacaoId } from "../data"

export const ATOS: { fixo: string; variaveis: [string, string] }[] = [
  { fixo: "Nectar", variaveis: ["Sexta-Feira", "DopaminA"] },
  { fixo: "Ojalá", variaveis: ["Swav", "Copo Americano"] },
  { fixo: "Sabe Ontem?", variaveis: ["Rollercoaster", "CHUVA"] },
]

// feita: a missão dela já foi; aberta: dá pra escolher agora; apagada: ainda não
export type Luz = "feita" | "aberta" | "apagada"

// as pistas feitas, a partir dos objetos do save (cada missão dá o objeto da faixa)
export function pistasFeitas(objetos: EstacaoId[]) {
  const s = new Set<string>()
  for (const p of PISTAS) if (objetos.includes(p.id as EstacaoId)) s.add(p.faixa)
  return s
}

// a luz de cada pista (pelo nome da faixa): o fixo do ato abre primeiro; feito
// ele, as duas variáveis; feitas as duas, o fixo do próximo ato
export function luzDasPistas(feitas: Set<string>): Record<string, Luz> {
  const r: Record<string, Luz> = {}
  for (const p of PISTAS) r[p.faixa] = feitas.has(p.faixa) ? "feita" : "apagada"
  for (const ato of ATOS) {
    if (!feitas.has(ato.fixo)) { r[ato.fixo] = "aberta"; break }
    for (const v of ato.variaveis) if (!feitas.has(v)) r[v] = "aberta"
    if (!ato.variaveis.every((v) => feitas.has(v))) break
  }
  return r
}
