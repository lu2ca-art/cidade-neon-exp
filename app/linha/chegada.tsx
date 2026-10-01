"use client"

// A CHEGADA NA CIDADE — a primeira vez. Nada de celular: você já está na
// Kombi, rodando de boa pela cidade neon com a 222 tocando. Aí o Núcleo
// começa a meter anúncio por cima da música, cada vez mais, até tirar ela do
// ar. A cidade perde a cor, a Kombi encosta e estaciona. No silêncio, o
// celular vibra: alguém no N3XO. É a D-Bee.
//
// A Kombi (Corrida em modo cinema) fica por baixo; isso aqui é só a camada
// de cima: tarjas de cinema, os anúncios e a notificação. Os tempos ficam
// todos em ROTEIRO pra dar pra afinar o ritmo num lugar só.

import { useEffect, useRef, useState } from "react"
import { audioCtx, chiadoCurto, estatica, gota, player } from "./som"
import { track } from "@/lib/analytics"

// ms depois de entrar
const ROTEIRO = {
  titulo: 1200, // "cidade neon" aparece nas tarjas
  anuncio1: 10000, // 1º anúncio: abaixa a música
  volta1: 14500, // a música volta (achou que tinha passado)
  anuncio2: 18500, // vários anúncios, a música quase some
  corta: 23500, // CONTEÚDO REMOVIDO: a música sai, a cor sai, a Kombi encosta
  limpa: 26500, // os anúncios somem — sobra a cidade cinza e a chuva
  vibra: 30500, // o celular vibra: N3XO
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
  const [fase, setFase] = useState<"rodando" | "anuncio" | "volta" | "invadindo" | "cortou" | "silencio" | "vibra">("rodando")
  const [titulo, setTitulo] = useState(false)
  const [anuncios, setAnuncios] = useState<Anuncio[]>([])
  const [barra, setBarra] = useState<string | null>(null)
  const prox = useRef(0)
  const chiado = useRef<ReturnType<typeof estatica>>(null)
  const cbs = useRef({ onParar, onCinza })
  useEffect(() => { cbs.current = { onParar, onCinza } }, [onParar, onCinza])

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

    em(ROTEIRO.titulo, () => setTitulo(true))
    em(ROTEIRO.titulo + 5200, () => setTitulo(false))

    // 1º: um anúncio só, educado. A música abaixa.
    em(ROTEIRO.anuncio1, () => {
      setFase("anuncio")
      chiadoCurto()
      jingle()
      player.volume(0.18)
      setBarra("a 222 fm será retomada após os anúncios ✓")
      novo(1)
    })
    // a música volta. parecia que tinha passado
    em(ROTEIRO.volta1, () => {
      setFase("volta")
      setAnuncios([])
      setBarra(null)
      player.volume(1)
    })
    // 2º: agora vem vários, e a música quase some no chiado
    em(ROTEIRO.anuncio2, () => {
      setFase("invadindo")
      jingle()
      player.volume(0.08)
      chiado.current = estatica()
      chiado.current?.volume(0.06)
      setBarra("otimizando sua experiência sonora ✓")
      novo(2, true)
    })
    for (let i = 1; i <= 8; i++) em(ROTEIRO.anuncio2 + i * 560 - i * i * 18, () => novo(1, true))
    // CONTEÚDO REMOVIDO: a 222 sai do ar, a cor sai, a Kombi encosta
    em(ROTEIRO.corta, () => {
      setFase("cortou")
      jingle(true)
      player.volume(0)
      player.pausar()
      chiado.current?.volume(0)
      setBarra(null)
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
    em(ROTEIRO.vibra + 1600, () => { gota(5); vibrar(14) })
    return () => {
      ts.forEach(clearTimeout)
      chiado.current?.parar()
      chiado.current = null
    }
  }, [])

  // pular a abertura (quem já viu): corta direto pro silêncio com a mensagem
  const pular = () => {
    player.volume(0)
    player.pausar()
    chiado.current?.parar()
    chiado.current = null
    setAnuncios([])
    setBarra(null)
    setTitulo(false)
    cbs.current.onCinza()
    cbs.current.onParar()
    setFase("vibra")
    track("mission_step", { mission_id: "linha-chegada", step: "pulou", perfil: "?", fio_pos: -1 })
  }

  const abrir = () => {
    track("mission_step", { mission_id: "linha-chegada", step: "abriu-n3xo", perfil: "?", fio_pos: -1 })
    onAbrir()
  }

  return (
    <div className={`l-chegada-cine is-${fase}`}>
      <div className="l-tarja is-cima" />
      <div className="l-tarja is-baixo" />

      {titulo && (
        <div className="l-chegada-titulo">
          <small>222.0 FM · linha 222</small>
          <b>cidade neon</b>
          <span>a cidade tá alagada de neon</span>
        </div>
      )}

      {(fase === "anuncio" || fase === "invadindo" || fase === "cortou") && <div className="l-chegada-glitch" />}

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

      {fase === "vibra" && (
        <div className="l-chegada-cel">
          <button type="button" className="l-notif is-chave" style={{ ["--cor" as string]: "#2fe8ff" }} onClick={abrir}>
            <small>N3XO · [desconhecido] · agora</small>
            <span>sabe ontem?</span>
          </button>
          <p className="l-bloqueio-dica">toca na mensagem</p>
        </div>
      )}

      {fase !== "vibra" && (
        <button type="button" className="l-chegada-pular" onClick={pular}>pular ›</button>
      )}
    </div>
  )
}
