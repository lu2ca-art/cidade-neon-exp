"use client"

// O RIO NAS TRINCHEIRAS (06/11, o mundo depois): depois do final, a água volta
// pros rios secos (retomar-mundo.md: "o rio correndo pelas trincheiras onde se
// corria de skate e de moto, sob o vidro"). Uma fita de água no meio do leito de
// cada rio e um espelho em cada salão; a rampa da descida e o salão dela ficam secos.
// Só monta com o final feito (disco/final.ts). Desempenho: 1 desenho, sem luz; a
// água é uma textura pequena que corre (por quadro: 1 número, o deslocamento).

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useSyncExternalStore } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { AVENIDAS, CURVA, SALOES } from "./mapa"
import { MUNDO_DEPOIS as CFG, lerFinal, ouvirFinal } from "../disco/final"

const NADA = { momento: null, feito: false }
const lerServidor = () => NADA

export function RioDepois() {
  const f = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  if (!f.feito) return null
  return <Rio />
}

// a textura da água: riscos claros sobre a água (pequena, repete). A água do final
// (estrada/FinalPovo.tsx) usa a mesma
export function texturaDeAgua() {
  const cv = document.createElement("canvas")
  cv.width = 64; cv.height = 128
  const ctx = cv.getContext("2d")!
  ctx.fillStyle = "#1d6f86"; ctx.fillRect(0, 0, 64, 128)
  let sem = 5
  const rnd = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(190,250,255,${0.15 + rnd() * 0.35})`
    ctx.fillRect(rnd() * 64, rnd() * 128, 1 + rnd() * 3, 6 + rnd() * 22)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const seco = (i: number) => SALOES[i].tipo === "descida"

function Rio() {
  const r = useMemo(() => {
    const partes: THREE.BufferGeometry[] = []
    const W = CFG.rioMeia, Y = CFG.rioAltura
    // os rios: do salão de cá até o de lá, só onde o chão é do rio (até a borda do espelho do salão)
    for (const a of AVENIDAS) {
      if (seco(a.de) || seco(a.ate)) continue
      const de = SALOES[a.de], ate = SALOES[a.ate], pts = a.pts
      let k0 = 0, k1 = pts.length - 1
      while (k0 < k1 && Math.hypot(pts[k0].x - de.c.x, pts[k0].z - de.c.z) < de.r - CURVA - 1) k0++
      while (k1 > k0 && Math.hypot(pts[k1].x - ate.c.x, pts[k1].z - ate.c.z) < ate.r - CURVA - 1) k1--
      const n = k1 - k0 + 1
      if (n < 2) continue
      const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx: number[] = []
      let s = 0
      for (let j = 0; j < n; j++) {
        const k = k0 + j, p = pts[k]
        const A = pts[Math.max(0, k - 1)], B = pts[Math.min(pts.length - 1, k + 1)]
        const dx = B.x - A.x, dz = B.z - A.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l
        if (j > 0) s += Math.hypot(p.x - pts[k - 1].x, p.z - pts[k - 1].z)
        pos.set([p.x + nx * W, Y, p.z + nz * W, p.x - nx * W, Y, p.z - nz * W], j * 6)
        uv.set([0, s / CFG.rioOnda, 1, s / CFG.rioOnda], j * 4)
        if (j > 0) { const b = (j - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3) }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
      g.setIndex(idx)
      partes.push(g)
    }
    // o espelho de cada salão (menos o da descida)
    for (const s of SALOES) {
      if (s.tipo === "descida") continue
      const rr = s.r - CURVA
      const g = new THREE.CircleGeometry(rr, 40).rotateX(-Math.PI / 2).translate(s.c.x, Y, s.c.z)
      const uv = g.attributes.uv as THREE.BufferAttribute, k = (2 * rr) / CFG.rioOnda
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k)
      g.deleteAttribute("normal")
      partes.push(g)
    }
    const geo = mergeGeometries(partes, false)!
    for (const g of partes) g.dispose()
    const tex = texturaDeAgua()
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: "#8fe6ff", transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 })
    return { geo, mat, tex }
  }, [])
  useEffect(() => () => { r.geo.dispose(); r.mat.dispose(); r.tex.dispose() }, [r])
  // a água corre do salão de cá pro de lá
  useFrame((_, dt) => { r.tex.offset.y = (r.tex.offset.y - Math.min(dt, 0.1) * (CFG.rioVel / CFG.rioOnda)) % 1 })
  return <mesh geometry={r.geo} material={r.mat} matrixAutoUpdate={false} renderOrder={1} />
}
