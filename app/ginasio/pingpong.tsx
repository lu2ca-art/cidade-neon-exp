"use client"

// PINGUE-PONGUE (o ginásio, de dia). Visto de cima: a sua raquete embaixo
// segue o dedo; o adversário em cima. Bater na ponta da raquete dá efeito.
// A bola acelera a cada troca. Quem fizer 7 primeiro.

import { useEffect, useRef, useState } from "react"
import { raquete, torcida } from "./sons"

const W = 400, H = 720
const MESA = { x: 50, y: 110, w: 300, h: 500 }
const RAQ = { w: 64, h: 12 }
const BOLA = 7
const PONTOS = 7

export function PingPong({ onFim }: { onFim: (venceu: boolean, placar: [number, number]) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [placar, setPlacar] = useState<[number, number]>([0, 0])
  const [acabou, setAcabou] = useState<null | boolean>(null)
  const j = useRef({ eu: 200, ele: 200, alvoEu: 200, bola: { x: 200, y: 360, vx: 0, vy: 0 }, saque: 0.8, troca: 0, quem: 1 as 1 | -1, placar: [0, 0] as [number, number], fim: false })

  useEffect(() => {
    const s = j.current
    const sacar = () => {
      const b = s.bola
      b.x = 200; b.y = 360
      const v = 330
      b.vx = (Math.random() - 0.5) * 160
      b.vy = s.quem * v
      s.troca = 0
      s.saque = 0.9
    }
    sacar()
    let raf = 0
    let ult = performance.now()
    const loop = (agora: number) => {
      const dt = Math.min(0.033, (agora - ult) / 1000)
      ult = agora
      const b = s.bola
      s.eu += (s.alvoEu - s.eu) * Math.min(1, dt * 18)
      if (s.saque > 0) s.saque -= dt
      else if (!s.fim) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        // as laterais da mesa (a bola vai e volta)
        if (b.x < MESA.x + BOLA || b.x > MESA.x + MESA.w - BOLA) { b.vx *= -1; b.x = Math.max(MESA.x + BOLA, Math.min(MESA.x + MESA.w - BOLA, b.x)) }
        // o adversário: segue a bola com atraso e velocidade máxima
        const nivel = Math.min(1, 0.55 + (s.placar[1] - s.placar[0]) * -0.04 + s.troca * 0.01)
        const alvo = b.vy < 0 ? b.x : 200
        const vmax = 230 + nivel * 170
        s.ele += Math.max(-vmax * dt, Math.min(vmax * dt, alvo - s.ele))
        // as raquetes
        const yEu = MESA.y + MESA.h + 18, yEle = MESA.y - 18
        const bater = (px: number, py: number, dir: 1 | -1) => {
          if (Math.abs(b.y - py) < RAQ.h / 2 + BOLA && Math.abs(b.x - px) < RAQ.w / 2 + BOLA && Math.sign(b.vy) === -dir) {
            const off = (b.x - px) / (RAQ.w / 2)
            const v = Math.min(820, Math.hypot(b.vx, b.vy) * 1.06 + 8)
            const ang = off * 0.9
            b.vx = Math.sin(ang) * v
            b.vy = dir * Math.cos(ang) * v
            b.y = py + dir * (RAQ.h / 2 + BOLA + 1)
            s.troca++
            raquete(dir < 0)
          }
        }
        bater(s.eu, yEu, -1)
        bater(s.ele, yEle, 1)
        // ponto
        if (b.y > H + 20 || b.y < -20) {
          const meu = b.y < 0
          s.placar = meu ? [s.placar[0] + 1, s.placar[1]] : [s.placar[0], s.placar[1] + 1]
          setPlacar(s.placar)
          if (meu) torcida(s.troca > 6)
          s.quem = meu ? -1 : 1
          if (s.placar[0] >= PONTOS || s.placar[1] >= PONTOS) { s.fim = true; setAcabou(s.placar[0] > s.placar[1]) }
          else sacar()
        }
      }
      desenhar()
      raf = requestAnimationFrame(loop)
    }
    const desenhar = () => {
      const c = cvs.current
      if (!c) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = c.clientWidth, ch = c.clientHeight
      if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr) }
      const g = c.getContext("2d")!
      const k = Math.min(cw / W, ch / H)
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (cw - W * k) / 2, dpr * (ch - H * k) / 2)
      g.fillStyle = "#1a1426"
      g.fillRect(-200, -200, W + 400, H + 400)
      // o piso do ginásio e a mesa (azul, linhas brancas, rede no meio)
      g.fillStyle = "#3a2618"
      g.fillRect(-200, -200, W + 400, H + 400)
      g.fillStyle = "rgba(0,0,0,0.35)"
      g.fillRect(MESA.x + 8, MESA.y + 10, MESA.w, MESA.h)
      g.fillStyle = "#1d4fa8"
      g.fillRect(MESA.x, MESA.y, MESA.w, MESA.h)
      g.strokeStyle = "#f2f4fa"; g.lineWidth = 4
      g.strokeRect(MESA.x, MESA.y, MESA.w, MESA.h)
      g.lineWidth = 1.5
      g.beginPath(); g.moveTo(200, MESA.y); g.lineTo(200, MESA.y + MESA.h); g.stroke()
      g.fillStyle = "#e8e8ee"; g.fillRect(MESA.x - 12, MESA.y + MESA.h / 2 - 3, MESA.w + 24, 6)
      g.fillStyle = "rgba(255,255,255,0.25)"; for (let x = MESA.x - 10; x < MESA.x + MESA.w + 10; x += 6) g.fillRect(x, MESA.y + MESA.h / 2 - 3, 1, 6)
      // as raquetes
      const raq = (x: number, y: number, cor: string) => {
        g.fillStyle = "#0b0a12"; g.fillRect(x - 6, y + (y > 360 ? 6 : -18), 12, 12)
        g.fillStyle = cor
        g.beginPath(); g.roundRect(x - RAQ.w / 2, y - RAQ.h / 2, RAQ.w, RAQ.h, 6); g.fill()
      }
      raq(s.ele, MESA.y - 18, "#2a2a32")
      raq(s.eu, MESA.y + MESA.h + 18, "#d8282a")
      // a bola e a sombra
      const b = s.bola
      g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(b.x + 4, b.y + 6, BOLA, 0, Math.PI * 2); g.fill()
      g.fillStyle = "#fff8ec"; g.beginPath(); g.arc(b.x, b.y, BOLA, 0, Math.PI * 2); g.fill()
      if (s.saque > 0 && !s.fim) { g.fillStyle = "rgba(255,255,255,0.8)"; g.font = '700 14px ui-monospace, monospace'; g.textAlign = "center"; g.fillText(s.quem > 0 ? "você recebe" : "você saca", 200, 330) }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // teste: __bolinha() diz onde a bola está (em coordenadas da mesa)
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__bolinha = () => ({ x: j.current.bola.x, y: j.current.bola.y })
    return () => { delete w.__bolinha }
  }, [])

  const mover = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const k = Math.min(r.width / W, r.height / H)
    const x = (e.clientX - r.left - (r.width - W * k) / 2) / k
    j.current.alvoEu = Math.max(MESA.x, Math.min(MESA.x + MESA.w, x))
  }

  return (
    <div className="gi-jogo">
      <div className="gi-placar"><b>{placar[0]}</b><small>você · ele</small><span>{placar[1]}</span></div>
      <canvas ref={cvs} className="gi-cvs" style={{ touchAction: "none" }} onPointerDown={mover} onPointerMove={mover} />
      {placar[0] + placar[1] === 0 && acabou === null && <p className="gi-dica">arrasta o dedo pra mover a raquete</p>}
      {acabou !== null && (
        <div className="gi-fim">
          <b>{placar[0]} × {placar[1]}</b>
          <small>{acabou ? "você ganhou" : "ele ganhou dessa vez"}</small>
          <button type="button" className="gi-btn" onClick={() => onFim(acabou, placar)}>continuar</button>
        </div>
      )}
    </div>
  )
}
