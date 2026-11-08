"use client"

// O MONUMENTO DA MISSÃO ATIVA (T61, item 4 da ordem combinada; regra atual do
// dono em 08/11: "só mostrar de qualquer localidade o monumento. mas SÓ DA MISSAO
// ATIVA!!! NENHUM OUTRO, o da missao anterior apaga").
//   - existe no máximo UM na cena: o da missão ativa (a que ele pegou: quem manda
//     é o `missaoDoSave` da page.tsx, o mesmo do checklist e do feixe-guia). Sem
//     missão ativa, nenhum. O das missões feitas ou largadas apaga
//   - fica no céu, em cima do lugar da missão (estrada/alvoMissao.ts: o mesmo
//     ponto do mapa, do feixe-guia e do gatilho), pulsa e tem o facho até o chão
//   - toda missão NASCE uma vez, quando o holo abre com ela ativa (a forma cresce
//     girando, o facho pisca, uma onda de luz se abre) e pede uma cena
//     (ganchoCena.ts: a de verdade, com câmera e personagens, é do T70).
//     Quem já viu o nascimento daquela missão não vê de novo (localStorage).
//   - (08/11, o dono: "esses monumentos nao sao da cidade, sim do holo") tudo
//     aqui (monumento, halo, facho, onda) só aparece com o holo aberto; fechado,
//     o céu fica limpo e o nascimento espera.
//   - DE LONGE: aparece de qualquer distância. Fica fora do <Perto> (é um só) e
//     além do alcance (uma fração do far da câmera) é trazido pra perto na mesma
//     direção, sem mudar onde cai na tela. O tamanho nunca fica menor que
//     MONUMENTO_CFG.tamMinimo na tela. Sem névoa (senão some nos 950 m da cidade)
//     e, a forma e o halo, por cima dos prédios (é holograma: se vê de qualquer lugar).
// As formas são PROVISÓRIAS (regra 10: os modelos de verdade vêm do Tripo 3D):
// cada ato tem a sua família de formas, uma por música do ato (missão sem faixa:
// a primeira forma, até o modelo dela existir).
// (desempenho) um contorno (as três cascas numa malha só), o halo, o facho e a
// onda; sem missão ativa, nada. O holo é lido de um ref no quadro (o mesmo do
// Corrida): trocar não re-renderiza nada, e fechado o quadro para na primeira linha.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, type RefObject } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { MundoDisco } from "./mundoDisco"
import { ATOS } from "./atos"
import { PISTAS } from "./pistas"
import { pontoDoAlvo } from "./alvoMissao"
import { pedirCena } from "./ganchoCena"
import { MISSOES13, type MissaoId } from "../disco/portas"
import { FINAL_VIVO } from "../disco/final"

const ALTURA = 110 // m acima da pista
const TAM = 30 // o raio da forma
export const MONUMENTO_CFG = {
  nascer: 5, // s do nascimento
  espera: 1.2, // s entre o holo abrir e o nascimento começar
  alcance: 0.8, // fração do far da câmera até onde ele fica no lugar de verdade (além: é trazido)
  tamMinimo: 0.04, // o raio mínimo na tela (tangente do ângulo: 0.04 ≈ 2,3°, vale a partir de 750 m)
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

export function Monumentos({ M, missao, holo }: { M: MundoDisco; missao: MissaoId | null; holo: RefObject<boolean> }) {
  // trocou de missão: o anterior é desmontado e liberado (só existe um)
  const m = useMemo(() => {
    if (!missao) return null
    const mi = MISSOES13[missao]
    const pt = pontoDoAlvo(M, mi.lugar)
    if (!pt) return null
    // a faixa dá o nome, a forma e a cor; a missão sem faixa usa o id e a cor dela
    const nome = (mi.faixa ? PISTAS.find((p) => p.id === mi.faixa)?.faixa : undefined) ?? mi.id
    const cor = M.pistas.find((p) => p.nome === nome)?.cor ?? mi.cor
    const linhas = new THREE.LineSegments(formaDe(nome), new THREE.LineBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }))
    const halo = new THREE.Mesh(new THREE.SphereGeometry(TAM * 0.55, 16, 10), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }))
    // o facho: altura 1 com a base na origem (o quadro estica do chão até o monumento)
    const facho = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 4.5, 1, 10, 1, true).translate(0, 0.5, 0), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }))
    const onda = new THREE.Mesh(new THREE.TorusGeometry(TAM, 1.4, 6, 48), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, toneMapped: false }))
    onda.rotation.x = Math.PI / 2
    linhas.renderOrder = halo.renderOrder = onda.renderOrder = 3
    facho.frustumCulled = onda.frustumCulled = false
    facho.visible = onda.visible = false
    return { nome, x: pt.x, y: pt.y + ALTURA, z: pt.z, yPista: pt.y, linhas, halo, facho, onda, giro: 0.15 + (nome.length % 5) * 0.03 }
  }, [M, missao])
  useEffect(() => () => {
    if (!m) return
    for (const o of [m.linhas, m.halo, m.facho, m.onda]) { o.geometry.dispose(); (o.material as THREE.Material).dispose() }
  }, [m])
  const grupo = useRef<THREE.Group>(null)
  const raiz = useRef<THREE.Group>(null)
  // quando o nascimento começa (performance.now em s; null = não está nascendo)
  const nasce = useRef<number | null>(null)
  // missão que ainda não viu o nascimento: ele começa quando o holo abrir
  const pendente = useRef(false)
  useEffect(() => {
    nasce.current = null
    pendente.current = !!m && !lerVistas().has(m.nome)
  }, [m])
  useFrame(({ clock, camera }, dt) => {
    const r = raiz.current, g = grupo.current
    if (!m || !r || !g) return
    // (no final, a câmera é roteirizada: nada de holograma por cima dos cortes)
    const ligado = holo.current && FINAL_VIVO.momento === null
    r.visible = ligado
    if (!ligado) {
      // holo fechado: o relógio do nascimento para (continua quando o holo abrir)
      if (nasce.current !== null) nasce.current += dt
      return
    }
    const t = clock.elapsedTime, agora = performance.now() / 1000
    if (pendente.current) {
      pendente.current = false
      const vistas = lerVistas()
      vistas.add(m.nome)
      gravarVistas(vistas)
      nasce.current = agora + MONUMENTO_CFG.espera
      pedirCena({ tipo: "monumento", linha: m.nome, n: vistas.size, x: m.x, y: m.y, z: m.z })
    }
    const t0 = nasce.current
    // esperando a vez de nascer: ainda não aparece
    const esperando = t0 !== null && agora < t0
    g.visible = m.facho.visible = !esperando
    if (esperando) { m.onda.visible = false; return }
    const p = t0 !== null ? (agora - t0) / MONUMENTO_CFG.nascer : 1
    const nascendo = p < 1
    if (!nascendo && t0 !== null) nasce.current = null
    // ── de qualquer distância: além do alcance, tudo é trazido na direção da câmera
    // (k < 1: o mesmo lugar na tela); o tamanho nunca fica menor que o mínimo (s) ──
    const c = camera.position, yM = m.y + Math.sin(t * 0.5) * 2.5
    const dx = m.x - c.x, dy = yM - c.y, dz = m.z - c.z
    const d = Math.hypot(dx, dy, dz), alc = (camera as THREE.PerspectiveCamera).far * MONUMENTO_CFG.alcance
    const k = d > alc ? alc / d : 1
    const s = Math.max(1, (d * k * MONUMENTO_CFG.tamMinimo) / TAM)
    g.position.set(c.x + dx * k, c.y + dy * k, c.z + dz * k)
    m.facho.position.set(c.x + dx * k, c.y + (m.yPista - c.y) * k, c.z + dz * k)
    m.facho.scale.set(s, (yM - m.yPista) * k, s)
    // a forma: cresce girando rápido no nascimento; depois gira devagar
    const giro = nascendo ? 1 + 8 * (1 - suave(p)) : 1
    m.linhas.rotation.y += dt * giro * m.giro
    m.linhas.rotation.x += dt * giro * m.giro * 0.4
    m.linhas.scale.setScalar(TAM * s * (nascendo ? Math.max(0.001, pop(p * 1.6)) : 1))
    m.halo.scale.setScalar(s)
    const onda2 = Math.sin(t * 2.4)
    ;(m.linhas.material as THREE.LineBasicMaterial).opacity = 0.85 * (0.6 + 0.4 * onda2)
    ;(m.halo.material as THREE.MeshBasicMaterial).opacity = 0.08 + 0.05 * onda2
    ;(m.facho.material as THREE.MeshBasicMaterial).opacity = 0.11 + 0.05 * Math.sin(t * 2) + (nascendo ? 0.6 * (1 - suave(p)) : 0)
    // a onda de luz do nascimento
    m.onda.visible = nascendo
    if (nascendo) {
      m.onda.position.copy(g.position)
      m.onda.scale.setScalar(s * (1 + 5 * suave(p * 1.4)))
      ;(m.onda.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - suave(p * 1.4))
    }
  })
  if (!m) return null
  return (
    <group key={m.nome} ref={raiz} visible={false}>
      <group ref={grupo} visible={false}>
        <primitive object={m.linhas} />
        <primitive object={m.halo} />
      </group>
      {/* o facho: do chão até o monumento (o farol da missão) */}
      <primitive object={m.facho} />
      <primitive object={m.onda} />
    </group>
  )
}
