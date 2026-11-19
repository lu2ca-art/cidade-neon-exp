"use client"

// A FEIRA NO CHÃO DO SUBÚRBIO (ep. 5 · Swav; referências em referencias-feira.md):
// a rua fechada, duas fileiras de barracas de lona listrada com a banca virada
// pro corredor, os legumes separados por cor, as placas de preço, o pastel e o
// caldo de cana, as bacias da xepa. Uma peça só no mundo: 1 desenho do que é
// grande, 1 das frutas (some de longe), 1 das placas, 1 das lâmpadas. A barganha
// (FeiraBanca) só monta quando abre. Sem letreiro de estabelecimento: quem diz o
// que é a feira é a própria feira.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { CHAO_LUGARES } from "./historia"
import { COZINHA_VIVA, FEIRA_EM_VOLTA, FEIRA_RUMO, FEIRA_VIVO, LOCAL_COZINHA, naFeira, ouvirFeira } from "./feira"
import { FeiraBanca } from "./FeiraBanca"
import { CozinhaTony } from "./CozinhaTony"

type Peca3 = { g: THREE.BufferGeometry; cor: string | number }
const _o = new THREE.Object3D(), _c = new THREE.Color()
const caixa = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
const cil = (r0: number, r1: number, h: number, n = 8) => new THREE.CylinderGeometry(r0, r1, h, n)
const bola = (r: number) => new THREE.IcosahedronGeometry(r, 0)
const cone = (r: number, h: number, n = 5) => new THREE.ConeGeometry(r, h, n)

function peca(g: THREE.BufferGeometry, cor: string | number, p: [number, number, number], r: [number, number, number] = [0, 0, 0]): Peca3 {
  _o.position.set(...p); _o.rotation.set(...r); _o.scale.set(1, 1, 1); _o.updateMatrix()
  const n = (g.index ? g.toNonIndexed() : g.clone()).applyMatrix4(_o.matrix)
  g.dispose()
  return { g: n, cor }
}
function juntar(pecas: Peca3[]) {
  const gs = pecas.map(({ g, cor }, i) => {
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "color") g.deleteAttribute(k)
    if (g.attributes.color) return g // o chão da rua já vem pintado
    _c.set(cor as THREE.ColorRepresentation)
    // uma variação pequena em cada peça: a feira não tem duas coisas iguais
    const k = 0.9 + ((i * 2654435761) % 1000) / 1000 * 0.18
    const n = g.attributes.position.count, a = new Float32Array(n * 3)
    for (let q = 0; q < n; q++) { a[q * 3] = _c.r * k; a[q * 3 + 1] = _c.g * k; a[q * 3 + 2] = _c.b * k }
    g.setAttribute("color", new THREE.BufferAttribute(a, 3))
    return g
  })
  const m = mergeGeometries(gs, false)!
  gs.forEach((g) => g.dispose())
  m.computeBoundingSphere()
  return m
}

let s = 7
const semear = () => { s = 7 }
const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
const entre = (a: number, b: number) => a + rnd() * (b - a)

// a pilha: legumes do mesmo tipo em montinho no tampo (separados por cor, como na foto)
function pilha(out: Peca3[], x: number, z: number, y: number, n: number, cor: string, feitio: (i: number) => THREE.BufferGeometry, raio = 0.08) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * 0.24
    out.push(peca(feitio(i), cor, [x + Math.cos(a) * d, y + raio + rnd() * 0.08 + (i / n) * 0.12, z + Math.sin(a) * d * 0.7], [rnd() * 3, rnd() * 3, rnd() * 3]))
  }
}
const FRUTAS: { cor: string; feitio: (i: number) => THREE.BufferGeometry; n: number }[] = [
  { cor: "#d4322a", feitio: () => bola(0.075), n: 16 }, // tomate
  { cor: "#f08a1c", feitio: () => bola(0.08), n: 14 }, // laranja
  { cor: "#f4d21e", feitio: () => cil(0.03, 0.03, 0.2, 5), n: 12 }, // banana
  { cor: "#5fa82c", feitio: () => bola(0.05), n: 18 }, // limão
  { cor: "#e8701a", feitio: () => cone(0.035, 0.24), n: 12 }, // cenoura
  { cor: "#2f7a30", feitio: () => cone(0.06, 0.3), n: 9 }, // o maço de folha
  { cor: "#7a2a86", feitio: () => bola(0.08), n: 12 }, // berinjela
]
// as lonas: o azul das feiras e os listrados
const LONAS: [string, string][] = [["#2f8fd8", "#f4f1e6"], ["#e23b34", "#f6efe0"], ["#2fa24a", "#f4f1e6"], ["#f2c22a", "#f4f1e6"], ["#2f8fd8", "#1d4e8a"], ["#e23b34", "#f6efe0"]]
const SAIA = "#1d3a78"

// uma barraca: cavaletes, tampo, saia, a lona listrada e as pilhas
function barraca(ops: Peca3[], frut: Peca3[], lamp: THREE.BufferGeometry[], cx: number, lado: number, yc: number, larg: number, lona: [string, string], tipos: number[]) {
  const f = lado // +z ou -z pro corredor
  const zT = f * 5.6 // o meio do tampo
  const yT = yc + 0.95
  ops.push(peca(caixa(larg, 0.05, 1.2), "#a07d4d", [cx, yT, zT]))
  ops.push(peca(caixa(larg, 0.9, 0.05), SAIA, [cx, yc + 0.48, zT - f * 0.6]))
  ops.push(peca(caixa(0.05, 0.9, 1.2), SAIA, [cx - larg / 2, yc + 0.48, zT]))
  ops.push(peca(caixa(0.05, 0.9, 1.2), SAIA, [cx + larg / 2, yc + 0.48, zT]))
  for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) ops.push(peca(cil(0.03, 0.03, 2.75, 5), "#8a8d92", [cx + px * (larg / 2 - 0.05), yc + 1.37, zT + pz * 1.1]))
  // a lona listrada: faixas lado a lado com caimento e a babadinha na frente
  const faixas = Math.max(4, Math.round(larg / 0.55))
  const w = larg / faixas
  for (let i = 0; i < faixas; i++) {
    const cor = i % 2 ? lona[1] : lona[0]
    const lx = cx - larg / 2 + w * (i + 0.5)
    const inc = -f * 0.13
    ops.push(peca(caixa(w, 0.03, 3), cor, [lx, yc + 2.82 + (i % 2 ? 0.03 : 0), zT], [inc, 0, 0]))
    ops.push(peca(caixa(w, 0.3, 0.03), cor, [lx, yc + 2.62, zT - f * 1.52]))
  }
  // as pilhas no tampo e os caixotes embaixo
  const passo = larg / tipos.length
  tipos.forEach((t, i) => {
    const px = cx - larg / 2 + passo * (i + 0.5), fr = FRUTAS[t]
    pilha(frut, px, zT, yT + 0.03, fr.n, fr.cor, fr.feitio)
  })
  for (let k = 0; k < Math.floor(larg / 1.1); k++) {
    const px = cx - larg / 2 + 0.5 + k * 1.05, pz = zT + f * entre(0.8, 1.2), cor = rnd() < 0.5 ? "#a07d4d" : "#7c9acb"
    for (const [dy] of [[0.04], [0.16]] as const) ops.push(peca(caixa(0.55, 0.05, 0.36), cor, [px, yc + 0.08 + dy, pz]))
    ops.push(peca(caixa(0.5, 0.02, 0.32), "#6a553a", [px, yc + 0.27, pz]))
    const fr = FRUTAS[Math.floor(rnd() * FRUTAS.length)]
    pilha(frut, px, pz, yc + 0.3, 8, fr.cor, fr.feitio, 0.04)
  }
  for (let k = 0; k < 4; k++) lamp.push(new THREE.IcosahedronGeometry(0.07, 0).translate(cx - larg / 2 + (larg * (k + 0.5)) / 4, yc + 2.45, zT - f * 0.55))
}

// o tacho do pastel, a moenda do caldo e a bacia da xepa
function pastel(out: Peca3[], x: number, z: number, y: number) {
  out.push(peca(cil(0.42, 0.34, 0.26, 10), "#3f3f44", [x, y + 1.05, z]))
  out.push(peca(cil(0.39, 0.39, 0.02, 10), "#d7a11f", [x, y + 1.17, z]))
  for (let k = 0; k < 6; k++) out.push(peca(caixa(0.22, 0.05, 0.14), "#e0b35a", [x + 0.55 + (k % 3) * 0.05, y + 1.0 + k * 0.05, z - 0.3 + (k % 2) * 0.06]))
}
function moenda(out: Peca3[], x: number, z: number, y: number) {
  out.push(peca(caixa(0.7, 1, 0.5), "#c62828", [x, y + 0.5, z]))
  out.push(peca(cil(0.28, 0.28, 0.1, 12), "#7b7b80", [x + 0.45, y + 1.0, z], [0, 0, Math.PI / 2]))
  for (let k = 0; k < 8; k++) out.push(peca(cil(0.025, 0.025, 1.9, 5), k % 2 ? "#5ba13a" : "#7fbf4a", [x - 0.7 + k * 0.08, y + 1.1, z + 0.5 + (k % 3) * 0.04], [0.3 + k * 0.02, 0, 0.12]))
}
function bacia(out: Peca3[], x: number, z: number, y: number, cor: string) {
  out.push(peca(cil(0.32, 0.22, 0.18, 10), "#2d6fb7", [x, y + 0.09, z]))
  const fr = FRUTAS.find((f) => f.cor === cor) ?? FRUTAS[0]
  pilha(out, x, z, y + 0.15, 10, fr.cor, fr.feitio, 0.05)
}
function carrinho(out: Peca3[], x: number, z: number, y: number) {
  out.push(peca(caixa(0.36, 0.55, 0.26), "#b0232c", [x, y + 0.42, z]))
  out.push(peca(caixa(0.36, 0.1, 0.26), "#20389a", [x, y + 0.7, z]))
  out.push(peca(cil(0.02, 0.02, 1, 5), "#8a8d92", [x + 0.17, y + 0.75, z - 0.12], [0.28, 0, 0]))
  for (const lz of [-0.14, 0.14]) out.push(peca(cil(0.07, 0.07, 0.03, 8), "#1a1a1e", [x, y + 0.08, z + lz], [0, 0, Math.PI / 2]))
}

// as placas de preço: um atlas de papelão com o preço à mão
const PLACAS = ["TOMATE 6,00", "BANANA 3 É 5", "LIMÃO 2,00", "COUVE 1,50", "LARANJA 5,00", "CENOURA 3,00", "ABOBRINHA 4,00", "PIMENTÃO 5,00", "COGUMELO 2,00", "XEPA 3,00", "PASTEL 8,00", "CALDO DE CANA"]
const PL_COL = 4, PL_L = 256, PL_A = 128
function atlasPlacas() {
  const c = document.createElement("canvas"); c.width = PL_COL * PL_L; c.height = Math.ceil(PLACAS.length / PL_COL) * PL_A
  const g = c.getContext("2d")!
  const F = ["#f4e58a", "#f8c98a", "#e8dcb8", "#f2f2e6"]
  PLACAS.forEach((p, i) => {
    const x = (i % PL_COL) * PL_L, y = Math.floor(i / PL_COL) * PL_A
    g.save(); g.translate(x + PL_L / 2, y + PL_A / 2); g.rotate((i % 2 ? -1 : 1) * 0.03)
    g.fillStyle = F[i % F.length]; g.fillRect(-120, -56, 240, 112)
    g.strokeStyle = "#1a1208"; g.lineWidth = 5; g.strokeRect(-117, -53, 234, 106)
    const num = p.split(" "), preco = /[0-9]/.test(num[num.length - 1]) ? num.pop()! : null
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#1a1208"
    g.font = `900 ${preco ? 36 : 40}px Impact, ui-sans-serif, sans-serif`
    g.fillText(num.join(" "), 0, preco ? -24 : 0, 220)
    if (preco) { g.fillStyle = "#d11d1d"; g.font = "900 64px Impact, ui-sans-serif, sans-serif"; g.fillText(preco, 0, 26, 220) }
    g.restore()
  })
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  return t
}
function placa(lista: THREE.BufferGeometry[], i: number, p: [number, number, number], r: number, w = 0.62) {
  const g = new THREE.PlaneGeometry(w, w / 2)
  const col = i % PL_COL, lin = Math.floor(i / PL_COL), linhas = Math.ceil(PLACAS.length / PL_COL)
  const u0 = col / PL_COL, u1 = (col + 1) / PL_COL, v1 = 1 - lin / linhas, v0 = 1 - (lin + 1) / linhas
  const uv = g.attributes.uv as THREE.BufferAttribute
  uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0)
  _o.position.set(...p); _o.rotation.set(0, r, 0); _o.scale.set(1, 1, 1); _o.updateMatrix()
  g.applyMatrix4(_o.matrix)
  lista.push(g)
}

export function FeiraRua({ chao, alvo }: { chao: (x: number, z: number) => number; alvo: boolean }) {
  const F = CHAO_LUGARES.feira
  const aberta = useSyncExternalStore(ouvirFeira, () => FEIRA_VIVO.aberta, () => false)
  const naCozinha = useSyncExternalStore(ouvirFeira, () => COZINHA_VIVA.aberta, () => false)
  const yC = useMemo(() => chao(F.x, F.z), [chao, F.x, F.z])
  const yCoz = useMemo(() => { const p = naFeira(LOCAL_COZINHA.lx, LOCAL_COZINHA.lz); return chao(p.x, p.z) }, [chao])
  const d = useMemo(() => {
    semear()
    const local = (lx: number, lz: number) => {
      const S = Math.sin(FEIRA_RUMO), C = Math.cos(FEIRA_RUMO)
      return chao(F.x + lx * C + lz * S, F.z - lx * S + lz * C) - yC
    }
    const ops: Peca3[] = [], frut: Peca3[] = [], lamp: THREE.BufferGeometry[] = [], placas: THREE.BufferGeometry[] = []
    // o chão da rua: uma tira que acompanha o terreno (a Kombi passa por ela)
    const NX = 16, NZ = 4
    const ML = FEIRA_EM_VOLTA.meiaRua, ME = FEIRA_EM_VOLTA.meiaLado
    const P: number[] = [], C: number[] = []
    for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
      const x0 = -ML + (2 * ML * i) / NX, x1 = -ML + (2 * ML * (i + 1)) / NX, z0 = -ME + (2 * ME * k) / NZ, z1 = -ME + (2 * ME * (k + 1)) / NZ
      const q: [number, number][] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
      const v = (kk: number): [number, number, number] => [q[kk][0], local(q[kk][0], q[kk][1]) + 0.04, q[kk][1]]
      for (const j of [0, 2, 1, 0, 3, 2]) {
        const [x, y, z] = v(j)
        P.push(x, y, z)
        const meio = Math.abs(z) < 3.8, br = ((i + k * 7) % 5) / 40
        C.push(meio ? 0.2 + br : 0.26 + br, meio ? 0.2 + br : 0.25 + br, meio ? 0.22 + br : 0.24 + br)
      }
    }
    const rua = new THREE.BufferGeometry()
    rua.setAttribute("position", new THREE.Float32BufferAttribute(P, 3))
    rua.setAttribute("color", new THREE.Float32BufferAttribute(C, 3))
    rua.computeVertexNormals()
    // as barracas: dos dois lados, com a banca da barganha (a do meio) em +z
    const LADOS: { x: number; larg: number; lona: number; tipos: number[] }[][] = [
      [
        { x: -18, larg: 6, lona: 1, tipos: [0, 3] },
        { x: -9, larg: 7, lona: 2, tipos: [2, 4] },
        { x: 0, larg: 8, lona: 0, tipos: [4, 5, 6, 0] }, // a banca do Tony Gordo fica aqui
        { x: 9.5, larg: 6, lona: 3, tipos: [1, 3] },
        { x: 18, larg: 6, lona: 4, tipos: [5, 6] },
      ],
      [
        { x: -19, larg: 4, lona: 5, tipos: [] }, // a barraca do fogão: a cozinha do Tony
        { x: -10, larg: 6, lona: 3, tipos: [1, 2] },
        { x: 0.5, larg: 7, lona: 1, tipos: [5, 3, 2] },
        { x: 10, larg: 6, lona: 2, tipos: [6, 0] },
        { x: 19, larg: 5, lona: 4, tipos: [3] },
      ],
    ]
    LADOS.forEach((lst, iL) => {
      const f = iL === 0 ? 1 : -1
      for (const b of lst) barraca(ops, frut, lamp, b.x, f, local(b.x, f * 5.6), b.larg, LONAS[b.lona], b.tipos)
    })
    // a barraca do pastel (com tacho) e a moenda de caldo de cana no fim do corredor
    const yP = local(21, -2.4)
    pastel(ops, 21, -2.4, yP); moenda(ops, -22, 2.6, local(-22, 2.6))
    ops.push(peca(cil(0.03, 0.03, 2.7, 5), "#8a8d92", [21.8, yP + 1.3, -2.4])); ops.push(peca(caixa(3, 0.03, 2.2), "#f08a1c", [21, yP + 2.7, -2.4], [0.1, 0, 0]))
    // a xepa, os carrinhos e os caixotes soltos pela rua
    bacia(frut, 6, -3.4, local(6, -3.4), "#f4d21e"); bacia(frut, -8, 3.5, local(-8, 3.5), "#d4322a"); bacia(frut, 14, -3.2, local(14, -3.2), "#5fa82c")
    carrinho(ops, 3, -3.6, local(3, -3.6)); carrinho(ops, -14, 3.8, local(-14, 3.8)); carrinho(ops, 16, 3.4, local(16, 3.4))
    for (let k = 0; k < 18; k++) {
      const x = entre(-22, 22), z = (rnd() < 0.5 ? -1 : 1) * entre(3.2, 4.4)
      ops.push(peca(caixa(entre(0.4, 0.7), 0.05, entre(0.3, 0.5)), "#a48a58", [x, local(x, z) + 0.05, z], [0, rnd() * 3, 0]))
    }
    // o caminhão de um feirante, colado na barraca do lado de lá
    ops.push(peca(caixa(4, 1.8, 2), "#34547d", [14, local(14, -9) + 1.2, -9]))
    ops.push(peca(caixa(1.6, 1.4, 2), "#dcd8c6", [16.6, local(16.6, -9) + 0.9, -9]))
    for (const px of [13, 15.6]) for (const pz of [-1, 1]) ops.push(peca(cil(0.34, 0.34, 0.2, 10), "#1a1a1e", [px, local(px, -9) + 0.34, -9 + pz], [Math.PI / 2, 0, 0]))
    // a cozinha do Tony: o fogão, as bocas, a panela e a tábua (e ele, PROVISÓRIO: cápsula até o modelo)
    const yK = local(-19, -5.6)
    ops.push(peca(caixa(1.3, 0.1, 0.75), "#b9bcc2", [-19, yK + 1.03, -5.6]))
    for (const px of [-19.32, -18.68]) ops.push(peca(cil(0.14, 0.14, 0.02, 10), "#26262b", [px, yK + 1.09, -5.6]))
    ops.push(peca(cil(0.2, 0.17, 0.16, 12), "#6f7178", [-18.68, yK + 1.18, -5.6]))
    ops.push(peca(caixa(0.7, 0.03, 0.42), "#c79a5c", [-20.2, yK + 1.0, -5.55]))
    ops.push(peca(cil(0.4, 0.46, 0.95, 10), "#ffe14d", [-19, yK + 0.95, -6.8])); ops.push(peca(bola(0.21), "#c99a70", [-19, yK + 1.66, -6.8]))
    // o feirante atrás da banca do meio (PROVISÓRIO: cápsula até o modelo do Tripo)
    const yF = local(0.5, 6.9)
    ops.push(peca(cil(0.24, 0.28, 0.9, 8), "#f0ede4", [0.5, yF + 1.0, 6.9])); ops.push(peca(cil(0.25, 0.25, 0.4, 8), "#2f8fd8", [0.5, yF + 0.6, 6.9]))
    ops.push(peca(bola(0.2), "#c99a70", [0.5, yF + 1.66, 6.9])); ops.push(peca(cil(0.2, 0.22, 0.1, 8), "#e23b34", [0.5, yF + 1.86, 6.9]))
    ops.push(peca(cil(0.05, 0.05, 0.55, 5), "#c99a70", [0.05, yF + 1.15, 6.9], [0, 0, -1.2])); ops.push(peca(cil(0.05, 0.05, 0.55, 5), "#c99a70", [0.95, yF + 1.15, 6.9], [0, 0, 1.2]))
    // as placas de preço em cima das pilhas e nas pontas
    const ang0 = Math.PI, ang1 = 0 // a placa olha pro corredor
    const P_POS: [number, number, number, number, number][] = [
      [-18, 1.28, 5.7, ang0, 0], [-9, 1.3, 5.7, ang0, 5], [-2.5, 1.3, 5.7, ang0, 5], [2.5, 1.3, 5.7, ang0, 6], [0, 1.3, 5.7, ang0, 7], [9.5, 1.3, 5.7, ang0, 1],
      [-10, 1.3, -5.7, ang1, 4], [0.5, 1.3, -5.7, ang1, 3], [10, 1.3, -5.7, ang1, 8], [6.4, 0.5, -3.1, ang1, 9], [-8, 0.5, 3.2, ang0, 9], [14.6, 0.5, -2.9, ang1, 9],
      [21, 1.7, -3.55, ang1, 10], [-22, 1.7, 2.1, ang0, 11],
    ]
    for (const [px, py, pz, ang, ip] of P_POS) placa(placas, ip, [px, local(px, pz) + py, pz], ang)
    const opaco = juntar(ops.concat([{ g: rua, cor: "#ffffff" }]))
    const fruta = juntar(frut)
    const luz = mergeGeometries(lamp, false)!; lamp.forEach((g) => g.dispose())
    const textos = mergeGeometries(placas, false)!; placas.forEach((g) => g.dispose())
    opaco.computeBoundingSphere(); fruta.computeBoundingSphere(); luz.computeBoundingSphere(); textos.computeBoundingSphere()
    return { opaco, fruta, luz, textos }
  }, [chao, F.x, F.z, yC])

  const mats = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 })
    // um pouco de luz própria na cor do vértice: a feira fica colorida também de noite
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vColor.rgb * 0.32;")
    }
    return {
      m,
      lamp: new THREE.MeshBasicMaterial({ color: "#ffe6a3", toneMapped: false }),
      placas: new THREE.MeshBasicMaterial({ map: atlasPlacas(), toneMapped: false, side: THREE.DoubleSide }),
      alvoF: new THREE.MeshBasicMaterial({ color: F.cor, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }
  }, [F.cor])
  useEffect(() => () => {
    d.opaco.dispose(); d.fruta.dispose(); d.luz.dispose(); d.textos.dispose()
    mats.m.dispose(); mats.lamp.dispose(); mats.placas.map?.dispose(); mats.placas.dispose(); mats.alvoF.dispose()
  }, [d, mats])

  // as frutas somem de longe (o resto continua): a conta é de leve, poucos quadros por segundo
  const frutRef = useRef<THREE.Mesh>(null)
  const passo = useRef(0)
  useFrame((st) => {
    if (++passo.current % 24 !== 0 || !frutRef.current) return
    const dx = st.camera.position.x - F.x, dz = st.camera.position.z - F.z
    const perto = dx * dx + dz * dz < 200 * 200
    if (frutRef.current.visible !== perto) frutRef.current.visible = perto
  })
  return (
    <>
      <group position={[F.x, yC, F.z]} rotation={[0, FEIRA_RUMO, 0]}>
        <mesh geometry={d.opaco} material={mats.m} />
        <mesh ref={frutRef} geometry={d.fruta} material={mats.m} />
        <mesh geometry={d.luz} material={mats.lamp} />
        <mesh geometry={d.textos} material={mats.placas} />
      </group>
      {alvo && <mesh position={[F.x, yC + 70, F.z]} material={mats.alvoF}><cylinderGeometry args={[2.4, 3.6, 140, 10, 1, true]} /></mesh>}
      {aberta && <FeiraBanca y={yC} />}
      {naCozinha && <CozinhaTony y={yCoz} />}
    </>
  )
}
