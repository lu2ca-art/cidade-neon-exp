// AS PISTAS LIBERANDO AOS POUCOS (T31, 28/10). "As pistas com as músicas são o
// trajeto da missão. Elas fazem parte do fundo e vão sendo liberadas aos poucos:
// a prévia, o instrumental, a versão subúrbio." (retomar-mundo.md)
//
//   prévia    antes de pegar a missão da pista: o corte de 22 s (public/audio/previews)
//   inst      a missão pegada (ou uma peça dela feita): o instrumental (public/audio/pistas/*-inst)
//   suburbio  a porta da missão abriu: a versão inteira (a voz, se a faixa já saiu; senão o
//             instrumental). Se o dono mandar uma versão própria do subúrbio, é só pôr o
//             arquivo em PISTAS_LIBERADAS.suburbio (hoje vazio: usa a faixa de sempre)
//
// Só vale na carreira (a história com as missões). Antes dela e depois do fim
// ("livre"), cada pista toca a faixa inteira, como sempre tocou.
//
// Tudo que é gosto mora em PISTAS_LIBERADAS (rascunho pro dono ajustar).

import { PISTAS, faixaDaPista, type Pista, type PistaId } from "../estrada/pistas"
import type { HistoriaDisco } from "./historia"
import { CONFIG13, IDS13, MISSOES13, feita13, normalizarMissao, pecaFeita } from "./portas"

export type VersaoPista = "previa" | "inst" | "suburbio"
export const ORDEM_VERSAO: VersaoPista[] = ["previa", "inst", "suburbio"]
export const NOME_VERSAO: Record<VersaoPista, string> = { previa: "prévia", inst: "instrumental", suburbio: "versão subúrbio" }

export const PISTAS_LIBERADAS = {
  // [gosto] a pista toca mesmo sem missão pegada (a prévia, o que já liberou). false =
  // como era no 21/10: sem missão, nenhuma faixa de pista, só os discos
  tocaForaDaMissao: true,
  // [gosto] o instrumental abre ao PEGAR a missão (true) ou só depois da primeira peça (false)
  instAoPegar: true,
  // a versão do subúrbio de cada faixa, se existir um arquivo próprio (senão: a faixa de sempre)
  suburbio: {} as Partial<Record<PistaId, string>>,
}

/** em que ponto do trajeto da missão está a pista (a missão dona da faixa decide) */
export function versaoDaPista(h: HistoriaDisco | null | undefined, id: PistaId): VersaoPista {
  // fora da carreira (o prólogo e o depois do fim): a faixa inteira, como sempre
  if (!h || h.fase !== "carreira") return "suburbio"
  // as músicas que o jogo já dá no começo (a Nectar, a do próprio LU2CA)
  if (CONFIG13.musicasDoInicio.includes(id)) return "suburbio"
  const dona = IDS13.find((m) => MISSOES13[m].faixa === id)
  if (!dona) return "inst"
  if (feita13(h, dona)) return "suburbio"
  const comecou = normalizarMissao(h.missao) === dona || pecaFeita(h, dona, "arte") || pecaFeita(h, dona, "jogo")
  if (comecou && (PISTAS_LIBERADAS.instAoPegar || pecaFeita(h, dona, "arte") || pecaFeita(h, dona, "jogo"))) return "inst"
  return "previa"
}

/** a versão de cada pista (a Corrida lê isto) */
export function versoesDasPistas(h: HistoriaDisco | null | undefined): Record<string, VersaoPista> {
  return Object.fromEntries(PISTAS.map((p) => [p.id, versaoDaPista(h, p.id)]))
}

/** o arquivo que toca em cada ponto */
export function srcDaVersao(p: Pista, v: VersaoPista, agora = Date.now()): string {
  if (v === "previa") return `/audio/previews/${p.id}.mp3`
  if (v === "inst") return p.inst
  return PISTAS_LIBERADAS.suburbio[p.id] ?? faixaDaPista(p, agora)
}

/** a pista (e a versão) de um arquivo que está tocando (o holo e os óculos mostram) */
export function pistaDoArquivo(src: string | null | undefined): { pista: Pista; versao: VersaoPista | "voz" } | null {
  if (!src) return null
  for (const p of PISTAS) {
    if (src === `/audio/previews/${p.id}.mp3`) return { pista: p, versao: "previa" }
    if (src === p.inst) return { pista: p, versao: "inst" }
    if (src === p.voz || src === PISTAS_LIBERADAS.suburbio[p.id]) return { pista: p, versao: "voz" }
  }
  return null
}
export const rotuloDoArquivo = (src: string | null | undefined) => {
  const x = pistaDoArquivo(src)
  return x ? `${x.pista.faixa}${x.versao === "previa" ? " · prévia" : x.versao === "inst" ? " · inst" : ""}` : null
}
