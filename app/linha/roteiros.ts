// Roteiros das conversas da Linha 222.
//
// Regra de escrita (vault/persona/voz.md): minúsculas, gíria de SP escrita
// de chat, ironia seca, verso de vez em quando, nunca didático, nunca
// publicitário. O NÚCLEO fala o oposto disso: corporativo, gentil, ✓.
//
// Vídeos do LU2CA não entram nas conversas: moram no //LOOP (30/09).
//
// Regra de ritmo (03/10): a PRIMEIRA conversa é o grupo da 222, onde a
// resistência discute a cidade, cada um do seu jeito — o foco não é quem
// chegou, a pessoa nova passa quase despercebida. Depois a D-Bee chama no
// privado (o quiz), o LU2CA chama pro violão (a 1ª missão) e daí em diante
// quem mora em cada área chama quando você entra nela. Ninguém repete "te
// achei no grupo": cada um abre com o que defende, com a história dele.
// Ninguém passa a vez pra ninguém; às vezes um cita o outro.
//
// A ESPINHA (03/10): o Núcleo não manda com arma, manda SEPARANDO. Divide a
// cidade em lados, dá pra cada lado um inimigo e um feed, e apaga quem sente
// demais. A música é a única coisa que junta quem ele separou: por isso ele
// caça. Toda conversa tem quatro batidas, além do drama da pessoa:
//   1. o que o Núcleo tirou DELA (a ferida é um crime do sistema, não azar)
//   2. uma peça do "ontem" (cada um lembra um pedaço do apagão)
//   3. o pedido (a missão)
//   4. o juramento: ela entra na resistência, com medo mesmo
// A D-Bee conta no grupo: "3 de 9". Quando forem nove, a gente entra.
//
// Rascunho — o LU2CA reescreve na voz de cada pessoa real por trás dos
// personagens.

import type { EstacaoId, ProvaId } from "./data"
import type { Perfil } from "./missoes"

export type ChatId = "abertura" | "grupo" | EstacaoId

export interface Ctx {
  nome: string
  objetos: number
  estacao: EstacaoId | null
  ontemLancada: boolean
  // quem vem depois no fio (o personagem), pra D-Bee apontar
  primeira: string | null
}

type Texto = string | ((c: Ctx) => string)
// fala de outra pessoa no grupo: "Ella: oi" vira { de: "Ella", texto: "oi" }
export type Fala = Texto | { de: string; texto: Texto }

// os três tons de resposta do player (03/10): quem ainda DORME (não sabe
// como chegou ali), quem tá ACORDANDO (curioso, quer descobrir) e quem já tá
// ACORDADO (sabe o que tá acontecendo). Toda escolha nas missões tem os três;
// quem responde reage ao tom. O jogo conta (save.tons) e mede (PostHog).
export type Tom = "dormindo" | "acordando" | "acordado"

export interface Opcao {
  label: string
  tom?: Tom
  resposta?: Fala[]
  // pesos da leitura (qual estação a pessoa é)
  peso?: Partial<Record<EstacaoId, number>>
  // como ela gosta de jogar (ordena o fio de missões)
  perfil?: Perfil
}

export type Passo =
  | { t: "msg"; texto: Texto; de?: string }
  | { t: "nucleo"; texto: string }
  | { t: "sistema"; texto: string }
  | { t: "audio"; src: string; titulo: string; de?: string }
  | { t: "video"; src: string; legenda?: string; de?: string }
  // nota de voz: toca por cima da música (que abaixa), dá pra ouvir
  // dirigindo. Sem src = rascunho, sai na voz do navegador lendo `fala`
  | { t: "voz"; fala: string; src?: string; de?: string }
  // a pessoa manda um vídeo do //LOOP: chega como notificação do app
  // video: o id do vídeo no feed do //LOOP (app/tiktok/feed) — abre nele
  | { t: "loop"; titulo: string; video?: number; de?: string }
  | { t: "escolha"; opcoes: Opcao[]; de?: string; pergunta?: string }
  | { t: "input"; chave: "nome" | "linha"; placeholder: string; resposta: (v: string) => Fala[] }
  | { t: "prova"; id: ProvaId }
  // a conversa para aqui até a pessoa buscar a coisa no mapa (missoes.ts)
  | { t: "tarefa" }
  // a crise passou: a conversa espera você DESCER na estação (a virada
  // acontece lá, na prova — abrir pelo celular de longe não pula isso)
  | { t: "chegar" }
  // objeto + recompensas + memória
  | { t: "objeto" }
  // a conversa para aqui: o resto acontece num LUGAR da cidade (a cena)
  | { t: "lugar" }
  // passa a vez pro próximo do fio
  | { t: "gancho" }
  | { t: "revelacao" }
  // a D-Bee manda fazer a leitura NECTAR (/nectar): a conversa espera e, na
  // volta, a faixa da leitura vira a estação da pessoa
  | { t: "leitura" }
  // a D-Bee dá o violão (abre o app VIOLÃO)
  | { t: "presente" }
  | { t: "fim"; para?: ChatId | "mapa" | "missao" }

export interface Roteiro {
  contato: string
  status: string
  grupo?: boolean
  passos: Passo[]
}

// Cor de cada voz no grupo — a mesma da estação de cada um
export const VOZES: Record<string, string> = {
  "222 FM": "#ff3fb0",
  "NÚCLEO": "#e6f0ff",
  "D-Bee": "#3d7bff",
  Ella: "#2fe8ff",
  Mubarak: "#ff6a35",
  Notti: "#5dffa0",
  Drewboy: "#ff3fb0",
  Alohan: "#ffc857",
  LU2CA: "#b38cff",
  "Tony Gordo": "#ffe14d",
  Nizzy: "#ff5b5b",
}

export const ROTEIROS: Record<"abertura" | "grupo" | "chuva" | "copo" | "dopamina" | "sexta" | "ontem" | "nectar", Roteiro> = {
  // A D-Bee e só ela. Cinco perguntas rápidas, a estação, e a primeira
  // pessoa do fio já te chamando. O resto da história fica pras memórias.
  abertura: {
    contato: "D-Bee",
    status: "sinal instável",
    passos: [
      { t: "msg", texto: "sou eu. a da ligação" },
      { t: "msg", texto: "rápido, antes que ele leia" },
      { t: "nucleo", texto: "esta conversa foi classificada como improdutiva. recomendamos voltar ao feed ✓" },
      { t: "msg", texto: "ignora. ele fala isso pra todo mundo" },
      { t: "msg", texto: "como te chamam aí fora?" },
      {
        t: "input", chave: "nome", placeholder: "seu nome ou apelido",
        resposta: (v) => [`${v}.`, "vou lembrar. aqui dentro isso já é muito"],
      },
      { t: "msg", texto: "guarda o meu: D-Bee. o resto o núcleo apaga" },
      { t: "msg", texto: "antes de te soltar na cidade, a cidade precisa te ler" },
      { t: "msg", texto: "sete perguntas. responde no impulso, o primeiro é o que conta" },
      { t: "leitura" },
      { t: "msg", texto: "ok. já sei quem vc é" },
      { t: "msg", texto: "a kombi é sua. agora escuta, que eu só falo uma vez" },
      { t: "msg", texto: "o núcleo n manda em ninguém com arma. manda separando" },
      { t: "msg", texto: "divide a cidade em dois lados, dá um inimigo pra cada lado e um feed pra cada um. pronto. ninguém mais conversa com ninguém" },
      { t: "nucleo", texto: "conteúdos do lado oposto foram ocultados para o seu conforto ✓" },
      { t: "msg", texto: "e quem sente demais ele apaga. ontem foi isso" },
      { t: "msg", texto: "a linha 9 tem nove estações. em cada uma, alguém que ele quebrou e uma música que ele calou. música junta gente que n devia se juntar. por isso ele caça" },
      { t: "msg", texto: "a gente devolve uma por uma. quando as nove tocarem na rua, a gente entra no núcleo" },
      {
        t: "escolha",
        opcoes: [
          { label: "eu tô com medo", tom: "acordando", resposta: ["ótimo. eu também", "quem n tem medo já foi otimizado"] },
          { label: "isso n tem nada a ver comigo", tom: "dormindo", resposta: ["tem. vc chegou aqui, n chegou?", "ninguém chega por acaso"] },
          { label: "então bora. hoje", tom: "acordado", resposta: ["calma kkk", "mas bora"] },
        ],
      },
      { t: "msg", texto: "toma. era de alguém que eu amo. ele n tá podendo tocar agora" },
      { t: "presente" },
      { t: "msg", texto: "tá no teu celular, no app VIOLÃO. aqui tudo que vc ganha serve pra alguma coisa. usa" },
      { t: "msg", texto: "faz três anos que ninguém novo aparece nessa cidade. todo mundo viu vc chegar" },
      { t: "msg", texto: "vão te chamar. cada canto da cidade tem alguém esperando" },
      { t: "fim", para: "missao" },
    ],
  },

  // A PRIMEIRA conversa: o grupo da 222 discutindo a cidade. Quem acabou
  // de chegar só lê. Cada um do seu jeito (a voz de cada um: voz.md)
  grupo: {
    contato: "222",
    status: "D-Bee, Mubarak, Notti, Ella, Drewboy, Alohan, Tony Gordo, Nizzy",
    grupo: true,
    passos: [
      { t: "sistema", texto: "você entrou no grupo \"222\" por um link da rádio" },
      { t: "msg", de: "D-Bee", texto: "pauta de hoje: a linha 9 agora roda 24h" },
      { t: "msg", de: "Tony Gordo", texto: "24h?? e quem dorme" },
      { t: "msg", de: "Notti", texto: "NINGUÉM DORME. ninguém dorme faz tempo" },
      { t: "msg", de: "D-Bee", texto: "ela leva as pessoas pras dependências do núcleo. entra gente, sai gente igual" },
      { t: "msg", de: "Mubarak", texto: "sai gente feliz ✓" },
      { t: "msg", de: "Ella", texto: "n tem graça, Mubarak" },
      { t: "msg", de: "Mubarak", texto: "tem um pouco" },
      { t: "nucleo", texto: "esta conversa reúne usuários de lados incompatíveis. recomendamos silenciar os demais participantes ✓" },
      { t: "msg", de: "Drewboy", texto: "lados kkkk a gente nem se encontra pessoalmente" },
      { t: "msg", de: "Alohan", texto: "eles precisam que a gente brigue. gente brigando não canta junto." },
      { t: "msg", de: "D-Bee", texto: "por isso a música. toda vez que uma toca na rua, ele perde um pouco" },
      { t: "msg", de: "Notti", texto: "então bora tocar TODAS. agora" },
      { t: "msg", de: "Tony Gordo", texto: "calma. se a gente seguir o roteiro que eu fiz…" },
      { t: "msg", de: "Mubarak", texto: "lá vem" },
      { t: "msg", de: "Tony Gordo", texto: "…uma música por estação. nove estações, nove músicas. aí a gente entra" },
      { t: "msg", de: "Ella", texto: "e quem tá preso? n adianta tocar se a pessoa n consegue ouvir" },
      { t: "msg", de: "D-Bee", texto: "por isso uma de cada vez. ninguém sai do loop sozinho" },
      { t: "msg", de: "Nizzy", texto: "eu saí uma vez." },
      { t: "msg", de: "Nizzy", texto: "voltei." },
      { t: "msg", de: "Alohan", texto: "anotado." },
      { t: "msg", de: "D-Bee", texto: "a gente precisa de gente nova. faz três anos que ninguém entra nessa cidade" },
      { t: "msg", de: "Mubarak", texto: "e quando entra o núcleo pega primeiro" },
      { t: "msg", de: "Ella", texto: "às vezes n" },
      { t: "fim", para: "abertura" },
    ],
  },

  chuva: {
    contato: "Ella",
    status: "o lugar escondido",
    passos: [
      { t: "msg", texto: (c) => `oi ${c.nome}` },
      { t: "msg", texto: (c) => (c.estacao === "chuva" ? "vc anda na chuva sem pressa. igual quem é daqui" : "vc é a primeira pessoa nova que eu vejo andando na chuva sem pressa") },
      { t: "voz", fala: "aqui chove faz três anos. o núcleo chama de instabilidade climática. eu chamo de chuva mesmo" },
      {
        t: "escolha",
        opcoes: [
          { label: "chove? nem tinha reparado", tom: "dormindo", resposta: ["ninguém repara", "é por isso que n para"] },
          { label: "a chuva é sua, né", tom: "acordado", resposta: ["…", "quem te contou?", "deixa. ainda n tô pronta pra falar disso"] },
          { label: "três anos?? como vc aguenta", tom: "acordando", resposta: ["n aguento", "só deixo molhar. faz diferença"] },
        ],
      },
      { t: "msg", texto: "três anos atrás eu perdi alguém" },
      { t: "nucleo", texto: "luto público reduz a produtividade do bairro. recomendamos processar a perda em privado ✓" },
      { t: "msg", texto: "chegou isso no dia. aí eu engoli. e desde aquele dia chove" },
      { t: "msg", texto: "coincidência, né" },
      { t: "msg", texto: "achei esse no loop. é a rua daqui, antes" },
      { t: "loop", titulo: "POV: vc descobriu a cidade neon e nunca mais voltou", video: 2 },
      { t: "msg", texto: "nasceu uma flor no asfalto aqui na frente" },
      { t: "msg", texto: "ironia: chove o dia inteiro e ela tá morrendo de sede. a chuva daqui vem com neon dentro" },
      { t: "msg", texto: "tem uma caixa d'água no subúrbio xenom que o núcleo esqueceu. água de verdade" },
      { t: "msg", texto: "meu cantil tá vazio. enche lá pra mim?" },
      { t: "tarefa" },
      // ATO 2 · deserto (CHUVA C2): ela desiste antes de você chegar
      { t: "msg", texto: "fui ver a flor de novo" },
      { t: "msg", texto: "tá murcha. acho que já era" },
      { t: "msg", texto: "esquece, sério. n quero que vc perca tempo com isso" },
      {
        t: "escolha",
        opcoes: [
          { label: "tô levando mesmo assim", tom: "acordado", resposta: ["…", "tá. vem"] },
          { label: "do que vc tem medo?", tom: "acordando", resposta: ["de cuidar e perder de novo", "da última vez choveu três anos"] },
          { label: "se vc acha melhor…", tom: "dormindo", resposta: ["…", "n. traz. eu só falei por medo"] },
        ],
      },
      // a virada acontece no LUGAR (a cena, cenas.ts), não na estação
      { t: "lugar" },
      { t: "fim", para: "mapa" },
    ],
  },

  // o Mubarak só CHAMA pelo celular. A história dele acontece no bar (O
  // COPO): a cena de lugar em cenas.ts (a mulher dos copos, negar a oferta)
  copo: {
    contato: "Mubarak",
    status: "o bar de sempre",
    passos: [
      { t: "msg", texto: "ah. vc" },
      { t: "msg", texto: (c) => `${c.nome}. nome de quem ainda acredita em coisa` },
      { t: "msg", texto: "aqui o bar fecha e abre no mesmo copo. todo dia igual" },
      {
        t: "escolha",
        opcoes: [
          { label: "e vc fica? por quê?", tom: "acordando", resposta: ["fico", "alguém tem que lembrar como era"] },
          { label: "todo dia igual é ruim?", tom: "dormindo", resposta: ["é o que eles querem que vc pergunte", "e eu nem sei mais a resposta"] },
          { label: "o copo é o loop deles", tom: "acordado", resposta: ["kkk", "cuidado falando assim aqui", "o garçom é do núcleo"] },
        ],
      },
      { t: "nucleo", texto: "Mubarak, sua assinatura MESMA NOITE foi renovada por mais 30 dias ✓" },
      { t: "msg", texto: "ignora" },
      { t: "msg", texto: "vem pro bar. O COPO, na cidade neon, do lado direito da pista" },
      { t: "msg", texto: "encosta devagar na vaga da frente. e se ela te oferecer alguma coisa… sei lá. vc que sabe" },
      { t: "lugar" },
      { t: "fim", para: "mapa" },
    ],
  },

  dopamina: {
    contato: "Notti",
    status: "o terraço do mirante",
    passos: [
      { t: "msg", texto: "OI" },
      { t: "msg", texto: "oi oi" },
      { t: "msg", texto: "desculpa, é que eu tô com 47 abas abertas" },
      { t: "msg", texto: "e o relógio aqui anda duas vezes mais rápido" },
      { t: "nucleo", texto: "você tem 12 notificações não lidas ✓" },
      { t: "msg", texto: "TÁ VENDO" },
      { t: "msg", texto: "vou te mandar um vídeo que eu achei no loop. é tipo a minha cabeça" },
      { t: "loop", titulo: "bastidores, sem contexto. cortes brutos do banco do loop", video: 6 },
      {
        t: "escolha",
        opcoes: [
          { label: "47 é pouco, eu tô com 120", tom: "dormindo", resposta: ["KKKKKK", "viu? é isso", "a gente acha que é normal"] },
          { label: "quem abriu essas abas?", tom: "acordando", resposta: ["…", "boa pergunta", "espera que eu te conto"] },
          { label: "respira", tom: "acordado", resposta: ["fácil falar", "mas tá. uma"] },
        ],
      },
      { t: "msg", texto: "sabe o pior? as abas nem são minhas. o núcleo abre" },
      { t: "msg", texto: "gente acelerada n pensa. quem n pensa n pergunta. quem n pergunta n incomoda" },
      { t: "msg", texto: "eu n lembro mais qual é o som do silêncio" },
      { t: "msg", texto: "dizem que no topo do mirante o sinal do núcleo n chega" },
      { t: "msg", texto: "me encontra lá em cima. o terraço do prédio mais alto do mirante" },
      { t: "msg", texto: "eu vou ter coragem até vc chegar. depois n garanto" },
      // o silêncio é o próprio lugar (a cena do terraço, cenas.ts)
      { t: "lugar" },
      { t: "fim", para: "mapa" },
    ],
  },

  sexta: {
    contato: "Drewboy",
    status: "estação 4 · sexta-feira",
    passos: [
      { t: "msg", texto: (c) => `e aí ${c.nome}` },
      { t: "voz", fala: "sexta-feira e eu em casa. todo mundo postando rolê" },
      {
        t: "escolha",
        opcoes: [
          { label: "o rolê também é feed", tom: "acordado", resposta: ["…", "é. é exatamente isso", "gente filmando gente filmando"] },
          { label: "melhor em casa", tom: "dormindo", resposta: ["é o que eu falo pra mim", "às vezes eu acredito"] },
          { label: "e vc queria tá lá?", tom: "acordando", resposta: ["achava que sim", "aí fui uma vez e fiquei olhando o celular lá também"] },
        ],
      },
      { t: "msg", texto: "o rolê hoje é todo mundo filmando todo mundo. ninguém se olha" },
      { t: "msg", texto: "a D-Bee diz que é de propósito. multidão que n se olha n se junta. e gente junta derruba coisa" },
      { t: "msg", texto: "sabe o que é pior? eu queria sair" },
      { t: "msg", texto: "mas se eu for sozinho eu volto antes de chegar" },
      { t: "msg", texto: "vc tá de kombi né. me busca? moro no subúrbio xenom, AP 222" },
      { t: "msg", texto: "encosta na frente. se eu n descer em 1 minuto, buzina. se eu n descer em 2, desiste" },
      // 1ª parada: a casa dele (a cena da porta, cenas.ts). Depois dela a
      // conversa continua aqui, no caminho (a crise)
      { t: "lugar" },
      // ATO 2 · bateria esgotada (SEXTA C2): no meio da carona ele quer voltar
      { t: "msg", texto: "para" },
      { t: "msg", texto: "volta. me deixa em casa. foi uma ideia ruim" },
      { t: "msg", texto: "todo mundo vai me olhar" },
      {
        t: "escolha",
        opcoes: [
          { label: "se quiser eu volto", tom: "dormindo", resposta: ["…", "n. segue. se eu voltar agora eu nunca mais saio"] },
          { label: "o que vc acha que vai acontecer?", tom: "acordando", resposta: ["que vão me olhar", "e eu n vou saber pra onde olhar de volta", "…segue"] },
          { label: "ninguém tá olhando. é só a gente", tom: "acordado", resposta: ["…", "tá. mais um pouco"] },
        ],
      },
      { t: "msg", texto: "a balada é na cidade neon. SEXTA, letreiro rosa. do lado direito" },
      // 2ª parada: a balada (a cena da dança)
      { t: "lugar" },
      { t: "fim", para: "mapa" },
    ],
  },

  ontem: {
    contato: "Alohan",
    status: "a casa de shows",
    passos: [
      { t: "msg", texto: "ei." },
      { t: "msg", texto: "a D-Bee te perguntou se vc sabe ontem, né." },
      { t: "msg", texto: "ela pergunta pra todo mundo. quase ninguém lembra." },
      {
        t: "escolha",
        opcoes: [
          { label: "e vc lembra?", tom: "acordando", resposta: ["lembro.", "por isso escrevo."] },
          { label: "eu também lembro um pedaço", tom: "acordado", resposta: ["…", "então escreve comigo.", "pedaço com pedaço vira dia."] },
          { label: "o que aconteceu ontem?", tom: "dormindo", resposta: ["a gente sonhou alto.", "aí amanheceu."] },
        ],
      },
      { t: "msg", texto: "depois do apagão o núcleo recolheu os cadernos da cidade. de papel e de nuvem." },
      { t: "nucleo", texto: "memórias não verificadas foram removidas para a sua segurança ✓" },
      { t: "msg", texto: "o meu sobrou. mas o vento levou três páginas." },
      { t: "msg", texto: "tão voando pela cidade neon. brilham, dá pra ver de longe." },
      { t: "msg", texto: "são as que eu escrevi ontem, enquanto acontecia. n acho que foi o vento." },
      { t: "msg", texto: "pega pra mim?" },
      { t: "tarefa" },
      { t: "msg", texto: "as três." },
      // ATO 2 · persistência afrontosa (SABE ONTEM? C2): escrever pra ninguém
      { t: "msg", texto: "sabe quantas vezes eu escrevi pra ninguém ler?" },
      { t: "msg", texto: "dez anos. caderno cheio. zero leitor." },
      {
        t: "escolha",
        opcoes: [
          { label: "pra que escrever se ninguém lê?", tom: "dormindo", resposta: ["pra ter onde voltar.", "vem. traz as páginas."] },
          { label: "eu vou ler", tom: "acordado", resposta: ["…", "então vem. antes que eu rasgue."] },
          { label: "e mesmo assim vc continuou?", tom: "acordando", resposta: ["continuei.", "é a única coisa que eu sei fazer direito."] },
        ],
      },
      // a virada acontece no LUGAR (a cena, cenas.ts), não na estação
      { t: "lugar" },
      { t: "fim", para: "mapa" },
    ],
  },

  // A PRIMEIRA missão de todo mundo: ensina que recompensa aqui se USA
  // (o violão vira o app VIOLÃO). A confissão dele (foi ele que escondeu as
  // músicas) fica pro episódio do Nectar, 16/10 — não aqui
  nectar: {
    contato: "LU2CA",
    status: "estação 6 · nectar",
    passos: [
      { t: "msg", texto: (c) => `oi ${c.nome}` },
      { t: "msg", texto: "faz três anos que eu n vejo ninguém novo por aqui. aí aparece uma kombi" },
      { t: "voz", fala: "eu sou o LU2CA. eu faço música numa cidade que transformou música em contrabando" },
      {
        t: "escolha",
        opcoes: [
          { label: "a gente se conhece?", tom: "dormindo", resposta: ["ainda n", "mas eu sei quem vc é"] },
          { label: "o que vc quer comigo?", tom: "acordando", resposta: ["um favor", "e te dar uma coisa, se der certo"] },
          { label: "vc é da 222?", tom: "acordado", resposta: ["sou ouvinte. que nem todo mundo que ainda presta"] },
        ],
      },
      { t: "msg", texto: "ontem eu saí correndo da linha 9 e deixei meu violão debaixo da plataforma, entre a estação 1 e a 2" },
      { t: "msg", texto: "às 2:22 o núcleo recolhe tudo que fica lá. o que ele recolhe vira dado" },
      { t: "msg", texto: "busca pra mim? a estação 6 é aqui" },
      { t: "tarefa" },
      // ATO 2 · tentativa e erro (NECTAR C2): a corda arrebentada
      { t: "msg", texto: "tá com uma corda arrebentada né. eu sabia" },
      { t: "msg", texto: "deixa. com uma corda a menos n vai soar como era" },
      {
        t: "escolha",
        opcoes: [
          { label: "n precisa soar como era", tom: "acordado", resposta: ["…", "isso foi muito eu falando comigo mesmo", "traz"] },
          { label: "dá pra trocar a corda?", tom: "dormindo", resposta: ["n vende corda desde o apagão", "traz assim mesmo"] },
          { label: "toca errado então", tom: "acordando", resposta: ["kkkkk", "tentativa e erro. tá bom. traz"] },
        ],
      },
      { t: "chegar" },
      { t: "msg", texto: "vc achou" },
      { t: "msg", texto: "toca comigo?" },
      { t: "prova", id: "violao" },
      { t: "msg", texto: "tá vendo. n precisava ser perfeito" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/nectar.mp3", titulo: "Nectar · prévia" },
      { t: "msg", texto: "o violão agora é teu. sério" },
      { t: "msg", texto: "abre o celular: tem um app novo, VIOLÃO. acorde, campo harmônico, tocar junto com a rádio" },
      { t: "msg", texto: "aqui tudo que vc ganha serve pra alguma coisa. guarda, usa, empresta" },
      { t: "msg", texto: "nectar sai dia 16/10. vc ouviu antes" },
      { t: "msg", texto: "agora roda. tem gente em todo canto dessa cidade esperando alguém que ainda sente" },
      { t: "fim", para: "mapa" },
    ],
  },
}

// Ecos: o grupo reage quando a pessoa fecha uma missão — e quem você ajudou
// ENTRA no grupo nessa hora. Só falam a D-Bee e quem já está lá.
export const ECOS: Partial<Record<EstacaoId, { de: string; texto: Texto }[]>> = {
  chuva: [
    { de: "Ella", texto: "oi gente. a flor abriu 🌊" },
    { de: "D-Bee", texto: "bem-vinda, Ella" },
  ],
  copo: [
    { de: "Mubarak", texto: (c) => `${c.nome} achou a frequência do mp3` },
    { de: "D-Bee", texto: "manda o áudio aqui" },
    { de: "Mubarak", texto: "não" },
  ],
  dopamina: [
    { de: "Notti", texto: "OI GRUPO" },
    { de: "Notti", texto: "eu respirei. 3 vezes" },
    { de: "D-Bee", texto: "orgulho" },
  ],
  sexta: [
    { de: "Drewboy", texto: "saí de casa" },
    { de: "Drewboy", texto: (c) => `${c.nome} me buscou de kombi` },
    { de: "D-Bee", texto: "e aí, gostou do espelho?" },
    { de: "Drewboy", texto: "tô gostando" },
  ],
  ontem: [
    { de: "Alohan", texto: (c) => `${c.nome} escreveu no caderno.` },
    { de: "D-Bee", texto: "deixa eu ler" },
    { de: "Alohan", texto: "não." },
  ],
  nectar: [
    { de: "LU2CA", texto: "oi gente" },
    { de: "D-Bee", texto: (c) => `foi ${c.nome} que trouxe` },
  ],
}

// Textos da revelação da estação, na voz de quem é "dono" dela
export const BOAS_VINDAS: Record<EstacaoId, string> = {
  chuva: "eu sabia. vc deixa molhar",
  copo: "vc lembra como era. isso pesa, mas é bom",
  dopamina: "SABIA. vc é acelerade que nem eu",
  sexta: "vc se basta. mesmo quando duvida",
  ontem: "vc guarda os dias. alguém precisa guardar.",
  nectar: "vc não tem vergonha de sentir. isso é raro",
  ojala: "vc ama sabendo que acaba. minha estação",
  swav: "vc tem coragem de fazer barulho",
  rollercoaster: "vc sobe sabendo que vai cair",
}
