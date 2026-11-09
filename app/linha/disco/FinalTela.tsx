"use client"

// (T29; refeita em 09/11) A TELA DO FINAL: quem toca a sequência (os momentos e os
// tempos moram em disco/final.ts; o 3D e a câmera, em estrada/FinalPovo.tsx). Sem
// tela preta: o jogo fica atrás o tempo todo, com as faixas de cinema (o cinema
// "lugar" da page.tsx). No "palco", tocar na tela é o gesto (o único do final); do
// gesto em diante a pessoa só assiste, e a CHUVA toca até o fim.
//
// Barato: só timers e um <p>; nada em 3D aqui.

import { useEffect, useRef, useState } from "react"
import { atalhosLiberados } from "../../teste/atalhos"
import { silenciarKombi, trilha } from "../som"
import { SOM_SINAL_FINAL } from "./sons"
import { FINAL_CFG, TEXTO_GESTO, definirMomento, duracao, proximo, type MomentoFinal } from "./final"

export function FinalTela({ inicio = "palco", onFim }: { inicio?: MomentoFinal; onFim: () => void }) {
  const [momento, setMomento] = useState<MomentoFinal>(inicio)
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })
  const acabou = useRef(false)
  const seguir = (m: MomentoFinal) => {
    const p = proximo(m)
    if (p) { setMomento(p); return }
    if (acabou.current) return
    acabou.current = true
    fimRef.current()
  }

  // o mundo (FinalPovo.tsx) fica sabendo do momento; saiu, a câmera volta pro jogo
  useEffect(() => { definirMomento(momento) }, [momento])
  useEffect(() => () => definirMomento(null), [])

  // a Kombi não toca nada no final. A CHUVA fica presa à tela inteira, não ao momento:
  // não reinicia nem corta nas trocas. Quem a inicia é o gesto (no toque, que destrava o
  // som no iPhone); link de teste de um momento do meio segue sem ela
  const tocando = useRef(false)
  useEffect(() => {
    silenciarKombi(true)
    return () => { if (tocando.current) trilha.sair(); silenciarKombi(false) }
  }, [])

  // o gesto: tocar na tela (ou espaço/enter), depois de um instante no palco
  const desde = useRef(0)
  useEffect(() => { desde.current = Date.now() }, [momento])
  const gesto = () => {
    if (momento !== "palco" || Date.now() - desde.current < FINAL_CFG.gestoEspera * 1000) return
    if (!tocando.current) { tocando.current = true; trilha.entrar(SOM_SINAL_FINAL) }
    seguir("palco")
  }
  const gestoRef = useRef(gesto)
  useEffect(() => { gestoRef.current = gesto })
  useEffect(() => {
    if (momento !== "palco") return
    const k = (e: KeyboardEvent) => { if (e.code === "Space" || e.code === "Enter") { e.preventDefault(); gestoRef.current() } }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [momento])

  // o tempo de cada momento depois do gesto
  useEffect(() => {
    const seg = duracao(momento)
    if (seg === null) return
    const t = setTimeout(() => seguir(momento), seg * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento])

  // atalho de teste (só fora da produção): __finalPular() passa pro próximo momento
  useEffect(() => {
    if (!atalhosLiberados()) return
    const w = window as unknown as Record<string, unknown>
    w.__finalPular = () => (momento === "palco" ? gestoRef.current() : seguir(momento))
    w.__finalMomento = momento
    return () => { delete w.__finalPular; delete w.__finalMomento }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento])

  if (momento !== "palco") return <div className="l-final" data-final={momento} />
  return (
    <div className="l-final">
      <div className="l-filme" data-final={momento} onPointerDown={(e) => { e.stopPropagation(); gesto() }}>
        <p className="l-filme-fala is-acao" style={{ ["--cor" as string]: "#e6f0ff" }}>{TEXTO_GESTO}</p>
      </div>
    </div>
  )
}
