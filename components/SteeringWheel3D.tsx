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

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.09, 16, 48),
    new THREE.MeshStandardMaterial({ color: "#161616", roughness: 0.55, metalness: 0.3 })
  )
  // TorusGeometry já nasce de frente pra câmera no eixo Z por padrão — a
  // rotação de 90° que existia aqui fazia o oposto do que o comentário
  // antigo dizia: deitava o aro de perfil (só ficou invisível enquanto o
  // volante era pequeno; no tamanho novo, maior, ficava uma barra fina)
  group.add(rim)

  const spokeCount = 3
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: "#1c1c1c", roughness: 0.6, metalness: 0.25 })
    )
    spoke.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0)
    spoke.rotation.z = a
    group.add(spoke)
  }

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.14, 24),
    new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.4, metalness: 0.5 })
  )
  hub.rotation.x = Math.PI / 2
  group.add(hub)

  // acento neon no topo do aro — referência visual da identidade do jogo
  const accent = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 16, 16),
    new THREE.MeshStandardMaterial({ color: "#ff2d78", emissive: "#ff2d78", emissiveIntensity: 1.4, toneMapped: false })
  )
  accent.position.set(0, 1, 0)
  group.add(accent)

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
