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

// as pistas feitas, a partir dos objetos do save (cada missão dá o objeto da
// faixa), NA ORDEM em que foram feitas (o objeto entra no fim da lista)
export function pistasFeitas(objetos: EstacaoId[]) {
  const s = new Set<string>()
  for (const o of objetos) { const p = PISTAS.find((x) => x.id === o); if (p) s.add(p.faixa) }
  return s
}

// AS TORRES (LU2CA 21/10 (5): "quero que as missões que forem liberando sempre
// sejam de torres diferentes. nunca acender todas da mesma torre"). Quem mora
// em cada torre é o desenho do mapa (mundoDisco.ts, GRUPOS: tem que bater); a
// ordem dentro de cada uma é a ordem em que acendem: as faixas que já estão
// nas lojas primeiro, as que ainda vão sair (Ojalá 30/10, Swav 13/11,
// Rollercoaster 27/11) por último
export const TORRES: string[][] = [
  ["Nectar", "Sexta-Feira", "Ojalá"],
  ["DopaminA", "Rollercoaster", "Swav"],
  ["Copo Americano", "CHUVA", "Sabe Ontem?"],
]

// a luz de cada pista (pelo nome da faixa). Começa só a Nectar. Cada missão
// feita: a torre dela descansa e as outras duas acendem a próxima faixa delas
// (sempre duas abertas, cada uma numa torre; nunca duas da mesma torre). Só
// quando uma torre já acabou, a que descansava volta. O mapa vai colorindo
// espalhado: Nectar → DopaminA + Copo Americano → ...
export function luzDasPistas(feitas: Set<string>): Record<string, Luz> {
  const r: Record<string, Luz> = {}
  for (const p of PISTAS) r[p.faixa] = feitas.has(p.faixa) ? "feita" : "apagada"
  const ordem = [...feitas]
  if (!ordem.length) { r[TORRES[0][0]] = "aberta"; return r }
  const descansa = TORRES.findIndex((t) => t.includes(ordem[ordem.length - 1]))
  const proxima = (t: number) => TORRES[t].find((f) => !feitas.has(f))
  const abre = TORRES.map((_, t) => t).filter((t) => t !== descansa).map(proxima).filter((f): f is string => !!f)
  if (abre.length < 2 && descansa >= 0) { const f = proxima(descansa); if (f) abre.push(f) }
  for (const f of abre) r[f] = "aberta"
  return r
}
