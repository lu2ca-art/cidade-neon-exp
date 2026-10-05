"use client"

// A CHEGADA NA CIDADE — a primeira vez. Nada de celular: você já está na
// Kombi, rodando de boa pela cidade neon, ouvindo um vinil no toca-discos
// (os discos da loja). Uns segundos depois o rádio liga sozinho e fica
// procurando frequência — chiado, dial girando, quase pega a 222… e quem
// entra é o Núcleo: anúncio por cima de tudo, cada vez mais, até tirar o som
// do ar. A cidade perde a cor, a Kombi encosta e estaciona. No silêncio, o
// celular vibra: alguém no N3XO. É a D-Bee.
//
// A Kombi (Corrida em modo cinema) fica por baixo; isso aqui é só a camada
// de cima: tarjas de cinema e os anúncios. No silêncio a chegada acaba e o
// grupo 222 começa a rolar na ilha da Kombi (page.tsx), sem travar nada. Os tempos ficam
// todos em ROTEIRO pra dar pra afinar o ritmo num lugar só.

import { useEffect, useRef, useState } from "react"
import { audioCtx, chiadoCurto, estatica, gota, player } from "./som"
import { VINIS } from "./radio"
import { track } from "@/lib/analytics"

// ms depois de entrar
const ROTEIRO = {
  // 05/10 (LU2CA): a abertura demorava e deixava o jogo cinza tempo demais.
  // Agora tudo acontece em ~20 s, e o cinza é só um susto
  titulo: 1200, // "cidade neon" aparece nas tarjas
  radio: 6000, // o rádio liga sozinho: o vinil abaixa e o dial começa a girar
  agulha: 7500, // o vinil para; só o chiado procurando
  quase: 9500, // quase pega a 222 (o dial trava, "sinal fraco")
  anuncio1: 11000, // quem entra na frequência é o Núcleo: 1º anúncio
  anuncio2: 13000, // vários anúncios, o chiado por baixo
  corta: 16000, // CONTEÚDO REMOVIDO: o som sai, a cor sai, a Kombi encosta
  limpa: 18000, // os anúncios somem — sobra a cidade cinza e a chuva
  vibra: 20000, // o celular vibra: N3XO
}


// estalo de vinil: cliques esparsos, baixinhos, em loop
function estaloVinil() {
  const c = audioCtx()
  if (!c) return null
  const src = c.createBufferSource()
  const buf = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() < 0.0009 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.012
  src.buffer = buf
  src.loop = true
  const hp = c.createBiquadFilter()
  hp.type = "highpass"
  hp.frequency.value = 900
  const g = c.createGain()
  g.gain.value = 0.18
  src.connect(hp).connect(g).connect(c.destination)
  src.start()
  return {
    volume: (v: number) => g.gain.setTargetAtTime(v, c.currentTime, 0.2),
    parar: () => { try { src.stop() } catch {} },
  }
}

// o clique seco do rádio ligando sozinho
function clique() {
  const c = audioCtx()
  if (!c) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = "square"
  o.frequency.value = 90
  g.gain.setValueAtTime(0.12, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06)
  o.connect(g).connect(c.destination)
  o.start()
  o.stop(c.currentTime + 0.07)
}

type Anuncio = { k: number; t: string; m: string; x: number; y: number; r: number }

const ANUNCIOS: Omit<Anuncio, "k" | "x" | "y" | "r">[] = [
  { t: "NÚCLEO · ANÚNCIO", m: "sua música volta depois deste recado ✓" },
  { t: "NÚCLEO PREMIUM", m: "ouça sem pensar. sem interrupções. sem sentir ✓" },
  { t: "VOCÊ ESTÁ FELIZ", m: "confirme sua felicidade para continuar ouvindo ✓" },
  { t: "FREQUÊNCIA NÃO LICENCIADA", m: "222 FM não é recomendada para você ✓" },
  { t: "ROTINA OTIMIZADA", m: "você dormiu 4h12. ótimo para a produtividade ✓" },
  { t: "SUGESTÃO DO NÚCLEO", m: "que tal uma playlist que não lembra de nada? ✓" },
  { t: "MEMÓRIA CHEIA", m: "seu ontem foi arquivado para liberar espaço ✓" },
  { t: "CONTEÚDO SENSÍVEL", m: "esta música pode causar saudade ✓" },
]

// a vinheta do Núcleo: dois tons limpos, corporativos, sem graça nenhuma
function jingle(grave = false) {
  const c = audioCtx()
  if (!c) return
  const notas = grave ? [392, 262] : [523, 659, 784]
  notas.forEach((f, i) => {
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = "sine"
    o.frequency.value = f
    const t0 = c.currentTime + i * 0.16
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
    o.connect(g).connect(c.destination)
    o.start(t0)
    o.stop(t0 + 0.55)
  })
}

function vibrar(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

export function Chegada({
  onParar, onCinza, onAbrir,
}: {
  onParar: () => void
  onCinza: () => void
  onAbrir: () => void
}) {
  const [fase, setFase] = useState<"vinil" | "radio" | "quase" | "anuncio" | "invadindo" | "cortou" | "silencio" | "vibra">("vinil")
  const [vinil] = useState(() => VINIS[Math.floor(Math.random() * VINIS.length)])
  // o visor do rádio: a frequência girando sozinha
  const [dial, setDial] = useState<{ f: string; txt: string } | null>(null)
  const estalo = useRef<ReturnType<typeof estaloVinil>>(null)
  const [titulo, setTitulo] = useState(false)
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [barra, setBarra] = useState<string | null>(null)
  const prox = useRef(0)
  const chiado = useRef<ReturnType<typeof estatica>>(null)
  const cbs = useRef({ onParar, onCinza, onAbrir })
  useEffect(() => { cbs.current = { onParar, onCinza, onAbrir } }, [onParar, onCinza, onAbrir])

  useEffect(() => {
    track("mission_step", { mission_id: "linha-chegada", step: "inicio", perfil: "?", fio_pos: -1 })
    const ts: ReturnType<typeof setTimeout>[] = []
    const em = (ms: number, f: () => void) => ts.push(setTimeout(f, ms))
    const novo = (n: number, longe = false) => {
      setAnuncios((l) => {
        const add: Anuncio[] = []
        for (let i = 0; i < n; i++) {
          const k = prox.current++
          add.push({
            k,
            ...ANUNCIOS[k % ANUNCIOS.length],
            x: longe ? 4 + Math.random() * 46 : 18 + Math.random() * 18,
            y: longe ? 10 + Math.random() * 58 : 26 + Math.random() * 20,
            r: (Math.random() - 0.5) * (longe ? 8 : 3),
          })
        }
        return [...l, ...add]
      })
      vibrar(18)
    }

    // o vinil já rodando quando a cena abre
    player.tocar(vinil.src, undefined, 0.85)
    estalo.current = estaloVinil()

    em(ROTEIRO.titulo, () => setTitulo(true))
    em(ROTEIRO.titulo + 5200, () => setTitulo(false))

    // o rádio liga sozinho e sai procurando frequência por cima do vinil
    let giro: ReturnType<typeof setInterval> | undefined
    em(ROTEIRO.radio, () => {
      setFase("radio")
      clique()
      vibrar(12)
      player.volume(0.22)
      estalo.current?.volume(0.05)
      chiado.current = estatica()
      chiado.current?.volume(0.1)
      const t0 = Date.now()
      giro = setInterval(() => {
        const k = (Date.now() - t0) / 1000
        // varre o dial pra frente e pra trás, cada vez mais perto do 222
        const alvo = 222 - Math.max(0, 6 - k) * 18 * Math.abs(Math.sin(k * 1.3))
        const f = alvo + (Math.random() - 0.5) * 3
        chiado.current?.sintonizar(500 + 2600 * Math.abs(Math.sin(k * 5)))
        setDial({ f: f.toFixed(1), txt: "procurando sinal…" })
      }, 90)
    })
    // a agulha levanta: só o chiado
    em(ROTEIRO.agulha, () => {
      player.volume(0)
      player.pausar()
      estalo.current?.parar()
      estalo.current = null
    })
    // quase: o dial trava no 222, o chiado abre um pouco… e não pega
    em(ROTEIRO.quase, () => {
      clearInterval(giro)
      setFase("quase")
      setDial({ f: "222.0", txt: "sinal fraco" })
      chiado.current?.sintonizar(1200)
      chiado.current?.volume(0.16)
    })
    // quem entra na frequência é o Núcleo
    em(ROTEIRO.anuncio1, () => {
      setFase("anuncio")
      chiadoCurto()
      jingle()
      chiado.current?.volume(0.03)
      setDial({ f: "NÚCLEO", txt: "frequência otimizada ✓" })
      setBarra("a 222 fm não está disponível na sua região ✓")
      novo(1)
    })
    // vários, e o chiado por baixo
    em(ROTEIRO.anuncio2, () => {
      setFase("invadindo")
      jingle()
      chiado.current?.volume(0.06)
      setBarra("otimizando sua experiência sonora ✓")
      novo(2, true)
    })
    for (let i = 1; i <= 8; i++) em(ROTEIRO.anuncio2 + i * 560 - i * i * 18, () => novo(1, true))
    // CONTEÚDO REMOVIDO: a 222 sai do ar, a cor sai, a Kombi encosta
    em(ROTEIRO.corta, () => {
      setFase("cortou")
      jingle(true)
      chiado.current?.volume(0)
      setBarra(null)
      setDial(null)
      vibrar([60, 40, 160])
      cbs.current.onCinza()
      cbs.current.onParar()
      track("mission_step", { mission_id: "linha-chegada", step: "nucleo:cortou", perfil: "?", fio_pos: -1 })
    })
    em(ROTEIRO.corta + 900, () => { chiado.current?.parar(); chiado.current = null })
    em(ROTEIRO.limpa, () => { setFase("silencio"); setAnuncios([]) })
    // no silêncio, o celular vibra
    em(ROTEIRO.vibra, () => {
      setFase("vibra")
      gota(3)
      vibrar([30, 60, 30])
    })
    em(ROTEIRO.vibra + 900, () => cbs.current.onAbrir())
    return () => {
      ts.forEach(clearTimeout)
      clearInterval(giro)
      chiado.current?.parar()
      chiado.current = null
      estalo.current?.parar()
      estalo.current = null
    }
  }, [vinil])

  // pular a abertura (quem já viu): corta direto pro silêncio com a mensagem
  const pular = () => {
    player.volume(0)
    player.pausar()
    chiado.current?.parar()
    chiado.current = null
    estalo.current?.parar()
    estalo.current = null
    setAnuncios([])
    setBarra(null)
    setDial(null)
    setTitulo(false)
    cbs.current.onCinza()
    cbs.current.onParar()
    setFase("vibra")
    track("mission_step", { mission_id: "linha-chegada", step: "pulou", perfil: "?", fio_pos: -1 })
    setTimeout(() => cbs.current.onAbrir(), 900)
  }

  return (
    <div className={`l-chegada-cine is-${fase}`}>
      <div className="l-tarja is-cima" />
      <div className="l-tarja is-baixo" />

      {titulo && (
        <div className="l-chegada-titulo">
          <small>222.0 FM · linha 9</small>
          <b>cidade neon</b>
          <span>a cidade tá alagada de neon</span>
        </div>
      )}

      {fase === "vinil" && (
        <div className="l-vinil">
          <i aria-hidden />
          <div>
            <small>no toca-discos</small>
            <b>{vinil.titulo.split(" · ")[0]}</b>
            <span>{vinil.titulo.split(" · ")[1]}</span>
          </div>
        </div>
      )}

      {dial && (
        <div key={dial.f === "NÚCLEO" ? "n" : "r"} className={`l-dial ${fase === "quase" ? "is-quase" : ""} ${dial.f === "NÚCLEO" ? "is-nucleo" : ""}`}>
          <b>{dial.f}{dial.f !== "NÚCLEO" && <em> FM</em>}</b>
          <span>{dial.txt}</span>
        </div>
      )}

      {(fase === "radio" || fase === "anuncio" || fase === "invadindo" || fase === "cortou") && <div className="l-chegada-glitch" />}

      {anuncios.map((a) => (
        <div key={a.k} className="l-anuncio" style={{ left: `${a.x}%`, top: `${a.y}%`, transform: `rotate(${a.r}deg)` }}>
          <header><b>{a.t}</b><span>anúncio</span></header>
          <p>{a.m}</p>
          <div className="l-anuncio-pular">pular em {(a.k % 4) + 3}s</div>
        </div>
      ))}

      {barra && (
        <div className="l-anuncio-barra">
          <span>NÚCLEO</span>
          {barra}
        </div>
      )}

      {fase === "cortou" && (
        <div className="l-chegada-removido">
          <b>CONTEÚDO REMOVIDO ✓</b>
          <p>a 222 fm viola as diretrizes da cidade.</p>
          <small>obrigado por não sentir.</small>
        </div>
      )}

      {fase !== "vibra" && (
        <button type="button" className="l-chegada-pular" onClick={pular}>pular ›</button>
      )}
    </div>
  )
}
