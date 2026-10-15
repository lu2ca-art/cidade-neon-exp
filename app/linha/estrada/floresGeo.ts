// As flores da Ella de verdade (referência do LU2CA: Garden Life — as
// espécies parecendo de verdade). Cada espécie vira UMA geometria (caule,
// folhas, pétalas e miolo juntos, com a cor em cada vértice): uma flor = um
// desenho na GPU, mesmo com 170 flores na cidade.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import type { Especie } from "./canteiros"

type Peca = THREE.BufferGeometry
const tinge = (g: Peca, cor: string, variar = 0): Peca => {
  const c = new THREE.Color(cor), n = g.attributes.position.count, arr = new Float32Array(n * 3)
  const pos = g.attributes.position
  let ymin = Infinity, ymax = -Infinity
  for (let i = 0; i < n; i++) { const y = pos.getY(i); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y) }
  for (let i = 0; i < n; i++) {
    // um degradê leve da base pra ponta (pétala mais clara na borda)
    const k = ymax > ymin ? (pos.getY(i) - ymin) / (ymax - ymin) : 0.5
    const f = 1 - variar + variar * 2 * k
    arr[i * 3] = Math.min(1, c.r * f); arr[i * 3 + 1] = Math.min(1, c.g * f); arr[i * 3 + 2] = Math.min(1, c.b * f)
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3))
  return g
}
const limpa = (g: Peca) => { for (const k of Object.keys(g.attributes)) if (!["position", "normal", "color"].includes(k)) g.deleteAttribute(k); return g }
const m4 = (p: [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r, "YXZ")), new THREE.Vector3(...s))
const posto = (g: Peca, m: THREE.Matrix4) => { g.applyMatrix4(m); return g }

// uma pétala: elipsoide achatado, com a base no ponto (0,0,0) e a ponta pra +y
const petala = (larg: number, comp: number, esp = 0.012) => { const g = new THREE.SphereGeometry(1, 8, 6); g.scale(larg, comp / 2, esp); g.translate(0, comp / 2, 0); return g }
const folha = (larg: number, comp: number) => { const g = new THREE.SphereGeometry(1, 8, 5); g.scale(larg, comp / 2, 0.008); g.translate(0, comp / 2, 0); return g }
const caule = (h: number, r = 0.018) => { const g = new THREE.CylinderGeometry(r * 0.8, r, h, 5); g.translate(0, h / 2, 0); return g }

// uma roseta de pétalas em volta do eixo y (abertura = quanto deita pra fora)
function roseta(n: number, larg: number, comp: number, abre: number, cor: string, y: number, giro0 = 0): Peca[] {
  return Array.from({ length: n }, (_, i) => {
    const a = giro0 + (i / n) * Math.PI * 2
    return tinge(posto(petala(larg, comp), m4([0, y, 0], [abre, a, 0])), cor, 0.18)
  })
}

const VERDE = "#2f6e3a", VERDE_CLARO = "#4c8a44"

export function geoFlor(e: Especie, cor: string, miolo: string, h: number): THREE.BufferGeometry {
  const p: Peca[] = [tinge(caule(h), VERDE, 0.15)]
  // folhas no caule, alternadas
  const folhas = e === "lavanda" ? 0 : e === "orquidea" ? 0 : e === "hortensia" ? 3 : 2
  for (let i = 0; i < folhas; i++) {
    const a = i * 2.4, y = h * (0.25 + i * 0.2)
    p.push(tinge(posto(folha(e === "girassol" || e === "hortensia" ? 0.11 : 0.05, e === "girassol" || e === "hortensia" ? 0.3 : 0.2), m4([0, y, 0], [1.0, a, 0])), VERDE_CLARO, 0.2))
  }
  const topo = (g: Peca[]) => g.map((x) => posto(x, m4([0, h, 0])))
  switch (e) {
    case "girassol": {
      // a cabeça inclinada: 22 pétalas compridas em duas voltas e o miolo
      const cab: Peca[] = [...roseta(12, 0.045, 0.2, Math.PI / 2 - 0.15, cor, 0), ...roseta(10, 0.04, 0.17, Math.PI / 2 - 0.3, cor, 0.01, 0.26)]
      const disco = new THREE.CylinderGeometry(0.11, 0.1, 0.05, 16); disco.translate(0, 0.02, 0); cab.push(tinge(disco, miolo, 0.3))
      cab.forEach((x) => x.applyMatrix4(m4([0, 0, 0.03], [-1.1, 0, 0])))
      p.push(...topo(cab)); break
    }
    case "rosa": {
      // três voltas de pétalas em concha, cada vez mais fechadas
      const r: Peca[] = [...roseta(5, 0.06, 0.12, 1.1, cor, 0), ...roseta(5, 0.05, 0.1, 0.6, cor, 0.01, 0.6), ...roseta(4, 0.04, 0.08, 0.25, miolo, 0.02, 1.1)]
      const sepala = roseta(5, 0.015, 0.06, 1.9, VERDE, -0.01)
      p.push(...topo([...r, ...sepala])); break
    }
    case "lavanda": {
      // a espiga: botões pequenos subindo em espiral
      const esp: Peca[] = []
      for (let i = 0; i < 26; i++) {
        const y = 0.02 + i * 0.012, a = i * 2.2, r = 0.022 * (1 - i / 34)
        const b = new THREE.SphereGeometry(0.014, 5, 4); b.translate(Math.cos(a) * r, y, Math.sin(a) * r); esp.push(tinge(b, i % 3 ? cor : miolo))
      }
      p.push(...topo(esp)); break
    }
    case "hortensia": {
      // a bola de florzinhas de 4 pétalas, azul puxando pro lilás
      const bola: Peca[] = [], k = new THREE.Color(cor), k2 = new THREE.Color(miolo)
      for (let i = 0; i < 34; i++) {
        const t = Math.acos(1 - (i + 0.5) / 34 * 1.6), a = i * 2.39996, r = 0.17
        const v = new THREE.Vector3(Math.sin(t) * Math.cos(a), Math.cos(t), Math.sin(t) * Math.sin(a)).multiplyScalar(r)
        const cor_i = "#" + k.clone().lerp(k2, (i % 5) / 5).getHexString()
        for (let j = 0; j < 4; j++) {
          const pt = petala(0.025, 0.045, 0.006)
          pt.applyMatrix4(m4([0, 0, 0], [Math.PI / 2 - 0.2, (j / 4) * Math.PI * 2, 0]))
          // orienta a florzinha pra fora da bola
          pt.applyMatrix4(new THREE.Matrix4().lookAt(new THREE.Vector3(), v, new THREE.Vector3(0, 1, 0)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)))
          pt.translate(v.x, v.y + 0.12, v.z)
          bola.push(tinge(pt, cor_i, 0.1))
        }
      }
      p.push(...topo(bola)); break
    }
    case "margarida": {
      const m: Peca[] = [...roseta(16, 0.018, 0.1, Math.PI / 2 - 0.1, cor, 0)]
      const d = new THREE.SphereGeometry(0.035, 10, 6); d.scale(1, 0.55, 1); m.push(tinge(d, miolo, 0.2))
      m.forEach((x) => x.applyMatrix4(m4([0, 0, 0.02], [-0.9, 0, 0])))
      p.push(...topo(m)); break
    }
    case "tulipa": {
      // a taça: 6 pétalas largas quase fechadas
      p.push(...topo([...roseta(3, 0.055, 0.15, 0.22, cor, 0), ...roseta(3, 0.055, 0.15, 0.3, cor, 0, Math.PI / 3)]))
      p.push(tinge(posto(folha(0.05, 0.42), m4([0, 0.05, 0], [0.35, 0.4, 0])), VERDE_CLARO, 0.2))
      break
    }
    case "orquidea": {
      // a haste em arco com três flores: 5 pétalas e o labelo
      const flor = (s: number) => {
        const f: Peca[] = [...roseta(5, 0.035 * s, 0.07 * s, Math.PI / 2, cor, 0)]
        const lab = petala(0.03 * s, 0.05 * s, 0.015); lab.applyMatrix4(m4([0, 0, 0.01], [Math.PI / 2 + 0.6, Math.PI, 0])); f.push(tinge(lab, miolo, 0.2))
        f.forEach((x) => x.applyMatrix4(m4([0, 0, 0], [-1.3, 0, 0])))
        return f
      }
      for (let i = 0; i < 3; i++) p.push(...flor(1 - i * 0.12).map((x) => posto(x, m4([0.06 + i * 0.07, h - i * 0.07, 0]))))
      for (let i = 0; i < 2; i++) p.push(tinge(posto(folha(0.06, 0.24), m4([0, 0.02, 0], [1.25, i * Math.PI, 0])), VERDE, 0.15))
      break
    }
  }
  const g = mergeGeometries(p.map((x) => limpa(x.index ? x : x)), false)!
  g.computeVertexNormals()
  return g
}
