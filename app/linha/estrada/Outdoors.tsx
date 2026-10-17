"use client"

// OS OUTDOORS SURREALISTAS (17/10, LU2CA: "uns outdoors bem surrealistas,
// com formatos em point line, com telões animados com frases, mas tudo no
// indício da missão"). Cada um é uma escultura de pontos e linhas girando
// devagar no ar, presa por duas hastes finas, segurando um telão com a frase
// correndo. Perto do lugar de cada missão, o telão mostra o CHAMADO dela (o
// texto que o LU2CA já escreveu em missoes.ts); nas vias rápidas, a frase
// que ele mandou. Nenhuma frase nova é inventada aqui.

import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import type { Mundo } from "./mundo"
import { pontoI } from "./pista"

export interface Outdoor { via: number; u: number; lado: 1 | -1; frase: string; cor: string; forma: number }

// a frase do LU2CA (17/10) pros outdoors das vias rápidas
export const FRASE_GERAL = "vai lá amigo, presta atenção na historinha e vai ouvindo as músicas nas rádios"

const FORMAS = [
  () => new THREE.IcosahedronGeometry(5.5, 0),
  () => new THREE.OctahedronGeometry(6, 0),
  () => new THREE.DodecahedronGeometry(5.2, 0),
  () => new THREE.TorusKnotGeometry(3.6, 0.9, 40, 5, 2, 3),
  () => new THREE.TetrahedronGeometry(6.5, 0),
]

function telao(frase: string, cor: string) {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 192
  const g = c.getContext("2d")!
  g.fillStyle = "#05030c"; g.fillRect(0, 0, c.width, c.height)
  g.font = `800 96px "Arial Black", system-ui, sans-serif`; g.textBaseline = "middle"
  g.shadowColor = cor; g.shadowBlur = 24; g.fillStyle = "#ffffff"
  // a frase repete até encher a fita (ela corre em loop)
  const peca = `${frase.toUpperCase()}   ◦   `
  const lw = g.measureText(peca).width
  for (let x = 0; x < c.width + lw; x += lw) g.fillText(peca, x, c.height / 2 + 4)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  t.repeat.set(0.45, 1)
  return t
}

function Um({ M, o }: { M: Mundo; o: Outdoor }) {
  const escultura = useRef<THREE.Group>(null)
  const tela = useRef<THREE.MeshBasicMaterial>(null)
  const { pos, rumo, linhas, pontos, tex, hastes, larg } = useMemo(() => {
    const C = M.vias[o.via], i = Math.max(0, Math.min(C.n - 1, Math.floor(o.u / 2)))
    // um pórtico POR CIMA da rua (como os arcos do Crash e as placas do mapa
    // antigo): ao lado, os prédios colados na calçada escondiam o telão
    const meia = Math.max(-C.esq[i], C.dir[i])
    const larg = Math.min(26, meia * 2 + 2)
    const pos = pontoI(C, i, 0, 0, new THREE.Vector3())
    // o telão olha pra quem vem pela rua
    const rumo = Math.atan2(-C.tx[i], -C.tz[i])
    const geo = FORMAS[o.forma % FORMAS.length]()
    const linhas = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), new THREE.LineBasicMaterial({ color: o.cor, toneMapped: false, transparent: true, opacity: 0.95 }))
    const pontos = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#ffffff", size: 0.9, toneMapped: false }))
    // as duas hastes finas do chão até o telão
    const hx = meia + 1.5
    const hg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hx, 0, 0), new THREE.Vector3(-hx, 13.5, 0), new THREE.Vector3(hx, 0, 0), new THREE.Vector3(hx, 13.5, 0), new THREE.Vector3(-hx, 13.5, 0), new THREE.Vector3(hx, 13.5, 0)])
    const hastes = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: o.cor, toneMapped: false }))
    const tex = telao(o.frase, o.cor); tex.repeat.set(0.45 * (larg / 19), 1)
    return { pos, rumo, linhas, pontos, tex, hastes, larg }
  }, [M, o])
  useFrame((st, dt) => {
    const m = tela.current?.map
    if (m) m.offset.x = (m.offset.x + dt * 0.035) % 1
    const e = escultura.current
    if (e) { e.rotation.y += dt * 0.25; e.rotation.x = Math.sin(st.clock.elapsedTime * 0.3 + o.forma) * 0.4; e.position.y = 22 + Math.sin(st.clock.elapsedTime * 0.8 + o.forma) * 0.8 }
  })
  return (
    <group position={pos} rotation-y={rumo}>
      <primitive object={hastes} />
      <mesh position={[0, 11, 0]}>
        <planeGeometry args={[larg, 4.6]} />
        <meshBasicMaterial ref={tela} map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <group ref={escultura} position={[0, 22, 0]}>
        <primitive object={linhas} />
        <primitive object={pontos} />
      </group>
    </group>
  )
}

export function Outdoors({ M, lista }: { M: Mundo; lista: Outdoor[] }) {
  return <group>{lista.map((o, k) => <Um key={k} M={M} o={o} />)}</group>
}
