"use client"

// A Kombi por dentro, do motorista pra trás: um estúdio de van (referência do
// LU2CA, 22/10: o short do estúdio na van, teto de tábuas, paredes de ripas,
// sofá com manta xadrez felpuda, a mesa no fundo com o vidro de trás aberto
// pra paisagem) nas cores da Linha: rosa, magenta, azul e verde-água.
//
// A frente continua carro (as janelas das portas abertas pra estrada); o teto
// tem uma claraboia em cima dos bancos da frente pra não perder o céu.
//
// Desempenho: o que é parado vira três malhas mescladas (fosco, cromo,
// brilho). O pelo (manta, capas, tapetes, o felpudo do painel) é uma malha
// só, desenhada três vezes: a base e duas "cascas" infladas pela normal com
// fios recortados (alphaTest, sem transparência). Sem luz nova.

import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

type V3 = [number, number, number]

const ROSA = "#ff8fc8", MAGENTA = "#d81f86", AZUL = "#3a7bff", AGUA = "#6ff0d6"
const BETULA = ["#ecd3ab", "#e4c79c", "#f0dab8"]
const BRANCO = "#e2dad2", FELTRO = "#8e1a64"

function pinta(g: THREE.BufferGeometry, cor: string) {
  const c = new THREE.Color(cor)
  const n = g.attributes.position.count
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3))
  return g
}

// UV pelo espaço (não pela face): o fio tem o mesmo tamanho na manta e na almofada
export function uvNoEspaco(g: THREE.BufferGeometry, dens: number) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i))
    if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i) * dens, p.getY(i) * dens)
    else if (ay >= az) uv.setXY(i, p.getX(i) * dens, p.getZ(i) * dens)
    else uv.setXY(i, p.getX(i) * dens, p.getY(i) * dens)
  }
  uv.needsUpdate = true
  return g
}

const junta = (l: THREE.BufferGeometry[]) => {
  const g = mergeGeometries(l, false)!
  l.forEach((x) => x.dispose())
  return g
}

export function texturaFios() {
  const S = 128
  const cv = document.createElement("canvas")
  cv.width = S; cv.height = S
  const ctx = cv.getContext("2d")!
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 1500; i++) {
    const v = 120 + Math.random() * 135
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.beginPath(); ctx.arc(Math.random() * S, Math.random() * S, 0.8 + Math.random() * 1.1, 0, Math.PI * 2); ctx.fill()
  }
  const t = new THREE.CanvasTexture(cv)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function texturaTom() {
  const S = 128
  const cv = document.createElement("canvas")
  cv.width = S; cv.height = S
  const ctx = cv.getContext("2d")!
  ctx.fillStyle = "#d8d8d8"; ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 2400; i++) {
    const v = 170 + Math.random() * 85
    ctx.fillStyle = `rgb(${v},${v},${v})`
    ctx.fillRect(Math.random() * S, Math.random() * S, 1.2, 1.5 + Math.random() * 3)
  }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

// a tela do monitor: um programa de música com as faixas coloridas
function texturaDAW() {
  const W = 512, H = 256
  const cv = document.createElement("canvas")
  cv.width = W; cv.height = H
  const ctx = cv.getContext("2d")!
  ctx.fillStyle = "#11121a"; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = "#1d2030"; ctx.fillRect(0, 0, W, 18); ctx.fillRect(0, 0, 70, H)
  ctx.fillStyle = "#3b3f55"
  for (let x = 70; x < W; x += 24) ctx.fillRect(x, 4, 1, 10)
  const cores = [ROSA, MAGENTA, AZUL, AGUA, "#ffd23f", ROSA, AGUA, AZUL]
  for (let r = 0; r < 8; r++) {
    const y = 24 + r * 28
    ctx.fillStyle = cores[r]; ctx.fillRect(6, y + 4, 8, 16)
    ctx.fillStyle = "#3b3f55"; ctx.fillRect(18, y + 9, 44, 5)
    let x = 72 + ((r * 37) % 40)
    while (x < W - 20) {
      const w = 40 + ((x * 7 + r * 13) % 90)
      ctx.fillStyle = cores[r]; ctx.globalAlpha = 0.85
      ctx.fillRect(x, y, Math.min(w, W - x - 4), 24)
      ctx.globalAlpha = 1
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let k = 0; k < Math.min(w, W - x - 4); k += 3) ctx.lineTo(x + k, y + 12 + Math.sin(k * 0.4 + r) * (4 + ((k * 13) % 7)))
      ctx.stroke()
      x += w + 10
    }
  }
  ctx.fillStyle = "#ffffff"; ctx.fillRect(300, 18, 2, H)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function concha(off: number, corte: number, fios: THREE.Texture, tom: THREE.Texture) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: tom, alphaMap: fios, alphaTest: corte, roughness: 1 })
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>\ntransformed += objectNormal * ${off.toFixed(4)};`)
  }
  m.customProgramCacheKey = () => `concha-${off}`
  return m
}

// estatico: as peças paradas desenhadas aqui (enquanto o modelo do Blender,
// InteriorModelado, não chega); a tela do monitor é sempre daqui
type Props = { escala: V3; tinta: string; estatico?: boolean }

export function EstudioKombi({ escala, tinta, estatico = true }: Props) {
  const geo = useMemo(() => {
    if (!estatico) return null
    const inv = new THREE.Vector3(1 / escala[0], 1 / escala[1], 1 / escala[2])
    const m = new THREE.Matrix4(), e = new THREE.Euler()
    const poe = (g: THREE.BufferGeometry, cor: string, pos: V3, rot: V3 = [0, 0, 0], redondo = false) => {
      if (rot[0] || rot[1] || rot[2]) g.applyMatrix4(m.makeRotationFromEuler(e.set(rot[0], rot[1], rot[2])))
      if (redondo) g.scale(inv.x, inv.y, inv.z)
      g.translate(pos[0], pos[1], pos[2])
      return pinta(g, cor)
    }
    const cx = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d)
    const fosco: THREE.BufferGeometry[] = [], cromo: THREE.BufferGeometry[] = [], brilho: THREE.BufferGeometry[] = []
    const pelo: THREE.BufferGeometry[] = []
    const felpa = (g: THREE.BufferGeometry, cor: string, pos: V3, rot: V3 = [0, 0, 0]) => pelo.push(uvNoEspaco(poe(g, cor, pos, rot), 16))
    const cromado = "#d7dde6"

    // ── portas da frente (lata, a janela fica aberta) e a coluna que separa ──
    for (const s of [-1, 1]) {
      fosco.push(poe(cx(0.02, 0.72, 0.99), tinta, [s * 0.872, 0.41, -0.435]))
      fosco.push(poe(cx(0.06, 0.08, 1.0), tinta, [s * 0.85, 1.41, -0.43]))
      fosco.push(poe(cx(0.07, 1.2, 0.07), tinta, [s * 0.85, 0.86, 0.06]))
    }

    // ── paredes de ripas, com o feltro magenta aparecendo entre elas ──
    for (const s of [-1, 1]) {
      fosco.push(poe(cx(0.01, 1.14, 1.72), FELTRO, [s * 0.878, 0.86, 0.94]))
      for (let k = 0; k < 38; k++) {
        fosco.push(poe(cx(0.018, 1.12, 0.026), BETULA[k % 3], [s * 0.86, 0.86, 0.12 + k * 0.045]))
      }
    }

    // ── teto de tábuas, com a claraboia em cima dos bancos da frente ──
    const tabua = (x: number, z0: number, z1: number, k: number) =>
      fosco.push(poe(cx(0.114, 0.02, z1 - z0), BETULA[k % 3], [x, 1.46, (z0 + z1) / 2]))
    for (let k = 0; k < 15; k++) tabua(-0.812 + k * 0.116, 0.45, 1.82, k)
    for (let k = 0; k < 3; k++) { tabua(-0.812 + k * 0.116, -0.9, 0.45, k); tabua(0.812 - k * 0.116, -0.9, 0.45, k + 1) }
    // o fundo das frestas (só onde tem tábua: a claraboia fica aberta)
    fosco.push(poe(cx(1.76, 0.01, 1.37), "#a8875f", [0, 1.476, 1.135]))
    for (const s of [-1, 1]) fosco.push(poe(cx(0.38, 0.01, 1.35), "#a8875f", [s * 0.69, 1.476, -0.225]))
    // borda da claraboia
    for (const s of [-1, 1]) fosco.push(poe(cx(0.02, 0.03, 1.36), "#b8956a", [s * 0.5, 1.455, -0.22]))
    fosco.push(poe(cx(1.02, 0.03, 0.02), "#b8956a", [0, 1.455, 0.45]))
    // luzinhas embutidas
    for (const z of [0.85, 1.25, 1.62]) brilho.push(poe(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 16), "#fff1d6", [0, 1.447, z], [0, 0, 0], true))

    // ── o vidro de trás aberto: moldura branca, parede embaixo ──
    fosco.push(poe(cx(1.74, 0.6, 0.02), FELTRO, [0, 0.52, 1.8]))
    fosco.push(poe(cx(1.74, 0.1, 0.05), BRANCO, [0, 1.42, 1.8]))
    for (const s of [-1, 1]) fosco.push(poe(cx(0.12, 0.62, 0.05), BRANCO, [s * 0.81, 1.1, 1.8]))

    // ── a mesa do estúdio, de ponta a ponta ──
    fosco.push(poe(cx(1.66, 0.04, 0.3), BRANCO, [0, 0.78, 1.63]))
    fosco.push(poe(cx(0.3, 0.5, 0.28), BRANCO, [-0.66, 0.51, 1.63]))
    fosco.push(poe(cx(0.03, 0.5, 0.28), BRANCO, [0.8, 0.51, 1.63]))
    brilho.push(poe(cx(1.6, 0.006, 0.006), AGUA, [0, 0.758, 1.48])) // fita de LED embaixo do tampo
    // monitor
    fosco.push(poe(cx(0.64, 0.33, 0.02), "#15161c", [0.05, 1.03, 1.72]))
    cromo.push(poe(cx(0.04, 0.12, 0.03), cromado, [0.05, 0.85, 1.74]))
    cromo.push(poe(cx(0.18, 0.01, 0.1), cromado, [0.05, 0.805, 1.72]))
    // caixas de som de estúdio, viradas pra cadeira
    for (const s of [-1, 1]) {
      const p: V3 = [s * 0.5, 0.905, 1.68], r: V3 = [0, s * 0.25 + Math.PI, 0]
      fosco.push(poe(cx(0.13, 0.21, 0.14), BRANCO, p, r))
      const fr = (dy: number, raio: number, cor: string) =>
        fosco.push(poe(new THREE.CylinderGeometry(raio, raio, 0.012, 20), cor,
          [p[0] - Math.sin(s * 0.25) * 0.072, p[1] + dy, p[2] - Math.cos(s * 0.25) * 0.072], [Math.PI / 2, s * 0.25, 0], true))
      fr(-0.035, 0.045, "#18181e"); fr(0.06, 0.018, "#18181e")
      brilho.push(poe(new THREE.CylinderGeometry(0.006, 0.006, 0.004, 8), ROSA,
        [p[0] - Math.sin(s * 0.25) * 0.071, p[1] - 0.09, p[2] - Math.cos(s * 0.25) * 0.071], [Math.PI / 2, s * 0.25, 0], true))
    }
    // teclado MIDI na mesa
    fosco.push(poe(cx(0.44, 0.03, 0.13), "#2a2730", [0.05, 0.815, 1.54]))
    fosco.push(poe(cx(0.4, 0.006, 0.07), "#f4f1ec", [0.05, 0.833, 1.525]))
    for (let k = 0; k < 17; k++) if (k % 7 !== 2 && k % 7 !== 6) fosco.push(poe(cx(0.012, 0.008, 0.04), "#111", [-0.14 + k * 0.0235, 0.838, 1.51]))
    for (let k = 0; k < 6; k++) fosco.push(poe(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 10), [ROSA, AGUA, AZUL][k % 3], [-0.11 + k * 0.03, 0.836, 1.585], [0, 0, 0], true))
    // plantinha em cima do gaveteiro
    fosco.push(poe(new THREE.CylinderGeometry(0.045, 0.035, 0.08, 14), ROSA, [-0.66, 0.84, 1.66], [0, 0, 0], true))
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9
      fosco.push(poe(new THREE.SphereGeometry(0.035, 8, 6), k % 2 ? "#3f9b4a" : "#56b85c",
        [-0.66 + Math.cos(a) * 0.035, 0.91 + (k % 3) * 0.03, 1.66 + Math.sin(a) * 0.03], [0, 0, 0], true))
    }

    // (27/11, o dono) a cadeira de ripas listradas saiu

    // ── os sintetizadores no suporte, na lateral direita ──
    const sinte = (y: number, inclina: number, z: number) => {
      const x = 0.6
      const r: V3 = [0, 0, inclina]
      fosco.push(poe(cx(0.24, 0.07, 0.72), "#2a2730", [x, y, z], r))
      for (const dz of [-0.375, 0.375]) fosco.push(poe(cx(0.25, 0.1, 0.03), BETULA[1], [x, y + 0.01, z + dz], r))
      // teclas (do lado de quem toca, x menor)
      fosco.push(poe(cx(0.09, 0.012, 0.68), "#f4f1ec", [x - 0.07, y + 0.04, z], r))
      for (let k = 0; k < 40; k++) if (k % 7 !== 2 && k % 7 !== 6) fosco.push(poe(cx(0.05, 0.016, 0.009), "#111", [x - 0.05, y + 0.045, z - 0.33 + k * 0.0168], r))
      // botões
      for (let k = 0; k < 10; k++) fosco.push(poe(new THREE.CylinderGeometry(0.009, 0.009, 0.016, 10), [ROSA, AGUA, AZUL, MAGENTA][k % 4],
        [x + 0.05 + (k % 2) * 0.035, y + 0.04, z - 0.28 + Math.floor(k / 2) * 0.12], [0, 0, inclina], true))
    }
    sinte(0.62, 0, 0.95)
    sinte(0.82, 0.35, 0.95)
    for (const dz of [-0.28, 0.28]) {
      cromo.push(poe(cx(0.02, 0.62, 0.02), cromado, [0.6, 0.55, 0.95 + dz], [0, 0, 0.35]))
      cromo.push(poe(cx(0.02, 0.62, 0.02), cromado, [0.6, 0.55, 0.95 + dz], [0, 0, -0.35]))
    }
    // banquinho do sinte
    cromo.push(poe(new THREE.CylinderGeometry(0.015, 0.03, 0.22, 10), cromado, [0.3, 0.37, 0.95], [0, 0, 0], true))

    // ── o sofá na lateral esquerda ──
    fosco.push(poe(cx(0.42, 0.25, 1.12), BETULA[0], [-0.64, 0.375, 0.86]))
    // almofadas listradas (tricô azul e creme), encostadas na parede
    for (const z of [0.5, 1.2]) {
      for (let k = 0; k < 6; k++) fosco.push(poe(cx(0.08, 0.04, 0.3), k % 2 ? "#f1e7d6" : AZUL, [-0.79 + 0.012 * k, 0.6 + k * 0.04, z], [0, 0, -0.25]))
    }

    // ── o pelo ──
    // a manta xadrez (rosa e verde-água): em cima do sofá e caindo pela frente
    const T = 0.112
    for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) {
      felpa(cx(T, 0.03, T), (i + j) % 2 ? ROSA : AGUA, [-0.82 + i * T + T / 2 - 0.012, 0.515, 0.3 + j * T + T / 2])
    }
    for (let i = 0; i < 2; i++) for (let j = 0; j < 10; j++) {
      felpa(cx(0.03, T, T), (i + j + 1) % 2 ? ROSA : AGUA, [-0.415, 0.445 - i * T, 0.3 + j * T + T / 2])
    }
    // almofada de pelúcia magenta no meio do sofá
    felpa(cx(0.1, 0.24, 0.26), MAGENTA, [-0.77, 0.66, 0.86], [0, 0, -0.25])
    // capas de pelúcia dos bancos da frente, e os encostos
    felpa(cx(1.13, 0.05, 0.57), ROSA, [-0.25, 0.6, -0.05])
    felpa(cx(0.57, 0.05, 0.57), ROSA, [0.55, 0.6, -0.05])
    // encostos baixos: de dentro, olhando pra trás, o estúdio aparece por cima
    felpa(cx(1.11, 0.22, 0.08), MAGENTA, [-0.25, 0.71, 0.29])
    felpa(cx(0.55, 0.22, 0.08), MAGENTA, [0.55, 0.71, 0.29])
    // assento do banquinho e o tapete
    felpa(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), AZUL, [0.3, 0.5, 0.95], [0, 0, 0])
    felpa(cx(0.78, 0.02, 1.12), AGUA, [0.02, 0.27, 0.86])
    // o felpudo do painel (o toca-discos fica afundado nele)
    felpa(cx(1.02, 0.012, 0.4), ROSA, [0.29, 0.816, -1.1])

    return { fosco: junta(fosco), cromo: junta(cromo), brilho: junta(brilho), pelo: junta(pelo) }
  }, [escala, tinta, estatico])

  const mats = useMemo(() => {
    const fios = texturaFios(), tom = texturaTom(), daw = texturaDAW()
    return {
      fios, tom, daw,
      fosco: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.05 }),
      cromo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.75 }),
      brilho: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      tela: new THREE.MeshBasicMaterial({ map: daw, color: "#e6e6e6" }),
      pelo: new THREE.MeshStandardMaterial({ vertexColors: true, map: tom, roughness: 1 }),
      casca1: concha(0.006, 0.45, fios, tom),
      casca2: concha(0.013, 0.7, fios, tom),
    }
  }, [])

  useEffect(() => () => { if (geo) Object.values(geo).forEach((g) => g.dispose()) }, [geo])
  useEffect(() => () => { Object.values(mats).forEach((m) => m.dispose()) }, [mats])

  return (
    <group>
      {geo && (
        <>
          <mesh geometry={geo.fosco} material={mats.fosco} />
          <mesh geometry={geo.cromo} material={mats.cromo} />
          <mesh geometry={geo.brilho} material={mats.brilho} />
          <mesh geometry={geo.pelo} material={mats.pelo} />
          <mesh geometry={geo.pelo} material={mats.casca1} />
          <mesh geometry={geo.pelo} material={mats.casca2} />
        </>
      )}
      {/* a tela do monitor, virada pra dentro */}
      <mesh position={[0.05, 1.03, 1.705]} rotation-y={Math.PI} material={mats.tela}>
        <planeGeometry args={[0.6, 0.29]} />
      </mesh>
    </group>
  )
}
