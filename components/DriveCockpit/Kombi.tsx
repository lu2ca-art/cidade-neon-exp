"use client"

// Kombi Hippie completa — renderiza TODAS as peças do KOMBI_LAYOUT (interior +
// exterior) como cubos simples posicionados EXATAMENTE nas coordenadas que
// LU2CA aprovou no /kombi-editor.
//
// Este componente é agnóstico ao mode (1ª/3ª pessoa) — quem usa decide o que
// renderizar via props (hideInterior/hideExterior). Ex.: em 3ª pessoa o
// consumidor pode manter só exterior; em 1ª pessoa mostra tudo.

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"
import { KOMBI_LAYOUT, type KombiPart } from "@/lib/kombi-layout"

// ─── Primitiva genérica: cubo posicionado + colorido ────────────────────────
function PartMesh({
  part,
  doubleSide = false,
}: {
  part: KombiPart
  castShadow?: boolean  // ignorado — shadows off pra perf
  doubleSide?: boolean
}) {
  return (
    <mesh position={part.position} rotation={part.rotation}>
      <boxGeometry args={part.size} />
      <meshStandardMaterial
        color={part.color}
        roughness={0.6}
        metalness={0.15}
        side={doubleSide ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  )
}

// Peças com emissive (faróis, lanternas, guirlandas — brilham)
function PartGlow({ part, intensity = 0.9 }: { part: KombiPart; intensity?: number }) {
  return (
    <mesh position={part.position} rotation={part.rotation}>
      <boxGeometry args={part.size} />
      <meshStandardMaterial color={part.color} emissive={part.color} emissiveIntensity={intensity} />
    </mesh>
  )
}

// Peças transparentes (janelas, parabrisa)
function PartGlass({ part }: { part: KombiPart }) {
  return (
    <mesh position={part.position} rotation={part.rotation}>
      <boxGeometry args={part.size} />
      <meshPhysicalMaterial
        color={part.color}
        transparent
        opacity={0.15}
        roughness={0.05}
        metalness={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Roda cilíndrica. `spinSpeedRef` é ref (não prop numérica) — assim o Kombi
// pode receber a velocidade sem re-render por frame.
function Wheel({ part, spinSpeedRef }: { part: KombiPart; spinSpeedRef?: React.MutableRefObject<number> }) {
  const rollRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (rollRef.current) {
      const spin = spinSpeedRef?.current ?? 0
      rollRef.current.rotation.x += spin * delta
    }
  })
  return (
    <group position={part.position} rotation={part.rotation}>
      {/* Group intermediário que rola (rotation.x) */}
      <group ref={rollRef}>
        {/* Cilindro deitado ao longo do eixo X do carro (rotation Z=90°) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[part.size[1] / 2, part.size[1] / 2, part.size[0], 20]} />
          <meshStandardMaterial color={part.color} roughness={0.9} metalness={0.1} />
        </mesh>
        {/* Aros neon nas duas laterais (rings no plano YZ) */}
        <mesh position={[part.size[0] / 2 + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <ringGeometry args={[part.size[1] * 0.25, part.size[1] * 0.42, 20]} />
          <meshBasicMaterial color="#00ffff" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-part.size[0] / 2 - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <ringGeometry args={[part.size[1] * 0.25, part.size[1] * 0.42, 20]} />
          <meshBasicMaterial color="#ff00ff" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Raios internos (radial) — dá sensação de girar */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[part.size[0] / 2 + 0.002, 0, 0]}
            rotation={[0, Math.PI / 2, (i / 5) * Math.PI * 2]}
          >
            <boxGeometry args={[0.005, part.size[1] * 0.35, 0.003]} />
            <meshStandardMaterial color="#c0c0c8" metalness={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// Volante: aro fino cromado + spokes + buzina com flor (mesma lógica anterior)
function Volante({ part, steerValue = 0 }: { part: KombiPart; steerValue?: number }) {
  const R = part.size[0] * 0.9
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -steerValue * 0.6
  })
  return (
    <group position={part.position} rotation={part.rotation}>
      <group ref={ref}>
        <mesh>
          <torusGeometry args={[R / 2, 0.012, 14, 48]} />
          <meshStandardMaterial color={part.color} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* aro colorido acompanhando */}
        <mesh>
          <torusGeometry args={[R / 2 + 0.014, 0.006, 8, 48]} />
          <meshStandardMaterial color="#ff5fae" emissive="#ff5fae" emissiveIntensity={0.6} />
        </mesh>
        {[Math.PI / 2, -Math.PI / 6, Math.PI * 7 / 6].map((angle, i) => (
          <mesh key={i} rotation={[0, 0, angle - Math.PI / 2]}>
            <boxGeometry args={[0.008, R / 2 - 0.03, 0.008]} />
            <meshStandardMaterial color="#d0d0d8" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
        {/* Buzina + flor */}
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
          <meshStandardMaterial color="#c9a97a" roughness={0.6} metalness={0.2} />
        </mesh>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI * 2]} position={[0, 0, 0.014]}>
            <planeGeometry args={[0.035, 0.055]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#ff5fae" : "#ffcc00"} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.018]}>
          <cylinderGeometry args={[0.014, 0.014, 0.003, 12]} />
          <meshStandardMaterial color="#22ff88" emissive="#22ff88" emissiveIntensity={0.7} />
        </mesh>
      </group>
    </group>
  )
}

// Toca-discos: base retangular + prato DEITADO com disco visível de cima
// girando em torno do próprio eixo Y (vertical). Cilindro fica com eixo em
// Y (padrão), rotação Y do plateRef = disco gira.
function TocaDiscos({ part, isPlaying = false }: { part: KombiPart; isPlaying?: boolean }) {
  const plateRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (plateRef.current && isPlaying) plateRef.current.rotation.y += delta * 3.5
  })
  const [W, H, D] = part.size
  const R = Math.min(W, D) * 0.42
  return (
    <group position={part.position} rotation={part.rotation}>
      {/* Base da caixa (deitada) */}
      <mesh>
        <boxGeometry args={part.size} />
        <meshStandardMaterial color={part.color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Prato deitado — cilindro com eixo em Y, gira no próprio Y */}
      <group ref={plateRef} position={[0, H / 2 + 0.005, 0]}>
        {/* prato preto fino */}
        <mesh>
          <cylinderGeometry args={[R, R, 0.006, 40]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
        </mesh>
        {/* sulcos do disco (face de cima) */}
        <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[R * 0.42, R * 0.95, 40]} />
          <meshBasicMaterial color="#1a1a1a" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* label rosa do disco */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[R * 0.4, 24]} />
          <meshBasicMaterial color="#ff5fae" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* eixo central metálico */}
        <mesh position={[0, 0.007, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.008, 8]} />
          <meshStandardMaterial color="#c0c0c8" metalness={0.9} />
        </mesh>
      </group>
      {/* Braço da agulha (haste + base fixa no canto) */}
      <group position={[W * 0.4, H / 2 + 0.005, -D * 0.35]}>
        <mesh>
          <cylinderGeometry args={[0.01, 0.01, 0.015, 12]} />
          <meshStandardMaterial color="#c0c0c8" metalness={0.9} />
        </mesh>
        <mesh position={[-W * 0.3, 0.008, W * 0.25]} rotation={[0, -Math.PI / 5, 0]}>
          <boxGeometry args={[W * 0.75, 0.006, 0.006]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.85} />
        </mesh>
      </group>
      {/* LED play */}
      <mesh position={[-W * 0.4, H / 2 + 0.006, -D * 0.35]}>
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshBasicMaterial color={isPlaying ? "#00ff88" : "#332222"} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Pads MPC: 4x4 quadrados coloridos piscando
function PadsMPC({ part, isPlaying = false }: { part: KombiPart; isPlaying?: boolean }) {
  const [W, H, D] = part.size
  const padSize = (W - 0.04) / 4
  const gap = 0.008
  const COLORS = ["#ff2d78", "#ff6b35", "#ffcc00", "#00ff88", "#00ffff", "#cc00ff", "#ff00ff", "#ff5fae"]
  const beatRef = useRef(0)
  useFrame((state) => {
    beatRef.current = Math.floor(state.clock.elapsedTime * 4) % 16
  })
  return (
    <group position={part.position} rotation={part.rotation}>
      <mesh>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={part.color} metalness={0.4} roughness={0.5} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const x = (col - 1.5) * (padSize + gap)
        const z = (row - 1.5) * (padSize + gap)
        const cor = COLORS[i % COLORS.length]
        return (
          <mesh key={i} position={[x, H / 2 + 0.003, z]}>
            <boxGeometry args={[padSize, 0.008, padSize]} />
            <meshStandardMaterial color={cor} emissive={cor} emissiveIntensity={isPlaying ? 1.6 : 0.4} />
          </mesh>
        )
      })}
    </group>
  )
}

// Retrovisor + dado pendurado
function Retrovisor({ part }: { part: KombiPart }) {
  return (
    <group position={part.position} rotation={part.rotation}>
      <mesh>
        <boxGeometry args={part.size} />
        <meshStandardMaterial color={part.color} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, part.size[2] / 2 + 0.001]}>
        <planeGeometry args={[part.size[0] - 0.02, part.size[1] - 0.015]} />
        <meshBasicMaterial color="#88ddff" toneMapped={false} />
      </mesh>
      {/* corrente */}
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[0.003, 0.13, 0.003]} />
        <meshStandardMaterial color="#c9a97a" metalness={0.6} />
      </mesh>
      {/* dado rosa */}
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#ff5fae" roughness={0.7} />
      </mesh>
    </group>
  )
}

// Câmbio T-bar — pequeno detalhe no console central.
function Cambio({ part }: { part: KombiPart }) {
  const [W, H] = part.size
  return (
    <group position={part.position} rotation={part.rotation}>
      {/* Haste fina */}
      <mesh>
        <cylinderGeometry args={[W / 2.5, W / 2.5, H, 12]} />
        <meshStandardMaterial color={part.color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Bola pequena no topo (proporcional à haste, não maior) */}
      <mesh position={[0, H / 2 + W * 0.4, 0]}>
        <sphereGeometry args={[W * 0.6, 16, 16]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.4} metalness={0.4} />
      </mesh>
    </group>
  )
}

// Rádio sintonizador (visual do rádio 3D — placa+display)
function RadioSintonizador({ part, freq = "222.4", stationLabel = "CIDADE NEON", radioOn = true }: { part: KombiPart; freq?: string; stationLabel?: string; radioOn?: boolean }) {
  const [W, H] = part.size
  return (
    <group position={part.position} rotation={part.rotation}>
      {/* moldura marrom */}
      <mesh>
        <boxGeometry args={part.size} />
        <meshStandardMaterial color={part.color} roughness={0.7} metalness={0.15} />
      </mesh>
      {/* placa metálica bege */}
      <mesh position={[0, 0, part.size[2] / 2 + 0.001]}>
        <planeGeometry args={[W - 0.03, H - 0.02]} />
        <meshStandardMaterial color="#7a5a2a" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* display digital */}
      <mesh position={[0, 0.02, part.size[2] / 2 + 0.002]}>
        <planeGeometry args={[0.16, 0.06]} />
        <meshBasicMaterial color="#050510" toneMapped={false} />
      </mesh>
      {/* strip laranja topo / cyan base */}
      <mesh position={[0, H / 2 - 0.008, part.size[2] / 2 + 0.002]}>
        <boxGeometry args={[W - 0.03, 0.003, 0.001]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      <mesh position={[0, -H / 2 + 0.008, part.size[2] / 2 + 0.002]}>
        <boxGeometry args={[W - 0.03, 0.003, 0.001]} />
        <meshBasicMaterial color="#00e5ff" toneMapped={false} />
      </mesh>
      {/* 3 knobs à direita */}
      {[
        { y: 0.04, cor: radioOn ? "#22ff88" : "#331111" },
        { y: 0, cor: "#ff6b35" },
        { y: -0.04, cor: "#00e5ff" },
      ].map((k, i) => (
        <mesh key={i} position={[W / 2 - 0.03, k.y, part.size[2] / 2 + 0.003]}>
          <cylinderGeometry args={[0.014, 0.014, 0.005, 16]} />
          <meshStandardMaterial color={k.cor} emissive={k.cor} emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export interface KombiProps {
  isPlaying?: boolean
  steerValue?: number
  wheelSpinRef?: React.MutableRefObject<number>
  hideExterior?: boolean
  hideInterior?: boolean
  radioHub?: { freq?: string; stationLabel?: string; radioOn?: boolean }
  onItemClick?: (item: "radio" | "pads" | "toca" | "portaLuvas") => void
}

export function Kombi({
  isPlaying = false,
  steerValue = 0,
  wheelSpinRef,
  hideExterior = false,
  hideInterior = false,
  radioHub,
  onItemClick,
}: KombiProps) {
  const K = KOMBI_LAYOUT
  return (
    <>
      {/* ── EXTERIOR ── */}
      {!hideExterior && (
        <>
          {/* Carroceria/teto SEM DoubleSide (só face externa) — a parede
              interna vem de peças customizadas (portas, teto interno,
              parede traseira) que respeitam os vidros. */}
          <PartMesh part={K.carroceria} />
          <PartMesh part={K.capoDianteiro} />
          <PartMesh part={K.paraChoqueFrente} />
          <PartMesh part={K.paraChoqueTras} />
          <PartGlow part={K.farolEsq} />
          <PartGlow part={K.farolDir} />
          <PartGlow part={K.lanternaEsq} intensity={1.2} />
          <PartGlow part={K.lanternaDir} intensity={1.2} />
          <PartGlow part={K.emblemaFrontal} intensity={0.7} />
          <Wheel part={K.rodaFrenteEsq} spinSpeedRef={wheelSpinRef} />
          <Wheel part={K.rodaFrenteDir} spinSpeedRef={wheelSpinRef} />
          <Wheel part={K.rodaTrasEsq} spinSpeedRef={wheelSpinRef} />
          <Wheel part={K.rodaTrasDir} spinSpeedRef={wheelSpinRef} />
          <PartMesh part={K.tetoExterno} />
          <PartMesh part={K.faixaHippie} />
        </>
      )}

      {/* ── INTERIOR ── */}
      {!hideInterior && (
        <>
          {/* PAREDES INTERNAS opacas — SÓ nas áreas SEM vidro. Assim os vidros
              ficam de fato transparentes e não vejo o "exterior" pelas paredes. */}
          {/* Teto interno (bem abaixo do teto externo Y=1.45, abaixo do
              parabrisa Y=1.1 pra não bloquear vista frontal) */}
          <mesh position={[0, 1.38, 0.4]}>
            <boxGeometry args={[1.55, 0.02, 3.0]} />
            <meshStandardMaterial color="#3a2410" roughness={0.8} />
          </mesh>
          {/* Parede traseira interna (abaixo do vidro-tras Y<0.85) */}
          <mesh position={[0, 0.5, 1.78]}>
            <boxGeometry args={[1.55, 0.85, 0.02]} />
            <meshStandardMaterial color="#3a2410" roughness={0.7} />
          </mesh>
          {/* Painel esquerdo abaixo da janela (baixo, Y<0.8, X=-0.87 lado
              interno) e painel direito idem — cobre o "buraco" abaixo do
              vidro lateral onde antes se via o exterior pela parede da carroceria. */}
          <mesh position={[-0.87, 0.4, 0.5]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[2.8, 0.7, 0.02]} />
            <meshStandardMaterial color="#3a2410" roughness={0.7} />
          </mesh>
          <mesh position={[0.87, 0.4, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
            <boxGeometry args={[2.8, 0.7, 0.02]} />
            <meshStandardMaterial color="#3a2410" roughness={0.7} />
          </mesh>
          {/* Painel esquerdo ACIMA da janela (topo, Y>1.3) */}
          <mesh position={[-0.87, 1.35, 0.5]} rotation={[0, Math.PI / 2, 0]}>
            <boxGeometry args={[2.8, 0.1, 0.02]} />
            <meshStandardMaterial color="#3a2410" roughness={0.7} />
          </mesh>
          <mesh position={[0.87, 1.35, 0.5]} rotation={[0, -Math.PI / 2, 0]}>
            <boxGeometry args={[2.8, 0.1, 0.02]} />
            <meshStandardMaterial color="#3a2410" roughness={0.7} />
          </mesh>

          {/* vidros — depois das paredes pra render order ficar correto */}
          <PartGlass part={K.parabrisa} />
          <PartGlass part={K.vidroTras} />
          <PartGlass part={K.janelaEsq} />
          <PartGlass part={K.janelaDir} />
          {/* porta interna direita (LAYOUT — visualmente idêntica ao painel dir) */}
          <PartMesh part={K.portaDir} />
          {/* dashboard */}
          <PartMesh part={K.painel} />
          <Volante part={K.volante} steerValue={steerValue} />
          <Cambio part={K.cambio} />
          <group onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("radio") } : undefined}>
            <RadioSintonizador part={K.radio} {...radioHub} />
          </group>
          <group onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("toca") } : undefined}>
            <TocaDiscos part={K.tocaDiscos} isPlaying={isPlaying} />
          </group>
          <group onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("pads") } : undefined}>
            <PadsMPC part={K.padsMPC} isPlaying={isPlaying} />
          </group>
          <Retrovisor part={K.retrovisor} />
          {/* Porta-luvas clicável — abre inventário */}
          <group
            onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("portaLuvas") } : undefined}
          >
            <PartMesh part={K.portaLuvas} />
            {/* puxador metálico central */}
            <mesh position={[K.portaLuvas.position[0], K.portaLuvas.position[1] - 0.03, K.portaLuvas.position[2] + K.portaLuvas.size[2] / 2 + 0.005]}>
              <boxGeometry args={[0.08, 0.02, 0.015]} />
              <meshStandardMaterial color="#c0c0c8" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* LED indicador amarelo (aceso quando disponível) */}
            <mesh position={[K.portaLuvas.position[0] + K.portaLuvas.size[0] / 2 - 0.02, K.portaLuvas.position[1] + K.portaLuvas.size[1] / 2 - 0.02, K.portaLuvas.position[2] + K.portaLuvas.size[2] / 2 + 0.005]}>
              <sphereGeometry args={[0.008, 12, 12]} />
              <meshBasicMaterial color="#ffcc00" toneMapped={false} />
            </mesh>
          </group>
          {/* bancos */}
          <PartMesh part={K.bancoMotorista} />
          <PartMesh part={K.bancoPassageira} />
          <PartMesh part={K.pisoInterno} />
          {/* Cortinas removidas — estavam bloqueando a visão lateral e
              conflitando com as janelas transparentes. */}
          {/* guirlandas LED */}
          <PartGlow part={K.guirlandaFrente} intensity={1.4} />
          <PartGlow part={K.guirlandaTras} intensity={1.4} />
        </>
      )}
    </>
  )
}
