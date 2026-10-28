"use client"

// A RUA (T02, 28/10; J2: 23, 26): o show saiu de dentro da missão e virou
// oportunidade. Cantar (o Guitar Driver) fica aberto desde o começo, pra ganhar
// uma grana (neon$ e popularidade, e o jornal fala do show). O Guitar libera as
// músicas conforme as missões: as que faltam aparecem com quem libera. O beat
// (o B4TIDA) abre pelo mesmo painel. Os palcos que sobem a cidade e o menu de
// cada palco são do T20.

import { useEffect } from "react"
import { PISTAS, type PistaId } from "../estrada/pistas"
import { COR_PISTA, type HistoriaDisco } from "./historia"
import { MISSOES13, musicasDoGuitar, quemLibera } from "./portas"

export function Rua({ h, onTocar, onFechar }: { h: HistoriaDisco; onTocar: (f: PistaId) => void; onFechar: () => void }) {
  const livres = musicasDoGuitar(h)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onFechar])
  return (
    <div className="l-rua" role="dialog" aria-label="cantar na rua" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-rua-caixa">
        <header>
          <small>na rua · Guitar Driver</small>
          <b>escolhe a música</b>
          <button type="button" onClick={onFechar} aria-label="Fechar">×</button>
        </header>
        <ul>
          {PISTAS.map((p) => {
            const livre = livres.includes(p.id)
            const quem = livre ? null : quemLibera(p.id)
            return (
              <li key={p.id} style={{ ["--cor" as string]: COR_PISTA[p.faixa] ?? "#ffc857" }} className={livre ? "" : "is-fechada"}>
                {livre ? (
                  <button type="button" onClick={() => onTocar(p.id)}><b>{p.faixa}</b><small>tocar · 22 s</small></button>
                ) : (
                  <span><b>{p.faixa}</b><small>{quem ? `abre na missão de ${MISSOES13[quem].quem}` : "em breve"}</small></span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
