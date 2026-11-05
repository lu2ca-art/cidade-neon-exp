"use client"

// O HOST DAS RUAS-MANIFESTO: descobre em que rua (pista) a Kombi está, monta o
// manifesto DAQUELA rua (registro.ts) e desmonta quando ela sai. Uma vez por
// quadro lê o jogo e o toca-discos e escreve o CtxManifesto; os manifestos só
// leem dele e escrevem uniforms. Fora de uma rua com manifesto: nada montado,
// custo ~zero (um índice num array por quadro).
//
// Entra em fade (~1,2 s) e sai em fade (~1,6 s, também quando passa direto pra
// outra rua com manifesto: a antiga some, depois a nova entra); voar, passar pela torre da ponta ou
// pular a mureta não desmonta na hora (6 s de carência).

import { useMemo, useRef, useState } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import type * as THREE from "three"
import type { MundoDisco } from "../mundoDisco"
import { PISTAS, type Pista } from "../pistas"
import { MANIFESTOS } from "./registro"
import { tempoDaFaixa } from "./comum"
import type { ComandosManifesto, CtxManifesto, PoseManifesto } from "./tipos"

const CARENCIA = 6 // s fora da rua antes de começar a sumir
const FADE_IN = 1.2 // s
const FADE_OUT = 1.6 // s

// (revisão 2b) O TRANCO DA PRIMEIRA ENTRADA: cada rua compila os shaders dela ao
// montar, e o three apaga o programa quando o material é descartado (a rua desmonta
// = a próxima entrada compila de novo). Aqui:
//   - os programas de cada rua que já desenhou ficam PRESOS (usedTimes + 1): a
//     próxima montagem acha o programa pronto (a chave é a mesma: o mesmo shader,
//     a mesma cena, a mesma tela);
//   - parado numa rotatória (nenhuma rua montada), o host AQUECE uma rua por vez:
//     monta com dentro = 0 (as malhas colapsam/ficam transparentes, como no 1º
//     quadro de uma entrada de verdade), desenha uns quadros, prende e desmonta.
// O tranco sai da entrada da rua e vai pra rotatória, uma rua por vez, uma vez por sessão.
const QUADROS_AQUECE = 3
const ENTRE_AQUECER = 0.6 // s entre uma rua e a próxima
const PRESOS = new WeakSet<object>()
const AQUECIDAS = new Set<string>()
function prenderProgramas(gl: THREE.WebGLRenderer, g: THREE.Object3D | null) {
  if (!g) return
  g.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
    if (!mat) return
    for (const m of Array.isArray(mat) ? mat : [mat]) {
      const pr = (gl.properties.get(m) as { currentProgram?: { usedTimes: number } }).currentProgram
      if (pr && !PRESOS.has(pr)) { PRESOS.add(pr); pr.usedTimes++ }
    }
  })
}

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
  const ctx = useRef<CtxManifesto>({ t: 0, dur: 1, prog: 0, batida: 0, dentro: 0, idade: 0, v: 0, mult: 1, acel: 0, gas: false, freio: false, turbo: false, drift: false, ar: false, via: 0, u: 0, relogio: 0 }).current
  const st = useRef({ fora: 0, vAnt: 0, tProprio: 0, kVivo: -1, quadrosVivo: 0, quadrosAq: 0, esperaAq: 0 }).current
  const gl = useThree((s) => s.gl)
  const grupo = useRef<THREE.Group>(null)
  const grupoAq = useRef<THREE.Group>(null)
  // a rua aquecendo (o índice) e o ctx dela: parado, de fora (dentro = 0)
  const [aq, setAq] = useState(-1)
  const ctxAq = useMemo<CtxManifesto>(() => ({ ...ctx, dentro: 0 }), [ctx])

  useFrame((state, dtCru) => {
    const j = jogo.current, inp = input.current
    if (!j) return
    const dt = Math.min(0.1, dtCru)
    const inf = M.info[j.via]
    const aqui = inf && inf.pista >= 0 && !j.voo && pistas[inf.pista] ? inf.pista : -1
    // (revisão 2b) aquecer: desenhou os quadros, prende e desmonta; numa rotatória
    // sem rua montada, a próxima que falta
    if (aq >= 0) {
      if (++st.quadrosAq > QUADROS_AQUECE) { prenderProgramas(gl, grupoAq.current); AQUECIDAS.add(pistas[aq]!.id); st.quadrosAq = 0; st.esperaAq = ENTRE_AQUECER; setAq(-1) }
    } else if (st.kVivo < 0 && aqui < 0 && !j.voo && inf && inf.torre >= 0 && (st.esperaAq -= dt) <= 0) {
      const falta = pistas.findIndex((p) => !!p && !AQUECIDAS.has(p.id))
      if (falta >= 0) { st.quadrosAq = 0; setAq(falta) }
    }
    // chegou numa rua com manifesto: nada montado, monta já; (revisão 2b) outra rua
    // montada, a antiga sai em fade (o céu e a chuva dela voltam suave) e a nova
    // entra depois, em fade
    if (aqui >= 0 && aqui !== st.kVivo && (st.kVivo < 0 || ctx.dentro <= 0)) {
      st.kVivo = aqui; st.fora = 0; st.tProprio = 0; st.quadrosVivo = 0
      ctx.dentro = 0; ctx.idade = 0
      setK(aqui)
    }
    if (st.kVivo < 0) return
    // a rua de verdade também prende os programas dela (entrou sem aquecer)
    if (++st.quadrosVivo === QUADROS_AQUECE + 1 && k === st.kVivo) { prenderProgramas(gl, grupo.current); AQUECIDAS.add(pistas[st.kVivo]!.id) }
    st.fora = aqui === st.kVivo ? 0 : st.fora + dt
    const ficando = st.fora < CARENCIA && !(aqui >= 0 && aqui !== st.kVivo)
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
    ctx.drift = !!j.drift
    ctx.ar = !!j.ar
    ctx.via = j.via
    ctx.u = j.u
  })

  const p: Pista | null = k >= 0 ? pistas[k] : null
  const C = p ? MANIFESTOS[p.id].Componente : null
  const pA: Pista | null = aq >= 0 && aq !== k ? pistas[aq] : null
  const CA = pA ? MANIFESTOS[pA.id].Componente : null
  return (
    <>
      {p && C && <group ref={grupo}><C key={p.id} M={M} k={k} pista={p} ctx={ctx} carro={carro} /></group>}
      {pA && CA && <group ref={grupoAq}><CA key={`aq-${pA.id}`} M={M} k={aq} pista={pA} ctx={ctxAq} carro={carro} /></group>}
    </>
  )
}
