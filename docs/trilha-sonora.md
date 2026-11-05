# A trilha sonora não para (05/11)

Fonte: a bíblia, seção 9. O dono: "Quero a música e o jogo coesos, um é o guia do outro."

## Onde a rádio liga

- **Primeira chegada do deserto no subúrbio Xenom:** a rádio liga sozinha, na frequência salva (`save.freq`). Isso acontece uma vez só e fica gravado no save (`historia.radioXenom`). Depois, se ele desligar, ela fica desligada.
- **Rádio antiga no subúrbio e nos túneis:** passa-banda de ~300 a 3400 Hz, uma saturação leve e um chiado bem baixinho (que só toca com a rádio no ar).
- **Rádio limpa na cidade e no deserto.**
- A troca é um fade curto, sem estalo. Tudo roda no grafo do Web Audio: um filtro, um waveshaper e dois ganhos. Nada é processado por quadro em JS. Fora do subúrbio, o caminho do filtro sai do grafo.
- Onde mexer:
  - `app/linha/disco/radioAntiga.ts`: a zona do som e a primeira chegada;
  - `app/linha/som.ts`, `RADIO_ANTIGA`: os números do filtro;
  - `page.tsx`, `aoChegarNoSuburbio`: liga a rádio.

## O que NÃO para (a trilha segue e faz parte do cenário)

- **Missões, peças, salas, casas e cenas:** a música que está tocando segue, seja a rádio, a faixa da rua ou o disco da Kombi. Ela só abaixa um pouco (`abaixarUmPouco`, 70%) enquanto a cena ou o balão de introdução estão na tela.
- **Na cidade continua a regra da faixa da rua:** a completa toca uma vez inteira, e a missão passa pro instrumental no mesmo ponto. Agora isso vale também nas peças, na letra e no basquete.
- **O som próprio de cada missão (T40) não entra mais:** `TRILHA_PROPRIA_DAS_MISSOES = false` em `disco/sons.ts`. Com `true`, a regra antiga volta.
- **Fliperama (as máquinas do Notti e o fliperama):** com a música do jogo tocando, a máquina não toca o laço 8 bits por cima e não corta nada. Sem música nenhuma (ou no `/fliperama` solto), o laço toca como antes.
- **Peças de ritmo (a dança do Drew e o clipe da Nizzy):** se a faixa da rua é a da peça, a peça segue o relógio dela, sem cortar. Fora da pista dela, a peça ainda toca a própria faixa, porque o ritmo depende da música certa (ver "Ficou em aberto").
- **O violão:** toca junto, no tom da faixa que está tocando. Por isso a música não para.
- Sem mudança (não são mini-jogos):
  - a prévia de 25 s na loja de discos;
  - o visualizador de links (YouTube etc.);
  - os apps do holo, que têm som próprio.

  Esses continuam calando a música enquanto estão abertos.

## O que PARA (é hora de fazer música)

A música do jogo some em fade (~1 s) e pausa de verdade. Ao sair, volta do mesmo ponto: a rádio retoma, o disco retoma e a faixa da rua continua de onde estava. Quem faz isso é `fazerMusica(true/false)` em `som.ts`.

- a batida (o BATIDA da missão, `BatidaMissao.tsx`);
- o Guitar Driver (`Show.tsx`, `ShowCorda.tsx`, `ShowAfinador.tsx`);
- o tambor com a D-Bee (`Tambor.tsx`);
- os instrumentos na casa da D-Bee (a cena `dbee-instrumentos`, na `page.tsx`);
- a trilha 8 bits do Notti (`pecas/Trilha8.tsx`), porque compor é fazer música.

## A introdução das missões

Antes de cada peça abrir, quem pede a missão fala uma ou duas frases num balão por cima do mundo: o porquê, ligado ao que a faixa traz. Não tem cutscene nem tela preta. A música segue um pouco mais baixa.

- **"bora ▸"** (ou tocar no balão) começa a peça.
- **"depois"** fecha o balão. A introdução volta na próxima chegada.
- **Primeira peça da missão:** aparece o `texto`.
- **Segunda peça:** aparece o `segue`. Se a missão não tiver `segue`, a peça abre direto.
- Os textos ficam todos em `app/linha/disco/introMissoes.ts`. São **rascunho**, pro dono reescrever.

| missão | quem | faixa · o que traz | texto (1ª peça) | segue (2ª peça) |
|---|---|---|---|---|
| quadra | Alohan | Sabe Ontem? · o tempo que passou | essa quadra lotava. ontem, sabe? a gente achava que ia durar pra sempre. hoje só sobrou o eco. bora fazer um som pra galera voltar | a galera voltou. agora mostra que ainda tem jogo aqui |
| túneis | D-Bee | (sem faixa) · as escolhas | embaixo das raízes ninguém te empurra e ninguém te segura. cada um escolhe o caminho. deixa o seu nome na parede | agora corre. o caminho que você escolheu é só seu |
| drew | Drew | Sexta-Feira · o público, o espelho | sexta e eu em casa de novo, me arrumando pro espelho. ele sempre gosta. me ajuda a montar um look que dê vontade de sair | — |
| mubarak | Mubarak | Copo Americano · o vício, o loop | aqui o copo nunca fica vazio, repara. é o loop. senta. hoje quem escolhe o som é você: um disco antigo, de quando a gente ouvia de verdade | uma partida. só uma. a gente sabe parar, né? |
| xeriff | Xeriff | (sem faixa) · a confiança | na plataforma ninguém confia em ninguém. nem em mim. bate uma bola comigo que eu vejo se dá pra confiar em você | agora pega a frequência deles. quem escuta tudo, sabe tudo |
| lu2ca | LU2CA | Nectar · o que faz florir | esse palco tá vazio faz tempo. a Nectar é sobre o que te faz florir de novo. antes de subir, escreve o seu | sobe. a cidade tá ouvindo |
| ella | Ella | CHUVA · a coragem de mostrar | eu pinto, mas ninguém vê. a CHUVA é sobre ter coragem de mostrar. entra. só não repara na bagunça | — |
| notti | Notti | DopaminA · o vício na tela | o fliperama apagou e ninguém percebeu: tá todo mundo preso na tela de casa. dopamina de bolso. me ajuda a acordar essas máquinas | agora joga. uma ficha só. (ninguém joga uma só) |
| nizzy | Nizzy | Rollercoaster · os altos e baixos | a montanha-russa parou bem no meio. a vida também para, às vezes. o sobe e desce é a Rollercoaster. filma comigo? | — |
| tony | Tony Gordo | Swav · o tempo das coisas | aqui em cima tudo tem gosto de nada. a Swav é sobre o tempo das coisas: plantar, esperar, provar. rega comigo? | nasceu. agora cozinha devagar. sem pressa é que fica bom |

A D-Bee e a oficina não têm balão: a própria história (casa, dunas, oficina) é a introdução delas. A final ainda não tem peça.

## Ficou em aberto (decisão do dono)

- **O disco antigo do Mubarak:** escolher e ouvir um vinil é a própria peça, então ele ainda troca a música enquanto o vinil toca.
- **A dança e o clipe fora da pista deles:** ainda tocam a própria faixa. Outra opção é marcar a batida com um metrônomo por cima da rádio.
- **O violão:** hoje toca junto com a música. Se for pra parar quando ele toca, basta chamar `fazerMusica` no painel do violão.
- **Os apps do holo (B4TIDA, Guitar Driver, //LOOP…):** continuam calando a música, como antes.
