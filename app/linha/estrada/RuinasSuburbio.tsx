"use client"

// As ruínas do subúrbio (ruinas.ts): as peças do kit (public/models/suburbio-ruinas.glb,
// blender/scripts/suburbio_ruinas.py) postas no traçado, assentadas no chão.
// Uma textura e um material só: as ~200 peças viram poucas malhas (uma por
// célula, mesclarPorMaterial) e ficam congeladas (Estatico).
// De noite elas acendem (RuinasLuz.tsx): janelas, letreiros, tambores de fogo
// e varais de luz, sem luz pontual nenhuma. Tudo aqui dentro do <Perto> do subúrbio.

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

import { ceuNaHora } from "../ceu"
import { Estatico, descartarMescladas, mesclarPorMaterial } from "./estatico"
import { ruinasNoMundo } from "./ruinas"
import { PECAS_RUINAS } from "./ruinasDados"
import { sortearLuzes } from "./luzesRuinas"
import { RuinasLuz, U, acesoNaNoite, janelasAcesas } from "./RuinasLuz"
import { VidaSuburbio } from "./VidaSuburbio"

const URL = "/models/suburbio-ruinas.glb"
type MundoMin = Parameters<typeof ruinasNoMundo>[0]

export function RuinasSuburbio({ M, hora }: { M: MundoMin; hora?: React.RefObject<number> }) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }
  const { grupo, luzes, noite } = useMemo(() => {
    const g = new THREE.Group()
    g.name = "ruinas-suburbio"
    const noite = new Map<THREE.Material, THREE.Material>()
    const pecas: Parameters<typeof sortearLuzes>[0] = []
    const { postas, colisores } = ruinasNoMundo(M)
    for (const p of postas) {
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
      pecas.push({ posta: p, malha: m })
    }
    // (antes de mesclar: os raios do sorteio batem em cada peça)
    g.updateMatrixWorld(true)
    const luzes = sortearLuzes(pecas, M, colisores)
    mesclarPorMaterial(g, 6)
    return { grupo: g, luzes, noite: [...noite.values()] }
  }, [nodes, M])
  // (revisão 05/11) o <Perto> desmonta as ruínas longe do subúrbio: as geometrias
  // mescladas aqui e os materiais de noite (clones) saem da GPU junto. As do glb
  // (em cache no useGLTF) ficam
  useEffect(() => () => { descartarMescladas(grupo, nodes); for (const m of noite) m.dispose() }, [grupo, nodes, noite])
  // a noite das ruínas segue o céu (sem hora: noite, como o jogo começa)
  useFrame((s) => {
    U.noite.value = acesoNaNoite(ceuNaHora(hora?.current ?? 21).noite)
    U.tempo.value = s.clock.elapsedTime % 1000
  })
  return (
    <Estatico>
      <primitive object={grupo} />
      <RuinasLuz luzes={luzes} />
      <VidaSuburbio M={M} luzes={luzes} />
    </Estatico>
  )
}
