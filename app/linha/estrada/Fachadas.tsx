"use client"

// As fachadas dos lugares que são páginas (paginas.ts): no mapa só a prévia
// leve — o prédio, a vitrine acesa na cor do lugar, o letreiro e a vaga na
// beira da pista. Fechado (fora do horário), a vitrine apaga.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { poseLugar } from "./Lugares"
import { texTexto } from "./geo"
import { PAGINAS, type LugarPagina } from "../paginas"
import type { Lugar } from "../lugares"

const FUNDO = 10

function UmaFachada({ M, p, aberto, perto }: { M: Mundo; p: LugarPagina; aberto: boolean; perto: boolean }) {
  // a posição sai do mesmo cálculo dos lugares da história
  const pose = useMemo(() => poseLugar(M, { area: p.area, u: p.u, lado: p.lado } as Lugar, `pagina:${p.id}`), [M, p])
  const letreiro = useMemo(() => texTexto([{ txt: p.letreiro, tam: 150, cor: p.cor }], 1024, 220), [p])
  const vaga = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((s) => { if (vaga.current) vaga.current.opacity = perto && aberto ? 0.34 + Math.sin(s.clock.elapsedTime * 3) * 0.14 : 0.1 })
  const alto = pose.chao + 24
  const luz = aberto ? 0.55 : 0.04
  return (
    <group>
      <group position={[pose.centro.x, -12 + alto / 2, pose.centro.z]} rotation-y={pose.rumo}>
        <mesh><boxGeometry args={[FUNDO, alto, 18]} /><meshStandardMaterial color="#1a1422" roughness={0.9} /></mesh>
      </group>
      <group position={[pose.centro.x, pose.chao, pose.centro.z]} rotation-y={pose.rumo + (p.lado > 0 ? Math.PI / 2 : -Math.PI / 2)}>
        <group position={[0, 0, FUNDO / 2 + 0.02]}>
          <mesh position={[0, 2.2, 0]}>
            <planeGeometry args={[14, 3.6]} />
            <meshStandardMaterial color="#07060c" emissive={p.cor} emissiveIntensity={luz} roughness={0.15} metalness={0.4} />
          </mesh>
          <mesh position={[0, 6.4, 0.05]}>
            <planeGeometry args={[10, 2.15]} />
            <meshBasicMaterial map={letreiro} transparent toneMapped={false} opacity={aberto ? 1 : 0.25} />
          </mesh>
          <mesh position={[0, 4.3, 0.4]} rotation-x={0.35}>
            <boxGeometry args={[14.5, 0.12, 1.2]} />
            <meshStandardMaterial color={p.cor} emissive={p.cor} emissiveIntensity={aberto ? 0.4 : 0.05} />
          </mesh>
        </group>
      </group>
      {/* a vaga na beira da pista pisca quando dá pra entrar */}
      <mesh position={[pose.vaga.x, pose.vaga.y + 0.05, pose.vaga.z]} rotation={[-Math.PI / 2, 0, -pose.rumo]}>
        <planeGeometry args={[3.2, 14]} />
        <meshBasicMaterial ref={vaga} color={p.cor} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Fachadas({ M, abertos, perto }: { M: Mundo; abertos: Record<string, boolean>; perto: string | null }) {
  return <group>{PAGINAS.filter((p) => !p.lugar).map((p) => <UmaFachada key={p.id} M={M} p={p} aberto={!!abertos[p.id]} perto={perto === p.id} />)}</group>
}
