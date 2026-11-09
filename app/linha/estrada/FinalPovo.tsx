"use client"

// O FINAL NO MUNDO (09/11, a revolta): o 3D e a câmera roteirizada da sequência (as
// regras e os tempos moram em disco/final.ts; a tela, em disco/FinalTela.tsx).
//
//   palco    em cima do palco, olhando a plateia cheia; um anel pequeno marca o gesto
//   povo     a câmera sobe e volta pela rua: a multidão se junta até o Núcleo, e a
//            água começa a sair de lá
//   agua     segue a frente da água da Nectar até o deserto, descendo pelo subúrbio
//   chuva    na casa da D-Bee, a chuva cai de verdade no deserto
//   floresta sobe e abre em volta da casa: a floresta nasce (estrada/Floresta.tsx)
//
// A água: nove fitas (as nove idas, saindo do Núcleo) e o pedaço final, do fim da
// Nectar até a casa, num desenho só; o quanto já correu é 1 número (uFrente).
//
// Desempenho: fora do final não monta nada (FinalVivo). Sem luz nova. Por quadro: a
// câmera (6 números), a chuva e a frente. A plateia e o povo são a Multidao de sempre
// (carregada só aqui). O salto de câmera é aquecido: os pontos do caminho entram aos
// poucos no <Perto> durante o "povo" (PERTO_EXTRA).

import { useFrame } from "@react-three/fiber"
import { lazy, useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { Mundo } from "./mundo"
import type { MundoDisco } from "./mundoDisco"
import { PASSO } from "./pista"
import { Perto, PERTO_EXTRA, type PontoXZ } from "./Perto"
import { poseLugar } from "./Lugares"
import { ModeloSeguro } from "./Seguro"
import { AREIA_VERDE } from "./areia"
import { FLORESTA_FRENTE } from "./Floresta"
import { CHUVA_MANIFESTO } from "./manifestos/ceu"
import { MEIA_PISTA, densidadeRua } from "./manifestos/comum"
import { texturaDeAgua } from "../trincheiras/RioDepois"
import { LUGARES } from "../lugares"
import { CASA, CHAO_LUGARES, ROT_CASA } from "../disco/historia"
import { CAM_ROTEIRO, FINAL_CFG, FINAL_VIVO, NOVE, lerFinal, ouvirFinal } from "../disco/final"
import type { Pessoa } from "../interior/comum"

// a multidão vive no pacote das salas: só baixa quando o final precisa dela
const FinalMultidao = lazy(() => import("./FinalMultidao"))

const naCasa = (lx: number, lz: number) => ({
  x: CASA.x + Math.cos(ROT_CASA) * lx + Math.sin(ROT_CASA) * lz,
  z: CASA.z - Math.sin(ROT_CASA) * lx + Math.cos(ROT_CASA) * lz,
})
const suave = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k) }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const NADA = { momento: null, feito: false }
const lerServidor = () => NADA

export function FinalPovo({ M }: { M: MundoDisco }) {
  const vivo = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  if (vivo.momento === null && !vivo.lotado) return null
  return <FinalVivo M={M} />
}

// ── a plateia, a rua e o caminho da água (uma vez por mundo, só quando o final abre) ──
function montarCena(M: MundoDisco) {
  const P = poseLugar(M as unknown as Mundo, LUGARES["palco-nectar"])
  const V = M.vias[P.via]
  const iPalco = Math.max(0, Math.min(V.n - 1, Math.round(P.u / PASSO)))
  const uMax = (V.n - 1) * PASSO
  const de = FINAL_CFG
  let sem = 31
  const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  const cores = NOVE.map((n) => n.cor)
  const cor = () => cores[Math.floor(r() * cores.length)]
  const pessoa = (u: number, lat: number): Pessoa => {
    const i = Math.max(0, Math.min(V.n - 1, Math.round(u / PASSO)))
    const c = Math.cos(V.bank[i])
    const x = V.px[i] - V.tz[i] * lat * c, z = V.pz[i] + V.tx[i] * lat * c
    const y = V.py[i] - lat * Math.sin(V.bank[i])
    return { x, y, z, vira: Math.atan2(P.centro.x - x, P.centro.z - z), cor: cor() }
  }
  const dens = densidadeRua()
  // a plateia: em frente ao palco, do lado dele (a vaga do jogador fica livre)
  const plateia: Pessoa[] = []
  const nP = Math.round(de.plateia * dens)
  for (let t = 0; plateia.length < nP && t < nP * 4; t++) {
    const u = P.u + (r() * 2 - 1) * de.plateiaMeio
    const lat = P.lado * (-1.5 + r() * (MEIA_PISTA - 0.8 + 1.5))
    const p = pessoa(u, lat)
    if (Math.hypot(p.x - P.vaga.x, p.z - P.vaga.z) < 5) continue
    plateia.push(p)
  }
  // os nove: entre os outros, iguais aos outros (só a cor deles, que já é a da multidão)
  NOVE.forEach((n, k) => { const i = Math.floor((plateia.length * (k + 0.5)) / NOVE.length); if (plateia[i]) plateia[i] = { ...plateia[i], cor: n.cor } })
  // o povo: a rua cheia até perto do Núcleo, mais denso perto do palco
  const rua: Pessoa[] = []
  const nR = Math.round(de.povoRua * dens)
  for (let t = 0; rua.length < nR && t < nR * 4; t++) {
    const lado = r() < 0.5 ? -1 : 1
    const u = P.u + lado * Math.pow(r(), 1.5) * 620
    if (u < 8 || u > uMax - 8 || Math.abs(u - P.u) < de.plateiaMeio) continue
    rua.push(pessoa(u, (r() * 2 - 1) * (MEIA_PISTA - 0.8)))
  }

  // o caminho da água na Nectar: do Núcleo ao fim da rua; dali desce no subúrbio e
  // atravessa o deserto até a casa da D-Bee
  const pistaAgua = M.pistas.find((p) => p.nome === "Nectar")!
  const VA = M.vias[pistaAgua.ida]
  const xs: number[] = [], ys: number[] = [], zs: number[] = [], ss: number[] = []
  const por = (x: number, y: number, z: number) => {
    const n = xs.length
    ss.push(n ? ss[n - 1] + Math.hypot(x - xs[n - 1], y - ys[n - 1], z - zs[n - 1]) : 0)
    xs.push(x); ys.push(y); zs.push(z)
  }
  const passo = Math.max(1, Math.round(de.aguaPasso / PASSO))
  for (let i = 0; i < VA.n; i += passo) por(VA.px[i], VA.py[i] + 0.3, VA.pz[i])
  por(VA.px[VA.n - 1], VA.py[VA.n - 1] + 0.3, VA.pz[VA.n - 1])
  const nRua = xs.length
  const bar = CHAO_LUGARES.bar, ate = naCasa(0, 40)
  const nos = [
    { x: lerp(VA.px[VA.n - 1], bar.x, 0.3), z: lerp(VA.pz[VA.n - 1], bar.z, 0.3) },
    { x: bar.x, z: bar.z },
    ate,
  ]
  const trechos = nos.reduce<{ x: number; z: number }[][]>((out, no, k) => { out.push([k === 0 ? { x: xs[nRua - 1], z: zs[nRua - 1] } : nos[k - 1], no]); return out }, [])
  trechos.forEach(([a, b], k) => {
    const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.round(L / 12))
    for (let i = 1; i <= n; i++) {
      const f = i / n, x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f), chao = M.chaoEm(x, z) + 0.3
      por(x, k === 0 ? lerp(ys[nRua - 1], chao, f) : chao, z)
    }
  })
  const caminho = { xs, ys, zs, ss, L: ss[ss.length - 1], n: xs.length }

  // onde aquecer a cidade, ao longo do caminho (e a casa, onde a floresta nasce)
  const aquecer: PontoXZ[] = []
  for (let s = de.aguaDe; s < caminho.L; s += 450) {
    let k = 0
    while (k < caminho.n - 1 && ss[k] < s) k++
    aquecer.push({ x: xs[k], z: zs[k] })
  }
  aquecer.push({ x: CASA.x, z: CASA.z })

  // o palco, do ponto de vista de quem está em cima dele
  const dx = P.vaga.x - P.centro.x, dz = P.vaga.z - P.centro.z, dl = Math.hypot(dx, dz) || 1
  const fx = dx / dl, fz = dz / dl
  const palco = { x: P.centro.x + fx * 3.6, z: P.centro.z + fz * 3.6, y: P.chao + 3.4, fx, fz, olhaX: P.vaga.x + fx * 26, olhaZ: P.vaga.z + fz * 26, olhaY: P.chao + 1.4 }

  return { plateia, rua, caminho, aquecer, palco, centroPalco: { x: P.centro.x, z: P.centro.z } }
}

function FinalVivo({ M }: { M: MundoDisco }) {
  const cena = useMemo(() => montarCena(M), [M])
  const vivo = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  const mo = vivo.momento
  const chaoCasa = useMemo(() => M.chaoEm(CASA.x, CASA.z), [M])
  const anel = useRef<THREE.Mesh>(null)
  const uFrente = useMemo(() => ({ value: 0 }), [])
  const iCam = useRef(0)
  // um ponto no caminho, em `s` metros (sem alocar; o índice anda junto da câmera)
  const noCaminho = (s: number, o: { x: number; y: number; z: number }) => {
    const c = cena.caminho
    let i = Math.min(iCam.current, c.n - 2)
    while (i > 0 && c.ss[i] > s) i--
    while (i < c.n - 2 && c.ss[i + 1] < s) i++
    iCam.current = i
    const f = Math.max(0, Math.min(1, (s - c.ss[i]) / Math.max(1e-3, c.ss[i + 1] - c.ss[i])))
    o.x = lerp(c.xs[i], c.xs[i + 1], f); o.y = lerp(c.ys[i], c.ys[i + 1], f); o.z = lerp(c.zs[i], c.zs[i + 1], f)
  }
  const aq = useMemo(() => ({ a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 0 } }), [])
  const chuvaEscrita = useRef(false)

  useFrame((_, dt) => {
    const mo = FINAL_VIVO.momento
    CAM_ROTEIRO.ativo = mo !== null
    if (mo === null) {
      // só a plateia em volta do palco: a câmera e a chuva são as do jogo
      if (chuvaEscrita.current) { CHUVA_MANIFESTO.k = 0; chuvaEscrita.current = false }
      PERTO_EXTRA.pontos.length = 0
      FLORESTA_FRENTE.uFrente.value = 1e9
      return
    }
    // as câmeras extras do <Perto>: entram aos poucos no povo, inteiras na água, somem depois
    const ex = PERTO_EXTRA.pontos
    const aquecer = cena.aquecer
    const nEx = mo === "povo" ? Math.min(aquecer.length, 1 + Math.floor(((performance.now() / 1000 - FINAL_VIVO.t0) / (FINAL_CFG.povo * 0.85)) * aquecer.length)) : mo === "agua" ? aquecer.length : 0
    if (ex.length !== nEx) { ex.length = 0; for (let k = 0; k < nEx; k++) ex.push(aquecer[k]) }
    const t = performance.now() / 1000 - FINAL_VIVO.t0
    const C = CAM_ROTEIRO, p = cena.palco, s0 = FINAL_CFG.aguaDe, L = cena.caminho.L
    let chuvaAlvo = 0
    if (mo === "palco") {
      // de cima do palco, olhando a plateia; balança de leve
      const b = Math.sin(t * 0.5) * 0.25
      C.px = p.x; C.py = p.y + b * 0.3; C.pz = p.z
      C.ox = p.olhaX + p.fz * b * 2; C.oy = p.olhaY; C.oz = p.olhaZ - p.fx * b * 2
      if (anel.current) { anel.current.scale.setScalar(1 + Math.sin(t * 3.2) * 0.12); anel.current.lookAt(C.px, C.py, C.pz) }
    } else if (mo === "povo") {
      // sobe e volta pela rua, com o Núcleo no fundo
      const k = suave(t / FINAL_CFG.povo)
      noCaminho(s0, aq.a)
      C.px = lerp(p.x, aq.a.x, k); C.py = lerp(p.y, aq.a.y + 30, k); C.pz = lerp(p.z, aq.a.z, k)
      C.ox = lerp(p.olhaX, M.central.x, k); C.oy = lerp(p.olhaY, (M.central.topo || 160) * 0.55, k); C.oz = lerp(p.olhaZ, M.central.z, k)
      // na segunda metade a água já sai do Núcleo e vem pela rua, na direção da câmera
      uFrente.value = s0 * suave((t - FINAL_CFG.povo * 0.55) / (FINAL_CFG.povo * 0.45))
    } else if (mo === "agua") {
      // a frente da água corre; a câmera vem atrás, olhando pra onde ela vai
      const f = s0 + (L - s0) * suave(t / FINAL_CFG.agua)
      uFrente.value = f
      noCaminho(Math.max(0, f - FINAL_CFG.camAtras), aq.a)
      noCaminho(Math.min(L, f + 20), aq.b)
      C.px = aq.a.x; C.py = aq.a.y + lerp(30, 14, suave((f - s0) / (L - s0))); C.pz = aq.a.z
      C.ox = aq.b.x; C.oy = aq.b.y; C.oz = aq.b.z
    } else if (mo === "chuva") {
      // a água chegou na casa: a chuva cai de verdade; olha pro céu aos poucos
      uFrente.value = 1e9
      const k = suave(t / FINAL_CFG.chuva), de = naCasa(10, 74), ate = naCasa(-6, 52)
      C.px = lerp(de.x, ate.x, k); C.pz = lerp(de.z, ate.z, k); C.py = chaoCasa + 5
      C.ox = CASA.x; C.oy = chaoCasa + 4 + 26 * k; C.oz = CASA.z
      chuvaAlvo = FINAL_CFG.chuvaMax * suave(t / (FINAL_CFG.chuva * 0.5))
    } else if (mo === "floresta") {
      // sobe devagar em volta da casa: a frente verde abre pra longe
      uFrente.value = 1e9
      const k = suave(t / FINAL_CFG.floresta), a = ROT_CASA + 0.8 + t * 0.05, r = 70 + 270 * k
      C.px = CASA.x + Math.sin(a) * r; C.pz = CASA.z + Math.cos(a) * r; C.py = chaoCasa + 6 + 90 * k
      C.ox = CASA.x; C.oy = chaoCasa + 4; C.oz = CASA.z
      chuvaAlvo = FINAL_CFG.chuvaFloresta * (1 - suave((t - FINAL_CFG.floresta * 0.6) / (FINAL_CFG.floresta * 0.4)))
      const raio = Math.max(0, t) * FINAL_CFG.florestaVel
      FLORESTA_FRENTE.uFrente.value = raio
      AREIA_VERDE.value = raio
    }
    // a câmera nunca entra no chão do deserto
    C.py = Math.max(C.py, M.chaoEm(C.px, C.pz) + 1.2)
    // a chuva chega e vai embora devagar (a mesma do jogo: manifestos/ceu.ts)
    CHUVA_MANIFESTO.k += (chuvaAlvo - CHUVA_MANIFESTO.k) * Math.min(1, dt * 0.8)
    chuvaEscrita.current = true
    // as plantas ainda não nasceram enquanto a água não chegou
    if (mo !== "floresta") { FLORESTA_FRENTE.uFrente.value = -1; if (!FINAL_VIVO.feito) AREIA_VERDE.value = 0 }
  })
  // saiu do jogo no meio do final: a câmera e a chuva voltam a ser do jogo
  useEffect(() => () => {
    CAM_ROTEIRO.ativo = false
    PERTO_EXTRA.pontos.length = 0
    if (chuvaEscrita.current) CHUVA_MANIFESTO.k = 0
    FLORESTA_FRENTE.uFrente.value = 1e9
  }, [])

  const comPovo = mo === "povo"
  const comPlateia = vivo.lotado || mo === "palco" || mo === "povo"
  const comAgua = mo === "povo" || mo === "agua" || mo === "chuva" || mo === "floresta"
  const pontos = useMemo(() => [cena.centroPalco], [cena])
  return (
    <>
      {comPlateia && (
        <Perto nome="final-plateia" raio={420} pontos={pontos}>
          <ModeloSeguro nome="final-multidao" enquanto={null}>
            <FinalMultidao gente={cena.plateia} />
          </ModeloSeguro>
        </Perto>
      )}
      {comPovo && (
        <ModeloSeguro nome="final-povo" enquanto={null}>
          <FinalMultidao gente={cena.rua} />
        </ModeloSeguro>
      )}
      {mo === "palco" && (
        <mesh ref={anel} position={[cena.palco.x + cena.palco.fx * 3.2, cena.palco.y - 1.1, cena.palco.z + cena.palco.fz * 3.2]}>
          <ringGeometry args={[0.32, 0.36, 40]} />
          <meshBasicMaterial color="#e0ff4f" transparent opacity={0.8} toneMapped={false} depthTest={false} />
        </mesh>
      )}
      {comAgua && <Agua M={M} caminho={cena.caminho} uFrente={uFrente} />}
    </>
  )
}

// ── a água: as fitas nas nove pistas (saindo do Núcleo) e o caminho até a casa ──
function Agua({ M, caminho, uFrente }: { M: MundoDisco; caminho: { xs: number[]; ys: number[]; zs: number[]; ss: number[]; n: number }; uFrente: { value: number } }) {
  const r = useMemo(() => {
    const partes: THREE.BufferGeometry[] = []
    const W = FINAL_CFG.aguaMeia, onda = FINAL_CFG.aguaOnda
    const fita = (n: number, pt: (j: number) => { x: number; y: number; z: number; lx: number; lz: number; ly: number; s: number }) => {
      const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), s = new Float32Array(n * 2), idx: number[] = []
      for (let j = 0; j < n; j++) {
        const q = pt(j)
        pos.set([q.x + q.lx * W, q.y + q.ly * W, q.z + q.lz * W, q.x - q.lx * W, q.y - q.ly * W, q.z - q.lz * W], j * 6)
        uv.set([0, q.s / onda, 1, q.s / onda], j * 4)
        s[j * 2] = q.s; s[j * 2 + 1] = q.s
        if (j > 0) { const b = (j - 1) * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3) }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3))
      g.setAttribute("uv", new THREE.BufferAttribute(uv, 2))
      g.setAttribute("aS", new THREE.BufferAttribute(s, 1))
      g.setIndex(idx)
      partes.push(g)
    }
    // cada pista, a partir da ponta mais perto do Núcleo
    const passo = Math.max(1, Math.round(FINAL_CFG.aguaPasso / PASSO))
    for (const p of M.pistas) {
      const V = M.vias[p.ida]
      const ini = Math.hypot(V.px[0] - M.central.x, V.pz[0] - M.central.z), fim = Math.hypot(V.px[V.n - 1] - M.central.x, V.pz[V.n - 1] - M.central.z)
      const inv = fim < ini
      const n = Math.floor((V.n - 1) / passo) + 1
      fita(n, (j) => {
        const i = inv ? V.n - 1 - j * passo : j * passo
        const c = Math.cos(V.bank[i]), b = Math.sin(V.bank[i])
        return { x: V.px[i], y: V.py[i] + 0.3, z: V.pz[i], lx: -V.tz[i] * c, ly: -b, lz: V.tx[i] * c, s: j * passo * PASSO }
      })
    }
    // do fim da Nectar até a casa (o último trecho do caminho da câmera, a partir do fim da rua)
    const c = caminho, nectar = M.vias[M.pistas.find((p) => p.nome === "Nectar")!.ida]
    let k0 = 0
    while (k0 < c.n - 1 && c.ss[k0] < (nectar.n - 1) * PASSO) k0++
    fita(c.n - k0, (j) => {
      const k = k0 + j, a = Math.max(k0, k - 1), b = Math.min(c.n - 1, k + 1)
      const dx = c.xs[b] - c.xs[a], dz = c.zs[b] - c.zs[a], l = Math.hypot(dx, dz) || 1
      return { x: c.xs[k], y: c.ys[k], z: c.zs[k], lx: -dz / l, ly: 0, lz: dx / l, s: c.ss[k] }
    })
    const geo = mergeGeometries(partes, false)!
    for (const g of partes) g.dispose()
    const tex = texturaDeAgua()
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: "#8fe6ff", transparent: true, opacity: 0.68, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uFrente = uFrente
      sh.vertexShader = "attribute float aS;\nvarying float vS;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n  vS = aS;")
      sh.fragmentShader = "uniform float uFrente;\nvarying float vS;\n" + sh.fragmentShader.replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\n  if (vS > uFrente) discard;")
    }
    mat.customProgramCacheKey = () => "agua-do-final"
    return { geo, mat, tex }
  }, [M, caminho, uFrente])
  useEffect(() => () => { r.geo.dispose(); r.mat.dispose(); r.tex.dispose() }, [r])
  useFrame((_, dt) => { r.tex.offset.y = (r.tex.offset.y - Math.min(dt, 0.1) * (FINAL_CFG.aguaVel / FINAL_CFG.aguaOnda)) % 1 })
  return <mesh geometry={r.geo} material={r.mat} matrixAutoUpdate={false} frustumCulled={false} renderOrder={1} />
}
