"use client"

// T16 · O JOGO DO MUBARAK (decidido 28/10): a sinuca do T17 (app/linha/sinuca),
// contra ele. Uma partida inteira: ganhando ou perdendo, a missão segue (é uma
// sinuquinha de leve; SINUCA_MISSAO.precisaVencer troca isso).

import { useState } from "react"
import { Sinuca } from "../../sinuca/Sinuca"
import { SINUCA_MISSAO } from "./conf"
import type { PecaProps } from "./Peca"

export function SinucaMissao({ onFim }: PecaProps) {
  const [fim, setFim] = useState<{ venceu: boolean; motivo: string } | null>(null)
  const [partida, setPartida] = useState(0)
  const vale = !!fim && (fim.venceu || !SINUCA_MISSAO.precisaVencer)
  return (
    <>
      <Sinuca key={partida} modo="mubarak" onFim={setFim} />
      {fim && (
        <div className="l-sinuca-fim" role="dialog" aria-label="o fim da partida">
          <div>
            <small>a missão do Mubarak · a sinuca</small>
            <b>{fim.venceu ? "você ganhou" : "o Mubarak ganhou"}</b>
            <p>{fim.venceu ? "\"olha só. o disco te deixou com a mão leve.\"" : "\"de leve. a mesa não tem pressa.\""} <em>({fim.motivo})</em></p>
            <div className="l-peca-fim">
              <button type="button" className="is-volta" onClick={() => { setFim(null); setPartida((p) => p + 1) }}>outra partida</button>
              {vale && <button type="button" className="is-seguir" onClick={() => onFim(true, [fim.venceu ? "venceu" : "perdeu"])} autoFocus>seguir →</button>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
