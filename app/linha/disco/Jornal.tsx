"use client"

// O JORNAL (LU2CA 19/10: "o jornal do final representa a mídia que falou do
// show. Um sistema de mídia: prints e imagens de notícia, poucos e pontuais, e
// eles definem a popularidade do player"). A manchete sai do show (a nota, o
// tamanho da plateia, tocou ou cantou); o "print" é arte procedural em canvas
// (PLACEHOLDER: sem geração paga de imagem até o LU2CA aprovar uma ferramenta).
// A notícia mexe na popularidade e no neon$ do próximo show.

import { useEffect, useMemo, useRef } from "react"
import type { Manchete } from "./historia"
import type { ResultadoShow } from "./Show"

// (RASCUNHO) as manchetes, da pior pra melhor
const MANCHETES: { min: number; titulo: (l: string, n: number) => string; linha: string }[] = [
  { min: 0, titulo: (l) => `alguém subiu no palco ${l}`, linha: "ninguém lembra quem era. mas alguém lembra que subiu" },
  { min: 0.2, titulo: (l) => `um desconhecido canta ${l}`, linha: "testemunhas dizem que a música era antiga. e que era boa" },
  { min: 0.5, titulo: (l, n) => `${n <= 3 ? "pra quase ninguém" : `${n} pessoas`}: o show ${l} que ninguém esperava`, linha: "as máquinas registraram o barulho como falha elétrica" },
  { min: 0.8, titulo: (l) => `a cidade parou ${l}`, linha: "a kombi velha virou assunto. tem gente procurando ela nas pistas" },
]

export function calcularManchete(r: ResultadoShow, missao: string, lugar: string, popAntes: number, id: number): Manchete {
  const m = [...MANCHETES].reverse().find((x) => r.nota >= x.min)!
  // a popularidade sobe com o show (cantar arrisca mais: rende um pouco mais)
  const pop = Math.round(1 + r.nota * 8 + (r.modo === "cantar" ? 1 : 0))
  // e o neon$ do show vem da popularidade de antes (quem já é conhecido ganha mais)
  const neon = Math.round(5 + popAntes * 0.6 * (0.3 + r.nota))
  return { id, missao, titulo: m.titulo(lugar, r.publico), linha: m.linha, pop, neon, modo: r.modo, nota: Math.round(r.nota * 100), publico: r.publico }
}

export function Jornal({ m, cor, onFechar }: { m: Manchete; cor: string; onFechar: () => void }) {
  const foto = useRef<HTMLCanvasElement>(null)
  const data = useMemo(() => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), [])
  // o "print": a silhueta no palco, o feixe de luz, a plateia em pontos (meio-tom)
  useEffect(() => {
    const cv = foto.current, g = cv?.getContext("2d")
    if (!cv || !g) return
    const W = (cv.width = 480), H = (cv.height = 300)
    g.fillStyle = "#0c0a10"; g.fillRect(0, 0, W, H)
    const feixe = g.createLinearGradient(W / 2, 0, W / 2, H)
    feixe.addColorStop(0, `${cor}cc`); feixe.addColorStop(1, "transparent")
    g.fillStyle = feixe; g.beginPath(); g.moveTo(W / 2 - 20, 0); g.lineTo(W / 2 + 20, 0); g.lineTo(W / 2 + 120, H * 0.7); g.lineTo(W / 2 - 120, H * 0.7); g.fill()
    g.fillStyle = "#f2eadc"; g.beginPath(); g.arc(W / 2, H * 0.36, 14, 0, Math.PI * 2); g.fill(); g.fillRect(W / 2 - 13, H * 0.36 + 14, 26, 60)
    g.fillStyle = "#2a2230"; g.fillRect(0, H * 0.62, W, 8)
    let s = m.id
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < Math.min(160, 4 + m.publico * 2.2); i++) { g.fillStyle = `rgba(230,220,210,${0.25 + r() * 0.5})`; g.beginPath(); g.arc(r() * W, H * 0.72 + r() * H * 0.28, 5 + r() * 6, 0, Math.PI * 2); g.fill() }
    // o meio-tom do jornal
    const img = g.getImageData(0, 0, W, H), d = img.data
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4, l = (d[k] + d[k + 1] + d[k + 2]) / 3, lim = ((x % 4) + (y % 4) * 4) * 16; const v = l > lim ? 235 : 25; d[k] = v; d[k + 1] = v * 0.97; d[k + 2] = v * 0.9 }
    g.putImageData(img, 0, 0)
  }, [cor, m.id, m.publico])
  return (
    <div className="l-jornal" onPointerDown={(e) => e.stopPropagation()}>
      <article>
        <header><b>O NEON DE AMANHÃ</b><small>{data}</small></header>
        <h2>{m.titulo}</h2>
        <canvas ref={foto} aria-label="a foto do show" />
        <p>{m.linha}</p>
        <footer>
          <span>popularidade <b>+{m.pop}</b></span>
          <span>neon$ <b>+{m.neon}</b></span>
        </footer>
        <button type="button" onClick={onFechar}>seguir →</button>
      </article>
    </div>
  )
}
