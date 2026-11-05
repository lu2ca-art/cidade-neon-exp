// (T57) A BOCA DO TÚNEL leva às trincheiras. A boca é de verdade no subúrbio (a
// rampa, a porta escura com o neon; estrada/chao.ts e LugaresChao) e, lá embaixo,
// ele desce pras trincheiras.
// (T63) As trincheiras (T11, T13, T14) agora moram DENTRO do jogo (app/linha/
// trincheiras): a porta não troca de página. O page.tsx tira a estrada da cena
// (a memória volta), escurece a descida e monta as trincheiras no lugar; "subir
// pro subúrbio" faz o caminho de volta.
// Se correu uma volta lá embaixo, conta pra missão dos túneis (o jogo dela).
// (30/10, o dono) A KOMBI NÃO ENTRA NO TÚNEL: ela para do lado de fora, na boca
// (lá embaixo, na frente da porta), e ele desce sem ela (lá embaixo, de patins,
// BMX ou skate; a moto segue trancada). Na volta, a Kombi está onde ficou
// parada, de frente pra porta, esperando. Sem cena da Kombi entrando.

import { BOCA } from "../estrada/chao"
import type { Desembarque } from "../estrada/ondeParou"

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
// onde a Kombi ficou parada na boca (a Corrida marca quando ela chega na porta)
const parada = { x: 0, z: 0, rumo: 0, tem: false }
// (revisão 05/11) fora: chegou na porta de patins/moto (o subúrbio é a pé), com a Kombi
// estacionada na entrada. Na volta ele sobe do mesmo jeito e a Kombi segue lá
let fora: Desembarque | null = null
export function pararNaBoca(x: number, z: number, rumo: number, f: Desembarque | null = null) { parada.x = x; parada.z = z; parada.rumo = rumo; parada.tem = true; fora = f }
export const foraNaBoca = () => (parada.tem ? fora : null)
// onde a Kombi está na volta: onde ficou parada; sem isso (o link de teste, o
// atalho que já começa lá embaixo), estacionada na frente da porta, de frente pra ela
export const PARADA_PADRAO_S = -BOCA.plano - 4
export function saidaDoTunel() {
  if (parada.tem) return { x: parada.x, z: parada.z, rumo: parada.rumo }
  const s = PARADA_PADRAO_S
  return { x: BOCA.x + BOCA.ax * s, z: BOCA.z + BOCA.az * s, rumo: Math.atan2(BOCA.ax, BOCA.az) }
}
