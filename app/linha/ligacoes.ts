// Ligações de voz da Linha 222. Alguém do N3XO liga enquanto você dirige:
// a pessoa fala (canal de voz — a música abaixa e volta), e nas perguntas
// você responde FALANDO uma das opções que aparecem na tela (microfone,
// reconhecimento de voz do navegador). Sem permissão, sem suporte ou sem
// entender: as mesmas opções viram botões. Ninguém fica preso.
//
// Rascunho de texto — o LU2CA reescreve (e grava: `src` em cada fala).
// Mesmas regras de voz dos roteiros: minúsculas, gíria de SP, seco.
//
// MODOS (desde 03/10): cada pessoa do fio entra em contato de um jeito —
// LIGAÇÃO, TEXTO (no painel da Kombi) ou ÁUDIO (as falas viram notas de
// voz) — sorteado, nunca o mesmo duas vezes seguidas. A D-Bee abre com
// ligação. O roteiro é o mesmo (roteiros.ts): ligacaoDaMissao() transforma
// o começo da conversa (até o pedido) numa ligação.

import { ROTEIROS, type Ctx, type Passo, type Tom } from "./roteiros"
import type { EstacaoId } from "./data"

export type Modo = "ligacao" | "texto" | "audio"
export const MODOS: Modo[] = ["ligacao", "texto", "audio"]

// sorteia o jeito da próxima pessoa, sem repetir o anterior
export function sortearModo(anterior: Modo | null): Modo {
  const l = MODOS.filter((m) => m !== anterior)
  return l[Math.floor(Math.random() * l.length)]
}

export interface OpcaoLigacao {
  label: string
  tom?: Tom
  // o que conta como ter dito essa opção (palavras soltas, sem acento)
  palavras: string[]
  resposta: Fala[]
}

export interface Fala { fala: string; src?: string }

export type PassoLigacao =
  | ({ t: "fala" } & Fala)
  | { t: "pergunta"; fala: string; src?: string; opcoes: OpcaoLigacao[] }

export interface Ligacao {
  id: string
  quem: string
  passos: PassoLigacao[]
  // se não atender, chega isso por mensagem
  recado: string
}

export const LIGACOES: Record<string, Ligacao> = {
  // a PRIMEIRA: depois do grupo rolar na ilha, com a cidade cinza. É ela que
  // começa a história (as respostas nos três tons)
  "dbee-0": {
    id: "dbee-0",
    quem: "D-Bee",
    recado: "n atendeu. tudo bem. te escrevi, abre o celular",
    passos: [
      {
        t: "pergunta",
        fala: "alô? é a pessoa nova do grupo?",
        opcoes: [
          { label: "que grupo? onde eu tô?", tom: "dormindo", palavras: ["que", "grupo", "onde", "to", "estou"], resposta: [{ fala: "na cidade neon. numa kombi parada no meio da chuva" }, { fala: "relaxa. ninguém lembra como chegou" }] },
          { label: "sou. quem é?", tom: "acordando", palavras: ["quem", "e", "voce", "vc"], resposta: [{ fala: "a d-bee. a do grupo. liguei porque texto o núcleo lê. voz ainda passa" }] },
          { label: "sou. tava esperando vc ligar", tom: "acordado", palavras: ["esperando", "sabia", "ligar", "ligacao"], resposta: [{ fala: "então vc é dos que lembram" }] },
        ],
      },
      {
        t: "pergunta",
        fala: "sabe ontem?",
        opcoes: [
          { label: "ontem eu só rolei o feed", tom: "dormindo", palavras: ["feed", "rolei", "nada", "nao", "sei"], resposta: [{ fala: "exato. é assim que eles apagam" }] },
          { label: "o que aconteceu ontem?", tom: "acordando", palavras: ["aconteceu", "que", "ontem"], resposta: [{ fala: "vc tava lá. ainda n lembra. vai lembrar" }] },
          { label: "sei. a cidade cantou junto", tom: "acordado", palavras: ["cantou", "junto", "lembro", "musica"], resposta: [{ fala: "faz tempo que eu n ouço alguém dizer isso" }] },
        ],
      },
      { t: "fala", fala: "o núcleo derrubou a 222 agora há pouco. vc viu a cor sumindo" },
      { t: "fala", fala: "vou te escrever. rápido, antes que ele leia. abre o celular" },
    ],
  },

  // a primeira vez na Kombi depois da abertura: a D-Bee liga
  "dbee-1": {
    id: "dbee-1",
    quem: "D-Bee",
    recado: "ok, n atende. mas quando eu ligar de novo, atende. texto o núcleo lê",
    passos: [
      {
        t: "pergunta",
        fala: "alô? tá me ouvindo?",
        opcoes: [
          { label: "tô aqui", palavras: ["aqui", "to", "estou", "sim", "oi", "ouvindo", "alo"], resposta: [{ fala: "boa. o núcleo lê tudo que é texto. voz ainda passa" }] },
          { label: "quem é?", palavras: ["quem", "voce", "vc"], resposta: [{ fala: "a d-bee, né. liguei porque o núcleo lê tudo que é texto. voz ainda passa" }] },
        ],
      },
      {
        t: "pergunta",
        fala: "e aí, tá tocando alguma coisa nessa kombi?",
        opcoes: [
          { label: "tá tocando um vinil", palavras: ["vinil", "disco", "tocando", "sim", "blues", "musica"], resposta: [{ fala: "isso é o que sobrou. a 222 volta aos poucos" }] },
          { label: "não tô ouvindo nada", palavras: ["nao", "nada", "silencio"], resposta: [{ fala: "então aumenta. tem vinil na kombi. a 222 volta aos poucos" }] },
        ],
      },
      { t: "fala", fala: "cada pessoa que vc ajudar, uma música dela volta pro ar" },
      { t: "fala", fala: "vai ter gente te chamando na tela da kombi. responde dirigindo mesmo. e se eu ligar, atende. falou" },
    ],
  },
}

// tira acento e pontuação pra comparar o que a pessoa falou
export function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

// qual opção a frase dita bate mais (null = nenhuma)
export function entender(dito: string, opcoes: OpcaoLigacao[]): number | null {
  const d = ` ${normalizar(dito)} `
  let melhor: number | null = null
  let pontos = 0
  opcoes.forEach((o, i) => {
    let p = 0
    for (const w of o.palavras) if (d.includes(` ${normalizar(w)} `)) p++
    // a frase do botão inteira conta mais
    if (d.includes(normalizar(o.label))) p += 3
    if (p > pontos) { pontos = p; melhor = i }
  })
  return melhor
}

// ── a conversa de missão virando ligação ───────────────────────────
// Do começo do roteiro até o pedido ({ t: "tarefa" }): as falas viram
// voz, a escolha vira pergunta (a última fala antes dela é a pergunta
// falada), e o pedido aceito encerra a ligação. Nota de voz entra como
// fala; vídeo do LOOP e Núcleo ficam de fora (não cabem numa ligação).
const resolver = (t: string | ((c: Ctx) => string), c: Ctx) => (typeof t === "function" ? t(c) : t)

// palavras de uma opção, pro reconhecimento: as do próprio botão
function palavrasDe(label: string) {
  return normalizar(label).split(" ").filter((w) => w.length >= 3)
}

export function ligacaoDaMissao(id: EstacaoId, quem: string, c: Ctx): { lig: Ligacao; tarefa: number } | null {
  const r = ROTEIROS[id as keyof typeof ROTEIROS]
  if (!r) return null
  const tarefa = r.passos.findIndex((p) => p.t === "tarefa")
  if (tarefa < 0) return null
  const passos: PassoLigacao[] = []
  r.passos.slice(0, tarefa).forEach((p: Passo) => {
    if (p.t === "msg") passos.push({ t: "fala", fala: resolver(p.texto, c) })
    else if (p.t === "voz") passos.push({ t: "fala", fala: p.fala, src: p.src })
    else if (p.t === "escolha") {
      const ant = passos[passos.length - 1]
      const fala = p.pergunta ?? (ant?.t === "fala" ? (passos.pop() as Fala).fala : "e aí?")
      passos.push({
        t: "pergunta",
        fala,
        opcoes: p.opcoes.map((o) => ({
          label: o.label,
          tom: o.tom,
          palavras: palavrasDe(o.label),
          resposta: (o.resposta ?? []).map((f) => ({ fala: resolver(typeof f === "object" ? f.texto : f, c) })),
        })),
      })
    }
  })
  return { lig: { id: `missao:${id}`, quem, passos, recado: "n atendeu. te escrevo então" }, tarefa }
}
