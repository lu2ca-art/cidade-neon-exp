"use client"
/* eslint-disable react-hooks/immutability -- three.js: a Kombi do teste anda a cada quadro */

// /teste/mapa: a maquete do v5 com a REDE de ruas por cima. Toca num ponto
// pra marcar o destino: a rota mais rápida acende e a Kombi vai sozinha
// pelas ruas (acelerada ×12 pra dar pra ver). Os retornos são os pontinhos
// ciano; a expressa elevada passa por cima, sem cruzamento.

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { H, W, altura, bairro, costa } from "../../linha/rede/terreno"
import { VEL, montarRede, noMaisPerto, rota, type Aresta, type TipoVia } from "../../linha/rede/rede"

const S = 0.1, ALT = 0.05
const P = (x: number, y: number, extra = 0) => new THREE.Vector3((x - W / 2) * S, altura(x, y) * ALT + extra, (y - H / 2) * S)
const COR: Record<string, [number, number, number]> = { cidade: [70, 60, 96], suburbio: [150, 110, 72], mirante: [86, 130, 80], arena: [170, 104, 52], deserto: [214, 160, 98], campo: [112, 128, 80], orla: [226, 206, 158], mar: [40, 150, 190] }
const COR_VIA: Record<TipoVia, string> = { expressa: "#ff3fb0", avenida: "#d8b8ff", orla: "#33d6c8", principal: "#ffc857", rua: "#f2eefa", beco: "#ff9a5c", tunel: "#8a8aa8", serpentina: "#b4ff8a", terra: "#c8904a", rampa: "#ff8ad0" }
const ACELERA = 12

function Chao({ onToque }: { onToque: (x: number, y: number) => void }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(W * S, H * S, 200, 140); g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position, cor = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / S + W / 2, y = pos.getZ(i) / S + H / 2
      pos.setY(i, y > costa(x) ? -1.2 : altura(x, y) * ALT)
      const c = COR[bairro(x, y)] ?? COR.campo
      cor[i * 3] = c[0] / 255; cor[i * 3 + 1] = c[1] / 255; cor[i * 3 + 2] = c[2] / 255
    }
    g.setAttribute("color", new THREE.BufferAttribute(cor, 3)); g.computeVertexNormals()
    return g
  }, [])
  const clique = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onToque(e.point.x / S + W / 2, e.point.z / S + H / 2) }
  return (
    <>
      <mesh geometry={geo} onPointerDown={clique}><meshStandardMaterial vertexColors roughness={0.95} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[30, 0.2, 40]}><planeGeometry args={[W * S * 1.6, H * S * 1.6]} /><meshStandardMaterial color="#2ab3c9" transparent opacity={0.85} /></mesh>
    </>
  )
}

function fita(e: Aresta, larg: number, extra: number) {
  const pos: number[] = [], idx: number[] = []
  e.pts.forEach((p, i) => {
    const q = e.pts[Math.min(e.pts.length - 1, i + 1)], o = e.pts[Math.max(0, i - 1)]
    const dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1, nx = (-dy / n) * larg, ny = (dx / n) * larg
    const a = P(p[0] + nx, p[1] + ny, extra), b = P(p[0] - nx, p[1] - ny, extra)
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z)
    if (i < e.pts.length - 1) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2) }
  })
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); return g
}
const larguraDe = (t: TipoVia) => (t === "expressa" ? 7 : t === "avenida" || t === "orla" ? 5 : t === "beco" ? 2.5 : 3.5)

type Anda = { no: number; fila: { e: Aresta; ida: boolean }[]; f: number; resta: number }
function Andar({ anda, kombi, rede }: { anda: React.RefObject<Anda>; kombi: React.RefObject<THREE.Mesh | null>; rede: ReturnType<typeof montarRede> }) {
  useFrame((_, dt) => {
    const a = anda.current, m = kombi.current; if (!m) return
    const atual = a.fila[0]
    if (!atual) { const n = rede.nos[a.no]; m.position.copy(P(n.x, n.y, 1.5)); return }
    a.f += (dt * ACELERA * VEL[atual.e.tipo]) / atual.e.m
    a.resta = Math.max(0, a.resta - dt * ACELERA)
    if (a.f >= 1) { a.no = atual.ida ? atual.e.b : atual.e.a; a.fila.shift(); a.f = 0; return }
    const f = atual.ida ? a.f : 1 - a.f
    const pts = atual.e.pts, alvo = f * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(alvo)), t = alvo - i
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t
    m.position.copy(P(x, y, atual.e.elevada ? 3.6 : 1.5))
  })
  return null
}


export function Rede3D() {
  const rede = useMemo(() => montarRede(), [])
  const fitas = useMemo(() => rede.arestas.map((e) => ({ e, g: fita(e, larguraDe(e.tipo), e.elevada ? 2.4 : 0.35) })), [rede])
  const [destino, setDestino] = useState<{ x: number; y: number } | null>(null)
  const [r, setR] = useState<ReturnType<typeof rota>>(null)
  const naRota = useMemo(() => new Set(r?.arestas ?? []), [r])
  const kombi = useRef<THREE.Mesh>(null)
  // a Kombi: o nó onde está e o caminho que segue
  const anda = useRef<Anda>({ no: noMaisPerto(rede, 900, 480).id, fila: [], f: 0, resta: 0 })

  const marcar = (x: number, y: number) => {
    const a = anda.current
    const alvo = noMaisPerto(rede, x, y).id
    const R = rota(rede, a.no, alvo)
    setDestino({ x: rede.nos[alvo].x, y: rede.nos[alvo].y }); setR(R)
    if (!R) return
    a.fila = R.arestas.map((ei, k) => ({ e: rede.arestas[ei], ida: rede.arestas[ei].a === R.nos[k] })); a.f = 0; a.resta = R.seg
  }

  const min = r ? (r.seg / 60).toFixed(1) : null
  return (
    <div style={{ position: "fixed", inset: 0, background: "#1b1636", color: "#f2eefa", fontFamily: "ui-monospace, monospace" }}>
      <Canvas camera={{ position: [0, 120, 110], fov: 45, far: 2000 }}>
        <color attach="background" args={["#2a2250"]} />
        <hemisphereLight args={["#cfd8ff", "#3a2a20", 0.9]} />
        <directionalLight position={[-60, 120, -80]} intensity={1.2} />
        <Chao onToque={marcar} />
        {fitas.map(({ e, g }) => <mesh key={e.id} geometry={g}><meshBasicMaterial color={naRota.has(e.id) ? "#5dffa0" : COR_VIA[e.tipo]} side={THREE.DoubleSide} /></mesh>)}
        {rede.nos.map((n) => n.arestas.length > 1 && <mesh key={n.id} position={P(n.x, n.y, 0.6)}><sphereGeometry args={[0.7, 8, 6]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
        {rede.retornos.map((t, i) => <mesh key={i} position={P(t.x, t.y, rede.arestas[t.aresta].elevada ? 2.8 : 0.8)}><sphereGeometry args={[0.4, 6, 4]} /><meshBasicMaterial color="#2fe8ff" /></mesh>)}
        {destino && <mesh position={P(destino.x, destino.y, 4)}><coneGeometry args={[1.4, 4, 12]} /><meshBasicMaterial color="#5dffa0" /></mesh>}
        <mesh ref={kombi}><boxGeometry args={[2, 1.6, 3]} /><meshBasicMaterial color="#ff3fb0" /></mesh>
        <Andar anda={anda} kombi={kombi} rede={rede} />
        <OrbitControls target={[0, 0, 0]} maxPolarAngle={1.35} />
      </Canvas>
      <div style={{ position: "absolute", left: 12, top: 12, right: 12, fontSize: 12, lineHeight: 1.5, textShadow: "0 1px 4px #000", pointerEvents: "none" }}>
        <b style={{ fontSize: 14 }}>o mapa novo · etapa 1</b><br />
        toca num ponto pra marcar o destino · a Kombi vai sozinha (×{ACELERA})<br />
        {r ? `a rota: ${(r.m / 1000).toFixed(1)} km · ≈ ${min} min de jogo` : destino ? "sem rota até lá" : `${rede.nos.length} cruzamentos · ${rede.arestas.length} trechos · ${rede.retornos.length} retornos`}
      </div>
    </div>
  )
}
