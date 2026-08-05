---
name: scaffold-neon-page
description: Cria uma nova tela temática do funil Cidade Neon (uma pasta app/<slug>/page.tsx) já seguindo os padrões do projeto - máquina de fases local, integração com useGameFunnel()/useAudioPlayer(), cleanup de efeitos. Use quando o usuário pedir uma nova tela, mini-app, ou passo do funil (ex: "cria uma tela de X", "novo mini-app parecido com o hacker").
---

# Scaffold de nova página do funil

Este projeto (`CLAUDE.md` tem o contexto completo) é composto por telas
independentes em `app/<slug>/page.tsx`, cada uma simulando um app de celular
dentro da narrativa. Todas seguem o mesmo esqueleto. Esta skill monta esse
esqueleto para uma tela nova em vez de copiar/colar e adaptar manualmente uma
existente (o que tende a arrastar lixo específico da tela copiada).

## Passo 1 — Entender o pedido

Antes de gerar qualquer código, confirme com o que já existe:
- Qual o `slug` da rota (`app/<slug>/page.tsx`)?
- Essa tela é uma missão que precisa avançar `cinematicStep` e/ou chamar
  `completeConfirmation`? Se sim, qual `CinematicStep` ela representa (pode
  precisar adicionar um valor novo ao union type em
  `app/providers/GameFunnelProvider.tsx`)?
- Ela toca áudio? Roda dentro do iframe do celular ou é acessada solo
  (como `/drive`)?
- Existe uma tela existente estruturalmente parecida (`app/ligacao`,
  `app/hacker`, `app/nectar` são bons pontos de partida por tamanho)? Leia-a
  antes de escrever a nova — reaproveite o estilo, não invente um novo.

## Passo 2 — Esqueleto mínimo

```tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { useAudioPlayer } from "@/app/providers/AudioPlayerProvider"

type Phase = "intro" | /* ... fases específicas da tela ... */ "done"

export default function NomeDaTelaPage() {
  const { state, updateCinematicStep, completeConfirmation } = useGameFunnel()
  const { play } = useAudioPlayer()
  const [phase, setPhase] = useState<Phase>("intro")

  useEffect(() => {
    // efeitos de fase (timers, animações) — sempre com cleanup
    return () => {
      // clearTimeout/clearInterval aqui se algum foi criado acima
    }
  }, [phase])

  // ao concluir a missão desta tela:
  // updateCinematicStep("novo-passo")
  // completeConfirmation(n, { ...dadosRelevantes })

  return (
    <div className="min-h-dvh bg-black text-white">
      {/* UI por fase */}
    </div>
  )
}
```

Ajuste conforme a tela real: nem toda tela precisa de `completeConfirmation`
(só as que fecham uma das 3 confirmações do funil), e nem toda tela usa
áudio.

## Passo 3 — Registrar no funil, se for uma missão

Se a tela é um novo passo do funil:
1. Adicione o novo valor ao union `CinematicStep` em `GameFunnelProvider.tsx`.
2. Veja onde `getMissions()` é montado (`app/page.tsx`) para decidir se essa
   missão precisa entrar na lista, e sob qual condição de desbloqueio.
3. Não resete `CURRENT_VERSION` por causa disso — campos novos em
   `GameFunnelState` (se precisar de estado próprio nesse app) entram no
   `defaultState` e no merge de `loadState()`, seguindo o padrão de
   `radioAccepted`/`radioListenedMs`.

## Passo 4 — Revisar

Depois de escrever a página, rode o agent `page-reviewer`
(`.claude/agents/page-reviewer.md`) nela. Se a tela mexeu em
`GameFunnelProvider.tsx`, rode também `state-auditor`.
