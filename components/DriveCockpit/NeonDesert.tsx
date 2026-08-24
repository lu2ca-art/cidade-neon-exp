"use client"

// Deserto egípcio neon infinito — envolve a cidade. Pirâmides, obeliscos,
// esfinges e dunas em wireframe neon. Renderizado como InstancedMesh
// (baixo custo de draw calls) e sem colisão (é cenário, não obstáculo).

import { useFrame } from "@react-three/fiber"
import { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"

const CITY_RADIUS = 260   // raio da cidade — deserto começa daqui
const DESERT_RADIUS = 1500 // limite externo do deserto visível
const N_PYRAMIDS = 120
const N_OBELISKS = 40
const N_SPHINX = 6
const SKY_RADIUS = 1200

function makeRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// Distribui N pontos num anel [rMin, rMax] com jitter uniforme por ângulo.
function ringPoints(n: number, rMin: number, rMax: number, rand: () => number) {
  const out: { x: number; z: number; angle: number }[] = []
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.6
    const r = rMin + rand() * (rMax - rMin)
    out.push({ x: Math.cos(angle) * r, z: Math.sin(angle) * r, angle })
  }
  return out
}

export function NeonDesert({ seed = 7 }: { seed?: number }) {
  const rand = useMemo(() => makeRand(seed), [seed])

  // Distribuições espaciais (memo — não muda em runtime)
  const pyramids = useMemo(() => {
    const pts = ringPoints(N_PYRAMIDS, CITY_RADIUS + 40, DESERT_RADIUS * 0.85, rand)
    return pts.map((p) => ({
      ...p,
      size: 20 + rand() * 60,
      color: ["#ff00ff", "#00ffff", "#ffcc00", "#ff2d78"][Math.floor(rand() * 4)],
      rotY: rand() * Math.PI * 2,
    }))
  }, [rand])

  const obelisks = useMemo(() => {
    const pts = ringPoints(N_OBELISKS, CITY_RADIUS + 60, DESERT_RADIUS * 0.7, rand)
    return pts.map((p) => ({
      ...p,
      height: 30 + rand() * 40,
      color: ["#ff00ff", "#ffcc00", "#00ffff"][Math.floor(rand() * 3)],
    }))
  }, [rand])

  const sphinxes = useMemo(() => {
    const pts = ringPoints(N_SPHINX, CITY_RADIUS + 100, DESERT_RADIUS * 0.6, rand)
    return pts.map((p) => ({ ...p, rotY: p.angle + Math.PI }))
  }, [rand])

  return (
    <group>
      {/* Skydome — dome grande com gradient synthwave (segue a câmera) */}
      <SkyDome />

      {/* Chão areia — plano gigante com cor roxa profunda (segue a câmera) */}
      <SandFloor />

      {/* Grid neon no chão (perspectiva synthwave) — quadriculado wireframe */}
      <SandGrid />

      {/* Horizonte sol laranja neon — segue a câmera */}
      <NeonSun />

      {/* Pirâmides InstancedMesh — cones 4 lados */}
      <PyramidField pyramids={pyramids} />

      {/* Obeliscos InstancedMesh */}
      <ObeliskField obelisks={obelisks} />

      {/* Esfinges (raros — 6 apenas) */}
      {sphinxes.map((s, i) => (
        <Sphinx key={i} x={s.x} z={s.z} rotY={s.rotY} />
      ))}

      {/* Estrelas neon no céu */}
      <NeonStars />
    </group>
  )
}

// Faz o group seguir a câmera no plano XZ (efeito skybox infinito)
function useFollowCamera(ref: React.MutableRefObject<THREE.Object3D | null>) {
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.x = camera.position.x
    ref.current.position.z = camera.position.z
  })
}

// ─── Skydome (dome gigante gradient) ────────────────────────────────────────
function SkyDome() {
  const ref = useRef<THREE.Mesh>(null)
  useFollowCamera(ref)
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color("#0a0521") },
        midColor: { value: new THREE.Color("#4a0e6e") },
        bottomColor: { value: new THREE.Color("#ff2d78") },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        varying vec3 vWorldPos;
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col;
          if (h > 0.15) col = mix(midColor, topColor, smoothstep(0.15, 0.8, h));
          else col = mix(bottomColor, midColor, smoothstep(-0.05, 0.15, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  }, [])
  return (
    <mesh ref={ref} material={material}>
      <sphereGeometry args={[SKY_RADIUS, 32, 16]} />
    </mesh>
  )
}

// ─── Chão de areia (segue a câmera) ─────────────────────────────────────────
function SandFloor() {
  const ref = useRef<THREE.Mesh>(null)
  useFollowCamera(ref)
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[DESERT_RADIUS * 2.5, DESERT_RADIUS * 2.5, 1, 1]} />
      <meshBasicMaterial color="#1a0533" />
    </mesh>
  )
}

// ─── Chão grid synthwave (segue câmera) ─────────────────────────────────────
function SandGrid() {
  const ref = useRef<THREE.GridHelper>(null)
  useFrame(({ camera }) => {
    if (!ref.current) return
    ref.current.position.x = camera.position.x
    ref.current.position.z = camera.position.z
  })
  return (
    <gridHelper
      ref={ref}
      args={[DESERT_RADIUS * 2, 80, "#ff00ff", "#4a0e6e"]}
      position={[0, -0.3, 0]}
    />
  )
}

// ─── Sol neon no horizonte (fica sempre a Norte relativo à câmera) ─────────
function NeonSun() {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ camera }) => {
    if (!ref.current) return
    // Posição fixa a norte (+Z world), altura Y=180, distância 900 da câmera
    ref.current.position.x = camera.position.x
    ref.current.position.z = camera.position.z - 900
    ref.current.position.y = 0
  })
  return (
    <group ref={ref}>
      {/* Disco laranja gigante */}
      <mesh position={[0, 180, 0]}>
        <circleGeometry args={[300, 48]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      {/* Halo magenta atrás */}
      <mesh position={[0, 180, -5]}>
        <circleGeometry args={[420, 48]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} transparent opacity={0.5} />
      </mesh>
      {/* Faixas horizontais atravessando o sol (efeito synthwave) */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh key={i} position={[0, 60 + i * 30, 3]}>
          <planeGeometry args={[900, 10]} />
          <meshBasicMaterial color="#0a0521" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Pirâmides via InstancedMesh ───────────────────────────────────────────
function PyramidField({
  pyramids,
}: {
  pyramids: { x: number; z: number; size: number; color: string; rotY: number }[]
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const edgeRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!bodyRef.current || !edgeRef.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    const axisY = new THREE.Vector3(0, 1, 0)

    for (let i = 0; i < pyramids.length; i++) {
      const py = pyramids[i]
      p.set(py.x, py.size / 2, py.z)
      q.setFromAxisAngle(axisY, py.rotY)
      s.set(py.size, py.size, py.size)
      m.compose(p, q, s)
      bodyRef.current.setMatrixAt(i, m)
      edgeRef.current.setMatrixAt(i, m)
      c.set(py.color)
      bodyRef.current.setColorAt(i, c)
      edgeRef.current.setColorAt(i, c)
    }
    bodyRef.current.instanceMatrix.needsUpdate = true
    edgeRef.current.instanceMatrix.needsUpdate = true
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (edgeRef.current.instanceColor) edgeRef.current.instanceColor.needsUpdate = true
  }, [pyramids])

  return (
    <>
      {/* Corpo preenchido (roxo profundo semi-opaco) */}
      <instancedMesh ref={bodyRef} args={[undefined, undefined, pyramids.length]}>
        <coneGeometry args={[0.7, 1, 4]} />
        <meshBasicMaterial color="#1a0533" transparent opacity={0.85} />
      </instancedMesh>
      {/* Arestas neon (wireframe) */}
      <instancedMesh ref={edgeRef} args={[undefined, undefined, pyramids.length]}>
        <coneGeometry args={[0.7, 1, 4]} />
        <meshBasicMaterial wireframe toneMapped={false} />
      </instancedMesh>
    </>
  )
}

// ─── Obeliscos via InstancedMesh ────────────────────────────────────────────
function ObeliskField({
  obelisks,
}: {
  obelisks: { x: number; z: number; height: number; color: string }[]
}) {
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const capRef = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    if (!bodyRef.current || !capRef.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()

    for (let i = 0; i < obelisks.length; i++) {
      const o = obelisks[i]
      const width = 3 + o.height * 0.04
      // corpo
      p.set(o.x, o.height / 2, o.z)
      q.identity()
      s.set(width, o.height, width)
      m.compose(p, q, s)
      bodyRef.current.setMatrixAt(i, m)
      c.set(o.color)
      bodyRef.current.setColorAt(i, c)
      // capstone piramidal em cima
      p.set(o.x, o.height + width * 0.5, o.z)
      s.set(width * 1.3, width, width * 1.3)
      m.compose(p, q, s)
      capRef.current.setMatrixAt(i, m)
      capRef.current.setColorAt(i, c)
    }
    bodyRef.current.instanceMatrix.needsUpdate = true
    capRef.current.instanceMatrix.needsUpdate = true
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true
    if (capRef.current.instanceColor) capRef.current.instanceColor.needsUpdate = true
  }, [obelisks])

  return (
    <>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, obelisks.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} wireframe />
      </instancedMesh>
      <instancedMesh ref={capRef} args={[undefined, undefined, obelisks.length]}>
        <coneGeometry args={[0.7, 1, 4]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  )
}

// ─── Esfinge low-poly (bloco base + cabeça) ─────────────────────────────────
function Sphinx({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      {/* corpo (bloco alongado) */}
      <mesh position={[0, 6, 0]}>
        <boxGeometry args={[10, 12, 24]} />
        <meshBasicMaterial color="#00ffff" wireframe toneMapped={false} />
      </mesh>
      {/* cabeça (cubo em cima na dianteira) */}
      <mesh position={[0, 18, 8]}>
        <boxGeometry args={[7, 8, 7]} />
        <meshBasicMaterial color="#ffcc00" wireframe toneMapped={false} />
      </mesh>
      {/* nariz de neon */}
      <mesh position={[0, 17, 12]}>
        <boxGeometry args={[1.5, 1.5, 2]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Estrelas neon dispersas no céu ─────────────────────────────────────────
function NeonStars() {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const N = 400
    const positions = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    const palette = [
      [1, 0, 1],   // magenta
      [0, 1, 1],   // ciano
      [1, 0.8, 0], // amarelo
      [1, 0.4, 0.2], // laranja
    ]
    for (let i = 0; i < N; i++) {
      // Distribui em uma cúpula (r ~ 2000, y > 30)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(1 - Math.random() * 0.7) // hemisfério superior
      const r = 1800 + Math.random() * 400
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) + 60
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const c = palette[Math.floor(Math.random() * palette.length)]
      colors[i * 3 + 0] = c[0]
      colors[i * 3 + 1] = c[1]
      colors[i * 3 + 2] = c[2]
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return g
  }, [])
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial vertexColors size={5} sizeAttenuation toneMapped={false} />
    </points>
  )
}
