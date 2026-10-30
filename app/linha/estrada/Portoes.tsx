"use client"

// OS PORTÕES E AS PLACAS DA ROTATÓRIA (LU2CA 19/10, 2ª rodada: "destacar
// exatamente a entrada de cada via como se fosse um portão de entrada daquela
// pista"; "não tem sinalização"; "intuitivo saber pra onde temos que ir")
//
// - o PORTÃO: onde a alça vira a pista, nas duas pontas de cada linha. Atravessa
//   as 4 faixas, na cor da linha, com o nome e o BPM no alto (dos dois lados) e
//   duas colunas de luz que se veem de longe (da rotatória, do ar)
// - a PLACA: na rotatória (T61; antes, na espiral), 45 m antes de cada saída, um pórtico com o nome da
//   linha e a seta pra direita. A faixa da direita, pintada na cor da linha
//   (Corrida, geo.pintaSaida), leva até a saída
//
// (desempenho) tudo em 4 malhas, nada por portão: a estrutura escura, o neon
// (cor por vértice), os letreiros (um atlas de texto só) e a luz (aditiva)

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { MundoDisco } from "./mundoDisco"
import { PISTAS } from "./pistas"

const LARG = 8.4 + 1.6 // do eixo do tronco até cada pilar
const ALTO = 9.5 // a viga do portão
const ANTES = 45 // m antes da saída: a placa da rotatória (T61: as saídas do anel ficam a ~60 m uma da outra)
const LUZ = 150 // altura das colunas de luz

// o atlas: uma linha por letreiro (o nome grande, o detalhe embaixo)
function atlas(itens: { nome: string; sub: string; cor: string }[]) {
  const W = 512, H = 112
  const c = document.createElement("canvas")
  c.width = W; c.height = H * itens.length
  const g = c.getContext("2d")!
  g.textAlign = "center"; g.textBaseline = "middle"
  itens.forEach((it, r) => {
    const y = r * H
    g.fillStyle = "rgba(7,8,23,0.92)"; g.fillRect(0, y, W, H)
    g.fillStyle = it.cor; g.fillRect(0, y + H - 8, W, 8)
    for (const [txt, tam, cy, cor] of [[it.nome.toUpperCase(), 54, 40, it.cor], [it.sub, 26, 84, "#ffffff"]] as const) {
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
  return { t, n: itens.length }
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

// apagada: as vias das pistas que o ato ainda não abriu (portão sem luz, sem placa)
export function Portoes({ M, apagada = null }: { M: MundoDisco; apagada?: boolean[] | null }) {
  const cena = useMemo(() => {
    const { vias, info, pistas } = M
    const estrutura: THREE.BufferGeometry[] = [], neon: THREE.BufferGeometry[] = [], luz: THREE.BufferGeometry[] = [], letreiros: THREE.BufferGeometry[] = []
    const itens: { nome: string; sub: string; cor: string }[] = []
    const linhaDe = (k: number) => PISTAS.find((p) => p.faixa === pistas[k].nome)
    // um letreiro: um plano com a fatia r do atlas, nas duas faces
    const placa = (r: number, w: number, h: number, x: number, y: number, z: number, rumo: number) => {
      for (const vira of [0, Math.PI]) {
        const g = new THREE.PlaneGeometry(w, h)
        const uv = g.attributes.uv
        for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) > 0.5 ? r : r + 1) // (r/n depois, quando o atlas souber o n)
        g.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, vira ? -0.32 : 0.32).premultiply(new THREE.Matrix4().makeRotationY(vira)))
        g.applyMatrix4(new THREE.Matrix4().makeRotationY(rumo).setPosition(x, y, z))
        g.deleteAttribute("normal")
        letreiros.push(g)
      }
    }
    const pórtico = (x: number, y: number, z: number, rumo: number, larg: number, cor: THREE.Color, r: number, colunas: boolean) => {
      // dois pilares, a viga, o neon da linha contornando, o letreiro
      for (const l of [-1, 1]) {
        estrutura.push(por(new THREE.BoxGeometry(0.9, ALTO + 1.2, 0.9).translate(l * larg, (ALTO + 1.2) / 2, 0), x, y, z, rumo))
        neon.push(por(new THREE.BoxGeometry(0.22, ALTO + 1.2, 1.0).translate(l * (larg - 0.5), (ALTO + 1.2) / 2, 0), x, y, z, rumo, cor))
        if (colunas) {
          luz.push(por(new THREE.CylinderGeometry(1.5, 1.5, LUZ, 8, 1, true).translate(l * larg, ALTO + LUZ / 2, 0), x, y, z, rumo, cor.clone().multiplyScalar(0.28)))
          luz.push(por(new THREE.CylinderGeometry(0.35, 0.35, LUZ, 6, 1, true).translate(l * larg, ALTO + LUZ / 2, 0), x, y, z, rumo, cor.clone().multiplyScalar(0.9)))
        }
      }
      estrutura.push(por(new THREE.BoxGeometry(larg * 2 + 0.9, 1.0, 0.9).translate(0, ALTO + 0.7, 0), x, y, z, rumo))
      neon.push(por(new THREE.BoxGeometry(larg * 2 - 0.6, 0.22, 1.0).translate(0, ALTO, 0), x, y, z, rumo, cor))
      placa(r, Math.min(larg * 1.5, 15), 3.3, x + 0, y + ALTO + 2.9, z, rumo)
    }
    // ── os portões: no fim de cada alça de saída (o tronco vira a pista) ──
    vias.forEach((v, vi) => {
      const f = info[vi]
      if (f.parte !== "saida") return
      const p = pistas[f.pista], dados = linhaDe(f.pista), escuro = !!apagada?.[vi]
      const cor = escuro ? "#3a3850" : p.cor
      const r = itens.push({ nome: p.nome, sub: escuro ? "" : dados ? `${dados.bpm * 2} km/h · ${dados.personagem}` : "", cor }) - 1
      const i = v.n - 1
      pórtico(v.px[i], v.py[i], v.pz[i], Math.atan2(v.tx[i], v.tz[i]), LARG, new THREE.Color(cor), r, !escuro)
    })
    // ── (T61) as placas da rotatória: ANTES metros antes de cada saída, pelo anel ──
    for (const an of M.aneis) for (const sd of an.saidas) {
      if (sd.via < 0 || apagada?.[sd.via]) continue
      const U = (((sd.u - ANTES) % an.L) + an.L) % an.L
      let k = an.ini.findIndex((u0, q) => U >= u0 && U < u0 + vias[an.vias[q]].L)
      if (k < 0) k = 0
      const W = vias[an.vias[k]], i = Math.max(0, Math.min(W.n - 1, Math.round((U - an.ini[k]) / 2)))
      const p = pistas[sd.pista]
      const r = itens.push({ nome: `${p.nome}  ↗`, sub: "faixa da direita · sai", cor: p.cor }) - 1
      pórtico(W.px[i], W.py[i], W.pz[i], Math.atan2(W.tx[i], W.tz[i]), 8.4 + 1.4, new THREE.Color(p.cor), r, false)
    }
    const at = atlas(itens)
    // agora o v de cada letreiro: a fatia r ocupa [1 - (r+1)/n, 1 - r/n]
    for (const g of letreiros) {
      const uv = g.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i) / at.n)
    }
    const junta = (l: THREE.BufferGeometry[]) => (l.length ? mergeGeometries(l, false) : null)
    return { estrutura: junta(estrutura), neon: junta(neon), luz: junta(luz), letreiros: junta(letreiros), tex: at.t }
  }, [M, apagada])
  useEffect(() => () => { for (const g of [cena.estrutura, cena.neon, cena.luz, cena.letreiros]) g?.dispose(); cena.tex.dispose() }, [cena])
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
      {cena.luz && (
        <mesh geometry={cena.luz} frustumCulled={false}>
          <meshBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
