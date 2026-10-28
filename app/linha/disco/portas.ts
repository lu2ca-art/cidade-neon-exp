// AS 13 MISSÕES (T02, 28/10): o modelo novo, que troca "o show obrigatório no
// fim de cada missão". Fonte: retomar-mundo.md, a tabela "As 13 portas" e "Arte
// e jogo em cada missão" (LU2CA 27–28/10).
//
//   cada missão = a ARTE → o JOGO → a PORTA abre → a RECOMPENSA
//
// - Peça que ainda não existe no jogo (sem `como`) fica "em breve" e é pulada:
//   nada trava. Quando a tarefa dela (T09, T10, T15…) ficar pronta, basta pôr o
//   `como` aqui.
// - A porta abre o lugar inteiro (o princípio da porta): o que ela abre está em
//   `abre`; o que ainda não existe no jogo aparece "em breve" na recompensa.
// - A recompensa (decidido 27/10): a faixa liberada no Guitar Driver, a
//   referência no BATIDA e um dinheiro (neon$).
// - O show saiu de dentro da missão (J2: 23, 26): virou oportunidade na rua
//   (Rua.tsx). O Guitar Driver e o beat ficam abertos desde o início; o Guitar
//   libera as músicas conforme as missões (`musicasDoGuitar`).
// - O que é "proposta" ou "em aberto" no retomar-mundo.md está marcado em
//   `situacao` e mora em CONFIG13 quando muda o fluxo: o dono decide, a gente
//   troca aqui sem mexer no resto.
//
// As funções são puras (recebem a história do save e devolvem a nova): a
// page.tsx só chama. T03, T09, T10, T15–T25 e T30 constroem em cima disto.

import type { PistaId } from "../estrada/pistas"
import { PISTAS } from "../estrada/pistas"
import type { Luz } from "../estrada/atos"
import type { LugarId } from "../lugares"
import type { ProvaId } from "../data"
import type { HistoriaDisco, LugarChao } from "./historia"
import { PAGA } from "../economia-rascunho"

export type MissaoId = "dbee" | "oficina" | "quadra" | "tuneis" | "drew" | "mubarak" | "xeriff" | "lu2ca" | "ella" | "notti" | "nizzy" | "tony" | "final"
export type Situacao = "decidido" | "proposta" | "em aberto"

// como a peça é jogada hoje no jogo (sem `como` = "em breve")
export type ComoJoga =
  // a própria história faz (as fases do começo: a cena da casa, a travessia das dunas)
  | { t: "historia" }
  // o ping pong com o robô (disco/PingPong.tsx)
  | { t: "pingpong" }
  // o Guitar Driver no lugar da missão (disco/ShowBanda.tsx)
  | { t: "show"; faixa: PistaId }
  // um minijogo do fliperama (provas.tsx)
  | { t: "prova"; id: ProvaId }
  // na rua, em qualquer lugar: conta os eventos da estrada (n vezes)
  | { t: "evento"; evento: "montanha" | "flor"; n: number }

export interface Peca {
  nome: string
  situacao: Situacao
  como?: ComoJoga
  // a tarefa da lista-mestra que faz (ou termina) esta peça
  tarefa?: string
  // onde já existe um rascunho fora da missão (uma página, uma página de teste)
  existe?: string
}

// O QUE AS PORTAS ABREM. `existe`: já dá pra usar no jogo hoje (senão, "em breve")
export type PortaId =
  | "holo" | "violao" | "kombi-melhorias" | "quadra" | "batida-estudio" | "corridas" | "motos"
  | "ginasio" | "loja-discos" | "radio-frequencias" | "shows-live" | "galeria" | "fliperama"
  | "parque" | "canteiros" | "mundo-depois"
export const PORTAS: Record<PortaId, { nome: string; existe: boolean; tarefa?: string }> = {
  holo: { nome: "o holo: o mapa interativo", existe: true, tarefa: "T07" },
  violao: { nome: "o violão: acompanha qualquer música", existe: true, tarefa: "T08" },
  "kombi-melhorias": { nome: "as melhorias da Kombi", existe: true, tarefa: "T09" },
  quadra: { nome: "a quadra", existe: false, tarefa: "T10" },
  "batida-estudio": { nome: "o BATIDA pra produzir mais", existe: true, tarefa: "T10" },
  corridas: { nome: "as corridas nos túneis", existe: false, tarefa: "T13" },
  motos: { nome: "as motos", existe: false, tarefa: "T14" },
  ginasio: { nome: "o ginásio: basquete e cama elástica", existe: true, tarefa: "T15" },
  "loja-discos": { nome: "a loja de discos", existe: true, tarefa: "T16" },
  "radio-frequencias": { nome: "a rádio e as frequências", existe: true, tarefa: "T18" },
  "shows-live": { nome: "os 5 shows do LIVE", existe: false, tarefa: "T20" },
  galeria: { nome: "a galeria", existe: true, tarefa: "T22" },
  fliperama: { nome: "as 7 máquinas do fliperama", existe: true, tarefa: "T23" },
  parque: { nome: "o parque", existe: true, tarefa: "T24" },
  canteiros: { nome: "os canteiros pela cidade", existe: true, tarefa: "T25" },
  "mundo-depois": { nome: "o mundo depois", existe: false, tarefa: "T29" },
}

export interface Missao13 {
  id: MissaoId
  n: number // a ordem da tabela (não é a ordem obrigatória: ver `requer`)
  onde: "suburbio" | "cidade"
  quem: string
  cor: string
  // a faixa da pessoa (a pista dela no mapa); null = sem faixa (ver `faixaSituacao`)
  faixa: PistaId | null
  faixaSituacao: Situacao
  // onde a missão acontece: um lugar das pistas (lugares.ts) ou do chão do subúrbio
  lugar: { lugar?: LugarId; chao?: LugarChao }
  // o que a pessoa pede, na feira (RASCUNHO: o LU2CA reescreve)
  pedido: string
  apresenta: string
  arte: Peca
  jogo: Peca
  abre: PortaId[]
  recompensa: { guitar: PistaId | null; batida: string | null; neon: number }
  // só aparece depois destas (o resto da ordem é livre, pela feira)
  requer: MissaoId[]
  // feita pela história do começo (a casa e as dunas; a oficina): não vai pra feira
  prologo?: true
}

// ── o que ainda é decisão do dono (troca aqui; o resto segue sozinho) ──
export const CONFIG13 = {
  // (em aberto) as músicas que o Guitar Driver já tem no começo. A Nectar é a
  // do próprio LU2CA; cada missão libera a faixa de quem ajudou
  musicasDoInicio: ["nectar"] as PistaId[],
  // (T03) o neon$ de cada missão mora em economia-rascunho.ts (PAGA.missao)
  // (decidido 21/10, as torres) a missão da cidade só aparece com a pista
  // dela acesa (estrada/atos.ts): o mapa vai colorindo espalhado
  soComPistaAcesa: true,
}

const p = (nome: string, situacao: Situacao, extra: Partial<Peca> = {}): Peca => ({ nome, situacao, ...extra })

export const MISSOES13: Record<MissaoId, Missao13> = {
  // ── o subúrbio (4) ──
  dbee: {
    id: "dbee", n: 1, onde: "suburbio", quem: "D-Bee", cor: "#3d7bff", faixa: "ojala", faixaSituacao: "proposta",
    lugar: { lugar: "casa-dbee" }, pedido: "ela tava te esperando", apresenta: "tocar tambor junto com ela",
    arte: p("o tambor com a D-Bee", "decidido", { como: { t: "historia" }, tarefa: "T06" }),
    jogo: p("o drift e o holo: a travessia até o subúrbio", "decidido", { como: { t: "historia" }, tarefa: "T07" }),
    abre: ["holo", "violao"], recompensa: { guitar: "ojala", batida: "ojala", neon: PAGA.missao.dbee }, requer: [], prologo: true,
  },
  oficina: {
    id: "oficina", n: 2, onde: "suburbio", quem: "o mecânico", cor: "#ff9000", faixa: null, faixaSituacao: "em aberto",
    lugar: { chao: "oficina" }, pedido: "a kombi não sobe sem motor novo", apresenta: "montar o motor com o mecânico",
    arte: p("a reciclagem: o lixo vira tecnologia", "decidido", { tarefa: "T09" }),
    jogo: p("achar o painel solar no lixão e a goteira", "decidido", { tarefa: "T09" }),
    abre: ["kombi-melhorias"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.oficina }, requer: ["dbee"], prologo: true,
  },
  quadra: {
    id: "quadra", n: 3, onde: "suburbio", quem: "Alohan", cor: "#ff6a35", faixa: "ontem", faixaSituacao: "proposta",
    lugar: { chao: "quadra" }, pedido: "a quadra tá vazia. falta o beat", apresenta: "o Alohan apresenta o BATIDA",
    arte: p("um instrumental no BATIDA pra galera", "decidido", { tarefa: "T10", existe: "/batida" }),
    jogo: p("a partida de basquete", "decidido", { tarefa: "T10", existe: "/ginasio (basquete.tsx)" }),
    abre: ["quadra", "batida-estudio"], recompensa: { guitar: "ontem", batida: "ontem", neon: PAGA.missao.quadra }, requer: ["oficina"],
  },
  tuneis: {
    id: "tuneis", n: 4, onde: "suburbio", quem: "os túneis", cor: "#9b8cff", faixa: null, faixaSituacao: "em aberto",
    lugar: { chao: "tuneis" }, pedido: "embaixo das raízes tem corrida", apresenta: "a corrida de BMX, patins ou skate nas trincheiras",
    arte: p("o grafite: um gesto assina o desenho", "decidido", { tarefa: "T12", existe: "página de teste do T12" }),
    jogo: p("a corrida de BMX, patins ou skate", "decidido", { tarefa: "T13" }),
    abre: ["corridas", "motos"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.tuneis }, requer: ["oficina"],
  },
  // ── a cidade (8) ──
  drew: {
    id: "drew", n: 5, onde: "cidade", quem: "Drew", cor: "#6d7bff", faixa: "sexta", faixaSituacao: "decidido",
    lugar: { lugar: "casa-drewboy" }, pedido: "sexta e eu em casa de novo", apresenta: "o jetpack, depois o ping pong",
    arte: p("dançar na balada, marcando o ritmo", "proposta", { tarefa: "T15" }),
    jogo: p("o ping pong com o robô", "decidido", { como: { t: "pingpong" }, tarefa: "T15 (o jetpack e o skate)" }),
    abre: ["ginasio"], recompensa: { guitar: "sexta", batida: "sexta", neon: PAGA.missao.drew }, requer: ["oficina"],
  },
  mubarak: {
    id: "mubarak", n: 6, onde: "cidade", quem: "Mubarak", cor: "#ffc857", faixa: "copo", faixaSituacao: "decidido",
    lugar: { lugar: "palco-copo" }, pedido: "ele quer te mostrar um disco antigo", apresenta: "comprar um disco",
    arte: p("apreciar um disco antigo", "decidido", { tarefa: "T16" }),
    jogo: p("uma sinuca, no nível do 8 Ball Pool", "decidido", { tarefa: "T16", existe: "página de teste do T17" }),
    abre: ["loja-discos"], recompensa: { guitar: "copo", batida: "copo", neon: PAGA.missao.mubarak }, requer: ["oficina"],
  },
  xeriff: {
    id: "xeriff", n: 7, onde: "cidade", quem: "Xeriff", cor: "#c9d3e6", faixa: null, faixaSituacao: "em aberto",
    lugar: { lugar: "plataforma" }, pedido: "a polícia fala numa frequência que ninguém pega", apresenta: "sintonizar a frequência da polícia",
    arte: p("gravar a vinheta da rádio pirata", "proposta", { tarefa: "T18" }),
    jogo: p("sintonizar a frequência da polícia", "decidido", { como: { t: "prova", id: "sintonia" }, tarefa: "T18" }),
    abre: ["radio-frequencias"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.xeriff }, requer: ["lu2ca"],
  },
  lu2ca: {
    id: "lu2ca", n: 8, onde: "cidade", quem: "LU2CA", cor: "#e0ff4f", faixa: "nectar", faixaSituacao: "decidido",
    lugar: { lugar: "palco-nectar" }, pedido: "tem um palco esperando alguém subir", apresenta: "tocar uma faixa ao vivo no Guitar Driver",
    arte: p("escrever a letra", "proposta", { tarefa: "T19" }),
    jogo: p("tocar ao vivo no Guitar Driver", "decidido", { como: { t: "show", faixa: "nectar" }, tarefa: "T19" }),
    abre: ["shows-live"], recompensa: { guitar: null, batida: "nectar", neon: PAGA.missao.lu2ca }, requer: ["oficina"],
  },
  ella: {
    id: "ella", n: 9, onde: "cidade", quem: "Ella", cor: "#4fc3ff", faixa: "chuva", faixaSituacao: "decidido",
    lugar: { lugar: "escondido" }, pedido: "ela pinta, mas ninguém vê", apresenta: "pintar e expor um quadro",
    arte: p("pintar e expor um quadro", "decidido", { tarefa: "T22", existe: "/galeria/pintar" }),
    jogo: p("o jogo da Ella", "em aberto", { tarefa: "T22" }),
    abre: ["galeria"], recompensa: { guitar: "chuva", batida: "chuva", neon: PAGA.missao.ella }, requer: ["oficina"],
  },
  notti: {
    id: "notti", n: 10, onde: "cidade", quem: "Notti", cor: "#5dffa0", faixa: "dopamina", faixaSituacao: "decidido",
    lugar: { lugar: "topo" }, pedido: "o fliperama apagou. ninguém joga mais nada", apresenta: "uma máquina do fliperama",
    arte: p("a trilha de 8 bits da máquina, no BATIDA", "proposta", { tarefa: "T23" }),
    jogo: p("uma máquina do fliperama", "decidido", { como: { t: "prova", id: "respira" }, tarefa: "T23" }),
    abre: ["fliperama"], recompensa: { guitar: "dopamina", batida: "dopamina", neon: PAGA.missao.notti }, requer: ["oficina"],
  },
  nizzy: {
    id: "nizzy", n: 11, onde: "cidade", quem: "Nizzy", cor: "#ff2436", faixa: "rollercoaster", faixaSituacao: "decidido",
    lugar: { lugar: "palco-rollercoaster" }, pedido: "a montanha-russa parou no meio", apresenta: "a montanha-russa",
    arte: p("filmar o clipe vertical da Rollercoaster", "proposta", { tarefa: "T24" }),
    jogo: p("andar na montanha-russa (no parque)", "decidido", { como: { t: "evento", evento: "montanha", n: 1 }, tarefa: "T24" }),
    abre: ["parque"], recompensa: { guitar: "rollercoaster", batida: "rollercoaster", neon: PAGA.missao.nizzy }, requer: ["oficina"],
  },
  tony: {
    id: "tony", n: 12, onde: "cidade", quem: "Tony Gordo", cor: "#ff3fb0", faixa: "swav", faixaSituacao: "decidido",
    lugar: { lugar: "palco-swav" }, pedido: "tudo aqui em cima tem gosto de nada", apresenta: "regar a horta atrás do restaurante",
    arte: p("cozinhar um prato com o que nasceu", "proposta", { tarefa: "T25" }),
    jogo: p("regar a horta atrás do restaurante", "decidido", { tarefa: "T25", existe: "as flores da pista (de patins)" }),
    abre: ["canteiros"], recompensa: { guitar: "swav", batida: "swav", neon: PAGA.missao.tony }, requer: ["oficina"],
  },
  // ── a 13ª ──
  final: {
    id: "final", n: 13, onde: "cidade", quem: "os nove e a D-Bee", cor: "#ffffff", faixa: null, faixaSituacao: "decidido",
    lugar: { lugar: "casa-dbee" }, pedido: "os nove nos seus pontos", apresenta: "os nove nos pontos e a D-Bee chegando pra acionar o CHUVA",
    arte: p("a música da D-Bee, o sinal dos nove", "proposta", { tarefa: "T29" }),
    jogo: p("o CHUVA", "decidido", { tarefa: "T29" }),
    abre: ["mundo-depois"], recompensa: { guitar: null, batida: null, neon: 0 }, requer: ["quadra", "tuneis", "drew", "mubarak", "xeriff", "lu2ca", "ella", "notti", "nizzy", "tony"],
  },
}
export const IDS13 = Object.keys(MISSOES13) as MissaoId[]
export const ehMissao13 = (id: string | null | undefined): id is MissaoId => !!id && id in MISSOES13

// save antigo (ou link ?parte=missao.sexta): a missão pegada era a faixa
export function normalizarMissao(id: string | null | undefined): MissaoId | null {
  if (!id) return null
  if (ehMissao13(id)) return id
  return IDS13.find((m) => MISSOES13[m].faixa === id) ?? null
}

// ── o progresso (fica em save.disco: passos13, feitas13, portas, guitar, batida, conta13) ──
export type Passo = "arte" | "jogo" | "porta"
export const emBreve = (pc: Peca) => !pc.como
const chave = (id: MissaoId, qual: "arte" | "jogo") => `${id}:${qual}`
// as duas do começo contam como feitas quando a história já passou delas (save
// de antes do T02, ou um link ?parte= que começa depois)
const DEPOIS_DA_DBEE = ["bar", "oficina", "subir", "nectar", "carreira", "livre"]
const DEPOIS_DA_OFICINA = ["subir", "nectar", "carreira", "livre"]
export const feita13 = (h: HistoriaDisco, id: MissaoId) =>
  (h.feitas13 ?? []).includes(id) || (id === "dbee" && DEPOIS_DA_DBEE.includes(h.fase)) || (id === "oficina" && DEPOIS_DA_OFICINA.includes(h.fase))
export const pecaFeita = (h: HistoriaDisco, id: MissaoId, qual: "arte" | "jogo") => (h.passos13 ?? []).includes(chave(id, qual))

// em que passo a missão está (null = feita). A peça "em breve" não trava: passa
export function passoAgora(h: HistoriaDisco, id: MissaoId): Passo | null {
  if (feita13(h, id)) return null
  const m = MISSOES13[id]
  for (const qual of ["arte", "jogo"] as const) if (!emBreve(m[qual]) && !pecaFeita(h, id, qual)) return qual
  return "porta"
}

export type EstadoPasso = "feita" | "agora" | "depois" | "em breve"
// a checklist (o anel do holo, o painel da missão): arte, jogo e a porta
export function checklist13(h: HistoriaDisco, id: MissaoId): { nome: string; estado: EstadoPasso }[] {
  const m = MISSOES13[id]
  const agora = passoAgora(h, id)
  const estado = (qual: Passo): EstadoPasso => {
    if (agora === null) return "feita"
    if (qual !== "porta" && emBreve(m[qual])) return "em breve"
    if (qual !== "porta" && pecaFeita(h, id, qual)) return "feita"
    return qual === agora ? "agora" : "depois"
  }
  return [
    { nome: `a arte · ${m.arte.nome}`, estado: estado("arte") },
    { nome: `o jogo · ${m.jogo.nome}`, estado: estado("jogo") },
    { nome: `a porta · ${m.abre.map((a) => PORTAS[a].nome).join(" e ")}`, estado: estado("porta") },
  ]
}

// pra onde ir agora: o lugar da missão (a peça e a porta acontecem lá), ou
// nenhum (a peça é na rua, em qualquer lugar: a montanha-russa, as flores)
export function alvo13(h: HistoriaDisco, id: MissaoId): Missao13["lugar"] | null {
  const agora = passoAgora(h, id)
  if (!agora) return null
  if (agora !== "porta" && MISSOES13[id][agora].como?.t === "evento") return null
  return MISSOES13[id].lugar
}

// a peça de agora (a page.tsx abre o jogo dela)
export function pecaAgora13(h: HistoriaDisco, id: MissaoId): { qual: "arte" | "jogo"; peca: Peca } | null {
  const agora = passoAgora(h, id)
  return agora && agora !== "porta" ? { qual: agora, peca: MISSOES13[id][agora] } : null
}

export function concluir(h: HistoriaDisco, id: MissaoId, qual: "arte" | "jogo"): HistoriaDisco {
  return pecaFeita(h, id, qual) ? h : { ...h, passos13: [...(h.passos13 ?? []), chave(id, qual)] }
}

// um evento da rua (a montanha-russa, uma flor regada): conta pra peça de agora
// da missão pegada; completou, a peça fica feita
export function contarEvento(h: HistoriaDisco, evento: "montanha" | "flor"): HistoriaDisco {
  const id = normalizarMissao(h.missao)
  const pc = id ? pecaAgora13(h, id) : null
  if (!id || !pc || pc.peca.como?.t !== "evento" || pc.peca.como.evento !== evento) return h
  const k = chave(id, pc.qual)
  const n = (h.conta13?.[k] ?? 0) + 1
  const h2 = { ...h, conta13: { ...(h.conta13 ?? {}), [k]: n } }
  return n >= pc.peca.como.n ? concluir(h2, id, pc.qual) : h2
}

// ── a porta abre: a missão fica feita e a recompensa entra no save ──
export interface Recompensa13 {
  missao: MissaoId
  quem: string
  cor: string
  apresenta: string
  abriu: { id: PortaId; nome: string; emBreve: boolean }[]
  guitar: { faixa: PistaId; nome: string } | null
  batida: { faixa: string; nome: string } | null
  neon: number
}
export function recompensaDe(id: MissaoId): Recompensa13 {
  const m = MISSOES13[id]
  const nomeFaixa = (f: string) => PISTAS.find((x) => x.id === f)?.faixa ?? f
  return {
    missao: id, quem: m.quem, cor: m.cor, apresenta: m.apresenta,
    abriu: m.abre.map((a) => ({ id: a, nome: PORTAS[a].nome, emBreve: !PORTAS[a].existe })),
    guitar: m.recompensa.guitar ? { faixa: m.recompensa.guitar, nome: nomeFaixa(m.recompensa.guitar) } : null,
    batida: m.recompensa.batida ? { faixa: m.recompensa.batida, nome: nomeFaixa(m.recompensa.batida) } : null,
    neon: m.recompensa.neon,
  }
}
export function abrirPorta(h: HistoriaDisco, id: MissaoId): HistoriaDisco {
  if (feita13(h, id)) return h
  const m = MISSOES13[id]
  const uniq = <T,>(a: T[]) => [...new Set(a)]
  return {
    ...h,
    feitas13: [...(h.feitas13 ?? []), id],
    portas: uniq([...(h.portas ?? []), ...m.abre]),
    guitar: m.recompensa.guitar ? uniq([...(h.guitar ?? []), m.recompensa.guitar]) : h.guitar,
    batida: m.recompensa.batida ? uniq([...(h.batida ?? []), m.recompensa.batida]) : h.batida,
    missao: normalizarMissao(h.missao) === id ? undefined : h.missao,
  }
}
export const portaAberta = (h: HistoriaDisco, porta: PortaId) => (h.portas ?? []).includes(porta)

// save de antes do T02: a faixa da cidade já feita (o objeto dela no save) conta
// como a missão feita (senão a pista fica "feita" e a missão nunca aparece)
export function sincronizar(h: HistoriaDisco, objetos: readonly string[]): HistoriaDisco {
  const faltam = IDS13.filter((id) => MISSOES13[id].onde === "cidade" && MISSOES13[id].faixa && objetos.includes(MISSOES13[id].faixa!) && !(h.feitas13 ?? []).includes(id))
  return faltam.length ? { ...h, feitas13: [...(h.feitas13 ?? []), ...faltam] } : h
}

// ── a feira: as missões que dá pra pegar agora ──
export function disponiveis(h: HistoriaDisco, luz: Record<string, Luz> | null): MissaoId[] {
  return IDS13.filter((id) => {
    const m = MISSOES13[id]
    if (m.prologo || feita13(h, id)) return false
    if (!m.requer.every((r) => feita13(h, r))) return false
    if (CONFIG13.soComPistaAcesa && m.onde === "cidade" && m.faixa && luz) {
      const nome = PISTAS.find((x) => x.id === m.faixa)?.faixa
      if (nome && luz[nome] !== "aberta") return false
    }
    return true
  })
}
export interface Oferta13 { id: MissaoId; quem: string; leva: string; cor: string; faixa: PistaId | null; pedido: string; primeiro: string; feitas: number; total: number }
export function ofertas13(h: HistoriaDisco, ids: MissaoId[]): Oferta13[] {
  return ids.map((id) => {
    const m = MISSOES13[id]
    const passos = checklist13(h, id)
    const prox = passos.find((x) => x.estado === "agora") ?? passos[passos.length - 1]
    const leva = m.faixa ? `à ${PISTAS.find((x) => x.id === m.faixa)?.faixa}` : m.onde === "suburbio" ? "ao subúrbio" : "à cidade"
    return { id, quem: m.quem, leva, cor: m.cor, faixa: m.faixa, pedido: m.pedido, primeiro: prox.nome, feitas: passos.filter((x) => x.estado === "feita").length, total: passos.length }
  })
}

// ── o Guitar Driver na rua: as músicas liberadas ──
export function musicasDoGuitar(h: HistoriaDisco): PistaId[] {
  const tem = new Set<string>([...CONFIG13.musicasDoInicio, ...(h.guitar ?? [])])
  return PISTAS.map((x) => x.id).filter((x) => tem.has(x))
}
// quem libera cada música (pra mostrar o cadeado: "abre na missão de X")
export function quemLibera(faixa: PistaId): MissaoId | null {
  return IDS13.find((id) => MISSOES13[id].recompensa.guitar === faixa) ?? null
}
