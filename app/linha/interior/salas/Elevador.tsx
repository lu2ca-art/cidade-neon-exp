"use client"
/* eslint-disable react-hooks/immutability -- three.js: câmera, luzes e materiais mexidos a cada quadro */

// O ELEVADOR DE TERROR (T47, lista-mestra; J2: 38). Um prédio só, passeio
// livre. Você entra no elevador, ele sobe (o número do andar correndo, o
// tranco, o zumbido), a porta abre num andar escuro: de um lado e do outro,
// robôs dormindo em cibercamas e humanos encubados em cápsulas. As máquinas
// "dormindo". Você atravessa o corredor no meio deles até a máquina grande do
// fundo, que respira em vermelho.
//
// PROVISÓRIO: modelos simples (caixas e cilindros, a gente leve da multidão
// dentro das cápsulas), até chegar o vídeo da torre (referência do dono: a
// torre da Disney de Paris). O clima é luz e som baratos: uma lanterna que
// anda com você, as faixas do teto piscando, um zumbido grave sintetizado.
//
// Andar: segurar a tela anda pra frente, arrastar vira (o olhar do motor.tsx);
// no teclado, W/↑ anda, S/↓ volta, A/D/←/→ viram. Chegar no fundo manda
// "fim-gesto" (bus.ts): quem abriu a sala decide o que vem depois.
//
// Leve: as camas, os robôs, as cápsulas e as pessoas são instâncias (uma
// chamada de desenho por tipo); 3 luzes pontuais; nada de `new` nem setState
// por quadro (os sustos são gatilhos de posição, cada um uma vez).

import { useGLTF } from "@react-three/drei"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { audioCtx, saidaAmbiente, saidaSom } from "../../som"
import { sinalizar } from "../bus"
import { Caixa, Sala } from "../comum"
import { olhar, type SalaProps } from "../motor"

// tudo que dá pra afinar fica aqui
export const ELEVADOR = {
  subida: 6.5, // s com a porta fechada, subindo
  abrir: 1.6, // s da porta abrindo
  andares: 87, // o número que o painel alcança
  passo: 1.35, // m/s andando (devagar: é terror)
  vira: 1.7, // rad/s virando no teclado
  // os sustos, pela posição z (o corredor vai de z 2 a z −26)
  sustoOlho: -5.5, // um robô abre os olhos e vira a cabeça pra você
  sustoApagao: -11.5, // a luz cai
  sustoVidro: -16.5, // alguém bate no vidro da cápsula
  fim: -21, // chegou na máquina do fundo
}

const FUNDO_Z = -26
const PORTA_Z = 2
const CABINE_Z = 3.8
const LARG = 7.2
const ALTO = 3
const CORREDOR = 1.15 // |x| máximo andando
const VERMELHO = "#ff2436"
const CIANO = "#2fe8ff"

// as vagas: 7 de cada lado; num lado robô, no outro cápsula, alternando
const VAGAS = 7
const vagaZ = (i: number) => -1.6 - i * 3
type Vaga = { x: number; z: number; s: 1 | -1 }
const ROBOS: Vaga[] = []
const CAPSULAS: Vaga[] = []
for (let i = 0; i < VAGAS; i++) {
  const esq = { x: -1, z: vagaZ(i), s: -1 as const }
  const dir = { x: 1, z: vagaZ(i), s: 1 as const }
  ;(i % 2 ? CAPSULAS : ROBOS).push(esq)
  ;(i % 2 ? ROBOS : CAPSULAS).push(dir)
}
// o que acorda: o robô da esquerda na 3ª vaga (z −7,6), fora das instâncias
const ACORDA = ROBOS.findIndex((r) => r.s === -1 && r.z === vagaZ(2))
const ROBOS_DORMEM = ROBOS.filter((_, i) => i !== ACORDA)

export function SalaElevador({ estado }: SalaProps) {
  void estado
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const som = useSom()

  // o estado do passeio (tudo em ref: nada de render por quadro)
  const t0 = useRef(-1)
  const fase = useRef<"subindo" | "abrindo" | "andando">("subindo")
  const p = useRef({ x: 0, z: 3.05, rumo: 0, andou: 0 })
  const sustos = useRef({ olho: false, apagao: -1, vidro: -1, fim: false })
  const teclas = useRef({ f: false, t: false, e: false, d: false })

  const portaE = useRef<THREE.Mesh>(null)
  const portaD = useRef<THREE.Mesh>(null)
  const lanterna = useRef<THREE.PointLight>(null)
  const luzCabine = useRef<THREE.PointLight>(null)
  const luzFundo = useRef<THREE.PointLight>(null)
  const tiras = useRef<THREE.MeshBasicMaterial>(null)
  const cabeca = useRef<THREE.Group>(null)
  const olhos = useRef<THREE.MeshBasicMaterial>(null)
  const vidro = useRef<THREE.MeshStandardMaterial>(null)
  const pulso = useRef<THREE.MeshBasicMaterial>(null)
  const painel = usePainel()

  // o teclado
  useEffect(() => {
    const mapa: Record<string, keyof typeof teclas.current> = { KeyW: "f", ArrowUp: "f", KeyS: "t", ArrowDown: "t", KeyA: "e", ArrowLeft: "e", KeyD: "d", ArrowRight: "d" }
    const baixa = (e: KeyboardEvent) => { const k = mapa[e.code]; if (k) { teclas.current[k] = true; e.preventDefault() } }
    const sobe = (e: KeyboardEvent) => { const k = mapa[e.code]; if (k) teclas.current[k] = false }
    window.addEventListener("keydown", baixa)
    window.addEventListener("keyup", sobe)
    return () => { window.removeEventListener("keydown", baixa); window.removeEventListener("keyup", sobe) }
  }, [])

  useFrame((s, dtCru) => {
    const dt = Math.min(dtCru, 0.05)
    const t = s.clock.elapsedTime
    if (t0.current < 0) { t0.current = t; som.subir() }
    const dec = t - t0.current
    const P = p.current

    // ── a subida e a porta ──
    if (fase.current === "subindo") {
      painel.mostrar(Math.min(ELEVADOR.andares, Math.floor(Math.pow(dec / ELEVADOR.subida, 1.4) * ELEVADOR.andares)))
      if (dec >= ELEVADOR.subida) { fase.current = "abrindo"; painel.mostrar(ELEVADOR.andares); som.ding() }
    } else if (fase.current === "abrindo" && dec >= ELEVADOR.subida + ELEVADOR.abrir) {
      fase.current = "andando"
      sinalizar({ t: "fala", tipo: "acao", texto: "o andar está escuro. as máquinas dormem. não acorda ninguém" })
      sinalizar({ t: "fala", tipo: "acao", texto: "segura a tela pra andar; arrasta pra virar" })
    }
    const aberta = fase.current === "subindo" ? 0 : Math.min(1, (dec - ELEVADOR.subida) / ELEVADOR.abrir)
    const ab = aberta * aberta * (3 - 2 * aberta)
    if (portaE.current) portaE.current.position.x = -0.4 - ab * 0.78
    if (portaD.current) portaD.current.position.x = 0.4 + ab * 0.78

    // ── andar ──
    if (fase.current === "andando") {
      const T = teclas.current
      if (T.e) P.rumo += ELEVADOR.vira * dt
      if (T.d) P.rumo -= ELEVADOR.vira * dt
      // arrastando: o desvio do olhar vira o rumo devagar
      if (olhar.arrastando) P.rumo += olhar.yaw * dt * 1.6
      const anda = (T.f || olhar.arrastando ? 1 : 0) - (T.t ? 0.7 : 0)
      if (anda) {
        const dx = -Math.sin(P.rumo) * anda * ELEVADOR.passo * dt
        const dz = -Math.cos(P.rumo) * anda * ELEVADOR.passo * dt
        // dentro da cabine só sai pela porta; no corredor, entre as camas
        const lim = P.z > PORTA_Z ? 0.55 : CORREDOR
        P.x = THREE.MathUtils.clamp(P.x + dx, -lim, lim)
        const nz = THREE.MathUtils.clamp(P.z + dz, FUNDO_Z + 2.2, 3.4)
        const cruza = (P.z > PORTA_Z) !== (nz > PORTA_Z)
        if (!(cruza && Math.abs(P.x) > 0.55)) P.z = nz
        P.andou += Math.abs(anda) * ELEVADOR.passo * dt
      }
    }
    if (!olhar.arrastando) { olhar.yaw *= 1 - Math.min(1, dt * 1.5); olhar.pitch *= 1 - Math.min(1, dt * 1.5) }

    // ── os sustos (cada um uma vez, pela posição) ──
    const S = sustos.current
    if (!S.olho && P.z < ELEVADOR.sustoOlho) { S.olho = true; som.servo(); if (olhos.current) olhos.current.color.set(VERMELHO) }
    if (S.apagao < 0 && P.z < ELEVADOR.sustoApagao) { S.apagao = t; som.apagao() }
    if (S.vidro < 0 && P.z < ELEVADOR.sustoVidro) { S.vidro = t; som.vidro() }
    if (!S.fim && P.z < ELEVADOR.fim) {
      S.fim = true
      sinalizar({ t: "fala", tipo: "acao", texto: "a máquina do fundo respira. ninguém acordou. por enquanto" })
      sinalizar({ t: "fim-gesto" })
    }

    // ── a luz ──
    const desdeApagao = S.apagao < 0 ? 99 : t - S.apagao
    const apagado = desdeApagao < 1.3 || (desdeApagao < 2 && Math.sin(t * 60) > 0)
    // o teto pisca: quase sempre aceso fraco, às vezes uma falha
    const falha = Math.sin(t * 13.1) * Math.sin(t * 3.7) > 0.93
    if (tiras.current) tiras.current.color.setRGB(apagado ? 0.05 : falha ? 0.2 : 0.55, apagado ? 0.01 : falha ? 0.05 : 0.1, apagado ? 0.02 : falha ? 0.08 : 0.16)
    if (lanterna.current) lanterna.current.intensity = apagado ? 0.25 : 2.6 + Math.sin(t * 7.3) * 0.15
    if (luzCabine.current) luzCabine.current.intensity = fase.current === "subindo" ? 2.2 + (Math.sin(t * 41) > 0.85 ? -1.4 : 0) : 1.2
    const resp = 0.5 + 0.5 * Math.sin(t * 1.1)
    if (luzFundo.current) luzFundo.current.intensity = apagado ? 4 : 1 + resp * 3
    if (pulso.current) pulso.current.opacity = 0.25 + resp * 0.6
    // o vidro: quem bateu acende a cápsula por um instante
    const desdeVidro = S.vidro < 0 ? 99 : t - S.vidro
    if (vidro.current) vidro.current.emissiveIntensity = 0.22 + (desdeVidro < 1.2 ? (1.2 - desdeVidro) * 1.4 : 0)

    // o robô que acordou vira a cabeça pra você
    if (S.olho && cabeca.current) {
      const r = ROBOS[ACORDA]
      // a fenda dos olhos olha pro +x local: gira até ele apontar pra você
      const alvo = Math.atan2(-(P.z - r.z), P.x - r.x * 1.78)
      let d = alvo - cabeca.current.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      cabeca.current.rotation.y += d * Math.min(1, dt * 1.2)
    }

    // ── a câmera: os seus olhos ──
    const tranco = fase.current === "subindo" ? Math.sin(t * 23) * 0.004 + (dec < 0.4 ? Math.sin(dec * 40) * 0.02 : 0) : 0
    const y = 1.62 + Math.sin(P.andou * 5.2) * 0.022 + tranco
    camera.position.set(P.x, y, P.z)
    if (lanterna.current) lanterna.current.position.set(P.x, y + 0.3, P.z - 0.4)
    const olha = P.rumo + olhar.yaw
    camera.lookAt(P.x - Math.sin(olha), y - 0.06 + olhar.pitch, P.z - Math.cos(olha))
    const base = 66
    const asp = camera.aspect || 1
    const fov = asp >= 1 ? base : Math.min(78, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(base) / 2) / Math.max(asp, 0.45) * 0.62)))
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() }
  })

  const robo = ROBOS[ACORDA]
  return (
    <>
      <color attach="background" args={["#020205"]} />
      <fog attach="fog" args={["#020205", 4, 19]} />
      <ambientLight intensity={0.07} color="#6a7aa8" />
      <pointLight ref={lanterna} color="#cfe0ff" intensity={2.6} distance={7} decay={2} />
      <pointLight ref={luzFundo} position={[0, 1.6, FUNDO_Z + 1.6]} color={VERMELHO} intensity={2} distance={9} decay={2} />

      {/* o andar */}
      <group position={[0, 0, (PORTA_Z + FUNDO_Z) / 2]}>
        <Sala larg={LARG} fundo={PORTA_Z - FUNDO_Z} alto={ALTO} parede="#0e1016" chao="#0a0b10" teto="#07080b" sem={["frente"]} />
      </group>
      {/* a parede da porta, com o vão do elevador */}
      <Caixa pos={[-(LARG / 2 + 0.8) / 2, ALTO / 2, PORTA_Z]} tam={[LARG / 2 - 0.8, ALTO, 0.1]} cor="#0e1016" />
      <Caixa pos={[(LARG / 2 + 0.8) / 2, ALTO / 2, PORTA_Z]} tam={[LARG / 2 - 0.8, ALTO, 0.1]} cor="#0e1016" />
      <Caixa pos={[0, (ALTO + 2.3) / 2, PORTA_Z]} tam={[1.6, ALTO - 2.3, 0.1]} cor="#0e1016" />

      {/* a cabine: metal escovado, a luz fria que falha, o painel do andar */}
      <Caixa pos={[0, 0.01, (PORTA_Z + CABINE_Z) / 2]} tam={[1.6, 0.02, CABINE_Z - PORTA_Z]} cor="#2a2c32" metal={0.6} rough={0.4} />
      <Caixa pos={[0, 2.3, (PORTA_Z + CABINE_Z) / 2]} tam={[1.6, 0.04, CABINE_Z - PORTA_Z]} cor="#1a1b20" />
      <Caixa pos={[-0.82, 1.15, (PORTA_Z + CABINE_Z) / 2]} tam={[0.04, 2.3, CABINE_Z - PORTA_Z]} cor="#3a3d44" metal={0.7} rough={0.35} />
      <Caixa pos={[0.82, 1.15, (PORTA_Z + CABINE_Z) / 2]} tam={[0.04, 2.3, CABINE_Z - PORTA_Z]} cor="#3a3d44" metal={0.7} rough={0.35} />
      <Caixa pos={[0, 1.15, CABINE_Z]} tam={[1.6, 2.3, 0.04]} cor="#3a3d44" metal={0.7} rough={0.35} />
      <pointLight ref={luzCabine} position={[0, 2.15, (PORTA_Z + CABINE_Z) / 2]} color="#dfe8ff" intensity={2.2} distance={3.5} decay={2} />
      <mesh position={[0, 2.27, (PORTA_Z + CABINE_Z) / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshBasicMaterial color="#dfe8ff" toneMapped={false} />
      </mesh>
      <mesh ref={portaE} position={[-0.4, 1.15, PORTA_Z + 0.08]}>
        <boxGeometry args={[0.8, 2.3, 0.05]} />
        <meshStandardMaterial color="#4a4d55" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh ref={portaD} position={[0.4, 1.15, PORTA_Z + 0.08]}>
        <boxGeometry args={[0.8, 2.3, 0.05]} />
        <meshStandardMaterial color="#4a4d55" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.18, PORTA_Z + 0.12]}>
        <planeGeometry args={[0.36, 0.18]} />
        <meshBasicMaterial map={painel.tex} toneMapped={false} />
      </mesh>

      {/* o teto: as faixas de luz de emergência, todas no mesmo material (piscam juntas) */}
      <Tiras matRef={tiras} />

      {/* as cibercamas, os robôs dormindo, as cápsulas com gente dentro */}
      <Camas />
      <Robos lista={ROBOS_DORMEM} />
      <Capsulas vidroRef={vidro} />

      {/* o robô que acorda: a cabeça e os olhos fora das instâncias */}
      <group ref={cabeca} position={[robo.x * 1.78, 0.66, robo.z]}>
        <mesh>
          <boxGeometry args={[0.3, 0.26, 0.34]} />
          <meshStandardMaterial color="#3a3e48" metalness={0.6} roughness={0.45} />
        </mesh>
        <mesh position={[0.155, 0.03, 0]} rotation-y={Math.PI / 2}>
          <planeGeometry args={[0.22, 0.04]} />
          <meshBasicMaterial ref={olhos} color="#1a0606" toneMapped={false} />
        </mesh>
      </group>

      {/* a máquina do fundo: o núcleo que dorme, respirando em vermelho */}
      <group position={[0, 0, FUNDO_Z + 0.9]}>
        <mesh position={[0, 1.4, 0]}>
          <cylinderGeometry args={[0.9, 1.1, 2.8, 20]} />
          <meshStandardMaterial color="#14161c" metalness={0.7} roughness={0.4} />
        </mesh>
        {[0.6, 1.4, 2.2].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[1.02 - y * 0.05, 0.025, 6, 32]} />
            <meshBasicMaterial ref={y === 1.4 ? pulso : undefined} color={VERMELHO} transparent opacity={0.6} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </>
  )
}

// ── o painel do andar (um canvas redesenhado só quando o número muda) ──
function usePainel() {
  const r = useMemo(() => {
    if (typeof document === "undefined") return { tex: null as THREE.CanvasTexture | null, mostrar: () => {} }
    const c = document.createElement("canvas"); c.width = 128; c.height = 64
    const g = c.getContext("2d")!
    const tex = new THREE.CanvasTexture(c)
    let ult = -1
    const mostrar = (n: number) => {
      if (n === ult) return
      ult = n
      g.fillStyle = "#0a0204"; g.fillRect(0, 0, 128, 64)
      g.fillStyle = VERMELHO; g.font = "bold 44px monospace"; g.textAlign = "center"; g.textBaseline = "middle"
      g.fillText(String(n).padStart(2, "0"), 64, 34)
      tex.needsUpdate = true
    }
    mostrar(0)
    return { tex, mostrar }
  }, [])
  useEffect(() => () => r.tex?.dispose(), [r])
  return r
}

// ── instâncias ──
const _o = new THREE.Object3D()
function pos(m: THREE.InstancedMesh | null, i: number, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1) {
  if (!m) return
  _o.position.set(x, y, z); _o.rotation.set(0, ry, 0); _o.scale.set(sx, sy, sz); _o.updateMatrix()
  m.setMatrixAt(i, _o.matrix)
}

function Tiras({ matRef }: { matRef: React.RefObject<THREE.MeshBasicMaterial | null> }) {
  const m = useRef<THREE.InstancedMesh>(null)
  const n = 9
  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) pos(m.current, i, 0, ALTO - 0.03, 0.2 - i * 3)
    if (m.current) m.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={m} args={[undefined, undefined, n]}>
      <boxGeometry args={[0.12, 0.03, 1.4]} />
      <meshBasicMaterial ref={matRef} color="#8c1a28" toneMapped={false} />
    </instancedMesh>
  )
}

// as cibercamas (robôs) e as bases das cápsulas: a estrutura, a faixa acesa
// virada pro corredor e o monitorzinho na cabeceira
function Camas() {
  const base = useRef<THREE.InstancedMesh>(null)
  const faixa = useRef<THREE.InstancedMesh>(null)
  const tela = useRef<THREE.InstancedMesh>(null)
  const n = ROBOS.length
  useLayoutEffect(() => {
    const cor = new THREE.Color()
    ROBOS.forEach((r, i) => {
      pos(base.current, i, r.s * 2.5, 0.22, r.z, 0, 2, 0.44, 0.95)
      pos(faixa.current, i, r.s * 1.49, 0.4, r.z, 0, 0.02, 0.05, 0.9)
      faixa.current?.setColorAt(i, cor.set(i % 2 ? CIANO : "#ff3fb0").multiplyScalar(0.55))
      pos(tela.current, i, r.s * 1.5, 1.05, r.z - 0.52, r.s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.36, 0.22, 1)
    })
    for (const m of [base.current, faixa.current, tela.current]) if (m) m.instanceMatrix.needsUpdate = true
    if (faixa.current?.instanceColor) faixa.current.instanceColor.needsUpdate = true
  }, [])
  return (
    <>
      <instancedMesh ref={base} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1c1f27" metalness={0.5} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={faixa} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={tela} args={[undefined, undefined, n]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#0f3a2a" toneMapped={false} />
      </instancedMesh>
    </>
  )
}

// os robôs deitados de barriga pra cima: o corpo, a cabeça (perto do
// corredor) e a fenda dos olhos, apagada (estão dormindo)
function Robos({ lista }: { lista: Vaga[] }) {
  const corpo = useRef<THREE.InstancedMesh>(null)
  const cabeca = useRef<THREE.InstancedMesh>(null)
  const olho = useRef<THREE.InstancedMesh>(null)
  const n = lista.length
  useLayoutEffect(() => {
    lista.forEach((r, i) => {
      pos(corpo.current, i, r.s * 2.6, 0.58, r.z, 0, 1.3, 0.28, 0.55)
      pos(cabeca.current, i, r.s * 1.78, 0.62, r.z, 0, 0.26, 0.3, 0.34)
      pos(olho.current, i, r.s * 1.78, 0.775, r.z, 0, 0.04, 0.005, 0.22)
    })
    for (const m of [corpo.current, cabeca.current, olho.current]) if (m) m.instanceMatrix.needsUpdate = true
  }, [lista])
  return (
    <>
      <instancedMesh ref={corpo} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3a3e48" metalness={0.6} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={cabeca} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3a3e48" metalness={0.6} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={olho} args={[undefined, undefined, n]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#2a0a0c" toneMapped={false} />
      </instancedMesh>
    </>
  )
}

// as cápsulas: o vidro esverdeado, os anéis de metal em cima e embaixo e a
// pessoa dentro (o corpo leve da multidão), boiando devagar
const GLB_LEVE = "/models/pessoa-leve.glb"
function Capsulas({ vidroRef }: { vidroRef: React.RefObject<THREE.MeshStandardMaterial | null> }) {
  const { scene } = useGLTF(GLB_LEVE)
  const geo = useMemo(() => {
    let g: THREE.BufferGeometry | null = null
    scene.traverse((o) => { const m = o as THREE.Mesh; if (!g && m.isMesh) g = m.geometry })
    return g as unknown as THREE.BufferGeometry
  }, [scene])
  const vidro = useRef<THREE.InstancedMesh>(null)
  const anel = useRef<THREE.InstancedMesh>(null)
  const gente = useRef<THREE.InstancedMesh>(null)
  const n = CAPSULAS.length
  useLayoutEffect(() => {
    CAPSULAS.forEach((c, i) => {
      const x = c.s * 2.45
      pos(vidro.current, i, x, 1.15, c.z)
      pos(anel.current, i * 2, x, 0.08, c.z)
      pos(anel.current, i * 2 + 1, x, 2.22, c.z)
      pos(gente.current, i, x, 0.22, c.z, c.s > 0 ? -Math.PI / 2 : Math.PI / 2, 0.92, 0.92, 0.92)
    })
    for (const m of [vidro.current, anel.current, gente.current]) if (m) m.instanceMatrix.needsUpdate = true
  }, [])
  // boiando: o grupo todo sobe e desce (uma conta por quadro, não por pessoa)
  useFrame((s) => { if (gente.current) gente.current.position.y = Math.sin(s.clock.elapsedTime * 0.6) * 0.04 })
  return (
    <>
      <instancedMesh ref={gente} args={[geo, undefined, n]} frustumCulled={false}>
        <meshStandardMaterial color="#8aa89a" roughness={0.8} emissive="#0a2a1e" emissiveIntensity={0.6} />
      </instancedMesh>
      <instancedMesh ref={anel} args={[undefined, undefined, n * 2]}>
        <cylinderGeometry args={[0.6, 0.6, 0.16, 18]} />
        <meshStandardMaterial color="#1c1f27" metalness={0.6} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={vidro} args={[undefined, undefined, n]}>
        <cylinderGeometry args={[0.52, 0.52, 2.0, 18, 1, true]} />
        <meshStandardMaterial ref={vidroRef} color="#1a5a48" emissive="#2fe8a8" emissiveIntensity={0.22} transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  )
}

// ── o som: sintetizado, barato (um zumbido grave, o motor da subida, o
// "ding", o servo do robô, a queda de energia, a batida no vidro) ──
function useSom() {
  const r = useMemo(() => {
    const nos: AudioScheduledSourceNode[] = []
    let ruido: AudioBuffer | null = null
    let motor: GainNode | null = null
    const ctx = () => audioCtx()
    const fonteRuido = (c: AudioContext) => {
      if (!ruido) {
        ruido = c.createBuffer(1, c.sampleRate, c.sampleRate)
        const d = ruido.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      }
      const s = c.createBufferSource(); s.buffer = ruido; return s
    }
    // um tom curto com envelope
    const tom = (tipo: OscillatorType, f0: number, f1: number, dur: number, vol: number, quando = 0) => {
      const c = ctx(); const out = saidaSom()
      if (!c || !out) return
      const t = c.currentTime + quando
      const o = c.createOscillator(); o.type = tipo
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur)
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05)
    }
    const batida = (quando: number, vol: number) => {
      const c = ctx(); const out = saidaSom()
      if (!c || !out) return
      const t = c.currentTime + quando
      const s = fonteRuido(c)
      const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 1.5
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
      s.connect(bp).connect(g).connect(out); s.start(t); s.stop(t + 0.15)
      tom("sine", 140, 70, 0.14, vol * 0.8, quando)
    }
    return {
      // o zumbido do andar (fica até sair) e o motor da subida
      subir() {
        const c = ctx(); const amb = saidaAmbiente() ?? saidaSom(); const out = saidaSom()
        if (!c || !amb || !out) return
        const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 170
        const g = c.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 3)
        lp.connect(g).connect(amb)
        for (const f of [41, 41.6, 82.3]) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); nos.push(o) }
        const s = fonteRuido(c); s.loop = true
        const lp2 = c.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 140
        motor = c.createGain(); motor.gain.value = 0.0001; motor.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.6)
        s.connect(lp2).connect(motor).connect(out); s.start(); nos.push(s)
      },
      ding() {
        const c = ctx()
        if (c && motor) { motor.gain.cancelScheduledValues(c.currentTime); motor.gain.setValueAtTime(motor.gain.value, c.currentTime); motor.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.5) }
        tom("sine", 1318, 1310, 1.4, 0.12); tom("sine", 880, 878, 1.8, 0.1, 0.18)
      },
      servo() { tom("square", 180, 420, 0.5, 0.03); tom("square", 420, 260, 0.35, 0.025, 0.55) },
      apagao() { tom("sawtooth", 160, 30, 1.1, 0.12); batida(0, 0.2) },
      vidro() { batida(0, 0.35); batida(0.32, 0.3) },
      parar() { nos.forEach((n) => { try { n.stop() } catch { /* já parou */ } }); nos.length = 0 },
    }
  }, [])
  useEffect(() => () => r.parar(), [r])
  return r
}

useGLTF.preload(GLB_LEVE)
