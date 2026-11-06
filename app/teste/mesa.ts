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
    parte: "elevador.subir",
    nome: "Os elevadores do túnel: as 3 torres dos salões sobem pras torres das pontas",
    data: "2026-11-06",
    tarefa: "elevadores",
    olhar: "Abre lá embaixo, no salão da TORRE 1, na frente do elevador (a missão dos túneis já feita). Aparece \"subir · torre 1 (Nectar, Sexta-Feira, Ojalá)\": toque, a cabine sobe rapidinho e você chega de patins na rotatória da torre da ponta da Nectar (de moto, se estava de moto). Lá em cima, na rotatória, \"descer · túneis (torre 1)\" leva de volta ao salão. A TORRE 2 (Rollercoaster, Swav, DopaminA) e a 3 (Copo Americano, CHUVA, Sabe Ontem?) fazem o mesmo. O mapinha dos túneis mostra o ícone do elevador em cada torre. Antes da missão dos túneis, o botão vem com cadeado: \"abre com a missão dos túneis\".",
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
    olhar: "Lá embaixo, no subúrbio, olhe o mapa: seis lugares novos (letreiro em neon, cada um com um detalhe: o arco do ginásio, o vinil gigante, as caixas de som, os quadros, os canteiros, a arara de roupa). Chegue perto de um: aparece \"entrar\"; a página abre por cima do jogo e, ao sair, você volta onde estava. O palco e a quadra também ganharam o \"entrar\". O trancado mostra o cadeado e o que libera.",
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
    nome: "Moto mais leve (e a cidade com menos gasto por quadro)",
    data: "2026-11-06",
    olhar: "A moto agora é desenhada em 7 pedaços em vez de ~25, e o parque, o campo de força e as flores pararam de criar lixo a cada quadro. O visual deve estar IGUAL: olhe o cromo do garfo e do escape, a viseira neon, as rodas girando; no parque, o carrinho e a câmera; a pé, encostar nos prédios.",
    perguntas: ["A moto está igual (brilho, cromo, viseira)?", "Sentiu o jogo mais liso no iPhone?"],
    mais: [{ parte: "livre", nome: "a cidade (parque, campo de força)" }],
  },
  {
    parte: "mundo.depois",
    nome: "O mundo depois do final: plantas nos prédios, cabines nas torres, o rio nos túneis",
    data: "2026-11-06",
    tarefa: "T29",
    olhar: "Abre com o final já feito, chegando na torre central. Sem tela explicando: os prédios altos têm plantas nas janelas e trepadeiras subindo, e em volta das torres as cabines sobem e descem (as claras sobem, as azuis descem). No outro link, desce pras trincheiras: os rios secos viraram rio, com a água correndo no leito (a rampa da descida continua seca). A porta \"o mundo depois\" não diz mais \"em breve\".",
    perguntas: ["As plantas e as cabines aparecem o bastante, ou quer mais (ou menos)?", "O rio no meio do leito está bom, ou deve ocupar o túnel todo?", "Cabines também nas pistas (bondinhos), ou só nas torres basta?"],
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
    olhar: "A fuga de quando te pegam já aconteceu. Nos túneis, vá até o SALÃO DO METRÔ (o trem branco parado): perto dele, \"entrar no trem\" abre a fuga de novo, sem mudar nada no save. Antes da fuga da história, o botão aparece com cadeado.",
    perguntas: ["A revanche no trem serve, ou o metrô deveria ser uma missão própria?"],
    mais: [{ parte: "metro", nome: "a fuga da história (quando te pegam)" }],
  },
  {
    parte: "instrumentos",
    nome: "Os 11 instrumentos ancestrais na casa da D-Bee",
    data: "2026-11-06",
    tarefa: "T49",
    olhar: "Abre na casa da D-Bee com todos os instrumentos ganhos, cada um no seu lugar no banco e nas prateleiras: toque em cada um (tocar de novo muda a nota). A música do jogo para enquanto você toca e volta no \"pronto\". No outro link, só alguns ganhos: os outros ficam apagados com cadeado e, tocando, a D-Bee diz de que missão vêm. Fechar uma missão agora mostra no notch \"+ o udu · na casa da D-Bee\".",
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
    mais: [{ parte: "bar", nome: "o bar do prólogo" }],
  },
  {
    parte: "livre",
    nome: "Revisão 3: as zonas valem na carreira, D-Bee fala, final sem tranco",
    data: "2026-11-05",
    olhar: "As regras de veículo por zona e os rachas agora valem também na carreira (antes só no jogo livre): no deserto só Kombi/moto, no subúrbio a pé/patins/moto. A D-Bee passou a sugerir coisas na carreira também. O vídeo da despedida (quando entrar) cala a música do jogo. Depois do final fica uma Kombi só, no quintal. Na corrida de rua o GPS aponta pro próximo portão.",
    perguntas: [
      "Missão do bar/quadra/túneis indo de Kombi: desceu na borda do subúrbio direitinho?",
      "Os rachas aparecendo na carreira atrapalham as missões?",
    ],
  },
  {
    parte: "final",
    nome: "O final do jogo (as ações, sem os vídeos ainda)",
    data: "2026-11-05",
    olhar: "Com as 10 missões feitas, o final começa na casa da D-Bee: a câmera roda a casa (o sinal); os nove aparecem um por um, cada um sob o monumento da sua faixa; os nove feixes acendem juntos e a chuva toma a cidade; a despedida do Criador é o espaço do vídeo (falas em RASCUNHO); e a Kombi fica no quintal da D-Bee com as plantas voltando no deserto. Os nove são cápsulas coloridas até chegarem os modelos.",
    perguntas: [
      "A ordem e o ritmo dos momentos estão certos?",
      "O que a despedida do Criador diz? (as 2 falas são rascunho)",
      "Que música toca em cada momento do final?",
    ],
    mais: [{ parte: "final.nove", nome: "os nove" }, { parte: "final.chuva", nome: "a chuva" }, { parte: "final.quintal", nome: "o quintal" }],
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
    olhar: "Perto do bar tem um arco neon CORRIDA. De moto ou de patins, chegue perto e toque em \"correr\": 2 voltas de ~1,6 km pelas ruas das ruínas, 11 portões de luz, 3 rivais (de moto: Trovão, Vespa e Lama). A rádio não para. O melhor tempo fica guardado; a primeira vitória dá +40 neon$. O ponto aparece no mapa depois que você chega no subúrbio.",
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
