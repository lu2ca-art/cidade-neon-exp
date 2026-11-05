"use client"

// As ruínas do subúrbio (ruinas.ts): as peças do kit (public/models/suburbio-ruinas.glb,
// blender/scripts/suburbio_ruinas.py) postas no traçado, assentadas no chão.
// Uma textura e um material só: as ~200 peças viram poucas malhas (uma por
// célula, mesclarPorMaterial) e ficam congeladas (Estatico).

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

import { Estatico, mesclarPorMaterial } from "./estatico"
import { ruinasNoMundo } from "./ruinas"
import { PECAS_RUINAS } from "./ruinasDados"

const URL = "/models/suburbio-ruinas.glb"
type MundoMin = Parameters<typeof ruinasNoMundo>[0]

export function RuinasSuburbio({ M }: { M: MundoMin }) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }
  const grupo = useMemo(() => {
    const g = new THREE.Group()
    g.name = "ruinas-suburbio"
    for (const p of ruinasNoMundo(M).postas) {
      const n = nodes[PECAS_RUINAS[p.peca].nome] as THREE.Mesh | undefined
      if (!n?.geometry) continue
      const lugar = new THREE.Group()
      lugar.position.set(p.x, p.y, p.z)
      lugar.rotation.y = p.giro
      // a malha leva a transformação do nó (a quantização do meshopt mexe nela)
      const m = new THREE.Mesh(n.geometry, n.material)
      m.position.copy(n.position)
      m.quaternion.copy(n.quaternion)
      m.scale.copy(n.scale)
      lugar.add(m)
      g.add(lugar)
    }
    mesclarPorMaterial(g, 6)
    return g
  }, [nodes, M])
  return <Estatico><primitive object={grupo} /></Estatico>
}

