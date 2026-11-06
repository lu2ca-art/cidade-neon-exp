"use client"
/* eslint-disable react-hooks/immutability -- three.js: luzes e materiais mexidos a cada quadro */

// A BALADA por dentro (lugar 6, coming-of-age). Uma pista grande e escura,
// o DJ no fundo embaixo de um telão que é o FEED (o DJ é o feed), feixes de
// luz girando, e duzentas pessoas (aqui, quarenta e oito) com o celular
// levantado: ninguém dança, todo mundo filma quem dança. O Drewboy no meio.
//
// O gesto: um anel fecha no chão em volta dele a cada batida; tocar na tela
// quando o anel encosta é acerto. Cada acerto abaixa uns celulares. No fim
// ninguém filma, a roda abre e ele dança de olho fechado.
// Colisão: quem já passou pelo bar vê ela no camarote e o Mubarak num canto.

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { texTexto } from "../../estrada/geo"
import { ModeloSeguro } from "../../estrada/Seguro"
import { gota } from "../../som"
import { vib } from "../../som-carro"
import { sinalizar } from "../bus"
import { AnelRitmo, Caixa, Multidao, Neon, Npc, Sala, useRitmo, type Pessoa } from "../comum"
import { GRUPOS_SALA, matsSala } from "../modelo"
import { Camera, useToqueLivre, type Plano, type SalaProps } from "../motor"

const ROSA = "#ff3fb0"
const LILAS = "#b38cff"
const META = 8

const PLANOS: Record<string, Plano> = {
  entrada: { pos: [0.5, 2.4, 10], olha: [0, 1.6, -2], fov: 62 },
  drewboy: { pos: [1.5, 1.7, 4.8], olha: [0, 1.5, 0], fov: 50 },
  pista: { pos: [0, 3.6, 6.2], olha: [0, 0.9, 0], fov: 60 },
  camarote: { pos: [2, 2.4, 3], olha: [-6.5, 3.2, -3], fov: 50 },
  dj: { pos: [0, 2.2, 3], olha: [0, 3.2, -8], fov: 56 },
}

export function SalaBalada({ estado, objetos, popularidade = 0 }: SalaProps) {
  const [dancou, setDancou] = useState(false)
  const dancando = estado.gesto === "danca"
  const { acertos, tocar, fase } = useRitmo(dancando, META, () => sinalizar({ t: "fim-gesto" }))
  if (acertos >= META && !dancou) setDancou(true)
  // a multidão copia o seu passo (13/10): cada toque, quem copia pula junto
  const pulso = useRef(-9)
  useToqueLivre(() => {
    if (!dancando && !dancou) return
    pulso.current = performance.now() / 1000
    if (!dancando) return
    const ok = tocar()
    if (ok) { vib(18); gota(5) }
  })
  const bar = objetos.includes("copo")

  // a multidão em roda, todo mundo virado pro meio
  const gente = useMemo<Pessoa[]>(() => {
    const out: Pessoa[] = []
    let seed = 21
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const cores = [ROSA, LILAS, "#2fe8ff", "#ffc857", "#5dffa0", "#ff6a35"]
    for (let anel = 0; anel < 3; anel++) {
      const n = [12, 16, 20][anel]
      const raio = 2.4 + anel * 1.3
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + anel * 0.3 + r() * 0.15
        // fica aberto na frente (onde a câmera olha)
        if (Math.sin(a) > 0.82 && anel === 0) continue
        const x = Math.cos(a) * (raio + r() * 0.4)
        const z = Math.sin(a) * (raio + r() * 0.4)
        out.push({ x, z, vira: Math.atan2(-x, -z), cor: cores[Math.floor(r() * cores.length)] })
      }
    }
    return out
  }, [])
  const filmando = Math.round(gente.length * (1 - Math.min(acertos, META) / META))
  const celulares = dancou ? 0 : filmando

  const plano = useMemo(() => {
    if (dancando || estado.ganha) return PLANOS.pista
    if ((estado.falando === "Drew" || estado.falando === "Drewboy") || estado.falando === "você") return PLANOS.drewboy
    if (estado.pos === 0) return PLANOS.entrada
    if (bar && (estado.pos === 1 || estado.pos === 2)) return PLANOS.camarote
    if (estado.falando === null && estado.pos <= 5) return PLANOS.dj
    return PLANOS.drewboy
  }, [estado, dancando, bar])

  return (
    <>
      <color attach="background" args={["#05040a"]} />
      <fog attach="fog" args={["#05040a", 8, 26]} />
      <ambientLight intensity={0.2} color="#c8b0ff" />
      <hemisphereLight args={["#ff9fe0", "#100818", 0.3]} />
      <directionalLight position={[3, 5, 8]} intensity={0.4} color="#9fb4ff" />
      {/* (06/11) a balada modelada no Blender (balada.glb); enquanto baixa, ou se falhar, as caixas de antes */}
      <ModeloSeguro nome="balada-glb" reserva={<BaladaCaixas acertos={acertos} />}>
        <BaladaModelada acertos={acertos} />
      </ModeloSeguro>
      <Feixes />
      {/* o DJ no fundo e o telão-feed */}
      <Neon pos={[0, 1.22, -6.98]} comp={5} cor={ROSA} luz={3} />
      <Npc cor={LILAS} pos={[0, 1.2, -8.3]} vira={0} pose="danca" dancando />
      <Feed />
      <Letreiro />
      {/* o camarote (à esquerda, alto) */}
      <Neon pos={[-6, 1.7, -3]} comp={3.4} cor={ROSA} rot={Math.PI / 2} luz={2} />
      {bar && <Npc cor="#ff3f7a" pos={[-8.3, 1.68, -3]} vira={1.2} pele="#3a2430" falando={estado.falando === "ela"} />}
      {bar && <Npc cor="#ff6a35" pos={[8.6, 0, -6.5]} vira={-2.2} falando={estado.falando === "Mubarak"} />}
      {/* a gente */}
      <Multidao gente={gente} celulares={celulares} copiam={Math.round(gente.length * Math.min(1, 0.08 + popularidade / 45))} pulso={pulso} />
      <Npc cor={ROSA} pos={[0, 0, 0]} vira={0} pose={dancando || dancou ? "danca" : "em-pe"} dancando={dancando || dancou} falando={(estado.falando === "Drew" || estado.falando === "Drewboy")} />
      <AnelRitmo pos={[0, 0.03, 0]} cor={ROSA} fase={fase} ativo={dancando && acertos < META} />
      <Camera plano={plano} />
    </>
  )
}

// ── (06/11) A BALADA MODELADA NO BLENDER (blender/scripts/balada.py, public/models/balada.glb):
// o clube da Sexta-Feira. A pista de LED em grade (nó pista, malha _neon: a cor
// do material pulsa com a batida e acende a cada acerto, sem alocar), a cabine
// do DJ no palco baixo com as picapes e o mixer, a moldura do telão (o feed é o
// de sempre), os paredões de som, a treliça com as cabeças dos feixes, o globo,
// o camarote de vidro com o sofá, a escada e o VIP em neon, o bar lateral com a
// parede de garrafas, as colunas com anéis de neon e a porta dos fundos
// entreaberta. Tudo nas posições das caixas (o palco do DJ, o camarote, a
// pista): a gente, os feixes, o telão e a câmera não mudam. Malhas _solido (AO e
// luz assadas no vértice), _luz, _neon, _vidro; materiais compartilhados, sem
// luz nova. ~19,6 mil triângulos, 185 KB.
const URL_BALADA = "/models/balada.glb"
const LED_BALADA = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
function BaladaModelada({ acertos }: { acertos: number }) {
  const { nodes } = useGLTF(URL_BALADA) as unknown as { nodes: Record<string, THREE.Object3D> }
  const mats = { ...matsSala(0.55), led: LED_BALADA }
  const partes = useMemo(() => {
    const out: { k: string; geo: THREE.BufferGeometry; mat: THREE.Material; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }[] = []
    for (const raiz of ["sala", "pista"]) for (const g of GRUPOS_SALA) {
      const o = nodes[`${raiz}_${g}`] as THREE.Mesh | undefined
      if (!o?.geometry) continue
      o.updateWorldMatrix(true, false)
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), esc = new THREE.Vector3()
      o.matrixWorld.decompose(pos, quat, esc)
      out.push({ k: `${raiz}_${g}`, geo: o.geometry, mat: raiz === "pista" ? mats.led : mats[g], pos, quat, esc })
    }
    if (!out.some((p) => p.k === "sala_solido")) throw new Error("balada.glb sem a sala")
    return out
  }, [nodes, mats])
  // o LED pulsa na batida e acende a cada acerto (só a cor do material, nada novo por quadro)
  const ult = useRef(acertos)
  const flash = useRef(0)
  useFrame((s, dt) => {
    if (acertos !== ult.current) { ult.current = acertos; flash.current = 1 }
    flash.current = Math.max(0, flash.current - dt * 2.5)
    mats.led.color.setScalar(0.35 + Math.abs(Math.sin(s.clock.elapsedTime * 5.6)) * 0.3 + flash.current * 0.6)
  })
  return (
    <group name="balada-modelada">
      {partes.map((p) => (
        <mesh key={p.k} geometry={p.geo} material={p.mat} position={p.pos} quaternion={p.quat} scale={p.esc} />
      ))}
    </group>
  )
}
useGLTF.preload(URL_BALADA)

// as caixas de antes (enquanto o modelo baixa, ou se ele falhar)
function BaladaCaixas({ acertos }: { acertos: number }) {
  return (
    <>
      <Sala larg={22} fundo={20} alto={7} parede="#120c1a" chao="#0b0810" teto="#060409" />
      {/* a pista: um quadrado de luz no chão que pulsa */}
      <Pista acertos={acertos} />
      <Caixa pos={[0, 0.6, -8]} tam={[5, 1.2, 2]} cor="#1a1424" />
      <Caixa pos={[-8, 1.6, -3]} tam={[4, 0.15, 3.5]} cor="#2a1a2a" />
    </>
  )
}

function Pista({ acertos }: { acertos: number }) {
  const m = useRef<THREE.MeshBasicMaterial>(null)
  const ult = useRef(acertos)
  const flash = useRef(0)
  useFrame((s, dt) => {
    if (acertos !== ult.current) { ult.current = acertos; flash.current = 1 }
    flash.current = Math.max(0, flash.current - dt * 2.5)
    if (m.current) m.current.opacity = 0.08 + Math.abs(Math.sin(s.clock.elapsedTime * 5.6)) * 0.06 + flash.current * 0.4
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
      <circleGeometry args={[6.5, 48]} />
      <meshBasicMaterial ref={m} color={ROSA} transparent opacity={0.1} toneMapped={false} depthWrite={false} />
    </mesh>
  )
}

// feixes de luz girando do teto
function Feixes() {
  const g = useRef<THREE.Group>(null)
  useFrame((s) => {
    if (!g.current) return
    const t = s.clock.elapsedTime
    g.current.children.forEach((c, i) => {
      c.rotation.z = Math.sin(t * 0.7 + i * 1.7) * 0.6
      c.rotation.x = Math.cos(t * 0.5 + i) * 0.35
    })
  })
  const cores = [ROSA, LILAS, "#2fe8ff", ROSA, "#ffc857"]
  return (
    <group ref={g}>
      {cores.map((c, i) => (
        <group key={i} position={[-6 + i * 3, 6.8, -2 + (i % 2) * 2]}>
          <mesh position={[0, -3.5, 0]}>
            <coneGeometry args={[1.1, 7, 16, 1, true]} />
            <meshBasicMaterial color={c} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// o telão: o feed rolando (faixas de cor subindo), o DJ de verdade
function Feed() {
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 64; c.height = 256
    const g = c.getContext("2d")!
    const cores = ["#ff3fb0", "#2a2040", "#b38cff", "#e6f0ff", "#2a2040", "#ffc857", "#2a2040"]
    for (let i = 0; i < 16; i++) { g.fillStyle = cores[i % cores.length]; g.fillRect(4, i * 16 + 2, 56, 12) }
    const t = new THREE.CanvasTexture(c); t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1)
    return t
  }, [])
  useFrame((_, dt) => { tex.offset.y += dt * 0.4 })
  return (
    <group position={[0, 4, -9.9]}>
      <mesh>
        <planeGeometry args={[3, 4.5]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0, 1.5]} color={LILAS} intensity={6} distance={9} decay={2} />
    </group>
  )
}

function Letreiro() {
  const tex = useMemo(() => texTexto([{ txt: "SEXTA", tam: 190, cor: ROSA }], 1024, 256), [])
  return (
    <mesh position={[0, 6.2, -9.9]}>
      <planeGeometry args={[4.4, 1.1]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  )
}
