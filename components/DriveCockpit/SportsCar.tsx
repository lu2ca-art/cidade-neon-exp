"use client"

// Sports car low-poly procedural, estilo DeLorean/Countach synthwave.
// Construído com boxes/cylinders puros pra ficar leve e no vibe Horizon Drive.
//
// Dimensões: comprimento ~4u, largura ~2u, altura ~1u (baixo e agressivo).
// Frente aponta pra -Z (convenção Three.js/R3F).

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

// Dimensões (world units)
const LENGTH = 4.0
const WIDTH = 1.9
const HEIGHT_BODY = 0.55
const HEIGHT_ROOF = 0.35
const WHEEL_R = 0.35
const WHEEL_W = 0.28

// Exposto pro RigidBody usar como CuboidCollider (half-extents)
export const SPORTS_CAR_HALF = [WIDTH / 2, (HEIGHT_BODY + HEIGHT_ROOF) / 2, LENGTH / 2] as const

export interface SportsCarProps {
  /** Reflete a velocidade do carro pra girar as rodas (m/s ao longo do forward). */
  wheelSpin?: number
  /** Reflete o steer (-1..1) — vira as rodas dianteiras. */
  steerValue?: number
}

export function SportsCar({ wheelSpin = 0, steerValue = 0 }: SportsCarProps) {
  const wheelsRef = useRef<THREE.Group>(null)
  const frontWheelsRef = useRef<THREE.Group>(null)
  const spinRef = useRef(0)

  useFrame((_, delta) => {
    // gira todas as rodas pelo eixo local X (rolamento)
    spinRef.current += wheelSpin * delta * 3
    if (wheelsRef.current) {
      wheelsRef.current.children.forEach((wheel) => {
        wheel.rotation.x = spinRef.current
      })
    }
    // vira só as dianteiras no eixo Y (steering)
    if (frontWheelsRef.current) {
      frontWheelsRef.current.rotation.y = steerValue * 0.5
    }
  })

  return (
    <group>
      {/* Corpo principal — box longo e baixo, cor preto-azulado profundo */}
      <mesh position={[0, HEIGHT_BODY / 2 + WHEEL_R * 0.5, 0]} castShadow>
        <boxGeometry args={[WIDTH, HEIGHT_BODY, LENGTH]} />
        <meshStandardMaterial color="#12121e" metalness={0.7} roughness={0.35} />
      </mesh>

      {/* Chanfrado dianteiro (cunha aerodinâmica) */}
      <mesh
        position={[0, HEIGHT_BODY / 2 + WHEEL_R * 0.5 - 0.05, -LENGTH / 2 - 0.15]}
        castShadow
      >
        <boxGeometry args={[WIDTH * 0.95, HEIGHT_BODY * 0.7, 0.4]} />
        <meshStandardMaterial color="#0a0a15" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Cabine (teto + vidros) — box menor centrado, deslocado pra trás */}
      <mesh
        position={[0, HEIGHT_BODY + HEIGHT_ROOF / 2 + WHEEL_R * 0.5, 0.2]}
        castShadow
      >
        <boxGeometry args={[WIDTH * 0.85, HEIGHT_ROOF, LENGTH * 0.55]} />
        <meshStandardMaterial color="#0a0518" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Vidro frontal (plano transparente escuro inclinado) */}
      <mesh
        position={[0, HEIGHT_BODY + HEIGHT_ROOF * 0.7 + WHEEL_R * 0.5, -0.3]}
        rotation={[-Math.PI / 6, 0, 0]}
      >
        <planeGeometry args={[WIDTH * 0.8, HEIGHT_ROOF * 0.85]} />
        <meshPhysicalMaterial
          color="#000814"
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.6}
        />
      </mesh>

      {/* Vidro traseiro */}
      <mesh
        position={[0, HEIGHT_BODY + HEIGHT_ROOF * 0.7 + WHEEL_R * 0.5, 0.7]}
        rotation={[Math.PI / 6, 0, 0]}
      >
        <planeGeometry args={[WIDTH * 0.8, HEIGHT_ROOF * 0.75]} />
        <meshPhysicalMaterial
          color="#000814"
          transparent
          opacity={0.55}
          roughness={0.1}
          metalness={0.6}
        />
      </mesh>

      {/* Aerofólio traseiro (box fino elevado) */}
      <group position={[0, HEIGHT_BODY + HEIGHT_ROOF + WHEEL_R * 0.5 + 0.06, LENGTH / 2 - 0.15]}>
        {/* pé esquerdo */}
        <mesh position={[-WIDTH / 2 + 0.15, -0.08, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.06]} />
          <meshStandardMaterial color="#1a1a2a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* pé direito */}
        <mesh position={[WIDTH / 2 - 0.15, -0.08, 0]}>
          <boxGeometry args={[0.06, 0.16, 0.06]} />
          <meshStandardMaterial color="#1a1a2a" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* asa */}
        <mesh>
          <boxGeometry args={[WIDTH * 0.9, 0.04, 0.28]} />
          <meshStandardMaterial color="#0a0a15" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Lanternas traseiras — 2 planos laranja neon brilhantes */}
      <mesh position={[-WIDTH / 4 - 0.05, HEIGHT_BODY * 0.65 + WHEEL_R * 0.5, LENGTH / 2 + 0.02]}>
        <planeGeometry args={[WIDTH * 0.35, 0.14]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      <mesh position={[WIDTH / 4 + 0.05, HEIGHT_BODY * 0.65 + WHEEL_R * 0.5, LENGTH / 2 + 0.02]}>
        <planeGeometry args={[WIDTH * 0.35, 0.14]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>

      {/* Faixa magenta neon atravessando o meio traseiro */}
      <mesh position={[0, HEIGHT_BODY * 0.4 + WHEEL_R * 0.5, LENGTH / 2 + 0.021]}>
        <planeGeometry args={[WIDTH * 0.92, 0.04]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>

      {/* Faróis dianteiros — 2 planos brancos */}
      <mesh position={[-WIDTH / 3, HEIGHT_BODY * 0.6 + WHEEL_R * 0.5, -LENGTH / 2 - 0.36]}>
        <planeGeometry args={[WIDTH * 0.28, 0.12]} />
        <meshBasicMaterial color="#e8f4ff" toneMapped={false} />
      </mesh>
      <mesh position={[WIDTH / 3, HEIGHT_BODY * 0.6 + WHEEL_R * 0.5, -LENGTH / 2 - 0.36]}>
        <planeGeometry args={[WIDTH * 0.28, 0.12]} />
        <meshBasicMaterial color="#e8f4ff" toneMapped={false} />
      </mesh>

      {/* Underglow neon (linha luminosa sob o carro, feel synthwave) */}
      <mesh position={[0, WHEEL_R * 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WIDTH * 0.98, LENGTH * 0.95]} />
        <meshBasicMaterial color="#ff2d78" toneMapped={false} transparent opacity={0.45} />
      </mesh>

      {/* Rodas — 4 cilindros pretos com aro neon */}
      <group ref={wheelsRef}>
        {/* traseira esquerda */}
        <group position={[-WIDTH / 2, WHEEL_R, LENGTH / 2 - WHEEL_R - 0.05]}>
          <Wheel />
        </group>
        {/* traseira direita */}
        <group position={[WIDTH / 2, WHEEL_R, LENGTH / 2 - WHEEL_R - 0.05]}>
          <Wheel />
        </group>
      </group>
      {/* dianteiras — dentro de um group extra que gira em Y pra steering */}
      <group position={[0, 0, -LENGTH / 2 + WHEEL_R + 0.05]}>
        <group ref={frontWheelsRef}>
          <group position={[-WIDTH / 2, WHEEL_R, 0]}>
            <Wheel />
          </group>
          <group position={[WIDTH / 2, WHEEL_R, 0]}>
            <Wheel />
          </group>
        </group>
      </group>
    </group>
  )
}

function Wheel() {
  return (
    <group>
      {/* pneu preto */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_W, 20]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* aro cyan neon na face externa */}
      <mesh position={[WHEEL_W / 2 + 0.001, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[WHEEL_R * 0.4, WHEEL_R * 0.85, 24]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* aro magenta na face interna */}
      <mesh position={[-WHEEL_W / 2 - 0.001, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[WHEEL_R * 0.4, WHEEL_R * 0.85, 24]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
