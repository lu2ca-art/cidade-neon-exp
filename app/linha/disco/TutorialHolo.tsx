"use client"

// (05/11) O TUTORIAL DAQUI SAIU DE CENA: quem ensina agora é a trilha de pedras
// (disco/trilhaPedras.ts + TrilhaPedrasTela.tsx), com os mesmos ids no save.
// Fica o RecompensaHolo (desligado em CONFIG_TUTORIAL.recompensa).

// (T07) A TELA DO HOLO LÁ FORA e O TUTORIAL, passo a passo (disco/tutorialConf.ts
// tem a ordem, os textos e a configuração).
//
// - RecompensaHolo: saiu da casa com o holo na mão. Texto grande, o que ganhou e
//   como funciona (J1: 6). O botão "?" fecha e o tutorial começa destacando só o
//   ícone do holo (o mapa): o resto da tela escurece, ele toca ali.
// - TutorialHolo: um passo por vez. (T56) O texto fala DENTRO do notch do Nexo
//   (nexoTutorial: o passo vira a linha do notch, com o "2 de 5" discreto; o "?"
//   do notch explica o passo), sem cartão separado; um anel pulsando em volta da
//   coisa que ele precisa tocar. Só avança quando ele faz. Não mexe no jogo: lê a
//   Kombi (POSE_TUT, a Corrida escreve), o drone (DRONE) e a tela.
// Desempenho: um intervalo de 120 ms só enquanto há passo; um setState quando o
// alvo muda de lugar ou o passo fica feito. Nada no WebGL.

import { useEffect, useRef, useState } from "react"
import { DRONE } from "../estrada/Drone"
import { avisarRadio, infoDe, nexoTutorial } from "../estrada/Holo"
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

  // o passo novo (com a D-Bee ensinando, ela também fala no rádio; o notch mostra
  // o passo nos dois casos)
  useEffect(() => {
    if (!id || !passo) return
    teve.current = passo.desde
    if (CONFIG_TUTORIAL.quem === "dbee") avisarRadio("D-Bee", textoDo(passo, toqueTela()))
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

  // (T56) o notch é quem fala: o passo de agora (ou a última linha) vai pra ele
  const c = passo ? contagem(hist, passo.id) : null
  const txt = passo ? (espera && passo.espera ? passo.espera : textoDo(passo, toqueTela())) : null
  const feitoAgora = !!passo && ok === passo.id
  const dbee = CONFIG_TUTORIAL.quem === "dbee"
  const pid = id ? passo!.id : null
  const mostraFim = !!fim && !passo && !pausado
  const conta = c ? `${dbee ? "D-Bee · " : ""}${c.n} de ${c.de}` : null
  useEffect(() => {
    if (pid && txt && conta) {
      const p = PASSO_INFO[pid]
      nexoTutorial({ passo: pid, texto: txt, conta, ok: feitoAgora, cor: dbee ? "#7fa6ff" : "#2fe8ff", ajuda: { t: passo!.rotulo ?? "o tutorial", d: p ?? txt } })
    } else if (mostraFim) nexoTutorial({ passo: "fim", texto: fim!, fim: true, ajuda: { t: "o tutorial", d: "acabou. o anel em volta do mapa diz o próximo passo; o mapa mostra o caminho." } })
    else nexoTutorial(null)
  }, [pid, txt, conta, feitoAgora, dbee, mostraFim, fim, passo])
  // saiu da tela (a corrida acabou, a cena abriu): o notch esquece o passo
  useEffect(() => () => nexoTutorial(null), [])

  if (!id || !passo) return null
  // (notas 03/11) sem tela escura: o alvo pulsa e um balão curto ("toca aqui") fica preso nele
  const balao = !feitoAgora && TOCA_AQUI.includes(passo.id) ? "toca aqui" : null
  return alvo ? <Destaque alvo={alvo} escuro={!!passo.destaque && !feitoAgora} passo={passo.id} balao={balao} /> : null
}

// (T56) o que o "?" do notch diz de cada passo (a explicação do passo, não o passo de novo)
const PASSO_INFO: Partial<Record<PassoTutId, string>> = {
  mapa: infoDe("mapa")?.d,
  rota: "com o drone no alto, a faixa acesa é o caminho até onde você precisa ir. o mapa de novo: a câmera volta pra rua.",
  gps: "a barra lá em cima: o ícone do lugar no meio é o rumo certo. aceso no meio e acelerando, você está indo pra lá.",
  drift: "na areia solta a Kombi escorrega: vira forte e solta de lado (no teclado, Q + seta). o drift enche o turbo.",
  anel: infoDe("anel")?.d,
  voo: infoDe("propulsor")?.d,
  turbo: infoDe("turbo")?.d,
}

// o anel em volta da coisa; no primeiro passo (o "?"), o resto da tela escurece
// e só o ícone do holo fica aceso (e o notch, que diz o passo), com o "?" do lado.
// (T56) sem rótulo próprio: quem diz o que fazer é o notch
// os passos em que o alvo é pra tocar (o balão "toca aqui" aparece neles)
const TOCA_AQUI: PassoTutId[] = ["mapa", "rota", "anel"]
function Destaque({ alvo, escuro, passo, balao }: { alvo: Caixa; escuro: boolean; passo: PassoTutId; balao: string | null }) {
  const m = 8
  // o balão vai pro lado de dentro da tela (o alvo na metade de baixo: o balão em cima)
  const emCima = typeof window !== "undefined" && alvo.y > window.innerHeight / 2
  return (
    <div className={`l-tut-alvo is-${passo} ${escuro ? "is-escuro" : ""}`} aria-hidden="true" style={{ left: alvo.x - m, top: alvo.y - m, width: alvo.w + m * 2, height: alvo.h + m * 2 }}>
      {balao && <span className={`l-tut-balao ${emCima ? "is-cima" : ""}`}>{balao}</span>}
    </div>
  )
}
