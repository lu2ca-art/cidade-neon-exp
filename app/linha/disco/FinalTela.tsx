"use client"

// (T29; refeita em 09/11 e em 16/11) A TELA DO FINAL: quem toca a sequência (os momentos e
// os tempos moram em disco/final.ts; o 3D e a câmera, em estrada/FinalPovo.tsx). Sem tela
// preta: o jogo fica atrás o tempo todo.
//   antes do show: a captura (uma linha por cima do palco), as incubadoras e a sala de
//                  controle (a cena do page.tsx avisa com seguirFinal quando cada uma acaba)
//   o show (16/11, o dono): o jogo acaba no show. A CHUVA toca UMA vez, a do show (assistir
//                  ou tocar). Assistindo, esta tela roda junto: o palco, o povo na rua, a
//                  chuva limpa e o deserto florescendo, e a floresta fica até a música acabar.
//                  Tocando, roda depois do show, curta (a chuva e a floresta), sem música.
// Nenhuma música sai daqui: saíram o gesto e a CHUVA que reiniciava.
// Barato: só timers e um <p>; nada em 3D aqui.

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { atalhosLiberados } from "../../teste/atalhos"
import { silenciarKombi } from "../som"
import { definirMomento, duracao, esperaAviso, lerFinal, ouvirFinal, proximo, type MomentoFinal } from "./final"
import { TEXTOS_FINAL } from "./finalTextos"

export function FinalTela({ inicio = "captura", assistindo = false, onFim, onMomento }: { inicio?: MomentoFinal; assistindo?: boolean; onFim: () => void; onMomento?: (m: MomentoFinal) => void }) {
  const [momento, setMomento] = useState<MomentoFinal>(inicio)
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })
  const momentoRef = useRef(onMomento)
  useEffect(() => { momentoRef.current = onMomento })
  const acabou = useRef(false)
  const seguir = (m: MomentoFinal) => {
    const p = proximo(m)
    if (p) { setMomento(p); return }
    if (acabou.current) return
    acabou.current = true
    fimRef.current()
  }

  // o mundo (FinalPovo.tsx) fica sabendo do momento; saiu, a câmera volta pro jogo
  useEffect(() => { definirMomento(momento); momentoRef.current?.(momento) }, [momento])
  // as cenas do prédio acabaram: segue (o page.tsx avisa pela loja)
  const vivo = useSyncExternalStore(ouvirFinal, lerFinal, lerFinal)
  useEffect(() => {
    if (esperaAviso(momento) && vivo.momento === momento && vivo.chegou) seguir(momento)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento, vivo])
  useEffect(() => () => definirMomento(null), [])
  // a Kombi não toca nada no final (a música, quando há, é a do show)
  useEffect(() => { silenciarKombi(true); return () => silenciarKombi(false) }, [])

  // o tempo de cada momento
  useEffect(() => {
    const seg = duracao(momento, assistindo)
    if (seg === null) return
    const t = setTimeout(() => seguir(momento), seg * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento, assistindo])

  // atalho de teste (só fora da produção): __finalPular() passa pro próximo momento
  useEffect(() => {
    if (!atalhosLiberados()) return
    const w = window as unknown as Record<string, unknown>
    w.__finalPular = () => seguir(momento)
    w.__finalMomento = momento
    return () => { delete w.__finalPular; delete w.__finalMomento }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento])

  // as incubadoras e a sala de controle são a cena delas (EntregaCena.tsx); assistindo, o show está por cima
  if (momento === "incubadoras" || momento === "controle" || assistindo) return null
  if (momento === "captura") return (
    <div className="l-final">
      <div className="l-filme" data-final={momento}>
        <p className="l-filme-fala" style={{ ["--cor" as string]: "#ff5a6e" }}>{TEXTOS_FINAL.captura}</p>
      </div>
    </div>
  )
  return <div className="l-final" data-final={momento} />
}
