// (06/11) OS LUGARES DO CHÃO DO SUBÚRBIO QUE ABREM UMA EXPERIÊNCIA PRONTA
// (bíblia §4 e §6: tudo no mundo, tudo visitável desde o começo, o trancado
// com cadeado e o que libera). Chegou perto (o mesmo gatilho do chão:
// Corrida → `chao:<id>`), aparece o botão "entrar · <nome>", como o bar; a
// Kombi não para. Entrou: a página abre por cima do jogo (AppJanela, um
// iframe; o jogo pausa e volta onde estava) ou o app do celular (a loja, o
// jardim). Leve: sem three.js, sem React. Inventário em docs/suburbio-lugares.md.

import type { AppId } from "../os"
import type { PortaId } from "./portas"
import type { LugarChao } from "./historia"
import type { Categoria } from "../economia-rascunho"

export type Entrada =
  | { t: "janela"; nome: string; rota: string; icone: AppId; porta?: PortaId; pra?: string }
  | { t: "app"; nome: string; app: "loja" | "jardim"; aba?: Categoria }
  | { t: "basquete"; nome: string; porta: PortaId; pra: string }
  // (09/11, ep. 5) a barganha é ali mesmo, na banca: sem janela (page.tsx, abrirFeira)
  | { t: "feira"; nome: string }

export const ENTRADAS = {
  ginasio: { t: "janela", nome: "o ginásio", rota: "/ginasio", icone: "fliperama", porta: "ginasio", pra: "jogar" },
  galeria: { t: "janela", nome: "a galeria", rota: "/galeria", icone: "galeria", porta: "galeria", pra: "ver os quadros" },
  batida: { t: "janela", nome: "o estúdio", rota: "/batida", icone: "batida", porta: "batida-estudio", pra: "produzir" },
  // o palco do subúrbio fora das missões: a casa de shows (o show da noite)
  palco: { t: "janela", nome: "o palco", rota: "/casa-de-shows", icone: "radio" },
  discos: { t: "app", nome: "os discos", app: "loja", aba: "disco" },
  brecho: { t: "app", nome: "o brechó", app: "loja", aba: "roupa" },
  flores: { t: "app", nome: "as flores", app: "jardim" },
  // a quadra (já existia): o basquete livre depois da missão do Alohan; antes, o cadeado
  quadra: { t: "basquete", nome: "a quadra", porta: "quadra", pra: "jogar basquete" },
  feira: { t: "feira", nome: "a feira" },
} as const satisfies Partial<Record<LugarChao, Entrada>>

export type LugarAberto = keyof typeof ENTRADAS
export const IDS_ABERTOS = Object.keys(ENTRADAS) as LugarAberto[]
export const ehAberto = (id: string): id is LugarAberto => id in ENTRADAS
