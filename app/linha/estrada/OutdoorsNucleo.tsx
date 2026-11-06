"use client"

// As placas do Núcleo nas fachadas da cidade (T46; dados, atlas e shader em
// outdoorsDados.ts). Uma InstancedMesh por quadra de 900 m (o que está atrás
// da câmera nem vai pra placa de vídeo), todas com o mesmo material: poucos
// draw calls, nenhuma luz, e por quadro só o uniform de tempo (sem alocar).
// Quem monta/desmonta é o <Perto> em Corrida.tsx.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { materialOutdoors, type Placa } from "./outdoorsDados"

export function OutdoorsNucleo({ quadras }: { quadras: { l: Placa[] }[] }) {
  const malhas = useMemo(() => {
    const mat = materialOutdoors()
    const d = new THREE.Object3D()
    return quadras.map(({ l }) => {
      const geo = new THREE.PlaneGeometry(1, 1)
      const idx = new Float32Array(l.length * 3)
      const m = new THREE.InstancedMesh(geo, mat, l.length)
      l.forEach((p, k) => {
        d.position.set(p.x, p.y, p.z); d.rotation.set(0, p.rot, 0); d.scale.set(p.w, p.h, 1); d.updateMatrix()
        m.setMatrixAt(k, d.matrix)
        idx[k * 3] = p.produto; idx[k * 3 + 1] = p.faixa; idx[k * 3 + 2] = p.semente
      })
      geo.setAttribute("aIdx", new THREE.InstancedBufferAttribute(idx, 3))
      m.computeBoundingSphere()
      return m
    })
  }, [quadras])
  // (o material e o atlas são do módulo; só as geometrias saem ao desmontar)
  useEffect(() => () => malhas.forEach((m) => { m.geometry.dispose(); m.dispose() }), [malhas])
  useFrame((s) => { materialOutdoors().uniforms.uTempo.value = s.clock.elapsedTime })
  return <group>{malhas.map((m, i) => <primitive key={i} object={m} />)}</group>
}
