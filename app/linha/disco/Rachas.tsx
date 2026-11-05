"use client"

// OS RACHAS (T44): os carros mexidos pelo mecânico rodando nas pistas, o botão
// "tirar um racha" quando você emparelha com um, e o racha (a largada andando,
// o rival de elástico, a chegada que o GPS mostra). As regras e os nomes moram
// em corredores.ts; aqui é a cena (RachasCena, dentro do Canvas) e a tela
// (RachasHud, por cima, DOM).
//
// Desempenho (regra do dono): os carros são UMA malha instanciada por parte
// (a lataria, os vidros e rodas, as luzes, o neon de baixo) = 4 draws pra
// todos juntos, sem luz própria nem sombra. Longe da Kombi eles somem (escala
// 0). A conta por quadro é de 5 carros. A tela é DOM e se refaz ~10×/s sem
// React por quadro (só quando muda o que aparece).

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { compilarSemTravar } from "../estrada/luzes"
import { montarModelo, type Perfil } from "../estrada/carros"
import { amostra, du, mundo as noMundo, novaAmostra } from "../estrada/pista"
import type { MundoDisco } from "../estrada/mundoDisco"
import "./rachas-tela.css"
import { CORREDORES, RACHA_CFG, chegadaNaPista, premioRacha, velRival, type Corredor, type ResultadoRacha } from "./corredores"

// ── o estado compartilhado (a cena escreve, a tela lê; a tela só manda "comecar") ──
export type FaseRacha = "solto" | "oferta" | "contagem" | "valendo" | "fim"
export interface EstadoRacha {
  fase: FaseRacha
  quem: number // o índice do corredor (oferta, racha, fim)
  ate: number // (o tempo do jogo) a oferta acaba / a contagem acaba / o resultado some
  t0: number // a largada
  alvo: { via: number; u: number; x: number; z: number; cor: string; nome: string } | null
  falta: number // m que faltam pra Kombi
  faltaRival: number // m que faltam pro rival
  resultado: ResultadoRacha | null
  comecar: boolean // a tela pediu (o botão)
  conta: number // a contagem da largada (3, 2, 1)
}
export const novoEstadoRacha = (): EstadoRacha => ({ fase: "solto", quem: -1, ate: 0, t0: 0, alvo: null, falta: 0, faltaRival: 0, resultado: null, comecar: false, conta: 0 })

// o mínimo da Kombi que a cena lê
type JogoMin = { via: number; u: number; x: number; v: number; voo?: boolean; hyper?: boolean; tempo: number; wx?: number; wz?: number }

// o molde do carro mexido (RASCUNHO): baixo, largo, comprido, com asa atrás
const PERFIL_MEXIDO: Perfil = { nome: "mexido", L: 4.6, W: 1.95, H: 1.22, cint: 0.78, capo: 0.72, cab: [-1.05, 0.95], incl: [0.6, 0.75], roda: 0.34, cores: ["#ffffff"] }

function moldeMexido() {
  const { L, W, H } = PERFIL_MEXIDO
  // a asa: dois pés e a lâmina, atrás
  const asa: THREE.BufferGeometry[] = []
  for (const z of [-1, 1]) { const p = new THREE.BoxGeometry(0.08, 0.32, 0.12); p.translate(z * (W / 2 - 0.35), 0.95, -L / 2 + 0.3); asa.push(p) }
  const lam = new THREE.BoxGeometry(W + 0.1, 0.06, 0.42); lam.translate(0, 1.13, -L / 2 + 0.28); asa.push(lam)
  // as saias laterais (o carro "rebaixado")
  for (const z of [-1, 1]) { const s = new THREE.BoxGeometry(0.1, 0.16, L * 0.62); s.translate(z * (W / 2 + 0.02), 0.2, 0); asa.push(s) }
  const m = montarModelo(PERFIL_MEXIDO, { pintadas: asa })
  // o neon: o brilho no chão embaixo (um quadro) e as duas faixas acesas do lado
  const neon: THREE.BufferGeometry[] = []
  const chao = new THREE.PlaneGeometry(W + 1.6, L + 1.4); chao.rotateX(-Math.PI / 2); chao.translate(0, 0.06, 0); neon.push(chao)
  for (const z of [-1, 1]) { const f = new THREE.BoxGeometry(0.04, 0.05, L * 0.7); f.translate(z * (W / 2 + 0.08), 0.32, 0); neon.push(f) }
  const fita = new THREE.BoxGeometry(W + 0.12, 0.03, 0.04); fita.translate(0, 1.17, -L / 2 + 0.07); neon.push(fita)
  const limpar = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position") n.deleteAttribute(k); return n }
  const geoNeon = neon.map(limpar)
  // junta à mão (só posição): o neon não tem luz
  const total = geoNeon.reduce((a, g) => a + g.attributes.position.count, 0)
  const pos = new Float32Array(total * 3)
  let o = 0
  for (const g of geoNeon) { pos.set(g.attributes.position.array as Float32Array, o); o += g.attributes.position.count * 3 }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  void H
  return { ...m, neon: geo }
}

// (?parte=rachas põe ?racha=perto) o primeiro carro nasce colado à frente da Kombi
const pertoDeCara = () => typeof location !== "undefined" && /[?&]racha=perto/.test(location.search)

type Rodando = { via: number; u: number; x: number; v: number; vAlvo: number; espera: number; vivo: boolean }

// (medição) ?medir&semrachas desliga os carros do mecânico, pra comparar o custo deles
const SEM_RACHAS = typeof location !== "undefined" && /[?&]medir/.test(location.search) && /[?&]semrachas/.test(location.search)

export function RachasCena(props: Parameters<typeof RachasVivos>[0]) {
  return SEM_RACHAS ? null : <RachasVivos {...props} />
}

function RachasVivos({ M, jogo, estado, ativo }: {
  M: MundoDisco
  jogo: React.RefObject<JogoMin>
  estado: React.RefObject<EstadoRacha>
  ativo: boolean
}) {
  const { gl, camera, scene } = useThree()
  const N = Math.min(RACHA_CFG.quantos, CORREDORES.length)
  // as vias onde eles rodam: as linhas das pistas (ida e volta), as compridas (acesas ou não: eles rodam a cidade toda)
  const vias = useMemo(() => M.vias.map((v, vi) => vi).filter((vi) => { const f = M.info[vi]; return !!f && f.pista >= 0 && (f.parte === "ida" || f.parte === "volta") && M.vias[vi].L > 300 }), [M])
  const viasSet = useMemo(() => new Set(vias), [vias])
  const grupo = useMemo(() => {
    const m = moldeMexido()
    const pint = new THREE.InstancedMesh(m.pintada, new THREE.MeshStandardMaterial({ metalness: 0.75, roughness: 0.22 }), N)
    const esc = new THREE.InstancedMesh(m.escura, new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.25 }), N)
    const luz = new THREE.InstancedMesh(m.luzes, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), N)
    const neon = new THREE.InstancedMesh(m.neon, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), N)
    const cor = new THREE.Color()
    for (let i = 0; i < N; i++) { pint.setColorAt(i, cor.set(CORREDORES[i].cor)); neon.setColorAt(i, cor.set(CORREDORES[i].neon)) }
    const g = new THREE.Group()
    for (const im of [pint, esc, luz, neon]) { im.frustumCulled = false; g.add(im) }
    neon.renderOrder = 2
    return { g, pint, esc, luz, neon, todas: [pint, esc, luz, neon] }
  }, [N])
  useEffect(() => () => { for (const im of grupo.todas) { im.geometry.dispose(); (im.material as THREE.Material).dispose() } }, [grupo])
  useEffect(() => { void compilarSemTravar(gl, grupo.g, camera, scene) }, [gl, camera, scene, grupo])

  const carros = useRef<Rodando[]>([])
  const tmp = useMemo(() => ({ a: novaAmostra(), p: new THREE.Vector3(), o: new THREE.Object3D(), c: new THREE.Color(), esperaPor: new Map<number, number>(), t: -1, primeiro: false }), [])
  const sem = useRef(44)
  const rnd = () => ((sem.current = (sem.current * 16807) % 2147483647) / 2147483647)

  // a Kombi no mundo (na pista ou voando)
  const kombiXZ = (j: JogoMin) => {
    if (j.voo && j.wx !== undefined && j.wz !== undefined) return { x: j.wx, z: j.wz }
    const p = noMundo(M.vias[j.via], j.u, j.x, 0, tmp.a, tmp.p)
    return { x: p.x, z: p.z }
  }
  // nasce numa pista acesa por perto (de preferência na da Kombi, mais pra frente)
  const nascer = (c: Rodando, j: JogoMin, i: number) => {
    const k = kombiXZ(j)
    if (i === 0 && viasSet.has(j.via) && !j.voo) {
      // (?parte=rachas) o primeiro nasce logo à frente, pra ver na hora
      const L = M.vias[j.via].L, u = j.u + (!tmp.primeiro && pertoDeCara() ? 45 : 140 + rnd() * 160)
      tmp.primeiro = true
      if (u < L - 200) { c.via = j.via; c.u = u; c.vivo = true; return }
    }
    // (ruas-faixa) as pistas ficaram longas: sorteando a via inteira, quase nunca
    // cai perto. As primeiras tentativas são na via da Kombi (à frente ou atrás)
    const perto = viasSet.has(j.via) && !j.voo
    for (let t = 0; t < 40; t++) {
      const naDela = perto && t < 12
      const vi = naDela ? j.via : vias[Math.floor(rnd() * vias.length)], V = M.vias[vi]
      const u = naDela ? j.u + (rnd() < 0.7 ? 1 : -1) * (RACHA_CFG.nascerDe + rnd() * (RACHA_CFG.nascerAte - RACHA_CFG.nascerDe)) : rnd() * (V.L - 120)
      if (u < 0 || u > V.L - 120) continue
      const p = noMundo(V, u, 0, 0, tmp.a, tmp.p), d = Math.hypot(p.x - k.x, p.z - k.z)
      if (d > RACHA_CFG.nascerDe && d < RACHA_CFG.nascerAte) { c.via = vi; c.u = u; c.vivo = true; return }
    }
    c.vivo = false
  }

  // teste (?medir): põe um corredor colado na Kombi, e lê o estado
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && !/[?&]medir/.test(location.search)) return
    const w = window as unknown as Record<string, unknown>
    w.__rachas = {
      estado: () => estado.current,
      vias: () => vias,
      carros: () => carros.current.map((c) => ({ ...c })),
      // o corredor i do lado da Kombi (na mesma pista, mesma altura)
      perto: (i = 0, frente = 4) => {
        const j = jogo.current, c = carros.current[i]
        if (!j || !c) return false
        c.via = j.via; c.u = j.u + frente; c.x = j.x < 2.8 ? j.x + 3.4 : j.x - 3.4; c.v = Math.max(10, j.v); c.vivo = true; c.espera = 0
        tmp.esperaPor.delete(i)
        return true
      },
    }
    return () => { delete w.__rachas }
  }, [estado, jogo, tmp, vias])

  useFrame((st) => {
    const j = jogo.current, E = estado.current
    if (!j || !E) return
    // o tempo do jogo (o relógio de passo fixo): parado/pausado, nada anda
    const dt = tmp.t < 0 ? 0 : Math.max(0, Math.min(0.1, j.tempo - tmp.t))
    tmp.t = j.tempo
    const C = RACHA_CFG
    if (carros.current.length !== N) carros.current = Array.from({ length: N }, (_, i) => ({ via: vias[0] ?? 0, u: 0, x: 2.6 + (i % 3) * 0.6, v: 0, vAlvo: C.velPasseio[0] + rnd() * (C.velPasseio[1] - C.velPasseio[0]), espera: 0, vivo: false }))
    if (!ativo || !vias.length) {
      if (E.fase !== "solto") Object.assign(E, novoEstadoRacha())
      if (grupo.g.visible) grupo.g.visible = false
      return
    }
    grupo.g.visible = true
    const k = kombiXZ(j)
    const naPista = !j.voo && !j.hyper
    const racha = E.fase === "contagem" || E.fase === "valendo"

    // ── o racha ──
    if (E.fase === "oferta") {
      const c = carros.current[E.quem]
      const longe = !c || c.via !== j.via || Math.abs(du(M.vias[j.via], j.u, c.u)) > 60 || !naPista
      if (E.comecar && c && !longe) {
        const L = M.vias[j.via].L, uA = chegadaNaPista(j.u, L)
        if (uA !== null) {
          const p = noMundo(M.vias[j.via], uA, 0, 0, tmp.a, tmp.p)
          E.alvo = { via: j.via, u: uA, x: p.x, z: p.z, cor: CORREDORES[E.quem].neon, nome: `a chegada · ${CORREDORES[E.quem].nome}` }
          E.fase = "contagem"; E.ate = j.tempo + C.contagemS; E.t0 = E.ate
          c.u = j.u; c.x = j.x < 2.8 ? j.x + 3.4 : j.x - 3.4; c.v = j.v
        }
      } else if (j.tempo > E.ate || longe) {
        tmp.esperaPor.set(E.quem, j.tempo + C.esperaS)
        E.fase = "solto"; E.quem = -1
      }
      E.comecar = false
    } else if (E.fase === "contagem" || E.fase === "valendo") {
      const c = carros.current[E.quem], A = E.alvo!
      const V = M.vias[A.via]
      E.falta = Math.hypot(A.x - k.x, A.z - k.z)
      E.faltaRival = Math.max(0, A.u - c.u)
      if (E.fase === "contagem") {
        // lado a lado: ele acompanha a Kombi até o "valendo"
        c.via = A.via; c.v = j.via === A.via ? Math.max(0, j.v) : c.v
        c.u = j.via === A.via ? j.u : c.u + c.v * dt
        E.conta = Math.max(1, Math.ceil(E.ate - j.tempo))
        if (j.tempo >= E.ate) E.fase = "valendo"
      } else {
        const alvoV = velRival(CORREDORES[E.quem], j.v, E.falta - E.faltaRival)
        c.v += Math.max(-C.acel * dt, Math.min(C.acel * dt, alvoV - c.v))
        c.u = Math.min(V.L - 1, c.u + c.v * dt)
        const tempo = j.tempo - E.t0
        const kombiChegou = E.falta < C.chegadaRaio
        const rivalChegou = c.u >= A.u
        if (kombiChegou || rivalChegou || tempo > C.tempoMax) {
          E.resultado = premioRacha(CORREDORES[E.quem], kombiChegou && !rivalChegou, tempo)
          E.fase = "fim"; E.ate = j.tempo + C.mostraS; E.alvo = null
          tmp.esperaPor.set(E.quem, j.tempo + C.esperaS * 2)
        }
      }
      E.comecar = false
    } else if (E.fase === "fim") {
      if (j.tempo > E.ate) { E.fase = "solto"; E.quem = -1; E.resultado = null }
      E.comecar = false
    }

    // ── eles rodando ──
    const cam = st.camera.position
    for (let i = 0; i < N; i++) {
      const c = carros.current[i]
      const correndo = racha && E.quem === i
      if (!correndo) {
        if (!c.vivo) nascer(c, j, i)
        if (c.vivo) {
          // passeando: no ritmo dele, devagar perto da Kombi (pra dar pra emparelhar)
          c.v += Math.max(-8 * dt, Math.min(8 * dt, c.vAlvo - c.v))
          c.u += c.v * dt
          const V = M.vias[c.via]
          const p = noMundo(V, c.u, c.x, 0, tmp.a, tmp.p)
          if (c.u > V.L - 20 || Math.hypot(p.x - k.x, p.z - k.z) > C.longe) c.vivo = false
        }
        // emparelhou: pisca
        if (c.vivo && E.fase === "solto" && naPista && c.via === j.via && (tmp.esperaPor.get(i) ?? -1) < j.tempo) {
          const d = du(M.vias[j.via], j.u, c.u)
          if (Math.abs(d) < C.emparelhaFrente && Math.abs(c.x - j.x) < C.emparelhaLado && chegadaNaPista(j.u, M.vias[j.via].L) !== null) {
            E.fase = "oferta"; E.quem = i; E.ate = j.tempo + C.piscaS; E.comecar = false
          }
        }
      }
      // o desenho
      let sc = 0
      if (c.vivo) {
        const V = M.vias[c.via]
        // a faixa de dentro da pista (não sai pela borda)
        amostra(V, c.u, tmp.a)
        c.x = Math.max(tmp.a.esq + 1.3, Math.min(tmp.a.dir - 1.3, c.x))
        const p = noMundo(V, c.u, c.x, 0.02, tmp.a, tmp.p)
        tmp.o.position.copy(p)
        tmp.o.rotation.set(0, Math.atan2(tmp.a.tx, tmp.a.tz), 0)
        sc = (p.x - cam.x) ** 2 + (p.z - cam.z) ** 2 > C.desenhaAte * C.desenhaAte ? 0 : 1
      }
      tmp.o.scale.setScalar(sc)
      tmp.o.updateMatrix()
      for (const im of grupo.todas) im.setMatrixAt(i, tmp.o.matrix)
      // o neon do que está oferecendo pulsa (você sabe com quem é)
      const forte = E.fase === "oferta" && E.quem === i ? 1.4 + Math.sin(j.tempo * 14) * 0.6 : correndo ? 1.5 : 1
      grupo.neon.setColorAt(i, tmp.c.set(CORREDORES[i].neon).multiplyScalar(forte))
    }
    for (const im of grupo.todas) im.instanceMatrix.needsUpdate = true
    if (grupo.neon.instanceColor) grupo.neon.instanceColor.needsUpdate = true
  })
  return <primitive object={grupo.g} />
}

// ── a tela: o botão que pisca, a contagem, o placar do racha e o resultado ──
const metros = (m: number) => `${Math.max(0, Math.round(m / 10) * 10)} m`

export function RachasHud({ estado, onFim, escondido = false }: { estado: React.RefObject<EstadoRacha>; onFim: (r: ResultadoRacha) => void; escondido?: boolean }) {
  const [vista, setVista] = useState<{ fase: FaseRacha; quem: number; conta: number }>({ fase: "solto", quem: -1, conta: 0 })
  const placar = useRef<HTMLDivElement>(null)
  const pago = useRef<ResultadoRacha | null>(null)
  const fim = useRef(onFim)
  useEffect(() => { fim.current = onFim }, [onFim])
  useEffect(() => {
    let ultimo = ""
    const passo = () => {
      const E = estado.current
      if (!E) return
      const conta = E.fase === "contagem" ? E.conta : 0
      const chave = `${E.fase}|${E.quem}|${conta}`
      if (chave !== ultimo) { ultimo = chave; setVista({ fase: E.fase, quem: E.quem, conta }) }
      // pagar uma vez só, quando o resultado sai
      if (E.fase === "fim" && E.resultado && pago.current !== E.resultado) { pago.current = E.resultado; fim.current(E.resultado) }
      const el = placar.current
      if (el && (E.fase === "valendo" || E.fase === "contagem")) {
        const frente = E.falta <= E.faltaRival
        el.dataset.pos = frente ? "1" : "2"
        el.querySelector("b")!.textContent = frente ? "1º" : "2º"
        el.querySelector("em")!.textContent = `faltam ${metros(E.falta)}`
      }
    }
    passo()
    const t = setInterval(passo, 100)
    return () => clearInterval(t)
  }, [estado])

  if (escondido || vista.fase === "solto") return null
  const c: Corredor | undefined = CORREDORES[vista.quem]
  if (!c) return null
  const E = estado.current
  if (vista.fase === "oferta") {
    return (
      <button type="button" className="l-racha-btn" style={{ ["--cor" as string]: c.neon }} onPointerDown={(e) => e.stopPropagation()} onClick={() => { estado.current.comecar = true }} aria-label={`tirar um racha com ${c.nome}`}>
        <small>{c.nome} · {c.carro}</small>
        <b>tirar um racha</b>
        <em>“{c.desafio}”</em>
      </button>
    )
  }
  if (vista.fase === "contagem" || vista.fase === "valendo") {
    return (
      <div className="l-racha-placar" ref={placar} style={{ ["--cor" as string]: c.neon }} role="status" data-fase={vista.fase}>
        <small>racha · {c.nome}</small>
        <b>1º</b>
        <em>faltam …</em>
        {vista.fase === "contagem" && <strong className="l-racha-conta" key={vista.conta}>{vista.conta || 3}</strong>}
        {vista.fase === "valendo" && <strong className="l-racha-conta is-valendo" key="v">valendo!</strong>}
      </div>
    )
  }
  const r = E.resultado
  if (!r) return null
  return (
    <div className={`l-racha-fim${r.venceu ? " is-venceu" : ""}`} style={{ ["--cor" as string]: c.neon }} role="status">
      <small>racha · {c.nome}</small>
      <b>{r.venceu ? "você ganhou!" : `${c.nome} levou essa`}</b>
      {r.venceu ? <em>+{r.neon} neon$ · +{r.prestigio} prestígio</em> : null}
      <i>“{r.venceu ? c.perdeu : c.ganhou}”</i>
    </div>
  )
}
