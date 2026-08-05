# memoria.md — decisões e aprendizados

## 2026-08-05

- Criada a estrutura `CLAUDE.md` / `specs/design.md` / `memoria.md` pra dar
  contexto persistente entre sessões — antes disso não existia nada disso, e
  cada sessão nova partia do zero, sem memória do projeto.
- Salvas 27 imagens de referência do jogo "HORIZON Drive" (Shopify Editions
  Summer '25) em `references/horizon-drive/`, como direção de estrutura e
  clima visual — não é pra clonar o jogo, só a linguagem (HUD, horizonte,
  estrada neon).
- Produto confirmado pelo usuário: campanha de lançamento do álbum CIDADE
  NEON, artista LU2CA. Público-alvo: Gen Z, fãs de synthwave/eletrônica.
- Confirmado pelo usuário: "não é uma landing page, é um jogo musical
  imersivo contido numa cidade com vários tipos de interação" — reforça que
  decisões de UX devem tratar cada tela como parte de um mundo jogável, não
  como seção de site.
- Criado `specs/visao-produto.md` com a visão de longo prazo compartilhada
  pelo usuário: plataforma multiplayer, mapa multi-artista (A–Z, hoje só
  L/LU2CA), carro e personagem customizáveis, rádio como forma de descobrir
  a obra de cada artista, e um pilar grande de criação musical (sampleamento,
  remix, stems, gravador portátil, MPC via B4TIDA, Guitar Hero ligado ao
  instrumental real). Regra de design central que o usuário deixou explícita:
  cidade + missões são a única fonte de recursos do jogo, desbloqueio é
  sempre gradual (nunca tudo de uma vez, mas também nunca zero — no início
  já há acesso a tudo em quantidade reduzida), com itens colecionáveis
  espalhados pelo mapa (estilo Crash Bandicoot/Mario Kart) sujeitos a regras
  estritas de spawn. Isso é norte de produto, não trabalho já implementado.
- Decisão de prioridade: por enquanto NÃO avançar em multiplayer/multi-
  artista nem no pilar de produção musical além de single-player. Foco
  atual é elevar o que já existe — função, textos, emoção, tom de voz,
  diversidade de cenários e estímulo visual do funil single-artist do
  LU2CA. Régua de qualidade registrada em `specs/design.md` →
  "Prioridade atual".
- Criado `specs/narrativa.md`: registra o tema central do projeto
  (independência da indústria musical dominada por grandes empresas/gente
  rica — LU2CA construindo um espaço próprio) e como isso deveria justificar
  a sequência de hacker/invasão, que hoje é só estética sem essa história
  por trás ("está muito do nada, só eu sei a história" — palavras do
  usuário). Marcado como pendência em aberto: achar uma forma leve (não
  didática) de a invasão carregar esse significado — ainda não decidido
  como, não fazer sem validar direção primeiro. Também documentada a lógica
  de multiplicidade de estímulo (carro + celular navegável + //LOOP como
  recompensa rara pra quem completa a jornada) que já está espalhada pela
  experiência atual.
- Passe de "investigação de detalhes" no código pra achar ambiguidades reais
  antes de continuar documentando. Achados e decisões:
  - **C0D3X** (ícone "notes" no celular, `app/page.tsx:373`) não tinha
    nenhum handler de clique — ícone morto. Esclarecido pelo usuário: é o
    bloco de notas pessoal dele, a ideia é renderizar em 3D, como se desse
    pra folhear e ler as páginas. Ainda não implementado — registrado aqui
    pra não perder a intenção até entrar na fila de trabalho.
  - **FR3Q_** (app id interno `spotify`, abre `/spotify/auto-chuva`) é
    confirmado como **rádio 100% própria**, sem nenhuma integração real com
    o Spotify — "Spotify" no código/pastas é só nomenclatura antiga que
    sobrou. Não afeta o usuário final (o nome exibido já é FR3Q_), mas vale
    lembrar disso ao mexer em `app/spotify/*` pra não achar que é uma
    integração real.
  - **Sistema de progressão/recursos** deixou de ser visão distante —
    virou prioridade atual, movido de `specs/visao-produto.md` para
    `specs/progressao.md`. Ainda não implementado (hoje o unlock é
    binário), mas agora faz parte do escopo de "polir a experiência
    single-player", não do norte de longo prazo.
  - Confirmado: não existe marca/empresa separada por trás do projeto além
    do próprio LU2CA — "empresa"/"nós" era forma de falar, não uma entidade
    à parte. `CLAUDE.md` continua descrevendo o projeto como do artista
    solo.
  - Pendências registradas sem decisão ainda (não travam nada, só ficam
    marcadas): status do conteúdo externo do ACC3SS
    (`lu2ca-xlvdjou.gamma.site` — final ou placeholder), e se
    untitled.stream (onde o álbum é vendido de verdade) tensiona ou reforça
    o tema de independência do projeto.
- **FEEL.GOOD redefinido** (resolve a pendência do B-side legado, ver
  `specs/feel-good.md`): deixa de ser só o joguinho de conectar palavras e
  vira um app de saúde mental — "diálogos conscientes sobre sentir e o
  mundo". A pessoa escuta um som e descreve a sensação, assiste algo e
  descreve o que sentiu. O som usado não são as músicas do LU2CA — são sons
  distintos desenhados pra gerar sensações diferentes. O `C0D3X` (bloco de
  notas em 3D, ver entrada anterior) mora dentro desse app, guardando tudo
  que a pessoa descreveu sentir. **Decidido**: o jogo antigo de conectar
  palavras é substituído por completo (não convive como easter egg) — o
  FEEL.GOOD "se transforma no que ele realmente deve ser": um **game de
  sentir**, não só um app de saúde mental.

- **Ideia concreta pro B4TIDA (4 fases)**, proposta pelo usuário como exemplo
  de "pegar uma ideia existente e melhorar": hoje o B4TIDA é só uma MPC de
  batidas. Proposta: fase 1 — criar o ritmo (bateria); fase 2 — criar o
  baixo; fase 3 — melodia e harmonia ao mesmo tempo (piano = harmonia,
  guitarra = melodia); fase 4 — a pessoa pode cantar por cima. Ainda não
  avaliado tecnicamente nem priorizado — fica registrado pra não perder,
  candidato natural pro agente de inovação (`.claude/agents/inovacao.md`)
  aprofundar quando for a vez do B4TIDA.
- **Economia da cidade** (movido pra `specs/visao-produto.md` → "Economia
  dentro da cidade"): loja de disco pra outros artistas venderem discos
  dentro da plataforma, outdoors de propaganda com curadoria de marca ("só
  marcas que combinam com o projeto"), e um evento ao vivo dentro do jogo —
  "Festival NECTAR". Tudo depende do sistema multi-artista existir primeiro,
  é norte de longo prazo, não prioridade atual.
- Criado o roster de subagentes de revisão em `.claude/agents/` (design,
  narrativa, ux, movimento, sonora, inovação) — pedido explícito do usuário
  pra que a experiência inteira seja revisada de forma contínua contra os
  specs já documentados, não só telas novas. Detalhes de cada agente estão
  nos próprios arquivos `.claude/agents/*.md`.

- **Primeira auditoria completa** (`revisao-completa`, 5 agentes em paralelo:
  design, narrativa, ux, movimento, sonora) rodada na experiência inteira.
  4 decisões ficaram bloqueadas por esbarrar direto na regra do `CLAUDE.md`
  ("se contradiz design.md, pare e avise") — nenhuma foi resolvida sozinha:
  1. `/final/sala-branca` (tela de clímax, reachable de verdade) renderiza
     em tema claro pastel, violando a regra "fundo sempre preto" de
     `specs/design.md`. Intencional (metáfora de sair do neon) ou drift?
  2. Existe uma segunda implementação de NECTAR dentro de `app/page.tsx`
     (fase `nectar-login`, hoje código morto/inalcançável) com **fundo
     branco**, rotulada "Confirmação 3/3" (contradiz a ordem real). Apagar
     junto da limpeza de código morto, ou tinha intenção que virou produto?
  3. O cluster do painel do carro (`/drive`) hoje é um instrumento físico
     opaco estilo "cluster de Mercedes" (paleta marrom/âmbar não
     documentada), divergindo do HUD translúcido-com-glow que `design.md`
     define como direção. Decisão consciente (documentar exceção) ou
     corrigir pro HUD flutuante?
  4. A cor oficial de cada faixa do álbum diverge entre telas — ex.
     "dopamina" é laranja em `ALBUM_TRACKS` e roxo em `SONGS` do GUITAR
     DRIVER; a tabela de `specs/design.md` documenta a constante `TRACKS`
     de `app/page.tsx`, que está morta. Precisa de uma fonte única (mesmo
     padrão que `lib/radio-tiers.ts` já resolveu pras frequências).

  **Decisão 1 resolvida (2026-08-05)**: `/final/sala-branca` foi apagada.
  O usuário decidiu: se não tinha nada reaproveitável no código, apagar; se
  desse pra aproveitar pra construção do C0D3X (bloco de notas 3D), manter.
  Avaliação: é só um card de compra genérico com fundo claro (aurora
  pastel), sem nenhuma estrutura de "página pra folhear" — não serve de
  base pro C0D3X. Removida junto com as duas pontas soltas que deixaria
  (atalho no painel de dev, função nunca chamada em `app/tiktok/final`).
  Descoberta lateral: `app/tiktok/final/page.tsx` (a versão "//LOOP" com
  vídeos verticais e popup de compra do disco) também é 100% inalcançável
  hoje — o ícone TikTok do celular só abre `/tiktok/final` quando
  `confirmationCount &lt; 3`, mas está bloqueado exatamente até
  `confirmationCount === 3`, então essa condição nunca ocorre. Fica
  registrado sem decisão: essa versão é mais completa/no tom certo do que
  a `/tiktok/feed` hoje em uso — pode valer a pena revisitar qual delas é
  o destino real do `//LOOP`, mas isso é decisão de produto separada.

  Achados acionáveis sem bloqueio (não implementados ainda, aguardando
  priorização):
  - Código morto/duplicado espalhado por `app/page.tsx` (fases
    `whatsapp-group`/`post-confirm-group`/`nectar-login`/`spotify`, nunca
    alcançáveis) e rotas órfãs inteiras (`app/hacker/page.tsx` — que na
    verdade tem uma versão *melhor* do efeito Matrix que a viva usa,
    `app/ligacao/page.tsx`, `app/radio/page.tsx`) — risco real de
    reintroduzir bug se alguém reconectar essas fases sem saber que
    existem.
  - Confirmado com evidência de código: rádio, B4TIDA e GUITAR DRIVER
    liberam tudo de uma vez hoje (binário), exatamente os 3 pontos que
    `specs/progressao.md` já pede pra tornar gradual — a prioridade já
    combinada agora tem um mapa concreto de onde mexer primeiro.
  - Botão de "resetar experiência" sem confirmação, em zona de toque
    acidental (canto superior esquerdo), apaga progresso sem undo — em
    `/drive` e no celular.
  - Zero feedback tátil (scale/glow ao toque) nos controles mais usados
    do jogo inteiro: acelerar/virar do carro e os 4 botões do GUITAR
    DRIVER — mesmo padrão que o B4TIDA já acerta em quase todo botão.
  - Sequência hacker é 100% muda (nenhum som) — reforça a pendência já
    registrada em `specs/narrativa.md`.
  - Bug de física real: retorno do volante ao centro (`app/drive/page.tsx`)
    não usa `dt`, então roda ~2x mais devagar em 30fps que em 60fps — único
    ponto da física do carro que não é frame-rate independent.
  - Transição ligação→carro usa `window.location.href` (reload duro),
    corta o som de desconexão no meio e entrega `/drive` mudo até o
    primeiro toque — maior quebra de imersão técnica da jornada.

## Aprendizados técnicos (extraídos do código/histórico existente)

- `/drive` e o hub do celular (iframe) são duas árvores React separadas,
  cada uma com sua própria instância do `GameFunnelProvider` — só
  sincronizam via `localStorage` + evento `storage`. Sem isso, uma missão
  concluída dentro do iframe nunca chegava ao `/drive` já montado.
  (`app/providers/GameFunnelProvider.tsx`)
- A notificação da próxima missão só dispara depois que a pessoa ouve de
  verdade a frequência de rádio recém-liberada por >=45s (~2 faixas) — evita
  atropelar a experiência de dirigir curtindo a rádio nova.
  (`app/page.tsx`, `getMissions()`)
- `resetExperience()` centraliza a limpeza de todas as chaves de
  `localStorage` do jogo num só lugar — antes existia duplicado em 3 pontos
  diferentes e podia divergir.
