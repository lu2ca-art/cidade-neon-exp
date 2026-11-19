# Modo vitrine (02/11)

O pedido do dono: todo lugar e toda experiência dá pra **visitar desde o primeiro minuto**. O que ainda não foi liberado aparece **trancado**, com um aviso curto do que libera ("faça a missão do Notti pra jogar"), em vez de sumir, não deixar entrar ou dizer "em breve".

O que libera continua igual: as regras estão em `app/linha/disco/portas.ts` (`trancado`, `CONFIG13.trancar`). Mudou só o que aparece antes de liberar.

## As peças

- `app/linha/Trancado.tsx` + `trancado.css`: o aviso padrão (cadeado + "trancado" + o pedido), o `<Cadeado />` e o `cn-card-trancado` (o card visível, mas sem jogar). Também `lerTranca()`: o aviso vai junto pra página do lugar pelo `?tranca=`.
- `app/linha/disco/vitrine.ts`: o texto do pedido (`facaMissao`, `pedidoDaPorta`), a visita do bar (`CENA_BAR_VISITA`) e o aviso da sinuca (`trancaSinuca`).
- `app/linha/disco/SinucaBar.tsx`: a mesa do bar no treino (carrega só quando abre).

## Inventário: lugar → o que bloqueava → como ficou

| Lugar / experiência | O que bloqueava | Como ficou |
|---|---|---|
| **Boca do túnel → trincheiras** | `chao:tuneis` só existia na carreira e na cidade livre (`chaoExtra`), e o aviso só era tratado com `fase === "carreira"`: no começo e na cidade livre a rampa não fazia nada | A boca leva pra dentro em **toda fase** depois da chegada (a Kombi para na porta, como decidido em 30/10). Antes da cidade, a corrida aparece com cadeado: "chegue na cidade pra correr"; passear (patins, skate, BMX) é livre |
| Corrida das trincheiras (escolha do veículo) | sempre aberta (menos a moto) | Antes da carreira: os veículos com cadeado + aviso; o botão "correr" com cadeado. Na carreira e na cidade livre: igual a antes |
| Motos (trincheiras) | `PORTAS.motos.existe = false`, "trancada · em breve" | igual (a moto ainda não está pronta: T14) |
| **Fliperama da cidade** (`/fliperama`) | `trancas.fliperama` (missão do Notti) e `exige: "rollercoaster"`: só um texto "de portas fechadas" | O botão "entrar · o fliperama · ver" sempre aparece. Lá dentro, as 7 máquinas aparecem com cadeado e o aviso ("faça a missão do Notti pra jogar"). Tocar numa máquina mostra o aviso; ficha não é cobrada |
| **Ginásio** (`/ginasio`) | `trancas.ginasio` (missão do Drew): só o texto | Entra sempre; basquete, pingue-pongue e cama elástica com cadeado + aviso |
| Galeria e casa de shows (páginas) | nada da história (só o horário) | igual |
| Horário das páginas ("abre às 18h") | o relógio do jogo | igual (não é progresso; fica pra decidir) |
| **Bar do subúrbio (O COPO) e a sinuca** | o bar só abria na fase do prólogo (`chao:bar` só valia com `fase === "bar"`); a sinuca só existia dentro da missão do Mubarak | Depois do prólogo, passando perto do bar aparece "entrar · o bar" (a Kombi não para). Entra, uma visita curta e a mesa de sinuca abre **no treino** (sozinho), com o aviso "treino livre · faça a missão do Mubarak pra jogar com ele". A partida com o Mubarak segue sendo a peça da missão |
| **Guitar Driver** (os palcos) | já abria desde o começo, com a Nectar tocável | As outras músicas e palcos fechados usam o cadeado padrão: "faça a missão do Drew pra tocar", "faça a missão do LU2CA pra subir" |
| **Loja** (app do celular) | `loja-discos` trancada (missão do Mubarak): não abria, só o aviso | Abre e mostra tudo com o aviso; comprar mostra o aviso e não compra |
| **Fliperama** (app do celular) | `fliperama` trancado; o app está escondido do celular (ESCONDIDOS) | Abre com os cards de cadeado + aviso (quando chegam nele) |
| FR3Q_ / Rádio (app) | `radio-frequencias` trancada (missão do Xeriff): não abria | Abre (são as prévias do disco) e avisa o que libera as frequências |
| SINT0NIA (trocar de frequência) | `radio-frequencias` trancada | igual: só o aviso (trocar de frequência é o que a missão do Xeriff libera) |
| Frequências no holo da Kombi | chiado + "as frequências abrem na missão do Xeriff" | chiado + "faça a missão do Xeriff pra sintonizar" |
| Parque (montanha-russa) | `trancas.parque` (missão da Nizzy) | o texto com cadeado: "o parque · faça a missão da Nizzy pra andar" (andar segue na missão) |
| Canteiros (regar) | `trancas.canteiros` (missão do Tony) | o texto com cadeado: "faça a missão do Tony Gordo pra regar" |
| **Elevador de terror** (a torre do subúrbio) | `chao:torre` só na carreira e na cidade livre | abre em toda fase depois da chegada |
| Casa da D-Bee | no prólogo é a cena da casa; na carreira só abre com instrumento novo (ou visita sem novos, pela mesma cena) | (parte 2) Na carreira, perto da casa (fora da chegada do login), "entrar · a casa da d-bee": com instrumento novo, a cena dos novos; sem, a visita livre. `?parte=vitrine.casa` |
| Salas da cidade (balada, casa do Drewboy, terraço, casa de shows) | no jogo com história só abrem quando a missão aponta pra elas | (parte 2) Na carreira, passando perto de uma delas (fora da missão), aparece "entrar · <lugar>": a sala abre numa visita curta e, se tem missão ali, o aviso "trancado · faça a missão do X pra ver o que acontece aqui". O gatilho da missão (alvoMissao.ts) não mudou. Links: `?parte=vitrine.balada`, `vitrine.drewboy`, `vitrine.terraco`, `vitrine.shows` |
| Beco e casa escondida | segredos (o beco depois da volta no mirante) | igual de propósito (segredo) |
| Violão, Jardim (apps) | `precisa`: o objeto da missão | (parte 2) abrem sempre: dá pra ver o app, os toques param e o aviso diz o que libera ("faça a missão da D-Bee pra tocar", "faça a missão da Ella pra regar"; sem violão depois do metrô: "o violão ficou no metrô") |
| Sala branca | nível 4 (o fim) | igual (o fim) |
| Torres das trincheiras ("a porta sobe pra rua") | "em breve" | igual (não existe ainda) |

## Links de teste

- `/linha?mapa=disco&parte=vitrine.tunel`: o começo (a oficina), já descendo pela boca do túnel: dá pra passear, e a corrida aparece com o cadeado.
- `/linha?mapa=disco&parte=vitrine.bar`: o meio da carreira, com a sinuca do bar aberta (treino + aviso do Mubarak).
- `/fliperama?de=cidade&tranca=faça%20a%20missão%20do%20Notti%20pra%20jogar`: o fliperama trancado por dentro.
- `/ginasio?de=cidade&tranca=faça%20a%20missão%20do%20Drew%20pra%20jogar`: o ginásio trancado por dentro.
- `/linha?mapa=disco&parte=palcos`: o Guitar Driver com as músicas trancadas.
