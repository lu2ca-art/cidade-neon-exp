// AS CENAS dos lugares (04/10): o que acontece quando você encosta na vaga
// de um lugar (lugares.ts). Fora do celular: câmera de cinema, legenda na
// tela, escolha nos três tons e, no pico, um GESTO (o momento que quebra o
// loop, feito ali e não num minigame). Arco inteiro: ~/vault/universo/arco.md.
//
// Voz: a de cada personagem (vault/persona/voz.md): minúsculas, sem ponto,
// gíria de SP. "ela" (a mulher dos copos) fala bonito e devagar, como quem
// vende. O Núcleo, corporativo e gentil ✓. Rascunho: o LU2CA reescreve.

import type { EstacaoId } from "./data"
import type { LugarId } from "./lugares"
import type { Tom } from "./roteiros"

// as seis relíquias do ritual do deserto (o jogo original): cada uma nasce
// num lugar e todas se juntam no fim
export type Reliquia = "muda" | "relicario" | "espelho" | "letra" | "lanterna" | "regador"
export const RELIQUIAS: Record<Reliquia, { nome: string; texto: string }> = {
  muda: { nome: "a muda de planta", texto: "nasceu no balcão, no lugar dos copos" },
  relicario: { nome: "o relicário", texto: "uma foto de uma cidade toda verde" },
  espelho: { nome: "o espelho de bolso rachado", texto: "você se vê nele. e sorri" },
  letra: { nome: "a letra escrita à mão", texto: "a chuva não vem, deixa que eu te molho, amor" },
  lanterna: { nome: "a lanterna", texto: "a sua luz. ninguém apaga" },
  regador: { nome: "o regador", texto: "pra cuidar do que vem" },
}

export interface FalaCena { de: string; texto: string }

export type PassoCena =
  | { t: "fala"; de: string; texto: string }
  // direção de cena, em itálico ("ela sorri. não responde.")
  | { t: "acao"; texto: string }
  | { t: "nucleo"; texto: string }
  | { t: "escolha"; opcoes: { label: string; tom: Tom; resposta: FalaCena[] }[] }
  // o gesto do lugar (cena.tsx desenha cada um)
  | { t: "gesto"; id: "copos" }
  | { t: "ganha"; objeto?: EstacaoId; reliquia?: Reliquia }
  // fim: volta pra Kombi. caca = o Núcleo vem atrás na saída
  | { t: "fim"; caca?: boolean }

export interface Cena {
  lugar: LugarId
  missao: EstacaoId
  passos: PassoCena[]
}

export const CENAS: Partial<Record<LugarId, Cena>> = {
  // ── O BAR · noir · Mubarak e a mulher dos copos ──
  bar: {
    lugar: "bar",
    missao: "copo",
    passos: [
      { t: "acao", texto: "o copo. a porta abre sozinha. lá dentro, a mesma música de sempre, no mesmo trecho" },
      { t: "fala", de: "Mubarak", texto: "chegou. senta aí" },
      { t: "fala", de: "Mubarak", texto: "o bar de sempre. o copo de sempre. a noite de sempre" },
      { t: "acao", texto: "atrás do balcão, uma mulher que não parece trabalhar ali. parece se divertir ali" },
      { t: "fala", de: "ela", texto: "você tá com sede. dá pra ver" },
      { t: "fala", de: "ela", texto: "tenho seis aqui. cada um resolve uma coisa. escolhe" },
      { t: "gesto", id: "copos" },
      { t: "acao", texto: "ela sorri. não responde. pela primeira vez, alguém disse não" },
      { t: "acao", texto: "no balcão, onde estavam os copos, uma muda de planta" },
      { t: "ganha", reliquia: "muda" },
      { t: "fala", de: "Mubarak", texto: "…ninguém nunca negou ela" },
      {
        t: "escolha",
        opcoes: [
          { label: "eu só não tava com sede", tom: "dormindo", resposta: [{ de: "Mubarak", texto: "kkkk. ok. vale também" }] },
          { label: "quem é ela?", tom: "acordando", resposta: [{ de: "Mubarak", texto: "ninguém sabe. ela gosta de ver a gente cair" }, { de: "Mubarak", texto: "e gosta mais ainda de quem escapa. cuidado com isso" }] },
          { label: "ela é o filtro desse lugar", tom: "acordado", resposta: [{ de: "Mubarak", texto: "…fala baixo" }, { de: "ela", texto: "eu ouvi" }] },
        ],
      },
      { t: "fala", de: "Mubarak", texto: "ontem esse bar inteiro cantou junto. quarenta pessoas que se odiavam no feed, abraçadas" },
      { t: "fala", de: "Mubarak", texto: "dez minutos depois a cidade apagou" },
      { t: "fala", de: "Mubarak", texto: "toma. achei no fundo de um copo americano. tava guardando pra quem negasse ela" },
      { t: "ganha", objeto: "copo" },
      { t: "nucleo", texto: "o garçom acabou de fazer uma ligação. obrigado por colaborar ✓" },
      { t: "fala", de: "Mubarak", texto: "sai pela frente e acelera. agora" },
      { t: "fim", caca: true },
    ],
  },
}

export function cenaDe(lugar: LugarId): Cena | null {
  return CENAS[lugar] ?? null
}
