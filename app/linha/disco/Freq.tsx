"use client"

// O FR3Q_ COM A CARA DO UNTITLED (LU2CA 20/10, o print da página dele): fundo
// grafite, a grade de capas quadradas arredondadas com o play quadrado escuro
// no canto, o título e "LU2CA" embaixo, e a barra de player flutuante (a capa
// redonda, faixa e projeto, a onda com a posição, o tempo, os controles e o
// "+"). Os 6 projetos da página dele, na mesma ordem.
// A página do untitled não abre dentro de outra (e não deixa ler as faixas):
// os projetos que o jogo já tem no repo tocam aqui; os outros abrem lá fora.

import { useEffect, useMemo, useRef, useState } from "react"
import { FREQUENCIAS } from "../radio"
import { PISTAS } from "../estrada/pistas"

type Faixa = { titulo: string; src: string; dur?: number }
type Projeto = { id: string; nome: string; capa: string; faixas: Faixa[] }

const FORA = "https://untitled.stream/invite/CPq7Z1J2Og32UEDsFfK9k"
const ORDEM_VOL1 = ["nectar", "dopamina", "copo", "ojala", "swav", "sexta", "ontem", "rollercoaster", "chuva"]
const fr = (id: string) => FREQUENCIAS.find((f) => f.id === id)?.faixas ?? []
const PROJETOS: Projeto[] = [
  // o Vol.1: as 9 faixas (as que ainda não saíram tocam o instrumental: a voz entra no lançamento)
  { id: "vol1", nome: "cidade neon vol.1", capa: "/capas/untitled/cidade-neon-vol1.jpg", faixas: ORDEM_VOL1.map((id) => PISTAS.find((p) => p.id === id)!).map((p) => ({ titulo: p.voz ? p.faixa : `${p.faixa} · inst`, src: p.voz ?? p.inst, dur: p.duracao })) },
  { id: "vol2", nome: "cidade neon vol.2", capa: "/capas/untitled/cidade-neon-vol2.jpg", faixas: [] },
  { id: "cn", nome: "CIDADE NEON", capa: "/capas/untitled/cidade-neon.jpg", faixas: [] },
  { id: "live", nome: "cidadeneon.live", capa: "/capas/untitled/cidadeneon-live.jpg", faixas: fr("live") },
  { id: "xenom", nome: "SUBÚRBIO XENOM", capa: "/capas/untitled/suburbio-xenom.jpg", faixas: fr("suburbio") },
  { id: "crypto", nome: "cidadeneon.crypto", capa: "/capas/untitled/cidadeneon-crypto.jpg", faixas: fr("crypto") },
]
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
// a onda: barras fixas tiradas do nome da faixa (sem decodificar o áudio)
const onda = (nome: string) => Array.from({ length: 64 }, (_, i) => { const s = Math.sin((i + 1) * 12.9898 + nome.length * 78.233 + nome.charCodeAt(i % nome.length)) * 43758.5453; return 0.25 + 0.75 * Math.abs(s - Math.floor(s) - 0.5) * 2 })

export function Freq() {
  const [tocando, setTocando] = useState<{ p: number; f: number } | null>(null)
  const [play, setPlay] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [aleatorio, setAleatorio] = useState(false)
  const [repete, setRepete] = useState(false)
  const [vol, setVol] = useState(0.9)
  const audio = useRef<HTMLAudioElement | null>(null)
  const atual = tocando ? PROJETOS[tocando.p] : null
  const faixa = atual && tocando ? atual.faixas[tocando.f] : null
  const barras = useMemo(() => onda(faixa?.titulo ?? "fr3q"), [faixa?.titulo])
  const proxima = (d: 1 | -1) => {
    if (!tocando || !atual) return
    const n = atual.faixas.length
    const f = aleatorio ? Math.floor(Math.random() * n) : (tocando.f + d + n) % n
    setTocando({ p: tocando.p, f })
  }
  const proxRef = useRef(proxima)
  useEffect(() => { proxRef.current = proxima })
  useEffect(() => {
    if (!faixa) return
    const a = audio.current ?? (audio.current = new Audio())
    a.src = faixa.src
    a.volume = vol
    void a.play().then(() => setPlay(true)).catch(() => setPlay(false))
    const tu = () => { setT(a.currentTime); setDur(a.duration || faixa.dur || 0) }
    const fim = () => { if (repete) { a.currentTime = 0; void a.play() } else proxRef.current(1) }
    a.addEventListener("timeupdate", tu); a.addEventListener("ended", fim)
    return () => { a.removeEventListener("timeupdate", tu); a.removeEventListener("ended", fim) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faixa?.src])
  useEffect(() => { if (audio.current) audio.current.volume = vol }, [vol])
  useEffect(() => () => { audio.current?.pause() }, [])
  const abrir = (p: number) => {
    if (!PROJETOS[p].faixas.length) { window.open(FORA, "_blank", "noreferrer"); return }
    setTocando({ p, f: 0 })
  }
  const alternar = () => {
    const a = audio.current
    if (!a || !faixa) { abrir(0); return }
    if (a.paused) { void a.play(); setPlay(true) } else { a.pause(); setPlay(false) }
  }
  const pos = dur ? t / dur : 0
  return (
    <div className="l-freq">
      <div className="l-freq-grade">
        {PROJETOS.map((p, i) => (
          <button key={p.id} type="button" className={`l-freq-proj ${tocando?.p === i ? "is-aqui" : ""}`} onClick={() => abrir(i)}>
            <span className="l-freq-capa" style={{ backgroundImage: `url(${p.capa})` }}>
              <i className="l-freq-play" aria-hidden="true">{tocando?.p === i && play ? "❚❚" : "▶"}</i>
            </span>
            <b>{p.nome}</b>
            <small>LU2CA{p.faixas.length ? "" : " · no untitled ↗"}</small>
          </button>
        ))}
      </div>
      <div className="l-freq-player">
        <span className="l-freq-mini" style={atual ? { backgroundImage: `url(${atual.capa})` } : undefined} />
        <span className="l-freq-nome"><b>{faixa?.titulo ?? "escolhe um projeto"}</b><small>{atual?.nome ?? "LU2CA"}</small></span>
        <span className="l-freq-onda" onClick={(e) => { const a = audio.current; if (!a || !dur) return; const r = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * dur }}>
          {barras.map((h, i) => <i key={i} className={i / barras.length < pos ? "is-tocou" : ""} style={{ height: `${h * 100}%` }} />)}
        </span>
        <small className="l-freq-tempo">{mmss(t)} / {mmss(dur || faixa?.dur || 0)}</small>
        <span className="l-freq-ctrl">
          <button type="button" className={aleatorio ? "is-on" : ""} onClick={() => setAleatorio((x) => !x)} aria-label="aleatório">⤮</button>
          <button type="button" onClick={() => proxima(-1)} aria-label="voltar">⏮</button>
          <button type="button" className="is-play" onClick={alternar} aria-label={play ? "pausar" : "tocar"}>{play ? "❚❚" : "▶"}</button>
          <button type="button" onClick={() => proxima(1)} aria-label="avançar">⏭</button>
          <button type="button" className={repete ? "is-on" : ""} onClick={() => setRepete((x) => !x)} aria-label="repetir">↻</button>
          <input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(+e.target.value)} aria-label="volume" />
        </span>
        <a className="l-freq-mais" href={FORA} target="_blank" rel="noreferrer" aria-label="no untitled">+</a>
      </div>
    </div>
  )
}
