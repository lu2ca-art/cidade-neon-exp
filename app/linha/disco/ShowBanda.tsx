"use client"

// O SHOW DA BANDA (LU2CA 21/10 (5): "cada instrumento sendo tocado de um jeito
// [...] vamos ser mais criativos e ter mais de um modo de fazer um jogo de
// música"). Antes do show, a pessoa escolhe o instrumento; cada um é um jogo:
//   cantar   → o afinador (ShowAfinador): segura a agulha no meio, senão a voz desafina
//   guitarra → o Guitar Driver (ShowPista)
//   baixo    → a corda virtual (ShowCorda): sobe e desce pra pegar as faixas coloridas
//   teclado, bateria → por enquanto a pista do Guitar Driver com as notas deles
//                      (a trava-mente do teclado e o jogo da bateria: a desenhar)
// Sempre 22 s, no palco da missão. As faixas que ainda não saíram não têm o cantar
// (a voz entra no lançamento).

import { useEffect, useState } from "react"
import { PISTAS } from "../estrada/pistas"
import { NOME_INST, ShowPista, carregarChart, type InstrumentoShow, type PropsShow } from "./Show"
import { ShowCorda } from "./ShowCorda"
import { ShowAfinador } from "./ShowAfinador"

const COMO: Record<InstrumentoShow, string> = {
  voz: "segura a agulha no meio, senão a voz desafina",
  guitarra: "o Guitar Driver: as notas descendo",
  baixo: "a corda: sobe e desce pra pegar as faixas",
  teclado: "as notas do teclado na pista",
  bateria: "as peças da bateria na pista",
}

export function Show(props: PropsShow) {
  const [inst, setInst] = useState<InstrumentoShow | null>(null)
  const [temVoz, setTemVoz] = useState<boolean | null>(null)
  const pista = PISTAS.find((p) => p.id === props.faixa)!
  useEffect(() => {
    let vivo = true
    carregarChart(props.faixa).then((c) => { if (vivo) setTemVoz(!!c.voz?.melodia?.length) }).catch(() => { if (vivo) setTemVoz(false) })
    return () => { vivo = false }
  }, [props.faixa])
  if (inst === "voz") return <ShowAfinador {...props} />
  if (inst === "baixo") return <ShowCorda {...props} />
  if (inst) return <ShowPista {...props} inst={inst} />
  const opcoes: InstrumentoShow[] = [...(temVoz ? (["voz"] as const) : []), "guitarra", "baixo", "teclado", "bateria"]
  return (
    <div className="l-show is-gd is-escolha" style={{ ["--cor" as string]: props.cor }} onPointerDown={(e) => e.stopPropagation()}>
      <header className="l-show-topo"><small>o show · {props.lugar}</small><b>{pista.faixa}</b><span>escolhe o seu instrumento · 22 s</span></header>
      <div className="l-show-banda" role="group" aria-label="O seu instrumento">
        {opcoes.map((i) => (
          <button key={i} type="button" onClick={() => setInst(i)}>
            <b>{NOME_INST[i]}</b>
            <small>{COMO[i]}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
