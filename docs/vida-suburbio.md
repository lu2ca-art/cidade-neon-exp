# A vida nas ruínas do subúrbio (05/11)

Bíblia §4: "o subúrbio é exponencial, é onde rola toda a vida". As ruínas já
tinham prédios, colisão e as luzes da noite (`docs/blender/noite-0511.md`). Agora
tem gente, bicho, roupa no varal e fumaça. Tudo fica dentro do `<Perto>` das ruínas.

## O que tem

| coisa | como | quantos (alto / médio / leve) |
|---|---|---|
| **gente andando** | pelas calçadas das ruas das ruínas (a ~4 m do eixo), atravessa nos cruzamentos e sorteia a próxima rua | 70 / 52 / 26 |
| **rodas no fogo** | 2 a 4 pessoas em volta de um tambor de fogo, conversando (gesticulam, metade com as mãos pro fogo) | 10 / 8 / 4 tambores |
| **porta do bar** | rodinhas de 2 a 4 na calçada da frente do O COPO | 10 / 8 / 6 pessoas |
| **palco** | dançando na frente do tablado, no tempo da rádio | 12 / 9 / 6 |
| **gatos e cachorros** | andam nas mesmas ruas, mais perto da parede; o gato com o rabo em pé, o cachorro abanando | 8 / 6 / 3 |
| **roupa no varal** | camiseta, toalha, calça, lençol e meia penduradas nos varais de luz mais perto do bar, balançando no vento | 22 / 14 / 6 varais |
| **fumaça** | sobe dos tambores de fogo, só de noite | 3 / 2 / 1 por tambor, em até 41 / 24 / 12 tambores |

### As pessoas
- **Silhueta:** 6 caixas (pernas, tronco, braços, cabeça), 72 triângulos, no estilo do jogo. A largura e a altura mudam um pouco de um pra outro.
- **Cores do subúrbio:** roupas em neon gasto e escuros, calças jeans e escuras, 5 tons de pele, cabelos escuros e uns coloridos. Sapato, mão e cabelo são cortes de cor no shader (sem triângulo a mais).
- **Animação toda no vertex shader**, sem esqueleto:
  - andando: pernas e braços no passo, um pulinho a cada passo;
  - conversando: um braço gesticula de vez em quando, a cabeça concorda, o corpo balança;
  - dançando: metade com os braços pra cima, metade bombeando; o corpo pula na batida.
- **O BPM da rádio:** os graves da rádio (`player.grave()`, o mesmo que faz as luzes da cidade pulsarem) passam da média = uma batida. O tempo entre batidas vira o período (entre 0,3 e 1 s). Sem música, um passo calmo de 120 bpm. Só lê os graves com a câmera a menos de 180 m do palco.
- **Calor sem luz:** quem está no fogo fica laranja na frente; quem está no bar pega o amarelo da porta; o palco, um pouco de cor. É emissivo somado no shader, e só de noite.

### Por onde andam
`vidaNasRuas.ts` monta a grade de ruas uma vez:
- os eixos das ruas ficam em x = -948 + 52·i e z = -732 + 52·j (o traçado das ruínas);
- cada trecho entre dois cruzamentos tem duas calçadas;
- uma calçada só vale se nenhum ponto dela (de 3 em 3 m) cai em pista ou torre (`M.livre`), numa caixa de colisão das ruínas ou num lugar do chão (bar, oficina, palco, quadra, a rampa do túnel, torre, goteira);
- cruzamento com pilar de pista ou lugar no meio fica fora.

Ninguém atravessa prédio: são segmentos de reta numa grade que já é livre.

### Abrir caminho (sem física)
- **Quem anda:** com o jogador a menos de 3 m e na frente dele, a pessoa para (até 2,5 s; depois segue) e dá um passo de lado, pro lado contrário do jogador (até 2 m).
- **Quem está parado:** recua até 1 m.
- **Onde está o jogador:** sem mexer no `Corrida.tsx`, a posição é estimada pela câmera. A câmera olha pro jogador, então vale o ponto onde o olhar cruza o chão + 1 m, entre 2,5 e 10 m à frente dela.
- **Posição exata:** quem quiser dar a posição de verdade escreve em `VIDA_JOGADOR` (`VidaSuburbio.tsx`: x, z e até quando vale).

### A corrida de rua
- Durante a contagem e a corrida (`RUA.e.fase`), quem está a menos de 8,5 m da linha do meio do traçado some encolhendo (meio segundo). Isso vale pra quem anda, quem está parado e os bichos.
- Quem anda não entra nas ruas do traçado enquanto a corrida durar.
- A marca do traçado é uma grade de 4 m feita uma vez, a partir de `VOLTA_RUA`. Durante a corrida, custa uma leitura por pessoa.

### Dia e noite
Segue `U.noite`, o mesmo número que acende as ruínas:
- **De dia:** todo mundo que anda está na rua, mais uns poucos no bar (40%) e no palco (25%).
- **De noite:** quase dois terços de quem anda vai pra casa. As rodas no fogo acendem, o bar enche e o palco lota.
- **A troca:** cada um tem a sua hora (pela semente), então ela acontece aos poucos, entre 17 h e 19 h.
- **Longe da câmera:** a troca de turno só acontece a mais de 40 m dela, então ninguém some na cara do jogador.
- **A fumaça** só existe de noite (`visible = false` de dia).

## Custo estimado
Estimativa pelo código, não medida (regra: só `tsc`).

| | triângulos | draw calls |
|---|---|---|
| gente (~75–80 na tela de dia ou de noite; teto 122) | 72 cada: ~5.600, teto ~8.800 | 1 |
| bichos | 84 cada: 672 | 1 |
| roupas (~150 peças) | 4 cada: ~600 | 1 |
| fumaça (123 quadrados) | 2 cada: 246 | 1 (só de noite) |
| **total no alto** | **~7.100 típico, ~10.300 no teto** | **4 de noite, 3 de dia** |
| **total no leve** | **~3.900** (50 pessoas, 3 bichos, ~50 roupas, 12 fumaças) | **4 / 3** |

- **Na CPU:** um `useFrame` só. Por quadro:
  - anda ~130 coisas (gente e bichos) no seu segmento, com conta simples;
  - escreve a matriz e um vec4 de quem aparece (~10 KB pra GPU, só o pedaço usado: `addUpdateRange`);
  - lê os graves da rádio uma vez, e só perto do palco.

  Quem está escondido nem é desenhado (a contagem da malha encolhe).
- **Longe** (câmera a mais de 520 m do centro do subúrbio): `visible = false` e nada anda. Mais longe que 960 m, o `<Perto>` desmonta tudo.
- **Sem luz nova e sem sombra.** Material Lambert (as luzes que já existem) nas pessoas, bichos e roupas. A fumaça é ShaderMaterial com mistura normal, sem escrever profundidade.
- **Na montagem** (uma vez):
  - a grade de ruas: ~50 trechos × 2 calçadas × ~15 pontos, cada um conferido em `M.livre`, nas caixas e nos lugares;
  - a grade da corrida: ~800 pontos carimbando a vizinhança.

## Arquivos
- `app/linha/estrada/vidaNasRuas.ts`: a lógica (as ruas, quem anda, quem para, abrir caminho, a corrida, dia e noite, o quanto por qualidade).
- `app/linha/estrada/VidaSuburbio.tsx`: a gente (a malha, o shader e o `useFrame` de toda a vida).
- `app/linha/estrada/VidaMiuda.tsx`: os bichos, as roupas e a fumaça (só construtores).
- `app/linha/estrada/RuinasSuburbio.tsx`: 2 linhas (o import e o `<VidaSuburbio M luzes />`).

## Pra conferir no jogo (Mesa)
- **A escala** das pessoas ao lado da moto e dos patins (1,75 m).
- **Abrir caminho:** a estimativa pela câmera pode errar uns metros (câmera de drone, cinema). Se ficar ruim, dá pra passar a posição de verdade em `VIDA_JOGADOR`, com 1 linha no `Corrida.tsx`.
- **O relevo:** na calçada, a altura vem do chão de 3 em 3 m; na travessia, é uma reta entre as duas esquinas. Onde a duna inclina muito, um pé pode afundar um pouco.
- **A dança:** se os graves da rádio no subúrbio (com o filtro de rádio antiga) dão batida clara. Os limiares (0,18 e 1,15× a média) ficam no `useFrame`.
- **A roupa no varal de luz:** fica a 5–6,5 m, entre as lâmpadas.
- **De dia, a rua cheia:** se 70 é muito ou pouco (`QUANTO` em `vidaNasRuas.ts`).
