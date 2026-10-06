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

// os seis copos do bar (a oferta da mulher dos copos)
export const COPOS = [
  { id: "felicidade", nome: "o copo da felicidade", promessa: "isso vai te fazer esquecer suas dúvidas" },
  { id: "certeza", nome: "o copo da certeza", promessa: "agora você sabe exatamente o que fazer" },
  { id: "liberdade", nome: "o copo da liberdade", promessa: "basta beber pra nunca mais se preocupar com nada" },
  { id: "amor", nome: "o copo do amor", promessa: "isso vai preencher o vazio aí dentro" },
  { id: "grandeza", nome: "o copo da grandeza", promessa: "isso te torna maior que qualquer um aqui" },
  { id: "eternidade", nome: "o copo da eternidade", promessa: "agora você nunca mais vai querer sair" },
]

export interface FalaCena { de: string; texto: string }

// `se`: o passo só acontece se a pessoa já fez a missão daquela estação
// (é assim que os mundos colidem: quem já passou pelo bar vê a mulher dos
// copos no camarote da balada)
// `volta`: "sim" só na 2ª visita em diante (saiu errado da 1ª), "nao" só na 1ª
// `tom`: o passo só acontece pra quem está nesse(s) tom(ns) (o que mais
// respondeu até aqui). `rel`: só pra quem já tem essa relíquia
export type PassoCena =
  | { t: "fala"; de: string; texto: string; se?: EstacaoId; tom?: Tom[]; rel?: Reliquia; volta?: "sim" | "nao" }
  // direção de cena, em itálico ("ela sorri. não responde.")
  | { t: "acao"; texto: string; se?: EstacaoId; tom?: Tom[]; rel?: Reliquia; volta?: "sim" | "nao" }
  | { t: "nucleo"; texto: string }
  | { t: "escolha"; opcoes: { label: string; tom: Tom; resposta: FalaCena[] }[] }
  // o gesto do lugar (cena.tsx desenha cada um)
  | { t: "gesto"; id: "copos" | "danca" | "silencio" | "linha" | "tocar" | "fuga" }
  // pôr frases soltas na ordem (a moradora do beco fala em pedaços)
  | { t: "gesto"; id: "ordem"; frases: string[] }
  // explorar a sala: tocar nas coisas (interior/: o quarto do Drewboy, a casa da D-Bee)
  | { t: "gesto"; id: "quarto" | "casa" | "casa-inicio" }
  // um dos minijogos que já existiam (provas.tsx), agora feito no lugar
  | { t: "gesto"; id: "prova"; prova: ProvaId }
  // titulo/texto: quando o cartão não deve dizer o nome do objeto (o
  // violão do Nectar, que fica no trem)
  | { t: "ganha"; objeto?: EstacaoId; reliquia?: Reliquia; titulo?: string; texto?: string; tom?: Tom[]; neon?: number }
  // o que fica pra trás (o violão no vagão: o app VIOLÃO tranca de novo)
  | { t: "perde"; item: "violao"; texto: string }
  // fim: volta pra Kombi. caca = o Núcleo vem atrás na saída
  | { t: "fim"; caca?: boolean }

export interface Cena {
  lugar: LugarId
  // título no alto da cena, quando o nome do lugar não serve (o começo)
  titulo?: string
  missao: EstacaoId
  passos: PassoCena[]
}

export const CENAS: Partial<Record<LugarId, Cena>> = {
  // ── O BAR · noir · Mubarak e a mulher dos copos ──
  bar: {
    lugar: "bar",
    missao: "copo",
    passos: [
      // 1ª visita: ninguém diz que tem uma saída. Beber é o que o bar espera
      // e leva pra fora com a escolha errada (a cena acaba, a missão fica
      // aberta, o mundo estranha). Só negar a oferta quebra o loop
      { t: "acao", texto: "o copo. a porta abre sozinha. lá dentro, a mesma música de sempre, no mesmo trecho", volta: "nao" },
      { t: "acao", texto: "o copo. a porta abre sozinha. a mesma música. no mesmo trecho. de novo", volta: "sim" },
      { t: "fala", de: "Mubarak", texto: "chegou. senta aí", volta: "nao" },
      { t: "fala", de: "Mubarak", texto: "…voltou. vc percebeu, né? a noite é a mesma", volta: "sim" },
      { t: "fala", de: "Mubarak", texto: "o bar de sempre. o copo de sempre. a noite de sempre", volta: "nao" },
      { t: "acao", texto: "atrás do balcão, uma mulher que não parece trabalhar ali. parece se divertir ali" },
      { t: "fala", de: "ela", texto: "você tá com sede. dá pra ver", volta: "nao" },
      { t: "fala", de: "ela", texto: "voltou. o mesmo copo de novo?", volta: "sim" },
      { t: "fala", de: "ela", texto: "tenho seis aqui. cada um resolve uma coisa. escolhe", volta: "nao" },
      { t: "fala", de: "ela", texto: "ainda tenho seis aqui. ou nenhum. você sabe a diferença agora", volta: "sim" },
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
    { t: "acao", texto: "AP 222. a porta tá destrancada. lá dentro, o quarto escuro, só a luz do espelho" },
    { t: "acao", texto: "ele tá sentado na cama, de frente pro espelho. de costas pra porta" },
    { t: "fala", de: "Drewboy", texto: "…vc veio mesmo" },
    { t: "fala", de: "Drewboy", texto: "eu tô de pijama por baixo dessa roupa. só pra vc saber" },
    { t: "fala", de: "Drewboy", texto: "pode olhar. ninguém entra aqui faz tempo" },
    // explorar o quarto: o espelho, o tênis, a janela (interior/salas/Quarto.tsx)
    { t: "gesto", id: "quarto" },
    {
      t: "escolha",
      opcoes: [
        { label: "pode ir de pijama", tom: "dormindo", resposta: [{ de: "Drewboy", texto: "kkkk. ninguém ia reparar mesmo" }] },
        { label: "o que te fez descer?", tom: "acordando", resposta: [{ de: "Drewboy", texto: "o espelho do quarto. cansei de ver só ele" }] },
        { label: "calça o tênis. a noite é curta", tom: "acordado", resposta: [{ de: "Drewboy", texto: "…tá. calcei" }] },
      ],
    },
    { t: "acao", texto: "ele apaga a luz do espelho. desce a escada na sua frente e senta no banco da frente da kombi" },
    { t: "fala", de: "Drewboy", texto: "bora antes que eu desista" },
    { t: "fim" },
  ],
}

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
    // semente do beco (lugar 3): só se vê lá de cima
    { t: "fala", de: "Notti", texto: "uma coisa estranha: daqui de cima as três ruas brilhantes do mirante dão a volta e voltam pro começo" },
    { t: "fala", de: "Notti", texto: "e no meio delas tem um beco cinza. lá embaixo eu nunca vi ele" },
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

// ── O BECO DOS TRÊS LETREIROS · thriller psicológico · a moradora ──
// Sem missão: aparece depois de dar a volta no mirante (Corrida.tsx conta).
// Ela é o avesso da mulher dos copos: a verdade que ninguém vê
CENAS.beco = {
  lugar: "beco",
  missao: "dopamina",
  passos: [
    { t: "acao", texto: "entre os três letreiros que gritam, um beco cinza. ninguém entra. ninguém nem olha" },
    { t: "acao", texto: "no fundo, uma mulher sentada num papelão, enrolada num cobertor da cor da parede" },
    { t: "fala", de: "a moradora", texto: "vc passou aqui antes" },
    { t: "fala", de: "a moradora", texto: "todo mundo passa. as ruas bonitas dão a volta e devolvem pro começo" },
    { t: "fala", de: "a moradora", texto: "eu falo em pedaço. quem quiser, monta" },
    { t: "gesto", id: "ordem", frases: ["se quiser ver", "pare de procurar", "onde todos olham"] },
    { t: "acao", texto: "ela sorri. tira do cobertor um relicário pequeno, de lata" },
    { t: "ganha", reliquia: "relicario" },
    { t: "fala", de: "a moradora", texto: "dentro tem uma cidade. toda verde. eu nunca fui" },
    {
      t: "escolha",
      opcoes: [
        { label: "é bonita", tom: "dormindo", resposta: [{ de: "a moradora", texto: "é. bonito n basta" }] },
        { label: "onde fica isso?", tom: "acordando", resposta: [{ de: "a moradora", texto: "longe. alguém que vc conhece sabe" }, { de: "a moradora", texto: "a mãe dela sabia" }] },
        { label: "por que vc me dá isso?", tom: "acordado", resposta: [{ de: "a moradora", texto: "pq vc entrou no beco" }, { de: "a moradora", texto: "ninguém entra" }] },
      ],
    },
    // colisão com o bar: as duas pontas da mesma cidade
    { t: "fala", de: "a moradora", texto: "a do bar vende o que brilha. eu guardo o que sobrou. as duas sabem seu nome", se: "copo" },
    { t: "nucleo", texto: "área sem interesse comercial. nada a registrar ✓" },
    { t: "fala", de: "a moradora", texto: "agora vai. e olha pros lados de vez em quando" },
    { t: "fim" },
  ],
}

// ── A CASA DA D-BEE · road movie, ausência, redenção (ep. 3, 30/10) ──
// Você chega depois da viagem (viagem.tsx) e ela não está mais lá. A casa
// vazia fala por ela; o que você acha muda com o tom. O grupo vai chegando
// um a um e, sem ela, a revolta vira movimento. Rascunho: o LU2CA reescreve
// (o fim da frase do bilhete só ele sabe: é a pista do Vol.2)
CENAS["casa-dbee"] = {
  lugar: "casa-dbee",
  missao: "ojala",
  passos: [
    { t: "acao", texto: "uma casa sozinha no fim da estrada. a luz da varanda acesa. a porta aberta" },
    { t: "acao", texto: "ninguém" },
    { t: "acao", texto: "a cama feita às pressas. um violão encostado na parede, sem dono. uma xícara ainda morna" },
    // explorar a casa vazia (interior/salas/CasaDbee.tsx)
    { t: "gesto", id: "casa" },
    { t: "acao", texto: "ela sabia que aqui já não era seguro", tom: ["dormindo"] },
    { t: "acao", texto: "na parede, uma foto: uma mulher sorrindo numa cidade toda verde", tom: ["acordando", "acordado"] },
    { t: "acao", texto: "a mesma cidade do relicário. você tira ele do bolso e compara. é igual", tom: ["acordando", "acordado"], rel: "relicario" },
    { t: "acao", texto: "embaixo do travesseiro, um papel dobrado em quatro", tom: ["acordado"] },
    { t: "fala", de: "o bilhete", texto: "se vc achou isso, eu já fui", tom: ["acordado"] },
    { t: "fala", de: "o bilhete", texto: "entrega pro KIN", tom: ["acordado"] },
    { t: "fala", de: "o bilhete", texto: "fala pra ele que eu lembrei do calendário da lua. a parede da cozinha, os riscos de giz", tom: ["acordado"] },
    { t: "fala", de: "o bilhete", texto: "lua nova a gente plantava. lua cheia a gente", tom: ["acordado"] },
    { t: "acao", texto: "e para aí", tom: ["acordado"] },
    { t: "ganha", titulo: "o bilhete pro KIN", texto: "lua nova a gente plantava. lua cheia a gente…", tom: ["acordado"] },
    // o grupo chega (cada um só se você já foi até ele)
    { t: "acao", texto: "um farol na estrada. depois outro. depois outro" },
    { t: "fala", de: "Ella", texto: "ela n tá, né", se: "chuva" },
    { t: "fala", de: "Notti", texto: "era essa a luz. eu vi lá de cima", se: "dopamina" },
    { t: "fala", de: "Drewboy", texto: "vim de pijama de novo. foi mal", se: "sexta" },
    { t: "fala", de: "Alohan", texto: "ela deixou a porta aberta pra gente entrar.", se: "ontem" },
    { t: "fala", de: "LU2CA", texto: "ela sempre vai antes. pra gente aprender a ir sem ela", se: "nectar" },
    {
      t: "escolha",
      opcoes: [
        { label: "e agora? sem ela?", tom: "dormindo", resposta: [{ de: "Ella", texto: "agora é com a gente" }] },
        { label: "quem lidera agora?", tom: "acordando", resposta: [{ de: "Notti", texto: "ninguém" }, { de: "Notti", texto: "todo mundo" }] },
        { label: "a gente n precisa esperar ela", tom: "acordado", resposta: [{ de: "LU2CA", texto: "…é isso" }, { de: "LU2CA", texto: "ela sabia que a gente ia chegar nisso. por isso foi" }] },
      ],
    },
    { t: "acao", texto: "ninguém combinou. alguém liga o rádio da kombi. a 222 volta, baixinho, numa frequência que ninguém conhecia" },
    { t: "acao", texto: "lá longe, a cidade acende de novo. um bairro de cada vez" },
    { t: "fala", de: "Tony Gordo", texto: "beleza. agora que todo mundo tá aqui. eu tenho um plano" },
    { t: "nucleo", texto: "detectamos uma reunião não autorizada fora do perímetro. obrigado por avisar onde vocês estão ✓" },
    { t: "acao", texto: "no varal, uma camisa da seleção esquecida. você leva" },
    { t: "ganha", objeto: "ojala" },
    { t: "fim" },
  ],
}

// ── O COMEÇO · a casa da D-Bee, longe de tudo (novo começo, 05/10) ──
// O jogo começa aqui, com ela em pessoa. Uma ideia só: lá longe tem uma
// cidade que vai ser apagada, e você é quem pode entrar nela sem ser lido.
// No ep. 3 você volta e a casa está vazia (cenas["casa-dbee"]): a ausência
// pesa porque você já esteve aqui com ela. RASCUNHO: o LU2CA reescreve
// A ABERTURA (05/10): o texto é do LU2CA, como veio (só os acentos
// corrigidos). A Kombi ficou sem combustível em frente à casa (viagem.tsx,
// "deserto"); a história inteira ela conta no caminho, na ligação da reta
export const CENA_INICIO: Cena = {
  lugar: "casa-dbee",
  titulo: "a casa da d-bee",
  missao: "ojala",
  passos: [
    // falas diretas, a partir do guia do LU2CA (06/10: o galão e os 25 NEON
    // nas palavras do LU2CA; ela não avisa que vai ligar, fecha a porta e liga)
    { t: "fala", de: "D-Bee", texto: "Eu sou a D-Bee." },
    { t: "fala", de: "D-Bee", texto: "Nada é por acaso. Na verdade, eu tava te esperando." },
    { t: "fala", de: "D-Bee", texto: "E eu posso te ajudar a sair daqui." },
    { t: "fala", de: "D-Bee", texto: "Agora você é a única pessoa em quem eu posso confiar. Eu sei que você é diferente dos outros." },
    { t: "fala", de: "D-Bee", texto: "Guardei o último galão pra você conseguir chegar até a cidade. Lá você enche o tanque." },
    { t: "fala", de: "D-Bee", texto: "Toma aqui. Você vai precisar!" },
    { t: "ganha", titulo: "+25 neon", neon: 25 },
    { t: "fim" },
  ],
}
