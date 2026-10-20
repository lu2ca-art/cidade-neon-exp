"use client"

// A RESOLUÇÃO DINÂMICA (19/10, desempenho): o que mais pesa no jogo são os
// pixels (a lente — bloom, SMAA, grão — passa por todos). Medido num Mac
// retina: na densidade 1,5 a média era 34 ms por quadro; na 1,0, 14 ms. Em vez
// de baixar pra todo mundo, o jogo vigia o próprio ritmo: perdendo quadro,
// desce a densidade; sobrando folga por um bom tempo, sobe de volta; e logo
// assenta. Na máquina forte fica nítido; na fraca, fica liso (o bloom e o grão
// disfarçam).

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"

const DEGRAU = 0.125
const PISO = 0.75
const MAX_TROCAS = 5
// a densidade atual: o <Canvas> do R3F reaplica a prop dpr a cada render (e o
// Corrida renderiza o tempo todo), então ele passa ESTE valor, não um fixo
export const DPR: { v: number | null } = { v: null }

export function ResolucaoDinamica({ max = 1.5, fixa = null }: { max?: number; fixa?: number | null }) {
  const setDpr = useThree((s) => s.setDpr)
  const teto = Math.min(max, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1)
  // começa em 1 (no retina, 1,5 de cara era sempre pesado: descia 4 vezes, cada
  // troca um tranco); com folga, sobe sozinha
  const inicio = Math.min(teto, 1)
  const st = useRef({ dpr: DPR.v ?? inicio, tq: 0, quadros: [] as number[], desde: 0, folga: 0, ruins: 0, trocas: 0, ritmo: 1000 / 60 })
  const mudar = (v: number) => { DPR.v = v; setDpr(v) }
  useEffect(() => { if (fixa == null && DPR.v == null) { DPR.v = inicio; setDpr(inicio) } }, [inicio, fixa, setDpr])
  // (20/10, a qualidade medida) o teto baixou: a densidade desce junto na hora
  useEffect(() => { if (fixa == null && DPR.v != null && DPR.v > teto) { st.current.dpr = teto; DPR.v = teto; setDpr(teto) } }, [teto, fixa, setDpr])
  useFrame(() => {
    if (fixa != null) return
    const s = st.current
    const tq = (document.timeline?.currentTime as number | null) ?? performance.now()
    if (s.tq) s.quadros.push(tq - s.tq)
    s.tq = tq
    if (!s.desde) s.desde = tq
    // decide a cada ~1 s (e só depois dos primeiros 4 s: carregando, tudo engasga)
    if (tq - s.desde < 1000 || s.quadros.length < 20) return
    s.desde = tq
    const q = s.quadros.sort((a, b) => a - b)
    s.quadros = []
    if (performance.now() < 4000) return
    // o ritmo do monitor: o quadro mais rápido que se repete (p10), o menor já
    // visto; no mínimo, a meta é 60 quadros por segundo (rodando sempre a 30
    // desde o começo, o p10 seria 33 ms e ele acharia que está tudo bem)
    s.ritmo = Math.max(1000 / 165, Math.min(s.ritmo, q[Math.floor(q.length * 0.1)]))
    // a meta: o ritmo do monitor, mas sem caçar mais de 60 quadros (num monitor
    // de 120 Hz, buscando 90, ele ia pro piso e ficava borrado; com o relógio
    // interpolado, 60 firmes já são lisos)
    const monitor = Math.max(s.ritmo, 1000 / 60)
    const p50 = q[Math.floor(q.length * 0.5)], p90 = q[Math.floor(q.length * 0.9)]
    // (cada troca refaz o canvas e as imagens da lente: ~100 ms travado, medido.
    // Então troca pouco: desce com 2 s ruins seguidos, sobe com 10 s de folga,
    // e depois de MAX_TROCAS ela assenta e não mexe mais)
    if (s.trocas >= MAX_TROCAS) return
    const ruim = (p50 > monitor * 1.3 || p90 > monitor * 2.1) && s.dpr > PISO
    s.ruins = ruim ? s.ruins + 1 : 0
    s.folga = !ruim && p90 < monitor * 1.15 && s.dpr < teto ? s.folga + 1 : 0
    if (s.ruins >= 2) {
      // muito longe da meta: desce dois degraus de uma vez (menos trocas)
      s.dpr = Math.max(PISO, s.dpr - (p50 > monitor * 2 ? 2 : 1) * DEGRAU)
      s.ruins = 0; s.trocas++
      mudar(s.dpr)
    } else if (s.folga >= 10) {
      s.dpr = Math.min(teto, s.dpr + DEGRAU)
      s.folga = 0; s.trocas++
      mudar(s.dpr)
    }
  })
  return null
}
