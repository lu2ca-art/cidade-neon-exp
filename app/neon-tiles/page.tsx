"use client"

// GUITAR DRIVER — glow-up no espírito do Guitar Hero 1: carreira de palcos
// (garagem → arena), guitarra ou baixo (o baixo lê o grave real da faixa),
// loja com a grana dos shows, cutscene de entrada e de saída, show
// simulado atrás do braço, multiplicador, modo NEON (star power), medidor
// da galera e cachê no fim. Nas faixas com stems (gd), as notas foram
// desenhadas da guitarra/baixo reais, presas na grade de cada faixa
// (public/gd/<id>.json), e a sua parte toca separada: errou, ela some. Nas
// outras, as notas ainda vêm da análise da mix (lib/audio-analysis).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { sendCarRadioMute, sendMinimizeConsole } from "@/app/providers/AudioBridge"
import { analyzeAudioForTiles } from "@/lib/audio-analysis"
import { track } from "@/lib/analytics"
import "./gd.css"
import {
  ACABAMENTOS, FAIXAS, MODELOS, PALCOS, SAVE_VAZIO, carregar, estrelasPor, faixaAberta, gravar, totalEstrelas,
  type Faixa, type Instrumento, type Modelo, type Palco, type Save,
} from "./dados"
import { COR_LANE, LANES, desenharBraco, desenharPalco, desenharTomada, type Nota, type Tomada } from "./cena"
import { ac, carregarBuffer, montarShow, soGrave, type Show } from "./som"

type Fase = "menu" | "loja" | "carregando" | "entrada" | "tocando" | "saida" | "resultado"

const JANELA_ACERTO = { facil: 0.17, medio: 0.13, dificil: 0.1 }
const VISIVEL = { facil: 2.2, medio: 1.8, dificil: 1.45 }
const TECLAS = ["d", "f", "j", "k"]

// o áudio em camadas das faixas com stems: <base>/<faixa>/{sem-guitarra,guitarra,sem-baixo,baixo}.mp3
const GD_AUDIO = process.env.NEXT_PUBLIC_GD_AUDIO ?? "https://evlqbbqswxhxemwk.public.blob.vercel-storage.com/gd/v1"

// [tempo, trilha, duração, trilha do acorde?] — gerado das stems (scratchpad gd_notas.py)
type NotaGd = [number, number, number, number?]
interface ChartGd { bpm: number; t0: number; dur: number; guitarra: Record<Save["dificuldade"], NotaGd[]>; baixo: Record<Save["dificuldade"], NotaGd[]> }

function notasDoChart(c: ChartGd, inst: Instrumento, dif: Save["dificuldade"]): Nota[] {
  const out: Nota[] = []
  c[inst][dif].forEach(([t, lane, dur, l2], i) => {
    // frases de NEON: um grupo de notas a cada ~5 (como antes, por frase)
    const estrela = Math.floor(i / 6) % 5 === 2
    for (const l of l2 === undefined ? [lane] : [lane, l2]) {
      out.push({ id: out.length, lane: l, t, dur, estrela, acertou: false, errou: false, segurando: false, soltou: false })
    }
  })
  return out
}

interface Placar {
  pontos: number
  seq: number
  maxSeq: number
  acertos: number
  total: number
  galera: number
  neon: number
  neonAtivo: number // segundos restantes
}

interface Resultado {
  pct: number
  estrelas: number
  pontos: number
  maxSeq: number
  grana: number
  recorde: boolean
  novoPalco: Palco | null
}

function vib(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

export default function GuitarDriver() {
  const router = useRouter()
  const { updateCinematicStep, completeConfirmation, state } = useGameFunnel()
  const [save, setSave] = useState<Save>(SAVE_VAZIO)
  const [fase, setFase] = useState<Fase>("menu")
  const [palcoId, setPalcoId] = useState("garagem")
  const [faixa, setFaixa] = useState<Faixa>(FAIXAS[0])
  const [res, setRes] = useState<Resultado | null>(null)
  const [erroCarga, setErroCarga] = useState("")
  const cvs = useRef<HTMLCanvasElement>(null)
  const jogo = useRef<{ notas: Nota[]; placar: Placar; show: Show | null; dur: number; apertadas: boolean[]; flashes: { lane: number; ate: number; tipo: "ok" | "erro" }[]; buf: AudioBuffer | null; parte: AudioBuffer | null }>({
    notas: [], placar: novoPlacar(), show: null, dur: 22, apertadas: [false, false, false, false], flashes: [], buf: null, parte: null,
  })
  const hud = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSave(carregar())
    sendCarRadioMute(true)
    return () => { sendCarRadioMute(false); jogo.current.show?.parar() }
  }, [])

  // dev: o teste automático lê o estado do show
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __gd: typeof jogo }).__gd = jogo
  }, [])

  const salvar = useCallback((f: (s: Save) => Save) => setSave((s) => { const n = f(s); gravar(n); return n }), [])

  const palco = PALCOS.find((p) => p.id === palcoId)!
  const estrelasTot = totalEstrelas(save)
  const modelo = MODELOS.find((m) => m.id === save.modelo[save.instrumento])!

  /* ── começar um show ── */
  const comecar = async (f: Faixa) => {
    ac()
    setFaixa(f)
    setErroCarga("")
    setFase("carregando")
    track("mission_started", { mission_id: `guitar-${f.id}`, place_id: "neon-tiles" })
    try {
      if (f.gd) {
        const inst = save.instrumento
        const base = `${GD_AUDIO}/${f.id}`
        const [chart, buf, parte] = await Promise.all([
          fetch(`/gd/${f.id}.json`).then((r) => r.json() as Promise<ChartGd>),
          carregarBuffer(`${base}/sem-${inst}.mp3`),
          carregarBuffer(`${base}/${inst}.mp3`),
        ])
        const notas = notasDoChart(chart, inst, save.dificuldade)
        jogo.current = { ...jogo.current, notas, placar: novoPlacar(notas.length), dur: buf.duration, buf, parte, flashes: [] }
        setFase("entrada")
        return
      }
      const buf = await carregarBuffer(f.audio)
      const fonte = save.instrumento === "baixo" ? await soGrave(buf) : buf
      const analisadas = analyzeAudioForTiles(fonte, f.bpm, buf.duration * 1000)
      let notas: Nota[] = analisadas.map((t, i) => ({
        id: i, lane: t.col % LANES, t: t.beatTime / 1000, dur: t.hold ? t.holdDuration / 1000 : 0,
        estrela: Math.floor(i / 6) % 5 === 2, acertou: false, errou: false, segurando: false, soltou: false,
      }))
      if (save.dificuldade === "facil") notas = notas.filter((_, i) => i % 2 === 0).map((n) => ({ ...n, dur: 0 }))
      if (save.instrumento === "baixo") notas = notas.filter((_, i) => i % 4 !== 3) // baixo respira mais
      jogo.current = { ...jogo.current, notas, placar: novoPlacar(notas.length), dur: buf.duration, buf, parte: null, flashes: [] }
      setFase("entrada")
    } catch {
      setErroCarga("não deu pra carregar a faixa. tenta de novo.")
      setFase("menu")
    }
  }

  /* ── cutscene de entrada → contagem → show ── */
  useEffect(() => {
    if (fase !== "entrada") return
    const c = cvs.current!
    const g = c.getContext("2d")!
    const show = montarShow()
    jogo.current.show = show
    show?.galera(0.35)
    let raf = 0
    const t0 = performance.now()
    const beat = 60 / faixa.bpm
    const TOMADAS: { t: Tomada; dur: number }[] = [
      { t: "fachada", dur: 2.4 },
      { t: "backstage", dur: 2.0 },
      { t: "contagem", dur: beat * 4 + 0.2 },
    ]
    let contou = 0
    const loop = () => {
      const tt = (performance.now() - t0) / 1000
      let acc = 0
      let atual = TOMADAS[TOMADAS.length - 1]
      let tl = 0
      for (const tm of TOMADAS) {
        if (tt < acc + tm.dur) { atual = tm; tl = tt - acc; break }
        acc += tm.dur
      }
      const total = TOMADAS.reduce((s, x) => s + x.dur, 0)
      let n = 0
      if (atual.t === "contagem") {
        n = Math.min(4, Math.floor(tl / beat) + 1)
        if (n > contou) { contou = n; show?.baqueta(); vib(10) }
      }
      ajustar(c)
      desenharTomada(g, c.width, c.height, atual.t, tl, { palco, modelo, contagem: n })
      if (tt >= total) {
        cancelAnimationFrame(raf)
        setFase("tocando")
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [fase, faixa, palco, modelo])

  /* ── o show ── */
  const acabar = useCallback(() => {
    const j = jogo.current
    const p = j.placar
    const pct = p.total ? p.acertos / p.total : 0
    const est = estrelasPor(pct * 0.85 + p.galera * 0.15)
    const bonus = modelo.bonus?.includes("+20%") ? 1.2 : modelo.bonus?.includes("+10%") ? 1.1 : 1
    const grana = Math.round((palco.cache * (0.15 + est * 0.17) * bonus) / 10) * 10
    const chave = `${palco.id}:${faixa.id}:${save.instrumento}`
    const recorde = p.pontos > (save.recordes[chave] ?? 0)
    const antes = totalEstrelas(save)
    const novo = { ...save, estrelas: { ...save.estrelas, [chave]: Math.max(save.estrelas[chave] ?? 0, est) } }
    const depois = totalEstrelas(novo)
    const novoPalco = PALCOS.find((pl) => pl.estrelas > antes && pl.estrelas <= depois) ?? null
    const concluidas = est >= 1 && !save.concluidas.includes(faixa.id) ? [...save.concluidas, faixa.id] : save.concluidas
    salvar(() => ({
      ...novo,
      grana: save.grana + grana,
      recordes: recorde ? { ...save.recordes, [chave]: p.pontos } : save.recordes,
      concluidas,
    }))
    // funil antigo: 4 faixas terminadas fecham a confirmação 3
    if (concluidas.length >= 4 && !state.confirmations.c3.done) {
      updateCinematicStep("neon-tiles-complete")
      completeConfirmation(3, { accuracy: Math.round(pct * 100), maxCombo: p.maxSeq })
    }
    track("mission_completed", { mission_id: `guitar-${faixa.id}`, duration_ms: Math.round(j.dur * 1000) })
    setRes({ pct, estrelas: est, pontos: p.pontos, maxSeq: p.maxSeq, grana, recorde, novoPalco })
    setFase("saida")
  }, [modelo, palco, faixa, save, salvar, state.confirmations.c3.done, completeConfirmation, updateCinematicStep])

  const tocar = useCallback((lane: number, on: boolean) => {
    const j = jogo.current
    j.apertadas[lane] = on
    if (fase !== "tocando" || !j.show) return
    const agora = j.show.tempo()
    const p = j.placar
    if (!on) {
      // estado do jogo vive num ref mutável de propósito (60fps, sem render)
      // eslint-disable-next-line react-hooks/immutability
      for (const n of j.notas) if (n.lane === lane && n.segurando) { n.segurando = false; if (agora < n.t + n.dur - 0.08) n.soltou = true }
      return
    }
    const jan = JANELA_ACERTO[save.dificuldade]
    let alvo: Nota | null = null
    let melhor = Infinity
    for (const n of j.notas) {
      if (n.lane !== lane || n.acertou || n.errou) continue
      const d = Math.abs(n.t - agora)
      if (d < jan && d < melhor) { melhor = d; alvo = n }
      if (n.t > agora + jan) break
    }
    if (alvo) {
      alvo.acertou = true
      if (alvo.dur > 0) alvo.segurando = true
      p.seq++
      p.maxSeq = Math.max(p.maxSeq, p.seq)
      p.acertos++
      const multi = Math.min(4, 1 + Math.floor(p.seq / 10)) * (p.neonAtivo > 0 ? 2 : 1)
      p.pontos += 50 * multi
      p.galera = Math.min(1, p.galera + 0.025)
      if (alvo.estrela) p.neon = Math.min(1, p.neon + 0.13)
      j.flashes.push({ lane, ate: agora + 0.25, tipo: "ok" })
      j.show.acertou()
      j.show.galera(p.galera)
      vib(8)
    } else {
      // palhetada no vazio
      p.seq = 0
      p.galera = Math.max(0, p.galera - 0.03)
      j.flashes.push({ lane, ate: agora + 0.2, tipo: "erro" })
      j.show.errou()
      j.show.galera(p.galera)
    }
  }, [fase, save.dificuldade])

  const ativarNeon = useCallback(() => {
    const j = jogo.current
    if (fase !== "tocando" || j.placar.neon < 0.5 || j.placar.neonAtivo > 0) return
    j.placar.neonAtivo = 8 * j.placar.neon + (modelo.bonus?.includes("NEON") ? 2 : 0)
    j.placar.neon = 0
    j.show?.neon(true)
    j.show?.grito(true)
    vib([30, 30, 60])
  }, [fase, modelo])

  useEffect(() => {
    if (fase !== "tocando") return
    const c = cvs.current!
    const g = c.getContext("2d")!
    const j = jogo.current
    if (!j.buf || !j.show) return
    j.show.tocar(j.buf, 0, j.parte)
    let raf = 0
    let ultimo = performance.now()
    const loop = () => {
      const agora = j.show!.tempo()
      const dt = Math.min(0.05, (performance.now() - ultimo) / 1000)
      ultimo = performance.now()
      const p = j.placar
      const jan = JANELA_ACERTO[save.dificuldade]
      // notas que passaram sem toque
      for (const n of j.notas) {
        if (!n.acertou && !n.errou && n.t < agora - jan) {
          n.errou = true
          p.seq = 0
          p.galera = Math.max(0, p.galera - 0.05)
          j.show!.errou()
          j.show!.galera(p.galera)
        }
        // nota longa: soma enquanto segura
        if (n.segurando) {
          if (agora >= n.t + n.dur) n.segurando = false
          else p.pontos += Math.round(25 * dt * 4)
        }
      }
      if (p.neonAtivo > 0) {
        p.neonAtivo -= dt
        if (p.neonAtivo <= 0) j.show!.neon(false)
      }
      j.flashes = j.flashes.filter((f) => f.ate > agora)
      const batida = Math.pow(1 - ((agora * faixa.bpm) / 60 % 1), 3)
      ajustar(c)
      const w = c.width
      const h = c.height
      desenharPalco(g, w, h, { palco, energia: p.galera, neon: p.neonAtivo > 0, batida, t: agora, instrumento: save.instrumento, modelo })
      g.fillStyle = "rgba(4,3,12,0.35)"
      g.fillRect(0, 0, w, h)
      desenharBraco(g, w, h, {
        notas: j.notas, agora, janela: VISIVEL[save.dificuldade], apertadas: j.apertadas,
        neon: p.neonAtivo > 0, modelo, flashes: j.flashes, multi: 1,
      })
      atualizarHud(hud.current, p)
      if (agora > j.dur + 0.3) {
        acabar()
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const kd = (e: KeyboardEvent) => {
      const i = TECLAS.indexOf(e.key.toLowerCase())
      if (i >= 0 && !e.repeat) { tocar(i, true); e.preventDefault() }
      if (e.key === " ") { ativarNeon(); e.preventDefault() }
    }
    const ku = (e: KeyboardEvent) => {
      const i = TECLAS.indexOf(e.key.toLowerCase())
      if (i >= 0) tocar(i, false)
    }
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
    }
  }, [fase, faixa, palco, modelo, save.dificuldade, save.instrumento, tocar, ativarNeon, acabar])

  /* ── cutscene de saída ── */
  useEffect(() => {
    if (fase !== "saida" || !res) return
    const c = cvs.current!
    const g = c.getContext("2d")!
    const ok = res.estrelas >= 2
    jogo.current.show?.grito(ok)
    jogo.current.show?.galera(ok ? 1 : 0.05)
    vib(ok ? [40, 40, 40, 40, 120] : 60)
    let raf = 0
    const t0 = performance.now()
    const loop = () => {
      const tt = (performance.now() - t0) / 1000
      ajustar(c)
      desenharTomada(g, c.width, c.height, "final", tt, { palco, modelo, sucesso: ok })
      if (tt > 3.4) {
        jogo.current.show?.parar()
        jogo.current.show = null
        setFase("resultado")
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [fase, res, palco, modelo])

  const sair = () => {
    jogo.current.show?.parar()
    sendMinimizeConsole()
    router.push("/?screen=home")
  }

  const emCena = fase === "entrada" || fase === "tocando" || fase === "saida"
  const faixasPalco = useMemo(() => FAIXAS, [])

  return (
    <div className="gd-raiz" style={{ ["--cor" as string]: palco.cor }}>
      <div className="gd-palco">
        <canvas ref={cvs} className={`gd-cvs ${emCena ? "is-on" : ""}`} />

        {fase === "menu" && (
          <Menu
            save={save}
            palco={palco}
            estrelasTot={estrelasTot}
            faixas={faixasPalco}
            erro={erroCarga}
            onPalco={setPalcoId}
            onFaixa={comecar}
            onInstrumento={(i) => salvar((s) => ({ ...s, instrumento: i }))}
            onDificuldade={(d) => salvar((s) => ({ ...s, dificuldade: d }))}
            onLoja={() => setFase("loja")}
            onSair={sair}
          />
        )}
        {fase === "loja" && <Loja save={save} salvar={salvar} onVoltar={() => setFase("menu")} />}
        {fase === "carregando" && (
          <div className="gd-carrega">
            <div className="gd-vinil" style={{ ["--cor" as string]: faixa.cor }} />
            <p>afinando {save.instrumento === "baixo" ? "o baixo" : "a guitarra"}…</p>
            <small>lendo {faixa.titulo.toLowerCase()} nota por nota</small>
          </div>
        )}
        {fase === "entrada" && (
          <button type="button" className="gd-pular" onClick={() => setFase("tocando")}>pular ›</button>
        )}
        {fase === "tocando" && (
          <>
            <div ref={hud} className="gd-hud">
              <div className="gd-pontos"><b data-k="pontos">0</b><small data-k="multi">x1</small></div>
              <div className="gd-galera"><span>galera</span><i><em data-k="galera" /></i></div>
              <button type="button" className="gd-neon" data-k="neonbtn" onPointerDown={(e) => { e.stopPropagation(); ativarNeon() }}>
                <i><em data-k="neon" /></i>
                <span>NEON</span>
              </button>
              <div className="gd-seq" data-k="seq" />
            </div>
            <div className="gd-trastes" style={{ ["--topo" as string]: "70%" }}>
              {Array.from({ length: LANES }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`corda ${i + 1}`}
                  style={{ ["--c" as string]: COR_LANE[i] }}
                  onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); tocar(i, true) }}
                  onPointerUp={() => tocar(i, false)}
                  onPointerCancel={() => tocar(i, false)}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ))}
            </div>
          </>
        )}
        {fase === "resultado" && res && (
          <ResultadoTela
            r={res}
            palco={palco}
            faixa={faixa}
            instrumento={save.instrumento}
            onDeNovo={() => comecar(faixa)}
            onMenu={() => setFase("menu")}
            onProximo={res.novoPalco ? () => { setPalcoId(res.novoPalco!.id); setFase("menu") } : undefined}
          />
        )}
      </div>
    </div>
  )
}

function novoPlacar(total = 0): Placar {
  return { pontos: 0, seq: 0, maxSeq: 0, acertos: 0, total, galera: 0.5, neon: 0, neonAtivo: 0 }
}

function ajustar(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(c.clientWidth * dpr)
  const h = Math.round(c.clientHeight * dpr)
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
}

function atualizarHud(el: HTMLDivElement | null, p: Placar) {
  if (!el) return
  const q = (k: string) => el.querySelector<HTMLElement>(`[data-k="${k}"]`)
  const multi = Math.min(4, 1 + Math.floor(p.seq / 10)) * (p.neonAtivo > 0 ? 2 : 1)
  const pts = q("pontos")
  if (pts) pts.textContent = p.pontos.toLocaleString("pt-BR")
  const m = q("multi")
  if (m) { m.textContent = `x${multi}`; m.dataset.alto = multi >= 4 ? "1" : "" }
  const gl = q("galera")
  if (gl) { gl.style.width = `${p.galera * 100}%`; gl.dataset.baixo = p.galera < 0.25 ? "1" : "" }
  const ne = q("neon")
  if (ne) ne.style.width = `${(p.neonAtivo > 0 ? Math.min(1, p.neonAtivo / 8) : p.neon) * 100}%`
  const nb = q("neonbtn")
  if (nb) nb.dataset.pronto = p.neon >= 0.5 && p.neonAtivo <= 0 ? "1" : p.neonAtivo > 0 ? "on" : ""
  const sq = q("seq")
  if (sq) sq.textContent = p.seq >= 10 ? `${p.seq} seguidas` : ""
}

/* ─── MENU: carreira ───────────────────────────────────── */
function Menu({
  save, palco, estrelasTot, faixas, erro, onPalco, onFaixa, onInstrumento, onDificuldade, onLoja, onSair,
}: {
  save: Save; palco: Palco; estrelasTot: number; faixas: Faixa[]; erro: string
  onPalco: (id: string) => void; onFaixa: (f: Faixa) => void; onInstrumento: (i: Instrumento) => void
  onDificuldade: (d: Save["dificuldade"]) => void; onLoja: () => void; onSair: () => void
}) {
  const modelo = MODELOS.find((m) => m.id === save.modelo[save.instrumento])!
  return (
    <section className="gd-menu">
      <header className="gd-topo">
        <button type="button" onClick={onSair}>‹ sair</button>
        <b>GUITAR DRIVER</b>
        <span className="gd-grana">R$ {save.grana.toLocaleString("pt-BR")}</span>
      </header>
      <div className="gd-menu-corpo">
        <p className="gd-rotulo">carreira · {estrelasTot} ★</p>
        <div className="gd-palcos">
          {PALCOS.map((p) => {
            const aberto = estrelasTot >= p.estrelas
            return (
              <button
                key={p.id}
                type="button"
                disabled={!aberto}
                className={`gd-palco-card ${p.id === palco.id ? "is-on" : ""} ${aberto ? "" : "is-trancado"}`}
                style={{ ["--c" as string]: p.cor }}
                onClick={() => onPalco(p.id)}
              >
                <b>{p.nome}</b>
                <small>{p.lugar}</small>
                <em>{aberto ? `cachê R$ ${p.cache}` : `🔒 ${p.estrelas} ★`}</em>
              </button>
            )
          })}
        </div>

        <div className="gd-inst">
          <div className="gd-toggle">
            {(["guitarra", "baixo"] as Instrumento[]).map((i) => (
              <button key={i} type="button" className={save.instrumento === i ? "is-on" : ""} onClick={() => onInstrumento(i)}>{i}</button>
            ))}
          </div>
          <button type="button" className="gd-inst-atual" onClick={onLoja}>
            <PreviaInstrumento m={modelo} acabamento={save.acabamento} pequeno />
            <span><b>{modelo.nome}</b><small>loja de instrumentos ›</small></span>
          </button>
        </div>

        <div className="gd-toggle is-dif">
          {(["facil", "medio", "dificil"] as Save["dificuldade"][]).map((d) => (
            <button key={d} type="button" className={save.dificuldade === d ? "is-on" : ""} onClick={() => onDificuldade(d)}>
              {d === "facil" ? "fácil" : d === "medio" ? "médio" : "difícil"}
            </button>
          ))}
        </div>

        <p className="gd-rotulo">setlist · {palco.nome}</p>
        {erro && <p className="gd-erro">{erro}</p>}
        <ul className="gd-setlist">
          {faixas.map((f) => {
            const aberta = faixaAberta(f)
            const est = save.estrelas[`${palco.id}:${f.id}:${save.instrumento}`] ?? 0
            return (
              <li key={f.id}>
                <button type="button" disabled={!aberta} onClick={() => onFaixa(f)} style={{ ["--c" as string]: f.cor }}>
                  <span className="gd-bpm">{f.bpm}<small>bpm</small></span>
                  <span className="gd-faixa-nome"><b>{f.titulo}</b><small>{aberta ? "★".repeat(est) + "☆".repeat(5 - est) : `abre ${new Date(f.abre!).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`}</small></span>
                  <em>›</em>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="gd-dica">toque nos 4 botões no pé do braço · teclado D F J K · espaço = modo NEON</p>
      </div>
    </section>
  )
}

/* ─── LOJA ─────────────────────────────────────────────── */
function Loja({ save, salvar, onVoltar }: { save: Save; salvar: (f: (s: Save) => Save) => void; onVoltar: () => void }) {
  const [tipo, setTipo] = useState<Instrumento>(save.instrumento)
  const comprar = (id: string, preco: number) => {
    if (save.possui.includes(id)) return true
    if (save.grana < preco) return false
    salvar((s) => ({ ...s, grana: s.grana - preco, possui: [...s.possui, id] }))
    vib([20, 30, 20])
    return true
  }
  return (
    <section className="gd-menu gd-loja">
      <header className="gd-topo">
        <button type="button" onClick={onVoltar}>‹ voltar</button>
        <b>LOJA DE INSTRUMENTOS</b>
        <span className="gd-grana">R$ {save.grana.toLocaleString("pt-BR")}</span>
      </header>
      <div className="gd-menu-corpo">
        <div className="gd-toggle">
          {(["guitarra", "baixo"] as Instrumento[]).map((i) => (
            <button key={i} type="button" className={tipo === i ? "is-on" : ""} onClick={() => setTipo(i)}>{i}s</button>
          ))}
        </div>
        <div className="gd-vitrine">
          {MODELOS.filter((m) => m.tipo === tipo).map((m) => {
            const tem = save.possui.includes(m.id)
            const usando = save.modelo[tipo] === m.id
            return (
              <div key={m.id} className={`gd-item ${usando ? "is-usando" : ""}`} style={{ ["--c" as string]: m.corpo }}>
                <PreviaInstrumento m={m} acabamento={usando ? save.acabamento : "liso"} />
                <b>{m.nome}</b>
                <small>{m.bonus ?? "sem bônus"}</small>
                <button
                  type="button"
                  disabled={usando || (!tem && save.grana < m.preco)}
                  onClick={() => { if (comprar(m.id, m.preco)) salvar((s) => ({ ...s, modelo: { ...s.modelo, [tipo]: m.id } })) }}
                >
                  {usando ? "usando" : tem ? "usar" : `R$ ${m.preco}`}
                </button>
              </div>
            )
          })}
        </div>
        <p className="gd-rotulo">acabamento</p>
        <div className="gd-acab">
          {ACABAMENTOS.map((a) => {
            const tem = save.possui.includes(a.id)
            return (
              <button
                key={a.id}
                type="button"
                className={save.acabamento === a.id ? "is-on" : ""}
                disabled={!tem && save.grana < a.preco}
                onClick={() => { if (comprar(a.id, a.preco)) salvar((s) => ({ ...s, acabamento: a.id })) }}
              >
                {a.nome}
                <small>{tem ? (save.acabamento === a.id ? "usando" : "usar") : `R$ ${a.preco}`}</small>
              </button>
            )
          })}
        </div>
        <p className="gd-dica">arte final dos instrumentos em breve — por enquanto é o desenho-guia de cada modelo.</p>
      </div>
    </section>
  )
}

// desenho-guia (placeholder) do instrumento: formato + cor + acabamento
function PreviaInstrumento({ m, acabamento, pequeno }: { m: Modelo; acabamento: string; pequeno?: boolean }) {
  const corpo: Record<Modelo["forma"], string> = {
    strato: "M30 70c-14 0-22 10-22 24s10 26 26 26 22-6 30-6 14 6 26 6 20-12 20-26-8-24-22-24c-8 0-10 6-18 6s-12-6-40-6z",
    jaguar: "M26 72c-16 2-22 14-20 26s14 22 28 20 20-8 34-8 18 10 30 8 18-14 16-28-12-20-24-18-14 8-26 8-20-10-38-8z",
    flying: "M40 60 L10 124 L52 108 L80 124 L104 60 Z",
    semi: "M24 70c-14 0-20 12-20 26s8 26 24 26c10 0 16-6 28-6s18 6 28 6c16 0 24-12 24-26s-6-26-20-26c-10 0-14 8-32 8s-22-8-32-8z",
    precision: "M28 66c-14 2-22 14-20 30s14 26 30 24 18-8 30-8 16 10 30 8 20-14 18-30-12-24-26-22-14 10-26 10-20-14-36-12z",
    jazz: "M30 64c-16 0-24 14-22 30s14 28 30 26 20-10 32-10 16 12 30 10 20-16 18-30-12-26-26-24-16 12-28 12-18-14-34-14z",
  }
  const graves = m.tipo === "baixo"
  return (
    <svg className={`gd-previa ${pequeno ? "is-pequeno" : ""}`} viewBox="0 0 140 140" aria-hidden>
      <defs>
        <linearGradient id={`h-${m.id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2fe8ff" />
          <stop offset=".5" stopColor="#ff3fb0" />
          <stop offset="1" stopColor="#ffc857" />
        </linearGradient>
      </defs>
      <rect x={graves ? 64 : 66} y={4} width={graves ? 12 : 8} height={graves ? 78 : 70} rx="2" fill={m.braco} stroke="#444" />
      <rect x={graves ? 62 : 63} y={2} width={graves ? 16 : 14} height={12} rx="3" fill="#15151f" />
      <path d={corpo[m.forma]} transform="translate(0 -4)" fill={acabamento === "holografico" ? `url(#h-${m.id})` : m.corpo} stroke="rgba(255,255,255,.35)" />
      {acabamento === "chuva" && [0, 1, 2, 3, 4, 5].map((i) => <ellipse key={i} cx={30 + i * 15} cy={90 + (i % 2) * 14} rx="2.5" ry="4" fill="#bff6ff" opacity=".8" />)}
      {acabamento === "adesivos" && <text x="70" y="104" textAnchor="middle" fontSize="11" fontWeight="800" fill="#050510">222</text>}
      <rect x="54" y="92" width="32" height="6" rx="2" fill="#111" />
      <text x="70" y="136" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,.35)" fontFamily="monospace">desenho-guia</text>
    </svg>
  )
}

/* ─── RESULTADO ────────────────────────────────────────── */
function ResultadoTela({ r, palco, faixa, instrumento, onDeNovo, onMenu, onProximo }: {
  r: Resultado; palco: Palco; faixa: Faixa; instrumento: Instrumento; onDeNovo: () => void; onMenu: () => void; onProximo?: () => void
}) {
  const [grana, setGrana] = useState(0)
  useEffect(() => {
    let v = 0
    const t = setInterval(() => {
      v = Math.min(r.grana, v + Math.max(10, Math.round(r.grana / 25)))
      setGrana(v)
      if (v >= r.grana) clearInterval(t)
    }, 40)
    return () => clearInterval(t)
  }, [r.grana])
  const frase = r.estrelas >= 4 ? "a casa veio abaixo." : r.estrelas >= 2 ? "a galera curtiu." : "hoje não foi. amanhã tem ensaio."
  return (
    <section className="gd-resultado">
      <p className="gd-rotulo">{palco.nome} · {faixa.titulo.toLowerCase()} · {instrumento}</p>
      <h1>{frase}</h1>
      <div className="gd-estrelas">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < r.estrelas ? "is-on" : ""} style={{ animationDelay: `${0.3 + i * 0.18}s` }}>★</span>)}</div>
      <dl>
        <div><dt>notas</dt><dd>{Math.round(r.pct * 100)}%</dd></div>
        <div><dt>maior sequência</dt><dd>{r.maxSeq}</dd></div>
        <div><dt>pontos</dt><dd>{r.pontos.toLocaleString("pt-BR")}{r.recorde ? " · recorde" : ""}</dd></div>
      </dl>
      <div className="gd-cache">
        <small>o dono do lugar</small>
        <p>“{palco.fala}”</p>
        <b>+ R$ {grana.toLocaleString("pt-BR")}</b>
      </div>
      {r.novoPalco && (
        <div className="gd-novo" style={{ ["--c" as string]: r.novoPalco.cor }}>
          <small>palco novo destravado</small>
          <b>{r.novoPalco.nome}</b>
          <span>{r.novoPalco.lugar} · cachê R$ {r.novoPalco.cache}</span>
        </div>
      )}
      <div className="gd-acoes">
        {onProximo && <button type="button" className="gd-btn" onClick={onProximo}>ir pro próximo palco</button>}
        <button type="button" className={onProximo ? "gd-btn is-ghost" : "gd-btn"} onClick={onDeNovo}>tocar de novo</button>
        <button type="button" className="gd-btn is-ghost" onClick={onMenu}>setlist</button>
      </div>
    </section>
  )
}
