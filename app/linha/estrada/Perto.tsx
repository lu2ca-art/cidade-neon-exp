"use client"

// (leveza A, 30/10, problema 3) SÓ O QUE ESTÁ PERTO FICA MONTADO.
//
// <Perto> monta os filhos quando a câmera chega a `raio` metros (no plano XZ)
// de algum dos pontos do bloco, e desmonta quando ela se afasta mais que
// `raio * (1 + folga)` (a folga evita monta-desmonta na borda). Desmontado, o
// bloco não tem malha, nem draw call, nem useFrame.
//
// De onde vêm os pontos:
//   - `pontos`: a lista dada (ex.: o centro do subúrbio, os lugares do chão);
//   - sem `pontos`: o bloco é montado UMA vez, medido (os centros das malhas,
//     juntados numa grade de 120 m) e guardado no módulo pelo `nome`; dali em
//     diante, inclusive nas remontagens do <Corrida>, vale a medida guardada.
//   - `fora`: ao contrário, monta quando a câmera está LONGE de todos os
//     pontos (ex.: os robôs, que só vivem no deserto, longe do centro).
//
// Uso:
//   <Perto nome="subúrbio" raio={900} pontos={[{ x: cx, z: cz }]}><Suburbio … /></Perto>
//   <Perto nome="fachadas" raio={600}><Fachadas M={M} … /></Perto>
//   <SoQuando teste={() => dentroRef.current}><Cabine … /></SoQuando>
//
// O teste roda a cada `aCada` quadros e não aloca. O setState só acontece na
// troca (monta/desmonta), que é rara. Só a main thread (como o grafo do three).

import { Suspense, useRef, useState, type ReactNode } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export type PontoXZ = { x: number; z: number }

// os pontos medidos de cada bloco (sobrevivem à remontagem do <Corrida>)
const MEDIDOS = new Map<string, PontoXZ[]>()
const CELULA = 120

function medir(g: THREE.Object3D): PontoXZ[] {
  const celulas = new Map<string, PontoXZ>()
  const esfera = new THREE.Sphere()
  g.updateMatrixWorld(true)
  g.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.geometry || !(m.isMesh || (o as THREE.Points).isPoints || (o as THREE.Line).isLine)) return
    if ((m as THREE.InstancedMesh).isInstancedMesh) {
      const im = m as THREE.InstancedMesh
      if (im.count === 0) return
      if (!im.boundingSphere) im.computeBoundingSphere()
      esfera.copy(im.boundingSphere!)
    } else {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere()
      if (!m.geometry.boundingSphere) return
      esfera.copy(m.geometry.boundingSphere)
    }
    esfera.applyMatrix4(m.matrixWorld)
    if (!Number.isFinite(esfera.center.x) || !Number.isFinite(esfera.center.z)) return
    const k = `${Math.round(esfera.center.x / CELULA)}:${Math.round(esfera.center.z / CELULA)}`
    if (!celulas.has(k)) celulas.set(k, { x: esfera.center.x, z: esfera.center.z })
  })
  return [...celulas.values()]
}

/**
 * Monta os filhos só com a câmera perto (ou longe, com `fora`) dos pontos.
 * @example <Perto nome="parque" raio={700} pontos={areaDoParque(M)}><Parque M={M} passeio={p} /></Perto>
 */
export function Perto({ nome, raio, pontos, fora = false, folga = 0.15, aCada = 10, aoSair, children }: {
  nome: string
  raio: number
  pontos?: PontoXZ[]
  fora?: boolean
  folga?: number
  aCada?: number
  /** chamado quando os filhos desmontam (ex.: zerar um estado global do bloco) */
  aoSair?: () => void
  children: ReactNode
}) {
  const medidos = pontos ?? MEDIDOS.get(nome) ?? null
  // sem pontos ainda: monta pra medir
  const [montado, setMontado] = useState(() => !medidos)
  const g = useRef<THREE.Group>(null)
  const st = useRef({ quadro: aCada, medindo: medidos ? 0 : 1 })
  useFrame(({ camera }) => {
    const s = st.current
    if (s.medindo > 0) {
      // espera os filhos montarem (e o Suspense resolver) antes de medir
      if (++s.medindo < 30 || !g.current) return
      const p = medir(g.current)
      if (!p.length && s.medindo < 600) { s.medindo = 1; return }
      MEDIDOS.set(nome, p)
      s.medindo = 0
      return
    }
    if (++s.quadro < aCada) return
    s.quadro = 0
    const lista = pontos ?? MEDIDOS.get(nome)
    if (!lista || !lista.length) return
    const cx = camera.position.x, cz = camera.position.z
    let d2 = Infinity
    for (let i = 0; i < lista.length; i++) {
      const dx = lista[i].x - cx, dz = lista[i].z - cz
      const q = dx * dx + dz * dz
      if (q < d2) d2 = q
    }
    const entra = raio * raio, sai = raio * (1 + folga) * raio * (1 + folga)
    const quer = fora ? (montado ? d2 > entra : d2 > sai) : (montado ? d2 < sai : d2 < entra)
    if (quer !== montado) {
      if (!quer) aoSair?.()
      setMontado(quer)
    }
  })
  return <group ref={g}>{montado && <Suspense fallback={null}>{children}</Suspense>}</group>
}

/**
 * Monta os filhos só enquanto `teste()` é verdadeiro (checado a cada `aCada`
 * quadros). Ao ficar falso, espera `segura` segundos antes de desmontar (uma
 * troca rápida de câmera não remonta).
 * @example <SoQuando teste={() => dentroRef.current}><Cabine … /></SoQuando>
 */
export function SoQuando({ teste, aCada = 6, segura = 2, children }: { teste: () => boolean; aCada?: number; segura?: number; children: ReactNode }) {
  const [montado, setMontado] = useState(false)
  const st = useRef({ quadro: aCada, fora: 0 })
  useFrame((_, dt) => {
    const s = st.current
    const sim = teste()
    if (sim) s.fora = 0
    else s.fora += dt
    if (++s.quadro < aCada) return
    s.quadro = 0
    const quer = sim || (montado && s.fora < segura)
    if (quer !== montado) setMontado(quer)
  })
  return <>{montado && <Suspense fallback={null}>{children}</Suspense>}</>
}
