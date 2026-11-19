// A INTRODUÇÃO DE CADA MISSÃO (trilha sonora, 05/11; bíblia 9: "nenhum jogo surge
// do nada: cada missão tem uma introdução, no mundo e sem tela preta").
//
// Antes da peça abrir, quem pede a missão (ou a D-Bee, a narradora) fala 1–2
// frases num balão, por cima do mundo, com a música tocando: o porquê, ligado ao
// que a faixa daquela missão traz. Toque pra começar.
//
//   texto → antes da PRIMEIRA peça da missão (na sessão)
//   segue → antes da segunda peça (curtinho; sem ele, abre direto)
//
// TUDO AQUI É RASCUNHO do Claude, pro dono reescrever. Regras do texto: curto,
// gíria leve, sem explicar regra de jogo. Missão sem entrada aqui = sem
// introdução (abre direto, como antes). A D-Bee e a oficina são a própria
// história (casa, dunas, oficina) e não passam por aqui; a Nizzy só passa pelo
// clipe (a montanha-russa é um evento na rua).

import type { MissaoId } from "./portas"

export interface IntroMissao {
  /** quem fala (o nome no balão) */
  quem: string
  /** antes da primeira peça: o porquê, ligado à faixa */
  texto: string
  /** antes da segunda peça (opcional) */
  segue?: string
}

export const INTRO_MISSOES: Partial<Record<MissaoId, IntroMissao>> = {
  // Sabe Ontem? · o tempo que passou, a saudade do que lotava
  quadra: {
    quem: "Alohan",
    texto: "essa quadra lotava. ontem, sabe? a gente achava que ia durar pra sempre. hoje só sobrou o eco. bora fazer um som pra galera voltar",
    segue: "a galera voltou. agora mostra que ainda tem jogo aqui",
  },
  // (sem faixa) os túneis · as escolhas: o caminho é de quem anda
  tuneis: {
    quem: "D-Bee",
    texto: "embaixo das raízes ninguém te empurra e ninguém te segura. cada um escolhe o caminho. deixa o seu nome na parede",
    segue: "agora corre. o caminho que você escolheu é só seu",
  },
  // Sexta-Feira · o público, o espelho, a solidão de se arrumar pra ninguém
  drew: {
    quem: "Drew",
    texto: "sexta e eu em casa de novo, me arrumando pro espelho. ele sempre gosta. me ajuda a montar um look que dê vontade de sair",
    // (09/11, RASCUNHO, o povo: episodios.md)
    segue: "agora sem medo. quem tem medo fica sozinho. e sozinho ninguém derruba o Núcleo",
  },
  // Copo Americano · o vício, o loop do copo que nunca esvazia
  mubarak: {
    quem: "Mubarak",
    texto: "aqui o copo nunca fica vazio, repara. é o loop. senta. hoje quem escolhe o som é você: um disco antigo, de quando a gente ouvia de verdade",
    segue: "uma partida. só uma. a gente sabe parar, né?",
  },
  // (sem faixa) a frequência da polícia · a confiança
  xeriff: {
    quem: "Xeriff",
    texto: "na plataforma ninguém confia em ninguém. nem em mim. bate uma bola comigo que eu vejo se dá pra confiar em você",
    segue: "agora pega a frequência deles. quem escuta tudo, sabe tudo",
  },
  // Nectar · o que faz a gente voltar a florir (as flores, o propósito)
  lu2ca: {
    quem: "LU2CA",
    texto: "esse palco tá vazio faz tempo. a Nectar é sobre o que te faz florir de novo. antes de subir, escreve o seu",
    // (09/11, RASCUNHO, o povo) o último show: era o que faltava, o povo junto
    segue: "sobe. o povo todo junto. é assim que a gente derruba o Núcleo",
  },
  // CHUVA · a coragem de mostrar (a confiança em si)
  ella: {
    quem: "Ella",
    texto: "eu pinto, mas ninguém vê. a CHUVA é sobre ter coragem de mostrar. entra. só não repara na bagunça",
    // (09/11, RASCUNHO, o povo)
    segue: "quanto mais gente junto, menos os robôs mandam…",
  },
  // DopaminA · o vício na tela, a recompensa rápida
  notti: {
    quem: "Notti",
    texto: "o fliperama apagou e ninguém percebeu: tá todo mundo preso na tela de casa. dopamina de bolso. me ajuda a acordar essas máquinas",
    segue: "agora joga. uma ficha só. (ninguém joga uma só)",
  },
  // Rollercoaster · os altos e baixos
  nizzy: {
    quem: "Nizzy",
    texto: "a montanha-russa parou bem no meio. a vida também para, às vezes. o sobe e desce é a Rollercoaster. filma comigo?",
  },
  // Swav · o tempo das coisas: plantar, esperar, provar
  tony: {
    quem: "Tony Gordo",
    texto: "quatro sacos: cogumelo, pimentão colorido, abobrinha e cenoura. o dinheiro dá pra um. chora o preço com o feirante",
    segue: "tá tudo no saco. agora cozinha devagar. sem pressa é que fica bom",
  },
}

/** a fala de agora: a primeira (texto) ou a da segunda peça (segue); null = sem introdução */
export function introDe(id: MissaoId, jaViu: boolean): { quem: string; texto: string } | null {
  const i = INTRO_MISSOES[id]
  if (!i) return null
  if (!jaViu) return { quem: i.quem, texto: i.texto }
  return i.segue ? { quem: i.quem, texto: i.segue } : null
}
