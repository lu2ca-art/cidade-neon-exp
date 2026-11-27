"use client"
/* eslint-disable react-hooks/immutability -- three.js: a cena (partículas, cometas, supernovas) mexe por quadro */

// A PÁGINA INICIAL DENTRO DA KOMBI (22/11, o dono: "a página inicial do jogo vai ser
// dentro da kombi... que o usuário se sinta de verdade dentro do veículo. E a rádio tem
// que estar ligada ao painel do carro").
//
// A cabine é a MESMA do jogo em primeira pessoa (estrada/Cabine.tsx: o interior do
// Blender, o painel, o volante, o toca-discos), com a cabeça no mesmo ponto (OLHO).
// A Kombi está parada no deserto, de noite, de frente pra cidade lá longe. O motor em
// marcha lenta treme a cabine de leve; dá pra olhar em volta arrastando (e o olhar volta
// pra frente sozinho, como no jogo). O display do rádio fica preso no painel, no lugar
// do rádio do layout. A senha é a partida: certa, o motor pega e a Kombi entra na cidade.
//
// (27/11, o dono) "o cenário do horizonte é como se ele tivesse viajando no espaço, não tem
// cidade: cometas, supernovas distantes, estrelas, ele tá voando na Kombi (igual no Midnight
// Gospel). Por enquanto estamos viajando no universo." E: rodar a visão em 360°, tocar no
// estúdio (os pads da MPC abrem o KOMBEAT) e no violão (no banco do carona). A partida vira
// o hiperlapso sem degrau: as mesmas partículas que passam devagar viram os riscos de luz.

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Stars } from "@react-three/drei"
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { Cabine, DESLOCA, ESCALA, OLHO } from "../linha/estrada/Cabine"
import { PadsMPC } from "@/components/DriveCockpit/Kombi"
import { KOMBI_LAYOUT } from "@/lib/kombi-layout"
import { RadioPainel3D, type RadioPainelProps } from "./RadioPainel3D"
import { curvaHiper } from "./hiper"

// o rádio do layout, no espaço da Kombi (a Cabine escala o layout por ESCALA e DESLOCA)
const R = KOMBI_LAYOUT.radio.position
export const POS_RADIO: [number, number, number] = [R[0] * ESCALA[0] + DESLOCA[0], R[1] * ESCALA[1] + DESLOCA[1], R[2] * ESCALA[2] + DESLOCA[2]]

export type EstadoKombi = {
  partida: boolean; tocando: boolean; foco?: boolean; hiper?: number
  // vira o olhar (o estúdio pede o fundo da Kombi; fechar pede a frente)
  pedido?: { yaw: number; pitch: number } | null
  // com o estúdio aberto, arrastar não tira o foco de nada
  estudio?: boolean
  // o último toque foi o fim de um arrasto (pra olhar em volta): não abre nada
  arrastou?: boolean
}


// o rádio: um pouco à frente do rádio do layout (cobre o pequeno), virado pra cabeça
const CENTRO_RADIO = new THREE.Vector3(POS_RADIO[0] - 0.02, POS_RADIO[1] + 0.02, POS_RADIO[2] + 0.05)
const PARA_OLHO = new THREE.Vector3().subVectors(OLHO, CENTRO_RADIO).normalize()
// o foco: a cabeça inclina até ficar a ~40 cm da tela
const OLHO_FOCO = CENTRO_RADIO.clone().addScaledVector(PARA_OLHO, 0.4)

// ── o olhar: arrasta pra olhar em volta; solta e, depois de um tempo, volta pra frente ──
function Olhar({ estado, sairFoco }: { estado: React.RefObject<EstadoKombi>; sairFoco: () => void }) {
  const { camera, gl, size, scene } = useThree()
  // pros testes por dentro (só em dev): a cena, pra medir com raio
  useEffect(() => { if (process.env.NODE_ENV !== "production") (window as unknown as { __cena: unknown }).__cena = { scene, camera, THREE } }, [scene, camera])
  // em pé (celular): a lente abre (o mesmo campo na horizontal) e o olhar desce pro painel
  const emPe = size.width < size.height
  const base = emPe ? -0.2 : -0.12
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera, asp = size.width / size.height
    cam.fov = asp < 1 ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(72) / 2) / asp)) : 64
    cam.fov = Math.min(cam.fov, 118)
    cam.updateProjectionMatrix()
    o.current.fov0 = cam.fov
  }, [camera, size])
  const o = useRef({ yaw: 0, pitch: base, alvoYaw: 0, alvoPitch: base, arrasta: false, soltou: 0, x: 0, y: 0, x0: 0, y0: 0, f: 0, fov0: 0, partiu: false })
  useEffect(() => { o.current.alvoPitch = base }, [base])
  useEffect(() => {
    const el = gl.domElement
    const desce = (e: PointerEvent) => { o.current.arrasta = true; o.current.x = e.clientX; o.current.y = e.clientY; o.current.x0 = e.clientX; o.current.y0 = e.clientY }
    const move = (e: PointerEvent) => {
      const s = o.current
      if (!s.arrasta) return
      // o soltar se perdeu (soltou fora da janela): nenhum botão apertado, o arrasto acabou
      if (e.pointerType === "mouse" && e.buttons === 0) { s.arrasta = false; return }
      // arrastou com o rádio em foco: a cabeça volta pro banco
      if (estado.current?.foco) { if (Math.hypot(e.clientX - s.x0, e.clientY - s.y0) > 10) sairFoco(); else return }
      const k = 2.4 / Math.max(320, el.clientWidth)
      // (27/11) 360°: o giro é livre (sem trava dos lados)
      s.alvoYaw += (e.clientX - s.x) * k * 1.6
      s.alvoPitch = Math.max(-0.8, Math.min(0.6, s.alvoPitch + (e.clientY - s.y) * k))
      s.x = e.clientX; s.y = e.clientY
    }
    const sobe = (e: PointerEvent) => {
      if (!o.current.arrasta) return
      o.current.arrasta = false; o.current.soltou = performance.now()
      // arrastou pra olhar: soltar em cima de uma coisa não é tocar nela
      if (estado.current) estado.current.arrastou = Math.hypot(e.clientX - o.current.x0, e.clientY - o.current.y0) > 8
    }
    el.addEventListener("pointerdown", desce)
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", sobe)
    window.addEventListener("pointercancel", sobe)
    return () => { el.removeEventListener("pointerdown", desce); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", sobe); window.removeEventListener("pointercancel", sobe) }
  }, [gl, estado, sairFoco])
  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), s = o.current, t = st.clock.elapsedTime
    // (27/11) o olhar fica onde a pessoa deixou (não volta sozinho): é pra passear
    const e = estado.current
    if (e?.pedido) { pertoDe(s, e.pedido.yaw); s.alvoPitch = e.pedido.pitch; e.pedido = null }
    // a partida: o olhar volta pra frente pelo caminho mais curto
    if (e?.partida && !s.partiu) { s.partiu = true; s.arrasta = false; pertoDe(s, 0); s.alvoPitch = base }
    const r = s.arrasta ? 14 : e?.partida ? 1.6 : 3
    s.yaw += (s.alvoYaw - s.yaw) * Math.min(1, dt * r)
    s.pitch += (s.alvoPitch - s.pitch) * Math.min(1, dt * r)
    // o motor: marcha lenta treme de leve; a partida sacode e a Kombi anda
    const partida = !!estado.current?.partida
    const hi = estado.current?.hiper ?? 0
    // (27/11) sem degrau: o tremor cresce junto com o hiperlapso
    const treme = 0.0012 + hi * 0.012
    // a lente abre com a velocidade (o hiperlapso)
    const cam = camera as THREE.PerspectiveCamera
    if (!s.fov0) s.fov0 = cam.fov
    const fovAlvo = (s.fov0 ?? cam.fov) + hi * 34
    if (Math.abs(cam.fov - fovAlvo) > 0.05) { cam.fov = fovAlvo; cam.updateProjectionMatrix() }
    const fx = (Math.sin(t * 47) + Math.sin(t * 83.3) * 0.5) * treme
    const fy = (Math.sin(t * 59.1 + 1.3) + Math.sin(t * 97.7) * 0.5) * treme
    // respirar: a cabeça mexe um tiquinho (ninguém fica parado feito câmera)
    // e a Kombi flutua (voando no espaço): sobe e desce devagar
    const resp = Math.sin(t * 0.9) * 0.004 + Math.sin(t * 0.37) * 0.012
    // o foco no rádio: a cabeça vai até ele (e volta), suave
    s.f += ((estado.current?.foco && !partida ? 1 : 0) - s.f) * Math.min(1, dt * 4)
    const cp = Math.cos(s.pitch)
    tmpA.set(OLHO.x + fx, OLHO.y + fy + resp, OLHO.z).lerp(OLHO_FOCO, s.f)
    camera.position.copy(tmpA)
    tmpB.set(OLHO.x - Math.sin(s.yaw) * cp * 10, OLHO.y + Math.sin(s.pitch) * 10, OLHO.z - Math.cos(s.yaw) * cp * 10).lerp(CENTRO_RADIO, s.f)
    camera.lookAt(tmpB)
  })
  return null
}
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3()
// o alvo do giro no ângulo `a`, pelo caminho mais curto a partir de onde o olhar está
function pertoDe(s: { yaw: number; alvoYaw: number }, a: number) {
  const volta = Math.PI * 2
  s.yaw = ((s.yaw % volta) + volta) % volta
  if (s.yaw > Math.PI) s.yaw -= volta
  let d = (a - s.yaw) % volta
  if (d > Math.PI) d -= volta
  if (d < -Math.PI) d += volta
  s.alvoYaw = s.yaw + d
}

// ── lá fora: o espaço (27/11). A Kombi voa entre estrelas, nebulosas, planetas
// listrados, cometas que cruzam e supernovas que explodem lá longe. Tudo leve: texturas
// de canvas feitas uma vez, sprites e uma malha instanciada; por quadro só mexem as
// partículas, os cometas e as supernovas (sem alocar). ──

// um brilho redondo (o centro forte, a borda sumindo), feito uma vez
let _brilho: THREE.Texture | null = null
function texBrilho() {
  if (_brilho) return _brilho
  const c = document.createElement("canvas"); c.width = c.height = 128
  const g = c.getContext("2d")!, r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.18, "rgba(255,255,255,0.75)"); r.addColorStop(0.45, "rgba(255,255,255,0.18)"); r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  _brilho = new THREE.CanvasTexture(c); _brilho.colorSpace = THREE.SRGBColorSpace
  return _brilho
}
// a nuvem da nebulosa: manchas sobrepostas (irregular, não um círculo)
function texNebulosa(seed: number) {
  const c = document.createElement("canvas"); c.width = c.height = 256
  const g = c.getContext("2d")!
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
  for (let k = 0; k < 26; k++) {
    const x = 128 + (rnd() - 0.5) * 140, y = 128 + (rnd() - 0.5) * 110, rr = 30 + rnd() * 70
    const r = g.createRadialGradient(x, y, 0, x, y, rr)
    r.addColorStop(0, `rgba(255,255,255,${0.1 + rnd() * 0.12})`); r.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
// o planeta listrado (cores de desenho animado)
function texPlaneta(cores: string[]) {
  const c = document.createElement("canvas"); c.width = 16; c.height = 256
  const g = c.getContext("2d")!
  let y = 0, i = 0
  while (y < 256) { const h = 10 + ((i * 37) % 23); g.fillStyle = cores[i % cores.length]; g.fillRect(0, y, 16, h); y += h; i++ }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

const rndDe = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647 } }
// um ponto na casca de uma esfera (tudo em volta: dá pra olhar em 360°)
function naEsfera(rnd: () => number, r: number, v: THREE.Vector3) {
  const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, k = Math.sqrt(1 - u * u)
  return v.set(Math.cos(a) * k * r, u * r * 0.6, Math.sin(a) * k * r)
}

function Espaco({ estado }: { estado: React.RefObject<EstadoKombi> }) {
  const ceu = useRef<THREE.Group>(null)
  const brilho = useMemo(() => texBrilho(), [])
  const nebulosas = useMemo(() => {
    const cores = ["#ff3fb0", "#2fe8ff", "#8a5cff", "#ff8a3d", "#3dffb0", "#ff3f6e"]
    const rnd = rndDe(31), v = new THREE.Vector3()
    return Array.from({ length: 7 }, (_, i) => ({ pos: naEsfera(rnd, 900, v).toArray() as [number, number, number], tam: 420 + rnd() * 420, cor: cores[i % cores.length], tex: texNebulosa(100 + i * 7), gira: rnd() * 6 }))
  }, [])
  const planetas = useMemo(() => [
    { pos: [420, 150, -760] as [number, number, number], r: 95, tex: texPlaneta(["#ff6ac1", "#ffd23f", "#ff8a3d", "#b38cff", "#ff3fb0"]), anel: "#2fe8ff" },
    { pos: [-520, -90, -420] as [number, number, number], r: 38, tex: texPlaneta(["#2fe8ff", "#3dffb0", "#1c7a8c"]), anel: null },
    { pos: [-300, 220, 640] as [number, number, number], r: 70, tex: texPlaneta(["#8a5cff", "#ff3fb0", "#2a1460", "#ffc857"]), anel: "#ffc857" },
  ], [])
  useEffect(() => () => { nebulosas.forEach((n) => n.tex.dispose()); planetas.forEach((p) => p.tex.dispose()) }, [nebulosas, planetas])

  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    // o céu gira devagar (a Kombi vai fazendo a curva no espaço)
    if (ceu.current) ceu.current.rotation.y += dt * (0.004 + (estado.current?.hiper ?? 0) * 0.02)
  })
  return (
    <>
      <color attach="background" args={["#04020a"]} />
      <group ref={ceu}>
        <Stars radius={500} depth={260} count={5200} factor={7} saturation={0.9} fade speed={0.8} />
        {nebulosas.map((n, i) => (
          <sprite key={i} position={n.pos} scale={[n.tam, n.tam * 0.7, 1]}>
            <spriteMaterial map={n.tex} color={n.cor} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} rotation={n.gira} />
          </sprite>
        ))}
        {planetas.map((p, i) => (
          <group key={i} position={p.pos} rotation={[0.35, 0, 0.3]}>
            <mesh><sphereGeometry args={[p.r, 40, 24]} /><meshBasicMaterial map={p.tex} toneMapped={false} /></mesh>
            {/* o brilho em volta (a atmosfera) */}
            <sprite scale={[p.r * 3.2, p.r * 3.2, 1]}><spriteMaterial map={brilho} color={p.anel ?? "#2fe8ff"} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} /></sprite>
            {p.anel && <mesh rotation-x={Math.PI / 2.3}><ringGeometry args={[p.r * 1.4, p.r * 1.9, 64]} /><meshBasicMaterial color={p.anel} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} /></mesh>}
          </group>
        ))}
        <Supernovas brilho={brilho} />
      </group>
      <Cometas brilho={brilho} />
      <Particulas estado={estado} />
    </>
  )
}

// as supernovas: estrelas lá longe que acendem num clarão e somem devagar, uma de cada vez
const N_NOVAS = 6
function Supernovas({ brilho }: { brilho: THREE.Texture }) {
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const aneis = useRef<(THREE.Sprite | null)[]>([])
  const novas = useMemo(() => {
    const rnd = rndDe(77), v = new THREE.Vector3(), cores = ["#ffffff", "#bff9ff", "#ffd6f0", "#fff1b0"]
    return Array.from({ length: N_NOVAS }, (_, i) => ({ pos: naEsfera(rnd, 820, v).toArray() as [number, number, number], cor: cores[i % cores.length], quando: 1.5 + i * 2.7 + rnd() * 2, dura: 3.5 + rnd() * 2.5, tam: 60 + rnd() * 70 }))
  }, [])
  useFrame((st) => {
    const t = st.clock.elapsedTime
    novas.forEach((n, i) => {
      if (t > n.quando + n.dura) n.quando = t + 4 + ((i * 53) % 9) // a próxima, daqui a pouco
      const u = Math.max(0, (t - n.quando) / n.dura) // 0 → 1 durante a explosão
      const vivo = t >= n.quando && u <= 1
      // o clarão: acende rápido, apaga devagar; o anel abre
      const luz = vivo ? Math.min(1, u * 12) * Math.pow(1 - u, 1.6) : 0
      const s = refs.current[i], a = aneis.current[i]
      if (s) { s.visible = luz > 0.01; s.scale.setScalar(n.tam * (0.4 + luz * 1.2)); (s.material as THREE.SpriteMaterial).opacity = luz }
      if (a) { a.visible = vivo; a.scale.setScalar(n.tam * (0.5 + u * 4)); (a.material as THREE.SpriteMaterial).opacity = vivo ? 0.5 * (1 - u) : 0 }
    })
  })
  return (
    <>
      {novas.map((n, i) => (
        <group key={i} position={n.pos}>
          <sprite ref={(el) => { refs.current[i] = el }} visible={false}><spriteMaterial map={brilho} color={n.cor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
          <sprite ref={(el) => { aneis.current[i] = el }} visible={false}><spriteMaterial map={texAnel()} color="#ff9ae0" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
        </group>
      ))}
    </>
  )
}
// o anel da onda de choque
let _anel: THREE.Texture | null = null
function texAnel() {
  if (_anel) return _anel
  const c = document.createElement("canvas"); c.width = c.height = 128
  const g = c.getContext("2d")!, r = g.createRadialGradient(64, 64, 40, 64, 64, 64)
  r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(0.7, "rgba(255,255,255,0.8)"); r.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  _anel = new THREE.CanvasTexture(c)
  return _anel
}

// os cometas: a cabeça brilhando e a cauda comprida, cruzando o céu e voltando por outro lado
const N_COMETAS = 5
function Cometas({ brilho }: { brilho: THREE.Texture }) {
  const grupos = useRef<(THREE.Group | null)[]>([])
  const rnd = useMemo(() => rndDe(909), [])
  const cometas = useMemo(() => Array.from({ length: N_COMETAS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), vida: 0, dura: 1 })), [])
  const nasce = (c: (typeof cometas)[number], t0: number) => {
    const v = new THREE.Vector3()
    naEsfera(rnd, 520 + rnd() * 200, c.p)
    // atravessa: vai pra um ponto do outro lado, devagar e às vezes rápido
    naEsfera(rnd, 520, v).multiplyScalar(-1).add(new THREE.Vector3((rnd() - 0.5) * 400, (rnd() - 0.5) * 200, (rnd() - 0.5) * 400))
    const vel = 40 + rnd() * 90
    c.v.subVectors(v, c.p).normalize().multiplyScalar(vel)
    c.dura = c.p.distanceTo(v) / vel
    c.vida = t0
  }
  const alvo = useMemo(() => new THREE.Vector3(), [])
  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), t = st.clock.elapsedTime
    cometas.forEach((c, i) => {
      if (c.vida === 0) { nasce(c, t + i * 3.2); c.p.addScaledVector(c.v, -i * 3.2) }
      if (t - c.vida > c.dura) nasce(c, t)
      c.p.addScaledVector(c.v, dt)
      const g = grupos.current[i]
      if (!g) return
      g.position.copy(c.p)
      g.lookAt(alvo.copy(c.p).add(c.v))
      // aparece e some nas pontas do caminho (nunca surge do nada)
      const u = (t - c.vida) / c.dura
      g.scale.setScalar(Math.max(0, Math.min(1, Math.min(u, 1 - u) * 6)))
    })
  })
  return (
    <>
      {cometas.map((_, i) => (
        <group key={i} ref={(el) => { grupos.current[i] = el }}>
          <sprite scale={[14, 14, 1]}><spriteMaterial map={brilho} color="#e8fbff" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
          {/* a cauda: um cone deitado pra trás, que some na ponta */}
          <mesh position={[0, 0, -55]} rotation-x={-Math.PI / 2}>
            <coneGeometry args={[3.2, 110, 12, 1, true]} />
            <meshBasicMaterial color={i % 2 ? "#7df9ff" : "#ff9ae0"} transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </>
  )
}

// ── as partículas que passam pela Kombi: devagar é poeira de estrela (a Kombi voando);
// na partida, as MESMAS aceleram e esticam até virarem os riscos do hiperlapso (sem
// degrau, sem trocar de efeito no meio) ──
const N_RISCOS = 520
function Particulas({ estado }: { estado: React.RefObject<EstadoKombi> }) {
  const malha = useRef<THREE.InstancedMesh>(null)
  const inicio = useRef<number | null>(null)
  const vel = useRef(0)
  const riscos = useMemo(() => { const rnd = rndDe(222); return Array.from({ length: N_RISCOS }, (_, i) => {
    const a = rnd() * Math.PI * 2, r = 5 + Math.pow(rnd(), 0.6) * 90
    return { x: Math.cos(a) * r, y: Math.sin(a) * r * 0.7, z: -10 - rnd() * 610, cor: i % 5 === 0 ? "#ff3fb0" : i % 3 === 0 ? "#ffc857" : "#7df9ff" }
  }) }, [])
  const tmp = useMemo(() => new THREE.Object3D(), [])
  const cor = useMemo(() => new THREE.Color(), [])
  useLayoutEffect(() => {
    const m = malha.current
    if (!m) return
    riscos.forEach((r, i) => m.setColorAt(i, cor.set(r.cor)))
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [riscos, cor])
  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw), e = estado.current
    let hi = 0
    if (e?.partida) {
      if (inicio.current === null) inicio.current = st.clock.elapsedTime
      hi = curvaHiper(st.clock.elapsedTime - inicio.current)
    } else inicio.current = null
    if (e) e.hiper = hi
    const m = malha.current
    if (!m) return
    // a velocidade segue a curva com um amortecedor (nenhum quadro dá salto)
    const alvo = 9 + hi * 900
    vel.current += (alvo - vel.current) * Math.min(1, dt * 6)
    const v = vel.current, comp = 0.35 + (v / 900) * 60
    for (let i = 0; i < N_RISCOS; i++) {
      const r = riscos[i]
      r.z += v * dt
      if (r.z > 4) r.z -= 620
      tmp.position.set(r.x, r.y, r.z)
      tmp.scale.set(1, 1, comp)
      tmp.updateMatrix()
      m.setMatrixAt(i, tmp.matrix)
    }
    m.instanceMatrix.needsUpdate = true
    ;(m.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.min(0.45, hi)
  })
  return (
    <instancedMesh ref={malha} args={[undefined, undefined, N_RISCOS]} frustumCulled={false}>
      <boxGeometry args={[0.07, 0.07, 1]} />
      <meshBasicMaterial transparent opacity={0.55} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}

const VIOLAO_POS: [number, number, number] = [0.44, 1.1, -0.36]
const VIOLAO_ROT: [number, number, number] = [-0.22, 0, -0.26]
// ── o violão no banco do carona: tocar nele abre o braço com as notas ──
function Violao3D({ onTocar }: { onTocar: () => void }) {
  const g = useRef<THREE.Group>(null)
  const brilho = useRef<THREE.MeshBasicMaterial>(null)
  const [perto, setPerto] = useState(false)
  // (27/11, o dono: "bugado no banco") sentado em cima do assento (não afundado nele),
  // a boca virada pro motorista e o braço deitado pra trás, encostado no encosto
  useLayoutEffect(() => { const x = g.current; if (!x) return; x.lookAt(OLHO.x, x.position.y, OLHO.z) }, [])
  useFrame((st) => { if (brilho.current) brilho.current.opacity = (perto ? 0.5 : 0.18) + Math.sin(st.clock.elapsedTime * 2.4) * 0.08 })
  const madeira = "#c47a35", tampo = "#e0a65c", escuro = "#2a160b"
  return (
    <group ref={g} position={VIOLAO_POS}>
      <group rotation={VIOLAO_ROT} scale={0.6}
        onClick={(e) => { e.stopPropagation(); onTocar() }}
        onPointerOver={(e) => { e.stopPropagation(); setPerto(true); document.body.style.cursor = "pointer" }}
        onPointerOut={() => { setPerto(false); document.body.style.cursor = "" }}>
        {/* o corpo: a parte de baixo maior, a de cima menor (o 8 do violão) */}
        <mesh position={[0, 0.2, 0]} scale={[1, 1, 0.26]}><sphereGeometry args={[0.19, 28, 18]} /><meshStandardMaterial color={madeira} roughness={0.45} /></mesh>
        <mesh position={[0, 0.44, 0]} scale={[1, 1, 0.26]}><sphereGeometry args={[0.145, 28, 18]} /><meshStandardMaterial color={madeira} roughness={0.45} /></mesh>
        {/* o tampo claro e a boca */}
        <mesh position={[0, 0.2, 0.05]}><circleGeometry args={[0.17, 32]} /><meshStandardMaterial color={tampo} roughness={0.5} /></mesh>
        <mesh position={[0, 0.44, 0.039]}><circleGeometry args={[0.128, 32]} /><meshStandardMaterial color={tampo} roughness={0.5} /></mesh>
        <mesh position={[0, 0.33, 0.052]}><circleGeometry args={[0.055, 28]} /><meshBasicMaterial color="#0d0604" /></mesh>
        <mesh position={[0, 0.33, 0.051]}><ringGeometry args={[0.058, 0.068, 28]} /><meshBasicMaterial color="#ff3fb0" toneMapped={false} /></mesh>
        {/* o cavalete, o braço e a cabeça */}
        <mesh position={[0, 0.14, 0.055]}><boxGeometry args={[0.11, 0.022, 0.012]} /><meshStandardMaterial color={escuro} /></mesh>
        <mesh position={[0, 0.82, 0.02]}><boxGeometry args={[0.052, 0.62, 0.03]} /><meshStandardMaterial color={escuro} roughness={0.6} /></mesh>
        <mesh position={[0, 1.18, 0.012]} rotation-x={-0.25}><boxGeometry args={[0.075, 0.16, 0.022]} /><meshStandardMaterial color={escuro} /></mesh>
        {/* as cordas */}
        {[-0.018, -0.011, -0.004, 0.004, 0.011, 0.018].map((x) => (
          <mesh key={x} position={[x, 0.66, 0.058]}><boxGeometry args={[0.0018, 1.04, 0.0018]} /><meshBasicMaterial color="#f4eede" /></mesh>
        ))}
        {/* o brilho que chama (pulsa devagar; mais forte com o mouse em cima) */}
        <sprite position={[0, 0.3, 0.1]} scale={[0.75, 0.9, 1]}><spriteMaterial ref={brilho} map={texBrilho()} color="#b38cff" transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
      </group>
    </group>
  )
}

// ── a MPC (27/11, o dono): menor, em cima da mesa do estúdio, lá atrás, ao lado do
// teclado MIDI. Tocar nela abre a batida ──
const MPC_MESA = { position: aMundo(-0.33, 0.84, 1.52), rotation: [0.12, Math.PI, 0] as [number, number, number], size: [0.2, 0.03, 0.2] as [number, number, number], color: "#ff8a3d" }
// (27/11, o dono) o toque vale pra mesa inteira do estúdio, em volta da MPC: monitor, caixas
// de som, o MIDI e a MPC (uma caixa invisível por cima); com o dedo em cima, a mesa acende
const MESA_POS = aMundo(-0.04, 1.0, 1.61)
const MESA_TAM: [number, number, number] = [1.2 * ESCALA[0], 0.48 * ESCALA[1], 0.4 * ESCALA[2]]
function MpcNaMesa({ tocando, onTocar }: { tocando: boolean; onTocar: () => void }) {
  const brilho = useRef<THREE.SpriteMaterial>(null)
  const [perto, setPerto] = useState(false)
  useFrame((st) => { if (brilho.current) brilho.current.opacity = (perto ? 0.35 : 0.08) + Math.sin(st.clock.elapsedTime * 1.9 + 2) * 0.04 })
  return (
    <group
      onClick={(e) => { e.stopPropagation(); onTocar() }}
      onPointerOver={(e) => { e.stopPropagation(); setPerto(true); document.body.style.cursor = "pointer" }}
      onPointerOut={() => { setPerto(false); document.body.style.cursor = "" }}>
      <PadsMPC part={MPC_MESA} isPlaying={tocando} />
      <mesh position={MESA_POS}><boxGeometry args={MESA_TAM} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      <sprite position={MESA_POS} scale={[1.6, 0.9, 1]}><spriteMaterial ref={brilho} map={texBrilho()} color="#ff8a3d" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
    </group>
  )
}

// ── os teclados (os dois sintetizadores na lateral e o MIDI da mesa, lá atrás): são da
// malha parada do estúdio, então o toque é numa caixa invisível por cima de cada um ──
function aMundo(x: number, y: number, z: number): [number, number, number] {
  return [x * ESCALA[0] + DESLOCA[0], y * ESCALA[1] + DESLOCA[1], z * ESCALA[2] + DESLOCA[2]]
}
const TECLADOS: { pos: [number, number, number]; tam: [number, number, number] }[] = [
  { pos: aMundo(0.6, 0.72, 0.95), tam: [0.3, 0.42, 0.95] }, // os dois do suporte (o MIDI da mesa é do estúdio)
]
function Teclados({ onTocar }: { onTocar: () => void }) {
  const brilho = useRef<THREE.SpriteMaterial>(null)
  const [perto, setPerto] = useState(false)
  useFrame((st) => { if (brilho.current) brilho.current.opacity = (perto ? 0.45 : 0.12) + Math.sin(st.clock.elapsedTime * 2.1 + 1) * 0.06 })
  return (
    <group
      onClick={(e) => { e.stopPropagation(); onTocar() }}
      onPointerOver={(e) => { e.stopPropagation(); setPerto(true); document.body.style.cursor = "pointer" }}
      onPointerOut={() => { setPerto(false); document.body.style.cursor = "" }}>
      {TECLADOS.map((t, i) => (
        <mesh key={i} position={t.pos}><boxGeometry args={t.tam} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
      ))}
      <sprite position={TECLADOS[0].pos} scale={[0.9, 0.9, 1]}><spriteMaterial ref={brilho} map={texBrilho()} color="#6ff0d6" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
    </group>
  )
}

// ── a gaveta dos discos (27/11, o dono): a caixa quadrada embaixo do toca-discos. Tocar no
// toca-discos (ou nela) e ela desliza pra fora; dentro, os discos antigos de pé, lado a lado,
// como um pacote de bolacha deitado. Tocar num disco põe ele pra tocar (o que está tocando
// sobe e brilha); tocar nele de novo, para ──
export type GavetaProps = {
  aberta: boolean
  cores: string[] // uma cor de selo por disco
  tocando: number | null
  onAbrir: () => void
  onEscolher: (i: number) => void
  onPerto: (i: number | null) => void
}
// a frente da caixa do toca-discos (medida na cena), virada como ele
const GAVETA_POS: [number, number, number] = [0.45, 1.3, -1.44]
const GAVETA_GIRO = 0.15
const GW = 0.36, GH = 0.11, GD = 0.26, SAI = 0.25
function Gaveta({ aberta, cores, tocando, onAbrir, onEscolher, onPerto }: GavetaProps) {
  const corpo = useRef<THREE.Group>(null)
  const discos = useRef<(THREE.Group | null)[]>([])
  const [perto, setPerto] = useState<number | null>(null)
  const passo = Math.min(0.045, (GW - 0.06) / Math.max(1, cores.length))
  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const g = corpo.current
    if (g) g.position.z += ((aberta ? SAI : 0) - g.position.z) * Math.min(1, dt * 7)
    discos.current.forEach((d, i) => {
      if (!d) return
      const alvo = i === tocando ? 0.05 : i === perto ? 0.025 : 0
      d.position.y += (alvo - d.position.y) * Math.min(1, dt * 10)
    })
  })
  const madeira = "#5a3a1a", escura = "#2e1c0c"
  const sobre = (i: number | null) => { setPerto(i); onPerto(i); document.body.style.cursor = i === null ? "" : "pointer" }
  return (
    <group position={GAVETA_POS} rotation-y={GAVETA_GIRO}>
      <group ref={corpo}>
        {/* a caixa: fundo, lados, trás e a frente com o puxador (a frente é o que se vê fechada) */}
        <mesh position={[0, -GH / 2 + 0.006, -GD / 2]}><boxGeometry args={[GW, 0.012, GD]} /><meshStandardMaterial color={escura} roughness={0.8} /></mesh>
        {[-1, 1].map((l) => <mesh key={l} position={[l * (GW / 2 - 0.006), 0, -GD / 2]}><boxGeometry args={[0.012, GH, GD]} /><meshStandardMaterial color={madeira} roughness={0.7} /></mesh>)}
        <mesh position={[0, 0, -GD + 0.006]}><boxGeometry args={[GW, GH, 0.012]} /><meshStandardMaterial color={madeira} roughness={0.7} /></mesh>
        <group onClick={(e) => { e.stopPropagation(); onAbrir() }}
          onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = "pointer" }}
          onPointerOut={() => { document.body.style.cursor = "" }}>
          <mesh position={[0, 0, 0.008]}><boxGeometry args={[GW + 0.012, GH + 0.01, 0.016]} /><meshStandardMaterial color={madeira} roughness={0.6} /></mesh>
          <mesh position={[0, 0, 0.022]} rotation-x={Math.PI / 2}><cylinderGeometry args={[0.011, 0.011, 0.014, 16]} /><meshStandardMaterial color="#d8c8a0" metalness={0.6} roughness={0.3} /></mesh>
          {/* um fio de neon na borda: chama o dedo */}
          <mesh position={[0, -GH / 2 - 0.002, 0.017]}><boxGeometry args={[GW, 0.004, 0.004]} /><meshBasicMaterial color="#ffc857" toneMapped={false} /></mesh>
        </group>
        {/* os discos de pé, lado a lado, inclinados de leve (como bolacha no pacote) */}
        {cores.map((cor, i) => {
          const x = -((cores.length - 1) * passo) / 2 + i * passo
          return (
            <group key={i} position={[x, 0, -GD / 2]}>
              {/* o toque: a fatia inteira do disco na gaveta (o disco é fino; de longe, um cobre o outro) */}
              <mesh position={[0, 0.03, 0]}
                onClick={(e) => { e.stopPropagation(); onEscolher(i) }}
                onPointerOver={(e) => { e.stopPropagation(); sobre(i) }}
                onPointerOut={() => sobre(null)}>
                <boxGeometry args={[passo * 0.98, 0.2, 0.2]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              <group ref={(r) => { discos.current[i] = r }}>
                <group position={[0, 0.03, 0]} rotation={[0, Math.PI / 2, 0.12]}>
                  <mesh rotation-x={Math.PI / 2}><cylinderGeometry args={[0.085, 0.085, 0.006, 40]} /><meshStandardMaterial color="#0b0b0d" roughness={0.35} metalness={0.2} /></mesh>
                  {[-1, 1].map((l) => (
                    <mesh key={l} position={[0, 0, l * 0.0035]} rotation-y={l < 0 ? Math.PI : 0}><circleGeometry args={[0.03, 24]} /><meshBasicMaterial color={cor} toneMapped={false} /></mesh>
                  ))}
                  {/* a borda colorida: dá pra saber qual é olhando de cima */}
                  <mesh><torusGeometry args={[0.085, 0.0035, 6, 40]} /><meshBasicMaterial color={i === tocando ? "#ffffff" : cor} toneMapped={false} /></mesh>
                  {i === tocando && <sprite scale={[0.3, 0.3, 1]}><spriteMaterial map={texBrilho()} color={cor} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>}
                </group>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

export type RadioDaKombi = Omit<RadioPainelProps, "focado" | "onFoco">

// (27/11, o dono) cada coisa da Kombi é clicável: o rádio toca a música dele, a MPC abre a
// batida, o toca-discos o acervo antigo, o violão e o teclado abrem pra tocar (no tom da música)
export function KombiEntrada({ estado, radio, disco, onBatida, onDisco, onViolao, onTeclado, gaveta }: {
  estado: React.RefObject<EstadoKombi>; radio: RadioDaKombi; disco: boolean
  onBatida?: () => void; onDisco?: () => void; onViolao?: () => void; onTeclado?: () => void
  gaveta?: GavetaProps
}) {
  // a cabine pede refs da estrada: parada, sem curva, volante reto
  const zero = useRef(0), volante = useRef(0), vel = useRef(0)
  const [focado, setFocado] = useState(false)
  const foco = (sim: boolean) => { estado.current.foco = sim; setFocado(sim) }
  const sairFoco = useRef(() => foco(false)).current
  // só vale como toque se não foi o fim de um arrasto (ver Olhar)
  const toque = <A extends unknown[]>(f?: (...a: A) => void) => f && ((...a: A) => { if (!estado.current.arrastou) f(...a) })
  const batida = toque(onBatida), discoT = toque(onDisco), violaoT = toque(onViolao), tecladoT = toque(onTeclado)
  const gavetaT = gaveta && { ...gaveta, onAbrir: toque(gaveta.onAbrir)!, onEscolher: toque(gaveta.onEscolher)! }
  return (
    <Canvas className="en-canvas" onPointerMissed={() => { if (estado.current.foco) foco(false) }} dpr={[1, 2]} camera={{ fov: 64, near: 0.03, far: 2000, position: [OLHO.x, OLHO.y, OLHO.z] }} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <Velocimetro estado={estado} vel={vel} />
      <hemisphereLight args={["#8f7dff", "#0b1a3a", 1.2]} />
      <ambientLight intensity={0.35} color="#7f8cff" />
      {/* a luz de dentro: quente em cima, o rosa do neon por baixo do painel */}
      <pointLight position={[0, OLHO.y + 0.35, OLHO.z + 0.2]} intensity={1.4} distance={3.2} color="#ffd6a0" />
      <pointLight position={[POS_RADIO[0], POS_RADIO[1] - 0.15, POS_RADIO[2] + 0.25]} intensity={0.9} distance={1.6} color="#ff3fb0" />
      <Suspense fallback={null}>
        <Cabine balanco={zero} disco={disco} objetos={[]} carona={null} onTocaDiscos={discoT} semMpc volante={volante} vel={vel} tinta="#ffffff" neon="#ff3fb0" />
      </Suspense>
      <RadioNoPainel>
        <RadioPainel3D {...radio} focado={focado} onFoco={() => foco(true)} />
      </RadioNoPainel>
      {violaoT && <Violao3D onTocar={violaoT} />}
      {tecladoT && <Teclados onTocar={tecladoT} />}
      {batida && <MpcNaMesa tocando={disco || radio.tocando} onTocar={batida} />}
      {gavetaT && <Gaveta {...gavetaT} />}
      <Espaco estado={estado} />
      <Olhar estado={estado} sairFoco={sairFoco} />
    </Canvas>
  )
}

// o velocímetro do painel sobe na partida
function Velocimetro({ estado, vel }: { estado: React.RefObject<EstadoKombi>; vel: React.RefObject<number> }) {
  useFrame((_, dt) => {
    const alvo = estado.current?.partida ? 22 : 0
    vel.current = (vel.current ?? 0) + (alvo - (vel.current ?? 0)) * Math.min(1, dt * 0.8)
  })
  return null
}

// o rádio no centro do painel, de frente pra cabeça do motorista
function RadioNoPainel({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  useLayoutEffect(() => { g.current?.position.copy(CENTRO_RADIO); g.current?.lookAt(OLHO) }, [])
  return <group ref={g}>{children}</group>
}

