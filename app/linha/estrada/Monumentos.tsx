"use client"

// OS MONUMENTOS DOS ATOS (LU2CA 20/10): em cima de cada torre das pontas, um
// monumento holográfico (formas geométricas vazadas, girando), que se vê de
// qualquer lugar da cidade, um pedaço no céu (as ilhas da personalidade da
// Riley em Divertida Mente). Um por ato; cada um tem três formas, uma dentro da
// outra, uma por linha do ato: a forma acende quando a linha é feita.
//   - ato fechado: apagado, girando devagar
//   - ato aberto: pulsa na cor da faixa fixa dele
//   - ato completo: as três acesas, brilho cheio
// Cada ato mora na torre que mais tem linhas dele (as torres são do desenho do
// LU2CA; os atos, da história): ato 1 na torre da Nectar e da Sexta-Feira, ato
// 2 na do Swav, ato 3 na da Sabe Ontem? e da CHUVA.
// (desempenho) por monumento: três contornos (linhas) e um facho de luz

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { MundoDisco } from "./mundoDisco"
import { ATOS, type Luz } from "./atos"

const ALTURA = 150 // m acima do topo da torre
const TAM = 48 // o raio da forma de fora

// as formas de cada ato (de fora pra dentro)
const FORMAS: (() => THREE.BufferGeometry)[][] = [
  [() => new THREE.IcosahedronGeometry(1, 1), () => new THREE.TorusGeometry(0.62, 0.05, 6, 40), () => new THREE.OctahedronGeometry(0.34, 0)],
  [() => new THREE.DodecahedronGeometry(1, 0), () => new THREE.TorusKnotGeometry(0.42, 0.06, 64, 6, 2, 3), () => new THREE.TetrahedronGeometry(0.36, 0)],
  [() => new THREE.OctahedronGeometry(1, 1), () => new THREE.BoxGeometry(0.95, 0.95, 0.95, 2, 2, 2), () => new THREE.IcosahedronGeometry(0.33, 0)],
]

export function Monumentos({ M, luz }: { M: MundoDisco; luz: Record<string, Luz> | null }) {
  const montados = useMemo(() => {
    // a torre de cada ato: a que tem mais linhas dele chegando
    const nomesDaTorre = M.torres.map((t) => new Set(t.andares.map((a) => a.nome)))
    const livres = new Set([1, 2, 3])
    return ATOS.map((ato, k) => {
      const linhas = [ato.fixo, ...ato.variaveis]
      let melhor = -1, nota = -1
      for (const t of livres) { const n = linhas.filter((l) => nomesDaTorre[t]?.has(l)).length; if (n > nota) { nota = n; melhor = t } }
      livres.delete(melhor)
      const tw = M.torres[melhor]
      const cor = M.pistas.find((p) => p.nome === ato.fixo)?.cor ?? "#ffffff"
      // (a linha do WebGL tem 1 px: cada contorno vai em três cascas, uma
      // colada na outra, pra ter corpo de longe)
      const formas = FORMAS[k].map((f) => {
        const geo = new THREE.EdgesGeometry(f(), 1)
        const mat = new THREE.LineBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
        const g = new THREE.Group()
        for (const e of [1, 1.012, 1.024]) { const l = new THREE.LineSegments(geo, mat); l.scale.setScalar(TAM * e); g.add(l) }
        g.userData.mat = mat
        return g
      })
      // o halo: um brilho dentro do monumento
      const halo = new THREE.Mesh(new THREE.SphereGeometry(TAM * 0.55, 20, 14), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
      return { linhas, cor, x: tw.x, z: tw.z, y: tw.topo + ALTURA, formas, halo }
    })
  }, [M])
  const grupos = useRef<(THREE.Group | null)[]>([])
  const fachos = useRef<(THREE.MeshBasicMaterial | null)[]>([])
  const cinza = useMemo(() => new THREE.Color("#3a3850"), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    montados.forEach((m, k) => {
      const g = grupos.current[k]
      if (!g) return
      const estados = m.linhas.map((l) => luz?.[l] ?? "apagada")
      const aberto = estados.some((e) => e !== "apagada")
      const completo = estados.every((e) => e === "feita")
      const giro = aberto ? 1 : 0.25
      m.formas.forEach((f, i) => {
        // cada forma num eixo e num sentido: o motion graphic
        f.rotation.y += dt * giro * (0.12 + i * 0.1) * (i % 2 ? -1 : 1)
        f.rotation.x += dt * giro * (0.05 + i * 0.07)
        const mat = f.userData.mat as THREE.LineBasicMaterial
        const e = estados[i]
        const pulso = e === "aberta" ? 0.55 + 0.45 * Math.sin(t * 2.4 + i) : 1
        mat.color.copy(e === "apagada" ? cinza : tmpCor.set(m.cor))
        mat.opacity = (e === "apagada" ? 0.22 : e === "feita" ? 1 : 0.85) * pulso
      })
      g.position.y = m.y + Math.sin(t * 0.5 + k) * 3
      const hm = m.halo.material as THREE.MeshBasicMaterial
      hm.color.copy(aberto ? tmpCor.set(m.cor) : cinza)
      hm.opacity = completo ? 0.2 : aberto ? 0.1 + 0.05 * Math.sin(t * 2.4) : 0.03
      const fm = fachos.current[k]
      if (fm) fm.opacity = completo ? 0.22 : aberto ? 0.1 + 0.05 * Math.sin(t * 2) : 0.03
    })
  })
  return (
    <group>
      {montados.map((m, k) => (
        <group key={k}>
          <group ref={(g) => { grupos.current[k] = g }} position={[m.x, m.y, m.z]}>
            {m.formas.map((f, i) => <primitive key={i} object={f} />)}
            <primitive object={m.halo} />
          </group>
          {/* o facho: da torre até o monumento */}
          <mesh position={[m.x, m.y / 2, m.z]} frustumCulled={false}>
            <cylinderGeometry args={[2.2, 6, m.y, 12, 1, true]} />
            <meshBasicMaterial ref={(mm) => { fachos.current[k] = mm }} color={m.cor} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const tmpCor = new THREE.Color()
