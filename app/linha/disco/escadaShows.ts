// A ESCADA DOS SHOWS (16/11, episodios.md "Dos túneis pra cima", palavras do dono):
// "os shows têm que começar a escalar a proporção: o primeiro é simples, no bar, e
// vai crescendo conforme o jogo se desenrola". Uma tabela só: cada degrau é um show
// do jogo, do mais simples (o bar do ep. 1) ao maior (o show final de CHUVA).
//
//   teto    = quanta gente cabe, na lotação de 0 a 100 (disco/povo.ts dá quanta veio)
//   piso    = o mínimo de gente nesse palco (o lugar já chama alguém)
//   palco   = o tamanho da banda no palco (1 = o de sempre)
//   luzes   = quantos canhões de luz varrem
//   telao   = 0 sem telão; 1 um painel de LED; 2 o telão grande; 3 o do final
//
// A gente que aparece é a lotação do povo (o save: a história + a popularidade),
// presa entre o piso e o teto do degrau: o bar fica pequeno mesmo com o povo todo;
// o túnel e o final enchem quando o povo veio. Os degraus vão em ordem: cada um é
// maior que o de baixo (a ordem da tabela é a ordem do jogo).
//
// O FINAL (16/11): o show da CHUVA no palco do deserto (missão lu2ca) usa o degrau "final".
//
// Tudo que é número aqui é RASCUNHO pro dono ajustar. Função pura, sem 3D.

import { lotacaoDoPovo } from "./povo"
import type { HistoriaDisco } from "./historia"

export type DegrauId = "bar" | "calcada" | "suburbio" | "balada" | "terraco" | "torres" | "tuneis" | "final"

export interface Degrau { id: DegrauId; nome: string; teto: number; piso: number; palco: number; luzes: number; telao: 0 | 1 | 2 | 3 }

// ═══ A ESCADA (de baixo pra cima). RASCUNHO ═══
export const ESCADA_SHOWS: Degrau[] = [
  { id: "bar", nome: "o bar (ep. 1)", teto: 14, piso: 2, palco: 0.8, luzes: 1, telao: 0 },
  { id: "calcada", nome: "a calçada e a rua", teto: 24, piso: 4, palco: 0.86, luzes: 2, telao: 0 },
  { id: "suburbio", nome: "os palcos do subúrbio (xenom e missões)", teto: 40, piso: 8, palco: 0.93, luzes: 3, telao: 1 },
  { id: "balada", nome: "a balada", teto: 55, piso: 12, palco: 1, luzes: 4, telao: 1 },
  { id: "terraco", nome: "o terraço", teto: 68, piso: 16, palco: 1.05, luzes: 5, telao: 1 },
  { id: "torres", nome: "o alto das torres", teto: 80, piso: 20, palco: 1.1, luzes: 6, telao: 2 },
  { id: "tuneis", nome: "o show dos túneis", teto: 92, piso: 30, palco: 1.15, luzes: 8, telao: 2 },
  { id: "final", nome: "o show final (CHUVA)", teto: 100, piso: 60, palco: 1.25, luzes: 10, telao: 3 },
]

export const degrau = (id: DegrauId): Degrau => ESCADA_SHOWS.find((d) => d.id === id)!
export const alturaNaEscada = (id: DegrauId) => ESCADA_SHOWS.findIndex((d) => d.id === id)

// o show nos túneis: o id no save (hist.show) é "tuneis:<faixa>"
export const showDosTuneis = (faixa: string) => `tuneis:${faixa}`

/** o degrau de um show pelo id dele no save (hist.show). null = fora da escada.
 *  (16/11) a missão do LU2CA ("missao:lu2ca") é o show final de CHUVA: o degrau mais alto */
export function degrauDoShow(id: string): Degrau | null {
  if (id === "missao:lu2ca") return degrau("final")
  if (id.startsWith("tuneis:")) return degrau("tuneis")
  if (id.startsWith("xenom:") || id.startsWith("missao:")) return degrau("suburbio")
  if (id.startsWith("rua:")) return degrau("calcada")
  if (id.startsWith("palco:")) {
    const p = id.split(":")[1]
    if (p === "bar") return degrau("bar")
    if (p === "calcada") return degrau("calcada")
    if (p === "balada") return degrau("balada")
    if (p === "terraco") return degrau("terraco")
    if (p === "torres") return degrau("torres")
  }
  return null
}

/** quanta gente nesse degrau (0–100, a escala que os shows já usam): a lotação, presa entre o piso e o teto */
export const genteNoDegrau = (d: Degrau, lotacao: number) => Math.max(d.piso, Math.min(d.teto, lotacao))
export const genteDoSave = (d: Degrau, h: HistoriaDisco | null | undefined, popularidade: number) => genteNoDegrau(d, lotacaoDoPovo(h, popularidade))

/** o que o desenho do palco precisa (neon-tiles/cena.ts EscalaPalco) */
export const escalaDoDegrau = (d: Degrau | DegrauId) => { const x = typeof d === "string" ? degrau(d) : d; return { palco: x.palco, luzes: x.luzes, telao: x.telao } }
