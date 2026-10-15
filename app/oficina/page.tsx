"use client"

// A OFICINA (no subúrbio, um lugar-página): a Kombi no elevador, girando
// devagar sob a luz fria. Escolhe a pintura e o neon de baixo (CarX / Drift
// Max: personalizar o carro); o que você compra fica seu pra trocar de graça.
// Ao sair, a estrada já mostra a Kombi nova.

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sairDaPagina } from "../linha/paginas"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"
import { NEONS, PINTURAS, corNeon, corPintura, guardarEstilo, lerEstilo, type Estilo } from "./estilo"
import "./oficina.css"

const Elevador = dynamic(() => import("./Elevador").then((m) => m.Elevador), { ssr: false })

export default function Oficina() {
  const router = useRouter()
  const [estilo, setEstilo] = useState<Estilo | null>(null)
  const [neon, setNeon] = useState(0)
  const [msg, setMsg] = useState("")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstilo(lerEstilo()); setNeon(saldoInicial())
  }, [])
  const dizer = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2600) }
  const escolher = async (tipo: "pintura" | "neon", id: string, preco: number) => {
    if (!estilo) return
    const chave = `${tipo}:${id}`
    let comprados = estilo.comprados
    if (!comprados.includes(chave)) {
      const r = await mudarNeon(-preco)
      if (!r.ok) { dizer(`falta neon (${preco})`); return }
      setNeon(r.neon); comprados = [...comprados, chave]; dizer(`comprado · −${preco} neon`)
    }
    const novo = { ...estilo, [tipo]: id, comprados }
    setEstilo(novo); guardarEstilo(novo)
  }
  return (
    <div className="of-raiz">
      {estilo && <Elevador tinta={corPintura(estilo)} neon={corNeon(estilo)} />}
      <header className="of-topo">
        <button type="button" onClick={() => sairDaPagina(router.push)}>‹ sair</button>
        <b>OFICINA</b>
        <span>{neon} <small>neon$</small></span>
      </header>
      {estilo && (
        <section className="of-painel">
          <p className="of-rotulo">a pintura</p>
          <div className="of-cores">
            {PINTURAS.map((p) => {
              const tem = estilo.comprados.includes(`pintura:${p.id}`)
              return (
                <button key={p.id} type="button" className={estilo.pintura === p.id ? "is-on" : ""} onClick={() => void escolher("pintura", p.id, p.preco)}>
                  <i style={{ background: p.cor }} /><small>{p.nome}</small><em>{tem ? "seu" : `${p.preco}`}</em>
                </button>
              )
            })}
          </div>
          <p className="of-rotulo">o neon de baixo</p>
          <div className="of-cores">
            {NEONS.map((p) => {
              const tem = estilo.comprados.includes(`neon:${p.id}`)
              return (
                <button key={p.id} type="button" className={estilo.neon === p.id ? "is-on" : ""} onClick={() => void escolher("neon", p.id, p.preco)}>
                  <i style={{ background: p.cor, boxShadow: `0 0 12px ${p.cor}` }} /><small>{p.nome}</small><em>{tem ? "seu" : `${p.preco}`}</em>
                </button>
              )
            })}
          </div>
          {msg && <p className="of-msg">{msg}</p>}
        </section>
      )}
    </div>
  )
}
