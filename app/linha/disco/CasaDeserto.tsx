"use client"

// A CASINHA NO MEIO DO NADA (LU2CA 19/10): a casa da D-Bee no deserto, longe
// da cidade. De madeira, a luz acesa, a porta aberta, uma antena velha e a
// caixa d'água; e uma coluna de luz quente que se vê de longe (no começo é ali
// que ele tem que ir). Poucas peças, materiais simples: leve.
//
// (T37, J1/J2: 4: "a casa tem que estar mais iluminada pelas janelas"; "só
// então a porta e ela recebendo ele") as janelas maiores, com caixilho, um
// halo quente em volta e a luz delas no chão (planos somados, sem luz de
// verdade: nenhuma lâmpada a mais na cena). A porta fecha enquanto a Kombi
// chega e abre quando ela para; a D-Bee aparece na porta, contra a luz, acenando.

import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { CASA } from "./historia"
import { ehDia } from "../relogio"

/* eslint-disable react-hooks/immutability --
   cena R3F: a porta e o aceno mudam a cada quadro (useFrame); não é estado do React */

// a porta da casa (o Corrida manda): alvo 0 = fechada, 1 = aberta; recebe = a D-Bee na porta
export const PORTA_CASA = { alvo: 1, abre: 1, recebe: false }

// um brilho redondo (o halo das janelas e a luz delas no chão)
function texHalo() {
  if (typeof document === "undefined") return null
  const c = document.createElement("canvas")
  c.width = c.height = 64
  const g = c.getContext("2d")!
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, "rgba(255,255,255,1)")
  r.addColorStop(0.35, "rgba(255,255,255,0.45)")
  r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// as aberturas acesas da frente e dos lados: [x, y, z, rotY, largura, altura]
const JANELAS: [number, number, number, number, number, number][] = [
  [-2.1, 2.05, 3.31, 0, 1.9, 1.3],
  [3.81, 2.05, 0.6, Math.PI / 2, 1.9, 1.3],
  [-3.81, 2.05, -0.8, -Math.PI / 2, 1.6, 1.2],
]

export function CasaDeserto({ chao, farol = true, hora }: { chao: (x: number, z: number) => number; farol?: boolean; hora?: React.RefObject<number> }) {
  const y = useMemo(() => chao(CASA.x, CASA.z), [chao])
  // de frente pra cidade (o centro)
  const rot = Math.atan2(-CASA.x, -CASA.z)
  const mats = useMemo(() => {
    const halo = texHalo()
    return {
      madeira: new THREE.MeshStandardMaterial({ color: "#6b4a34", roughness: 0.9 }),
      escura: new THREE.MeshStandardMaterial({ color: "#3b2619", roughness: 0.9 }),
      telhado: new THREE.MeshStandardMaterial({ color: "#3a2a26", roughness: 0.8 }),
      luz: new THREE.MeshBasicMaterial({ color: "#ffd59a", toneMapped: false }),
      metal: new THREE.MeshStandardMaterial({ color: "#8a8f9a", metalness: 0.6, roughness: 0.4 }),
      // a D-Bee contra a luz da porta: só a silhueta
      sombra: new THREE.MeshBasicMaterial({ color: "#140c10" }),
      // (22/10, 2.2) sem névoa: a coluna é o que se vê da casa lá de longe, desde a queda
      farol: new THREE.MeshBasicMaterial({ color: "#ffb35c", transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
      halo: new THREE.MeshBasicMaterial({ color: "#ffb866", map: halo, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      noChao: new THREE.MeshBasicMaterial({ color: "#ff9e4a", map: halo, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }
  }, [])
  const telhado = useMemo(() => {
    // o telhado de duas águas: um prisma triangular
    const s = new THREE.Shape([new THREE.Vector2(-4.2, 0), new THREE.Vector2(4.2, 0), new THREE.Vector2(0, 2.4)])
    const g = new THREE.ExtrudeGeometry(s, { depth: 7.4, bevelEnabled: false })
    g.translate(0, 0, -3.7)
    return g
  }, [])
  const porta = useRef<THREE.Group>(null)
  const dbee = useRef<THREE.Group>(null)
  const braco = useRef<THREE.Mesh>(null)
  const coluna = useRef<THREE.Mesh>(null)
  const noite = useRef(-1)
  useFrame((state, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const P = PORTA_CASA
    P.abre += (P.alvo - P.abre) * Math.min(1, dt * 2.4)
    if (porta.current) porta.current.rotation.y = -P.abre * 1.75
    if (dbee.current) {
      const ve = P.recebe && P.abre > 0.55
      dbee.current.visible = ve
      if (ve && braco.current) braco.current.rotation.z = 2.5 + Math.sin(state.clock.elapsedTime * 7) * 0.35
    }
    if (coluna.current) coluna.current.visible = farol || P.recebe
    // de dia o halo quase some; de noite (e no entardecer) as janelas mandam
    const n = ehDia(hora?.current ?? 18) ? 0 : 1
    if (n !== noite.current) {
      noite.current = n
      mats.halo.opacity = n ? 0.55 : 0.16
      mats.noChao.opacity = n ? 0.42 : 0.1
    }
  })
  return (
    <group position={[CASA.x, y - 0.4, CASA.z]} rotation={[0, rot, 0]}>
      {/* o cômodo */}
      <mesh position={[0, 1.8, 0]} material={mats.madeira}><boxGeometry args={[7.6, 3.6, 6.6]} /></mesh>
      <mesh position={[0, 3.6, 0]} material={mats.telhado} geometry={telhado} />
      {/* a porta: a luz de dentro, a folha (dobradiça do lado esquerdo) e o batente */}
      <mesh position={[0.9, 1.35, 3.31]} material={mats.luz}><planeGeometry args={[1.1, 2.2]} /></mesh>
      <group ref={porta} position={[0.35, 1.35, 3.36]}>
        <mesh position={[0.55, 0, 0]} material={mats.escura}><boxGeometry args={[1.1, 2.2, 0.07]} /></mesh>
      </group>
      <mesh position={[0.9, 2.5, 3.36]} material={mats.escura}><boxGeometry args={[1.35, 0.12, 0.1]} /></mesh>
      {/* a D-Bee na porta, contra a luz, acenando */}
      <group ref={dbee} position={[0.9, 0.4, 3.75]} visible={false}>
        <mesh position={[0, 0.78, 0]} material={mats.sombra}><capsuleGeometry args={[0.24, 0.85, 3, 8]} /></mesh>
        <mesh position={[0, 1.62, 0]} material={mats.sombra}><sphereGeometry args={[0.2, 10, 8]} /></mesh>
        <mesh ref={braco} position={[0.3, 1.25, 0]} rotation={[0, 0, 2.5]} material={mats.sombra}><boxGeometry args={[0.08, 0.6, 0.08]} /></mesh>
      </group>
      {/* as janelas: a luz, o caixilho em cruz e o halo quente em volta */}
      {JANELAS.map(([x, yy, z, ry, w, hh], i) => (
        <group key={i} position={[x, yy, z]} rotation={[0, ry, 0]}>
          <mesh material={mats.luz}><planeGeometry args={[w, hh]} /></mesh>
          <mesh position={[0, 0, 0.03]} material={mats.escura}><boxGeometry args={[w + 0.16, 0.08, 0.05]} /></mesh>
          <mesh position={[0, 0, 0.03]} material={mats.escura}><boxGeometry args={[0.08, hh + 0.16, 0.05]} /></mesh>
          <mesh position={[0, 0, 0.06]} material={mats.halo}><planeGeometry args={[w * 2.6, hh * 2.6]} /></mesh>
        </group>
      ))}
      <mesh position={[0.9, 1.35, 3.4]} material={mats.halo}><planeGeometry args={[2.6, 3.6]} /></mesh>
      {/* a luz das janelas e da porta no chão (na areia e na varanda) */}
      <mesh position={[0.6, 0.44, 6.2]} rotation={[-Math.PI / 2, 0, 0]} material={mats.noChao}><planeGeometry args={[9, 6]} /></mesh>
      <mesh position={[6.2, 0.42, 0.6]} rotation={[-Math.PI / 2, 0, 0]} material={mats.noChao}><planeGeometry args={[5, 5]} /></mesh>
      <mesh position={[-6, 0.42, -0.8]} rotation={[-Math.PI / 2, 0, 0]} material={mats.noChao}><planeGeometry args={[4.5, 4.5]} /></mesh>
      {/* a varanda: o chão e dois postes */}
      <mesh position={[0, 0.25, 4.4]} material={mats.madeira}><boxGeometry args={[7.6, 0.3, 2]} /></mesh>
      <mesh position={[-3.5, 1.7, 5.2]} material={mats.madeira}><boxGeometry args={[0.2, 3, 0.2]} /></mesh>
      <mesh position={[3.5, 1.7, 5.2]} material={mats.madeira}><boxGeometry args={[0.2, 3, 0.2]} /></mesh>
      {/* a antena velha e a caixa d'água */}
      <mesh position={[-2.6, 7.2, -1.6]} material={mats.metal}><cylinderGeometry args={[0.06, 0.08, 6, 5]} /></mesh>
      <mesh position={[-2.6, 9.6, -1.6]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}><cylinderGeometry args={[0.04, 0.04, 2.4, 4]} /></mesh>
      <mesh position={[5.6, 3.3, -2.2]} material={mats.metal}><cylinderGeometry args={[1.1, 1.1, 1.6, 10]} /></mesh>
      <mesh position={[5.6, 1.25, -2.2]} material={mats.madeira}><boxGeometry args={[1.6, 2.5, 1.6]} /></mesh>
      {/* de longe: a coluna de luz quente (até ele chegar na porta; e em cada chegada) */}
      <mesh ref={coluna} position={[0, 110, 0]} material={mats.farol} visible={farol}><cylinderGeometry args={[3, 4.6, 220, 10, 1, true]} /></mesh>
    </group>
  )
}
