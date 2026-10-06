"use client"

// POR DENTRO dos lugares (04/10, pedido do LU2CA): a cena não acontece mais
// na fachada. Passou na frente, a câmera corta pra DENTRO: a sala em 3D com
// quem está lá, a câmera trocando de plano conforme quem fala, e os gestos
// feitos com as coisas da sala (os copos no balcão, a pista da balada…).
//
// A legenda e as escolhas continuam por cima (cena.tsx); as duas conversam
// pelo bus.ts. Cada sala é um componente em salas/*.tsx.

import { Canvas, useThree } from "@react-three/fiber"
import { Suspense, lazy, useEffect, useRef, type ComponentType, type LazyExoticComponent } from "react"
import * as THREE from "three"
import { Cinema } from "../estrada/Cinema"
import { Seguro } from "../estrada/Seguro"
import type { EstacaoId } from "../data"
import type { LugarId } from "../lugares"
import { useEstadoCena } from "./bus"
import { chamarToqueLivre, olhar, type SalaProps } from "./motor"
import { CARREGAR } from "./registro"

// re-exporta o motor pra quem ainda importa daqui
export { Camera, useToqueLivre, type Plano, type SalaProps } from "./motor"

// cada sala vira um componente preguiçoso uma vez só (o código dela só baixa
// quando for desenhada pela primeira vez)
const SALAS = Object.fromEntries(
  Object.entries(CARREGAR).map(([id, c]) => [id, lazy(() => c!().then((C) => ({ default: C })))]),
) as Partial<Record<LugarId, LazyExoticComponent<ComponentType<SalaProps>>>>

export function Interior({ lugar, objetos = [], inicio = false, copos = [] }: { lugar: LugarId; objetos?: EstacaoId[]; inicio?: boolean; copos?: number[] }) {
  // a sala vem num pedaço próprio do pacote (registro.ts)
  const S = SALAS[lugar]
  const estado = useEstadoCena()
  const ult = useRef<{ x: number; y: number } | null>(null)
  if (!S) return null
  return (
    <div
      className="l-interior"
      onPointerDown={(e) => { ult.current = { x: e.clientX, y: e.clientY }; olhar.arrastando = true; chamarToqueLivre() }}
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
          <Seguro nome={`sala-${lugar}`}><S estado={estado} objetos={objetos} inicio={inicio} copos={copos} /></Seguro>
        </Suspense>
        <Seguro nome="lente-sala"><Cinema /></Seguro>
        {process.env.NODE_ENV !== "production" && <Medidor />}
      </Canvas>
    </div>
  )
}


// o ORÇAMENTO da sala (só em desenvolvimento): __sala() no console devolve
// quantas luzes, malhas, triângulos e chamadas de desenho a cena está gastando
function Medidor() {
  const { scene, gl } = useThree()
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__sala = () => {
      let luzes = 0, malhas = 0, tri = 0
      scene.traverse((o) => {
        if ((o as THREE.Light).isLight && o.visible) luzes++
        const m = o as THREE.Mesh
        if (m.isMesh && m.visible) {
          malhas++
          const g = m.geometry
          const n = g.index ? g.index.count : g.attributes.position?.count ?? 0
          tri += Math.round(n / 3) * ((m as THREE.InstancedMesh).count ?? 1)
        }
      })
      return { luzes, malhas, triangulos: tri, chamadas: gl.info.render.calls, geometrias: gl.info.memory.geometries, texturas: gl.info.memory.textures }
    }
    return () => { delete w.__sala }
  }, [scene, gl])
  return null
}
