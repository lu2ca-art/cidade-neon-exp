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

  // ── a HISTÓRIA (05–06/10): a D-Bee conta em PARTES, conforme a pessoa anda
  // pela cidade e fecha missões (o suspense segura quem tá lendo). O texto é
  // do LU2CA, em fala direta; cada parte termina num gancho
  // parte 1: na estrada do deserto, saindo da casa dela
  "dbee-historia-1": {
    id: "dbee-historia-1",
    quem: "D-Bee",
    recado: "Depois eu te conto o resto.",
    passos: [
      { t: "fala", fala: "Há alguns anos, a cidade chegou ao seu ápice. Luzes neon por toda parte, o dia e a noite se confundiam." },
      { t: "fala", fala: "Todo o tempo, tudo aceso. Um mundo dos sonhos, sem escuridão." },
      { t: "fala", fala: "Foi assim que, aos poucos, as pessoas foram cegas pelas luzes. E ela foi tomando conta de cada beco e avenida, cada bar, cada esquina." },
      { t: "fala", fala: "Não havia mais nada. Só as luzes." },
      { t: "fala", fala: "Cada vez menos espaço pra sermos vistos. Tudo que era real era perseguido e apagado." },
      { t: "fala", fala: "E aí, então, veio o Núcleo." },
    ],
  },
  // parte 2: depois da primeira missão
  "dbee-historia-2": {
    id: "dbee-historia-2",
    quem: "D-Bee",
    recado: "Depois eu te conto o resto.",
    passos: [
      { t: "fala", fala: "Eles disseram que iam tomar conta da gente, que iam devolver a vida pra nossa cidade. Iam trazer a visão que a gente não tinha há tanto tempo." },
      { t: "fala", fala: "Nós acreditamos. Fomos seus soldados." },
      { t: "fala", fala: "Lutamos pra que não fôssemos mais fantoches, controlados pela máquina. Batalhamos muito em nome dessa organização, que nos prometia o nosso mundo de volta." },
      { t: "fala", fala: "Até que um dia ela se voltou contra nós. E agora controla não só as cidades, mas também aqueles que vivem nelas." },
      { t: "fala", fala: "Eles tiraram a máscara e assumiram o comando. E nos chutaram pra fora da cidade." },
    ],
  },
  // parte 3: depois da segunda missão
  "dbee-historia-3": {
    id: "dbee-historia-3",
    quem: "D-Bee",
    recado: "Depois eu te conto o resto.",
    passos: [
      { t: "fala", fala: "Foi aí que nasceu a 222. Nos arredores da Cidade Neon, onde vivem até hoje todos aqueles que queriam sua vida de volta. E hoje vivem escondidos nas sombras." },
      { t: "fala", fala: "O Núcleo não chega lá. Mas também mantém a gente isolado, como fugitivos. Nada chega até o subúrbio." },
      { t: "fala", fala: "A 222 é um movimento de resistência e de resgate do que foi roubado da gente e levado pra Cidade Neon." },
      { t: "fala", fala: "Arte, música, natureza, vida real. Transformados em mera decoração pros humanos que se tornaram um com a máquina. Se alimentando daquilo que não são mais capazes de produzir." },
      { t: "fala", fala: "A 222 precisa resgatar de volta o que foi roubado. E recuperar aqueles velhos amigos que se perderam entre as luzes e estão presos na cidade." },
    ],
  },
  // parte 4: depois da terceira missão
  "dbee-historia-4": {
    id: "dbee-historia-4",
    quem: "D-Bee",
    recado: "Conto com você!",
    passos: [
      { t: "fala", fala: "Por isso eu preciso de você." },
      { t: "fala", fala: "Seu carro não pode ser rastreado pelo Núcleo. Eles não sabem quem você é. Mas logo vão saber." },
      { t: "fala", fala: "Espero que a gente consiga resgatar o que é nosso a tempo de fugir de lá sem ser pegos." },
      { t: "fala", fala: "No subúrbio eles não chegam. Por isso é importante passar despercebido, ou ser o mais veloz que puder." },
      { t: "fala", fala: "Conto com você!" },
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
  const tarefa = r.passos.findIndex((p) => p.t === "tarefa" || p.t === "lugar")
  if (tarefa < 0) return null
  const passos: PassoLigacao[] = []
  r.passos.slice(0, tarefa).forEach((p: Passo) => {
    if (p.t === "msg") passos.push({ t: "fala", fala: resolver(p.texto, c) })
    else if (p.t === "voz") passos.push({ t: "fala", fala: p.fala, src: p.src })
    // o nome por voz não dá: quem já tem nome ouve a resposta; sem nome, a
    // missão vem por texto (page.tsx)
    else if (p.t === "input" && p.chave === "nome" && c.nome !== "você") p.resposta(c.nome).forEach((f) => passos.push({ t: "fala", fala: resolver(typeof f === "object" ? f.texto : f, c) }))
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
