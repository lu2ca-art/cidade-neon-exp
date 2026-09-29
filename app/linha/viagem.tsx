"use client"

// A viagem entre estações: a Kombi atravessando a cidade alagada à noite.
// Pseudo-3D (projeção de segmentos, a técnica clássica), mas tudo que dá
// SENSAÇÃO é tratado como prioridade: física com marchas e força
// centrífuga, câmera que abre e treme com a velocidade, asfalto molhado
// refletindo o neon, luzes pulsando no grave da música, motor sintetizado,
// vento, pneu, zebra — e vibração do celular nos momentos certos.
//
// A estrada também é onde as rádios destravam: orbs de sinal e passadas
// raspando no tráfego enchem o medidor da próxima frequência.

import { useCallback, useEffect, useRef, useState } from "react"
import type { Estacao } from "./data"
import { VOZES } from "./roteiros"
import { FREQUENCIAS, faixasDe, freqsLiberadas, proximaFreq, type FreqId, type Frequencia } from "./radio"
import type { Save } from "./estado"
import { audioCtx, estatica, gota, player } from "./som"

/* ─── constantes da estrada ─────────────────────────────── */
const SEG = 200
const RUMBLE = 3
const ROAD_W = 2000
const CAM_H = 1000
const DRAW = 180
const MAX = SEG * 60 // velocidade máxima (unidades/s)
const ACCEL = MAX / 4.2
const BRAKE = -MAX * 1.1
const DECEL = -MAX / 6
const OFF_DECEL = -MAX / 1.8
const OFF_LIMIT = MAX / 3.2
const CENTRIF = 0.32
const MARCHAS = [0, 0.2, 0.4, 0.6, 0.8, 1.45]
const NEON = ["#2fe8ff", "#ff3fb0", "#ffc857", "#b38cff", "#ff6a35", "#5dffa0"]
const NEVOA = [11, 15, 36] // #0b0f24

type P = { world: { x: number; y: number; z: number }; camera: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } }
type Sprite = { k: "poste" | "placa" | "predio" | "orb"; x: number; cor: string; txt?: string; pego?: boolean; h?: number; img?: number }
type Carro = { z: number; x: number; v: number; cor: string; passou?: boolean; bateu?: boolean }
type Seg = { i: number; p1: P; p2: P; curva: number; sprites: Sprite[]; carros: Carro[]; claro: boolean; fog: number; clip: number }

const pt = (z: number, y: number): P => ({ world: { x: 0, y, z }, camera: { x: 0, y: 0, z: 0 }, screen: { x: 0, y: 0, w: 0, scale: 0 } })

function projetar(p: P, cx: number, cy: number, cz: number, depth: number, w: number, h: number) {
  p.camera.x = p.world.x - cx
  p.camera.y = p.world.y - cy
  p.camera.z = p.world.z - cz
  p.screen.scale = depth / p.camera.z
  p.screen.x = w / 2 + p.screen.scale * p.camera.x * w / 2
  p.screen.y = h / 2 - p.screen.scale * p.camera.y * h / 2
  p.screen.w = p.screen.scale * ROAD_W * w / 2
}

const easeIn = (a: number, b: number, t: number) => a + (b - a) * t * t
const easeInOut = (a: number, b: number, t: number) => a + (b - a) * (-Math.cos(t * Math.PI) / 2 + 0.5)

function rng(seed: number) {
  let s = seed || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

// placas de neon na beira da estrada — anúncios do NÚCLEO no meio da
// cidade que ainda resiste
const PLACAS = ["NÚCLEO ✓", "OTIMIZE-SE", "222", "SABE ONTEM?", "NÃO PARE", "CHUVA", "DOPAMINA", "NECTAR", "VOCÊ ESTÁ FELIZ ✓", "LINHA 222", "ACORDA"]

function montarEstrada(seed: number, comprimento: number) {
  const r = rng(seed)
  const segs: Seg[] = []
  const ultimoY = () => (segs.length ? segs[segs.length - 1].p2.world.y : 0)
  const add = (curva: number, y: number) => {
    const n = segs.length
    segs.push({ i: n, p1: pt(n * SEG, ultimoY()), p2: pt((n + 1) * SEG, y), curva, sprites: [], carros: [], claro: Math.floor(n / RUMBLE) % 2 === 0, fog: 0, clip: 0 })
  }
  const trecho = (entra: number, fica: number, sai: number, curva: number, alt: number) => {
    const y0 = ultimoY()
    const y1 = y0 + alt * SEG
    const tot = entra + fica + sai
    for (let n = 0; n < entra; n++) add(easeIn(0, curva, n / entra), easeInOut(y0, y1, n / tot))
    for (let n = 0; n < fica; n++) add(curva, easeInOut(y0, y1, (entra + n) / tot))
    for (let n = 0; n < sai; n++) add(easeInOut(curva, 0, n / sai), easeInOut(y0, y1, (entra + fica + n) / tot))
  }
  trecho(20, 40, 20, 0, 0)
  while (segs.length < comprimento) {
    const tipo = r()
    const len = 25 + Math.floor(r() * 45)
    const curva = (r() < 0.5 ? -1 : 1) * (1.5 + r() * 4.5)
    const alt = (r() - 0.5) * 70
    if (tipo < 0.18) trecho(len, len, len, 0, alt * 0.4)
    else if (tipo < 0.7) trecho(len, len, len, curva, alt * 0.3)
    else trecho(len / 2, len, len / 2, curva * 0.7, alt)
  }
  // chegada: reta plana até a estação
  trecho(20, 90, 20, 0, -ultimoY() / SEG)

  // sprites
  for (let n = 30; n < segs.length - 60; n += 7) {
    const cor = NEON[Math.floor(n / 7) % NEON.length]
    segs[n].sprites.push({ k: "poste", x: -1.25, cor })
    segs[n].sprites.push({ k: "poste", x: 1.25, cor: NEON[(Math.floor(n / 7) + 2) % NEON.length] })
  }
  for (let n = 50; n < segs.length - 60; n += 38 + Math.floor(r() * 20)) {
    segs[n].sprites.push({ k: "placa", x: r() < 0.5 ? -2.1 : 2.1, cor: NEON[Math.floor(r() * NEON.length)], txt: PLACAS[Math.floor(r() * PLACAS.length)] })
  }
  for (let n = 10; n < segs.length; n += 5) {
    segs[n].sprites.push({ k: "predio", x: (r() < 0.5 ? -1 : 1) * (3 + r() * 5), cor: NEON[Math.floor(r() * NEON.length)], h: 0.8 + r() * 1.6, img: Math.floor(r() * 4) })
  }
  // orbs de sinal em pequenos colares (recompensa por seguir a linha certa)
  for (let n = 60; n < segs.length - 120; n += 40 + Math.floor(r() * 35)) {
    const x0 = (r() - 0.5) * 1.3
    const dx = (r() - 0.5) * 0.08
    for (let k = 0; k < 5; k++) segs[n + k * 4].sprites.push({ k: "orb", x: Math.max(-0.8, Math.min(0.8, x0 + dx * k * 4)), cor: "#2fe8ff" })
  }
  // tráfego
  const carros: Carro[] = []
  const nCarros = Math.floor(segs.length / 40)
  for (let i = 0; i < nCarros; i++) {
    const z = (140 + Math.floor(r() * (segs.length - 260))) * SEG
    const c: Carro = { z, x: [-0.62, 0, 0.62][Math.floor(r() * 3)], v: MAX * (0.25 + r() * 0.3), cor: ["#ff3fb0", "#ffc857", "#2fe8ff", "#e9e3d5"][Math.floor(r() * 4)] }
    carros.push(c)
    segs[Math.floor(z / SEG)].carros.push(c)
  }
  return { segs, carros }
}

/* ─── prédios pré-renderizados (janelas acesas) ─────────── */
function prediosOffscreen() {
  return [0, 1, 2, 3].map((k) => {
    const c = document.createElement("canvas")
    c.width = 120
    c.height = 360
    const g = c.getContext("2d")!
    g.fillStyle = "#070a1a"
    g.fillRect(0, 0, 120, 360)
    const r = rng(k * 97 + 3)
    for (let y = 14; y < 350; y += 16)
      for (let x = 10; x < 110; x += 14) {
        if (r() < 0.42) {
          g.fillStyle = r() < 0.7 ? `rgba(255,${190 + Math.floor(r() * 50)},${120 + Math.floor(r() * 60)},${0.35 + r() * 0.5})` : NEON[Math.floor(r() * NEON.length)]
          g.fillRect(x, y, 7, 8)
        }
      }
    if (k % 2) {
      g.strokeStyle = NEON[k]
      g.lineWidth = 3
      g.strokeRect(2, 2, 116, 356)
    }
    return c
  })
}

function horizonte(w: number, h: number, camada: number) {
  const c = document.createElement("canvas")
  c.width = w * 2
  c.height = h
  const g = c.getContext("2d")!
  const r = rng(11 + camada * 5)
  let x = 0
  while (x < w * 2) {
    const bw = 20 + r() * (camada ? 50 : 30)
    const bh = (camada ? 0.16 : 0.1) * h + r() * (camada ? 0.2 : 0.12) * h
    g.fillStyle = camada ? "#0a0d22" : "#101634"
    g.fillRect(x, h - bh, bw, bh)
    for (let yy = h - bh + 6; yy < h - 4; yy += 7)
      for (let xx = x + 4; xx < x + bw - 4; xx += 6)
        if (r() < (camada ? 0.14 : 0.08)) {
          g.fillStyle = r() < 0.5 ? "rgba(255,200,140,.6)" : NEON[Math.floor(r() * NEON.length)] + "aa"
          g.fillRect(xx, yy, 2, 3)
        }
    x += bw + r() * 6
  }
  return c
}

/* ─── motor de som ──────────────────────────────────────── */
function montarMotor() {
  const c = audioCtx()
  if (!c) return null
  const out = c.createGain()
  out.gain.value = 0
  out.gain.setTargetAtTime(1, c.currentTime, 0.4)
  out.connect(c.destination)

  const o1 = c.createOscillator()
  o1.type = "sawtooth"
  const o2 = c.createOscillator()
  o2.type = "square"
  const lp = c.createBiquadFilter()
  lp.type = "lowpass"
  lp.frequency.value = 500
  lp.Q.value = 4
  const mg = c.createGain()
  mg.gain.value = 0.05
  o1.connect(lp)
  o2.connect(lp)
  lp.connect(mg).connect(out)

  const ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
  const d = ruido.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const fonteRuido = (f: number, q: number, tipo: BiquadFilterType) => {
    const s = c.createBufferSource()
    s.buffer = ruido
    s.loop = true
    const bf = c.createBiquadFilter()
    bf.type = tipo
    bf.frequency.value = f
    bf.Q.value = q
    const g = c.createGain()
    g.gain.value = 0
    s.connect(bf).connect(g).connect(out)
    s.start()
    return { s, g }
  }
  const vento = fonteRuido(900, 0.4, "bandpass")
  const pneu = fonteRuido(2600, 9, "bandpass")
  const zebra = fonteRuido(140, 1, "lowpass")
  o1.start()
  o2.start()

  let ultimaMarcha = 1
  return {
    atualizar(v: number, acel: boolean, curvaPneu: number, naZebra: boolean, turbo: boolean) {
      const t = c.currentTime
      const pct = v / MAX
      let m = 1
      while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
      const lo = MARCHAS[m - 1]
      const hi = MARCHAS[m]
      const rpm = Math.max(0, Math.min(1, (pct - lo) / (hi - lo)))
      const f = 42 + rpm * 95 + m * 9 + (turbo ? 18 : 0)
      o1.frequency.setTargetAtTime(f, t, 0.04)
      o2.frequency.setTargetAtTime(f / 2, t, 0.04)
      lp.frequency.setTargetAtTime(300 + rpm * 1500 * (acel ? 1 : 0.5) + (turbo ? 900 : 0), t, 0.05)
      mg.gain.setTargetAtTime(0.035 + (acel ? 0.03 : 0.01), t, 0.08)
      vento.g.gain.setTargetAtTime(pct * pct * 0.13, t, 0.1)
      pneu.g.gain.setTargetAtTime(curvaPneu * 0.07, t, 0.05)
      zebra.g.gain.setTargetAtTime(naZebra ? 0.5 : 0, t, 0.03)
      if (m !== ultimaMarcha) {
        if (m > ultimaMarcha) {
          mg.gain.cancelScheduledValues(t)
          mg.gain.setValueAtTime(0.005, t)
          mg.gain.linearRampToValueAtTime(0.06, t + 0.14)
          vib(14)
        }
        ultimaMarcha = m
      }
      return m
    },
    parar() {
      out.gain.setTargetAtTime(0, c.currentTime, 0.2)
      setTimeout(() => {
        try { o1.stop(); o2.stop(); vento.s.stop(); pneu.s.stop(); zebra.s.stop() } catch {}
        out.disconnect()
      }, 800)
    },
    baque() {
      const s = c.createOscillator()
      const g = c.createGain()
      s.type = "sine"
      s.frequency.setValueAtTime(90, c.currentTime)
      s.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.35)
      g.gain.setValueAtTime(0.6, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
      s.connect(g).connect(out)
      s.start()
      s.stop(c.currentTime + 0.45)
    },
    whoosh() {
      const s = c.createBufferSource()
      s.buffer = ruido
      const bf = c.createBiquadFilter()
      bf.type = "bandpass"
      bf.Q.value = 1.2
      bf.frequency.setValueAtTime(400, c.currentTime)
      bf.frequency.exponentialRampToValueAtTime(3000, c.currentTime + 0.3)
      const g = c.createGain()
      g.gain.setValueAtTime(0.35, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
      s.connect(bf).connect(g).connect(out)
      s.start()
      s.stop(c.currentTime + 0.45)
    },
  }
}

function vib(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch {}
}

/* ─── componente ────────────────────────────────────────── */
export interface Stats {
  tempo: number
  vmax: number
  orbs: number
  quase: number
  batidas: number
  sinal: number
}

interface Props {
  destino: Estacao
  save: Save
  turbo: boolean
  onSinal: (total: number, freq?: FreqId) => void
  onChegar: (s: Stats) => void
  onSair: () => void
}

type Toast = { id: number; de: string; texto: string }

export function Viagem({ destino, save, turbo: temTurbo, onSinal, onChegar, onSair }: Props) {
  const cvs = useRef<HTMLCanvasElement>(null)
  const hudVel = useRef<HTMLSpanElement>(null)
  const hudMarcha = useRef<HTMLSpanElement>(null)
  const hudProg = useRef<HTMLDivElement>(null)
  const hudSinal = useRef<HTMLDivElement>(null)
  const hudTurbo = useRef<HTMLDivElement>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [popup, setPopup] = useState<{ id: number; txt: string; cor: string } | null>(null)
  const [travou, setTravou] = useState<Frequencia | null>(null)
  const [freq, setFreq] = useState<FreqId>((save.freq as FreqId) || "linha")
  const [faixa, setFaixa] = useState<string>("")
  const [chegou, setChegou] = useState<Stats | null>(null)
  const [dica, setDica] = useState(true)
  const [prox, setProx] = useState(() => proximaFreq(save.sinal))
  const input = useRef({ esq: false, dir: false, freio: false, acel: true, turbo: false })
  const toastId = useRef(0)
  const sinalRef = useRef(save.sinal)
  const freqRef = useRef(freq)
  useEffect(() => { freqRef.current = freq }, [freq])

  const falar = useCallback((de: string, texto: string) => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-1), { id, de, texto }])
    gota(6)
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  // rádio: toca a frequência escolhida em sequência
  const proxFaixa = useRef<(id: FreqId, idx: number) => void>(() => {})
  const tocarFreq = useCallback((id: FreqId, idx = 0) => {
    const f = FREQUENCIAS.find((x) => x.id === id)!
    let lista = faixasDe(f, save.objetos, save.estacao)
    if (!lista.length) lista = faixasDe(FREQUENCIAS[4], [], null)
    if (!lista.length) return
    const fx = lista[idx % lista.length]
    setFaixa(fx.titulo)
    player.tocar(fx.src, () => proxFaixa.current(freqRef.current, idx + 1))
  }, [save.objetos, save.estacao])
  useEffect(() => { proxFaixa.current = tocarFreq }, [tocarFreq])

  useEffect(() => {
    // liga o rádio ao entrar no carro (efeito externo: áudio)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    tocarFreq(freq)
    const t = setTimeout(() => setDica(false), 4500)
    return () => { clearTimeout(t); player.pausar() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trocarFreq = () => {
    const lib = freqsLiberadas(sinalRef.current)
    const i = lib.findIndex((f) => f.id === freq)
    const nova = lib[(i + 1) % lib.length]
    setFreq(nova.id)
    freqRef.current = nova.id
    const est = estatica()
    est?.volume(0.18)
    setTimeout(() => est?.parar(), 260)
    tocarFreq(nova.id)
    onSinal(sinalRef.current, nova.id)
  }

  useEffect(() => {
    const canvas = cvs.current!
    const g = canvas.getContext("2d")!
    const reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const seed = destino.n * 7919 + Math.floor(Date.now() / 86400000)
    const { segs, carros } = montarEstrada(seed, 640 + destino.n * 25)
    const total = segs.length * SEG
    const predios = prediosOffscreen()
    let w = 0
    let h = 0
    let sky: HTMLCanvasElement[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    const resize = () => {
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      sky = [horizonte(w, h * 0.55, 0), horizonte(w, h * 0.55, 1)]
    }
    resize()
    window.addEventListener("resize", resize)

    const motor = montarMotor()
    const chuva = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), l: 0.5 + Math.random() }))
    const linhas = Array.from({ length: 40 }, () => ({ a: Math.random() * Math.PI * 2, d: Math.random() }))
    const particulas: { x: number; y: number; vx: number; vy: number; v: number; cor: string }[] = []

    let pos = 0
    let x = 0
    let v = 0
    let skyOff = 0
    let shake = 0
    let flash = 0
    let flashCor = "#fff"
    let turboT = 0
    let turboCarga = 0
    let inclina = 0
    let tempo = 0
    const st: Stats = { tempo: 0, vmax: 0, orbs: 0, quase: 0, batidas: 0, sinal: 0 }
    let fim = false
    let parou = false
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudT = 0
    let proxFala = 5
    let zebraVib = 0
    const falas = [
      { de: destino.personagem, texto: destino.id === "nectar" ? "tô te esperando no fim da linha" : "tô te esperando na estação" },
      { de: "D-Bee", texto: "o núcleo apagou os radares nessa rua. aproveita" },
      { de: "Notti", texto: "MAIS RÁPIDO" },
      { de: "Ella", texto: "vai com calma na curva molhada" },
      { de: "Mubarak", texto: "a Kombi aguenta. confia" },
    ]
    let falaIdx = 0

    const ganharSinal = (n: number, rotulo: string, cor: string) => {
      sinalRef.current += n
      st.sinal += n
      const p = proximaFreq(sinalRef.current - n)
      setPopup({ id: Math.random(), txt: rotulo, cor })
      if (p && sinalRef.current >= p.custo) {
        // TRAVOU: frequência nova entra ao vivo
        const est = estatica()
        est?.volume(0.35)
        setTimeout(() => est?.volume(0.12), 300)
        setTimeout(() => est?.parar(), 700)
        flash = 1
        flashCor = p.cor
        vib([30, 40, 30, 40, 120])
        setTravou(p)
        setFreq(p.id)
        freqRef.current = p.id
        setTimeout(() => tocarFreq(p.id), 650)
        setTimeout(() => setTravou(null), 3800)
        setTimeout(() => falar("D-Bee", `vc achou a ${p.freq}. o núcleo odeia essa`), 1800)
        onSinal(sinalRef.current, p.id)
      } else onSinal(sinalRef.current)
      setProx(proximaFreq(sinalRef.current))
    }

    const passo = (dt: number) => {
      tempo += dt
      const seg = segs[Math.floor(pos / SEG) % segs.length]
      const pct = v / MAX
      const dx = dt * 2.2 * pct
      const inp = input.current
      const maxAgora = turboT > 0 ? MAX * 1.4 : MAX

      // chegada: freia sozinho
      if (pos > total - 120 * SEG) fim = true
      if (fim) {
        v = Math.max(0, v + BRAKE * 0.35 * dt)
        x += (0 - x) * dt * 1.5
        if (v < 200 && !parou) {
          parou = true
          st.tempo = tempo
          motor?.parar()
          setChegou({ ...st })
        }
      } else {
        const steer = (inp.esq ? -1 : 0) + (inp.dir ? 1 : 0)
        x += steer * dx
        x -= dx * pct * seg.curva * CENTRIF
        inclina += ((steer * 0.08 + seg.curva * pct * 0.012) - inclina) * dt * 6
        if (inp.freio) v += BRAKE * dt
        else if (inp.acel) v += ACCEL * (1 - Math.pow(Math.min(1, v / maxAgora), 1.6) * 0.7) * dt
        else v += DECEL * dt
        if (turboT > 0) {
          turboT -= dt
          v += ACCEL * 1.2 * dt
        }
        if ((x < -1 || x > 1) && v > OFF_LIMIT) v += OFF_DECEL * dt
        v = Math.max(0, Math.min(v, maxAgora))
        x = Math.max(-2.2, Math.min(2.2, x))
      }
      st.vmax = Math.max(st.vmax, v)
      pos = Math.min(pos + v * dt, total - SEG)

      // zebra
      const naZebra = Math.abs(x) > 0.92 && Math.abs(x) < 1.1 && v > MAX * 0.2
      if (naZebra) {
        shake = Math.max(shake, 0.35)
        zebraVib -= dt
        if (zebraVib <= 0) { vib(18); zebraVib = 0.12 }
      }
      const pneu = Math.min(1, Math.abs(seg.curva) * pct * (Math.abs(inclina) > 0.05 ? 1 : 0.2) / 3)
      motor?.atualizar(v, input.current.acel && !input.current.freio, pneu, naZebra, turboT > 0)

      // tráfego
      const zPlayer = pos + CAM_H * 0.84
      for (const c of carros) {
        const antes = Math.floor(c.z / SEG)
        c.z += c.v * dt
        const depois = Math.floor(c.z / SEG)
        if (depois !== antes && depois < segs.length) {
          const a = segs[antes].carros
          a.splice(a.indexOf(c), 1)
          segs[depois].carros.push(c)
        }
        const dz = c.z - zPlayer
        const dxC = Math.abs(c.x - x)
        if (!c.bateu && dz < SEG * 0.8 && dz > -SEG * 0.3 && dxC < 0.34 && v > c.v) {
          c.bateu = true
          st.batidas++
          v = c.v * 0.7
          shake = 1.4
          flash = 0.5
          flashCor = "#ff3b3b"
          motor?.baque()
          vib([50, 30, 80])
          falar("Ella", "tá tudo bem??")
        }
        if (!c.passou && dz < -SEG * 0.3) {
          c.passou = true
          if (!c.bateu && dxC < 0.62 && v > MAX * 0.45) {
            st.quase++
            turboCarga = Math.min(1, turboCarga + 0.3)
            motor?.whoosh()
            vib(25)
            ganharSinal(3, "QUASE! +3", "#ff3fb0")
            if (st.quase === 1 || Math.random() < 0.3) falar(["Notti", "Mubarak", "BBX"][st.quase % 3], ["KKKK QUASE", "doido", "respira mano"][st.quase % 3])
          }
        }
      }

      // orbs
      for (let k = 0; k < 3; k++) {
        const s2 = segs[(Math.floor(zPlayer / SEG) + k) % segs.length]
        for (const sp of s2.sprites) {
          if (sp.k === "orb" && !sp.pego && Math.abs(sp.x - x) < 0.28 && Math.abs(s2.p1.world.z - zPlayer) < SEG * 1.2) {
            sp.pego = true
            st.orbs++
            turboCarga = Math.min(1, turboCarga + 0.1)
            gota(st.orbs + 2)
            vib(10)
            for (let q = 0; q < 12; q++)
              particulas.push({ x: w / 2 + (sp.x - x) * w * 0.3, y: h * 0.8, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 380, v: 1, cor: "#2fe8ff" })
            ganharSinal(1, "+1 sinal", "#2fe8ff")
          }
        }
      }

      if (inp.turbo && temTurbo && turboCarga >= 1 && turboT <= 0) {
        turboT = 2.6
        turboCarga = 0
        flash = 0.45
        flashCor = "#b38cff"
        motor?.whoosh()
        vib([20, 20, 60])
      }
      inp.turbo = false

      // mensagens da cidade no caminho
      if (tempo > proxFala && falaIdx < falas.length && !fim) {
        const f = falas[falaIdx++]
        falar(f.de, f.texto)
        proxFala = tempo + 7 + Math.random() * 5
      }

      skyOff += seg.curva * pct * dt * 0.012
      shake = Math.max(0, shake - dt * 2.2)
      flash = Math.max(0, flash - dt * 1.6)
      for (const p of particulas) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 900 * dt
        p.v -= dt * 1.4
      }
      for (let i = particulas.length - 1; i >= 0; i--) if (particulas[i].v <= 0) particulas.splice(i, 1)
    }

    const desenhar = () => {
      const pct = v / MAX
      const grave = player.grave()
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const amp = reduz ? 0 : shake * 6 + pct * pct * 1.4
      g.translate((Math.random() - 0.5) * amp, (Math.random() - 0.5) * amp)

      // céu
      const ceu = g.createLinearGradient(0, 0, 0, h * 0.6)
      ceu.addColorStop(0, "#04040f")
      ceu.addColorStop(0.55, "#101a4a")
      ceu.addColorStop(1, "#3a1850")
      g.fillStyle = ceu
      g.fillRect(-10, -10, w + 20, h + 20)

      const base = segs[Math.floor(pos / SEG) % segs.length]
      const basePct = (pos % SEG) / SEG
      const zPlayer = pos + CAM_H * 0.84
      const segP = segs[Math.floor(zPlayer / SEG) % segs.length]
      const pPct = (zPlayer % SEG) / SEG
      const playerY = segP.p1.world.y + (segP.p2.world.y - segP.p1.world.y) * pPct
      const horiz = h * 0.5 + Math.max(-40, Math.min(40, playerY / 60))

      // horizonte em duas camadas (parallax)
      for (let k = 0; k < 2; k++) {
        const img = sky[k]
        const off = (((skyOff * (k ? 1.6 : 0.8)) % 1) + 1) % 1
        const sx = off * w
        g.globalAlpha = k ? 1 : 0.8
        g.drawImage(img, sx, 0, w, img.height, 0, horiz - img.height + 6, w, img.height)
        g.drawImage(img, 0, 0, Math.max(1, sx), img.height, w - sx, horiz - img.height + 6, sx, img.height)
      }
      g.globalAlpha = 1

      // estrada
      const fov = 100 + pct * 14 + (turboT > 0 ? 12 : 0)
      const depth = 1 / Math.tan(((fov / 2) * Math.PI) / 180)
      let maxy = h
      let xAcc = 0
      let dxAcc = -(base.curva * basePct)
      const camX = x * ROAD_W
      const camY = CAM_H + playerY
      for (let n = 0; n < DRAW; n++) {
        const s = segs[(base.i + n) % segs.length]
        s.fog = Math.min(1, Math.pow(n / DRAW, 1.6) * 1.15)
        projetar(s.p1, camX - xAcc, camY, pos, depth, w, h)
        projetar(s.p2, camX - xAcc - dxAcc, camY, pos, depth, w, h)
        s.p1.screen.y += horiz - h / 2
        s.p2.screen.y += horiz - h / 2
        xAcc += dxAcc
        dxAcc += s.curva
        s.clip = maxy
        if (s.p1.camera.z <= depth || s.p2.screen.y >= s.p1.screen.y || s.p2.screen.y >= maxy) continue
        desenharSegmento(g, w, s, grave)
        maxy = s.p1.screen.y
      }

      // sprites e carros, de trás pra frente
      for (let n = DRAW - 1; n > 0; n--) {
        const s = segs[(base.i + n) % segs.length]
        for (const c of s.carros) {
          const pc = (c.z % SEG) / SEG
          const sc = s.p1.screen.scale + (s.p2.screen.scale - s.p1.screen.scale) * pc
          const sx = s.p1.screen.x + (s.p2.screen.x - s.p1.screen.x) * pc + (sc * c.x * ROAD_W * w) / 2
          const sy = s.p1.screen.y + (s.p2.screen.y - s.p1.screen.y) * pc
          if (sy > s.clip + 2) continue
          desenharCarro(g, sx, sy, sc * w * 330, c.cor, s.fog)
        }
        for (const sp of s.sprites) {
          if (sp.k === "orb" && sp.pego) continue
          const sc = s.p1.screen.scale
          const sx = s.p1.screen.x + (sc * sp.x * ROAD_W * w) / 2
          const sy = s.p1.screen.y
          if (sy > s.clip + 2 || sc <= 0) continue
          desenharSprite(g, sp, sx, sy, sc * w, s.fog, grave, predios, tempo)
        }
      }

      // farol da Kombi no asfalto
      g.globalCompositeOperation = "lighter"
      const cone = g.createLinearGradient(0, h, 0, horiz)
      cone.addColorStop(0, "rgba(255,240,210,0.10)")
      cone.addColorStop(1, "rgba(255,240,210,0)")
      g.fillStyle = cone
      g.beginPath()
      g.moveTo(w / 2 - w * 0.12, h * 0.86)
      g.lineTo(w / 2 + w * 0.12, h * 0.86)
      g.lineTo(w / 2 + w * 0.03, horiz + 10)
      g.lineTo(w / 2 - w * 0.03, horiz + 10)
      g.fill()
      g.globalCompositeOperation = "source-over"

      // linhas de velocidade
      if (!reduz && pct > 0.55) {
        const a = (pct - 0.55) * (turboT > 0 ? 2.4 : 1.4)
        g.strokeStyle = turboT > 0 ? `rgba(179,140,255,${a})` : `rgba(200,240,255,${a * 0.6})`
        g.lineWidth = 1.2
        for (const l of linhas) {
          l.d += 0.04 + pct * 0.06
          if (l.d > 1) { l.d = 0.15; l.a = Math.random() * Math.PI * 2 }
          const r0 = l.d * w * 0.9
          const r1 = r0 + 30 + pct * 90
          const cx = w / 2
          const cy = horiz
          g.beginPath()
          g.moveTo(cx + Math.cos(l.a) * r0, cy + Math.sin(l.a) * r0 * 0.6)
          g.lineTo(cx + Math.cos(l.a) * r1, cy + Math.sin(l.a) * r1 * 0.6)
          g.stroke()
        }
      }

      // Kombi
      desenharKombi(g, w, h, inclina, shake, v, turboT > 0, tempo)

      // partículas
      g.globalCompositeOperation = "lighter"
      for (const p of particulas) {
        g.fillStyle = p.cor
        g.globalAlpha = Math.max(0, p.v)
        g.fillRect(p.x, p.y, 3, 3)
      }
      g.globalAlpha = 1
      g.globalCompositeOperation = "source-over"

      // chuva: inclina com a velocidade e com a curva
      if (!reduz) {
        g.strokeStyle = "rgba(170,210,255,0.28)"
        g.lineWidth = 1
        const ang = 0.15 + pct * 0.9
        g.beginPath()
        for (const d of chuva) {
          d.y += (0.012 + pct * 0.03) * d.l
          d.x -= (inclina * 0.02) + (d.x - 0.5) * pct * 0.02
          if (d.y > 1 || d.x < 0 || d.x > 1) { d.y = -0.05; d.x = Math.random() }
          const px = d.x * w
          const py = d.y * h
          const len = (10 + pct * 40) * d.l
          g.moveTo(px, py)
          g.lineTo(px - (d.x - 0.5) * len * ang, py + len)
        }
        g.stroke()
      }

      // flash e vinheta
      if (flash > 0) {
        g.fillStyle = flashCor
        g.globalAlpha = flash * 0.35
        g.fillRect(-10, -10, w + 20, h + 20)
        g.globalAlpha = 1
      }
      const vin = g.createRadialGradient(w / 2, h * 0.55, h * 0.25, w / 2, h * 0.55, h * 0.85)
      vin.addColorStop(0, "rgba(0,0,0,0)")
      vin.addColorStop(1, `rgba(0,0,8,${0.55 + pct * 0.2})`)
      g.fillStyle = vin
      g.fillRect(-10, -10, w + 20, h + 20)

      // HUD (DOM, fora do React pra não re-renderizar a 60fps)
      hudT += 1
      if (hudT % 4 === 0) {
        if (hudVel.current) hudVel.current.textContent = String(Math.round(pct * 180))
        if (hudMarcha.current) {
          let m = 1
          while (m < MARCHAS.length - 1 && pct > MARCHAS[m]) m++
          hudMarcha.current.textContent = `${m}ª`
        }
        if (hudProg.current) hudProg.current.style.transform = `scaleX(${Math.min(1, pos / (total - 120 * SEG))})`
        const p = proximaFreq(sinalRef.current)
        const lib = freqsLiberadas(sinalRef.current)
        const anterior = lib[lib.length - 1]?.custo ?? 0
        if (hudSinal.current) hudSinal.current.style.transform = `scaleY(${p ? (sinalRef.current - anterior) / (p.custo - anterior) : 1})`
        if (hudTurbo.current) hudTurbo.current.style.transform = `scaleX(${turboT > 0 ? turboT / 2.6 : turboCarga})`
      }
    }

    const loop = (agora: number) => {
      const dt = Math.min(0.05, (agora - last) / 1000)
      last = agora
      acc += dt
      while (acc >= 1 / 60) {
        passo(1 / 60)
        acc -= 1 / 60
      }
      desenhar()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // teclado
    const tecla = (e: KeyboardEvent, on: boolean) => {
      const k = e.key.toLowerCase()
      if (k === "arrowleft" || k === "a") input.current.esq = on
      else if (k === "arrowright" || k === "d") input.current.dir = on
      else if (k === "arrowdown" || k === "s") input.current.freio = on
      else if (k === " " && on) input.current.turbo = true
      else return
      e.preventDefault()
    }
    const kd = (e: KeyboardEvent) => tecla(e, true)
    const ku = (e: KeyboardEvent) => tecla(e, false)
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
      motor?.parar()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino.id])

  // toque: segurar metade esquerda/direita vira; as duas juntas freiam
  const toques = useRef(new Map<number, "esq" | "dir">())
  const atualizarToque = () => {
    const lados = [...toques.current.values()]
    const esq = lados.includes("esq")
    const dir = lados.includes("dir")
    input.current.freio = esq && dir
    input.current.esq = esq && !dir
    input.current.dir = dir && !esq
  }

  const recorde = save.recordes[destino.id]

  return (
    <div className="l-viagem">
      <canvas
        ref={cvs}
        className="l-viagem-cvs"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          toques.current.set(e.pointerId, e.clientX - r.left < r.width / 2 ? "esq" : "dir")
          atualizarToque()
        }}
        onPointerUp={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
        onPointerCancel={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
        onPointerLeave={(e) => { toques.current.delete(e.pointerId); atualizarToque() }}
        onContextMenu={(e) => e.preventDefault()}
      />

      <div className="l-hud-topo">
        <button type="button" className="l-hud-sair" onClick={onSair} aria-label="sair da viagem">✕</button>
        <div className="l-hud-rota">
          <span>linha 222 → estação {destino.n}</span>
          <b style={{ color: destino.cor }}>{destino.faixa}</b>
          <div className="l-hud-barra"><div ref={hudProg} style={{ background: destino.cor }} /></div>
        </div>
      </div>

      <div className="l-toasts">
        {toasts.map((t) => (
          <div key={t.id} className="l-toast" style={{ ["--cor" as string]: VOZES[t.de] ?? "#fff" }}>
            <b>{t.de}</b> {t.texto}
          </div>
        ))}
      </div>

      {popup && <div key={popup.id} className="l-popup" style={{ color: popup.cor }}>{popup.txt}</div>}

      <div className="l-hud-vel">
        <span ref={hudVel}>0</span>
        <small>km/h</small>
        <span ref={hudMarcha} className="l-hud-marcha">1ª</span>
      </div>

      <button type="button" className="l-hud-radio" onClick={trocarFreq}>
        <span className="l-hud-freq" style={{ color: FREQUENCIAS.find((f) => f.id === freq)?.cor }}>
          {FREQUENCIAS.find((f) => f.id === freq)?.freq} FM
        </span>
        <span className="l-hud-faixa">{faixa || "…"}</span>
        <small>toca pra trocar</small>
      </button>

      <div className="l-hud-sinal" title="sinal da próxima rádio">
        <div className="l-hud-sinal-tubo"><div ref={hudSinal} style={{ background: prox?.cor ?? "#2fe8ff" }} /></div>
        <small>{prox ? prox.freq : "todas"}</small>
      </div>

      <button
        type="button"
        className={`l-hud-turbo ${temTurbo ? "" : "is-trancado"}`}
        onPointerDown={(e) => { e.stopPropagation(); input.current.turbo = true }}
      >
        <div className="l-hud-turbo-barra"><div ref={hudTurbo} /></div>
        <span>{temTurbo ? "turbo" : "turbo · nível cúmplice"}</span>
      </button>

      {dica && (
        <div className="l-hud-dica">
          <span>← segura</span>
          <span>as duas freiam</span>
          <span>segura →</span>
        </div>
      )}

      {travou && (
        <div className="l-travou" style={{ ["--cor" as string]: travou.cor }}>
          <small>sinal travado</small>
          <b>{travou.freq}</b>
          <span>{travou.nome}</span>
        </div>
      )}

      {chegou && (
        <div className="l-chegada" style={{ ["--cor" as string]: destino.cor }}>
          <small>estação {destino.n}</small>
          <h2>{destino.faixa}</h2>
          <p className="l-chegada-cidade">{destino.cidade}</p>
          <dl>
            <div><dt>tempo</dt><dd>{chegou.tempo.toFixed(1)}s{recorde && chegou.tempo < recorde ? " · recorde" : ""}</dd></div>
            <div><dt>máx</dt><dd>{Math.round((chegou.vmax / MAX) * 180)} km/h</dd></div>
            <div><dt>sinal</dt><dd>+{chegou.sinal}</dd></div>
            <div><dt>quase</dt><dd>{chegou.quase}</dd></div>
          </dl>
          <button type="button" className="l-btn" onClick={() => onChegar(chegou)}>descer na estação</button>
        </div>
      )}
    </div>
  )
}

/* ─── desenho ───────────────────────────────────────────── */
function misturar(cor: [number, number, number], f: number) {
  return `rgb(${Math.round(cor[0] + (NEVOA[0] - cor[0]) * f)},${Math.round(cor[1] + (NEVOA[1] - cor[1]) * f)},${Math.round(cor[2] + (NEVOA[2] - cor[2]) * f)})`
}

function quad(g: CanvasRenderingContext2D, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number, cor: string) {
  g.fillStyle = cor
  g.beginPath()
  g.moveTo(x1 - w1, y1)
  g.lineTo(x2 - w2, y2)
  g.lineTo(x2 + w2, y2)
  g.lineTo(x1 + w1, y1)
  g.closePath()
  g.fill()
}

function desenharSegmento(g: CanvasRenderingContext2D, w: number, s: Seg, grave: number) {
  const { p1, p2, fog, claro } = s
  const x1 = p1.screen.x, y1 = p1.screen.y, w1 = p1.screen.w
  const x2 = p2.screen.x, y2 = p2.screen.y, w2 = p2.screen.w
  // água dos dois lados — a cidade está alagada
  g.fillStyle = misturar(claro ? [8, 20, 44] : [6, 14, 34], fog)
  g.fillRect(0, y2, w, y1 - y2)
  // reflexo ondulado na água
  if (s.i % 4 === 0 && fog < 0.8) {
    g.fillStyle = `rgba(47,232,255,${0.05 * (1 - fog)})`
    g.fillRect(0, y2, w, Math.max(1, (y1 - y2) * 0.3))
  }
  // zebra
  const r1 = w1 / 8, r2 = w2 / 8
  const zebra = claro ? `rgba(255,63,176,${0.75 * (1 - fog) + grave * 0.2})` : misturar([26, 14, 42], fog)
  quad(g, x1, y1, w1 + r1, x2, y2, w2 + r2, zebra)
  // asfalto molhado
  quad(g, x1, y1, w1, x2, y2, w2, misturar(claro ? [22, 22, 44] : [17, 17, 36], fog))
  // faixas
  if (claro) {
    const lw1 = w1 / 55, lw2 = w2 / 55
    const cor = `rgba(47,232,255,${(0.7 + grave * 0.3) * (1 - fog)})`
    for (const k of [-1 / 3, 1 / 3]) quad(g, x1 + w1 * k * 2, y1, lw1, x2 + w2 * k * 2, y2, lw2, cor)
  }
}

function desenharSprite(
  g: CanvasRenderingContext2D, sp: Sprite, sx: number, sy: number, sc: number, fog: number, grave: number,
  predios: HTMLCanvasElement[], tempo: number,
) {
  const a = 1 - fog
  if (a <= 0.02) return
  if (sp.k === "predio") {
    const img = predios[sp.img ?? 0]
    const bw = sc * 900
    const bh = bw * 3 * (sp.h ?? 1)
    g.globalAlpha = a
    g.drawImage(img, sx - bw / 2, sy - bh, bw, bh)
    g.globalAlpha = 1
    return
  }
  if (sp.k === "poste") {
    const ph = sc * 1100
    const pw = Math.max(1, sc * 30)
    const lado = sp.x < 0 ? 1 : -1
    g.fillStyle = `rgba(40,44,70,${a})`
    g.fillRect(sx - pw / 2, sy - ph, pw, ph)
    g.fillRect(sx - pw / 2, sy - ph, lado * sc * 220, pw)
    const lx = sx + lado * sc * 220
    const ly = sy - ph
    // postes longe somam luz no horizonte — atenua forte com a distância
    const brilho = (0.5 + grave * 0.6) * Math.pow(a, 3)
    g.globalCompositeOperation = "lighter"
    const halo = g.createRadialGradient(lx, ly, 0, lx, ly, sc * 520)
    halo.addColorStop(0, hexA(sp.cor, brilho))
    halo.addColorStop(1, hexA(sp.cor, 0))
    g.fillStyle = halo
    g.fillRect(lx - sc * 520, ly - sc * 520, sc * 1040, sc * 1040)
    // reflexo no asfalto molhado: um risco de luz descendo até a câmera
    const rf = g.createLinearGradient(0, sy, 0, sy + ph * 0.9)
    rf.addColorStop(0, hexA(sp.cor, 0.22 * brilho))
    rf.addColorStop(1, hexA(sp.cor, 0))
    g.fillStyle = rf
    g.fillRect(lx - sc * 60, sy, sc * 120, ph * 0.9)
    g.globalCompositeOperation = "source-over"
    return
  }
  if (sp.k === "placa") {
    const pw = sc * 1500
    const ph = sc * 520
    const py = sy - sc * 1500
    g.fillStyle = `rgba(20,16,40,${a * 0.9})`
    g.fillRect(sx - pw / 2, py, pw, ph)
    g.strokeStyle = hexA(sp.cor, a)
    g.lineWidth = Math.max(1, sc * 30)
    g.shadowColor = sp.cor
    g.shadowBlur = 14 * a * (0.6 + grave)
    g.strokeRect(sx - pw / 2, py, pw, ph)
    if (ph > 7) {
      g.fillStyle = hexA(sp.cor, a)
      g.font = `${Math.round(ph * 0.55)}px Outward, "Arial Narrow", sans-serif`
      g.textAlign = "center"
      g.textBaseline = "middle"
      g.fillText(sp.txt ?? "", sx, py + ph / 2, pw * 0.9)
    }
    g.shadowBlur = 0
    g.fillStyle = `rgba(40,44,70,${a})`
    g.fillRect(sx - sc * 20, py + ph, sc * 40, sy - py - ph)
    return
  }
  if (sp.k === "orb") {
    const r = Math.max(2, sc * 130)
    const oy = sy - sc * 260 - Math.sin(tempo * 4 + sx * 0.01) * sc * 60
    g.globalCompositeOperation = "lighter"
    const halo = g.createRadialGradient(sx, oy, 0, sx, oy, r * 2.4)
    halo.addColorStop(0, hexA(sp.cor, 0.8 * a))
    halo.addColorStop(1, hexA(sp.cor, 0))
    g.fillStyle = halo
    g.fillRect(sx - r * 2.4, oy - r * 2.4, r * 4.8, r * 4.8)
    g.strokeStyle = hexA("#ffffff", 0.9 * a)
    g.lineWidth = Math.max(1, r * 0.18)
    g.beginPath()
    g.ellipse(sx, oy, r, r * (0.5 + 0.5 * Math.abs(Math.sin(tempo * 3))), 0, 0, Math.PI * 2)
    g.stroke()
    g.globalCompositeOperation = "source-over"
  }
}

function desenharCarro(g: CanvasRenderingContext2D, sx: number, sy: number, cw: number, cor: string, fog: number) {
  const a = 1 - fog
  if (a <= 0.02 || cw < 2) return
  const ch = cw * 0.55
  g.fillStyle = `rgba(14,14,28,${a})`
  g.beginPath()
  g.roundRect(sx - cw / 2, sy - ch, cw, ch, cw * 0.08)
  g.fill()
  g.fillStyle = `rgba(30,30,55,${a})`
  g.beginPath()
  g.roundRect(sx - cw * 0.36, sy - ch * 1.35, cw * 0.72, ch * 0.45, cw * 0.08)
  g.fill()
  g.fillStyle = hexA(cor, 0.35 * a)
  g.fillRect(sx - cw / 2, sy - ch * 0.55, cw, cw * 0.03)
  g.globalCompositeOperation = "lighter"
  for (const k of [-1, 1]) {
    const lx = sx + k * cw * 0.36
    const ly = sy - ch * 0.62
    const halo = g.createRadialGradient(lx, ly, 0, lx, ly, cw * 0.35)
    halo.addColorStop(0, `rgba(255,40,60,${0.9 * a})`)
    halo.addColorStop(1, "rgba(255,40,60,0)")
    g.fillStyle = halo
    g.fillRect(lx - cw * 0.35, ly - cw * 0.35, cw * 0.7, cw * 0.7)
    // reflexo vermelho no chão molhado
    const rf = g.createLinearGradient(0, sy, 0, sy + ch * 1.6)
    rf.addColorStop(0, `rgba(255,40,60,${0.3 * a})`)
    rf.addColorStop(1, "rgba(255,40,60,0)")
    g.fillStyle = rf
    g.fillRect(lx - cw * 0.06, sy, cw * 0.12, ch * 1.6)
  }
  g.globalCompositeOperation = "source-over"
}

function desenharKombi(g: CanvasRenderingContext2D, w: number, h: number, inclina: number, shake: number, v: number, turbo: boolean, tempo: number) {
  const kw = Math.min(250, w * 0.42)
  const kh = kw * 0.86
  const cx = w / 2
  const base = h - Math.max(18, h * 0.04) + Math.sin(tempo * 22) * (v / MAX) * 1.2 + shake * 3
  g.save()
  g.translate(cx, base)
  g.rotate(inclina * 0.9)
  // luz embaixo no chão molhado
  g.globalCompositeOperation = "lighter"
  const ug = g.createRadialGradient(0, -4, 0, 0, -4, kw * 0.8)
  ug.addColorStop(0, turbo ? "rgba(179,140,255,.5)" : "rgba(255,63,176,.35)")
  ug.addColorStop(1, "rgba(0,0,0,0)")
  g.fillStyle = ug
  g.fillRect(-kw, -kw * 0.4, kw * 2, kw * 0.6)
  g.globalCompositeOperation = "source-over"
  // pneus
  g.fillStyle = "#050508"
  g.fillRect(-kw * 0.46, -kh * 0.12, kw * 0.18, kh * 0.14)
  g.fillRect(kw * 0.28, -kh * 0.12, kw * 0.18, kh * 0.14)
  // corpo inferior (azul da capa) e superior (creme)
  g.fillStyle = "#1a3fa0"
  g.beginPath()
  g.roundRect(-kw / 2, -kh * 0.55, kw, kh * 0.5, [0, 0, kw * 0.1, kw * 0.1])
  g.fill()
  g.fillStyle = "#e9e3d5"
  g.beginPath()
  g.roundRect(-kw / 2, -kh, kw, kh * 0.47, [kw * 0.22, kw * 0.22, 0, 0])
  g.fill()
  // luz de neon da rua batendo na lataria
  const lat = g.createLinearGradient(-kw / 2, 0, kw / 2, 0)
  lat.addColorStop(0, "rgba(47,232,255,.28)")
  lat.addColorStop(0.5, "rgba(0,0,0,0)")
  lat.addColorStop(1, "rgba(255,63,176,.28)")
  g.fillStyle = lat
  g.fillRect(-kw / 2, -kh, kw, kh * 0.95)
  // vidro traseiro
  g.fillStyle = "#0b0f24"
  g.beginPath()
  g.roundRect(-kw * 0.36, -kh * 0.9, kw * 0.72, kh * 0.26, kw * 0.05)
  g.fill()
  g.fillStyle = "rgba(47,232,255,.12)"
  g.fillRect(-kw * 0.3, -kh * 0.88, kw * 0.12, kh * 0.22)
  // "V" de lataria e grade do motor
  g.strokeStyle = "rgba(10,10,30,.55)"
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-kw * 0.2, -kh * 0.55)
  g.lineTo(0, -kh * 0.4)
  g.lineTo(kw * 0.2, -kh * 0.55)
  g.stroke()
  for (let i = 0; i < 5; i++) {
    g.beginPath()
    g.moveTo(-kw * 0.12 + i * kw * 0.06, -kh * 0.3)
    g.lineTo(-kw * 0.12 + i * kw * 0.06, -kh * 0.2)
    g.stroke()
  }
  // placa
  g.fillStyle = "#d9d9d9"
  g.fillRect(-kw * 0.13, -kh * 0.17, kw * 0.26, kh * 0.08)
  g.fillStyle = "#101010"
  g.font = `bold ${Math.round(kh * 0.055)}px ui-monospace, monospace`
  g.textAlign = "center"
  g.textBaseline = "middle"
  g.fillText("LU2 C4", 0, -kh * 0.13)
  // lanternas
  g.globalCompositeOperation = "lighter"
  for (const k of [-1, 1]) {
    const lx = k * kw * 0.41
    const ly = -kh * 0.42
    g.fillStyle = "rgba(255,50,60,.95)"
    g.beginPath()
    g.roundRect(lx - kw * 0.03, ly - kh * 0.06, kw * 0.06, kh * 0.12, kw * 0.02)
    g.fill()
    const halo = g.createRadialGradient(lx, ly, 0, lx, ly, kw * 0.22)
    halo.addColorStop(0, "rgba(255,40,60,.55)")
    halo.addColorStop(1, "rgba(255,40,60,0)")
    g.fillStyle = halo
    g.fillRect(lx - kw * 0.22, ly - kw * 0.22, kw * 0.44, kw * 0.44)
  }
  // escapamento: chama no turbo
  if (turbo) {
    const fl = kw * (0.12 + Math.random() * 0.08)
    const fg = g.createRadialGradient(kw * 0.32, 0, 0, kw * 0.32, 0, fl)
    fg.addColorStop(0, "rgba(255,255,255,.9)")
    fg.addColorStop(0.3, "rgba(179,140,255,.8)")
    fg.addColorStop(1, "rgba(179,140,255,0)")
    g.fillStyle = fg
    g.fillRect(kw * 0.32 - fl, -fl, fl * 2, fl * 2)
  }
  g.globalCompositeOperation = "source-over"
  g.restore()
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`
}
