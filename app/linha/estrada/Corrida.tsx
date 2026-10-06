"use client"

// A corrida da Linha 222, em 3D — jogabilidade inspirada no Horizon Drive
// (Shopify, R3F): a Kombi vive em coordenadas da via (u = distância,
// x = lateral), sem motor de física. Pista larga, curvas inclinadas como
// pista de corrida, parede macia (raspa e segue, nunca trava), pulos nas
// rampas, turbo no chão, orbs em colares, confete.
//
// O mapa é feito de lugares (ver mundo.ts): cada frequência da rádio tem o
// seu circuito, na sua altura, com a sua cara. Você fica ali, ouvindo
// aquela rádio, volta após volta. No fim de cada volta a pista abre numa
// bifurcação de três: uma saída de cada lado, o meio fica — e no meio da
// saída a rádio sintoniza a do destino.
// Rádio trancada = faixa com barreira até juntar sinal na estrada.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useGLTF } from "@react-three/drei"
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cupula, Kombi222 } from "./Kombi222"
import { Cabine, OLHO } from "./Cabine"
import { Cinema } from "./Cinema"
import { Seguro } from "./Seguro"
import { Suburbio } from "./Suburbio"
import { KombiHerbal } from "./KombiHerbal"
import { Capa } from "../capa"
import { discosDaKombi } from "../discos"
import { Metro, montarMetro } from "./Metro"
import { LUGARES, VAGA, type LugarId } from "../lugares"
import { Lugares, poseLugar, type PoseLugar } from "./Lugares"
import { ESTACOES, dataCurta, estacao as getEstacao, lancada, missao, type EstacaoId } from "../data"
import { VOZES } from "../roteiros"
import { VINIS, FREQUENCIAS, freqsLiberadas, proximaFreq, type FreqId, type Frequencia } from "../radio"
import { TODAS_FAIXAS, ehDoLugar, proxima } from "../programa"
import type { Save } from "../estado"
import { chiadoCamera, chiadoCurto, disco, estatica, fonteSom, gota, nomeDoTom, player, tomDaMusica, vento, type Fonte } from "../som"
import { MARCHAS, montarMotor, tremor, vib } from "../som-carro"
import { MEIA, PASSO, amostra, du, mundo as noMundo, novaAmostra, pontoI, suave, type Pista } from "./pista"
import { ABRE, CK, FAIXA, distritoDe, montarMundo, rumo, saidaEm, territorio, type Faixa, type Mundo, type Via } from "./mundo"
import { MISSOES, areaDaMissao, areaDoPasso, type Alvo } from "../missoes"
import { fita, texAsfalto, texBrilho, texJanelas, texTexto, texTurbo } from "./geo"
import { DISTRITOS, hexRgb, type Distrito } from "./distritos"

const VMAX = 46 // m/s
// drift: velocidade mínima pra finta derrubar a aderência, quanto peso tem
// que estar carregado no lado de fora, e o ângulo máximo da carroceria
const VDRIFT = 20 // ~72 km/h
const PESO_FINTA = 0.3
const DERIVA_MAX = 0.95 // ~54°
// fumaça nas rodas no drift: desligada — o Horizon não tem (prints do
// LU2CA, 02/10); fica o código caso queira de volta
const FUMACA = false
const VTURBO = 62
const ACEL = 11
const FREIO = 26
const G = 24

export interface Stats {
  tempo: number
  vmax: number
  orbs: number
  quase: number
  sinal: number
  ar: number
  voltas: number
}

interface Props {
  save: Save
  nivel: number
  destino: EstacaoId | null
  // pra onde a missão manda agora (buscar uma coisa num lugar, ou levar na estação)
  alvo?: Alvo | null
  onPegar?: (chave: string) => void
  // quantas coisas te chamando no celular (bolinha no ícone)
  avisos?: number
  // celular aberto por cima: a estrada congela (e continua dali ao fechar)
  pausado?: boolean
  // o Núcleo invadindo: a estrada segue, mas ele limita o motor
  limitado?: boolean
  // carregando contrabando (o item da missão, ou alguém de carona): os carros
  // brancos do Núcleo caçam a Kombi. Pego = a coisa volta pro lugar de origem
  cacado?: boolean
  onApreendido?: () => void
  // tem conversa rolando no painel (ela ocupa a ilha)
  conversa?: boolean
  // a ilha virou bifurcação: a conversa se recolhe enquanto isso
  onBifurca?: (b: boolean) => void
  // dicas que o jogo já deu (tutorial do rádio × toca-discos)
  dicas?: string[]
  onDica?: (id: string) => void
  // o Núcleo derrubou a 222: sem rádio, cidade cinza, missão = religar a antena
  caido?: boolean
  onReligar?: () => void
  onSinal: (total: number, freq?: FreqId) => void
  onDescer: (id: EstacaoId, s: Stats) => void
  onSair: (s: Stats) => void
  onVolta?: (tempo: number) => void
  // abertura: a Kombi anda sozinha pela cidade, sem HUD, câmera de cinema
  // ("rodando"); "parando" encosta e estaciona. Sem cinema = jogo normal.
  cinema?: Cinema
  // a cidade sem cor (o Núcleo apagou tudo) — sem derrubar a 222
  cinza?: boolean
  // a chegada (antes da D-Bee): a cidade fica quieta (sem falas soltas nem
  // tutorial) e quem fala na ilha é o grupo, de fora (fala)
  intro?: boolean
  fala?: { id: number; de: string; texto: string } | null
  // tocar na ilha quando ela mostra uma mensagem
  onIlha?: () => void
  // encostou devagar na vaga de um lugar (a cena começa)
  onVaga?: (id: LugarId) => void
  // o lugar secreto liberado (o beco): aparece depois de `voltas` passadas
  segredo?: { id: LugarId; voltas: number } | null
  // a 222 saiu do ar (ep. 3, a delação): sem rádio até o fim da missão
  foraDoAr?: boolean
  // saiu do bar errado N vezes: o mundo repete a noite (mais bonito, mais vazio)
  noiteRepete?: number
  // voltando de uma sala: reaparece onde estava
  retomar?: boolean
  // "ir agora" do painel MISSÕES: corta pra perto do lugar (chave muda = vai)
  teleporte?: { chave: number; area: FreqId; lugar?: LugarId; frac?: number } | null
  // A ABERTURA (05/10, LU2CA): o jogo começa no deserto, uns metros antes da
  // casa da D-Bee, com o combustível na reserva. Ele acaba em frente à casa;
  // a pessoa desce e anda até a porta (onAbertura = chegou na porta)
  abertura?: boolean
  onAbertura?: () => void
  // mudou de via (o id: "circuito:linha", "deserto"…)
  onArea?: (id: string) => void
  // a cena de um lugar está rolando: a câmera de cinema olha pra ele
  cenaLugar?: LugarId | null
}

export type Cinema = "rodando" | "parando" | "lugar" | null
const VCINEMA = 22 // m/s: de boa, ~80 km/h

type Jogo = {
  via: number
  u: number; x: number; v: number; vx: number; steer: number
  y: number; vy: number; ar: boolean; tAr: number
  turboT: number; carga: number; shake: number; flash: number
  // drift: ângulo da carroceria em relação a pra onde ela anda (rad), a
  // velocidade com que esse ângulo gira, o lado do drift (0 = com
  // aderência), o peso carregado num lado (a "mola" da finta), o último lado
  // apertado e quanto tempo de drift de verdade (vira mini-turbo)
  deriva: number; giro: number; drift: 0 | 1 | -1; peso: number; ladoAnt: number; driftT: number
  // caça do Núcleo: distância do carro branco mais perto (m, atrás)
  cacaGap?: number
  // chegada num lugar novo: a música nova entra de uma vez, com o cenário
  impacto: number; soco: boolean
  tempo: number; voltaIni: number; voltas: number
  chegando: boolean; parado: boolean; encaixar?: boolean
  sintonizou: boolean
  // bifurcação: o lado que a pessoa marcou (0 = fica) e em qual divisão
  escolha: 0 | 1 | -1; escolhaU: number
  st: Stats
  pegos: Set<number>
  // a vaga do lugar da missão: já avisou que tá chegando? já encostou?
  vagaAvisou?: string
  naVaga?: string | false // em qual vaga já encostou (não reabre a cena parado nela)
  segAnt?: number
  segPassou?: number
  naSeg?: boolean
}

// ponto de busca de uma missão no mapa (a coluna de luz com a coisa)
export type Marco = { chave: string; via: number; u: number; cor: string }

type Evs = {
  via: (i: number) => void
  vaga: (id: LugarId) => void
  radio: (id: FreqId) => void
  falar: (de: string, t: string) => void
  popup: (t: string, cor: string) => void
  sinal: (n: number, rotulo: string, cor: string) => void
  portal: (id: EstacaoId) => void
  pegar: (chave: string) => void
  caca: (e: "comecou" | "pego" | "despistou" | "perdeu" | "fim") => void
  chegou: () => void
  volta: (t: number) => void
  hud: (j: Jogo) => void
}

// toqueE/toqueD: um toque de cada lado, guardado até o próximo quadro (um
// toque mais curto que um quadro não pode se perder — é ele que marca a
// saída na bifurcação)
// gas: acelerador (no computador é manual; no celular é automático)
// freio: freia e, parada, dá ré. Drift não tem botão: é a finta (ver Cena)
type Input = { esq: boolean; dir: boolean; gas: boolean; freio: boolean; turbo: boolean; toqueE: boolean; toqueD: boolean }
const VRE = 15 // ré: m/s
// celular: acelerador automático (dois polegares já cuidam de virar/drift/ré)
const toqueTela = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches

const freqDe = (id: FreqId) => FREQUENCIAS.find((f) => f.id === id)!
const lugarDe = (d: FreqId) => territorio(d).lugar
const praDe = (d: FreqId) => territorio(d).pra
// saída aberta = rádio do destino já destravada
const aberta = (f: Faixa, nLib: number) => FREQUENCIAS.findIndex((x) => x.id === f.para) < nLib

type Garfo = { via: number; u: number; esq?: Faixa; dir?: Faixa }
type ItemGuia = { k: string; d: number; cor: string; rot: string; tipo: "estacao" | "alvo" | "garfo" | "chegada" | "item" }

export function Corrida({ save, nivel, destino: destinoInicial, alvo = null, onPegar, avisos = 0, pausado = false, limitado = false, cacado = false, onApreendido, dicas = [], onDica, conversa = false, onBifurca, caido = false, onReligar, onSinal, onDescer, onSair, onVolta, cinema = null, cinza = false, intro = false, fala = null, onIlha, onVaga, cenaLugar = null, segredo = null, foraDoAr = false, noiteRepete = 0, retomar = false, teleporte = null, abertura = false, onAbertura, onArea }: Props) {
  const M = useMemo(() => mundo(), [])
  // voltando de uma sala: a Kombi reaparece onde estava (RETOMAR, guardado ao desmontar)
  const [retomada] = useState(() => (retomar ? RETOMAR : null))
  useEffect(() => { RETOMAR = null }, [])
  const centro = M.vias[M.circuito.linha]
  const [fonte, setFonte] = useState(false)
  // levando a coisa pra estação = a estação vira o destino
  const [destino, setDestino] = useState<EstacaoId | null>(destinoInicial ?? (alvo && (alvo.t === "entrega" || alvo.t === "visita") ? alvo.missao : null))
  const destinoRef = useRef(destino)
  useEffect(() => { destinoRef.current = destino }, [destino])
  const alvoRef = useRef(alvo)
  useEffect(() => { alvoRef.current = alvo }, [alvo])
  const alvoChave = alvo ? `${alvo.t}:${alvo.missao}:${alvo.t === "busca" ? alvo.faltam.join(",") : ""}` : ""
  const missaoAlvo = alvo ? MISSOES[alvo.missao] ?? null : null
  // onde a missão manda: o lugar da busca, ou o centro (onde moram as estações)
  const lugarAlvo: FreqId | null = caido ? "linha" : alvo ? (alvo.t === "busca" ? alvo.busca.onde : alvo.t === "lugar" ? LUGARES[alvo.lugar].area : "linha") : null
  // os lugares da cidade: onde fica cada um (fachada, vaga, câmera)
  const poses = useMemo(() => Object.fromEntries(Object.values(LUGARES).map((l) => [l.id, poseLugar(M, l)])) as Record<LugarId, PoseLugar>, [M])
  const lugarDaMissao: LugarId | null = !caido && alvo?.t === "lugar" ? alvo.lugar : null
  // a vaga que vale agora (encostar nela começa a cena)
  const vagaRef = useRef<{ id: LugarId; via: number; u: number; lado: 1 | -1; nome: string; cor: string; quem: string } | null>(null)
  useEffect(() => {
    if (!lugarDaMissao) { vagaRef.current = null; return }
    const l = LUGARES[lugarDaMissao]
    const p = poses[lugarDaMissao]
    vagaRef.current = { id: l.id, via: p.via, u: l.u, lado: l.lado, nome: l.nome, cor: l.cor, quem: l.gente[0]?.quem ?? "" }
  }, [lugarDaMissao, poses])
  // o lugar secreto: sem aviso nem guia; a Cena conta as passadas
  const segredoRef = useRef<{ id: LugarId; via: number; u: number; lado: 1 | -1; voltas: number } | null>(null)
  const segId = segredo?.id ?? null
  const segVoltas = segredo?.voltas ?? 0
  useEffect(() => {
    if (!segId) { segredoRef.current = null; return }
    const p = poses[segId]
    segredoRef.current = { id: segId, via: p.via, u: p.u, lado: p.lado, voltas: segVoltas }
  }, [segId, segVoltas, poses])
  const camLugarRef = useRef<PoseLugar | null>(null)
  useEffect(() => { camLugarRef.current = cenaLugar ? poses[cenaLugar] : null }, [cenaLugar, poses])
  const conversaRef = useRef(conversa)
  useEffect(() => { conversaRef.current = conversa }, [conversa])
  const caidoRef = useRef(caido)
  useEffect(() => { caidoRef.current = caido }, [caido])
  const foraRef = useRef(foraDoAr)
  useEffect(() => { foraRef.current = foraDoAr }, [foraDoAr])
  const lugarAlvoRef = useRef(lugarAlvo)
  useEffect(() => { lugarAlvoRef.current = lugarAlvo }, [lugarAlvo])
  const marcos = useMemo<Marco[]>(() => {
    // a antena da 222: no centro, um terço do caminho
    if (caido) {
      const C = M.vias[M.circuito.linha]
      return [{ chave: "antena", via: M.circuito.linha, u: C.livre[0] + 0.33 * (C.livre[1] - C.livre[0]), cor: "#e6f0ff" }]
    }
    if (!alvo || alvo.t !== "busca") return []
    const vi = M.circuito[alvo.busca.onde]
    const C = M.vias[vi]
    const cor = getEstacao(alvo.missao).cor
    return alvo.faltam.map((k) => ({ chave: `${alvo.busca.item}:${k}`, via: vi, u: C.livre[0] + alvo.busca.em[k] * (C.livre[1] - C.livre[0]), cor }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [M, alvoChave, caido])
  const marcosRef = useRef(marcos)
  useEffect(() => { marcosRef.current = marcos }, [marcos])
  // a busca terminou no meio da corrida: a estação vira destino na hora.
  // E o contrário: a missão virou busca (a pessoa já falou com quem chamou
  // e pegou a Kombi) — a estação deixa de ser destino, senão a Kombi leva
  // de volta lá pra "descer" e confirmar de novo
  useEffect(() => {
    if ((alvo?.t === "busca" || alvo?.t === "lugar") && destinoRef.current === alvo.missao) setDestino(null)
    if (alvo && (alvo.t === "entrega" || alvo.t === "visita") && !destinoRef.current) setDestino(alvo.missao)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoChave])

  const input = useRef<Input>({ esq: false, dir: false, gas: false, freio: false, turbo: false, toqueE: false, toqueD: false })
  const [jogo0] = useState(() => retomarJogo(M, retomada) ?? novoJogo(M, destino, save.estacao, abertura))
  // a abertura: onde a casa fica e em que pé a pessoa está
  const casaPose = poses["casa-dbee"]
  const aberturaRef = useRef<Abertura>({ ativa: abertura, via: casaPose.via, u: LUGARES["casa-dbee"].u, porta: new THREE.Vector3(casaPose.porta.x, casaPose.vaga.y, casaPose.porta.z), fase: "dirige", pe: 0, semGas: false, t0: 0, de: null, onPorta: () => {} })
  const onAberturaRef = useRef(onAbertura)
  useEffect(() => { onAberturaRef.current = onAbertura }, [onAbertura])
  const onAreaRef = useRef(onArea)
  useEffect(() => { onAreaRef.current = onArea }, [onArea])
  useEffect(() => {
    aberturaRef.current.ativa = abertura
    aberturaRef.current.onPorta = () => onAberturaRef.current?.()
  }, [abertura])
  // o que a tela mostra da abertura (o tanque, a dica de andar)
  const [abFase, setAbFase] = useState<{ fase: Abertura["fase"]; semGas: boolean }>({ fase: "dirige", semGas: false })
  useEffect(() => {
    if (!abertura) return
    const iv = setInterval(() => {
      const a = aberturaRef.current
      setAbFase((x) => (x.fase === a.fase && x.semGas === a.semGas ? x : { fase: a.fase, semGas: a.semGas }))
    }, 200)
    // silêncio absoluto: só o vento (e o motor)
    const w = vento()
    return () => { clearInterval(iv); w?.parar() }
  }, [abertura])
  const jogo = useRef<Jogo>(jogo0)
  // ao sair da tela, guarda onde a Kombi estava
  useEffect(() => () => {
    const j = jogo.current
    RETOMAR = { via: M.vias[j.via].id, u: j.u, x: j.x, naVaga: j.naVaga, naSeg: j.naSeg }
  }, [M])
  const cinemaRef = useRef<Cinema>(cinema)
  useEffect(() => { cinemaRef.current = cinema }, [cinema])
  const hudVel = useRef<HTMLSpanElement>(null)
  const hudMarcha = useRef<HTMLSpanElement>(null)
  const hudProg = useRef<HTMLDivElement>(null)
  const hudSinal = useRef<HTMLDivElement>(null)
  const hudTurbo = useRef<HTMLDivElement>(null)
  const hudRota = useRef<HTMLSpanElement>(null)
  const hudGarfoM = useRef<HTMLElement>(null)
  const hudGarfoT = useRef<HTMLSpanElement>(null)
  const hudParado = useRef<HTMLDivElement>(null)
  const garfoEls = useRef<(HTMLDivElement | null)[]>([])
  const garfoChave = useRef("")
  const [garfo, setGarfo] = useState<Garfo | null>(null)
  useEffect(() => { onBifurca?.(!!garfo) }, [garfo, onBifurca])
  // etiquetas das placas: em cada área, quem tem missão em aberto lá (a
  // começar: onde está a coisa; começada: onde é o próximo passo)
  const tagsArea = useMemo(() => {
    const out: Partial<Record<FreqId, { nome: string; cor: string }[]>> = {}
    for (const e of ESTACOES) {
      const m = MISSOES[e.id]
      if (!m || save.objetos.includes(e.id) || !missao(e, nivel).ok) continue
      const area = save.pausas[e.id] !== undefined ? areaDoPasso(save, e.id) : areaDaMissao(e.id)
      ;(out[area] ??= []).push({ nome: e.personagem, cor: e.cor })
    }
    return out
  }, [save, nivel])

  // guia de rota (substitui o mapa): itens à frente, posição atualizada a cada quadro
  const [guia, setGuia] = useState<ItemGuia[]>([])
  const guiaChave = useRef("")
  const guiaEls = useRef(new Map<string, HTMLElement>())
  const mapaCarro = useRef<SVGCircleElement>(null)
  const hudTom = useRef<HTMLElement>(null)

  // falas em FILA: a ilha mostra uma de cada vez
  const [toasts, setToasts] = useState<{ id: number; de: string; texto: string; ms: number }[]>([])
  useEffect(() => {
    const t0 = toasts[0]
    if (!t0) return
    const t = setTimeout(() => setToasts((l) => l.filter((x) => x.id !== t0.id)), t0.ms)
    return () => clearTimeout(t)
  }, [toasts])
  const [popup, setPopup] = useState<{ id: number; txt: string; cor: string } | null>(null)
  // sinal pego: nada de texto no meio da tela — o cartão da rádio pisca e,
  // nos lances grandes (quase, voou), uma etiqueta pequena sai do medidor
  const [tag, setTag] = useState<{ id: number; txt: string; cor: string } | null>(null)
  const radioBtn = useRef<HTMLButtonElement>(null)
  // passando por uma estação: o nome dela aparece no cartão da rádio
  const [passando, setPassando] = useState<{ id: EstacaoId; t: number } | null>(null)
  const [travou, setTravou] = useState<Frequencia | null>(null)
  const [freq, setFreq] = useState<FreqId>(() => {
    const v = M.vias[jogo0.via]
    return v.tipo === "circuito" ? v.t : v.de ?? v.t
  })
  const [viaAtual, setViaAtual] = useState(() => jogo0.via)
  const [faixa, setFaixa] = useState("")
  // tocando um vinil da Kombi (não uma faixa da rádio): o cartão diz isso
  const discoRef = useRef(false)
  // câmera: de fora (atrás da Kombi) ou de dentro (primeira pessoa). Lembra
  const [dentro, setDentro] = useState(() => { try { return localStorage.getItem("cn-linha-cam") === "dentro" } catch { return false } })
  const dentroRef = useRef(dentro)
  // a troca é um corte suave: a tela apaga, a câmera muda no escuro e volta,
  // com um chiado de rádio quase inaudível por baixo
  const fadeCam = useRef<HTMLDivElement>(null)
  const trocando = useRef(false)
  const [usouCam, setUsouCam] = useState(() => { try { return localStorage.getItem("cn-linha-cam") !== null } catch { return true } })
  const trocarCamera = useCallback(() => {
    if (trocando.current) return
    trocando.current = true
    setUsouCam(true)
    chiadoCamera()
    fadeCam.current?.classList.add("is-on")
    setTimeout(() => {
      setDentro((d) => {
        const n = !d
        dentroRef.current = n
        try { localStorage.setItem("cn-linha-cam", n ? "dentro" : "fora") } catch {}
        return n
      })
      setTimeout(() => {
        fadeCam.current?.classList.remove("is-on")
        trocando.current = false
      }, 90)
    }, 260)
  }, [])
  const [portal, setPortal] = useState<{ id: EstacaoId; t: number } | null>(null)
  const [bairro, setBairro] = useState<{ id: FreqId; t: number } | null>(null)
  const [painel, setPainel] = useState(false)
  const [chegou, setChegou] = useState<Stats | null>(null)
  const [dica, setDica] = useState(true)
  const [prox, setProx] = useState(() => proximaFreq(save.sinal))
  const [nLib, setNLib] = useState(() => freqsLiberadas(save.sinal).length)
  const sinalRef = useRef(save.sinal)
  const freqRef = useRef(freq)
  useEffect(() => { freqRef.current = freq }, [freq])
  const corRadio = useRef(freqDe("linha").cor)
  useEffect(() => { corRadio.current = freqDe(freq).cor }, [freq])
  const nLibRef = useRef(nLib)
  useEffect(() => { nLibRef.current = nLib }, [nLib])
  const toastId = useRef(0)
  // turbo: nível cúmplice, ou o relógio da Notti (recompensa da missão)
  const temTurbo = nivel >= 2 || save.objetos.includes("dopamina")

  useEffect(() => {
    let vivo = true
    document.fonts.load('40px "Outward"').finally(() => vivo && setFonte(true))
    const t = setTimeout(() => setDica(false), 5000)
    return () => { vivo = false; clearTimeout(t) }
  }, [])

  const falar = useCallback((de: string, texto: string, ms = 3600) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-3), { id, de, texto, ms }])
    gota(6)
  }, [])

  // a noite repete: de tempos em tempos a 222 estranha junto com a pessoa
  useEffect(() => {
    if (!noiteRepete) return
    const frases = ["a mesma noite. de novo.", "tá tudo tão bonito. tá tudo tão vazio.", "alguém ainda tá no bar.", "vc já ouviu essa música. n ouviu?"]
    let k = 0
    const iv = setInterval(() => { if (!cinemaRef.current) falar("222 FM", frases[k++ % frases.length]) }, 70000)
    return () => clearInterval(iv)
  }, [noiteRepete, falar])
  // ── SOM: rádio OU toca-discos (nunca os dois). O disco é analógico:
  // nada interrompe; o rádio é a 222 (locutor, Núcleo, estreias, sintonia)
  const [aparelho, setAparelho] = useState<Fonte>(fonteSom.get())
  const fonteRef = useRef(aparelho)
  useEffect(() => fonteSom.ouvir((f) => { fonteRef.current = f; setAparelho(f) }), [])
  const [discoAgora, setDiscoAgora] = useState<{ src: string | null; tocando: boolean }>({ src: disco.src, tocando: disco.tocando })
  useEffect(() => disco.ouvir(setDiscoAgora), [])
  useEffect(() => { discoRef.current = discoAgora.tocando }, [discoAgora.tocando])
  const [estante, setEstante] = useState(false)
  // o que tá tocando no toca-discos: "faixa · disco"
  const discoInfo = (() => {
    for (const d of discosDaKombi(save.discos ?? [])) {
      const f = d.faixas.find((x) => x.src === discoAgora.src)
      if (f) return { titulo: `${f.titulo} · ${d.titulo}` }
    }
    return VINIS.find((v) => v.src === discoAgora.src) ?? null
  })()

  // mensagem que vem de fora (o grupo na chegada): entra na ilha
  const introRef = useRef(intro)
  useEffect(() => { introRef.current = intro }, [intro])
  useEffect(() => {
    if (fala) falar(fala.de, fala.texto, 3000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fala?.id])

  // TUTORIAL do som: o jogo ensina rádio × toca-discos na hora certa
  const temMusicaNoRadio = save.objetos.length > 0
  useEffect(() => {
    if (pausado || cinemaRef.current || intro) return
    if (!dicas.includes("disco-1") && !temMusicaNoRadio && aparelho !== "disco") {
      const t = setTimeout(() => {
        onDica?.("disco-1")
        falar("D-Bee", "a 222 tá fora do ar. mas tem um toca-discos aqui dentro, analógico, o núcleo não alcança. aperta DISCO lá embaixo e escolhe um", 10000)
      }, 4000)
      return () => clearTimeout(t)
    }
    if (!dicas.includes("radio-1") && temMusicaNoRadio && aparelho !== "radio") {
      const t = setTimeout(() => {
        onDica?.("radio-1")
        falar("222 FM", "a 222 voltou com uma música que vc ganhou. aperta RÁDIO lá embaixo (o disco para: os dois juntos não dá)", 10000)
      }, 3000)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausado, temMusicaNoRadio, aparelho, dicas.length, intro])
  // ganhou música nova ouvindo disco: o disco não para; só avisa
  const nObj = useRef(save.objetos.length)
  useEffect(() => {
    if (save.objetos.length > nObj.current && fonteRef.current !== "radio") {
      const e = getEstacao(save.objetos[save.objetos.length - 1])
      falar("222 FM", `estreia na 222: ${e.faixa}. liga o RÁDIO pra ouvir`, 7000)
    }
    nObj.current = save.objetos.length
  }, [save.objetos, falar])

  // rádio: toca a frequência do lugar onde você está
  // rádio: a programação do lugar onde você está (programa.ts) — sacola
  // sem repetição, estreias e vinhetas do locutor entre as músicas
  const proxFaixa = useRef<(id: FreqId) => void>(() => {})
  const tocarProxima = useCallback((id: FreqId, vol = 1) => {
    if (fonteRef.current !== "radio") return
    if (caidoRef.current || foraRef.current) { player.pausar(); setFaixa(foraRef.current ? "a 222 saiu do ar" : ""); return }
    const a = alvoRef.current
    const carregando = a?.t === "entrega" ? MISSOES[a.missao]?.busca?.nome ?? null : null
    const p = proxima(id, save.objetos, { nome: save.nome, objetos: save.objetos, carregando })
    if (!p) { setFaixa(""); return }
    const tocar = () => {
      setFaixa(p.faixa.titulo)
      player.tocar(p.faixa.src, () => proxFaixa.current(freqRef.current), vol)
    }
    if (!p.vinheta) return tocar()
    // entre uma música e outra: um chiado de dial e o locutor (ou o Núcleo)
    chiadoCurto()
    falar(p.vinheta.de, p.vinheta.texto)
    if (p.estreia) {
      jogo.current.flash = 0.7
      confeteRef.current?.(getEstacao(p.estreia).cor, 70)
    }
    setTimeout(tocar, 900)
     
  }, [save.objetos, save.nome, falar])
  useEffect(() => { proxFaixa.current = (id) => tocarProxima(id) }, [tocarProxima])
  useEffect(() => {
    // liga o rádio ao entrar no carro (efeito externo: áudio)
     
    // na abertura (cinema) quem manda no som é a chegada: vinil, depois o
    // rádio procurando a frequência
    if (!cinemaRef.current) tocarProxima(freqRef.current)
    return () => player.pausar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const confeteRef = useRef<((cor: string, n: number) => void) | null>(null)

  // celular aberto → estrada congela; fechou → a rádio volta (uma conversa
  // pode ter tocado um áudio no lugar dela) e as teclas voltam a valer
  // caiu com a estrada aberta: a rádio sai do ar na hora (efeito externo: áudio)
  useEffect(() => {
    if (caido || foraDoAr) player.pausar()
  }, [caido, foraDoAr])
  // a 222 voltou ao ar (o fim do ep. 3): a rádio religa sozinha (efeito externo: áudio)
  const foraAnt = useRef(foraDoAr)
  useEffect(() => {
    if (foraAnt.current && !foraDoAr) proxFaixa.current(freqRef.current)
    foraAnt.current = foraDoAr
  }, [foraDoAr])
  const cacadoRef = useRef(cacado)
  useEffect(() => { cacadoRef.current = cacado }, [cacado])
  const hudCacaBarra = useRef<HTMLDivElement>(null)
  const sirene = useRef<HTMLDivElement>(null)
  const [cacando, setCacando] = useState(false)
  const limitadoRef = useRef(limitado)
  useEffect(() => { limitadoRef.current = limitado }, [limitado])
  const pausadoRef = useRef(pausado)
  useEffect(() => {
    pausadoRef.current = pausado
    if (pausado) {
      input.current.esq = input.current.dir = input.current.freio = false
      toques.current.clear()
      return
    }
    // a música do lugar que ficou pausada continua de onde parou; se uma
    // conversa tocou outra coisa, entra a próxima da programação
    if (caidoRef.current || cinemaRef.current) return
    if (ehDoLugar(freqRef.current, player.src, save.objetos)) {
      if (!player.tocando) player.tocar(player.src!, () => proxFaixa.current(freqRef.current))
      setFaixa(TODAS_FAIXAS.find((f) => f.src === player.src)?.titulo ?? "")
    }
    else tocarProxima(freqRef.current)
    player.volume(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pausado])
  // "ir de kombi" pra uma estação pelo mapa do celular: vira o destino
  // a 222 caiu: a missão da vez espera, o destino some (a antena é o alvo)
  const [caidoAnt, setCaidoAnt] = useState(caido)
  if (caido !== caidoAnt) {
    setCaidoAnt(caido)
    if (caido) setDestino(null)
  }
  const [destinoAnt, setDestinoAnt] = useState(destinoInicial)
  if (destinoInicial !== destinoAnt) {
    setDestinoAnt(destinoInicial)
    if (destinoInicial) setDestino(destinoInicial)
  }
  const descerAqui = (id: EstacaoId, st: Stats) => {
    setChegou(null)
    setPortal(null)
    setDestino(null)
    jogo.current.chegando = false
    jogo.current.parado = false
    onDescer(id, st)
  }
  const flashEl = useRef<HTMLDivElement>(null)
  const hudFreq = useRef<HTMLSpanElement>(null)

  // minimapa: a cidade inteira vista de cima
  // minimapa: SÓ a estrada em que você está (as placas guiam o resto)
  const minimapa = useMemo(() => {
    const proj = M.vias.map((v) => {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
      for (let i = 0; i < v.n; i += 4) {
        minX = Math.min(minX, v.px[i]); maxX = Math.max(maxX, v.px[i])
        minZ = Math.min(minZ, v.pz[i]); maxZ = Math.max(maxZ, v.pz[i])
      }
      const esc = Math.min(150 / Math.max(1, maxX - minX), 54 / Math.max(1, maxZ - minZ))
      const ox = 80 - ((maxX - minX) * esc) / 2
      const oz = 30 - ((maxZ - minZ) * esc) / 2
      const P = (i: number): [number, number] => [ox + (v.px[i] - minX) * esc, oz + (v.pz[i] - minZ) * esc]
      let d = ""
      for (let i = 0; i < v.n; i += 6) {
        const [x, y] = P(i)
        d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
      }
      const [x, y] = P(v.fechada ? 0 : v.n - 1)
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`
      return { d, P, cor: distritoDe(v.t).luz[0] }
    })
    return {
      proj,
      ponto: (vi: number, u: number) => {
        const v = M.vias[vi]
        return proj[vi].P(Math.max(0, Math.min(v.n - 1, Math.floor(u / PASSO))))
      },
    }
  }, [M])

  const onVagaRef = useRef(onVaga)
  useEffect(() => { onVagaRef.current = onVaga }, [onVaga])
  // eventos que a cena dispara
  const evs = useRef<Evs>(null as unknown as Evs)
  useEffect(() => {
    evs.current = {
      vaga: (id) => onVagaRef.current?.(id),
      // na chegada a cidade fica quieta: só o grupo fala
      falar: (de, t) => { if (!introRef.current) falar(de, t) },
      popup: (txt, cor) => setPopup({ id: Math.random(), txt, cor }),
      sinal: (n, rotulo, cor) => {
        const antes = sinalRef.current
        sinalRef.current += n
        jogo.current.st.sinal += n
        const r = radioBtn.current
        if (r) { r.classList.remove("is-pega"); void r.offsetWidth; r.classList.add("is-pega") }
        if (n > 1) setTag({ id: Math.random(), txt: rotulo, cor })
        const p = proximaFreq(antes)
        if (p && sinalRef.current >= p.custo) {
          // rádio nova: a saída pro lugar dela abre na próxima bifurcação
          jogo.current.flash = 1
          confeteRef.current?.(p.cor, 160)
          vib([30, 40, 30, 40, 120])
          setTravou(p)
          setNLib(freqsLiberadas(sinalRef.current).length)
          setTimeout(() => setTravou(null), 4200)
          setTimeout(() => falar("D-Bee", `vc achou a ${p.freq}. o núcleo odeia essa`), 1800)
        }
        onSinal(sinalRef.current)
        setProx(proximaFreq(sinalRef.current))
      },
      via: (i) => {
        const v = M.vias[i]
        setViaAtual(i)
        onAreaRef.current?.(v.id)
        if (v.tipo !== "circuito") return
        setBairro({ id: v.t, t: Date.now() })
        flashEl.current?.style.setProperty("--cor", freqDe(v.t).cor)
        vib([15, 30, 15])
        if (freqRef.current !== v.t) {
          setFreq(v.t)
          freqRef.current = v.t
          tocarProxima(v.t)
        }
        player.volume(1)
        onSinal(sinalRef.current, v.t)
      },
      radio: (id) => {
        setFreq(id)
        freqRef.current = id
        tocarProxima(id, 0.2)
        gota(4)
      },
      caca: (e) => {
        if (e === "comecou") {
          setCacando(true)
          falar("NÚCLEO", "veículo transportando conteúdo não licenciado. aguarde a otimização ✓")
          vib([60, 40, 60])
        } else if (e === "pego") {
          setCacando(false)
          jogo.current.flash = 0.8
          jogo.current.shake = 1.2
          vib([90, 40, 160])
          setPopup({ id: Math.random(), txt: "conteúdo apreendido", cor: "#e6f0ff" })
          falar("NÚCLEO", "conteúdo apreendido e devolvido à origem. obrigado pela colaboração ✓")
          onApreendido?.()
        } else if (e === "despistou") {
          setCacando(false)
          confeteRef.current?.("#2fe8ff", 60)
          falar("222 FM", "a kombi despistou o núcleo. respeito")
          evs.current.sinal(5, "despistou · +5", "#2fe8ff")
        } else if (e === "perdeu") {
          setCacando(false)
          falar("222 FM", "trocou de rua, eles perderam o rastro. por enquanto")
        } else setCacando(false)
      },
      pegar: (chave) => {
        if (chave === "antena") {
          onReligar?.()
          jogo.current.flash = 1
          jogo.current.impacto = 1
          confeteRef.current?.("#2fe8ff", 160)
          vib([40, 30, 40, 30, 120])
          setPopup({ id: Math.random(), txt: "222 FM no ar", cor: "#2fe8ff" })
          caidoRef.current = false
          setTimeout(() => {
            tocarProxima(freqRef.current)
            falar("222 FM", "voltamos. o núcleo derrubou a gente e alguém religou na mão. essa vai pra você")
          }, 600)
          return
        }
        const a = alvoRef.current
        if (!a || a.t !== "busca") return
        const k = Number(chave.split(":")[1])
        const e = getEstacao(a.missao)
        onPegar?.(chave)
        confeteRef.current?.(e.cor, 90)
        jogo.current.flash = 0.6
        vib([30, 40, 30, 40, 90])
        setPopup({ id: Math.random(), txt: a.faltam.length > 1 ? `${a.busca.nome} · ${a.busca.em.length - a.faltam.length + 1}/${a.busca.em.length}` : `${a.busca.nome} ✓`, cor: e.cor })
        const fala = a.busca.pega[Math.min(k, a.busca.pega.length - 1)]
        setTimeout(() => falar(fala.de, fala.texto), 700)
        // o silêncio do mirante: a rádio some de verdade por uns segundos
        if (a.busca.item === "silencio") {
          player.volume(0)
          setTimeout(() => player.volume(1), 4000)
        }
        if (a.faltam.length <= 1) setTimeout(() => falar(e.personagem, `agora traz aqui. estação ${e.n}, segue a coluna de luz`), 4200)
      },
      portal: (id) => {
        if ((id === alvoRef.current?.missao || id === destinoRef.current) && !save.objetos.includes(id)) setPortal({ id, t: Date.now() })
        else setPassando({ id, t: Date.now() })
        // passar por uma estação é uma nota no tom da música, não festa
        gota(getEstacao(id).n + 1)
      },
      chegou: () => setChegou({ ...jogo.current.st, tempo: jogo.current.tempo }),
      volta: (t) => {
        falar("Notti", `volta em ${t.toFixed(1)}s!!`)
        onVolta?.(t)
      },
      hud: (j) => {
        if (hudVel.current) hudVel.current.textContent = String(Math.round(Math.abs(j.v) * 3.6))
        // computador: parado sem acelerar → mostra como anda
        hudParado.current?.classList.toggle("is-on", !toqueTela && !dentroRef.current && Math.abs(j.v) < 0.5 && !j.chegando && !input.current.gas && j.tempo > 1.5)
        if (hudMarcha.current) {
          const pct = j.v / VMAX
          let m = 1
          while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
          hudMarcha.current.textContent = j.v < -0.3 ? "R" : j.drift ? "DRIFT" : `${m}ª`
        }
        const V = M.vias[j.via]
        const d = destinoRef.current
        let txt = ""
        let prog = 0
        if (V.tipo === "circuito") {
          const us = V.faixas.map((f) => f.u)
          const prox = us.filter((u) => u > j.u)
          const uG = prox.length ? Math.min(...prox) : V.L + Math.min(...us)
          const garfo = uG - j.u
          prog = j.u / V.L
          // cartão da bifurcação: as três opções, acende a do lado em que
          // o carro está
          // com conversa no painel, o cartão só toma a ilha nos últimos 330 m
          // (onde o toque marca a saída): na cidade as descidas vêm a cada
          // ~650 m e a conversa ficava escondida quase o tempo todo
          const chave = garfo < (conversaRef.current ? 330 : 450) ? `${j.via}:${uG % V.L}` : ""
          if (chave !== garfoChave.current) {
            garfoChave.current = chave
            const u0 = uG % V.L
            setGarfo(chave ? { via: j.via, u: u0, esq: V.faixas.find((f) => f.u === u0 && f.lado < 0), dir: V.faixas.find((f) => f.u === u0 && f.lado > 0) } : null)
          }
          if (chave) {
            if (hudGarfoM.current) hudGarfoM.current.textContent = `${Math.round(garfo)}m`
            // depois de marcar o lado, o cartão trava nele (e a Kombi vai sozinha)
            const vai = j.escolha ? j.escolha + 1 : j.x < -MEIA * 0.35 ? 0 : j.x > MEIA * 0.35 ? 2 : 1
            garfoEls.current.forEach((el, k) => {
              el?.classList.toggle("is-vai", k === vai)
              el?.classList.toggle("is-trava", k === vai && !!j.escolha)
            })
            if (hudGarfoT.current) {
              const f = j.escolha ? V.faixas.find((x) => x.u === uG % V.L && x.lado === j.escolha) : null
              hudGarfoT.current.textContent = f ? `✓ saindo ${praDe(f.para)} · ${f.lado > 0 ? "←" : "→"} desfaz` : "um toque pro lado da saída"
            }
          }
          const la = lugarAlvoRef.current
          const ma = alvoRef.current
          if (la && ma && V.t !== la) {
            // a missão está em outro lugar: aponta a saída certa
            const pra = rumo(V.t, la)!
            const f = V.faixas.find((x) => x.para === pra)
            const lado = f ? (f.lado < 0 ? "←" : "→") : ""
            txt = f && !aberta(f, nLibRef.current)
              ? `a saída ${praDe(pra)} abre com ${freqDe(pra).custo} de sinal · pega os orbs`
              : `${lado} saída ${praDe(pra)} em ${Math.round(f ? (f.u - j.u + V.L) % V.L : garfo)}m`
          } else if (ma?.t === "busca" && V.t === la) {
            const us = marcosRef.current.filter((m) => m.via === j.via).map((m) => (m.u >= j.u ? m.u - j.u : V.L - j.u + m.u))
            if (us.length) {
              txt = `${ma.busca.nome} em ${Math.round(Math.min(...us))}m`
              prog = 1 - Math.min(1, Math.min(...us) / V.L)
            }
          } else if (d && V.t === "linha") {
            const alvo = centro.estacoes.find((e) => e.id === d)!.u
            const falta = alvo >= j.u ? alvo - j.u : V.L - j.u + alvo
            txt = `${Math.round(falta)}m`
            prog = 1 - Math.min(1, falta / (V.L * 0.5))
          } else if (d) txt = `saída → pra cidade neon em ${Math.round(garfo)}m`
          else if (V.t === "linha" && garfo > 700) {
            const px = V.estacoes.find((e) => e.u > j.u)
            txt = px ? `próxima: ${getEstacao(px.id).faixa.toLowerCase()} · ${Math.round(px.u - j.u)}m` : `bifurcação em ${Math.round(garfo)}m`
          } else txt = `bifurcação em ${Math.round(garfo)}m`
        } else {
          if (garfoChave.current) { garfoChave.current = ""; setGarfo(null) }
          prog = j.u / V.L
          txt = `faltam ${Math.round(V.L - j.u)}m`
        }
        if (hudRota.current) hudRota.current.textContent = txt
        if (hudProg.current) hudProg.current.style.transform = `scaleX(${prog})`
        const p = proximaFreq(sinalRef.current)
        const lib = freqsLiberadas(sinalRef.current)
        const ant = lib[lib.length - 1]?.custo ?? 0
        if (hudSinal.current) hudSinal.current.style.transform = `scaleY(${p ? (sinalRef.current - ant) / (p.custo - ant) : 1})`
        if (hudTurbo.current) hudTurbo.current.style.transform = `scaleX(${j.turboT > 0 ? Math.min(1, j.turboT / 2.2) : j.carga})`
        // a sirene sobe da borda de baixo: quanto mais perto, mais forte
        if (sirene.current) sirene.current.style.opacity = j.cacaGap === undefined ? "0" : String(Math.max(0, Math.min(0.9, 1 - j.cacaGap / 180)))
        if (hudCacaBarra.current) hudCacaBarra.current.style.transform = `scaleX(${Math.max(0, Math.min(1, 1 - (j.cacaGap ?? 250) / 250))})`
        if (flashEl.current) flashEl.current.style.opacity = String(Math.min(0.85, j.flash))
        // dial girando: da frequência de onde veio até a de pra onde vai
        if (hudFreq.current && V.tipo === "saida") {
          const p = j.u / V.L
          if (p > 0.45) {
            const a0 = parseFloat(freqDe(V.de!).freq)
            const b0 = parseFloat(freqDe(V.t).freq)
            const q = Math.min(1, (p - 0.45) / 0.5)
            const ruido = (Math.random() - 0.5) * 6 * (1 - q)
            hudFreq.current.textContent = `${(a0 + (b0 - a0) * q + ruido).toFixed(1)} FM`
          }
        }
        if (hudTom.current) {
          const tom = tomDaMusica()
          const base = V.tipo === "saida" ? `sintonizando ${freqDe(V.t).freq}…` : "troca pelo caminho"
          hudTom.current.textContent = tom && V.tipo !== "saida" ? `${nomeDoTom(tom)} · ${base}` : base
        }
        // guia de rota: o que vem nos próximos 1200 m desta estrada
        {
          const JAN = 1200
          const dist = (u: number) => (V.fechada ? (((u - j.u) % V.L) + V.L) % V.L : u - j.u)
          const it: ItemGuia[] = []
          if (V.tipo === "circuito") {
            // as bolinhas são GUIA DE MISSÃO, não o mapa: só aparece a
            // estação de quem tá te esperando (as outras ficam no escuro)
            for (const e of V.estacoes) {
              if (e.id !== alvoRef.current?.missao || alvoRef.current.t === "busca") continue
              const est = getEstacao(e.id)
              it.push({ k: `e${e.id}`, d: dist(e.u), cor: est.cor, rot: String(est.n), tipo: "alvo" })
            }
            for (const u of new Set(V.faixas.map((f) => f.u))) it.push({ k: `f${u}`, d: dist(u), cor: "#ffc857", rot: "saídas", tipo: "garfo" })
          } else it.push({ k: "chega", d: V.L - j.u, cor: freqDe(V.t).cor, rot: lugarDe(V.t), tipo: "chegada" })
          // o lugar da missão (a vaga) também entra no guia
          const vg = vagaRef.current
          if (vg && vg.via === j.via) it.push({ k: `l${vg.id}`, d: dist(vg.u), cor: vg.cor, rot: vg.nome, tipo: "alvo" })
          for (const m of marcosRef.current) if (m.via === j.via) it.push({ k: `m${m.chave}`, d: dist(m.u), cor: m.cor, rot: m.chave === "antena" ? "antena" : "missão", tipo: "item" })
          const vis = it.filter((x) => x.d > 0 && x.d < JAN)
          const chave = vis.map((x) => x.k).join(",")
          if (chave !== guiaChave.current) { guiaChave.current = chave; setGuia(vis) }
          for (const x of vis) {
            const el = guiaEls.current.get(x.k)
            if (el) el.style.left = `${(x.d / JAN) * 100}%`
          }
        }
      },
    }
  })

  // ir agora (painel MISSÕES): um corte preto e a Kombi reaparece ~140 m
  // antes do lugar, já andando — passar na frente entra na missão
  const telChave = teleporte?.chave ?? 0
  useEffect(() => {
    if (!teleporte) return
    const viaLugar = teleporte.lugar ? LUGARES[teleporte.lugar].via : undefined
    const vi = viaLugar ? M.vias.findIndex((v) => v.id === viaLugar) : M.circuito[teleporte.area]
    const C = M.vias[vi]
    if (!C) return
    let u: number
    if (teleporte.lugar) u = LUGARES[teleporte.lugar].u - 140
    else if (teleporte.frac !== undefined) u = C.livre[0] + teleporte.frac * (C.livre[1] - C.livre[0]) - 140
    else u = C.livre[0]
    u = ((u % C.L) + C.L) % C.L
    const t = setTimeout(() => {
      const j = jogo.current
      j.via = vi; j.u = u; j.x = 0; j.v = 14; j.vx = 0
      j.naVaga = false; j.vagaAvisou = undefined; j.encaixar = true
      evs.current?.via(vi)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telChave])

  // atalhos de desenvolvimento: __irPara(0.9) anda na via atual,
  // __via("crypto", 0.5) teleporta pra um lugar (ou "linha>crypto")
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    // teste: a velocidade da Kombi (m/s), ex. 0 pra estacionar na vaga
    w.__vel = (v: number) => { jogo.current.v = v }
    w.__irPara = (f: number, x?: number) => {
      const j = jogo.current
      j.u = f * M.vias[j.via].L
      if (x !== undefined) { j.x = x; j.v = Math.max(j.v, 30) }
      j.encaixar = true
    }
    w.__via = (id: string, f = 0) => {
      const i = M.vias.findIndex((v) => v.id === id || v.id === `circuito:${id}`)
      if (i < 0) return
      const j = jogo.current
      j.via = i
      j.u = f * M.vias[i].L
      j.x = 0
      j.sintonizou = false
      j.encaixar = true
      evs.current?.via(i)
    }
    w.__tom = () => tomDaMusica()
    w.__pular = () => proxFaixa.current(freqRef.current)
    w.__estacoes = () => M.vias[M.circuito.linha].estacoes.map((e) => ({ id: e.id, f: e.u / M.vias[M.circuito.linha].L }))
    // pontos de busca da missão: [{ chave, via (id), u, f (fração do loop) }]
    w.__marcos = () => marcosRef.current.map((m) => ({ chave: m.chave, via: M.vias[m.via].id, u: Math.round(m.u), f: m.u / M.vias[m.via].L }))
    if (M.conflitos.length) console.warn("pistas se encostando:", M.conflitos)
    w.__sinal = (n: number) => evs.current?.sinal(n, `+${n}`, "#fff")
    w.__estado = () => {
      const j = jogo.current
      return { t: +j.tempo.toFixed(2), via: M.vias[j.via].id, u: Math.round(j.u), L: Math.round(M.vias[j.via].L), x: +j.x.toFixed(2), v: Math.round(j.v), deriva: +j.deriva.toFixed(2), giro: +j.giro.toFixed(2), drift: j.drift, peso: +j.peso.toFixed(2), vx: +j.vx.toFixed(1), turbo: +j.turboT.toFixed(2), src: player.src, caca: j.cacaGap === undefined ? null : Math.round(j.cacaGap) }
    }
    return () => { delete w.__vel; delete w.__irPara; delete w.__via; delete w.__tom; delete w.__sinal; delete w.__estado; delete w.__marcos; delete w.__estacoes; delete w.__pular }
  }, [M])

  // toque: metade esquerda/direita vira, as duas freiam
  const toques = useRef(new Map<number, "esq" | "dir">())
  const atualizarToque = () => {
    const l = [...toques.current.values()]
    const e = l.includes("esq")
    const d = l.includes("dir")
    if (e && !d && !input.current.esq) input.current.toqueE = true
    if (d && !e && !input.current.dir) input.current.toqueD = true
    input.current.esq = e && !d
    input.current.dir = d && !e
  }
  useEffect(() => {
    const tecla = (ev: KeyboardEvent, on: boolean) => {
      if (pausadoRef.current || cinemaRef.current) return
      const k = ev.key.toLowerCase()
      if (k === "arrowleft" || k === "a") {
        if (on && !ev.repeat) input.current.toqueE = true
        input.current.esq = on
      } else if (k === "arrowright" || k === "d") {
        if (on && !ev.repeat) input.current.toqueD = true
        input.current.dir = on
      }
      else if (k === "arrowup" || k === "w") input.current.gas = on
      else if (k === "arrowdown" || k === "s") input.current.freio = on
      else if ((k === "shift" || k === "e") && on) input.current.turbo = true
      else if (k === "c" && on && !ev.repeat) trocarCamera()
      else return
      ev.preventDefault()
    }
    const kd = (e: KeyboardEvent) => tecla(e, true)
    const ku = (e: KeyboardEvent) => tecla(e, false)
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku) }
  }, [trocarCamera])

  // a missão fala com você quando a estrada começa: o que buscar e onde
  const falouDe = useRef("")
  useEffect(() => {
    const a = alvoRef.current
    if (!a || pausado || falouDe.current === alvoChave) return
    falouDe.current = alvoChave
    const e = getEstacao(a.missao)
    const t = setTimeout(() => falar(e.personagem, a.t === "busca" ? `${a.busca.lugar}. segue a coluna de luz` : a.t === "visita" ? `${MISSOES[a.missao]?.chamado ?? "vem aqui"}. segue a coluna de luz` : "tô te esperando. segue a coluna de luz"), 1800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoChave, pausado])
  // carona: quem está na Kombi conversa no caminho
  useEffect(() => {
    const a = alvoRef.current
    const fala = a?.t === "entrega" ? MISSOES[a.missao]?.busca?.caminho : a?.t === "lugar" && !a.pegar && MISSOES[a.missao]?.carona ? MISSOES[a.missao]?.caminho : undefined
    if (!a || !fala) return
    let i = 0
    const quem = getEstacao(a.missao).personagem
    const t = setInterval(() => falar(quem, fala[i++ % fala.length]), 17000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvoChave])
  useEffect(() => {
    if (!bairro) return
    const t = setTimeout(() => setBairro(null), 3800)
    return () => clearTimeout(t)
  }, [bairro])

  const fq = freqDe(freq)
  const V = M.vias[viaAtual]
  const lugarAqui = V.tipo === "circuito" ? territorio(V.t).lugar : `indo ${praDe(V.t)}`
  const dest = destino ? getEstacao(destino) : null
  const portalE = portal ? getEstacao(portal.id) : null
  const portalMissao = portalE ? missao(portalE, nivel) : null
  // descer na estação só quando ela te espera (visita ou entrega) — no meio
  // da busca, passar por ela não pede nada
  const podeDescerPortal = !!portalE && !save.objetos.includes(portalE.id) && (
    alvo?.missao === portalE.id ? alvo.t === "entrega" || alvo.t === "visita" : portalE.id === destino && !!portalMissao?.ok
  )
  const passandoE = passando ? getEstacao(passando.id) : null
  useEffect(() => {
    if (!passando) return
    const t = setTimeout(() => setPassando(null), 3200)
    return () => clearTimeout(t)
  }, [passando])
  const bairroF = bairro ? freqDe(bairro.id) : null

  useEffect(() => {
    if (!portal) return
    const t = setTimeout(() => setPortal(null), 8000)
    return () => clearTimeout(t)
  }, [portal])

  return (
    <div className={`l-viagem ${pausado ? "is-pausada" : ""} ${caido ? "is-caida" : ""} ${cinema ? "is-cinema" : ""} ${cinza ? "is-cinza" : ""} ${noiteRepete ? "is-repete" : ""} ${foraDoAr ? "is-apagao" : ""}`}>
      {fonte && (
        <Canvas
          className="l-viagem-cvs"
          dpr={[1, 1.5]}
          frameloop={pausado ? "never" : "always"}
          gl={{ antialias: false, powerPreference: "high-performance", stencil: false }}
          camera={{ fov: 60, near: 0.1, far: 3200 }}
          onPointerDown={(e) => {
            if (cinemaRef.current) return
            const r = (e.target as HTMLElement).getBoundingClientRect()
            toques.current.set(e.pointerId, e.clientX - r.left < r.width / 2 ? "esq" : "dir")
            atualizarToque()
          }}
          onPointerUp={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
          onPointerCancel={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
          onPointerLeave={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Cena tags={tagsArea} M={M} jogo={jogo} input={input} evs={evs} destinoRef={destinoRef} temTurbo={temTurbo} confeteRef={confeteRef} nivel={nivel} objetos={save.objetos} nLib={nLib} nLibRef={nLibRef} marcos={marcos} marcosRef={marcosRef} estacaoAlvo={alvo?.missao ?? null} corRadio={corRadio} pausado={pausado} cinemaRef={cinemaRef} limitadoRef={limitadoRef} cacadoRef={cacadoRef} dentroRef={dentroRef} discoRef={discoRef} disco={discoAgora.tocando} fonteRef={fonteRef} onTocaDiscos={() => setEstante(true)} carona={(alvo?.t === "entrega" && alvo.missao === "sexta") || (alvo?.t === "lugar" && !alvo.pegar && MISSOES[alvo.missao]?.carona) ? alvo.missao : null} lugarAlvoRef={lugarAlvoRef} vagaRef={vagaRef} camLugarRef={camLugarRef} lugarAlvoId={lugarDaMissao} cenaLugar={cenaLugar} segredoRef={segredoRef} aberturaRef={aberturaRef} />
        </Canvas>
      )}

      {abertura && abFase.fase === "dirige" && (
        <div className={`l-tanque ${abFase.semGas ? "is-vazio" : ""}`} aria-label={abFase.semGas ? "sem combustível" : "combustível na reserva"}>
          <small>combustível</small>
          <div className="l-tanque-barra"><i /></div>
          <b>R</b>
        </div>
      )}
      {abertura && abFase.fase === "ape" && <small className="l-abertura-dica">segura a tela ou ↑ pra andar até a porta</small>}
      <div ref={flashEl} className="l-flash" />
      <div ref={fadeCam} className="l-fade-cam" />
      <div className="l-hud-topo">
        {/* o carro é a tela principal; o celular é um toque */}
        <button type="button" className="l-hud-cel" onPointerDown={(e) => e.stopPropagation()} onClick={() => onSair({ ...jogo.current.st, tempo: jogo.current.tempo })} aria-label="abrir o celular">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>
          {avisos > 0 && <em>{avisos}</em>}
        </button>
        <button type="button" className={`l-hud-cam ${dentro ? "is-dentro" : ""} ${usouCam ? "" : "is-novo"}`} onPointerDown={(e) => e.stopPropagation()} onClick={trocarCamera} aria-label={dentro ? "câmera de fora" : "câmera de dentro"} title="câmera (C)">
          {dentro ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16V9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v7" /><path d="M3 16h18" /><circle cx="7.5" cy="17.5" r="1.6" /><circle cx="16.5" cy="17.5" r="1.6" /></svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="13" r="7" /><circle cx="12" cy="13" r="1.6" fill="currentColor" /><path d="M5.5 11h13M12 6v5" /></svg>
          )}
          <span>{dentro ? "de fora" : "1ª pessoa"}</span>
        </button>
        {/* guia de rota: a linha do que vem pela frente (as placas guiam
            na pista; aqui só a ordem das coisas e a distância) */}
        <div className="l-guia" style={{ ["--cor" as string]: fq.cor }}>
          <small className={`l-guia-lugar ${bairro ? "is-entrando" : ""}`}>{bairro ? `entrando em ${territorio(bairro.id).lugar}` : V.id === "deserto" ? "deserto" : V.tipo === "circuito" ? territorio(V.t).lugar : `indo ${praDe(V.t)}`}</small>
          <div className="l-guia-linha">
            <i className="l-guia-kombi" />
            {guia.map((x) => (
              <span key={x.k} ref={(el) => { if (el) guiaEls.current.set(x.k, el); else guiaEls.current.delete(x.k) }} className={`l-guia-it is-${x.tipo}`} style={{ ["--c" as string]: x.cor, left: `${(x.d / 1200) * 100}%` }}>
                <i />{x.tipo !== "estacao" && <b>{x.rot}</b>}{x.tipo === "estacao" && <em>{x.rot}</em>}
              </span>
            ))}
          </div>
        </div>
      </div>


      <div ref={sirene} className="l-sirene" />
      {telChave > 0 && <div key={telChave} className="l-corte-teleporte" />}
      {caido && (
        <div className="l-hud-missao" style={{ ["--cor" as string]: "#3d7bff" }}>
          <small>D-Bee · urgente</small>
          <b>religar a antena da 222 no centro</b>
        </div>
      )}
      {!caido && alvo && missaoAlvo && (
        <div className="l-hud-missao" style={{ ["--cor" as string]: getEstacao(alvo.missao).cor }}>
          <small>{getEstacao(alvo.missao).personagem} · missão</small>
          <b>{alvo.t === "busca" ? missaoAlvo.tarefa : alvo.t === "lugar" ? (alvo.pegar ? `buscar ${LUGARES[alvo.lugar].no}` : `passa ${LUGARES[alvo.lugar].no}`) : alvo.t === "visita" ? `te chamou na estação ${getEstacao(alvo.missao).n}` : `levar ${missaoAlvo.busca?.nome ?? "a coisa"} na estação ${getEstacao(alvo.missao).n}`}</b>
          {alvo.t === "busca" && alvo.busca.em.length > 1 && <span>{alvo.busca.em.length - alvo.faltam.length}/{alvo.busca.em.length}</span>}
        </div>
      )}
      {popup && <div key={popup.id} className="l-popup" style={{ color: popup.cor }}>{popup.txt}</div>}

      {/* ILHA DINÂMICA: uma coisa de cada vez, se transformando —
          bifurcação > conversa (no painel) > falas (em fila) > PROCURADO > quieta */}
      {(() => {
        // na chegada, o grupo falando vem antes do aviso de bifurcação
        const modo = intro && toasts[0] ? "fala" : garfo ? "garfo" : conversa ? "conversa" : toasts[0] ? "fala" : cacando ? "procurado" : "quieta"
        const t0 = toasts[0]
        const C = garfo ? M.vias[garfo.via] : null
        const op = (f: Faixa | undefined, k: number) => {
          if (!f) return <div key={k} ref={(el) => { garfoEls.current[k] = el }} className="l-garfo-op is-vazia" />
          const fr = freqDe(f.para)
          const ok = aberta(f, nLib)
          const minha = !!lugarAlvo && rumo(C!.t, lugarAlvo) === f.para
          // a saída pro deserto (mundo.ts): sem rádio, cor de areia
          if (M.vias[f.via]?.id === "deserto") return (
            <div key={k} ref={(el) => { garfoEls.current[k] = el }} className="l-garfo-op" style={{ ["--cor" as string]: "#e8b86a" }}>
              <i>{f.lado < 0 ? "←" : "→"}</i>
              <b>deserto</b>
              <small>sem rádio</small>
            </div>
          )
          return (
            <div key={k} ref={(el) => { garfoEls.current[k] = el }} className={`l-garfo-op ${ok ? "" : "is-trancada"} ${minha ? "is-rota" : ""}`} style={{ ["--cor" as string]: ok ? fr.cor : "#6a6f8c" }}>
              {minha && <em>missão</em>}
              <i>{f.lado < 0 ? "←" : "→"}</i>
              <b>{lugarDe(f.para)}</b>
              <small>{ok ? `${fr.freq} FM` : `trancada · ${fr.custo}`}</small>
              {ok && !!tagsArea[f.para]?.length && <span className="l-garfo-quem">{tagsArea[f.para]!.map((x) => <i key={x.nome} style={{ background: x.cor }}>{x.nome[0]}</i>)}</span>}
            </div>
          )
        }
        return (
          <div
            className={`l-ilha is-${modo} ${modo === "fala" && onIlha ? "is-clicavel" : ""}`}
            style={{ ["--cor" as string]: t0 ? VOZES[t0.de] ?? "#fff" : "#2fe8ff" }}
            onPointerDown={modo === "fala" && onIlha ? (e) => e.stopPropagation() : undefined}
            onClick={modo === "fala" && onIlha ? onIlha : undefined}
          >
            {modo === "garfo" && C && (
              <div key="garfo" className="l-ilha-conteudo">
                <header>bifurcação em <b ref={hudGarfoM}>…</b> · <span ref={hudGarfoT}>um toque pro lado da saída</span></header>
                <div className="l-garfo-ops">
                  {op(garfo!.esq, 0)}
                  <div ref={(el) => { garfoEls.current[1] = el }} className={`l-garfo-op ${lugarAlvo === C.t ? "is-rota" : ""}`} style={{ ["--cor" as string]: freqDe(C.t).cor }}>
                    {lugarAlvo === C.t && <em>missão</em>}
                    <i>↑</i>
                    <b>fica</b>
                    <small>{freqDe(C.t).freq} FM</small>
                    {!!tagsArea[C.t]?.length && <span className="l-garfo-quem">{tagsArea[C.t]!.map((x) => <i key={x.nome} style={{ background: x.cor }}>{x.nome[0]}</i>)}</span>}
                  </div>
                  {op(garfo!.dir, 2)}
                </div>
              </div>
            )}
            {modo === "fala" && t0 && (
              <div key={t0.id} className="l-ilha-conteudo l-ilha-fala"><b>{t0.de}</b> {t0.texto}</div>
            )}
            {modo === "procurado" && (
              <div key="proc" className="l-ilha-conteudo l-ilha-proc">
                <b>PROCURADO</b><small>acelera no talo ou troca de rua</small>
                <div className="l-procurado-barra"><div ref={hudCacaBarra} /></div>
              </div>
            )}
            {modo === "quieta" && <div key="q" className="l-ilha-conteudo l-ilha-quieta" />}
          </div>
        )
      })()}

      <div className="l-hud-vel">
        {tag && <em key={tag.id} className="l-hud-tag" style={{ color: tag.cor }}>{tag.txt}</em>}
        <span ref={hudVel}>0</span>
        <small>km/h</small>
        <span ref={hudMarcha} className="l-hud-marcha">1ª</span>
      </div>

      {/* o aparelho da Kombi: RÁDIO ou TOCA-DISCOS (nunca os dois) */}
      <div ref={radioBtn as unknown as React.RefObject<HTMLDivElement>} className={`l-player is-${aparelho} ${V.tipo === "saida" && aparelho === "radio" ? "is-sintonizando" : ""}`} style={{ ["--cor" as string]: aparelho === "disco" ? "#ffc857" : fq.cor }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="l-player-tela">
          {aparelho === "disco" ? (
            <>
              <span className="l-player-aparelho"><i className={`l-player-vinil ${discoAgora.tocando ? "is-gira" : ""}`} />TOCA-DISCOS</span>
              <b>{discoInfo ? discoInfo.titulo : "sem disco"}</b>
              <small>{discoAgora.tocando ? "analógico · nada interrompe" : "o disco acabou · escolhe outro"}</small>
              <span className="l-player-ctl">
                <button type="button" onClick={() => disco.proxima()} disabled={!discoAgora.tocando} aria-label="próxima faixa">⏭ próxima</button>
                <button type="button" onClick={() => { if (!dentro) trocarCamera(); setEstante(true) }}>trocar disco</button>
              </span>
            </>
          ) : aparelho === "radio" ? (
            <>
              <span ref={hudFreq} className="l-player-aparelho">{fq.freq} FM</span>
              {caido ? <b className="is-caida">sem sinal · o núcleo derrubou a 222</b>
                : passandoE ? <b key={passando!.t} className="is-estacao" style={{ color: passandoE.cor }}>estação {passandoE.n} · {passandoE.faixa.toLowerCase()}</b>
                : <b>{faixa || "fora do ar · cada missão traz uma música"}</b>}
              <small ref={hudTom}>troca pelo caminho</small>
            </>
          ) : (
            <>
              <span className="l-player-aparelho">DESLIGADO</span>
              <b>rádio ou disco?</b>
              <small>só um de cada vez</small>
            </>
          )}
        </div>
        <div className="l-player-bts">
          <button type="button" className={aparelho === "radio" ? "is-on" : ""} onClick={() => {
            if (aparelho === "radio") return fonteSom.set("off")
            fonteSom.set("radio")
            setTimeout(() => tocarProxima(freqRef.current), 0)
          }}>RÁDIO</button>
          <button type="button" className={aparelho === "disco" ? "is-on" : ""} onClick={() => {
            if (aparelho === "disco") return fonteSom.set("off")
            // o disco se escolhe DENTRO da Kombi: entra e olha pro toca-discos
            if (!dentro) trocarCamera()
            setEstante(true)
          }}>DISCO</button>
        </div>
      </div>

      <button
        type="button"
        className={`l-hud-turbo ${temTurbo ? "" : "is-trancado"}`}
        onPointerDown={(e) => { e.stopPropagation(); input.current.turbo = true }}
      >
        <div className="l-hud-turbo-barra"><div ref={hudTurbo} /></div>
        <span>{temTurbo ? "turbo" : "turbo · nível cúmplice"}</span>
      </button>

      <div ref={hudParado} className="l-hud-parado"><b>↑</b> ou <b>W</b> pra acelerar · <b>↓</b> dá ré</div>

      {/* celular: freio/ré (segurar). Drift é na direção: a finta */}
      <div className={`l-pedais ${dentro ? "is-oculto" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="l-pedal is-re"
          onPointerDown={(e) => { e.stopPropagation(); input.current.freio = true }}
          onPointerUp={() => { input.current.freio = false }}
          onPointerCancel={() => { input.current.freio = false }}
          onPointerLeave={() => { input.current.freio = false }}
        >freio<br />ré</button>
      </div>

      {dica && (
        <div className="l-hud-dica">
          <span>← segura</span>
          <span><span className="is-desk">↑ acelera · ↓ freia/ré · shift turbo<br /></span>drift: toque pra fora, vira pra dentro</span>
          <span>segura →</span>
        </div>
      )}

      {estante && (
        <div className="l-estante" onPointerDown={(e) => e.stopPropagation()}>
          <header>
            <b>os discos da kombi</b>
            <button type="button" onClick={() => setEstante(false)} aria-label="fechar">✕</button>
          </header>
          <p>escolhe um disco e põe pra tocar, do começo ao fim. disco é analógico: o núcleo não alcança</p>
          <ul>
            {discosDaKombi(save.discos ?? []).map((d) => {
              const srcs = d.faixas.map((f) => f.src)
              const esse = discoAgora.tocando && !!discoAgora.src && srcs.includes(discoAgora.src)
              const faixa = esse ? d.faixas.find((f) => f.src === discoAgora.src) : null
              return (
                <li key={d.id}>
                  <button type="button" className={esse ? "is-on" : ""} onClick={() => {
                    fonteSom.set("disco")
                    disco.tocarLista(srcs)
                    setEstante(false)
                    if (!dicas.includes("disco-2")) {
                      onDica?.("disco-2")
                      setTimeout(() => falar("D-Bee", "isso. disco nunca para, nem pro núcleo. rádio e disco não tocam juntos", 8000), 1500)
                    }
                  }}>
                    <i className="l-estante-capa"><Capa motivo={d.motivo} a={d.a} b={d.b} titulo="" size={44} /></i>
                    <span><b>{d.titulo}</b><small>{faixa ? `tocando: ${faixa.titulo}` : `${d.faixas.length} faixas`}</small></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {!(save.discos ?? []).length && <small className="l-estante-loja">mais discos na LOJA DE DISCOS, no celular</small>}
        </div>
      )}

      {portalE && !chegou && podeDescerPortal && (
        <button
          key={portal!.t}
          type="button"
          className="l-descer"
          style={{ ["--cor" as string]: portalE.cor }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => descerAqui(portalE.id, { ...jogo.current.st, tempo: jogo.current.tempo })}
        >
          <small>estação {portalE.n} · {portalE.personagem}</small>
          <b>descer aqui →</b>
        </button>
      )}

      {chegou && dest && (
        <div className="l-chegada" style={{ ["--cor" as string]: dest.cor }}>
          <small>estação {dest.n}</small>
          <h2>{dest.faixa}</h2>
          <p className="l-chegada-cidade">{dest.cidade}</p>
          <dl>
            <div><dt>tempo</dt><dd>{chegou.tempo.toFixed(1)}s</dd></div>
            <div><dt>máx</dt><dd>{Math.round(chegou.vmax * 3.6)} km/h</dd></div>
            <div><dt>sinal</dt><dd>+{chegou.sinal}</dd></div>
            <div><dt>no ar</dt><dd>{chegou.ar.toFixed(1)}s</dd></div>
          </dl>
          <button type="button" className="l-btn" onClick={() => descerAqui(dest.id, chegou)}>descer na estação</button>
          <button
            type="button"
            className="l-btn l-btn-ghost"
            onClick={() => { setChegou(null); setDestino(null); jogo.current.chegando = false; jogo.current.parado = false }}
          >
            continuar rodando
          </button>
        </div>
      )}
    </div>
  )
}

// PASSO 1 da otimização: dentro de uma sala a estrada SAI da tela (desmonta,
// libera a memória da placa de vídeo). O mundo montado fica em cache e a
// posição da Kombi fica guardada aqui, pra ela voltar no mesmo ponto
let MUNDO: Mundo | null = null
function mundo() { return (MUNDO ??= montarMundo()) }
export interface Retomada { via: string; u: number; x: number; naVaga?: string | false; naSeg?: boolean }
let RETOMAR: Retomada | null = null

export interface Abertura {
  ativa: boolean
  via: number
  u: number
  porta: THREE.Vector3 // a porta da casa, no chão
  fase: "dirige" | "parou" | "ape" | "porta"
  pe: number // 0..1 do caminho a pé
  semGas: boolean
  t0: number
  de: THREE.Vector3 | null // onde desceu da Kombi
  onPorta: () => void
}

// a pessoa a pé (a abertura): o mesmo corpo da gente das portas
function Caminhante({ abRef }: { abRef: React.MutableRefObject<Abertura> }) {
  const { scene } = useGLTF("/models/pessoa.glb")
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2c2838", emissive: "#e6f0ff", emissiveIntensity: 0.12, roughness: 0.75 }), [])
  const corpo = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = mat })
    return g
  }, [scene, mat])
  const g = useRef<THREE.Group>(null)
  const passo = useRef(0)
  const ant = useRef(0)
  useFrame((_, dt) => {
    const a = abRef.current
    if (!g.current) return
    const vis = !!a.de && (a.fase === "ape" || a.fase === "porta")
    g.current.visible = vis
    if (!vis || !a.de) return
    g.current.position.lerpVectors(a.de, a.porta, a.pe)
    g.current.rotation.y = Math.atan2(a.porta.x - a.de.x, a.porta.z - a.de.z)
    if (a.pe !== ant.current) passo.current += dt * 9
    ant.current = a.pe
    g.current.position.y += Math.abs(Math.sin(passo.current)) * 0.05
  })
  return <group ref={g} visible={false}><primitive object={corpo} /></group>
}

function retomarJogo(M: Mundo, r: Retomada | null): Jogo | null {
  if (!r) return null
  const i = M.vias.findIndex((v) => v.id === r.via)
  if (i < 0) return null
  const j = novoJogo(M, null, null)
  const C = M.vias[i]
  j.via = i
  j.u = Math.min(Math.max(0, r.u), C.L - 1)
  j.x = r.x
  j.y = C.py[Math.floor(j.u / PASSO)] ?? j.y
  // já encostou nesse lugar: não reabre a cena parada na porta
  j.naVaga = r.naVaga
  j.naSeg = r.naSeg
  j.encaixar = true
  return j
}

function novoJogo(M: Mundo, destino: EstacaoId | null, estacao: EstacaoId | null, abertura = false): Jogo {
  // a abertura: no deserto, uns 650 m antes da casa da D-Bee
  if (abertura) {
    const di = M.vias.findIndex((v) => v.id === "deserto")
    const j = novoJogo(M, null, null)
    j.via = di
    j.u = LUGARES["casa-dbee"].u - 650
    j.y = M.vias[di].py[Math.floor(j.u / PASSO)]
    return j
  }
  // começa sempre no centro (cidade neon, 222.0)
  const c = M.vias[M.circuito.linha]
  const u0 = c.estacoes[0].u - 150
  let u = u0
  const e = (id: EstacaoId) => c.estacoes.find((x) => x.id === id)
  // com destino: ~900m antes, pra dar gosto de chegar
  if (destino && e(destino)) u = Math.max(u0, e(destino)!.u - 900)
  else if (estacao && e(estacao)) u = e(estacao)!.u + 25
  return {
    via: M.circuito.linha,
    u, x: 0, v: 0, vx: 0, steer: 0, y: c.py[Math.floor(u / PASSO)], vy: 0, ar: false, tAr: 0,
    turboT: 0, carga: 0, shake: 0, flash: 0, deriva: 0, giro: 0, drift: 0, peso: 0, ladoAnt: 0, driftT: 0, impacto: 0, soco: false, tempo: 0, voltaIni: -1, voltas: 0,
    chegando: false, parado: false, sintonizou: false,
    escolha: 0, escolhaU: -1,
    st: { tempo: 0, vmax: 0, orbs: 0, quase: 0, sinal: 0, ar: 0, voltas: 0 },
    pegos: new Set(),
  }
}

/* eslint-disable react-hooks/immutability, react-hooks/purity --
   cena R3F: useFrame muta geometria, instâncias e uniforms do three.js a
   60fps por design; nada disso é estado do React */
/* ─── cena ──────────────────────────────────────────────── */
function Cena({
  tags,
  M, jogo, input, evs, destinoRef, temTurbo, confeteRef, nivel, objetos, nLib, nLibRef, marcos, marcosRef, estacaoAlvo, corRadio, pausado, cinemaRef, limitadoRef, cacadoRef, dentroRef, discoRef, disco, carona, lugarAlvoRef, fonteRef, onTocaDiscos, vagaRef, camLugarRef, lugarAlvoId, cenaLugar, segredoRef, aberturaRef,
}: {
  segredoRef: React.MutableRefObject<{ id: LugarId; via: number; u: number; lado: 1 | -1; voltas: number } | null>
  aberturaRef: React.MutableRefObject<Abertura>
  fonteRef: React.MutableRefObject<Fonte>
  onTocaDiscos: () => void
  disco: boolean
  carona: EstacaoId | null
  lugarAlvoRef: React.MutableRefObject<FreqId | null>
  vagaRef: React.MutableRefObject<{ id: LugarId; via: number; u: number; lado: 1 | -1; nome: string; cor: string; quem: string } | null>
  camLugarRef: React.MutableRefObject<PoseLugar | null>
  lugarAlvoId: LugarId | null
  cenaLugar: LugarId | null
  dentroRef: React.MutableRefObject<boolean>
  discoRef: React.MutableRefObject<boolean>
  cacadoRef: React.MutableRefObject<boolean>
  limitadoRef: React.MutableRefObject<boolean>
  pausado: boolean
  cinemaRef: React.MutableRefObject<Cinema>
  corRadio: React.MutableRefObject<string>
  marcos: Marco[]
  marcosRef: React.MutableRefObject<Marco[]>
  estacaoAlvo: EstacaoId | null
  // quem tem missão em aberto em cada área (etiqueta nas placas)
  tags: Partial<Record<FreqId, { nome: string; cor: string }[]>>
  M: Mundo
  jogo: React.MutableRefObject<Jogo>
  input: React.MutableRefObject<Input>
  evs: React.MutableRefObject<Evs>
  destinoRef: React.MutableRefObject<EstacaoId | null>
  temTurbo: boolean
  confeteRef: React.MutableRefObject<((cor: string, n: number) => void) | null>
  nivel: number
  objetos: EstacaoId[]
  nLib: number
  nLibRef: React.MutableRefObject<number>
}) {
  // o lugar secreto já apareceu (Lugares acende a vaga dele)
  const [revelado, setRevelado] = useState<LugarId | null>(null)
  const { camera, scene, gl } = useThree()
  // olhar em volta de dentro (como na drive-v2): arrasta → gira até ±150° e
  // ±60°; solta → fica 7 s parado ali e depois volta devagar pra frente
  const olhar = useRef({ yaw: 0, pitch: 0, alvoYaw: 0, alvoPitch: 0, arrastando: false, soltou: 0, x: 0, y: 0, id: -1 })
  useEffect(() => {
    const el = gl.domElement
    const YAW = (150 * Math.PI) / 180
    const PITCH = (60 * Math.PI) / 180
    const o = olhar.current
    const down = (e: PointerEvent) => {
      if (!dentroRef.current || (e.pointerType === "mouse" && e.button !== 0)) return
      o.arrastando = true; o.x = e.clientX; o.y = e.clientY; o.id = e.pointerId
    }
    const move = (e: PointerEvent) => {
      if (!o.arrastando || e.pointerId !== o.id) return
      o.alvoYaw = Math.max(-YAW, Math.min(YAW, o.alvoYaw - (e.clientX - o.x) * 0.006))
      o.alvoPitch = Math.max(-PITCH, Math.min(PITCH, o.alvoPitch - (e.clientY - o.y) * 0.005))
      o.x = e.clientX; o.y = e.clientY
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== o.id) return
      o.arrastando = false; o.id = -1; o.soltou = performance.now()
    }
    el.addEventListener("pointerdown", down)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      el.removeEventListener("pointerdown", down)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
    }
  }, [gl, dentroRef])
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__olhar = (yaw: number, pitch = 0) => { const o = olhar.current; o.alvoYaw = yaw; o.alvoPitch = pitch; o.soltou = performance.now() }
    return () => { delete w.__olhar }
  }, [])
  const carro = useRef<THREE.Group>(null)
  const ceu = useRef<THREE.Mesh>(null)
  const a = useMemo(() => novaAmostra(), [])
  const motor = useMemo(() => montarMotor(), [])
  const reduz = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, [])
  const centro = M.vias[M.circuito.linha]
  const circuitos = useMemo(() => M.vias.filter((v) => v.tipo === "circuito"), [M])

  useEffect(() => () => motor?.parar(), [motor])
  // a estática da sintonia (entre um lugar e outro)
  const chiado = useRef<ReturnType<typeof estatica>>(null)
  const calar = useCallback(() => { chiado.current?.parar(); chiado.current = null }, [])
  useEffect(() => () => calar(), [calar])
  useEffect(() => {
    if (pausado) { calar(); motor?.atualizar(0, false, false) }
  }, [pausado, calar, motor])

  const metro = useMemo(() => montarMetro(M), [M])
  const centrosLugares = useMemo(() => Object.values(LUGARES).map((l) => poseLugar(M, l).centro), [M])
  // o subúrbio mora no meio do anel da cidade: o centro e até onde vai o chão
  const centroSub = useMemo(() => {
    const v = M.vias[M.circuito.linha]
    let x = 0, z = 0
    for (let i = 0; i < v.n; i++) { x += v.px[i]; z += v.pz[i] }
    x /= v.n
    z /= v.n
    let r = Infinity
    for (let i = 0; i < v.n; i++) r = Math.min(r, Math.hypot(v.px[i] - x, v.pz[i] - z))
    return { x, z, r: r - MEIA - 4 }
  }, [M])
  const tex = useMemo(() => ({ asfalto: texAsfalto(), janelas: texJanelas(), brilho: texBrilho(), turbo: texTurbo() }), [])

  // cor de cada trecho: o lugar do circuito; nas saídas, metade de cada lado
  const distI = useCallback((v: Via, i: number): Distrito => distritoDe(v.tipo === "saida" && i < v.n / 2 ? v.de! : v.t), [])
  const rgb = useMemo(() => {
    const m = new Map<string, [number, number, number]>()
    for (const d of DISTRITOS) for (const c of [...d.trilho, ...d.luz]) m.set(c, hexRgb(c))
    return (c: string) => m.get(c) ?? hexRgb(c)
  }, [])

  // ── pista ──
  const geo = useMemo(() => {
    const vias = M.vias as Via[]
    const U = (i: number) => i * PASSO
    // nunca um trilho atravessando pista: some onde a pista divide, onde
    // outra encosta chegando, e no começo/fim das saídas (coladas no circuito)
    const divide = (v: Via, i: number, lado: number) => v.faixas.some((f) => f.lado === lado && Math.abs(i - Math.floor(f.u / PASSO)) <= 1)
    const chegando = (v: Via, i: number) => v.chegadas.some((c) => U(i) > c.u - 220 && U(i) < c.u + 10)
    const trilhoE = (p: Pista, i: number) => {
      const v = p as Via
      const u = U(i)
      if (v.id === "deserto") return u > 90 && (u < 900 || u > v.L - 900) && u < v.L - 230
      if (v.tipo === "circuito") return !divide(v, i, -1)
      return !(v.lado! > 0 && u < 90) && u < v.L - 230
    }
    const trilhoD = (p: Pista, i: number) => {
      const v = p as Via
      const u = U(i)
      if (v.id === "deserto") return u < 900 || u > v.L - 900
      if (v.tipo === "circuito") return !divide(v, i, 1) && !chegando(v, i)
      return !(v.lado! < 0 && u < 90)
    }
    const rails = (lado: number) => fita(vias, (p, i) => (lado < 0 ? p.esq[i] - 0.25 : p.dir[i] + 0.25), 0.75, 0, {
      vertical: true,
      incluir: lado < 0 ? trilhoE : trilhoD,
      cor: (p, i) => (Math.floor(i / 10) % 2 ? rgb(distI(p as Via, i).trilho[lado < 0 ? 0 : 1]) : [0.05, 0.05, 0.12]),
    })
    const semEmenda = (p: Pista, i: number) => {
      const v = p as Via
      if (v.tipo === "circuito") return !divide(v, i, -1) && !divide(v, i, 1)
      return U(i) > 60 && U(i) < v.L - 120
    }
    // tracejado que separa a faixa de saída da pista que fica
    const divisoria = (lado: number) => fita(circuitos, lado * MEIA - 0.12, lado * MEIA + 0.12, 0.045, {
      incluir: (p, i) => i % 5 < 3 && (p as Via).faixas.some((f) => f.lado === lado && U(i) > f.u - ABRE + 110 && U(i) < f.u),
    })
    return {
      chao: fita(vias, (p, i) => p.esq[i] - 0.25, (p, i) => p.dir[i] + 0.25, 0.01),
      faixas: [-MEIA / 3, MEIA / 3].map((x) => fita(vias, x - 0.1, x + 0.1, 0.04, { incluir: (p, i) => i % 6 < 3 && semEmenda(p, i) })),
      bordas: [-1, 1].map((l) => fita(vias, (p, i) => (l < 0 ? p.esq[i] + 0.23 : p.dir[i] - 0.47), (p, i) => (l < 0 ? p.esq[i] + 0.47 : p.dir[i] - 0.23), 0.04, { incluir: semEmenda })),
      linhasGarfo: [divisoria(-1), divisoria(1)],
      railE: rails(-1),
      railD: rails(1),
      saiaE: fita(vias, (p, i) => p.esq[i] - 0.25, 1.8, -1.8, { vertical: true, incluir: (p, i) => semEmenda(p, i) && trilhoE(p, i) }),
      saiaD: fita(vias, (p, i) => p.dir[i] + 0.25, 1.8, -1.8, { vertical: true, incluir: (p, i) => semEmenda(p, i) && trilhoD(p, i) }),
    }
  }, [M, circuitos, distI, rgb])

  // ── cidade: cada lugar com a sua arquitetura e a cor do seu gás ──
  const cidade = useMemo(() => {
    const r = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646 })()
    const d = new THREE.Object3D()
    const ESTILO: Record<Distrito["predio"], { n: number; h: [number, number]; w: [number, number]; off: [number, number]; brilho: number }> = {
      torres: { n: 190, h: [24, 175], w: [10, 28], off: [22, 110], brilho: 1.25 },
      casas: { n: 170, h: [5, 16], w: [7, 13], off: [14, 70], brilho: 1.1 },
      aberto: { n: 70, h: [20, 70], w: [10, 22], off: [40, 170], brilho: 1.4 },
      tunel: { n: 0, h: [0, 0], w: [0, 0], off: [0, 0], brilho: 0 },
      brancas: { n: 110, h: [60, 210], w: [8, 14], off: [24, 100], brilho: 1.6 },
      obra: { n: 50, h: [30, 120], w: [12, 24], off: [22, 90], brilho: 0 },
    }
    const noTunel = (v: Via, i: number) => {
      const tt = territorio(v.t).tunel
      return v.tipo === "circuito" && !!tt && i / v.n > tt[0] && i / v.n < tt[1]
    }
    const topos: number[] = []
    const predios = circuitos.map((C) => {
      const t = territorio(C.t)
      const ds = distritoDe(C.t)
      const e = ESTILO[t.predio]
      const qt = Math.round((e.n * C.L) / 2600)
      const mat = new THREE.MeshStandardMaterial({ color: "#0a0c1e", emissive: ds.janela, emissiveMap: tex.janelas, emissiveIntensity: e.brilho, roughness: 0.62, metalness: 0.35 })
      // janela em escala real: a textura repete pelo tamanho de cada prédio
      // (antes um prédio de 200 m tinha janelas de 7 m) e cada prédio começa
      // num ponto diferente dela; telhado sem janela
      mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace("#include <uv_vertex>", `#include <uv_vertex>
          #ifdef USE_EMISSIVEMAP
            vec3 escala = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
            float largura = abs(normal.x) > 0.5 ? escala.z : escala.x;
            vec2 semente = fract(instanceMatrix[3].xz * vec2(0.0137, 0.0191));
            vEmissiveMapUv = vEmissiveMapUv * vec2(largura / 22.0, escala.y / 90.0) + semente;
            if (abs(normal.y) > 0.5) vEmissiveMapUv = vec2(0.0);
          #endif`)
      }
      const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, qt)
      let i = 0
      for (let tent = 0; i < qt && tent < qt * 10; tent++) {
        const k = Math.floor(r() * C.n)
        if (noTunel(C, k)) continue
        const lado = r() < 0.5 ? -1 : 1
        const off = MEIA + e.off[0] + r() * (e.off[1] - e.off[0])
        // o lado de DENTRO do anel da cidade (e o miolo do subúrbio) é o
        // subúrbio: sem torre ali (a Linha 9 passa por cima, a vista é lá pra baixo)
        if ((C === M.vias[M.circuito.linha] || C === M.vias[M.circuito.suburbio]) && lado < 0) continue
        const h = e.h[0] + r() * r() * (e.h[1] - e.h[0])
        const bx = C.px[k] - C.tz[k] * lado * off
        const bz = C.pz[k] + C.tx[k] * lado * off
        const w = e.w[0] + r() * (e.w[1] - e.w[0])
        if (!M.livre(bx, bz, 10 + w * 0.7)) continue
        if (centrosLugares.some((c) => Math.hypot(c.x - bx, c.z - bz) < 24 + w * 0.7)) continue
        d.position.set(bx, -12 + h / 2, bz)
        if (h > 85) topos.push(bx, -12 + h + 1.5, bz)
        d.rotation.set(0, Math.atan2(C.tx[k], C.tz[k]), 0)
        d.scale.set(w, h, e.w[0] + r() * (e.w[1] - e.w[0]))
        d.updateMatrix()
        m.setMatrixAt(i, d.matrix)
        i++
      }
      m.count = i
      return m
    })

    // túnel (a arena): arcos com paredes, teto e fita de luz vermelha
    const tuneis: { C: Via; k0: number; k1: number }[] = []
    for (const C of circuitos) {
      const tt = territorio(C.t).tunel
      if (tt) tuneis.push({ C, k0: Math.floor(tt[0] * C.n), k1: Math.floor(tt[1] * C.n) })
    }
    const nA = tuneis.reduce((s, x) => s + Math.floor((x.k1 - x.k0) / 5), 0)
    const arcos = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#2a0c10", emissive: "#3a0508", emissiveIntensity: 0.9, roughness: 0.6 }), Math.max(1, nA * 3))
    const fitas = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#ff2436", toneMapped: false }), Math.max(1, nA * 2))
    const q = new THREE.Vector3()
    let ia = 0
    for (const { C, k0, k1 } of tuneis) {
      for (let k = k0; k < k1 - 4; k += 5) {
        const rot = Math.atan2(C.tx[k], C.tz[k])
        const ban = C.bank[k]
        const pecas: [number, number, number, number, number][] = [
          [-(MEIA + 1.6), 4.6, 1, 9.2, 10.4],
          [MEIA + 1.6, 4.6, 1, 9.2, 10.4],
          [0, 9.4, MEIA * 2 + 4.2, 0.8, 10.4],
        ]
        pecas.forEach(([x, y, sx, sy, sz], jj) => {
          pontoI(C, k, x, y, q)
          d.position.copy(q)
          d.rotation.set(0, rot, 0)
          d.rotateZ(ban)
          d.scale.set(sx, sy, sz)
          d.updateMatrix()
          arcos.setMatrixAt(ia * 3 + jj, d.matrix)
        })
        for (const l of [-1, 1]) {
          pontoI(C, k, l * (MEIA + 1), 8.9, q)
          d.position.copy(q)
          d.rotation.set(0, rot, 0)
          d.scale.set(0.25, 0.12, 9)
          d.updateMatrix()
          fitas.setMatrixAt(ia * 2 + (l > 0 ? 1 : 0), d.matrix)
        }
        ia++
      }
    }
    arcos.count = ia * 3
    fitas.count = ia * 2

    // pilares embaixo de todas as vias
    const pil: [number, number, number, number][] = []
    // (só onde descer até a água não fura outra pista)
    for (const v of M.vias) for (let k = 0; k < v.n; k += 20) if (v.py[k] > -9 && M.vao(v.px[k], v.pz[k], v.py[k])) pil.push([v.px[k], v.py[k], v.pz[k], 0])
    const pilares = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 1, 1.6), new THREE.MeshStandardMaterial({ color: "#10122a", roughness: 0.8 }), pil.length)
    pil.forEach(([x, y, z], i) => {
      const h = y + 12
      d.position.set(x, -12 + h / 2 - 1.8, z)
      d.rotation.set(0, 0, 0)
      d.scale.set(1, h, 1)
      d.updateMatrix()
      pilares.setMatrixAt(i, d.matrix)
    })

    // postes a cada 24m dos dois lados, na cor do lugar (no túnel a luz é a
    // fita do teto)
    // (nunca em cima de outra pista: somem onde a saída descola e onde
    // outra encosta chegando)
    const ks: { v: Via; k: number; lado: number }[] = []
    for (const v of M.vias) {
      for (let k = 0; k < v.n; k += 12) {
        const u = k * PASSO
        if (v.tipo === "saida" && (u < 150 || u > v.L - 240)) continue
        if (noTunel(v, k)) continue
        for (const lado of [-1, 1]) {
          if (v.tipo === "circuito") {
            if (v.faixas.some((f) => f.lado === lado && u > f.u - 4 && u < f.u + 140)) continue
            if (lado > 0 && v.chegadas.some((c) => u > c.u - 240 && u < c.u + 10)) continue
          }
          ks.push({ v, k, lado })
        }
      }
    }
    const nL = ks.length
    const postes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 7.2, 0.16), new THREE.MeshStandardMaterial({ color: "#22243e" }), nL)
    const luzPos = new Float32Array(nL * 3)
    const luzCor = new Float32Array(nL * 3)
    const reflexos = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.8, 11),
      new THREE.MeshBasicMaterial({ map: tex.brilho, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }),
      nL,
    )
    const c = new THREE.Color()
    let n = 0
    for (const { v, k, lado } of ks) {
      const ds = distI(v, k)
      {
        const borda = lado < 0 ? v.esq[k] : v.dir[k]
        pontoI(v, k, borda + lado * 0.9, 3.6, q)
        d.position.copy(q)
        d.rotation.set(0, 0, 0)
        d.scale.set(1, 1, 1)
        d.updateMatrix()
        postes.setMatrixAt(n, d.matrix)
        pontoI(v, k, borda - lado * 0.8, 7.1, q)
        luzPos.set([q.x, q.y, q.z], n * 3)
        c.set(ds.luz[(k / 12 + (lado > 0 ? 1 : 0)) % ds.luz.length])
        luzCor.set([c.r, c.g, c.b], n * 3)
        pontoI(v, k, borda - lado * 2, 0.05, q)
        d.position.copy(q)
        d.rotation.set(-Math.PI / 2, 0, Math.atan2(v.tx[k], v.tz[k]))
        d.updateMatrix()
        reflexos.setMatrixAt(n, d.matrix)
        reflexos.setColorAt(n, c)
        n++
      }
    }
    const luzes = new THREE.BufferGeometry()
    luzes.setAttribute("position", new THREE.BufferAttribute(luzPos, 3))
    luzes.setAttribute("color", new THREE.BufferAttribute(luzCor, 3))
    const luzMat = new THREE.PointsMaterial({ size: 3.6, map: tex.brilho, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true })

    // outdoors do NÚCLEO na avenida
    const av = M.vias[M.circuito.full]
    const frases = ["OTIMIZE-SE ✓", "VOCÊ ESTÁ FELIZ ✓", "NÚCLEO", "NADA MUDOU ✓", "VOLTE AO FEED ✓"]
    const outdoors = frases.map((txt, jj) => {
      const k = Math.floor((0.12 + (jj / frases.length) * 0.7) * av.n)
      const lado = jj % 2 ? 1 : -1
      return {
        pos: pontoI(av, k, lado * (MEIA + 16), 14, new THREE.Vector3()),
        rot: Math.atan2(av.tx[k], av.tz[k]) + Math.PI + lado * -0.5,
        tex: texTexto([{ txt, tam: 120, cor: "#eef3ff" }]),
      }
    })

    // a luz vermelha de aviação no topo dos prédios altos (pisca no loop)
    const aviacao = new THREE.BufferGeometry()
    aviacao.setAttribute("position", new THREE.BufferAttribute(new Float32Array(topos), 3))
    const aviacaoMat = new THREE.PointsMaterial({ size: 5, map: tex.brilho, color: "#ff2a2a", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })

    return { predios, arcos, fitas, pilares, postes, luzes, luzMat, reflexos, outdoors, aviacao, aviacaoMat }
  }, [M, circuitos, tex, distI, centrosLugares])

  // ── colunas de luz: só onde a missão manda agora (a coisa pra buscar,
  // ou a estação de quem te chamou), dá pra ver de longe ──
  const colunas = useMemo(() => [
    ...centro.estacoes
      .filter(({ id }) => id === estacaoAlvo && !objetos.includes(id))
      .map(({ id, u }) => ({ id: id as string, cor: getEstacao(id).cor, item: false, pos: noMundo(centro, u, 0, 0, a, new THREE.Vector3()) })),
    ...marcos.map((m) => ({ id: m.chave, cor: m.cor, item: true, pos: noMundo(M.vias[m.via], m.u, 0, 0, a, new THREE.Vector3()) })),
  ], [M, centro, a, objetos, estacaoAlvo, marcos])

  // ── placas: cada bifurcação tem dois pórticos (aviso e "agora"), com
  // três placas — ← saída da esquerda, ↑ fica, saída da direita → ──
  const placas = useMemo(() => {
    const lista: {
      id: string; pos: THREE.Vector3; rot: number; topo: THREE.Texture
      paineis: { x: number; cor: string; tex: THREE.Texture; area?: FreqId }[]
    }[] = []
    const setas: { p: THREE.Vector3; rot: number; cor: string; op: number }[] = []
    const barreiras: { p: THREE.Vector3; rot: number }[] = []
    const MONO = "ui-monospace, monospace"
    for (const C of circuitos) {
      const aqui = freqDe(C.t)
      const us = [...new Set(C.faixas.map((f) => f.u))].sort((x, y) => y - x)
      us.forEach((uk, si) => {
        const lados = [C.faixas.find((f) => f.u === uk && f.lado < 0), undefined, C.faixas.find((f) => f.u === uk && f.lado > 0)]
        const paineis = lados.map((f, k) => {
          const x = (k - 1) * CK
          if (k === 1) return { x, cor: aqui.cor, area: C.t, tex: texTexto([{ txt: "↑", tam: 110, cor: aqui.cor }, { txt: territorio(C.t).lugar.toUpperCase(), tam: 62, cor: aqui.cor }, { txt: "fica · mais uma volta", tam: 40, cor: "#ffffff", fonte: MONO }], 512, 352) }
          // bifurcação de um lado só (as descidas pro subúrbio, a saída dele)
          if (!f) return null
          const fr = freqDe(f.para)
          const seta = f.lado < 0 ? "←" : "→"
          // a saída pro deserto (mundo.ts)
          if (M.vias[f.via]?.id === "deserto") return { x, cor: "#e8b86a", tex: texTexto([{ txt: seta, tam: 110, cor: "#e8b86a" }, { txt: "DESERTO", tam: 62, cor: "#e8b86a" }, { txt: "sem rádio", tam: 40, cor: "#ffffff", fonte: MONO }], 512, 352) }
          return aberta(f!, nLib)
            ? { x, cor: fr.cor, area: f!.para, tex: texTexto([{ txt: seta, tam: 110, cor: fr.cor }, { txt: lugarDe(f!.para).toUpperCase(), tam: 62, cor: fr.cor }, { txt: `${fr.freq} FM`, tam: 46, cor: "#ffffff", fonte: MONO }], 512, 352) }
            : { x, cor: "#555a77", tex: texTexto([{ txt: "TRANCADA", tam: 60, cor: "#8a8fae" }, { txt: lugarDe(f!.para).toUpperCase(), tam: 56, cor: "#8a8fae" }, { txt: `junta ${fr.custo} de sinal`, tam: 40, cor: "#b0b5d0", fonte: MONO }], 512, 352) }
        })
        const paineisOk = paineis.filter((x): x is NonNullable<typeof x> => !!x)
        // o aviso da segunda bifurcação do centro vem logo depois da primeira
        const antes = us.length > 1 && si === 0 ? 240 : 330
        for (const [dist, agora] of [[antes, false], [100, true]] as const) {
          // placa de aviso que cairia ANTES de outra bifurcação confunde
          // (parece apontar pra entrada de antes): só fica a do "agora"
          if (!agora && us.some((u2) => u2 < uk && u2 > uk - dist - 20)) continue
          const pos = noMundo(C, uk - dist, 0, 0, a, new THREE.Vector3())
          lista.push({
            id: `${C.id}:${uk}:${dist}`,
            pos,
            rot: Math.atan2(a.tx, a.tz),
            topo: texTexto([{ txt: agora ? "SAÍDAS · AGORA" : `SAÍDAS EM ${dist} M`, tam: 96, cor: "#ffc857" }], 1024, 128),
            paineis: paineisOk,
          })
        }
        // setas no chão: reto no meio, diagonal em cada faixa de saída
        for (const d0 of [90, 35]) {
          const u = uk - d0
          setas.push({ p: noMundo(C, u, 0, 0.06, a, new THREE.Vector3()), rot: Math.atan2(-a.tx, -a.tz), cor: aqui.cor, op: 0.8 })
          for (const f of [lados[0], lados[2]]) {
            if (!f) continue
            const ok = aberta(f, nLib)
            setas.push({ p: noMundo(C, u, f.lado * CK, 0.06, a, new THREE.Vector3()), rot: Math.atan2(-a.tx, -a.tz) - f.lado * 0.35, cor: ok ? freqDe(f.para).cor : "#444860", op: ok ? 0.95 : 0.35 })
          }
        }
        for (const f of [lados[0], lados[2]]) {
          if (!f || aberta(f, nLib)) continue
          barreiras.push({ p: noMundo(C, uk - 4, f.lado * CK, 0.9, a, new THREE.Vector3()), rot: Math.atan2(a.tx, a.tz) })
        }
      })
    }
    return { lista, setas, barreiras }
  }, [circuitos, a, nLib])

  // embaixo de cada placa, uma bolinha por missão em aberto naquela área:
  // a cor e a inicial de quem chama (sem nome)
  const tagTex = useMemo(() => {
    const out: Partial<Record<FreqId, THREE.Texture>> = {}
    for (const [area, q] of Object.entries(tags) as [FreqId, { nome: string; cor: string }[]][]) {
      if (!q.length) continue
      const c = document.createElement("canvas")
      c.width = 1024
      c.height = 112
      const g = c.getContext("2d")!
      const R = 44, passo = R * 2 + 26
      const x0 = 512 - ((q.length - 1) * passo) / 2
      q.forEach((x, i) => {
        const cx = x0 + i * passo
        g.beginPath()
        g.arc(cx, 56, R, 0, Math.PI * 2)
        g.fillStyle = x.cor
        g.fill()
        g.fillStyle = "#070817"
        g.font = "800 54px ui-sans-serif, system-ui, sans-serif"
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText(x.nome[0].toUpperCase(), cx, 59)
      })
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      out[area] = t
    }
    return out
  }, [tags])

  // faixa de saída pintada na cor da rádio (cinza se trancada) e muro
  // listrado na trancada (física: ver limite no loop)
  const pinturas = useMemo(() => {
    const U = (i: number) => i * PASSO
    const faixaEm = (p: Pista, i: number, lado: number) => (p as Via).faixas.find((f) => f.lado === lado && U(i) > f.u - ABRE + 40 && U(i) <= f.u)
    const pint = (lado: number) => fita(circuitos, lado > 0 ? MEIA + 0.4 : -(MEIA + FAIXA) + 0.4, lado > 0 ? MEIA + FAIXA - 0.4 : -MEIA - 0.4, 0.03, {
      incluir: (p, i) => !!faixaEm(p, i, lado),
      cor: (p, i) => {
        const f = faixaEm(p, i, lado)!
        return aberta(f, nLib) ? hexRgb(freqDe(f.para).cor) : [0.25, 0.26, 0.34]
      },
    })
    const muro = (lado: number) => fita(circuitos, lado * (MEIA + 0.25), 1.1, 0, {
      vertical: true,
      incluir: (p, i) => { const f = faixaEm(p, i, lado); return !!f && !aberta(f, nLib) },
      cor: (_p, i) => (i % 2 ? [1, 0.25, 0.35] : [0.95, 0.95, 1]),
    })
    return { faixas: [pint(-1), pint(1)], muros: [muro(-1), muro(1)] }
  }, [circuitos, nLib])

  // ── orbs (todas as vias numa malha só) ──
  const orbs = useMemo(() => {
    const lista: { via: number; u: number; x: number }[] = []
    const porVia: number[][] = M.vias.map(() => [])
    M.vias.forEach((v, vi) => v.orbs.forEach((o) => { porVia[vi].push(lista.length); lista.push({ via: vi, u: o.u, x: o.x }) }))
    const m = new THREE.InstancedMesh(new THREE.TorusGeometry(0.75, 0.14, 8, 22), new THREE.MeshBasicMaterial({ color: "#2fe8ff", toneMapped: false }), lista.length)
    const pos = new Float32Array(lista.length * 3)
    const v3 = new THREE.Vector3()
    lista.forEach((o, i) => {
      noMundo(M.vias[o.via], o.u, o.x, 1.4, a, v3)
      pos.set([v3.x, v3.y, v3.z], i * 3)
    })
    const halo = new THREE.BufferGeometry()
    halo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    const haloMat = new THREE.PointsMaterial({ size: 4, map: tex.brilho, color: "#2fe8ff", transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 })
    return { m, pos, halo, haloMat, lista, porVia }
  }, [M, a, tex])

  // ── turbos no chão ──
  const turbos = useMemo(() => {
    const lista: { via: number; u: number; x: number; p: THREE.Vector3; rot: number }[] = []
    M.vias.forEach((v, vi) => v.turbos.forEach((t) => {
      const p = noMundo(v, t.u, t.x, 0.06, a, new THREE.Vector3())
      // o +Y da textura (pra onde as setas apontam) alinhado com a tangente
      lista.push({ via: vi, u: t.u, x: t.x, p, rot: Math.atan2(-a.tx, -a.tz) })
    }))
    return lista
  }, [M, a])

  // ── tráfego: cada circuito com o seu ──
  const trafego = useMemo(() => {
    const carros: { via: number; u: number; x: number; v: number; passou: boolean; bateu: number }[] = []
    circuitos.forEach((C) => {
      const vi = M.vias.indexOf(C)
      const q = Math.max(4, Math.round(C.L / 480))
      for (let i = 0; i < q; i++) carros.push({ via: vi, u: (i / q) * C.L + 60, x: [-MEIA * 0.62, 0, MEIA * 0.62][i % 3], v: 20 + (i % 5) * 3.2, passou: false, bateu: 0 })
    })
    const n = carros.length
    const corpo = new THREE.InstancedMesh(new THREE.BoxGeometry(1.9, 1.3, 4.2), new THREE.MeshStandardMaterial({ color: "#1b1d36", metalness: 0.6, roughness: 0.35 }), n)
    const lant = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.2, 0.06), new THREE.MeshBasicMaterial({ color: "#ff2a44", toneMapped: false }), n * 2)
    return { carros, corpo, lant }
  }, [M, circuitos])

  // ── os carros brancos do Núcleo (a caça) ──
  const caca = useMemo(() => {
    const n = 2
    const corpo = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 1.25, 4.4), new THREE.MeshStandardMaterial({ color: "#eef3ff", emissive: "#9fb4ff", emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.2 }), n)
    const barra = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.18, 0.4), new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }), n)
    const farol = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.18, 0.06), new THREE.MeshBasicMaterial({ color: "#dff4ff", toneMapped: false }), n * 2)
    corpo.count = 0; barra.count = 0; farol.count = 0
    const carros = Array.from({ length: n }, (_, i) => ({ u: 0, x: (i ? -1 : 1) * 2, v: 0 }))
    return { corpo, barra, farol, carros, ativa: false, via: -1, perdidoT: 0, longeT: 0, espera: 0, cor: new THREE.Color() }
  }, [])

  // ── chuva (só visual), confete, faíscas ──
  const chuvaRef = useRef<THREE.LineSegments>(null)
  const chuva = useMemo(() => {
    const n = 700
    const pos = new Float32Array(n * 6)
    const base = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) base.set([(Math.random() - 0.5) * 70, Math.random() * 40, (Math.random() - 0.5) * 70], i * 3)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, base, g }
  }, [])

  const confete = useMemo(() => {
    const n = 260
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 0.34), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n)
    const s = Array.from({ length: n }, () => ({ vivo: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3() }))
    const d = new THREE.Object3D()
    d.scale.set(0, 0, 0)
    d.updateMatrix()
    for (let i = 0; i < n; i++) { m.setMatrixAt(i, d.matrix); m.setColorAt(i, new THREE.Color("#fff")) }
    return { m, s, d, prox: 0 }
  }, [])

  useEffect(() => {
    confeteRef.current = (cor: string, qt: number) => {
      const car = carro.current
      if (!car) return
      const cs = [new THREE.Color(cor), new THREE.Color("#ffffff"), new THREE.Color("#ffc857"), new THREE.Color("#2fe8ff")]
      for (let k = 0; k < qt; k++) {
        const i = confete.prox++ % confete.s.length
        const c = confete.s[i]
        c.vivo = 2.2 + Math.random()
        c.p.copy(car.position).add(new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 3, (Math.random() - 0.5) * 6))
        c.v.set((Math.random() - 0.5) * 9, 5 + Math.random() * 7, (Math.random() - 0.5) * 9)
        c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
        c.w.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12)
        confete.m.setColorAt(i, cs[k % cs.length])
      }
      if (confete.m.instanceColor) confete.m.instanceColor.needsUpdate = true
    }
    return () => { confeteRef.current = null }
  }, [confete, confeteRef])

  // drift: marca de pneu das 4 rodas no asfalto (anel que vai sobrescrevendo)
  // e fumaça saindo das 4
  const marcas = useMemo(() => {
    const n = 1600
    const m = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.3, 0.95),
      new THREE.MeshBasicMaterial({ color: "#030308", transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      n,
    )
    m.frustumCulled = false
    const zero = new THREE.Matrix4().makeScale(0, 0, 0)
    for (let i = 0; i < n; i++) m.setMatrixAt(i, zero)
    return { m, n, prox: 0 }
  }, [])
  const fumaca = useMemo(() => {
    const n = 160
    const pos = new Float32Array(n * 3).fill(-999)
    const vel = new Float32Array(n * 3)
    const vida = new Float32Array(n)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, vel, vida, g, prox: 0 }
  }, [])
  const texFumaca = useMemo(() => texBrilho(), [])
  const RODAS = useMemo(() => [[-0.82, -1.35], [0.82, -1.35], [-0.82, 1.35], [0.82, 1.35]].map(([x, z]) => new THREE.Vector3(x, 0.03, z)), [])

  const faiscas = useMemo(() => {
    const n = 90
    const pos = new Float32Array(n * 3)
    const vel = new Float32Array(n * 3)
    const vida = new Float32Array(n)
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    return { n, pos, vel, vida, g, prox: 0 }
  }, [])

  // céu de cidade grande à noite: gradiente, poluição luminosa no horizonte
  // (sódio laranja + a cor do bairro), um teto de nuvens baixas acesas POR
  // BAIXO pela cidade e andando com o vento, a lua atravessando as nuvens
  // (borda prateada) e umas estrelas nos buracos
  const ceuMat = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { lua: { value: new THREE.Vector3(0.4, 0.35, -0.85).normalize() }, tinta: { value: new THREE.Color("#4a1a30") }, nevoaC: { value: new THREE.Color("#1a0f24") }, tempo: { value: 0 } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `varying vec3 vP; uniform vec3 lua; uniform vec3 tinta; uniform vec3 nevoaC; uniform float tempo;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int k = 0; k < 5; k++){ v += a * ruido(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vP);
        float h = d.y;
        float hp = max(h, 0.0);
        vec3 topo = vec3(0.012, 0.014, 0.05);
        vec3 meio = vec3(0.05, 0.07, 0.2);
        vec3 c = mix(nevoaC, tinta, smoothstep(-0.04, 0.03, h));
        c = mix(c, meio, smoothstep(0.03, 0.25, h));
        c = mix(c, topo, smoothstep(0.25, 0.85, h));
        // poluição luminosa: a cidade acende o horizonte
        vec3 sodio = vec3(1.0, 0.46, 0.18);
        c += tinta * exp(-hp * 9.0) * 0.55 + sodio * exp(-hp * 16.0) * 0.16;
        // estrelas (só lá em cima)
        vec2 g = floor(d.xz / (hp + 0.15) * 260.0);
        float est = step(0.9965, hash(g)) * smoothstep(0.2, 0.5, h);
        c += vec3(0.75, 0.8, 1.0) * est * (0.5 + 0.5 * sin(tempo * 3.0 + hash(g) * 40.0));
        // lua + halo
        float m = max(dot(d, lua), 0.0);
        vec3 luaC = vec3(0.85, 0.9, 1.0) * smoothstep(0.99935, 0.99965, m) * 1.6;
        vec3 halo = vec3(0.3, 0.36, 0.7) * pow(m, 48.0) * 0.55;
        c += luaC + halo;
        // nuvens: um teto baixo, projetado num plano, andando com o vento
        vec2 uv = d.xz / (hp + 0.09) * 2.1 + vec2(tempo * 0.012, tempo * 0.005);
        float n = fbm(uv);
        float n2 = fbm(uv * 2.7 - tempo * 0.02);
        float cob = smoothstep(0.34, 0.7, n * 0.75 + n2 * 0.35) * smoothstep(0.0, 0.07, h);
        // a base da nuvem pega a luz da cidade; o alto fica escuro
        vec3 nuvem = mix(tinta * 1.25 + sodio * 0.18, vec3(0.035, 0.035, 0.08), smoothstep(0.02, 0.55, h));
        nuvem *= 0.65 + 0.55 * n2;
        // borda prateada onde a lua bate
        nuvem += vec3(0.55, 0.62, 0.95) * pow(m, 10.0) * (1.0 - cob) * cob * 2.4;
        c = mix(c, nuvem, cob * 0.92);
        gl_FragColor = vec4(c, 1.0);
      }`,
  }), [])

  useEffect(() => {
    scene.fog = new THREE.Fog("#1a0f24", 70, 950)
    scene.background = new THREE.Color("#1a0f24")
    return () => { scene.fog = null; camera.up.set(0, 1, 0) }
  }, [scene, camera])

  // ── loop ──
  const tmp = useMemo(() => ({
    f: new THREE.Vector3(), r: new THREE.Vector3(), up: new THREE.Vector3(), p: new THREE.Vector3(),
    alvo: new THREE.Vector3(), olhar: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), q2: new THREE.Vector3(),
    qYaw: new THREE.Quaternion(), qRoll: new THREE.Quaternion(), camOlhar: new THREE.Vector3(), d: new THREE.Object3D(),
    qMarca: new THREE.Quaternion(), qDeriva: new THREE.Quaternion(), roda: new THREE.Vector3(),
    qDeitar: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2),
    y0: new THREE.Vector3(0, 1, 0), z0: new THREE.Vector3(0, 0, 1), camUp: new THREE.Vector3(0, 1, 0), upMix: new THREE.Vector3(),
    c1: new THREE.Color(), c2: new THREE.Color(),
  }), [])
  const hudN = useRef(0)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const alvoNevoa = useMemo(() => new THREE.Color(), [])
  const alvoCeu = useMemo(() => new THREE.Color(), [])
  const kTurbo = useRef(false)
  const kVel = useRef(0)
  const kEsterco = useRef(0)
  const kVolante = useRef(0)
  const kBalanco = useRef(0)
  const corpoK = useRef<THREE.Group>(null)
  const cabineG = useRef<THREE.Group>(null)
  const luzBaixo = useRef<THREE.PointLight>(null)
  const camInit = useRef(false)
  const falasT = useRef({ prox: 6, i: 0, raspa: 0 })

  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const j = jogo.current
    const inp = input.current
    const ev = evs.current
    if (!ev) return
    j.tempo += dt
    const grave = player.grave()
    let V = M.vias[j.via]

    // ── física na via ──
    amostra(V, j.u, a)
    const pct = j.v / VMAX
    const cine = cinemaRef.current
    if (cine) {
      // piloto automático: segue a pista no meio (nunca pega saída), sem
      // pressa; parando = encosta à direita e estaciona devagar
      const alvoX = cine === "lugar" ? j.x : cine === "parando" ? Math.min(MEIA * 0.4, a.dir - 2) : 0
      const alvoSteer = Math.max(-1, Math.min(1, (alvoX - j.x) / 3))
      j.steer += (alvoSteer - j.steer) * Math.min(1, dt * 3)
      j.escolha = 0
      if (cine === "lugar") j.v = Math.max(0, j.v - (8 + j.v * 0.6) * dt)
      else if (cine === "parando") j.v = Math.max(0, j.v - (2.6 + j.v * 0.12) * dt)
      else j.v += (VCINEMA - j.v) * Math.min(1, dt * 0.5)
      j.vx += (j.steer * (6 + 10 * Math.min(1, Math.abs(pct))) - j.vx) * Math.min(1, dt * 7)
      j.x += (j.vx - a.curv * j.v * Math.abs(j.v) * 0.035 * (1 - Math.min(0.75, Math.abs(a.bank) * 2.4))) * dt
    } else if (j.chegando) {
      j.v = Math.max(0, j.v - FREIO * 0.8 * dt)
      j.x += (0 - j.x) * dt * 1.5
      if (j.v < 0.5 && !j.parado) { j.parado = true; ev.chegou(); motor?.atualizar(0, false, false) }
    } else {
      // de dentro (primeira pessoa) a Kombi vai no AUTOMÁTICO: segue a pista
      // e pega sozinha a saída que leva pra missão; você só olha em volta
      const auto = dentroRef.current && !cine
      // no automático, chegando na vaga da missão: encosta e freia sozinha
      const vgA = auto ? vagaRef.current : null
      const dVaga = vgA && vgA.via === j.via ? du(V, j.u, vgA.u) : Infinity
      const encostando = !!vgA && dVaga > -VAGA / 2 && dVaga < 90
      const xAuto = encostando ? vgA!.lado * MEIA * 0.55 : 0
      let alvoSteer = auto ? Math.max(-1, Math.min(1, (xAuto - j.x) / 3)) : (inp.esq ? -1 : 0) + (inp.dir ? 1 : 0)
      // bifurcação: nos últimos 330m, um toque pro lado MARCA a saída e a
      // Kombi entra sozinha na faixa (antes tinha que acertar a faixa no
      // metro exato da divisão — era a trava). Toque do outro lado desmarca.
      let fProx: Faixa | null = null
      if (V.tipo === "circuito") {
        for (const f of V.faixas) {
          const dd = f.u - j.u
          if (dd > 0 && dd < 330 && (!fProx || f.u < fProx.u)) fProx = f
        }
      }
      if (fProx) {
        if (j.escolhaU !== fProx.u) { j.escolha = 0; j.escolhaU = fProx.u }
        const uk = fProx.u
        const lado = (l: 1 | -1) => V.faixas.find((f) => f.u === uk && f.lado === l)
        const pode = (l: 1 | -1) => { const f = lado(l); return !!f && aberta(f, nLibRef.current) }
        if (auto) {
          const la = lugarAlvoRef.current
          const pra = la ? rumo(V.t, la) : null
          const f = pra ? V.faixas.find((x) => x.u === uk && x.para === pra && aberta(x, nLibRef.current)) : undefined
          j.escolha = f ? f.lado : 0
        }
        if (!auto && inp.toqueD) j.escolha = j.escolha === -1 ? 0 : pode(1) ? 1 : j.escolha
        if (!auto && inp.toqueE) j.escolha = j.escolha === 1 ? 0 : pode(-1) ? -1 : j.escolha
        if (j.escolha && (auto || (!inp.esq && !inp.dir))) {
          const lim = j.escolha > 0 ? a.dir - 1.3 : a.esq + 1.3
          const alvoX = j.escolha > 0 ? Math.min(CK, lim) : Math.max(-CK, lim)
          alvoSteer = Math.max(-1, Math.min(1, (alvoX - j.x) / 2.5))
        }
      } else j.escolha = 0
      inp.toqueE = false
      inp.toqueD = false
      j.steer += (alvoSteer - j.steer) * Math.min(1, dt * 7)
      // nos viadutos entre lugares a pista é expressa
      // invasão do Núcleo: a estrada não para, mas o motor fica limitado
      const vmax = (j.turboT > 0 ? VTURBO : VMAX) * (V.tipo === "saida" ? 1.2 : 1) * (limitadoRef.current ? 0.45 : 1) * (auto ? 0.78 : 1)
      // acelerador, freio e RÉ: perdeu a entrada, freia e volta de ré
      // a abertura: sem combustível o pedal não responde
      const ab = aberturaRef.current
      const abAqui = ab.ativa && j.via === ab.via
      const gas = !(abAqui && (ab.semGas || ab.fase !== "dirige")) && (auto || inp.gas || (toqueTela && !inp.freio))
      if (inp.freio && !auto) {
        if (j.v > 0.8) j.v = Math.max(0, j.v - FREIO * dt)
        else j.v = Math.max(-VRE, j.v - 9 * dt)
      } else if (gas || j.turboT > 0) {
        if (j.v < 0) j.v = Math.min(0, j.v + FREIO * dt)
        else j.v += (ACEL * (1 - Math.pow(Math.min(1, j.v / vmax), 2)) + (j.turboT > 0 ? 16 : 0)) * dt
      } else {
        // solto: a Kombi vai perdendo embalo sozinha
        const atrito = (2.2 + 0.006 * j.v * j.v) * dt
        j.v = Math.abs(j.v) <= atrito ? 0 : j.v - Math.sign(j.v) * atrito
      }
      if (j.v > vmax) j.v += (vmax - j.v) * dt * 1.5
      if (encostando) j.v = Math.min(j.v, Math.max(2.5, dVaga * 0.3))
      if (abAqui) {
        // o combustível acaba uns 110 m antes da casa: no embalo, para em frente
        const falta = ab.u - j.u
        if (falta < 110 && falta > -5) ab.semGas = true
        if (ab.semGas && ab.fase === "dirige") {
          const vPara = Math.sqrt(2 * 2.6 * Math.max(0, falta))
          j.v = Math.min(vPara, Math.max(j.v, Math.min(8, vPara)))
          if (falta < 0.6) { j.v = 0; ab.fase = "parou"; ab.t0 = j.tempo }
        }
        if (ab.fase !== "dirige") j.v = 0
      }
      j.v = Math.min(j.v, VTURBO * 1.08)
      if (j.turboT > 0) j.turboT -= dt
      // DRIFT DE VERDADE — sem botão, é a finta (o "pêndulo" do rali):
      // virar pra um lado joga o PESO da Kombi pra aquele lado. Se, com o
      // peso ainda carregado e acima de VDRIFT, a direção vira de uma vez
      // pro outro lado, a traseira descarrega e as QUATRO rodas perdem
      // aderência juntas: a carroceria gira pra dentro da curva (deriva)
      // enquanto o embalo continua levando a Kombi pra onde ela ia — ela
      // anda de lado. Segurar pra dentro mantém o ângulo; contraesterçar
      // fecha (e, forte, joga o drift pro outro lado: pêndulo); soltar deixa
      // a aderência voltar e ela endireita sozinha.
      const lado = (inp.dir ? 1 : 0) - (inp.esq ? 1 : 0)
      const pesoAnt = j.peso
      j.peso += ((j.ar ? 0 : j.steer * Math.min(1, Math.max(0, pct) * 1.6)) - j.peso) * Math.min(1, dt * 4)
      if (!j.drift && lado !== 0 && lado !== j.ladoAnt && !j.ar && j.v > VDRIFT && -lado * pesoAnt > PESO_FINTA) {
        // a finta: peso de um lado, volante pro outro. Quanto mais peso, mais
        // a carroceria gira de saída
        j.drift = lado as 1 | -1
        j.giro = lado * (1.4 + Math.abs(pesoAnt) * 2.2)
        j.driftT = 0
        j.shake = Math.max(j.shake, 0.18)
        vib([12, 18, 24])
      }
      j.ladoAnt = lado
      const re = j.v < 0 ? -0.6 : 1
      if (j.drift) {
        const d = j.drift
        // torque na carroceria: pra dentro sustenta, contra fecha, solto =
        // só a aderência voltando (o -deriva) puxa ela de volta
        // (solto, os pneus voltam a morder: puxa bem mais forte pro reto)
        const torque = (lado === d ? 1.7 : lado === -d ? -2.6 : 0) * d * (0.6 + 0.4 * Math.min(1, pct * 1.5)) - j.deriva * (lado === d ? 2.4 : 7)
        j.giro += (torque - j.giro * 3) * dt
        j.deriva += j.giro * dt
        if (Math.abs(j.deriva) > DERIVA_MAX) { j.deriva = Math.sign(j.deriva) * DERIVA_MAX; j.giro *= -0.2 }
        // de lado, a Kombi carrega o embalo (resposta lenta) e vai sendo
        // empurrada pra onde o nariz aponta. Velocidade quase não cai (no
        // Horizon o carro segue a 170–200 mph atravessado): só um atrito leve
        // na proporção do ângulo
        const alvoVx = Math.sin(j.deriva) * Math.abs(j.v) * 0.6
        j.vx += (alvoVx - j.vx) * Math.min(1, dt * 1.8)
        j.v -= j.v * Math.abs(Math.sin(j.deriva)) * 0.06 * dt
        const ang = d * j.deriva
        if (ang > 0.2) {
          j.driftT += dt
          j.carga = Math.min(1, j.carga + dt * 0.22 * Math.min(1, ang / 0.5))
        }
        if (ang < 0.05 && lado === -d && -d * j.giro > 1.0 && j.v > VDRIFT) {
          // pêndulo: o contraesterço passou do ponto e a carroceria foi pro
          // outro lado com força — vira um drift pro outro lado
          j.drift = -d as 1 | -1
        } else if ((ang < 0.05 && lado !== d) || j.v < 10 || j.ar) {
          // aderência voltou
          if (j.driftT > 0.6) {
            j.turboT = Math.max(j.turboT, Math.min(1.8, 0.5 + j.driftT * 0.6))
            j.flash = Math.max(j.flash, 0.35)
            motor?.whoosh()
            vib([15, 20, 40])
          }
          j.drift = 0
          j.driftT = 0
          j.giro = 0
        }
      } else {
        j.deriva += (0 - j.deriva) * Math.min(1, dt * 5)
        // lateral com aderência: resposta rápida (Horizon); força centrífuga
        // leve — a curva inclinada segura boa parte dela
        const alvoVx = j.steer * (6 + 10 * Math.min(1, Math.abs(pct))) * re
        j.vx += (alvoVx - j.vx) * Math.min(1, dt * 7)
      }
      const segura = 1 - Math.min(0.75, Math.abs(a.bank) * 2.4)
      if (!j.ar) j.x += (j.vx - a.curv * j.v * Math.abs(j.v) * 0.035 * segura) * dt
      else j.x += j.vx * 0.5 * dt
    }
    // parede macia: raspa, solta faísca, perde um pouco de velocidade. Faixa
    // de saída trancada = muro no lugar da faixa
    let dirMax = a.dir
    let esqMin = a.esq
    if (V.tipo === "circuito") {
      for (const f of V.faixas) {
        if (j.u <= f.u - ABRE || j.u > f.u || aberta(f, nLibRef.current)) continue
        if (f.lado > 0) dirMax = Math.min(dirMax, MEIA)
        else esqMin = Math.max(esqMin, -MEIA)
      }
    }
    const limE = esqMin + 1.05
    const limD = dirMax - 1.05
    if (j.x < limE || j.x > limD) {
      const lado = j.x > limD ? 1 : -1
      j.x = lado > 0 ? limD : limE
      j.vx = -lado * Math.abs(j.vx) * 0.25
      if (j.v > 8) {
        j.v *= 1 - 0.55 * dt
        j.shake = Math.max(j.shake, 0.25)
        falasT.current.raspa -= dt
        if (falasT.current.raspa <= 0) { vib(16); falasT.current.raspa = 0.14 }
        soltarFaiscas(faiscas, carro.current, lado)
      }
    }
    j.st.vmax = Math.max(j.st.vmax, j.v)

    const uAnt = j.u
    j.u += j.v * dt
    let trocou = false
    // bifurcação: se o carro está na faixa de uma saída aberta, pega ela
    const f = V.tipo === "circuito" ? saidaEm(V, uAnt, j.u, j.x, (ff) => aberta(ff, nLibRef.current), j.escolha) : null
    if (V.tipo === "circuito" && V.faixas.some((ff) => uAnt < ff.u && j.u >= ff.u)) j.escolha = 0
    if (f) {
      trocou = true
      if (j.voltaIni >= 0) {
        j.voltas++
        j.st.voltas = j.voltas
        ev.volta(j.tempo - j.voltaIni)
      }
      j.pegos.clear()
      j.via = f.via
      j.u = j.u - f.u
      j.x -= f.lado * CK
      j.sintonizou = false
      vib([20, 30, 20])
    } else if (j.u >= V.L) {
      const sobra = j.u - V.L
      trocou = true
      if (V.tipo === "circuito") {
        // fim da volta (quem ficou)
        if (j.voltaIni >= 0) {
          j.voltas++
          j.st.voltas = j.voltas
          ev.volta(j.tempo - j.voltaIni)
        }
        j.pegos.clear()
        j.u = sobra
        j.voltaIni = j.tempo
      } else {
        // fim da saída: encosta no circuito do destino — e aqui é o
        // impacto: a música nova entra de uma vez (ev.via), com clarão na
        // cor da rádio, tranco na câmera e o cenário virando junto
        calar()
        j.impacto = 1
        j.flash = 1
        j.soco = true
        j.shake = Math.max(j.shake, 0.9)
        vib([40, 30, 90])
        j.via = M.circuito[V.t]
        j.u = V.chega!.u + sobra
        j.voltaIni = -1
        j.pegos.clear()
      }
    }
    // de ré passando do começo: no circuito dá a volta; numa saída, volta
    // pro lugar de onde saiu, na faixa da bifurcação
    if (j.u < 0) {
      trocou = true
      if (V.tipo === "circuito") j.u += V.L
      else {
        const vi = M.circuito[V.de!]
        const fx = M.vias[vi].faixas.find((ff) => ff.via === j.via)
        calar()
        j.sintonizou = false
        player.volume(1)
        j.via = vi
        j.u = (fx?.u ?? 0) + j.u
        j.x += (fx?.lado ?? 0) * CK
        j.pegos.clear()
      }
    }
    if (M.vias[j.via] !== V) {
      V = M.vias[j.via]
      ev.via(j.via)
    }

    // a saída é a sintonia: a música de onde você veio vai sumindo, a
    // estática sobe e o dial gira; a música nova só entra na CHEGADA
    if (V.tipo === "saida") {
      const p = j.u / V.L
      const noRadio = fonteRef.current === "radio"
      if (!j.sintonizou && p >= 0.45 && noRadio) { j.sintonizou = true; chiado.current = estatica() }
      if (hudN.current % 3 === 0 && noRadio) {
        player.volume(p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.3))
        if (chiado.current) {
          chiado.current.volume(Math.max(0, Math.min(0.2, ((p - 0.45) / 0.25) * 0.2)))
          chiado.current.sintonizar(700 + 2200 * Math.abs(Math.sin(p * 22)))
        }
      }
    }

    // pulos: se a pista cai mais rápido do que a gravidade, a Kombi voa
    amostra(V, j.u, a)
    const yPista = a.y - j.x * Math.sin(a.bank)
    if (j.encaixar) { j.ar = false; j.y = yPista; j.vy = 0 } // teleporte (dev)
    if (j.ar) {
      j.vy -= G * dt
      j.y += j.vy * dt
      j.tAr += dt
      if (j.y <= yPista) {
        const tempoAr = j.tAr
        j.ar = false
        j.y = yPista
        j.shake = Math.max(j.shake, Math.min(1.2, 0.3 + tempoAr))
        motor?.baque()
        vib(tempoAr > 0.6 ? [40, 30, 60] : 30)
        j.st.ar += tempoAr
        if (tempoAr > 0.5) {
          const n = Math.round(tempoAr * 3)
          ev.sinal(n, `voou ${tempoAr.toFixed(1)}s · +${n}`, "#ffc857")
          if (Math.random() < 0.5) ev.falar("Notti", "A KOMBI VOA???")
        }
        j.tAr = 0
      }
    } else {
      const vyPista = Math.max(-40, Math.min(40, (yPista - j.y) / Math.max(dt, 1e-4)))
      if (vyPista < j.vy - G * dt * 2.2 && j.v > 20 && !trocou) {
        j.ar = true
        j.tAr = 0
        motor?.whoosh()
      } else {
        j.vy = trocou ? j.vy : vyPista
        j.y = yPista
      }
    }

    // pontos de busca das missões: passou pela coluna, pegou
    if (!trocou) {
      for (const m of marcosRef.current) {
        if (m.via !== j.via || j.pegos.has(-1 - m.u)) continue
        if (uAnt < m.u && j.u >= m.u) {
          j.pegos.add(-1 - m.u)
          ev.pegar(m.chave)
        }
      }
    }

    // portais (só no centro)
    if (!trocou && V.estacoes.length) {
      for (const e of V.estacoes) {
        if (!(uAnt < e.u && j.u >= e.u)) continue
        // chegar no destino NÃO freia sozinho (GTA: o jogo nunca tira o
        // volante de você). Aparece "descer aqui"; passou reto, segue
        ev.portal(e.id)
      }
    }

    // orbs da via atual
    for (const i of orbs.porVia[j.via]) {
      if (j.pegos.has(i)) continue
      const o = orbs.lista[i]
      const d = du(V, j.u, o.u)
      if (d > -1.5 && d < 1.8 && Math.abs(o.x - j.x) < 1.3 && Math.abs(j.y + 1 - (yPista + 1.4)) < 2.6 + (j.ar ? 2 : 0)) {
        j.pegos.add(i)
        j.st.orbs++
        j.carga = Math.min(1, j.carga + 0.08)
        gota(j.st.orbs % 8)
        vib(8)
        ev.sinal(1, "", "")
      }
    }

    // turbo no chão
    for (const t of turbos) {
      if (t.via !== j.via) continue
      const d = du(V, j.u, t.u)
      if (d > -3 && d < 3 && Math.abs(t.x - j.x) < 2.2 && j.turboT < 1.2 && !j.ar) {
        j.turboT = 1.8
        j.flash = 0.35
        motor?.whoosh()
        vib([20, 20, 50])
      }
    }
    if (inp.turbo && temTurbo && j.carga >= 1 && j.turboT <= 0) {
      j.turboT = 2.4
      j.carga = 0
      j.flash = 0.4
      motor?.whoosh()
      vib([20, 20, 60])
    }
    inp.turbo = false

    // ── caça do Núcleo ──
    {
      const k = caca
      k.espera = Math.max(0, k.espera - dt)
      const quer = cacadoRef.current && !cine && k.espera <= 0
      if (quer && !k.ativa) {
        // aparecem no retrovisor, 140m atrás
        k.ativa = true
        k.via = j.via
        k.perdidoT = 0
        k.longeT = 0
        k.carros.forEach((c, i) => { c.u = j.u - 140 - i * 22; c.x = j.x + (i ? -2.2 : 2.2); c.v = Math.max(20, j.v) })
        ev.caca("comecou")
      } else if (!quer && k.ativa) {
        // entregou (ou a 222 caiu): a caça acaba sem alarde
        k.ativa = false
        j.cacaGap = undefined
        ev.caca("fim")
      }
      if (k.ativa) {
        if (k.via !== j.via) {
          // trocou de rua: eles perdem o rastro
          k.perdidoT += dt
          if (k.perdidoT > 0.3) { k.ativa = false; k.espera = 25; j.cacaGap = undefined; ev.caca("perdeu") }
        } else {
          const CV = M.vias[k.via]
          let gap = Infinity
          for (const c of k.carros) {
            const d = -du(CV, j.u, c.u) // >0 = atrás da Kombi
            // longe: vêm rápido (nunca menos que 28 m/s, parado eles chegam);
            // perto: colam e encostam devagar
            // teto ABAIXO da velocidade máxima da Kombi: no talo dá pra fugir
            const alvoV = d > 30 ? Math.min(VMAX * 0.85, Math.max(28, Math.abs(j.v) + 9)) : Math.max(4, Math.min(VMAX * 0.85, j.v + (d > 6 ? 3 : -1)))
            c.v += (alvoV - c.v) * Math.min(1, dt * 1.4)
            c.u += c.v * dt
            if (CV.fechada) c.u = ((c.u % CV.L) + CV.L) % CV.L
            c.x += (j.x - c.x) * Math.min(1, dt * (d < 25 ? 1.8 : 0.6))
            gap = Math.min(gap, d)
            if (d > -2 && d < 3.6 && Math.abs(c.x - j.x) < 2.3 && !j.ar) {
              k.ativa = false
              k.espera = 12
              j.v = Math.min(j.v, 10)
              j.cacaGap = undefined
              ev.caca("pego")
              break
            }
          }
          if (k.ativa) {
            j.cacaGap = gap
            k.longeT = gap > 250 ? k.longeT + dt : 0
            if (k.longeT > 3) { k.ativa = false; k.espera = 40; j.cacaGap = undefined; ev.caca("despistou") }
          }
        }
      }
      const n = k.ativa ? k.carros.length : 0
      k.corpo.count = n; k.barra.count = n; k.farol.count = n * 2
      if (n) {
        const CV = M.vias[k.via]
        const pisca = Math.floor(state.clock.elapsedTime * 6) % 2
        k.carros.forEach((c, i) => {
          const p = noMundo(CV, c.u, c.x, 0.7, a, tmp.p)
          tmp.d.position.copy(p); tmp.d.rotation.set(0, Math.atan2(a.tx, a.tz), 0); tmp.d.scale.set(1, 1, 1); tmp.d.updateMatrix()
          k.corpo.setMatrixAt(i, tmp.d.matrix)
          tmp.d.position.set(p.x, p.y + 0.75, p.z); tmp.d.updateMatrix()
          k.barra.setMatrixAt(i, tmp.d.matrix)
          k.barra.setColorAt(i, k.cor.set((i + pisca) % 2 ? "#ffffff" : "#7aa2ff"))
          for (const l of [-1, 1]) {
            tmp.d.position.set(p.x + a.tx * 2.2 + -a.tz * l * 0.62, p.y, p.z + a.tz * 2.2 + a.tx * l * 0.62)
            tmp.d.updateMatrix()
            k.farol.setMatrixAt(i * 2 + (l > 0 ? 1 : 0), tmp.d.matrix)
          }
        })
        k.corpo.instanceMatrix.needsUpdate = true
        k.barra.instanceMatrix.needsUpdate = true
        if (k.barra.instanceColor) k.barra.instanceColor.needsUpdate = true
        k.farol.instanceMatrix.needsUpdate = true
      }
    }

    // tráfego
    const tr = trafego
    for (let i = 0; i < tr.carros.length; i++) {
      const c = tr.carros[i]
      const CV = M.vias[c.via]
      const aqui = c.via === j.via
      const antes = du(CV, j.u, c.u)
      c.u = (c.u + c.v * dt) % CV.L
      const d = du(CV, j.u, c.u)
      c.bateu = Math.max(0, c.bateu - dt)
      if (aqui && Math.abs(d) < 3.6 && Math.abs(c.x - j.x) < 1.85 && !j.ar && c.bateu <= 0) {
        // encostão: empurra de lado e perde embalo, sem parar o jogo
        c.bateu = 1
        j.v = Math.min(j.v, c.v * 0.85)
        j.vx = Math.sign(j.x - c.x || 1) * 6
        j.shake = 1.1
        j.flash = 0.3
        motor?.baque()
        vib([50, 30, 80])
        ev.falar("Ella", "tá tudo bem??")
      }
      if (aqui && antes > 0 && d <= 0) {
        if (!c.passou && c.bateu <= 0 && Math.abs(c.x - j.x) < 3.3 && j.v > 30) {
          j.st.quase++
          j.carga = Math.min(1, j.carga + 0.3)
          motor?.whoosh()
          vib(25)
          ev.sinal(3, "quase · +3", "#ff3fb0")
          if (j.st.quase === 1 || Math.random() < 0.3) ev.falar(["Notti", "Mubarak", "Drewboy"][j.st.quase % 3], ["KKKK QUASE", "doido", "respira mano"][j.st.quase % 3])
        }
        c.passou = true
      }
      if (d > 50) c.passou = false
      const p = noMundo(CV, c.u, c.x, 0.75, a, tmp.p)
      tmp.d.position.copy(p)
      tmp.d.rotation.set(0, Math.atan2(a.tx, a.tz), 0)
      tmp.d.scale.set(1, 1, 1)
      tmp.d.updateMatrix()
      tr.corpo.setMatrixAt(i, tmp.d.matrix)
      for (const k of [-1, 1]) {
        tmp.d.position.set(p.x - a.tx * 2.12 + -a.tz * k * 0.62, p.y + 0.1, p.z - a.tz * 2.12 + a.tx * k * 0.62)
        tmp.d.updateMatrix()
        tr.lant.setMatrixAt(i * 2 + (k > 0 ? 1 : 0), tmp.d.matrix)
      }
    }
    tr.corpo.instanceMatrix.needsUpdate = true
    tr.lant.instanceMatrix.needsUpdate = true

    // ── pose da Kombi: deita junto com a curva inclinada ──
    amostra(V, j.u, a)
    const cb = Math.cos(a.bank)
    const sb = Math.sin(a.bank)
    tmp.f.set(a.tx, j.ar ? Math.max(-0.2, Math.min(0.35, j.vy / Math.max(j.v, 1))) : a.ty, a.tz).normalize()
    tmp.r.set(-a.tz * cb, -sb, a.tx * cb).normalize()
    tmp.up.crossVectors(tmp.r, tmp.f).normalize()
    tmp.r.crossVectors(tmp.f, tmp.up).normalize()
    // base: x = direita, y = cima, z = trás (a Kombi aponta pra -Z)
    tmp.m.makeBasis(tmp.r, tmp.up, tmp.f.clone().negate())
    const car = carro.current!
    car.quaternion.setFromRotationMatrix(tmp.m)
    const yaw = -Math.atan2(j.vx, Math.max(Math.abs(j.v), 4)) * Math.sign(j.v || 1) - a.curv * j.v * Math.abs(j.v) * 0.0025 - j.deriva
    tmp.qYaw.setFromAxisAngle(tmp.y0, yaw)
    tmp.qRoll.setFromAxisAngle(tmp.z0, j.steer * 0.05 * Math.min(1, pct))
    car.quaternion.multiply(tmp.qYaw).multiply(tmp.qRoll)
    car.position.set(a.x - a.tz * j.x * cb, j.y + 0.02, a.z + a.tx * j.x * cb)

    // as 4 rodas derrapando: marca no chão e fumaça em cada uma
    if (j.drift && Math.abs(j.deriva) > 0.15 && !j.ar) {
      car.updateMatrixWorld()
      // a marca segue pra onde a Kombi ANDA (sem a deriva), não pra onde aponta
      tmp.qMarca.copy(car.quaternion).multiply(tmp.qDeriva.setFromAxisAngle(tmp.y0, j.deriva)).multiply(tmp.qDeitar)
      const forca = Math.min(1, Math.abs(j.deriva) / 0.6)
      for (const r of RODAS) {
        tmp.roda.copy(r).applyMatrix4(car.matrixWorld)
        tmp.d.position.copy(tmp.roda)
        tmp.d.quaternion.copy(tmp.qMarca)
        tmp.d.scale.set(1, Math.max(0.6, Math.abs(j.v) * dt / 0.95 * 1.15), 1)
        tmp.d.updateMatrix()
        marcas.m.setMatrixAt(marcas.prox++ % marcas.n, tmp.d.matrix)
        if (FUMACA && Math.random() < 0.45 * forca) {
          const i = fumaca.prox++ % fumaca.n
          fumaca.pos.set([tmp.roda.x, tmp.roda.y + 0.25, tmp.roda.z], i * 3)
          fumaca.vel.set([(Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.4, (Math.random() - 0.5) * 2], i * 3)
          fumaca.vida[i] = 0.6 + Math.random() * 0.5
        }
      }
      tmp.d.scale.set(1, 1, 1)
      marcas.m.instanceMatrix.needsUpdate = true
    }
    for (let i = 0; i < fumaca.n; i++) {
      if (fumaca.vida[i] <= 0) { fumaca.pos[i * 3 + 1] = -999; continue }
      fumaca.vida[i] -= dt
      fumaca.pos[i * 3] += fumaca.vel[i * 3] * dt
      fumaca.pos[i * 3 + 1] += fumaca.vel[i * 3 + 1] * dt
      fumaca.pos[i * 3 + 2] += fumaca.vel[i * 3 + 2] * dt
    }
    fumaca.g.attributes.position.needsUpdate = true

    // o lugar da missão: avisa quando tá chegando, e PASSAR NA FRENTE dele
    // (em qualquer faixa, em qualquer velocidade) abre a cena — a Kombi
    // freia sozinha no modo cinema (page.tsx → cena.tsx)
    {
      const vg = vagaRef.current
      if (vg && !cine && j.via === vg.via) {
        const d = du(M.vias[j.via], j.u, vg.u)
        if (j.vagaAvisou !== vg.id && d > 0 && d < 260) {
          j.vagaAvisou = vg.id
          ev.falar(vg.quem || "222 FM", `${vg.nome} tá chegando, ${vg.lado > 0 ? "na direita" : "na esquerda"}. é só passar na frente`)
        }
        const naVaga = Math.abs(d) < VAGA / 2 + 10
        if (naVaga && j.naVaga !== vg.id) { j.naVaga = vg.id; ev.vaga(vg.id) }
        if (Math.abs(d) > VAGA) j.naVaga = false
      }
      // o lugar secreto (o beco): cada vez que você passa por ele conta uma
      // volta. Ninguém avisa; depois das voltas que o seu tom pede, a 222
      // sussurra e a vaga dele passa a valer
      const sg = segredoRef.current
      if (sg && !cine && j.via === sg.via) {
        const d = du(M.vias[j.via], j.u, sg.u)
        if (j.segAnt !== undefined && j.segAnt > 0 && d <= 0 && d > -40) {
          j.segPassou = (j.segPassou ?? 0) + 1
          if (j.segPassou >= sg.voltas && revelado !== sg.id) setRevelado(sg.id)
        }
        j.segAnt = d
        if (revelado === sg.id) {
          if (j.vagaAvisou !== sg.id && d > 0 && d < 200) {
            j.vagaAvisou = sg.id
            ev.falar("222 FM", "…tem um beco aí na esquerda, entre os letreiros. ninguém olha pra ele. passa na frente")
          }
          const naVaga = Math.abs(d) < VAGA / 2 + 10
          if (naVaga && !j.naSeg) { j.naSeg = true; ev.vaga(sg.id) }
          if (Math.abs(d) > VAGA) j.naSeg = false
        }
      }
    }

    // a abertura: parou, desce; segura e anda até a porta
    {
      const ab = aberturaRef.current
      if (ab.ativa && ab.fase === "parou" && j.tempo - ab.t0 > 0.9) {
        ab.de = car.position.clone().addScaledVector(tmp.r, 2.4)
        ab.de.y = ab.porta.y
        ab.fase = "ape"
      }
      if (ab.ativa && ab.fase === "ape" && ab.de && (inp.gas || toqueTela)) {
        ab.pe = Math.min(1, ab.pe + (1.7 / Math.max(1, ab.de.distanceTo(ab.porta))) * dt)
        if (ab.pe >= 1) { ab.fase = "porta"; ab.onPorta() }
      }
    }
    // ── câmera: amortecida, abre com a velocidade, inclina com a curva ──
    const atras = 8.4 + pct * 1.8
    tmp.alvo.copy(car.position).addScaledVector(tmp.f, -atras).addScaledVector(tmp.up, 3.1 + pct * 0.3).addScaledVector(tmp.r, j.steer * 0.8)
    if (cine) {
      // câmera de cinema: baixa, de lado, girando devagar em volta da Kombi
      const ang = j.tempo * 0.11 + 0.5
      const raio = 9.5 - Math.min(1, j.v / VCINEMA) * 1.5
      tmp.alvo.copy(car.position).addScaledVector(tmp.f, -Math.cos(ang) * raio).addScaledVector(tmp.r, Math.sin(ang) * raio * 0.75).addScaledVector(tmp.up, 1.6 + Math.sin(j.tempo * 0.07) * 0.5)
    }
    // a cena de um lugar: a câmera corta pro outro lado da rua, olhando a porta
    const cl = cine === "lugar" ? camLugarRef.current : null
    if (cl) { tmp.alvo.copy(cl.cam); tmp.alvo.y += Math.sin(j.tempo * 0.35) * 0.12 }
    const primeira = dentroRef.current && !cine
    if (primeira) { car.updateMatrixWorld(); tmp.alvo.copy(OLHO).applyMatrix4(car.matrixWorld) }
    if (j.encaixar) { camInit.current = false; j.encaixar = false }
    const k = primeira || cl ? 1 : camInit.current ? 1 - Math.exp(-dt * (cine ? 1.6 : j.ar ? 3 : 5.5)) : 1
    camera.position.lerp(tmp.alvo, k)
    tmp.olhar.copy(car.position).addScaledVector(tmp.f, cine ? 2.5 : 7).addScaledVector(tmp.up, cine ? 1.4 : 1.2)
    if (cl) tmp.olhar.copy(cl.porta)
    // de dentro: olha pela estrada à frente, virando um pouco pro lado da curva
    if (primeira) {
      const o = olhar.current
      if (!o.arrastando && o.soltou && performance.now() - o.soltou > 7000) { o.alvoYaw = 0; o.alvoPitch = 0 }
      const r = o.arrastando ? 14 : o.alvoYaw === 0 && o.alvoPitch === 0 ? 1.5 : 14
      o.yaw += (o.alvoYaw - o.yaw) * Math.min(1, dt * r)
      o.pitch += (o.alvoPitch - o.pitch) * Math.min(1, dt * r)
      const cp = Math.cos(o.pitch)
      tmp.olhar.copy(tmp.p.set(OLHO.x - Math.sin(o.yaw) * cp * 10, OLHO.y - 0.9 + Math.sin(o.pitch) * 10, OLHO.z - Math.cos(o.yaw) * cp * 10)).applyMatrix4(car.matrixWorld)
    }
    tmp.camOlhar.lerp(tmp.olhar, cl ? 1 : primeira ? 1 - Math.exp(-dt * 14) : camInit.current ? 1 - Math.exp(-dt * 9) : 1)
    tmp.upMix.copy(tmp.up).lerp(tmp.y0, 0.45).normalize()
    tmp.camUp.lerp(tmp.upMix, camInit.current ? 1 - Math.exp(-dt * 4) : 1).normalize()
    camera.up.copy(tmp.camUp)
    camInit.current = true
    const amp = reduz ? 0 : (j.shake * 0.12 + (j.turboT > 0 ? 0.03 : 0)) * (primeira ? 0.25 : 1)
    camera.position.x += (Math.random() - 0.5) * amp
    camera.position.y += (Math.random() - 0.5) * amp
    camera.lookAt(tmp.camOlhar)
    {
      // a pé: a câmera atrás de quem anda, a porta na frente
      const ab = aberturaRef.current
      if (ab.ativa && ab.de && (ab.fase === "ape" || ab.fase === "porta")) {
        const p = tmp.p.lerpVectors(ab.de, ab.porta, ab.pe)
        const dirP = tmp.q2.subVectors(ab.porta, ab.de).setY(0).normalize()
        tmp.alvo.copy(p).addScaledVector(dirP, -4.6).setY(p.y + 2.1)
        camera.position.lerp(tmp.alvo, 1 - Math.exp(-dt * 3))
        tmp.olhar.copy(p).addScaledVector(dirP, 6).setY(p.y + 1.3)
        camera.up.set(0, 1, 0)
        camera.lookAt(tmp.olhar)
      }
    }
    const cam = camera as THREE.PerspectiveCamera
    if (j.soco) { cam.fov += reduz ? 0 : 16; j.soco = false }
    const fovAlvo = cl ? 40 : cine ? 50 : primeira ? 86 + pct * 6 + (j.turboT > 0 ? 5 : 0) : 58 + pct * 14 + (j.turboT > 0 ? 10 : 0)
    cam.fov += (fovAlvo - cam.fov) * Math.min(1, dt * 3)
    cam.updateProjectionMatrix()
    j.shake = Math.max(0, j.shake - dt * 2)
    j.flash = Math.max(0, j.flash - dt * 1.6)

    // céu acompanha a câmera
    if (ceu.current) ceu.current.position.copy(camera.position)
    // atmosfera do lugar: névoa, céu e luz mudam devagar; na saída, vai
    // misturando do lugar de onde veio pro lugar pra onde vai
    if (V.tipo === "saida") {
      // o cenário segura o lugar de onde veio e só vira no fim, junto com a música
      const s = 0.35 * suave((j.u / V.L - 0.6) / 0.4)
      const dA = distritoDe(V.de!)
      const dB = distritoDe(V.t)
      alvoNevoa.set(dA.nevoa).lerp(tmp.c1.set(dB.nevoa), s)
      alvoCeu.set(dA.ceu).lerp(tmp.c2.set(dB.ceu), s)
    } else {
      const ds = distritoDe(V.t)
      alvoNevoa.set(ds.nevoa)
      alvoCeu.set(ds.ceu)
    }
    const kk = Math.min(1, dt * (0.9 + j.impacto * 9))
    j.impacto = Math.max(0, j.impacto - dt * 0.8)
    const fog = scene.fog as THREE.Fog | null
    if (fog) fog.color.lerp(alvoNevoa, kk)
    // no deserto a névoa vai longe: a cidade inteira lá no horizonte
    if (fog) {
      const longe = V.id === "deserto"
      fog.far += ((longe ? 5200 : 950) - fog.far) * Math.min(1, dt * 0.6)
      fog.near += ((longe ? 300 : 70) - fog.near) * Math.min(1, dt * 0.6)
    }
    ;(scene.background as THREE.Color | null)?.lerp(alvoNevoa, kk)
    ceuMat.uniforms.nevoaC.value.lerp(alvoNevoa, kk)
    ceuMat.uniforms.tinta.value.lerp(alvoCeu, kk)
    ceuMat.uniforms.tempo.value += dt
    // aviação: 1 s aceso, 1 s apagado, todos juntos (como na vida)
    cidade.aviacaoMat.opacity = Math.sin(ceuMat.uniforms.tempo.value * Math.PI) > 0 ? 1 : 0.08
    if (hemi.current) hemi.current.color.lerp(alvoCeu, kk * 0.5)

    // som: só o motor
    motor?.atualizar(Math.min(1.45, Math.abs(j.v) / VMAX), (cine ? cine === "rodando" : inp.gas || toqueTela || inp.freio) && !j.chegando, j.turboT > 0)
    // vibração leve enquanto acelera, mais forte quanto mais rápido (não no
    // cinema da chegada, não no ar, não freando)
    tremor(!cine && !j.ar && !j.chegando && !inp.freio && (inp.gas || toqueTela) && j.v > 1, Math.abs(j.v) / VMAX)

    // orbs: na cor da rádio que está tocando, batendo no grave da música
    const t = state.clock.elapsedTime
    const corOrb = orbs.m.material as THREE.MeshBasicMaterial
    corOrb.color.lerp(tmp.c1.set(corRadio.current), 0.08)
    orbs.haloMat.color.copy(corOrb.color)
    orbs.haloMat.size = 3 + grave * 5
    const bate = 0.8 + grave * 0.75
    for (let i = 0; i < orbs.lista.length; i++) {
      const pego = j.pegos.has(i)
      tmp.d.position.set(orbs.pos[i * 3], orbs.pos[i * 3 + 1] + Math.sin(t * 3 + i) * 0.2, orbs.pos[i * 3 + 2])
      tmp.d.rotation.set(0, t * 2 + i, 0)
      const s = pego ? 0 : bate
      tmp.d.scale.set(s, s, s)
      tmp.d.updateMatrix()
      orbs.m.setMatrixAt(i, tmp.d.matrix)
    }
    orbs.m.instanceMatrix.needsUpdate = true

    // luz dos postes pulsa no grave
    cidade.luzMat.size = 3.4 + grave * 3
    cidade.luzMat.opacity = 0.55 + grave * 0.35
    tex.turbo.offset.y -= dt * 2.5

    // chuva: volume que acompanha a câmera, inclina com a velocidade (no
    // deserto não chove)
    if (chuvaRef.current) chuvaRef.current.visible = V.id !== "deserto"
    const cp = camera.position
    for (let i = 0; i < chuva.n; i++) {
      let y = chuva.base[i * 3 + 1] - dt * (38 + j.v * 0.2)
      if (y < 0) y += 40
      chuva.base[i * 3 + 1] = y
      const x = cp.x + chuva.base[i * 3]
      const z = cp.z + chuva.base[i * 3 + 2]
      const yy = cp.y - 18 + y
      chuva.pos.set([x, yy, z, x - tmp.f.x * j.v * 0.03, yy - 1.1, z - tmp.f.z * j.v * 0.03], i * 6)
    }
    chuva.g.attributes.position.needsUpdate = true

    // confete
    for (let i = 0; i < confete.s.length; i++) {
      const c = confete.s[i]
      if (c.vivo <= 0) continue
      c.vivo -= dt
      c.v.y -= 9 * dt
      c.v.multiplyScalar(1 - dt * 0.8)
      c.p.addScaledVector(c.v, dt)
      c.r.addScaledVector(c.w, dt)
      confete.d.position.copy(c.p)
      confete.d.rotation.set(c.r.x, c.r.y, c.r.z)
      const s = c.vivo > 0 ? Math.min(1, c.vivo * 2) : 0
      confete.d.scale.set(s, s, s)
      confete.d.updateMatrix()
      confete.m.setMatrixAt(i, confete.d.matrix)
    }
    confete.m.instanceMatrix.needsUpdate = true

    // faíscas
    for (let i = 0; i < faiscas.n; i++) {
      if (faiscas.vida[i] <= 0) { faiscas.pos[i * 3 + 1] = -999; continue }
      faiscas.vida[i] -= dt
      faiscas.vel[i * 3 + 1] -= 18 * dt
      faiscas.pos[i * 3] += faiscas.vel[i * 3] * dt
      faiscas.pos[i * 3 + 1] += faiscas.vel[i * 3 + 1] * dt
      faiscas.pos[i * 3 + 2] += faiscas.vel[i * 3 + 2] * dt
    }
    faiscas.g.attributes.position.needsUpdate = true

    // mensagens da cidade no caminho
    const ft = falasT.current
    if (j.tempo > ft.prox && ft.i < FALAS.length && !j.chegando) {
      const f = FALAS[ft.i++]
      ev.falar(f.de, f.texto)
      ft.prox = j.tempo + 9 + Math.random() * 6
    }

    kTurbo.current = j.turboT > 0
    kVel.current = j.v
    // rodas da frente: com aderência seguem o volante; de lado, apontam pra
    // onde a Kombi anda (contraesterço natural)
    kEsterco.current += ((j.drift ? j.deriva * 0.85 : -j.steer * 0.42) - kEsterco.current) * Math.min(1, dt * 10)
    kVolante.current = Math.max(-1.3, Math.min(1.3, -kEsterco.current / 0.42))
    kBalanco.current = j.vx * 0.35 + a.curv * j.v * Math.abs(j.v) * 0.08 + j.deriva * 2
    // de dentro: some a carroceria de fora, aparece a cabine
    const dentroAgora = dentroRef.current && !cine
    if (corpoK.current) corpoK.current.visible = !dentroAgora
    // a herbal é fechada: a cabine (o interior) só aparece de dentro
    if (cabineG.current) cabineG.current.visible = dentroAgora
    // a luz magenta de baixo (o brilho no asfalto) pintava a cabine de rosa
    if (luzBaixo.current) luzBaixo.current.intensity = dentroAgora ? 0 : 45
    hudN.current++
    if (hudN.current % 4 === 0) ev.hud(j)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={["#8f7dff", "#0b1a3a", 1.6]} />
      <ambientLight intensity={0.35} color="#7f8cff" />
      <directionalLight position={[200, 300, -400]} intensity={0.9} color="#b9ccff" />
      <mesh ref={ceu} material={ceuMat} frustumCulled={false} renderOrder={-1}>
        <sphereGeometry args={[2800, 32, 16]} />
      </mesh>

      {/* o deserto: chão de areia em volta da cidade, pelo norte (mundo.ts) */}
      <mesh rotation-x={-Math.PI / 2} position={[centroSub.x, -0.25, centroSub.z]}>
        <ringGeometry args={[1350, 9000, 120, 1, -0.12, Math.PI + 0.24]} />
        <meshStandardMaterial color="#2e231e" roughness={1} />
      </mesh>
      <Caminhante abRef={aberturaRef} />
      {/* água */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -12, 0]}>
        <planeGeometry args={[9000, 9000]} />
        <meshStandardMaterial color="#071430" metalness={0.85} roughness={0.22} />
      </mesh>

      {/* pista */}
      <mesh geometry={geo.chao} receiveShadow>
        <meshStandardMaterial map={tex.asfalto} roughness={0.38} metalness={0.3} color="#d6d9ff" side={THREE.DoubleSide} />
      </mesh>
      {geo.faixas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#2fe8ff" toneMapped={false} transparent opacity={0.85} />
        </mesh>
      ))}
      {geo.bordas.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color={i ? "#ff3fb0" : "#2fe8ff"} toneMapped={false} />
        </mesh>
      ))}
      {geo.linhasGarfo.map((g, i) => (
        <mesh key={`lg${i}`} geometry={g}>
          <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.8} />
        </mesh>
      ))}
      {[geo.railE, geo.railD].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {[geo.saiaE, geo.saiaD].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#0d0f24" side={THREE.DoubleSide} />
        </mesh>
      ))}

      {cidade.predios.map((m, i) => <primitive key={i} object={m} />)}
      <points geometry={cidade.aviacao} material={cidade.aviacaoMat} />
      <primitive object={cidade.arcos} />
      <primitive object={cidade.fitas} />
      {cidade.outdoors.map((o, i) => (
        <mesh key={`out${i}`} position={o.pos} rotation={[0, o.rot, 0]}>
          <planeGeometry args={[28, 7]} />
          <meshBasicMaterial map={o.tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
      <primitive object={cidade.pilares} />
      <Seguro nome="linha 9"><Metro metro={metro} /></Seguro>
      <Seguro nome="lugares"><Lugares M={M} alvo={lugarAlvoId} emCena={cenaLugar} revelado={revelado} /></Seguro>
      <Seguro nome="subúrbio"><Suspense fallback={null}><Suburbio cx={centroSub.x} cz={centroSub.z} raioChao={centroSub.r} /></Suspense></Seguro>
      <primitive object={cidade.postes} />
      <primitive object={cidade.reflexos} />
      <points geometry={cidade.luzes} material={cidade.luzMat} />

      {/* bifurcações: pórticos com três placas, setas no chão, faixa de
          saída pintada, barreira nas trancadas */}
      {pinturas.faixas.map((g, i) => (
        <mesh key={`pf${i}`} geometry={g}>
          <meshBasicMaterial vertexColors transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {pinturas.muros.map((g, i) => (
        <mesh key={`pm${i}`} geometry={g}>
          <meshBasicMaterial vertexColors side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
      {placas.lista.map((g) => (
        <group key={g.id} position={g.pos} rotation={[0, g.rot, 0]}>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * (MEIA + FAIXA + 1.2), 6.6, 0]}>
              <boxGeometry args={[0.6, 13.2, 0.6]} />
              <meshStandardMaterial color="#1c1f3a" />
            </mesh>
          ))}
          <mesh position={[0, 12.1, 0]}>
            <boxGeometry args={[(MEIA + FAIXA + 1.2) * 2, 0.6, 0.6]} />
            <meshStandardMaterial color="#1c1f3a" />
          </mesh>
          <mesh position={[0, 13.4, -0.3]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[16, 2]} />
            <meshBasicMaterial map={g.topo} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          {g.paineis.map((p, i) => (
            <group key={i} position={[-p.x, 8.8, -0.3]} rotation={[0, Math.PI, 0]}>
              <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[7.6, 5.6]} />
                <meshBasicMaterial color="#070817" transparent opacity={0.9} side={THREE.DoubleSide} />
              </mesh>
              <mesh>
                <planeGeometry args={[7.4, 5.1]} />
                <meshBasicMaterial map={p.tex} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              <mesh position={[0, -2.95, 0]}>
                <planeGeometry args={[7.6, 0.22]} />
                <meshBasicMaterial color={p.cor} toneMapped={false} />
              </mesh>
              {p.area && tagTex[p.area] && (
                <group position={[0, -3.75, 0]}>
                  <mesh position={[0, 0, -0.05]}>
                    <planeGeometry args={[7.6, 1.05]} />
                    <meshBasicMaterial color="#070817" transparent opacity={0.92} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh>
                    <planeGeometry args={[7.4, 0.81]} />
                    <meshBasicMaterial map={tagTex[p.area]} transparent toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>
      ))}
      {placas.setas.map((s, i) => (
        <mesh key={`s${i}`} position={s.p} rotation={[-Math.PI / 2, 0, s.rot]}>
          <planeGeometry args={[3.2, 6.4]} />
          <meshBasicMaterial map={tex.turbo} color={s.cor} transparent opacity={s.op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      {placas.barreiras.map((b, i) => (
        <mesh key={`b${i}`} position={b.p} rotation={[0, b.rot, 0]}>
          <boxGeometry args={[FAIXA, 1.8, 0.6]} />
          <meshBasicMaterial color="#ff2a44" toneMapped={false} />
        </mesh>
      ))}

      {colunas.map((c) => (
        <group key={`col${c.id}`} position={c.pos}>
          <mesh position={[0, 140, 0]}>
            <cylinderGeometry args={[2.2, 2.2, 280, 16, 1, true]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh position={[0, 140, 0]}>
            <cylinderGeometry args={[0.6, 0.6, 280, 10, 1, true]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.08, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[MEIA * 0.6, MEIA * 0.75, 40]} />
            <meshBasicMaterial color={c.cor} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
          {c.item && <ItemGirando cor={c.cor} />}
        </group>
      ))}
      {turbos.map((t, i) => (
        <mesh key={i} position={t.p} rotation={[-Math.PI / 2, 0, t.rot]}>
          <planeGeometry args={[3.4, 7]} />
          <meshBasicMaterial map={tex.turbo} color="#ff3fb0" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}

      <primitive object={orbs.m} />
      <points geometry={orbs.halo} material={orbs.haloMat} />

      <primitive object={trafego.corpo} />
      <primitive object={caca.corpo} frustumCulled={false} />
      <primitive object={caca.barra} frustumCulled={false} />
      <primitive object={caca.farol} frustumCulled={false} />
      <primitive object={trafego.lant} />

      <lineSegments ref={chuvaRef} geometry={chuva.g} frustumCulled={false}>
        <lineBasicMaterial color="#a8ccff" transparent opacity={0.28} />
      </lineSegments>
      <primitive object={confete.m} frustumCulled={false} />
      <primitive object={marcas.m} />
      <points geometry={fumaca.g} frustumCulled={false}>
        <pointsMaterial size={1.1} map={texFumaca} color="#b4bbd6" transparent opacity={0.22} depthWrite={false} />
      </points>
      <points geometry={faiscas.g} frustumCulled={false}>
        <pointsMaterial size={0.35} color="#ffb454" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
      </points>

      <group ref={carro}>
        <group ref={corpoK}>
          {/* a Kombi de verdade (escaneada); enquanto carrega, ou se falhar
              no aparelho, a desenhada à mão */}
          <Seguro nome="kombi" reserva={<><Kombi222 turbo={kTurbo} velocidade={kVel} esterco={kEsterco} /><Cupula /></>}>
            <Suspense fallback={<><Kombi222 turbo={kTurbo} velocidade={kVel} esterco={kEsterco} /><Cupula /></>}>
              <KombiHerbal />
              <Kombi222 turbo={kTurbo} velocidade={kVel} esterco={kEsterco} soEfeitos />
            </Suspense>
          </Seguro>
        </group>
        <group ref={cabineG}>
          <Seguro nome="cabine"><Cabine balanco={kBalanco} disco={disco} objetos={objetos} carona={carona} onTocaDiscos={onTocaDiscos} /></Seguro>
        </group>
        <pointLight ref={luzBaixo} position={[0, 0.3, 0]} color="#ff3fb0" intensity={45} distance={10} decay={2} />
        <pointLight position={[0, 1, -4]} color="#fff1d6" intensity={60} distance={26} decay={2} />
        {/* luz de recorte vinda da cidade, pra Kombi não sumir no escuro */}
        <pointLight position={[0, 4, 4]} color="#9fd8ff" intensity={25} distance={9} decay={2} />
      </group>
      <Seguro nome="lente"><Cinema /></Seguro>
    </>
  )
}

/* eslint-enable react-hooks/immutability, react-hooks/purity */

const FALAS = [
  { de: "D-Bee", texto: "o núcleo apagou os radares nessa rua. aproveita" },
  { de: "Ella", texto: "vai com calma na curva molhada" },
  { de: "Mubarak", texto: "a Kombi aguenta. confia" },
  { de: "Notti", texto: "pega as bolinhas!! as bolinhas!!" },
  { de: "Alohan", texto: "repara nas luzes. elas batem junto com a música." },
  { de: "Drewboy", texto: "sobe a rampa com tudo" },
]

function soltarFaiscas(f: { n: number; pos: Float32Array; vel: Float32Array; vida: Float32Array; prox: number }, car: THREE.Group | null, lado: number) {
  if (!car) return
  const r = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion)
  for (let k = 0; k < 3; k++) {
    const i = f.prox++ % f.n
    f.pos.set([car.position.x + r.x * lado * 0.95, car.position.y + 0.4, car.position.z + r.z * lado * 0.95], i * 3)
    f.vel.set([r.x * lado * (2 + Math.random() * 3) + (Math.random() - 0.5) * 3, 2 + Math.random() * 4, r.z * lado * (2 + Math.random() * 3) + (Math.random() - 0.5) * 3], i * 3)
    f.vida[i] = 0.5 + Math.random() * 0.4
  }
}

// a coisa da missão flutuando na coluna de luz, girando
function ItemGirando({ cor }: { cor: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame((st) => {
    if (!ref.current) return
    ref.current.rotation.y = st.clock.elapsedTime * 1.8
    ref.current.position.y = 3.2 + Math.sin(st.clock.elapsedTime * 2.4) * 0.5
  })
  return (
    <mesh ref={ref} position={[0, 3.2, 0]}>
      <octahedronGeometry args={[1.3, 0]} />
      <meshBasicMaterial color={cor} toneMapped={false} />
    </mesh>
  )
}
