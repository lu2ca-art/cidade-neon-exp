"use client"

// PRÉDIO: os blocos que caem e fecham linha, com a cara da cidade. Cada peça
// é um pedaço de andar de um prédio do centro; andar completo acende as
// janelas e some, e o prédio desce um andar. Chegou no teto, acabou a obra.
// Desliza pro lado pra mover, pra cima gira, pra baixo desce rápido.

import { useEffect, useRef, useState } from "react"
import { useDirecao } from "./controle"
import { bipe, laco, ponto, tombo } from "./oito"

const COLS = 10, LINS = 20, PX = 8
type Grade = (string | null)[][]
const PECAS: { cor: string; f: [number, number][] }[] = [
  { cor: "#2fe8ff", f: [[0, 1], [1, 1], [2, 1], [3, 1]] },       // a laje comprida
  { cor: "#ffc857", f: [[1, 0], [2, 0], [1, 1], [2, 1]] },       // a caixa d'água
  { cor: "#b38cff", f: [[1, 0], [0, 1], [1, 1], [2, 1]] },       // a cobertura
  { cor: "#5dffa0", f: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { cor: "#ff3fb0", f: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { cor: "#ff6a35", f: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { cor: "#3d7bff", f: [[2, 0], [0, 1], [1, 1], [2, 1]] },
]
interface Peca { tipo: number; f: [number, number][]; x: number; y: number }

const nova = (): Peca => { const t = Math.floor(Math.random() * PECAS.length); return { tipo: t, f: PECAS[t].f.map(([a, b]) => [a, b]), x: 3, y: -1 } }
const girar = (f: [number, number][]): [number, number][] => { const cx = f.some(([x]) => x === 3) ? 1.5 : 1, cy = 1; return f.map(([x, y]) => [Math.round(cx - (y - cy)), Math.round(cy + (x - cx))]) }
const cabe = (g: Grade, p: Peca, f = p.f, dx = 0, dy = 0) => f.every(([x, y]) => { const X = p.x + x + dx, Y = p.y + y + dy; return X >= 0 && X < COLS && Y < LINS && (Y < 0 || !g[Y][X]) })

function desenharBloco(g: CanvasRenderingContext2D, x: number, y: number, cor: string, aceso = false) {
  g.fillStyle = cor; g.fillRect(x * PX, y * PX, PX, PX)
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x * PX, y * PX + PX - 1, PX, 1); g.fillRect(x * PX + PX - 1, y * PX, 1, PX)
  // a janela do andar
  g.fillStyle = aceso ? "#fff6c8" : "#14121c"; g.fillRect(x * PX + 2, y * PX + 2, 3, 3)
}

export function Predio({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ pontos: 0, andares: 0 })
  const st = useRef({ g: Array.from({ length: LINS }, () => Array<string | null>(COLS).fill(null)) as Grade, p: nova(), prox: nova(), acc: 0, queda: 700, pontos: 0, andares: 0, morto: false, acende: [] as number[], acendeAte: 0 })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })

  const fixar = () => {
    const s = st.current
    for (const [x, y] of s.p.f) { const Y = s.p.y + y; if (Y < 0) { s.morto = true; tombo(); setTimeout(() => fimRef.current(s.pontos), 1400); return } s.g[Y][s.p.x + x] = PECAS[s.p.tipo].cor }
    // andares completos: acendem e somem
    const cheias = s.g.map((l, i) => (l.every(Boolean) ? i : -1)).filter((i) => i >= 0)
    if (cheias.length) {
      s.acende = cheias; s.acendeAte = performance.now() + 260
      setTimeout(() => {
        for (const i of cheias) { s.g.splice(i, 1); s.g.unshift(Array<string | null>(COLS).fill(null)) }
        s.acende = []
      }, 260)
      s.andares += cheias.length
      s.pontos += [0, 100, 300, 500, 800][cheias.length] * (1 + Math.floor(s.andares / 10))
      s.queda = Math.max(110, 700 - Math.floor(s.andares / 10) * 70)
      cheias.forEach((_, k) => setTimeout(() => bipe(660 + k * 220, 0.08), k * 70))
      setHud({ pontos: s.pontos, andares: s.andares })
    } else { bipe(180, 0.04, "square", 0.08); setHud({ pontos: s.pontos, andares: s.andares }) }
    s.p = s.prox; s.prox = nova()
    if (!cabe(s.g, s.p)) { s.morto = true; tombo(); setTimeout(() => fimRef.current(s.pontos), 1400) }
  }

  useDirecao((d) => {
    const s = st.current; if (s.morto) return
    if (d === "e" && cabe(s.g, s.p, s.p.f, -1)) s.p.x--
    else if (d === "d" && cabe(s.g, s.p, s.p.f, 1)) s.p.x++
    else if (d === "c") {
      const f = s.p.tipo === 1 ? s.p.f : girar(s.p.f)
      // gira encostando: tenta um passo pro lado se não couber
      for (const dx of [0, -1, 1, -2, 2]) if (cabe(s.g, s.p, f, dx)) { s.p.f = f; s.p.x += dx; ponto(); break }
    } else if (d === "b") { let n = 0; while (cabe(s.g, s.p, s.p.f, 0, 1)) { s.p.y++; n++ } s.pontos += n * 2; fixar() }
  })

  useEffect(() => {
    const g = cvs.current?.getContext("2d"); if (!g) return
    const parar = laco(118)
    let raf = 0, antes = performance.now()
    const loop = (agora: number) => {
      const s = st.current
      s.acc += agora - antes; antes = agora
      while (!s.morto && s.acc >= s.queda) {
        s.acc -= s.queda
        if (cabe(s.g, s.p, s.p.f, 0, 1)) s.p.y++
        else fixar()
      }
      // o céu da cidade atrás do prédio
      g.fillStyle = "#14121c"; g.fillRect(0, 0, COLS * PX, LINS * PX)
      g.fillStyle = "#1c1a2a"; for (let x = 0; x < COLS; x += 2) g.fillRect(x * PX + 3, 0, 1, LINS * PX)
      s.g.forEach((l, y) => l.forEach((c, x) => { if (c) desenharBloco(g, x, y, s.acende.includes(y) && agora < s.acendeAte ? "#f2eefa" : c, s.acende.includes(y) || (x + y) % 3 === 0) }))
      if (!s.morto) {
        // a sombra de onde a peça vai cair
        let dy = 0; while (cabe(s.g, s.p, s.p.f, 0, dy + 1)) dy++
        g.fillStyle = "rgba(255,255,255,0.12)"; for (const [x, y] of s.p.f) if (s.p.y + y + dy >= 0) g.fillRect((s.p.x + x) * PX, (s.p.y + y + dy) * PX, PX, PX)
        for (const [x, y] of s.p.f) if (s.p.y + y >= 0) desenharBloco(g, s.p.x + x, s.p.y + y, PECAS[s.p.tipo].cor, true)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); parar() }
  }, [])

  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>PRÉDIO</span><i>{hud.andares} andares</i><b>{String(hud.pontos).padStart(5, "0")}</b></div>
      <canvas ref={cvs} className="fp-cvs" width={COLS * PX} height={LINS * PX} />
      <p className="fp-dica">desliza pro lado move · pra cima gira · pra baixo solta</p>
    </div>
  )
}
