"use client"

// O GINÁSIO (CN-15, o dia da Cidade Neon): basquete e pingue-pongue. Paga um
// pouco de NEON (a moeda do jogo, no mesmo saldo). Ainda não está ligado à
// cidade: vira um lugar do dia (com a missão de desbravar, falas do LU2CA).

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { sairDaPagina } from "../linha/paginas"
import { Cadeado, Trancado, lerTranca } from "../linha/Trancado"
import { Basquete } from "./basquete"
import { Cama } from "./cama"
import { PingPong } from "./pingpong"
import { ac } from "./sons"
import { mudarNeon, saldoInicial } from "../neon-tiles/neon"
import "./ginasio.css"

type Tela = "menu" | "basquete" | "pingpong" | "cama"
const CHAVE = "cn-ginasio"

export default function Ginasio() {
  const router = useRouter()
  const [tela, setTela] = useState<Tela>("menu")
  const [neon, setNeon] = useState(0)
  const [rec, setRec] = useState({ cestas: 0, vitorias: 0, cama: 0 })
  const [msg, setMsg] = useState("")
  // (vitrine, 02/11) entrou com o ginásio ainda trancado: vê a quadra, com o cadeado
  const [tranca, setTranca] = useState<string | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeon(saldoInicial())
    setTranca(lerTranca())
    try { setRec({ cestas: 0, vitorias: 0, cama: 0, ...JSON.parse(localStorage.getItem(CHAVE) || "{}") }) } catch {}
  }, [])
  const guardar = (r: typeof rec) => { setRec(r); try { localStorage.setItem(CHAVE, JSON.stringify(r)) } catch {} }
  const pagar = async (n: number, texto: string) => {
    if (n > 0) { const r = await mudarNeon(n); setNeon(r.neon) }
    setMsg(n > 0 ? `${texto} · +${n} Água$` : texto)
    setTimeout(() => setMsg(""), 3500)
  }

  const trancou = () => { if (!tranca) return; setMsg(tranca); setTimeout(() => setMsg(""), 2500) }

  if (tela === "basquete") return <div className="gi-raiz"><Basquete onFim={(p, c) => { setTela("menu"); guardar({ ...rec, cestas: Math.max(rec.cestas, p) }); void pagar(Math.floor(p / 6), p > rec.cestas && p > 0 ? `recorde: ${p} pontos (${c} cestas)` : `${p} pontos · ${c} cestas`) }} /></div>
  if (tela === "pingpong") return <div className="gi-raiz"><PingPong onFim={(v, p) => { setTela("menu"); if (v) guardar({ ...rec, vitorias: rec.vitorias + 1 }); void pagar(v ? 6 : 1, v ? `ganhou de ${p[0]} a ${p[1]}` : `perdeu de ${p[1]} a ${p[0]}`) }} /></div>

  if (tela === "cama") return <div className="gi-raiz"><Cama onFim={(p) => { setTela("menu"); guardar({ ...rec, cama: Math.max(rec.cama, p) }); void pagar(Math.floor(p / 20), p > rec.cama && p > 0 ? `recorde: ${p} pontos` : `${p} pontos`) }} /></div>

  return (
    <div className="gi-raiz">
      <section className="gi-menu">
        <header>
          <button type="button" onClick={() => sairDaPagina(router.push)}>‹ sair</button>
          <span>{neon} <small>Água$</small></span>
        </header>
        <h1>GINÁSIO</h1>
        <p className="gi-sub">de dia · com o Alohan</p>
        {tranca && <Trancado texto={tranca} />}
        <button type="button" className={`gi-card is-basquete${tranca ? " cn-card-trancado" : ""}`} onClick={() => { if (tranca) return trancou(); ac(); setTela("basquete") }} aria-disabled={!!tranca}>
          <b>{tranca && <Cadeado />}basquete</b><small>60 segundos · recorde: {rec.cestas} pontos</small><em>1 neon a cada 6 pontos</em>
        </button>
        <button type="button" className={`gi-card is-pingue${tranca ? " cn-card-trancado" : ""}`} onClick={() => { if (tranca) return trancou(); ac(); setTela("pingpong") }} aria-disabled={!!tranca}>
          <b>{tranca && <Cadeado />}pingue-pongue</b><small>até 7 · {rec.vitorias} vitórias</small><em>ganhou: 6 de Água$</em>
        </button>
        <button type="button" className={`gi-card is-cama${tranca ? " cn-card-trancado" : ""}`} onClick={() => { if (tranca) return trancou(); ac(); setTela("cama") }} aria-disabled={!!tranca}>
          <b>{tranca && <Cadeado />}ginástica</b><small>60 segundos · recorde: {rec.cama} pontos</small><em>1 neon a cada 20 pontos</em>
        </button>
        {msg && <p className="gi-msg">{msg}</p>}
      </section>
    </div>
  )
}
