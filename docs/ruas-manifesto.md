# Ruas-manifesto (05/11)

> "A narrativa vem colada com as músicas, de forma artística. [...] Uma crítica
> velada em animações e, mais que isso, em interações que traduzem a experiência
> da música e uma parte da psique do LU2CA." — bíblia §2

A cidade é um disco; cada rua é uma faixa do vol. 1, e a volta na rua dura a
faixa. A rua-manifesto é uma camada visual e interativa ao longo da pista, presa
no tempo da faixa. Não conta uma história passo a passo e não tem texto: você
sente enquanto a faixa toca.

Dois protótipos: **DopaminA** (o vício) e **Sabe Ontem?** (o tempo). As outras
7 ruas estão no registro, vazias, com a ideia de partida.

## Onde mora

| Arquivo | O que é |
|---|---|
| `app/linha/estrada/manifestos/registro.ts` | `MANIFESTOS`: uma entrada por `PistaId` (`{ id, ideia, Componente }`). Para uma rua nova, crie o componente e troque o `null` dela. |
| `manifestos/tipos.ts` | `PropsManifesto` (M, k, pista, ctx, carro) e `CtxManifesto` (o estado lido uma vez por quadro). |
| `manifestos/Manifestos.tsx` | O host: descobre a rua, monta e desmonta o manifesto dela e escreve o `ctx`. |
| `manifestos/comum.ts` | O tempo da faixa (`tempoDaFaixa`), as posições ao lado da rua e a névoa dos shaders. |
| `manifestos/ceu.ts` | `CEU_MANIFESTO` e `horaDoCeu`: a rua pode puxar o céu para a hora dela. |
| `manifestos/DopaminA.tsx`, `manifestos/SabeOntem.tsx` | Os dois protótipos. |

O que mudou fora da pasta (só `Corrida.tsx`, três toques):
- 1 import e 1 linha na `Cena`, ao lado da `RotaPista`:
  `<Seguro nome="manifestos"><Manifestos M jogo input carro /></Seguro>`
- No bloco "A HORA DO JOGO", `ceuNaHora` e `astros` agora recebem `horaDoCeu(horaRef.current)`.
  A hora do jogo (`horaRef`) continua andando normalmente; só o céu, a névoa e a
  luz do sol e da lua seguem a hora da rua. Fora de uma rua com manifesto,
  `k = 0` e a função devolve a hora do jogo sem mudar nada.

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

## Custo estimado

Medição local fica fora deste trabalho (regra: o dono testa na Mesa). A estimativa:

| | DopaminA | Sabe Ontem? |
|---|---|---|
| Desenhos (draw calls) | 1 (InstancedMesh) | 2 (relógios, fantasmas) |
| Instâncias | ~430 telas × 2 (o eco fica colapsado a 0 fora do excesso) ≈ 860 quads | ~48 quads + 14 Kombis de ~150 triângulos |
| Vértices | ~3,5 mil | ~0,2 mil + ~2 mil |
| Texturas | nenhuma (tudo no shader) | nenhuma |
| Luzes novas | nenhuma | nenhuma (usa a luz do céu que já existe) |
| CPU por quadro | ~10 uniforms | ~12 uniforms, 1 `ceuNaHora` (busca numa tabela) e, a cada ~3 s, 1 matriz + 1 número para a GPU |
| CPU na montagem | ~430 matrizes (uma vez) | ~48 matrizes (uma vez) |
| Interação | projeta ~430 pontos **só no toque** | nenhuma extra (lê o freio do ctx) |
| Fora da rua | **nada montado** | **nada montado** (o céu volta para a hora do jogo) |

O que pesa na GPU é o fragment shader das telas, porque são transparentes e se
sobrepõem quando a fome está alta. As telas ficam ao lado da rua e a névoa
apaga as de longe (a cor e a transparência somem com ela). Com `frustumCulled = false`
(uma caixa só para a rua inteira não ajudaria), os vértices fora da tela são
cortados pela GPU, que é barato com esses números.
Se pesar no celular, o primeiro ajuste é `DOPAMINA_CFG.niveis = 2` e `passo = 26`.

## As outras 7 ruas (vazias, com a ideia de partida)

Tiradas de nova-ordem.md e da bíblia. São propostas: o tema de cada rua é do dono.
- **Nectar:** a letra e as flores. Regar faz a rua florescer (tentativa e erro).
- **Copo Americano:** o copo que enche e esvazia na mesa do bar.
- **Ojalá:** amor de carnaval, fugaz como o vento.
- **Swav:** reflexos e salto de fé.
- **Sexta-Feira:** a balada. Multidão vazia, aceita e dança.
- **Rollercoaster:** a montanha-russa, os altos e baixos.
- **CHUVA:** a chuva que rega a cidade.

## O que ainda não foi visto

Nada foi rodado nem visto: só `tsc`. Pontos para olhar na Mesa:
- a altura e o lado das telas e dos relógios contra os prédios novos (o outro agente está partindo a cidade em quadras)
- se o toque nas telas briga com a direção por toque no celular
- se o fade do céu ao entrar e sair da rua de Sabe Ontem? fica suave
- o tamanho dos fantasmas contra a Kombi escaneada (o perfil é aproximado: 4,3 × 1,6 × 2 m)
