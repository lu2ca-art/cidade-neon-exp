# O final (T29): a base das ações, dentro do jogo

Feito em 05/11/2026, no ramo `feature/game/final`. Regra do dono: **a cena do diálogo é vídeo de IA, e a base das ações fica dentro do jogo.** Nada aqui inventa lugar ou personagem: tudo vem de `lista-mestra.md` (T29), `retomar-mundo.md` ("Os nove pontos", "O protocolo CHUVA", "O final", "A memória da Kombi") e `bloco1-missoes.md` (linha 13).

## Como destrava e onde começa

- **Destrava** pela regra que já existia (`disco/portas.ts`, `MISSOES13.final.requer`): as 10 missões da feira feitas (Alohan, túneis, Drew, Mubarak, Xeriff, LU2CA, Ella, Notti, Nizzy, Tony). A D-Bee e a oficina são o começo. Aí o final aparece no mapa como as outras missões.
- **Começa na casa da D-Bee**, o lugar que o final já tinha (`lugar: { chao: "casa" }`). Chegou lá com o final pegado: a sequência começa (`page.tsx`, `chegouNaMissao` → `abrirFinal`).
- **Acaba:** as duas peças do final ficam feitas e a porta "o mundo depois" abre ali mesmo (desde 06/11 ela existe: `docs/mundo-depois.md`). Depois do final, o quintal da D-Bee fica com o mato para sempre, e a Kombi do jogador termina estacionada no quintal (revisão 3: é ela mesma, não existe cópia; o Corrida.tsx põe ela lá na despedida).

## A sequência

O jogo fica atrás o tempo todo, com as faixas de cinema e sem tela preta. Tocar na tela passa para o próximo momento.

| # | Momento | Jogo ou vídeo | O que se vê | Tempo | Link |
|---|---|---|---|---|---|
| 1 | O sinal | jogo | a câmera gira devagar em volta da casa da D-Bee | 8 s | `?parte=final` ou `?parte=final.sinal` |
| 2 | Os nove | jogo | um corte por pessoa: cada um de pé na beira da pista da sua faixa, embaixo do monumento dela; a câmera chega devagar e sobe o olhar para o monumento | 2,6 s × 9 | `?parte=final.nove` |
| 3 | O CHUVA | jogo | lá do alto, em volta da torre central: os nove fachos acendem juntos até os monumentos e a chuva toma a cidade (a mesma chuva da rua CHUVA, até a força máxima dela) | 15 s | `?parte=final.chuva` |
| 4 | A despedida do Criador | **vídeo** | o filme (o gancho `final-despedida`). Hoje toca o provisório: as legendas sobre a casa na chuva, com a câmera chegando devagar | ~32 s | `?parte=final.criador` |
| 5 | O quintal | jogo | atrás da casa: a Kombi no quintal, o mato voltando no deserto em volta (cresce de perto para longe) e a chuva indo embora | 14 s | `?parte=final.quintal` |

**Os nove e os pontos.** Cada um fica no ponto da sua missão, como diz o `retomar-mundo.md` ("cada missão deixa um dos nove personagens num ponto estratégico do mapa"). No jogo, o ponto é o monumento da faixa da pessoa: Ella (CHUVA), Mubarak (Copo Americano), Notti (DopaminA), Drew (Sexta-Feira), Alohan (Sabe Ontem?), LU2CA (Nectar), Tony Gordo (Swav) e Nizzy (Rollercoaster). O Xeriff não tem faixa, então fica no lugar da missão dele (a estação 6 da Linha 9).

## As falas provisórias

Nos momentos de jogo, só ação (regra de ouro 6: o final não é explicado em diálogo):

- O sinal: "a D-Bee toca. a música dela é o sinal" (**RASCUNHO**: é proposta no `retomar-mundo.md`; aparece marcado na tela).
- Os nove: o nome de quem está na tela + "nove pontos. nove pessoas. o mesmo sinal".
- O CHUVA: "o CHUVA. a água volta pro curso dela".
- O quintal: "a kombi no quintal da D-Bee. o deserto, verde" e "ela fica. a ponte entre robôs e humanos".

O filme da despedida (`disco/final.ts`, `FILME_DESPEDIDA`). As ações vêm dos docs; as falas não existem em lugar nenhum, então ficam como RASCUNHO:

1. (ação) "dessa vez ele se despede. e sabe do que se trata"
2. **RASCUNHO:** a fala do Criador (o dono escreve). Ele não promete que volta.
3. **RASCUNHO:** a resposta da D-Bee (o dono escreve).
4. (ação) "a primeira partida foi um sumiço. a segunda é um adeus"
5. (ação) "ela não vai com ele. fica, cuidando do mundo novo"
6. (ação) "ele parte pra outro espaço-tempo"

**Onde entra o vídeo:** `FILME_DESPEDIDA.video = "/cenas/final-despedida.mp4"` (o arquivo em `public/cenas/`). Com o vídeo, o mesmo gancho passa a tocá-lo; se não carregar, volta para o provisório.

## Onde mora cada coisa

- `app/linha/disco/final.ts`: os momentos, os tempos, os nove, as legendas, o filme da despedida, a câmera roteirizada (`CAM_ROTEIRO`) e o estado ao vivo. **Tudo o que é rascunho está aqui, num lugar só.**
- `app/linha/disco/FinalTela.tsx`: a tela (os tempos de cada momento, a legenda, o filme).
- `app/linha/estrada/FinalNove.tsx`: o 3D (as nove pessoas, os fachos e o mato; `QUINTAL_FINAL` é onde a Kombi do jogador estaciona) e a câmera de cada momento.
- `Corrida.tsx`: a câmera obedece `CAM_ROTEIRO` enquanto o final passa; a chuva aparece também no deserto durante o final.
- `portas.ts`: as duas peças do final viraram `{ t: "final" }`.
- `parteTeste.ts`: os 6 links.

**Desempenho:** nenhuma luz nova. Por quadro, só a câmera (6 números) e a força da chuva. As pessoas e os fachos são 2 malhas instanciadas, que só existem nos momentos 2 e 3. O mato é 1 instanciada (só com a câmera perto da casa). A Kombi do quintal é a do jogador (sem desenho a mais).

## O que precisa do dono

1. **As falas da despedida** (as duas linhas RASCUNHO) e o ok nas legendas de ação.
2. **O vídeo da despedida** (Kling, T70), no caminho acima.
3. **O sinal:** a música da D-Bee como sinal dos nove é proposta. Qual música, e se é ela mesma.
4. **O ponto do Xeriff:** ele não tem faixa. Hoje fica na estação 6 da Linha 9, onde é a missão dele.
5. **O som:** hoje a sequência não troca a música. Falta decidir o que toca em cada momento (a música da D-Bee no sinal, a CHUVA no CHUVA?).
6. **"O mundo depois"** existe desde 06/11 (versão mínima): as plantas nos prédios, as cabines nas torres e o rio nas trincheiras. Ver `docs/mundo-depois.md`.
7. **Os modelos:** as nove pessoas são cápsulas na cor da missão, e o mato são cones verdes, até os modelos do Tripo chegarem.
8. **A recompensa real** (T32: a senha do untitled e o ingresso) não está no jogo: a porta do final não dá nada dentro dele.
