// O SOM DE CADA MISSÃO (T40, 28/10; J2: 5 "cada missao vai ter um som diferente").
//
// Um campo de som por missão, com as faixas e instrumentais que já existem em
// public/audio (nada novo de arquivo). Entrou na missão (a cena do lugar, o
// ping pong…), a música da Kombi some e entra o som dela; saiu, a Kombi volta.
// O som da D-Bee é uma batida de tambor sintetizada (trilha.ts). Tudo aqui é
// dado puro (sem áudio): quem toca é a trilha.ts; o que é gosto do dono troca
// aqui, num lugar só. Ver o relatório 2026-10-28-T40.md.

import { MISSOES13, type MissaoId } from "./portas"
import type { LugarId } from "../lugares"

export type SomMissao =
  | { tipo: "faixa"; nome: string; src: string; vol: number }
  // a batida do tambor: sintetizada, no relógio do áudio (sem atraso nem estalo)
  | { tipo: "tambor"; nome: string; bpm: number; vol: number }

const faixa = (nome: string, src: string, vol = 0.8): SomMissao => ({ tipo: "faixa", nome, src, vol })

export const SOM_MISSAO: Record<MissaoId, SomMissao> = {
  dbee: { tipo: "tambor", nome: "a batida do tambor dela", bpm: 84, vol: 0.9 },
  oficina: faixa("Boom Boom K (o catálogo do subúrbio)", "/audio/tracks/boom-boom-k.mp3"),
  quadra: faixa("Sabe Ontem? · instrumental", "/audio/pistas/ontem-inst.mp3"),
  tuneis: faixa("10 D3 10 (o catálogo do subúrbio)", "/audio/tracks/10de10.mp3"),
  drew: faixa("Sexta-Feira · instrumental", "/audio/pistas/sexta-inst.mp3"),
  mubarak: faixa("Copo Americano · instrumental", "/audio/pistas/copo-inst.mp3"),
  xeriff: faixa("Quem é você? (o arquivo da rádio)", "/audio/tracks/qm-e-vc.mp3"),
  lu2ca: faixa("Nectar · instrumental", "/audio/pistas/nectar-inst.mp3"),
  ella: faixa("CHUVA · instrumental", "/audio/pistas/chuva-inst.mp3"),
  notti: faixa("DopaminA · instrumental", "/audio/pistas/dopamina-inst.mp3"),
  nizzy: faixa("Rollercoaster · instrumental", "/audio/pistas/rollercoaster-inst.mp3"),
  tony: faixa("Swav · instrumental", "/audio/pistas/swav-inst.mp3"),
  final: faixa("Ojalá · instrumental", "/audio/pistas/ojala-inst.mp3"),
}

// o bar não é uma das 13, mas é um lugar da história e também tem som
export const SOM_BAR: SomMissao = faixa("Hollywood (o arquivo da rádio)", "/audio/tracks/hollywood.mp3", 0.7)

export const somDaMissao = (id: MissaoId): SomMissao => SOM_MISSAO[id]

// o som do lugar de uma cena: a missão que mora nele (a D-Bee antes da final,
// que usa a mesma casa); null = lugar sem som próprio (fica a música abafada)
export function somDoLugar(lugar: LugarId | string): SomMissao | null {
  if (lugar === "bar") return SOM_BAR
  const id = (Object.keys(MISSOES13) as MissaoId[]).find((m) => MISSOES13[m].lugar.lugar === lugar || MISSOES13[m].lugar.chao === lugar)
  return id ? SOM_MISSAO[id] : null
}

// ── a rádio só pega perto das pistas ──
// No deserto (a casa e as dunas) ninguém tem pista: toca o disco da Kombi. Fora
// do deserto, a rádio pega na pista e ainda por um tempinho depois de sair
// (o sinal some devagar, sem picotar a música nos cruzamentos)
export const RESTO_SINAL = 3 // segundos
export interface MemoriaRadio { resto: number }
export const FASES_SEM_PISTA = ["minhoca", "casa", "dunas"]
export function radioPega(mem: MemoriaRadio, fase: string | null, naPista: boolean, dt: number): boolean {
  if (fase && FASES_SEM_PISTA.includes(fase)) { mem.resto = 0; return false }
  if (naPista) mem.resto = RESTO_SINAL
  else mem.resto = Math.max(0, mem.resto - dt)
  return mem.resto > 0
}
