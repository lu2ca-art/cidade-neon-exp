"use client"

// T25 · O JOGO DO TONY GORDO (decidido): regar a horta atrás do restaurante.
// Seis mudas no chão de terra. Segura em cima de uma (o dedo, o mouse, ou as
// setas + espaço) e a água cai: enche a muda até o ponto, e ela nasce. Regar
// demais encharca (a muda murcha um pouco). Todas nascidas: colher. conf.ts (HORTA).

import { useEffect, useRef, useState } from "react"
import { HORTA } from "./conf"
import { gota } from "../../som"
import type { PecaProps } from "./Peca"

export function Horta({ onFim }: PecaProps) {
  const n = HORTA.plantas.length
  const [agua, setAgua] = useState<number[]>(() => HORTA.plantas.map(() => 0))
  const [nasceu, setNasceu] = useState<boolean[]>(() => HORTA.plantas.map(() => false))
  const [sel, setSel] = useState(0)
  const [regando, setRegando] = useState<number | null>(null)
  const [aviso, setAviso] = useState<{ t: string; k: number } | null>(null)
  const st = useRef({ agua: agua.slice(), nasceu: nasceu.slice(), gotaT: 0 })

  useEffect(() => {
    if (regando === null) return
    let raf = 0, ult = performance.now()
    const q = (agora: number) => {
      raf = requestAnimationFrame(q)
      const dt = Math.min(0.05, (agora - ult) / 1000); ult = agora
      const s = st.current, i = regando
      s.agua[i] += dt / HORTA.regaS
      s.gotaT -= dt
      if (s.gotaT <= 0) { s.gotaT = 0.18; gota(2 + Math.floor(Math.random() * 3)) }
      if (s.agua[i] >= 1 && !s.nasceu[i]) { s.nasceu[i] = true; setNasceu(s.nasceu.slice()); setAviso({ t: `${HORTA.plantas[i]} nasceu`, k: performance.now() }) }
      if (s.agua[i] >= HORTA.demaisS / HORTA.regaS) { s.agua[i] = 0.6; s.nasceu[i] = false; setNasceu(s.nasceu.slice()); setAviso({ t: "encharcou. devagar", k: performance.now() }); setRegando(null) }
      setAgua(s.agua.slice())
    }
    raf = requestAnimationFrame(q)
    return () => cancelAnimationFrame(raf)
  }, [regando])
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { setSel((s) => (s + 1) % n); setRegando(null) }
      else if (e.key === "ArrowLeft") { setSel((s) => (s + n - 1) % n); setRegando(null) }
      else if (e.key === "ArrowDown") { setSel((s) => (s + 3) % n); setRegando(null) }
      else if (e.key === "ArrowUp") { setSel((s) => (s + n - 3) % n); setRegando(null) }
      else if (e.key === " " && !e.repeat) setRegando(sel)
      else return
      e.preventDefault(); e.stopPropagation()
    }
    const ku = (e: KeyboardEvent) => { if (e.key === " ") setRegando(null) }
    window.addEventListener("keydown", kd, true); window.addEventListener("keyup", ku, true)
    return () => { window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
  })
  const todas = nasceu.every(Boolean)

  return (
    <div className="l-peca-horta">
      <p className="l-peca-dica">atrás do restaurante, um pedaço de terra que ninguém olha. o Tony: &quot;aqui em cima nada nasce. tenta.&quot;</p>
      <div className="l-horta-chao" onPointerUp={() => setRegando(null)} onPointerLeave={() => setRegando(null)}>
        {HORTA.plantas.map((p, i) => (
          <button key={p} type="button" aria-label={`${p}: ${nasceu[i] ? "nasceu" : `água ${Math.round(Math.min(1, agua[i]) * 100)}%`}`}
            className={`l-horta-muda ${nasceu[i] ? "is-nasceu" : ""} ${sel === i ? "is-sel" : ""} ${regando === i ? "is-regando" : ""}`}
            style={{ ["--a" as string]: String(Math.min(1, agua[i])), ["--h" as string]: String(i * 47) }}
            onPointerDown={(e) => { e.preventDefault(); setSel(i); setRegando(i) }} onPointerUp={() => setRegando(null)}>
            <i className="l-horta-planta" /><span className="l-horta-agua" /><small>{p}</small>
          </button>
        ))}
      </div>
      {aviso && <p key={aviso.k} className="l-peca-aviso">{aviso.t}</p>}
      <p className="l-peca-placar">{nasceu.filter(Boolean).length} de {n} nasceram · segura em cima pra regar (ou espaço)</p>
      {todas && (
        <div className="l-peca-fim">
          <p>o Tony olha a terra verde como quem vê um fantasma. &quot;colhe. hoje a gente come.&quot;</p>
          <button type="button" className="is-seguir" onClick={() => onFim(true, HORTA.plantas.slice())} autoFocus>colher →</button>
        </div>
      )}
    </div>
  )
}
