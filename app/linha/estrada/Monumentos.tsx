"use client"

// OS MONUMENTOS (T61, item 4 da ordem combinada; decidido em 21/10 (2): "os
// monumentos holográficos ficam em cima da missão atual. Acabou uma música, o
// monumento dela fica ali pra sempre e acende mais um. Uma cutscene destaca
// isso nas 3 primeiras missões").
//   - cada pista (cada música) tem o seu monumento, no céu, em cima do lugar
//     onde a missão dela é pega (o ícone da missão na pista: `missao:<nome>`)
//   - missão aberta (a atual, dá pra fazer agora): o monumento aparece e pulsa,
//     com o facho de luz descendo até a pista (o farol: dá pra achar de longe)
//   - missão feita: fica ali pra sempre, aceso e parado no brilho
//   - ainda apagada: não existe
//   - os 3 primeiros que ficam prontos NASCEM (a forma cresce girando, o facho
//     pisca, uma onda de luz se abre) e pedem uma cena (ganchoCena.ts). A cena
//     de verdade, com câmera e personagens, é do T70; aqui é só o gancho.
//     Quem já viu o nascimento não vê de novo (localStorage).
//   - (08/11, o dono: "esses monumentos nao sao da cidade, sim do holo") tudo
//     aqui (monumento, halo, facho, onda) só aparece com o holo aberto; fechado,
//     o céu fica limpo. A cena é pedida do mesmo jeito, e o nascimento espera o
//     holo abrir pra acontecer na frente de quem olha.
// As formas são PROVISÓRIAS (regra 10: os modelos de verdade vêm do Tripo 3D):
// cada ato tem a sua família de formas, uma por música do ato.
// (desempenho) por monumento visível: um contorno (as três cascas numa malha
// só), o halo e o facho. Só os abertos e os feitos existem na cena. O holo é lido
// de um ref no quadro (o mesmo do Corrida): trocar não re-renderiza nada, e fechado
// o quadro para na primeira linha.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type RefObject } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { EstacaoId } from "../data"
import type { MundoDisco } from "./mundoDisco"
import { ATOS, pistasFeitas, type Luz } from "./atos"
import { pedirCena } from "./ganchoCena"

const ALTURA = 110 // m acima da pista
const TAM = 30 // o raio da forma
export const MONUMENTO_CFG = {
  cenas: 3, // quantos nascimentos pedem cena (as 3 primeiras missões)
  nascer: 5, // s do nascimento
  intervalo: 2.2, // s entre um nascimento e o próximo (quando há mais de um esperando)
}
export const CHAVE_CENAS_VISTAS = "cn-monumentos-cena"

// as formas de cada ato (a fixa, depois as duas variáveis)
const FORMAS: (() => THREE.BufferGeometry)[][] = [
  [() => new THREE.IcosahedronGeometry(1, 1), () => new THREE.TorusGeometry(0.8, 0.12, 6, 32), () => new THREE.OctahedronGeometry(1, 0)],
  [() => new THREE.DodecahedronGeometry(1, 0), () => new THREE.TorusKnotGeometry(0.6, 0.1, 64, 6, 2, 3), () => new THREE.TetrahedronGeometry(1, 0)],
  [() => new THREE.OctahedronGeometry(1, 1), () => new THREE.BoxGeometry(1.2, 1.2, 1.2, 2, 2, 2), () => new THREE.IcosahedronGeometry(1, 0)],
]

function formaDe(nome: string) {
  const a = Math.max(0, ATOS.findIndex((x) => x.fixo === nome || x.variaveis.includes(nome)))
  const ato = ATOS[a], i = Math.max(0, [ato.fixo, ...ato.variaveis].indexOf(nome))
  const base = FORMAS[a][i]()
  base.computeBoundingSphere()
  const r = base.boundingSphere?.radius || 1
  const e = new THREE.EdgesGeometry(base, 1)
  base.dispose()
  // (a linha do WebGL tem 1 px: três cascas coladas, pra ter corpo de longe)
  const g = mergeGeometries([1, 1.012, 1.024].map((k) => e.clone().scale(k / r, k / r, k / r)), false)
  e.dispose()
  return g
}

const lerVistas = () => { try { return new Set<string>(JSON.parse(localStorage.getItem(CHAVE_CENAS_VISTAS) ?? "[]")) } catch { return new Set<string>() } }
const gravarVistas = (s: Set<string>) => { try { localStorage.setItem(CHAVE_CENAS_VISTAS, JSON.stringify([...s])) } catch { /* sem storage: vê de novo, tudo bem */ } }

const suave = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
// cresce passando um pouco do tamanho e volta (o "pop")
const pop = (t: number) => { const k = Math.min(1, Math.max(0, t)), c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2 }

export function Monumentos({ M, luz, objetos = [], holo }: { M: MundoDisco; luz: Record<string, Luz> | null; objetos?: EstacaoId[]; holo: RefObject<boolean> }) {
  const montados = useMemo(() => M.pistas.map((p) => {
    const o = M.onde?.(`missao:${p.nome}`) ?? { via: p.ida, u: M.vias[p.ida].L * 0.55 }
    const V = M.vias[o.via], i = Math.max(0, Math.min(V.n - 1, Math.round(o.u / 2)))
    const x = V.px[i], z = V.pz[i], yPista = V.py[i], y = yPista + ALTURA
    const mat = new THREE.LineBasicMaterial({ color: p.cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const linhas = new THREE.LineSegments(formaDe(p.nome), mat)
    linhas.scale.setScalar(TAM)
    const halo = new THREE.Mesh(new THREE.SphereGeometry(TAM * 0.55, 16, 10), new THREE.MeshBasicMaterial({ color: p.cor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }))
    return { nome: p.nome, cor: p.cor, x, y, z, yPista, linhas, halo, giro: 0.15 + (p.nome.length % 5) * 0.03 }
  }), [M])
  useEffect(() => () => { for (const m of montados) { m.linhas.geometry.dispose(); (m.linhas.material as THREE.Material).dispose(); m.halo.geometry.dispose(); (m.halo.material as THREE.Material).dispose() } }, [montados])
  const grupos = useRef<(THREE.Group | null)[]>([])
  const fachos = useRef<(THREE.Mesh | null)[]>([])
  const onda = useRef<THREE.Mesh>(null)
  const raiz = useRef<THREE.Group>(null)
  // os nascimentos: quando cada um começa (performance.now em s)
  const nasce = useRef(new Map<string, number>())
  // ── quem nasce: as 3 primeiras músicas feitas, na ordem, se ainda não viu ──
  const feitasOrdem = useMemo(() => [...pistasFeitas(objetos)], [objetos])
  useEffect(() => {
    const vistas = lerVistas()
    const agora = performance.now() / 1000
    // (se já tem nascimento na fila, o novo espera a vez)
    let fila = [...nasce.current.values()].filter((t0) => t0 > agora).length
    feitasOrdem.slice(0, MONUMENTO_CFG.cenas).forEach((nome, n) => {
      if (vistas.has(nome) || nasce.current.has(nome)) return
      const m = montados.find((x) => x.nome === nome)
      if (!m) return
      vistas.add(nome)
      nasce.current.set(nome, agora + 1.2 + fila * MONUMENTO_CFG.intervalo)
      fila++
      pedirCena({ tipo: "monumento", linha: nome, n: n + 1, x: m.x, y: m.y, z: m.z })
    })
    gravarVistas(vistas)
  }, [feitasOrdem, montados])
  useFrame(({ clock }, dt) => {
    if (raiz.current) raiz.current.visible = holo.current
    if (!holo.current) {
      // holo fechado: o relógio dos nascimentos para (ele nasce quando o holo abrir)
      for (const [nome, t0] of nasce.current) nasce.current.set(nome, t0 + dt)
      return
    }
    const t = clock.elapsedTime, agora = performance.now() / 1000
    let ondaK = -1, ondaM: (typeof montados)[number] | null = null
    for (let k = 0; k < montados.length; k++) {
      const m = montados[k]
      const g = grupos.current[k], f = fachos.current[k]
      if (!g || !f) continue
      const e: Luz = luz?.[m.nome] ?? "apagada"
      const t0 = nasce.current.get(m.nome)
      // esperando a vez de nascer: ainda não aparece
      const esperando = t0 !== undefined && agora < t0
      const vis = e !== "apagada" && !esperando
      g.visible = f.visible = vis
      if (!vis) continue
      const p = t0 !== undefined ? (agora - t0) / MONUMENTO_CFG.nascer : 1
      const nascendo = p < 1
      if (!nascendo && t0 !== undefined) nasce.current.delete(m.nome)
      // a forma: cresce girando rápido no nascimento; depois gira devagar
      const giro = (e === "aberta" ? 1 : 0.4) * (nascendo ? 1 + 8 * (1 - suave(p)) : 1)
      m.linhas.rotation.y += dt * giro * m.giro
      m.linhas.rotation.x += dt * giro * m.giro * 0.4
      m.linhas.scale.setScalar(TAM * (nascendo ? Math.max(0.001, pop(p * 1.6)) : 1))
      const pulso = e === "aberta" ? 0.6 + 0.4 * Math.sin(t * 2.4 + k) : 1
      const lm = m.linhas.material as THREE.LineBasicMaterial
      lm.color.set(m.cor)
      lm.opacity = (e === "feita" ? 1 : 0.85) * pulso
      g.position.y = m.y + Math.sin(t * 0.5 + k) * 2.5
      const hm = m.halo.material as THREE.MeshBasicMaterial
      hm.opacity = e === "feita" ? 0.16 : 0.08 + 0.05 * Math.sin(t * 2.4 + k)
      const fm = f.material as THREE.MeshBasicMaterial
      fm.opacity = (e === "aberta" ? 0.11 + 0.05 * Math.sin(t * 2 + k) : 0.05) + (nascendo ? 0.6 * (1 - suave(p)) : 0)
      if (nascendo && p > ondaK) { ondaK = p; ondaM = m }
    }
    // a onda de luz do nascimento (uma só: a do mais recente)
    const o = onda.current
    if (o) {
      o.visible = !!ondaM
      if (ondaM) {
        const mm = ondaM as (typeof montados)[number]
        o.position.set(mm.x, mm.y, mm.z)
        o.scale.setScalar(1 + 5 * suave(ondaK * 1.4))
        const om = o.material as THREE.MeshBasicMaterial
        om.color.set(mm.cor)
        om.opacity = 0.7 * (1 - suave(ondaK * 1.4))
      }
    }
  })
  return (
    <group ref={raiz} visible={false}>
      {montados.map((m, k) => (
        <group key={m.nome}>
          <group ref={(g) => { grupos.current[k] = g }} position={[m.x, m.y, m.z]} visible={false}>
            <primitive object={m.linhas} />
            <primitive object={m.halo} />
          </group>
          {/* o facho: da pista até o monumento (o farol da missão) */}
          <mesh ref={(f) => { fachos.current[k] = f }} position={[m.x, (m.yPista + m.y) / 2, m.z]} frustumCulled={false} visible={false}>
            <cylinderGeometry args={[1.6, 4.5, m.y - m.yPista, 10, 1, true]} />
            <meshBasicMaterial color={m.cor} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        </group>
      ))}
      <mesh ref={onda} rotation={[Math.PI / 2, 0, 0]} visible={false} frustumCulled={false}>
        <torusGeometry args={[TAM, 1.4, 6, 48]} />
        <meshBasicMaterial transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
