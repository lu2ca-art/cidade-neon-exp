"use client"

// CIDADE NEON — o celular, redesenhado.
//
// entrada → tela de bloqueio → D-Bee → grupo "linha 222" (qual estação você
// é) → o celular: todos os apps abertos desde o começo (os novos e os da
// versão anterior), a Kombi pra rodar a cidade quando quiser, e os níveis
// liberando coisa nova aos poucos.

import { useCallback, useEffect, useRef, useState } from "react"
import "./linha.css"
import { ESTACOES, NIVEIS, missao, nivelDe, type EstacaoId, type ProvaId } from "./data"
import type { ChatId } from "./roteiros"
import { VAZIO, carregar, gravar, hoje, type Save } from "./estado"
import { FREQUENCIAS, faixasDe, type FreqId } from "./radio"
import { Chat } from "./chat"
import { Prova } from "./provas"
import { Corrida, type Stats } from "./estrada/Corrida"
import { APPS, AppJanela, AppTopo, Fliperama, Home, LEGADO, N3xo, Objetos, legadoFeito, type AppId, type Chamado } from "./os"
import { Bloqueio, Entrada, Final, Mapa, Radio } from "./telas"
import { audioCtx, ligarChuva, mudo, player } from "./som"
import { track } from "@/lib/analytics"

type ChatRoteiro = Exclude<ChatId, "ojala" | "swav" | "rollercoaster">

type Volta = { t: "home" } | { t: "app"; id: AppId }

type Tela =
  | { t: "entrada" }
  | { t: "bloqueio" }
  | { t: "chat"; id: ChatRoteiro; volta: Volta }
  | { t: "home" }
  | { t: "app"; id: AppId }
  | { t: "corrida"; destino: EstacaoId | null }
  | { t: "final" }

type Aviso = { id: number; titulo: string; texto: string; cor: string }

export default function LinhaPage() {
  const [save, setSave] = useState<Save>(VAZIO)
  const [pronto, setPronto] = useState(false)
  const [tela, setTela] = useState<Tela>({ t: "entrada" })
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [semSom, setSemSom] = useState(false)
  const [xpFlutua, setXpFlutua] = useState<{ id: number; n: number } | null>(null)
  const [radio, setRadio] = useState<{ titulo: string; tocando: boolean } | null>(null)
  const nivelAnt = useRef<number | null>(null)
  const [provaDev, setProvaDev] = useState<ProvaId | null>(null)
  const [corridaDev, setCorridaDev] = useState(false)

  useEffect(() => {
    const s = carregar()
    const h = hoje()
    // hidratação do localStorage: só existe no cliente, depois do mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSave(s.dias.includes(h) ? s : { ...s, dias: [...s.dias, h].slice(-60) })
    setPronto(true)
    if (process.env.NODE_ENV !== "production") {
      const q = new URLSearchParams(location.search)
      setProvaDev(q.get("prova") as ProvaId | null)
      setCorridaDev(q.has("corrida"))
    }
    track("place_entered", { place_id: "linha-222", place_type: "linha" })
  }, [])

  useEffect(() => {
    if (pronto) gravar(save)
  }, [save, pronto])

  const atualizar = useCallback((f: (s: Save) => Save) => setSave(f), [])

  const avisar = useCallback((titulo: string, texto: string, cor = "#2fe8ff") => {
    const id = Date.now()
    setAviso({ id, titulo, texto, cor })
    setTimeout(() => setAviso((a) => (a?.id === id ? null : a)), 4200)
  }, [])

  const ganharXp = useCallback((n: number) => {
    setSave((s) => ({ ...s, xp: s.xp + n }))
    setXpFlutua({ id: Date.now(), n })
  }, [])

  // o que a rádio tá tocando, pro widget da home
  useEffect(() => player.ouvir((s) => {
    if (!s.src) return setRadio(null)
    const todas = [
      ...FREQUENCIAS.flatMap((f) => f.faixas),
      ...ESTACOES.map((e) => ({ titulo: e.faixa, src: e.audio })),
    ]
    setRadio({ titulo: todas.find((x) => x.src === s.src)?.titulo ?? "…", tocando: s.tocando })
  }), [])

  const proxRadio = useRef<(id: FreqId, i: number) => void>(() => {})
  const tocarRadio = useCallback((id: FreqId, i = 0) => {
    const f = FREQUENCIAS.find((x) => x.id === id)!
    let l = faixasDe(f, save.objetos, save.estacao)
    if (!l.length) l = faixasDe(FREQUENCIAS[4], [], null)
    if (!l.length) return
    player.tocar(l[i % l.length].src, () => proxRadio.current(id, i + 1))
  }, [save.objetos, save.estacao])
  useEffect(() => { proxRadio.current = tocarRadio }, [tocarRadio])

  // subir de nível é um momento — não um número mudando em silêncio
  const nivel = nivelDe(save)
  useEffect(() => {
    if (!pronto) return
    if (nivelAnt.current !== null && nivel > nivelAnt.current) {
      const n = NIVEIS[nivel]
      avisar(`nível ${n.nome}`, `libera ${n.libera}`, "#ffc857")
      try { navigator.vibrate?.([20, 40, 20, 40, 60]) } catch {}
      track("mission_completed", { mission_id: `linha-nivel-${n.nome}`, duration_ms: 0 })
    }
    nivelAnt.current = nivel
  }, [nivel, pronto, avisar])

  // minigames da versão anterior: quem completa ganha luz e sinal (uma vez)
  const conferirLegado = useCallback(() => {
    const feitos = legadoFeito()
    setSave((s) => {
      const novos = LEGADO.filter((l) => feitos.includes(l.id) && !s.legado.includes(l.id))
      if (!novos.length) return s
      const luz = novos.reduce((t, l) => t + l.luz, 0)
      const sinal = novos.reduce((t, l) => t + l.sinal, 0)
      setTimeout(() => {
        setXpFlutua({ id: Date.now(), n: luz })
        avisar(novos.map((l) => l.nome).join(" + "), `completo · +${luz} luz · +${sinal} sinal`, "#ffc857")
      }, 0)
      return { ...s, legado: [...s.legado, ...novos.map((l) => l.id)], xp: s.xp + luz, sinal: s.sinal + sinal }
    })
  }, [avisar])

  const entrar = () => {
    audioCtx()
    ligarChuva()
    if (save.completos.includes("grupo")) {
      setTela({ t: "home" })
      conferirLegado()
    } else if (save.completos.includes("abertura")) setTela({ t: "chat", id: "grupo", volta: { t: "home" } })
    else setTela({ t: "bloqueio" })
  }

  const abrirChat = (id: ChatId, volta: Volta = { t: "home" }) => {
    const e = ESTACOES.find((x) => x.id === id)
    if (e) {
      const m = missao(e, nivel)
      if (!m.ok && !save.objetos.includes(e.id)) {
        avisar(e.personagem, m.motivo === "nivel" ? "a conversa daqui abre no nível ativista (4 objetos)" : m.motivo === "data" ? "sem sinal ainda" : "descobre sua estação no grupo primeiro", e.cor)
        return
      }
      if (!save.completos.includes(id)) track("mission_started", { mission_id: `linha-${id}`, place_id: "linha-222" })
    }
    setTela({ t: "chat", id: id as ChatRoteiro, volta })
  }

  const abrirApp = (id: AppId) => {
    const a = APPS.find((x) => x.id === id)!
    if (a.nivel !== undefined && nivel < a.nivel) {
      avisar(a.nome, `abre no nível ${NIVEIS[a.nivel].nome}`, a.cor)
      return
    }
    if (a.link) {
      track("external_link_click", { destination: a.link.includes("instagram") ? "instagram" : a.link.includes("untitled") ? "untitled" : "other", place_id: "linha-home" })
      window.open(`${a.link}${a.link.includes("?") ? "&" : "?"}utm_source=cidade-neon&utm_medium=game&utm_campaign=linha-222`, "_blank")
      return
    }
    if (id === "kombi") return setTela({ t: "corrida", destino: null })
    if (id === "fliperama") setSave((s) => ({ ...s, jogados: { ...s.jogados, visto: 1 } }))
    setTela({ t: "app", id })
  }

  const onChamado = (c: Chamado) => {
    if ("chat" in c.acao) abrirChat(c.acao.chat)
    else abrirApp(c.acao.app)
  }

  const fimChat = (id: ChatId, para: ChatId | "mapa", volta: Volta) => {
    if (ESTACOES.some((e) => e.id === id)) track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    if (id === "nectar") setTela({ t: "final" })
    else if (para === "grupo") setTela({ t: "chat", id: "grupo", volta: { t: "home" } })
    else if (id === "grupo" && volta.t === "home") {
      setTela({ t: "home" })
      setTimeout(() => avisar("a cidade é sua", "tudo aberto. a Kombi te leva nas estações", "#2fe8ff"), 600)
    } else setTela(volta)
  }

  const descer = (id: EstacaoId, st: Stats) => {
    ganharXp(20 + st.orbs * 2 + st.quase * 5)
    abrirChat(id, { t: "app", id: "linha" })
  }

  const sairDaCorrida = (st: Stats) => {
    if (st.orbs + st.quase > 0) ganharXp(10 + st.orbs * 2 + st.quase * 5)
    setTela({ t: "home" })
  }

  const alternarSom = () => {
    const m = !semSom
    setSemSom(m)
    mudo(m)
  }

  if (!pronto) return <div className="l-raiz" />

  // atalho de desenvolvimento: /linha?corrida=1 abre direto a estrada
  if (process.env.NODE_ENV !== "production" && corridaDev) {
    return (
      <div className="l-raiz">
        <div className="l-palco">
          <Corrida save={save} nivel={nivel} destino={null} onSinal={(total) => setSave((s) => ({ ...s, sinal: total }))} onDescer={() => {}} onSair={() => {}} />
        </div>
      </div>
    )
  }

  // atalho de desenvolvimento: /linha?prova=regar mostra só a prova
  if (process.env.NODE_ENV !== "production" && provaDev) {
    const e = ESTACOES.find((x) => x.prova === provaDev)
    return (
      <div className="l-raiz">
        <div className="l-palco" onPointerDown={() => audioCtx()}>
          <div className="l-chat" style={{ ["--cor" as string]: e?.cor }}>
            <div className="l-chat-corpo">
              <Prova id={provaDev} cor={e?.cor ?? "#2fe8ff"} onFim={(p) => avisar("prova", p ? "pulou" : "feita ✓")} />
            </div>
          </div>
          {aviso && <div key={`aviso-${aviso.id}`} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}><b>{aviso.titulo}</b><span>{aviso.texto}</span></div>}
        </div>
      </div>
    )
  }

  const app = tela.t === "app" ? APPS.find((a) => a.id === tela.id)! : null

  return (
    <div className="l-raiz">
      <div className="l-palco">
        {tela.t === "entrada" && <Entrada save={save} onEntrar={entrar} />}
        {tela.t === "bloqueio" && <Bloqueio onAbrir={() => setTela({ t: "chat", id: "abertura", volta: { t: "home" } })} />}
        {tela.t === "chat" && (
          <Chat
            key={tela.id}
            id={tela.id}
            save={save}
            atualizar={atualizar}
            onXp={ganharXp}
            onFim={(para) => fimChat(tela.id, para, tela.volta)}
            onVoltar={save.completos.includes("grupo") ? () => setTela(tela.volta) : undefined}
          />
        )}
        {tela.t === "home" && (
          <Home
            save={save}
            nivel={nivel}
            onApp={abrirApp}
            onChamado={onChamado}
            radioTocando={radio}
            onRadioToggle={() => (radio?.tocando ? player.pausar() : tocarRadio((save.freq as FreqId) || "linha"))}
          />
        )}

        {tela.t === "app" && app?.rota && (
          <AppJanela app={app} onFechar={() => { setTela({ t: "home" }); setTimeout(conferirLegado, 300) }} />
        )}
        {tela.t === "app" && tela.id === "n3xo" && (
          <N3xo save={save} nivel={nivel} onChat={(id) => abrirChat(id, { t: "app", id: "n3xo" })} onVoltar={() => setTela({ t: "home" })} />
        )}
        {tela.t === "app" && tela.id === "linha" && (
          <Mapa
            save={save}
            nivel={nivel}
            atualizar={atualizar}
            onVoltar={() => setTela({ t: "home" })}
            onGrupo={() => abrirChat("grupo", { t: "app", id: "linha" })}
            onViajar={(id) => { player.pausar(); setTela({ t: "corrida", destino: id }) }}
            onEstacao={(id) => abrirChat(id, { t: "app", id: "linha" })}
            onFinal={() => setTela({ t: "final" })}
          />
        )}
        {tela.t === "app" && tela.id === "radio" && (
          <section className="l-appnativo">
            <AppTopo titulo="RÁDIO 222" cor="#ff3fb0" onVoltar={() => setTela({ t: "home" })} />
            <Radio save={save} atualizar={atualizar} onFechar={() => setTela({ t: "home" })} embutido />
          </section>
        )}
        {tela.t === "app" && tela.id === "fliperama" && (
          <Fliperama
            save={save}
            onApp={abrirApp}
            onVoltar={() => setTela({ t: "home" })}
            onJogou={(id, pulou) => {
              setSave((s) => ({ ...s, jogados: { ...s.jogados, [id]: (s.jogados[id] ?? 0) + 1 } }))
              if (!pulou) ganharXp(10)
            }}
          />
        )}
        {tela.t === "app" && tela.id === "objetos" && (
          <Objetos save={save} onVoltar={() => setTela({ t: "home" })} onChat={(id) => abrirChat(id, { t: "app", id: "objetos" })} />
        )}

        {tela.t === "corrida" && (
          <Corrida
            key={tela.destino ?? "livre"}
            save={save}
            nivel={nivel}
            destino={tela.destino}
            onSinal={(total, freq) => setSave((s) => ({ ...s, sinal: total, freq: freq ?? s.freq }))}
            onDescer={descer}
            onSair={sairDaCorrida}
            onVolta={(t) => setSave((s) => ({ ...s, melhorVolta: s.melhorVolta ? Math.min(s.melhorVolta, t) : t }))}
          />
        )}
        {tela.t === "final" && <Final save={save} onVoltar={() => setTela({ t: "home" })} />}

        {(tela.t === "home" || tela.t === "chat" || tela.t === "bloqueio") && (
          <button type="button" className="l-som" onClick={alternarSom} aria-label={semSom ? "ligar som" : "desligar som"}>
            {semSom ? "som off" : "som on"}
          </button>
        )}
        {tela.t !== "entrada" && tela.t !== "bloqueio" && tela.t !== "home" && tela.t !== "corrida" && save.completos.includes("grupo") && (
          <button type="button" className="l-home-bar" onClick={() => setTela({ t: "home" })} aria-label="início" />
        )}
        {aviso && (
          <div key={`aviso-${aviso.id}`} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}>
            <b>{aviso.titulo}</b>
            <span>{aviso.texto}</span>
          </div>
        )}
        {xpFlutua && tela.t !== "corrida" && <div key={`xp-${xpFlutua.id}`} className="l-xp-flutua">+{xpFlutua.n} luz</div>}
      </div>
    </div>
  )
}

