// O fio das missões da Linha 222.
//
// Antes: todas as estações chamavam ao mesmo tempo e cada missão era
// conversa → prova → +100 luz. Agora a experiência é uma corrente só:
//
//   alguém te chama → pede uma coisa → a coisa está num lugar do MAPA →
//   você vai de Kombi buscar → volta → prova → recompensa de verdade
//   (objeto + a música na rádio + um pedaço da história + a pessoa no
//   grupo) → essa pessoa te passa pra próxima.
//
// A ordem da corrente (o "fio") sai do quiz da D-Bee: primeiro a estação da
// pessoa, depois as que mais combinaram com as respostas, puxando pro
// começo as missões do jeito que ela gosta de jogar (perfil). Cada passo
// vira evento no PostHog (mission_step) com o perfil e a posição no fio —
// é assim que a gente descobre qual caminho prende cada tipo de pessoa.

import { ESTACOES, estacao, missao, type EstacaoId } from "./data"
import type { FreqId } from "./radio"
import type { Save } from "./estado"

// como a pessoa gosta de jogar — sai da pergunta da Kombi no quiz
export type Perfil = "estrada" | "musica" | "historia"

export type ItemId = "agua" | "pilha" | "silencio" | "carona" | "pagina" | "violao"

export interface Busca {
  item: ItemId
  nome: string // o que vai aparecer no HUD: "o cantil cheio"
  onde: FreqId // circuito (lugar da cidade)
  // posição dentro do trecho livre do circuito (0..1, entre as chegadas e
  // as bifurcações). Mais de uma = colar (as páginas do caderno)
  em: number[]
  lugar: string // "a caixa d'água do subúrbio"
  pega: { de: string; texto: string }[] // fala ao pegar (uma por ponto)
  // falas durante a volta, com a coisa na Kombi (a carona conversa)
  caminho?: string[]
}

export interface MissaoDef {
  id: EstacaoId
  estilo: Perfil
  chamado: string // a notificação que chega no celular
  tarefa: string // o pedido, curto, no cartão da conversa e no HUD
  busca: Busca
  extra?: string // recompensa própria da missão, além das de sempre
}

export const MISSOES: Partial<Record<EstacaoId, MissaoDef>> = {
  chuva: {
    id: "chuva", estilo: "historia",
    chamado: "nasceu uma flor no asfalto. e meu cantil tá vazio",
    tarefa: "encher o cantil na caixa d'água do subúrbio",
    busca: {
      item: "agua", nome: "o cantil", onde: "suburbio", em: [0.62],
      lugar: "a caixa d'água do subúrbio xenom",
      pega: [{ de: "Ella", texto: "encheu?? traz antes que evapore" }],
    },
    extra: "o JARDIM no celular: rega e a página floresce",
  },
  copo: {
    id: "copo", estilo: "musica",
    chamado: "achei um mp3 no fundo do copo. tá sem pilha",
    tarefa: "buscar pilha na conveniência 24h da cidade neon",
    busca: {
      item: "pilha", nome: "as pilhas", onde: "linha", em: [0.445],
      lugar: "a conveniência 24h, na cidade neon",
      pega: [{ de: "Mubarak", texto: "duas? pô. traz" }],
    },
    extra: "o mp3 pega frequência: sinal cheio pra próxima rádio",
  },
  dopamina: {
    id: "dopamina", estilo: "estrada",
    chamado: "SOCORRO 47 abas. o relógio não para",
    tarefa: "gravar 10 segundos de silêncio no topo do mirante",
    busca: {
      item: "silencio", nome: "o silêncio", onde: "crypto", em: [0.5],
      lugar: "o topo do mirante, onde o sinal do núcleo não chega",
      pega: [{ de: "Notti", texto: "VC GRAVOU O SILÊNCIO?? traz traz traz" }],
    },
    extra: "o turbo da Kombi",
  },
  sexta: {
    id: "sexta", estilo: "estrada",
    chamado: "sexta e eu em casa de novo. me busca?",
    tarefa: "buscar o BBX de carona no subúrbio",
    busca: {
      item: "carona", nome: "BBX de carona", onde: "suburbio", em: [0.22],
      lugar: "a casa do BBX, no subúrbio xenom",
      pega: [{ de: "BBX", texto: "entrei. bora antes que eu desista" }],
      caminho: [
        "vc sempre dirige assim?",
        "essa música é boa. n conta pra ninguém que eu disse",
        "faz tempo que eu n via a cidade de fora do quarto",
        "ok. eu tô gostando",
      ],
    },
  },
  ontem: {
    id: "ontem", estilo: "historia",
    chamado: "o vento espalhou meu caderno.",
    tarefa: "pegar as 3 páginas voando pela cidade neon",
    busca: {
      item: "pagina", nome: "as páginas", onde: "linha", em: [0.22, 0.555, 0.78],
      lugar: "voando pela cidade neon",
      pega: [
        { de: "Alohan", texto: "uma." },
        { de: "Alohan", texto: "duas." },
        { de: "Alohan", texto: "as três. vem." },
      ],
    },
    extra: "sua linha guardada no caderno",
  },
  nectar: {
    id: "nectar", estilo: "musica",
    chamado: "oi. sou eu. esqueci o violão na arena",
    tarefa: "buscar o violão no palco da arena, depois do túnel",
    busca: {
      item: "violao", nome: "o violão", onde: "live", em: [0.8],
      lugar: "o palco da arena",
      pega: [{ de: "LU2CA", texto: "achou. agora traz, a estação 6 é aqui" }],
    },
    extra: "o VIOLÃO no celular: escalas, acordes e tocar junto",
  },
}

export function missaoDe(id: EstacaoId) {
  return MISSOES[id]
}

// quem pede e quem passa a vez: a fala do personagem que ACABOU de ajudar,
// apontando pro próximo do fio
export const GANCHO: Partial<Record<EstacaoId, string>> = {
  chuva: "Ella quer te mostrar uma coisa. lá chove, leva paciência",
  copo: "Mubarak tá te procurando. n é de pedir ajuda, então é sério",
  dopamina: "Notti mandou 14 mensagens perguntando de vc. responde lá",
  sexta: "BBX tá em casa de novo. acho que tá precisando de uma carona",
  ontem: "Alohan perdeu umas páginas. n vai admitir, mas precisa de vc",
  nectar: "tem alguém na estação 6 querendo te conhecer. n falo quem",
}

// Memórias: a história da cidade contada em pedaços, uma por missão
// cumprida, SEMPRE na mesma ordem (qualquer que seja o fio da pessoa) —
// assim a narrativa se monta sozinha, sem ninguém despejar tudo de uma vez.
// Rascunho: o LU2CA reescreve.
export const MEMORIAS = [
  "antes do núcleo a música tocava na rua. ninguém pedia licença pra cantar alto",
  "o núcleo nasceu pra organizar o trânsito. deu tão certo que resolveram organizar as pessoas também: cada uma no seu lado, cada lado com seu inimigo",
  "quem desenhou o núcleo foi o pai da D-Bee. ele achava que tava construindo um metrônomo pra cidade",
  "na noite do primeiro apagão, alguém rodou a linha 222 inteira de kombi escondendo uma música em cada estação",
  "a kombi que vc dirige é essa. o rádio dela nunca desligou",
  "quem escondeu as músicas nunca saiu da cidade. ficou esperando alguém juntar tudo",
  "a D-Bee sabia desde o começo. por isso ela pergunta 'sabe ontem?' pra todo mundo",
  "o apagão mais longo da história n foi falta de luz. foi excesso. tanta tela acesa que ninguém viu a cidade inteira cantando junto pela última vez",
  "a linha 222 n termina. ela dá a volta e começa de novo em quem ouviu",
]

// ── o fio ────────────────────────────────────────────────────────────

// ordem das missões pra esta pessoa. A própria estação primeiro (se tiver
// missão), depois pelas respostas do quiz, com um empurrão pras missões do
// estilo dela. Nectar sempre por último (é o fim do arco).
export function montarFio(pesos: Partial<Record<EstacaoId, number>>, estacaoId: EstacaoId | null, perfil: Perfil | null): EstacaoId[] {
  const nota = (id: EstacaoId) =>
    (pesos[id] ?? 0) + (MISSOES[id]!.estilo === perfil ? 3 : 0) + (id === estacaoId ? 100 : 0) - (id === "nectar" ? 1000 : 0)
  const ids = ESTACOES.map((e) => e.id).filter((id) => MISSOES[id])
  // sort estável: empate fica na ordem da linha
  return ids.map((id, i) => ({ id, i, n: nota(id) })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.id)
}

export type Etapa = "chamado" | "busca" | "entrega" | "feita"

// em que pé está uma missão
export function etapaDe(s: Save, id: EstacaoId): Etapa {
  if (s.objetos.includes(id)) return "feita"
  const m = MISSOES[id]
  if (!m || s.pausas[id] === undefined) return "chamado"
  return itensFaltando(s, id) > 0 ? "busca" : "entrega"
}

export function itensFaltando(s: Save, id: EstacaoId) {
  const m = MISSOES[id]
  if (!m) return 0
  return m.busca.em.filter((_, k) => !s.itens.includes(`${m.busca.item}:${k}`)).length
}

// a missão que está valendo agora: a primeira do fio ainda não feita cuja
// estação está aberta. Uma de cada vez — é isso que dá ritmo.
export function ativa(s: Save, nivel: number, agora = Date.now()): EstacaoId | null {
  for (const id of s.fio) {
    if (s.objetos.includes(id)) continue
    if (!missao(estacao(id), nivel, agora).ok) continue
    return id
  }
  return null
}

// quem a pessoa já conhece: a D-Bee, quem já pediu algo e quem está chamando
export function conhecidos(s: Save, nivel: number): EstacaoId[] {
  const out = ESTACOES.filter((e) => s.objetos.includes(e.id) || s.pausas[e.id] !== undefined).map((e) => e.id)
  const a = ativa(s, nivel)
  if (a && !out.includes(a)) out.push(a)
  return out
}

// O alvo na estrada: pra onde a missão manda agora
export type Alvo =
  | { t: "busca"; missao: EstacaoId; busca: Busca; faltam: number[] } // índices dos pontos que faltam
  | { t: "entrega"; missao: EstacaoId }
  | { t: "visita"; missao: EstacaoId } // alguém te chamou: vai até a estação dele

export function alvoDe(s: Save, nivel: number): Alvo | null {
  const id = ativa(s, nivel)
  if (!id) return null
  const e = etapaDe(s, id)
  const m = MISSOES[id]!
  if (e === "busca") return { t: "busca", missao: id, busca: m.busca, faltam: m.busca.em.map((_, k) => k).filter((k) => !s.itens.includes(`${m.busca.item}:${k}`)) }
  if (e === "entrega") return { t: "entrega", missao: id }
  if (e === "chamado") return { t: "visita", missao: id }
  return null
}
