// conta o que uma vista típica manda pra placa: a pista (asfalto, faixas, bordas,
// linhas, guard rails, saias), os postes (+ reflexo + luz), os pilares e as gotas.
//   antes:   uma malha pro mundo todo, sempre inteira (a esfera dela pega tudo)
//   quadras: uma malha por quadra (como os prédios), cortada pelo frustum e pela névoa
//   depois:  o que ficou (pistaQuadras.ts): uma malha por material, só as quadras perto
// Sem navegador: monta o mundo, põe a câmera atrás da Kombi a cada ~250 m de
// cada pista do disco e conta.
//   bun scripts/contar-quadras.ts                 (quadras de 300 m)
//   bun scripts/contar-quadras.ts --q=200,300,450 --aspecto=0.46
// docs/leveza-cidade-grande.md
import * as THREE from "three"
import { montarMundoDisco } from "../app/linha/estrada/mundoDisco"
import { EmQuadras, GradeXZ, QUADRA_PERTO, chaveQuadra, circuitosDe, montarGeoPista, pilaresDoMundo, postesDoMundo } from "../app/linha/estrada/pistaQuadras"
import type { Via } from "../app/linha/estrada/mundo"
import { mundo as noMundo, novaAmostra } from "../app/linha/estrada/pista"

const NEVOA = 950, FOLGA = Number(process.argv.find((a) => a.startsWith("--folga="))?.slice(8) ?? 400), FAR = 3200, GOTAS = 450, LIM = NEVOA + FOLGA
const ASPECTO = Number(process.argv.find((a) => a.startsWith("--aspecto="))?.slice(10) ?? 19.5 / 9)
const FOV = 75
const QS = (process.argv.find((a) => a.startsWith("--q="))?.slice(4).split(",").map(Number)) ?? [QUADRA_PERTO]

const t0 = performance.now()
const M = montarMundoDisco()
console.log(`mundo: ${(performance.now() - t0).toFixed(0)} ms, ${M.vias.length} vias`)

// cada coisa: os itens (x, z) e quantos vértices cada item manda pra placa
type Coisa = { nome: string; xz: Float32Array; ys: Float32Array; vert: number }
const coisas: Coisa[] = []
{
  const cam = montarGeoPista(M, circuitosDe(M))
  const grupos: [string, THREE.BufferGeometry[]][] = [["chao", [cam.chao]], ["faixas", cam.faixas], ["bordas", cam.bordas], ["linhas", cam.linhasGarfo], ["rails", [cam.railE, cam.railD]], ["saias", [cam.saiaE, cam.saiaD]]]
  for (const [nome, gs] of grupos) gs.forEach((g, gi) => {
    const P = g.getAttribute("position").array as Float32Array, nq = Math.floor(P.length / 12)
    const xz = new Float32Array(nq * 2), ys = new Float32Array(nq)
    for (let q = 0; q < nq; q++) { const o = q * 12; xz[q * 2] = (P[o] + P[o + 6]) / 2; xz[q * 2 + 1] = (P[o + 2] + P[o + 8]) / 2; ys[q] = P[o + 1] }
    coisas.push({ nome: gs.length > 1 ? `${nome}${gi}` : nome, xz, ys, vert: 4 })
  })
  const ks = postesDoMundo(M)
  const pxz = Float32Array.from(ks.flatMap((p) => [p.x, p.z])), pys = Float32Array.from(ks.map((p) => p.v.py[p.k] + 3.6))
  coisas.push({ nome: "postes", xz: pxz, ys: pys, vert: 24 }, { nome: "reflexos", xz: pxz, ys: pys, vert: 4 }, { nome: "luzes", xz: pxz, ys: pys, vert: 1 })
  const pil = pilaresDoMundo(M)
  coisas.push({ nome: "pilares", xz: Float32Array.from(pil.flatMap((p) => [p[0], p[2]])), ys: Float32Array.from(pil.map((p) => p[1] / 2 - 7)), vert: 24 })
}
// no depois, as fitas do mesmo material viram uma malha só
const MATERIAL: Record<string, string> = { bordas0: "neon", bordas1: "neon", rails0: "neon", rails1: "neon", faixas0: "faixas", faixas1: "faixas", saias0: "saias", saias1: "saias", linhas0: "linhas", linhas1: "linhas", linhas2: "linhas" }
const mat = (n: string) => MATERIAL[n] ?? n

// as gotas: as posições de verdade (como em Corrida.tsx)
const a = novaAmostra(), v3 = new THREE.Vector3()
const gl: number[] = []
M.vias.forEach((v) => v.orbs.forEach((o) => { noMundo(v, o.u, o.x, o.y ?? 1.4, a, v3); gl.push(v3.x, v3.y, v3.z) }))
const gpos = Float32Array.from(gl), nG = gpos.length / 3
const grade = new GradeXZ(gpos, 150), buf = new Int32Array(nG)

// as vistas: atrás da Kombi (12 m atrás, 5 m acima), a cada ~250 m de cada pista do disco
const vistas: { p: THREE.Vector3; alvo: THREE.Vector3 }[] = []
for (const v of M.vias as Via[]) {
  if (!(v as Via & { disco?: boolean }).disco || (v.rede && !v.rede.ida)) continue
  for (let k = 0; k < v.n; k += 125) vistas.push({ p: new THREE.Vector3(v.px[k] - v.tx[k] * 12, v.py[k] + 5, v.pz[k] - v.tz[k] * 12), alvo: new THREE.Vector3(v.px[k] + v.tx[k] * 30, v.py[k] + 1, v.pz[k] + v.tz[k] * 30) })
}
const camera = new THREE.PerspectiveCamera(FOV, ASPECTO, 0.1, FAR)
const fr = new THREE.Frustum(), m4 = new THREE.Matrix4()
const olhar = (p: THREE.Vector3, alvo: THREE.Vector3) => { camera.position.copy(p); camera.lookAt(alvo); camera.updateMatrixWorld(); camera.updateProjectionMatrix(); fr.setFromProjectionMatrix(m4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)) }

type Res = { dc: number; dcMax: number; vert: number; vertMax: number; montadas: number; por: Record<string, { dc: number; vert: number }> }
function somar(f: (soma: (nome: string, dc: number, vert: number) => void, vi: number) => void, montadas: number): Res {
  const por: Record<string, { dc: number; vert: number }> = {}
  let dc = 0, vert = 0, dcMax = 0, vertMax = 0
  vistas.forEach(({ p, alvo }, vi) => {
    olhar(p, alvo)
    let d = 0, vv = 0
    f((nome, x, y) => { d += x; vv += y; const s = por[nome] ?? (por[nome] = { dc: 0, vert: 0 }); s.dc += x; s.vert += y }, vi)
    dc += d; vert += vv; dcMax = Math.max(dcMax, d); vertMax = Math.max(vertMax, vv)
  })
  const n = vistas.length
  for (const s of Object.values(por)) { s.dc /= n; s.vert /= n }
  return { dc: dc / n, dcMax, vert: vert / n, vertMax, montadas, por }
}
// antes: tudo, sempre
const antes = somar((soma) => { for (const c of coisas) soma(c.nome, c.xz.length ? 1 : 0, (c.xz.length / 2) * c.vert) }, coisas.length)
// quadras: uma malha por quadra e material, frustum + névoa
function porMalha(Q: number) {
  const malhas: { nome: string; e: THREE.Sphere; vert: number }[] = []
  const grupos = new Map<string, { nome: string; pts: THREE.Vector3[]; vert: number }>()
  for (const c of coisas) for (let i = 0; i < c.xz.length / 2; i++) {
    const k = `${mat(c.nome)}|${chaveQuadra(c.xz[i * 2], c.xz[i * 2 + 1], Q)}`
    let g = grupos.get(k); if (!g) grupos.set(k, (g = { nome: mat(c.nome), pts: [], vert: 0 }))
    g.pts.push(new THREE.Vector3(c.xz[i * 2], c.ys[i], c.xz[i * 2 + 1])); g.vert += c.vert
  }
  for (const g of grupos.values()) { const e = new THREE.Box3().setFromPoints(g.pts).getBoundingSphere(new THREE.Sphere()); e.radius += 8; malhas.push({ nome: g.nome, e, vert: g.vert }) }
  return somar((soma, vi) => {
    const p = vistas[vi].p
    for (const o of malhas) { const r = LIM + o.e.radius; if (o.e.center.distanceToSquared(p) > r * r || !fr.intersectsSphere(o.e)) continue; soma(o.nome, 1, o.vert) }
  }, malhas.length)
}
// depois: EmQuadras (uma malha por material; só as quadras a até LIM da câmera)
function depois(Q: number) {
  const ems = coisas.map((c) => ({ c, em: new EmQuadras(c.xz, Q), src: new Uint8Array(c.xz.length / 2), dst: new Uint8Array(c.xz.length / 2) }))
  const nMat = new Set(coisas.map((c) => mat(c.nome))).size
  return somar((soma, vi) => {
    const p = vistas[vi].p, vistos = new Set<string>()
    for (const { c, em, src, dst } of ems) {
      em.escolher(p.x, p.z, LIM, 0); const n = em.copiar(src, dst, 1)
      const nome = mat(c.nome), novo = n > 0 && !vistos.has(nome); if (n > 0) vistos.add(nome)
      soma(nome, novo ? 1 : 0, n * c.vert)
    }
  }, nMat)
}
function gotas(grid: boolean) {
  let laco = 0, mostra = 0
  for (const { p } of vistas) {
    const n = grid ? grade.perto(p.x, p.z, GOTAS, buf) : nG
    laco += n
    for (let j = 0; j < n; j++) { const i = grid ? buf[j] : j; const dx = gpos[i * 3] - p.x, dy = gpos[i * 3 + 1] - p.y, dz = gpos[i * 3 + 2] - p.z; if (dx * dx + dy * dy + dz * dz <= GOTAS * GOTAS) mostra++ }
  }
  return { laco: laco / vistas.length, mostra: mostra / vistas.length }
}

const k = (x: number) => (x >= 10000 ? `${(x / 1000).toFixed(0)} mil` : x.toFixed(x < 10 ? 1 : 0))
const linha = (rot: string, r: Res) => {
  console.log(`\n## ${rot}\nmalhas montadas ${r.montadas} · draw calls (média / pior) ${r.dc.toFixed(1)} / ${r.dcMax} · vértices (média / pior) ${k(r.vert)} / ${k(r.vertMax)}`)
  for (const [n, s] of Object.entries(r.por)) console.log(`  ${n.padEnd(9)} dc ${s.dc.toFixed(1).padStart(5)}  vért ${k(s.vert).padStart(8)}`)
}
console.log(`${vistas.length} vistas · fov ${FOV} · aspecto ${ASPECTO.toFixed(2)} · névoa ${NEVOA} + folga ${FOLGA}`)
linha("antes: uma malha pro mundo todo", antes)
linha("alternativa: uma malha por quadra de 900 m (como os prédios), frustum + névoa", porMalha(900))
for (const Q of QS) linha(`depois: uma malha por material, só as quadras de ${Q} m a até ${LIM} m`, depois(Q))
const g0 = gotas(false), g1 = gotas(true)
console.log(`\n## gotas (${nG}; raio ${GOTAS} m)\nlaço por quadro: ${k(g0.laco)} → ${k(g1.laco)} contas de distância (grade de 150 m); na malha: ${k(g0.mostra)} (igual)`)
