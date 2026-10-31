"use client"
/* eslint-disable react-hooks/immutability -- three.js: os instrumentos balançam a cada toque, mexidos por quadro */

// OS INSTRUMENTOS ANCESTRAIS NA CASA DA D-BEE (T49, lista-mestra; reunião de
// 29/10: cada instrumento é recompensa secundária de uma missão, e aí dá pra
// ir na casa da D-Bee tocar). Os que você ganhou ficam na parede da direita,
// no banco e nas prateleiras, e cada um toca quando você toca nele, como o
// tambor. Os melódicos (kalimba, flauta, udu, sino…) andam numa escala
// pentatônica a cada toque, então tocar de novo e de novo vira uma melodia.
//
// PROVISÓRIO: os modelos são primitivas (madeira, cabaça, barro, metal) e o
// som é sintetizado na hora (Web Audio, nada pra baixar), até o dono mandar
// os sons de verdade (lista-mestra T49: "precisa do som de cada instrumento").
//
// A LISTA vem por prop (`ids`): quem sabe o que foi ganho é o save
// (disco/instrumentos.ts, lote A: h.instrumentos; portas.ts instrumentosGanhos).
// (lote D) os ids são os do A; o SOM é o do A (tocarInstrumento, o mesmo da tela
// de recompensa) e o MODELO é o daqui (SINONIMO: o id do A → a forma). Um id que
// esta tabela não conhece toca e aparece como um tamborzinho (nada quebra).

import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { audioCtx, saidaSom } from "../som"
import { sinalizar } from "../interior/bus"
import type { V3 } from "../interior/comum"

import { ehInstrumento, tocarInstrumento, type InstrumentoId } from "./instrumentos"
export type { InstrumentoId }

// o mock (os links de teste: ?parte=casa.instrumentos)
export const INSTRUMENTOS_MOCK: InstrumentoId[] = ["djembe", "tambor-agua", "udu", "caxixi", "sitar", "berimbau", "flauta-bambu", "kalimba"]

type Forma = "kalimba" | "berimbau" | "flauta" | "maraca" | "caxixi" | "pau-de-chuva" | "udu" | "agogo" | "didgeridoo" | "tigela" | "tambor-falante" | "tamborzinho"
const FORMAS: Forma[] = ["kalimba", "berimbau", "flauta", "maraca", "caxixi", "pau-de-chuva", "udu", "agogo", "didgeridoo", "tigela", "tambor-falante", "tamborzinho"]
// o id do save → a forma e o som (aceita sinônimos; o resto vira tamborzinho)
// (lote D) os ids do A (disco/instrumentos.ts) → a forma daqui
const SINONIMO: Record<string, Forma> = { "djembe": "tamborzinho", "tambor-agua": "udu", "sitar": "berimbau", "flauta-bambu": "flauta", "ocarina": "udu", "handpan": "tigela", "mbira": "kalimba", "xequere": "maraca", "shekere": "maraca", "chocalho": "maraca", "rainstick": "pau-de-chuva", "sino": "tigela", "tigela-tibetana": "tigela", "flauta-de-bambu": "flauta", "talking-drum": "tambor-falante" }
const formaDe = (id: string): Forma => (FORMAS as string[]).includes(id) ? id as Forma : SINONIMO[id] ?? "tamborzinho"

// tudo que dá pra afinar fica aqui
export const CASA_INSTRUMENTOS = {
  // o banco e as prateleiras na parede da direita (x +2,2), 5 por fileira
  x: 2.2,
  z0: -1.35,
  passo: 0.42,
  porFileira: 5,
  alturas: [0.47, 1.12, 1.72], // o tampo do banco, a 1ª e a 2ª prateleira
  // a escala (pentatônica menor de lá) que os melódicos percorrem
  escala: [0, 3, 5, 7, 10, 12, 15],
  // no gesto "instrumentos": com instrumento novo, a cena segue depois de tocar
  // cada novo; na visita livre, depois de tocar este tanto de instrumentos
  visitaLivre: 2,
}

// ── o som de cada um (sintetizado: barato e sem atraso) ──
let ruido: AudioBuffer | null = null
function fonteRuido(c: AudioContext) {
  if (!ruido) {
    ruido = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const d = ruido.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const s = c.createBufferSource(); s.buffer = ruido; return s
}
function env(c: AudioContext, t: number, ataque: number, dur: number, vol: number) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  return g
}
function osc(c: AudioContext, out: AudioNode, tipo: OscillatorType, f: number, t: number, ataque: number, dur: number, vol: number, f1?: number) {
  const o = c.createOscillator(); o.type = tipo
  o.frequency.setValueAtTime(f, t)
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8)
  o.connect(env(c, t, ataque, dur, vol)).connect(out)
  o.start(t); o.stop(t + dur + 0.05)
  return o
}
function chiado(c: AudioContext, out: AudioNode, t: number, dur: number, vol: number, tipo: BiquadFilterType, freq: number, q = 1) {
  const s = fonteRuido(c)
  const f = c.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q
  s.connect(f).connect(env(c, t, 0.004, dur, vol)).connect(out)
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05)
}
const nota = (base: number, n: number) => base * Math.pow(2, CASA_INSTRUMENTOS.escala[n % CASA_INSTRUMENTOS.escala.length] / 12)

function tocarSom(forma: Forma, n: number) {
  const c = audioCtx(); const out = saidaSom()
  if (!c || !out) return
  if (c.state === "suspended") void c.resume()
  const t = c.currentTime + 0.005
  switch (forma) {
    case "kalimba": { const f = nota(440, n); osc(c, out, "sine", f, t, 0.003, 1.6, 0.22); osc(c, out, "sine", f * 5.4, t, 0.002, 0.18, 0.04); break }
    case "berimbau": {
      // a corda e a cabaça abrindo (o "uá")
      const f = n % 3 === 2 ? 123 : 110
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 6
      lp.frequency.setValueAtTime(300, t); lp.frequency.exponentialRampToValueAtTime(1600, t + 0.25); lp.connect(out)
      osc(c, lp, "sawtooth", f, t, 0.003, 1.1, 0.18)
      chiado(c, out, t, 0.03, 0.12, "highpass", 3000)
      break
    }
    case "flauta": {
      const f = nota(587, n)
      const o = osc(c, out, "sine", f, t, 0.08, 0.9, 0.16)
      const lfo = c.createOscillator(); lfo.frequency.value = 5.2
      const lg = c.createGain(); lg.gain.value = f * 0.008
      lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + 0.95)
      chiado(c, out, t, 0.5, 0.025, "bandpass", f * 2, 2)
      break
    }
    case "maraca": case "caxixi": {
      const hp = forma === "maraca" ? 4500 : 3000
      chiado(c, out, t, 0.09, 0.22, "highpass", hp); chiado(c, out, t + 0.13, 0.07, 0.16, "highpass", hp)
      break
    }
    case "pau-de-chuva": for (let i = 0; i < 28; i++) chiado(c, out, t + Math.pow(i / 28, 0.8) * 1.6 + Math.random() * 0.03, 0.025, 0.08 * (1 - i / 34), "bandpass", 2500 + Math.random() * 3000, 3); break
    case "udu": { const f = nota(147, n); osc(c, out, "sine", f * 1.4, t, 0.01, 0.55, 0.3, f); chiado(c, out, t, 0.05, 0.05, "lowpass", 400); break }
    case "agogo": { const f = n % 2 ? 660 : 880; osc(c, out, "sine", f, t, 0.002, 0.7, 0.14); osc(c, out, "sine", f * 2.76, t, 0.002, 0.25, 0.05); break }
    case "didgeridoo": {
      const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 8; lp.frequency.value = 400; lp.connect(out)
      const lfo = c.createOscillator(); lfo.frequency.value = 3
      const lg = c.createGain(); lg.gain.value = 250
      lfo.connect(lg).connect(lp.frequency); lfo.start(t); lfo.stop(t + 1.5)
      osc(c, lp, "sawtooth", 65, t, 0.06, 1.4, 0.2)
      break
    }
    case "tigela": { const f = nota(262, n); osc(c, out, "sine", f, t, 0.01, 3.2, 0.14); osc(c, out, "sine", f * 2.71, t, 0.01, 2.2, 0.05); osc(c, out, "sine", f * 5.1, t, 0.005, 0.9, 0.02); break }
    case "tambor-falante": { const f = n % 2 ? 140 : 180; osc(c, out, "sine", f, t, 0.004, 0.45, 0.32, n % 2 ? f * 1.5 : f * 0.6); chiado(c, out, t, 0.04, 0.08, "lowpass", 800); break }
    default: { osc(c, out, "sine", 120, t, 0.003, 0.35, 0.3, 70); chiado(c, out, t, 0.03, 0.1, "bandpass", 1800) }
  }
}

// ── o modelo de cada um (primitivas, cabe numa vaga de ~0,4 m) ──
const MADEIRA = "#7a4a26"
const CABACA = "#b07a3a"
const BARRO = "#8a4a2e"
const METAL = "#c8a050"
function Modelo({ forma }: { forma: Forma }) {
  switch (forma) {
    case "kalimba": return (
      <group rotation-x={-0.5}>
        <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.2, 0.06, 0.26]} /><meshStandardMaterial color={MADEIRA} /></mesh>
        <mesh position={[0, 0.065, -0.03]}><boxGeometry args={[0.15, 0.01, 0.14]} /><meshStandardMaterial color="#d8d8e0" metalness={0.8} roughness={0.3} /></mesh>
      </group>
    )
    case "berimbau": return (
      <group rotation-x={0.15}>
        <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.01, 0.012, 0.62, 6]} /><meshStandardMaterial color={MADEIRA} /></mesh>
        <mesh position={[0.03, 0.1, 0]}><sphereGeometry args={[0.08, 12, 8]} /><meshStandardMaterial color={CABACA} /></mesh>
      </group>
    )
    case "flauta": return <mesh position={[0, 0.03, 0]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.018, 0.018, 0.36, 8]} /><meshStandardMaterial color="#c8b070" /></mesh>
    case "maraca": return (
      <group>
        <mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.07, 12, 8]} /><meshStandardMaterial color="#c86a2a" /></mesh>
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.015, 0.015, 0.12, 6]} /><meshStandardMaterial color={MADEIRA} /></mesh>
      </group>
    )
    case "caxixi": return <mesh position={[0, 0.08, 0]}><coneGeometry args={[0.07, 0.16, 10]} /><meshStandardMaterial color="#c8a868" /></mesh>
    case "pau-de-chuva": return <mesh position={[0, 0.2, 0]} rotation-z={0.35}><cylinderGeometry args={[0.035, 0.035, 0.44, 8]} /><meshStandardMaterial color="#9a8a4a" /></mesh>
    case "udu": return (
      <group>
        <mesh position={[0, 0.11, 0]} scale={[1, 0.9, 1]}><sphereGeometry args={[0.12, 14, 10]} /><meshStandardMaterial color={BARRO} roughness={0.9} /></mesh>
        <mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.035, 0.045, 0.06, 10]} /><meshStandardMaterial color={BARRO} roughness={0.9} /></mesh>
      </group>
    )
    case "agogo": return (
      <group rotation-z={Math.PI / 2} position={[0, 0.06, 0]}>
        <mesh position={[0, 0.08, 0]}><coneGeometry args={[0.05, 0.14, 10]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
        <mesh position={[0.05, -0.08, 0]} rotation-z={Math.PI}><coneGeometry args={[0.04, 0.12, 10]} /><meshStandardMaterial color={METAL} metalness={0.7} roughness={0.3} /></mesh>
      </group>
    )
    case "didgeridoo": return <mesh position={[0, 0.25, 0]} rotation-z={0.3}><cylinderGeometry args={[0.03, 0.05, 0.55, 10]} /><meshStandardMaterial color="#5a2e1a" /></mesh>
    case "tigela": return <mesh position={[0, 0.07, 0]} rotation-x={Math.PI}><sphereGeometry args={[0.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={METAL} metalness={0.75} roughness={0.25} side={THREE.DoubleSide} /></mesh>
    case "tambor-falante": return (
      <group position={[0, 0.12, 0]}>
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.08, 0.04, 0.12, 12]} /><meshStandardMaterial color={MADEIRA} /></mesh>
        <mesh position={[0, -0.06, 0]}><cylinderGeometry args={[0.04, 0.08, 0.12, 12]} /><meshStandardMaterial color={MADEIRA} /></mesh>
      </group>
    )
    default: return (
      <group>
        <mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.1, 0.09, 0.2, 14]} /><meshStandardMaterial color="#6a4424" /></mesh>
        <mesh position={[0, 0.201, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.095, 14]} /><meshStandardMaterial color="#efe4cc" /></mesh>
      </group>
    )
  }
}

// onde fica a vaga i (banco, depois as prateleiras)
function vaga(i: number): V3 {
  const C = CASA_INSTRUMENTOS
  const fil = Math.min(C.alturas.length - 1, Math.floor(i / C.porFileira))
  return [C.x, C.alturas[fil], C.z0 + (i % C.porFileira) * C.passo]
}

// `gesto`: a cena pediu "toque os instrumentos". (lote D) Com `novos` (os que
// chegaram desde a última visita), ela segue depois de tocar cada novo; sem
// novos (a visita livre), depois de tocar uns (CASA_INSTRUMENTOS.visitaLivre)
export function InstrumentosCasa({ ids, gesto = false, novos = [] }: { ids: InstrumentoId[]; gesto?: boolean; novos?: InstrumentoId[] }) {
  const lista = useMemo(() => [...new Set(ids)], [ids])
  const grupos = useRef<(THREE.Group | null)[]>([])
  const bateu = useRef<number[]>([])
  const vezes = useRef<Record<string, number>>({})
  const fimMandado = useRef(false)
  useEffect(() => { if (gesto) fimMandado.current = false }, [gesto])
  const fileiras = Math.min(CASA_INSTRUMENTOS.alturas.length, Math.ceil(lista.length / CASA_INSTRUMENTOS.porFileira))

  const tocar = (i: number, id: InstrumentoId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const n = vezes.current[id] ?? 0
    vezes.current[id] = n + 1
    // o som do A (o mesmo da recompensa); um id que ele não conhece, o sintetizado daqui
    if (ehInstrumento(id)) tocarInstrumento(id, n)
    else tocarSom(formaDe(id), n)
    bateu.current[i] = performance.now() / 1000
    const novosAqui = novos.filter((x) => lista.includes(x))
    const pronto = novosAqui.length ? novosAqui.every((x) => (vezes.current[x] ?? 0) > 0) : Object.keys(vezes.current).length >= Math.min(CASA_INSTRUMENTOS.visitaLivre, lista.length)
    if (gesto && !fimMandado.current && pronto) {
      fimMandado.current = true
      sinalizar({ t: "fim-gesto" })
    }
  }

  // o balanço de quem foi tocado (só mexe em quem bateu há menos de 0,6 s)
  useFrame(() => {
    const agora = performance.now() / 1000
    for (let i = 0; i < lista.length; i++) {
      const g = grupos.current[i]
      if (!g) continue
      const d = agora - (bateu.current[i] ?? -9)
      if (d > 0.6) { if (g.rotation.z !== 0) { g.rotation.z = 0; g.scale.setScalar(1) } continue }
      const k = 1 - d / 0.6
      g.rotation.z = Math.sin(d * 38) * 0.18 * k
      g.scale.setScalar(1 + 0.08 * k)
    }
  })

  if (!lista.length) return null
  return (
    <group>
      {/* o banco e as prateleiras (só as que têm instrumento) */}
      <mesh position={[CASA_INSTRUMENTOS.x, 0.22, CASA_INSTRUMENTOS.z0 + CASA_INSTRUMENTOS.passo * 2]}>
        <boxGeometry args={[0.42, 0.45, 2.05]} />
        <meshStandardMaterial color="#4a3020" roughness={0.9} />
      </mesh>
      {CASA_INSTRUMENTOS.alturas.slice(1, fileiras).map((y) => (
        <mesh key={y} position={[CASA_INSTRUMENTOS.x + 0.06, y - 0.02, CASA_INSTRUMENTOS.z0 + CASA_INSTRUMENTOS.passo * 2]}>
          <boxGeometry args={[0.3, 0.04, 2.05]} />
          <meshStandardMaterial color="#5a3a22" roughness={0.9} />
        </mesh>
      ))}
      {lista.slice(0, CASA_INSTRUMENTOS.alturas.length * CASA_INSTRUMENTOS.porFileira).map((id, i) => (
        <group key={id} position={vaga(i)}>
          <group ref={(g) => { grupos.current[i] = g }} rotation-y={-Math.PI / 2}>
            <Modelo forma={formaDe(id)} />
          </group>
          {/* a área de tocar: invisível, um pouco maior que o instrumento */}
          <mesh position={[0, 0.18, 0]} visible={false} onClick={tocar(i, id)}>
            <boxGeometry args={[0.36, 0.42, 0.4]} />
            <meshBasicMaterial />
          </mesh>
        </group>
      ))}
      {/* uma luz baixa e quente em cima do banco */}
      <pointLight position={[1.7, 1.9, -0.5]} color="#ffcf8a" intensity={1.6} distance={2.6} decay={2} />
    </group>
  )
}
