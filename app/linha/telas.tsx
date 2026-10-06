"use client"

// Telas da Linha 222 fora do celular (entrada, bloqueio, final) e os apps
// nativos grandes (a linha/mapa, a rádio).

import { CREDITO_KOMBI, CREDITO_SUBURBIO } from "./estrada/creditos"
import { useEffect, useMemo, useState } from "react"
import { ESTACOES, NIVEIS, UNTITLED, dataCurta, estacao as getEstacao, lancada, missao, type Estacao, type EstacaoId } from "./data"
import { ativa, conhecidos } from "./missoes"
import { ECOS, VOZES } from "./roteiros"
import { recomecar, sequencia, type Save } from "./estado"
import { FREQUENCIAS, faixasDe, freqsLiberadas, proximaFreq, type FreqId } from "./radio"
import { Objeto } from "./objetos"
import { gota, player } from "./som"
import { compartilhar, icsHref } from "./util"
import { track } from "@/lib/analytics"
import { AppTopo } from "./os"

export const ROTEIRO_IDS: EstacaoId[] = ["chuva", "copo", "dopamina", "sexta", "ontem", "nectar"]

/* ─── ENTRADA ───────────────────────────────────────────── */
export function Entrada({ save, onEntrar }: { save: Save; onEntrar: () => void }) {
  const volta = save.completos.includes("abertura")
  const temProgresso = save.completos.length > 0 || !!save.estacao || save.objetos.length > 0
  // apagar tudo pede dois toques (não tem volta)
  const [certeza, setCerteza] = useState(false)
  useEffect(() => {
    if (!certeza) return
    const t = setTimeout(() => setCerteza(false), 4000)
    return () => clearTimeout(t)
  }, [certeza])
  return (
    <section className="l-entrada">
      <div className="l-entrada-foto" />
      <div className="l-agua" />
      <div className="l-chuva-css" />
      <div className="l-entrada-conteudo">
        <p className="l-rotulo">lu2ca · vol.1 · 222</p>
        <h1 className="l-titulo">
          <span>cidade</span>
          <span>neon</span>
        </h1>
        <p className="l-entrada-poema">
          ninguém chega na cidade neon do mesmo jeito
          <br />uns caem aqui dormindo
          <br />uns entram querendo saber
          <br />
          <em>uns voltam pq lembram de ontem</em>
        </p>
        <button type="button" className="l-btn l-btn-entrar" onClick={onEntrar}>
          {volta ? `voltar pra cidade${save.nome ? `, ${save.nome}` : ""}` : "tô acordado"}
        </button>
        <p className="l-entrada-nota">
          {volta
            ? `${save.objetos.length}/9 objetos · ${sequencia(save.dias)} ${sequencia(save.dias) === 1 ? "dia" : "dias"} acordado`
            : "melhor com fone 🎧"}
        </p>
        {temProgresso && (
          <button type="button" className={`l-entrada-zero ${certeza ? "is-certeza" : ""}`} onClick={() => (certeza ? recomecar() : setCerteza(true))}>
            {certeza ? "apaga tudo, até a leitura. toca de novo pra confirmar" : "começar do início"}
          </button>
        )}
      </div>
    </section>
  )
}

/* ─── TELA DE BLOQUEIO ──────────────────────────────────── */
export function Bloqueio({ onAbrir }: { onAbrir: () => void }) {
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
export function Mapa({
  save, nivel, atualizar, onGrupo, onViajar, onEstacao, onFinal, onVoltar,
}: {
  save: Save
  nivel: number
  atualizar: (f: (s: Save) => Save) => void
  onVoltar: () => void
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

  // a estação da missão que está valendo (uma de cada vez, na ordem do fio)
  const sugerida = useMemo(() => ativa(save, nivel), [save, nivel])
  const quem = useMemo(() => conhecidos(save, nivel), [save, nivel])

  return (
    <section className="l-mapa">
      <AppTopo titulo="LINHA 9" cor="#ffc857" onVoltar={onVoltar} />
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
          <span title="neon"><b>{save.neon ?? 0}</b> neon</span>
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
          <span><b>grupo 222</b><small>{ecos ? `${ecos} ${ecos === 1 ? "novidade" : "novidades"}` : `${save.objetos.length} de 9 músicas de volta na rua`}</small></span>
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
                    {quem.includes(e.id) ? `${e.personagem} · ${e.objetoNome}` : escuro ? "no escuro" : "alguém acordado"}
                  </small>
                </span>
                <span className="l-parada-tag">
                  {sua && <em>sua</em>}
                  {tem ? "✓" : escuro && e.lancamento ? `abre ${dataCurta(e.lancamento)}` : sugerida === e.id ? "missão" : ""}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <button type="button" className="l-recomecar" onClick={() => { if (confirm("apagar seu progresso e começar do zero?")) recomecar() }}>
        recomeçar do zero
      </button>
      <p className="l-creditos">subúrbio xenom: {CREDITO_SUBURBIO}<br />a kombi: {CREDITO_KOMBI}</p>

      {aberta && (
        <FichaEstacao
          e={getEstacao(aberta)}
          save={save}
          nivel={nivel}
          onFechar={() => { player.pausar(); setAberta(null) }}
          onViajar={() => onViajar(aberta)}
          onConversa={() => onEstacao(aberta)}
          conhece={quem.includes(aberta)}
        />
      )}
      {radio && <Radio save={save} atualizar={atualizar} onFechar={() => setRadio(false)} />}
    </section>
  )
}

export function FichaEstacao({ e, save, nivel, onFechar, onViajar, onConversa, conhece = true }: {
  e: Estacao; save: Save; nivel: number; onFechar: () => void; onViajar: () => void; onConversa: () => void; conhece?: boolean
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
          <span>{conhece ? <><b>{e.personagem}</b> guarda {e.objetoNome}{tem ? " — já é seu" : ""}</> : "alguém acordado mora aqui. ainda não te chamou"}</span>
        </div>

        {(saiu || tem) && (
          <div className="l-ficha-ouvir">
            {/* ouvir aqui dentro é recompensa: só depois de ganhar o objeto */}
            {tem && <button type="button" onClick={() => player.alternar(e.audio)}>{tocando ? "❚❚ pausar" : "▶ ouvir um pedaço"}</button>}
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
        {!m.ok && m.motivo === "estacao" && <p className="l-ficha-trava">descobre sua estação com a D-Bee pra liberar as missões.</p>}

        {(m.ok || (m.motivo !== "data")) && (
          <div className="l-ficha-acoes">
            <button type="button" className="l-btn" onClick={onViajar}>
              ir de kombi {recorde ? <small>recorde {recorde.toFixed(1)}s</small> : null}
            </button>
            {conhece && (m.ok || save.completos.includes(e.id as never)) && e.prova && (
              <button type="button" className="l-btn l-btn-ghost" onClick={onConversa}>
                {save.completos.includes(e.id as never) ? "reler a conversa" : `falar com ${e.personagem} agora`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Radio({ save, atualizar, onFechar, embutido }: { save: Save; atualizar: (f: (s: Save) => Save) => void; onFechar: () => void; embutido?: boolean }) {
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
    <div className={embutido ? "l-radio-app" : "l-ficha-fundo"} onClick={embutido ? undefined : onFechar}>
      <div className={`l-ficha l-radio ${embutido ? "is-embutido" : ""}`} onClick={(e) => e.stopPropagation()}>
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
export function Final({ save, onVoltar }: { save: Save; onVoltar: () => void }) {
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
