// OS INSTRUMENTOS ANCESTRAIS NO MUNDO (bíblia §13, 09/11): espalhados pelo deserto
// e pelo subúrbio; achou, pode tocar dentro da Kombi (estrada/InstrumentosKombi.tsx).
// Pega passando, como as peças do lixão (a Corrida confere de 250 em 250 ms e avisa
// `instrumento:<id>`). O que ele achou fica no save (`h.instrumentosAchados`).
//
// (o dono, 09/11) Na Kombi toca TUDO que ele tem: os achados e os ganhos em missão.
// A página espelha essa lista aqui (definirTem) e a cena lê sem prop nova; o que ele
// já tem não fica mais no chão. A casa da D-Bee mostra os mesmos (portas.ts
// instrumentosGanhos) e dá pra samplear todos. RASCUNHO: quais ficam onde (cada um longe do outro; os do
// subúrbio atrás dos lugares do chão, onde as ruínas não entram: ruinas.ts).

import { INSTRUMENTOS_ANCESTRAIS, type InstrumentoId } from "./instrumentos"
import type { PontoXZ } from "../estrada/Perto"

export const INSTRUMENTOS_MUNDO: Record<InstrumentoId, PontoXZ> = {
  // no deserto
  didgeridoo: { x: -1720, z: -1540 },
  sitar: { x: -1460, z: -1010 },
  ocarina: { x: -1180, z: -1360 },
  caxixi: { x: -1320, z: -620 },
  berimbau: { x: -1590, z: -370 },
  handpan: { x: -300, z: -905 }, // no lixão, a leste do subúrbio
  // no subúrbio
  "tambor-agua": { x: -603, z: -737 }, // embaixo da pista, perto da oficina
  udu: { x: -882, z: -810 }, // atrás da quadra
  kalimba: { x: -762, z: -452 }, // atrás dos discos
  "flauta-bambu": { x: -1007, z: -595 }, // atrás das flores
  djembe: { x: -599, z: -513 }, // atrás da galeria
}

// tudo que dá pra afinar fica aqui
export const NO_MUNDO = {
  raioAchar: 12, // m: passou perto, achou
  raioModelo: 140, // m: o modelo de verdade só monta aqui perto
  raioMarcos: 500, // m: os marcos (a pedra e a luz) só montam aqui perto
  escala: 2.4, // o instrumento é miúdo: maior que o real pra ler de longe
  alturaPedra: 1.5, // m: onde ele fica (em cima das pedras)
}

export const IDS_NO_MUNDO = Object.keys(INSTRUMENTOS_MUNDO) as InstrumentoId[]
export const PONTOS_NO_MUNDO: PontoXZ[] = IDS_NO_MUNDO.map((id) => INSTRUMENTOS_MUNDO[id])
export const corDoAchado = (id: InstrumentoId) => INSTRUMENTOS_ANCESTRAIS[id].cor

// o que ele tem: achados + ganhos em missão (espelho do save, pra Corrida e pra cena)
let TEM: readonly InstrumentoId[] = []
const ouvintes = new Set<() => void>()
export function definirTem(ids: readonly InstrumentoId[]) {
  if (ids.length === TEM.length && ids.every((x, i) => x === TEM[i])) return
  TEM = ids
  ouvintes.forEach((f) => f())
}
export const temAgora = () => TEM
// (14/11, KOMBEAT STUDIO) os 4 que estão na Kombi agora (portas.ts naKombi): a prateleira e o estúdio leem daqui
let NA_KOMBI: readonly InstrumentoId[] = []
const ouvintesKombi = new Set<() => void>()
export function definirNaKombi(ids: readonly InstrumentoId[]) {
  if (ids.length === NA_KOMBI.length && ids.every((x, i) => x === NA_KOMBI[i])) return
  NA_KOMBI = ids
  ouvintesKombi.forEach((f) => f())
}
export const naKombiAgora = () => NA_KOMBI
export function ouvirNaKombi(f: () => void) {
  ouvintesKombi.add(f)
  return () => { ouvintesKombi.delete(f) }
}
export function ouvirTem(f: () => void) {
  ouvintes.add(f)
  return () => { ouvintes.delete(f) }
}

// o sampler da casa da D-Bee pediu a batida com este instrumento (a página abre)
const pedidos = new Set<(id: InstrumentoId) => void>()
export function pedirSample(id: InstrumentoId) { pedidos.forEach((f) => f(id)) }
export function ouvirSample(f: (id: InstrumentoId) => void) {
  pedidos.add(f)
  return () => { pedidos.delete(f) }
}
