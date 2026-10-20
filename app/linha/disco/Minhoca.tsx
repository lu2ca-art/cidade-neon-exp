"use client"

// O BURACO DE MINHOCA (LU2CA 19/10: "o jogo começa num hyperlapse dentro de um
// buraco de minhoca, até cair no deserto"). Os mesmos anéis do hyperlapse da
// pista (.l-hyper), por cima de um túnel de luz que acelera; no fim, o clarão
// e a Kombi cai no deserto (a queda é no Corrida). ~7 s; um toque pula.

import { useEffect, useRef } from "react"
import { vento } from "../som"

const DUR = 7200

export function Minhoca({ onFim }: { onFim: () => void }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const hyper = useRef<HTMLDivElement>(null)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  const feito = useRef(false)
  const acabar = () => { if (feito.current) return; feito.current = true; fim.current() }
  useEffect(() => {
    const w = vento()
    const cv = tela.current, g = cv?.getContext("2d")
    let raf = 0, acabou = false
    const t0 = performance.now()
    // as estrelas do túnel: ângulo, distância (z) e cor
    const N = 420
    const est = Array.from({ length: N }, (_, i) => ({ a: Math.random() * Math.PI * 2, z: Math.random(), r: 0.6 + Math.random() * 0.5, h: (i * 37) % 360 }))
    const quadro = (agora: number) => {
      const p = Math.min(1, (agora - t0) / DUR)
      if (cv && g) {
        const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio)
        if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        // o rastro: o quadro anterior apaga devagar (a luz estica)
        g.fillStyle = `rgba(4, 2, 12, ${0.28 - p * 0.18})`
        g.fillRect(0, 0, W, H)
        const cx = W / 2 + Math.sin(agora / 900) * W * 0.04 * (1 - p), cy = H * 0.46 + Math.cos(agora / 1100) * H * 0.03 * (1 - p)
        const vel = 0.25 + p * p * 3.2
        const giro = agora / 1000 * (0.4 + p * 1.6)
        const R = Math.hypot(W, H) * 0.6
        g.globalCompositeOperation = "lighter"
        for (const s of est) {
          const z0 = s.z
          s.z -= vel * 0.016
          if (s.z <= 0.02) { s.z = 1; continue }
          const k0 = 1 / z0, k1 = 1 / s.z
          const a = s.a + giro
          const x0 = cx + Math.cos(a) * s.r * k0 * R * 0.06, y0 = cy + Math.sin(a) * s.r * k0 * R * 0.06
          const x1 = cx + Math.cos(a) * s.r * k1 * R * 0.06, y1 = cy + Math.sin(a) * s.r * k1 * R * 0.06
          g.strokeStyle = `hsla(${s.h + agora / 20}, 100%, ${60 + p * 25}%, ${Math.min(1, (1 - s.z) * 1.4)})`
          g.lineWidth = 0.6 + (1 - s.z) * 2.2
          g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
        }
        g.globalCompositeOperation = "source-over"
        // a boca do túnel (o branco do outro lado)
        const boca = g.createRadialGradient(cx, cy, 0, cx, cy, 30 + p * p * R)
        boca.addColorStop(0, `rgba(255,255,255,${0.35 + p * 0.65})`)
        boca.addColorStop(0.4, `rgba(200,240,255,${0.08 + p * 0.3})`)
        boca.addColorStop(1, "rgba(0,0,0,0)")
        g.fillStyle = boca
        g.fillRect(0, 0, W, H)
      }
      // os anéis do hyperlapse (o mesmo desenho da pista)
      const hl = hyper.current
      if (hl) {
        const f = (agora / 1000) * (0.8 + p * 5)
        const [a, b] = hl.children as unknown as HTMLElement[]
        const f1 = f % 1, f2 = (f + 0.5) % 1
        a.style.transform = `scale(${(1 + f1 * 1.6).toFixed(3)}) rotate(${(f * 3).toFixed(1)}deg)`
        a.style.opacity = Math.sin(f1 * Math.PI).toFixed(3)
        b.style.transform = `scale(${(1 + f2 * 1.6).toFixed(3)}) rotate(${(-f * 2).toFixed(1)}deg)`
        b.style.opacity = Math.sin(f2 * Math.PI).toFixed(3)
        hl.style.opacity = String(Math.min(1, 0.3 + p))
      }
      if (p >= 1 && !acabou) { acabou = true; acabar(); return }
      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    return () => { cancelAnimationFrame(raf); w?.parar() }
  }, [])
  return (
    <div className="l-minhoca" onPointerDown={acabar} role="presentation">
      <canvas ref={tela} />
      <div ref={hyper} className="l-hyper is-hyper" aria-hidden="true"><i /><i /></div>
      <div className="l-minhoca-clarao" aria-hidden="true" />
    </div>
  )
}
