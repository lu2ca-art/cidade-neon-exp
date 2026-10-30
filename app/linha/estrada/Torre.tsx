"use client"

// AS TORRES do mapa-disco: a central (de onde saem todas as pistas) e as das
// pontas. Um prédio de vidro escuro com janelas e, em volta, no alto, a
// ROTATÓRIA DE CIMA (T61, LU2CA 29/10: "sem espiral: só a torre e a rotatória
// de cima"). O anel (a pista) é desenhado com as outras vias; aqui ficam o
// prédio, os pilares que seguram o anel, uma faixa de neon no prédio na altura
// do anel com a cor de cada linha virada pro lado onde ela sai, e a coroa.
// (desempenho) poucas malhas por torre: os pilares numa malha só, as faixas
// das linhas numa malha só (cor por vértice)

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { CentralDisco } from "./mundoDisco"
import { LuzPonto } from "./luzes"

const CHAO = -12
const N_PILARES = 10 // pilares por anel

function comCor(g: THREE.BufferGeometry, cor: THREE.Color) {
  const n = g.attributes.position.count, c = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { c[i * 3] = cor.r; c[i * 3 + 1] = cor.g; c[i * 3 + 2] = cor.b }
  g.setAttribute("color", new THREE.BufferAttribute(c, 3))
  g.deleteAttribute("normal"); g.deleteAttribute("uv")
  return g
}

export function TorreCentral({ c, janelas }: { c: CentralDisco; janelas: THREE.Texture }) {
  const yAnel = c.topo
  const topo = yAnel + 22
  const alto = topo - CHAO
  const coroa = useRef<THREE.MeshBasicMaterial>(null)
  const tex = useMemo(() => {
    const t = janelas.clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(10, alto / 12)
    t.needsUpdate = true
    return t
  }, [janelas, alto])
  const geo = useMemo(() => {
    // as faixas das linhas: um arco de neon no prédio, na altura do anel, virado
    // pra saída de cada linha (o ângulo do Q; no three, θ = π/2 − ang)
    const arco = 0.34
    const faixas = mergeGeometries(c.andares.map((a) => comCor(new THREE.CylinderGeometry(c.nucleo + 0.6, c.nucleo + 0.6, 2.2, 10, 1, true, Math.PI / 2 - a.ang - arco / 2, arco).translate(0, yAnel + 1.2, 0), new THREE.Color(a.cor))), false)
    // os pilares do anel (do deserto até embaixo do asfalto)
    const pils: THREE.BufferGeometry[] = []
    for (let k = 0; k < N_PILARES; k++) {
      const th = (k / N_PILARES) * Math.PI * 2
      const h = yAnel - 1.2 - CHAO
      const g = new THREE.CylinderGeometry(1.6, 2.2, h, 8, 1, false).translate(c.raio * Math.cos(th), CHAO + h / 2, c.raio * Math.sin(th))
      g.deleteAttribute("uv")
      pils.push(g)
    }
    return { faixas, pilares: mergeGeometries(pils, false) }
  }, [c, yAnel])
  useEffect(() => () => { geo.faixas.dispose(); geo.pilares.dispose() }, [geo])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame(({ clock }) => {
    if (coroa.current) coroa.current.opacity = 0.65 + Math.sin(clock.elapsedTime * 1.4) * 0.25
  })
  return (
    <group position={[c.x, 0, c.z]}>
      {/* o prédio */}
      <mesh position={[0, CHAO + alto / 2, 0]}>
        <cylinderGeometry args={[c.nucleo, c.nucleo * 1.08, alto, 48, 1, false]} />
        <meshStandardMaterial color="#0b0a16" emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.55} roughness={0.25} metalness={0.6} />
      </mesh>
      {/* as faixas das linhas, na altura da rotatória */}
      <mesh geometry={geo.faixas}>
        <meshBasicMaterial vertexColors toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* os pilares que seguram o anel */}
      <mesh geometry={geo.pilares}>
        <meshStandardMaterial color="#14122a" roughness={0.6} />
      </mesh>
      {/* a coroa */}
      <mesh position={[0, topo + 1, 0]}>
        <torusGeometry args={[c.nucleo * 0.75, 1.1, 10, 64]} />
        <meshBasicMaterial ref={coroa} color="#ff6a35" toneMapped={false} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, topo + 14, 0]}>
        <cylinderGeometry args={[0.6, 1.4, 26, 8]} />
        <meshStandardMaterial color="#1a1830" emissive="#ff6a35" emissiveIntensity={0.6} />
      </mesh>
      <LuzPonto position={[0, topo + 6, 0]} color="#ff6a35" intensity={80} distance={260} />
    </group>
  )
}
