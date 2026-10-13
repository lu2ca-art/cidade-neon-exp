"use client"

// GUITAR DRIVER — o editor de notas (pro LU2CA deixar cada música perfeita).
//
// Ouve a faixa (o resto + o instrumento), mostra a grade da música (tempos e
// compassos), e no dedo: tocar numa trilha põe uma nota (sempre encaixada na
// grade escolhida); tocar numa nota tira. "longa": toca no começo e depois no
// fim. Arrastar pra cima/baixo anda na música. "testar" guarda no aparelho e o
// jogo passa a usar essa versão; "baixar" gera o arquivo pra subir pro jogo.

import { useCallback, useEffect, useRef, useState } from "react"
import { DIFICULDADES, FAIXAS, faixaAberta, type Dificuldade, type Instrumento } from "./dados"
import { COR_LANE, LANES } from "./cena"
import type { ChartGd, NotaGd } from "./motor"
import { ac, carregarBuffer } from "./som"

interface NotaE { t: number; lane: number; dur: number }

function paraEdicao(lista: NotaGd[]): NotaE[] {
  const out: NotaE[] = []
  for (const [t, lane, dur, l2] of lista) {
    out.push({ t, lane, dur })
    if (l2 !== undefined) out.push({ t, lane: l2, dur })
  }
  return out.sort((a, b) => a.t - b.t || a.lane - b.lane)
}

function paraArquivo(notas: NotaE[]): NotaGd[] {
  const out: NotaGd[] = []
  const porT = new Map<number, NotaE[]>()
  for (const n of notas) { const k = Math.round(n.t * 1000); porT.set(k, [...(porT.get(k) ?? []), n]) }
  for (const k of [...porT.keys()].sort((a, b) => a - b)) {
    const g = porT.get(k)!.sort((a, b) => a.lane - b.lane)
    // o formato guarda até 2 trilhas por acorde
    out.push(g.length > 1 ? [g[0].t, g[0].lane, g[0].dur, g[1].lane] : [g[0].t, g[0].lane, g[0].dur])
  }
  return out
}

export function Editor({ gdAudio, onVoltar }: { gdAudio: string; onVoltar: () => void }) {
  const faixas = FAIXAS.filter((f) => faixaAberta(f))
  const [faixaId, setFaixaId] = useState(faixas[0]?.id ?? "chuva")
  const [inst, setInst] = useState<Instrumento>("guitarra")
  const [dif, setDif] = useState<Dificuldade>("medio")
  const [chart, setChart] = useState<ChartGd | null>(null)
  const [notas, setNotas] = useState<NotaE[]>([])
  const [bufs, setBufs] = useState<[AudioBuffer, AudioBuffer] | null>(null)
  const [tocando, setTocando] = useState(false)
  const [vel, setVel] = useState(1)
  const [grade, setGrade] = useState(4) // divisões por tempo
  const [zoom, setZoom] = useState(220) // px por segundo
  const [longa, setLonga] = useState<NotaE | null | "esperando">(null)
  const [msg, setMsg] = useState("")
  const [mudou, setMudou] = useState(false)
  const cvs = useRef<HTMLCanvasElement>(null)
  const pos = useRef(0) // segundos
  const play = useRef<{ srcs: AudioBufferSourceNode[]; inicio: number; de: number } | null>(null)
  const arrasto = useRef<{ y: number; pos: number; moveu: boolean } | null>(null)

  // carrega notas + áudio da faixa
  useEffect(() => {
    let vivo = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChart(null); setBufs(null); setMsg("carregando…")
    const local = (() => { try { return localStorage.getItem(`gd-chart-${faixaId}`) } catch { return null } })()
    const pc = local ? Promise.resolve(JSON.parse(local) as ChartGd) : fetch(`/gd/${faixaId}.json`).then((r) => r.json() as Promise<ChartGd>)
    Promise.all([pc, carregarBuffer(`${gdAudio}/${faixaId}/sem-${inst}.mp3`), carregarBuffer(`${gdAudio}/${faixaId}/${inst}.mp3`)])
      .then(([c, a, b]) => { if (!vivo) return; setChart(c); setBufs([a, b]); setMsg(local ? "versão editada (guardada neste aparelho)" : "") })
      .catch(() => vivo && setMsg("não deu pra carregar essa faixa"))
    return () => { vivo = false }
  }, [faixaId, inst, gdAudio])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (chart) { setNotas(paraEdicao(chart[inst][dif] ?? [])); setMudou(false) }
  }, [chart, inst, dif])

  const parar = useCallback(() => {
    const p = play.current
    if (!p) return
    const c = ac()!
    pos.current = p.de + (c.currentTime - p.inicio) * vel
    p.srcs.forEach((s) => { try { s.stop() } catch {} })
    play.current = null
    setTocando(false)
  }, [vel])

  const tocar = useCallback(() => {
    const c = ac()
    if (!c || !bufs) return
    const inicio = c.currentTime + 0.05
    const srcs = bufs.map((b) => {
      const s = c.createBufferSource()
      s.buffer = b
      s.playbackRate.value = vel
      s.connect(c.destination)
      s.start(inicio, Math.max(0, pos.current))
      return s
    })
    play.current = { srcs, inicio, de: pos.current }
    setTocando(true)
  }, [bufs, vel])

  useEffect(() => () => { play.current?.srcs.forEach((s) => { try { s.stop() } catch {} }) }, [])

  // desenho
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const c = cvs.current
      if (c && chart) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr)
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
        const g = c.getContext("2d")!
        const a = ac()
        if (play.current && a) pos.current = play.current.de + (a.currentTime - play.current.inicio) * vel
        const agora = pos.current
        const pps = zoom * dpr
        const yAgora = H * 0.78
        const yDe = (t: number) => yAgora - (t - agora) * pps
        const lw = W / LANES
        g.fillStyle = "#0b0a12"
        g.fillRect(0, 0, W, H)
        for (let l = 0; l < LANES; l++) { g.fillStyle = l % 2 ? "#100e19" : "#0d0c15"; g.fillRect(l * lw, 0, lw, H) }
        // grade
        const beat = 60 / chart.bpm
        const passo = beat / grade
        const t0 = agora - (H - yAgora) / pps, t1 = agora + yAgora / pps
        for (let k = Math.floor((t0 - chart.t0) / passo); chart.t0 + k * passo < t1; k++) {
          const t = chart.t0 + k * passo
          const y = yDe(t)
          const noTempo = k % grade === 0
          const compasso = noTempo && (k / grade) % 4 === 0
          g.fillStyle = compasso ? "rgba(255,255,255,0.5)" : noTempo ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.07)"
          g.fillRect(0, y, W, compasso ? 2 * dpr : 1)
          if (compasso) { g.fillStyle = "rgba(255,255,255,0.4)"; g.font = `${10 * dpr}px ui-monospace, monospace`; g.fillText(String(k / grade / 4 + 1), 4, y - 3) }
        }
        // notas
        for (const n of notas) {
          if (n.t + n.dur < t0 - 1 || n.t > t1 + 1) continue
          const x = (n.lane + 0.5) * lw, y = yDe(n.t)
          if (n.dur > 0) { g.fillStyle = COR_LANE[n.lane]; g.globalAlpha = 0.6; g.fillRect(x - lw * 0.1, yDe(n.t + n.dur), lw * 0.2, n.dur * pps); g.globalAlpha = 1 }
          g.fillStyle = COR_LANE[n.lane]
          g.beginPath(); g.ellipse(x, y, lw * 0.3, lw * 0.14, 0, 0, Math.PI * 2); g.fill()
          g.fillStyle = "#fff"; g.beginPath(); g.ellipse(x, y, lw * 0.11, lw * 0.05, 0, 0, Math.PI * 2); g.fill()
        }
        if (longa && longa !== "esperando") { g.strokeStyle = "#fff"; g.lineWidth = 2 * dpr; g.strokeRect((longa.lane + 0.1) * lw, yDe(longa.t) - 10 * dpr, lw * 0.8, 20 * dpr) }
        // cabeça de leitura
        g.fillStyle = "#ff3fb0"
        g.fillRect(0, yAgora - 1.5 * dpr, W, 3 * dpr)
        g.fillStyle = "#fff"
        g.font = `${11 * dpr}px ui-monospace, monospace`
        g.fillText(`${Math.floor(agora / 60)}:${(agora % 60).toFixed(2).padStart(5, "0")}`, 6, yAgora - 6 * dpr)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [chart, notas, zoom, grade, vel, longa])

  // toque: arrastar anda na música; tocar sem arrastar põe/tira nota
  const down = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); arrasto.current = { y: e.clientY, pos: pos.current, moveu: false } }
  const move = (e: React.PointerEvent) => {
    const a = arrasto.current
    if (!a) return
    const dy = e.clientY - a.y
    if (Math.abs(dy) > 6) a.moveu = true
    if (a.moveu && !tocando) pos.current = Math.max(0, a.pos + dy / zoom)
  }
  const up = (e: React.PointerEvent) => {
    const a = arrasto.current
    arrasto.current = null
    if (!a || a.moveu || !chart) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor(((e.clientX - r.left) / r.width) * LANES)))
    const tBruto = pos.current + (r.height * 0.78 - (e.clientY - r.top)) / zoom
    const passo = 60 / chart.bpm / grade
    const t = Math.round((chart.t0 + Math.round((tBruto - chart.t0) / passo) * passo) * 10000) / 10000
    if (longa === "esperando") {
      const n = notas.find((x) => x.lane === lane && Math.abs(x.t - t) < passo / 2)
      if (n) { setLonga(n); setMsg("agora toque onde a nota longa termina (na mesma trilha)") }
      return
    }
    if (longa) {
      if (lane === longa.lane && t > longa.t) {
        setNotas((ns) => ns.map((x) => (x === longa ? { ...x, dur: Math.round((t - x.t) * 10000) / 10000 } : x)))
        setMudou(true)
      }
      setLonga(null); setMsg("")
      return
    }
    const existe = notas.find((x) => x.lane === lane && Math.abs(x.t - t) < passo / 2)
    setNotas((ns) => (existe ? ns.filter((x) => x !== existe) : [...ns, { t, lane, dur: 0 }].sort((a2, b) => a2.t - b.t || a2.lane - b.lane)))
    setMudou(true)
  }

  const montar = (): ChartGd | null => (chart ? { ...chart, [inst]: { ...chart[inst], [dif]: paraArquivo(notas) } } : null)
  const testar = () => { const c = montar(); if (!c) return; try { localStorage.setItem(`gd-chart-${faixaId}`, JSON.stringify(c)); setChart(c); setMudou(false); setMsg("guardado neste aparelho: o jogo já usa essa versão") } catch { setMsg("não deu pra guardar") } }
  const original = () => { try { localStorage.removeItem(`gd-chart-${faixaId}`) } catch {} fetch(`/gd/${faixaId}.json`).then((r) => r.json()).then((c) => { setChart(c); setMsg("voltou pra versão do jogo") }) }
  const baixar = () => {
    const c = montar(); if (!c) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(c)], { type: "application/json" }))
    const a = document.createElement("a"); a.href = url; a.download = `${faixaId}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <section className="gd-menu gd-editor">
      <header className="gd-topo"><button type="button" onClick={() => { parar(); onVoltar() }}>‹ voltar</button><b>EDITOR</b><span>{notas.length} notas{mudou ? " •" : ""}</span></header>
      <div className="gd-ed-barra">
        <select value={faixaId} onChange={(e) => { parar(); pos.current = 0; setFaixaId(e.target.value) }}>{faixas.map((f) => <option key={f.id} value={f.id}>{f.titulo}</option>)}</select>
        <select value={inst} onChange={(e) => { parar(); setInst(e.target.value as Instrumento) }}><option value="guitarra">guitarra</option><option value="baixo">baixo</option></select>
        <select value={dif} onChange={(e) => setDif(e.target.value as Dificuldade)}>{DIFICULDADES.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
      </div>
      <canvas ref={cvs} className="gd-ed-cvs" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => (arrasto.current = null)} />
      <div className="gd-ed-barra">
        <button type="button" onClick={() => { parar(); pos.current = Math.max(0, pos.current - 2) }}>−2s</button>
        <button type="button" className="gd-btn" disabled={!bufs} onClick={() => (tocando ? parar() : tocar())}>{tocando ? "pausar" : "tocar"}</button>
        <button type="button" onClick={() => { parar(); pos.current += 2 }}>+2s</button>
        <select value={vel} onChange={(e) => { parar(); setVel(Number(e.target.value)) }}><option value={1}>100%</option><option value={0.75}>75%</option><option value={0.5}>50%</option></select>
      </div>
      <div className="gd-ed-barra">
        <select value={grade} onChange={(e) => setGrade(Number(e.target.value))}><option value={1}>grade: tempo</option><option value={2}>grade: 1/2</option><option value={4}>grade: 1/4</option><option value={8}>grade: 1/8</option><option value={3}>grade: tercina</option></select>
        <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}><option value={120}>zoom −</option><option value={220}>zoom</option><option value={380}>zoom +</option></select>
        <button type="button" className={longa ? "is-on" : ""} onClick={() => { setLonga(longa ? null : "esperando"); setMsg(longa ? "" : "toque na nota que vai virar longa") }}>longa</button>
      </div>
      <div className="gd-ed-barra">
        <button type="button" className="gd-btn" onClick={testar}>testar no jogo</button>
        <button type="button" onClick={baixar}>baixar</button>
        <button type="button" onClick={original}>original</button>
      </div>
      {msg && <p className="gd-msg">{msg}</p>}
    </section>
  )
}
