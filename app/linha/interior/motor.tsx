"use client"
/* eslint-disable react-hooks/immutability -- three.js: a câmera é do motor, mexida a cada quadro */

// O motor comum das salas: as props que toda sala recebe, o toque livre na
// tela, o olhar em volta e a câmera de cinema. Separado do Interior pra as
// salas (cada uma num pedaço do pacote) não puxarem umas às outras.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { EstacaoId } from "../data"
import type { EstadoCena } from "./bus"
import type { V3 } from "./comum"

export interface SalaProps { estado: EstadoCena; objetos: EstacaoId[] }

// toque livre na tela (fora dos objetos): a sala que quiser escuta
// (a balada e o vagão: tocar no ritmo em qualquer lugar)
export let toqueLivre: (() => void) | null = null
export function useToqueLivre(f: (() => void) | null) {
  const ref = useRef(f)
  useEffect(() => { ref.current = f })
  useEffect(() => {
    const ouvir = () => ref.current?.()
    toqueLivre = ouvir
    return () => { if (toqueLivre === ouvir) toqueLivre = null }
  }, [])
}

export function chamarToqueLivre() { toqueLivre?.() }

// olhar em volta: arrastar gira a câmera um pouco (volta sozinha)
export const olhar = { yaw: 0, pitch: 0, arrastando: false }

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
