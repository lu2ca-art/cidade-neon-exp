"use client"

// O MUNDO DEPOIS (06/11): depois do final (disco/final.ts, FINAL_VIVO.feito), a
// cidade muda sem tela explicando (retomar-mundo.md, "Como mostrar sem explicar"):
//   - plantas nos prédios altos: tufos nas janelas e trepadeiras subindo a parede
//   - cabines nas torres: em cada poço, uma cabine sobe e outra desce (os dois sentidos)
// O rio nas trincheiras mora em trincheiras/RioDepois.tsx.
//
// Desempenho: antes do final não monta nada. Depois: 4 desenhos no total (2
// instanciadas das plantas, montadas uma vez e paradas; 2 das cabines). Sem luz
// nova (as plantas usam as luzes que já existem, as cabines brilham sozinhas). Por
// quadro: 1 número (o tempo das cabines, que andam no shader).

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useSyncExternalStore } from "react"
import * as THREE from "three"
import type { MundoDisco } from "./mundoDisco"
import { MUNDO_DEPOIS as CFG, lerFinal, ouvirFinal } from "../disco/final"

const NADA = { momento: null, feito: false }
const lerServidor = () => NADA
const CHAO_TORRE = -12 // Torre.tsx, CHAO

// o mundo depois só existe com o final feito e sem o final passando
export function useMundoDepois() {
  const f = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  return f.feito && f.momento === null
}

export function MundoDepois({ M, colisores }: { M: MundoDisco; colisores: number[] }) {
  if (!useMundoDepois()) return null
  return (
    <>
      <Plantas colisores={colisores} />
      <Cabines M={M} />
    </>
  )
}

// ── as plantas: dos colisores dos prédios (9 números cada: x, z, tx, tz, meia
// largura, meio fundo, topo, base, ...). O prédio gira com a rua: a largura vai
// em (tz, -tx) e o fundo em (tx, tz) (Corrida.tsx, a cidade) ──
function Plantas({ colisores }: { colisores: number[] }) {
  const p = useMemo(() => {
    const mat = new THREE.MeshLambertMaterial({ emissive: "#0b2a14", flatShading: true })
    const geoT = new THREE.OctahedronGeometry(1, 0)
    const geoV = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0)
    const tufos = new THREE.InstancedMesh(geoT, mat, CFG.maxTufos)
    const trep = new THREE.InstancedMesh(geoV, mat, CFG.maxTrepadeiras)
    let sem = 11
    const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), esc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), c = new THREE.Color()
    let nt = 0, nv = 0
    for (let i = 0; i + 8 < colisores.length; i += 9) {
      const bx = colisores[i], bz = colisores[i + 1], tx = colisores[i + 2], tz = colisores[i + 3]
      const hw = colisores[i + 4], hf = colisores[i + 5], topo = colisores[i + 6], base = colisores[i + 7]
      const h = topo - base
      if (h < CFG.alturaMin) continue
      // uma face do prédio: o normal (pra fora), a meia distância até ela e a direção ao longo dela
      const face = () => {
        const f = Math.floor(r() * 4), s = f % 2 ? -1 : 1
        return f < 2 ? { nx: tz * s, nz: -tx * s, d: hw, ax: tx, az: tz, l: hf } : { nx: tx * s, nz: tz * s, d: hf, ax: tz, az: -tx, l: hw }
      }
      const nTufos = Math.min(CFG.tufosPorPredio, Math.floor(h / 14))
      for (let k = 0; k < nTufos && nt < CFG.maxTufos; k++) {
        const F = face(), ao = (r() * 2 - 1) * F.l * 0.85
        pos.set(bx + F.nx * (F.d + 0.5) + F.ax * ao, base + 6 + r() * (h - 8), bz + F.nz * (F.d + 0.5) + F.az * ao)
        q.setFromAxisAngle(Y, Math.atan2(-F.az, F.ax))
        esc.set(1.6 + r() * 1.6, 0.8 + r() * 0.7, 0.9)
        tufos.setMatrixAt(nt, m.compose(pos, q, esc))
        c.setHSL(0.26 + r() * 0.1, 0.6, 0.22 + r() * 0.16); tufos.setColorAt(nt, c)
        nt++
      }
      for (let k = 0; k < 2 && nv < CFG.maxTrepadeiras; k++) {
        if (r() > CFG.trepadeiraChance) continue
        const F = face(), ao = (r() * 2 - 1) * F.l * 0.8
        pos.set(bx + F.nx * (F.d + 0.2) + F.ax * ao, base, bz + F.nz * (F.d + 0.2) + F.az * ao)
        q.setFromAxisAngle(Y, Math.atan2(-F.az, F.ax))
        esc.set(1 + r() * 1.4, h * (0.25 + r() * 0.45), 0.35)
        trep.setMatrixAt(nv, m.compose(pos, q, esc))
        c.setHSL(0.28 + r() * 0.08, 0.55, 0.16 + r() * 0.1); trep.setColorAt(nv, c)
        nv++
      }
    }
    tufos.count = nt; trep.count = nv
    tufos.computeBoundingSphere(); trep.computeBoundingSphere()
    tufos.matrixAutoUpdate = trep.matrixAutoUpdate = false
    return { tufos, trep, mat }
  }, [colisores])
  useEffect(() => () => { p.tufos.geometry.dispose(); p.trep.geometry.dispose(); p.mat.dispose(); p.tufos.dispose(); p.trep.dispose() }, [p])
  return (
    <>
      <primitive object={p.tufos} />
      <primitive object={p.trep} />
    </>
  )
}

// ── as cabines: em volta do núcleo de cada torre, poços com uma cabine subindo e
// outra descendo. A matriz fica no pé do poço; quanto ela subiu, o shader conta
// (aCab: fase, velocidade com sinal, altura do poço) ──
function Cabines({ M }: { M: MundoDisco }) {
  const c = useMemo(() => {
    const uT = { value: 0 }
    const geo = new THREE.BoxGeometry(2.6, 3.2, 2.6).translate(0, 1.6, 0)
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false })
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = uT
      sh.vertexShader = "attribute vec3 aCab;\nuniform float uT;\n" + sh.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\n  transformed.y += mod(uT * aCab.y + aCab.x, aCab.z);",
      )
    }
    const n = M.torres.length * CFG.pocos * 2
    const cab = new THREE.InstancedMesh(geo, mat, n)
    const aCab = new Float32Array(n * 3)
    const geoT = new THREE.BoxGeometry(0.35, 1, 0.35).translate(0, 0.5, 0)
    const matT = new THREE.MeshBasicMaterial({ color: "#7fe8ff", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const trilhos = new THREE.InstancedMesh(geoT, matT, M.torres.length * CFG.pocos)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), cor = new THREE.Color()
    const SOBE = new THREE.Color("#ffe2a8"), DESCE = new THREE.Color("#9ff3ff")
    let k = 0, kt = 0
    M.torres.forEach((t, ti) => {
      const r = t.nucleo + 1.6, y0 = CHAO_TORRE + 2, alto = Math.max(20, t.topo - 4 - y0)
      for (let j = 0; j < CFG.pocos; j++) {
        const a = ((j + 0.5 + ti * 0.37) / CFG.pocos) * Math.PI * 2
        const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r
        q.setFromAxisAngle(Y, -a)
        m.compose(new THREE.Vector3(x, y0, z), q, new THREE.Vector3(1, 1, 1))
        for (const sobe of [true, false]) {
          cab.setMatrixAt(k, m)
          cab.setColorAt(k, cor.copy(sobe ? SOBE : DESCE))
          aCab[k * 3] = ((j * 0.31 + (sobe ? 0 : 0.5)) % 1) * alto
          aCab[k * 3 + 1] = sobe ? CFG.velCabine : -CFG.velCabine
          aCab[k * 3 + 2] = alto
          k++
        }
        m.compose(new THREE.Vector3(x + Math.cos(a) * 1.5, y0, z + Math.sin(a) * 1.5), q, new THREE.Vector3(1, alto + 3.2, 1))
        trilhos.setMatrixAt(kt++, m)
      }
    })
    geo.setAttribute("aCab", new THREE.InstancedBufferAttribute(aCab, 3))
    cab.frustumCulled = false // elas andam no shader: a caixa da CPU não sabe onde estão
    trilhos.computeBoundingSphere()
    cab.matrixAutoUpdate = trilhos.matrixAutoUpdate = false
    return { cab, trilhos, uT }
  }, [M])
  useEffect(() => () => { for (const o of [c.cab, c.trilhos]) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); o.dispose() } }, [c])
  useFrame((s) => { c.uT.value = s.clock.elapsedTime })
  return (
    <>
      <primitive object={c.cab} />
      <primitive object={c.trilhos} />
    </>
  )
}
