"use client"

// T23 · A ARTE DO NOTTI (aprovada 30/10): fazer a trilha de 8 bits da
// máquina. Uma grade de 4 vozes × 8 passos (melodia, baixo, pulso, ruído) em
// onda quadrada, tocando em loop no bpm da DopaminA. Acende os quadrados, ouve,
// e grava na máquina (a trilha fica no save). Rascunho: conf.ts (TRILHA8).

import { useEffect, useRef, useState } from "react"
import { TRILHA8 } from "./conf"
import { bip, ruido } from "./sons"
import { fazerMusica } from "../../som"
import type { PecaProps } from "./Peca"

// um começo pra não ser a grade vazia (o Notti deixou o pulso marcando)
const INICIO = (): boolean[][] => TRILHA8.vozes.map((_, v) => Array.from({ length: TRILHA8.passos }, (_, p) => v === 2 && p % 2 === 0))

export function Trilha8({ onFim }: PecaProps) {
  // (trilha sonora, 05/11; bíblia 9) fazer a trilha 8 bits é FAZER música: a do jogo
  // para (fade) enquanto ele compõe e volta de onde estava quando fecha
  useEffect(() => { fazerMusica(true); return () => fazerMusica(false) }, [])
  const [grade, setGrade] = useState(INICIO)
  const [passo, setPasso] = useState(-1)
  const gradeRef = useRef(grade)
  useEffect(() => { gradeRef.current = grade }, [grade])
  const notas = grade.flat().filter(Boolean).length - INICIO().flat().filter(Boolean).length

  // o loop: um passo a cada colcheia
  useEffect(() => {
    const ms = (60 / TRILHA8.bpm / 2) * 1000
    let p = 0
    const t = setInterval(() => {
      const g = gradeRef.current
      TRILHA8.vozes.forEach((v, k) => {
        if (!g[k][p]) return
        if (k === 3) ruido(0.05, 0.1, 0, 7000)
        else bip(v.f[p], k === 1 ? 0.16 : 0.09, k === 1 ? "triangle" : "square", k === 2 ? 0.04 : 0.07)
      })
      setPasso(p)
      p = (p + 1) % TRILHA8.passos
    }, ms)
    return () => clearInterval(t)
  }, [])

  const trocar = (v: number, p: number) => setGrade((g) => g.map((l, k) => (k === v ? l.map((x, i) => (i === p ? !x : x)) : l)))
  const pronta = notas >= TRILHA8.minimo
  const obra = () => grade.map((l) => l.map((x) => (x ? "x" : ".")).join(""))

  return (
    <div className="l-peca-trilha8">
      <p className="l-peca-dica">o Notti abre a máquina apagada: &quot;sem trilha ela não liga. faz a música dela.&quot;</p>
      <div className="l-trilha8-grade" role="grid" aria-label="a grade da trilha">
        {TRILHA8.vozes.map((v, k) => (
          <div key={v.nome} className="l-trilha8-linha" role="row">
            <small>{v.nome}</small>
            {grade[k].map((on, p) => (
              <button key={p} type="button" role="gridcell" aria-selected={on} aria-label={`${v.nome} ${p + 1}`}
                className={`${on ? "is-on" : ""} ${p === passo ? "is-passo" : ""}`} onClick={() => trocar(k, p)} />
            ))}
          </div>
        ))}
      </div>
      <p className="l-peca-placar">{pronta ? "a máquina já pisca" : `mais ${TRILHA8.minimo - Math.max(0, notas)} notas pra máquina ligar`}</p>
      <div className="l-peca-fim">
        <button type="button" className="is-volta" onClick={() => setGrade(INICIO())}>limpar</button>
        <button type="button" className="is-seguir" disabled={!pronta} onClick={() => onFim(true, obra())}>gravar na máquina →</button>
      </div>
    </div>
  )
}
