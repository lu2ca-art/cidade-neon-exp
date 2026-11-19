// O material único das peças modeladas no Blender (moto, patins, skate, BMX):
// cada peça leva a cor (× AO) em COLOR_0, (roughness, metalness) em _RM e o
// brilho em _EMI; o glb vira "color"/"aRM"/"aEmi" e UM material desenha tudo.
// (era do Pilotos.tsx; mudou pra cá pra o Patinador usar o mesmo, sem duplicar)

import * as THREE from "three"

export const MAT_PECAS = (() => {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aRM;\nattribute vec3 aEmi;\nvarying vec2 vRM;\nvarying vec3 vEmi;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRM = aRM;\nvEmi = aEmi;")
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vRM;\nvarying vec3 vEmi;")
      .replace("vec3 totalEmissiveRadiance = emissive;", "vec3 totalEmissiveRadiance = vEmi;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = vRM.x;")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = vRM.y;")
  }
  m.customProgramCacheKey = () => "moto-pecas"
  return m
})()

export function emFloat(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) {
  const n = a.count, k = a.itemSize, out = new Float32Array(n * k)
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) out[i * k + j] = a.getComponent(i, j)
  return new THREE.BufferAttribute(out, k)
}

/** um nó do glb → geometria em float no referencial do pivô (o meshopt quantiza
 *  a posição e guarda a escala no nó: aplico a matriz do nó numa cópia) */
export function geoDoNo(nodes: Record<string, THREE.Object3D>, nome: string, arquivo: string) {
  const o = nodes[nome] as THREE.Mesh | undefined
  const src = o?.isMesh ? o.geometry : null
  const pos = src?.getAttribute("position"), nor = src?.getAttribute("normal"), cor = src?.getAttribute("color")
  const rm = src?.getAttribute("_rm"), emi = src?.getAttribute("_emi")
  if (!o || !src || !pos || !nor || !cor || !rm || !emi || !src.index) throw new Error(`${arquivo}: falta ${nome}`)
  const g = new THREE.BufferGeometry()
  g.setIndex(src.index.clone())
  g.setAttribute("position", emFloat(pos))
  g.setAttribute("normal", emFloat(nor))
  g.setAttribute("color", emFloat(cor))
  g.setAttribute("aRM", emFloat(rm))
  g.setAttribute("aEmi", emFloat(emi))
  o.updateMatrix()
  g.applyMatrix4(o.matrix)
  g.computeBoundingSphere()
  return g
}

/** os veículos sem motor do jogador (blender/scripts/rodas.py → public/models/rodas.glb) */
export const URL_RODAS = "/models/rodas.glb"
