"use client"

// A CIDADE NOVA (o motor do mapa livre, etapa 2): você dirige pela rede de
// ruas do v5. Marca o destino no mapa grande e as ruas te levam; sem destino,
// a Kombi segue a rua (segurando pro lado, vira no próximo cruzamento).
// Retorno nas retas compridas. 10 s sem tocar, desliga: "dar partida".

import { Canvas } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { VEL, noMaisPerto, rota } from "../linha/rede/rede"
import { H, W } from "../linha/rede/terreno"
import { Cena, type Carro, type Ceu, type Entrada } from "./Cena"
import { RADIOS, Radio } from "./radio"
import { abertoAgora, abreAs, horaTexto } from "../linha/relogio"
import { marcarDaCidade } from "../linha/paginas"
import type { FreqId } from "../linha/radio"
import { NOME_BAIRRO, montarMundo, ux, uy } from "./mundo"
import "./cidade.css"

const COR_VIA: Record<string, string> = { expressa: "#ff3fb0", avenida: "#d8b8ff", orla: "#33d6c8", principal: "#ffc857", rua: "#cfcadf", beco: "#ff9a5c", tunel: "#8a8aa8", serpentina: "#b4ff8a", terra: "#c8904a", rampa: "#ff8ad0" }

export function Jogo() {
  const router = useRouter()
  const mundo = useMemo(() => montarMundo(), [])
  const inicio = useMemo(() => {
    const n = noMaisPerto(mundo.rede, 900, 480), ai = n.arestas[0], t = mundo.trilhas[ai]
    return { t: ai, s: t.e.a === n.id ? 20 : t.len - 20, d: (t.e.a === n.id ? 1 : -1) as 1 | -1 }
  }, [mundo])
  const carro = useRef<Carro>({ ...inicio, x: 2, v: 0, steer: 0, desligada: false, ultimo: 0, rota: [], destino: null, chegou: false, retorno: false, pedeRetorno: false, X: 0, Z: 0, rumo: 0 })
  const ent = useRef<Entrada>({ esq: false, dir: false, gas: false, freio: false, toque: false })
  const [hud, setHud] = useState({ kmh: 0, area: "", retorno: false, desligada: false, eta: "", chegou: false, hora: "", chove: false, lugar: -1, aberto: false })
  // o save do jogo (as missões, a hora, o dia): só lê
  const save = useMemo(() => { try { return JSON.parse(localStorage.getItem("cn-linha-222") || "{}") as { objetos?: string[]; hora?: number; dia?: number } } catch { return {} } }, [])
  const objetos = useMemo(() => save.objetos ?? [], [save])
  const ceu = useRef<Ceu>({ hora: save.hora ?? 20, dia: save.dia ?? 1, noite: 1, chove: false })
  // a rádio (etapa 3): liga no primeiro toque
  const radio = useMemo(() => new Radio(), [])
  const [aoVivo, setAoVivo] = useState<{ freq: FreqId; titulo: string; abafada: boolean; ligada: boolean }>({ freq: "linha", titulo: "", abafada: false, ligada: false })
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- o aparelho é um objeto de áudio, não estado do React
    radio.aoMudar = () => setAoVivo({ freq: radio.freq, titulo: radio.agora?.titulo ?? "", abafada: !!radio.agora?.abafada, ligada: radio.ligada })
    radio.sintonizar("linha", objetos)
    const liga = () => { if (!radio.ligada) radio.ligar(); window.removeEventListener("pointerdown", liga); window.removeEventListener("keydown", liga) }
    window.addEventListener("pointerdown", liga); window.addEventListener("keydown", liga)
    return () => { window.removeEventListener("pointerdown", liga); window.removeEventListener("keydown", liga); radio.parar() }
  }, [radio, objetos])
  const trocarRadio = (passo: number) => {
    const i = RADIOS.findIndex((r) => r.id === radio.freq)
    radio.sintonizar(RADIOS[(i + passo + RADIOS.length) % RADIOS.length].id, objetos)
  }
  // voltando de um lugar: a Kombi reaparece onde parou
  useEffect(() => {
    try {
      if (new URLSearchParams(location.search).get("volta") !== "1") return
      const p = JSON.parse(sessionStorage.getItem("cn-cidade-pos") || "null")
      if (p) { const c = carro.current; Object.assign(c, { t: p.t, s: p.s, d: p.d, x: p.x, v: 0, salto: true, desligada: true }); ceu.current.hora = p.hora }
    } catch {}
  }, [])
  const [destino, setDestino] = useState<number | null>(null)
  const [mapa, setMapa] = useState(false)
  const mini = useRef<HTMLCanvasElement>(null)
  const grande = useRef<HTMLCanvasElement>(null)

  // o teclado e o "tem gente aqui"
  useEffect(() => {
    carro.current.ultimo = performance.now()
    const tecla = (ev: KeyboardEvent, on: boolean) => {
      const k = ev.key.toLowerCase(), e = ent.current, c = carro.current
      c.ultimo = performance.now()
      if (k === "arrowleft" || k === "a") e.esq = on
      else if (k === "arrowright" || k === "d") e.dir = on
      else if (k === "arrowup" || k === "w") { e.gas = on; if (on) { c.desligada = false; c.chegou = false } }
      else if (k === "arrowdown" || k === "s") e.freio = on
      else if (k === "r" && on && c.retorno) c.pedeRetorno = true
      else if (k === "m" && on) setMapa((m) => !m)
      else return
      ev.preventDefault()
    }
    const kd = (e: KeyboardEvent) => tecla(e, true), ku = (e: KeyboardEvent) => tecla(e, false)
    const vivo = () => { carro.current.ultimo = performance.now() }
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("pointerdown", vivo)
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("pointerdown", vivo) }
  }, [])

  // atalho de teste (fora da produção): window.__cdIr(x, y) leva a Kombi pro cruzamento mais perto
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as { __cdIr?: (x: number, y: number) => void; __cdEstado?: () => object }
    w.__cdIr = (x, y) => {
      const n = noMaisPerto(mundo.rede, x, y), ai = n.arestas[0], t = mundo.trilhas[ai], c = carro.current
      c.t = ai; c.d = t.e.a === n.id ? 1 : -1; c.s = c.d > 0 ? 15 : t.len - 15; c.x = 2; c.salto = true
    }
    ;(w as unknown as { __cdRetorno: () => void }).__cdRetorno = () => {
      const r = mundo.rede.retornos[0], t = mundo.trilhas[r.aresta], c = carro.current
      c.t = r.aresta; c.d = 1; c.s = r.f * t.len - 60; c.x = 3; c.salto = true
    }
    w.__cdEstado = () => { const c = carro.current; return { t: c.t, s: Math.round(c.s), d: c.d, x: +c.x.toFixed(1), v: Math.round(c.v), retorno: c.retorno, via: mundo.trilhas[c.t].e.via, bairro: mundo.trilhas[c.t].e.bairro } }
  }, [mundo])

  // o HUD e o minimapa (girando com a Kombi), 10× por segundo
  useEffect(() => {
    const id = setInterval(() => {
      const c = carro.current, t = mundo.trilhas[c.t]
      let eta = ""
      if (c.destino !== null) {
        const prox = c.d > 0 ? t.e.b : t.e.a
        const R = rota(mundo.rede, prox, c.destino)
        const resto = (c.d > 0 ? t.len - c.s : c.s) / VEL[t.e.tipo]
        if (R) eta = `${((R.m + (c.d > 0 ? t.len - c.s : c.s)) / 1000).toFixed(1)} km · ${Math.max(1, Math.round((R.seg + resto) / 60))} min`
      }
      // o lugar mais perto (a menos de 40 m da Kombi)
      let lugar = -1, dl = 40
      mundo.lugares.forEach((p, k) => { const d = Math.hypot(p.X - c.X, p.Z - c.Z); if (d < dl) { dl = d; lugar = k } })
      setHud({ kmh: Math.round(c.v * 3.6), area: NOME_BAIRRO[t.e.bairro], retorno: c.retorno, desligada: c.desligada, eta, chegou: c.chegou, hora: horaTexto(ceu.current.hora), chove: ceu.current.chove, lugar, aberto: lugar >= 0 && abertoAgora(mundo.lugares[lugar].l.horario, ceu.current.hora) })
      const cv = mini.current, g = cv?.getContext("2d"); if (!cv || !g) return
      const S = cv.width, k = 0.32 // px por unidade
      g.clearRect(0, 0, S, S)
      g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip()
      g.fillStyle = "rgba(10,8,24,0.78)"; g.fillRect(0, 0, S, S)
      g.translate(S / 2, S / 2); g.rotate(Math.PI - c.rumo); g.scale(k, k); g.translate(-ux(c.X), -uy(c.Z))
      const naRota = new Set(c.rota); naRota.add(c.t)
      for (const a of mundo.rede.arestas) {
        g.strokeStyle = c.destino !== null && naRota.has(a.id) ? "#5dffa0" : COR_VIA[a.tipo]
        g.lineWidth = (a.tipo === "expressa" ? 9 : a.tipo === "beco" ? 4 : 6) / k * 0.35
        g.beginPath(); a.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
      }
      if (c.destino !== null) { const n = mundo.rede.nos[c.destino]; g.fillStyle = "#5dffa0"; g.beginPath(); g.arc(n.x, n.y, 8, 0, Math.PI * 2); g.fill() }
      g.restore()
      g.fillStyle = "#ff3fb0"; g.beginPath(); g.moveTo(S / 2, S / 2 - 8); g.lineTo(S / 2 + 6, S / 2 + 6); g.lineTo(S / 2 - 6, S / 2 + 6); g.closePath(); g.fill()
    }, 100)
    return () => clearInterval(id)
  }, [mundo])

  // o mapa grande: a cidade inteira; tocar marca o destino
  useEffect(() => {
    if (!mapa) return
    const cv = grande.current, g = cv?.getContext("2d"); if (!cv || !g) return
    const r = cv.getBoundingClientRect(); cv.width = r.width * 2; cv.height = r.height * 2
    const k = Math.min(cv.width / W, cv.height / H) * 0.95, ox = (cv.width - W * k) / 2, oy = (cv.height - H * k) / 2
    g.fillStyle = "#120e22"; g.fillRect(0, 0, cv.width, cv.height)
    g.save(); g.translate(ox, oy); g.scale(k, k)
    // as áreas, de leve
    const AREAS: [number, number, number, number, string, string][] = [[1000, 590, 440, 300, "#5a2a8a", "a cidade neon"], [830, 1010, 480, 250, "#8a5a2a", "o subúrbio"], [1610, 300, 380, 290, "#2a6a3a", "o mirante"], [1580, 780, 250, 200, "#8a3a1a", "a arena"], [150, 700, 430, 900, "#8a6a3a", "o deserto"]]
    for (const [x, y, rx, ry, c] of AREAS) { g.fillStyle = c + "55"; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill() }
    g.fillStyle = "#1a4a6a"; g.beginPath(); g.moveTo(860, H + 200); for (let x = 860; x <= W; x += 20) g.lineTo(x, H - (x - 860) * 0.42); g.lineTo(W, H + 200); g.fill()
    const c = carro.current, naRota = new Set(c.rota)
    for (const a of mundo.rede.arestas) {
      g.strokeStyle = c.destino !== null && naRota.has(a.id) ? "#5dffa0" : COR_VIA[a.tipo]; g.lineWidth = a.tipo === "expressa" ? 7 : 4; g.lineCap = "round"
      g.beginPath(); a.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke()
    }
    g.font = "bold 34px ui-monospace, monospace"; g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,0.75)"
    for (const [x, y, , , , nome] of AREAS) g.fillText(nome, x, y - 30)
    g.fillText("a orla", 1600, 1080)
    // os lugares: um ponto na cor de cada um, com o nome
    // (o tamanho do texto acompanha a escala: legível no celular)
    g.font = `bold ${Math.round(22 / Math.max(0.25, k))}px ui-monospace, monospace`
    for (const p of mundo.lugares) { const x = ux(p.X), y = uy(p.Z); g.fillStyle = p.l.cor; g.beginPath(); g.arc(x, y, 6 / Math.max(0.25, k), 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(255,255,255,0.9)"; g.fillText(p.l.nome.replace(/^(o|a|as|os) /, ""), x, y - 10 / Math.max(0.25, k)) }
    g.fillStyle = "#ff3fb0"; g.beginPath(); g.arc(ux(c.X), uy(c.Z), 16, 0, Math.PI * 2); g.fill()
    if (c.destino !== null) { const n = mundo.rede.nos[c.destino]; g.fillStyle = "#5dffa0"; g.beginPath(); g.arc(n.x, n.y, 18, 0, Math.PI * 2); g.fill() }
    g.restore()
    cv.dataset.k = String(k); cv.dataset.ox = String(ox); cv.dataset.oy = String(oy)
  }, [mapa, destino, mundo])

  const marcar = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = ev.currentTarget, r = cv.getBoundingClientRect()
    const k = Number(cv.dataset.k), ox = Number(cv.dataset.ox), oy = Number(cv.dataset.oy)
    const x = ((ev.clientX - r.left) * 2 - ox) / k, y = ((ev.clientY - r.top) * 2 - oy) / k
    const c = carro.current, t = mundo.trilhas[c.t]
    const lugar = mundo.lugares.find((p) => Math.hypot(ux(p.X) - x, uy(p.Z) - y) < 40)
    const alvo = lugar ? lugar.no : noMaisPerto(mundo.rede, x, y).id
    const R = rota(mundo.rede, c.d > 0 ? t.e.b : t.e.a, alvo)
    c.destino = alvo; c.rota = R ? R.arestas : []; c.chegou = false; c.desligada = false; c.ultimo = performance.now()
    setDestino(alvo)
  }

  // o dedo: segurar na esquerda/direita da tela vira
  const toques = useRef(new Map<number, "esq" | "dir">())
  const dedo = (ev: React.PointerEvent, on: boolean) => {
    const e = ent.current
    if (on) toques.current.set(ev.pointerId, ev.clientX < window.innerWidth / 2 ? "esq" : "dir")
    else toques.current.delete(ev.pointerId)
    const lados = [...toques.current.values()]
    e.esq = lados.includes("esq"); e.dir = lados.includes("dir")
  }

  return (
    <div className="cd-raiz" onPointerDown={(e) => dedo(e, true)} onPointerUp={(e) => dedo(e, false)} onPointerCancel={(e) => dedo(e, false)}>
      <Canvas dpr={[1, 1.5]} camera={{ fov: 58, near: 0.3, far: 6000, position: [0, 40, 60] }} className="cd-cvs">
        <Cena mundo={mundo} carro={carro} ent={ent} destino={destino} ceu={ceu} onChegou={() => setDestino(null)} />
      </Canvas>
      <header className="cd-topo" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => router.push("/linha")}>‹ sair</button>
        <b>{hud.area}</b>
        <span className="cd-beta">{hud.hora}{hud.chove ? " · chuva" : ""}</span>
      </header>
      <canvas ref={mini} className="cd-mini" width={180} height={180} onPointerDown={(e) => { e.stopPropagation(); setMapa(true) }} />
      <div className="cd-vel"><b>{hud.kmh}</b><small>km/h</small></div>
      <div className="cd-radio" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" aria-label="rádio anterior" onClick={() => trocarRadio(-1)}>‹</button>
        <span onClick={() => (aoVivo.ligada ? radio.desligar() : radio.ligar())}>
          <b style={{ color: RADIOS.find((r) => r.id === aoVivo.freq)?.cor }}>{RADIOS.find((r) => r.id === aoVivo.freq)?.freq} FM</b>
          <small>{!aoVivo.ligada ? "desligado · toca pra ligar" : aoVivo.titulo ? `${aoVivo.titulo}${aoVivo.abafada ? " · abafada" : ""}` : "fora do ar"}</small>
        </span>
        <button type="button" aria-label="próxima rádio" onClick={() => trocarRadio(1)}>›</button>
      </div>
      {(() => {
        const p = mundo.lugares[hud.lugar]; if (!p) return null
        const l = p.l, trancado = !!l.exige && !objetos.includes(l.exige), aberto = hud.aberto
        if (l.rota && aberto && !trancado) return (
          <button type="button" className="cd-entrar" style={{ ["--cor" as string]: l.cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => {
            const c = carro.current
            try { sessionStorage.setItem("cn-cidade-pos", JSON.stringify({ t: c.t, s: c.s, d: c.d, x: c.x, hora: ceu.current.hora })) } catch {}
            radio.desligar(); marcarDaCidade("nova"); router.push(`${l.rota}?de=cidade`)
          }}>entrar · {l.nome}</button>
        )
        return <p className="cd-lugar" style={{ ["--cor" as string]: l.cor }}>{l.nome} · {trancado ? "de portas fechadas" : l.rota && !aberto ? `abre às ${abreAs(l.horario)}` : l.nota ?? ""}</p>
      })()}
      {hud.eta && <p className="cd-eta">até o destino · {hud.eta}</p>}
      {hud.chegou && <p className="cd-eta is-chegou">chegou</p>}
      <div className="cd-bts" onPointerDown={(e) => e.stopPropagation()}>
        {hud.retorno && <button type="button" className="is-retorno" onClick={() => { carro.current.pedeRetorno = true }}>↩ retorno</button>}
        {hud.desligada || hud.chegou
          ? <button type="button" className="is-partida" onClick={() => { const c = carro.current; c.desligada = false; c.chegou = false; c.ultimo = performance.now() }}>dar partida</button>
          : <button type="button" onPointerDown={() => { ent.current.freio = true }} onPointerUp={() => { ent.current.freio = false }} onPointerLeave={() => { ent.current.freio = false }}>freio</button>}
        <button type="button" onClick={() => setMapa(true)}>mapa</button>
      </div>
      {mapa && (
        <div className="cd-mapa" onPointerDown={(e) => e.stopPropagation()}>
          <canvas ref={grande} onPointerDown={marcar} />
          <p>toca onde você quer ir · as ruas te levam</p>
          <div>
            {destino !== null && <button type="button" onClick={() => { const c = carro.current; c.destino = null; c.rota = []; setDestino(null) }}>tirar o destino</button>}
            <button type="button" onClick={() => setMapa(false)}>voltar pra rua</button>
          </div>
        </div>
      )}
      <p className="cd-dica">segura na esquerda ou na direita pra virar · ↑ ↓ ← → no computador · R retorno · M mapa</p>
    </div>
  )
}
