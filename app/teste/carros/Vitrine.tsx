"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useMemo } from "react"
import { montarModelos } from "../../linha/estrada/carros"

export function Vitrine() {
  const modelos = useMemo(() => montarModelos(), [])
  return (
    <div style={{ position: "fixed", inset: 0, background: "#2a2a3a" }}>
      <Canvas camera={{ position: [9, 5, 9], fov: 45 }}>
        <hemisphereLight args={["#ffffff", "#444455", 1.2]} />
        <directionalLight position={[5, 8, 4]} intensity={1.4} />
        {modelos.map((m, i) => (
          <group key={m.perfil.nome} position={[((i % 3) - 1) * 3.2, 0, (Math.floor(i / 3) - 0.5) * 6.5]} rotation-y={0.6}>
            <mesh geometry={m.pintada}><meshStandardMaterial color={m.perfil.cores[0]} metalness={0.5} roughness={0.35} /></mesh>
            <mesh geometry={m.escura}><meshStandardMaterial vertexColors metalness={0.6} roughness={0.25} /></mesh>
            <mesh geometry={m.luzes}><meshBasicMaterial vertexColors toneMapped={false} /></mesh>
          </group>
        ))}
        <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[30, 30]} /><meshStandardMaterial color="#3a3a44" /></mesh>
        <OrbitControls />
      </Canvas>
    </div>
  )
}
