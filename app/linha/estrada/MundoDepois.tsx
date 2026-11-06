"use client"

// O MUNDO DEPOIS (06/11): depois do final (disco/final.ts, FINAL_VIVO.feito), a
// cidade muda sem tela explicando (retomar-mundo.md, "Como mostrar sem explicar"):
//   - plantas nos prédios altos: tufos nas janelas e trepadeiras subindo a parede
//   - cabines nas torres: em cada poço, uma cabine sobe e outra desce (os dois sentidos)
// O rio nas trincheiras mora em trincheiras/RioDepois.tsx.
//
// Modelos (06/11, blender/scripts/mundo_depois.py → public/models/mundo-depois.glb):
// 3 tufos (jardineira, moita, vaso pendente), a trepadeira em módulos (base, meio
// que repete, topo), o broto aceso (flores pequenas) e a cabine de vidro (estrutura,
// banco, vasos; o vidro e a faixa de luz na cor de quem sobe/desce). Cor nos
// vértices (AO assada), sem luz: MeshBasic, materiais compartilhados.
//
// Desempenho: antes do final não monta nada. Depois, as plantas vão por QUADRA
// (CFG.quadra m de lado): cada quadra é um <Perto> com até 7 instanciadas (3 tufos,
// 3 módulos, os brotos; a esfera de cada uma é a da quadra, o corte da câmera
// funciona), montada só com a câmera a CFG.raioPerto do centro dela; longe, nada.
// Cada quadra guarda no máximo CFG.triQuadra triângulos de planta: com todas as
// quadras perto montadas (no pior caso 12) fica abaixo de ~150 mil (docs/mundo-depois.md).
// As cabines: 4 desenhos (estrutura, vidro, luz, trilhos). Sem luz nova. Por
// quadro: 1 número (o tempo das cabines, que andam no shader) e o teste do <Perto>
// a cada 10 quadros. Se o .glb falhar: as formas de antes (octaedros e faixas).

import { useGLTF } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { Component, Suspense, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import * as THREE from "three"
import type { MundoDisco } from "./mundoDisco"
import { Perto } from "./Perto"
import { MUNDO_DEPOIS as CFG, lerFinal, ouvirFinal } from "../disco/final"

const NADA = { momento: null, feito: false }
const lerServidor = () => NADA
const CHAO_TORRE = -12 // Torre.tsx, CHAO
const URL = "/models/mundo-depois.glb"
const GANHO = 0.25 // o sólido sai do Blender ×4 (8 bits nos tons escuros); aqui volta
// a trepadeira (mundo_depois.py): base 3 m, meio 6 m (repete), topo 2,5 m
const HB = 3, HM = 6, HT = 2.5
// triângulos de cada peça (o print do mundo_depois.py; o tufo conta pelo maior):
// é com eles que cada quadra guarda o teto CFG.triQuadra
const TRI = { tufo: 256, base: 247, meio: 258, topo: 204, broto: 38 }

// o mundo depois só existe com o final feito e sem o final passando
export function useMundoDepois() {
  const f = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  return f.feito && f.momento === null
}

export function MundoDepois({ M, colisores }: { M: MundoDisco; colisores: number[] }) {
  if (!useMundoDepois()) return null
  return (
    <SeFalhar reserva={<><Plantas colisores={colisores} geos={null} /><Cabines M={M} geos={null} /></>}>
      <Suspense fallback={null}>
        <Modelos M={M} colisores={colisores} />
      </Suspense>
    </SeFalhar>
  )
}

// se o .glb falhar: as formas de antes
class SeFalhar extends Component<{ children: ReactNode; reserva: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() { return { erro: true } }
  render() { return this.state.erro ? this.props.reserva : this.props.children }
}

// ── as geometrias do glb ──
type Geos = {
  tufos: THREE.BufferGeometry[]
  base: THREE.BufferGeometry; meio: THREE.BufferGeometry; topo: THREE.BufferGeometry
  broto: THREE.BufferGeometry
  cab: { solido: THREE.BufferGeometry; vidro: THREE.BufferGeometry; luz: THREE.BufferGeometry }
}

// copia a malha (quantizada pelo meshopt; o nó dela guarda a escala) em Float32,
// já no espaço da peça: posição e cor, sem normal (MeshBasic não usa)
function geoDe(nodes: Record<string, THREE.Object3D>, id: string, grupo: string) {
  const no = nodes[id]
  if (!no) throw new Error(`mundo-depois.glb sem o nó ${id}`)
  let malha: THREE.Mesh | null = null
  no.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.name.endsWith(`_${grupo}`)) malha = o as THREE.Mesh })
  if (!malha) throw new Error(`mundo-depois.glb sem ${id}_${grupo}`)
  const m = malha as THREE.Mesh
  no.updateWorldMatrix(true, true)
  const rel = new THREE.Matrix4().copy(no.matrixWorld).invert().multiply(m.matrixWorld)
  const g = m.geometry, pos = g.attributes.position, col = g.attributes.color, n = pos.count
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    P[i * 3] = pos.getX(i); P[i * 3 + 1] = pos.getY(i); P[i * 3 + 2] = pos.getZ(i)
    if (col) { C[i * 3] = col.getX(i); C[i * 3 + 1] = col.getY(i); C[i * 3 + 2] = col.getZ(i) } else C.fill(1, i * 3, i * 3 + 3)
  }
  const o = new THREE.BufferGeometry()
  o.setAttribute("position", new THREE.BufferAttribute(P, 3))
  o.setAttribute("color", new THREE.BufferAttribute(C, 3))
  o.setIndex(g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: n }, (_, i) => i))
  o.applyMatrix4(rel)
  return o
}

function Modelos({ M, colisores }: { M: MundoDisco; colisores: number[] }) {
  const { nodes } = useGLTF(URL) as unknown as { nodes: Record<string, THREE.Object3D> }
  const geos = useMemo<Geos>(() => ({
    tufos: ["tufo_a", "tufo_b", "tufo_c"].map((t) => geoDe(nodes, t, "solido")),
    base: geoDe(nodes, "trep_base", "solido"), meio: geoDe(nodes, "trep_meio", "solido"), topo: geoDe(nodes, "trep_topo", "solido"),
    broto: geoDe(nodes, "broto", "luz"),
    cab: { solido: geoDe(nodes, "cabine", "solido"), vidro: geoDe(nodes, "cabine", "vidro"), luz: geoDe(nodes, "cabine", "luz") },
  }), [nodes])
  useEffect(() => () => {
    for (const g of [...geos.tufos, geos.base, geos.meio, geos.topo, geos.broto, geos.cab.solido, geos.cab.vidro, geos.cab.luz]) g.dispose()
  }, [geos])
  return (
    <>
      <Plantas colisores={colisores} geos={geos} />
      <Cabines M={M} geos={geos} />
    </>
  )
}

// materiais compartilhados
let MATS: { planta: THREE.Material; broto: THREE.Material; simples: THREE.Material } | null = null
function mats() {
  return (MATS ??= {
    planta: new THREE.MeshBasicMaterial({ color: new THREE.Color(GANHO, GANHO, GANHO), vertexColors: true, side: THREE.DoubleSide }),
    broto: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }),
    simples: new THREE.MeshLambertMaterial({ color: "#2f6b2c", emissive: "#0b2a14", flatShading: true }),
  })
}

type Lugar = { m: THREE.Matrix4; c: THREE.Color }
type Quadra = {
  k: string; x: number; z: number; tri: number
  tufos: Lugar[][]; base: Lugar[]; meio: Lugar[]; topo: Lugar[]; brotos: Lugar[]; simplesT: Lugar[]; simplesV: Lugar[]
}
// as formas de antes (o .glb falhou), uma de cada pra todas as quadras
let SIMPLES: { t: THREE.BufferGeometry; v: THREE.BufferGeometry } | null = null
const simples = () => (SIMPLES ??= {
  t: new THREE.OctahedronGeometry(1, 0).scale(1.6, 0.8, 0.7).translate(0, 0.2, 0.7),
  v: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0.5),
})

function instanciar(geo: THREE.BufferGeometry, mat: THREE.Material, lista: Lugar[]) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, lista.length))
  lista.forEach((l, i) => { im.setMatrixAt(i, l.m); im.setColorAt(i, l.c) })
  im.count = lista.length
  im.visible = lista.length > 0
  im.computeBoundingSphere()
  im.matrixAutoUpdate = false
  return im
}

// ── onde vão as plantas: dos colisores dos prédios (9 números cada: x, z, tx, tz,
// meia largura, meio fundo, topo, base, ...). O prédio gira com a rua: a largura vai
// em (tz, -tx) e o fundo em (tx, tz) (Corrida.tsx, a cidade). O sorteio r() é o
// mesmo de antes (as mesmas posições e quantidades); o que é novo (variação, flores,
// módulos) sorteia em outro (r2) ──
function colocar(colisores: number[]) {
  let sem = 11, sem2 = 97
  const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  const r2 = () => { sem2 = (sem2 * 48271) % 2147483647; return sem2 / 2147483647 }
  const q = new THREE.Quaternion(), pos = new THREE.Vector3(), esc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0)
  const quadras = new Map<string, Quadra>()
  // a quadra do ponto (x, z): a grade de CFG.quadra m; o centro dela é o ponto do <Perto>
  const quadra = (x: number, z: number) => {
    const i = Math.floor(x / CFG.quadra), j = Math.floor(z / CFG.quadra), k = `${i},${j}`
    let Q = quadras.get(k)
    if (!Q) quadras.set(k, (Q = { k, x: (i + 0.5) * CFG.quadra, z: (j + 0.5) * CFG.quadra, tri: 0, tufos: [[], [], []], base: [], meio: [], topo: [], brotos: [], simplesT: [], simplesV: [] }))
    return Q
  }
  const cabe = (Q: Quadra, t: number) => Q.tri + t <= CFG.triQuadra
  const lugar = (p: THREE.Vector3, e: THREE.Vector3, c: THREE.Color): Lugar => ({ m: new THREE.Matrix4().compose(p, q, e), c })
  const broto = (Q: Quadra, p: THREE.Vector3, k: number) => {
    const cor = new THREE.Color().setHSL(r2(), 0.25, 0.82 + r2() * 0.18)
    if (nb >= CFG.maxBrotos || !cabe(Q, TRI.broto)) return
    Q.brotos.push(lugar(p, new THREE.Vector3(k, k, k), cor)); Q.tri += TRI.broto; nb++
  }
  let nt = 0, nv = 0, nm = 0, nb = 0
  for (let i = 0; i + 8 < colisores.length; i += 9) {
    const bx = colisores[i], bz = colisores[i + 1], tx = colisores[i + 2], tz = colisores[i + 3]
    const hw = colisores[i + 4], hf = colisores[i + 5], topoP = colisores[i + 6], baseP = colisores[i + 7]
    const h = topoP - baseP
    if (h < CFG.alturaMin) continue
    // uma face do prédio: o normal (pra fora), a meia distância até ela e a direção ao longo dela
    const face = () => {
      const f = Math.floor(r() * 4), s = f % 2 ? -1 : 1
      return f < 2 ? { nx: tz * s, nz: -tx * s, d: hw, ax: tx, az: tz, l: hf } : { nx: tx * s, nz: tz * s, d: hf, ax: tz, az: -tx, l: hw }
    }
    const nTufos = Math.min(CFG.tufosPorPredio, Math.floor(h / 14))
    for (let k = 0; k < nTufos && nt < CFG.maxTufos; k++) {
      const F = face(), ao = (r() * 2 - 1) * F.l * 0.85
      // a origem do tufo fica na parede (o modelo cresce pra fora, +Z local)
      pos.set(bx + F.nx * (F.d + 0.05) + F.ax * ao, baseP + 6 + r() * (h - 8), bz + F.nz * (F.d + 0.05) + F.az * ao)
      q.setFromAxisAngle(Y, Math.atan2(F.nx, F.nz))
      const kk = 0.9 + r() * 0.6
      esc.set(kk, kk * (0.85 + r() * 0.3), kk)
      const c = new THREE.Color().setHSL(0.2 + r() * 0.14, 0.3, 0.86 + r() * 0.14)
      const Q = quadra(pos.x, pos.z)
      if (!cabe(Q, TRI.tufo)) continue
      Q.tufos[nt % 3].push(lugar(pos, esc, c))
      Q.simplesT.push(lugar(pos, esc, c))
      Q.tri += TRI.tufo
      nt++
      if (r2() < CFG.brotoTufo) {
        const a = (r2() - 0.5) * 1.4 * kk, u = (r2() * 0.6 - 0.1) * kk
        broto(Q, new THREE.Vector3(pos.x + F.nx * 0.8 * kk + F.ax * a, pos.y + u, pos.z + F.nz * 0.8 * kk + F.az * a), kk * (1.2 + r2() * 0.6))
      }
    }
    for (let k = 0; k < 2 && nv < CFG.maxTrepadeiras; k++) {
      if (r() > CFG.trepadeiraChance) continue
      const F = face(), ao = (r() * 2 - 1) * F.l * 0.8
      const x = bx + F.nx * (F.d + 0.02) + F.ax * ao, z = bz + F.nz * (F.d + 0.02) + F.az * ao
      const y0 = baseP + CFG.trepChao
      q.setFromAxisAngle(Y, Math.atan2(F.nx, F.nz))
      const s = 0.8 + r() * 0.4, H = h * (0.25 + r() * 0.45)
      const c = new THREE.Color().setHSL(0.22 + r() * 0.1, 0.3, 0.86 + r() * 0.14)
      const Q = quadra(x, z)
      // os módulos que cabem na quadra (a trepadeira fica mais baixa se faltar)
      const n = Math.min(Math.max(1, Math.round((H / s - HB - HT) / HM)), CFG.maxModulos - nm,
        Math.floor((CFG.triQuadra - Q.tri - TRI.base - TRI.topo) / TRI.meio))
      if (n < 1) continue
      Q.simplesV.push(lugar(pos.set(x, y0, z), esc.set(s * 2, H, s * 0.35), c))
      nv++
      const sy = Math.min(H / (HB + HM * n + HT), s * 1.6) // sem esticar demais
      esc.set(s, sy, s)
      Q.base.push(lugar(pos.set(x, y0, z), esc, c))
      Q.tri += TRI.base + TRI.topo + n * TRI.meio
      for (let j = 0; j < n; j++) {
        const yj = y0 + (HB + HM * j) * sy
        Q.meio.push(lugar(pos.set(x, yj, z), esc, c))
        if (r2() < CFG.brotoModulo) {
          const a = (r2() - 0.5) * 1.2 * s
          broto(Q, new THREE.Vector3(x + F.nx * 0.5 * s + F.ax * a, yj + (0.5 + r2() * 5) * sy, z + F.nz * 0.5 * s + F.az * a), 1.2 + r2() * 0.5)
        }
      }
      nm += n
      Q.topo.push(lugar(pos.set(x, y0 + (HB + HM * n) * sy, z), esc, c))
    }
  }
  return [...quadras.values()].filter((Q) => Q.tri > 0)
}

// as quadras (o sorteio roda uma vez por cidade) e um <Perto> por quadra
function Plantas({ colisores, geos }: { colisores: number[]; geos: Geos | null }) {
  const quadras = useMemo(() => colocar(colisores), [colisores])
  return (
    <>
      {quadras.map((Q) => (
        <Perto key={Q.k} nome={`plantas ${Q.k}`} raio={CFG.raioPerto} pontos={[{ x: Q.x, z: Q.z }]}>
          <PlantasQuadra Q={Q} geos={geos} />
        </Perto>
      ))}
    </>
  )
}

function PlantasQuadra({ Q, geos }: { Q: Quadra; geos: Geos | null }) {
  const ims = useMemo(() => {
    const m = mats()
    if (geos) return [
      ...geos.tufos.map((g, i) => instanciar(g, m.planta, Q.tufos[i])),
      instanciar(geos.base, m.planta, Q.base), instanciar(geos.meio, m.planta, Q.meio), instanciar(geos.topo, m.planta, Q.topo),
      instanciar(geos.broto, m.broto, Q.brotos),
    ].filter((im) => im.count > 0)
    const S = simples()
    return [instanciar(S.t, m.simples, Q.simplesT), instanciar(S.v, m.simples, Q.simplesV)].filter((im) => im.count > 0)
  }, [Q, geos])
  useEffect(() => () => { for (const im of ims) im.dispose() }, [ims])
  return (
    <>
      {ims.map((im, i) => <primitive key={i} object={im} />)}
    </>
  )
}

// ── as cabines: em volta do núcleo de cada torre, poços com uma cabine subindo e
// outra descendo. A matriz fica no pé do poço; quanto ela subiu, o shader conta
// (aCab: fase, velocidade com sinal, altura do poço). A frente de vidro (+X do
// modelo) olha pra fora da torre ──
function anda(mat: THREE.Material, uT: { value: number }) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT
    sh.vertexShader = "attribute vec3 aCab;\nuniform float uT;\n" + sh.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n  transformed.y += mod(uT * aCab.y + aCab.x, aCab.z);",
    )
  }
  return mat
}

function Cabines({ M, geos }: { M: MundoDisco; geos: Geos | null }) {
  const c = useMemo(() => {
    const uT = { value: 0 }
    const n = M.torres.length * CFG.pocos * 2
    const aCab = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3)
    // as partes: [geometria, material, tinge com a cor de sobe/desce, ordem]
    const partes: [THREE.BufferGeometry, THREE.Material, boolean, number][] = geos
      ? [
          [geos.cab.solido.clone(), anda(new THREE.MeshBasicMaterial({ color: new THREE.Color(GANHO, GANHO, GANHO), vertexColors: true }), uT), false, 0],
          [geos.cab.luz.clone(), anda(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), uT), true, 0],
          [geos.cab.vidro.clone(), anda(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), uT), true, 2],
        ]
      : [[new THREE.BoxGeometry(2.6, 3.2, 2.6).translate(0, 1.6, 0), anda(new THREE.MeshBasicMaterial({ toneMapped: false }), uT), true, 0]]
    const ims = partes.map(([g, mat, , ordem]) => {
      g.setAttribute("aCab", aCab)
      const im = new THREE.InstancedMesh(g, mat, n)
      im.renderOrder = ordem
      im.frustumCulled = false // elas andam no shader: a caixa da CPU não sabe onde estão
      im.matrixAutoUpdate = false
      return im
    })
    const geoT = new THREE.BoxGeometry(0.35, 1, 0.35).translate(0, 0.5, 0)
    const matT = new THREE.MeshBasicMaterial({ color: "#7fe8ff", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
    const trilhos = new THREE.InstancedMesh(geoT, matT, M.torres.length * CFG.pocos)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), cor = new THREE.Color()
    const SOBE = new THREE.Color("#ffe2a8"), DESCE = new THREE.Color("#9ff3ff")
    let k = 0, kt = 0
    M.torres.forEach((t, ti) => {
      const r = t.nucleo + 1.6, y0 = CHAO_TORRE + 2, alto = Math.max(20, t.topo - 4 - y0)
      for (let j = 0; j < CFG.pocos; j++) {
        const a = ((j + 0.5 + ti * 0.37) / CFG.pocos) * Math.PI * 2
        const x = t.x + Math.cos(a) * r, z = t.z + Math.sin(a) * r
        q.setFromAxisAngle(Y, -a)
        m.compose(new THREE.Vector3(x, y0, z), q, new THREE.Vector3(1, 1, 1))
        for (const sobe of [true, false]) {
          ims.forEach((im, pi) => {
            im.setMatrixAt(k, m)
            if (partes[pi][2]) im.setColorAt(k, cor.copy(sobe ? SOBE : DESCE))
          })
          aCab.setXYZ(k, ((j * 0.31 + (sobe ? 0 : 0.5)) % 1) * alto, sobe ? CFG.velCabine : -CFG.velCabine, alto)
          k++
        }
        m.compose(new THREE.Vector3(x + Math.cos(a) * 1.5, y0, z + Math.sin(a) * 1.5), q, new THREE.Vector3(1, alto + 3.2, 1))
        trilhos.setMatrixAt(kt++, m)
      }
    })
    trilhos.computeBoundingSphere()
    trilhos.matrixAutoUpdate = false
    return { ims, trilhos, uT }
  }, [M, geos])
  useEffect(() => () => { for (const o of [...c.ims, c.trilhos]) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); o.dispose() } }, [c])
  useFrame((s) => { c.uT.value = s.clock.elapsedTime })
  return (
    <>
      {c.ims.map((im, i) => <primitive key={i} object={im} />)}
      <primitive object={c.trilhos} />
    </>
  )
}
