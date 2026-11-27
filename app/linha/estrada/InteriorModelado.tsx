"use client"

// O interior da Kombi modelado no Blender (blender/scripts/kombi_interior.py):
// teto de tábuas curvo, paredes de ripas, painel, portas, bancos de pelúcia,
// sofá com a manta xadrez, o estúdio. A sombra de canto vem assada na cor dos
// vértices; aqui só entra o material de cada grupo:
//   lata   → a pintura da Kombi (a cor do vértice é só a sombra)
//   fosco  → madeira, tecido, plástico
//   cromo  → metal
//   brilho → luzinhas e LEDs (sem luz da cena)
//   pelo   → base + duas cascas de fios (como no EstudioKombi)
// Fica fora da escala do layout: o modelo já está em metros, no espaço da Kombi.

import { useGLTF } from "@react-three/drei"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { concha, texturaFios, texturaTom } from "./EstudioKombi"

const URL = "/models/kombi-interior.glb"

type Props = { tinta: string; onPronto?: () => void }

export function InteriorModelado({ tinta, onPronto }: Props) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }

  const mats = useMemo(() => {
    const fios = texturaFios(), tom = texturaTom()
    return {
      fios, tom,
      lata: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.1 }),
      fosco: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 }),
      cromo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.75 }),
      brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      pelo: new THREE.MeshStandardMaterial({ vertexColors: true, map: tom, roughness: 1 }),
      casca1: concha(0.006, 0.45, fios, tom),
      casca2: concha(0.013, 0.7, fios, tom),
    }
  }, [])
  useEffect(() => { mats.lata.color.set(tinta) }, [mats, tinta])
  useEffect(() => () => { Object.values(mats).forEach((m) => m.dispose()) }, [mats])

  // cada grupo: a geometria (com a transformação do nó, que a quantização mexe)
  const partes = useMemo(() => {
    const pega = (nome: string) => {
      const o = nodes[nome] as THREE.Mesh | undefined
      if (!o?.geometry) return null
      return { geo: o.geometry, pos: o.position.clone(), quat: o.quaternion.clone(), esc: o.scale.clone() }
    }
    const pelo = pega("pelo")
    if (pelo && !pelo.geo.attributes.uv) {
      // UV pelo espaço em metros (desfaz a escala da quantização; a posição
      // quantizada não pode ser escalada no lugar)
      const p = pelo.geo.attributes.position, n = pelo.geo.attributes.normal
      const uv = new Float32Array(p.count * 2), e = pelo.esc, dens = 16 / 1.3
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) * e.x, y = p.getY(i) * e.y, z = p.getZ(i) * e.z
        const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
        const [u, v] = ax >= ay && ax >= az ? [z, y] : ay >= az ? [x, z] : [x, y]
        uv[i * 2] = u * dens; uv[i * 2 + 1] = v * dens
      }
      pelo.geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
    }
    const lata = pega("lata"), cromo = pega("cromo")
    // (27/11) o casulo do velocímetro do .glb estava inclinado ao contrário (a "pálpebra"
    // por cima do mostrador). Agora ele é do código (InteriorKombi); até o próximo export
    // (o script já não faz o casulo), os vértices dele somem aqui: viram um ponto só
    if (lata) murcha(lata, CASULO, 0.115)
    if (cromo) murcha(cromo, AROC, 0.07)
    // (27/11, o dono) a cadeira de ripas listradas (a "cadeira gamer") saiu do script;
    // até o próximo export, some aqui também
    const fosco = pega("fosco")
    for (const p of [fosco, cromo]) if (p) murchaCaixa(p, CADEIRA_MIN, CADEIRA_MAX)
    return { lata, fosco, cromo, brilho: pega("brilho"), pelo }
  }, [nodes])

  useEffect(() => { onPronto?.() }, [onPronto])

  const malha = (p: (typeof partes)["lata"], m: THREE.Material, k?: string) =>
    p && <mesh key={k} geometry={p.geo} material={m} position={p.pos} quaternion={p.quat} scale={p.esc} />

  // (o nome: o teste acha o interior na cena)
  return (
    <group name="kombi-interior">
      {malha(partes.lata, mats.lata)}
      {malha(partes.fosco, mats.fosco)}
      {malha(partes.cromo, mats.cromo)}
      {malha(partes.brilho, mats.brilho)}
      {malha(partes.pelo, mats.pelo, "p0")}
      {malha(partes.pelo, mats.casca1, "p1")}
      {malha(partes.pelo, mats.casca2, "p2")}
    </group>
  )
}

useGLTF.preload(URL)

// o casulo e o aro no espaço da Kombi (metros): o layout × ESCALA + DESLOCA (Cabine.tsx)
const CASULO = new THREE.Vector3(-0.4 * 0.98, 0.865 * 1.3 + 0.3, -0.965 * 1.3 - 0.35)
const AROC = new THREE.Vector3(-0.4 * 0.98, 0.873 * 1.3 + 0.3, -0.937 * 1.3 - 0.35)
// a caixa da cadeira (no mundo): entre o sofá e o suporte dos teclados, antes da mesa
const CADEIRA_MIN = new THREE.Vector3(-0.23, 0.2, 0.84), CADEIRA_MAX = new THREE.Vector3(0.33, 1.8, 1.5)
/** junta num ponto só os vértices dentro da caixa */
function murchaCaixa(p: Parte, min: THREE.Vector3, max: THREE.Vector3) {
  const a = p.geo.attributes.position as THREE.BufferAttribute
  const m = new THREE.Matrix4().compose(p.pos, p.quat, p.esc), v = new THREE.Vector3(), caixa = new THREE.Box3(min, max)
  let alvo = -1
  for (let i = 0; i < a.count; i++) {
    v.fromBufferAttribute(a, i).applyMatrix4(m)
    if (!caixa.containsPoint(v)) continue
    if (alvo < 0) { alvo = i; continue }
    a.setXYZ(i, a.getX(alvo), a.getY(alvo), a.getZ(alvo))
  }
  if (alvo >= 0) a.needsUpdate = true
}
type Parte = { geo: THREE.BufferGeometry; pos: THREE.Vector3; quat: THREE.Quaternion; esc: THREE.Vector3 }
/** junta num ponto só os vértices a menos de `r` do centro (os triângulos somem) */
function murcha(p: Parte, centro: THREE.Vector3, r: number) {
  const a = p.geo.attributes.position as THREE.BufferAttribute
  const m = new THREE.Matrix4().compose(p.pos, p.quat, p.esc), v = new THREE.Vector3()
  let alvo = -1
  for (let i = 0; i < a.count; i++) {
    v.fromBufferAttribute(a, i).applyMatrix4(m)
    if (v.distanceTo(centro) > r) continue
    if (alvo < 0) { alvo = i; continue }
    a.setXYZ(i, a.getX(alvo), a.getY(alvo), a.getZ(alvo))
  }
  if (alvo >= 0) a.needsUpdate = true
}
