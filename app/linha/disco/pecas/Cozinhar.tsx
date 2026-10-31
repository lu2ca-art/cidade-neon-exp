"use client"

// T25 · A ARTE DO TONY GORDO (aprovada 30/10): cozinhar um prato com o
// que nasceu na horta. Escolhe 3 do que nasceu; segura o fogo até o ponto
// (solta na faixa clara); o Tony prova. O prato fica no save. conf.ts (COZINHAR).

import { useEffect, useRef, useState } from "react"
import { COZINHAR, HORTA } from "./conf"
import { ruido, bip } from "./sons"
import type { PecaProps } from "./Peca"

type Fase = "escolher" | "fogo" | "provar"

export function Cozinhar({ onFim }: PecaProps) {
  const [esc, setEsc] = useState<string[]>([])
  const [fase, setFase] = useState<Fase>("escolher")
  const [ponto, setPonto] = useState(0)
  const [segura, setSegura] = useState(false)
  const pontoRef = useRef(0)

  useEffect(() => {
    if (fase !== "fogo" || !segura) return
    let raf = 0, ult = performance.now(), chi = 0
    const q = (agora: number) => {
      raf = requestAnimationFrame(q)
      const dt = Math.min(0.05, (agora - ult) / 1000); ult = agora
      pontoRef.current = Math.min(1, pontoRef.current + dt * COZINHAR.fogo)
      chi -= dt
      if (chi <= 0) { chi = 0.12; ruido(0.1, 0.05, 0, 2500) }
      setPonto(pontoRef.current)
      if (pontoRef.current >= 1) { setSegura(false); setFase("provar") }
    }
    raf = requestAnimationFrame(q)
    return () => cancelAnimationFrame(raf)
  }, [fase, segura])
  const trocar = (p: string) => setEsc((x) => (x.includes(p) ? x.filter((y) => y !== p) : x.length < COZINHAR.escolher ? [...x, p] : x))
  const resultado = ponto < COZINHAR.ponto[0] ? "cru" : ponto > COZINHAR.ponto[1] ? "queimado" : "bom"
  const soltar = () => { if (fase === "fogo" && segura) { setSegura(false); if (pontoRef.current > 0.05) setFase("provar") } }
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (fase === "escolher") {
        const k = Number(e.key)
        if (k >= 1 && k <= HORTA.plantas.length) { e.preventDefault(); e.stopPropagation(); trocar(HORTA.plantas[k - 1]) }
        else if (e.key === "Enter" && esc.length === COZINHAR.escolher) { e.preventDefault(); e.stopPropagation(); setFase("fogo") }
      } else if (fase === "fogo" && e.key === " " && !e.repeat) { e.preventDefault(); e.stopPropagation(); setSegura(true) }
      else if (fase === "provar" && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onFim(true, [...esc, resultado]) }
    }
    const ku = (e: KeyboardEvent) => { if (e.key === " ") soltar() }
    window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku, true)
    return () => { window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
  })
  useEffect(() => { if (fase === "provar") bip(resultado === "bom" ? 1046 : 523, 0.25, "triangle", 0.08) }, [fase, resultado])

  return (
    <div className="l-peca-cozinhar">
      {fase === "escolher" && (
        <>
          <p className="l-peca-dica">na cozinha do restaurante, pela primeira vez sem a ração. escolhe {COZINHAR.escolher} do que nasceu.</p>
          <div className="l-cozinhar-ingr" role="group" aria-label="o que nasceu">
            {HORTA.plantas.map((p, i) => <button key={p} type="button" className={esc.includes(p) ? "is-esc" : ""} onClick={() => trocar(p)}><kbd>{i + 1}</kbd>{p}</button>)}
          </div>
          <div className="l-peca-fim"><button type="button" className="is-seguir" disabled={esc.length !== COZINHAR.escolher} onClick={() => setFase("fogo")}>pro fogo →</button></div>
        </>
      )}
      {fase === "fogo" && (
        <>
          <p className="l-peca-dica">segura o fogo e solta no ponto (a faixa clara). {esc.join(", ")}.</p>
          <div className="l-cozinhar-barra" style={{ ["--ini" as string]: String(COZINHAR.ponto[0]), ["--fim" as string]: String(COZINHAR.ponto[1]) }}>
            <i style={{ transform: `scaleX(${ponto})` }} />
          </div>
          <button type="button" className={`l-cozinhar-fogo ${segura ? "is-on" : ""}`} style={{ touchAction: "none" }}
            onPointerDown={(e) => { e.preventDefault(); setSegura(true) }} onPointerUp={soltar} onPointerLeave={soltar} onPointerCancel={soltar}>
            {segura ? "no fogo…" : "segurar o fogo"}
          </button>
        </>
      )}
      {fase === "provar" && (
        <div className="l-peca-fim">
          <p className="l-cozinhar-prato">{esc.join(" · ")} <small>({resultado})</small></p>
          <p>o Tony prova. {COZINHAR.falas[resultado]}</p>
          {resultado !== "bom" && <button type="button" className="is-volta" onClick={() => { pontoRef.current = 0; setPonto(0); setFase("fogo") }}>fazer de novo</button>}
          <button type="button" className="is-seguir" onClick={() => onFim(true, [...esc, resultado])} autoFocus>servir →</button>
        </div>
      )}
    </div>
  )
}
