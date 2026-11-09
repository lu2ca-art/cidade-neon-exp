// Abrir o jogo direto numa parte da jornada (22/10): /linha?mapa=disco&parte=casa
// troca o save por um pronto pra aquela parte (os ids de parte.ts e do mapa do
// jogo). (notas 04/11) O save pronto vai pro save de TESTE (chaveSave.ts): o de
// verdade fica onde está, e abrir o /linha sem ?parte volta pra ele.
// Só vale fora da produção, como os atalhos do /teste. A mesa de montagem usa
// estes links pra cada momento ter o seu "testar".

import { BASE_TESTE, CHAVE_SAVE, atalhosLiberados } from "../teste/atalhos"
import { ligarTeste } from "./chaveSave"
import { pedirDescida, pedirNascerNaPorta } from "./disco/elevadores"
import { esquecerTerror } from "./disco/terror"
import { apagarOndeParou, gravarOndeParou } from "./estrada/ondeParou"
import { INSTRUMENTOS_ANCESTRAIS, type InstrumentoId } from "./disco/instrumentos"
import { INSTRUMENTOS_MUNDO } from "./disco/instrumentosMundo"
import { FEIRA_RUMO, naFeira } from "./disco/feira"

import { CONFIG13, IDS13, MISSOES13, normalizarMissao, ordemDe } from "./disco/portas"
import { LETRAS } from "./disco/letras"
import { SHOWS_XENOM, xenomPorId } from "./disco/xenom"
import { prepararMetro } from "./disco/metro"
import { VEICULOS } from "./disco/perseguicao"
import type { HistoriaDisco } from "./disco/historia"
import { MOMENTOS, ehMomentoFinal } from "./disco/final"
import { PISTAS } from "./estrada/pistas"
import { GRAFITES } from "./grafite/grafites"

// (T02) as missões: o id das 13 (missao.drew) ou, como antes, a faixa (missao.sexta → a do Drew)
const MISSOES = ["sexta", "dopamina", "ojala", "swav", "copo", "ontem", "rollercoaster", "chuva", "nectar"]
// as que vão pra feira (as duas do começo, a D-Bee e a oficina, são as fases casa/dunas e oficina)
const MISSOES_FEIRA = IDS13.filter((id) => !MISSOES13[id].prologo)
// (T02) o meio da carreira: 4 missões feitas, o Guitar Driver com 4 músicas, a feira com as próximas
const MEIO = { fase: "carreira", holo: true, feitas13: ["dbee", "oficina", "lu2ca", "drew", "quadra"], portas: ["holo", "violao", "kombi-melhorias", "shows-live", "ginasio", "quadra", "batida-estudio"], guitar: ["ojala", "sexta", "ontem"], batida: ["ojala", "nectar", "sexta", "ontem"] }

// (T03) o bolso de quem vai às compras: dá pra comprar um disco, uma guitarra e roupa, mas não um carro
const GRANA = { agua: 460, popularidade: 35, economia: 2 }

function discoDa(parte: string): Record<string, unknown> | null {
  if (parte === "inicio" || parte === "minhoca") return null // save novo: começa no buraco de minhoca
  if (["casa", "casa.holo", "casa.tambor"].includes(parte)) return { fase: "casa", holo: false }
  // (T07) o tutorial do voo e do turbo: a Kombi já voa, os passos das dunas feitos
  if (parte === "subir.voo") return { fase: "subir", holo: true, drone: true, aguaDbee: true, passos13: ["dbee:arte", "dbee:jogo", "oficina:arte", "oficina:jogo"], feitas13: ["dbee", "oficina"], portas: ["holo", "violao", "kombi-melhorias"], mods: ["solar", "turbo", "propulsao"], tutorial: ["recompensa", "mapa", "rota", "gps", "drift", "anel"] }
  if (["dunas", "bar"].includes(parte)) return { fase: parte, holo: true }
  // (T09) a missão da oficina, passo a passo (a água que a D-Bee deu já no bolso)
  const D_FEITA = ["dbee:arte", "dbee:jogo"]
  if (parte === "oficina" || parte === "oficina.cena") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA }
  // (T57) catar: o lixo espalhado no lixão (pega passando); .painel = só falta o painel; bancada = com as quatro, a oficina monta
  // (08/11) ep. 1: conheceu o Mubarak, falta o show da Nectar no palco do bar
  if (parte === "oficina.show") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA, oficina: { cena: true } }
  if (parte === "oficina.catar") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA, palcos: { "bar:nectar": 1 }, oficina: { cena: true } }
  if (parte === "oficina.painel") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA, palcos: { "bar:nectar": 1 }, oficina: { cena: true, pecas: ["lavadora", "ventilador", "radio"] } }
  if (parte === "oficina.bancada") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA, palcos: { "bar:nectar": 1 }, oficina: { cena: true, painel: true, pecas: ["painel", "lavadora", "ventilador", "radio"] } }
  if (parte === "oficina.goteira") return { fase: "oficina", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte"], palcos: { "bar:nectar": 1 }, oficina: { cena: true, painel: true, pecas: ["painel", "lavadora", "ventilador", "radio"] } }
  if (parte === "oficina.pagar") return { fase: "oficina", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte", "oficina:jogo"], palcos: { "bar:nectar": 1 }, oficina: { cena: true, painel: true, tanque: 10 } }
  // depois da porta: a Kombi voa, ainda no subúrbio; parando na oficina, a lojinha das melhorias (com água)
  if (parte === "oficina.loja" || parte === "subir") return { fase: "subir", holo: true, aguaDbee: true, passos13: [...D_FEITA, "oficina:arte", "oficina:jogo"], feitas13: ["dbee", "oficina"], portas: ["holo", "violao", "kombi-melhorias"], mods: ["solar", "turbo", "propulsao"] }
  // (T27) a Kombi que quebra: a carreira sem missão pegada (força a quebra com window.__cnQuebrar) e já quebrada
  if (parte === "quebra") return MEIO
  if (parte === "quebra.oficina") return { ...MEIO, quebra: { quebrada: true, vezes: 1 } }
  // (T28) a perseguição da Kombi: já com a polícia atrás; .escolher = a Kombi já foi
  // jogada, os 3 veículos na pista; .gatilho = a fama e as missões no ponto (vem sozinha)
  if (parte === "perseguicao") return { ...MEIO, perseguicao: { fase: "agora" } }
  if (parte === "perseguicao.escolher") return { ...MEIO, perseguicao: { fase: "escolher" } }
  // (08/11) a perseguição é do ep. 9: o gatilho é ter os 8 episódios de antes feitos
  if (parte === "perseguicao.gatilho") return { ...MEIO, feitas13: ["dbee", "oficina", "notti", "quadra", "mubarak", "tony", "drew", "tuneis", "ella", "nizzy"] }
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
    // (T22) a casa nova de uma missão em teste (a da Ella) joga com este link
    const base = { fase: "carreira", holo: true, missao: m, feitas13, ...(CONFIG13.soNoTeste.includes(m) ? { teste13: [m] } : {}) }
    // (T22) missao.ella.casa: direto dentro da casa (a primeira peça aberta)
    if (sub === "casa" && MISSOES13[m][ordemDe(m)[0]].como?.t === "casa") return { ...base, aberta13: `${m}:${ordemDe(m)[0]}` }
    // (T10) a quadra: a arte (o B4TIDA) e o jogo (o basquete) abertos direto
    if (m === "quadra" && sub === "batida") return { ...base, aberta13: "quadra:arte" }
    if (m === "quadra" && sub === "basquete") return { ...base, passos13: ["quadra:arte"], aberta13: "quadra:jogo" }
    // (T63) a missão dos túneis já lá embaixo: o jogo desce direto pras trincheiras (dentro do jogo)
    if (m === "tuneis" && sub === "trincheiras") return base
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
      return { ...base, passos13, ...(como && (como.t === "cena" || como.t === "letra" || como.t === "feira") ? { aberta13: `${m}:${sub}` } : {}) }
    }
    if (sub) return undefined as unknown as null
    return base
  }
  // (T20) os palcos: o menu aberto. "palcos" = o meio da carreira com 2 ★ (uma
  // música a mais e o bar abre); "palcos.topo" = todos abertos, no alto das torres
  if (parte === "palcos") return { ...MEIO, palcos: { "calcada:ojala": 2 } }
  // (09/11) as mensagens dos amigos: o meio da carreira, sem as pedras da trilha na frente (na lista: D-Bee, Mubarak, LU2CA, Alohan e Drew)
  if (parte === "amigos") return { ...MEIO, feitas13: [...MEIO.feitas13, "tuneis"], tutorial: ["recompensa", "mapa", "rota", "gps", "drift", "anel", "ajuda", "voo", "turbo", "pousa", "escolhe", "linha", "chegou", "liberou", "radio", "salvar", "veiculo"] }
  if (parte === "palcos.topo") return { ...MEIO, palcos: { "calcada:nectar": 5, "bar:nectar": 5, "balada:nectar": 4, "terraco:nectar": 4, "calcada:ojala": 3 } }
  // (T21) os shows do subúrbio xenom: "xenom" = o menu dos palcos com 3 das 4
  // missões do subúrbio feitas (os túneis faltando); "xenom.<id>" = o show daquele
  // multiverso já aberto (as 4 feitas); "xenom.album" = os 4 cumpridos, o álbum liberado
  if (parte === "xenom") return MEIO
  if (parte === "xenom.album") return { ...MEIO, feitas13: [...MEIO.feitas13, "tuneis"], xenom: Object.fromEntries(SHOWS_XENOM.map((x) => [x.id, { melhor: 4, cumprida: true, vezes: 1 }])) }
  if (parte.startsWith("xenom.") && xenomPorId(parte.slice(6))) return { ...MEIO, feitas13: [...MEIO.feitas13, "tuneis"], show: `xenom:${parte.slice(6)}` }
  // (T61) a rotatória de cima: o meio da carreira (2 músicas feitas, 2 abertas:
  // os monumentos), começando na alça de uma linha que chega na torre central
  // ("torre") ou numa das pontas ("torre.ponta", a de 3 saídas)
  if (parte === "torre" || parte === "torre.ponta") return MEIO
  // (09/11) o ep. 8 aberto, no anel de uma torre: a estação do metrô, o passeio tranquilo
  if (parte === "metro.passeio") return { ...MEIO, feitas13: ["dbee", "oficina", "notti", "quadra", "mubarak", "tony", "drew", "tuneis", "ella"], passos13: ["nizzy:arte"] }
  // (09/11) depois do passeio: tocar violão no trem chama o guarda
  if (parte === "metro.violao") return { ...MEIO, feitas13: ["dbee", "oficina", "notti", "quadra", "mubarak", "tony", "drew", "tuneis", "ella", "nizzy"] }
  // (09/11) depois do ep. 9: violão perdido. A loja vende outro; no trem, o comprado toca (ou o cadeado)
  if (parte === "loja.violao" || parte === "metro.comprado" || parte === "metro.sem-instrumento") return { ...MEIO, feitas13: ["dbee", "oficina", "notti", "quadra", "mubarak", "tony", "drew", "tuneis", "ella", "nizzy"], perseguicao: { fase: "feita", veiculo: VEICULOS[0].id }, metro: { fase: "feita", escapou: true }, perdeuViolao: true, jetpackTomado: true }
  // (T03) a loja aberta, com grana no bolso (o resto do save é o meio da carreira)
  if (parte === "loja") return MEIO
  // (T44) os rachas: a cidade livre, com um dos carros do mecânico logo à frente
  // (T29) o final: as 12 missões feitas (as portas e as músicas de todas), o final
  // pegado; a sequência começa direto (?parte=final) ou num momento (final.nove…)
  if (parte === "final" || (parte.startsWith("final.") && ehMomentoFinal(parte.slice(6)))) return FINAL
  // (06/11) o mundo depois: as 13 feitas, o final também (plantas, cabines, rio e floresta).
  // "mundo.depois" começa na torre central; ".tuneis" desce direto pras trincheiras;
  // ".floresta" (09/11) nasce na porta do deserto, na beira da floresta
  if (parte === "mundo.depois" || parte === "mundo.depois.tuneis" || parte === "mundo.depois.floresta") return DEPOIS
  if (parte === "livre" || parte === "rachas") return { fase: "livre", holo: true }
  // (T59) a Kombi por dentro: a cidade livre, já na 1ª pessoa (o interior modelado)
  if (parte === "kombi.dentro") return { fase: "livre", holo: true }
  // (T64, lote D) o metrô: a Kombi já foi jogada, a fuga começa ao entrar (prepararMetro);
  // o violão: o meio da carreira com o violão no save (o botão aparece com o disco tocando);
  // o grafite: a missão dos túneis pegada, desce direto pras trincheiras (a arte é o grafite)
  if (parte === "metro") return prepararMetro(MEIO as unknown as HistoriaDisco) as unknown as Record<string, unknown>
  if (parte === "violao") return MEIO
  if (parte === "grafite") return { fase: "carreira", holo: true, missao: "tuneis", feitas13: ["dbee", "oficina"] }
  // (T64, 06/11) o grafite livre: a missão dos túneis feita (os 3 assinados), desce
  // livre; nas paredes da "LU2CA" (1 em cada 4) o botão "pintar a sua tag"
  if (parte === "grafite.livre") return { ...MEIO, feitas13: [...MEIO.feitas13, "tuneis"], grafites: GRAFITES.slice(0, 3).map((g) => g.id) }
  // (T64, 06/11) o metrô de novo: a fuga de quando te pegam já feita (violão perdido,
  // os 3 veículos), desce nos túneis; o trem parado no salão do metrô abre a fuga
  if (parte === "metro.tuneis") return { ...MEIO, feitas13: [...MEIO.feitas13, "tuneis"], perseguicao: { fase: "escolher" }, metro: { fase: "feita", escapou: true }, perdeuViolao: true, jetpackTomado: true }
  // (T47, lote D) o elevador de terror: o meio da carreira, a sala abre ao entrar
  if (parte === "elevador") return MEIO
  // (elevadores, 06/11) o elevador do túnel: a missão dos túneis feita, desce direto
  // no salão da TORRE 1, na frente do elevador (sobe pra torre da ponta da Nectar)
  // (09/11) a porta do elevador no deserto: a carreira, na frente dela, com água
  if (parte === "elevador.deserto") return MEIO
  if (parte === "elevador.subir" || parte === "elevador.terror") return { ...MEIO, feitas13: [...MEIO.feitas13, "tuneis"] }
  // (T49, lote D) a casa da D-Bee com instrumentos no save (dois ainda não vistos:
  // a cena pede pra tocar os novos) e a tela de recompensa com um instrumento (a
  // porta do Mubarak abre: o sitar)
  // (bíblia §13, 09/11) achados: todos na Kombi (a câmera de dentro); e o começo do lado de um, sem nenhum achado ainda
  if (parte === "instrumentos.kombi") return { fase: "livre", holo: true, instrumentosAchados: Object.keys(INSTRUMENTOS_ANCESTRAIS) as InstrumentoId[] }
  if (parte === "instrumentos.mundo") return { fase: "livre", holo: true, instrumentosAchados: [] }
  if (parte === "casa.instrumentos") return { ...MEIO, instrumentos: ["djembe", "tambor-agua", "udu", "caxixi", "berimbau", "sitar", "kalimba"], instrumentosVistos: ["djembe", "tambor-agua", "udu", "caxixi", "berimbau"] }
  // (T49, 06/11) a casa da D-Bee com TODOS os instrumentos ganhos (e já vistos:
  // a visita livre, toca à vontade e sai pelo "pronto")
  if (parte === "instrumentos") { const todos = IDS13.map((id) => MISSOES13[id].recompensa.instrumento).filter(Boolean); return { ...MEIO, instrumentos: todos, instrumentosVistos: todos } }
  if (parte === "recompensa.instrumento") return { ...MEIO, missao: "mubarak", passos13: ["mubarak:arte", "mubarak:jogo"] }
  // (vitrine, 02/11) o começo (a oficina, antes de subir): desce pela boca do túnel
  // e vê a corrida com o cadeado; e o bar do subúrbio na carreira, com a sinuca aberta
  if (parte === "vitrine.tunel") return { fase: "oficina", holo: true, aguaDbee: true, passos13: D_FEITA }
  if (parte === "vitrine.bar") return MEIO
  // (vitrine, parte 2) as salas da cidade fora da missão e a casa da D-Bee: a visita abre ao entrar
  if (parte in VISITAS) return MEIO
  return undefined as unknown as null
}

// (T29) o save do final: tudo feito menos ele, e ele pegado
const ANTES_DO_FINAL = IDS13.filter((id) => id !== "final")
const FINAL = {
  fase: "carreira", holo: true, missao: "final", feitas13: ANTES_DO_FINAL, drone: true, aguaDbee: true,
  passos13: ANTES_DO_FINAL.flatMap((id) => [`${id}:arte`, `${id}:jogo`]),
  portas: [...new Set(ANTES_DO_FINAL.flatMap((id) => MISSOES13[id].abre))],
  guitar: ANTES_DO_FINAL.map((id) => MISSOES13[id].recompensa.guitar).filter(Boolean),
  batida: ANTES_DO_FINAL.map((id) => MISSOES13[id].recompensa.batida).filter(Boolean),
  instrumentos: ANTES_DO_FINAL.map((id) => MISSOES13[id].recompensa.instrumento).filter(Boolean),
  mods: ["solar", "turbo", "propulsao"],
}

// (06/11) o save depois do final: tudo feito, nenhuma missão pegada
const DEPOIS = {
  fase: "carreira", holo: true, feitas13: [...IDS13], drone: true, aguaDbee: true,
  passos13: IDS13.flatMap((id) => [`${id}:arte`, `${id}:jogo`]),
  portas: [...new Set(IDS13.flatMap((id) => MISSOES13[id].abre))],
  guitar: FINAL.guitar, batida: FINAL.batida, instrumentos: FINAL.instrumentos, mods: FINAL.mods,
}

// (vitrine, parte 2) ?parte=vitrine.<sala> → a visita que abre ao entrar
const VISITAS: Record<string, string> = { "vitrine.balada": "balada", "vitrine.drewboy": "casa-drewboy", "vitrine.terraco": "topo", "vitrine.shows": "casa-shows", "vitrine.casa": "casa-dbee", "vitrine.beco": "beco", "vitrine.escondido": "escondido", "vitrine.posto": "posto" }

// (T15–T25, T16) as peças novas, uma de cada, abertas direto
const PECAS_NOVAS = ["missao.drew.arte", "missao.drew.jogo", "missao.xeriff.arte", "missao.notti.arte", "missao.notti.jogo", "missao.nizzy.arte", "missao.tony.jogo", "missao.tony.arte", "missao.mubarak.arte", "missao.mubarak.jogo"]
export const OFICINA_PARTES = ["oficina.catar", "oficina.painel", "oficina.bancada", "oficina.goteira", "oficina.pagar", "oficina.loja"]
export const PARTES_TESTE = ["inicio", "minhoca", "casa", "casa.tambor", "casa.holo", "dunas", "subir.voo", "bar", "oficina", "oficina.show", ...OFICINA_PARTES, "subir", "quebra", "quebra.oficina", "perseguicao", "perseguicao.escolher", "perseguicao.gatilho", "nectar", "carreira.feira", "carreira.meio", "amigos", "chegada", "loja", "palcos", "palcos.topo", "xenom", ...SHOWS_XENOM.map((x) => `xenom.${x.id}`), "xenom.album", ...MISSOES_FEIRA.map((m) => `missao.${m}`), "missao.lu2ca.letra", "missao.lu2ca.show", "missao.quadra.batida", "missao.quadra.basquete", "missao.ella.casa", "missao.tuneis.trincheiras", ...PECAS_NOVAS, ...MISSOES.map((m) => `missao.${m}`), "livre", "rachas", "torre", "torre.ponta", "kombi.dentro", "violao", "metro", "metro.tuneis", "grafite", "grafite.livre", "elevador", "elevador.subir", "elevador.terror", "instrumentos", "casa.instrumentos", "recompensa.instrumento", "vitrine.tunel", "vitrine.bar", ...Object.keys(VISITAS), "final", ...MOMENTOS.map((m) => `final.${m}`), "mundo.depois", "mundo.depois.tuneis", "mundo.depois.floresta", "instrumentos.kombi", "instrumentos.mundo", "elevador.deserto", "metro.passeio", "metro.violao", "loja.violao", "metro.comprado", "metro.sem-instrumento"]

// (T37) a parte aberta nesta carga da página: um link de parte leva direto ao
// momento dele, sem a chegada do login na casinha (menos a própria "chegada")
export let parteAberta: string | null = null

// (T61) ?parte=torre: onde a Kombi começa (a alça de uma linha chegando numa torre)
let irTorre: { torre: number; pista: string } | null = null
// (vale pra corrida que ficar montada: a primeira que fica 3 s na tela apaga)
export const irTorreAgora = () => irTorre
export function limparIrTorre() { irTorre = null }

// chamado antes de o jogo ler o save; devolve true se trocou
export function aplicarParteDeTeste(): boolean {
  if (typeof window === "undefined" || !atalhosLiberados()) return false
  const url = new URL(location.href)
  const parte = url.searchParams.get("parte")
  if (!parte) return false
  const disco = discoDa(parte)
  if (disco === undefined) return false
  parteAberta = parte
  // (notas 04/11) o save do teste mora separado (CHAVE_SAVE = "cn-linha-222-teste"):
  // o save de verdade do dono não é tocado. A aba fica no modo teste (?teste=1)
  ligarTeste()
  apagarOndeParou() // o teste começa onde a parte manda, não onde o último teste parou
  // (09/11, ep. 5) a missão do Tony começa na rua da feira, de frente pras barracas
  if (parte === "missao.tony" || parte === "missao.tony.jogo" || parte === "missao.tony.arte" || parte === "missao.swav") { const p = naFeira(-16, 0); gravarOndeParou({ t: "chao", x: p.x, z: p.z, rumo: FEIRA_RUMO + Math.PI / 2 }) }
  if (disco === null) localStorage.removeItem(CHAVE_SAVE)
  // (T02) na carreira, as faixas feitas (o que acende as pistas) batem com as missões feitas
  else localStorage.setItem(CHAVE_SAVE, JSON.stringify({ ...BASE_TESTE, ...(disco.fase === "carreira" ? { objetos: parte === "carreira.meio" || parte === "loja" || parte === "loja.violao" || parte === "metro.comprado" || parte === "metro.sem-instrumento" || parte.startsWith("torre") || parte.startsWith("palcos") || parte.startsWith("xenom") ? ["nectar", "sexta"] : [] } : {}), ...(parte === "loja" || parte === "loja.violao" || parte === "elevador.deserto" ? GRANA : {}), ...(parte.startsWith("missao.tony") ? { agua: 60, economia: 1 } : {}), ...(parte === "violao" || parte === "metro" || parte === "metro.passeio" || parte === "metro.violao" ? { violao: true, objetos: ["nectar", "sexta"] } : {}), ...(parte.startsWith("perseguicao") ? { popularidade: 60 } : {}), ...(parte === "final" || parte.startsWith("final.") || parte.startsWith("mundo.depois") ? { objetos: PISTAS.map((x) => x.id) } : {}), ...(parte.startsWith("oficina") || parte.startsWith("quebra") ? { agua: parte === "oficina.loja" ? 80 : 60, economia: 1 } : {}), ...(parte === "loja.violao" || parte === "metro.comprado" || parte === "metro.sem-instrumento" ? { violao: false, compras: parte === "metro.comprado" ? ["instrumento:guitarra"] : [] } : {}), disco }))
  // (T03) a loja já abre no celular
  if (parte === "loja" || parte === "loja.violao") url.searchParams.set("app", "loja")
  if (parte.startsWith("palcos") || parte === "xenom" || parte === "xenom.album") url.searchParams.set("app", "palcos")
  if (parte === "rachas") url.searchParams.set("racha", "perto")
  // (T59) a câmera de dentro (a mesma chave do botão "1ª pessoa")
  if (parte === "kombi.dentro" || parte === "instrumentos.kombi") localStorage.setItem("cn-linha-cam", "dentro")
  // (bíblia §13) nasce a 30 m do didgeridoo, de frente pra ele
  if (parte === "instrumentos.mundo") { const p = INSTRUMENTOS_MUNDO.didgeridoo; gravarOndeParou({ t: "chao", x: p.x + 30, z: p.z, rumo: -Math.PI / 2 }) }
  // (T07) a cena da casa começa na entrega do holo (pula a chegada e o tambor)
  if (parte === "casa.holo") url.searchParams.set("cena", "holo")
  // (T06) a cena da casa começa no tambor (ela senta no tapete e chama)
  if (parte === "casa.tambor") url.searchParams.set("cena", "tambor")
  // (T63) as trincheiras: entrou no jogo, desce direto pela boca do túnel
  if (parte === "missao.tuneis.trincheiras" || parte === "mundo.depois.tuneis" || parte === "grafite" || parte === "grafite.livre" || parte === "metro.tuneis" || parte === "elevador.subir" || parte === "elevador.terror") url.searchParams.set("descer", "tuneis")
  if (parte === "elevador.subir") pedirDescida(1, null)
  if (parte === "elevador.deserto" || parte === "mundo.depois.floresta") pedirNascerNaPorta()
  // (T47) o elevador de terror: desce no salão da TORRE 2, na frente do elevador, como se fosse a 1ª vez
  if (parte === "elevador.terror") { pedirDescida(2, null); esquecerTerror() }
  // (T61) a rotatória: começa chegando na torre (a central pela Nectar; a da
  // ponta é a da Nectar, a Sexta-Feira e a Ojalá)
  if (parte === "mundo.depois") irTorre = { torre: 0, pista: "Nectar" }
  if (parte === "metro.passeio" || parte === "metro.violao" || parte === "metro.comprado" || parte === "metro.sem-instrumento") irTorre = { torre: 1, pista: "Nectar" }
  if (parte.startsWith("torre")) {
    irTorre = parte === "torre.ponta" ? { torre: 1, pista: "Nectar" } : { torre: 0, pista: "Nectar" }
  }
  // (08/11) o nascimento do monumento aparece de novo (o da missão aberta pelo link)
  if (parte.startsWith("missao.")) localStorage.removeItem("cn-monumentos-cena")
  // (lote D) o que abre direto ao entrar no jogo (page.tsx, abrirAoEntrar)
  const abrir: Record<string, string> = { elevador: "elevador", instrumentos: "casa", "casa.instrumentos": "casa", "recompensa.instrumento": "recompensa", "vitrine.tunel": "tunel", "vitrine.bar": "sinuca" }
  if (abrir[parte]) url.searchParams.set("abrir", abrir[parte])
  if (VISITAS[parte]) url.searchParams.set("abrir", `visita:${VISITAS[parte]}`)
  // (T29) o final: começa no palco (final) ou no momento pedido (final.povo, .agua, .chuva, .floresta)
  if (parte === "final" || parte.startsWith("final.")) url.searchParams.set("abrir", `final:${parte === "final" ? "palco" : parte.slice(6)}`)
  // tira o ?parte da URL: recarregar não troca o save de novo
  url.searchParams.delete("parte")
  url.searchParams.set("teste", "1")
  history.replaceState(null, "", url.pathname + (url.search ? url.search : ""))
  return true
}
