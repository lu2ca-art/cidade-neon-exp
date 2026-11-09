"use client"

// OS ELEVADORES MODELADOS (06/11, docs/elevadores.md): blender/scripts/elevadores.py
// → public/models/elevadores.glb. Um modelo de cada, reaproveitado nos 3:
//   - lá embaixo (EntradasElevador, nas trincheiras): a ENTRADA encostada na
//     torre de cada salão, virada pro salão (moldura de aço, grade pantográfica,
//     a cabine acesa, o painel com o número e as 3 faixas, a luz de chamada, os
//     trilhos e cabos subindo pela torre);
//   - lá em cima (ChegadasElevador, na cidade): a CHEGADA no anel da torre da
//     ponta N, encostada no prédio do meio, de frente pra chegada da 1ª faixa do
//     grupo (um pouco de lado, pra não tampar a faixa colorida do prédio), e a
//     passarela esticada até a borda de dentro do anel.
// O número (e_num1..3 / c_num1..3), as faixas (e_fx / c_fx, na cor de cada
// linha) e o letreiro "TÚNEIS ▼" são malhas _neon que o jogo pinta. Cada
// elevador é levado pro mundo UMA vez em 3 desenhos (sólido, brilho, vidro),
// com materiais compartilhados; sem luz nova, nada por quadro (só o teste de
// distância do <Perto>, a cada 10 quadros). Se o .glb falhar: sem modelo (o
// botão e a porta de neon de antes continuam).

import { useGLTF } from "@react-three/drei"
import { ModeloSeguro } from "../estrada/Seguro"
import { useEffect, useMemo, type ReactNode } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { Perto } from "../estrada/Perto"
import type { MundoDisco } from "../estrada/mundoDisco"
import { COR_TORRE as COR_TUNEL, TORRES, TORRE_R } from "../trincheiras/mapa"
import { ELEVADORES, portaDoDeserto } from "./elevadores"
import { COR_PISTA } from "./historia"

const URL = "/models/elevadores.glb"
const GANHO = 0.25 // o sólido sai do Blender ×4 (8 bits nos tons escuros); aqui volta
const COR_CIDADE = "#ff6a35" // a cor das torres na cidade (mundoDisco.ts, COR_TORRE)
const FRENTE_TUNEL = 0.75 // a frente da moldura, a partir da parede da torre (a grade fica a 0,45)
const FUNDO_CASINHA = 4.3 // a casinha vai 4,2 m pra trás da origem (encosta no prédio)
const MEIA_PISTA = 8.4 // a meia largura do anel (mundoDisco.ts)

let MATS: { solido: THREE.Material; brilho: THREE.Material; vidro: THREE.Material } | null = null
function mats() {
  return (MATS ??= {
    solido: new THREE.MeshBasicMaterial({ color: new THREE.Color(GANHO, GANHO, GANHO), vertexColors: true }),
    brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }),
    vidro: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }),
  })
}

// copia a malha do glb (quantizada pelo meshopt) em Float32 e leva pro mundo
function emFloat(g: THREE.BufferGeometry, m: THREE.Matrix4, cor?: THREE.Color) {
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color
  const n = pos.count
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i)
    if (nor) { N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i) }
    if (cor) { C[i * 3] = cor.r; C[i * 3 + 1] = cor.g; C[i * 3 + 2] = cor.b }
    else if (col) { C[i * 3] = col.getX(i); C[i * 3 + 1] = col.getY(i); C[i * 3 + 2] = col.getZ(i) }
    else C.fill(1, i * 3, i * 3 + 3)
  }
  const o = new THREE.BufferGeometry()
  o.setAttribute("position", new THREE.BufferAttribute(P, 3))
  o.setAttribute("normal", new THREE.BufferAttribute(N, 3))
  o.setAttribute("color", new THREE.BufferAttribute(C, 3))
  o.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i))
  if (!nor) o.computeVertexNormals()
  o.applyMatrix4(m)
  return o
}

type Peca = { no: string; cor: string; escalaZ?: number }
type Pose = { x: number; y: number; z: number; rot: number }

// junta as peças de um elevador (na pose dele) em 3 desenhos
function useJuntar(pecas: Peca[], pose: Pose) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }
  const d = useMemo(() => {
    const solido: THREE.BufferGeometry[] = [], brilho: THREE.BufferGeometry[] = [], vidro: THREE.BufferGeometry[] = []
    const base = new THREE.Matrix4().makeRotationY(pose.rot).setPosition(pose.x, pose.y, pose.z)
    const inv = new THREE.Matrix4(), rel = new THREE.Matrix4()
    for (const p of pecas) {
      const no = nodes[p.no]
      if (!no) throw new Error(`elevadores.glb sem o nó ${p.no}`)
      const cor = new THREE.Color(p.cor)
      const bp = p.escalaZ ? base.clone().multiply(new THREE.Matrix4().makeScale(1, 1, p.escalaZ)) : base
      no.updateWorldMatrix(true, true)
      inv.copy(no.matrixWorld).invert()
      no.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        rel.multiplyMatrices(inv, m.matrixWorld)
        const mm = bp.clone().multiply(rel)
        if (m.name.endsWith("_solido")) solido.push(emFloat(m.geometry, mm))
        else if (m.name.endsWith("_vidro")) vidro.push(emFloat(m.geometry, mm))
        else brilho.push(emFloat(m.geometry, mm, m.name.endsWith("_neon") ? cor : undefined))
      })
    }
    const s = mergeGeometries(solido, false), b = mergeGeometries(brilho, false)
    const v = vidro.length ? mergeGeometries(vidro, false) : null
    if (!s || !b) throw new Error("elevadores.glb: não deu pra juntar")
    for (const g of [...solido, ...brilho, ...vidro]) g.dispose()
    return { solido: s, brilho: b, vidro: v }
  }, [nodes, pecas, pose])
  useEffect(() => () => { d.solido.dispose(); d.brilho.dispose(); d.vidro?.dispose() }, [d])
  return d
}

function Modelo({ pecas, pose }: { pecas: Peca[]; pose: Pose }) {
  const d = useJuntar(pecas, pose)
  const m = mats()
  return (
    <>
      <mesh geometry={d.solido} material={m.solido} name="elevador" />
      <mesh geometry={d.brilho} material={m.brilho} />
      {d.vidro && <mesh geometry={d.vidro} material={m.vidro} renderOrder={2} />}
    </>
  )
}

const Seguro = ({ children }: { children: ReactNode }) => <ModeloSeguro nome="elevadores-glb" enquanto={null}>{children}</ModeloSeguro>

const faixas = (pref: "e" | "c", n: number): Peca[] =>
  (ELEVADORES[n - 1]?.faixas ?? []).map((f, k) => ({ no: `${pref}_fx${k + 1}`, cor: COR_PISTA[f] ?? "#ffffff" }))

// ── lá embaixo: a entrada em cada torre de salão (TORRES, na ordem = elevador 1–3) ──
const ENTRADAS = TORRES.map((t, i) => {
  const n = i + 1, nx = -t.fora.x, nz = -t.fora.z, d = TORRE_R + FRENTE_TUNEL
  const pose: Pose = { x: t.torre.x + nx * d, y: 0, z: t.torre.z + nz * d, rot: Math.atan2(nx, nz) }
  const pecas: Peca[] = [{ no: "entrada", cor: COR_TUNEL }, { no: `e_num${n}`, cor: COR_TUNEL }, ...faixas("e", n)]
  return { n, pose, pecas }
})
export function EntradasElevador() {
  return (
    <>
      {ENTRADAS.map((e) => (
        <Perto key={e.n} nome={`elevador ${e.n} (túnel)`} raio={220} pontos={[{ x: e.pose.x, z: e.pose.z }]}>
          <Seguro><Modelo pecas={e.pecas} pose={e.pose} /></Seguro>
        </Perto>
      ))}
    </>
  )
}

// ── (09/11, bíblia §13) a porta no deserto: a mesma entrada, no pé da torre 1, com a
// placa dos andares do lado (o limite da Kombi, no mundo: o andar dos túneis riscado) ──
function PlacaAndares({ pose }: { pose: Pose }) {
  const d = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 384; c.height = 320
    const g = c.getContext("2d")!
    g.fillStyle = "#0c0a12"; g.fillRect(0, 0, 384, 320)
    g.textBaseline = "middle"; g.font = "800 46px ui-monospace, monospace"
    g.fillStyle = COR_CIDADE; g.fillText("▲ CIDADE", 28, 56)
    g.fillStyle = "#ffffff"; g.fillText("● DESERTO", 28, 136)
    g.fillStyle = "#6a6474"; g.fillText("▼ TÚNEIS", 28, 216)
    g.strokeStyle = "#ff2436"; g.lineWidth = 9; g.beginPath(); g.moveTo(20, 216); g.lineTo(290, 216); g.stroke()
    g.font = "800 28px ui-monospace, monospace"; g.fillStyle = "#ff6b6b"; g.fillText("a Kombi não desce", 28, 280)
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
    return { t, placa: new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), fundo: new THREE.MeshBasicMaterial({ color: "#1c1822" }) }
  }, [])
  useEffect(() => () => { d.t.dispose(); d.placa.dispose(); d.fundo.dispose() }, [d])
  return (
    <group position={[pose.x, pose.y, pose.z]} rotation={[0, pose.rot, 0]}>
      {/* o suporte até a parede da torre e a placa na frente dele */}
      <mesh position={[-3.5, 2.5, -0.6]} material={d.fundo}><boxGeometry args={[2.7, 2.3, 1.2]} /></mesh>
      <mesh position={[-3.5, 2.5, 0.01]} material={d.placa}><planeGeometry args={[2.5, 2.08]} /></mesh>
    </group>
  )
}
export function PortaDeserto({ M }: { M: MundoDisco }) {
  const e = useMemo(() => {
    const p = portaDoDeserto(M)
    const pecas: Peca[] = [{ no: "entrada", cor: COR_CIDADE }, { no: `e_num${p.n}`, cor: COR_CIDADE }, ...faixas("e", p.n)]
    return { pose: { x: p.x, y: p.y, z: p.z, rot: p.rot } as Pose, pecas }
  }, [M])
  return (
    <Perto nome="elevador (deserto)" raio={500} pontos={[{ x: e.pose.x, z: e.pose.z }]}>
      <Seguro><Modelo pecas={e.pecas} pose={e.pose} /><PlacaAndares pose={e.pose} /></Seguro>
    </Perto>
  )
}

// ── lá em cima: a casinha no anel da torre da ponta N (M.torres[N]) ──
function chegadas(M: MundoDisco) {
  return ELEVADORES.flatMap(({ n, faixas: fs }) => {
    const c = M.torres[n]
    if (!c) return []
    const a0 = c.andares.find((a) => a.nome === fs[0])?.ang ?? c.andares[0]?.ang ?? 0
    // um pouco de lado da faixa colorida da linha no prédio (o arco de 0,34 rad)
    const a = a0 + 0.17 + 4 / Math.max(8, c.nucleo)
    const dx = Math.cos(a), dz = Math.sin(a)
    const r0 = c.nucleo * 1.02 + FUNDO_CASINHA // o prédio afina pra cima (×1,08 no pé)
    const pose: Pose = { x: c.x + dx * r0, y: c.topo, z: c.z + dz * r0, rot: Math.atan2(dx, dz) }
    const vao = Math.max(1, c.raio - MEIA_PISTA - r0 + 0.4)
    const pecas: Peca[] = [
      { no: "chegada", cor: COR_CIDADE }, { no: "c_letreiro", cor: COR_CIDADE }, { no: `c_num${n}`, cor: COR_CIDADE },
      ...faixas("c", n), { no: "passarela", cor: COR_CIDADE, escalaZ: vao },
    ]
    return [{ n, pose, pecas }]
  })
}
export function ChegadasElevador({ M }: { M: MundoDisco }) {
  const lista = useMemo(() => chegadas(M), [M])
  return (
    <>
      {lista.map((e) => (
        <Perto key={e.n} nome={`elevador ${e.n} (cidade)`} raio={500} pontos={[{ x: e.pose.x, z: e.pose.z }]}>
          <Seguro><Modelo pecas={e.pecas} pose={e.pose} /></Seguro>
        </Perto>
      ))}
    </>
  )
}
