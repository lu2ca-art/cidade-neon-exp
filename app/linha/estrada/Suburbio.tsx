"use client"

// O SUBÚRBIO XENOM, embaixo da cidade neon: dentro do anel da estrada
// elevada, no chão (o resto da cidade é água). O miolo é o modelo "CITY
// SUBURBS" de isabm (Sketchfab, CC-BY 4.0), otimizado de 157 MB pra ~3,5 MB
// (scratchpad/modelos/otimizar.mjs: sem normal/tangente, cópias como
// instância, simplificado, texturas 1k webp, meshopt). Crédito no jogo.

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

export const CREDITO_SUBURBIO = "“CITY SUBURBS” por isabm (sketchfab.com/isabm), CC-BY 4.0"
const URL = "/models/suburbio.glb"

// centro do bairro (o mesmo do anel da cidade) e quanto o modelo cresce
export function Suburbio({ cx, cz, raioChao }: { cx: number; cz: number; raioChao: number }) {
  const { scene } = useGLTF(URL)
  const modelo = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      // sem normal no arquivo (tirada pra caber no celular): recalcula
      if (!m.geometry.getAttribute("normal")) m.geometry.computeVertexNormals()
      m.frustumCulled = true
    })
    return g
  }, [scene])
  return (
    <group>
      {/* o chão do bairro (fora dele, a cidade é água) */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, -11.85, cz]}>
        <circleGeometry args={[raioChao, 64]} />
        <meshStandardMaterial color="#0c0d18" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* o miolo: centrado (o modelo vem com o centro em x 22, z 6) */}
      <primitive object={modelo} position={[cx - 22 * 1.4, -11.8, cz - 6 * 1.4]} scale={1.4} />
    </group>
  )
}

useGLTF.preload(URL)
