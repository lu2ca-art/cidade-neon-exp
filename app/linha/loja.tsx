"use client"

// A LOJA (refeita em 05/10; T03, 28/10): um app do celular do jogo. Vende o
// que a grana dos shows e das missões compra (neon$): discos, instrumentos,
// carros e roupas. Os discos são um gênero cada, todos pelo mesmo preço; dá pra
// ouvir um trecho antes, e o comprado vai pro toca-discos da Kombi (o acervo
// antigo já mora lá). A Kombi não está aqui: ela só ganha melhoria de
// desempenho, com o mecânico, paga em água. Preços e itens: economia-rascunho.ts.

import { useEffect, useRef, useState } from "react"
import { Capa } from "./capa"
import { DISCOS, PRECO_DISCO, duracao, type DiscoLoja } from "./discos"
import type { Save } from "./estado"
import { CATEGORIAS, daCategoria, saldo, tem as temItem, type ItemLoja } from "./economia"
import type { Categoria } from "./economia-rascunho"
import { disco as toca, fonteSom } from "./som"
import { AppTopo } from "./os"
import { track } from "@/lib/analytics"

const TEXTO: Record<Categoria, string> = {
  disco: `cada disco custa ${PRECO_DISCO} neon$. o que vc compra toca no toca-discos da kombi, do começo ao fim. os discos antigos já estão lá`,
  instrumento: "o violão foi presente da D-Bee. o resto se compra com a grana dos shows",
  carro: "pra rodar a cidade quando a kombi não puder. a kombi mesmo só melhora com o mecânico, em água",
  roupa: "a roupa do palco e da rua",
}

export function Loja({ save, comprar, onVoltar }: { save: Save; comprar: (id: string) => boolean; onVoltar: () => void }) {
  const [aba, setAba] = useState<Categoria>("disco")
  const [aberto, setAberto] = useState<DiscoLoja | null>(null)
  const [item, setItem] = useState<ItemLoja | null>(null)
  const neon = saldo(save)
  const meus = save.discos ?? []
  return (
    <section className="l-loja">
      <AppTopo titulo="LOJA" cor="#ffc857" onVoltar={onVoltar} />
      <nav className="l-loja-abas" role="tablist" aria-label="o que tem na loja">
        {CATEGORIAS.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={aba === c.id} className={aba === c.id ? "is-on" : ""} onClick={() => setAba(c.id)}>{c.nome}</button>
        ))}
      </nav>
      <header className="l-loja-cab">
        <div>
          <p>{TEXTO[aba]}</p>
        </div>
        <span className="l-loja-saldo" aria-label={`${neon} neon`}><i aria-hidden="true">$</i>{neon}<small>neon$</small></span>
      </header>
      {aba === "disco" ? (
        <ul className="l-loja-grade">
          {DISCOS.map((d) => {
            const tem = d.gratis || meus.includes(d.id)
            return (
              <li key={d.id}>
                <button type="button" onClick={() => setAberto(d)} className={tem ? "is-meu" : ""}>
                  <Capa motivo={d.motivo} a={d.a} b={d.b} titulo={d.titulo} />
                  <span className="l-loja-nome">{d.titulo}</span>
                  <span className="l-loja-info">{d.faixas.length} faixas · {tem ? (d.gratis ? "grátis" : "na kombi ✓") : `${PRECO_DISCO} neon$`}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <ul className="l-loja-grade is-itens">
          {daCategoria(aba).map((it) => {
            const tem = temItem(save, it.id)
            return (
              <li key={it.id}>
                <button type="button" onClick={() => setItem(it)} className={tem ? "is-meu" : ""} data-item={it.id}>
                  <Icone cat={it.cat} cor={it.cor} />
                  <span className="l-loja-nome">{it.nome}</span>
                  <span className="l-loja-info">{tem ? "é seu ✓" : `${it.preco} neon$`}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {aberto && <Detalhe d={aberto} tem={!!aberto.gratis || meus.includes(aberto.id)} neon={neon} onComprar={() => comprar(`disco:${aberto.id}`)} onFechar={() => setAberto(null)} />}
      {item && <DetalheItem it={item} tem={temItem(save, item.id)} neon={neon} onComprar={() => comprar(item.id)} onFechar={() => setItem(null)} />}
    </section>
  )
}

// o desenho de cada coisa (simples, até a arte chegar)
function Icone({ cat, cor, size }: { cat: Categoria; cor: string; size?: number }) {
  const p = { width: size ?? "100%", viewBox: "0 0 100 100", "aria-hidden": true as const, className: "l-loja-icone", style: { ["--cor" as string]: cor } }
  return (
    <svg {...p}>
      <rect x="0" y="0" width="100" height="100" rx="10" fill="#120e18" />
      <g fill="none" stroke={cor} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        {cat === "instrumento" && <><path d="M30 78c-8-8-6-20 4-24 6-2 8-8 12-12l22-22 6 6-22 22c-4 4-10 6-12 12-4 10-16 12-24 4z" /><path d="M66 22l8 8" /><circle cx="40" cy="64" r="4" /></>}
        {cat === "carro" && <><path d="M14 64h72v-8l-10-4-10-14H38L26 52l-12 4z" /><circle cx="32" cy="66" r="8" /><circle cx="70" cy="66" r="8" /></>}
        {cat === "roupa" && <path d="M36 18l-20 14 8 14 8-4v42h36V42l8 4 8-14-20-14c-2 6-8 10-14 10s-12-4-14-10z" />}
      </g>
    </svg>
  )
}

function DetalheItem({ it, tem, neon, onComprar, onFechar }: { it: ItemLoja; tem: boolean; neon: number; onComprar: () => boolean; onFechar: () => void }) {
  const [comprou, setComprou] = useState(false)
  const falta = it.preco - neon
  return (
    <div className="l-loja-detalhe" role="dialog" aria-label={it.nome}>
      <button type="button" className="l-loja-fechar" onClick={onFechar} aria-label="fechar">×</button>
      <div className="l-loja-capa-grande"><Icone cat={it.cat} cor={it.cor} /></div>
      <h2>{it.nome}</h2>
      <p className="l-loja-sub">{it.desc}</p>
      <div className="l-loja-acao">
        {tem || comprou ? (
          <p className="l-loja-ok">é seu. por enquanto fica guardado; usar no jogo vem depois</p>
        ) : falta > 0 ? (
          <p className="l-loja-falta">faltam <b>{falta} neon$</b>. tocar na rua e fazer as missões rende neon$</p>
        ) : (
          <button type="button" className="l-loja-btn is-comprar" onClick={() => { if (onComprar()) setComprou(true) }}>comprar · {it.preco} neon$</button>
        )}
      </div>
    </div>
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
          <p className="l-loja-falta">faltam <b>{falta} neon$</b>. tocar na rua e fazer as missões rende neon$</p>
        ) : (
          <button type="button" className="l-loja-btn is-comprar" onClick={() => { if (onComprar()) setComprou(true) }}>comprar · {PRECO_DISCO} neon$</button>
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
