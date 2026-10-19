"use client"

// O ÓCULOS (LU2CA 18/10): no lugar do celular, um holograma leve por cima da
// visão (o Tony Stark, o Meta glass). O personagem continua dirigindo com ele
// ligado. No chão: o mínimo (a faixa que está tocando, a missão, o resto do
// celular num toque). No ar: o mapa — a cidade acende aos poucos conforme a
// Kombi sobe, com todas as linhas, a torre e os nomes.

import { useEffect, useRef, useState } from "react"
import { pistaSom } from "../som"
import { PISTAS } from "./pistas"
import type { MundoDisco } from "./mundoDisco"

type JogoMin = { via: number; u: number; x: number; y: number; voo?: boolean; wx?: number; wz?: number; rumo?: number }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// onde a Kombi está no mundo e pra onde aponta (no voo, livre; na pista, a amostra da via)
function pose(M: MundoDisco, j: JogoMin) {
  if (j.voo && j.wx !== undefined && j.wz !== undefined) return { x: j.wx, z: j.wz, rumo: j.rumo ?? 0 }
  const v = M.vias[j.via]
  const i = Math.max(0, Math.min(v.n - 1, Math.round(j.u / 2)))
  return { x: v.px[i] - v.tz[i] * j.x, z: v.pz[i] + v.tx[i] * j.x, rumo: Math.atan2(v.tx[i], v.tz[i]) }
}

export function OculosHud({ aberto, tarefa, onAbrirCelular }: { aberto: boolean; tarefa?: string | null; onAbrirCelular: () => void }) {
  const [som, setSom] = useState<{ faixa: string; t: number; dur: number; cor: string } | null>(null)
  useEffect(() => {
    if (!aberto) return
    const lerSom = () => {
      const src = pistaSom.src
      const p = src ? PISTAS.find((x) => x.voz === src || x.inst === src) : null
      const el = pistaSom.el
      setSom(p && el ? { faixa: `${p.faixa}${src === p.inst ? " · inst" : ""}`, t: el.currentTime, dur: el.duration || p.duracao, cor: "#2fe8ff" } : null)
    }
    lerSom()
    const t = setInterval(lerSom, 500)
    return () => clearInterval(t)
  }, [aberto])
  if (!aberto) return null
  return (
    <div className="l-oculos" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-oculos-linha">
        <b>tocando</b>
        {som ? (
          <span>{som.faixa} <i>{mmss(som.t)} / {mmss(som.dur)}</i></span>
        ) : (
          <span className="is-mudo">a pista parou de girar</span>
        )}
      </div>
      {som && <div className="l-oculos-barra"><div style={{ transform: `scaleX(${Math.min(1, som.t / Math.max(1, som.dur))})` }} /></div>}
      <div className="l-oculos-linha">
        <b>missão</b>
        <span>{tarefa || "nenhuma marcada · marca um lugar no mapa"}</span>
      </div>
      <button type="button" onClick={onAbrirCelular}>mensagens, missões e o resto</button>
    </div>
  )
}

// o mapa holográfico: aparece conforme a Kombi sobe (de 6 a 45 m acima do chão embaixo dela)
export function OculosMapa({ M, jogo }: { M: MundoDisco; jogo: React.RefObject<JogoMin> }) {
  const tela = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = tela.current
    if (!cv) return
    const g = cv.getContext("2d")
    if (!g) return
    // as linhas, uma vez (a cada 6 m)
    const linhas = M.vias.map((v) => {
      const cor = (v as typeof v & { cor?: string }).cor ?? "#ffffff"
      const pts: number[] = []
      for (let i = 0; i < v.n; i += 3) pts.push(v.px[i], v.pz[i])
      return { cor, pts, volta: !!v.rede && !v.rede.ida }
    }).filter((l) => !l.volta)
    const nomes = M.pistas.map((p) => { const v = M.vias[p.ida], i = v.n - 1; return { nome: p.nome, cor: p.cor, x: v.px[i], z: v.pz[i] } })
    let raf = 0, alfa = 0, ultimo = performance.now()
    const quadro = () => {
      raf = requestAnimationFrame(quadro)
      const agora = performance.now(), dt = Math.min(0.1, (agora - ultimo) / 1000)
      ultimo = agora
      const j = jogo.current
      if (!j) return
      const p = pose(M, j)
      const baixo = M.pousar(p.x, p.z, j.y - 0.5, 0, 0)
      const alt = j.y - (baixo ? baixo.y : M.chaoDeserto)
      const alvo = j.voo ? Math.max(0, Math.min(1, (alt - 6) / 39)) : 0
      alfa += (alvo - alfa) * Math.min(1, dt * 3)
      const W = cv.clientWidth, H = cv.clientHeight
      if (cv.width !== W * devicePixelRatio) { cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio }
      g.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      g.clearRect(0, 0, W, H)
      if (alfa < 0.02) return
      // quanto mais alto, mais cidade cabe (de 0,6 a 0,22 px por metro)
      const esc = 0.6 - 0.38 * Math.min(1, alt / 90)
      const cx = W / 2, cy = H * 0.58
      const s = Math.sin(p.rumo), c = Math.cos(p.rumo)
      // o rumo da Kombi aponta pra cima da tela
      const tela2 = (x: number, z: number) => { const dx = x - p.x, dz = z - p.z; return [cx + (-dx * c + dz * s) * esc, cy - (dx * s + dz * c) * esc] }
      g.globalAlpha = alfa
      // o brilho da holografia: as linhas acendem de longe pra perto
      for (const l of linhas) {
        g.strokeStyle = l.cor
        g.lineWidth = 2.2
        g.shadowColor = l.cor
        g.shadowBlur = 8
        g.beginPath()
        for (let k = 0; k < l.pts.length; k += 2) { const [x, y] = tela2(l.pts[k], l.pts[k + 1]); if (k) g.lineTo(x, y); else g.moveTo(x, y) }
        g.stroke()
      }
      g.shadowBlur = 0
      // a torre
      const [tx, ty] = tela2(M.central.x, M.central.z)
      g.strokeStyle = "#ff6a35"; g.lineWidth = 2
      g.beginPath(); g.arc(tx, ty, Math.max(6, M.central.raio * esc), 0, Math.PI * 2); g.stroke()
      g.fillStyle = "#ff6a35"; g.font = "700 11px ui-monospace, monospace"; g.textAlign = "center"
      g.fillText("CENTRAL", tx, ty - Math.max(9, M.central.raio * esc) - 4)
      // os nomes nas pontas
      for (const n of nomes) { const [x, y] = tela2(n.x, n.z); g.fillStyle = n.cor; g.fillText(n.nome.toUpperCase(), x, y - 6) }
      // a Kombi
      g.fillStyle = "#ffffff"
      g.beginPath(); g.moveTo(cx, cy - 9); g.lineTo(cx + 6, cy + 6); g.lineTo(cx - 6, cy + 6); g.closePath(); g.fill()
      // as linhas de varredura do óculos
      g.globalAlpha = alfa * 0.08
      g.fillStyle = "#2fe8ff"
      for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1)
      g.globalAlpha = 1
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
  }, [M, jogo])
  return <canvas ref={tela} className="l-oculos-mapa" aria-hidden="true" />
}
