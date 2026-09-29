// Roteiros das conversas da Linha 222.
//
// Regra de escrita (vault/persona/voz.md): minúsculas, gíria de SP escrita
// de chat, ironia seca, verso de vez em quando, nunca didático, nunca
// publicitário. O NÚCLEO fala o oposto disso: corporativo, gentil, ✓.
//
// Rascunho — o LU2CA reescreve na voz de cada pessoa real por trás dos
// personagens.

import type { EstacaoId, ProvaId } from "./data"

export type ChatId = "abertura" | "grupo" | EstacaoId

export interface Ctx {
  nome: string
  objetos: number
  estacao: EstacaoId | null
  ontemLancada: boolean
}

type Texto = string | ((c: Ctx) => string)
// fala de outra pessoa no grupo: "Ella: oi" vira { de: "Ella", texto: "oi" }
export type Fala = Texto | { de: string; texto: Texto }

export interface Opcao {
  label: string
  resposta?: Fala[]
  // pesos da leitura (qual estação a pessoa é)
  peso?: Partial<Record<EstacaoId, number>>
}

export type Passo =
  | { t: "msg"; texto: Texto; de?: string }
  | { t: "nucleo"; texto: string }
  | { t: "sistema"; texto: string }
  | { t: "audio"; src: string; titulo: string; de?: string }
  | { t: "video"; src: string; legenda?: string; de?: string }
  | { t: "escolha"; opcoes: Opcao[]; de?: string; pergunta?: string }
  | { t: "input"; chave: "nome" | "linha"; placeholder: string; resposta: (v: string) => Fala[] }
  | { t: "prova"; id: ProvaId }
  | { t: "objeto" }
  | { t: "revelacao" }
  | { t: "fim"; para?: ChatId | "mapa" }

export interface Roteiro {
  contato: string
  status: string
  grupo?: boolean
  passos: Passo[]
}

// Cor de cada voz no grupo — a mesma da estação de cada um
export const VOZES: Record<string, string> = {
  "D-Bee": "#3d7bff",
  Ella: "#2fe8ff",
  Mubarak: "#ff6a35",
  Notti: "#5dffa0",
  BBX: "#ff3fb0",
  Alohan: "#ffc857",
  LU2CA: "#b38cff",
  "Tony Gordo": "#ffe14d",
  Nizzy: "#ff5b5b",
}

export const ROTEIROS: Record<"abertura" | "grupo" | "chuva" | "copo" | "dopamina" | "sexta" | "ontem" | "nectar", Roteiro> = {
  abertura: {
    contato: "[desconhecido]",
    status: "sinal instável",
    passos: [
      { t: "msg", texto: "sabe ontem?" },
      { t: "msg", texto: "vc tava lá" },
      {
        t: "escolha",
        opcoes: [
          { label: "quem é vc?", resposta: ["alguém que ainda lembra"] },
          { label: "lembro sim", resposta: ["mentira kkkk", "ninguém lembra. o núcleo apaga tudo que não vira métrica"] },
          { label: "ontem eu só rolei o feed", resposta: ["exato", "é assim que eles apagam"] },
        ],
      },
      { t: "msg", texto: "a cidade tá alagada de neon. o povo anda em loop e acha que é vida" },
      { t: "nucleo", texto: "esta conversa foi classificada como improdutiva. recomendamos voltar ao feed ✓" },
      { t: "msg", texto: "ignora. ele fala isso pra todo mundo" },
      { t: "msg", texto: "como te chamam aí fora?" },
      {
        t: "input", chave: "nome", placeholder: "seu nome ou apelido",
        resposta: (v) => [`${v}.`, "vou lembrar. aqui dentro isso já é muito"],
      },
      { t: "msg", texto: "eu sou a D-Bee. meu pai ajudou a construir o núcleo" },
      { t: "msg", texto: "tô do lado de dentro. por isso consigo te mandar isso" },
      { t: "audio", src: "/audio/dbee-call.mp3", titulo: "áudio" },
      { t: "video", src: "/videos/loop/passaros.mp4", legenda: "a cidade vista daqui de cima" },
      { t: "msg", texto: "tem uma linha de metrô que ainda roda. a 222" },
      { t: "msg", texto: "nove estações. cada uma guarda uma música que o núcleo quer abafar" },
      { t: "msg", texto: "e todo mundo que acorda aqui pertence a uma delas" },
      { t: "msg", texto: "bora descobrir a sua. vou te colocar no grupo" },
      { t: "fim", para: "grupo" },
    ],
  },

  // A leitura: cada pessoa acordada faz uma pergunta e reage à resposta.
  // Os pesos somam por estação; a maior vira a estação da pessoa.
  grupo: {
    contato: "linha 222",
    status: "D-Bee, Ella, Mubarak, Notti, BBX, Alohan",
    grupo: true,
    passos: [
      { t: "sistema", texto: "D-Bee adicionou você" },
      { t: "msg", de: "D-Bee", texto: (c) => `gente, ${c.nome}. acordou agora` },
      { t: "msg", de: "Notti", texto: "OI" },
      { t: "msg", de: "Notti", texto: "bem-vinde bem-vinde" },
      { t: "msg", de: "Mubarak", texto: "mais um" },
      { t: "msg", de: "Ella", texto: "calma, deixa a pessoa respirar" },
      { t: "msg", de: "D-Bee", texto: "cada um faz uma pergunta. no fim a gente sabe de qual estação vc é" },
      { t: "msg", de: "Alohan", texto: "responde rápido. o primeiro impulso é o que conta." },
      {
        t: "escolha", de: "Ella", pergunta: "tá chovendo lá fora. vc…",
        opcoes: [
          { label: "abre a janela pra ouvir", peso: { chuva: 2, sexta: 1 }, resposta: [{ de: "Ella", texto: "aaah. gostei de vc" }] },
          { label: "coloca fone e finge que é clipe", peso: { ontem: 2, ojala: 1 }, resposta: [{ de: "Alohan", texto: "clássico." }] },
          { label: "sai sem guarda-chuva", peso: { rollercoaster: 2, swav: 1 }, resposta: [{ de: "Mubarak", texto: "doido" }, { de: "Ella", texto: "corajoso" }] },
          { label: "nem vi, tava no celular", peso: { dopamina: 2, copo: 1 }, resposta: [{ de: "Notti", texto: "EU TAMBÉM" }] },
        ],
      },
      {
        t: "escolha", de: "Mubarak", pergunta: "sexta, 23h. cê tá onde?",
        opcoes: [
          { label: "no bar de sempre", peso: { copo: 2, ojala: 1 }, resposta: [{ de: "Mubarak", texto: "respeito" }] },
          { label: "em casa, e tá tudo bem", peso: { sexta: 2, chuva: 1 }, resposta: [{ de: "BBX", texto: "tá mesmo?" }, { de: "BBX", texto: "brinks. tmj" }] },
          { label: "num rolê que eu nem sei como cheguei", peso: { rollercoaster: 2, dopamina: 1 }, resposta: [{ de: "Notti", texto: "KKKKK" }] },
          { label: "no carro, rodando sem destino", peso: { nectar: 2, ontem: 1 }, resposta: [{ de: "D-Bee", texto: "isso tem cara de alguém que eu conheço" }] },
        ],
      },
      {
        t: "escolha", de: "Notti", pergunta: "quantas abas abertas agora? seja sincere",
        opcoes: [
          { label: "uma. sou calme", peso: { nectar: 1, chuva: 1 }, resposta: [{ de: "Notti", texto: "mentira" }, { de: "Notti", texto: "me ensina" }] },
          { label: "umas 12", peso: { copo: 1, sexta: 1 }, resposta: [{ de: "Notti", texto: "amador" }] },
          { label: "47 e uma música tocando em alguma", peso: { dopamina: 2, swav: 1 }, resposta: [{ de: "Notti", texto: "gêmeos" }] },
          { label: "perdi a conta faz anos", peso: { rollercoaster: 1, dopamina: 1 }, resposta: [{ de: "Ella", texto: "respira, gente" }] },
        ],
      },
      { t: "nucleo", texto: "detectamos um questionário não autorizado. seus dados já foram coletados, obrigado ✓" },
      { t: "msg", de: "Mubarak", texto: "ô chato" },
      {
        t: "escolha", de: "BBX", pergunta: "o que te dá mais medo?",
        opcoes: [
          { label: "ficar igual pra sempre", peso: { copo: 2, rollercoaster: 1 }, resposta: [{ de: "Mubarak", texto: "…" }] },
          { label: "ser visto de verdade", peso: { sexta: 2, nectar: 2 }, resposta: [{ de: "BBX", texto: "pô. esse é o meu também" }] },
          { label: "o amor acabar", peso: { ojala: 2, chuva: 1 }, resposta: [{ de: "D-Bee", texto: "acaba. e mesmo assim vale" }] },
          { label: "o silêncio", peso: { dopamina: 1, swav: 2 }, resposta: [{ de: "Alohan", texto: "o silêncio é onde a música mora." }] },
        ],
      },
      {
        t: "escolha", de: "Alohan", pergunta: "um sonho que vc guarda.",
        opcoes: [
          { label: "tocar pra um estádio", peso: { swav: 2, ojala: 1 } },
          { label: "voltar pra um dia específico", peso: { ontem: 3, copo: 1 } },
          { label: "sumir por um ano", peso: { rollercoaster: 2, dopamina: 1 } },
          { label: "sentir sem vergonha", peso: { nectar: 2, sexta: 1 } },
        ],
      },
      { t: "msg", de: "Alohan", texto: "anotei." },
      {
        t: "escolha", de: "D-Bee", pergunta: "o núcleo te oferece uma vida otimizada. zero erro. vc…",
        opcoes: [
          { label: "aceito, cansei", peso: { dopamina: 1, copo: 1 }, resposta: [{ de: "D-Bee", texto: "honesto. errado, mas honesto" }] },
          { label: "rasgo o contrato", peso: { swav: 2, rollercoaster: 1 }, resposta: [{ de: "Notti", texto: "UAU" }] },
          { label: "pergunto se tem música", peso: { ontem: 1, chuva: 2 }, resposta: [{ de: "D-Bee", texto: "não tem. nunca tem" }] },
          { label: "negocio: só os domingos", peso: { ojala: 2, sexta: 1 }, resposta: [{ de: "Mubarak", texto: "kkkkkk esse é bom" }] },
        ],
      },
      {
        t: "escolha", de: "Ella", pergunta: "última. tem um objeto no chão da estação. vc pega…",
        opcoes: [
          { label: "um caderno molhado", peso: { ontem: 2 } },
          { label: "uma lanterna sem pilha", peso: { swav: 2 } },
          { label: "uma camisa da seleção", peso: { ojala: 2 } },
          { label: "um guarda-chuva quebrado", peso: { rollercoaster: 2, chuva: 1 } },
        ],
      },
      { t: "msg", de: "D-Bee", texto: "ok. a gente já sabe" },
      { t: "msg", de: "Notti", texto: "posso falar? posso falar??" },
      { t: "msg", de: "Ella", texto: "NÃO" },
      { t: "revelacao" },
      { t: "fim", para: "mapa" },
    ],
  },

  chuva: {
    contato: "Ella",
    status: "estação 1 · chuva",
    passos: [
      { t: "msg", texto: (c) => `oi ${c.nome}` },
      { t: "msg", texto: (c) => c.estacao === "chuva" ? "sabia que vc era daqui" : "vc veio. achei que ia ficar só no grupo" },
      { t: "msg", texto: "aqui chove faz três anos. o núcleo chama de instabilidade climática" },
      { t: "msg", texto: "eu chamo de chuva mesmo" },
      {
        t: "escolha",
        opcoes: [
          { label: "vc gosta de chuva?", resposta: ["gosto", "é a única coisa aqui que ninguém consegue otimizar"] },
          { label: "três anos?? como vc aguenta", resposta: ["n aguento", "só deixo molhar. faz diferença"] },
        ],
      },
      { t: "video", src: "/videos/loop/chuva-studio.mp4", legenda: "gravei no dia que parou de doer" },
      { t: "msg", texto: "nasceu uma flor no asfalto aqui na frente" },
      { t: "msg", texto: "ela só abre se alguém der chuva pra ela. me ajuda?" },
      { t: "prova", id: "regar" },
      { t: "msg", texto: "olha isso" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/222-chuva.mp3", titulo: "CHUVA" },
      { t: "msg", texto: "leva ela. no caos também nasce coisa" },
      { t: "fim" },
    ],
  },

  copo: {
    contato: "Mubarak",
    status: "estação 2 · copo americano",
    passos: [
      { t: "msg", texto: "ah. vc" },
      { t: "msg", texto: (c) => `${c.nome}. nome de quem ainda acredita em coisa` },
      { t: "msg", texto: "aqui o bar fecha e abre no mesmo copo. todo dia igual" },
      {
        t: "escolha",
        opcoes: [
          { label: "e vc fica?", resposta: ["fico", "alguém tem que lembrar como era"] },
          { label: "que triste", resposta: ["triste é achar normal"] },
        ],
      },
      { t: "msg", texto: "achei um mp3 no fundo de um copo americano. sério" },
      { t: "msg", texto: "só pega estática. o núcleo embaralha toda frequência livre" },
      { t: "nucleo", texto: "frequências não licenciadas podem causar desconforto ✓" },
      { t: "msg", texto: "sintoniza aí. vc tem a mão melhor que a minha" },
      { t: "prova", id: "sintonia" },
      { t: "msg", texto: "…p***" },
      { t: "msg", texto: "fazia anos que eu n ouvia isso" },
      { t: "objeto" },
      { t: "msg", texto: "fica com ele. eu já decorei" },
      { t: "fim" },
    ],
  },

  dopamina: {
    contato: "Notti",
    status: "estação 3 · dopamina",
    passos: [
      { t: "msg", texto: "OI" },
      { t: "msg", texto: "oi oi" },
      { t: "msg", texto: "desculpa, é que eu tô com 47 abas abertas" },
      { t: "msg", texto: "e o relógio aqui anda duas vezes mais rápido" },
      { t: "nucleo", texto: "você tem 12 notificações não lidas ✓" },
      { t: "msg", texto: "TÁ VENDO" },
      {
        t: "escolha",
        opcoes: [
          { label: "respira", resposta: ["fácil falar"] },
          { label: "eu vivo assim também", resposta: ["eu sei", "todo mundo aqui vive"] },
        ],
      },
      { t: "msg", texto: "a Ella disse que vc sabe desacelerar as coisas" },
      { t: "msg", texto: "me ensina? três respirações. sem olhar as notificações" },
      { t: "prova", id: "respira" },
      { t: "msg", texto: "…" },
      { t: "msg", texto: "o relógio parou" },
      { t: "msg", texto: "pela primeira vez eu ouvi uma música inteira" },
      { t: "audio", src: "/audio/tracks/dopamina.mp3", titulo: "DopaminA" },
      { t: "objeto" },
      { t: "fim" },
    ],
  },

  sexta: {
    contato: "BBX",
    status: "estação 4 · sexta-feira",
    passos: [
      { t: "msg", texto: (c) => `e aí ${c.nome}` },
      { t: "msg", texto: "sexta-feira e eu em casa" },
      { t: "msg", texto: "todo mundo postando rolê" },
      {
        t: "escolha",
        opcoes: [
          { label: "e vc queria tá lá?", resposta: ["achava que sim", "aí fui uma vez e fiquei olhando o celular lá também"] },
          { label: "melhor em casa", resposta: ["é o que eu falo pra mim", "às vezes eu acredito"] },
        ],
      },
      { t: "msg", texto: "tem um espelho aqui que embaçou faz tempo" },
      { t: "msg", texto: "n tenho coragem de limpar. e se eu n gostar de quem tá lá?" },
      { t: "msg", texto: "limpa pra mim?" },
      { t: "prova", id: "espelho" },
      { t: "msg", texto: "…é vc aí?" },
      { t: "msg", texto: "engraçado. parece comigo também" },
      { t: "audio", src: "/audio/tracks/sextafeira.mp3", titulo: "Sexta-Feira" },
      { t: "objeto" },
      { t: "fim" },
    ],
  },

  ontem: {
    contato: "Alohan",
    status: "estação 5 · sabe ontem?",
    passos: [
      { t: "msg", texto: "ei." },
      { t: "msg", texto: "a D-Bee te perguntou se vc sabe ontem, né." },
      { t: "msg", texto: "ela pergunta pra todo mundo. quase ninguém lembra." },
      {
        t: "escolha",
        opcoes: [
          { label: "e vc lembra?", resposta: ["lembro.", "por isso escrevo."] },
          { label: "o que aconteceu ontem?", resposta: ["a gente sonhou alto.", "aí amanheceu."] },
        ],
      },
      { t: "msg", texto: "o vento espalhou uma página do meu caderno." },
      { t: "msg", texto: "junta pra mim. na ordem que soar certo." },
      { t: "prova", id: "caderno" },
      { t: "msg", texto: "isso." },
      { t: "msg", texto: "agora escreve uma linha sua. qualquer coisa. ninguém vai corrigir." },
      {
        t: "input", chave: "linha", placeholder: "sua linha no caderno",
        resposta: () => ["vou guardar do jeito que tá."],
      },
      { t: "audio", src: "/audio/tracks/sabe-ontem.mp3", titulo: "Sabe Ontem?" },
      {
        t: "msg",
        texto: (c) => c.ontemLancada ? "saiu. agora é de todo mundo." : "sai amanhã. vc ouviu antes de todo mundo.",
      },
      { t: "objeto" },
      { t: "fim" },
    ],
  },

  nectar: {
    contato: "LU2CA",
    status: "estação 6 · nectar · prévia",
    passos: [
      { t: "msg", texto: (c) => `oi ${c.nome}` },
      { t: "msg", texto: "sou eu. o cara que fez essa cidade" },
      { t: "msg", texto: "ou que a cidade fez, n sei mais" },
      { t: "msg", texto: (c) => `vc já tem ${c.objetos} objetos. a maioria desiste na primeira notificação` },
      {
        t: "escolha",
        opcoes: [
          { label: "por que vc fez isso?", resposta: ["pq eu tava em loop também", "fazer música foi o jeito que eu achei de acordar"] },
          { label: "o que é nectar?", resposta: ["é o que sobra quando vc para de ter vergonha de sentir"] },
        ],
      },
      { t: "video", src: "/videos/loop/video4.mp4", legenda: "meus irmãos. eles ouvem tudo primeiro" },
      { t: "msg", texto: "tem um violão aqui. toca comigo?" },
      { t: "prova", id: "violao" },
      { t: "msg", texto: "tá vendo. n precisava ser perfeito" },
      { t: "audio", src: "/audio/tracks/nectar.mp3", titulo: "Nectar · prévia" },
      { t: "objeto" },
      { t: "msg", texto: "nectar sai dia 14/10. vc ouviu antes" },
      { t: "msg", texto: "a cidade inteira mora num lugar só. todas as frequências, o live, o instrumental" },
      { t: "msg", texto: "n é produto. é sustentar uma coisa que existe fora do sistema" },
      { t: "fim", para: "mapa" },
    ],
  },
}

// Ecos: o grupo reage quando a pessoa fecha uma missão. Aparecem no hub
// (grupo linha 222) com badge — é o que faz a cidade parecer viva entre
// uma estação e outra.
export const ECOS: Partial<Record<EstacaoId, { de: string; texto: Texto }[]>> = {
  chuva: [
    { de: "Ella", texto: "a flor abriu 🌊" },
    { de: "Mubarak", texto: "a da frente do bar? respeito" },
    { de: "Notti", texto: "FOTO" },
  ],
  copo: [
    { de: "Mubarak", texto: (c) => `${c.nome} achou a frequência do mp3` },
    { de: "BBX", texto: "manda o áudio no grupo" },
    { de: "Mubarak", texto: "não" },
  ],
  dopamina: [
    { de: "Notti", texto: "gente eu respirei" },
    { de: "Notti", texto: "3 vezes" },
    { de: "Ella", texto: "orgulho" },
  ],
  sexta: [
    { de: "BBX", texto: "limparam meu espelho" },
    { de: "D-Bee", texto: "e aí, gostou?" },
    { de: "BBX", texto: "tô gostando" },
  ],
  ontem: [
    { de: "Alohan", texto: (c) => `${c.nome} escreveu no caderno.` },
    { de: "D-Bee", texto: "deixa eu ler" },
    { de: "Alohan", texto: "não." },
  ],
  nectar: [
    { de: "LU2CA", texto: "oi gente" },
    { de: "Notti", texto: "ELE ENTROU NO GRUPO" },
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
