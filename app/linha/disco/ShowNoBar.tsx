"use client"

// O SHOW DA NECTAR NO PALCO DO BAR (ep. 1, episodios.md, 08/11): o LU2CA no palco,
// a D-Bee e o Mubarak do seu lado (a sala em 3D, interior/salas/Bar.tsx), e a Nectar
// sendo revelada. A pessoa escolhe:
//   assistir → fica na plateia, cantando junto (o medidor, §12), a música inteira;
//              enquanto ouve, pode jogar sinuca
//   tocar    → sobe no palco: o show de sempre (ShowBanda), com a escolha do instrumento
// Qualquer um dos dois libera a Nectar no Guitar Driver e no MP3 e a sinuca, sem ser
// obrigatória (quem decide é o marco "show-nectar", episodios.ts).

import { useState } from "react"
import type { ResultadoShow } from "./Show"
import { ShowAfinador } from "./ShowAfinador"
import { CHAO_LUGARES } from "./historia"

const COR = CHAO_LUGARES.bar.cor

export function ShowNoBar({ popularidade, onTocar, onFim }: { popularidade: number; onTocar: () => void; onFim: (r: ResultadoShow) => void }) {
  const [ver, setVer] = useState(false)
  const [vez, setVez] = useState(0)
  if (ver) return <ShowAfinador key={vez} faixa="nectar" lugar="no bar" palco="bar" cor={COR} popularidade={popularidade} noMundo inteira sinuca onFim={onFim} onDeNovo={() => setVez((v) => v + 1)} />
  return (
    <div className="l-show is-no-mundo" style={{ ["--cor" as string]: COR }} onPointerDown={(e) => e.stopPropagation()}>
      <header className="l-show-topo"><small>o show · no bar</small><b className="l-show-revela">Nectar</b></header>
      <div className="l-show-escolha">
        <button type="button" onClick={() => setVer(true)}><b>assistir</b><small>canta da plateia. dá pra jogar sinuca enquanto ouve</small></button>
        <button type="button" onClick={onTocar}><b>tocar</b><small>sobe no palco: guitarra, baixo, bateria ou teclado</small></button>
      </div>
    </div>
  )
}
