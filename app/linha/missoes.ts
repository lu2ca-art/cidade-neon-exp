// As missões da cidade (03/10: sem corrente).
//
//   alguém te chama → pede uma coisa → a coisa está num lugar do MAPA →
//   você vai de Kombi buscar → volta → prova → recompensa de verdade
//   (objeto + a música na rádio + um pedaço da história).
//
// O violão quem dá é a D-Bee, no fim da leitura NECTAR (roteiros.ts): ensina
// que recompensa aqui é coisa que se USA (o app VIOLÃO). O LU2CA só aparece
// no episódio dele (16/10). Não tem fila: cada área da cidade tem as suas missões, e
// quem mora nela te chama quando você entra (em qualquer ordem). As áreas
// abrem com o sinal (radio.ts), então a cidade vai se revelando aos poucos.
// O fio (ordem do quiz) só desempata dentro da mesma área. Cada passo vira
// evento no PostHog (mission_step).

import { ESTACOES, estacao, missao, type EstacaoId } from "./data"
import type { FreqId } from "./radio"
import type { Save } from "./estado"
import { LUGARES, type LugarId } from "./lugares"

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
  // missão de BUSCA (o jeito antigo: uma coisa num ponto do mapa)…
  busca?: Busca
  // …ou missão de LUGAR (04/10): a cena acontece num lugar da cidade
  // (lugares.ts, cenas.ts). Com `carona`, primeiro pega alguém num lugar e
  // leva até o outro
  lugar?: LugarId
  carona?: LugarId
  // o que a carona fala no caminho (dirigindo, pela ilha)
  caminho?: string[]
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
    lugar: "escondido",
    extra: "o JARDIM no celular: rega e a página floresce",
  },
  copo: {
    id: "copo", estilo: "musica",
    chamado: "tô no bar de sempre. vem",
    tarefa: "encontrar o Mubarak no bar (O COPO), na cidade neon",
    lugar: "bar",
    extra: "o mp3 pega frequência: sinal cheio pra próxima rádio",
  },
  dopamina: {
    id: "dopamina", estilo: "estrada",
    chamado: "SOCORRO 47 abas. o relógio não para",
    tarefa: "encontrar a Notti no terraço do prédio mais alto do mirante",
    lugar: "topo",
    extra: "o turbo da Kombi",
  },
  sexta: {
    id: "sexta", estilo: "estrada",
    chamado: "sexta e eu em casa de novo. me busca?",
    tarefa: "buscar o Drewboy em casa e levar ele na balada",
    carona: "casa-drewboy",
    lugar: "balada",
    caminho: [
        "vc sempre dirige assim?",
        "essa música é boa. n conta pra ninguém que eu disse",
        "faz tempo que eu n via a cidade de fora do quarto",
        "ok. eu tô gostando",
      ],
    extra: "o espelho de bolso rachado",
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
    lugar: "casa-shows",
    extra: "sua linha guardada no caderno",
  },
  nectar: {
    id: "nectar", estilo: "musica",
    chamado: "oi. vc é a pessoa nova, né. preciso de um favor",
    tarefa: "buscar o violão esquecido debaixo da plataforma da Linha 9",
    busca: {
      item: "violao", nome: "o violão", onde: "linha", em: [0.12],
      lugar: "debaixo da plataforma da Linha 9, entre a estação 1 e a 2",
      pega: [{ de: "LU2CA", texto: "achou. antes das 2:22, ufa. agora traz, a estação 6 é aqui" }],
    },
    extra: "o VIOLÃO no celular: escalas, acordes e tocar junto",
  },
}

export function missaoDe(id: EstacaoId) {
  return MISSOES[id]
}

// sem corrente (03/10): ninguém passa a vez pra ninguém. Às vezes um cita
// o outro dentro da própria conversa, nunca como regra
export const GANCHO: Partial<Record<EstacaoId, string>> = {}

// Memórias: a história da cidade contada em pedaços, uma por missão
// cumprida, SEMPRE na mesma ordem (qualquer que seja o fio da pessoa) —
// assim a narrativa se monta sozinha, sem ninguém despejar tudo de uma vez.
// Rascunho: o LU2CA reescreve.
export const MEMORIAS = [
  "antes do núcleo a música tocava na rua. ninguém pedia licença pra cantar alto",
  "o núcleo nasceu pra organizar o trânsito. deu tão certo que resolveram organizar as pessoas também: cada uma no seu lado, cada lado com seu inimigo",
  "quem desenhou o núcleo foi o pai da D-Bee. ele achava que tava construindo um metrônomo pra cidade",
  "na noite do primeiro apagão, alguém rodou a linha 9 inteira de kombi, por baixo do trilho, escondendo uma música em cada estação",
  "a kombi que vc dirige é essa. o rádio dela nunca desligou",
  "quem escondeu as músicas nunca saiu da cidade. ficou esperando alguém juntar tudo",
  "a D-Bee sabia desde o começo. por isso ela pergunta 'sabe ontem?' pra todo mundo",
  "o apagão mais longo da história n foi falta de luz. foi excesso. tanta tela acesa que ninguém viu a cidade inteira cantando junto pela última vez",
  "a linha 9 dá a volta e começa de novo, pra sempre. a 222 também n termina: começa de novo em quem ouviu",
]

// ── o fio ────────────────────────────────────────────────────────────

// ordem de preferência das missões pra esta pessoa (desempate dentro da
// mesma área): a própria estação primeiro,
// depois pelas respostas do quiz, com um empurrão pro estilo dela
export function montarFio(pesos: Partial<Record<EstacaoId, number>>, estacaoId: EstacaoId | null, perfil: Perfil | null): EstacaoId[] {
  const nota = (id: EstacaoId) =>
    (pesos[id] ?? 0) + (MISSOES[id]!.estilo === perfil ? 3 : 0) + (id === estacaoId ? 100 : 0)
  const ids = ESTACOES.map((e) => e.id).filter((id) => MISSOES[id])
  // sort estável: empate fica na ordem da linha
  return ids.map((id, i) => ({ id, i, n: nota(id) })).sort((a, b) => b.n - a.n || a.i - b.i).map((x) => x.id)
}

export type Etapa = "chamado" | "busca" | "entrega" | "pegar" | "lugar" | "feita"

// em que pé está uma missão
export function etapaDe(s: Save, id: EstacaoId): Etapa {
  if (s.objetos.includes(id)) return "feita"
  const m = MISSOES[id]
  if (!m || s.pausas[id] === undefined) return "chamado"
  // a coisa no mapa vem primeiro (se tiver); depois o lugar (ou a estação)
  if (m.busca && itensFaltando(s, id) > 0) return "busca"
  if (m.lugar) return m.carona && !s.itens.includes(`carona:${id}`) ? "pegar" : "lugar"
  return "entrega"
}

// onde a pessoa mora/chama (a área em que ela te chama quando você entra)
export function areaDaMissao(id: EstacaoId): FreqId {
  const m = MISSOES[id]!
  if (m.carona) return LUGARES[m.carona].area
  if (m.busca) return m.busca.onde
  return LUGARES[m.lugar!].area
}

export function itensFaltando(s: Save, id: EstacaoId) {
  const m = MISSOES[id]
  if (!m?.busca) return 0
  const b = m.busca
  return b.em.filter((_, k) => !s.itens.includes(`${b.item}:${k}`)).length
}

// em que área está o próximo passo de uma missão já começada: a busca é
// onde a coisa está; a entrega é sempre na estação (cidade neon)
export function areaDoPasso(s: Save, id: EstacaoId): FreqId {
  const m = MISSOES[id]!
  const e = etapaDe(s, id)
  if (e === "pegar") return LUGARES[m.carona!].area
  if (e === "lugar") return LUGARES[m.lugar!].area
  return e === "busca" ? m.busca!.onde : "linha"
}

// a missão que está valendo agora (o foco do HUD e de quem chama):
// 1. uma já começada cujo próximo passo é AQUI, nesta área
// 2. alguém DESTA área que ainda não te chamou (chama agora)
// 3. qualquer outra já começada (o HUD aponta pra ela de longe)
export function ativa(s: Save, nivel: number, agora = Date.now()): EstacaoId | null {
  const area = (s.freq || "linha") as FreqId
  const ok = (id: EstacaoId) => !s.objetos.includes(id) && !!MISSOES[id] && missao(estacao(id), nivel, agora).ok
  const ordem = [...s.fio, ...ESTACOES.map((e) => e.id).filter((id) => !s.fio.includes(id))]
  const comecadas = ordem.filter((id) => ok(id) && s.pausas[id] !== undefined)
  const aqui = comecadas.find((id) => areaDoPasso(s, id) === area)
  if (aqui) return aqui
  const nova = ordem.find((id) => ok(id) && s.pausas[id] === undefined && areaDaMissao(id) === area)
  if (nova) return nova
  return comecadas[0] ?? null
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
  // vai até um LUGAR (a cena acontece lá). pegar = é o ponto da carona
  | { t: "lugar"; missao: EstacaoId; lugar: LugarId; pegar: boolean }

export function alvoDe(s: Save, nivel: number): Alvo | null {
  const id = ativa(s, nivel)
  if (!id) return null
  const e = etapaDe(s, id)
  const m = MISSOES[id]!
  if (e === "busca" && m.busca) { const b = m.busca; return { t: "busca", missao: id, busca: b, faltam: b.em.map((_, k) => k).filter((k) => !s.itens.includes(`${b.item}:${k}`)) } }
  if (e === "pegar") return { t: "lugar", missao: id, lugar: m.carona!, pegar: true }
  if (e === "lugar") return { t: "lugar", missao: id, lugar: m.lugar!, pegar: false }
  if (e === "entrega") return { t: "entrega", missao: id }
  // missão de lugar: o chamado chega sozinho na estrada (não manda pra estação)
  if (e === "chamado") return m.lugar ? null : { t: "visita", missao: id }
  return null
}
