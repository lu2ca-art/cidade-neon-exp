// OS LUGARES QUE SÃO PÁGINAS (LU2CA 14/10): no mapa o lugar é só uma prévia
// leve (a fachada e o letreiro); entrando, uma cutscene curta espera a página
// robusta dele carregar em paralelo (o ginásio, a galeria, o fliperama…), e
// ao sair você volta pra estrada onde estava. Dados leves: a página
// principal e o mapa leem daqui.

import type { FreqId } from "./radio"

export interface LugarPagina {
  id: "ginasio" | "galeria" | "fliperama"
  nome: string // "o ginásio"
  rota: string
  area: FreqId
  u: number
  lado: 1 | -1
  horario: "dia" | "noite"
  cor: string
  letreiro: string
  // a linha da cutscene de entrada
  chegada: string
}

// longe das portas, dos canteiros, do parque, das bifurcações e das chegadas
export const PAGINAS: LugarPagina[] = [
  { id: "ginasio", nome: "o ginásio", rota: "/ginasio", area: "full", u: 1700, lado: 1, horario: "dia", cor: "#ff9000", letreiro: "GINÁSIO", chegada: "de dia · a quadra tá livre" },
  { id: "galeria", nome: "a galeria", rota: "/galeria", area: "crypto", u: 1550, lado: 1, horario: "dia", cor: "#3d7bff", letreiro: "GALERIA", chegada: "de dia · as paredes esperando quadro" },
  { id: "fliperama", nome: "o fliperama", rota: "/fliperama", area: "live", u: 1500, lado: -1, horario: "noite", cor: "#ff6a35", letreiro: "FLIPERAMA", chegada: "de noite · as fichas tilintando" },
]

// a página foi aberta a partir da cidade? então o "sair" volta pra estrada.
// Fica marcado na sessão (vale pras subpáginas, como pintar dentro da galeria)
const MARCA = "cn-de-cidade"
export function marcarDaCidade() { try { sessionStorage.setItem(MARCA, "1") } catch {} }
export function limparDaCidade() { try { sessionStorage.removeItem(MARCA) } catch {} }
export function sairDaPagina(push: (url: string) => void, senao = "/?screen=home") {
  let daCidade = false
  try { daCidade = new URLSearchParams(location.search).get("de") === "cidade" || sessionStorage.getItem(MARCA) === "1" } catch {}
  push(daCidade ? "/linha?volta=cidade" : senao)
}
