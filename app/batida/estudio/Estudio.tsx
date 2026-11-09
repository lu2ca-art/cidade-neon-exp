"use client"

// B4TIDA — o estúdio numa tela só (v2, 13/10).
//
// Em cima: tocar/parar/gravar, o andamento e o tom. Depois as SEÇÕES da
// música (verso, refrão…) e a ORDEM delas (o arranjo). No meio, as faixas
// empilhadas, cada uma mostrando o que toca na seção. Tocar numa faixa abre
// a gaveta do instrumento embaixo (tocar ao vivo, editar na grade, trocar o
// som), sem sair da música. Inspirado no jeito do GarageBand / Live Loops /
// Koala: tocar primeiro, editar depois.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { keyDegrees, NOTE_NAMES } from "../lib/theory"
import { loadAllSlots } from "../lib/storage"
import {
  INST_COR, INST_NOME, MAX_FAIXAS, NOMES_SECAO, musicaVazia, novaFaixa, novaSecao, novoId, passosDa,
  type Inst, type Musica, type Secao,
} from "./tipos"
import { Motor } from "./motor"
import { definirSampleados, instDoAncestral, nomeDoSom, precarregar } from "./sons"
import { apagarMusica, converterV1, lerVoz, listarMusicas, salvarMusica, salvarVoz } from "./armazem"
import { OPCOES_CLIMA, musicaNoClima } from "./climas"
import { compartilharOuBaixar, mp3, renderizar, wav } from "./exportar"
import { Gaveta } from "./Gaveta"
import { carregar } from "../../linha/estado"
import { historiaDe } from "../../linha/disco/historia"
import { musicasLiberadas } from "../../linha/disco/episodios"
import { referenciasDoBatida, type ReferenciaBatida } from "../../linha/disco/recompensas"
import { ehInstrumento } from "../../linha/disco/instrumentos"
import "./estudio.css"

// a música que junta o que ele sampleou na casa da D-Bee (nunca a música dele)
const MUSICA_SAMPLES = "samples da D-Bee"

type Popup = null | "menu" | "referencias" | "musicas" | "comecar" | "bpm" | "tom" | "exportar" | "enviar" | "ajuda" | { secao: string } | { arranjo: number }

export default function Estudio() {
  const router = useRouter()
  const [m, setM] = useState<Musica | null>(null)
  const [lista, setLista] = useState<Musica[]>([])
  const [popup, setPopup] = useState<Popup>(null)
  const [secao, setSecao] = useState("")
  const [sel, setSel] = useState<string | null>(null) // faixa aberta na gaveta
  const [tocando, setTocando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [modo, setModo] = useState<"secao" | "musica">("secao")
  const [metronomo, setMetronomo] = useState(false)
  const [msg, setMsg] = useState("")
  const [ocupado, setOcupado] = useState("")
  const [addInst, setAddInst] = useState(false)
  const motor = useRef<Motor | null>(null)
  // (T30) as faixas de referência que as missões do jogo liberaram (ouvir antes de fazer o beat)
  const [refs, setRefs] = useState<ReferenciaBatida[]>([])
  const [refTocando, setRefTocando] = useState<string | null>(null)
  const refAudio = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    try { setRefs((() => { const h = historiaDe(carregar()); return referenciasDoBatida([...(h.batida ?? []), ...musicasLiberadas(h)]) })()) } catch { setRefs([]) }
    return () => { refAudio.current?.pause() }
  }, [])
  const tocarRef = (r: ReferenciaBatida) => {
    if (!refAudio.current) refAudio.current = new Audio()
    const a = refAudio.current
    if (refTocando === r.id) { a.pause(); setRefTocando(null); return }
    a.src = r.src
    a.onended = () => setRefTocando(null)
    void a.play().catch(() => {})
    setRefTocando(r.id)
  }
  const [mo, setMo] = useState<Motor | null>(null) // o mesmo motor, pra tela
  const desfazer = useRef<Musica[]>([])
  const refazer = useRef<Musica[]>([])
  const [hist, setHist] = useState({ d: 0, r: 0 })
  const mRef = useRef<Musica | null>(null)
  const pos = useRef<{ secao: string; passo: number; bloco: number } | null>(null)
  const [posUi, setPosUi] = useState<{ secao: string; passo: number; bloco: number; contagem: boolean } | null>(null)

  // (T10) aberto de dentro da missão do Alohan (?missao=1&clima=ontem): parte de uma música pronta e
  // avisa o jogo (postMessage) se já tocou e se já mexeu nela
  const daMissao = useRef<{ clima: string } | null>(null)
  const [emMissao, setEmMissao] = useState(false)
  const prog = useRef({ tocou: false, mexeu: false })
  const avisarMissao = useCallback(() => {
    if (!daMissao.current || window.parent === window) return
    const x = mRef.current
    const faixas = x ? x.faixas.filter((f) => x.secoes.some((s) => (s.eventos[f.id]?.length ?? 0) > 0)).length : 0
    window.parent.postMessage({ cn: "batida-missao", tocou: prog.current.tocou, mexeu: prog.current.mexeu, faixas }, window.location.origin)
  }, [])

  // (ep. 3) o jogo pede a música pra tocar no caminho do ginásio (disco/BatidaMissao.tsx)
  useEffect(() => {
    if (!emMissao) return
    const pedir = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.cn !== "batida-missao-pedir" || window.parent === window) return
      window.parent.postMessage({ cn: "batida-missao-musica", musica: mRef.current }, window.location.origin)
    }
    window.addEventListener("message", pedir)
    return () => window.removeEventListener("message", pedir)
  }, [emMissao])

  const garantirMotor = useCallback(() => {
    if (!motor.current) {
      motor.current = new Motor()
      motor.current.onFim = () => setTocando(false)
      setMo(motor.current)
    }
    return motor.current
  }, [])

  const abrirMusica = useCallback(async (nova: Musica) => {
    motor.current?.parar()
    setTocando(false)
    setGravando(false)
    desfazer.current = []
    refazer.current = []
    setHist({ d: 0, r: 0 })
    setM(nova)
    mRef.current = nova
    setSecao(nova.secoes[0]?.id ?? "")
    setSel(null)
    setPopup(null)
    const mt = garantirMotor()
    mt.setMusica(nova)
    mt.configurar({ secao: nova.secoes[0]?.id ?? "" })
    void precarregar(mt.ctx, nova.faixas)
    // as vozes gravadas
    for (const s of nova.secoes) for (const c of Object.values(s.voz)) {
      if (mt.temVoz(c.chave)) continue
      const b = await lerVoz(c.chave)
      if (b) { try { mt.setVoz(c.chave, await mt.ctx.decodeAudioData(await b.arrayBuffer())) } catch {} }
    }
  }, [garantirMotor])

  /* ── abrir ── */
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const q = new URLSearchParams(window.location.search)
      // (bíblia §13, 09/11) o que ele sampleou na casa da D-Bee vira som no catálogo; aberto
      // de lá (?sample=udu), o som entra numa faixa da música "samples da D-Bee" (a dele fica intacta)
      const sample = q.get("sample")
      try { const h = historiaDe(carregar()); definirSampleados([...new Set([...(h.instrumentosSampleados ?? []), ...(sample && ehInstrumento(sample) ? [sample] : [])])]) } catch {}
      if (sample && ehInstrumento(sample)) {
        const som = `anc:${sample}`
        const l0 = await listarMusicas()
        let alvo = l0.find((x) => x.nome === MUSICA_SAMPLES) ?? { ...musicaVazia(), nome: MUSICA_SAMPLES }
        let f = alvo.faixas.find((x) => x.som === som)
        if (!f && alvo.faixas.length >= MAX_FAIXAS) alvo = { ...musicaVazia(), nome: MUSICA_SAMPLES }
        if (!f) { f = novaFaixa(instDoAncestral(sample), som); alvo = { ...alvo, faixas: [...alvo.faixas, f] } }
        await salvarMusica(alvo)
        if (!vivo) return
        setLista(await listarMusicas())
        await abrirMusica(alvo)
        setSel(f.id)
        return
      }
      if (q.get("missao")) {
        daMissao.current = { clima: q.get("clima") || "ontem" }
        setEmMissao(true)
        const n = musicaNoClima(daMissao.current.clima)
        n.nome = "pra galera da quadra"
        await salvarMusica(n)
        if (!vivo) return
        setLista(await listarMusicas())
        await abrirMusica(n)
        avisarMissao()
        return
      }
      let l = await listarMusicas()
      // primeira vez no estúdio novo: as músicas da versão antiga vêm junto
      if (!l.length) {
        const slots = await loadAllSlots().catch(() => [])
        for (const s of slots) if (s && s.tracks.length > 0) await salvarMusica(await converterV1(s))
        l = await listarMusicas()
      }
      if (!vivo) return
      setLista(l)
      if (l[0]) abrirMusica(l[0])
      else setPopup("comecar")
    })()
    return () => { vivo = false; motor.current?.destruir() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── mudar a música (com desfazer e salvar sozinho) ── */
  const salvarT = useRef<number | null>(null)
  const mudar = useCallback((f: (x: Musica) => Musica, registrar = true) => {
    const atual = mRef.current
    if (!atual) return
    const nova = { ...f(atual), atualizadaEm: Date.now() }
    prog.current.mexeu = true
    if (registrar) { desfazer.current.push(atual); if (desfazer.current.length > 80) desfazer.current.shift(); refazer.current = []; setHist({ d: desfazer.current.length, r: 0 }) }
    mRef.current = nova
    setM(nova)
    motor.current?.setMusica(nova)
    avisarMissao()
    if (salvarT.current) clearTimeout(salvarT.current)
    salvarT.current = window.setTimeout(() => { void salvarMusica(nova).then(() => listarMusicas().then(setLista)) }, 700)
  }, [avisarMissao])
  const voltar = () => { const v = desfazer.current.pop(); if (!v || !mRef.current) return; refazer.current.push(mRef.current); mRef.current = v; setM(v); motor.current?.setMusica(v); void salvarMusica(v); setHist({ d: desfazer.current.length, r: refazer.current.length }) }
  const avancar = () => { const v = refazer.current.pop(); if (!v || !mRef.current) return; desfazer.current.push(mRef.current); mRef.current = v; setM(v); motor.current?.setMusica(v); void salvarMusica(v); setHist({ d: desfazer.current.length, r: refazer.current.length }) }

  /* ── cabeça de leitura ── */
  useEffect(() => {
    let raf = 0
    let ult = 0
    const loop = (t: number) => {
      pos.current = motor.current?.posicao() ?? null
      // a tela (contador, seção acesa) atualiza ~8x por segundo; as grades leem o ref a 60 fps
      if (t - ult > 120) {
        ult = t
        const p = pos.current
        const c = !!motor.current?.emContagem
        setPosUi((a) => (!p && !c ? (a ? null : a) : { secao: p?.secao ?? "", passo: p?.passo ?? 0, bloco: p?.bloco ?? 0, contagem: c }))
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ── transporte ── */
  const tocar = (contar = false) => {
    const mt = garantirMotor()
    if (!m) return
    mt.configurar({ modo, secao, metronomo: metronomo || contar })
    mt.tocar(contar)
    setTocando(true)
    prog.current.tocou = true
    avisarMissao()
  }
  const parar = () => { motor.current?.parar(); setTocando(false); setGravando(false) }
  const alternarGravar = () => {
    if (gravando) { setGravando(false); motor.current?.configurar({ metronomo }); return }
    setGravando(true)
    if (!tocando) tocar(true)
    setMsg("gravando: o que você tocar entra no tempo")
    setTimeout(() => setMsg(""), 2500)
  }
  useEffect(() => { motor.current?.configurar({ modo, secao }) }, [modo, secao])
  useEffect(() => { motor.current?.configurar({ metronomo: metronomo || gravando }) }, [metronomo, gravando])

  // tap tempo
  const taps = useRef<number[]>([])
  const tap = () => {
    const t = performance.now()
    taps.current = [...taps.current.filter((x) => t - x < 2500), t]
    if (taps.current.length >= 3) {
      const d = taps.current.slice(1).map((x, i) => x - taps.current[i])
      const bpm = Math.round(60000 / (d.reduce((a, b) => a + b, 0) / d.length))
      if (bpm >= 50 && bpm <= 200) mudar((x) => ({ ...x, bpm }), false)
    }
  }

  /* ── seções e arranjo ── */
  const secaoAtual = m?.secoes.find((s) => s.id === secao)
  const novaSecaoNaMusica = () => {
    if (!m) return
    const usados = new Set(m.secoes.map((s) => s.nome))
    const nome = NOMES_SECAO.find((n) => !usados.has(n)) ?? `parte ${m.secoes.length + 1}`
    const s = novaSecao(nome, secaoAtual?.compassos ?? 2)
    mudar((x) => ({ ...x, secoes: [...x.secoes, s], arranjo: [...x.arranjo, s.id] }))
    setSecao(s.id)
  }
  const duplicarSecao = (id: string) => {
    const s = m?.secoes.find((x) => x.id === id)
    if (!s) return
    const c: Secao = { ...s, id: novoId("s"), nome: `${s.nome} 2`, eventos: JSON.parse(JSON.stringify(s.eventos)), voz: { ...s.voz } }
    mudar((x) => ({ ...x, secoes: [...x.secoes, c], arranjo: [...x.arranjo, c.id] }))
    setSecao(c.id)
    setPopup(null)
  }
  const apagarSecao = (id: string) => {
    if (!m || m.secoes.length <= 1) return
    mudar((x) => ({ ...x, secoes: x.secoes.filter((s) => s.id !== id), arranjo: x.arranjo.filter((a) => a !== id) }))
    if (secao === id) setSecao(m.secoes.find((s) => s.id !== id)!.id)
    setPopup(null)
  }

  /* ── faixas ── */
  const adicionarFaixa = (inst: Inst) => {
    if (!m || m.faixas.length >= MAX_FAIXAS) return
    const f = novaFaixa(inst)
    mudar((x) => ({ ...x, faixas: [...x.faixas, f] }))
    if (mo) void precarregar(mo.ctx, [f])
    setAddInst(false)
    setSel(f.id)
  }

  /* ── exportar e compartilhar ── */
  const exportar = async (tipo: "wav" | "mp3", compartilhar: boolean, so?: string) => {
    if (!m) return
    setOcupado(tipo === "mp3" ? "masterizando e gerando o mp3…" : "masterizando…")
    try {
      const b = await renderizar(m, so)
      const nome = (m.nome || "minha-batida").replace(/[^\p{L}\p{N} -]/gu, "").trim().replace(/\s+/g, "-") || "batida"
      const arq = tipo === "mp3" ? await mp3(b, m.nome, "feito na B4TIDA") : wav(b, m.nome, "feito na B4TIDA")
      const r = await compartilharOuBaixar(arq, `${nome}.${tipo}`, compartilhar)
      setMsg(r === "compartilhado" ? "foi! 🎧" : r === "baixado" ? `salvo: ${nome}.${tipo}` : "")
    } catch {
      setMsg("não deu pra exportar agora")
    }
    setOcupado("")
    setPopup(null)
    setTimeout(() => setMsg(""), 3500)
  }

  const enviarCidade = async (autor: string) => {
    if (!m) return
    setOcupado("mandando pra cidade…")
    try {
      const vozes: Record<string, string> = {}
      for (const s of m.secoes) for (const c of Object.values(s.voz)) {
        const b = await lerVoz(c.chave)
        if (b) vozes[c.chave] = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(b) })
      }
      const r = await fetch("/api/batida", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ autor, titulo: m.nome || "sem título", musica: { ...m, vozes } }) })
      setMsg(r.ok ? "foi pra cidade: o LU2CA ouve e as melhores tocam na rádio do jogo" : r.status === 413 ? "grande demais pra mandar (voz longa)" : "não deu pra mandar agora")
    } catch { setMsg("sem conexão") }
    setOcupado("")
    setPopup(null)
    setTimeout(() => setMsg(""), 5000)
  }

  const graus = useMemo(() => (m ? keyDegrees(m.tom, m.modo) : []), [m])
  const faixaSel = m?.faixas.find((f) => f.id === sel) ?? null
  const tocandoAgora = posUi
  const compasso = tocandoAgora ? Math.floor(tocandoAgora.passo / 16) + 1 : 1
  const tempo = tocandoAgora ? Math.floor((tocandoAgora.passo % 16) / 4) + 1 : 1

  if (!m) {
    return (
      <div className="es-raiz">
        {popup === "comecar" ? <Comecar refs={refs} refTocando={refTocando} onRef={tocarRef} onClima={(id) => { const n = musicaNoClima(id); void salvarMusica(n); void abrirMusica(n) }} onZero={() => { const n = musicaVazia(); void salvarMusica(n); void abrirMusica(n) }} /> : <p className="es-carrega">abrindo o estúdio…</p>}
      </div>
    )
  }

  return (
    <div className="es-raiz">
      {/* topo */}
      <header className="es-topo">
        {emMissao ? <span className="es-ic" aria-hidden="true" /> : <button type="button" className="es-ic" aria-label="sair" onClick={() => { parar(); router.push("/?screen=home") }}>‹</button>}
        <button type="button" className="es-nome" onClick={() => { const n = window.prompt("nome da música", m.nome); if (n !== null) mudar((x) => ({ ...x, nome: n.slice(0, 60) })) }}>
          {m.nome || "sem nome"}<small>✎</small>
        </button>
        <button type="button" className="es-ic" aria-label="menu" onClick={() => setPopup("menu")}>⋯</button>
      </header>

      {/* transporte */}
      <div className="es-transp">
        <button type="button" className={`es-play ${tocando ? "is-on" : ""}`} onClick={() => (tocando ? parar() : tocar())} aria-label={tocando ? "parar" : "tocar"}>{tocando ? "■" : "▶"}</button>
        <button type="button" className={`es-rec ${gravando ? "is-on" : ""}`} onClick={alternarGravar} aria-label="gravar">●</button>
        <div className="es-lcd">
          <b>{compasso}.{tempo}</b>
          <small>{posUi?.contagem ? "contagem" : tocando ? (gravando ? "gravando" : "tocando") : "parado"}</small>
        </div>
        <button type="button" className="es-chip" onClick={() => setPopup("bpm")}><b>{m.bpm}</b><small>bpm</small></button>
        <button type="button" className="es-chip" onClick={() => setPopup("tom")}><b>{NOTE_NAMES[m.tom]}{m.modo === "minor" ? "m" : ""}</b><small>tom</small></button>
        <button type="button" className={`es-chip ${metronomo ? "is-on" : ""}`} onClick={() => setMetronomo((x) => !x)} aria-label="metrônomo"><b>♩</b><small>clique</small></button>
        <button type="button" className="es-chip" onClick={voltar} disabled={!hist.d} aria-label="desfazer"><b>↶</b></button>
        <button type="button" className="es-chip" onClick={avancar} disabled={!hist.r} aria-label="refazer"><b>↷</b></button>
      </div>

      {/* seções */}
      <div className="es-secoes">
        <div className="es-modo">
          <button type="button" className={modo === "secao" ? "is-on" : ""} onClick={() => setModo("secao")}>seção</button>
          <button type="button" className={modo === "musica" ? "is-on" : ""} onClick={() => setModo("musica")}>música</button>
        </div>
        <div className="es-secoes-lista">
          {m.secoes.map((s, i) => (
            <button key={s.id} type="button" className={`es-sec ${s.id === secao ? "is-on" : ""} ${tocandoAgora?.secao === s.id ? "is-tocando" : ""}`}
              style={{ ["--c" as string]: corSecao(i) }}
              onClick={() => (s.id === secao ? setPopup({ secao: s.id }) : setSecao(s.id))}>
              <b>{s.nome}</b><small>{s.compassos} comp.</small>
            </button>
          ))}
          <button type="button" className="es-sec is-mais" onClick={novaSecaoNaMusica}>+</button>
        </div>
      </div>
      <div className="es-arranjo">
        <small>ordem</small>
        <div>
          {m.arranjo.map((id, i) => {
            const k = m.secoes.findIndex((s) => s.id === id)
            const s = m.secoes[k]
            return s ? <button key={`${id}-${i}`} type="button" style={{ ["--c" as string]: corSecao(k), flexGrow: s.compassos }} className={tocandoAgora && modo === "musica" && tocandoAgora.bloco === i ? "is-tocando" : ""} onClick={() => setPopup({ arranjo: i })}>{s.nome}</button> : null
          })}
          <button type="button" className="is-mais" onClick={() => mudar((x) => ({ ...x, arranjo: [...x.arranjo, secao] }))} aria-label="pôr a seção no fim">+</button>
        </div>
      </div>

      {/* faixas */}
      <div className={`es-faixas ${faixaSel ? "is-gaveta" : ""}`}>
        {m.faixas.map((f) => (
          <div key={f.id} className={`es-faixa ${sel === f.id ? "is-on" : ""} ${f.mudo ? "is-mudo" : ""}`} style={{ ["--c" as string]: INST_COR[f.inst] }}>
            <button type="button" className="es-faixa-cab" onClick={() => setSel(sel === f.id ? null : f.id)}>
              <i>{iconeInst(f.inst)}</i>
              <span><b>{INST_NOME[f.inst]}</b><small>{nomeDoSom(f)}</small></span>
            </button>
            <button type="button" className={`es-ms ${f.mudo ? "is-on" : ""}`} onClick={() => mudar((x) => ({ ...x, faixas: x.faixas.map((y) => (y.id === f.id ? { ...y, mudo: !y.mudo } : y)) }), false)}>M</button>
            <button type="button" className={`es-ms is-s ${f.solo ? "is-on" : ""}`} onClick={() => mudar((x) => ({ ...x, faixas: x.faixas.map((y) => (y.id === f.id ? { ...y, solo: !y.solo } : y)) }), false)}>S</button>
            <MiniFaixa secao={secaoAtual} faixa={f.id} inst={f.inst} cor={INST_COR[f.inst]} pos={pos} onClick={() => setSel(f.id)} />
          </div>
        ))}
        {m.faixas.length < MAX_FAIXAS && (
          addInst ? (
            <div className="es-add">
              {(["bateria", "baixo", "teclas", "guitarra", "pad", "voz"] as Inst[]).map((i) => (
                <button key={i} type="button" style={{ ["--c" as string]: INST_COR[i] }} onClick={() => adicionarFaixa(i)}><i>{iconeInst(i)}</i>{INST_NOME[i]}</button>
              ))}
              <button type="button" onClick={() => setAddInst(false)}>✕</button>
            </div>
          ) : (
            <button type="button" className="es-add-btn" onClick={() => setAddInst(true)}>+ instrumento</button>
          )
        )}
        {!m.faixas.length && <p className="es-vazio">comece com um instrumento ↑ (ou ⋯ → nova música → um clima pronto)</p>}
      </div>

      {faixaSel && secaoAtual && mo && (
        <Gaveta
          key={faixaSel.id}
          musica={m}
          faixa={faixaSel}
          secao={secaoAtual}
          graus={graus}
          motor={mo}
          pos={pos}
          tocando={tocando}
          gravando={gravando}
          mudar={mudar}
          onFechar={() => setSel(null)}
          onTocarSecao={() => { setModo("secao"); if (!tocando) tocar() }}
          onPararTudo={parar}
          onVoz={async (chave, blob, buffer) => { await salvarVoz(chave, blob); mo.setVoz(chave, buffer) }}
          setMsg={(t) => { setMsg(t); setTimeout(() => setMsg(""), 3000) }}
        />
      )}

      {msg && <p className="es-msg">{msg}</p>}
      {ocupado && <div className="es-ocupado"><span />{ocupado}</div>}

      {/* popups */}
      {popup && (
        <div className="es-veu" onClick={() => setPopup(null)}>
          <div className="es-pop" onClick={(e) => e.stopPropagation()}>
            {popup === "menu" && (
              <>
                <b className="es-pop-tit">B4TIDA</b>
                <button type="button" onClick={() => setPopup("musicas")}>minhas músicas ({lista.length})</button>
                <button type="button" onClick={() => setPopup("comecar")}>nova música</button>
                {refs.length > 0 && <button type="button" data-refs onClick={() => setPopup("referencias")}>referências das missões ({refs.length})</button>}
                <button type="button" onClick={() => setPopup("exportar")}>exportar / compartilhar</button>
                <button type="button" onClick={() => setPopup("enviar")}>mandar pra cidade</button>
                <button type="button" onClick={() => setPopup("ajuda")}>como funciona</button>
                {ehAdmin() && <button type="button" onClick={() => router.push("/batida/biblioteca")}>biblioteca (o que a cidade mandou)</button>}
              </>
            )}
            {popup === "referencias" && (
              <>
                <b className="es-pop-tit">referências das missões</b>
                <Referencias refs={refs} tocando={refTocando} onTocar={tocarRef} />
              </>
            )}
            {popup === "musicas" && (
              <>
                <b className="es-pop-tit">minhas músicas</b>
                {lista.map((x) => (
                  <div key={x.id} className="es-linha-musica">
                    <button type="button" onClick={() => void abrirMusica(x)}><b>{x.nome || "sem nome"}</b><small>{x.bpm} bpm · {x.faixas.length} faixas · {x.secoes.length} seções</small></button>
                    <button type="button" className="es-apagar" onClick={async () => { if (!window.confirm(`apagar "${x.nome || "sem nome"}"?`)) return; await apagarMusica(x.id); const l = await listarMusicas(); setLista(l); if (x.id === m.id) { if (l[0]) void abrirMusica(l[0]); else { setM(null); setPopup("comecar") } } }}>apagar</button>
                  </div>
                ))}
              </>
            )}
            {popup === "comecar" && <Comecar refs={refs} refTocando={refTocando} onRef={tocarRef} onClima={(id) => { const n = musicaNoClima(id); void salvarMusica(n).then(() => listarMusicas().then(setLista)); void abrirMusica(n) }} onZero={() => { const n = musicaVazia(); void salvarMusica(n).then(() => listarMusicas().then(setLista)); void abrirMusica(n) }} />}
            {popup === "bpm" && (
              <>
                <b className="es-pop-tit">andamento · {m.bpm} bpm</b>
                <div className="es-linha">
                  <button type="button" onClick={() => mudar((x) => ({ ...x, bpm: Math.max(50, x.bpm - 1) }), false)}>−</button>
                  <input type="range" min={50} max={200} value={m.bpm} onChange={(e) => mudar((x) => ({ ...x, bpm: Number(e.target.value) }), false)} />
                  <button type="button" onClick={() => mudar((x) => ({ ...x, bpm: Math.min(200, x.bpm + 1) }), false)}>+</button>
                </div>
                <button type="button" className="es-tap" onPointerDown={tap}>bata o tempo aqui (tap)</button>
                <b className="es-pop-tit">swing · {Math.round(m.swing * 100)}%</b>
                <input type="range" min={0} max={60} value={Math.round(m.swing * 100)} onChange={(e) => mudar((x) => ({ ...x, swing: Number(e.target.value) / 100 }), false)} />
              </>
            )}
            {popup === "tom" && (
              <>
                <b className="es-pop-tit">tom da música</b>
                <div className="es-tons">
                  {NOTE_NAMES.map((n, i) => <button key={n} type="button" className={m.tom === i ? "is-on" : ""} onClick={() => mudar((x) => transpor(x, i, x.modo))}>{n}</button>)}
                </div>
                <div className="es-linha">
                  <button type="button" className={m.modo === "major" ? "is-on" : ""} onClick={() => mudar((x) => transpor(x, x.tom, "major"))}>maior (alegre)</button>
                  <button type="button" className={m.modo === "minor" ? "is-on" : ""} onClick={() => mudar((x) => transpor(x, x.tom, "minor"))}>menor (noite)</button>
                </div>
                <small className="es-pop-nota">mudar o tom leva as notas junto.</small>
              </>
            )}
            {typeof popup === "object" && "secao" in popup && (() => {
              const s = m.secoes.find((x) => x.id === popup.secao)
              if (!s) return null
              return (
                <>
                  <b className="es-pop-tit">seção · {s.nome}</b>
                  <div className="es-tons">
                    {NOMES_SECAO.map((n) => <button key={n} type="button" className={s.nome === n ? "is-on" : ""} onClick={() => mudar((x) => ({ ...x, secoes: x.secoes.map((y) => (y.id === s.id ? { ...y, nome: n } : y)) }))}>{n}</button>)}
                  </div>
                  <b className="es-pop-tit">tamanho</b>
                  <div className="es-linha">
                    {([1, 2, 4, 8] as const).map((c) => <button key={c} type="button" className={s.compassos === c ? "is-on" : ""} onClick={() => mudar((x) => ({ ...x, secoes: x.secoes.map((y) => (y.id === s.id ? redimensionar(y, c) : y)) }))}>{c} comp.</button>)}
                  </div>
                  <div className="es-linha">
                    {/* eslint-disable-next-line react-hooks/refs -- só roda no clique */}
                    <button type="button" onClick={() => duplicarSecao(s.id)}>duplicar</button>
                    <button type="button" onClick={() => { mudar((x) => ({ ...x, arranjo: [...x.arranjo, s.id] })); setPopup(null) }}>pôr no fim da música</button>
                  </div>
                  <button type="button" className="es-apagar" disabled={m.secoes.length <= 1} onClick={() => apagarSecao(s.id)}>apagar seção</button>
                </>
              )
            })()}
            {typeof popup === "object" && "arranjo" in popup && (() => {
              const i = popup.arranjo
              const mover = (d: number) => { mudar((x) => { const a = [...x.arranjo]; const j = i + d; if (j < 0 || j >= a.length) return x; [a[i], a[j]] = [a[j], a[i]]; return { ...x, arranjo: a } }); setPopup({ arranjo: Math.max(0, Math.min(m.arranjo.length - 1, i + d)) }) }
              return (
                <>
                  <b className="es-pop-tit">na ordem da música · {i + 1}º</b>
                  <div className="es-linha">
                    <button type="button" onClick={() => mover(-1)} disabled={i === 0}>◀ antes</button>
                    <button type="button" onClick={() => mover(1)} disabled={i === m.arranjo.length - 1}>depois ▶</button>
                  </div>
                  <div className="es-linha">
                    <button type="button" onClick={() => { setSecao(m.arranjo[i]); setPopup(null) }}>editar essa seção</button>
                    <button type="button" className="es-apagar" disabled={m.arranjo.length <= 1} onClick={() => { mudar((x) => ({ ...x, arranjo: x.arranjo.filter((_, k) => k !== i) })); setPopup(null) }}>tirar da ordem</button>
                  </div>
                </>
              )
            })()}
            {popup === "exportar" && (
              <>
                <b className="es-pop-tit">sair com a música</b>
                <small className="es-pop-nota">a música inteira, na ordem ({m.arranjo.length} partes), masterizada no volume das plataformas.</small>
                <button type="button" onClick={() => void exportar("mp3", true)}>compartilhar mp3 (zap, stories…)</button>
                <button type="button" onClick={() => void exportar("mp3", false)}>baixar mp3</button>
                <button type="button" onClick={() => void exportar("wav", false)}>baixar wav (qualidade máxima)</button>
                <button type="button" onClick={() => void exportar("wav", false, secao)}>só esta seção (wav, loop)</button>
                <small className="es-pop-nota">o arquivo leva “feito na B4TIDA · Cidade Neon” nos dados.</small>
              </>
            )}
            {popup === "enviar" && <Enviar onEnviar={enviarCidade} />}
            {popup === "ajuda" && (
              <div className="es-ajuda">
                <b className="es-pop-tit">como funciona</b>
                <p><b>1.</b> escolha um clima (já nasce tocando) ou comece do zero.</p>
                <p><b>2.</b> toque numa faixa: a gaveta abre embaixo. em <em>tocar</em>, bata nos pads ou nas teclas: só tem notas do tom, não tem nota errada.</p>
                <p><b>3.</b> aperte <b className="es-r">●</b>: conta 4 e grava o que você tocar, já no tempo. Em <em>editar</em> dá pra ajustar na grade.</p>
                <p><b>4.</b> crie seções (verso, refrão…) e monte a <em>ordem</em> da música embaixo delas.</p>
                <p><b>5.</b> voz: adicione a faixa <em>voz</em>, use fone, e grave em cima da seção.</p>
                <p><b>6.</b> ⋯ → exportar: sai a música inteira, pronta pra mandar.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── pedaços ─────────────────────────────────────────── */
// a biblioteca é do LU2CA: o botão só aparece com a chave de admin no aparelho
function ehAdmin() { try { return !!localStorage.getItem("b4tida-admin") } catch { return false } }

const CORES_SECAO = ["#ff6b6b", "#ffd93d", "#00e5ff", "#a78bfa", "#4ade80", "#ff9000", "#ff3fb0", "#7dd3fc"]
const corSecao = (i: number) => CORES_SECAO[i % CORES_SECAO.length]

export function iconeInst(i: Inst) {
  return { bateria: "🥁", baixo: "〰", teclas: "▦", guitarra: "♪", pad: "≈", voz: "◉" }[i]
}

// mudar o tamanho da seção: cresceu, repete o que tinha; diminuiu, corta
function redimensionar(s: Secao, c: Secao["compassos"]): Secao {
  const antes = passosDa(s), depois = c * 16
  const eventos: Secao["eventos"] = {}
  for (const [fid, ev] of Object.entries(s.eventos)) {
    const base = ev.filter((e) => e.p < Math.min(antes, depois))
    const out = [...base]
    if (depois > antes) for (let o = antes; o < depois; o += antes) for (const e of base) if (e.p + o < depois) out.push({ ...e, p: e.p + o })
    eventos[fid] = out
  }
  return { ...s, compassos: c, eventos }
}

// mudar o tom/modo: as notas andam junto (grau por grau)
function transpor(m: Musica, tom: number, modo: Musica["modo"]): Musica {
  const desl = tom - m.tom
  const escAntes = modo === m.modo ? null : m.modo === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
  const escDepois = modo === "major" ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10]
  const mover = (n: number) => {
    let x = n + desl
    if (escAntes) {
      const rel = (((n - m.tom) % 12) + 12) % 12
      const g = escAntes.indexOf(rel)
      if (g >= 0) x += escDepois[g] - escAntes[g]
    }
    return x
  }
  const ehMelodica = (fid: string) => m.faixas.find((f) => f.id === fid)?.inst !== "bateria"
  return {
    ...m, tom, modo,
    secoes: m.secoes.map((s) => ({ ...s, eventos: Object.fromEntries(Object.entries(s.eventos).map(([fid, ev]) => [fid, ehMelodica(fid) ? ev.map((e) => ({ ...e, n: mover(e.n) })) : ev])) })),
  }
}

function MiniFaixa({ secao, faixa, inst, cor, pos, onClick }: { secao?: Secao; faixa: string; inst: Inst; cor: string; pos: React.RefObject<{ secao: string; passo: number; bloco: number } | null>; onClick: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let raf = 0
    const desenhar = () => {
      const c = cvs.current
      if (c && secao) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const W = Math.round(c.clientWidth * dpr), H = Math.round(c.clientHeight * dpr)
        if (c.width !== W || c.height !== H) { c.width = W; c.height = H }
        const g = c.getContext("2d")!
        g.clearRect(0, 0, W, H)
        const n = passosDa(secao)
        const pw = W / n
        for (let b = 0; b < secao.compassos; b++) { g.fillStyle = b % 2 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)"; g.fillRect(b * 16 * pw, 0, 16 * pw, H) }
        const ev = secao.eventos[faixa] ?? []
        if (inst === "voz") {
          if (secao.voz[faixa]) { g.fillStyle = cor; g.globalAlpha = 0.5; g.fillRect(0, H * 0.3, W, H * 0.4); g.globalAlpha = 1 }
        } else if (ev.length) {
          const ns = ev.map((e) => e.n)
          const lo = Math.min(...ns), hi = Math.max(...ns)
          g.fillStyle = cor
          for (const e of ev) {
            const y = inst === "bateria" ? H - ((e.n + 0.5) / 8) * H : hi === lo ? H / 2 : H - 3 * dpr - ((e.n - lo) / (hi - lo)) * (H - 6 * dpr)
            g.fillRect(e.p * pw, y - 1.5 * dpr, Math.max(pw * e.d - 1, 2 * dpr), 3 * dpr)
          }
        }
        const p = pos.current
        if (p && p.secao === secao.id) { g.fillStyle = "#fff"; g.fillRect(p.passo * pw, 0, 1.5 * dpr, H) }
      }
      raf = requestAnimationFrame(desenhar)
    }
    raf = requestAnimationFrame(desenhar)
    return () => cancelAnimationFrame(raf)
  }, [secao, faixa, inst, cor, pos])
  return <canvas ref={cvs} className="es-mini" onClick={onClick} />
}

function Referencias({ refs, tocando, onTocar }: { refs: ReferenciaBatida[]; tocando: string | null; onTocar: (r: ReferenciaBatida) => void }) {
  return (
    <>
      {refs.map((r) => (
        <div key={r.id} className="es-linha-musica" data-ref={r.id}>
          <button type="button" onClick={() => onTocar(r)}><b>{tocando === r.id ? "■ " : "▶ "}{r.nome}</b><small>{r.quem} · {r.bpm} bpm · instrumental</small></button>
        </div>
      ))}
    </>
  )
}

function Comecar({ onClima, onZero, refs, refTocando, onRef }: { onClima: (id: string) => void; onZero: () => void; refs: ReferenciaBatida[]; refTocando: string | null; onRef: (r: ReferenciaBatida) => void }) {
  return (
    <div className="es-comecar">
      <b className="es-logo">B4TIDA</b>
      <p>escolha um clima: a música já começa tocando, no andamento e no tom da faixa do LU2CA, com o kit de bateria tirado da própria gravação.</p>
      <div className="es-climas">
        {OPCOES_CLIMA.map((c) => (
          <button key={c.id} type="button" style={{ ["--c" as string]: c.cor }} onClick={() => onClima(c.id)}>
            <b>{c.nome}</b><small>{c.bpm} bpm</small>
          </button>
        ))}
      </div>
      <button type="button" className="es-zero" onClick={onZero}>começar do zero</button>
      {refs.length > 0 && (
        <div className="es-pop" style={{ marginTop: 16 }}>
          <b className="es-pop-tit">referências das missões</b>
          <Referencias refs={refs} tocando={refTocando} onTocar={onRef} />
        </div>
      )}
    </div>
  )
}

function Enviar({ onEnviar }: { onEnviar: (autor: string) => void }) {
  const [autor, setAutor] = useState("")
  return (
    <>
      <b className="es-pop-tit">mandar pra cidade</b>
      <small className="es-pop-nota">o LU2CA ouve tudo que chega. as melhores tocam na rádio do jogo. o seu nome aparece junto.</small>
      <input className="es-input" placeholder="seu nome (ou apelido)" maxLength={40} value={autor} onChange={(e) => setAutor(e.target.value)} />
      <button type="button" disabled={!autor.trim()} onClick={() => onEnviar(autor.trim())}>mandar</button>
    </>
  )
}

