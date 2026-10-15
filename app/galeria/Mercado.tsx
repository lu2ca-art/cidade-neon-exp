"use client"

// O MERCADO (a galeria da cidade, no jeito do Art Shop Simulator): gente
// entra, anda pelos quadros, para pra olhar. Quando alguém gosta de uma obra
// sua, aparece o "!" e a pessoa vai até o balcão fazer uma oferta.

import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import { useMemo, useRef } from "react"
import * as THREE from "three"

export interface Alvo { id: string; x: number; z: number; ox: number; oz: number; sua: boolean }
export const BALCAO: [number, number] = [9, 7.5]
const PORTA: [number, number] = [0, 13]

// quem entra (descrição, nunca nome de gente)
const QUEM = ["uma colecionadora", "um turista", "o dono de uma loja", "uma arquiteta", "um investidor", "uma estudante de arte", "um casal", "uma curadora"]
const CORES = ["#3a6ad8", "#d8a03a", "#2f9a6a", "#8a3ad8", "#d84a6a", "#e8e0d0", "#3a3a48", "#c86a3a"]

type Fase = "andando" | "olhando" | "caixa" | "saindo"
interface Visitante { x: number; z: number; tx: number; tz: number; fase: Fase; ate: number; alvo: number; quer: string | null; cor: string; quem: string; visto: number }

export function Visitantes({ alvos, n = 6, livre, onInteresse }: { alvos: React.RefObject<Alvo[]>; n?: number; livre: React.RefObject<boolean>; onInteresse: (alvo: string, quem: string) => void }) {
  const corpos = useRef<(THREE.Group | null)[]>([])
  const bolhas = useRef<(THREE.Object3D | null)[]>([])
  const vs = useMemo<Visitante[]>(() => Array.from({ length: n }, (_, i) => ({ x: PORTA[0] + (i - n / 2) * 0.8, z: PORTA[1] - i * 1.5, tx: 0, tz: 0, fase: "andando", ate: 0, alvo: -1, quer: null, cor: CORES[i % CORES.length], quem: QUEM[i % QUEM.length], visto: 0 })), [n])
  const t = useRef(0)

  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 0.05)
    t.current += dt
    const lista = alvos.current
    vs.forEach((v, i) => {
      // escolhe o próximo quadro (ou a saída, depois de ver uns 4)
      const proximo = () => {
        if (v.visto >= 4 || lista.length === 0) { v.fase = "saindo"; v.tx = PORTA[0]; v.tz = PORTA[1] + 2; return }
        v.alvo = Math.floor(Math.random() * lista.length)
        const a = lista[v.alvo]
        v.tx = a.x + a.ox * (1.8 + Math.random() * 0.8) + (Math.random() - 0.5) * 1.2; v.tz = a.z + a.oz * (1.8 + Math.random() * 0.8) + (Math.random() - 0.5) * 1.2
        v.fase = "andando"
      }
      if (v.ate === 0 && v.fase === "andando" && v.alvo < 0) proximo()
      const dx = v.tx - v.x, dz = v.tz - v.z, d = Math.hypot(dx, dz)
      const vel = 1.1
      if (v.fase === "andando" || v.fase === "caixa" || v.fase === "saindo") {
        if (d > 0.1) { v.x += (dx / d) * Math.min(d, vel * dt); v.z += (dz / d) * Math.min(d, vel * dt) }
        else if (v.fase === "andando") { v.fase = "olhando"; v.ate = t.current + 3 + Math.random() * 4 }
        else if (v.fase === "caixa") {
          // chegou no balcão: faz a oferta (se o balcão estiver livre)
          if (livre.current && v.quer) { livre.current = false; onInteresse(v.quer, v.quem); v.quer = null; v.visto = 9; v.ate = t.current + 1.5 }
          else if (!v.quer && t.current > v.ate) proximo()
        } else if (v.fase === "saindo") {
          // sai e volta como outra pessoa
          v.x = PORTA[0] + (Math.random() - 0.5) * 3; v.z = PORTA[1] + 1; v.visto = 0; v.alvo = -1
          const k = Math.floor(Math.random() * QUEM.length); v.quem = QUEM[k]; v.cor = CORES[(k + i) % CORES.length]
          proximo()
        }
      } else if (v.fase === "olhando" && t.current > v.ate) {
        v.visto++
        const a = lista[v.alvo]
        // gostou de uma obra sua: o "!" e vai pro balcão
        if (a?.sua && Math.random() < 0.45) { v.quer = a.id; v.fase = "caixa"; v.tx = BALCAO[0] - 1 + Math.random() * 0.4; v.tz = BALCAO[1] + 1.2 }
        else proximo()
      }
      // desenha: anda balançando, olha pro quadro ou pra onde vai
      const g = corpos.current[i]; if (!g) return
      g.position.set(v.x, v.fase === "olhando" ? 0 : Math.abs(Math.sin(t.current * 7 + i)) * 0.05, v.z)
      const a = lista[v.alvo]
      const olhar = v.fase === "olhando" && a ? Math.atan2(a.x - v.x, a.z - v.z) : d > 0.05 ? Math.atan2(dx, dz) : g.rotation.y
      g.rotation.y += (((olhar - g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 6)
      const mat = (g.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial
      if (mat.color.getHexString() !== v.cor.slice(1)) mat.color.set(v.cor)
      const b = bolhas.current[i]; if (b) { b.visible = !!v.quer; b.position.y = 2.15 + Math.sin(t.current * 5) * 0.06 }
    })
  })

  return (
    <>
      {vs.map((v, i) => (
        <group key={i} ref={(g) => { corpos.current[i] = g }}>
          <mesh position={[0, 0.85, 0]}><capsuleGeometry args={[0.24, 0.9, 4, 10]} /><meshStandardMaterial color={v.cor} roughness={0.8} /></mesh>
          <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.17, 14, 10]} /><meshStandardMaterial color={["#5a3a26", "#c89a74", "#8a5a3a", "#e8c4a0"][i % 4]} /></mesh>
          <group ref={(b) => { bolhas.current[i] = b }} visible={false}>
            <mesh><circleGeometry args={[0.2, 20]} /><meshBasicMaterial color="#ffc857" side={THREE.DoubleSide} /></mesh>
            <Text font="/fonts/geist.ttf" position={[0, 0, 0.01]} fontSize={0.3} color="#14121c" anchorX="center" anchorY="middle">!</Text>
          </group>
        </group>
      ))}
    </>
  )
}

// o balcão com a caixa registradora
export function Balcao() {
  return (
    <group position={[BALCAO[0], 0, BALCAO[1]]}>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[3, 1.1, 0.9]} /><meshStandardMaterial color="#f2eee6" /></mesh>
      <mesh position={[0, 1.12, 0]}><boxGeometry args={[3.1, 0.05, 1]} /><meshStandardMaterial color="#3a2a1e" /></mesh>
      <mesh position={[0.6, 1.3, 0]}><boxGeometry args={[0.5, 0.3, 0.4]} /><meshStandardMaterial color="#1b1b22" /></mesh>
      <mesh position={[0.6, 1.5, -0.1]} rotation-x={-0.4}><boxGeometry args={[0.45, 0.25, 0.03]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.5} /></mesh>
      <mesh position={[-0.8, 1.45, 0]}><cylinderGeometry args={[0.18, 0.14, 0.6, 12]} /><meshStandardMaterial color="#2f6a3a" /></mesh>
    </group>
  )
}
