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
    parte: "final",
    nome: "O final novo: o povo, a água e o deserto virando floresta",
    data: "2026-11-09",
    tarefa: "final",
    olhar: "Você abre em cima do palco do show da CHUVA, olhando a plateia lotada. Toque na tela uma vez (o único gesto do final): começa a CHUVA, e daí em diante é só assistir. O povo se junta pela rua, a água sai do Núcleo, a câmera segue ela pela Nectar até o deserto, a chuva cai e o deserto vira floresta. Os nove estão no meio da plateia, sem destaque. Não tem mais feixes, cena dos nove, despedida nem Kombi no quintal. Nos botões de baixo: a floresta e as plantas da Ella no subúrbio depois do final.",
    perguntas: ["A plateia parece lotada o bastante?", "Tocar na tela uma vez é um bom gesto, ou prefere outro?", "O texto do gesto é só \"convocar o povo\" (rascunho): fica?", "A CHUVA segue inteira, sem corte, do toque até o fim?", "A água correndo pela rua convence como \"derrubar o Núcleo\"?", "A floresta está densa o bastante? E o iPhone continua liso nela?", "As plantas da Ella estão bem espalhadas pelo subúrbio?"],
    mais: [{ parte: "final.agua", nome: "só a água até o deserto" }, { parte: "final.floresta", nome: "só o deserto virando floresta" }, { parte: "mundo.depois.floresta", nome: "voltando a jogar: a floresta e o subúrbio com as plantas" }],
    parte: "loja.violao",
    nome: "Perdeu o violão: a loja vende outro, e o comprado toca no trem",
    data: "2026-11-09",
    tarefa: "violão na loja",
    olhar: "Aqui o violão já ficou no metrô. Abra a aba instrumentos: o violão aparece por 200 Água$ (antes de perder, ele nem aparece). Comprando, o botão do violão volta. Nos outros dois links você entra no metrô do anel, senta e toca: com uma guitarra comprada, ela toca e o guarda levanta; sem nada, aparece o cadeado.",
    perguntas: ["200 Água$ pelo violão está num preço bom? (guitarra custa 250)", "O som da guitarra no trem serve por enquanto? (baixo, teclado, sampler e tambor também têm um som provisório)", "Quem tem mais de um instrumento comprado toca o último que comprou. Tudo bem, ou quer escolher?"],
    mais: [
      { parte: "metro.comprado", nome: "no trem, sem violão, com a guitarra comprada" },
      { parte: "metro.sem-instrumento", nome: "no trem, sem violão e sem nada comprado: o cadeado" },
    ],
    parte: "carreira.meio",
    nome: "O Alohan vai junto ao ginásio, em toda visita",
    data: "2026-11-09",
    tarefa: "Alohan no ginásio",
    olhar: "Marque o ginásio ou a quadra no mapa e olhe de dentro da Kombi: o Alohan está no banco do carona. Na porta o botão diz \"com o Alohan\". Lá dentro ele aparece em pé nos três esportes: do lado da cesta, na ponta da mesa de ping pong e acompanhando a ginástica. Vale também pela quadra de basquete.",
    perguntas: ["Dá pra ver ele nos três esportes, sem atrapalhar o jogo?", "De dentro da Kombi ele aparece do seu lado?"],
    mais: [{ parte: "missao.quadra.basquete", nome: "o esporte na missão do Alohan" }],
  },
  {
    parte: "loja",
    nome: "Uma moeda só: tudo agora é Água$",
    data: "2026-11-09",
    tarefa: "agua-moeda",
    olhar: "Não existe mais neon$: a loja, o posto, o mecânico, as missões e os shows usam a mesma Água$. Quem já jogava teve o neon somado na água. No deserto agora tem pouquíssimas gotas no chão, em grupinhos de 3 (saia pelas dunas e procure).",
    perguntas: ["Sobrou algum neon$ em alguma tela?", "O saldo de um save antigo veio somado certo?", "As gotas do deserto estão raras na medida?", "As melhorias do mecânico (120, 80 e 100) ficaram num preço bom?", "O propulsor deve gastar água no deserto: quanto por segundo, e o que acontece se a água acabar?"],
    mais: [{ parte: "dunas", nome: "as gotas do deserto" }],
  },
  {
    parte: "amigos",
    nome: "Os amigos mandam mensagem no notch",
    data: "2026-11-09",
    tarefa: "notch dos amigos",
    olhar: "Ande sem missão e espere uns 45 s: as mensagens passam no notch, do mesmo tamanho de sempre, com o nome de quem manda (\"Mubarak: ...\"). Chegam mais vezes do que antes. Aqui já estão na lista D-Bee, Mubarak, LU2CA, Alohan e Drew; cada um entra quando você termina a missão dele. O LU2CA chama pra tocar nos palcos. Mensagem com sublinhado: toque e o lugar vai pro mapa. Os textos são rascunho, estão todos em amigosTextos.ts.",
    perguntas: ["O ritmo das mensagens ficou bom, ou é muita coisa?", "Dá pra ler o nome de quem manda sem atrapalhar a direção?", "A voz de cada um está certa? (é rascunho pra você reescrever)", "O LU2CA entrar na lista logo depois do show da Nectar, em vez de só no ep. 9, está bom?"],
  },
  {
    parte: "instrumentos.mundo",
    nome: "Instrumentos espalhados no deserto e no subúrbio",
    data: "2026-11-09",
    tarefa: "instrumentos no mundo",
    olhar: "Você nasce perto do didgeridoo, em cima de pedras com uma luz baixa no deserto. Passe por ele: soa, e o notch diz que agora toca na Kombi. Dentro da Kombi, olhe pra esquerda: todos os seus instrumentos, achados e ganhos em missão, ficam na prateleira em cima do sofá, e tocar neles para a música por uns segundos. Na casa da D-Bee, toque um instrumento e depois a caixinha de pads na mesa: o B4TIDA abre com esse som numa faixa.",
    perguntas: ["O marco no chão chama atenção sem parecer missão?", "A prateleira na Kombi aparece bem, sem entrar na parede?", "Dá pra tocar enquanto dirige, ou atrapalha?", "A música voltar 5 segundos depois do último toque está bom?", "Na casa, ficou claro como samplear?"],
    mais: [
      { parte: "instrumentos.kombi", nome: "a Kombi já com os 11 achados" },
      { parte: "instrumentos", nome: "a casa da D-Bee com o sampler" },
    ],
  },
  {
    parte: "bar",
    nome: "O bar na porta do subúrbio, e a Kombi só sobe",
    data: "2026-11-09",
    tarefa: "bar e Kombi",
    olhar: "O bar agora fica logo na chegada do deserto, de frente pra quem vem: dirija até o letreiro laranja e a cena começa ali. No segundo atalho você nasce no pé da torre 1: tem a porta do elevador no deserto, com a placa dos andares e os túneis riscados. O botão sobe a Kombi pra cidade, e lá na rotatória da torre 1 tem o botão de descer de volta. No deserto o propulsor é solar e não gasta nada. Subir voando até uma pista custa 20 de água, cobrados quando você pousa lá em cima; sem água, a Kombi voa baixo, não chega na pista e o Nexo avisa. Na rampa do túnel tem uma viga baixa com a placa: a Kombi não passa.",
    perguntas: ["O bar ficou no lugar certo, bem na chegada?", "A porta no deserto parece um andar da torre?", "O preço de 20 de água pra subir voando está bom?", "A viga e a placa deixam claro que a Kombi não desce?"],
    mais: [{ parte: "elevador.deserto", nome: "a porta do elevador no deserto" }],
  },
  {
    parte: "missao.tony.jogo",
    nome: "A feira do Tony Gordo: cortar o preço dos legumes",
    data: "2026-11-09",
    tarefa: "ep. 5",
    olhar: "Este link já abre na banca, no meio da rua da feira. Os legumes sobem na sua frente, cada um com a etiqueta de preço. Passe o dedo (ou o mouse) neles: cada corte tira 12% daquele legume, até 72%, e os próximos já vêm com o preço novo. Quando a conta couber no bolso, aparece o botão de pagar em Água$. Pagou: a câmera vai pro fogão do Tony, no fim da feira, e os 4 sacos aparecem ali, sem janela por cima. Escolha 3, segure o fogo e solte no ponto. Depois ande pela feira: as barracas, o pastel, o caldo de cana e a xepa ficam no subúrbio, entre o bar e a oficina.",
    perguntas: ["O som de cada corte ficou gostoso?", "Os legumes e o miolo deles ficaram bonitos?", "Dá pra cortar bem com o dedo no celular?", "A feira parece feira de rua de São Paulo?", "Quer alguma pressão (tempo, perder legume) ou fica sem como está?", "A cozinha no fogão da feira ficou boa de ver e de usar no celular?"],
    mais: [{ parte: "missao.tony.arte", nome: "direto na cozinha do Tony, no fogão da feira" }, { parte: "missao.tony", nome: "chegar na feira com a missão, pelo caminho normal" }],
  },
  {
    parte: "bar",
    nome: "O show da Nectar no bar e o beat a caminho do ginásio",
    data: "2026-11-09",
    tarefa: "episódios 1 e 3",
    olhar: "No bar: recuse os copos, conheça o Mubarak ali mesmo e veja o LU2CA subir no palco, com a D-Bee e o Mubarak do seu lado. Escolha assistir (você canta da plateia com o medidor; a música não muda, quem desafina é a plateia, e dá pra jogar sinuca enquanto ouve) ou tocar. No ep. 3: pegue a missão do Alohan, ligue o piloto (o volante do lado do GPS), faça o beat com a Kombi andando e chegue ouvindo ele; lá escolha basquete, ping pong ou ginástica.",
    perguntas: ["A plateia desafinando dá pra ouvir bem, sem estragar a música?", "O show inteiro da Nectar no bar ficou longo ou no ponto?", "Fazer o beat com a rua aparecendo em cima ficou bom?", "Dá pra sentir que o Alohan foi junto?", "Basquete pede 6 pontos e os outros dois só jogar até o fim: pode ficar assim?"],
    mais: [
      { parte: "oficina.show", nome: "ep. 1: só o show, pra quem já conheceu o Mubarak" },
      { parte: "missao.quadra", nome: "ep. 3: o beat no caminho e o esporte" },
    ],
  },
  {
    parte: "metro.passeio",
    nome: "O metrô é um só: por fora na cidade, por dentro só quando você entra",
    data: "2026-11-09",
    tarefa: "metrô",
    olhar: "Você começa no anel de uma torre. Aparece o botão \"entrar no metrô\". Entrando, o personagem senta e a viagem vai em 2x, com a cidade de verdade passando nas janelas, até a próxima torre (ou o centro). No fim você desce no anel e o elevador pros túneis fica ali. Por fora, olhe a viga por cima das ruas, as estações e o trem passando. Tem estação também no meio das ruas. Antes do ep. 8 o botão vem com cadeado. A montanha-russa do parque saiu do mapa: o passeio de metrô é a peça do ep. 8.",
    perguntas: ["A cidade passando na janela convence?", "A câmera do personagem sentado ficou boa?", "A viga e as estações estão bem por cima das ruas, sem atravessar nada?", "O parque pode sumir mesmo?"],
    mais: [
      { parte: "metro.violao", nome: "depois do passeio: toque o violão sentado e o guarda levanta" },
      { parte: "metro", nome: "ep. 9: a fuga depois da captura da Kombi, já dentro do trem" },
    ],
  },
  {
    parte: "final",
    nome: "Os nove do final são os 9 donos das músicas (agora misturados no povo)",
    data: "2026-11-09",
    tarefa: "final",
    olhar: "O Xeriff não aparece mais no final, mas segue no jogo como missão livre, e o final não pede mais a missão dele. Desde o final novo, os nove (D-Bee, Mubarak, Alohan, Nizzy, Tony Gordo, Drew, Ella, Notti e LU2CA) ficam misturados na plateia, sem cena pra eles.",
    perguntas: ["São essas nove pessoas?"],
  },
  {
    parte: "carreira.feira",
    nome: "A música agora começa quando você aceita a missão",
    data: "2026-11-08",
    tarefa: "música da missão",
    olhar: "Ande numa rua sem missão: toca só o instrumental, sem voz. Aceite uma missão na Feira: começa a música completa, com voz, do começo. Troque de pista e entre nas partes da missão: ela não para nem volta. Quando acabar, fica o instrumental até você trocar de pista. Com a rádio ligada, a rádio manda.",
    perguntas: ["A música completa entra na hora em que você aceita?", "Ela segue inteira na troca de pista e dentro da missão?", "Depois que ela acaba, o instrumental entra bem?", "Com a batida ou o Guitar Driver ela para e depois volta do mesmo ponto?"],
  },
  {
    parte: "carreira.feira",
    nome: "Os 9 episódios: o jogo segue a sequência das músicas",
    data: "2026-11-08",
    tarefa: "episódios",
    olhar: "Comece pela Feira: só aparecem as missões do episódio de agora (o fliperama do Mubarak), com \"ep. 2 · DopaminA\". A D-Bee sugere a próxima. Os episódios 4 (Nizzy) e 5 (Tony Gordo) abrem juntos: escolha o que quiser. Cada episódio feito abre a música dele no Guitar Driver (com todos os níveis liberados desde o primeiro play). Lugar trancado diz \"abre no ep. N\". O Xeriff fica solto, fora da fila.",
    perguntas: ["A ordem dos episódios faz sentido pra quem joga?", "Fica claro qual é o próximo episódio?", "O show da Nectar no bar (assistir ou tocar) fecha bem o ep. 1?", "Escolher entre o 4 e o 5 ficou natural?", "As partes que ainda são a versão antiga (a feira do Tony, o passeio do Notti) incomodam?"],
    mais: [
      { parte: "oficina.show", nome: "ep. 1 · Nectar: depois de conhecer o Mubarak, o show no bar" },
      { parte: "missao.notti", nome: "ep. 2 · DopaminA: o fliperama do Mubarak" },
      { parte: "oficina.catar", nome: "ep. 2 · DopaminA: a oficina do Mubarak" },
      { parte: "missao.quadra", nome: "ep. 3 · Copo Americano: o beat até o ginásio" },
      { parte: "missao.mubarak", nome: "ep. 4 · Ojalá: a loja de discos com a Nizzy" },
      { parte: "missao.tony", nome: "ep. 5 · Swav: a feira do Tony (versão atual)" },
      { parte: "missao.drew", nome: "ep. 6 · Sexta-Feira: a roupa do Drew" },
      { parte: "missao.tuneis", nome: "ep. 6 · Sexta-Feira: o grafite e a corrida nos túneis" },
      { parte: "missao.ella", nome: "ep. 7 · Sabe Ontem?: a casa-galeria da Ella" },
      { parte: "missao.nizzy", nome: "ep. 8 · Rollercoaster: o passeio do Notti (versão atual)" },
      { parte: "perseguicao.gatilho", nome: "ep. 9 · CHUVA: a perseguição, a captura e a fuga" },
      { parte: "missao.lu2ca", nome: "ep. 9 · CHUVA: o show" },
      { parte: "palcos", nome: "Guitar Driver: os níveis livres" },
    ],
  },
  {
    parte: "grafite.livre",
    nome: "O grafite livre: cada parede com o seu desenho",
    data: "2026-11-08",
    tarefa: "T64",
    olhar: "Já lá embaixo, com a missão dos túneis feita. São 8 paredes pra pintar: algumas nos rios perto da entrada e a maioria no salão do grafite. A parede sem desenho mostra a moldura \"PAREDE LIVRE · pinte aqui\". Toque em \"pintar esta parede\": a câmera vai até ela, o túnel continua em volta, e o dedo é o spray. Cada parede guarda o seu desenho e dá pra repintar (suba e desça de novo pra ver). Quem já tinha a tag antiga continua vendo ela nas paredes que ainda não pintou. Antes da missão, a parede mostra o cadeado e diz o que libera.",
    perguntas: ["Dá pra achar as paredes sem ajuda?", "A moldura \"pinte aqui\" ficou boa, ou quer outro jeito de marcar?", "Desenhar em cima da parede ficou bom no iPhone (o traço, o tamanho)?", "Ficou leve no iPhone perto das paredes?"],
    mais: [{ parte: "grafite", nome: "antes da missão: as paredes com cadeado" }],
  },
  {
    parte: "livre",
    nome: "Os outdoors do Núcleo gritando: uma propaganda diferente pra cada produto",
    data: "2026-11-08",
    tarefa: "T46",
    olhar: "Suba pras pistas da cidade e olhe as placas: agora cada um dos 15 produtos tem a própria propaganda exagerada, com letra enorme, estouros de oferta, setas, faixas e letrinha miúda debochada (a DOPA-COLA com a lata, o SORRISO PADRÃO com a boca gigante, o CARRINHO CHEIO como encarte de mercado, o NOTIFICA com a pilha de avisos). O hack continua igual: de vez em quando uma placa treme e fica preta com o nome da música.",
    perguntas: ["Ficou exagerado o bastante, bem na cara?", "Dá pra ler o nome do produto passando de carro?", "Alguma propaganda ficou feia ou com o texto estranho? Qual?", "O hack ainda se destaca no meio das propagandas?", "Continua liso no iPhone?"],
  },
  {
    parte: "missao.notti",
    nome: "Monumentos só no holo, entradas da rotatória e vinhetas fora do notch",
    data: "2026-11-08",
    tarefa: "T61",
    olhar: "Este link abre com a missão do Notti pegada e o holo ligado. Olhe o céu: de qualquer lugar da cidade tem um monumento só, o da missão ativa, na direção do lugar dela, e ele nasce na sua frente (cresce girando, com uma onda de luz). Ande pra longe e veja que ele continua na tela, com tamanho que dá pra ler, mesmo atrás dos prédios. Desligue o holo nos óculos: o céu fica limpo; ligue de novo e ele volta. Largue a missão no mapa, ou termine ela: o monumento apaga; pegue outra e só o dela aparece, nascendo também. Sem missão pegada, nenhum monumento. Depois, no segundo botão (a rotatória): nas entradas fica só o portal com o nome em cima, sem coluna de luz, e a linha da entrada seguinte vem na 2ª faixa contando da direita. Deixe a rádio tocar: a fala da Xenom e da Cidade Neon passa só no display da rádio, e o notch fica para as outras mensagens.",
    perguntas: ["De longe, o monumento ajuda a achar a missão?", "Ele fica bom aparecendo por cima dos prédios, ou incomoda quando está na frente de alguma coisa?", "O tamanho de longe ficou bom?", "Nas entradas da rotatória dá pra ler o portal e a faixa da próxima?"],
    mais: [{ parte: "torre", nome: "a rotatória (entradas)" }, { parte: "torre.ponta", nome: "numa torre da ponta (3 saídas)" }],
  },
  {
    parte: "vitrine.beco",
    nome: "O beco, a casa escondida da Ella e o posto modelados no Blender",
    data: "2026-11-06",
    tarefa: "salas",
    olhar: "O beco agora é modelado: asfalto molhado com poças refletindo os três letreiros e a lâmpada, paredões descascados com tijolo aparecendo, canos, ar-condicionado, escada de incêndio, fios de gato, lambe-lambes, caçamba, sacos, carrinho de mercado e o canto da moradora. Nos outros botões: a casa escondida (o quarto do grow com a tenda prateada e o LED roxo, e pela janela a laje na chuva com a caixa d'água e o viaduto da Linha 9) e o posto (cobertura, bombas 5 e 6 e a loja 24h por dentro: gôndolas, geladeiras, balcão vazio, luz fria). Câmeras, gente, toques, chuva e planta são os de antes. Fotos: docs/blender/beco.png, escondido.png e posto-loja.png.",
    perguntas: ["O beco tem cara de cidade suja e molhada, com o neon refletindo?", "Dá pra ver a laje e a Linha 9 pela janela da Ella?", "A loja do posto parece uma conveniência 24h de verdade?", "Ficou leve no iPhone nas três salas?"],
    mais: [{ parte: "vitrine.escondido", nome: "a casa escondida" }, { parte: "vitrine.posto", nome: "o posto" }],
  },
  {
    parte: "vitrine.terraco",
    nome: "O terraço do Notti e o quarto do Drew modelados no Blender",
    data: "2026-11-06",
    tarefa: "salas",
    olhar: "O terraço agora é modelado no Blender: piso molhado com poças, a faixa DOPAMINA na mureta, a máquina do fliperama acesa em destaque (tela de 8 bits, marquise DOPAMINA), a máquina morta e o pinball, o sofá virado pra cidade, as TVs de tubo com os consoles, o sequenciador da trilha de 8 bits, a antena, as luzes de festa e a fachada descendo. O quarto do Drew (o outro botão) também: cama baixa de paletes, varal de roupa, prateleira de tênis, o tênis na caixa, toca-discos, caixas de som, a janela com grade e a cidade. Câmera, gente e toques são os de antes. Fotos: docs/blender/topo.png e docs/blender/quarto.png.",
    perguntas: ["O terraço tem cara de lugar do Notti (fliperama, 8 bits, a faixa)?", "A máquina do fliperama aparece bem logo na chegada?", "O quarto tem a cara do Drew (roupa, tênis, som)?", "Ficou leve no iPhone nas duas salas?"],
    mais: [{ parte: "vitrine.drewboy", nome: "o quarto do Drew" }],
  },
  {
    parte: "vitrine.balada",
    nome: "A balada da Sexta-Feira modelada no Blender",
    data: "2026-11-06",
    tarefa: "balada",
    olhar: "A balada agora é um clube de verdade: a pista com o piso de LED em quadrados que pulsa na batida (e acende a cada acerto da dança), a cabine do DJ com as picapes, os paredões de som, a treliça com os feixes, o globo, o camarote de vidro com o VIP em neon, o bar com a parede de garrafas e a porta dos fundos entreaberta. A gente, o DJ, o telão e a câmera ficam onde estavam. A foto: docs/blender/balada.png.",
    perguntas: ["Tem cara de balada cheia que ninguém dança?", "O piso de LED pulsando ficou bom (ou cansa)?", "Ficou leve no iPhone?"],
    mais: [{ parte: "vitrine.shows", nome: "a casa de shows" }],
  },
  {
    parte: "vitrine.shows",
    nome: "A casa de shows modelada no Blender",
    data: "2026-11-06",
    tarefa: "shows",
    olhar: "A casa de shows vazia depois do último show: o palco de madeira com a cortina pesada, a treliça com os refletores, os telões apagados, a grade na frente do palco, a mesa de som abandonada no meio da pista, a plateia em degraus no fundo, o bar e os copos no chão. O Alohan na beira do palco e o poste piscando no meio continuam iguais; no apagão, os neons apagam junto. A foto: docs/blender/shows.png.",
    perguntas: ["Dá o clima de lugar parado no tempo?", "O apagão no fim ainda assusta?", "Ficou leve no iPhone?"],
    mais: [{ parte: "vitrine.balada", nome: "a balada" }],
  },
  {
    parte: "livre",
    nome: "O posto de rua modelado no Blender",
    data: "2026-11-06",
    tarefa: "postos",
    olhar: "Passe por uma bomba na beira da pista (há três no mapa): o posto agora é modelado no Blender, com o toldo aceso com neon amarelo e os painéis de luz embaixo, as colunas, a bomba retrô vermelha (combustível com a mangueira de um lado, recarga com o cabo do outro, o globo aceso em cima), a vaga pintada na pista, a lixeira e o totem com o preço. Mesmas posições de antes. A foto: docs/blender/posto.png.",
    perguntas: ["O posto tem cara de posto retrô-futurista à noite?", "Dá pra ler o preço no totem chegando?", "Ficou leve no iPhone perto das bombas?"],
  },
  {
    parte: "elevador",
    nome: "O andar do elevador de terror com as peças do Blender",
    data: "2026-11-06",
    tarefa: "T47",
    olhar: "A sala do elevador de terror agora usa as peças do Blender do poço do elevador 2: a cabine de grade com a porta pantográfica que dobra ao abrir, o andar de concreto com pilares e canos, as cibercamas (os robôs deitados nelas), as cápsulas com o líquido verde e as máquinas dormindo nas paredes. O passeio, os sustos, a câmera e a máquina grande do fundo são os mesmos.",
    perguntas: ["O andar ficou mais assustador que as caixas de antes?", "A porta de grade abrindo e o apagão ficaram certos?", "Ficou leve no iPhone?"],
  },
  {
    parte: "missao.nizzy",
    nome: "O parque da Nizzy (Rollercoaster) modelado no Blender",
    data: "2026-11-06",
    tarefa: "parque",
    olhar: "O parque da faixa Rollercoaster, de noite, agora modelado no Blender: o carrinho de 2 lugares com a barra de segurança amarela e o neon nas bordas (você e a Nizzy dentro), os pilares de treliça com a sela embaixo do trilho e os dormentes novos, a roda-gigante com o aro de luzes, os raios ciano, os cavaletes de treliça e as 16 cabines que agora ficam em pé enquanto a roda gira, e a estação com o letreiro ROLLERCOASTER, o portão com o arco de lâmpadas, as catracas e a bilheteria. O trilho, a volta, a câmera e a roda girando são os mesmos. A foto: docs/blender/parque.png.",
    perguntas: [
      "O parque tem cara de parque à noite (o portão, a roda, o carrinho)?",
      "O carrinho na volta e as cabines em pé na roda ficaram certos?",
      "Ficou leve no iPhone perto do parque?",
    ],
    mais: [{ parte: "missao.rollercoaster", nome: "a rua Rollercoaster" }],
  },
  {
    parte: "missao.ella.casa",
    nome: "A casa da Ella modelada no Blender: o filme da planta, a galeria e pintar",
    data: "2026-11-06",
    tarefa: "T22",
    olhar: "A casa-galeria da Ella agora modelada no Blender: um galpão enorme azul-noite com a faixa de vidro no teto, estantes de telas até o teto (a maioria de costas), as 6 molduras de jeitos diferentes com um spot em cima, o mezanino no fundo com a escada caracol e plantas penduradas, a planta do Criador no pedestal sob a redoma com a luz de cultivo roxa, o mural pintado atrás dela, o cavalete com o carrinho de tintas e o pano manchado, a cama de palete, o cantinho de almofadas, tapetes e plantas. A câmera, a Ella, os quadros e o pintar estão nos mesmos lugares. A foto: docs/blender/galeria-ella.png.",
    perguntas: [
      "A casa tem a cara dela (galeria enorme, proibida, com as plantas e as almofadas)?",
      "A planta na redoma com a luz roxa chama atenção o bastante?",
      "Ficou leve no iPhone (abriu rápido, sem travar)?",
    ],
    mais: [{ parte: "missao.ella", nome: "começar na rua" }],
  },
  {
    parte: "missao.tuneis.trincheiras",
    nome: "Os patins, o skate e a BMX modelados no Blender",
    data: "2026-11-06",
    tarefa: "rodas",
    olhar: "Lá embaixo, nas trincheiras, escolha patins, skate ou BMX: os três agora são de sucata do subúrbio com neon. Os patins são tênis velhos com rodas neon e o jato nas costas é um extintor e um botijão (a chama acende no propulsor); o skate é uma tábua com placa de rua embaixo; a BMX tem a placa \"12\" e um tubo enferrujado. As rodas giram, o guidão vira e as manobras são as mesmas. A foto: docs/blender/rodas.png.",
    perguntas: ["Os três parecem feitos de sucata, com neon, como a moto?", "As rodas giram e as manobras (barspin, tailwhip, kickflip) ficaram certas?", "Ficou leve no iPhone?"],
    mais: [{ parte: "carreira.meio", nome: "de patins na rua (o jato no propulsor)" }],
  },
  {
    parte: "bar",
    nome: "O bar do prólogo (O COPO) modelado no Blender",
    data: "2026-11-06",
    tarefa: "bar",
    olhar: "O primeiro bar que o jogador novo vê, agora modelado no Blender: bar de sucata do lixo da cidade, com paredes de chapa em retalhos, o balcão de madeira reaproveitada com tampo de chapa e o neon laranja embaixo, banquetas de tambor, mesas de carretel com a lâmpada pendurada, a prateleira de garrafas, a geladeira velha, o jukebox, a mesa de sinuca no fundo à esquerda, o palquinho de paletes, varais de lâmpadas, cartazes e a caneca de neon. As pessoas, os copos e a câmera estão nos mesmos lugares.",
    perguntas: ["O bar ficou aconchegante e sujo do jeito certo?", "Dá pra ler o letreiro O COPO e ver a sinuca no fundo?", "Ficou leve no iPhone (abriu rápido, sem travar)?"],
    mais: [{ parte: "vitrine.bar", nome: "o bar e a sinuca" }],
  },
  {
    parte: "livre",
    nome: "Os lugares da cidade modelados no Blender",
    data: "2026-11-06",
    olhar: "Os lugares da cidade modelados no Blender: nas pistas, os 4 palcos das faixas viraram um palco suspenso (treliça, caixas de som penduradas, telão); a estação 6 da Linha 9 é uma plataforma com cobertura de vidro; o terraço da Notti, uma torre de vidro com o terraço no alto; a casa do Drew, loja de streetwear com o AP em cima; a balada e a casa de shows, um monolito preto com túnel de neon e equalizador; a casa da Ella, uma cápsula escondida atrás das ripas. O neon de cada um é a cor da faixa. A foto: docs/blender/lugares-cidade.png.",
    perguntas: [
      "Os lugares ficaram com cara da cidade lá de cima (limpo, vidro, neon)?",
      "Algum tipo precisa de outro desenho (o palco, a estação, a balada)?",
    ],
  },
  {
    parte: "elevador.terror",
    nome: "O elevador de terror (rascunho): a subida pelo poço da torre 2",
    data: "2026-11-06",
    tarefa: "T47",
    olhar: "(07/11) Modelado no Blender: a cabine com o painel de botões e a porta de grade pantográfica (ela dobra pro canto), as cibercamas com cabos e monitor, as cápsulas de vidro com líquido verde, as máquinas com o respiro, os andares com pilares e canos, os trilhos e vigas do poço (os robôs continuam caixas até chegar o do Tripo). Abre no salão da TORRE 2, na frente do elevador. Toque em \"subir · torre 2\": a grade fecha e a cabine sobe devagar pelo poço; em cada andar, robôs dormindo em cibercamas, gente em cápsulas verdes e máquinas com a luz respirando. A música abafa e entra um zumbido grave. Um tranco, a luz apaga, a cabine cai um pouco e para; aí acende o vermelho e ela dispara até o topo e você chega na torre da ponta 2. Arraste pra olhar em volta; toque pra pular. Na 2ª vez aparece \"subir rápido\" do lado. De BMX ou skate você chega de patins, e ao descer de novo pelo elevador a BMX/o skate voltam.",
    perguntas: ["As peças modeladas (cabine, camas, cápsulas, máquinas, andares) estão com a cara certa?", "O susto (o tranco, o escuro, a queda) assusta ou é fraco?", "O tempo (uns 25 s) está bom ou longo?", "Robôs, cápsulas e máquinas: o que mais você quer ver nos andares?", "Primeira vez obrigatória e depois \"subir rápido\": fica assim?"],
    mais: [{ parte: "elevador.subir", nome: "o elevador comum (torre 1)" }],
  },
  {
    parte: "elevador.subir",
    nome: "Os elevadores do túnel: as 3 torres dos salões sobem pras torres das pontas",
    data: "2026-11-06",
    tarefa: "elevadores",
    olhar: "Abre lá embaixo, no salão da TORRE 1, na frente do elevador (a missão dos túneis já feita). Aparece \"subir · torre 1 (Nectar, Sexta-Feira, Ojalá)\": toque, a cabine sobe rapidinho e você chega de patins na rotatória da torre da ponta da Nectar (de moto, se estava de moto). Lá em cima, na rotatória, \"descer · túneis (torre 1)\" leva de volta ao salão. A TORRE 2 (Rollercoaster, Swav, DopaminA) e a 3 (Copo Americano, CHUVA, Sabe Ontem?) fazem o mesmo. O mapinha dos túneis mostra o ícone do elevador em cada torre. (06/11, modelados no Blender) Lá embaixo, encostada na torre: a moldura de aço com a grade pantográfica, a cabine acesa, o painel com o número 1 e as 3 faixas coloridas, as luzes âmbar de chamada e os cabos subindo pela torre. Lá em cima, no anel da torre da ponta: a casinha do elevador encostada no prédio do meio, com porta de vidro, o letreiro \"TÚNEIS ▼\" e a passarela até a pista. Antes da missão dos túneis, o botão vem com cadeado: \"abre com a missão dos túneis\".",
    perguntas: ["A subida curta da cabine basta, ou quer ver a cabine subindo no mundo?", "Chegar de patins na rotatória está bom, ou a Kombi devia subir junto?", "As torres 1, 2 e 3 ligadas assim (Nectar · Rollercoaster · Copo Americano) ficam?"],
    mais: [{ parte: "torre.ponta", nome: "a torre da ponta (descer · túneis)" }, { parte: "missao.tuneis.trincheiras", nome: "com o cadeado (antes da missão)" }],
  },
  {
    parte: "dunas",
    nome: "O começo de um jogador novo com o que entrou hoje: nada do novo por cima da trilha",
    data: "2026-11-06",
    tarefa: "jogador-novo2",
    olhar: "Das dunas até a 2ª missão. Nas dunas, com o disco tocando, o botão do violão com cadeado não aparece mais (ele dizia \"faça a missão da D-Bee\" no meio dela). Com uma pedra presa no notch (\"ícone no meio: acelera\", \"pousa numa pista acesa\", \"segue a linha até lá\", \"chegou\"), a vinheta da Xenom, o \"abriu\" e as falas esperam a pedra sair e passam depois. Na oficina, passando pela galeria, pelo ginásio ou pelo estúdio, o \"entrar\" aparece com o cadeado e diz \"abre mais pra frente na história\". Com uma pedra na tela o \"entrar\" e o violão esperam; a pedra saiu e você ainda está na porta, o \"entrar\" aparece sozinho. Uma mensagem parada atrás de \"segue a linha\" passa depois de uns 6 s. Na rádio do bar e da oficina o locutor não fala dos lugares do chão. Na carreira, a D-Bee fica calada até a pedra \"abriu coisa nova: olha\" e, até a 2ª missão da cidade, só sugere missões.",
    perguntas: ["Alguma coisa nova ainda aparece por cima do caminho?", "O texto \"abre mais pra frente na história\" está bom pro cadeado do prólogo?", "A D-Bee só com missões até a 2ª está bom, ou muito calada?"],
    mais: [{ parte: "oficina.catar", nome: "catando as peças" }, { parte: "subir", nome: "subindo pra cidade" }],
  },
  {
    parte: "carreira.meio",
    nome: "A D-Bee e a rádio Xenom apontam o que é novo: os lugares do chão, o instrumento, a tinta, o trem, o violão",
    data: "2026-11-06",
    tarefa: "ganchos",
    olhar: "Ande pelo subúrbio sem missão. A D-Bee (no notch) sugere o lugar do chão mais perto que você ainda não visitou, o instrumento novo pelo nome (\"ganhou o udu: passa lá em casa\"), a tinta sobrando nos túneis, o trem de revanche, o violão com música tocando e, depois do final, as plantas, as cabines e o rio. Toque na frase: o lugar fica marcado no mapa. Ligue a Xenom: entre as músicas o locutor fala dos lugares (ginásio, galeria, discos, batida, flores, brechó, palco, quadra), alternando com o clima. Tudo é rascunho de texto. Agora o jogo guarda o que você já fez: entrou num lugar do chão (ou foi ver o cadeado), ela para de sugerir esse lugar e o mapa aberto põe um ✓ discreto do lado do nome; tocou o violão uma vez ou viu o mundo depois (andou na cidade, desceu aos túneis), essas frases somem.",
    perguntas: ["O tom da D-Bee e do locutor está certo? Qual frase reescrever?", "Ela fala dos lugares na medida ou demais?", "Fala do lugar trancado (o cadeado) ou só dos abertos?"],
    mais: [{ parte: "mundo.depois", nome: "depois do final" }, { parte: "grafite.livre", nome: "com a tinta nos túneis" }, { parte: "metro.tuneis", nome: "com o trem de revanche" }],
  },
  {
    parte: "carreira.meio",
    nome: "O subúrbio cheio: ginásio, galeria, discos, batida, flores e brechó no chão",
    data: "2026-11-06",
    tarefa: "subúrbio",
    olhar: "Lá embaixo, no subúrbio, olhe o mapa: seis lugares novos (letreiro em neon, cada um com um detalhe: o arco do ginásio, o vinil gigante, as caixas de som, os quadros, os canteiros, a arara de roupa). Chegue perto de um: aparece \"entrar\"; a página abre por cima do jogo e, ao sair, você volta onde estava. O palco e a quadra também ganharam o \"entrar\". O trancado mostra o cadeado e o que libera. Agora os seis são modelados no Blender: galpão em arco com pneus, vitrine rachada com quadros, contêineres com o vinil gigante, ônibus com caixas de som, estufa de garrafa PET e barraca com araras e manequins.",
    perguntas: ["Os lugares estão longe o bastante uns dos outros e fáceis de achar?", "O brechó e as flores abrindo a loja e o jardim do celular servem por enquanto?", "Alguma fachada que não parece o que é?"],
    mais: [{ parte: "oficina", nome: "no começo (alguns trancados)" }],
  },
  {
    parte: "missao.tuneis.trincheiras",
    nome: "Sem \"em breve\": as torres das trincheiras e a Kombi quebrada",
    data: "2026-11-06",
    tarefa: "bloco 1",
    olhar: "Lá embaixo, encoste numa das torres: em vez de \"a porta sobe pra rua (em breve)\", ela diz que a saída é A PORTA (o quadradinho laranja no mapinha). No outro link, a Kombi quebra: a fala só manda de patins pra oficina, sem \"o metrô: em breve\". As 13 missões já não têm peça \"em breve\" (lista em docs/sem-em-breve.md).",
    perguntas: ["As torres deviam subir pra cidade um dia, ou a saída é só A PORTA?", "Os combos das missões (Drew, Xeriff, Notti, Nizzy, Tony, LU2CA, Ella) ficam como estão?"],
    mais: [{ parte: "quebra", nome: "a Kombi quebrada (window.__cnQuebrar)" }],
  },
  {
    parte: "missao.tuneis.trincheiras",
    nome: "Moto mais leve e modelada no Blender (e a cidade com menos gasto por quadro)",
    data: "2026-11-06",
    olhar: "A moto agora é modelada no Blender: moto de trilha montada com sucata do subúrbio (tanque rosa com remendo de zinco, laterais de placa de rua, pneus com cravos, aro neon ciano, dois faróis, neon embaixo do motor). Continua desenhada em 7 pedaços (eram ~25), e o piloto é o mesmo. Olhe as rodas girando, o guidão virando nas curvas, a empinada, o cromo e o brilho do neon; no parque, o carrinho e a câmera; a pé, encostar nos prédios.",
    perguntas: ["A moto nova ficou boa? Mais sucata, mais neon, ou assim?", "As rodas, o guidão e a empinada se mexem certo?", "Sentiu o jogo liso no iPhone?"],
    mais: [{ parte: "livre", nome: "a cidade (parque, campo de força)" }],
  },
  {
    parte: "mundo.depois",
    nome: "O mundo depois do final: plantas nos prédios, cabines nas torres, o rio nos túneis",
    data: "2026-11-06",
    tarefa: "T29",
    olhar: "Abre com o final já feito, chegando na torre central. Sem tela explicando: os prédios altos têm plantas nas janelas (jardineiras, moitas de folhas grandes, vasos pendentes, agora modelados no Blender) com florzinhas acesas, e trepadeiras subindo da rua; em volta das torres as cabines de vidro (banco e plantas dentro) sobem e descem (as claras sobem, as azuis descem). As plantas só aparecem nas quadras perto (até uns 300 m): ao longe os prédios ficam sem elas. Repare se o iPhone continua liso perto dos prédios altos e se dá pra ver as plantas surgindo. No outro link, desce pras trincheiras: os rios secos viraram rio, com a água correndo no leito (a rampa da descida continua seca). A porta \"o mundo depois\" não diz mais \"em breve\".",
    perguntas: ["As plantas e as cabines aparecem o bastante, ou quer mais (ou menos)?", "As plantas modeladas parecem planta de verdade? E as flores acesas, brilho suave ou forte demais?", "O rio no meio do leito está bom, ou deve ocupar o túnel todo?", "Cabines também nas pistas (bondinhos), ou só nas torres basta?"],
    mais: [{ parte: "mundo.depois.tuneis", nome: "o rio nas trincheiras" }],
  },
  {
    parte: "livre",
    nome: "Os outdoors do Núcleo nos prédios da cidade (e o hack com as suas músicas)",
    data: "2026-11-06",
    tarefa: "T46",
    olhar: "Suba pras pistas da cidade: muitos prédios agora têm uma placa na fachada que olha a pista, com produtos do Núcleo (rascunho: SCROLL INFINITO, DOPA-COLA, SONO LITE…). De vez em quando uma placa \"é hackeada\": treme, as cores se separam e aparece o nome da faixa daquela rua com \"LU2CA\". Fique uns segundos parado olhando várias placas.",
    perguntas: [
      "Os nomes e slogans dos produtos (rascunho) servem? Quer trocar algum?",
      "O hack aparece pouco, na medida, ou demais?",
      "Placas demais nos prédios, ou pode ter ainda mais?",
    ],
  },
  {
    parte: "carreira.meio",
    nome: "O Nexo só informa: o \"?\" explica qualquer coisa da tela",
    data: "2026-11-06",
    tarefa: "T41",
    olhar: "Toca no \"?\" do notch: ele diz \"toque em qualquer lugar para saber mais\". Toca no mapa, no ♪, no notch, no drone, nos botões de veículo: um texto curto aparece colado na coisa, sem tampar nada.",
    perguntas: [
      "A dica da D-Bee no notch agora vem sem o nome dela. Fica assim ou ela sai do notch?",
      "As vinhetas da rádio podem passar no notch também?",
    ],
    mais: [{ parte: "perseguicao.escolher", nome: "os botões de veículo" }],
  },
  {
    parte: "violao",
    nome: "O violão na rua: aparece com a música da rua e a trilha abaixa",
    data: "2026-11-06",
    tarefa: "T64",
    olhar: "Com qualquer música tocando (a faixa da rua, a rádio ou o disco), o botão do violão aparece à direita. Abriu: as notas e os acordes no tom da faixa, e a música abaixa um pouco enquanto ele está aberto. Sem o violão (antes da D-Bee ou depois do metrô), o botão aparece apagado com cadeado e diz o que libera.",
    perguntas: ["A música só abaixar está bom, ou deve parar enquanto toca?", "O botão aparece na hora certa na rua?"],
  },
  {
    parte: "grafite.livre",
    nome: "O grafite livre: a sua tag nas paredes dos túneis",
    data: "2026-11-06",
    tarefa: "T64",
    olhar: "Já lá embaixo, com a missão dos túneis feita. Ande até uma parede com a tag \"LU2CA\" (os rios têm uma a cada poucas paredes) e toque em \"pintar a sua tag\": o dedo é o spray. \"pintar na parede\" troca a LU2CA pela sua tag em todas essas paredes e fica salvo (suba e desça de novo pra ver).",
    perguntas: ["Uma tag só basta, ou quer várias paredes diferentes?"],
    mais: [{ parte: "grafite", nome: "o grafite da missão (antes: com cadeado na tag)" }],
  },
  {
    parte: "metro.tuneis",
    nome: "O metrô de novo: o trem parado no salão dos túneis",
    data: "2026-11-06",
    tarefa: "T64",
    olhar: "A fuga de quando te pegam já aconteceu. Nos túneis, vá até o SALÃO DO METRÔ (o trem parado): perto dele, \"entrar no trem\" abre a fuga de novo, sem mudar nada no save. Antes da fuga da história, o botão aparece com cadeado. Modelado no Blender (06/11): o trem parado agora é o metrô do Núcleo abandonado e reaproveitado — aço escovado riscado, a faixa azul pintada e as linhas de luz, janelas com grade, portas de correr laranja, pichação neon; e por dentro, na fuga, os bancos de plástico de cores trocadas, a grade nas janelas e as propagandas do Núcleo apagadas. As fotos: docs/blender/metro.png e docs/blender/metro-interior.png.",
    perguntas: ["A revanche no trem serve, ou o metrô deveria ser uma missão própria?"],
    mais: [{ parte: "metro", nome: "a fuga da história (quando te pegam)" }],
  },
  {
    parte: "instrumentos",
    nome: "Os 11 instrumentos ancestrais na casa da D-Bee",
    data: "2026-11-06",
    tarefa: "T49",
    olhar: "Abre na casa da D-Bee com todos os instrumentos ganhos, cada um no seu lugar no banco e nas prateleiras: toque em cada um (tocar de novo muda a nota). A música do jogo para enquanto você toca e volta no \"pronto\". No outro link, só alguns ganhos: os outros ficam apagados com cadeado e, tocando, a D-Bee diz de que missão vêm. Fechar uma missão agora mostra no notch \"+ o udu · na casa da D-Bee\". Modelados no Blender: os 11 agora são peças de verdade (as cordas e a cabaça do berimbau, os furos da flauta, as lamelas da kalimba, o couro e as cordas do djembê).",
    perguntas: [
      "Os sons (sintetizados, rascunho) servem ou você manda samples?",
      "A lista (djembê, tambor de água, udu, caxixi, sitar, didgeridoo, berimbau, flauta de bambu, ocarina, handpan, kalimba) e quem dá cada um ficam assim?",
    ],
    mais: [{ parte: "casa.instrumentos", nome: "só alguns ganhos (os trancados com cadeado)" }, { parte: "recompensa.instrumento", nome: "fechar a missão do Mubarak (+ o sitar)" }],
  },
  {
    parte: "livre",
    nome: "Ojalá saiu: o ♥ salvar abre a faixa de verdade",
    data: "2026-11-06",
    olhar: "Na rua do Ojalá, o ♪ → ♥ salvar agora abre o Ojalá no Spotify (pela página do song.link, com todos os apps), não mais o seu perfil. A data de lançamento no jogo foi corrigida pra 06/11.",
    perguntas: ["Na rua do Ojalá, o ♥ salvar abriu a faixa certa?"],
  },
  {
    parte: "dunas",
    nome: "O começo pra quem nunca jogou (sem travas)",
    data: "2026-11-05",
    olhar: "Segui o caminho de um jogador novo até a 2ª missão e destravei: fechar e reabrir no meio da cena do bar/oficina agora reabre o lugar; beber no bar abre de novo; o disco das dunas toca ao reabrir; a D-Bee não fala por cima dos balões da trilha; a pedra do turbo vem depois. Chegando no subúrbio, o disco sai em fade e a rádio Xenom entra em fade; no iPhone, se o som não sair, toca no próximo toque. \"Depois\" na introdução deixa no notch \"a missão do X tá aqui · toca pra começar\".",
    perguntas: [
      "Mostre pra alguém que nunca jogou: a pessoa chegou na 1ª missão sozinha?",
      "No iPhone, a rádio tocou ao chegar no subúrbio?",
    ],
    mais: [{ parte: "bar", nome: "o bar do prólogo (modelado no Blender)" }],
  },
  {
    parte: "livre",
    nome: "Revisão 3: as zonas valem na carreira, D-Bee fala, final sem tranco",
    data: "2026-11-05",
    olhar: "As regras de veículo por zona e os rachas agora valem também na carreira (antes só no jogo livre): no deserto só Kombi/moto, no subúrbio a pé/patins/moto. A D-Bee passou a sugerir coisas na carreira também. Na corrida de rua o GPS aponta pro próximo portão.",
    perguntas: [
      "Missão do bar/quadra/túneis indo de Kombi: desceu na borda do subúrbio direitinho?",
      "Os rachas aparecendo na carreira atrapalham as missões?",
    ],
  },
  {
    parte: "livre",
    nome: "A D-Bee sugere o que fazer",
    data: "2026-11-05",
    olhar: "Sem missão e passeando (45 s solto, ou logo depois de acabar algo), a D-Bee aparece no notch com uma ideia do que fazer agora: a corrida de rua, a sinuca, uma rua que você ainda não ouviu inteira, a TV, o piloto, o grafite, a moto, uma missão perto. No máximo uma a cada 90 s. Tocar na frase marca o lugar no mapa e o GPS leva até lá. As falas são rascunho.",
    perguntas: [
      "A D-Bee fala na medida, ou é muito/pouco?",
      "As falas têm a voz dela? Qual reescrever?",
    ],
  },
  {
    parte: "livre",
    nome: "Revisão 2: ruas sem tranco, câmera reta, celular mais leve",
    data: "2026-11-05",
    olhar: "As ruas-manifesto não entortam mais o mapa do drone nem a primeira pessoa. Passar de uma rua pra outra é suave (fade). Parado uns segundos na rotatória, o jogo prepara as ruas pra não dar tranco na entrada. No celular médio/leve as ruas pesadas mostram menos coisas. Na rua CHUVA o vidro embaça. Largada da corrida de rua mais firme.",
    perguntas: [
      "Entrando nas ruas: ainda deu algum tranco?",
      "O mapa do drone ficou reto no meio das ruas Copo e Rollercoaster?",
    ],
  },
  {
    parte: "bar",
    nome: "Gente nas ruínas (a vida no subúrbio)",
    data: "2026-11-05",
    olhar: "70 pessoas andando pelas calçadas das ruínas, rodinhas em volta dos tambores de fogo e na porta do bar, gente dançando na frente do palco no ritmo da rádio, gatos e cachorros, roupa no varal. De dia a rua enche; de noite o povo vai pro fogo, pro bar e pro palco. Chegou perto, abrem caminho. Na corrida de rua ninguém fica no traçado.",
    perguntas: [
      "O subúrbio ficou com cara de lugar vivo?",
      "As silhuetas combinam com o estilo do jogo, ou quer outro desenho de gente?",
    ],
  },
  {
    parte: "bar",
    nome: "A corrida de rua nas ruínas do subúrbio",
    data: "2026-11-05",
    olhar: "Perto do bar tem um arco neon CORRIDA. De moto ou de patins, chegue perto e toque em \"correr\": 2 voltas de ~1,6 km pelas ruas das ruínas, 11 portões de luz, 3 rivais (de moto: Trovão, Vespa e Lama). A rádio não para. O melhor tempo fica guardado; a primeira vitória dá +40 Água$. O ponto aparece no mapa depois que você chega no subúrbio.",
    perguntas: [
      "Os rivais estão fáceis ou difíceis demais?",
      "O traçado ficou gostoso (curvas, retas)?",
    ],
  },
  {
    parte: "missao.ojala",
    nome: "As 4 últimas ruas-manifesto: Ojalá, Swav, Sexta-Feira e Rollercoaster",
    data: "2026-11-05",
    olhar: "Ojalá: fitas e confete no vento, e desejos (coração, estrela, pipa) que somem antes de você chegar; tocar num segura por 2 s, mas ele vai. Swav: a pista vira espelho e abre vãos de abismo; acelerar no vão é o salto de fé. Sexta-Feira: multidão dançando no ritmo, cheia de longe e oca de perto; o drift faz ela pular junto. Rollercoaster: um trilho de montanha-russa sobe e desce com a energia da música; segure o propulsor no topo. Agora as 9 ruas têm a sua.",
    perguntas: [
      "Alguma rua pesou no iPhone (a Sexta tem ~2 mil silhuetas)?",
      "Swav: dá pra ler a pista com o espelho e os vãos?",
    ],
    mais: [{ parte: "missao.swav", nome: "Swav" }, { parte: "missao.sexta", nome: "Sexta-Feira" }, { parte: "missao.rollercoaster", nome: "Rollercoaster" }],
  },
  {
    parte: "livre",
    nome: "Revisão da noite: 14 correções onde as partes se cruzavam",
    data: "2026-11-05",
    olhar: "Reabrir o jogo não desce mais pro túnel sozinho e volta no mesmo veículo (Kombi, moto ou patins). Sair da casa da D-Bee/bar não te joga lá em cima. Voar na cidade não troca a rádio. O balão de introdução fecha se você for embora. Uma música por vez (a TV fecha quando você vai tocar). O ♥ e a 📺 viraram um botão só: ♪. A TV agora fica à direita, acima do turbo.",
    perguntas: [
      "O ♪ (salvar e TV) ficou fácil de achar?",
      "Reabriu o jogo e voltou certinho onde e como estava?",
    ],
  },
  {
    parte: "missao.chuva",
    nome: "Mais 3 ruas-manifesto: CHUVA, Copo Americano e Nectar",
    data: "2026-11-05",
    olhar: "CHUVA: a chuva começa fina e engrossa com a faixa, e flores de luz nascem onde ela cai, no ritmo; segure o propulsor ou o freio pra abrir um guarda-chuva de luz que faz o trecho florescer mais. Copo Americano: copos gigantes enchem de luz no ritmo; acelerou demais, transbordam e a rua balança de leve; tocar num copo faz um brinde. Nectar: as palavras da letra flutuam como pétalas e tentam virar verso (às vezes dá certo, às vezes não); tocar numa palavra a prende no céu.",
    perguntas: [
      "Alguma dessas briga com dirigir (toque, leitura da pista)?",
      "Qual das 5 ruas ficou mais com a sua cara?",
    ],
    mais: [{ parte: "missao.copo", nome: "a rua Copo Americano" }, { parte: "missao.nectar", nome: "a rua Nectar" }],
  },
  {
    parte: "missao.dopamina",
    nome: "As ruas-manifesto: DopaminA (vício) e Sabe Ontem? (tempo)",
    data: "2026-11-05",
    olhar: "DopaminA: telas e celulares ao longo da rua pipocam notificações, coração no ritmo e um número que só sobe; quanto mais você fica, acelera ou usa turbo, mais elas se multiplicam até estourar; soltou o acelerador, tudo esvazia. Tocar numa tela dá um like: brilha e depois fica mais vazio. Sabe Ontem?: o céu passa de 5h às 22h durante a faixa, relógios certos, adiantados e ao contrário nos prédios e no céu, e fantasmas da Kombi ficam no ar como ontem. Freou forte: o tempo segura.",
    perguntas: [
      "Dá pra sentir a música e o tema sem ninguém explicar?",
      "Qual das duas tem mais a sua cara? Sigo nesse caminho pras outras 7 ruas?",
    ],
    mais: [{ parte: "missao.ontem", nome: "a rua Sabe Ontem?" }],
  },
  {
    parte: "livre",
    nome: "A cidade maior mais leve (pista e postes por perto)",
    data: "2026-11-05",
    olhar: "Com a cidade maior, a pista, os postes, os pilares e a chuva agora só mandam pra tela o que está perto (a menos de ~1,3 km): ~1500 postes em vez de ~2400, e menos peso por vista. Nada deve mudar no visual. Também saiu código velho do tutorial antigo.",
    perguntas: [
      "Ficou mais liso dirigindo na cidade?",
      "Viu algum pedaço de pista ou poste surgindo do nada na frente?",
    ],
  },
  {
    parte: "bar",
    nome: "As ruínas acesas de noite",
    data: "2026-11-05",
    olhar: "De noite (das 17h às 19h acende) as ruínas do subúrbio ganham vida: janelas acesas (quentes, algumas neon, umas piscando de TV), letreiros neon (BAR, DISCOS, BAILE, BRECHÓ, FLORES, 24H…), tambores de fogo nas ruas e varais de lâmpadas atravessando as ruas. Sem luz pesada: tudo leve.",
    perguntas: [
      "Ficou com cara de lugar vivo de noite?",
      "Algum letreiro flutuando fora da parede?",
    ],
  },
  {
    parte: "livre",
    nome: "A TVzinha do YouTube no holo",
    data: "2026-11-05",
    olhar: "No notch, o botão 📺 TV abre uma TV pequena (arrastável pra qualquer canto) com o vídeo da faixa que está tocando. Você dá o play, o som do jogo some e a música vem do YouTube (conta view de verdade); o jogo continua atrás. Acabou o vídeo, vem o da próxima faixa. Por enquanto só Sabe Ontem?, CHUVA e Copo Americano têm vídeo.",
    perguntas: [
      "O play e o próximo vídeo funcionaram no iPhone?",
      "O canto de baixo à esquerda é bom pra TV, ou prefere outro?",
    ],
  },
  {
    parte: "livre",
    nome: "O piloto automático (o mapa copiloto)",
    data: "2026-11-05",
    olhar: "O botão do volante (ao lado da barra do GPS, no lugar do ∞) liga o piloto: com missão/destino, a Kombi vai sozinha pela rota, na velocidade normal, e para no lugar; sem destino, passeia dando voltas na mesma rua (a música não troca). A câmera sobe e vai pro lado pra curtir. Mexeu no volante, acelerou ou freou: o controle volta pra você.",
    perguntas: [
      "O piloto chegou certinho no destino?",
      "A câmera de passeio ficou bonita?",
    ],
  },
  {
    parte: "bar",
    nome: "As duas rádios (Xenom e Cidade Neon)",
    data: "2026-11-05",
    olhar: "Rádio Xenom (69.9) no subúrbio, túneis e deserto, com som de rádio antiga: toca o que não é do vol. 1 e, entre as músicas, o locutor (em legenda por enquanto) conta o que rola no subúrbio e puxa as missões. Rádio Cidade Neon (222.0) na cidade: só o vol. 1. A estação troca sozinha com a zona. Na cidade, entrar numa rua põe a faixa dela como a próxima.",
    perguntas: [
      "As vinhetas do locutor têm a voz certa? (são rascunho)",
      "A troca sozinha de estação ficou natural?",
    ],
    mais: [{ parte: "livre", nome: "a Rádio Cidade Neon" }],
  },
  {
    parte: "bar",
    nome: "O subúrbio maior e destruído (ruínas com colisão)",
    data: "2026-11-05",
    olhar: "Em volta do bar, da oficina, da quadra e da entrada dos túneis agora tem quadras de ruínas: 183 prédios (inteiros, com o topo desmoronado ou com um andar faltando) e montes de entulho, com ruas de 12 m pra andar a pé, de patins e de moto. Tudo tem colisão. Leve: ~25 mil triângulos.",
    perguntas: [
      "A escala das ruas e prédios ficou boa a pé e de moto?",
      "As ruínas ficam escuras de noite: quer neon/janelas acesas nelas?",
      "Ficou no lugar certo (em volta do bar e da oficina)?",
    ],
  },
  {
    parte: "livre",
    nome: "A moto no mundo aberto",
    data: "2026-11-05",
    olhar: "A moto sai da Kombi (botão \"moto\") e anda na cidade, no deserto, no subúrbio e nos túneis: mais rápida que o patins, sem voar, pula rampas. \"Guardar a moto\" volta pra Kombi. Ela é o prêmio da missão dos túneis; antes disso aparece com cadeado. Kombi quebrou no deserto: você segue de moto até a oficina. Na cidade livre ela já vem aberta.",
    perguntas: [
      "A moto ficou gostosa de pilotar (velocidade, curva)?",
      "Os botões \"moto\" e \"guardar a moto\" estão no lugar certo?",
    ],
    mais: [{ parte: "missao.tuneis.trincheiras", nome: "de moto nos túneis" }],
  },
  {
    parte: "bar",
    nome: "O subúrbio e a Kombi por dentro, mais leves (Blender)",
    data: "2026-11-05",
    olhar: "O subúrbio caiu de 205 mil pra 36 mil triângulos (3,5 MB → 1,3 MB): os prédios viraram caixas leves com a fachada original pintada nelas. O mural do dragão e os neons ficaram iguais. O interior da Kombi foi de 90 mil pra 26 mil (1 MB → 0,3 MB), com o mesmo desenho.",
    perguntas: [
      "De perto, as fachadas ficaram borradas demais? (dá pra subir a textura)",
      "O jogo ficou mais leve no subúrbio?",
    ],
    mais: [{ parte: "kombi.dentro", nome: "a Kombi por dentro" }],
  },
  {
    parte: "livre",
    nome: "As ruas do tamanho da faixa (a cidade maior)",
    data: "2026-11-05",
    olhar: "Cada rua cresceu pra que uma volta, sem turbo, dure a faixa inteira (ex.: Rollercoaster de 1,6 km pra 8,2 km de ida; Nectar de 1,4 pra 3,1 km). A cidade foi de ~1,9 km pra ~3,4 km de lado. O desenho é o seu, esticado: olhe pelo drone (mapa) antes de aprovar.",
    perguntas: [
      "O desenho esticado das ruas ficou bom no drone? Qual rua estranhou?",
      "Rodou liso no iPhone, mesmo com a cidade maior?",
      "As missões ficaram longe demais umas das outras?",
    ],
  },
  {
    parte: "dunas",
    nome: "A trilha de pedras (o tutorial sem telas)",
    data: "2026-11-05",
    olhar: "Uma coisa por vez: um balão pequeno com setinha preso na coisa real (mapa, anel, notch, turbo, propulsor, rádio, ♥), que pulsa de leve; some quando você faz. Sem tela escura. O \"?\" mostra a pedra de agora e as setas ‹ › voltam nas anteriores. Nas missões da cidade, a tela \"a porta abriu\" saiu: o que liberou brilha no mapa e aparece no notch. Os textos são rascunho.",
    perguntas: [
      "Dá pra seguir sem errar o caminho? Alguma pedra sobrou ou faltou?",
      "Os ícones animados ficaram bons no iPhone?",
      "Antes a recompensa abria a loja de discos sozinha; agora só avisa no notch. Tudo bem?",
    ],
    mais: [{ parte: "livre", nome: "na cidade" }],
  },
  {
    parte: "missao.tuneis.trincheiras",
    nome: "Os túneis bem maiores",
    data: "2026-11-05",
    olhar: "De ~1,7 km pra ~5,7 km: um pentágono de 5 rios, salões altos (o do metrô com o trem parado, o do grafite com as trincheiras), bifurcações e uma rampa de descida de 300 m da porta. A corrida agora tem ~4 km e 5 portões. Túneis com 40 m de largura e 22 m de altura.",
    perguntas: [
      "Ficou com cara de mundo subterrâneo grande? Rodou liso no iPhone?",
      "A volta de moto (2 voltas, ~4 min) é longa demais? Vira 1 volta?",
      "Os nomes (Salão do Grafite, Galeria do Atalho, Rio Seco) servem ou você quer outros?",
    ],
  },
  {
    parte: "bar",
    nome: "A trilha que não para (rádio antiga e as introduções)",
    data: "2026-11-05",
    olhar: "Chegando do deserto no subúrbio, a rádio liga sozinha com som de rádio antiga (no subúrbio e túneis; na cidade, limpa). Missões, peças, salas e o fliperama não param a música: só abaixam. Ela para só pra fazer música: batida, Guitar Driver, tambor e instrumentos com a D-Bee, a trilha 8 bits do Notti. Antes de cada missão, quem pede fala 1–2 frases num balão (rascunho: reescreva à vontade).",
    perguntas: [
      "O filtro de rádio antiga ficou bom no iPhone?",
      "Os textos das introduções têm a voz certa? Qual reescrever?",
      "O violão continua tocando junto com a música (acompanha no tom). Fica assim?",
    ],
    mais: [{ parte: "missao.drew", nome: "uma introdução (Drew)" }, { parte: "missao.notti.jogo", nome: "o fliperama do Notti" }],
  },
  {
    parte: "livre",
    nome: "Veículos por zona e sem o banner do GPS",
    data: "2026-11-05",
    olhar: "O banner grande de GPS saiu: fica só o notch (com uma setinha quando vem curva). Na cidade vale tudo; no deserto só a Kombi (não dá pra sair dela); no subúrbio e nos túneis a pé/patins (a Kombi fica na entrada). A moto aparece com cadeado.",
    perguntas: [
      "Entrar no subúrbio de Kombi e ela ficar na entrada ficou natural?",
      "Sentiu falta de alguma informação do banner?",
    ],
    mais: [{ parte: "dunas", nome: "o deserto" }, { parte: "bar", nome: "o subúrbio" }],
  },
  {
    parte: "casa.instrumentos",
    nome: "As suas notas de 04/11 (save, casa da D-Bee, rádio, mapa)",
    data: "2026-11-05",
    olhar: "O jogo volta pra onde você parou (a Kombi no mesmo lugar) e os links de teste agora usam um save separado: não mexem mais no seu. A casa da D-Bee só abre na casa dela; instrumento ganho na cidade espera você chegar lá. A D-Bee fica ao lado dos instrumentos. A rádio liga em qualquer lugar (nos túneis e salas tem um botão no canto). O minimapa e o mapa grande mostram os mesmos pontos, e no começo só o que já existe.",
    perguntas: [
      "Fechou e abriu o jogo: voltou no mesmo lugar?",
      "O minimapa ficou limpo no começo?",
      "A rádio tocou nos túneis?",
    ],
    mais: [{ parte: "bar", nome: "o minimapa no começo" }, { parte: "missao.tuneis.trincheiras", nome: "a rádio nas trincheiras" }],
  },
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
    olhar: "Metrô (modelado no Blender, 06/11: o trem do Núcleo abandonado, aço riscado, janelas com grade, pichação; por dentro, bancos de plástico, barras e alças, propagandas apagadas e uma luminária que pisca — o mesmo trem na linha 9 elevada e no vagão da história): a Kombi já foi jogada, tomam o jetpack e você foge pelo trem; no fim o violão fica lá e a guitarra aparece na loja. Violão: com o disco ou a rádio tocando, o botão do violão aparece. Grafite: nas trincheiras, chegue perto de uma parede com pontos e ligue os pontos para assinar.",
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
    data: "2026-11-06",
    tarefa: "T06",
    olhar: "Agora é o djembê modelado no Blender (madeira, couro e cordas azuis), com a pele que responde ao toque por cima. Dois tambores no tapete. Acompanhe as mãos dela: no centro sai o grave, na borda o tapa, e bater forte soa mais forte.",
    perguntas: [
      "O som serve até o seu sample chegar? Dá pra sentir centro e borda, fraco e forte?",
      "Gosta do djembê modelado no Blender? A borda do couro e as cordas ficaram boas com a pele por cima?",
      "Gosta da D-Bee sentada atrás do tambor e das mãos batendo?",
      "Tem atraso no iPhone?",
      "Quando puder, mande o seu sample (6 arquivos).",
    ],
  },
]

// (05/11) um nome curto pro dia, no título da seção da Mesa ("05/11 · madrugada").
// Opcional: o dia sem nome aqui aparece só com a data.
export const ROTULO_DIA: Record<string, string> = {
  "2026-11-05": "madrugada",
}

// um id estável pro cartão (o "✓ testei" guardado no aparelho usa ele;
// a mesma parte aparece em mais de um cartão, então entra a data e o nome)
export const idDo = (c: Cartao) => `${c.data}|${c.parte}|${c.nome}`

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
