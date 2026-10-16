"use client"
/* eslint-disable react-hooks/immutability -- three.js: o passeio, o carrinho e a câmera são do motor, mexidos a cada quadro */

// O PARQUE NA AVENIDA (CN-19, LU2CA 14/10: "a montanha-russa em terceira
// pessoa, integrada ao mapa"). O parque fica do lado de fora da avenida; o
// trilho atravessa a pista por cima duas vezes (na grande descida e no
// morrinho), faz a curva e o looping do outro lado e volta pra estação.
// De noite, chegando perto, dá pra andar: a Kombi encosta, a câmera vai pra
// trás do carrinho (você e a Nizzy) e a volta acontece no mapa, com a
// cidade em volta. A física é a do protótipo (app/parque/trilho.ts).

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { posicao, type Mundo } from "./mundo"
import { PASSO, pontoI } from "./pista"
import { G, fracaoDe, montarTrilho, quadro, type Trilho } from "../../parque/trilho"
import { criarVento, estalo, sino } from "../../parque/sons"

// onde: na avenida, deste lado, a partir deste ponto da pista
export const PARQUE = { area: "full" as const, u: 700, lado: 1 as 1 | -1 }

// o traçado em coordenadas da pista: [ao longo (m), pro lado (m), altura (m)].
// Altura medida da pista naquele ponto, então cruzar por cima é garantido.
const TRACADO: [number, number, number][] = [
  [0, 34, 1.5], [24, 34, 1.5],                                // a estação
  [48, 34, 6], [72, 34, 18], [96, 34, 32],                    // a corrente
  [110, 33, 37], [122, 30, 36],                               // o topo
  [140, 14, 24], [156, -6, 16], [170, -30, 5],                // a descida, por cima da avenida
  [186, -52, 4], [182, -74, 10], [160, -84, 8],               // a curva do outro lado
  [134, -82, 2], [118, -81, 3],                               // entra no looping
  [104, -80, 11], [108, -79, 22], [118, -78, 24], [128, -77, 19], [126, -76, 8],
  [114, -74, 2], [96, -72, 2],                                // sai do looping
  [72, -56, 6], [50, -24, 19], [40, 0, 20], [32, 22, 11],     // o morrinho, por cima da avenida
  [18, 40, 4], [-6, 42, 2], [-18, 36, 1.5],                   // a volta pra estação
]
const I_CORRENTE = [1, 5]   // do fim da estação até o topo
const VEL_CORRENTE = 5

export interface PasseioParque {
  andando: boolean
  bracos: boolean
  fim: ((r: { velMax: number; bracos: number }) => void) | null
  // lidos pelo HUD e pela câmera (Corrida.tsx)
  v: number
  cam: THREE.Vector3
  olhar: THREE.Vector3
  up: THREE.Vector3
}
export const novoPasseio = (): PasseioParque => ({ andando: false, bracos: false, fim: null, v: 0, cam: new THREE.Vector3(), olhar: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) })

// a Kombi está chegando no parque? (metros na via, de 90 antes até 20 depois)
export function pertoDoParque(M: Mundo, via: number, u: number) {
  const o = posicao(M, "parque", PARQUE.area, PARQUE.u, PARQUE.lado)
  if (o.via !== via) return false
  const V = M.vias[via]
  let d = o.u - u
  if (V.fechada) d = ((d % V.L) + V.L * 1.5) % V.L - V.L / 2
  return d > -20 && d < 90
}

function montar(M: Mundo) {
  const o = posicao(M, "parque", PARQUE.area, PARQUE.u, PARQUE.lado)
  const C = M.vias[o.via]
  const i0 = Math.round(o.u / PASSO)
  const noMundo = ([a, s, h]: [number, number, number]) => {
    const i = C.fechada ? (((i0 + Math.round(a / PASSO)) % C.n) + C.n) % C.n : Math.max(0, Math.min(C.n - 1, i0 + Math.round(a / PASSO)))
    return pontoI(C, i, o.lado * s, h, new THREE.Vector3())
  }
  const pts = TRACADO.map(noMundo)
  const tr = montarTrilho(1600, pts)
  const corrente = { ini: fracaoDe(tr, pts[I_CORRENTE[0]]), fim: fracaoDe(tr, pts[I_CORRENTE[1]]) }
  // a estação: entre o último ponto (chegando) e o primeiro (saindo)
  const estacao = noMundo([6, 34, 0])
  const roda = noMundo([70, 78, 0])
  const rumo = (() => { const i = i0 % C.n; return Math.atan2(C.tx[i], C.tz[i]) })()
  return { tr, corrente, estacao, roda, rumo }
}

// o chão que o parque ocupa (x, z a cada ~10 m do trilho + a roda e a
// estação): a cidade não põe prédio em cima (Corrida.tsx, os prédios)
export function areaDoParque(M: Mundo) {
  const { tr, estacao, roda } = montar(M)
  const pts: { x: number; z: number }[] = []
  for (let i = 0; i < tr.n; i += 6) pts.push({ x: tr.pontos[i].x, z: tr.pontos[i].z })
  pts.push({ x: estacao.x, z: estacao.z }, { x: roda.x, z: roda.z })
  return pts
}

function Trilhos({ tr }: { tr: Trilho }) {
  const { tubos, dorm, pil } = useMemo(() => {
    const passo = 2
    const tubos = [-0.55, 0.55].map((d) => {
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < tr.n; i += passo) pts.push(tr.pontos[i].clone().addScaledVector(tr.lado[i], d))
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), tr.n / passo, 0.08, 6, true)
    })
    const esp: THREE.Vector3[] = []
    for (let i = 0; i < tr.n; i += passo) esp.push(tr.pontos[i].clone().addScaledVector(tr.cima[i], -0.35))
    tubos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(esp, true), tr.n / passo, 0.16, 6, true))
    const o = new THREE.Object3D(), m = new THREE.Matrix4()
    const dorm: THREE.Matrix4[] = []
    for (let i = 0; i < tr.n; i += 3) {
      m.makeBasis(tr.lado[i], tr.cima[i], tr.frente[i].clone().negate())
      o.quaternion.setFromRotationMatrix(m)
      o.position.copy(tr.pontos[i]).addScaledVector(tr.cima[i], -0.15)
      o.scale.set(1.3, 0.08, 0.16); o.updateMatrix(); dorm.push(o.matrix.clone())
    }
    // os pilares descem até o chão do parque (não ficam em cima da avenida:
    // lá o trilho passa solto, em viga)
    const chao = Math.min(...tr.pontos.map((p) => p.y)) - 1.5
    const pil: THREE.Matrix4[] = []
    for (let i = 0; i < tr.n; i += 26) {
      if (tr.cima[i].y < 0.6) continue
      const p = tr.pontos[i], h = p.y - 0.5 - chao
      if (h < 2) continue
      o.quaternion.identity(); o.position.set(p.x, chao + h / 2, p.z); o.scale.set(1, h, 1); o.updateMatrix(); pil.push(o.matrix.clone())
    }
    return { tubos, dorm, pil }
  }, [tr])
  const dRef = useRef<THREE.InstancedMesh>(null)
  const pRef = useRef<THREE.InstancedMesh>(null)
  useEffect(() => {
    dorm.forEach((mm, i) => dRef.current?.setMatrixAt(i, mm))
    pil.forEach((mm, i) => pRef.current?.setMatrixAt(i, mm))
    for (const r of [dRef.current, pRef.current]) if (r) { r.instanceMatrix.needsUpdate = true; r.computeBoundingSphere() }
  }, [dorm, pil])
  return (
    <group>
      {tubos.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color={i < 2 ? "#d9dde8" : "#ff5b5b"} emissive={i < 2 ? "#2fe8ff" : "#ff5b5b"} emissiveIntensity={i < 2 ? 0.5 : 0.8} metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <instancedMesh ref={dRef} args={[undefined, undefined, dorm.length]}><boxGeometry /><meshStandardMaterial color="#3a3446" /></instancedMesh>
      <instancedMesh ref={pRef} args={[undefined, undefined, pil.length]}><cylinderGeometry args={[0.2, 0.28, 1, 6]} /><meshStandardMaterial color="#2a2836" metalness={0.5} /></instancedMesh>
    </group>
  )
}

function RodaGigante({ pos, rumo }: { pos: THREE.Vector3; rumo: number }) {
  const roda = useRef<THREE.Group>(null)
  useFrame((_, dt) => { if (roda.current) roda.current.rotation.z += dt * 0.08 })
  const R = 22
  return (
    <group position={pos} rotation-y={rumo + Math.PI / 2}>
      <mesh position={[0, R / 2 + 1, 0]}><boxGeometry args={[1.2, R + 2, 1.2]} /><meshStandardMaterial color="#26222f" /></mesh>
      <group ref={roda} position={[0, R + 2, 0]}>
        <mesh><torusGeometry args={[R, 0.3, 6, 64]} /><meshStandardMaterial color="#ffc857" emissive="#ffc857" emissiveIntensity={1.4} /></mesh>
        <mesh><torusGeometry args={[R * 0.55, 0.18, 6, 48]} /><meshStandardMaterial color="#ff5b5b" emissive="#ff5b5b" emissiveIntensity={1.2} /></mesh>
        {Array.from({ length: 16 }, (_, i) => (
          <group key={i} rotation-z={(i / 16) * Math.PI * 2}>
            <mesh position={[R / 2, 0, 0]}><boxGeometry args={[R, 0.14, 0.14]} /><meshStandardMaterial color="#2fe8ff" emissive="#2fe8ff" emissiveIntensity={0.9} /></mesh>
            <mesh position={[R, -1.4, 0]}><boxGeometry args={[1.6, 1.6, 1.6]} /><meshStandardMaterial color={i % 2 ? "#ff3fb0" : "#5dffa0"} emissive={i % 2 ? "#ff3fb0" : "#5dffa0"} emissiveIntensity={0.6} /></mesh>
          </group>
        ))}
      </group>
    </group>
  )
}

// a estação: plataforma, cobertura e o letreiro
function Estacao({ pos, rumo }: { pos: THREE.Vector3; rumo: number }) {
  return (
    <group position={pos} rotation-y={rumo}>
      <mesh position={[0, 0.6, 0]}><boxGeometry args={[6, 1.2, 26]} /><meshStandardMaterial color="#2a2232" /></mesh>
      {[-11, 0, 11].map((z) => <mesh key={z} position={[-2.6, 3.5, z]}><boxGeometry args={[0.3, 6, 0.3]} /><meshStandardMaterial color="#3a3446" /></mesh>)}
      <mesh position={[0, 6.6, 0]}><boxGeometry args={[7, 0.3, 28]} /><meshStandardMaterial color="#1a1622" /></mesh>
      <mesh position={[-3.6, 7.6, 0]} rotation-y={-Math.PI / 2}><planeGeometry args={[14, 2]} /><meshBasicMaterial color="#ff5b5b" /></mesh>
    </group>
  )
}

// você e a Nizzy no carrinho; braços pra cima quando segura
function Gente({ bracos, x, cor }: { bracos: React.RefObject<boolean>; x: number; cor: string }) {
  const esq = useRef<THREE.Mesh>(null), dir = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const up = bracos.current
    for (const [m, s] of [[esq.current, -1], [dir.current, 1]] as const) {
      if (!m) continue
      m.rotation.z = up ? s * 0.25 : s * 2.6
      m.position.y = up ? 1.75 : 1.05
    }
  })
  return (
    <group position={[x, 0, 0.2]}>
      <mesh position={[0, 1.05, 0]}><capsuleGeometry args={[0.22, 0.5, 4, 8]} /><meshStandardMaterial color="#14152a" emissive={cor} emissiveIntensity={0.35} /></mesh>
      <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#2c2838" emissive={cor} emissiveIntensity={0.2} /></mesh>
      <mesh ref={esq} position={[-0.28, 1.05, 0]}><capsuleGeometry args={[0.06, 0.55, 4, 6]} /><meshStandardMaterial color="#14152a" emissive={cor} emissiveIntensity={0.35} /></mesh>
      <mesh ref={dir} position={[0.28, 1.05, 0]}><capsuleGeometry args={[0.06, 0.55, 4, 6]} /><meshStandardMaterial color="#14152a" emissive={cor} emissiveIntensity={0.35} /></mesh>
    </group>
  )
}

export function Parque({ M, passeio }: { M: Mundo; passeio: React.RefObject<PasseioParque> }) {
  const { tr, corrente, estacao, roda, rumo } = useMemo(() => montar(M), [M])
  const carro = useRef<THREE.Group>(null)
  const bracos = useRef(false)
  const st = useRef({ u: 0, v: 0, E: 0, fase: "parado" as "parado" | "estacao" | "corrente" | "solto" | "freio", velMax: 0, bracoT: 0, descidaT: 0, tique: 0 })
  const som = useRef<ReturnType<typeof criarVento>>(null)
  const mat = useMemo(() => new THREE.Matrix4(), [])
  const descida = useMemo(() => ({ ini: corrente.fim, fim: corrente.fim + 0.09 }), [corrente])

  useFrame((_, dtReal) => {
    const s = st.current, pq = passeio.current
    // window.__parqueK = 4 no desenvolvimento: o teste sem tela roda a volta inteira
    const k = process.env.NODE_ENV !== "production" ? ((window as unknown as { __parqueK?: number }).__parqueK ?? 1) : 1
    const dt = Math.min(dtReal, 1 / 30) * k
    bracos.current = pq.bracos
    // começou uma volta
    if (pq.andando && s.fase === "parado") {
      Object.assign(s, { u: 0, v: 0, E: 0, fase: "estacao", velMax: 0, bracoT: 0, descidaT: 0, tique: 0 })
      som.current = criarVento(); sino()
    }
    let q = quadro(tr, s.u)
    if (pq.andando) {
      if (s.fase === "estacao") { s.v = Math.min(3, s.v + dt * 1.5); if (s.u >= corrente.ini) s.fase = "corrente" }
      else if (s.fase === "corrente") {
        s.v += (VEL_CORRENTE - s.v) * Math.min(1, dt * 2)
        s.tique += dt * s.v; if (s.tique > 0.9) { s.tique = 0; estalo() }
        if (s.u >= corrente.fim) { s.fase = "solto"; s.E = q.p.y + (s.v * s.v) / (2 * G) }
      } else if (s.fase === "solto") {
        s.E -= 0.008 * s.v * dt
        s.v = Math.sqrt(Math.max(2.4 * 2.4, 2 * G * (s.E - q.p.y)))
        if (s.u >= 0.97) s.fase = "freio"
      } else if (s.fase === "freio") s.v = Math.max(0.8, s.v - dt * 7)
      s.u += (s.v * dt) / tr.comp
      if (s.fase === "solto") s.velMax = Math.max(s.velMax, s.v)
      if (s.u >= descida.ini && s.u <= descida.fim) { s.descidaT += dt; if (pq.bracos) s.bracoT += dt }
      som.current?.vel(s.v)
      if (s.fase === "freio" && s.u >= 1) {
        s.u = 0; s.v = 0; s.fase = "parado"
        som.current?.parar(); som.current = null; sino()
        pq.andando = false
        pq.fim?.({ velMax: s.velMax, bracos: s.descidaT > 0 ? s.bracoT / s.descidaT : 0 })
      }
      q = quadro(tr, s.u)
      // a câmera de terceira pessoa: atrás e acima do carrinho, o "cima" é o do trilho
      pq.v = s.v
      pq.cam.copy(q.p).addScaledVector(q.t, -7.5).addScaledVector(q.up, 3.2)
      const fr = quadro(tr, s.u + 8 / tr.comp)
      pq.olhar.copy(fr.p).addScaledVector(fr.up, 1.2)
      pq.up.copy(q.up)
    }
    if (carro.current) {
      mat.makeBasis(q.l, q.up, q.t.clone().negate())
      carro.current.quaternion.setFromRotationMatrix(mat)
      carro.current.position.copy(q.p)
    }
  })
  useEffect(() => () => { som.current?.parar() }, [])

  return (
    <group>
      <Trilhos tr={tr} />
      <Estacao pos={estacao} rumo={rumo} />
      <RodaGigante pos={roda} rumo={rumo} />
      <pointLight position={[estacao.x, estacao.y + 30, estacao.z]} color="#ff5b5b" intensity={300} distance={120} decay={2} />
      <group ref={carro}>
        <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.6, 0.4, 2.4]} /><meshStandardMaterial color="#ff5b5b" emissive="#ff5b5b" emissiveIntensity={0.35} metalness={0.4} roughness={0.4} /></mesh>
        <mesh position={[0, 0.55, -1.1]} rotation-x={-0.4}><boxGeometry args={[1.6, 0.1, 0.6]} /><meshStandardMaterial color="#ff5b5b" emissive="#ff5b5b" emissiveIntensity={0.35} /></mesh>
        <mesh position={[0, 0.62, -1.42]}><boxGeometry args={[1.3, 0.05, 0.02]} /><meshBasicMaterial color="#2fe8ff" /></mesh>
        <Gente bracos={bracos} x={-0.4} cor="#ff3fb0" />
        <Gente bracos={bracos} x={0.4} cor="#ff5b5b" />
      </group>
    </group>
  )
}
