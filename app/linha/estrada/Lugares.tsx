"use client"

// Os lugares na estrada (lugares.ts): a fachada com o letreiro em neon, a
// calçada até a pista, a VAGA pintada na beira (onde você encosta devagar
// pra cena começar) e quem está esperando na porta. A cor do lugar é a da
// estação de quem mora lá; a cor pessoal fica no detalhe (porta, toldo).

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { LUGARES, VAGA, type Lugar, type LugarId } from "../lugares"
import type { Mundo } from "./mundo"
import { MEIA, PASSO, pontoI } from "./pista"
import { texTexto } from "./geo"

const FRENTE = MEIA + 9 // a fachada fica a isso do eixo da pista
const FUNDO = 10 // profundidade do prédio

export interface PoseLugar {
  via: number
  u: number
  lado: 1 | -1
  chao: number // altura da pista ali
  centro: THREE.Vector3 // o meio da fachada, no chão
  rumo: number // rotação y da pista
  porta: THREE.Vector3
  vaga: THREE.Vector3 // o meio da vaga, na beira da pista
  cam: THREE.Vector3 // de onde a câmera de cinema olha
}

// onde um lugar fica no mundo (o mesmo cálculo pra fachada, vaga e câmera)
export function poseLugar(M: Mundo, l: Lugar): PoseLugar {
  const via = M.circuito[l.area]
  const C = M.vias[via]
  const i = ((Math.round(l.u / PASSO) % C.n) + C.n) % C.n
  const chao = C.py[i]
  const rumo = Math.atan2(C.tx[i], C.tz[i])
  const centro = pontoI(C, i, l.lado * (FRENTE + FUNDO / 2), 0, new THREE.Vector3())
  const porta = pontoI(C, i, l.lado * (FRENTE - 1.2), 2.6, new THREE.Vector3())
  const vaga = pontoI(C, i, l.lado * (MEIA - 1.8), 0, new THREE.Vector3())
  // a câmera: do outro lado da pista, um pouco antes, na altura dos olhos
  const j = ((i - Math.round(17 / PASSO)) % C.n + C.n) % C.n
  const cam = pontoI(C, j, -l.lado * 5.5, 3.4, new THREE.Vector3())
  return { via, u: l.u, lado: l.lado, chao, centro, rumo, porta, vaga, cam }
}

function Pessoa({ cor, pos }: { cor: string; pos: [number, number, number] }) {
  const cab = useRef<THREE.Mesh>(null)
  const fase = pos[0] * 3.1 + pos[2] * 1.7
  useFrame((s) => { if (cab.current) cab.current.position.y = 1.62 + Math.sin(s.clock.elapsedTime * 1.4 + fase) * 0.015 })
  return (
    <group position={pos}>
      <mesh position={[0, 0.95, 0]}>
        <capsuleGeometry args={[0.24, 0.85, 6, 12]} />
        <meshStandardMaterial color="#14152a" emissive={cor} emissiveIntensity={0.18} roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, 0.2]}>
        <boxGeometry args={[0.36, 0.04, 0.02]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      <mesh ref={cab} position={[0, 1.62, 0]}>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshStandardMaterial color="#c99b76" emissive="#3a2418" emissiveIntensity={0.5} roughness={0.6} />
      </mesh>
    </group>
  )
}

function Fachada({ l, p, alvo, emCena }: { l: Lugar; p: PoseLugar; alvo: boolean; emCena: boolean }) {
  const letreiro = useMemo(() => texTexto([{ txt: l.letreiro, tam: 150, cor: l.cor }], 1024, 220), [l])
  const vaga = useRef<THREE.MeshBasicMaterial>(null)
  const coluna = useRef<THREE.Mesh>(null)
  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (vaga.current) vaga.current.opacity = alvo ? 0.32 + Math.sin(t * 3) * 0.14 : 0.12
    if (coluna.current) coluna.current.visible = alvo && !emCena
  })
  const alto = p.chao + 12 - -12 // da água até 12 m acima da pista
  return (
    <group>
      {/* o prédio: sai da água/chão e passa 12 m da pista */}
      <group position={[p.centro.x, -12 + alto / 2, p.centro.z]} rotation-y={p.rumo}>
        <mesh>
          <boxGeometry args={[FUNDO, alto, 16]} />
          <meshStandardMaterial color="#1a1422" roughness={0.9} />
        </mesh>
      </group>
      {/* a frente, na altura da pista: vitrine, porta, toldo, letreiro */}
      <group position={[p.centro.x, p.chao, p.centro.z]} rotation-y={p.rumo + (l.lado > 0 ? Math.PI / 2 : -Math.PI / 2)}>
        <group position={[0, 0, FUNDO / 2 + 0.02]}>
          {/* vitrine: vidro escuro com a luz de dentro vazando, e divisórias */}
          <mesh position={[-2.2, 2, 0]}>
            <planeGeometry args={[8, 3.2]} />
            <meshStandardMaterial color="#07060c" emissive={l.cor} emissiveIntensity={emCena ? 0.42 : 0.3} roughness={0.15} metalness={0.4} />
          </mesh>
          {[-5.4, -3.2, -1.1, 1, 1.9].map((x) => (
            <mesh key={x} position={[x, 2, 0.03]}>
              <boxGeometry args={[0.12, 3.3, 0.06]} />
              <meshStandardMaterial color="#0d0b12" roughness={0.6} />
            </mesh>
          ))}
          <mesh position={[-2.2, 3.66, 0.03]}>
            <boxGeometry args={[8.2, 0.14, 0.08]} />
            <meshStandardMaterial color="#0d0b12" />
          </mesh>
          {/* o andar de cima: janelas, umas acesas */}
          {[-5, -2.5, 0, 2.5, 5].map((x, k) => (
            <mesh key={x} position={[x, 8.6 + (k % 2) * 0.05, 0.02]}>
              <planeGeometry args={[1.5, 1.8]} />
              <meshStandardMaterial color="#0a0910" emissive={k % 3 === 1 ? "#ffcf8a" : "#1a1830"} emissiveIntensity={k % 3 === 1 ? 0.7 : 0.25} />
            </mesh>
          ))}
          {/* frisos na cor de acento */}
          {[4.6, 7.4].map((y) => (
            <mesh key={y} position={[0, y, 0.04]}>
              <boxGeometry args={[16, 0.06, 0.06]} />
              <meshBasicMaterial color={l.acento} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[4.4, 1.5, 0]}>
            <planeGeometry args={[1.6, 3]} />
            <meshBasicMaterial color={l.acento} toneMapped={false} />
          </mesh>
          <mesh position={[0, 3.9, 0.7]} rotation-x={-0.35}>
            <boxGeometry args={[14, 0.12, 1.6]} />
            <meshStandardMaterial color={l.acento} emissive={l.acento} emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 6.4, 0.05]}>
            <planeGeometry args={[12, 2.6]} />
            <meshBasicMaterial map={letreiro} transparent toneMapped={false} depthWrite={false} />
          </mesh>
          {/* a luz da vitrine no chão da calçada */}
          <pointLight position={[0, 2.5, 2.5]} color={l.cor} intensity={emCena ? 34 : 20} distance={12} decay={2} />
        </group>
        {/* um poste na calçada, luz branca fria (contra o quente do lugar) */}
        <mesh position={[-6.5, 2.4, FUNDO / 2 + 7.2]}>
          <cylinderGeometry args={[0.07, 0.09, 4.8, 8]} />
          <meshStandardMaterial color="#20223a" />
        </mesh>
        <mesh position={[-6.5, 4.85, FUNDO / 2 + 7.2]}>
          <sphereGeometry args={[0.22, 12, 8]} />
          <meshBasicMaterial color="#dfe9ff" toneMapped={false} />
        </mesh>
        <pointLight position={[-6.5, 4.6, FUNDO / 2 + 7.2]} color="#cfe0ff" intensity={18} distance={11} decay={2} />
        {/* calçada até a pista */}
        <mesh position={[0, 0.06, FUNDO / 2 + 4.5]}>
          <boxGeometry args={[16, 0.12, 9]} />
          <meshStandardMaterial color="#1c1d2c" roughness={0.9} />
        </mesh>
        {/* quem espera na porta (a missão de lá está valendo, ou é a cena) */}
        {(alvo || emCena) && l.gente.map((g, k) => (
          <Pessoa key={g.quem} cor={g.cor} pos={[2.8 - k * 1.3, 0.12, FUNDO / 2 + 1.4 + (k % 2) * 0.5]} />
        ))}
      </group>
      {/* a vaga: um retângulo na beira da pista, do lado do lugar */}
      <Vaga p={p} cor={l.cor} materialRef={vaga} />
      {/* coluna de luz em cima da vaga quando é ali que a missão manda */}
      <mesh ref={coluna} position={[p.vaga.x, p.vaga.y + 22, p.vaga.z]} visible={false}>
        <cylinderGeometry args={[0.9, 0.9, 44, 12, 1, true]} />
        <meshBasicMaterial color={l.cor} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function Vaga({ p, cor, materialRef }: { p: PoseLugar; cor: string; materialRef: React.RefObject<THREE.MeshBasicMaterial | null> }) {
  return (
    <mesh position={[p.vaga.x, p.vaga.y + 0.05, p.vaga.z]} rotation={[-Math.PI / 2, 0, p.rumo]}>
      <planeGeometry args={[3.2, VAGA]} />
      <meshBasicMaterial ref={materialRef} color={cor} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

export function Lugares({ M, alvo, emCena }: { M: Mundo; alvo: LugarId | null; emCena: LugarId | null }) {
  const poses = useMemo(() => Object.values(LUGARES).map((l) => ({ l, p: poseLugar(M, l) })), [M])
  return (
    <group>
      {poses.map(({ l, p }) => <Fachada key={l.id} l={l} p={p} alvo={alvo === l.id} emCena={emCena === l.id} />)}
    </group>
  )
}
