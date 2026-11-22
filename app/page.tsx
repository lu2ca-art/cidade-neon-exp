"use client"

// A PÁGINA INICIAL (22/11, o dono): dentro da Kombi, em primeira pessoa, como no jogo
// (app/entrada/KombiEntrada.tsx). A rádio é a do painel: toca as faixas do vol. 1 que já
// saíram (com o botão do app de música). A senha é a partida da Kombi: certa, o motor
// pega e ela entra na cidade (lib/entrada.ts: a senha é o gatilho dos vídeos).
// A página antiga da raiz (a v1) mora em app/_v1, sem rota.
// [gosto] TODO O TEXTO AQUI É RASCUNHO: o dono troca as frases.

import dynamic from "next/dynamic"
import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PISTAS } from "./linha/estrada/pistas"
import { faixaLancada, linkDaFaixa, salvarFaixa } from "./linha/disco/linksFaixas"
import { voltaSegura } from "@/lib/entrada"
import type { EstadoKombi } from "./entrada/KombiEntrada"
import "./entrada.css"

const KombiEntrada = dynamic(() => import("./entrada/KombiEntrada").then((m) => m.KombiEntrada), { ssr: false })

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

  const estado = useRef<EstadoKombi>({ partida: false, tocando: false })
  const radio = useRadio()
  const ancora = useRef<HTMLDivElement | null>(null)
  const [partiu, setPartiu] = useState(false)
  const darPartida = () => {
    estado.current.partida = true
    setPartiu(true)
    roncarMotor()
    setTimeout(() => window.location.assign(volta), 2600)
  }
  return (
    <main className={`en-pagina ${partiu ? "is-partida" : ""}`}>
      <KombiEntrada estado={estado} radio={ancora} />
      <div ref={ancora} className="en-radio-ancora"><RadioPainel r={radio} /></div>
      <audio ref={radio.audio} preload="none" onEnded={radio.proxima} />
      <header className="en-topo" aria-hidden={partiu}>
        <b>CIDADE NEON</b>
        <span>arrasta pra olhar em volta</span>
      </header>
      <Senha onCerta={darPartida} partiu={partiu} />
      <div className="en-escuro" aria-hidden="true" />
    </main>
  )
}

// ── a rádio do painel: o estado mora aqui; o display fica preso no painel (3D) ──
function useRadio() {
  const [ordem, setOrdem] = useState(NO_AR)
  const [i, setI] = useState(0)
  const [tocando, setTocando] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const faixa = ordem[i]
  // embaralha uma vez, no navegador (no servidor fica a ordem fixa)
  useEffect(() => { setOrdem(embaralhar(NO_AR)) }, [])
  useEffect(() => {
    const a = audio.current
    if (!a || !faixa?.voz) return
    if (!a.src.endsWith(faixa.voz)) a.src = faixa.voz
    if (tocando) a.play().catch(() => setTocando(false))
    else a.pause()
  }, [faixa, tocando])
  const proxima = () => setI((x) => (x + 1) % Math.max(1, ordem.length))
  const anterior = () => setI((x) => (x - 1 + ordem.length) % Math.max(1, ordem.length))
  return { faixa, tocando, alternar: () => setTocando((t) => !t), proxima, anterior, audio }
}
type Radio = ReturnType<typeof useRadio>

function RadioPainel({ r }: { r: Radio }) {
  const f = r.faixa
  if (!f) return null
  const link = linkDaFaixa(f.id)
  const parar = (e: React.PointerEvent) => e.stopPropagation()
  return (
    <div className={`en-radio ${r.tocando ? "is-tocando" : ""}`} onPointerDown={parar}>
      <div className="en-radio-lcd" aria-live="polite">
        <small>{r.tocando ? "222 FM · no ar" : "222 FM · desligado"}</small>
        <b><span>{f.faixa} · LU2CA</span></b>
      </div>
      <div className="en-radio-bts">
        <button type="button" onClick={r.anterior} aria-label="faixa anterior">⏮</button>
        <button type="button" className="en-radio-liga" onClick={r.alternar} aria-label={r.tocando ? "desligar a rádio" : "ligar a rádio"}>{r.tocando ? "❚❚" : "▶"}</button>
        <button type="button" onClick={r.proxima} aria-label="próxima faixa">⏭</button>
        {link && <button type="button" className="en-radio-salvar" onClick={() => salvarFaixa(f.id, "entrada")} aria-label={`ouvir ${f.faixa} no seu app de música`}>♥</button>}
      </div>
    </div>
  )
}

// ── a senha é a partida ──
function Senha({ onCerta, partiu }: { onCerta: () => void; partiu: boolean }) {
  const [senha, setSenha] = useState("")
  const [estado, setEstado] = useState<"livre" | "conferindo" | "errou" | "espera">("livre")
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senha.trim() || estado === "conferindo" || partiu) return
    setEstado("conferindo")
    try {
      const r = await fetch("/api/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha }) })
      if (r.ok) { onCerta(); return }
      setEstado(r.status === 429 ? "espera" : "errou")
    } catch { setEstado("errou") }
  }
  return (
    <form className={`en-senha is-${estado}`} onSubmit={enviar} onPointerDown={(e) => e.stopPropagation()}>
      <p className="en-senha-titulo">{partiu ? "o motor pegou." : "a cidade abre no lançamento. quem tem a senha entra antes."}</p>
      {!partiu && (
        <div className="en-senha-campo">
          <input type="password" value={senha} onChange={(e) => { setSenha(e.target.value); if (estado !== "conferindo") setEstado("livre") }}
            placeholder="a senha" aria-label="a senha da cidade" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={200} />
          <button type="submit" disabled={!senha.trim() || estado === "conferindo"}>{estado === "conferindo" ? "girando a chave…" : "dar a partida"}</button>
        </div>
      )}
      <p className="en-senha-aviso" aria-live="polite">
        {estado === "errou" ? "não é essa. o motor nem tossiu." : estado === "espera" ? "calma. tenta de novo daqui a pouco." : " "}
      </p>
      {!partiu && <p className="en-senha-dica">a senha tá nos vídeos · <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer">instagram</a> · <a href={TIKTOK} target="_blank" rel="noopener noreferrer">tiktok</a></p>}
    </form>
  )
}

// o ronco da partida: o motor de arranque (uns trancos) e o motor pegando, grave
function roncarMotor() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx(), t0 = ctx.currentTime
    const saida = ctx.createGain(); saida.gain.value = 0.5; saida.connect(ctx.destination)
    const filtro = ctx.createBiquadFilter(); filtro.type = "lowpass"; filtro.frequency.value = 420; filtro.connect(saida)
    const motor = ctx.createOscillator(); motor.type = "sawtooth"
    const g = ctx.createGain(); g.gain.value = 0
    motor.connect(g); g.connect(filtro)
    // o arranque: três trancos
    for (let k = 0; k < 3; k++) {
      const a = t0 + k * 0.22
      motor.frequency.setValueAtTime(34, a)
      g.gain.setValueAtTime(0.0001, a); g.gain.linearRampToValueAtTime(0.5, a + 0.05); g.gain.linearRampToValueAtTime(0.08, a + 0.18)
    }
    // pegou: sobe e fica roncando
    const p = t0 + 0.7
    motor.frequency.setValueAtTime(40, p); motor.frequency.exponentialRampToValueAtTime(95, p + 0.5); motor.frequency.exponentialRampToValueAtTime(62, p + 1.4)
    g.gain.setValueAtTime(0.1, p); g.gain.linearRampToValueAtTime(0.6, p + 0.35); g.gain.linearRampToValueAtTime(0.35, p + 1.6); g.gain.linearRampToValueAtTime(0.0001, p + 2.4)
    motor.start(t0); motor.stop(p + 2.5)
    setTimeout(() => ctx.close().catch(() => {}), 3500)
  } catch { /* sem áudio: segue */ }
}
