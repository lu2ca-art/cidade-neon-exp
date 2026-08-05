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
    marcadas): futuro do FEEL.GOOD legado (B-side permanente ou conteúdo a
    aposentar), status do conteúdo externo do ACC3SS
    (`lu2ca-xlvdjou.gamma.site` — final ou placeholder), e se
    untitled.stream (onde o álbum é vendido de verdade) tensiona ou reforça
    o tema de independência do projeto.

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
