# Os lugares do chão do subúrbio (06/11)

Bíblia §4 e §6: o subúrbio é o mundo aberto; tudo visitável desde o começo, o
trancado com cadeado e o que libera, nada de menu, os pontos longe um do outro e
visíveis no mapa. Posições em `app/linha/disco/historia.ts` (CHAO_LUGARES); o que
cada um abre em `app/linha/disco/abertos.ts` (ENTRADAS).

Como abre (o padrão do bar): a Kombi (ou os patins) chega a 22 m do ponto → a
Corrida avisa `chao:<id>` (sem parar a Kombi) → aparece o botão
**"entrar · <lugar>"** por 8 s (com cadeado e "· ver" se trancado). Entrou: a
página pronta abre POR CIMA do jogo (AppJanela, o iframe que o celular já usa;
a corrida pausa e, no "sair" da página, volta na estrada onde estava) ou o app
do celular (loja, jardim), que no "voltar" também volta pra estrada. No mapa:
ícone "chão" com a cor e o nome, a partir da fase da oficina (antes, só o bar).

| Item da bíblia | Antes (06/11) | Agora | Onde (x, z) | Como abre |
|---|---|---|---|---|
| Corridas | existia: a corrida de rua (largada na reta do bar, no mapa depois de chegar lá) e as trincheiras (boca do túnel) | igual | largada `PORTOES_RUA[0]`; túneis -610, -830 | passar na largada / descer a rampa |
| Discos (comprar) | só no celular (app LOJA) | **novo: DISCOS** (fachada + vinil gigante) | -760, -470 | LOJA na aba discos; trancada (cadeado) até a missão do Mubarak |
| Shows | existia o PALCO no chão, mas só abria nas missões | **o palco agora abre a casa de shows** fora das missões | -891, -536 | /casa-de-shows por cima do jogo |
| Ginásio | só na pista da cidade (fachada, sai do jogo) | **novo: GINÁSIO** (telhado em arco) | -760, -930 | /ginasio por cima do jogo; "· ver" com cadeado até a missão do Drew. Sem parceria/link (decisão do dono) |
| Quadra | existia (piso, cestas, alambrado), mas o basquete livre quase nunca disparava (a quadra só valia como alvo de missão) | **botão "entrar · a quadra"** sempre | -860, -790 | basquete livre (60 s) depois da missão do Alohan; antes, o aviso do que libera |
| Beat (batida) | só no celular (B4TIDA) e na missão da quadra | **novo: BATIDA** (caixas de som) | -500, -745 | /batida por cima do jogo |
| Galeria | só na pista da cidade (sai do jogo) | **novo: GALERIA** (quadros na fachada) | -611, -527 | /galeria por cima do jogo (pintar fica dentro dela) |
| Flores | canteiros nas pistas da cidade e o app JARDIM | **novo: FLORES** (canteiros floridos) | -990, -600 | app JARDIM; trancado (ver) até a missão da Ella |
| Roupas (brechó) | não existia no chão (as roupas só na LOJA) | **novo: BRECHÓ** (arara na calçada) | -790, -600 | LOJA na aba roupas. Ligação com a Bee Shop é decisão do dono |

Distâncias: cada lugar novo fica a 90 m ou mais do vizinho mais perto, a 40 m ou
mais da rua da corrida, e em chão livre de pista e torre (`M.livre`, conferido
com o mundo montado). As ruínas abrem espaço sozinhas (ruinas.ts já afasta 20 m
dos CHAO_LUGARES).

Desempenho: os seis lugares novos são 3 desenhos juntos (paredes com cor no
vértice, neon sem luz, letreiros num atlas só), montados uma vez dentro do
`<Perto>` dos lugares do chão (600 m); nada por quadro, sem luz nova.

Em aberto (do dono): a /nectar é a leitura (não são as flores); a loja vende
discos por gênero (não há ainda "discos de outros artistas e de domínio
público" de verdade); fliperama segue só na cidade.
