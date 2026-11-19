"use client"

// O DESENHO DA ILHA POR BAIXO (ilha.ts): o cone pendurado na beira do disco e os túneis
// construídos por fora dele (tubo translúcido, o rio de neon correndo dentro, as costelas
// de reforço e os salões como cúpulas coladas no cone). Só no mapa-disco.
// Desempenho: tudo montado uma vez; ~13 malhas paradas (as costelas são uma instância só).
// Lá de cima, quase sempre atrás da névoa: aparece na beira, no deserto e na queda.

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { geoCone, tubosDaIlha } from "./ilha"

export function Ilha() {
  const m = useMemo(() => {
    const cone = geoCone(), t = tubosDaIlha()
    const matCone = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, emissive: "#1a1018", emissiveIntensity: 0.6 })
    const matCasca = new THREE.MeshStandardMaterial({ color: "#4a3d78", emissive: "#1a1430", roughness: 0.35, metalness: 0.2, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false })
    const rios = t.rios.map((r) => ({ geo: r.geo, mat: new THREE.MeshBasicMaterial({ color: r.cor, toneMapped: false }) }))
    const geoCostela = new THREE.TorusGeometry(31, 2.6, 6, 20)
    const matCostela = new THREE.MeshStandardMaterial({ color: "#8f84c8", roughness: 0.6 })
    const costelas = new THREE.InstancedMesh(geoCostela, matCostela, t.costelas.length)
    t.costelas.forEach((mx, i) => costelas.setMatrixAt(i, mx))
    costelas.instanceMatrix.needsUpdate = true
    costelas.computeBoundingSphere()
    const geoSalao = new THREE.SphereGeometry(1, 28, 16)
    const matAnel = new THREE.MeshBasicMaterial({ color: "#9b8cff", toneMapped: false })
    const geoAnel = new THREE.TorusGeometry(1, 0.04, 8, 48)
    return { cone, matCone, casca: t.casca, matCasca, rios, costelas, geoCostela, matCostela, saloes: t.saloes, geoSalao, matAnel, geoAnel }
  }, [])
  useEffect(() => () => {
    m.cone.dispose(); m.matCone.dispose(); m.casca.dispose(); m.matCasca.dispose()
    m.rios.forEach((r) => { r.geo.dispose(); r.mat.dispose() })
    m.costelas.dispose(); m.geoCostela.dispose(); m.matCostela.dispose()
    m.geoSalao.dispose(); m.matAnel.dispose(); m.geoAnel.dispose()
  }, [m])
  return (
    <group name="ilha-por-baixo">
      <mesh geometry={m.cone} material={m.matCone} />
      <mesh geometry={m.casca} material={m.matCasca} renderOrder={2} />
      {m.rios.map((r, i) => <mesh key={i} geometry={r.geo} material={r.mat} />)}
      <primitive object={m.costelas} />
      {m.saloes.map((s) => (
        <group key={s.n} position={s.p}>
          <mesh geometry={m.geoSalao} material={m.matCasca} scale={[s.r, s.r * 0.7, s.r]} renderOrder={2} />
          <mesh geometry={m.geoAnel} material={m.matAnel} scale={s.r} rotation-x={Math.PI / 2} />
        </group>
      ))}
    </group>
  )
}
