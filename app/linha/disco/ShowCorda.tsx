"use client"

// O BAIXO = A CORDA VIRTUAL (LU2CA 21/10 (5): "o do baixo a gente cria uma corda
// virtual que precisa descer e subir pra atingir faixas de notas coloridas").
// As notas do baixo (public/gd2, o mesmo chart do Guitar Driver) correm da
// direita pra esquerda como faixas coloridas na altura delas (4 alturas: as 4
// cores); a corda atravessa a tela e você sobe e desce com ela (arrastando, ou
// D F J K / ↑ ↓). A faixa passa pela linha com a corda dentro: acertou; nota
// longa, segura dentro dela. 22 s, no palco da missão, como os outros.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { silenciar } from "../som"
import { PISTAS, faixaDaPista } from "../estrada/pistas"
import { COR_LANE, desenharHud, desenharPalco } from "../../neon-tiles/cena"
import { multiplicador, novoPlacar, type NotaGd, type Placar } from "../../neon-tiles/motor"
import { ac, atrasoEstimado, carregarBuffer, montarShow, type Show as SomShow } from "../../neon-tiles/som"
import { MODELOS, PALCOS, type Palco } from "../../neon-tiles/dados"
import { imagemInstrumento } from "../../neon-tiles/instrumentos"
import { carregarChart, type PropsShow, type ResultadoShow } from "./Show"

const DUR = 22
const JAN = 0.13 // a folga de cada lado da linha (s)
const VER = 2.2 // quantos segundos de faixa cabem na tela, da linha pra direita
const TECLAS = ["d", "f", "j", "k"]

type NotaCorda = { t: number; lane: number; dur: number; ok: boolean; errou: boolean; segurou: number }

function ajustar(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr)
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
}

export function ShowCorda({ faixa, lugar, palco: palcoId, cor, popularidade, onFim }: PropsShow) {
  const [estado, setEstado] = useState<"carregando" | "tocando" | "fim" | "erro">("carregando")
  const [fim, setFim] = useState<ResultadoShow | null>(null)
  const cvs = useRef<HTMLCanvasElement>(null)
  const pista = PISTAS.find((p) => p.id === faixa)!
  const publico = Math.round(2 + (Math.min(100, popularidade) / 100) * 70)
  const jogo = useRef({ notas: [] as NotaCorda[], placar: novoPlacar() as Placar, som: null as SomShow | null, buf: null as AudioBuffer | null, inicio: 0, bpm: 100, t0: 0, alvo: 1.5, corda: 1.5, vib: 0, aviso: null as { texto: string; ate: number; cor: string } | null })
  const palco = useMemo<Palco>(() => PALCOS.find((x) => x.id === palcoId) ?? { ...(PALCOS.find((x) => x.id === "casa-shows") ?? PALCOS[0]), nome: lugar.replace(/^(no|na) /, ""), cor }, [palcoId, lugar, cor])
  const modelo = MODELOS.find((m) => m.tipo === "baixo") ?? MODELOS[0]
  const imgs = useMemo(() => (typeof window === "undefined" ? {} : { baixo: imagemInstrumento(modelo.id, modelo.visual, "baixo", "liso") }), [modelo])
  const atraso = useMemo(() => atrasoEstimado(), [])

  useEffect(() => { const j = jogo.current; silenciar(true); return () => { silenciar(false); j.som?.parar() } }, [])

  useEffect(() => {
    let vivo = true
    ac()
    Promise.all([carregarChart(faixa), carregarBuffer(faixaDaPista(pista))]).then(([c, buf]) => {
      if (!vivo) return
      const inicio = Math.max(0, Math.min(c.janelas?.baixo ?? 28, buf.duration - DUR))
      const lista = ((c.baixo as Record<string, NotaGd[]> | undefined)?.medio ?? []) as NotaGd[]
      const notas = lista.filter(([t]) => t >= inicio + 0.4 && t < inicio + DUR - 0.2).map(([t, lane, dur]) => ({ t, lane: Math.min(3, lane), dur, ok: false, errou: false, segurou: 0 }))
      Object.assign(jogo.current, { notas, placar: novoPlacar(notas.length), buf, inicio, bpm: c.bpm, t0: c.t0 })
      setEstado("tocando")
    }).catch(() => { if (vivo) setEstado("erro") })
    return () => { vivo = false }
  }, [faixa, pista])

  const acabar = useCallback(() => {
    const j = jogo.current, p = j.placar
    const r: ResultadoShow = { modo: "tocar", nota: p.total ? p.acertos / p.total : 0, acertos: p.acertos, total: p.total, publico }
    j.som?.grito(r.nota > 0.5); j.som?.galera(r.nota > 0.5 ? 1 : 0.1)
    setTimeout(() => j.som?.parar(), 1800)
    setFim(r); setEstado("fim")
  }, [publico])

  useEffect(() => {
    if (estado !== "tocando") return
    const c = cvs.current!, g = c.getContext("2d")!
    const j = jogo.current
    const som = montarShow()
    j.som = som
    if (!som || !j.buf) return
    som.galera(0.35)
    som.tocar(j.buf, j.inicio)
    let raf = 0, ultimo = performance.now()
    // a altura de cada uma das 4 faixas (lane 0 embaixo, 3 em cima)
    const yLane = (h: number, l: number) => h * (0.78 - l * 0.15)
    const loop = () => {
      const agora = som.tempo() - atraso
      const dt = Math.min(0.05, (performance.now() - ultimo) / 1000)
      ultimo = performance.now()
      const p = j.placar
      ajustar(c)
      const w = c.width, h = c.height, dpr = w / Math.max(1, c.clientWidth)
      // a corda vai atrás do dedo com um pouco de peso (é uma corda grossa)
      j.corda += (j.alvo - j.corda) * Math.min(1, dt * 16)
      const laneCorda = Math.max(0, Math.min(3, Math.round(j.corda)))
      // as notas: acertou se passa pela linha com a corda na faixa dela
      for (const n of j.notas) {
        if (n.ok || n.errou) {
          if (n.ok && n.dur > 0 && agora < n.t + n.dur && agora > n.t) { if (laneCorda === n.lane) { n.segurou += dt; p.pontos += Math.round(30 * dt * multiplicador(p)) } }
          continue
        }
        if (Math.abs(agora - n.t) <= JAN && laneCorda === n.lane) {
          n.ok = true; p.acertos++; p.seq++; p.maxSeq = Math.max(p.maxSeq, p.seq)
          const perfeito = Math.abs(agora - n.t) < 0.05
          if (perfeito) p.perfeitos++
          p.pontos += (perfeito ? 50 : 40) * multiplicador(p)
          p.galera = Math.min(1, p.galera + 0.025)
          j.vib = 1
          som.acertou(); som.galera(p.galera)
          try { navigator.vibrate?.(8) } catch {}
        } else if (agora > n.t + JAN) {
          n.errou = true; p.seq = 0; p.erros++; p.galera = Math.max(0, p.galera - 0.035)
          som.errou(); som.galera(p.galera)
        }
      }
      j.vib = Math.max(0, j.vib - dt * 3)
      // o palco atrás
      const fb = ((agora - j.t0) / (60 / j.bpm)) % 1
      desenharPalco(g, w, h, { palco, energia: p.galera, neon: false, batida: Math.pow(1 - (fb < 0 ? fb + 1 : fb), 3), t: agora, instrumento: "baixo", modelo, imgs, vaia: p.galera < 0.15, publico, show: true })
      g.fillStyle = "rgba(4,3,12,0.55)"; g.fillRect(0, 0, w, h)
      const xLinha = w * 0.2, pxs = (w - xLinha) / VER
      // as 4 faixas de fundo (os trilhos das cores)
      for (let l = 0; l < 4; l++) {
        g.strokeStyle = COR_LANE[l]; g.globalAlpha = l === laneCorda ? 0.35 : 0.12; g.lineWidth = h * 0.11
        g.beginPath(); g.moveTo(0, yLane(h, l)); g.lineTo(w, yLane(h, l)); g.stroke()
      }
      g.globalAlpha = 1
      // as notas: faixas coloridas na altura delas, correndo pra esquerda
      for (const n of j.notas) {
        const x0 = xLinha + (n.t - agora) * pxs
        const len = Math.max(0.34, n.dur) * pxs
        if (x0 > w || x0 + len < 0) continue
        const y = yLane(h, n.lane), alt = Math.min(h * 0.04, len * 0.6)
        g.fillStyle = n.errou ? "#3a3946" : COR_LANE[n.lane]
        g.globalAlpha = n.ok ? 0.35 : 1
        g.shadowColor = COR_LANE[n.lane]; g.shadowBlur = n.ok || n.errou ? 0 : 14 * dpr
        g.beginPath(); g.roundRect(x0, y - alt / 2, len, alt, alt / 2); g.fill()
        g.shadowBlur = 0
      }
      g.globalAlpha = 1
      // a linha de toque
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2 * dpr
      g.beginPath(); g.moveTo(xLinha, h * 0.25); g.lineTo(xLinha, h * 0.88); g.stroke()
      // a corda: atravessa a tela e vibra quando pega uma nota
      const yC = yLane(h, j.corda)
      g.strokeStyle = COR_LANE[laneCorda]; g.lineWidth = 4 * dpr; g.shadowColor = COR_LANE[laneCorda]; g.shadowBlur = 18 * dpr
      g.beginPath()
      for (let x = 0; x <= w; x += 6 * dpr) {
        const a = j.vib * h * 0.012 * Math.sin(x / (w / 9) * Math.PI + agora * 60) * Math.sin((x / w) * Math.PI)
        if (x === 0) g.moveTo(x, yC + a); else g.lineTo(x, yC + a)
      }
      g.stroke(); g.shadowBlur = 0
      desenharHud(g, w, h, { pontos: p.pontos, seq: p.seq, multi: multiplicador(p), galera: p.galera, neon: p.neon, neonAtivo: false, aviso: j.aviso, agora, progresso: Math.min(1, (agora - j.inicio) / DUR), duelo: null })
      if (agora >= j.inicio + DUR) { acabar(); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const kd = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase(), i = TECLAS.indexOf(k)
      if (i >= 0) j.alvo = i
      else if (k === "arrowup") j.alvo = Math.min(3, Math.round(j.alvo) + 1)
      else if (k === "arrowdown") j.alvo = Math.max(0, Math.round(j.alvo) - 1)
      else return
      e.preventDefault(); e.stopPropagation()
    }
    window.addEventListener("keydown", kd, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd, true) }
  }, [estado, palco, modelo, imgs, publico, atraso, acabar])

  // arrastar: a altura do dedo vira a altura da corda (entre as 4 faixas)
  const arrastar = (e: React.PointerEvent) => {
    if (e.type === "pointermove" && e.buttons === 0 && e.pointerType === "mouse") return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const fr = (e.clientY - r.top) / r.height
    jogo.current.alvo = Math.max(0, Math.min(3, (0.78 - fr) / 0.15))
  }

  return (
    <div className="l-show is-gd" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <canvas ref={cvs} />
      <header className="l-show-topo"><small>o show · {lugar} · baixo</small><b>{pista.faixa}</b><span>{publico <= 3 ? "quase ninguém" : `${publico} pessoas`}</span></header>
      {estado === "carregando" && <div className="l-show-carrega">afinando o baixo…</div>}
      {estado === "erro" && <div className="l-show-fim"><b>o baixo não chegou</b><span>confere a internet</span><button type="button" onClick={() => onFim({ modo: "tocar", nota: 0, acertos: 0, total: 0, publico })}>seguir →</button></div>}
      {estado === "tocando" && <div className="l-show-toque" onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); arrastar(e) }} onPointerMove={arrastar} />}
      {fim && (
        <div className="l-show-fim">
          <b>{fim.nota > 0.8 ? "o grave segurou a casa" : fim.nota > 0.5 ? "deu bom" : fim.nota > 0.2 ? "foi" : "pelo menos você subiu"}</b>
          <span>{fim.acertos} de {fim.total} notas</span>
          <button type="button" onClick={() => onFim(fim)}>o Suburbandas de amanhã →</button>
        </div>
      )}
    </div>
  )
}
