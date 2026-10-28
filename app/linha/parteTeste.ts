// Abrir o jogo direto numa parte da jornada (22/10): /linha?mapa=disco&parte=casa
// troca o save por um pronto pra aquela parte (os ids de parte.ts e do mapa do
// jogo). O save de verdade fica guardado em CHAVE_REAL (o /teste devolve).
// Só vale fora da produção, como os atalhos do /teste. A mesa de montagem usa
// estes links pra cada momento ter o seu "testar".

import { BASE_TESTE, CHAVE_REAL, CHAVE_SAVE, atalhosLiberados } from "../teste/atalhos"

import { IDS13, MISSOES13, normalizarMissao, ordemDe } from "./disco/portas"
import { LETRAS } from "./disco/letras"

// (T02) as missões: o id das 13 (missao.drew) ou, como antes, a faixa (missao.sexta → a do Drew)
const MISSOES = ["sexta", "dopamina", "ojala", "swav", "copo", "ontem", "rollercoaster", "chuva", "nectar"]
// as que vão pra feira (as duas do começo, a D-Bee e a oficina, são as fases casa/dunas e oficina)
const MISSOES_FEIRA = IDS13.filter((id) => !MISSOES13[id].prologo)
// (T02) o meio da carreira: 4 missões feitas, o Guitar Driver com 4 músicas, a feira com as próximas
const MEIO = { fase: "carreira", holo: true, feitas13: ["dbee", "oficina", "lu2ca", "drew", "quadra"], portas: ["holo", "violao", "kombi-melhorias", "shows-live", "ginasio", "quadra", "batida-estudio"], guitar: ["ojala", "sexta", "ontem"], batida: ["ojala", "nectar", "sexta", "ontem"] }

// (T03) o bolso de quem vai às compras: dá pra comprar um disco, uma guitarra e roupa, mas não um carro
const GRANA = { neon: 420, agua: 40, popularidade: 35, economia: 1 }

function discoDa(parte: string): Record<string, unknown> | null {
  if (parte === "inicio" || parte === "minhoca") return null // save novo: começa no buraco de minhoca
  if (["casa"].includes(parte)) return { fase: "casa", holo: false }
  if (["dunas", "bar"].includes(parte)) return { fase: parte, holo: true }
  // (T09) a missão da oficina, passo a passo (a água que a D-Bee deu já no bolso)
  const D_FEITA = ["dbee:arte", "dbee:jogo"]
  if (parte === "oficina" || parte === "oficina.cena") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA }
  if (parte === "oficina.bancada") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA, oficina: { cena: true } }
  if (parte === "oficina.painel") return { fase: "oficina", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte"], oficina: { cena: true } }
  if (parte === "oficina.goteira") return { fase: "oficina", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte"], oficina: { cena: true, painel: true } }
  if (parte === "oficina.pagar") return { fase: "oficina", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte", "oficina:jogo"], oficina: { cena: true, painel: true, tanque: 10 } }
  // depois da porta: a Kombi voa, ainda no subúrbio; parando na oficina, a lojinha das melhorias (com água)
  if (parte === "oficina.loja" || parte === "subir") return { fase: "subir", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte", "oficina:jogo"], feitas13: ["dbee", "oficina"], portas: ["holo", "violao", "kombi-melhorias"], mods: ["solar", "turbo", "propulsao"] }
  if (parte === "nectar" || parte.startsWith("nectar.")) return { fase: "nectar", holo: true, nectar: parte.split(".")[1] || "quebra" }
  if (parte === "carreira.feira" || parte === "feira") return { fase: "carreira", holo: true }
  if (parte === "carreira.meio") return MEIO
  // (T37) a chegada de um login: quem já passou pela casa entra pelo túnel e cai nela de novo
  if (parte === "chegada") return MEIO
  if (parte.startsWith("missao.")) {
    // (T19) a peça aberta direto: missao.lu2ca.letra (a arte) e missao.lu2ca.show (o live, com a letra escrita)
    const [mId, sub] = parte.slice(7).split(".")
    const m = normalizarMissao(mId)
    if (!m || MISSOES13[m].prologo) return undefined as unknown as null
    // (a missão da cidade precisa da pista acesa e de quem ela pede antes: o save já vem com isso)
    const feitas13 = [...new Set(["dbee", "oficina", ...MISSOES13[m].requer])].filter((x) => x !== m)
    const base = { fase: "carreira", holo: true, missao: m, feitas13 }
    // (T10) a quadra: a arte (o B4TIDA) e o jogo (o basquete) abertos direto
    if (m === "quadra" && sub === "batida") return { ...base, aberta13: "quadra:arte" }
    if (m === "quadra" && sub === "basquete") return { ...base, passos13: ["quadra:arte"], aberta13: "quadra:jogo" }
    if (m === "lu2ca" && sub === "letra") return { ...base, aberta13: "lu2ca:arte" }
    if (m === "lu2ca" && sub === "show") return { ...base, passos13: ["lu2ca:arte"], letras: { nectar: LETRAS.nectar!.versos.map((v) => v.opcoes[0]) }, show: "missao:lu2ca" }
    // (T15–T25, T16) a peça aberta direto: missao.<id>.arte / .jogo (as peças de
    // antes já feitas; a que abre por cima do jogo já vem aberta) e .porta (as duas
    // feitas: chegou no lugar, a porta abre)
    if (sub === "arte" || sub === "jogo" || sub === "porta") {
      const ordem = ordemDe(m)
      const antes = sub === "porta" ? ordem : ordem.slice(0, ordem.indexOf(sub))
      const passos13 = antes.map((q) => `${m}:${q}`)
      const como = sub === "porta" ? null : MISSOES13[m][sub].como
      return { ...base, passos13, ...(como && (como.t === "cena" || como.t === "letra") ? { aberta13: `${m}:${sub}` } : {}) }
    }
    if (sub) return undefined as unknown as null
    return base
  }
  // (T20) os palcos: o menu aberto. "palcos" = o meio da carreira com 2 ★ (uma
  // música a mais e o bar abre); "palcos.topo" = todos abertos, no alto das torres
  if (parte === "palcos") return { ...MEIO, palcos: { "calcada:ojala": 2 } }
  if (parte === "palcos.topo") return { ...MEIO, palcos: { "calcada:nectar": 5, "bar:nectar": 5, "balada:nectar": 4, "terraco:nectar": 4, "calcada:ojala": 3 } }
  // (T03) a loja aberta, com grana no bolso (o resto do save é o meio da carreira)
  if (parte === "loja") return MEIO
  if (parte === "livre" || parte === "final") return { fase: "livre", holo: true }
  return undefined as unknown as null
}

// (T15–T25, T16) as peças novas, uma de cada, abertas direto
const PECAS_NOVAS = ["missao.drew.arte", "missao.drew.jogo", "missao.xeriff.arte", "missao.notti.arte", "missao.notti.jogo", "missao.nizzy.arte", "missao.tony.jogo", "missao.tony.arte", "missao.mubarak.arte", "missao.mubarak.jogo"]
export const OFICINA_PARTES = ["oficina.bancada", "oficina.painel", "oficina.goteira", "oficina.pagar", "oficina.loja"]
export const PARTES_TESTE = ["inicio", "minhoca", "casa", "dunas", "bar", "oficina", ...OFICINA_PARTES, "subir", "nectar", "carreira.feira", "carreira.meio", "chegada", "loja", "palcos", "palcos.topo", ...MISSOES_FEIRA.map((m) => `missao.${m}`), "missao.lu2ca.letra", "missao.lu2ca.show", "missao.quadra.batida", "missao.quadra.basquete", ...PECAS_NOVAS, ...MISSOES.map((m) => `missao.${m}`), "livre"]

// (T37) a parte aberta nesta carga da página: um link de parte leva direto ao
// momento dele, sem a chegada do login na casinha (menos a própria "chegada")
export let parteAberta: string | null = null

// chamado antes de o jogo ler o save; devolve true se trocou
export function aplicarParteDeTeste(): boolean {
  if (typeof window === "undefined" || !atalhosLiberados()) return false
  const url = new URL(location.href)
  const parte = url.searchParams.get("parte")
  if (!parte) return false
  const disco = discoDa(parte)
  if (disco === undefined) return false
  parteAberta = parte
  if (localStorage.getItem(CHAVE_REAL) === null) localStorage.setItem(CHAVE_REAL, localStorage.getItem(CHAVE_SAVE) ?? "")
  if (disco === null) localStorage.removeItem(CHAVE_SAVE)
  // (T02) na carreira, as faixas feitas (o que acende as pistas) batem com as missões feitas
  else localStorage.setItem(CHAVE_SAVE, JSON.stringify({ ...BASE_TESTE, ...(disco.fase === "carreira" ? { objetos: parte === "carreira.meio" || parte === "loja" || parte.startsWith("palcos") ? ["nectar", "sexta"] : [] } : {}), ...(parte === "loja" ? GRANA : {}), ...(parte.startsWith("oficina") ? { agua: parte === "oficina.loja" ? 80 : 60, economia: 1 } : {}), disco }))
  // (T03) a loja já abre no celular
  if (parte === "loja") url.searchParams.set("app", "loja")
  if (parte.startsWith("palcos")) url.searchParams.set("app", "palcos")
  // tira o ?parte da URL: recarregar não troca o save de novo
  url.searchParams.delete("parte")
  history.replaceState(null, "", url.pathname + (url.search ? url.search : ""))
  return true
}
