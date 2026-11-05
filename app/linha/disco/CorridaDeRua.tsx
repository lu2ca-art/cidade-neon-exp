"use client"
/* eslint-disable react-hooks/immutability -- three.js: o jogador é segurado na grade (o ref do jogo) e as instâncias mudam a cada quadro */

// A CORRIDA DE RUA DO SUBÚRBIO (05/11): a cena (CorridaRuaCena, dentro do
// Canvas, dentro do <Perto> das ruínas) e a tela (CorridaRuaHud, DOM, por cima).
// A lógica e o traçado moram em corridaRua.ts; o traçado em ASCII, em
// docs/corrida-suburbio.md.
//
// Como começa (sem menu): o arco de largada fica na reta do bar. De moto ou de
// patins, chegando perto da linha, aparece o botão "correr". A contagem segura
// você na grade, atrás de 3 rivais (os pilotos das trincheiras), e são 2 voltas
// passando pelos portões de luz na ordem. A rádio não para (bíblia §9: a trilha
// não para): a corrida não mexe no som.
//
// Desempenho: sem luz nenhuma (tudo MeshBasic, o neon somado na tela). O arco:
// 3 desenhos (a base escura com o xadrez, o neon, a placa). Os portões: UMA
// malha instanciada (11), só durante a corrida. Os rivais: 1 desenho cada (o
// corpo e o veículo numa malha só, geoCorredor), só durante a corrida. Por
// quadro: a conta dos 3 rivais, 11 cores e a distância até os portões.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { geoCorredor } from "../trincheiras/geoCorrida"
import { relogio } from "../trincheiras/corrida"
import "./rachas-tela.css"
import "./corridaRua.css"
import {
  CORRIDA_RUA_CFG as CFG, L_RUA, MEIA_RUA, PORTOES_RUA, RAIO_PORTAO_RUA, RUA, SEQ_RUA, VOLTAS_RUA, VOLTA_RUA,
  acompanharRua, criarRivaisRua, distNaVolta, naVoltaRua, novoEstadoRua, passoRivalRua, pilotosRua, placarComCorrida, portaoDaVolta, voltaDe,
  type PlacarRua, type ResultadoRua, type VeiculoRua,
} from "./corridaRua"

type JogoMin = { wx?: number; wz?: number; rumo?: number; v: number; vx?: number; voo?: boolean; tempo: number }
type CombMin = { patins?: boolean; moto?: boolean }

const COR_PROXIMO = new THREE.Color("#2fe8ff")
const COR_DEPOIS = new THREE.Color("#ff3fb0")
const COR_LINHA = new THREE.Color("#ffffff")
const APAGADO = new THREE.Color("#000000")
// (revisão 2) fora do laço do quadro: o array não nasce a cada quadro
const VEICULOS_RUA: readonly VeiculoRua[] = ["moto", "patins"]
const SEM_RIVAIS: never[] = []

// ── os desenhos (uma vez) ──
// um retângulo em pé no plano x-y (de frente pra quem vem em +z)
function quadro(x0: number, y0: number, x1: number, y1: number, z = 0) {
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y0, z, x1, y0, z, x1, y1, z, x0, y1, z], 3))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}
// deitado no chão (x de lado, z ao longo)
function deitado(x0: number, z0: number, x1: number, z1: number, y = 0.06) {
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0], 3))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}
// (pra juntar: só posição e cor, todas sem índice)
const colorir = (g: THREE.BufferGeometry, c: THREE.Color) => {
  for (const k of Object.keys(g.attributes)) if (k !== "position") g.deleteAttribute(k)
  const n = g.attributes.position.count, a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3))
  return g
}

// o portão de luz: um U de cabeça pra baixo (as duas colunas e a barra) e a
// faixa no chão. Branco: a cor vem da instância
function geoPortaoRua() {
  const L = MEIA_RUA + 0.6, H = 4.6, e = 0.32
  return mergeGeometries([
    quadro(-L - e, -1, -L, H + e), quadro(L, -1, L + e, H + e), quadro(-L, H, L, H + e),
    deitado(-L, -0.14, L, 0.14),
  ])!
}

// o arco de largada: as colunas e a viga (escuro), o xadrez no chão, o neon e a placa
const ARCO = { meia: MEIA_RUA + 1.4, alto: 6.4, coluna: 0.9 }
function geoArco() {
  const { meia, alto, coluna } = ARCO
  const escuro = new THREE.Color("#14121c"), branco = new THREE.Color("#e9e6f2"), preto = new THREE.Color("#0b0a10")
  const base: THREE.BufferGeometry[] = []
  for (const s of [-1, 1]) {
    const b = new THREE.BoxGeometry(coluna, alto + 2, coluna); b.translate(s * (meia + coluna / 2), alto / 2 - 1, 0); base.push(colorir(b.toNonIndexed(), escuro))
  }
  const viga = new THREE.BoxGeometry(meia * 2 + coluna * 2, 0.7, 0.6); viga.translate(0, alto + 0.35, 0); base.push(colorir(viga.toNonIndexed(), escuro))
  // o xadrez da linha: 2 fileiras de quadrados de 1 m
  const n = Math.round(meia * 2)
  for (let i = 0; i < n; i++) for (let f = 0; f < 2; f++) {
    const x0 = -meia + (i * meia * 2) / n, x1 = -meia + ((i + 1) * meia * 2) / n
    base.push(colorir(deitado(x0, -1 + f, x1, f, 0.05).toNonIndexed(), (i + f) % 2 ? branco : preto))
  }
  // o neon: o contorno de dentro do arco (as colunas e a viga) e duas faixas na viga
  const neon: THREE.BufferGeometry[] = []
  const t = 0.16
  for (const z of [-0.33, 0.33]) {
    neon.push(quadro(-meia - t, 0, -meia + 0.02, alto, z), quadro(meia - 0.02, 0, meia + t, alto, z), quadro(-meia, alto - t, meia, alto + 0.02, z))
    neon.push(quadro(-meia - coluna, alto + 0.55, meia + coluna, alto + 0.62, z))
  }
  return { base: mergeGeometries(base)!, neon: mergeGeometries(neon)! }
}
function texPlaca() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128
  const g = c.getContext("2d")!
  g.fillStyle = "#07060c"; g.fillRect(0, 0, 512, 128)
  g.textAlign = "center"; g.textBaseline = "middle"
  g.font = "900 60px ui-monospace, monospace"
  g.shadowColor = "#ff3fb0"; g.shadowBlur = 22; g.fillStyle = "#ff3fb0"; g.fillText("CORRIDA", 256, 50)
  g.shadowBlur = 0; g.fillStyle = "rgba(255,255,255,0.9)"; g.fillText("CORRIDA", 256, 50)
  g.font = "700 26px ui-monospace, monospace"; g.fillStyle = "#2fe8ff"; g.fillText(`DE RUA · ${VOLTAS_RUA} VOLTAS`, 256, 100)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** A cena da corrida de rua (no Canvas). Monta dentro do <Perto> das ruínas. */
export function CorridaRuaCena({ chao, jogo, comb }: { chao: (x: number, z: number) => number; jogo: React.RefObject<JogoMin>; comb: React.RefObject<CombMin> }) {
  const S = PORTOES_RUA[0]
  const arco = useMemo(() => {
    const { base, neon } = geoArco()
    const placa = new THREE.PlaneGeometry(ARCO.meia * 1.5, ARCO.meia * 0.375)
    placa.rotateY(Math.PI) // de frente pra quem chega na linha
    placa.translate(0, ARCO.alto + 1.9, 0)
    const tex = texPlaca()
    const mats = {
      base: new THREE.MeshBasicMaterial({ vertexColors: true }),
      neon: new THREE.MeshBasicMaterial({ color: "#ff3fb0", transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
      placa: new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, toneMapped: false }),
    }
    return { base, neon, placa, tex, mats }
  }, [])
  const yLinha = useMemo(() => chao(S.x, S.z), [chao, S.x, S.z])
  const portoes = useMemo(() => {
    const im = new THREE.InstancedMesh(geoPortaoRua(), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), PORTOES_RUA.length)
    const o = new THREE.Object3D()
    PORTOES_RUA.forEach((p, i) => {
      o.position.set(p.x, chao(p.x, p.z), p.z); o.rotation.set(0, p.yaw, 0); o.updateMatrix()
      im.setMatrixAt(i, o.matrix); im.setColorAt(i, APAGADO)
    })
    im.frustumCulled = false
    im.visible = false
    return im
  }, [chao])
  // os rivais: os dois jogos de pilotos (moto e patins), escondidos até a corrida
  const corpos = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 })
    const mapa: Record<VeiculoRua, THREE.Mesh[]> = { moto: [], patins: [] }
    for (const v of ["moto", "patins"] as VeiculoRua[]) for (const p of pilotosRua(v)) {
      const me = new THREE.Mesh(geoCorredor(p.veiculo, p.cor), m)
      me.visible = false
      mapa[v].push(me)
    }
    return { mapa, m, todos: [...mapa.moto, ...mapa.patins] }
  }, [])
  useEffect(() => () => {
    arco.base.dispose(); arco.neon.dispose(); arco.placa.dispose(); arco.tex.dispose()
    for (const m of Object.values(arco.mats)) m.dispose()
    portoes.geometry.dispose(); (portoes.material as THREE.Material).dispose(); portoes.dispose()
    for (const me of corpos.todos) me.geometry.dispose()
    corpos.m.dispose()
  }, [arco, portoes, corpos])
  // longe do subúrbio (o <Perto> desmontou): a corrida que estava valendo acaba
  useEffect(() => () => { RUA.e = novoEstadoRua() }, [])

  const tmp = useMemo(() => ({ t: -1, pose: { x: 0, z: 0, yaw: 0 }, c: new THREE.Color(), ultCp: -2 }), [])

  useFrame(() => {
    const j = jogo.current, cb = comb.current, E = RUA.e
    if (!j || !cb) return
    const dt = tmp.t < 0 ? 0 : Math.max(0, Math.min(0.1, j.tempo - tmp.t))
    tmp.t = j.tempo
    // fora da Kombi (de patins ou de moto), no chão do subúrbio
    const solto = !!cb.patins && !!j.voo && j.wx !== undefined && j.wz !== undefined
    const veic: VeiculoRua = cb.moto ? "moto" : "patins"
    const x = j.wx ?? 1e9, z = j.wz ?? 1e9

    const acabar = (motivo: string | null) => {
      const fimJ = motivo ? null : E.tempo
      const lista = E.rivais.map((r) => ({ nome: r.nome, cor: r.cor, fim: r.fim == null ? null : r.fim - E.t0 }))
      const antes = lista.filter((r) => r.fim != null && (fimJ == null || r.fim < fimJ)).length
      const lugar = motivo ? lista.length + 1 : antes + 1
      E.resultado = { veiculo: E.veiculo, tempo: fimJ, lugar, de: lista.length + 1, venceu: !motivo && lugar === 1, motivo: motivo ?? undefined, rivais: lista }
      E.fase = "fim"; E.ate = j.tempo + CFG.mostraS
    }

    if (E.fase === "fora" || E.fase === "perto") {
      const perto = solto && Math.hypot(x - S.x, z - S.z) < CFG.pertoLargada
      E.fase = perto ? "perto" : "fora"
      if (E.comecar && perto) {
        // a largada: os rivais na grade e você atrás, segurado até o "valendo"
        Object.assign(E, { fase: "contagem", veiculo: veic, ate: j.tempo + CFG.contagemS, t0: j.tempo + CFG.contagemS, conta: CFG.contagemS, tempo: 0, cp: 0, k: 0, prog: CFG.gradeJogador[0], lugar: 4, fora: 0, resultado: null, desistir: false, rivais: criarRivaisRua(veic) })
        tmp.ultCp = -2
      }
      E.comecar = false
    } else if (E.fase === "contagem" || E.fase === "valendo") {
      const desistiu = E.desistir || !solto || veic !== E.veiculo
      if (E.fase === "contagem") {
        // (revisão 2b) a grade segura o jogador no passo fixo da física (Corrida.tsx, passo)
        E.conta = Math.max(1, Math.ceil(E.ate - j.tempo))
        E.k = 0
        if (j.tempo >= E.ate) E.fase = "valendo"
        if (desistiu) acabar(E.desistir ? "desistiu" : "saiu da moto/patins")
      } else {
        E.tempo = j.tempo - E.t0
        // onde está na volta e os portões, na ordem
        E.k = acompanharRua(E.k, x, z)
        const g = PORTOES_RUA[SEQ_RUA[E.cp]]
        if (g && Math.hypot(x - g.x, z - g.z) < RAIO_PORTAO_RUA) E.cp++
        const nP = PORTOES_RUA.length
        let d = distNaVolta(E.k)
        const naVolta = E.cp % nP
        if (naVolta === 0 && d > L_RUA - 150) d -= L_RUA // ainda atrás da linha (a largada)
        else if (naVolta === nP - 1 && d < 150) d += L_RUA // passou a linha, falta contar
        E.prog = Math.floor(E.cp / nP) * L_RUA + d
        const p = VOLTA_RUA[E.k]
        E.fora = Math.hypot(p.x - x, p.z - z) > CFG.foraM ? E.fora + dt : 0
        for (const r of E.rivais) passoRivalRua(r, dt, j.tempo, E.prog, true)
        E.lugar = 1 + E.rivais.filter((r) => (r.fim != null ? 1e9 : r.d) > E.prog).length
        if (E.cp >= SEQ_RUA.length) acabar(null)
        else if (desistiu) acabar(E.desistir ? "desistiu" : "saiu da moto/patins")
        else if (E.fora > CFG.foraS) acabar("saiu do circuito")
        else if (E.tempo > CFG.tempoMaxS) acabar("o tempo acabou")
      }
    } else if (E.fase === "fim") {
      // os rivais terminam a volta deles enquanto o resultado aparece
      for (const r of E.rivais) passoRivalRua(r, dt, j.tempo, E.prog, true)
      if (j.tempo > E.ate) { E.fase = "fora"; E.rivais = []; E.resultado = null }
    }

    // ── o desenho ──
    const correndo = E.fase === "contagem" || E.fase === "valendo"
    portoes.visible = correndo
    if (correndo && tmp.ultCp !== E.cp) {
      tmp.ultCp = E.cp
      const prox = SEQ_RUA[E.cp], depois = SEQ_RUA[E.cp + 1]
      PORTOES_RUA.forEach((_, i) => {
        // o próximo acende forte, o seguinte fraco; o resto quase some (a linha fica branca)
        const c = i === prox ? COR_PROXIMO : i === depois ? COR_DEPOIS : i === 0 ? COR_LINHA : APAGADO
        portoes.setColorAt(i, tmp.c.copy(c).multiplyScalar(i === prox ? 1 : i === depois ? 0.35 : i === 0 ? 0.25 : 0))
      })
      if (portoes.instanceColor) portoes.instanceColor.needsUpdate = true
    }
    const vis = E.fase !== "fora" && E.fase !== "perto" ? E.rivais : SEM_RIVAIS
    for (const v of VEICULOS_RUA) {
      const lista = corpos.mapa[v]
      for (let i = 0; i < lista.length; i++) {
        const me = lista[i], r = v === E.veiculo ? vis[i] : undefined
        me.visible = !!r
        if (!r) continue
        naVoltaRua(r.d, r.lado, tmp.pose)
        me.position.set(tmp.pose.x, chao(tmp.pose.x, tmp.pose.z), tmp.pose.z)
        me.rotation.set(0, tmp.pose.yaw, 0)
      }
    }
  })

  return (
    <group>
      <group position={[S.x, yLinha, S.z]} rotation-y={S.yaw}>
        <mesh geometry={arco.base} material={arco.mats.base} />
        <mesh geometry={arco.neon} material={arco.mats.neon} renderOrder={2} />
        <mesh geometry={arco.placa} material={arco.mats.placa} />
      </group>
      <primitive object={portoes} />
      {corpos.todos.map((me, i) => <primitive key={i} object={me} />)}
    </group>
  )
}

// ── a tela: o botão "correr", a contagem, o placar e o resultado ──
type Vista = { fase: string; conta: number; volta: number; portao: number }

export function CorridaRuaHud({ placar, onFim, escondido = false }: { placar?: PlacarRua; onFim: (r: ResultadoRua) => void; escondido?: boolean }) {
  const [vista, setVista] = useState<Vista>({ fase: "fora", conta: 0, volta: 1, portao: 1 })
  const quadroRef = useRef<HTMLDivElement>(null)
  const pago = useRef<ResultadoRua | null>(null)
  // o que mostrar no fim (calculado com o placar de antes da corrida)
  const [fim, setFim] = useState<{ r: ResultadoRua; recorde: boolean; premio: number } | null>(null)
  const ref = useRef({ onFim, placar })
  useEffect(() => { ref.current = { onFim, placar } }, [onFim, placar])
  useEffect(() => {
    let ultimo = ""
    const passo = () => {
      const E = RUA.e
      const volta = voltaDe(E.cp), portao = portaoDaVolta(E.cp)
      const conta = E.fase === "contagem" ? E.conta : 0
      const chave = `${E.fase}|${conta}|${volta}|${portao}`
      if (chave !== ultimo) { ultimo = chave; setVista({ fase: E.fase, conta, volta, portao }); if (E.fase === "contagem") setFim(null) }
      if (E.fase === "fim" && E.resultado && pago.current !== E.resultado) {
        pago.current = E.resultado
        const r = E.resultado, antes = ref.current.placar
        const melhor = antes?.melhor?.[r.veiculo]
        const { premio } = placarComCorrida(antes, r)
        setFim({ r, recorde: r.tempo != null && (melhor == null || r.tempo < melhor), premio })
        // só a corrida que chegou entra no placar
        if (r.tempo != null) ref.current.onFim(r)
      }
      const el = quadroRef.current
      if (el && (E.fase === "valendo" || E.fase === "contagem")) {
        el.dataset.pos = E.lugar === 1 ? "1" : "2"
        el.querySelector("b")!.textContent = `${E.lugar}º`
        el.querySelector("em")!.textContent = relogio(E.fase === "valendo" ? E.tempo : 0)
      }
    }
    passo()
    const t = setInterval(passo, 100)
    return () => clearInterval(t)
  }, [])

  if (escondido || vista.fase === "fora") return null
  const cor = "#2fe8ff"
  if (vista.fase === "perto") {
    const melhor = placar?.melhor ? Math.min(...Object.values(placar.melhor).filter((v): v is number => v != null)) : null
    return (
      <button type="button" className="l-racha-btn is-rua" style={{ ["--cor" as string]: cor }} onPointerDown={(e) => e.stopPropagation()} onClick={() => { RUA.e.comecar = true }} aria-label="correr: a corrida de rua do subúrbio">
        <small>corrida de rua · {VOLTAS_RUA} voltas · 3 rivais</small>
        <b>correr</b>
        <em>{melhor != null && isFinite(melhor) ? `seu melhor: ${relogio(melhor)}` : (placar?.vitorias ?? 0) ? "bora de novo" : `ganhe e leve ${CFG.premioNeon} neon$`}</em>
      </button>
    )
  }
  if (vista.fase === "contagem" || vista.fase === "valendo") {
    return (
      <>
        <div className="l-racha-placar is-rua" ref={quadroRef} style={{ ["--cor" as string]: cor }} role="status" data-fase={vista.fase}>
          <small>corrida de rua · volta {vista.volta}/{VOLTAS_RUA} · portão {vista.portao}/{PORTOES_RUA.length}</small>
          <b>4º</b>
          <em>0:00.00</em>
          {vista.fase === "contagem" && <strong className="l-racha-conta" key={vista.conta}>{vista.conta || 3}</strong>}
          {vista.fase === "valendo" && vista.volta === 1 && vista.portao === 1 && <strong className="l-racha-conta is-valendo" key="v">valendo!</strong>}
        </div>
        <button type="button" className="l-rua-desistir" onPointerDown={(e) => e.stopPropagation()} onClick={() => { RUA.e.desistir = true }}>desistir</button>
      </>
    )
  }
  if (!fim) return null
  const { r, recorde, premio } = fim
  const titulo = r.tempo == null ? (r.motivo ?? "desistiu") : r.venceu ? "você ganhou!" : `${r.lugar}º lugar`
  const ordem = [{ nome: "VOCÊ", cor: "#ffffff", fim: r.tempo }, ...r.rivais].sort((a, b) => (a.fim ?? 1e9) - (b.fim ?? 1e9))
  return (
    <div className={`l-racha-fim is-rua${r.venceu ? " is-venceu" : ""}`} style={{ ["--cor" as string]: cor }} role="status">
      <small>corrida de rua · {r.veiculo === "moto" ? "de moto" : "de patins"}</small>
      <b>{titulo}</b>
      {r.tempo != null && <em>{relogio(r.tempo)}{recorde ? " · seu melhor!" : ""}{premio ? ` · +${premio} neon$` : ""}</em>}
      {r.tempo != null && (
        <ol className="l-rua-ordem">
          {ordem.map((o) => <li key={o.nome} style={{ color: o.cor }}>{o.nome} <span>{o.fim == null ? "—" : relogio(o.fim)}</span></li>)}
        </ol>
      )}
    </div>
  )
}
