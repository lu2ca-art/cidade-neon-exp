"use client"

// A CASINHA NO MEIO DO NADA (LU2CA 19/10): a casa da D-Bee no deserto, longe
// da cidade. De madeira, a luz acesa, a porta aberta, uma antena velha e a
// caixa d'água; e uma coluna de luz quente que se vê de longe (no começo é ali
// que ele tem que ir). Poucas peças, materiais simples: leve.

import { useMemo } from "react"
import * as THREE from "three"
import { CASA } from "./historia"

export function CasaDeserto({ chao, farol = true }: { chao: (x: number, z: number) => number; farol?: boolean }) {
  const y = useMemo(() => chao(CASA.x, CASA.z), [chao])
  // de frente pra cidade (o centro)
  const rot = Math.atan2(-CASA.x, -CASA.z)
  const mats = useMemo(() => ({
    madeira: new THREE.MeshStandardMaterial({ color: "#6b4a34", roughness: 0.9 }),
    telhado: new THREE.MeshStandardMaterial({ color: "#3a2a26", roughness: 0.8 }),
    luz: new THREE.MeshBasicMaterial({ color: "#ffcf8a", toneMapped: false }),
    metal: new THREE.MeshStandardMaterial({ color: "#8a8f9a", metalness: 0.6, roughness: 0.4 }),
    farol: new THREE.MeshBasicMaterial({ color: "#ffb35c", transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [])
  const telhado = useMemo(() => {
    // o telhado de duas águas: um prisma triangular
    const s = new THREE.Shape([new THREE.Vector2(-4.2, 0), new THREE.Vector2(4.2, 0), new THREE.Vector2(0, 2.4)])
    const g = new THREE.ExtrudeGeometry(s, { depth: 7.4, bevelEnabled: false })
    g.translate(0, 0, -3.7)
    return g
  }, [])
  return (
    <group position={[CASA.x, y - 0.4, CASA.z]} rotation={[0, rot, 0]}>
      {/* o cômodo */}
      <mesh position={[0, 1.8, 0]} material={mats.madeira}><boxGeometry args={[7.6, 3.6, 6.6]} /></mesh>
      <mesh position={[0, 3.6, 0]} material={mats.telhado} geometry={telhado} />
      {/* a porta aberta (a luz de dentro) e as duas janelas */}
      <mesh position={[0.9, 1.35, 3.31]} material={mats.luz}><planeGeometry args={[1.1, 2.2]} /></mesh>
      <mesh position={[-2, 2, 3.31]} material={mats.luz}><planeGeometry args={[1.2, 0.9]} /></mesh>
      <mesh position={[3.81, 2, 0.4]} rotation={[0, Math.PI / 2, 0]} material={mats.luz}><planeGeometry args={[1.2, 0.9]} /></mesh>
      {/* a varanda: o chão e dois postes */}
      <mesh position={[0, 0.25, 4.4]} material={mats.madeira}><boxGeometry args={[7.6, 0.3, 2]} /></mesh>
      <mesh position={[-3.5, 1.7, 5.2]} material={mats.madeira}><boxGeometry args={[0.2, 3, 0.2]} /></mesh>
      <mesh position={[3.5, 1.7, 5.2]} material={mats.madeira}><boxGeometry args={[0.2, 3, 0.2]} /></mesh>
      {/* a antena velha e a caixa d'água */}
      <mesh position={[-2.6, 7.2, -1.6]} material={mats.metal}><cylinderGeometry args={[0.06, 0.08, 6, 5]} /></mesh>
      <mesh position={[-2.6, 9.6, -1.6]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}><cylinderGeometry args={[0.04, 0.04, 2.4, 4]} /></mesh>
      <mesh position={[5.6, 3.3, -2.2]} material={mats.metal}><cylinderGeometry args={[1.1, 1.1, 1.6, 10]} /></mesh>
      <mesh position={[5.6, 1.25, -2.2]} material={mats.madeira}><boxGeometry args={[1.6, 2.5, 1.6]} /></mesh>
      {/* de longe: a coluna de luz quente (até ele chegar na porta) */}
      {farol && <mesh position={[0, 60, 0]} material={mats.farol}><cylinderGeometry args={[2.2, 3.4, 120, 10, 1, true]} /></mesh>}
    </group>
  )
}
