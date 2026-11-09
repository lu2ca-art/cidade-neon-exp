"use client"

// OS MARCOS DOS INSTRUMENTOS NO CHÃO (bíblia §13, 09/11): cada um que falta achar
// fica em cima de três pedras, com um anel e uma luz baixa na cor dele. O marco é
// um desenho só (pedras) e outro (luz), refeito só quando acha um; sem nada por
// quadro. O modelo de verdade (o mesmo da casa da D-Bee) só monta bem perto (<Perto>).
// Os dados: disco/instrumentosMundo.ts.

import { useEffect, useMemo, useSyncExternalStore } from "react"
import * as THREE from "three"
import { Perto } from "../estrada/Perto"
import { Peca } from "./InstrumentosCasa"
import { caixa, cil, juntar, type Peca3 } from "./LugaresChao"
import { IDS_NO_MUNDO, INSTRUMENTOS_MUNDO, NO_MUNDO, achadosAgora, corDoAchado, ouvirAchados } from "./instrumentosMundo"
import type { InstrumentoId } from "./instrumentos"

const VAZIO: readonly InstrumentoId[] = []

export function InstrumentosNoMundo({ chao }: { chao: (x: number, z: number) => number }) {
  const achados = useSyncExternalStore(ouvirAchados, achadosAgora, () => VAZIO)
  const faltam = useMemo(() => IDS_NO_MUNDO.filter((id) => !achados.includes(id)), [achados])
  const desenho = useMemo(() => {
    if (!faltam.length) return null
    const pedras: Peca3[] = [], luz: Peca3[] = []
    for (const id of faltam) {
      const { x, z } = INSTRUMENTOS_MUNDO[id], y = chao(x, z), cor = corDoAchado(id)
      pedras.push(
        { g: new THREE.DodecahedronGeometry(1, 0), cor: "#6b5a48", p: [x, y + 0.45, z], r: [0.4, x, 0.2] },
        { g: new THREE.DodecahedronGeometry(0.7, 0), cor: "#7a6a56", p: [x + 0.15, y + 1, z - 0.1], r: [z, 0.3, 0.5] },
        { g: caixa(1.1, 0.12, 1.1), cor: "#57493a", p: [x, y + NO_MUNDO.alturaPedra - 0.06, z], r: [0, x, 0] },
      )
      luz.push(
        { g: cil(0.4, 0.9, 16, 8), cor, p: [x, y + 8, z] },
        { g: new THREE.RingGeometry(2.2, 2.7, 24), cor, p: [x, y + 0.15, z], r: [-Math.PI / 2, 0, 0] },
      )
    }
    return { pedras: juntar(pedras), luz: juntar(luz) }
  }, [faltam, chao])
  useEffect(() => () => { desenho?.pedras.dispose(); desenho?.luz.dispose() }, [desenho])
  const mats = useMemo(() => ({
    pedra: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: "#2a221a", emissiveIntensity: 0.6 }),
    luz: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }),
  }), [])
  if (!desenho) return null
  return (
    <>
      <mesh geometry={desenho.pedras} material={mats.pedra} />
      <mesh geometry={desenho.luz} material={mats.luz} />
      {faltam.map((id) => {
        const p = INSTRUMENTOS_MUNDO[id]
        return (
          <Perto key={id} nome={`instrumento-${id}`} raio={NO_MUNDO.raioModelo} pontos={PONTOS[id]}>
            <group position={[p.x, chao(p.x, p.z) + NO_MUNDO.alturaPedra, p.z]} scale={NO_MUNDO.escala}><Peca id={id} a={false} /></group>
          </Perto>
        )
      })}
    </>
  )
}

const PONTOS = Object.fromEntries(IDS_NO_MUNDO.map((id) => [id, [INSTRUMENTOS_MUNDO[id]]])) as Record<InstrumentoId, { x: number; z: number }[]>
