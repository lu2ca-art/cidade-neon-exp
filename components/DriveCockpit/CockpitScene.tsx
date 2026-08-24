"use client"

// Cena 3D completa do cockpit — interior do carro + cidade cyberpunk ao fundo,
// posicionada pelo LAYOUT do editor (lib/cockpit-layout.ts). Reutilizável em
// /drive-cockpit (demo) e /drive (jogo integrado).
//
// Todos os componentes precisam estar dentro de um <Canvas> R3F por fora.
// A câmera do Canvas deve usar COCKPIT_LAYOUT.camera.

import { useFrame } from "@react-three/fiber"
import { Text } from "@react-three/drei"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { COCKPIT_LAYOUT, type CockpitPart } from "@/lib/cockpit-layout"

const L = COCKPIT_LAYOUT

// ─── Cidade cyberpunk ao fundo ───────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function CityBackdrop({ scrollSpeed = 4 }: { scrollSpeed?: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const rand = useMemo(() => seededRandom(42), [])
  const buildings = useMemo(() => {
    const arr: {
      pos: [number, number, number]
      size: [number, number, number]
      color: string
      windows: number
    }[] = []
    const colors = ["#ff00ff", "#00ffff", "#ff2d78", "#cc00ff", "#ff6b35", "#ffcc00"]
    for (let i = 0; i < 80; i++) {
      const x = (rand() - 0.5) * 40
      const z = -10 - rand() * 60
      const h = 6 + rand() * 14
      const w = 1.5 + rand() * 2
      const c = colors[Math.floor(rand() * colors.length)]
      arr.push({
        pos: [x, h / 2 - 1, z],
        size: [w, h, w],
        color: c,
        windows: Math.floor(rand() * 3),
      })
    }
    return arr
  }, [rand])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.position.z += delta * scrollSpeed
    if (groupRef.current.position.z > 20) groupRef.current.position.z = -30
  })

  return (
    <group ref={groupRef}>
      {buildings.map((b, i) => (
        <group key={i} position={b.pos}>
          <mesh>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color="#050510" />
          </mesh>
          <mesh position={[0, b.size[1] * 0.25, b.size[2] / 2 + 0.02]}>
            <planeGeometry args={[b.size[0] * 0.7, b.size[1] * 0.15]} />
            <meshBasicMaterial color={b.color} toneMapped={false} />
          </mesh>
          {b.windows > 0 && (
            <mesh position={[0, -b.size[1] * 0.15, b.size[2] / 2 + 0.02]}>
              <planeGeometry args={[b.size[0] * 0.5, b.size[1] * 0.08]} />
              <meshBasicMaterial color={b.color} toneMapped={false} transparent opacity={0.6} />
            </mesh>
          )}
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, -30]}>
        <planeGeometry args={[60, 100]} />
        <meshStandardMaterial color="#0a0a1a" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  )
}

// ─── Peças individuais do LAYOUT ─────────────────────────────────────────────
function Parabrisa() {
  const p = L.parabrisa
  return (
    <group position={p.position} rotation={p.rotation}>
      {/* Vidro quase invisível — só um leve tint, deixa ver bem a estrada */}
      <mesh>
        <planeGeometry args={[p.size[0], p.size[1]]} />
        <meshPhysicalMaterial
          color="#8899aa"
          transparent
          opacity={0.04}
          roughness={0.02}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, p.size[1] / 2 + 0.01, 0]}>
        <boxGeometry args={[p.size[0], 0.02, 0.02]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, -p.size[1] / 2 - 0.01, 0]}>
        <boxGeometry args={[p.size[0], 0.015, 0.015]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Carroceria interna (teto sólido, parede traseira, laterais) ─────────────
// Fecha a cabine "dando corpo" ao carro. Materiais dark-metallic com neons.
function CarroceriaInterna() {
  return (
    <>
      {/* Teto sólido — cobre atrás do teto panorâmico (Y=1.5, Z de 0 a 1.5) */}
      <mesh position={[0, 1.5, 0.6]}>
        <boxGeometry args={[1.5, 0.03, 1.7]} />
        <meshStandardMaterial color="#0a0518" roughness={0.7} metalness={0.4} />
      </mesh>
      {/* Parede traseira (atrás dos bancos) */}
      <mesh position={[0, 0.85, 1.9]}>
        <boxGeometry args={[1.5, 1.7, 0.05]} />
        <meshStandardMaterial color="#0a0518" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Vidro traseiro pequeno (deixar ver o rastro de luz) */}
      <mesh position={[0, 1.1, 1.925]}>
        <planeGeometry args={[1.1, 0.4]} />
        <meshPhysicalMaterial color="#8899aa" transparent opacity={0.08} roughness={0.05} />
      </mesh>
      {/* Laterais superiores (entre teto e porta, altura entre parabrisa e teto) */}
      <mesh position={[-0.76, 1.15, 0.6]}>
        <boxGeometry args={[0.02, 0.4, 1.8]} />
        <meshStandardMaterial color="#0a0518" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0.76, 1.15, 0.6]}>
        <boxGeometry args={[0.02, 0.4, 1.8]} />
        <meshStandardMaterial color="#0a0518" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Frisos LED no interior do teto (magenta esquerda / cyan direita) */}
      <mesh position={[-0.7, 1.485, 0.6]}>
        <boxGeometry args={[0.005, 0.005, 1.7]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      <mesh position={[0.7, 1.485, 0.6]}>
        <boxGeometry args={[0.005, 0.005, 1.7]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
    </>
  )
}

// Painel bege Kombi — amplo, curvo, com detalhes hippie (knobs vintage,
// adesivos florais). Bege claro dominante, detalhes marrom/laranja neon.
function Painel() {
  const p = L.painel
  const W = p.size[0] * 1.15  // um pouco mais largo
  const H = p.size[1] * 1.2
  const D = p.size[2] * 1.1
  return (
    <group position={p.position} rotation={p.rotation}>
      {/* base bege principal */}
      <mesh>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial
          color="#c9a97a"
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>
      {/* borda superior arredondada (aparência mais orgânica) */}
      <mesh position={[0, H / 2 + 0.015, 0]}>
        <boxGeometry args={[W, 0.03, D * 0.95]} />
        <meshStandardMaterial color="#8a6a3a" roughness={0.6} />
      </mesh>
      {/* strip LED laranja no topo (aesthetic hippie neon) */}
      <mesh position={[0, H / 2 + 0.03, D / 2 - 0.02]}>
        <boxGeometry args={[W - 0.02, 0.008, 0.008]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      {/* strip LED magenta embaixo */}
      <mesh position={[0, -H / 2 - 0.005, D / 2]}>
        <boxGeometry args={[W - 0.02, 0.006, 0.006]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      {/* 3 knobs vintage grandes (visual — não interativos ainda) */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <group key={i} position={[x, H / 2 + 0.015, D / 2 - 0.02]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, 0.025, 20]} />
            <meshStandardMaterial color="#3a2410" metalness={0.4} roughness={0.5} />
          </mesh>
          {/* ponto branco indicador (linha) */}
          <mesh position={[0, 0.014, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.003, 0.02, 0.003]} />
            <meshStandardMaterial color="#f5e4c0" emissive="#ffcc00" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      {/* Adesivo flor grande no canto direito do painel */}
      <mesh position={[W / 2 - 0.15, 0, D / 2 + 0.001]}>
        <circleGeometry args={[0.05, 8]} />
        <meshBasicMaterial color="#ff5fae" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[W / 2 - 0.15, 0, D / 2 + 0.002]}>
        <circleGeometry args={[0.02, 8]} />
        <meshBasicMaterial color="#ffcc00" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Volante hippie — aro fino cromado estilo Kombi anos 70, spokes finos,
// buzina central com flor colorida. Bem maior que o original pra ficar
// dominante no cockpit.
function Volante({ steerValue = 0 }: { steerValue?: number }) {
  const v = L.volante
  const ref = useRef<THREE.Group>(null)
  const R = v.size[0] * 0.9  // aro grande
  useFrame(() => {
    if (ref.current) ref.current.rotation.z = -steerValue * 0.6
  })
  return (
    <group position={v.position} rotation={v.rotation}>
      <group ref={ref}>
        {/* aro cromado fino (estilo Kombi vintage) */}
        <mesh>
          <torusGeometry args={[R, 0.012, 14, 48]} />
          <meshStandardMaterial color="#e8e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* aro externo colorido acompanhando */}
        <mesh>
          <torusGeometry args={[R + 0.014, 0.006, 8, 48]} />
          <meshStandardMaterial color={v.color} emissive={v.color} emissiveIntensity={0.6} />
        </mesh>
        {/* 3 spokes finos radiais */}
        {[Math.PI / 2, -Math.PI / 6, Math.PI * 7 / 6].map((angle, i) => (
          <mesh key={i} rotation={[0, 0, angle - Math.PI / 2]}>
            <boxGeometry args={[0.008, R - 0.03, 0.008]} />
            <meshStandardMaterial color="#d0d0d8" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
        {/* buzina central com flor colorida hippie */}
        <mesh>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
          <meshStandardMaterial color="#c9a97a" roughness={0.6} metalness={0.2} />
        </mesh>
        {/* pétalas de flor (6 planos rotacionados) */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI * 2]} position={[0, 0, 0.014]}>
            <planeGeometry args={[0.035, 0.055]} />
            <meshBasicMaterial color={i % 2 === 0 ? "#ff5fae" : "#ffcc00"} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* miolo verde */}
        <mesh position={[0, 0, 0.018]}>
          <cylinderGeometry args={[0.014, 0.014, 0.003, 12]} />
          <meshStandardMaterial color="#22ff88" emissive="#22ff88" emissiveIntensity={0.7} />
        </mesh>
      </group>
    </group>
  )
}

// Retrovisor Kombi hippie — moldura bege + espelho azul-cyan + dado de
// pelúcia rosa pendurado por corrente.
function Retrovisor() {
  const r = L.retrovisor
  return (
    <group position={r.position} rotation={r.rotation}>
      {/* moldura bege */}
      <mesh>
        <boxGeometry args={r.size} />
        <meshStandardMaterial color="#8a6a3a" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* espelho cyan */}
      <mesh position={[0, 0, r.size[2] / 2 + 0.001]}>
        <planeGeometry args={[r.size[0] - 0.02, r.size[1] - 0.015]} />
        <meshBasicMaterial color="#88ddff" toneMapped={false} />
      </mesh>
      {/* corrente/cordinha */}
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[0.003, 0.13, 0.003]} />
        <meshStandardMaterial color="#c9a97a" metalness={0.6} />
      </mesh>
      {/* DADO DE PELÚCIA rosa pendurado */}
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#ff5fae" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* pontos brancos do dado (2 faces visíveis) */}
      {[[-0.015, -0.15, 0.031], [0.015, -0.15, 0.031], [-0.015, -0.18, 0.031], [0.015, -0.18, 0.031], [0.031, -0.16, -0.005], [0.031, -0.19, 0.005], [0.031, -0.17, 0.015]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]}>
          <sphereGeometry args={[0.004, 6, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {/* cordinha superior (pega no retrovisor) */}
      <mesh position={[0, r.size[1] / 2 + 0.075, 0]}>
        <boxGeometry args={[0.004, 0.15, 0.004]} />
        <meshStandardMaterial color="#8a6a3a" />
      </mesh>
    </group>
  )
}

// Display consolidado: rádio + hub + mapa. Conteúdo dividido em 3 zonas.
// Props opcionais permitem sobrescrever o conteúdo dinamicamente pelo /drive
// (que já tem estação real / apps do hub / posição no mapa).
export interface RadioHubProps {
  freq?: string
  stationLabel?: string
  stationColor?: string
  dialPct?: number
  radioOn?: boolean
}

// Rádio sintonizador vintage — substitui a antiga "tela plana" por um rádio
// analógico estilo Kombi anos 70: moldura marrom escura, dial semicircular
// com marcações de frequência, ponteiro dourado, 3 knobs (power/volume/dial),
// LEDs neon indicando estações aceitas.
//
// Props opcionais permitem sobrescrever conteúdo:
// - `freq` = frequência atual (string mostrada no display)
// - `stationLabel` = nome da estação
// - `stationColor` = cor do neon da estação atual
// - `dialPct` = 0..1 posição do ponteiro (0=69.9 MHz, 1=222.4 MHz)
// - `radioOn` = liga LED do power
function RadioHub({ freq = "222.4", stationLabel = "CIDADE NEON", stationColor, dialPct = 1.0, radioOn = true }: RadioHubProps) {
  const r = L.radioHub
  const accent = stationColor ?? "#ff6b35"
  const W = r.size[0]
  const H = r.size[1]
  // Ponteiro do dial: gira de -60° (esquerda) a +60° (direita) baseado em dialPct
  const pointerAngle = -Math.PI / 3 + dialPct * (2 * Math.PI / 3)
  return (
    <group position={r.position} rotation={r.rotation}>
      {/* Moldura principal (marrom escura) */}
      <mesh>
        <boxGeometry args={[W, H, 0.025]} />
        <meshStandardMaterial color="#3a2410" roughness={0.7} metalness={0.15} />
      </mesh>
      {/* Placa metálica interna (bege escuro) */}
      <mesh position={[0, 0, 0.014]}>
        <boxGeometry args={[W - 0.02, H - 0.02, 0.002]} />
        <meshStandardMaterial color="#7a5a2a" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* Bordas neon horizontais (topo laranja / base cyan) */}
      <mesh position={[0, H / 2 - 0.006, 0.017]}>
        <boxGeometry args={[W - 0.03, 0.004, 0.001]} />
        <meshBasicMaterial color="#ff6b35" toneMapped={false} />
      </mesh>
      <mesh position={[0, -H / 2 + 0.006, 0.017]}>
        <boxGeometry args={[W - 0.03, 0.004, 0.001]} />
        <meshBasicMaterial color="#00e5ff" toneMapped={false} />
      </mesh>

      {/* ── DIAL semicircular (ocupa o lado esquerdo da moldura) ── */}
      <group position={[-W / 4, 0.005, 0.016]}>
        {/* fundo escuro do dial (semicírculo) */}
        <mesh>
          <circleGeometry args={[0.09, 32, 0, Math.PI]} />
          <meshBasicMaterial color="#050510" toneMapped={false} />
        </mesh>
        {/* moldura cromada do dial */}
        <mesh>
          <ringGeometry args={[0.085, 0.095, 32, 1, 0, Math.PI]} />
          <meshStandardMaterial color="#c0c0c8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* marcações de frequência (11 tick marks) */}
        {Array.from({ length: 11 }).map((_, i) => {
          const t = i / 10
          const a = -Math.PI / 3 + t * (2 * Math.PI / 3)
          const r1 = 0.06
          const r2 = 0.075
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * ((r1 + r2) / 2), Math.cos(a) * ((r1 + r2) / 2), 0.001]}
              rotation={[0, 0, -a]}
            >
              <boxGeometry args={[0.003, r2 - r1, 0.001]} />
              <meshBasicMaterial color={i % 2 === 0 ? "#ff6b35" : "#c9a97a"} toneMapped={false} />
            </mesh>
          )
        })}
        {/* PONTEIRO (dourado, aponta pra posição atual) */}
        <mesh position={[0, 0, 0.002]} rotation={[0, 0, -pointerAngle]}>
          <boxGeometry args={[0.004, 0.07, 0.002]} />
          <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.8} />
        </mesh>
        {/* pivô central */}
        <mesh position={[0, 0, 0.003]}>
          <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
          <meshStandardMaterial color="#e0e0e8" metalness={0.9} />
        </mesh>
        {/* label "MHz" */}
        <Text position={[0, -0.008, 0.005]} fontSize={0.011} color="#c9a97a" anchorX="center">
          MHz
        </Text>
      </group>

      {/* ── Display digital central com frequência + estação ── */}
      <group position={[0.05, 0.02, 0.016]}>
        {/* fundo do display (preto) */}
        <mesh>
          <planeGeometry args={[0.16, 0.06]} />
          <meshBasicMaterial color="#050510" toneMapped={false} />
        </mesh>
        {/* moldura */}
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[0.17, 0.07]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        {/* Frequência (grande) */}
        <Text position={[0, 0.01, 0.001]} fontSize={0.028} color={accent} anchorX="center" anchorY="middle">
          {freq}
        </Text>
        {/* Nome estação (pequeno) */}
        <Text position={[0, -0.02, 0.001]} fontSize={0.012} color="#f5e4c0" anchorX="center">
          {stationLabel}
        </Text>
      </group>

      {/* ── 3 knobs no lado direito (power / volume / sintonia) ── */}
      {[
        { y: 0.06, cor: radioOn ? "#22ff88" : "#331111", label: "PWR" },
        { y: 0.0, cor: "#ff6b35", label: "VOL" },
        { y: -0.06, cor: accent, label: "SYN" },
      ].map((k, i) => (
        <group key={i} position={[W / 2 - 0.04, k.y, 0.016]}>
          {/* base do knob (marrom) */}
          <mesh>
            <cylinderGeometry args={[0.022, 0.022, 0.018, 16]} />
            <meshStandardMaterial color="#3a2410" roughness={0.5} metalness={0.3} />
          </mesh>
          {/* topo colorido (LED) */}
          <mesh position={[0, 0.011, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.004, 16]} />
            <meshStandardMaterial color={k.cor} emissive={k.cor} emissiveIntensity={i === 0 && !radioOn ? 0 : 0.7} />
          </mesh>
          {/* label */}
          <Text position={[0, -0.03, 0]} fontSize={0.008} color="#c9a97a" anchorX="center">
            {k.label}
          </Text>
        </group>
      ))}

      {/* ── LEDs indicando estações aceitas (5 luzes coloridas no rodapé) ── */}
      <group position={[-W / 4, -H / 2 + 0.03, 0.016]}>
        {[
          { x: 0, cor: "#ff2d78", label: "69.9" },
          { x: 0.03, cor: "#3b82f6", label: "88.7" },
          { x: 0.06, cor: "#a855f7", label: "111.3" },
          { x: 0.09, cor: "#22ff88", label: "222.4" },
        ].map((s, i) => (
          <group key={i} position={[s.x - 0.045, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.005, 8, 8]} />
              <meshBasicMaterial color={s.cor} toneMapped={false} />
            </mesh>
            <Text position={[0, -0.012, 0]} fontSize={0.006} color="#c9a97a" anchorX="center">
              {s.label}
            </Text>
          </group>
        ))}
      </group>
    </group>
  )
}

function VelocRPM({ speed = 0, isPlaying = false }: { speed?: number; isPlaying?: boolean }) {
  const v = L.velocRpm
  const bpmNorm = isPlaying ? 0.72 : 0.06
  return (
    <group position={v.position} rotation={v.rotation}>
      <mesh>
        <boxGeometry args={v.size} />
        <meshStandardMaterial color="#0a0a12" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, v.size[2] / 2 + 0.001]}>
        <planeGeometry args={[v.size[0] - 0.015, v.size[1] - 0.015]} />
        <meshBasicMaterial color="#050510" toneMapped={false} />
      </mesh>
      <group position={[-v.size[0] / 4, 0, v.size[2] / 2 + 0.003]}>
        <Text position={[0, 0.045, 0]} fontSize={0.015} color="#ff2d78" anchorX="center">
          VEL
        </Text>
        <Text position={[0, 0.01, 0]} fontSize={0.03} color="#ffffff" anchorX="center">
          {Math.floor(speed * 220).toString()}
        </Text>
        <Text position={[0, -0.03, 0]} fontSize={0.012} color="#aaa" anchorX="center">
          km/h
        </Text>
      </group>
      <group position={[v.size[0] / 4, 0, v.size[2] / 2 + 0.003]}>
        <Text position={[0, 0.045, 0]} fontSize={0.015} color="#00ffff" anchorX="center">
          RPM
        </Text>
        <Text position={[0, 0.01, 0]} fontSize={0.03} color="#ffffff" anchorX="center">
          {Math.floor(bpmNorm * 7000 + 800).toString()}
        </Text>
        <Text position={[0, -0.03, 0]} fontSize={0.012} color="#aaa" anchorX="center">
          rpm
        </Text>
      </group>
    </group>
  )
}

// Toca-discos vintage estilo Kombi hippie — base de madeira retangular,
// prato preto grande, disco colorido girando, braço com agulha visível,
// LED verde de play. Foi movido pro painel esquerdo (LAYOUT atualizado)
// então fica visível pro motorista.
function TocaDiscos({ isPlaying = false }: { isPlaying?: boolean }) {
  const t = L.tocaDiscos
  const plateRef = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (plateRef.current && isPlaying) plateRef.current.rotation.y += delta * 3.5
  })
  const [W, H, D] = t.size
  return (
    <group position={t.position} rotation={t.rotation}>
      {/* Base de madeira (retangular) */}
      <mesh castShadow>
        <boxGeometry args={[W * 1.1, H, D * 1.1]} />
        <meshStandardMaterial color="#6a4820" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* moldura marrom mais escura em cima */}
      <mesh position={[0, H / 2 + 0.002, 0]}>
        <boxGeometry args={[W * 1.1, 0.005, D * 1.1]} />
        <meshStandardMaterial color="#3a2410" roughness={0.6} />
      </mesh>
      {/* Prato preto grande */}
      <group ref={plateRef} position={[0, H / 2 + 0.005, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[Math.min(W, D) * 0.45, Math.min(W, D) * 0.45, 0.006, 40]} />
          <meshStandardMaterial color="#0a0a0a" roughness={0.5} />
        </mesh>
        {/* sulcos do disco (anéis) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.004]}>
          <ringGeometry args={[Math.min(W, D) * 0.18, Math.min(W, D) * 0.42, 40]} />
          <meshBasicMaterial color="#1a1a1a" toneMapped={false} />
        </mesh>
        {/* label do disco (colorido) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.005]}>
          <circleGeometry args={[Math.min(W, D) * 0.17, 24]} />
          <meshBasicMaterial color={t.color} toneMapped={false} />
        </mesh>
        {/* eixo central */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.008]}>
          <cylinderGeometry args={[0.005, 0.005, 0.01, 8]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} />
        </mesh>
      </group>
      {/* Braço da agulha (2 partes: base + haste) */}
      <group position={[W * 0.45, H / 2 + 0.005, -D * 0.4]}>
        <mesh>
          <cylinderGeometry args={[0.012, 0.012, 0.02, 12]} />
          <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* haste apontando pro centro do disco */}
        <mesh position={[-0.06, 0.008, 0.05]} rotation={[0, -Math.PI / 6, 0]}>
          <boxGeometry args={[0.12, 0.008, 0.008]} />
          <meshStandardMaterial color="#e0e0e0" metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
      {/* LED play (verde quando tocando) */}
      <mesh position={[-W * 0.45, H / 2 + 0.005, D * 0.4]}>
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshBasicMaterial color={isPlaying ? "#00ff88" : "#332222"} toneMapped={false} />
      </mesh>
      {/* Rótulo pequeno "VINYL" */}
      <Text position={[0, H / 2 + 0.005, -D * 0.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.02} color="#f5e4c0" anchorX="center">
        VINYL
      </Text>
    </group>
  )
}

function PadsMPC({ isPlaying = false }: { isPlaying?: boolean }) {
  const p = L.padsMPC
  const [beat, setBeat] = useState(0)
  useEffect(() => {
    if (!isPlaying) return
    const t = setInterval(() => setBeat((b) => (b + 1) % 16), 250)
    return () => clearInterval(t)
  }, [isPlaying])

  const COLORS = ["#ff2d78", "#ff6b35", "#ffcc00", "#00ff88", "#00ffff", "#cc00ff", "#ff00ff", "#ff5fae"]
  const [w, h, d] = p.size
  const padSize = (w - 0.05) / 4
  const gap = 0.008

  return (
    <group position={p.position} rotation={p.rotation}>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#332200" metalness={0.5} roughness={0.4} />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const x = (col - 1.5) * (padSize + gap)
        const z = (row - 1.5) * (padSize + gap)
        const cor = COLORS[i % COLORS.length]
        const active = isPlaying && beat === i
        return (
          <mesh key={i} position={[x, h / 2 + 0.003, z]}>
            <boxGeometry args={[padSize, 0.008, padSize]} />
            <meshStandardMaterial
              color={cor}
              emissive={cor}
              emissiveIntensity={active ? 2.0 : 0.4}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        )
      })}
    </group>
  )
}

function Cambio() {
  const c = L.cambio
  return (
    <group position={c.position} rotation={c.rotation}>
      <mesh position={[0, -c.size[1] * 0.4, 0]}>
        <boxGeometry args={[c.size[0], c.size[1] * 0.15, c.size[2]]} />
        <meshStandardMaterial color="#12121e" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, -c.size[1] * 0.15, 0]}>
        <cylinderGeometry args={[0.012, 0.014, c.size[1] * 0.5, 16]} />
        <meshStandardMaterial color="#3a3a4a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, c.size[1] * 0.25, 0]}>
        <sphereGeometry args={[c.size[0] * 0.22, 24, 24]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.6} metalness={0.4} />
      </mesh>
    </group>
  )
}

function Piso() {
  const p = L.piso
  return (
    <group position={p.position} rotation={p.rotation}>
      <mesh>
        <boxGeometry args={p.size} />
        <meshStandardMaterial color="#0a1a1e" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, p.size[1] / 2 + 0.001, 0]}>
        <planeGeometry args={[0.02, p.size[2] - 0.1]} />
        <meshBasicMaterial color={p.color} toneMapped={false} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function Porta({ part }: { part: CockpitPart }) {
  return (
    <group position={part.position} rotation={part.rotation}>
      <mesh>
        <boxGeometry args={part.size} />
        <meshStandardMaterial color="#151530" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[part.size[0] > 0.02 ? 0 : part.size[0] / 2 + 0.002, 0, 0]}>
        <boxGeometry args={[part.size[0] + 0.001, 0.006, part.size[2] - 0.1]} />
        <meshBasicMaterial color={part.color} toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Teto panorâmico ─────────────────────────────────────────────────────────
function TetoPanoramico() {
  const t = L.tetoPanoramico
  return (
    <group position={t.position} rotation={t.rotation}>
      <mesh>
        <boxGeometry args={t.size} />
        <meshPhysicalMaterial
          color={t.color}
          transparent
          opacity={0.35}
          roughness={0.05}
          metalness={0.4}
        />
      </mesh>
      {/* Bordas neon magenta/cyan pra emoldurar o teto */}
      <mesh position={[0, 0, t.size[2] / 2]}>
        <boxGeometry args={[t.size[0], 0.008, 0.008]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -t.size[2] / 2]}>
        <boxGeometry args={[t.size[0], 0.008, 0.008]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
    </group>
  )
}

// ─── Janela lateral (vidro transparente cyan) ────────────────────────────────
function Janela({ part }: { part: CockpitPart }) {
  return (
    <group position={part.position} rotation={part.rotation}>
      <mesh>
        <planeGeometry args={[part.size[0], part.size[1]]} />
        <meshPhysicalMaterial
          color={part.color}
          transparent
          opacity={0.18}
          roughness={0.05}
          metalness={0.15}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* moldura neon no contorno */}
      <mesh position={[0, part.size[1] / 2 + 0.008, 0]}>
        <boxGeometry args={[part.size[0], 0.006, 0.006]} />
        <meshBasicMaterial color={part.color} toneMapped={false} />
      </mesh>
      <mesh position={[0, -part.size[1] / 2 - 0.008, 0]}>
        <boxGeometry args={[part.size[0], 0.006, 0.006]} />
        <meshBasicMaterial color={part.color} toneMapped={false} />
      </mesh>
    </group>
  )
}

function Banco({ part }: { part: CockpitPart }) {
  return (
    <group position={part.position} rotation={part.rotation}>
      <mesh>
        <boxGeometry args={part.size} />
        <meshStandardMaterial color={part.color} roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[0, part.size[1] / 2 + 0.32, part.size[2] / 2 - 0.05]}>
        <boxGeometry args={[part.size[0], 0.64, 0.12]} />
        <meshStandardMaterial color={part.color} roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[0, part.size[1] / 2 + 0.74, part.size[2] / 2 - 0.05]}>
        <boxGeometry args={[part.size[0] * 0.55, 0.16, 0.12]} />
        <meshStandardMaterial color={part.color} roughness={0.8} />
      </mesh>
    </group>
  )
}

// ─── Cabine fechada estilo Tuatara (envolvente low-poly) ────────────────────
// Extensões laterais do painel + console central em túnel + colunas A do
// parabrisa + painéis internos das portas em 2 tons com trim neon.
// Inspiração: renderings do interior do Tuatara (LU2CA mandou como ref).

function ExtensoesPainel() {
  // Painel curvado envolvente: mini "caixas" laterais que se estendem do
  // painel principal em direção ao motorista/passageiro, dando a sensação
  // de cabine fechada em vez de painel-cubo.
  return (
    <>
      <mesh position={[-0.55, 0.55, -0.7]}>
        <boxGeometry args={[0.3, 0.35, 0.4]} />
        <meshStandardMaterial color="#12121e" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0.55, 0.55, -0.7]}>
        <boxGeometry args={[0.3, 0.35, 0.4]} />
        <meshStandardMaterial color="#12121e" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* strip LED por dentro das extensões (encontra o painel) */}
      <mesh position={[-0.4, 0.73, -0.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.008, 0.006, 0.3]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      <mesh position={[0.4, 0.73, -0.5]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.008, 0.006, 0.3]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
    </>
  )
}

function ConsoleCentral() {
  // Túnel entre motorista e passageiro (o câmbio já está no meio; este
  // console adiciona o bloco extended que segue até os bancos).
  return (
    <group>
      <mesh position={[0, 0.25, 0.35]}>
        <boxGeometry args={[0.25, 0.4, 1.3]} />
        <meshStandardMaterial color="#0a0518" roughness={0.6} metalness={0.35} />
      </mesh>
      {/* linhas neon laterais no console (magenta esq, cyan dir) */}
      <mesh position={[-0.13, 0.42, 0.35]}>
        <boxGeometry args={[0.006, 0.02, 1.3]} />
        <meshBasicMaterial color="#ff00ff" toneMapped={false} />
      </mesh>
      <mesh position={[0.13, 0.42, 0.35]}>
        <boxGeometry args={[0.006, 0.02, 1.3]} />
        <meshBasicMaterial color="#00ffff" toneMapped={false} />
      </mesh>
      {/* topo do console — leve gloss */}
      <mesh position={[0, 0.451, 0.35]}>
        <boxGeometry args={[0.24, 0.005, 1.29]} />
        <meshStandardMaterial color="#1a0f24" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  )
}

function ColunasA() {
  // 2 colunas verticais do parabrisa até o teto. Cor escura, contorno neon
  // sutil pra emoldurar a visão da estrada.
  return (
    <>
      {/* esquerda */}
      <group position={[-0.7, 1.15, -0.95]}>
        <mesh>
          <boxGeometry args={[0.08, 1.2, 0.15]} />
          <meshStandardMaterial color="#0a0518" metalness={0.5} roughness={0.5} />
        </mesh>
        {/* strip neon na quina interna */}
        <mesh position={[0.045, 0, 0]}>
          <boxGeometry args={[0.005, 1.2, 0.005]} />
          <meshBasicMaterial color="#ff00ff" toneMapped={false} />
        </mesh>
      </group>
      {/* direita */}
      <group position={[0.7, 1.15, -0.95]}>
        <mesh>
          <boxGeometry args={[0.08, 1.2, 0.15]} />
          <meshStandardMaterial color="#0a0518" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[-0.045, 0, 0]}>
          <boxGeometry args={[0.005, 1.2, 0.005]} />
          <meshBasicMaterial color="#00ffff" toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}

function PainelPorta({ lado }: { lado: 1 | -1 }) {
  // Painel interno da porta em 2 tons (topo escuro-metálico + baixo preto)
  // com trim neon central. Renderiza SOBRE a porta fina do LAYOUT.
  const cor = lado > 0 ? "#00aaff" : "#00eeff"
  return (
    <group position={[0.73 * lado, 0.45, 0.3]}>
      {/* superior (bege escuro/roxeado — remete ao Tuatara) */}
      <mesh>
        <boxGeometry args={[0.025, 0.35, 1.8]} />
        <meshStandardMaterial color="#2a2540" roughness={0.6} metalness={0.2} />
      </mesh>
      {/* inferior (preto profundo) */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[0.025, 0.35, 1.8]} />
        <meshStandardMaterial color="#0a0a0f" roughness={0.7} />
      </mesh>
      {/* trim neon entre as duas metades */}
      <mesh position={[lado * -0.015, -0.175, 0]}>
        <boxGeometry args={[0.003, 0.014, 1.8]} />
        <meshBasicMaterial color={cor} toneMapped={false} />
      </mesh>
      {/* maçaneta simples (cilindro pequeno) */}
      <mesh position={[lado * -0.02, 0.05, -0.35]}>
        <boxGeometry args={[0.008, 0.04, 0.18]} />
        <meshStandardMaterial color="#c0c0c8" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  )
}

function CabineFechadaTuatara() {
  return (
    <>
      <ExtensoesPainel />
      <ConsoleCentral />
      <ColunasA />
      <PainelPorta lado={-1} />
      <PainelPorta lado={1} />
    </>
  )
}

// ─── Decorações Kombi Hippie (estilo Fillmore) ──────────────────────────────
// Guirlanda LED contornando o teto, cortinas franjadas nas janelas,
// adesivos peace/flor, plantinha suculenta, fitas cassete no console.
// Isso é o que faz o interior parecer uma Kombi de verdade.

function GuirlandaLED() {
  // 20 bolinhas coloridas espalhadas em retângulo ao redor do teto (Y=1.48)
  const COLORS = ["#ff00ff", "#00ffff", "#ffcc00", "#22ff88", "#ff5fae", "#ff6b35"]
  const perimeter: [number, number][] = []
  // frente
  for (let x = -0.65; x <= 0.65; x += 0.15) perimeter.push([x, -1.0])
  // direita
  for (let z = -0.9; z <= 0.9; z += 0.15) perimeter.push([0.72, z])
  // trás
  for (let x = 0.65; x >= -0.65; x -= 0.15) perimeter.push([x, 1.4])
  // esquerda
  for (let z = 0.9; z >= -0.9; z -= 0.15) perimeter.push([-0.72, z])
  return (
    <group>
      {perimeter.map(([x, z], i) => (
        <mesh key={i} position={[x, 1.48, z]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshBasicMaterial color={COLORS[i % COLORS.length]} toneMapped={false} />
        </mesh>
      ))}
      {/* fio conectando (linha fina que segue o perímetro) */}
      <mesh position={[0, 1.475, -1.0]}>
        <boxGeometry args={[1.5, 0.004, 0.004]} />
        <meshStandardMaterial color="#3a2410" />
      </mesh>
      <mesh position={[0, 1.475, 1.4]}>
        <boxGeometry args={[1.5, 0.004, 0.004]} />
        <meshStandardMaterial color="#3a2410" />
      </mesh>
      <mesh position={[0.72, 1.475, 0.2]}>
        <boxGeometry args={[0.004, 0.004, 2.5]} />
        <meshStandardMaterial color="#3a2410" />
      </mesh>
      <mesh position={[-0.72, 1.475, 0.2]}>
        <boxGeometry args={[0.004, 0.004, 2.5]} />
        <meshStandardMaterial color="#3a2410" />
      </mesh>
    </group>
  )
}

function CortinaFranjada({ lado }: { lado: 1 | -1 }) {
  // Cortina roxa/rosa em cima da janela lateral com franjas na borda inferior
  const cor1 = lado > 0 ? "#a855f7" : "#ff5fae"
  const cor2 = lado > 0 ? "#7c3aed" : "#c026d3"
  return (
    <group position={[0.72 * lado, 1.05, 0.4]} rotation={[0, lado > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
      {/* corpo da cortina */}
      <mesh>
        <planeGeometry args={[1.6, 0.25]} />
        <meshStandardMaterial color={cor1} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* haste da cortina */}
      <mesh position={[0, 0.125, 0]}>
        <boxGeometry args={[1.7, 0.015, 0.015]} />
        <meshStandardMaterial color="#c9a97a" metalness={0.5} />
      </mesh>
      {/* franjas na borda inferior — pequenos retângulos pendurados */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-0.75 + i * 0.135, -0.18, 0]}>
          <boxGeometry args={[0.06, 0.08, 0.002]} />
          <meshStandardMaterial color={cor2} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function AdesivosHippie() {
  // 5 adesivos peace/flor coloridos distribuídos no teto (por dentro) e
  // portas
  return (
    <>
      {/* peace no teto (símbolo círculo com Y invertido) */}
      <group position={[0, 1.478, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[0.06, 0.075, 24]} />
          <meshBasicMaterial color="#22ff88" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.008, 0.12, 0.001]} />
          <meshBasicMaterial color="#22ff88" toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI * 0.75]}>
          <boxGeometry args={[0.008, 0.06, 0.001]} />
          <meshBasicMaterial color="#22ff88" toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI * 0.75]}>
          <boxGeometry args={[0.008, 0.06, 0.001]} />
          <meshBasicMaterial color="#22ff88" toneMapped={false} />
        </mesh>
      </group>
      {/* Flor grande na porta esquerda */}
      <group position={[-0.74, 0.9, 0.3]} rotation={[0, Math.PI / 2, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} rotation={[0, 0, (i / 6) * Math.PI * 2]} position={[0, 0.03, 0]}>
            <planeGeometry args={[0.06, 0.09]} />
            <meshBasicMaterial color="#ffcc00" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh>
          <circleGeometry args={[0.025, 12]} />
          <meshBasicMaterial color="#ff5fae" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* Coração magenta na porta direita */}
      <group position={[0.74, 0.9, 0.6]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[-0.03, 0, 0]}>
          <circleGeometry args={[0.035, 12]} />
          <meshBasicMaterial color="#ff2d78" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0.03, 0, 0]}>
          <circleGeometry args={[0.035, 12]} />
          <meshBasicMaterial color="#ff2d78" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.03, 0]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.055, 0.055]} />
          <meshBasicMaterial color="#ff2d78" toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </>
  )
}

function PlantinhaConsole() {
  // Vaso pequeno + folhas verdes no canto do painel (à direita, X=+0.5)
  return (
    <group position={[0.5, 0.735, -0.55]}>
      {/* vaso marrom */}
      <mesh>
        <cylinderGeometry args={[0.03, 0.025, 0.05, 12]} />
        <meshStandardMaterial color="#8a4a20" roughness={0.7} />
      </mesh>
      {/* borda superior do vaso */}
      <mesh position={[0, 0.025, 0]}>
        <torusGeometry args={[0.03, 0.005, 6, 12]} />
        <meshStandardMaterial color="#5a3010" roughness={0.6} />
      </mesh>
      {/* folhas verdes (3 planos posicionados) */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 0.08 + i * 0.02, 0]}
          rotation={[Math.PI * 0.2, (i / 3) * Math.PI * 2, 0]}
        >
          <planeGeometry args={[0.055, 0.08]} />
          <meshStandardMaterial
            color={i === 1 ? "#22cc44" : "#22ff88"}
            side={THREE.DoubleSide}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

function FitasCassete() {
  // 3 fitas cassete empilhadas no canto do painel (à direita, ao lado da plantinha)
  const CORES = ["#ff5fae", "#ffcc00", "#00e5ff"]
  return (
    <group position={[0.4, 0.71, -0.65]} rotation={[0, 0.3, 0]}>
      {CORES.map((cor, i) => (
        <group key={i} position={[i * 0.008, i * 0.01, i * 0.005]}>
          {/* casinha da fita */}
          <mesh>
            <boxGeometry args={[0.11, 0.006, 0.07]} />
            <meshStandardMaterial color={cor} roughness={0.6} />
          </mesh>
          {/* rolinhos internos (visíveis por dentro) */}
          <mesh position={[-0.025, 0.004, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.002, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
          <mesh position={[0.025, 0.004, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.002, 12]} />
            <meshStandardMaterial color="#0a0a0a" />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function KombiHippieDecor() {
  return (
    <>
      <GuirlandaLED />
      <CortinaFranjada lado={-1} />
      <CortinaFranjada lado={1} />
      <AdesivosHippie />
      <PlantinhaConsole />
      <FitasCassete />
    </>
  )
}

// ─── Iluminação padrão ───────────────────────────────────────────────────────
export function CockpitLighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 4, -10]} intensity={0.9} color="#ff2d78" />
      <directionalLight position={[3, 3, -5]} intensity={0.35} color="#cc00ff" />
      <pointLight position={[0, 0.8, -0.7]} intensity={0.9} color="#00ffff" distance={2.5} />
      <pointLight position={[-0.45, 0.5, -0.4]} intensity={0.4} color="#ff2d78" distance={1.5} />
      <pointLight position={[0.45, 0.4, -0.45]} intensity={0.4} color="#ffcc00" distance={1.5} />
    </>
  )
}

// ─── Cena completa do cockpit ────────────────────────────────────────────────
export interface CockpitSceneProps {
  isPlaying?: boolean
  speed?: number
  steerValue?: number
  cityScrollSpeed?: number
  radioHub?: RadioHubProps
  /** Se true, esconde CityBackdrop — útil quando o /drive fornece seu próprio cenário. */
  hideCity?: boolean
  /** Se true, esconde os bancos — útil se a câmera não puder passar deles. */
  hideBancos?: boolean
  /** Se true, esconde parabrisa/retrovisor. Usado quando o mundo já é
   *  desenhado em outra layer (ex.: canvas 2D do /drive atrás do R3F). */
  hideCabineSuperior?: boolean
  /** Se true, esconde piso e portas — útil no modo overlay (só painel visível). */
  hideEstrutura?: boolean
  /** Se true, esconde o display consolidado rádio+hub+mapa. Útil quando o
   *  /drive já tem esses controles como overlay HTML (a tela CRT). */
  hideRadioHub?: boolean
  /** Se true, esconde teto panorâmico e janelas laterais. */
  hideCabineFechada?: boolean
  /** Handler de clique nos itens interativos do painel (radio, batida, toca).
   *  Se undefined, itens não são clicáveis. */
  onItemClick?: (item: "radio" | "pads" | "toca") => void
}

export function CockpitScene({
  isPlaying = false,
  speed = 0,
  steerValue = 0,
  cityScrollSpeed = 4,
  radioHub,
  hideCity = false,
  hideBancos = false,
  hideCabineSuperior = false,
  hideEstrutura = false,
  hideRadioHub = false,
  hideCabineFechada = false,
  onItemClick,
}: CockpitSceneProps) {
  return (
    <>
      {!hideCity && <CityBackdrop scrollSpeed={cityScrollSpeed} />}

      {/* Estrutura do carro */}
      {!hideEstrutura && (
        <>
          <Piso />
          <Porta part={L.portaEsquerda} />
          <Porta part={L.portaDireita} />
        </>
      )}

      {/* Cabine fechada — teto panorâmico + janelas + decoração Kombi Hippie
          (guirlanda LED, cortinas franjadas, adesivos peace/flor, plantinha,
          fitas cassete). É o que faz o interior parecer uma Kombi de verdade
          estilo Fillmore do filme Carros. */}
      {!hideCabineFechada && (
        <>
          <TetoPanoramico />
          <Janela part={L.janelaEsquerda} />
          <Janela part={L.janelaDireita} />
          <KombiHippieDecor />
        </>
      )}

      {/* Cabine superior (parabrisa + retrovisor) */}
      {!hideCabineSuperior && (
        <>
          <Parabrisa />
          <Retrovisor />
        </>
      )}

      {/* Painel + instrumentos (clicáveis se onItemClick fornecido) */}
      <Painel />
      {!hideRadioHub && (
        <group
          onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("radio") } : undefined}
        >
          <RadioHub {...radioHub} />
        </group>
      )}
      <VelocRPM speed={speed} isPlaying={isPlaying} />
      <Volante steerValue={steerValue} />
      <Cambio />

      {/* Instrumentos musicais integrados */}
      <group
        onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("toca") } : undefined}
      >
        <TocaDiscos isPlaying={isPlaying} />
      </group>
      <group
        onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick("pads") } : undefined}
      >
        <PadsMPC isPlaying={isPlaying} />
      </group>

      {/* Bancos (por trás da câmera do motorista) */}
      {!hideBancos && (
        <>
          <Banco part={L.bancoMotorista} />
          <Banco part={L.bancoPassageira} />
        </>
      )}
    </>
  )
}
