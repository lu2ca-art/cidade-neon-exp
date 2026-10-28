// A HISTÓRIA DO MAPA-DISCO (LU2CA 19–20/10): a nova narrativa, do buraco de
// minhoca até a carreira. Decisões: ~/vault/projetos/cidade-neon/mapa-disco-decisoes.md
// ("19/10 noite (4): O COMEÇO" e "20/10 (4): o prólogo, a Nectar").
//
//   minhoca → o hyperlapse dentro do buraco de minhoca, até cair no deserto
//   casa    → a Kombi caiu no deserto: a casinha no meio do nada, a D-Bee
//             (ela esperava ele; sabe de viagem no tempo pelos livros antigos)
//             e o HOLO, que ele ganha ali (antes disso o holo não existe)
//   dunas   → sem estrada até a cidade: o drift e o voo (que rendem turbo),
//             o disco antigo tocando, os robôs no caminho; chegar = pousar
//             numa pista
//   bar     → o PRÓLOGO: a moça do bar oferece o copo (o loop); recusou, ela
//             manda ele cantar ("ninguém sobe naquele palco há anos"): o show
//   nectar  → a missão 1: a Kombi quebra, regar de patins, o galão no posto,
//             a oficina (solar + turbo = toda a água), o show, as flores
//   carreira→ depois da Nectar: as pistas que acendem (os atos), as 4 peças
//   livre   → quem já jogava antes da história nova: segue de onde estava
//
// Tudo que é fala aqui é RASCUNHO (o LU2CA reescreve).

import type { Save } from "../estado"
import type { MissaoId, PortaId } from "./portas"

export type FaseDisco = "minhoca" | "casa" | "dunas" | "bar" | "oficina" | "subir" | "nectar" | "carreira" | "livre"
// os passos da Nectar (B9)
export type PassoNectar = "quebra" | "regar" | "galao" | "oficina" | "show" | "flores" | "feita"

export type Manchete = { id: number; missao: string; titulo: string; linha: string; pop: number; neon: number; modo: "tocar" | "cantar"; nota: number; publico: number }

export interface HistoriaDisco {
  fase: FaseDisco
  // o holo (o celular novo): antes de a D-Bee dar, ele não existe
  holo: boolean
  // a Nectar: em que passo está, e o que já foi feito
  nectar?: PassoNectar
  // os shows feitos (a carreira) e as manchetes do jornal
  shows?: Manchete[]
  // as flores regadas (B9: quanto mais flores, mais água aparece) e quantas
  // tinha quando o passo de regar começou
  flores?: number
  floresIni?: number
  // as compras com água na oficina (B10: o que é tecnologia)
  mods?: string[]
  // robôs espatifados (B12)
  robos?: number
  // (B11) as peças das missões já feitas ("sexta:pingpong")
  pecas?: string[]
  // (21/10, a feira) a missão que ele pegou (a linha); sem ela, a feira oferece as acesas
  missao?: string
  // o show que está pra acontecer: (T02) não é mais o fim da missão. É o Guitar
  // Driver aberto agora: "rua:<faixa>" (a oportunidade na rua) ou
  // "missao:<id>" (a peça de uma missão que é tocar ao vivo, a do LU2CA) ou
  // (T20) "palco:<palco>:<faixa>" (um palco da carreira, disco/palcos.ts)
  show?: string
  // (27/10) o drone GPS da D-Bee: ela dá nas dunas (a subida mostrada uma vez só)
  drone?: boolean
  // (T02, 28/10) as 13 missões (disco/portas.ts): `missao` passa a ser o id da
  // missão (dbee, drew…); as peças feitas ("drew:jogo"), as missões feitas, as
  // portas abertas, as músicas liberadas no Guitar Driver, as referências do
  // BATIDA e a contagem das peças de rua ("nizzy:jogo" → 1)
  passos13?: string[]
  feitas13?: MissaoId[]
  portas?: PortaId[]
  guitar?: string[]
  batida?: string[]
  conta13?: Record<string, number>
  // (T19) a peça de escrever aberta agora ("lu2ca:arte"; fica no save: recarregar
  // não perde) e as letras escritas por faixa (aparecem no show, no cantar)
  aberta13?: string
  letras?: Record<string, string[]>
  // (T15–T25, T16) o que cada arte deixou ("nizzy:arte" → os cortes do clipe;
  // "tony:arte" → o prato; "xeriff:arte" → a vinheta…)
  obras13?: Record<string, string[]>
  // (T09) a missão da oficina (disco/oficina.ts): a cena vista, o painel achado
  // e o tanque do motor (as gotas da goteira); a água que a D-Bee deu (uma vez)
  oficina?: { cena?: true; painel?: true; tanque?: number }
  aguaDbee?: true
  // (T20) os palcos como Guitar Hero (disco/palcos.ts): a melhor estrela (1–5)
  // de cada música em cada palco ("bar:copo" → 3). A soma abre o palco de cima
  palcos?: Record<string, number>
}

export const INICIO: HistoriaDisco = { fase: "minhoca", holo: false }

// a história de quem está jogando: save novo começa no buraco de minhoca; quem
// já jogava (já passou pela casa, já tem missão) segue livre, com o holo
export function historiaDe(s: Save): HistoriaDisco {
  if (s.disco) return s.disco
  const jaJogava = !!s.casa || !!s.estacao || s.objetos.length > 0 || s.completos.length > 0
  return jaJogava ? { fase: "livre", holo: true } : INICIO
}
export const comHistoria = (s: Save, f: (h: HistoriaDisco) => HistoriaDisco): Save => ({ ...s, disco: f(historiaDe(s)) })
// a história nova está mandando (o resto da narrativa antiga fica quieto)
export const historiaAtiva = (h: HistoriaDisco) => h.fase !== "livre"

// ── onde fica cada coisa do começo (o deserto) ──
// a cidade cabe num raio de ~1,3 km; a casa da D-Bee, longe dela, pro lado da
// torre da Nectar (a primeira pista acesa fica no caminho)
export const CASA = { x: -1980, z: -1740 }
// onde a Kombi cai (uns 230 m antes da casa, de frente pra ela)
export const QUEDA = { x: -2140, z: -1900, rumo: Math.atan2(CASA.x - -2140, CASA.z - -1900) }
// a travessia: depois da casa, a Kombi sai de frente pra cidade
export const SAIDA_CASA = { x: -1930, z: -1690, rumo: Math.atan2(0 - -1930, 0 - -1690) }
export const RAIO_CASA = 26 // chegou na porta

// ── as falas do caminho (o rádio, curtas; nada de frase explicando na tela) ──
// as dunas: a D-Bee pelo rádio, ensinando sem manual (RASCUNHO)
// (LU2CA 22/10 (2)) ensina: a fala ensina controle; no disco ela sai só como aviso
// na rádio do holo + a legendinha mini (Corrida: ensinar)
export const FALAS_DUNAS: { quando: "inicio" | "drift" | "voo" | "turbo" | "cidade" | "perto" | "robo"; de: string; texto: string; ensina?: true }[] = [
  { quando: "inicio", de: "D-Bee", texto: "não tem estrada daqui até lá. nunca teve" },
  { quando: "inicio", de: "D-Bee", texto: "a cidade é pra lá. as luzes, tá vendo?" },
  { quando: "drift", de: "D-Bee", texto: "areia solta. vira e solta o carro de lado, ele escorrega. isso enche o turbo", ensina: true },
  { quando: "turbo", de: "D-Bee", texto: "turbo cheio. usa", ensina: true },
  { quando: "voo", de: "D-Bee", texto: "a kombi voa. segura o espaço. no ar ela também enche o turbo", ensina: true },
  { quando: "robo", de: "D-Bee", texto: "as máquinas descem até aqui. pode passar por cima. elas não sentem nada" },
  { quando: "cidade", de: "D-Bee", texto: "a cidade não tem entrada pelo chão. as pistas são lá em cima. voa" },
  { quando: "perto", de: "D-Bee", texto: "pousa numa pista acesa. as apagadas ninguém usa faz tempo" },
]

// ── a cena da casa (a D-Bee dá o holo) — RASCUNHO ──
// (cenas.ts: o formato das cenas dos lugares; aqui fica a do disco)
export const FALAS_CASA = {
  chegada: "uma casinha no meio do nada. a luz acesa. a porta já tá aberta",
  dentro: "lá dentro, instrumentos pendurados na parede. tambores num tapete no chão",
}

// a cor de cada linha (a do desenho do LU2CA, polvo-desenho.json)
export const COR_PISTA: Record<string, string> = {
  "Sabe Ontem?": "#ff6a35", "Copo Americano": "#ffc857", Swav: "#ff3fb0", "Sexta-Feira": "#6d7bff", Rollercoaster: "#ff2436",
  DopaminA: "#5dffa0", CHUVA: "#4fc3ff", "Ojalá": "#b38cff", Nectar: "#e0ff4f",
}
// os monumentos dos atos (Monumentos.tsx): o objeto da faixa fixa de cada ato
export const MONUMENTO = ["o violão", "a camisa", "o caderno"]

// ── A CENA DA CASA (LU2CA 19/10): ela esperava ele e não explica; sabe de
// viagem no tempo pelos livros antigos (por isso não se assusta); cansou da
// cidade e se mudou pro deserto; guardou tecnologias dos velhos tempos; os dois
// se conectam nos tambores; ela dá o HOLO. Tudo RASCUNHO ──
import type { Cena } from "../cenas"
export const CENA_CASA_DISCO: Cena = {
  lugar: "casa-dbee",
  titulo: "a casinha no meio do nada",
  missao: "ojala",
  passos: [
    { t: "acao", texto: FALAS_CASA.chegada },
    { t: "acao", texto: FALAS_CASA.dentro },
    { t: "fala", de: "D-Bee", texto: "demorou" },
    { t: "fala", de: "D-Bee", texto: "eu tava te esperando" },
    {
      t: "escolha",
      opcoes: [
        { label: "esperando? como assim", tom: "dormindo", resposta: [{ de: "D-Bee", texto: "senta. depois vc entende" }] },
        { label: "onde eu tô?", tom: "acordando", resposta: [{ de: "D-Bee", texto: "no deserto. a cidade é pra lá. ela não é mais o que era" }] },
        { label: "quem é você?", tom: "acordado", resposta: [{ de: "D-Bee", texto: "d-bee. vc vai ouvir muito esse nome" }] },
      ],
    },
    { t: "fala", de: "D-Bee", texto: "vc veio de outro tempo. dá pra ver pela kombi" },
    { t: "acao", texto: "ela não se assusta. aponta a estante: livros velhos, as lombadas gastas de tanto abrir" },
    { t: "fala", de: "D-Bee", texto: "eu li sobre gente como vc. viajante não assusta quem lê" },
    { t: "fala", de: "D-Bee", texto: "eu morava lá. cansei. a cidade virou das máquinas" },
    { t: "acao", texto: "ela senta no tapete e bate de leve num tambor. olha pra você" },
    { t: "gesto", id: "tambores" },
    { t: "acao", texto: "por um minuto, os dois tocam junto. a casa inteira treme" },
    { t: "fala", de: "D-Bee", texto: "é. vc é quem eu achei que era" },
    { t: "fala", de: "D-Bee", texto: "guardei umas coisas dos velhos tempos. pra vc é tudo novo" },
    { t: "acao", texto: "de uma caixa ela tira um aparelho pequeno, quase sem peso. liga. a luz sobe e fica parada no ar, na frente dos seus olhos" },
    { t: "ganha", titulo: "o holo", texto: "o celular de agora: a luz que fica no ar. música, mensagens, o mapa, tudo nele" },
    { t: "fala", de: "D-Bee", texto: "sem isso, lá na cidade, vc não existe" },
    { t: "fala", de: "D-Bee", texto: "não tem estrada daqui até lá. a kombi dá conta. eu falo com vc pelo rádio" },
    { t: "fim" },
  ],
}

// ── O PRÓLOGO: o bar (LU2CA 19–20/10). A moça do bar (a do copo: um jeito meio
// robô, muito sensata; é uma das máquinas conscientes, mas não revela) oferece
// o copo; beber = o loop (a noite volta); recusar e sair do loop: ela manda ele
// cantar, ninguém sobe naquele palco há anos. Depois, o show. RASCUNHO ──
export const CENA_BAR_PROLOGO: Cena = {
  lugar: "bar",
  titulo: "o bar · o prólogo",
  missao: "copo",
  passos: [
    { t: "acao", texto: "um bar pendurado na pista. o letreiro pisca pela metade. lá dentro, quase ninguém", volta: "nao" },
    { t: "acao", texto: "o bar. a mesma música, no mesmo trecho. a mesma moça no balcão", volta: "sim" },
    { t: "acao", texto: "atrás do balcão, uma moça. o cabelo perfeito demais. ela pisca devagar, sempre no mesmo tempo" },
    { t: "fala", de: "ela", texto: "boa noite. você não é daqui", volta: "nao" },
    { t: "fala", de: "ela", texto: "boa noite. de novo", volta: "sim" },
    { t: "fala", de: "ela", texto: "ninguém é daqui. senta" },
    { t: "fala", de: "ela", texto: "você tá cansado. tenho seis copos. cada um resolve uma coisa", volta: "nao" },
    { t: "fala", de: "ela", texto: "os seis ainda estão aqui. você sabe o que acontece quando bebe", volta: "sim" },
    { t: "gesto", id: "copos" },
    { t: "acao", texto: "ela inclina a cabeça. um segundo inteiro sem piscar" },
    { t: "fala", de: "ela", texto: "você recusou. faz tempo que ninguém recusa" },
    { t: "fala", de: "ela", texto: "então faz outra coisa" },
    { t: "acao", texto: "ela aponta o fundo do bar: um palco pequeno, o pedestal sem ninguém, poeira na caixa de som" },
    { t: "fala", de: "ela", texto: "ninguém sobe naquele palco há anos" },
    { t: "fala", de: "ela", texto: "vai cantar" },
    { t: "fim" },
  ],
}

// ── A OFICINA: (T09) a cena mora em disco/oficina.ts (CENA_OFICINA), com o
// mecânico provisório e configurável ──

// ── OS DOIS PERSONAGENS ROBÔS (LU2CA 19/10): ganchos, ainda sem cena (RASCUNHO) ──
// - a moça do bar: uma das máquinas que ganharam consciência. Não se revela;
//   o jogo só deixa pistas (pisca sempre no mesmo tempo, o cabelo perfeito
//   demais, "faz tempo que ninguém recusa"). Aparece no prólogo (CENA_BAR_PROLOGO)
// - o robô de verdade: ainda não aparece. Ideia de gancho: o robô do ping pong
//   da Sexta-Feira (disco/PingPong.tsx) é o primeiro a "piscar duas vezes" —
//   o que gosta de jogar. Mais pra frente: a batalha de robôs gigantes no deserto
export const ROBOS_PERSONAGENS = ["a moça do bar", "o robô do ping pong"] as const

// ── (LU2CA 21/10, B18) O COMEÇO DO MAPA: deserto → dunas → o lixão embaixo da
// cidade → o SUBÚRBIO, no chão, embaixo das pistas. Missão 1 = o bar (no
// subúrbio); missão 2 = a oficina (no subúrbio): o turbo e a propulsão solar,
// pra subir pra cidade (antes disso a Kombi não voa: não tem estrada que
// suba). As duas não abrem faixa do álbum. Depois, as 9 missões das faixas,
// umas na cidade e outras no subúrbio (ORDEM_LUGAR); depois, o mapa aberto ──
export const SUBURBIO = { x: -740, z: -680, r: 260 }
// os lugares do chão do subúrbio (longe das pistas e das torres)
export const CHAO_LUGARES = {
  bar: { x: -737, z: -675, nome: "O COPO", cor: "#ff6a35" },
  oficina: { x: -560, z: -626, nome: "OFICINA", cor: "#ff9000" },
  palco: { x: -891, z: -536, nome: "PALCO", cor: "#e0ff4f" },
  // (T02) as missões do subúrbio: a quadra do Alohan e a entrada dos túneis (RASCUNHO de onde ficam)
  quadra: { x: -860, z: -790, nome: "QUADRA", cor: "#ff6a35" },
  tuneis: { x: -610, z: -830, nome: "TÚNEIS", cor: "#9b8cff" },
  // (T09) os achados da missão da oficina: o painel solar velho no lixão (a mancha
  // de lixo a leste do subúrbio) e a goteira embaixo de uma pista. Só aparecem
  // (e só vão pro mapa) quando é a vez deles. RASCUNHO de onde ficam
  painel: { x: -360, z: -690, nome: "PAINEL", cor: "#4fc3ff" },
  goteira: { x: -620, z: -730, nome: "GOTEIRA", cor: "#4fc3ff" },
} as const
export type LugarChao = keyof typeof CHAO_LUGARES
// (T09) os que não são lugar (não têm fachada nem ponto fixo no mapa)
export const CHAO_ACHADOS: readonly LugarChao[] = ["painel", "goteira"]
export const CHAO_FIXOS = (Object.keys(CHAO_LUGARES) as LugarChao[]).filter((id) => !CHAO_ACHADOS.includes(id))
export const RAIO_CHAO = 22
// a missão n (3 a 11, as das faixas): na cidade (o palco da linha) ou no subúrbio (o palco do chão)
export const ORDEM_LUGAR: Record<number, "cidade" | "suburbio"> = { 3: "cidade", 4: "cidade", 5: "suburbio", 6: "cidade", 7: "cidade", 8: "suburbio", 9: "suburbio", 10: "cidade", 11: "cidade" }
// a Kombi ainda não voa (nem tem turbo): antes da oficina do subúrbio
export const semVoo = (h: HistoriaDisco | null | undefined) => !!h && (h.fase === "casa" || h.fase === "dunas" || h.fase === "bar" || h.fase === "oficina")

// as falas das dunas (B18): sem estrada, e a Kombi ainda não voa (RASCUNHO)
export const FALAS_DUNAS_SUB: typeof FALAS_DUNAS = [
  { quando: "inicio", de: "D-Bee", texto: "não tem estrada daqui até lá. nunca teve" },
  { quando: "inicio", de: "D-Bee", texto: "a cidade é pra lá. as luzes, tá vendo? lá em cima" },
  { quando: "drift", de: "D-Bee", texto: "areia solta. vira e solta o carro de lado, ele escorrega", ensina: true },
  { quando: "robo", de: "D-Bee", texto: "as máquinas descem até aqui. pode passar por cima. elas não sentem nada" },
  { quando: "cidade", de: "D-Bee", texto: "lá em cima não tem como subir. ainda. vai por baixo, pelo lixão" },
  { quando: "perto", de: "D-Bee", texto: "embaixo das pistas tem gente. o subúrbio. tem um bar lá. vai" },
]
