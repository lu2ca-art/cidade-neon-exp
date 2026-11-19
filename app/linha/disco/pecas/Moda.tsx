"use client"

// T15 · A ARTE DO DREW (bloco 1 · A3, 30/10): moda sustentável e high fashion.
// Montar um look com o que sobrou no subúrbio (uma peça por parte do corpo,
// tudo reciclado) e desfilar; o Drew olha o conjunto. O look fica no save
// (obras13 "drew:arte"). Os nomes e as cores em conf.ts (MODA).

import { useEffect, useState } from "react"
import { MODA } from "./conf"
import { bip, ruido } from "./sons"
import type { PecaProps } from "./Peca"

export function Moda({ onFim }: PecaProps) {
  const [esc, setEsc] = useState<(number | null)[]>(() => MODA.partes.map(() => null))
  const [parte, setParte] = useState(0)
  const [desfile, setDesfile] = useState(false)
  const pronto = esc.every((x) => x !== null)
  const look = MODA.partes.map((p, i) => (esc[i] === null ? null : p.opcoes[esc[i]!]))
  const cores = new Set(look.filter(Boolean).map((x) => x!.cor)).size
  const fala = cores >= 5 ? MODA.falas.ousado : cores >= 3 ? MODA.falas.certo : MODA.falas.calmo
  const obra = () => look.map((x) => x?.nome ?? "")

  const escolher = (i: number, o: number) => {
    setEsc((e) => e.map((x, k) => (k === i ? o : x)))
    ruido(0.05, 0.08, 0, 3000)
    bip(660 + o * 110, 0.05, "triangle", 0.05)
    if (i === parte && parte < MODA.partes.length - 1) setParte(parte + 1)
  }
  useEffect(() => {
    if (!desfile) return
    // o desfile: quatro passos na passarela
    ;[0, 1, 2, 3].forEach((k) => bip(k % 2 ? 196 : 147, 0.12, "sine", 0.18, k * 0.42))
    bip(1319, 0.3, "triangle", 0.06, 1.8)
  }, [desfile])
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (desfile) { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); onFim(true, obra()) } return }
      const k = Number(e.key)
      if (k >= 1 && k <= MODA.partes[parte].opcoes.length) { e.preventDefault(); e.stopPropagation(); escolher(parte, k - 1) }
      else if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); setParte((p) => Math.max(0, p - 1)) }
      else if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); setParte((p) => Math.min(MODA.partes.length - 1, p + 1)) }
      else if (e.key === "Enter" && pronto) { e.preventDefault(); e.stopPropagation(); setDesfile(true) }
    }
    window.addEventListener("keydown", kd, true)
    return () => window.removeEventListener("keydown", kd, true)
  })

  const cor = (i: number) => look[i]?.cor ?? "rgba(255, 255, 255, 0.08)"
  return (
    <div className="l-peca-moda">
      <div className={`l-moda-manequim ${desfile ? "is-desfile" : ""}`} aria-label="o look">
        <i className="is-cabeca" style={{ background: cor(0) }} />
        <i className="is-rosto" />
        <i className="is-tronco" style={{ background: cor(1) }} />
        <i className="is-acessorio" style={{ background: look[4] ? cor(4) : "transparent" }} />
        <i className="is-pernas" style={{ background: cor(2) }} />
        <i className="is-pes" style={{ background: cor(3) }} />
      </div>
      {!desfile ? (
        <>
          <p className="l-peca-dica">na casa do Drew, tudo que sobrou no subúrbio vira roupa. escolhe uma peça pra cada parte e desfila.</p>
          <div className="l-moda-partes" role="tablist" aria-label="as partes do look">
            {MODA.partes.map((p, i) => (
              <button key={p.id} type="button" role="tab" aria-selected={i === parte} className={`${i === parte ? "is-agora" : ""} ${esc[i] !== null ? "is-feita" : ""}`} onClick={() => setParte(i)}>{p.nome}</button>
            ))}
          </div>
          <div className="l-moda-opcoes" role="group" aria-label={MODA.partes[parte].nome}>
            {MODA.partes[parte].opcoes.map((o, k) => (
              <button key={o.nome} type="button" className={esc[parte] === k ? "is-esc" : ""} onClick={() => escolher(parte, k)}>
                <i style={{ background: o.cor }} /><kbd>{k + 1}</kbd>{o.nome}
              </button>
            ))}
          </div>
          <div className="l-peca-fim"><button type="button" className="is-seguir" disabled={!pronto} onClick={() => setDesfile(true)}>desfilar →</button></div>
        </>
      ) : (
        <div className="l-peca-fim">
          <p className="l-moda-look">{look.map((x) => x?.nome).join(" · ")}</p>
          <p>o Drew olha de cima a baixo. {fala}</p>
          <button type="button" className="is-volta" onClick={() => setDesfile(false)}>trocar o look</button>
          <button type="button" className="is-seguir" onClick={() => onFim(true, obra())} autoFocus>seguir →</button>
        </div>
      )}
    </div>
  )
}
