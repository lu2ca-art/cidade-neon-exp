// A MESA DE TESTES (30/10): o que está pronto pro dono testar, num endereço só
// (/teste). Cada cartão abre o jogo direto na parte dele
// (/linha?mapa=disco&parte=<parte>, os ids de app/linha/parteTeste.ts).
//
// PRA ACRESCENTAR UM CARTÃO: copie um bloco e cole NO TOPO da lista (o mais
// novo em cima). A página também ordena pela data, a mais nova primeiro.
//   parte     o id do ?parte= (tem que estar em PARTES_TESTE; o teste confere)
//   nome      em português simples, como o dono fala ("A Kombi por dentro")
//   data      "AAAA-MM-DD", o dia em que ficou pronto
//   tarefa    o número da tarefa (só uma etiqueta pequena)
//   olhar     o que olhar, em 1 ou 2 frases curtas
//   perguntas o que o dono precisa responder (curtas, uma por linha)
//   mais      (opcional) outras partes do mesmo assunto, num botão menor
// Sem chave, senha ou endereço de prévia aqui: os links são relativos.

export interface Cartao {
  parte: string
  nome: string
  data: string
  tarefa?: string
  olhar: string
  perguntas: string[]
  mais?: { parte: string; nome: string }[]
}

export const MESA: Cartao[] = [
  {
    parte: "palcos",
    nome: "O botão ♥ salvar (levar pro seu streaming)",
    data: "2026-11-03",
    olhar: "Um \"♥ salvar\" no notch enquanto a faixa da rua toca (brilha quando a versão completa acaba), em cada música do Guitar Driver e na rádio do holo. Ele só aparece quando a faixa tem link: os links reais ainda não estão. Pra ver agora, abra o jogo com ?links=teste no fim do endereço.",
    perguntas: [
      "O botão cabe bem no notch e na hora certa?",
      "No iPhone, o toque abriu o app do Spotify?",
    ],
  },
  {
    parte: "livre",
    nome: "A música contínua (cada rua é uma faixa)",
    data: "2026-11-03",
    olhar: "Entrou numa rua: a faixa dela começa do início e toca inteira, sem nada pausar. Começou uma missão: passa suave pro instrumental no mesmo ponto; acabou a missão, volta pra versão com voz. Acabou a faixa: fica o instrumental até trocar de rua. Turbo e pulo só abafam, não param.",
    perguntas: [
      "A música segue sem cortar quando entra a missão?",
      "Sentiu falta da prévia de 22 s e do tema da missão (que saíram)?",
      "Com o rádio ligado, a faixa da rua fica correndo muda por baixo: tudo bem?",
    ],
  },
  {
    parte: "dunas",
    nome: "As suas notas de 03/11 (holo, subida, música)",
    data: "2026-11-03",
    olhar: "O holo surge flutuando, sem a mão, e sem tela escura. Ao sair da casa da D-Bee não tem mais tela explicando: o mapa pisca e o ícone da missão pulsa com \"toca aqui\". A Kombi sobe do chão de forma contínua. No bar toca o instrumental de Copo Americano (vol 1).",
    perguntas: [
      "A subida chega até a cidade sem travar?",
      "Ainda sobrou alguma tela preta explicando?",
      "As músicas de fundo trocadas (oficina: Sabe Ontem?, túneis: DopaminA, Xeriff: Rollercoaster) servem?",
    ],
    mais: [{ parte: "subir.voo", nome: "a subida pra cidade" }, { parte: "bar", nome: "o bar (a música)" }],
  },
  {
    parte: "livre",
    nome: "Missões que começam e o caminho claro",
    data: "2026-11-02",
    olhar: "No Nexo sempre aparece \"Agora: ...\" com o próximo passo e a distância. No mapa, a missão ativa pulsa com o nome e as feitas ficam apagadas. No mundo, um feixe de luz alto marca o destino. Chegou perto (de Kombi, a pé, de patins ou voando baixo), a missão começa; se você ainda não pegou nenhuma, chegar no lugar já pega.",
    perguntas: [
      "Dá pra saber o que fazer agora, sem ajuda?",
      "A missão começou ao chegar? Em qual não começou?",
      "O raio de chegada está bom, ou tem que chegar perto demais?",
    ],
  },
  {
    parte: "vitrine.tunel",
    nome: "Tudo aberto pra visitar (vitrine)",
    data: "2026-11-02",
    olhar: "A boca do túnel leva pras trincheiras sempre (a Kombi fica na porta). O bar abre pra visitar e a sinuca no treino. O fliperama, o ginásio, a loja, o app de música, as salas da cidade, a casa da D-Bee e os apps do violão e do jardim abrem; o que não foi liberado aparece com cadeado e diz qual missão libera.",
    perguntas: [
      "Ficou faltando algum lugar que você quer mostrar e não abre?",
      "O aviso do cadeado está claro?",
    ],
    mais: [{ parte: "vitrine.bar", nome: "o bar e a sinuca" }, { parte: "palcos", nome: "as músicas (Guitar Driver)" }, { parte: "vitrine.casa", nome: "a casa da D-Bee" }, { parte: "vitrine.balada", nome: "a balada" }, { parte: "vitrine.drewboy", nome: "a casa do Drew" }, { parte: "vitrine.terraco", nome: "o terraço" }, { parte: "vitrine.shows", nome: "a casa de shows" }],
  },
  {
    parte: "metro",
    nome: "O violão, o metrô e o grafite",
    data: "2026-10-31",
    tarefa: "T64",
    olhar: "Metrô: a Kombi já foi jogada, tomam o jetpack e você foge pelo trem; no fim o violão fica lá e a guitarra aparece na loja. Violão: com o disco ou a rádio tocando, o botão do violão aparece. Grafite: nas trincheiras, chegue perto de uma parede com pontos e ligue os pontos para assinar.",
    perguntas: [
      "A fuga do metrô logo depois da perseguição está no lugar certo da história?",
    ],
    mais: [{ parte: "violao", nome: "o violão no mundo" }, { parte: "grafite", nome: "o grafite nas trincheiras" }],
  },
  {
    parte: "missao.drew",
    nome: "As missões novas (Drew moda, Xeriff ping pong, a Ella no mapa)",
    data: "2026-10-31",
    tarefa: "T15 · T18 · T22",
    olhar: "Drew: chegar até a casa dele de patins e jetpack já conta, depois a moda (montar um look reciclado). Xeriff: o ping pong com a cor dele. A Ella agora aparece no mapa sem link de teste.",
    perguntas: [
      "A moda do Drew e o ping pong do Xeriff ficam assim?",
    ],
    mais: [{ parte: "missao.drew.arte", nome: "a moda do Drew direto" }, { parte: "missao.xeriff.arte", nome: "o ping pong do Xeriff" }, { parte: "missao.ella", nome: "a missão da Ella" }],
  },
  {
    parte: "casa.instrumentos",
    nome: "Os instrumentos na casa da D-Bee",
    data: "2026-10-31",
    tarefa: "T49",
    olhar: "Os instrumentos ganhos ficam no banco da parede. Com instrumento novo, a D-Bee pede pra tocar cada novo; sem novo, a visita é livre. Toque em cada um e ouça.",
    perguntas: [
      "Os sons provisórios servem até chegar a lista de sons de verdade?",
    ],
    mais: [{ parte: "recompensa.instrumento", nome: "a recompensa com um instrumento (o sitar)" }],
  },
  {
    parte: "elevador",
    nome: "O elevador de terror",
    data: "2026-10-31",
    tarefa: "T47",
    olhar: "O elevador sobe, a porta abre num andar escuro com robôs dormindo e humanos encubados. Segure a tela pra andar e arraste pra virar; no fundo, a sala fecha sozinha. No jogo, a porta da torre fica na beira oeste do subúrbio (provisório).",
    perguntas: [
      "Onde fica a porta da torre no mapa?",
    ],
  },
  {
    parte: "livre",
    nome: "O Nexo só informa",
    data: "2026-10-31",
    tarefa: "T41",
    olhar: "Sem chats nem mensagens de IA. O notch mostra o objetivo ou uma dica; tocar nele abre mais. O \"?\" faz o notch dizer \"clique em qualquer lugar para saber mais\": toque num item e a explicação aparece do lado dele, sem balão preto.",
    perguntas: [
      "As dicas do notch são rascunho: quer trocar alguma?",
    ],
  },
  {
    parte: "kombi.dentro",
    nome: "A Kombi por dentro",
    data: "2026-10-30",
    tarefa: "T59",
    olhar: "Você já começa sentado dentro dela, na 1ª pessoa: toca-discos, MPC, rádio, painel antigo, chão de grama e teto de madeira. Dirija um pouco e veja se fica leve.",
    perguntas: [
      "Por dentro a lata fica branca como a de fora, ou azul?",
      "O para-brisa dividido, com a coluna no meio, fica?",
    ],
  },
  {
    parte: "torre",
    nome: "A rotatória central: mais larga, portais e a linha no chão",
    data: "2026-10-30",
    tarefa: "T61",
    olhar: "As 9 entradas num anel só, mais largo. Sem placas: cada entrada tem um portal pequeno, e a linha da cor da pista no chão guia. A da próxima entrada na faixa da direita, a seguinte no meio.",
    perguntas: [
      "Dá pra saber onde entrar só pela linha e pelo portal?",
    ],
    mais: [{ parte: "torre.ponta", nome: "numa torre da ponta (3 saídas)" }],
  },
  {
    parte: "perseguicao",
    nome: "A perseguição da Kombi",
    data: "2026-10-30",
    tarefa: "T28",
    olhar: "A polícia vem e sempre te pega. O helicóptero ergue a Kombi e solta no vazio. Você sai de patins e, mais à frente, escolhe um de 3 carros parados.",
    perguntas: [
      "Os 3 carros (opala preto, picape do lixão, buggy das dunas) servem? Quais você quer?",
      "A polícia vem com popularidade 50 e 6 missões feitas. Está bom?",
      "A Kombi cai onde te pegaram, ou num lugar certo?",
      "Os 3 carros ficam na pista ou na oficina do mecânico?",
      "O carro novo voa e quebra como a Kombi?",
    ],
    mais: [
      { parte: "perseguicao.escolher", nome: "já na hora de escolher" },
      { parte: "perseguicao.gatilho", nome: "a polícia vem sozinha (~20 s)" },
    ],
  },
  {
    parte: "missao.ella.casa",
    nome: "A Ella: o filme da planta, a galeria e pintar",
    data: "2026-10-30",
    tarefa: "T22",
    olhar: "Primeiro o filme (provisório, em legenda) da Ella contando que o Criador deixou a planta. Depois os 6 quadros dela. Depois pintar no escuro, só com a luz da planta.",
    perguntas: [
      "O texto do filme está bom? (ela diz que o Criador previu o mal e que a planta salva o mundo)",
    ],
    mais: [{ parte: "missao.ella", nome: "começar na rua" }],
  },
  {
    parte: "quebra.oficina",
    nome: "O patins: rodas de gel e linhas finas",
    data: "2026-10-30",
    tarefa: "T62",
    olhar: "O som inteiro foi arrumado: nunca duas músicas juntas, a voz abaixa a música, o vento do parque para. O patins ficou bem mais baixo (17% do de antes) e mais macio.",
    perguntas: [
      "O som do patins (volume e timbre) está no ponto?",
      "As linhas do drift: azul claro ou cinza?",
    ],
    mais: [{ parte: "casa.holo", nome: "a fala nova da D-Bee no holo" }],
  },
  {
    parte: "missao.tuneis.trincheiras",
    nome: "As trincheiras dentro do jogo",
    data: "2026-10-30",
    tarefa: "T63",
    olhar: "A Kombi para na boca do túnel; você entra sem ela.",
    perguntas: [
      "Quando as motos chegam? (ex.: depois de ganhar a corrida)",
      "A descida é um escuro rápido. Quer ver a Kombi entrando no túnel antes?",
    ],
  },
  {
    parte: "dunas",
    nome: "O deserto e os robôs caídos",
    data: "2026-10-30",
    tarefa: "T39",
    olhar: "Os robôs zumbis não dão nada: é só atropelar e eles saem voando, igual aos carros.",
    perguntas: [
      "As ondas da areia estão fortes, fracas ou no ponto? E o brilho dos grãos?",
      "Os robôs caídos (quantos e como se mexem) estão bons por enquanto?",
      "Falta você jogar os pulos dos morros.",
    ],
  },
  {
    parte: "casa.tambor",
    nome: "O tambor de verdade com a D-Bee",
    data: "2026-10-30",
    tarefa: "T06",
    olhar: "Dois tambores no tapete. Acompanhe as mãos dela: no centro sai o grave, na borda o tapa, e bater forte soa mais forte.",
    perguntas: [
      "O som serve até o seu sample chegar? Dá pra sentir centro e borda, fraco e forte?",
      "Gosta da D-Bee sentada atrás do tambor e das mãos batendo?",
      "Tem atraso no iPhone?",
      "Quando puder, mande o seu sample (6 arquivos).",
    ],
  },
]

// os mais novos em cima (a ordem da lista desempata)
export const mesaOrdenada = () =>
  MESA.map((c, i) => ({ c, i }))
    .sort((a, b) => b.c.data.localeCompare(a.c.data) || a.i - b.i)
    .map(({ c }) => c)

export const linkDa = (parte: string) => `/linha?mapa=disco&parte=${encodeURIComponent(parte)}`

// "2026-10-30" → "30/10"
export const dataCurta = (d: string) => {
  const [, m, dia] = d.split("-")
  return `${dia}/${m}`
}
