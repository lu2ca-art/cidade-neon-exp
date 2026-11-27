"use client"

// A PÁGINA INICIAL (22/11, o dono): dentro da Kombi, em primeira pessoa, como no jogo
// (app/entrada/KombiEntrada.tsx). A rádio é a do painel: toca as faixas do vol. 1 que já
// saíram (com o botão do app de música). A senha é a partida da Kombi: certa, o motor
// pega e ela entra na cidade (lib/entrada.ts: a senha é o gatilho dos vídeos).
// A página antiga da raiz (a v1) mora em app/_v1, sem rota.
// [gosto] TODO O TEXTO AQUI É RASCUNHO: o dono troca as frases.

import dynamic from "next/dynamic"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PISTAS } from "./linha/estrada/pistas"
import { faixaLancada, linkDaFaixa, salvarFaixa } from "./linha/disco/linksFaixas"
import { voltaSegura } from "@/lib/entrada"
import type { EstadoKombi } from "./entrada/KombiEntrada"
import { HIPER } from "./entrada/hiper"
import { TONS } from "./linha/tons"
import TONS_TEMPO from "./linha/tons-tempo.json"
import type { Tom } from "./linha/som"
import { bip } from "./linha/disco/pecas/sons"
import { violao } from "./linha/som"
import VINIS from "./linha/vinis.json"
import "./entrada.css"

const KombiEntrada = dynamic(() => import("./entrada/KombiEntrada").then((m) => m.KombiEntrada), { ssr: false })
// (27/11, o dono) cada coisa da Kombi é clicável: a MPC abre a batida (a do jogo), o
// toca-discos o acervo antigo, o violão e o teclado abrem pra tocar, SEMPRE no tom da música
// (a faixa da rádio, ou o disco que está tocando). A batida pausa rádio e disco; saiu, eles
// voltam de onde estavam
const KombeatStudio = dynamic(() => import("./linha/estrada/KombeatStudio").then((m) => m.KombeatStudio), { ssr: false })
const Violao = dynamic(() => import("./linha/disco/Violao").then((m) => m.Violao), { ssr: false })
type Instrumento = "violao" | "teclado"
// o teclado: um piano elétrico sintetizado (RASCUNHO, como as vozes de instrumentosLoja.ts)
// (27/11, o dono: "o balanço música × instrumento tá desproporcional") os instrumentos daqui
// tocam mais alto que no jogo, e a música abaixa enquanto um deles está aberto (MUSICA_TOCANDO)
const TECLADO = { nome: "teclado", tocar: (f: number, v = 0.32, q = 0) => { bip(f, 0.9, "triangle", v * 1.5, q); bip(f * 2, 0.45, "sine", v * 0.45, q) } }
const VIOLAO = { nome: "violão", aquece: true as const, tocar: (f: number, v = 0.32, q = 0) => violao(f, v * 2.4, q) }
const MUSICA_TOCANDO = 0.4
// os discos antigos (domínio público), os mesmos do acervo do jogo
const ACERVO = VINIS as { titulo: string; autor: string; src: string }[]
// a cor do selo de cada disco na gaveta
const SELOS = ["#ffc857", "#ff6b6b", "#6ff0d6", "#b38cff", "#ff8fc8", "#8fd16a", "#5aa9ff", "#f4ead7"]
// (27/11, o dono: "mudam de tom sozinhos com a música") o tom de cada trecho de cada faixa
// (scripts/linha-tons-tempo.py): [segundo, tônica, modo], cada um vale até o próximo
const LINHA_TOM = TONS_TEMPO as unknown as Record<string, [number, number, Tom["modo"]][]>
function tomNoTempo(src: string, t: number): Tom | null {
  const l = LINHA_TOM[src]
  if (!l?.length) return null
  let k = 0
  while (k + 1 < l.length && l[k + 1][0] <= t) k++
  return { tonica: l[k][1], modo: l[k][2] }
}
// o caminho da faixa (sem o domínio), como está nas tabelas
const caminho = (a: HTMLAudioElement | null) => { try { return a?.src ? new URL(a.src).pathname : "" } catch { return "" } }

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
  const acervo = useAcervo()
  // pros testes por dentro (Playwright): virar o olhar sem arrastar (__kombi.pedido = {yaw, pitch})
  useEffect(() => { (window as unknown as { __kombi: EstadoKombi }).__kombi = estado.current }, [])
  const router = useRouter()
  const [partiu, setPartiu] = useState(false)
  // o que está aberto por cima: a batida, o acervo ou um instrumento (um de cada vez)
  const [batida, setBatida] = useState(false)
  const [estante, setEstante] = useState(false)
  const [instrumento, setInstrumento] = useState<Instrumento | null>(null)
  // a batida interrompe rádio e disco; ao sair, volta o que estava tocando, do mesmo ponto
  const pausados = useRef({ radio: false, disco: false })
  const abrirBatida = () => {
    if (partiu || batida) return
    pausados.current = { radio: radio.tocando, disco: acervo.tocando }
    radio.parar(); acervo.pausar()
    setEstante(false); setInstrumento(null); setBatida(true)
  }
  const fecharBatida = () => {
    setBatida(false)
    if (pausados.current.radio) radio.ligar()
    else if (pausados.current.disco) acervo.continuar()
    pausados.current = { radio: false, disco: false }
  }
  // rádio e disco não tocam juntos: ligar um desliga o outro
  const alternarRadio = () => { if (!radio.tocando) acervo.pausar(); radio.alternar() }
  const tocarDisco = (i: number) => { radio.parar(); acervo.tocar(i) }
  // a gaveta: abre (e o olhar desce até ela), fecha no mesmo toque
  const [discoPerto, setDiscoPerto] = useState<number | null>(null)
  const abrir = (o: "estante" | Instrumento) => {
    if (partiu || batida) return
    if (o === "estante") {
      const abre = !estante
      setEstante(abre); setInstrumento(null); setDiscoPerto(null)
      if (abre) estado.current.pedido = { yaw: -0.45, pitch: -0.5 }
      return
    }
    setEstante(false); setInstrumento(o)
  }
  // o tom AGORA: o trecho do disco que está tocando, ou o da faixa da rádio (tocando ou na
  // vez). Relido a cada meio segundo com um instrumento aberto: trocou o tom na música, troca
  // no instrumento
  const [tom, setTom] = useState<Tom | null>(null)
  useEffect(() => {
    if (!instrumento) return
    const ler = () => {
      const fonte = acervo.tocando ? acervo.audio.current : radio.audio.current
      // a rádio ainda sem tocar não tem src: vale o começo da faixa da vez
      const src = caminho(fonte) || (acervo.tocando ? "" : radio.faixa?.voz ?? "")
      const geral = acervo.tocando && acervo.faixa ? TONS[acervo.faixa.src] : radio.faixa?.tom
      const t = (src ? tomNoTempo(src, fonte?.currentTime ?? 0) : null) ?? geral ?? null
      setTom((a) => (a && t && a.tonica === t.tonica && a.modo === t.modo ? a : t))
    }
    ler()
    const id = setInterval(ler, 500)
    return () => clearInterval(id)
  }, [instrumento, acervo.tocando, acervo.faixa, acervo.audio, radio.faixa, radio.audio])
  // instrumento aberto: a música (rádio e disco) desce pra MUSICA_TOCANDO num fade curto; fechou, volta
  useEffect(() => {
    const alvo = instrumento ? MUSICA_TOCANDO : 1
    const els = [radio.audio.current, acervo.audio.current].filter((a): a is HTMLAudioElement => !!a)
    const ini = els.map((a) => a.volume)
    const t0 = performance.now()
    let id = 0
    const passo = () => {
      const k = Math.min(1, (performance.now() - t0) / 400)
      els.forEach((a, i) => { a.volume = ini[i] + (alvo - ini[i]) * k })
      if (k < 1) id = requestAnimationFrame(passo)
    }
    passo()
    return () => cancelAnimationFrame(id)
  }, [instrumento, radio.audio, acervo.audio])
  const darPartida = () => {
    if (batida) fecharBatida()
    setEstante(false); setInstrumento(null)
    estado.current.partida = true
    setPartiu(true)
    roncarMotor()
    // direto pro jogo (?entrar=1: sem a tela de entrada do /linha). O jogo já começa a
    // baixar agora (o cookie da senha acabou de chegar): na troca não fica esperando
    const u = new URL(volta, window.location.origin)
    u.searchParams.set("entrar", "1")
    const alvo = u.pathname + u.search
    try { router.prefetch(alvo) } catch { /* segue */ }
    setTimeout(() => window.location.assign(alvo), HIPER.troca * 1000)
  }
  return (
    <main className={`en-pagina ${partiu ? "is-partida" : ""} ${batida || estante || instrumento ? "is-estudio" : ""}`}>
      <KombiEntrada estado={estado} disco={acervo.tocando} gaveta={{
        aberta: estante && !partiu, cores: ACERVO.map((_, k) => SELOS[k % SELOS.length]), tocando: acervo.tocando ? acervo.i : null,
        onAbrir: () => abrir("estante"), onPerto: setDiscoPerto,
        onEscolher: (k) => { if (!estante) { abrir("estante"); return } if (acervo.tocando && acervo.i === k) acervo.pausar(); else tocarDisco(k) },
      }} onBatida={abrirBatida} onDisco={() => abrir("estante")} onViolao={() => abrir("violao")} onTeclado={() => abrir("teclado")} radio={{
        titulo: radio.faixa?.faixa ?? "", tocando: radio.tocando, temLink: !!(radio.faixa && linkDaFaixa(radio.faixa.id)),
        onLigar: alternarRadio, onProxima: radio.proxima, onAnterior: radio.anterior, onSalvar: () => { if (radio.faixa) salvarFaixa(radio.faixa.id, "entrada") },
      }} />
      {batida && <KombeatStudio modo="beat" onModo={(m) => { if (m !== "beat") fecharBatida() }} onDiscos={fecharBatida} onSair={fecharBatida} />}
      {estante && !partiu && <LegendaGaveta perto={discoPerto} tocando={acervo.tocando ? acervo.i : null} onFechar={() => setEstante(false)} />}
      {instrumento && !partiu && (
        <Violao key={instrumento} temViolao semBotao abrir={1} tom={tom} voz={instrumento === "teclado" ? TECLADO : VIOLAO} onFechar={() => setInstrumento(null)} />
      )}
      <RadioAcessivel r={radio} />
      <audio ref={radio.audio} preload="none" onEnded={radio.proxima} />
      <audio ref={acervo.audio} preload="none" onEnded={acervo.proxima} />
      <header className="en-topo" aria-hidden={partiu}>
        <b>CIDADE NEON</b>
        <span>arrasta pra olhar em volta · toca nas coisas da Kombi</span>
      </header>
      <Senha onCerta={darPartida} partiu={partiu} />
      <div className="en-clarao" aria-hidden="true" />
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
  return { faixa, tocando, alternar: () => setTocando((t) => !t), ligar: () => setTocando(true), parar: () => setTocando(false), proxima, anterior, audio }
}
type Radio = ReturnType<typeof useRadio>

// ── o toca-discos: o acervo antigo, um disco depois do outro. Pausar guarda o ponto ──
function useAcervo() {
  const [i, setI] = useState(0)
  const [tocando, setTocando] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const faixa = ACERVO[i]
  useEffect(() => {
    const a = audio.current
    if (!a || !faixa) return
    if (!a.src.endsWith(faixa.src)) a.src = faixa.src
    if (tocando) a.play().catch(() => setTocando(false))
    else a.pause()
  }, [faixa, tocando])
  return {
    i, faixa, tocando, audio,
    tocar: (k: number) => { setI(k); setTocando(true) },
    pausar: () => setTocando(false),
    continuar: () => setTocando(true),
    proxima: () => setI((x) => (x + 1) % ACERVO.length),
  }
}

// a legenda da gaveta: o disco sob o dedo (ou o que está tocando); os discos são 3D
function LegendaGaveta({ perto, tocando, onFechar }: { perto: number | null; tocando: number | null; onFechar: () => void }) {
  const k = perto ?? tocando
  const d = k === null ? null : ACERVO[k]
  return (
    <div className="en-gaveta" role="status" onPointerDown={(e) => e.stopPropagation()}>
      <i aria-hidden="true" style={k === null ? undefined : { background: SELOS[k % SELOS.length] }} />
      <span>
        {d ? <><b>{d.titulo}</b><small>{d.autor}{k === tocando ? " · tocando, toca de novo pra parar" : " · toca pra pôr no prato"}</small></>
          : <><b>o acervo antigo</b><small>escolhe um disco na gaveta</small></>}
      </span>
      <button type="button" onClick={onFechar} aria-label="fechar a gaveta">✕</button>
    </div>
  )
}

// pra teclado e leitor de tela: os mesmos comandos do rádio do painel (invisíveis)
function RadioAcessivel({ r }: { r: Radio }) {
  const f = r.faixa
  if (!f) return null
  return (
    <div className="en-sr" aria-label="rádio do painel">
      <p aria-live="polite">{r.tocando ? `tocando ${f.faixa}, LU2CA` : `rádio desligada. ${f.faixa}`}</p>
      <button type="button" onClick={r.anterior}>faixa anterior</button>
      <button type="button" onClick={r.alternar}>{r.tocando ? "desligar a rádio" : "ligar a rádio"}</button>
      <button type="button" onClick={r.proxima}>próxima faixa</button>
      {linkDaFaixa(f.id) && <button type="button" onClick={() => salvarFaixa(f.id, "entrada")}>ouvir {f.faixa} no seu app de música</button>}
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
