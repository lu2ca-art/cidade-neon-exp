"use client"

// T16 · A ARTE DO MUBARAK (decidido 28/10): apreciar um disco antigo. É ele
// quem põe a música daquele lugar. O caixote dele (os vinis antigos do jogo,
// vinis.json): escolhe um, ele vai pro prato, você baixa a agulha e ouve, com
// o chiado do vinil. Ouviu um pouco, ele fala. Rascunho: conf.ts (DISCO_ANTIGO).

import { useEffect, useRef, useState } from "react"
import VINIS from "../../vinis.json"
import { DISCO_ANTIGO } from "./conf"
import { ruido, useMusica } from "./sons"
import type { PecaProps } from "./Peca"

type Vinil = { titulo: string; autor: string; src: string; ano?: number }
const CAIXOTE = (VINIS as Vinil[]).slice(0, DISCO_ANTIGO.noCaixote)

function Tocando({ v, onOuviu }: { v: Vinil; onOuviu: () => void }) {
  useMusica(v.src, true)
  const fim = useRef(onOuviu)
  useEffect(() => { fim.current = onOuviu }, [onOuviu])
  // o chiado do vinil, por cima
  useEffect(() => {
    const t = setInterval(() => { if (Math.random() < 0.6) ruido(0.02 + Math.random() * 0.03, 0.03 + Math.random() * 0.04, 0, 6000) }, 140)
    const f = setTimeout(() => fim.current(), DISCO_ANTIGO.ouvirS * 1000)
    return () => { clearInterval(t); clearTimeout(f) }
  }, [])
  return null
}

export function DiscoAntigo({ onFim }: PecaProps) {
  const [vinil, setVinil] = useState<number | null>(null)
  const [agulha, setAgulha] = useState(false)
  const [ouviu, setOuviu] = useState(false)
  const v = vinil !== null ? CAIXOTE[vinil] : null
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (!agulha && n >= 1 && n <= CAIXOTE.length) { e.preventDefault(); e.stopPropagation(); setVinil(n - 1) }
      else if (e.key === " " && v && !agulha) { e.preventDefault(); e.stopPropagation(); setAgulha(true) }
      else if (e.key === "Enter" && ouviu && v) { e.preventDefault(); e.stopPropagation(); onFim(true, [v.titulo]) }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  })
  return (
    <div className="l-peca-disco">
      <p className="l-peca-dica">{!v ? "o Mubarak puxa um caixote de baixo do balcão. \"escolhe um. com cuidado.\"" : !agulha ? "o disco no prato. baixa a agulha." : ouviu ? "" : "ninguém fala. só o disco."}</p>
      {!agulha && (
        <div className="l-disco-caixote" role="group" aria-label="o caixote de discos">
          {CAIXOTE.map((d, i) => (
            <button key={d.src} type="button" className={vinil === i ? "is-esc" : ""} onClick={() => setVinil(i)} style={{ ["--h" as string]: String(i * 71 + 20) }}>
              <kbd>{i + 1}</kbd><b>{d.titulo}</b><small>{d.autor}{d.ano ? ` · ${d.ano}` : ""}</small>
            </button>
          ))}
        </div>
      )}
      <div className={`l-disco-vitrola ${agulha ? "is-tocando" : ""} ${v ? "is-com-disco" : ""}`}>
        <div className="l-disco-prato"><i className="l-disco-vinil"><span>{v?.titulo ?? ""}</span></i></div>
        <button type="button" className="l-disco-braco" aria-label={agulha ? "a agulha no disco" : "baixar a agulha"} disabled={!v || agulha} onClick={() => setAgulha(true)} />
      </div>
      {v && !agulha && <div className="l-peca-fim"><button type="button" className="is-seguir" onClick={() => setAgulha(true)} autoFocus>baixar a agulha</button></div>}
      {v && agulha && <Tocando v={v} onOuviu={() => setOuviu(true)} />}
      {ouviu && v && (
        <div className="l-peca-fim">
          <p>&quot;{DISCO_ANTIGO.fala}&quot;</p>
          <button type="button" className="is-seguir" onClick={() => onFim(true, [v.titulo])} autoFocus>seguir →</button>
        </div>
      )}
    </div>
  )
}
