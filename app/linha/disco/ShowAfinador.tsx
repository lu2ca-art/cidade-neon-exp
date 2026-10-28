"use client"

// O CANTAR = O AFINADOR (LU2CA 21/10 (5): "o cantar poderia ser como se fosse um
// afinador, que você precisa equilibrar no meio senão a voz desafina (a gente
// coloca esse efeito na voz)"). A melodia da voz (public/gd2: voz.melodia, as
// notas da voz tiradas da faixa) puxa a agulha: cada nota nova a leva pra
// longe do centro, e você corrige (arrastando pra cima e pra baixo, ou ↑ ↓).
// Quanto mais longe do meio, mais a voz da faixa oscila e desafina (um vibrato
// que cresce com o erro, num atraso modulado: muda a afinação sem mudar o
// tempo da música). Embaixo, a linha da melodia que vem por aí. 22 s.
//
// (T19, J2: 12) O COEFICIENTE DE AFINAÇÃO: "o ponteiro de afinação tem que
// estar sob um coeficiente de afinação, tipo não dá pra seguir nota a nota, e
// equilibrar no meio fica afinado". A agulha não aponta mais o erro de cada
// nota: ela mostra um coeficiente só (-1 a 1), que a música vai empurrando
// (cada salto da melodia dá um empurrão pro lado dele, e um balanço lento por
// cima). Você não persegue as notas: equilibra a agulha no meio, segurando ↑ ↓
// (ou arrastando o dedo pra cima e pra baixo, como num nível de bolha). Os
// números moram em AFINADOR. A letra que ele escreveu (a arte) passa embaixo.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { silenciar } from "../som"
import { PISTAS, faixaDaPista } from "../estrada/pistas"
import { desenharHud } from "../../neon-tiles/cena"
import { novoPlacar, type Placar } from "../../neon-tiles/motor"
import { ac, carregarBuffer, montarShow, type Show as SomShow } from "../../neon-tiles/som"
import { ajustarShow, carregarChart, type PropsShow, type ResultadoShow } from "./Show"

const DUR = 22
const VER = 3.2 // segundos de melodia que aparecem na linha de baixo

// o coeficiente de afinação (pra ajustar a dificuldade sem mexer no resto)
export const AFINADOR = {
  margem: 0.2, // |coeficiente| até aqui = afinado (a zona verde do meio)
  empurraoPorSemitom: 0.07, // quanto cada salto da melodia empurra a agulha
  empurraoMax: 0.45, // o maior empurrão de uma nota só
  balanco: 0.22, // o balanço lento por cima (o "vento" da voz)
  amortece: 1.6, // quanto o empurrão perde de força por segundo
  teclas: 1.25, // quanto ↑ ↓ corrigem por segundo (segurando)
  dedo: 1.6, // quanto o dedo corrige (da metade da tela até a borda)
  semitons: 3, // quanto a voz sai do tom com a agulha no fim do arco
}

type NotaVoz = { t: number; midi: number; dur: number; dentro: number }

const ajustar = ajustarShow

export function ShowAfinador({ faixa, lugar, cor, popularidade, onFim, letra }: PropsShow) {
  const [estado, setEstado] = useState<"carregando" | "tocando" | "fim" | "erro">("carregando")
  const [fim, setFim] = useState<ResultadoShow | null>(null)
  const cvs = useRef<HTMLCanvasElement>(null)
  const pista = PISTAS.find((p) => p.id === faixa)!
  const publico = Math.round(2 + (Math.min(100, popularidade) / 100) * 70)
  const jogo = useRef({
    notas: [] as NotaVoz[], placar: novoPlacar() as Placar, galera: null as SomShow | null, buf: null as AudioBuffer | null, inicio: 0,
    lo: 48, hi: 72, ultimoAlvo: 60, afinado: 0, cantando: 0,
    // o coeficiente: a deriva da música (d, v), a sua correção (corr) e a agulha desenhada
    d: 0, v: 0, corr: 0, agulha: 0, ultimaNota: -1, sobe: false, desce: false, dedoY: null as number | null, dedoCorr0: 0, dedoY0: 0,
    parar: null as (() => void) | null, tempo: (() => 0) as () => number, profundidade: null as AudioParam | null,
  })
  const atraso = useMemo(() => 0.03, [])

  useEffect(() => { const j = jogo.current; silenciar(true); return () => { silenciar(false); j.parar?.(); j.galera?.parar() } }, [])

  useEffect(() => {
    let vivo = true
    ac()
    Promise.all([carregarChart(faixa), carregarBuffer(faixaDaPista(pista))]).then(([c, buf]) => {
      if (!vivo || !c.voz) { if (vivo) setEstado("erro"); return }
      const inicio = Math.max(0, Math.min(c.janelas?.voz ?? 28, buf.duration - DUR))
      const notas = c.voz.melodia.filter(([t]) => t >= inicio && t < inicio + DUR).map(([t, midi, dur]) => ({ t, midi, dur: Math.max(0.12, dur), dentro: 0 }))
      const alturas = notas.map((n) => n.midi)
      const lo = Math.min(...alturas, 60) - 3, hi = Math.max(...alturas, 60) + 3
      const v0 = notas[0]?.midi ?? 60
      Object.assign(jogo.current, { notas, placar: novoPlacar(notas.length), buf, inicio, lo, hi, ultimoAlvo: v0 })
      setEstado("tocando")
    }).catch(() => { if (vivo) setEstado("erro") })
    return () => { vivo = false }
  }, [faixa, pista])

  const acabar = useCallback(() => {
    const j = jogo.current, p = j.placar
    // uma nota conta como cantada se ficou afinada em pelo menos 60% dela
    p.acertos = j.notas.filter((n) => n.dentro >= n.dur * 0.6).length
    const r: ResultadoShow = { modo: "cantar", nota: j.cantando ? j.afinado / j.cantando : 0, acertos: p.acertos, total: j.notas.length, publico }
    j.galera?.grito(r.nota > 0.5); j.galera?.galera(r.nota > 0.5 ? 1 : 0.1)
    setTimeout(() => { j.parar?.(); j.galera?.parar() }, 1800)
    setFim(r); setEstado("fim")
  }, [publico])

  useEffect(() => {
    if (estado !== "tocando") return
    const ctx = ac(), j = jogo.current
    if (!ctx || !j.buf) return
    // a voz que desafina: a faixa passa por um atraso curto modulado por um LFO;
    // a profundidade do LFO cresce com o erro (vibrato → desafinado)
    const src = ctx.createBufferSource(); src.buffer = j.buf
    const atr = ctx.createDelay(0.05); atr.delayTime.value = 0.012
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2
    const prof = ctx.createGain(); prof.gain.value = 0
    lfo.connect(prof).connect(atr.delayTime)
    const vol = ctx.createGain(); vol.gain.value = 0.95
    src.connect(atr).connect(vol).connect(ctx.destination)
    const ini = ctx.currentTime + 0.08
    src.start(ini, j.inicio); lfo.start(ini)
    j.profundidade = prof.gain
    j.tempo = () => ctx.currentTime - ini + j.inicio
    j.parar = () => { try { src.stop(); lfo.stop() } catch {} }
    // a plateia (o mesmo som do Guitar Driver, sem tocar a faixa por ele)
    const galera = montarShow(); j.galera = galera; galera?.galera(0.35)
    const c = cvs.current!, g = c.getContext("2d")!
    let raf = 0, ultimo = performance.now()
    const loop = () => {
      const agora = j.tempo() - atraso
      const dt = Math.min(0.05, (performance.now() - ultimo) / 1000)
      ultimo = performance.now()
      const p = j.placar
      // a nota de agora (a voz cantando)
      const iAtual = j.notas.findIndex((n) => agora >= n.t && agora < n.t + n.dur)
      const atual = iAtual >= 0 ? j.notas[iAtual] : null
      // o coeficiente: cada nota nova empurra a agulha pro lado do salto da melodia
      if (atual && iAtual !== j.ultimaNota) {
        const salto = atual.midi - j.ultimoAlvo
        if (j.ultimaNota >= 0 && salto !== 0) j.v += Math.sign(salto) * Math.min(AFINADOR.empurraoMax, Math.abs(salto) * AFINADOR.empurraoPorSemitom) * 2
        j.ultimaNota = iAtual; j.ultimoAlvo = atual.midi
      }
      const tt = agora - j.inicio
      j.v *= Math.exp(-AFINADOR.amortece * dt)
      j.d += (j.v + AFINADOR.balanco * Math.sin(tt * 0.9) * Math.sin(tt * 0.37 + 1.3)) * dt
      j.d = Math.max(-1.6, Math.min(1.6, j.d))
      // a sua correção: segurando ↑ ↓ (o dedo corrige direto, no arrastar)
      if (j.sobe !== j.desce) j.corr += (j.sobe ? 1 : -1) * AFINADOR.teclas * dt
      j.corr = Math.max(-1.8, Math.min(1.8, j.corr))
      const coef = Math.max(-1, Math.min(1, j.d + j.corr))
      j.agulha += (coef - j.agulha) * Math.min(1, dt * 14)
      const erro = j.agulha
      const fora = atual ? Math.abs(erro) : 0
      const afinadoAgora = fora <= AFINADOR.margem
      if (atual) {
        j.cantando += dt
        if (afinadoAgora) { j.afinado += dt; atual.dentro += dt; p.pontos += Math.round(60 * dt * (1 + Math.min(3, p.seq / 20))); p.seq++; p.galera = Math.min(1, p.galera + dt * 0.12) }
        else { p.seq = 0; p.galera = Math.max(0, p.galera - dt * 0.1) }
        galera?.galera(p.galera)
      }
      // o efeito: até 4 ms de vibrato com 2 semitons de erro
      prof.gain.setTargetAtTime(Math.min(1, Math.max(0, fora - AFINADOR.margem * 0.5) / 0.8) * 0.004, ctx.currentTime, 0.05)
      // o desenho
      ajustar(c)
      const w = c.width, h = c.height, dpr = w / Math.max(1, c.clientWidth)
      const grd = g.createLinearGradient(0, 0, 0, h)
      grd.addColorStop(0, "#07050f"); grd.addColorStop(1, "#140a24")
      g.fillStyle = grd; g.fillRect(0, 0, w, h)
      // o afinador: o arco, a zona do meio e a agulha
      const cx = w / 2, cy = h * 0.5, R = Math.min(w * 0.42, h * 0.32)
      g.lineCap = "round"
      g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 14 * dpr
      g.beginPath(); g.arc(cx, cy, R, Math.PI * 1.15, Math.PI * 1.85); g.stroke()
      const meio = AFINADOR.margem * 0.35 * Math.PI
      g.strokeStyle = afinadoAgora && atual ? "#5dffa0" : "rgba(93,255,160,0.45)"; g.lineWidth = 14 * dpr
      g.beginPath(); g.arc(cx, cy, R, Math.PI * 1.5 - meio, Math.PI * 1.5 + meio); g.stroke()
      for (let k = -6; k <= 6; k++) {
        const a = Math.PI * 1.5 + k * (0.35 * Math.PI / 6)
        g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = (k % 3 ? 1 : 2) * dpr
        g.beginPath(); g.moveTo(cx + Math.cos(a) * (R - 16 * dpr), cy + Math.sin(a) * (R - 16 * dpr)); g.lineTo(cx + Math.cos(a) * (R - (k % 3 ? 24 : 32) * dpr), cy + Math.sin(a) * (R - (k % 3 ? 24 : 32) * dpr)); g.stroke()
      }
      const ang = Math.PI * 1.5 + erro * 0.35 * Math.PI
      const corAg = !atual ? "rgba(255,255,255,0.4)" : afinadoAgora ? "#5dffa0" : fora < 0.55 ? "#ffd21a" : "#ff3b3b"
      g.strokeStyle = corAg; g.lineWidth = 5 * dpr; g.shadowColor = corAg; g.shadowBlur = 16 * dpr
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * (R - 6 * dpr), cy + Math.sin(ang) * (R - 6 * dpr)); g.stroke()
      g.shadowBlur = 0
      g.fillStyle = corAg; g.beginPath(); g.arc(cx, cy, 8 * dpr, 0, Math.PI * 2); g.fill()
      g.fillStyle = "rgba(255,255,255,0.75)"; g.font = `${13 * dpr}px ui-monospace, monospace`; g.textAlign = "center"
      g.fillText(!atual ? "respira" : afinadoAgora ? "afinado" : erro > 0 ? "alto demais · desce" : "baixo demais · sobe", cx, cy + 34 * dpr)
      g.fillStyle = "rgba(255,255,255,0.45)"; g.font = `${11 * dpr}px ui-monospace, monospace`
      g.fillText(`afinação ${Math.round((1 - Math.min(1, Math.abs(erro))) * 100)}%`, cx, cy + 54 * dpr)
      // a linha da melodia: o que vem por aí (barras na altura de cada nota) e você
      const y0 = h * 0.64, y1 = h * 0.82, xL = w * 0.18, pxs = (w - xL) / VER
      const yM = (m: number) => y1 - ((m - j.lo) / Math.max(1, j.hi - j.lo)) * (y1 - y0)
      g.strokeStyle = "rgba(255,255,255,0.08)"; g.lineWidth = 1 * dpr
      for (let m = Math.ceil(j.lo); m <= j.hi; m += 2) { g.beginPath(); g.moveTo(0, yM(m)); g.lineTo(w, yM(m)); g.stroke() }
      for (const n of j.notas) {
        const x = xL + (n.t - agora) * pxs, len = n.dur * pxs
        if (x > w || x + len < 0) continue
        g.fillStyle = n.dentro >= n.dur * 0.6 ? "#5dffa0" : cor
        g.globalAlpha = x + len < xL ? 0.35 : 0.9
        g.beginPath(); g.roundRect(x, yM(n.midi) - 4 * dpr, len, 8 * dpr, 4 * dpr); g.fill()
      }
      g.globalAlpha = 1
      g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2 * dpr
      g.beginPath(); g.moveTo(xL, y0 - 8 * dpr); g.lineTo(xL, y1 + 8 * dpr); g.stroke()
      g.fillStyle = corAg; g.beginPath(); g.arc(xL, yM(j.ultimoAlvo + erro * AFINADOR.semitons), 7 * dpr, 0, Math.PI * 2); g.fill()
      // a letra que ele escreveu (a arte): um verso por vez, ao longo dos 22 s
      if (letra?.length) {
        const k = Math.min(letra.length - 1, Math.floor((Math.max(0, tt) / DUR) * letra.length))
        g.fillStyle = "#ffffff"; g.globalAlpha = 0.9; g.font = `600 ${15 * dpr}px system-ui, sans-serif`; g.textAlign = "center"
        g.fillText(letra[k], w / 2, h * 0.865, w * 0.9)
        g.globalAlpha = 1
      }
      desenharHud(g, w, h, { pontos: p.pontos, seq: Math.floor(p.seq / 10), multi: 1 + Math.min(3, Math.floor(p.seq / 200)), galera: p.galera, neon: 0, neonAtivo: false, aviso: null, agora, progresso: Math.min(1, (agora - j.inicio) / DUR), duelo: null })
      if (agora >= j.inicio + DUR) { acabar(); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    // segurar ↑ ↓ corrige aos poucos (é um equilíbrio, não um degrau por nota)
    const tecla = (on: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "arrowup" || k === "w") j.sobe = on
      else if (k === "arrowdown" || k === "s") j.desce = on
      else return
      e.preventDefault(); e.stopPropagation()
    }
    const kd = tecla(true), ku = tecla(false)
    window.addEventListener("keydown", kd, true)
    window.addEventListener("keyup", ku, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
  }, [estado, atraso, cor, acabar, letra])

  // arrastar: como um nível de bolha. O dedo que sobe ou desce a partir de onde
  // encostou corrige o coeficiente (não aponta nota nenhuma)
  const arrastar = (e: React.PointerEvent) => {
    const j = jogo.current
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    if (e.type === "pointerdown") { j.dedoY = e.clientY; j.dedoY0 = e.clientY; j.dedoCorr0 = j.corr; return }
    if (j.dedoY === null) return
    j.dedoY = e.clientY
    j.corr = Math.max(-1.8, Math.min(1.8, j.dedoCorr0 + ((j.dedoY0 - e.clientY) / (r.height / 2)) * AFINADOR.dedo))
  }
  const soltar = () => { jogo.current.dedoY = null }

  return (
    <div className="l-show is-gd" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <canvas ref={cvs} />
      <header className="l-show-topo"><small>o show · {lugar} · cantar</small><b>{pista.faixa}</b><span>equilibra a agulha no meio · ↑ ↓ ou arrasta</span></header>
      {estado === "carregando" && <div className="l-show-carrega">aquecendo a voz…</div>}
      {estado === "erro" && <div className="l-show-fim"><b>a voz dessa faixa ainda não saiu</b><span>escolhe outro instrumento</span><button type="button" onClick={() => onFim({ modo: "cantar", nota: 0, acertos: 0, total: 0, publico })}>seguir →</button></div>}
      {estado === "tocando" && <div className="l-show-toque" onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); arrastar(e) }} onPointerMove={arrastar} onPointerUp={soltar} onPointerCancel={soltar} />}
      {fim && (
        <div className="l-show-fim">
          <b>{fim.nota > 0.75 ? "afinadíssimo" : fim.nota > 0.5 ? "deu bom" : fim.nota > 0.25 ? "quase lá" : "pelo menos você subiu"}</b>
          <span>{Math.round(fim.nota * 100)}% afinado · {fim.acertos} de {fim.total} notas</span>
          <button type="button" onClick={() => onFim(fim)}>o Suburbandas de amanhã →</button>
        </div>
      )}
    </div>
  )
}
