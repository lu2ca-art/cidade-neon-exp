// AS GOTAS DO DESERTO (bíblia §15, 08/11: "no deserto ela é muito mais escassa
// do que na cidade"). As da cidade moram nas pistas; o chão não tinha nenhuma.
// A mesma joia e o mesmo valor (conta no mesmo evento da pista), em poucos
// pontos: os números em economia-rascunho.ts (AGUA_DESERTO).
// Desempenho: uma malha só, escondida fora do chão; o laço olha ~50 gotas, sem alocar.

import { useEffect, useMemo, type RefObject } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { AGUA_DESERTO } from "../economia-rascunho"
import { SAIDA_CASA, SUBURBIO } from "../disco/historia"
import { gota } from "../som"
import { vib } from "../som-carro"
import { chaoEm } from "./chao"
import { geoJoia, matJoia } from "./joia"
import { QUALIDADE } from "./qualidade"
import { alemDaCidade } from "./raioCidade"

type Gota = { x: number; y: number; z: number }
const R_PEGA2 = 3.2 * 3.2

function montarGotas(): Gota[] {
  // sempre os mesmos lugares
  let sem = 222
  const sorte = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  const livre = (x: number, z: number) => alemDaCidade(x, z) > 1250 && Math.hypot(x - SUBURBIO.x, z - SUBURBIO.z) > SUBURBIO.r + 60
  const pontos: { x: number; z: number }[] = []
  const { pontos: total, noCaminho, porPonto, espaco } = AGUA_DESERTO
  // uns perto do caminho da casa até o subúrbio, pra primeira viagem achar alguma
  const dx = SUBURBIO.x - SAIDA_CASA.x, dz = SUBURBIO.z - SAIDA_CASA.z, L = Math.hypot(dx, dz)
  for (let i = 0; i < noCaminho; i++) {
    const t = 0.1 + 0.3 * (i / Math.max(1, noCaminho - 1)), lado = (sorte() - 0.5) * 200
    const x = SAIDA_CASA.x + dx * t - (dz / L) * lado, z = SAIDA_CASA.z + dz * t + (dx / L) * lado
    if (livre(x, z)) pontos.push({ x, z })
  }
  for (let t = 0; pontos.length < total && t < 400; t++) {
    const a = sorte() * Math.PI * 2, r = 1400 + sorte() * 2500, x = Math.cos(a) * r, z = Math.sin(a) * r
    if (livre(x, z)) pontos.push({ x, z })
  }
  const lista: Gota[] = []
  for (const p of pontos) {
    const a = sorte() * Math.PI * 2
    for (let k = 0; k < porPonto; k++) {
      const x = p.x + Math.cos(a) * espaco * k, z = p.z + Math.sin(a) * espaco * k
      lista.push({ x, y: chaoEm(x, z) + 1.4, z })
    }
  }
  return lista
}

// as pegas ficam até recarregar a página (na ida e volta da cena não renascem)
const PEGAS = new Set<number>()
const tmp = new THREE.Object3D()

export function GotasDeserto({ jogo, aoPegar }: { jogo: RefObject<{ voo?: boolean; wx?: number; wz?: number; y: number }>; aoPegar: () => void }) {
  const g = useMemo(() => {
    const lista = montarGotas()
    const m = new THREE.InstancedMesh(geoJoia(), matJoia(), lista.length)
    m.frustumCulled = false
    m.count = 0
    m.visible = false
    return { lista, m }
  }, [])
  useEffect(() => () => { g.m.geometry.dispose(); (g.m.material as THREE.Material).dispose(); g.m.dispose() }, [g])

  useFrame((state) => {
    const j = jogo.current, m = g.m
    // só no chão aberto (na pista, a gota do deserto nem aparece)
    if (!j || !j.voo || j.wx === undefined || j.wz === undefined) { if (m.visible) m.visible = false; return }
    const cam = state.camera.position, R2 = QUALIDADE.gotas * QUALIDADE.gotas, t = state.clock.elapsedTime
    let n = 0
    for (let i = 0; i < g.lista.length; i++) {
      if (PEGAS.has(i)) continue
      const o = g.lista[i]
      const px = o.x - j.wx, pz = o.z - j.wz
      if (px * px + pz * pz < R_PEGA2 && Math.abs(j.y + 1 - o.y) < 3.4) {
        PEGAS.add(i)
        aoPegar()
        gota(3)
        vib(8)
        continue
      }
      const dx = o.x - cam.x, dy = o.y - cam.y, dz = o.z - cam.z
      if (dx * dx + dy * dy + dz * dz > R2) continue
      tmp.position.set(o.x, o.y + Math.sin(t * 3 + i) * 0.12 - 0.45, o.z)
      tmp.rotation.set(0, t * 1.3 + i, 0)
      tmp.updateMatrix()
      m.setMatrixAt(n++, tmp.matrix)
    }
    m.count = n
    m.visible = n > 0
    if (n > 0) {
      (m.material as THREE.ShaderMaterial).uniforms.tempo.value = t
      m.instanceMatrix.needsUpdate = true
      m.instanceMatrix.clearUpdateRanges()
      m.instanceMatrix.addUpdateRange(0, n * 16)
    }
  })
  return <primitive object={g.m} />
}
