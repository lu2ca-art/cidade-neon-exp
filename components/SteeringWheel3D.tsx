"use client"

// Volante 3D sobreposto ao canvas 2D do carro (app/drive/page.tsx) — gira de
// verdade em resposta à direção real do jogo (mesmo playerXRef -1..1 que já
// existe). Three.js puro e imperativo (sem @react-three/fiber — a versão
// instalada tinha um bug de auto-dimensionamento do canvas nesse setup), no
// mesmo estilo do resto do arquivo (refs + requestAnimationFrame). Enquanto
// não tem um modelo .glb de verdade, desenha um volante procedural (torus +
// raios + cubo central) só pra provar o pipeline funcionando — passe
// `modelUrl` pra trocar pelo modelo real sem mexer em mais nada.

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

const MAX_WHEEL_RAD = Math.PI * 0.75 // quanto o volante gira nos extremos (-1..1)

function buildPlaceholderWheel(): THREE.Group {
  const group = new THREE.Group()

  // aro — perfil mais grosso e redondo (tipo revestimento de couro), mais
  // segmentos pra suavizar (era 16/48, achatado e poligonal de perto)
  // TorusGeometry já nasce de frente pra câmera no eixo Z por padrão.
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.11, 24, 64),
    new THREE.MeshStandardMaterial({ color: "#151318", roughness: 0.5, metalness: 0.25 })
  )
  group.add(rim)

  // friso neon embutido no topo do aro — faixa de LED integrada, não uma
  // esfera boiando por cima (que não lia como parte do volante)
  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.018, 8, 32, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: "#ff2d78", emissive: "#ff2d78", emissiveIntensity: 2, toneMapped: false })
  )
  trim.rotation.z = Math.PI * 0.75
  trim.position.z = 0.09
  group.add(trim)

  // raios cônicos (mais largos perto do cubo, afinando pro aro) — não caixas
  // retas genéricas. Um pra baixo (6h) e dois pra cima (~10h/2h), como um
  // volante de verdade, não 3 raios espaçados igualmente a partir do topo
  const spokeCount = 3
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2 - Math.PI / 2
    const spoke = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.09, 0.72, 12),
      new THREE.MeshStandardMaterial({ color: "#19171d", roughness: 0.55, metalness: 0.3 })
    )
    spoke.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0)
    spoke.rotation.z = a - Math.PI / 2
    group.add(spoke)
  }

  // cubo — base escura + emblema central mais claro, com um leve brilho
  // ciano (era um cilindro único e liso)
  const hubBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: "#221f26", roughness: 0.4, metalness: 0.5 })
  )
  hubBase.rotation.x = Math.PI / 2
  group.add(hubBase)

  const hubBadge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: "#3a3745", roughness: 0.3, metalness: 0.6, emissive: "#00e5ff", emissiveIntensity: 0.3 })
  )
  hubBadge.rotation.x = Math.PI / 2
  hubBadge.position.z = 0.09
  group.add(hubBadge)

  return group
}

export default function SteeringWheel3D({
  steerRef,
  modelUrl,
  className,
}: {
  steerRef: React.RefObject<number>
  modelUrl?: string
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wheelGroupRef = useRef<THREE.Group | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    camera.position.set(0, 0.15, 5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1)
    dirLight.position.set(2, 3, 4)
    scene.add(dirLight)
    const cyanLight = new THREE.PointLight("#00e5ff", 0.6)
    cyanLight.position.set(-1, -0.5, 1.5)
    scene.add(cyanLight)
    const pinkLight = new THREE.PointLight("#ff2d78", 0.5)
    pinkLight.position.set(1, 1.5, 1)
    scene.add(pinkLight)

    const wheelGroup = new THREE.Group()
    wheelGroupRef.current = wheelGroup
    scene.add(wheelGroup)

    if (modelUrl) {
      new GLTFLoader().load(modelUrl, (gltf) => wheelGroup.add(gltf.scene))
    } else {
      wheelGroup.add(buildPlaceholderWheel())
    }

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w <= 0 || h <= 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    let raf = 0
    const frame = () => {
      const steer = steerRef.current ?? 0
      wheelGroup.rotation.z = -steer * MAX_WHEEL_RAD
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.dispose()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose()
          const mat = obj.material
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
          else mat.dispose()
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl])

  return (
    <div className={className} style={{ pointerEvents: "none", width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  )
}
