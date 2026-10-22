"use client"

// O caderno do dono (22/10): o LU2CA joga do começo ao fim e, a qualquer momento,
// toca no ✎ — o jogo inteiro congela (imagem, som, animação: congelar.ts), a nota
// sai presa à parte do jogo em que ele está (parte.ts: "Nectar › regar as flores")
// e ele escreve (ou dita pelo microfone do teclado) o que sentiu.
// Cada nota vai pra /api/caderno (PostHog + arquivo no Mac) e fica guardada no
// aparelho; se a rede falhar, reenvia na próxima vez.
// Só aparece pra quem abriu o jogo uma vez com ?caderno na URL (?caderno=sair desliga).
// Atalho no computador: tecla N.

import { useCallback, useEffect, useRef, useState } from "react"
import { congelar, descongelar, instalarRelogio } from "./congelar"
import { parteDe, type Onde } from "./parte"
import { ligarReplay, replaySuportado, retomarReplay, ultimosSegundos } from "./replay"

const LIGADO = "cn-caderno"
const GUARDADAS = "cn-caderno-notas"
const PENDENTES = "cn-caderno-pendentes"
const SAVE = "cn-linha-222"
const TAGS = ["bug", "lento", "feio", "lindo", "confuso", "ideia", "missão", "narrativa", "som", "controle"]

export const EVENTO_CADERNO = "cn-caderno"

type Nota = { id: string; quando: string; texto: string; tags: string[]; estado: Record<string, unknown> }

const ler = <T,>(k: string, padrao: T): T => { try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : padrao } catch { return padrao } }
const gravar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* cheio: segue */ } }

function estadoAgora(): Record<string, unknown> {
  const save = ler<Record<string, unknown>>(SAVE, {})
  const pega = (o: unknown) => {
    if (!o || typeof o !== "object") return undefined
    const r = o as Record<string, unknown>
    return { fase: r.fase, nectar: r.nectar, missao: r.missao, show: r.show, holo: r.holo } as Record<string, string | undefined>
  }
  const historia = pega(save.disco) ?? pega(save.historia)
  const onde = (window as unknown as { __cnOnde?: Onde }).__cnOnde
  const parte = parteDe(historia, onde)
  return {
    parte: parte.id, parteNome: parte.nome, onde,
    url: location.pathname + location.search.replace(/([?&])caderno=[^&]*/, "$1").replace(/[?&]$/, ""),
    historia,
    xp: save.xp, agua: save.agua, neon: save.neon, popularidade: save.popularidade,
    tela: `${innerWidth}x${innerHeight}@${devicePixelRatio}`,
    ua: navigator.userAgent.slice(0, 160),
  }
}

async function enviar(n: Nota) {
  const r = await fetch("/api/caderno", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(n) })
  return r.ok
}

export function Caderno() {
  const [ligado, setLigado] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [aviso, setAviso] = useState("")
  const [total, setTotal] = useState(0)
  const [tela, setTela] = useState("")
  const estado = useRef<Record<string, unknown>>({})
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("caderno")
    if (p === "sair") localStorage.removeItem(LIGADO)
    else if (p !== null) localStorage.setItem(LIGADO, "1")
    const sim = localStorage.getItem(LIGADO) === "1"
    if (sim) { instalarRelogio(); ligarReplay() }
    setLigado(sim)
    setTotal(ler<Nota[]>(GUARDADAS, []).length)
  }, [])

  const reenviar = useCallback(async () => {
    const pend = ler<Nota[]>(PENDENTES, [])
    if (!pend.length) return
    const ficam: Nota[] = []
    for (const n of pend) { try { if (!(await enviar(n))) ficam.push(n) } catch { ficam.push(n) } }
    gravar(PENDENTES, ficam)
  }, [])

  const [mandando, setMandando] = useState("")
  // o replay (⏪): os últimos segundos da cena, com o jogo congelado
  const [replay, setReplay] = useState<string[] | null>(null)
  const [trecho, setTrecho] = useState(0)
  const video = useRef<HTMLVideoElement>(null)
  const abrirReplay = useCallback(async () => {
    congelar()
    const blobs = await ultimosSegundos()
    if (!blobs.length) { descongelar(); retomarReplay(); setAviso("ainda não tem replay (grava a cena depois de uns segundos)"); setTimeout(() => setAviso(""), 2200); return }
    setTrecho(0)
    setReplay(blobs.map((b) => URL.createObjectURL(b)))
  }, [])
  const fecharReplay = useCallback((paraAnotar: boolean) => {
    setReplay((r) => { r?.forEach((u) => URL.revokeObjectURL(u)); return null })
    if (!paraAnotar) { descongelar(); retomarReplay() }
  }, [])
  const enviarTodas = useCallback(async () => {
    const todas = ler<Nota[]>(GUARDADAS, [])
    let ok = 0
    for (let i = 0; i < todas.length; i++) {
      setMandando(`enviando ${i + 1} de ${todas.length}…`)
      try { if (await enviar(todas[i])) ok++ } catch { /* sem rede */ }
    }
    if (ok === todas.length) gravar(PENDENTES, [])
    setMandando(ok === todas.length ? `${ok} notas enviadas ✓` : `${ok} de ${todas.length} enviadas (tenta de novo depois)`)
  }, [])

  const abrir = useCallback((doReplay = false) => {
    estado.current = { ...estadoAgora(), ...(doReplay ? { doReplay: true } : {}) }
    setTela(String(estado.current.parteNome ?? ""))
    congelar()
    setAberto(true)
    window.dispatchEvent(new CustomEvent(EVENTO_CADERNO, { detail: { aberto: true } }))
    setTimeout(() => area.current?.focus(), 50)
    void reenviar()
  }, [reenviar])

  const fechar = useCallback(() => {
    setAberto(false); setTexto(""); setTags([]); setMandando("")
    descongelar()
    retomarReplay()
    window.dispatchEvent(new CustomEvent(EVENTO_CADERNO, { detail: { aberto: false } }))
  }, [])

  const salvar = useCallback(async () => {
    if (!texto.trim() && !tags.length) { fechar(); return }
    const n: Nota = { id: crypto.randomUUID(), quando: new Date().toISOString(), texto: texto.trim(), tags, estado: estado.current }
    const todas = ler<Nota[]>(GUARDADAS, [])
    todas.push(n)
    gravar(GUARDADAS, todas.slice(-500))
    setTotal(todas.length)
    fechar()
    let ok = false
    try { ok = await enviar(n) } catch { /* sem rede */ }
    if (!ok) gravar(PENDENTES, [...ler<Nota[]>(PENDENTES, []), n].slice(-50))
    setAviso(ok ? "anotado ✓" : "guardado no aparelho (envia depois)")
    setTimeout(() => setAviso(""), 1800)
  }, [texto, tags, fechar])

  useEffect(() => {
    if (!ligado) return
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return
      if (e.key === "n" || e.key === "N") { e.preventDefault(); if (!aberto) abrir() }
    }
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [ligado, aberto, abrir])

  if (!ligado) return null

  return (
    <>
      <style>{CSS}</style>
      {replay && (
        <div className="cdn-fundo" data-caderno>
          <div className="cdn-caixa">
            <div className="cdn-topo"><b>os últimos segundos</b><span>{replay.length > 1 ? `parte ${trecho + 1} de ${replay.length}` : ""}</span></div>
            <video ref={video} className="cdn-video" src={replay[trecho]} autoPlay muted playsInline controls onEnded={() => { if (trecho < replay.length - 1) setTrecho(trecho + 1) }} />
            <div className="cdn-acoes">
              <button type="button" onClick={() => { setTrecho(0); if (video.current) { video.current.currentTime = 0; void video.current.play() } }}>ver de novo</button>
              <button type="button" onClick={() => fecharReplay(false)}>voltar pro jogo</button>
              <button type="button" className="cdn-ok" onClick={() => { fecharReplay(true); abrir(true) }}>anotar isso</button>
            </div>
          </div>
        </div>
      )}
      {!aberto && !replay && (
        <div className="cdn-btns">
          {replaySuportado() && <button type="button" className="cdn-btn" onClick={() => void abrirReplay()} aria-label="ver os últimos segundos de novo">⏪</button>}
          <button type="button" className="cdn-btn" onClick={() => abrir()} aria-label="anotar">
            ✎{total ? <small>{total}</small> : null}
          </button>
        </div>
      )}
      {aviso && <div className="cdn-aviso">{aviso}</div>}
      {aberto && (
        <div className="cdn-fundo" data-caderno onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") void salvar(); if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void salvar() }}>
          <div className="cdn-caixa">
            <div className="cdn-topo">
              <b>caderno</b>
              <span>{tela}</span>
            </div>
            <textarea ref={area} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="o que você sentiu aqui? (dá pra ditar no microfone do teclado)" rows={4} />
            <div className="cdn-tags">
              {TAGS.map((t) => (
                <button key={t} type="button" className={tags.includes(t) ? "is-on" : ""} onClick={() => setTags((v) => (v.includes(t) ? v.filter((x) => x !== t) : [...v, t]))}>{t}</button>
              ))}
            </div>
            {total > 0 && (
              <div className="cdn-todas">
                <span>{mandando || `${total} ${total === 1 ? "nota" : "notas"} neste aparelho`}</span>
                <button type="button" onClick={() => void enviarTodas()}>enviar todas</button>
              </div>
            )}
            <div className="cdn-acoes">
              <button type="button" onClick={() => void salvar()}>voltar pro jogo</button>
              <button type="button" className="cdn-ok" onClick={() => void salvar()}>anotar e voltar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const CSS = `
.cdn-btns{position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:50%;transform:translateX(-50%);z-index:2147483000;display:flex;gap:6px}
.cdn-video{width:100%;max-height:55vh;border-radius:10px;background:#000}
.cdn-btn{width:40px;height:40px;border-radius:20px;border:1px solid #ffffff55;background:#0a0918cc;color:#fff;font:600 18px system-ui;backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;gap:2px}
.cdn-btn small{font:600 9px ui-monospace,monospace;opacity:.7}
.cdn-aviso{position:fixed;top:calc(env(safe-area-inset-top) + 56px);left:50%;transform:translateX(-50%);z-index:2147483000;padding:6px 12px;border-radius:14px;background:#0a0918e6;color:#fff;font:500 13px system-ui}
.cdn-fundo{position:fixed;inset:0;z-index:2147483001;background:#000a;display:flex;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top) + 12px) 12px 12px;overflow:auto}
.cdn-caixa{width:100%;max-width:480px;background:#14122a;border:1px solid #ffffff2a;border-radius:16px;padding:12px;color:#fff;font:15px system-ui;display:flex;flex-direction:column;gap:10px}
.cdn-topo{display:flex;justify-content:space-between;align-items:baseline}
.cdn-topo span{font:12px system-ui;opacity:.75;text-align:right}
.cdn-caixa textarea{width:100%;box-sizing:border-box;background:#0a0918;color:#fff;border:1px solid #ffffff33;border-radius:10px;padding:10px;font:16px system-ui;resize:vertical}
.cdn-tags{display:flex;flex-wrap:wrap;gap:6px}
.cdn-tags button{padding:6px 10px;border-radius:14px;border:1px solid #ffffff33;background:transparent;color:#fff;font:13px system-ui}
.cdn-tags button.is-on{background:#ff3fa4;border-color:#ff3fa4}
.cdn-todas{display:flex;justify-content:space-between;align-items:center;gap:8px;font:12px system-ui;opacity:.8}
.cdn-todas button{padding:6px 10px;border-radius:12px;border:1px solid #ffffff44;background:transparent;color:#fff;font:600 12px system-ui}
.cdn-acoes{display:flex;gap:8px}
.cdn-acoes button{flex:1;padding:12px;border-radius:12px;border:1px solid #ffffff33;background:transparent;color:#fff;font:600 14px system-ui}
.cdn-acoes .cdn-ok{background:#fff;color:#0a0918}
`
