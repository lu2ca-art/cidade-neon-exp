"use client"

// O JORNAL, que se chama SUBURBANDAS (LU2CA 28/10, J2:35). (LU2CA 19/10: "o jornal do final representa a mídia que falou do
// show. Um sistema de mídia: prints e imagens de notícia, poucos e pontuais, e
// eles definem a popularidade do player"). A manchete sai do show (a nota, o
// tamanho da plateia, tocou ou cantou); o "print" é arte procedural em canvas
// (sem geração paga de imagem até o LU2CA aprovar uma ferramenta; T48: ver `imagem` na manchete).
// A notícia mexe na popularidade e no neon$ do próximo show.

import { useEffect, useMemo, useRef, useState } from "react"
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
  const idx = MANCHETES.length - 1 - [...MANCHETES].reverse().findIndex((x) => r.nota >= x.min)
  const m = MANCHETES[idx]
  // a popularidade sobe com o show (cantar arrisca mais: rende um pouco mais)
  const pop = Math.round(1 + r.nota * 8 + (r.modo === "cantar" ? 1 : 0))
  // e o neon$ do show vem da popularidade de antes (quem já é conhecido ganha mais)
  const neon = Math.round(5 + popAntes * 0.6 * (0.3 + r.nota))
  return { id, missao, titulo: m.titulo(lugar, r.publico), linha: m.linha, pop, neon, modo: r.modo, nota: Math.round(r.nota * 100), publico: r.publico, ...(IMAGEM_DA_MANCHETE[String(idx)] ? { imagem: IMAGEM_DA_MANCHETE[String(idx)] } : {}) }
}

// A FOTO (T48). Se a manchete tem `imagem` (arquivo em public/ ou URL do Blob), ela entra aqui com o
// tratamento de jornal. Sem imagem, o render procedural de cena (abaixo) faz o papel de foto.
// Gerador de imagens: DESLIGADO (a escolha e o custo são do dono; ver o relatório T48). Quando ligar,
// ele só precisa gravar o arquivo e preencher `imagem` na manchete.
export const IMAGEM_DA_MANCHETE: Record<string, string | undefined> = {
  // por faixa de nota (a ordem de MANCHETES): "0" pior … "3" melhor. Ex.: "3": "/linha/jornal/a-cidade-parou.jpg"
}

// o "papel de jornal" por cima de qualquer foto: pb de alto contraste, tinta quente, grão fino e canto escuro
function tratar(g: CanvasRenderingContext2D, W: number, H: number, semente: number) {
  const img = g.getImageData(0, 0, W, H), d = img.data
  let s = semente * 7919 + 13
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = (y * W + x) * 4
    let l = (d[k] * 0.3 + d[k + 1] * 0.59 + d[k + 2] * 0.11) / 255
    l = Math.min(1, Math.max(0, (l - 0.5) * 1.35 + 0.5 + 0.02)) // contraste
    const dx = x / W - 0.5, dy = y / H - 0.5
    l *= 1 - Math.min(0.55, (dx * dx + dy * dy) * 1.25) // vinheta
    l += (r() - 0.5) * 0.11 // grão
    const v = Math.min(1, Math.max(0, l)) * 255
    d[k] = v * 1.0; d[k + 1] = v * 0.955; d[k + 2] = v * 0.86 // tinta quente (duotone preto -> papel)
  }
  g.putImageData(img, 0, 0)
}

function desenharCena(cv: HTMLCanvasElement, m: Manchete) {
  const g = cv.getContext("2d")
  if (!g) return
  const W = (cv.width = 960), H = (cv.height = 600)
  let s = m.id * 2654435761 % 2147483647 || 1
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  // fundo de palco: escuro, com a parede de trás um pouco mais clara no centro
  const fundo = g.createRadialGradient(W / 2, H * 0.38, 10, W / 2, H * 0.38, W * 0.7)
  fundo.addColorStop(0, "#5a5560"); fundo.addColorStop(0.45, "#26232c"); fundo.addColorStop(1, "#08070b")
  g.fillStyle = fundo; g.fillRect(0, 0, W, H)
  // a luz do palco: um cone largo e macio de cima (borrado, sem borda dura)
  g.save(); g.filter = "blur(18px)"
  const cone = g.createLinearGradient(0, 0, 0, H * 0.8)
  cone.addColorStop(0, "rgba(255,246,230,0.85)"); cone.addColorStop(1, "rgba(255,246,230,0.06)")
  g.fillStyle = cone; g.beginPath(); g.moveTo(W / 2 - 50, -10); g.lineTo(W / 2 + 50, -10); g.lineTo(W / 2 + 270, H * 0.8); g.lineTo(W / 2 - 270, H * 0.8); g.fill()
  g.restore()
  // fumaça: manchas grandes e borradas
  g.save(); g.filter = "blur(30px)"
  for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(200,195,205,${0.05 + r() * 0.07})`; g.beginPath(); g.ellipse(r() * W, H * 0.3 + r() * H * 0.35, 90 + r() * 120, 24 + r() * 30, 0, 0, Math.PI * 2); g.fill() }
  g.restore()
  // o chão do palco
  const chao = g.createLinearGradient(0, H * 0.6, 0, H * 0.72)
  chao.addColorStop(0, "#3a3640"); chao.addColorStop(1, "#0d0b10")
  g.fillStyle = chao; g.fillRect(0, H * 0.6, W, H * 0.12)
  // quem está no palco: silhueta de corpo inteiro com instrumento, contra a luz
  const cx = W / 2, pe = H * 0.62
  g.save(); g.filter = "blur(1.2px)"; g.fillStyle = "#07060a"
  g.beginPath(); g.ellipse(cx, pe - 205, 22, 27, 0, 0, Math.PI * 2); g.fill() // cabeça
  g.beginPath(); g.moveTo(cx - 17, pe - 182); g.lineTo(cx + 17, pe - 182); g.lineTo(cx + 40, pe - 90); g.lineTo(cx + 26, pe - 88); g.lineTo(cx + 22, pe); g.lineTo(cx + 5, pe); g.lineTo(cx, pe - 70); g.lineTo(cx - 5, pe); g.lineTo(cx - 22, pe); g.lineTo(cx - 26, pe - 88); g.lineTo(cx - 40, pe - 90); g.closePath(); g.fill()
  if (m.modo === "cantar") { g.fillRect(cx + 6, pe - 160, 3, 160); g.beginPath(); g.ellipse(cx + 7, pe - 168, 6, 8, 0, 0, Math.PI * 2); g.fill(); g.fillRect(cx + 8, pe - 190, 22, 3) } // pedestal e microfone
  else { g.save(); g.translate(cx, pe - 112); g.rotate(-0.5); g.fillRect(-4, -78, 8, 150); g.beginPath(); g.ellipse(0, 58, 26, 20, 0, 0, Math.PI * 2); g.fill(); g.restore() } // violão atravessado
  g.restore()
  // contorno de luz nos ombros e na cabeça (luz de contra)
  g.strokeStyle = "rgba(255,244,225,0.7)"; g.lineWidth = 1.6
  g.beginPath(); g.ellipse(cx, pe - 205, 22, 27, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke()
  // a plateia: cabeças e ombros em silhueta, em fileiras que crescem pra frente; poucas pessoas, poucas cabeças
  const n = Math.min(70, 3 + Math.round(m.publico * 1.1))
  const fileiras = n < 14 ? 2 : n < 40 ? 3 : 4
  g.save(); g.filter = "blur(0.8px)"
  for (let f = 0; f < fileiras; f++) {
    const t = (f + 1) / fileiras, y = H * (0.74 + 0.07 * f), esc = 0.55 + t * 0.9
    const na = Math.max(2, Math.round(n / fileiras))
    for (let i = 0; i < na; i++) {
      const x = ((i + 0.5 + (r() - 0.5) * 0.7) / na) * W
      const hr = 16 * esc * (0.9 + r() * 0.2), tom = 6 + f * 3
      g.fillStyle = `rgb(${tom},${tom - 1},${tom + 3})`
      g.beginPath(); g.ellipse(x, y, hr, hr * 1.15, 0, 0, Math.PI * 2); g.fill() // cabeça
      g.beginPath(); g.ellipse(x, y + hr * 2.3, hr * 2, hr * 1.5, 0, Math.PI, 0); g.fill() // ombros
      if (r() < 0.14) { g.fillRect(x + hr * 1.3, y - hr * 3.2, hr * 0.5, hr * 2.6); g.beginPath(); g.arc(x + hr * 1.55, y - hr * 3.2, hr * 0.55, 0, Math.PI * 2); g.fill() } // braço levantado
      // um fio de luz na cabeça, só nas primeiras fileiras (luz do palco batendo atrás)
      if (f < 2 && r() < 0.5) { g.strokeStyle = "rgba(255,240,220,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, hr, hr * 1.15, 0, Math.PI * 1.15, Math.PI * 1.85); g.stroke() }
    }
  }
  g.restore()
  tratar(g, W, H, m.id)
}

export function Jornal({ m, cor: _cor, onFechar }: { m: Manchete; cor: string; onFechar: () => void }) {
  const foto = useRef<HTMLCanvasElement>(null)
  const data = useMemo(() => new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }), [])
  const imagem = m.imagem
  const [imgOk, setImgOk] = useState(true)
  useEffect(() => { setImgOk(true) }, [imagem])
  const usaImagem = !!imagem && imgOk
  // sem imagem de arquivo: o render de cena. Com imagem: o <img> + o mesmo tratamento (CSS: pb, contraste, grão)
  useEffect(() => {
    if (usaImagem || !foto.current) return
    desenharCena(foto.current, m)
  }, [usaImagem, m])
  return (
    <div className="l-jornal" onPointerDown={(e) => e.stopPropagation()}>
      <article>
        <header><b>SUBURBANDAS</b><small>{data}</small></header>
        <h2>{m.titulo}</h2>
        <div className="l-jornal-foto">
          {usaImagem
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imagem} alt="a foto do show" className="l-jornal-img" onError={() => setImgOk(false)} />
            : <canvas ref={foto} aria-label="a foto do show" />}
          {usaImagem && <i className="l-jornal-grao" aria-hidden />}
        </div>
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
