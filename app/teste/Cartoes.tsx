"use client"

import { useEffect, useState } from "react"
import { ROTULO_DIA, dataCurta, idDo, linkDa, mesaOrdenada, type Cartao } from "./mesa"

// A mesa de testes: um cartão por coisa pronta pra testar (os dados em mesa.ts).
// (05/11) Separada por dia, com "✓ testei" em cada cartão. O testei fica guardado
// só neste aparelho (localStorage); sem ele a página funciona igual, só não lembra.
// Com "só os não testados" ligado (o normal), o cartão testado vai pro fim da
// seção, recolhido numa linha, com "desfazer". Desligado, tudo aparece inteiro
// na ordem da mesa, o testado apagadinho.

const GUARDADO = "cn-mesa-testei"
const FILTRO = "cn-mesa-so-novos"

const lerTestei = (): Set<string> => {
  try {
    const v = JSON.parse(localStorage.getItem(GUARDADO) || "[]")
    return new Set(Array.isArray(v) ? v.filter((x) => typeof x === "string") : [])
  } catch { return new Set() }
}
const gravarTestei = (s: Set<string>) => {
  try { localStorage.setItem(GUARDADO, JSON.stringify([...s])) } catch {}
}

// os cartões agrupados por dia, na ordem da mesa (o dia mais novo em cima)
const porDia = (cartoes: Cartao[]) => {
  const dias: { data: string; cartoes: Cartao[] }[] = []
  for (const c of cartoes) {
    const ultimo = dias[dias.length - 1]
    if (ultimo && ultimo.data === c.data) ultimo.cartoes.push(c)
    else dias.push({ data: c.data, cartoes: [c] })
  }
  return dias
}

const tituloDia = (data: string) => (ROTULO_DIA[data] ? `${dataCurta(data)} · ${ROTULO_DIA[data]}` : dataCurta(data))

export function Mesa() {
  const cartoes = mesaOrdenada()
  const [testei, setTestei] = useState<Set<string>>(() => new Set())
  const [soNovos, setSoNovos] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTestei(lerTestei())
    try { if (localStorage.getItem(FILTRO) === "0") setSoNovos(false) } catch {}
  }, [])

  const marcar = (id: string, sim: boolean) => {
    setTestei((antes) => {
      const s = new Set(antes)
      if (sim) s.add(id); else s.delete(id)
      gravarTestei(s)
      return s
    })
  }
  const trocarFiltro = (sim: boolean) => {
    setSoNovos(sim)
    try { localStorage.setItem(FILTRO, sim ? "1" : "0") } catch {}
  }

  const faltam = cartoes.filter((c) => !testei.has(idDo(c))).length

  return (
    <section className="ms-mesa" aria-label="pra testar">
      {cartoes.length === 0 && <p className="ms-vazio">nada pra testar agora.</p>}
      {cartoes.length > 0 && (
        <div className="ms-resumo">
          <p>
            {faltam > 0
              ? <>Novidades: <b>{faltam}</b> {faltam === 1 ? "cartão ainda não testado" : "cartões ainda não testados"}</>
              : <>Tudo testado. Valeu!</>}
          </p>
          <label>
            <input type="checkbox" checked={soNovos} onChange={(e) => trocarFiltro(e.target.checked)} />
            só os não testados
          </label>
        </div>
      )}
      {porDia(cartoes).map((dia) => {
        const novos = dia.cartoes.filter((c) => !testei.has(idDo(c)))
        const feitos = dia.cartoes.filter((c) => testei.has(idDo(c)))
        return (
          <div key={dia.data} className="ms-dia">
            <h3 className="ms-dia-titulo">
              <span>{tituloDia(dia.data)}</span>
              <small>{novos.length > 0 ? `${novos.length} pra testar` : "tudo testado"}</small>
            </h3>
            {soNovos ? (
              <>
                {novos.map((c) => <Inteiro key={idDo(c)} c={c} feito={false} trocar={() => marcar(idDo(c), true)} />)}
                {feitos.map((c) => <Recolhido key={idDo(c)} c={c} desfazer={() => marcar(idDo(c), false)} />)}
              </>
            ) : (
              dia.cartoes.map((c) => {
                const feito = testei.has(idDo(c))
                return <Inteiro key={idDo(c)} c={c} feito={feito} trocar={() => marcar(idDo(c), !feito)} />
              })
            )}
          </div>
        )
      })}
    </section>
  )
}

function Inteiro({ c, feito, trocar }: { c: Cartao; feito: boolean; trocar: () => void }) {
  return (
    <article className={feito ? "ms-cartao ms-cartao-feito" : "ms-cartao"} data-parte={c.parte}>
      <div className="ms-topo">
        <time dateTime={c.data}>{dataCurta(c.data)}</time>
        {c.tarefa && <span>{c.tarefa}</span>}
      </div>
      <h2>{c.nome}</h2>
      <p className="ms-olhar">{c.olhar}</p>
      {c.perguntas.length > 0 && (
        <div className="ms-perguntas">
          <b>pra você responder</b>
          <ul>{c.perguntas.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}
      <a className="ms-abrir" href={linkDa(c.parte)}>Abrir</a>
      {c.mais && c.mais.length > 0 && (
        <div className="ms-mais">
          {c.mais.map((m) => <a key={m.parte} href={linkDa(m.parte)}>{m.nome} →</a>)}
        </div>
      )}
      <div className="ms-pe">
        <a className="ms-anotar" href={`${linkDa(c.parte)}&caderno`}>✎ anotar no jogo</a>
        <button type="button" className={feito ? "ms-testei ms-desfazer" : "ms-testei"} onClick={trocar}>
          {feito ? "✓ testado · desfazer" : "✓ testei"}
        </button>
      </div>
    </article>
  )
}

function Recolhido({ c, desfazer }: { c: Cartao; desfazer: () => void }) {
  return (
    <article className="ms-recolhido" data-parte={c.parte}>
      <span aria-hidden>✓</span>
      <a href={linkDa(c.parte)}>{c.nome}</a>
      <button type="button" onClick={desfazer}>desfazer</button>
    </article>
  )
}
