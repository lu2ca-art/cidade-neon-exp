"use client"

// ATRAVESSA: o sapo atravessando a avenida, com a cara da cidade. Você
// atravessa com o violão nas costas: a avenida de baixo (Kombis e ônibus),
// o canteiro do meio, os trilhos da Linha 9 (o trem não perdoa) e a avenida
// de cima, até a praça, onde a roda te espera. Cada travessia acelera a
// cidade. Três vidas. Desliza o dedo (ou as setas) um passo por vez.

import { useEffect, useRef, useState } from "react"
import { PASSO, useDirecao } from "./controle"
import { bipe, laco, ponto, tombo } from "./oito"

const COLS = 13, LINS = 15, PX = 8
// o que corre em cada linha (de cima pra baixo): tipo, velocidade (células/s), tamanho, espaço
type Faixa = { tipo: "praca" | "rua" | "calcada" | "trilho"; vel?: number; tam?: number; vao?: number; cor?: string }
const FAIXAS: Faixa[] = [
  { tipo: "praca" },
  { tipo: "rua", vel: -2.2, tam: 2, vao: 5, cor: "#f2eefa" },   // os carros do Núcleo, brancos
  { tipo: "rua", vel: 1.6, tam: 3, vao: 6, cor: "#ffc857" },    // os ônibus
  { tipo: "rua", vel: -3, tam: 2, vao: 6, cor: "#2fe8ff" },
  { tipo: "rua", vel: 1.2, tam: 2, vao: 4, cor: "#ff3fb0" },    // as Kombis
  { tipo: "calcada" },
  { tipo: "trilho", vel: 9, tam: 9, vao: 26, cor: "#e6f0ff" },  // a Linha 9
  { tipo: "calcada" },
  { tipo: "rua", vel: -1.8, tam: 2, vao: 5, cor: "#ff6a35" },
  { tipo: "rua", vel: 2.4, tam: 2, vao: 6, cor: "#5dffa0" },
  { tipo: "rua", vel: -1.4, tam: 3, vao: 7, cor: "#ffc857" },
  { tipo: "rua", vel: 2.8, tam: 2, vao: 5, cor: "#b38cff" },
  { tipo: "rua", vel: -1, tam: 2, vao: 4, cor: "#ff3fb0" },
  { tipo: "calcada" },
  { tipo: "calcada" },
]

export function Atravessa({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ pontos: 0, vidas: 3, nivel: 1 })
  const st = useRef({ x: 6, y: LINS - 1, maisAlto: LINS - 1, t: 0, nivel: 1, pontos: 0, vidas: 3, morto: false, caiu: 0, acabou: false })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })

  useDirecao((d) => {
    const s = st.current; if (s.morto || s.acabou) return
    const [dx, dy] = PASSO[d]
    s.x = Math.max(0, Math.min(COLS - 1, s.x + dx)); s.y = Math.max(0, Math.min(LINS - 1, s.y + dy))
    bipe(dy < 0 ? 520 : 400, 0.03, "square", 0.07)
    if (s.y < s.maisAlto) { s.maisAlto = s.y; s.pontos += 10; setHud((h) => ({ ...h, pontos: s.pontos })) }
    if (s.y === 0) {
      // chegou na praça: a roda canta, a cidade acelera
      s.pontos += 100 * s.nivel; s.nivel++; ponto(); setTimeout(() => bipe(1046, 0.25), 90)
      s.x = 6; s.y = LINS - 1; s.maisAlto = LINS - 1
      setHud({ pontos: s.pontos, vidas: s.vidas, nivel: s.nivel })
    }
  })

  useEffect(() => {
    const g = cvs.current?.getContext("2d"); if (!g) return
    const parar = laco(140)
    let raf = 0, antes = performance.now()
    // onde estão os carros da faixa i no tempo t (posição do começo de cada um)
    const carros = (f: Faixa, t: number, nivel: number) => {
      const per = f.tam! + f.vao!, off = (((f.vel! * (1 + (nivel - 1) * 0.18) * t) % per) + per) % per
      const xs: number[] = []
      for (let x = -per; x < COLS + per; x += per) xs.push(x + off)
      return xs
    }
    const loop = (agora: number) => {
      const s = st.current
      const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora
      if (!s.morto && !s.acabou) s.t += dt
      // o desenho: céu, a praça, as ruas, os trilhos
      FAIXAS.forEach((f, y) => {
        g.fillStyle = f.tipo === "praca" ? "#1f3a2a" : f.tipo === "rua" ? "#1a1824" : f.tipo === "trilho" ? "#24202e" : "#3a3446"
        g.fillRect(0, y * PX, COLS * PX, PX)
        if (f.tipo === "rua") { g.fillStyle = "#2e2a3a"; for (let x = 0; x < COLS; x += 2) g.fillRect(x * PX + 2, y * PX + PX - 1, 4, 1) }
        if (f.tipo === "trilho") { g.fillStyle = "#6a6478"; g.fillRect(0, y * PX + 2, COLS * PX, 1); g.fillRect(0, y * PX + 5, COLS * PX, 1) }
        if (f.tipo === "praca") for (let x = 1; x < COLS; x += 3) { g.fillStyle = "#5dffa0"; g.fillRect(x * PX + 3, y * PX + 2, 2, 4); g.fillStyle = "#ffc857"; g.fillRect(x * PX + 3, y * PX + 1, 2, 1) }
      })
      // o trem avisa: o sinal pisca antes de passar
      FAIXAS.forEach((f, y) => {
        if (!f.vel) return
        for (const x of carros(f, s.t, s.nivel)) {
          g.fillStyle = f.cor!; g.fillRect(Math.round(x * PX), y * PX + 1, f.tam! * PX - 1, PX - 2)
          g.fillStyle = "#14121c"
          for (let k = 0; k < f.tam!; k++) g.fillRect(Math.round(x * PX) + k * PX + 2, y * PX + 2, 3, 2)
          // os faróis pra onde anda
          g.fillStyle = "#fff6c8"; g.fillRect(Math.round(x * PX) + (f.vel! > 0 ? f.tam! * PX - 2 : 0), y * PX + 2, 1, 4)
        }
      })
      // bateu?
      if (!s.morto && !s.acabou) {
        const f = FAIXAS[s.y]
        if (f.vel && carros(f, s.t, s.nivel).some((x) => s.x + 0.8 > x && s.x + 0.2 < x + f.tam!)) {
          s.morto = true; s.vidas--; tombo(); s.caiu = agora
          setHud({ pontos: s.pontos, vidas: s.vidas, nivel: s.nivel })
          setTimeout(() => {
            if (s.vidas <= 0) { s.acabou = true; setTimeout(() => fimRef.current(s.pontos), 600) }
            else { s.morto = false; s.x = 6; s.y = LINS - 1; s.maisAlto = LINS - 1 }
          }, 1100)
        }
      }
      // você: o violão nas costas
      const px = s.x * PX, py = s.y * PX, pisca = s.morto && Math.floor((agora - s.caiu) / 120) % 2
      if (!pisca) {
        g.fillStyle = "#8a5a3a"; g.fillRect(px + 5, py + 1, 2, 5)
        g.fillStyle = "#ff3fb0"; g.fillRect(px + 2, py + 3, 4, 3)
        g.fillStyle = "#ffe0a8"; g.fillRect(px + 3, py + 1, 2, 2)
        g.fillStyle = "#14121c"; g.fillRect(px + 2, py + 6, 1, 2); g.fillRect(px + 5, py + 6, 1, 2)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); parar() }
  }, [])

  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>ATRAVESSA</span><i>{"♥".repeat(Math.max(0, hud.vidas))} · nível {hud.nivel}</i><b>{String(hud.pontos).padStart(5, "0")}</b></div>
      <canvas ref={cvs} className="fp-cvs" width={COLS * PX} height={LINS * PX} />
      <p className="fp-dica">desliza um passo por vez · chega na praça</p>
    </div>
  )
}
