"use client"

// (22/10, perf 003) O QUE NÃO SE MEXE: o three recompõe a matriz de todo objeto
// em todo quadro (matrixAutoUpdate), mesmo dos prédios, placas e do subúrbio,
// que nunca saem do lugar. Aqui a matriz é calculada uma vez e congelada.
//
// Uso:
//   <Estatico>{/* malhas fixas */}</Estatico>
//   congelar(modelo) // num objeto montado à mão (useMemo), depois de posicionar
//
// Regra: só pra coisa que NÃO anima nem muda de posição/rotação/escala por
// props depois de montar. Se mudar, chame `congelar` de novo (ou não use).
// Não é thread-safe (como todo o grafo do three: só na main thread).

import { useLayoutEffect, useRef, type ReactNode } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

export function congelar(o: THREE.Object3D) {
  o.traverse((x) => {
    x.updateMatrix()
    x.matrixAutoUpdate = false
  })
  // a matriz do mundo ainda é atualizada pelo pai (matrixWorldNeedsUpdate)
  o.updateMatrixWorld(true)
}

export function Estatico({ children }: { children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  // (o filho aplica as props antes do efeito do pai: aqui já está tudo no lugar)
  useLayoutEffect(() => { if (g.current) congelar(g.current) })
  return <group ref={g}>{children}</group>
}

// (22/10, perf 003) MESCLAR POR MATERIAL: um modelo importado (o subúrbio: 154
// malhas, 117 delas com o mesmo material ATLAS) vira uma malha por material e
// por célula de uma grade (`celulas` × `celulas` no plano XZ), pra continuar
// cortando o que está fora da tela. Instâncias (InstancedMesh), malhas com
// skin/morph e grupos com atributos diferentes ficam como estão.
// Os atributos comprimidos (meshopt/quantizados, Int16 normalizado) viram Float32
// antes de aplicar a matriz. Chamar com o modelo ainda sem pai (matriz do mundo = a dele).
//
// Uso: const g = scene.clone(true); mesclarPorMaterial(g, 3)
export function mesclarPorMaterial(raiz: THREE.Object3D, celulas = 3): { antes: number; depois: number } {
  raiz.updateMatrixWorld(true)
  const inv = new THREE.Matrix4().copy(raiz.matrixWorld).invert()
  const malhas: THREE.Mesh[] = []
  raiz.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || Array.isArray(m.material) || m.morphTargetInfluences?.length) return
    malhas.push(m)
  })
  const caixa = new THREE.Box3()
  for (const m of malhas) { m.geometry.computeBoundingBox(); caixa.union(m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld)) }
  const tam = caixa.getSize(new THREE.Vector3())
  const c = new THREE.Vector3()
  const grupos = new Map<string, THREE.Mesh[]>()
  for (const m of malhas) {
    m.geometry.boundingBox!.getCenter(c).applyMatrix4(m.matrixWorld)
    const cx = Math.min(celulas - 1, Math.floor(((c.x - caixa.min.x) / Math.max(tam.x, 1e-6)) * celulas))
    const cz = Math.min(celulas - 1, Math.floor(((c.z - caixa.min.z) / Math.max(tam.z, 1e-6)) * celulas))
    const g = m.geometry
    const k = `${(m.material as THREE.Material).uuid}|${cx},${cz}|${Object.keys(g.attributes).sort().join(",")}|${g.index ? 1 : 0}|${m.renderOrder}|${m.castShadow}${m.receiveShadow}`
    const l = grupos.get(k) ?? []
    l.push(m)
    grupos.set(k, l)
  }
  const mat = new THREE.Matrix4()
  let depois = 0
  for (const l of grupos.values()) {
    if (l.length < 2) { depois++; continue }
    const geos = l.map((m) => {
      const g = new THREE.BufferGeometry()
      for (const [nome, a] of Object.entries(m.geometry.attributes)) {
        const arr = new Float32Array(a.count * a.itemSize)
        for (let i = 0; i < a.count; i++) for (let j = 0; j < a.itemSize; j++) arr[i * a.itemSize + j] = a.getComponent(i, j)
        g.setAttribute(nome, new THREE.BufferAttribute(arr, a.itemSize))
      }
      if (m.geometry.index) g.setIndex(Array.from(m.geometry.index.array as ArrayLike<number>))
      g.applyMatrix4(mat.multiplyMatrices(inv, m.matrixWorld))
      return g
    })
    const junta = mergeGeometries(geos, false)
    geos.forEach((g) => g.dispose())
    if (!junta) { depois += l.length; continue }
    junta.computeBoundingSphere()
    const nova = new THREE.Mesh(junta, l[0].material)
    nova.name = `mesclado:${(l[0].material as THREE.Material).name}`
    nova.renderOrder = l[0].renderOrder; nova.castShadow = l[0].castShadow; nova.receiveShadow = l[0].receiveShadow
    for (const m of l) m.removeFromParent()
    raiz.add(nova)
    depois++
  }
  return { antes: malhas.length, depois }
}

/**
 * (revisão 05/11) Descarta as geometrias que mesclarPorMaterial criou numa cópia
 * (`raiz`), sem tocar nas do modelo original (`de`: a cena ou os nós do glb, em
 * cache no useGLTF e usadas de novo na próxima montagem). Chamar ao desmontar.
 * @example useEffect(() => () => descartarMescladas(modelo, scene), [modelo, scene])
 */
export function descartarMescladas(raiz: THREE.Object3D, de: THREE.Object3D | Record<string, THREE.Object3D>) {
  const originais = new Set<THREE.BufferGeometry>()
  const juntar = (o: THREE.Object3D) => o.traverse((x) => { const g = (x as THREE.Mesh).geometry; if (g) originais.add(g) })
  if (de instanceof THREE.Object3D) juntar(de)
  else for (const o of Object.values(de)) juntar(o)
  raiz.traverse((x) => {
    const g = (x as THREE.Mesh).geometry
    if (g && !originais.has(g)) g.dispose()
  })
}
