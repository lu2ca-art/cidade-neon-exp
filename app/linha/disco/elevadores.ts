// OS ELEVADORES DO TÚNEL (06/11, a versão jogável mínima; docs/elevadores.md).
// Bíblia §6: "são 3, concêntricos à rotatória que une as pistas". A proposta
// adotada (nova-ordem.md, até o dono vetar): os 3 elevadores são as 3 torres das
// pontas de hoje (mundoDisco.ts, GRUPOS; DiscoInfo.torre 1–3) e, lá embaixo, as
// 3 TORRES dos salões das trincheiras (trincheiras/mapa.ts, TORRES, na ordem).
//   subir: perto da torre do salão (o mesmo raio do texto da torre), o botão;
//          a cabine sobe (1,2 s) e ele aparece na entrada da rotatória da torre
//          da ponta N, fora da Kombi (de patins; de moto se estava de moto: na
//          cidade todos valem, estrada/zonas.ts). A Kombi fica onde estava.
//   descer: na rotatória da torre da ponta N (a via, sem conta por quadro), o
//          botão "descer · túneis"; desce no salão da TORRE N.
//   trancado: antes da missão dos túneis feita, os dois botões com o cadeado.
// (T47, o elevador de terror: o 2. Gancho: ELEVADOR_TERROR, abaixo; docs/t47-terror.md)
// Leve: só dados e um estado de módulo, sem three.js.

import type { Desembarque } from "../estrada/ondeParou"

export type Elevador = { n: 1 | 2 | 3; faixas: readonly string[] }
// na ordem de GRUPOS (mundoDisco.ts); a 1ª faixa é a linha por onde ele chega
export const ELEVADORES: readonly Elevador[] = [
  { n: 1, faixas: ["Nectar", "Sexta-Feira", "Ojalá"] },
  { n: 2, faixas: ["Rollercoaster", "Swav", "DopaminA"] },
  { n: 3, faixas: ["Copo Americano", "CHUVA", "Sabe Ontem?"] },
]
export const TRANCA_ELEVADOR = "abre com a missão dos túneis"
export const SEGUNDOS_CABINE = 1.2 // a subida/descida da cabine (sem tela preta longa)
export const rotuloSubir = (n: number) => `subir · torre ${n} (${ELEVADORES[n - 1]?.faixas.join(", ") ?? ""})`
export const rotuloDescer = (n: number) => `descer · túneis (torre ${n})`
// (T47, RASCUNHO) o elevador de terror mora no 2 (DopaminA, Rollercoaster, Swav):
// a subida vira o percurso no poço (disco/terror.ts, trincheiras/PocoTerror.tsx)
export const ELEVADOR_TERROR: number | null = 2

// ── a viagem: quem pediu, pra onde. A Corrida e as trincheiras desmontam uma a
// outra (page.tsx), então o pedido mora aqui até a outra cena nascer ──
let subida: { n: number; modo: "patins" | "moto" } | null = null
let descida: number | null = null
// a Kombi estacionada lá em cima quando ele desceu de patins/moto pelo elevador
let foraEmCima: Desembarque | null = null

export function pedirSubida(n: number, modo: "patins" | "moto") { subida = { n, modo } }
/** (a Corrida, ao nascer) chegou pelo elevador? Não consome: o jogo monta a
 * estrada mais de uma vez no começo; limparSubida (3 s depois, como o irTorre) */
export function subidaAgora(): { n: number; pista: string; modo: "patins" | "moto"; fora: Desembarque | null } | null {
  if (!subida) return null
  return { n: subida.n, pista: ELEVADORES[subida.n - 1].faixas[0], modo: subida.modo, fora: foraEmCima }
}
// (revisão 6) limpa sempre: o "fora" de uma descida pelo elevador não pode sobrar pra uma subida futura
export function limparSubida() { subida = null; foraEmCima = null }
export function pedirDescida(n: number, fora: Desembarque | null) { descida = n; foraEmCima = fora }
/** (o page, ao montar as trincheiras) desce em qual salão? Consome o pedido */
export function tomarDescida(): number | null { const d = descida; descida = null; return d }

// (T47, os limites) BMX e skate não existem na cidade (o desembarque lá em cima é
// patins/moto): ele chega de patins, e o elevador guarda o veículo dos túneis pra
// devolver quando ele descer de novo por um elevador
type VeiculoTunel = "bmx" | "skate" | "patins" | "moto"
let veiculoDoTunel: VeiculoTunel | null = null
export function lembrarVeiculoTunel(v: VeiculoTunel) { veiculoDoTunel = v }
/** (as trincheiras, ao descer pelo elevador) o veículo não motorizado com que ele subiu */
export function veiculoTunel(): "bmx" | "skate" | "patins" | null { return veiculoDoTunel === "moto" ? null : veiculoDoTunel }
