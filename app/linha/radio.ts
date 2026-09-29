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
    id: "suburbio", freq: TIER_META.suburbio.freq, nome: TIER_META.suburbio.label, cor: TIER_META.suburbio.color, custo: 10,
    faixas: [t("g*** m**", "gata-mia"), t("t***o", "tedio"), t("b*** b*** k", "boom-boom-k"), t("10 D3 10", "10de10")],
    link: TIER_META.suburbio.projectLink,
  },
  {
    id: "crypto", freq: TIER_META.crypto.freq, nome: TIER_META.crypto.label, cor: TIER_META.crypto.color, custo: 28,
    faixas: [t("CHUVA · inst", "inst-chuva"), t("DopaminA · inst", "inst-dopamina"), t("Sabe Ontem? · inst", "inst-sabe-ontem"), t("Nectar · inst", "inst-nectar")],
    link: TIER_META.crypto.projectLink,
  },
  {
    id: "live", freq: TIER_META.live.freq, nome: TIER_META.live.label, cor: TIER_META.live.color, custo: 50,
    faixas: [t("CHUVA · ao vivo", "live-chuva"), t("DopaminA · ao vivo", "live-dopamina"), t("Sabe Ontem? · ao vivo", "live-sabe-ontem"), t("Nectar · ao vivo", "live-nectar")],
    link: TIER_META.live.projectLink,
  },
  {
    id: "full", freq: TIER_META.full.freq, nome: TIER_META.full.label, cor: TIER_META.full.color, custo: 80,
    faixas: [],
    link: TIER_META.full.projectLink,
  },
]

export type FreqId = Frequencia["id"]

// A 222.0 toca as faixas das estações cujo objeto a pessoa já pegou (e,
// antes disso, a da própria estação se já saiu). A 222.4 toca todo o Vol.1
// já lançado — é a vitrine do álbum completo.
export function faixasDe(f: Frequencia, objetos: EstacaoId[], estacao: EstacaoId | null, agora = Date.now()) {
  if (f.id === "linha") {
    const ids = new Set<EstacaoId>(objetos)
    if (estacao) ids.add(estacao)
    return ESTACOES.filter((e) => ids.has(e.id) && (lancada(e, agora) || objetos.includes(e.id)))
      .map((e) => ({ titulo: e.faixa, src: e.audio }))
  }
  if (f.id === "full") {
    return ESTACOES.filter((e) => lancada(e, agora)).map((e) => ({ titulo: e.faixa, src: e.audio }))
  }
  return f.faixas
}

export function proximaFreq(sinal: number) {
  return FREQUENCIAS.find((f) => f.custo > sinal) ?? null
}

export function freqsLiberadas(sinal: number) {
  return FREQUENCIAS.filter((f) => f.custo <= sinal)
}
