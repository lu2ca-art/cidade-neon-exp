"use client"

// (missões claras, 02/11) O FEIXE-GUIA: o lugar da missão de agora visto de
// longe, de qualquer canto da cidade. A coluna de luz que já existia (Lugares,
// LugaresChao) só monta perto (600–700 m) e tem 44 m; esta é uma só, alta,
// sempre montada, no MESMO ponto do mapa e do gatilho (estrada/alvoMissao.ts).
// Embaixo, o anel no chão marca o raio da chegada: entrou nele, a missão começa.
//
// Desempenho: UM desenho (o feixe e o anel juntos numa geometria), material
// aditivo sem luz, nada por quadro. Só se refaz quando o alvo muda.

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { Mundo } from "./mundo"
import { LUGARES, type LugarId } from "../lugares"
import { CHAO_LUGARES, type LugarChao } from "../disco/historia"
import { CHEGADA_MISSAO, pontoDoAlvo } from "./alvoMissao"

export const FEIXE_CFG = {
  alto: 420, // m (vê de longe, acima das torres)
  raio: 3.2, // m
  opacidade: 0.2,
  anel: 0.9, // m: a largura do anel do chão
}

export function FeixeGuia({ M, lugar, chao, oculto = false }: { M: Mundo; lugar: LugarId | null; chao: LugarChao | null; oculto?: boolean }) {
  const alvo = lugar ? { lugar } : chao ? { chao } : null
  const pt = useMemo(() => (alvo ? pontoDoAlvo(M, alvo) : null), [M, lugar, chao]) // eslint-disable-line react-hooks/exhaustive-deps
  const cor = lugar ? LUGARES[lugar]?.cor ?? "#2fe8ff" : chao ? CHAO_LUGARES[chao].cor : "#2fe8ff"
  const r = chao ? CHEGADA_MISSAO.chao : CHEGADA_MISSAO.lugar
  const geo = useMemo(() => {
    const C = FEIXE_CFG
    const feixe = new THREE.CylinderGeometry(C.raio, C.raio * 1.6, C.alto, 10, 1, true).translate(0, C.alto / 2, 0)
    const anel = new THREE.RingGeometry(r - C.anel, r, 48, 1).rotateX(-Math.PI / 2).translate(0, 0.4, 0)
    feixe.deleteAttribute("uv"); anel.deleteAttribute("uv")
    const g = mergeGeometries([feixe.toNonIndexed(), anel.toNonIndexed()], false)!
    feixe.dispose(); anel.dispose()
    return g
  }, [r])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: FEIXE_CFG.opacidade, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, side: THREE.DoubleSide }), [cor])
  useEffect(() => () => geo.dispose(), [geo])
  useEffect(() => () => mat.dispose(), [mat])
  if (!pt || oculto) return null
  return <mesh geometry={geo} material={mat} position={[pt.x, pt.y, pt.z]} frustumCulled={false} renderOrder={2} />
}
