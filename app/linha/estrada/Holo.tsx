"use client"

// O HOLO (LU2CA 19/10, o óculos virou holovisor). Dois estados só: ligado, com
// tudo na tela; desligado, nada (só o óculos no canto, e o turbo e o propulsor,
// que ficam sempre). Ligado, o centro fica livre pra dirigir e o resto mora
// nas bordas:
//   - em cima, à esquerda: o "?" (no lugar do óculos), e a faixa e a rádio juntas
//   - em cima, no meio: a ilha fininha do N3XO, as mensagens passando como o
//     letreiro de um ônibus (HoloLetreiro, dentro da .l-ilha)
//   - em cima, à direita: o mapa, com o anel das missões girando em volta
//   - embaixo, à esquerda: o widget que vai trocando de app (B4TIDA, GUITAR
//     DRIVER, as plataformas)
//   - embaixo, à direita: o turbo e o propulsor (Corrida, .l-propulsao)
// Tudo é clicável. Nada de frase explicando: a explicação vem aos poucos nas
// invasões da rádio, e o "?" diz o que cada coisa é (toca no "?", depois na coisa)

import { useEffect, useMemo, useState } from "react"
import { APPS, Glifo, chamados, type AppId } from "../os"
import { horaTexto } from "../relogio"
import { pistaSom } from "../som"
import type { Save } from "../estado"
import { PISTAS } from "./pistas"

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// o que cada coisa do holo é (o "?"): uma frase simples, sem manual
export const INFO: Record<string, { t: string; d: string }> = {
  ajuda: { t: "?", d: "toca aqui e depois em qualquer coisa do holo pra saber o que é. toca de novo pra sair." },
  desligar: { t: "desligar o holo", d: "some tudo, fica só a estrada. o óculos no canto liga de novo (ou a tecla H)." },
  camera: { t: "câmera", d: "de fora da Kombi ou de dentro, no banco do motorista (tecla C)." },
  som: { t: "a faixa e a rádio", d: "cada pista é uma música do Vol.1: com a Kombi rodando nela, o disco gira. a 222 é a rádio pirata da cidade: liga e ela invade a música." },
  ilha: { t: "N3XO_", d: "as mensagens da cidade passam aqui. toca pra abrir as conversas." },
  mapa: { t: "o mapa", d: "toca pra abrir. marcar um lugar já é aceitar: a rota acende e, chegando lá, você entra direto." },
  anel: { t: "as missões", d: "a missão que você está fazendo, ou quantas estão te esperando. toca pra ver todas." },
  aneis: { t: "anéis", d: "cada anel da pista enche o turbo. a cada 100, duas viagens rápidas pelo mapa." },
  turbo: { t: "turbo", d: "segura um instante: a Kombi dispara. os anéis enchem a barra (no teclado, um toque no espaço)." },
  propulsor: { t: "propulsor", d: "segura: a Kombi voa. soltou, ela plana até uma pista. a energia volta andando no chão (no teclado, segura o espaço)." },
  sair: { t: "sair da Kombi", d: "desce de patins. a Kombi fica estacionada te esperando (tecla F)." },
}
const infoApp = (id: AppId) => { const a = APPS.find((x) => x.id === id); return a ? { t: a.nome, d: a.desc } : null }
export const infoDe = (chave: string) => (chave.startsWith("app:") ? infoApp(chave.slice(4) as AppId) : INFO[chave]) ?? null

type Radio = { ligada: boolean; freq: string; faixa: string; cor: string }

// em cima, à esquerda: a faixa da pista e a rádio, juntas
export function HoloSom({ radio, onRadio, onProxima }: { radio: Radio; onRadio: () => void; onProxima: () => void }) {
  const [som, setSom] = useState<{ faixa: string; t: number; dur: number } | null>(null)
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
  return (
    <div className="l-holo-som" data-info="som" style={{ ["--cor" as string]: radio.cor }} onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-holo-faixa">
        <i className={som ? "is-gira" : ""} />
        <b>{som ? som.faixa : "—"}</b>
        {som && <small>{mmss(som.t)}</small>}
      </div>
      {som && <div className="l-holo-barra"><div style={{ transform: `scaleX(${Math.min(1, som.t / Math.max(1, som.dur))})` }} /></div>}
      <div className={`l-holo-radio ${radio.ligada ? "is-on" : ""}`}>
        <button type="button" onClick={onRadio} aria-label={radio.ligada ? "desligar a rádio" : "ligar a rádio"}>
          <b>{radio.freq}</b><span>{radio.ligada ? radio.faixa : "fm"}</span>
        </button>
        {radio.ligada && <button type="button" className="is-prox" onClick={onProxima} aria-label="próxima faixa">⏭</button>}
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

// embaixo, à esquerda: o widget que vai trocando de app
const VEZ: AppId[] = ["batida", "guitar", "ouvir"]
export function HoloApps({ onApp }: { onApp: (id: AppId) => void }) {
  const [k, setK] = useState(0)
  useEffect(() => { const t = setInterval(() => setK((x) => (x + 1) % VEZ.length), 5000); return () => clearInterval(t) }, [])
  const a = APPS.find((x) => x.id === VEZ[k])!
  return (
    <button type="button" key={a.id} className="l-holo-apps" data-info={`app:${a.id}`} style={{ ["--cor" as string]: a.cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => onApp(a.id)}>
      <Glifo id={a.id} cor={a.cor} size={26} />
      <b>{a.nome}</b>
      <span className="l-holo-apps-pips">{VEZ.map((v, i) => <i key={v} className={i === k ? "is-on" : ""} />)}</span>
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
