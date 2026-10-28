"use client"

// T18 · A ARTE DO XERIFF (PROPOSTA, rascunho): gravar a vinheta da rádio
// pirata. Quatro trilhas (a abertura, a batida, a voz, o fecho), uma escolha
// em cada (ouve ao tocar). "Gravar": a vinheta inteira toca em REC e fica no
// save. Teclado: 1 2 3 escolhem a trilha de agora; Enter grava. Rascunho: conf.ts.

import { useEffect, useState } from "react"
import { VINHETA } from "./conf"
import { bip, bumbo, caixa, palma, ruido } from "./sons"
import type { PecaProps } from "./Peca"

// cada pedaço, sintetizado (começando em `q` segundos), devolve quanto dura
function tocarPedaco(trilha: string, i: number, q: number): number {
  if (trilha === "abre") {
    if (i === 0) { bip(1400, 0.9, "sawtooth", 0.06, q, 500); return 0.9 }
    if (i === 1) { ruido(0.7, 0.16, q, 2500); bip(2200, 0.12, "sine", 0.05, q + 0.55); return 0.8 }
    for (let k = 0; k < 3; k++) bip(1760, 0.08, "square", 0.08, q + k * 0.16)
    return 0.6
  }
  if (trilha === "batida") {
    const b = 0.22
    for (let k = 0; k < 4; k++) {
      if (i === 0) { bumbo(q + k * 2 * b); caixa(q + (k * 2 + 1) * b) }
      else if (i === 1) bumbo(q + k * 2 * b, 0.6)
      else palma(q + (k * 2 + 1) * b)
    }
    return 8 * b
  }
  if (trilha === "voz") {
    const frase = VINHETA.trilhas[2].opcoes[i].replace(/"/g, "")
    try {
      const fala = new SpeechSynthesisUtterance(frase)
      fala.lang = "pt-BR"; fala.rate = 0.95; fala.pitch = 0.6
      setTimeout(() => { try { speechSynthesis.cancel(); speechSynthesis.speak(fala) } catch {} }, q * 1000)
    } catch {}
    // por baixo, o rádio de polícia: um chiado que abre e fecha a frase
    ruido(0.12, 0.12, q, 3000); ruido(0.12, 0.12, q + 1.5, 3000)
    return 1.7
  }
  // o fecho
  if (i === 0) { bip(500, 0.9, "sawtooth", 0.06, q, 1400); return 0.9 }
  if (i === 1) { bip(330, 0.7, "triangle", 0.1, q, 60); return 0.7 }
  for (const f of [262, 330, 392]) bip(f, 1.1, "triangle", 0.07, q)
  return 1.1
}

export function Vinheta({ onFim }: PecaProps) {
  const [esc, setEsc] = useState<(number | null)[]>(VINHETA.trilhas.map(() => null))
  const [gravando, setGravando] = useState(false)
  const [gravada, setGravada] = useState(false)
  const agora = esc.findIndex((x) => x === null)
  const pronta = agora === -1

  const escolher = (t: number, i: number) => {
    if (gravando) return
    setEsc((e) => e.map((x, k) => (k === t ? i : x)))
    tocarPedaco(VINHETA.trilhas[t].id, i, 0.02)
  }
  const gravar = () => {
    if (!pronta || gravando) return
    setGravando(true)
    let q = 0.05
    VINHETA.trilhas.forEach((t, k) => { q += tocarPedaco(t.id, esc[k]!, q) + 0.08 })
    setTimeout(() => { setGravando(false); setGravada(true) }, q * 1000 + 200)
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (!pronta && n >= 1 && n <= 3) { e.preventDefault(); e.stopPropagation(); escolher(agora, n - 1) }
      else if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (gravada) onFim(true, esc.map((x, k) => VINHETA.trilhas[k].opcoes[x!])); else gravar() }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  })

  return (
    <div className="l-peca-vinheta">
      <p className="l-peca-dica">o Xeriff liga o gravador de fita: &quot;a polícia tem a frequência dela. a gente vai ter a nossa. monta a vinheta.&quot;</p>
      <ol className="l-vinheta-trilhas">
        {VINHETA.trilhas.map((t, k) => (
          <li key={t.id} className={k === agora ? "is-agora" : esc[k] !== null ? "is-feita" : ""}>
            <small>{t.nome}</small>
            <div>
              {t.opcoes.map((o, i) => (
                <button key={o} type="button" className={esc[k] === i ? "is-esc" : ""} onClick={() => escolher(k, i)} disabled={gravando}>
                  {k === agora && <kbd>{i + 1}</kbd>}{o}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className={`l-vinheta-fita ${gravando ? "is-rec" : ""}`} aria-live="polite">
        <i /><i />
        <span>{gravando ? "● REC" : gravada ? `${VINHETA.nome} · gravada` : pronta ? "pronta pra gravar" : `falta ${esc.filter((x) => x === null).length}`}</span>
      </div>
      <div className="l-peca-fim">
        {pronta && !gravada && <button type="button" className="is-seguir" onClick={gravar} disabled={gravando}>{gravando ? "gravando…" : "gravar ●"}</button>}
        {gravada && <button type="button" className="is-volta" onClick={gravar} disabled={gravando}>ouvir de novo</button>}
        {gravada && <button type="button" className="is-seguir" onClick={() => onFim(true, esc.map((x, k) => VINHETA.trilhas[k].opcoes[x!]))}>levar pro Xeriff →</button>}
      </div>
    </div>
  )
}
