"use client"

// LINHA 222 — a experiência de entrada da Cidade Neon, refeita.
//
// entrada → tela de bloqueio → D-Bee (DM) → grupo "linha 222" (a leitura:
// qual estação você é) → a linha inteira aberta pra explorar → Kombi até a
// estação → conversa + prova + objeto → … → estação 6 (LU2CA) → final.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./linha.css"
import { ESTACOES, NIVEIS, UNTITLED, type ProvaId, dataCurta, estacao as getEstacao, lancada, missao, nivelDe, type Estacao, type EstacaoId } from "./data"
import { ECOS, VOZES, type ChatId } from "./roteiros"
import { VAZIO, apagar, carregar, gravar, hoje, sequencia, type Save } from "./estado"
import { FREQUENCIAS, faixasDe, freqsLiberadas, proximaFreq, type FreqId } from "./radio"
import { Chat } from "./chat"
import { Prova } from "./provas"
import { Viagem, type Stats } from "./viagem"
import { Objeto } from "./objetos"
import { audioCtx, gota, ligarChuva, mudo, player } from "./som"
import { compartilhar, icsHref } from "./util"
import { track } from "@/lib/analytics"

type Tela =
  | { t: "entrada" }
  | { t: "bloqueio" }
  | { t: "chat"; id: Exclude<ChatId, "ojala" | "swav" | "rollercoaster"> }
  | { t: "mapa" }
  | { t: "viagem"; destino: EstacaoId }
  | { t: "final" }

type Aviso = { id: number; titulo: string; texto: string; cor: string }

export default function LinhaPage() {
  const [save, setSave] = useState<Save>(VAZIO)
  const [pronto, setPronto] = useState(false)
  const [tela, setTela] = useState<Tela>({ t: "entrada" })
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [semSom, setSemSom] = useState(false)
  const [xpFlutua, setXpFlutua] = useState<{ id: number; n: number } | null>(null)
  const nivelAnt = useRef<number | null>(null)
  const [provaDev, setProvaDev] = useState<ProvaId | null>(null)

  useEffect(() => {
    const s = carregar()
    const h = hoje()
    // hidratação do localStorage: só existe no cliente, depois do mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSave(s.dias.includes(h) ? s : { ...s, dias: [...s.dias, h].slice(-60) })
    setPronto(true)
    if (process.env.NODE_ENV !== "production") setProvaDev(new URLSearchParams(location.search).get("prova") as ProvaId | null)
    track("place_entered", { place_id: "linha-222", place_type: "linha" })
  }, [])

  useEffect(() => {
    if (pronto) gravar(save)
  }, [save, pronto])

  const atualizar = useCallback((f: (s: Save) => Save) => setSave(f), [])

  const avisar = useCallback((titulo: string, texto: string, cor = "#2fe8ff") => {
    const id = Date.now()
    setAviso({ id, titulo, texto, cor })
    setTimeout(() => setAviso((a) => (a?.id === id ? null : a)), 4200)
  }, [])

  const ganharXp = useCallback((n: number) => {
    setSave((s) => ({ ...s, xp: s.xp + n }))
    setXpFlutua({ id: Date.now(), n })
  }, [])

  // subir de nível é um momento — não um número mudando em silêncio
  const nivel = nivelDe(save)
  useEffect(() => {
    if (!pronto) return
    if (nivelAnt.current !== null && nivel > nivelAnt.current) {
      const n = NIVEIS[nivel]
      avisar(`nível ${n.nome}`, `libera ${n.libera}`, "#ffc857")
      try { navigator.vibrate?.([20, 40, 20, 40, 60]) } catch {}
      track("mission_completed", { mission_id: `linha-nivel-${n.nome}`, duration_ms: 0 })
    }
    nivelAnt.current = nivel
  }, [nivel, pronto, avisar])

  const entrar = () => {
    audioCtx()
    ligarChuva()
    if (save.completos.includes("grupo")) setTela({ t: "mapa" })
    else if (save.completos.includes("abertura")) setTela({ t: "chat", id: "grupo" })
    else setTela({ t: "bloqueio" })
  }

  const fimChat = (id: ChatId, para: ChatId | "mapa") => {
    if (id !== "abertura" && id !== "grupo" && getEstacao(id as EstacaoId)) {
      track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    }
    if (id === "nectar") setTela({ t: "final" })
    else if (para === "mapa") setTela({ t: "mapa" })
    else setTela({ t: "chat", id: para as "grupo" })
  }

  const chegar = (e: Estacao, st: Stats) => {
    ganharXp(20 + st.orbs * 2 + st.quase * 5)
    setSave((s) => {
      const r = s.recordes[e.id]
      return { ...s, recordes: { ...s.recordes, [e.id]: r ? Math.min(r, st.tempo) : st.tempo } }
    })
    const m = missao(e, nivel)
    if (m.ok && (e.prova && (ROTEIRO_IDS as string[]).includes(e.id))) {
      track("mission_started", { mission_id: `linha-${e.id}`, place_id: "linha-222" })
      setTela({ t: "chat", id: e.id as never })
    } else {
      setTela({ t: "mapa" })
      avisar(e.personagem, m.ok ? "volta depois" : m.motivo === "nivel" ? `a missão daqui abre no nível ${NIVEIS[3].nome}` : "descobre sua estação no grupo primeiro", e.cor)
    }
  }

  const alternarSom = () => {
    const m = !semSom
    setSemSom(m)
    mudo(m)
  }

  if (!pronto) return <div className="l-raiz" />

  // atalho de desenvolvimento: /linha?prova=regar mostra só a prova
  if (process.env.NODE_ENV !== "production" && provaDev) {
    const e = ESTACOES.find((x) => x.prova === provaDev)
    return (
      <div className="l-raiz">
        <div className="l-palco" onPointerDown={() => audioCtx()}>
          <div className="l-chat" style={{ ["--cor" as string]: e?.cor }}>
            <div className="l-chat-corpo">
              <Prova id={provaDev} cor={e?.cor ?? "#2fe8ff"} onFim={(p) => avisar("prova", p ? "pulou" : "feita ✓")} />
            </div>
          </div>
          {aviso && <div key={aviso.id} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}><b>{aviso.titulo}</b><span>{aviso.texto}</span></div>}
        </div>
      </div>
    )
  }

  return (
    <div className="l-raiz">
      <div className="l-palco">
        {tela.t === "entrada" && <Entrada save={save} onEntrar={entrar} />}
        {tela.t === "bloqueio" && <Bloqueio onAbrir={() => setTela({ t: "chat", id: "abertura" })} />}
        {tela.t === "chat" && (
          <Chat
            key={tela.id}
            id={tela.id}
            save={save}
            atualizar={atualizar}
            onXp={ganharXp}
            onFim={(para) => fimChat(tela.id, para)}
            onVoltar={save.completos.includes("grupo") ? () => setTela({ t: "mapa" }) : undefined}
          />
        )}
        {tela.t === "mapa" && (
          <Mapa
            save={save}
            nivel={nivel}
            atualizar={atualizar}
            onGrupo={() => setTela({ t: "chat", id: "grupo" })}
            onViajar={(id) => { player.pausar(); setTela({ t: "viagem", destino: id }) }}
            onEstacao={(id) => setTela({ t: "chat", id: id as never })}
            onFinal={() => setTela({ t: "final" })}
          />
        )}
        {tela.t === "viagem" && (
          <Viagem
            key={tela.destino}
            destino={getEstacao(tela.destino)}
            save={save}
            turbo={nivel >= 2}
            onSinal={(total, freq) => setSave((s) => ({ ...s, sinal: total, freq: freq ?? s.freq }))}
            onChegar={(st) => chegar(getEstacao(tela.destino), st)}
            onSair={() => setTela({ t: "mapa" })}
          />
        )}
        {tela.t === "final" && <Final save={save} onVoltar={() => setTela({ t: "mapa" })} />}

        {tela.t !== "entrada" && tela.t !== "viagem" && (
          <button type="button" className="l-som" onClick={alternarSom} aria-label={semSom ? "ligar som" : "desligar som"}>
            {semSom ? "som off" : "som on"}
          </button>
        )}
        {aviso && (
          <div key={aviso.id} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}>
            <b>{aviso.titulo}</b>
            <span>{aviso.texto}</span>
          </div>
        )}
        {xpFlutua && tela.t !== "viagem" && <div key={xpFlutua.id} className="l-xp-flutua">+{xpFlutua.n} luz</div>}
      </div>
    </div>
  )
}

const ROTEIRO_IDS: EstacaoId[] = ["chuva", "copo", "dopamina", "sexta", "ontem", "nectar"]

/* ─── ENTRADA ───────────────────────────────────────────── */
function Entrada({ save, onEntrar }: { save: Save; onEntrar: () => void }) {
  const volta = save.completos.includes("abertura")
  return (
    <section className="l-entrada">
      <div className="l-entrada-foto" />
      <div className="l-agua" />
      <div className="l-chuva-css" />
      <div className="l-entrada-conteudo">
        <p className="l-rotulo">lu2ca · vol.1 · linha 222</p>
        <h1 className="l-titulo">
          <span>cidade</span>
          <span>neon</span>
        </h1>
        <p className="l-entrada-poema">
          a cidade tá alagada de neon.
          <br />o povo anda em loop e acha que é vida.
          <br />
          <em>tem gente acordada ainda.</em>
        </p>
        <button type="button" className="l-btn l-btn-entrar" onClick={onEntrar}>
          {volta ? `voltar pra cidade${save.nome ? `, ${save.nome}` : ""}` : "tô acordado"}
        </button>
        <p className="l-entrada-nota">
          {volta
            ? `${save.objetos.length}/9 objetos · ${sequencia(save.dias)} ${sequencia(save.dias) === 1 ? "dia" : "dias"} acordado`
            : "melhor com fone 🎧"}
        </p>
      </div>
    </section>
  )
}

/* ─── TELA DE BLOQUEIO ──────────────────────────────────── */
function Bloqueio({ onAbrir }: { onAbrir: () => void }) {
  const [n, setN] = useState(0)
  const agora = new Date()
  useEffect(() => {
    const ts = [700, 2100, 3300].map((ms, i) => setTimeout(() => {
      setN(i + 1)
      gota(i + 3)
      try { navigator.vibrate?.(i === 2 ? [30, 60, 30] : 12) } catch {}
    }, ms))
    return () => ts.forEach(clearTimeout)
  }, [])
  const notifs = [
    { app: "NÚCLEO", txt: "sua rotina foi otimizada. nada mudou ✓", cor: "#8aa0c8" },
    { app: "NÚCLEO", txt: "você dormiu 4h12. ótimo para a produtividade ✓", cor: "#8aa0c8" },
    { app: "N3XO · [desconhecido]", txt: "sabe ontem?", cor: "#2fe8ff", abrir: true },
  ]
  return (
    <section className="l-bloqueio">
      <div className="l-bloqueio-foto" />
      <div className="l-chuva-css" />
      <div className="l-bloqueio-hora">
        <span>{agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
        <b>{agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>
      </div>
      <div className="l-notifs">
        {notifs.slice(0, n).map((x, i) => (
          <button
            key={i}
            type="button"
            className={`l-notif ${x.abrir ? "is-chave" : ""}`}
            style={{ ["--cor" as string]: x.cor }}
            onClick={x.abrir ? onAbrir : undefined}
          >
            <small>{x.app} · agora</small>
            <span>{x.txt}</span>
          </button>
        ))}
      </div>
      {n >= 3 && <p className="l-bloqueio-dica">toca na mensagem</p>}
    </section>
  )
}

/* ─── MAPA: A LINHA 222 ─────────────────────────────────── */
function Mapa({
  save, nivel, atualizar, onGrupo, onViajar, onEstacao, onFinal,
}: {
  save: Save
  nivel: number
  atualizar: (f: (s: Save) => Save) => void
  onGrupo: () => void
  onViajar: (id: EstacaoId) => void
  onEstacao: (id: EstacaoId) => void
  onFinal: () => void
}) {
  const [aberta, setAberta] = useState<EstacaoId | null>(null)
  const [radio, setRadio] = useState(false)
  const ecos = save.objetos.filter((o) => !save.ecosVistos.includes(o) && ECOS[o]).length
  const prox = NIVEIS[Math.min(nivel + 1, NIVEIS.length - 1)]
  const dias = sequencia(save.dias)
  const minha = save.estacao ? getEstacao(save.estacao) : null
  const libs = freqsLiberadas(save.sinal)

  // qual estação sugerir agora: a primeira com missão aberta e sem objeto,
  // começando pela da própria pessoa
  const sugerida = useMemo(() => {
    const ordem = minha ? [minha, ...ESTACOES.filter((e) => e.id !== minha.id)] : ESTACOES
    return ordem.find((e) => missao(e, nivel).ok && !save.objetos.includes(e.id))?.id ?? null
  }, [minha, nivel, save.objetos])

  return (
    <section className="l-mapa">
      <header className="l-mapa-topo">
        <div className="l-perfil">
          <div className="l-perfil-estacao" style={{ ["--cor" as string]: minha?.cor ?? "#2fe8ff" }}>
            {minha ? <Objeto id={minha.objeto} cor={minha.cor} size={22} /> : "?"}
          </div>
          <div>
            <b>{save.nome || "você"}</b>
            <small>{NIVEIS[nivel].nome}{minha ? ` · estação ${minha.n}` : ""}</small>
          </div>
        </div>
        <div className="l-stats">
          <span title="luz"><b>{save.xp}</b> luz</span>
          <span title="dias seguidos"><b>{dias}</b> {dias === 1 ? "dia" : "dias"}</span>
        </div>
      </header>

      {nivel < 4 && (
        <div className="l-proximo">
          <div className="l-niveis">
            {NIVEIS.map((n, i) => <i key={n.nome} className={i <= nivel ? "is-feito" : ""} />)}
          </div>
          <p>
            próximo: <b>{prox.nome}</b> — {prox.como} <span>· libera {prox.libera}</span>
          </p>
        </div>
      )}
      {nivel >= 4 && (
        <button type="button" className="l-proximo is-final" onClick={onFinal}>
          <p><b>você acordou.</b> abrir o fim da linha →</p>
        </button>
      )}

      <div className="l-atalhos">
        <button type="button" className="l-atalho" onClick={onGrupo}>
          <span className="l-atalho-ic">222</span>
          <span><b>grupo linha 222</b><small>{ecos ? `${ecos} ${ecos === 1 ? "novidade" : "novidades"}` : "6 pessoas acordadas"}</small></span>
          {ecos > 0 && <em className="l-badge">{ecos}</em>}
        </button>
        <button type="button" className="l-atalho" onClick={() => setRadio(true)}>
          <span className="l-atalho-ic is-radio">FM</span>
          <span><b>rádio 222</b><small>{libs.length}/{FREQUENCIAS.length} frequências</small></span>
        </button>
      </div>

      <ol className="l-linha">
        {ESTACOES.map((e) => {
          const m = missao(e, nivel)
          const tem = save.objetos.includes(e.id)
          const escuro = !m.ok && m.motivo === "data"
          const sua = save.estacao === e.id
          return (
            <li key={e.id} className={`l-parada ${tem ? "is-feita" : ""} ${escuro ? "is-escuro" : ""} ${sugerida === e.id ? "is-sugerida" : ""}`} style={{ ["--cor" as string]: e.cor }}>
              <button type="button" onClick={() => setAberta(e.id)}>
                <span className="l-parada-n">{tem ? <Objeto id={e.objeto} cor="#050510" size={16} /> : e.n}</span>
                <span className="l-parada-txt">
                  <b>{e.faixa}</b>
                  <small>
                    {e.personagem} · {e.objetoNome}
                  </small>
                </span>
                <span className="l-parada-tag">
                  {sua && <em>sua</em>}
                  {tem ? "✓" : escuro && e.lancamento ? `abre ${dataCurta(e.lancamento)}` : sugerida === e.id ? "missão" : m.ok ? "aberta" : m.motivo === "nivel" ? "ativista" : ""}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <button type="button" className="l-recomecar" onClick={() => { if (confirm("apagar seu progresso e começar do zero?")) { apagar(); location.reload() } }}>
        recomeçar do zero
      </button>

      {aberta && (
        <FichaEstacao
          e={getEstacao(aberta)}
          save={save}
          nivel={nivel}
          onFechar={() => { player.pausar(); setAberta(null) }}
          onViajar={() => onViajar(aberta)}
          onConversa={() => onEstacao(aberta)}
        />
      )}
      {radio && <Radio save={save} atualizar={atualizar} onFechar={() => setRadio(false)} />}
    </section>
  )
}

function FichaEstacao({ e, save, nivel, onFechar, onViajar, onConversa }: {
  e: Estacao; save: Save; nivel: number; onFechar: () => void; onViajar: () => void; onConversa: () => void
}) {
  const m = missao(e, nivel)
  const saiu = lancada(e)
  const tem = save.objetos.includes(e.id)
  const [tocando, setTocando] = useState(false)
  useEffect(() => player.ouvir((s) => setTocando(s.src === e.audio && s.tocando)), [e.audio])
  const recorde = save.recordes[e.id]
  return (
    <div className="l-ficha-fundo" onClick={onFechar}>
      <div className="l-ficha" style={{ ["--cor" as string]: e.cor }} onClick={(ev) => ev.stopPropagation()}>
        <div className="l-ficha-alca" />
        <small className="l-rotulo">estação {e.n}</small>
        <h2>{e.faixa}</h2>
        <p className="l-ficha-cidade">“{e.cidade}”</p>
        <p className="l-ficha-par">{e.luz} <i>×</i> {e.sombra}</p>
        <div className="l-ficha-quem">
          <Objeto id={e.objeto} cor={e.cor} size={34} />
          <span><b>{e.personagem}</b> guarda {e.objetoNome}{tem ? " — já é seu" : ""}</span>
        </div>

        {(saiu || tem) && (
          <div className="l-ficha-ouvir">
            <button type="button" onClick={() => player.alternar(e.audio)}>{tocando ? "❚❚ pausar" : "▶ ouvir um pedaço"}</button>
            <a
              href={`${e.ouvir}${e.ouvir.includes("?") ? "&" : "?"}utm_source=cidade-neon&utm_medium=game&utm_campaign=linha-222`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("external_link_click", { destination: e.ouvir.includes("spotify") ? "spotify" : "other", track_id: e.id, place_id: "linha-222" })}
            >
              ouvir inteira ↗
            </a>
          </div>
        )}

        {!m.ok && m.motivo === "data" && e.lancamento && (
          <div className="l-ficha-escuro">
            <p>estação no escuro. {e.personagem} acende ela dia <b>{dataCurta(e.lancamento)}</b>.</p>
            <a className="l-btn l-btn-ghost" href={icsHref(e)} download={`linha-222-${e.id}.ics`}>me lembra no calendário</a>
          </div>
        )}
        {!m.ok && m.motivo === "estacao" && <p className="l-ficha-trava">descobre sua estação no grupo pra liberar as missões.</p>}
        {!m.ok && m.motivo === "nivel" && <p className="l-ficha-trava">a missão daqui abre no nível <b>ativista</b> (4 objetos). vc tem {save.objetos.length}.</p>}

        {(m.ok || (m.motivo !== "data")) && (
          <div className="l-ficha-acoes">
            <button type="button" className="l-btn" onClick={onViajar}>
              ir de kombi {recorde ? <small>recorde {recorde.toFixed(1)}s</small> : null}
            </button>
            {save.completos.includes(e.id as never) && (
              <button type="button" className="l-btn l-btn-ghost" onClick={onConversa}>reler a conversa</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Radio({ save, atualizar, onFechar }: { save: Save; atualizar: (f: (s: Save) => Save) => void; onFechar: () => void }) {
  const [agora, setAgora] = useState<string | null>(null)
  useEffect(() => player.ouvir((s) => setAgora(s.tocando ? s.src : null)), [])
  const prox = proximaFreq(save.sinal)
  const tocar = (id: FreqId, i = 0) => {
    const f = FREQUENCIAS.find((x) => x.id === id)!
    const l = faixasDe(f, save.objetos, save.estacao)
    if (!l.length) return
    player.tocar(l[i % l.length].src, () => tocar(id, i + 1))
    atualizar((s) => ({ ...s, freq: id }))
    track("music_play_started", { track_id: l[i % l.length].src, track_name: l[i % l.length].titulo, source: "radio", place_id: "linha-222" })
  }
  return (
    <div className="l-ficha-fundo" onClick={onFechar}>
      <div className="l-ficha l-radio" onClick={(e) => e.stopPropagation()}>
        <div className="l-ficha-alca" />
        <small className="l-rotulo">rádio 222</small>
        <h2>frequências</h2>
        <p className="l-ficha-cidade">
          {prox
            ? `pega sinal na estrada pra destravar a próxima: faltam ${prox.custo - save.sinal} (orbs e passadas raspando no tráfego).`
            : "todas as frequências destravadas. a cidade toda toca pra você."}
        </p>
        <ul>
          {FREQUENCIAS.map((f) => {
            const lib = save.sinal >= f.custo
            const faixas = faixasDe(f, save.objetos, save.estacao)
            const tocandoAqui = !!agora && faixas.some((x) => x.src === agora)
            return (
              <li key={f.id} className={lib ? "" : "is-trancada"} style={{ ["--cor" as string]: f.cor }}>
                <button type="button" disabled={!lib || !faixas.length} onClick={() => (tocandoAqui ? player.pausar() : tocar(f.id))}>
                  <b>{f.freq}</b>
                  <span>
                    {f.nome}
                    <small>{lib ? (faixas.length ? `${faixas.length} faixas` : "pega um objeto pra ela tocar") : `${save.sinal}/${f.custo} de sinal`}</small>
                  </span>
                  <em>{lib ? (tocandoAqui ? "❚❚" : "▶") : "🔒"}</em>
                </button>
                {lib && f.link && (
                  <a href={f.link} target="_blank" rel="noopener noreferrer" onClick={() => track("external_link_click", { destination: "untitled", place_id: "linha-222-radio" })}>
                    completo no untitled ↗
                  </a>
                )}
                {!lib && <div className="l-radio-barra"><i style={{ width: `${Math.min(100, (save.sinal / f.custo) * 100)}%` }} /></div>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ─── FINAL ─────────────────────────────────────────────── */
function Final({ save, onVoltar }: { save: Save; onVoltar: () => void }) {
  const proxima = ESTACOES.find((e) => !lancada(e) && e.lancamento && !save.objetos.includes(e.id)) ?? null
  const minha = save.estacao ? getEstacao(save.estacao) : null
  return (
    <section className="l-final">
      <div className="l-entrada-foto is-final" />
      <div className="l-agua" />
      <div className="l-final-conteudo">
        <p className="l-rotulo">fim da linha · por enquanto</p>
        <h1 className="l-titulo is-menor"><span>você</span><span>acordou</span></h1>
        <div className="l-colecao">
          {ESTACOES.map((e) => (
            <div key={e.id} className={save.objetos.includes(e.id) ? "is-tem" : ""} style={{ ["--cor" as string]: e.cor }} title={e.objetoNome}>
              <Objeto id={e.objeto} cor={save.objetos.includes(e.id) ? e.cor : "rgba(255,255,255,.18)"} size={26} />
            </div>
          ))}
        </div>
        {save.linha && <blockquote>“{save.linha}” <cite>— {save.nome}, no caderno do Alohan</cite></blockquote>}
        <div className="l-antivenda">
          <p>isso não é produto.</p>
          <p>as 22 faixas, o live, o instrumental e o subúrbio xênon moram num lugar só.</p>
          <p>levar pra casa significa sustentar uma coisa que existe fora do sistema.</p>
          <a
            className="l-btn"
            href={`${UNTITLED}?utm_source=cidade-neon&utm_medium=game&utm_campaign=linha-222-final`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("external_link_click", { destination: "untitled", place_id: "linha-222-final" })}
          >
            a cidade inteira, no untitled
          </a>
        </div>
        {proxima?.lancamento && (
          <div className="l-final-proxima" style={{ ["--cor" as string]: proxima.cor }}>
            <p>a estação {proxima.n}, <b>{proxima.faixa}</b>, acende dia {dataCurta(proxima.lancamento)}. {proxima.personagem} vai estar lá.</p>
            <a href={icsHref(proxima)} download={`linha-222-${proxima.id}.ics`}>me lembra</a>
          </div>
        )}
        <div className="l-final-acoes">
          <button type="button" className="l-btn l-btn-ghost" onClick={() => compartilhar(`acordei na cidade neon.${minha ? ` sou da estação ${minha.n}, ${minha.faixa.toLowerCase()}.` : ""} ${save.objetos.length}/9 objetos. e vc?`)}>
            compartilhar
          </button>
          <button type="button" className="l-btn l-btn-ghost" onClick={onVoltar}>voltar pra linha</button>
        </div>
        <p className="l-final-voz" style={{ color: VOZES.LU2CA }}>“constante fase de teste”</p>
      </div>
    </section>
  )
}
