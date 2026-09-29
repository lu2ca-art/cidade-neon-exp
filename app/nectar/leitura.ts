// NECTAR — a leitura. A dinâmica do chapéu seletor (cenas, caminhos que se
// bifurcam, uma cerimônia no fim), com o universo da Cidade Neon no lugar
// de casas: o resultado é uma das campanhas das faixas (faixa × fase do
// arco), o objeto que te acompanha e o próximo ponto da rota dele.
//
// Fontes: vault/projetos/cidade-neon/campanhas-vol1.md (títulos, emoção,
// brecha, frases, CTAs) e narrativa-conceito.md (a rota dos 18 objetos).
// Só entram faixas já lançadas + Nectar (T-21 passado); as outras abrem na
// data, sozinhas (ver `faixasAbertas`).

export type Faixa = "chuva" | "copo" | "dopamina" | "sexta" | "ontem" | "nectar" | "ojala" | "swav" | "rollercoaster"
export type Fase = 1 | 2 | 3

export interface Peso {
  f?: Partial<Record<Faixa, number>>
  fase?: Fase
}

export interface Opcao {
  txt: string
  peso: Peso
  prox?: string
  objeto?: Objeto
}

export interface No {
  id: string
  ato: "chegada" | "travessia" | "espelho"
  cena?: string
  pergunta: string
  opcoes: Opcao[]
  prox?: string
}

export const FAIXAS: Record<Faixa, { nome: string; cor: string; audio: string; lancamento: string | null }> = {
  chuva: { nome: "CHUVA", cor: "#2fe8ff", audio: "/audio/tracks/222-chuva.mp3", lancamento: null },
  copo: { nome: "Copo Americano", cor: "#ff6a35", audio: "/audio/tracks/222-copo-americano.mp3", lancamento: null },
  dopamina: { nome: "DopaminA", cor: "#5dffa0", audio: "/audio/tracks/dopamina.mp3", lancamento: null },
  sexta: { nome: "Sexta-Feira", cor: "#ff3fb0", audio: "/audio/tracks/sextafeira.mp3", lancamento: null },
  ontem: { nome: "Sabe Ontem?", cor: "#ffc857", audio: "/audio/tracks/sabe-ontem.mp3", lancamento: "2026-09-30T00:00:00-03:00" },
  nectar: { nome: "Nectar", cor: "#b38cff", audio: "/audio/tracks/nectar.mp3", lancamento: "2026-09-23T00:00:00-03:00" }, // T-21 de 14/10
  ojala: { nome: "Ojalá", cor: "#3d7bff", audio: "/audio/tracks/ojala.mp3", lancamento: "2026-10-28T00:00:00-03:00" },
  swav: { nome: "Swav", cor: "#ffe14d", audio: "/audio/tracks/swav.mp3", lancamento: "2026-11-11T00:00:00-03:00" },
  rollercoaster: { nome: "Rollercoaster", cor: "#ff5b5b", audio: "/audio/tracks/rollercoaster.mp3", lancamento: "2026-11-25T00:00:00-03:00" },
}

// Sabe Ontem? entra desde já: é o drop da semana e a abertura inteira do
// jogo gira em torno dela (T-21 já passou)
export function faixasAbertas(agora = Date.now()): Faixa[] {
  return (Object.keys(FAIXAS) as Faixa[]).filter((f) => {
    const l = FAIXAS[f].lancamento
    return f === "ontem" || !l || new Date(l).getTime() <= agora
  })
}

export interface Campanha {
  titulo: string
  emocao: string
  brecha: string
  linguagem: string
  frase: string
  cta: string
}

// 3 campanhas por faixa, na ordem do arco: 1 = ferida, 2 = travessia,
// 3 = florescer. Texto literal do doc de campanhas.
export const CAMPANHAS: Partial<Record<`${Faixa}${Fase}`, Campanha>> = {
  chuva1: { titulo: "Solo Fértil", emocao: "saudade de si, emoção represada", brecha: "desejo de se conectar com algo real", linguagem: "poética, afetiva, sussurrada", frase: "A vulnerabilidade é o início da vida.", cta: "Qual primeira gota já mudou seu dia inteiro?" },
  chuva2: { titulo: "Deserto", emocao: "desconexão, solidão, cansaço", brecha: "nostalgia desperta beleza adormecida", linguagem: "reflexiva, melancólica, emocional", frase: "Às vezes a chuva precisa vir de dentro.", cta: "Qual memória te salva do deserto?" },
  chuva3: { titulo: "Chuva de Verão", emocao: "transbordo, presença, contemplação", brecha: "conexão coletiva que gera crescimento", linguagem: "transcendental, vibrante, madura", frase: "A chuva não apaga, a chuva revela.", cta: "Quem é a pessoa que você deixaria dançar na chuva contigo?" },
  copo1: { titulo: "Quarto Vazio", emocao: "saudade de algo que nunca existiu", brecha: "ausência que pulsa", linguagem: "melancólica, contemplativa", frase: "Já sentiu saudade de algo que nunca viveu?", cta: "O que vc sente falta sem nunca ter tido?" },
  copo2: { titulo: "Piada de Mau Gosto", emocao: "autoengano", brecha: "tédio existencial de quem perdeu o sentido", linguagem: "fria, sarcástica, ácida", frase: "Passo 1: repete o erro.", cta: "Quantas vezes vc caiu na mesma piada?" },
  copo3: { titulo: "Em Meio ao Caos, Flor", emocao: "resiliência", brecha: "brilho escondido nas pequenas coisas", linguagem: "sensorial, esperançosa, realista", frase: "Do vazio também pode nascer vida.", cta: "Qual flor já nasceu do seu caos?" },
  dopamina1: { titulo: "Prazer Instantâneo", emocao: "vazio interior", brecha: "cansaço das recompensas fáceis", linguagem: "ansiosa, elétrica, insaciável", frase: "Recompensa rápida ≠ satisfação real", cta: "Quantas vezes vc já caiu no loop do prazer rápido?" },
  dopamina2: { titulo: "Algo de Estranho", emocao: "confusão silenciosa, desejo de mudar", brecha: "pausa de tudo que incomoda", linguagem: "ambígua, ofegante", frase: "Respira.", cta: "Topa parar 15s agora? Respira fundo." },
  dopamina3: { titulo: "Verde Interior", emocao: "despertar para a simplicidade", brecha: "desejo de se conectar consigo e com a vida", linguagem: "etérea, orgânica, fácil", frase: "Respirar é revolucionário.", cta: "O que te conecta ao agora?" },
  sexta1: { titulo: "Multidão Vazia", emocao: "FOMO", brecha: "peixe fora d’água", linguagem: "desesperançosa, triste, desiludida", frase: "A cidade lotada, mas vc se sente o único sem lugar.", cta: "Já se sentiu sozinho mesmo cercado de gente?" },
  sexta2: { titulo: "Bateria Esgotada", emocao: "insatisfação com a vida", brecha: "colapso entre ser ou não ser", linguagem: "fragmentada, ambígua, experimental", frase: "Não é preguiça, é a vida drenando energia.", cta: "Quando sua bateria acaba: vc recarrega sozinho ou espera alguém te salvar?" },
  sexta3: { titulo: "Aceita e Dança", emocao: "solitude como revolução", brecha: "quem não pode resistir à própria dança", linguagem: "consciente, iluminada, confiante", frase: "Vc dança pra eles ou dança pra vc?", cta: "Quem dança com você até sem plateia?" },
  ontem1: { titulo: "Escuro Total", emocao: "medo do desconhecido", brecha: "possibilidades de surpreender", linguagem: "sensível, embargada", frase: "Vc já se sentiu invisível no meio da multidão?", cta: "Onde vc já quis ser visto e ninguém notou?" },
  ontem2: { titulo: "Persistência Afrontosa", emocao: "autoconfiança, independência, coragem", brecha: "nada mais a perder, tudo por merecimento", linguagem: "intensa, direta, afrontosa, crítica", frase: "Persistir é continuar mesmo sem plateia.", cta: "Quem você conhece que nunca desistiu?" },
  ontem3: { titulo: "Multidão de 1", emocao: "amor pela arte, presença", brecha: "não importa o resultado, importa a dedicação", linguagem: "poética, simbólica, visionária", frase: "Não importa quantos assistem. Importa quem sente.", cta: "Quem seria sua plateia de 1?" },
  nectar1: { titulo: "Bicho de 7 Cabeças", emocao: "desafio iminente", brecha: "pode ser mais simples do que parece", linguagem: "inspiradora, emotiva, corajosa", frase: "seus medos parecem gigantes, mas na real são só sombras", cta: "qual é o seu bicho de 7 cabeças agora?" },
  nectar2: { titulo: "Tentativa e Erro", emocao: "desapego da perfeição", brecha: "chance de ser si mesmo, sem pressão", linguagem: "jovem, descontraída, rebelde", frase: "se o tempo não para, pq vc vai parar por medo de errar?", cta: "Qual foi seu último erro que virou aprendizado?" },
  nectar3: { titulo: "Menino Sem Vergonha", emocao: "sinceridade crônica", brecha: "quem é você quando ninguém está vendo?", linguagem: "instigante, provocativa, convidativa", frase: "A maior nudez é a da alma.", cta: "Topa se mostrar de verdade? Qual é 1 verdade sobre vc?" },
}

// A rota dos objetos: cada um atravessa 3 campanhas de faixas diferentes.
export type Objeto =
  | "relogio" | "flor" | "caderno" | "lanterna" | "mp3" | "violao" | "guarda-chuva" | "camisa" | "espelho"
  | "cup-noodles" | "celular" | "copos-vazios" | "maca" | "tatuagem" | "caixa-de-som" | "microfone" | "regador"

export const OBJETOS: Record<Objeto, { nome: string; rota: [Faixa, Fase][]; porque: string }> = {
  relogio: { nome: "relógio", rota: [["dopamina", 1], ["nectar", 2], ["sexta", 3]], porque: "do prazer instantâneo, encara o bicho de 7 cabeças, termina dançando sem relógio" },
  flor: { nome: "flor", rota: [["copo", 3], ["rollercoaster", 2], ["chuva", 3]], porque: "flor no caos vira decisão de preparar o solo, culmina em chuva de verão" },
  caderno: { nome: "caderno", rota: [["swav", 1], ["chuva", 1], ["nectar", 3]], porque: "abrir o caderno, sentir o solo fértil, sair sem vergonha" },
  lanterna: { nome: "lanterna", rota: [["ontem", 1], ["dopamina", 2], ["ojala", 3]], porque: "treinar a visão no breu, reconhecer algo de estranho, viver o amor fugaz" },
  mp3: { nome: "mp3", rota: [["copo", 1], ["chuva", 2], ["rollercoaster", 3]], porque: "do quarto vazio ao deserto, até entender flor, fruto e semente" },
  violao: { nome: "violão", rota: [["swav", 2], ["ontem", 3], ["sexta", 3]], porque: "sair dos reflexos, tocar pra multidão de 1, terminar em aceita e dança" },
  "guarda-chuva": { nome: "guarda-chuva", rota: [["chuva", 1], ["rollercoaster", 1], ["nectar", 1]], porque: "sentir o solo fértil, encarar o antes de ir, escolher tentativa e erro" },
  camisa: { nome: "camisa da seleção", rota: [["ojala", 2], ["ontem", 2], ["swav", 3]], porque: "da parceria que dissolve rivalidade à persistência afrontosa e ao salto de fé" },
  espelho: { nome: "espelho", rota: [["sexta", 1], ["nectar", 3], ["dopamina", 3]], porque: "encarar a multidão vazia, assumir a nudez, pousar no verde interior" },
  "cup-noodles": { nome: "cup noodles", rota: [["nectar", 1], ["dopamina", 1], ["copo", 3]], porque: "de tentar e errar, pela tentação do prazer rápido, até a flor no caos" },
  celular: { nome: "celular", rota: [["dopamina", 1], ["sexta", 2], ["chuva", 3]], porque: "do vazio das telas, pela bateria esgotada, até a chuva de verão: desligar pra sentir junto" },
  "copos-vazios": { nome: "copos vazios", rota: [["copo", 1], ["nectar", 2], ["sexta", 3]], porque: "esvaziar pra preencher de verdade" },
  maca: { nome: "maçã", rota: [["copo", 2], ["ojala", 1], ["nectar", 3]], porque: "do sarcasmo defensivo ao amor de carnaval, até a nudez emocional: morder o real sem máscara" },
  tatuagem: { nome: "tatuagem", rota: [["ojala", 2], ["ontem", 1], ["swav", 3]], porque: "da parceria, atravessa o escuro total, salta em salto de fé" },
  "caixa-de-som": { nome: "caixa de som", rota: [["sexta", 1], ["ontem", 2], ["dopamina", 3]], porque: "volume baixo por fora, alto por dentro" },
  microfone: { nome: "microfone", rota: [["ontem", 3], ["swav", 1], ["ojala", 3]], porque: "da multidão de 1, pra criatividade eminente, pousa no fugaz como o vento" },
  regador: { nome: "regador", rota: [["rollercoaster", 1], ["chuva", 2], ["nectar", 1]], porque: "do antes de ir, atravessa o deserto, volta à tentativa e erro" },
}

// ── as cenas ─────────────────────────────────────────────────
export const NOS: Record<string, No> = {
  inicio: {
    id: "inicio", ato: "chegada",
    cena: "3h da manhã. a cidade tá acesa, mas ninguém tá acordado de verdade. seu celular vibra na mesa.",
    pergunta: "o que você faz?",
    opcoes: [
      { txt: "ignoro. é sempre o núcleo", peso: { f: { dopamina: 1, copo: 1 } }, prox: "loop1" },
      { txt: "abro na hora. pode ser alguém", peso: { f: { sexta: 1, ontem: 1 } }, prox: "alguem1" },
      { txt: "vou pra janela ver a chuva", peso: { f: { chuva: 2 } }, prox: "janela1" },
      { txt: "pego o caderno e escrevo", peso: { f: { nectar: 1, ontem: 1 } }, prox: "caderno1" },
    ],
  },

  // caminho A · anestesia
  loop1: {
    id: "loop1", ato: "chegada",
    cena: "você volta pro feed. quarenta minutos passam sem você perceber.",
    pergunta: "o que você sente?",
    opcoes: [
      { txt: "nada. e isso me assusta", peso: { f: { dopamina: 2 }, fase: 1 } },
      { txt: "culpa, mas continuo", peso: { f: { copo: 2 }, fase: 1 } },
      { txt: "vontade de jogar o celular longe", peso: { f: { dopamina: 1, sexta: 1 }, fase: 2 } },
      { txt: "tédio. o mesmo de sempre", peso: { f: { copo: 1, dopamina: 1 }, fase: 1 } },
    ],
    prox: "loop2",
  },
  loop2: {
    id: "loop2", ato: "chegada",
    cena: "tem um copo americano vazio do lado da cama. de ontem?",
    pergunta: "o que ele te lembra?",
    opcoes: [
      { txt: "uma festa que eu nem queria ir", peso: { f: { sexta: 2 }, fase: 1 } },
      { txt: "alguém que foi embora", peso: { f: { copo: 2, chuva: 1 }, fase: 2 } },
      { txt: "que eu preciso mudar alguma coisa", peso: { f: { copo: 1, nectar: 1 }, fase: 3 } },
      { txt: "nada. é só um copo", peso: { f: { copo: 1, dopamina: 1 }, fase: 1 } },
    ],
    prox: "travessia1",
  },

  // caminho B · alguém
  alguem1: {
    id: "alguem1", ato: "chegada",
    cena: "é uma mensagem de um número sem nome: “sabe ontem?”",
    pergunta: "você responde:",
    opcoes: [
      { txt: "sei. não esqueço", peso: { f: { ontem: 2 }, fase: 2 } },
      { txt: "quem é?", peso: { f: { sexta: 1, dopamina: 1 }, fase: 1 } },
      { txt: "prefiro não lembrar", peso: { f: { copo: 1, chuva: 1 }, fase: 1 } },
      { txt: "conta mais", peso: { f: { ontem: 1, nectar: 1 }, fase: 3 } },
    ],
    prox: "alguem2",
  },
  alguem2: {
    id: "alguem2", ato: "chegada",
    cena: "a pessoa te chama pra encontrar agora. do outro lado da cidade.",
    pergunta: "e aí?",
    opcoes: [
      { txt: "vou. sem pensar", peso: { f: { dopamina: 1, nectar: 1 }, fase: 3 } },
      { txt: "invento uma desculpa e fico", peso: { f: { sexta: 2 }, fase: 1 } },
      { txt: "vou, mas fico no canto observando", peso: { f: { sexta: 1, ontem: 1 }, fase: 2 } },
      { txt: "chamo pra vir aqui em vez disso", peso: { f: { chuva: 1, nectar: 1 }, fase: 3 } },
    ],
    prox: "travessia1",
  },

  // caminho C · janela
  janela1: {
    id: "janela1", ato: "chegada",
    cena: "a chuva bate no vidro. lá embaixo, uma flor nasceu no meio do asfalto.",
    pergunta: "você…",
    opcoes: [
      { txt: "desço pra ver de perto", peso: { f: { chuva: 2 }, fase: 3 } },
      { txt: "tiro foto e posto", peso: { f: { dopamina: 1, sexta: 1 }, fase: 1 } },
      { txt: "fico pensando quanto tempo ela aguenta", peso: { f: { copo: 1, chuva: 1 }, fase: 2 } },
      { txt: "choro um pouco. sei lá por quê", peso: { f: { chuva: 2 }, fase: 2 } },
    ],
    prox: "janela2",
  },
  janela2: {
    id: "janela2", ato: "chegada",
    cena: "a chuva aperta. você tá na rua, sem guarda-chuva.",
    pergunta: "você…",
    opcoes: [
      { txt: "corro", peso: { f: { ontem: 1, dopamina: 1 }, fase: 2 } },
      { txt: "danço", peso: { f: { chuva: 2, sexta: 1 }, fase: 3 } },
      { txt: "espero passar", peso: { f: { copo: 1 }, fase: 1 } },
      { txt: "fecho os olhos e deixo molhar", peso: { f: { chuva: 1, nectar: 1 }, fase: 3 } },
    ],
    prox: "travessia1",
  },

  // caminho D · caderno
  caderno1: {
    id: "caderno1", ato: "chegada",
    cena: "você abre o caderno. a última página tem uma frase que você não lembra de ter escrito.",
    pergunta: "o que ela diz?",
    opcoes: [
      { txt: "“fica tudo bem, se a chuva não vem”", peso: { f: { chuva: 2 }, fase: 1 } },
      { txt: "“eu sei o que eu quero, só não sei como”", peso: { f: { ontem: 2 }, fase: 2 } },
      { txt: "“para de ter vergonha”", peso: { f: { nectar: 2 }, fase: 2 } },
      { txt: "tá rasgada. não dá pra ler", peso: { f: { copo: 1, dopamina: 1 }, fase: 1 } },
    ],
    prox: "caderno2",
  },
  caderno2: {
    id: "caderno2", ato: "chegada",
    pergunta: "se alguém lesse seu caderno hoje…",
    opcoes: [
      { txt: "ia me conhecer de verdade", peso: { f: { nectar: 2 }, fase: 3 } },
      { txt: "ia achar que eu tô bem", peso: { f: { copo: 1, sexta: 1 }, fase: 1 } },
      { txt: "ia ver que eu tô tentando", peso: { f: { ontem: 1, nectar: 1 }, fase: 2 } },
      { txt: "ia rir. e tudo bem", peso: { f: { nectar: 1, sexta: 1 }, fase: 3 } },
    ],
    prox: "travessia1",
  },

  // todos os caminhos se encontram na linha 222
  travessia1: {
    id: "travessia1", ato: "travessia",
    cena: "a linha 222 passa na sua rua. a porta abre sozinha. você entra.",
    pergunta: "o que você leva na mão?",
    opcoes: [
      { txt: "um relógio", peso: { f: { dopamina: 1, nectar: 1, sexta: 1 } }, objeto: "relogio" },
      { txt: "um mp3 sem bateria", peso: { f: { copo: 1, chuva: 1 } }, objeto: "mp3" },
      { txt: "uma lanterna", peso: { f: { ontem: 2 } }, objeto: "lanterna" },
      { txt: "um caderno", peso: { f: { nectar: 1, chuva: 1 } }, objeto: "caderno" },
    ],
    prox: "travessia2",
  },
  travessia2: {
    id: "travessia2", ato: "travessia",
    cena: "no vagão tem um espelho. o reflexo demora meio segundo pra te acompanhar.",
    pergunta: "o que você vê?",
    opcoes: [
      { txt: "alguém cansado", peso: { f: { sexta: 2 }, fase: 2 } },
      { txt: "alguém que ainda vai surpreender", peso: { f: { ontem: 2 }, fase: 1 } },
      { txt: "alguém sem máscara", peso: { f: { nectar: 2 }, fase: 3 } },
      { txt: "alguém que eu não reconheço", peso: { f: { dopamina: 2 }, fase: 2 } },
    ],
    prox: "espelho1",
  },
  espelho1: {
    id: "espelho1", ato: "espelho",
    cena: "o NÚCLEO aparece na tela do vagão. gentil. “podemos apagar uma memória sua. é de graça ✓”",
    pergunta: "qual você apaga?",
    opcoes: [
      { txt: "a que mais dói", peso: { f: { copo: 1 }, fase: 1 } },
      { txt: "nenhuma. todas me fizeram", peso: { f: { chuva: 1, nectar: 1 }, fase: 3 } },
      { txt: "a vergonha", peso: { f: { nectar: 2 }, fase: 2 } },
      { txt: "o tempo que eu perdi sonhando", peso: { f: { ontem: 1 }, fase: 2 } },
    ],
    prox: "espelho2",
  },
  espelho2: {
    id: "espelho2", ato: "espelho",
    pergunta: "última. se a sua vida agora fosse uma estação do ano…",
    opcoes: [
      { txt: "inverno. tudo parado", peso: { fase: 1 } },
      { txt: "outono. caindo o que não serve", peso: { fase: 2 } },
      { txt: "primavera. brotando", peso: { fase: 3 } },
      { txt: "verão. transbordando", peso: { f: { chuva: 1 }, fase: 3 } },
    ],
  },
}

export const TOTAL_PERGUNTAS = 7 // qualquer caminho tem 7 perguntas

export interface Resultado {
  faixa: Faixa
  fase: Fase
  campanha: Campanha
  sombra: Faixa // a segunda estação mais forte
  objeto: Objeto
  proximo: [Faixa, Fase] | null // o próximo ponto da rota do objeto
  caminho: string // qual das 4 cenas de abertura
}

export function ler(respostas: { no: string; opcao: number }[], agora = Date.now()): Resultado {
  const abertas = faixasAbertas(agora)
  const soma: Partial<Record<Faixa, number>> = {}
  const fases = { 1: 0, 2: 0, 3: 0 } as Record<Fase, number>
  let objetoEscolhido: Objeto | undefined
  for (const r of respostas) {
    const o = NOS[r.no].opcoes[r.opcao]
    for (const [k, v] of Object.entries(o.peso.f ?? {})) soma[k as Faixa] = (soma[k as Faixa] ?? 0) + (v ?? 0)
    if (o.peso.fase) fases[o.peso.fase] += 1
    if (o.objeto) objetoEscolhido = o.objeto
  }
  const ordem = abertas.slice().sort((a, b) => (soma[b] ?? 0) - (soma[a] ?? 0))
  const faixa = ordem[0]
  const sombra = ordem[1] ?? ordem[0]
  // a última resposta (a estação do ano) pesa em dobro na fase: é onde a
  // pessoa diz onde tá agora
  const ultima = respostas[respostas.length - 1]
  const faseUlt = ultima ? NOS[ultima.no].opcoes[ultima.opcao].peso.fase : undefined
  if (faseUlt) fases[faseUlt] += 1
  const fase = ([1, 2, 3] as Fase[]).sort((a, b) => fases[b] - fases[a] || b - a)[0]
  const campanha = CAMPANHAS[`${faixa}${fase}`]!
  // objeto: o que a pessoa levou, se ele passa por essa campanha; senão o
  // primeiro objeto cuja rota passa por ela
  const passam = (Object.keys(OBJETOS) as Objeto[]).filter((o) => OBJETOS[o].rota.some(([f, c]) => f === faixa && c === fase))
  const objeto = objetoEscolhido && passam.includes(objetoEscolhido) ? objetoEscolhido : passam[0] ?? objetoEscolhido ?? "caderno"
  const rota = OBJETOS[objeto].rota
  const i = rota.findIndex(([f, c]) => f === faixa && c === fase)
  const proximo = i >= 0 && i < rota.length - 1 ? rota[i + 1] : null
  const caminho = respostas[1]?.no.replace(/\d$/, "") ?? "loop"
  return { faixa, fase, campanha, sombra, objeto, proximo, caminho }
}

export const FASE_NOME: Record<Fase, string> = { 1: "ferida", 2: "travessia", 3: "florescer" }
