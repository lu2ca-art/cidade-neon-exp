"use client"

// O SHOW NO FIM DE CADA MISSÃO (LU2CA 20/10): "uma escolha, não as duas: o
// player ou toca ou canta".
//   - TOCAR: uma versão curta do GUITAR DRIVER dentro da missão, com a música
//     daquela linha e o cenário dela, sem abrir o app (as notas de verdade do
//     Guitar Driver: public/gd/<faixa>.json, a guitarra no médio)
//   - CANTAR: "seguir a melodia da voz nos botões": o mesmo esquema, só muda
//     como as notas aparecem (elas correm da direita pra esquerda, em alturas,
//     como uma linha de melodia; toca o instrumental, a voz é você). RASCUNHO:
//     a melodia é a das notas da guitarra até ter a da voz de verdade
//   - a plateia é a popularidade daquele momento: vazio no começo, lotado
//     depois ("não é sobre o lugar, é sobre as pessoas")
// Os 4 botões: na tela (toque) ou D F J K / 1 2 3 4.

import { useEffect, useRef, useState } from "react"
import { silenciar } from "../som"
import { PISTAS, type PistaId } from "../estrada/pistas"

export type ResultadoShow = { modo: "tocar" | "cantar"; nota: number; acertos: number; total: number; publico: number }
type NotaShow = { t: number; lane: number; ok: boolean; errou: boolean }

const DUR = 42 // s de show (a versão curta)
const INICIO = 28 // s da faixa onde o show começa (depois da introdução)
const JANELA = 0.14
const CORES = ["#2bd14f", "#ff2b3a", "#ffd21a", "#2a8cff"]
const TECLAS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, "1": 0, "2": 1, "3": 2, "4": 3 }

export function Show({ faixa, lugar, cor, popularidade, onFim }: { faixa: PistaId; lugar: string; cor: string; popularidade: number; onFim: (r: ResultadoShow) => void }) {
  const [modo, setModo] = useState<"tocar" | "cantar" | null>(null)
  const [fim, setFim] = useState<ResultadoShow | null>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const notas = useRef<NotaShow[]>([])
  const placar = useRef({ acertos: 0, seq: 0, ultimo: { lane: -1, ok: false, t: 0 } })
  const audio = useRef<HTMLAudioElement | null>(null)
  const t0 = useRef(0)
  const pista = PISTAS.find((p) => p.id === faixa)!
  // a plateia: quantas pessoas (a popularidade de agora)
  const publico = Math.round(2 + (Math.min(100, popularidade) / 100) * 70)
  // as notas do Guitar Driver (no fundo enquanto a pessoa escolhe)
  useEffect(() => {
    let vivo = true
    fetch(`/gd/${faixa}.json`).then((r) => r.json()).then((c: { guitarra: { facil?: number[][]; medio?: number[][] } }) => {
      if (!vivo) return
      const l = c.guitarra.medio ?? c.guitarra.facil ?? []
      notas.current = l.filter(([t]) => t >= INICIO && t < INICIO + DUR).map(([t, lane]) => ({ t: t - INICIO, lane: Math.min(3, lane), ok: false, errou: false }))
    }).catch(() => {})
    return () => { vivo = false }
  }, [faixa])
  // a música do lugar fica quieta durante o show
  useEffect(() => { silenciar(true); return () => silenciar(false) }, [])
  const tocar = (lane: number) => {
    if (!modo || fim) return
    const agora = (performance.now() - t0.current) / 1000
    const n = notas.current.find((x) => !x.ok && !x.errou && x.lane === lane && Math.abs(x.t - agora) < JANELA)
    const p = placar.current
    if (n) { n.ok = true; p.acertos++; p.seq++; try { navigator.vibrate?.(8) } catch {} } else p.seq = 0
    p.ultimo = { lane, ok: !!n, t: agora }
  }
  const tocarRef = useRef(tocar)
  useEffect(() => { tocarRef.current = tocar })
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { const l = TECLAS[e.key.toLowerCase()]; if (l !== undefined && !e.repeat) { e.preventDefault(); tocarRef.current(l) } }
    window.addEventListener("keydown", kd)
    return () => window.removeEventListener("keydown", kd)
  }, [])
  // começou: a faixa (tocar = a faixa; cantar = o instrumental: a voz é você)
  useEffect(() => {
    if (!modo) return
    const src = modo === "cantar" ? pista.inst : pista.voz ?? pista.inst
    const a = new Audio(src)
    a.currentTime = INICIO
    a.volume = 0.9
    audio.current = a
    void a.play().catch(() => {})
    t0.current = performance.now() + 120
    const fimT = setTimeout(() => {
      const total = Math.max(1, notas.current.length), ac = placar.current.acertos
      setFim({ modo, nota: ac / total, acertos: ac, total, publico })
    }, DUR * 1000)
    return () => { clearTimeout(fimT); a.pause() }
  }, [modo, pista, publico])
  // no fim, a música desce devagar
  useEffect(() => {
    if (!fim || !audio.current) return
    const a = audio.current
    const iv = setInterval(() => { a.volume = Math.max(0, a.volume - 0.08); if (a.volume <= 0) { a.pause(); clearInterval(iv) } }, 80)
    return () => clearInterval(iv)
  }, [fim])
  // o desenho: o palco, a plateia e as notas
  useEffect(() => {
    const cv = tela.current, g = cv?.getContext("2d")
    if (!cv || !g) return
    let raf = 0
    const gente = Array.from({ length: publico }, (_, i) => ({ x: ((i * 0.6180339) % 1), fila: i % 4, f: (i * 0.37) % 1, h: (i * 53) % 360 }))
    const quadro = (agora: number) => {
      raf = requestAnimationFrame(quadro)
      const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, devicePixelRatio)
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr) }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const t = modo ? (agora - t0.current) / 1000 : 0
      const batida = 60 / pista.bpm, pulso = Math.pow(1 - ((t / batida) % 1 + 1) % 1, 3)
      // o fundo: o lugar, a luz do palco na cor da linha
      const fundo = g.createLinearGradient(0, 0, 0, H)
      fundo.addColorStop(0, "#06040c"); fundo.addColorStop(0.6, "#120a1c"); fundo.addColorStop(1, "#05030a")
      g.fillStyle = fundo; g.fillRect(0, 0, W, H)
      const luz = g.createRadialGradient(W / 2, H * 0.18, 0, W / 2, H * 0.18, H * 0.75)
      luz.addColorStop(0, `${cor}${modo ? "66" : "33"}`); luz.addColorStop(1, "transparent")
      g.fillStyle = luz; g.fillRect(0, 0, W, H)
      // o palco
      g.fillStyle = "#1a1220"; g.fillRect(W * 0.18, H * 0.34, W * 0.64, H * 0.05)
      g.fillStyle = cor; g.globalAlpha = 0.7 + pulso * 0.3; g.fillRect(W * 0.18, H * 0.34, W * 0.64, 2); g.globalAlpha = 1
      // você no palco (a silhueta, o pedestal)
      const vx = W / 2, vy = H * 0.34
      g.fillStyle = "#e8e0f0"
      g.beginPath(); g.arc(vx, vy - 46 - pulso * 2, 7, 0, Math.PI * 2); g.fill()
      g.fillRect(vx - 6, vy - 38 - pulso * 2, 12, 30)
      g.fillStyle = "#888"; g.fillRect(vx + 12, vy - 40, 2, 40)
      // a plateia: quanto mais gente, mais cheia (e pulando no tempo)
      for (const p of gente) {
        const y = H * (0.43 + p.fila * 0.035), x = W * (0.06 + p.x * 0.88)
        const pula = modo ? Math.max(0, Math.sin((t / batida + p.f) * Math.PI * 2)) * (3 + p.fila) : 0
        g.fillStyle = `hsl(${p.h} 25% ${14 + p.fila * 4}%)`
        g.beginPath(); g.arc(x, y - 10 - pula, 5 + p.fila, 0, Math.PI * 2); g.fill()
        g.fillRect(x - 5 - p.fila, y - 6 - pula, 10 + p.fila * 2, 14)
      }
      if (!modo) return
      // as notas
      const vis = 2.0 // s visíveis antes de chegar
      if (modo === "tocar") {
        // a trilha em perspectiva, as notas descendo pra linha
        const topo = H * 0.52, base = H * 0.86, larg0 = W * 0.16, larg1 = Math.min(W * 0.9, 520)
        const xl = (lane: number, k: number) => W / 2 + (lane - 1.5) * ((larg0 + (larg1 - larg0) * k) / 4)
        g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1
        for (let l = 0; l <= 4; l++) { g.beginPath(); g.moveTo(W / 2 + (l - 2) * larg0 / 4, topo); g.lineTo(W / 2 + (l - 2) * larg1 / 4, base); g.stroke() }
        for (let l = 0; l < 4; l++) { g.strokeStyle = CORES[l]; g.lineWidth = 3; g.beginPath(); g.ellipse(xl(l, 1), base, larg1 / 10, 8, 0, 0, Math.PI * 2); g.stroke() }
        for (const n of notas.current) {
          const d = n.t - t
          if (d > vis || d < -0.3) { if (d < -JANELA && !n.ok) n.errou = true; continue }
          if (d < -JANELA && !n.ok) n.errou = true
          if (n.ok) continue
          const k = Math.min(1.05, 1 - d / vis), y = topo + (base - topo) * k
          g.fillStyle = n.errou ? "#555" : CORES[n.lane]
          g.beginPath(); g.ellipse(xl(n.lane, k), y, (larg0 + (larg1 - larg0) * k) / 10, 4 + k * 5, 0, 0, Math.PI * 2); g.fill()
        }
      } else {
        // a melodia: as notas correm da direita pra esquerda, a altura é a "nota"
        const x0 = W * 0.22, y0 = H * 0.62, dy = H * 0.055
        g.strokeStyle = "rgba(255,255,255,0.15)"
        for (let l = 0; l < 4; l++) { g.beginPath(); g.moveTo(0, y0 + (3 - l) * dy); g.lineTo(W, y0 + (3 - l) * dy); g.stroke() }
        g.strokeStyle = "#fff"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0 - dy); g.lineTo(x0, y0 + 4 * dy); g.stroke()
        let ant: [number, number] | null = null
        for (const n of notas.current) {
          const d = n.t - t
          if (d < -JANELA && !n.ok) n.errou = true
          if (d > vis * 1.6 || d < -1) continue
          const x = x0 + (d / (vis * 1.6)) * (W - x0), y = y0 + (3 - n.lane) * dy
          if (ant) { g.strokeStyle = "rgba(255,255,255,0.25)"; g.lineWidth = 2; g.beginPath(); g.moveTo(ant[0], ant[1]); g.lineTo(x, y); g.stroke() }
          ant = [x, y]
          g.fillStyle = n.ok ? "#ffffff" : n.errou ? "#555" : CORES[n.lane]
          g.beginPath(); g.arc(x, y, n.ok ? 9 : 7, 0, Math.PI * 2); g.fill()
        }
      }
      // o retorno do toque
      const u = placar.current.ultimo
      if (t - u.t < 0.25 && u.lane >= 0) { g.fillStyle = u.ok ? "#ffffffcc" : "#ff3b3b66"; g.font = "800 18px ui-monospace, monospace"; g.textAlign = "center"; g.fillText(u.ok ? (placar.current.seq > 4 ? `${placar.current.seq}×` : "isso") : "…", W / 2, H * 0.48) }
      // o tempo do show
      g.fillStyle = cor; g.fillRect(0, H - 3, W * Math.min(1, t / DUR), 3)
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
  }, [modo, publico, cor, pista.bpm])
  return (
    <div className="l-show" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <canvas ref={tela} />
      <header className="l-show-topo"><small>o show · {lugar}</small><b>{pista.faixa}</b><span>{publico <= 3 ? "quase ninguém" : `${publico} pessoas`}</span></header>
      {!modo && (
        <div className="l-show-escolha">
          <button type="button" onClick={() => setModo("tocar")}><b>tocar</b><small>a guitarra, as notas descendo</small></button>
          <button type="button" onClick={() => setModo("cantar")}><b>cantar</b><small>a melodia, a voz é você</small></button>
        </div>
      )}
      {modo && !fim && (
        <div className="l-show-botoes">
          {CORES.map((c, l) => <button key={l} type="button" style={{ ["--c" as string]: c }} onPointerDown={(e) => { e.preventDefault(); tocar(l) }} aria-label={`nota ${l + 1}`}><kbd>{"DFJK"[l]}</kbd></button>)}
        </div>
      )}
      {fim && (
        <div className="l-show-fim">
          <b>{fim.nota > 0.8 ? "a casa veio abaixo" : fim.nota > 0.5 ? "deu bom" : fim.nota > 0.2 ? "foi" : "pelo menos você subiu"}</b>
          <span>{fim.acertos} de {fim.total} notas</span>
          <button type="button" onClick={() => onFim(fim)}>o jornal de amanhã →</button>
        </div>
      )}
    </div>
  )
}
