"use client"

// KOMBI COBRA: a cobrinha que cresce, com a cara da cidade. A Kombi roda pela
// avenida e cada folião que ela pega entra no bloco atrás dela. Bateu na
// calçada ou no próprio bloco, acabou o carnaval.

import { useEffect, useRef, useState } from "react"
import { OPOSTO, PASSO, useDirecao, type Dir } from "./controle"
import { laco, ponto, tombo } from "./oito"

const COLS = 17, LINS = 25, PX = 8
const CORES = ["#ff3fb0", "#ffc857", "#2fe8ff", "#5dffa0", "#b38cff", "#ff6a35"]

type P = { x: number; y: number }

function novoFoliao(corpo: P[]): P {
  for (;;) {
    const p = { x: 1 + Math.floor(Math.random() * (COLS - 2)), y: 1 + Math.floor(Math.random() * (LINS - 2)) }
    if (!corpo.some((c) => c.x === p.x && c.y === p.y)) return p
  }
}

function desenhar(g: CanvasRenderingContext2D, corpo: P[], dir: Dir, alvo: P, t: number, morto: boolean) {
  g.fillStyle = "#14121c"; g.fillRect(0, 0, COLS * PX, LINS * PX)
  // a calçada em volta e as faixas da avenida
  g.fillStyle = "#3a3446"
  g.fillRect(0, 0, COLS * PX, PX); g.fillRect(0, (LINS - 1) * PX, COLS * PX, PX)
  g.fillRect(0, 0, PX, LINS * PX); g.fillRect((COLS - 1) * PX, 0, PX, LINS * PX)
  g.fillStyle = "#26222f"
  for (let y = 2; y < LINS - 2; y += 3) g.fillRect(Math.floor(COLS / 2) * PX + 3, y * PX, 2, PX * 1.5)
  // o folião esperando, acenando
  const ac = Math.floor(t / 250) % 2
  g.fillStyle = "#ffe0a8"; g.fillRect(alvo.x * PX + 3, alvo.y * PX + 1, 2, 2)
  g.fillStyle = CORES[(alvo.x + alvo.y) % CORES.length]; g.fillRect(alvo.x * PX + 2, alvo.y * PX + 3, 4, 3)
  g.fillRect(alvo.x * PX + (ac ? 1 : 6), alvo.y * PX + (ac ? 1 : 3), 1, 2)
  g.fillStyle = "#ffe0a8"; g.fillRect(alvo.x * PX + 2, alvo.y * PX + 6, 1, 2); g.fillRect(alvo.x * PX + 5, alvo.y * PX + 6, 1, 2)
  // o bloco: cada folião pulando no ritmo
  for (let i = corpo.length - 1; i >= 1; i--) {
    const c = corpo[i], pula = (Math.floor(t / 180) + i) % 2
    g.fillStyle = CORES[i % CORES.length]; g.fillRect(c.x * PX + 1, c.y * PX + 2 - pula, 6, 5)
    g.fillStyle = "#ffe0a8"; g.fillRect(c.x * PX + 3, c.y * PX - pula, 2, 2)
    g.fillRect(c.x * PX, c.y * PX + 1 - pula, 1, 2); g.fillRect(c.x * PX + 7, c.y * PX + 1 - pula, 1, 2)
  }
  // a Kombi: duas cores, o para-brisa pro lado que ela anda
  const k = corpo[0], x = k.x * PX, y = k.y * PX
  g.fillStyle = morto ? "#ff3b3b" : "#2fe8ff"; g.fillRect(x, y, PX, PX)
  g.fillStyle = "#f2eefa"
  if (dir === "c" || dir === "b") g.fillRect(x, y + (dir === "c" ? 0 : 4), PX, 4)
  else g.fillRect(x + (dir === "e" ? 0 : 4), y, 4, PX)
  g.fillStyle = "#14121c"
  if (dir === "c") g.fillRect(x + 1, y + 1, 6, 2)
  if (dir === "b") g.fillRect(x + 1, y + 5, 6, 2)
  if (dir === "e") g.fillRect(x + 1, y + 1, 2, 6)
  if (dir === "d") g.fillRect(x + 5, y + 1, 2, 6)
}

export function Cobra({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [pontos, setPontos] = useState(0)
  const st = useRef({ corpo: [{ x: 8, y: 16 }, { x: 8, y: 17 }, { x: 8, y: 18 }] as P[], dir: "c" as Dir, fila: [] as Dir[], alvo: { x: 8, y: 6 } as P, acc: 0, passo: 160, morto: false })
  useDirecao((d) => {
    const s = st.current
    const ult = s.fila.length ? s.fila[s.fila.length - 1] : s.dir
    if (d !== ult && d !== OPOSTO[ult] && s.fila.length < 2) s.fila.push(d)
  })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })
  useEffect(() => {
    const g = cvs.current?.getContext("2d"); if (!g) return
    const parar = laco(126)
    let raf = 0, antes = performance.now(), fim: ReturnType<typeof setTimeout> | null = null
    const loop = (agora: number) => {
      const s = st.current
      s.acc += agora - antes; antes = agora
      while (!s.morto && s.acc >= s.passo) {
        s.acc -= s.passo
        if (s.fila.length) s.dir = s.fila.shift()!
        const [dx, dy] = PASSO[s.dir]
        const nova = { x: s.corpo[0].x + dx, y: s.corpo[0].y + dy }
        const comeu = nova.x === s.alvo.x && nova.y === s.alvo.y
        const bateu = nova.x < 1 || nova.y < 1 || nova.x > COLS - 2 || nova.y > LINS - 2 ||
          s.corpo.slice(0, comeu ? undefined : -1).some((c) => c.x === nova.x && c.y === nova.y)
        if (bateu) {
          s.morto = true; tombo(); parar()
          fim = setTimeout(() => fimRef.current(s.corpo.length - 3), 1400)
          break
        }
        s.corpo.unshift(nova)
        if (comeu) {
          ponto(); s.alvo = novoFoliao(s.corpo); s.passo = Math.max(70, s.passo - 4)
          setPontos(s.corpo.length - 3)
        } else s.corpo.pop()
      }
      desenhar(g, s.corpo, s.dir, s.alvo, agora, s.morto)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); parar(); if (fim) clearTimeout(fim) }
  }, [])
  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>KOMBI COBRA</span><b>{String(pontos).padStart(3, "0")}</b></div>
      <canvas ref={cvs} className="fp-cvs" width={COLS * PX} height={LINS * PX} />
      <p className="fp-dica">desliza o dedo pra virar · pega os foliões</p>
    </div>
  )
}
