"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"
import { ESPECIES, type Especie } from "../../linha/estrada/canteiros"
import { geoFlor } from "../../linha/estrada/floresGeo"

const LISTA = Object.keys(ESPECIES) as Especie[]

function Uma({ e, x, murcha }: { e: Especie; x: number; murcha: boolean }) {
  const d = ESPECIES[e]
  const g = useMemo(() => geoFlor(e, d.cor, d.miolo, d.altura), [e, d])
  return <mesh geometry={g} position={[x, 0, murcha ? -1 : 0]}><meshStandardMaterial vertexColors roughness={0.65} side={THREE.DoubleSide} color={murcha ? "#7a7480" : "#ffffff"} /></mesh>
}

export function Vitrine() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#d8e4ec" }}>
      <Canvas camera={{ position: [0, 1.3, 3.2], fov: 50 }}>
        <hemisphereLight args={["#ffffff", "#6a8a5a", 1.4]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        {LISTA.map((e, i) => <Uma key={e} e={e} x={(i - 3) * 0.7} murcha={false} />)}
        {LISTA.map((e, i) => <Uma key={`m${e}`} e={e} x={(i - 3) * 0.7} murcha />)}
        <mesh rotation-x={-Math.PI / 2}><planeGeometry args={[8, 4]} /><meshStandardMaterial color="#3a2a22" /></mesh>
        <OrbitControls target={[0, 0.8, 0]} />
      </Canvas>
    </div>
  )
}
