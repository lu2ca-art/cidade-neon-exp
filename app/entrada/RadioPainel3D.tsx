"use client"

// O RÁDIO DO PAINEL (22/11, o dono: "a interface da rádio tá horrível. tinha que ser algo
// mais visível, em destaque, integrado ao painel e não um negócio flutuando").
//
// Um rádio de carro de verdade, em 3D, encaixado no centro do painel da Kombi: a moldura
// cromada, a tela de LCD acesa (o nome da faixa correndo, o equalizador pulando), quatro
// botões que afundam quando aperta e dois knobs (o da esquerda liga). A luz da tela
// ilumina o painel em volta. Tocar na tela (ou no corpo) inclina a cabeça até ele (o
// "foco"): no celular é assim que os botões ficam do tamanho do dedo.

import { RoundedBox } from "@react-three/drei"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"

export type RadioPainelProps = {
  titulo: string
  tocando: boolean
  temLink: boolean
  focado: boolean
  onLigar: () => void
  onProxima: () => void
  onAnterior: () => void
  onSalvar: () => void
  onFoco: () => void
}

// o tamanho (m): maior que um rádio de verdade, de propósito (é a vitrine da música)
export const RADIO_L = 0.46, RADIO_A = 0.17, RADIO_P = 0.06

const LCD_W = 1024, LCD_H = 256

function desenharLcd(c: HTMLCanvasElement, titulo: string, tocando: boolean, t: number) {
  const g = c.getContext("2d")!
  const fundo = g.createLinearGradient(0, 0, 0, LCD_H)
  fundo.addColorStop(0, "#04191c"); fundo.addColorStop(1, "#021013")
  g.fillStyle = fundo; g.fillRect(0, 0, LCD_W, LCD_H)
  // as linhas do LCD (a trama)
  g.fillStyle = "rgba(0,0,0,0.25)"
  for (let y = 0; y < LCD_H; y += 4) g.fillRect(0, y, LCD_W, 1)
  const aceso = tocando ? "#7df9ff" : "rgba(125,249,255,0.32)"
  g.shadowColor = tocando ? "rgba(47,232,255,0.9)" : "transparent"; g.shadowBlur = tocando ? 14 : 0
  // a linha de cima: a estação e o estado
  g.font = "700 40px ui-monospace, Menlo, monospace"; g.fillStyle = aceso; g.textBaseline = "top"
  g.fillText("222 FM", 34, 22)
  g.textAlign = "right"
  g.fillText(tocando ? "● NO AR" : "toca pra ligar", LCD_W - 34, 22)
  g.textAlign = "left"
  // o título correndo (parado quando desligado)
  g.font = "800 104px ui-monospace, Menlo, monospace"
  const texto = `${titulo.toUpperCase()}  ·  LU2CA  ·  `
  const w = g.measureText(texto).width
  g.save(); g.beginPath(); g.rect(24, 66, LCD_W - 48, 124); g.clip()
  if (tocando) {
    const x = 34 - ((t * 140) % w)
    g.fillText(texto, x, 72); g.fillText(texto, x + w, 72)
  } else g.fillText(titulo.toUpperCase(), 34, 72)
  g.restore()
  // o equalizador embaixo
  g.shadowBlur = 0
  const n = 40, bw = (LCD_W - 68) / n
  for (let i = 0; i < n; i++) {
    const h = tocando ? 8 + Math.abs(Math.sin(t * (3 + (i % 7)) + i * 1.7) * Math.sin(t * 1.3 + i)) * 46 : 6
    g.fillStyle = i % 9 === 0 ? (tocando ? "#ff3fb0" : "rgba(255,63,176,0.3)") : aceso
    g.fillRect(34 + i * bw, LCD_H - 14 - h * 0.7, bw - 6, h * 0.7)
  }
}

function texturaIcone(icone: string, cor: string) {
  const c = document.createElement("canvas"); c.width = 128; c.height = 128
  const g = c.getContext("2d")!
  g.fillStyle = cor; g.textAlign = "center"; g.textBaseline = "middle"
  g.font = "700 64px ui-monospace, Menlo, system-ui, sans-serif"
  g.fillText(icone, 64, 68)
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace
  return tx
}

function Botao({ x, larg, icone, cor, base, onAperta }: { x: number; larg: number; icone: string; cor: string; base: string; onAperta: () => void }) {
  const grupo = useRef<THREE.Group>(null)
  const afundou = useRef(0)
  const [sobre, setSobre] = useState(false)
  const tex = useMemo(() => texturaIcone(icone, cor), [icone, cor])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame((_, dt) => {
    afundou.current = Math.max(0, afundou.current - dt * 4)
    if (grupo.current) grupo.current.position.z = RADIO_P / 2 + 0.006 - afundou.current * 0.006
  })
  const aperta = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); afundou.current = 1; onAperta() }
  return (
    <group ref={grupo} position={[x, -0.052, RADIO_P / 2 + 0.006]}>
      <RoundedBox args={[larg, 0.036, 0.014]} radius={0.004} smoothness={3}
        onPointerDown={aperta}
        onPointerOver={(e) => { e.stopPropagation(); setSobre(true); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { setSobre(false); document.body.style.cursor = "" }}>
        <meshStandardMaterial color={base} metalness={0.4} roughness={0.35} emissive={base} emissiveIntensity={sobre ? 0.45 : 0.12} />
      </RoundedBox>
      <mesh position={[0, 0, 0.0075]}>
        <planeGeometry args={[0.03, 0.03]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

function Knob({ x, girando, onAperta }: { x: number; girando: boolean; onAperta?: () => void }) {
  const k = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => { if (k.current && girando) k.current.rotation.z -= dt * 0.6 })
  return (
    <group position={[x, 0, RADIO_P / 2 + 0.012]}>
      <mesh ref={k} rotation-x={Math.PI / 2}
        onPointerDown={onAperta ? (e) => { e.stopPropagation(); onAperta() } : undefined}
        onPointerOver={onAperta ? () => { document.body.style.cursor = "pointer" } : undefined}
        onPointerOut={onAperta ? () => { document.body.style.cursor = "" } : undefined}>
        <cylinderGeometry args={[0.022, 0.024, 0.024, 28]} />
        <meshStandardMaterial color="#c9c3d6" metalness={0.95} roughness={0.22} />
      </mesh>
      {/* a marquinha do knob */}
      <mesh position={[0, 0.014, 0.0125]}><boxGeometry args={[0.003, 0.012, 0.001]} /><meshBasicMaterial color={girando ? "#2fe8ff" : "#444"} toneMapped={false} /></mesh>
    </group>
  )
}

export function RadioPainel3D(p: RadioPainelProps) {
  const canvas = useMemo(() => { const c = document.createElement("canvas"); c.width = LCD_W; c.height = LCD_H; return c }, [])
  const tex = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t }, [canvas])
  useEffect(() => () => tex.dispose(), [tex])
  const luz = useRef<THREE.PointLight>(null)
  const ultimo = useRef(-1)
  // a tela: redesenha a ~30 quadros por segundo tocando; desligada, só quando muda
  useEffect(() => { desenharLcd(canvas, p.titulo, p.tocando, 0); tex.needsUpdate = true }, [canvas, tex, p.titulo, p.tocando])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    if (p.tocando && t - ultimo.current > 1 / 30) { ultimo.current = t; desenharLcd(canvas, p.titulo, true, t); tex.needsUpdate = true }
    if (luz.current) luz.current.intensity += ((p.tocando ? 1.6 + Math.sin(t * 7) * 0.25 : 0.35) - luz.current.intensity) * 0.1
  })
  const focar = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (!p.focado) p.onFoco() }
  const bts = [
    { icone: "⏮", acao: p.onAnterior, cor: "#e8e2f4", base: "#2a2432", larg: 0.06 },
    { icone: p.tocando ? "❚❚" : "▶", acao: p.onLigar, cor: "#120d02", base: "#ffc857", larg: 0.1 },
    { icone: "⏭", acao: p.onProxima, cor: "#e8e2f4", base: "#2a2432", larg: 0.06 },
    ...(p.temLink ? [{ icone: "♥", acao: p.onSalvar, cor: "#ff8ad8", base: "#2a2432", larg: 0.06 }] : []),
  ]
  const gap = 0.012, total = bts.reduce((s, b) => s + b.larg, 0) + gap * (bts.length - 1)
  let cursor = -total / 2
  return (
    <group name="radio-painel">
      {/* a moldura cromada e o corpo preto */}
      <RoundedBox args={[RADIO_L + 0.02, RADIO_A + 0.02, RADIO_P - 0.01]} radius={0.01} smoothness={4} position={[0, 0, -0.006]}>
        <meshStandardMaterial color="#b9b2c8" metalness={0.95} roughness={0.2} />
      </RoundedBox>
      <RoundedBox args={[RADIO_L, RADIO_A, RADIO_P]} radius={0.008} smoothness={4} onPointerDown={focar}
        onPointerOver={() => { if (!p.focado) document.body.style.cursor = "zoom-in" }} onPointerOut={() => { document.body.style.cursor = "" }}>
        <meshStandardMaterial color="#110e16" metalness={0.5} roughness={0.45} />
      </RoundedBox>
      {/* a tela */}
      <mesh position={[0, 0.026, RADIO_P / 2 + 0.001]} onPointerDown={focar}>
        <planeGeometry args={[0.32, 0.08]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {/* o vidro da tela, com um reflexo */}
      <mesh position={[0, 0.026, RADIO_P / 2 + 0.002]}>
        <planeGeometry args={[0.326, 0.086]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.06} metalness={1} roughness={0.05} depthWrite={false} />
      </mesh>
      {bts.map((b) => { const x = cursor + b.larg / 2; cursor += b.larg + gap; return <Botao key={b.icone + b.base} x={x} larg={b.larg} icone={b.icone} cor={b.cor} base={b.base} onAperta={b.acao} /> })}
      <Knob x={-RADIO_L / 2 + 0.034} girando={p.tocando} onAperta={p.onLigar} />
      <Knob x={RADIO_L / 2 - 0.034} girando={p.tocando} />
      {/* a luz da tela no painel */}
      <pointLight ref={luz} position={[0, 0.02, 0.12]} color="#2fe8ff" intensity={0.35} distance={0.9} decay={2} />
    </group>
  )
}
