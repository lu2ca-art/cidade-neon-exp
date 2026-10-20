"use client"

// O HOLO (LU2CA 19/10, o óculos virou holovisor): é o celular novo. Os jogos,
// as mensagens e a música moram nele, e o jogo gira em torno de usar e de não
// usar. Dois estados só: ligado, com tudo na tela; desligado, nada (só o óculos
// no canto). Ligado, o centro fica livre pra dirigir e o resto mora nas bordas:
//   - em cima, à esquerda: o "?" e o óculos (desliga); embaixo, a RÁDIO, um
//     holograma de respeito com a onda sonora girando, e a faixa da pista
//   - em cima, no meio: a ilha fininha do N3XO (o letreiro de ônibus) e, logo
//     embaixo, os ícones pequenos dos apps, enfileirados
//   - em cima, à direita: o mapa, com o anel das missões girando em volta, e o
//     clima da região onde a Kombi está
//   - embaixo, à esquerda: o widget que imita o app da vez (a MPC do B4TIDA, o
//     show de rock do GUITAR DRIVER, o fone vibrando do OUVIR)
//   - embaixo, à direita: o turbo e o propulsor (Corrida, .l-propulsao)
// Tudo é clicável. Nada de frase explicando: a explicação vem nas invasões da
// rádio, e o "?" diz o que cada coisa é (toca no "?", depois na coisa)

import { useEffect, useMemo, useRef, useState } from "react"
import { APPS, DOCK, ESCONDIDOS, Glifo, chamados, type AppId } from "../os"
import { horaTexto } from "../relogio"
import { ondaMusica, pistaSom } from "../som"
import type { Save } from "../estado"
import { PISTAS } from "./pistas"

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// o que cada coisa do holo é (o "?"): uma frase simples, sem manual
export const INFO: Record<string, { t: string; d: string }> = {
  ajuda: { t: "?", d: "toca aqui e depois em qualquer coisa do holo pra saber o que é. toca de novo pra sair." },
  desligar: { t: "o holo", d: "o óculos liga e desliga o holo. desligado, some tudo: fica só a estrada (tecla H)." },
  camera: { t: "câmera", d: "de fora da Kombi ou de dentro, no banco do motorista (tecla C)." },
  radio: { t: "rádio 222", d: "a rádio pirata da cidade. toca no holograma: ela liga e invade a música. ⏭ troca a faixa." },
  faixa: { t: "a faixa da pista", d: "cada pista é uma música do Vol.1: com a Kombi rodando nela, o disco gira." },
  ilha: { t: "N3XO_", d: "as mensagens da cidade passam aqui. toca pra abrir as conversas." },
  mapa: { t: "o mapa", d: "toca pra abrir. marcar um lugar já é aceitar: a rota acende e, chegando lá, você entra direto." },
  anel: { t: "as missões", d: "a missão que você está fazendo, ou quantas estão te esperando. toca pra ver todas." },
  clima: { t: "o clima", d: "o tempo de onde a Kombi está agora: cada lugar da cidade tem o seu. o deserto nunca chove." },
  agua: { t: "água", d: "a coisa mais valiosa num mundo seco. as gotas da pista viram água: rega as flores, paga a oficina, e a cada 100 gotas, duas viagens rápidas. a polícia leva 1/5 se te prender." },
  turbo: { t: "turbo", d: "segura um instante: a Kombi dispara. o drift, as manobras e os voos enchem a barra (no teclado, um toque no espaço). de patins, no ar, é o dash." },
  propulsor: { t: "propulsor", d: "segura: a Kombi voa. de patins, é o jato de ar das costas. a energia volta andando no chão (no teclado, segura o espaço)." },
  sair: { t: "sair da Kombi", d: "desce de patins. a Kombi fica estacionada te esperando (tecla F)." },
}
const infoApp = (id: AppId) => { const a = APPS.find((x) => x.id === id); return a ? { t: a.nome, d: a.desc } : null }
export const infoDe = (chave: string) => (chave.startsWith("app:") ? infoApp(chave.slice(4) as AppId) : INFO[chave]) ?? null

type Radio = { ligada: boolean; freq: string; faixa: string; cor: string }

// em cima, à esquerda: a RÁDIO (o holograma com a onda sonora) e a faixa da pista
export function HoloSom({ radio, onRadio, onProxima }: { radio: Radio; onRadio: () => void; onProxima: () => void }) {
  const [som, setSom] = useState<{ faixa: string; t: number; dur: number } | null>(null)
  const tela = useRef<HTMLCanvasElement>(null)
  const cor = useRef(radio.cor)
  const ligada = useRef(radio.ligada)
  useEffect(() => { cor.current = radio.cor; ligada.current = radio.ligada }, [radio.cor, radio.ligada])
  useEffect(() => {
    const ler = () => {
      const src = pistaSom.src
      const p = src ? PISTAS.find((x) => x.voz === src || x.inst === src) : null
      const el = pistaSom.el
      setSom(p && el ? { faixa: `${p.faixa}${src === p.inst ? " · inst" : ""}`, t: el.currentTime, dur: el.duration || p.duracao } : null)
    }
    ler()
    const t = setInterval(ler, 500)
    return () => clearInterval(t)
  }, [])
  // o holograma: a onda da música em volta do disco, anéis girando, a varredura
  // (canvas pequeno, ~30 quadros por segundo: leve)
  useEffect(() => {
    const cv = tela.current, g = cv?.getContext("2d")
    if (!cv || !g) return
    const buf = new Uint8Array(new ArrayBuffer(128))
    let raf = 0, ult = 0
    const quadro = (agora: number) => {
      raf = requestAnimationFrame(quadro)
      if (agora - ult < 33) return
      ult = agora
      const S = cv.clientWidth, dpr = Math.min(2, devicePixelRatio)
      if (cv.width !== S * dpr) { cv.width = cv.height = S * dpr }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, S, S)
      const c = S / 2, t = agora / 1000, k = cor.current, on = ligada.current
      const tem = ondaMusica(buf)
      // a base do projetor e o cone de luz
      const gr = g.createLinearGradient(0, S, 0, 0)
      gr.addColorStop(0, `${k}55`); gr.addColorStop(1, `${k}00`)
      g.fillStyle = gr
      g.beginPath(); g.moveTo(c - 10, S - 4); g.lineTo(c + 10, S - 4); g.lineTo(c + c * 0.85, c * 0.35); g.lineTo(c - c * 0.85, c * 0.35); g.closePath(); g.fill()
      g.strokeStyle = k; g.lineWidth = 1.2; g.shadowColor = k; g.shadowBlur = 10
      g.beginPath(); g.ellipse(c, S - 4, 12, 3, 0, 0, Math.PI * 2); g.stroke()
      // os anéis girando (um tracejado em cada sentido)
      g.setLineDash([3, 5]); g.lineDashOffset = -t * 18
      g.beginPath(); g.arc(c, c * 0.92, c * 0.78, 0, Math.PI * 2); g.stroke()
      g.setLineDash([14, 8]); g.lineDashOffset = t * 26; g.globalAlpha = 0.55
      g.beginPath(); g.arc(c, c * 0.92, c * 0.62, 0, Math.PI * 2); g.stroke()
      g.setLineDash([]); g.globalAlpha = 1
      // a onda: um anel que pulsa com a música (com a rádio desligada, só um fio)
      const R = c * 0.44, amp = on ? c * 0.3 : c * 0.12
      g.lineWidth = 2
      g.beginPath()
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2 + t * 0.6
        const v = tem ? (buf[(i * 2) % 128] - 128) / 128 : Math.sin(i * 0.9 + t * 4) * 0.15
        const r = R + v * amp
        const x = c + Math.cos(a) * r, y = c * 0.92 + Math.sin(a) * r
        if (i) g.lineTo(x, y); else g.moveTo(x, y)
      }
      g.closePath(); g.stroke()
      // o miolo: a frequência
      g.shadowBlur = 0
      g.fillStyle = on ? k : `${k}99`
      g.font = `800 ${Math.round(c * 0.3)}px ui-monospace, monospace`
      g.textAlign = "center"; g.textBaseline = "middle"
      g.fillText("222", c, c * 0.92)
      // a varredura do holograma
      g.globalAlpha = 0.12; g.fillStyle = k
      for (let y = (t * 30) % 4; y < S; y += 4) g.fillRect(0, y, S, 1)
      g.globalAlpha = 1
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className={`l-holo-som ${radio.ligada ? "is-on" : ""}`} style={{ ["--cor" as string]: radio.cor }} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="l-holo-radio-holo" data-info="radio" onClick={onRadio} aria-label={radio.ligada ? "desligar a rádio" : "ligar a rádio"}>
        <canvas ref={tela} />
      </button>
      <div className="l-holo-som-info">
        <div className="l-holo-radio-linha" data-info="radio">
          <b>{radio.freq} fm</b>
          <span>{radio.ligada ? radio.faixa : "desligada"}</span>
          {radio.ligada && <button type="button" onClick={onProxima} aria-label="próxima faixa">⏭</button>}
        </div>
        <div className="l-holo-faixa" data-info="faixa">
          <i className={som ? "is-gira" : ""} />
          <b>{som ? som.faixa : "—"}</b>
          {som && <small>{mmss(som.t)}</small>}
        </div>
        {som && <div className="l-holo-barra"><div style={{ transform: `scaleX(${Math.min(1, som.t / Math.max(1, som.dur))})` }} /></div>}
      </div>
    </div>
  )
}

// a ilha do N3XO: a hora e as mensagens passando como o letreiro de um ônibus
export function HoloLetreiro({ save, nivel, hora }: { save: Save; nivel: number; hora: number }) {
  const msgs = useMemo(() => chamados(save, nivel), [save, nivel])
  const texto = msgs.map((m) => `${m.de}: ${m.texto}`).join("   ·   ")
  return (
    <div className="l-ilha-conteudo l-holo-letreiro">
      <b>{horaTexto(hora)}</b>
      {texto ? (
        <span className="l-holo-letreiro-faixa">
          {/* duas cópias: o letreiro roda sem emenda */}
          <em style={{ ["--dur" as string]: `${Math.max(8, texto.length * 0.22)}s` }}>{texto}   ·   {texto}   ·   </em>
        </span>
      ) : <span className="l-holo-letreiro-vazio">N3XO_</span>}
      {msgs.length > 0 && <i>{msgs.length}</i>}
    </div>
  )
}

// os ícones pequenos, enfileirados no alto (menos os que já têm widget: a
// rádio, o N3XO, o B4TIDA, o GUITAR DRIVER, o OUVIR; e a Kombi, que é aqui)
const NO_WIDGET: AppId[] = ["kombi", "n3xo", "radio", "batida", "guitar", "ouvir"]
const ICONES = APPS.filter((a) => !NO_WIDGET.includes(a.id) && !ESCONDIDOS.includes(a.id) && (!DOCK.includes(a.id) || a.id === "linha"))
export function HoloIcones({ onApp }: { onApp: (id: AppId) => void }) {
  return (
    <nav className="l-holo-icones" aria-label="apps" onPointerDown={(e) => e.stopPropagation()}>
      {ICONES.map((a) => (
        <button key={a.id} type="button" data-info={`app:${a.id}`} style={{ ["--cor" as string]: a.cor }} onClick={() => onApp(a.id)} aria-label={a.nome} title={a.nome}>
          <Glifo id={a.id} cor={a.cor} size={17} />
        </button>
      ))}
    </nav>
  )
}

// o clima da região onde a Kombi está (o deserto nunca chove; de noite esfria)
export type Clima = { chove: boolean; deserto: boolean; regiao: string; hora: number }
export function HoloClima({ ler }: { ler: () => Clima }) {
  const [c, setC] = useState<Clima>(() => ler())
  useEffect(() => { const t = setInterval(() => setC(ler()), 1000); return () => clearInterval(t) }, [ler])
  const noite = c.hora >= 19 || c.hora < 6
  // a temperatura: uma curva do dia (o deserto vai de 9° de madrugada a 38° à tarde)
  const dia = Math.sin(((c.hora - 9) / 24) * Math.PI * 2)
  const temp = Math.round(c.deserto ? 23 + 15 * dia : 21 + 6 * dia - (c.chove ? 4 : 0))
  const tipo = c.deserto ? (noite ? "noite" : "sol") : c.chove ? "chuva" : noite ? "noite" : "nublado"
  const nome = { sol: "seco", noite: "céu aberto", chuva: "chuva", nublado: "nublado" }[tipo]
  return (
    <div className={`l-holo-clima is-${tipo}`} data-info="clima">
      <span className="l-holo-clima-ic" aria-hidden="true"><i /><i /><i /></span>
      <b>{temp}°</b>
      <span><em>{nome}</em><small>{c.regiao}</small></span>
    </div>
  )
}

// o anel das missões, girando em volta do mapa: a missão de agora, ou quantas há
export function HoloAnel({ missao, onMissoes }: { missao: { texto: string; cor: string; n: number } | null; onMissoes: () => void }) {
  const txt = !missao ? "" : missao.texto ? missao.texto : `${missao.n} ${missao.n === 1 ? "missão" : "missões"}`
  const cor = missao?.cor ?? "#2fe8ff"
  // o texto se repete pra dar a volta inteira
  const volta = txt ? Array.from({ length: Math.max(1, Math.floor(120 / (txt.length + 5))) }, () => `${txt.toUpperCase()}  ◆  `).join("") : ""
  return (
    <button type="button" className={`l-holo-anel ${txt ? "" : "is-vazio"}`} data-info="anel" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()} onClick={onMissoes} aria-label={txt || "missões"}>
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <defs><path id="l-holo-anel-p" d="M80,80 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" /></defs>
        <circle cx="80" cy="80" r="76" />
        <g className="l-holo-anel-gira">
          <text><textPath href="#l-holo-anel-p" textLength="438" lengthAdjust="spacingAndGlyphs">{volta}</textPath></text>
        </g>
        {missao && missao.n > 0 && <g className="l-holo-anel-n"><circle cx="138" cy="26" r="11" /><text x="138" y="26">{missao.n}</text></g>}
      </svg>
    </button>
  )
}

// embaixo, à esquerda: o widget que imita o app da vez (troca a cada 6 s)
const VEZ: AppId[] = ["batida", "guitar", "ouvir"]
// a MPC do B4TIDA: 16 pads tocando um padrão (bumbo, caixa, chimbal, o synth)
const PADRAO = [0, 4, 8, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
function MiniMpc() {
  return (
    <span className="l-mini-mpc" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ ["--d" as string]: `${(PADRAO.indexOf(i) / 16) * 2.4}s`, ["--h" as string]: `${(i % 4) * 30}deg` }} />)}
    </span>
  )
}
// o show de rock do GUITAR DRIVER: o palco, os canhões de luz varrendo, a banda e a galera pulando
function MiniShow() {
  return (
    <span className="l-mini-show" aria-hidden="true">
      <i className="is-luz" /><i className="is-luz is-b" /><i className="is-luz is-c" />
      <span className="is-banda"><i /><i className="is-guitarra" /><i /></span>
      <span className="is-palco" />
      <span className="is-galera">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ ["--d" as string]: `${(i * 0.137) % 0.5}s` }} />)}</span>
    </span>
  )
}
// o OUVIR: o fone vibrando no ouvido, as ondas saindo
function MiniFone() {
  return (
    <span className="l-mini-fone" aria-hidden="true">
      <i className="is-onda" /><i className="is-onda is-b" /><i className="is-onda is-c" />
      <svg viewBox="0 0 40 40"><path d="M8 24v-4a12 12 0 0 1 24 0v4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><rect x="5" y="22" width="7" height="11" rx="3" fill="currentColor" /><rect x="28" y="22" width="7" height="11" rx="3" fill="currentColor" /></svg>
    </span>
  )
}
export function HoloApps({ onApp }: { onApp: (id: AppId) => void }) {
  const [k, setK] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % VEZ.length), 6000); return () => clearInterval(t) }, [])
  const a = APPS.find((x) => x.id === VEZ[k])!
  return (
    <button type="button" key={a.id} className={`l-holo-apps is-${a.id}`} data-info={`app:${a.id}`} style={{ ["--cor" as string]: a.cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => onApp(a.id)}>
      <span className="l-holo-apps-tela">{a.id === "batida" ? <MiniMpc /> : a.id === "guitar" ? <MiniShow /> : <MiniFone />}</span>
      <span className="l-holo-apps-rodape">
        <b>{a.nome}</b>
        <span className="l-holo-apps-pips">{VEZ.map((v, i) => <i key={v} className={i === k ? "is-on" : ""} />)}</span>
      </span>
    </button>
  )
}

// o "?": ligado, tocar em qualquer coisa do holo (o que tem data-info) mostra
// o que ela é, em vez de fazer a ação; tocar fora, ou no "?", sai
export function HoloAjuda({ ativa, onSair }: { ativa: boolean; onSair: () => void }) {
  const [card, setCard] = useState<{ t: string; d: string } | null>(null)
  useEffect(() => {
    if (!ativa) return
    const alvo = (e: Event) => (e.target as Element | null)?.closest?.("[data-info]") as HTMLElement | null
    // (na captura, antes do React: a ação do botão não acontece)
    const desce = (e: PointerEvent) => {
      const el = alvo(e)
      if (!el) { onSair(); return }
      e.stopPropagation(); e.preventDefault()
    }
    const toca = (e: MouseEvent) => {
      const el = alvo(e)
      if (!el) return
      e.stopPropagation(); e.preventDefault()
      const id = el.dataset.info!
      if (id === "ajuda") { onSair(); return }
      setCard(infoDe(id))
    }
    document.addEventListener("pointerdown", desce, true)
    document.addEventListener("click", toca, true)
    return () => { document.removeEventListener("pointerdown", desce, true); document.removeEventListener("click", toca, true) }
  }, [ativa, onSair])
  if (!ativa) return null
  return (
    <div className="l-holo-ajuda" role="status" aria-live="polite">
      {card ? <><b>{card.t}</b><span>{card.d}</span></> : <b>toca em qualquer coisa</b>}
    </div>
  )
}
