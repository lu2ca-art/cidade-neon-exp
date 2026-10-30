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
