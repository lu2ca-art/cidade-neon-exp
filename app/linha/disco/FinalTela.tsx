"use client"

// (T29) A TELA DO FINAL: quem toca a sequência (os momentos e os tempos moram em
// disco/final.ts; o 3D e a câmera, em estrada/FinalNove.tsx). Sem tela preta: o
// jogo fica atrás o tempo todo, com as faixas de cinema (o cinema "lugar" da
// page.tsx) e uma legenda curta por momento. Na despedida (o diálogo) entra o
// FILME (CenaFilme.tsx): hoje o provisório em legenda; quando o vídeo de IA
// existir, ele (FILME_DESPEDIDA.video). Tocar na tela passa pro próximo momento.
//
// Barato: só timers e um <p>; nada em 3D aqui.

import { useEffect, useRef, useState } from "react"
import { CenaFilme } from "../CenaFilme"
import { atalhosLiberados } from "../../teste/atalhos"
import { VOZES } from "../roteiros"
import { silenciarKombi, trilha } from "../som"
import { SOM_SINAL_FINAL } from "./sons"
import { FILME_DESPEDIDA, FINAL_CFG, LEGENDAS, NOVE, definirMomento, duracao, proximo, type MomentoFinal } from "./final"

export function FinalTela({ inicio = "sinal", onFim }: { inicio?: MomentoFinal; onFim: () => void }) {
  const [momento, setMomento] = useState<MomentoFinal>(inicio)
  // a legenda de agora dentro do momento (o "nove": uma por pessoa; o "quintal": duas)
  const [i, setI] = useState(0)
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })
  const acabou = useRef(false)
  const seguir = (m: MomentoFinal) => {
    const p = proximo(m)
    if (p) { setMomento(p); setI(0); return }
    if (acabou.current) return
    acabou.current = true
    fimRef.current()
  }

  // o mundo (FinalNove.tsx) fica sabendo do momento; saiu, a câmera volta pro jogo
  useEffect(() => { definirMomento(momento) }, [momento])
  useEffect(() => () => definirMomento(null), [])

  // (09/11) o sinal toca a CHUVA por cima; acabou o momento, a música de antes volta
  useEffect(() => {
    if (momento !== "sinal") return
    silenciarKombi(true)
    trilha.entrar(SOM_SINAL_FINAL)
    return () => { trilha.sair(); silenciarKombi(false) }
  }, [momento])

  // o tempo de cada momento de jogo (o "criador" é o filme quem acaba)
  useEffect(() => {
    const seg = duracao(momento)
    if (seg === null) return
    const t = setTimeout(() => seguir(momento), seg * 1000)
    // as legendas dentro do momento: o "nove" troca a cada pessoa; o resto divide o tempo
    const n = momento === "nove" ? NOVE.length : momento === "criador" ? 1 : LEGENDAS[momento].length
    const passo = momento === "nove" ? FINAL_CFG.porPonto : seg / n
    const ts = Array.from({ length: n - 1 }, (_, k) => setTimeout(() => setI(k + 1), passo * (k + 1) * 1000))
    return () => { clearTimeout(t); ts.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento])

  // atalho de teste (só fora da produção): __finalPular() passa pro próximo momento
  useEffect(() => {
    if (!atalhosLiberados()) return
    const w = window as unknown as Record<string, unknown>
    w.__finalPular = () => seguir(momento)
    w.__finalMomento = momento
    return () => { delete w.__finalPular; delete w.__finalMomento }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [momento])

  if (momento === "criador") return (
    <div className="l-final">
      <CenaFilme key="despedida" filme={FILME_DESPEDIDA} onFim={() => seguir("criador")} />
    </div>
  )
  // a legenda: no "nove", o nome de quem está na tela por cima da frase
  const leg = momento === "nove" ? { ...LEGENDAS.nove[0], de: NOVE[Math.min(i, NOVE.length - 1)].quem } : LEGENDAS[momento][Math.min(i, LEGENDAS[momento].length - 1)]
  const cor = momento === "nove" ? NOVE[Math.min(i, NOVE.length - 1)].cor : (leg.de && VOZES[leg.de]) || "#e6f0ff"
  return (
    <div className="l-final">
      <div className="l-filme" data-final={momento} onClick={(e) => { e.stopPropagation(); seguir(momento) }}>
        <p key={`${momento}:${i}`} className="l-filme-fala is-acao" style={{ ["--cor" as string]: cor }}>
          {leg.de && <small>{leg.de}</small>}
          {leg.texto}
          {leg.rascunho && <small className="l-final-rascunho">RASCUNHO · proposta</small>}
        </p>
      </div>
    </div>
  )
}
