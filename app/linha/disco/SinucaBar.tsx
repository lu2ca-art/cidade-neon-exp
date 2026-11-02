"use client"

// A SINUCA DO BAR (modo vitrine, 02/11; o dono: "tem uma sinuca? vou até o bar
// e mostro a sinuca, mesmo que jogar dependa de uma missão"). Entrando no bar
// do subúrbio fora do prólogo, a mesa abre no treino (sozinho); a partida com o
// Mubarak segue sendo a peça da missão dele (pecas/SinucaMissao.tsx). Só monta
// quando abre (a page.tsx carrega com dynamic).

import { Sinuca } from "../sinuca/Sinuca"
import { Trancado } from "../Trancado"

export function SinucaBar({ tranca, onSair }: { tranca: string | null; onSair: () => void }) {
  return (
    <div className="l-peca is-cheia is-sinuca l-sinuca-bar" style={{ ["--cor" as string]: "#ffc857" }} role="dialog" aria-label="a sinuca do bar" onPointerDown={(e) => e.stopPropagation()}>
      <Sinuca modo="pratica" />
      <div className="l-sinuca-bar-topo">
        <button type="button" onClick={onSair}>‹ sair do bar</button>
        {tranca && <Trancado texto={tranca} />}
      </div>
    </div>
  )
}
