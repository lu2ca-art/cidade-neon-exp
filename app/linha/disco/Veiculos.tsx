"use client"

// OS 3 VEÍCULOS (T28): depois que jogam a Kombi lá de cima, o jogador segue de
// patins e acha, mais pra frente na mesma pista, os 3 veículos parados, de farol
// aceso e com a luz de baixo. Encostou num, aparece o botão de pegar (como o
// "tirar um racha" do T44): no mundo, não num menu. Quais são, os nomes e quanto
// andam moram em perseguicao.ts (VEICULOS, PROVISÓRIOS até os modelos do Tripo 3D).
//
// Desempenho: só existem na hora de escolher (3 × 4 malhas, sem luz própria nem
// sombra). Depois, só o escolhido, no lugar da Kombi (VeiculoModelo).

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { montarModelo } from "../estrada/carros"
import { amostra, du, mundo as noMundo, novaAmostra } from "../estrada/pista"
import type { Mundo } from "../estrada/mundo"
import { CONFIG_PERSEGUICAO, FALAS_PERSEGUICAO, VEICULOS, type Veiculo } from "./perseguicao"
import "./rachas-tela.css"

// o estado que a cena escreve e a tela lê (perto = o índice do veículo encostado)
export interface EstadoVeiculos { perto: number; ancora: { via: number; u: number } | null }
export const novoEstadoVeiculos = (): EstadoVeiculos => ({ perto: -1, ancora: null })

type JogoMin = { via: number; u: number; x: number; voo?: boolean }

// o modelo provisório de um veículo (o molde dos carros da cidade, na cor dele, com
// a luz de baixo). A frente fica no −Z, como a da Kombi
export function VeiculoModelo({ v }: { v: Veiculo }) {
  const m = useMemo(() => {
    const md = montarModelo(v.perfil)
    const pint = new THREE.MeshStandardMaterial({ color: v.cor, metalness: 0.6, roughness: 0.3 })
    const esc = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.5, roughness: 0.3 })
    const luz = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    const chao = new THREE.PlaneGeometry(v.perfil.W + 1.4, v.perfil.L + 1.2).rotateX(-Math.PI / 2).translate(0, 0.05, 0)
    const neon = new THREE.MeshBasicMaterial({ color: v.neon, toneMapped: false, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    return { md, pint, esc, luz, chao, neon }
  }, [v])
  useEffect(() => () => { for (const g of [m.md.pintada, m.md.escura, m.md.luzes, m.chao]) g.dispose(); for (const x of [m.pint, m.esc, m.luz, m.neon]) x.dispose() }, [m])
  return (
    <group rotation-y={Math.PI}>
      <mesh geometry={m.md.pintada} material={m.pint} />
      <mesh geometry={m.md.escura} material={m.esc} />
      <mesh geometry={m.md.luzes} material={m.luz} />
      <mesh geometry={m.chao} material={m.neon} renderOrder={2} />
    </group>
  )
}

// a cena: os 3 parados na pista, à frente de onde o jogador estava quando começou a escolha
export function VeiculosCena({ M, jogo, estado, ativo }: { M: Mundo; jogo: React.RefObject<JogoMin>; estado: React.RefObject<EstadoVeiculos>; ativo: boolean }) {
  const grupos = useRef<(THREE.Group | null)[]>([])
  const tmp = useMemo(() => ({ a: novaAmostra(), p: new THREE.Vector3() }), [])
  const lugares = useRef<{ u: number; x: number }[]>([])
  // teste (fora da produção): onde estão e qual está encostado
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && !/[?&]medir/.test(location.search)) return
    const w = window as unknown as Record<string, unknown>
    w.__veiculos = () => ({ ...estado.current, lugares: lugares.current })
    return () => { delete w.__veiculos }
  }, [estado])
  useFrame(() => {
    const j = jogo.current, E = estado.current
    if (!j || !E) return
    if (!ativo) { E.perto = -1; E.ancora = null; return }
    const C = CONFIG_PERSEGUICAO
    if (!E.ancora) {
      // chega a vez de escolher: os 3 nascem à frente, um de cada lado
      const V = M.vias[j.via]
      E.ancora = { via: j.via, u: j.u }
      lugares.current = VEICULOS.map((_, i) => {
        let u = j.u + C.frente + i * C.entre
        if (!V.fechada) u = Math.min(V.L - 6, u)
        amostra(V, u, tmp.a)
        const x = i % 2 ? Math.max(tmp.a.esq + 1.5, -2.6) : Math.min(tmp.a.dir - 1.5, 2.6)
        return { u, x }
      })
    }
    const V = M.vias[E.ancora.via]
    let perto = -1
    lugares.current.forEach((l, i) => {
      const g = grupos.current[i]
      if (!g) return
      const p = noMundo(V, l.u, l.x, 0.02, tmp.a, tmp.p)
      g.position.copy(p)
      g.rotation.set(0, Math.atan2(tmp.a.tx, tmp.a.tz) + Math.PI, 0)
      if (j.via === E.ancora!.via && !j.voo && Math.abs(du(V, j.u, l.u)) < 5.5 && Math.abs(j.x - l.x) < 3.4) perto = i
    })
    E.perto = perto
  })
  if (!ativo) return null
  return (
    <>
      {VEICULOS.map((v, i) => (
        <group key={v.id} ref={(g) => { grupos.current[i] = g }}>
          <VeiculoModelo v={v} />
        </group>
      ))}
    </>
  )
}

// a tela: encostou, o botão de pegar (pisca na cor da luz de baixo dele). Enter também pega
export function VeiculosHud({ estado, onPegar, escondido = false }: { estado: React.RefObject<EstadoVeiculos>; onPegar: (id: string) => void; escondido?: boolean }) {
  const [perto, setPerto] = useState(-1)
  const pegar = useRef(onPegar)
  useEffect(() => { pegar.current = onPegar }, [onPegar])
  useEffect(() => {
    const t = setInterval(() => setPerto(estado.current?.perto ?? -1), 100)
    return () => clearInterval(t)
  }, [estado])
  const v = perto >= 0 ? VEICULOS[perto] : null
  useEffect(() => {
    if (!v || escondido) return
    const k = (e: KeyboardEvent) => { if (e.key === "Enter") pegar.current(v.id) }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [v, escondido])
  if (!v || escondido) return null
  return (
    <button type="button" className="l-racha-btn" style={{ ["--cor" as string]: v.neon }} onPointerDown={(e) => e.stopPropagation()} onClick={() => pegar.current(v.id)} aria-label={`${FALAS_PERSEGUICAO.pegar} ${v.nome}`}>
      <small>{v.frase}</small>
      <b>{FALAS_PERSEGUICAO.pegar} {v.nome}</b>
    </button>
  )
}
