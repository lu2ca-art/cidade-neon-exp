"use client"

// DE PATINS (a gasolina acabou): a Kombi fica parada onde secou e você segue
// de patins pela mesma rua até o posto mais perto, ouvindo o mp3. Terceira
// pessoa (referências do LU2CA: a caminhada do jogo do Daredevil e o Roller
// Heist). O corpo empurra de lado, alternando as pernas, os braços balançam
// e ele inclina pra dentro da curva.

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { ModeloSeguro } from "./Seguro"
import { MAT_PECAS, URL_RODAS, geoDoNo } from "./pecas"

const PELE = "#5a3a26"

// (19/10) no ar ele encolhe (joelhos no peito, braços abertos pro equilíbrio)
// e, no propulsor, o jato de ar das costas acende
type PropsPatins = { vel: () => number; steer: () => number; ar?: () => boolean; jato?: () => boolean }
// (06/11) os patins e o jato modelados no Blender (blender/scripts/rodas.py →
// public/models/rodas.glb): "patins" no referencial da perna (o mesmo nas duas) e
// "jato" no do corpo, desenhados pelo MAT_PECAS. A chama continua a daqui.
type GeoPatins = { patins: THREE.BufferGeometry; jato: THREE.BufferGeometry }
function PatinsGlb(p: PropsPatins) {
  const { nodes } = useGLTF(URL_RODAS) as unknown as { nodes: Record<string, THREE.Object3D> }
  const geo = useMemo<GeoPatins>(() => ({ patins: geoDoNo(nodes, "patins", "rodas.glb"), jato: geoDoNo(nodes, "jato", "rodas.glb") }), [nodes])
  useEffect(() => () => { geo.patins.dispose(); geo.jato.dispose() }, [geo])
  return <PatinadorCorpo {...p} geo={geo} />
}
/** o patinador: os patins e o jato do Blender; enquanto carrega (e se falhar), os procedurais */
export function Patinador(p: PropsPatins) {
  return <ModeloSeguro nome="patins-glb" reserva={<PatinadorCorpo {...p} />}><PatinsGlb {...p} /></ModeloSeguro>
}

function PatinadorCorpo({ vel, steer, ar = () => false, jato = () => false, geo }: PropsPatins & { geo?: GeoPatins }) {
  const corpo = useRef<THREE.Group>(null)
  const pernas = useRef<(THREE.Group | null)[]>([])
  const bracos = useRef<(THREE.Group | null)[]>([])
  const fase = useRef(0)
  const enc = useRef(0)
  const chama = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const v = Math.abs(vel()), s = steer()
    enc.current += ((ar() ? 1 : 0) - enc.current) * Math.min(1, dt * 10)
    const e = enc.current
    if (chama.current) {
      const on = jato()
      chama.current.visible = on
      if (on) chama.current.scale.set(1, 0.8 + Math.random() * 0.5, 1)
    }
    // a passada: mais rápida quanto mais rápido, e quase parada no embalo
    fase.current += dt * (1.6 + v * 0.22)
    const f = fase.current, forca = Math.min(1, v / 8)
    if (corpo.current) {
      corpo.current.rotation.z = -s * 0.28 * forca
      corpo.current.rotation.x = -0.18 - forca * 0.2
      corpo.current.position.y = 0.04 * Math.abs(Math.sin(f)) * forca
    }
    for (let i = 0; i < pernas.current.length; i++) {
      const p = pernas.current[i]
      if (!p) continue
      const lado = i ? 1 : -1, empurra = Math.max(0, Math.sin(f + i * Math.PI))
      // empurra pra fora e pra trás, depois volta pra baixo do corpo
      p.rotation.z = lado * empurra * 0.45 * forca * (1 - e)
      p.rotation.x = empurra * 0.35 * forca * (1 - e) - e * 1.1
    }
    for (let i = 0; i < bracos.current.length; i++) { const b = bracos.current[i]; if (b) { b.rotation.x = Math.sin(f + i * Math.PI) * 0.8 * forca * (1 - e); b.rotation.z = (i ? -1 : 1) * e * 1.2 } }
  })
  return (
    <group ref={corpo} scale={1.15}>
      {/* tronco com o casaco, a cabeça e o boné */}
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.44, 0.62, 0.26]} /><meshStandardMaterial color="#ff3fb0" roughness={0.7} /></mesh>
      <mesh position={[0, 1.72, 0]}><sphereGeometry args={[0.15, 14, 10]} /><meshStandardMaterial color={PELE} /></mesh>
      <mesh position={[0, 1.83, 0.05]} rotation-x={-0.2}><cylinderGeometry args={[0.16, 0.16, 0.07, 14]} /><meshStandardMaterial color="#14121c" /></mesh>
      <mesh position={[0, 1.81, 0.2]}><boxGeometry args={[0.22, 0.02, 0.14]} /><meshStandardMaterial color="#14121c" /></mesh>
      {/* o jato de ar das costas (o propulsor do patins) e a chama dele */}
      {geo ? <mesh geometry={geo.jato} material={MAT_PECAS} /> : <mesh position={[0, 1.36, -0.2]}><boxGeometry args={[0.3, 0.36, 0.14]} /><meshStandardMaterial color="#1b1530" emissive="#2fe8ff" emissiveIntensity={0.25} /></mesh>}
      <mesh ref={chama} position={[0, 0.96, -0.22]} rotation-x={Math.PI} visible={false}>
        <coneGeometry args={[0.12, 0.6, 10, 1, true]} />
        <meshBasicMaterial color="#7ff4ff" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
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
          {geo ? <mesh geometry={geo.patins} material={MAT_PECAS} /> : <>
          <mesh position={[0, -0.82, 0.05]}><boxGeometry args={[0.16, 0.16, 0.32]} /><meshStandardMaterial color="#f2eefa" /></mesh>
          <mesh position={[0, -0.92, 0.05]}><boxGeometry args={[0.08, 0.04, 0.34]} /><meshStandardMaterial color="#ffc857" /></mesh>
          {[-0.12, -0.04, 0.04, 0.12].map((z) => (
            <mesh key={z} position={[0, -0.97, 0.05 + z]} rotation-z={Math.PI / 2}><cylinderGeometry args={[0.035, 0.035, 0.05, 10]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.8} /></mesh>
          ))}
          </>}
        </group>
      ))}
    </group>
  )
}
