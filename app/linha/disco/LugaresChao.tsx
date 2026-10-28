"use client"

// O SUBÚRBIO NO CHÃO (LU2CA 21/10, B18): embaixo das pistas, na altura do
// lixão, os lugares da gente que ficou: o bar (missão 1), a oficina (missão
// 2) e o palco do subúrbio (os shows das missões que acontecem aqui). Uma
// fachada baixa com o letreiro em neon e, quando é pra lá que a história
// manda, uma coluna de luz que se vê de longe.

import { useMemo } from "react"
import * as THREE from "three"
import { CHAO_FIXOS, CHAO_LUGARES, type LugarChao } from "./historia"

function texLetreiro(txt: string, cor: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128
  const g = c.getContext("2d")!
  g.fillStyle = "#07060c"; g.fillRect(0, 0, 512, 128)
  g.font = "800 84px ui-monospace, monospace"; g.textAlign = "center"; g.textBaseline = "middle"
  g.shadowColor = cor; g.shadowBlur = 24; g.fillStyle = cor
  g.fillText(txt, 256, 68)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Fachada({ id, chao, alvo }: { id: LugarChao; chao: (x: number, z: number) => number; alvo: boolean }) {
  const l = CHAO_LUGARES[id]
  const y = useMemo(() => chao(l.x, l.z), [chao, l.x, l.z])
  // a porta vira pro centro da cidade (por onde a Kombi chega, embaixo das pistas)
  const rot = Math.atan2(-l.x, -l.z)
  const mats = useMemo(() => ({
    parede: new THREE.MeshStandardMaterial({ color: id === "oficina" ? "#3a3440" : "#2a2230", roughness: 0.85 }),
    letreiro: new THREE.MeshBasicMaterial({ map: texLetreiro(l.nome, l.cor), toneMapped: false }),
    luz: new THREE.MeshBasicMaterial({ color: l.cor, toneMapped: false }),
    porta: new THREE.MeshBasicMaterial({ color: "#ffcf8a", toneMapped: false }),
    farol: new THREE.MeshBasicMaterial({ color: l.cor, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [id, l.nome, l.cor])
  const larg = id === "palco" ? 14 : 12
  return (
    <group position={[l.x, y - 0.3, l.z]} rotation={[0, rot, 0]}>
      {id === "palco" ? (
        <>
          {/* o palco ao ar livre: o tablado, duas torres de luz e o letreiro em cima */}
          <mesh position={[0, 0.6, 0]} material={mats.parede}><boxGeometry args={[larg, 1.2, 8]} /></mesh>
          <mesh position={[0, 1.22, 4.01]} material={mats.luz}><boxGeometry args={[larg, 0.06, 0.04]} /></mesh>
          {[-1, 1].map((k) => <mesh key={k} position={[k * (larg / 2 - 0.5), 4, -3.4]} material={mats.parede}><boxGeometry args={[0.5, 8, 0.5]} /></mesh>)}
          <mesh position={[0, 8.2, -3.4]} material={mats.letreiro}><planeGeometry args={[8, 2]} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 3, 0]} material={mats.parede}><boxGeometry args={[larg, 6, 9]} /></mesh>
          <mesh position={[0, 6.6, 4.6]} material={mats.letreiro}><planeGeometry args={[8, 2]} /></mesh>
          <mesh position={[0, 2, 4.52]} material={mats.porta}><planeGeometry args={[id === "oficina" ? 6 : 1.6, id === "oficina" ? 3.6 : 2.6]} /></mesh>
          <mesh position={[0, 0.06, 4.55]} material={mats.luz}><boxGeometry args={[larg, 0.08, 0.06]} /></mesh>
        </>
      )}
      {alvo && <mesh position={[0, 70, 0]} material={mats.farol}><cylinderGeometry args={[2.4, 3.6, 140, 10, 1, true]} /></mesh>}
    </group>
  )
}

// (T09) os achados da missão da oficina: o painel solar velho meio enterrado no
// lixão e a goteira (um cano que pinga de debaixo da pista num tambor). Só
// existem na cena quando é a vez deles (uns 10 objetos simples, sem luz própria)
function Achado({ id, chao }: { id: "painel" | "goteira"; chao: (x: number, z: number) => number }) {
  const l = CHAO_LUGARES[id]
  const y = useMemo(() => chao(l.x, l.z), [chao, l.x, l.z])
  const mats = useMemo(() => ({
    sujo: new THREE.MeshStandardMaterial({ color: "#5a4a3a", roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: "#8a93b8", roughness: 0.5, metalness: 0.6 }),
    celula: new THREE.MeshStandardMaterial({ color: "#1d3a6b", emissive: "#4fc3ff", emissiveIntensity: 0.5, roughness: 0.3 }),
    agua: new THREE.MeshBasicMaterial({ color: "#4fc3ff", toneMapped: false }),
    farol: new THREE.MeshBasicMaterial({ color: l.cor, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [l.cor])
  return (
    <group position={[l.x, y, l.z]}>
      {id === "painel" ? (
        <>
          <mesh position={[0, 0.5, 0]} rotation={[-0.5, 0.4, 0.15]} material={mats.celula}><boxGeometry args={[3.2, 0.12, 2]} /></mesh>
          <mesh position={[1.2, 0.35, 0.9]} rotation={[0.2, 0.8, 0.3]} material={mats.sujo}><boxGeometry args={[2.4, 0.7, 1.6]} /></mesh>
          <mesh position={[-1.4, 0.3, -0.6]} rotation={[0.1, -0.5, -0.2]} material={mats.metal}><boxGeometry args={[1.6, 0.5, 1.2]} /></mesh>
        </>
      ) : (
        <>
          {/* o cano desce de debaixo da pista, entorta e pinga num tambor */}
          <mesh position={[0, 9, 0]} material={mats.metal}><cylinderGeometry args={[0.35, 0.35, 14, 8]} /></mesh>
          <mesh position={[0.6, 2.1, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}><cylinderGeometry args={[0.3, 0.3, 1.4, 8]} /></mesh>
          <mesh position={[1.3, 0.6, 0]} material={mats.sujo}><cylinderGeometry args={[0.7, 0.6, 1.2, 10]} /></mesh>
          <mesh position={[1.3, 1.6, 0]} material={mats.agua}><sphereGeometry args={[0.12, 6, 4]} /></mesh>
        </>
      )}
      <mesh position={[0, 70, 0]} material={mats.farol}><cylinderGeometry args={[2.4, 3.6, 140, 10, 1, true]} /></mesh>
    </group>
  )
}

export function LugaresChao({ chao, alvo }: { chao: (x: number, z: number) => number; alvo: LugarChao | null }) {
  return (
    <>
      {CHAO_FIXOS.map((id) => <Fachada key={id} id={id} chao={chao} alvo={alvo === id} />)}
      {(alvo === "painel" || alvo === "goteira") && <Achado key={alvo} id={alvo} chao={chao} />}
    </>
  )
}
