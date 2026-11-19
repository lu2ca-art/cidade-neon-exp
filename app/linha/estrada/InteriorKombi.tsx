"use client"

// O painel da Kombi de verdade, de dentro (primeira pessoa). Referência: a
// Corujinha/T1 e a Clipper customizadas: painel de lata na cor da pintura com
// o friso arredondado, velocímetro redondo num casulo na frente do motorista,
// volante grande de baquelite quase deitado (de ônibus), para-brisa dividido,
// câmbio comprido saindo do assoalho; e o kit da Kombi "irada": franja de
// pompom no alto do para-brisa, tapete felpudo no painel, a havaiana que
// dança nas curvas, o vasinho de flor e os adesivos.
//
// Desempenho: tudo o que é parado vira três malhas mescladas (fosco, cromo e
// brilho, cor por vértice); os pompons são uma malha instanciada. Mexe só o
// volante, o ponteiro, a havaiana e os pompons. Sem luz nova.
//
// Coordenadas no espaço do layout da Kombi (o grupo de cima já escala com
// ESCALA, que não é uniforme): as peças redondas desfazem a escala pra
// continuarem redondas na tela.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

type V3 = [number, number, number]

type Props = {
  escala: V3
  tinta: string // a pintura da Kombi (o painel é de lata pintada)
  neon: string // o neon da Kombi (o friso e o adesivo)
  volante: React.MutableRefObject<number> // -1.3..1.3
  vel: React.MutableRefObject<number> // m/s
  balanco: React.MutableRefObject<number> // aceleração lateral
  estatico?: boolean // as peças paradas (até o modelo do Blender chegar)
}

// o para-brisa dividido da Corujinha (a coluna no meio). Tira daqui se
// atrapalhar a estrada.
const PARABRISA_DIVIDIDO = true

const VOLANTE_POS: V3 = [-0.4, 0.74, -0.58]
const VOLANTE_INCLINA = -0.97 // quase deitado, de ônibus
const CASULO_POS: V3 = [-0.4, 0.865, -0.965]
const CASULO_INCLINA = 0.26 // virado pro olho
const HAVAIANA_POS: V3 = [-0.1, 0.822, -1.12]
const HAVAIANA_TAM = 1.7
const FRANJA_Y = 1.36
const FRANJA_Z = -1.29
const N_POMPOM = 28
const CORES_POMPOM = ["#ff3fb0", "#ffd23f", "#2fe8ff", "#ff7a2f", "#7dff5d", "#b38cff"]

// ─── montagem das malhas mescladas ──────────────────────────────────────────

function pinta(g: THREE.BufferGeometry, cor: string) {
  const c = new THREE.Color(cor)
  const n = g.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3))
  return g
}

function criaPoe(inv: THREE.Vector3) {
  const m = new THREE.Matrix4()
  const e = new THREE.Euler()
  // gira (em espaço de mundo), desfaz a escala se for redonda, e põe no lugar
  return (g: THREE.BufferGeometry, cor: string, pos: V3, rot: V3 = [0, 0, 0], redondo = false) => {
    if (rot[0] || rot[1] || rot[2]) g.applyMatrix4(m.makeRotationFromEuler(e.set(rot[0], rot[1], rot[2])))
    if (redondo) g.scale(inv.x, inv.y, inv.z)
    g.translate(pos[0], pos[1], pos[2])
    return pinta(g, cor)
  }
}

const junta = (l: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(l, false)!
  l.forEach((x) => x.dispose())
  return g
}

// ─── texturas (canvas, uma vez) ─────────────────────────────────────────────

function margarida(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = "#fffaf0"
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.42, r * 0.2, a, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = "#ffc21a"
  ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill()
}

function texturaPainel(tinta: string, neon: string) {
  const W = 768, H = 256
  const cv = document.createElement("canvas")
  cv.width = W; cv.height = H
  const ctx = cv.getContext("2d")!
  ctx.fillStyle = tinta
  ctx.fillRect(0, 0, W, H)
  // a lata pega luz em cima e escurece embaixo
  const gr = ctx.createLinearGradient(0, 0, 0, H)
  gr.addColorStop(0, "rgba(255,255,255,0.22)")
  gr.addColorStop(0.45, "rgba(255,255,255,0)")
  gr.addColorStop(1, "rgba(0,0,0,0.38)")
  ctx.fillStyle = gr
  ctx.fillRect(0, 0, W, H)
  // saia e blusa: embaixo do friso, o tom do neon escurecido
  const saia = new THREE.Color(neon).lerp(new THREE.Color("#1a1020"), 0.45)
  ctx.fillStyle = `#${saia.getHexString()}`
  ctx.fillRect(0, 104, W, H - 104)
  const sombra = ctx.createLinearGradient(0, 104, 0, H)
  sombra.addColorStop(0, "rgba(255,255,255,0.12)"); sombra.addColorStop(1, "rgba(0,0,0,0.35)")
  ctx.fillStyle = sombra; ctx.fillRect(0, 104, W, H - 104)
  // friso cromado + filete neon
  ctx.fillStyle = "#e9edf2"; ctx.fillRect(0, 96, W, 8)
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0, 104, W, 2)
  ctx.fillStyle = neon; ctx.fillRect(0, 86, W, 3)
  // adesivos
  margarida(ctx, 640, 168, 34)
  margarida(ctx, 712, 118, 20)
  margarida(ctx, 596, 214, 16)
  // paz e amor
  ctx.strokeStyle = neon; ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(700, 205, 24, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(700, 181); ctx.lineTo(700, 229)
  ctx.moveTo(700, 205); ctx.lineTo(683, 222); ctx.moveTo(700, 205); ctx.lineTo(717, 222); ctx.stroke()
  // "222" no lado do motorista
  ctx.font = "italic 900 54px system-ui, sans-serif"
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.lineWidth = 8; ctx.strokeStyle = "#1a1020"; ctx.strokeText("222", 110, 160)
  ctx.fillStyle = neon; ctx.fillText("222", 110, 160)
  // cinzeiro cromado
  ctx.fillStyle = "#c9cfd8"; ctx.fillRect(250, 120, 64, 22)
  ctx.fillStyle = "#6c727c"; ctx.fillRect(262, 128, 40, 5)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function texturaVelocimetro(neon: string) {
  const S = 256, c = S / 2
  const cv = document.createElement("canvas")
  cv.width = S; cv.height = S
  const ctx = cv.getContext("2d")!
  const gr = ctx.createRadialGradient(c, c * 0.8, 10, c, c, c)
  gr.addColorStop(0, "#fbf5e4"); gr.addColorStop(1, "#d9cdb0")
  ctx.fillStyle = gr
  ctx.beginPath(); ctx.arc(c, c, c, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = 6; ctx.strokeStyle = "#1b1712"
  ctx.beginPath(); ctx.arc(c, c, c - 4, 0, Math.PI * 2); ctx.stroke()
  // ângulo: 0 km/h a -135° (do alto, horário) até 240 a +135°
  const ang = (kmh: number) => ((-135 + (kmh / 240) * 270) * Math.PI) / 180 - Math.PI / 2
  // a faixa do turbo
  ctx.lineWidth = 12; ctx.strokeStyle = neon
  ctx.beginPath(); ctx.arc(c, c, c - 22, ang(160), ang(240)); ctx.stroke()
  ctx.strokeStyle = "#1b1712"; ctx.fillStyle = "#1b1712"
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.font = "bold 22px system-ui, sans-serif"
  for (let k = 0; k <= 240; k += 10) {
    const a = ang(k), maior = k % 40 === 0
    const r1 = c - 14, r0 = r1 - (maior ? 20 : 10)
    ctx.lineWidth = maior ? 5 : 2.5
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0)
    ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1)
    ctx.stroke()
    if (maior) ctx.fillText(String(k), c + Math.cos(a) * (r0 - 22), c + Math.sin(a) * (r0 - 22))
  }
  ctx.font = "bold 15px system-ui, sans-serif"
  ctx.fillText("km/h", c, c + 44)
  ctx.font = "italic 900 20px system-ui, sans-serif"
  ctx.fillStyle = neon; ctx.fillText("222", c, c + 70)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// ─── o componente ───────────────────────────────────────────────────────────

// a lata pintada nunca é branco puro: com a luz da frente ela estourava
export const lata = (tinta: string) => `#${new THREE.Color(tinta).lerp(new THREE.Color("#8a8a98"), 0.22).getHexString()}`

export function InteriorKombi({ escala, tinta: tintaPura, neon, volante, vel, balanco, estatico = true }: Props) {
  const tinta = lata(tintaPura)
  const inv = useMemo(() => new THREE.Vector3(1 / escala[0], 1 / escala[1], 1 / escala[2]), [escala])

  const geo = useMemo(() => {
    const poe = criaPoe(inv)
    const fosco: THREE.BufferGeometry[] = []
    const cromo: THREE.BufferGeometry[] = []
    const brilho: THREE.BufferGeometry[] = []
    const vinil = "#231a1f", marfim = "#ddd2b8", madeira = "#8a5a2b", pele = "#c99b76"
    const cromado = "#d7dde6"

    // painel: frente de lata pintada, tampo de vinil, friso arredondado
    fosco.push(poe(new THREE.BoxGeometry(1.66, 0.46, 0.04), tinta, [0, 0.54, -0.89]))
    fosco.push(poe(new THREE.BoxGeometry(1.66, 0.04, 0.47), vinil, [0, 0.79, -1.105]))
    fosco.push(poe(new THREE.CylinderGeometry(0.035, 0.035, 1.66, 16), vinil, [0, 0.79, -0.875], [0, 0, Math.PI / 2]))
    // o casulo do velocímetro
    fosco.push(poe(new THREE.CylinderGeometry(0.095, 0.1, 0.075, 28), tinta, CASULO_POS, [Math.PI / 2 - CASULO_INCLINA, 0, 0], true))
    cromo.push(poe(new THREE.TorusGeometry(0.083, 0.008, 8, 32), cromado, [CASULO_POS[0], CASULO_POS[1] + 0.008, CASULO_POS[2] + 0.028], [-CASULO_INCLINA, 0, 0], true))

    // para-brisa: soleira, colunas, travessa de cima (e a coluna do meio)
    fosco.push(poe(new THREE.BoxGeometry(1.66, 0.04, 0.06), tinta, [0, 0.82, -1.33]))
    for (const x of [-0.8, 0.8]) fosco.push(poe(new THREE.BoxGeometry(0.07, 0.6, 0.07), tinta, [x, 1.11, -1.34]))
    fosco.push(poe(new THREE.BoxGeometry(1.66, 0.08, 0.1), tinta, [0, 1.42, -1.35]))
    if (PARABRISA_DIVIDIDO) fosco.push(poe(new THREE.BoxGeometry(0.03, 0.58, 0.03), tinta, [0, 1.11, -1.335]))
    // a frente fechada: forro do teto até a porta, trilhos, coluna da porta,
    // o quebra-vento (vareta cromada) e o canto de lata embaixo dele
    fosco.push(poe(new THREE.BoxGeometry(1.74, 0.03, 0.5), "#e6cba0", [0, 1.46, -1.15]))
    for (const x of [-0.85, 0.85]) {
      fosco.push(poe(new THREE.BoxGeometry(0.06, 0.08, 0.5), tinta, [x, 1.41, -1.14]))
      fosco.push(poe(new THREE.BoxGeometry(0.06, 0.64, 0.06), tinta, [x, 1.09, -0.93]))
      fosco.push(poe(new THREE.BoxGeometry(0.06, 0.04, 0.45), tinta, [x, 0.79, -1.12]))
      fosco.push(poe(new THREE.BoxGeometry(0.03, 0.5, 0.45), tinta, [x * 1.012, 0.54, -1.12]))
      cromo.push(poe(new THREE.BoxGeometry(0.018, 0.56, 0.018), cromado, [x, 1.09, -1.13]))
    }
    // quebra-sóis rebatidos
    fosco.push(poe(new THREE.BoxGeometry(0.46, 0.014, 0.17), marfim, [-0.42, 1.372, -1.2]))
    fosco.push(poe(new THREE.BoxGeometry(0.42, 0.014, 0.17), marfim, [0.42, 1.372, -1.2]))
    // a fita da franja
    fosco.push(poe(new THREE.BoxGeometry(1.52, 0.024, 0.01), "#d0213a", [0, FRANJA_Y + 0.012, FRANJA_Z]))

    // o felpudo do painel é do pelo (EstudioKombi)

    // portas: tampo de madeira dos dois lados, forro capitonê, apoio de braço,
    // maçaneta e a manivela do vidro do motorista
    for (const x of [-0.855, 0.855]) fosco.push(poe(new THREE.BoxGeometry(0.05, 0.03, 2.7), madeira, [x, 0.77, 0.4]))
    fosco.push(poe(new THREE.BoxGeometry(0.012, 0.3, 0.8), "#8f3550", [-0.857, 0.48, -0.45]))
    for (let k = 0; k < 7; k++) fosco.push(poe(new THREE.BoxGeometry(0.01, 0.28, 0.012), "#a8445f", [-0.85, 0.48, -0.8 + k * 0.115]))
    fosco.push(poe(new THREE.BoxGeometry(0.06, 0.05, 0.42), marfim, [-0.83, 0.64, -0.2]))
    cromo.push(poe(new THREE.BoxGeometry(0.015, 0.02, 0.1), cromado, [-0.842, 0.61, -0.75]))
    cromo.push(poe(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 14), cromado, [-0.845, 0.7, -0.62], [0, 0, Math.PI / 2], true))
    cromo.push(poe(new THREE.BoxGeometry(0.01, 0.012, 0.09), cromado, [-0.836, 0.7, -0.58]))
    fosco.push(poe(new THREE.CylinderGeometry(0.011, 0.011, 0.035, 10), marfim, [-0.82, 0.7, -0.54], [0, 0, Math.PI / 2], true))

    // câmbio comprido do assoalho, coifa de borracha e bola de cristal
    const base: V3 = [0.06, 0.27, -0.66], topo: V3 = [0.06, 0.7, -0.47]
    const dy = (topo[1] - base[1]) * escala[1], dz = (topo[2] - base[2]) * escala[2]
    fosco.push(poe(new THREE.ConeGeometry(0.05, 0.08, 14, 1, true), "#111014", [base[0], base[1] + 0.03, base[2]], [0, 0, 0], true))
    cromo.push(poe(new THREE.CylinderGeometry(0.008, 0.009, Math.hypot(dy, dz), 8), cromado,
      [(base[0] + topo[0]) / 2, (base[1] + topo[1]) / 2, (base[2] + topo[2]) / 2], [Math.atan2(dz, dy), 0, 0], true))
    brilho.push(poe(new THREE.SphereGeometry(0.033, 18, 14), "#ff6ac1", topo, [0, 0, 0], true))

    // chave no contato, com o chaveirinho de coração
    cromo.push(poe(new THREE.BoxGeometry(0.022, 0.03, 0.008), cromado, [-0.63, 0.66, -0.864]))
    brilho.push(poe(new THREE.SphereGeometry(0.014, 10, 8), neon, [-0.63, 0.6, -0.858], [0, 0, 0], true))
    cromo.push(poe(new THREE.BoxGeometry(0.002, 0.045, 0.002), cromado, [-0.63, 0.628, -0.86]))

    // vasinho de flor no canto (o da Kombi/Fusca de fábrica)
    const vaso: V3 = [-0.7, 0.81, -1.2]
    cromo.push(poe(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 14), cromado, [vaso[0], vaso[1] + 0.01, vaso[2]], [0, 0, 0], true))
    fosco.push(poe(new THREE.CylinderGeometry(0.014, 0.02, 0.09, 14), "#9fe6ff", [vaso[0], vaso[1] + 0.055, vaso[2]], [0, 0, 0], true))
    fosco.push(poe(new THREE.CylinderGeometry(0.0025, 0.0025, 0.07, 6), "#3c8a2e", [vaso[0], vaso[1] + 0.12, vaso[2]], [0, 0, 0], true))
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      brilho.push(poe(new THREE.SphereGeometry(0.011, 8, 6).scale(1.8, 0.7, 0.5), "#fffaf0",
        [vaso[0] + (Math.cos(a) * 0.018) / escala[0], vaso[1] + 0.16 + (Math.sin(a) * 0.018) / escala[1], vaso[2] + 0.01], [0.3, 0, a], true))
    }
    brilho.push(poe(new THREE.SphereGeometry(0.009, 10, 8), "#ffc21a", [vaso[0], vaso[1] + 0.16, vaso[2] + 0.014], [0, 0, 0], true))

    // a havaiana: base, pernas e saia de palha (o tronco mexe, vai à parte)
    const h = HAVAIANA_POS, k = HAVAIANA_TAM
    fosco.push(poe(new THREE.CylinderGeometry(0.028 * k, 0.03 * k, 0.01 * k, 18), "#1b1712", [h[0], h[1] + 0.005 * k, h[2]], [0, 0, 0], true))
    for (const x of [-0.008, 0.008]) fosco.push(poe(new THREE.CylinderGeometry(0.005 * k, 0.006 * k, 0.05 * k, 8), pele, [h[0] + x * k, h[1] + 0.03 * k, h[2]], [0, 0, 0], true))
    fosco.push(poe(new THREE.ConeGeometry(0.032 * k, 0.05 * k, 16, 1, true), "#4fa83a", [h[0], h[1] + 0.06 * k, h[2]], [0, 0, 0], true))

    // ── o volante (gira inteiro) e a coluna (parada) ──
    const pv = (g: THREE.BufferGeometry, cor: string, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]) => {
      if (rot[0] || rot[1] || rot[2]) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)))
      g.translate(...pos)
      return pinta(g, cor)
    }
    const volF: THREE.BufferGeometry[] = [], volC: THREE.BufferGeometry[] = [], volB: THREE.BufferGeometry[] = []
    volF.push(pv(new THREE.TorusGeometry(0.2, 0.015, 12, 56), marfim))
    // dois raios caídos, como na T1
    for (const a of [-0.35, Math.PI + 0.35]) {
      volF.push(pv(new THREE.BoxGeometry(0.15, 0.022, 0.01), marfim, [Math.cos(a) * 0.12, Math.sin(a) * 0.12, -0.004], [0, 0, a]))
    }
    volF.push(pv(new THREE.CylinderGeometry(0.052, 0.056, 0.03, 24), marfim, [0, 0, 0.004], [Math.PI / 2, 0, 0]))
    // o aro da buzina, meia-lua cromada em cima
    volC.push(pv(new THREE.TorusGeometry(0.13, 0.005, 6, 32, Math.PI), cromado, [0, 0, 0.012]))
    volC.push(pv(new THREE.TorusGeometry(0.05, 0.005, 6, 24), cromado, [0, 0, 0.02]))
    // a flor da buzina (a do LU2CA)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      volB.push(pv(new THREE.CircleGeometry(0.02, 12).scale(1, 1.6, 1), k % 2 ? "#ffcc00" : "#ff5fae",
        [Math.cos(a + Math.PI / 2) * 0.025, Math.sin(a + Math.PI / 2) * 0.025, 0.021], [0, 0, a]))
    }
    volB.push(pv(new THREE.CircleGeometry(0.012, 14), "#22ff88", [0, 0, 0.022]))
    const coluna = [
      pv(new THREE.CylinderGeometry(0.024, 0.03, 0.46, 12), vinil, [0, 0, -0.24], [Math.PI / 2, 0, 0]),
      pv(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 14), "#e1d7c0", [0, 0, -0.03], [Math.PI / 2, 0, 0]),
    ]

    // ── o tronco da havaiana (pivô no quadril) ──
    const tronco = [
      pv(new THREE.CapsuleGeometry(0.011, 0.024, 4, 10), pele, [0, 0.016, 0]),
      pv(new THREE.TorusGeometry(0.014, 0.005, 6, 16), "#ff5fae", [0, 0.028, 0], [Math.PI / 2, 0, 0]),
      pv(new THREE.SphereGeometry(0.014, 14, 10), pele, [0, 0.05, 0]),
      pv(new THREE.SphereGeometry(0.0145, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), "#1b1112", [0, 0.052, -0.002]),
      pv(new THREE.SphereGeometry(0.005, 8, 6), "#ff3fb0", [0.011, 0.058, 0.004]),
      // braços pro alto, mexendo
      pv(new THREE.CapsuleGeometry(0.004, 0.03, 3, 6), pele, [-0.02, 0.04, 0.004], [0, 0, 0.7]),
      pv(new THREE.CapsuleGeometry(0.004, 0.03, 3, 6), pele, [0.02, 0.04, 0.004], [0, 0, -0.7]),
    ]

    // ── pompom: fio + bola, pivô em cima ──
    const pompom = junta([
      pv(new THREE.CylinderGeometry(0.0018, 0.0018, 0.04, 4), "#ffffff", [0, -0.02, 0]),
      pv(new THREE.SphereGeometry(0.027, 10, 8), "#ffffff", [0, -0.062, 0]),
    ])
    pompom.deleteAttribute("color")

    return {
      fosco: junta(fosco), cromo: junta(cromo), brilho: junta(brilho),
      volF: junta(volF), volC: junta(volC), volB: junta(volB), coluna: junta(coluna),
      tronco: junta(tronco), pompom,
    }
  }, [inv, escala, tinta, neon])

  const mats = useMemo(() => ({
    fosco: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.12 }),
    cromo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.75 }),
    brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    pompom: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
  }), [])
  const matPainel = useMemo(() => {
    const t = texturaPainel(tinta, neon)
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.06, roughness: 0.38, metalness: 0.1 })
  }, [tinta, neon])
  const matVelo = useMemo(() => {
    const t = texturaVelocimetro(neon)
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#fff3d0", emissiveIntensity: 0.45, roughness: 0.3 })
  }, [neon])

  useEffect(() => () => { Object.values(geo).forEach((g) => g.dispose()) }, [geo])
  useEffect(() => () => { Object.values(mats).forEach((m) => { (m as THREE.MeshStandardMaterial).map?.dispose(); m.dispose() }) }, [mats])
  useEffect(() => () => { matPainel.map?.dispose(); matPainel.dispose() }, [matPainel])
  useEffect(() => () => { matVelo.map?.dispose(); matVelo.dispose() }, [matVelo])

  const giro = useRef<THREE.Group>(null)
  const ponteiro = useRef<THREE.Group>(null)
  const quadril = useRef<THREE.Group>(null)
  const franja = useRef<THREE.InstancedMesh>(null)
  const pend = useRef({ a: 0, w: 0, agulha: 0 })

  // as cores dos pompons (uma vez)
  useEffect(() => {
    const f = franja.current
    if (!f) return
    const c = new THREE.Color()
    for (let i = 0; i < N_POMPOM; i++) f.setColorAt(i, c.set(CORES_POMPOM[i % CORES_POMPOM.length]))
    if (f.instanceColor) f.instanceColor.needsUpdate = true
  }, [])

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3() }), [])

  useFrame((st, dtRaw) => {
    const dt = Math.min(0.05, dtRaw)
    const t = st.clock.elapsedTime
    const p = pend.current
    p.w += (-p.a * 26 - p.w * 2.6 + balanco.current * 1.1) * dt
    p.a += p.w * dt
    const a = Math.max(-0.8, Math.min(0.8, p.a))
    const v = Math.abs(vel.current)
    const trepida = Math.min(1, v / 25)

    if (giro.current) giro.current.rotation.z = -volante.current * 1.6
    // ponteiro: 0 km/h a -135°, 240 a +135°, tremendo de leve
    const kmh = Math.min(250, v * 3.6)
    p.agulha += (kmh - p.agulha) * Math.min(1, dt * 6)
    if (ponteiro.current) ponteiro.current.rotation.z = ((135 - (p.agulha / 240) * 270) * Math.PI) / 180 + Math.sin(t * 31) * 0.006 * trepida
    if (quadril.current) {
      quadril.current.rotation.z = -a * 0.9 + Math.sin(t * 7) * 0.12 * trepida
      quadril.current.rotation.x = Math.sin(t * 3.5) * 0.06 * trepida
    }
    const f = franja.current
    if (f) {
      const { m, q, e, p: pos, s } = tmp
      s.set(inv.x, inv.y, inv.z)
      for (let i = 0; i < N_POMPOM; i++) {
        const x = -0.74 + (i / (N_POMPOM - 1)) * 1.48
        const h = ((i * 37) % 11) / 11
        const ang = a * (0.75 + h * 0.5) + Math.sin(t * (9 + h * 4) + i) * 0.07 * trepida
        q.setFromEuler(e.set(Math.sin(t * 5 + i * 0.7) * 0.05 * trepida, 0, ang))
        m.compose(pos.set(x, FRANJA_Y, FRANJA_Z), q, s)
        f.setMatrixAt(i, m)
      }
      f.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      {estatico && (
        <>
          <mesh geometry={geo.fosco} material={mats.fosco} />
          <mesh geometry={geo.cromo} material={mats.cromo} />
          <mesh geometry={geo.brilho} material={mats.brilho} />
        </>
      )}
      {/* a frente do painel, com os adesivos */}
      <mesh position={[0, 0.54, -0.8685]} material={matPainel}>
        <planeGeometry args={[1.66, 0.46]} />
      </mesh>
      {/* velocímetro */}
      <group position={CASULO_POS}>
        <group scale={[inv.x, inv.y, inv.z]} rotation-x={-CASULO_INCLINA}>
          <mesh position={[0, 0, 0.039]} material={matVelo}>
            <circleGeometry args={[0.078, 40]} />
          </mesh>
          <group ref={ponteiro} position={[0, 0, 0.042]}>
            <mesh position={[0, 0.03, 0]}>
              <boxGeometry args={[0.005, 0.068, 0.002]} />
              <meshBasicMaterial color="#ff2d2d" toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      {/* volante */}
      <group position={VOLANTE_POS}>
        <group scale={[inv.x, inv.y, inv.z]} rotation-x={VOLANTE_INCLINA}>
          <mesh geometry={geo.coluna} material={mats.fosco} />
          <group ref={giro}>
            <mesh geometry={geo.volF} material={mats.fosco} />
            <mesh geometry={geo.volC} material={mats.cromo} />
            <mesh geometry={geo.volB} material={mats.brilho} />
          </group>
        </group>
      </group>
      {/* havaiana (o tronco requebra) */}
      <group position={[HAVAIANA_POS[0], HAVAIANA_POS[1] + 0.085 * HAVAIANA_TAM, HAVAIANA_POS[2]]}>
        <group scale={[inv.x * HAVAIANA_TAM, inv.y * HAVAIANA_TAM, inv.z * HAVAIANA_TAM]}>
          <group ref={quadril}>
            <mesh geometry={geo.tronco} material={mats.fosco} />
          </group>
        </group>
      </group>
      {/* franja de pompom */}
      <instancedMesh ref={franja} args={[geo.pompom, mats.pompom, N_POMPOM]} frustumCulled={false} />
    </group>
  )
}
