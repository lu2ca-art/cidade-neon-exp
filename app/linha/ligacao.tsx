"use client"

// A ligação na tela da Kombi (dados em ligacoes.ts). Toca → atende → a
// pessoa fala (legenda junto) → nas perguntas o microfone escuta e o jogo
// entende qual opção você disse. As opções ficam SEMPRE como botão também:
// sem permissão de microfone, sem reconhecimento de voz no navegador (ou se
// ele não entender), é só tocar. A estrada não para.

import { useCallback, useEffect, useRef, useState } from "react"
import { entender, type Fala, type Ligacao, type PassoLigacao } from "./ligacoes"
import { VOZES } from "./roteiros"
import { audioCtx, player, voz } from "./som"
import { track } from "@/lib/analytics"

const MIC_NEGADO = "cn-linha-mic-negado"
const TOM: Record<string, number> = { "D-Bee": 1.25, Ella: 1.2, Mubarak: 0.8, Notti: 1.1, BBX: 0.9, Alohan: 0.85, LU2CA: 0.95 }

type Reconhecedor = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number
  start: () => void; stop: () => void; abort: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}
function novoReconhecedor(): Reconhecedor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as Record<string, new () => Reconhecedor>
  const R = w.SpeechRecognition || w.webkitSpeechRecognition
  return R ? new R() : null
}

// bip de desligar: dois tons curtos
function bipDesliga() {
  const c = audioCtx()
  if (!c) return
  ;[0, 0.22].forEach((d) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.frequency.value = 480
    g.gain.setValueAtTime(0.0001, c.currentTime + d)
    g.gain.exponentialRampToValueAtTime(0.05, c.currentTime + d + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + d + 0.16)
    o.connect(g).connect(c.destination)
    o.start(c.currentTime + d)
    o.stop(c.currentTime + d + 0.18)
  })
}

// o que foi dito na ligação, pra virar histórico da conversa no N3XO
export type Transcricao = { texto: string; eu?: boolean }[]

export function LigacaoNaKombi({ lig, onFim }: { lig: Ligacao; onFim: (atendeu: boolean, dito: Transcricao) => void }) {
  const id = lig.id
  const transcricao = useRef<Transcricao>([])
  const [fase, setFase] = useState<"tocando" | "falando" | "ouvindo" | "fim">("tocando")
  const [legenda, setLegenda] = useState("")
  const [pergunta, setPergunta] = useState<Extract<PassoLigacao, { t: "pergunta" }> | null>(null)
  const [dito, setDito] = useState("")
  const [mic, setMic] = useState<"ligado" | "negado" | "sem" | "parado">("parado")
  const [seg, setSeg] = useState(0)
  const vivo = useRef(true)
  // a ligação atendida segura a música lá embaixo até desligar
  const segurando = useRef(false)
  const resposta = useRef<((i: number) => void) | null>(null)
  const rec = useRef<Reconhecedor | null>(null)
  const cor = VOZES[lig.quem] ?? "#2fe8ff"

  // tocando: o toque (no canal de voz, a música abaixa) e o celular vibrando
  useEffect(() => {
    if (fase !== "tocando") return
    voz.tocar("toque", "/audio/iphone-ringtone.mp3")
    const vib = setInterval(() => { try { navigator.vibrate?.([300, 200, 300]) } catch {} }, 1600)
    // ninguém atendeu em 15s: vira recado
    const perdeu = setTimeout(() => { voz.parar(); onFim(false, []) }, 15000)
    return () => { clearInterval(vib); clearTimeout(perdeu); voz.parar() }
  }, [fase, onFim])

  useEffect(() => {
    if (fase !== "falando" && fase !== "ouvindo") return
    const t = setInterval(() => setSeg((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [fase])

  // fala uma linha e espera acabar (com tempo mínimo de leitura da legenda,
  // pro caso do navegador não ter voz)
  const falar = useCallback((f: Fala) => new Promise<void>((ok) => {
    setLegenda(f.fala)
    transcricao.current.push({ texto: f.fala })
    const vid = `lig:${f.fala}`
    const t0 = Date.now()
    const minimo = 700 + f.fala.length * 45
    let acabou = false
    const fim = () => {
      if (acabou) return
      acabou = true
      off()
      setTimeout(ok, Math.max(250, minimo - (Date.now() - t0)))
    }
    const off = voz.ouvir((s) => { if (s.id === vid && !s.tocando) fim() })
    voz.tocar(vid, f.src, f.fala, TOM[lig.quem] ?? 1)
    if (!voz.tocando) fim()
    // voz do navegador que nunca termina (sem voz instalada): segue pela legenda
    else if (!f.src) setTimeout(() => { if (!acabou) { voz.parar(); fim() } }, minimo + 2500)
  }), [lig.quem])

  // escuta a resposta: microfone + botões, o que vier primeiro
  const ouvir = useCallback((p: Extract<PassoLigacao, { t: "pergunta" }>) => new Promise<number>((ok) => {
    setPergunta(p)
    setDito("")
    resposta.current = (i) => { resposta.current = null; rec.current?.abort(); rec.current = null; ok(i) }
    let negado = false
    try { negado = localStorage.getItem(MIC_NEGADO) === "1" } catch {}
    const r = negado ? null : novoReconhecedor()
    if (!r) { setMic(negado ? "negado" : "sem"); return }
    rec.current = r
    r.lang = "pt-BR"
    r.interimResults = true
    r.continuous = false
    r.maxAlternatives = 3
    r.onresult = (e) => {
      const res = e.results[e.results.length - 1]
      setDito(res[0]?.transcript ?? "")
      if (!res.isFinal) return
      // a frase acabou: vale a primeira alternativa que bater com uma opção
      for (let k = 0; k < res.length; k++) {
        const i = entender(res[k].transcript, p.opcoes)
        if (i !== null) { resposta.current?.(i); return }
      }
    }
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        try { localStorage.setItem(MIC_NEGADO, "1") } catch {}
        setMic("negado")
      } else setMic("parado")
    }
    r.onend = () => { if (rec.current === r) setMic((m) => (m === "ligado" ? "parado" : m)) }
    try { r.start(); setMic("ligado") } catch { setMic("parado") }
  }), [])

  const tentarDeNovo = () => {
    if (pergunta && resposta.current) {
      const ok = resposta.current
      resposta.current = null
      rec.current?.abort()
      ouvir(pergunta).then((i) => ok(i))
    }
  }

  const atender = async () => {
    voz.parar()
    setFase("falando")
    player.abaixar(true) // a ligação inteira com a música lá embaixo
    segurando.current = true
    track("mission_step", { mission_id: `linha-ligacao-${id}`, step: "atendeu", perfil: "?", fio_pos: -1 })
    try {
      for (const p of lig.passos) {
        if (!vivo.current) return
        if (p.t === "fala") { await falar(p); continue }
        await falar(p)
        if (!vivo.current) return
        setFase("ouvindo")
        const i = await ouvir(p)
        setPergunta(null)
        setMic("parado")
        setFase("falando")
        track("mission_step", { mission_id: `linha-ligacao-${id}`, step: `resposta:${i}`, perfil: "?", fio_pos: -1 })
        transcricao.current.push({ texto: p.opcoes[i].label, eu: true })
        for (const f of p.opcoes[i].resposta) { if (!vivo.current) return; await falar(f) }
      }
    } finally {
      if (vivo.current) desligar(true)
    }
  }

  const desligar = (atendeu: boolean) => {
    if (!vivo.current) return
    vivo.current = false
    rec.current?.abort()
    voz.parar()
    if (segurando.current) { segurando.current = false; player.abaixar(false) }
    bipDesliga()
    setFase("fim")
    setTimeout(() => onFim(atendeu, transcricao.current), 700)
  }
  useEffect(() => {
    vivo.current = true
    return () => {
    vivo.current = false
    rec.current?.abort()
    if (segurando.current) { segurando.current = false; player.abaixar(false) }
    }
  }, [])

  const tempo = `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`

  return (
    <div className={`l-lig is-${fase}`} style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <header>
        <div className="l-lig-av">{lig.quem.slice(0, 1)}</div>
        <div className="l-lig-quem">
          <b>{lig.quem}</b>
          <small>{fase === "tocando" ? "N3XO · ligação de voz…" : fase === "fim" ? "ligação encerrada" : `N3XO · ${tempo}`}</small>
        </div>
        {fase === "tocando" ? (
          <div className="l-lig-bts">
            <button type="button" className="is-recusa" onClick={() => { voz.parar(); onFim(false, []) }} aria-label="recusar">✕</button>
            <button type="button" className="is-atende" onClick={atender} aria-label="atender">✆</button>
          </div>
        ) : fase !== "fim" ? (
          <button type="button" className="l-lig-desliga" onClick={() => desligar(true)} aria-label="desligar">✕</button>
        ) : null}
      </header>
      {(fase === "falando" || fase === "ouvindo") && legenda && <p className="l-lig-legenda">“{legenda}”</p>}
      {fase === "ouvindo" && pergunta && (
        <div className="l-lig-resp">
          <div className={`l-lig-mic is-${mic}`}>
            {mic === "ligado" ? (
              <><i />{dito ? <span>“{dito}”</span> : <span>fala uma das respostas</span>}</>
            ) : mic === "negado" ? (
              <span>sem microfone · toca na resposta</span>
            ) : mic === "sem" ? (
              <span>toca na resposta</span>
            ) : (
              <button type="button" onClick={tentarDeNovo}>🎙 {dito ? "não peguei · fala de novo" : "falar a resposta"}</button>
            )}
          </div>
          {pergunta.opcoes.map((o, i) => (
            <button key={i} type="button" className="l-lig-op" onClick={() => resposta.current?.(i)}>{o.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}
