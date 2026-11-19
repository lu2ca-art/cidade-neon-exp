"use client"

// A BARGANHA, O QUE FICA POR CIMA DO MUNDO (ep. 5 · Swav): sem fundo. Só o dedo (ou o
// mouse), o rastro do pincel vermelho, o bolso, a conta e o "fechar". Os legumes,
// o cartaz e os sacos estão na banca, no 3D (FeiraBanca). Aqui o React só renderiza
// quando a conta muda; o pincel pinta direto no canvas, e só enquanto há rastro.

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { FEIRA, FEIRA_VIVO, abrirFeiraViva, contaDe, fecharFeiraViva, lerFeira, ouvirFeira, podeFechar } from "./feira"
import { somPagar } from "./feiraSons"
import "./feira.css"

// os pregões são os documentados em referencias-feira.md (sem preço em real)
const PREGOES = ["Olha o tempero verde, tá fresquinho, esperando pela senhora!", "D. Maria, aqui a verdura é mais barata!", "Moça bonita não paga, mas também não leva", "Quer limão freguesa? Tá verdinho"]
const VIDA_RASTRO_MS = 240, MAX_RASTRO = 40
// sem o 3D em volta (longe da feira, um save antigo no meio da peça): fecha sem perder nada
const ESPERA_3D_MS = 6000

export function FeiraTela({ livre, onFim }: { livre: boolean; onFim: (ok: boolean, conta: number) => void }) {
  const conta = useSyncExternalStore(ouvirFeira, lerFeira, () => 0)
  const cv = useRef<HTMLCanvasElement>(null)
  const [pago, setPago] = useState(false)
  const [pregao, setPregao] = useState(0)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])

  useEffect(() => {
    abrirFeiraViva()
    return () => fecharFeiraViva()
  }, [])
  useEffect(() => {
    const t = setTimeout(() => { if (!FEIRA_VIVO.pronto3D) fim.current(false, 0) }, ESPERA_3D_MS)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    const i = setInterval(() => setPregao((p) => (p + 1) % PREGOES.length), 7000)
    return () => clearInterval(i)
  }, [])
  // as teclas não vazam pra Kombi; Esc sai
  useEffect(() => {
    const parar = (e: KeyboardEvent) => { if (e.key === "Escape") fim.current(false, 0); e.stopPropagation() }
    window.addEventListener("keydown", parar, true)
    return () => window.removeEventListener("keydown", parar, true)
  }, [])

  // ── o pincel: pontos com hora; o 3D chama `desenhar` uma vez por quadro ──
  const rastro = useRef({ pts: [] as { x: number; y: number; t: number }[], ativo: -1, ult: null as { x: number; y: number; t: number } | null, sujo: false })
  useEffect(() => {
    const c = cv.current!
    const dpr = Math.min(1.5, window.devicePixelRatio || 1)
    const medir = () => { c.width = Math.round(c.clientWidth * dpr); c.height = Math.round(c.clientHeight * dpr) }
    const ro = new ResizeObserver(medir)
    ro.observe(c)
    medir()
    const g = c.getContext("2d")!
    const r = rastro.current
    FEIRA_VIVO.desenhar = (agora) => {
      while (r.pts.length && agora - r.pts[0].t > VIDA_RASTRO_MS) r.pts.shift()
      if (!r.pts.length) {
        if (r.sujo) { g.clearRect(0, 0, c.width, c.height); r.sujo = false }
        return
      }
      g.clearRect(0, 0, c.width, c.height)
      const box = c.getBoundingClientRect()
      g.lineCap = "round"; g.lineJoin = "round"
      for (let i = 1; i < r.pts.length; i++) {
        const a = r.pts[i - 1], b = r.pts[i], vida = 1 - (agora - b.t) / VIDA_RASTRO_MS
        const larg = (4 + 13 * vida * (i / r.pts.length)) * dpr
        // a tinta: o miolo vermelho e a borda seca do pincel, um pouco torta
        g.strokeStyle = `rgba(120,10,16,${0.55 * vida})`; g.lineWidth = larg * 1.35
        g.beginPath(); g.moveTo((a.x - box.left) * dpr, (a.y - box.top) * dpr); g.lineTo((b.x - box.left) * dpr + (i % 2 ? 1.5 : -1.5), (b.y - box.top) * dpr); g.stroke()
        g.strokeStyle = `rgba(226,32,38,${0.95 * vida})`; g.lineWidth = larg
        g.beginPath(); g.moveTo((a.x - box.left) * dpr, (a.y - box.top) * dpr); g.lineTo((b.x - box.left) * dpr, (b.y - box.top) * dpr); g.stroke()
      }
      r.sujo = true
    }
    return () => { ro.disconnect(); FEIRA_VIVO.desenhar = null }
  }, [])

  const baixo = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = rastro.current
    if (r.ativo !== -1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    r.ativo = e.pointerId
    r.ult = { x: e.clientX, y: e.clientY, t: performance.now() }
    r.pts.push(r.ult)
  }
  const mexe = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = rastro.current
    if (r.ativo !== e.pointerId || !r.ult) return
    const agora = performance.now(), a = r.ult
    const d = Math.hypot(e.clientX - a.x, e.clientY - a.y), dtS = Math.max(0.001, (agora - a.t) / 1000)
    if (d < 3) return
    if (FEIRA_VIVO.riscos.length < 48) FEIRA_VIVO.riscos.push({ x0: a.x, y0: a.y, x1: e.clientX, y1: e.clientY, vel: d / dtS })
    r.ult = { x: e.clientX, y: e.clientY, t: agora }
    r.pts.push(r.ult)
    if (r.pts.length > MAX_RASTRO) r.pts.shift()
  }
  const solta = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = rastro.current
    if (r.ativo === e.pointerId) { r.ativo = -1; r.ult = null }
  }

  const fecha = podeFechar(FEIRA_VIVO.cortes)
  const pagar = contaDe(FEIRA_VIVO.cortes)
  return (
    <div className="fa-raiz" data-testid="feira" role="application" aria-label="a barganha na feira: passe o dedo nos legumes pra cortar o preço" onPointerDown={(e) => e.stopPropagation()}>
      <canvas ref={cv} className="fa-pincel" onPointerDown={baixo} onPointerMove={mexe} onPointerUp={solta} onPointerCancel={solta} />
      <div className="fa-topo">
        <button type="button" className="fa-sair" onClick={() => onFim(false, 0)}>← sair</button>
        <div className="fa-bolso">
          {!livre && <span>no bolso <b>{FEIRA.bolso}</b> Água$</span>}
          <span data-testid="feira-conta">a conta <b className={fecha ? "is-coube" : ""}>{conta}</b> Água$</span>
        </div>
      </div>
      {!pago && !fecha && <p key={pregao} className="fa-pregao">{PREGOES[pregao]}</p>}
      {fecha && !pago && (
        <div className="fa-fim">
          <button type="button" data-testid="feira-fechar" onClick={() => { somPagar(); setPago(true) }}>{livre ? "levar os 4 sacos" : `pagar ${pagar} Água$ e levar os 4 sacos`}</button>
        </div>
      )}
      {pago && (
        <div className="fa-fim">
          <p>os 4 sacos são seus</p>
          <button type="button" data-testid="feira-pegar" onClick={() => onFim(true, livre ? 0 : pagar)} autoFocus>pegar os sacos →</button>
        </div>
      )}
    </div>
  )
}
