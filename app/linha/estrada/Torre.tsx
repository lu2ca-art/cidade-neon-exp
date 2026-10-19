"use client"

// A CENTRAL do mapa-disco (LU2CA 19/10): a torre de onde saem todas as pistas.
// Um prédio de vidro escuro com janelas; em cada andar, um anel de neon na cor
// da linha que sai dali (o box daquele andar contorna a torre); no topo, uma
// coroa que pulsa devagar. O elevador (trocar de linha) mora dentro.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { CentralDisco } from "./mundoDisco"

const CHAO = -12

export function TorreCentral({ c, janelas }: { c: CentralDisco; janelas: THREE.Texture }) {
  const topo = Math.max(...c.andares.map((a) => a.y)) + 22
  const alto = topo - CHAO
  const coroa = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => {
    const t = janelas.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, alto / 12)
    t.needsUpdate = true
    return t
  }, [janelas, alto])
  useFrame(({ clock }) => {
    if (coroa.current) coroa.current.opacity = 0.65 + Math.sin(clock.elapsedTime * 1.4) * 0.25
  })
  return (
    <group position={[c.x, 0, c.z]}>
      {/* o prédio */}
      <mesh position={[0, CHAO + alto / 2, 0]}>
        <cylinderGeometry args={[c.nucleo, c.nucleo * 1.08, alto, 48, 1, false]} />
        <meshStandardMaterial color="#0b0a16" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} roughness={0.25} metalness={0.6} />
      </mesh>
      {/* um anel por andar, na cor da linha (e a laje do andar) */}
      {c.andares.map((a) => (
        <group key={a.nome} position={[0, a.y, 0]}>
          <mesh>
            <cylinderGeometry args={[c.nucleo + 0.6, c.nucleo + 0.6, 1.4, 48, 1, true]} />
            <meshBasicMaterial color={a.cor} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -1.2, 0]}>
            <cylinderGeometry args={[c.nucleo + 2.5, c.nucleo + 2.5, 0.8, 48]} />
            <meshStandardMaterial color="#14122a" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* a coroa */}
      <mesh position={[0, topo + 1, 0]}>
        <torusGeometry args={[c.nucleo * 0.75, 1.1, 10, 64]} />
        <meshBasicMaterial ref={coroa} color="#ff6a35" toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, topo + 14, 0]}>
        <cylinderGeometry args={[0.6, 1.4, 26, 8]} />
        <meshStandardMaterial color="#1a1830" emissive="#ff6a35" emissiveIntensity={0.6} />
      </mesh>
      <pointLight position={[0, topo + 6, 0]} color="#ff6a35" intensity={80} distance={260} />
    </group>
  )
}
