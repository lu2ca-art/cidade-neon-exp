"use client"

// (T07) A TELA DO HOLO LÁ FORA e O TUTORIAL, passo a passo (disco/tutorialConf.ts
// tem a ordem, os textos e a configuração).
//
// - RecompensaHolo: saiu da casa com o holo na mão. Texto grande, o que ganhou e
//   como funciona (J1: 6). O botão "?" fecha e o tutorial começa destacando só o
//   ícone do holo (o mapa): o resto da tela escurece, ele toca ali.
// - TutorialHolo: um passo por vez. O texto fica num cartão fininho embaixo do
//   GPS (e passa uma vez no notch, como toda linha do Nexo); um anel pulsando em
//   volta da coisa que ele precisa tocar. Só avança quando ele faz. Não mexe no
//   jogo: lê a Kombi (POSE_TUT, a Corrida escreve), o drone (DRONE) e a tela.
// Desempenho: um intervalo de 120 ms só enquanto há passo; um setState quando o
// alvo muda de lugar ou o passo fica feito. Nada no WebGL.

import { useEffect, useRef, useState } from "react"
import { DRONE } from "../estrada/Drone"
import { avisarRadio, notch } from "../estrada/Holo"
import { VOZES } from "../roteiros"
import { gota } from "../som"
import { vib } from "../som-carro"
import type { FaseDisco, HistoriaDisco } from "./historia"
import { CONFIG_TUTORIAL, FIM_TUTORIAL, POSE_TUT, contagem, passoAgora, textoDo, type PassoTut, type PassoTutId } from "./tutorialConf"
import "./tutorial.css"

const toqueTela = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches

// ── a tela de recompensa do holo, lá fora (RASCUNHO dos textos) ──
const COMO: { ic: string; t: string; d: string }[] = [
  { ic: "◉", t: "o mapa", d: "toca: o drone sobe e mostra a cidade de cima, com o caminho aceso" },
  { ic: "▲", t: "o GPS", d: "a barra lá em cima: o ícone no meio, você tá indo certo" },
  { ic: "◌", t: "o anel", d: "gira em volta do mapa: o próximo passo, um de cada vez" },
  { ic: "♪", t: "a rádio e os apps", d: "a música, o B4TIDA, os jogos: tudo mora nele" },
]
export function RecompensaHolo({ onSeguir }: { onSeguir: () => void }) {
  useEffect(() => {
    vib([30, 50, 30])
    const k = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === "Escape") onSeguir() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onSeguir])
  return (
    <div className="l-recompensa l-rec-holo" style={{ ["--cor" as string]: "#2fe8ff" }} role="dialog" aria-label="você ganhou o holo" onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-recompensa-caixa l-rec-holo-caixa">
        <small>a D-Bee te deu</small>
        <div className="l-rec-holo-icone" aria-hidden="true">
          <svg viewBox="0 0 160 160">
            <defs><path id="l-rec-holo-p" d="M80,80 m-62,0 a62,62 0 1,1 124,0 a62,62 0 1,1 -124,0" /></defs>
            <circle cx="80" cy="80" r="70" />
            <g className="l-rec-holo-gira"><text><textPath href="#l-rec-holo-p" textLength="388" lengthAdjust="spacingAndGlyphs">O HOLO  ◆  O MAPA  ◆  O HOLO  ◆  O MAPA  ◆  </textPath></text></g>
          </svg>
          <i className="l-rec-holo-bola" />
        </div>
        <b>o holo</b>
        <p className="l-rec-holo-sub">o celular de agora: uma luz parada no ar. sem ele, lá na cidade, você não existe</p>
        <ul className="l-rec-holo-como">
          {COMO.map((c) => <li key={c.t}><i aria-hidden="true">{c.ic}</i><span><b>{c.t}</b>{c.d}</span></li>)}
        </ul>
        <button type="button" className="l-rec-holo-bt" onClick={onSeguir} autoFocus><i aria-hidden="true">?</i>me mostra no holo</button>
      </div>
    </div>
  )
}

type Caixa = { x: number; y: number; w: number; h: number }

// ── o tutorial ──
export function TutorialHolo({ hist, pausado, onFeito }: { hist: Pick<HistoriaDisco, "fase" | "holo" | "tutorial">; pausado: boolean; onFeito: (id: PassoTutId) => void }) {
  const passo = passoAgora(hist)
  const [ok, setOk] = useState<PassoTutId | null>(null)
  const [alvo, setAlvo] = useState<Caixa | null>(null)
  const [espera, setEspera] = useState(false)
  const [fim, setFim] = useState<string | null>(null)
  // o bloco do último passo mostrado (a última linha é a dele)
  const teve = useRef<FaseDisco | null>(null)
  const feito = useRef(onFeito)
  useEffect(() => { feito.current = onFeito })
  const id = pausado ? null : passo?.id ?? null

  // o passo novo: passa uma vez no notch (e, com a D-Bee ensinando, no rádio)
  useEffect(() => {
    if (!id || !passo) return
    teve.current = passo.desde
    const txt = textoDo(passo, toqueTela())
    if (CONFIG_TUTORIAL.quem === "dbee") { avisarRadio("D-Bee", txt); notch(`D-Bee: ${txt}`, VOZES["D-Bee"] ?? "#3d7bff") }
    else notch(txt, "#2fe8ff")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fase = hist.fase
  // acabaram os passos deste bloco: a última linha (uma vez), e some
  useEffect(() => {
    if (passo || pausado || !teve.current) return
    const f = FIM_TUTORIAL[teve.current]
    teve.current = null
    if (!f) return
    // (já pousou na cidade: a última linha do voo não manda pousar)
    const txt = fase === "carreira" ? "▸ a cidade é sua. o mapa diz o resto" : CONFIG_TUTORIAL.quem === "dbee" ? f.dbee : f.nexo
    notch(txt, "#2fe8ff")
    setFim(txt)
    const t = setTimeout(() => setFim(null), 5000)
    return () => clearTimeout(t)
  }, [passo, pausado, fase])

  // olhar se ele fez (e onde está a coisa que ele precisa tocar)
  useEffect(() => {
    if (!id || !passo) { setAlvo(null); return }
    const ini = performance.now()
    let acc = 0, ult = ini, feitoJa = false, droneAntes = DRONE.alvo
    const fazer = () => {
      if (feitoJa) return
      feitoJa = true
      setOk(passo.id)
      vib(18); gota(5)
      setTimeout(() => { setOk(null); feito.current(passo.id) }, CONFIG_TUTORIAL.respiroMs)
    }
    // o toque no anel (ou no mapa) conta direto, antes do jogo agir
    const clique = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-info]") as HTMLElement | null
      if (!el) return
      // (o anel é a borda em volta da bolinha do mapa: tocar no meio também vale)
      if (passo.id === "anel" && (el.dataset.info === "anel" || el.dataset.info === "mapa")) fazer()
    }
    document.addEventListener("click", clique, true)
    const olhar = () => {
      const agora = performance.now(), dt = (agora - ult) / 1000
      ult = agora
      // a Kombi (a Corrida escreve; se parou de escrever, não conta)
      const vivo = agora - POSE_TUT.em < 600
      if (passo.id === "mapa" && DRONE.alvo === 1) fazer()
      if (passo.id === "rota") {
        if (DRONE.alvo === 1) droneAntes = 1
        if (DRONE.alvo === 0 && (droneAntes === 1 || agora - ini > 1500)) fazer()
      }
      if (passo.id === "gps") {
        const mira = !!document.querySelector(".l-gps-alvo.is-mira")
        acc = mira && vivo && POSE_TUT.v > CONFIG_TUTORIAL.gpsV ? acc + dt : mira ? acc : 0
        if (acc >= CONFIG_TUTORIAL.gpsS) fazer()
      }
      if (passo.id === "drift" && vivo) { if (POSE_TUT.drift) acc += dt; if (acc >= CONFIG_TUTORIAL.driftS) fazer() }
      if (passo.id === "voo" && vivo) { if (POSE_TUT.ar && POSE_TUT.propulsor) acc += dt; if (acc >= CONFIG_TUTORIAL.vooS) fazer() }
      if (passo.id === "turbo" && vivo) { setEspera(POSE_TUT.carga < 1 && !POSE_TUT.turbo); if (POSE_TUT.turbo) fazer() }
      // onde está o alvo na tela (só muda o estado se mexeu)
      const el = passo.alvo ? document.querySelector(passo.alvo) : null
      const r = el?.getBoundingClientRect()
      const nova = r && r.width > 0 ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null
      setAlvo((a) => (a?.x === nova?.x && a?.y === nova?.y && a?.w === nova?.w && a?.h === nova?.h ? a : nova))
    }
    olhar()
    const iv = setInterval(olhar, 120)
    return () => { clearInterval(iv); document.removeEventListener("click", clique, true) }
  }, [id, passo])

  if (fim && !passo && !pausado) return <div className="l-tut is-fim" role="status"><b>{fim}</b></div>
  if (!id || !passo) return null
  const c = contagem(hist, passo.id)
  const txt = espera && passo.espera ? passo.espera : textoDo(passo, toqueTela())
  const feitoAgora = ok === passo.id
  return (
    <>
      {alvo && <Destaque alvo={alvo} passo={passo} escuro={!!passo.destaque && !feitoAgora} />}
      <div className={`l-tut ${feitoAgora ? "is-ok" : ""} ${CONFIG_TUTORIAL.quem === "dbee" ? "is-dbee" : ""}`} role="status" aria-live="polite" data-passo={passo.id}>
        <small>{CONFIG_TUTORIAL.quem === "dbee" ? "D-Bee · rádio" : "N3XO_"} · {c.n} de {c.de}</small>
        <b>{feitoAgora ? "✓ isso" : txt}</b>
      </div>
    </>
  )
}

// o anel em volta da coisa; no primeiro passo (o "?"), o resto da tela escurece
// e só o ícone do holo fica aceso, com o "?" do lado
function Destaque({ alvo, passo, escuro }: { alvo: Caixa; passo: PassoTut; escuro: boolean }) {
  const m = 8
  return (
    <div className={`l-tut-alvo ${escuro ? "is-escuro" : ""}`} aria-hidden="true" style={{ left: alvo.x - m, top: alvo.y - m, width: alvo.w + m * 2, height: alvo.h + m * 2 }}>
      {escuro && <><i className="l-tut-alvo-q">?</i><span className="l-tut-alvo-rot">{passo.rotulo}<em>toca aqui</em></span></>}
    </div>
  )
}
