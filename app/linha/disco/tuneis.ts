// (T57) A BOCA DO TÚNEL leva às trincheiras. A boca é de verdade no subúrbio (a
// rampa, a porta escura com o neon; estrada/chao.ts e LugaresChao) e, lá embaixo,
// ele desce pras trincheiras.
// (T63) As trincheiras (T11, T13, T14) agora moram DENTRO do jogo (app/linha/
// trincheiras): a porta não troca de página. O page.tsx tira a estrada da cena
// (a memória volta), escurece a descida e monta as trincheiras no lugar; "subir
// pro subúrbio" faz o caminho de volta e a Kombi sai da boca, no alto da rampa.
// Se correu uma volta lá embaixo, conta pra missão dos túneis (o jogo dela).

import { BOCA } from "../estrada/chao"

// o caminho antigo (T57, a página /teste/trincheiras): a volta vinha pela barra
// (/linha?mapa=disco&de=tuneis). Ficou pro link de teste (?parte=missao.tuneis&de=tuneis)
export const VOLTA_TRINCHEIRAS = "/linha?mapa=disco&de=tuneis"

// as trincheiras baixam antes (enquanto ele ainda dirige até a boca)
export const carregarTrincheiras = () => import("../trincheiras/Trincheiras").then((m) => m.Trincheiras)

// (T63) a volta de dentro do jogo: quando ele subiu (a Kombi nasce na boca logo depois)
let subiuEm = -1e9
export function subiuDoTunel() { subiuEm = typeof performance === "undefined" ? 0 : performance.now() }

// voltou das trincheiras pela barra? (e correu uma volta inteira lá embaixo?) A
// barra é lida quando o jogo carrega (o ?parte= de teste limpa a barra logo depois)
const NA_ENTRADA = typeof location === "undefined" ? "" : location.search
let consumida = false
export function voltaDasTrincheiras(busca?: string) {
  if (busca === undefined && consumida) return null
  const q = new URLSearchParams(busca ?? NA_ENTRADA)
  return q.get("de") === "tuneis" ? { corrida: q.has("corrida") } : null
}
// (a Corrida) nascer na boca do túnel: logo depois de subir de lá (dentro do
// jogo) ou de a página carregar vindo de lá (o jogo monta a estrada mais de uma vez no começo)
export const nascerNoTunel = () => {
  if (typeof performance === "undefined") return false
  const agora = performance.now()
  return agora - subiuEm < 8000 || (agora < 30000 && !!voltaDasTrincheiras(NA_ENTRADA))
}
// a volta já foi tratada: tira o "de=tuneis" da barra (recarregar não repete)
export function limparVoltaDasTrincheiras() {
  consumida = true
  const u = new URL(location.href)
  u.searchParams.delete("de"); u.searchParams.delete("corrida")
  history.replaceState(history.state, "", u.pathname + u.search + u.hash)
}
// onde a Kombi reaparece na volta: no alto da rampa, de frente pro subúrbio
export function saidaDoTunel() {
  const s = -BOCA.comp - 8
  return { x: BOCA.x + BOCA.ax * s, z: BOCA.z + BOCA.az * s, rumo: Math.atan2(-BOCA.ax, -BOCA.az) }
}
