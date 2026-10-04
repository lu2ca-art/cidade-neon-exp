"use client"

// A CENA de um lugar, por cima da estrada parada (a câmera de cinema já
// cortou pro lugar, em Corrida). Tarja de cinema em cima e embaixo, legenda
// com quem fala, escolha nos três tons e o GESTO do lugar. Toca na tela pra
// seguir. Roteiros em cenas.ts.

import { useEffect, useMemo, useState } from "react"
import { RELIQUIAS, type Cena, type PassoCena, type Reliquia } from "./cenas"
import { estacao as getEstacao, type EstacaoId } from "./data"
import { MEMORIAS } from "./missoes"
import { LUGARES } from "./lugares"
import { VOZES, type Tom } from "./roteiros"
import { gota } from "./som"
import { vib } from "./som-carro"

export interface ResultadoCena {
  objeto?: EstacaoId
  reliquias: Reliquia[]
  caca: boolean
}

type Fila = { de?: string; texto: string; tipo: "fala" | "acao" | "nucleo" }[]

const COPOS = [
  { id: "felicidade", nome: "o copo da felicidade", promessa: "isso vai te fazer esquecer suas dúvidas" },
  { id: "certeza", nome: "o copo da certeza", promessa: "agora você sabe exatamente o que fazer" },
  { id: "liberdade", nome: "o copo da liberdade", promessa: "basta beber pra nunca mais se preocupar com nada" },
  { id: "amor", nome: "o copo do amor", promessa: "isso vai preencher o vazio aí dentro" },
  { id: "grandeza", nome: "o copo da grandeza", promessa: "isso te torna maior que qualquer um aqui" },
  { id: "eternidade", nome: "o copo da eternidade", promessa: "agora você nunca mais vai querer sair" },
]

export function CenaLugar({ cena: cenaBruta, memoria, objetos, onTom, onFim }: { cena: Cena; memoria: number; objetos: EstacaoId[]; onTom: (t: Tom) => void; onFim: (r: ResultadoCena) => void }) {
  // os passos com `se` só entram se a pessoa já passou por aquela estação
  const cena = useMemo(() => ({ ...cenaBruta, passos: cenaBruta.passos.filter((p) => !("se" in p) || !p.se || objetos.includes(p.se)) }), [cenaBruta, objetos])
  const [pos, setPos] = useState(0)
  const [fila, setFila] = useState<Fila>([])
  const [ganhos, setGanhos] = useState<{ objeto?: EstacaoId; reliquias: Reliquia[] }>({ reliquias: [] })
  const [letras, setLetras] = useState(0)
  const passo: PassoCena | undefined = cena.passos[pos]
  // o que está na legenda agora: primeiro a fila (respostas), depois o passo
  const atual = fila[0] ?? (passo && (passo.t === "fala" || passo.t === "acao" || passo.t === "nucleo") ? { de: passo.t === "fala" ? passo.de : undefined, texto: passo.texto, tipo: passo.t } : null)
  const chave = `${pos}:${fila.length}:${atual?.texto ?? ""}`
  // fala nova: a legenda recomeça do zero (ajuste no render, sem efeito)
  const [chaveAnt, setChaveAnt] = useState(chave)
  if (chaveAnt !== chave) { setChaveAnt(chave); setLetras(0) }
  // o cartão do que ganhou sai direto do passo
  const mostrando = !fila.length && passo?.t === "ganha" ? passo : null

  // máquina de escrever na legenda
  useEffect(() => {
    if (!atual) return
    const t = setInterval(() => setLetras((n) => {
      if (n >= atual.texto.length) { clearInterval(t); return n }
      return n + 2
    }), 22)
    if (atual.tipo === "nucleo") vib(20)
    else gota(3)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])


  const avancar = () => {
    if (!atual) return
    if (letras < atual.texto.length) { setLetras(atual.texto.length); return }
    if (fila.length) { setFila((f) => f.slice(1)); return }
    setPos((p) => p + 1)
  }

  const escolher = (o: { label: string; tom: Tom; resposta: { de: string; texto: string }[] }) => {
    onTom(o.tom)
    setFila([{ de: "você", texto: o.label, tipo: "fala" }, ...o.resposta.map((r) => ({ de: r.de, texto: r.texto, tipo: "fala" as const }))])
    setPos((p) => p + 1)
  }

  const fecharGanho = () => {
    if (mostrando) setGanhos((g) => ({ objeto: mostrando.objeto ?? g.objeto, reliquias: mostrando.reliquia ? [...g.reliquias, mostrando.reliquia] : g.reliquias }))
    setPos((p) => p + 1)
  }

  return (
    <div className="l-cena" onClick={atual ? avancar : undefined}>
      <div className="l-cena-tarja is-cima" />
      <div className="l-cena-tarja is-baixo" />
      <small className="l-cena-lugar">{LUGARES[cena.lugar].letreiro.toLowerCase()} · {LUGARES[cena.lugar].nome}</small>

      {atual && atual.tipo === "nucleo" && (
        <div className="l-cena-nucleo"><b>NÚCLEO</b><p>{atual.texto.slice(0, letras)}</p></div>
      )}
      {atual && atual.tipo !== "nucleo" && (
        <div className={`l-cena-legenda is-${atual.tipo}`} style={{ ["--cor" as string]: atual.de ? VOZES[atual.de] ?? (atual.de === "ela" ? "#ff3f7a" : "#e6f0ff") : "#e6f0ff" }}>
          {atual.de && <small>{atual.de}</small>}
          <p>{atual.texto.slice(0, letras)}</p>
          {letras >= atual.texto.length && <i className="l-cena-toque">toca pra seguir</i>}
        </div>
      )}

      {!atual && passo?.t === "escolha" && (
        <div className="l-cena-escolhas" onClick={(e) => e.stopPropagation()}>
          {passo.opcoes.map((o) => (
            <button key={o.label} type="button" onClick={() => escolher(o)}>{o.label}</button>
          ))}
        </div>
      )}

      {!atual && passo?.t === "gesto" && passo.id === "copos" && <Copos onNegar={() => setPos((p) => p + 1)} />}
      {!atual && passo?.t === "gesto" && passo.id === "danca" && <Danca onFim={() => setPos((p) => p + 1)} />}

      {mostrando && (
        <Ganho objeto={mostrando.objeto} reliquia={mostrando.reliquia} memoria={mostrando.objeto ? memoria : null} onOk={fecharGanho} />
      )}

      {!atual && passo?.t === "fim" && (
        <div className="l-cena-fim" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onFim({ objeto: ganhos.objeto, reliquias: ganhos.reliquias, caca: !!passo.caca })}>voltar pra kombi →</button>
        </div>
      )}
    </div>
  )
}

// O GESTO do bar: seis copos, cada um uma promessa. Beber é um loop: a
// noite volta pro começo e o bar fica mais bonito e mais vazio. Depois do
// primeiro, aparece a saída que ninguém escolhe: negar a oferta
function Copos({ onNegar }: { onNegar: () => void }) {
  const [bebidos, setBebidos] = useState<string[]>([])
  const [loop, setLoop] = useState<{ n: number; copo: string } | null>(null)
  const todos = bebidos.length === COPOS.length
  const beber = (id: string) => {
    vib([20, 40, 20])
    gota(1)
    setBebidos((b) => [...b, id])
    setLoop({ n: bebidos.length + 1, copo: id })
  }
  const fala = useMemo(() => {
    if (!loop) return null
    const c = COPOS.find((x) => x.id === loop.copo)!
    return c.promessa
  }, [loop])
  return (
    <div className={`l-copos ${loop ? "is-loop" : ""}`} onClick={(e) => e.stopPropagation()} style={{ ["--vazio" as string]: String(bebidos.length / COPOS.length) }}>
      {loop && (
        <div key={loop.n} className="l-copos-loop">
          <p className="l-copos-ela">{fala}</p>
          <small>a noite volta pro começo. noite {loop.n + 1}. o bar tá mais bonito. e mais vazio</small>
          <p className="l-copos-mub">Mubarak: chegou. senta aí</p>
        </div>
      )}
      {todos ? (
        <p className="l-copos-ela">agora que você encontrou todas as respostas, o que mais poderia querer?</p>
      ) : (
        <div className="l-copos-grade">
          {COPOS.map((c) => (
            <button key={c.id} type="button" className={bebidos.includes(c.id) ? "is-bebido" : ""} disabled={bebidos.includes(c.id)} onClick={() => beber(c.id)}>
              <i aria-hidden />
              <b>{c.nome}</b>
            </button>
          ))}
        </div>
      )}
      {bebidos.length > 0 && (
        <button type="button" className="l-copos-negar" onClick={onNegar}>negar a oferta</button>
      )}
    </div>
  )
}

// O GESTO da balada: o Drewboy dança e você marca o ritmo. Um anel fecha no
// compasso; tocar quando ele encosta no círculo é acertar. Cada acerto abaixa
// uns celulares na pista. Oito e ele se solta (errar não tira nada)
const BATIDA = 560 // ms (~107 bpm)
function Danca({ onFim }: { onFim: () => void }) {
  const [t0] = useState(() => performance.now())
  const [acertos, setAcertos] = useState(0)
  const [ultimo, setUltimo] = useState<{ ok: boolean; n: number } | null>(null)
  const META = 8
  const tocar = () => {
    const fase = ((performance.now() - t0) % BATIDA) / BATIDA
    const ok = fase > 0.8 || fase < 0.12
    if (ok) { vib(18); gota(5); setAcertos((a) => a + 1) }
    setUltimo((u) => ({ ok, n: (u?.n ?? 0) + 1 }))
  }
  useEffect(() => {
    if (acertos < META) return
    const t = setTimeout(onFim, 900)
    return () => clearTimeout(t)
  }, [acertos, onFim])
  const celulares = Math.max(0, 200 - Math.round((acertos / META) * 200))
  return (
    <div className="l-danca" onClick={(e) => { e.stopPropagation(); if (acertos < META) tocar() }} style={{ ["--batida" as string]: `${BATIDA}ms` }}>
      <div className="l-danca-alvo">
        <i className="l-danca-anel" />
        <b>{acertos >= META ? "solta" : "toca no ritmo"}</b>
      </div>
      {ultimo && <small key={ultimo.n} className={`l-danca-eco ${ultimo.ok ? "is-ok" : ""}`}>{ultimo.ok ? "isso" : "…"}</small>}
      <p className="l-danca-conta">celulares levantados: {celulares}</p>
      <div className="l-danca-barra"><i style={{ width: `${(acertos / META) * 100}%` }} /></div>
    </div>
  )
}

function Ganho({ objeto, reliquia, memoria, onOk }: { objeto?: EstacaoId; reliquia?: Reliquia; memoria: number | null; onOk: () => void }) {
  const e = objeto ? getEstacao(objeto) : null
  const r = reliquia ? RELIQUIAS[reliquia] : null
  useEffect(() => { vib([30, 50, 30]) }, [])
  return (
    <div className="l-cena-ganha" onClick={(ev) => { ev.stopPropagation(); onOk() }} style={{ ["--cor" as string]: e?.cor ?? "#b8ffcf" }}>
      <small>{r ? "uma relíquia · ela vai pro deserto" : "você ganhou"}</small>
      <b>{r ? r.nome : e?.objetoNome}</b>
      <p>{r ? r.texto : `a 222 ganhou ${e?.faixa}. liga o RÁDIO`}</p>
      {r && e && <p className="l-cena-ganha-mais">e a 222 ganhou {e.faixa}</p>}
      {e && memoria !== null && MEMORIAS[memoria] && <blockquote>{MEMORIAS[memoria]}</blockquote>}
      <i className="l-cena-toque">toca pra seguir</i>
    </div>
  )
}
