"use client"

// T24 · A ARTE DA NIZZY (PROPOSTA, rascunho): filmar o clipe vertical da
// Rollercoaster. A música toca; três câmeras (a Nizzy de frente, o trilho de
// cima, a cidade passando). Você corta de uma pra outra (toque ou 1 2 3) no
// tempo da batida. O clipe fica com os cortes. Rascunho: conf.ts (CLIPE).

import { useEffect, useRef, useState } from "react"
import { PISTAS } from "../../estrada/pistas"
import { CLIPE } from "./conf"
import { bip, useMusica } from "./sons"
import type { PecaProps } from "./Peca"

export function Clipe({ onFim }: PecaProps) {
  const pista = PISTAS.find((p) => p.id === CLIPE.faixa)!
  const beat = 60 / pista.bpm
  const [cam, setCam] = useState(0)
  const [cortes, setCortes] = useState<{ cam: number; noTempo: boolean }[]>([])
  const pronto = cortes.length >= CLIPE.cortes
  const musica = useMusica(pista.inst, true)
  const pulso = useRef<HTMLDivElement>(null)
  // o quadro pulsa na batida (o REC e a borda), pra dar o tempo
  useEffect(() => {
    let raf = 0
    const q = () => {
      raf = requestAnimationFrame(q)
      const f = (musica.tempo() / beat) % 1
      if (pulso.current) pulso.current.style.setProperty("--p", String(1 - f))
    }
    raf = requestAnimationFrame(q)
    return () => cancelAnimationFrame(raf)
  }, [beat, musica])

  const cortar = (c: number) => {
    if (pronto || c === cam) return
    const t = musica.tempo()
    const d = Math.abs(t - Math.round(t / beat) * beat) * 1000
    const noTempo = d <= CLIPE.noTempoMs
    setCam(c)
    setCortes((x) => [...x, { cam: c, noTempo }])
    bip(noTempo ? 1568 : 784, 0.04, "square", 0.05)
  }
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (n >= 1 && n <= CLIPE.cameras.length) { e.preventDefault(); e.stopPropagation(); cortar(n - 1) }
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  })
  useEffect(() => { if (pronto) musica.parar() }, [pronto, musica])
  const noTempo = cortes.filter((c) => c.noTempo).length

  return (
    <div className="l-peca-clipe">
      <div ref={pulso} className={`l-clipe-quadro is-cam-${CLIPE.cameras[cam].id}`} aria-label={`câmera: ${CLIPE.cameras[cam].nome}`}>
        <div className="l-clipe-cena" key={cortes.length}>
          <i className="l-clipe-a" /><i className="l-clipe-b" /><i className="l-clipe-c" />
        </div>
        <span className="l-clipe-rec">● REC · {CLIPE.cameras[cam].nome}</span>
        <span className="l-clipe-conta">{cortes.length}/{CLIPE.cortes}</span>
      </div>
      <div className="l-clipe-cams" role="group" aria-label="as câmeras">
        {CLIPE.cameras.map((c, i) => (
          <button key={c.id} type="button" className={i === cam ? "is-no-ar" : ""} onClick={() => cortar(i)} disabled={pronto}><kbd>{i + 1}</kbd>{c.nome}</button>
        ))}
      </div>
      <ol className="l-clipe-fita" aria-label="os cortes">
        {cortes.map((c, i) => <li key={i} className={c.noTempo ? "is-tempo" : ""}>{CLIPE.cameras[c.cam].id.toUpperCase()}</li>)}
      </ol>
      {pronto ? (
        <div className="l-peca-fim">
          <p>{noTempo >= CLIPE.cortes / 2 ? "a Nizzy assiste duas vezes. \"esse corte aqui, na batida. posta.\"" : "a Nizzy ri. \"tá torto. é o meu jeito também. posta.\""}</p>
          <button type="button" className="is-volta" onClick={() => { setCortes([]); setCam(0) }}>filmar de novo</button>
          <button type="button" className="is-seguir" onClick={() => onFim(true, cortes.map((c) => CLIPE.cameras[c.cam].id + (c.noTempo ? "!" : "")))} autoFocus>postar o clipe →</button>
        </div>
      ) : <p className="l-peca-dica">corta na batida: toca numa câmera (ou 1 2 3)</p>}
    </div>
  )
}
