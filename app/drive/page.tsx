"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useAudioPlayer, getAudioEl } from "@/app/providers/AudioPlayerProvider"
import { useGameFunnel } from "@/app/providers/GameFunnelProvider"
import type { BridgeCommand, BridgeState, PhoneNotification, MinimizeConsole, SelectRadioTier, CarRadioControl } from "@/app/providers/AudioBridge"
import { sendStateToIframe, sendNotificationClickToIframe, sendCarRadioState } from "@/app/providers/AudioBridge"
import SteeringWheel3D from "@/components/SteeringWheel3D"
import { CityMapButton, CityMapModal } from "@/components/CityMap"
import { AppIcon } from "@/components/AppIcon"
import { type Tier, ALL_TIERS, TIER_META } from "@/lib/radio-tiers"
import { SCRIPTS, PREVIEW_SUMMARY, phaseFor, type MemberKey } from "@/app/n3xo/privado/[member]/page"

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

// Sintonia manual (dial) — espectro de frequências reais das 4 estações
// (69.9 a 222.4 FM), usado pra posicionar o ponteiro e as marcações no dial
const FREQ_MIN = 69.9
const FREQ_MAX = 222.4
const FREQ_TOLERANCE = 6 // "passar pela frequência certinha" — janela de acerto em torno de cada marcação
function freqOf(tier: Tier): number { return parseFloat(TIER_META[tier].freq) }
function pctForFreq(freq: number): number { return Math.min(1, Math.max(0, (freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN))) }

// Faixa da rádio: title já vem no formato mascarado (com asteriscos), como o
// resto do jogo. Cada faixa carrega sua própria estação/cor e um "tier" — a
// frequência é sempre anunciada/liberada ANTES da missão que a segue (vira o
// gancho pra próxima etapa), exceto a CIDADE NEON 222.4 FM, que só entra no ar
// no fim de toda a experiência (unlocked.finalCompleted), somando-se ao que já
// toca na LIVE NEON.
type RadioTrack = { title: string; src: string; freq: string; color: string; label: string; tier: Tier }

const F = TIER_META

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
// Deriva a estação sintonizada por último a partir do que já foi SINTONIZADO
// (persistido no funil) — evita que reentrar em /drive (remount) perca a
// seleção da pessoa, e retorna null se nada foi sintonizado ainda (rádio de
// verdade: sem nada sintonizado, não tem o que tocar)
function highestAcceptedTier(accepted: Record<Tier, boolean>): Tier | null {
  for (let i = ALL_TIERS.length - 1; i >= 0; i--) {
    if (accepted[ALL_TIERS[i]]) return ALL_TIERS[i]
  }
  return null
}

const ROAD_LEN  = 1600
const SEG_LEN   = 200
const DRAW_DIST = 100
const ROAD_W    = 2200
const CAM_H     = 1500
const CAM_DEPTH = 0.84
const TOTAL_LEN = ROAD_LEN * SEG_LEN

// ── MISSÕES no mapa — cada uma tem um contato/letra (estilo marcador de
// missão de GTA), a rota que abre no celular, em que confirmationCount ela
// aparece no mapa e conta como concluída, e a distância dirigida até
// "chegar no local" (odômetro, mesma unidade de TOTAL_LEN — a primeira é
// curta pra aprender a mecânica, as seguintes aumentam) ──
interface MissionDef {
  id: "nectar" | "batida" | "guitarDriver"
  letter: string
  name: string
  route: string
  visibleFromCC: number
  doneAtCC: number
  distance: number
}

const MISSIONS: MissionDef[] = [
  { id: "nectar",       letter: "A", name: "NECTAR",       route: "/nectar",     visibleFromCC: 0, doneAtCC: 1, distance: TOTAL_LEN * 0.15 },
  { id: "batida",       letter: "N", name: "B4TIDA",       route: "/batida",     visibleFromCC: 1, doneAtCC: 2, distance: TOTAL_LEN * 0.35 },
  { id: "guitarDriver", letter: "D", name: "GUITAR DRIVER",route: "/neon-tiles", visibleFromCC: 2, doneAtCC: 3, distance: TOTAL_LEN * 0.6 },
]

function activeMission(confirmationCount: number): MissionDef | undefined {
  return MISSIONS.find(m => m.doneAtCC > confirmationCount)
}

const MISSION_COLORS: Record<MissionDef["id"], string> = {
  nectar: "#a78bfa",
  batida: "#00e5ff",
  guitarDriver: "#ff2d78",
}

// ── HUB (estilo Apple CarPlay) — mesma ordem/dados do N3XO (app/n3xo/page.tsx)
// pra lista de mensagens recentes bater exatamente com o app de verdade ──
const HUB_MEMBER_ORDER: MemberKey[] = ["alohan", "nizzy", "dbee"]
const HUB_VISIBLE_FROM_CC: Record<MemberKey, number> = { alohan: 0, nizzy: 1, dbee: 2 }
const HUB_AVATARS: Record<MemberKey, { avatar: string; color: string }> = {
  alohan: { avatar: "A", color: "#4ECDC4" },
  nizzy: { avatar: "N", color: "#FF6B6B" },
  dbee: { avatar: "D", color: "#6B7FD7" },
}

// Apps clicáveis direto do HUB — não abre mais a tela inicial genérica do
// celular, só os apps específicos (cada um com sua rota). Miniatura do
// ícone de verdade do app (AppIcon), não uma letra inicial.
interface HubAppUnlockState { radioAnyAccepted: boolean; nectar: boolean; feelGood: boolean; guitarDriver: boolean }
interface HubApp { id: string; label: string; icon: string; color: string; route: string; external?: boolean; unlocked: (s: HubAppUnlockState) => boolean }

// Blocos grandes (estilo TikTok/Netflix da referência) — os 3 apps-jogo
const HUB_TILES: HubApp[] = [
  { id: "loop",   label: "//LOOP",       icon: "tiktok",       color: "#1a0010", route: "/tiktok/feed", unlocked: () => true },
  { id: "batida", label: "B4TIDA",       icon: "beatbuilder",  color: "#2a0505", route: "/batida",      unlocked: (s) => s.feelGood },
  { id: "guitar", label: "GUITAR DRIVER",icon: "guitardriver", color: "#1a0a00", route: "/neon-tiles",  unlocked: (s) => s.guitarDriver },
]

// Dock fino embaixo — utilitários + os apps externos do celular (YouTube/Instagram)
const HUB_APPS: HubApp[] = [
  { id: "sintonia",  label: "SINT0NIA",  icon: "tuner",     color: "#22ff88", route: "/sintonizador",       unlocked: (s) => s.radioAnyAccepted },
  { id: "n3xo",      label: "N3XO",      icon: "whatsapp",  color: "#00e5ff", route: "/n3xo",               unlocked: () => true },
  { id: "freq",      label: "FR3Q_",     icon: "heartbeat", color: "#1DB954", route: "/spotify/auto-chuva", unlocked: (s) => s.radioAnyAccepted },
  { id: "nectar",    label: "NECTAR",    icon: "nectar",    color: "#a78bfa", route: "/nectar",             unlocked: (s) => s.nectar },
  { id: "youtube",   label: "STR34M",    icon: "youtube",   color: "#FF0000", route: "https://www.youtube.com/@LU222CA", external: true, unlocked: () => true },
  { id: "instagram", label: "_IRIS.EXE", icon: "instagram", color: "#3B0764", route: "https://www.instagram.com/lu2ca.art?igsh=cDRrcGpndjJrdjJ6&utm_source=qr", external: true, unlocked: () => true },
]

interface Seg { curve: number; sprites: { x: number; type: string }[] }
interface Car  { seg: number; x: number; color: string }

function buildRoad(): Seg[] {
  const road: Seg[] = []
  // sempre reta -> curva -> reta, nunca duas curvas seguidas (pra poder
  // trocar de direção) — 3 intensidades (leve/moderada/acentuada) alternando
  // direita/esquerda. O cenário de fundo (paralaxe) segue essa mesma curva
  // (camCurve), então essa variedade também é o que dá o balanço visual dele
  const pattern = [
    {len:110,curve:0},   {len:130,curve:1.4},  // leve direita
    {len:110,curve:0},   {len:120,curve:-1.3}, // leve esquerda
    {len:110,curve:0},   {len:120,curve:2.6},  // moderada direita
    {len:100,curve:0},   {len:120,curve:-2.8}, // moderada esquerda
    {len:110,curve:0},   {len:100,curve:4.2},  // acentuada direita
    {len:110,curve:0},   {len:100,curve:-4.0}, // acentuada esquerda
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

const BOTOES_H_PX = 90 // altura fixa dos botões de direção, no fundo

// ── SISTEMA DE COORDENADAS — "quadrado 1080 que revela, não recorta" ──
// Blocking do interior definido em cima de um canvas de design quadrado
// (1080x1080, mas só a proporção importa) — vem de um documento de blocking
// preciso (zona por zona em %) que o usuário mediu de uma referência real.
// O quadrado se encaixa no MENOR lado da tela, grudado embaixo: tela mais
// larga que alta (paisagem) sobra largura → revela mais cenário nas laterais;
// tela mais alta que larga (retrato) sobra altura → revela mais céu em cima.
// Nunca corta o interior, só o cenário ganha mais quadro ao redor. Isso
// substitui o DASH_FRACTION/wheelSizePx/WHEEL_CX_PCT soltos que existiam
// antes (cada elemento com sua própria conta ad-hoc).
function squarePx(W: number, H: number): number {
  return Math.min(W, H)
}
function squareLeftPx(W: number, H: number): number {
  return (W - squarePx(W, H)) / 2
}
function squareTopPx(W: number, H: number): number {
  return H - squarePx(W, H)
}

interface Zone { x: number; y: number; w: number; h: number }

// Ordem = profundidade do documento de blocking (z1 mais ao fundo, maior
// mais perto da câmera) — a ordem de declaração aqui bate com a ordem de
// desenho no canvas e de declaração no JSX (depois = mais na frente). z8
// (banco/assento, 12 artefatos) fica de fora de propósito — fora de escopo
// por enquanto, não é buraco por engano.
// Painel comprimido pra 65% da altura do quadrado (era 82.5%, de y:17.5 até
// y:100) e empurrado pra baixo, começando só depois do novo para-brisa maior
// (h:35, era h:20) — pedido do usuário pra ver mais estrada por enquanto,
// sem terceira pessoa do carro. Mesma config/proporção relativa dos itens
// entre si, só reescalada (fator 0.787879 = 65/82.5) e deslocada.
//
// Para-brisa cresceu de novo (35 → 40) pra caber o sistema de profundidade
// em camadas (céu/sol fixo, prédios/palmeiras em paralaxe lento, pista
// rápida) com mais respiro vertical — o painel foi reescalado mais uma vez
// pra caber no que sobrou (fator 0.923077 = 60/65), mesma técnica de antes:
// todo mundo comprime proporcionalmente a partir do novo limite do
// para-brisa, sem mudar posição relativa de nada no eixo x.
// Reespaçado (era tudo comprimido quase sem vão nenhum entre as caixas —
// o HUB terminava a 0.5% do início do rádio, o rádio a 1.8% do início do
// DJ deck) — agora todo mundo tem um respiro de verdade entre si (~1.5-2.2%
// do quadrado) em vez de quase se tocar. cluster/volante também deixaram
// de se sobrepor de propósito (o volante "por cima" do cluster) e passam
// a ter sua própria faixa, mais fácil de ler como duas coisas separadas.
const ZONES = {
  windshield:    { x:0,    y:0,       w:100,  h:40      }, // z1  exterior
  cluster:       { x:3.5,  y:41.5,    w:30.5, h:4.708   }, // z2  painel
  centerConsole: { x:37.5, y:58.285,  w:35,   h:13.108  }, // z3  painel
  crt:           { x:35.5, y:41.5,    w:38.5, h:14.585  }, // z4  interativo
  gloveBox:      { x:79.5, y:41.5,    w:18,   h:18.185  }, // z5  interativo
  // z7 (mapa solto no canto) removido — o mini-mapa agora mora dentro do
  // HUB (zona crt), estilo Apple CarPlay, não é mais um widget separado
  wheel:         { x:7,    y:47.708,  w:24.5, h:14.585  }, // z9  painel
  djDeck:        { x:41.5, y:72.208,  w:24.5, h:22.892  }, // z10 interativo
  radio:         { x:38.5, y:58.285,  w:33.5, h:11.723  }, // z11 interativo — cresceu pra caber power/estações/volume dentro dela
  // z8 (banco/assento) — motorista/passageiro-placeholder tentados e
  // removidos (ficou bizarro); fora de escopo de novo por enquanto
} satisfies Record<string, Zone>

// Zona -> px absolutos, dado o W/H reais da tela (canvas.width/height no
// loop imperativo, ou o estado `viewport` no JSX — mesma conta nos dois)
function zonePx(zone: Zone, W: number, H: number) {
  const s = squarePx(W, H), left = squareLeftPx(W, H), top = squareTopPx(W, H)
  return { x: left + zone.x / 100 * s, y: top + zone.y / 100 * s, w: zone.w / 100 * s, h: zone.h / 100 * s }
}

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

  // piloto automático — o carro acelera e desvia do tráfego sozinho, pra dar
  // pra usar o console/celular maximizado enquanto "dirige" sem precisar
  // segurar acelerador/direção o tempo todo
  const [autoDrive, setAutoDrive] = useState(false)
  const autoDriveRef = useRef(false)
  useEffect(() => { autoDriveRef.current = autoDrive }, [autoDrive])

  const [phoneOpen, setPhoneOpen]   = useState(false)
  // lido dentro do loop imperativo do canvas (frame()), sem precisar
  // reiniciar o efeito do canvas a cada abre/fecha do celular
  const phoneOpenRef = useRef(phoneOpen)
  useEffect(() => { phoneOpenRef.current = phoneOpen }, [phoneOpen])
  // celular aberto ocupa menos tela em telas estreitas (mobile) — em desktop
  // segue grande, já que sobra espaço em volta
  const [isMobile, setIsMobile] = useState(false)
  // fonte única de verdade pro loop imperativo do canvas — antes o canvas
  // recalculava "é mobile?" sozinho a partir de canvas.width < 640 (limite
  // exclusivo), enquanto o JSX usava matchMedia (max-width:640px, inclusivo);
  // em exatamente 640px os dois discordavam e o painel/gauges desalinhavam
  // da barra de controles em HTML
  const isMobileRef = useRef(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const update = () => { setIsMobile(mq.matches); isMobileRef.current = mq.matches }
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  const stageRef  = useRef<HTMLDivElement>(null)
  // W/H reais do stage (o MESMO elemento que o canvas usa pra si mesmo —
  // stage.clientWidth/Height, via 100dvh), usados pra converter as zonas do
  // blocking (ZONES, em %) em px de verdade nos overlays HTML (zonePx).
  // Antes lia window.innerWidth/innerHeight direto, que diverge do "100dvh"
  // de verdade em mobile (a barra de endereço do Safari aparece/some,
  // mudando a altura visível sem que os dois sempre concordem) — isso
  // fazia os overlays em HTML (volante, rádio, HUB etc., todos via zonePx)
  // ficarem desalinhados do quadrado que o canvas de fato desenha, só
  // visível em telas de celular de verdade (nunca no desktop)
  const [viewport, setViewport] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => setViewport({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
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
  // ── RÁDIO do painel: rádio de verdade, moda antiga — só toca a estação que
  // a pessoa sintonizou e deixou selecionada, nunca troca ou pula sozinha.
  // Sintonizar (SINT0NIA) é o que libera uma estação pra sempre; a partir daí
  // ela fica selecionável aqui a qualquer momento, sem precisar sintonizar de
  // novo — só ligar o power. Só uma estação toca por vez: selecionar outra
  // troca na hora (mesmo elemento de áudio, então nunca toca duas juntas).
  const [zoneName, setZoneName]     = useState("SUBÚRBIO XÊNON") // guardado p/ o cenário visual (Fase B)
  const [radioIdx, setRadioIdx]     = useState(0)
  const [snippetPct, setSnippetPct] = useState(0)
  // maquina da radio: toca a frequencia inteira 1x -> chia -> ESTACIONA (chega
  // a missao, aceita ou recusa) -> se recusar/nao houver nada novo, volta a
  // dirigir com o radio em silencio ate rodar a cidade inteira de novo
  const [radioMachine, setRadioMachine] = useState<"playing" | "static" | "parked" | "silentLap">("playing")
  // estação selecionada pra tocar — null só antes de sintonizar a primeira
  // (nada pra tocar ainda). Persiste entre power on/off e nunca troca sozinha.
  const [manualTier, setManualTier] = useState<Tier | null>(() => highestAcceptedTier(funnel.state.radioAccepted))
  // a rádio começa DESLIGADA — só passa a tocar/ciclar frequências depois que
  // a pessoa aperta o power. Enquanto desligada, nada progride (sem missão
  // chegando), igual a um rádio de verdade
  const [radioOn, setRadioOn] = useState(false)
  // shuffle geral: alterna uma faixa de cada frequência já sintonizada (em
  // vez de tocar só a frequência selecionada em sequência) — manualTier
  // acompanha a faixa tocando, então cor/estação exibida sempre bate com o
  // que está no ar. Selecionar uma frequência manualmente desliga isso.
  const [shuffleMode, setShuffleMode] = useState(false)
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
  const radioAccepted   = funnel.state.radioAccepted
  // refs sempre com o valor mais recente, lidos dentro do ciclo assincrono e
  // do loop imperativo do canvas, sem precisar reiniciar efeitos a cada render
  const confirmCountRef   = useRef(confirmCount)
  const radioMachineRef   = useRef(radioMachine)
  const silentLapDistRef  = useRef(0)
  // distância dirigida em direção à missão ativa (odômetro) — zera quando
  // recusa e precisa dar a volta inteira antes de oferecer de novo
  const missionDistRef    = useRef(0)
  useEffect(() => { confirmCountRef.current = confirmCount }, [confirmCount])
  useEffect(() => { radioMachineRef.current = radioMachine }, [radioMachine])
  const resumeAfterLapRef = useRef(() => { missionDistRef.current = 0; setRadioMachine("playing") })

  // toda vez que uma NOVA frequência é sintonizada no SINT0NIA (radioAccepted
  // ganha uma entrada true que não tinha antes), ela já fica selecionada e
  // tocando na hora — sem isso, sintonizar uma 2ª/3ª/4ª estação não tinha
  // efeito nenhum no rádio do carro: o manualTier só era setado automaticamente
  // na 1ª sintonia (guard "manualTier !== null"), então dali em diante era
  // preciso achar sozinho o seletor de estação escondido embaixo do console
  // pra trocar — o usuário via a rádio "ligada no sintonia" mas sem tocar nem
  // reagir a nada
  const prevRadioAcceptedRef = useRef(radioAccepted)
  useEffect(() => {
    const prev = prevRadioAcceptedRef.current
    const justTuned = ALL_TIERS.find((t) => radioAccepted[t] && !prev[t])
    prevRadioAcceptedRef.current = radioAccepted
    if (justTuned) {
      setManualTier(justTuned)
      setRadioOn(true)
    } else if (manualTier === null) {
      const first = highestAcceptedTier(radioAccepted)
      if (first) setManualTier(first)
    }
  }, [radioAccepted, manualTier])

  const activeTier     = manualTier ?? "suburbio"
  const activeTracks   = TRACKS_BY_TIER[activeTier]
  const radioTrack     = activeTracks.length ? activeTracks[radioIdx % activeTracks.length] : null
  // só toca se tiver uma estação de fato sintonizada e selecionada — sem
  // isso, ligar o power sem nada sintonizado tocaria a 1ª faixa de
  // "suburbio" mesmo sem ela ter sido liberada ainda. A sintonia continua
  // tocando com o celular aberto (SINT0NIA é extensão do rádio, não motivo
  // pra silenciar) — só os apps com som próprio que realmente colidem
  // (GUITAR DRIVER, B4TIDA, //LOOP) mutam via CAR_RADIO_MUTE
  const [radioMuted, setRadioMuted] = useState(false)
  const radioActive    = radioOn && radioMachine === "playing" && !radioMuted && manualTier !== null
  // progresso de distância até a missão ativa (0..1) — só pro mini-mapa
  // (CityMap) mostrar o indicador de posição; atualizado por polling leve,
  // não precisa de precisão de frame
  const [missionProgress, setMissionProgress] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      const mission = activeMission(confirmCountRef.current)
      const p = mission ? Math.min(missionDistRef.current / mission.distance, 1) : 0
      setMissionProgress(p)
    }, 250)
    return () => clearInterval(id)
  }, [])
  // cenário visual do mundo (fora do painel) — segue o activeTier, lido pelo
  // loop imperativo do canvas via ref (o efeito do canvas só roda 1x)
  const activeTierRef = useRef<Tier>(activeTier)
  useEffect(() => { activeTierRef.current = activeTier }, [activeTier])
  const scenarioRef    = useRef<Scenario>(scenarioForTier(activeTier))
  const transitionRef  = useRef<{ start: number; duration: number } | null>(null)
  const matrixColsRef  = useRef<{ x: number; y: number; speed: number; len: number }[]>([])
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
      const data = e.data as BridgeCommand | PhoneNotification | MinimizeConsole | SelectRadioTier | CarRadioControl
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
        case "MINIMIZE_CONSOLE": setPhoneOpen(false); break
        case "SELECT_RADIO_TIER":
          setManualTier(data.tier)
          setRadioOn(true)
          break
        case "PHONE_NOTIFICATION": {
          const { id, app, icon, color, title, body, isMission } = data
          setPhoneNotif({ id, app, icon, color, title, body, isMission })
          if (phoneNotifTimeoutRef.current) clearTimeout(phoneNotifTimeoutRef.current)
          // "aceitar missão" não some sozinha — fica até a pessoa aceitar
          // (botão na própria ilha) ou a missão ser resolvida de outra forma
          if (!isMission) {
            phoneNotifTimeoutRef.current = setTimeout(() => setPhoneNotif(null), 5000)
          }
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

  // Ecoa o estado do rádio do carro pro celular (SINT0NIA mostra um "tocando
  // agora" sincronizado de verdade, na cor da frequência atual) — continua
  // "tocando" (visualmente) mesmo com o celular aberto/rádio mudo, porque a
  // sintonia em si não pausa só porque a pessoa está no celular
  useEffect(() => {
    const tuned = radioOn && radioMachine === "playing" && manualTier !== null
    sendCarRadioState(iframeRef.current, {
      tier: activeTier,
      label: F[activeTier].label,
      color: F[activeTier].color,
      title: radioTrack?.title ?? "",
      elapsedMs: snippetPct * RADIO_SNIPPET_MS,
      durationMs: RADIO_SNIPPET_MS,
      playing: tuned,
    })
  }, [activeTier, radioTrack, snippetPct, radioOn, radioMachine, manualTier])

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

  // ── ESTAÇÃO SELECIONADA: toca em loop a frequência escolhida, numa ordem
  // embaralhada (Fisher-Yates) a cada vez que liga/troca de frequência e a
  // cada volta completa — assim não começa sempre pela mesma faixa nem
  // repete sempre a mesma sequência. Não roda enquanto o shuffle geral
  // (entre frequências) está ativo — quem cuida da troca de faixa nesse
  // caso é o efeito de SHUFFLE GERAL logo abaixo ──
  useEffect(() => {
    if (!manualTier) return
    if (!radioOn) return
    if (shuffleMode) return
    let cancelled = false
    const intervals: ReturnType<typeof setInterval>[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const tracks = TRACKS_BY_TIER[manualTier]

    const shuffledOrder = () => {
      const order = tracks.map((_, i) => i)
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      return order
    }

    const stepThrough = (pos: number, order: number[]) => {
      if (cancelled) return
      setRadioMachine("playing")
      setRadioIdx(order[pos])
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
        if (pos < order.length - 1) { stepThrough(pos + 1, order); return }
        setRadioMachine("static")
        playStaticBurst()
        const t1 = setTimeout(() => { if (!cancelled) stepThrough(0, shuffledOrder()) }, 900)
        timeouts.push(t1)
      }, RADIO_SNIPPET_MS)
      timeouts.push(to)
    }
    stepThrough(0, shuffledOrder())

    return () => { cancelled = true; intervals.forEach(clearInterval); timeouts.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualTier, radioOn, playStaticBurst, shuffleMode])

  // ── SHUFFLE GERAL: alterna entre as frequências já sintonizadas em ordem
  // embaralhada (não sempre a mesma primeiro) — cada passo também troca o
  // manualTier, então a cor/estação mostrada no rádio sempre bate com a
  // faixa que está tocando. Reembaralha a cada volta completa, igual ao
  // shuffle dentro de cada frequência ──
  useEffect(() => {
    if (!shuffleMode) return
    if (!radioOn) return
    const tunedTiers = ALL_TIERS.filter((t) => radioAccepted[t])
    if (tunedTiers.length === 0) { setShuffleMode(false); return }
    let cancelled = false
    const intervals: ReturnType<typeof setInterval>[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const shuffledTiers = () => {
      const order = [...tunedTiers]
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
      return order
    }

    const stepQueue = (pos: number, order: Tier[]) => {
      if (cancelled) return
      const tier = order[pos]
      const tracks = TRACKS_BY_TIER[tier]
      const idx = tracks.length ? Math.floor(Math.random() * tracks.length) : 0
      setRadioMachine("playing")
      setManualTier(tier)
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
        if (pos < order.length - 1) { stepQueue(pos + 1, order); return }
        stepQueue(0, shuffledTiers())
      }, RADIO_SNIPPET_MS)
      timeouts.push(to)
    }
    stepQueue(0, shuffledTiers())

    return () => { cancelled = true; intervals.forEach(clearInterval); timeouts.forEach(clearTimeout) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleMode, radioOn, radioAccepted])

  // avança manualTier para a próxima frequência já desbloqueada, em loop —
  // não mexe em radioOn nem no shuffle geral (desliga-o, pra não brigar
  // sobre quem escolhe a frequência)
  const nextTier = useCallback(() => {
    const tunedTiers = ALL_TIERS.filter((t) => radioAccepted[t])
    if (tunedTiers.length === 0) return
    setShuffleMode(false)
    setManualTier((prev) => {
      const cur = prev ?? tunedTiers[0]
      const i = tunedTiers.indexOf(cur)
      return tunedTiers[(i + 1) % tunedTiers.length]
    })
    setRadioOn(true)
  }, [radioAccepted])

  const toggleShuffle = useCallback(() => {
    setShuffleMode((m) => !m)
    setRadioOn(true)
  }, [])

  // ── SINTONIA MANUAL (dial): as bolinhas continuam sendo atalhos que
  // pulam direto pra frequência exata, mas agora também dá pra arrastar um
  // ponteiro pelo espectro — só toca quando ele passa bem em cima da
  // frequência de uma estação já desbloqueada (tolerância), como um rádio
  // analógico de verdade; nas outras posições fica em silêncio/estática, e
  // todas as frequências continuam sintonizáveis a qualquer momento ──
  const [tunerPct, setTunerPct] = useState(() => pctForFreq(freqOf(activeTier)))
  const tunerDraggingRef = useRef(false)
  const tunerTrackRef = useRef<HTMLDivElement>(null)
  // segue a estação selecionada por qualquer outro caminho (bolinhas,
  // próxima rádio, shuffle) sempre que não está sendo arrastado à mão
  useEffect(() => {
    if (!tunerDraggingRef.current) setTunerPct(pctForFreq(freqOf(activeTier)))
  }, [activeTier])
  const updateTunerFromPointer = useCallback((clientX: number) => {
    const el = tunerTrackRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setTunerPct(pct)
    const freq = FREQ_MIN + pct * (FREQ_MAX - FREQ_MIN)
    let nearest: Tier | null = null
    let nearestDist = Infinity
    for (const t of ALL_TIERS) {
      const d = Math.abs(freq - freqOf(t))
      if (d < nearestDist) { nearestDist = d; nearest = t }
    }
    if (nearest && nearestDist <= FREQ_TOLERANCE && radioAccepted[nearest] && (nearest !== manualTier || shuffleMode)) {
      setShuffleMode(false)
      setManualTier(nearest)
      setRadioOn(true)
    }
  }, [radioAccepted, manualTier, shuffleMode])


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

  // ── ESCUTA ACUMULADA POR FREQUÊNCIA — soma tempo real com o rádio de
  // verdade tocando aquele tier (radioActive, não só sintonizado), pra
  // segurar a mensagem da próxima missão até a pessoa realmente aproveitar
  // a rádio nova por um tempo (>=45s ~ 2 faixas) em vez de já chegar assim
  // que ela aperta sintonizar (ver app/page.tsx getMissions()) ──
  useEffect(() => {
    if (!radioActive) return
    const tier = activeTierRef.current
    const id = setInterval(() => {
      funnel.setState((prev) => ({
        ...prev,
        radioListenedMs: { ...prev.radioListenedMs, [tier]: (prev.radioListenedMs[tier] ?? 0) + 2000 },
      }))
    }, 2000)
    return () => clearInterval(id)
  }, [radioActive, activeTier, funnel.setState])

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
    // JOGO_H    = altura do para-brisa (zona windshield do blocking, dentro
    //             do quadrado de design) — o resto até BOTOES_H é o painel
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
      // JOGO_H = do topo da tela até o fim da zona windshield (dentro do
      // quadrado de design) — squareTopPx já é 0 em telas panorâmicas
      // (quadrado limitado pela altura) e >0 em telas em retrato (revela
      // mais céu acima do quadrado)
      const JOGO_H  = squareTopPx(W, H) + ZONES.windshield.h / 100 * squarePx(W, H)
      // barra inferior um pouco mais alta em telas estreitas de celular —
      // dá espaço extra pros botões maiores/toque e cadência com o safe-area
      // somado no HTML (ver BOTOES_H_PCT no JSX). Usa isMobileRef (mesma
      // fonte do JSX) em vez de recalcular por canvas.width, pra nunca
      // discordar do valor usado pela barra de controles em HTML
      const BOTOES_H_NOW = isMobileRef.current ? BOTOES_H + 14 : BOTOES_H
      const DASH_H  = H - JOGO_H - BOTOES_H_NOW

      // ── Física natural ──
      const parked = radioMachineRef.current === "parked"
      const auto   = autoDriveRef.current && !parked

      if (parked) {
        // ESTACIONADO no posto pra ver a missão: freia até parar e ignora os
        // comandos de acelerar/virar até a pessoa aceitar ou recusar
        accelPressRef.current = 0
        speedRef.current = Math.max(speedRef.current - BRAKE_RATE * dt * 4, 0)
        playerXRef.current *= 0.9
      } else if (auto) {
        // piloto automático: acelera até uma velocidade de cruzeiro e mantém
        const CRUISE = MAX_KMH * 0.62
        if (speedRef.current < CRUISE) {
          accelPressRef.current = Math.min(accelPressRef.current + dt * 0.8, 3.0)
          const rate = ACCEL_RATE * (0.5 + accelPressRef.current * 0.5)
          speedRef.current = Math.min(speedRef.current + rate * dt, CRUISE)
        } else {
          speedRef.current = Math.max(speedRef.current - BRAKE_RATE * 0.4 * dt, CRUISE)
        }
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
      if (auto) {
        // desvia do tráfego que está na mesma faixa logo à frente; sem nada
        // no caminho, volta suavemente pro centro da pista
        const autoSeg = Math.floor(posRef.current / SEG_LEN) % ROAD_LEN
        let targetX = 0
        let nearestDist = Infinity
        for (const car of carsRef.current) {
          let d = car.seg - autoSeg
          if (d < 0) d += ROAD_LEN
          if (d > 0 && d <= 16 && Math.abs(car.x) < 0.9 && d < nearestDist) {
            nearestDist = d
            targetX = car.x > 0 ? -0.65 : 0.65
          }
        }
        playerXRef.current += (targetX - playerXRef.current) * Math.min(dt * 2.5, 1)
      } else if (!parked) {
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

      // dirigindo em direção à missão ativa: acumula distância até "chegar
      // no local" — dispara o mesmo chiado→estacionado que antes servia pra
      // aceitar rádio, agora pra chegar na missão. Só checa com o celular
      // fechado — com ele aberto a missão já foi aceita e está em andamento,
      // não é pra reabrir o diálogo de chegada por cima dela
      if (radioMachineRef.current === "playing" && !phoneOpenRef.current) {
        const mission = activeMission(confirmCountRef.current)
        if (mission) {
          missionDistRef.current += advance
          if (missionDistRef.current >= mission.distance) {
            setRadioMachine("static")
            playStaticBurst()
            if (parkTimeoutRef.current) clearTimeout(parkTimeoutRef.current)
            parkTimeoutRef.current = setTimeout(() => {
              setRadioMachine("parked")
              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([160, 80, 160])
            }, 900)
          }
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

      // ── SILHUETA DO HORIZONTE — camada de PARALAXE LIGADA À CURVA DA
      // PISTA (plano intermediário do sistema de profundidade: céu/sol
      // parados ao fundo, pista rápida embaixo). Não é esteira lateral
      // infinita — o cenário balança pro lado igual à curva que vem pela
      // frente (curveRef.current, mesmo valor que já move a estrada e o
      // volante 3D), então volta ao centro nos trechos retos entre as
      // curvas, como olhar de verdade pra fora enquanto o carro curva ──
      const horizY = JOGO_H * 0.60
      const MID_CURVE_MAX = W * 0.10
      const repOffset = Math.max(-MID_CURVE_MAX, Math.min(MID_CURVE_MAX, curveRef.current * W * 0.0016))
      {
        if (scenarioRef.current === "helix") {
          // parque eólico + fileira de painéis solares no lugar dos prédios
          const turbineX=[0.08,0.22,0.38,0.58,0.74,0.90]
          for(let t=0;t<turbineX.length;t++){
            const tx=turbineX[t]*W+repOffset, th=JOGO_H*0.30
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
            const sx=(s/8)*W+W*0.02+repOffset, sw=W*0.09, sh=JOGO_H*0.045
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
            const bW=W*0.075, bHH=bhArr[b]*JOGO_H*bhScale, bXX=bxArr[b]*W+repOffset
            ctx.fillStyle=palette.buildingBase
            ctx.fillRect(bXX-bW/2, horizY-bHH, bW, bHH)
            const wc=palette.windowColors[b%palette.windowColors.length]
            ctx.fillStyle=wc
            for(let wy=4;wy<bHH-4;wy+=9)
              for(let wx=4;wx<bW-4;wx+=8)
                if((b*7+wy+wx)%3!==0) ctx.fillRect(bXX-bW/2+wx,horizY-bHH+wy,4,4)
          }
          // palmeiras em silhueta, intercaladas entre os prédios — visual
          // synthwave da referência (praia/pôr do sol), mesma camada de
          // paralaxe lento dos prédios
          const palmX=[0.0,0.16,0.335,0.5,0.665,0.83]
          const palmScale=[0.85,1,0.75,0.95,0.8,1.05]
          for(let p=0;p<palmX.length;p++){
            const px=palmX[p]*W+repOffset
            const ph=JOGO_H*0.30*palmScale[p]
            drawPalmSilhouette(ctx, px, horizY+JOGO_H*0.01, ph, palette.buildingBase)
          }
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

      // ── REFLEXO NA PISTA — faixa vertical sutil (estilo "asfalto molhado")
      // alinhada com o sol/horizonte, sobre a pista já desenhada. Blend
      // "lighter" pra só clarear, nunca escurecer o asfalto por baixo ──
      {
        const reflW = W * 0.22
        const refl = ctx.createLinearGradient(0, horizY, 0, JOGO_H)
        refl.addColorStop(0, `${palette.sunOuter}33`)
        refl.addColorStop(1, "transparent")
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        ctx.fillStyle = refl
        ctx.fillRect(SX - reflW / 2, horizY, reflW, JOGO_H - horizY)
        ctx.restore()
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

      // ── INTERIOR DO CARRO — colunas do para-brisa, moldura superior,
      // retrovisor e o lábio de transição pro painel, pra dar a sensação de
      // estar dentro do carro (não só vendo a pista solta na tela) ──
      drawInteriorFrame(ctx,W,JOGO_H)

      // ── DASHBOARD ──
      drawDashboard(ctx,W,H,DASH_H,BOTOES_H_NOW,kmhNow,rpmNow,z,camCurve,audio.currentTrack?.title||"—",audio.playing)

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

  const BOTOES_H_PCT = isMobile ? BOTOES_H_PX + 14 : BOTOES_H_PX
  // CONSOLE do carro — a Tela CRT (zona `crt` do blocking) é o gatilho de
  // verdade: fechada, mostra o hub de missão com grid em perspectiva;
  // clicando, abre o painel HUD completo (N3XO/NECTAR/FREQUENCIA/etc). O
  // "celular" pequeno (zona `phone`) é um objeto à parte, só de notificação
  // — ver bloco próprio mais abaixo.
  const crtBox = zonePx(ZONES.crt, viewport.w, viewport.h)
  const CONSOLE_BTN_W = crtBox.w
  const CONSOLE_BTN_H = crtBox.h
  // escala pelo menor dos dois eixos (não só a largura) — senão o preview
  // (iframe real de 390x844) ficava mais alto que a caixinha do ícone e o
  // overflow:hidden cortava a parte de baixo da tela do celular
  const CONSOLE_SCALE = Math.min(CONSOLE_BTN_W / 390, CONSOLE_BTN_H / 844)
  const CONSOLE_OFFSET_X = (CONSOLE_BTN_W - 390 * CONSOLE_SCALE) / 2
  const CONSOLE_OFFSET_Y = (CONSOLE_BTN_H - 844 * CONSOLE_SCALE) / 2

  // ACEITAR: abre o celular direto na página da missão, liga o piloto
  // automático (a pessoa não precisa mais dirigir manualmente enquanto
  // resolve a missão) — a própria página da missão muta o rádio sozinha ao
  // montar (mesmo padrão que GUITAR DRIVER já usa).
  // Zera o odômetro da missão: sem isso, o carro seguia andando (autoDrive)
  // com a MESMA distância que já tinha estourado o gatilho, então o diálogo
  // de chegada (radioMachine==="parked") disparava de novo no frame seguinte
  // — o botão ACEITAR nunca "sumia" de verdade, só reaparecia na hora.
  const handleAcceptMission = useCallback(() => {
    const mission = activeMission(confirmCountRef.current)
    if (!mission) return
    missionDistRef.current = 0
    if (iframeRef.current) iframeRef.current.src = mission.route
    setPhoneOpen(true)
    setAutoDrive(true)
    setRadioMachine("playing")
  }, [])

  // RECUSAR: volta a dirigir normalmente — só oferece essa mesma missão de
  // novo depois de completar uma volta inteira no mapa
  const handleDismissMission = useCallback(() => {
    silentLapDistRef.current = 0
    setRadioMachine("silentLap")
  }, [])

  // Deck DJ — objeto interativo entre os bancos: clicar abre o B4TIDA direto
  // no console, mesmo padrão do rádio abrindo o SINT0NIA
  const handleOpenBatida = useCallback(() => {
    if (iframeRef.current) iframeRef.current.src = "/batida"
    setPhoneOpen(true)
  }, [])

  // Porta-luvas — "cartola de mágico": inventário dos itens absurdos
  // coletados no jogo. Conteúdo ainda não definido — só a estrutura (lista
  // vazia por enquanto) pra poder popular depois.
  const [showGloveBox, setShowGloveBox] = useState(false)

  // Modal expandido do mini-mapa (dentro do HUB) — estado erguido até aqui
  // de propósito: o modal em si é renderizado como irmão de topo (fora da
  // caixa do HUB/zona crt), senão o zIndex dele só venceria coisas dentro
  // do HUB, e o rádio/DJ deck (irmãos de fora) continuariam por cima
  const [mapExpanded, setMapExpanded] = useState(false)

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

      {/* MODAL DO MINI-MAPA (mapa bidirecional) — irmão de topo de propósito,
          nunca aninhado dentro do HUB: precisa ficar aqui pra seu
          position:fixed/zIndex:80 realmente cobrir a tela toda (rádio, DJ
          deck etc.), em vez de só vencer coisas dentro da caixa do HUB */}
      {mapExpanded && (() => {
        const mission = activeMission(confirmCount)
        return (
          <CityMapModal
            mission={mission ? { id: mission.id, letter: mission.letter, name: mission.name, color: MISSION_COLORS[mission.id] } : undefined}
            progress={missionProgress}
            onClose={() => setMapExpanded(false)}
          />
        )
      })()}

      {/* BEZEL da Tela CRT — moldura física atrás da tela fechada, como uma
          tela embutida de verdade no painel (não um retângulo colado por
          cima). A tela em si (iframe) fica encaixada por dentro, recuada.
          Zona `crt` do blocking. */}
      {!phoneOpen && viewport.w > 0 && (
        <div style={{
          position:"absolute", zIndex:46,
          left:crtBox.x-9, top:crtBox.y-9,
          width:CONSOLE_BTN_W+18, height:CONSOLE_BTN_H+18,
          borderRadius:16,
          background:"linear-gradient(160deg, #211a2c 0%, #0d0912 100%)",
          border:"1px solid rgba(255,255,255,0.08)",
          boxShadow:"inset 0 1px 2px rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            position:"absolute", top:6, left:"50%", transform:"translateX(-50%)",
            width:5, height:5, borderRadius:"50%",
            background:"rgba(255,255,255,0.15)",
          }}/>
        </div>
      )}

      {/* TELA CRT / CONSOLE — fechada: HUB estilo Apple CarPlay (mini-mapa +
          tocando agora + prévia de mensagens + dock de apps), nada de
          clique genérico "abre o celular inteiro" — cada pedaço tem sua
          própria ação. Só quando aberta (por um desses gatilhos) que essa
          mesma caixa vira o painel do celular de verdade. */}
      <div
        style={{
          position:"absolute",
          // fechada, fica atrás do rádio (zonas crt/radio se tocam por uma
          // borda — z4 < z11 no blocking); aberta, precisa ficar acima de
          // tudo (inclusive do backdrop escuro, zIndex 55)
          zIndex: phoneOpen ? 60 : 47,
          transition:"all .45s cubic-bezier(.4,0,.2,1)",
          // "vibra" visualmente quando uma missão chega — funciona em
          // qualquer navegador, mesmo onde navigator.vibrate não existe
          animation: (!phoneOpen && radioMachine === "parked") ? "phone-buzz 0.5s ease-in-out infinite" : "none",
          ...(phoneOpen
            ? ({
                top:"50%", left:"50%", transform:"translate(-50%,-50%)",
                // celular preenche quase a tela toda em retrato real (mesma
                // regra que as próprias páginas do celular já assumem:
                // w-full h-[100dvh]); em desktop vira um painel proporcional
                // 400:844 — a MESMA razão que as páginas assumem via
                // max-w-[400px] md:h-[844px], não mais 9:16, que deixava a
                // caixa menor que a tela real em celular de verdade e
                // forçava scroll pra alcançar botões
                height: isMobile ? "100dvh" : "min(88dvh, 844px)",
                width: isMobile ? "min(100vw, 480px)" : "calc(min(88dvh, 844px) * 400 / 844)",
                background:"#0a0a12", borderRadius: isMobile ? 0 : 22, padding:0,
                border:`1px solid ${C.neonPink}55`,
                boxShadow:`0 0 0 1px #000, 0 20px 60px rgba(0,0,0,0.7), 0 0 32px ${C.neonPink}33`,
                cursor:"default", overflow:"hidden",
                display:"flex", flexDirection:"column",
              } as React.CSSProperties)
            : {
                // zona crt do blocking — grande, entre o cluster e o console central
                left:crtBox.x, top:crtBox.y,
                width:CONSOLE_BTN_W, height:CONSOLE_BTN_H,
                background:"#513156", borderRadius:10, padding:0,
                border:"1.5px solid rgba(161,80,186,0.5)",
                boxShadow:"0 0 16px rgba(161,80,186,0.35), 0 0 4px rgba(161,80,186,0.6)",
                cursor:"default", overflow:"hidden",
              }),
        }}
      >
        {/* HUB fechado — estilo Apple CarPlay/head-unit (referência: mapa no
            canto superior esquerdo, blocos grandes dos apps-jogo com ícone
            de verdade — não letra — no resto da grade, prévia de mensagens
            no canto superior direito, dock fino embaixo). Cada pedaço abre
            sua própria coisa; não existe mais um clique genérico pra "tela
            inicial do celular". */}
        {!phoneOpen && (() => {
          const mission = activeMission(confirmCount)
          const openApp = (a: { route: string; external?: boolean }) => {
            if (a.external) { window.open(a.route, "_blank"); return }
            if (iframeRef.current) iframeRef.current.src = a.route
            setPhoneOpen(true)
          }
          const contacts = HUB_MEMBER_ORDER
            .filter((key) => confirmCount >= HUB_VISIBLE_FROM_CC[key])
            .map((key) => {
              const phase = phaseFor(key, confirmCount)
              return {
                key,
                name: SCRIPTS[key].name,
                isNew: !funnel.state.rewardsViewed.includes(`${key}:${phase}`),
                ...HUB_AVATARS[key],
              }
            })
          const appState: HubAppUnlockState = {
            radioAnyAccepted: ALL_TIERS.some((t) => radioAccepted[t]),
            nectar: funnel.state.appsUnlocked.nectar,
            feelGood: funnel.state.appsUnlocked.feelGood,
            guitarDriver: funnel.state.appsUnlocked.guitarDriver,
          }
          const tiles = HUB_TILES.filter((a) => a.unlocked(appState))
          const dockApps = HUB_APPS.filter((a) => a.unlocked(appState))
          return (
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", gap:4, padding:6, background:"linear-gradient(160deg, #1b0f26 0%, #0d0714 100%)" }}>
              <div style={{ flex:1, minHeight:0, display:"flex", gap:4 }}>
                {/* mini-mapa — canto superior esquerdo; só o botão aqui, o
                    modal expandido é renderizado fora do HUB (CityMapModal) */}
                <div style={{ flexShrink:0, display:"flex", alignItems:"flex-start" }}>
                  <CityMapButton
                    mission={mission ? { id: mission.id, letter: mission.letter, name: mission.name, color: MISSION_COLORS[mission.id] } : undefined}
                    progress={missionProgress}
                    onOpen={() => setMapExpanded(true)}
                    size={94}
                  />
                </div>

                {/* grade 2x2: blocos dos apps-jogo (ícone de verdade) +
                    prévia de mensagens no canto superior direito */}
                <div style={{ flex:1, minWidth:0, display:"grid", gridTemplateColumns:"1fr 1fr", gridTemplateRows:"1fr 1fr", gap:4 }}>
                  {tiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => openApp(tile)}
                      aria-label={`Abrir ${tile.label}`}
                      style={{
                        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2,
                        background:tile.color, borderRadius:7, border:"1px solid rgba(255,255,255,0.1)",
                        cursor:"pointer", WebkitTapHighlightColor:"transparent", padding:2, minWidth:0,
                      }}
                    >
                      <AppIcon icon={tile.icon} size={16} className="text-white" />
                      <span style={{ fontFamily:"monospace", fontSize:6, fontWeight:700, letterSpacing:0.3, color:"rgba(255,255,255,0.85)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"100%" }}>{tile.label}</span>
                    </button>
                  ))}

                  {/* prévia de mensagens — canto superior direito da grade */}
                  <div style={{
                    display:"flex", flexDirection:"column", gap:1, overflow:"hidden",
                    background:"rgba(255,255,255,0.04)", borderRadius:7, border:"1px solid rgba(255,255,255,0.08)", padding:3,
                  }}>
                    {contacts.length === 0 ? (
                      <span style={{ fontFamily:"monospace", fontSize:6, color:"rgba(255,255,255,0.35)" }}>sem msgs</span>
                    ) : contacts.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => openApp({ route: `/n3xo/privado/${c.key}` })}
                        aria-label={`Abrir conversa com ${c.name}`}
                        style={{
                          flex:1, minHeight:0, display:"flex", alignItems:"center", gap:3, textAlign:"left",
                          background:"none", border:"none", padding:0, cursor:"pointer", WebkitTapHighlightColor:"transparent",
                        }}
                      >
                        <span style={{ width:9, height:9, borderRadius:"50%", flexShrink:0, background:c.color, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"monospace", fontWeight:800, fontSize:5, color:"#fff" }}>{c.avatar}</span>
                        <span style={{ fontFamily:"monospace", fontSize:6, fontWeight:700, letterSpacing:0.2, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{c.name}</span>
                        {c.isNew && <span style={{ width:4, height:4, borderRadius:"50%", flexShrink:0, background:"#00e5ff", boxShadow:"0 0 4px #00e5ff" }}/>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* dock fino embaixo — utilitários + apps externos do celular
                  (YouTube/Instagram), ícone de verdade de cada um */}
              <div style={{ flexShrink:0, display:"flex", gap:4, overflowX:"auto" }}>
                {dockApps.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => openApp(a)}
                    aria-label={`Abrir ${a.label}`}
                    style={{
                      flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                      width:16, height:16, borderRadius:5,
                      background:`${a.color}33`, border:`1px solid ${a.color}88`,
                      cursor:"pointer", WebkitTapHighlightColor:"transparent",
                    }}
                  >
                    <AppIcon icon={a.icon} size={10} className="text-white" />
                  </button>
                ))}
              </div>
            </div>
          )
        })()}
        {phoneOpen&&(
          // barra superior do console — substitui a moldura/notch de celular
          <div style={{
            flexShrink:0, height:34, display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"0 14px", borderBottom:`1px solid ${C.neonPink}33`,
            background:"rgba(255,255,255,0.02)",
          }}>
            <span style={{fontFamily:"monospace",fontSize:10,letterSpacing:2,color:`${C.neonPink}cc`}}>CONSOLE · N3XO</span>
            <button
              type="button"
              onClick={(e)=>{e.stopPropagation();setPhoneOpen(false)}}
              style={{
                display:"flex",alignItems:"center",gap:5,
                background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.2)",
                borderRadius:999, padding:"4px 10px",
                color:"rgba(255,255,255,0.7)", fontFamily:"monospace", fontSize:9, letterSpacing:1,
                cursor:"pointer",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>
              MINIMIZAR
            </button>
          </div>
        )}
        <div style={{position:"relative",flex:1,width:"100%",overflow:"hidden",background:"#000"}}>
          <iframe
            ref={iframeRef}
            src="/?screen=home"
            style={{
              position: phoneOpen?"static":"absolute",
              left: phoneOpen?undefined:CONSOLE_OFFSET_X,
              top: phoneOpen?undefined:CONSOLE_OFFSET_Y,
              width: phoneOpen?"100%":"390px",
              height: phoneOpen?"100%":"844px",
              border:"none",
              transform: phoneOpen?"none":`scale(${CONSOLE_SCALE})`,
              transformOrigin:"top left",
              pointerEvents: phoneOpen?"auto":"none",
            }}
            title="Console"
          />
        </div>
      </div>

      {/* RESET DA EXPERIÊNCIA — direto no painel do carro, fora do celular.
          Mesmo efeito do botão "Ligacao" no Painel de Teste (celular): zera o
          funil inteiro e recarrega — existe aqui pra funcionar mesmo se o
          console/celular travar e não der pra abrir o painel de teste */}
      {!phoneOpen && (
        <button
          type="button"
          onClick={() => funnel.resetExperience()}
          aria-label="Resetar experiência"
          title="Resetar experiência"
          style={{
            position:"absolute", zIndex:60,
            top:"calc(14px + env(safe-area-inset-top))",
            left:"calc(14px + env(safe-area-inset-left))",
            width:48, height:48, borderRadius:14,
            background:"#0a0014", padding:0,
            border:"1.5px solid rgba(255,255,255,0.3)",
            boxShadow:"0 0 12px rgba(255,255,255,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:"pointer", WebkitTapHighlightColor:"transparent",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 2.64-6.36M3 4v5h5"/>
          </svg>
        </button>
      )}

      {/* BARRA DO RÁDIO — zona `radio` do blocking, centro do console. É o
          rádio, não o celular: mostra o que está tocando (mascarado, na cor
          da frequência) e, ao tocar, abre o SINT0NIA direto — SINT0NIA é uma
          extensão do rádio dentro do celular, não o contrário, então não
          passa pela tela inicial do N3XO. Acesso genérico ao celular (pra
          ver mensagens/apps) continua sendo o HUB (zona crt), como sempre foi. */}
      {!phoneOpen && viewport.w > 0 && (() => {
        const z = zonePx(ZONES.radio, viewport.w, viewport.h)
        const meta = F[activeTier]
        const accent = radioOn ? meta.color : "rgba(255,255,255,0.4)"
        const title = (radioTrack?.title ?? "—").toUpperCase()
        const isStatic = radioMachine === "static"
        const tunedTiers = ALL_TIERS.filter(t => radioAccepted[t])
        const tunerFreq = FREQ_MIN + tunerPct * (FREQ_MAX - FREQ_MIN)
        const tunerLocked = ALL_TIERS.some(t => radioAccepted[t] && Math.abs(tunerFreq - freqOf(t)) <= FREQ_TOLERANCE)
        return (
          <div style={{ position:"absolute", zIndex:48, left:z.x, top:z.y, width:z.w, height:z.h, display:"flex", flexDirection:"column", gap:4 }}>

            {/* FITINHA FINA — era só o nome da faixa, agora é onde moram os
                controles (bolinhas de estação, próxima rádio, play grande
                = power, shuffle e volume); o nome da faixa já aparece na
                tela do rádio logo abaixo */}
            <div style={{ flexShrink:0, display:"flex", alignItems:"center", gap:5, padding:"0 2px" }}>
              <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                {tunedTiers.map(tier => {
                  const tMeta = F[tier]
                  const isSel = tier === activeTier
                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => { setShuffleMode(false); setManualTier(tier); setRadioOn(true) }}
                      aria-label={`Tocar ${tMeta.label}`}
                      style={{
                        flexShrink:0, width:10, height:10, borderRadius:"50%",
                        background: isSel && radioOn ? tMeta.color : `${tMeta.color}33`,
                        border: `1px solid ${tMeta.color}`,
                        boxShadow: isSel && radioOn ? `0 0 6px ${tMeta.color}` : "none",
                        cursor:"pointer", padding:0, WebkitTapHighlightColor:"transparent",
                      }}
                    />
                  )
                })}
              </div>

              <div style={{ flex:1 }} />

              <button
                type="button"
                onClick={nextTier}
                aria-label="Próxima rádio"
                style={{
                  flexShrink:0, width:16, height:16, borderRadius:"50%",
                  background:"rgba(255,255,255,0.06)", border:"1.5px solid rgba(255,255,255,0.3)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", WebkitTapHighlightColor:"transparent",
                }}
              >
                <svg width={8} height={8} viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M5 5v14l10-7z"/><rect x="17" y="5" width="2.5" height="14"/></svg>
              </button>

              <button
                type="button"
                onClick={() => setRadioOn(o => !o)}
                aria-label={radioOn ? "Desligar rádio" : "Ligar rádio"}
                style={{
                  flexShrink:0, width:22, height:22, borderRadius:"50%",
                  background: radioOn ? `${meta.color}22` : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${radioOn ? meta.color : "rgba(255,255,255,0.3)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", WebkitTapHighlightColor:"transparent",
                }}
              >
                {radioOn ? (
                  <svg width={9} height={9} viewBox="0 0 24 24" fill={meta.color}><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                ) : (
                  <svg width={9} height={9} viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              <button
                type="button"
                onClick={toggleShuffle}
                aria-label={shuffleMode ? "Desligar shuffle" : "Ligar shuffle geral"}
                style={{
                  flexShrink:0, width:16, height:16, borderRadius:"50%",
                  background: shuffleMode ? `${meta.color}22` : "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${shuffleMode ? meta.color : "rgba(255,255,255,0.3)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  cursor:"pointer", WebkitTapHighlightColor:"transparent",
                }}
              >
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke={shuffleMode ? meta.color : "rgba(255,255,255,0.7)"} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h3.5a4 4 0 013.2 1.6L14 12"/>
                  <path d="M3 18h3.5a4 4 0 003.2-1.6L14 12"/>
                  <path d="M17 6h4M17 18h4"/>
                  <path d="M18.5 4.5L21 6l-2.5 1.5"/>
                  <path d="M18.5 19.5L21 18l-2.5-1.5"/>
                </svg>
              </button>

              <div style={{ position:"relative", flexShrink:0, width:16, height:16 }}>
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
                    background:`conic-gradient(from -120deg, ${meta.color} ${volume*300}deg, rgba(255,255,255,0.10) ${volume*300}deg 300deg, transparent 300deg 360deg)`,
                    WebkitMask:"radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                    mask:"radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                  }}
                />
              </div>
            </div>

            {/* TELA DO RÁDIO (ESTAÇÃO) — estação/frequência atual + dial de
                sintonia manual; tocar fora do dial continua abrindo o
                SINT0NIA direto (extensão do rádio no celular, função
                "sintonia" centralizada aqui) */}
            <div
              onClick={() => { if (iframeRef.current) iframeRef.current.src = "/sintonizador"; setPhoneOpen(true) }}
              role="button"
              tabIndex={0}
              aria-label="Abrir SINT0NIA — sintonizar rádio"
              style={{
                flex:1, minHeight:0, position:"relative", borderRadius:14, cursor:"pointer", overflow:"hidden",
                background:"linear-gradient(180deg, rgba(8,4,20,0.92), rgba(4,2,10,0.94))",
                border:`1px solid ${accent}55`,
                boxShadow: radioOn ? `0 0 18px ${accent}33, inset 0 0 14px ${accent}18` : "none",
                display:"flex", flexDirection:"column", justifyContent:"center", padding:"3px 10px",
                WebkitTapHighlightColor:"transparent",
              }}
            >
              <div style={{fontFamily:"monospace",fontSize:9,letterSpacing:1,color:accent,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                {meta.label} · {meta.freq} FM{shuffleMode && radioOn ? " · SHUFFLE" : ""}
              </div>

              {/* DIAL DE SINTONIA — arrasta pra "passar" pelas 4 frequências;
                  só acerta (toca) quando passa bem em cima de uma já
                  desbloqueada, as outras continuam sintonizáveis a
                  qualquer momento. Bolinhas na fitinha acima continuam
                  sendo o atalho que pula direto pra frequência exata. */}
              <div
                ref={tunerTrackRef}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  tunerDraggingRef.current = true
                  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                  updateTunerFromPointer(e.clientX)
                }}
                onPointerMove={(e) => { if (tunerDraggingRef.current) updateTunerFromPointer(e.clientX) }}
                onPointerUp={() => { tunerDraggingRef.current = false }}
                style={{ position:"relative", height:10, marginTop:3, cursor:"grab", touchAction:"none" }}
              >
                <div style={{ position:"absolute", left:0, right:0, top:"50%", height:2, transform:"translateY(-50%)", background:"rgba(255,255,255,0.12)", borderRadius:2 }}/>
                {ALL_TIERS.map(t => {
                  const tMeta = F[t]
                  const unlocked = radioAccepted[t]
                  return (
                    <div key={t} style={{
                      position:"absolute", left:`${pctForFreq(freqOf(t))*100}%`, top:"50%",
                      width:3, height:8, transform:"translate(-50%,-50%)", borderRadius:1,
                      background: unlocked ? tMeta.color : "rgba(255,255,255,0.15)",
                      boxShadow: unlocked ? `0 0 4px ${tMeta.color}` : "none",
                    }}/>
                  )
                })}
                <div style={{
                  position:"absolute", left:`${tunerPct*100}%`, top:"50%", width:2, height:12,
                  transform:"translate(-50%,-50%)", borderRadius:1, background:"#fff",
                  boxShadow: tunerLocked ? `0 0 6px ${accent}` : "0 0 3px rgba(255,255,255,0.5)",
                }}/>
              </div>

              <div style={{position:"relative",height:13,overflow:"hidden",marginTop:1}}>
                {!radioOn ? (
                  <span style={{fontFamily:"monospace",fontSize:9,letterSpacing:0.5,color:"rgba(255,255,255,0.4)"}}>toque pra sintonizar</span>
                ) : isStatic ? (
                  <span style={{fontFamily:"monospace",fontSize:9,letterSpacing:1,color:accent,animation:"radio-blink 0.25s steps(2) infinite"}}>▓▒░ INTERFERÊNCIA ░▒▓</span>
                ) : radioActive ? (
                  <div style={{position:"absolute",whiteSpace:"nowrap",fontFamily:"monospace",fontSize:10,fontWeight:700,letterSpacing:1,
                    color:"#eafff8",textShadow:`0 0 6px ${accent}aa`,animation:"dash-marquee 12s linear infinite"}}>
                    ♪ {title} &nbsp;&nbsp;&nbsp;&nbsp; ♪ {title} &nbsp;&nbsp;&nbsp;&nbsp;
                  </div>
                ) : (
                  <span style={{fontFamily:"monospace",fontSize:9,letterSpacing:1,color:"rgba(255,255,255,0.35)"}}>◌ SILÊNCIO ◌</span>
                )}
              </div>
              <div style={{position:"absolute", left:0, right:0, bottom:0, height:2, background:"rgba(255,255,255,0.06)"}}>
                <div style={{height:"100%", width:`${radioOn ? snippetPct*100 : 0}%`, background:accent, boxShadow:`0 0 6px ${accent}`, transition:"width .12s linear"}} />
              </div>
            </div>
          </div>
        )
      })()}

      {/* BARRA DE NOTIFICAÇÃO DO CELULAR — fininha, no topo, clicável (abre o
          celular e executa a mesma ação de tocar nela lá dentro). Notificações
          de "aceitar missão" (isMission) ganham um botão ACEITAR direto ali —
          aceita sem precisar abrir o celular: o iframe já abre na página da
          missão, liga o piloto automático, e a própria página muta o rádio
          sozinha ao montar (mesmo padrão do GUITAR DRIVER) — e não somem
          sozinhas depois de alguns segundos, só quando resolvidas */}
      {!phoneOpen && phoneNotif && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            sendNotificationClickToIframe(iframeRef.current, phoneNotif.id)
            setPhoneOpen(true)
            setPhoneNotif(null)
          }}
          style={{
            position:"absolute",
            top:"calc(14px + env(safe-area-inset-top))",
            left:"50%", transform:"translateX(-50%)",
            width:"min(80%, 340px)",
            zIndex:62,
            // phone-buzz anima "transform" e quebraria o translateX(-50%) de
            // centralização abaixo — pulse-glow só anima opacity, seguro de combinar
            animation: phoneNotif.isMission ? "phone-notif-in 0.35s ease-out, pulse-glow 1.4s ease-in-out infinite" : "phone-notif-in 0.35s ease-out",
            display:"flex", alignItems:"center", gap:8,
            borderRadius:999, padding:"6px 6px 6px 6px",
            background:"linear-gradient(135deg, rgba(20,10,35,0.95), rgba(6,3,14,0.97))",
            border:`1px solid ${phoneNotif.color}66`,
            boxShadow:`0 0 14px ${phoneNotif.color}44, 0 6px 16px rgba(0,0,0,0.5)`,
            cursor:"pointer",
          }}
        >
          <span style={{width:8,height:8,borderRadius:8,flexShrink:0,marginLeft:8,background:phoneNotif.color,boxShadow:`0 0 6px ${phoneNotif.color}`}}/>
          <span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{phoneNotif.title}</span>
          <span style={{fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.45)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,textAlign:"left"}}>{phoneNotif.body}</span>
          {phoneNotif.isMission && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleAcceptMission()
                setPhoneNotif(null)
              }}
              style={{
                flexShrink:0, borderRadius:999, padding:"5px 10px",
                background:`${phoneNotif.color}22`, border:`1px solid ${phoneNotif.color}`,
                color:phoneNotif.color, fontFamily:"monospace", fontSize:10, fontWeight:800,
                letterSpacing:0.5, cursor:"pointer", WebkitTapHighlightColor:"transparent",
              }}
            >
              ACEITAR
            </button>
          )}
        </div>
      )}

      {/* Trocar entre as frequências já sintonizadas agora é feito dentro do
          próprio SINT0NIA (favoritos) — ver SELECT_RADIO_TIER no AudioBridge —
          não fica mais um seletor solto aqui no painel */}

      {/* CHEGOU NA MISSÃO — dirigiu a distância até o marcador do contato no
          mapa. Aceitar abre o celular direto na missão, liga o piloto
          automático (a página da missão já muta o rádio sozinha, igual o
          GUITAR DRIVER já faz); recusar volta a dirigir e só oferece de novo
          depois de dar a volta inteira no mapa */}
      {radioMachine === "parked" && (()=>{
        const mission = activeMission(confirmCount)
        if (!mission) return null
        const color = MISSION_COLORS[mission.id]
        return (
        <div style={{position:"absolute",inset:0,zIndex:70,background:"rgba(2,0,12,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{
            width:"100%", maxWidth:320, borderRadius:20, padding:"22px 20px",
            background:"linear-gradient(160deg, #12081f 0%, #06030d 100%)",
            border:`1px solid ${color}66`,
            boxShadow:`0 0 30px ${color}33`,
            textAlign:"center",
          }}>
            <p style={{fontFamily:"monospace",fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.4)",marginBottom:6}}>
              📍 VOCÊ CHEGOU
            </p>
            <div style={{
              width:44, height:44, borderRadius:"50%", margin:"0 auto 10px",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`${color}22`, border:`1.5px solid ${color}`,
              fontFamily:"monospace", fontWeight:800, fontSize:20, color,
            }}>{mission.letter}</div>
            <p style={{fontFamily:"monospace",fontSize:14,fontWeight:700,letterSpacing:1,color,textShadow:`0 0 10px ${color}aa`,marginBottom:8}}>
              MISSÃO DISPONÍVEL
            </p>
            <p style={{fontFamily:"monospace",fontSize:16,fontWeight:800,letterSpacing:1,color:"#fff",marginBottom:14}}>
              {mission.name}
            </p>
            <div style={{display:"flex",gap:10}}>
              <button type="button" onClick={handleDismissMission} style={{
                flex:1, padding:"11px 0", borderRadius:12,
                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.18)",
                color:"rgba(255,255,255,0.7)", fontFamily:"monospace", fontSize:12, letterSpacing:1.5, cursor:"pointer",
              }}>RECUSAR</button>
              <button type="button" onClick={handleAcceptMission} style={{
                flex:1, padding:"11px 0", borderRadius:12,
                background:`${color}22`, border:`1.5px solid ${color}`,
                color, fontFamily:"monospace", fontWeight:700, fontSize:12, letterSpacing:1.5, cursor:"pointer",
              }}>ACEITAR</button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* VOLANTE 3D — camada decorativa (não captura clique) sobre o canvas
          2D, girando de verdade com o playerXRef do jogo. Placeholder
          procedural até termos um modelo .glb real pra passar em modelUrl.
          Zona `wheel` exata do blocking (z9) — atrás do cluster (z2,
          canvas) na conta de profundidade, mas visualmente por cima porque
          é uma camada HTML separada acima do canvas; a intenção do
          blocking (mostradores espiando por trás do aro) já é atendida
          pelo cluster ocupar uma faixa mais alta e estreita que o volante. */}
      {!phoneOpen && viewport.w > 0 && (() => {
        const wb = zonePx(ZONES.wheel, viewport.w, viewport.h)
        return (
          <div style={{
            position:"absolute",
            left:wb.x, top:wb.y, width:wb.w, height:wb.h,
            zIndex:45,
          }}>
            <SteeringWheel3D steerRef={playerXRef} className="w-full h-full" />
          </div>
        )
      })()}

      {/* DECK DJ — toca-discos de verdade (base + prato com sulcos + braço),
          entre os bancos (zona `djDeck`, z10). Clicar abre o console direto
          no B4TIDA. */}
      {!phoneOpen && viewport.w > 0 && (() => {
        const db = zonePx(ZONES.djDeck, viewport.w, viewport.h)
        const size = Math.min(db.w, db.h)
        return (
          <div style={{ position:"absolute", zIndex:44, left:db.x + (db.w - size) / 2, top:db.y + (db.h - size) / 2, width:size, height:size }}>
            <button
              type="button"
              onClick={handleOpenBatida}
              aria-label="Toca-discos — abrir B4TIDA"
              style={{ position:"absolute", inset:0, padding:0, cursor:"pointer", background:"none", border:"none" }}
            >
              <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ filter:"drop-shadow(0 0 10px rgba(202,115,57,0.3))" }}>
                <defs>
                  <radialGradient id="djPlatter" cx="45%" cy="40%" r="70%">
                    <stop offset="0%" stopColor="#2c1f2c" />
                    <stop offset="100%" stopColor="#0d0910" />
                  </radialGradient>
                </defs>
                {/* base/plinth */}
                <rect x="3" y="3" width="94" height="94" rx="12" fill="#1c1420" stroke="rgba(202,115,57,0.4)" strokeWidth="1.5" />
                {/* prato + sulcos */}
                <circle cx="41" cy="56" r="32" fill="url(#djPlatter)" stroke="rgba(202,115,57,0.55)" strokeWidth="1.5" />
                <circle cx="41" cy="56" r="25" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                <circle cx="41" cy="56" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <circle cx="41" cy="56" r="11" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                <circle cx="41" cy="56" r="4" fill="#8a5220" />
                {/* braço */}
                <circle cx="80" cy="18" r="5" fill="rgba(202,115,57,0.65)" />
                <line x1="80" y1="18" x2="53" y2="41" stroke="rgba(224,139,58,0.75)" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="53" cy="41" r="3.5" fill="rgba(224,139,58,0.9)" />
              </svg>
            </button>
          </div>
        )
      })()}

      {/* PORTA-LUVAS — inventário "cartola de mágico" (zona `gloveBox`,
          z5). Blocos escuros, só os LEDs âmbar acendem. Clicar abre a tela
          de inventário (sem itens reais ainda). */}
      {!phoneOpen && viewport.w > 0 && (() => {
        const gb = zonePx(ZONES.gloveBox, viewport.w, viewport.h)
        return (
          <button
            type="button"
            onClick={() => setShowGloveBox(true)}
            aria-label="Porta-luvas — inventário"
            style={{
              position:"absolute", zIndex:44,
              left:gb.x, top:gb.y, width:gb.w, height:gb.h,
              borderRadius:8, padding:8, cursor:"pointer",
              background:"linear-gradient(160deg, #1c1420 0%, #0d0910 100%)",
              border:"1px solid rgba(255,255,255,0.06)",
              display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, alignContent:"center", justifyItems:"center",
            }}
          >
            {Array.from({length:4}, (_,i)=>(
              <span key={i} style={{ width:"22%", aspectRatio:"1", borderRadius:"50%", background:"#8a5220", boxShadow:"0 0 6px rgba(224,139,58,0.5)" }}/>
            ))}
          </button>
        )
      })()}

      {/* Tela do porta-luvas — overlay simples, sem itens reais ainda */}
      {showGloveBox && (
        <div
          onClick={()=>setShowGloveBox(false)}
          style={{ position:"absolute", inset:0, zIndex:65, background:"rgba(2,0,12,0.82)", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            style={{
              width:"100%", maxWidth:320, borderRadius:20, padding:"24px 20px",
              background:"linear-gradient(160deg, #241925 0%, #0d0910 100%)",
              border:"1px solid rgba(202,115,57,0.3)",
              boxShadow:"0 0 30px rgba(202,115,57,0.15)",
              textAlign:"center",
            }}
          >
            <p style={{ fontFamily:"monospace", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,0.4)", marginBottom:10 }}>PORTA-LUVAS</p>
            <p style={{ fontFamily:"monospace", fontSize:13, color:"#f0c493", marginBottom:8 }}>uma cartola vazia, por enquanto.</p>
            <p style={{ fontFamily:"monospace", fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:18 }}>os itens absurdos que você for coletando pela cidade aparecem aqui.</p>
            <button
              type="button"
              onClick={()=>setShowGloveBox(false)}
              style={{
                background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.18)",
                borderRadius:12, padding:"10px 24px", color:"rgba(255,255,255,0.7)",
                fontFamily:"monospace", fontSize:11, letterSpacing:1, cursor:"pointer",
              }}
            >FECHAR</button>
          </div>
        </div>
      )}

      {/* CONTROLES DE DIREÇÃO — fixos no fundo. Com o piloto automático ligado,
          o acelerador/direção somem e dá pra usar o console maximizado com o
          carro se cuidando sozinho (acelera e desvia do tráfego) */}
      {!phoneOpen&&(
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,
          height:BOTOES_H_PCT,zIndex:50,
          display:"flex",alignItems:"center",
          justifyContent: autoDrive ? "center" : "space-between",
          gap:"clamp(8px, 3vw, 16px)",
          padding:"0 clamp(10px, 4vw, 20px)",
          paddingBottom:"env(safe-area-inset-bottom)",
          background:"linear-gradient(to top, #05001a, transparent)",
        }}>
          {!autoDrive && (
            <div style={{display:"flex",gap:"clamp(6px, 2vw, 12px)",flexShrink:0}}>
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
          )}

          <button
            type="button"
            onClick={() => setAutoDrive(a => !a)}
            style={{
              display:"flex", alignItems:"center", gap:"clamp(5px, 1.5vw, 8px)",
              padding: autoDrive ? "clamp(7px,2vw,10px) clamp(12px,4vw,22px)" : "clamp(6px,1.8vw,8px) clamp(10px,3vw,16px)",
              borderRadius:999, minWidth:0, flexShrink:1,
              background: autoDrive ? "rgba(0,255,170,0.14)" : "rgba(255,255,255,0.06)",
              border: `1.5px solid ${autoDrive ? "#00ffaa" : "rgba(255,255,255,0.25)"}`,
              color: autoDrive ? "#00ffaa" : "rgba(255,255,255,0.6)",
              boxShadow: autoDrive ? "0 0 16px rgba(0,255,170,0.4)" : "none",
              fontFamily:"monospace", fontSize:"clamp(8.5px, 2.4vw, 11px)", fontWeight:700, letterSpacing:1.5,
              cursor:"pointer", WebkitTapHighlightColor:"transparent", whiteSpace:"nowrap",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{flexShrink:0}}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" /></svg>
            {autoDrive ? "PILOTO AUTOMÁTICO" : "AUTO"}
          </button>

          {!autoDrive && (
            <button
              onTouchStart={()=>accelRef.current=true}  onTouchEnd={()=>accelRef.current=false}
              onMouseDown={()=>accelRef.current=true}   onMouseUp={()=>accelRef.current=false}
              style={{
                width:"clamp(56px, 16vw, 76px)",height:"clamp(56px, 16vw, 76px)",borderRadius:"50%",
                background:`radial-gradient(circle,${C.neonPink}33,${C.neonPink}11)`,
                border:`3px solid ${C.neonPink}`,
                color:C.neonPink,fontSize:"clamp(19px, 5vw, 26px)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:`0 0 20px ${C.neonPink}55`,
                WebkitTapHighlightColor:"transparent",
                cursor:"pointer",
                flexShrink:0,
              }}
            >▲</button>
          )}
        </div>
      )}
    </div>
  )
}

function ctrlBtn(): React.CSSProperties {
  return {
    width:"clamp(48px, 14vw, 64px)",height:"clamp(48px, 14vw, 64px)",borderRadius:"50%",
    background:"rgba(255,107,53,0.15)",
    border:"2px solid #ff6b35aa",
    color:"#ff6b35",fontSize:"clamp(16px, 4.5vw, 22px)",
    flexShrink:0,
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

// ── PALMEIRA EM SILHUETA — camada intermediária de paralaxe (Subúrbio/
// Cidade Neon), visual synthwave de praia/pôr do sol da referência.
// Tronco levemente curvo + leque assimétrico de frondes, tudo silhueta
// única (sem sprite externo) ──
function drawPalmSilhouette(ctx: CanvasRenderingContext2D, x: number, groundY: number, h: number, color: string) {
  const trunkW = h * 0.05
  const trunkH = h * 0.6
  ctx.fillStyle = color
  ctx.save()
  ctx.translate(x, groundY)
  ctx.beginPath()
  ctx.moveTo(-trunkW / 2, 0)
  ctx.quadraticCurveTo(trunkW * 1.5, -trunkH * 0.55, trunkW * 0.8, -trunkH)
  ctx.lineTo(trunkW * 1.8, -trunkH)
  ctx.quadraticCurveTo(trunkW * 2.5, -trunkH * 0.55, trunkW / 2, 0)
  ctx.closePath()
  ctx.fill()
  ctx.translate(trunkW * 1.1, -trunkH)
  const frondAngles = [-150, -105, -70, -35, 10, -160]
  for (const deg of frondAngles) {
    const rad = (deg * Math.PI) / 180
    const len = h * 0.42
    ctx.save()
    ctx.rotate(rad)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(len * 0.5, -len * 0.12, len, len * 0.18)
    ctx.quadraticCurveTo(len * 0.45, len * 0.05, 0, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

// ── INTERIOR DO CARRO — colunas do para-brisa (mais estreitas no topo, mais
// largas perto do painel, como a perspectiva real de um pilar A), moldura
// superior, retrovisor central pendurado e o lábio de transição pro painel.
// Desenhado por cima da pista/céu, só na área JOGO_H (a "vista pelo vidro") ──
function drawInteriorFrame(ctx:CanvasRenderingContext2D, W:number, JOGO_H:number){
  const topW = W*0.028
  const botW = W*0.085
  const pillarColor = "#050208"

  ctx.save()

  // coluna esquerda
  ctx.fillStyle = pillarColor
  ctx.beginPath()
  ctx.moveTo(0,0); ctx.lineTo(topW,0); ctx.lineTo(botW,JOGO_H); ctx.lineTo(0,JOGO_H)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(topW,0); ctx.lineTo(botW,JOGO_H); ctx.stroke()

  // coluna direita (espelhada)
  ctx.fillStyle = pillarColor
  ctx.beginPath()
  ctx.moveTo(W,0); ctx.lineTo(W-topW,0); ctx.lineTo(W-botW,JOGO_H); ctx.lineTo(W,JOGO_H)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(W-topW,0); ctx.lineTo(W-botW,JOGO_H); ctx.stroke()

  // brilho quente sutil na borda interna dos pilares — acabamento
  // avermelhado/pôr-do-sol lembrando a referência, por cima do traço branco
  ctx.strokeStyle = "rgba(255,140,60,0.22)"; ctx.lineWidth = Math.max(2, W*0.003)
  ctx.shadowColor = "rgba(255,120,50,0.6)"; ctx.shadowBlur = W*0.006
  ctx.beginPath(); ctx.moveTo(topW,0); ctx.lineTo(botW,JOGO_H); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(W-topW,0); ctx.lineTo(W-botW,JOGO_H); ctx.stroke()
  ctx.shadowBlur = 0

  // moldura superior do para-brisa
  const topFrameH = JOGO_H*0.032
  ctx.fillStyle = pillarColor
  ctx.fillRect(0,0,W,topFrameH)

  // retrovisor central, pendurado da moldura superior
  const mw=W*0.10, mh=JOGO_H*0.04
  const mx=W/2-mw/2, my=topFrameH
  ctx.strokeStyle=pillarColor; ctx.lineWidth=Math.max(2,W*0.0025)
  ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,my); ctx.stroke()
  ctx.fillStyle="#0d0916"
  ctx.beginPath(); ctx.roundRect(mx,my,mw,mh,4); ctx.fill()
  ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=1
  ctx.beginPath(); ctx.roundRect(mx,my,mw,mh,4); ctx.stroke()

  // lábio do painel — transição suave na base do para-brisa, conecta
  // visualmente com o DASH_H logo abaixo
  const lipH = JOGO_H*0.07
  const lip = ctx.createLinearGradient(0,JOGO_H-lipH,0,JOGO_H)
  lip.addColorStop(0,"rgba(5,2,8,0)")
  lip.addColorStop(1,"rgba(5,2,8,0.95)")
  ctx.fillStyle = lip
  ctx.fillRect(0,JOGO_H-lipH,W,lipH)

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

  // fundo — paleta medida da referência (quase sem ciano): quase-preto
  // dominante (#080a17) + corpo do painel (#281d26) + penumbra (#473542),
  // não mais o roxo/azul de antes. Veios sutis por cima, tipo alumínio
  // escovado, pra parecer uma superfície de painel de verdade.
  const g=ctx.createLinearGradient(0,y0,0,H-BOTOES_H)
  g.addColorStop(0,"#281d26"); g.addColorStop(0.55,"#241925"); g.addColorStop(1,"#080a17")
  ctx.fillStyle=g; ctx.fillRect(0,y0,W,DH)
  ctx.save()
  ctx.globalAlpha=0.05
  ctx.strokeStyle="#473542"; ctx.lineWidth=1
  for(let ly=y0+6; ly<H-BOTOES_H; ly+=5){
    ctx.beginPath(); ctx.moveTo(0,ly); ctx.lineTo(W,ly); ctx.stroke()
  }
  ctx.restore()

  // borda superior — âmbar em vez de laranja neon puro, mais de acordo com
  // a paleta medida (acento âmbar #ca7339)
  ctx.strokeStyle="#ca7339"; ctx.lineWidth=2.5
  ctx.shadowColor="#ca7339"; ctx.shadowBlur=10
  ctx.beginPath(); ctx.moveTo(0,y0); ctx.lineTo(W,y0); ctx.stroke()
  ctx.shadowBlur=0

  // console central — fundo decorativo (controles/botões), atrás do rádio
  const cc = zonePx(ZONES.centerConsole, W, H)
  drawCenterConsole(ctx, cc.x, cc.y, cc.w, cc.h)

  // cluster digital — zona própria do blocking, atrás do volante (HTML) —
  // "módulos independentes, luz vermelha" (referência medida), não mais o
  // vidro único ciano/laranja de antes
  const cl = zonePx(ZONES.cluster, W, H)
  drawInstrumentCluster(ctx, cl.x+cl.w/2, cl.y+cl.h/2, cl.w, cl.h, kmh, rpm)

  // (o RÁDIO agora é um visor HTML na zona radio própria — ver JSX.
  //  o canvas desenha só o console central, o cluster e a zona.)

  // zona
  ctx.fillStyle="#ffffff33"; ctx.font=`${DH*0.09}px monospace`
  ctx.textAlign="center"; ctx.fillText(zone,W/2,y0+DH*0.95)
}

// ── CLUSTER DIGITAL — um único painel de vidro com leitura numérica grande
// (velocidade) + secundária (RPM), cada uma com um arco fino de progresso
// por trás, em vez de dois mostradores analógicos separados com ponteiro e
// ticks numerados. Visual de instrumento digital moderno (referência: tela
// semicircular do cluster na foto do Mercedes), não mostrador arcade.
// "Módulos independentes, luz vermelha" (nota medida da referência) — dois
// blocos separados (velocidade maior + RPM menor), cada um com seu próprio
// bezel, não mais um vidro contínuo único em ciano/laranja
function drawInstrumentCluster(
  ctx:CanvasRenderingContext2D,
  cx:number,cy:number,w:number,h:number,
  kmh:number,rpm:number
){
  const gap=w*0.05
  const speedW=(w-gap)*0.58, rpmW=(w-gap)*0.42
  const x0=cx-w/2
  drawClusterModule(ctx, x0, cy-h/2, speedW, h, `${Math.round(kmh)}`, "KM/H")
  drawClusterModule(ctx, x0+speedW+gap, cy-h/2, rpmW, h, rpm.toFixed(1), "RPM")
}

function drawClusterModule(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,value:string,label:string){
  ctx.save()
  ctx.textAlign="center"; ctx.textBaseline="middle"
  const rad=h*0.2
  rRect(ctx,x,y,w,h,rad)
  const g=ctx.createLinearGradient(0,y,0,y+h)
  g.addColorStop(0,"#241925"); g.addColorStop(1,"#0d0810")
  ctx.fillStyle=g; ctx.fill()
  ctx.lineWidth=Math.max(1,h*0.035)
  ctx.strokeStyle="rgba(125,54,54,0.55)"
  ctx.shadowColor="#7d3636"; ctx.shadowBlur=6
  ctx.stroke()
  ctx.shadowBlur=0

  ctx.fillStyle="#e8b9ac"; ctx.font=`700 ${h*0.42}px monospace`
  ctx.shadowColor="#7e3228"; ctx.shadowBlur=6
  ctx.fillText(value,x+w/2,y+h*0.42)
  ctx.shadowBlur=0
  ctx.fillStyle="rgba(224,139,58,0.7)"; ctx.font=`${h*0.15}px monospace`
  ctx.fillText(label,x+w/2,y+h*0.78)
  ctx.restore()
}

// console central — fundo decorativo de controles/botões (sem função),
// atrás do rádio (HTML). Ventilação de cada lado, botões redondos no meio.
function drawCenterConsole(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number){
  ctx.save()
  rRect(ctx,x,y,w,h,h*0.1)
  const g=ctx.createLinearGradient(0,y,0,y+h)
  g.addColorStop(0,"#1c1420"); g.addColorStop(1,"#0d0910")
  ctx.fillStyle=g; ctx.fill()
  ctx.strokeStyle="rgba(255,255,255,0.06)"; ctx.lineWidth=1; ctx.stroke()

  drawVent(ctx, x+w*0.14, y+h*0.5, h*0.7)
  drawVent(ctx, x+w*0.86, y+h*0.5, h*0.7)

  // fileira de botões redondos decorativos no centro
  const n=4, btnR=h*0.09
  for(let i=0;i<n;i++){
    const bx = x+w*0.38 + (i/(n-1))*w*0.24
    const by = y+h*0.68
    ctx.beginPath(); ctx.arc(bx,by,btnR,0,Math.PI*2)
    ctx.fillStyle="#150f18"; ctx.fill()
    ctx.strokeStyle="rgba(224,139,58,0.35)"; ctx.lineWidth=1; ctx.stroke()
  }
  ctx.restore()
}

// grelha de ventilação decorativa — só textura de painel (profundidade),
// sem função nenhuma no jogo
function drawVent(ctx:CanvasRenderingContext2D,cx:number,cy:number,size:number){
  ctx.save()
  rRect(ctx,cx-size*0.45,cy-size*0.5,size*0.9,size,size*0.15)
  ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fill()
  const slats=5
  for(let i=0;i<slats;i++){
    const sy=cy-size*0.5+(i+0.5)*(size/slats)
    ctx.strokeStyle="rgba(255,255,255,0.07)"
    ctx.lineWidth=Math.max(1,size*0.03)
    ctx.beginPath(); ctx.moveTo(cx-size*0.36,sy); ctx.lineTo(cx+size*0.36,sy); ctx.stroke()
  }
  ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=1
  rRect(ctx,cx-size*0.45,cy-size*0.5,size*0.9,size,size*0.15); ctx.stroke()
  ctx.restore()
}

function rRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}
