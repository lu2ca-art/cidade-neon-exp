// AS CENAS dos lugares (04/10): o que acontece quando você encosta na vaga
// de um lugar (lugares.ts). Fora do celular: câmera de cinema, legenda na
// tela, escolha nos três tons e, no pico, um GESTO (o momento que quebra o
// loop, feito ali e não num minigame). Arco inteiro: ~/vault/universo/arco.md.
//
// Voz: a de cada personagem (vault/persona/voz.md): minúsculas, sem ponto,
// gíria de SP. "ela" (a mulher dos copos) fala bonito e devagar, como quem
// vende. O Núcleo, corporativo e gentil ✓. Rascunho: o LU2CA reescreve.

import type { EstacaoId, ProvaId } from "./data"
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
  | { t: "gesto"; id: "copos" | "danca" | "silencio" | "linha" | "tocar" | "fuga" }
  // um dos minijogos que já existiam (provas.tsx), agora feito no lugar
  | { t: "gesto"; id: "prova"; prova: ProvaId }
  // titulo/texto: quando o cartão não deve dizer o nome do objeto (o
  // violão do Nectar, que fica no trem)
  | { t: "ganha"; objeto?: EstacaoId; reliquia?: Reliquia; titulo?: string; texto?: string }
  // o que fica pra trás (o violão no vagão: o app VIOLÃO tranca de novo)
  | { t: "perde"; item: "violao"; texto: string }
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

// ── O LUGAR ESCONDIDO · drama íntimo · Ella e a flor ──
CENAS.escondido = {
  lugar: "escondido",
  missao: "chuva",
  passos: [
    { t: "acao", texto: "atrás da caixa d'água, um pedaço de asfalto rachado. no meio, uma flor murcha" },
    { t: "fala", de: "Ella", texto: "vc foi até o subúrbio por uma flor" },
    { t: "fala", de: "Ella", texto: "rega devagar" },
    { t: "gesto", id: "prova", prova: "regar" },
    { t: "acao", texto: "a flor levanta. devagar. a chuva em volta diminui, só ali" },
    { t: "fala", de: "Ella", texto: "olha isso" },
    { t: "ganha", objeto: "chuva" },
    { t: "fala", de: "Ella", texto: "no caos também nasce coisa" },
    {
      t: "escolha",
      opcoes: [
        { label: "a chuva parou?", tom: "dormindo", resposta: [{ de: "Ella", texto: "só aqui. só um pouco" }] },
        { label: "por que ela levantou?", tom: "acordando", resposta: [{ de: "Ella", texto: "acho que ela só precisava de alguém que voltasse" }] },
        { label: "a chuva é sua, né", tom: "acordado", resposta: [{ de: "Ella", texto: "…" }, { de: "Ella", texto: "é. um dia eu te conto o resto" }] },
      ],
    },
    { t: "fala", de: "Ella", texto: "sabe o que eu lembro de ontem? uma música tocando alto na rua. todo mundo parou pra ouvir, até quem n se falava. aí apagou" },
    { t: "fala", de: "Ella", texto: "eu n sou de briga. mas quando a hora chegar, eu vou. com medo. chorando se precisar" },
    { t: "nucleo", texto: "luto público reduz a produtividade do bairro. recomendamos processar a perda em privado ✓" },
    { t: "fim" },
  ],
}

// ── O TERRAÇO · drama silencioso · Notti e os 15 segundos ──
CENAS.topo = {
  lugar: "topo",
  missao: "dopamina",
  passos: [
    { t: "acao", texto: "o terraço do prédio mais alto do mirante. a cidade inteira lá embaixo, piscando" },
    { t: "fala", de: "Notti", texto: "MANO vc veio" },
    { t: "fala", de: "Notti", texto: "e se eu ouvir o silêncio e n gostar" },
    { t: "fala", de: "Notti", texto: "e se lá dentro tiver uma coisa que eu tô fugindo faz anos" },
    {
      t: "escolha",
      opcoes: [
        { label: "15 segundos. só isso", tom: "acordando", resposta: [{ de: "Notti", texto: "15 eu aguento" }, { de: "Notti", texto: "acho" }] },
        { label: "aí a gente olha junto", tom: "acordado", resposta: [{ de: "Notti", texto: "tá" }, { de: "Notti", texto: "promete que n vai embora no meio" }] },
        { label: "e se vc só desligar o celular?", tom: "dormindo", resposta: [{ de: "Notti", texto: "kkkk eu já tentei" }, { de: "Notti", texto: "ele liga sozinho" }] },
      ],
    },
    { t: "fala", de: "Notti", texto: "tá. agora. ninguém fala" },
    { t: "gesto", id: "silencio" },
    { t: "acao", texto: "quinze segundos. sem música. sem notificação. só a chuva batendo no terraço" },
    { t: "acao", texto: "lá longe, fora da cidade, onde a estrada acaba, uma luz acesa" },
    { t: "fala", de: "Notti", texto: "…quem mora lá?" },
    { t: "nucleo", texto: "você ficou 15 s offline. está tudo bem com você? ✓" },
    { t: "fala", de: "Notti", texto: "ok. agora me ensina a fazer isso lá embaixo. três respirações, sem olhar notificação" },
    { t: "gesto", id: "prova", prova: "respira" },
    { t: "fala", de: "Notti", texto: "o relógio parou" },
    { t: "ganha", objeto: "dopamina" },
    { t: "fala", de: "Notti", texto: "ah, e ontem: todos os relógios da cidade pararam às 2:22. TODOS. depois voltaram a andar como se nada" },
    { t: "fala", de: "Notti", texto: "conta comigo. eu sou rápida. pra fugir e pra entrar onde n deixam" },
    { t: "fim" },
  ],
}

// ── A CASA DE SHOWS · mistério · Alohan e o caderno ──
CENAS["casa-shows"] = {
  lugar: "casa-shows",
  missao: "ontem",
  passos: [
    { t: "acao", texto: "a casa de shows depois do túnel. o letreiro diz ONTEM. falta uma letra acesa" },
    { t: "acao", texto: "lá dentro, o palco vazio. um poste de luz pisca no meio da pista" },
    { t: "fala", de: "Alohan", texto: "trouxe as três." },
    { t: "fala", de: "Alohan", texto: "agora junta na ordem que soar certo." },
    { t: "gesto", id: "prova", prova: "caderno" },
    { t: "fala", de: "Alohan", texto: "isso." },
    { t: "fala", de: "Alohan", texto: "agora escreve uma linha sua. qualquer coisa. ninguém vai corrigir." },
    { t: "gesto", id: "linha" },
    { t: "fala", de: "Alohan", texto: "vou guardar do jeito que tá." },
    { t: "ganha", objeto: "ontem" },
    { t: "fala", de: "Alohan", texto: "foi aqui. o último show antes do apagão." },
    { t: "fala", de: "Alohan", texto: "na última página de ontem tem uma plateia. uma pessoa ficou até o fim." },
    {
      t: "escolha",
      opcoes: [
        { label: "quem?", tom: "dormindo", resposta: [{ de: "Alohan", texto: "ainda não sei." }] },
        { label: "tem como descobrir?", tom: "acordando", resposta: [{ de: "Alohan", texto: "tem. eu acho. as páginas voltam quando querem." }] },
        { label: "(ficar em silêncio, olhando o palco)", tom: "acordado", resposta: [{ de: "Alohan", texto: "você também sente, né. que conhece esse palco." }] },
      ],
    },
    { t: "fala", de: "Alohan", texto: "o que vocês fizerem, eu escrevo. alguém tem que contar que teve resistência." },
    { t: "acao", texto: "o poste pisca três vezes e apaga. a pista fica no escuro" },
    { t: "nucleo", texto: "apagão programado no setor arena. obrigado pela compreensão ✓" },
    { t: "fim" },
  ],
}

// ── O POSTO · indie, confissão · o LU2CA (ep. 2, 16/10) ──
CENAS.posto = {
  lugar: "posto",
  missao: "nectar",
  passos: [
    { t: "acao", texto: "o posto. o último antes da estrada acabar. a luz fria da loja de conveniência, ninguém atrás do balcão" },
    { t: "acao", texto: "ele tá sentado no meio-fio, do lado da bomba 6" },
    { t: "fala", de: "LU2CA", texto: "esse violão aí. era meu" },
    { t: "fala", de: "LU2CA", texto: "dei pra ela quando a gente era criança. ela sempre devolve pra alguém que precisa" },
    { t: "fala", de: "LU2CA", texto: "vou te contar uma coisa e vc n precisa dizer nada" },
    { t: "fala", de: "LU2CA", texto: "na noite do apagão fui eu que rodei a linha inteira escondendo as músicas" },
    { t: "fala", de: "LU2CA", texto: "e n foi só pra proteger. foi medo. medo de lançar e ninguém ouvir" },
    {
      t: "escolha",
      opcoes: [
        { label: "e agora?", tom: "dormindo", resposta: [{ de: "LU2CA", texto: "agora eu lanço. dia 16. com medo mesmo" }] },
        { label: "medo de quê, exatamente?", tom: "acordando", resposta: [{ de: "LU2CA", texto: "de ser visto de verdade" }, { de: "LU2CA", texto: "e de quem ia caçar as músicas" }] },
        { label: "a gente tá lançando junto", tom: "acordado", resposta: [{ de: "LU2CA", texto: "…" }, { de: "LU2CA", texto: "é. acho que sempre foi isso" }] },
      ],
    },
    { t: "fala", de: "LU2CA", texto: "quem caça as músicas é quem me ensinou a tocar" },
    { t: "fala", de: "LU2CA", texto: "um dia eu te conto. hoje n consigo" },
    { t: "acao", texto: "ele levanta. abre a porta da kombi e senta no banco da frente" },
    { t: "fala", de: "LU2CA", texto: "posto é lugar de passagem. ninguém mora, todo mundo passa. eu fiquei tempo demais aqui" },
    { t: "fala", de: "LU2CA", texto: "bora" },
    { t: "fim" },
  ],
}

// ── O VAGÃO DA LINHA 9 · thriller de fuga (ep. 2, 16/10) ──
CENAS.plataforma = {
  lugar: "plataforma",
  missao: "nectar",
  passos: [
    { t: "fala", de: "LU2CA", texto: "eu fico. vai" },
    { t: "acao", texto: "o trem branco para na estação 6. as portas abrem sozinhas. você entra" },
    { t: "acao", texto: "lá dentro, ninguém olha pra fora. um com a câmera no colo. uma com o caderno fechado. um com o fone sem música" },
    { t: "acao", texto: "artistas. ou o que sobrou deles. o trem vai pras dependências do núcleo, volta, e vai de novo" },
    { t: "acao", texto: "no fundo do vagão, um policial. ele te olha como quem já sabe" },
    { t: "acao", texto: "o violão pesa nas suas costas" },
    { t: "gesto", id: "tocar" },
    { t: "acao", texto: "um por um, eles levantam a cabeça. o da câmera liga a câmera. o do fone tira o fone" },
    { t: "acao", texto: "a moça do caderno abre o caderno, arranca uma página e escreve rápido" },
    { t: "nucleo", texto: "atividade artística não autorizada no vagão 3 ✓" },
    { t: "acao", texto: "o policial levanta" },
    { t: "fala", de: "a moça do caderno", texto: "toma. corre" },
    { t: "ganha", reliquia: "letra", objeto: "nectar", titulo: "a letra escrita à mão", texto: "a chuva não vem, deixa que eu te molho, amor" },
    { t: "gesto", id: "fuga" },
    { t: "acao", texto: "a porta abre na curva. você pula" },
    { t: "perde", item: "violao", texto: "o violão ficou no trem. lá dentro, alguém começa a tocar ele" },
    { t: "nucleo", texto: "eu sei quem você é, 0222." },
    { t: "acao", texto: "o LU2CA te espera na plataforma. não pergunta nada" },
    { t: "fala", de: "LU2CA", texto: "eles ficaram com o violão. tudo bem. era pra ficar" },
    { t: "fala", de: "LU2CA", texto: "os instrumentos agora vêm de outro lugar. procura o GUITAR DRIVER no teu celular" },
    { t: "fim", caca: true },
  ],
}

export function cenaDe(lugar: LugarId): Cena | null {
  return CENAS[lugar] ?? null
}
