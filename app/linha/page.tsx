"use client"

// CIDADE NEON — o celular, redesenhado.
//
// entrada → a chegada na cidade (de Kombi, até o Núcleo cortar a música e
// a cor) → D-Bee no N3XO → grupo "linha 222" (qual estação você
// é) → o celular: todos os apps abertos desde o começo (os novos e os da
// versão anterior), a Kombi pra rodar a cidade quando quiser, e os níveis
// liberando coisa nova aos poucos.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import "./linha.css"
import { ESTACOES, NIVEIS, dataCurta, estacao as getEstacao, lancada, missao, nivelDe, type EstacaoId, type ProvaId } from "./data"
import { ROTEIROS, type ChatId } from "./roteiros"
import { VAZIO, carregar, gravar, hoje, type Item, type Save } from "./estado"
import { ARQUIVO, type FreqId } from "./radio"
import { TODAS_FAIXAS, ehDoLugar, proxima } from "./programa"
import { Chat, type Destino } from "./chat"
import { MISSOES, abertas, alvoDe, ativa, etapaDe, type Alvo } from "./missoes"
import { CenaLugar, type ResultadoCena } from "./cena"
import { CENA_INICIO, cenaDe, type Reliquia } from "./cenas"
import { GESTOS_3D, precarregarSala, temSala } from "./interior/registro"
import { LUGARES, type LugarId } from "./lugares"
import { proximaFreq } from "./radio"
import { InvasaoNucleo, type Invasao } from "./nucleo"
import { Prova } from "./provas"
import { Jardim, Violao } from "./recursos"
import type { Cinema, Stats } from "./estrada/Corrida"
import { Chegada } from "./chegada"
import { LigacaoNaKombi, type Transcricao } from "./ligacao"
import { LIGACOES, ligacaoDaMissao, sortearModo, type Ligacao } from "./ligacoes"
import { APPS, AppJanela, AppTopo, Fliperama, Home, LEGADO, N3xo, Objetos, chamados, legadoFeito, type AppId, type Chamado } from "./os"
import { Bloqueio, Entrada, Final, Mapa, Radio } from "./telas"
import { abafar, audioCtx, disco, fonteSom, ligarChuva, moeda, mudo, player } from "./som"
import { track } from "@/lib/analytics"
import { Loja } from "./loja"
import { PostoDentro } from "./posto"
import { ACERVO, PRECO_DISCO } from "./discos"
import { BLOCOS, ITENS, NEON_POR_ITEM, PRIMEIRA, blocoAtual, emTutorial, feito, ligou, type ItemTutorial } from "./tutorial"
import dynamic from "next/dynamic"

// PASSO 1 da otimização: os ambientes 3D vêm em pedaços separados do pacote,
// baixados só quando a pessoa chega neles (a estrada ao entrar na Kombi, a
// sala ao passar na frente do lugar, a viagem no ep. 3). A tela inicial, o
// celular e as conversas abrem sem three.js.
const Corrida = dynamic(() => import("./estrada/Corrida").then((m) => m.Corrida), { ssr: false })
const Interior = dynamic(() => import("./interior/Interior").then((m) => m.Interior), { ssr: false })
const Viagem = dynamic(() => import("./viagem").then((m) => m.Viagem), { ssr: false })

type ChatRoteiro = Exclude<ChatId, "ojala" | "swav" | "rollercoaster">

type Volta = { t: "home" } | { t: "app"; id: AppId } | { t: "corrida"; destino: null }

// quanto NEON rende acordar uma pessoa (uma missão inteira)
// cada missão completa vale 50 NEON; cada item do tutorial, 10 (LU2CA, 05/10)
const NEON_POR_PESSOA = 50
// o tutorial: depois de resgatar o Mubarak, levar ele até a casa do Drewboy
const levarDrewboy = (s: Save) => emTutorial(s) && s.objetos.includes("copo") && !feito(s, "drewboy")
// o tutorial: chegou na cidade, encher o tanque no posto
const irAoPosto = (s: Save) => emTutorial(s) && feito(s, "tanque") && !feito(s, "posto")
// o combustível (06/10, LU2CA)
const PRECO_TANQUE = 25
const PRECO_GALAO = 10
const GALAO = 0.35 // o quanto um galão põe no tanque (dá pra chegar na cidade)

type Tela =
  | { t: "entrada" }
  | { t: "bloqueio" }
  | { t: "chegada" }
  | { t: "deserto" }
  // o COMEÇO (05/10): a casa da D-Bee, longe de tudo, e a reta até a cidade
  | { t: "casa" }
  | { t: "reta" }
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
  // a chegada: o grupo 222 rola na ilha da Kombi, mensagem por mensagem.
  // null = não está rolando; número = a próxima mensagem
  const [introGrupo, setIntroGrupo] = useState<number | null>(null)
  const [falaIntro, setFalaIntro] = useState<{ id: number; de: string; texto: string } | null>(null)
  // conversa rolando no painel da Kombi (dirigindo). Quando precisa do
  // celular de verdade, vira tela cheia com a MESMA conversa
  const [aoVivo, setAoVivo] = useState<ChatRoteiro | null>(null)
  // a conversa aberta porque desceu na estação (destrava o passo "chegar")
  const [naEstacao, setNaEstacao] = useState(false)
  // a cena de um lugar rolando (encostou na vaga): a câmera corta pra lá
  // inicio: a casa da D-Bee na abertura (CENA_INICIO)
  const [cena, setCena] = useState<{ lugar: LugarId; missao: EstacaoId; pegar: boolean; inicio?: boolean } | null>(null)
  // a viagem pra fora da cidade (ep. 3): antes da cena de um lugar `fora`
  // dentro de uma sala (ou na viagem pra fora) a estrada sai da tela e libera
  // a memória; ao voltar, a Kombi reaparece onde estava (Corrida: RETOMAR)
  const [voltaDaSala, setVoltaDaSala] = useState(false)
  // o painel MISSÕES: tudo que está aberto + "ir agora"
  const [painelMissoes, setPainelMissoes] = useState(false)
  // dentro do posto (posto.tsx): primeira = a apresentação do LU2CA
  const [noPosto, setNoPosto] = useState<{ primeira: boolean } | null>(null)
  const abrirPostoRef = useRef(() => {})
  // conversas que chegaram numa pergunta no painel: esperam no N3XO (não
  // chamam de novo na estrada até a pessoa abrir e responder)
  const [adiadas, setAdiadas] = useState<string[]>([])
  const [teleporte, setTeleporte] = useState<{ chave: number; area: FreqId; lugar?: LugarId; frac?: number } | null>(null)
  const [viagem, setViagem] = useState<{ lugar: LugarId; missao: EstacaoId; pegar: boolean; chegou?: boolean } | null>(null)
  // o Núcleo vindo atrás depois de uma cena que mexeu com ele
  const [perseguido, setPerseguido] = useState(false)
  // a ilha do topo virou bifurcação: a conversa do painel se recolhe
  const [bifurcando, setBifurcando] = useState(false)
  // vídeo do //LOOP que alguém mandou: o app abre direto nele
  const [rotaLoop, setRotaLoop] = useState<string | undefined>(undefined)
  // ligação de voz rolando por cima da estrada (ligacoes.ts)
  // missao/tarefa: é a conversa de uma missão virando ligação (ligacoes.ts)
  const [ligacao, setLigacao] = useState<{ lig: Ligacao; missao?: EstacaoId; tarefa?: number } | null>(null)
  useEffect(() => {
    if (tela.t !== "corrida") return
     
    setEstrada(true)
    setDestinoEstrada(tela.destino)
  }, [tela])

  useEffect(() => {
    const s = carregar()
    const h = hoje()
    // hidratação do localStorage: só existe no cliente, depois do mount
     
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

  // os avisos entram em FILA (um não apaga o outro: o LU2CA no posto e o
  // +10 NEON chegando juntos)
  const filaAvisos = useRef<{ titulo: string; texto: string; cor: string }[]>([])
  const avisando = useRef(false)
  const proximoAviso = useCallback(function proximo() {
    const a = filaAvisos.current.shift()
    if (!a) { avisando.current = false; return }
    avisando.current = true
    const id = Date.now() + Math.random()
    setAviso({ id, ...a })
    setTimeout(() => { setAviso((x) => (x?.id === id ? null : x)); setTimeout(proximo, 250) }, 4200)
  }, [])
  const avisar = useCallback((titulo: string, texto: string, cor = "#2fe8ff") => {
    // o mesmo aviso de novo, enquanto ainda tá na fila: não repete
    if (filaAvisos.current.some((a) => a.titulo === titulo && a.texto === texto)) return
    filaAvisos.current.push({ titulo, texto, cor })
    if (!avisando.current) proximoAviso()
  }, [proximoAviso])

  const ganharXp = useCallback((n: number) => {
    setSave((s) => ({ ...s, neon: (s.neon ?? 0) + n }))
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

  // dinheiro caiu na conta: o som da moedinha
  const neonAntes = useRef<number | null>(null)
  useEffect(() => {
    const n = save.neon ?? 0
    if (pronto && neonAntes.current !== null && n > neonAntes.current) moeda()
    if (pronto) neonAntes.current = n
  }, [save.neon, pronto])

  // a música abafada (LU2CA): dentro de um lugar (a missão) e com o telefone
  // tocando, o rádio e o disco seguem mais baixos e sem agudo
  const emCena = !!cena
  useEffect(() => {
    if (!emCena) return
    abafar(true)
    return () => abafar(false)
  }, [emCena])
  const telefone = !!ligacao
  useEffect(() => {
    if (!telefone) return
    abafar(true)
    return () => abafar(false)
  }, [telefone])

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
  const podeInvadir = (tela.t === "corrida" || tela.t === "home") && !invasao && !ligacao && !aoVivo && !cinema && !save.nucleo.caido
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
  // o tutorial (tutorial.ts): ninguém chama antes da D-Bee apresentar o
  // Mubarak (bloco 2)
  const tut = emTutorial(save)
  const blocoTut = tut ? blocoAtual(save) : BLOCOS.length
  // e até o fim do tutorial, só a primeira pessoa chama
  const tutLibera = !tut || (quemChama === PRIMEIRA && blocoTut >= 1 && feito(save, "posto"))
  const chamaNaEstrada = tutLibera && !!quemChama && !adiadas.includes(quemChama) && etapaDe(save, quemChama) === "chamado" && !save.completos.includes(quemChama) && save.pausas[quemChama] === undefined
  // A CHEGADA: o grupo 222 rola na ilha, uma mensagem a cada ~3,4 s, sem
  // travar nada. Acabou (ou a pessoa abriu e leu): o grupo fica feito, com
  // tudo no histórico, e a D-Bee LIGA. Desligou: ela escreve (a abertura)
  useEffect(() => {
    if (introGrupo === null || tela.t !== "corrida" || ligacao) return
    const falas = ROTEIROS.grupo.passos.flatMap((p) => (p.t === "msg" && p.de ? [{ de: p.de, texto: typeof p.texto === "string" ? p.texto : "" }] : p.t === "nucleo" ? [{ de: "NÚCLEO", texto: p.texto }] : []))
    const t = setTimeout(() => {
      if (introGrupo >= falas.length) {
        setIntroGrupo(null)
        setSave((s) => {
          if (s.completos.includes("grupo")) return s
          const log: Item[] = ROTEIROS.grupo.passos.flatMap((p): Item[] => (p.t === "msg" ? [{ k: "msg", texto: typeof p.texto === "string" ? p.texto : "", de: p.de }] : p.t === "nucleo" ? [{ k: "nucleo", texto: p.texto }] : p.t === "sistema" ? [{ k: "sistema", texto: p.texto }] : []))
          return { ...s, completos: [...s.completos, "grupo"], logs: { ...s.logs, grupo: log } }
        })
        return
      }
      setFalaIntro({ id: Date.now(), ...falas[introGrupo] })
      setIntroGrupo(introGrupo + 1)
    }, introGrupo === 0 ? 1200 : 3600)
    return () => clearTimeout(t)
  }, [introGrupo, tela.t, ligacao])
  const ligaPrimeira = save.completos.includes("grupo") && !save.completos.includes("abertura") && save.pausas.abertura === undefined && !save.ligacoes.includes("dbee-0")
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || introGrupo !== null || invasao || aoVivo || ligacao || !ligaPrimeira) return
    const t = setTimeout(() => setLigacao({ lig: LIGACOES["dbee-0"] }), 4000)
    return () => clearTimeout(t)
  }, [pronto, tela.t, introGrupo, invasao, aoVivo, ligacao, ligaPrimeira])

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
        setSave((s) => ({ ...s, ligacoes: [...new Set([...s.ligacoes, lig.id])], pausas: { ...s.pausas, [m]: tarefa }, logs: { ...s.logs, [m]: log } }))
        track("mission_step", { mission_id: `linha-${m}`, step: "ligacao:pedido", perfil: save.perfil ?? "?", fio_pos: save.fio.indexOf(m) })
      } else if (m) {
        // não atendeu: a pessoa escreve (o painel pega)
        setSave((s) => ({ ...s, modos: { ...s.modos, [m]: "texto" } }))
        setTimeout(() => avisar(lig.quem, lig.recado, getEstacao(m).cor), 300)
      } else {
        const extra = lig.id === "dbee-0" ? ["dbee-1"] : []
        setSave((s) => ({ ...s, ligacoes: [...new Set([...s.ligacoes, lig.id, ...extra])] }))
        if (!atendeu) setTimeout(() => avisar(lig.quem, lig.recado, "#3d7bff"), 300)
        // a primeira ligação: em seguida ela escreve
        if (lig.id === "dbee-0") setTimeout(() => setTela({ t: "chat", id: "abertura", volta: { t: "corrida", destino: null } }), atendeu ? 600 : 2400)
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
      // no tutorial a primeira pessoa escreve (é ela que pergunta o nome)
      const modo = save.modos[quemChama] ?? (emTutorial(save) ? "texto" : sortearModo(save.ultimoModo))
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
  const etapaChama = quemChama ? etapaDe(save, quemChama) : null
  const criseDe = !save.nucleo.caido && quemChama && (etapaChama === "entrega" || etapaChama === "lugar") && save.pausas[quemChama] !== undefined
    && ROTEIROS[quemChama as keyof typeof ROTEIROS]?.passos[save.pausas[quemChama]!]?.t === "tarefa" ? quemChama : null
  // na carona: a pessoa já entrou na Kombi e a conversa ainda tá na 1ª parada
  // → a crise chega no caminho (uns 25 s depois, dirigindo)
  const passosChama = quemChama ? ROTEIROS[quemChama as keyof typeof ROTEIROS]?.passos : undefined
  const criseCarona = !save.nucleo.caido && quemChama && MISSOES[quemChama]?.carona && save.itens.includes(`carona:${quemChama}`)
    && save.pausas[quemChama] !== undefined && passosChama && save.pausas[quemChama] === passosChama.findIndex((x) => x.t === "lugar") ? quemChama : null
  const crise = criseDe ?? criseCarona
  useEffect(() => {
    if (!pronto || tela.t !== "corrida" || cinema || invasao || aoVivo || ligacao || !crise) return
    const t = setTimeout(() => setAoVivo(crise as ChatRoteiro), criseCarona ? 25000 : 2500)
    return () => clearTimeout(t)
  }, [pronto, tela.t, cinema, invasao, aoVivo, ligacao, crise, criseCarona])

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
  const emSala = (!!cena && temSala(cena.lugar)) || !!viagem || !!noPosto
  // entrou numa sala: a próxima estrada que montar retoma de onde parou;
  // foi pra outra tela (celular, início): a estrada começa do jeito normal
  const [emSalaAnt, setEmSalaAnt] = useState(emSala)
  if (emSala !== emSalaAnt) { setEmSalaAnt(emSala); if (emSala) setVoltaDaSala(true) }
  if (voltaDaSala && !emSala && tela.t !== "corrida" && tela.t !== "chegada") setVoltaDaSala(false)

  // a sala do lugar da missão começa a baixar enquanto a Kombi ainda está
  // longe (o beco também, quando ele fica liberado)
  const lugarDoAlvo = alvoAgora?.t === "lugar" ? alvoAgora.lugar : null
  useEffect(() => { if (lugarDoAlvo) precarregarSala(lugarDoAlvo) }, [lugarDoAlvo])
  // a estrada baixa em segundo plano assim que a tela inicial abriu
  useEffect(() => {
    const ir = () => { void import("./estrada/Corrida") }
    const w = window as Window & { requestIdleCallback?: (f: () => void) => number }
    if (w.requestIdleCallback) w.requestIdleCallback(ir)
    else setTimeout(ir, 1500)
  }, [])

  const apreender = useCallback(() => {
    setSave((s) => {
      const a = alvoDe(s, nivelDe(s))
      if (!a || a.t !== "entrega") return s
      const item = MISSOES[a.missao]?.busca?.item
      return item ? { ...s, itens: s.itens.filter((k) => !k.startsWith(`${item}:`)) } : s
    })
    track("mission_step", { mission_id: "linha-nucleo", step: "caca:pego", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil])

  // o beco (lugar secreto): libera depois do terraço da Notti, até achar o
  // relicário. Quantas voltas no mirante até ele aparecer depende do tom:
  // quem tá acordado vê de primeira; quem dorme dá três voltas
  const tomMaior = (["acordado", "acordando", "dormindo"] as const).reduce((a, b) => ((save.tons?.[b] ?? 0) > (save.tons?.[a] ?? 0) ? b : a), "dormindo" as "acordado" | "acordando" | "dormindo")
  // ep. 3: a delação derrubou a 222. Do chamado da D-Bee até a casa dela,
  // sem rádio e a cidade cinza (a provação: o silêncio mais longo do jogo)
  const apagao = save.pausas.ojala !== undefined && !save.objetos.includes("ojala")
  const becoLivre = save.objetos.includes("dopamina") && !(save.reliquias ?? []).includes("relicario")
  useEffect(() => { if (becoLivre) precarregarSala("beco") }, [becoLivre])
  const segredo = useMemo(() => (becoLivre ? { id: "beco" as LugarId, voltas: tomMaior === "acordado" ? 1 : tomMaior === "acordando" ? 2 : 3 } : null), [becoLivre, tomMaior])

  // encostou devagar na vaga do lugar da missão: a cena começa
  const abrirCena = useCallback((id: LugarId) => {
    // o tutorial: o pin do posto abre a bomba
    if (id === "posto" && irAoPosto(saveRef.current)) { abrirPostoRef.current(); return }
    // o tutorial: chegou na casa do Drewboy com o Mubarak de carona
    if (id === "casa-drewboy" && levarDrewboy(saveRef.current)) {
      setSave((s) => ({ ...s, tutorial: [...new Set([...(s.tutorial ?? []), "drewboy"])] }))
      track("mission_step", { mission_id: "linha-tutorial", step: "drewboy", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
      return
    }
    if (id === "beco") {
      const s = saveRef.current
      if (cinema || !s.objetos.includes("dopamina") || (s.reliquias ?? []).includes("relicario")) return
      setAoVivo(null)
      setCinema("lugar")
      setCena({ lugar: id, missao: "dopamina", pegar: false })
      track("mission_step", { mission_id: "linha-beco", step: "cena:beco", perfil: s.perfil ?? "?", fio_pos: -1 })
      return
    }
    const a = alvoDe(saveRef.current, nivelDe(saveRef.current))
    if (!a || a.t !== "lugar" || a.lugar !== id || cinema) return
    if (!cenaDe(id)) return
    setAoVivo(null)
    setCinema("lugar")
    // fora da cidade: primeiro a estrada (viagem.tsx), a cena é na chegada
    if (LUGARES[id].fora) setViagem({ lugar: id, missao: a.missao, pegar: a.pegar })
    else setCena({ lugar: id, missao: a.missao, pegar: a.pegar })
    track("mission_step", { mission_id: `linha-${a.missao}`, step: `cena:${id}`, perfil: saveRef.current.perfil ?? "?", fio_pos: saveRef.current.fio.indexOf(a.missao) })
  }, [cinema])
  const fimCena = useCallback((r: ResultadoCena) => {
    const c = cena
    setCena(null)
    setViagem(null)
    setCinema(null)
    if (!c) return
    const est = c.missao
    // escolha errada (o bar: beber): a missão fica aberta, nada se ganha, e o
    // mundo estranha (loops → Corrida)
    if (r.loop) {
      setSave((s) => ({ ...s, loops: { ...(s.loops ?? {}), [c.lugar]: (s.loops?.[c.lugar] ?? 0) + 1 }, copos: r.copo === undefined ? s.copos : [...new Set([...(s.copos ?? []), r.copo])] }))
      avisar("a noite voltou pro começo", "a missão continua aberta", "#ffc857")
      track("mission_step", { mission_id: `linha-${est}`, step: `loop:${c.lugar}`, perfil: saveRef.current.perfil ?? "?", fio_pos: saveRef.current.fio.indexOf(est) })
      return
    }
    setSave((s) => {
      let objetos = s.objetos
      let sinal = s.sinal
      if (r.objeto && !objetos.includes(r.objeto)) {
        objetos = [...objetos, r.objeto]
        // o mp3 do Mubarak pega frequência: enche o sinal da próxima rádio
        if (r.objeto === "copo") sinal = proximaFreq(s.sinal)?.custo ?? s.sinal
      }
      const pausas = { ...s.pausas }
      if (r.objeto) delete pausas[est]
      const itens = c.pegar && !s.itens.includes(`carona:${est}`) ? [...s.itens, `carona:${est}`] : s.itens
      const completos = r.objeto && !s.completos.includes(est) ? [...s.completos, est] : s.completos
      const reliquias = [...new Set([...(s.reliquias ?? []), ...r.reliquias])]
      const logs = r.objeto ? { ...s.logs, [est]: [...(s.logs[est] ?? []), { k: "sistema" as const, texto: `o resto aconteceu ${LUGARES[c.lugar].no}` }] } : s.logs
      // o violão ficou no trem (ep. 2): o app VIOLÃO tranca até o GUITAR DRIVER
      const violao = r.perdeViolao ? false : s.violao
      // acordar alguém rende NEON (a rede te devolve)
      const neon = (s.neon ?? 0) + (r.objeto ? NEON_POR_PESSOA : 0)
      return { ...s, objetos, sinal, pausas, itens, completos, reliquias, logs, violao, neon }
    })
    if (r.objeto) {
      track("mission_completed", { mission_id: `linha-${est}`, duration_ms: 0 })
      setTimeout(() => avisar(`+${NEON_POR_PESSOA} neon`, "a rede te devolve. gasta na loja de discos", "#ffc857"), 1200)
    }
    if (r.caca) {
      setPerseguido(true)
      setTimeout(() => setPerseguido(false), 60000)
    }
  }, [cena, avisar])

  // saiu da casa da D-Bee (a abertura): o tanque cheio, o tutorial começa.
  // O começo antigo (o grupo rolando, as ligações dbee-0/1, a abertura com o
  // quiz) não acontece: o grupo fica no histórico do N3XO, o violão (que tava
  // na casa) vem junto e a primeira pessoa é o Mubarak
  const fimInicio = useCallback(() => {
    setCena(null)
    setCinema(null)
    setSave((s) => {
      const grupo: Item[] = ROTEIROS.grupo.passos.flatMap((p): Item[] => (p.t === "msg" ? [{ k: "msg", texto: typeof p.texto === "string" ? p.texto : "", de: p.de }] : p.t === "nucleo" ? [{ k: "nucleo", texto: p.texto }] : p.t === "sistema" ? [{ k: "sistema", texto: p.texto }] : []))
      return {
        // (a missão do Mubarak NÃO vem aceita: a pessoa aceita no painel)
        ...s, casa: true, violao: true, tutorial: s.tutorial ?? [],
        // a D-Bee: o galão (despejado no tanque, dá pra chegar na cidade);
        // os 25 NEON caem na conta na cena ("toma aqui")
        tanque: GALAO, galao: "vazio",
        completos: [...new Set([...s.completos, "grupo" as const, "abertura" as const])],
        ligacoes: [...new Set([...s.ligacoes, "dbee-0", "dbee-1"])],
        logs: { ...s.logs, grupo },
      }
    })
    track("mission_step", { mission_id: "linha-inicio", step: "casa:fim", perfil: saveRef.current.perfil ?? "?", fio_pos: -1 })
  }, [])

  // a loja de discos: todo disco custa o mesmo em NEON
  const comprarDisco = (id: string) => {
    const s = saveRef.current
    if ((s.neon ?? 0) < PRECO_DISCO || (s.discos ?? []).includes(id)) return false
    setSave((x) => ({ ...x, neon: (x.neon ?? 0) - PRECO_DISCO, discos: [...(x.discos ?? []), id] }))
    track("mission_step", { mission_id: "linha-loja", step: `comprou:${id}`, perfil: s.perfil ?? "?", fio_pos: -1 })
    return true
  }

  const religar = useCallback(() => {
    setSave((s) => ({ ...s, sinal: s.sinal + 10, nucleo: { ...s.nucleo, caido: false } }))
    track("mission_step", { mission_id: "linha-nucleo", step: "antena:religou", perfil: save.perfil ?? "?", fio_pos: -1 })
  }, [save.perfil])

  // subir de nível é um momento — não um número mudando em silêncio
  const nivel = nivelDe(save)
  const listaMissoes = useMemo(() => {
    const l = abertas(save, nivel)
    // no tutorial, só a primeira pessoa (as outras abrem quando ele acaba)
    return emTutorial(save) ? (feito(save, "posto") ? l.filter((m) => m.id === PRIMEIRA) : []) : l
  }, [save, nivel])

  // o tutorial depois do bar: o Mubarak vai de carona até a casa do Drewboy
  const alvoTut: Alvo | null = irAoPosto(save) ? { t: "lugar", missao: "nectar", lugar: "posto", pegar: false }
    : levarDrewboy(save) ? { t: "lugar", missao: "copo", lugar: "casa-drewboy", pegar: false } : null
  // O POSTO: passou devagar em frente (ou o pin do tutorial). Da primeira
  // vez, o LU2CA tá lá (RASCUNHO das falas, a partir do que o LU2CA contou:
  // se impressiona com a Kombi, nunca te viu na cidade)
  useEffect(() => {
    abrirPostoRef.current = () => {
      if (cinema || cena || noPosto) return
      setAoVivo(null)
      setPainelMissoes(false)
      setNoPosto({ primeira: !(saveRef.current.tutorial ?? []).includes("lu2ca-posto") })
    }
  }, [cinema, cena, noPosto])
  const sairDoPosto = useCallback(() => {
    const primeira = noPosto?.primeira
    setNoPosto(null)
    // o item "Encha o tanque no posto" (e os +10) só conta saindo — lá dentro
    // o saldo tem que zerar no tanque (o galão dá "saldo insuficiente")
    setSave((x) => (emTutorial(x) && (x.tanque ?? 0) > 0.97 ? { ...x, tutorial: [...new Set([...(x.tutorial ?? []), "posto"])] } : x))
    if (primeira) {
      setSave((x) => ({ ...x, tutorial: [...new Set([...(x.tutorial ?? []), "lu2ca-posto"])] }))
      // a loja de discos chama (rascunho): o disco novo que ele falou
      setTimeout(() => avisar("LOJA DE DISCOS", "tem disco novo na prateleira · abre no celular", "#ffc857"), 2500)
    }
  }, [noPosto, avisar])
  const encherTanque = useCallback(() => setSave((s) => {
    if ((s.neon ?? 0) < PRECO_TANQUE || (s.tanque ?? 1) > 0.97) return s
    track("mission_step", { mission_id: "linha-posto", step: "tanque", perfil: s.perfil ?? "?", fio_pos: -1 })
    return { ...s, neon: (s.neon ?? 0) - PRECO_TANQUE, tanque: 1 }
  }), [])
  const encherGalao = () => setSave((s) => ((s.neon ?? 0) < PRECO_GALAO || s.galao !== "vazio" ? s : { ...s, neon: (s.neon ?? 0) - PRECO_GALAO, galao: "cheio" }))

  // a missão de agora e o resumo da caixa (no canto da tela)
  const missaoAgora = quemChama ? listaMissoes.find((m) => m.id === quemChama) ?? null : null
  const itemAgora = tut && blocoTut < BLOCOS.length ? BLOCOS[blocoTut].itens.find((i) => !feito(save, i)) ?? null : null
  // alguém escreveu e a conversa espera resposta no N3XO
  const esperaN3xo = !!quemChama && adiadas.includes(quemChama) && save.pausas[quemChama] === undefined
  const resumoMissao = esperaN3xo
    ? { rotulo: itemAgora ? BLOCOS[blocoTut].titulo : "missão", texto: `${getEstacao(quemChama!).personagem} te escreveu · responde no N3XO`, cor: getEstacao(quemChama!).cor }
    : itemAgora
    ? { rotulo: BLOCOS[blocoTut].titulo, texto: ITENS[itemAgora].texto, cor: blocoTut === 0 ? "#3d7bff" : getEstacao(PRIMEIRA).cor }
    : missaoAgora
    ? { rotulo: `missão · ${getEstacao(missaoAgora.id).personagem}`, texto: missaoAgora.texto, cor: getEstacao(missaoAgora.id).cor }
    : listaMissoes.length
    ? { rotulo: "missões", texto: "tem gente precisando de você", cor: "#ffc857" }
    : null

  // ── o TUTORIAL (tutorial.ts) ──
  // a D-Bee liga antes de cada bloco
  const ligaTut = tut && blocoTut < BLOCOS.length && !ligou(save, blocoTut)
  useEffect(() => {
    if (!pronto || !ligaTut || tela.t !== "corrida" || emSala || cinema || invasao || aoVivo || ligacao) return
    const lig = BLOCOS[blocoTut].lig
    if (!lig) return
    // a história: uns 10 s depois de sair da casa da D-Bee (mais natural)
    const t = setTimeout(() => setLigacao({ lig: LIGACOES[lig] }), blocoTut === 0 ? 10000 : 2500)
    return () => clearTimeout(t)
  }, [pronto, ligaTut, blocoTut, tela.t, emSala, cinema, invasao, aoVivo, ligacao])
  // a HISTÓRIA da D-Bee em partes (ligacoes.ts): a 2ª, a 3ª e a 4ª chegam
  // depois da 1ª, da 2ª e da 3ª missão (de volta na estrada, uns segundos depois)
  const proxHistoria = save.ligacoes.includes("dbee-historia-1")
    ? (["dbee-historia-2", "dbee-historia-3", "dbee-historia-4"] as const).find((id, k) => save.objetos.length >= k + 1 && !save.ligacoes.includes(id)) ?? null
    : null
  useEffect(() => {
    if (!pronto || !proxHistoria || tela.t !== "corrida" || emSala || cinema || invasao || aoVivo || ligacao) return
    const t = setTimeout(() => setLigacao({ lig: LIGACOES[proxHistoria] }), 8000)
    return () => clearTimeout(t)
  }, [pronto, proxHistoria, tela.t, emSala, cinema, invasao, aoVivo, ligacao])
  const marcarTut = useCallback((i: ItemTutorial) => setSave((s) => ((s.tutorial ?? []).includes(i) ? s : { ...s, tutorial: [...(s.tutorial ?? []), i] })), [])
  // cada item marcado: +10 NEON. Tudo feito: a cidade é sua
  const feitosTut = useRef<Set<ItemTutorial> | null>(null)
  useEffect(() => {
    if (!pronto || !tut) return
    const agora = new Set(BLOCOS.flatMap((b) => b.itens).filter((i) => feito(save, i)))
    const antes = feitosTut.current
    feitosTut.current = agora
    if (!antes) return
    const novo = [...agora].find((i) => !antes.has(i))
    // (sem cleanup: o save muda o tempo todo e não pode cancelar o aviso)
    // acordar alguém já tem o aviso dos 50 NEON: o do item vem depois
    if (novo) setTimeout(() => {
      setSave((s) => ({ ...s, neon: (s.neon ?? 0) + NEON_POR_ITEM }))
      avisar(`+${NEON_POR_ITEM} neon`, ITENS[novo].texto, "#ffc857")
    }, novo === "mubarak" ? 5600 : 900)
    if (novo && blocoAtual(save) >= BLOCOS.length) {
      setTimeout(() => {
        setSave((s) => ({ ...s, tutorial: [...new Set([...(s.tutorial ?? []), "fim"])], foco: undefined }))
        avisar("a cidade é sua", "tem gente esperando em cada canto. as missões tão abertas", "#ffc857")
        track("mission_completed", { mission_id: "linha-tutorial", duration_ms: 0 })
      }, 5600)
    }
  }, [save, pronto, tut, avisar])
  const irAgora = (m: (typeof listaMissoes)[number]) => {
    setPainelMissoes(false)
    // quem estava chamando e não é a escolhida espera (chama de novo depois)
    if (aoVivo && aoVivo !== m.id) setAoVivo(null)
    // aceitar (06/10, LU2CA): sem corte — a missão vira a selecionada e o
    // lugar fica marcado no mapa; o caminho é a pessoa que faz
    setSave((s) => ({ ...s, foco: m.id }))
    avisar("missão aceita", m.texto, getEstacao(m.id).cor)
    track("mission_step", { mission_id: `linha-${m.id}`, step: "aceitar", perfil: save.perfil ?? "?", fio_pos: save.fio.indexOf(m.id) })
  }
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
        avisar(novos.map((l) => l.nome).join(" + "), `completo · +${luz} neon`, "#ffc857")
      }, 0)
      return { ...s, legado: [...s.legado, ...novos.map((l) => l.id)], neon: (s.neon ?? 0) + luz, sinal: s.sinal + sinal }
    })
  }, [avisar])

  // já fez o quiz = está dentro da cidade
  const dentro = !!save.estacao || !!save.casa

  const entrar = () => {
    audioCtx()
    ligarChuva()
    if (dentro) {
      // a Kombi é a tela principal: entra direto na estrada
      player.pausar()
      setTela({ t: "corrida", destino: null })
      conferirLegado()
    } else if (save.pausas.abertura !== undefined) {
      // voltou da leitura NECTAR: a D-Bee continua de onde parou
      setTela({ t: "chat", id: "abertura", volta: { t: "home" } })
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
    } else if (!save.casa) {
      // primeira vez: a abertura, no deserto do mapa (Corrida, abertura).
      // A primeira coisa: o toca-discos liga com os discos antigos (LU2CA)
      fonteSom.set("disco")
      disco.tocarLista(ACERVO.faixas.map((f) => f.src))
      setEstrada(true)
      setTela({ t: "corrida", destino: null })
    } else {
      // já passou pela casa: entra na cidade de Kombi, não pelo celular
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
    // (o violão vem da D-Bee, no fim da leitura NECTAR)
    if (a.precisa && !(a.id === "violao" ? save.violao : save.objetos.includes(a.precisa))) {
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
  const adiarPainel = useCallback(() => {
    setAoVivo((id) => {
      if (id) setAdiadas((a) => (a.includes(id) ? a : [...a, id]))
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
    if (id === "abertura") {
      setCinema(null)
      setCinza(false)
      // a D-Bee te soltou na cidade: já mostra quem precisa de você
      setTimeout(() => setPainelMissoes(true), 1800)
    }
    // leu o grupo na chegada: volta pra Kombi (a D-Bee liga daqui a pouco)
    if (id === "grupo" && !save.completos.includes("abertura")) return setTela({ t: "corrida", destino: null })
    // pausa: a conversa pediu uma coisa que está no mapa
    // "pegar a kombi" JÁ é aceitar a missão: vai direto, e o som que tava
    // tocando (o vinil) segue sem cortar
    if (para === "estrada") {
      return setTela({ t: "corrida", destino: null })
    }
    if (ESTACOES.some((e) => e.id === id)) track("mission_completed", { mission_id: `linha-${id}`, duration_ms: 0 })
    // o fim da linha: quando as seis missões estão feitas (não mais ao fechar
    // a do LU2CA, que agora é a primeira)
    const feitos = new Set([...saveRef.current.objetos, ...(ESTACOES.some((e) => e.id === id) ? [id as EstacaoId] : [])])
    if (ESTACOES.some((e) => e.id === id) && feitos.size >= 6) setTela({ t: "final" })
    // o grupo acabou: a D-Bee chama no privado
    else if (para === "abertura") setTela({ t: "chat", id: "abertura", volta })
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
    void st
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
  // o celular aberto por cima da estrada: a Kombi segue sozinha, devagar
  const celularAberto = estrada && (tela.t === "home" || tela.t === "app" || tela.t === "chat")

  return (
    <div className="l-raiz">
      <div className="l-palco">
        {/* camada de baixo: a estrada (pausa quando o celular está aberto) */}
        {(estrada || tela.t === "corrida") && !emSala && (
          <Corrida
            save={save}
            nivel={nivel}
            destino={tela.t === "corrida" ? tela.destino : destinoEstrada}
            pausado={tela.t !== "corrida" && tela.t !== "chegada" && !celularAberto}
            celular={celularAberto}
            retomar={voltaDaSala}
            teleporte={teleporte}
            abertura={!save.casa}
            onAbertura={() => { setCinema("lugar"); setCena({ lugar: "casa-dbee", missao: "ojala", pegar: false, inicio: true }) }}
            onArea={(id) => { if (id === "circuito:linha" && emTutorial(saveRef.current)) marcarTut("tanque") }}
            limitado={!!invasao}
            cacado={cacado || perseguido}
            conversa={!!aoVivo}
            onBifurca={setBifurcando}
            dicas={save.dicas}
            onDica={(d) => setSave((s) => (s.dicas.includes(d) ? s : { ...s, dicas: [...s.dicas, d] }))}
            onApreendido={apreender}
            caido={save.nucleo.caido}
            onReligar={religar}
            onSinal={(total, freq) => setSave((s) => ({ ...s, sinal: total, freq: freq ?? s.freq }))}
            alvo={save.nucleo.caido ? null : alvoTut ?? alvoDe(save, nivel)}
            levando={levarDrewboy(save) ? "copo" : null}
            tanque={save.tanque ?? 1}
            onTanque={(n) => setSave((s) => (Math.abs((s.tanque ?? 1) - n) < 0.005 ? s : { ...s, tanque: n }))}
            onPosto={() => abrirPostoRef.current()}
            onPegar={(k) => setSave((s) => (s.itens.includes(k) ? s : { ...s, itens: [...s.itens, k] }))}
            avisos={chamados(save, nivel).filter((c) => c.id === "ecos" || c.id === "antena" || c.id.startsWith("est-")).length}
            onDescer={descer}
            onSair={sairDaCorrida}
            onVaga={abrirCena}
            segredo={segredo}
            cenaLugar={cena?.lugar ?? null}
            intro={!save.completos.includes("abertura")}
            fala={falaIntro}
            onIlha={() => {
              // o grupo rolando: abre a conversa inteira; depois disso, a
              // ilha abre o celular (como o ícone)
              if (introGrupo !== null) {
                setIntroGrupo(null)
                setTela({ t: "chat", id: "grupo", volta: { t: "corrida", destino: null } })
              } else sairDaCorrida()
            }}
            onVolta={(t) => setSave((s) => ({ ...s, melhorVolta: s.melhorVolta ? Math.min(s.melhorVolta, t) : t }))}
            cinema={cinema}
            cinza={cinza}
            noiteRepete={save.objetos.includes("copo") ? 0 : (save.loops?.bar ?? 0)}
            foraDoAr={apagao}
          />
        )}
        {/* AS MISSÕES NUMA CAIXA SÓ (LU2CA, 05/10): no canto, o que fazer agora
            e a bolinha com quantas estão abertas; tocando, a atual (ou a
            checklist do tutorial) e as disponíveis */}
        {tela.t === "corrida" && !emSala && !cinema && !painelMissoes && resumoMissao && (
          <button type="button" className="l-caixa-missao" style={{ ["--cor" as string]: resumoMissao.cor }} onClick={() => setPainelMissoes(true)}>
            <small>{resumoMissao.rotulo}</small>
            <b>{resumoMissao.texto}</b>
            {listaMissoes.length > 0 && <em aria-label={`${listaMissoes.length} missões`}>{listaMissoes.length}</em>}
          </button>
        )}
        {painelMissoes && !ligacao && tela.t === "corrida" && !emSala && (
          <div className="l-missoes" role="dialog" aria-label="Missões">
            <header><b>missões</b><button type="button" onClick={() => setPainelMissoes(false)} aria-label="Fechar">×</button></header>
            {tut ? (
              <section className="l-missoes-agora">
                <small>{BLOCOS[Math.min(blocoTut, BLOCOS.length - 1)].titulo}</small>
                <ul className="l-missoes-check">
                  {BLOCOS[Math.min(blocoTut, BLOCOS.length - 1)].itens.map((i) => (
                    <li key={i} className={feito(save, i) ? "is-ok" : ""}><i aria-hidden="true">{feito(save, i) ? "✓" : ""}</i>{ITENS[i].texto}</li>
                  ))}
                </ul>
              </section>
            ) : missaoAgora ? (
              <section className="l-missoes-agora" style={{ ["--cor" as string]: getEstacao(missaoAgora.id).cor }}>
                <small>agora · {getEstacao(missaoAgora.id).personagem}</small>
                <p>{missaoAgora.texto}</p>
              </section>
            ) : null}
            {listaMissoes.length > 0 && <small className="l-missoes-sub">disponíveis</small>}
            <ul>
              {listaMissoes.map((m) => {
                const e = getEstacao(m.id)
                return (
                  <li key={m.id} style={{ ["--cor" as string]: e.cor }}>
                    <span className="l-missoes-quem">{e.personagem}<small>{m.etapa === "chamado" ? "quer falar com você" : m.etapa === "busca" ? "buscar no mapa" : m.etapa === "pegar" ? "buscar alguém" : "te espera"}</small></span>
                    <p>{m.texto}</p>
                    {save.foco === m.id ? <em className="l-missoes-sel">selecionada</em> : <button type="button" onClick={() => irAgora(m)}>aceitar</button>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {noPosto && (
          <>
            <Interior key="sala:posto" lugar="posto" objetos={save.objetos} />
            <PostoDentro
              primeira={noPosto.primeira}
              neon={save.neon ?? 0}
              tanque={save.tanque ?? 1}
              galao={save.galao}
              precoTanque={PRECO_TANQUE}
              precoGalao={PRECO_GALAO}
              onEncherTanque={encherTanque}
              onEncherGalao={encherGalao}
              onPresente={(n) => setSave((x) => ({ ...x, neon: (x.neon ?? 0) + n }))}
              onSair={sairDoPosto}
            />
          </>
        )}
        {tela.t === "chegada" && (
          <Chegada
            onParar={() => setCinema("parando")}
            onCinza={() => setCinza(true)}
            onAbrir={() => {
              setCinema(null)
              // a cor volta aqui: o cinza é só o susto da chegada
              setTimeout(() => setCinza(false), 2500)
              setTela({ t: "corrida", destino: null })
              if (!save.completos.includes("grupo")) setIntroGrupo(0)
            }}
          />
        )}
        {tela.t === "entrada" && <Entrada save={save} onEntrar={entrar} />}
        {tela.t === "bloqueio" && <Bloqueio onAbrir={() => setTela({ t: "chat", id: save.completos.includes("grupo") ? "abertura" : "grupo", volta: { t: "home" } })} />}
        {(tela.t === "chat" || aoVivo) && (
          <Chat
            key={tela.t === "chat" ? tela.id : aoVivo!}
            id={tela.t === "chat" ? tela.id : aoVivo!}
            modo={tela.t === "chat" ? "tela" : "painel"}
            save={save}
            atualizar={atualizar}
            // (06/10, LU2CA: o dinheiro começa do zero — só missão completa
            // paga aqui; responder, ligar e provas não dão NEON)
            onXp={(n, motivo) => { if (motivo === "objeto" || motivo === "estação") setSave((s) => ({ ...s, neon: (s.neon ?? 0) + n })) }}
            onFim={tela.t === "chat" ? (para) => fimChat(tela.id, para, tela.volta) : fimPainel}
            onVoltar={tela.t === "chat" && dentro ? () => setTela(tela.volta) : undefined}
            onPrecisaTela={painelPraTela}
            onAdiar={tela.t === "chat" ? undefined : adiarPainel}
            onLoop={(v) => { setRotaLoop(v ? `/tiktok/feed?v=${v}` : undefined); abrirApp("loop") }}
            jeito={save.modos[(tela.t === "chat" ? tela.id : aoVivo) as EstacaoId] === "audio" ? "audio" : "texto"}
            naEstacao={tela.t === "chat" && naEstacao}
            oculto={(tela.t !== "chat" && tela.t !== "corrida") || (tela.t === "corrida" && bifurcando)}
          />
        )}
        {tela.t === "home" && (
          <Home
            save={save}
            nivel={nivel}
            onApp={abrirApp}
            onChamado={onChamado}
            radioTocando={radio}
            onRadioToggle={() => {
              if (radio?.tocando) return fonteSom.set("off")
              fonteSom.set("radio") // o disco para: os dois juntos não
              tocarRadio((save.freq as FreqId) || "linha")
            }}
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
            }}
          />
        )}
        {tela.t === "app" && tela.id === "jardim" && (
          <Jardim save={save} atualizar={atualizar} onVoltar={() => setTela({ t: "home" })} />
        )}
        {tela.t === "app" && tela.id === "violao" && <Violao onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "loja" && <Loja save={save} comprar={comprarDisco} onVoltar={() => setTela({ t: "home" })} />}
        {tela.t === "app" && tela.id === "objetos" && (
          <Objetos save={save} onVoltar={() => setTela({ t: "home" })} onChat={(id) => abrirChat(id, { t: "app", id: "objetos" })} onUsarGalao={() => setSave((s) => (s.galao === "cheio" ? { ...s, galao: "vazio", tanque: Math.min(1, (s.tanque ?? 0) + GALAO) } : s))} />
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
        {cena && cenaDe(cena.lugar) && (
          <Interior key={`sala:${cena.lugar}`} lugar={cena.lugar} objetos={save.objetos} inicio={!!cena.inicio} copos={save.copos} />
        )}
        {cena && (
          <CenaLugar
            key={`${cena.lugar}:${cena.missao}:${cena.inicio ? "inicio" : ""}`}
            gestos3d={GESTOS_3D[cena.lugar] ?? []}
            loops={save.loops?.[cena.lugar] ?? 0}
            cena={cena.inicio ? CENA_INICIO : cenaDe(cena.lugar)!}
            memoria={save.objetos.length}
            objetos={save.objetos}
            reliquias={(save.reliquias ?? []) as Reliquia[]}
            tom={tomMaior}
            semSom={semSom}
            onLinha={(texto) => setSave((s) => ({ ...s, linha: texto }))}
            onTom={(tom) => setSave((s) => ({ ...s, tons: { ...s.tons, [tom]: (s.tons?.[tom] ?? 0) + 1 } }))}
            onFim={cena.inicio ? fimInicio : fimCena}
            onNeon={(n) => setSave((s) => ({ ...s, neon: (s.neon ?? 0) + n }))}
          />
        )}
        {viagem && (
          <Viagem
            chegou={!!viagem.chegou}
            onFim={() => {
              // com a sala por dentro, a estrada some; sem ela, fica de fundo
              setViagem(temSala(viagem.lugar) ? null : { ...viagem, chegou: true })
              setCena({ lugar: viagem.lugar, missao: viagem.missao, pegar: viagem.pegar })
            }}
          />
        )}
        {ligacao && <LigacaoNaKombi key={ligacao.lig.id} lig={ligacao.lig} onFim={fimLigacao} onTom={(tom) => setSave((s) => ({ ...s, tons: { ...s.tons, [tom]: (s.tons?.[tom] ?? 0) + 1 } }))} />}
        {invasao && <InvasaoNucleo key={invasao.id} inv={invasao} onFim={fimInvasao} />}
        {aviso && (
          <div key={`aviso-${aviso.id}`} className="l-aviso" style={{ ["--cor" as string]: aviso.cor }}>
            <b>{aviso.titulo}</b>
            <span>{aviso.texto}</span>
          </div>
        )}
        {xpFlutua && tela.t !== "corrida" && <div key={`xp-${xpFlutua.id}`} className="l-xp-flutua">+{xpFlutua.n} neon</div>}
      </div>
    </div>
  )
}

