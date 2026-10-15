"use client"

// O FLIPERAMA RETRÔ (CN-26): um lugar de verdade na cidade, onde os clássicos
// voltam com a cara dela. Cada máquina custa uma ficha de NEON e guarda o
// recorde. Ainda solto da cidade: abre depois de Rollercoaster.

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sairDaPagina } from "../linha/paginas"
import { Cobra } from "./cobra"
import { Invasores } from "./invasores"
import { Linha9 } from "./linha9"
import { Pingue } from "./pingue"
import { Quebra } from "./quebra"
import { Predio } from "./predio"
import { Atravessa } from "./atravessa"
import { ac, ficha } from "./oito"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"
import "./fliperama.css"

type Maquina = "linha9" | "cobra" | "invasores" | "pingue" | "quebra" | "predio" | "atravessa"
const MAQUINAS: { id: Maquina; nome: string; desc: string; cor: string }[] = [
  { id: "linha9", nome: "LINHA 9", desc: "o mapa do metrô · fuja dos agentes", cor: "#2fe8ff" },
  { id: "cobra", nome: "KOMBI COBRA", desc: "o bloco que cresce atrás da Kombi", cor: "#ff3fb0" },
  { id: "invasores", nome: "INVASORES", desc: "os outdoors do Núcleo descendo · atire notas", cor: "#5dffa0" },
  { id: "pingue", nome: "PINGUE", desc: "dois DJs trocando a bola · cada rebatida é uma batida", cor: "#b38cff" },
  { id: "quebra", nome: "QUEBRA-NEON", desc: "quebra o letreiro do Núcleo, letra por letra", cor: "#ffc857" },
  { id: "predio", nome: "PRÉDIO", desc: "os andares de um prédio do centro · fecha o andar", cor: "#3d7bff" },
  { id: "atravessa", nome: "ATRAVESSA", desc: "a avenida e a Linha 9 com o violão nas costas", cor: "#5dffa0" },
]
const CHAVE = "cn-fliperama"
const FICHA = 1

export default function Fliperama() {
  const router = useRouter()
  const [jogando, setJogando] = useState<Maquina | null>(null)
  const [neon, setNeon] = useState(0)
  const [rec, setRec] = useState<Record<string, number>>({})
  const [msg, setMsg] = useState("")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeon(saldoInicial())
    try { setRec(JSON.parse(localStorage.getItem(CHAVE) || "{}")) } catch {}
  }, [])

  const jogar = async (m: Maquina) => {
    ac()
    const r = await mudarNeon(-FICHA)
    if (!r.ok) { setMsg("sem neon pra ficha"); setTimeout(() => setMsg(""), 2500); return }
    setNeon(r.neon); ficha(); setJogando(m)
  }
  const fim = useCallback((pontos: number) => {
    setRec((antes) => {
      const id = jogando!, novo = pontos > (antes[id] ?? 0)
      const r = novo ? { ...antes, [id]: pontos } : antes
      try { localStorage.setItem(CHAVE, JSON.stringify(r)) } catch {}
      setMsg(novo ? `recorde da cidade: ${pontos}` : `${pontos} pontos`)
      return r
    })
    setJogando(null)
    setTimeout(() => setMsg(""), 3500)
  }, [jogando])

  if (jogando === "cobra") return <div className="fp-raiz"><Cobra onFim={fim} /></div>
  if (jogando === "pingue") return <div className="fp-raiz"><Pingue onFim={fim} /></div>
  if (jogando === "quebra") return <div className="fp-raiz"><Quebra onFim={fim} /></div>
  if (jogando === "invasores") return <div className="fp-raiz"><Invasores onFim={fim} /></div>
  if (jogando === "linha9") return <div className="fp-raiz"><Linha9 onFim={fim} /></div>
  if (jogando === "predio") return <div className="fp-raiz"><Predio onFim={fim} /></div>
  if (jogando === "atravessa") return <div className="fp-raiz"><Atravessa onFim={fim} /></div>

  return (
    <div className="fp-raiz">
      <section className="fp-menu">
        <header>
          <button type="button" onClick={() => sairDaPagina(router.push)}>‹ sair</button>
          <span>{neon} <small>neon$</small></span>
        </header>
        <h1>FLIPERAMA</h1>
        <p className="fp-sub">uma ficha = {FICHA} neon</p>
        {MAQUINAS.map((m) => (
          <button key={m.id} type="button" className="fp-maquina" style={{ ["--cor" as string]: m.cor }} onClick={() => void jogar(m.id)}>
            <b>{m.nome}</b><small>{m.desc}</small><em>recorde: {rec[m.id] ?? 0}</em>
          </button>
        ))}
        {msg && <p className="fp-msg">{msg}</p>}
      </section>
    </div>
  )
}
