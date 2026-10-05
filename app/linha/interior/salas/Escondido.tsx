"use client"

// O LUGAR ESCONDIDO (subúrbio, lugar 4, drama íntimo). Em cima de uma laje,
// atrás da caixa d'água: um pedaço de asfalto rachado e, no meio da rachadura,
// uma flor murcha. Chove (a chuva de três anos, que é dela). A Ella agachada.
// Lá em cima passa o trilho da Linha 9.
//
// O gesto: regar. Dez gotas do cantil boiando em volta da flor; cada toque
// numa gota, a flor levanta um pouco e a chuva diminui só ali.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { gota } from "../../som"
import { sinalizar } from "../bus"
import { Caixa, Chuva, Npc, Toque, type V3 } from "../comum"
import { Camera, type Plano, type SalaProps } from "../motor"

const CIANO = "#2fe8ff"
const VERDE = "#5dffa0"
const GOTAS = 10

const PLANOS: Record<string, Plano> = {
  chegada: { pos: [2.2, 1.7, 3.6], olha: [-0.4, 0.6, -0.4], fov: 58 },
  ella: { pos: [1.2, 1.2, 1.6], olha: [-0.7, 0.7, -0.5], fov: 50 },
  flor: { pos: [0.8, 1.05, 1.0], olha: [-0.1, 0.3, -0.1], fov: 56 },
}

export function SalaEscondido({ estado }: SalaProps) {
  const regando = estado.gesto === "prova:regar"
  const [regadas, setRegadas] = useState<number[]>([])
  const [posGesto, setPosGesto] = useState<number | null>(null)
  if (regando && posGesto === null) setPosGesto(estado.pos)
  const regou = posGesto !== null && estado.pos > posGesto
  const k = regou ? 1 : regadas.length / GOTAS

  const gotasPos = useMemo<V3[]>(() => Array.from({ length: GOTAS }, (_, i) => {
    const a = (i / GOTAS) * Math.PI * 2
    return [Math.cos(a) * (0.42 + (i % 2) * 0.12), 0.35 + (i % 3) * 0.15, Math.sin(a) * (0.42 + (i % 2) * 0.12)]
  }), [])
  const regar = (i: number) => {
    if (!regando || regadas.includes(i)) return
    gota(2)
    const n = [...regadas, i]
    setRegadas(n)
    if (n.length >= GOTAS) setTimeout(() => sinalizar({ t: "fim-gesto" }), 700)
  }
  // atalho de teste
  const regarRef = useRef(regar)
  useEffect(() => { regarRef.current = regar })
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__gesto = () => { for (let i = 0; i < GOTAS; i++) setTimeout(() => regarRef.current(i), i * 30) }
    return () => { delete w.__gesto }
  }, [])

  const plano = useMemo(() => {
    if (regando || estado.ganha) return PLANOS.flor
    if (estado.falando === "Ella" || estado.falando === "você") return PLANOS.ella
    return PLANOS.chegada
  }, [estado, regando])

  return (
    <>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 6, 24]} />
      <ambientLight intensity={0.25} color="#9fc8ff" />
      <hemisphereLight args={["#6f8cc8", "#0a0c10", 0.4]} />
      {/* a laje molhada */}
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.15} metalness={0.5} />
      </mesh>
      {/* a rachadura do asfalto, onde a flor nasceu */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.05, 0.4, 7, 1]} />
        <meshStandardMaterial color="#08080a" roughness={1} />
      </mesh>
      {/* a caixa d'água */}
      <group position={[-2.6, 0, -2.4]}>
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[1.3, 1.3, 2.2, 24]} />
          <meshStandardMaterial color="#3a5a7a" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.8, 0]}>
          <cylinderGeometry args={[1.35, 1.35, 0.15, 24]} />
          <meshStandardMaterial color="#2a4058" />
        </mesh>
        {[[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]].map(([x, z]) => <Caixa key={`${x}${z}`} pos={[x, 0.25, z]} tam={[0.12, 0.5, 0.12]} cor="#2a2a30" />)}
      </group>
      {/* a mureta e, lá em cima, o trilho da Linha 9 passando */}
      <Caixa pos={[0, 0.45, -4.5]} tam={[12, 0.9, 0.25]} cor="#24262e" />
      <Caixa pos={[0, 7.5, -6]} tam={[30, 0.6, 1.4]} cor="#d8dce8" brilho={0.05} />
      {/* o poste da rua de baixo, a única luz da laje */}
      <group position={[2.6, 0, -1.6]}>
        <mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.06, 3.2, 6]} /><meshStandardMaterial color="#2a2c34" /></mesh>
        <mesh position={[-0.3, 3.2, 0]}><sphereGeometry args={[0.12, 10, 8]} /><meshBasicMaterial color="#ffe0a8" toneMapped={false} /></mesh>
        <pointLight position={[-0.4, 3, 0.3]} color="#ffcf8a" intensity={14} distance={10} decay={2} />
      </group>
      <Flor k={k} />
      <pointLight position={[0, 0.8, 0.3]} color={VERDE} intensity={0.5 + k * 3} distance={3} decay={2} />
      {/* a Ella agachada do lado (pose sentada, baixa) */}
      <Npc cor={CIANO} pos={[-0.95, -0.32, -0.55]} vira={0.7} pose="sentada" falando={estado.falando === "Ella"} />
      {/* as gotas do cantil */}
      {!regou && gotasPos.map((p, i) => (
        <Toque key={i} pos={p} raio={0.08} cor={CIANO} ativo={regando && !regadas.includes(i)} onToque={() => regar(i)}>
          {!regadas.includes(i) && regando && (
            <mesh>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color={CIANO} emissive={CIANO} emissiveIntensity={0.8} transparent opacity={0.85} />
            </mesh>
          )}
        </Toque>
      ))}
      {/* a chuva: diminui em volta da flor conforme você rega */}
      <Chuva n={Math.round(700 - k * 450)} larg={14} alto={9} fundo={14} />
      <Camera plano={plano} />
    </>
  )
}

// a flor: murcha (curvada pro chão, sem cor) → de pé, aberta, verde-água
function Flor({ k }: { k: number }) {
  const caule = useRef<THREE.Group>(null)
  const kk = useRef(0)
  useFrame((s, dt) => {
    kk.current += (k - kk.current) * Math.min(1, dt * 2)
    if (caule.current) {
      caule.current.rotation.z = (1 - kk.current) * 1.1 + Math.sin(s.clock.elapsedTime * 1.5) * 0.03
      caule.current.scale.setScalar(0.8 + kk.current * 0.4)
    }
  })
  const cor = new THREE.Color("#5a5a50").lerp(new THREE.Color(VERDE), k)
  return (
    <group ref={caule} position={[0, 0.01, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.012, 0.016, 0.4, 6]} />
        <meshStandardMaterial color="#3f7a4a" />
      </mesh>
      {[0.4, 2.5].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.05, 0.14, Math.sin(a) * 0.05]} rotation={[0.7, a, 0]} scale={[1, 0.3, 0.6]}>
          <sphereGeometry args={[0.06, 8, 6]} />
          <meshStandardMaterial color="#3f9a5a" />
        </mesh>
      ))}
      <group position={[0, 0.42, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[Math.cos(i * 1.256) * 0.045, 0, Math.sin(i * 1.256) * 0.045]} scale={[1, 0.35, 0.7]}>
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={0.2 + k * 0.6} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  )
}
