"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Grid, useGLTF } from "@react-three/drei"
import { Suspense, useEffect, useState } from "react"
import * as THREE from "three"

// Aplica material padrão + centraliza + escala pra caber em ~4 unidades
function VanModel({
  wireframe,
  onMeasure,
}: {
  wireframe: boolean
  onMeasure: (info: string) => void
}) {
  const { scene } = useGLTF("/models/van.glb")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // 1) Material padrão nas meshes sem material
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const needsMaterial =
        !mesh.material ||
        (Array.isArray(mesh.material) && mesh.material.length === 0)
      if (needsMaterial) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#cccccc",
          roughness: 0.55,
          metalness: 0.2,
        })
      }
      const mat = mesh.material as THREE.MeshStandardMaterial
      if ("wireframe" in mat) mat.wireframe = wireframe
    })

    // 2) Centraliza + escala uma vez
    if (!ready) {
      const box = new THREE.Box3().setFromObject(scene)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      const maxDim = Math.max(size.x, size.y, size.z)
      const targetSize = 4 // caber em 4 unidades no viewport
      const scale = maxDim > 0 ? targetSize / maxDim : 1

      // Aplica escala primeiro, depois recentraliza
      scene.scale.setScalar(scale)
      scene.position.set(
        -center.x * scale,
        -center.y * scale + (size.y * scale) / 2, // apoia no chão (Y=0)
        -center.z * scale
      )

      onMeasure(
        `bruto L×A×P: ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)} · escala aplicada: ${scale.toFixed(3)}×`
      )
      setReady(true)
    }
  }, [scene, wireframe, ready, onMeasure])

  return <primitive object={scene} />
}

function Fallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#ff00ff" wireframe />
    </mesh>
  )
}

export default function VanPreviewPage() {
  const [wireframe, setWireframe] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [modelInfo, setModelInfo] = useState<string>("")

  // Detecta quando GLB terminou de carregar (drei useGLTF é síncrono
  // via Suspense, então esse listener no primitive não roda — usamos
  // fetch head pra ter uma noção de progresso ANTES do Canvas)
  useEffect(() => {
    fetch("/models/van.glb", { method: "HEAD" })
      .then((r) => setLoaded(r.ok))
      .catch(() => setLoaded(false))
  }, [])

  return (
    <div className="relative h-screen w-screen bg-[#0a0518]">
      {/* HUD topo */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-md text-white">
        <div className="rounded border border-white/10 bg-black/80 p-3 text-xs backdrop-blur-md">
          <h1 className="mb-1 text-sm font-bold">Van Preview</h1>
          <div className="font-mono text-[10px] text-neutral-400">
            418 meshes · 29MB · GLB Draco {loaded && "· ✓ acessível"}
          </div>
          {modelInfo && (
            <div className="mt-1 font-mono text-[10px] text-[#ff00ff]">{modelInfo}</div>
          )}
          <div className="mt-2 text-[10px] text-neutral-500">
            arrastar = girar · scroll = zoom · direito = pan
          </div>
        </div>
      </div>

      {/* Toggle wireframe */}
      <div className="pointer-events-auto absolute right-4 top-4 z-10">
        <label className="flex cursor-pointer items-center gap-2 rounded border border-white/10 bg-black/80 px-3 py-2 text-xs text-white backdrop-blur-md">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => setWireframe(e.target.checked)}
          />
          wireframe
        </label>
      </div>

      {/* Canvas 3D — câmera proporcional ao targetSize=4 do modelo */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [6, 5, 6], fov: 45 }}>
          <Suspense fallback={<Fallback />}>
            <color attach="background" args={["#0a0518"]} />
            <ambientLight intensity={0.7} />
            <directionalLight position={[10, 15, 10]} intensity={0.9} />
            <directionalLight position={[-5, 8, -5]} intensity={0.4} color="#ff00ff" />

            <Grid
              args={[30, 30]}
              cellSize={0.5}
              cellColor="#4c1a8a"
              sectionSize={5}
              sectionColor="#ff00ff"
              fadeDistance={40}
              infiniteGrid
            />
            <axesHelper args={[3]} />

            <VanModel wireframe={wireframe} onMeasure={setModelInfo} />

            <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

useGLTF.preload("/models/van.glb")
