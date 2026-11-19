"use client"

// AS CASAS DO ANEL, desenhadas (casasAnel.ts: as contas). Uma malha só (InstancedMesh: uma
// chamada de desenho pras ~1300 casas, ~16 mil triângulos), parada (Estatico). A cor de cada
// casa é uma das CORES_CASAS; o teto um pouco mais escuro fica pra quando tiver modelo.

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { Estatico } from "./estatico"
import { CORES_CASAS, casasDoAnel } from "./casasAnel"
import { ruinasNoMundo } from "./ruinas"

type MundoMin = Parameters<typeof casasDoAnel>[0] & Parameters<typeof ruinasNoMundo>[0]

export function CasasAnel({ M }: { M: MundoMin }) {
  const malha = useMemo(() => {
    const { casas } = casasDoAnel(M, ruinasNoMundo(M).colisores)
    const geo = new THREE.BoxGeometry(1, 1, 1)
    geo.translate(0, 0.5, 0) // o pé no chão
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.02 })
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, casas.length))
    const o = new THREE.Object3D(), cor = new THREE.Color()
    casas.forEach((c, i) => {
      o.position.set(c.x, c.y, c.z); o.rotation.set(0, c.giro, 0); o.scale.set(c.w, c.h, c.d); o.updateMatrix()
      im.setMatrixAt(i, o.matrix); im.setColorAt(i, cor.set(CORES_CASAS[c.cor]))
    })
    im.count = casas.length
    im.instanceMatrix.needsUpdate = true
    if (im.instanceColor) im.instanceColor.needsUpdate = true
    im.computeBoundingSphere()
    im.name = "casas-do-anel"
    return im
  }, [M])
  useEffect(() => () => { malha.geometry.dispose(); (malha.material as THREE.Material).dispose(); malha.dispose() }, [malha])
  return <Estatico><primitive object={malha} /></Estatico>
}
