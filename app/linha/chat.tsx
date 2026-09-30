"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ESTACOES, estacao as getEstacao, lancada, dataCurta, nivelDe, type EstacaoId } from "./data"
import { ECOS, ROTEIROS, VOZES, type ChatId, type Ctx, type Fala, type Passo } from "./roteiros"
import type { Item, Save } from "./estado"
import { GANCHO, MEMORIAS, MISSOES, ativa, itensFaltando, montarFio, type Perfil } from "./missoes"
import { FREQUENCIAS, proximaFreq } from "./radio"
import { track } from "@/lib/analytics"
import { Objeto } from "./objetos"
import { Prova } from "./provas"
import { gota, player } from "./som"
import { icsHref, compartilhar } from "./util"

interface Props {
  id: Exclude<ChatId, "ojala" | "swav" | "rollercoaster">
  save: Save
  atualizar: (f: (s: Save) => Save) => void
  onFim: (para: Destino) => void
  onVoltar?: () => void
  onXp: (n: number, motivo: string) => void
}

// pra onde a conversa manda quando termina (ou pausa)
export type Destino = ChatId | "mapa" | "missao" | "estrada"

type Espera =
  | { t: "escolha"; passo: Extract<Passo, { t: "escolha" }> }
  | { t: "input"; passo: Extract<Passo, { t: "input" }> }
  | { t: "prova" }
  | { t: "tarefa" }
  | { t: "fim"; para: Destino }
  | null

function resolver(t: string | ((c: Ctx) => string), c: Ctx) {
  return typeof t === "function" ? t(c) : t
}

function atraso(texto: string) {
  return Math.min(1900, 420 + texto.length * 24)
}

// pesos acumulados → estação. Empate: vence quem apareceu primeiro na
// ordem da linha (determinístico — a mesma resposta sempre dá o mesmo lugar)
function calcularEstacao(pesos: Partial<Record<EstacaoId, number>>): EstacaoId {
  let melhor: EstacaoId = "chuva"
  let max = -1
  for (const e of ESTACOES) {
    const p = pesos[e.id] ?? 0
    if (p > max) { max = p; melhor = e.id }
  }
  return melhor
}

const SISTEMA = "__sistema"

const PERSONAGEM_ESTACAO: Record<string, EstacaoId> = Object.fromEntries(ESTACOES.map((e) => [e.personagem, e.id]))

export function Chat({ id, save, atualizar, onFim, onVoltar, onXp }: Props) {
  const roteiro = ROTEIROS[id]
  const jaFeito = save.completos.includes(id)
  // conversa que parou esperando a busca no mapa: volta de onde parou
  const pausa = jaFeito ? undefined : save.pausas[id]
  const [log, setLog] = useState<Item[]>(() => (jaFeito || pausa !== undefined ? save.logs[id] ?? [] : []))
  const [pos, setPos] = useState(() => (jaFeito ? roteiro.passos.length : pausa ?? 0))
  const [fila, setFila] = useState<Fala[]>([])
  const [espera, setEspera] = useState<Espera>(() => (jaFeito ? { t: "fim", para: "mapa" } : null))
  const [digitando, setDigitando] = useState<string | null>(null)
  const [texto, setTexto] = useState("")
  const [vivos, setVivos] = useState<Set<number>>(new Set())
  const perguntou = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pular = useRef<(() => void) | null>(null)
  const fim = useRef<HTMLDivElement>(null)
  const saveRef = useRef(save)
  const logRef = useRef(log)
  useEffect(() => { saveRef.current = save }, [save])
  useEffect(() => { logRef.current = log }, [log])

  const ctx = useCallback((extra?: Partial<Ctx>): Ctx => {
    const s = saveRef.current
    const a = ativa(s, nivelDe(s))
    return {
      nome: s.nome || "você",
      objetos: s.objetos.length,
      estacao: s.estacao,
      ontemLancada: lancada(getEstacao("ontem")),
      primeira: a ? getEstacao(a).personagem : null,
      ...extra,
    }
  }, [])
  // a última resposta com perfil define o jeito de jogar
  const perfil = useRef<Perfil | null>(save.perfil)

  const empurrar = useCallback((it: Item, vivo = true) => {
    setLog((l) => {
      if (vivo) setVivos((v) => new Set(v).add(l.length))
      return [...l, it]
    })
    if (it.k === "msg" && !it.eu) gota(it.texto.length % 5)
  }, [])

  const agendar = useCallback((ms: number, quem: string | null, f: () => void) => {
    setDigitando(quem)
    const run = () => {
      pular.current = null
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      setDigitando(null)
      f()
    }
    pular.current = run
    timer.current = setTimeout(run, ms)
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    pular.current = null
  }, [])

  // ecos: quando o grupo já foi feito, as reações às missões novas chegam ao vivo
  /* eslint-disable react-hooks/set-state-in-effect -- a conversa é uma máquina
     de estados dirigida por efeito: cada passo agenda o próximo */
  useEffect(() => {
    if (id !== "grupo" || !jaFeito) return
    const novos = save.objetos.filter((o) => !save.ecosVistos.includes(o) && ECOS[o])
    if (!novos.length) return
    setEspera(null)
    setFila(novos.flatMap((o) => [
      // quem você ajudou entra no grupo agora
      ...(o === "nectar" ? [] : [{ de: SISTEMA, texto: `D-Bee adicionou ${getEstacao(o).personagem}` }]),
      ...ECOS[o]!.map((e) => ({ de: e.de, texto: e.texto })),
    ]))
    atualizar((s) => ({ ...s, ecosVistos: [...new Set([...s.ecosVistos, ...novos])] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // o motor da conversa: um passo por vez
  useEffect(() => {
    if (espera || timer.current) return
    const c = ctx()
    const quemPadrao = roteiro.grupo ? null : roteiro.contato

    if (fila.length) {
      const f = fila[0]
      const de = typeof f === "object" ? f.de : quemPadrao
      const txt = resolver(typeof f === "object" ? f.texto : f, c)
      if (de === SISTEMA) {
        agendar(500, null, () => {
          empurrar({ k: "sistema", texto: txt })
          setFila((q) => q.slice(1))
        })
        return
      }
      agendar(atraso(txt), de ?? "alguém", () => {
        empurrar({ k: "msg", texto: txt, de: roteiro.grupo ? de ?? undefined : undefined })
        setFila((q) => q.slice(1))
      })
      return
    }
    if (pos >= roteiro.passos.length) {
      if (jaFeito && !espera) setEspera({ t: "fim", para: "mapa" })
      return
    }
    const p = roteiro.passos[pos]
    const avancar = () => { perguntou.current = false; setPos((n) => n + 1) }

    switch (p.t) {
      case "msg": {
        const txt = resolver(p.texto, c)
        agendar(pos === 0 ? 900 : atraso(txt), p.de ?? quemPadrao ?? "", () => {
          empurrar({ k: "msg", texto: txt, de: p.de })
          avancar()
        })
        break
      }
      case "nucleo":
      case "sistema":
        agendar(p.t === "nucleo" ? 900 : 400, null, () => {
          empurrar({ k: p.t, texto: p.texto } as Item)
          avancar()
        })
        break
      case "audio":
        agendar(1300, p.de ?? quemPadrao ?? "", () => {
          empurrar({ k: "audio", src: p.src, titulo: p.titulo, de: p.de })
          avancar()
        })
        break
      case "video":
        agendar(1100, p.de ?? quemPadrao ?? "", () => {
          empurrar({ k: "video", src: p.src, legenda: p.legenda, de: p.de })
          avancar()
        })
        break
      case "escolha":
        if (p.pergunta && !perguntou.current) {
          const perg = p.pergunta
          agendar(atraso(perg), p.de ?? "", () => {
            perguntou.current = true
            empurrar({ k: "msg", texto: perg, de: p.de })
            setEspera({ t: "escolha", passo: p })
          })
        } else setEspera({ t: "escolha", passo: p })
        break
      case "input":
        setEspera({ t: "input", passo: p })
        break
      case "prova":
        agendar(500, null, () => {
          empurrar({ k: "prova", id: p.id })
          setEspera({ t: "prova" })
        })
        break
      case "tarefa": {
        // a conversa espera a pessoa ir buscar a coisa no mapa
        const est = id as EstacaoId
        const m = MISSOES[est]!
        const pronta = itensFaltando(saveRef.current, est) === 0
        const jaTem = logRef.current.some((it) => it.k === "tarefa")
        if (pronta) {
          agendar(600, null, () => {
            setLog((l) => l.map((it) => (it.k === "tarefa" ? { ...it, feita: true } : it)))
            if (!jaTem) empurrar({ k: "tarefa", estacao: est, feita: true })
            track("mission_step", { mission_id: `linha-${est}`, step: "entrega", perfil: saveRef.current.perfil ?? "?", fio_pos: saveRef.current.fio.indexOf(est) })
            avancar()
          })
          break
        }
        agendar(500, null, () => {
          const it: Item = { k: "tarefa", estacao: est }
          if (!jaTem) empurrar(it)
          const novoLog = jaTem ? logRef.current : [...logRef.current, it]
          const primeira = saveRef.current.pausas[est] === undefined
          atualizar((s) => ({ ...s, pausas: { ...s.pausas, [id]: pos }, logs: { ...s.logs, [id]: novoLog } }))
          if (primeira) track("mission_step", { mission_id: `linha-${est}`, step: `busca:${m.busca.item}`, perfil: saveRef.current.perfil ?? "?", fio_pos: saveRef.current.fio.indexOf(est) })
          setEspera({ t: "tarefa" })
        })
        break
      }
      case "objeto":
        agendar(700, null, () => {
          const est = id as EstacaoId
          const s0 = saveRef.current
          const memoria = s0.objetos.includes(est) ? s0.objetos.indexOf(est) : s0.objetos.length
          empurrar({ k: "objeto", estacao: est, memoria, extra: MISSOES[est]?.extra })
          const nivelAntes = nivelDe(s0)
          atualizar((s) => {
            if (s.objetos.includes(est)) return s
            let sinal = s.sinal
            // o mp3 do Mubarak pega frequência: enche o sinal da próxima rádio
            if (est === "copo") sinal = proximaFreq(s.sinal)?.custo ?? s.sinal
            const pausas = { ...s.pausas }
            delete pausas[est]
            return { ...s, objetos: [...s.objetos, est], sinal, pausas }
          })
          saveRef.current = { ...s0, objetos: s0.objetos.includes(est) ? s0.objetos : [...s0.objetos, est] }
          if (nivelDe(saveRef.current) > nivelAntes) track("mission_step", { mission_id: `linha-${est}`, step: `nivel:${nivelDe(saveRef.current)}`, perfil: s0.perfil ?? "?", fio_pos: s0.fio.indexOf(est) })
          onXp(100, "objeto")
          avancar()
        })
        break
      case "gancho": {
        // quem acabou de ser ajudado passa a vez pro próximo do fio
        const prox = ativa(saveRef.current, nivelDe(saveRef.current))
        const txt = prox && prox !== id ? GANCHO[prox] ?? "" : "por enquanto é isso. roda de kombi, a cidade sempre tem coisa"
        agendar(atraso(txt), quemPadrao ?? "", () => {
          empurrar({ k: "msg", texto: txt })
          avancar()
        })
        break
      }
      case "revelacao":
        agendar(2200, "D-Bee", () => {
          const s0 = saveRef.current
          const est = calcularEstacao(s0.pesos)
          const fio = montarFio(s0.pesos, est, perfil.current)
          saveRef.current = { ...s0, estacao: est, fio, perfil: perfil.current }
          atualizar((s) => ({ ...s, estacao: est, fio, perfil: perfil.current }))
          empurrar({ k: "revelacao", estacao: est })
          onXp(100, "estação")
          track("mission_step", { mission_id: "linha-quiz", step: `estacao:${est}`, perfil: perfil.current ?? "?", fio_pos: -1, fio: fio.join(">") })
          avancar()
        })
        break
      case "fim": {
        const para = p.para ?? (ativa(saveRef.current, nivelDe(saveRef.current)) ? "missao" : "mapa")
        setEspera({ t: "fim", para })
        atualizar((s) => {
          const completos = s.completos.includes(id) ? [...s.completos] : [...s.completos, id]
          // a abertura já cria o grupo (só com a D-Bee)
          if (id === "abertura" && !completos.includes("grupo")) {
            completos.push("grupo")
            return { ...s, completos, logs: { ...s.logs, [id]: logRef.current, grupo: [{ k: "sistema", texto: "D-Bee criou o grupo \"linha 222\"" }] } }
          }
          return { ...s, completos, logs: { ...s.logs, [id]: logRef.current } }
        })
        break
      }
    }
  }, [pos, fila, espera, roteiro, id, jaFeito, ctx, agendar, empurrar, atualizar, onXp])
  /* eslint-enable react-hooks/set-state-in-effect */

  // mantém o log salvo quando ecos chegam numa conversa já feita
  useEffect(() => {
    if (jaFeito && log.length) atualizar((s) => ({ ...s, logs: { ...s.logs, [id]: log } }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log.length])

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [log.length, digitando, espera])

  const escolher = (i: number) => {
    if (espera?.t !== "escolha") return
    const o = espera.passo.opcoes[i]
    empurrar({ k: "msg", texto: o.label, eu: true })
    if (o.perfil) perfil.current = o.perfil
    if (o.peso) {
      atualizar((s) => {
        const pesos = { ...s.pesos }
        for (const [k, v] of Object.entries(o.peso!)) pesos[k as EstacaoId] = (pesos[k as EstacaoId] ?? 0) + (v ?? 0)
        return { ...s, pesos }
      })
    }
    onXp(10, "resposta")
    setEspera(null)
    if (o.resposta) setFila(o.resposta)
    perguntou.current = false
    setPos((n) => n + 1)
  }

  const enviar = () => {
    if (espera?.t !== "input") return
    const v = texto.trim().slice(0, 80)
    if (!v) return
    const p = espera.passo
    empurrar({ k: "msg", texto: v, eu: true })
    if (p.chave === "nome") {
      saveRef.current = { ...saveRef.current, nome: v }
      atualizar((s) => ({ ...s, nome: v }))
    } else atualizar((s) => ({ ...s, linha: v }))
    onXp(10, "resposta")
    setTexto("")
    setEspera(null)
    const c = ctx({ nome: p.chave === "nome" ? v : saveRef.current.nome })
    setFila(p.resposta(v).map((f) => (typeof f === "object" ? { de: f.de, texto: resolver(f.texto, c) } : resolver(f, c))))
    setPos((n) => n + 1)
  }

  const fimProva = (pulou?: boolean) => {
    setLog((l) => l.map((it) => (it.k === "prova" && !it.feita ? { ...it, feita: true, pulou } : it)))
    onXp(pulou ? 10 : 50, "prova")
    setEspera(null)
    setPos((n) => n + 1)
  }

  // a D-Bee só vira D-Bee no cabeçalho quando se apresenta na conversa
  const revelada = id === "abertura" && log.some((it) => it.k === "msg" && it.texto.includes("eu sou a D-Bee"))
  const contato = revelada ? "D-Bee" : roteiro.contato
  const est = PERSONAGEM_ESTACAO[contato]
  const corContato = roteiro.grupo ? "#2fe8ff" : est ? getEstacao(est).cor : "#8aa0c8"
  const proxId = ativa(save, nivelDe(save))
  const proximo = proxId ? getEstacao(proxId).personagem : null
  // o grupo mostra só quem já entrou
  const status = roteiro.grupo
    ? ["D-Bee", ...save.objetos.filter((o) => o !== "ojala").map((o) => getEstacao(o).personagem)].join(", ")
    : roteiro.status

  const cabecalho = useMemo(() => (
    <header className="l-chat-topo">
      {onVoltar ? (
        <button type="button" className="l-voltar" onClick={onVoltar} aria-label="voltar pro mapa">‹</button>
      ) : <span className="l-voltar" />}
      <div className="l-avatar" style={{ ["--cor" as string]: corContato }}>
        {roteiro.grupo ? <span className="l-avatar-222">222</span> : est ? <Objeto id={getEstacao(est).objeto} cor={corContato} size={20} /> : <span>?</span>}
      </div>
      <div className="l-chat-quem">
        <b>{contato}</b>
        <small>{digitando ? (roteiro.grupo ? `${digitando} tá digitando…` : "digitando…") : status}</small>
      </div>
    </header>
  ), [onVoltar, corContato, roteiro, est, digitando, contato, status])

  return (
    <div className="l-chat" style={{ ["--cor" as string]: corContato }}>
      {cabecalho}
      <div className="l-chat-corpo" onClick={() => pular.current?.()}>
        {log.map((it, i) => (
          <Bolha key={i} it={it} grupo={!!roteiro.grupo} contato={contato} vivo={vivos.has(i)} onProva={fimProva} save={save} />
        ))}
        {digitando !== null && (
          <div className="l-digitando" style={{ ["--cor" as string]: VOZES[digitando] ?? corContato }}>
            {roteiro.grupo && digitando && <small>{digitando}</small>}
            <span><i /><i /><i /></span>
          </div>
        )}
        <div ref={fim} className="l-chat-fim" />
      </div>

      <footer className="l-chat-base">
        {espera?.t === "escolha" && (
          <div className="l-opcoes">
            {espera.passo.opcoes.map((o, i) => (
              <button key={i} type="button" className="l-opcao" onClick={() => escolher(i)} style={{ animationDelay: `${i * 70}ms` }}>
                {o.label}
              </button>
            ))}
          </div>
        )}
        {espera?.t === "input" && (
          <form className="l-input" onSubmit={(e) => { e.preventDefault(); enviar() }}>
            <input
              autoFocus
              value={texto}
              maxLength={80}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={espera.passo.placeholder}
              enterKeyHint="send"
            />
            <button type="submit" disabled={!texto.trim()} aria-label="enviar">↑</button>
          </form>
        )}
        {espera?.t === "tarefa" && (
          <div className="l-tarefa-acoes">
            <button type="button" className="l-btn l-btn-fim" style={{ ["--cor" as string]: corContato }} onClick={() => onFim("estrada")}>
              pegar a kombi →
            </button>
            {onVoltar && <button type="button" className="l-btn l-btn-ghost" onClick={onVoltar}>depois</button>}
          </div>
        )}
        {espera?.t === "fim" && (
          <button type="button" className="l-btn l-btn-fim" style={{ ["--cor" as string]: "#2fe8ff" }} onClick={() => onFim(espera.para)}>
            {espera.para === "missao" ? `ver mensagem${proximo ? ` de ${proximo}` : ""}` : espera.para === "grupo" ? "entrar no grupo" : "voltar"}
          </button>
        )}
        {espera === null && <p className="l-acelera">{digitando !== null ? "toca na conversa pra acelerar" : " "}</p>}
        {espera?.t === "prova" && <p className="l-acelera">↑ sua vez</p>}
      </footer>
    </div>
  )
}

function Bolha({ it, grupo, contato, vivo, onProva, save }: { it: Item; grupo: boolean; contato: string; vivo: boolean; onProva: (p?: boolean) => void; save: Save }) {
  switch (it.k) {
    case "msg": {
      const cor = it.de ? VOZES[it.de] : undefined
      return (
        <div className={`l-msg ${it.eu ? "is-eu" : ""} ${vivo ? "is-vivo" : ""}`} style={cor ? { ["--voz" as string]: cor } : undefined}>
          {grupo && it.de && !it.eu && <small className="l-msg-de">{it.de}</small>}
          <p>{it.texto}</p>
        </div>
      )
    }
    case "nucleo":
      return (
        <div className={`l-nucleo ${vivo ? "is-vivo" : ""}`}>
          <b>NÚCLEO</b>
          <p>{it.texto}</p>
        </div>
      )
    case "sistema":
      return <p className="l-sistema">{it.texto}</p>
    case "audio":
      return <AudioBolha src={it.src} titulo={it.titulo} de={grupo ? it.de : contato} auto={vivo} />
    case "video":
      return (
        <div className={`l-msg l-video ${vivo ? "is-vivo" : ""}`}>
          <video src={it.src} autoPlay muted loop playsInline preload="metadata" />
          {it.legenda && <p>{it.legenda}</p>}
        </div>
      )
    case "prova": {
      const e = ESTACOES.find((x) => x.prova === it.id)
      if (it.feita)
        return <p className="l-sistema">{it.pulou ? "prova pulada · tudo bem" : "✓ prova feita"}</p>
      return <Prova id={it.id as never} cor={e?.cor ?? "#2fe8ff"} onFim={onProva} />
    }
    case "objeto":
      return <ObjetoCard estacao={it.estacao} vivo={vivo} memoria={it.memoria} extra={it.extra} />
    case "tarefa":
      return <TarefaCard estacao={it.estacao} feita={!!it.feita} save={save} />
    case "revelacao":
      return <Revelacao estacao={it.estacao} vivo={vivo} nome={save.nome} />
  }
}

function AudioBolha({ src, titulo, de, auto }: { src: string; titulo: string; de?: string; auto: boolean }) {
  const [s, setS] = useState({ tocando: false, t: 0, dur: 0 })
  const barras = useMemo(() => {
    let h = 0
    for (const ch of src) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return Array.from({ length: 28 }, (_, i) => 0.25 + (((h >> (i % 24)) & 7) / 7) * 0.75)
  }, [src])

  useEffect(() => player.ouvir((e) => setS(e.src === src ? { tocando: e.tocando, t: e.t, dur: e.dur } : { tocando: false, t: 0, dur: 0 })), [src])
  useEffect(() => {
    if (auto) player.tocar(src)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const prog = s.dur ? s.t / s.dur : 0
  const cor = de ? VOZES[de] : undefined
  return (
    <div className="l-msg l-audio" style={cor ? { ["--voz" as string]: cor } : undefined}>
      <button type="button" onClick={(e) => { e.stopPropagation(); player.alternar(src) }} aria-label={s.tocando ? "pausar" : "tocar"}>
        {s.tocando ? "❚❚" : "▶"}
      </button>
      <div className="l-audio-onda">
        {barras.map((b, i) => (
          <i key={i} style={{ height: `${b * 100}%`, opacity: i / barras.length <= prog ? 1 : 0.35 }} />
        ))}
      </div>
      <small>{titulo}</small>
    </div>
  )
}

// A recompensa de verdade: o objeto, o que ele destrava e um pedaço da
// história (a memória que estava guardada dentro dele)
function ObjetoCard({ estacao, vivo, memoria, extra }: { estacao: EstacaoId; vivo: boolean; memoria?: number; extra?: string }) {
  const e = getEstacao(estacao)
  const linha = FREQUENCIAS[0]
  const mem = memoria !== undefined ? MEMORIAS[memoria] : undefined
  return (
    <div className={`l-objeto ${vivo ? "is-vivo" : ""}`} style={{ ["--cor" as string]: e.cor }}>
      <div className="l-objeto-icone">
        <Objeto id={e.objeto} cor={e.cor} size={56} />
      </div>
      <small>você ganhou</small>
      <b>{e.objetoNome}</b>
      <span>{e.luz} × {e.sombra}</span>
      <ul className="l-objeto-libera">
        <li><i>♪</i> {e.faixa} entrou na sua rádio · {linha.freq}</li>
        {e.personagem !== "LU2CA" && <li><i>+</i> {e.personagem} entrou no grupo</li>}
        {extra && <li><i>★</i> {extra}</li>}
      </ul>
      {mem && (
        <blockquote className="l-memoria">
          <small>memória {memoria! + 1} de {MEMORIAS.length}</small>
          <p>{mem}</p>
        </blockquote>
      )}
    </div>
  )
}

// o pedido no meio da conversa: o que buscar, onde, e se já foi
function TarefaCard({ estacao, feita, save }: { estacao: EstacaoId; feita: boolean; save: Save }) {
  const e = getEstacao(estacao)
  const m = MISSOES[estacao]
  if (!m) return null
  const total = m.busca.em.length
  const falta = feita ? 0 : itensFaltando(save, estacao)
  return (
    <div className={`l-tarefa ${feita || falta === 0 ? "is-feita" : ""}`} style={{ ["--cor" as string]: e.cor }}>
      <small>{feita || falta === 0 ? "missão · feito" : "missão"}</small>
      <b>{m.tarefa}</b>
      <span>{m.busca.lugar}{total > 1 ? ` · ${total - falta}/${total}` : ""}</span>
    </div>
  )
}

function Revelacao({ estacao, vivo, nome }: { estacao: EstacaoId; vivo: boolean; nome: string }) {
  const e = getEstacao(estacao)
  const saiu = lancada(e) || e.id === "ontem"
  useEffect(() => {
    if (vivo && saiu) setTimeout(() => player.tocar(e.audio), 600)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className={`l-revela ${vivo ? "is-vivo" : ""}`} style={{ ["--cor" as string]: e.cor }}>
      <small>{nome ? `${nome}, sua estação é` : "sua estação é"}</small>
      <div className="l-revela-n">{e.n}</div>
      <h3>{e.faixa}</h3>
      <p className="l-revela-par">{e.luz} <i>×</i> {e.sombra}</p>
      <p className="l-revela-cidade">“{e.cidade}”</p>
      <div className="l-revela-obj">
        <Objeto id={e.objeto} cor={e.cor} size={30} />
        <span>{e.objetoNome} · {e.personagem}</span>
      </div>
      {!saiu && e.lancamento && (
        <p className="l-revela-escuro">
          sua estação ainda tá no escuro. abre <b>{dataCurta(e.lancamento)}</b> — vc vai estar lá antes de todo mundo.
          <a href={icsHref(e)} download={`linha-222-${e.id}.ics`} onClick={(ev) => ev.stopPropagation()}>me lembra</a>
        </p>
      )}
      <button
        type="button"
        className="l-btn l-btn-ghost"
        onClick={(ev) => {
          ev.stopPropagation()
          compartilhar(`sou da estação ${e.n} da cidade neon: ${e.faixa.toLowerCase()} (${e.luz} × ${e.sombra}). e vc?`)
        }}
      >
        compartilhar minha estação
      </button>
    </div>
  )
}
