"use client"

// As bombas de rua no mapa (postos.ts): o toldo aceso, a bomba e a vaga.

import { useMemo } from "react"
import type { Mundo } from "./mundo"
import { poseLugar } from "./Lugares"
import { BOMBAS, type Bomba } from "./postos"
import type { Lugar } from "../lugares"

const COR = "#ffc857"

function UmaBomba({ M, b }: { M: Mundo; b: Bomba }) {
  const p = useMemo(() => poseLugar(M, { area: b.area, u: b.u, lado: b.lado } as Lugar, `bomba:${b.id}`), [M, b])
  return (
    <group position={[p.vaga.x, p.chao, p.vaga.z]} rotation-y={p.rumo}>
      <group position={[b.lado * 4.5, 0, 0]}>
        {/* o toldo em duas colunas, a faixa de luz e a bomba */}
        {[-3.5, 3.5].map((z) => <mesh key={z} position={[0, 2.6, z]}><boxGeometry args={[0.3, 5.2, 0.3]} /><meshStandardMaterial color="#2a2632" /></mesh>)}
        <mesh position={[0, 5.3, 0]}><boxGeometry args={[4, 0.4, 9]} /><meshStandardMaterial color="#1c1922" /></mesh>
        <mesh position={[0, 5.05, 0]}><boxGeometry args={[4.05, 0.12, 9.05]} /><meshStandardMaterial color={COR} emissive={COR} emissiveIntensity={1.1} /></mesh>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.8, 1.8, 0.6]} /><meshStandardMaterial color="#d23a3a" emissive="#d23a3a" emissiveIntensity={0.25} /></mesh>
        <mesh position={[b.lado * -0.41, 1.3, 0]}><boxGeometry args={[0.02, 0.5, 0.4]} /><meshBasicMaterial color={COR} /></mesh>
        <pointLight position={[0, 4.6, 0]} color={COR} intensity={30} distance={14} decay={2} />
      </group>
    </group>
  )
}

export function Bombas({ M }: { M: Mundo }) {
  return <group>{BOMBAS.map((b) => <UmaBomba key={b.id} M={M} b={b} />)}</group>
}
