"use client"
/* eslint-disable react-hooks/immutability -- three.js: os instrumentos balançam a cada toque, mexidos por quadro */

// OS INSTRUMENTOS DELE, DENTRO DA KOMBI (bíblia §13, 09/11): uma prateleira na
// parede de ripas, em cima do sofá (olhando pra esquerda, de dentro). Os pequenos
// em pé na tábua; os três compridos deitados embaixo. Aparece tudo que ele tem:
// achados e ganhos em missão (disco/instrumentosMundo.ts). Tocar: o mesmo som da casa da D-Bee (as notas andam
// a cada toque). A trilha para pra fazer música (bíblia §9) e volta sozinha uns
// segundos depois do último toque, de onde estava.
//
// Mesmo modelo e mesmas peças da casa (disco/InstrumentosCasa.tsx); nenhuma luz
// nova; por quadro, só mexe em quem foi tocado há menos de 0,6 s, sem alocar.

import { useFrame, type ThreeEvent } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import * as THREE from "three"
import { fazerMusica } from "../som"
import { Peca } from "../disco/InstrumentosCasa"
import { tocarInstrumento, type InstrumentoId } from "../disco/instrumentos"
import { ouvirTem, temAgora } from "../disco/instrumentosMundo"

type V3 = [number, number, number]

// tudo que dá pra afinar fica aqui (no espaço do desenho do estúdio, EstudioKombi)
const NA_KOMBI = {
  x: -0.79, // a parede de ripas é em -0,86
  yTabua: 1.05,
  z0: 0.3,
  passo: 0.185,
  yDeitados: 0.95,
  escalaPequeno: 0.65,
  escalaDeitado: 0.78,
  voltaMusica: 5, // s depois do último toque, a trilha volta
}
const PEQUENOS: InstrumentoId[] = ["djembe", "udu", "tambor-agua", "handpan", "kalimba", "caxixi", "flauta-bambu", "ocarina"]
const DEITADOS: { id: InstrumentoId; z: number }[] = [{ id: "sitar", z: 0.45 }, { id: "didgeridoo", z: 0.98 }, { id: "berimbau", z: 1.5 }]

type Vaga = { p: V3; deitado: boolean; area: V3; areaC: V3 }
const VAGAS = new Map<InstrumentoId, Vaga>([
  ...PEQUENOS.map((id, i): [InstrumentoId, Vaga] => [id, { p: [NA_KOMBI.x, NA_KOMBI.yTabua + 0.0125, NA_KOMBI.z0 + i * NA_KOMBI.passo], deitado: false, area: [0.2, 0.26, 0.18], areaC: [0, 0.12, 0] }]),
  ...DEITADOS.map(({ id, z }): [InstrumentoId, Vaga] => [id, { p: [NA_KOMBI.x, NA_KOMBI.yDeitados, z - 0.25], deitado: true, area: [0.12, 0.14, 0.54], areaC: [0, 0, 0.25] }]),
])

const G = {
  tabua: new THREE.BoxGeometry(0.13, 0.025, 1.55),
  area: new THREE.BoxGeometry(1, 1, 1),
}
const M = {
  tabua: new THREE.MeshStandardMaterial({ color: "#caa877", roughness: 0.8 }),
  area: new THREE.MeshBasicMaterial(),
}

export function InstrumentosKombi({ escala, desloca }: { escala: V3; desloca: V3 }) {
  const ids = useSyncExternalStore(ouvirTem, temAgora, temAgora)
  const grupos = useRef(new Map<InstrumentoId, THREE.Group>())
  const bateu = useRef(new Map<InstrumentoId, number>())
  const vezes = useRef(new Map<InstrumentoId, number>())
  const ativos = useRef(0)
  const fazendo = useRef(false)
  const volta = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (volta.current) clearTimeout(volta.current)
    if (fazendo.current) { fazendo.current = false; fazerMusica(false) }
  }, [])

  const tocar = (id: InstrumentoId) => (e: ThreeEvent<MouseEvent>) => {
    // arrastou pra olhar em volta: não é toque
    if (e.delta > 8) return
    e.stopPropagation()
    if (!fazendo.current) { fazendo.current = true; fazerMusica(true) }
    if (volta.current) clearTimeout(volta.current)
    volta.current = setTimeout(() => { volta.current = null; if (fazendo.current) { fazendo.current = false; fazerMusica(false) } }, NA_KOMBI.voltaMusica * 1000)
    const n = vezes.current.get(id) ?? 0
    vezes.current.set(id, n + 1)
    tocarInstrumento(id, n)
    bateu.current.set(id, performance.now() / 1000)
    ativos.current = 1
  }

  // o balanço de quem foi tocado (só mexe em quem bateu há menos de 0,6 s)
  useFrame(() => {
    if (!ativos.current) return
    const agora = performance.now() / 1000
    let vivos = 0
    bateu.current.forEach((t, id) => {
      const g = grupos.current.get(id)
      if (!g) return
      const d = agora - t
      if (d > 0.6) { if (g.rotation.z !== 0) { g.rotation.z = 0; g.scale.setScalar(1) } return }
      const k = 1 - d / 0.6
      g.rotation.z = Math.sin(d * 38) * 0.18 * k
      g.scale.setScalar(1 + 0.08 * k)
      vivos++
    })
    if (!vivos) ativos.current = 0
  })

  // (o espaço do estúdio é esticado; aqui fica no espaço da Kombi, sem esticar o modelo)
  const posDe = useMemo(() => (p: V3): V3 => [p[0] * escala[0] + desloca[0], p[1] * escala[1] + desloca[1], p[2] * escala[2] + desloca[2]], [escala, desloca])
  if (!ids.length) return null
  return (
    <group>
      <mesh position={posDe([NA_KOMBI.x, NA_KOMBI.yTabua, 0.95])} geometry={G.tabua} material={M.tabua} />
      {ids.map((id) => {
        const v = VAGAS.get(id)
        if (!v) return null
        return (
          <group key={id} position={posDe(v.p)}>
            <group ref={(g) => { if (g) grupos.current.set(id, g); else grupos.current.delete(id) }} rotation-y={Math.PI / 2}>
              <group rotation-x={v.deitado ? Math.PI / 2 : 0} scale={v.deitado ? NA_KOMBI.escalaDeitado : NA_KOMBI.escalaPequeno}><Peca id={id} a={false} /></group>
            </group>
            {/* a área de tocar: invisível, um pouco maior que o instrumento */}
            <mesh position={v.areaC} scale={v.area} visible={false} onClick={tocar(id)} geometry={G.area} material={M.area} />
          </group>
        )
      })}
    </group>
  )
}
