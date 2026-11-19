"use client"

// O PARQUE DE DIVERSÕES (CN-19, protótipo do ep. 5): você entra a pé, em
// terceira pessoa (Passeio.tsx), anda entre a gente, o lago e os brinquedos;
// chega perto da montanha-russa pra dar a volta em primeira pessoa, ou da
// roda-gigante pra subir. Paga NEON no mesmo saldo do jogo.

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ac } from "./sons"
import type { Volta } from "./montanha"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"
import "./parque.css"

const Montanha = dynamic(() => import("./montanha").then((m) => m.Montanha), { ssr: false })
const Passeio = dynamic(() => import("./Passeio").then((m) => m.Passeio), { ssr: false })
import { PERTO, type Brinquedo, type Controle } from "./lugares"

const CHAVE = "cn-parque"

export default function Parque() {
  const router = useRouter()
  const [tela, setTela] = useState<"menu" | "montanha" | "passeio">("passeio")
  const [perto, setPerto] = useState<Brinquedo | null>(null)
  const [naRoda, setNaRoda] = useState(false)
  const ctl = useRef<Controle>({ mx: 0, my: 0, yaw: Math.PI, pitch: 0, corre: false, roda: false })
  const toques = useRef<{ joy: number; cam: number; jx: number; jy: number; cx: number; cy: number }>({ joy: -1, cam: -1, jx: 0, jy: 0, cx: 0, cy: 0 })
  const [joy, setJoy] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  // teclado: WASD anda, shift corre, setas giram a câmera
  useEffect(() => {
    const k = new Set<string>()
    const atualiza = () => { const c = ctl.current; c.mx = (k.has("d") ? 1 : 0) - (k.has("a") ? 1 : 0); c.my = (k.has("s") ? 1 : 0) - (k.has("w") ? 1 : 0); c.corre = k.has("shift") }
    const gira = setInterval(() => { const c = ctl.current; if (k.has("arrowleft")) c.yaw += 0.05; if (k.has("arrowright")) c.yaw -= 0.05 }, 16)
    const dn = (e: KeyboardEvent) => { k.add(e.key.toLowerCase()); atualiza() }
    const up = (e: KeyboardEvent) => { k.delete(e.key.toLowerCase()); atualiza() }
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); clearInterval(gira) }
  }, [])
  // o dedo: metade esquerda é o joystick, metade direita gira a câmera
  const tDown = (e: React.PointerEvent) => {
    const t = toques.current, w = window.innerWidth
    if (e.clientX < w * 0.45 && t.joy < 0) { t.joy = e.pointerId; t.jx = e.clientX; t.jy = e.clientY; setJoy({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 }) }
    else if (t.cam < 0) { t.cam = e.pointerId; t.cx = e.clientX; t.cy = e.clientY }
  }
  const tMove = (e: React.PointerEvent) => {
    const t = toques.current, c = ctl.current
    if (e.pointerId === t.joy) {
      const R = 56, dx = e.clientX - t.jx, dy = e.clientY - t.jy, d = Math.hypot(dx, dy), k = d > R ? R / d : 1
      c.mx = (dx * k) / R; c.my = (dy * k) / R
      setJoy({ x: t.jx, y: t.jy, dx: dx * k, dy: dy * k })
    } else if (e.pointerId === t.cam) {
      c.yaw -= (e.clientX - t.cx) * 0.006; c.pitch = Math.max(-0.4, Math.min(0.8, c.pitch + (e.clientY - t.cy) * 0.004))
      t.cx = e.clientX; t.cy = e.clientY
    }
  }
  const tUp = (e: React.PointerEvent) => {
    const t = toques.current
    if (e.pointerId === t.joy) { t.joy = -1; ctl.current.mx = 0; ctl.current.my = 0; setJoy(null) }
    if (e.pointerId === t.cam) t.cam = -1
  }
  const [neon, setNeon] = useState(0)
  const [rec, setRec] = useState({ voltas: 0, velMax: 0 })
  const [ultima, setUltima] = useState<{ v: Volta; ganho: number } | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeon(saldoInicial())
    try { setRec({ voltas: 0, velMax: 0, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") }) } catch {}
  }, [])

  const fim = async (v: Volta) => {
    const ganho = 2 + (v.bracos >= 0.9 ? 4 : 0)
    const r = { voltas: rec.voltas + 1, velMax: Math.max(rec.velMax, v.velMax) }
    setRec(r)
    try { localStorage.setItem(CHAVE, JSON.stringify(r)) } catch {}
    setUltima({ v, ganho })
    const n = await mudarNeon(ganho)
    setNeon(n.neon)
    setTimeout(() => setTela("passeio"), 1800)
  }

  if (tela === "montanha") return <div className="pq-raiz"><Montanha onFim={(v) => void fim(v)} onSair={() => setTela("passeio")} /></div>

  if (tela === "passeio") {
    const b = PERTO.find((x) => x.id === perto)
    return (
      <div className="pq-raiz">
        <div className="pq-jogo" onPointerDown={tDown} onPointerMove={tMove} onPointerUp={tUp} onPointerCancel={tUp}>
          <Passeio ctl={ctl} onPerto={setPerto} montado={naRoda} />
          <header className="pq-topo-passeio" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => router.push("/?screen=home")}>‹ sair</button>
            <b>o parque</b>
            <span>{neon} <small>Água$</small></span>
          </header>
          {joy && <div className="pq-joy" style={{ left: joy.x, top: joy.y }}><i style={{ transform: `translate(${joy.dx}px, ${joy.dy}px)` }} /></div>}
          {!joy && !naRoda && <p className="pq-dica-passeio">o dedo na esquerda anda · na direita olha em volta</p>}
          {ultima && <div className="pq-foto is-passeio"><b>{ultima.v.bracos >= 0.9 ? "a foto da descida: braços pra cima" : "a foto da descida"}</b><small>{Math.round(ultima.v.velMax * 3.6)} km/h · +{ultima.ganho} Água$</small></div>}
          {naRoda ? (
            <button type="button" className="pq-acao" onPointerDown={(e) => e.stopPropagation()} onClick={() => setNaRoda(false)}>descer da roda-gigante</button>
          ) : b && b.id !== "carrossel" ? (
            <button type="button" className="pq-acao" onPointerDown={(e) => e.stopPropagation()} onClick={() => { ac(); if (b.id === "montanha") { setUltima(null); setTela("montanha") } else setNaRoda(true) }}>{b.nome}</button>
          ) : b ? <p className="pq-acao is-info">o carrossel · gira a noite toda</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="pq-raiz">
      <section className="pq-menu">
        <header>
          <button type="button" onClick={() => router.push("/?screen=home")}>‹ sair</button>
          <span>{neon} <small>Água$</small></span>
        </header>
        <h1>PARQUE</h1>
        <p className="pq-sub">de noite · a roda-gigante acesa</p>
        {ultima && (
          <div className="pq-foto">
            <b>{ultima.v.bracos >= 0.9 ? "a foto da descida: braços pra cima" : "a foto da descida"}</b>
            <small>{Math.round(ultima.v.velMax * 3.6)} km/h · {ultima.v.gMax.toFixed(1)} g · +{ultima.ganho} Água$</small>
          </div>
        )}
        <button type="button" className="pq-card is-montanha" onClick={() => { ac(); setUltima(null); setTela("montanha") }}>
          <b>montanha-russa</b><small>{rec.voltas} voltas · recorde: {Math.round(rec.velMax * 3.6)} km/h</small><em>2 de Água$ · braços pra cima na descida: +4</em>
        </button>
        <button type="button" className="pq-card" onClick={() => { ac(); setTela("passeio"); setNaRoda(true) }}><b>roda-gigante</b><small>dar uma volta lá no alto</small></button>
        <button type="button" className="pq-card" onClick={() => { ac(); router.push("/fliperama") }}><b>fliperama</b><small>as máquinas</small></button>
      </section>
    </div>
  )
}
