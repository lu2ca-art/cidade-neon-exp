# A TV do holo (05/11)

O dono: "uma TVzinha no holo, que permite a pessoa continuar jogando e a música
reproduzindo no YouTube." Bíblia §7: "Nunca farmar play. A TV no holo, com o
YouTube, só com player visível e play dado pela pessoa."

## Como funciona

- No notch (N3XO), ao lado do ♥ salvar, tem o botão **📺 TV**.
- Toque nele: abre uma TV num canto da tela, com o vídeo da faixa que está
  tocando (a da rádio, se ela está no ar com uma faixa do vol. 1; senão a da rua).
  Sem faixa tocando, a TV começa pela primeira faixa que tem vídeo.
- Faixa sem vídeo: o notch avisa "essa faixa ainda não tem vídeo" e a TV não abre.
- A TV abre parada. **O play é da pessoa**, no próprio player do YouTube.
- O jogo continua rodando atrás. A TV começa embaixo à esquerda (onde ficam as
  propagandas do holo, nada essencial). Arrasta pelo topo e solta: ela vai pro
  canto mais perto (e lembra o canto). × (ou Esc) fecha. Tocar no 📺 de novo também fecha.
- Enquanto o vídeo toca, a música do jogo (pista, rádio, disco) vai a zero em
  fade e **segue andando por baixo** (a música contínua não perde o ponto). Pausou,
  acabou ou fechou: a música do jogo volta.
- Acabou o vídeo: a TV passa sozinha pra próxima faixa que tem vídeo, como
  rádio, sempre visível. Quando dá a volta inteira (chega de novo na faixa em que
  abriu), ela deixa o vídeo pronto e espera o play da pessoa. Fechou, parou.
- Abrir o vid.stream (o outro player do YouTube no holo) fecha a TV: um player só.

## As regras do YouTube (não se quebram)

- Player visível, com no mínimo 200×200 px (no celular 240×200, no computador 384×216).
- Nada por cima do vídeo: o título e o × ficam numa faixa acima dele.
- Sem autoplay escondido, sem mudo, sem player escondido ou minúsculo, sem laço
  automático sem fim. O primeiro play é sempre um toque da pessoa.

## Desempenho

Nada do YouTube carrega até a pessoa tocar no 📺. Só nessa hora entra o script da
IFrame Player API (uma vez por página). Fechou, o player é destruído. Fechada, a
TV não existe na página (só um botão no notch).

## Pro dono: colar o vídeo de cada faixa

Tudo mora em `app/linha/disco/videosFaixas.ts` (as instruções estão no topo dele).
Pra cada faixa, cole o `videoId` (o pedaço depois de `v=` no link do vídeo) ou o
`playlistId` (o pedaço depois de `list=`). Hoje: Sabe Ontem? (vídeo), Copo
Americano e CHUVA (as playlists do YouTube Music). As outras ainda não têm.

## Analytics

Abrir a TV conta no evento que já existe, `external_link_click`, com
`destination: "youtube"`, `place_id: "tv-holo"`, `track_id` = a faixa,
`utm_campaign: "tv_holo"`.

## Arquivos

- `app/linha/disco/TvHolo.tsx`: o botão, a TV e o player (o script do YouTube só ao abrir)
- `app/linha/disco/tvHolo.css`: o visual (o mínimo de 200×200 mora aqui)
- `app/linha/disco/videosFaixas.ts`: os vídeos
- `app/linha/som.ts`: `calarPraTv` (o fade da música do jogo, no abafo)
- `app/linha/estrada/Holo.tsx`: o botão no notch e a explicação do "?"
- `app/linha/page.tsx`: monta a TV (uma linha)
- `app/linha/disco/Visor.tsx`: o vid.stream fecha a TV
