"use client"

// PING PONG COM O ROBÔ (B11, a peça de destreza da Sexta-Feira — RASCUNHO).
// Foco: a raquete segue o dedo/o mouse (ou ← →); o robô do outro lado é bom,
// mas erra quando a bola vem com efeito (bater com a ponta da raquete). Quem
// fizer 5 primeiro. A mesa vista de cima, neon na cor da linha.

import { useEffect, useRef, useState } from "react"
import { gota } from "../som"

const META = 5

export function PingPong({ cor, onFim }: { cor: string; onFim: (venceu: boolean) => void }) {
  const tela = useRef<HTMLCanvasElement>(null)
  const [placar, setPlacar] = useState<[number, number]>([0, 0])
  const [fim, setFim] = useState<boolean | null>(null)
  const alvoX = useRef(0.5)
  const teclas = useRef({ e: false, d: false })
  useEffect(() => {
    const kd = (e: KeyboardEvent, on: boolean) => { if (e.key === "ArrowLeft" || e.key === "a") teclas.current.e = on; if (e.key === "ArrowRight" || e.key === "d") teclas.current.d = on }
    const a = (e: KeyboardEvent) => kd(e, true), b = (e: KeyboardEvent) => kd(e, false)
    window.addEventListener("keydown", a); window.addEventListener("keyup", b)
    return () => { window.removeEventListener("keydown", a); window.removeEventListener("keyup", b) }
  }, [])
  useEffect(() => {
    const cv = tela.current, g = cv?.getContext("2d")
    if (!cv || !g) return
    // tudo em unidades da mesa (0–1 de largura, 0–1.6 de comprimento)
    const s = { bx: 0.5, by: 0.8, vx: 0.25, vy: 0.7, eu: 0.5, ele: 0.5, pts: [0, 0] as [number, number], pausa: 0.8, acabou: false }
    let raf = 0, ult = performance.now()
    const saque = (praMim: boolean) => { s.bx = 0.5; s.by = 0.8; s.vx = (Math.random() - 0.5) * 0.5; s.vy = praMim ? 0.75 : -0.75; s.pausa = 0.8 }
    const quadro = (agora: number) => {
      raf = requestAnimationFrame(quadro)
      const dt = Math.min(0.033, (agora - ult) / 1000); ult = agora
      const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio)
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      // a mesa cabe na tela
      const mw = Math.min(W * 0.86, (H * 0.84) / 1.6), mh = mw * 1.6, ox = (W - mw) / 2, oy = (H - mh) / 2
      const X = (x: number) => ox + x * mw, Y = (y: number) => oy + (y / 1.6) * mh
      if (!s.acabou) {
        // você: segue o dedo (ou as setas)
        if (teclas.current.e) alvoX.current -= dt * 1.4
        if (teclas.current.d) alvoX.current += dt * 1.4
        alvoX.current = Math.max(0.08, Math.min(0.92, alvoX.current))
        s.eu += (alvoX.current - s.eu) * Math.min(1, dt * 14)
        // o robô: persegue a bola, com um atraso (e se atrapalha com efeito)
        const efeito = Math.abs(s.vx) > 0.55
        s.ele += Math.max(-1, Math.min(1, (s.bx - s.ele) * 6)) * dt * (efeito ? 0.55 : 0.95)
        if (s.pausa > 0) s.pausa -= dt
        else {
          s.bx += s.vx * dt; s.by += s.vy * dt
          if (s.bx < 0.02 || s.bx > 0.98) { s.vx = -s.vx; s.bx = Math.max(0.02, Math.min(0.98, s.bx)) }
          // a minha raquete (embaixo, y=1.5) e a dele (em cima, y=0.1)
          if (s.vy > 0 && s.by > 1.48 && s.by < 1.56 && Math.abs(s.bx - s.eu) < 0.12) {
            const off = (s.bx - s.eu) / 0.12
            s.vy = -Math.min(1.6, Math.abs(s.vy) * 1.06); s.vx = off * 0.9; s.by = 1.48; gota(5)
          }
          if (s.vy < 0 && s.by < 0.12 && s.by > 0.04 && Math.abs(s.bx - s.ele) < 0.12) {
            s.vy = Math.min(1.6, Math.abs(s.vy) * 1.04); s.vx = (s.bx - s.ele) * 4 + (Math.random() - 0.5) * 0.3; s.by = 0.12; gota(3)
          }
          if (s.by > 1.62) { s.pts[1]++; setPlacar([...s.pts]); saque(false) }
          if (s.by < -0.02) { s.pts[0]++; setPlacar([...s.pts]); saque(true) }
          if (s.pts[0] >= META || s.pts[1] >= META) { s.acabou = true; setFim(s.pts[0] >= META) }
        }
      }
      // o desenho
      g.fillStyle = "#06040c"; g.fillRect(0, 0, W, H)
      g.fillStyle = "#0e1a2a"; g.fillRect(ox, oy, mw, mh)
      g.strokeStyle = cor; g.lineWidth = 2; g.shadowColor = cor; g.shadowBlur = 12
      g.strokeRect(ox, oy, mw, mh)
      g.beginPath(); g.moveTo(ox, Y(0.8)); g.lineTo(ox + mw, Y(0.8)); g.stroke()
      g.shadowBlur = 0
      g.setLineDash([4, 6]); g.strokeStyle = "rgba(255,255,255,0.2)"; g.beginPath(); g.moveTo(X(0.5), oy); g.lineTo(X(0.5), oy + mh); g.stroke(); g.setLineDash([])
      // as raquetes
      g.fillStyle = "#e8e0f0"; g.fillRect(X(s.eu - 0.11), Y(1.5), 0.22 * mw, 8)
      g.fillStyle = "#9aa6b8"; g.fillRect(X(s.ele - 0.11), Y(0.1) - 8, 0.22 * mw, 8)
      // o robô: dois olhos acima da raquete dele
      g.fillStyle = cor; g.beginPath(); g.arc(X(s.ele - 0.04), Y(0.1) - 18, 3, 0, Math.PI * 2); g.arc(X(s.ele + 0.04), Y(0.1) - 18, 3, 0, Math.PI * 2); g.fill()
      // a bola
      g.fillStyle = "#fff"; g.shadowColor = "#fff"; g.shadowBlur = 10
      g.beginPath(); g.arc(X(s.bx), Y(s.by), 6, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
  }, [cor])
  return (
    <div className="l-pingpong" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const mw = Math.min(r.width * 0.86, (r.height * 0.84) / 1.6); alvoX.current = (e.clientX - r.left - (r.width - mw) / 2) / mw }}>
      <canvas ref={tela} />
      <header><small>ping pong · o robô da sexta</small><b>{placar[0]} × {placar[1]}</b></header>
      {fim !== null && (
        <div className="l-show-fim">
          <b>{fim ? "ganhou do robô" : "o robô ganhou"}</b>
          <span>{fim ? "ele pisca duas vezes. parece contente" : "ele não comemora. só espera a próxima"}</span>
          <button type="button" onClick={() => onFim(fim)}>{fim ? "voltar pra kombi →" : "de novo depois →"}</button>
        </div>
      )}
    </div>
  )
}
