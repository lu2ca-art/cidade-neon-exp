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

export type FaseDisco = "minhoca" | "casa" | "dunas" | "bar" | "nectar" | "carreira" | "livre"
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
  // o show que está pra acontecer (B8): o fim de cada missão (o prólogo: "bar")
  show?: string
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
export const FALAS_DUNAS: { quando: "inicio" | "drift" | "voo" | "turbo" | "cidade" | "perto" | "robo"; de: string; texto: string }[] = [
  { quando: "inicio", de: "D-Bee", texto: "não tem estrada daqui até lá. nunca teve" },
  { quando: "inicio", de: "D-Bee", texto: "a cidade é pra lá. as luzes, tá vendo?" },
  { quando: "drift", de: "D-Bee", texto: "areia solta. vira e solta o carro de lado, ele escorrega. isso enche o turbo" },
  { quando: "turbo", de: "D-Bee", texto: "turbo cheio. usa" },
  { quando: "voo", de: "D-Bee", texto: "a kombi voa. segura o espaço. no ar ela também enche o turbo" },
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

// ── A OFICINA (a Nectar, LU2CA 19–20/10): o segundo II. A Kombi vira solar +
// turbo, e isso custa TODA a água coletada até ali. RASCUNHO ──
export const CENA_OFICINA: Cena = {
  lugar: "oficina",
  titulo: "a oficina",
  missao: "nectar",
  passos: [
    { t: "acao", texto: "a kombi entra no elevador da oficina tossindo. o mecânico nem levanta a cabeça" },
    { t: "fala", de: "o mecânico", texto: "gasolina? em que ano vc tá vivendo" },
    { t: "fala", de: "o mecânico", texto: "dá pra pôr painel no teto. e um turbo que bebe sol" },
    { t: "fala", de: "o mecânico", texto: "mas aqui ninguém paga com neon. é água. toda a que vc tiver" },
    {
      t: "escolha",
      opcoes: [
        { label: "toda?", tom: "dormindo", resposta: [{ de: "o mecânico", texto: "toda. água é a única coisa que vale alguma coisa aqui" }] },
        { label: "fechado", tom: "acordando", resposta: [{ de: "o mecânico", texto: "gostei de vc" }] },
        { label: "e se eu precisar de água depois?", tom: "acordado", resposta: [{ de: "o mecânico", texto: "rega umas flores. a água volta. sempre volta" }] },
      ],
    },
    { t: "acao", texto: "duas horas de solda, faísca e rádio velho. o painel sobe no teto. o motor para de tossir" },
    { t: "ganha", titulo: "sistema solar + turbo", texto: "a kombi não bebe mais gasolina. o sol carrega, o drift e o voo enchem o turbo" },
    { t: "fala", de: "o mecânico", texto: "agora toca alguma coisa pra gente. ninguém toca aqui faz tempo" },
    { t: "fim" },
  ],
}
