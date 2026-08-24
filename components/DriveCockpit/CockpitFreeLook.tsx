"use client"

// Free-look dentro da cabine: mouse olha (via PointerLockControls por fora),
// WASD move, Q/E sobe/desce. Bounds apertados ao interior do carro.
// Precisa estar dentro de um <Canvas> com <PointerLockControls />.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

export interface CockpitFreeLookProps {
  /** Velocidade de deslocamento em unidades/s. Padrão 0.8 (cabine é pequena). */
  speed?: number
  /** Limites do interior do carro. Padrão bate com o piso do LAYOUT. */
  bounds?: {
    minX?: number; maxX?: number
    minY?: number; maxY?: number
    minZ?: number; maxZ?: number
  }
}

const DEFAULT_BOUNDS = {
  minX: -0.7, maxX: 0.7,
  minY: 0.9,  maxY: 1.35,
  minZ: -0.5, maxZ: 1.5,
}

export function CockpitFreeLook({ speed = 0.8, bounds }: CockpitFreeLookProps) {
  const { camera } = useThree()
  const keys = useRef({ w: false, a: false, s: false, d: false, q: false, e: false })
  const b = { ...DEFAULT_BOUNDS, ...bounds }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "a" || k === "s" || k === "d" || k === "q" || k === "e") {
        keys.current[k as keyof typeof keys.current] = true
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "w" || k === "a" || k === "s" || k === "d" || k === "q" || k === "e") {
        keys.current[k as keyof typeof keys.current] = false
      }
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  useFrame((_, delta) => {
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    if (keys.current.w) camera.position.addScaledVector(forward, speed * delta)
    if (keys.current.s) camera.position.addScaledVector(forward, -speed * delta)
    if (keys.current.d) camera.position.addScaledVector(right, speed * delta)
    if (keys.current.a) camera.position.addScaledVector(right, -speed * delta)
    if (keys.current.e) camera.position.y += speed * delta
    if (keys.current.q) camera.position.y -= speed * delta

    camera.position.x = Math.max(b.minX!, Math.min(b.maxX!, camera.position.x))
    camera.position.z = Math.max(b.minZ!, Math.min(b.maxZ!, camera.position.z))
    camera.position.y = Math.max(b.minY!, Math.min(b.maxY!, camera.position.y))
  })

  return null
}
