# A trilha de pedras

O tutorial vivo do jogo (nota do dono, 03/11, 16:09: "uma trilha de pedras feita pra seguir e não errar o caminho").

- **Uma pedra por vez, nunca duas.** É um balão pequeno preso na coisa de verdade, com uma setinha. A coisa pulsa de leve.
- **Sem tela preta e sem fundo escurecido.** Nada bloqueia o toque.
- **A pedra some quando o jogador faz a ação.** Não existe botão "ok".
- **O "?" do notch é a própria trilha.** Tocar nele mostra de novo a pedra de agora. As setas ‹ › voltam nas que já passaram, uma por vez.
- **O que liberou brilha no mapa.** Não existe mais a tela "a porta abriu". As missões novas e o lugar da missão que acabou brilham no minimapa e no drone. O nome curto passa no notch.

## Onde mora

| o quê | arquivo |
|---|---|
| o roteiro (a lista em ordem, as condições, os textos) | `app/linha/disco/trilhaPedras.ts` |
| o balão na tela e o "?" | `app/linha/disco/TrilhaPedrasTela.tsx` |
| os ícones animados (`iconeDaPedra(id)`) | `app/linha/disco/iconesPedras.tsx` |
| o estilo (balão, pulso, ícones) | `app/linha/disco/trilhaPedras.css` |
| o que liberou brilhando no mapa | `app/linha/disco/brilho.ts` (lido por `estrada/Mapa.tsx` e `estrada/Drone.tsx`) |
| o progresso | no save, em `historia.tutorial` (os mesmos ids do tutorial antigo) |

## As pedras, em ordem

A trilha sempre mostra a **primeira** pedra da lista que cumpre quatro coisas:
- ainda não foi feita;
- vale na fase de agora;
- as pedras de "depois de" já foram feitas;
- a condição dela está valendo agora.

| # | pedra | fase | aparece quando | âncora (onde o balão fica) | texto | conta como feita quando | ícone |
|---|---|---|---|---|---|---|---|
| 1 | `mapa` | do deserto em diante | saiu da casa da D-Bee com o holo, na rua | o mapa (o minimapa balança) | toca no mapa | o drone sobe | dedo tocando |
| 2 | `rota` | do deserto em diante, depois de 1 | o drone está no alto | o botão "voltar pra rua" do drone | viu a linha? volta pra rua | voltou pra rua | seta seguindo a linha |
| 3 | `gps` | deserto, depois de 2 | na rua | o notch (respira) | ícone no meio: acelera | 1 s andando com o ícone no meio | bolinha indo pro meio da barra |
| 4 | `drift` | deserto, depois de 1 | na rua | sem âncora (balão embaixo, no meio) | vira forte e solta: drift (no celular: toca fora, vira dentro: drift) | 0,7 s de drift | Kombi derrapando |
| 5 | `anel` | do deserto em diante, depois de 2 | na rua, com o anel na tela | o anel (o ícone da missão pisca) | o anel: o próximo passo | tocou no anel ou no mapa | anel girando + dedo |
| 6 | `ajuda` | do deserto em diante, depois de 5 | na rua | o "?" do notch | esqueceu? toca no ? | tocou no "?" | ? pulando |
| 7 | `voo` | subida, néctar, carreira | com o botão do propulsor na tela | o propulsor | segura: a Kombi voa | 0,9 s no ar com o propulsor | Kombi subindo com fogo |
| 8 | `turbo` | subida, néctar, carreira (a primeira vez na cidade) | com o botão do turbo na tela | o turbo | turbo cheio: toca (vazio: drift e voo enchem o turbo) | o turbo disparou | raio + barra enchendo |
| 9 | `pousa` | subida, depois de 7 | na rua/no ar | o notch | pousa numa pista acesa | voou e pousou | Kombi pousando |
| 10 | `escolhe` | carreira | sem missão e com missão pra pegar | o anel; com o drone, o botão "as missões"; com a lista aberta, o primeiro "pegar" (o ícone da missão pisca) | escolhe a missão | pegou uma missão | pino pulando entre pontos |
| 11 | `linha` | carreira | com missão, a mais de 60 m | o notch (onde moram a distância e a seta) | segue a linha até lá | chegou 150 m mais perto (ou chegou) | seta seguindo a linha |
| 12 | `chegou` | carreira | com missão, a 60 m ou menos (ou o guia dando a dica do lugar) | o botão "sair da Kombi" (senão, o notch) | chegou: desce aqui | desceu, a missão andou um passo, ou foi embora (mais de 250 m) | pino + seta descendo |
| 13 | `liberou` | carreira | a primeira missão da cidade foi feita | o mapa (o mapa balança; o que abriu brilha nele) | abriu coisa nova: olha | o drone sobe | cadeado abrindo |
| 14 | `radio` | carreira, depois de 13 | com a rádio na tela | o holograma da rádio | toca: o menu da rádio | tocou na rádio | ondas do rádio |
| 15 | `salvar` | carreira e néctar, depois de 13 | com o "♥ salvar" na tela (a faixa tem link) | o ♥ salvar | curtiu? ♥ salva a música | tocou no ♥ | coração batendo |
| 16 | `veiculo` | carreira | sem a Kombi, com um veículo pra pegar (depois da perseguição) | o botão de pegar o veículo | pega um veículo | pegou | rodas girando |

**Quem já passou não vê de novo.** Um save que já tem missão da cidade feita pula estas pedras: 1, 2, 5, 6, 10, 11 e 12. A pedra 13 é pulada a partir da segunda missão. As pedras puladas entram no save como vistas, e o "?" também passa por elas.

## Depois de cada missão da cidade (o que entrou no lugar da tela "a porta abriu")

1. **No minimapa:** as missões novas e o lugar da que acabou ganham um anel pulsando por 30 s. Se estiverem fora do círculo, ficam presas na borda.
2. **No drone:** os feixes delas ficam mais altos.
3. **No notch:** passa "abriu · (o primeiro item) +n" e depois "+N neon$".
4. **A música:** o "ouvir até o fim" pequeno, no canto, aparece uns segundos depois. Isso só vale para as missões da cidade que têm faixa.

## Pra mexer

- **Textos, ordem e condições:** em `PEDRAS` (`trilhaPedras.ts`). Tirar uma linha tira a pedra.
- **Números** (tempo do drift, do voo, distâncias, tempo do ✓): em `TRILHA_CFG`.
- **Ícones gerados:** coloque o arquivo em `public/trilha/` e o caminho em `ICONES_GERADOS` (`iconesPedras.tsx`).
- **Tempo do brilho no mapa:** em `BRILHO_CFG` (`brilho.ts`).
