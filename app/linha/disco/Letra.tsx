"use client"

// A ARTE DA MISSÃO DO LU2CA: ESCREVER A LETRA (T19). Rascunho configurável
// (disco/letras.ts): 4 versos, cada um escolhido entre 3 pedaços ou escrito à
// mão. A estrofe vai pro save e aparece no show, embaixo do afinador.
// Teclado: 1 2 3 escolhem; Enter sobe no palco quando a estrofe está pronta.

import { useEffect, useRef, useState } from "react"
import type { ConfigLetra } from "./letras"

export function Letra({ conf, cor, quem, onFim }: { conf: ConfigLetra; cor: string; quem: string; onFim: (linhas: string[]) => void }) {
  const [linhas, setLinhas] = useState<string[]>([])
  const [escrevendo, setEscrevendo] = useState(false)
  const [texto, setTexto] = useState("")
  const campo = useRef<HTMLInputElement>(null)
  const i = linhas.length
  const verso = conf.versos[i] ?? null
  const pronta = linhas.length >= Math.min(conf.minimo, conf.versos.length)

  const escolher = (l: string) => {
    const v = l.trim().slice(0, conf.maxLetras)
    if (!v || !verso) return
    setLinhas((x) => [...x, v])
    setTexto("")
    setEscrevendo(false)
  }

  useEffect(() => { if (escrevendo) campo.current?.focus() }, [escrevendo])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (escrevendo) return
      const n = Number(e.key)
      if (verso && n >= 1 && n <= verso.opcoes.length) { escolher(verso.opcoes[n - 1]); e.preventDefault(); e.stopPropagation() }
      else if (e.key === "Enter" && pronta) { onFim(linhas); e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  })

  return (
    <div className="l-letra" style={{ ["--cor" as string]: cor }} role="dialog" aria-label="escrever a letra" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-letra-caixa">
        <small>a missão de {quem} · a arte</small>
        <b>escrever a letra</b>
        <p className="l-letra-mote">{conf.mote}</p>
        <div className="l-letra-papel" aria-label="a estrofe">
          <em>{conf.titulo}</em>
          {conf.versos.map((v, k) => (
            <p key={k} className={k < linhas.length ? "is-escrito" : k === i ? "is-agora" : ""}>
              {linhas[k] ?? (k === i ? "…" : "")}
            </p>
          ))}
        </div>
        {verso && !escrevendo && (
          <div className="l-letra-opcoes" role="group" aria-label={`o verso ${i + 1}: ${verso.deixa}`}>
            <small>verso {i + 1} de {conf.versos.length} · {verso.deixa}</small>
            {verso.opcoes.map((o, k) => (
              <button key={o} type="button" onClick={() => escolher(o)}><kbd>{k + 1}</kbd>{o}</button>
            ))}
            {conf.livre && <button type="button" className="is-livre" onClick={() => setEscrevendo(true)}>escrever o meu ✎</button>}
          </div>
        )}
        {verso && escrevendo && (
          <form className="l-letra-livre" onSubmit={(e) => { e.preventDefault(); escolher(texto) }}>
            <input ref={campo} value={texto} maxLength={conf.maxLetras} placeholder="o seu verso" onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
            <button type="submit" disabled={!texto.trim()}>ok</button>
            <button type="button" className="is-volta" onClick={() => setEscrevendo(false)}>voltar</button>
          </form>
        )}
        <div className="l-letra-fim">
          {i > 0 && <button type="button" className="is-volta" onClick={() => setLinhas((x) => x.slice(0, -1))}>apagar o último</button>}
          {pronta && <button type="button" className="is-subir" onClick={() => onFim(linhas)} autoFocus>subir no palco →</button>}
        </div>
      </div>
    </div>
  )
}
