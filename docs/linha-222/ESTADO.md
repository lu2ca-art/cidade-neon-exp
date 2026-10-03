# Linha 222: estado do trabalho (bookmark)

> **Qualquer Claude (nuvem ou Mac):** leia este arquivo primeiro. Quando um
> item andar, atualize aqui e na issue #22. No Mac, o bookmark geral fica em
> `~/vault/operacional/state.md` (o "AGUA" lê de lá).

Última atualização: 02/10/2026 (Mac).

## 02/10 no Mac — feito e NO AR (main)

| o quê | issue | commit |
|---|---|---|
| PR #21 mergeado (chegada, contato por ligação/texto/áudio, drift por finta…) | #22 | `cf03d76` |
| Missão estilo GTA: chegar na estação não freia sozinho ("descer aqui" por 8 s); o painel não pula pra tela cheia ("abrir no celular ›"); invasão do Núcleo não congela a estrada (motor limitado a 45%) | — | `327d170` |
| Carros brancos do Núcleo caçam a Kombi (a partir da 3ª missão, carregando o contrabando): PROCURADO + sirene; pego = a coisa volta pro lugar; despista abrindo 300 m ou trocando de rua | — | `d07a01f` |
| Arco de 3 atos nas missões: a crise (C2 da campanha) chega no painel quando pega a coisa; passo `chegar` = a virada só na estação | — | `f6dd22e` |
| 2 discos de domínio público (Climax Rag, Dippermouth Blues) + critério de licença mais rígido no script | #30 (parcial) | `6bca22f` |
| Ajustes: TOCA-DISCOS no cartão do som, app com som pausa o vinil e retoma, lint do feed, seletor do teste | #32 | `ae2fdda` |
| JARDIM (papel de parede, salvar imagem) e VIOLÃO (acordes, escalas, tocar junto, som Karplus-Strong) | #27, #26 | `8ac734f` |
| VIOLÃO simplificado: braço limpo, acorde → campo harmônico → 4 cadências com dica (+ tocar junto) | #26 | `3ae1066` |
| Kombi em 1ª pessoa na estrada (botão/tecla C): painel, volante, toca-discos girando, objetos pendurados no retrovisor | #23 (parte) | `3ae1066` |
| HUD limpa: ILHA DINÂMICA no topo (avisos, conversa e as opções da bifurcação, tudo na mesma ilha), guia de rota só da estrada à frente (sai o mapa inteiro), placa de aviso não aponta pra saída errada; RÁDIO e TOCA-DISCOS separados (nunca juntos; vinil é manual, dentro da Kombi, nunca interrompe) + tutorial; carros do Núcleo escapáveis; 1ª pessoa com olhar livre, passageiros e piloto automático | #23 (parte) | `27d4aed` |
| Kombi CONVERSÍVEL: sem teto e sem estrutura de metal (a cúpula de vidro ficou pesada); só um para-brisa baixo. De fora se vê quem viaja, de dentro a cidade inteira | — | `1f00ccf` |
| Botão de câmera em evidência (pílula ciano "1ª PESSOA" / "DE FORA", pulsa até a 1ª vez); a troca de câmera tem fade pro preto e um chiado de rádio quase inaudível | — | `8f6ff69` |
| Quiz NECTAR com animações do OriginKit: a pergunta sobe letra por letra, a resposta rasga em glitch | — | `d373d2a` |
| NARRATIVA, a espinha: o Núcleo governa separando, a música junta. Toda conversa ganhou o que o Núcleo tirou da pessoa, uma peça do "ontem" e o juramento de lutar com medo; a D-Bee conta "N de 9" no grupo; popups de polarização; saves antigos com missão em andamento migram sozinhos | — | `2494c7b` |
| VISUAL fase 1: lente de cinema (bloom, AgX, vinheta, grão, SMAA; cai pra leve sozinha se o aparelho engasgar), céu com nuvens baixas acesas pela cidade + lua + estrelas, janelas em escala real, luz de aviação piscando nos prédios altos | — | `ebfa8bf` |
| LINHA 9: o monotrilho do Núcleo. Elevado à esquerda do circuito principal nas 9 estações (para em cada uma, plataforma branca), mergulha num portal do Núcleo antes das saídas e some por baixo da cidade até reaparecer antes da 1ª estação. Automático, em loop | — | `d999799` |
| MISSÕES POR ÁREA (sem corrente): a 1ª conversa é o GRUPO 222 (a resistência discutindo; quem chega só lê) → D-Bee no privado (quiz) → LU2CA chama pro VIOLÃO (1ª missão de todo mundo, debaixo da plataforma da Linha 9; ensina recompensa que se usa). Depois quem mora em cada área chama quando você entra nela, em qualquer ordem. Bolinhas do topo = guia da missão; placas e ilha da bifurcação com etiqueta "MISSÃO · nomes" da área. 222 = rádio, LINHA 9 = metrô. Final quando as 6 estiverem feitas. Confissão do LU2CA saiu da 1ª missão (vai pro ep. 16/10) | — | (este merge) |

**#30 continua aberta:** com o critério certo (gravação ≤ 1925 confirmada,
nada de "PDP-CH" suíço sem data, nada de MIDI) o Wikimedia só rendeu 2. Próxima
fonte a tentar: Internet Archive / Great 78 Project (datas de gravação nos
metadados), sempre conferindo compositor morto antes de 1956.

## Onde está o código

- Tudo na **`main`** (= lu2ca.art). O PR #21 foi mergeado em 02/10.
  Build da Vercel passou. Preview do último commit:
  https://v0-ip-hone-call-simulation-dji0h5ez9.vercel.app/linha (abrir em aba
  anônima, porque com save a abertura é pulada).
- Pendências organizadas no GitHub: **issue #22** (painel central) e as
  sub-issues **#23 a #33**.

Pra continuar no Mac:

```bash
git fetch origin
git checkout feature/game/chegada-cidade
git pull origin feature/game/chegada-cidade
bun install && bun run dev   # http://localhost:3000/linha
```

## O que foi feito (tudo no PR #21)

| tema | o que ficou | arquivos |
|---|---|---|
| Chegada na cidade | 1ª vez sem celular: Kombi rodando sozinha (modo cinema) ouvindo vinil, depois o rádio liga sozinho e procura a 222, o Núcleo entra com anúncios, "conteúdo removido", tudo fica P&B, a Kombi estaciona e a D-Bee chama no N3XO. Tem "pular ›" | `app/linha/chegada.tsx`, `estrada/Corrida.tsx` (prop `cinema`, `cinza`) |
| Música como recompensa | Fundo = vinis de domínio público, que não param (nem com o celular aberto). Música do LU2CA só entra quando a missão é cumprida, com estreia do locutor. Nada liberado por data de lançamento | `app/linha/radio.ts`, `vinis.json`, `programa.ts` |
| Pegar a Kombi = aceitar | Sem segunda confirmação. Destino da estação e "descer aqui" corrigidos durante a busca | `Corrida.tsx`, `page.tsx` |
| Drift | Sem botão: é a finta (peso carregado num lado + virada brusca acima de ~72 km/h). As 4 rodas derrapam; segurar sustenta, contraesterçar fecha, contraesterçar forte faz pêndulo, soltar endireita. Marcas de pneu e rodas da frente esterçando. Calibrado pelos 2 prints do Horizon Drive | `Corrida.tsx` (`VDRIFT`, `PESO_FINTA`, `DERIVA_MAX`) |
| Kombi nova | Perfil extrudado com silhueta de Kombi, V creme no nariz, pneu faixa branca. **Aprovada** ("bem melhor!!!") | `estrada/Kombi222.tsx` |
| Som e vibração | Motor virou murmúrio grave e baixo. Vibração leve ao acelerar, mais forte com a velocidade (só Android) | `som-carro.ts` |
| N3XO dirigindo | A conversa roda no painel da tela da Kombi: responde tocando (ou teclas 1–4). Tela cheia só pra prova, digitar, objeto e revelação, e é a mesma conversa que sobe | `chat.tsx` (`modo="painel"`), `page.tsx` |
| Nota de voz | Canal separado: a música abaixa pra 12% e volta | `som.ts` (`voz`, `player.abaixar`) |
| Vídeo do //LOOP | Chega como notificação na conversa e abre o feed no vídeo (`?v=id`) | `chat.tsx`, `app/tiktok/feed/page.tsx` |
| Ligação de voz | Toca, atende, a pessoa fala com legenda, e nas perguntas o microfone escuta e entende a opção dita. **Sempre** com botões de reserva (sem permissão, sem suporte ou sem entender) | `ligacao.tsx`, `ligacoes.ts` |
| Intercalar o contato | Cada pessoa entra em contato de um jeito (ligação, texto no painel ou só áudios), sorteado, nunca igual ao anterior. A D-Bee abre com ligação. O mesmo roteiro vira cada modo | `ligacoes.ts` (`sortearModo`, `ligacaoDaMissao`), `chat.tsx` (`jeito`) |

Testado com Playwright (Chromium headless) de ponta a ponta. `tsc` e
`eslint app/linha` estão limpos.

## O que falta (ver issue #22)

**Esperando o LU2CA:**
- **#25 Caderno:** mandar **fotos dos cadernos** pra transcrever. Conteúdo real, nada inventado.
- **#24 Vozes:** a proposta é ElevenLabs (Voice Design + modelo v3). Precisa de conta, chave da API como segredo do ambiente, liberar `api.elevenlabs.io` na rede e uma personalidade por personagem. Falas com o nome do jogador: proposta é tirar o nome na versão falada.
- **#23 Interior da Kombi em 1ª pessoa** (toca-discos, escolher disco, ler livros). Três perguntas em aberto: celular por cima ou explorar primeiro? Quais discos? Quais livros?
- **#29 Comprar o disco** (Untitled) e ele aparecer na Kombi: como confirmar a compra.
- **#28 Recurso de cada missão:** decidir Copo, DopaminA e Sexta-Feira (Chuva = jardim, Sabe Ontem? = caderno, Nectar = violão).
- **#31 Direção:** controles do celular estilo Horizon (◀ ▶ + freio + pedal)? E mandar ~20s de vídeo do Horizon pra calibrar o drift.
- **#33 Modelo 3D (opcional):** `.glb` com licença, se quiser; apagar o `public/models/van.glb`?

**Dá pra fazer sem ninguém:**
- **#26 Violão completo** (escalas e acordes, liberado pelo Nectar).
- **#27 Jardim** (regar, flores, vira papel de parede, liberado pela Chuva).
- **#32 Ajustes:** `fluxo.mjs` com seletor antigo `.l-hud-sair`, LOOP pausa o vinil, rótulo "toca-discos", lint antigo no feed, testes com microfone real e iPhone.

**Travado por rede:**
- **#30 ~20 faixas de domínio público:** o script está pronto (`bun scripts/vinis/baixar.mjs --ver`, depois sem `--ver`; precisa de ffmpeg). No Mac deve funcionar direto.

**Depois de testar o preview:** mergear o PR #21 e apagar a branch (política do repo).

## Decisões e preferências do LU2CA (não perder)

- Sempre **"O Vila"**, nunca "a Vila" (Vila Los Muertos de Fome).
- Textos: minúsculas, gíria de SP, seco, nunca didático (regra dos roteiros).
- **Som do carro:** só o motor, baixinho, sem pneu, chiado ou vento. "Paz no som", porque já tem muita música e áudio.
- **Música do LU2CA só como recompensa** de missão, espaçada. O fundo é vinil.
- "The St. Louis Blues" (W. C. Handy) **fica**, por decisão do LU2CA, mesmo só ficando livre no Brasil em 2029.
- **Tela cheia só quando precisa.** O resto acontece dirigindo.
- **Contato intercalado** (ligação / texto / áudio), aleatório.
- **Microfone:** pede permissão; se não quiser ou não funcionar, tem os botões.
- Vozes: "a solução mais foda, não a mais rápida".
- Horizon Drive (Shopify) é a referência máxima da direção.
- Trabalho sempre em feature branch (push no `main` = deploy em lu2ca.art).
- O LU2CA quer que **nada pedido se perca**: tudo pendente vai pra issue #22.
