# Música contínua na cidade (03/11)

> "Entro na pista, começa a tocar uma música nova, começo a me envolver; aí entra
> a missão, que pausa a música. [...] Cada música é uma experiência que dura o
> tamanho da faixa." — o dono, 03/11

## Como era

Três peças tocavam música na cidade, cada uma por conta própria:

| Peça | Arquivo | O que fazia |
|---|---|---|
| Toca-discos da pista (`PistaSom`) | `app/linha/som.ts` | um `<audio>` só. Entrou na pista → `entrar(src)` do zero. A cada quadro `estado()` freava a faixa (scratch → **pause**) quando a Kombi saía do chão (pulo, propulsor/turbo, patins) **ou quando a corrida estava `pausado`** (missão, peça, cena, celular, recompensa…). `segurar()` (jogo no holo, `silenciar`) dava **pause**. |
| A escolha da faixa | `app/linha/estrada/Corrida.tsx` (bloco "a pista é o toca-discos") | Na carreira: a música era o **tema da missão pegada** (o instrumental até achar a linha dela, a voz uma vez, depois instrumental), não a faixa da pista onde você estava. Fora disso: a versão do trajeto (T31: prévia de 22 s → instrumental → subúrbio) e pista apagada = instrumental abafado. E no desmonte da Corrida (entrar numa **sala** de missão, trincheiras, metrô) `pistaSom.parar()` — a faixa morria e, ao voltar, recomeçava do zero. |
| O som da missão (`Trilha`) | `app/linha/disco/trilha.ts` + `disco/sons.ts` + `page.tsx` | Entrou no lugar da missão → `silenciarKombi(true)` (que **pausava** a pista e zerava o abafo) e tocava o instrumental de **outra** faixa, fixo por missão (`SOM_MISSAO`: oficina = Sabe Ontem, túneis = DopaminA…). Saiu → a trilha sumia e a pista voltava (às vezes do zero). |

A "duração pela velocidade": a pista foi desenhada para uma volta = meia
música **na velocidade da pista** (`volta = 2·BPM km/h × duração/2`, `pistas.ts`).
Com turbo você chega antes na missão; como a missão pausava a música, a faixa
tocava só um pedaço, parava, e a próxima missão/faixa já entrava.

## Como ficou

Regra em `app/linha/disco/musicaContinua.ts` (só regra e memória, sem áudio);
quem toca é o `PistaSom` novo em `app/linha/som.ts`.

1. **Entrou numa pista** → `pistaSom.tocarFaixa(faixa)`: a faixa dela do
   início, versão completa (com voz; se a voz ainda não foi lançada, a completa
   é o instrumental). Nas torres/cruzamentos continua a que estava.
2. **Nada pausa a faixa.** O `estado()` por quadro só mexe no volume/filtro do
   mestre (no ar = abafa e abaixa; rádio ligada = cala por cima; pista apagada =
   abafada), sem `pause` e sem `playbackRate` — turbo, pulo e propulsor não
   mudam o tempo da música. `silenciar` (jogo do holo, show) abaixa a zero mas a
   faixa **continua andando**. O desmonte da Corrida (entrar numa sala) não para
   mais a faixa; ela só para ao sair da página (`page.tsx`) ou ao ir pro deserto.
3. **Missão/peça/cena** (`page.tsx`: cena, ping pong, trincheiras, prova/peça,
   oficina, sinuca do bar, show) → `pistaSom.missao(true)`: crossfade de 1,5 s
   para o instrumental **da mesma faixa no mesmo `currentTime`**. Terminou →
   `missao(false)`: volta em crossfade para a completa no ponto atual, se ela
   ainda não acabou. A troca é adiada um tique, então cena → cena não faz
   vai-e-volta.
4. **A completa acabou** (evento `ended`, ou o instrumental que estava no lugar
   dela durante a missão chegou ao fim) → marca a faixa como ouvida e fica o
   instrumental em loop.
5. **Trocou de pista** → crossfade para a faixa nova do início. Pista cuja
   completa já tocou nesta sessão → direto o instrumental (loop).
6. **Turbo** não muda nada: a música segue o tempo da faixa, não a distância.
   (O desenho da pista "uma volta = meia música" continua só como medida do
   traçado; nenhum código de som depende dele.)
7. Faixa sem instrumental → a completa com volume `VOL_SEM_INST` (0,55) no
   lugar dele.

**Álbum comprado:** `albumComprado()` em `musicaContinua.ts` é o ponto único;
hoje retorna `false`. Quando for `true`, a completa toca sempre (em loop) e a
missão continua trocando pro instrumental no mesmo ponto.

**iPhone/Safari:** dois `<audio>` (os "decks") reaproveitados para sempre; os
dois só tocam juntos durante o crossfade (1,5 s) e o que saiu é pausado logo
depois. Os dois são destravados no primeiro toque (play/pause mudo de um
silêncio) para o `play()` fora do toque não ser barrado. Todo volume passa por
`GainNode` (no iOS `volume` é só leitura). O deck parado já carrega a outra
versão da faixa (completa ⇄ instrumental) para a troca da missão sair sem atraso.

**A trilha antiga** (`SOM_MISSAO`, o tambor da D-Bee) só toca quando **não**
tem faixa de pista tocando (o deserto: casa, dunas).

**O que saiu do caminho do som** (código ainda existe, só não decide mais a
música da pista): o tema da missão pegada (21/10 (3)) e a progressão da versão
pelo trajeto (T31: prévia → instrumental → subúrbio).

## Faixas sem instrumental

Nenhuma: as 9 pistas têm `public/audio/pistas/*-inst.mp3`
(ontem, copo, swav, sexta, rollercoaster, dopamina, chuva, ojala, nectar).

Sem a versão com voz no jogo (`voz: null` em `estrada/pistas.ts`; a "completa"
delas hoje é o instrumental, então a missão não muda nada nelas):

- **Swav** — lança 13/11 (existe `public/audio/tracks/swav.mp3`, não ligado)
- **Rollercoaster** — lança 27/11 (existe `public/audio/tracks/rollercoaster.mp3`, não ligado)
- **Ojalá** — a data de lançamento (30/10) já passou, mas `voz` ainda é `null`
  (existe `public/audio/tracks/ojala.mp3`, não ligado). Falta o dono confirmar
  o arquivo da voz e pôr `public/audio/pistas/ojala.mp3`.

## Para testar (no iPhone)

1. Entrar numa pista com voz (Sabe Ontem, Copo, Sexta, DopaminA, CHUVA, Nectar):
   a faixa começa do zero, com voz.
2. Pegar turbo, pular, abrir o celular: a música não para (no ar só abafa).
3. Entrar numa missão/cena/peça no meio: em ~1,5 s vira o instrumental, sem
   voltar pro começo. Sair: a voz volta no mesmo ponto.
4. Deixar a faixa acabar: fica o instrumental em loop. Sair da pista e voltar:
   só instrumental. Outra pista: a faixa nova do zero.
5. No console (dev): `__pistaSom()` mostra faixa, modo, tempo e loop;
   `__pistaSomFim()` pula pro fim da faixa.

## Falta

- Teste do dono no iPhone (nada medido nem rodado aqui; só `tsc`). O cartão da
  Mesa (`app/teste/mesa.ts`) não foi mexido.
- Ojalá com voz: ligar o arquivo quando o dono confirmar.
- `soTema`, `temaMissao` e `versoesPista` ainda chegam na Corrida, mas não
  decidem mais a música (dá pra limpar depois, ou religar se o dono quiser a
  prévia de volta antes da missão).
