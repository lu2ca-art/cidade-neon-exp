"use client"

// INVASORES: as naves descendo em fileira, com a cara da cidade. São os
// outdoors do Núcleo descendo sobre a avenida, sempre com o ✓; você está na
// calçada com o violão e atira notas musicais. Os pontos de ônibus seguram os
// ✓ que eles jogam, até gastar.

import { useEffect, useRef, useState } from "react"
import { bipe, laco, tombo } from "./oito"

const W = 152, H = 200
const COLS = 7, LINS = 4
const CORES = ["#ff3fb0", "#b38cff", "#2fe8ff", "#5dffa0"]

type Tiro = { x: number; y: number }

function novaOnda(fase: number) {
  const outdoors: { x: number; y: number; vivo: boolean; l: number }[] = []
  for (let l = 0; l < LINS; l++) for (let c = 0; c < COLS; c++) outdoors.push({ x: 14 + c * 18, y: 24 + l * 14 + Math.min(fase - 1, 4) * 4, vivo: true, l })
  return outdoors
}

function novosAbrigos() {
  // cada ponto de ônibus é uma grade de tijolinhos 2x2 que vão sumindo
  return [24, 76, 128].map((cx) => {
    const t: { x: number; y: number; v: number }[] = []
    for (let y = 0; y < 4; y++) for (let x = -7; x < 7; x++) if (!(y > 1 && Math.abs(x) < 3)) t.push({ x: cx + x * 2, y: 160 + y * 2, v: 2 })
    return t
  })
}

export function Invasores({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ pontos: 0, vidas: 3, fase: 1 })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })

  useEffect(() => {
    const el = cvs.current, g = el?.getContext("2d"); if (!el || !g) return
    const parar = laco(118)
    const s = {
      eu: W / 2, alvo: W / 2, notas: [] as Tiro[], checks: [] as Tiro[], recarga: 0,
      outdoors: novaOnda(1), dir: 1, passo: 0, abrigos: novosAbrigos(),
      pontos: 0, vidas: 3, fase: 1, acabou: false, pisca: 0, pausa: 1.2,
    }
    if (process.env.NODE_ENV !== "production") (window as unknown as { __inv: typeof s }).__inv = s
    // arrastar em qualquer lugar move o LU2CA; o tiro é automático
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      s.alvo = Math.max(8, Math.min(W - 8, ((e.clientX - r.left) / r.width) * W))
    }
    const teclas = new Set<string>()
    const kd = (e: KeyboardEvent) => teclas.add(e.key), ku = (e: KeyboardEvent) => teclas.delete(e.key)
    window.addEventListener("pointerdown", mover); window.addEventListener("pointermove", mover)
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku)

    let raf = 0, antes = performance.now(), fim: ReturnType<typeof setTimeout> | null = null, hudT = 0
    const bateAbrigo = (t: Tiro) => {
      for (const a of s.abrigos) for (const b of a) if (b.v > 0 && Math.abs(b.x + 1 - t.x) < 1.6 && Math.abs(b.y + 1 - t.y) < 2) { b.v--; return true }
      return false
    }
    const passo = (dt: number) => {
      if (s.acabou) return
      if (s.pausa > 0) { s.pausa -= dt; return }
      if (teclas.has("ArrowLeft")) s.alvo = Math.max(8, s.alvo - 90 * dt)
      if (teclas.has("ArrowRight")) s.alvo = Math.min(W - 8, s.alvo + 90 * dt)
      s.eu += (s.alvo - s.eu) * Math.min(1, dt * 14)
      s.recarga -= dt
      if (s.recarga <= 0 && s.notas.length < 2) { s.notas.push({ x: s.eu, y: 176 }); s.recarga = 0.42; bipe(1046, 0.04, "square", 0.06) }
      for (const n of s.notas) n.y -= 150 * dt
      // os outdoors andam de lado e descem na borda; quanto menos, mais rápido
      const vivos = s.outdoors.filter((o) => o.vivo)
      const vel = 8 + (COLS * LINS - vivos.length) * 1.3 + s.fase * 2
      s.passo += vel * dt * s.dir
      const minX = Math.min(...vivos.map((o) => o.x)) + s.passo, maxX = Math.max(...vivos.map((o) => o.x)) + s.passo
      if (maxX > W - 10 || minX < 10) {
        for (const o of s.outdoors) { o.x += s.passo; o.y += 5 }
        s.passo = 0; s.dir *= -1; bipe(110, 0.08, "square", 0.08)
      }
      // eles jogam ✓
      if (vivos.length && Math.random() < dt * (0.9 + s.fase * 0.3)) {
        const o = vivos[Math.floor(Math.random() * vivos.length)]
        s.checks.push({ x: o.x + s.passo, y: o.y + 6 })
      }
      for (const c of s.checks) c.y += (60 + s.fase * 8) * dt
      // nota acerta outdoor
      for (const n of s.notas) for (const o of vivos) {
        if (n.y > -5 && Math.abs(o.x + s.passo - n.x) < 7 && Math.abs(o.y - n.y) < 5) {
          o.vivo = false; n.y = -99; s.pontos += (LINS - o.l) * 10; bipe(220, 0.15, "square", 0.1, 60)
        }
      }
      s.notas = s.notas.filter((n) => n.y > -10 && !bateAbrigo(n))
      s.checks = s.checks.filter((c) => c.y < H && !bateAbrigo(c))
      // ✓ acerta você
      for (const c of s.checks) if (s.pisca <= 0 && Math.abs(c.x - s.eu) < 6 && c.y > 178 && c.y < 190) {
        c.y = H + 1; s.vidas--; s.pisca = 1.5; tombo()
        if (s.vidas <= 0) { s.acabou = true; parar(); fim = setTimeout(() => fimRef.current(s.pontos), 1600) }
      }
      if (s.pisca > 0) s.pisca -= dt
      // chegaram na calçada: acabou
      if (vivos.some((o) => o.y > 168)) { s.acabou = true; s.vidas = 0; tombo(); parar(); fim = setTimeout(() => fimRef.current(s.pontos), 1600) }
      if (!vivos.length) { s.fase++; s.outdoors = novaOnda(s.fase); s.passo = 0; s.dir = 1; s.checks = []; s.pausa = 1.2; bipe(660, 0.5, "triangle", 0.15, 1320) }
    }
    const desenhar = (agora: number) => {
      g.fillStyle = "#0b0a12"; g.fillRect(0, 0, W, H)
      // a avenida e os prédios no fundo
      g.fillStyle = "#14121c"
      for (let i = 0; i < 8; i++) g.fillRect(i * 20, 120 - ((i * 37) % 50), 16, 80)
      g.fillStyle = "#26222f"; g.fillRect(0, 192, W, 8)
      const quadro = Math.floor(agora / 400) % 2
      for (const o of s.outdoors) {
        if (!o.vivo) continue
        const x = Math.round(o.x + s.passo) - 6, y = Math.round(o.y) - 4
        g.fillStyle = "#3a3446"; g.fillRect(x + 2 + quadro * 6, y + 8, 2, 3)
        g.fillStyle = CORES[o.l]; g.fillRect(x, y, 12, 8)
        g.fillStyle = "#0b0a12"; g.fillRect(x + 1, y + 1, 10, 6)
        g.fillStyle = "#5dffa0"; g.fillRect(x + 3, y + 4, 1, 1); g.fillRect(x + 4, y + 5, 1, 1); g.fillRect(x + 5, y + 4, 1, 1); g.fillRect(x + 6, y + 3, 1, 1); g.fillRect(x + 7, y + 2, 1, 1)
      }
      for (const a of s.abrigos) for (const b of a) if (b.v > 0) { g.fillStyle = b.v === 2 ? "#2fe8ff" : "#1b7f8f"; g.fillRect(b.x, b.y, 2, 2) }
      g.fillStyle = "#ffc857"
      for (const n of s.notas) { g.fillRect(Math.round(n.x), Math.round(n.y), 2, 2); g.fillRect(Math.round(n.x) + 1, Math.round(n.y) - 4, 1, 4); g.fillRect(Math.round(n.x) + 2, Math.round(n.y) - 4, 1, 1) }
      g.fillStyle = "#5dffa0"
      for (const c of s.checks) { const x = Math.round(c.x), y = Math.round(c.y); g.fillRect(x - 2, y, 1, 1); g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x, y, 1, 1); g.fillRect(x + 1, y - 1, 1, 1) }
      if (!(s.pisca > 0 && Math.floor(agora / 100) % 2)) {
        const x = Math.round(s.eu)
        g.fillStyle = "#ffc857"; g.fillRect(x + 2, 181, 3, 6); g.fillRect(x + 4, 179, 1, 3)
        g.fillStyle = "#2fe8ff"; g.fillRect(x - 3, 182, 6, 8)
        g.fillStyle = "#ffe0a8"; g.fillRect(x - 2, 178, 4, 4)
        g.fillStyle = "#ff3fb0"; g.fillRect(x - 3, 178, 1, 3); g.fillRect(x + 2, 178, 1, 3)
      }
      g.textAlign = "center"; g.font = "bold 8px monospace"
      if (s.pausa > 0 && !s.acabou) { g.fillStyle = "#ffc857"; g.fillText(s.fase > 1 ? `FASE ${s.fase}` : "PRONTO", W / 2, 110) }
      if (s.acabou) { g.fillStyle = "#ff3b3b"; g.fillText("A CIDADE FOI OTIMIZADA", W / 2, 110) }
    }
    const loop = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora
      passo(dt); desenhar(agora)
      hudT += dt
      if (hudT > 0.15) { hudT = 0; setHud({ pontos: s.pontos, vidas: s.vidas, fase: s.fase }) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); parar(); if (fim) clearTimeout(fim)
      window.removeEventListener("pointerdown", mover); window.removeEventListener("pointermove", mover)
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku)
    }
  }, [])

  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>INVASORES · fase {hud.fase}</span><b>{String(hud.pontos).padStart(5, "0")}</b><i>{"♥".repeat(Math.max(0, hud.vidas))}</i></div>
      <canvas ref={cvs} className="fp-cvs" width={W} height={H} />
      <p className="fp-dica">arrasta pro lado · as notas saem sozinhas</p>
    </div>
  )
}
