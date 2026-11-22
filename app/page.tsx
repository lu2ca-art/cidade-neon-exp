"use client"

// A PÁGINA INICIAL (22/11, o dono): "uma página inicial que é tipo uma rádio mesmo e
// com a senha embaixo pra entrar na cidade". A rádio toca as faixas do vol. 1 que
// já saíram (só as lançadas, com o botão do app de música); a senha é o gatilho dos
// vídeos (lib/entrada.ts). A página antiga da raiz mora em /classico.
// [gosto] TODO O TEXTO AQUI É RASCUNHO: o dono troca as frases.

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PISTAS } from "./linha/estrada/pistas"
import { faixaLancada, linkDaFaixa, salvarFaixa } from "./linha/disco/linksFaixas"
import { voltaSegura } from "@/lib/entrada"
import "./entrada.css"

const INSTAGRAM = "https://www.instagram.com/lu2ca.art"
const TIKTOK = "https://tiktok.com/@lu2ca.mp3"

// as que já saíram e têm a versão com voz
const NO_AR = PISTAS.filter((p) => p.voz && faixaLancada(p.id))

function embaralhar<T>(l: T[]): T[] {
  const a = [...l]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function Page() {
  return (
    <Suspense fallback={<main className="en-pagina" />}>
      <Entrada />
    </Suspense>
  )
}

function Entrada() {
  const q = useSearchParams()
  // sem ?volta=: o jogo com a mesma query (utm_*, ?dev=1 seguem como antes do redirect)
  const resto = new URLSearchParams(q)
  resto.delete("volta")
  const volta = q.get("volta") ? voltaSegura(q.get("volta")) : `/linha${resto.size ? `?${resto}` : ""}`
  // os apps antigos dentro do jogo "voltam pra home": numa janela do jogo, direto pro
  // /linha (a janela da Linha fecha quando vê /linha)
  useEffect(() => { if (window.self !== window.top) window.location.replace("/linha") }, [])
  return (
    <main className="en-pagina">
      <div className="en-coluna">
        <header className="en-topo">
          <b>CIDADE NEON</b>
          <span>rádio · ao vivo do deserto</span>
        </header>
        <Radio />
        <Senha volta={volta} />
      </div>
    </main>
  )
}

function Radio() {
  const [ordem, setOrdem] = useState(NO_AR)
  const [i, setI] = useState(0)
  const [tocando, setTocando] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const faixa = ordem[i]
  // embaralha uma vez, no navegador (no servidor fica a ordem fixa: sem diferença na hidratação)
  useEffect(() => { setOrdem(embaralhar(NO_AR)) }, [])
  useEffect(() => {
    const a = audio.current
    if (!a || !faixa?.voz) return
    if (!a.src.endsWith(faixa.voz)) a.src = faixa.voz
    if (tocando) a.play().catch(() => setTocando(false))
    else a.pause()
  }, [faixa, tocando])
  const proxima = () => setI((x) => (x + 1) % Math.max(1, ordem.length))
  const link = useMemo(() => (faixa ? linkDaFaixa(faixa.id) : null), [faixa])
  if (!faixa) return null
  return (
    <section className={`en-radio ${tocando ? "is-tocando" : ""}`} aria-label="rádio">
      <audio ref={audio} preload="none" onEnded={proxima} />
      <button type="button" className="en-disco" onClick={() => setTocando((t) => !t)} aria-label={tocando ? "pausar a rádio" : "ligar a rádio"}>
        <span className="en-disco-vinil" aria-hidden="true" />
        <span className="en-disco-botao" aria-hidden="true">{tocando ? <IconePausa /> : <IconePlay />}</span>
      </button>
      <div className="en-agora">
        <small>{tocando ? "tocando agora" : "toca no disco pra ligar"}</small>
        <b>{faixa.faixa}</b>
        <span>LU2CA · CIDADE NEON vol. 1</span>
      </div>
      <div className="en-ctrl">
        <button type="button" onClick={proxima} aria-label="próxima faixa">próxima ⏭</button>
        {link && (
          <button type="button" className="en-salvar" onClick={() => salvarFaixa(faixa.id, "entrada")}>♥ ouvir no seu app</button>
        )}
      </div>
      <div className="en-ondas" aria-hidden="true">{Array.from({ length: 21 }, (_, k) => <i key={k} style={{ animationDelay: `${(k * 137) % 900}ms` }} />)}</div>
    </section>
  )
}

function Senha({ volta }: { volta: string }) {
  const [senha, setSenha] = useState("")
  const [estado, setEstado] = useState<"livre" | "conferindo" | "errou" | "espera">("livre")
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senha.trim() || estado === "conferindo") return
    setEstado("conferindo")
    try {
      const r = await fetch("/api/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }) })
      if (r.ok) { window.location.assign(volta); return }
      setEstado(r.status === 429 ? "espera" : "errou")
    } catch { setEstado("errou") }
  }
  return (
    <form className={`en-senha is-${estado}`} onSubmit={enviar}>
      <p className="en-senha-titulo">a cidade abre no lançamento.<br />quem tem a senha entra antes.</p>
      <div className="en-senha-campo">
        <input type="password" value={senha} onChange={(e) => { setSenha(e.target.value); if (estado !== "conferindo") setEstado("livre") }}
          placeholder="a senha" aria-label="a senha da cidade" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={200} />
        <button type="submit" disabled={!senha.trim() || estado === "conferindo"}>{estado === "conferindo" ? "abrindo…" : "entrar na cidade →"}</button>
      </div>
      <p className="en-senha-aviso" aria-live="polite">
        {estado === "errou" ? "não é essa. a cidade continua fechada." : estado === "espera" ? "calma. tenta de novo daqui a pouco." : " "}
      </p>
      <p className="en-senha-dica">a senha tá nos vídeos · <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">instagram</a> · <a href={TIKTOK} target="_blank" rel="noopener noreferrer">tiktok</a></p>
    </form>
  )
}

function IconePlay() {
  return <svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
}
function IconePausa() {
  return <svg width="22" height="22" viewBox="0 0 24 24"><rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" /><rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" /></svg>
}
