"use client"

// O TAMBOR (lista de mudanças 2.5, LU2CA 22/10): na casinha, ANTES do holo.
// A D-Bee senta no tapete e toca uma frase; você repete. Três frases curtas.
// A ajuda: um pulso leve marca o tempo e o toque que chega perto é puxado pro
// tempo certo. Fora da margem o toque soa torto (abafado, desafinado, atrasado).
// Não tem perder: no fim ela reage e a cena segue pro holo.
//
// Relógio: AudioContext.currentTime. As batidas dela e o metrônomo são
// agendadas no áudio; a tela lê o relógio por quadro e mexe no DOM direto
// (sem setState por quadro). setState só na troca de compasso.

import { useEffect, useRef, useState } from "react"
import { audioCtx, saidaSom, silenciar } from "../som"
import { vib } from "../som-carro"

// tudo que dá pra afinar fica aqui
export const TAMBOR = {
  bpm: 90,
  // cada frase: as colcheias (0–7) de um compasso de 4 tempos
  frases: [
    [0, 2, 4, 6],
    [0, 2, 3, 4, 6],
    [0, 1, 2, 4, 6, 7],
  ],
  graves: [0, 4], // colcheias que soam grave (o resto é o agudo/slap)
  entrada: 0.9, // s antes do primeiro compasso
  ajuda: 0.1, // s: dentro disso o toque conta e é puxado pro tempo
  puxa: 0.7, // quanto do adiantado é corrigido (0–1)
  margem: 0.2, // s: entre ajuda e margem conta meio e soa um pouco torto; fora, torto
  bom: 0.6, // nota mínima pra ela dizer "isso"
  tentativas: 2, // "de novo" no máximo 1 vez; depois segue de qualquer jeito
}

// ── o som do tambor (Web Audio): corpo com queda de afinação + parcial
// inarmônico da pele + ruído filtrado + slap. `torto` 0–1 abafa e desafina ──
let ruido: AudioBuffer | null = null
function bufRuido(c: AudioContext) {
  if (ruido && ruido.sampleRate === c.sampleRate) return ruido
  const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.5), c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  ruido = b
  return b
}

type Fonte = AudioScheduledSourceNode
function env(c: AudioContext, t: number, pico: number, dur: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + 0.003)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  return g
}

export function bater(quando: number, grave: boolean, torto = 0, vol = 0.8): Fonte[] {
  const c = audioCtx()
  const out = saidaSom()
  if (!c || !out) return []
  const t = Math.max(quando, c.currentTime)
  const bus = c.createGain()
  bus.gain.value = vol * (1 - 0.3 * torto)
  if (torto > 0) {
    const lp = c.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 2600 - 1900 * torto
    bus.connect(lp).connect(out)
  } else bus.connect(out)
  const desaf = 1 - 0.16 * torto
  const f0 = (grave ? 150 : 270) * desaf
  const f1 = (grave ? 62 : 165) * desaf
  const fontes: Fonte[] = []
  // corpo
  const o = c.createOscillator()
  o.type = "sine"
  o.frequency.setValueAtTime(f0, t)
  o.frequency.exponentialRampToValueAtTime(f1, t + (grave ? 0.2 : 0.1))
  o.connect(env(c, t, 1, (grave ? 0.55 : 0.32) * (1 - 0.35 * torto))).connect(bus)
  o.start(t); o.stop(t + 0.6); fontes.push(o)
  // a pele: um parcial inarmônico curto
  const o2 = c.createOscillator()
  o2.type = "sine"
  o2.frequency.setValueAtTime(f0 * 1.59, t)
  o2.frequency.exponentialRampToValueAtTime(f1 * 1.59, t + 0.08)
  o2.connect(env(c, t, grave ? 0.25 : 0.35, 0.09)).connect(bus)
  o2.start(t); o2.stop(t + 0.12); fontes.push(o2)
  // o ruído da mão na pele
  const n = c.createBufferSource()
  n.buffer = bufRuido(c)
  const bp = c.createBiquadFilter()
  bp.type = "bandpass"
  bp.frequency.value = grave ? 650 : 1500
  bp.Q.value = 0.8
  n.connect(bp).connect(env(c, t, grave ? 0.35 : 0.5, grave ? 0.11 : 0.08)).connect(bus)
  n.start(t, Math.random() * 0.3, 0.15); fontes.push(n)
  // o slap (só no agudo e no grave limpo; o torto perde o estalo)
  if (torto < 0.8) {
    const s = c.createBufferSource()
    s.buffer = bufRuido(c)
    const hp = c.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 3200
    s.connect(hp).connect(env(c, t, (grave ? 0.15 : 0.4) * (1 - torto), 0.02)).connect(bus)
    s.start(t, Math.random() * 0.3, 0.04); fontes.push(s)
  }
  return fontes
}

// o pulso que mantém no tempo: um tique de madeira, bem baixo
function tique(quando: number, forte: boolean): Fonte[] {
  const c = audioCtx()
  const out = saidaSom()
  if (!c || !out) return []
  const o = c.createOscillator()
  o.type = "triangle"
  o.frequency.value = forte ? 1250 : 950
  o.connect(env(c, quando, forte ? 0.07 : 0.045, 0.035)).connect(out)
  o.start(quando); o.stop(quando + 0.05)
  return [o]
}

type Fase = { k: number; quem: "entrada" | "ela" | "voce" | "fim"; msg?: string }

export function Tambor({ onFim }: { onFim: () => void }) {
  const [rodada, setRodada] = useState(0)
  const [fase, setFase] = useState<Fase>({ k: 0, quem: "entrada" })
  const delaRef = useRef<HTMLDivElement>(null)
  const seuRef = useRef<HTMLDivElement>(null)
  const pulsoRef = useRef<HTMLElement>(null)
  const slotsRef = useRef<(HTMLLIElement | null)[]>([])
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  // o estado vivo do jogo (fora do React)
  const jogo = useRef({ t0: 0, usados: new Set<string>(), pontos: 0, erros: 0, ultimoSeu: -9, ativo: false })

  const colcheia = 60 / TAMBOR.bpm / 2
  const compasso = colcheia * 8
  const N = TAMBOR.frases.length

  // a música para enquanto os dois tocam
  useEffect(() => {
    silenciar(true)
    return () => silenciar(false)
  }, [])

  useEffect(() => {
    const c = audioCtx()
    if (!c) { const t = setTimeout(() => fim.current(), 300); return () => clearTimeout(t) }
    const t0 = c.currentTime + TAMBOR.entrada
    jogo.current = { t0, usados: new Set(), pontos: 0, erros: 0, ultimoSeu: -9, ativo: true }
    const fontes: Fonte[] = []
    TAMBOR.frases.forEach((fr, k) => {
      const ela = t0 + 2 * k * compasso
      for (const p of fr) fontes.push(...bater(ela + p * colcheia, TAMBOR.graves.includes(p), 0, 0.75))
      // o pulso na vez dele (e no último tempo dela, pra entrar junto)
      const voce = ela + compasso
      fontes.push(...tique(voce - colcheia * 2, false))
      for (let b = 0; b < 4; b++) fontes.push(...tique(voce + b * colcheia * 2, b === 0))
    })
    const reduz = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    let barAnt = -2
    let raf = 0
    let acabou = false
    const quadro = () => {
      raf = requestAnimationFrame(quadro)
      const t = c.currentTime - t0
      const bar = t < 0 ? -1 : Math.floor(t / compasso)
      if (bar !== barAnt) {
        barAnt = bar
        if (bar < 0) setFase({ k: 0, quem: "entrada" })
        else if (bar < 2 * N) setFase({ k: Math.floor(bar / 2), quem: bar % 2 === 0 ? "ela" : "voce" })
        else if (!acabou) {
          acabou = true
          jogo.current.ativo = false
          const total = TAMBOR.frases.reduce((s, f) => s + f.length, 0)
          const nota = (jogo.current.pontos - 0.5 * jogo.current.erros) / total
          const bem = nota >= TAMBOR.bom || rodada + 1 >= TAMBOR.tentativas
          setFase({ k: N - 1, quem: "fim", msg: nota >= TAMBOR.bom ? "isso. vc ouve" : bem ? "tá. a gente acerta com o tempo" : "de novo. escuta primeiro" })
          setTimeout(() => (bem ? fim.current() : setRodada((r) => r + 1)), 1800)
        }
      }
      // o pulso (escala; com "reduzir movimento", só a luz)
      const fb = (Math.max(0, t) / (colcheia * 2)) % 1
      const pul = Math.pow(1 - fb, 3)
      const pe = pulsoRef.current
      if (pe) {
        pe.style.opacity = String(0.25 + 0.75 * pul)
        if (!reduz) pe.style.transform = `scale(${1 + 0.35 * pul})`
      }
      // o tambor dela pisca em cada batida que já soou
      if (bar >= 0 && bar < 2 * N && bar % 2 === 0) {
        const k = bar / 2
        const dt = t - bar * compasso
        let flash = 0
        for (const p of TAMBOR.frases[k]) {
          const d = dt - p * colcheia
          if (d >= 0) {
            flash = Math.max(flash, Math.exp(-d / 0.09))
            slotsRef.current[p]?.classList.add("is-ela")
          }
        }
        if (delaRef.current) delaRef.current.style.setProperty("--flash", flash.toFixed(3))
      } else if (delaRef.current) delaRef.current.style.setProperty("--flash", "0")
      const ds = t - jogo.current.ultimoSeu
      if (seuRef.current) seuRef.current.style.setProperty("--flash", ds < 0.5 ? Math.exp(-ds / 0.09).toFixed(3) : "0")
    }
    raf = requestAnimationFrame(quadro)
    return () => {
      cancelAnimationFrame(raf)
      jogo.current.ativo = false
      for (const f of fontes) { try { f.stop() } catch {} }
    }
  }, [rodada]) // eslint-disable-line react-hooks/exhaustive-deps

  // um toque do jogador
  const tocar = () => {
    const c = audioCtx()
    if (!c) return
    const j = jogo.current
    const agora = c.currentTime
    const t = agora - j.t0
    j.ultimoSeu = t
    vib(12)
    // em qual compasso dele isso conta (pode adiantar um pouco o 1º tempo)
    let bar = Math.floor(t / compasso)
    if (bar % 2 === 0 && t > (bar + 1) * compasso - TAMBOR.margem) bar += 1
    const k = (bar - 1) / 2
    if (!j.ativo || t < 0 || bar % 2 !== 1 || k >= N) {
      // tocando junto na vez dela (ou fora do jogo): soa, mas não conta
      bater(agora, false, 0, 0.55)
      return
    }
    const base = bar * compasso
    let melhor = -1, erro = Infinity
    for (const p of TAMBOR.frases[k]) {
      if (j.usados.has(`${k}:${p}`)) continue
      const e = t - (base + p * colcheia)
      if (Math.abs(e) < Math.abs(erro)) { erro = e; melhor = p }
    }
    const grave = melhor >= 0 && TAMBOR.graves.includes(melhor)
    if (melhor >= 0 && Math.abs(erro) <= TAMBOR.ajuda) {
      // a ajuda: o adiantado é puxado pro tempo (o atrasado já passou)
      bater(erro < 0 ? agora - erro * TAMBOR.puxa : agora, grave)
      j.usados.add(`${k}:${melhor}`); j.pontos += 1
      slotsRef.current[melhor]?.classList.add("is-seu")
    } else if (melhor >= 0 && Math.abs(erro) <= TAMBOR.margem) {
      bater(agora, grave, 0.35)
      j.usados.add(`${k}:${melhor}`); j.pontos += 0.5
      slotsRef.current[melhor]?.classList.add("is-quase")
    } else {
      // fora da margem: torto, abafado e um tiquinho atrasado
      bater(agora + 0.035, grave, 1)
      j.erros += 1
      seuRef.current?.classList.remove("is-torto")
      void seuRef.current?.offsetWidth
      seuRef.current?.classList.add("is-torto")
    }
  }
  const tocarRef = useRef(tocar)
  tocarRef.current = tocar
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return
      e.preventDefault(); e.stopPropagation()
      tocarRef.current()
    }
    window.addEventListener("keydown", k, true)
    return () => window.removeEventListener("keydown", k, true)
  }, [])

  const frase = TAMBOR.frases[fase.k]
  const titulo = fase.quem === "entrada" ? "escuta ela" : fase.quem === "ela" ? "ela toca" : fase.quem === "voce" ? "agora você" : fase.msg
  return (
    <div className={`l-tambor is-${fase.quem}`} onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); tocar() }} onClick={(e) => e.stopPropagation()}>
      <b className="l-tambor-titulo">{titulo}</b>
      <div className="l-tambor-roda">
        <div className="l-tambor-pele is-dela" ref={delaRef}><span>D-Bee</span></div>
        <i className="l-tambor-pulso" ref={pulsoRef} />
        <div className="l-tambor-pele is-seu" ref={seuRef}><span>você</span></div>
      </div>
      <ol className="l-tambor-frase" key={`${rodada}-${fase.k}`}>
        {Array.from({ length: 8 }, (_, p) => (
          <li key={p} ref={(el) => { slotsRef.current[p] = el }} className={`${frase.includes(p) ? "is-nota" : ""} ${p % 2 === 0 ? "is-tempo" : ""}`} />
        ))}
      </ol>
      <small className="l-tambor-dica">toca na tela ou espaço · frase {fase.k + 1}/{N}</small>
    </div>
  )
}
