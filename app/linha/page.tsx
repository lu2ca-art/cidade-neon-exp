"use client"

// CIDADE NEON — o celular, redesenhado.
//
// entrada → a chegada na cidade (de Kombi, até o Núcleo cortar a música e
// a cor) → D-Bee no N3XO → grupo "linha 222" (qual estação você
// é) → o celular: todos os apps abertos desde o começo (os novos e os da
// versão anterior), a Kombi pra rodar a cidade quando quiser, e os níveis
// liberando coisa nova aos poucos.

import { useCallback, useEffect, useRef, useState } from "react"
import "./linha.css"
import { ESTACOES, NIVEIS, dataCurta, estacao as getEstacao, lancada, missao, nivelDe, type EstacaoId, type ProvaId } from "./data"
import { ROTEIROS, type ChatId } from "./roteiros"
import { VAZIO, carregar, gravar, hoje, type Item, type Save } from "./estado"
import { ARQUIVO, type FreqId } from "./radio"
import { TODAS_FAIXAS, ehDoLugar, proxima } from "./programa"
import { Chat, type Destino } from "./chat"
import { MISSOES, alvoDe, ativa, etapaDe } from "./missoes"
import { InvasaoNucleo, type Invasao } from "./nucleo"
import { Prova } from "./provas"
import { Jardim, Violao } from "./recursos"
import { Corrida, type Cinema, type Stats } from "./estrada/Corrida"
import { Chegada } from "./chegada"
import { LigacaoNaKombi, type Transcricao } from "./ligacao"
import { LIGACOES, ligacaoDaMissao, sortearModo, type Ligacao } from "./ligacoes"
import { APPS, AppJanela, AppTopo, Fliperama, Home, LEGADO, N3xo, Objetos, chamados, legadoFeito, type AppId, type Chamado } from "./os"
import { Bloqueio, Entrada, Final, Mapa, Radio } from "./telas"
import { audioCtx, ligarChuva, mudo, player } from "./som"
import { track } from "@/lib/analytics"

type ChatRoteiro = Exclude<ChatId, "ojala" | "swav" | "rollercoaster">

type Volta = { t: "home" } | { t: "app"; id: AppId } | { t: "corrida"; destino: null }

type Tela =
  | { t: "entrada" }
  | { t: "bloqueio" }
  | { t: "chegada" }
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
  // a estrada, uma vez aberta, fica montada por baixo de tudo: o celular
  // sobe por cima e, ao fechar, a Kombi continua exatamente de onde parou
  const [estrada, setEstrada] = useState(false)
  // o Núcleo invadindo (janelas de vírus por cima de tudo)
  const [invasao, setInvasao] = useState<Invasao | null>(null)
  const [destinoEstrada, setDestinoEstrada] = useState<EstacaoId | null>(null)
  // a chegada: a Kombi anda sozinha (cinema) e a cidade perde a cor até a
  // conversa com a D-Bee acabar
  const [cinema, setCinema] = useState<Cinema>(null)
  const [cinza, setCinza] = useState(false)
  // conversa rolando no painel da Kombi (dirigindo). Quando precisa do
  // celular de verdade, vira tela cheia com a MESMA conversa
  const [aoVivo, setAoVivo] = useState<ChatRoteiro | null>(null)
  // a conversa aberta porque desceu na estação (destrava o passo "chegar")
  const [naEstacao, setNaEstacao] = useState(false)
  // vídeo do //LOOP que alguém mandou: o app abre direto nele
  const [rotaLoop, setRotaLoop] = useState<string | undefined>(undefined)
  // ligação de voz rolando por cima da estrada (ligacoes.ts)
  // missao/tarefa: é a conversa de uma missão virando ligação (ligacoes.ts)
  const [ligacao, setLigacao] = useState<{ lig: Ligacao; missao?: EstacaoId; tarefa?: number } | null>(null)
  useEffect(() => {
    if (tela.t !== "corrida") return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstrada(true)
    setDestinoEstrada(tela.destino)
  }, [tela])

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

  // app com som próprio aberto (//LOOP, clipes, B4TIDA…): o vinil/rádio
  // pausa e volta de onde parou quando ele fecha
  const appComSom = tela.t === "app" && !!APPS.find((a) => a.id === tela.id)?.rota
  const retomar = useRef(false)
  useEffect(() => {
    if (appComSom) {
      if (player.tocando) { retomar.current = true; player.pausar() }
    } else if (retomar.current) {
      retomar.current = false
      player.retomar()
    }
  }, [appComSom])

  // o que a rádio tá tocando, pro widget da home
  useEffect(() => player.ouvir((s) => {
    if (!s.src) return setRadio(null)
    const todas = [...TODAS_FAIXAS, ...ARQUIVO]
    setRadio({ titulo: todas.find((x) => x.src === s.src)?.titulo ?? "…", tocando: s.tocando })
  }), [])

  // o widget da home toca a mesma programação da estrada (programa.ts)
  const proxRadio = useRef<(id: FreqId) => void>(() => {})
  const tocarRadio = useCallback((id: FreqId) => {
    if (ehDoLugar(id, player.src, save.objetos)) return player.tocar(player.src!, () => proxRadio.current(id))
    const p = proxima(id, save.objetos, { nome: save.nome, objetos: save.objetos, carregando: null })
    if (p) player.tocar(p.faixa.src, () => proxRadio.current(id))
  }, [save.objetos, save.nome])
  useEffect(() => { proxRadio.current = tocarRadio }, [tocarRadio])

  // O Núcleo invade: 1ª vez depois da 2ª missão (dá pra repelir), 2ª depois
  // da 3ª (derruba a 222 — o primeiro apagão), e depois, de vez em quando na
  // estrada. Nunca no meio de uma conversa.
  const podeInvadir = (tela.t === "corrida" || tela.t === "home") && !invasao && !ligacao && !aoVivo && !save.nucleo.caido
  useEffect(() => {
    if (!pronto || !podeInvadir) return
    const n = save.nucleo.invasoes
    const obj = save.objetos.length
    if ((n === 0 && obj >= 2) || (n === 1 && obj >= 3)) {
      const t = setTimeout(() => setInvasao({ id: Date.now(), forte: n === 1 }), 5000)
      return () => clearTimeout(t)
    }
    if (n >= 2 && tela.t === "corrida") {
      const t = setInterval(() => { if (Math.random() < 0.12) setInvasao({ id: Date.now(), forte: false }) }, 60000)
      return () => clearInterval(t)
    }
  }, [pronto, podeInvadir, save.nucleo.invasoes, save.objetos.length, tela.t])

  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save }, [save])
  // dirigindo: quem chama a próxima missão manda mensagem na tela da Kombi
  // (não precisa pegar o celular pra começar a conversa)
  const quemChama = !save.nucleo.caido ? ativa(save, nivelDe(save)) : null
  const chamaNaEstrada = !!quemChama && etapaDe(save, quemChama) === "chamado" && !save.completos.includes(quemChama) && save.pausas[quemChama] === undefined
  // a primeira vez na Kombi depois da abertura, a D-Bee LIGA (antes de
  // qualquer um mandar mensagem)
  const ligaDbee = save.completos.includes("abertura") && !save.ligacoes.includes("dbee-1")
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || !ligaDbee) return
    const t = setTimeout(() => setLigacao({ lig: LIGACOES["dbee-1"] }), 2500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, ligaDbee])
  const fimLigacao = useCallback((atendeu: boolean, dito: Transcricao) => {
    setLigacao((l) => {
      if (!l) return null
      const { lig, missao: m, tarefa } = l
      if (m && atendeu && tarefa !== undefined) {
        // a ligação foi o começo da conversa: o pedido tá aceito, a conversa
        // fica parada no pedido (como se tivesse sido por texto) e o que foi
        // dito vira histórico no N3XO
        const log: Item[] = [{ k: "sistema", texto: `ligação de voz · ${lig.quem}` }, ...dito.map((d) => ({ k: "msg" as const, texto: d.texto, eu: d.eu }))]
        setSave((s) => ({ ...s, xp: s.xp + 20, ligacoes: [...new Set([...s.ligacoes, lig.id])], pausas: { ...s.pausas, [m]: tarefa }, logs: { ...s.logs, [m]: log } }))
        track("mission_step", { mission_id: `linha-${m}`, step: "ligacao:pedido", perfil: save.perfil ?? "?", fio_pos: save.fio.indexOf(m) })
      } else if (m) {
        // não atendeu: a pessoa escreve (o painel pega)
        setSave((s) => ({ ...s, modos: { ...s.modos, [m]: "texto" } }))
        setTimeout(() => avisar(lig.quem, lig.recado, getEstacao(m).cor), 300)
      } else {
        setSave((s) => ({ ...s, ligacoes: [...new Set([...s.ligacoes, lig.id])], xp: s.xp + (atendeu ? 20 : 0) }))
        if (!atendeu) setTimeout(() => avisar(lig.quem, lig.recado, "#3d7bff"), 300)
      }
      return null
    })
  }, [avisar, save.perfil, save.fio])
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || ligaDbee || !chamaNaEstrada || !quemChama) return
    const t = setTimeout(() => {
      // lido na hora (o save muda a cada orb; não pode reiniciar o timer)
      const save = saveRef.current
      // o jeito dessa pessoa (sorteado uma vez, nunca igual ao anterior)
      const modo = save.modos[quemChama] ?? sortearModo(save.ultimoModo)
      if (!save.modos[quemChama]) setSave((s) => ({ ...s, modos: { ...s.modos, [quemChama]: modo }, ultimoModo: modo }))
      track("mission_started", { mission_id: `linha-${quemChama}`, place_id: `linha-kombi-${modo}` })
      if (modo === "ligacao") {
        const e = getEstacao(quemChama)
        const a = ativa(save, nivelDe(save))
        const r = ligacaoDaMissao(quemChama, e.personagem, {
          nome: save.nome || "você", objetos: save.objetos.length, estacao: save.estacao,
          ontemLancada: lancada(getEstacao("ontem")), primeira: a ? getEstacao(a).personagem : null,
        })
        if (r) return setLigacao({ lig: r.lig, missao: quemChama, tarefa: r.tarefa })
      }
      setAoVivo(quemChama as ChatRoteiro)
    }, 3500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, ligaDbee, chamaNaEstrada, quemChama])

  // ATO 2 (a crise): pegou a coisa no mapa → a pessoa escreve no painel,
  // dirigindo (a conversa anda do "tarefa" até o "chegar")
  const criseDe = !save.nucleo.caido && quemChama && etapaDe(save, quemChama) === "entrega" && save.pausas[quemChama] !== undefined
    && ROTEIROS[quemChama as keyof typeof ROTEIROS]?.passos[save.pausas[quemChama]!]?.t === "tarefa" ? quemChama : null
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || !criseDe) return
    const t = setTimeout(() => setAoVivo(criseDe as ChatRoteiro), 2500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, criseDe])

  const fimInvasao = useCallback((venceu: boolean) => {
    setInvasao(null)
    setSave((s) => ({ ...s, sinal: s.sinal + (venceu ? 8 : 0), nucleo: { invasoes: s.nucleo.invasoes + 1, caido: !venceu } }))
    track("mission_step", { mission_id: "linha-nucleo", step: venceu ? "invasao:repelida" : "invasao:caiu", perfil: save.perfil ?? "?", fio_pos: -1 })
    if (venceu) avisar("D-Bee", "vc segurou eles. +8 de sinal", "#3d7bff")
    else setTimeout(() => avisar("D-Bee", "derrubaram a 222. religa a antena no centro, de kombi", "#3d7bff"), 400)
  }, [avisar, save.perfil])

  // a caça: a partir da 3ª missão, carregar o contrabando (o que foi buscado,
  // ou alguém de carona) até a estação atrai os carros brancos do Núcleo.
  // Pego = a coisa volta pro lugar de origem (busca de novo; sem game over)
  const alvoAgora = save.nucleo.caido ? null : alvoDe(save, nivelDe(save))
  const cacado = alvoAgora?.t === "entrega" && save.objetos.length >= 2
  const apreender = useCallback(() => {
    setSave((s) => {
      const a = alvoDe(s, nivelDe(s))
      if (!a || a.t !== "entrega") return s
      const item = MISSOES[a.missao]?.busca.item
      return item ? { ...s, itens: s.itens.filter((k) => !k.startsWith(`${item}:`)) } : s
    })
    track("mission_step", { mission_id: "linha-nucleo", step: "caca:pego", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil])

  const religar = useCallback(() => {
    setSave((s) => ({ ...s, sinal: s.sinal + 10, nucleo: { ...s.nucleo, caido: false } }))
    track("mission_step", { mission_id: "linha-nucleo", step: "antena:religou", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil])

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

  // já fez o quiz = está dentro da cidade
  const dentro = !!save.estacao

  const entrar = () => {
    audioCtx()
    ligarChuva()
    if (dentro) {
      // a Kombi é a tela principal: entra direto na estrada
      player.pausar()
      setTela({ t: "corrida", destino: null })
      conferirLegado()
    } else if (save.completos.includes("abertura")) {
      // save antigo: abertura feita, quiz (que era no grupo) não. O quiz agora
      // mora na conversa da D-Bee — recomeça ela.
      setSave((s) => {
        const logs = { ...s.logs }
        delete logs.abertura
        delete logs.grupo
        return { ...s, completos: s.completos.filter((c) => c !== "abertura" && c !== "grupo"), logs }
      })
      setTela({ t: "chat", id: "abertura", volta: { t: "home" } })
    } else {
      // primeira vez: entra na cidade de Kombi, não pelo celular
      setCinema("rodando")
      setEstrada(true)
      setTela({ t: "chegada" })
    }
  }

  const abrirChat = (id: ChatId, volta: Volta = { t: "home" }, estacaoAqui = false) => {
    setNaEstacao(estacaoAqui)
    const e = ESTACOES.find((x) => x.id === id)
    if (e) {
      // uma missão de cada vez, na ordem do fio: só abre a conversa de quem
      // já te chamou
      const a = ativa(save, nivel)
      const conhece = save.objetos.includes(e.id) || save.pausas[e.id] !== undefined || a === e.id
      if (!conhece) {
        const m = missao(e, nivel)
        const agora = a ? getEstacao(a) : null
        avisar(
          `estação ${e.n}`,
          !m.ok && m.motivo === "data" && e.lancamento
            ? `no escuro até ${dataCurta(e.lancamento)}`
            : agora ? `ainda n é a vez daqui. quem te chama agora é ${agora.personagem}` : "ainda ninguém acordou aqui",
          e.cor,
        )
        return
      }
      if (!save.completos.includes(id) && save.pausas[id] === undefined) track("mission_started", { mission_id: `linha-${id}`, place_id: "linha-222" })
    }
    // se essa conversa tava no painel da Kombi, ela sobe pro celular inteira
    if (aoVivo === id) setAoVivo(null)
    setTela({ t: "chat", id: id as ChatRoteiro, volta })
  }

  const abrirApp = (id: AppId) => {
    const a = APPS.find((x) => x.id === id)!
    if (a.nivel !== undefined && nivel < a.nivel) {
      avisar(a.nome, `abre no nível ${NIVEIS[a.nivel].nome}`, a.cor)
      return
    }
    // recurso de missão: abre com o objeto daquela estação
    if (a.precisa && !save.objetos.includes(a.precisa)) {
      const e = getEstacao(a.precisa)
      avisar(a.nome, save.objetos.length || save.pausas[a.precisa] !== undefined ? `abre quando ${e.personagem} te der ${e.objetoNome}` : "abre com uma missão da cidade", a.cor)
      return
    }
    if (id === "violao") setSave((s) => ({ ...s, jogados: { ...s.jogados, violao: 1 } }))
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

  // a conversa do painel precisou do celular: sobe em tela cheia (e, quando
  // acabar ou pausar, volta pra estrada)
  const painelPraTela = useCallback(() => {
    setAoVivo((id) => {
      if (id) setTela({ t: "chat", id, volta: { t: "corrida", destino: null } })
      return null
    })
  }, [])
  const fimPainel = useCallback((para: Destino) => {
    const id = aoVivo
    setAoVivo(null)
    if (id && ESTACOES.some((e) => e.id === id) && para !== "estrada") track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    // na estrada, o fim (ou o pedido aceito) só fecha o painel: quem vem
    // depois chama de novo por aqui mesmo
  }, [aoVivo])

  const fimChat = (id: ChatId, para: Destino, volta: Volta) => {
    // acabou a conversa com a D-Bee: a cor volta e a Kombi é sua
    if (id === "abertura" && cinema) {
      setCinema(null)
      setCinza(false)
    }
    // pausa: a conversa pediu uma coisa que está no mapa
    // "pegar a kombi" JÁ é aceitar a missão: vai direto, e o som que tava
    // tocando (o vinil) segue sem cortar
    if (para === "estrada") {
      return setTela({ t: "corrida", destino: null })
    }
    if (ESTACOES.some((e) => e.id === id)) track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    if (id === "nectar") setTela({ t: "final" })
    else if (para === "missao") {
      // a próxima pessoa do fio te chama na estrada: volta pra Kombi e a
      // conversa chega no painel (dirigindo). Sem Kombi ainda: abre a conversa
      const a = ativa(save, nivel)
      if (a && save.estacao) setTela({ t: "corrida", destino: null })
      else if (a) setTela({ t: "chat", id: a as ChatRoteiro, volta: { t: "home" } })
      else setTela({ t: "home" })
    }
    else if (para === "grupo") setTela({ t: "chat", id: "grupo", volta: { t: "home" } })
    else setTela(volta)
  }

  const descer = (id: EstacaoId, st: Stats) => {
    setSave((s) => ({ ...s, xp: s.xp + 20 + st.orbs * 2 + st.quase * 5 }))
    // a conversa abre por cima; fechando, volta pra estrada
    abrirChat(id, { t: "corrida", destino: null }, true)
  }

  // o ícone do celular: pega o celular (a estrada pausa por baixo)
  const sairDaCorrida = () => setTela({ t: "home" })

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
        {/* camada de baixo: a estrada (pausa quando o celular está aberto) */}
        {(estrada || tela.t === "corrida") && (
          <Corrida
            save={save}
            nivel={nivel}
            destino={tela.t === "corrida" ? tela.destino : destinoEstrada}
            pausado={tela.t !== "corrida" && tela.t !== "chegada"}
            limitado={!!invasao}
            cacado={cacado}
            onApreendido={apreender}
            caido={save.nucleo.caido}
            onReligar={religar}
            onSinal={(total, freq) => setSave((s) => ({ ...s, sinal: total, freq: freq ?? s.freq }))}
            alvo={save.nucleo.caido ? null : alvoDe(save, nivel)}
            onPegar={(k) => setSave((s) => (s.itens.includes(k) ? s : { ...s, itens: [...s.itens, k] }))}
            avisos={chamados(save, nivel).filter((c) => c.id === "ecos" || c.id === "antena" || c.id.startsWith("est-")).length}
            onDescer={descer}
            onSair={sairDaCorrida}
            onVolta={(t) => setSave((s) => ({ ...s, melhorVolta: s.melhorVolta ? Math.min(s.melhorVolta, t) : t }))}
            cinema={cinema}
            cinza={cinza}
          />
        )}
        {tela.t === "chegada" && (
          <Chegada
            onParar={() => setCinema("parando")}
            onCinza={() => setCinza(true)}
            onAbrir={() => setTela({ t: "chat", id: "abertura", volta: { t: "home" } })}
          />
        )}
        {tela.t === "entrada" && <Entrada save={save} onEntrar={entrar} />}
        {tela.t === "bloqueio" && <Bloqueio onAbrir={() => setTela({ t: "chat", id: "abertura", volta: { t: "home" } })} />}
        {(tela.t === "chat" || aoVivo) && (
          <Chat
            key={tela.t === "chat" ? tela.id : aoVivo!}
            id={tela.t === "chat" ? tela.id : aoVivo!}
            modo={tela.t === "chat" ? "tela" : "painel"}
            save={save}
            atualizar={atualizar}
            onXp={(n) => setSave((s) => ({ ...s, xp: s.xp + n }))}
            onFim={tela.t === "chat" ? (para) => fimChat(tela.id, para, tela.volta) : fimPainel}
            onVoltar={tela.t === "chat" && dentro ? () => setTela(tela.volta) : undefined}
            onPrecisaTela={painelPraTela}
            onLoop={(v) => { setRotaLoop(v ? `/tiktok/feed?v=${v}` : undefined); abrirApp("loop") }}
            jeito={save.modos[(tela.t === "chat" ? tela.id : aoVivo) as EstacaoId] === "audio" ? "audio" : "texto"}
            naEstacao={tela.t === "chat" && naEstacao}
            oculto={tela.t !== "chat" && tela.t !== "corrida"}
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
          <AppJanela app={app} rota={tela.id === "loop" ? rotaLoop : undefined} onFechar={() => { setRotaLoop(undefined); setTela({ t: "home" }); setTimeout(conferirLegado, 300) }} />
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
        {tela.t === "app" && tela.id === "jardim" && (
          <Jardim save={save} atualizar={atualizar} onVoltar={() => setTela({ t: "home" })} />
        )}
        {tela.t === "app" && tela.id === "violao" && <Violao onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "objetos" && (
          <Objetos save={save} onVoltar={() => setTela({ t: "home" })} onChat={(id) => abrirChat(id, { t: "app", id: "objetos" })} />
        )}

        {tela.t === "final" && <Final save={save} onVoltar={() => setTela({ t: "home" })} />}

        {(tela.t === "home" || tela.t === "chat" || tela.t === "bloqueio" || tela.t === "chegada") && (
          <button type="button" className="l-som" onClick={alternarSom} aria-label={semSom ? "ligar som" : "desligar som"}>
            {semSom ? "som off" : "som on"}
          </button>
        )}
        {tela.t !== "entrada" && tela.t !== "bloqueio" && tela.t !== "chegada" && tela.t !== "home" && tela.t !== "corrida" && dentro && (
          <button type="button" className="l-home-bar" onClick={() => setTela({ t: "home" })} aria-label="início" />
        )}
        {ligacao && <LigacaoNaKombi key={ligacao.lig.id} lig={ligacao.lig} onFim={fimLigacao} />}
        {invasao && <InvasaoNucleo key={invasao.id} inv={invasao} onFim={fimInvasao} />}
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

