// Roteiros das conversas da Linha 222.
//
// Regra de escrita (vault/persona/voz.md): minúsculas, gíria de SP escrita
// de chat, ironia seca, verso de vez em quando, nunca didático, nunca
// publicitário. O NÚCLEO fala o oposto disso: corporativo, gentil, ✓.
//
// Regra de ritmo (desde o fio de missões): ninguém despeja a história. A
// abertura só apresenta a D-Bee e o quiz; cada pessoa aparece quando chega
// a vez dela no fio; o que é a cidade vem aos poucos, nas memórias
// (missoes.ts), uma por missão cumprida.
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

export interface Opcao {
  label: string
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
  | { t: "escolha"; opcoes: Opcao[]; de?: string; pergunta?: string }
  | { t: "input"; chave: "nome" | "linha"; placeholder: string; resposta: (v: string) => Fala[] }
  | { t: "prova"; id: ProvaId }
  // a conversa para aqui até a pessoa buscar a coisa no mapa (missoes.ts)
  | { t: "tarefa" }
  // objeto + recompensas + memória
  | { t: "objeto" }
  // passa a vez pro próximo do fio
  | { t: "gancho" }
  | { t: "revelacao" }
  | { t: "fim"; para?: ChatId | "mapa" | "missao" }

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
  // A D-Bee e só ela. Cinco perguntas rápidas, a estação, e a primeira
  // pessoa do fio já te chamando. O resto da história fica pras memórias.
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
          { label: "lembro sim", resposta: ["mentira kkkk", "ninguém lembra"] },
          { label: "ontem eu só rolei o feed", resposta: ["exato", "é assim que eles apagam"] },
        ],
      },
      { t: "nucleo", texto: "esta conversa foi classificada como improdutiva. recomendamos voltar ao feed ✓" },
      { t: "msg", texto: "ignora. ele fala isso pra todo mundo" },
      { t: "msg", texto: "como te chamam aí fora?" },
      {
        t: "input", chave: "nome", placeholder: "seu nome ou apelido",
        resposta: (v) => [`${v}.`, "vou lembrar. aqui dentro isso já é muito"],
      },
      { t: "msg", texto: "eu sou a D-Bee" },
      { t: "msg", texto: "cinco perguntas, rápido, antes que ele volte. responde sem pensar" },
      {
        t: "escolha", pergunta: "tá chovendo lá fora. vc…",
        opcoes: [
          { label: "abre a janela pra ouvir", peso: { chuva: 2, sexta: 1 }, resposta: ["gostei"] },
          { label: "coloca fone e finge que é clipe", peso: { ontem: 2, ojala: 1 }, resposta: ["clássico"] },
          { label: "sai sem guarda-chuva", peso: { rollercoaster: 2, swav: 1 }, resposta: ["doido. gostei também"] },
          { label: "nem vi, tava no celular", peso: { dopamina: 2, copo: 1 }, resposta: ["honesto"] },
        ],
      },
      {
        t: "escolha", pergunta: "sexta, 23h. cê tá onde?",
        opcoes: [
          { label: "no bar de sempre", peso: { copo: 2, ojala: 1 } },
          { label: "em casa, e tá tudo bem", peso: { sexta: 2, chuva: 1 }, resposta: ["tá mesmo?"] },
          { label: "num rolê que eu nem sei como cheguei", peso: { rollercoaster: 2, dopamina: 1 }, resposta: ["kkkkk"] },
          { label: "no carro, rodando sem destino", peso: { nectar: 2, ontem: 1 }, resposta: ["isso tem cara de alguém que eu conheço"] },
        ],
      },
      {
        t: "escolha", pergunta: "o que te dá mais medo?",
        opcoes: [
          { label: "ficar igual pra sempre", peso: { copo: 2, rollercoaster: 1 } },
          { label: "ser visto de verdade", peso: { sexta: 2, nectar: 2 } },
          { label: "o amor acabar", peso: { ojala: 2, chuva: 1 }, resposta: ["acaba. e mesmo assim vale"] },
          { label: "o silêncio", peso: { dopamina: 1, swav: 2 } },
        ],
      },
      {
        t: "escolha", pergunta: "um sonho que vc guarda.",
        opcoes: [
          { label: "tocar pra um estádio", peso: { swav: 2, ojala: 1 } },
          { label: "voltar pra um dia específico", peso: { ontem: 3, copo: 1 } },
          { label: "sumir por um ano", peso: { rollercoaster: 2, dopamina: 1 } },
          { label: "sentir sem vergonha", peso: { nectar: 2, sexta: 1 } },
        ],
      },
      // a última decide o JEITO de jogar (ordena o fio de missões)
      {
        t: "escolha", pergunta: "última. tem uma kombi lá embaixo com a chave no contato. vc…",
        opcoes: [
          { label: "pisa fundo e vê no que dá", perfil: "estrada", peso: { dopamina: 1, sexta: 1 }, resposta: ["sabia"] },
          { label: "liga o rádio antes de tudo", perfil: "musica", peso: { copo: 1, nectar: 1 }, resposta: ["o rádio dela nunca desligou"] },
          { label: "pergunta de quem é a kombi", perfil: "historia", peso: { ontem: 1, chuva: 1 }, resposta: ["boa pergunta. um dia eu te conto"] },
        ],
      },
      { t: "msg", texto: "ok. já sei" },
      { t: "revelacao" },
      { t: "msg", texto: "a kombi é sua. cada estação da linha 222 guarda uma música que o núcleo quer abafar" },
      { t: "msg", texto: (c) => (c.primeira ? `${c.primeira} já tá sabendo de vc. vai chegar mensagem` : "vai chegar mensagem") },
      { t: "fim", para: "missao" },
    ],
  },

  // O grupo nasce com a D-Bee e vai ganhando gente: cada pessoa que você
  // ajuda entra (ver ECOS). Aqui é só o comecinho, pra quem abrir cedo.
  grupo: {
    contato: "linha 222",
    status: "D-Bee",
    grupo: true,
    passos: [
      { t: "sistema", texto: "D-Bee criou o grupo \"linha 222\"" },
      { t: "msg", de: "D-Bee", texto: "por enquanto é só a gente" },
      { t: "msg", de: "D-Bee", texto: "cada pessoa que vc acordar entra aqui" },
      { t: "fim", para: "mapa" },
    ],
  },

  chuva: {
    contato: "Ella",
    status: "estação 1 · chuva",
    passos: [
      { t: "msg", texto: (c) => `oi ${c.nome}` },
      { t: "msg", texto: (c) => (c.estacao === "chuva" ? "a D-Bee disse que vc é daqui. da chuva" : "a D-Bee me passou teu contato") },
      { t: "msg", texto: "aqui chove faz três anos. o núcleo chama de instabilidade climática" },
      { t: "msg", texto: "eu chamo de chuva mesmo" },
      {
        t: "escolha",
        opcoes: [
          { label: "vc gosta de chuva?", resposta: ["gosto", "é a única coisa aqui que ninguém consegue otimizar"] },
          { label: "três anos?? como vc aguenta", resposta: ["n aguento", "só deixo molhar. faz diferença"] },
        ],
      },
      { t: "msg", texto: "nasceu uma flor no asfalto aqui na frente" },
      { t: "msg", texto: "ironia: chove o dia inteiro e ela tá morrendo de sede. a chuva daqui vem com neon dentro" },
      { t: "msg", texto: "tem uma caixa d'água no subúrbio xenom que o núcleo esqueceu. água de verdade" },
      { t: "msg", texto: "meu cantil tá vazio. enche lá pra mim?" },
      { t: "tarefa" },
      { t: "msg", texto: "vc foi até o subúrbio por uma flor" },
      { t: "msg", texto: "rega devagar" },
      { t: "prova", id: "regar" },
      { t: "msg", texto: "olha isso" },
      { t: "objeto" },
      { t: "video", src: "/videos/loop/chuva-studio.mp4", legenda: "gravei no dia que parou de doer" },
      { t: "audio", src: "/audio/tracks/222-chuva.mp3", titulo: "CHUVA" },
      { t: "msg", texto: "no caos também nasce coisa" },
      { t: "gancho" },
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
      { t: "msg", texto: "tá sem pilha. ninguém vende pilha desde que o núcleo fez tudo recarregar sozinho" },
      { t: "msg", texto: "a conveniência 24h da cidade neon ainda tem umas no fundo da prateleira" },
      { t: "msg", texto: "traz duas. eu pago o café" },
      { t: "tarefa" },
      { t: "msg", texto: "trouxe mesmo" },
      { t: "msg", texto: "ligou. só pega estática. o núcleo embaralha toda frequência livre" },
      { t: "nucleo", texto: "frequências não licenciadas podem causar desconforto ✓" },
      { t: "msg", texto: "sintoniza aí. vc tem a mão melhor que a minha" },
      { t: "prova", id: "sintonia" },
      { t: "msg", texto: "…p***" },
      { t: "msg", texto: "fazia anos que eu n ouvia isso" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/222-copo-americano.mp3", titulo: "Copo Americano" },
      { t: "msg", texto: "fica com ele. eu já decorei" },
      { t: "gancho" },
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
      { t: "msg", texto: "eu n lembro mais qual é o som do silêncio" },
      { t: "msg", texto: "dizem que no topo do mirante o sinal do núcleo n chega" },
      { t: "msg", texto: "grava 10 segundos de silêncio lá pra mim? sério. preciso ouvir" },
      { t: "tarefa" },
      { t: "msg", texto: "vc gravou" },
      { t: "msg", texto: "…" },
      { t: "msg", texto: "ok. agora me ensina a fazer isso aqui embaixo. três respirações, sem olhar notificação" },
      { t: "prova", id: "respira" },
      { t: "msg", texto: "o relógio parou" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/dopamina.mp3", titulo: "DopaminA" },
      { t: "msg", texto: "pela primeira vez eu vou ouvir uma música inteira" },
      { t: "gancho" },
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
      { t: "msg", texto: "sabe o que é pior? eu queria sair" },
      { t: "msg", texto: "mas se eu for sozinho eu volto antes de chegar" },
      { t: "msg", texto: "vc tá de kombi né. me busca? moro no subúrbio xenom" },
      { t: "tarefa" },
      { t: "msg", texto: "valeu pela carona" },
      { t: "msg", texto: "tem um espelho aqui na estação que embaçou faz tempo" },
      { t: "msg", texto: "n tenho coragem de limpar. e se eu n gostar de quem tá lá?" },
      { t: "msg", texto: "limpa pra mim?" },
      { t: "prova", id: "espelho" },
      { t: "msg", texto: "…é vc aí?" },
      { t: "msg", texto: "engraçado. parece comigo também" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/sextafeira.mp3", titulo: "Sexta-Feira" },
      { t: "gancho" },
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
      { t: "msg", texto: "o vento levou três páginas do meu caderno." },
      { t: "msg", texto: "tão voando pela cidade neon. brilham, dá pra ver de longe." },
      { t: "msg", texto: "pega pra mim?" },
      { t: "tarefa" },
      { t: "msg", texto: "as três." },
      { t: "msg", texto: "agora junta na ordem que soar certo." },
      { t: "prova", id: "caderno" },
      { t: "msg", texto: "isso." },
      { t: "msg", texto: "agora escreve uma linha sua. qualquer coisa. ninguém vai corrigir." },
      {
        t: "input", chave: "linha", placeholder: "sua linha no caderno",
        resposta: () => ["vou guardar do jeito que tá."],
      },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/sabe-ontem.mp3", titulo: "Sabe Ontem?" },
      {
        t: "msg",
        texto: (c) => (c.ontemLancada ? "saiu. agora é de todo mundo." : "sai amanhã. vc ouviu antes de todo mundo."),
      },
      { t: "gancho" },
      { t: "fim" },
    ],
  },

  nectar: {
    contato: "LU2CA",
    status: "estação 6 · nectar · prévia",
    passos: [
      { t: "msg", texto: (c) => `oi ${c.nome}` },
      { t: "msg", texto: "sou eu. a D-Bee disse que vc tá juntando as coisas" },
      { t: "msg", texto: (c) => `${c.objetos} objetos. a maioria desiste na primeira notificação` },
      {
        t: "escolha",
        opcoes: [
          { label: "quem é vc?", resposta: ["daqui a pouco vc sabe"] },
          { label: "o que é nectar?", resposta: ["é o que sobra quando vc para de ter vergonha de sentir"] },
        ],
      },
      { t: "msg", texto: "esqueci meu violão na arena. no palco, depois do túnel" },
      { t: "msg", texto: "o núcleo n entra lá. é barulho demais pra ele" },
      { t: "msg", texto: "busca pra mim? a estação 6 é aqui" },
      { t: "tarefa" },
      { t: "msg", texto: "vc achou" },
      { t: "video", src: "/videos/loop/video4.mp4", legenda: "meus irmãos. eles ouvem tudo primeiro" },
      { t: "msg", texto: "toca comigo?" },
      { t: "prova", id: "violao" },
      { t: "msg", texto: "tá vendo. n precisava ser perfeito" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/nectar.mp3", titulo: "Nectar · prévia" },
      { t: "msg", texto: "fui eu. na noite do apagão, rodei a linha inteira escondendo as músicas" },
      { t: "msg", texto: "e fiquei esperando alguém juntar" },
      { t: "msg", texto: "nectar sai dia 14/10. vc ouviu antes" },
      { t: "msg", texto: "a cidade inteira mora num lugar só. todas as frequências, o live, o instrumental" },
      { t: "msg", texto: "n é produto. é sustentar uma coisa que existe fora do sistema" },
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
    { de: "BBX", texto: "saí de casa" },
    { de: "BBX", texto: (c) => `${c.nome} me buscou de kombi` },
    { de: "D-Bee", texto: "e aí, gostou do espelho?" },
    { de: "BBX", texto: "tô gostando" },
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
