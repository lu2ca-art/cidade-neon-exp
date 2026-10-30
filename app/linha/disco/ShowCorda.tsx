"use client"

// O BAIXO = A CORDA VIRTUAL (LU2CA 21/10 (5): "o do baixo a gente cria uma corda
// virtual que precisa descer e subir pra atingir faixas de notas coloridas").
// As notas do baixo (public/gd2, o mesmo chart do Guitar Driver) correm da
// direita pra esquerda como faixas coloridas na altura delas (4 alturas: as 4
// cores); a corda atravessa a tela e você sobe e desce com ela (arrastando, ou
// D F J K / ↑ ↓). A faixa passa pela linha com a corda dentro: acertou; nota
// longa, segura dentro dela. 22 s, no palco da missão, como os outros.
//
// (T19, J2: 34) "no baixo tem que ser por toque contínuo na tela no celular e
// usando as setas cima e baixo no desktop. e tem que ser sensível pra dar o
// time de tocar o baixo":
//   - celular: o dedo fica na tela o tempo todo; a corda está onde o dedo está
//     (sem atraso). Tirou o dedo, a corda abafa: as notas passam sem som.
//   - computador: ↑ ↓ (ou W S). Um toque sobe/desce uma faixa; segurando, a
//     corda vai deslizando faixa por faixa.
//   - o tempo: a nota conta quando a corda está na faixa dela NO TEMPO. Se a
//     corda chega antes, a nota soa na hora certa; se chega depois, só vale
//     dentro da folga (JAN), e o jogo diz "no tempo", "quase" ou "atrasou".

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { silenciar } from "../som"
import { COR_LANE, desenharHud, desenharPalco } from "../../neon-tiles/cena"
import { multiplicador, novoPlacar, type NotaGd, type Placar } from "../../neon-tiles/motor"
import { ac, atrasoEstimado, carregarBuffer, montarShow, type Show as SomShow } from "../../neon-tiles/som"
import { MODELOS, PALCOS, type Palco } from "../../neon-tiles/dados"
import { imagemInstrumento } from "../../neon-tiles/instrumentos"
import { ajustarShow, carregarChart, musicaDoShow, type PropsShow, type ResultadoShow } from "./Show"

const DUR = 22
const JAN = 0.13 // a folga de cada lado da linha (s)
const VER = 2.2 // quantos segundos de faixa cabem na tela, da linha pra direita
// (T19) a sensibilidade do baixo
export const BAIXO = {
  resposta: 38, // quão rápido a corda chega aonde você manda (maior = mais seca)
  deslizar: 0.11, // segurando ↑ ↓: segundos pra passar de uma faixa pra outra
  primeiroPasso: 0.2, // segurando: quanto espera antes de começar a deslizar
  noTempo: 0.05, // chegou até aqui depois da nota: ainda é "no tempo"
}

type NotaCorda = { t: number; lane: number; dur: number; ok: boolean; errou: boolean; segurou: number }

const ajustar = ajustarShow

export function ShowCorda({ faixa, lugar, palco: palcoId, cor, popularidade, onFim }: PropsShow) {
  const [estado, setEstado] = useState<"carregando" | "tocando" | "fim" | "erro">("carregando")
  const [fim, setFim] = useState<ResultadoShow | null>(null)
  const cvs = useRef<HTMLCanvasElement>(null)
  const pista = musicaDoShow(faixa)
  const publico = Math.round(2 + (Math.min(100, popularidade) / 100) * 70)
  const jogo = useRef({ notas: [] as NotaCorda[], placar: novoPlacar() as Placar, som: null as SomShow | null, buf: null as AudioBuffer | null, inicio: 0, bpm: 100, t0: 0, alvo: 1.5, corda: 1.5, vib: 0, aviso: null as { texto: string; ate: number; cor: string } | null,
    // (T19) o dedo na tela (toque contínuo), o teclado, o segurar ↑ ↓ e quando a corda chegou na faixa de agora
    dedo: false, teclado: false, segura: 0 as -1 | 0 | 1, seguraDesde: 0, laneSegura: 0, laneAntes: -1, chegou: -99, toque: null as { texto: string; ate: number; cor: string } | null })
  const palco = useMemo<Palco>(() => PALCOS.find((x) => x.id === palcoId) ?? { ...(PALCOS.find((x) => x.id === "casa-shows") ?? PALCOS[0]), nome: lugar.replace(/^(no|na) /, ""), cor, fachada: pista.faixa.toUpperCase() }, [palcoId, lugar, cor, pista.faixa])
  const modelo = MODELOS.find((m) => m.tipo === "baixo") ?? MODELOS[0]
  const imgs = useMemo(() => (typeof window === "undefined" ? {} : { baixo: imagemInstrumento(modelo.id, modelo.visual, "baixo", "liso") }), [modelo])
  const atraso = useMemo(() => atrasoEstimado(), [])

  useEffect(() => { const j = jogo.current; silenciar(true); return () => { silenciar(false); j.som?.parar() } }, [])

  useEffect(() => {
    let vivo = true
    ac()
    Promise.all([carregarChart(faixa), carregarBuffer(pista.src)]).then(([c, buf]) => {
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
      // segurando ↑ ↓: a corda desliza faixa por faixa
      const tAgora = performance.now() / 1000
      if (j.segura && tAgora - j.seguraDesde >= BAIXO.primeiroPasso) {
        const passos = Math.floor((tAgora - j.seguraDesde - BAIXO.primeiroPasso) / BAIXO.deslizar) + 1
        j.alvo = Math.max(0, Math.min(3, j.segura > 0 ? j.laneSegura + passos : j.laneSegura - passos))
      }
      // a corda vai seca aonde você manda (sensível: quase sem peso)
      j.corda += (j.alvo - j.corda) * Math.min(1, dt * BAIXO.resposta)
      const laneCorda = Math.max(0, Math.min(3, Math.round(j.corda)))
      // tocando: o dedo na tela (toque contínuo) ou o teclado
      const ativa = j.dedo || j.teclado
      // quando a corda chegou na faixa de agora (pra medir o tempo)
      if (laneCorda !== j.laneAntes) { j.laneAntes = laneCorda; j.chegou = agora }
      // as notas: contam com a corda na faixa delas no tempo
      for (const n of j.notas) {
        if (n.ok || n.errou) {
          if (n.ok && n.dur > 0 && agora < n.t + n.dur && agora > n.t) { if (ativa && laneCorda === n.lane) { n.segurou += dt; p.pontos += Math.round(30 * dt * multiplicador(p)) } }
          continue
        }
        // chegou antes: soa no tempo da nota; chegou depois: só vale dentro da folga
        const naHora = ativa && laneCorda === n.lane && agora >= n.t - 0.012 && j.chegou - n.t <= JAN && agora <= n.t + JAN
        if (naHora) {
          const atraso = Math.max(0, j.chegou - n.t)
          n.ok = true; p.acertos++; p.seq++; p.maxSeq = Math.max(p.maxSeq, p.seq)
          const perfeito = atraso <= BAIXO.noTempo
          if (perfeito) p.perfeitos++
          p.pontos += (perfeito ? 50 : 30) * multiplicador(p)
          p.galera = Math.min(1, p.galera + (perfeito ? 0.03 : 0.015))
          j.vib = 1
          j.toque = perfeito ? { texto: "no tempo", ate: agora + 0.45, cor: "#5dffa0" } : { texto: atraso < JAN * 0.7 ? "quase" : "atrasou", ate: agora + 0.45, cor: "#ffd21a" }
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
      // (a corda solta, sem dedo nem teclado: apagada, abafada)
      g.globalAlpha = ativa ? 1 : 0.35
      g.strokeStyle = COR_LANE[laneCorda]; g.lineWidth = 4 * dpr; g.shadowColor = COR_LANE[laneCorda]; g.shadowBlur = ativa ? 18 * dpr : 0
      g.beginPath()
      for (let x = 0; x <= w; x += 6 * dpr) {
        const a = j.vib * h * 0.012 * Math.sin(x / (w / 9) * Math.PI + agora * 60) * Math.sin((x / w) * Math.PI)
        if (x === 0) g.moveTo(x, yC + a); else g.lineTo(x, yC + a)
      }
      g.stroke(); g.shadowBlur = 0; g.globalAlpha = 1
      // o tempo do último toque, perto da linha
      if (j.toque && j.toque.ate > agora) {
        g.fillStyle = j.toque.cor; g.font = `700 ${14 * dpr}px ui-monospace, monospace`; g.textAlign = "center"
        g.fillText(j.toque.texto, xLinha, h * 0.22)
      }
      if (!ativa) {
        g.fillStyle = "rgba(255,255,255,0.8)"; g.font = `${13 * dpr}px ui-monospace, monospace`; g.textAlign = "center"
        g.fillText("segura o dedo na tela · ou ↑ ↓", w / 2, h * 0.94)
      }
      desenharHud(g, w, h, { pontos: p.pontos, seq: p.seq, multi: multiplicador(p), galera: p.galera, neon: p.neon, neonAtivo: false, aviso: j.aviso, agora, progresso: Math.min(1, (agora - j.inicio) / DUR), duelo: null })
      if (agora >= j.inicio + DUR) { acabar(); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    // ↑ ↓ (ou W S): um toque = uma faixa; segurando, desliza
    const dir = (k: string) => (k === "arrowup" || k === "w" ? 1 : k === "arrowdown" || k === "s" ? -1 : 0)
    const kd = (e: KeyboardEvent) => {
      const d = dir(e.key.toLowerCase())
      if (!d) return
      e.preventDefault(); e.stopPropagation()
      if (e.repeat) return
      j.teclado = true
      j.alvo = Math.max(0, Math.min(3, Math.round(j.alvo) + d))
      j.segura = d as 1 | -1; j.seguraDesde = performance.now() / 1000; j.laneSegura = j.alvo
    }
    const ku = (e: KeyboardEvent) => { const d = dir(e.key.toLowerCase()); if (d && j.segura === d) j.segura = 0 }
    window.addEventListener("keydown", kd, true)
    window.addEventListener("keyup", ku, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
  }, [estado, palco, modelo, imgs, publico, atraso, acabar])

  // o toque contínuo: com o dedo na tela, a altura do dedo é a altura da corda
  // (entre as 4 faixas); tirou o dedo, a corda abafa
  const arrastar = (e: React.PointerEvent) => {
    const j = jogo.current
    if (e.type === "pointerdown") j.dedo = true
    if (!j.dedo) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const fr = (e.clientY - r.top) / r.height
    j.alvo = Math.max(0, Math.min(3, (0.78 - fr) / 0.15))
  }
  const soltar = () => { jogo.current.dedo = false }

  return (
    <div className="l-show is-gd" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <canvas ref={cvs} />
      <header className="l-show-topo"><small>o show · {lugar} · baixo</small><b>{pista.faixa}</b><span>{publico <= 3 ? "quase ninguém" : `${publico} pessoas`}</span></header>
      {estado === "carregando" && <div className="l-show-carrega">afinando o baixo…</div>}
      {estado === "erro" && <div className="l-show-fim"><b>o baixo não chegou</b><span>confere a internet</span><button type="button" onClick={() => onFim({ modo: "tocar", nota: 0, acertos: 0, total: 0, publico })}>seguir →</button></div>}
      {estado === "tocando" && <div className="l-show-toque" onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); arrastar(e) }} onPointerMove={arrastar} onPointerUp={soltar} onPointerCancel={soltar} onContextMenu={(e) => e.preventDefault()} />}
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
