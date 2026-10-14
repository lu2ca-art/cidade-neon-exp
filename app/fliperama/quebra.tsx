"use client"

// QUEBRA-NEON: a barrinha que quebra os tijolos, com a cara da cidade. Os
// tijolos são o letreiro do Núcleo, letra por letra; a bola é um disco. Cada
// letreiro apagado acende uma letra da 222 no fundo.

import { useEffect, useRef, useState } from "react"
import { bipe, laco, ponto, tombo } from "./oito"

const W = 152, H = 200
const PALAVRAS = ["NUCLEO", "OTIMIZA", "ACEITAR"]
const CORES = ["#5dffa0", "#2fe8ff", "#b38cff", "#ffc857"]
// as letras em 3x5 pixels (só as que aparecem nas palavras)
const FONTE: Record<string, string[]> = {
  N: ["101", "111", "111", "111", "101"], U: ["101", "101", "101", "101", "111"], C: ["111", "100", "100", "100", "111"],
  L: ["100", "100", "100", "100", "111"], E: ["111", "100", "110", "100", "111"], O: ["111", "101", "101", "101", "111"],
  T: ["111", "010", "010", "010", "010"], I: ["111", "010", "010", "010", "111"], M: ["101", "111", "111", "101", "101"],
  Z: ["111", "001", "010", "100", "111"], A: ["010", "101", "111", "101", "101"], R: ["110", "101", "110", "101", "101"],
}
const TIJ = 3 // cada pixel da letra vira um tijolo de 3x3

type Tijolo = { x: number; y: number; vivo: boolean; cor: string }

function montar(fase: number): Tijolo[] {
  const palavra = PALAVRAS[(fase - 1) % PALAVRAS.length]
  const larg = palavra.length * 4 * TIJ - TIJ
  const x0 = Math.round((W - larg) / 2), y0 = 30
  const t: Tijolo[] = []
  ;[...palavra].forEach((l, k) => FONTE[l].forEach((linha, y) => [...linha].forEach((c, x) => {
    if (c === "1") t.push({ x: x0 + (k * 4 + x) * TIJ, y: y0 + y * TIJ * 2, vivo: true, cor: CORES[y % CORES.length] })
  })))
  return t
}

export function Quebra({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ pontos: 0, vidas: 3, fase: 1 })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })

  useEffect(() => {
    const el = cvs.current, g = el?.getContext("2d"); if (!el || !g) return
    const parar = laco(150)
    const s = { bar: W / 2, alvo: W / 2, bx: W / 2, by: 170, vx: 0, vy: 0, presa: true, tij: montar(1), pontos: 0, vidas: 3, fase: 1, acabou: false, combo: 0 }
    if (process.env.NODE_ENV !== "production") (window as unknown as { __qb: typeof s }).__qb = s
    const BAR = 26, VEL = 120
    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      s.alvo = Math.max(BAR / 2, Math.min(W - BAR / 2, ((e.clientX - r.left) / r.width) * W))
    }
    // a bola sai quando você solta o dedo (ou toca, no começo)
    const soltar = () => { if (s.presa && !s.acabou) { s.presa = false; s.vx = (Math.random() - 0.5) * 60; s.vy = -VEL } }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") s.alvo = Math.max(BAR / 2, s.alvo - 14)
      if (e.key === "ArrowRight") s.alvo = Math.min(W - BAR / 2, s.alvo + 14)
      if (e.key === " " || e.key === "ArrowUp") soltar()
    }
    window.addEventListener("pointerdown", mover); window.addEventListener("pointermove", mover)
    window.addEventListener("pointerup", soltar); window.addEventListener("keydown", tecla)
    let raf = 0, antes = performance.now(), fim: ReturnType<typeof setTimeout> | null = null, hudT = 0

    const passo = (dt: number) => {
      if (s.acabou) return
      s.bar += (s.alvo - s.bar) * Math.min(1, dt * 18)
      if (s.presa) { s.bx = s.bar; s.by = 182; return }
      s.bx += s.vx * dt; s.by += s.vy * dt
      if (s.bx < 3) { s.bx = 3; s.vx = Math.abs(s.vx); bipe(300, 0.03) }
      if (s.bx > W - 3) { s.bx = W - 3; s.vx = -Math.abs(s.vx); bipe(300, 0.03) }
      if (s.by < 3) { s.by = 3; s.vy = Math.abs(s.vy); bipe(300, 0.03) }
      // a barrinha: onde bate decide o ângulo
      if (s.vy > 0 && s.by > 184 && s.by < 190 && Math.abs(s.bx - s.bar) < BAR / 2 + 2) {
        const k = (s.bx - s.bar) / (BAR / 2)
        const v = Math.hypot(s.vx, s.vy) * 1.01
        s.vx = v * Math.sin(k * 1.05); s.vy = -Math.abs(v * Math.cos(k * 1.05)); s.combo = 0
        bipe(520, 0.05)
      }
      for (const t of s.tij) {
        if (!t.vivo) continue
        if (s.bx > t.x - 1 && s.bx < t.x + TIJ + 1 && s.by > t.y - 1 && s.by < t.y + TIJ * 2 + 1) {
          t.vivo = false; s.combo = Math.min(5, s.combo + 1); s.pontos += 10 * s.combo; ponto()
          const dx = Math.min(Math.abs(s.bx - t.x), Math.abs(s.bx - t.x - TIJ)), dy = Math.min(Math.abs(s.by - t.y), Math.abs(s.by - t.y - TIJ * 2))
          if (dx < dy) s.vx = -s.vx; else s.vy = -s.vy
          break
        }
      }
      if (s.by > H + 4) {
        s.vidas--; tombo(); s.presa = true; s.combo = 0
        if (s.vidas <= 0) { s.acabou = true; parar(); fim = setTimeout(() => fimRef.current(s.pontos), 1600) }
      }
      if (s.tij.every((t) => !t.vivo)) { s.fase++; s.tij = montar(s.fase); s.presa = true; bipe(660, 0.5, "triangle", 0.15, 1320) }
    }
    const desenhar = (agora: number) => {
      g.fillStyle = "#0b0a12"; g.fillRect(0, 0, W, H)
      // a 222 acende no fundo, uma letra por fase vencida
      g.font = "bold 40px monospace"; g.textAlign = "center"
      g.fillStyle = "rgba(255,63,176,0.22)"
      if (s.fase > 1) g.fillText("222".slice(0, s.fase - 1), W / 2, 130)
      for (const t of s.tij) if (t.vivo) {
        g.fillStyle = t.cor; g.fillRect(t.x, t.y, TIJ, TIJ * 2 - 1)
        g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(t.x, t.y, TIJ, 1)
      }
      g.fillStyle = "#ff3fb0"; g.fillRect(Math.round(s.bar - BAR / 2), 186, BAR, 3)
      g.fillStyle = "#ffc857"; g.fillRect(Math.round(s.bar - BAR / 2) + 2, 189, BAR - 4, 1)
      // o disco
      g.fillStyle = "#f2eefa"; g.fillRect(Math.round(s.bx) - 2, Math.round(s.by) - 1, 4, 2); g.fillRect(Math.round(s.bx) - 1, Math.round(s.by) - 2, 2, 4)
      g.fillStyle = "#0b0a12"; g.fillRect(Math.round(s.bx), Math.round(s.by), 1, 1)
      if (s.presa && !s.acabou && Math.floor(agora / 400) % 2) { g.fillStyle = "#ffc857"; g.font = "bold 8px monospace"; g.fillText("SOLTA O DEDO", W / 2, 160) }
      if (s.acabou) { g.fillStyle = "#ff3b3b"; g.font = "bold 8px monospace"; g.fillText("O LETREIRO VENCEU", W / 2, 160) }
    }
    const loop = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora
      const n = Math.ceil(dt / 0.008)
      for (let k = 0; k < n; k++) passo(dt / n)
      desenhar(agora)
      hudT += dt
      if (hudT > 0.15) { hudT = 0; setHud({ pontos: s.pontos, vidas: s.vidas, fase: s.fase }) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf); parar(); if (fim) clearTimeout(fim)
      window.removeEventListener("pointerdown", mover); window.removeEventListener("pointermove", mover)
      window.removeEventListener("pointerup", soltar); window.removeEventListener("keydown", tecla)
    }
  }, [])

  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>QUEBRA-NEON · fase {hud.fase}</span><b>{String(hud.pontos).padStart(5, "0")}</b><i>{"♥".repeat(Math.max(0, hud.vidas))}</i></div>
      <canvas ref={cvs} className="fp-cvs" width={W} height={H} />
      <p className="fp-dica">arrasta a barrinha · solta o dedo pra lançar o disco</p>
    </div>
  )
}
