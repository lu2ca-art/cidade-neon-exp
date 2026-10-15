"use client"

// DE PATINS (a gasolina acabou): a Kombi fica parada onde secou e você segue
// de patins pela mesma rua até o posto mais perto, ouvindo o mp3. Terceira
// pessoa (referências do LU2CA: a caminhada do jogo do Daredevil e o Roller
// Heist). O corpo empurra de lado, alternando as pernas, os braços balançam
// e ele inclina pra dentro da curva.

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

const PELE = "#5a3a26"

export function Patinador({ vel, steer }: { vel: () => number; steer: () => number }) {
  const corpo = useRef<THREE.Group>(null)
  const pernas = useRef<(THREE.Group | null)[]>([])
  const bracos = useRef<(THREE.Group | null)[]>([])
  const fase = useRef(0)
  useFrame((_, dt) => {
    const v = Math.abs(vel()), s = steer()
    // a passada: mais rápida quanto mais rápido, e quase parada no embalo
    fase.current += dt * (1.6 + v * 0.22)
    const f = fase.current, forca = Math.min(1, v / 8)
    if (corpo.current) {
      corpo.current.rotation.z = -s * 0.28 * forca
      corpo.current.rotation.x = -0.18 - forca * 0.2
      corpo.current.position.y = 0.04 * Math.abs(Math.sin(f)) * forca
    }
    pernas.current.forEach((p, i) => {
      if (!p) return
      const lado = i ? 1 : -1, empurra = Math.max(0, Math.sin(f + i * Math.PI))
      // empurra pra fora e pra trás, depois volta pra baixo do corpo
      p.rotation.z = lado * empurra * 0.45 * forca
      p.rotation.x = empurra * 0.35 * forca
    })
    bracos.current.forEach((b, i) => { if (b) b.rotation.x = Math.sin(f + i * Math.PI) * 0.8 * forca })
  })
  return (
    <group ref={corpo} scale={1.15}>
      {/* tronco com o casaco, a cabeça e o boné */}
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.44, 0.62, 0.26]} /><meshStandardMaterial color="#ff3fb0" roughness={0.7} /></mesh>
      <mesh position={[0, 1.72, 0]}><sphereGeometry args={[0.15, 14, 10]} /><meshStandardMaterial color={PELE} /></mesh>
      <mesh position={[0, 1.83, 0.05]} rotation-x={-0.2}><cylinderGeometry args={[0.16, 0.16, 0.07, 14]} /><meshStandardMaterial color="#14121c" /></mesh>
      <mesh position={[0, 1.81, 0.2]}><boxGeometry args={[0.22, 0.02, 0.14]} /><meshStandardMaterial color="#14121c" /></mesh>
      {/* o mp3 com o fone */}
      <mesh position={[0.17, 1.72, 0]}><boxGeometry args={[0.04, 0.1, 0.1]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.6} /></mesh>
      <mesh position={[-0.17, 1.72, 0]}><boxGeometry args={[0.04, 0.1, 0.1]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.6} /></mesh>
      {[-1, 1].map((l, i) => (
        <group key={i} ref={(b) => { bracos.current[i] = b }} position={[l * 0.29, 1.5, 0]}>
          <mesh position={[0, -0.27, 0]}><boxGeometry args={[0.11, 0.55, 0.11]} /><meshStandardMaterial color="#ff3fb0" /></mesh>
          <mesh position={[0, -0.58, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshStandardMaterial color={PELE} /></mesh>
        </group>
      ))}
      {[-1, 1].map((l, i) => (
        <group key={i} ref={(p) => { pernas.current[i] = p }} position={[l * 0.12, 0.94, 0]}>
          <mesh position={[0, -0.4, 0]}><boxGeometry args={[0.15, 0.8, 0.17]} /><meshStandardMaterial color="#1b1530" /></mesh>
          {/* o patins: bota, base e as quatro rodas */}
          <mesh position={[0, -0.82, 0.05]}><boxGeometry args={[0.16, 0.16, 0.32]} /><meshStandardMaterial color="#f2eefa" /></mesh>
          <mesh position={[0, -0.92, 0.05]}><boxGeometry args={[0.08, 0.04, 0.34]} /><meshStandardMaterial color="#ffc857" /></mesh>
          {[-0.12, -0.04, 0.04, 0.12].map((z) => (
            <mesh key={z} position={[0, -0.97, 0.05 + z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.05, 10]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.8} /></mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
