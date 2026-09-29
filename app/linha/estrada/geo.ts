// Geometrias e texturas procedurais da estrada — tudo gerado uma vez, na
// montagem da cena. Nenhum arquivo de modelo, nenhuma imagem baixada.

import * as THREE from "three"
import { PASSO, pontoI, type Pista } from "./pista"

type Lado = number | ((v: Pista, i: number) => number)
const lado = (l: Lado, v: Pista, i: number) => (typeof l === "number" ? l : l(v, i))

// faixa (ribbon) ao longo de várias vias entre dois deslocamentos laterais
// (fixos ou por amostra — a pista abre na bifurcação), deitada junto com a
// inclinação da curva. Tudo numa malha só: uma draw call por tipo de faixa.
export function fita(
  vias: Pista[],
  x0: Lado,
  x1: Lado,
  dy: number,
  opts: { incluir?: (v: Pista, i: number) => boolean; cor?: (v: Pista, i: number) => [number, number, number]; vertical?: boolean; uvEscala?: number } = {},
) {
  const pos: number[] = []
  const uv: number[] = []
  const cor: number[] = []
  const idx: number[] = []
  const esc = opts.uvEscala ?? 16
  const q = new THREE.Vector3()
  for (const p of vias) {
    const fim = p.fechada ? p.n : p.n - 1
    for (let i = 0; i < fim; i++) {
      if (opts.incluir && !opts.incluir(p, i)) continue
      const j = (i + 1) % p.n
      const b = pos.length / 3
      for (const k of [i, j]) {
        const a0 = lado(x0, p, k)
        if (opts.vertical) {
          // parede: x0 = lateral, dy = base, x1 = altura
          pontoI(p, k, a0, dy, q)
          pos.push(q.x, q.y, q.z, q.x, q.y + lado(x1, p, k), q.z)
        } else {
          pontoI(p, k, a0, dy, q)
          pos.push(q.x, q.y, q.z)
          pontoI(p, k, lado(x1, p, k), dy, q)
          pos.push(q.x, q.y, q.z)
        }
      }
      const u0 = (i * PASSO) / esc
      const u1 = ((i + 1) * PASSO) / esc
      uv.push(0, u0, 1, u0, 0, u1, 1, u1)
      const c = opts.cor ? opts.cor(p, i) : [1, 1, 1]
      for (let k = 0; k < 4; k++) cor.push(c[0], c[1], c[2])
      idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute("color", new THREE.Float32BufferAttribute(cor, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w
  c.height = h
  return [c, c.getContext("2d")!] as const
}

// asfalto molhado: grão escuro + poças que refletem (mais claras e lisas)
export function texAsfalto() {
  const [c, g] = canvas(256, 512)
  g.fillStyle = "#15162c"
  g.fillRect(0, 0, 256, 512)
  for (let i = 0; i < 9000; i++) {
    const v = 16 + Math.random() * 22
    g.fillStyle = `rgba(${v},${v},${v + 14},0.5)`
    g.fillRect(Math.random() * 256, Math.random() * 512, 1.5, 1.5)
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 512
    const r = 14 + Math.random() * 40
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, "rgba(70,90,170,0.35)")
    gr.addColorStop(1, "rgba(70,90,170,0)")
    g.fillStyle = gr
    g.beginPath()
    g.ellipse(x, y, r * 0.6, r, 0, 0, Math.PI * 2)
    g.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

// janelas acesas pros prédios
export function texJanelas() {
  const [c, g] = canvas(128, 256)
  g.fillStyle = "#000"
  g.fillRect(0, 0, 128, 256)
  const cores = ["#ffcf8a", "#ffd9a8", "#2fe8ff", "#ff3fb0", "#b38cff", "#ffe6c4"]
  for (let y = 6; y < 250; y += 9)
    for (let x = 5; x < 124; x += 8) {
      if (Math.random() < 0.38) {
        g.globalAlpha = 0.35 + Math.random() * 0.65
        g.fillStyle = Math.random() < 0.8 ? cores[Math.floor(Math.random() * 2)] : cores[2 + Math.floor(Math.random() * 4)]
        g.fillRect(x, y, 4, 5)
      }
    }
  g.globalAlpha = 1
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// brilho radial (postes, orbs, reflexos)
export function texBrilho() {
  const [c, g] = canvas(64, 64)
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, "rgba(255,255,255,1)")
  gr.addColorStop(0.25, "rgba(255,255,255,0.55)")
  gr.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = gr
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

// setas do turbo no chão
export function texTurbo() {
  const [c, g] = canvas(64, 128)
  g.clearRect(0, 0, 64, 128)
  g.strokeStyle = "#fff"
  g.lineWidth = 9
  g.lineCap = "round"
  for (let k = 0; k < 3; k++) {
    const y = 26 + k * 38
    g.beginPath()
    g.moveTo(10, y + 16)
    g.lineTo(32, y)
    g.lineTo(54, y + 16)
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapT = THREE.RepeatWrapping
  return t
}

// texto em neon pra um plano (placas, portais das estações)
export function texTexto(linhas: { txt: string; tam: number; cor: string; fonte?: string }[], w = 1024, h = 256) {
  const [c, g] = canvas(w, h)
  g.clearRect(0, 0, w, h)
  g.textAlign = "center"
  g.textBaseline = "middle"
  const total = linhas.reduce((s, l) => s + l.tam, 0)
  let y = (h - total) / 2
  for (const l of linhas) {
    // Outward é fina demais pra ler de longe numa textura — no 3D vai uma
    // condensada pesada; a Outward fica pra interface
    g.font = l.fonte ?? `800 ${l.tam}px "Arial Narrow", "Helvetica Neue", system-ui, sans-serif`
    if (l.fonte) g.font = `${l.tam}px ${l.fonte}`
    g.shadowColor = l.cor
    g.shadowBlur = 24
    g.fillStyle = l.cor
    g.fillText(l.txt, w / 2, y + l.tam / 2, w * 0.94)
    g.shadowBlur = 0
    g.fillStyle = "rgba(255,255,255,0.85)"
    g.fillText(l.txt, w / 2, y + l.tam / 2, w * 0.94)
    y += l.tam
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
