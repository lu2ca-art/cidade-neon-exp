# A D-Bee sugere (05/11)

Bíblia §5: "A D-Bee é a narradora e guia a história. Ela ajuda a pessoa a saber o
que deve fazer e, principalmente, o que **pode** fazer fora do eixo narrativo. No
momento presente, sem cronologia. O mapa está ali pra explorar e se divertir de
várias maneiras."

Quando a pessoa está solta (sem missão, passeando), a D-Bee lembra de uma coisa
que dá pra fazer agora, numa frase curta no notch: **"D-Bee: …"**. Tocar na
frase marca o lugar no mapa (o GPS, a rota, o drone e o piloto seguem a marca).
Nenhuma tela abre.

## Quando ela fala

- Só na **carreira** e no **jogo livre**. Antes disso, a história guia.
- **Sem missão pegada**, e:
  - parada ou passeando há **45 s** sem nada acontecer; ou
  - **8 s** depois de acabar alguma coisa (corrida, racha, peça, sala, cena, missão).
- No máximo **uma a cada ~90 s**. A primeira vem uns 45 s depois de a estrada abrir.
- **Nunca a mesma duas vezes seguidas.**
- **Nunca durante:** corrida de rua, racha, peça (pausado), intro e falas, cena,
  chegada, perseguição, celular aberto, drone, montanha-russa, a Kombi no conserto
  ou quebrada, nem com uma **pedra da trilha** na tela.
- A frase passa no notch, rola se for longa e respira parada mais **4,5 s**.
- Se não tem nada pra sugerir, ela tenta de novo uns 25 s depois (sem gastar os 90 s).

## Como ela escolhe

Junta todas as opções que valem agora e sorteia com peso:
- a que **passou menos vezes** pesa mais (peso ÷ (1 + vezes));
- a que ele **já fez** só volta se é das que repetem, e mais fraca (×0,35);
- o que está **perto** (menos de 450 m) pesa 1,6×; em cima (menos de 60 m), quase some;
- algumas pesam mais **de noite** (19 h às 5 h) ou na **zona** certa.

## O catálogo

O texto é **RASCUNHO**: o LU2CA reescreve (em `RUAS_DBEE`, `MISSOES_DBEE` e no
`texto` de cada entrada).

| id | quando vale | o que ela diz (rascunho) | alvo no mapa | conta como feita | repete |
|---|---|---|---|---|---|
| `missao:<id>` | a missão está no mapa pra pegar | uma frase por missão: "o Mubarak quer te mostrar um disco antigo, lá no Copo. passa lá?", "o Drew tá em casa de novo numa sexta…", "a Ella pinta e ninguém vê…" (todas em `MISSOES_DBEE`) | o lugar da missão (o mesmo do gatilho) | (pegar a missão já tira ela da lista) | sim, peso 2 |
| `corrida-rua` | a largada já está no mapa (chegou no subúrbio) | nunca correu: "tem corrida de rua aqui no subúrbio, perto do bar. de moto ou de patins vale. bora?" · sem vitória: "a corrida de rua tá te devendo uma vitória. revanche?" · com vitória: "teu melhor na corrida de rua é 1:05. dá pra baixar, hein" | a largada (o arco perto do bar) | correu uma vez | sim; pesa mais de moto/patins ou no subúrbio |
| `sinuca` | depois do prólogo | "o Copo tá aberto e a mesa de sinuca tá lá, livre. vai treinar uma tacada?" (depois do Mubarak: "bora uma sinuca no Copo? só pra relaxar a mão") | o bar O COPO | chegou no bar | sim; pesa mais de noite |
| `fliperama` | depois do prólogo | "dá uma olhada no fliperama da cidade. as máquinas tão lá, esperando acender" (depois do Notti: "o fliperama tá aceso. bora bater uns recordes?") | o fliperama (a página na pista) | chegou nele | sim; pesa mais de noite |
| `radio-xenom` | no subúrbio ou nos túneis, com a rádio desligada | "liga a rádio: a Xenom fala de tudo que rola aqui embaixo" | — | ligou a rádio no subúrbio | não |
| `rua:<faixa>` | a rua está acesa, ele ainda **não ouviu a faixa dela inteira** e não está nela | uma por rua (`RUAS_DBEE`): "já ouviu a CHUVA inteira? vai pela rua dela, de noite. segura o freio que vira guarda-chuva", "a rua da DopaminA pede sempre mais um…", "na rua da Sabe Ontem? um dia inteiro cabe numa faixa…" | o começo da rua (12% da ida) | a faixa completa tocou inteira (fica no save) | não; CHUVA, DopaminA e Sexta pesam mais de noite |
| `tv` | de Kombi, numa rua da cidade, com a TV fechada | "toca no ♪ lá em cima: a TV mostra o clipe da faixa que tá tocando" | — | abriu a TV | não |
| `piloto` | de Kombi, numa rua da cidade, sem o piloto | "solta o volante um pouco: liga o piloto do lado do GPS e só curte a faixa" | — | ligou o piloto | sim, fraca depois |
| `grafite` | depois do prólogo | "lá embaixo nos túneis tem um salão inteirinho de grafite. vai deixar tua assinatura?" | a boca dos túneis | chegou na boca | sim; pesa mais no subúrbio |
| `casa` | depois do prólogo | instrumento novo: "tem instrumento novo lá em casa. passa lá pra gente tocar junto?" · sem novo: "minha casa tá aberta, os instrumentos tão lá…" · sem nenhum: "passa lá em casa um dia. o deserto de noite é outra coisa" | a casa da D-Bee | chegou na casa | sim; pesa muito com instrumento novo |
| `moto` | a moto liberada e ele de Kombi | "a moto tá guardadinha na Kombi. toca em "moto" e vai dar um rolê pelo subúrbio" | — | subiu na moto | não |

## O toque

- Tocar na frase (ela fica com um sublinhado pontilhado) marca o alvo. A frase sai.
- **Lugar da cidade** (missão, fliperama, rua): a marca normal do mapa (via, u).
- **Lugar do chão** (bar, túneis, casa, a largada): a marca ganha o ponto do chão
  (`wx`, `wz`). O GPS e o drone miram o chão; a rota vai até a pista mais perto e
  depois em reta. O piloto e a viagem rápida vão até essa pista.
- Chegou (45 m; ou o mapa tirou a marca e ele está a menos de 135 m): conta como
  feita e a marca dela sai. Pegou uma missão: a marca dela sai também (o GPS volta
  pra missão). Se ele marcou outra coisa no mapa, a dela some da memória e fica a dele.

## O save

`save.dbee` (`MemoriaDbee`):
- `n`: quantas vezes cada sugestão passou (`"rua:chuva": 2`);
- `ultima`: a última (não repete seguida);
- `feitas`: o que ele já fez (chegou, ou o jogo viu);
- `ouvidas`: as ruas cuja faixa completa tocou inteira.

## Onde mora

| o quê | arquivo |
|---|---|
| o catálogo, os textos, os pesos, a escolha e a memória | `app/linha/disco/sugestoesDbee.ts` (`SUGESTOES_DBEE`, `RUAS_DBEE`, `MISSOES_DBEE`, `DBEE_CFG`, `escolherDbee`) |
| a hora de falar, o toque, o que ele fez | `app/linha/disco/DbeeSugere.tsx` (não desenha nada) |
| montado na estrada | `app/linha/estrada/Corrida.tsx` (1 import e 1 linha, junto da corrida de rua) |
| a frase que dá pra tocar no notch | `notch(texto, cor, { toque, fica })` em `estrada/Holo.tsx`; o estilo `.is-toque` em `linha.css` |
| a pedra da trilha na tela | `lerNexoTutorial()` em `estrada/Holo.tsx` |
| a marca do chão | `Marca.wx/wz` (`estrada/Mapa.tsx`), lida por `destinoMundo` (`Gps.tsx`) e pelo drone (`Drone.tsx`); `pistaPerto` (`nav.ts`) agora é exportado |
| a faixa ouvida inteira | `aoOuvirCompleta` em `disco/musicaContinua.ts` |
| o save | `dbee` em `estado.ts`; `page.tsx` carrega (`definirMemoriaDbee`) e grava (`ouvirMemoriaDbee`) |

## Desempenho

Nada por quadro e nada na cena 3D. Um `setInterval` de 3 s lê refs (onde ele
está, o veículo, a rádio, a TV, o piloto, a corrida). A escolha e as distâncias
só rodam na hora de falar (no máximo uma vez a cada 90 s). Os pontos dos alvos
ficam em cache. Na tela, uma mensagem do notch por fala.

## Pra mexer

- **Números** (90 s, 45 s, 8 s, o tempo no notch, o raio de chegar e de perto): `DBEE_CFG`.
- **Textos:** `RUAS_DBEE`, `MISSOES_DBEE` e o `texto` de cada entrada de `SUGESTOES_DBEE`.
- **Uma sugestão nova:** uma entrada a mais em `SUGESTOES_DBEE` (`opcoes(c)` devolve
  zero ou mais opções com `chave`, `texto`, `alvo`, `peso`). Tirar a entrada tira a sugestão.

## Falta

- Ninguém jogou isto: só rodou o `tsc`. Os tempos (90 s, 45 s) são palpite.
- A voz gravada da D-Bee (hoje é só texto no notch).
- O dono reescrever as falas (todas rascunho).
- O grafite e a casa contam como feitos ao chegar, não ao assinar/tocar.
- O cartão da Mesa (`app/teste/mesa.ts`) não foi mexido.
