"use client"
/* eslint-disable react-hooks/immutability -- three.js: câmera, materiais e luzes são do motor, mexidos a cada quadro */

// As peças de toda sala (Interior.tsx): as paredes, o neon, a gente e o que
// dá pra tocar. Tudo leve (primitivas + um corpo modelado no Blender em três
// poses), pensado pra rodar no celular.

import { useGLTF } from "@react-three/drei"
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
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
export function Neon({ pos, comp, cor, vertical = false, rot = 0, luz = 0 }: { pos: V3; comp: number; cor: string; vertical?: boolean; rot?: number; luz?: number }) {
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
export function Npc({ cor, pos, vira = 0, pose = "em-pe", falando = false, dancando = false, pele = "#2c2838", some = false, escala = 1 }: {
  cor: string; pos: V3; vira?: number; pose?: Pose; falando?: boolean; dancando?: boolean; pele?: string; some?: boolean; escala?: number
}) {
  const { scene } = useGLTF(GLB[pose])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: pele, emissive: cor, emissiveIntensity: 0.14, roughness: 0.75, transparent: true }), [cor, pele])
  const corpo = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.material = mat })
    return g
  }, [scene, mat])
  const g = useRef<THREE.Group>(null)
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
    mat.emissiveIntensity += ((falando ? 0.42 : 0.14) - mat.emissiveIntensity) * Math.min(1, dt * 4)
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
  })
  return (
    <group ref={g} position={pos} rotation-y={vira} scale={escala}>
      <primitive object={corpo} />
      {/* a cor da pessoa: uma faixa de luz no peito */}
      <mesh position={[0, pose === "sentada" ? 0.82 : 1.22, 0.12]}>
        <boxGeometry args={[0.3, 0.035, 0.02]} />
        <meshBasicMaterial color={cor} toneMapped={false} transparent opacity={some ? 0 : 1} />
      </mesh>
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
useGLTF.preload(GLB_LEVE)

// ── a multidão: muita gente num desenho só (instâncias do mesmo corpo) ──
// `celulares`: quantos ainda filmam (luz branca em cima da cabeça); os que
// abaixam o celular viram de frente pro meio e passam a balançar
export interface Pessoa { x: number; z: number; vira: number; cor: string }
// a multidão usa uma versão leve do corpo (blender/scripts/gente.py: ~1/4 dos
// triângulos): de longe ninguém vê a diferença, e 48 pessoas pesam como 12
const GLB_LEVE = "/models/pessoa-leve.glb"
export function Multidao({ gente, celulares = 0, pele = "#2a2636" }: { gente: Pessoa[]; celulares?: number; pele?: string }) {
  const { scene } = useGLTF(GLB_LEVE)
  const geo = useMemo(() => {
    let g: THREE.BufferGeometry | null = null
    scene.traverse((o) => { const m = o as THREE.Mesh; if (!g && m.isMesh) g = m.geometry })
    return g as unknown as THREE.BufferGeometry
  }, [scene])
  const corpos = useRef<THREE.InstancedMesh>(null)
  const fones = useRef<THREE.InstancedMesh>(null)
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const cor = useMemo(() => new THREE.Color(), [])
  const n = gente.length
  useEffect(() => {
    if (!corpos.current) return
    gente.forEach((p, i) => corpos.current!.setColorAt(i, cor.set(p.cor).lerp(new THREE.Color(pele), 0.55)))
    if (corpos.current.instanceColor) corpos.current.instanceColor.needsUpdate = true
  }, [gente, cor, pele])
  useFrame((s) => {
    const t = s.clock.elapsedTime
    gente.forEach((p, i) => {
      const filma = i < celulares
      const solto = !filma // quem abaixou balança
      const bate = solto ? Math.abs(Math.sin(t * 5.6 + i)) * 0.08 : Math.sin(t * 1.3 + i) * 0.01
      tmp.position.set(p.x, bate, p.z)
      tmp.rotation.set(0, p.vira + (solto ? Math.sin(t * 2.8 + i) * 0.2 : 0), solto ? Math.sin(t * 2.8 + i) * 0.06 : 0)
      tmp.scale.setScalar(1)
      tmp.updateMatrix()
      corpos.current?.setMatrixAt(i, tmp.matrix)
      // o celular: na frente do rosto (filmando) ou guardado (some)
      tmp.position.set(p.x + Math.sin(p.vira) * 0.3, filma ? 1.95 + Math.sin(t * 2 + i) * 0.02 : -5, p.z + Math.cos(p.vira) * 0.3)
      tmp.rotation.set(0, p.vira, 0)
      tmp.updateMatrix()
      fones.current?.setMatrixAt(i, tmp.matrix)
    })
    if (corpos.current) corpos.current.instanceMatrix.needsUpdate = true
    if (fones.current) fones.current.instanceMatrix.needsUpdate = true
  })
  return (
    <group>
      <instancedMesh ref={corpos} args={[geo, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.8} emissive="#1a1424" emissiveIntensity={0.4} />
      </instancedMesh>
      <instancedMesh ref={fones} args={[undefined, undefined, n]} frustumCulled={false}>
        <boxGeometry args={[0.08, 0.15, 0.01]} />
        <meshBasicMaterial color="#e6f0ff" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ── o ritmo (balada, vagão): um compasso de ~107 bpm; tocar perto da batida
// é acerto. `meta` acertos → acabou ──
export const BATIDA = 560
export function useRitmo(ativo: boolean, meta: number, onFim: () => void) {
  const t0 = useRef(0)
  const [acertos, setAcertos] = useState(0)
  const [ultimo, setUltimo] = useState<{ ok: boolean; n: number } | null>(null)
  useEffect(() => { if (ativo) t0.current = performance.now() }, [ativo])
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim })
  useEffect(() => {
    if (acertos < meta) return
    const t = setTimeout(() => fim.current(), 900)
    return () => clearTimeout(t)
  }, [acertos, meta])
  const tocar = () => {
    if (!ativo || acertos >= meta) return
    const fase = ((performance.now() - t0.current) % BATIDA) / BATIDA
    const ok = fase > 0.78 || fase < 0.14
    setUltimo((u) => ({ ok, n: (u?.n ?? 0) + 1 }))
    if (ok) setAcertos((a) => a + 1)
    return ok
  }
  // a fase da batida agora (0 → 1), pra desenhar o anel fechando
  const fase = () => ((performance.now() - t0.current) % BATIDA) / BATIDA
  return { acertos, ultimo, tocar, fase }
}

// um anel no chão que fecha a cada batida (toca quando ele encosta)
export function AnelRitmo({ pos, cor, fase, raio = 1.4, ativo = true }: { pos: V3; cor: string; fase: () => number; raio?: number; ativo?: boolean }) {
  const anel = useRef<THREE.Mesh>(null)
  const alvo = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (!anel.current) return
    anel.current.visible = ativo
    if (alvo.current) alvo.current.visible = ativo
    const f = fase()
    const k = 1 + (1 - f) * 1.6
    anel.current.scale.setScalar(k)
    const m = anel.current.material as THREE.MeshBasicMaterial
    m.opacity = 0.25 + f * 0.7
  })
  return (
    <group position={pos} rotation-x={-Math.PI / 2}>
      <mesh ref={alvo}>
        <ringGeometry args={[raio * 0.95, raio, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <mesh ref={anel}>
        <ringGeometry args={[raio * 0.9, raio, 48]} />
        <meshBasicMaterial color={cor} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

// a chuva (dentro de um volume): riscos caindo
export function Chuva({ n = 600, larg = 20, alto = 12, fundo = 20, centro = [0, 0, 0] as V3, cor = "#9fc8ff" }: { n?: number; larg?: number; alto?: number; fundo?: number; centro?: V3; cor?: string }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const gotas = useMemo(() => {
    let seed = 5
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: n }, () => ({ x: (r() - 0.5) * larg, y: r() * alto, z: (r() - 0.5) * fundo, v: 9 + r() * 4 }))
  }, [n, larg, alto, fundo])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  useFrame((_, dt) => {
    if (!ref.current) return
    gotas.forEach((g, i) => {
      g.y -= g.v * Math.min(dt, 0.05)
      if (g.y < 0) g.y += alto
      tmp.position.set(centro[0] + g.x, centro[1] + g.y, centro[2] + g.z)
      tmp.updateMatrix()
      ref.current!.setMatrixAt(i, tmp.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} frustumCulled={false}>
      <boxGeometry args={[0.012, 0.35, 0.012]} />
      <meshBasicMaterial color={cor} transparent opacity={0.35} depthWrite={false} />
    </instancedMesh>
  )
}

// a cidade lá fora (pela janela, do terraço): prédios com o topo aceso.
// Desenhada de uma vez só (duas instâncias): 70 prédios custam 2 chamadas
export function Cidade({ raio = 60, n = 70, alt = 0, cor = "#ff3fb0", brilho = 0.06 }: { raio?: number; n?: number; alt?: number; cor?: string; brilho?: number }) {
  const predios = useMemo(() => {
    let seed = 9
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const cores = [cor, "#2fe8ff", "#ffc857", "#b38cff", "#5dffa0"]
    return Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + r() * 0.05
      const d = raio * (0.8 + r() * 0.5)
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, w: 4 + r() * 6, h: 10 + r() * 40, c: cores[Math.floor(r() * cores.length)] }
    })
  }, [raio, n, cor])
  const corpos = useRef<THREE.InstancedMesh>(null)
  const topos = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const o = new THREE.Object3D()
    const c = new THREE.Color()
    const base = new THREE.Color("#0d0c16")
    predios.forEach((p, i) => {
      o.position.set(p.x, alt + p.h / 2, p.z); o.scale.set(p.w, p.h, p.w); o.updateMatrix()
      corpos.current?.setMatrixAt(i, o.matrix)
      corpos.current?.setColorAt(i, c.copy(base).lerp(new THREE.Color(p.c), brilho))
      o.position.set(p.x, alt + p.h + 0.2, p.z); o.scale.set(p.w * 0.9, 0.3, p.w * 0.9); o.updateMatrix()
      topos.current?.setMatrixAt(i, o.matrix)
      topos.current?.setColorAt(i, c.set(p.c))
    })
    for (const m of [corpos.current, topos.current]) {
      if (!m) continue
      m.instanceMatrix.needsUpdate = true
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [predios, alt, brilho])
  return (
    <group>
      <instancedMesh ref={corpos} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={topos} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

// ── explorar: coisas da sala que contam algo quando você toca ──
// cada coisa manda as falas dela pra legenda; vistas `precisa` coisas, o
// gesto acaba (dá pra continuar olhando as outras depois, só que sem pressa)
export interface Coisa { id: string; pos: V3; raio?: number; falas: { de?: string; texto: string; tipo?: "fala" | "acao" }[] }
export function useExplorar(ativo: boolean, coisas: Coisa[], precisa: number, sinal: (s: { t: "fala"; de?: string; texto: string; tipo?: "fala" | "acao" } | { t: "fim-gesto" }) => void) {
  const [vistas, setVistas] = useState<string[]>([])
  const ver = (id: string) => {
    if (!ativo || vistas.includes(id)) return
    const c = coisas.find((x) => x.id === id)
    if (!c) return
    for (const f of c.falas) sinal({ t: "fala", ...f })
    const novas = [...vistas, id]
    setVistas(novas)
    if (novas.length >= precisa) sinal({ t: "fim-gesto" })
  }
  // atalho de teste: __gesto() olha a próxima coisa
  const verRef = useRef(ver)
  useEffect(() => { verRef.current = ver })
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    const w = window as unknown as Record<string, unknown>
    w.__gesto = () => { const c = coisas.find((x) => !vistasRef.current.includes(x.id)); if (c) verRef.current(c.id) }
    return () => { delete w.__gesto }
  }, [coisas])
  const vistasRef = useRef(vistas)
  useEffect(() => { vistasRef.current = vistas })
  return { vistas, ver }
}
