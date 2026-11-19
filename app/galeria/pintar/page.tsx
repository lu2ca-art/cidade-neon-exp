"use client"

// PINTAR (CN-21, a galeria de dia, versão enxuta): uma tela, o pincel, o spray,
// o balde e a borracha nas cores da cidade. Dar um nome e expor manda a obra
// pra parede da galeria e paga um pouco de NEON. E a tela toca: cada cor é um
// instrumento, a altura é a nota, e a linha varre a tela em loop (som.ts).

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { guardarObra, lerObras, type Obra } from "../obras"
import { mudarNeon, saldoInicial } from "../../neon-tiles/neon"
import { CORES, INSTRUMENTOS, criarEco, freqDaAltura, notasDaColuna, tocar } from "./som"
import "./pintar.css"

const LARG = 600, ALT = 800
const FUNDOS = { escuro: "#14121c", claro: "#efe8da" }
const TAMANHOS = [6, 16, 40]
const PAGA = 3
const MIN_TRACOS = 25
const DENSIDADES = [16, 32, 64]  // passos por volta da linha

type Ferramenta = "pincel" | "spray" | "balde" | "borracha"

// balde: preenche a região da mesma cor (com tolerância), linha por linha
function balde(g: CanvasRenderingContext2D, x0: number, y0: number, hex: string) {
  const img = g.getImageData(0, 0, LARG, ALT), d = img.data
  const i0 = (y0 * LARG + x0) * 4
  const alvo = [d[i0], d[i0 + 1], d[i0 + 2]]
  const n = parseInt(hex.slice(1), 16), cor = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  if (alvo.every((v, k) => Math.abs(v - cor[k]) < 4)) return
  const igual = (i: number) => Math.abs(d[i] - alvo[0]) + Math.abs(d[i + 1] - alvo[1]) + Math.abs(d[i + 2] - alvo[2]) < 60
  const pilha = [[x0, y0]]
  while (pilha.length) {
    const [x, y] = pilha.pop()!
    let xi = x
    while (xi > 0 && igual((y * LARG + xi - 1) * 4)) xi--
    let cima = false, baixo = false
    for (let xx = xi; xx < LARG && igual((y * LARG + xx) * 4); xx++) {
      const i = (y * LARG + xx) * 4
      d[i] = cor[0]; d[i + 1] = cor[1]; d[i + 2] = cor[2]; d[i + 3] = 255
      if (y > 0) { const c = igual(((y - 1) * LARG + xx) * 4); if (c && !cima) pilha.push([xx, y - 1]); cima = c }
      if (y < ALT - 1) { const b = igual(((y + 1) * LARG + xx) * 4); if (b && !baixo) pilha.push([xx, y + 1]); baixo = b }
    }
  }
  g.putImageData(img, 0, 0)
}

export default function Pintar() {
  const router = useRouter()
  const cvs = useRef<HTMLCanvasElement>(null)
  const [cor, setCor] = useState(CORES[2])
  const [fer, setFer] = useState<Ferramenta>("pincel")
  const [tam, setTam] = useState(1)
  const [fundo, setFundo] = useState<keyof typeof FUNDOS>("escuro")
  const [neon, setNeon] = useState(0)
  const [expor, setExpor] = useState(false)
  const [nome, setNome] = useState("")
  const [msg, setMsg] = useState("")
  const [obras, setObras] = useState<Obra[]>([])
  const [podeDesfazer, setPodeDesfazer] = useState(false)
  const hist = useRef<ImageData[]>([])
  const tracos = useRef(0)
  const ult = useRef<{ x: number; y: number } | null>(null)
  const spray = useRef<ReturnType<typeof setInterval> | null>(null)
  const ponta = useRef({ x: 0, y: 0 })
  // a música: a linha que varre, o tempo, a densidade e o eco
  const [tocando, setTocando] = useState(false)
  const [bpm, setBpm] = useState(100)
  const [dens, setDens] = useState(1)
  const [eco, setEco] = useState(true)
  const som = useRef({ ac: null as AudioContext | null, saida: null as GainNode | null, molhado: null as GainNode | null, passo: 0, prox: 0, timer: 0 as unknown as ReturnType<typeof setInterval>, raf: 0, marcas: [] as { t: number; x: number }[], bpm: 100, dens: 1, fundo: "escuro" as keyof typeof FUNDOS })
  const cabeca = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeon(saldoInicial()); setObras(lerObras())
    const g = cvs.current?.getContext("2d", { willReadFrequently: true })
    if (g) { g.fillStyle = FUNDOS.escuro; g.fillRect(0, 0, LARG, ALT) }
  }, [])

  useEffect(() => () => { const m = som.current; clearInterval(m.timer); cancelAnimationFrame(m.raf); void m.ac?.close() }, [])

  const audio = () => {
    const m = som.current
    if (!m.ac) {
      const ac = new AudioContext(), saida = ac.createGain(), molhado = ac.createGain(), rev = criarEco(ac)
      saida.gain.value = 0.8; saida.connect(ac.destination); saida.connect(rev).connect(molhado).connect(ac.destination); molhado.gain.value = 0.35
      m.ac = ac; m.saida = saida; m.molhado = molhado
    }
    if (m.ac.state === "suspended") void m.ac.resume()
    return m
  }
  // agenda os passos um pouco à frente; a linha na tela segue o relógio do áudio
  const agendar = () => {
    const m = som.current, ac = m.ac, g = ctx(); if (!ac || !m.saida || !g) return
    const passos = DENSIDADES[m.dens], dur = (8 * 60) / m.bpm / passos
    const fundoIdx = CORES.indexOf(FUNDOS[m.fundo])
    while (m.prox < ac.currentTime + 0.12) {
      const x = Math.min(LARG - 1, Math.floor(((m.passo % passos) + 0.5) / passos * LARG))
      const notas = notasDaColuna(g.getImageData(x, 0, 1, ALT).data, ALT, fundoIdx)
      const vol = 0.55 / Math.sqrt(Math.max(1, notas.length))
      for (const n of notas) tocar(ac, m.saida, INSTRUMENTOS[n.cor], freqDaAltura(n.y01), m.prox, vol)
      m.marcas.push({ t: m.prox, x: x / LARG }); if (m.marcas.length > 64) m.marcas.shift()
      m.prox += dur; m.passo = (m.passo + 1) % passos
    }
  }
  const andarLinha = () => {
    const m = som.current, ac = m.ac
    if (ac && cabeca.current) { let x = 0; for (const k of m.marcas) if (k.t <= ac.currentTime) x = k.x; cabeca.current.style.left = `${x * 100}%` }
    m.raf = requestAnimationFrame(andarLinha)
  }
  const tocarPausar = () => {
    const m = audio()
    if (tocando) { clearInterval(m.timer); cancelAnimationFrame(m.raf); setTocando(false); return }
    m.passo = 0; m.prox = m.ac!.currentTime + 0.06; m.marcas = []
    m.timer = setInterval(agendar, 25); m.raf = requestAnimationFrame(andarLinha); setTocando(true)
  }
  // a pincelada toca a nota na hora em que encosta
  const previa = (y: number) => {
    if (fer === "borracha" || fer === "balde") return
    const m = audio(); const i = CORES.indexOf(cor)
    if (m.ac && m.saida && i >= 0 && cor !== FUNDOS[fundo]) tocar(m.ac, m.saida, INSTRUMENTOS[i], freqDaAltura(y / ALT), m.ac.currentTime + 0.01, 0.45)
  }

  const ctx = () => cvs.current?.getContext("2d", { willReadFrequently: true }) ?? null
  const guardarPasso = () => {
    const g = ctx(); if (!g) return
    hist.current.push(g.getImageData(0, 0, LARG, ALT))
    if (hist.current.length > 15) hist.current.shift()
    setPodeDesfazer(true)
  }
  const desfazer = () => {
    const g = ctx(), img = hist.current.pop(); if (!g || !img) return
    g.putImageData(img, 0, 0); setPodeDesfazer(hist.current.length > 0)
  }
  const limpar = (f = fundo) => {
    const g = ctx(); if (!g) return
    guardarPasso(); g.fillStyle = FUNDOS[f]; g.fillRect(0, 0, LARG, ALT); tracos.current = 0
  }
  const ponto = (e: React.PointerEvent) => {
    const r = cvs.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * LARG, y: ((e.clientY - r.top) / r.height) * ALT }
  }
  const borrifar = () => {
    const g = ctx(); if (!g) return
    const raio = TAMANHOS[tam] * 1.6
    g.fillStyle = cor
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * raio
      g.fillRect(ponta.current.x + Math.cos(a) * d, ponta.current.y + Math.sin(a) * d, 1.6, 1.6)
    }
  }
  const linha = (de: { x: number; y: number }, ate: { x: number; y: number }) => {
    const g = ctx(); if (!g) return
    g.strokeStyle = fer === "borracha" ? FUNDOS[fundo] : cor
    g.lineWidth = TAMANHOS[tam] * (fer === "borracha" ? 1.6 : 1)
    g.lineCap = "round"; g.lineJoin = "round"
    g.beginPath(); g.moveTo(de.x, de.y); g.lineTo(ate.x, ate.y); g.stroke()
  }

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = ponto(e)
    guardarPasso(); tracos.current++
    previa(p.y)
    if (fer === "balde") { const g = ctx(); if (g) balde(g, Math.floor(p.x), Math.floor(p.y), cor); return }
    if (fer === "spray") { ponta.current = p; borrifar(); spray.current = setInterval(borrifar, 30); return }
    ult.current = p; linha(p, { x: p.x + 0.01, y: p.y })
  }
  const move = (e: React.PointerEvent) => {
    const p = ponto(e)
    if (spray.current) { ponta.current = p; return }
    if (!ult.current) return
    linha(ult.current, p); ult.current = p
  }
  const up = () => {
    ult.current = null
    if (spray.current) { clearInterval(spray.current); spray.current = null }
  }

  const confirmarExpor = async () => {
    const c = cvs.current; if (!c) return
    const peq = document.createElement("canvas"); peq.width = 300; peq.height = 400
    peq.getContext("2d")!.drawImage(c, 0, 0, 300, 400)
    const ok = guardarObra({ id: String(Date.now()), nome: nome.trim() || "sem título", img: peq.toDataURL("image/jpeg", 0.82), quando: Date.now() })
    setExpor(false)
    if (!ok) { setMsg("não coube no aparelho: apaga uma obra antiga"); return }
    setObras(lerObras())
    if (tracos.current >= MIN_TRACOS) { const r = await mudarNeon(PAGA); setNeon(r.neon); setMsg(`exposta na galeria · +${PAGA} Água$`) }
    else setMsg("exposta na galeria")
    tracos.current = 0; setNome("")
    setTimeout(() => setMsg(""), 3500)
  }

  return (
    <div className="pt-raiz">
      <header className="pt-topo">
        <button type="button" onClick={() => router.push("/galeria")}>‹ galeria</button>
        <b>PINTAR</b>
        <span>{neon} <small>Água$</small></span>
      </header>
      <div className="pt-tela-caixa">
        <canvas ref={cvs} className="pt-tela" width={LARG} height={ALT} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        <div ref={cabeca} className="pt-cabeca" hidden={!tocando} />
      </div>
      <div className="pt-musica">
        <button type="button" className={tocando ? "is-on" : ""} onClick={tocarPausar}>{tocando ? "❚❚ pausar" : "▶ tocar"}</button>
        <label>lento<input type="range" min={60} max={160} step={5} value={bpm} onChange={(e) => { const v = Number(e.target.value); setBpm(v); som.current.bpm = v }} />rápido</label>
        <div className="pt-dens">{DENSIDADES.map((_, i) => <button key={i} type="button" aria-label={`densidade ${i + 1}`} className={dens === i ? "is-on" : ""} onClick={() => { setDens(i); som.current.dens = i; som.current.passo = 0 }}>{"•".repeat(i + 1)}</button>)}</div>
        <button type="button" className={eco ? "is-on" : ""} onClick={() => { const v = !eco; setEco(v); const m = som.current; if (m.molhado && m.ac) m.molhado.gain.setTargetAtTime(v ? 0.35 : 0, m.ac.currentTime, 0.05) }}>eco</button>
      </div>
      <div className="pt-barra">
        <div className="pt-ferramentas">
          {(["pincel", "spray", "balde", "borracha"] as Ferramenta[]).map((f) => (
            <button key={f} type="button" className={fer === f ? "is-on" : ""} onClick={() => setFer(f)}>{f}</button>
          ))}
        </div>
        <div className="pt-cores">
          {CORES.map((c) => (
            <button key={c} type="button" aria-label={`cor ${c}`} className={cor === c ? "is-on" : ""} style={{ background: c }} onClick={() => { setCor(c); if (fer === "borracha") setFer("pincel") }} />
          ))}
        </div>
        <div className="pt-linha">
          <div className="pt-tamanhos">
            {TAMANHOS.map((t, i) => (
              <button key={t} type="button" aria-label={`tamanho ${i + 1}`} className={tam === i ? "is-on" : ""} onClick={() => setTam(i)}><i style={{ width: 6 + i * 6, height: 6 + i * 6 }} /></button>
            ))}
          </div>
          <button type="button" disabled={!podeDesfazer} onClick={desfazer}>desfazer</button>
          <button type="button" onClick={() => { const f = fundo === "escuro" ? "claro" : "escuro"; setFundo(f); som.current.fundo = f; limpar(f) }}>tela {fundo === "escuro" ? "clara" : "escura"}</button>
          <button type="button" className="pt-expor" onClick={() => setExpor(true)}>expor</button>
        </div>
        <p className="pt-inst">{CORES.indexOf(cor) >= 0 && cor !== FUNDOS[fundo] ? `esta cor toca: ${INSTRUMENTOS[CORES.indexOf(cor)]}` : "a cor do fundo não toca"}</p>
        {msg && <p className="pt-msg">{msg}</p>}
        {obras.length > 0 && (
          <div className="pt-obras">
            <small>na parede ({obras.length})</small>
            {/* eslint-disable-next-line @next/next/no-img-element -- miniatura em data: URL, sem otimização possível */}
            <div>{obras.map((o) => <img key={o.id} src={o.img} alt={o.nome} title={o.nome} />)}</div>
          </div>
        )}
      </div>
      {expor && (
        <div className="pt-fundo" onClick={() => setExpor(false)}>
          <form className="pt-dialogo" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void confirmarExpor() }}>
            <b>o nome da obra</b>
            <input autoFocus maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="sem título" />
            <div><button type="button" onClick={() => setExpor(false)}>voltar</button><button type="submit" className="pt-expor">expor</button></div>
          </form>
        </div>
      )}
    </div>
  )
}
