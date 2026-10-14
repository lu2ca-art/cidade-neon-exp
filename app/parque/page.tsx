"use client"

// O PARQUE DE DIVERSÕES (CN-19, protótipo do ep. 5): a montanha-russa em
// primeira pessoa e o resto do parque à volta. Paga NEON no mesmo saldo do
// jogo. Ainda não está ligado à cidade: abre depois de Rollercoaster.

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ac } from "./sons"
import type { Volta } from "./montanha"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"
import "./parque.css"

const Montanha = dynamic(() => import("./montanha").then((m) => m.Montanha), { ssr: false })

const CHAVE = "cn-parque"

export default function Parque() {
  const router = useRouter()
  const [tela, setTela] = useState<"menu" | "montanha">("menu")
  const [neon, setNeon] = useState(0)
  const [rec, setRec] = useState({ voltas: 0, velMax: 0 })
  const [ultima, setUltima] = useState<{ v: Volta; ganho: number } | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeon(saldoInicial())
    try { setRec({ voltas: 0, velMax: 0, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") }) } catch {}
  }, [])

  const fim = async (v: Volta) => {
    const ganho = 2 + (v.bracos >= 0.9 ? 4 : 0)
    const r = { voltas: rec.voltas + 1, velMax: Math.max(rec.velMax, v.velMax) }
    setRec(r)
    try { localStorage.setItem(CHAVE, JSON.stringify(r)) } catch {}
    setUltima({ v, ganho })
    const n = await mudarNeon(ganho)
    setNeon(n.neon)
    setTimeout(() => setTela("menu"), 1800)
  }

  if (tela === "montanha") return <div className="pq-raiz"><Montanha onFim={(v) => void fim(v)} onSair={() => setTela("menu")} /></div>

  return (
    <div className="pq-raiz">
      <section className="pq-menu">
        <header>
          <button type="button" onClick={() => router.push("/?screen=home")}>‹ sair</button>
          <span>{neon} <small>neon$</small></span>
        </header>
        <h1>PARQUE</h1>
        <p className="pq-sub">de noite · a roda-gigante acesa</p>
        {ultima && (
          <div className="pq-foto">
            <b>{ultima.v.bracos >= 0.9 ? "a foto da descida: braços pra cima" : "a foto da descida"}</b>
            <small>{Math.round(ultima.v.velMax * 3.6)} km/h · {ultima.v.gMax.toFixed(1)} g · +{ultima.ganho} neon</small>
          </div>
        )}
        <button type="button" className="pq-card is-montanha" onClick={() => { ac(); setUltima(null); setTela("montanha") }}>
          <b>montanha-russa</b><small>{rec.voltas} voltas · recorde: {Math.round(rec.velMax * 3.6)} km/h</small><em>2 neon · braços pra cima na descida: +4</em>
        </button>
        <button type="button" className="pq-card is-trancado" disabled><b>roda-gigante</b><small>em breve</small></button>
        <button type="button" className="pq-card is-trancado" disabled><b>fliperama</b><small>em breve</small></button>
      </section>
    </div>
  )
}
