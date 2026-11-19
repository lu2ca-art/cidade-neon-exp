"use client"

// A FLORESTA (09/11, o dono): o deserto vira floresta no fim do final e continua
// floresta quando a pessoa volta a jogar. Junto, as plantas da Ella por todo o subúrbio
// (o que tinha sido deixado pra trás volta a prosperar quando a água volta).
//
// Só existe com o final passando ou feito (antes: nada montado, custo zero). Cada
// peça é instanciada, montada uma vez e parada; crescer é um número no shader (a
// frente que sai da casa da D-Bee, FLORESTA_FRENTE), escrito só durante o final.
//
// Densidade por distância: perto (grade de disco/final.ts FLORESTA.celula, um <Perto>
// por célula), as árvores e moitas do mundo-depois.glb; longe (células maiores), um
// cone por planta, que some em volta da câmera (ali aparece o perto). Sem luz nova:
// MeshBasic, as cores do vértice do .glb. Sem colisão, como as plantas dos prédios.
// A areia fica verde junto (areia.ts, AREIA_VERDE). Se o .glb falhar: só os cones.

import { useGLTF } from "@react-three/drei"
import { useEffect, useMemo, useSyncExternalStore } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { MundoDisco } from "./mundoDisco"
import { Perto, type PontoXZ } from "./Perto"
import { ModeloSeguro } from "./Seguro"
import { AREIA_VERDE } from "./areia"
import { GANHO, URL_MUNDO_DEPOIS, geoDe, instanciar, type Lugar } from "./MundoDepois"
import { densidadeRua } from "./manifestos/comum"
import { alemDaCidade } from "./raioCidade"
import { ruinasNoMundo } from "./ruinas"
import { CASA, CHAO_LUGARES, SUBURBIO, foraDoSuburbio } from "../disco/historia"
import { FLORESTA as CFG, PLANTA_ELLA, lerFinal, ouvirFinal } from "../disco/final"

const NADA = { momento: null, feito: false }
const lerServidor = () => NADA

// ── a frente que sai da casa da D-Bee (m). 1e9 = já cresceu toda; o FinalPovo escreve ──
export const FLORESTA_FRENTE = { uFrente: { value: 1e9 } }
const uCentro = { value: new THREE.Vector2(CASA.x, CASA.z) }
const uFuro = { value: CFG.furoLonge }

// cada instância cresce do chão quando a frente passa por ela. furo: some em volta da câmera
function crescer<T extends THREE.Material>(mat: T, furo: boolean, chave: string) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uFrente = FLORESTA_FRENTE.uFrente
    sh.uniforms.uCentro = uCentro
    if (furo) sh.uniforms.uFuro = uFuro
    sh.vertexShader = `uniform float uFrente;\nuniform vec2 uCentro;\n${furo ? "uniform float uFuro;\n" : ""}` + sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
      vec2 oF = instanceMatrix[3].xz;
      float kF = clamp((uFrente - distance(oF, uCentro)) / 60.0, 0.0, 1.0);
      kF = kF * kF * (3.0 - 2.0 * kF);
      ${furo ? "if (distance(cameraPosition.xz, oF) < uFuro) kF = 0.0;" : ""}
      transformed *= kF;`)
  }
  mat.customProgramCacheKey = () => `floresta-${chave}`
  return mat
}

// materiais compartilhados
let MATS: { perto: THREE.Material; longe: THREE.Material } | null = null
function mats() {
  return (MATS ??= {
    perto: crescer(new THREE.MeshBasicMaterial({ color: new THREE.Color(GANHO, GANHO, GANHO), vertexColors: true, side: THREE.DoubleSide }), false, "perto"),
    longe: crescer(new THREE.MeshBasicMaterial({ color: "#ffffff" }), true, "longe"),
  })
}

type CelulaPerto = { k: string; x: number; z: number; arvores: Lugar[]; moitas: Lugar[] }
type CelulaLonge = { k: string; x: number; z: number; cones: Lugar[] }

// ── onde nasce: o deserto, fora da cidade, do subúrbio e da casa ──
const livre = (x: number, z: number) => alemDaCidade(x, z) > CFG.alemDaCidade && foraDoSuburbio(x, z) > CFG.folgaSuburbio && Math.hypot(x - CASA.x, z - CASA.z) > CFG.folgaCasa

function colocar(M: MundoDisco) {
  let sem = 509
  const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  const dens = densidadeRua(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), esc = new THREE.Vector3()
  const lugar = (x: number, z: number, h: number, cor: THREE.Color): Lugar => {
    q.setFromAxisAngle(Y, r() * 6.283)
    return { m: new THREE.Matrix4().compose(pos.set(x, M.chaoEm(x, z), z), q, esc.set(h, h * (0.9 + r() * 0.3), h)), c: cor }
  }
  const verde = (l0: number, l1: number) => new THREE.Color().setHSL(0.24 + r() * 0.1, 0.35, l0 + r() * (l1 - l0))
  const perto: CelulaPerto[] = [], longe: CelulaLonge[] = []
  // o perto
  const C = CFG.celula, ex = Math.ceil(CFG.extensao / C)
  for (let i = -ex; i < ex; i++) for (let j = -ex; j < ex; j++) {
    const cx = (i + 0.5) * C, cz = (j + 0.5) * C
    if (alemDaCidade(cx, cz) < CFG.alemDaCidade - C) continue
    const arvores: Lugar[] = [], moitas: Lugar[] = []
    const nA = Math.round(CFG.arvores * dens), nM = Math.round(CFG.moitas * dens)
    for (let t = 0; t < nA * 3 && arvores.length < nA; t++) {
      const x = cx + (r() - 0.5) * C, z = cz + (r() - 0.5) * C
      if (livre(x, z)) arvores.push(lugar(x, z, 1.5 + r() * 0.9, verde(0.86, 1)))
    }
    for (let t = 0; t < nM * 3 && moitas.length < nM; t++) {
      const x = cx + (r() - 0.5) * C, z = cz + (r() - 0.5) * C
      if (livre(x, z)) moitas.push(lugar(x, z, 1.4 + r() * 1.2, verde(0.86, 1)))
    }
    if (arvores.length || moitas.length) perto.push({ k: `${i},${j}`, x: cx, z: cz, arvores, moitas })
  }
  // o longe
  const L = CFG.celulaLonge, exL = Math.ceil(CFG.extensao / L)
  for (let i = -exL; i < exL; i++) for (let j = -exL; j < exL; j++) {
    const cx = (i + 0.5) * L, cz = (j + 0.5) * L
    if (alemDaCidade(cx, cz) < CFG.alemDaCidade - L) continue
    const cones: Lugar[] = [], n = Math.round(CFG.cones * dens)
    for (let t = 0; t < n * 2 && cones.length < n; t++) {
      const x = cx + (r() - 0.5) * L, z = cz + (r() - 0.5) * L
      if (livre(x, z)) cones.push(lugar(x, z, 8 + r() * 8, verde(0.13, 0.24)))
    }
    if (cones.length) longe.push({ k: `${i},${j}`, x: cx, z: cz, cones })
  }
  return { perto, longe }
}

export function Floresta({ M }: { M: MundoDisco }) {
  const f = useSyncExternalStore(ouvirFinal, lerFinal, lerServidor)
  const mo = f.momento
  const mostrar = f.feito || mo === "agua" || mo === "chuva" || mo === "floresta"
  // fora do final, a areia já vem verde em quem terminou (e volta ao normal em quem não)
  useEffect(() => {
    if (mo === null) AREIA_VERDE.value = f.feito ? 1e9 : 0
  }, [f.feito, mo])
  if (!mostrar) return null
  return (
    <>
      <ModeloSeguro nome="floresta-glb" reserva={<Celulas M={M} geos={null} />} enquanto={null}>
        <ComModelos M={M} />
      </ModeloSeguro>
      {(f.feito || mo === "floresta") && <PlantasElla M={M} />}
    </>
  )
}

type Geos = { arvore: THREE.BufferGeometry; moita: THREE.BufferGeometry }

function ComModelos({ M }: { M: MundoDisco }) {
  const { nodes } = useGLTF(URL_MUNDO_DEPOIS) as unknown as { nodes: Record<string, THREE.Object3D> }
  const geos = useMemo<Geos>(() => {
    const base = geoDe(nodes, "trep_base", "solido"), meio = geoDe(nodes, "trep_meio", "solido").translate(0, 3, 0), topo = geoDe(nodes, "trep_topo", "solido").translate(0, 9, 0)
    // a trepadeira é chata (foi feita pra parede): duas em cruz fazem uma árvore de pé
    const giradas = [base, meio, topo].map((g) => g.clone().rotateY(Math.PI / 2))
    const arvore = mergeGeometries([base, meio, topo, ...giradas], false)
    if (!arvore) throw new Error("mundo-depois.glb: não deu pra juntar a árvore")
    for (const g of [base, meio, topo, ...giradas]) g.dispose()
    return { arvore, moita: geoDe(nodes, "tufo_b", "solido") }
  }, [nodes])
  useEffect(() => () => { geos.arvore.dispose(); geos.moita.dispose() }, [geos])
  return <Celulas M={M} geos={geos} />
}

function Celulas({ M, geos }: { M: MundoDisco; geos: Geos | null }) {
  const d = useMemo(() => colocar(M), [M])
  const cone = useMemo(() => new THREE.ConeGeometry(1, 1, 6, 1, true).translate(0, 0.5, 0).scale(0.32, 1, 0.32), [])
  useEffect(() => () => cone.dispose(), [cone])
  return (
    <>
      {d.longe.map((c) => (
        <Perto key={`l${c.k}`} nome={`floresta-longe ${c.k}`} raio={CFG.raioLonge} pontos={[{ x: c.x, z: c.z }]}>
          <Instancias geo={cone} mat={mats().longe} lista={c.cones} />
        </Perto>
      ))}
      {geos && d.perto.map((c) => (
        <Perto key={`p${c.k}`} nome={`floresta-perto ${c.k}`} raio={CFG.raioPerto} pontos={[{ x: c.x, z: c.z }]}>
          <Instancias geo={geos.arvore} mat={mats().perto} lista={c.arvores} />
          <Instancias geo={geos.moita} mat={mats().perto} lista={c.moitas} />
        </Perto>
      ))}
    </>
  )
}

function Instancias({ geo, mat, lista }: { geo: THREE.BufferGeometry; mat: THREE.Material; lista: Lugar[] }) {
  const im = useMemo(() => (lista.length ? instanciar(geo, mat, lista) : null), [geo, mat, lista])
  useEffect(() => () => im?.dispose(), [im])
  return im ? <primitive object={im} /> : null
}

// ── a planta da Ella, por todo o subúrbio ──
// a silhueta da planta do Escondido.tsx (o caule, as folhas em leque, as colas) em ~60
// triângulos. Quando o modelo realista existir: disco/final.ts, PLANTA_ELLA.url
function geoPlantaSimples() {
  const pos: number[] = [], cor: number[] = []
  const v = (x: number, y: number, z: number, c: readonly [number, number, number]) => { pos.push(x, y, z); cor.push(c[0], c[1], c[2]) }
  const ESCURO = [0.12, 0.34, 0.14] as const, FOLHA = [0.2, 0.55, 0.22] as const, COLA = [0.42, 0.72, 0.34] as const
  // o caule: dois planos em cruz
  const H = 1.15, E = 0.025
  for (const [dx, dz] of [[E, 0], [0, E]]) {
    v(-dx, 0, -dz, ESCURO); v(dx, 0, dz, ESCURO); v(dx, H, dz, FOLHA)
    v(-dx, 0, -dz, ESCURO); v(dx, H, dz, FOLHA); v(-dx, H, -dz, FOLHA)
  }
  // as folhas: 5 nós, 5 folíolos em leque por nó (um losango cada)
  for (let n = 0; n < 5; n++) {
    const y = 0.25 + n * 0.17, base = n * 2.2, s = 1.1 - n * 0.14
    for (let d = -2; d <= 2; d++) {
      const a = base + d * 0.5, l = 0.36 * s * (1 - Math.abs(d) * 0.18), w = l * 0.16
      const cx = Math.cos(a), sx = Math.sin(a), px = -sx, pz = cx, ey = 0.06
      const mx = cx * l * 0.5, mz = sx * l * 0.5
      v(0, y, 0, ESCURO); v(mx + px * w, y + ey, mz + pz * w, FOLHA); v(cx * l, y + ey * 0.4, sx * l, FOLHA)
      v(0, y, 0, ESCURO); v(cx * l, y + ey * 0.4, sx * l, FOLHA); v(mx - px * w, y + ey, mz - pz * w, FOLHA)
    }
  }
  // a cola no alto
  const T = 0.09, Y0 = H - 0.05, Y1 = H + 0.26
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2, b = ((k + 1) / 4) * Math.PI * 2
    v(Math.cos(a) * T, Y0, Math.sin(a) * T, FOLHA); v(Math.cos(b) * T, Y0, Math.sin(b) * T, FOLHA); v(0, Y1, 0, COLA)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(cor), 3))
  return g
}

function colocarPlantasElla(M: MundoDisco) {
  let sem = 88
  const r = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647 }
  const col = ruinasNoMundo(M).colisores
  // não nasce dentro de uma caixa de ruína nem em cima das portas dos lugares do chão
  const dentro = (x: number, z: number) => {
    for (let i = 0; i + 8 < col.length; i += 9) {
      const dx = x - col[i], dz = z - col[i + 1], s = col[i + 2], c = col[i + 3]
      if (Math.abs(dx * c - dz * s) < col[i + 4] + 0.4 && Math.abs(dx * s + dz * c) < col[i + 5] + 0.4) return true
    }
    return false
  }
  const lugares = Object.values(CHAO_LUGARES) as PontoXZ[]
  const n = Math.round(PLANTA_ELLA.quantas * densidadeRua()), [e0, e1] = PLANTA_ELLA.escala
  const q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), esc = new THREE.Vector3()
  const lista: Lugar[] = []
  for (let t = 0; t < n * 3 && lista.length < n; t++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * (SUBURBIO.r + 12)
    const x = SUBURBIO.x + Math.cos(a) * d, z = SUBURBIO.z + Math.sin(a) * d
    if (dentro(x, z) || lugares.some((l) => Math.hypot(x - l.x, z - l.z) < 7)) continue
    q.setFromAxisAngle(Y, r() * 6.283)
    const k = e0 + r() * (e1 - e0)
    lista.push({ m: new THREE.Matrix4().compose(pos.set(x, M.chaoEm(x, z), z), q, esc.set(k, k, k)), c: new THREE.Color().setHSL(0.27 + r() * 0.08, 0.5, 0.42 + r() * 0.3) })
  }
  return lista
}

const CENTRO_SUBURBIO = [{ x: SUBURBIO.x, z: SUBURBIO.z }]

function PlantasElla({ M }: { M: MundoDisco }) {
  return (
    <Perto nome="plantas-ella" raio={SUBURBIO.r + 260} pontos={CENTRO_SUBURBIO}>
      {PLANTA_ELLA.url ? (
        <ModeloSeguro nome="planta-ella-glb" enquanto={null} reserva={<PlantasEllaMalha M={M} geo={null} />}>
          <PlantasEllaGlb M={M} url={PLANTA_ELLA.url} />
        </ModeloSeguro>
      ) : <PlantasEllaMalha M={M} geo={null} />}
    </Perto>
  )
}

function PlantasEllaGlb({ M, url }: { M: MundoDisco; url: string }) {
  const { nodes } = useGLTF(url) as unknown as { nodes: Record<string, THREE.Object3D> }
  const geo = useMemo(() => geoDe(nodes, PLANTA_ELLA.no, PLANTA_ELLA.grupo), [nodes])
  useEffect(() => () => geo.dispose(), [geo])
  return <PlantasEllaMalha M={M} geo={geo} />
}

function PlantasEllaMalha({ M, geo }: { M: MundoDisco; geo: THREE.BufferGeometry | null }) {
  const lista = useMemo(() => colocarPlantasElla(M), [M])
  const g = useMemo(() => geo ?? geoPlantaSimples(), [geo])
  useEffect(() => () => { if (!geo) g.dispose() }, [g, geo])
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), [])
  useEffect(() => () => mat.dispose(), [mat])
  const im = useMemo(() => instanciar(g, mat, lista), [g, mat, lista])
  useEffect(() => () => im.dispose(), [im])
  return <primitive object={im} />
}
