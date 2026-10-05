"use client"

// A checklist do tutorial na tela da Kombi (tutorial.ts). Mostra só o bloco
// de agora; o que já foi fica riscado. Toca no título e ela encolhe.

import { useState } from "react"
import type { Save } from "./estado"
import { BLOCOS, ITENS, blocoAtual, feito } from "./tutorial"

export function Checklist({ save }: { save: Save }) {
  const [fechada, setFechada] = useState(false)
  const b = blocoAtual(save)
  if (b >= BLOCOS.length) return null
  const itens = BLOCOS[b].itens
  const proximo = itens.find((i) => !feito(save, i))
  return (
    <aside className={`l-check ${fechada ? "is-fechada" : ""}`} aria-label="primeiros passos">
      <button type="button" className="l-check-topo" onClick={() => setFechada((v) => !v)} aria-expanded={!fechada}>
        <span>primeiros passos</span>
        <em>{b + 1}/{BLOCOS.length}</em>
      </button>
      {!fechada && (
        <ul>
          {itens.map((i) => {
            const ok = feito(save, i)
            return (
              <li key={i} className={ok ? "is-ok" : i === proximo ? "is-agora" : ""}>
                <i aria-hidden="true">{ok ? "✓" : ""}</i>
                <span>
                  {ITENS[i].texto}
                  {i === proximo && <small>{ITENS[i].dica}</small>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
