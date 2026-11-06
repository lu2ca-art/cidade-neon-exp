"use client"
/* eslint-disable react-hooks/immutability -- three.js: os instrumentos balançam a cada toque, mexidos por quadro */

// OS INSTRUMENTOS ANCESTRAIS NA CASA DA D-BEE (T49; reunião de 29/10: cada
// instrumento é a recompensa secundária de uma missão, e aí dá pra ir na casa da
// D-Bee tocar). Todos os 11 têm um lugar fixo no banco e nas prateleiras da
// parede da direita (tudo visitável: o lugar já existe desde o começo):
//   - ganho: com cor, e toca quando você toca nele (as notas andam a cada toque,
//     então tocar de novo e de novo vira uma melodia)
//   - não ganho: apagado, com um cadeado; tocar nele, a D-Bee diz de que missão
//     ele vem ("vem da missão do Alohan"), na legenda da cena
//
// O SOM é o de disco/instrumentos.ts (tocarInstrumento, sintetizado: RASCUNHO).
// O MODELO (06/11): os 11 modelados no Blender (blender/scripts/instrumentos.py,
// public/models/instrumentos.glb, 16,4 mil triângulos, 249 KB): um nó por
// instrumento (o id), uma malha por material (madeira, barro, metal, palha,
// couro, corda, agua), a sombra de canto assada na cor dos vértices. Cada um
// escala pra caber na vaga de hoje (MEDIDA). Se o .glb não carregar (ou
// enquanto carrega), ficam as primitivas low-poly de antes (Modelo).
//
// DESEMPENHO (06/11): geometrias e materiais criados uma vez só (no módulo) e
// compartilhados por todos; nenhuma luz própria (a casa já tem as dela); por
// quadro, só mexe em quem foi tocado há menos de 0,6 s, sem alocar nada.

import { useGLTF } from "@react-three/drei"
import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react"
import * as THREE from "three"
import { sinalizar } from "../interior/bus"
import type { V3 } from "../interior/comum"
import { bip } from "./pecas/sons"
import { daMissao } from "./vitrine"

import { INSTRUMENTOS_ANCESTRAIS, ehInstrumento, tocarInstrumento, type InstrumentoId } from "./instrumentos"
export type { InstrumentoId }

// tudo que dá pra afinar fica aqui
export const CASA_INSTRUMENTOS = {
  // o banco e as prateleiras na parede da direita (x +2,2), 5 por fileira
  x: 2.2,
  z0: -1.35,
  passo: 0.42,
  porFileira: 5,
  alturas: [0.47, 1.12, 1.72], // o tampo do banco, a 1ª e a 2ª prateleira
  // a vaga de cada um (fixa: ganhar um não muda o lugar dos outros). Os altos no banco
  ordem: ["didgeridoo", "berimbau", "sitar", "djembe", "udu", "tambor-agua", "handpan", "kalimba", "caxixi", "flauta-bambu", "ocarina"] as InstrumentoId[],
  // tocar num trancado: a D-Bee não repete a mesma frase antes disso (s)
  repetirAviso: 4,
}

// ── as peças compartilhadas (uma vez só, pra casa inteira) ──
const G = {
  kalimbaCaixa: new THREE.BoxGeometry(0.2, 0.06, 0.26),
  kalimbaLamelas: new THREE.BoxGeometry(0.15, 0.01, 0.14),
  vara: new THREE.CylinderGeometry(0.01, 0.012, 0.62, 6),
  cabaca: new THREE.SphereGeometry(0.08, 10, 7),
  braco: new THREE.BoxGeometry(0.04, 0.5, 0.02),
  flauta: new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8),
  caxixi: new THREE.ConeGeometry(0.07, 0.16, 10),
  pote: new THREE.SphereGeometry(0.12, 12, 9),
  gargalo: new THREE.CylinderGeometry(0.035, 0.045, 0.06, 10),
  didgeridoo: new THREE.CylinderGeometry(0.03, 0.05, 0.55, 10),
  bacia: new THREE.CylinderGeometry(0.14, 0.1, 0.08, 14, 1, true),
  agua: new THREE.CircleGeometry(0.13, 14),
  meiaCabaca: new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  disco: new THREE.SphereGeometry(0.14, 14, 8),
  ocarina: new THREE.SphereGeometry(0.06, 10, 8),
  djembeCima: new THREE.CylinderGeometry(0.1, 0.05, 0.14, 12),
  djembePe: new THREE.CylinderGeometry(0.05, 0.08, 0.1, 12),
  couro: new THREE.CircleGeometry(0.095, 12),
  // o cadeado, a área de tocar, o banco e a prateleira
  cadCorpo: new THREE.BoxGeometry(0.05, 0.045, 0.02),
  cadAlca: new THREE.TorusGeometry(0.016, 0.005, 5, 10, Math.PI),
  area: new THREE.BoxGeometry(0.36, 0.42, 0.4),
  banco: new THREE.BoxGeometry(0.42, 0.45, 2.05),
  prateleira: new THREE.BoxGeometry(0.3, 0.04, 2.05),
}
const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
const M = {
  madeira: mat("#7a4a26"),
  madeiraEscura: mat("#5a2e1a"),
  cabaca: mat("#b07a3a"),
  barro: mat("#8a4a2e", { roughness: 0.95 }),
  aco: mat("#9aa4b2", { metalness: 0.85, roughness: 0.25 }),
  lamelas: mat("#d8d8e0", { metalness: 0.8, roughness: 0.3 }),
  bambu: mat("#c8b070"),
  palha: mat("#c8a868"),
  couro: mat("#efe4cc"),
  agua: mat("#2a6a8a", { roughness: 0.2, metalness: 0.2 }),
  ocarina: mat("#a8603a", { roughness: 0.9 }),
  banco: mat("#4a3020", { roughness: 0.9 }),
  prateleira: mat("#5a3a22", { roughness: 0.9 }),
  // o não ganho: tudo da mesma cor apagada (um material só)
  apagado: mat("#2a2a30", { roughness: 1 }),
  cadeado: mat("#c8a050", { metalness: 0.6, roughness: 0.35, emissive: "#3a2a08" }),
  area: new THREE.MeshBasicMaterial(),
}

// o modelo de cada um (cabe numa vaga de ~0,4 m). `a`: apagado (não ganho)
function Modelo({ id, a }: { id: InstrumentoId; a: boolean }) {
  const m = (x: THREE.Material) => (a ? M.apagado : x)
  switch (id) {
    case "kalimba": return (
      <group rotation-x={-0.5}>
        <mesh position={[0, 0.03, 0]} geometry={G.kalimbaCaixa} material={m(M.madeira)} />
        <mesh position={[0, 0.065, -0.03]} geometry={G.kalimbaLamelas} material={m(M.lamelas)} />
      </group>
    )
    case "berimbau": return (
      <group rotation-x={0.15}>
        <mesh position={[0, 0.3, 0]} geometry={G.vara} material={m(M.madeira)} />
        <mesh position={[0.03, 0.1, 0]} geometry={G.cabaca} material={m(M.cabaca)} />
      </group>
    )
    case "sitar": return (
      <group rotation-z={0.25}>
        <mesh position={[0, 0.1, 0]} scale={[1.2, 1, 0.9]} geometry={G.cabaca} material={m(M.cabaca)} />
        <mesh position={[0, 0.38, 0]} geometry={G.braco} material={m(M.madeiraEscura)} />
      </group>
    )
    case "flauta-bambu": return <mesh position={[0, 0.03, 0]} rotation-x={Math.PI / 2} geometry={G.flauta} material={m(M.bambu)} />
    case "caxixi": return <mesh position={[0, 0.08, 0]} geometry={G.caxixi} material={m(M.palha)} />
    case "udu": return (
      <group>
        <mesh position={[0, 0.11, 0]} scale={[1, 0.9, 1]} geometry={G.pote} material={m(M.barro)} />
        <mesh position={[0, 0.24, 0]} geometry={G.gargalo} material={m(M.barro)} />
      </group>
    )
    case "didgeridoo": return <mesh position={[0, 0.27, 0]} rotation-z={0.2} geometry={G.didgeridoo} material={m(M.madeiraEscura)} />
    case "tambor-agua": return (
      <group>
        <mesh position={[0, 0.04, 0]} geometry={G.bacia} material={m(M.madeira)} />
        <mesh position={[0, 0.07, 0]} rotation-x={-Math.PI / 2} geometry={G.agua} material={m(M.agua)} />
        <mesh position={[0, 0.07, 0]} geometry={G.meiaCabaca} material={m(M.cabaca)} />
      </group>
    )
    case "handpan": return <mesh position={[0, 0.07, 0]} scale={[1, 0.38, 1]} geometry={G.disco} material={m(M.aco)} />
    case "ocarina": return <mesh position={[0, 0.06, 0]} scale={[1.3, 0.8, 1]} geometry={G.ocarina} material={m(M.ocarina)} />
    case "djembe": return (
      <group>
        <mesh position={[0, 0.17, 0]} geometry={G.djembeCima} material={m(M.madeira)} />
        <mesh position={[0, 0.05, 0]} geometry={G.djembePe} material={m(M.madeira)} />
        <mesh position={[0, 0.241, 0]} rotation-x={-Math.PI / 2} geometry={G.couro} material={m(M.couro)} />
      </group>
    )
  }
}

// ── o modelo do Blender ──
const URL = "/models/instrumentos.glb"
// a maior medida de cada um na vaga (m): o tamanho das formas de antes
const MEDIDA: Record<InstrumentoId, number> = {
  djembe: 0.26, "tambor-agua": 0.28, udu: 0.27, caxixi: 0.17, sitar: 0.62, didgeridoo: 0.56,
  berimbau: 0.64, "flauta-bambu": 0.36, ocarina: 0.16, handpan: 0.28, kalimba: 0.22,
}
// a pose na vaga (as mesmas inclinações das formas de antes)
const POSE: Partial<Record<InstrumentoId, [number, number, number]>> = {
  berimbau: [0.15, 0, 0], sitar: [0, 0, 0.25], didgeridoo: [0, 0, 0.2], kalimba: [-0.35, 0, 0],
}
// um material por grupo, compartilhado pelos 11 (a cor vem dos vértices)
const vmat = (extra: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ vertexColors: true, ...extra })
const MG: Record<string, THREE.Material> = {
  madeira: vmat({ roughness: 0.62 }),
  barro: vmat({ roughness: 0.85 }),
  metal: vmat({ roughness: 0.32, metalness: 0.8 }),
  palha: vmat({ roughness: 0.85 }),
  couro: vmat({ roughness: 0.7 }),
  corda: vmat({ roughness: 0.9 }),
  agua: vmat({ roughness: 0.08, metalness: 0.2 }),
}
type Parte = { geo: THREE.BufferGeometry; grupo: string; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }
const caixaTmp = new THREE.Box3()

function ModeloGlb({ id, a }: { id: InstrumentoId; a: boolean }) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }
  const no = nodes[id]
  if (!no) throw new Error(`instrumentos.glb sem o nó ${id}`)
  // as malhas do nó (com a transformação, que a quantização mexe) e a escala da vaga
  const { partes, k } = useMemo(() => {
    no.updateWorldMatrix(true, true)
    caixaTmp.setFromObject(no)
    const t = caixaTmp.getSize(new THREE.Vector3())
    const partes: Parte[] = []
    for (const c of no.children) {
      const m = c as THREE.Mesh
      if (!m.geometry) continue
      partes.push({ geo: m.geometry, grupo: m.name.slice(id.length + 1), pos: m.position, quat: m.quaternion, esc: m.scale })
    }
    return { partes, k: MEDIDA[id] / Math.max(t.x, t.y, t.z, 1e-3) }
  }, [no, id])
  return (
    <group rotation={POSE[id] ?? [0, 0, 0]} scale={k}>
      {partes.map((p, i) => (
        <mesh key={i} geometry={p.geo} material={a ? M.apagado : (MG[p.grupo] ?? MG.madeira)} position={p.pos} quaternion={p.quat} scale={p.esc} />
      ))}
    </group>
  )
}

// se o .glb falhar, cai nas formas de antes
class SeFalhar extends Component<{ reserva: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() { return { erro: true } }
  render() { return this.state.erro ? this.props.reserva : this.props.children }
}
function Peca({ id, a }: { id: InstrumentoId; a: boolean }) {
  const reserva = <Modelo id={id} a={a} />
  return (
    <SeFalhar reserva={reserva}>
      <Suspense fallback={reserva}><ModeloGlb id={id} a={a} /></Suspense>
    </SeFalhar>
  )
}

// o cadeado, na frente do instrumento (virado pra sala, -x)
function Cadeado() {
  return (
    <group position={[-0.17, 0.06, 0]} rotation-y={-Math.PI / 2}>
      <mesh geometry={G.cadCorpo} material={M.cadeado} />
      <mesh position={[0, 0.022, 0]} geometry={G.cadAlca} material={M.cadeado} />
    </group>
  )
}

// onde fica a vaga i (banco, depois as prateleiras)
function vaga(i: number): V3 {
  const C = CASA_INSTRUMENTOS
  const fil = Math.min(C.alturas.length - 1, Math.floor(i / C.porFileira))
  return [C.x, C.alturas[fil], C.z0 + (i % C.porFileira) * C.passo]
}
const VAGAS = CASA_INSTRUMENTOS.ordem.map((_, i) => vaga(i))
const FILEIRAS = Math.min(CASA_INSTRUMENTOS.alturas.length, Math.ceil(CASA_INSTRUMENTOS.ordem.length / CASA_INSTRUMENTOS.porFileira))

// `ids`: os ganhos (o save). `gesto`: a cena pediu "toque os instrumentos".
// Com `novos` (os que chegaram desde a última visita), ela segue sozinha depois
// de tocar cada novo; sem novos (a visita livre), não tem pressa: toca à vontade
// e sai pelo "pronto" da dica (cena.tsx). Sem nenhum ganho, a parede fica vazia
// (o prólogo, antes da 1ª porta)
export function InstrumentosCasa({ ids, gesto = false, novos = [] }: { ids: InstrumentoId[]; gesto?: boolean; novos?: InstrumentoId[] }) {
  const grupos = useRef<(THREE.Group | null)[]>([])
  const bateu = useRef<number[]>(CASA_INSTRUMENTOS.ordem.map(() => -9))
  const vezes = useRef<Partial<Record<InstrumentoId, number>>>({})
  const avisou = useRef<{ id: InstrumentoId | null; em: number }>({ id: null, em: -99 })
  const fimMandado = useRef(false)
  useEffect(() => { if (gesto) fimMandado.current = false }, [gesto])
  const ganhos = new Set(ids.filter(ehInstrumento))
  const ganhosRef = useRef(ganhos)
  ganhosRef.current = ganhos

  const tocar = (i: number, id: InstrumentoId) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const agora = performance.now() / 1000
    bateu.current[i] = agora
    if (!ganhos.has(id)) {
      // trancado: um toque abafado, e a D-Bee diz de onde ele vem
      bip(90, 0.08, "sine", 0.12)
      if (avisou.current.id !== id || agora - avisou.current.em > CASA_INSTRUMENTOS.repetirAviso) {
        avisou.current = { id, em: agora }
        const x = INSTRUMENTOS_ANCESTRAIS[id]
        sinalizar({ t: "fala", de: "D-Bee", texto: `${x.artigo} ${x.nome} ainda não tá aqui. vem da missão ${daMissao(x.missao)}` })
      }
      return
    }
    const n = vezes.current[id] ?? 0
    vezes.current[id] = n + 1
    tocarInstrumento(id, n)
    const novosAqui = novos.filter((x) => ganhos.has(x))
    if (gesto && !fimMandado.current && novosAqui.length && novosAqui.every((x) => (vezes.current[x] ?? 0) > 0)) {
      fimMandado.current = true
      sinalizar({ t: "fim-gesto" })
    }
  }

  // o balanço de quem foi tocado (só mexe em quem bateu há menos de 0,6 s)
  useFrame(() => {
    const agora = performance.now() / 1000
    for (let i = 0; i < VAGAS.length; i++) {
      const g = grupos.current[i]
      if (!g) continue
      const d = agora - bateu.current[i]
      if (d > 0.6) { if (g.rotation.z !== 0) { g.rotation.z = 0; g.scale.setScalar(1) } continue }
      const k = 1 - d / 0.6
      // o trancado só treme um pouco (não acorda)
      g.rotation.z = Math.sin(d * 38) * 0.18 * k * (ganhosRef.current.has(CASA_INSTRUMENTOS.ordem[i]) ? 1 : 0.3)
      g.scale.setScalar(1 + 0.08 * k)
    }
  })

  if (!ganhos.size) return null
  const C = CASA_INSTRUMENTOS
  return (
    <group>
      {/* o banco e as prateleiras */}
      <mesh position={[C.x, 0.22, C.z0 + C.passo * 2]} geometry={G.banco} material={M.banco} />
      {C.alturas.slice(1, FILEIRAS).map((y) => (
        <mesh key={y} position={[C.x + 0.06, y - 0.02, C.z0 + C.passo * 2]} geometry={G.prateleira} material={M.prateleira} />
      ))}
      {C.ordem.map((id, i) => {
        const tem = ganhos.has(id)
        return (
          <group key={id} position={VAGAS[i]}>
            <group ref={(g) => { grupos.current[i] = g }} rotation-y={-Math.PI / 2}>
              <Peca id={id} a={!tem} />
            </group>
            {!tem && <Cadeado />}
            {/* a área de tocar: invisível, um pouco maior que o instrumento */}
            <mesh position={[0, 0.18, 0]} visible={false} onClick={tocar(i, id)} geometry={G.area} material={M.area} />
          </group>
        )
      })}
    </group>
  )
}

useGLTF.preload(URL)
