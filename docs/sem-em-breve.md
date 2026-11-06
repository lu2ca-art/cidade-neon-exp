# Sem "em breve" (bloco 1, 06/11)

Meta do bloco 1: "dá pra jogar do início ao fim (menos o final) sem 'em breve'".
Levantamento no jogo normal (o mapa-disco, sem link de teste), a partir de
`app/linha/disco/portas.ts` (MISSOES13, CONFIG13, `emBreve`, PORTAS).

## Como uma peça vira "em breve"

`emBreve(peca)` é verdade quando: (a) a peça não tem `como`; (b) é `casa` e a
missão está em `CONFIG13.soNoTeste`; (c) é `grafite` e `CONFIG13.grafiteNoMapa`
está desligado. Na recompensa, uma porta com `PORTAS[x].existe = false` aparece
"em breve".

Estado hoje: `soNoTeste = []`, `grafiteNoMapa = true`, as 16 portas com
`existe: true` e as 26 peças com `como`. A page.tsx abre cada tipo de `como`
(historia, pingpong, show, prova, evento, letra, batida, basquete, cena, chegar,
grafite, trincheiras, casa, final). Ou seja: **nenhuma das 13 missões cai em
"em breve" no jogo normal.**

## As 13 missões, peça por peça

| # | missão | arte | jogo | porta | recompensa |
|---|---|---|---|---|---|
| 1 | D-Bee | ok (história) | ok (história) | holo, violão: existem | Ojalá + djembê |
| 2 | oficina | ok (história) | ok (história) | melhorias da Kombi: existe | tambor de água |
| 3 | quadra (Alohan) | ok (batida) | ok (basquete) | quadra, BATIDA: existem | Ontem + udu |
| 4 | túneis | ok (grafite; flag ligada desde 31/10) | ok (trincheiras, T63) | corridas, moto: existem | sem faixa nem instrumento (não é "em breve") |
| 5 | Drew | ok (cena moda) | ok (chegar de patins) | ginásio: existe | Sexta + caxixi |
| 6 | Mubarak | ok (cena disco antigo) | ok (cena sinuca) | loja de discos: existe | Copo + sitar |
| 7 | Xeriff | ok (ping pong) | ok (prova sintonia) | rádio: existe | didgeridoo |
| 8 | LU2CA | ok (letra) | ok (show Nectar) | palcos: existe | Nectar no BATIDA + berimbau |
| 9 | Ella | ok (casa galeria) | ok (casa galeria) | galeria: existe | Chuva + flauta de bambu |
| 10 | Notti | ok (cena trilha8) | ok (cena máquina) | fliperama: existe | DopaminA + ocarina |
| 11 | Nizzy | ok (cena clipe) | ok (evento montanha) | parque: existe | Rollercoaster + handpan |
| 12 | Tony | ok (cena cozinhar) | ok (cena horta) | canteiros: existe | Swav + kalimba |
| 13 | final | (fora da meta do bloco) | ok (final) | mundo depois: existe (06/11) | — |

## O que ainda dizia "em breve" e o que virou

| onde | por quê | virou |
|---|---|---|
| `trincheiras/Trincheiras.tsx`: perto de uma torre, "a porta sobe pra rua (em breve)" | as torres não sobem (não existe a subida pela torre) | aponta pra saída que existe: "fechada por cima: a saída é A PORTA (o quadradinho laranja no mapinha)" |
| `disco/quebra.ts` `metroEmBreve`: "o metrô: em breve" quando a Kombi quebra | a quebra só acontece antes da perseguição (`quebraVale`), e o metrô só vale depois da fuga do metrô na história: na prática, sempre "em breve" | antes da fuga, a fala não cita o metrô (`falaMetroQuebra` devolve ""; Corrida.tsx junta só o que tem) |
| `portas.ts`, comentário do grafite "fica em breve até..." | velho: a flag já está ligada | comentário atualizado |
| `app/parque/page.tsx` menu: roda-gigante e fliperama "em breve" | o menu não abre mais (a página começa no passeio), mas o texto estava lá | roda-gigante abre o passeio já na roda; fliperama vai pra /fliperama (as duas existem) |

## Fora do jogo normal (anotado, não mexi)

- `app/radio/page.tsx`: a RADIO SUBURBIO XENOM "EM BREVE — SINAL BLOQUEADO" (página solta, o jogo não leva pra ela; falta o áudio: dono).
- `app/cidade/lugares.ts`: a loja de roupas `nota: "em breve"` (o protótipo /cidade; a moda existe como peça do Drew).
- `app/linha/os.tsx`: "acende em breve" na ficha de uma faixa sem data de lançamento (é a data, não uma peça).
- `app/youtube/cidade-neon/page.tsx`: "Em breve" (página do canal).
- `disco/missoes.ts` `missaoAgora` (o modelo antigo de 4 peças): ninguém chama mais.

## Segue dependendo do dono

- A fala do metrô DEPOIS da fuga ("o trem branco passa pela estação mais perto"):
  não achei uma saída de metrô na rua que leve à oficina. Hoje a quebra quase
  nunca cai depois da fuga (`quebraNoVeiculo`), então quase não aparece. RASCUNHO:
  deixar como está; se o dono quiser, trocar por "ou a moto" ou tirar.
- As torres das trincheiras subirem pra cidade: seria uma saída nova (decisão do dono).
- T34 (os combos de gosto): todos já jogam com peças que existem. RASCUNHO da
  recomendação mais simples: manter como está —
  Drew: arte = a moda (Moda.tsx), jogo = chegar de patins e jetpack;
  Xeriff: arte = o ping pong com o robô, jogo = a sintonia (prova do fliperama);
  LU2CA: arte = escrever a letra; Notti: arte = a trilha 8 bits, jogo = uma
  máquina (MAQUINA em pecas/conf.ts); Nizzy: arte = o clipe vertical;
  Tony: arte = cozinhar (depois da horta); Ella: jogo = o filme da planta e os quadros.
  O dono só precisa aprovar ou trocar (troca no `como` da peça em portas.ts).
- A arte do final ("a música da D-Bee, o sinal dos nove") segue `proposta` (fora da meta).
