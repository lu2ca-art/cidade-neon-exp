"use client"

// Os pilotos do jogador na corrida das trincheiras (T13): de BMX e de skate
// (o de patins é o Patinador do jogo). Mesmo corpo do patinador (casaco rosa,
// boné, o mp3 com fone), poucas peças, sem luz.
//  - BMX: as rodas giram com a velocidade; no ar, as manobras: BARSPIN (o
//    guidão dá a volta), TAILWHIP (o quadro dá a volta em torno do guidão) e
//    SUPERMAN (o corpo estica pra trás).
//  - Skate: de lado na prancha, base aberta, empurra com o pé de trás; no ar,
//    KICKFLIP/HEELFLIP (a prancha gira); no grind, faísca no truck.

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

const PELE = "#5a3a26", CASACO = "#ff3fb0", ESCURO = "#14121c", CALCA = "#1b1530", NEON = "#2fe8ff"

export type Manobra = { tipo: string; p: number } | null
type Props = { vel: () => number; steer: () => number; ar: () => boolean; manobra: () => Manobra; grind?: () => boolean; empurra?: () => boolean }

function Cabeca() {
  return (
    <>
      <mesh position={[0, 0, 0]}><sphereGeometry args={[0.15, 14, 10]} /><meshStandardMaterial color={PELE} /></mesh>
      <mesh position={[0, 0.11, 0.05]} rotation-x={-0.2}><cylinderGeometry args={[0.16, 0.16, 0.07, 14]} /><meshStandardMaterial color={ESCURO} /></mesh>
      <mesh position={[0, 0.09, 0.2]}><boxGeometry args={[0.22, 0.02, 0.14]} /><meshStandardMaterial color={ESCURO} /></mesh>
      <mesh position={[0.17, 0, 0]}><boxGeometry args={[0.04, 0.1, 0.1]} /><meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={0.6} /></mesh>
      <mesh position={[-0.17, 0, 0]}><boxGeometry args={[0.04, 0.1, 0.1]} /><meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={0.6} /></mesh>
    </>
  )
}

function Roda({ r }: { r: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={r}>
      <mesh rotation-y={Math.PI / 2}><torusGeometry args={[0.27, 0.035, 6, 20]} /><meshStandardMaterial color={ESCURO} roughness={0.8} /></mesh>
      {/* os raios: um disco neon (lê como roda girando sem 36 raios) */}
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.2, 0.2, 0.02, 8]} /><meshBasicMaterial color={NEON} transparent opacity={0.35} toneMapped={false} /></mesh>
      <mesh rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.1, 8]} /><meshStandardMaterial color="#ffc857" /></mesh>
    </group>
  )
}

export function Ciclista({ vel, steer, ar, manobra }: Props) {
  const corpo = useRef<THREE.Group>(null)
  const quadro = useRef<THREE.Group>(null)
  const guidao = useRef<THREE.Group>(null)
  const piloto = useRef<THREE.Group>(null)
  const pernas = useRef<THREE.Group>(null)
  const rodaF = useRef<THREE.Group>(null)
  const rodaT = useRef<THREE.Group>(null)
  const enc = useRef(0)
  useFrame((_, dt) => {
    const v = vel(), s = steer(), m = manobra(), noAr = ar()
    enc.current += ((noAr ? 1 : 0) - enc.current) * Math.min(1, dt * 10)
    const giro = (v * dt) / 0.27
    if (rodaF.current) rodaF.current.rotation.x += giro
    if (rodaT.current) rodaT.current.rotation.x += giro
    const forca = Math.min(1, v / 8)
    if (corpo.current) corpo.current.rotation.z = -s * 0.32 * forca * (1 - enc.current)
    // as manobras: uma volta inteira de 0 a 1
    const p = m ? m.p : 0, volta = Math.sin(Math.PI * p) ** 2
    if (guidao.current) guidao.current.rotation.y = m?.tipo === "BARSPIN" ? p * Math.PI * 2 : s * 0.25
    if (quadro.current) quadro.current.rotation.y = m?.tipo === "TAILWHIP" ? p * Math.PI * 2 : 0
    if (piloto.current) {
      piloto.current.rotation.x = m?.tipo === "SUPERMAN" ? -volta * 1.0 : 0.1 * enc.current
      piloto.current.position.y = m?.tipo === "SUPERMAN" ? volta * 0.25 : -enc.current * 0.12
    }
    if (pernas.current) pernas.current.rotation.x = m?.tipo === "SUPERMAN" ? volta * 1.3 : 0
  })
  return (
    <group ref={corpo}>
      {/* a bicicleta. O "quadro" gira em torno do eixo do guidão (z = 0,45) no tailwhip */}
      <group position={[0, 0, 0.45]}>
        <group ref={quadro}>
          <group position={[0, 0, -0.45]}>
            <group position={[0, 0.3, -0.5]}><Roda r={rodaT} /></group>
            <mesh position={[0, 0.42, -0.02]} rotation-x={-0.12}><boxGeometry args={[0.06, 0.06, 0.95]} /><meshStandardMaterial color={CASACO} metalness={0.4} roughness={0.4} /></mesh>
            <mesh position={[0, 0.36, -0.28]} rotation-x={0.75}><boxGeometry args={[0.05, 0.05, 0.5]} /><meshStandardMaterial color={CASACO} metalness={0.4} roughness={0.4} /></mesh>
            <mesh position={[0, 0.62, -0.3]}><boxGeometry args={[0.1, 0.05, 0.22]} /><meshStandardMaterial color={ESCURO} /></mesh>
            <mesh position={[0, 0.3, -0.05]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.07, 0.07, 0.06, 10]} /><meshStandardMaterial color="#ffc857" /></mesh>
            {/* os pegs (onde o piloto pisa) */}
            <mesh position={[0, 0.3, -0.05]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.03, 0.03, 0.42, 6]} /><meshStandardMaterial color="#c9c3d6" metalness={0.6} roughness={0.3} /></mesh>
          </group>
        </group>
        <group ref={guidao}>
          <group position={[0, 0.3, 0.07]}><Roda r={rodaF} /></group>
          <mesh position={[0, 0.55, 0.04]} rotation-x={0.25}><boxGeometry args={[0.05, 0.52, 0.05]} /><meshStandardMaterial color={CASACO} metalness={0.4} roughness={0.4} /></mesh>
          <mesh position={[0, 0.84, 0]}><boxGeometry args={[0.62, 0.04, 0.04]} /><meshStandardMaterial color={ESCURO} /></mesh>
        </group>
      </group>
      {/* o piloto em pé nos pegs, debruçado no guidão */}
      <group ref={piloto} position={[0, 0.32, -0.05]}>
        <group ref={pernas}>
          {[-1, 1].map((l) => (
            <mesh key={l} position={[l * 0.17, 0.36, 0.02]} rotation-x={-0.15}><boxGeometry args={[0.14, 0.74, 0.16]} /><meshStandardMaterial color={CALCA} /></mesh>
          ))}
        </group>
        <mesh position={[0, 0.98, 0.18]} rotation-x={0.55}><boxGeometry args={[0.42, 0.6, 0.25]} /><meshStandardMaterial color={CASACO} roughness={0.7} /></mesh>
        {[-1, 1].map((l) => (
          <mesh key={l} position={[l * 0.26, 0.9, 0.38]} rotation-x={1.05}><boxGeometry args={[0.1, 0.5, 0.1]} /><meshStandardMaterial color={CASACO} /></mesh>
        ))}
        <group position={[0, 1.38, 0.4]}><Cabeca /></group>
      </group>
    </group>
  )
}

export function Skatista({ vel, steer, ar, manobra, grind = () => false, empurra = () => false }: Props) {
  const corpo = useRef<THREE.Group>(null)
  const prancha = useRef<THREE.Group>(null)
  const peTras = useRef<THREE.Group>(null)
  const tronco = useRef<THREE.Group>(null)
  const faisca = useRef<THREE.Mesh>(null)
  const fase = useRef(0)
  const enc = useRef(0)
  useFrame((_, dt) => {
    const v = vel(), s = steer(), m = manobra(), noAr = ar(), g = grind()
    enc.current += ((noAr || g ? 1 : 0) - enc.current) * Math.min(1, dt * 10)
    const e = enc.current, forca = Math.min(1, v / 8)
    // inclina pra dentro da curva, rolando a prancha no eixo dela
    if (corpo.current) corpo.current.rotation.z = -s * 0.3 * forca * (1 - e)
    if (prancha.current) {
      const p = m ? m.p : 0
      prancha.current.rotation.z = m ? (m.tipo === "HEELFLIP" ? -1 : 1) * p * Math.PI * 2 : 0
      prancha.current.position.y = m ? Math.sin(Math.PI * p) * 0.35 : 0
    }
    // a remada: o pé de trás desce na rua e volta (só no chão e acelerando)
    const rema = empurra() && !noAr && !g
    fase.current += dt * (rema ? 7 : 0)
    if (peTras.current) {
      const k = rema ? Math.max(0, Math.sin(fase.current)) : 0
      peTras.current.rotation.x = k * 0.7
      peTras.current.position.y = 0.12 - k * 0.1
    }
    if (tronco.current) { tronco.current.position.y = -e * 0.22; tronco.current.rotation.z = e * 0.12 }
    if (faisca.current) {
      faisca.current.visible = g
      if (g) { const k = 0.6 + Math.random() * 0.8; faisca.current.scale.set(k, k, 0.6 + Math.random()) }
    }
  })
  return (
    <group ref={corpo}>
      <group ref={prancha}>
        <mesh position={[0, 0.13, 0]}><boxGeometry args={[0.26, 0.035, 0.86]} /><meshStandardMaterial color={ESCURO} /></mesh>
        <mesh position={[0, 0.11, 0]}><boxGeometry args={[0.2, 0.01, 0.8]} /><meshStandardMaterial color={CASACO} /></mesh>
        {[-0.28, 0.28].map((z) => (
          <group key={z}>
            <mesh position={[0, 0.085, z]}><boxGeometry args={[0.2, 0.04, 0.06]} /><meshStandardMaterial color="#c9c3d6" metalness={0.6} roughness={0.3} /></mesh>
            {[-0.1, 0.1].map((x) => (
              <mesh key={x} position={[x, 0.05, z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.05, 0.05, 0.05, 10]} /><meshStandardMaterial color={NEON} emissive={NEON} emissiveIntensity={0.8} /></mesh>
            ))}
          </group>
        ))}
      </group>
      {/* a faísca do grind, no truck de trás */}
      <mesh ref={faisca} position={[0, 0.06, -0.38]} rotation-x={-Math.PI / 2} visible={false}>
        <coneGeometry args={[0.18, 0.7, 8, 1, true]} />
        <meshBasicMaterial color="#ffcf8a" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* o corpo de lado (olhando pra direita da prancha), base aberta */}
      <group ref={tronco} rotation-y={-Math.PI / 2}>
        <mesh position={[0.24, 0.55, 0]} rotation-z={0.12}><boxGeometry args={[0.14, 0.8, 0.16]} /><meshStandardMaterial color={CALCA} /></mesh>
        <group ref={peTras} position={[-0.24, 0.12, 0]}>
          <mesh position={[0, 0.43, 0]} rotation-z={-0.12}><boxGeometry args={[0.14, 0.8, 0.16]} /><meshStandardMaterial color={CALCA} /></mesh>
        </group>
        <mesh position={[0, 1.22, 0]} rotation-z={0.08}><boxGeometry args={[0.26, 0.62, 0.44]} /><meshStandardMaterial color={CASACO} roughness={0.7} /></mesh>
        {[-1, 1].map((l) => (
          <mesh key={l} position={[l * 0.12, 1.2, l * 0.34]} rotation-x={l * 0.6}><boxGeometry args={[0.1, 0.55, 0.1]} /><meshStandardMaterial color={CASACO} /></mesh>
        ))}
        <group position={[0.04, 1.68, 0]} rotation-y={Math.PI / 2 - 0.5}><Cabeca /></group>
      </group>
    </group>
  )
}

// T14: a moto (motocross leve). Pneus com cravo, garfo comprido, tanque,
// banco e o paralama alto; o piloto de capacete e em pé nas pedaleiras. O
// nariz (peso pra frente/trás, a empinada) gira em torno da roda de trás no
// chão e do meio da moto no ar.
const MOTO = "#ff3fb0", PLASTICO = "#f2eefa"
// (leveza 06/11) os materiais da moto são do módulo: eram 23 materiais novos por
// montagem (um por peça), agora 15 compartilhados. O visual é o mesmo (as mesmas props)
const std = (color: string, roughness = 1, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
const MAT_MOTO = {
  pneu: std(ESCURO, 0.95),
  aro: new THREE.MeshBasicMaterial({ color: NEON, transparent: true, opacity: 0.4, toneMapped: false }),
  cromo: std("#c9c3d6", 0.3, 0.6),
  garfo: std("#ffc857", 0.35, 0.5),
  moto: std(MOTO),
  motoLiso: std(MOTO, 0.5),
  escuro: std(ESCURO),
  escuroMetal: std(ESCURO, 0.4, 0.5),
  plastico: std(PLASTICO),
  capacete: std(PLASTICO, 0.35),
  escape: std("#8f8aa0", 0.25, 0.7),
  calca: std(CALCA),
  casaco: std(CASACO),
  casacoTorso: std(CASACO, 0.7),
  viseira: new THREE.MeshStandardMaterial({ color: NEON, emissive: NEON, emissiveIntensity: 0.8 }),
}
function PneuCravo({ r }: { r: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={r}>
      <mesh rotation-y={Math.PI / 2} material={MAT_MOTO.pneu}><torusGeometry args={[0.31, 0.085, 6, 16]} /></mesh>
      <mesh rotation-z={Math.PI / 2} material={MAT_MOTO.aro}><cylinderGeometry args={[0.2, 0.2, 0.04, 10]} /></mesh>
      <mesh rotation-z={Math.PI / 2} material={MAT_MOTO.cromo}><cylinderGeometry args={[0.05, 0.05, 0.14, 8]} /></mesh>
    </group>
  )
}
export function Motoqueiro({ vel, steer, ar, pitch, empurra = () => false }: { vel: () => number; steer: () => number; ar: () => boolean; pitch: () => number; empurra?: () => boolean }) {
  const corpo = useRef<THREE.Group>(null)
  const pivo = useRef<THREE.Group>(null)
  const nariz = useRef<THREE.Group>(null)
  const piloto = useRef<THREE.Group>(null)
  const rodaF = useRef<THREE.Group>(null)
  const rodaT = useRef<THREE.Group>(null)
  const garfo = useRef<THREE.Group>(null)
  const enc = useRef(0)
  useFrame((_, dt) => {
    const v = vel(), s = steer(), noAr = ar(), p = pitch()
    enc.current += ((noAr ? 1 : 0) - enc.current) * Math.min(1, dt * 10)
    // no ar a roda gira solta (com o acelerador, mais)
    const giro = noAr ? (empurra() ? 30 : 12) * dt : (v * dt) / 0.39
    if (rodaF.current) rodaF.current.rotation.x += giro
    if (rodaT.current) rodaT.current.rotation.x += giro
    const forca = Math.min(1, v / 10)
    if (corpo.current) corpo.current.rotation.z = -s * 0.38 * forca * (1 - enc.current)
    if (garfo.current) garfo.current.rotation.y = s * 0.22 * (1 - enc.current)
    // o pivô: a roda de trás no chão (empinada), o meio da moto no ar
    const zp = -0.62 * (1 - enc.current), yp = 0.4 * enc.current
    if (pivo.current) pivo.current.position.set(0, yp, zp)
    if (nariz.current) { nariz.current.position.set(0, -yp, -zp); }
    if (pivo.current) pivo.current.rotation.x = -p
    // o piloto: no ar encolhe; o peso vai pra trás quando o nariz sobe
    if (piloto.current) {
      piloto.current.position.z = -Math.max(-0.25, Math.min(0.25, p * 0.2))
      piloto.current.position.y = -enc.current * 0.08
    }
  })
  return (
    <group ref={corpo}>
      <group ref={pivo}>
        <group ref={nariz}>
          <group position={[0, 0.39, -0.62]}><PneuCravo r={rodaT} /></group>
          {/* o garfo e a roda da frente (viram com a direção) */}
          <group ref={garfo} position={[0, 0.39, 0.66]}>
            <group><PneuCravo r={rodaF} /></group>
            {[-1, 1].map((l) => (
              <mesh key={l} position={[l * 0.1, 0.42, -0.12]} rotation-x={-0.42} material={MAT_MOTO.garfo}><cylinderGeometry args={[0.035, 0.035, 0.95, 6]} /></mesh>
            ))}
            <mesh position={[0, 0.34, 0.05]} rotation-x={-0.25} material={MAT_MOTO.moto}><boxGeometry args={[0.2, 0.03, 0.42]} /></mesh>
            <mesh position={[0, 0.88, -0.32]} material={MAT_MOTO.escuro}><boxGeometry args={[0.72, 0.04, 0.04]} /></mesh>
            {/* a placa do número */}
            <mesh position={[0, 0.78, -0.2]} rotation-x={-0.35} material={MAT_MOTO.plastico}><boxGeometry args={[0.26, 0.22, 0.03]} /></mesh>
          </group>
          {/* o quadro, o motor, o tanque, o banco e o paralama de trás */}
          <mesh position={[0, 0.48, 0]} rotation-x={0.08} material={MAT_MOTO.escuroMetal}><boxGeometry args={[0.2, 0.3, 0.5]} /></mesh>
          <mesh position={[0, 0.82, 0.18]} rotation-x={-0.1} material={MAT_MOTO.motoLiso}><boxGeometry args={[0.32, 0.2, 0.42]} /></mesh>
          <mesh position={[0, 0.86, -0.32]} rotation-x={0.08} material={MAT_MOTO.escuro}><boxGeometry args={[0.22, 0.08, 0.62]} /></mesh>
          <mesh position={[0, 0.8, -0.78]} rotation-x={0.35} material={MAT_MOTO.moto}><boxGeometry args={[0.2, 0.03, 0.42]} /></mesh>
          <mesh position={[0, 0.58, -0.4]} rotation-x={0.5} material={MAT_MOTO.cromo}><boxGeometry args={[0.06, 0.06, 0.55]} /></mesh>
          {/* o escape */}
          <mesh position={[0.17, 0.62, -0.42]} rotation-x={Math.PI / 2 - 0.25} material={MAT_MOTO.escape}><cylinderGeometry args={[0.05, 0.06, 0.5, 8]} /></mesh>
          {/* o piloto em pé nas pedaleiras, braços no guidão */}
          <group ref={piloto} position={[0, 0.4, -0.05]}>
            {[-1, 1].map((l) => (
              <mesh key={l} position={[l * 0.2, 0.36, -0.02]} rotation-x={0.25} material={MAT_MOTO.calca}><boxGeometry args={[0.15, 0.72, 0.17]} /></mesh>
            ))}
            <mesh position={[0, 0.98, 0.1]} rotation-x={0.6} material={MAT_MOTO.casacoTorso}><boxGeometry args={[0.44, 0.6, 0.27]} /></mesh>
            {[-1, 1].map((l) => (
              <mesh key={l} position={[l * 0.3, 0.98, 0.36]} rotation-x={1.15} material={MAT_MOTO.casaco}><boxGeometry args={[0.1, 0.5, 0.1]} /></mesh>
            ))}
            {/* o capacete com a viseira neon */}
            <group position={[0, 1.4, 0.32]}>
              <mesh material={MAT_MOTO.capacete}><sphereGeometry args={[0.19, 14, 10]} /></mesh>
              <mesh position={[0, 0.02, 0.15]} material={MAT_MOTO.viseira}><boxGeometry args={[0.24, 0.08, 0.08]} /></mesh>
              <mesh position={[0, 0.12, 0.17]} rotation-x={-0.3} material={MAT_MOTO.moto}><boxGeometry args={[0.26, 0.03, 0.16]} /></mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
