// Ligações de voz da Linha 222. Alguém do N3XO liga enquanto você dirige:
// a pessoa fala (canal de voz — a música abaixa e volta), e nas perguntas
// você responde FALANDO uma das opções que aparecem na tela (microfone,
// reconhecimento de voz do navegador). Sem permissão, sem suporte ou sem
// entender: as mesmas opções viram botões. Ninguém fica preso.
//
// Rascunho de texto — o LU2CA reescreve (e grava: `src` em cada fala).
// Mesmas regras de voz dos roteiros: minúsculas, gíria de SP, seco.

export interface OpcaoLigacao {
  label: string
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
