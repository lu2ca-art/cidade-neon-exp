# A moto (05/11)

A moto mora guardada na Kombi. Ela é o veículo que anda em todo lugar: no
deserto, no subúrbio, nos túneis e na cidade (bíblia §8).

## Como libera

- É o prêmio da **missão dos túneis**: correr nas trincheiras abre a porta
  `motos` (junto com `corridas`, em `app/linha/disco/portas.ts`).
- No fim do jogo (fase `livre`) ela já vem aberta.
- A regra é uma função só: `motoLiberada(historia)` em
  `app/linha/estrada/zonas.ts`. Corrida e trincheiras leem dela.
- Antes de liberar: o botão "moto" aparece com o cadeado; tocar mostra o aviso
  "ganha na missão dos túneis: correr nas trincheiras" (`TRANCA_MOTO`).
- Pra testar sem jogar: `?motos` na URL.

## Como pega

- **Dentro da Kombi** (no deserto, na entrada do Xenom ou na cidade): o botão
  "moto". A moto sai da Kombi e a Kombi fica parada ali.
- **De patins perto da Kombi parada**: "pegar a moto".
- **Voltar**: perto da Kombi, "guardar a moto · voltar pra Kombi" (a moto volta
  pra dentro dela). No subúrbio, onde a Kombi não entra, "guardar a moto" deixa
  você a pé / de patins.

## Onde anda (a tabela em `zonas.ts`)

| zona | pode |
|---|---|
| cidade | tudo |
| deserto | Kombi, carro, moto |
| subúrbio | moto, a pé, patins, bmx, skate |
| túneis | moto, a pé, patins, bmx, skate |

- Chegando de Kombi no subúrbio, com a moto liberada: a Kombi para na entrada e
  você segue **de moto** (sem ela: de patins, como antes).
- Entrando no subúrbio de moto: segue de moto.
- **Kombi quebrada** (a quebra sorteada, ela vai pra oficina): com a moto
  liberada, você segue de moto no deserto até a oficina.
- **Kombi no conserto na missão do Drew**: continua de patins, porque a missão
  ensina o jetpack (a moto não voa).
- Descendo pros túneis de moto: lá embaixo o passeio já é de moto. Na escolha da
  corrida, o cartão da moto abre com a mesma regra.

## Como anda

- Até 185 km/h (o patins vai a 150), arranca mais forte e vira mais rápido que a
  Kombi no chão.
- Sem propulsor e sem dash: não voa. Pula do jeito normal (espaço) e voa das
  rampas; no ar dá pra girar como no patins.
- Câmera atrás, um pouco mais longe que a do patins.
- O desenho é o da moto das trincheiras (`trincheiras/Pilotos.tsx`, o
  Motoqueiro), montado só quando a moto está liberada.
- Os números ficam em `MOTO` no topo de `app/linha/estrada/Corrida.tsx`.
