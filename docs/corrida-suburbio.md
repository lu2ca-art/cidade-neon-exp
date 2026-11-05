# A corrida de rua do subúrbio (05/11)

Bíblia §4: "o subúrbio é o mundo aberto, onde acontecem as corridas". §8: lá
embaixo se anda a pé, de patins ou de moto. §9: a trilha não para.

## O traçado

Pelas ruas das ruínas (`estrada/ruinasDados.ts`: quadras de 40 m, ruas de 12 m;
os eixos das ruas ficam em x = -948 + 52·i e z = -732 + 52·j). O circuito segue
os eixos, com curvas fechadas (raio de 9 m no eixo) nos cruzamentos.

- **Volta:** 1.585 m, 2 voltas (3,2 km). 18 cantos, 11 portões (a linha e 10 no meio).
- **As retas:** a da largada (reta do bar, rumo leste até a oficina, ~150 m) e a de
  baixo (a do palco, ~150 m), mais as compridas do oeste.
- **Curvas fechadas:** o zigue-zague do noroeste (4 cantos seguidos de 52 m) e a
  diagonal que corta a praça na frente do bar antes da linha.
- **Passa perto:** do bar (26 m), da oficina (28 m), da quadra (36 m), do palco
  (47 m), da goteira (50 m) e da boca do túnel (78 m; a rampa a 58 m).
- **Sem atravessar prédio nem lugar:** a menor folga do eixo até uma parede ou
  entulho é 5,2 m; o pilar de pista mais perto fica a 15 m; e a volta fica a mais
  de 30 m da borda do subúrbio (não troca de zona no meio da corrida).

Conferido com `bun scripts/corrida-rua-conferir.ts` (só calcula; imprime as
medidas e o desenho abaixo). O traçado mora em `app/linha/disco/corridaRua.ts`
(`CANTOS_RUA`).

Norte (z menor) em cima, 8 m por letra. `#` parede ou entulho das ruínas,
`·` o eixo da corrida, `S` a largada/chegada, `1`–`9` e `A` os portões na
ordem, `B` bar, `O` oficina, `Q` quadra, `P` palco, `T` túneis, `G` goteira.
Sentido: sai do `S` pro leste (direita), desce na oficina, volta pro oeste por
baixo, sobe pelo oeste, faz o zigue-zague de cima e volta pela diagonal do bar.

```
                    #   # ##  ## #
                     #           #
         ··········7·········
         ·                  ··
    ## # · #        #  ##### ·## #   # ##
    ##   ·          #     ## ·##
#   ## # ·   ##  ##    #     ·  #
##  ## # · # ##  ## #   # ## ·   #
         ·                   ·
   ···6···                   8
## ·         ##              ·##      T     #
## ·         ##  ## #   # ## ·## #         ##
   ·                         ·
## ·             ## #  ##### ·##           ##
   ·             #  #  #####··
   ·   Q        ·············
   ·            ·
## ·         ## ·## #   # ##  ##                  #
   ·            ·         #   ##        #
## 5            9        ###
## ·         ## ·## #   # ##                      #
   ·            ·
   ·            ·······              G
   · # #  #           ·                           #
## ·## #   #        # ·   ##  ##              #   # #
   ·                  ··
## ·## #   #      #     A  #     #            #   #
   ·## #   #             ··       #
   ·······                ··S····················
         ·            B                         ·
       # · # ##  #            ## #         ## # · #
       # ·   ##                                 ·
    ##   ·   ##  ##              #              ·
##  ## # · # ##  ##              #              · #
         ·                                      ·
         ·                                   O  1
         ·                                      ·
##     # · # ##  ## #            #              · #
         4                                      ·
##  ## # · #     ## #            #              · #
##  ##   ·       ##                             ·
         ·                   ·········2··········
         ·                   ·
         · #     #####  #    ·         ##  ## #
         ·       ##          ·                #
         ·                   ·
   P     · #        #   # ## ·##           ## #
         ·                  ··
         ··········3·········
          #  ##                      #
       #   # ##  ## #   # ##         # ##
```

## Como começa (sem menu)

- O arco de largada (as colunas escuras, o neon rosa, a placa "CORRIDA · DE RUA ·
  2 VOLTAS" e o xadrez no chão) fica na reta do bar, a ~47 m dele.
- De moto ou de patins (fora da Kombi), a menos de 22 m da linha: aparece o botão
  **correr** (o mesmo desenho do "tirar um racha"), com o seu melhor tempo.
- Tocou: você vai pra grade (atrás, à direita), os 3 rivais na frente, e a
  contagem 3, 2, 1 te segura parado. Valendo: passa pelos portões na ordem. O
  próximo portão acende ciano, o seguinte rosa fraco; a linha fica branca.
- Na tela: a volta, o portão, o lugar e o relógio. "desistir" acaba na hora.
- Acaba sozinha se: sair da moto/patins (ou trocar de um pro outro), ficar mais de
  60 m longe do circuito por 6 s, ou passar de 8 minutos.

## Os rivais

Os mesmos pilotos das trincheiras (`trincheiras/corrida.ts`, o desenho de
`geoCorrida.ts`), no veículo de quem corre:

| você | rivais |
|---|---|
| moto | TROVÃO, VESPA, LAMA (motos) |
| patins | RATO (patins), FAÍSCA (BMX), CORUJA (skate) |

IA leve: andam no eixo com um balanço de lado, freiam antes das curvas (olham
adiante a curvatura) e têm elástico (muito na frente aliviam, muito atrás
forçam). Sozinhos fazem a volta em ~63 s de moto e ~68 s de patins (conta do
`passoRivalRua`, não medido no jogo). Os números ficam em `RIVAIS_RUA` e
`CORRIDA_RUA_CFG` (`disco/corridaRua.ts`), RASCUNHO pro dono afinar na Mesa.

## O save e o prêmio

- `save.ruaSuburbio`: o melhor tempo por veículo (`melhor.moto`, `melhor.patins`),
  as vitórias e quantas correu. Só entra a corrida que chegou (desistir não conta).
- **Primeira vitória:** +40 neon$ (uma vez só). Depois, só o tempo.
- `placarComCorrida` (`corridaRua.ts`) faz a conta; a `page.tsx` grava.

## A música

A corrida não abre tela nem pausa nada: a rádio que estava tocando segue, e o
circuito inteiro fica na zona de som do subúrbio, então o filtro de rádio antiga
continua (ver `docs/musica-continua.md`).

## O mapa

O pontinho "CORRIDA" (ciano) na largada, no minimapa, no mapa grande e no drone
(`estrada/pontosMapa.ts`), só depois que o jogador chegou ao subúrbio
(`radioXenom` no save, gravado na primeira chegada; save antigo: já passou da
fase do bar).

## Desempenho

- Tudo dentro do `<Perto nome="ruínas">` (raio de 960 m do subúrbio): longe, nada existe.
- Sem luz nenhuma: o arco e os portões são MeshBasic (o neon somado na tela).
- O arco: 3 desenhos. Os portões: 1 malha instanciada (11), só durante a corrida.
  Os rivais: 1 desenho cada (3), só durante a corrida.
- Por quadro: o passo dos 3 rivais, a distância até o próximo portão e o ponto da
  volta mais perto (procura em ~35 pontos). As 11 cores só mudam quando passa um portão.
- Nada medido no jogo (regra: só `tsc`).

## Arquivos

- `app/linha/disco/corridaRua.ts`: o traçado, os portões, os rivais, o estado e o placar.
- `app/linha/disco/CorridaDeRua.tsx`: a cena (o arco, os portões, os rivais, a
  regra da corrida) e a tela (o botão, o placar, o resultado).
- `app/linha/disco/corridaRua.css`: o pouco que muda do desenho dos rachas.
- `app/linha/estrada/Corrida.tsx`: monta a cena no `<Perto>` das ruínas e a tela
  junto da dos rachas; passa o ponto do mapa.
- `app/linha/estado.ts` (`ruaSuburbio`) e `app/linha/page.tsx` (grava o placar).
- `scripts/corrida-rua-conferir.ts`: a conferência do traçado.

## Pra conferir no jogo (Mesa)

- Se a rua de 12 m é boa de moto nas curvas de 90° (o raio é 9 m no eixo).
- Se os rivais ficam disputados (o elástico) de moto e de patins.
- O arco de noite (o xadrez é branco sem luz: pode brilhar demais).
- O relevo: os portões assentam no chão do meio da rua; onde a duna inclina, uma
  coluna pode ficar meio enterrada (elas descem 1 m abaixo do chão de propósito).
- Não mexi no cartão da Mesa (`app/teste/mesa.ts`).
