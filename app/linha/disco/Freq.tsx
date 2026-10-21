"use client"

// O FR3Q_ COM A CARA DO UNTITLED (LU2CA 20/10, o print da página dele): fundo
// grafite, a grade de capas quadradas arredondadas com o play quadrado escuro
// no canto, o título e "LU2CA" embaixo, e a barra de player flutuante.
// (LU2CA 21/10) só as PRÉVIAS de 22 s; (21/10 (5)) liberadas as faixas que já
// estão nas lojas, as outras no dia do lançamento (com a data). Nada de faixa inteira. Os
// outros álbuns pedem uma senha. Os ícones são desenhados (sem emoji).
// As prévias (public/audio/previews) são cortes de 22 s: das faixas lançadas,
// com voz (os cortes do próprio LU2CA, a pasta "22seg" dele); das que não
// saíram (Swav, Rollercoaster, Ojalá), cortes do instrumental (a voz não entra
// no repo antes do lançamento).

import { useEffect, useMemo, useRef, useState } from "react"
import { PISTAS } from "../estrada/pistas"
import type { Save } from "../estado"

const PREVIA = 22
// (a senha dos outros álbuns é conferida no servidor: app/api/album/senha)
type Faixa = { id: string; titulo: string; src: string }
type Projeto = { id: string; nome: string; capa: string; faixas: Faixa[]; senha?: boolean }

const ORDEM_VOL1 = ["nectar", "dopamina", "copo", "ojala", "swav", "sexta", "ontem", "rollercoaster", "chuva"]
const PROJETOS: Projeto[] = [
  { id: "vol1", nome: "cidade neon vol.1", capa: "/capas/untitled/cidade-neon-vol1.jpg", faixas: ORDEM_VOL1.map((id) => ({ id, titulo: PISTAS.find((p) => p.id === id)!.faixa, src: `/audio/previews/${id}.mp3` })) },
  { id: "vol2", nome: "cidade neon vol.2", capa: "/capas/untitled/cidade-neon-vol2.jpg", faixas: [], senha: true },
  { id: "cn", nome: "CIDADE NEON", capa: "/capas/untitled/cidade-neon.jpg", faixas: [], senha: true },
  { id: "live", nome: "cidadeneon.live", capa: "/capas/untitled/cidadeneon-live.jpg", faixas: [], senha: true },
  { id: "xenom", nome: "SUBÚRBIO XENOM", capa: "/capas/untitled/suburbio-xenom.jpg", faixas: [], senha: true },
  { id: "crypto", nome: "cidadeneon.crypto", capa: "/capas/untitled/cidadeneon-crypto.jpg", faixas: [], senha: true },
]
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`
const onda = (nome: string) => Array.from({ length: 56 }, (_, i) => { const s = Math.sin((i + 1) * 12.9898 + nome.length * 78.233 + nome.charCodeAt(i % nome.length)) * 43758.5453; return 0.25 + 0.75 * Math.abs(s - Math.floor(s) - 0.5) * 2 })

// os ícones (traço, como o resto do holo)
type IcoId = "play" | "pausa" | "anterior" | "proxima" | "aleatorio" | "repetir" | "cadeado" | "som" | "mais"
function Ico({ id, s = 18 }: { id: IcoId; s?: number }) {
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true }
  switch (id) {
    case "play": return <svg {...p}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>
    case "pausa": return <svg {...p}><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" /></svg>
    case "anterior": return <svg {...p}><path d="M18 5v14L8 12z" fill="currentColor" stroke="none" /><path d="M6 5v14" /></svg>
    case "proxima": return <svg {...p}><path d="M6 5v14l10-7z" fill="currentColor" stroke="none" /><path d="M18 5v14" /></svg>
    case "aleatorio": return <svg {...p}><path d="M3 7h3c4 0 6 10 10 10h4M3 17h3c1.6 0 2.8-1.5 3.8-3.4M13.2 9.4C14.2 8 15.2 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3" /></svg>
    case "repetir": return <svg {...p}><path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3" /></svg>
    case "cadeado": return <svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
    case "som": return <svg {...p}><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor" stroke="none" /><path d="M16 9a4 4 0 0 1 0 6" /></svg>
    case "mais": return <svg {...p}><path d="M12 5v14M5 12h14" /></svg>
  }
}

// quando a faixa sai (0 = já está nas lojas) e se já saiu
const lancaEm = (id: string) => { const l = PISTAS.find((p) => p.id === id)?.lancamento; return l ? new Date(l).getTime() : 0 }
const jaSaiu = (id: string) => lancaEm(id) <= Date.now()

export function Freq(_props: { save: Pick<Save, "objetos"> }) {
  // (LU2CA 21/10 (5)) o app libera as faixas que já estão nas lojas; as outras,
  // no dia do lançamento (as missões seguem iguais, independente disso)
  const liberada = jaSaiu
  const [aberto, setAberto] = useState<string | null>("vol1") // o projeto com a lista aberta
  const [tocando, setTocando] = useState<string | null>(null) // o id da faixa
  const [play, setPlay] = useState(false)
  const [t, setT] = useState(0)
  const [aleatorio, setAleatorio] = useState(false)
  const [repete, setRepete] = useState(false)
  const [vol, setVol] = useState(0.9)
  const [pedeSenha, setPedeSenha] = useState<Projeto | null>(null)
  const [senha, setSenha] = useState("")
  const [errou, setErrou] = useState(false)
  const [checando, setChecando] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const vol1 = PROJETOS[0]
  const tocaveis = vol1.faixas.filter((f) => liberada(f.id))
  const faixa = vol1.faixas.find((f) => f.id === tocando) ?? null
  const barras = useMemo(() => onda(faixa?.titulo ?? "fr3q"), [faixa?.titulo])
  const pular = (d: 1 | -1) => {
    if (!tocaveis.length) return
    const k = tocaveis.findIndex((f) => f.id === tocando)
    const n = aleatorio ? Math.floor(Math.random() * tocaveis.length) : (k + d + tocaveis.length) % tocaveis.length
    setTocando(tocaveis[n].id)
  }
  const pularRef = useRef(pular)
  useEffect(() => { pularRef.current = pular })
  useEffect(() => {
    if (!faixa) return
    const a = audio.current ?? (audio.current = new Audio())
    a.src = faixa.src
    a.currentTime = 0
    a.volume = vol
    void a.play().then(() => setPlay(true)).catch(() => setPlay(false))
    const fim = () => { if (repete) { a.currentTime = 0; void a.play() } else { setPlay(false); pularRef.current(1) } }
    // nunca passa dos 22 s (a prévia)
    const tu = () => { if (a.currentTime >= PREVIA) { a.pause(); fim(); return } setT(a.currentTime) }
    a.addEventListener("timeupdate", tu); a.addEventListener("ended", fim)
    return () => { a.removeEventListener("timeupdate", tu); a.removeEventListener("ended", fim) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faixa?.src])
  useEffect(() => { if (audio.current) audio.current.volume = vol }, [vol])
  useEffect(() => () => { audio.current?.pause() }, [])
  const abrirProjeto = (p: Projeto) => {
    if (p.senha) { setPedeSenha(p); setSenha(""); setErrou(false); return }
    setAberto((x) => (x === p.id ? null : p.id))
  }
  const alternar = () => {
    const a = audio.current
    if (!a || !faixa) { if (tocaveis[0]) setTocando(tocaveis[0].id); return }
    if (a.paused) { if (a.currentTime >= PREVIA) a.currentTime = 0; void a.play(); setPlay(true) } else { a.pause(); setPlay(false) }
  }
  const conferir = async (e: React.FormEvent) => {
    e.preventDefault()
    if (checando) return
    setChecando(true)
    // (os outros álbuns moram no untitled: com a senha, abre lá). A janela abre
    // já, no clique (senão o navegador bloqueia), e vai pro convite se acertar.
    const janela = window.open("about:blank", "_blank")
    if (janela) janela.opener = null
    try {
      const r = await fetch("/api/album/senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }) })
      const d = (await r.json().catch(() => ({}))) as { ok?: boolean; url?: string }
      if (d.ok && d.url) {
        if (janela) janela.location.href = d.url
        else window.open(d.url, "_blank", "noreferrer")
        setPedeSenha(null)
      } else { janela?.close(); setErrou(true) }
    } catch { janela?.close(); setErrou(true) }
    setChecando(false)
  }
  const pos = t / PREVIA
  return (
    <div className="l-freq">
      <div className="l-freq-grade">
        {PROJETOS.map((p) => (
          <button key={p.id} type="button" className={`l-freq-proj ${aberto === p.id ? "is-aqui" : ""} ${p.senha ? "is-trancado" : ""}`} onClick={() => abrirProjeto(p)}>
            <span className="l-freq-capa" style={{ backgroundImage: `url(${p.capa})` }}>
              <i className="l-freq-play">{p.senha ? <Ico id="cadeado" /> : <Ico id={aberto === p.id && play ? "pausa" : "play"} />}</i>
            </span>
            <b>{p.nome}</b>
            <small>{p.senha ? "LU2CA · com senha" : `LU2CA · ${tocaveis.length}/${p.faixas.length} prévias`}</small>
          </button>
        ))}
        {aberto === "vol1" && (
          <ol className="l-freq-lista">
            {vol1.faixas.map((f, i) => {
              const ok = liberada(f.id)
              return (
                <li key={f.id}>
                  <button type="button" disabled={!ok} className={tocando === f.id ? "is-aqui" : ""} onClick={() => setTocando(f.id)}>
                    <em>{i + 1}</em><b>{f.titulo}</b><small>{ok ? "prévia · 0:22" : `sai ${new Date(lancaEm(f.id)).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`}</small>{ok ? <Ico id={tocando === f.id && play ? "pausa" : "play"} s={14} /> : <Ico id="cadeado" s={14} />}
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
      <div className="l-freq-player">
        <span className="l-freq-mini" style={faixa ? { backgroundImage: `url(${vol1.capa})` } : undefined} />
        <span className="l-freq-nome"><b>{faixa?.titulo ?? (tocaveis.length ? "escolhe uma faixa" : "nenhuma faixa liberada ainda")}</b><small>{faixa ? "cidade neon vol.1 · prévia" : "LU2CA"}</small></span>
        <span className="l-freq-onda" onClick={(e) => { const a = audio.current; if (!a || !faixa) return; const r = e.currentTarget.getBoundingClientRect(); a.currentTime = Math.min(PREVIA - 0.2, ((e.clientX - r.left) / r.width) * PREVIA) }}>
          {barras.map((h, i) => <i key={i} className={i / barras.length < pos ? "is-tocou" : ""} style={{ height: `${h * 100}%` }} />)}
        </span>
        <small className="l-freq-tempo">{mmss(t)} / {mmss(faixa ? PREVIA : 0)}</small>
        <span className="l-freq-ctrl">
          <button type="button" className={aleatorio ? "is-on" : ""} onClick={() => setAleatorio((x) => !x)} aria-label="aleatório"><Ico id="aleatorio" /></button>
          <button type="button" onClick={() => pular(-1)} aria-label="voltar"><Ico id="anterior" /></button>
          <button type="button" className="is-play" onClick={alternar} aria-label={play ? "pausar" : "tocar"}><Ico id={play ? "pausa" : "play"} /></button>
          <button type="button" onClick={() => pular(1)} aria-label="avançar"><Ico id="proxima" /></button>
          <button type="button" className={repete ? "is-on" : ""} onClick={() => setRepete((x) => !x)} aria-label="repetir"><Ico id="repetir" /></button>
          <span className="l-freq-vol"><Ico id="som" s={16} /><input type="range" min={0} max={1} step={0.05} value={vol} onChange={(e) => setVol(+e.target.value)} aria-label="volume" /></span>
        </span>
        <button className="l-freq-mais" type="button" onClick={() => { setPedeSenha(PROJETOS[1]); setSenha(""); setErrou(false) }} aria-label="os outros álbuns (com senha)"><Ico id="mais" /></button>
      </div>
      {pedeSenha && (
        <div className="l-freq-senha-fundo" onClick={() => setPedeSenha(null)}>
          <form className={`l-freq-senha ${errou ? "is-errou" : ""}`} onSubmit={conferir} onClick={(e) => e.stopPropagation()}>
            <span className="l-freq-senha-capa" style={{ backgroundImage: `url(${pedeSenha.capa})` }}><Ico id="cadeado" s={26} /></span>
            <b>{pedeSenha.nome}</b>
            <small>LU2CA · este projeto pede senha</small>
            <input autoFocus autoComplete="off" placeholder="senha" value={senha} onChange={(e) => { setSenha(e.target.value); setErrou(false) }} aria-label="senha" />
            {errou && <em>senha errada</em>}
            <button type="submit">abrir</button>
            <button type="button" className="is-sec" onClick={() => setPedeSenha(null)}>cancelar</button>
          </form>
        </div>
      )}
    </div>
  )
}
