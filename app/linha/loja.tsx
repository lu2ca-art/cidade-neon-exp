"use client"

// A LOJA DE DISCOS (refeita em 05/10): um app do celular do jogo, não mais
// uma página à parte numa janela (a antiga guardava o progresso por fora e
// brigava com o jogo). Cada disco é um gênero, todos pelo mesmo preço em
// NEON. Dá pra ouvir um trecho antes. Comprou, vai pro toca-discos da Kombi.
// O acervo antigo não está à venda: ele já mora na Kombi.

import { useEffect, useRef, useState } from "react"
import { Capa } from "./capa"
import { DISCOS, PRECO_DISCO, duracao, type DiscoLoja } from "./discos"
import type { Save } from "./estado"
import { disco as toca, fonteSom } from "./som"
import { AppTopo } from "./os"
import { track } from "@/lib/analytics"

export function Loja({ save, comprar, onVoltar }: { save: Save; comprar: (id: string) => boolean; onVoltar: () => void }) {
  const [aberto, setAberto] = useState<DiscoLoja | null>(null)
  const neon = save.neon ?? 0
  const meus = save.discos ?? []
  return (
    <section className="l-loja">
      <AppTopo titulo="LOJA DE DISCOS" cor="#ffc857" onVoltar={onVoltar} />
      <header className="l-loja-cab">
        <div>
          <p>cada disco custa <b>{PRECO_DISCO} neon</b>. o que vc compra toca no toca-discos da kombi, do começo ao fim. os discos antigos já estão lá</p>
        </div>
        <span className="l-loja-saldo" aria-label={`${neon} neon`}><i aria-hidden="true">◎</i>{neon}<small>neon</small></span>
      </header>
      <ul className="l-loja-grade">
        {DISCOS.map((d) => {
          const tem = d.gratis || meus.includes(d.id)
          return (
            <li key={d.id}>
              <button type="button" onClick={() => setAberto(d)} className={tem ? "is-meu" : ""}>
                <Capa motivo={d.motivo} a={d.a} b={d.b} titulo={d.titulo} />
                <span className="l-loja-nome">{d.titulo}</span>
                <span className="l-loja-info">{d.faixas.length} faixas · {tem ? (d.gratis ? "grátis" : "na kombi ✓") : `${PRECO_DISCO} neon`}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {aberto && <Detalhe d={aberto} tem={!!aberto.gratis || meus.includes(aberto.id)} neon={neon} onComprar={() => comprar(aberto.id)} onFechar={() => setAberto(null)} />}
    </section>
  )
}

function Detalhe({ d, tem, neon, onComprar, onFechar }: { d: DiscoLoja; tem: boolean; neon: number; onComprar: () => boolean; onFechar: () => void }) {
  // o trecho: 25 s do meio da faixa, num tocador só da loja
  const audio = useRef<HTMLAudioElement | null>(null)
  const [ouvindo, setOuvindo] = useState<number | null>(null)
  const [comprou, setComprou] = useState(false)
  useEffect(() => () => { audio.current?.pause() }, [])
  const ouvir = (i: number) => {
    if (!audio.current) audio.current = new Audio()
    const el = audio.current
    if (ouvindo === i) { el.pause(); setOuvindo(null); return }
    // o toca-discos e a rádio param enquanto ouve o trecho
    toca.parar()
    el.src = d.faixas[i].src
    el.onloadedmetadata = () => { el.currentTime = Math.max(0, (el.duration || 60) * 0.3) }
    el.ontimeupdate = () => { if (el.currentTime > (el.duration || 60) * 0.3 + 25) { el.pause(); setOuvindo(null) } }
    el.onended = () => setOuvindo(null)
    el.play().catch(() => setOuvindo(null))
    setOuvindo(i)
  }
  const falta = PRECO_DISCO - neon
  const tocarAgora = () => {
    audio.current?.pause(); setOuvindo(null)
    fonteSom.set("disco")
    toca.tocarLista(d.faixas.map((f) => f.src))
    track("mission_step", { mission_id: "linha-loja", step: `tocar:${d.id}`, perfil: "?", fio_pos: -1 })
  }
  return (
    <div className="l-loja-detalhe" role="dialog" aria-label={d.titulo}>
      <button type="button" className="l-loja-fechar" onClick={() => { audio.current?.pause(); onFechar() }} aria-label="fechar">×</button>
      <div className="l-loja-capa-grande"><Capa motivo={d.motivo} a={d.a} b={d.b} titulo={d.titulo} size={240} /></div>
      <h2>{d.titulo}</h2>
      <p className="l-loja-sub">{d.faixas.length} faixas{d.gratis ? " · domínio público" : ""}</p>
      <div className="l-loja-acao">
        {tem || comprou ? (
          <button type="button" className="l-loja-btn" onClick={tocarAgora}>tocar na kombi ▸</button>
        ) : falta > 0 ? (
          <p className="l-loja-falta">faltam <b>{falta} neon</b>. acordar gente, fazer arte e ajudar os lugares da cidade rende neon</p>
        ) : (
          <button type="button" className="l-loja-btn is-comprar" onClick={() => { if (onComprar()) setComprou(true) }}>comprar · {PRECO_DISCO} neon</button>
        )}
        {comprou && <p className="l-loja-ok">tá na sua kombi. o toca-discos fica no painel</p>}
      </div>
      <ol className="l-loja-faixas">
        {d.faixas.map((f, i) => (
          <li key={f.src}>
            <button type="button" onClick={() => ouvir(i)} aria-label={ouvindo === i ? "parar o trecho" : `ouvir um trecho de ${f.titulo}`}>{ouvindo === i ? "■" : "▸"}</button>
            <span><b>{f.titulo}</b><small>{f.autor}</small></span>
            <em>{duracao(f.dur)}</em>
          </li>
        ))}
      </ol>
    </div>
  )
}
