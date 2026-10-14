"use client"

// RESPIRAR (13/10, LU2CA: sai do fliperama e vira um momento do mundo, o
// DopaminA). Com o Núcleo na sua cola, parar a Kombi longe deles abre o
// círculo: segura o dedo enquanto ele cresce (puxa o ar, 4 s), solta
// enquanto ele diminui (solta o ar, 4 s). Três respirações no ritmo e o Núcleo
// te perde. Uma saída pra quem não é de volante, e um respiro de verdade.

import { useEffect, useRef, useState } from "react"

const FASE = 4 // s pra puxar, s pra soltar
const PRECISA = 3

export function Respirar({ jaSabe, onFeito, onAprendeu }: { jaSabe: boolean; onFeito: () => void; onAprendeu: () => void }) {
  const [t, setT] = useState(0)
  const [boas, setBoas] = useState(0)
  const segura = useRef(false)
  const conta = useRef({ certo: 0, total: 0 })
  const ini = useRef(0)

  useEffect(() => {
    ini.current = performance.now()
    let raf = 0
    let cicloAnt = 0
    const loop = (agora: number) => {
      const tt = (agora - ini.current) / 1000
      setT(tt)
      // dentro do ciclo: puxando (0..FASE) e soltando (FASE..2*FASE)
      const fase = tt % (FASE * 2)
      const puxando = fase < FASE
      const meio = fase > 0.6 && Math.abs(fase - FASE) > 0.6 // tolerância na virada
      if (meio) { conta.current.total++; if (segura.current === puxando) conta.current.certo++ }
      const ciclo = Math.floor(tt / (FASE * 2))
      if (ciclo > cicloAnt) {
        cicloAnt = ciclo
        const ok = conta.current.total > 0 && conta.current.certo / conta.current.total > 0.7
        conta.current = { certo: 0, total: 0 }
        setBoas((b) => {
          const n = ok ? b + 1 : 0
          if (n >= PRECISA) setTimeout(onFeito, 300)
          return n
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [onFeito])

  const fase = t % (FASE * 2)
  const puxando = fase < FASE
  const k = puxando ? fase / FASE : 1 - (fase - FASE) / FASE
  const escala = 0.45 + 0.55 * (0.5 - Math.cos(k * Math.PI) / 2)

  return (
    <div
      className="l-respirar"
      onPointerDown={(e) => { e.stopPropagation(); segura.current = true; if (!jaSabe) onAprendeu() }}
      onPointerUp={() => { segura.current = false }}
      onPointerCancel={() => { segura.current = false }}
      onPointerLeave={() => { segura.current = false }}
    >
      <div className="l-respirar-circulo" style={{ transform: `scale(${escala})` }} />
      <b>{puxando ? "puxa" : "solta"}</b>
      <span className="l-respirar-conta">{Array.from({ length: PRECISA }, (_, i) => <i key={i} className={i < boas ? "is-on" : ""} />)}</span>
      {!jaSabe && <small>segura o dedo enquanto cresce · solta enquanto diminui</small>}
    </div>
  )
}
