"use client"

// O SHOW NO FIM DE CADA MISSÃO É O GUITAR DRIVER (LU2CA 21/10 (4): "o show pós
// missão tá com uma engine nova de guitar hero ruim. por que não mantém o
// guitar driver, utilizando só o local da missão como palco"). As peças são as
// do próprio Guitar Driver (app/neon-tiles: o braço, o palco, o HUD, o som, o
// motor das notas); muda só o palco (o lugar da missão) e a duração:
//   - 22 s ("é sempre 22 segundos, em qualquer modalidade"), na janela da faixa
//     onde a guitarra mais toca (public/gd2/<faixa>.json, o charter das stems:
//     scripts/gd2/charter.py), com a faixa inteira do jogo tocando dali
//   - a plateia é a popularidade de agora ("não é sobre o lugar, é sobre as pessoas")
// O cantar (o afinador), o baixo (a corda), o teclado e a bateria entram como
// modos próprios depois (BACKLOG A5b); por enquanto, a guitarra.
// Os 4 botões: toque nas colunas, ou D F J K.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { fazerMusica } from "../som"
import { PISTAS, faixaDaPista, type PistaId } from "../estrada/pistas"
import { COR_LANE, LANES, andarParticulas, desenharBraco, desenharHud, desenharPalco, desenharTomada, geometriaBraco, soltarFaiscas, type Nota, type Particula } from "../../neon-tiles/cena"
import { JANELA, PERFEITO, VISIVEL, multiplicador, notasDoChart, novoPlacar, type ChartGd, type Placar } from "../../neon-tiles/motor"
import { ac, atrasoEstimado, carregarBuffer, montarShow, type Show as SomShow } from "../../neon-tiles/som"
import { MODELOS, PALCOS, type Palco } from "../../neon-tiles/dados"
import { imagemInstrumento } from "../../neon-tiles/instrumentos"
import { cumpriu, notaDosJurados, xenomDaFaixa, type FaixaXenom } from "./xenom"

export type ResultadoShow = { modo: "tocar" | "cantar"; nota: number; acertos: number; total: number; publico: number
  // (T21) pro objetivo dos shows xenom: a maior sequência e a galera no fim (0–1)
  maxSeq?: number; galera?: number }

// (T21) a música do show: uma faixa das pistas ou uma das 4 do Subúrbio Xenom
// (disco/xenom.ts). O mesmo objeto sempre (os efeitos dependem dele)
export type FaixaShow = PistaId | FaixaXenom
const MUSICAS = new Map<string, { faixa: string; src: string }>()
export function musicaDoShow(faixa: FaixaShow): { faixa: string; src: string } {
  let m = MUSICAS.get(faixa)
  if (!m) {
    const x = xenomDaFaixa(faixa)
    const p = PISTAS.find((q) => q.id === faixa)
    m = x ? { faixa: x.faixa, src: x.src } : p ? { faixa: p.faixa, src: faixaDaPista(p) } : { faixa, src: "" }
    MUSICAS.set(faixa, m)
  }
  return m
}

const DUR = 22 // s ("é sempre 22 segundos, em qualquer modalidade")
const INICIO_ANTIGO = 28 // sem o chart novo: o trecho do chart antigo (public/gd)
const DIF = "medio" as const
const TECLAS = ["d", "f", "j", "k"]

// (T19, J2: 24 "o show tá lento") o show é 2D: cada quadro redesenha o palco, a
// galera, o braço e os brilhos (shadowBlur) na tela inteira. Em 2x numa tela de
// notebook (1864×999) o canvas passava de 7 milhões de pixels. Teto de pixels:
// acima dele a densidade cai (nunca abaixo de 1x). ?showpx=N troca o teto (medir).
export const SHOW_MAX_PX = 2_600_000
let tetoPx = 0
export function ajustarShow(c: HTMLCanvasElement) {
  if (!tetoPx) tetoPx = Number(new URLSearchParams(location.search).get("showpx")) || SHOW_MAX_PX
  const cw = Math.max(1, c.clientWidth), ch = Math.max(1, c.clientHeight)
  let dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (cw * ch * dpr * dpr > tetoPx) dpr = Math.max(1, Math.sqrt(tetoPx / (cw * ch)))
  const w = Math.round(cw * dpr), h = Math.round(ch * dpr)
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
}
const ajustar = ajustarShow

type Estado = "carregando" | "contagem" | "tocando" | "fim" | "erro"
interface Jogo {
  notas: Nota[]; placar: Placar; som: SomShow | null; ini: number; bpm: number; t0: number; inicio: number
  apertadas: boolean[]; flashes: { lane: number; ate: number; tipo: "ok" | "erro"; perfeito?: boolean }[]
  particulas: Particula[]; tremor: number; aviso: { texto: string; ate: number; cor: string } | null
  frases: Map<number, { total: number; acertos: number; falhou: boolean }>; buf: AudioBuffer | null
}

export type InstrumentoShow = "voz" | "guitarra" | "baixo" | "teclado" | "bateria"
export interface PropsShow { faixa: FaixaShow; lugar: string; palco?: string; cor: string; popularidade: number; onFim: (r: ResultadoShow) => void
  // (T19) a letra que ele escreveu (a arte do LU2CA): aparece no cantar
  letra?: string[]
  // (§12) terminou e quer de novo: volta pra escolha, sem contar este
  onDeNovo?: () => void }
// o chart novo (public/gd2): cada instrumento com os 4 níveis (a voz: a melodia) e a janela de 22 s de cada um
export type ChartGd2 = ChartGd & { janelas?: Partial<Record<InstrumentoShow, number>>; voz?: { melodia: [number, number, number][] } } & Partial<Record<InstrumentoShow, unknown>>
export const carregarChart = (faixa: FaixaShow) => fetch(`/gd2/${faixa}.json`).then((r) => (r.ok ? (r.json() as Promise<ChartGd2>) : Promise.reject()))
export const NOME_INST: Record<InstrumentoShow, string> = { voz: "só ver", guitarra: "guitarra", baixo: "baixo", teclado: "teclado", bateria: "bateria" }

// a pista do Guitar Driver (guitarra; o teclado e a bateria usam a mesma pista
// com as notas deles até ganharem o jogo próprio)
export function ShowPista({ faixa, lugar, palco: palcoId, cor, popularidade, onFim, onDeNovo, inst = "guitarra" }: PropsShow & { inst?: "guitarra" | "teclado" | "bateria" }) {
  const [estado, setEstado] = useState<Estado>("carregando")
  const [fim, setFim] = useState<ResultadoShow | null>(null)
  const cvs = useRef<HTMLCanvasElement>(null)
  const toques = useRef(new Map<number, number>())
  const jogo = useRef<Jogo>({ notas: [], placar: novoPlacar(), som: null, ini: 0, bpm: 100, t0: 0, inicio: 0, apertadas: [false, false, false, false], flashes: [], particulas: [], tremor: 0, aviso: null, frases: new Map(), buf: null })
  const pista = musicaDoShow(faixa)
  // (T21) o multiverso do show xenom: a regra que muda o jogo
  const xenom = xenomDaFaixa(faixa)
  const regra = xenom?.regra.t ?? null
  // a plateia: quantas pessoas (a popularidade de agora)
  const publico = Math.round(2 + (Math.min(100, popularidade) / 100) * 70)
  // o palco: o lugar da missão (os palcos do Guitar Driver têm os ids dos lugares do jogo);
  // lugar sem palco desenhado usa a casa de shows com o nome e a cor da missão
  const palco = useMemo<Palco>(() => {
    const p = PALCOS.find((x) => x.id === palcoId)
    // (T21) no multiverso, a fachada é a da faixa xenom
    if (p) return xenom ? { ...p, nome: xenom.multiverso, cor, fachada: pista.faixa.toUpperCase() } : p
    const base = PALCOS.find((x) => x.id === "casa-shows") ?? PALCOS[0]
    return { ...base, nome: lugar.replace(/^(no|na) /, ""), cor, fachada: pista.faixa.toUpperCase(), capacidade: Math.max(base.capacidade, publico) }
  }, [palcoId, lugar, cor, pista.faixa, publico, xenom])
  const modelo = MODELOS[0]
  const imgs = useMemo(() => (typeof window === "undefined" ? {} : { guitarra: imagemInstrumento(modelo.id, modelo.visual, "guitarra", "liso") }), [modelo])
  const atraso = useMemo(() => atrasoEstimado(), [])

  // a música do lugar fica quieta durante o show
  useEffect(() => { const j = jogo.current; fazerMusica(true); return () => { fazerMusica(false); j.som?.parar() } }, [])

  // carrega o chart (o novo; sem ele, o antigo) e a faixa do jogo
  useEffect(() => {
    let vivo = true
    ac()
    const chart = carregarChart(faixa).then((c) => ({ c: { ...c, guitarra: (c[inst] ?? c.guitarra) as ChartGd["guitarra"] } as ChartGd, ini: c.janelas?.[inst] ?? INICIO_ANTIGO }))
      .catch(() => fetch(`/gd/${faixa}.json`).then((r) => r.json()).then((c: ChartGd) => ({ c, ini: INICIO_ANTIGO })))
    Promise.all([chart, carregarBuffer(pista.src)]).then(([{ c, ini }, buf]) => {
      if (!vivo) return
      const inicio = Math.max(0, Math.min(ini, buf.duration - DUR))
      const notas = notasDoChart(c, "guitarra", DIF).filter((n) => n.t >= inicio + 0.3 && n.t < inicio + DUR - 0.2)
      notas.forEach((n, i) => { n.id = i })
      const frases = new Map<number, { total: number; acertos: number; falhou: boolean }>()
      for (const n of notas) if (n.frase !== undefined) { const fr = frases.get(n.frase) ?? { total: 0, acertos: 0, falhou: false }; fr.total++; frases.set(n.frase, fr) }
      Object.assign(jogo.current, { notas, placar: novoPlacar(notas.length), bpm: c.bpm, t0: c.t0, inicio, buf, frases })
      setEstado("contagem")
    }).catch(() => { if (vivo) setEstado("erro") })
    return () => { vivo = false }
  }, [faixa, pista, inst])

  // a contagem (4 tempos, as baquetas) e o show
  useEffect(() => {
    if (estado !== "contagem") return
    const c = cvs.current!, g = c.getContext("2d")!
    const j = jogo.current
    const som = montarShow()
    j.som = som
    som?.galera(0.35)
    const beat = 60 / j.bpm
    const t0 = performance.now()
    let raf = 0, contou = 0
    const loop = () => {
      const tt = (performance.now() - t0) / 1000
      const n = Math.min(4, Math.floor(tt / beat) + 1)
      if (n > contou) { contou = n; som?.baqueta() }
      ajustar(c)
      desenharTomada(g, c.width, c.height, "contagem", tt, { palco, modelo, contagem: n, imgs, publico })
      if (tt >= beat * 4) { setEstado("tocando"); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [estado, palco, modelo, imgs, publico])

  const acabar = useCallback(() => {
    const j = jogo.current, p = j.placar
    const r: ResultadoShow = { modo: "tocar", nota: p.total ? p.acertos / p.total : 0, acertos: p.acertos, total: p.total, publico, maxSeq: p.maxSeq, galera: p.galera }
    j.som?.grito(r.nota > 0.5)
    j.som?.galera(r.nota > 0.5 ? 1 : 0.1)
    setTimeout(() => j.som?.parar(), 1800)
    setFim(r)
    setEstado("fim")
  }, [publico])

  // tocar uma coluna (as regras do Guitar Driver: janela do médio, perfeito, sequência, frase neon)
  const tocar = useCallback((lane: number, on: boolean) => {
    const j = jogo.current
    j.apertadas[lane] = on
    if (estado !== "tocando" || !j.som) return
    const agora = j.som.tempo() - atraso
    const p = j.placar
    if (!on) {
      // eslint-disable-next-line react-hooks/immutability
      for (const n of j.notas) if (n.lane === lane && n.segurando) { n.segurando = false; if (agora < n.t + n.dur - 0.1) n.soltou = true }
      return
    }
    let alvo: Nota | null = null, melhor = Infinity
    for (let i = j.ini; i < j.notas.length; i++) {
      const n = j.notas[i]
      if (n.t > agora + JANELA[DIF]) break
      if (n.lane !== lane || n.acertou || n.errou) continue
      const d = Math.abs(n.t - agora)
      if (d < JANELA[DIF] && d < melhor) { melhor = d; alvo = n }
    }
    const c = cvs.current
    if (alvo) {
      alvo.acertou = true
      if (alvo.dur > 0) alvo.segurando = true
      const perfeito = melhor <= PERFEITO
      p.seq++; p.maxSeq = Math.max(p.maxSeq, p.seq); p.acertos++
      if (perfeito) p.perfeitos++
      p.pontos += (perfeito ? 50 : 40) * multiplicador(p)
      p.galera = Math.min(1, p.galera + 0.025)
      j.flashes.push({ lane, ate: agora + 0.35, tipo: "ok", perfeito })
      if (c) soltarFaiscas(j.particulas, c.width, c.height, lane, COR_LANE[lane], (perfeito ? 12 : 6) * (regra === "explosao" ? 3 : 1), regra === "espelho")
      // (T21) o multiverso que explode: cada acerto perfeito sacode a tela
      if (regra === "explosao" && perfeito) j.tremor = Math.max(j.tremor, 0.45)
      j.som.acertou(); j.som.galera(p.galera)
      if (alvo.frase !== undefined) {
        const fr = j.frases.get(alvo.frase)
        if (fr) { fr.acertos++; if (fr.acertos === fr.total && !fr.falhou) { p.neon = Math.min(1, p.neon + 0.25); j.aviso = { texto: "FRASE NEON!", ate: agora + 1.2, cor: "#8fe3ff" } } }
      }
      try { navigator.vibrate?.(perfeito ? 10 : 6) } catch {}
    } else {
      p.seq = 0
      p.galera = Math.max(0, p.galera - 0.02)
      j.flashes.push({ lane, ate: agora + 0.25, tipo: "erro" })
      j.som.errou(); j.som.galera(p.galera)
      j.tremor = regra === "explosao" ? 1.6 : 0.6
    }
  }, [estado, atraso, regra])

  // o show: 22 s
  useEffect(() => {
    if (estado !== "tocando") return
    const c = cvs.current!, g = c.getContext("2d")!
    const j = jogo.current
    if (!j.buf || !j.som) return
    j.som.tocar(j.buf, j.inicio)
    let raf = 0, ultimo = performance.now()
    const loop = () => {
      const agora = j.som!.tempo() - atraso
      const dt = Math.min(0.05, (performance.now() - ultimo) / 1000)
      ultimo = performance.now()
      const p = j.placar
      while (j.ini < j.notas.length && j.notas[j.ini].t + j.notas[j.ini].dur < agora - 1.5) j.ini++
      for (let i = j.ini; i < j.notas.length; i++) {
        const n = j.notas[i]
        if (n.t > agora + 0.2) break
        if (!n.acertou && !n.errou && n.t < agora - JANELA[DIF]) {
          n.errou = true; p.seq = 0; p.erros++; p.galera = Math.max(0, p.galera - 0.035)
          if (n.frase !== undefined) { const fr = j.frases.get(n.frase); if (fr) fr.falhou = true }
          j.som!.errou(); j.som!.galera(p.galera); j.tremor = 1
        }
        if (n.segurando) { if (agora >= n.t + n.dur) n.segurando = false; else p.pontos += Math.round(25 * dt * 4 * multiplicador(p)) }
      }
      j.tremor = Math.max(0, j.tremor - dt * 4)
      j.flashes = j.flashes.filter((f) => f.ate > agora)
      andarParticulas(j.particulas, dt)
      const fb = ((agora - j.t0) / (60 / j.bpm)) % 1
      const batida = Math.pow(1 - (fb < 0 ? fb + 1 : fb), 3)
      ajustar(c)
      const w = c.width, h = c.height
      desenharPalco(g, w, h, { palco, energia: p.galera, neon: false, batida, t: agora, instrumento: "guitarra", modelo, imgs, vaia: p.galera < 0.15, publico, show: true })
      // (T21) o multiverso cinza: o palco perde a cor; a galera acesa devolve (o braço segue colorido)
      if (regra === "cinza") {
        g.globalCompositeOperation = "saturation"
        g.fillStyle = `hsla(0,0%,50%,${Math.max(0, Math.min(1, 1.15 - p.galera * 1.4)).toFixed(3)})`
        g.fillRect(0, 0, w, h)
        g.globalCompositeOperation = "source-over"
      }
      g.fillStyle = "rgba(4,3,12,0.42)"
      g.fillRect(0, 0, w, h)
      desenharBraco(g, w, h, { notas: j.notas, agora, janela: VISIVEL[DIF], apertadas: j.apertadas, neon: false, modelo, flashes: j.flashes, multi: multiplicador(p), bpm: j.bpm, t0: j.t0, particulas: j.particulas, invertido: regra === "espelho", apagao: regra === "jurados", tremor: j.tremor })
      desenharHud(g, w, h, { pontos: p.pontos, seq: p.seq, multi: multiplicador(p), galera: p.galera, neon: p.neon, neonAtivo: false, aviso: j.aviso, agora, progresso: Math.min(1, (agora - j.inicio) / DUR), duelo: null })
      if (agora >= j.inicio + DUR) { acabar(); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const kd = (e: KeyboardEvent) => { const i = TECLAS.indexOf(e.key.toLowerCase()); if (i >= 0 && !e.repeat) { tocar(i, true); e.preventDefault(); e.stopPropagation() } }
    const ku = (e: KeyboardEvent) => { const i = TECLAS.indexOf(e.key.toLowerCase()); if (i >= 0) tocar(i, false) }
    window.addEventListener("keydown", kd, true)
    window.addEventListener("keyup", ku, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", kd, true); window.removeEventListener("keyup", ku, true) }
  }, [estado, palco, modelo, imgs, publico, atraso, tocar, acabar, regra])

  // o toque na pista: a coluna inteira (vários dedos ao mesmo tempo)
  const posDoToque = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const gb = geometriaBraco(r.width, r.height)
    const x = e.clientX - r.left - (gb.cx - gb.baseW / 2)
    const col = Math.max(0, Math.min(LANES - 1, Math.floor((x / gb.baseW) * LANES)))
    // (T21) no braço espelhado, o dedo vai onde a nota está (o teclado fica do avesso)
    return regra === "espelho" ? LANES - 1 - col : col
  }

  return (
    <div className="l-show is-gd" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <canvas ref={cvs} />
      <header className="l-show-topo"><small>{xenom ? xenom.multiverso : `o show · ${lugar}`}</small><b>{pista.faixa}</b><span>{xenom ? `missão: ${xenom.objetivo.texto}` : publico <= 3 ? "quase ninguém" : `${publico} pessoas`}</span></header>
      {estado === "carregando" && <div className="l-show-carrega">{inst === "bateria" ? "ajustando as baquetas…" : inst === "teclado" ? "ligando o teclado…" : "afinando a guitarra…"}</div>}
      {estado === "erro" && (
        <div className="l-show-fim"><b>a guitarra não chegou</b><span>confere a internet</span><button type="button" onClick={() => onFim({ modo: "tocar", nota: 0, acertos: 0, total: 0, publico })}>seguir →</button></div>
      )}
      {estado === "tocando" && (
        <div
          className="l-show-toque"
          onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const pos = posDoToque(e); toques.current.set(e.pointerId, pos); tocar(pos, true) }}
          onPointerUp={(e) => { const pos = toques.current.get(e.pointerId); if (pos !== undefined) { tocar(pos, false); toques.current.delete(e.pointerId) } }}
          onPointerCancel={(e) => { const pos = toques.current.get(e.pointerId); if (pos !== undefined) { tocar(pos, false); toques.current.delete(e.pointerId) } }}
          onContextMenu={(e) => e.preventDefault()}
        />
      )}
      {fim && (
        <div className="l-show-fim">
          <b>{fim.nota > 0.8 ? "a casa veio abaixo" : fim.nota > 0.5 ? "deu bom" : fim.nota > 0.2 ? "foi" : "pelo menos você subiu"}</b>
          <span>{fim.acertos} de {fim.total} notas</span>
          {regra === "jurados" && <span className="l-xenom-jurados">os jurados: {[0, 0.5, -0.5].map((d) => notaDosJurados(Math.max(0, Math.min(1, fim.nota + d / 10))).toLocaleString("pt-BR")).join(" · ")}</span>}
          {xenom && <span className={`l-xenom-objetivo${cumpriu(xenom, { nota: fim.nota, maxSeq: fim.maxSeq ?? 0, galera: fim.galera ?? 0 }) ? " is-ok" : ""}`} data-cumpriu={cumpriu(xenom, { nota: fim.nota, maxSeq: fim.maxSeq ?? 0, galera: fim.galera ?? 0 }) ? "1" : "0"}>{cumpriu(xenom, { nota: fim.nota, maxSeq: fim.maxSeq ?? 0, galera: fim.galera ?? 0 }) ? "missão cumprida" : "a missão não foi dessa vez"}: {xenom.objetivo.texto}</span>}
          <button type="button" onClick={() => onFim(fim)}>{xenom ? "voltar pro nosso mundo →" : "o Suburbandas de amanhã →"}</button>
          {onDeNovo && <button type="button" className="l-show-denovo" onClick={onDeNovo}>de novo</button>}
        </div>
      )}
    </div>
  )
}
