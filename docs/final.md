# O final (T29): a revolta popular, dentro do jogo

Refeito em 09/11/2026, pelas palavras do dono em `projetos/cidade-neon/episodios.md`, "Pra decidir no final". O foco é o povo: os nove só aparecem à frente das multidões, nos focos. Do final antigo fica só a chuva caindo. **Saíram:** os feixes de luz, a cena dos nove sob os monumentos, a despedida do Criador (vídeo e falas) e a Kombi no quintal.

## A ordem nova (16/11, o dono): a captura vem antes do show

Fonte: `episodios.md`, "A entrega e as incubadoras" e "A ordem do final". Todos capturados → resgate nas incubadoras → elevador até a sala de controle do Núcleo → o show da CHUVA e o resto do final abaixo.

| # | Momento | O que se vê | Tempo | Link |
|---|---|---|---|---|
| 0a | A captura | chegou no palco do deserto pro show do ep. 9 (missão `lu2ca`) com o resto feito: em vez do show, a câmera do palco com a plateia e uma linha só, "vistos andando com um veículo desconhecido pela cidade" (RASCUNHO) | 5 s | `?parte=final` ou `?parte=final.captura` |
| 0b | As incubadoras | o hack das propagandas (sem grana) e o corredor com os nove (`pedirIncubadoras`, `capturados()`); o chamado sem a D-Bee, que também está numa incubadora | espera quebrar todas | `?parte=final.incubadoras` |
| 0c | A sala de controle | todas quebradas, a porta do elevador no fim da sala acende: tocar sobe (escuro, um zumbido). Na sala, os nove em volta do painel e as três falas do plano, uma por vez (RASCUNHO, `disco/finalTextos.ts`) | ~15 s | `?parte=final.controle` |

Depois da sala, a captura fica no save (`capturaFinal`) e a pessoa está de volta no palco: a missão `lu2ca` segue (chegar, depois o show).

## O jogo acaba no show (16/11, o dono)

A CHUVA toca **uma vez só**: a do show final, no **degrau "final"** da escada dos shows (`escadaShows.ts`). A pessoa escolhe, como nos outros shows:
- **assistir** (`ShowAfinador` no mundo, cantando junto): o mundo segue vivo atrás e o final acontece ao mesmo tempo. **palco** (20 s, a plateia cheia) → **agua** (24 s, a água já liberada na sala corre do Núcleo até a casa da D-Bee, e o povo sai a pé pela rua) → **chuva** (30 s, a chuva limpa) → **floresta** (fica até a música acabar). Acabou a CHUVA: o final fica feito.
- **tocar** (o show de sempre): logo depois, a cena curta, **chuva** (12 s) → **floresta** (18 s), sem música (só a chuva).

**Saíram:** o gesto "convocar o povo" (que reiniciava a CHUVA), o "andar" até as torres, os focos e o Núcleo fritando. O código deles fica parado (o tipo e o 3D), sem entrar na sequência.

**Save antigo:** quem já tinha feito o show e não o final passa pela captura quando o final começa e, saindo da sala, vê a cena curta. Quem já terminou o final não refaz nada: a floresta e o mundo depois ficam.

**A torneira** antiga dos túneis fica só sugerida: na sala de controle a água é liberada. Não aparece na tela: pergunta pro dono.

**Links:** `final` e `final.captura` (do começo), `final.incubadoras`, `final.controle`, `final.show` (direto no show, a captura feita), `final.palco`, `final.agua`, `final.chuva`, `final.floresta` (cada momento sem música).

> As seções abaixo descrevem o final de 09/11; o que mudou em 16/11 está acima e vale por cima delas.

## Como destrava e onde começa

- **Destrava** pela regra que já existia (`disco/portas.ts`, `MISSOES13.final.requer`): as 11 missões dos 9 episódios feitas. O Xeriff é livre e não conta.
- **O último show e o final são no centro do deserto** (`lugar: { chao: "palcoDeserto" }`, `disco/historia.ts`): o trecho mais plano entre a casa da D-Bee e a borda do mapa (x -2950, z -1150). Tem ponto no mapa e GPS como os outros lugares do chão. Antes do show da CHUVA, chegar lá mostra o cadeado com o que libera; depois do final, o palco abre a casa de shows, como o do subúrbio.
- Quem termina o show do ep. 9 (missão `lu2ca`) com tudo feito segue direto ali: `page.tsx`, `abrirPortaDe` abre a porta do LU2CA, pega a missão `final` e abre o final.
- **Save antigo** que já fez o show (no palco antigo) pega o final no mapa e vai até o palco do deserto: chegou, começa no gesto. Quem já terminou o final antigo não refaz nada e já tem a floresta (`docs/mundo-depois.md`).
- **Recarregou no meio:** o final fica pegado no save; volta pro palco do deserto e faz o gesto de novo.
- **Acaba:** as duas peças do final ficam feitas e a porta "o mundo depois" abre.

## O show lotado

Na missão do show da CHUVA (`lu2ca`) e no final, a plateia enche uma meia-lua enorme em frente ao palco: é a `Multidao` de sempre (`interior/comum.tsx`, carregada só aqui, por `lazy`). O palco é o modelo dos palcos das faixas, maior (`PalcoDeserto` em `disco/LugaresChao.tsx`). O show em si roda com a popularidade cheia (o número de gente na tela; o save não muda).

## A sequência

| # | Momento | O que se vê | Tempo | Link |
|---|---|---|---|---|
| 1 | O palco | em cima do palco, olhando a plateia cheia. O único gesto do final: tocar na tela (ou espaço/enter). Um anel pequeno marca o palco | espera o gesto | `?parte=final` ou `?parte=final.palco` |
| 2 | Andar | o jogo normal, sem faixas de cinema: a pessoa dirige livre, o GPS aponta o pé da torre 1 e a plateia sai a pé do deserto em direção aos focos. Vale chegar em qualquer torre, em qualquer altura | espera a pessoa | `?parte=final.andar` |
| 3 | O Núcleo | só se assiste. A câmera gira em volta da torre central com o povo embaixo: os veios de água secam de baixo pra cima (o abastecimento desligado) e o Núcleo frita de dentro pra fora, até sobrar a torre queimada com brasas. No fim a água começa a sair | 26 s | `?parte=final.nucleo` |
| 4 | A água | a câmera segue a frente da água, da Nectar até o subúrbio e o deserto, até a casa da D-Bee. A água também corre nas outras oito pistas | 24 s | `?parte=final.agua` |
| 5 | A chuva | na casa da D-Bee, a chuva cai de verdade, a mesma chuva do jogo, no máximo da rua CHUVA | 12 s | `?parte=final.chuva` |
| 6 | A floresta | a câmera sobe em volta da casa e o deserto vira floresta | 18 s | `?parte=final.floresta` |

**A CHUVA** (`SOM_SINAL_FINAL`, a completa) toca do gesto até o fim, sem reiniciar nem cortar: presa à tela inteira, não ao momento, e em loop se a pessoa demorar pra chegar. Os links de um momento do meio abrem sem música.

**Os focos da revolução** (`FOCOS` em `disco/final.ts`): as três torres das pontas têm três focos cada, um por rua que chega nela, e quem lidera é o dono da música dessa rua. Torre 1: D-Bee, Drew e Nizzy. Torre 2: Notti, Tony Gordo e Mubarak. Torre 3: Alohan, LU2CA e Ella. O líder é um corpo da multidão na cor dele, na frente do povo, que olha pra ele; parte da multidão veste a cor dele. Sem nome, sem luz, sem câmera. A torre central é o Núcleo: em volta dela o povo aparece no momento 3.

**No "andar"** a página segue como em cena (`cinema` derivado em `page.tsx`, a Corrida recebe o real): nada de ligação, perseguição, racha, túnel ou porta de lugar interrompendo.

## Texto na tela

Antes do show, as falas de `disco/finalTextos.ts` (RASCUNHO, só palavras do dono). Depois, só o do gesto: **"convocar o povo" (RASCUNHO, `TEXTO_GESTO` em `disco/final.ts`)**. Nenhuma legenda, nenhuma fala. Os textos que falavam dos nove nos pontos e da D-Bee acionando a chuva saíram (`sugestoesDbee.ts`, `vinhetasXenom.ts`); os textos da missão em `portas.ts` também viraram só "convocar o povo" (RASCUNHO).

## Onde mora cada coisa

- `app/linha/disco/final.ts`: os momentos, os tempos, o texto do gesto e o estado ao vivo (`FINAL_VIVO`); `capturaAntesDoShow`, `capturados`, `seguirFinal`.
- `app/linha/disco/finalTextos.ts`: as falas da captura, do corredor e da sala (RASCUNHO).
- `app/linha/disco/EntregaCena.tsx` (com `final`): o corredor com o elevador; `SalaControle.tsx`: a subida e a sala (Canvas próprio, só ali, tudo `MeshBasicMaterial` e instanciado).
- `app/linha/disco/FinalTela.tsx`: o gesto, a CHUVA e o tempo de cada momento.
- `app/linha/estrada/FinalPovo.tsx`: o 3D do final (a plateia, os focos, o Núcleo fritando, a água) e a câmera. `FinalMultidao.tsx` é a ponte pra `Multidao` e o povo a pé (`PovoAndando`).
- `app/linha/estrada/Floresta.tsx`: a floresta e as plantas da Ella.
- `Corrida.tsx`: a câmera obedece `CAM_ROTEIRO` enquanto o final passa; a chuva aparece também no deserto durante o final.
- `parteTeste.ts`: os links (`final`, `final.<momento>`, `mundo.depois.floresta`).

**Desempenho:** nenhuma luz nova. Fora do final nada é montado, e os focos só existem nos momentos 2 e 3, com a câmera a menos de 620 m da torre deles. Multidões instanciadas: uma malha por torre, mexendo 1/3 dela por quadro (`fatia` da `Multidao`); o povo a pé é uma malha só, 1/4 por quadro. O Núcleo é uma casca e 200 fagulhas, tudo por shader. Pior caso de corpos na tela: cerca de 2,3 mil em qualidade alta (428 triângulos cada). A cidade em volta do Núcleo é aquecida quando a câmera chega perto de uma torre, e o caminho da água no momento 3 (`PERTO_EXTRA`).

## O que precisa do dono

1. O gesto: "tocar uma vez na tela" e o texto "convocar o povo".
2. A plateia e os líderes usam corpos genéricos: os nove ainda não têm modelo próprio.
3. **A recompensa real** (T32) não está no jogo: a porta do final não dá nada dentro dele.
