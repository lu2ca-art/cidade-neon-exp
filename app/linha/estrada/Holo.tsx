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

import { useEffect, useMemo, useRef, useState } from "react"
import { APPS, DOCK, ESCONDIDOS, Glifo, chamados, type AppId } from "../os"
import { horaTexto } from "../relogio"
import { ondaMusica, pistaSom } from "../som"
import type { Save } from "../estado"
import { PISTAS } from "./pistas"
import { FREQUENCIAS, type FreqId } from "../radio"

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`

// o que cada coisa do holo é (o "?"): uma frase simples, sem manual
export const INFO: Record<string, { t: string; d: string }> = {
  ajuda: { t: "?", d: "a ajuda: todos os controles. com ela aberta, toca numa coisa do holo pra saber o que é." },
  desligar: { t: "o holo", d: "o óculos liga e desliga o holo. desligado, some tudo: fica só a estrada (tecla H)." },
  camera: { t: "câmera", d: "de fora da Kombi ou de dentro, no banco do motorista (tecla C)." },
  radio: { t: "rádio 222", d: "a rádio pirata da cidade. toca no holograma: abre o menu da rádio (ligar, sintonizar as frequências que você já achou, e as mensagens das rádios piratas). ⏭ troca a faixa." },
  destaque: { t: "B4TIDA · GUITAR DRIVER", d: "os dois que importam. o B4TIDA toca o padrão aqui mesmo: toca nele e abre o criador de beats. o GUITAR DRIVER abre no fim da sua carreira." },
  "app:batida": { t: "B4TIDA", d: "a MPC: toca nos quadrados pra abrir o criador de beats e montar a sua música por camadas." },
  "app:guitar": { t: "GUITAR DRIVER", d: "o jogo das faixas ao vivo. por enquanto trancado: abre quando a sua carreira chegar lá." },
  "app:stream": { t: "vid.stream", d: "os clipes. abre aqui mesmo, no holo: a música da cidade para enquanto ele tá aberto." },
  propaganda: { t: "o que o holo faz", d: "o próprio aparelho mostrando o que tem dentro: ACC3SS, _IRIS.EXE, FR3Q_, vid.stream e OUVIR, um de cada vez. toca pra abrir o da vez, aqui mesmo, no holo." },
  faixa: { t: "a faixa da pista", d: "cada pista é uma música do Vol.1: com a Kombi rodando nela, o disco gira." },
  ilha: { t: "N3XO_", d: "as mensagens da cidade passam aqui. toca pra abrir as conversas." },
  mapa: { t: "o mapa", d: "toca pra abrir. marcar um lugar já é aceitar: a rota acende e, chegando lá, você entra direto." },
  anel: { t: "as missões", d: "a missão que você está fazendo, ou quantas estão te esperando. toca pra ver todas." },
  clima: { t: "o clima", d: "o tempo de onde a Kombi está agora: cada lugar da cidade tem o seu. o deserto nunca chove." },
  agua: { t: "água", d: "a coisa mais valiosa num mundo seco. as gotas da pista viram água: rega as flores, paga a oficina, e a cada 100 gotas, duas viagens rápidas. a polícia leva 1/5 se te prender." },
  controles: { t: "os controles", d: "no celular: um lado da tela vira pra ele; os dois juntos freiam (parado, dá ré). no ar: um lado gira, os dois juntos dão o mortal. no teclado: ↓ freia, Q é a manobra." },
  turbo: { t: "turbo", d: "segura um instante: a Kombi dispara. o drift, as manobras e os voos enchem a barra (no teclado, um toque no espaço). de patins, no ar, é o dash." },
  propulsor: { t: "propulsor", d: "segura: a Kombi voa. de patins, é o jato de ar das costas. a energia volta andando no chão (no teclado, segura o espaço)." },
  sair: { t: "sair da Kombi", d: "desce de patins. a Kombi fica estacionada te esperando (tecla F)." },
}
const infoApp = (id: AppId) => { const a = APPS.find((x) => x.id === id); return a ? { t: a.nome, d: a.desc } : null }
export const infoDe = (chave: string) => INFO[chave] ?? (chave.startsWith("app:") ? infoApp(chave.slice(4) as AppId) : null) ?? null

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
    <div className={`l-holo-som ${radio.ligada ? "is-on" : ""} ${menu ? "is-menu" : ""}`} style={{ ["--cor" as string]: radio.cor }} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="l-holo-radio-holo" data-info="radio" onClick={alternarMenu} aria-label="o menu da rádio" aria-expanded={menu}>
        <canvas ref={tela} />
        {novas > 0 && !menu && <em className="l-holo-radio-novas">{novas}</em>}
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
          <small className="l-holo-radio-sub">piratas</small>
          <ul className="l-holo-radio-piratas">
            {PIRATAS.slice(0, piratas).reverse().map((m, i) => <li key={piratas - i} className={i < piratas - lidas ? "is-nova" : ""}><b>{m.de}</b><span>{m.texto}</span></li>)}
          </ul>
        </div>
      )}
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
// rádio, o N3XO, o destaque (B4TIDA, GUITAR DRIVER), as propagandas (ACC3SS,
// _IRIS.EXE, FR3Q_, STR34M, OUVIR); a Kombi, que é aqui; e a SINT0NIA, que
// virou o menu da rádio (LU2CA 20/10))
// (LU2CA 21/10) o app RÁDIO 222 e o [UNTITLED] morreram no disco: a rádio é o
// holograma (o menu dela) e o FR3Q_ faz o papel do untitled
const NO_WIDGET: AppId[] = ["kombi", "n3xo", "radio", "batida", "guitar", "ouvir", "sintonia", "access", "iris", "freq", "stream", "untitled"]
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

// ── (LU2CA 22/10, o Omnitrix, como o dono descreveu) O ANEL das missões gira
// em volta da bolinha (o mapa-mini). Pegou uma missão: o anel gira e expande
// (overshoot), a parte da missão ganha um fundo e a CHECKLIST passa a ser o
// texto girando em volta da bolinha, maior e mais clara. 6 s depois recolhe
// girando e fica só o NOME da missão e o ÍCONE especial dela. Tocar na bolinha
// (ou no anel) repete; tocar de novo com ele aberto abre o mapa. Desempenho: só
// CSS (keyframes), um setState por abrir/fechar, nada por quadro. "Reduzir
// movimento": troca sem giro nem escala ──
export type ChecklistHolo = { chave: string; cor: string; titulo: string; nome: string; passos: { nome: string; estado: string }[] }
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
  useEffect(() => {
    if (!api) return
    api.current = { toque: () => { if (!checklist || aberto) return false; setOmni("abre"); return true } }
    return () => { api.current = null }
  }, [api, checklist, aberto])
  // o texto: aberto, a checklist; com missão, só o nome dela; sem, o que o jogo diz
  const txt = aberto
    ? checklist!.passos.map((p) => `${p.estado === "feita" ? "✓" : p.estado === "agora" ? "▸" : "○"} ${p.nome}`).join("  ·  ")
    : checklist ? checklist.nome : !missao ? "" : missao.texto ? missao.texto : `${missao.n} ${missao.n === 1 ? "missão" : "missões"}`
  // a borda tem a cor da missão pegada
  const cor = checklist?.cor ?? missao?.cor ?? "#2fe8ff"
  // o texto se repete pra dar a volta inteira (a checklist dá uma volta só)
  const volta = !txt ? "" : aberto ? `${txt.toUpperCase()}  ◆  ` : Array.from({ length: Math.max(1, Math.floor(120 / (txt.length + 5))) }, () => `${txt.toUpperCase()}  ◆  `).join("")
  const icone = checklist ? ICONE_MISSAO[checklist.chave] : null
  return (
    <div className={`l-holo-anel ${txt ? "" : "is-vazio"} ${checklist ? "is-missao" : ""} ${omni ? `is-omni is-${omni}` : ""}`} style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="l-holo-anel-bt" data-info="anel" onClick={() => { if (!api?.current?.toque()) onMissoes() }} aria-label={aberto ? `${checklist!.titulo}: ${txt}` : txt || "missões"} aria-expanded={aberto}>
        <svg viewBox="0 0 160 160" aria-hidden="true">
          <defs><path id="l-holo-anel-p" d="M80,80 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0" /></defs>
          {/* o fundo da missão: um aro na cor dela atrás do texto */}
          {checklist && <circle className="l-holo-anel-fundo" cx="80" cy="80" r="70" />}
          <circle cx="80" cy="80" r="76" />
          <g className="l-holo-anel-gira">
            <text key={aberto ? "a" : "f"}><textPath href="#l-holo-anel-p" textLength="438" lengthAdjust="spacingAndGlyphs">{volta}</textPath></text>
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

// (LU2CA 22/10) o "?" é o ÚNICO lugar com texto explicando: abre a ajuda com
// todos os controles do jogo. Com ela aberta, tocar numa coisa do holo (o que
// tem data-info) diz o que ela é, em vez de fazer a ação; tocar fora, ou no
// "?", fecha
const CONTROLES: { t: string; itens: [string, string][] }[] = [
  { t: "dirigir", itens: [["toque", "um lado da tela vira pra ele; os dois lados juntos freiam (parado, dá ré)"], ["teclado", "← → ou A D viram · ↑ ou W acelera · ↓ ou S freia e dá ré · Q é a manobra"], ["pular", "toque duplo, ou espaço duas vezes"]] },
  { t: "turbo e propulsor", itens: [["turbo", "segura o botão um instante (no teclado, um toque no espaço ou shift). drift, manobras e voos enchem a barra"], ["propulsor", "segura o botão: a Kombi voa (no teclado, segura o espaço). a energia volta andando no chão"], ["no ar", "um lado gira; os dois juntos dão o mortal. no voo, o mapa aparece no meio da tela"]] },
  { t: "o holo", itens: [["óculos", "liga e desliga o holo (tecla H). desligado, fica só a estrada"], ["câmera", "de fora ou de dentro da Kombi (tecla C)"], ["sair da Kombi", "desce de patins; perto dela, volta (tecla F)"], ["widgets", "no celular moram na ilha de baixo: toca pra abrir"]] },
  { t: "rádio", itens: [["holograma", "toca nele: o menu da rádio (ligar, sintonizar as frequências achadas, as mensagens piratas)"], ["⏭", "troca a faixa"]] },
  { t: "missões e mapa", itens: [["o anel", "gira em volta do mapa com a missão de agora. toca nele, ou no mapa: abre o mapa com as missões"], ["no mapa", "cada ícone é uma missão: toca pra ver e pegar. tocar num lugar marca o caminho"], ["aceitou", "o anel abre com a checklist e depois volta a ser borda"]] },
  { t: "água", itens: [["gotas", "as gotas da pista viram água: rega as flores, paga a oficina; 100 gotas, duas viagens rápidas"]] },
]
export function HoloAjuda({ ativa, onSair }: { ativa: boolean; onSair: () => void }) {
  const [card, setCard] = useState<{ t: string; d: string } | null>(null)
  useEffect(() => {
    if (!ativa) return
    const alvo = (e: Event) => (e.target as Element | null)?.closest?.("[data-info]") as HTMLElement | null
    const dentro = (e: Event) => !!(e.target as Element | null)?.closest?.(".l-holo-ajuda")
    // (na captura, antes do React: a ação do botão não acontece)
    const desce = (e: PointerEvent) => {
      if (dentro(e)) return
      const el = alvo(e)
      if (!el) { onSair(); return }
      e.stopPropagation(); e.preventDefault()
    }
    const toca = (e: MouseEvent) => {
      if (dentro(e)) return
      const el = alvo(e)
      if (!el) return
      e.stopPropagation(); e.preventDefault()
      const id = el.dataset.info!
      if (id === "ajuda") { onSair(); return }
      setCard(infoDe(id))
    }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onSair() }
    document.addEventListener("pointerdown", desce, true)
    document.addEventListener("click", toca, true)
    window.addEventListener("keydown", esc)
    return () => { document.removeEventListener("pointerdown", desce, true); document.removeEventListener("click", toca, true); window.removeEventListener("keydown", esc) }
  }, [ativa, onSair])
  if (!ativa) return null
  return (
    <div className="l-holo-ajuda" role="dialog" aria-label="ajuda: os controles">
      <header><b>?</b><span>toca numa coisa do holo pra saber o que é</span><button type="button" onClick={onSair} aria-label="fechar a ajuda">×</button></header>
      {card && <p className="l-holo-ajuda-card" role="status" aria-live="polite"><b>{card.t}</b>{card.d}</p>}
      {CONTROLES.map((g) => (
        <section key={g.t}>
          <small>{g.t}</small>
          <dl>{g.itens.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </section>
      ))}
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
  useEffect(() => { const t = setInterval(() => { setK((x) => (x + 1) % CARTOES.length); setC(ler()) }, 5000); return () => clearInterval(t) }, [ler])
  const [kp, setKp] = useState(0)
  useEffect(() => { const t = setInterval(() => setKp((x) => (x + 1) % VEZ.length), 5000); return () => clearInterval(t) }, [])
  const prop = APPS.find((x) => x.id === VEZ[kp])!
  const Mini = MINI[prop.id]!
  const vez = CARTOES[k]
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
            {ICONES.map((a) => <button key={a.id} type="button" style={{ ["--cor" as string]: a.cor }} onClick={() => abrir(a.id)}><Glifo id={a.id} cor={a.cor} size={18} /><b>{a.nome}</b></button>)}
          </div>
          <p className="l-ilha-holo-clima">{temp}° · {c.deserto ? "seco" : c.chove ? "chuva" : c.hora >= 19 || c.hora < 6 ? "céu aberto" : "nublado"} · {c.regiao}</p>
        </div>
      ) : (
        <button type="button" className={`l-ilha-holo is-${vez}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => setAberta(true)} aria-label="abrir os widgets do holo" style={{ ["--cor" as string]: vez === "radio" ? radio.cor : vez === "propaganda" ? prop.cor : vez === "destaque" ? (destaque === "batida" ? "#ff6b6b" : "#ff9000") : "#2fe8ff" }}>
          <span className="l-ilha-holo-tela">
            {vez === "radio" && <span className="l-ilha-holo-radio"><b>{radio.freq}</b><small>{radio.ligada ? radio.faixa : "rádio desligada"}</small></span>}
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
