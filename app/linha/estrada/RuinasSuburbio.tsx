"use client"

// As ruínas do subúrbio (ruinas.ts): as peças do kit (public/models/suburbio-ruinas.glb,
// blender/scripts/suburbio_ruinas.py) postas no traçado, assentadas no chão.
// Uma textura e um material só: as ~200 peças viram poucas malhas (uma por
// célula, mesclarPorMaterial) e ficam congeladas (Estatico).
// De noite elas acendem (RuinasLuz.tsx): janelas, sem luz pontual.

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useMemo } from "react"
import * as THREE from "three"

import { ceuNaHora } from "../ceu"
import { Estatico, mesclarPorMaterial } from "./estatico"
import { ruinasNoMundo } from "./ruinas"
import { PECAS_RUINAS } from "./ruinasDados"
import { U, acesoNaNoite, janelasAcesas } from "./RuinasLuz"

const URL = "/models/suburbio-ruinas.glb"
type MundoMin = Parameters<typeof ruinasNoMundo>[0]

export function RuinasSuburbio({ M, hora }: { M: MundoMin; hora?: React.RefObject<number> }) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }
  const grupo = useMemo(() => {
    const g = new THREE.Group()
    g.name = "ruinas-suburbio"
    const noite = new Map<THREE.Material, THREE.Material>()
    for (const p of ruinasNoMundo(M).postas) {
      const n = nodes[PECAS_RUINAS[p.peca].nome] as THREE.Mesh | undefined
      if (!n?.geometry) continue
      const base = n.material as THREE.Material
      let mat = noite.get(base)
      if (!mat) { mat = janelasAcesas(base); noite.set(base, mat) }
      const lugar = new THREE.Group()
      lugar.position.set(p.x, p.y, p.z)
      lugar.rotation.y = p.giro
      // a malha leva a transformação do nó (a quantização do meshopt mexe nela)
      const m = new THREE.Mesh(n.geometry, mat)
      m.position.copy(n.position)
      m.quaternion.copy(n.quaternion)
      m.scale.copy(n.scale)
      lugar.add(m)
      g.add(lugar)
    }
    mesclarPorMaterial(g, 6)
    return g
  }, [nodes, M])
  // a noite das ruínas segue o céu (sem hora: noite, como o jogo começa)
  useFrame((s) => {
    U.noite.value = acesoNaNoite(ceuNaHora(hora?.current ?? 21).noite)
    U.tempo.value = s.clock.elapsedTime % 1000
  })
  return <Estatico><primitive object={grupo} /></Estatico>
}
