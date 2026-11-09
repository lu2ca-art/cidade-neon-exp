"use client"

// O SUBÚRBIO NO CHÃO (LU2CA 21/10, B18): embaixo das pistas, na altura do
// lixão, os lugares da gente que ficou: o bar (missão 1), a oficina (missão
// 2) e o palco do subúrbio (os shows das missões que acontecem aqui). Uma
// fachada baixa com o letreiro em neon e, quando é pra lá que a história
// manda, uma coluna de luz que se vê de longe.
// (T57, o dono 28/10: "as coisas acontecem no mundo, de verdade; nada de
// estabelecimento com placa") a QUADRA e os TÚNEIS deixaram de ser fachada: a
// quadra é um piso com as linhas, as cestas e o alambrado; os túneis, uma boca
// no chão (a rampa desce até a porta escura com o neon dentro). E o lixo da
// reciclagem fica espalhado no lixão, pra pegar passando. Tudo em poucos
// desenhos (geometrias juntadas, sem luz própria).

import { useGLTF } from "@react-three/drei"
import { ModeloSeguro } from "../estrada/Seguro"
import { lazy, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { BOCA, QUADRA, geoBoca } from "../estrada/chao"
import { materialAreia } from "../estrada/areia"
import { PECAS_CHAO, chaoAtivos, ehPeca, ouvirChaoAtivos, type PecaChao } from "./achados"
import { CHAO_ABERTOS, CHAO_FIXOS, CHAO_LUGARES, SUBURBIO, type LugarChao } from "./historia"

// (09/11, ep. 5) a feira: só baixa quando chega perto (o <Perto> já tem Suspense)
const FeiraRua = lazy(() => import("./FeiraRua").then((m) => ({ default: m.FeiraRua })))

function texLetreiro(txt: string, cor: string) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128
  const g = c.getContext("2d")!
  g.fillStyle = "#07060c"; g.fillRect(0, 0, 512, 128)
  g.font = "800 84px ui-monospace, monospace"; g.textAlign = "center"; g.textBaseline = "middle"
  g.shadowColor = cor; g.shadowBlur = 24; g.fillStyle = cor
  g.fillText(txt, 256, 68)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

function Fachada({ id, chao, alvo }: { id: LugarChao; chao: (x: number, z: number) => number; alvo: boolean }) {
  const l = CHAO_LUGARES[id]
  const y = useMemo(() => chao(l.x, l.z), [chao, l.x, l.z])
  // a porta vira pro centro da cidade (por onde a Kombi chega, embaixo das pistas)
  const rot = Math.atan2(-l.x, -l.z)
  const mats = useMemo(() => ({
    parede: new THREE.MeshStandardMaterial({ color: id === "oficina" ? "#3a3440" : "#2a2230", roughness: 0.85 }),
    letreiro: new THREE.MeshBasicMaterial({ map: texLetreiro(l.nome, l.cor), toneMapped: false }),
    luz: new THREE.MeshBasicMaterial({ color: l.cor, toneMapped: false }),
    porta: new THREE.MeshBasicMaterial({ color: "#ffcf8a", toneMapped: false }),
    farol: new THREE.MeshBasicMaterial({ color: l.cor, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  }), [id, l.nome, l.cor])
  const larg = id === "palco" ? 14 : 12
  return (
    <group position={[l.x, y - 0.3, l.z]} rotation={[0, rot, 0]}>
      {id === "palco" ? (
        <>
          {/* o palco ao ar livre: o tablado, duas torres de luz e o letreiro em cima */}
          <mesh position={[0, 0.6, 0]} material={mats.parede}><boxGeometry args={[larg, 1.2, 8]} /></mesh>
          <mesh position={[0, 1.22, 4.01]} material={mats.luz}><boxGeometry args={[larg, 0.06, 0.04]} /></mesh>
          {[-1, 1].map((k) => <mesh key={k} position={[k * (larg / 2 - 0.5), 4, -3.4]} material={mats.parede}><boxGeometry args={[0.5, 8, 0.5]} /></mesh>)}
          <mesh position={[0, 8.2, -3.4]} material={mats.letreiro}><planeGeometry args={[8, 2]} /></mesh>
        </>
      ) : (
        <>
          <mesh position={[0, 3, 0]} material={mats.parede}><boxGeometry args={[larg, 6, 9]} /></mesh>
          <mesh position={[0, 6.6, 4.6]} material={mats.letreiro}><planeGeometry args={[8, 2]} /></mesh>
          <mesh position={[0, 2, 4.52]} material={mats.porta}><planeGeometry args={[id === "oficina" ? 6 : 1.6, id === "oficina" ? 3.6 : 2.6]} /></mesh>
          <mesh position={[0, 0.06, 4.55]} material={mats.luz}><boxGeometry args={[larg, 0.08, 0.06]} /></mesh>
        </>
      )}
      {alvo && <mesh position={[0, 70, 0]} material={mats.farol}><cylinderGeometry args={[2.4, 3.6, 140, 10, 1, true]} /></mesh>}
    </group>
  )
}

// ── um pedaço juntado: várias caixas/cilindros, cada um com a sua cor, num desenho só ──
type Peca3 = { g: THREE.BufferGeometry; cor?: string; p?: [number, number, number]; r?: [number, number, number] }
const _o = new THREE.Object3D()
function juntar(pecas: Peca3[], uv = false) {
  const gs = pecas.map(({ g, cor, p = [0, 0, 0], r = [0, 0, 0] }) => {
    _o.position.set(...p); _o.rotation.set(...r); _o.updateMatrix()
    const n = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(_o.matrix)
    for (const k of Object.keys(n.attributes)) if (!["position", "normal", ...(uv ? ["uv"] : [])].includes(k)) n.deleteAttribute(k)
    if (cor) {
      const c = new THREE.Color(cor), a = new Float32Array(n.attributes.position.count * 3)
      for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b }
      n.setAttribute("color", new THREE.BufferAttribute(a, 3))
    }
    g.dispose()
    return n
  })
  return mergeGeometries(gs, false)!
}
const caixa = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const cil = (r0: number, r1: number, h: number, n = 10) => new THREE.CylinderGeometry(r0, r1, h, n)

// a coluna de luz (o alvo) e o farol do chão
function Farol({ cor, y = 70 }: { cor: string; y?: number }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), [cor])
  return <mesh position={[0, y, 0]} material={mat}><cylinderGeometry args={[2.4, 3.6, 140, 10, 1, true]} /></mesh>
}

// ── A BOCA DO TÚNEL: a rampa (o chão mesmo: estrada/chao.ts, geoBoca), os muros
// de arrimo, a porta de concreto e, dentro, o escuro com o neon das trincheiras
// e a luz lá no fim. 5 desenhos ──
const COR_TUNEL = CHAO_LUGARES.tuneis.cor
function BocaTunel({ chao, alvo }: { chao: (x: number, z: number) => number; alvo: boolean }) {
  const d = useMemo(() => {
    const yFundo = chao(BOCA.x, BOCA.z)
    const yTopo = yFundo + BOCA.fundo
    const M = BOCA.meia, A = 5.2, LA = 4.6 // a porta: 5,2 m de alto, 9,2 de largo
    const fundoT = 26 // o túnel entra 26 m (some embaixo do chão)
    const alto = yTopo + 0.6 - (yFundo - 0.6) // o muro: do fundo até 0,6 m acima do chão
    const concreto = juntar([
      // os muros de arrimo dos dois lados da rampa
      ...[-1, 1].map((k): Peca3 => ({ g: caixa(0.6, alto, BOCA.comp + 1), p: [k * (M + 0.3), (yFundo - 0.6 + yTopo + 0.6) / 2 - yFundo, -BOCA.comp / 2] })),
      // a testa da porta: os dois pilares e a viga em cima
      ...[-1, 1].map((k): Peca3 => ({ g: caixa(M + 1.6 - LA, BOCA.fundo + 3.4, 1.4), p: [k * (LA + (M + 1.6 - LA) / 2), (BOCA.fundo + 3.4) / 2 - 0.6, 0.5] })),
      { g: caixa(LA * 2, BOCA.fundo + 2.8 - A, 1.4), p: [0, A + (BOCA.fundo + 2.8 - A) / 2, 0.5] },
      // a mureta em cima da testa (o chão de cima continua por trás)
      { g: caixa((M + 1.6) * 2, 0.5, 2.4), p: [0, BOCA.fundo + 2.55, 1.2] },
    ])
    // o neon: as bordas dos muros, o contorno da porta, as faixas e os anéis lá dentro
    const neon: Peca3[] = [
      ...[-1, 1].map((k): Peca3 => ({ g: caixa(0.12, 0.12, BOCA.comp + 1), p: [k * (M + 0.3), BOCA.fundo + 0.62, -BOCA.comp / 2] })),
      ...[-1, 1].map((k): Peca3 => ({ g: caixa(0.16, A, 0.16), p: [k * LA, A / 2, -0.25] })),
      { g: caixa(LA * 2 + 0.16, 0.16, 0.16), p: [0, A, -0.25] },
      ...[-1, 1].flatMap((k): Peca3[] => [
        { g: caixa(0.1, 0.1, fundoT), p: [k * (LA - 0.15), A - 0.15, fundoT / 2 + 1] },
        { g: caixa(0.08, 0.08, fundoT), p: [k * (LA - 0.1), 0.12, fundoT / 2 + 1] },
      ]),
      ...[5, 11, 17, 23].flatMap((z): Peca3[] => [
        { g: caixa(LA * 2, 0.1, 0.1), p: [0, A - 0.08, z] },
        ...[-1, 1].map((k): Peca3 => ({ g: caixa(0.1, A, 0.1), p: [k * (LA - 0.06), A / 2, z] })),
      ]),
    ]
    return {
      y: yFundo, rot: Math.atan2(BOCA.ax, BOCA.az), A, LA, fundoT,
      patch: geoBoca(),
      concreto, neon: juntar(neon),
      mats: {
        chao: materialAreia({ vertexColors: true, mascara: true }), // (T39) a mesma areia do chão
        concreto: new THREE.MeshStandardMaterial({ color: "#4a4652", roughness: 0.9, emissive: "#1a1622", emissiveIntensity: 0.6 }),
        neon: new THREE.MeshBasicMaterial({ color: COR_TUNEL, toneMapped: false }),
        // dentro: o escuro (só as faces de dentro; a de fora, na porta, some)
        dentro: new THREE.MeshBasicMaterial({ color: "#0d0a16", side: THREE.BackSide }),
        fim: new THREE.MeshBasicMaterial({ color: "#ffb36b", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      },
    }
  }, [chao])
  return (
    <>
      {/* a rampa: o chão do subúrbio com a vala (mesma cor do chão em volta) */}
      <mesh geometry={d.patch} material={d.mats.chao} />
      <group position={[BOCA.x, d.y, BOCA.z]} rotation={[0, d.rot, 0]}>
        <mesh geometry={d.concreto} material={d.mats.concreto} />
        <mesh geometry={d.neon} material={d.mats.neon} />
        <mesh position={[0, d.A / 2, 0.6 + d.fundoT / 2]} material={d.mats.dentro}><boxGeometry args={[d.LA * 2, d.A, d.fundoT]} /></mesh>
        {/* a luz lá no fim (o sol das trincheiras passando pelo vidro) */}
        <mesh position={[0, d.A / 2, d.fundoT - 0.5]} rotation={[0, Math.PI, 0]} material={d.mats.fim}><planeGeometry args={[d.LA * 1.4, d.A * 0.7]} /></mesh>
        {alvo && <Farol cor={COR_TUNEL} />}
      </group>
    </>
  )
}

// a quadra pintada (o piso, as linhas, o garrafão laranja)
function texQuadra() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 480
  const g = c.getContext("2d")!, k = 480 / 28 // px por metro (28 × 15)
  g.fillStyle = "#24324a"; g.fillRect(0, 0, 256, 480)
  g.fillStyle = "#3a2a2e"
  for (const y of [0, 480 - 5.8 * k]) g.fillRect(128 - 2.45 * k, y, 4.9 * k, 5.8 * k)
  g.strokeStyle = "#e9edf6"; g.lineWidth = 3
  g.strokeRect(4, 4, 248, 472)
  g.beginPath(); g.moveTo(4, 240); g.lineTo(252, 240); g.stroke()
  g.beginPath(); g.arc(128, 240, 1.8 * k, 0, Math.PI * 2); g.stroke()
  for (const [y, dir] of [[1.575 * k, 1], [480 - 1.575 * k, -1]] as const) {
    g.strokeRect(128 - 2.45 * k, dir > 0 ? 4 : 480 - 5.8 * k, 4.9 * k, 5.8 * k - 4)
    g.beginPath(); g.arc(128, y, 6.75 * k, dir > 0 ? 0.12 : Math.PI + 0.12, dir > 0 ? Math.PI - 0.12 : Math.PI * 2 - 0.12); g.stroke()
    g.beginPath(); g.arc(128, y + dir * 4.225 * k, 1.8 * k, dir > 0 ? 0 : Math.PI, dir > 0 ? Math.PI : Math.PI * 2); g.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
// o alambrado: a tela em losango (transparente)
function texAlambrado() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64
  const g = c.getContext("2d")!
  g.strokeStyle = "#c9d0dc"; g.lineWidth = 3
  g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke()
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

// ── A QUADRA DO ALOHAN: o piso de cimento (o chão assenta nele: estrada/chao.ts),
// as linhas, as duas cestas, o alambrado com a entrada virada pro subúrbio e dois
// postes de luz. 5 desenhos ──
const COR_QUADRA = CHAO_LUGARES.quadra.cor
function Quadra({ chao, alvo }: { chao: (x: number, z: number) => number; alvo: boolean }) {
  const d = useMemo(() => {
    const topo = chao(QUADRA.x, QUADRA.z)
    const X = 10.4, Z = 16.9, H = 3.6 // o alambrado: em volta do piso, 3,6 m
    const ferro: Peca3[] = []
    const tela: Peca3[] = []
    // os lados do alambrado (o -x olha pro subúrbio: ali fica a entrada, 9 m)
    const lado = (x0: number, z0: number, x1: number, z1: number) => {
      const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0)
      const pl = new THREE.PlaneGeometry(L, H), uv = pl.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L / 0.9, uv.getY(i) * H / 0.9)
      tela.push({ g: pl, p: [(x0 + x1) / 2, H / 2, (z0 + z1) / 2], r: [0, ang - Math.PI / 2, 0] })
      ferro.push({ g: caixa(0.06, 0.06, L), cor: "#6a7080", p: [(x0 + x1) / 2, H, (z0 + z1) / 2], r: [0, ang, 0] })
      const n = Math.max(1, Math.round(L / 3.5))
      for (let i = 0; i <= n; i++) ferro.push({ g: cil(0.05, 0.05, H, 6), cor: "#6a7080", p: [x0 + ((x1 - x0) * i) / n, H / 2, z0 + ((z1 - z0) * i) / n] })
    }
    lado(X, -Z, X, Z); lado(-X, Z, X, Z); lado(-X, -Z, X, -Z)
    lado(-X, -Z, -X, -4.5); lado(-X, 4.5, -X, Z)
    // as cestas: o poste atrás da linha de fundo, o braço, a tabela e o aro
    const brilho: Peca3[] = []
    for (const k of [-1, 1]) {
      ferro.push({ g: caixa(0.22, 3.6, 0.22), cor: "#3b4252", p: [0, 1.8, k * 15.3] })
      ferro.push({ g: caixa(0.14, 0.14, 1.7), cor: "#3b4252", p: [0, 3.5, k * 14.5] })
      ferro.push({ g: caixa(1.8, 1.05, 0.06), cor: "#e9edf6", p: [0, 3.45, k * 13.65] })
      ferro.push({ g: caixa(0.6, 0.45, 0.07), cor: "#ff6a35", p: [0, 3.3, k * 13.64] })
      brilho.push({ g: new THREE.TorusGeometry(0.23, 0.022, 6, 16), cor: "#ff6a35", p: [0, 3.05, k * 13.37], r: [Math.PI / 2, 0, 0] })
    }
    // dois postes de luz nas quinas do fundo (a lâmpada acesa)
    for (const k of [-1, 1]) {
      ferro.push({ g: cil(0.1, 0.14, 9, 6), cor: "#3b4252", p: [X + 0.6, 4.5, k * Z] })
      ferro.push({ g: caixa(1.4, 0.12, 0.12), cor: "#3b4252", p: [X - 0.1, 9, k * Z] })
      brilho.push({ g: caixa(0.9, 0.18, 0.5), cor: "#fff1c4", p: [X - 0.6, 8.88, k * Z] })
    }
    const alambrado = texAlambrado()
    return {
      topo,
      ferro: juntar(ferro), tela: juntar(tela, true), brilho: juntar(brilho),
      mats: {
        piso: new THREE.MeshStandardMaterial({ color: "#3b3f4a", roughness: 0.92, emissive: "#14161c", emissiveIntensity: 0.6 }),
        linhas: new THREE.MeshBasicMaterial({ map: texQuadra(), toneMapped: false, color: "#9aa4b8" }),
        ferro: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4, emissive: "#20232c", emissiveIntensity: 0.6 }),
        tela: new THREE.MeshBasicMaterial({ map: alambrado, alphaMap: alambrado, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: "#8a93a8", depthWrite: false }),
        brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      },
    }
  }, [chao])
  return (
    <group position={[QUADRA.x, d.topo, QUADRA.z]} rotation={[0, QUADRA.rot, 0]}>
      <mesh position={[0, -0.8, 0]} material={d.mats.piso}><boxGeometry args={[QUADRA.larg, 1.6, QUADRA.comp]} /></mesh>
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={d.mats.linhas}><planeGeometry args={[15, 28]} /></mesh>
      <mesh geometry={d.ferro} material={d.mats.ferro} />
      <mesh geometry={d.tela} material={d.mats.tela} />
      <mesh geometry={d.brilho} material={d.mats.brilho} />
      {alvo && <Farol cor={COR_QUADRA} />}
    </group>
  )
}

// ── O LIXO DA RECICLAGEM (T57): espalhado no lixão; pega passando (Corrida,
// disco/achados.ts). Cada um é um desenho só (as cores no vértice), 1,8× o
// tamanho de verdade pra achar de longe; a coluna de luz e um anel no chão em
// cada um que falta ──
function modeloPeca(id: PecaChao) {
  if (id === "painel") return juntar([
    { g: caixa(3.2, 0.12, 2), cor: "#2a5aa8", p: [0, 0.5, 0], r: [-0.5, 0.4, 0.15] },
    { g: caixa(2.4, 0.7, 1.6), cor: "#5a4a3a", p: [1.2, 0.35, 0.9], r: [0.2, 0.8, 0.3] },
    { g: caixa(1.6, 0.5, 1.2), cor: "#8a93b8", p: [-1.4, 0.3, -0.6], r: [0.1, -0.5, -0.2] },
  ])
  if (id === "lavadora") return juntar([
    { g: caixa(0.85, 0.9, 0.65), cor: "#d9dee8", p: [0, 0.33, 0], r: [0, 0.3, Math.PI / 2 - 0.15] },
    { g: cil(0.28, 0.28, 0.06, 16), cor: "#2a4a6b", p: [-0.02, 0.38, 0.33], r: [Math.PI / 2, 0, 0] },
    { g: caixa(0.5, 0.3, 0.4), cor: "#5a4a3a", p: [0.7, 0.15, -0.3], r: [0.2, 0.6, 0.1] },
  ])
  if (id === "ventilador") return juntar([
    { g: cil(0.3, 0.32, 0.06, 14), cor: "#3a3440", p: [-0.55, 0.15, 0], r: [0, 0, Math.PI / 2 - 0.2] },
    { g: cil(0.03, 0.03, 1.1, 6), cor: "#8a93b8", p: [0, 0.12, 0], r: [0, 0, Math.PI / 2] },
    { g: cil(0.13, 0.13, 0.22, 10), cor: "#4fc3ff", p: [0.55, 0.32, 0], r: [0, 0, Math.PI / 2] },
    { g: new THREE.TorusGeometry(0.42, 0.025, 6, 20), cor: "#c9d3e6", p: [0.7, 0.42, 0], r: [0, Math.PI / 2, 0] },
    ...[0, 1, 2].map((i): Peca3 => ({ g: caixa(0.02, 0.32, 0.12), cor: "#4fc3ff", p: [0.7, 0.42 + Math.cos((i * Math.PI * 2) / 3) * 0.2, Math.sin((i * Math.PI * 2) / 3) * 0.2], r: [(i * Math.PI * 2) / 3, 0, 0] })),
  ])
  return juntar([
    { g: caixa(0.7, 0.4, 0.22), cor: "#7a3b1f", p: [0, 0.2, 0], r: [0, 0.5, -0.2] },
    { g: caixa(0.36, 0.26, 0.03), cor: "#1a1418", p: [-0.08, 0.2, 0.11], r: [0, 0.5, -0.2] },
    { g: cil(0.012, 0.012, 0.9, 4), cor: "#c9d3e6", p: [0.25, 0.75, -0.05], r: [0.3, 0, -0.5] },
    { g: cil(0.05, 0.05, 0.04, 8), cor: "#ff6a35", p: [0.22, 0.26, 0.14], r: [Math.PI / 2, 0, 0] },
  ])
}
const assinar = (f: () => void) => ouvirChaoAtivos(f)
const VAZIO: readonly LugarChao[] = []
function LixoNoLixao({ chao }: { chao: (x: number, z: number) => number }) {
  const ativos = useSyncExternalStore(assinar, chaoAtivos, () => VAZIO)
  const pecas = useMemo(() => ativos.filter(ehPeca), [ativos])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.2, emissive: "#3a3446", emissiveIntensity: 0.7 }), [])
  const modelos = useMemo(() => Object.fromEntries(PECAS_CHAO.map((id) => [id, modeloPeca(id)])) as Record<PecaChao, THREE.BufferGeometry>, [])
  // os faróis e os anéis no chão de todas as que faltam: um desenho só
  const luz = useMemo(() => {
    if (!pecas.length) return null
    return juntar(pecas.flatMap((id): Peca3[] => {
      const l = CHAO_LUGARES[id], y = chao(l.x, l.z)
      const tubo = new THREE.CylinderGeometry(1.6, 2.6, 140, 10, 1, true)
      const anel = new THREE.RingGeometry(3.2, 3.8, 24)
      return [{ g: tubo, cor: l.cor, p: [l.x, y + 70, l.z] }, { g: anel, cor: l.cor, p: [l.x, y + 0.15, l.z], r: [-Math.PI / 2, 0, 0] }]
    }))
  }, [pecas, chao])
  const matLuz = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), [])
  if (!pecas.length) return null
  return (
    <>
      {pecas.map((id) => {
        const l = CHAO_LUGARES[id]
        return <mesh key={id} geometry={modelos[id]} material={mat} position={[l.x, chao(l.x, l.z), l.z]} scale={1.8} name={`peca-${id}`} />
      })}
      {luz && <mesh geometry={luz} material={matLuz} />}
    </>
  )
}

// (T09) a goteira: um cano que pinga de debaixo da pista num tambor. Só existe
// na cena quando é a vez dela (4 objetos simples, sem luz própria)
function Goteira({ chao }: { chao: (x: number, z: number) => number }) {
  const l = CHAO_LUGARES.goteira
  const y = useMemo(() => chao(l.x, l.z), [chao, l.x, l.z])
  const mats = useMemo(() => ({
    sujo: new THREE.MeshStandardMaterial({ color: "#5a4a3a", roughness: 0.95 }),
    metal: new THREE.MeshStandardMaterial({ color: "#8a93b8", roughness: 0.5, metalness: 0.6 }),
    agua: new THREE.MeshBasicMaterial({ color: "#4fc3ff", toneMapped: false }),
  }), [])
  return (
    <group position={[l.x, y, l.z]}>
      {/* o cano desce de debaixo da pista, entorta e pinga num tambor */}
      <mesh position={[0, 9, 0]} material={mats.metal}><cylinderGeometry args={[0.35, 0.35, 14, 8]} /></mesh>
      <mesh position={[0.6, 2.1, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.metal}><cylinderGeometry args={[0.3, 0.3, 1.4, 8]} /></mesh>
      <mesh position={[1.3, 0.6, 0]} material={mats.sujo}><cylinderGeometry args={[0.7, 0.6, 1.2, 10]} /></mesh>
      <mesh position={[1.3, 1.6, 0]} material={mats.agua}><sphereGeometry args={[0.12, 6, 4]} /></mesh>
      <Farol cor={l.cor} />
    </group>
  )
}


// ── (06/11) OS LUGARES QUE ABREM UMA EXPERIÊNCIA (disco/abertos.ts): o ginásio,
// a galeria, os discos, o estúdio do beat, as flores e o brechó. Uma fachada
// baixa e simples por lugar, com um detalhe que diz o que é (o telhado em arco
// do ginásio, os quadros da galeria, o vinil gigante, as caixas de som, os
// canteiros, a arara de roupa). TODOS juntos em 3 desenhos: as paredes (cor no
// vértice), o neon (cor no vértice, sem luz) e os letreiros (um atlas só).
// Montados uma vez; nada por quadro. A porta vira pro meio do subúrbio ──
type Aberto = (typeof CHAO_ABERTOS)[number]
function detalhe(id: Aberto, cor: string): { solido: Peca3[]; neon: Peca3[] } {
  const solido: Peca3[] = [], neon: Peca3[] = []
  if (id === "ginasio") {
    // o telhado em arco ao longo do prédio
    solido.push({ g: new THREE.CylinderGeometry(6, 6, 9, 12, 1, false, -Math.PI / 2, Math.PI), cor: "#4a4258", p: [0, 6, 0], r: [-Math.PI / 2, 0, 0] })
    neon.push({ g: new THREE.TorusGeometry(6.05, 0.08, 4, 16, Math.PI), cor, p: [0, 6, 4.55] })
  } else if (id === "galeria") {
    // três quadros na fachada
    for (const [k, c] of [[-4, "#ff3fb0"], [4, "#5dffa0"]] as const) {
      solido.push({ g: caixa(2.2, 2.8, 0.12), cor: "#e9e3d5", p: [k, 3, 4.56] })
      neon.push({ g: caixa(1.8, 2.4, 0.06), cor: c, p: [k, 3, 4.64] })
    }
  } else if (id === "discos") {
    // o vinil gigante em pé no telhado
    solido.push({ g: cil(3.2, 3.2, 0.3, 24), cor: "#0d0b12", p: [0, 9.4, 0], r: [Math.PI / 2, 0, 0] })
    neon.push({ g: cil(1, 1, 0.34, 16), cor, p: [0, 9.4, 0], r: [Math.PI / 2, 0, 0] })
    neon.push({ g: new THREE.TorusGeometry(2.6, 0.05, 4, 24), cor: "#ffffff", p: [0, 9.4, 0.18] })
  } else if (id === "batida") {
    // as duas caixas de som do lado da porta
    for (const k of [-1, 1]) {
      solido.push({ g: caixa(2, 3.6, 1.6), cor: "#16141c", p: [k * 4.2, 1.8, 5.3] })
      neon.push({ g: new THREE.TorusGeometry(0.6, 0.08, 4, 14), cor, p: [k * 4.2, 1.2, 6.12] })
      neon.push({ g: new THREE.TorusGeometry(0.35, 0.06, 4, 12), cor, p: [k * 4.2, 2.7, 6.12] })
    }
  } else if (id === "flores") {
    // os canteiros na frente, floridos
    for (const k of [-1, 1]) {
      solido.push({ g: caixa(3.6, 0.8, 1.4), cor: "#5a4a3a", p: [k * 4, 0.4, 6.2] })
      solido.push({ g: caixa(3.4, 0.5, 1.2), cor: "#2f6a3a", p: [k * 4, 1, 6.2] })
      for (let i = 0; i < 4; i++) neon.push({ g: caixa(0.36, 0.36, 0.36), cor: ["#ff3fb0", "#ffc857", "#5dffa0", "#ff6a35"][i], p: [k * 4 - 1.2 + i * 0.8, 1.45, 6.2 + (i % 2 ? 0.3 : -0.3)] })
    }
  } else {
    // o brechó: a arara na calçada, com as peças penduradas
    for (const k of [-1, 1]) solido.push({ g: cil(0.05, 0.05, 2.2, 6), cor: "#8a93a8", p: [k * 3, 1.1, 6.4] })
    solido.push({ g: cil(0.04, 0.04, 6.2, 6), cor: "#8a93a8", p: [0, 2.15, 6.4], r: [0, 0, Math.PI / 2] })
    for (let i = 0; i < 6; i++) solido.push({ g: caixa(0.8, 1.2, 0.12), cor: ["#ff3fb0", "#3d7bff", "#ffc857", "#5dffa0", "#e9e3d5", "#ff6a35"][i], p: [-2.4 + i * 0.95, 1.45, 6.4], r: [0, 0.3, 0] })
  }
  return { solido, neon }
}
function texAtlas(ids: readonly Aberto[]) {
  const c = document.createElement("canvas"); c.width = 512; c.height = 128 * ids.length
  const g = c.getContext("2d")!
  g.fillStyle = "#07060c"; g.fillRect(0, 0, c.width, c.height)
  g.font = "800 76px ui-monospace, monospace"; g.textAlign = "center"; g.textBaseline = "middle"
  ids.forEach((id, i) => { const cor = CHAO_LUGARES[id].cor; g.shadowColor = cor; g.shadowBlur = 24; g.fillStyle = cor; g.fillText(CHAO_LUGARES[id].nome, 256, 128 * i + 68) })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}
// onde cada um pousa: no ponto mais baixo do pé (as dunas inclinam), a porta
// virada pro meio do subúrbio
function pouso(id: Aberto, chao: (x: number, z: number) => number) {
  const l = CHAO_LUGARES[id]
  let y = Infinity
  for (const [a, b] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) y = Math.min(y, chao(l.x + a * 7, l.z + b * 7))
  return { x: l.x, y, z: l.z, rot: Math.atan2(SUBURBIO.x - l.x, SUBURBIO.z - l.z) }
}
// leva uma peça do lugar (local) pro mundo: gira em y e desloca
function noMundo(q: Peca3, x: number, y: number, z: number, rot: number): Peca3 {
  const [px, py, pz] = q.p ?? [0, 0, 0], [rx, ry, rz] = q.r ?? [0, 0, 0]
  _o.position.set(px, py, pz); _o.rotation.set(rx, ry, rz); _o.updateMatrix()
  const m = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z).multiply(_o.matrix)
  q.g.applyMatrix4(m)
  return { g: q.g, cor: q.cor }
}
// o letreiro: a fileira i do atlas
function placaLetreiro(i: number) {
  const n = CHAO_ABERTOS.length
  const pl = new THREE.PlaneGeometry(7, 1.75), uv = pl.attributes.uv
  for (let k = 0; k < uv.count; k++) uv.setY(k, (n - 1 - i + uv.getY(k)) / n)
  return pl
}
// os três materiais, os mesmos pras caixas e pro modelo (criados uma vez só)
let MATS_ABERTOS: { solido: THREE.Material; neon: THREE.Material; letreiro: THREE.Material } | null = null
function matsAbertos() {
  return (MATS_ABERTOS ??= {
    solido: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, emissive: "#16121e", emissiveIntensity: 0.6 }),
    neon: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    letreiro: new THREE.MeshBasicMaterial({ map: texAtlas(CHAO_ABERTOS), toneMapped: false }),
  })
}

// as caixas de antes (a reserva enquanto o modelo carrega, ou se ele falhar)
function LugaresCaixas({ chao }: { chao: (x: number, z: number) => number }) {
  const d = useMemo(() => {
    const solido: Peca3[] = [], neon: Peca3[] = [], letreiros: Peca3[] = []
    CHAO_ABERTOS.forEach((id, i) => {
      const l = CHAO_LUGARES[id]
      const larg = id === "ginasio" ? 12 : 11
      // assenta no ponto mais baixo do pé e enterra a base
      const { x, y: y0, z, rot } = pouso(id, chao)
      const y = y0 - 0.3
      const alto = id === "ginasio" || id === "discos" ? 6 : 5
      const extra = detalhe(id, l.cor)
      const loc: { s: Peca3[]; n: Peca3[] } = {
        s: [
          { g: caixa(larg, alto + 2, 9), cor: id === "galeria" ? "#d9dee8" : "#2e2836", p: [0, alto / 2 - 1, 0] },
          { g: caixa(larg + 0.6, 0.4, 9.6), cor: "#1c1822", p: [0, alto, 0] },
          ...extra.solido,
        ],
        n: [
          { g: caixa(id === "ginasio" ? 5 : 1.8, id === "ginasio" ? 3.4 : 2.6, 0.05), cor: "#ffcf8a", p: [0, (id === "ginasio" ? 3.4 : 2.6) / 2, 4.53] },
          { g: caixa(larg, 0.08, 0.06), cor: l.cor, p: [0, 0.3, 4.55] },
          { g: caixa(larg, 0.08, 0.06), cor: l.cor, p: [0, alto - 0.2, 4.55] },
          ...extra.neon,
        ],
      }
      for (const q of loc.s) solido.push(noMundo(q, x, y, z, rot))
      for (const q of loc.n) neon.push(noMundo(q, x, y, z, rot))
      letreiros.push(noMundo({ g: placaLetreiro(i), p: [0, alto - 1.3, 4.58] }, x, y, z, rot))
    })
    return { solido: juntar(solido), neon: juntar(neon), letreiros: juntar(letreiros, true) }
  }, [chao])
  const mats = matsAbertos()
  return (
    <>
      <mesh geometry={d.solido} material={mats.solido} name="lugares-abertos" />
      <mesh geometry={d.neon} material={mats.neon} />
      <mesh geometry={d.letreiros} material={mats.letreiro} />
    </>
  )
}

// ── (06/11) OS SEIS MODELADOS NO BLENDER (blender/scripts/lugares_chao.py,
// public/models/lugares-chao.glb): o ginásio é um galpão de chapa em arco com a
// grade, os pneus e o saco de pancada; a galeria, uma vitrine de vidro rachado
// com quadros e lona; os discos, contêineres com o vinil gigante e caixotes; o
// estúdio da batida, um ônibus velho com caixas de som empilhadas; as flores,
// uma estufa de garrafa PET com canteiros; o brechó, uma barraca de feira com
// araras e manequins. Um nó por lugar (o id), origem no chão no centro da
// frente; em cada nó três malhas: _solido (cor no vértice com a sombra assada),
// _luz (o que brilha com cor fixa) e _neon (sem cor: aqui vira a cor do lugar).
// Tudo é levado pro mundo UMA vez e juntado nos mesmos 3 desenhos das caixas
// (sólido, brilho, letreiros), com os mesmos materiais; nada por quadro, sem
// luz nova. A chegada (22 m), o cadeado e o resto continuam os de sempre (a
// Corrida e o mapa não mudam). Se o .glb não carregar, ficam as caixas.
const URL_LUGARES = "/models/lugares-chao.glb"
const FRENTE = 4.5 // a frente da caixa de antes (o prédio ocupa os mesmos 9 m pra trás)
// onde vai o letreiro (o texto do atlas) em cada modelo: [altura, na frente da origem], m
const LETREIRO_GLB: Record<Aberto, [number, number]> = {
  ginasio: [5.15, 0.55], galeria: [4.25, 0.07], discos: [3.95, -0.33],
  batida: [4.4, -0.4], flores: [3.2, -0.07], brecho: [4.3, 0.2],
}
// copia a malha do glb (quantizada pelo meshopt) em Float32 e leva pro mundo
function emFloat(g: THREE.BufferGeometry, m: THREE.Matrix4, cor?: THREE.Color) {
  const pos = g.attributes.position, nor = g.attributes.normal, col = g.attributes.color
  const n = pos.count
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i)
    if (nor) { N[i * 3] = nor.getX(i); N[i * 3 + 1] = nor.getY(i); N[i * 3 + 2] = nor.getZ(i) }
    if (cor) { C[i * 3] = cor.r; C[i * 3 + 1] = cor.g; C[i * 3 + 2] = cor.b }
    else if (col) { C[i * 3] = col.getX(i); C[i * 3 + 1] = col.getY(i); C[i * 3 + 2] = col.getZ(i) }
    else C.fill(1, i * 3, i * 3 + 3)
  }
  const o = new THREE.BufferGeometry()
  o.setAttribute("position", new THREE.BufferAttribute(P, 3))
  o.setAttribute("normal", new THREE.BufferAttribute(N, 3))
  o.setAttribute("color", new THREE.BufferAttribute(C, 3))
  o.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i))
  if (!nor) o.computeVertexNormals()
  o.applyMatrix4(m)
  return o
}
function LugaresGlb({ chao }: { chao: (x: number, z: number) => number }) {
  const { nodes } = useGLTF(URL_LUGARES) as unknown as { nodes: Record<string, THREE.Object3D> }
  const d = useMemo(() => {
    const solido: THREE.BufferGeometry[] = [], brilho: THREE.BufferGeometry[] = [], letreiros: Peca3[] = []
    const inv = new THREE.Matrix4(), rel = new THREE.Matrix4()
    CHAO_ABERTOS.forEach((id, i) => {
      const no = nodes[id]
      if (!no) throw new Error(`lugares-chao.glb sem o nó ${id}`)
      const { x, y: y0, z, rot } = pouso(id, chao)
      const y = y0 - 0.05
      const base = new THREE.Matrix4().makeRotationY(rot).setPosition(x, y, z).multiply(new THREE.Matrix4().makeTranslation(0, 0, FRENTE))
      const cor = new THREE.Color(CHAO_LUGARES[id].cor)
      no.updateWorldMatrix(true, true)
      inv.copy(no.matrixWorld).invert()
      no.traverse((o) => {
        const m = o as THREE.Mesh
        if (!m.isMesh) return
        rel.multiplyMatrices(inv, m.matrixWorld)
        const mm = base.clone().multiply(rel)
        if (m.name.endsWith("_solido")) solido.push(emFloat(m.geometry, mm))
        else brilho.push(emFloat(m.geometry, mm, m.name.endsWith("_neon") ? cor : undefined))
      })
      const [ly, lz] = LETREIRO_GLB[id]
      letreiros.push(noMundo({ g: placaLetreiro(i), p: [0, ly, FRENTE + lz] }, x, y, z, rot))
    })
    const s = mergeGeometries(solido, false), b = mergeGeometries(brilho, false)
    if (!s || !b) throw new Error("lugares-chao.glb: não deu pra juntar")
    for (const g of [...solido, ...brilho]) g.dispose()
    return { solido: s, brilho: b, letreiros: juntar(letreiros, true) }
  }, [nodes, chao])
  // as mescladas são nossas (copiadas em Float32): soltar ao desmontar; o cache do drei fica
  useEffect(() => () => { d.solido.dispose(); d.brilho.dispose(); d.letreiros.dispose() }, [d])
  const mats = matsAbertos()
  return (
    <>
      <mesh geometry={d.solido} material={mats.solido} name="lugares-abertos" />
      <mesh geometry={d.brilho} material={mats.neon} />
      <mesh geometry={d.letreiros} material={mats.letreiro} />
    </>
  )
}
function LugaresAbertos({ chao }: { chao: (x: number, z: number) => number }) {
  const reserva = <LugaresCaixas chao={chao} />
  return (
    <ModeloSeguro nome="lugares-chao-glb" reserva={reserva}><LugaresGlb chao={chao} /></ModeloSeguro>
  )
}

export function LugaresChao({ chao, alvo }: { chao: (x: number, z: number) => number; alvo: LugarChao | null }) {
  return (
    <>
      {CHAO_FIXOS.filter((id) => !(CHAO_ABERTOS as readonly string[]).includes(id)).map((id) => id === "tuneis" ? <BocaTunel key={id} chao={chao} alvo={alvo === id} />
        : id === "quadra" ? <Quadra key={id} chao={chao} alvo={alvo === id} />
        : id === "feira" ? <FeiraRua key={id} chao={chao} alvo={alvo === id} />
        : <Fachada key={id} id={id} chao={chao} alvo={alvo === id} />)}
      <LugaresAbertos chao={chao} />
      {alvo === "goteira" && <Goteira chao={chao} />}
      <LixoNoLixao chao={chao} />
    </>
  )
}
