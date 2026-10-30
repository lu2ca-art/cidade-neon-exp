"use client"

// A PORTA ABRIU (T02, 28/10): o último passo de toda missão (arte → jogo → a
// porta → a recompensa). Texto grande, o que ganhou e o que abriu (J1: "a tela
// de recompensa com destaque"); o que ainda não existe no jogo aparece "em
// breve". Um toque em "seguir" volta direto pro jogo (J2: 11, sem "voltar pra
// Kombi"). O T07 e o T30 deixam ela mais bonita e dizem "como funciona".
// Os textos são RASCUNHO (o LU2CA reescreve).

import { useEffect } from "react"
import type { Recompensa13 } from "./portas"
import { xenomDaMissao } from "./xenom"

export function Recompensa({ r, onSeguir, onXenom }: { r: Recompensa13; onSeguir: () => void; onXenom?: () => void }) {
  const xs = xenomDaMissao(r.missao)
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
          {/* (T21) a missão do subúrbio libera o show xenom da faixa dela */}
          {xs && <li className="l-recompensa-xenom"><small>Guitar Driver · xenom</small>o show {xs.faixa}: {xs.multiverso}, nos palcos</li>}
          {r.neon > 0 && <li><small>neon$</small>+{r.neon}</li>}
        </ul>
        <button type="button" onClick={onSeguir} autoFocus>seguir →</button>
        {xs && onXenom && <button type="button" className="l-recompensa-ir" data-xenom-ir={xs.id} onClick={onXenom}>tocar {xs.faixa} agora →</button>}
      </div>
    </div>
  )
}
