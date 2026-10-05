"use client"
/* eslint-disable react-hooks/immutability -- three.js: câmera, materiais e luzes são do motor, mexidos a cada quadro */

// POR DENTRO dos lugares (04/10, pedido do LU2CA): a cena não acontece mais
// na fachada. Passou na frente, a câmera corta pra DENTRO: a sala em 3D com
// quem está lá, a câmera trocando de plano conforme quem fala, e os gestos
// feitos com as coisas da sala (os copos no balcão, a pista da balada…).
//
// A legenda e as escolhas continuam por cima (cena.tsx); as duas conversam
// pelo bus.ts. Cada sala é um componente em salas/*.tsx.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef, type ComponentType } from "react"
import * as THREE from "three"
import { Cinema } from "../estrada/Cinema"
import { Seguro } from "../estrada/Seguro"
import type { EstacaoId } from "../data"
import type { LugarId } from "../lugares"
import { useEstadoCena, type EstadoCena } from "./bus"
import type { V3 } from "./comum"
import { SalaBalada } from "./salas/Balada"
import { SalaBar } from "./salas/Bar"
import { SalaVagao } from "./salas/Vagao"

export interface SalaProps { estado: EstadoCena; objetos: EstacaoId[] }

// toque livre na tela (fora dos objetos): a sala que quiser escuta
// (a balada e o vagão: tocar no ritmo em qualquer lugar)
let toqueLivre: (() => void) | null = null
export function useToqueLivre(f: (() => void) | null) {
  const ref = useRef(f)
  useEffect(() => { ref.current = f })
  useEffect(() => {
    const ouvir = () => ref.current?.()
    toqueLivre = ouvir
    return () => { if (toqueLivre === ouvir) toqueLivre = null }
  }, [])
}

// as salas que já existem por dentro (as outras caem na fachada, como antes)
export const SALAS: Partial<Record<LugarId, ComponentType<SalaProps>>> = {
  bar: SalaBar,
  balada: SalaBalada,
  plataforma: SalaVagao,
}

export function temSala(id: LugarId) { return !!SALAS[id] }

// os gestos que cada sala faz em 3D (o resto continua na legenda)
export const GESTOS_3D: Partial<Record<LugarId, string[]>> = {
  bar: ["copos"],
  balada: ["danca"],
  plataforma: ["tocar", "fuga"],
}

// olhar em volta: arrastar gira a câmera um pouco (volta sozinha)
const olhar = { yaw: 0, pitch: 0, arrastando: false }

export function Interior({ lugar, objetos = [] }: { lugar: LugarId; objetos?: EstacaoId[] }) {
  const S = SALAS[lugar]
  const estado = useEstadoCena()
  const ult = useRef<{ x: number; y: number } | null>(null)
  if (!S) return null
  return (
    <div
      className="l-interior"
      onPointerDown={(e) => { ult.current = { x: e.clientX, y: e.clientY }; olhar.arrastando = true; toqueLivre?.() }}
      onPointerMove={(e) => {
        if (!ult.current) return
        olhar.yaw = THREE.MathUtils.clamp(olhar.yaw - (e.clientX - ult.current.x) * 0.004, -0.6, 0.6)
        olhar.pitch = THREE.MathUtils.clamp(olhar.pitch - (e.clientY - ult.current.y) * 0.003, -0.3, 0.3)
        ult.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={() => { ult.current = null; olhar.arrastando = false }}
      onPointerLeave={() => { ult.current = null; olhar.arrastando = false }}
    >
      <Canvas className="l-interior-cvs" dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance", stencil: false }} camera={{ fov: 50, near: 0.05, far: 200, position: [0, 1.6, 6] }}>
        <Suspense fallback={null}>
          <Seguro nome={`sala-${lugar}`}><S estado={estado} objetos={objetos} /></Seguro>
        </Suspense>
        <Seguro nome="lente-sala"><Cinema /></Seguro>
      </Canvas>
    </div>
  )
}

// ── a câmera da sala: vai até o plano pedido, devagar, e respira ──
export interface Plano { pos: V3; olha: V3; fov?: number }

export function Camera({ plano, rapido = false }: { plano: Plano; rapido?: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const alvoPos = useMemo(() => new THREE.Vector3(), [])
  const alvoOlha = useMemo(() => new THREE.Vector3(), [])
  const olhaAgora = useRef<THREE.Vector3 | null>(null)
  const dir = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    alvoPos.set(...plano.pos)
    alvoOlha.set(...plano.olha)
  }, [plano, alvoPos, alvoOlha])
  useFrame((s, dt) => {
    const k = Math.min(1, dt * (rapido ? 4 : 1.6))
    camera.position.lerp(alvoPos, k)
    if (!olhaAgora.current) olhaAgora.current = alvoOlha.clone()
    olhaAgora.current.lerp(alvoOlha, k)
    // respiração da câmera na mão
    const t = s.clock.elapsedTime
    camera.position.y += Math.sin(t * 0.9) * 0.002
    // olhar em volta: solta e volta pro plano
    if (!olhar.arrastando) { olhar.yaw *= 1 - Math.min(1, dt * 1.5); olhar.pitch *= 1 - Math.min(1, dt * 1.5) }
    dir.copy(olhaAgora.current).sub(camera.position)
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), olhar.yaw)
    dir.y += olhar.pitch * dir.length()
    camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z)
    // o fov do plano é pensado deitado; com o celular em pé a imagem fica
    // estreita, então abre o vertical pra manter a largura (até 78°)
    const base = plano.fov ?? 50
    const asp = camera.aspect || 1
    const fov = asp >= 1 ? base : Math.min(78, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) / Math.max(asp, 0.45) * 0.62)))
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix() }
  })
  return null
}
