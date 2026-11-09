# O final (T29): a revolta popular, dentro do jogo

Refeito em 09/11/2026, pelas palavras do dono em `projetos/cidade-neon/episodios.md`, "Pra decidir no final". O foco é o povo, não os nove. Do final antigo fica só a chuva caindo. **Saíram:** os feixes de luz, a cena dos nove sob os monumentos, a despedida do Criador (vídeo e falas) e a Kombi no quintal.

## Como destrava e onde começa

- **Destrava** pela regra que já existia (`disco/portas.ts`, `MISSOES13.final.requer`): as 11 missões dos 9 episódios feitas. O Xeriff é livre e não conta.
- **Começa no palco do show da CHUVA** (`lugar: palco-nectar`), não mais na casa da D-Bee. Quem termina o show do ep. 9 (missão `lu2ca`) com tudo feito segue direto ali: `page.tsx`, `abrirPortaDe` abre a porta do LU2CA, pega a missão `final` e abre o final.
- **Save antigo** que já fez o show pega o final no mapa e vai até o palco: chegou, começa no gesto. Quem já terminou o final antigo não refaz nada e já tem a floresta (`docs/mundo-depois.md`).
- **Recarregou no meio:** o final fica pegado no save; volta pro palco e faz o gesto de novo.
- **Acaba:** as duas peças do final ficam feitas e a porta "o mundo depois" abre.

## O show lotado

Na missão do show da CHUVA (`lu2ca`) e no final, a plateia em frente ao palco enche a rua: é a `Multidao` de sempre (`interior/comum.tsx`, carregada só aqui, por `lazy`). O show em si roda com a popularidade cheia (o número de gente na tela; o save não muda).

## A sequência

O jogo fica atrás o tempo todo, com as faixas de cinema e sem tela preta. Depois do gesto a pessoa só assiste: nada de pular.

| # | Momento | O que se vê | Tempo | Link |
|---|---|---|---|---|
| 1 | O palco | em cima do palco, olhando a plateia cheia. O único gesto do final: tocar na tela (ou espaço/enter). Um anel pequeno marca o palco | espera o gesto | `?parte=final` ou `?parte=final.palco` |
| 2 | O povo | a câmera sobe e volta pela rua: a multidão se junta até o Núcleo, com os nove no meio dela; na segunda metade a água já vem saindo do Núcleo | 16 s | `?parte=final.povo` |
| 3 | A água | a câmera segue a frente da água, da Nectar até o subúrbio e o deserto, até a casa da D-Bee. A água também corre nas outras oito pistas: é a derrubada do Núcleo, redistribuir a água | 24 s | `?parte=final.agua` |
| 4 | A chuva | na casa da D-Bee, a chuva cai de verdade, a mesma chuva do jogo, no máximo da rua CHUVA | 12 s | `?parte=final.chuva` |
| 5 | A floresta | a câmera sobe em volta da casa e o deserto vira floresta: as plantas crescem do chão e a areia fica verde, abrindo pra longe | 18 s | `?parte=final.floresta` |

**A CHUVA** (`SOM_SINAL_FINAL`, a completa) toca do gesto até o fim, sem reiniciar nem cortar: presa à tela inteira, não ao momento. A sequência dura cerca de 70 s e a faixa tem 3 min 10. Os links de um momento do meio abrem sem música.

**Os nove** (os 9 donos das músicas, lidos de `EPISODIOS`) estão na plateia, iguais a todo mundo: nem nome, nem luz, nem câmera neles. São corpos da multidão na cor deles, até existirem modelos.

## Texto na tela

Só o do gesto: **"convocar o povo" (RASCUNHO, `TEXTO_GESTO` em `disco/final.ts`)**. Nenhuma legenda, nenhuma fala. Os textos que falavam dos nove nos pontos e da D-Bee acionando a chuva saíram (`sugestoesDbee.ts`, `vinhetasXenom.ts`); os textos da missão em `portas.ts` também viraram só "convocar o povo" (RASCUNHO).

## Onde mora cada coisa

- `app/linha/disco/final.ts`: os momentos, os tempos, o texto do gesto e o estado ao vivo (`FINAL_VIVO`).
- `app/linha/disco/FinalTela.tsx`: o gesto, a CHUVA e o tempo de cada momento.
- `app/linha/estrada/FinalPovo.tsx`: o 3D do final (a plateia, a água) e a câmera. `FinalMultidao.tsx` é a ponte pra `Multidao`.
- `app/linha/estrada/Floresta.tsx`: a floresta e as plantas da Ella.
- `Corrida.tsx`: a câmera obedece `CAM_ROTEIRO` enquanto o final passa; a chuva aparece também no deserto durante o final.
- `parteTeste.ts`: os links (`final`, `final.<momento>`, `mundo.depois.floresta`).

**Desempenho:** nenhuma luz nova. Fora do final nada é montado. Por quadro: a câmera (6 números), a força da chuva e a frente da água ou da floresta. A plateia e o povo só existem nos momentos 1 e 2, e a água do momento 2 em diante. A cidade pelo caminho é aquecida aos poucos no momento 2 (`PERTO_EXTRA`).

## O que precisa do dono

1. O gesto: "tocar uma vez na tela" e o texto "convocar o povo".
2. A plateia usa corpos genéricos: os nove ainda não têm modelo próprio.
3. **A recompensa real** (T32) não está no jogo: a porta do final não dá nada dentro dele.
