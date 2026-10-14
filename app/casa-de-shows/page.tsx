"use client"

// A CASA DE SHOWS (LU2CA 14/10): sempre tem show rolando, de noite, de um dos
// amigos da 222 (um por noite, entre os que você já conhece). O público é a
// popularidade da 222 — não é do LU2CA nem de quem joga: é o quanto a cidade
// conhece a rádio. Começa com umas 3 pessoas e vai até a pista cheia.
// A música só toca se a faixa já saiu (a regra do T-21).

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ESTACOES, lancada } from "../linha/data"
import { sairDaPagina } from "../linha/paginas"
import type { Atracao } from "./Show"
import "./shows.css"

const Show = dynamic(() => import("./Show").then((m) => m.Show), { ssr: false })

// o andamento de cada faixa (lido das stems, LU2CA 13/10)
const BPM: Record<string, number> = { chuva: 79, copo: 157, dopamina: 125, sexta: 173, ontem: 196, nectar: 79, ojala: 118, swav: 135, rollercoaster: 102 }

function quemToca(objetos: string[], dia: number) {
  const lancadas = ESTACOES.filter((e) => lancada(e))
  // os amigos que você já conhece; sem nenhum ainda, quem já lançou
  const conhecidos = lancadas.filter((e) => objetos.includes(e.id))
  const lista = conhecidos.length ? conhecidos : lancadas
  return lista[dia % lista.length] ?? ESTACOES[0]
}

export default function CasaDeShows() {
  const router = useRouter()
  const [info, setInfo] = useState<{ atracao: Atracao; audio: string; pop: number } | null>(null)
  const [tocando, setTocando] = useState(false)
  const som = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    let s: { popularidade?: number; objetos?: string[]; dia?: number } = {}
    try { s = JSON.parse(localStorage.getItem("cn-linha-222") || "{}") } catch {}
    const e = quemToca(s.objetos ?? [], s.dia ?? 1)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfo({ atracao: { nome: e.personagem, faixa: e.faixa, cor: e.cor, bpm: BPM[e.id] ?? 110 }, audio: e.audio, pop: Math.max(0, Math.min(100, s.popularidade ?? 0)) })
  }, [])
  // a música: tenta tocar sozinha (veio de um toque na cidade); senão, um botão
  useEffect(() => {
    if (!info) return
    const a = new Audio(info.audio)
    a.loop = true; a.volume = 0.8
    som.current = a
    a.play().then(() => setTocando(true)).catch(() => setTocando(false))
    return () => { a.pause(); som.current = null }
  }, [info])
  if (!info) return <div className="sh-raiz" />
  const publico = Math.max(3, Math.min(90, Math.round(3 + info.pop * 0.87)))
  return (
    <div className="sh-raiz">
      <Show atracao={info.atracao} popularidade={info.pop} />
      <header className="sh-topo">
        <button type="button" onClick={() => sairDaPagina(router.push)}>‹ sair</button>
        <span>hoje na casa de shows</span>
      </header>
      <div className="sh-cartaz" style={{ ["--cor" as string]: info.atracao.cor }}>
        <b>{info.atracao.nome}</b>
        <small>{info.atracao.faixa}</small>
        <em>{publico} {publico === 1 ? "pessoa" : "pessoas"} na pista · a 222 em {Math.round(info.pop)}%</em>
      </div>
      {!tocando && <button type="button" className="sh-som" onClick={() => som.current?.play().then(() => setTocando(true)).catch(() => {})}>ligar o som</button>}
    </div>
  )
}
