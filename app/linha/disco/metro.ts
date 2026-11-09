// O METRÔ NA HISTÓRIA (T64, bloco 1; a fuga em si veio do branch t26-metro e mora
// em app/linha/metro/). Decisão por padrão (pergunta 4 do plano): acontece logo
// depois da perseguição única da Kombi (T28). Pegam ele, jogam a Kombi lá de cima,
// TOMAM O JETPACK, e ele foge pelo metrô da linha 9; na fuga, o guarda arranca o
// violão das costas dele (PERDE O VIOLÃO). Depois disso os 3 veículos aparecem
// (perseguicao.ts: veiculosLiberados) e a guitarra passa a aparecer na loja.
//
// As regras são puras (recebem a história do save, devolvem a nova história e os
// EVENTOS), então dá pra testar sem 3D. Os eventos são pra quem grava o save
// (lote D, page.tsx):
//   "jetpackTomado" → o jetpack sai (patins sem o jato das costas)
//   "perdeuViolao"  → save.violao = false (o botão do violão some; disco/Violao.tsx)
//
// As fases (no save, disco.metro.fase; o campo `metro` ainda não está no tipo
// HistoriaDisco: o lote D acrescenta `metro?: EstadoMetro` em historia.ts, ou usa
// HistoriaComMetro daqui):
//   (nenhuma) → ainda não (ou a perseguição ainda não chegou no "escolher")
//   "agora"   → no metrô (recarregar recomeça a fuga; o jetpack já foi)
//   "feita"   → fugiu; o violão ficou no trem. Nunca mais acontece

import type { HistoriaDisco } from "./historia"
import { CONFIG_PERSEGUICAO, esperandoMetro } from "./perseguicao"
import { episodioAberto, episodioFeito, episodioPorId, quemAbre } from "./episodios"
import { feita13, pecaFeita } from "./portas"
import type { FimMetro } from "../metro/Metro"

export const CONFIG_METRO = {
  // te pegaram no metrô (a 2ª vez que o guarda alcança): recomeça a fuga (true) ou
  // conta como feita mesmo assim (false). Nos dois casos o violão fica com eles
  pegoRecomeca: true,
  // a semente da fuga (onde ficam os passageiros); a mesma pra todo mundo
  semente: 222,
  // o jetpack volta um dia? (null = não; senão o id da missão que devolve, RASCUNHO)
  jetpackVoltaNa: null as string | null,
}

export type FaseMetro = "agora" | "feita"
export interface EstadoMetro {
  fase: FaseMetro
  // como acabou (só com "feita")
  escapou?: boolean
  tempo?: number
}
export type HistoriaComMetro = HistoriaDisco & { metro?: EstadoMetro }
export type EventoMetro = "jetpackTomado" | "perdeuViolao"
export interface PassoMetro { h: HistoriaComMetro; eventos: EventoMetro[] }

export const FALAS_METRO = {
  // o cartão de entrada (a fuga já tem o dela; este é o do mundo, antes)
  entrada: "tomaram o jetpack. a estação da linha 9 tá ali. o trem branco abre as portas",
  // fugiu
  fugiu: "você pulou na curva. o violão ficou com ele",
  // te pegaram e recomeça
  pego: "a mão dele no ombro. de novo: corre",
  // a 222 depois (e o gancho da loja)
  depois: "o violão ficou no trem. lá dentro, alguém começa a tocar ele. a loja tem guitarra agora",
}

const estado = (h: HistoriaDisco | null) => (h as HistoriaComMetro | null)?.metro ?? null
export const faseMetro = (h: HistoriaDisco | null): FaseMetro | null => estado(h)?.fase ?? null
export const emMetro = (h: HistoriaDisco | null) => faseMetro(h) === "agora"
export const metroFeitoNaHistoria = (h: HistoriaDisco | null) => faseMetro(h) === "feita"

// o metrô pode começar agora? (a Kombi já foi jogada e o metrô ainda não começou)
export const podeMetro = (h: HistoriaDisco | null) => !!h && CONFIG_PERSEGUICAO.metro && esperandoMetro(h) && faseMetro(h) === null

// ainda tem o jetpack? (tomaram quando o metrô começou)
export const temJetpack = (h: HistoriaDisco | null) => faseMetro(h) === null
// o violão ficou no trem? (o save.violao é quem manda; isto é a história dizendo)
export const violaoNoTrem = (h: HistoriaDisco | null) => metroFeitoNaHistoria(h)

// entra no metrô: tomam o jetpack (evento "jetpackTomado")
export function entrarNoMetro(h: HistoriaDisco): PassoMetro {
  if (!podeMetro(h)) return { h, eventos: [] }
  return { h: { ...h, metro: { fase: "agora" } }, eventos: ["jetpackTomado"] }
}

// a fuga acabou (o onFim do <Metro>). Fugiu (ou pego, sem recomeçar): feita e o
// violão perdido (evento "perdeuViolao"). Pego e recomeça: nada muda
export function fimDoMetro(h: HistoriaDisco, r: Pick<FimMetro, "escapou" | "tempo">): PassoMetro {
  if (!emMetro(h)) return { h, eventos: [] }
  if (!r.escapou && CONFIG_METRO.pegoRecomeca) return { h, eventos: [] }
  return { h: { ...h, metro: { fase: "feita", escapou: r.escapou, tempo: r.tempo } }, eventos: ["perdeuViolao"] }
}

// ── (09/11, bíblia §13) a viagem na linha 9 ──
const EP_METRO = "rollercoaster"
// as estações aparecem desde o começo; abrem no ep. 8 (lugar trancado diz o que libera)
export function trancaLinha9(h: HistoriaDisco | null): string | null {
  if (!h || h.fase === "livre") return null
  const ep = episodioPorId(EP_METRO)!
  return episodioFeito(h, ep) || episodioAberto(h, EP_METRO) ? null : quemAbre(ep)
}
// tocar violão no trem começa a fuga? Não no passeio tranquilo do ep. 8 (a peça de
// andar de metrô ainda por fazer). Vale até zerar o jogo; depois fica livre pra tocar
export const guardaReageAoViolao = (h: HistoriaDisco | null) =>
  !!h && h.fase !== "livre" && !feita13(h, "final") && (pecaFeita(h, "nizzy", "jogo") || feita13(h, "nizzy"))

// o atalho de teste (link ?parte=metro): já na fuga, a perseguição no "escolher"
export function prepararMetro(h: HistoriaDisco): HistoriaComMetro {
  return { ...h, perseguicao: { fase: "escolher" }, metro: { fase: "agora" } }
}
