"use client"

// A Kombi de verdade (escaneada): "Jia Jia Herbal Tea VW Van Kombi Car", de
// Mr. Mushi (Sketchfab), licença CC-BY-NC-SA 4.0 — escolha do LU2CA (03/10),
// ciente de que a licença é não comercial e a lateral tem a marca do chá.
// Otimizada de 12,9 MB → ~1 MB (scratchpad/modelos/kombi.mjs: sem o tampo da
// mesa do escaneamento, simplificada, textura 2k webp, meshopt).
// O material da foto (sem luz) vira material com luz: o neon bate nela.

import { useGLTF } from "@react-three/drei"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

import { CREDITO_KOMBI } from "./creditos"
export { CREDITO_KOMBI }
const URL = "/models/kombi-herbal.glb"
const COMPRIMENTO = 4.5 // m, do para-choque ao para-choque (a Kombi da estrada)

// tinta: a pintura da oficina (multiplica a cor da foto; branco = a de fábrica)
// paineis: o painel solar no teto (no disco, só depois da oficina da Nectar:
// antes disso a Kombi é a velha, a gasolina)
export function KombiHerbal({ tinta = "#ffffff", paineis = true }: { tinta?: string; paineis?: boolean }) {
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
    return { fora, alto: tam.y * s, larg: Math.min(tam.x, tam.z) * s, comp: Math.max(tam.x, tam.z) * s }
  }, [scene])
  useEffect(() => {
    const c = new THREE.Color(tinta)
    kombi.fora.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined; if (m?.isMeshStandardMaterial) { m.color.copy(c); m.emissive.copy(c) } })
  }, [kombi, tinta])
  return (
    <group>
      <primitive object={kombi.fora} />
      {paineis && <PaineisSolares alto={kombi.alto} larg={kombi.larg} comp={kombi.comp} />}
    </group>
  )
}

// (17/10, LU2CA: "colocamos painéis solares na Kombi, ela passa a ser
// elétrica, não precisa mais abastecer") três placas no teto, com as células
// desenhadas e um brilho azul fraco
let TEX_PAINEL: THREE.CanvasTexture | null = null
function texPainel() {
  if (TEX_PAINEL) return TEX_PAINEL
  const c = document.createElement("canvas"); c.width = 128; c.height = 192
  const g = c.getContext("2d")!
  g.fillStyle = "#0b1a3a"; g.fillRect(0, 0, 128, 192)
  for (let y = 0; y < 6; y++) for (let x = 0; x < 4; x++) {
    const gr = g.createLinearGradient(x * 32, y * 32, x * 32 + 32, y * 32 + 32)
    gr.addColorStop(0, "#1d3f8f"); gr.addColorStop(1, "#0e2357")
    g.fillStyle = gr; g.fillRect(x * 32 + 2, y * 32 + 2, 28, 28)
  }
  g.strokeStyle = "#c9d6ff"; g.lineWidth = 2; g.strokeRect(1, 1, 126, 190)
  TEX_PAINEL = new THREE.CanvasTexture(c); TEX_PAINEL.colorSpace = THREE.SRGBColorSpace
  return TEX_PAINEL
}
function PaineisSolares({ alto, larg, comp }: { alto: number; larg: number; comp: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: texPainel(), roughness: 0.25, metalness: 0.6, emissive: new THREE.Color("#2f6bff"), emissiveIntensity: 0.18 }), [])
  const w = larg * 0.78, l = comp * 0.2
  return (
    <group position={[0, alto + 0.05, 0]}>
      {[-1, 0, 1].map((k) => (
        <group key={k} position={[0, 0, k * (l + 0.06)]} rotation-x={-0.04}>
          <mesh material={mat} rotation-x={-Math.PI / 2}><planeGeometry args={[w, l]} /></mesh>
          {/* a moldura e os pezinhos */}
          <mesh position={[0, -0.03, 0]}><boxGeometry args={[w + 0.04, 0.03, l + 0.04]} /><meshStandardMaterial color="#9aa3b5" metalness={0.8} roughness={0.35} /></mesh>
        </group>
      ))}
    </group>
  )
}

useGLTF.preload(URL)
