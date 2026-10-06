"use client"

// O celular da Cidade Neon, redesenhado. É a essência da versão anterior —
// uma tela de apps onde tudo está a um toque, dá pra sair e voltar pra
// estrada quando quiser — com a identidade e os sistemas novos da Linha 222
// (níveis, personagens, objetos, rádio que destrava na estrada).
//
// Os apps grandes da versão anterior (B4TIDA, GUITAR DRIVER, loja de discos,
// museu…) abrem dentro do celular, numa janela. Quando eles tentam voltar
// pra home antiga ("/", que agora redireciona pra /linha, ou "/drive"), a
// janela fecha e você volta pra cá.

import { useEffect, useMemo, useRef, useState } from "react"
import { ESTACOES, NIVEIS, dataCurta, estacao as getEstacao, lancada, missao, type EstacaoId, type ProvaId } from "./data"
import { ECOS, ROTEIROS, VOZES, type ChatId } from "./roteiros"
import { sequencia, type Save } from "./estado"
import { FREQUENCIAS, freqsLiberadas } from "./radio"
import { Objeto } from "./objetos"
import { Prova } from "./provas"
import { JardimFundo } from "./recursos"
import { MEMORIAS, MISSOES, ativa, conhecidos, etapaDe, itensFaltando } from "./missoes"
import { player } from "./som"
import { track } from "@/lib/analytics"
import { PreSave, Plataformas } from "./plataformas"

export type AppId =
  | "kombi" | "n3xo" | "linha" | "radio" | "fliperama" | "objetos"
  | "nectar" | "batida" | "guitar" | "feelgood" | "sintonia" | "freq" | "loop" | "stream"
  | "loja" | "museu" | "galeria" | "salabranca" | "iris" | "untitled" | "access"
  | "jardim" | "violao" | "ouvir"

export interface AppDef {
  id: AppId
  nome: string
  cor: string
  rota?: string
  link?: string
  pagina: 0 | 1
  nivel?: number
  // recurso que uma missão libera: só abre com o objeto dessa estação
  precisa?: EstacaoId
  desc: string
}

export const APPS: AppDef[] = [
  { id: "kombi", nome: "KOMBI", cor: "#2fe8ff", pagina: 0, desc: "a estrada da cidade" },
  { id: "n3xo", nome: "N3XO_", cor: "#5dffa0", pagina: 0, desc: "conversas" },
  { id: "linha", nome: "LINHA 9", cor: "#ffc857", pagina: 0, desc: "as 9 estações" },
  { id: "radio", nome: "RÁDIO 222", cor: "#ff3fb0", pagina: 0, desc: "frequências" },
  { id: "fliperama", nome: "FLIPERAMA", cor: "#ff6a35", pagina: 0, desc: "todos os minigames" },
  { id: "objetos", nome: "OBJETOS", cor: "#b38cff", pagina: 0, desc: "o que você já juntou" },
  { id: "jardim", nome: "JARDIM", cor: "#5dffa0", pagina: 0, precisa: "chuva", desc: "rega e a página floresce" },
  { id: "violao", nome: "VIOLÃO", cor: "#b38cff", pagina: 0, precisa: "nectar", desc: "escalas, acordes e tocar junto" },
  { id: "ouvir", nome: "OUVIR", cor: "#1ed760", pagina: 0, desc: "as faixas lá fora: spotify, apple, youtube, deezer" },
  { id: "nectar", nome: "NECTAR", cor: "#67e8f9", rota: "/nectar", pagina: 0, desc: "qual é o seu nectar" },
  { id: "batida", nome: "B4TIDA", cor: "#ff6b6b", rota: "/batida", pagina: 0, desc: "monta sua música por camadas" },
  { id: "guitar", nome: "GUITAR DRIVER", cor: "#ff9000", rota: "/neon-tiles", pagina: 0, desc: "toca as 4 faixas" },
  { id: "sintonia", nome: "SINT0NIA", cor: "#00e5ff", rota: "/sintonizador", pagina: 0, desc: "sintonizador" },
  { id: "freq", nome: "FR3Q_", cor: "#00ff9c", rota: "/spotify/auto-chuva", pagina: 0, desc: "player" },
  { id: "loop", nome: "//LOOP", cor: "#ff2d78", rota: "/tiktok/feed", pagina: 0, desc: "vídeos curtos" },
  { id: "loja", nome: "LOJA DE DISCOS", cor: "#ffc857", pagina: 1, desc: "discos pra kombi, pagos em neon" },
  { id: "museu", nome: "MUSEU", cor: "#e9e3d5", rota: "/museu", pagina: 1, desc: "quem inspira" },
  { id: "galeria", nome: "GALERIA", cor: "#3d7bff", rota: "/galeria", pagina: 1, desc: "quadros" },
  { id: "stream", nome: "STR34M", cor: "#ff4040", rota: "/youtube/cidade-neon", pagina: 1, desc: "clipes" },
  { id: "feelgood", nome: "FEEL.GOOD", cor: "#6b9dff", rota: "/feel-good", pagina: 1, desc: "b-side" },
  { id: "iris", nome: "_IRIS.EXE", cor: "#c77dff", link: "https://www.instagram.com/lu2ca.art", pagina: 1, desc: "instagram" },
  { id: "untitled", nome: "[UNTITLED]", cor: "#8b5cf6", link: "https://untitled.stream/buy/project/E9hOiyu7mwDoijTgQ3cwQ", pagina: 1, desc: "o álbum inteiro" },
  { id: "access", nome: "ACC3SS", cor: "#38bdf8", link: "https://lu2ca-xlvdjou.gamma.site/", pagina: 1, desc: "acesso" },
  { id: "salabranca", nome: "SALA BRANCA", cor: "#f5f5ff", rota: "/final/sala-branca", pagina: 1, nivel: 4, desc: "o fim" },
]

export const DOCK: AppId[] = ["kombi", "n3xo", "linha", "radio"]
// fora do celular por enquanto (06/10, LU2CA): ficam no código, não aparecem
export const ESCONDIDOS: AppId[] = ["museu", "feelgood", "galeria", "salabranca", "jardim"]

export function Glifo({ id, cor, size = 26 }: { id: AppId; cor: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: cor, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  switch (id) {
    case "kombi": return <svg {...p}><path d="M4 16V8.5A3.5 3.5 0 0 1 7.5 5h9A3.5 3.5 0 0 1 20 8.5V16" /><path d="M3 16h18M4 11h16M9 5v6M15 5v6" /><circle cx="7.5" cy="17.5" r="1.6" /><circle cx="16.5" cy="17.5" r="1.6" /></svg>
    case "n3xo": return <svg {...p}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></svg>
    case "linha": return <svg {...p}><path d="M5 4v16" strokeWidth={2.4} /><circle cx="5" cy="6" r="2" fill={cor} /><circle cx="5" cy="12" r="2" /><circle cx="5" cy="18" r="2" /><path d="M10 6h9M10 12h7M10 18h5" /></svg>
    case "radio": return <svg {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M7 4l9 4" /><circle cx="15.5" cy="14" r="3" /><path d="M7 12v4" /></svg>
    case "fliperama": return <svg {...p}><rect x="3" y="7" width="18" height="11" rx="5" /><path d="M8 10.5v4M6 12.5h4" /><circle cx="15.5" cy="11.5" r=".9" fill={cor} /><circle cx="17.5" cy="13.8" r=".9" fill={cor} /></svg>
    case "objetos": return <svg {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" /></svg>
    case "nectar": return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" opacity=".5" /><path d="M10 15V9l4 6V9" /></svg>
    case "batida": return <svg {...p}><rect x="3" y="3" width="8" height="8" rx="2" fill={cor} /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" fill={cor} /></svg>
    case "guitar": return <Objeto id="violao" cor={cor} size={size} />
    case "sintonia": return <svg {...p}><rect x="2" y="10" width="20" height="4" rx="2" /><circle cx="15" cy="12" r="3" fill={cor} /><path d="M4 6v2M8 5v3M12 4v4M16 5v3M20 6v2" /></svg>
    case "freq": return <svg {...p}><path d="M2 12h4l2-7 4 14 3-10 2 3h5" /></svg>
    case "loop": return <svg {...p}><path d="M17 3l3 3-3 3" /><path d="M20 6H9a5 5 0 0 0 0 10h1" /><path d="M7 21l-3-3 3-3" /><path d="M4 18h11a5 5 0 0 0 0-10h-1" /></svg>
    case "stream": return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M10 9v6l5-3z" fill={cor} /></svg>
    case "loja": return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3a9 9 0 0 1 9 9" opacity=".5" /></svg>
    case "museu": return <svg {...p}><path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18" /></svg>
    case "galeria": return <svg {...p}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 16l5-5 4 4 3-3 6 6" /><circle cx="16" cy="8.5" r="1.5" /></svg>
    case "feelgood": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c.8 1.2 2.1 2 3.5 2s2.7-.8 3.5-2M9 10h.01M15 10h.01" /></svg>
    case "iris": return <svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
    case "untitled": return <svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="6" opacity=".4" /><circle cx="12" cy="12" r="2.2" fill={cor} /></svg>
    case "access": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>
    case "jardim": return <svg {...p}><path d="M12 21v-7" /><path d="M12 14c-3 0-5-2-5-5 3 0 5 2 5 5zM12 14c3 0 5-2 5-5-3 0-5 2-5 5z" /><circle cx="12" cy="6" r="2.4" fill={cor} /></svg>
    case "violao": return <Objeto id="violao" cor={cor} size={size} />
    case "ouvir": return <svg {...p}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" fill={cor} /><rect x="17" y="14" width="4" height="6" rx="1.5" fill={cor} /></svg>
    case "salabranca": return <svg {...p}><rect x="5" y="5" width="14" height="14" /><rect x="9" y="9" width="6" height="6" opacity=".5" /></svg>
  }
}

/* ─── missões: o que tá te chamando agora ──────────────── */
export interface Chamado {
  id: string
  de: string
  cor: string
  texto: string
  acao: { app: AppId } | { chat: ChatId }
}

// (06/10, LU2CA: nenhuma missão paga mais de 100 NEON — é o teto; a grana
// grande vem do GUITAR DRIVER subindo de nível, mais pra frente)
// Minigames da versão anterior contam pro jogo novo: completar dá luz e
// sinal (uma vez cada). Lido do mesmo localStorage que eles escrevem.
export const LEGADO = [
  { id: "c1", app: "nectar" as AppId, nome: "NECTAR", luz: 100, sinal: 6 },
  { id: "c2", app: "batida" as AppId, nome: "B4TIDA", luz: 100, sinal: 8 },
  { id: "c3", app: "guitar" as AppId, nome: "GUITAR DRIVER", luz: 100, sinal: 10 },
]

export function legadoFeito(): string[] {
  try {
    const raw = localStorage.getItem("cidade-neon-funnel-v3")
    if (!raw) return []
    const st = JSON.parse(raw) as { confirmations?: Record<string, { done?: boolean }> }
    return LEGADO.filter((l) => st.confirmations?.[l.id]?.done).map((l) => l.id)
  } catch {
    return []
  }
}

// A central mostra UMA coisa de cada vez: o próximo passo da missão que
// está valendo. O resto (minigames antigos, rádio) só aparece depois que a
// pessoa já fez a primeira missão — antes disso é ruído.
export function chamados(save: Save, nivel: number): Chamado[] {
  const out: Chamado[] = []
  const ecos = save.objetos.filter((o) => !save.ecosVistos.includes(o) && ECOS[o]).length
  if (ecos) out.push({ id: "ecos", de: "222", cor: "#2fe8ff", texto: `${ecos} ${ecos === 1 ? "mensagem nova" : "mensagens novas"} no grupo`, acao: { chat: "grupo" } })
  // a 222 caiu: nada importa mais do que religar
  if (save.nucleo.caido) out.push({ id: "antena", de: "D-Bee", cor: "#3d7bff", texto: "derrubaram a 222. religa a antena no centro, de kombi", acao: { app: "kombi" } })
  const a = save.nucleo.caido ? null : ativa(save, nivel)
  if (a) {
    const e = getEstacao(a)
    const m = MISSOES[a]!
    const et = etapaDe(save, a)
    if (et === "chamado") out.unshift({ id: `est-${a}`, de: e.personagem, cor: e.cor, texto: m.chamado, acao: { chat: a } })
    else if (et === "busca") {
      const f = itensFaltando(save, a)
      out.unshift({ id: `busca-${a}`, de: e.personagem, cor: e.cor, texto: `${m.tarefa}${(m.busca?.em.length ?? 1) > 1 ? ` · faltam ${f}` : ""}`, acao: { app: "kombi" } })
    } else if (et === "entrega") out.unshift({ id: `entrega-${a}`, de: e.personagem, cor: e.cor, texto: `leva ${m.busca?.nome ?? "a coisa"} na estação ${e.n}`, acao: { app: "kombi" } })
    else if (et === "pegar" || et === "lugar") out.unshift({ id: `lugar-${a}`, de: e.personagem, cor: e.cor, texto: m.tarefa, acao: { app: "kombi" } })
  }
  if (!save.objetos.length) return out
  const feitos = legadoFeito()
  for (const l of LEGADO) {
    if (feitos.includes(l.id)) continue
    const app = APPS.find((x) => x.id === l.app)!
    out.push({ id: `leg-${l.id}`, de: l.nome, cor: app.cor, texto: `${app.desc} · +${l.luz} neon`, acao: { app: l.app } })
  }
  const prox = FREQUENCIAS.find((f) => f.custo > save.sinal)
  if (prox) out.push({ id: "freq", de: "RÁDIO 222", cor: prox.cor, texto: `faltam ${prox.custo - save.sinal} de sinal pra ${prox.freq}. pega na estrada`, acao: { app: "kombi" } })
  return out
}

/* ─── HOME ──────────────────────────────────────────────── */
export function Home({
  save, nivel, onApp, onChamado, radioTocando, onRadioToggle,
}: {
  save: Save
  nivel: number
  onApp: (id: AppId) => void
  onChamado: (c: Chamado) => void
  radioTocando: { titulo: string; tocando: boolean } | null
  onRadioToggle: () => void
}) {
  const [pag, setPag] = useState(0)
  const [central, setCentral] = useState(false)
  const [banner, setBanner] = useState(0)
  const swipe = useRef<number | null>(null)
  const lista = useMemo(() => chamados(save, nivel), [save, nivel])
  const minha = save.estacao ? getEstacao(save.estacao) : null
  const prox = NIVEIS[Math.min(nivel + 1, NIVEIS.length - 1)]
  const dias = sequencia(save.dias)
  const freq = FREQUENCIAS.find((f) => f.id === save.freq) ?? FREQUENCIAS[0]
  const agora = new Date()

  useEffect(() => {
    if (lista.length < 2) return
    const t = setInterval(() => setBanner((b) => b + 1), 5200)
    return () => clearInterval(t)
  }, [lista.length])

  const b = lista.length ? lista[banner % lista.length] : null
  // todos os apps na página inicial (06/10, LU2CA)
  const grade = APPS.filter((a) => !DOCK.includes(a.id) && !ESCONDIDOS.includes(a.id))

  return (
    <section className="l-os">
      {save.papel && save.jardim.length ? <JardimFundo flores={save.jardim} /> : <div className="l-os-fundo" />}
      <div className="l-agua" />
      <header className="l-os-status">
        <b>{agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</b>
        <span>222 · {freqsLiberadas(save.sinal).length}/5 FM</span>
      </header>

      {b && (
        <button key={b.id + banner} type="button" className="l-os-banner" style={{ ["--cor" as string]: b.cor }} onClick={() => onChamado(b)}>
          <span className="l-os-banner-ic" />
          <span>
            <b>{b.de}</b>
            <small>{b.texto}</small>
          </span>
          <em>agora</em>
        </button>
      )}

      <div
        className="l-os-paginas"
        onPointerDown={(e) => { swipe.current = e.clientX }}
        onPointerUp={(e) => {
          if (swipe.current === null) return
          const dx = e.clientX - swipe.current
          if (Math.abs(dx) > 50) setPag(0)
          swipe.current = null
        }}
      >
        <div className="l-os-trilho" style={{ transform: `translateX(-${pag * 50}%)` }}>
          {[0].map((pg) => (
            <div key={pg} className="l-os-pagina">
              {pg === 0 && (
                <div className="l-widgets">
                  <button type="button" className="l-widget l-widget-eu" style={{ ["--cor" as string]: minha?.cor ?? "#2fe8ff" }} onClick={() => onApp("objetos")}>
                    <span className="l-widget-topo">
                      <span className="l-widget-est">{minha ? <Objeto id={minha.objeto} cor={minha.cor} size={18} /> : "?"}</span>
                      <b>{save.nome || "você"}</b>
                    </span>
                    <span className="l-widget-nivel">{NIVEIS[nivel].nome}</span>
                    <span className="l-widget-barra">{NIVEIS.map((n, i) => <i key={n.nome} className={i <= nivel ? "is-feito" : ""} />)}</span>
                    <span className="l-widget-nums"><b>{save.neon ?? 0}</b> neon · <b>{dias}</b> {dias === 1 ? "dia" : "dias"}</span>
                    {nivel < 4 && <small>próximo: {prox.como}</small>}
                  </button>
                  <div className="l-widget l-widget-radio" style={{ ["--cor" as string]: freq.cor }}>
                    <button type="button" className="l-widget-radio-abre" onClick={() => onApp("radio")}>
                      <b>{freq.freq}</b>
                      <small>{freq.nome}</small>
                      <span className="l-widget-faixa">{radioTocando?.titulo ?? "rádio desligada"}</span>
                    </button>
                    <button type="button" className="l-widget-play" onClick={onRadioToggle} aria-label={radioTocando?.tocando ? "pausar" : "tocar"}>
                      {radioTocando?.tocando ? "❚❚" : "▶"}
                    </button>
                  </div>
                </div>
              )}
              {pg === 1 && <p className="l-os-titulo-pag">a cidade</p>}
              <div className="l-os-grade">
                {grade.map((a) => (
                  <IconeApp key={a.id} a={a} nivel={nivel} onApp={onApp} objetos={[...save.objetos.filter((o) => o !== "nectar"), ...(save.violao ? ["nectar" as const] : [])]} novo={(a.id === "fliperama" && !save.jogados.visto) || (a.id === "jardim" && save.objetos.includes("chuva") && !save.jardim.length) || (a.id === "violao" && save.violao && !save.jogados.violao)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>


      <div className="l-os-dock">
        {DOCK.map((id) => <IconeApp key={id} a={APPS.find((x) => x.id === id)!} nivel={nivel} onApp={onApp} semNome />)}
        <button type="button" className="l-os-central" onClick={() => setCentral(true)}>
          missões{lista.length > 0 && <em>{lista.length}</em>}
        </button>
      </div>

      {central && (
        <div className="l-ficha-fundo" onClick={() => setCentral(false)}>
          <div className="l-ficha l-central" onClick={(e) => e.stopPropagation()}>
            <div className="l-ficha-alca" />
            <small className="l-rotulo">central</small>
            <h2>missões</h2>
            {lista.length === 0 && <p className="l-ficha-cidade">nada te chamando agora. roda de kombi, a cidade sempre tem coisa.</p>}
            <ul>
              {lista.map((c) => (
                <li key={c.id}>
                  <button type="button" style={{ ["--cor" as string]: c.cor }} onClick={() => { setCentral(false); onChamado(c) }}>
                    <b>{c.de}</b>
                    <span>{c.texto}</span>
                    <em>›</em>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

function IconeApp({ a, nivel, onApp, semNome, novo, objetos = [] }: { a: AppDef; nivel: number; onApp: (id: AppId) => void; semNome?: boolean; novo?: boolean; objetos?: EstacaoId[] }) {
  const trancado = (a.nivel !== undefined && nivel < a.nivel) || (!!a.precisa && !objetos.includes(a.precisa))
  return (
    <button type="button" className={`l-app ${trancado ? "is-trancado" : ""}`} style={{ ["--cor" as string]: a.cor }} onClick={() => onApp(a.id)}>
      <span className="l-app-ic">
        <Glifo id={a.id} cor={a.cor} />
        {trancado && <i className="l-app-cadeado">🔒</i>}
        {novo && <i className="l-app-novo" />}
      </span>
      {!semNome && <span className="l-app-nome">{a.nome}</span>}
    </button>
  )
}

export function AppTopo({ titulo, cor, onVoltar, extra }: { titulo: string; cor: string; onVoltar: () => void; extra?: React.ReactNode }) {
  return (
    <header className="l-app-topo" style={{ ["--cor" as string]: cor }}>
      <button type="button" onClick={onVoltar} aria-label="voltar pro início">‹ início</button>
      <b>{titulo}</b>
      <span>{extra}</span>
    </header>
  )
}

/* ─── janela dos apps da versão anterior ────────────────── */
// rota: abre o app num ponto específico (ex.: o vídeo que mandaram no N3XO)
export function AppJanela({ app, onFechar, rota }: { app: AppDef; onFechar: () => void; rota?: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [carregou, setCarregou] = useState(false)
  useEffect(() => {
    player.pausar()
    track("place_entered", { place_id: `linha-app-${app.id}`, place_type: "app" })
    // os apps antigos voltam pra "/" (home antiga) ou "/drive" (carro antigo)
    // quando terminam — aqui isso vira "fechar a janela e voltar pro celular"
    const t = setInterval(() => {
      try {
        const p = ref.current?.contentWindow?.location.pathname
        if (p && (p === "/" || p === "/linha" || p === "/drive" || p === "/drive-v2")) onFechar()
      } catch {}
    }, 400)
    return () => clearInterval(t)
  }, [app.id, onFechar])
  const base = rota ?? app.rota!
  const src = `${base}${base.includes("?") ? "&" : "?"}embedded=1`
  return (
    <section className="l-janela" style={{ ["--cor" as string]: app.cor }}>
      <AppTopo titulo={app.nome} cor={app.cor} onVoltar={onFechar} />
      {!carregou && (
        <div className="l-janela-carrega">
          <Glifo id={app.id} cor={app.cor} size={48} />
          <small>abrindo {app.nome.toLowerCase()}…</small>
        </div>
      )}
      <iframe ref={ref} src={src} title={app.nome} onLoad={() => setCarregou(true)} allow="autoplay; fullscreen; microphone" />
    </section>
  )
}

/* ─── N3XO: as conversas ───────────────────────────────── */
export function N3xo({ save, nivel, onChat, onVoltar }: { save: Save; nivel: number; onChat: (id: ChatId) => void; onVoltar: () => void }) {
  const ecos = save.objetos.filter((o) => !save.ecosVistos.includes(o) && ECOS[o]).length
  const linhas: { id: ChatId | null; nome: string; cor: string; objeto?: EstacaoId; texto: string; estado: "novo" | "feito" | "trancado" | "escuro"; }[] = []
  const membros = ["D-Bee", ...save.objetos.filter((o) => o !== "ojala" && o !== "nectar").map((o) => getEstacao(o).personagem)]
  if (save.completos.includes("grupo")) linhas.push({ id: "grupo", nome: "222", cor: "#2fe8ff", texto: ecos ? `${ecos} ${ecos === 1 ? "nova" : "novas"}` : membros.join(", "), estado: ecos ? "novo" : "feito" })
  if (save.completos.includes("abertura")) linhas.push({ id: "abertura", nome: "D-Bee", cor: "#3d7bff", objeto: "ojala", texto: "sabe ontem?", estado: "feito" })
  // só aparece quem você já conheceu (e quem está te chamando agora)
  const quem = conhecidos(save, nivel)
  const a = ativa(save, nivel)
  for (const e of ESTACOES) {
    if (e.id === "ojala" || !quem.includes(e.id) || !(e.id in ROTEIROS)) continue
    const feito = save.objetos.includes(e.id)
    const m = MISSOES[e.id]
    const et = etapaDe(save, e.id)
    linhas.push({
      id: e.id,
      nome: e.personagem,
      cor: e.cor,
      objeto: e.id,
      texto: feito ? `${e.objetoNome} ✓` : et === "chamado" ? m?.chamado ?? "…" : et === "busca" || et === "pegar" || et === "lugar" ? m?.tarefa ?? "…" : `leva ${m?.busca?.nome ?? "a coisa"} na estação ${e.n}`,
      estado: feito ? "feito" : e.id === a && et !== "busca" ? "novo" : "feito",
    })
  }
  return (
    <section className="l-appnativo">
      <AppTopo titulo="N3XO_" cor="#5dffa0" onVoltar={onVoltar} />
      <ul className="l-n3xo">
        {linhas.map((l) => (
          <li key={l.nome + (l.id ?? "")} className={`is-${l.estado}`} style={{ ["--cor" as string]: l.cor }}>
            <button type="button" disabled={!l.id || l.estado === "trancado" || l.estado === "escuro"} onClick={() => l.id && onChat(l.id)}>
              <span className="l-avatar">{l.objeto ? <Objeto id={getEstacao(l.objeto).objeto} cor={l.cor} size={20} /> : <span className="l-avatar-222">222</span>}</span>
              <span className="l-n3xo-txt">
                <b>{l.nome}</b>
                <small>{l.texto}</small>
              </span>
              {l.estado === "novo" && <em className="l-n3xo-bola" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ─── FLIPERAMA: todos os minigames num lugar ──────────── */
const PROVAS_FLIPER: { id: ProvaId; nome: string; est: EstacaoId }[] = [
  { id: "regar", nome: "regar a flor", est: "chuva" },
  { id: "sintonia", nome: "sintonizar o mp3", est: "copo" },
  { id: "respira", nome: "respirar", est: "dopamina" },
  { id: "espelho", nome: "desembaçar", est: "sexta" },
  { id: "caderno", nome: "o caderno", est: "ontem" },
  { id: "violao", nome: "violão", est: "nectar" },
]

export function Fliperama({ save, onApp, onVoltar, onJogou }: { save: Save; onApp: (id: AppId) => void; onVoltar: () => void; onJogou: (id: string, pulou?: boolean) => void }) {
  const [jogando, setJogando] = useState<ProvaId | null>(null)
  const feitos = legadoFeito()
  const e = jogando ? getEstacao(PROVAS_FLIPER.find((p) => p.id === jogando)!.est) : null
  return (
    <section className="l-appnativo l-fliper">
      <AppTopo titulo="FLIPERAMA" cor="#ff6a35" onVoltar={onVoltar} />
      <div className="l-fliper-corpo">
        <p className="l-rotulo">da cidade · jogue quantas vezes quiser</p>
        <div className="l-fliper-grade">
          {PROVAS_FLIPER.map((p) => {
            const est = getEstacao(p.est)
            return (
              <button key={p.id} type="button" className="l-fliper-card" style={{ ["--cor" as string]: est.cor }} onClick={() => setJogando(p.id)}>
                <Objeto id={est.objeto} cor={est.cor} size={30} />
                <b>{p.nome}</b>
                <small>{est.faixa.toLowerCase()} · {save.jogados[p.id] ?? 0}x</small>
              </button>
            )
          })}
        </div>
        <p className="l-rotulo">os clássicos</p>
        <div className="l-fliper-grade is-classicos">
          {(["nectar", "batida", "guitar", "sintonia", "feelgood"] as AppId[]).map((id) => {
            const a = APPS.find((x) => x.id === id)!
            const l = LEGADO.find((x) => x.app === id)
            return (
              <button key={id} type="button" className="l-fliper-card" style={{ ["--cor" as string]: a.cor }} onClick={() => onApp(id)}>
                <Glifo id={id} cor={a.cor} size={30} />
                <b>{a.nome}</b>
                <small>{l ? (feitos.includes(l.id) ? "✓ completo" : `+${l.luz} neon`) : a.desc}</small>
              </button>
            )
          })}
          <button type="button" className="l-fliper-card" style={{ ["--cor" as string]: "#2fe8ff" }} onClick={() => onApp("kombi")}>
            <Glifo id="kombi" cor="#2fe8ff" size={30} />
            <b>CONTRA O RELÓGIO</b>
            <small>{save.melhorVolta ? `melhor volta ${save.melhorVolta.toFixed(1)}s` : "uma volta na linha"}</small>
          </button>
        </div>
      </div>
      {jogando && e && (
        <div className="l-ficha-fundo" onClick={() => setJogando(null)}>
          <div className="l-fliper-jogo" style={{ ["--cor" as string]: e.cor }} onClick={(ev) => ev.stopPropagation()}>
            <Prova key={jogando} id={jogando} cor={e.cor} onFim={(pulou) => { onJogou(jogando, pulou); setTimeout(() => setJogando(null), 900) }} />
          </div>
        </div>
      )}
    </section>
  )
}

/* ─── OBJETOS ──────────────────────────────────────────── */
export function Objetos({ save, onVoltar, onChat, onUsarGalao }: { save: Save; onVoltar: () => void; onChat: (id: ChatId) => void; onUsarGalao?: () => void }) {
  const [sel, setSel] = useState<EstacaoId | null>(null)
  // o galão (06/10, LU2CA): o que ele é só aparece aqui, tocando nele
  const [verGalao, setVerGalao] = useState(false)
  const s = sel ? getEstacao(sel) : null
  return (
    <section className="l-appnativo">
      <AppTopo titulo="OBJETOS" cor="#b38cff" onVoltar={onVoltar} extra={`${save.objetos.length}/9`} />
      <div className="l-objs">
        {save.galao && (
          <button type="button" className="l-obj is-tem" style={{ ["--cor" as string]: "#ff8a3d" }} onClick={() => setVerGalao(true)}>
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true"><rect x="9" y="10" width="22" height="26" rx="3" fill="none" stroke="#ff8a3d" strokeWidth="2" /><path d="M14 10 V6 h9" fill="none" stroke="#ff8a3d" strokeWidth="2" /><rect x="11" y={save.galao === "cheio" ? 14 : 31} width="18" height={save.galao === "cheio" ? 20 : 3} fill="#ff8a3d" opacity="0.5" /></svg>
            <small>galão</small>
          </button>
        )}
        {ESTACOES.map((e) => {
          const tem = save.objetos.includes(e.id)
          return (
            <button key={e.id} type="button" className={`l-obj ${tem ? "is-tem" : ""}`} style={{ ["--cor" as string]: e.cor }} onClick={() => setSel(e.id)}>
              <Objeto id={e.objeto} cor={tem ? e.cor : "rgba(255,255,255,.2)"} size={40} />
              <small>{tem ? e.objetoNome : "???"}</small>
            </button>
          )
        })}
      </div>
      {verGalao && save.galao && (
        <div className="l-ficha-fundo" onClick={() => setVerGalao(false)}>
          <div className="l-ficha" style={{ ["--cor" as string]: "#ff8a3d" }} onClick={(ev) => ev.stopPropagation()}>
            <div className="l-ficha-alca" />
            <small className="l-rotulo">inventário</small>
            <h2>galão de gasolina</h2>
            <p className="l-ficha-cidade">{save.galao === "cheio" ? "cheio." : "vazio."} serve pra quando a gasolina acabar. encher no posto custa 10 neon.</p>
            {save.galao === "cheio" && onUsarGalao && (
              <button type="button" className="l-btn" onClick={() => { onUsarGalao(); setVerGalao(false) }}>usar no tanque</button>
            )}
          </div>
        </div>
      )}
      {s && (
        <div className="l-ficha-fundo" onClick={() => setSel(null)}>
          <div className="l-ficha" style={{ ["--cor" as string]: s.cor }} onClick={(ev) => ev.stopPropagation()}>
            <div className="l-ficha-alca" />
            <small className="l-rotulo">estação {s.n} · {s.faixa}</small>
            <h2>{save.objetos.includes(s.id) ? s.objetoNome : "???"}</h2>
            <p className="l-ficha-par">{s.luz} <i>×</i> {s.sombra}</p>
            <p className="l-ficha-cidade">
              {save.objetos.includes(s.id)
                ? `${s.personagem} te deu isso na estação ${s.n}.`
                : lancada(s) || s.id === "ontem" || s.id === "nectar"
                  ? "alguém acordado guarda. vai chegar a vez."
                  : `ainda no escuro. acende ${s.lancamento ? dataCurta(s.lancamento) : "em breve"}.`}
            </p>
            {save.objetos.includes(s.id) && MEMORIAS[save.objetos.indexOf(s.id)] && (
              <blockquote className="l-memoria">
                <small>memória {save.objetos.indexOf(s.id) + 1} de {MEMORIAS.length}</small>
                <p>{MEMORIAS[save.objetos.indexOf(s.id)]}</p>
              </blockquote>
            )}
            {s.id in ROTEIROS && save.objetos.includes(s.id) && (
              <button type="button" className="l-btn" onClick={() => onChat(s.id)}>
                reler a conversa
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export { VOZES }

/* ─── OUVIR: as faixas fora do jogo ─────────────────────── */
// Tudo que já saiu, com um botão por plataforma. O que ainda não saiu
// aparece com a data (sem link: nada vaza antes da hora).
export function Ouvir({ onVoltar }: { onVoltar: () => void }) {
  const [agora] = useState(() => Date.now())
  return (
    <section className="l-appnativo">
      <AppTopo titulo="OUVIR" cor="#1ed760" onVoltar={onVoltar} />
      <div className="l-ouvir">
        <p className="l-ouvir-intro">a cidade toca aqui dentro. lá fora, a faixa inteira toca onde você já escuta.</p>
        {ESTACOES.map((e) => {
          const saiu = lancada(e, agora)
          return (
            <div key={e.id} className={`l-ouvir-faixa ${saiu ? "" : "is-breve"}`} style={{ ["--cor" as string]: e.cor }}>
              <div className="l-ouvir-nome">
                <b>{String(e.n).padStart(2, "0")}</b>
                <span>{e.faixa}</span>
                {!saiu && e.lancamento && <small>sai {dataCurta(e.lancamento)}</small>}
              </div>
              {saiu ? <Plataformas faixa={e.id} lugar="linha-222-ouvir" compacto /> : <PreSave faixa={e.id} lugar="linha-222-ouvir" />}
            </div>
          )
        })}
        <div className="l-ouvir-faixa is-artista">
          <div className="l-ouvir-nome"><span>LU2CA, tudo</span></div>
          <Plataformas faixa={null} lugar="linha-222-ouvir" compacto />
        </div>
      </div>
    </section>
  )
}
