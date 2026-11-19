// OS INSTRUMENTOS ANCESTRAIS (T49, bloco 1 · A1, 30/10). Cada missão com
// pessoa (as 11, da D-Bee ao Tony) dá um instrumento ancestral ou orgânico.
// Quando a porta abre, ele entra no save (`h.instrumentos`, portas.ts
// `abrirPorta`) e aparece na tela de recompensa; na casa da D-Bee dá pra
// tocar cada um (o C5, disco/InstrumentosCasa.tsx).
//
// A LISTA É PROVISÓRIA (o dono manda a lista e os sons): trocar aqui o nome, a
// missão ou o som não mexe em mais nada. Os sons usam o que o projeto já tem
// (o tambor gravado da D-Bee, o violão e a corda de som.ts) ou são
// sintetizados no Web Audio (pecas/sons.ts), pelo mesmo mestre do jogo.
// RASCUNHO (06/11): todos os timbres abaixo são sintetizados (um palpite de
// timbre por instrumento, curto e leve, nada pra baixar). O dono pode trocar
// cada um por um sample: é só mudar o `case` do timbre em tocarInstrumento.
// Ver docs/instrumentos.md.

import type { MissaoId } from "./portas"
import { corda, violao } from "../som"
import { bip, ruido } from "./pecas/sons"
import { baterAmostra, tamborPronto } from "./tamborSom"

export type InstrumentoId =
  | "djembe" | "tambor-agua" | "udu" | "caxixi" | "sitar" | "didgeridoo"
  | "berimbau" | "flauta-bambu" | "ocarina" | "handpan" | "kalimba"

// como ele soa: o "jeito" do som (cada um escolhe o timbre) e as notas (Hz)
// que a casa oferece pra tocar (uma por toque, em ordem)
export type Timbre = "tambor" | "agua" | "pote" | "chocalho" | "corda" | "sopro-grave" | "arco" | "sopro" | "metal" | "lamela"

export interface Instrumento {
  id: InstrumentoId
  // (T49, 06/11) "o"/"a": pra linha da recompensa ("+ a kalimba")
  artigo: "o" | "a"
  nome: string
  // de onde ele vem (uma linha, pra tela de recompensa e pra casa)
  origem: string
  missao: MissaoId
  timbre: Timbre
  notas: number[]
  cor: string
}

// a missão → o instrumento (um por missão com pessoa). RASCUNHO
export const INSTRUMENTOS_ANCESTRAIS: Record<InstrumentoId, Instrumento> = {
  djembe: { id: "djembe", artigo: "o", nome: "djembê", origem: "o tambor de mão da África do Oeste", missao: "dbee", timbre: "tambor", notas: [0.08, 0.66, 0.96], cor: "#3d7bff" },
  "tambor-agua": { id: "tambor-agua", artigo: "o", nome: "tambor de água", origem: "uma cabaça batida na água, como as goteiras da oficina", missao: "oficina", timbre: "agua", notas: [196, 247, 294, 392], cor: "#ff9000" },
  udu: { id: "udu", artigo: "o", nome: "udu", origem: "o pote de barro da Nigéria: o som grave sai pelo furo", missao: "quadra", timbre: "pote", notas: [98, 131, 147, 196], cor: "#ff6a35" },
  caxixi: { id: "caxixi", artigo: "o", nome: "caxixi", origem: "o chocalho de palha trançada, com sementes dentro", missao: "drew", timbre: "chocalho", notas: [1, 2], cor: "#6d7bff" },
  sitar: { id: "sitar", artigo: "o", nome: "sitar", origem: "a corda longa da Índia, com as cordas que vibram sozinhas", missao: "mubarak", timbre: "corda", notas: [147, 165, 196, 220, 247, 294], cor: "#ffc857" },
  didgeridoo: { id: "didgeridoo", artigo: "o", nome: "didgeridoo", origem: "o tronco oco dos aborígenes australianos: uma frequência só, que não para", missao: "xeriff", timbre: "sopro-grave", notas: [65, 73], cor: "#c9d3e6" },
  berimbau: { id: "berimbau", artigo: "o", nome: "berimbau", origem: "o arco e a cabaça da capoeira", missao: "lu2ca", timbre: "arco", notas: [110, 123, 220], cor: "#e0ff4f" },
  "flauta-bambu": { id: "flauta-bambu", artigo: "a", nome: "flauta de bambu", origem: "um gomo de bambu com seis furos", missao: "ella", timbre: "sopro", notas: [523, 587, 659, 784, 880], cor: "#4fc3ff" },
  ocarina: { id: "ocarina", artigo: "a", nome: "ocarina", origem: "a flauta de barro redonda, a avó do apito", missao: "notti", timbre: "sopro", notas: [659, 784, 880, 988, 1175], cor: "#5dffa0" },
  handpan: { id: "handpan", artigo: "o", nome: "handpan", origem: "o aço martelado que soa como um sino na mão", missao: "nizzy", timbre: "metal", notas: [147, 220, 262, 294, 330, 392, 440], cor: "#ff2436" },
  kalimba: { id: "kalimba", artigo: "a", nome: "kalimba", origem: "as lamelas de metal na caixa de madeira, tocadas com o polegar", missao: "tony", timbre: "lamela", notas: [523, 587, 659, 784, 880, 1047], cor: "#ff3fb0" },
}
export const IDS_INSTRUMENTOS = Object.keys(INSTRUMENTOS_ANCESTRAIS) as InstrumentoId[]
export const ehInstrumento = (id: string): id is InstrumentoId => id in INSTRUMENTOS_ANCESTRAIS

/** a linha da recompensa: "+ o udu" (T49, 06/11; vai no notch quando a porta abre) */
export const linhaRecompensa = (id: InstrumentoId) => `+ ${INSTRUMENTOS_ANCESTRAIS[id].artigo} ${INSTRUMENTOS_ANCESTRAIS[id].nome}`

/** o instrumento que a missão dá (null: a dos túneis e a 13ª não dão) */
export function instrumentoDaMissao(id: MissaoId): Instrumento | null {
  return Object.values(INSTRUMENTOS_ANCESTRAIS).find((x) => x.missao === id) ?? null
}

// as peças de som que um timbre usa (o jogo toca ao vivo; o sample da batida
// desenha as mesmas num OfflineAudioContext: disco/instrumentoAmostra.ts)
export interface Sintese {
  bip: (f: number, dur?: number, tipo?: OscillatorType, vol?: number, quando?: number, fFim?: number) => void
  ruido: (dur?: number, vol?: number, quando?: number, corte?: number) => void
  corda: (f: number, vol?: number) => void
  violao: (f: number, vol?: number) => void
}
const AO_VIVO: Sintese = { bip, ruido, corda, violao }

/** a receita de cada timbre (uma só: a mesma ao vivo e no sample) */
export function soarTimbre(s: Sintese, t: Timbre, f: number, vol: number) {
  switch (t) {
    case "tambor":
      // sem o tambor gravado: o grave cai de tom; o tapa é ruído
      if (f < 0.3) s.bip(110, 0.35, "sine", 0.5 * vol, 0, 50)
      else if (f < 0.8) s.bip(220, 0.18, "sine", 0.35 * vol, 0, 160)
      else s.ruido(0.07, 0.3 * vol, 0, 5000)
      return
    case "agua":
      // a cabaça na água: um "glub" que sobe de tom
      s.bip(f * 0.7, 0.22, "sine", 0.32 * vol, 0, f * 1.4)
      s.ruido(0.04, 0.05 * vol, 0, 900)
      return
    case "pote":
      s.bip(f * 1.6, 0.3, "sine", 0.38 * vol, 0, f)
      return
    case "chocalho":
      s.ruido(0.06, 0.16 * vol, 0, f > 1 ? 9000 : 6500)
      s.ruido(0.05, 0.1 * vol, 0.03, 7000)
      return
    case "corda":
      s.violao(f, 0.3 * vol)
      s.corda(f * 2, 0.08 * vol)
      return
    case "sopro-grave":
      s.bip(f, 1.4, "sawtooth", 0.1 * vol)
      s.bip(f * 2, 1.4, "sine", 0.06 * vol)
      return
    case "arco":
      s.corda(f, 0.32 * vol)
      s.ruido(0.03, 0.08 * vol, 0, 3000)
      return
    case "sopro":
      s.bip(f, 0.45, "sine", 0.14 * vol)
      s.ruido(0.25, 0.015 * vol, 0, 2500)
      return
    case "metal":
      s.bip(f, 1.6, "sine", 0.2 * vol)
      s.bip(f * 2.01, 1.1, "sine", 0.07 * vol)
      s.bip(f * 3, 0.6, "triangle", 0.03 * vol)
      return
    case "lamela":
      s.bip(f, 0.9, "sine", 0.18 * vol)
      s.bip(f * 5.4, 0.08, "sine", 0.04 * vol)
      return
  }
}

/** toca uma nota do instrumento (i = o índice em `notas`, dá a volta) */
export function tocarInstrumento(id: InstrumentoId, i = 0, vol = 1) {
  const x = INSTRUMENTOS_ANCESTRAIS[id]
  const f = x.notas[((i % x.notas.length) + x.notas.length) % x.notas.length]
  // o tambor gravado da D-Bee (o mesmo da cena da casa), se já carregou
  if (x.timbre === "tambor" && tamborPronto() && baterAmostra(0, f, 0.8, 0, 0.8 * vol)) return
  soarTimbre(AO_VIVO, x.timbre, f, vol)
}
