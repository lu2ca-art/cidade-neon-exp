# progressao.md — sistema de recursos e desbloqueio gradual

> **Status: prioridade atual** — decisão do usuário em 2026-08-05: isso não
> é mais visão distante (estava antes em `specs/visao-produto.md`), é
> trabalho pra fazer dentro do foco atual de polir a experiência
> single-player do LU2CA. Ainda não implementado — hoje o unlock no código
> é binário (bloqueado/liberado), não gradual. Este arquivo é a spec de
> como deveria funcionar; a implementação em si é a próxima etapa.

## Regra central

A cidade e as missões são a **única fonte de recursos** do jogo — isso
precisa ficar claro e simples pra quem joga.

## Como funciona

- Nada é dado de uma vez só. Desbloqueio é sempre gradual.
- No início, a pessoa já tem acesso a **tudo**, mas em **quantidade
  reduzida** dentro de cada interação:
  - GUITAR DRIVER liberado, mas só com 1 música
  - Rádio liberada, mas só com 1 estação
  - B4TIDA liberado, mas com kit de bateria limitado
- Recursos vão aparecendo aos poucos conforme a pessoa explora/cumpre
  missões — ex: rodar a cidade pra liberar um kit de bateria novo no
  B4TIDA, ir até um lugar X do mapa pra receber uma rádio nova.
- Itens colecionáveis espalhados pelo mapa (referência: power-ups de
  estilo Crash Bandicoot / Mario Kart) — regras estritas de spawn; se a
  pessoa perder o item de vista, tem que rodar a cidade de novo até achar.
- Regras estritas valem também pra mapa, design, render e storytelling —
  padrão de experiência **premium** pra nova geração.

## Onde isso diverge do que já existe hoje no código

| Hoje (real) | Meta (esta spec) |
|---|---|
| `appsUnlocked.nectar/feelGood/guitarDriver` — bloqueado ou liberado, sem meio-termo (`GameFunnelProvider.tsx`) | Liberado desde o início, mas com conteúdo/quantidade reduzida |
| As 4 frequências de rádio liberam junto com `confirmationCount` (0→1→2→3) | Rádio liberada desde o início com 1 estação; novas estações via exploração/missão própria |
| B4TIDA: livre desde o início, sem kits liberáveis | Kits de bateria adicionais desbloqueáveis por missão |
| Sem itens colecionáveis no mapa | Sistema de spawn de colecionáveis com regras estritas |

## Próximo passo

Definir com o usuário, um recurso de cada vez: qual liberação concreta
(kit de bateria, faixa nova no GUITAR DRIVER, frequência de rádio) entra
nessa lógica primeiro, e como isso se encaixa no mapa/mundo do `/drive` que
já existe hoje — antes de tentar implementar tudo de uma vez.
