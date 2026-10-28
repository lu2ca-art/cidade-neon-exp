"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GRAFITES } from "./grafites"
import { Motor, type Estado } from "./motor"
import type { Grafite } from "./tipos"
import "./grafite.css"

const CHAVE = "cn-grafites-teste"
const ler = (): string[] => { try { return JSON.parse(localStorage.getItem(CHAVE) || "[]") } catch { return [] } }
const gravar = (l: string[]) => { try { localStorage.setItem(CHAVE, JSON.stringify(l)) } catch {} }

function Miniatura({ g, tem }: { g: Grafite; tem: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const d = 2, s = 64
    cv.width = s * d; cv.height = s * d
    const x = cv.getContext("2d")!
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, s, s)
    x.lineCap = "round"; x.lineJoin = "round"
    const m = (p: [number, number]) => [4 + (p[0] / 100) * (s - 8), 4 + (p[1] / 100) * (s - 8)]
    if (tem) {
      for (const t of g.tracos) {
        x.strokeStyle = t.cor; x.lineWidth = Math.max(1, (t.largura / 100) * (s - 8)); x.shadowColor = t.cor; x.shadowBlur = 4
        x.beginPath(); t.pts.forEach((p, i) => { const [a, b] = m(p); if (i) x.lineTo(a, b); else x.moveTo(a, b) }); x.stroke()
      }
    } else {
      x.strokeStyle = "rgba(255,255,255,.25)"; x.lineWidth = 1.5; x.setLineDash([3, 4])
      x.beginPath(); g.gesto.forEach((p, i) => { const [a, b] = m(p); if (i) x.lineTo(a, b); else x.moveTo(a, b) }); x.stroke(); x.setLineDash([])
      g.gesto.forEach((p) => { const [a, b] = m(p); x.fillStyle = "rgba(34,230,255,.7)"; x.beginPath(); x.arc(a, b, 2.5, 0, 6.283); x.fill() })
    }
  }, [g, tem])
  return <canvas ref={ref} />
}

export function Vitrine() {
  const parede = useRef<HTMLCanvasElement>(null)
  const brilho = useRef<HTMLCanvasElement>(null)
  const arte = useRef<HTMLCanvasElement>(null)
  const fx = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const motor = useRef<Motor | null>(null)
  const [sel, setSel] = useState(0)
  const [tem, setTem] = useState<string[]>([])
  const [estado, setEstado] = useState<Estado>("esperando")
  const temRef = useRef<string[]>([])
  const selRef = useRef(0)

  const trocar = useCallback((i: number) => {
    selRef.current = i; setSel(i)
    motor.current?.usar(GRAFITES[i], temRef.current.includes(GRAFITES[i].id))
  }, [])

  useEffect(() => {
    const l = ler(); temRef.current = l
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTem(l)
    const m = new Motor(
      { parede: parede.current!, brilho: brilho.current!, arte: arte.current!, fx: fx.current! },
      {
        estado: setEstado,
        completou: (g) => { if (!temRef.current.includes(g.id)) { temRef.current = [...temRef.current, g.id]; gravar(temRef.current); setTem(temRef.current) } },
      },
    )
    motor.current = m
    const ro = new ResizeObserver(() => { const r = raiz.current!.getBoundingClientRect(); m.dimensionar(r.width, r.height) })
    ro.observe(raiz.current!)
    const r = raiz.current!.getBoundingClientRect(); m.dimensionar(r.width, r.height)
    m.usar(GRAFITES[0], l.includes(GRAFITES[0].id))
    return () => { ro.disconnect(); m.destruir(); motor.current = null }
  }, [])

  const g = GRAFITES[sel]
  const jaTem = tem.includes(g.id)
  const limpar = () => { temRef.current = []; gravar([]); setTem([]); motor.current?.usar(GRAFITES[selRef.current], false) }

  return (
    <div ref={raiz} className="gf-raiz" data-estado={estado}>
      <canvas ref={parede} />
      <canvas ref={brilho} className="gf-brilho" />
      <canvas ref={arte} />
      <canvas ref={fx} className="gf-fx" aria-label="parede do túnel: ligue os pontos em ordem" />
      <div className="gf-topo">
        <a href="/teste">← atalhos</a>
        {g.rascunho && <span className="gf-selo">rascunho · desenho provisório</span>}
      </div>
      <button type="button" className="gf-reset" onClick={limpar}>zerar coleção ({tem.length}/{GRAFITES.length})</button>
      <div className="gf-dica">
        {estado === "esperando" && <><b>{g.nome}</b><span>liga os pontos em ordem, do 1 ao {g.gesto.length}</span></>}
        {estado === "ligando" && <span>continua… arrasta até o próximo ponto</span>}
        {estado === "revelando" && <b>assinando…</b>}
        {estado === "pronto" && (
          <>
            <b>{g.nome}</b>
            <span>{jaTem ? "na sua coleção" : ""} · {tem.length}/{GRAFITES.length} grafites</span>
            <br /><button type="button" className="gf-de-novo" onClick={() => motor.current?.refazer()}>assinar de novo</button>
          </>
        )}
      </div>
      <div className="gf-colecao">
        {GRAFITES.map((x, i) => (
          <button key={x.id} type="button" className="gf-item" aria-pressed={i === sel} onClick={() => trocar(i)}>
            <Miniatura g={x} tem={tem.includes(x.id)} />
            <small>{tem.includes(x.id) ? x.nome : "gesto novo"}</small>
            <i>{tem.includes(x.id) ? "COLECIONADO" : `${x.gesto.length} PONTOS`}</i>
          </button>
        ))}
      </div>
    </div>
  )
}
