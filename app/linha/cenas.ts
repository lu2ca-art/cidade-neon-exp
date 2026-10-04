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

// `se`: o passo só acontece se a pessoa já fez a missão daquela estação
// (é assim que os mundos colidem: quem já passou pelo bar vê a mulher dos
// copos no camarote da balada)
export type PassoCena =
  | { t: "fala"; de: string; texto: string; se?: EstacaoId }
  // direção de cena, em itálico ("ela sorri. não responde.")
  | { t: "acao"; texto: string; se?: EstacaoId }
  | { t: "nucleo"; texto: string }
  | { t: "escolha"; opcoes: { label: string; tom: Tom; resposta: FalaCena[] }[] }
  // o gesto do lugar (cena.tsx desenha cada um)
  | { t: "gesto"; id: "copos" | "danca" }
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

// ── A CASA DO DREWBOY · a porta · a carona começa ──
CENAS["casa-drewboy"] = {
  lugar: "casa-drewboy",
  missao: "sexta",
  passos: [
    { t: "acao", texto: "AP 222. a luz do quarto acesa, a cortina fechada. um minuto" },
    { t: "acao", texto: "dois minutos. a cortina mexe" },
    { t: "fala", de: "Drewboy", texto: "…vc veio mesmo" },
    { t: "fala", de: "Drewboy", texto: "eu tô de pijama por baixo dessa roupa. só pra vc saber" },
    {
      t: "escolha",
      opcoes: [
        { label: "pode ir de pijama", tom: "dormindo", resposta: [{ de: "Drewboy", texto: "kkkk. ninguém ia reparar mesmo" }] },
        { label: "o que te fez descer?", tom: "acordando", resposta: [{ de: "Drewboy", texto: "o espelho do quarto. cansei de ver só ele" }] },
        { label: "entra. a noite é curta", tom: "acordado", resposta: [{ de: "Drewboy", texto: "…tá. entrei" }] },
      ],
    },
    { t: "acao", texto: "ele entra na kombi. senta no banco da frente. não olha pra trás" },
    { t: "fala", de: "Drewboy", texto: "bora antes que eu desista" },
    { t: "fim" },
  ],
}

// ── A BALADA · coming-of-age · o Drewboy dança sozinho ──
CENAS.balada = {
  lugar: "balada",
  missao: "sexta",
  passos: [
    { t: "acao", texto: "SEXTA. lá dentro, duzentas pessoas e duzentos celulares levantados. ninguém dança. todo mundo filma quem dança" },
    { t: "acao", texto: "no camarote, a mulher do copo. ela olha quem entra como quem escolhe", se: "copo" },
    { t: "acao", texto: "num canto, o Mubarak sozinho. levanta o copo pra vocês e não sorri", se: "copo" },
    { t: "fala", de: "Drewboy", texto: "tá vendo? é isso. todo mundo olhando todo mundo" },
    { t: "nucleo", texto: "pista com baixo engajamento. trocando a música por um anúncio ✓" },
    { t: "acao", texto: "a música corta. entra um anúncio. ninguém abaixa o celular" },
    { t: "fala", de: "Drewboy", texto: "…eu vou dançar" },
    { t: "fala", de: "Drewboy", texto: "n filma" },
    { t: "gesto", id: "danca" },
    { t: "acao", texto: "um por um, os celulares descem. abre uma roda. ele nem percebe: tá de olho fechado" },
    { t: "fala", de: "Drewboy", texto: "…tava todo mundo olhando?" },
    {
      t: "escolha",
      opcoes: [
        { label: "acho que sim", tom: "dormindo", resposta: [{ de: "Drewboy", texto: "e eu nem liguei. isso é novo" }] },
        { label: "e foi ruim?", tom: "acordando", resposta: [{ de: "Drewboy", texto: "n. foi a primeira vez que eu n tava me olhando" }] },
        { label: "olharam. mas pararam de filmar", tom: "acordado", resposta: [{ de: "Drewboy", texto: "…a gente fez isso?" }, { de: "Drewboy", texto: "a D-Bee ia amar ver isso" }] },
      ],
    },
    { t: "fala", de: "Drewboy", texto: "toma. tava no meu bolso a noite toda. rachou quando eu pulei" },
    { t: "ganha", objeto: "sexta", reliquia: "espelho" },
    { t: "fala", de: "Drewboy", texto: "lembrei de uma coisa de ontem. eu tava num show. o chão tremendo, todo mundo pulando junto. depois mais nada" },
    { t: "fala", de: "Drewboy", texto: "se um dia precisar dançar na frente do núcleo, eu danço" },
    { t: "fim" },
  ],
}

export function cenaDe(lugar: LugarId): Cena | null {
  return CENAS[lugar] ?? null
}
