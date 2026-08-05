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
