// Roteiros das conversas da Linha 222.
//
// Regra de escrita (vault/persona/voz.md): minúsculas, gíria de SP escrita
// de chat, ironia seca, verso de vez em quando, nunca didático, nunca
// publicitário. O NÚCLEO fala o oposto disso: corporativo, gentil, ✓.
//
// Vídeos do LU2CA não entram nas conversas: moram no //LOOP (30/09).
//
// Regra de ritmo (desde o fio de missões): ninguém despeja a história. A
// abertura só apresenta a D-Bee e o quiz; cada pessoa aparece quando chega
// a vez dela no fio; o que é a cidade vem aos poucos, nas memórias
// (missoes.ts), uma por missão cumprida.
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
  "222 FM": "#ff3fb0",
  "NÚCLEO": "#e6f0ff",
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
      { t: "msg", texto: "a kombi é sua. agora escuta, que eu só falo uma vez" },
      { t: "msg", texto: "o núcleo n manda em ninguém com arma. manda separando" },
      { t: "msg", texto: "divide a cidade em dois lados, dá um inimigo pra cada lado e um feed pra cada um. pronto. ninguém mais conversa com ninguém" },
      { t: "nucleo", texto: "conteúdos do lado oposto foram ocultados para o seu conforto ✓" },
      { t: "msg", texto: "e quem sente demais ele apaga. ontem foi isso" },
      { t: "msg", texto: "cada estação da linha 222 tem alguém que ele quebrou e uma música que ele quer calar. música junta gente que n devia se juntar. por isso ele caça" },
      { t: "msg", texto: "a gente vai acordar essa gente. uma por uma. quando forem nove, a gente entra no núcleo" },
      {
        t: "escolha",
        opcoes: [
          { label: "eu tô com medo", resposta: ["ótimo. eu também", "quem n tem medo já foi otimizado"] },
          { label: "bora", resposta: ["calma, herói kkk", "mas bora"] },
          { label: "e se der errado?", resposta: ["vai dar errado várias vezes", "a gente vai mesmo assim"] },
        ],
      },
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
      { t: "voz", fala: "aqui chove faz três anos. o núcleo chama de instabilidade climática. eu chamo de chuva mesmo" },
      {
        t: "escolha",
        opcoes: [
          { label: "vc gosta de chuva?", resposta: ["gosto", "é a única coisa aqui que ninguém consegue otimizar"] },
          { label: "três anos?? como vc aguenta", resposta: ["n aguento", "só deixo molhar. faz diferença"] },
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
          { label: "tô levando mesmo assim", resposta: ["…", "tá. vem"] },
          { label: "do que vc tem medo?", resposta: ["de cuidar e perder de novo", "da última vez choveu três anos"] },
        ],
      },
      { t: "chegar" },
      { t: "msg", texto: "vc foi até o subúrbio por uma flor" },
      { t: "msg", texto: "rega devagar" },
      { t: "prova", id: "regar" },
      { t: "msg", texto: "olha isso" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/222-chuva.mp3", titulo: "CHUVA" },
      { t: "msg", texto: "no caos também nasce coisa" },
      { t: "msg", texto: "sabe o que eu lembro de ontem? uma música tocando alto na rua. todo mundo parou pra ouvir, até quem n se falava. aí apagou" },
      { t: "msg", texto: "a D-Bee tá juntando gente, né" },
      { t: "msg", texto: "eu n sou de briga. mas quando ela chamar, eu vou. com medo. chorando se precisar" },
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
      { t: "nucleo", texto: "Mubarak, sua assinatura MESMA NOITE foi renovada por mais 30 dias ✓" },
      { t: "msg", texto: "ignora" },
      { t: "msg", texto: "achei um mp3 no fundo de um copo americano. sério" },
      { t: "voz", fala: "tá sem pilha. ninguém vende pilha desde que o núcleo fez tudo recarregar sozinho" },
      { t: "msg", texto: "a conveniência 24h da cidade neon ainda tem umas no fundo da prateleira" },
      { t: "msg", texto: "traz duas. eu pago o café" },
      { t: "tarefa" },
      // ATO 2 · piada de mau gosto (COPO C2): o sarcasmo de quem se sabota
      { t: "msg", texto: "pensei melhor" },
      { t: "msg", texto: "pra que ouvir de novo. vai doer igual e amanhã o bar abre no mesmo copo" },
      {
        t: "escolha",
        opcoes: [
          { label: "então pq vc guardou o mp3?", resposta: ["…", "boa pergunta. traz logo antes que eu desista"] },
          { label: "e se doer diferente?", resposta: ["kkkk", "ok. traz"] },
        ],
      },
      { t: "chegar" },
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
      { t: "msg", texto: "vou te contar uma de ontem. eu tava nesse bar. o rádio tocou essa música e o bar inteiro cantou junto" },
      { t: "msg", texto: "quarenta pessoas que se odiavam no feed, cantando a mesma coisa. abraçadas" },
      { t: "msg", texto: "dez minutos depois a cidade apagou. vc acha que foi coincidência?" },
      {
        t: "escolha",
        opcoes: [
          { label: "vem com a gente", resposta: ["a D-Bee acha que dá pra ganhar deles", "eu acho que n dá", "…mas se ela for, alguém tem que ir junto pra trazer ela de volta"] },
          { label: "vc tá do lado de quem?", resposta: ["kkkk", "do lado do bar", "pergunta de novo outro dia"] },
        ],
      },
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
      { t: "msg", texto: "vou te mandar um vídeo que eu achei no loop. é tipo a minha cabeça" },
      { t: "loop", titulo: "bastidores, sem contexto. cortes brutos do banco do loop", video: 6 },
      {
        t: "escolha",
        opcoes: [
          { label: "respira", resposta: ["fácil falar"] },
          { label: "eu vivo assim também", resposta: ["eu sei", "todo mundo aqui vive"] },
        ],
      },
      { t: "msg", texto: "sabe o pior? as abas nem são minhas. o núcleo abre" },
      { t: "msg", texto: "gente acelerada n pensa. quem n pensa n pergunta. quem n pergunta n incomoda" },
      { t: "msg", texto: "eu n lembro mais qual é o som do silêncio" },
      { t: "msg", texto: "dizem que no topo do mirante o sinal do núcleo n chega" },
      { t: "msg", texto: "grava 10 segundos de silêncio lá pra mim? sério. preciso ouvir" },
      { t: "tarefa" },
      // ATO 2 · algo de estranho (DOPAMINA C2): o medo do silêncio
      { t: "msg", texto: "MANO" },
      { t: "msg", texto: "e se eu ouvir o silêncio e n gostar" },
      { t: "msg", texto: "e se lá dentro tiver uma coisa que eu tô fugindo faz anos" },
      {
        t: "escolha",
        opcoes: [
          { label: "aí a gente olha junto", resposta: ["tá", "promete que n vai embora no meio"] },
          { label: "15 segundos. só isso", resposta: ["15 eu aguento", "acho"] },
        ],
      },
      { t: "chegar" },
      { t: "msg", texto: "vc gravou" },
      { t: "msg", texto: "…" },
      { t: "msg", texto: "ok. agora me ensina a fazer isso aqui embaixo. três respirações, sem olhar notificação" },
      { t: "prova", id: "respira" },
      { t: "msg", texto: "o relógio parou" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/dopamina.mp3", titulo: "DopaminA" },
      { t: "msg", texto: "pela primeira vez eu vou ouvir uma música inteira" },
      { t: "msg", texto: "ah, e ontem: todos os relógios da cidade pararam às 2:22. TODOS. depois voltaram a andar como se nada" },
      { t: "msg", texto: "o núcleo apagou isso de todo lugar. menos do meu relógio, que é ruim demais pra atualizar kkkk" },
      { t: "msg", texto: "conta comigo. eu sou rápida. pra fugir e pra entrar onde n deixam" },
      { t: "gancho" },
      { t: "fim" },
    ],
  },

  sexta: {
    contato: "BBX",
    status: "estação 4 · sexta-feira",
    passos: [
      { t: "msg", texto: (c) => `e aí ${c.nome}` },
      { t: "voz", fala: "sexta-feira e eu em casa. todo mundo postando rolê" },
      {
        t: "escolha",
        opcoes: [
          { label: "e vc queria tá lá?", resposta: ["achava que sim", "aí fui uma vez e fiquei olhando o celular lá também"] },
          { label: "melhor em casa", resposta: ["é o que eu falo pra mim", "às vezes eu acredito"] },
        ],
      },
      { t: "msg", texto: "o rolê hoje é todo mundo filmando todo mundo. ninguém se olha" },
      { t: "msg", texto: "a D-Bee diz que é de propósito. multidão que n se olha n se junta. e gente junta derruba coisa" },
      { t: "msg", texto: "sabe o que é pior? eu queria sair" },
      { t: "msg", texto: "mas se eu for sozinho eu volto antes de chegar" },
      { t: "msg", texto: "vc tá de kombi né. me busca? moro no subúrbio xenom" },
      { t: "tarefa" },
      // ATO 2 · bateria esgotada (SEXTA C2): no meio da carona ele quer voltar
      { t: "msg", texto: "para" },
      { t: "msg", texto: "volta. me deixa em casa. foi uma ideia ruim" },
      { t: "msg", texto: "todo mundo vai me olhar" },
      {
        t: "escolha",
        opcoes: [
          { label: "ninguém tá olhando. é só a gente", resposta: ["…", "tá. mais um pouco"] },
          { label: "se quiser eu volto", resposta: ["…", "n. segue. se eu voltar agora eu nunca mais saio"] },
        ],
      },
      { t: "chegar" },
      { t: "msg", texto: "valeu pela carona" },
      { t: "msg", texto: "tem um espelho aqui na estação que embaçou faz tempo" },
      { t: "msg", texto: "n tenho coragem de limpar. e se eu n gostar de quem tá lá?" },
      { t: "msg", texto: "limpa pra mim?" },
      { t: "prova", id: "espelho" },
      { t: "msg", texto: "…é vc aí?" },
      { t: "msg", texto: "engraçado. parece comigo também" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/sextafeira.mp3", titulo: "Sexta-Feira" },
      { t: "msg", texto: "lembrei de uma coisa de ontem. eu tava num show. o chão tremendo, todo mundo pulando junto. depois mais nada" },
      { t: "msg", texto: "se um dia precisar dançar na frente do núcleo, eu danço" },
      { t: "msg", texto: "sozinho se precisar. mas acho que n vou tá sozinho" },
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
          { label: "eu vou ler", resposta: ["…", "então vem. antes que eu rasgue."] },
          { label: "e mesmo assim vc continuou", resposta: ["continuei.", "é a única coisa que eu sei fazer direito."] },
        ],
      },
      { t: "chegar" },
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
      { t: "msg", texto: "na última página de ontem tem uma plateia. uma pessoa ficou até o fim." },
      { t: "msg", texto: "ainda n sei quem. mas vou saber." },
      { t: "msg", texto: "o que vcs fizerem, eu escrevo. alguém tem que contar que teve resistência." },
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
      // ATO 2 · tentativa e erro (NECTAR C2): a corda arrebentada
      { t: "msg", texto: "tá com uma corda arrebentada né. eu sabia" },
      { t: "msg", texto: "deixa. com uma corda a menos n vai soar como era" },
      {
        t: "escolha",
        opcoes: [
          { label: "n precisa soar como era", resposta: ["…", "isso foi muito eu falando comigo mesmo", "traz"] },
          { label: "toca errado então", resposta: ["kkkkk", "tentativa e erro. tá bom. traz"] },
        ],
      },
      { t: "chegar" },
      { t: "msg", texto: "vc achou" },
      { t: "msg", texto: "toca comigo?" },
      { t: "prova", id: "violao" },
      { t: "msg", texto: "tá vendo. n precisava ser perfeito" },
      { t: "objeto" },
      { t: "audio", src: "/audio/tracks/nectar.mp3", titulo: "Nectar · prévia" },
      { t: "msg", texto: "fui eu. na noite do apagão, rodei a linha inteira escondendo as músicas" },
      { t: "msg", texto: "e fiquei esperando alguém juntar" },
      { t: "msg", texto: "n foi só pra proteger. foi medo. medo de lançar e ninguém ouvir" },
      { t: "msg", texto: "e sabe quem caça as músicas? quem me ensinou a tocar" },
      { t: "msg", texto: "um dia eu te conto. hoje n consigo" },
      { t: "msg", texto: "eu ainda tô com medo. vou lançar mesmo assim. acho que resistir é isso" },
      { t: "msg", texto: "nectar sai dia 16/10. vc ouviu antes" },
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
