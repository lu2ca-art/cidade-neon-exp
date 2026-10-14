"use client"

// BASQUETE (o ginásio, de dia). Arrasta o dedo pra cima e solta pra
// arremessar: a força e a direção do gesto viram o arremesso. 60 segundos,
// quantas cestas der. Depois de 10, a cesta começa a andar.
// A física: gravidade de verdade; a bola diminui enquanto vai até a cesta (a
// profundidade) e só bate no aro e na tabela depois que chega lá.

import { useEffect, useRef, useState } from "react"
import { aro, quica, rede, torcida } from "./sons"

const W = 400, H = 720
const G = 1800
const BOLA = 17
const ARO = 34 // meia-largura
const X0 = 200, Y0 = 600
const TEMPO = 60

interface Bola { x: number; y: number; vx: number; vy: number; t: number; ta: number; voando: boolean; passou: boolean; cesta: boolean; fim: number }

export function Basquete({ onFim }: { onFim: (cestas: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [cestas, setCestas] = useState(0)
  const [resta, setResta] = useState(TEMPO)
  const [acabou, setAcabou] = useState(false)
  const jogo = useRef({ bola: null as Bola | null, cestas: 0, seguidas: 0, hx: 200, hy: 230, t0: 0, rede: 0, msg: "", msgAte: 0, toque: null as { x: number; y: number; t: number } | null })

  useEffect(() => {
    const j = jogo.current
    j.t0 = performance.now()
    let raf = 0
    let ult = performance.now()
    const loop = (agora: number) => {
      const dt = Math.min(0.033, (agora - ult) / 1000)
      ult = agora
      const tempo = (agora - j.t0) / 1000
      const r = Math.max(0, TEMPO - tempo)
      setResta(Math.ceil(r))
      // depois de 10 cestas a cesta anda
      if (j.cestas >= 10) j.hx = 200 + Math.sin(tempo * (0.8 + (j.cestas - 10) * 0.05)) * 110
      const b = j.bola
      if (b && b.voando) {
        b.t += dt
        b.vy += G * dt
        b.x += b.vx * dt
        b.y += b.vy * dt
        const naCesta = b.t >= b.ta // chegou na profundidade da cesta
        if (naCesta) {
          // a tabela (atrás do aro): bola subindo bate e volta
          if (b.y > j.hy - 100 && b.y < j.hy - 8 && Math.abs(b.x - j.hx) < 62 && b.vy < 0) { b.vy *= -0.45; quica(0.5) }
          // o aro: duas pontas
          for (const lado of [-1, 1]) {
            const px = j.hx + lado * ARO, py = j.hy
            const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy)
            if (d < BOLA + 3 && d > 0) {
              const nx = dx / d, ny = dy / d
              const vn = b.vx * nx + b.vy * ny
              if (vn < 0) { b.vx -= 1.55 * vn * nx; b.vy -= 1.55 * vn * ny; aro() }
              b.x = px + nx * (BOLA + 3); b.y = py + ny * (BOLA + 3)
            }
          }
          // cesta: desceu por dentro do aro
          if (!b.passou && b.vy > 0 && b.y >= j.hy && b.y - b.vy * dt < j.hy) {
            b.passou = true
            if (Math.abs(b.x - j.hx) < ARO - BOLA * 0.45) {
              b.cesta = true
              j.cestas++
              j.seguidas++
              j.rede = 1
              setCestas(j.cestas)
              rede()
              if (j.seguidas >= 3) { torcida(j.seguidas >= 5); j.msg = j.seguidas >= 5 ? "PEGANDO FOGO!" : `${j.seguidas} SEGUIDAS`; j.msgAte = tempo + 1.2 }
              if (j.cestas === 10) { j.msg = "A CESTA VAI ANDAR"; j.msgAte = tempo + 1.6 }
            }
          }
        }
        if (b.y > H + 60 || b.x < -80 || b.x > W + 80) {
          if (!b.cesta) j.seguidas = 0
          b.voando = false
          b.fim = tempo
        }
      }
      if (b && !b.voando && tempo - b.fim > 0.35) j.bola = null
      j.rede = Math.max(0, j.rede - dt * 2.5)
      desenhar(tempo)
      if (r <= 0 && !j.bola) { setAcabou(true); return }
      raf = requestAnimationFrame(loop)
    }
    const desenhar = (tempo: number) => {
      const c = cvs.current
      if (!c) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = c.clientWidth, ch = c.clientHeight
      if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr) }
      const g = c.getContext("2d")!
      const k = Math.min(cw / W, ch / H)
      g.setTransform(dpr * k, 0, 0, dpr * k, dpr * (cw - W * k) / 2, dpr * (ch - H * k) / 2)
      // o ginásio: parede, letreiro, arquibancada, piso de madeira
      g.fillStyle = "#14101f"
      g.fillRect(-200, -200, W + 400, H + 400)
      const ch0 = g.createLinearGradient(0, 0, 0, 380)
      ch0.addColorStop(0, "#1c1530")
      ch0.addColorStop(1, "#2a1f3a")
      g.fillStyle = ch0
      g.fillRect(-200, 0, W + 400, 380)
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + (i % 3) * 0.02})`; g.fillRect(-200 + i * 32, 330 + (i % 2) * 6, 22, 28) } // a arquibancada
      g.save(); g.shadowColor = "#ff9000"; g.shadowBlur = 18; g.fillStyle = "#ffb347"; g.font = '900 30px "Arial Black", system-ui, sans-serif'; g.textAlign = "center"; g.fillText("GINÁSIO", 200, 60); g.restore()
      const piso = g.createLinearGradient(0, 380, 0, H)
      piso.addColorStop(0, "#6a3e1c")
      piso.addColorStop(1, "#b07038")
      g.fillStyle = piso
      g.fillRect(-200, 380, W + 400, H)
      g.strokeStyle = "rgba(0,0,0,0.18)"
      for (let y = 395; y < H; y += 26) { g.beginPath(); g.moveTo(-200, y); g.lineTo(W + 200, y); g.stroke() }
      g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 3
      g.beginPath(); g.ellipse(200, 520, 120, 40, 0, 0, Math.PI * 2); g.stroke()
      // a tabela
      const hx = j.hx, hy = j.hy
      g.fillStyle = "rgba(240,244,255,0.92)"
      g.fillRect(hx - 62, hy - 100, 124, 86)
      g.strokeStyle = "#ff3d3d"; g.lineWidth = 3
      g.strokeRect(hx - 22, hy - 54, 44, 34)
      g.fillStyle = "#555"; g.fillRect(hx - 4, hy - 14, 8, 14)
      // a bola (atrás do aro quando já está na cesta e acima dele)
      const bb = j.bola
      const desenhaBola = () => {
        if (!bb) return
        const esc = bb.t >= bb.ta ? 1 : 1.7 - 0.7 * (bb.t / bb.ta)
        const r = BOLA * esc
        g.fillStyle = "rgba(0,0,0,0.25)"
        g.beginPath(); g.ellipse(bb.x, Math.min(H - 20, Y0 + 40 + (bb.t >= bb.ta ? -260 : -260 * (bb.t / bb.ta))), r, r * 0.3, 0, 0, Math.PI * 2); g.fill()
        const gr = g.createRadialGradient(bb.x - r * 0.35, bb.y - r * 0.35, r * 0.2, bb.x, bb.y, r)
        gr.addColorStop(0, "#ffb36b"); gr.addColorStop(1, "#d8641a")
        g.fillStyle = gr
        g.beginPath(); g.arc(bb.x, bb.y, r, 0, Math.PI * 2); g.fill()
        g.strokeStyle = "rgba(40,16,0,0.75)"; g.lineWidth = 1.6
        g.beginPath(); g.arc(bb.x, bb.y, r, 0, Math.PI * 2); g.stroke()
        g.beginPath(); g.moveTo(bb.x - r, bb.y); g.lineTo(bb.x + r, bb.y); g.stroke()
        g.beginPath(); g.ellipse(bb.x, bb.y, r * 0.45, r, bb.t * 6, 0, Math.PI * 2); g.stroke()
      }
      const bolaAtras = bb && bb.t >= bb.ta && bb.y < hy
      if (bolaAtras) desenhaBola()
      // o aro e a rede
      g.strokeStyle = "#ff6a1a"; g.lineWidth = 5
      g.beginPath(); g.ellipse(hx, hy, ARO, 7, 0, 0, Math.PI * 2); g.stroke()
      g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1.4
      const balanço = j.rede * 6
      for (let i = 0; i <= 6; i++) {
        const x0 = hx - ARO + (i / 6) * ARO * 2
        const x1 = hx - ARO * 0.6 + (i / 6) * ARO * 1.2 + Math.sin(tempo * 30 + i) * balanço
        g.beginPath(); g.moveTo(x0, hy); g.lineTo(x1, hy + 42 + balanço); g.stroke()
      }
      for (let k2 = 1; k2 <= 3; k2++) { g.beginPath(); g.ellipse(hx, hy + k2 * 13, ARO * (1 - k2 * 0.13), 5, 0, 0, Math.PI * 2); g.stroke() }
      if (!bolaAtras) desenhaBola()
      // a bola na mão (esperando o arremesso)
      if (!j.bola) {
        const gr = g.createRadialGradient(X0 - 10, Y0 - 10, 6, X0, Y0, BOLA * 1.7)
        gr.addColorStop(0, "#ffb36b"); gr.addColorStop(1, "#d8641a")
        g.fillStyle = gr
        g.beginPath(); g.arc(X0, Y0, BOLA * 1.7, 0, Math.PI * 2); g.fill()
        g.strokeStyle = "rgba(40,16,0,0.75)"; g.lineWidth = 2
        g.beginPath(); g.arc(X0, Y0, BOLA * 1.7, 0, Math.PI * 2); g.stroke()
        g.beginPath(); g.moveTo(X0 - BOLA * 1.7, Y0); g.lineTo(X0 + BOLA * 1.7, Y0); g.stroke()
      }
      if (j.msg && tempo < j.msgAte) {
        g.save(); g.textAlign = "center"; g.font = '900 28px "Arial Black", system-ui, sans-serif'; g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,0.8)"; g.strokeText(j.msg, 200, 420); g.fillStyle = "#ffd23a"; g.fillText(j.msg, 200, 420); g.restore()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // o gesto: arrasta pra cima e solta
  const paraMundo = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const k = Math.min(r.width / W, r.height / H)
    return { x: (e.clientX - r.left - (r.width - W * k) / 2) / k, y: (e.clientY - r.top - (r.height - H * k) / 2) / k, t: performance.now() }
  }
  const soltar = (e: React.PointerEvent) => {
    const j = jogo.current
    const a = j.toque
    j.toque = null
    if (!a || j.bola || acabou) return
    const b = paraMundo(e)
    const dy = a.y - b.y
    if (dy < 30) return // não foi pra cima
    // a força sai do COMPRIMENTO do arrasto (previsível: dá pra aprender);
    // um terço da tela ≈ cesta limpa. A direção sai do ângulo do arrasto.
    const vy = -Math.min(1800, 850 + Math.max(0, dy - 60) * 2.2)
    const vx = ((b.x - a.x) / dy) * -vy * 0.55
    j.bola = { x: X0, y: Y0, vx, vy, t: 0, ta: -vy / G, voando: true, passou: false, cesta: false, fim: 0 }
  }

  // teste: __arremesso(vy, vx) joga direto
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__arremesso = (vy: number, vx: number) => { const j = jogo.current; if (!j.bola) j.bola = { x: X0, y: Y0, vx, vy, t: 0, ta: -vy / G, voando: true, passou: false, cesta: false, fim: 0 } }
    w.__cesta = () => ({ hx: jogo.current.hx, hy: jogo.current.hy, cestas: jogo.current.cestas })
    return () => { delete w.__arremesso; delete w.__cesta }
  }, [])

  return (
    <div className="gi-jogo">
      <div className="gi-placar"><b>{cestas}</b><small>cestas</small><span>{resta}s</span></div>
      <canvas ref={cvs} className="gi-cvs" style={{ touchAction: "none" }}
        onPointerDown={(e) => { jogo.current.toque = paraMundo(e) }}
        onPointerUp={soltar} onPointerCancel={() => { jogo.current.toque = null }} />
      {!acabou && cestas === 0 && resta > 55 && <p className="gi-dica">arrasta a bola pra cima e solta</p>}
      {acabou && (
        <div className="gi-fim">
          <b>{cestas}</b>
          <small>cestas em 60 segundos</small>
          <button type="button" className="gi-btn" onClick={() => onFim(cestas)}>continuar</button>
        </div>
      )}
    </div>
  )
}
