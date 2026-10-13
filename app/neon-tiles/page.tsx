"use client"

// GUITAR DRIVER — tocar as faixas do LU2CA ao vivo, no espírito do Guitar Hero
// (refeito, nosso): carreira de palcos (garagem → arena), cada palco com o seu
// setlist e o seu dono da noite (o duelo leva o palco), desafios, a loja com
// instrumentos desenhados como os de verdade, e o cachê em NEON (a moeda do
// jogo). As notas foram desenhadas das stems reais, presas na grade de cada
// faixa (public/gd/<id>.json) e a SUA parte toca separada: errou, ela some.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { sendCarRadioMute, sendMinimizeConsole } from "@/app/providers/AudioBridge"
import { track } from "@/lib/analytics"
import "./gd.css"
import {
  DESAFIOS, FAIXAS, MODELOS, PALCOS, SAVE_VAZIO, carregar, estrelasPor, gravar, palcoAberto,
  type Faixa, type Feito, type Instrumento, type Palco, type Save,
} from "./dados"
import {
  COR_LANE, LANES, andarParticulas, desenharBraco, desenharHud, desenharPalco, desenharTomada, geometriaBraco, soltarFaiscas,
  type Nota, type Particula, type Tomada,
} from "./cena"
import { ac, atrasoEstimado, carregarBuffer, montarShow, type Show } from "./som"
import {
  JANELA, NOME_ATAQUE, PERFEITO, VISIVEL, andarRival, multiplicador, notasDoChart, novoDuelo, novoPlacar,
  type ChartGd, type Duelo, type Placar,
} from "./motor"
import { imagemInstrumento } from "./instrumentos"
import { mudarNeon, saldoInicial } from "./neon"
import { Calibrar, Carreira, Desafios, Loja, Opcoes, Preparo, Rapido, ResultadoTela, Setlist, Titulo, type Resultado } from "./menus"
import { Editor } from "./editor"

// o áudio em camadas: <base>/<faixa>/{sem-guitarra,guitarra,sem-baixo,baixo}.mp3
const GD_AUDIO = process.env.NEXT_PUBLIC_GD_AUDIO ?? "https://evlqbbqswxhxemwk.public.blob.vercel-storage.com/gd/v1"
const TECLAS = ["d", "f", "j", "k"]

export type Tela =
  | { t: "titulo" } | { t: "carreira" } | { t: "palco"; id: string } | { t: "rapido" } | { t: "desafios" }
  | { t: "preparo"; faixa: string; palco: string | null; batalha: boolean }
  | { t: "loja" } | { t: "opcoes" } | { t: "calibrar"; depois?: Tela } | { t: "editor" }
  | { t: "carregando" } | { t: "entrada" } | { t: "tocando" } | { t: "saida" } | { t: "resultado" }
  | { t: "cutscene"; palco: string }

interface Show_ {
  faixa: Faixa
  palco: Palco
  carreira: boolean // false = tocar rápido
  batalha: boolean
}

interface Jogo {
  notas: Nota[]
  placar: Placar
  show: Show | null
  dur: number
  bpm: number
  t0: number
  apertadas: boolean[]
  flashes: { lane: number; ate: number; tipo: "ok" | "erro"; perfeito?: boolean }[]
  particulas: Particula[]
  buf: AudioBuffer | null
  parte: AudioBuffer | null
  aviso: { texto: string; ate: number; cor: string } | null
  frases: Map<number, { total: number; acertos: number; falhou: boolean }>
  duelo: Duelo | null
  tremor: number
  fim: "vaiado" | "ganhou" | "perdeu" | null
  ini: number // primeira nota ainda na tela (otimização)
}

function vib(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

function jogoVazio(): Jogo {
  return { notas: [], placar: novoPlacar(), show: null, dur: 30, bpm: 100, t0: 0, apertadas: [false, false, false, false], flashes: [], particulas: [], buf: null, parte: null, aviso: null, frases: new Map(), duelo: null, tremor: 0, fim: null, ini: 0 }
}

export default function GuitarDriver() {
  const router = useRouter()
  const { updateCinematicStep, completeConfirmation, state } = useGameFunnel()
  const [save, setSave] = useState<Save>(SAVE_VAZIO)
  const [neon, setNeon] = useState(0)
  const [tela, setTela] = useState<Tela>({ t: "titulo" })
  const [show, setShow] = useState<Show_ | null>(null)
  const [res, setRes] = useState<Resultado | null>(null)
  const [erroCarga, setErroCarga] = useState("")
  const [editorLiberado, setEditorLiberado] = useState(false)
  const cvs = useRef<HTMLCanvasElement>(null)
  const jogo = useRef<Jogo>(jogoVazio())
  const toques = useRef(new Map<number, number>()) // ponteiro → posição na pista

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSave(carregar())
    setNeon(saldoInicial())
    setEditorLiberado(new URLSearchParams(window.location.search).has("editor"))
    sendCarRadioMute(true)
    // dev: o teste automático lê o estado do show
    if (process.env.NODE_ENV !== "production") (window as unknown as { __gd: typeof jogo }).__gd = jogo
    return () => { sendCarRadioMute(false); jogo.current.show?.parar() }
  }, [])

  const salvar = useCallback((f: (s: Save) => Save) => setSave((s) => { const n = f(s); gravar(n); return n }), [])
  const modelo = MODELOS.find((m) => m.id === save.modelo[save.instrumento]) ?? MODELOS[0]
  const atraso = save.atraso ?? atrasoEstimado()

  // os instrumentos de verdade no palco (o seu + o da outra pessoa da banda)
  const imgs = useMemo(() => {
    if (typeof window === "undefined") return {}
    const g = MODELOS.find((m) => m.id === save.modelo.guitarra) ?? MODELOS[0]
    const b = MODELOS.find((m) => m.id === save.modelo.baixo) ?? MODELOS.find((m) => m.tipo === "baixo")!
    return {
      guitarra: imagemInstrumento(g.id, g.visual, "guitarra", save.acabamentos[g.id] ?? "liso"),
      baixo: imagemInstrumento(b.id, b.visual, "baixo", save.acabamentos[b.id] ?? "liso"),
    }
  }, [save.modelo, save.acabamentos])

  const gastar = useCallback(async (valor: number) => {
    const r = await mudarNeon(-valor)
    setNeon(r.neon)
    return r.ok
  }, [])

  /* ── começar um show ── */
  const comecar = async (faixaId: string, palcoId: string | null, batalha: boolean) => {
    const f = FAIXAS.find((x) => x.id === faixaId)!
    // tocar rápido: o visual (e o cachê, pela metade) do palco mais alto aberto
    const abertos = PALCOS.filter((_, i) => palcoAberto(save, i))
    const palco = PALCOS.find((p) => p.id === palcoId) ?? abertos[abertos.length - 1] ?? PALCOS[0]
    ac()
    setShow({ faixa: f, palco, carreira: !!palcoId, batalha })
    setErroCarga("")
    setTela({ t: "carregando" })
    track("mission_started", { mission_id: `guitar-${f.id}`, place_id: "neon-tiles" })
    try {
      const inst = save.instrumento
      const base = `${GD_AUDIO}/${f.id}`
      // o editor pode ter deixado uma versão das notas pra testar (só no aparelho)
      const local = (() => { try { return localStorage.getItem(`gd-chart-${f.id}`) } catch { return null } })()
      const [chart, buf, parte] = await Promise.all([
        local ? Promise.resolve(JSON.parse(local) as ChartGd) : fetch(`/gd/${f.id}.json`).then((r) => r.json() as Promise<ChartGd>),
        carregarBuffer(`${base}/sem-${inst}.mp3`),
        carregarBuffer(`${base}/${inst}.mp3`),
      ])
      const notas = notasDoChart(chart, inst, save.dificuldade)
      const frases = new Map<number, { total: number; acertos: number; falhou: boolean }>()
      for (const n of notas) if (n.frase !== undefined) { const fr = frases.get(n.frase) ?? { total: 0, acertos: 0, falhou: false }; fr.total++; frases.set(n.frase, fr) }
      jogo.current = {
        ...jogoVazio(), notas, placar: novoPlacar(notas.length), dur: buf.duration, bpm: chart.bpm, t0: chart.t0, buf, parte, frases,
        duelo: batalha ? novoDuelo(palco.rival) : null,
      }
      setTela({ t: "entrada" })
    } catch {
      setErroCarga("não deu pra carregar a faixa. confere a internet e tenta de novo.")
      setTela({ t: "preparo", faixa: f.id, palco: palcoId, batalha })
    }
  }

  /* ── cutscene de entrada → contagem → show ── */
  useEffect(() => {
    if (tela.t !== "entrada" || !show) return
    const c = cvs.current!
    const g = c.getContext("2d")!
    const sh = montarShow()
    jogo.current.show = sh
    sh?.galera(0.35)
    let raf = 0
    const t0 = performance.now()
    const beat = 60 / jogo.current.bpm
    const TOMADAS: { t: Tomada; dur: number }[] = [
      { t: "fachada", dur: 2.2 },
      { t: "backstage", dur: 1.8 },
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
        if (n > contou) { contou = n; sh?.baqueta(); vib(10) }
      }
      ajustar(c)
      desenharTomada(g, c.width, c.height, atual.t, tl, { palco: show.palco, modelo, contagem: n, imgs })
      if (tt >= total) { cancelAnimationFrame(raf); setTela({ t: "tocando" }); return }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tela.t, show, modelo, imgs])

  /* ── fim do show: nota, cachê, desafios, duelo ── */
  const acabar = useCallback(() => {
    if (!show) return
    const j = jogo.current
    const p = j.placar
    const pct = p.total ? p.acertos / p.total : 0
    const vaiado = j.fim === "vaiado"
    const terminou = !vaiado && !(show.batalha && j.fim === "perdeu")
    const est = vaiado ? 0 : estrelasPor(pct * 0.85 + p.galera * 0.15)
    const venceu = show.batalha ? j.fim === "ganhou" || (j.fim !== "perdeu" && (j.duelo?.voce ?? 0) > 0.5) : false
    const bonus = modelo.bonus?.includes("+30%") ? 1.3 : modelo.bonus?.includes("+20%") ? 1.2 : modelo.bonus?.includes("+10%") ? 1.1 : 1
    let cache = vaiado ? 0 : Math.round((show.palco.cache * (0.15 + est * 0.17) * bonus * (show.carreira ? 1 : 0.5)) / 5) * 5
    if (show.batalha) cache = venceu ? show.palco.cache * 2 : Math.round(cache * 0.3)
    const feito: Feito = { palco: show.palco.id, faixa: show.faixa.id, dificuldade: save.dificuldade, pct, maxSeq: p.maxSeq, estrelas: est, neonUsos: p.neonUsos, semErro: p.erros === 0 && terminou, terminou }
    const novosDesafios = DESAFIOS.filter((d) => d.palco === show.palco.id && !save.desafios.includes(d.id) && d.ok(feito))
    const premio = novosDesafios.reduce((s, d) => s + d.neon, 0)
    const chave = `${show.palco.id}:${show.faixa.id}:${save.instrumento}`
    const recorde = p.pontos > (save.recordes[chave] ?? 0)
    const primeiraVitoria = venceu && !save.batalhas.includes(show.palco.id)
    const iPalco = PALCOS.findIndex((x) => x.id === show.palco.id)
    const novoPalco = primeiraVitoria ? PALCOS[iPalco + 1] ?? null : null
    const concluidas = est >= 1 && !save.concluidas.includes(show.faixa.id) ? [...save.concluidas, show.faixa.id] : save.concluidas
    salvar((s) => ({
      ...s,
      estrelas: show.batalha ? s.estrelas : { ...s.estrelas, [chave]: Math.max(s.estrelas[chave] ?? 0, est) },
      recordes: recorde ? { ...s.recordes, [chave]: p.pontos } : s.recordes,
      concluidas,
      desafios: [...s.desafios, ...novosDesafios.map((d) => d.id)],
      batalhas: venceu && !s.batalhas.includes(show.palco.id) ? [...s.batalhas, show.palco.id] : s.batalhas,
    }))
    const total = cache + premio
    if (total > 0) mudarNeon(total).then((r) => setNeon(r.neon))
    // funil antigo: 4 faixas terminadas fecham a confirmação 3
    if (concluidas.length >= 4 && !state.confirmations.c3.done) {
      updateCinematicStep("neon-tiles-complete")
      completeConfirmation(3, { accuracy: Math.round(pct * 100), maxCombo: p.maxSeq })
    }
    track("mission_completed", { mission_id: `guitar-${show.faixa.id}`, duration_ms: Math.round(j.dur * 1000) })
    setRes({
      pct, estrelas: est, pontos: p.pontos, maxSeq: p.maxSeq, perfeitos: p.perfeitos, cache, recorde, novoPalco, vaiado,
      desafios: novosDesafios.map((d) => ({ texto: d.texto, neon: d.neon })), batalha: show.batalha ? { venceu, rival: show.palco.rival.nome } : null,
    })
    setTela({ t: "saida" })
  }, [show, modelo, save, salvar, state.confirmations.c3.done, completeConfirmation, updateCinematicStep])

  /* ── tocar (posição na pista → trilha, que inverte no ataque) ── */
  const tocar = useCallback((pos: number, on: boolean) => {
    const j = jogo.current
    const inv = j.duelo?.ataque?.tipo === "trocadas"
    const lane = inv ? LANES - 1 - pos : pos
    j.apertadas[lane] = on
    if (tela.t !== "tocando" || !j.show) return
    const agora = j.show.tempo() - atraso
    const p = j.placar
    if (!on) {
      // estado do jogo vive num ref mutável de propósito (60fps, sem render)
      // eslint-disable-next-line react-hooks/immutability
      for (const n of j.notas) if (n.lane === lane && n.segurando) { n.segurando = false; if (agora < n.t + n.dur - 0.1) n.soltou = true }
      return
    }
    const jan = JANELA[save.dificuldade] * (modelo.bonus?.includes("janela") ? 1.12 : 1)
    let alvo: Nota | null = null
    let melhor = Infinity
    for (let i = j.ini; i < j.notas.length; i++) {
      const n = j.notas[i]
      if (n.t > agora + jan) break
      if (n.lane !== lane || n.acertou || n.errou) continue
      const d = Math.abs(n.t - agora)
      if (d < jan && d < melhor) { melhor = d; alvo = n }
    }
    const c = cvs.current
    if (alvo) {
      alvo.acertou = true
      if (alvo.dur > 0) alvo.segurando = true
      const perfeito = melhor <= PERFEITO
      p.seq++
      p.maxSeq = Math.max(p.maxSeq, p.seq)
      p.acertos++
      if (perfeito) p.perfeitos++
      p.pontos += (perfeito ? 50 : 40) * multiplicador(p)
      p.galera = Math.min(1, p.galera + (p.neonAtivo > 0 ? 0.035 : 0.02) * (modelo.bonus?.includes("galera") ? 1.3 : 1))
      j.flashes.push({ lane, ate: agora + 0.35, tipo: "ok", perfeito })
      if (c) soltarFaiscas(j.particulas, c.width, c.height, lane, COR_LANE[lane], perfeito ? 12 : 6, inv)
      j.show.acertou()
      j.show.galera(p.galera)
      if (j.duelo) j.duelo.voce = Math.min(1, j.duelo.voce + 0.006)
      if (p.seq > 0 && p.seq % 50 === 0) j.aviso = { texto: `${p.seq} NOTAS SEGUIDAS!`, ate: agora + 1.4, cor: "#ffe14d" }
      // frase de estrela completa
      if (alvo.frase !== undefined) {
        const fr = j.frases.get(alvo.frase)
        if (fr) {
          fr.acertos++
          if (fr.acertos === fr.total && !fr.falhou) {
            if (j.duelo) { j.duelo.cartas++; j.aviso = { texto: "ATAQUE NA MÃO!", ate: agora + 1.3, cor: "#8fe3ff" } }
            else { p.neon = Math.min(1, p.neon + 0.25); j.aviso = { texto: "FRASE NEON!", ate: agora + 1.2, cor: "#8fe3ff" } }
          }
        }
      }
      vib(perfeito ? 10 : 6)
    } else {
      // palhetada no vazio
      p.seq = 0
      p.galera = Math.max(0, p.galera - 0.02)
      j.flashes.push({ lane, ate: agora + 0.25, tipo: "erro" })
      j.show.errou()
      j.show.galera(p.galera)
      j.tremor = 0.6
    }
  }, [tela.t, save.dificuldade, atraso, modelo])

  const ativarNeon = useCallback(() => {
    const j = jogo.current
    if (tela.t !== "tocando" || !j.show) return
    const agora = j.show.tempo() - atraso
    // no duelo, o botão dispara um ataque no rival
    if (j.duelo) {
      if (j.duelo.cartas <= 0) return
      j.duelo.cartas--
      j.duelo.atordoado = agora + 5
      j.duelo.voce = Math.min(1, j.duelo.voce + 0.06)
      j.aviso = { texto: "O RIVAL ERROU FEIO!", ate: agora + 1.3, cor: "#5dffa0" }
      j.show.grito(true)
      vib([20, 20, 40])
      return
    }
    if (j.placar.neon < 0.5 || j.placar.neonAtivo > 0) return
    j.placar.neonAtivo = 16 * j.placar.neon + (modelo.bonus?.includes("NEON") ? 2 : 0)
    j.placar.neon = 0
    j.placar.neonUsos++
    j.aviso = { texto: "MODO NEON!", ate: agora + 1.2, cor: "#8fe3ff" }
    j.show.neon(true)
    j.show.grito(true)
    vib([30, 30, 60])
  }, [tela.t, modelo, atraso])

  // o falha de uma nota (passou sem tocar)
  const errou = useCallback((n: Nota, agora: number) => {
    const j = jogo.current
    const p = j.placar
    n.errou = true
    p.seq = 0
    p.erros++
    p.galera = Math.max(0, p.galera - (save.dificuldade === "facil" ? 0.03 : save.dificuldade === "medio" ? 0.038 : 0.045))
    if (n.frase !== undefined) { const fr = j.frases.get(n.frase); if (fr) fr.falhou = true }
    j.show!.errou()
    j.show!.galera(p.galera)
    j.tremor = 1
    if (j.duelo) j.duelo.voce = Math.max(0, j.duelo.voce - 0.028)
    // no fácil a galera nunca vaia (pra quem nunca tocou)
    else if (p.galera <= 0 && agora > 8 && save.dificuldade !== "facil") j.fim = "vaiado"
    vib(35)
  }, [save.dificuldade])

  useEffect(() => {
    if (tela.t !== "tocando" || !show) return
    const c = cvs.current!
    const g = c.getContext("2d")!
    const j = jogo.current
    if (!j.buf || !j.show) return
    j.show.tocar(j.buf, 0, j.parte)
    let raf = 0
    let ultimo = performance.now()
    const loop = () => {
      const agora = j.show!.tempo() - atraso
      const dt = Math.min(0.05, (performance.now() - ultimo) / 1000)
      ultimo = performance.now()
      const p = j.placar
      const jan = JANELA[save.dificuldade]
      // notas que passaram sem toque + notas longas segurando
      while (j.ini < j.notas.length && j.notas[j.ini].t + j.notas[j.ini].dur < agora - 1.5) j.ini++
      for (let i = j.ini; i < j.notas.length; i++) {
        const n = j.notas[i]
        if (n.t > agora + 0.2) break
        if (!n.acertou && !n.errou && n.t < agora - jan) errou(n, agora)
        if (n.segurando) {
          if (agora >= n.t + n.dur) n.segurando = false
          else p.pontos += Math.round(25 * dt * 4 * multiplicador(p))
        }
      }
      // o duelo
      let rapida = false
      if (j.duelo) {
        const novo = andarRival(j.duelo, j.notas, agora)
        if (novo) { j.aviso = { texto: NOME_ATAQUE[novo], ate: agora + 1.4, cor: "#ff3fb0" }; vib([50, 30, 50]) }
        rapida = j.duelo.ataque?.tipo === "rapida"
        if (j.duelo.voce >= 1) j.fim = "ganhou"
        else if (j.duelo.voce <= 0) j.fim = "perdeu"
      }
      if (p.neonAtivo > 0) {
        p.neonAtivo -= dt
        if (p.neonAtivo <= 0) j.show!.neon(false)
      }
      j.tremor = Math.max(0, j.tremor - dt * 4)
      j.flashes = j.flashes.filter((f) => f.ate > agora)
      andarParticulas(j.particulas, dt)
      const fb = ((agora - j.t0) / (60 / j.bpm)) % 1
      const batida = Math.pow(1 - (fb < 0 ? fb + 1 : fb), 3)
      ajustar(c)
      const w = c.width
      const h = c.height
      desenharPalco(g, w, h, { palco: show.palco, energia: p.galera, neon: p.neonAtivo > 0, batida, t: agora, instrumento: save.instrumento, modelo, imgs, vaia: p.galera < 0.15 })
      g.fillStyle = "rgba(4,3,12,0.42)"
      g.fillRect(0, 0, w, h)
      desenharBraco(g, w, h, {
        notas: j.notas, agora, janela: VISIVEL[save.dificuldade] * (rapida ? 0.6 : 1), apertadas: j.apertadas,
        neon: p.neonAtivo > 0, modelo, flashes: j.flashes, multi: multiplicador(p), bpm: j.bpm, t0: j.t0,
        particulas: j.particulas, invertido: j.duelo?.ataque?.tipo === "trocadas", apagao: j.duelo?.ataque?.tipo === "apagao", tremor: j.tremor,
      })
      desenharHud(g, w, h, {
        pontos: p.pontos, seq: p.seq, multi: multiplicador(p), galera: p.galera, neon: p.neonAtivo > 0 ? Math.min(1, p.neonAtivo / 16) : p.neon,
        neonAtivo: p.neonAtivo > 0, aviso: j.aviso, agora, progresso: Math.min(1, agora / j.dur),
        duelo: j.duelo ? { voce: j.duelo.voce, rival: j.duelo.rival.nome, ataque: j.duelo.ataque ? NOME_ATAQUE[j.duelo.ataque.tipo] : null, cartas: j.duelo.cartas } : null,
      })
      if (agora > j.dur + 0.4 || j.fim) {
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
  }, [tela.t, show, modelo, imgs, save.dificuldade, save.instrumento, atraso, tocar, ativarNeon, acabar, errou])

  /* ── cutscene de saída ── */
  useEffect(() => {
    if (tela.t !== "saida" || !res || !show) return
    const c = cvs.current!
    const g = c.getContext("2d")!
    const ok = res.batalha ? res.batalha.venceu : res.estrelas >= 2
    jogo.current.show?.grito(ok)
    jogo.current.show?.galera(ok ? 1 : 0.05)
    vib(ok ? [40, 40, 40, 40, 120] : 60)
    let raf = 0
    const t0 = performance.now()
    const loop = () => {
      const tt = (performance.now() - t0) / 1000
      ajustar(c)
      desenharTomada(g, c.width, c.height, "final", tt, { palco: show.palco, modelo, sucesso: ok, imgs })
      if (tt > 3.2) {
        jogo.current.show?.parar()
        jogo.current.show = null
        setTela({ t: "resultado" })
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tela.t, res, show, modelo, imgs])

  /* ── cutscene da carreira: a Kombi na estrada → o cartaz do palco novo ── */
  useEffect(() => {
    if (tela.t !== "cutscene") return
    const palco = PALCOS.find((p) => p.id === tela.palco)!
    const c = cvs.current!
    const g = c.getContext("2d")!
    let raf = 0
    const t0 = performance.now()
    const loop = () => {
      const tt = (performance.now() - t0) / 1000
      ajustar(c)
      if (tt < 4.2) desenharTomada(g, c.width, c.height, "estrada", tt, { palco, modelo, titulo: `rumo a ${palco.nome}`, sub: palco.lugar })
      else desenharTomada(g, c.width, c.height, "cartaz", tt - 4.2, { palco, modelo, titulo: palco.nome, sub: `${palco.lugar} · hoje: LU2CA` })
      if (tt > 7.4) {
        salvar((s) => ({ ...s, vistos: s.vistos.includes(palco.id) ? s.vistos : [...s.vistos, palco.id] }))
        setTela({ t: "palco", id: palco.id })
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [tela, modelo, salvar])

  const sair = () => {
    jogo.current.show?.parar()
    sendMinimizeConsole()
    router.push("/?screen=home")
  }

  // o toque na pista: a coluna inteira (vários dedos ao mesmo tempo)
  const posDoToque = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const gb = geometriaBraco(r.width, r.height)
    const x = e.clientX - r.left - (gb.cx - gb.baseW / 2)
    return Math.max(0, Math.min(LANES - 1, Math.floor((x / gb.baseW) * LANES)))
  }

  const emCena = tela.t === "entrada" || tela.t === "tocando" || tela.t === "saida" || tela.t === "cutscene"
  const cor = show?.palco.cor ?? "#ff9000"

  return (
    <div className="gd-raiz" style={{ ["--cor" as string]: cor }}>
      <div className="gd-palco">
        <canvas ref={cvs} className={`gd-cvs ${emCena ? "is-on" : ""}`} />

        {tela.t === "titulo" && (
          <Titulo neon={neon} modelo={modelo} acabamento={save.acabamentos[modelo.id] ?? "liso"} editor={editorLiberado}
            onIr={(t) => setTela(t)} onSair={sair} />
        )}
        {tela.t === "carreira" && <Carreira save={save} neon={neon} onPalco={(id) => setTela(save.vistos.includes(id) || id === "garagem" ? { t: "palco", id } : { t: "cutscene", palco: id })} onVoltar={() => setTela({ t: "titulo" })} />}
        {tela.t === "palco" && (
          <Setlist save={save} neon={neon} palco={PALCOS.find((p) => p.id === tela.id)!}
            onFaixa={(f, batalha) => setTela({ t: "preparo", faixa: f, palco: tela.id, batalha })} onVoltar={() => setTela({ t: "carreira" })} />
        )}
        {tela.t === "rapido" && <Rapido save={save} neon={neon} onFaixa={(f) => setTela({ t: "preparo", faixa: f, palco: null, batalha: false })} onVoltar={() => setTela({ t: "titulo" })} />}
        {tela.t === "desafios" && <Desafios save={save} neon={neon} onVoltar={() => setTela({ t: "titulo" })} />}
        {tela.t === "preparo" && (
          <Preparo save={save} salvar={salvar} faixa={FAIXAS.find((f) => f.id === tela.faixa)!} palco={tela.palco ? PALCOS.find((p) => p.id === tela.palco)! : null}
            batalha={tela.batalha} erro={erroCarga} calibrado={save.atraso !== null}
            onTocar={() => comecar(tela.faixa, tela.palco, tela.batalha)}
            onCalibrar={() => setTela({ t: "calibrar", depois: tela })}
            onVoltar={() => setTela(tela.palco ? { t: "palco", id: tela.palco } : { t: "rapido" })} />
        )}
        {tela.t === "loja" && <Loja save={save} salvar={salvar} neon={neon} gastar={gastar} onVoltar={() => setTela({ t: "titulo" })} />}
        {tela.t === "opcoes" && <Opcoes save={save} salvar={salvar} editor={editorLiberado} onCalibrar={() => setTela({ t: "calibrar", depois: { t: "opcoes" } })} onEditor={() => setTela({ t: "editor" })} onVoltar={() => setTela({ t: "titulo" })} />}
        {tela.t === "calibrar" && <Calibrar onFim={(s) => { if (s !== null) salvar((x) => ({ ...x, atraso: s })); setTela(tela.depois ?? { t: "opcoes" }) }} />}
        {tela.t === "editor" && <Editor gdAudio={GD_AUDIO} onVoltar={() => setTela({ t: "opcoes" })} />}
        {tela.t === "carregando" && show && (
          <div className="gd-carrega">
            <div className="gd-vinil" style={{ ["--cor" as string]: show.faixa.cor }} />
            <p>afinando {save.instrumento === "baixo" ? "o baixo" : "a guitarra"}…</p>
            <small>{show.faixa.titulo.toLowerCase()} · {show.palco.nome}</small>
          </div>
        )}
        {(tela.t === "entrada" || tela.t === "cutscene") && (
          <button type="button" className="gd-pular" onClick={() => {
            if (tela.t === "entrada") setTela({ t: "tocando" })
            else { salvar((s) => ({ ...s, vistos: [...s.vistos, tela.palco] })); setTela({ t: "palco", id: tela.palco }) }
          }}>pular ›</button>
        )}
        {tela.t === "tocando" && (
          <>
            <div
              className="gd-toque"
              onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); const pos = posDoToque(e); toques.current.set(e.pointerId, pos); tocar(pos, true) }}
              onPointerUp={(e) => { const pos = toques.current.get(e.pointerId); if (pos !== undefined) { tocar(pos, false); toques.current.delete(e.pointerId) } }}
              onPointerCancel={(e) => { const pos = toques.current.get(e.pointerId); if (pos !== undefined) { tocar(pos, false); toques.current.delete(e.pointerId) } }}
              onContextMenu={(e) => e.preventDefault()}
            />
            <button type="button" className="gd-neon-btn" onPointerDown={(e) => { e.stopPropagation(); ativarNeon() }}>{show?.batalha ? "ATAQUE" : "NEON"}</button>
            <button type="button" className="gd-pausa" onClick={() => { jogo.current.show?.parar(); jogo.current.show = null; setTela(show?.carreira ? { t: "palco", id: show.palco.id } : { t: "rapido" }) }} aria-label="sair do show">✕</button>
          </>
        )}
        {tela.t === "resultado" && res && show && (
          <ResultadoTela r={res} palco={show.palco} faixa={show.faixa} instrumento={save.instrumento} neon={neon}
            onDeNovo={() => comecar(show.faixa.id, show.carreira ? show.palco.id : null, show.batalha)}
            onMenu={() => setTela(show.carreira ? { t: "palco", id: show.palco.id } : { t: "rapido" })}
            onProximo={res.novoPalco ? () => setTela({ t: "cutscene", palco: res.novoPalco!.id }) : undefined} />
        )}
      </div>
    </div>
  )
}

function ajustar(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(c.clientWidth * dpr)
  const h = Math.round(c.clientHeight * dpr)
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
}

export type { Instrumento }
