# Ruas-manifesto (05/11)

> "A narrativa vem colada com as músicas, de forma artística. [...] Uma crítica
> velada em animações e, mais que isso, em interações que traduzem a experiência
> da música e uma parte da psique do LU2CA." — bíblia §2

A cidade é um disco; cada rua é uma faixa do vol. 1, e a volta na rua dura a
faixa. A rua-manifesto é uma camada visual e interativa ao longo da pista, presa
no tempo da faixa. Não conta uma história passo a passo e não tem texto: você
sente enquanto a faixa toca.

Cinco prontas: **DopaminA** (o vício), **Sabe Ontem?** (o tempo), **CHUVA** (a
chuva que rega), **Copo Americano** (o que enche e esvazia) e **Nectar** (a letra
e as flores). As outras 4 ruas estão no registro, vazias, com a ideia de partida.

## Onde mora

| Arquivo | O que é |
|---|---|
| `app/linha/estrada/manifestos/registro.ts` | `MANIFESTOS`: uma entrada por `PistaId` (`{ id, ideia, Componente }`). Para uma rua nova, crie o componente e troque o `null` dela. |
| `manifestos/tipos.ts` | `PropsManifesto` (M, k, pista, ctx, carro) e `CtxManifesto` (o estado lido uma vez por quadro). |
| `manifestos/Manifestos.tsx` | O host: descobre a rua, monta e desmonta o manifesto dela e escreve o `ctx`. |
| `manifestos/comum.ts` | O tempo da faixa (`tempoDaFaixa`), as posições ao lado da rua e a névoa dos shaders. |
| `manifestos/ceu.ts` | `CEU_MANIFESTO` e `horaDoCeu`: a rua pode puxar o céu para a hora dela. |
| `manifestos/DopaminA.tsx`, `SabeOntem.tsx`, `Chuva.tsx`, `CopoAmericano.tsx`, `Nectar.tsx` | As cinco ruas. |

O que mudou fora da pasta (só `Corrida.tsx`):
- 1 import e 1 linha na `Cena`, ao lado da `RotaPista`:
  `<Seguro nome="manifestos"><Manifestos M jogo input carro /></Seguro>`
- No bloco "A HORA DO JOGO", `ceuNaHora` e `astros` agora recebem `horaDoCeu(horaRef.current)`.
  A hora do jogo (`horaRef`) continua andando normalmente; só o céu, a névoa e a
  luz do sol e da lua seguem a hora da rua. Fora de uma rua com manifesto,
  `k = 0` e a função devolve a hora do jogo sem mudar nada.
- (CHUVA) No bloco da chuva, a visibilidade e a opacidade das linhas usam
  `Math.max(clima.k, CHUVA_MANIFESTO.k)` (2 linhas + o import). Fora da rua, `k = 0`.

Nenhum arquivo de poste, asfalto, pilar, prédio ou quadra (`mundoDisco`, `Postes` etc.) foi tocado.

## Como sincroniza com a faixa

- **O tempo:** `tempoDaFaixa(id)` lê `pistaSom.el.currentTime` e a duração do
  `<audio>` que soa (a completa ou o instrumental, `som.ts PistaSom`), mas só
  quando a faixa do toca-discos é a da rua. Se ainda não é (no primeiro meio
  segundo, ou com a rádio por cima), o host usa um relógio próprio que começa
  quando você entra.
- **O ctx (uma vez por quadro, no host):** `t`, `dur`, `prog = t/dur`,
  `batida = t × BPM / 60` (a parte inteira conta as batidas; `fract` é a fase
  usada para pulsar na batida), `dentro` (fade 0–1), velocidade, `mult` (a razão
  pela velocidade da pista), aceleração suavizada, gás, freio e turbo.
- **Montar e desmontar:** o manifesto monta quando a Kombi entra numa via da
  pista (`M.info[via].pista`, com saída, ida, balão, volta e entrada). Entra em
  fade de 1,2 s. Voar, passar pela torre da ponta ou sair por um instante dá
  6 s de carência; depois disso some em 1,6 s e **desmonta** (a geometria e o
  material são liberados). Ao trocar para outra rua com manifesto, a troca é
  imediata.

## DopaminA: o vício (a rua que pede mais um)

- **O que se vê:** telas ao longo da rua, dos dois lados e fora da parede.
  Umas têm o formato de celular em pé e outras de outdoor, em até 3 andares
  empilhados. Cada tela mostra uma de três coisas:
  - notificações subindo: pílulas com uma bolinha e uma barra que não se lê, e o badge vermelho batendo
  - um coração que bate na batida da faixa (125 BPM), com corações pequenos subindo
  - um número de 7 segmentos que só sobe, mais rápido quanto mais fome
- **A fome (0–1)** cresce só de estar na rua (~80 s até o excesso). Cresce mais
  rápido com o turbo e acima do ritmo da pista. Cada tela tem um limiar: quanto
  mais fome, mais telas acendem (pipocam: passam do tamanho e voltam),
  empilham, saturam (do cinza para a cor) e brilham.
- **O excesso (fome > 85%):** a imagem estoura. As telas tremem fino (o
  zumbido) e um eco maior e translúcido aparece atrás de cada uma. O branco
  queima na batida e o vermelho e o azul se separam.
- **Soltou, freou ou desacelerou** (freio, aceleração < −2,5 m/s² ou abaixo de
  72% do ritmo): tudo esvazia em ~1,5 s e volta o silêncio visual, com nenhuma tela acesa.
- **O toque (o like):** tocar numa tela acesa dá um pico curto de brilho nela
  (e um pouco na rua toda). Logo depois vem o vazio: ela e a rua ficam mais
  apagadas que antes por uns 3 a 6 s. O like também alimenta a fome (+6%).
  O toque projeta as telas acesas só no momento do toque e pega a mais perto do
  dedo (raio de 72 px). O mesmo toque segue valendo para a direção, como antes.
- **Ajustes:** `DOPAMINA_CFG` (passo, níveis, ritmos da fome, esvaziar, like, raio do toque).

## Sabe Ontem?: o tempo (a rua do tempo que não volta)

- **Um dia inteiro na volta:** o céu vai das 5 h (amanhecer) no começo da
  faixa às 22 h (noite) no fim, só nessa rua. Ele usa as mesmas cores, o mesmo
  sol, a mesma lua e a mesma luz do céu do jogo (`ceu.ts`, `ceuNaHora`).
  Entrando e saindo, o céu passa em fade entre a hora da rua e a do jogo.
  Quando a faixa recomeça (o instrumental em loop), a hora segue o caminho
  curto do relógio: vira uma madrugada rápida até o amanhecer.
- **Relógios:** cerca de 45 mostradores nos prédios ao longo da rua, de 2,5 a
  8 m, entre 6 e 36 m de altura. Uns marcam a hora da rua, uns estão adiantados
  ou atrasados, e uns 18% andam para trás. No céu ficam 3 relógios enormes
  (55–75 m, sempre de frente para a câmera) com a hora da rua. De dia o vidro
  fica apagado; de noite o âmbar acende.
- **Os ontens:** a cada 3,2 s (andando) um fantasma da Kombi fica parado no ar
  onde ela estava. É uma Kombi de poucos polígonos, aditiva, só com a borda
  acesa e uma linha de fita velha subindo. Ele desbota em ~16 s. São no máximo
  14: o mais velho dá lugar ao novo.
- **Frear forte segura o tempo** (freio a mais de 4 m/s): os ponteiros e o
  céu param, os fantasmas param de desbotar e ficam um pouco mais acesos, e
  nenhum ontem novo nasce. É só por um instante: depois de ~4 s segurando, o
  tempo escapa. Quando você solta, o tempo cobra: o céu e os ponteiros correm
  (60% do atraso por segundo) até alcançar a faixa.
- **Ajustes:** `ONTEM_CFG` (horas, passo, relógios no céu, fantasmas, ritmos).

## CHUVA: a chuva que rega a cidade

- **A chuva fina que engrossa:** a rua não desenha gota nova. Ela puxa a chuva
  que o jogo já desenha (as 700 linhas que seguem a câmera, `Corrida.tsx`) por
  `CHUVA_MANIFESTO.k` (`ceu.ts`): o jogo usa o maior entre o clima e a rua. Fina
  no começo da faixa (0,3 da pancada do clima) e grossa no fim (1,8).
- **Os anéis na pista:** onde as gotas caem nascem anéis de luz no asfalto, cada
  um no seu ritmo (meia, uma ou duas batidas). Quanto mais grossa a chuva, mais anéis.
- **As flores de luz:** na beira da pista, nos canteiros e nos prédios (de 3 a
  29 m de altura). Antes de cada flor nascer, uma gota desce até o broto nas 2
  batidas antes. Depois ela cresce um degrau a cada batida (6 batidas até
  inteira) e respira no compasso. As do começo da rua nascem antes, mas com
  sorteio: ao longo de 92% da faixa a rua inteira floresce. Quando a faixa
  recomeça (o instrumental em loop), o que choveu fica.
- **O guarda-chuva (segurar o propulsor ou o freio):** abre uma cúpula de luz
  sobre a Kombi, com varetas e as gotas respingando nela. O trecho que ela cobre
  (24 m em volta) floresce mais: as flores ficam maiores, mais abertas e mais
  acesas, e continuam assim depois de fechar (até 8 trechos; o mais velho dá lugar).
- **Ajustes:** `CHUVA_CFG` (passos, força fina e grossa, degraus, raio do guarda-chuva e da rega).

## Copo Americano: o que enche e esvazia

- **Os copos:** o copo americano do bar, facetado embaixo (16 faces, com a
  aresta de cada uma acesa) e liso na boca, com a faixa que separa as duas
  partes. Ficam nos canteiros (de 1,3 a 2,6 m) e nos prédios (de 5 a 12 m,
  entre 6 e 32 m de altura), um a cada ~15 m.
- **Enchem no ritmo:** o líquido luminoso (âmbar, às vezes rosa ou ciano, com
  bolhas subindo) sobe ao longo da faixa (de 30% a 75%) e respira no compasso.
  Cada copo tem a sua sede, então uns enchem mais que outros.
- **Acelerar muito enche além da conta** (turbo, 20% acima do ritmo da pista
  ou pé no fundo): os copos transbordam e o líquido escorre em fios pelo vidro
  por fora. Transbordando, a rua fica **embriagada**: o horizonte balança bem de
  leve (até 0,8° de inclinação e um pouco de guinada, no tempo da batida).
  Sóbria de novo devagar (~10 s). Com "reduzir movimento" no aparelho, a câmera não balança.
- **Desacelerar ou frear esvazia** (até quase o fundo).
- **O brinde (tocar num copo):** os copos a até 48 m dele se inclinam na direção
  do tocado, tilintam (tremem fino) e brilham juntos, numa onda que sai do copo tocado.
- **A câmera:** o jogo põe a câmera no lugar todo quadro (`lookAt`). A rua só
  gira um pouco depois disso. Se no quadro seguinte ninguém mexeu nela, a rua
  desfaz o próprio giro antes de girar de novo, e devolve tudo ao sair. Nada fora da pasta foi tocado.
- **Ajustes:** `COPO_CFG` (passo, proporção, ritmos de encher e esvaziar, o porre, o raio do brinde).

## Nectar: a letra e as flores (tentativa e erro)

- **As palavras-pétala:** as palavras vêm da letra da Nectar que já está no
  código (`disco/letras.ts`, a estrofe da missão de escrever a letra, que ainda
  é rascunho). Se o dono reescrever lá, a rua acompanha. Se faltar, entram
  palavras curtas neutras (flor, chuva, raiz, gota, verso...). Ficam em grupos
  de 4 a 6, um grupo a cada ~30 m, ao lado da rua (de 4 a 13 m de altura). Elas
  flutuam, giram e viram como pétalas, sempre de frente para a câmera.
- **Os versos (tentativa e erro):** a cada 4 compassos (16 batidas), cada grupo
  no seu tempo, as palavras se juntam num verso. Em ~45% das vezes ele dá certo:
  fica reto e acende cor de mel na batida. Nas outras, sai torto, treme e
  apaga, e se desfaz mais cedo. Dando certo ou não, ele se desfaz e as palavras
  voltam a ser pétalas. As palavras do verso são sorteadas da letra, então ele
  não forma uma frase pronta.
- **As flores:** nos canteiros e nas fachadas, um a cada ~7 m. Abrem e murcham
  no compasso, numa onda que corre a rua. Murchando, as pétalas caem para
  baixo, perdem a cor e uma pétala se solta. Perto de um verso que deu certo,
  elas abrem inteiras e não murcham.
- **Tocar numa palavra a prende no céu:** ela sobe num arco e vira parte de um
  verso lá em cima, à frente e acima da câmera (a ~120 m, 42 m acima), com as
  palavras na ordem em que você tocou, em linhas centradas. São até 12; depois,
  a mais velha volta a ser pétala. O verso fica até o fim da volta: quando a
  faixa recomeça, ele se apaga em 2 s e as palavras voltam para a rua.
- **Ajustes:** `NECTAR_CFG` (passos, ciclo do verso, chance de erro, tamanho e largura no céu, raio do toque).

## Custo estimado

Medição local fica fora deste trabalho (regra: o dono testa na Mesa). A estimativa:

| | DopaminA | Sabe Ontem? | CHUVA | Copo Americano | Nectar |
|---|---|---|---|---|---|
| Desenhos (draw calls) | 1 (InstancedMesh) | 2 (relógios, fantasmas) | 3 (flores, anéis, guarda-chuva; este só aberto) | 1 (InstancedMesh) | 2 (palavras, flores) |
| Instâncias | ~430 telas × 2 (o eco fica colapsado a 0 fora do excesso) ≈ 860 quads | ~48 quads + 14 Kombis de ~150 triângulos | ~600 flores (2 quads cruzados) + ~450 anéis | ~180 copos (cilindro de 16 lados com tampas) | ~150 palavras + ~300 flores (1 quad cada) |
| Vértices | ~3,5 mil | ~0,2 mil + ~2 mil | ~4,8 mil + ~1,8 mil + ~150 | ~12 mil | ~1,8 mil |
| Texturas | nenhuma (tudo no shader) | nenhuma | nenhuma | nenhuma | 1 canvas de 1024 × ≤ 1024 px (as palavras, escritas uma vez) |
| Luzes novas | nenhuma | nenhuma (usa a luz do céu que já existe) | nenhuma | nenhuma | nenhuma |
| CPU por quadro | ~10 uniforms | ~12 uniforms, 1 `ceuNaHora` (busca numa tabela) e, a cada ~3 s, 1 matriz + 1 número para a GPU | ~10 uniforms + a posição do guarda-chuva (aberto) | ~6 uniforms + 2 rotações na câmera (no porre) | ~6 uniforms + o ponto do céu (2 vetores) |
| CPU na montagem | ~430 matrizes (uma vez) | ~48 matrizes (uma vez) | ~1050 matrizes (uma vez) | ~180 matrizes (uma vez) | o canvas das palavras e ~450 posições (uma vez) |
| Interação | projeta ~430 pontos **só no toque** | nenhuma extra (lê o freio do ctx) | nenhuma extra (lê o propulsor e o freio) | projeta ~180 pontos **só no toque** | projeta ~150 pontos **só no toque** |
| Fora da rua | **nada montado** | **nada montado** (o céu volta para a hora do jogo) | **nada montado** (a chuva volta para o clima) | **nada montado** (a câmera é devolvida) | **nada montado** |

A chuva da CHUVA não custa nada novo: as 700 linhas da chuva do jogo já são
calculadas todo quadro (mesmo quando invisíveis). A rua só as deixa visíveis e
mais opacas.

O que pesa na GPU é o fragment shader das telas, porque são transparentes e se
sobrepõem quando a fome está alta. As telas ficam ao lado da rua e a névoa
apaga as de longe (a cor e a transparência somem com ela). Com `frustumCulled = false`
(uma caixa só para a rua inteira não ajudaria), os vértices fora da tela são
cortados pela GPU, que é barato com esses números.
Se pesar no celular, o primeiro ajuste é `DOPAMINA_CFG.niveis = 2` e `passo = 26`.

## As outras 4 ruas (vazias, com a ideia de partida)

Tiradas de nova-ordem.md e da bíblia. São propostas: o tema de cada rua é do dono.
- **Ojalá:** amor de carnaval, fugaz como o vento.
- **Swav:** reflexos e salto de fé.
- **Sexta-Feira:** a balada. Multidão vazia, aceita e dança.
- **Rollercoaster:** a montanha-russa, os altos e baixos.

## O que ainda não foi visto

Nada foi rodado nem visto: só `tsc`. Pontos para olhar na Mesa:
- a altura e o lado das telas e dos relógios contra os prédios novos (o outro agente está partindo a cidade em quadras)
- se o toque nas telas briga com a direção por toque no celular
- se o fade do céu ao entrar e sair da rua de Sabe Ontem? fica suave
- o tamanho dos fantasmas contra a Kombi escaneada (o perfil é aproximado: 4,3 × 1,6 × 2 m)
- CHUVA: se o guarda-chuva no propulsor briga com o vento do turbo; se a chuva grossa (1,8) não fica pesada demais; se as flores da beira da pista atrapalham a leitura da pista
- Copo Americano: se o balanço do porre (0,8°) é sutil o bastante ou pouco demais; se o copo facetado lê como copo americano de longe; se o toque no copo briga com a direção por toque
- Nectar: se as palavras são legíveis em movimento; o lugar do verso no céu (120 m à frente, 42 m acima); se o toque numa palavra briga com a direção por toque
