// O POVO (09/11, episodios.md, "O povo e a revolução"): quanta gente já veio com a gente.
// Um número só, derivado do save (nada novo gravado; o save antigo só abre):
//   o mínimo vem da história (cada peça feita dos episódios traz gente)
//   a popularidade soma por cima (mais gente nos shows e nas ruas)
// Quem lê: a plateia dos shows (page.tsx → Show, ShowNoBar) e a vida do subúrbio
// (VIDA_POVO, em estrada/VidaSuburbio.tsx). Função pura: recebe a história do save.

import { EPISODIOS, pecaDoEpFeita } from "./episodios"
import type { HistoriaDisco } from "./historia"

// RASCUNHO, pra mexer: o quanto cada coisa traz de gente, na lotação de 0 a 100
export const POVO_CFG = {
  piso: 2, // antes de tudo: quase ninguém
  historia: 62, // com todas as peças dos episódios feitas
  popularidade: 36, // com a popularidade em 100
}

const TOTAL_PECAS = EPISODIOS.reduce((a, e) => a + e.pecas.length, 0)

/** quanto da história já foi feito (0–1) */
export function fracaoDaHistoria(h: HistoriaDisco | null | undefined): number {
  if (!h) return 0
  if (h.fase === "livre") return 1
  let n = 0
  for (const ep of EPISODIOS) for (const p of ep.pecas) if (pecaDoEpFeita(h, p)) n++
  return n / TOTAL_PECAS
}

/** a lotação (0–100): a escala que os shows já usam no lugar da popularidade pura */
export function lotacaoDoPovo(h: HistoriaDisco | null | undefined, popularidade: number): number {
  const p = Math.max(0, Math.min(100, popularidade || 0))
  return Math.min(100, POVO_CFG.piso + POVO_CFG.historia * fracaoDaHistoria(h) + POVO_CFG.popularidade * (p / 100))
}

/** o mesmo número de 0 a 1 (a vida do subúrbio) */
export const povoDoSave = (h: HistoriaDisco | null | undefined, popularidade: number) => lotacaoDoPovo(h, popularidade) / 100
