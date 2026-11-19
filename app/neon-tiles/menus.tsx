"use client"

// GUITAR DRIVER — as telas fora do show: título, carreira (os palcos), o
// setlist de cada palco (com o duelo e os desafios), tocar rápido, o preparo
// (instrumento + dificuldade), a loja, as opções, a calibração e o resultado.

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ACABAMENTOS, DESAFIOS, DIFICULDADES, FAIXAS, MODELOS, PALCOS, faixaAberta, faixaConquistada, palcoAberto, publicoDe,
  type Faixa, type Instrumento, type Modelo, type Palco, type Save, type SaveLinha,
} from "./dados"
import { svgInstrumento, type Acabamento } from "./instrumentos"
import { densidade, type ChartGd } from "./motor"
import { ac, clique } from "./som"
import type { Tela } from "./page"

export interface Resultado {
  pct: number
  estrelas: number
  pontos: number
  maxSeq: number
  perfeitos: number
  cache: number
  recorde: boolean
  novoPalco: Palco | null
  vaiado: boolean
  publico: number // quanta gente viu
  popularidade: number // depois do show
  popDelta: number
  desafios: { texto: string; neon: number }[]
  batalha: { venceu: boolean; rival: string } | null
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
const fx = (id: string) => FAIXAS.find((f) => f.id === id)!

function Topo({ titulo, neon, onVoltar }: { titulo: string; neon: number; onVoltar: () => void }) {
  return (
    <header className="gd-topo">
      <button type="button" onClick={onVoltar}>‹ voltar</button>
      <b>{titulo}</b>
      <span className="gd-saldo">{neon.toLocaleString("pt-BR")} <small>Água$</small></span>
    </header>
  )
}

export function Instr({ m, acabamento = "liso", className }: { m: Modelo; acabamento?: Acabamento; className?: string }) {
  const html = useMemo(() => svgInstrumento(m.visual, m.tipo, acabamento, `${m.id}-${className ?? "x"}`), [m, acabamento, className])
  return <span className={`gd-instr ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />
}

/* ─── TÍTULO ───────────────────────────────────────────── */
export function Titulo({ neon, popularidade, modelo, acabamento, editor, onIr, onSair }: {
  neon: number; popularidade: number; modelo: Modelo; acabamento: Acabamento; editor: boolean; onIr: (t: Tela) => void; onSair: () => void
}) {
  const itens: { t: Tela; nome: string; sub: string }[] = [
    { t: { t: "carreira" }, nome: "carreira", sub: "os lugares da cidade viram palco" },
    { t: { t: "rapido" }, nome: "tocar rápido", sub: "qualquer faixa aberta" },
    { t: { t: "desafios" }, nome: "desafios", sub: "metas de cada palco" },
    { t: { t: "loja" }, nome: "loja", sub: "guitarras, baixos, acabamentos" },
    { t: { t: "opcoes" }, nome: "opções", sub: editor ? "calibrar atraso · editor de notas" : "calibrar o atraso do som" },
  ]
  return (
    <section className="gd-titulo">
      <div className="gd-luzes" aria-hidden><i /><i /><i /></div>
      <header className="gd-titulo-topo">
        <button type="button" onClick={onSair}>‹ sair</button>
        <span className="gd-saldo">{neon.toLocaleString("pt-BR")} <small>Água$</small></span>
      </header>
      <h1 className="gd-logo"><span>GUITAR</span><span>DRIVER</span></h1>
      <Popularidade valor={popularidade} />
      <Instr m={modelo} acabamento={acabamento} className="gd-titulo-instr" />
      <nav className="gd-menu-lista">
        {itens.map((it, i) => (
          <button key={it.nome} type="button" onClick={() => onIr(it.t)} style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
            <b>{it.nome}</b><small>{it.sub}</small>
          </button>
        ))}
      </nav>
      <p className="gd-rodape">as faixas do LU2CA · notas tiradas das gravações de verdade</p>
    </section>
  )
}

/* ─── a popularidade (o quanto a cidade te conhece) ───── */
function Popularidade({ valor }: { valor: number }) {
  const fase = valor < 5 ? "ninguém te conhece ainda" : valor < 20 ? "uns amigos vêm te ver" : valor < 45 ? "o bairro já sabe quem é você" : valor < 80 ? "a cidade tá falando de você" : "a cidade inteira canta junto"
  return (
    <div className="gd-pop" style={{ ["--p" as string]: `${valor}%` }}>
      <small>popularidade · {Math.round(valor)}</small>
      <i><em /></i>
      <span>{fase}</span>
    </div>
  )
}

/* ─── CARREIRA: os lugares da cidade ───────────────────── */
export function Carreira({ save, linha, neon, onPalco, onVoltar }: { save: Save; linha: SaveLinha; neon: number; onPalco: (id: string) => void; onVoltar: () => void }) {
  const pop = linha.popularidade ?? 0
  const abertos = PALCOS.filter((p) => palcoAberto(linha, p)).length
  return (
    <section className="gd-menu">
      <Topo titulo="CARREIRA" neon={neon} onVoltar={onVoltar} />
      <div className="gd-menu-corpo">
        <Popularidade valor={pop} />
        <p className="gd-rotulo">{abertos} de {PALCOS.length} lugares · conheça um lugar na cidade e ele vira palco</p>
        <div className="gd-cartazes">
          {PALCOS.map((p, i) => {
            const aberto = palcoAberto(linha, p)
            const tocadas = p.setlist.filter((f) => Object.keys(save.estrelas).some((k) => k.startsWith(`${p.id}:${f}:`) && save.estrelas[k] > 0)).length
            const venceu = save.batalhas.includes(p.id)
            const gente = publicoDe(p, pop)
            const prontas = p.setlist.filter((f) => faixaAberta(fx(f)) && faixaConquistada(fx(f), linha)).length
            return (
              <button key={p.id} type="button" disabled={!aberto} className={`gd-cartaz ${aberto ? "" : "is-trancado"}`} style={{ ["--c" as string]: p.cor, animationDelay: `${i * 0.04}s` }} onClick={() => onPalco(p.id)}>
                <small className="gd-cartaz-n">{p.lugar}</small>
                <b>{aberto ? p.nome : "???"}</b>
                <span>{aberto ? `${gente === 1 ? "1 pessoa vem te ver" : `${gente} pessoas vêm te ver`} · cabem ${p.capacidade}` : `🔒 ${p.conhecer}`}</span>
                {aberto && <em>{prontas ? `${tocadas}/${prontas} músicas` : "nenhuma música ainda"}{p.rival ? ` · ${venceu ? "duelo vencido ✓" : `duelo: ${p.rival.nome}`}` : ""}</em>}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── SETLIST de um palco ──────────────────────────────── */
export function Setlist({ save, linha, neon, popularidade, palco, onFaixa, onVoltar }: { save: Save; linha: SaveLinha; neon: number; popularidade: number; palco: Palco; onFaixa: (f: string, batalha: boolean) => void; onVoltar: () => void }) {
  const pronta = (f: Faixa) => faixaAberta(f) && faixaConquistada(f, linha)
  const abertas = palco.setlist.filter((f) => pronta(fx(f)))
  const tocou = (f: string) => Object.keys(save.estrelas).some((k) => k.startsWith(`${palco.id}:${f}:`) && save.estrelas[k] > 0)
  const rival = palco.rival
  const podeDuelo = !!rival && abertas.length > 0 && abertas.every(tocou) && pronta(fx(rival.faixa))
  const gente = publicoDe(palco, popularidade)
  const venceu = save.batalhas.includes(palco.id)
  return (
    <section className="gd-menu" style={{ ["--cor" as string]: palco.cor }}>
      <Topo titulo={palco.nome.toUpperCase()} neon={neon} onVoltar={onVoltar} />
      <div className="gd-menu-corpo">
        <p className="gd-rotulo">setlist · {palco.lugar} · hoje: {gente === 1 ? "1 pessoa" : `${gente} pessoas`} de {palco.capacidade}</p>
        <ul className="gd-setlist">
          {palco.setlist.map((id, i) => {
            const f = fx(id)
            const aberta = pronta(f)
            const est = save.estrelas[`${palco.id}:${f.id}:${save.instrumento}`] ?? 0
            return (
              <li key={id}>
                <button type="button" disabled={!aberta} onClick={() => onFaixa(id, false)} style={{ ["--c" as string]: aberta ? f.cor : "#555", animationDelay: `${i * 0.05}s` }}>
                  <span className="gd-num">{i + 1}</span>
                  <span className="gd-faixa-nome"><b>{aberta ? f.titulo : "???"}</b><small>{aberta ? "★".repeat(est) + "☆".repeat(5 - est) : faixaAberta(f) ? "· · ·" : `abre ${dataCurta(f.abre!)}`}</small></span>
                  <span className="gd-bpm">{f.bpm}<small>bpm</small></span>
                </button>
              </li>
            )
          })}
        </ul>
        {rival && (
          <button type="button" className={`gd-duelo ${venceu ? "is-feito" : ""}`} disabled={!podeDuelo} onClick={() => onFaixa(rival.faixa, true)}>
            <small>{venceu ? "duelo vencido ✓ · tocar de novo" : "o dono da noite"}</small>
            <b>DUELO · {rival.nome}</b>
            <span>{podeDuelo ? `${fx(rival.faixa).titulo.toLowerCase()} · acerte as frases de estrela pra ganhar ataques` : "toque todas as músicas do setlist pra liberar"}</span>
          </button>
        )}
        <p className="gd-rotulo">desafios deste palco</p>
        <ul className="gd-desafios">
          {DESAFIOS.filter((d) => d.palco === palco.id).map((d) => (
            <li key={d.id} className={save.desafios.includes(d.id) ? "is-feito" : ""}><span>{save.desafios.includes(d.id) ? "✓" : "○"}</span>{d.texto}<em>+{d.neon}</em></li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* ─── TOCAR RÁPIDO ─────────────────────────────────────── */
export function Rapido({ save, linha, neon, onFaixa, onVoltar }: { save: Save; linha: SaveLinha; neon: number; onFaixa: (f: string) => void; onVoltar: () => void }) {
  return (
    <section className="gd-menu">
      <Topo titulo="TOCAR RÁPIDO" neon={neon} onVoltar={onVoltar} />
      <div className="gd-menu-corpo">
        <p className="gd-rotulo">as faixas chegam conforme você acorda as pessoas da cidade</p>
        <ul className="gd-setlist">
          {FAIXAS.map((f, i) => {
            const aberta = faixaAberta(f) && faixaConquistada(f, linha)
            const melhor = Math.max(0, ...Object.entries(save.estrelas).filter(([k]) => k.split(":")[1] === f.id).map(([, v]) => v))
            return (
              <li key={f.id}>
                <button type="button" disabled={!aberta} onClick={() => onFaixa(f.id)} style={{ ["--c" as string]: aberta ? f.cor : "#555", animationDelay: `${i * 0.04}s` }}>
                  <span className="gd-num">{i + 1}</span>
                  <span className="gd-faixa-nome"><b>{aberta ? f.titulo : "???"}</b><small>{aberta ? "★".repeat(melhor) + "☆".repeat(5 - melhor) : faixaAberta(f) ? "· · ·" : `abre ${dataCurta(f.abre!)}`}</small></span>
                  <span className="gd-bpm">{f.bpm}<small>bpm</small></span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* ─── DESAFIOS ─────────────────────────────────────────── */
export function Desafios({ save, linha, neon, onVoltar }: { save: Save; linha: SaveLinha; neon: number; onVoltar: () => void }) {
  return (
    <section className="gd-menu">
      <Topo titulo="DESAFIOS" neon={neon} onVoltar={onVoltar} />
      <div className="gd-menu-corpo">
        {PALCOS.filter((p) => DESAFIOS.some((d) => d.palco === p.id)).map((p) => (
          <div key={p.id} className="gd-desafio-grupo" style={{ ["--c" as string]: p.cor }}>
            <p className="gd-rotulo">{p.nome}{palcoAberto(linha, p) ? "" : " · 🔒"}</p>
            <ul className="gd-desafios">
              {DESAFIOS.filter((d) => d.palco === p.id).map((d) => (
                <li key={d.id} className={save.desafios.includes(d.id) ? "is-feito" : ""}><span>{save.desafios.includes(d.id) ? "✓" : "○"}</span>{d.texto}<em>+{d.neon}</em></li>
              ))}
            </ul>
          </div>
        ))}
        <p className="gd-dica">os desafios contam tocando no palco deles (carreira ou duelo).</p>
      </div>
    </section>
  )
}

/* ─── PREPARO: instrumento + dificuldade ───────────────── */
export function Preparo({ save, salvar, faixa, palco, batalha, erro, calibrado, onTocar, onCalibrar, onVoltar }: {
  save: Save; salvar: (f: (s: Save) => Save) => void; faixa: Faixa; palco: Palco | null; batalha: boolean; erro: string; calibrado: boolean
  onTocar: () => void; onCalibrar: () => void; onVoltar: () => void
}) {
  const [chart, setChart] = useState<ChartGd | null>(null)
  useEffect(() => {
    let vivo = true
    fetch(`/gd/${faixa.id}.json`).then((r) => r.json()).then((c) => { if (vivo) setChart(c) }).catch(() => {})
    return () => { vivo = false }
  }, [faixa.id])
  const modelo = MODELOS.find((m) => m.id === save.modelo[save.instrumento]) ?? MODELOS[0]
  const max = chart ? Math.max(...DIFICULDADES.map((d) => Math.max(densidade(chart, "guitarra", d.id), densidade(chart, "baixo", d.id)))) : 1
  return (
    <section className="gd-menu gd-preparo" style={{ ["--cor" as string]: faixa.cor }}>
      <header className="gd-topo">
        <button type="button" onClick={onVoltar}>‹ voltar</button>
        <b>{batalha ? "DUELO" : palco ? palco.nome.toUpperCase() : "TOCAR RÁPIDO"}</b>
        <span />
      </header>
      <div className="gd-menu-corpo">
        <div className="gd-faixa-capa">
          <small>{batalha && palco?.rival ? `contra ${palco.rival.nome}` : "LU2CA"}</small>
          <b>{faixa.titulo}</b>
          <span>{faixa.bpm} bpm</span>
        </div>
        <p className="gd-rotulo">instrumento</p>
        <div className="gd-escolha-inst">
          {(["guitarra", "baixo"] as Instrumento[]).map((i) => {
            const m = MODELOS.find((x) => x.id === save.modelo[i]) ?? MODELOS.find((x) => x.tipo === i)!
            const dens = chart ? densidade(chart, i, save.dificuldade) : 0
            return (
              <button key={i} type="button" className={save.instrumento === i ? "is-on" : ""} onClick={() => salvar((s) => ({ ...s, instrumento: i }))}>
                <Instr m={m} acabamento={save.acabamentos[m.id] ?? "liso"} className="gd-mini" />
                <span><b>{i}</b><small>{m.nome}</small><em>{chart ? `${dens} notas/min` : "…"}</em></span>
              </button>
            )
          })}
        </div>
        <p className="gd-rotulo">dificuldade · cada uma é um olhar mais fundo na faixa</p>
        <div className="gd-difs">
          {DIFICULDADES.map((d) => {
            const dens = chart ? densidade(chart, save.instrumento, d.id) : 0
            return (
              <button key={d.id} type="button" className={save.dificuldade === d.id ? "is-on" : ""} onClick={() => salvar((s) => ({ ...s, dificuldade: d.id }))}>
                <b>{d.nome}</b>
                <i><em style={{ width: `${Math.max(4, (dens / max) * 100)}%` }} /></i>
                <small>{d.ouve}</small>
              </button>
            )
          })}
        </div>
        {!calibrado && (
          <button type="button" className="gd-aviso-calib" onClick={onCalibrar}>
            <b>calibrar o atraso do som (10 s)</b>
            <small>recomendado com fone bluetooth: as notas caem exatamente no tempo que você ouve</small>
          </button>
        )}
        {erro && <p className="gd-erro">{erro}</p>}
        <button type="button" className="gd-btn gd-tocar" onClick={onTocar}>{batalha ? "DUELAR" : "TOCAR"}</button>
        <p className="gd-dica">toque na coluna da nota (vários dedos ao mesmo tempo) · teclado D F J K · espaço = {batalha ? "ataque" : "NEON"}</p>
        <p className="gd-dica">você toca a {save.instrumento} com a {modelo.nome}</p>
      </div>
    </section>
  )
}

/* ─── LOJA ─────────────────────────────────────────────── */
export function Loja({ save, salvar, neon, gastar, onVoltar }: {
  save: Save; salvar: (f: (s: Save) => Save) => void; neon: number; gastar: (v: number) => Promise<boolean>; onVoltar: () => void
}) {
  const [tipo, setTipo] = useState<Instrumento>(save.instrumento)
  const lista = MODELOS.filter((m) => m.tipo === tipo)
  const [selId, setSelId] = useState(save.modelo[tipo])
  const sel = lista.find((m) => m.id === selId) ?? lista[0]
  const [provar, setProvar] = useState<Acabamento | null>(null)
  const [msg, setMsg] = useState("")
  const tem = save.possui.includes(sel.id)
  const usando = save.modelo[tipo] === sel.id
  const acabAtual = save.acabamentos[sel.id] ?? "liso"
  const mostra = provar ?? acabAtual
  const comprar = async (id: string, preco: number) => {
    if (save.possui.includes(id)) return true
    if (neon < preco) { setMsg(`faltam ${preco - neon} Água$ · toque nos palcos pra juntar`); return false }
    const ok = await gastar(preco)
    if (!ok) { setMsg("não deu pra pagar agora. tenta de novo."); return false }
    salvar((s) => ({ ...s, possui: [...s.possui, id] }))
    setMsg("é seu.")
    try { navigator.vibrate?.([20, 30, 20]) } catch {}
    return true
  }
  return (
    <section className="gd-menu gd-loja" style={{ ["--cor" as string]: sel.corpo }}>
      <Topo titulo="LOJA" neon={neon} onVoltar={onVoltar} />
      <div className="gd-menu-corpo">
        <div className="gd-toggle">
          {(["guitarra", "baixo"] as Instrumento[]).map((i) => (
            <button key={i} type="button" className={tipo === i ? "is-on" : ""} onClick={() => { setTipo(i); setSelId(save.modelo[i]); setProvar(null); setMsg("") }}>{i}s</button>
          ))}
        </div>
        <div className="gd-vitrine-grande">
          <Instr m={sel} acabamento={mostra} className="gd-vitrine-instr" />
          <div className="gd-vitrine-info">
            <b>{sel.nome}</b>
            <small>{sel.descricao}</small>
            <em>{sel.bonus ?? "sem bônus"}</em>
            <button type="button" className="gd-btn" disabled={usando}
              onClick={async () => { if (await comprar(sel.id, sel.preco)) salvar((s) => ({ ...s, modelo: { ...s.modelo, [tipo]: sel.id } })) }}>
              {usando ? "tocando com ela" : tem ? "usar" : `comprar · ${sel.preco} Água$`}
            </button>
          </div>
        </div>
        {msg && <p className="gd-msg">{msg}</p>}
        <div className="gd-prateleira">
          {lista.map((m) => (
            <button key={m.id} type="button" className={`${m.id === sel.id ? "is-on" : ""}`} onClick={() => { setSelId(m.id); setProvar(null); setMsg("") }}>
              <Instr m={m} acabamento={save.acabamentos[m.id] ?? "liso"} className="gd-mini" />
              <small>{save.possui.includes(m.id) ? (save.modelo[tipo] === m.id ? "usando" : "seu") : `${m.preco}`}</small>
            </button>
          ))}
        </div>
        <p className="gd-rotulo">acabamento · {sel.nome}{tem ? "" : " (compre o instrumento primeiro)"}</p>
        <div className="gd-acab">
          {ACABAMENTOS.map((a) => {
            const id = `acab:${sel.id}:${a.id}`
            const possui = a.id === "liso" || save.possui.includes(id)
            return (
              <button key={a.id} type="button" className={acabAtual === a.id ? "is-on" : provar === a.id ? "is-provando" : ""}
                onClick={async () => {
                  if (!tem) { setProvar(a.id); return }
                  if (!possui && provar !== a.id) { setProvar(a.id); setMsg(`provando ${a.nome}: toque de novo pra comprar (${a.preco} Água$)`); return }
                  if (await comprar(id, a.preco)) { salvar((s) => ({ ...s, acabamentos: { ...s.acabamentos, [sel.id]: a.id } })); setProvar(null) }
                }}>
                {a.nome}
                <small>{acabAtual === a.id ? "usando" : possui ? "usar" : `${a.preco} Água$`}</small>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─── OPÇÕES ───────────────────────────────────────────── */
export function Opcoes({ save, salvar, editor, onCalibrar, onEditor, onVoltar }: {
  save: Save; salvar: (f: (s: Save) => Save) => void; editor: boolean; onCalibrar: () => void; onEditor: () => void; onVoltar: () => void
}) {
  const ms = save.atraso === null ? null : Math.round(save.atraso * 1000)
  return (
    <section className="gd-menu">
      <header className="gd-topo"><button type="button" onClick={onVoltar}>‹ voltar</button><b>OPÇÕES</b><span /></header>
      <div className="gd-menu-corpo">
        <div className="gd-opcao">
          <b>atraso do som</b>
          <small>{ms === null ? "ainda não calibrado (usando um palpite do aparelho)" : `${ms} ms`}</small>
          <div className="gd-ajuste">
            <button type="button" onClick={() => salvar((s) => ({ ...s, atraso: Math.max(0, (s.atraso ?? 0.04) - 0.01) }))}>− 10 ms</button>
            <button type="button" className="gd-btn" onClick={onCalibrar}>calibrar</button>
            <button type="button" onClick={() => salvar((s) => ({ ...s, atraso: Math.min(0.5, (s.atraso ?? 0.04) + 0.01) }))}>+ 10 ms</button>
          </div>
          <small>se as notas parecem chegar antes do som, aumente; se chegam depois, diminua.</small>
        </div>
        {editor && (
          <button type="button" className="gd-opcao is-botao" onClick={onEditor}>
            <b>editor de notas</b>
            <small>ouvir a faixa, mover/pôr/tirar notas na grade, testar e exportar</small>
          </button>
        )}
      </div>
    </section>
  )
}

/* ─── CALIBRAR: bater junto com o clique ───────────────── */
export function Calibrar({ onFim }: { onFim: (atraso: number | null) => void }) {
  const [fase, setFase] = useState<"antes" | "batendo" | "pronto">("antes")
  const [n, setN] = useState(0)
  const [valor, setValor] = useState<number | null>(null)
  const cliques = useRef<number[]>([])
  const toques = useRef<number[]>([])
  const INTERVALO = 0.6
  const TOTAL = 14
  const comecar = () => {
    const c = ac()
    if (!c) return
    const t0 = c.currentTime + 0.6
    cliques.current = Array.from({ length: TOTAL }, (_, i) => t0 + i * INTERVALO)
    cliques.current.forEach((t, i) => clique(c, t, i % 4 === 0))
    toques.current = []
    setFase("batendo")
    setN(0)
    setTimeout(() => {
      // os 4 primeiros são pra entrar no tempo
      const difs = toques.current.map((tt) => {
        const mais = cliques.current.reduce((a, b) => (Math.abs(b - tt) < Math.abs(a - tt) ? b : a))
        return { d: tt - mais, i: cliques.current.indexOf(mais) }
      }).filter((x) => x.i >= 4 && Math.abs(x.d) < INTERVALO / 2).map((x) => x.d).sort((a, b) => a - b)
      const med = difs.length >= 4 ? difs[Math.floor(difs.length / 2)] : null
      setValor(med === null ? null : Math.max(0, Math.min(0.45, med)))
      setFase("pronto")
    }, (TOTAL * INTERVALO + 1.2) * 1000)
  }
  const bater = () => {
    const c = ac()
    if (!c || fase !== "batendo") return
    toques.current.push(c.currentTime)
    setN((x) => x + 1)
    try { navigator.vibrate?.(8) } catch {}
  }
  return (
    <section className="gd-menu gd-calib">
      <header className="gd-topo"><button type="button" onClick={() => onFim(null)}>‹ voltar</button><b>CALIBRAR</b><span /></header>
      <div className="gd-menu-corpo">
        {fase === "antes" && (
          <>
            <p className="gd-calib-txt">coloque o fone (ou o som) que você vai usar pra tocar. vão tocar {TOTAL} cliques: bata no botão junto com cada um que você ouvir.</p>
            <button type="button" className="gd-btn" onClick={comecar}>começar</button>
          </>
        )}
        {fase === "batendo" && (
          <button type="button" className="gd-bater" onPointerDown={bater}>
            <b>{n}</b>
            <small>bata junto com o clique</small>
          </button>
        )}
        {fase === "pronto" && (
          <>
            <p className="gd-calib-txt">{valor === null ? "não deu pra medir (poucas batidas no tempo). tenta de novo?" : `o som chega ${Math.round(valor * 1000)} ms depois no seu ouvido. o jogo vai compensar isso.`}</p>
            <div className="gd-ajuste">
              <button type="button" onClick={() => { setFase("antes") }}>de novo</button>
              <button type="button" className="gd-btn" disabled={valor === null} onClick={() => onFim(valor)}>salvar</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

/* ─── RESULTADO ────────────────────────────────────────── */
export function ResultadoTela({ r, palco, faixa, instrumento, neon, onDeNovo, onMenu, onProximo }: {
  r: Resultado; palco: Palco; faixa: Faixa; instrumento: Instrumento; neon: number; onDeNovo: () => void; onMenu: () => void; onProximo?: () => void
}) {
  const [cache, setCache] = useState(0)
  useEffect(() => {
    let v = 0
    const t = setInterval(() => {
      v = Math.min(r.cache, v + Math.max(5, Math.round(r.cache / 25)))
      setCache(v)
      if (v >= r.cache) clearInterval(t)
    }, 40)
    return () => clearInterval(t)
  }, [r.cache])
  const frase = r.batalha
    ? r.batalha.venceu ? "o palco é seu." : `${r.batalha.rival} levou essa.`
    : r.vaiado ? "a galera vaiou. de novo?" : r.estrelas >= 4 ? "a casa veio abaixo." : r.estrelas >= 2 ? "a galera curtiu." : "hoje não foi. amanhã tem ensaio."
  return (
    <section className="gd-resultado is-jornal" style={{ ["--cor" as string]: palco.cor }}>
      {/* o resultado sai no jornal da cidade, como o jornal do Guitar Hero 3 */}
      <article className="gd-jornal">
        <header className="gd-jornal-topo">
          <small>edição da noite · {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}</small>
          <b>O Diário da Cidade Neon</b>
          <small>{palco.lugar} · {r.publico === 1 ? "1 pessoa viu" : `${r.publico} pessoas viram`}</small>
        </header>
        <h1>{frase}</h1>
        <div className="gd-jornal-corpo">
          <figure className="gd-jornal-foto">
            <span>{palco.fachada || palco.nome}</span>
            <figcaption>{faixa.titulo} · {instrumento} · {palco.nome}</figcaption>
          </figure>
          <div className="gd-jornal-lado">
            {!r.batalha && <div className="gd-estrelas">{Array.from({ length: 5 }, (_, i) => <span key={i} className={i < r.estrelas ? "is-on" : ""} style={{ animationDelay: `${0.3 + i * 0.18}s` }}>★</span>)}</div>}
            <p className="gd-jornal-pct"><b>{Math.round(r.pct * 100)}%</b>das notas</p>
            <p className="gd-jornal-pontos">{r.pontos.toLocaleString("pt-BR")} pontos{r.recorde ? " · recorde" : ""}</p>
          </div>
        </div>
        <dl>
          <div><dt>seguidas</dt><dd>{r.maxSeq}</dd></div>
          <div><dt>perfeitas</dt><dd>{r.perfeitos}</dd></div>
        </dl>
      </article>
      {r.cache > 0 && (
        <div className="gd-cache">
          <small>{r.batalha?.venceu ? "o prêmio do duelo" : `cachê · ${r.publico === 1 ? "1 pessoa viu" : `${r.publico} pessoas viram`}`}</small>
          <b>+ {cache.toLocaleString("pt-BR")} Água$</b>
        </div>
      )}
      {r.popDelta !== 0 && (
        <div className="gd-pop-res">
          <b>{r.popDelta > 0 ? `+${r.popDelta}` : r.popDelta} popularidade</b>
          <Popularidade valor={r.popularidade} />
        </div>
      )}
      {r.desafios.length > 0 && (
        <ul className="gd-desafios is-novos">
          {r.desafios.map((d) => <li key={d.texto} className="is-feito"><span>✓</span>{d.texto}<em>+{d.neon}</em></li>)}
        </ul>
      )}
      {r.novoPalco && (
        <div className="gd-novo" style={{ ["--c" as string]: r.novoPalco.cor }}>
          <small>a cidade inteira te conhece</small>
          <b>{r.novoPalco.nome}</b>
          <span>{r.novoPalco.lugar} · cabem {r.novoPalco.capacidade}</span>
        </div>
      )}
      <p className="gd-rotulo">saldo: {neon.toLocaleString("pt-BR")} Água$</p>
      <div className="gd-acoes">
        {onProximo && <button type="button" className="gd-btn" onClick={onProximo}>ir pro próximo palco</button>}
        <button type="button" className={onProximo ? "gd-btn is-ghost" : "gd-btn"} onClick={onDeNovo}>tocar de novo</button>
        <button type="button" className="gd-btn is-ghost" onClick={onMenu}>setlist</button>
      </div>
    </section>
  )
}
