"use client"

// NECTAR — a leitura. Dinâmica de chapéu seletor: cenas curtas, caminhos
// que se bifurcam pela primeira resposta, uma aura que muda de cor enquanto
// a cidade "pensa", e uma cerimônia antes do resultado. O resultado é uma
// campanha das faixas (faixa × fase), com o objeto que te acompanha e o
// próximo ponto da rota dele. Dados em ./leitura.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import { sendMinimizeConsole } from "@/app/providers/AudioBridge"
import { track } from "@/lib/analytics"
import "./nectar.css"
import { CAMPANHAS, FAIXAS, FASE_NOME, NOS, OBJETOS, TOTAL_PERGUNTAS, ler, type Faixa, type Resultado } from "./leitura"

type Resp = { no: string; opcao: number }
type Tela = "abertura" | "pergunta" | "cerimonia" | "resultado"

const CHAVE = "cn-nectar-leitura"
const ATO: Record<string, string> = { chegada: "I · a chegada", travessia: "II · a travessia", espelho: "III · o espelho" }

// ── som mínimo (a página roda fora da Linha 222, então tem o seu) ──
let ctx: AudioContext | null = null
function ac() {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {})
  return ctx
}
const PENTA = [293.66, 349.23, 392, 440, 523.25, 587.33, 698.46, 783.99]
function nota(i: number, vol = 0.18) {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = "sine"
  o.frequency.value = PENTA[((i % 8) + 8) % 8]
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 1.5)
}
let drone: { g: GainNode; os: OscillatorNode[] } | null = null
function ligarDrone(on: boolean) {
  const c = ac()
  if (!c) return
  if (on && !drone) {
    const g = c.createGain()
    g.gain.value = 0
    const lp = c.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 700
    const os = [73.42, 110, 146.83, 220].map((f, i) => {
      const o = c.createOscillator()
      o.type = i % 2 ? "triangle" : "sine"
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 5
      o.connect(lp)
      o.start()
      return o
    })
    lp.connect(g).connect(c.destination)
    drone = { g, os }
  }
  if (drone) drone.g.gain.setTargetAtTime(on ? 0.05 : 0, c.currentTime, on ? 2 : 0.5)
}
function vib(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

function nomeDoJogador(): string {
  try {
    return (JSON.parse(localStorage.getItem("cn-linha-222") || "{}").nome as string) || ""
  } catch {
    return ""
  }
}

export default function NectarPage() {
  const router = useRouter()
  const { completeConfirmation, state } = useGameFunnel()
  const [tela, setTela] = useState<Tela>("abertura")
  const [no, setNo] = useState("inicio")
  const [resp, setResp] = useState<Resp[]>([])
  const [escolhida, setEscolhida] = useState<number | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [salvo, setSalvo] = useState<Resultado | null>(null)
  const [nome, setNome] = useState("")
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    try {
      const r = localStorage.getItem(CHAVE)
      // leitura já feita antes: mostra direto, com opção de ler de novo
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (r) setSalvo(JSON.parse(r))
    } catch {}
    setNome(nomeDoJogador())
    return () => { ligarDrone(false); audio.current?.pause() }
  }, [])

  // aura: a cor da faixa que tá na frente até agora (sem dizer qual é)
  const aura = useMemo(() => {
    if (!resp.length) return "#b38cff"
    const soma: Partial<Record<Faixa, number>> = {}
    for (const r of resp) for (const [k, v] of Object.entries(NOS[r.no].opcoes[r.opcao].peso.f ?? {})) soma[k as Faixa] = (soma[k as Faixa] ?? 0) + (v ?? 0)
    const top = (Object.keys(soma) as Faixa[]).sort((a, b) => (soma[b] ?? 0) - (soma[a] ?? 0))[0]
    return top ? FAIXAS[top].cor : "#b38cff"
  }, [resp])

  const comecar = () => {
    ac()
    ligarDrone(true)
    setResp([])
    setNo("inicio")
    setResultado(null)
    setTela("pergunta")
    track("mission_started", { mission_id: "nectar-leitura", place_id: "nectar" })
  }

  const escolher = useCallback((i: number) => {
    if (escolhida !== null) return
    setEscolhida(i)
    nota(resp.length + i)
    vib(12)
    const atual = NOS[no]
    const nova = [...resp, { no, opcao: i }]
    setTimeout(() => {
      setResp(nova)
      setEscolhida(null)
      const prox = atual.opcoes[i].prox ?? atual.prox
      if (prox) setNo(prox)
      else {
        setTela("cerimonia")
        const r = ler(nova)
        setResultado(r)
        try { localStorage.setItem(CHAVE, JSON.stringify(r)) } catch {}
        if (!state.confirmations.c1.done) completeConfirmation(1, { nectarAnswers: nova.map((x) => x.opcao), leitura: `${r.faixa}${r.fase}` })
        track("mission_completed", { mission_id: "nectar-leitura", duration_ms: 0 })
        setTimeout(() => {
          ligarDrone(false)
          setTela("resultado")
          vib([30, 50, 30, 50, 120])
          const a = new Audio(FAIXAS[r.faixa].audio)
          a.volume = 0.8
          a.play().catch(() => {})
          audio.current = a
        }, 5200)
      }
    }, 520)
  }, [escolhida, no, resp, state.confirmations.c1.done, completeConfirmation])

  const voltar = () => {
    audio.current?.pause()
    ligarDrone(false)
    sendMinimizeConsole()
    router.push("/?screen=home")
  }

  return (
    <div className="n-raiz" style={{ ["--aura" as string]: tela === "resultado" && resultado ? FAIXAS[resultado.faixa].cor : aura }}>
      <div className="n-palco">
        <div className="n-aura" />
        <div className="n-grao" />

        {tela === "abertura" && (
          <section className="n-abertura">
            <p className="n-rotulo">cidade neon · a leitura</p>
            <h1 className="n-titulo">nectar</h1>
            <p className="n-lede">
              {nome ? `${nome}, a` : "a"} cidade vai te ler.
              <br />sete perguntas. o caminho muda com cada resposta.
              <br /><em>responde rápido. o primeiro impulso é o que conta.</em>
            </p>
            <button type="button" className="n-btn" onClick={comecar}>{salvo ? "ler de novo" : "começar a leitura"}</button>
            {salvo && (
              <button type="button" className="n-link" onClick={() => { setResultado(salvo); setTela("resultado") }}>
                ver minha última leitura · {FAIXAS[salvo.faixa].nome.toLowerCase()} · {CAMPANHAS[`${salvo.faixa}${salvo.fase}`]?.titulo.toLowerCase()}
              </button>
            )}
            <button type="button" className="n-link is-sutil" onClick={voltar}>voltar</button>
          </section>
        )}

        {tela === "pergunta" && (
          <Pergunta key={no} no={no} n={resp.length} escolhida={escolhida} onEscolher={escolher} />
        )}

        {tela === "cerimonia" && <Cerimonia />}

        {tela === "resultado" && resultado && <ResultadoTela r={resultado} nome={nome} onDeNovo={comecar} onVoltar={voltar} />}
      </div>
    </div>
  )
}

function Pergunta({ no, n, escolhida, onEscolher }: { no: string; n: number; escolhida: number | null; onEscolher: (i: number) => void }) {
  const d = NOS[no]
  const [txt, setTxt] = useState("")
  const [pronto, setPronto] = useState(!d.cena)
  useEffect(() => {
    if (!d.cena) return
    let i = 0
    const t = setInterval(() => {
      i += 2
      setTxt(d.cena!.slice(0, i))
      if (i >= d.cena!.length) { clearInterval(t); setPronto(true) }
    }, 22)
    return () => clearInterval(t)
  }, [d.cena])
  return (
    <section className="n-pergunta">
      <header className="n-topo">
        <span className="n-rotulo">{ATO[d.ato]}</span>
        <div className="n-pontos">
          {Array.from({ length: TOTAL_PERGUNTAS }, (_, i) => <i key={i} className={i < n ? "is-feito" : i === n ? "is-agora" : ""} />)}
        </div>
      </header>
      <div className="n-meio">
        {d.cena && <p className="n-cena" onClick={() => { setTxt(d.cena!); setPronto(true) }}>{txt}<span className="n-cursor" /></p>}
        <h2 className={`n-q ${pronto ? "is-on" : ""}`}>{d.pergunta}</h2>
      </div>
      <div className="n-opcoes">
        {pronto && d.opcoes.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`n-opcao ${escolhida === i ? "is-escolhida" : ""} ${escolhida !== null && escolhida !== i ? "is-some" : ""}`}
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => onEscolher(i)}
          >
            {o.txt}
          </button>
        ))}
      </div>
    </section>
  )
}

const PALAVRAS = ["saudade", "coragem", "vergonha", "tédio", "presença", "medo", "transbordo", "loop", "resiliência", "fome", "silêncio", "dança", "culpa", "sonho", "fé", "vazio", "chuva", "flor"]

function Cerimonia() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => { setI((x) => x + 1); nota(Math.floor(Math.random() * 8), 0.07) }, 260)
    return () => clearInterval(t)
  }, [])
  return (
    <section className="n-cerimonia">
      <p className="n-rotulo">a cidade tá te lendo</p>
      <div className="n-palavra" key={i}>{PALAVRAS[i % PALAVRAS.length]}</div>
      <div className="n-anel" />
      <p className="n-nucleo">NÚCLEO · tentativa de leitura bloqueada ✓</p>
    </section>
  )
}

function ResultadoTela({ r, nome, onDeNovo, onVoltar }: { r: Resultado; nome: string; onDeNovo: () => void; onVoltar: () => void }) {
  const f = FAIXAS[r.faixa]
  const c = r.campanha
  const o = OBJETOS[r.objeto]
  const compartilhar = async () => {
    const txt = `meu nectar é ${f.nome.toLowerCase()} · ${c.titulo.toLowerCase()} (${FASE_NOME[r.fase]}). meu objeto: ${o.nome}. e o seu?`
    try {
      if (navigator.share) return await navigator.share({ title: "nectar · cidade neon", text: txt, url: "https://lu2ca.art" })
      await navigator.clipboard.writeText(`${txt} https://lu2ca.art`)
    } catch {}
  }
  return (
    <section className="n-resultado">
      <p className="n-rotulo">{nome ? `${nome}, seu nectar é` : "seu nectar é"}</p>
      <h1 className="n-faixa">{f.nome}</h1>
      <div className="n-camp">
        <span className="n-fase">{FASE_NOME[r.fase]}</span>
        <b>{c.titulo}</b>
      </div>
      {c.frase && <blockquote className="n-frase">“{c.frase}”</blockquote>}
      <dl className="n-leitura">
        <div><dt>emoção dominante</dt><dd>{c.emocao}</dd></div>
        <div><dt>sua brecha</dt><dd>{c.brecha}</dd></div>
        <div><dt>como você fala</dt><dd>{c.linguagem}</dd></div>
      </dl>
      <div className="n-objeto">
        <small>o objeto que te acompanha</small>
        <b>{o.nome}</b>
        <div className="n-rota">
          {o.rota.map(([fx, fs], i) => {
            const aqui = fx === r.faixa && fs === r.fase
            return (
              <span key={i} className={aqui ? "is-aqui" : ""} style={{ ["--c" as string]: FAIXAS[fx].cor }}>
                <i />
                {FAIXAS[fx].nome.toLowerCase()}
              </span>
            )
          })}
        </div>
        <p>{o.porque}.</p>
        {r.proximo && (
          <p className="n-prox">
            seu próximo passo: <b style={{ color: FAIXAS[r.proximo[0]].cor }}>{FAIXAS[r.proximo[0]].nome}</b> · {CAMPANHAS[`${r.proximo[0]}${r.proximo[1]}`]?.titulo.toLowerCase() ?? FASE_NOME[r.proximo[1]]}
          </p>
        )}
      </div>
      <p className="n-sombra">sua sombra: <b style={{ color: FAIXAS[r.sombra].cor }}>{FAIXAS[r.sombra].nome}</b></p>
      {c.cta && (
        <div className="n-cta">
          <small>pra você levar</small>
          <p>{c.cta}</p>
        </div>
      )}
      <div className="n-acoes">
        <button type="button" className="n-btn" onClick={compartilhar}>compartilhar meu nectar</button>
        <div className="n-acoes-2">
          <button type="button" className="n-btn is-ghost" onClick={onDeNovo}>ler de novo</button>
          <button type="button" className="n-btn is-ghost" onClick={onVoltar}>voltar</button>
        </div>
      </div>
    </section>
  )
}
