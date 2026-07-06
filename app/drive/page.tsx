"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAudioPlayer, getAudioEl } from "@/app/providers/AudioPlayerProvider"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import type { BridgeCommand, BridgeState, PhoneNotification, CarRadioControl } from "@/app/providers/AudioBridge"
import { sendStateToIframe, sendNotificationClickToIframe } from "@/app/providers/AudioBridge"

const C = {
  skyTop:     "#1a0533",
  skyMid:     "#4a0a6b",
  skyHorizon: "#cc4400",
  sunOuter:   "#ff4500",
  sunInner:   "#ffcc00",
  road1:      "#2d1b69",
  road2:      "#3d2b79",
  grass1:     "#1a4a1a",
  grass2:     "#0d2b0d",
  stripY:     "#ffcc00",
  stripW:     "#ffffff",
  neonPink:   "#ff2d78",
  neonOrange: "#ff6b35",
  neonPurple: "#cc00ff",
}

// ── MUNDO VISUAL: 3 cenários reais, um por bloco de frequências/missões
// (a troca é uma "ilusão" disparada ao ACEITAR a missão da próxima
// frequência — não tem relação com a posição literal na pista) ──
// SUBÚRBIO XÊNON  → cidade tech destruída, sob controle da resistência
// CIDADE NEON     → arranha-céus infinitos, publicidade neon por todo lado
// HELIX           → sociedade solar/eólica (visão Tesla), dia claro, sem
//                    neon, energia luminosa correndo pela pista
type Scenario = "suburbio" | "cidadeneon" | "helix"

function scenarioForTier(t: Tier): Scenario {
  if (t === "suburbio") return "suburbio"
  if (t === "crypto") return "cidadeneon"
  return "helix" // live | full
}

type Palette = {
  skyTop: string; skyMid: string; skyHorizon: string
  sunInner: string; sunOuter: string
  road1: string; road2: string
  grass1: string; grass2: string
  stripY: string; stripW: string
  buildingBase: string
  windowColors: string[]
  neonA: string; neonB: string; neonC: string
  isDaytime: boolean
  hasStars: boolean
}

const PALETTES: Record<Scenario, Palette> = {
  suburbio: {
    // cidade tecnológica arrasada — céu de fumaça, ferrugem, néon quebrado
    skyTop: "#170f0a", skyMid: "#3a2415", skyHorizon: "#5c2f14",
    sunInner: "#aa7744", sunOuter: "#663311",
    road1: "#2a2a28", road2: "#222220",
    grass1: "#211a12", grass2: "#15100b",
    stripY: "#8a7a3a", stripW: "#8f8f8a",
    buildingBase: "#1c1712",
    windowColors: ["#ff330033", "#ffaa0022", "#66000022"],
    neonA: "#aa3322", neonB: "#cc5522", neonC: "#775533",
    isDaytime: false, hasStars: true,
  },
  cidadeneon: {
    // arranha-céus infinitos, publicidade neon em todo canto — versão
    // intensificada do visual original do jogo
    skyTop: "#0a0118", skyMid: "#3d0a5e", skyHorizon: "#ff2d78",
    sunInner: "#00e5ff", sunOuter: "#a855f7",
    road1: "#241b4d", road2: "#2f2166",
    grass1: "#0a0a20", grass2: "#050512",
    stripY: "#00e5ff", stripW: "#ffffff",
    buildingBase: "#110033",
    windowColors: ["#ff2d7866", "#00e5ff66", "#cc00ff55"],
    neonA: "#ff2d78", neonB: "#00e5ff", neonC: "#cc00ff",
    isDaytime: false, hasStars: true,
  },
  helix: {
    // sociedade solar/eólica — dia claro, sem néon, energia luminosa na pista
    skyTop: "#bfe8ff", skyMid: "#dff2ff", skyHorizon: "#fff4d6",
    sunInner: "#fffde0", sunOuter: "#ffe066",
    road1: "#3d4a52", road2: "#46545c",
    grass1: "#2f8f4e", grass2: "#237a3e",
    stripY: "#00ffaa", stripW: "#ffffff",
    buildingBase: "#5a6a72",
    windowColors: ["#bfefff55", "#ffffff33"],
    neonA: "#00ffaa", neonB: "#33ccff", neonC: "#00e0ff",
    isDaytime: true, hasStars: false,
  },
}

// caracteres da chuva digital (transição estilo Matrix ao trocar de cenário)
const MATRIX_CHARS = "アイウエオカキクケコサシスセソ0123456789ABCXYZ$#%&+-="

// Duração fixa de cada faixa na rádio (prévia)
const RADIO_SNIPPET_MS = 22000

// Faixa da rádio: title já vem no formato mascarado (com asteriscos), como o
// resto do jogo. Cada faixa carrega sua própria estação/cor e um "tier" — a
// frequência é sempre anunciada/liberada ANTES da missão que a segue (vira o
// gancho pra próxima etapa), exceto a CIDADE NEON 222.4 FM, que só entra no ar
// no fim de toda a experiência (unlocked.finalCompleted), somando-se ao que já
// toca na LIVE NEON.
type Tier = "suburbio" | "crypto" | "live" | "full"
type RadioTrack = { title: string; src: string; freq: string; color: string; label: string; tier: Tier }

const F = {
  suburbio:  { label: "SUBÚRBIO XENOM",    freq: "104.7", color: "#ff2d78", tier: "suburbio" as Tier },
  crypto:    { label: "CIDADENEON.CRYPTO", freq: "88.5",  color: "#00e5ff", tier: "crypto" as Tier },
  live:      { label: "LIVE NEON",         freq: "96.3",  color: "#a855f7", tier: "live" as Tier },
  full:      { label: "CIDADE NEON 222.4 FM", freq: "222.4", color: "#ffd93d", tier: "full" as Tier },
}

const STATION_TRACKS: Record<string, RadioTrack[]> = {
  "SUBÚRBIO XÊNON": [
    { title: "g*** m**",   src: "/audio/tracks/gata-mia.mp3",     ...F.suburbio },
    { title: "t***o",       src: "/audio/tracks/tedio.mp3",        ...F.suburbio },
    { title: "b*** b*** k", src: "/audio/tracks/boom-boom-k.mp3",  ...F.suburbio },
    { title: "10 D3 10",    src: "/audio/tracks/10de10.mp3",       ...F.suburbio },
  ],
  // CIDADENEON.CRYPTO — os 5 instrumentais do jogo FEEL.GOOD
  "CIDADE NEON": [
    { title: "n****r",      src: "/audio/tracks/inst-nectar.mp3",      ...F.crypto },
    { title: "d*****nA",    src: "/audio/tracks/inst-dopamina.mp3",    ...F.crypto },
    { title: "o***á",       src: "/audio/tracks/inst-ojala.mp3",       ...F.crypto },
    { title: "s*** o****?", src: "/audio/tracks/inst-sabe-ontem.mp3",  ...F.crypto },
    { title: "C***A",       src: "/audio/tracks/inst-chuva.mp3",       ...F.crypto },
  ],
  // NOVA ONDA — LIVE NEON (5 ao vivo) + CIDADE NEON 222.4 FM (15 prévias do álbum)
  "NOVA ONDA": [
    { title: "n****r",      src: "/audio/tracks/live-nectar.mp3",      ...F.live },
    { title: "d*****nA",    src: "/audio/tracks/live-dopamina.mp3",    ...F.live },
    { title: "o***á",       src: "/audio/tracks/live-ojala.mp3",       ...F.live },
    { title: "s*** o****?", src: "/audio/tracks/live-sabe-ontem.mp3",  ...F.live },
    { title: "C***A",       src: "/audio/tracks/live-chuva.mp3",       ...F.live },
    { title: "s*****ira",       src: "/audio/tracks/sextafeira.mp3",     ...F.full },
    { title: "n****r",          src: "/audio/tracks/nectar.mp3",         ...F.full },
    { title: "c*** a*****no",   src: "/audio/tracks/222-copo-americano.mp3", ...F.full },
    { title: "d*****nA",        src: "/audio/tracks/dopamina.mp3",       ...F.full },
    { title: "o***á",           src: "/audio/tracks/ojala.mp3",          ...F.full },
    { title: "s**v",            src: "/audio/tracks/swav.mp3",           ...F.full },
    { title: "c****e",          src: "/audio/tracks/cliche.mp3",         ...F.full },
    { title: "s*** o****?",     src: "/audio/tracks/sabe-ontem.mp3",     ...F.full },
    { title: "h*****ood",       src: "/audio/tracks/hollywood.mp3",      ...F.full },
    { title: "s*****t",         src: "/audio/tracks/stylist.mp3",        ...F.full },
    { title: "o***s",           src: "/audio/tracks/oasis.mp3",          ...F.full },
    { title: "a*******a",       src: "/audio/tracks/astronauta.mp3",     ...F.full },
    { title: "C***A",           src: "/audio/tracks/222-chuva.mp3",      ...F.full },
    { title: "q* é v*?",        src: "/audio/tracks/qm-e-vc.mp3",        ...F.full },
    { title: "r*******ster",    src: "/audio/tracks/rollercoaster.mp3",  ...F.full },
  ],
}

// Pool isolado por frequência (usado na sintonia livre, apos finalCompleted)
const TRACKS_BY_TIER: Record<Tier, RadioTrack[]> = {
  suburbio: STATION_TRACKS["SUBÚRBIO XÊNON"],
  crypto:   STATION_TRACKS["CIDADE NEON"],
  live:     STATION_TRACKS["NOVA ONDA"].filter(t => t.tier === "live"),
  full:     STATION_TRACKS["NOVA ONDA"].filter(t => t.tier === "full"),
}
const ALL_TIERS: Tier[] = ["suburbio", "crypto", "live", "full"]

// Deriva o tier "atual" a partir do que já foi ACEITO (persistido no funil) —
// evita que reentrar em /drive (remount) reinicie a rádio em SUBÚRBIO XENOM
// enquanto radioAccepted já marca tiers mais altos como aceitos, o que
// travava a progressão pra sempre (nextTierReady exige !radioAccepted[tier],
// então a frequência nunca avançava de novo depois de um reload)
function highestAcceptedTier(accepted: { crypto: boolean; live: boolean; full: boolean }): Tier {
  if (accepted.full) return "full"
  if (accepted.live) return "live"
  if (accepted.crypto) return "crypto"
  return "suburbio"
}

const ROAD_LEN  = 1600
const SEG_LEN   = 200
const DRAW_DIST = 100
const ROAD_W    = 2200
const CAM_H     = 1500
const CAM_DEPTH = 0.84

interface Seg { curve: number; sprites: { x: number; type: string }[] }
interface Car  { seg: number; x: number; color: string }

function buildRoad(): Seg[] {
  const road: Seg[] = []
  const pattern = [
    {len:100,curve:0},{len:120,curve:2.2},{len:100,curve:0},
    {len:130,curve:-1.8},{len:100,curve:0},{len:120,curve:2.8},
    {len:100,curve:0},{len:130,curve:-2.5},
  ]
  const types = ["post","sign","post","sign","post"]
  let i = 0
  while (i < ROAD_LEN) {
    const sec = pattern[i % pattern.length]
    for (let s = 0; s < sec.len && i < ROAD_LEN; s++, i++) {
      const sprites: {x:number;type:string}[] = []
      if (i % 12 === 0) {
        sprites.push({x:-2.8, type: types[Math.floor(i/12)%types.length]})
        sprites.push({x: 2.8, type: types[Math.floor(i/12+2)%types.length]})
      }
      road.push({curve: sec.curve, sprites})
    }
  }
  return road
}

function buildCars(): Car[] {
  const colors = ["#ff3300","#0066ff","#00cc44","#ffaa00","#cc00ff"]
  const cars: Car[] = []
  for (let i=100; i<ROAD_LEN-30; i+=Math.floor(40+Math.random()*50)) {
    cars.push({seg:i, x:[-0.55,0,0.55][i%3], color:colors[i%colors.length]})
  }
  return cars
}

// Altura do painel (velocímetro/RPM/rádio) como fração da tela — usada tanto
// no loop imperativo do canvas quanto no JSX, pra nunca ficarem dessincronizados.
// Aumentada bem além do que era (0.26) pra deixar o painel bem maior.
const DASH_FRACTION = 0.42
const BOTOES_H_PX = 90 // altura fixa dos botões de direção, no fundo

export default function DrivePage() {
  const audio    = useAudioPlayer()
  const funnel   = useGameFunnel()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)
  const roadRef   = useRef<Seg[]>([])
  const carsRef   = useRef<Car[]>([])

  // física — todos em refs pra não causar re-render no loop
  const posRef    = useRef(0)
  const speedRef  = useRef(0)       // km/h real
  const playerXRef= useRef(0)       // -1..1
  const accelRef      = useRef(false)
  const accelPressRef = useRef(0)    // pressão acumulada 0..3
  const leftRef   = useRef(false)
  const rightRef  = useRef(false)
  const curveRef  = useRef(0)       // curva acumulada pra volante

  const [phoneOpen, setPhoneOpen]   = useState(false)
  // celular aberto ocupa menos tela em telas estreitas (mobile) — em desktop
  // segue grande, já que sobra espaço em volta
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  const [volume, setVolume]         = useState(0.8)
  const volumeRingRef = useRef<HTMLDivElement>(null)
  const volumeDraggingRef = useRef(false)
  const updateVolumeFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = volumeRingRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angleDeg = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI)
    // 0° = topo, cresce em sentido horário. Zona útil de 300°, com um "vão"
    // morto de 60° na base (150°..210°) — como um botão giratório físico:
    // extremo esquerdo da base = volume 0, sobe por cima, direita da base = 1
    const deg = (angleDeg + 90 + 360) % 360
    let position: number
    if (deg >= 210) position = deg - 210
    else if (deg <= 150) position = deg + 150
    else position = deg < 180 ? 300 : 0 // dentro do vão: trava no extremo mais próximo
    const v = Math.min(Math.max(position / 300, 0), 1)
    setVolume(v)
    const globalEl = getAudioEl(); if (globalEl) globalEl.volume = v
    if (radioAudioRef.current) radioAudioRef.current.volume = v
  }, [])
  // ── RÁDIO do painel: gira entre as frequências desbloqueadas, nessa ordem
  // fixa — SUBÚRBIO XENOM, CIDADENEON.CRYPTO, LIVE NEON, CIDADE NEON 222.4 FM.
  // Toca todas as prévias da frequência atual 1x, chia, silencia 5s (tempo da
  // próxima missão chegar no telefone) e passa pra PRÓXIMA frequência já
  // desbloqueada — nunca repete a mesma, a menos que seja a única disponível.
  const [zoneName, setZoneName]     = useState("SUBÚRBIO XÊNON") // guardado p/ o cenário visual (Fase B)
  const [currentTier, setCurrentTier] = useState<Tier>(() => highestAcceptedTier(funnel.state.radioAccepted))
  const [radioIdx, setRadioIdx]     = useState(0)
  const [snippetPct, setSnippetPct] = useState(0)
  // maquina da radio: toca a frequencia inteira 1x -> chia -> ESTACIONA (chega
  // a missao, aceita ou recusa) -> se recusar/nao houver nada novo, volta a
  // dirigir com o radio em silencio ate rodar a cidade inteira de novo
  const [radioMachine, setRadioMachine] = useState<"playing" | "static" | "parked" | "silentLap">("playing")
  const [manualTier, setManualTier] = useState<Tier | null>(null)
  // a rádio começa DESLIGADA — só passa a tocar/ciclar frequências depois que
  // a pessoa aperta o power. Enquanto desligada, nada progride (sem missão
  // chegando), igual a um rádio de verdade
  const [radioOn, setRadioOn] = useState(false)
  // notificações do celular ecoadas numa barra no rádio (ver AudioBridge)
  const [phoneNotif, setPhoneNotif] = useState<Omit<PhoneNotification, "type"> | null>(null)
  const phoneNotifTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const radioAudioRef = useRef<HTMLAudioElement | null>(null)
  const radioRetryPendingRef = useRef(false)
  const staticCtxRef   = useRef<AudioContext | null>(null)
  // timer chiado->estacionado: fica FORA do array de timeouts do efeito de
  // ciclo de propósito — esse efeito reinicia quando radioMachine muda pra
  // "static" (está nas deps) e cancelaria esse timer antes de disparar
  const parkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (parkTimeoutRef.current) clearTimeout(parkTimeoutRef.current) }, [])
  const confirmCount    = funnel.state.confirmationCount
  const finalCompleted  = funnel.state.unlocked.finalCompleted
  const radioAccepted   = funnel.state.radioAccepted
  // refs sempre com o valor mais recente, lidos dentro do ciclo assincrono e
  // do loop imperativo do canvas, sem precisar reiniciar efeitos a cada render
  const confirmCountRef   = useRef(confirmCount)
  const finalCompletedRef = useRef(finalCompleted)
  const radioMachineRef   = useRef(radioMachine)
  const silentLapDistRef  = useRef(0)
  useEffect(() => { confirmCountRef.current = confirmCount }, [confirmCount])
  useEffect(() => { finalCompletedRef.current = finalCompleted }, [finalCompleted])
  useEffect(() => { radioMachineRef.current = radioMachine }, [radioMachine])
  const resumeAfterLapRef = useRef(() => setRadioMachine("playing"))

  // o teste correspondente aquela frequencia ja foi concluido no funil?
  // (pre-requisito pra ELA poder ser oferecida no dialogo de missao)
  const testDone = useCallback((tier: Tier): boolean => {
    switch (tier) {
      case "suburbio": return true
      case "crypto":   return confirmCountRef.current >= 1
      case "live":     return confirmCountRef.current >= 2
      case "full":     return finalCompletedRef.current
    }
  }, [])

  const activeTier     = manualTier ?? currentTier
  const activeTracks   = TRACKS_BY_TIER[activeTier]
  const radioTrack     = activeTracks.length ? activeTracks[radioIdx % activeTracks.length] : null
  const [radioMuted, setRadioMuted] = useState(false)
  const radioActive    = radioOn && radioMachine === "playing" && !radioMuted
  const orderIdx       = ALL_TIERS.indexOf(currentTier)
  const nextTier: Tier | null = orderIdx < ALL_TIERS.length - 1 ? ALL_TIERS[orderIdx + 1] : null
  const nextTierReady  = nextTier ? testDone(nextTier) && !radioAccepted[nextTier as Exclude<Tier, "suburbio">] : false
  // cenário visual do mundo (fora do painel) — segue o activeTier, lido pelo
  // loop imperativo do canvas via ref (o efeito do canvas só roda 1x)
  const activeTierRef = useRef<Tier>(activeTier)
  useEffect(() => { activeTierRef.current = activeTier }, [activeTier])
  const scenarioRef    = useRef<Scenario>(scenarioForTier(activeTier))
  const transitionRef  = useRef<{ start: number; duration: number } | null>(null)
  const matrixColsRef  = useRef<{ x: number; y: number; speed: number; len: number }[]>([])
  const stageRef  = useRef<HTMLDivElement>(null)
  const blurLRef  = useRef<HTMLDivElement>(null)
  const blurRRef  = useRef<HTMLDivElement>(null)
  const zoneRef   = useRef<string>("SUBÚRBIO XÊNON")

  useEffect(() => {
    roadRef.current = buildRoad()
    carsRef.current = buildCars()
  }, [])

  // Escuta comandos do iframe e executa no AudioPlayer do pai
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data as BridgeCommand | PhoneNotification | CarRadioControl
      if (!data?.type) return
      switch (data.type) {
        case "PLAY":          audio.play(data.index); break
        case "PAUSE":         audio.pause(); break
        case "RESUME":        audio.resume(); break
        case "TOGGLE":        audio.toggle(); break
        case "SEEK":          audio.seekTo(data.seconds); break
        case "NEXT":          audio.next(); break
        case "PREV":          audio.prev(); break
        case "REQUEST_STATE": break
        case "CAR_RADIO_MUTE":   setRadioMuted(true); break
        case "CAR_RADIO_UNMUTE": setRadioMuted(false); break
        case "PHONE_NOTIFICATION": {
          const { id, app, icon, color, title, body } = data
          setPhoneNotif({ id, app, icon, color, title, body })
          if (phoneNotifTimeoutRef.current) clearTimeout(phoneNotifTimeoutRef.current)
          phoneNotifTimeoutRef.current = setTimeout(() => setPhoneNotif(null), 5000)
          break
        }
      }
    }
    window.addEventListener("message", handler)
    return () => { window.removeEventListener("message", handler); if (phoneNotifTimeoutRef.current) clearTimeout(phoneNotifTimeoutRef.current) }
  }, [audio])

  // Envia estado atualizado ao iframe a cada tick de áudio
  useEffect(() => {
    sendStateToIframe(iframeRef.current, {
      trackIdx: audio.trackIdx,
      playing:  audio.playing,
      elapsed:  audio.elapsed,
    })
  }, [audio.trackIdx, audio.playing, audio.elapsed])

  // ── chiado curto sintetizado via Web Audio (sem depender de arquivo) ──
  const playStaticBurst = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = staticCtxRef.current ?? (staticCtxRef.current = new Ctx())
      const dur = 0.8
      const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6
      const src = ctx.createBufferSource()
      src.buffer = buffer
      const gain = ctx.createGain()
      const t = ctx.currentTime
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05)
      gain.gain.linearRampToValueAtTime(0.5, t + dur - 0.2)
      gain.gain.linearRampToValueAtTime(0, t + dur)
      src.connect(gain).connect(ctx.destination)
      src.start(t); src.stop(t + dur)
    } catch { /* Web Audio indisponivel — silencioso */ }
  }, [])

  // ── SINTONIA MANUAL (pós fim de jogo): só toca em loop simples a frequência
  // escolhida, sem estacionar nem oferecer missão — a pessoa já desbloqueou tudo ──
  useEffect(() => {
    if (!manualTier) return
    if (!radioOn) return
    let cancelled = false
    const intervals: ReturnType<typeof setInterval>[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const tracks = TRACKS_BY_TIER[manualTier]

    const stepThrough = (idx: number) => {
      if (cancelled) return
      setRadioMachine("playing")
      setRadioIdx(idx)
      const t0 = performance.now()
      setSnippetPct(0)
      const prog = setInterval(() => {
        if (cancelled) { clearInterval(prog); return }
        setSnippetPct(Math.min((performance.now() - t0) / RADIO_SNIPPET_MS, 1))
      }, 120)
      intervals.push(prog)
      const to = setTimeout(() => {
        clearInterval(prog)
        if (cancelled) return
        if (idx < tracks.length - 1) { stepThrough(idx + 1); return }
        setRadioMachine("static")
        playStaticBurst()
        const t1 = setTimeout(() => { if (!cancelled) stepThrough(0) }, 900)
        timeouts.push(t1)
      }, RADIO_SNIPPET_MS)
      timeouts.push(to)
    }
    stepThrough(0)

    return () => { cancelled = true; intervals.forEach(clearInterval); timeouts.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualTier, radioOn, playStaticBurst])

  // ── CICLO DA RÁDIO (missão): toca todas as prévias da frequência atual 1x —
  // a "distância percorrida" é a soma dessas prévias. Ao terminar, chia e o
  // carro ESTACIONA: chega a missão da próxima frequência (se o teste dela já
  // foi concluido). Aceitando, ela é liberada e passa a tocar; recusando (ou
  // se não houver nada novo ainda), o carro volta a dirigir com o rádio em
  // silêncio até completar uma volta inteira na cidade — só aí a frequência
  // atual toca de novo do início. ──
  useEffect(() => {
    if (manualTier) return // sintonia manual assume o controle
    if (!radioOn) return // desligada — nada progride até a pessoa ligar
    if (radioMachine !== "playing") return
    let cancelled = false
    const intervals: ReturnType<typeof setInterval>[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const tracks = TRACKS_BY_TIER[currentTier]

    const stepThrough = (idx: number) => {
      if (cancelled) return
      setRadioIdx(idx)
      const t0 = performance.now()
      setSnippetPct(0)
      const prog = setInterval(() => {
        if (cancelled) { clearInterval(prog); return }
        setSnippetPct(Math.min((performance.now() - t0) / RADIO_SNIPPET_MS, 1))
      }, 120)
      intervals.push(prog)
      const to = setTimeout(() => {
        clearInterval(prog)
        if (cancelled) return
        if (idx < tracks.length - 1) { stepThrough(idx + 1); return }
        // pass completa: chia e estaciona (chega a missão). Usa o ref
        // persistente (não o array local) pra sobreviver ao efeito reiniciar
        // quando radioMachine vira "static" logo na linha de cima
        setRadioMachine("static")
        playStaticBurst()
        if (parkTimeoutRef.current) clearTimeout(parkTimeoutRef.current)
        parkTimeoutRef.current = setTimeout(() => {
          setRadioMachine("parked")
          // vibra o celular pra avisar que a missão chegou
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([160, 80, 160])
        }, 900)
      }, RADIO_SNIPPET_MS)
      timeouts.push(to)
    }
    stepThrough(0)

    return () => { cancelled = true; intervals.forEach(clearInterval); timeouts.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioMachine, currentTier, manualTier, radioOn, playStaticBurst])

  const handleAcceptMission = useCallback(() => {
    if (!nextTier) return
    funnel.setState(prev => ({ ...prev, radioAccepted: { ...prev.radioAccepted, [nextTier]: true } }))
    setCurrentTier(nextTier)
    setRadioMachine("playing")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextTier])

  const handleDismissMission = useCallback(() => {
    silentLapDistRef.current = 0
    setRadioMachine("silentLap")
  }, [])

  // toca o trecho atual (elemento próprio da rádio) ou silencia fora da fase "playing"
  useEffect(() => {
    const el = radioAudioRef.current ?? (radioAudioRef.current = new Audio())
    if (!radioActive || !radioTrack) { el.pause(); return }
    if (!el.src.endsWith(radioTrack.src)) { el.src = radioTrack.src; el.currentTime = 0 }
    el.volume = volume
    el.play().catch(() => {
      // autoplay bloqueado pelo navegador (ainda sem nenhum gesto do usuário
      // nesta página, ex.: a 1ª faixa ao entrar em /drive) — tenta de novo
      // assim que a pessoa interagir pela primeira vez (toque/clique/tecla)
      if (radioRetryPendingRef.current) return
      radioRetryPendingRef.current = true
      const retry = () => {
        radioRetryPendingRef.current = false
        radioAudioRef.current?.play().catch(() => {})
      }
      window.addEventListener("pointerdown", retry, { once: true })
      window.addEventListener("keydown", retry, { once: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radioIdx, radioActive, radioTrack, volume])

  // pausa o player global (evita áudio dobrado) ao entrar; pausa a rádio ao sair
  useEffect(() => {
    audio.pause()
    return () => { radioAudioRef.current?.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // teclado
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key==="ArrowUp"||e.key===" ") accelRef.current=true
      if (e.key==="ArrowLeft")  leftRef.current=true
      if (e.key==="ArrowRight") rightRef.current=true
    }
    const ku = (e: KeyboardEvent) => {
      if (e.key==="ArrowUp"||e.key===" ") accelRef.current=false
      if (e.key==="ArrowLeft")  leftRef.current=false
      if (e.key==="ArrowRight") rightRef.current=false
    }
    window.addEventListener("keydown",kd)
    window.addEventListener("keyup",ku)
    return ()=>{window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku)}
  },[])

  useEffect(()=>{
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext("2d")!

    const resize = ()=>{
      const stage = stageRef.current
      const w = stage ? stage.clientWidth  : window.innerWidth
      const h = stage ? stage.clientHeight : window.innerHeight
      canvas.width  = w
      canvas.height = h
    }
    resize()
    window.addEventListener("resize",resize)

    // Layout fixo em proporções:
    // BOTOES_H  = 90px fixo no fundo
    // DASH_H    = DASH_FRACTION da altura total
    // JOGO_H    = resto (topo)
    const BOTOES_H = BOTOES_H_PX
    const MAX_KMH  = 222
    const ACCEL_RATE  = 40
    const BRAKE_RATE  = 28
    // velocidade inicial: 40% de MAX_KMH → já começa em movimento
    if (speedRef.current === 0) speedRef.current = MAX_KMH * 0.40

    let last = 0
    let frameCount = 0

    const frame = (ts: number) => {
      const dt  = Math.min((ts - last) / 1000, 0.05)
      last = ts
      frameCount++

      if (!roadRef.current.length) { rafRef.current=requestAnimationFrame(frame); return }

      const W = canvas.width
      const H = canvas.height
      const DASH_H  = Math.round(H * DASH_FRACTION)
      const JOGO_H  = H - DASH_H - BOTOES_H

      // ── Física natural ──
      const parked = radioMachineRef.current === "parked"

      if (parked) {
        // ESTACIONADO no posto pra ver a missão: freia até parar e ignora os
        // comandos de acelerar/virar até a pessoa aceitar ou recusar
        accelPressRef.current = 0
        speedRef.current = Math.max(speedRef.current - BRAKE_RATE * dt * 4, 0)
        playerXRef.current *= 0.9
      } else if (accelRef.current) {
        // física com pressão acumulada: aceleração cresce com o tempo segurando
        accelPressRef.current = Math.min(accelPressRef.current + dt * 0.8, 3.0)
        const rate = ACCEL_RATE * (0.5 + accelPressRef.current * 0.5)
        speedRef.current = Math.min(speedRef.current + rate * dt, MAX_KMH)
      } else {
        accelPressRef.current = Math.max(accelPressRef.current - dt * 4, 0)
        speedRef.current = Math.max(speedRef.current - BRAKE_RATE * dt, 0)
      }

      // direção (trava enquanto estacionado)
      const STEER = 1.6
      if (!parked) {
        if (leftRef.current)  playerXRef.current = Math.max(-1, playerXRef.current - STEER*dt)
        if (rightRef.current) playerXRef.current = Math.min( 1, playerXRef.current + STEER*dt)
        if (!leftRef.current && !rightRef.current) playerXRef.current *= 0.96
      }

      // avança na estrada proporcionalmente à velocidade real do velocímetro
      // 222 km/h => sensação de alta velocidade; multiplicador maior = chão mais rápido
      const totalLen = ROAD_LEN * SEG_LEN
      const advance = speedRef.current * dt * 38
      posRef.current = ((posRef.current + advance) % totalLen + totalLen) % totalLen

      // rádio em silêncio (recusou/sem missão nova): conta a distância
      // percorrida até completar uma volta inteira, então a frequência
      // atual volta a tocar do início
      if (radioMachineRef.current === "silentLap") {
        silentLapDistRef.current += advance
        if (silentLapDistRef.current >= totalLen) {
          silentLapDistRef.current = 0
          resumeAfterLapRef.current()
        }
      }

      // zona + valores dos mostradores lidos direto dos refs (sem stale closure)
      const pct = posRef.current / totalLen
      const z   = pct<0.33?"SUBÚRBIO XÊNON":pct<0.66?"CIDADE NEON":"NOVA ONDA"
      if (z !== zoneRef.current) { zoneRef.current = z; setZoneName(z) }
      const kmhNow = Math.round(speedRef.current)
      const rpmNow = Math.round((speedRef.current / MAX_KMH) * 80) / 10

      // blur lateral proporcional à velocidade (motion blur do cenário)
      const spdFrac = Math.min(speedRef.current / MAX_KMH, 1)
      const blurPx  = (spdFrac * spdFrac * 7).toFixed(1)
      if (blurLRef.current) blurLRef.current.style.backdropFilter = `blur(${blurPx}px)`
      if (blurRRef.current) blurRRef.current.style.backdropFilter = `blur(${blurPx}px)`

      // ── CENÁRIO: a troca é uma "ilusão" disparada pela missão aceita (não
      // pela posição na pista) — ao mudar o tier ativo, dispara a transição
      // estilo Matrix e passa a desenhar a nova paleta/mundo ──
      const scenario = scenarioForTier(activeTierRef.current)
      if (scenario !== scenarioRef.current) {
        scenarioRef.current = scenario
        transitionRef.current = { start: ts, duration: 1300 }
        const cols = Math.max(1, Math.ceil(W / 18))
        matrixColsRef.current = Array.from({ length: cols }, (_, i) => ({
          x: i * 18,
          y: -Math.random() * H,
          speed: 260 + Math.random() * 420,
          len: 6 + Math.floor(Math.random() * 10),
        }))
      }
      const palette = PALETTES[scenarioRef.current]

      // ── Limpa canvas ──
      ctx.clearRect(0,0,W,H)

      // ── SKY (ocupa JOGO_H do topo) ──
      const sky = ctx.createLinearGradient(0,0,0,JOGO_H)
      sky.addColorStop(0,   palette.skyTop)
      sky.addColorStop(0.5, palette.skyMid)
      sky.addColorStop(1,   palette.skyHorizon)
      ctx.fillStyle = sky
      ctx.fillRect(0,0,W,JOGO_H)

      // Sol
      const SX=W*0.5, SY=JOGO_H*0.38, SR=Math.min(W,JOGO_H)*0.09
      const sg=ctx.createRadialGradient(SX,SY,0,SX,SY,SR)
      sg.addColorStop(0,palette.sunInner); sg.addColorStop(0.6,palette.sunOuter); sg.addColorStop(1,"transparent")
      ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(SX,SY,SR,0,Math.PI*2); ctx.fill()
      ctx.fillStyle=palette.skyMid
      for(let s=0;s<5;s++) ctx.fillRect(SX-SR, SY+SR*0.3+s*SR*0.15, SR*2, SR*0.07)

      // Estrelas (só em cenários noturnos — HELIX é de dia, sem estrelas)
      if (palette.hasStars) {
        ctx.fillStyle="rgba(255,255,255,0.7)"
        for(let s=0;s<50;s++){
          const sx=((s*179+posRef.current*0.003)%W+W)%W
          const sy=(s*67)%(JOGO_H*0.32)
          ctx.fillRect(sx,sy,s%4===0?2:1,s%4===0?2:1)
        }
      }

      // Silhueta do horizonte
      const horizY = JOGO_H * 0.60
      if (scenarioRef.current === "helix") {
        // parque eólico + fileira de painéis solares no lugar dos prédios
        const turbineX=[0.08,0.22,0.38,0.58,0.74,0.90]
        for(let t=0;t<turbineX.length;t++){
          const tx=turbineX[t]*W, th=JOGO_H*0.30
          const poleW=Math.max(2,W*0.004)
          ctx.fillStyle=palette.buildingBase
          ctx.fillRect(tx-poleW/2, horizY-th, poleW, th)
          ctx.save()
          ctx.translate(tx, horizY-th)
          ctx.rotate(posRef.current*0.0015 + t)
          ctx.strokeStyle=palette.buildingBase
          ctx.lineWidth=Math.max(1.5,W*0.0025)
          for(let bl=0;bl<3;bl++){
            ctx.save(); ctx.rotate((bl/3)*Math.PI*2)
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-th*0.22); ctx.stroke()
            ctx.restore()
          }
          ctx.restore()
        }
        ctx.fillStyle="#1c3a52"
        for(let s=0;s<8;s++){
          const sx=(s/8)*W+W*0.02, sw=W*0.09, sh=JOGO_H*0.045
          ctx.save()
          ctx.translate(sx, horizY-sh*0.6); ctx.rotate(-0.15)
          ctx.fillRect(-sw/2,-sh/2,sw,sh)
          ctx.strokeStyle="#3d6a8a"; ctx.lineWidth=1
          ctx.strokeRect(-sw/2,-sh/2,sw,sh)
          ctx.restore()
        }
      } else {
        // prédios com janelas (Subúrbio: ferrugem apagada · Cidade Neon: néon intenso)
        const bxArr=[0.05,0.12,0.20,0.28,0.36,0.44,0.52,0.60,0.68,0.76,0.84,0.92]
        const bhArr=[0.09,0.13,0.08,0.16,0.11,0.18,0.10,0.15,0.12,0.17,0.09,0.13]
        const bhScale = scenarioRef.current === "cidadeneon" ? 0.62 : 0.42 // "infinitos" — bem mais altos
        for(let b=0;b<bxArr.length;b++){
          const bW=W*0.075, bHH=bhArr[b]*JOGO_H*bhScale, bXX=bxArr[b]*W
          ctx.fillStyle=palette.buildingBase
          ctx.fillRect(bXX-bW/2, horizY-bHH, bW, bHH)
          const wc=palette.windowColors[b%palette.windowColors.length]
          ctx.fillStyle=wc
          for(let wy=4;wy<bHH-4;wy+=9)
            for(let wx=4;wx<bW-4;wx+=8)
              if((b*7+wy+wx)%3!==0) ctx.fillRect(bXX-bW/2+wx,horizY-bHH+wy,4,4)
        }
      }

      // ── ROAD pseudo-3D ──
      // A estrada começa na linha do horizonte (horizY) e vai até o fundo do JOGO_H
      // Segmento mais distante → y mais perto de horizY
      // Segmento mais próximo → y mais perto de JOGO_H

      const startSeg = Math.floor(posRef.current/SEG_LEN) % ROAD_LEN

      // câmera curva (look-ahead)
      let camCurve=0
      for(let n=0;n<20;n++) camCurve+=roadRef.current[(startSeg+n)%ROAD_LEN].curve*(20-n)/20
      curveRef.current = camCurve

      // projetar segmentos de longe (n=DRAW_DIST) pra perto (n=1)
      // y de um segmento a distância n:
      // escala = perspectiva: quanto maior n, menor a escala (mais longe)
      // y_tela = horizY + (JOGO_H - horizY) * (1/n) * fator

      type Proj = {
        x1:number; y1:number; w1:number
        x2:number; y2:number; w2:number
        si:number; n:number
      }
      const projs:Proj[]=[]

      let xOff=0, dxOff=0

      for(let n=1;n<=DRAW_DIST;n++){
        const si=(startSeg+n)%ROAD_LEN
        xOff+=dxOff
        dxOff+=roadRef.current[si].curve*0.0002

        // escala de perspectiva: n=1 → perto → grande; n=DRAW_DIST → longe → pequeno
        const scale1 = CAM_DEPTH / n
        const scale2 = CAM_DEPTH / (n+1)

        // y na tela: n=1 → JOGO_H (perto, embaixo); n=DRAW_DIST → horizY (longe, cima)
        const y1 = horizY + (JOGO_H - horizY) * (scale1 / CAM_DEPTH)
        const y2 = horizY + (JOGO_H - horizY) * (scale2 / CAM_DEPTH)

        // x central com curva
        const cX1 = W/2 + (playerXRef.current * -0.5 + xOff + camCurve*0.03) * ROAD_W * scale1
        const cX2 = W/2 + (playerXRef.current * -0.5 + xOff + camCurve*0.03) * ROAD_W * scale2

        const w1 = ROAD_W * scale1
        const w2 = ROAD_W * scale2

        projs.push({x1:cX1,y1,w1,x2:cX2,y2,w2,si,n})
      }

      // desenha de longe (grande n) pra perto (n=1) → painter's algorithm
      for(let pi=projs.length-1;pi>=0;pi--){
        const p=projs[pi]
        // só desenha se y1 > y2 (perto está abaixo de longe — correto)
        if(p.y1<=p.y2) continue
        if(p.y2>JOGO_H) continue
        if(p.y1<horizY) continue

        const si=p.si
        const alt=(Math.floor(si/4)%2)===0

        // grass
        ctx.fillStyle=alt?palette.grass1:palette.grass2
        ctx.beginPath()
        ctx.moveTo(0,p.y2); ctx.lineTo(W,p.y2)
        ctx.lineTo(W,p.y1); ctx.lineTo(0,p.y1)
        ctx.fill()

        // road
        ctx.fillStyle=alt?palette.road1:palette.road2
        ctx.beginPath()
        ctx.moveTo(p.x1-p.w1,p.y1); ctx.lineTo(p.x1+p.w1,p.y1)
        ctx.lineTo(p.x2+p.w2,p.y2); ctx.lineTo(p.x2-p.w2,p.y2)
        ctx.fill()

        // borda branca esq
        ctx.fillStyle=palette.stripW
        ctx.beginPath()
        ctx.moveTo(p.x1-p.w1,p.y1); ctx.lineTo(p.x1-p.w1+p.w1*0.06,p.y1)
        ctx.lineTo(p.x2-p.w2+p.w2*0.06,p.y2); ctx.lineTo(p.x2-p.w2,p.y2)
        ctx.fill()
        // borda branca dir
        ctx.beginPath()
        ctx.moveTo(p.x1+p.w1,p.y1); ctx.lineTo(p.x1+p.w1-p.w1*0.06,p.y1)
        ctx.lineTo(p.x2+p.w2-p.w2*0.06,p.y2); ctx.lineTo(p.x2+p.w2,p.y2)
        ctx.fill()

        // linha central (alternada) — em HELIX é energia luminosa (com glow)
        if(alt){
          if (scenarioRef.current === "helix") { ctx.shadowColor=palette.stripY; ctx.shadowBlur=8 }
          ctx.fillStyle=palette.stripY
          ctx.beginPath()
          ctx.moveTo(p.x1-p.w1*0.03,p.y1); ctx.lineTo(p.x1+p.w1*0.03,p.y1)
          ctx.lineTo(p.x2+p.w2*0.03,p.y2); ctx.lineTo(p.x2-p.w2*0.03,p.y2)
          ctx.fill()
          ctx.shadowBlur=0
        }

        // sprites laterais
        for(const sp of roadRef.current[si].sprites){
          const spX=p.x1+sp.x*p.w1
          drawSprite(ctx,spX,p.y1,p.w1/ROAD_W,sp.type,scenarioRef.current,palette)
        }

        // carros tráfego
        for(const car of carsRef.current){
          if(car.seg===si){
            const cX=p.x1+car.x*p.w1*0.6
            const cW=p.w1*0.38
            const cH=cW*0.55
            if(cW<5) continue
            ctx.fillStyle=car.color
            ctx.fillRect(cX-cW/2,p.y1-cH,cW,cH)
            ctx.fillStyle="rgba(0,200,255,0.45)"
            ctx.fillRect(cX-cW*0.28,p.y1-cH+cH*0.05,cW*0.56,cH*0.38)
            ctx.fillStyle="#ff4400"; ctx.shadowColor="#ff4400"; ctx.shadowBlur=4
            ctx.fillRect(cX-cW*0.44,p.y1-cH*0.5,cW*0.11,cH*0.13)
            ctx.fillRect(cX+cW*0.33,p.y1-cH*0.5,cW*0.11,cH*0.13)
            ctx.shadowBlur=0
          }
        }
      }

      // ── BLUR LATERAL no canvas (mais intenso que CSS) ──
      if (spdFrac > 0.05) {
        const blurW = W * 0.18
        const blurAlpha = spdFrac * spdFrac * 0.72
        // esquerda
        const blL = ctx.createLinearGradient(0,0,blurW,0)
        blL.addColorStop(0, `rgba(10,0,30,${blurAlpha})`)
        blL.addColorStop(1, "rgba(10,0,30,0)")
        ctx.fillStyle = blL
        ctx.fillRect(0,0,blurW,JOGO_H)
        // direita
        const blR = ctx.createLinearGradient(W,0,W-blurW,0)
        blR.addColorStop(0, `rgba(10,0,30,${blurAlpha})`)
        blR.addColorStop(1, "rgba(10,0,30,0)")
        ctx.fillStyle = blR
        ctx.fillRect(W-blurW,0,blurW,JOGO_H)
        // streaks de luz (rastelado neon lateral)
        if (spdFrac > 0.3) {
          const streakAlpha = (spdFrac - 0.3) * 0.6
          const streakColors = ["#ff2d7888","#00e5ff66","#cc00ff66"]
          for (let sk=0;sk<6;sk++) {
            const sy = JOGO_H * (0.25 + sk*0.1)
            const sh = 1 + sk%3
            const sw = blurW * (0.4 + spdFrac*0.6)
            ctx.globalAlpha = streakAlpha * (0.4+Math.sin(frameCount*0.15+sk)*0.3)
            ctx.fillStyle = streakColors[sk%3]
            ctx.fillRect(0, sy, sw, sh)
            ctx.fillRect(W-sw, sy+4, sw, sh)
          }
          ctx.globalAlpha = 1
        }
      }

      // ── DASHBOARD ──
      drawDashboard(ctx,W,H,DASH_H,BOTOES_H,kmhNow,rpmNow,z,camCurve,audio.currentTrack?.title||"—",audio.playing)

      // ── TRANSIÇÃO estilo Matrix (chuva digital) ao trocar de cenário ──
      const tr = transitionRef.current
      if (tr) {
        const elapsed = ts - tr.start
        const progress = Math.min(elapsed / tr.duration, 1)
        if (progress >= 1) {
          transitionRef.current = null
        } else {
          const fadeIn  = Math.min(progress / 0.25, 1)
          const fadeOut = Math.max(0, (progress - 0.4) / 0.6)
          const alpha   = Math.max(0, fadeIn - fadeOut)
          ctx.fillStyle = `rgba(0,5,0,${(0.55*alpha).toFixed(3)})`
          ctx.fillRect(0,0,W,H)
          ctx.textAlign="left"
          ctx.font="14px monospace"
          for (const col of matrixColsRef.current) {
            col.y += col.speed * dt
            if (col.y - col.len*18 > H) col.y = -Math.random()*120
            for (let k=0;k<col.len;k++){
              const cy = col.y - k*18
              if (cy<0 || cy>H) continue
              const a = alpha * (1 - k/col.len)
              ctx.fillStyle = k===0 ? `rgba(210,255,210,${a.toFixed(3)})` : `rgba(0,255,110,${(a*0.8).toFixed(3)})`
              ctx.fillText(MATRIX_CHARS[Math.floor(Math.random()*MATRIX_CHARS.length)], col.x, cy)
            }
          }
        }
      }

      rafRef.current=requestAnimationFrame(frame)
    }

    rafRef.current=requestAnimationFrame(frame)
    return()=>{cancelAnimationFrame(rafRef.current);window.removeEventListener("resize",resize)}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  const DASH_PCT = DASH_FRACTION
  const BOTOES_H_PCT = BOTOES_H_PX

  // Celular fechado (docked): posicionado no topo do céu — área só decorativa
  // do canvas — pra nunca cobrir o painel (velocímetro/RPM/rádio) nem os
  // botões de direção, e ainda assim ficar bem mais visível que antes.
  const DOCKED_W = 156 // 104 * 1.5 — 50% maior
  const DOCKED_H = Math.round(DOCKED_W * (844 / 390))

  return (
    <div
      ref={stageRef}
      className="relative bg-black select-none overflow-hidden"
      style={{ width:"100vw", height:"100dvh" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"/>

      {/* BLUR LATERAL — motion blur */}
      {!phoneOpen&&(
        <>
          <div ref={blurLRef} style={{position:"absolute",top:0,bottom:0,left:0,width:"16%",zIndex:30,pointerEvents:"none",WebkitMaskImage:"linear-gradient(to right, black, transparent)",maskImage:"linear-gradient(to right, black, transparent)"}}/>
          <div ref={blurRRef} style={{position:"absolute",top:0,bottom:0,right:0,width:"16%",zIndex:30,pointerEvents:"none",WebkitMaskImage:"linear-gradient(to left, black, transparent)",maskImage:"linear-gradient(to left, black, transparent)"}}/>
        </>
      )}

      {/* OVERLAY para fechar celular */}
      {phoneOpen&&(
        <div
          onClick={()=>setPhoneOpen(false)}
          style={{position:"absolute",inset:0,zIndex:55,background:"rgba(2,0,12,0.78)"}}
        />
      )}

      {/* CELULAR — fechado: no topo do céu (área decorativa), maior e bem
          visível, sem cobrir painel/rádio/botões. Aberto: tela cheia central. */}
      <div
        onClick={()=>!phoneOpen&&setPhoneOpen(true)}
        style={{
          position:"absolute", zIndex:60,
          transition:"all .45s cubic-bezier(.4,0,.2,1)",
          // "vibra" visualmente o celular fechado quando uma missão chega —
          // funciona em qualquer navegador, mesmo onde navigator.vibrate não existe
          animation: (!phoneOpen && radioMachine === "parked") ? "phone-buzz 0.5s ease-in-out infinite" : "none",
          ...(phoneOpen
            ? {
                top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                height: isMobile ? "68%" : "90%",
                aspectRatio:"9 / 19.5",
                maxWidth: isMobile ? "58%" : "86%",
                background:"#0a0a0d", borderRadius:44, padding:9,
                border:"1px solid #2a2a30",
                boxShadow:`0 0 0 2px #000, 0 18px 50px rgba(0,0,0,0.7), 0 0 26px ${C.neonPink}33`,
                cursor:"default",
              }
            : {
                top:14,
                right:14,
                width:DOCKED_W, height:DOCKED_H,
                background:"#0a0014", borderRadius:16, padding:0,
                border:`1.5px solid ${C.neonPink}70`,
                boxShadow:`0 0 20px ${C.neonPink}55, 0 0 4px ${C.neonPink}aa`,
                cursor:"pointer", overflow:"hidden",
              }),
        }}
      >
        {phoneOpen&&(<>
          <div style={{position:"absolute",left:-2,top:"22%",width:3,height:46,borderRadius:3,background:"#1c1c20"}}/>
          <div style={{position:"absolute",left:-2,top:"34%",width:3,height:70,borderRadius:3,background:"#1c1c20"}}/>
          <div style={{position:"absolute",right:-2,top:"26%",width:3,height:90,borderRadius:3,background:"#1c1c20"}}/>
        </>)}
        <div style={{position:"relative",width:"100%",height:"100%",borderRadius:phoneOpen?36:14,overflow:"hidden",background:"#000"}}>
          {phoneOpen&&(
            <div style={{position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",width:"34%",height:22,borderRadius:14,background:"#000",zIndex:5}}/>
          )}
          <iframe
            ref={iframeRef}
            src="/?screen=home"
            style={{
              width: phoneOpen?"100%":"390px",
              height: phoneOpen?"100%":"844px",
              border:"none",
              transform: phoneOpen?"none":`scale(${DOCKED_W/390})`,
              transformOrigin:"top left",
              pointerEvents: phoneOpen?"auto":"none",
            }}
            title="Celular"
          />
        </div>
        {phoneOpen&&(
          <button
            onClick={(e)=>{e.stopPropagation();setPhoneOpen(false)}}
            style={{
              position:"absolute",bottom:-56,left:"50%",transform:"translateX(-50%)",
              display:"flex",alignItems:"center",gap:9,
              background:`linear-gradient(90deg, ${C.neonPink}, #ff6a3d)`,
              border:`1.5px solid #ffb0cf`,
              borderRadius:16,padding:"13px 40px",
              color:"#12000a",fontSize:15,fontWeight:800,letterSpacing:3,
              textTransform:"uppercase",whiteSpace:"nowrap",cursor:"pointer",
              animation:"dirigir-pulse 1.6s ease-in-out infinite",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#12000a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3v6.6M4.2 16.5l5.7-3.3M19.8 16.5l-5.7-3.3"/></svg>
            DIRIGIR
          </button>
        )}
      </div>

      {/* RÁDIO DO PAINEL — mostrador vintage-futurista: só nome da música,
          nome da frequência e o número dela + um anel de volume ao lado */}
      {!phoneOpen&&(()=>{
        const active = radioActive
        const isStatic = radioMachine === "static"
        const meta = F[activeTier]
        const accent = radioOn ? meta.color : "#6b7280"
        const title = (radioTrack?.title ?? "—").toUpperCase()
        return (
        <div style={{
          position:"absolute",
          bottom: `calc(${BOTOES_H_PCT}px + ${DASH_PCT*100}% * 0.24)`,
          left:"50%", transform:"translateX(-50%)",
          width:"min(80%, 460px)",
          zIndex:46,
          display:"flex", alignItems:"center", gap:10,
        }}>
          {/* POWER — a rádio começa desligada; nada progride até ligar */}
          <button
            type="button"
            onClick={() => setRadioOn(o => !o)}
            aria-label={radioOn ? "Desligar rádio" : "Ligar rádio"}
            style={{
              flexShrink:0, width:44, height:44, borderRadius:"50%",
              background: radioOn ? `${meta.color}22` : "rgba(255,255,255,0.06)",
              border: `2px solid ${radioOn ? meta.color : "rgba(255,255,255,0.25)"}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor:"pointer",
              boxShadow: radioOn ? `0 0 12px ${meta.color}55` : "none",
              WebkitTapHighlightColor:"transparent",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={radioOn ? meta.color : "rgba(255,255,255,0.5)"} strokeWidth={2.2} strokeLinecap="round"><path d="M12 2v8"/><path d="M18.36 6.64a9 9 0 11-12.73 0"/></svg>
          </button>

          <div style={{
            position:"relative", flex:1, borderRadius:16, padding:"12px 16px 13px",
            background:"linear-gradient(180deg, rgba(8,4,20,0.92), rgba(4,2,10,0.94))",
            border:`1px solid ${accent}55`,
            boxShadow: radioOn ? `0 0 22px ${accent}33, inset 0 0 16px ${accent}18` : "none",
            overflow:"hidden", pointerEvents:"none",
            opacity: radioOn ? 1 : 0.7,
          }}>
            {/* scanlines */}
            <div style={{position:"absolute",inset:0,opacity:0.22,pointerEvents:"none",
              backgroundImage:"repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.45) 2px 3px)"}}/>
            {/* estação + freq + status */}
            <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontFamily:"monospace",fontSize:12,letterSpacing:2,color:accent,textShadow:radioOn?`0 0 6px ${accent}`:"none"}}>{meta.label}</span>
              <span style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"monospace",fontSize:12,letterSpacing:1,color:accent,opacity:0.85}}>{meta.freq} FM</span>
                {!radioOn ? (
                  <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:1,color:accent}}>DESLIGADO</span>
                ) : active ? (
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:"monospace",fontSize:10,letterSpacing:1,color:accent}}>
                    <span style={{width:7,height:7,borderRadius:7,background:accent,boxShadow:`0 0 6px ${accent}`,animation:"radio-blink 1.4s ease-in-out infinite"}}/>
                    NO AR
                  </span>
                ) : isStatic ? (
                  <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:1,color:accent}}>INTERFERÊNCIA</span>
                ) : (
                  <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:1,color:accent}}>SILÊNCIO</span>
                )}
              </span>
            </div>
            {!radioOn ? (
              <div style={{position:"relative",height:38,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:1,color:"#9aa0aa"}}>◌ APERTE O POWER PRA LIGAR ◌</span>
              </div>
            ) : active ? (
              <>
                {/* now playing (marquee) — só o nome da música */}
                <div style={{position:"relative",height:24,overflow:"hidden"}}>
                  <div style={{position:"absolute",whiteSpace:"nowrap",fontFamily:"monospace",fontSize:17,fontWeight:700,letterSpacing:1,
                    color:"#eafff8",textShadow:`0 0 8px ${accent}aa`,animation:"dash-marquee 11s linear infinite"}}>
                    ♪ {title} &nbsp;&nbsp;&nbsp;&nbsp; ♪ {title} &nbsp;&nbsp;&nbsp;&nbsp;
                  </div>
                </div>
                {/* barra dos 22s */}
                <div style={{position:"relative",marginTop:8,height:4,borderRadius:4,background:"rgba(255,255,255,0.1)"}}>
                  <div style={{height:"100%",borderRadius:4,width:`${snippetPct*100}%`,background:accent,boxShadow:`0 0 8px ${accent}`,transition:"width .12s linear"}}/>
                </div>
              </>
            ) : isStatic ? (
              <div style={{position:"relative",height:38,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:14,fontWeight:700,letterSpacing:1,color:accent,animation:"radio-blink 0.25s steps(2) infinite"}}>▓▒░ ▒▓░ ░▓▒ ▒░▓ ░▒▓</span>
              </div>
            ) : (
              <div style={{position:"relative",height:38,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <span style={{fontFamily:"monospace",fontSize:14,fontWeight:700,letterSpacing:1,color:"#9aa0aa"}}>◌ SINAL EM SILÊNCIO ◌</span>
              </div>
            )}
          </div>

          {/* ANEL DE VOLUME — arraste ao redor pra ajustar */}
          <div style={{ position:"relative", flexShrink:0, width:56, height:56 }}>
            <div
              ref={volumeRingRef}
              onPointerDown={(e) => {
                e.stopPropagation()
                volumeDraggingRef.current = true
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                updateVolumeFromPointer(e.clientX, e.clientY)
              }}
              onPointerMove={(e) => { if (volumeDraggingRef.current) updateVolumeFromPointer(e.clientX, e.clientY) }}
              onPointerUp={() => { volumeDraggingRef.current = false }}
              style={{
                position:"absolute", inset:0, borderRadius:"50%",
                cursor:"grab", touchAction:"none",
                background:`conic-gradient(from -120deg, ${accent} ${volume*300}deg, rgba(255,255,255,0.10) ${volume*300}deg 300deg, transparent 300deg 360deg)`,
                WebkitMask:"radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px))",
                mask:"radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px))",
                boxShadow:`0 0 12px ${accent}44`,
              }}
            />
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              pointerEvents:"none",
              fontFamily:"monospace", fontSize:9, color:"rgba(255,255,255,0.55)", letterSpacing:0.5,
            }}>
              VOL
            </div>
          </div>
        </div>
        )
      })()}

      {/* BARRA DE NOTIFICAÇÃO DO CELULAR — fininha, no topo, clicável (abre o
          celular e executa a mesma ação de tocar nela lá dentro) */}
      {!phoneOpen && phoneNotif && (
        <button
          type="button"
          onClick={() => {
            sendNotificationClickToIframe(iframeRef.current, phoneNotif.id)
            setPhoneOpen(true)
            setPhoneNotif(null)
          }}
          style={{
            position:"absolute",
            top: DOCKED_H + 26,
            left:"50%", transform:"translateX(-50%)",
            width:"min(80%, 340px)",
            zIndex:62,
            animation:"phone-notif-in 0.35s ease-out",
            display:"flex", alignItems:"center", gap:8,
            borderRadius:999, padding:"6px 14px 6px 6px",
            background:"linear-gradient(135deg, rgba(20,10,35,0.95), rgba(6,3,14,0.97))",
            border:`1px solid ${phoneNotif.color}66`,
            boxShadow:`0 0 14px ${phoneNotif.color}44, 0 6px 16px rgba(0,0,0,0.5)`,
            cursor:"pointer",
          }}
        >
          <span style={{width:8,height:8,borderRadius:8,flexShrink:0,background:phoneNotif.color,boxShadow:`0 0 6px ${phoneNotif.color}`}}/>
          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{phoneNotif.title}</span>
          <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.45)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,textAlign:"left"}}>{phoneNotif.body}</span>
        </button>
      )}

      {/* SINTONIA LIVRE — só depois que a experiência inteira acaba, a pessoa
          escolhe qual das 4 frequências quer ouvir, sem depender de missão */}
      {!phoneOpen && finalCompleted && (
        <div style={{
          position:"absolute",
          bottom: `calc(${BOTOES_H_PCT}px + ${DASH_PCT*100}% + 4px)`,
          left:"50%", transform:"translateX(-50%)",
          width:"min(70%, 340px)",
          zIndex:46,
          display:"flex", gap:5, justifyContent:"center",
        }}>
          {ALL_TIERS.map((tier) => {
            const meta = F[tier]
            const isSelected = manualTier === tier
            return (
              <button
                key={tier}
                type="button"
                onClick={() => { setManualTier(tier); setRadioOn(true) }}
                style={{
                  flex:1, padding:"5px 3px", borderRadius:8,
                  background: isSelected ? `${meta.color}22` : "rgba(255,255,255,0.04)",
                  border:`1px solid ${isSelected ? meta.color+"aa" : "rgba(255,255,255,0.12)"}`,
                  color: isSelected ? meta.color : "rgba(255,255,255,0.5)",
                  fontFamily:"monospace", fontSize:6.5, letterSpacing:0.5,
                  lineHeight:1.3, cursor:"pointer",
                }}
              >
                {meta.label}<br/>{meta.freq}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setManualTier(null)}
            style={{
              flex:"0 0 auto", padding:"5px 8px", borderRadius:8,
              background: manualTier === null ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border:`1px solid ${manualTier === null ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)"}`,
              color: manualTier === null ? "#fff" : "rgba(255,255,255,0.5)",
              fontFamily:"monospace", fontSize:6.5, letterSpacing:0.5,
              lineHeight:1.3, cursor:"pointer",
            }}
          >
            AUTO
          </button>
        </div>
      )}

      {/* CARRO ESTACIONADO — chegou uma missão. Aceitar libera e toca a
          próxima frequência; recusar (ou não haver nada novo ainda) volta a
          dirigir com o rádio atual em silêncio até rodar a cidade inteira */}
      {radioMachine === "parked" && (()=>{
        const meta = nextTier ? F[nextTier] : null
        return (
        <div style={{position:"absolute",inset:0,zIndex:70,background:"rgba(2,0,12,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{
            width:"100%", maxWidth:320, borderRadius:20, padding:"22px 20px",
            background:"linear-gradient(160deg, #12081f 0%, #06030d 100%)",
            border:`1px solid ${meta ? meta.color+"66" : "rgba(255,255,255,0.15)"}`,
            boxShadow:`0 0 30px ${meta ? meta.color+"33" : "rgba(255,255,255,0.1)"}`,
            textAlign:"center",
          }}>
            <p style={{fontFamily:"monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.4)",marginBottom:6}}>
              🅿️ ESTACIONADO NO POSTO
            </p>
            {nextTierReady && meta ? (
              <>
                <p style={{fontFamily:"monospace",fontSize:14,fontWeight:700,letterSpacing:1,color:meta.color,textShadow:`0 0 10px ${meta.color}aa`,marginBottom:8}}>
                  NOVA FREQUÊNCIA DETECTADA
                </p>
                <p style={{fontFamily:"monospace",fontSize:16,fontWeight:800,letterSpacing:1,color:"#fff",marginBottom:14}}>
                  {meta.label} · {meta.freq} FM
                </p>
                <div style={{display:"flex",gap:10}}>
                  <button type="button" onClick={handleDismissMission} style={{
                    flex:1, padding:"11px 0", borderRadius:12,
                    background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.18)",
                    color:"rgba(255,255,255,0.7)", fontFamily:"monospace", fontSize:12, letterSpacing:1.5, cursor:"pointer",
                  }}>RECUSAR</button>
                  <button type="button" onClick={handleAcceptMission} style={{
                    flex:1, padding:"11px 0", borderRadius:12,
                    background:`${meta.color}22`, border:`1.5px solid ${meta.color}`,
                    color:meta.color, fontFamily:"monospace", fontWeight:700, fontSize:12, letterSpacing:1.5, cursor:"pointer",
                  }}>ACEITAR</button>
                </div>
              </>
            ) : (
              <>
                <p style={{fontFamily:"monospace",fontSize:13,fontWeight:700,letterSpacing:1,color:"#9aa0aa",marginBottom:8}}>
                  NENHUM SINAL NOVO AINDA
                </p>
                <p style={{fontFamily:"monospace",fontSize:10,letterSpacing:0.5,color:"rgba(255,255,255,0.4)",marginBottom:14}}>
                  continue a experiência pra liberar a próxima frequência
                </p>
                <button type="button" onClick={handleDismissMission} style={{
                  width:"100%", padding:"11px 0", borderRadius:12,
                  background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)",
                  color:"#fff", fontFamily:"monospace", fontWeight:700, fontSize:12, letterSpacing:1.5, cursor:"pointer",
                }}>CONTINUAR</button>
              </>
            )}
          </div>
        </div>
        )
      })()}

      {/* CONTROLES DE DIREÇÃO — fixos no fundo */}
      {!phoneOpen&&(
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          height:BOTOES_H_PCT,zIndex:50,
          display:"flex",alignItems:"center",
          justifyContent:"space-between",
          padding:"0 20px",
          background:"linear-gradient(to top, #05001a, transparent)",
        }}>
          <div style={{display:"flex",gap:12}}>
            <button
              onTouchStart={()=>leftRef.current=true}  onTouchEnd={()=>leftRef.current=false}
              onMouseDown={()=>leftRef.current=true}    onMouseUp={()=>leftRef.current=false}
              style={ctrlBtn()}
            >◀</button>
            <button
              onTouchStart={()=>rightRef.current=true} onTouchEnd={()=>rightRef.current=false}
              onMouseDown={()=>rightRef.current=true}  onMouseUp={()=>rightRef.current=false}
              style={ctrlBtn()}
            >▶</button>
          </div>
          <button
            onTouchStart={()=>accelRef.current=true}  onTouchEnd={()=>accelRef.current=false}
            onMouseDown={()=>accelRef.current=true}   onMouseUp={()=>accelRef.current=false}
            style={{
              width:76,height:76,borderRadius:"50%",
              background:`radial-gradient(circle,${C.neonPink}33,${C.neonPink}11)`,
              border:`3px solid ${C.neonPink}`,
              color:C.neonPink,fontSize:26,
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:`0 0 20px ${C.neonPink}55`,
              WebkitTapHighlightColor:"transparent",
              cursor:"pointer",
            }}
          >▲</button>
        </div>
      )}
    </div>
  )
}

function ctrlBtn(): React.CSSProperties {
  return {
    width:64,height:64,borderRadius:"50%",
    background:"rgba(255,107,53,0.15)",
    border:"2px solid #ff6b35aa",
    color:"#ff6b35",fontSize:22,
    display:"flex",alignItems:"center",justifyContent:"center",
    WebkitTapHighlightColor:"transparent",
    cursor:"pointer",
  }
}

function radioBtn(primary=false): React.CSSProperties {
  return {
    width: primary?46:36, height: primary?46:36,
    borderRadius:"50%",
    background: primary?"rgba(255,107,53,0.22)":"rgba(255,107,53,0.08)",
    border: `1.5px solid ${primary?"#ff6b35bb":"#ff6b3566"}`,
    color:"#ff6b35",
    display:"flex",alignItems:"center",justifyContent:"center",
    boxShadow: primary?"0 0 12px #ff6b3544":"none",
    WebkitTapHighlightColor:"transparent",
    cursor:"pointer",
    transition:"transform .12s",
  }
}

// ── SPRITE ──
// tipo é genérico ("post"/"sign"/...) mas o DESENHO muda por cenário — o mesmo
// slot da pista vira poste de néon quebrado (Subúrbio), poste neon vívido
// (Cidade Neon) ou poste solar/eólico sem néon (Helix)
function drawSprite(ctx:CanvasRenderingContext2D,x:number,y:number,scale:number,type:string,scenario:Scenario,pal:Palette){
  const h=Math.max(8,scale*8000)
  ctx.save(); ctx.translate(x,y)
  switch(type){
    case"palm":{
      ctx.fillStyle="#6b3a10"; ctx.fillRect(-h*0.04,-h,h*0.08,h)
      for(let a=0;a<6;a++){
        ctx.save(); ctx.translate(0,-h); ctx.rotate((a/6)*Math.PI*2)
        ctx.fillStyle=["#2d8b22","#3acd32","#1a6b14"][a%3]
        ctx.beginPath(); ctx.ellipse(h*0.32,0,h*0.36,h*0.055,0.3,0,Math.PI*2); ctx.fill()
        ctx.restore()
      }
      break
    }
    case"building":{
      const bw=h*0.55
      ctx.fillStyle=pal.buildingBase; ctx.fillRect(-bw/2,-h,bw,h)
      for(let wy=h*0.08;wy<h*0.9;wy+=h*0.1)
        for(let wx=bw*0.1;wx<bw*0.9;wx+=bw*0.22){
          ctx.fillStyle=pal.windowColors[(wy+wx)%pal.windowColors.length]
          ctx.fillRect(-bw/2+wx,-h+wy,bw*0.14,h*0.07)
        }
      break
    }
    case"post":{
      if (scenario === "helix") {
        // poste solar/eólico — sem néon, conduíte de energia brilhando
        ctx.fillStyle="#6a7880"; ctx.fillRect(-h*0.03,-h,h*0.06,h)
        ctx.shadowColor=pal.neonA; ctx.shadowBlur=h*0.12
        ctx.strokeStyle=pal.neonA; ctx.lineWidth=h*0.02
        ctx.beginPath(); ctx.moveTo(0,-h*0.05); ctx.lineTo(0,-h*0.9); ctx.stroke()
        ctx.shadowBlur=0
        // painel solar inclinado no topo
        ctx.save(); ctx.translate(0,-h); ctx.rotate(-0.3)
        ctx.fillStyle="#1c3a52"; ctx.fillRect(-h*0.14,-h*0.03,h*0.28,h*0.09)
        ctx.strokeStyle="#3d6a8a"; ctx.lineWidth=h*0.006
        ctx.strokeRect(-h*0.14,-h*0.03,h*0.28,h*0.09)
        ctx.restore()
      } else if (scenario === "suburbio") {
        // poste quebrado — luz fraca, cintilante, parte apagada
        const broken = Math.abs(Math.round(x/30))%3===0
        ctx.fillStyle="#3a352d"; ctx.fillRect(-h*0.025,-h,h*0.05,h*(broken?0.7:1))
        ctx.fillStyle="#3a352d"; ctx.fillRect(-h*0.025,-h*(broken?0.7:1),h*0.16,h*0.025)
        if (!broken) {
          const flicker = 0.35 + Math.abs(Math.sin(x*0.7))*0.35
          ctx.shadowColor=pal.neonA; ctx.shadowBlur=h*0.14*flicker
          ctx.fillStyle=pal.neonA; ctx.globalAlpha=flicker
          ctx.beginPath(); ctx.arc(h*0.16,-h,h*0.045,0,Math.PI*2); ctx.fill()
          ctx.globalAlpha=1; ctx.shadowBlur=0
        }
      } else {
        // Cidade Neon — poste de néon vívido (cores do cenário, halo duplo)
        const lc = [pal.neonA,pal.neonB,pal.neonC][Math.abs(Math.round(x/30))%3]
        ctx.fillStyle="#555"; ctx.fillRect(-h*0.025,-h,h*0.05,h)
        ctx.fillStyle="#555"; ctx.fillRect(-h*0.025,-h,h*0.18,h*0.025)
        ctx.shadowColor=lc; ctx.shadowBlur=h*0.26
        ctx.fillStyle=lc
        ctx.beginPath(); ctx.arc(h*0.18,-h,h*0.06,0,Math.PI*2); ctx.fill()
        ctx.shadowBlur=h*0.45
        ctx.globalAlpha=0.4
        ctx.beginPath(); ctx.arc(h*0.18,-h,h*0.15,0,Math.PI*2); ctx.fill()
        ctx.globalAlpha=1; ctx.shadowBlur=0
      }
      break
    }
    case"sign":{
      if (scenario === "helix") {
        // placa solar/informativa limpa — sem néon, texto discreto sobre painel claro
        ctx.fillStyle="#556670"; ctx.fillRect(-h*0.03,-h*0.43,h*0.06,h*0.43)
        ctx.fillStyle="#e8f4ff"; ctx.strokeStyle="#9fc4d8"; ctx.lineWidth=h*0.02
        ctx.beginPath()
        ctx.roundRect(-h*0.30,-h*0.75,h*0.60,h*0.34,h*0.04)
        ctx.fill(); ctx.stroke()
        ctx.fillStyle="#1c3a52"; ctx.font=`bold ${h*0.10}px monospace`
        ctx.textAlign="center"; ctx.fillText("@lu2ca.art",0,-h*0.52)
      } else if (scenario === "suburbio") {
        // placa destruída/estática — rachada, néon quase morto
        ctx.fillStyle="#3a352d"; ctx.fillRect(-h*0.03,-h*0.40,h*0.06,h*0.40)
        ctx.shadowColor=pal.neonA; ctx.shadowBlur=h*0.06
        ctx.fillStyle="#0e0c0a"; ctx.strokeStyle=pal.neonA; ctx.lineWidth=h*0.018
        ctx.beginPath()
        ctx.roundRect(-h*0.28,-h*0.72,h*0.56,h*0.30,h*0.03)
        ctx.fill(); ctx.stroke()
        // rachadura
        ctx.beginPath(); ctx.moveTo(-h*0.10,-h*0.70); ctx.lineTo(h*0.02,-h*0.55); ctx.lineTo(-h*0.05,-h*0.45)
        ctx.strokeStyle="#000"; ctx.lineWidth=h*0.012; ctx.stroke()
        ctx.shadowBlur=0
        ctx.fillStyle=pal.neonA+"aa"; ctx.font=`bold ${h*0.09}px monospace`
        ctx.textAlign="center"; ctx.fillText("SINAL FRACO",0,-h*0.50)
      } else {
        // Cidade Neon — placa vívida, publicidade em toda parte
        ctx.fillStyle="#555"; ctx.fillRect(-h*0.03,-h*0.43,h*0.06,h*0.43)
        ctx.shadowColor=pal.neonA; ctx.shadowBlur=h*0.2
        ctx.fillStyle="#1a0033"; ctx.strokeStyle=pal.neonA; ctx.lineWidth=h*0.025
        ctx.beginPath()
        ctx.roundRect(-h*0.30,-h*0.75,h*0.60,h*0.34,h*0.04)
        ctx.fill(); ctx.stroke()
        ctx.shadowBlur=0
        ctx.fillStyle=pal.neonA; ctx.font=`bold ${h*0.11}px monospace`
        ctx.textAlign="center"; ctx.fillText("@lu2ca.art",0,-h*0.52)
      }
      break
    }
  }
  ctx.restore()
}

// ── DASHBOARD ──
function drawDashboard(
  ctx:CanvasRenderingContext2D,
  W:number,H:number,DH:number,BOTOES_H:number,
  kmh:number,rpm:number,zone:string,curve:number,
  trackName:string,playing:boolean
){
  const y0=H-DH-BOTOES_H

  // fundo
  const g=ctx.createLinearGradient(0,y0,0,H-BOTOES_H)
  g.addColorStop(0,"#07001a"); g.addColorStop(1,"#0e0030")
  ctx.fillStyle=g; ctx.fillRect(0,y0,W,DH)

  // borda superior neon
  ctx.strokeStyle=C.neonOrange; ctx.lineWidth=2.5
  ctx.shadowColor=C.neonOrange; ctx.shadowBlur=10
  ctx.beginPath(); ctx.moveTo(0,y0); ctx.lineTo(W,y0); ctx.stroke()
  ctx.shadowBlur=0

  // gauges empurrados pras bordas — o rádio agora ocupa 80% do painel no centro
  const R = Math.min(DH*0.26, W*0.10)
  const cy = y0 + DH*0.62

  // velocímetro esq (max 222)
  gauge(ctx,W*0.09,cy,R,kmh,222,"#00ff88","#ffcc00","#ff2d78",`${kmh}`,"KM/H")
  // rpm dir
  gauge(ctx,W*0.91,cy,R,rpm,8,"#cc00ff","#ff6b35","#ff2d78",`${rpm}`,"RPM")

  // (o RÁDIO agora é um visor HTML sobreposto ao centro do painel — ver JSX.
  //  o canvas desenha só os mostradores e a zona.)

  // zona
  ctx.fillStyle="#ffffff33"; ctx.font=`${DH*0.09}px monospace`
  ctx.textAlign="center"; ctx.fillText(zone,W/2,y0+DH*0.95)
}

function gauge(
  ctx:CanvasRenderingContext2D,
  x:number,y:number,r:number,
  val:number,max:number,
  c1:string,c2:string,c3:string,
  display:string,label:string
){
  const start=Math.PI*0.75, sweep=Math.PI*1.5
  const pct=Math.min(val/max,1)
  const angle=pct*sweep
  // fundo
  ctx.strokeStyle="#1a0040"; ctx.lineWidth=r*0.17
  ctx.beginPath(); ctx.arc(x,y,r,start,start+sweep); ctx.stroke()
  // arco
  ctx.strokeStyle=pct<0.5?c1:pct<0.8?c2:c3
  ctx.lineWidth=r*0.17
  ctx.shadowColor=pct<0.5?c1:c2; ctx.shadowBlur=7
  ctx.beginPath(); ctx.arc(x,y,r,start,start+angle); ctx.stroke()
  ctx.shadowBlur=0
  // agulha
  const na=start+angle
  ctx.strokeStyle="#fff"; ctx.lineWidth=1.5
  ctx.beginPath(); ctx.moveTo(x,y)
  ctx.lineTo(x+Math.cos(na)*r*0.76,y+Math.sin(na)*r*0.76); ctx.stroke()
  ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(x,y,r*0.07,0,Math.PI*2); ctx.fill()
  // texto
  ctx.fillStyle="#fff"; ctx.font=`bold ${r*0.34}px monospace`; ctx.textAlign="center"
  ctx.fillText(display,x,y+r*0.14)
  ctx.fillStyle="#ffffff66"; ctx.font=`${r*0.16}px monospace`
  ctx.fillText(label,x,y+r*0.35)
}

function rRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}
