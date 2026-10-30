// A PERSEGUIÇÃO DA KOMBI (T28, 30/10): uma vez só no jogo. Quando a popularidade
// sobe e o Núcleo detecta um movimento diferente, a polícia vem atrás da Kombi, e
// desta vez o jogador PERDE: o helicóptero ergue a Kombi e eles jogam ela lá de
// cima. Ele segue de patins e, mais pra frente na mesma pista, acha 3 veículos
// parados (no mundo, não num menu): encostou num, pega. A moto do subúrbio (T14)
// segue lá embaixo, nas trincheiras.
//
// A regra antiga (bater em 3 carros = estrela, estrela, estrela = a polícia vem)
// saiu do Corrida.tsx: bater agora só tira o drift e dá o tranco.
//
// Tudo que o dono pode querer mexer mora aqui: o gatilho (CONFIG_PERSEGUICAO), os
// 3 veículos (VEICULOS, PROVISÓRIOS: os modelos de verdade vêm do Tripo 3D) e as
// falas (FALAS_PERSEGUICAO, RASCUNHO). As regras são puras (recebem a história do
// save), então dá pra testar sem 3D.
//
// As fases (no save, disco.perseguicao.fase):
//   (nenhuma)  → ainda não aconteceu
//   "agora"    → a polícia está atrás (recarregar recomeça a perseguição)
//   "escolher" → a Kombi foi jogada lá de cima; de patins, os 3 veículos na pista
//   "feita"    → escolheu (`veiculo`); nunca mais acontece

import type { HistoriaDisco } from "./historia"
import type { Perfil } from "../estrada/carros"
import { feita13, normalizarMissao } from "./portas"

export const CONFIG_PERSEGUICAO = {
  // liga/desliga (false = nunca acontece)
  ligada: true,
  // O GATILHO (RASCUNHO, pergunta pro dono): a popularidade (0–100) que chama a
  // atenção do Núcleo…
  popularidade: 50,
  // …e quantas das 13 missões feitas (o "movimento diferente": o subúrbio subindo)
  feitasMin: 6,
  // bateu o gatilho: quantos ms rodando de verdade até a polícia aparecer
  esperaMs: 20_000,
  // no máximo quantos segundos de perseguição: depois disso pegam de qualquer jeito
  // (o jogador sempre perde; acelerar, voar ou o turbo só adiam)
  pegaEmS: 35,
  // o "lá de cima" (RASCUNHO): o helicóptero ergue a Kombi tantos metros, leva pro
  // lado da pista (sobre o vazio) e solta. Cai e some lá embaixo
  subida: 11,
  lado: 26,
  // onde ficam os 3 veículos: a tantos metros à frente de onde o jogador ficou, um
  // a cada `entre` metros
  frente: 26,
  entre: 13,
  // depois da perseguição, o veículo novo também quebra de vez em quando (T27)?
  quebraNoVeiculo: false,
}

// UM VEÍCULO (PROVISÓRIO): o molde (o mesmo dos carros da cidade, estrada/carros.ts),
// a cor, a cor da luz de baixo e quanto ele anda (1 = a Kombi). Trocar por um
// modelo do Tripo 3D depois: só `glb` (o caminho em public/) e a cena usa ele.
export interface Veiculo {
  id: string
  nome: string
  frase: string // aparece no botão, quando encosta
  perfil: Perfil
  cor: string
  neon: string
  vel: number
  glb?: string
}

export const VEICULOS: Veiculo[] = [
  {
    id: "opala", nome: "o opala preto", frase: "baixo, pesado, ronca",
    perfil: { nome: "opala", L: 4.8, W: 1.85, H: 1.36, cint: 0.9, capo: 0.86, cab: [-1.2, 0.95], incl: [0.5, 0.7], roda: 0.34, cores: ["#ffffff"] },
    cor: "#14151b", neon: "#ff3fb0", vel: 1.1,
  },
  {
    id: "picape", nome: "a picape do lixão", frase: "remendada. aguenta tudo",
    perfil: { nome: "picape", L: 5.1, W: 1.9, H: 1.85, cint: 1.12, capo: 1.06, cab: [-0.6, 1.25], incl: [0.05, 0.55], roda: 0.42, cacamba: true, cores: ["#ffffff"] },
    cor: "#8a5a2c", neon: "#ffc857", vel: 0.95,
  },
  {
    id: "buggy", nome: "o buggy das dunas", frase: "leve. quase voa",
    perfil: { nome: "buggy", L: 3.6, W: 1.75, H: 1.3, cint: 0.78, capo: 0.66, cab: [-1.1, 0.5], incl: [0.15, 0.45], roda: 0.4, cores: ["#ffffff"] },
    cor: "#e8d84a", neon: "#2fe8ff", vel: 1.0,
  },
]

export const FALAS_PERSEGUICAO = {
  // a voz do Núcleo quando começa (no estilo das outras: seca, com o ✓)
  nucleo: "movimento diferente detectado. origem: kombi 0222 ✓",
  // a 222, depois, de patins (uma frase, nada explicado)
  veiculos: "mais pra frente, uns carros parados. a chave no contato",
  // o botão de pegar (encostou num veículo)
  pegar: "pegar",
}

export type FasePerseguicao = NonNullable<HistoriaDisco["perseguicao"]>["fase"]

export const fasePerseguicao = (h: HistoriaDisco | null): FasePerseguicao | null => h?.perseguicao?.fase ?? null
export const emPerseguicao = (h: HistoriaDisco | null) => fasePerseguicao(h) === "agora"
export const escolhendoVeiculo = (h: HistoriaDisco | null) => fasePerseguicao(h) === "escolher"
// a Kombi ainda existe? (depois de jogada, nunca mais: ela volta só no final, no quintal da D-bee)
export const temKombi = (h: HistoriaDisco | null) => { const f = fasePerseguicao(h); return f !== "escolher" && f !== "feita" }

export const veiculoPorId = (id: string | null | undefined): Veiculo | null => VEICULOS.find((v) => v.id === id) ?? null
export const veiculoDe = (h: HistoriaDisco | null): Veiculo | null => (fasePerseguicao(h) === "feita" ? veiculoPorId(h!.perseguicao!.veiculo) : null)

// a perseguição pode começar agora? (uma vez só; na carreira; a Kombi inteira; sem
// missão no meio; a fama e o movimento acima do gatilho)
export function podePerseguir(h: HistoriaDisco | null, popularidade: number): boolean {
  const C = CONFIG_PERSEGUICAO
  if (!C.ligada || !h || h.fase !== "carreira" || h.perseguicao) return false
  if (h.quebra?.quebrada) return false
  const m = normalizarMissao(h.missao)
  if (m && !feita13(h, m)) return false
  return popularidade >= C.popularidade && (h.feitas13 ?? []).length >= C.feitasMin
}

// começa (o jogo chama depois da espera; o teste chama direto)
export const perseguir = (h: HistoriaDisco): HistoriaDisco => (h.perseguicao ? h : { ...h, perseguicao: { fase: "agora" } })
// pegaram: jogaram a Kombi lá de cima; agora os 3 veículos
export const kombiJogada = (h: HistoriaDisco): HistoriaDisco => (fasePerseguicao(h) === "agora" ? { ...h, perseguicao: { fase: "escolher" } } : h)
// escolheu um (só um dos 3, só na hora de escolher)
export function escolherVeiculo(h: HistoriaDisco, id: string): HistoriaDisco {
  if (fasePerseguicao(h) !== "escolher" || !veiculoPorId(id)) return h
  return { ...h, perseguicao: { fase: "feita", veiculo: id } }
}

// a quebra (T27) vale agora? Só com a Kombi (ou, se o dono quiser, com o veículo novo)
export const quebraVale = (h: HistoriaDisco | null) => {
  const f = fasePerseguicao(h)
  return f === null || (f === "feita" && CONFIG_PERSEGUICAO.quebraNoVeiculo)
}
