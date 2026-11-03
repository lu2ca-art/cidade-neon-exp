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
//   - à esquerda, logo abaixo da rádio: o DESTAQUE (LU2CA 20/10), o B4TIDA e o
//     GUITAR DRIVER se revezando ("tudo é sobre ele"; o GUITAR fica trancado
//     até o fim da carreira)
//   - embaixo, à esquerda: as "propagandas" do próprio aparelho (ACC3SS,
//     _IRIS.EXE, FR3Q_, STR34M, OUVIR), uma de cada vez, cada uma imitando o app
//   - a sintonia não é mais app: tocar no holograma da rádio abre o MENU DA
//     RÁDIO (as frequências e as mensagens das rádios piratas)
//   - embaixo, à direita: o turbo e o propulsor (Corrida, .l-propulsao)
// Tudo é clicável. Nada de frase explicando: a explicação vem nas invasões da
// rádio, e o "?" diz o que cada coisa é (toca no "?", depois na coisa)

import { textoMetros, useGuia } from "./alvoMissao"
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { APPS, DOCK, ESCONDIDOS, Glifo, appDesligado, type AppId } from "../os"
import { horaTexto } from "../relogio"
import { VOLUMES, definirVolume, ondaMusica, pistaSom, type CanalVolume } from "../som"
import { NIVEIS, NOME_NIVEL, type NivelQualidade } from "./qualidade"
import { pistaDoArquivo, rotuloDoArquivo } from "../disco/pistasLiberadas"
import { FREQUENCIAS, type FreqId } from "../radio"
import { lerFaixaRua, ouvirFaixaRua } from "../disco/musicaContinua"
import { linkDaFaixa, nomeDaFaixa, salvarFaixa } from "../disco/linksFaixas"

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// o que cada coisa do holo é (o "?"): uma frase simples, sem manual
export const INFO: Record<string, { t: string; d: string }> = {
  ajuda: { t: "?", d: "toca no ? e depois em qualquer coisa da tela: a explicação aparece por cima dela. toca no ? de novo (ou fora) pra sair. os controles: um lado da tela vira pra ele; os dois lados juntos freiam (parado, dá ré); no ar, um lado gira e os dois juntos dão o mortal. no teclado, ↓ freia e Q é a manobra." },
  ajustes: { t: "ajustes", d: "a engrenagem: o volume da música, dos efeitos e das vozes, a qualidade dos gráficos e a lista dos controles." },
  desligar: { t: "o holo", d: "o óculos liga e desliga o holo. desligado, some tudo: fica só a estrada (tecla H)." },
  camera: { t: "o olho (a câmera)", d: "o olhinho em cima do óculos: toca nele e a câmera troca, de fora da Kombi ou de dentro, no banco do motorista (tecla C). aberto e azul: de dentro." },
  radio: { t: "rádio 222", d: "a rádio pirata da cidade. toca no holograma: abre o menu da rádio (ligar, sintonizar as frequências que você já achou, e as mensagens das rádios piratas). ⏭ troca a faixa." },
  destaque: { t: "B4TIDA · GUITAR DRIVER", d: "os dois que importam. o B4TIDA toca o padrão aqui mesmo: toca nele e abre o criador de beats. o GUITAR DRIVER abre no fim da sua carreira." },
  "app:batida": { t: "B4TIDA", d: "a MPC: toca nos quadrados pra abrir o criador de beats e montar a sua música por camadas." },
  "app:guitar": { t: "GUITAR DRIVER", d: "o jogo das faixas ao vivo. por enquanto trancado: abre quando a sua carreira chegar lá." },
  "app:stream": { t: "vid.stream", d: "os clipes. abre aqui mesmo, no holo: a música da cidade para enquanto ele tá aberto." },
  propaganda: { t: "o que o holo faz", d: "o próprio aparelho mostrando o que tem dentro: ACC3SS, _IRIS.EXE, FR3Q_, vid.stream e OUVIR, um de cada vez. toca pra abrir o da vez, aqui mesmo, no holo." },
  salvar: { t: "♥ salvar", d: "a faixa que toca na rua, no seu app de música: um toque abre o app (ou a página com todos) pra salvar ou pôr na sua playlist. só se você quiser." },
  faixa: { t: "a faixa da pista", d: "cada pista é uma música do Vol.1: com a Kombi rodando nela, o disco gira." },
  ilha: { t: "N3XO_ · o notch", d: "o Nexo: o objetivo da missão, o passo de agora e as dicas passam aqui. toca nele e ele abre com o objetivo inteiro." },
  mapa: { t: "o mapa", d: "toca pra abrir. as missões moram aqui: cada ícone é uma missão, na pista dela. marcar um lugar já é aceitar: a rota acende e, chegando lá, você entra direto." },
  anel: { t: "as missões", d: "a missão de agora gira em volta do mapa: o nome e o ícone dela. toca: a checklist dá a volta; toca de novo: o mapa com as missões." },
  clima: { t: "o clima", d: "o tempo de onde a Kombi está agora: cada lugar da cidade tem o seu. o deserto nunca chove." },
  agua: { t: "água", d: "a coisa mais valiosa num mundo seco. as gotas da pista viram água: rega as flores, paga a oficina, e a cada 100 gotas, duas viagens rápidas." },
  controles: { t: "os controles", d: "no celular: um lado da tela vira pra ele; os dois juntos freiam (parado, dá ré). no ar: um lado gira, os dois juntos dão o mortal. no teclado: ↓ freia, Q é a manobra." },
  turbo: { t: "turbo", d: "segura um instante: a Kombi dispara. o drift, as manobras e os voos enchem a barra (no teclado, um toque no espaço). de patins, no ar, é o dash." },
  propulsor: { t: "propulsor", d: "segura: a Kombi voa. de patins, é o jato de ar das costas. a energia volta andando no chão (no teclado, segura o espaço)." },
  sair: { t: "sair da Kombi", d: "desce de patins. a Kombi fica estacionada te esperando (tecla F)." },
}
const infoApp = (id: AppId) => { const a = APPS.find((x) => x.id === id); return a ? { t: a.nome, d: a.desc } : null }
export const infoDe = (chave: string) => INFO[chave] ?? (chave.startsWith("app:") ? infoApp(chave.slice(4) as AppId) : null) ?? null

// (LU2CA 22/10 (2)) os AVISOS DA RÁDIO: as falas que ensinam controle não vão
// mais pra tela; passam no display da rádio do holo (e ficam no menu dela).
// Uma loja pequena fora do React: quem fala chama avisarRadio; a rádio ouve
export type AvisoRadio = { id: number; de: string; texto: string; ms: number }
let avisoN = 0
export const AVISOS_RADIO: AvisoRadio[] = []
const ouvintesAviso = new Set<(a: AvisoRadio) => void>()
export function avisarRadio(de: string, texto: string, ms = 5200) {
  const a = { id: ++avisoN, de, texto, ms }
  AVISOS_RADIO.unshift(a)
  if (AVISOS_RADIO.length > 6) AVISOS_RADIO.length = 6
  ouvintesAviso.forEach((f) => f(a))
}
// o aviso que está passando agora (some depois de ms + um respiro)
function useAvisoRadio() {
  const [a, setA] = useState<AvisoRadio | null>(null)
  useEffect(() => {
    let t = 0 as unknown as ReturnType<typeof setTimeout>
    const f = (x: AvisoRadio) => { clearTimeout(t); setA(x); t = setTimeout(() => setA(null), x.ms + 2500) }
    ouvintesAviso.add(f)
    return () => { ouvintesAviso.delete(f); clearTimeout(t) }
  }, [])
  return a
}

type Radio = { ligada: boolean; freq: string; faixa: string; cor: string; id: FreqId; sinal: number }

// (RASCUNHO, LU2CA 20/10) as mensagens das frequências piratas: chegam no menu
// da rádio de tempos em tempos. Vagas de propósito: perigo e mistério, de leve
const PIRATAS: { de: string; texto: string }[] = [
  { de: "??.? fm", texto: "alguém aí? aqui embaixo a gente ainda toca disco" },
  { de: "sem nome", texto: "as máquinas não dormem. a gente também não" },
  { de: "103.? fm", texto: "vi uma kombi velha cortando as dunas. de onde ela veio?" },
  { de: "ruído", texto: "...a casa no deserto... ela sabia que ele vinha..." },
  { de: "47.1 fm", texto: "tem flor nascendo na pista da nectar. quem tá regando?" },
  { de: "sem nome", texto: "carro vazio caindo do céu de novo. ninguém dentro. nunca tem ninguém dentro" },
  { de: "??.? fm", texto: "se vc tá ouvindo isso, vc ainda é humano. ou quase" },
  { de: "ruído", texto: "o palco do bar tá vazio faz anos. alguém devia subir lá" },
]
const DE_PIRATA = 38000 // ms entre uma mensagem pirata e outra

// em cima, à esquerda: a RÁDIO (o holograma com a onda sonora) e a faixa da pista.
// Tocar no holograma abre o MENU DA RÁDIO (LU2CA 20/10: a SINT0NIA virou isso)
export function HoloSom({ radio, onLigar, onProxima, onSintonizar }: { radio: Radio; onLigar: () => void; onProxima: () => void; onSintonizar: (id: FreqId) => void }) {
  const [menu, setMenu] = useState(false)
  // as piratas: quantas já chegaram (a primeira chega logo) e quantas você não leu
  const [piratas, setPiratas] = useState(1)
  const [lidas, setLidas] = useState(0)
  useEffect(() => { const t = setInterval(() => setPiratas((n) => Math.min(PIRATAS.length, n + 1)), DE_PIRATA); return () => clearInterval(t) }, [])
  // (abrir e fechar o menu marca tudo como lido)
  const novas = menu ? 0 : piratas - lidas
  const alternarMenu = () => { setLidas(piratas); setMenu((m) => !m) }
  const [som, setSom] = useState<{ faixa: string; t: number; dur: number } | null>(null)
  const aviso = useAvisoRadio()
  const tela = useRef<HTMLCanvasElement>(null)
  const cor = useRef(radio.cor)
  const ligada = useRef(radio.ligada)
  useEffect(() => { cor.current = radio.cor; ligada.current = radio.ligada }, [radio.cor, radio.ligada])
  useEffect(() => {
    const ler = () => {
      const src = pistaSom.src
      const p = pistaDoArquivo(src)?.pista ?? null
      const el = pistaSom.el
      setSom(p && el ? { faixa: `${p.faixa}${rotuloDoArquivo(src)?.slice(p.faixa.length) ?? ""}`, t: el.currentTime, dur: el.duration || p.duracao } : null)
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
    <div className={`l-holo-som ${radio.ligada ? "is-on" : ""} ${menu ? "is-menu" : ""}`} style={{ ["--cor" as string]: radio.cor }} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="l-holo-radio-holo" data-info="radio" onClick={alternarMenu} aria-label="o menu da rádio" aria-expanded={menu}>
        <canvas ref={tela} />
        {novas > 0 && !menu && <em className="l-holo-radio-novas">{novas}</em>}
      </button>
      <div className="l-holo-som-info">
        <div className={`l-holo-radio-linha ${aviso ? "is-aviso" : ""}`} data-info="radio">
          <b>{aviso ? aviso.de : `${radio.freq} fm`}</b>
          {aviso ? (
            <span key={aviso.id} className="l-holo-radio-aviso"><em style={{ ["--dur" as string]: `${Math.max(5, aviso.texto.length * 0.16)}s` }}>{aviso.texto}</em></span>
          ) : <span>{radio.ligada ? radio.faixa : "desligada"}</span>}
          {radio.ligada && <button type="button" onClick={onProxima} aria-label="próxima faixa">⏭</button>}
        </div>
        <div className="l-holo-faixa" data-info="faixa">
          <i className={som ? "is-gira" : ""} />
          <b>{som ? som.faixa : "—"}</b>
          {som && <small>{mmss(som.t)}</small>}
        </div>
        {som && <div className="l-holo-barra"><div style={{ transform: `scaleX(${Math.min(1, som.t / Math.max(1, som.dur))})` }} /></div>}
      </div>
      {menu && (
        <div className="l-holo-radio-menu" role="dialog" aria-label="o menu da rádio">
          <header>
            <b>sintonia</b>
            <button type="button" className={radio.ligada ? "is-on" : ""} onClick={onLigar} aria-label={radio.ligada ? "desligar a rádio" : "ligar a rádio"}>{radio.ligada ? "ligada" : "desligada"}</button>
            <button type="button" onClick={alternarMenu} aria-label="fechar">×</button>
          </header>
          <ul className="l-holo-radio-freqs">
            {FREQUENCIAS.map((f) => {
              const livre = f.custo <= radio.sinal, aqui = f.id === radio.id && radio.ligada
              return (
                <li key={f.id} style={{ ["--c" as string]: f.cor }}>
                  <button type="button" disabled={!livre} className={aqui ? "is-aqui" : ""} onClick={() => onSintonizar(f.id)}>
                    <b>{f.freq}</b><span>{livre ? f.nome : "· · ·"}</span>{!livre && <small>{f.custo - radio.sinal} de sinal</small>}{aqui && <i aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
          {AVISOS_RADIO.length > 0 && <>
            <small className="l-holo-radio-sub">avisos</small>
            <ul className="l-holo-radio-piratas is-avisos">
              {AVISOS_RADIO.map((m) => <li key={m.id}><b>{m.de}</b><span>{m.texto}</span></li>)}
            </ul>
          </>}
          <small className="l-holo-radio-sub">piratas</small>
          <ul className="l-holo-radio-piratas">
            {PIRATAS.slice(0, piratas).reverse().map((m, i) => <li key={piratas - i} className={i < piratas - lidas ? "is-nova" : ""}><b>{m.de}</b><span>{m.texto}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── (LU2CA 22/10 (2)) O NOTCH DINÂMICO (estilo Dynamic Island): uma mensagem
// (o passo da missão com nome longo, um passo cumprido, a legendinha das falas
// que ensinam) entra da direita pra esquerda dentro do notch, rola se for longa
// e some; o notch volta ao normal. Uma por vez (fila simples, sem repetir a
// última, as velhas caem). Desempenho: um setState por mensagem (entra/sai), o
// movimento é uma Web Animation (compositor), uma medida de largura por
// mensagem. "Reduzir movimento": sem deslizar; aparece parada (até 2 linhas) e some ──
type MsgNotch = { id: number; texto: string; cor: string; em: number }
const FILA_NOTCH: MsgNotch[] = []
let notchN = 0, notchUltima = ""
const ouvintesNotch = new Set<() => void>()
export function notch(texto: string, cor = "#2fe8ff") {
  if (!texto || texto === notchUltima) return
  notchUltima = texto
  FILA_NOTCH.push({ id: ++notchN, texto, cor, em: Date.now() })
  if (FILA_NOTCH.length > 5) FILA_NOTCH.shift()
  ouvintesNotch.forEach((f) => f())
}
const NOTCH_VELHA = 25000 // ms: mensagem que esperou mais que isso na fila não passa mais
function useNotch() {
  const [msg, setMsg] = useState<MsgNotch | null>(null)
  const livre = useRef(true)
  const proxima = useRef(() => {})
  proxima.current = () => {
    if (!livre.current) return
    let m = FILA_NOTCH.shift()
    while (m && Date.now() - m.em > NOTCH_VELHA) m = FILA_NOTCH.shift()
    if (!m) { notchUltima = ""; return }
    livre.current = false
    setMsg(m)
  }
  useEffect(() => {
    const f = () => proxima.current()
    ouvintesNotch.add(f)
    f()
    return () => { ouvintesNotch.delete(f) }
  }, [])
  const acabou = () => { livre.current = true; setMsg(null); setTimeout(() => proxima.current(), 250) }
  return [msg, acabou] as const
}
function MsgNoNotch({ msg, onFim }: { msg: MsgNotch; onFim: () => void }) {
  const caixa = useRef<HTMLSpanElement>(null)
  const el = useRef<HTMLElement>(null)
  const fim = useRef(onFim)
  fim.current = onFim
  const quieto = calmo()
  useLayoutEffect(() => {
    const c = caixa.current, e = el.current
    if (!c || !e || typeof e.animate !== "function") { const t = setTimeout(() => fim.current(), 4000); return () => clearTimeout(t) }
    let a: Animation
    if (quieto) {
      const dur = Math.min(9000, 2200 + msg.texto.length * 55)
      a = e.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.94 }, { opacity: 0 }], { duration: dur, fill: "both" })
    } else {
      const W = c.clientWidth, T = e.scrollWidth, sobra = Math.max(0, T - W)
      // entra (450 ms), respira, rola o que sobra a ~48 px/s, respira, some (300 ms)
      const ent = 450, resp = 900, rola = (sobra / 48) * 1000, resp2 = sobra ? 1100 : 1400, sai = 300
      const dur = ent + resp + rola + resp2 + sai
      const o = (ms: number) => ms / dur
      a = e.animate([
        { transform: `translateX(${W}px)`, opacity: 1, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
        { transform: "translateX(0)", opacity: 1, offset: o(ent) },
        { transform: "translateX(0)", opacity: 1, offset: o(ent + resp), easing: "linear" },
        { transform: `translateX(${-sobra}px)`, opacity: 1, offset: o(ent + resp + rola) },
        { transform: `translateX(${-sobra}px)`, opacity: 1, offset: o(ent + resp + rola + resp2) },
        { transform: `translateX(${-sobra}px)`, opacity: 0 },
      ], { duration: dur, fill: "both" })
    }
    a.onfinish = () => fim.current()
    return () => { a.onfinish = null; a.cancel() }
  }, [msg.id, quieto, msg.texto])
  return (
    <span ref={caixa} className={`l-holo-letreiro-faixa is-msg ${quieto ? "is-calmo" : ""}`} role="status" aria-live="polite">
      <em ref={el} className="l-notch-msg" style={{ ["--c" as string]: msg.cor }}>{msg.texto}</em>
    </span>
  )
}

// ── (T56, dono 28/10) O NEXO COM UM NOTCH SÓ. O notch é o único lugar do Nexo:
// a hora, o que dá pra fazer agora (o passo do tutorial, o próximo passo da
// missão, o lugar) e o "?" dentro dele. Tocar no notch ou no "?" abre o notch
// (ele cresce pra baixo) com a explicação do que está nele; aberto, tocar numa
// coisa do holo explica ela ali mesmo. Nada de cartão separado nem de chat
// (T41: C1, C3, C4, C8). O tutorial (disco/TutorialHolo.tsx) fala por aqui: ele
// escreve em nexoTutorial(), e o notch mostra o passo com o "2 de 5" discreto.
// Desempenho: uma loja fora do React, um setState quando o passo muda ──
export type NexoTut = { passo: string; texto: string; conta?: string; ok?: boolean; fim?: boolean; cor?: string; ajuda?: { t: string; d: string } }
let NEXO_TUT: NexoTut | null = null
const ouvintesTut = new Set<() => void>()
export function nexoTutorial(x: NexoTut | null) {
  const a = NEXO_TUT
  if (a === x || (a && x && a.passo === x.passo && a.texto === x.texto && a.conta === x.conta && !!a.ok === !!x.ok && !!a.fim === !!x.fim)) return
  NEXO_TUT = x
  ouvintesTut.forEach((f) => f())
}
export function useNexoTutorial() {
  return useSyncExternalStore((f) => { ouvintesTut.add(f); return () => { ouvintesTut.delete(f) } }, () => NEXO_TUT, () => null)
}
// o que dá pra fazer agora, fora do tutorial (a Corrida monta: a missão, o lugar)
export type NexoAgora = { texto: string; cor: string; ajuda: { t: string; d: string } }
// ── (T41 B2, dono 29/10) O NEXO É A CENTRAL DAS NOTIFICAÇÕES: o objetivo da
// missão, as dicas do jogo e o tutorial do "?". Nada de fala de personagem nem
// de mensagem: só o que dá pra fazer agora.
//   - a linha do notch: o passo do tutorial, ou o objetivo da missão, ou (sem
//     missão) uma dica, trocando devagar
//   - tocar no notch: ele expande pra baixo com o objetivo inteiro e uma dica
//   - tocar no "?": o notch diz "clique em qualquer lugar para saber mais"; aí
//     tocar numa coisa da tela mostra a explicação por cima dela, como
//     realidade aumentada do holo (HoloAjuda, logo abaixo). O "?" de novo sai
// Desempenho: nada por quadro. A dica troca num setInterval de 18 s, e só
// enquanto a linha está livre ──
// (RASCUNHO, o dono reescreve) as dicas do jogo: curtas, uma coisa por vez
export const DICAS: string[] = [
  "dica · segura o propulsor: a Kombi voa",
  "dica · no ar, um lado da tela gira; os dois juntos dão o mortal",
  "dica · as gotas da pista viram água: rega as flores, paga a oficina",
  "dica · o drift, as manobras e os voos enchem o turbo",
  "dica · toca no mapa: cada ícone é uma missão",
  "dica · o óculos desliga o holo e deixa só a estrada (H)",
  "dica · o olho em cima do óculos troca a câmera (C)",
  "dica · o holograma da rádio abre as frequências que você já achou",
]
const DE_DICA = 18000
const NEXO_PERGUNTA = "clique em qualquer lugar para saber mais"
function useDica(ativa: boolean) {
  const [k, setK] = useState(() => Math.floor(Math.random() * DICAS.length))
  useEffect(() => {
    if (!ativa) return
    const t = setInterval(() => setK((x) => (x + 1) % DICAS.length), DE_DICA)
    return () => clearInterval(t)
  }, [ativa])
  return DICAS[k]
}
// (missões claras, 02/11) a linha "Agora: ..." com a distância até o alvo (o guia,
// estrada/alvoMissao.ts). Perto do lugar sem ter começado, o guia manda a frase
// do que fazer ali. Só este pedacinho se refaz quando o guia muda
function AgoraNexo({ texto }: { texto: string }) {
  const g = useGuia()
  const m = g.dica ? "" : textoMetros(g.metros)
  return (
    <span className="l-nexo-agora">
      <em>{g.dica ? `Agora: ${g.dica}` : texto}</em>
      {m && <small className="l-nexo-conta">{m}</small>}
    </span>
  )
}
// (salvar no app, 03/11, bíblia §7) o "♥ salvar" da faixa que toca na rua: um
// toque abre o app de música da pessoa. Sem link (disco/linksFaixas.ts), nada.
// Quando a completa acaba de tocar inteira, ele brilha de leve ~8 s com o nome
// da faixa. Só se refaz quando a faixa troca ou o brilho muda
function SalvarNexo() {
  const r = useSyncExternalStore(ouvirFaixaRua, lerFaixaRua, lerFaixaRua)
  const id = r.id
  if (!id || !linkDaFaixa(id)) return null
  const nome = nomeDaFaixa(id)
  return (
    <button type="button" data-info="salvar" className={`l-nexo-salvar ${r.brilho ? "is-brilho" : ""}`} onClick={(e) => { e.stopPropagation(); salvarFaixa(id, "nexo") }} aria-label={`salvar ${nome} no seu app de música`} title={`salvar ${nome} no seu app`}>
      <i aria-hidden="true">♥</i>{r.brilho ? `salvar ${nome}` : "salvar"}
    </button>
  )
}
export function HoloLetreiro({ hora, agora, expandido, explicando, onExplicar }: { hora: number; agora: NexoAgora | null; expandido: boolean; explicando: boolean; onExplicar: () => void }) {
  const tut = useNexoTutorial()
  const [msg, acabou] = useNotch()
  // o passo do tutorial manda; a mensagem que passa espera ele (ou passa entre um e outro)
  const passando = msg && !tut && !explicando
  const livre = !tut && !passando && !agora && !explicando
  const dica = useDica(livre || expandido)
  const cor = explicando ? "#2fe8ff" : tut ? (tut.ok ? "#5dffa0" : tut.cor ?? "#2fe8ff") : passando ? msg.cor : agora?.cor ?? "#2fe8ff"
  // expandido: o objetivo inteiro (o passo do tutorial ou a missão) e uma dica
  const obj = tut?.ajuda ?? agora?.ajuda ?? null
  return (
    <div className={`l-ilha-conteudo l-holo-letreiro ${passando ? "is-msg" : ""} ${tut ? "is-tut" : ""} ${tut?.ok ? "is-ok" : ""} ${tut?.fim ? "is-fim" : ""} ${expandido ? "is-aberto" : ""} ${explicando ? "is-explica" : ""}`} style={{ ["--c" as string]: cor }} data-passo={tut && !tut.fim ? tut.passo : undefined}>
      <div className="l-holo-letreiro-linha">
        <b>{horaTexto(hora)}</b>
        {explicando ? (
          <span className="l-nexo-agora" role="status" aria-live="polite"><em>{NEXO_PERGUNTA}</em></span>
        ) : tut ? (
          <span className="l-nexo-passo" role="status" aria-live="polite"><em>{tut.ok ? "✓ isso" : tut.texto}</em></span>
        ) : passando ? <MsgNoNotch key={msg.id} msg={msg} onFim={acabou} /> : agora ? (
          <AgoraNexo texto={agora.texto} />
        ) : <span className="l-nexo-agora is-dica"><em key={dica} style={{ opacity: 0.75 }}>{dica}</em></span>}
        {tut?.conta && !explicando && <small className="l-nexo-conta">{tut.conta}</small>}
        {!tut && !explicando && <SalvarNexo />}
        <button type="button" data-info="ajuda" className={`l-nexo-q ${explicando ? "is-on" : ""}`} onClick={(e) => { e.stopPropagation(); onExplicar() }} aria-label={explicando ? "sair do ?" : "o que é isso? (toca e depois toca numa coisa da tela)"} aria-pressed={explicando}>?</button>
      </div>
      {expandido && !explicando && (
        <div className="l-nexo-ajuda" role="status" aria-live="polite">
          {obj ? <><b>{obj.t}</b><span>{obj.d}</span></> : <b>N3XO_</b>}
          <small>{dica}</small>
        </div>
      )}
    </div>
  )
}

// os ícones pequenos, enfileirados no alto (menos os que já têm widget: a
// rádio, o N3XO, o destaque (B4TIDA, GUITAR DRIVER), as propagandas (ACC3SS,
// _IRIS.EXE, FR3Q_, STR34M, OUVIR); a Kombi, que é aqui; e a SINT0NIA, que
// virou o menu da rádio (LU2CA 20/10))
// (LU2CA 21/10) o app RÁDIO 222 e o [UNTITLED] morreram no disco: a rádio é o
// holograma (o menu dela) e o FR3Q_ faz o papel do untitled
const NO_WIDGET: AppId[] = ["kombi", "n3xo", "radio", "batida", "guitar", "ouvir", "sintonia", "access", "iris", "freq", "stream", "untitled"]
const TODOS_ICONES = APPS.filter((a) => !NO_WIDGET.includes(a.id) && !ESCONDIDOS.includes(a.id) && (!DOCK.includes(a.id) || a.id === "linha"))
// (T41 B1) a LINHA 9 é do jogo velho: no jogo novo não vira ícone (lido uma vez, na 1ª montagem)
let iconesVivos: typeof TODOS_ICONES | null = null
const iconesHolo = () => (iconesVivos ??= TODOS_ICONES.filter((a) => !appDesligado(a.id)))
export function HoloIcones({ onApp }: { onApp: (id: AppId) => void }) {
  return (
    <nav className="l-holo-icones" aria-label="apps" onPointerDown={(e) => e.stopPropagation()}>
      {iconesHolo().map((a) => (
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

// ── (LU2CA 22/10, o Omnitrix, como o dono descreveu) O ANEL das missões gira
// em volta da bolinha (o mapa-mini). Pegou uma missão: o anel gira e expande
// (overshoot), a parte da missão ganha um fundo e a CHECKLIST passa a ser o
// texto girando em volta da bolinha, maior e mais clara. 6 s depois recolhe
// girando e fica só o NOME da missão e o ÍCONE especial dela. Tocar na bolinha
// (ou no anel) repete; tocar de novo com ele aberto abre o mapa. Desempenho: só
// CSS (keyframes), um setState por abrir/fechar, nada por quadro. "Reduzir
// movimento": troca sem giro nem escala ──
// (missões claras) `agora`: o próximo passo concreto, numa frase (disco/agora.ts)
export type ChecklistHolo = { chave: string; cor: string; titulo: string; nome: string; passos: { nome: string; estado: string }[]; agora?: string }
const OMNI_MS = 6000 // quanto tempo a checklist fica girando em volta antes de recolher
const RECOLHE_MS = 450
// o ícone especial de cada missão (o objeto que ela dá), num quadro 24x24: o
// mesmo desenho no anel (SVG) e no mapa (Path2D no canvas)
export const ICONE_MISSAO: Record<string, string> = {
  ontem: "M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M8 4v16", // o caderno
  copo: "M6 4h12l-2 16H8z M7 9h10", // o copo
  swav: "M9 3h6v4l2 3v11H7V10l2-3z M10 14h4", // a lanterna
  sexta: "M12 3a5 7 0 1 0 0.01 0z M12 17v4 M9 21h6", // o espelho
  rollercoaster: "M3 12a9 9 0 0 1 18 0z M12 12v7a2 2 0 0 1-4 0", // o guarda-chuva
  dopamina: "M12 4a8 8 0 1 0 0.01 0z M12 8v4l3 2", // o relógio
  chuva: "M12 6a3 3 0 1 0 0.01 0z M12 12v10 M12 16l-4-2 M12 18l4-2", // a flor
  ojala: "M8 3l-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 0 1-8 0z", // a camisa
  nectar: "M14 3l5 5 M16.5 5.5l-6 6 M8.5 10.5a4.5 4.5 0 1 0 5 5 4.5 4.5 0 0 0-5-5z", // o violão
}
// a última missão que o anel já mostrou (entre montagens da Corrida: sair de
// uma sala não reabre). undefined = ainda não viu nenhuma (abrir o jogo com a
// missão já pegada não abre; só pegar uma nova)
let jaMostrou: string | null | undefined
// no anel, os nomes longos ficam curtos (o texto inteiro passa pelo notch)
const CURTO = 16
const curto = (t: string, n = CURTO) => {
  if (t.length <= n) return t
  const c = t.slice(0, n), sp = c.lastIndexOf(" ")
  return `${(sp > n * 0.5 ? c.slice(0, sp) : c).replace(/[\s·,:]+$/, "")}…`
}
const calmo = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
// o que a bolinha faz num toque: com a missão recolhida, abre a checklist (true); senão, nada (false: abre o mapa)
export type AnelApi = { toque: () => boolean }
export function HoloAnel({ missao, checklist, onMissoes, api }: { missao: { texto: string; cor: string; n: number } | null; checklist?: ChecklistHolo | null; onMissoes: () => void; api?: React.MutableRefObject<AnelApi | null> }) {
  const [omni, setOmni] = useState<"abre" | "recolhe" | null>(null)
  const chave = checklist?.chave ?? null
  useEffect(() => {
    const antes = jaMostrou
    jaMostrou = chave
    if (!chave) { setOmni(null); return }
    if (antes === undefined || antes === chave) return
    setOmni("abre")
  }, [chave])
  useEffect(() => {
    if (omni === "abre") { const t = setTimeout(() => setOmni("recolhe"), OMNI_MS); return () => clearTimeout(t) }
    if (omni === "recolhe") { const t = setTimeout(() => setOmni(null), calmo() ? 0 : RECOLHE_MS); return () => clearTimeout(t) }
  }, [omni])
  const aberto = !!checklist && omni === "abre"
  // (LU2CA 22/10 (2)) o texto completo passa pelo notch: o passo de agora quando
  // a missão é pegada ou a checklist abre, e cada passo cumprido
  const antes = useRef<{ chave: string | null; estados: Map<string, string> } | null>(null)
  useEffect(() => {
    const est = new Map((checklist?.passos ?? []).map((p) => [p.nome, p.estado]))
    const a = antes.current
    antes.current = { chave, estados: est }
    if (!a || !checklist) return
    const cor = checklist.cor
    if (a.chave !== chave) { const ag = checklist.passos.find((p) => p.estado === "agora"); notch(`${checklist.titulo} · ▸ ${ag?.nome ?? checklist.nome}`, cor); return }
    for (const p of checklist.passos) {
      const e0 = a.estados.get(p.nome)
      if (p.estado === "feita" && e0 !== "feita") notch(`✓ ${p.nome}`, cor)
      else if (p.estado === "agora" && e0 !== "agora") notch(`▸ ${p.nome}`, cor)
    }
  }, [checklist, chave])
  useEffect(() => {
    if (!api) return
    api.current = { toque: () => {
      if (!checklist || aberto) return false
      setOmni("abre")
      const ag = checklist.passos.find((p) => p.estado === "agora")
      if (ag && ag.nome.length > CURTO) notch(`▸ ${ag.nome}`, checklist.cor)
      return true
    } }
    return () => { api.current = null }
  }, [api, checklist, aberto])
  // o texto: com missão, só o nome dela (LU2CA 22/10 (3): aberta, o anel só gira o
  // texto que já estava nele; a checklist mora na salsicha); sem, o que o jogo diz
  const txt = aberto
    ? curto(checklist!.nome, 22)
    : checklist ? curto(checklist.nome, 22) : !missao ? "" : missao.texto ? missao.texto : `${missao.n} ${missao.n === 1 ? "missão" : "missões"}`
  // a borda tem a cor da missão pegada
  const cor = checklist?.cor ?? missao?.cor ?? "#2fe8ff"
  // o texto se repete pra dar a volta inteira (a checklist dá uma volta só)
  const volta = !txt ? "" : Array.from({ length: Math.max(1, Math.floor(120 / (txt.length + 5))) }, () => `${txt.toUpperCase()}  ◆  `).join("")
  const icone = checklist ? ICONE_MISSAO[checklist.chave] : null
  return (
    <div className={`l-holo-anel ${txt ? "" : "is-vazio"} ${checklist ? "is-missao" : ""} ${omni ? `is-omni is-${omni}` : ""}`} style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      {/* (LU2CA 22/10 (3)) a SALSICHA: o círculo fica do tamanho da bolinha e a borda
          estica pra baixo numa cápsula; a checklist mora dentro, no fundo da cor da missão */}
      {checklist && omni && (
        <div className="l-holo-salsicha" aria-hidden="true">
          <i className="l-holo-salsicha-topo" />
          {/* (T42, J2:32) só o próximo passo (não todos de uma vez) */}
          <ol>
            {(() => {
              const i = checklist.passos.findIndex((p) => p.estado === "agora"), k = i >= 0 ? i : checklist.passos.findIndex((p) => p.estado !== "feita")
              const p = checklist.passos[k]
              return p
                ? <li key={p.nome} className={`is-${p.estado}`}><b>▸</b>{p.nome}<small className="l-salsicha-n">{k + 1} de {checklist.passos.length}</small></li>
                : <li className="is-feita"><b>✓</b>tudo feito</li>
            })()}
          </ol>
        </div>
      )}
      <button type="button" className="l-holo-anel-bt" data-info="anel" onClick={() => { if (!api?.current?.toque()) onMissoes() }} aria-label={aberto ? `${checklist!.titulo}: ${checklist!.passos.map((p) => `${p.estado === "feita" ? "feito" : p.estado === "agora" ? "agora" : "depois"}: ${p.nome}`).join("; ")}` : txt || "missões"} aria-expanded={aberto}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <defs><path id="l-holo-anel-p" d="M80,80 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" /></defs>
          {/* o fundo da missão: um aro na cor dela atrás do texto */}
          {checklist && <circle className="l-holo-anel-fundo" cx="80" cy="80" r="70" />}
          <circle cx="80" cy="80" r="76" />
          <g className="l-holo-anel-gira">
            <text><textPath href="#l-holo-anel-p" textLength="438" lengthAdjust="spacingAndGlyphs">{volta}</textPath></text>
          </g>
          {icone && (
            <g className="l-holo-anel-ic" transform="translate(9 9)">
              <circle cx="12" cy="12" r="15" />
              <path d={icone} />
            </g>
          )}
        </svg>
      </button>
    </div>
  )
}

// a MPC do B4TIDA: 16 pads tocando um padrão (bumbo, caixa, chimbal, o synth)
const PADRAO = [0, 4, 8, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]
function MiniMpc() {
  return (
    <span className="l-mini-mpc" aria-hidden="true">
      {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ ["--d" as string]: `${(PADRAO.indexOf(i) / 16) * 2.4}s`, ["--h" as string]: `${(i % 4) * 30}deg` }} />)}
    </span>
  )
}
// o GUITAR DRIVER em miniatura: a trilha em perspectiva e as notas descendo
// pras 5 casas lá embaixo (o jeito do jogo)
const NOTAS = [[0, 0], [2, 0.35], [4, 0.7], [1, 1.05], [3, 1.4], [0, 1.75], [2, 2.1], [4, 2.45], [3, 2.8], [1, 3.15]]
function MiniTrilha() {
  return (
    <span className="l-mini-trilha" aria-hidden="true">
      <span className="is-pista">
        {[0, 1, 2, 3, 4].map((c) => <i key={c} className="is-corda" style={{ ["--c" as string]: c }} />)}
        {NOTAS.map(([c, d], k) => <i key={k} className="is-nota" style={{ ["--c" as string]: c, ["--d" as string]: `${d}s` }} />)}
        <span className="is-casas">{[0, 1, 2, 3, 4].map((c) => <i key={c} style={{ ["--c" as string]: c }} />)}</span>
      </span>
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
// o ACC3SS: a fechadura que lê e abre (a varredura e o "acesso" piscando)
function MiniAcesso() {
  return (
    <span className="l-mini-acesso" aria-hidden="true">
      <svg viewBox="0 0 40 40"><rect x="9" y="18" width="22" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2.4" /><path className="is-arco" d="M14 18v-5a6 6 0 0 1 12 0v5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /><circle cx="20" cy="25" r="2.2" fill="currentColor" /><path d="M20 27v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      <i className="is-varre" />
      <b>ACESSO</b>
    </span>
  )
}
// o _IRIS.EXE: o olho piscando no meio de uma grade de fotos que acende uma a uma
function MiniIris() {
  return (
    <span className="l-mini-iris" aria-hidden="true">
      <span className="is-grade">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ ["--d" as string]: `${(i * 0.37) % 2.4}s`, ["--h" as string]: `${i * 40}deg` }} />)}</span>
      <span className="is-olho"><i /></span>
    </span>
  )
}
// o FR3Q_: as capas dos projetos salvos no untitled passando, na ordem da
// página dele (LU2CA 20/10, os prints: public/capas/untitled, 192×144)
const CAPAS = [
  { nome: "cidade neon vol.1", img: "/capas/untitled/cidade-neon-vol1.jpg" },
  { nome: "cidade neon vol.2", img: "/capas/untitled/cidade-neon-vol2.jpg" },
  { nome: "CIDADE NEON", img: "/capas/untitled/cidade-neon.jpg" },
  { nome: "cidadeneon.live", img: "/capas/untitled/cidadeneon-live.jpg" },
  { nome: "SUBÚRBIO XENOM", img: "/capas/untitled/suburbio-xenom.jpg" },
  { nome: "cidadeneon.crypto", img: "/capas/untitled/cidadeneon-crypto.jpg" },
]
function MiniFreq() {
  return (
    <span className="l-mini-freq" aria-hidden="true">
      <span className="is-fila">
        {[...CAPAS, ...CAPAS.slice(0, 3)].map((c, i) => (
          <span key={i} className="is-capa" style={{ backgroundImage: `url(${c.img})` }} title={c.nome} />
        ))}
      </span>
      <span className="is-eq">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ ["--d" as string]: `${(i * 0.13) % 0.5}s` }} />)}</span>
    </span>
  )
}
// o STR34M: um clipe rodando (a tela com as faixas de luz e a barra do vídeo)
function MiniStream() {
  return (
    <span className="l-mini-stream" aria-hidden="true">
      <span className="is-tela"><i /><i /><i /></span>
      <span className="is-play" />
      <span className="is-barra"><i /></span>
    </span>
  )
}

// embaixo, à esquerda: as PROPAGANDAS do próprio holo (LU2CA 20/10), uma de
// cada vez (troca a cada 6 s), cada uma imitando o app
const VEZ: AppId[] = ["access", "iris", "freq", "stream", "ouvir"]
const MINI: Partial<Record<AppId, () => React.ReactElement>> = { access: MiniAcesso, iris: MiniIris, freq: MiniFreq, stream: MiniStream, ouvir: MiniFone }
export function HoloApps({ onApp }: { onApp: (id: AppId) => void }) {
  const [k, setK] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % VEZ.length), 6000); return () => clearInterval(t) }, [])
  const a = APPS.find((x) => x.id === VEZ[k])!
  const Mini = MINI[a.id]!
  // (LU2CA 20/10) o STR34M agora é o vid.stream
  const nome = a.id === "stream" ? "vid.stream" : a.nome
  return (
    <button type="button" key={a.id} className={`l-holo-apps is-${a.id}`} data-info={`app:${a.id}`} style={{ ["--cor" as string]: a.cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => onApp(a.id)}>
      <span className="l-holo-apps-tela"><Mini /></span>
      <span className="l-holo-apps-rodape">
        <b>{nome}</b>
        <span className="l-holo-apps-pips">{VEZ.map((v, i) => <i key={v} className={i === k ? "is-on" : ""} />)}</span>
      </span>
    </button>
  )
}

// o DESTAQUE (LU2CA 20/10): o B4TIDA e o GUITAR DRIVER se revezando, maiores,
// com cara de holograma. O B4TIDA é só os quadrados da MPC tocando o padrão
// (tocou, abre o criador de beats); o GUITAR DRIVER fica trancado até o fim da
// carreira (B13), mas mostrando a trilha: "tudo é sobre ele"
const DESTAQUE: AppId[] = ["batida", "guitar"]
export function HoloDestaque({ onApp, guitarLivre = false }: { onApp: (id: AppId) => void; guitarLivre?: boolean }) {
  const [k, setK] = useState(0)
  const [nega, setNega] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % DESTAQUE.length), 7000); return () => clearInterval(t) }, [])
  const a = APPS.find((x) => x.id === DESTAQUE[k])!
  const tranca = a.id === "guitar" && !guitarLivre
  return (
    <button type="button" key={`${a.id}:${nega}`} className={`l-holo-destaque is-${a.id} ${tranca ? "is-tranca" : ""} ${nega ? "is-nega" : ""}`} data-info={`app:${a.id}`} style={{ ["--cor" as string]: a.cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => (tranca ? setNega((n) => n + 1) : onApp(a.id))} aria-label={tranca ? `${a.nome} (trancado)` : a.nome}>
      <span className="l-holo-destaque-tela">{a.id === "batida" ? <MiniMpc /> : <MiniTrilha />}</span>
      <span className="l-holo-destaque-rodape">
        <b>{a.nome}</b>
        {tranca && <svg className="l-holo-destaque-cadeado" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
        <span className="l-holo-apps-pips">{DESTAQUE.map((v, i) => <i key={v} className={i === k ? "is-on" : ""} />)}</span>
      </span>
    </button>
  )
}

// o "?": ligado, tocar em qualquer coisa do holo (o que tem data-info) mostra
// o que ela é, em vez de fazer a ação; tocar fora, ou no "?", sai.
// ── (T41 B3, dono 29/10) A EXPLICAÇÃO POR CIMA DO ITEM: nada de balão preto do
// Nexo nem de cartão no meio da tela. Tocou numa coisa, a explicação aparece
// colada nela, como realidade aumentada do holo: um cantoneiro em volta da
// coisa e um texto curto, transparente, ao lado (embaixo dela se ela está em
// cima da tela, em cima se está embaixo). Não pega toque (pointer-events: none)
// e nunca vai pro meio da tela: a navegação fica livre. Desempenho: uma medida
// (getBoundingClientRect) por toque, nada por quadro ──
type Explica = { t: string; d: string; x: number; y: number; w: number; h: number; cor: string; id: number }
const EXPLICA_CSS = `
.l-explica-alvo { position: fixed; z-index: 90; pointer-events: none; border-radius: 6px; --c: #2fe8ff;
  background:
    linear-gradient(var(--c), var(--c)) top left / 10px 1.5px no-repeat, linear-gradient(var(--c), var(--c)) top left / 1.5px 10px no-repeat,
    linear-gradient(var(--c), var(--c)) top right / 10px 1.5px no-repeat, linear-gradient(var(--c), var(--c)) top right / 1.5px 10px no-repeat,
    linear-gradient(var(--c), var(--c)) bottom left / 10px 1.5px no-repeat, linear-gradient(var(--c), var(--c)) bottom left / 1.5px 10px no-repeat,
    linear-gradient(var(--c), var(--c)) bottom right / 10px 1.5px no-repeat, linear-gradient(var(--c), var(--c)) bottom right / 1.5px 10px no-repeat;
  filter: drop-shadow(0 0 4px var(--c)); animation: l-explica-alvo 0.28s cubic-bezier(0.2, 1.2, 0.3, 1) both; }
.l-explica { position: fixed; z-index: 91; pointer-events: none; width: max-content; max-width: min(260px, calc(100vw - 32px)); padding: 7px 10px 8px;
  border-left: 1.5px solid var(--c); background: linear-gradient(90deg, color-mix(in srgb, var(--c) 16%, transparent), transparent 85%);
  color: #e6fdff; font: 500 12px/1.4 system-ui, sans-serif; text-shadow: 0 0 6px rgba(0, 0, 0, 0.9), 0 0 2px rgba(0, 0, 0, 0.9);
  animation: l-explica-entra 0.3s cubic-bezier(0.2, 0.9, 0.3, 1) both; }
.l-explica b { display: block; margin-bottom: 2px; font: 800 9.5px var(--font-geist-mono), ui-monospace, monospace; letter-spacing: 0.16em; text-transform: uppercase; color: var(--c); text-shadow: 0 0 6px var(--c); }
@keyframes l-explica-alvo { from { opacity: 0; transform: scale(1.15); } }
@keyframes l-explica-entra { from { opacity: 0; clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@media (prefers-reduced-motion: reduce) { .l-explica, .l-explica-alvo { animation: none; } }
`
const GUTTER = 16
function ExplicaPorCima({ e }: { e: Explica }) {
  const vw = window.innerWidth, vh = window.innerHeight
  const embaixo = e.y + e.h / 2 < vh / 2
  const larg = Math.min(260, vw - GUTTER * 2)
  const left = Math.max(GUTTER, Math.min(vw - GUTTER - larg, e.x))
  const pos: React.CSSProperties = embaixo ? { top: Math.min(vh - GUTTER - 60, e.y + e.h + 8), left } : { bottom: Math.max(GUTTER, vh - e.y + 8), left }
  return createPortal(
    <>
      <style>{EXPLICA_CSS}</style>
      <div key={`a${e.id}`} className="l-explica-alvo" style={{ left: e.x - 4, top: e.y - 4, width: e.w + 8, height: e.h + 8, ["--c" as string]: e.cor }} aria-hidden="true" />
      <div key={`t${e.id}`} className="l-explica" style={{ ...pos, ["--c" as string]: e.cor }} role="status" aria-live="polite">
        <b>{e.t}</b>
        {e.d}
      </div>
    </>,
    document.body,
  )
}
export function HoloAjuda({ ativa, onSair }: { ativa: boolean; onSair: () => void }) {
  const [exp, setExp] = useState<Explica | null>(null)
  const n = useRef(0)
  useEffect(() => {
    if (!ativa) { setExp(null); return }
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
      const info = infoDe(id)
      if (!info) { setExp(null); return }
      const r = el.getBoundingClientRect()
      const cor = getComputedStyle(el).getPropertyValue("--cor").trim() || "#2fe8ff"
      setExp({ ...info, x: r.left, y: r.top, w: r.width, h: r.height, cor, id: ++n.current })
    }
    document.addEventListener("pointerdown", desce, true)
    document.addEventListener("click", toca, true)
    return () => { document.removeEventListener("pointerdown", desce, true); document.removeEventListener("click", toca, true) }
  }, [ativa, onSair])
  return ativa && exp ? <ExplicaPorCima e={exp} /> : null
}

// (LU2CA 22/10) a lista inteira dos controles NUNCA vai por cima do HUD: é o
// conteúdo da página de ajustes (a engrenagem, HoloAjustes logo abaixo)
const CONTROLES: { t: string; itens: [string, string][] }[] = [
  { t: "dirigir", itens: [["toque", "um lado da tela vira pra ele; os dois lados juntos freiam (parado, dá ré)"], ["teclado", "← → ou A D viram · ↑ ou W acelera · ↓ ou S freia e dá ré · Q é a manobra"], ["pular", "toque duplo, ou espaço duas vezes"]] },
  { t: "turbo e propulsor", itens: [["turbo", "segura o botão um instante (no teclado, um toque no espaço ou shift). drift, manobras e voos enchem a barra"], ["propulsor", "segura o botão: a Kombi voa (no teclado, segura o espaço). a energia volta andando no chão"], ["no ar", "um lado gira; os dois juntos dão o mortal. no voo, o mapa aparece no meio da tela"]] },
  { t: "o holo", itens: [["óculos", "liga e desliga o holo (tecla H). desligado, fica só a estrada"], ["o olho", "o olhinho em cima do óculos troca a câmera: de fora ou de dentro da Kombi (tecla C)"], ["engrenagem", "os ajustes: volume, gráficos e esta lista"], ["sair da Kombi", "desce de patins; perto dela, volta (tecla F)"], ["widgets", "no celular moram na ilha de baixo: toca pra abrir"]] },
  { t: "rádio", itens: [["holograma", "toca nele: o menu da rádio (ligar, sintonizar as frequências achadas, as mensagens piratas)"], ["⏭", "troca a faixa"]] },
  { t: "missões e mapa", itens: [["o anel", "gira em volta do mapa com a missão de agora. toca nele, ou no mapa: abre o mapa com as missões"], ["no mapa", "cada ícone é uma missão: toca pra ver e pegar. tocar num lugar marca o caminho"], ["aceitou", "o anel abre com a checklist e depois volta a ser borda"]] },
  { t: "água", itens: [["gotas", "as gotas da pista viram água: rega as flores, paga a oficina; 100 gotas, duas viagens rápidas"]] },
]
export function AjudaControles() {
  return (
    <div className="l-ajuda-controles" aria-label="os controles">
      {CONTROLES.map((g) => (
        <section key={g.t}>
          <small>{g.t}</small>
          <dl>{g.itens.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      ))}
    </div>
  )
}

// ── (LU2CA 22/10 (2)) A ENGRENAGEM: a página de ajustes DE VERDADE, numa janela
// do holo (o mesmo vidro do visualizador). O som mexe nos ganhos do grafo
// (som.ts, "cn-volumes"); a qualidade é o nível que o jogo já mede
// (qualidade.ts, "cn-qualidade": densidade de pixels, lente, gotas, carros) e
// vale na hora; e a lista dos controles. Fechar (×, Esc, tocar fora) volta pro jogo ──
// (T40b) a mesa de mixagem: o volume geral e os 4 canais
const CANAIS: { k: CanalVolume; t: string; d: string }[] = [
  { k: "geral", t: "geral", d: "tudo junto" },
  { k: "musica", t: "música", d: "rádio, toca-discos, a pista, a missão" },
  { k: "ambiente", t: "ambiente", d: "vento, chuva" },
  { k: "efeitos", t: "efeitos", d: "motor, patins, notas, chiados" },
  { k: "vozes", t: "vozes", d: "notas de voz, ligações" },
]
const LENTE = ["sem lente", "lente leve", "lente cheia"]
export function HoloAjustes({ qual, onQual, onFechar }: { qual: NivelQualidade; onQual: (n: NivelQualidade) => void; onFechar: () => void }) {
  const [vol, setVol] = useState(() => ({ ...VOLUMES }))
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar() }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [onFechar])
  const mexer = (k: CanalVolume, v: number) => { definirVolume(k, v); setVol((o) => ({ ...o, [k]: v })) }
  return (
    <div className="l-visor l-ajustes" style={{ ["--cor" as string]: "#2fe8ff" }} onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onFechar() }} onKeyDown={(e) => { if (e.key !== "Escape") e.stopPropagation() }} role="dialog" aria-modal="true" aria-label="ajustes">
      <div className="l-visor-janela">
        <header>
          <b>ajustes</b>
          <button type="button" onClick={onFechar} aria-label="fechar e voltar pro jogo">×</button>
        </header>
        <div className="l-ajustes-corpo">
          <section>
            <small>som</small>
            {CANAIS.map((c) => (
              <label key={c.k} className="l-ajustes-vol">
                <span><b>{c.t}</b><em>{c.d}</em></span>
                <input type="range" min={0} max={100} step={5} value={Math.round(vol[c.k] * 100)} onChange={(e) => mexer(c.k, Number(e.target.value) / 100)} style={{ ["--v" as string]: `${vol[c.k] * 100}%` }} aria-label={`volume: ${c.t}`} />
                <i>{Math.round(vol[c.k] * 100)}</i>
              </label>
            ))}
          </section>
          <section>
            <small>gráficos</small>
            <div className="l-ajustes-qual" role="radiogroup" aria-label="qualidade dos gráficos">
              {(["alto", "medio", "baixo"] as const).map((n) => (
                <button key={n} type="button" role="radio" aria-checked={qual === n} className={qual === n ? "is-on" : ""} onClick={() => onQual(n)}>
                  <b>{NOME_NIVEL[n]}</b>
                  <em>densidade até {String(NIVEIS[n].dprMax).replace(".", ",")}x · {LENTE[NIVEIS[n].lente]}</em>
                </button>
              ))}
            </div>
          </section>
          <section>
            <small>controles</small>
            <AjudaControles />
          </section>
        </div>
      </div>
    </div>
  )
}

// ── (LU2CA 21/10) NO CELULAR, OS WIDGETS NUMA ILHA SÓ, no canto de baixo à
// esquerda, "pra não poluir a tela toda" (no computador nada muda). Fechada:
// um widget de cada vez, revezando (os pontinhos). Tocou: abre a lista (a
// rádio inteira com o menu dela, o destaque, as propagandas, os apps); tocar
// fora fecha ──
type CartaoIlha = "radio" | "destaque" | "propaganda" | "clima"
const CARTOES: CartaoIlha[] = ["radio", "destaque", "propaganda", "clima"]
export function HoloIlha({ radio, onLigar, onProxima, onSintonizar, ler, onApp, guitarLivre = false }: { radio: Radio; onLigar: () => void; onProxima: () => void; onSintonizar: (id: FreqId) => void; ler: () => Clima; onApp: (id: AppId) => void; guitarLivre?: boolean }) {
  const [k, setK] = useState(0)
  const [aberta, setAberta] = useState(false)
  const [c, setC] = useState<Clima>(() => ler())
  const aviso = useAvisoRadio()
  useEffect(() => { const t = setInterval(() => { setK((x) => (x + 1) % CARTOES.length); setC(ler()) }, 5000); return () => clearInterval(t) }, [ler])
  const [kp, setKp] = useState(0)
  useEffect(() => { const t = setInterval(() => setKp((x) => (x + 1) % VEZ.length), 5000); return () => clearInterval(t) }, [])
  const prop = APPS.find((x) => x.id === VEZ[kp])!
  const Mini = MINI[prop.id]!
  // um aviso da rádio chegando: a ilha mostra a rádio com ele
  const vez = aviso ? "radio" : CARTOES[k]
  const destaque = k % 2 ? "guitar" : "batida"
  const abrir = (id: AppId) => { setAberta(false); if (id === "guitar" && !guitarLivre) return; onApp(id) }
  const temp = Math.round(c.deserto ? 23 + 15 * Math.sin(((c.hora - 9) / 24) * Math.PI * 2) : 21 + 6 * Math.sin(((c.hora - 9) / 24) * Math.PI * 2) - (c.chove ? 4 : 0))
  return (
    <>
      {aberta && <div className="l-ilha-holo-fundo" onPointerDown={(e) => { e.stopPropagation(); setAberta(false) }} />}
      {aberta ? (
        <div className="l-ilha-holo is-aberta" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="os widgets do holo">
          <HoloSom radio={radio} onLigar={onLigar} onProxima={onProxima} onSintonizar={onSintonizar} />
          <div className="l-ilha-holo-grade">
            <button type="button" className="is-grande" style={{ ["--cor" as string]: "#ff6b6b" }} onClick={() => abrir("batida")}><span className="l-ilha-holo-mini"><MiniMpc /></span><b>B4TIDA</b></button>
            <button type="button" className={`is-grande ${guitarLivre ? "" : "is-tranca"}`} style={{ ["--cor" as string]: "#ff9000" }} onClick={() => abrir("guitar")}><span className="l-ilha-holo-mini"><MiniTrilha /></span><b>GUITAR DRIVER{guitarLivre ? "" : " 🔒"}</b></button>
            {VEZ.map((id) => { const a = APPS.find((x) => x.id === id)!; return <button key={id} type="button" style={{ ["--cor" as string]: a.cor }} onClick={() => abrir(id)}><Glifo id={a.id} cor={a.cor} size={18} /><b>{id === "stream" ? "vid.stream" : a.nome}</b></button> })}
            {iconesHolo().map((a) => <button key={a.id} type="button" style={{ ["--cor" as string]: a.cor }} onClick={() => abrir(a.id)}><Glifo id={a.id} cor={a.cor} size={18} /><b>{a.nome}</b></button>)}
          </div>
          <p className="l-ilha-holo-clima">{temp}° · {c.deserto ? "seco" : c.chove ? "chuva" : c.hora >= 19 || c.hora < 6 ? "céu aberto" : "nublado"} · {c.regiao}</p>
        </div>
      ) : (
        <button type="button" className={`l-ilha-holo is-${vez}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setAberta(true)} aria-label="abrir os widgets do holo" style={{ ["--cor" as string]: vez === "radio" ? radio.cor : vez === "propaganda" ? prop.cor : vez === "destaque" ? (destaque === "batida" ? "#ff6b6b" : "#ff9000") : "#2fe8ff" }}>
          <span className="l-ilha-holo-tela">
            {vez === "radio" && (aviso
              ? <span className="l-ilha-holo-radio is-aviso"><b>{aviso.de}</b><small key={aviso.id} className="l-holo-radio-aviso"><em style={{ ["--dur" as string]: `${Math.max(5, aviso.texto.length * 0.16)}s` }}>{aviso.texto}</em></small></span>
              : <span className="l-ilha-holo-radio"><b>{radio.freq}</b><small>{radio.ligada ? radio.faixa : "rádio desligada"}</small></span>)}
            {vez === "destaque" && (destaque === "batida" ? <MiniMpc /> : <MiniTrilha />)}
            {vez === "propaganda" && <Mini />}
            {vez === "clima" && <span className="l-ilha-holo-radio"><b>{temp}°</b><small>{c.regiao}</small></span>}
          </span>
          <span className="l-ilha-holo-rodape">
            <b>{vez === "radio" ? "rádio 222" : vez === "destaque" ? (destaque === "batida" ? "B4TIDA" : "GUITAR DRIVER") : vez === "propaganda" ? (prop.id === "stream" ? "vid.stream" : prop.nome) : "clima"}</b>
            <span className="l-holo-apps-pips">{CARTOES.map((x, i) => <i key={x} className={i === k ? "is-on" : ""} />)}</span>
          </span>
        </button>
      )}
    </>
  )
}

// (só pros prints e testes, com ?teste-holo na URL) o aviso da rádio e o notch na mão
if (typeof window !== "undefined" && location.search.includes("teste-holo")) {
  (window as unknown as { __holo: unknown }).__holo = { avisarRadio, notch }
}
