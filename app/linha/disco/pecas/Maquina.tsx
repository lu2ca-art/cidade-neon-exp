"use client"

// T23 · O JOGO DO NOTTI (decidido): uma máquina do fliperama (as 7 moram em
// app/fliperama/). Uma partida, sem ficha (é o Notti quem liga). Qual máquina
// e quantos pontos contam: conf.ts (MAQUINA). Acabou a partida: o placar e "seguir".

import { useState } from "react"
import { Atravessa } from "../../../fliperama/atravessa"
import { Cobra } from "../../../fliperama/cobra"
import { Invasores } from "../../../fliperama/invasores"
import { Linha9 } from "../../../fliperama/linha9"
import { Pingue } from "../../../fliperama/pingue"
import { Predio } from "../../../fliperama/predio"
import { Quebra } from "../../../fliperama/quebra"
import { ac, ficha } from "../../../fliperama/oito"
import "../../../fliperama/fliperama.css"
import { MAQUINA } from "./conf"
import type { PecaProps } from "./Peca"

const JOGOS = { atravessa: Atravessa, cobra: Cobra, invasores: Invasores, linha9: Linha9, pingue: Pingue, predio: Predio, quebra: Quebra }

export function Maquina({ onFim }: PecaProps) {
  const [jogando, setJogando] = useState(false)
  const [pontos, setPontos] = useState<number | null>(null)
  const J = JOGOS[MAQUINA.id]
  if (jogando) return <div className="fp-raiz l-maquina-raiz"><J onFim={(p) => { setPontos(p); setJogando(false) }} /></div>
  const valeu = pontos !== null && pontos >= MAQUINA.pontosMin
  return (
    <div className="l-maquina-menu">
      <small>a missão do Notti · o jogo</small>
      <b>{MAQUINA.id === "quebra" ? "QUEBRA-NEON" : MAQUINA.id.toUpperCase()}</b>
      <p>{pontos === null ? "o Notti liga a máquina com a sua trilha. \"uma ficha é minha. joga.\"" : valeu ? `${pontos} pontos. "isso. agora as outras seis acordam."` : `${pontos} pontos. "mais uma. ninguém joga uma só."`}</p>
      <div className="l-peca-fim">
        {!valeu && <button type="button" className="is-seguir" onClick={() => { ac(); ficha(); setJogando(true) }} autoFocus>{pontos === null ? "jogar ▶" : "de novo ▶"}</button>}
        {valeu && <button type="button" className="is-seguir" onClick={() => onFim(true, [String(pontos)])} autoFocus>seguir →</button>}
      </div>
    </div>
  )
}
