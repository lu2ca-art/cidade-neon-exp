---
name: revisao-completa
description: Roda uma auditoria completa da experiência CIDADE NEON — design, narrativa, UX, movimento e som — de uma vez só, e consolida os achados num relatório único e priorizado. Use quando o usuário pedir uma revisão geral, um "scan" da experiência inteira, ou perguntar "como estamos indo" em termos de qualidade.
---

# Revisão completa da experiência

Este skill dispara os 5 agentes de revisão do projeto em paralelo — cada
um audita uma camada diferente da mesma experiência — e depois consolida
os achados num relatório único, priorizado, em vez de 5 relatórios soltos.

## Passo 1 — Disparar os agentes em paralelo

Use o Agent tool para rodar, numa única mensagem com múltiplas chamadas
(paralelo de verdade, não sequencial), os 5 subagentes:

- `design-review` — paleta, tipografia, composição, diversidade de cenário
- `narrativa-review` — tom de voz, peso emocional, tema de independência
- `ux-review` — fricção, clareza, legibilidade de progresso
- `movimento-review` — animação, timing, tatilidade
- `sonora-review` — música, SFX, transições de áudio

Cada um já sabe o que ler (specs relevantes) e como reportar — não
precisa reexplicar o contexto do projeto no prompt, só confirme se o
usuário quer o escopo completo ou uma parte específica da experiência
(ex: "só o carro", "só o funil de confirmações").

Rode todos em background (`run_in_background`, o padrão) pra não travar a
conversa enquanto os 5 investigam em paralelo.

## Passo 2 — Consolidar

Quando os 5 relatórios voltarem, não repasse cada um cru. Construa um
relatório único:

1. **Resumo executivo** (3-5 linhas) — estado geral da experiência hoje.
2. **Achados por área**, um parágrafo compacto por agente, sem repetir
   detalhe que já vai aparecer na priorização.
3. **Top 5 priorizado geral** — cruzando as 5 áreas, o que mais move a
   agulha primeiro. Nem sempre o achado mais grave de uma área isolada é o
   mais importante do conjunto — pondere impacto real na experiência do
   jogador.
4. **O que já está bom** — não é só lista de problema; reconheça o que já
   está no padrão certo, pra não distorcer a leitura do estado real do
   projeto.

## Regras

- Nenhum agente edita código ou specs — o resultado inteiro é um relatório
  para o usuário decidir o que priorizar. Não implemente nada sozinho
  depois de consolidar, a menos que o usuário peça explicitamente em
  seguida.
- Se algum achado esbarrar em algo que contradiz `specs/design.md`, siga a
  regra do `CLAUDE.md`: pare e avise, não decida sozinho.
- Depois de entregar o relatório, pergunte ao usuário por onde ele quer
  começar — não assuma.
