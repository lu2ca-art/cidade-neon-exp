"use client"

// O SUBÚRBIO XENOM, embaixo da cidade neon: dentro do anel da estrada
// elevada, no chão (o resto da cidade é água). O miolo é o modelo "CITY
// SUBURBS" de isabm (Sketchfab, CC-BY 4.0), otimizado de 157 MB pra ~3,5 MB
// (scratchpad/modelos/otimizar.mjs) e, na noite de 05/11, pra 1,3 MB e 36 mil
// triângulos (blender/scripts/suburbio_*.py: os 101 prédios são 13 modelos,
// cada um virou uma caixa leve com a fachada assada; docs/blender/noite-0511.md).
// Crédito no jogo.

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

import { CREDITO_SUBURBIO } from "./creditos"
import { Estatico, mesclarPorMaterial } from "./estatico"
export { CREDITO_SUBURBIO }
const URL = "/models/suburbio.glb"

// centro do bairro (o mesmo do anel da cidade) e quanto o modelo cresce
export function Suburbio({ cx, cz, raioChao }: { cx: number; cz: number; raioChao: number }) {
  const { scene } = useGLTF(URL)
  const modelo = useMemo(() => {
    const g = scene.clone(true)
    const semVidroCaro = new Map<THREE.Material, THREE.Material>()
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      // sem normal no arquivo (tirada pra caber no celular): recalcula
      if (!m.geometry.getAttribute("normal")) m.geometry.computeVertexNormals()
      m.frustumCulled = true
      m.material = vidroBarato(m.material as THREE.Material, semVidroCaro)
    })
    // (perf 003) 154 malhas com 3 materiais: uma por material e célula (6×6: com 3×3 o corte por frustum piorava e os triângulos subiam ~75 mil)
    mesclarPorMaterial(g, 6)
    return g
  }, [scene])
  return (
    <group>
      {/* o chão do bairro (fora dele, a cidade é água) */}
      <mesh rotation-x={-Math.PI / 2} position={[cx, -11.85, cz]}>
        <circleGeometry args={[raioChao, 64]} />
        <meshStandardMaterial color="#0c0d18" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* o miolo: centrado (o modelo vem com o centro em x 22, z 6). Congelado: não se mexe (perf 003) */}
      <Estatico><primitive object={modelo} position={[cx - 22 * 1.4, -11.8, cz - 6 * 1.4]} scale={1.4} /></Estatico>
    </group>
  )
}

// (perf 006) o vidro "cristal" do modelo (janelas) vinha com transmission=1:
// com isso o three renderiza a cena opaca INTEIRA de novo num alvo à parte em
// todo quadro (tela cheia, meio-float, MSAA 4x) e gera a cadeia de mipmaps
// dele, 2x por quadro (DoubleSide = frente e costas). Com rugosidade 0,75 e
// opacidade 0,25 o que a transmissão mostrava era o fundo borrado, quase o
// mesmo fundo que já está atrás. Troca: sem transmissão, cor preta e mistura
// aditiva = fundo + 0,25 x o brilho especular (o que sobrava do vidro).
function vidroBarato(mat: THREE.Material, cache: Map<THREE.Material, THREE.Material>): THREE.Material {
  const f = mat as THREE.MeshPhysicalMaterial
  if (!f.isMeshPhysicalMaterial || !(f.transmission > 0)) return mat
  let v = cache.get(mat)
  if (!v) {
    const n = f.clone()
    n.transmission = 0
    n.color.set(0x000000)
    n.blending = THREE.AdditiveBlending
    n.transparent = true
    n.depthWrite = false
    v = n
    cache.set(mat, v)
  }
  return v
}

useGLTF.preload(URL)
