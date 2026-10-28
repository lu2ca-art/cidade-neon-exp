// A KOMBI QUEBRA (T27, 28/10): de vez em quando, aleatoriamente, a Kombi pifa. Ela
// aparece na oficina do subúrbio e o jogador segue de patins/skate até lá; paga o
// mecânico em água e a Kombi volta. Reaproveita o "Kombi no conserto" das missões
// (portas.ts: kombiNoConserto): o jogo já sabe ir de patins quando ela está lá.
// Tudo que o dono pode querer mexer mora em CONFIG_QUEBRA; as regras são puras
// (recebem a história do save e um número sorteado), então dá pra testar sem 3D.
//
// Regras (RASCUNHO, do T27):
//   · rara: um sorteio a cada `cadaMs` rodando, com `chance` de quebrar
//   · nunca no meio de uma missão (a pegada e ainda não feita), nem antes da carreira
//   · nunca 2 vezes seguidas: depois do conserto vêm `folga` sorteios sem quebrar
//   · o conserto é pago em água (`precoAgua`); faltou, fica fiado (nada trava)
//   · o metrô é a outra saída, mas ainda é "em breve" (T26 está fora do mapa)

import type { HistoriaDisco } from "./historia"
import { feita13, normalizarMissao } from "./portas"
import { pagamentoMotor } from "./oficina"

export const CONFIG_QUEBRA = {
  // liga/desliga (false = a Kombi nunca quebra sozinha)
  ligada: true,
  // a chance de cada sorteio (rara)
  chance: 0.12,
  // um sorteio a cada tantos ms rodando de verdade (jogo andando, nada aberto)
  cadaMs: 150_000,
  // depois de consertada, quantos sorteios passam sem poder quebrar (nunca 2 seguidas)
  folga: 3,
  // o conserto, em água (o mesmo dinheiro do mecânico da missão); faltou = fiado
  precoAgua: 20,
  // o metrô como saída (T26): só vira "true" quando ele entrar no mapa
  metro: false,
}

export const FALAS_QUEBRA = {
  aviso: "a Kombi tossiu. fumaça no capô",
  quebrou: "a Kombi pifou de vez. já mandaram ela pra oficina do subúrbio",
  vai: "de patins até a oficina. a luz laranja no mapa",
  metro: "o metrô: em breve",
  mecanico: "pifou, né? essas velhas pifam. deixa comigo",
  pagar: "o conserto é em água. aqui embaixo ninguém paga com neon",
  pago: "pronto. ela tá nova. quer dizer, velha, mas anda",
  fiado: "faltou um pouco. fica fiado: vc volta com mais",
  voltou: "a Kombi voltou da oficina",
}

type Quebra = NonNullable<HistoriaDisco["quebra"]>

export const quebrada = (h: HistoriaDisco | null): boolean => !!h?.quebra?.quebrada

// pode quebrar agora? (a Kombi inteira, na carreira, sem missão no meio e sem folga)
export function podeQuebrar(h: HistoriaDisco | null): boolean {
  if (!CONFIG_QUEBRA.ligada || !h || h.fase !== "carreira") return false
  if (quebrada(h)) return false
  const m = normalizarMissao(h.missao)
  if (m && !feita13(h, m)) return false
  return (h.quebra?.folga ?? 0) <= 0
}

// um sorteio. `r` é o número sorteado (0 a 1; o jogo passa Math.random()). Devolve
// a história depois do sorteio e se quebrou. A folga desce a cada sorteio.
export function sortearQuebra(h: HistoriaDisco, r: number): { h: HistoriaDisco; quebrou: boolean } {
  const folga = h.quebra?.folga ?? 0
  if (!CONFIG_QUEBRA.ligada || h.fase !== "carreira" || quebrada(h)) return { h, quebrou: false }
  if (folga > 0) return { h: { ...h, quebra: { ...h.quebra, folga: folga - 1 } }, quebrou: false }
  if (!podeQuebrar(h) || r >= CONFIG_QUEBRA.chance) return { h, quebrou: false }
  return { h: quebrar(h), quebrou: true }
}

// quebra (sem sorteio: o teste e o sorteio usam)
export function quebrar(h: HistoriaDisco): HistoriaDisco {
  const q: Quebra = { ...h.quebra, quebrada: true, vezes: (h.quebra?.vezes ?? 0) + 1, folga: 0 }
  return { ...h, quebra: q }
}

// consertada: a Kombi volta e a folga começa
export function consertar(h: HistoriaDisco): HistoriaDisco {
  const { quebrada: _q, ...resto } = h.quebra ?? {}
  void _q
  return { ...h, quebra: { ...resto, folga: CONFIG_QUEBRA.folga } }
}

// o pagamento do conserto (nunca mais água do que tem; o resto fica fiado)
export const pagamentoConserto = (agua: number) => pagamentoMotor(agua, CONFIG_QUEBRA.precoAgua)
