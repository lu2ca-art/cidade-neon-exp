"use client"
/* eslint-disable react-hooks/immutability -- three.js: bola, raquetes e câmera são do motor, mexidas a cada quadro */

// PINGUE-PONGUE (o ginásio, de dia), no jeito do Ping Pong Fury (referência
// do LU2CA): a mesa em 3D vista de trás de você, a raquete segue o dedo. A
// velocidade do gesto na hora do contato é a força; o gesto pro lado é o
// efeito (a bola curva). A bola tem que quicar do outro lado; rede é ponto
// perdido. A sombra da bola na mesa mostra onde ela está. Até 7.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { quica, raquete, rede, torcida } from "./sons"

// medidas de verdade (metros)
const MESA = { comp: 2.74, larg: 1.525, alt: 0.76 }
const REDE = 0.1525
const R = 0.02 // raio da bola
const G = 6.5 // um pouco menos que a real: dá tempo de jogar no celular
const Z_EU = 1.62, Z_ELE = -1.62
const PONTOS = 7

type Lado = "eu" | "ele"
interface Bola { p: THREE.Vector3; v: THREE.Vector3; curva: number; batedor: Lado; quiques: number; viva: boolean; passouRede: boolean }

// a jogada: de onde sai, onde quer cair, em quanto tempo
function lancar(b: Bola, alvo: THREE.Vector3, T: number) {
  const topo = MESA.alt + R
  for (let tent = 0; tent < 6; tent++) {
    const vx = (alvo.x - b.p.x) / T, vz = (alvo.z - b.p.z) / T
    const vy = (topo - b.p.y + 0.5 * G * T * T) / T
    // passa por cima da rede?
    const t0 = -b.p.z / vz
    const y0 = b.p.y + vy * t0 - 0.5 * G * t0 * t0
    if (t0 <= 0 || y0 > MESA.alt + REDE + 0.05) { b.v.set(vx, vy, vz); return }
    T *= 1.12
  }
  b.v.set((alvo.x - b.p.x) / T, (topo - b.p.y + 0.5 * G * T * T) / T, (alvo.z - b.p.z) / T)
}

function Mesa() {
  const linhas = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 460
    const g = c.getContext("2d")!
    g.fillStyle = "#1f4fa8"; g.fillRect(0, 0, 256, 460)
    g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 454)
    g.lineWidth = 2; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 460); g.stroke()
    const t = new THREE.CanvasTexture(c); return t
  }, [])
  return (
    <group>
      <mesh position={[0, MESA.alt - 0.025, 0]} receiveShadow>
        <boxGeometry args={[MESA.larg, 0.05, MESA.comp]} />
        <meshStandardMaterial attach="material-2" map={linhas} roughness={0.6} />
        <meshStandardMaterial attach="material-0" color="#183c80" />
        <meshStandardMaterial attach="material-1" color="#183c80" />
        <meshStandardMaterial attach="material-3" color="#183c80" />
        <meshStandardMaterial attach="material-4" color="#183c80" />
        <meshStandardMaterial attach="material-5" color="#183c80" />
      </mesh>
      {[[-0.6, -1.1], [0.6, -1.1], [-0.6, 1.1], [0.6, 1.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, MESA.alt / 2, z]}><boxGeometry args={[0.06, MESA.alt, 0.06]} /><meshStandardMaterial color="#2a2a30" /></mesh>
      ))}
      {/* a rede */}
      <mesh position={[0, MESA.alt + REDE / 2, 0]}><boxGeometry args={[MESA.larg + 0.15, REDE, 0.01]} /><meshStandardMaterial color="#f2f2f2" transparent opacity={0.55} /></mesh>
      <mesh position={[0, MESA.alt + REDE, 0]}><boxGeometry args={[MESA.larg + 0.15, 0.012, 0.015]} /><meshStandardMaterial color="#ffffff" /></mesh>
    </group>
  )
}

// o ginásio em volta: piso de madeira, a parede, as luzes
function Ginasio() {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[14, 14]} /><meshStandardMaterial color="#9a5a2c" roughness={0.55} /></mesh>
      <mesh position={[0, 3, -6]}><planeGeometry args={[14, 6]} /><meshStandardMaterial color="#2a2236" /></mesh>
      <mesh position={[0, 2.2, -5.98]}><planeGeometry args={[9, 0.12]} /><meshBasicMaterial color="#ff9000" /></mesh>
      <mesh position={[-7, 3, 0]} rotation-y={Math.PI / 2}><planeGeometry args={[14, 6]} /><meshStandardMaterial color="#231d2e" /></mesh>
      <mesh position={[7, 3, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[14, 6]} /><meshStandardMaterial color="#231d2e" /></mesh>
    </group>
  )
}

function Raquete({ cor, refGrupo }: { cor: string; refGrupo: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={refGrupo}>
      <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.085, 0.085, 0.012, 24]} /><meshStandardMaterial color={cor} roughness={0.7} /></mesh>
      <mesh position={[0, -0.12, 0]}><boxGeometry args={[0.03, 0.11, 0.02]} /><meshStandardMaterial color="#c89a62" /></mesh>
    </group>
  )
}

interface Dedo { x: number; y: number; hist: { t: number; x: number; y: number }[] }

function Jogo({ dedo, onPonto, pausa }: { dedo: React.RefObject<Dedo>; onPonto: (quem: Lado, porque: string) => void; pausa: React.RefObject<number> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const eu = useRef<THREE.Group>(null), ele = useRef<THREE.Group>(null)
  const bolaM = useRef<THREE.Mesh>(null), sombra = useRef<THREE.Mesh>(null)
  const st = useRef({ b: { p: new THREE.Vector3(), v: new THREE.Vector3(), curva: 0, batedor: "eu" as Lado, quiques: 0, viva: false, passouRede: false } as Bola, saque: "eu" as Lado, esperaSaque: 1, eleX: 0, eleY: 0.95, euP: new THREE.Vector3(0, 0.95, Z_EU), ultimaBatida: 0, forca: 0.5, vaiErrar: false })
  useEffect(() => { camera.position.set(0, 2.05, 3.35); camera.lookAt(0, 0.62, -0.5) }, [camera])
  useEffect(() => { if (process.env.NODE_ENV !== "production") (window as unknown as { __pp: unknown }).__pp = st.current }, [])

  const ponto = (quem: Lado, porque: string) => { const s = st.current; s.b.viva = false; s.esperaSaque = 1.3; onPonto(quem, porque) }

  useFrame((_, dtReal) => {
    const s = st.current, b = s.b, dt = Math.min(dtReal, 1 / 30)
    // a sua raquete segue o dedo (no plano atrás da mesa)
    const d = dedo.current
    // teste: window.__ppBot = true joga sozinho (só no desenvolvimento)
    if (process.env.NODE_ENV !== "production" && (window as unknown as { __ppBot?: boolean }).__ppBot && b.viva) {
      d.x = b.p.x / 1.15; d.y = (Math.max(0.82, b.p.y) - 0.82) / 0.55
      const t = performance.now(); d.hist.push({ t, x: d.x, y: (d.hist.at(-1)?.y ?? 0) + 0.06 }); if (d.hist.length > 12) d.hist.shift()
    }
    const alvoX = Math.max(-1.05, Math.min(1.05, d.x * 1.15)), alvoY = 0.82 + Math.max(0, Math.min(1, d.y)) * 0.55
    s.euP.x += (alvoX - s.euP.x) * Math.min(1, dt * 22); s.euP.y += (alvoY - s.euP.y) * Math.min(1, dt * 22)
    if (eu.current) { eu.current.position.copy(s.euP); eu.current.rotation.z = -s.euP.x * 0.5 }
    if (pausa.current > 0) { pausa.current -= dt }
    // o saque
    if (!b.viva) {
      s.esperaSaque -= dt
      const de = s.saque === "eu" ? s.euP : new THREE.Vector3(s.eleX, s.eleY, Z_ELE)
      b.p.set(de.x, de.y + 0.05, s.saque === "eu" ? Z_EU - 0.12 : Z_ELE + 0.12)
      if (s.esperaSaque <= 0 && pausa.current <= 0) {
        b.viva = true; b.batedor = s.saque; b.quiques = 0; b.curva = 0; b.passouRede = false
        const lado = s.saque === "eu" ? -1 : 1
        lancar(b, new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, lado * (0.6 + Math.random() * 0.4)), 0.75)
        raquete(s.saque === "ele")
      }
    } else {
      // a física: gravidade, o efeito curvando, o quique na mesa
      b.v.y -= G * dt
      b.v.x += b.curva * dt
      const antesZ = b.p.z
      b.p.addScaledVector(b.v, dt)
      // a rede
      if ((antesZ > 0) !== (b.p.z > 0)) {
        if (b.p.y < MESA.alt + REDE + R && Math.abs(b.p.x) < MESA.larg / 2 + 0.08) { rede(); b.v.z *= -0.15; b.v.x *= 0.3; ponto(b.batedor === "eu" ? "ele" : "eu", "na rede"); }
      }
      const naMesa = Math.abs(b.p.x) <= MESA.larg / 2 && Math.abs(b.p.z) <= MESA.comp / 2
      if (b.viva && b.v.y < 0 && b.p.y <= MESA.alt + R && naMesa) {
        b.p.y = MESA.alt + R; b.v.y *= -0.86; b.v.x *= 0.97; b.v.z *= 0.97
        quica(0.5)
        const lado: Lado = b.p.z > 0 ? "eu" : "ele"
        if (lado === b.batedor) ponto(lado === "eu" ? "ele" : "eu", "quicou do lado de quem bateu")
        else if (++b.quiques >= 2) ponto(b.batedor, "quicou duas vezes")
      }
      // caiu fora
      if (b.viva && b.p.y < MESA.alt - 0.2) {
        if (b.quiques === 0) ponto(b.batedor === "eu" ? "ele" : "eu", "fora")
        else ponto(b.batedor, "não voltou")
      }
      // você rebate: a bola chega na sua raquete depois de quicar do seu lado
      if (b.viva && b.batedor === "ele" && b.quiques === 1 && b.v.z > 0 && b.p.z > Z_EU - 0.25) {
        const dist = Math.hypot(b.p.x - s.euP.x, b.p.y - s.euP.y)
        if (dist < 0.24) {
          // a força e o efeito: o gesto dos últimos 90 ms
          const agora = performance.now(), h = d.hist.filter((q) => agora - q.t < 90)
          let vx = 0, vy = 0
          if (h.length >= 2) { const a = h[0], z = h[h.length - 1], dtg = Math.max(16, z.t - a.t) / 1000; vx = (z.x - a.x) / dtg; vy = (z.y - a.y) / dtg }
          const forca = Math.max(0, Math.min(1, vy / 3.2 + 0.25))
          b.batedor = "eu"; b.quiques = 0; b.passouRede = false
          b.curva = Math.max(-2.2, Math.min(2.2, -vx * 0.6))
          const tx = Math.max(-0.66, Math.min(0.66, s.euP.x * 0.4 + vx * 0.12 - b.curva * 0.08))
          const tz = -(0.35 + forca * 0.85)
          lancar(b, new THREE.Vector3(tx, 0, tz), 0.72 - forca * 0.32)
          s.forca = forca
          // a chance dele errar: mais forte e com mais efeito, mais difícil
          s.vaiErrar = Math.random() < 0.12 + forca * 0.3 + Math.abs(b.curva) * 0.07
          raquete(forca > 0.7)
        } else if (b.p.z > Z_EU + 0.15) ponto("ele", "passou")
      }
      // o adversário: vai na direção da bola; bola rápida e com efeito ele erra mais
      if (b.viva && b.batedor === "eu" && b.quiques === 1 && b.v.z < 0 && b.p.z < Z_ELE + 0.25) {
        if (!s.vaiErrar && Math.hypot(b.p.x - s.eleX, b.p.y - s.eleY) < 0.3) {
          b.batedor = "ele"; b.quiques = 0; b.curva = (Math.random() - 0.5) * 1.6
          const forca = 0.3 + Math.random() * 0.5
          lancar(b, new THREE.Vector3((Math.random() - 0.5) * 1.1, 0, 0.35 + forca * 0.8), 0.78 - forca * 0.28)
          raquete(true)
        } else if (b.p.z < Z_ELE - 0.15) ponto("eu", "passou dele")
      }
    }
    // o adversário anda
    const prevX = b.viva && b.v.z < 0 ? b.p.x + b.v.x * Math.max(0, (Z_ELE - b.p.z) / b.v.z) : 0
    const vel = 1.7 + Math.random() * 0.2
    s.eleX += Math.max(-vel * dt, Math.min(vel * dt, prevX - s.eleX))
    s.eleY += ((b.viva ? Math.max(0.85, Math.min(1.2, b.p.y)) : 0.95) - s.eleY) * Math.min(1, dt * 4)
    if (ele.current) { ele.current.position.set(s.eleX, s.eleY, Z_ELE); ele.current.rotation.z = s.eleX * 0.5 }
    if (bolaM.current) bolaM.current.position.copy(b.p)
    // a sombra: na mesa (ou no chão), encolhe com a altura
    if (sombra.current) {
      const naM = Math.abs(b.p.x) <= MESA.larg / 2 && Math.abs(b.p.z) <= MESA.comp / 2
      const chao = naM ? MESA.alt + 0.002 : 0.002
      sombra.current.position.set(b.p.x, chao, b.p.z)
      const k = Math.max(0.4, 1 - (b.p.y - chao) * 0.8)
      sombra.current.scale.setScalar(k)
      ;(sombra.current.material as THREE.MeshBasicMaterial).opacity = 0.45 * k
    }
  })

  return (
    <>
      <Raquete cor="#e8343a" refGrupo={eu} />
      <Raquete cor="#2a2a2a" refGrupo={ele} />
      <mesh ref={bolaM}><sphereGeometry args={[R * 1.6, 16, 12]} /><meshStandardMaterial color="#ff9a3c" emissive="#ff7a1a" emissiveIntensity={0.5} /></mesh>
      <mesh ref={sombra} rotation-x={-Math.PI / 2}><circleGeometry args={[0.035, 20]} /><meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} /></mesh>
    </>
  )
}

export function PingPong({ onFim }: { onFim: (venceu: boolean, placar: [number, number]) => void }) {
  const [placar, setPlacar] = useState<[number, number]>([0, 0])
  const [msg, setMsg] = useState("")
  const [acabou, setAcabou] = useState<null | boolean>(null)
  const [dica, setDica] = useState(true)
  const dedo = useRef<Dedo>({ x: 0, y: 0.3, hist: [] })
  const pausa = useRef(0)
  const pl = useRef<[number, number]>([0, 0])

  const mover = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 2 - 1, y = 1 - (e.clientY - r.top) / r.height
    const d = dedo.current
    d.x = x; d.y = (y - 0.1) * 1.4
    d.hist.push({ t: performance.now(), x, y }); if (d.hist.length > 12) d.hist.shift()
  }
  const onPonto = (quem: Lado, porque: string) => {
    const p = pl.current
    if (quem === "eu") p[0]++; else p[1]++
    setPlacar([p[0], p[1]])
    setMsg(quem === "eu" ? `ponto seu · ${porque}` : `ponto dele · ${porque}`)
    setDica(false)
    if (quem === "eu") torcida(false)
    pausa.current = 0.9
    setTimeout(() => setMsg(""), 1300)
    if (p[0] >= PONTOS || p[1] >= PONTOS) setAcabou(p[0] > p[1])
  }

  return (
    <div className="gi-jogo" onPointerMove={mover} onPointerDown={mover} style={{ touchAction: "none" }}>
      <Canvas dpr={[1, 1.75]} camera={{ fov: 50, near: 0.05, far: 40 }} gl={{ antialias: true }} className="gi-cvs">
        <color attach="background" args={["#14101f"]} />
        <hemisphereLight args={["#fff2dc", "#3a2a20", 0.7]} />
        <directionalLight position={[2, 6, 3]} intensity={1.1} />
        <pointLight position={[0, 3.2, 0]} intensity={18} distance={8} color="#ffe0b0" />
        <Ginasio />
        <Mesa />
        {acabou === null && <Jogo dedo={dedo} onPonto={onPonto} pausa={pausa} />}
      </Canvas>
      <div className="gi-placar"><b>{placar[0]}</b><small>você · ele</small><b>{placar[1]}</b></div>
      {dica && <p className="gi-dica">move o dedo pra levar a raquete até a bola · na hora, desliza pra cima pra bater forte, pro lado pra dar efeito</p>}
      {msg && <p className="gi-dica" style={{ top: "calc(110px + env(safe-area-inset-top))" }}>{msg}</p>}
      {acabou !== null && (
        <div className="gi-fim">
          <b>{placar[0]} × {placar[1]}</b>
          <small>{acabou ? "você ganhou" : "ele ganhou"}</small>
          <button type="button" className="gi-btn" onClick={() => onFim(acabou, placar)}>continuar</button>
        </div>
      )}
    </div>
  )
}
