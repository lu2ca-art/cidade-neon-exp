"use client"

// A Kombi de verdade (escaneada): "Jia Jia Herbal Tea VW Van Kombi Car", de
// Mr. Mushi (Sketchfab), licença CC-BY-NC-SA 4.0 — escolha do LU2CA (03/10),
// ciente de que a licença é não comercial e a lateral tem a marca do chá.
// Otimizada de 12,9 MB → ~1 MB (scratchpad/modelos/kombi.mjs: sem o tampo da
// mesa do escaneamento, simplificada, textura 2k webp, meshopt).
// O material da foto (sem luz) vira material com luz: o neon bate nela.

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import * as THREE from "three"

export const CREDITO_KOMBI = "“Jia Jia Herbal Tea VW Van Kombi Car” por Mr. Mushi (sketchfab.com/mr.mushi), CC-BY-NC-SA 4.0"
const URL = "/models/kombi-herbal.glb"
const COMPRIMENTO = 4.5 // m, do para-choque ao para-choque (a Kombi da estrada)

export function KombiHerbal() {
  const { scene } = useGLTF(URL)
  const kombi = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const velho = m.material as THREE.MeshBasicMaterial
      if (!m.geometry.getAttribute("normal")) m.geometry.computeVertexNormals()
      m.material = new THREE.MeshStandardMaterial({
        map: velho.map ?? null,
        roughness: 0.5,
        metalness: 0.15,
        // um pouco da própria cor acesa: à noite ela não some no escuro
        emissive: new THREE.Color("#ffffff"),
        emissiveMap: velho.map ?? null,
        emissiveIntensity: 0.12,
        side: THREE.DoubleSide,
      })
    })
    // a frente do modelo é o −X; na estrada a frente é o −Z
    const giro = new THREE.Group()
    giro.add(g)
    giro.rotation.y = -Math.PI / 2
    giro.updateMatrixWorld(true)
    const caixa = new THREE.Box3().setFromObject(giro)
    const tam = caixa.getSize(new THREE.Vector3())
    const s = COMPRIMENTO / Math.max(tam.x, tam.z)
    const fora = new THREE.Group()
    fora.add(giro)
    const centro = caixa.getCenter(new THREE.Vector3())
    giro.position.set(-centro.x, -caixa.min.y, -centro.z)
    fora.scale.setScalar(s)
    return fora
  }, [scene])
  return <primitive object={kombi} />
}

useGLTF.preload(URL)
