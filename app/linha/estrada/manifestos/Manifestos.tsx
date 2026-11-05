"use client"

// O HOST DAS RUAS-MANIFESTO: descobre em que rua (pista) a Kombi está, monta o
// manifesto DAQUELA rua (registro.ts) e desmonta quando ela sai. Uma vez por
// quadro lê o jogo e o toca-discos e escreve o CtxManifesto; os manifestos só
// leem dele e escrevem uniforms. Fora de uma rua com manifesto: nada montado,
// custo ~zero (um índice num array por quadro).
//
// Entra em fade (~1,2 s) e sai em fade; voar, passar pela torre da ponta ou
// pular a mureta não desmonta na hora (6 s de carência).

import { useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import type * as THREE from "three"
import type { MundoDisco } from "../mundoDisco"
import { PISTAS, type Pista } from "../pistas"
import { MANIFESTOS } from "./registro"
import { tempoDaFaixa } from "./comum"
import type { ComandosManifesto, CtxManifesto, PoseManifesto } from "./tipos"

const CARENCIA = 6 // s fora da rua antes de começar a sumir
const FADE_IN = 1.2 // s
const FADE_OUT = 1.6 // s

export function Manifestos({ M, jogo, input, carro }: {
  M: MundoDisco
  jogo: React.RefObject<PoseManifesto>
  input: React.RefObject<ComandosManifesto>
  carro: React.RefObject<THREE.Group | null>
}) {
  // índice da pista em M.pistas → a faixa (só as que têm manifesto pronto)
  const pistas = useMemo(() => M.pistas.map((p) => {
    const x = PISTAS.find((f) => f.faixa === p.nome) ?? null
    return x && MANIFESTOS[x.id]?.Componente ? x : null
  }), [M])
  const [k, setK] = useState(-1)
  const ctx = useRef<CtxManifesto>({ t: 0, dur: 1, prog: 0, batida: 0, dentro: 0, idade: 0, v: 0, mult: 1, acel: 0, gas: false, freio: false, turbo: false, via: 0, u: 0, relogio: 0 }).current
  const st = useRef({ fora: 0, vAnt: 0, tProprio: 0, kVivo: -1 }).current

  useFrame((state, dtCru) => {
    const j = jogo.current, inp = input.current
    if (!j) return
    const dt = Math.min(0.1, dtCru)
    const inf = M.info[j.via]
    const aqui = inf && inf.pista >= 0 && !j.voo && pistas[inf.pista] ? inf.pista : -1
    // a rua mudou pra outra que tem manifesto: troca na hora
    if (aqui >= 0 && aqui !== st.kVivo) {
      st.kVivo = aqui; st.fora = 0; st.tProprio = 0
      ctx.dentro = 0; ctx.idade = 0
      setK(aqui)
    }
    if (st.kVivo < 0) return
    st.fora = aqui === st.kVivo ? 0 : st.fora + dt
    const ficando = st.fora < CARENCIA
    ctx.dentro = ficando ? Math.min(1, ctx.dentro + dt / FADE_IN) : Math.max(0, ctx.dentro - dt / FADE_OUT)
    if (!ficando && ctx.dentro <= 0) { st.kVivo = -1; setK(-1); return }

    // o tempo da faixa: o toca-discos da pista; se ele ainda não está nela, um relógio próprio
    const p = pistas[st.kVivo]!
    st.tProprio += dt
    const tf = tempoDaFaixa(p.id)
    ctx.t = tf ? tf.t : st.tProprio % p.duracao
    ctx.dur = tf ? tf.dur : p.duracao
    ctx.prog = Math.min(1, Math.max(0, ctx.t / ctx.dur))
    ctx.batida = (ctx.t * p.bpm) / 60
    ctx.idade += dt
    ctx.relogio = state.clock.elapsedTime
    // a Kombi: velocidade, ritmo, aceleração e os botões
    const v = Math.abs(j.v)
    const a = (v - st.vAnt) / Math.max(1e-3, dt)
    st.vAnt = v
    ctx.acel += (a - ctx.acel) * Math.min(1, dt * 4)
    ctx.v = v
    ctx.mult = v / Math.max(1, j.vBase ?? (2 * p.bpm) / 3.6)
    ctx.gas = !!inp?.gas
    ctx.freio = !!inp?.freio
    ctx.turbo = !!inp?.turbo || j.turboT > 0
    ctx.via = j.via
    ctx.u = j.u
  })

  const p: Pista | null = k >= 0 ? pistas[k] : null
  const C = p ? MANIFESTOS[p.id].Componente : null
  if (!p || !C) return null
  return <C key={p.id} M={M} k={k} pista={p} ctx={ctx} carro={carro} />
}
