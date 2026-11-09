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
//   referência no BATIDA e um dinheiro (Água$). (T49, 30/10) E um instrumento
//   ancestral por missão com pessoa (disco/instrumentos.ts).
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
import type { LugarId } from "../lugares"
import type { ProvaId } from "../data"
import type { HistoriaDisco, LugarChao } from "./historia"
import { PAGA } from "../economia-rascunho"
import { INSTRUMENTOS_ANCESTRAIS, type InstrumentoId } from "./instrumentos"
import { episodioDaMissao, episodioDaMusica, missaoLiberada, musicasLiberadas, quemAbre, rotuloDoEpisodio, EPISODIOS } from "./episodios"

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
  // (T19) escrever a letra da faixa (disco/Letra.tsx; os versos em disco/letras.ts)
  | { t: "letra"; faixa: PistaId }
  // (T10) o B4TIDA aberto pra produzir um instrumental (disco/BatidaMissao.tsx); `clima` = a música de onde ele parte
  | { t: "batida"; clima: string }
  // (T10) o basquete do ginásio (app/ginasio/basquete.tsx): `pontos` pra passar em `tempo` segundos (senão joga de novo)
  | { t: "basquete"; pontos: number; tempo: number }
  // (ep. 3, 08/11) o esporte que a pessoa preferir: basquete (`pontos` em `tempo` s), ping pong ou ginástica (disco/EscolhaEsporte.tsx)
  | { t: "esporte"; pontos: number; tempo: number }
  // (T15–T25, T16) uma peça que abre por cima do jogo (disco/pecas/): a dança, a
  // vinheta, a trilha 8 bits, a máquina, o clipe, o prato, o disco
  // antigo, a sinuca. Os rascunhos de cada uma moram em disco/pecas/conf.ts
  | { t: "cena"; id: CenaId }
  // (09/11, ep. 5) a barganha na feira do Tony: no mundo, na banca (disco/FeiraTela.tsx e FeiraBanca.tsx)
  | { t: "feira" }
  // (bloco 1 · A3) chegar no lugar da missão já é a peça: o caminho de patins e
  // jetpack até o Drew (a Kombi no conserto). A page.tsx conclui ao chegar
  | { t: "chegar" }
  // (bloco 1 · A6) o grafite nas paredes das trincheiras: ligar os pontos assina o
  // desenho (disco/Grafite.tsx, o C3)
  | { t: "grafite" }
  // (T57) descer a rampa da boca do túnel: a corrida lá embaixo, nas trincheiras (disco/tuneis.ts)
  | { t: "trincheiras" }
  // (T22) entrar na casa da pessoa (uma sala em 3D, interior/salas/) e só sair
  // depois de passar por tudo: o diálogo, o que se observa, o que se faz, o som
  // (regra 9). Uma casa só joga as peças que apontam pra ela, juntas, numa cena
  | { t: "casa"; sala: SalaMissao }
  // (T29) o final: a sequência na casa da D-Bee (disco/final.ts, disco/FinalTela.tsx).
  // As duas peças do final apontam pra ela e ficam feitas juntas no fim
  | { t: "final" }

// (T22) as casas das missões (interior/registro.ts carrega cada uma)
export type SalaMissao = "galeria-ella"

export type CenaId = "moda" | "danca" | "vinheta" | "trilha8" | "maquina" | "clipe" | "cozinhar" | "disco-antigo" | "sinuca"

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
  quadra: { nome: "a quadra: basquete quando quiser", existe: true, tarefa: "T10" },
  "batida-estudio": { nome: "o BATIDA pra produzir mais", existe: true, tarefa: "T10" },
  // (T63) as trincheiras estão no jogo: descer a rampa da boca do túnel e correr quando quiser
  corridas: { nome: "as corridas nos túneis", existe: true, tarefa: "T63" },
  // (moto, 05/11) a moto: guardada na Kombi, anda no deserto, no subúrbio, nos
  // túneis e na cidade (a regra mora em estrada/zonas.ts, motoLiberada)
  motos: { nome: "a moto: guardada na Kombi", existe: true, tarefa: "T14" },
  ginasio: { nome: "o ginásio: basquete, ping pong e ginástica", existe: true, tarefa: "T15" },
  "loja-discos": { nome: "a loja de discos", existe: true, tarefa: "T16" },
  "radio-frequencias": { nome: "a rádio e as frequências", existe: true, tarefa: "T18" },
  "shows-live": { nome: "os palcos da cidade: subir até o alto das torres", existe: true, tarefa: "T20" },
  galeria: { nome: "a galeria", existe: true, tarefa: "T22" },
  fliperama: { nome: "as 7 máquinas do fliperama", existe: true, tarefa: "T23" },
  parque: { nome: "o parque", existe: true, tarefa: "T24" },
  canteiros: { nome: "os canteiros pela cidade", existe: true, tarefa: "T25" },
  // (06/11) existe: plantas nos prédios, o rio nas trincheiras e as cabines nas torres (docs/mundo-depois.md)
  "mundo-depois": { nome: "o mundo depois", existe: true, tarefa: "T29" },
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
  // (T49) `instrumento`: o instrumento ancestral que a pessoa dá (disco/instrumentos.ts)
  recompensa: { guitar: PistaId | null; batida: string | null; neon: number; instrumento: InstrumentoId | null }
  // só aparece depois destas (o resto da ordem é livre, pela feira)
  requer: MissaoId[]
  // feita pela história do começo (a casa e as dunas; a oficina): não vai pra feira
  prologo?: true
  // (T25) a ordem das peças, quando não é arte → jogo (o Tony: a feira
  // primeiro, depois cozinhar com o que levou)
  ordem?: ["jogo", "arte"]
}

// ── o que ainda é decisão do dono (troca aqui; o resto segue sozinho) ──
export const CONFIG13 = {
  // (08/11) as músicas que o Guitar Driver já tem no começo: nenhuma. Quem libera
  // cada música é o EPISÓDIO (disco/episodios.ts): o show do ep. 1 abre a Nectar
  musicasDoInicio: [] as PistaId[],
  // (T03) o Água$ de cada missão mora em economia-rascunho.ts (PAGA.missao)
  // (decidido 21/10, as torres) a missão da cidade só aparece com a pista
  // dela acesa (estrada/atos.ts): o mapa vai colorindo espalhado
  soComPistaAcesa: true,
  // (T15–T25, T16, 28/10) o que fica TRANCADO até a porta da missão abrir. Só no
  // jogo com história (o mapa-disco) e antes do fim (fase "livre" abre tudo).
  // Tirar uma porta daqui = o lugar volta a ficar aberto desde o começo
  trancar: ["ginasio", "radio-frequencias", "fliperama", "parque", "canteiros", "loja-discos"] as PortaId[],
  // (T15, decidido 28/10) na missão do Drew a Kombi está no conserto: vai de
  // patins (o jetpack é o jato das costas) até a casa dele; a Kombi volta quando a porta abre
  kombiNoConserto: ["drew"] as MissaoId[],
  // (T22, regra 5) a experiência nova nasce em teste: a casa destas missões só
  // joga com o link de teste (?parte=missao.ella); no mapa, até o dono aprovar,
  // a missão segue como antes (as peças "em breve", a porta direto). Aprovou:
  // tira daqui e ela entra no mapa
  // (bloco 1 · A7, 30/10) o dono decidiu o jogo da Ella: a casa dela entrou no mapa
  soNoTeste: [] as MissaoId[],
  // (bloco 1 · A6) o grafite dos túneis joga no mapa (o C3 pronto e a page.tsx
  // abrindo o Grafite.tsx: o lote D liga). Desligado, a arte dos túneis fica "em breve"
  grafiteNoMapa: true, // (lote D, 31/10) ligado: o Grafite.tsx do C3 está nas trincheiras
}

const p = (nome: string, situacao: Situacao, extra: Partial<Peca> = {}): Peca => ({ nome, situacao, ...extra })

export const MISSOES13: Record<MissaoId, Missao13> = {
  // ── o subúrbio (4) ──
  dbee: {
    id: "dbee", n: 1, onde: "suburbio", quem: "D-Bee", cor: "#3d7bff", faixa: "ojala", faixaSituacao: "proposta",
    lugar: { chao: "casa" }, pedido: "ela tava te esperando", apresenta: "tocar tambor junto com ela",
    arte: p("o tambor com a D-Bee", "decidido", { como: { t: "historia" }, tarefa: "T06" }),
    jogo: p("o drift e o holo: a travessia até o subúrbio", "decidido", { como: { t: "historia" }, tarefa: "T07" }),
    abre: ["holo", "violao"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.dbee, instrumento: "djembe" }, requer: [], prologo: true,
  },
  oficina: {
    id: "oficina", n: 2, onde: "suburbio", quem: "Mubarak", cor: "#ffc857", faixa: null, faixaSituacao: "em aberto",
    lugar: { chao: "oficina" }, pedido: "a kombi não sobe sem motor novo", apresenta: "montar o motor com o mecânico",
    // (T09) a fase "oficina" da história joga as duas (disco/oficina.ts). (T57) a arte
    // é catar o lixo espalhado no lixão (no mundo) e a oficina monta; o jogo, a goteira
    arte: p("a reciclagem: catar o lixo no lixão e virar tecnologia", "decidido", { como: { t: "historia" }, tarefa: "T09" }),
    jogo: p("a goteira: a água do motor", "decidido", { como: { t: "historia" }, tarefa: "T09" }),
    abre: ["kombi-melhorias"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.oficina, instrumento: "tambor-agua" }, requer: ["dbee"], prologo: true,
  },
  quadra: {
    id: "quadra", n: 3, onde: "suburbio", quem: "Alohan", cor: "#ff6a35", faixa: "ontem", faixaSituacao: "proposta",
    lugar: { chao: "ginasio" }, pedido: "o ginásio tá vazio. falta o beat", apresenta: "um beat a caminho do ginásio",
    arte: p("um instrumental no BATIDA pra galera", "decidido", { como: { t: "batida", clima: "copo" }, tarefa: "T10", existe: "/batida" }),
    jogo: p("o esporte que preferir: basquete, ping pong ou ginástica", "decidido", { como: { t: "esporte", pontos: 6, tempo: 45 }, tarefa: "T10", existe: "/ginasio" }),
    abre: ["quadra", "batida-estudio", "ginasio"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.quadra, instrumento: "udu" }, requer: ["oficina"],
  },
  tuneis: {
    id: "tuneis", n: 4, onde: "suburbio", quem: "os túneis", cor: "#9b8cff", faixa: null, faixaSituacao: "em aberto",
    lugar: { chao: "tuneis" }, pedido: "embaixo das raízes tem corrida", apresenta: "a corrida de BMX, patins ou skate nas trincheiras",
    // (bloco 1 · A6) o grafite nas paredes das trincheiras (disco/Grafite.tsx, o C3).
    // Joga no mapa com CONFIG13.grafiteNoMapa (ligado no lote D, 31/10)
    arte: p("o grafite: um gesto assina o desenho", "decidido", { como: { t: "grafite" }, tarefa: "T12", existe: "página de teste do T12" }),
    // (T57, T63) a boca do túnel no subúrbio leva às trincheiras (dentro do jogo); voltar com a volta feita conta
    jogo: p("a corrida de BMX, patins ou skate", "decidido", { como: { t: "trincheiras" }, tarefa: "T13", existe: "dentro do jogo, pela boca do túnel (T63)" }),
    abre: ["corridas", "motos"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.tuneis, instrumento: null }, requer: ["oficina"],
  },
  // ── a cidade (8) ──
  drew: {
    id: "drew", n: 5, onde: "cidade", quem: "Drew", cor: "#6d7bff", faixa: "sexta", faixaSituacao: "decidido",
    lugar: { lugar: "casa-drewboy" }, pedido: "sexta e eu em casa de novo", apresenta: "o jetpack, depois a moda",
    // (T15, bloco 1 · A3, 30/10) a arte é a moda sustentável e high fashion: montar
    // um look com as roupas recicladas do subúrbio (disco/pecas/Moda.tsx, conf.ts MODA)
    arte: p("montar um look com roupas recicladas: moda sustentável e high fashion", "decidido", { como: { t: "cena", id: "moda" }, tarefa: "T15" }),
    // o jogo é o caminho até ele, de patins e jetpack (a Kombi no conserto,
    // CONFIG13.kombiNoConserto); o ping pong foi pro Xeriff (A4)
    jogo: p("de patins e jetpack até a casa dele", "decidido", { como: { t: "chegar" }, tarefa: "T15" }),
    abre: [], recompensa: { guitar: null, batida: null, neon: PAGA.missao.drew, instrumento: "caxixi" }, requer: ["oficina"], ordem: ["jogo", "arte"],
  },
  // (08/11) a peça da loja de discos é do ep. 4 (Nizzy): o id fica (os saves guardam
  // "mubarak:arte"); quem apresenta é a Nizzy. A sinuca saiu daqui: é livre depois do ep. 1
  mubarak: {
    id: "mubarak", n: 6, onde: "suburbio", quem: "Nizzy", cor: "#ff2436", faixa: "copo", faixaSituacao: "decidido",
    lugar: { chao: "discos" }, pedido: "a loja de discos tem um disco antigo pra você", apresenta: "a loja de discos e as guitarras",
    arte: p("garimpar um disco antigo na loja", "decidido", { como: { t: "cena", id: "disco-antigo" }, tarefa: "T16" }),
    jogo: p("ir até a loja de discos", "decidido", { como: { t: "chegar" }, tarefa: "T16" }),
    abre: ["loja-discos"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.mubarak, instrumento: "sitar" }, requer: ["oficina"], ordem: ["jogo", "arte"],
  },
  xeriff: {
    id: "xeriff", n: 7, onde: "cidade", quem: "Xeriff", cor: "#c9d3e6", faixa: null, faixaSituacao: "em aberto",
    lugar: { lugar: "plataforma" }, pedido: "a polícia fala numa frequência que ninguém pega", apresenta: "sintonizar a frequência da polícia",
    // (T18, bloco 1 · A4, 30/10) a arte é a dos esportes: o ping pong com o robô
    // (disco/PingPong.tsx), que saiu do Drew. A vinheta fica fora do mapa
    arte: p("a arte dos esportes: o ping pong com o robô", "decidido", { como: { t: "pingpong" }, tarefa: "T18" }),
    jogo: p("sintonizar a frequência da polícia", "decidido", { como: { t: "prova", id: "sintonia" }, tarefa: "T18" }),
    abre: ["radio-frequencias"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.xeriff, instrumento: "didgeridoo" }, requer: ["lu2ca"],
  },
  lu2ca: {
    id: "lu2ca", n: 8, onde: "cidade", quem: "LU2CA", cor: "#e0ff4f", faixa: "nectar", faixaSituacao: "decidido",
    lugar: { lugar: "palco-nectar" }, pedido: "tem um palco esperando alguém subir", apresenta: "tocar a CHUVA ao vivo no Guitar Driver",
    // (08/11) sem o jogo de escrever a letra no ep. 9 até o dono escrever os versos da CHUVA: chegar no palco já conta
    arte: p("chegar no palco", "decidido", { como: { t: "chegar" }, tarefa: "T19" }),
    jogo: p("tocar ao vivo no Guitar Driver", "decidido", { como: { t: "show", faixa: "chuva" }, tarefa: "T19" }),
    abre: ["shows-live"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.lu2ca, instrumento: "berimbau" }, requer: ["oficina"],
  },
  ella: {
    id: "ella", n: 9, onde: "cidade", quem: "Ella", cor: "#4fc3ff", faixa: "chuva", faixaSituacao: "decidido",
    lugar: { lugar: "escondido" }, pedido: "ela pinta, mas ninguém vê", apresenta: "pintar e expor um quadro",
    // (T22, o dono em 29/10) tudo na casa dela, que é a galeria (proibida, como a
    // planta). (T22b, 30/10) a ordem: o filminho da planta do Criador, conhecer
    // os quadros que ela guardou (o jogo) e pintar na luz da planta (a arte); a
    // obra fica exposta na galeria.
    // Uma cena só (interior/salas/GaleriaElla.tsx, cenas.ts CENA_GALERIA_ELLA)
    arte: p("pintar um quadro ali mesmo e expor", "decidido", { como: { t: "casa", sala: "galeria-ella" }, tarefa: "T22", existe: "/galeria/pintar" }),
    jogo: p("o filme da planta do Criador e conhecer os quadros que ela guardou", "decidido", { como: { t: "casa", sala: "galeria-ella" }, tarefa: "T22" }),
    abre: ["galeria"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.ella, instrumento: "flauta-bambu" }, requer: ["oficina"], ordem: ["jogo", "arte"],
  },
  notti: {
    id: "notti", n: 10, onde: "cidade", quem: "Mubarak", cor: "#ffc857", faixa: "dopamina", faixaSituacao: "decidido",
    lugar: { lugar: "topo" }, pedido: "o fliperama apagou. ninguém joga mais nada", apresenta: "uma máquina do fliperama",
    // (T23, aprovada 30/10) a trilha 8 bits (disco/pecas/conf.ts, TRILHA8)
    arte: p("a trilha de 8 bits da máquina", "decidido", { como: { t: "cena", id: "trilha8" }, tarefa: "T23" }),
    jogo: p("uma máquina do fliperama", "decidido", { como: { t: "cena", id: "maquina" }, tarefa: "T23", existe: "/fliperama" }),
    abre: ["fliperama"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.notti, instrumento: "ocarina" }, requer: ["oficina"],
  },
  nizzy: {
    id: "nizzy", n: 11, onde: "cidade", quem: "Notti", cor: "#5dffa0", faixa: "rollercoaster", faixaSituacao: "decidido",
    // (09/11, bíblia §13) metrô e Rollercoaster são uma coisa só; o pedido é RASCUNHO. O evento segue "montanha" (saves antigos)
    lugar: { lugar: "palco-rollercoaster" }, pedido: "um passeio tranquilo de metrô", apresenta: "o metrô",
    // (T24, aprovada 30/10) o clipe vertical (disco/pecas/conf.ts, CLIPE)
    arte: p("filmar o clipe vertical da Rollercoaster", "decidido", { como: { t: "cena", id: "clipe" }, tarefa: "T24" }),
    jogo: p("andar de metrô: um passeio tranquilo", "decidido", { como: { t: "evento", evento: "montanha", n: 1 }, tarefa: "T24" }),
    abre: ["parque"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.nizzy, instrumento: "handpan" }, requer: ["oficina"],
  },
  tony: {
    id: "tony", n: 12, onde: "cidade", quem: "Tony Gordo", cor: "#ff3fb0", faixa: "swav", faixaSituacao: "decidido",
    // (09/11, ep. 5) não tem horta: tem a feira, no chão do subúrbio. `onde` segue "cidade" porque
    // é a faixa Swav: a luz da pista e os saves antigos contam por aí; quem diz o lugar é `lugar.chao`
    lugar: { chao: "feira" }, pedido: "quatro sacos na feira, e o dinheiro dá pra um", apresenta: "a feira: cortar o preço de quatro sacos", // RASCUNHO
    // (T25, aprovada 30/10) cozinhar (disco/pecas/conf.ts, COZINHAR)
    arte: p("cozinhar um prato com o que veio da feira", "decidido", { como: { t: "cena", id: "cozinhar" }, tarefa: "T25" }),
    jogo: p("a barganha na feira", "decidido", { como: { t: "feira" } }),
    abre: ["canteiros"], recompensa: { guitar: null, batida: null, neon: PAGA.missao.tony, instrumento: "kalimba" }, requer: ["oficina"], ordem: ["jogo", "arte"],
  },
  // ── a 13ª ──
  final: {
    id: "final", n: 13, onde: "cidade", quem: "os nove e a D-Bee", cor: "#ffffff", faixa: null, faixaSituacao: "decidido",
    lugar: { chao: "casa" }, pedido: "os nove nos seus pontos", apresenta: "os nove nos pontos e a D-Bee chegando pra acionar o CHUVA",
    // (T29) a sequência inteira mora em disco/final.ts: o sinal, os nove, o CHUVA,
    // a despedida (o vídeo) e o quintal. Chegou na casa da D-Bee: começa
    arte: p("a CHUVA, o sinal dos nove", "decidido", { como: { t: "final" }, tarefa: "T29" }),
    jogo: p("o CHUVA", "decidido", { como: { t: "final" }, tarefa: "T29" }),
    // (09/11) as missões dos 9 episódios, sem o Xeriff (livre). Só missões: os marcos
    // (a fuga, o show) o save antigo não tem, e quem joga agora já passa por eles
    abre: ["mundo-depois"], recompensa: { guitar: null, batida: null, neon: 0, instrumento: null }, requer: ["dbee", "oficina", "notti", "quadra", "mubarak", "tony", "drew", "tuneis", "ella", "nizzy", "lu2ca"],
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
// (T22) a casa de uma missão que ainda é só teste (CONFIG13.soNoTeste) conta
// como "em breve" fora do link de teste (o save ganha `teste13` com ele)
export const emTeste = (h: HistoriaDisco | null | undefined, id: MissaoId) => !CONFIG13.soNoTeste.includes(id) || (h?.teste13 ?? []).includes(id)
export const emBreve = (pc: Peca, h?: HistoriaDisco | null, id?: MissaoId) =>
  !pc.como || (pc.como.t === "casa" && !!id && !emTeste(h, id)) || (pc.como.t === "grafite" && !CONFIG13.grafiteNoMapa)
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
  for (const qual of ordemDe(id)) if (!emBreve(m[qual], h, id) && !pecaFeita(h, id, qual)) return qual
  return "porta"
}
export const ordemDe = (id: MissaoId): ("arte" | "jogo")[] => MISSOES13[id].ordem ?? ["arte", "jogo"]

export type EstadoPasso = "feita" | "agora" | "depois" | "em breve"
// a checklist (o anel do holo, o painel da missão): arte, jogo e a porta
export function checklist13(h: HistoriaDisco, id: MissaoId): { nome: string; estado: EstadoPasso }[] {
  const m = MISSOES13[id]
  const agora = passoAgora(h, id)
  const estado = (qual: Passo): EstadoPasso => {
    if (agora === null) return "feita"
    if (qual !== "porta" && emBreve(m[qual], h, id)) return "em breve"
    if (qual !== "porta" && pecaFeita(h, id, qual)) return "feita"
    return qual === agora ? "agora" : "depois"
  }
  return [
    ...ordemDe(id).map((qual) => ({ nome: `${qual === "arte" ? "a arte" : "o jogo"} · ${m[qual].nome}`, estado: estado(qual) })),
    { nome: m.abre.length ? `a porta · ${m.abre.map((a) => PORTAS[a].nome).join(" e ")}` : "a recompensa", estado: estado("porta") },
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

// (bloco 1 · A3) chegou no lugar da missão: a peça `{ t: "chegar" }` de agora
// (o caminho de patins e jetpack até o Drew) fica feita. A page.tsx chama no
// chegouNaMissao antes de abrir a próxima peça (o lote D liga)
export function chegou13(h: HistoriaDisco, id: MissaoId): HistoriaDisco {
  const pc = pecaAgora13(h, id)
  return pc?.peca.como?.t === "chegar" ? concluir(h, id, pc.qual) : h
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
  // (T49) o instrumento ancestral ganho: toca na casa da D-Bee
  instrumento: { id: InstrumentoId; nome: string; origem: string } | null
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
    instrumento: m.recompensa.instrumento ? { id: m.recompensa.instrumento, nome: INSTRUMENTOS_ANCESTRAIS[m.recompensa.instrumento].nome, origem: INSTRUMENTOS_ANCESTRAIS[m.recompensa.instrumento].origem } : null,
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
    instrumentos: m.recompensa.instrumento ? uniq([...(h.instrumentos ?? []), m.recompensa.instrumento]) : h.instrumentos,
    missao: normalizarMissao(h.missao) === id ? undefined : h.missao,
  }
}
export const portaAberta = (h: HistoriaDisco, porta: PortaId) => (h.portas ?? []).includes(porta)

// (T15–T25, T16) o lugar ainda trancado (CONFIG13.trancar): a porta não abriu e
// a missão que abre ele não está pegada (a da Nizzy precisa do parque pra andar
// na montanha-russa). Devolve o porquê, curto, ou null (aberto).
export function trancado(h: HistoriaDisco | null, porta: PortaId): string | null {
  if (!h || h.fase === "livre" || h.fase === "minhoca") return null
  if (!CONFIG13.trancar.includes(porta) || portaAberta(h, porta)) return null
  const dona = IDS13.find((id) => MISSOES13[id].abre.includes(porta))
  if (!dona) return null
  if (normalizarMissao(h.missao) === dona && porta === "parque") return null
  // (08/11) a sequência manda: o cadeado diz o episódio que abre (disco/episodios.ts)
  const ep = episodioDaMissao(dona)
  if (ep) return quemAbre(ep)
  return `abre na missão ${dona === "ella" || dona === "dbee" || dona === "mubarak" ? "da" : "do"} ${MISSOES13[dona].quem}`
}
// (T15) a Kombi está no conserto agora? (a missão pegada pede patins até a porta abrir)
export function kombiNoConserto(h: HistoriaDisco | null): boolean {
  const id = normalizarMissao(h?.missao)
  return !!h && h.fase === "carreira" && !!id && CONFIG13.kombiNoConserto.includes(id) && !feita13(h, id)
}

// save de antes do T02: a faixa da cidade já feita (o objeto dela no save) conta
// como a missão feita (senão a pista fica "feita" e a missão nunca aparece)
export function sincronizar(h: HistoriaDisco, objetos: readonly string[]): HistoriaDisco {
  const faltam = IDS13.filter((id) => MISSOES13[id].onde === "cidade" && MISSOES13[id].faixa && objetos.includes(MISSOES13[id].faixa!) && !(h.feitas13 ?? []).includes(id))
  return faltam.length ? { ...h, feitas13: [...(h.feitas13 ?? []), ...faltam] } : h
}

// ── a feira: as missões que dá pra pegar agora ──
// (08/11) quem manda é a SEQUÊNCIA (disco/episodios.ts): a missão de um episódio só
// aparece quando o episódio está aberto (4 e 5 abrem juntos) e as peças de antes
// estão feitas; as livres (o Xeriff) aparecem sempre. O que não é de episódio (o
// final) segue o `requer`. A luz das ruas é a dos episódios (luzDosEpisodios)
export function disponiveis(h: HistoriaDisco): MissaoId[] {
  return IDS13.filter((id) => {
    const m = MISSOES13[id]
    if (m.prologo || feita13(h, id)) return false
    const seq = missaoLiberada(h, id)
    if (seq !== null) return seq
    return m.requer.every((r) => feita13(h, r))
  })
}
export interface Oferta13 { id: MissaoId; quem: string; leva: string; cor: string; faixa: PistaId | null; pedido: string; primeiro: string; feitas: number; total: number }
export function ofertas13(h: HistoriaDisco, ids: MissaoId[]): Oferta13[] {
  // (08/11) na ordem da sequência (as livres, como o Xeriff, no fim)
  const pos = (id: MissaoId) => { const e = episodioDaMissao(id); return e ? EPISODIOS.indexOf(e) : 99 }
  return [...ids].sort((a, b) => pos(a) - pos(b)).map((id) => {
    const m = MISSOES13[id]
    const passos = checklist13(h, id)
    const prox = passos.find((x) => x.estado === "agora") ?? passos[passos.length - 1]
    const ep = episodioDaMissao(id)
    const leva = ep ? rotuloDoEpisodio(ep) : m.faixa ? `à ${PISTAS.find((x) => x.id === m.faixa)?.faixa}` : m.onde === "suburbio" ? "ao subúrbio" : "à cidade"
    return { id, quem: m.quem, leva, cor: m.cor, faixa: m.faixa, pedido: m.pedido, primeiro: prox.nome, feitas: passos.filter((x) => x.estado === "feita").length, total: passos.length }
  })
}

// ── o Guitar Driver na rua: as músicas liberadas ──
export function musicasDoGuitar(h: HistoriaDisco): PistaId[] {
  // (08/11) as dos episódios feitos, mais as que o save já tinha (nunca tira o que ganhou)
  const tem = new Set<string>([...CONFIG13.musicasDoInicio, ...(h.guitar ?? []), ...musicasLiberadas(h)])
  return PISTAS.map((x) => x.id).filter((x) => tem.has(x))
}
// quem libera cada música (pra mostrar o cadeado: "abre na missão de X")
export function quemLibera(faixa: PistaId): MissaoId | null {
  // (08/11) a música abre no episódio dela: devolve a primeira missão dele (o cadeado diz "ep. N")
  const ep = episodioDaMusica(faixa)
  const p = ep?.pecas.find((x) => x.t === "missao")
  return p && p.t === "missao" ? p.id : null
}

// (T49) os instrumentos ancestrais que ele já tem: os do save e os das missões
// feitas (save de antes do T49, ou a D-Bee e a oficina feitas pela fase)
export function instrumentosGanhos(h: HistoriaDisco | null | undefined): InstrumentoId[] {
  if (!h) return []
  const tem = new Set<InstrumentoId>(h.instrumentos ?? [])
  for (const id of IDS13) { const x = MISSOES13[id].recompensa.instrumento; if (x && feita13(h, id)) tem.add(x) }
  return [...tem]
}
