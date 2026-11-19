"use client"

// OS PORTAIS DAS ENTRADAS (T61b, LU2CA 30/10: "não dá pra saber onde se entra,
// tá bugando a visão, muitas placas. Cada entrada ganha um pequeno portal").
//
// - o PORTAL: um arco pequeno de neon na cor da linha, por cima da alça de
//   saída, logo depois que ela se separa do anel (é ali que você "entra" na
//   linha). Em cima, o nome da linha, pequeno, de frente pra quem vem
// - antes (19/10–30/10) eram um portão grande com duas colunas de luz no fim de
//   cada alça e uma placa (pórtico) 45 m antes de cada saída, no anel: saíram.
//   Quem guia na rotatória são as linhas no chão (anel.ts)
// - pista apagada: o portal fica escuro e sem nome
//
// (desempenho) tudo em 3 malhas, nada por portal, sem luz extra: a base escura,
// o neon (cor por vértice) e os letreiros (um atlas de texto só). ~150
// triângulos por portal

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { MundoDisco } from "./mundoDisco"
import { pontoI } from "./pista"

export const PORTAL_CFG = {
  u: 40, // m depois do começo da alça de saída (onde ela já se separou do anel)
  raio: 5.6, // o arco (a alça tem 8,4 m: 2 faixas)
  tubo: 0.32, // a grossura do neon
  placa: [6.4, 1.4] as [number, number], // o nome, em cima do arco (largura, altura)
}

// o atlas: uma linha por letreiro (o nome grande, o detalhe embaixo)
function atlas(itens: { nome: string; sub: string; cor: string }[]) {
  const W = 512, H = 112
  const c = document.createElement("canvas")
  c.width = W; c.height = H * Math.max(1, itens.length)
  const g = c.getContext("2d")!
  g.textAlign = "center"; g.textBaseline = "middle"
  itens.forEach((it, r) => {
    const y = r * H
    g.fillStyle = "rgba(7,8,23,0.92)"; g.fillRect(0, y, W, H)
    g.fillStyle = it.cor; g.fillRect(0, y + H - 8, W, 8)
    // (T61b) sem detalhe embaixo: o nome sozinho, no meio
    const linhas = it.sub ? ([[it.nome.toUpperCase(), 54, 40, it.cor], [it.sub, 26, 84, "#ffffff"]] as const) : ([[it.nome.toUpperCase(), 62, 52, it.cor]] as const)
    for (const [txt, tam, cy, cor] of linhas) {
      g.font = `800 ${tam}px "Arial Narrow", "Helvetica Neue", system-ui, sans-serif`
      g.shadowColor = cor; g.shadowBlur = 18; g.fillStyle = cor
      g.fillText(txt, W / 2, y + cy, W * 0.94)
      g.shadowBlur = 0; g.fillStyle = "rgba(255,255,255,0.85)"
      g.fillText(txt, W / 2, y + cy, W * 0.94)
    }
  })
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return { t, n: Math.max(1, itens.length) }
}

// uma peça (geometria local) posta no mundo: em (x, y, z), virada pro rumo
function por(g: THREE.BufferGeometry, x: number, y: number, z: number, rumo: number, cor?: THREE.Color) {
  const m = new THREE.Matrix4().makeRotationY(rumo).setPosition(x, y, z)
  g.applyMatrix4(m)
  if (cor) {
    const n = g.attributes.position.count, c = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { c[i * 3] = cor.r; c[i * 3 + 1] = cor.g; c[i * 3 + 2] = cor.b }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3))
  }
  // (a estrutura escura recebe luz: fica com a normal; o neon e a luz não)
  if (cor) g.deleteAttribute("normal")
  g.deleteAttribute("uv")
  return g
}

// apagada: as vias das pistas que o ato ainda não abriu (portal escuro, sem nome)
export function Portoes({ M, apagada = null }: { M: MundoDisco; apagada?: boolean[] | null }) {
  const cena = useMemo(() => {
    const { vias, info, pistas } = M
    const estrutura: THREE.BufferGeometry[] = [], neon: THREE.BufferGeometry[] = [], letreiros: THREE.BufferGeometry[] = []
    const itens: { nome: string; sub: string; cor: string }[] = []
    const q = new THREE.Vector3()
    // um letreiro: um plano com a fatia r do atlas, nas duas faces
    const placa = (r: number, w: number, h: number, x: number, y: number, z: number, rumo: number) => {
      for (const vira of [0, Math.PI]) {
        const g = new THREE.PlaneGeometry(w, h)
        const uv = g.attributes.uv
        for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? r : r + 1) // (r/n depois, quando o atlas souber o n)
        g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, vira ? -0.12 : 0.12).premultiply(new THREE.Matrix4().makeRotationY(vira)))
        g.applyMatrix4(new THREE.Matrix4().makeRotationY(rumo).setPosition(x, y, z))
        g.deleteAttribute("normal")
        letreiros.push(g)
      }
    }
    const { u, raio, tubo, placa: [pw, ph] } = PORTAL_CFG
    // ── um portal em cada alça de saída (de todas as torres) ──
    vias.forEach((v, vi) => {
      const f = info[vi]
      if (f.parte !== "saida") return
      const p = pistas[f.pista], escuro = !!apagada?.[vi]
      const cor = escuro ? "#3a3850" : p.cor
      const i = Math.min(v.n - 1, Math.round(u / 2))
      // o meio da alça (ela tem só as 2 faixas da direita do eixo)
      pontoI(v, i, (v.esq[i] + v.dir[i]) / 2, 0, q)
      const rumo = Math.atan2(v.tx[i], v.tz[i])
      // o arco de neon (meia rosca de pé, atravessando a alça) e os dois pés escuros
      neon.push(por(new THREE.TorusGeometry(raio, tubo, 4, 18, Math.PI), q.x, q.y, q.z, rumo, new THREE.Color(cor)))
      for (const l of [-1, 1]) estrutura.push(por(new THREE.BoxGeometry(0.9, 0.5, 0.9).translate(l * raio, 0.25, 0), q.x, q.y, q.z, rumo))
      if (escuro) return
      const r = itens.push({ nome: p.nome, sub: "", cor }) - 1
      placa(r, pw, ph, q.x, q.y + raio + tubo + ph / 2 + 0.2, q.z, rumo)
    })
    const at = atlas(itens)
    // agora o v de cada letreiro: a fatia r ocupa [1 - (r+1)/n, 1 - r/n]
    for (const g of letreiros) {
      const uv = g.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i) / at.n)
    }
    const junta = (l: THREE.BufferGeometry[]) => (l.length ? mergeGeometries(l, false) : null)
    return { estrutura: junta(estrutura), neon: junta(neon), letreiros: junta(letreiros), tex: at.t }
  }, [M, apagada])
  useEffect(() => () => { for (const g of [cena.estrutura, cena.neon, cena.letreiros]) g?.dispose(); cena.tex.dispose() }, [cena])
  return (
    <group>
      {cena.estrutura && (
        <mesh geometry={cena.estrutura}>
          <meshStandardMaterial color="#1c1f3a" roughness={0.5} metalness={0.4} />
        </mesh>
      )}
      {cena.neon && (
        <mesh geometry={cena.neon}>
          <meshBasicMaterial vertexColors toneMapped={false} />
        </mesh>
      )}
      {cena.letreiros && (
        <mesh geometry={cena.letreiros}>
          <meshBasicMaterial map={cena.tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
