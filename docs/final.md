# O final (T29): a base das ações, dentro do jogo

Feito em 05/11/2026, no ramo `feature/game/final`. Regra do dono: **a cena do diálogo é vídeo de IA, e a base das ações fica dentro do jogo.** Nada aqui inventa lugar ou personagem: tudo vem de `lista-mestra.md` (T29), `retomar-mundo.md` ("Os nove pontos", "O protocolo CHUVA", "O final", "A memória da Kombi") e `bloco1-missoes.md` (linha 13).

## Como destrava e onde começa

- **Destrava** pela regra que já existia (`disco/portas.ts`, `MISSOES13.final.requer`): as 11 missões dos 9 episódios feitas (`dbee`, `oficina`, `notti`, `quadra`, `mubarak`, `tony`, `drew`, `tuneis`, `ella`, `nizzy`, `lu2ca`). Desde 09/11 o Xeriff não conta: ele é livre (`LIVRES`). Só entram missões, não os marcos dos episódios (a fuga, o show): o save antigo não tem marco, e quem joga agora passa por eles antes da última missão. Aí o final aparece no mapa como as outras missões.
- **Começa na casa da D-Bee**, o lugar que o final já tinha (`lugar: { chao: "casa" }`). Chegou lá com o final pegado: a sequência começa (`page.tsx`, `chegouNaMissao` → `abrirFinal`).
- **Acaba:** as duas peças do final ficam feitas e a porta "o mundo depois" abre ali mesmo (desde 06/11 ela existe: `docs/mundo-depois.md`). Depois do final, o quintal da D-Bee fica com o mato para sempre, e a Kombi do jogador termina estacionada no quintal (revisão 3: é ela mesma, não existe cópia; o Corrida.tsx põe ela lá na despedida).

## A sequência

O jogo fica atrás o tempo todo, com as faixas de cinema e sem tela preta. Tocar na tela passa para o próximo momento.

| # | Momento | Jogo ou vídeo | O que se vê | Tempo | Link |
|---|---|---|---|---|---|
| 1 | O sinal | jogo | a câmera gira devagar em volta da casa da D-Bee, com a música CHUVA começando (decisão do dono, 09/11) | 8 s | `?parte=final` ou `?parte=final.sinal` |
| 2 | Os nove | jogo | um corte por pessoa: cada um de pé na beira da pista da sua música; a câmera chega devagar e sobe o olhar para o monumento | 2,6 s × 9 | `?parte=final.nove` |
| 3 | O CHUVA | jogo | lá do alto, em volta da torre central: os nove fachos acendem juntos e a chuva toma a cidade (a mesma chuva da rua CHUVA, até a força máxima dela) | 15 s | `?parte=final.chuva` |
| 4 | A despedida do Criador | **vídeo** | o filme (o gancho `final-despedida`). Hoje toca o provisório: as legendas sobre a casa na chuva, com a câmera chegando devagar | ~32 s | `?parte=final.criador` |
| 5 | O quintal | jogo | atrás da casa: a Kombi no quintal, o mato voltando no deserto em volta (cresce de perto para longe) e a chuva indo embora | 14 s | `?parte=final.quintal` |

**Os nove e os pontos (decisão do dono, 09/11).** Os nove são os 9 donos das músicas, um por episódio, na ordem da sequência (`NOVE` lê direto de `EPISODIOS`): D-Bee (Nectar), Mubarak (DopaminA), Alohan (Copo Americano), Nizzy (Ojalá), Tony Gordo (Swav), Drew (Sexta-Feira), Ella (Sabe Ontem?), Notti (Rollercoaster) e LU2CA (CHUVA). O ponto de cada um é o da missão na pista da sua música (`missao:<faixa>`). O Xeriff saiu do final e segue no jogo como missão livre.

## As falas provisórias

Nos momentos de jogo, só ação (regra de ouro 6: o final não é explicado em diálogo):

- O sinal: "a D-Bee toca. a música dela é o sinal" (**RASCUNHO**: é proposta no `retomar-mundo.md`; aparece marcado na tela). Desde 09/11 a música do sinal é a CHUVA, então essa legenda ficou desatualizada; ela não foi trocada porque as falas do final ainda serão decididas.
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
- `app/linha/disco/FinalTela.tsx`: a tela (os tempos de cada momento, a legenda, o filme) e a CHUVA, presa à tela inteira, do sinal ao fim.
- `app/linha/estrada/FinalNove.tsx`: o 3D (as nove pessoas, os fachos e o mato; `QUINTAL_FINAL` é onde a Kombi do jogador estaciona) e a câmera de cada momento.
- `Corrida.tsx`: a câmera obedece `CAM_ROTEIRO` enquanto o final passa; a chuva aparece também no deserto durante o final.
- `portas.ts`: as duas peças do final viraram `{ t: "final" }`.
- `parteTeste.ts`: os 6 links.

**Desempenho:** nenhuma luz nova. Por quadro, só a câmera (6 números) e a força da chuva. As pessoas e os fachos são 2 malhas instanciadas, que só existem nos momentos 2 e 3. O mato é 1 instanciada (só com a câmera perto da casa). A Kombi do quintal é a do jogador (sem desenho a mais).

## O que precisa do dono

1. **As falas da despedida** (as duas linhas RASCUNHO) e o ok nas legendas de ação.
2. **O vídeo da despedida** (Kling, T70), no caminho acima.
3. **O sinal:** decidido em 09/11: a música do sinal que chama os nove é a CHUVA (a completa, `SOM_SINAL_FINAL` em `disco/sons.ts`), no lugar da música da D-Bee. Ela começa no "sinal" e vai sem parar até o fim do final, passando pela despedida e pelo quintal, sem reiniciar nem cortar entre os momentos. A música de antes só volta quando o final acaba. Falta o dono dizer o que a legenda do sinal passa a dizer.
4. **Quem chama os nove:** ainda não decidido. A D-Bee agora é uma das nove, mas as falas e o texto da missão (`quem: "os nove e a D-Bee"`, "a D-Bee chegando pra acionar o CHUVA") seguem como antes até o dono decidir.
5. **O som:** decidido em 09/11: a CHUVA do sinal até o fim (item 3). A sequência dura cerca de 92 s e a faixa tem 3 min 10, então ela não acaba antes. O filme da despedida está com `semSom`: quando o vídeo entrar, ele não cala a CHUVA, e o som próprio dele (se tiver) toca junto.
6. **"O mundo depois"** existe desde 06/11 (versão mínima): as plantas nos prédios, as cabines nas torres e o rio nas trincheiras. Ver `docs/mundo-depois.md`.
7. **Os modelos:** as nove pessoas são cápsulas na cor da missão, e o mato são cones verdes, até os modelos do Tripo chegarem.
8. **A recompensa real** (T32: a senha do untitled e o ingresso) não está no jogo: a porta do final não dá nada dentro dele.
