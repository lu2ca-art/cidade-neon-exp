"use client"

// O GINÁSIO (CN-15, o dia da Cidade Neon): basquete e pingue-pongue. Paga um
// pouco de NEON (a moeda do jogo, no mesmo saldo). Ainda não está ligado à
// cidade: vira um lugar do dia (com a missão de desbravar, falas do LU2CA).

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Basquete } from "./basquete"
import { PingPong } from "./pingpong"
import { ac } from "./sons"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"
import "./ginasio.css"

type Tela = "menu" | "basquete" | "pingpong"
const CHAVE = "cn-ginasio"

export default function Ginasio() {
  const router = useRouter()
  const [tela, setTela] = useState<Tela>("menu")
  const [neon, setNeon] = useState(0)
  const [rec, setRec] = useState({ cestas: 0, vitorias: 0 })
  const [msg, setMsg] = useState("")
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeon(saldoInicial())
    try { setRec({ cestas: 0, vitorias: 0, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") }) } catch {}
  }, [])
  const guardar = (r: typeof rec) => { setRec(r); try { localStorage.setItem(CHAVE, JSON.stringify(r)) } catch {} }
  const pagar = async (n: number, texto: string) => {
    if (n > 0) { const r = await mudarNeon(n); setNeon(r.neon) }
    setMsg(n > 0 ? `${texto} · +${n} neon` : texto)
    setTimeout(() => setMsg(""), 3500)
  }

  if (tela === "basquete") return <div className="gi-raiz"><Basquete onFim={(c) => { setTela("menu"); guardar({ ...rec, cestas: Math.max(rec.cestas, c) }); void pagar(Math.floor(c / 3), c > rec.cestas && c > 0 ? `recorde: ${c} cestas` : `${c} cestas`) }} /></div>
  if (tela === "pingpong") return <div className="gi-raiz"><PingPong onFim={(v, p) => { setTela("menu"); if (v) guardar({ ...rec, vitorias: rec.vitorias + 1 }); void pagar(v ? 6 : 1, v ? `ganhou de ${p[0]} a ${p[1]}` : `perdeu de ${p[1]} a ${p[0]}`) }} /></div>

  return (
    <div className="gi-raiz">
      <section className="gi-menu">
        <header>
          <button type="button" onClick={() => router.push("/?screen=home")}>‹ sair</button>
          <span>{neon} <small>neon$</small></span>
        </header>
        <h1>GINÁSIO</h1>
        <p className="gi-sub">de dia · a quadra tá livre</p>
        <button type="button" className="gi-card is-basquete" onClick={() => { ac(); setTela("basquete") }}>
          <b>basquete</b><small>60 segundos · recorde: {rec.cestas} cestas</small><em>1 neon a cada 3 cestas</em>
        </button>
        <button type="button" className="gi-card is-pingue" onClick={() => { ac(); setTela("pingpong") }}>
          <b>pingue-pongue</b><small>até 7 · {rec.vitorias} vitórias</small><em>ganhou: 6 neon</em>
        </button>
        <button type="button" className="gi-card is-trancado" disabled>
          <b>cama elástica</b><small>em breve</small>
        </button>
        {msg && <p className="gi-msg">{msg}</p>}
      </section>
    </div>
  )
}
