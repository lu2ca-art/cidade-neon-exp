"use client"

// PINGUE: o tênis de mesa de duas barras, com a cara da cidade. São dois DJs
// trocando a bola: cada rebatida é uma batida (bumbo, caixa, bumbo, caixa) e
// o BPM sobe enquanto a troca dura. Quem fizer 7 primeiro leva a pista.

import { useEffect, useRef, useState } from "react"
import { ac, bipe, tombo } from "./oito"
import { canal } from "@/lib/mesa"

const W = 152, H = 200, BAR = 28, META = 7

function batida(n: number) {
  const c = ac(); if (!c) return
  const t = c.currentTime
  if (n % 2 === 0) {
    // bumbo
    const o = c.createOscillator(), g = c.createGain()
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    o.connect(g).connect(canal("efeitos") ?? c.destination); o.start(t); o.stop(t + 0.2)
  } else {
    // caixa: ruído curto
    const b = c.createBuffer(1, Math.ceil(c.sampleRate * 0.12), c.sampleRate), d = b.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = b; f.type = "highpass"; f.frequency.value = 1200; g.gain.value = 0.3
    s.connect(f).connect(g).connect(canal("efeitos") ?? c.destination); s.start(t)
  }
}

export function Pingue({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ eu: 0, ele: 0, bpm: 90 })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })

  useEffect(() => {
    const el = cvs.current, g = el?.getContext("2d"); if (!el || !g) return
    const s = { eu: W / 2, alvo: W / 2, ele: W / 2, bx: W / 2, by: H / 2, vx: 0, vy: 0, espera: 1.2, saque: 1, pts: [0, 0], troca: 0, acabou: false }
    if (process.env.NODE_ENV !== "production") (window as unknown as { __pg: typeof s }).__pg = s
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      s.alvo = Math.max(BAR / 2, Math.min(W - BAR / 2, ((e.clientX - r.left) / r.width) * W))
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") s.alvo = Math.max(BAR / 2, s.alvo - 14)
      if (e.key === "ArrowRight") s.alvo = Math.min(W - BAR / 2, s.alvo + 14)
    }
    window.addEventListener("pointerdown", mover); window.addEventListener("pointermove", mover); window.addEventListener("keydown", tecla)
    const bpm = () => 90 + s.troca * 6
    const vel = () => 70 + s.troca * 7
    const sacar = () => { s.bx = W / 2; s.by = H / 2; s.troca = 0; const a = (Math.random() - 0.5) * 0.9; s.vx = Math.sin(a) * vel(); s.vy = Math.cos(a) * vel() * s.saque }
    let raf = 0, antes = performance.now(), fim: ReturnType<typeof setTimeout> | null = null, hudT = 0

    const passo = (dt: number) => {
      if (s.acabou) return
      s.eu += (s.alvo - s.eu) * Math.min(1, dt * 18)
      // o outro DJ segue a bola, com atraso e um limite de velocidade
      const quer = s.vy < 0 ? s.bx + s.vx * 0.08 : W / 2
      s.ele += Math.max(-95 - s.troca * 3, Math.min(95 + s.troca * 3, (quer - s.ele) * 6)) * dt
      if (s.espera > 0) { s.espera -= dt; if (s.espera <= 0) sacar(); return }
      s.bx += s.vx * dt; s.by += s.vy * dt
      if (s.bx < 3 || s.bx > W - 3) { s.vx = -s.vx; s.bx = Math.max(3, Math.min(W - 3, s.bx)); bipe(240, 0.03) }
      const rebate = (x: number, dir: 1 | -1) => {
        const k = (s.bx - x) / (BAR / 2)
        s.troca++
        const v = vel()
        s.vx = v * Math.sin(k * 0.9); s.vy = dir * Math.abs(v * Math.cos(k * 0.9))
        batida(s.troca)
      }
      if (s.vy > 0 && s.by > 182 && s.by < 188 && Math.abs(s.bx - s.eu) < BAR / 2 + 2) rebate(s.eu, -1)
      if (s.vy < 0 && s.by < 18 && s.by > 12 && Math.abs(s.bx - s.ele) < BAR / 2 + 2) rebate(s.ele, 1)
      if (s.by > H + 4 || s.by < -4) {
        const meu = s.by < 0
        s.pts[meu ? 0 : 1]++; s.saque = meu ? -1 : 1; s.espera = 1
        if (meu) bipe(880, 0.25, "square", 0.12, 1760); else tombo()
        if (s.pts[0] >= META || s.pts[1] >= META) { s.acabou = true; fim = setTimeout(() => fimRef.current(s.pts[0] * 10 + (s.pts[0] >= META ? 50 : 0)), 1600) }
      }
    }
    const desenhar = (agora: number) => {
      g.fillStyle = "#0b0a12"; g.fillRect(0, 0, W, H)
      // a pista: a linha do meio pisca no BPM
      const pulso = Math.floor((agora / 1000) * (bpm() / 60)) % 2
      g.fillStyle = pulso ? "#2a2440" : "#1a1726"
      for (let x = 2; x < W; x += 8) g.fillRect(x, H / 2, 4, 1)
      g.font = "bold 20px monospace"; g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,0.12)"
      g.fillText(String(s.pts[1]), W / 2, H / 2 - 12); g.fillText(String(s.pts[0]), W / 2 + 0, H / 2 + 28)
      // as duas mesas de DJ
      g.fillStyle = "#b38cff"; g.fillRect(Math.round(s.ele - BAR / 2), 12, BAR, 4)
      g.fillStyle = "#ff3fb0"; g.fillRect(Math.round(s.eu - BAR / 2), 184, BAR, 4)
      g.fillStyle = "#14121c"
      for (const [x, y] of [[s.ele, 13], [s.eu, 185]]) { g.fillRect(Math.round(x) - 8, y, 4, 2); g.fillRect(Math.round(x) + 4, y, 4, 2) }
      if (s.espera <= 0 || s.acabou) { g.fillStyle = "#ffc857"; g.fillRect(Math.round(s.bx) - 2, Math.round(s.by) - 2, 4, 4) }
      if (s.acabou) { g.fillStyle = s.pts[0] >= META ? "#5dffa0" : "#ff3b3b"; g.font = "bold 8px monospace"; g.fillText(s.pts[0] >= META ? "A PISTA É SUA" : "O OUTRO DJ LEVOU", W / 2, H / 2 + 50) }
    }
    const loop = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora
      const n = Math.ceil(dt / 0.008)
      for (let k = 0; k < n; k++) passo(dt / n)
      desenhar(agora)
      hudT += dt
      if (hudT > 0.15) { hudT = 0; setHud({ eu: s.pts[0], ele: s.pts[1], bpm: bpm() }) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); if (fim) clearTimeout(fim)
      window.removeEventListener("pointerdown", mover); window.removeEventListener("pointermove", mover); window.removeEventListener("keydown", tecla)
    }
  }, [])

  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>PINGUE · {hud.bpm} bpm</span><b>{hud.eu} × {hud.ele}</b></div>
      <canvas ref={cvs} className="fp-cvs" width={W} height={H} />
      <p className="fp-dica">arrasta pro lado · cada rebatida é uma batida</p>
    </div>
  )
}
