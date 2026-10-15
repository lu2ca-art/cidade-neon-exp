"use client"

// LINHA 9: o comilão no labirinto, com a cara da cidade. O labirinto é o mapa
// do metrô; você recolhe os bilhetes, e os agentes do Núcleo te caçam. As
// antenas da 222 nos cantos viram o jogo por uns segundos: aí são eles que
// fogem (e voltam pra central quando você pega).

import { useEffect, useRef, useState } from "react"
import { OPOSTO, PASSO, useDirecao, type Dir } from "./controle"
import { bipe, laco, ponto, tombo } from "./oito"

const MAPA = [
  "###################",
  "#........#........#",
  "#o##.###.#.###.##o#",
  "#.................#",
  "#.##.#.#####.#.##.#",
  "#....#...#...#....#",
  "####.###.#.###.####",
  "   #.#.......#.#   ",
  "####.#.##-##.#.####",
  ".......#   #.......",
  "####.#.#####.#.####",
  "   #.#.......#.#   ",
  "####.#.#####.#.####",
  "#........#........#",
  "#.##.###.#.###.##.#",
  "#o.#.....P.....#.o#",
  "##.#.#.#####.#.#.##",
  "#....#...#...#....#",
  "#.######.#.######.#",
  "#.................#",
  "###################",
]
const W = 19, H = MAPA.length, PX = 8
const SAIDA = { x: 9, y: 7 }
// as linhas do metrô: cada faixa do mapa tem a cor de uma linha
const LINHAS = ["#ff3fb0", "#2fe8ff", "#ffc857", "#5dffa0", "#b38cff"]
const DIRS: Dir[] = ["c", "e", "b", "d"]

type Ator = { x: number; y: number; dir: Dir; t: number }
type Agente = Ator & { modo: "casa" | "caca" | "foge" | "volta"; sai: number; cor: string }

const parede = (x: number, y: number) => {
  if (y < 0 || y >= H) return true
  const c = MAPA[y][((x % W) + W) % W]
  return c === "#" || c === "-"
}

function bilhetesIniciais() {
  const b = new Map<string, "." | "o">()
  MAPA.forEach((l, y) => [...l].forEach((c, x) => { if (c === "." || c === "o") b.set(`${x},${y}`, c) }))
  return b
}

const pos = (a: Ator) => { const [dx, dy] = PASSO[a.dir]; return { x: a.x + dx * a.t, y: a.y + dy * a.t } }

function novosAgentes(): Agente[] {
  return ["#d9dde8", "#9fa6b8", "#c8ffd8", "#e8e0ff"].map((cor, i) => ({ x: 8 + (i % 3), y: 9, dir: "c" as Dir, t: 0, modo: "casa" as const, sai: i * 2.5, cor }))
}

export function Linha9({ onFim }: { onFim: (pontos: number) => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState({ pontos: 0, vidas: 3, fase: 1 })
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim })
  const st = useRef({
    eu: { x: 9, y: 15, dir: "e" as Dir, t: 0 } as Ator, quer: "e" as Dir, parado: false,
    agentes: novosAgentes(), bilhetes: bilhetesIniciais(), pontos: 0, vidas: 3, fase: 1,
    medo: 0, combo: 0, relogio: 0, pausa: 1.5, acabou: false, piscou: 0,
  })
  useDirecao((d) => { st.current.quer = d })

  useEffect(() => {
    const g = cvs.current?.getContext("2d"); if (!g) return
    const parar = laco(144)
    let raf = 0, antes = performance.now(), fim: ReturnType<typeof setTimeout> | null = null
    const s = st.current
    const vel = () => 5.2 + s.fase * 0.4

    const andarEu = (dt: number) => {
      const e = s.eu
      // virar pra trás é na hora; o resto, no centro do bloco
      if (s.quer === OPOSTO[e.dir] && !s.parado) {
        const [dx, dy] = PASSO[e.dir]
        e.x = (e.x + dx + W) % W; e.y += dy; e.t = 1 - e.t; e.dir = s.quer
      }
      if (s.parado) {
        const [dx, dy] = PASSO[s.quer]
        if (!parede(e.x + dx, e.y + dy)) { e.dir = s.quer; s.parado = false } else return
      }
      e.t += vel() * dt
      while (e.t >= 1) {
        e.t -= 1
        const [dx, dy] = PASSO[e.dir]
        e.x = (e.x + dx + W) % W; e.y += dy
        const k = `${e.x},${e.y}`, b = s.bilhetes.get(k)
        if (b) {
          s.bilhetes.delete(k)
          if (b === "o") { s.pontos += 50; s.medo = Math.max(3, 8 - s.fase); s.combo = 0; bipe(220, 0.4, "square", 0.12, 880); for (const a of s.agentes) if (a.modo === "caca") { a.modo = "foge"; a.dir = OPOSTO[a.dir]; a.t = 1 - a.t; const [ax, ay] = PASSO[OPOSTO[a.dir]]; a.x = (a.x + ax + W) % W; a.y += ay } }
          else { s.pontos += 10; if ((s.pontos / 10) % 2) ponto() }
        }
        const [qx, qy] = PASSO[s.quer]
        if (!parede(e.x + qx, e.y + qy)) e.dir = s.quer
        const [fx, fy] = PASSO[e.dir]
        if (parede(e.x + fx, e.y + fy)) { e.t = 0; s.parado = true; break }
      }
    }

    const alvoDe = (a: Agente, i: number) => {
      if (a.modo === "volta") return SAIDA
      const e = s.eu, [dx, dy] = PASSO[e.dir]
      if (i === 0) return { x: e.x, y: e.y }
      if (i === 1) return { x: e.x + dx * 4, y: e.y + dy * 4 }
      if (i === 2) return Math.hypot(a.x - e.x, a.y - e.y) > 7 ? { x: e.x, y: e.y } : { x: 1, y: H - 2 }
      return { x: e.x - dx * 3 + (s.relogio % 8 < 4 ? 4 : -4), y: e.y - dy * 3 }
    }

    const andarAgente = (a: Agente, i: number, dt: number) => {
      if (a.modo === "casa") {
        a.sai -= dt
        if (a.sai <= 0) { a.modo = s.medo > 0 ? "foge" : "caca"; a.x = SAIDA.x; a.y = SAIDA.y; a.t = 0; a.dir = "e" }
        return
      }
      const tunel = a.y === 9 && (a.x < 4 || a.x > W - 5)
      const v = a.modo === "volta" ? 12 : a.modo === "foge" ? 3.4 : tunel ? 2.6 : vel() * (0.86 + i * 0.03)
      a.t += v * dt
      while (a.t >= 1) {
        a.t -= 1
        const [dx, dy] = PASSO[a.dir]
        a.x = (a.x + dx + W) % W; a.y += dy
        if (a.modo === "volta" && a.x === SAIDA.x && a.y === SAIDA.y) a.modo = "caca"
        const opcoes = DIRS.filter((d) => d !== OPOSTO[a.dir] && !parede(a.x + PASSO[d][0], a.y + PASSO[d][1]))
        if (!opcoes.length) { a.dir = OPOSTO[a.dir]; continue }
        if (a.modo === "foge") { a.dir = opcoes[Math.floor(Math.random() * opcoes.length)]; continue }
        const alvo = alvoDe(a, i)
        a.dir = opcoes.reduce((m, d) => {
          const dd = Math.hypot(a.x + PASSO[d][0] - alvo.x, a.y + PASSO[d][1] - alvo.y)
          const dm = Math.hypot(a.x + PASSO[m][0] - alvo.x, a.y + PASSO[m][1] - alvo.y)
          return dd < dm ? d : m
        })
      }
    }

    const reiniciar = (tudo: boolean) => {
      s.eu = { x: 9, y: 15, dir: "e", t: 0 }; s.quer = "e"; s.parado = false
      s.agentes = novosAgentes(); s.medo = 0; s.pausa = 1.5
      if (tudo) s.bilhetes = bilhetesIniciais()
    }

    const passo = (dt: number) => {
      if (s.acabou) return
      if (s.pausa > 0) { s.pausa -= dt; return }
      s.relogio += dt
      if (s.medo > 0) { s.medo -= dt; if (s.medo <= 0) for (const a of s.agentes) if (a.modo === "foge") a.modo = "caca" }
      andarEu(dt)
      s.agentes.forEach((a, i) => andarAgente(a, i, dt))
      const pe = pos(s.eu)
      for (const a of s.agentes) {
        if (a.modo === "casa" || a.modo === "volta") continue
        const pa = pos(a)
        const dx = Math.abs(pa.x - pe.x), d = Math.min(dx, W - dx) + Math.abs(pa.y - pe.y)
        if (d > 0.7) continue
        if (a.modo === "foge") { s.combo++; s.pontos += 200 * 2 ** (s.combo - 1); a.modo = "volta"; bipe(1200, 0.25, "square", 0.12, 300) }
        else {
          s.vidas--; tombo(); s.piscou = 1.2
          if (s.vidas <= 0) { s.acabou = true; parar(); fim = setTimeout(() => fimRef.current(s.pontos), 1600) }
          else reiniciar(false)
          break
        }
      }
      if (!s.bilhetes.size) { s.fase++; bipe(660, 0.5, "triangle", 0.15, 1320); reiniciar(true) }
    }

    const desenhar = (agora: number) => {
      g.fillStyle = "#0b0a12"; g.fillRect(0, 0, W * PX, H * PX)
      // as paredes viram as linhas do metrô: um traço colorido ligando os vizinhos
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (MAPA[y][x] !== "#") continue
        const cor = LINHAS[Math.floor(y / 5) % LINHAS.length]
        g.fillStyle = "#1a1726"; g.fillRect(x * PX, y * PX, PX, PX)
        g.fillStyle = cor
        const cx = x * PX + 3, cy = y * PX + 3
        g.fillRect(cx, cy, 2, 2)
        if (x + 1 < W && MAPA[y][x + 1] === "#") g.fillRect(cx, cy, PX, 2)
        if (y + 1 < H && MAPA[y + 1][x] === "#") g.fillRect(cx, cy, 2, PX)
      }
      g.fillStyle = "#ff6a35"; g.fillRect(9 * PX, 8 * PX + 3, PX, 2)  // a porta da central
      // os bilhetes e as antenas da 222
      const piscaAntena = Math.floor(agora / 220) % 2
      for (const [k, b] of s.bilhetes) {
        const [x, y] = k.split(",").map(Number)
        if (b === ".") { g.fillStyle = "#ffe9a8"; g.fillRect(x * PX + 3, y * PX + 3, 2, 2) }
        else if (piscaAntena) {
          g.fillStyle = "#ff3fb0"
          g.fillRect(x * PX + 3, y * PX + 1, 2, 6); g.fillRect(x * PX + 1, y * PX + 6, 6, 1); g.fillRect(x * PX + 2, y * PX + 1, 4, 1)
        }
      }
      // os agentes do Núcleo: terno e o ✓ no peito; com medo, o ✓ vira ?
      for (const a of s.agentes) {
        const p = a.modo === "casa" ? { x: a.x, y: a.y } : pos(a)
        const x = Math.round(p.x * PX), y = Math.round(p.y * PX)
        if (a.modo === "volta") { g.fillStyle = "#5dffa0"; g.fillRect(x + 2, y + 3, 1, 1); g.fillRect(x + 5, y + 3, 1, 1); continue }
        const medo = a.modo === "foge" && (s.medo > 1.5 || Math.floor(agora / 150) % 2)
        g.fillStyle = medo ? "#3a4cff" : a.cor; g.fillRect(x + 1, y + 1, 6, 7)
        g.fillStyle = medo ? "#3a4cff" : "#2a2836"; g.fillRect(x + 2, y + 3, 4, 5)
        g.fillStyle = medo ? "#ffffff" : "#5dffa0"
        if (medo) { g.fillRect(x + 3, y + 3, 2, 1); g.fillRect(x + 4, y + 4, 1, 1); g.fillRect(x + 4, y + 6, 1, 1) }
        else { g.fillRect(x + 3, y + 5, 1, 1); g.fillRect(x + 4, y + 6, 1, 1); g.fillRect(x + 5, y + 4, 1, 2) }
        g.fillStyle = "#0b0a12"; g.fillRect(x + 2, y + 2, 1, 1); g.fillRect(x + 5, y + 2, 1, 1)
      }
      // você: fone na cabeça e o violão nas costas, piscando quando apanha
      if (!(s.piscou > 0 && Math.floor(agora / 100) % 2)) {
        const p = pos(s.eu), x = Math.round(p.x * PX), y = Math.round(p.y * PX)
        g.fillStyle = "#ffc857"; g.fillRect(x + (s.eu.dir === "e" ? 5 : 0), y + 3, 2, 4)
        g.fillStyle = "#2fe8ff"; g.fillRect(x + 2, y + 1, 4, 6)
        g.fillStyle = "#ffe0a8"; g.fillRect(x + 3, y + 1, 2, 2)
        g.fillStyle = "#ff3fb0"; g.fillRect(x + 1, y + 1, 1, 2); g.fillRect(x + 6, y + 1, 1, 2)
        const passo = Math.floor(agora / 120) % 2
        g.fillStyle = "#f2eefa"; g.fillRect(x + 2 + passo, y + 7, 1, 1); g.fillRect(x + 5 - passo, y + 7, 1, 1)
      }
      if (s.pausa > 0 && !s.acabou) { g.fillStyle = "#ffc857"; g.font = "bold 8px monospace"; g.textAlign = "center"; g.fillText(s.fase > 1 ? `FASE ${s.fase}` : "PRONTO", (W * PX) / 2, 11 * PX + 7) }
      if (s.acabou) { g.fillStyle = "#ff3b3b"; g.font = "bold 8px monospace"; g.textAlign = "center"; g.fillText("FIM DA LINHA", (W * PX) / 2, 11 * PX + 7) }
    }

    let hudT = 0
    const loop = (agora: number) => {
      const dt = Math.min(0.05, (agora - antes) / 1000); antes = agora
      // passos curtos: ninguém atravessa ninguém
      const n = Math.ceil(dt / 0.01)
      for (let k = 0; k < n; k++) passo(dt / n)
      if (s.piscou > 0) s.piscou -= dt
      desenhar(agora)
      hudT += dt
      if (hudT > 0.15) { hudT = 0; setHud({ pontos: s.pontos, vidas: s.vidas, fase: s.fase }) }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    if (process.env.NODE_ENV !== "production") (window as unknown as { __l9: typeof s }).__l9 = s
    return () => { cancelAnimationFrame(raf); parar(); if (fim) clearTimeout(fim) }
  }, [])

  return (
    <div className="fp-tela">
      <div className="fp-placar"><span>LINHA 9 · fase {hud.fase}</span><b>{String(hud.pontos).padStart(5, "0")}</b><i>{"♥".repeat(Math.max(0, hud.vidas))}</i></div>
      <canvas ref={cvs} className="fp-cvs" width={W * PX} height={H * PX} />
      <p className="fp-dica">desliza o dedo · pega os bilhetes · a antena da 222 vira o jogo</p>
    </div>
  )
}
