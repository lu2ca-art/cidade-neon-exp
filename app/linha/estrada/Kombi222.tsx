"use client"

// A Kombi da Linha 222 em 3D — mesma leitura da Kombi 2D que abriu a
// estrada: saia azul (#1a3fa0, o azul da capa), teto creme arredondado,
// "V" na frente, vidros escuros com reflexo cyan, grade do motor atrás,
// placa LU2 C4, lanternas vermelhas, faróis redondos e luz magenta
// embaixo, no asfalto molhado. A frente aponta pra -Z.

import { RoundedBox } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

const AZUL = "#1a3fa0"
const CREME = "#ece5d6"
const VIDRO = "#0b0f24"

function texPlaca() {
  const c = document.createElement("canvas")
  c.width = 256
  c.height = 80
  const g = c.getContext("2d")!
  g.fillStyle = "#e6e6e6"
  g.fillRect(0, 0, 256, 80)
  g.fillStyle = "#1a3fa0"
  g.fillRect(0, 0, 256, 16)
  g.fillStyle = "#fff"
  g.font = "bold 11px ui-monospace, monospace"
  g.textAlign = "center"
  g.fillText("CIDADE NEON", 128, 12)
  g.fillStyle = "#111"
  g.font = "bold 44px ui-monospace, monospace"
  g.fillText("LU2 C4", 128, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function texBrilho() {
  const c = document.createElement("canvas")
  c.width = c.height = 64
  const g = c.getContext("2d")!
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, "rgba(255,255,255,1)")
  gr.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function Roda({ x, z, giro }: { x: number; z: number; giro: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = giro.current
  })
  return (
    <group position={[x, 0.36, z]}>
      <group ref={ref}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.36, 0.36, 0.26, 20]} />
          <meshStandardMaterial color="#0a0a10" roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[x > 0 ? 0.135 : -0.135, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 16]} />
          <meshStandardMaterial color="#d9dde8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

export function Kombi222({ turbo, velocidade }: { turbo: React.MutableRefObject<boolean>; velocidade: React.MutableRefObject<number> }) {
  const placa = useMemo(() => texPlaca(), [])
  const brilho = useMemo(() => texBrilho(), [])
  const giro = useRef(0)
  const under = useRef<THREE.MeshBasicMaterial>(null)
  const escap = useRef<THREE.Mesh>(null)

  useFrame((s, dt) => {
    giro.current -= (velocidade.current / 0.36) * dt
    if (under.current) {
      under.current.color.set(turbo.current ? "#b38cff" : "#ff3fb0")
      under.current.opacity = 0.55 + Math.sin(s.clock.elapsedTime * 6) * 0.08
    }
    if (escap.current) {
      const on = turbo.current
      escap.current.visible = on
      if (on) escap.current.scale.setScalar(0.8 + Math.random() * 0.6)
    }
  })

  const vidro = <meshStandardMaterial color={VIDRO} metalness={0.9} roughness={0.08} emissive="#0e2a4a" emissiveIntensity={0.35} />

  return (
    <group>
      {/* luz embaixo, no chão molhado */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]}>
        <planeGeometry args={[3.6, 6]} />
        <meshBasicMaterial ref={under} map={brilho} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* saia azul */}
      <RoundedBox args={[1.86, 0.78, 4.3]} radius={0.16} smoothness={3} position={[0, 0.78, 0]}>
        <meshStandardMaterial color={AZUL} metalness={0.35} roughness={0.35} />
      </RoundedBox>
      {/* parte de cima creme, teto arredondado */}
      <RoundedBox args={[1.8, 0.95, 4.12]} radius={0.32} smoothness={4} position={[0, 1.58, 0.04]}>
        <meshStandardMaterial color={CREME} metalness={0.15} roughness={0.4} />
      </RoundedBox>
      {/* frisos de cromo entre as cores */}
      <mesh position={[0, 1.17, 0]}>
        <boxGeometry args={[1.9, 0.05, 4.34]} />
        <meshStandardMaterial color="#e6e9f2" metalness={1} roughness={0.15} />
      </mesh>

      {/* janelas laterais (4 de cada lado) */}
      {[-1, 1].map((l) =>
        [-1.35, -0.45, 0.45, 1.35].map((z) => (
          <mesh key={`${l}${z}`} position={[l * 0.905, 1.66, z]} rotation={[0, (l * Math.PI) / 2, 0]}>
            <planeGeometry args={[0.78, 0.5]} />
            {vidro}
          </mesh>
        )),
      )}
      {/* para-brisa bipartido */}
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 1.68, -2.1]} rotation={[0.12, Math.PI, 0]}>
          <planeGeometry args={[0.74, 0.55]} />
          {vidro}
        </mesh>
      ))}
      {/* vidro traseiro */}
      <mesh position={[0, 1.7, 2.11]}>
        <planeGeometry args={[1.2, 0.46]} />
        {vidro}
      </mesh>
      {/* reflexo cyan no vidro de trás */}
      <mesh position={[-0.35, 1.72, 2.115]}>
        <planeGeometry args={[0.16, 0.4]} />
        <meshBasicMaterial color="#2fe8ff" transparent opacity={0.22} toneMapped={false} />
      </mesh>

      {/* "V" na frente */}
      {[-1, 1].map((l) => (
        <mesh key={l} position={[l * 0.38, 1.1, -2.16]} rotation={[0, 0, l * -0.62]}>
          <boxGeometry args={[0.95, 0.07, 0.03]} />
          <meshStandardMaterial color={CREME} />
        </mesh>
      ))}
      {/* emblema redondo */}
      <mesh position={[0, 0.98, -2.17]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.15, 0.15, 0.03, 20]} />
        <meshStandardMaterial color="#e6e9f2" metalness={1} roughness={0.15} />
      </mesh>
      {/* faróis redondos */}
      {[-0.62, 0.62].map((x) => (
        <mesh key={x} position={[x, 0.95, -2.16]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.15, 0.15, 0.04, 20]} />
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
      ))}

      {/* traseira: grade do motor, placa, lanternas, para-choque */}
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} position={[-0.24 + k * 0.12, 1.0, 2.16]}>
          <boxGeometry args={[0.035, 0.22, 0.02]} />
          <meshStandardMaterial color="#0b1030" />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 2.16]}>
        <planeGeometry args={[0.5, 0.16]} />
        <meshBasicMaterial map={placa} toneMapped={false} />
      </mesh>
      {[-0.74, 0.74].map((x) => (
        <group key={x} position={[x, 1.0, 2.16]}>
          <mesh>
            <boxGeometry args={[0.13, 0.26, 0.04]} />
            <meshBasicMaterial color="#ff2436" toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[1.1, 1.1]} />
            <meshBasicMaterial map={brilho} color="#ff2436" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[-2.2, 2.2].map((z) => (
        <mesh key={z} position={[0, 0.48, z]}>
          <boxGeometry args={[1.95, 0.1, 0.1]} />
          <meshStandardMaterial color="#e6e9f2" metalness={1} roughness={0.15} />
        </mesh>
      ))}

      {/* chama do escapamento no turbo */}
      <mesh ref={escap} position={[0.55, 0.45, 2.35]} visible={false}>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial map={brilho} color="#b38cff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      <Roda x={-0.82} z={-1.35} giro={giro} />
      <Roda x={0.82} z={-1.35} giro={giro} />
      <Roda x={-0.82} z={1.35} giro={giro} />
      <Roda x={0.82} z={1.35} giro={giro} />
    </group>
  )
}
