"use client"

// O METRÔ (T26): o componente. Um canvas (three.js, desenhado pela Cena) +
// o HUD em DOM. O laço é um relógio de passo fixo (1/120 s); o HUD que muda
// todo quadro (a trilha você × ele, a vinheta do medo) é mexido direto no
// estilo, sem React. Pronto pra entrar na missão do metrô:
// <Metro onFim={(r) => ...} />  (r.escapou, r.violao)
// (T64) no mundo: disco/MetroFuga.tsx usa este componente com `onSeguir` (o botão
// "seguir" no fim, no lugar do "de novo") e `antes` (a linha do jetpack no começo).

import { useEffect, useRef, useState } from "react"
import { Fuga, PASSO, type Evento, type Fase } from "./jogo"
import { Cena } from "./cena"
import { SomMetro } from "./som"
import { pilotar } from "./piloto"
import { inicioVagao, ouvirViolaoNoTrem, sorteio, vagaoDe, Z_PORTA } from "./mundo"
import "./metro.css"

const RADIO = [
  "0222, parado.",
  "atividade artística não autorizada no vagão 3 ✓",
  "todas as unidades: vagão por vagão.",
  "a câmera do vagão te viu ✓",
  "0222. não adianta.",
]

export interface FimMetro { escapou: boolean; violao: "costas" | "perdido"; tempo: number; esbarroes: number }

// (09/11) dentro do canvas do mundo, com a cidade nas janelas (estrada/Linha9.tsx): sem
// canvas nem relógio próprios; quem hospeda chama o `quadro` e leva a cena junto
export interface HospedeMetro {
  entrar: (cena: Cena, quadro: (t: number) => void, fuga: Fuga) => void
  sair: () => void
}
// a viagem rápida: sentado até o violão tocar (a fuga só começa se o guarda reagir)
// (temInstrumento false: perdeu o violão e não comprou nada; não leva a caixa nas costas)
export interface ViagemMetro { rotulo: string; reage: boolean; temInstrumento?: boolean }

export function Metro({ onFim, expor, auto, semente: sem0 = 222, semIntro, onSeguir, seguirSePego, antes, hospede, viagem }: {
  onFim?: (r: FimMetro) => void; expor?: boolean; auto?: number | null; semente?: number; semIntro?: boolean
  // (T64) no mundo: o fim mostra "seguir" (fugiu; ou pego, se seguirSePego) em vez de "de novo"
  onSeguir?: () => void; seguirSePego?: boolean
  // uma linha a mais no cartão do começo (o que aconteceu antes de entrar)
  antes?: string
  hospede?: HospedeMetro
  viagem?: ViagemMetro
}) {
  const tela = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const pVoce = useRef<HTMLElement>(null)
  const pEle = useRef<HTMLElement>(null)
  const medoEl = useRef<HTMLDivElement>(null)
  const fugaRef = useRef<Fuga | null>(null)
  const somRef = useRef<SomMetro | null>(null)
  const [semente, setSemente] = useState(sem0)
  const [fase, setFase] = useState<Fase>("intro")
  const [aviso, setAviso] = useState<{ n: number; txt: string; tipo?: string } | null>(null)
  const [fim, setFim] = useState<FimMetro | null>(null)
  const [vagao, setVagao] = useState(1)
  const fimRef = useRef(onFim)
  useEffect(() => { fimRef.current = onFim }, [onFim])
  const sentadoNaViagem = !!viagem
  const reageRef = useRef(!!viagem?.reage)
  useEffect(() => { reageRef.current = !!viagem?.reage }, [viagem?.reage])
  const semCaixaRef = useRef(viagem?.temInstrumento === false)

  useEffect(() => {
    const cv = tela.current
    if (!cv && !hospede) return
    const f = new Fuga(semente)
    if (sentadoNaViagem) { f.sentar(); f.violaoFica = true }
    fugaRef.current = f
    const cena = new Cena(hospede ? null : cv, f)
    if (semCaixaRef.current) cena.caixaViolao.visible = false
    const som = new SomMetro()
    somRef.current = som
    const medir = () => { if (cv) cena.medir(cv.clientWidth, cv.clientHeight) }
    medir()
    const ro = new ResizeObserver(medir)
    if (cv && !hospede) ro.observe(cv)
    const quadros: number[] = [], trabalho: number[] = [], draws: number[] = []
    let raf = 0, ultimo = performance.now(), acc = 0, nAviso = 0, emenda = Math.floor(f.odometro / 18), ultVagao = 1, piloto = 0
    const rr = sorteio(semente + 99)
    const avisar = (txt: string, tipo?: string) => setAviso({ n: ++nAviso, txt, tipo })
    let nRadio = 0
    const tratar = (e: Evento) => {
      switch (e) {
        case "apito": som.apito(); avisar("o policial levanta. corre pra porta", "alerta"); break
        case "esbarrou": som.esbarrou(); raiz.current?.classList.remove("mt-tranco"); void raiz.current?.offsetWidth; raiz.current?.classList.add("mt-tranco"); break
        case "empurrou": som.empurrou(); break
        case "guarda-esbarrou": som.empurrou(); break
        case "violao": som.violao(); avisar(f.violaoFica ? "ele te agarrou. solta e corre!" : "ele arrancou o violão das suas costas. solta e corre!", "alerta"); break
        case "pego": som.pego(); break
        case "porta": break
        case "pulou": som.pulou(); break
        case "portinha": som.portinha(); break
        case "apagao": som.apagao(); break
        case "volta-luz": som.voltaLuz(); break
        case "porta-abre": som.portaAbre(); avisar("a porta abriu na curva →"); break
        case "radio": som.radio(); avisar(RADIO[nRadio++ % RADIO.length], "radio"); break
        case "passo-voce": som.passoVoce(); break
        case "passo-guarda": som.passoGuarda(Math.max(0, 1 - f.distancia / 9)); break
      }
    }
    const quadro = (t: number) => {
      if (!hospede) raf = requestAnimationFrame(quadro)
      const dtMs = t - ultimo
      ultimo = t
      const dt = Math.min(0.1, Math.max(0, dtMs / 1000))
      const t0 = performance.now()
      acc += dt
      while (acc >= PASSO) {
        // o piloto decide a cada 6 passos (0,05 s do relógio do jogo: igual em qualquer taxa de quadros)
        if (auto != null && f.fase === "fuga" && piloto++ % 6 === 0) pilotar(f, auto, rr)
        f.passo(); acc -= PASSO
      }
      const ev = f.eventos
      for (let i = 0; i < ev.length; i++) tratar(ev[i])
      if (ev.length) {
        if (ev.includes("pulou") || ev.includes("pego")) {
          const r: FimMetro = { escapou: f.fase === "pulou", violao: f.violao, tempo: +f.t.toFixed(1), esbarroes: f.colisoes }
          setTimeout(() => { setFase(f.fase); setFim(r); fimRef.current?.(r) }, f.fase === "pego" ? 1100 : 700)
        } else if (ev.includes("apito") || ev.includes("porta")) setFase(f.fase)
        ev.length = 0
      }
      const e2 = Math.floor(f.odometro / 18)
      if (e2 !== emenda) { emenda = e2; som.trilho() }
      cena.desenhar(f, acc / PASSO, dt, 0)
      // o HUD: a trilha (você e ele até a porta) e o medo
      const z0 = inicioVagao(0), L = Z_PORTA - z0
      if (pVoce.current) pVoce.current.style.transform = `translateX(${Math.max(0, Math.min(1, (f.voce.z - z0) / L)) * 100}cqw)`
      if (pEle.current) pEle.current.style.transform = `translateX(${Math.max(0, Math.min(1, (f.guarda.z - z0) / L)) * 100}cqw)`
      const ativo = f.fase === "fuga"
      const medo = ativo ? Math.max(0, Math.min(1, 1 - (f.distancia - 1) / 6)) : f.fase === "pego" ? 1 : 0
      if (medoEl.current) medoEl.current.style.opacity = (medo * 0.75).toFixed(2)
      som.quadro(medo, t / 1000, ativo)
      const vg = vagaoDe(f.voce.z)
      if (vg >= 0 && vg + 1 !== ultVagao) { ultVagao = vg + 1; setVagao(ultVagao) }
      if (quadros.length < 30000) { quadros.push(dtMs); trabalho.push(performance.now() - t0); draws.push(cena.calls) }
    }
    if (hospede) hospede.entrar(cena, quadro, f)
    else raf = requestAnimationFrame(quadro)
    if (semIntro || auto != null) { f.comecar() }
    // (09/11, bíblia §13) sentado: tocar o violão levanta o guarda
    if (sentadoNaViagem) som.ligar()
    const paraDeOuvir = sentadoNaViagem ? ouvirViolaoNoTrem(() => { if (reageRef.current && f.sentado) { som.ligar(); f.comecar() } }) : null

    if (expor) (window as unknown as { __metro: unknown }).__metro = {
      fuga: f,
      estado: () => ({ fase: f.fase, z: +f.voce.z.toFixed(2), x: +f.voce.x.toFixed(2), gz: +f.guarda.z.toFixed(2), dist: +f.distancia.toFixed(2), violao: f.violao, esbarroes: f.colisoes, empurroes: f.empurroes, t: +f.t.toFixed(2), progresso: +f.progresso.toFixed(3), luz: f.luz }),
      medidas: () => ({ quadros: quadros.slice(), trabalho: trabalho.slice(), draws: draws.slice(), tris: cena.tris, dpr: cena.r.getPixelRatio() }),
      zerar: () => { quadros.length = 0; trabalho.length = 0; draws.length = 0 },
      pilotar: (erro = 0) => pilotar(f, erro, rr),
    }
    return () => { paraDeOuvir?.(); hospede?.sair(); cancelAnimationFrame(raf); ro.disconnect(); som.desligar(); cena.destruir(); fugaRef.current = null }
  }, [semente, expor, auto, semIntro, hospede, sentadoNaViagem])

  // ── a entrada: teclado (← → desvia, espaço empurra, ↓ segura) e toque
  //    (arrasta pro lado pra desviar; um toque rápido empurra) ──
  useEffect(() => {
    const teclas = new Set<string>()
    const atualizar = () => {
      const f = fugaRef.current; if (!f) return
      const esq = teclas.has("ArrowLeft") || teclas.has("KeyA"), dir = teclas.has("ArrowRight") || teclas.has("KeyD")
      f.lado = (dir ? 1 : 0) - (esq ? 1 : 0)
      f.freio = teclas.has("ArrowDown") || teclas.has("KeyS")
    }
    const desce = (e: KeyboardEvent) => {
      const f = fugaRef.current; if (!f) return
      somRef.current?.ligar()
      if (f.sentado) return // sentado, o teclado é do resto do jogo
      if (f.fase === "intro" && (e.code === "Space" || e.code === "Enter" || e.code === "ArrowUp")) { f.comecar(); e.preventDefault(); return }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") { if (!e.repeat) f.pedeEmpurrar = true; e.preventDefault() }
      if (e.code.startsWith("Arrow")) e.preventDefault()
      teclas.add(e.code); atualizar()
    }
    const sobe = (e: KeyboardEvent) => { teclas.delete(e.code); atualizar() }
    window.addEventListener("keydown", desce)
    window.addEventListener("keyup", sobe)
    return () => { window.removeEventListener("keydown", desce); window.removeEventListener("keyup", sobe) }
  }, [])

  const dedo = useRef<{ id: number; x: number; t: number; mexeu: boolean } | null>(null)
  const pDown = (e: React.PointerEvent) => {
    const f = fugaRef.current; if (!f) return
    somRef.current?.ligar()
    if (f.fase === "intro") return
    dedo.current = { id: e.pointerId, x: e.clientX, t: performance.now(), mexeu: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const pMove = (e: React.PointerEvent) => {
    const d = dedo.current, f = fugaRef.current
    if (!d || !f || d.id !== e.pointerId) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 8) d.mexeu = true
    // o dedo que passa muito longe arrasta a âncora junto (pra virar pro outro lado é rápido)
    if (dx > 70) d.x = e.clientX - 70; else if (dx < -70) d.x = e.clientX + 70
    f.lado = Math.max(-1, Math.min(1, (e.clientX - d.x) / 45))
  }
  const pUp = (e: React.PointerEvent) => {
    const d = dedo.current, f = fugaRef.current
    if (!d || !f || d.id !== e.pointerId) return
    dedo.current = null
    f.lado = 0
    if (!d.mexeu && performance.now() - d.t < 260) f.pedeEmpurrar = true
  }

  const comecar = () => { somRef.current?.ligar(); fugaRef.current?.comecar() }
  const deNovo = () => { setFim(null); setFase("intro"); setAviso(null); setVagao(1); setSemente((s) => s + 1) }

  return (
    <div ref={raiz} className={`mt-raiz mt-${fase} ${onSeguir ? "is-mundo" : ""} ${hospede ? "is-dentro" : ""} ${viagem && fase === "intro" ? "is-sentado" : ""}`}
      {...(hospede ? { onPointerDown: pDown, onPointerMove: pMove, onPointerUp: pUp, onPointerCancel: pUp } : {})}>
      {!hospede && <canvas ref={tela} className="mt-tela" aria-label="dentro do metrô" onPointerDown={pDown} onPointerMove={pMove} onPointerUp={pUp} onPointerCancel={pUp} />}
      <div ref={medoEl} className="mt-medo" />
      {viagem && fase === "intro" && <p className="mt-viagem">{viagem.rotulo}</p>}
      <header className="mt-hud" style={viagem && fase === "intro" ? { display: "none" } : undefined}>
        <div className="mt-trilho">
          <div className="mt-trilho-in">
            <i ref={pEle} className="mt-ele" />
            <i ref={pVoce} className="mt-voce" />
          </div>
          <span className="mt-porta">porta</span>
        </div>
        <small className="mt-vagao">vagão {vagao} de 5</small>
      </header>
      {aviso && <div key={aviso.n} className={`mt-aviso ${aviso.tipo ? `is-${aviso.tipo}` : ""}`}>{aviso.txt}</div>}
      {fase === "fuga" && <p className="mt-dica">arrasta pro lado pra desviar das pessoas <span>← → desvia das pessoas</span></p>}

      {fase === "intro" && !viagem && (
        <div className="mt-cartao" onClick={comecar}>
          <small>linha 9 · vagão 1 · 23:47</small>
          {antes && <p>{antes}</p>}
          <p>o trem branco vai pras dependências do núcleo, volta, e vai de novo.</p>
          <p>no fundo do vagão, um policial. ele te olha como quem já sabe.</p>
          <p>o violão pesa nas suas costas.</p>
          <button type="button" onClick={(e) => { e.stopPropagation(); comecar() }}>corre</button>
          <small className="mt-ctl">celular: arrasta pro lado pra desviar das pessoas<br />computador: ← → desvia</small>
        </div>
      )}
      {fim && (
        <div className={`mt-cartao mt-fim ${fim.escapou ? "is-pulou" : "is-pego"}`}>
          <h1>{fim.escapou ? "você pulou" : "te pegaram"}</h1>
          {fim.escapou ? (
            <>
              <p>a porta abriu na curva. você pulou.</p>
              {!viagem && <p>{fim.violao === "perdido" ? "o violão ficou na mão dele." : "o violão ficou preso na porta."} lá dentro, alguém começa a tocar ele.</p>}
            </>
          ) : (
            <>
              <p>a mão dele no seu ombro. o trem nem para.</p>
              {!viagem && <p>levaram o violão.</p>}
            </>
          )}
          <small>{fim.tempo}s · {fim.esbarroes} {fim.esbarroes === 1 ? "esbarrão" : "esbarrões"}</small>
          {onSeguir && (fim.escapou || seguirSePego)
            ? <button type="button" data-testid="metro-seguir" onClick={onSeguir}>seguir</button>
            : <button type="button" onClick={deNovo}>de novo</button>}
        </div>
      )}
    </div>
  )
}
