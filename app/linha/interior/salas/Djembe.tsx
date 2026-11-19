"use client"

// O DJEMBÊ (T06, 30/10): o tambor de verdade na casa da D-Bee.
// O MODELO (06/11): o djembê modelado no Blender (blender/scripts/instrumentos.py,
// nó "djembe" de public/models/instrumentos.glb: a taça de madeira, o couro com a
// borda descendo por cima do aro, as cordas azuis em V), na escala de antes (a
// pele no ALTO). A pele que responde ao toque continua em código, por cima do
// couro do modelo (só a borda dele aparece). Se o .glb não carregar (ou enquanto
// carrega), fica o djembê feito em código de antes (Corpo).
//
// O dele é tocável: o toque na pele vira r (0 centro, 1 borda), o ângulo e a
// força (disco/tamborVivo.ts) e o minijogo (disco/Tambor.tsx) decide o tempo e
// o som. A pele responde no lugar do golpe: uma onda que abre (maior quanto
// mais forte) e um brilho. O dela mostra as mãos dela batendo, no lugar e na
// hora de cada golpe (o relógio é o do áudio), pra você acompanhar.
//
// Desempenho: geometrias, texturas e materiais criados uma vez e divididos
// pelos dois (os do modelo são os mesmos dos instrumentos da casa,
// disco/InstrumentosCasa.tsx); nenhuma luz própria; por quadro só mexe em
// posição, escala e opacidade (nada é criado).

import { useGLTF } from "@react-three/drei"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import type { V3 } from "../comum"
import { carregarTambor } from "../../disco/tamborSom"
import { INSTRUMENTOS_GLB, MG } from "../../disco/InstrumentosCasa"
import { ModeloSeguro } from "../../estrada/Seguro"
import { TAMBOR_VIVO, forcaDoToque, type Toque } from "../../disco/tamborVivo"

const R = 0.165 // o raio da pele
const ALTO = 0.6
const CORDAS = 18

let kit: ReturnType<typeof criarKit> | null = null
function criarKit() {
  // o perfil da taça e do pé, girado
  const perfil: [number, number][] = [
    [0.001, 0], [0.122, 0], [0.13, 0.012], [0.124, 0.04], [0.1, 0.11], [0.078, 0.2], [0.07, 0.26], [0.074, 0.3],
    [0.095, 0.345], [0.128, 0.4], [0.152, 0.45], [0.166, 0.5], [0.171, 0.54], [0.169, ALTO - 0.012], [0.163, ALTO - 0.004],
  ]
  const corpo = new THREE.LatheGeometry(perfil.map(([x, y]) => new THREE.Vector2(x, y)), 30)
  // a madeira: veios no sentido da altura e as faixas entalhadas
  const cm = document.createElement("canvas"); cm.width = 128; cm.height = 128
  const g = cm.getContext("2d")!
  const fundo = g.createLinearGradient(0, 0, 0, 128)
  fundo.addColorStop(0, "#5a3218"); fundo.addColorStop(0.5, "#7a4824"); fundo.addColorStop(1, "#6a3c1c")
  g.fillStyle = fundo; g.fillRect(0, 0, 128, 128)
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = rnd() < 0.5 ? `rgba(30,14,4,${0.15 + rnd() * 0.3})` : `rgba(160,100,50,${0.1 + rnd() * 0.2})`
    g.lineWidth = 0.5 + rnd() * 1.5
    const x = rnd() * 128
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rnd() * 6 - 3, 40, x + rnd() * 6 - 3, 90, x + rnd() * 4 - 2, 128); g.stroke()
  }
  // as faixas entalhadas (no pé e na cintura) e os triângulos
  for (const v of [0.1, 0.42, 0.5]) { g.fillStyle = "rgba(20,8,2,0.55)"; g.fillRect(0, v * 128, 128, 3) }
  g.fillStyle = "rgba(20,8,2,0.4)"
  for (let i = 0; i < 8; i++) { const x = i * 16; g.beginPath(); g.moveTo(x, 0.42 * 128); g.lineTo(x + 8, 0.5 * 128); g.lineTo(x + 16, 0.42 * 128); g.closePath(); g.fill() }
  const texMadeira = new THREE.CanvasTexture(cm)
  texMadeira.wrapS = THREE.RepeatWrapping
  texMadeira.repeat.set(3, 1)
  texMadeira.colorSpace = THREE.SRGBColorSpace
  const madeira = new THREE.MeshStandardMaterial({ map: texMadeira, roughness: 0.62, metalness: 0 })

  // a pele de cabra: creme, o centro mais escuro (onde a mão gasta), a borda queimada
  const cp = document.createElement("canvas"); cp.width = 128; cp.height = 128
  const p = cp.getContext("2d")!
  const rad = p.createRadialGradient(64, 64, 4, 64, 64, 64)
  rad.addColorStop(0, "#b8956a"); rad.addColorStop(0.3, "#d8bf94"); rad.addColorStop(0.82, "#e6d3ae"); rad.addColorStop(0.95, "#a88660"); rad.addColorStop(1, "#5a3a20")
  p.fillStyle = rad; p.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 260; i++) {
    p.fillStyle = `rgba(${rnd() < 0.5 ? "90,60,30" : "255,245,220"},${0.04 + rnd() * 0.08})`
    p.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 3, 1)
  }
  // um anel leve: até aqui é o grave (só pra guiar a mão)
  p.strokeStyle = "rgba(90,55,25,0.18)"; p.lineWidth = 1.2
  p.beginPath(); p.arc(64, 64, 64 * 0.4, 0, Math.PI * 2); p.stroke()
  const texPele = new THREE.CanvasTexture(cp)
  texPele.colorSpace = THREE.SRGBColorSpace
  const pele = new THREE.CircleGeometry(R, 40)
  pele.rotateX(-Math.PI / 2)

  const aroCima = new THREE.TorusGeometry(R + 0.006, 0.011, 6, 36)
  aroCima.rotateX(Math.PI / 2)
  const aroBaixo = new THREE.TorusGeometry(0.14, 0.008, 6, 32)
  aroBaixo.rotateX(Math.PI / 2)
  const corda = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4, 1, true)
  const matCorda = new THREE.MeshStandardMaterial({ color: "#d8c8a0", roughness: 0.9 })
  const matAro = new THREE.MeshStandardMaterial({ color: "#3a2a1a", roughness: 0.8 })
  // as cordas em V: do aro de cima ao de baixo, alternando o lado
  const cordas: THREE.Matrix4[] = []
  const yA = ALTO - 0.02, yB = 0.43, rA = R + 0.008, rB = 0.142
  const a = new THREE.Vector3(), b = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < CORDAS; i++) {
    const t = (i / CORDAS) * Math.PI * 2
    const d = (i % 2 ? 1 : -1) * (Math.PI / CORDAS)
    a.set(Math.cos(t) * rA, yA, Math.sin(t) * rA)
    b.set(Math.cos(t + d) * rB, yB, Math.sin(t + d) * rB)
    const meio = a.clone().add(b).multiplyScalar(0.5)
    const dir = b.clone().sub(a)
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())
    cordas.push(new THREE.Matrix4().compose(meio, q, new THREE.Vector3(1, dir.length(), 1)))
  }
  const onda = new THREE.RingGeometry(0.8, 1, 36)
  onda.rotateX(-Math.PI / 2)
  const ponto = new THREE.CircleGeometry(1, 16)
  ponto.rotateX(-Math.PI / 2)
  const mao = new THREE.SphereGeometry(1, 12, 8)
  const pega = new THREE.CircleGeometry(R * 2.4, 16)
  pega.rotateX(-Math.PI / 2)
  return { corpo, madeira, pele, texPele, aroCima, aroBaixo, corda, matCorda, matAro, cordas, onda, ponto, mao, pega }
}

function useKit() {
  return useMemo(() => (kit ??= criarKit()), [])
}

// a onda e o brilho de um golpe na pele (uma por tambor, reaproveitada).
// Tudo criado uma vez aqui dentro; a cena só mostra (<primitive>)
function criarGolpe() {
  const k = kit!
  const matOnda = new THREE.MeshBasicMaterial({ color: "#fff2d0", transparent: true, opacity: 0, depthWrite: false, toneMapped: false })
  const matPonto = new THREE.MeshBasicMaterial({ color: "#ffd890", transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending })
  const pele = new THREE.MeshStandardMaterial({ map: k.texPele, roughness: 0.85, emissive: new THREE.Color("#ffb060"), emissiveIntensity: 0 })
  const onda = new THREE.Mesh(k.onda, matOnda)
  const ponto = new THREE.Mesh(k.ponto, matPonto)
  onda.visible = ponto.visible = false
  // anima o último golpe (desde `dt` segundos)
  const mostrar = (t: Toque | null, dt: number) => {
    if (!t || dt < 0 || dt > 0.6) {
      onda.visible = false; ponto.visible = false; pele.emissiveIntensity = 0
      return
    }
    const x = Math.cos(t.ang) * t.r * R * 0.95, z = Math.sin(t.ang) * t.r * R * 0.95
    const q = dt / 0.6
    onda.visible = true; ponto.visible = true
    onda.position.set(x, ALTO + 0.003, z)
    onda.scale.setScalar(0.01 + (1 - Math.pow(1 - q, 2)) * R * (0.45 + 0.8 * t.forca))
    matOnda.opacity = (1 - q) * (0.35 + 0.5 * t.forca)
    ponto.position.set(x, ALTO + 0.004, z)
    ponto.scale.setScalar(0.018 + 0.02 * t.forca)
    matPonto.opacity = Math.exp(-dt / 0.12) * (0.5 + 0.5 * t.forca)
    pele.emissiveIntensity = Math.exp(-dt / 0.1) * (0.12 + 0.35 * t.forca)
  }
  const liberar = () => { matOnda.dispose(); matPonto.dispose(); pele.dispose() }
  return { onda, ponto, pele, mostrar, liberar }
}
function useGolpe() {
  useKit()
  const g = useMemo(() => criarGolpe(), [])
  useEffect(() => g.liberar, [g])
  return g
}

function Corpo({ pele }: { pele: THREE.Material }) {
  const k = useKit()
  const cordas = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    const m = cordas.current
    if (!m) return
    k.cordas.forEach((mt, i) => m.setMatrixAt(i, mt))
    m.instanceMatrix.needsUpdate = true
  }, [k])
  return (
    <>
      <mesh geometry={k.corpo} material={k.madeira} />
      <mesh geometry={k.pele} material={pele} position={[0, ALTO, 0]} />
      <mesh geometry={k.aroCima} material={k.matAro} position={[0, ALTO - 0.012, 0]} />
      <mesh geometry={k.aroBaixo} material={k.matAro} position={[0, 0.43, 0]} />
      <instancedMesh ref={cordas} args={[k.corda, k.matCorda, CORDAS]} />
    </>
  )
}

// o modelo do Blender: o couro dele chega a 0,589 m; fica um tiquinho abaixo
// da pele em código (ALTO), que cobre o centro e deixa a borda dele à mostra
const TOPO_GLB = 0.589
const ESCALA_GLB = (ALTO - 0.003) / TOPO_GLB
type Parte = { geo: THREE.BufferGeometry; mat: THREE.Material; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }
function CorpoGlb({ pele }: { pele: THREE.Material }) {
  const k = useKit()
  const { nodes } = useGLTF(INSTRUMENTOS_GLB) as unknown as { nodes: Record<string, THREE.Object3D> }
  const no = nodes.djembe
  if (!no) throw new Error("instrumentos.glb sem o nó djembe")
  const partes = useMemo(() => {
    const ps: Parte[] = []
    for (const c of no.children) {
      const m = c as THREE.Mesh
      if (!m.geometry) continue
      ps.push({ geo: m.geometry, mat: MG[m.name.slice("djembe_".length)] ?? MG.madeira, pos: m.position, quat: m.quaternion, esc: m.scale })
    }
    return ps
  }, [no])
  return (
    <>
      <group scale={ESCALA_GLB}>
        {partes.map((p, i) => (
          <mesh key={i} geometry={p.geo} material={p.mat} position={p.pos} quaternion={p.quat} scale={p.esc} />
        ))}
      </group>
      <mesh geometry={k.pele} material={pele} position={[0, ALTO, 0]} />
    </>
  )
}
function CorpoModelo({ pele }: { pele: THREE.Material }) {
  return (
    <ModeloSeguro nome="djembe" reserva={<Corpo pele={pele} />}>
      <CorpoGlb pele={pele} />
    </ModeloSeguro>
  )
}

// o djembê dele: tocável. `vira` gira o tambor; o lado de quem toca é o +z dele
export function DjembeSeu({ pos, vira = 0 }: { pos: V3; vira?: number }) {
  const k = useKit()
  const grupo = useRef<THREE.Group>(null)
  const golpe = useGolpe()
  const tmp = useMemo(() => new THREE.Vector3(), [])
  // as amostras já vêm quando a casa abre; o minijogo esconde os círculos 2D
  useEffect(() => {
    void carregarTambor()
    TAMBOR_VIVO.em3d++
    return () => { TAMBOR_VIVO.em3d-- }
  }, [])
  useFrame(() => {
    const s = TAMBOR_VIVO.seu
    const ult = s.length ? s[s.length - 1] : null
    golpe.mostrar(ult, ult ? TAMBOR_VIVO.agora() - ult.quando : -1)
  })
  const bater = (e: ThreeEvent<PointerEvent>) => {
    if (!TAMBOR_VIVO.tocar || !grupo.current) return
    e.stopPropagation()
    grupo.current.worldToLocal(tmp.copy(e.point))
    const r = Math.min(1, Math.hypot(tmp.x, tmp.z) / R)
    TAMBOR_VIVO.tocar(r, Math.atan2(tmp.z, tmp.x), forcaDoToque(e.nativeEvent))
  }
  return (
    <group ref={grupo} position={pos} rotation-y={vira}>
      <CorpoModelo pele={golpe.pele} />
      <primitive object={golpe.onda} />
      <primitive object={golpe.ponto} />
      {/* onde o toque pega: a pele e uma folga em volta (fora da pele conta como a borda) */}
      <mesh geometry={k.pega} position={[0, ALTO + 0.01, 0]} onPointerDown={bater} visible={false} />
    </group>
  )
}

// o djembê dela, com as mãos dela batendo no lugar e na hora de cada golpe
export function DjembeDela({ pos, vira = 0, cor = "#3d7bff" }: { pos: V3; vira?: number; cor?: string }) {
  const k = useKit()
  const golpe = useGolpe()
  // as duas mãos dela (criadas uma vez)
  const maos = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ color: "#2c2838", emissive: cor, emissiveIntensity: 0.5, roughness: 0.6 })
    return [1, -1].map((l) => {
      const m = new THREE.Mesh(k.mao, mat)
      m.scale.set(0.04, 0.016, 0.055)
      m.position.set(l * 0.08, ALTO + 0.13, 0.1)
      return m
    })
  }, [cor, k])
  useEffect(() => () => (maos[0].material as THREE.Material).dispose(), [maos])
  const fila = useRef({ lista: null as Toque[] | null, i: 0 })
  useFrame((_, dt) => {
    const lista = TAMBOR_VIVO.dela
    const f = fila.current
    if (f.lista !== lista) { f.lista = lista; f.i = 0 }
    const agora = TAMBOR_VIVO.agora()
    const vivo = TAMBOR_VIVO.ativo
    // o último golpe que já soou
    while (f.i < lista.length && lista[f.i].quando <= agora) f.i++
    const ult = vivo && f.i > 0 ? lista[f.i - 1] : null
    golpe.mostrar(ult, ult ? agora - ult.quando : -1)
    // as mãos: cada uma vai pro próximo golpe do lado dela, sobe e desce no tempo
    for (let m = 0; m < 2; m++) {
      const mao = maos[m]
      const esq = m === 1
      let prox: Toque | null = null, ant: Toque | null = null
      if (vivo) {
        for (let j = f.i; j < Math.min(lista.length, f.i + 6); j++) if (lista[j].ang > Math.PI / 2 === esq) { prox = lista[j]; break }
        for (let j = f.i - 1; j >= Math.max(0, f.i - 6); j--) if (lista[j].ang > Math.PI / 2 === esq) { ant = lista[j]; break }
      }
      const dProx = prox ? prox.quando - agora : 9
      const dAnt = ant ? agora - ant.quando : 9
      // a altura: desce até a pele na hora do golpe e volta
      const alto = Math.min(0.12, Math.min(dProx < 0.3 ? Math.pow(dProx / 0.3, 0.8) * 0.12 : 0.12, dAnt < 0.25 ? (dAnt / 0.25) * 0.12 : 0.12))
      const alvo = prox && dProx < 0.45 ? prox : ant && dAnt < 0.25 ? ant : null
      const ang = alvo ? alvo.ang : Math.PI / 2 + (esq ? 0.7 : -0.7)
      const r = alvo ? alvo.r : 0.75
      const x = Math.cos(ang) * r * R * 0.95, z = Math.sin(ang) * r * R * 0.95
      const seg = 1 - Math.exp(-Math.min(dt, 0.1) * 22)
      mao.position.x += (x - mao.position.x) * seg
      mao.position.z += (z - mao.position.z) * seg
      mao.position.y = ALTO + 0.018 + alto
    }
  })
  return (
    <group position={pos} rotation-y={vira}>
      <CorpoModelo pele={golpe.pele} />
      <primitive object={golpe.onda} />
      <primitive object={golpe.ponto} />
      <primitive object={maos[0]} />
      <primitive object={maos[1]} />
    </group>
  )
}
