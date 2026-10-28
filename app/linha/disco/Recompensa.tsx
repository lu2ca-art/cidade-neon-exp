"use client"

// A PORTA ABRIU (T02, 28/10): o último passo de toda missão (arte → jogo → a
// porta → a recompensa). Texto grande, o que ganhou e o que abriu (J1: "a tela
// de recompensa com destaque"); o que ainda não existe no jogo aparece "em
// breve". Um toque em "seguir" volta direto pro jogo (J2: 11, sem "voltar pra
// Kombi"). O T07 e o T30 deixam ela mais bonita e dizem "como funciona".
// Os textos são RASCUNHO (o LU2CA reescreve).

import { useEffect } from "react"
import type { Recompensa13 } from "./portas"

export function Recompensa({ r, onSeguir }: { r: Recompensa13; onSeguir: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === "Escape" || e.key === " ") onSeguir() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onSeguir])
  return (
    <div className="l-recompensa" style={{ ["--cor" as string]: r.cor }} role="dialog" aria-label="a porta abriu" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-recompensa-caixa">
        <small>a missão de {r.quem}</small>
        <b>a porta abriu</b>
        <ul className="l-recompensa-abriu">
          {r.abriu.map((a) => (
            <li key={a.id} className={a.emBreve ? "is-breve" : ""}>{a.nome}{a.emBreve && <em>em breve</em>}</li>
          ))}
        </ul>
        <ul className="l-recompensa-ganhos">
          {r.guitar && <li><small>Guitar Driver</small>{r.guitar.nome} liberada pra tocar na rua</li>}
          {r.batida && <li><small>B4TIDA</small>a referência da {r.batida.nome}</li>}
          {r.neon > 0 && <li><small>neon$</small>+{r.neon}</li>}
        </ul>
        <button type="button" onClick={onSeguir} autoFocus>seguir →</button>
      </div>
    </div>
  )
}
