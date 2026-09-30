// Rádio 222 na Linha 222. Mesmas frequências e links do rádio da versão
// anterior (lib/radio-tiers.ts), mas destravadas NA ESTRADA: cada orb de
// sinal e cada passada raspando no tráfego enche o medidor da próxima
// frequência, e quando enche a rádio nova entra ao vivo, no meio da corrida.

import { ESTACOES, lancada, type EstacaoId } from "./data"
import { TIER_META } from "@/lib/radio-tiers"

export interface Frequencia {
  id: "linha" | "suburbio" | "crypto" | "live" | "full"
  freq: string
  nome: string
  cor: string
  custo: number // sinal acumulado necessário (0 = já vem ligada)
  faixas: { titulo: string; src: string }[]
  link?: string
}

const t = (titulo: string, arq: string) => ({ titulo, src: `/audio/tracks/${arq}.mp3` })

export const FREQUENCIAS: Frequencia[] = [
  {
    id: "linha", freq: "222.0", nome: "LINHA 222", cor: "#2fe8ff", custo: 0,
    faixas: [], // montada a partir dos objetos que a pessoa já tem (faixasDaLinha)
  },
  {
    id: "suburbio", freq: TIER_META.suburbio.freq, nome: TIER_META.suburbio.label, cor: TIER_META.suburbio.color, custo: 12,
    faixas: [t("g*** m**", "gata-mia"), t("t***o", "tedio"), t("b*** b*** k", "boom-boom-k"), t("10 D3 10", "10de10")],
    link: TIER_META.suburbio.projectLink,
  },
  {
    id: "crypto", freq: TIER_META.crypto.freq, nome: TIER_META.crypto.label, cor: TIER_META.crypto.color, custo: 35,
    faixas: [t("CHUVA · inst", "inst-chuva"), t("DopaminA · inst", "inst-dopamina"), t("Sabe Ontem? · inst", "inst-sabe-ontem"), t("Nectar · inst", "inst-nectar"), t("Ojalá · inst", "inst-ojala")],
    link: TIER_META.crypto.projectLink,
  },
  {
    id: "live", freq: TIER_META.live.freq, nome: TIER_META.live.label, cor: TIER_META.live.color, custo: 70,
    faixas: [t("CHUVA · ao vivo", "live-chuva"), t("DopaminA · ao vivo", "live-dopamina"), t("Sabe Ontem? · ao vivo", "live-sabe-ontem"), t("Nectar · ao vivo", "live-nectar"), t("Ojalá · ao vivo", "live-ojala")],
    link: TIER_META.live.projectLink,
  },
  {
    id: "full", freq: TIER_META.full.freq, nome: TIER_META.full.label, cor: TIER_META.full.color, custo: 120,
    faixas: [],
    link: TIER_META.full.projectLink,
  },
]

export type FreqId = Frequencia["id"]

// Repertório de cada lugar (desde 30/09 — antes a 222.0 só tocava os
// objetos já pegos e virava 1 música em loop):
// - 222.0 (centro): todo o Vol.1 já lançado, mais a prévia de quem já
//   pegou o objeto de uma faixa ainda por vir (o Nectar pelo violão)
// - 69.9, 88.7, 111.3: subúrbio, instrumentais e ao vivo — versões de faixa
//   que ainda não saiu só entram depois da data
// - 222.4 (avenida): o Vol.1 lançado + o arquivo (catálogo antigo, nomes
//   mascarados)
export const ARQUIVO = [t("c****e", "cliche"), t("h*****ood", "hollywood"), t("s*****t", "stylist"), t("o***s", "oasis"), t("a*******a", "astronauta"), t("q* é v*?", "qm-e-vc")]
const saiu = (titulo: string, agora: number) => {
  const e = ESTACOES.find((x) => titulo.toLowerCase().startsWith(x.faixa.toLowerCase()))
  return !e || lancada(e, agora)
}

export function faixasDe(f: Frequencia, objetos: EstacaoId[], _estacao: EstacaoId | null, agora = Date.now()) {
  const vol1 = ESTACOES.filter((e) => lancada(e, agora) || objetos.includes(e.id)).map((e) => ({ titulo: e.faixa, src: e.audio }))
  if (f.id === "linha") return vol1
  if (f.id === "full") return [...vol1, ...ARQUIVO]
  return f.faixas.filter((x) => saiu(x.titulo, agora))
}

export function proximaFreq(sinal: number) {
  return FREQUENCIAS.find((f) => f.custo > sinal) ?? null
}

export function freqsLiberadas(sinal: number) {
  return FREQUENCIAS.filter((f) => f.custo <= sinal)
}
