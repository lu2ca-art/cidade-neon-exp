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
//   bar     → o PRÓLOGO: a moça do bar oferece o copo (o loop); recusou, conhece
//             o Mubarak e vê o show da Nectar ali mesmo (ep. 1, episodios.md)
//   nectar  → a missão 1: a Kombi quebra, regar de patins, o galão no posto,
//             a oficina (solar + turbo = toda a água), o show, as flores
//   carreira→ depois da Nectar: as pistas que acendem (os atos), as 4 peças
//   livre   → quem já jogava antes da história nova: segue de onde estava
//
// Tudo que é fala aqui é RASCUNHO (o LU2CA reescreve).

import type { Save } from "../estado"
import type { MissaoId, PortaId } from "./portas"
import type { InstrumentoId } from "./instrumentos"
import type { EstadoMetro } from "./metro"

export type FaseDisco = "minhoca" | "casa" | "dunas" | "bar" | "oficina" | "subir" | "nectar" | "carreira" | "livre"
// os passos da Nectar (B9)
export type PassoNectar = "quebra" | "regar" | "galao" | "oficina" | "show" | "flores" | "feita"

export type Manchete = { id: number; missao: string; titulo: string; linha: string; pop: number; neon: number; modo: "tocar" | "cantar"; nota: number; publico: number; imagem?: string }

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
  robos?: number // (antigo: a conta dos robôs espatifados; desde 30/10 eles não contam nada)
  // (B11) as peças das missões já feitas ("sexta:pingpong")
  pecas?: string[]
  // (21/10, a feira) a missão que ele pegou (a linha); sem ela, a feira oferece as acesas
  missao?: string
  // (18/11, o dono) a última música de missão (aceita ou largada): a pista dela.
  // A Rádio Cidade Neon Crypto e as pistas tocam o instrumental dela, em loop
  ultimaFaixa?: string
  // o show que está pra acontecer: (T02) não é mais o fim da missão. É o Guitar
  // Driver aberto agora: "rua:<faixa>" (a oportunidade na rua) ou
  // "missao:<id>" (a peça de uma missão que é tocar ao vivo, a do LU2CA) ou
  // (T20) "palco:<palco>:<faixa>" (um palco da carreira, disco/palcos.ts)
  show?: string
  // (27/10) o drone GPS da D-Bee: ela dá nas dunas (a subida mostrada uma vez só)
  drone?: boolean
  // (trilha sonora, 05/11) a rádio já ligou sozinha na primeira chegada ao subúrbio
  // (uma vez só: depois respeita se ele desligou)
  radioXenom?: boolean
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
  // (T49) os instrumentos ancestrais ganhos nas portas (disco/instrumentos.ts);
  // tocam na casa da D-Bee
  instrumentos?: InstrumentoId[]
  // (lote D) os que ele já viu na casa da D-Bee: o resto é "novo" (a cena pede
  // pra tocar cada novo; sem novo, a visita é livre)
  instrumentosVistos?: InstrumentoId[]
  // (bíblia §13, 09/11) os achados no deserto e no subúrbio (disco/instrumentosMundo.ts):
  // tocam dentro da Kombi; e os sampleados na casa da D-Bee (entram no B4TIDA)
  instrumentosAchados?: InstrumentoId[]
  instrumentosSampleados?: InstrumentoId[]
  // (T19) a peça de escrever aberta agora ("lu2ca:arte"; fica no save: recarregar
  // não perde) e as letras escritas por faixa (aparecem no show, no cantar)
  aberta13?: string
  letras?: Record<string, string[]>
  // (T15–T25, T16) o que cada arte deixou ("nizzy:arte" → os cortes do clipe;
  // "tony:arte" → o prato; "xeriff:arte" → a vinheta…)
  obras13?: Record<string, string[]>
  // (T22) as missões cuja casa nova joga neste save (o link de teste liga; ver
  // CONFIG13.soNoTeste em portas.ts)
  teste13?: string[]
  // (T09) a missão da oficina (disco/oficina.ts): a cena vista, o painel achado
  // e o tanque do motor (as gotas da goteira); a água que a D-Bee deu (uma vez)
  // (T57) pecas: as peças da reciclagem que ele já catou no lixão (disco/achados.ts)
  oficina?: { cena?: true; painel?: true; tanque?: number; pecas?: string[] }
  aguaDbee?: true
  // (ep. 1) conheceu o Mubarak no bar, antes do show (quem chegou na oficina antes, sem isso, segue pelo caminho antigo)
  mubarakBar?: true
  // (T20) os palcos como Guitar Hero (disco/palcos.ts): a melhor estrela (1–5)
  // de cada música em cada palco ("bar:copo" → 3). A soma abre o palco de cima
  palcos?: Record<string, number>
  // (T21) os 4 shows do subúrbio xenom (disco/xenom.ts): a melhor estrela, se o
  // objetivo do multiverso já foi cumprido (paga o bônus uma vez) e quantas vezes tocou
  xenom?: Record<string, { melhor: number; cumprida: boolean; vezes: number }>
  // (T07) o tutorial do holo: a tela de recompensa vista ("recompensa") e os
  // passos feitos (disco/tutorialConf.ts: "mapa", "gps", "drift"…)
  tutorial?: string[]
  // (T27) a Kombi que quebra (disco/quebra.ts): está na oficina agora, quantas vezes
  // quebrou e quantos sorteios faltam pra ela poder quebrar de novo
  quebra?: { quebrada?: true; vezes?: number; folga?: number }
  // (T28) a perseguição da Kombi, uma vez só (disco/perseguicao.ts): "agora" = a
  // polícia atrás; "escolher" = a Kombi foi jogada lá de cima, os 3 veículos na
  // pista; "feita" = escolheu `veiculo`
  perseguicao?: { fase: "agora" | "escolher" | "feita"; veiculo?: string }
  // (T64, bloco 1 · A8) o metrô (o C2): quando pegam ele, tomam o jetpack; na fuga
  // pelo metrô ele perde o violão. Depois disso a guitarra aparece na loja
  // (economia-rascunho.ts, `naLoja`)
  perdeuViolao?: true
  jetpackTomado?: true
  // (T64, lote D) a fuga do metrô (disco/metro.ts: "agora" = no metrô, "feita" = fugiu)
  metro?: EstadoMetro
  // (T64, lote D) os grafites assinados nas paredes das trincheiras (disco/Grafite.tsx)
  grafites?: string[]
  // (T64, 06/11) o grafite livre: a tag desenhada à mão (grafite/tipos.ts), na parede depois da missão
  tagLivre?: import("../grafite/tipos").TagLivre
  // (08/11) as 8 paredes livres: o desenho de cada uma em texto (grafite/paredes.ts; "" = sem pintar).
  // A tagLivre antiga fica como está: aparece nas paredes que ainda não têm desenho
  paredesLivres?: string[]
  // (16/11) a entrega (disco/entrega.ts): quem ele entregou e ainda não achou nas
  // incubadoras; e quem já pagou a recompensa da entrega (não paga duas vezes)
  entregues?: MissaoId[]
  entreguesPagos?: MissaoId[]
  // (16/11) a captura do final (todos capturados, as incubadoras e a sala de controle) já aconteceu
  capturaFinal?: true
  // (16/11) os instrumentos que as missões deram e foram tomados na entrega (o preço da traição)
  instrumentosTomados?: InstrumentoId[]
}

// (A8) o que o metrô tira dele: fica no save de uma vez (puras, o C2 e a page.tsx chamam)
export const tomarJetpack = (h: HistoriaDisco): HistoriaDisco => (h.jetpackTomado ? h : { ...h, jetpackTomado: true })
export const perderViolao = (h: HistoriaDisco): HistoriaDisco => (h.perdeuViolao ? h : { ...h, perdeuViolao: true })

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

// ── (T37, 28/10) A CHEGADA: do buraco de minhoca à casinha ──
// (J1) "toda vez que a pessoa entrar, ela vai passar por ele"; "sempre vamos
// cair aí na casinha da D-Bee toda vez que entrar no jogo, e tem que ir até a
// cidade"; (J2: 1) "não tem que ter ela no ar: chega já acelerando no
// deserto, como se tivesse saído do buraco de minhoca"; (J2: 4) "uma cut scene
// bem cinematográfica lateral da Kombi chegando do lado da casinha, parando,
// aí sim corta pra ela recebendo ele". O que ainda é gosto do dono fica aqui.
export const CHEGADA = {
  // quem já passou pela casa: "sempre" (todo login cai na casinha), "comPropulsao"
  // (só depois de liberar o voo, J1: "depois de liberar a propulsão fica de boa")
  // ou "nunca" (entra onde parou, como antes)
  // (notas 04/11, o dono: "a ideia é ir só no início. O certo é voltar pra onde
  // a gente tava toda vez que voltar pro game") "nunca": a casinha só no save novo
  casaNoLogin: "nunca" as "sempre" | "comPropulsao" | "nunca",
  // quanto dura o túnel: na primeira vez e nas outras entradas (um toque pula)
  minhocaMs: 7200,
  minhocaMsVolta: 5200,
  // o céu na chegada: "real" (a hora do relógio de quem joga), "save" (a hora
  // em que ele parou no jogo) ou "tarde" (16h30, o começo de antes)
  ceu: "real" as "real" | "save" | "tarde",
  // depois da casinha, quem já conhece a D-Bee: "mapa" (o mapa abre com o
  // próximo passo) ou "dirigir" (só devolve o volante)
  depoisDoLogin: "mapa" as "mapa" | "dirigir",
  // a velocidade de quem sai do túnel (m/s) e onde começa a cena de lado (m)
  v0: 220,
  corte: 150,
}
// a casa olha pra cidade; as coisas da chegada ficam em volta dela
export const ROT_CASA = Math.atan2(-CASA.x, -CASA.z)
const naCasa = (lx: number, lz: number) => ({
  x: CASA.x + Math.cos(ROT_CASA) * lx + Math.sin(ROT_CASA) * lz,
  z: CASA.z - Math.sin(ROT_CASA) * lx + Math.cos(ROT_CASA) * lz,
})
// a Kombi corre paralela à frente da casa e para na frente da varanda, de lado
// pra câmera; a câmera fica do outro lado, baixa, com a casa acesa no fundo
const RUMO_CHEGADA = Math.atan2(Math.cos(ROT_CASA), -Math.sin(ROT_CASA))
export const PARADA_CASA = { ...naCasa(1.4, 12.5), rumo: RUMO_CHEGADA }
export const ENTRA_CHEGADA = { ...naCasa(1.4 - 900, 12.5), rumo: RUMO_CHEGADA }
export const CAM_CHEGADA = { de: naCasa(-3, 31), ate: naCasa(3.5, 28.5) }

// quem já passou pela casa cai nela de novo neste login?
export function casaNoLogin(h: HistoriaDisco): boolean {
  if (h.fase === "minhoca" || h.fase === "casa") return false // a primeira vez já é a chegada
  if (CHEGADA.casaNoLogin === "nunca") return false
  if (CHEGADA.casaNoLogin === "comPropulsao") return !semVoo(h)
  return true
}
// a hora do céu quando a Kombi sai do túnel
export function horaDaChegada(horaSave: number | undefined, agora = new Date()): number {
  if (CHEGADA.ceu === "tarde") return 16.5
  if (CHEGADA.ceu === "save") return horaSave ?? 16.5
  return agora.getHours() + agora.getMinutes() / 60
}

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
import type { Cena, PassoCena } from "../cenas"
import { CONFIG_TUTORIAL } from "./tutorialConf"
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
    // (T07, J1: 6) a entrega de verdade: da mão dela pra dele (disco/EntregaHolo.tsx);
    // o destaque do que ganhou é lá fora (disco/TutorialHolo.tsx, RecompensaHolo)
    { t: "acao", texto: "de uma caixa ela tira um aparelho pequeno, quase sem peso. liga. uma luz sobe e fica parada em cima da mão dela" },
    // (T62, a fala do dono de 21/10) por que ela dá o holo. Só texto: a voz é do T60
    { t: "fala", de: "D-Bee", texto: "eu já usei isso aqui demais. escutei tudo que tem aí" },
    { t: "fala", de: "D-Bee", texto: "mas vc é novo na cidade. isso vai te ajudar a não se perder por lá" },
    { t: "fala", de: "D-Bee", texto: "toma. é seu" },
    { t: "gesto", id: "holo" },
    { t: "acao", texto: "na sua mão ele não pesa nada. a luz sobe e fica parada no ar, na frente dos seus olhos" },
    ...(CONFIG_TUTORIAL.cartaoNaCena ? [{ t: "ganha" as const, titulo: "o holo", texto: "o celular de agora: a luz que fica no ar. a música, o mapa, tudo nele" }] : []),
    { t: "fala", de: "D-Bee", texto: "sem isso, lá na cidade, vc não existe" },
    { t: "fala", de: "D-Bee", texto: "não tem estrada daqui até lá. a kombi dá conta. eu falo com vc pelo rádio" },
    { t: "fim" },
  ],
}

// (T07) o pedaço da cena a partir da entrega do holo (o link de teste
// ?parte=casa.holo: pula a chegada e o tambor, que são do T37 e do T06)
export const CENA_CASA_HOLO: Cena = { ...CENA_CASA_DISCO, passos: CENA_CASA_DISCO.passos.slice(CENA_CASA_DISCO.passos.findIndex((p) => p.t === "fala" && p.texto === "guardei umas coisas dos velhos tempos. pra vc é tudo novo")) }

// (T06) o pedaço a partir do tambor (?parte=casa.tambor): ela senta no tapete e chama
export const CENA_CASA_TAMBOR: Cena = { ...CENA_CASA_DISCO, passos: CENA_CASA_DISCO.passos.slice(CENA_CASA_DISCO.passos.findIndex((p) => p.t === "gesto" && p.id === "tambores") - 1) }

// (T49, lote D) a volta na casa da D-Bee com os instrumentos ganhos. Com
// instrumento novo (ganhou numa porta e ainda não viu aqui): ela mostra e pede
// pra tocar cada novo. Sem novo: a visita livre (toca uns, ela fala, sai). RASCUNHO
export const CENA_CASA_INSTRUMENTOS: Cena = {
  lugar: "casa-dbee",
  titulo: "a casa da d-bee",
  missao: "ojala",
  passos: [
    { t: "acao", texto: "a porta tá aberta. no banco da parede, coisa nova do lado das velhas" },
    { t: "fala", de: "D-Bee", texto: "trouxeram pra cá o que vc ganhou. aqui eles ficam seguros" },
    { t: "fala", de: "D-Bee", texto: "toca. cada um tem um jeito de acordar" },
    { t: "gesto", id: "instrumentos" },
    { t: "fala", de: "D-Bee", texto: "isso. a casa lembra de cada som que entra nela" },
    { t: "fim" },
  ],
}
export const CENA_CASA_VISITA: Cena = {
  lugar: "casa-dbee",
  titulo: "a casa da d-bee",
  missao: "ojala",
  passos: [
    { t: "acao", texto: "a porta tá aberta. o banco, os instrumentos, a lâmpada quente" },
    { t: "fala", de: "D-Bee", texto: "voltou. senta. toca o que quiser" },
    { t: "gesto", id: "instrumentos" },
    { t: "fala", de: "D-Bee", texto: "a cidade espera. a casa também" },
    { t: "fim" },
  ],
}

// ── O PRÓLOGO: o bar (LU2CA 19–20/10). A moça do bar (a do copo: um jeito meio
// robô, muito sensata; é uma das máquinas conscientes, mas não revela) oferece
// o copo; beber = o loop (a noite volta); recusar e sair do loop: ninguém sobe
// naquele palco há anos. Depois (ep. 1, 08/11): conhecer o Mubarak e o show da
// Nectar ali mesmo, ao lado da D-Bee e do Mubarak. RASCUNHO ──
// (ep. 1) o show do LU2CA, com a Nectar sendo revelada: assistir ou tocar (disco/ShowNoBar.tsx)
const PASSOS_SHOW_NECTAR: PassoCena[] = [
  { t: "acao", texto: "o LU2CA sobe no palco. a D-Bee e o Mubarak ficam do seu lado" },
  { t: "gesto", id: "show-nectar" },
  { t: "fim" },
]
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
    // RASCUNHO: a frase vem de episodios.md ("a D-Bee diz que sabe quem pode ajudar"); o Mubarak é a fala que já existia na oficina
    { t: "fala", de: "D-Bee", texto: "eu sei quem pode ajudar" },
    { t: "fala", de: "Mubarak", texto: "mubarak. a oficina é minha, o resto é de ninguém" },
    ...PASSOS_SHOW_NECTAR,
  ],
}
// o show sozinho: quem conheceu o Mubarak na oficina (save antigo, ou saiu antes do show) vem aqui
export const CENA_SHOW_NECTAR: Cena = { lugar: "bar", titulo: "o bar · o show", missao: "copo", passos: PASSOS_SHOW_NECTAR }

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
// (18/11, o dono: o mapa novo, mapa-ilustrado.md "A cratera e o subúrbio em anel")
// O SUBÚRBIO É UM ANEL NA BEIRA DA CRATERA. A cratera é a maior mancha do lixão
// (zonaLixo), centro em CRATERA; `rim` é a beira dela, em 72 rumos (de 5° em 5°,
// rumo = atan2(z - cz, x - cx)), a mesma do mapa ilustrado. O anel vai da beira até
// `larg` m pra fora. SUBURBIO (acima) agora é só o bairro antigo (o modelo dos 101
// prédios, a gente na rua, a corrida de rua), que fica dentro do anel.
// (19/11) o disco abre ×1.22 a partir da cratera (como no mapa): a beira e a largura do anel também
export const ES_DISCO = 1.22
export const CRATERA = {
  x: 315, z: -94, larg: 850 * ES_DISCO,
  rim: [720,765,780,240,240,255,525,555,600,690,780,870,945,975,975,990,1035,1065,1050,1005,945,915,930,1095,1110,855,765,705,660,600,510,465,435,420,405,420,435,450,480,525,600,795,810,825,870,930,960,990,990,1005,990,945,915,885,855,855,885,915,900,885,885,855,825,810,795,780,765,780,780,750,720,705],
}
// a beira da cratera no rumo `a` (m do centro)
export function beiraCratera(a: number) {
  const f = ((((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI)) * 72
  const i = Math.floor(f) % 72, u = f - Math.floor(f), R = CRATERA.rim
  return (R[i] * (1 - u) + R[(i + 1) % 72] * u) * ES_DISCO
}
// quantos metros fora do anel (0 dentro; dentro da cratera também conta como fora)
export function foraDoSuburbio(x: number, z: number) {
  const d = Math.hypot(x - CRATERA.x, z - CRATERA.z), b = beiraCratera(Math.atan2(z - CRATERA.z, x - CRATERA.x))
  return d < b ? b - d : d > b + CRATERA.larg ? d - b - CRATERA.larg : 0
}
// o rumo (giro) de quem olha pra cratera estando em (x, z): as fachadas do anel viram pra ela
export const giroPraCratera = (x: number, z: number) => Math.atan2(CRATERA.x - x, CRATERA.z - z)
// (19/11, o dono: "aquele mapa flutuante é o do jogo") A ILHA: o mundo inteiro é um disco
// flutuando no céu, com o centro na cratera (o rótulo do vinil). O chão acaba a `r` dela,
// numa beirada que desce um pouco; embaixo pendura o cone (a raiz), com os túneis
// construídos por fora dele (estrada/ilha.ts). A Kombi não cai: perto da beira o vento
// empurra de volta. A casa da D-Bee (a 2,8 km) fica dentro, perto da beira.
export const ILHA = { x: CRATERA.x, z: CRATERA.z, r: 3300, fundo: 2150, beira: 120 }
export const naIlha = (x: number, z: number, margem = 0) => Math.hypot(x - ILHA.x, z - ILHA.z) < ILHA.r - margem
// os lugares do chão do subúrbio (longe das pistas e das torres)
export const CHAO_LUGARES = {
  // (09/11, bíblia §13) o bar fica bem na porta: na beira do subúrbio do lado do
  // deserto, no caminho de quem vem da casa da D-Bee (GIRO_BAR, abaixo)
  // (19/11) os lugares do anel: os pontos do mapa ilustrado (abertos ×1.22 da cratera, como o
  // disco); os que caíam em pista/torre (M.livre) ou na rua da corrida andaram até 95 m
  // (a peças do lixão abriram junto; o pé da torre 1, o destino do final, foi com a torre)
  bar: { x: -640, z: -826, nome: "O COPO", cor: "#ff6a35" },
  oficina: { x: 215, z: 1393, nome: "OFICINA", cor: "#ff9000" },
  palco: { x: 1067, z: -1157, nome: "PALCO", cor: "#e0ff4f" },
  // (09/11, o dono) o último show é no centro do deserto: o trecho mais plano entre a
  // casa da D-Bee e a borda do mapa, longe das pistas e dos morros (disco/final.ts)
  // (19/11) a 3 km da cratera, dentro da ilha (antes a 3,4 km, que agora é o céu)
  palcoDeserto: { x: -2539, z: -1017, nome: "PALCO", cor: "#e0ff4f" },
  // (09/11) o destino do GPS depois do show, quando a pessoa dirige até as torres: o pé
  // da torre 1, a mais perto do deserto. Vale chegar em qualquer torre (estrada/FinalPovo.tsx)
  torresFinal: { x: -1341, z: 315, nome: "TORRE", cor: "#ff6a35" },
  // (T02) as missões do subúrbio: a quadra do Alohan e a entrada dos túneis (RASCUNHO de onde ficam)
  // (T57) a quadra é um lugar de verdade (o piso, as cestas, o alambrado) e os
  // túneis, uma boca no chão: o ponto é a porta, no fundo da rampa (estrada/chao.ts, BOCA)
  quadra: { x: -330, z: -1520, nome: "QUADRA", cor: "#ff6a35" },
  tuneis: { x: -650, z: -180, nome: "TÚNEIS", cor: "#9b8cff" },
  // (T09) os achados da missão da oficina: o painel solar velho no lixão (a mancha
  // de lixo a leste do subúrbio) e a goteira embaixo de uma pista. Só aparecem
  // (e só vão pro mapa) quando é a vez deles. RASCUNHO de onde ficam
  // (T57) a reciclagem no deserto: o painel e mais três peças espalhadas no lixão
  // (pega passando, de Kombi ou de patins; disco/achados.ts)
  painel: { x: -508, z: -821, nome: "PAINEL", cor: "#4fc3ff" },
  lavadora: { x: -323, z: -899, nome: "MÁQUINA DE LAVAR", cor: "#c9d3e6" },
  ventilador: { x: -408, z: -617, nome: "VENTILADOR", cor: "#4fc3ff" },
  radio: { x: -569, z: -426, nome: "RÁDIO", cor: "#ff6a35" },
  goteira: { x: -826, z: -870, nome: "GOTEIRA", cor: "#4fc3ff" },
  // (T47, lote D) a porta da torre do elevador de terror (lugares.ts "elevador",
  // soChao): só o gatilho de chegada, sem fachada nem ponto no mapa até chegar o
  // vídeo da torre. RASCUNHO de onde fica: na beira oeste do subúrbio
  torre: { x: -960, z: -700, nome: "TORRE", cor: "#ff2436" },
  // (notas 04/11, o dono: "a casa da D-Bee no meio da cidade") a casa dela é
  // UMA só, no deserto do subúrbio (CasaDeserto, em CASA). As missões e as cenas
  // dela valem só aqui, no chão: sem fachada nova (a casa já está desenhada)
  casa: { x: CASA.x, z: CASA.z, nome: "CASA DA D-BEE", cor: "#ffc857" },
  // (06/11, bíblia §4: "a maior parte das experiências fica no subúrbio") os
  // lugares que faltavam no chão: cada um abre a experiência que já existe
  // (disco/abertos.ts). Longe uns dos outros (90 m ou mais), fora da rua da
  // corrida (40 m ou mais) e das pistas (conferido com M.livre). docs/suburbio-lugares.md
  ginasio: { x: 413, z: -1309, nome: "GINÁSIO", cor: "#ff9000" },
  galeria: { x: 1586, z: 32, nome: "GALERIA", cor: "#3d7bff" },
  discos: { x: -386, z: 223, nome: "DISCOS", cor: "#ffc857" },
  batida: { x: -383, z: 899, nome: "BATIDA", cor: "#ff6b6b" },
  flores: { x: 1370, z: -572, nome: "FLORES", cor: "#5dffa0" },
  brecho: { x: 1005, z: 418, nome: "BRECHÓ", cor: "#ff3fb0" },
  // (09/11, ep. 5) a feira do Tony Gordo: a rua das barracas, entre o bar e a oficina (disco/FeiraRua.tsx)
  feira: { x: 882, z: 1230, nome: "FEIRA", cor: "#ff3fb0" },
} as const
export type LugarChao = keyof typeof CHAO_LUGARES
// (09/11) a porta do bar vira pro deserto (quem chega vem de lá), e não pro centro da cidade
export const GIRO_BAR = Math.atan2(CASA.x - CHAO_LUGARES.bar.x, CASA.z - CHAO_LUGARES.bar.z)
// onde a Kombi reaparece na fase do bar: no deserto, de frente pra porta dele
export const PONTO_BAR = { x: CHAO_LUGARES.bar.x + Math.sin(GIRO_BAR) * 90, z: CHAO_LUGARES.bar.z + Math.cos(GIRO_BAR) * 90, rumo: GIRO_BAR + Math.PI }
// (T09) os que não são lugar (não têm fachada nem ponto fixo no mapa)
// (lote D) a torre também: é só a porta (o gatilho), sem fachada
export const CHAO_ACHADOS: readonly LugarChao[] = ["painel", "lavadora", "ventilador", "radio", "goteira", "torre", "casa", "torresFinal"]
// (06/11) os que têm a fachada juntada (LugaresChao: LugaresAbertos), não a Fachada de antes
export const CHAO_ABERTOS = ["ginasio", "galeria", "discos", "batida", "flores", "brecho"] as const satisfies readonly LugarChao[]
export const CHAO_FIXOS = (Object.keys(CHAO_LUGARES) as LugarChao[]).filter((id) => !CHAO_ACHADOS.includes(id))
export const RAIO_CHAO = 22
// (09/11) as pontas da rua da feira: as ruínas também abrem espaço aqui (ruinas.ts)
// (18/11) a rua corre no rumo da cratera (feira.ts, FEIRA_RUMO): as pontas, 20 m pra cada lado
const RF = Math.atan2(-(CHAO_LUGARES.feira.z - CRATERA.z), CHAO_LUGARES.feira.x - CRATERA.x)
export const CHAO_PONTAS = [-20, 20].map((l) => ({ x: CHAO_LUGARES.feira.x + l * Math.cos(RF), z: CHAO_LUGARES.feira.z - l * Math.sin(RF) }))
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
