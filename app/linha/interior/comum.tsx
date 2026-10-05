"use client"
/* eslint-disable react-hooks/immutability -- three.js: câmera, materiais e luzes são do motor, mexidos a cada quadro */

// As peças de toda sala (Interior.tsx): as paredes, o neon, a gente e o que
// dá pra tocar. Tudo leve (primitivas + um corpo modelado no Blender em três
// poses), pensado pra rodar no celular.

import { useGLTF } from "@react-three/drei"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"

export type V3 = [number, number, number]

// ── a sala: chão, teto e paredes (por dentro) ──
export function Sala({ larg, fundo, alto, parede = "#1a1620", chao = "#120f16", teto = "#0b0a10", sem = [] }: {
  larg: number; fundo: number; alto: number; parede?: string; chao?: string; teto?: string
  // paredes que não existem (a sala abre pra rua, pra pista…)
  sem?: ("frente" | "fundo" | "esq" | "dir" | "teto")[]
}) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[larg, fundo]} />
        <meshStandardMaterial color={chao} roughness={0.35} metalness={0.25} />
      </mesh>
      {!sem.includes("teto") && (
        <mesh rotation-x={Math.PI / 2} position={[0, alto, 0]}>
          <planeGeometry args={[larg, fundo]} />
          <meshStandardMaterial color={teto} roughness={1} />
        </mesh>
      )}
      {!sem.includes("fundo") && (
        <mesh position={[0, alto / 2, -fundo / 2]}>
          <planeGeometry args={[larg, alto]} />
          <meshStandardMaterial color={parede} roughness={0.9} />
        </mesh>
      )}
      {!sem.includes("frente") && (
        <mesh position={[0, alto / 2, fundo / 2]} rotation-y={Math.PI}>
          <planeGeometry args={[larg, alto]} />
          <meshStandardMaterial color={parede} roughness={0.9} />
        </mesh>
      )}
      {!sem.includes("esq") && (
        <mesh position={[-larg / 2, alto / 2, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[fundo, alto]} />
          <meshStandardMaterial color={parede} roughness={0.9} />
        </mesh>
      )}
      {!sem.includes("dir") && (
        <mesh position={[larg / 2, alto / 2, 0]} rotation-y={-Math.PI / 2}>
          <planeGeometry args={[fundo, alto]} />
          <meshStandardMaterial color={parede} roughness={0.9} />
        </mesh>
      )}
    </group>
  )
}

// uma caixa (móvel, balcão, banco…) com material simples
export function Caixa({ pos, tam, cor, rot = 0, brilho, rough = 0.8, metal = 0.1 }: { pos: V3; tam: V3; cor: string; rot?: number; brilho?: number; rough?: number; metal?: number }) {
  return (
    <mesh position={pos} rotation-y={rot}>
      <boxGeometry args={tam} />
      <meshStandardMaterial color={cor} roughness={rough} metalness={metal} emissive={brilho ? cor : "#000"} emissiveIntensity={brilho ?? 0} />
    </mesh>
  )
}

// um tubo de neon (horizontal por padrão) com a luz que ele joga
export function Neon({ pos, comp, cor, vertical = false, rot = 0, luz = 8 }: { pos: V3; comp: number; cor: string; vertical?: boolean; rot?: number; luz?: number }) {
  return (
    <group position={pos} rotation-y={rot}>
      <mesh rotation-z={vertical ? 0 : Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, comp, 8]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      {luz > 0 && <pointLight color={cor} intensity={luz} distance={6} decay={2} />}
    </group>
  )
}

// ── a gente ──
export type Pose = "em-pe" | "sentada" | "danca"
const GLB: Record<Pose, string> = { "em-pe": "/models/pessoa.glb", sentada: "/models/pessoa-sentada.glb", danca: "/models/pessoa-danca.glb" }

// quem está na sala. Quando fala: acende por cima, vira devagar pra câmera
// e balança um pouco mais. `some` = sumiu (o bar esvaziando)
export function Npc({ cor, pos, vira = 0, pose = "em-pe", falando = false, dancando = false, pele = "#14152a", some = false, escala = 1 }: {
  cor: string; pos: V3; vira?: number; pose?: Pose; falando?: boolean; dancando?: boolean; pele?: string; some?: boolean; escala?: number
}) {
  const { scene } = useGLTF(GLB[pose])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: pele, emissive: cor, emissiveIntensity: 0.2, roughness: 0.7, transparent: true }), [cor, pele])
  const corpo = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = mat })
    return g
  }, [scene, mat])
  const g = useRef<THREE.Group>(null)
  const luz = useRef<THREE.PointLight>(null)
  const camera = useThree((s) => s.camera)
  const fase = pos[0] * 3.1 + pos[2] * 1.7
  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((s, dt) => {
    if (!g.current) return
    const t = s.clock.elapsedTime + fase
    // some devagar (opacidade) e volta
    const alvoOp = some ? 0 : 1
    mat.opacity += (alvoOp - mat.opacity) * Math.min(1, dt * 2.5)
    g.current.visible = mat.opacity > 0.02
    mat.emissiveIntensity += ((falando ? 0.55 : 0.2) - mat.emissiveIntensity) * Math.min(1, dt * 4)
    if (dancando) {
      g.current.position.y = pos[1] + Math.abs(Math.sin(t * 5.6)) * 0.12
      g.current.rotation.z = Math.sin(t * 2.8) * 0.12
    } else {
      g.current.position.y = pos[1]
      g.current.scale.y = escala * (1 + Math.sin(t * 1.4) * 0.006)
      g.current.rotation.z = Math.sin(t * 0.35) * (falando ? 0.04 : 0.02)
    }
    // quem fala vira pra câmera (devagar); quem não fala volta pro lugar
    let alvoY = vira
    if (falando) {
      tmp.set(camera.position.x - pos[0], 0, camera.position.z - pos[2])
      alvoY = Math.atan2(tmp.x, tmp.z)
    }
    let dy = alvoY - g.current.rotation.y
    dy = Math.atan2(Math.sin(dy), Math.cos(dy))
    g.current.rotation.y += dy * Math.min(1, dt * 2.2)
    if (luz.current) luz.current.intensity += ((falando ? 5 : 0) - luz.current.intensity) * Math.min(1, dt * 4)
  })
  return (
    <group ref={g} position={pos} rotation-y={vira} scale={escala}>
      <primitive object={corpo} />
      {/* a cor da pessoa: uma faixa de luz no peito */}
      <mesh position={[0, pose === "sentada" ? 0.82 : 1.22, 0.12]}>
        <boxGeometry args={[0.3, 0.035, 0.02]} />
        <meshBasicMaterial color={cor} toneMapped={false} transparent opacity={some ? 0 : 1} />
      </mesh>
      <pointLight ref={luz} position={[0, 2.4, 0.6]} color={cor} intensity={0} distance={4} decay={2} />
    </group>
  )
}

// ── o que dá pra tocar ──
// uma área invisível que responde ao toque, com um anel pulsando quando vale
export function Toque({ pos, raio = 0.35, cor = "#ffffff", ativo = true, onToque, children }: {
  pos: V3; raio?: number; cor?: string; ativo?: boolean; onToque: () => void; children?: React.ReactNode
}) {
  const anel = useRef<THREE.Mesh>(null)
  const camera = useThree((s) => s.camera)
  useFrame((s) => {
    if (!anel.current) return
    anel.current.visible = ativo
    const k = 1 + Math.sin(s.clock.elapsedTime * 4) * 0.12
    anel.current.scale.setScalar(k)
    anel.current.quaternion.copy(camera.quaternion)
  })
  const tocar = (e: ThreeEvent<MouseEvent>) => {
    if (!ativo) return
    e.stopPropagation()
    onToque()
  }
  return (
    <group position={pos}>
      {children}
      <mesh onClick={tocar} visible={false}>
        <sphereGeometry args={[raio * 1.4, 10, 8]} />
        <meshBasicMaterial />
      </mesh>
      <mesh ref={anel}>
        <ringGeometry args={[raio * 0.92, raio, 32]} />
        <meshBasicMaterial color={cor} transparent opacity={0.85} toneMapped={false} depthTest={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload(GLB["em-pe"])
useGLTF.preload(GLB.sentada)
useGLTF.preload(GLB.danca)
