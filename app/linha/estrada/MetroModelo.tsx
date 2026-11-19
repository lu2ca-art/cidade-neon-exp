"use client"

// O METRÔ MODELADO NO BLENDER (blender/scripts/metro.py, public/models/metro.glb):
// o trem do Núcleo abandonado e reaproveitado. Aço escovado riscado, o azul do
// Núcleo pintado e as linhas de luz, janelas com grade, pichação (malha de brilho,
// sem textura), portas de correr pintadas de laranja. Por dentro: bancos de
// plástico de cores trocadas, barras e alças, as propagandas do Núcleo apagadas,
// as luminárias (um tubo pisca, um queimou). A sombra vem assada na cor dos vértices.
// Nós: carro (o de fora: estrada/Metro.tsx e o trem parado nas trincheiras),
// vagao (interior/salas/Vagao.tsx) e fuga/fugaporta (metro/cena.ts, three puro).
// Materiais compartilhados, nenhuma luz nova; o tubo que pisca é um material só,
// mexido pelo useFrame que a sala já tem (piscarMetro).

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

export const URL_METRO = "/models/metro.glb"

let MATS: { solido: THREE.MeshStandardMaterial; brilho: THREE.MeshBasicMaterial; luz: THREE.MeshBasicMaterial; pisca: THREE.MeshBasicMaterial; neon: THREE.MeshBasicMaterial } | null = null
export function matsMetro() {
  if (!MATS) MATS = {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.25 }),
    brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    luz: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    pisca: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  }
  return MATS
}
type Grupo = keyof ReturnType<typeof matsMetro>
const MAT_DE: Record<string, Grupo> = { solido: "solido", brilho: "brilho", farol: "brilho", luz: "luz", pisca: "pisca", neon: "neon" }

// o tubo fluorescente ruim: chamado de um useFrame que já existe (nada novo por quadro)
export function piscarMetro(t: number) {
  const m = MATS?.pisca
  if (!m) return
  const s = Math.sin(t * 23) + Math.sin(t * 7.3) * 0.8 + Math.sin(t * 1.1) * 1.4
  const k = s > 1.6 ? 0.12 : s > 1.2 ? 0.55 : 1
  if (m.color.r !== k) m.color.setScalar(k)
}

type Parte = { k: string; geo: THREE.BufferGeometry; mat: THREE.Material; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }
function usePartes(no: string, grupos: string[]) {
  const { nodes } = useGLTF(URL_METRO) as unknown as { nodes: Record<string, THREE.Object3D> }
  const chave = grupos.join()
  return useMemo(() => {
    const mats = matsMetro()
    const out: Parte[] = []
    for (const g of grupos) {
      const o = nodes[`${no}_${g}`] as THREE.Mesh | undefined
      if (!o?.geometry) continue
      o.updateWorldMatrix(true, false)
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), esc = new THREE.Vector3()
      o.matrixWorld.decompose(pos, quat, esc)
      out.push({ k: `${no}_${g}`, geo: o.geometry, mat: mats[MAT_DE[g]], pos, quat, esc })
    }
    if (!out.some((p) => p.k === `${no}_solido`)) throw new Error(`metro.glb sem ${no}`)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, no, chave])
}

function Partes({ partes }: { partes: Parte[] }) {
  return <>{partes.map((p) => <mesh key={p.k} geometry={p.geo} material={p.mat} position={p.pos} quaternion={p.quat} scale={p.esc} />)}</>
}

// um carro por fora (origem no topo da viga, frente pra +Z; 3 × 3,2 × 13 m)
export function CarroModelado({ farol = false }: { farol?: boolean }) {
  const partes = usePartes("carro", farol ? ["solido", "brilho", "farol"] : ["solido", "brilho"])
  return <Partes partes={partes} />
}

// o vagão por dentro (as medidas do Vagao.tsx)
export function VagaoModelado() {
  const partes = usePartes("vagao", ["solido", "luz", "pisca", "neon"])
  return <group name="vagao-modelado"><Partes partes={partes} /></group>
}

useGLTF.preload(URL_METRO)
