// O TUTORIAL DO DRIFT E DO HOLO (T07, 28/10): a missão 1 (a D-Bee), o jogo.
// Depois do tambor ela entrega o holo, lá fora a tela de recompensa diz o que
// ele é, e um tutorial curto ensina, um passo por vez, o que dá pra fazer agora:
// o mapa (o drone), o GPS, o drift e o anel (o próximo passo); depois da oficina,
// quando a Kombi já voa, o voo e o turbo. Cada passo só some quando o jogador faz.
//
// Fontes: lista-mestra T07 + J1 nota 6 ("o holo entregue de verdade, da mão
// dela"; "lá fora, a tela de recompensa com destaque"; "o ? destaca só o ícone
// do holo"); T41 (o tutorial era feito de falas da D-Bee e da 222 FM; a
// recomendação: o Nexo ensina seco e a D-Bee no rádio só fala da vida); T42 (o
// GPS e o checklist de um passo).
//
// O que ainda é decisão do dono mora em CONFIG_TUTORIAL: troca aqui, o resto segue.
// Os textos são RASCUNHO (o LU2CA reescreve).

import type { FaseDisco, HistoriaDisco } from "./historia"

export const CONFIG_TUTORIAL = {
  ligado: true,
  // (EM ABERTO, T41 pergunta 2) quem ensina: "nexo" = a linha seca no notch
  // ("▸ segura o espaço: voa") e a D-Bee só fala da vida; "dbee" = ela ensina
  // pelo rádio, como antes (o mesmo passo, com a voz dela)
  quem: "nexo" as "nexo" | "dbee",
  // a tela de recompensa do holo lá fora (J1: 6); sem ela, o tutorial começa direto
  // (notas 03/11, o dono: "não quero telas com fundo preto explicando nada") desligada:
  // lá fora o mapa pisca de leve e o "toca aqui" aponta pro ícone; o "?" do notch explica
  recompensa: false,
  // o cartão "você ganhou" de dentro da cena sai (a entrega é na mão; o destaque é lá fora)
  cartaoNaCena: false,
  // quanto tempo o drift precisa durar pra contar (s)
  driftS: 0.7,
  // quanto tempo no ar com o propulsor pra contar o voo (s)
  vooS: 0.9,
  // quanto tempo andando (acima de gpsV m/s) com o ícone do GPS aceso no meio pra contar (s)
  gpsS: 1,
  gpsV: 8,
  // o respiro entre um passo e o outro (ms): o "✓" aparece, depois o próximo
  respiroMs: 1100,
}

export type PassoTutId = "mapa" | "rota" | "gps" | "drift" | "anel" | "voo" | "turbo"

export interface PassoTut {
  id: PassoTutId
  // a partir de que fase ele vale (antes da oficina a Kombi não voa)
  desde: FaseDisco
  // o Nexo: seco, o que dá pra fazer agora (teclado / toque)
  nexo: string
  toque?: string
  // a D-Bee pelo rádio (se CONFIG_TUTORIAL.quem === "dbee")
  dbee: string
  // a coisa da tela que ele aponta (um seletor); o primeiro passo escurece o resto (o "?")
  alvo?: string
  destaque?: boolean
  // o que o "?" diria dessa coisa (o título do cartão no destaque)
  rotulo?: string
  // enquanto falta algo pra dar (o turbo vazio), o texto de espera
  espera?: string
}

// A ORDEM DOS PASSOS (troca a ordem aqui; tirar uma linha tira o passo)
export const PASSOS_TUTORIAL: PassoTut[] = [
  { id: "mapa", desde: "dunas", nexo: "▸ toca no mapa: o drone sobe", dbee: "toca no mapa. o drone sobe e vc vê tudo de cima", alvo: '[data-info="mapa"]', destaque: true, rotulo: "o holo · o mapa" },
  { id: "rota", desde: "dunas", nexo: "▸ a faixa acesa é o caminho. toca no mapa de novo: volta pra rua", dbee: "tá vendo a faixa acesa? é o caminho. toca no mapa de novo pra voltar", alvo: '[data-info="mapa"]', rotulo: "o caminho" },
  { id: "gps", desde: "dunas", nexo: "▸ o GPS: deixa o ícone aceso no meio e acelera", dbee: "a barra lá em cima. deixa a bolinha acesa no meio e vai", alvo: ".l-gps-barra", rotulo: "o GPS" },
  { id: "drift", desde: "dunas", nexo: "▸ vira forte e solta de lado: drift", toque: "▸ toca pra fora e vira pra dentro: drift", dbee: "areia solta. vira e solta o carro de lado, ele escorrega", rotulo: "o drift" },
  { id: "anel", desde: "dunas", nexo: "▸ o anel diz pra onde ir: toca nele", dbee: "o anel em volta do mapa diz o próximo passo. toca nele", alvo: '[data-info="anel"]', rotulo: "o próximo passo" },
  { id: "voo", desde: "subir", nexo: "▸ segura o espaço: voa", toque: "▸ segura o propulsor: voa", dbee: "agora ela voa. segura o espaço", alvo: '[data-info="propulsor"]', rotulo: "o propulsor" },
  { id: "turbo", desde: "subir", nexo: "▸ turbo cheio: um toque no espaço", toque: "▸ turbo cheio: toca no turbo", dbee: "turbo cheio. usa", alvo: '[data-info="turbo"]', rotulo: "o turbo", espera: "▸ drift e voo enchem o turbo" },
]

// a última linha (o Nexo), quando os passos de uma fase acabam
export const FIM_TUTORIAL: Partial<Record<FaseDisco, { nexo: string; dbee: string }>> = {
  dunas: { nexo: "▸ segue o GPS até o subúrbio", dbee: "agora é com vc. o subúrbio é pra lá" },
  subir: { nexo: "▸ pousa numa pista acesa", dbee: "pousa numa pista acesa. as apagadas ninguém usa" },
}

const ORDEM: FaseDisco[] = ["minhoca", "casa", "dunas", "bar", "oficina", "subir", "nectar", "carreira", "livre"]
const n = (f: FaseDisco) => ORDEM.indexOf(f)
// as fases em que o tutorial roda; na carreira, só termina o que começou (quem
// pousou na cidade antes de usar o turbo); save antigo, que nunca viu o holo
// entregue, não vê tutorial nenhum
const FASES_TUT: FaseDisco[] = ["dunas", "bar", "oficina", "subir"]
const roda = (h: Pick<HistoriaDisco, "fase" | "holo" | "tutorial">) =>
  CONFIG_TUTORIAL.ligado && h.holo && (FASES_TUT.includes(h.fase) || (h.fase === "carreira" && ((h.tutorial ?? []).includes("recompensa") || (h.tutorial ?? []).includes("mapa"))))

// o próximo passo pra essa história (null: nada pra ensinar agora)
export function passoAgora(h: Pick<HistoriaDisco, "fase" | "holo" | "tutorial">): PassoTut | null {
  if (!roda(h)) return null
  const feitos = h.tutorial ?? []
  return PASSOS_TUTORIAL.find((p) => n(p.desde) <= n(h.fase) && !feitos.includes(p.id)) ?? null
}
// "2 de 5": entre os passos que já valem nesta fase
export function contagem(h: Pick<HistoriaDisco, "fase" | "tutorial">, id: PassoTutId) {
  const doBloco = PASSOS_TUTORIAL.filter((p) => p.desde === PASSOS_TUTORIAL.find((x) => x.id === id)!.desde)
  return { n: doBloco.findIndex((p) => p.id === id) + 1, de: doBloco.length }
}
// a tela de recompensa do holo ainda não foi vista (aparece uma vez, lá fora)
export const faltaRecompensaHolo = (h: Pick<HistoriaDisco, "fase" | "holo" | "tutorial">) =>
  CONFIG_TUTORIAL.ligado && CONFIG_TUTORIAL.recompensa && h.holo && h.fase === "dunas" && !(h.tutorial ?? []).includes("recompensa")
// o tutorial está ensinando agora (a D-Bee pelo rádio não repete a instrução)
export const tutorialEnsina = (h: Pick<HistoriaDisco, "fase" | "holo" | "tutorial"> | null | undefined) =>
  !!h && roda(h) && !!passoAgora(h)
export const textoDo = (p: PassoTut, toque: boolean) => (CONFIG_TUTORIAL.quem === "dbee" ? p.dbee : toque && p.toque ? p.toque : p.nexo)

// ── a Kombi, lida pela Corrida (uns quadros por segundo, só enquanto o
// tutorial está ligado): o tutorial não mexe no jogo, só olha ──
export const POSE_TUT = { drift: false, carga: 0, turbo: false, ar: false, propulsor: false, v: 0, em: 0 }
export function lerPoseTutorial(j: { drift: number; carga: number; turboT: number; ar: boolean; v: number }, inp: { propulsor?: boolean; propulsorBotao?: boolean }) {
  POSE_TUT.drift = j.drift !== 0
  POSE_TUT.carga = j.carga
  POSE_TUT.turbo = j.turboT > 0
  POSE_TUT.ar = j.ar
  POSE_TUT.v = Math.abs(j.v)
  POSE_TUT.propulsor = !!inp.propulsor || !!inp.propulsorBotao
  POSE_TUT.em = performance.now()
}
