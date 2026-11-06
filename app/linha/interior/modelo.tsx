"use client"

// (06/11) As salas modeladas no Blender (blender/scripts/sala_kit.py: o topo,
// o quarto): um .glb com um nó "sala" e as malhas sala_solido (cor no vértice
// com a AO e um pouco da luz assadas), sala_luz e sala_neon (brilham pelo
// material, sem luz nova) e sala_vidro (poça, vidro). Os materiais são os
// mesmos pra todas as salas (criados uma vez só); nada roda por quadro.
// Sempre dentro de um <ModeloSeguro> (o reserva são as caixas de antes).

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

const GRUPOS = ["solido", "luz", "neon", "vidro"] as const
type Grupo = (typeof GRUPOS)[number]
let MATS: Record<Grupo, THREE.Material> | null = null
function mats() {
  if (!MATS) MATS = {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.05 }),
    luz: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    vidro: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false }),
  }
  return MATS
}

export function SalaGlb({ url }: { url: string }) {
  const { nodes } = useGLTF(url) as unknown as { nodes: Record<string, THREE.Object3D> }
  const partes = useMemo(() => {
    const m = mats()
    const out: { k: string; geo: THREE.BufferGeometry; mat: THREE.Material; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }[] = []
    for (const g of GRUPOS) {
      const o = nodes[`sala_${g}`] as THREE.Mesh | undefined
      if (!o?.geometry) continue
      o.updateWorldMatrix(true, false)
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), esc = new THREE.Vector3()
      o.matrixWorld.decompose(pos, quat, esc)
      out.push({ k: g, geo: o.geometry, mat: m[g], pos, quat, esc })
    }
    if (!out.some((p) => p.k === "solido")) throw new Error(`${url} sem a sala`)
    return out
  }, [nodes, url])
  return (
    <group name="sala-modelada">
      {partes.map((p) => (
        <mesh key={p.k} geometry={p.geo} material={p.mat} position={p.pos} quaternion={p.quat} scale={p.esc} />
      ))}
    </group>
  )
}
