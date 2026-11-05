# Os túneis (as trincheiras)

Os túneis ficam embaixo do subúrbio. A Kombi para na boca, do lado de fora. Lá
embaixo se anda a pé, de patins, de skate, de BMX e, mais pra frente, de moto.

O código mora em `app/linha/trincheiras/`. O traçado está em `mapa.ts`, os
desenhos em `geo.ts` e a corrida em `corrida.ts` e `fisica.ts`.

## Tamanho (antes e depois, 05/11)

| | antes | agora |
|---|---|---|
| traçado | 3 rios em triângulo | 5 rios em pentágono, mais a galeria do atalho e a rampa da descida |
| túnel inteiro | ~1,8 km | ~5,7 km |
| volta da corrida | ~1,8 km, 3 portões | ~4,1 km, 5 portões |
| chão (leito) | 16 m | 26 m |
| de parede a parede | 27 m | 40 m |
| altura do vidro | 11 m | 22 m nos rios, de 26 a 42 m nos salões |
| salões | 3 praças de 36 m | 6 salões: 3 torres (46 a 48 m), o metrô (100 m), o grafite (88 m) e a descida (36 m) |

## O mapa

O norte fica em cima (z negativo). Cada salão é um círculo. Os números entre
parênteses são o raio do salão em metros.

```
                                   [PORTA ↑ SUBÚRBIO]
                                    (A DESCIDA, 36)
                                    /
                    RAMPA DA DESCIDA (300 m, beco sem saída)
                                  /
              (TORRE 1 · TÚNEIS, 48)  ◄── LARGADA / CHEGADA
               /                \
       RIO SECO E                RIO SECO A
         (844 m)                   (785 m)
          /                            \
  (TORRE 3, 46)                    (SALÃO DO METRÔ, 100)
        |                         /   trem da linha 9 na
        |      GALERIA DO ATALHO /    plataforma
   RIO SECO D    (1.233 m)      /          |
     (855 m)        ___________/       RIO SECO B
        |          /                     (815 m)
        |         /                          |
  (SALÃO DO GRAFITE, 88) ── RIO SECO C ── (TORRE 2, 46)
    muros das trincheiras     (841 m)
```

### Coordenadas (metros, centro do pentágono = 0,0)

| salão | x | z | raio | teto |
|---|---|---|---|---|
| TORRE 1 · TÚNEIS | 0 | -640 | 48 | 32 |
| SALÃO DO METRÔ | 609 | -198 | 100 | 42 |
| TORRE 2 | 376 | 518 | 46 | 30 |
| SALÃO DO GRAFITE | -376 | 518 | 88 | 38 |
| TORRE 3 | -609 | -198 | 46 | 30 |
| A DESCIDA | 272 | -767 | 36 | 26 |

## Onde fica cada coisa

- **A porta de entrada:** fica no fundo da DESCIDA, de pé no pé da parede, com
  o neon rosa e a placa "↑ SUBÚRBIO". Ao descer, o passeio começa ali, virado
  pra rampa. Perto da porta, o painel lembra que a Kombi espera lá fora. A
  subida continua sendo o botão "↑ subir pro subúrbio".
- **As torres (os elevadores):** ficam na TORRE 1, na 2 e na 3, no fundo de
  cada salão, do lado de fora do pentágono. Cada uma tem a porta, o nome e o
  "SUBIR · RUA". As torres ainda não sobem.
- **O metrô:** o SALÃO DO METRÔ tem a linha 9 parada na plataforma, com 3
  vagões (62 m), a faixa amarela e a placa "METRÔ · LINHA 9". O trem fica
  encostado no fundo do salão, longe das bocas dos rios, e é obstáculo. A fuga
  do metrô continua sendo a cena dela (`disco/MetroFuga.tsx`).
- **As trincheiras e o grafite:** o SALÃO DO GRAFITE tem a parede inteira
  coberta de grafites, em duas fileiras, e 3 muros baixos no fundo (as
  trincheiras), com grafite dos dois lados. Os rios também têm grafite na
  parede, de 90 em 90 m, alternando os lados. Qualquer um deles serve pro
  gesto de assinar (`disco/Grafite.tsx`, com raio de 14 m).
- **A corrida:** larga e chega na TORRE 1 e corre no sentido horário: rio A,
  metrô, rio B, TORRE 2, rio C, grafite, rio D, TORRE 3, rio E e de volta à
  TORRE 1. Tem um portão no meio de cada rio (5 portões). A galeria do atalho
  não vale, porque os portões contam em ordem. A moto continua com 2 voltas.
- **As bifurcações:** o SALÃO DO METRÔ e o SALÃO DO GRAFITE têm 3 saídas
  cada, ligadas pela galeria do atalho. A TORRE 1 tem 3 saídas: o rio A, o rio
  E e a rampa da descida.

## Desempenho

- **Pedaços:** cada rio é cortado em trechos de ~200 m (29 trechos), e cada
  salão é um pedaço (6). Cada pedaço tem até 6 desenhos: o concreto, o neon, os
  grafites e placas, as raízes, o vidro e a poeira. Os materiais são os mesmos
  pra todos os pedaços.
- **Só o que está perto:** só desenha o pedaço que está a menos de 360 m da
  câmera. A névoa fecha em 340 m, então o resto não aparece de todo jeito.
- **Sem luz de ponto:** as lâmpadas e o neon são cores fixas.
- **Colisão:** procura só nos trechos em volta do jogador. Se ele estiver longe
  de todos (o que não acontece jogando), procura em todos.

## Regras do traçado

- **Rio longe de rio:** dois rios nunca chegam a menos de 80 m um do outro
  (parede a parede são 40 m). A curva mais fechada tem 63 m de raio, e a parede
  de dentro nunca dobra sobre si.
- **Bocas separadas:** em cada salão, as bocas dos rios ficam afastadas o
  bastante pra não se cruzarem.
- **Mexer no tamanho:** pra mudar o tamanho, use `LEITO`, `CURVA`, `TETO` e
  `R_MAPA` em `mapa.ts`. Os salões estão em `SALOES_BASE` e os rios em
  `AVENIDAS_BASE`.
