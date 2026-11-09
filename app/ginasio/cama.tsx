"use client"
/* eslint-disable react-hooks/immutability -- three.js: corpo, lonas e câmera são do motor, mexidos a cada quadro */

// CAMA ELÁSTICA (o ginásio, de dia), no jeito do Flip Range (referência do
// LU2CA) com a cara de um parque de trampolim: uma fileira de camas, a câmera
// de lado. O corpo quica sozinho; tocar quando ele encosta na lona dá impulso
// e leva pra próxima cama. No ar, segurar o dedo encolhe e gira (mortal pra
// trás); soltar abre o corpo e quase para o giro. Cair de pé conta os giros;
// cair torto custa uma vida. Três vidas.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { AlohanJunto } from "./alohan"
import { quica, torcida } from "./sons"

const G = 20
const LONA_Y = 0.9          // altura da lona
const CM = 0.85             // do pé ao centro do corpo
const PASSO = 3.4           // distância entre as camas
const R = 1.25              // meia largura da lona
const K = 160               // a mola da lona (contato ≈ 0,25 s)
const GIRO = 9.5            // rad/s encolhido
const ABERTO = 0.35         // rad/s com o corpo aberto
const V_BASE = 9, V_MAX = 15.5

interface Corpo {
  x: number; y: number; vx: number; vy: number; ang: number; w: number
  dedo: boolean; tocou: number; naLona: boolean; entrou: number; girado: number
  cama: number; alvo: number; caido: number; vidas: number; pontos: number; combo: number
  msg: string; msgAte: number; fim: boolean; bot: boolean
}

// cama i: a lona é uma malha que afunda e balança
function Lona({ i, fundo }: { i: number; fundo: React.RefObject<Float32Array> }) {
  const geo = useMemo(() => { const g = new THREE.PlaneGeometry(R * 2, 1.6, 24, 6); g.rotateX(-Math.PI / 2); return g }, [])
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])
  const cor = ["#1f5bff", "#ff3fa4", "#18d6c8", "#ffb21a"][i % 4]
  const antes = useRef(0)
  useFrame(() => {
    const d = fundo.current?.[i] ?? 0
    if (d === antes.current) return
    antes.current = d
    const p = geo.attributes.position as THREE.BufferAttribute
    for (let k = 0; k < p.count; k++) { const x = base[k * 3], z = base[k * 3 + 2]; const r = Math.min(1, Math.hypot(x / R, z / 0.8)); p.setY(k, -d * (1 - r * r)) }
    p.needsUpdate = true
  })
  return (
    <group position={[i * PASSO, LONA_Y, 0]}>
      <mesh geometry={geo}><meshStandardMaterial color="#121218" roughness={0.6} side={THREE.DoubleSide} /></mesh>
      {/* as proteções acolchoadas em volta */}
      {[[-R - 0.25, 0, 0, 0.5, 2.1], [R + 0.25, 0, 0, 0.5, 2.1], [0, 0, -1.05, R * 2 + 1, 0.5], [0, 0, 1.05, R * 2 + 1, 0.5]].map(([x, , z, w, d], k) => (
        <mesh key={k} position={[x, 0.02, z]}><boxGeometry args={[w, 0.16, d]} /><meshStandardMaterial color={cor} roughness={0.5} /></mesh>
      ))}
      <mesh position={[0, -LONA_Y / 2, 0]}><boxGeometry args={[R * 2 + 1, LONA_Y - 0.05, 2.6]} /><meshStandardMaterial color="#20243a" /></mesh>
    </group>
  )
}

// o corpo: tronco, cabeça, braços e pernas que encolhem quando gira
function Pessoa({ c }: { c: React.RefObject<Corpo> }) {
  const g = useRef<THREE.Group>(null), coxa = useRef<THREE.Group>(null), canela = useRef<THREE.Group>(null), braco = useRef<THREE.Group>(null)
  const enc = useRef(0)
  useFrame((_, dt) => {
    const s = c.current; if (!g.current) return
    const alvo = s.caido > 0 ? 0 : s.dedo && !s.naLona ? 1 : 0
    enc.current += (alvo - enc.current) * Math.min(1, dt * 14)
    const e = enc.current
    g.current.position.set(s.x, s.y, 0)
    g.current.rotation.z = s.caido > 0 ? Math.PI / 2 : s.ang
    if (coxa.current) coxa.current.rotation.z = e * 1.9
    if (canela.current) canela.current.rotation.z = -e * 2.3
    if (braco.current) braco.current.rotation.z = s.naLona ? 0.3 : e > 0.3 ? 1.6 : -2.6 + Math.sin(performance.now() / 300) * 0.2
  })
  // de frente pra +x; o centro do grupo é o centro do corpo
  return (
    <group ref={g}>
      <mesh position={[0, 0.15, 0]}><boxGeometry args={[0.26, 0.6, 0.34]} /><meshStandardMaterial color="#ff6a1a" /></mesh>
      <mesh position={[0.02, 0.62, 0]}><sphereGeometry args={[0.14, 14, 10]} /><meshStandardMaterial color="#5a3a26" /></mesh>
      <group ref={braco} position={[0, 0.38, 0]}><mesh position={[0, -0.28, 0.2]}><boxGeometry args={[0.1, 0.56, 0.1]} /><meshStandardMaterial color="#5a3a26" /></mesh><mesh position={[0, -0.28, -0.2]}><boxGeometry args={[0.1, 0.56, 0.1]} /><meshStandardMaterial color="#5a3a26" /></mesh></group>
      <group ref={coxa} position={[0, -0.15, 0]}>
        <mesh position={[0, -0.2, 0]}><boxGeometry args={[0.16, 0.42, 0.3]} /><meshStandardMaterial color="#1b1530" /></mesh>
        <group ref={canela} position={[0, -0.4, 0]}><mesh position={[0, -0.2, 0]}><boxGeometry args={[0.13, 0.42, 0.26]} /><meshStandardMaterial color="#5a3a26" /></mesh><mesh position={[0.06, -0.42, 0]}><boxGeometry args={[0.24, 0.07, 0.28]} /><meshStandardMaterial color="#f4f4f4" /></mesh></group>
      </group>
    </group>
  )
}

// o galpão do parque: parede acolchoada, neon, grafite 222, a piscina de espuma ao fundo
function Galpao() {
  const parede = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 256; const g = c.getContext("2d")!
    g.fillStyle = "#151a3a"; g.fillRect(0, 0, 1024, 256)
    for (let x = 0; x < 1024; x += 128) { g.fillStyle = x % 256 ? "#1c2350" : "#182048"; g.fillRect(x + 4, 120, 120, 132) }
    g.font = "900 96px Arial Black, sans-serif"; g.fillStyle = "#ff3fa4"; g.fillText("PULA", 40, 100); g.fillStyle = "#2fe8ff"; g.fillText("222", 640, 100)
    const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1); return t
  }, [])
  const espuma = useMemo(() => {
    const cs = ["#ff3fa4", "#2fe8ff", "#ffc857", "#5dffa0", "#ffffff"]
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    return Array.from({ length: 160 }, (_, k) => ({ p: [-6 + (k % 40) * 1.1 + r() * 0.4, 0.2 + r() * 0.5, -4.2 - Math.floor(k / 40) * 0.6] as [number, number, number], r: r() * 2, c: cs[k % 5] }))
  }, [])
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[18, 0, 0]}><planeGeometry args={[120, 20]} /><meshStandardMaterial color="#2a2e48" /></mesh>
      <mesh position={[18, 4, -7]}><planeGeometry args={[120, 8]} /><meshStandardMaterial map={parede} /></mesh>
      {[1.2, 6.8].map((y, k) => <mesh key={k} position={[18, y, -6.9]}><boxGeometry args={[120, 0.08, 0.05]} /><meshBasicMaterial color={k ? "#2fe8ff" : "#ff3fa4"} toneMapped={false} /></mesh>)}
      {espuma.map((e, k) => <mesh key={k} position={e.p} rotation={[e.r, e.r * 1.3, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={e.c} roughness={1} /></mesh>)}
      {/* a treliça do teto */}
      {Array.from({ length: 30 }, (_, k) => <mesh key={k} position={[-6 + k * 4.4, 9, -2]}><boxGeometry args={[0.12, 0.12, 14]} /><meshStandardMaterial color="#3a3f5a" /></mesh>)}
    </group>
  )
}

function Cena({ c, fundo, aoPousar }: { c: React.RefObject<Corpo>; fundo: React.RefObject<Float32Array>; aoPousar: () => void }) {
  const camera = useThree((s) => s.camera)
  const olhar = useMemo(() => new THREE.Vector3(), [])
  const balanco = useRef(new Float32Array(64)) // a lona que ainda balança depois do pulo
  const alohan = useRef<THREE.Group>(null) // (§11) acompanha de cama em cama, atrás da fileira
  useFrame((_, dtReal) => {
    const s = c.current, dt = Math.min(dtReal, 1 / 30)
    if (s.fim) return
    const chao = LONA_Y + CM
    // o robô de teste: impulso em toda lona, gira até ~1 volta e solta
    if (s.bot && !s.naLona) {
      const resta = (s.vy + Math.sqrt(Math.max(0, s.vy * s.vy + 2 * G * (s.y - chao)))) / G
      const meta = Math.PI * 2 * (s.vy > 12 ? 2 : 1)
      s.dedo = s.vy > -6 && s.girado + GIRO * 0.12 + ABERTO * resta < meta - 0.1
    } else if (s.bot) s.dedo = false
    if (s.caido > 0) { s.caido -= dt; if (s.caido <= 0) { s.y = chao + 0.01; s.vy = V_BASE * 0.8; s.vx = 0; s.ang = 0; s.w = 0; s.girado = 0 } ; return }
    // no ar: gravidade e giro
    s.vy -= G * dt; s.y += s.vy * dt; s.x += s.vx * dt
    if (!s.naLona) { const wAlvo = s.dedo ? GIRO : ABERTO * Math.sign(s.w || 1) * (s.girado > 0.2 ? 1 : 0); s.w += (wAlvo - s.w) * Math.min(1, dt * (s.dedo ? 9 : 6)); s.ang += s.w * dt; s.girado += s.w * dt }
    if (!s.naLona && s.y < chao && s.vy < 0) {
      // encostou: confere a postura
      s.naLona = true; s.entrou = s.vy
      const a = Math.atan2(Math.sin(s.ang), Math.cos(s.ang))
      const voltas = Math.round(s.girado / (Math.PI * 2))
      if (Math.abs(a) > 0.7) {
        s.vidas--; s.combo = 0; s.caido = 1.1; s.naLona = false; s.msg = s.vidas > 0 ? "caiu torto" : "acabou"; s.msgAte = performance.now() + 1100
        fundo.current[s.cama] = 0.5; balanco.current[s.cama] = 0.5; quica(0.3)
        if (s.vidas <= 0) { s.fim = true; aoPousar() }
        return
      }
      if (voltas > 0) {
        s.combo++
        const cravou = Math.abs(a) < 0.18
        const ganho = (voltas * voltas * 10 + (cravou ? 5 : 0)) * Math.min(5, s.combo)
        s.pontos += ganho; s.msg = `${voltas === 1 ? "mortal" : voltas === 2 ? "duplo" : voltas === 3 ? "triplo" : `${voltas} voltas`}${cravou ? " cravado" : ""} · +${ganho}`; s.msgAte = performance.now() + 1100
        if (voltas >= 2 || cravou) torcida(voltas >= 3)
      }
      s.ang = 0; s.w = 0; s.girado = 0; s.vx = 0; s.x = s.cama * PASSO + (s.x - s.cama * PASSO) * 0.5
      quica(Math.min(1, -s.entrou / V_MAX))
      aoPousar()
    }
    if (s.naLona) {
      // a mola da lona: afunda e devolve
      const d = chao - s.y
      s.vy += K * d * dt
      fundo.current[s.cama] = Math.max(0, d)
      if (s.y >= chao && s.vy > 0) {
        s.naLona = false; fundo.current[s.cama] = 0; balanco.current[s.cama] = 0.25
        const agora = performance.now()
        const impulso = s.bot || (s.tocou > 0 && agora - s.tocou < 420)
        s.tocou = 0
        let v = Math.max(V_BASE, -s.entrou)
        if (impulso) {
          v = Math.min(V_MAX, v * 1.12 + 0.8)
          // vai pra próxima cama
          s.cama++; const T = (2 * v) / G; s.vx = (s.cama * PASSO - s.x) / T
          if (s.cama > s.alvo) s.alvo = s.cama
        } else { v = Math.max(V_BASE * 0.8, v * 0.86); s.vx = (s.cama * PASSO - s.x) / ((2 * v) / G) }
        s.vy = v; s.y = chao
      }
    }
    // a lona que balança sozinha depois que o corpo sai
    for (let i = Math.max(0, s.cama - 2); i < s.cama + 2; i++) if (!(s.naLona && i === s.cama)) { balanco.current[i] *= Math.exp(-dt * 4); fundo.current[i] = balanco.current[i] * Math.sin(performance.now() / 45) }
    // a câmera de lado, acompanhando e subindo com o pulo
    const cx = s.x + 0.6, cy = 1.6 + s.y * 0.72
    camera.position.lerp(olhar.set(cx, cy, 12 + Math.max(0, s.y - 4) * 0.6), Math.min(1, dt * 4))
    camera.lookAt(s.x + 0.4, cy - 0.5, 0)
    if (alohan.current) alohan.current.position.x += ((s.cama - 0.5) * PASSO - alohan.current.position.x) * Math.min(1, dt * 2)
  })
  return (
    <>
      <Galpao />
      {Array.from({ length: 40 }, (_, i) => <Lona key={i} i={i} fundo={fundo} />)}
      <Pessoa c={c} />
      <group ref={alohan} position={[-PASSO / 2, 0, -2.4]}><AlohanJunto pos={[0, 0, 0]} /></group>
    </>
  )
}

export function Cama({ onFim }: { onFim: (pontos: number) => void }) {
  const c = useRef<Corpo>({ x: 0, y: LONA_Y + CM + 2, vx: 0, vy: 0, ang: 0, w: 0, dedo: false, tocou: 0, naLona: false, entrou: 0, girado: 0, cama: 0, alvo: 0, caido: 0, vidas: 3, pontos: 0, combo: 0, msg: "", msgAte: 0, fim: false, bot: false })
  const fundo = useRef(new Float32Array(64))
  const [hud, setHud] = useState({ pontos: 0, vidas: 3, combo: 0, msg: "", camas: 0 })
  const [acabou, setAcabou] = useState(false)
  const [primeiro, setPrimeiro] = useState(true)

  useEffect(() => {
    const t = setInterval(() => { const s = c.current; setHud({ pontos: s.pontos, vidas: s.vidas, combo: s.combo, msg: performance.now() < s.msgAte ? s.msg : "", camas: s.alvo }) }, 120)
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as { __cama?: () => Corpo; __camaBot?: (on: boolean) => void }
      w.__cama = () => ({ ...c.current }); w.__camaBot = (on) => { c.current.bot = on }
    }
    return () => clearInterval(t)
  }, [])

  const down = () => { const s = c.current; s.dedo = true; s.tocou = performance.now(); setPrimeiro(false) }
  const up = () => { c.current.dedo = false }

  return (
    <div className="gi-jogo" style={{ touchAction: "none" }} onPointerDown={down} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
      <Canvas dpr={[1, 1.75]} camera={{ fov: 50, near: 0.1, far: 80, position: [0.8, 2.6, 8.8] }} className="gi-cvs">
        <color attach="background" args={["#0e1230"]} />
        <fog attach="fog" args={["#0e1230", 16, 40]} />
        <hemisphereLight args={["#e8eaff", "#40305a", 1.3]} />
        <directionalLight position={[3, 10, 6]} intensity={1.4} />
        <pointLight position={[0, 6, 2]} color="#ff3fa4" intensity={18} distance={14} />
        <Cena c={c} fundo={fundo} aoPousar={() => { if (c.current.fim) setTimeout(() => setAcabou(true), 900) }} />
      </Canvas>
      <div className="gi-placar"><b>{hud.pontos}</b><small>pontos{hud.combo > 1 ? ` · combo ×${Math.min(5, hud.combo)}` : ""}</small><span>{"♥".repeat(Math.max(0, hud.vidas))}</span></div>
      {hud.msg && <p className="gi-dica" style={{ animation: "none" }}>{hud.msg}</p>}
      {primeiro && !hud.msg && <p className="gi-dica">toca quando encostar na lona · segura no ar pra girar · solta pra cair de pé</p>}
      {acabou && (
        <div className="gi-fim">
          <b>{hud.pontos}</b>
          <small>pontos · {hud.camas} camas</small>
          <button type="button" className="gi-btn" onClick={() => onFim(hud.pontos)}>continuar</button>
        </div>
      )}
    </div>
  )
}
