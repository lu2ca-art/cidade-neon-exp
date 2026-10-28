"use client"

// T15 · A ARTE DO DREW (PROPOSTA, rascunho): dançar na balada, marcando o ritmo.
// A Sexta-Feira toca; a cada batida um anel fecha no centro da pista e você
// bate (toque na tela, espaço ou qualquer seta) quando ele encosta. O Drew
// dança junto; acertou, a balada acende. Os números em conf.ts (DANCA).

import { useEffect, useRef, useState } from "react"
import { PISTAS } from "../../estrada/pistas"
import { DANCA } from "./conf"
import { bip, useMusica } from "./sons"
import type { PecaProps } from "./Peca"

export function Danca({ cor, onFim }: PecaProps) {
  const pista = PISTAS.find((p) => p.id === DANCA.faixa)!
  const beat = 60 / pista.bpm
  const [rodada, setRodada] = useState(0)
  const [placar, setPlacar] = useState({ certo: 0, quase: 0, fora: 0 })
  const [fim, setFim] = useState(false)
  const [msg, setMsg] = useState<{ t: string; k: number } | null>(null)
  const musica = useMusica(pista.inst, !fim)
  const anel = useRef<HTMLDivElement>(null)
  const pista3 = useRef<HTMLDivElement>(null)
  const julgadas = useRef(new Set<number>())
  const placarRef = useRef(placar)
  useEffect(() => { placarRef.current = placar }, [placar])
  const total = DANCA.batidas - DANCA.entrada

  // o anel: fecha a cada batida (a partir da entrada); quando passou da última, acabou
  useEffect(() => {
    if (fim) return
    julgadas.current = new Set()
    let raf = 0
    const quadro = () => {
      raf = requestAnimationFrame(quadro)
      const t = musica.tempo()
      const b = t / beat
      const fase = b - Math.floor(b)
      if (anel.current) {
        const ativo = b >= DANCA.entrada - 1
        anel.current.style.transform = `translate(-50%, -50%) scale(${1 + (1 - fase) * 1.6})`
        anel.current.style.opacity = ativo ? String(0.35 + fase * 0.65) : "0.15"
      }
      // as batidas que passaram sem toque contam como fora
      const ult = Math.floor(b - DANCA.quaseMs / 1000 / beat)
      for (let i = DANCA.entrada; i <= ult && i < DANCA.batidas; i++) {
        if (!julgadas.current.has(i)) { julgadas.current.add(i); setPlacar((p) => ({ ...p, fora: p.fora + 1 })) }
      }
      if (b > DANCA.batidas + 0.5) { cancelAnimationFrame(raf); musica.parar(); setFim(true) }
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fim, rodada])

  const bater = () => {
    if (fim) return
    const t = musica.tempo()
    const i = Math.round(t / beat)
    if (i < DANCA.entrada || i >= DANCA.batidas || julgadas.current.has(i)) return
    const dms = Math.abs(t - i * beat) * 1000
    if (dms > DANCA.quaseMs) return
    julgadas.current.add(i)
    const certo = dms <= DANCA.certoMs
    setPlacar((p) => (certo ? { ...p, certo: p.certo + 1 } : { ...p, quase: p.quase + 1 }))
    setMsg({ t: certo ? "no tempo" : "quase", k: i })
    bip(certo ? 1319 : 880, 0.05, "square", 0.06)
    pista3.current?.classList.remove("is-acende")
    void pista3.current?.offsetWidth
    pista3.current?.classList.add("is-acende")
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === " " || e.key.startsWith("Arrow") || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); bater() }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  })

  const nota = total ? (placar.certo + placar.quase * 0.5) / total : 1
  return (
    <div className="l-peca-danca" style={{ ["--beat" as string]: `${beat}s`, ["--cor" as string]: cor }}>
      <div ref={pista3} className="l-danca-pista" onPointerDown={(e) => { e.preventDefault(); bater() }} aria-label="a pista da balada: bate no tempo">
        <i className="l-danca-luz is-a" /><i className="l-danca-luz is-b" /><i className="l-danca-luz is-c" />
        <div className="l-danca-drew" aria-hidden><b /><span /></div>
        <div className="l-danca-alvo" />
        <div ref={anel} className="l-danca-anel" />
        {msg && <em key={msg.k} className="l-danca-msg">{msg.t}</em>}
      </div>
      <p className="l-peca-dica">{fim ? "" : "toca na pista (ou espaço) quando o anel fecha no centro"}</p>
      <p className="l-peca-placar"><b>{placar.certo}</b> no tempo · {placar.quase} quase · {placar.fora} fora · de {total}</p>
      {fim && (
        <div className="l-peca-fim">
          <p>{nota >= DANCA.minimo ? "o Drew parou de dançar sozinho. a pista encheu." : "o Drew riu: \"de novo? a sexta é longa.\""}</p>
          {nota < DANCA.minimo && <button type="button" className="is-volta" onClick={() => { setPlacar({ certo: 0, quase: 0, fora: 0 }); setFim(false); setRodada((r) => r + 1) }}>de novo</button>}
          <button type="button" className="is-seguir" onClick={() => onFim(true, [`${Math.round(nota * 100)}%`])} autoFocus>seguir →</button>
        </div>
      )}
    </div>
  )
}
