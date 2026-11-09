// O METRÔ (T26): o desenho, em three.js puro (sem React por quadro).
// Desempenho: o trem inteiro (paredes, bancos, postes, os sentados, o túnel)
// é UMA malha só com cor por vértice; as luminárias são uma malha por vagão
// (pra cada vagão piscar sozinho); quem está em pé é instanciado; o túnel que
// passa são dois InstancedMesh que andam em módulo do espaçamento (nenhum
// objeto novo por quadro). Duas luzes: o ambiente (que cai no apagão) e a
// lanterna do guarda. Sem sombra de verdade: uma mancha no chão.
//
// No three a câmera olhando pro +Z vê o +X à esquerda; aqui tudo é desenhado
// em X = −x, pra "direita" do jogo ser a direita da tela.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { ALTURA, BAIAS, BANCO, GANG, MEIA, NV, PASSAGEM, RAIO, TRECHOS_BANCO, WL, Z_FIM, Z_PORTA, inicioVagao } from "./mundo"
import { AJUSTE, type Fuga } from "./jogo"

const URL_METRO = "/models/metro.glb"
const CAMPOS_MAX = 8

const X = (x: number) => -x

// (09/11, bíblia §13) HOSPEDADA: o trem desenhado DENTRO do canvas do mundo, com a cidade
// de verdade nas janelas (estrada/Linha9.tsx). Sem renderer próprio, sem túnel e, o
// principal, sem luz nova: acrescentar luz na cena do mundo recompilaria todos os
// materiais dela. Por isso o interior é sem luz (a cor do vértice já vem sombreada)
let HOSPEDADA = false
let SALA: THREE.MeshBasicMaterial[] = []
function matLuz(o: THREE.MeshLambertMaterialParameters = {}) {
  if (!HOSPEDADA) return new THREE.MeshLambertMaterial(o)
  const m = new THREE.MeshBasicMaterial({ color: o.color, vertexColors: o.vertexColors, toneMapped: false })
  SALA.push(m)
  return m as unknown as THREE.MeshLambertMaterial
}
const cor = new THREE.Color()

// uma caixa com cor nos vértices (as medidas no espaço do jogo)
function caixa(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, c: string | THREE.Color) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), y1 - y0, z1 - z0)
  g.translate(X((x0 + x1) / 2), (y0 + y1) / 2, (z0 + z1) / 2)
  return pintar(g, c)
}
function pintar(g: THREE.BufferGeometry, c: string | THREE.Color) {
  cor.set(c)
  const n = g.attributes.position.count, nor = g.attributes.normal
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    // sem luz (hospedada): o sombreado fica no vértice, pela face
    const k = !HOSPEDADA || !nor ? 1 : nor.getY(i) > 0.5 ? 1 : nor.getY(i) < -0.5 ? 0.55 : Math.abs(nor.getX(i)) > 0.5 ? 0.82 : 0.7
    a[i * 3] = cor.r * k; a[i * 3 + 1] = cor.g * k; a[i * 3 + 2] = cor.b * k
  }
  g.setAttribute("color", new THREE.BufferAttribute(a, 3))
  return g
}
function cano(x: number, z: number, y0: number, y1: number, r: number, c: string) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, 6, 1, true)
  g.translate(X(x), (y0 + y1) / 2, z)
  return pintar(g, c)
}
function canoZ(x: number, y: number, z0: number, z1: number, r: number, c: string) {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, 5, 1, true)
  g.rotateX(Math.PI / 2)
  g.translate(X(x), y, (z0 + z1) / 2)
  return pintar(g, c)
}
function juntar(l: THREE.BufferGeometry[]) {
  const ok = l.map((g) => (g.index ? g.toNonIndexed() : g))
  for (const g of ok) g.deleteAttribute("uv")
  const m = mergeGeometries(ok, false)!
  for (const g of l) g.dispose()
  return m
}

// as cores do trem: o branco hospitalar do Núcleo, o banco azul, o chão cinza
const C = {
  parede: "#d6dbe4", faixa: "#2f8cff", teto: "#c4cad6", chao: "#454a57", chaoBaia: "#3a3e49", amarelo: "#e8c547",
  banco: "#24408f", bancoBase: "#2b2f3a", cano: "#e8ecf2", porta: "#aab2bf", vidroPorta: "#0b0e18", fole: "#16171d",
  tunel: "#0d0f15", cabo: "#1c1e25", janela: "#070912",
}
const ROUPAS = ["#2b2d38", "#4a3f5c", "#3a4a5a", "#5a4a3a", "#283848", "#6a2d3c", "#33402e", "#1e1e24"]
const PELES = ["#f0c8a0", "#c89068", "#8a5a3a", "#5c3a24", "#e0b088"]

// um boneco simples (tronco, cabeça, braços e pernas que balançam)
function boneco(roupa: string, calca: string, pele: string, extra?: (g: THREE.Group, mat: (c: string) => THREE.Material) => void) {
  const cache = new Map<string, THREE.Material>()
  const mat = (c: string) => { let m = cache.get(c); if (!m) { m = matLuz({ color: c, vertexColors: HOSPEDADA }); cache.set(c, m) } return m }
  const g = new THREE.Group()
  const tronco = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), mat(roupa)); tronco.position.y = 1.18
  const cabeca = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), mat(pele)); cabeca.position.y = 1.62
  const perna = (s: number) => { const p = new THREE.Group(); p.position.set(s * 0.11, 0.9, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.16), mat(calca)); m.position.y = -0.45; p.add(m); return p }
  const braco = (s: number) => { const p = new THREE.Group(); p.position.set(s * 0.27, 1.42, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.6, 0.12), mat(roupa)); m.position.y = -0.3; p.add(m); return p }
  const pe = perna(-1), pd = perna(1), be = braco(-1), bd = braco(1)
  g.add(tronco, cabeca, pe, pd, be, bd)
  extra?.(g, mat)
  if (HOSPEDADA) g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !m.geometry.attributes.color) pintar(m.geometry, "#fff") })
  return { g, tronco, cabeca, pe, pd, be, bd, mats: [...cache.values()] as THREE.MeshLambertMaterial[], opaco: 1 }
}
type Boneco = ReturnType<typeof boneco>

function andar(b: Boneco, passo: number, vel: number) {
  const amp = Math.min(1, vel / 6) * 0.9
  const s = Math.sin(passo)
  b.pe.rotation.x = s * amp; b.pd.rotation.x = -s * amp
  b.be.rotation.x = -s * amp * 0.9; b.bd.rotation.x = s * amp * 0.9
  b.tronco.rotation.x = -0.18 * Math.min(1, vel / 6)
  const pulo = Math.abs(Math.cos(passo)) * 0.06 * Math.min(1, vel / 3)
  b.tronco.position.y = 1.18 + pulo; b.cabeca.position.y = 1.62 + pulo
}

// (09/11) sentado no banco: o quadril na altura do assento, as pernas pra frente
function sentar(b: Boneco) {
  b.pe.rotation.x = b.pd.rotation.x = -1.15
  b.be.rotation.x = b.bd.rotation.x = -0.45
  b.tronco.rotation.x = 0
  b.tronco.position.y = 1.18; b.cabeca.position.y = 1.62
}

// as duas folhas da portinha (0 fechada, 1 aberta)
function for2(a: THREE.Mesh, b: THREE.Mesh, aberta: number) {
  const x = PASSAGEM / 2 + aberta * (PASSAGEM - 0.04)
  a.position.x = X(-x); b.position.x = X(x); a.updateMatrix(); b.updateMatrix()
}

export class Cena {
  r!: THREE.WebGLRenderer
  // (09/11) hospedada: onde a câmera do mundo deve ficar (lido pelo estrada/Linha9.tsx)
  hospedada: boolean
  posMundo = new THREE.Vector3()
  quatMundo = new THREE.Quaternion()
  private escMundo = new THREE.Vector3()
  private salaLuz = -1
  private campos: THREE.InstancedMesh
  cena = new THREE.Scene()
  // near de 0,5 m: o poste e o banco colados na câmera somem (o truque da terceira pessoa)
  cam = new THREE.PerspectiveCamera(68, 1, 0.5, 40)
  ceu: THREE.HemisphereLight
  lanterna: THREE.SpotLight
  alvoLanterna = new THREE.Object3D()
  cone: THREE.Mesh
  lampadas: THREE.MeshBasicMaterial[] = []
  emergencia!: THREE.MeshBasicMaterial
  tunel = new THREE.Group()
  portinhas: THREE.Mesh[] = []
  saidaE: THREE.Mesh; saidaD: THREE.Mesh; fora: THREE.Mesh
  gente: THREE.InstancedMesh; cabecas: THREE.InstancedMesh
  voce: Boneco; guarda: Boneco
  caixaViolao: THREE.Mesh
  sombraV: THREE.Mesh; sombraG: THREE.Mesh
  calls = 0; tris = 0
  private camPos = new THREE.Vector3(0, 2, 0)
  private camOlha = new THREE.Vector3(0, 1.2, 6)
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private v3 = new THREE.Vector3(); private s3 = new THREE.Vector3(1, 1, 1)
  private piscaVagao = 2 // o vagão da luz ruim

  constructor(canvas: HTMLCanvasElement | null, f: Fuga) {
    this.hospedada = HOSPEDADA = !canvas
    SALA = []
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      this.r = new THREE.WebGLRenderer({ canvas, antialias: dpr < 1.5, powerPreference: "high-performance", stencil: false })
      this.r.setPixelRatio(dpr)
    }
    this.cena.background = new THREE.Color("#04050a")
    this.cena.fog = new THREE.Fog("#04050a", 7, 36)
    this.ceu = new THREE.HemisphereLight("#eef2ff", "#3a3440", 2.4)
    if (!this.hospedada) this.cena.add(this.ceu)
    this.lanterna = new THREE.SpotLight("#e9f4ff", 0, 16, 0.38, 0.55, 1.1)
    if (!this.hospedada) this.cena.add(this.lanterna, this.alvoLanterna)
    this.cena.matrixAutoUpdate = !this.hospedada
    this.lanterna.target = this.alvoLanterna

    this.montarTrem(f)
    if (!this.hospedada) this.montarTunel()

    // as portinhas da passagem
    // (duas folhas que correm pra dentro das paredes)
    const gPort = new THREE.BoxGeometry(PASSAGEM, ALTURA, 0.05); gPort.translate(0, ALTURA / 2, 0)
    const mPort = matLuz({ color: C.porta })
    for (const z of f.planta.portinhas) for (let k = 0; k < 2; k++) { const m = new THREE.Mesh(gPort, mPort); m.position.z = z; m.matrixAutoUpdate = false; m.updateMatrix(); this.portinhas.push(m); this.cena.add(m) }
    // a porta da curva: duas folhas que correm, e a luz lá fora
    const gFolha = new THREE.BoxGeometry(0.06, 2.0, 0.7); gFolha.translate(0, 1.0, 0)
    const mFolha = matLuz({ color: C.porta })
    this.saidaE = new THREE.Mesh(gFolha, mFolha); this.saidaD = new THREE.Mesh(gFolha, mFolha)
    this.saidaE.position.set(X(MEIA + 0.04), 0, Z_PORTA - 0.35); this.saidaD.position.set(X(MEIA + 0.04), 0, Z_PORTA + 0.35)
    // lá fora, na curva: a luz quente da cidade entrando pela porta
    this.fora = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.2), new THREE.MeshBasicMaterial({ color: "#ffd9a0", fog: false }))
    this.fora.rotation.y = Math.PI / 2; this.fora.position.set(X(MEIA + 0.6), 1.2, Z_PORTA); this.fora.visible = false
    this.cena.add(this.saidaE, this.saidaD, this.fora)

    // quem está em pé (instanciado: o corpo tinge pela roupa, a cabeça pela pele)
    const n = Math.max(1, f.gente.length)
    const corpo = juntar([caixa(-0.2, 0.2, 0.92, 1.5, -0.11, 0.11, "#fff"), caixa(-0.17, 0.17, 0, 0.92, -0.08, 0.08, "#8a8a92")])
    this.gente = new THREE.InstancedMesh(corpo, matLuz({ vertexColors: true }), n)
    const cab = new THREE.IcosahedronGeometry(0.12, 1); cab.translate(0, 1.63, 0)
    this.cabecas = new THREE.InstancedMesh(cab, matLuz(), n)
    f.planta.em_pe.forEach((p, i) => {
      this.gente.setColorAt(i, cor.set(ROUPAS[Math.floor(p.roupa * ROUPAS.length)]))
      this.cabecas.setColorAt(i, cor.set(PELES[Math.floor(p.tom * PELES.length)]))
    })
    this.gente.count = this.cabecas.count = f.gente.length
    this.cena.add(this.gente, this.cabecas)
    // (09/11) o campo em volta de quem está perto de você: 1 malha, só as paredes, sem luz
    const gCampo = new THREE.CylinderGeometry(RAIO + AJUSTE.campoPessoa, RAIO + AJUSTE.campoPessoa, 1.8, 14, 1, true); gCampo.translate(0, 0.9, 0)
    this.campos = new THREE.InstancedMesh(gCampo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }), CAMPOS_MAX)
    this.campos.setColorAt(0, cor.set("#000"))
    this.campos.count = 0
    this.campos.frustumCulled = false
    this.cena.add(this.campos)

    // você: moletom ciano, o violão no case nas costas
    this.voce = boneco("#1fb8d6", "#1b1d2a", "#c89068")
    this.caixaViolao = new THREE.Mesh(juntar([caixa(-0.17, 0.17, 0, 0.62, -0.06, 0.06, "#2a1c14"), caixa(-0.09, 0.09, 0.62, 1.0, -0.05, 0.05, "#2a1c14"), caixa(-0.18, 0.18, 0.1, 0.13, -0.065, 0.065, "#c7a24a")]), matLuz({ vertexColors: true }))
    this.caixaViolao.position.set(0, 0.78, -0.16); this.caixaViolao.rotation.z = 0.35
    this.voce.g.add(this.caixaViolao)
    // o guarda do Núcleo: o branco, o boné, o crachá que brilha, a lanterna
    this.guarda = boneco("#e9edf5", "#c9cfdb", "#e0b088", (g, mat) => {
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 10), mat("#1a2238")); bone.position.y = 1.76
      const aba = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), mat("#1a2238")); aba.position.set(0, 1.73, 0.15)
      const cracha = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.01), new THREE.MeshBasicMaterial({ color: "#5fe8ff" })); cracha.position.set(0.1, 1.32, 0.125)
      g.add(bone, aba, cracha)
    })
    const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.2, 6), new THREE.MeshBasicMaterial({ color: "#f4fbff" }))
    lant.rotation.x = Math.PI / 2; lant.position.set(0, -0.58, 0.1)
    this.guarda.bd.add(lant)
    // o facho da lanterna (o cone de luz no ar)
    const gc = new THREE.ConeGeometry(0.9, 6, 16, 1, true); gc.translate(0, -3, 0); gc.rotateX(-Math.PI / 2)
    this.cone = new THREE.Mesh(gc, new THREE.MeshBasicMaterial({ color: "#bfe4ff", transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }))
    this.cena.add(this.voce.g, this.guarda.g, this.cone)
    // as manchas no chão
    const tx = document.createElement("canvas"); tx.width = tx.height = 64
    const c2 = tx.getContext("2d")!; const gr = c2.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(1, "rgba(0,0,0,0)"); c2.fillStyle = gr; c2.fillRect(0, 0, 64, 64)
    const mSombra = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tx), transparent: true, depthWrite: false })
    const gS = new THREE.PlaneGeometry(0.9, 0.9); gS.rotateX(-Math.PI / 2)
    this.sombraV = new THREE.Mesh(gS, mSombra); this.sombraG = new THREE.Mesh(gS, mSombra)
    this.sombraV.position.y = this.sombraG.position.y = 0.012
    this.cena.add(this.sombraV, this.sombraG)

    this.camPos.set(X(-0.35), 1.72, f.voce.z + 2.6)
    this.camOlha.set(X(f.guarda.x), 1.2, f.guarda.z)
  }

  private montarTrem(f: Fuga) {
    // (06/11) a casca (chão, teto, paredes, portas, bancos, barras) sai à parte: é ela que
    // o vagão modelado (metro.glb) substitui quando chega; o resto fica sempre
    const K: THREE.BufferGeometry[] = []
    const L: THREE.BufferGeometry[] = []
    for (let i = 0; i < NV; i++) {
      const z0 = inicioVagao(i), z1 = z0 + WL
      K.push(caixa(-MEIA, MEIA, -0.06, 0, z0, z1, C.chao))
      for (const [a, b] of BAIAS) {
        K.push(caixa(-MEIA, MEIA, 0, 0.004, z0 + a, z0 + b, C.chaoBaia))
        K.push(caixa(-MEIA, -BANCO + 0.05, 0, 0.006, z0 + a, z0 + a + 0.05, C.amarelo), caixa(BANCO - 0.05, MEIA, 0, 0.006, z0 + a, z0 + a + 0.05, C.amarelo))
        K.push(caixa(-MEIA, -BANCO + 0.05, 0, 0.006, z0 + b - 0.05, z0 + b, C.amarelo), caixa(BANCO - 0.05, MEIA, 0, 0.006, z0 + b - 0.05, z0 + b, C.amarelo))
      }
      K.push(caixa(-MEIA, MEIA, ALTURA, ALTURA + 0.06, z0, z1, C.teto))
      // as paredes dos lados: a de baixo, a faixa azul, as janelas (vãos), a de cima
      for (const s of [1, -1]) {
        const xa = s > 0 ? MEIA : -MEIA - 0.08, xb = xa + 0.08
        for (const [a, b] of [[0, BAIAS[0][0]], [BAIAS[0][1], BAIAS[1][0]], [BAIAS[1][1], WL]]) {
          K.push(caixa(xa, xb, 0, 0.98, z0 + a, z0 + b, C.parede))
          K.push(caixa(xa, xb, 0.98, 1.06, z0 + a, z0 + b, C.faixa))
          K.push(caixa(xa, xb, 1.86, ALTURA, z0 + a, z0 + b, C.parede))
          // os pilares entre as janelas
          for (let z = a; z <= b + 0.01; z += (b - a) / Math.max(1, Math.round((b - a) / 1.6))) K.push(caixa(xa, xb, 1.06, 1.86, z0 + z - 0.09, z0 + z + 0.09, C.parede))
        }
        // as portas fechadas das baias (a da curva é a que abre)
        BAIAS.forEach(([a, b], k) => {
          if (i === NV - 1 && k === 1 && s > 0) {
            K.push(caixa(xa, xb, 2.02, ALTURA, z0 + a, z0 + b, C.parede))
            K.push(caixa(xa, xb, 0, 2.02, z0 + a, z0 + a + 0.02, C.parede), caixa(xa, xb, 0, 2.02, z0 + b - 0.02, z0 + b, C.parede))
            return
          }
          K.push(caixa(xa, xb, 0, 2.02, z0 + a, z0 + b, C.porta))
          K.push(caixa(xa - 0.004 * s, xb + 0.004 * s, 1.0, 1.78, z0 + a + 0.12, z0 + (a + b) / 2 - 0.05, C.vidroPorta))
          K.push(caixa(xa - 0.004 * s, xb + 0.004 * s, 1.0, 1.78, z0 + (a + b) / 2 + 0.05, z0 + b - 0.12, C.vidroPorta))
          K.push(caixa(xa, xb, 2.02, ALTURA, z0 + a, z0 + b, C.parede))
        })
        // os bancos
        for (const [a, b] of TRECHOS_BANCO) {
          const xi = s > 0 ? BANCO : -MEIA, xo = s > 0 ? MEIA : -BANCO
          K.push(caixa(xi, xo, 0, 0.4, z0 + a, z0 + b, C.bancoBase))
          K.push(caixa(xi, xo, 0.4, 0.5, z0 + a + 0.02, z0 + b - 0.02, C.banco))
          const xe = s > 0 ? MEIA - 0.1 : -MEIA, xf = s > 0 ? MEIA : -MEIA + 0.1
          K.push(caixa(xe, xf, 0.5, 0.98, z0 + a + 0.02, z0 + b - 0.02, C.banco))
        }
        // a barra do teto
        K.push(canoZ(s * 0.8, 1.98, z0 + 0.2, z1 - 0.2, 0.018, C.cano))
      }
      // as paredes do fundo e da frente, com o vão da passagem
      for (const [za, zb, cheia] of [[z0 - 0.06, z0, i === 0], [z1, z1 + 0.06, i === NV - 1]] as [number, number, boolean][]) {
        K.push(caixa(-MEIA, -PASSAGEM, 0, ALTURA, za, zb, C.parede), caixa(PASSAGEM, MEIA, 0, ALTURA, za, zb, C.parede))
        if (cheia) L.push(caixa(-PASSAGEM, PASSAGEM, 0, ALTURA, za, zb, C.parede))
      }
      if (i < NV - 1) {
        // o fole da passagem
        // (sem verga em cima: o trem é um tubo só, a câmera passa sem bater)
        L.push(caixa(-PASSAGEM - 0.07, -PASSAGEM - 0.01, 0, ALTURA, z1 + 0.07, z1 + GANG - 0.07, C.fole), caixa(PASSAGEM + 0.01, PASSAGEM + 0.07, 0, ALTURA, z1 + 0.07, z1 + GANG - 0.07, C.fole))
        L.push(caixa(-PASSAGEM, PASSAGEM, ALTURA, ALTURA + 0.06, z1, z1 + GANG, C.fole), caixa(-PASSAGEM, PASSAGEM, -0.06, 0, z1, z1 + GANG, C.chao))
      }
    }
    for (const p of f.planta.postes) L.push(cano(p.x, p.z, 0, ALTURA, p.r * 0.8, C.cano))
    // os sentados: ninguém olha pra fora (cabeça baixa, a câmera no colo, o fone sem música)
    for (const s of f.planta.sentados) {
      const roupa = ROUPAS[Math.floor(s.roupa * ROUPAS.length)], pele = PELES[Math.floor(s.tom * PELES.length)]
      const xc = s.x, xi = s.lado > 0 ? xc - 0.14 : xc + 0.14
      L.push(caixa(xc - 0.2, xc + 0.2, 0.5, 1.08, s.z - 0.11, s.z + 0.11, roupa))
      L.push(caixa(Math.min(xi, xi - 0.36 * s.lado), Math.max(xi, xi - 0.36 * s.lado), 0.42, 0.56, s.z - 0.13, s.z + 0.13, "#24262e"))
      L.push(caixa(Math.min(xi - 0.36 * s.lado, xi - 0.46 * s.lado), Math.max(xi - 0.36 * s.lado, xi - 0.46 * s.lado), 0, 0.5, s.z - 0.12, s.z + 0.12, "#24262e"))
      const cy = 1.22 - (s.jeito === 0 ? 0.06 : 0), cx = xc - s.lado * (s.jeito === 0 ? 0.08 : 0)
      L.push(caixa(cx - 0.1, cx + 0.1, cy, cy + 0.22, s.z - 0.1, s.z + 0.1, pele))
      if (s.jeito === 1) L.push(caixa(xi - 0.3 * s.lado - 0.08, xi - 0.3 * s.lado + 0.08, 0.58, 0.68, s.z - 0.07, s.z + 0.07, "#111")) // a câmera no colo
      if (s.jeito === 2) L.push(caixa(cx - 0.12, cx + 0.12, cy + 0.08, cy + 0.15, s.z - 0.12, s.z + 0.12, "#e33")) // o fone
    }
    // o túnel lá fora (o que não muda: as paredes, os cabos). Hospedada, lá fora é a cidade
    if (!this.hospedada) {
      const z0 = -12, z1 = Z_FIM + 16
      for (const s of [1, -1]) {
        const x = s * 2.5
        L.push(caixa(Math.min(x, x + 0.2 * s), Math.max(x, x + 0.2 * s), -1.2, 3.6, z0, z1, C.tunel))
        for (const y of [2.6, 2.75, 2.9]) L.push(canoZ(s * 2.42, y, z0, z1, 0.025, C.cabo))
      }
      L.push(caixa(-2.6, 2.6, 3.4, 3.6, z0, z1, C.tunel))
    }
    const mat = matLuz({ vertexColors: true })
    const m = new THREE.Mesh(juntar(L), mat)
    m.matrixAutoUpdate = false
    this.cena.add(m)
    this.casca = new THREE.Mesh(juntar(K), mat)
    this.casca.matrixAutoUpdate = false
    this.cena.add(this.casca)
    this.carregarVagao(mat)

    // as luminárias do teto, uma malha por vagão (cada um pisca sozinho)
    const gEm: THREE.BufferGeometry[] = []
    for (let i = 0; i < NV; i++) {
      const z = inicioVagao(i), ls: THREE.BufferGeometry[] = []
      for (const x of [-0.42, 0.42]) for (let k = 0; k < 5; k++) ls.push(caixa(x - 0.07, x + 0.07, ALTURA - 0.03, ALTURA, z + 0.6 + k * 2.9, z + 2.6 + k * 2.9, "#fff"))
      const mat = new THREE.MeshBasicMaterial({ color: "#f3f6ff" })
      this.lampadas.push(mat)
      const lm = new THREE.Mesh(juntar(ls), mat); lm.matrixAutoUpdate = false
      this.cena.add(lm)
      for (const [a, b] of BAIAS) for (const s of [1, -1]) gEm.push(caixa(s * (MEIA - 0.12), s * (MEIA - 0.02), 2.08, 2.16, z + (a + b) / 2 - 0.12, z + (a + b) / 2 + 0.12, "#fff"))
    }
    // as luzes de emergência (vermelhas, só no apagão e quando ele te pega)
    this.emergencia = new THREE.MeshBasicMaterial({ color: "#300", fog: false })
    const em = new THREE.Mesh(juntar(gEm), this.emergencia); em.matrixAutoUpdate = false
    this.cena.add(em)
  }

  // (06/11) o vagão modelado no Blender (blender/scripts/metro.py, nó "fuga"): aço riscado,
  // bancos de plástico, propagandas apagadas, grade nas janelas, pichação. Uma
  // InstancedMesh pros 5 vagões, uma pra porta (todos menos o último: lá ela abre na
  // curva) e uma pro brilho da pichação. Se não baixar, fica a casca de caixas
  private casca: THREE.Mesh | null = null
  private morto = false
  private carregarVagao(mat: THREE.Material) {
    const ld = new GLTFLoader()
    ld.setMeshoptDecoder(MeshoptDecoder)
    ld.load(URL_METRO, (gltf) => {
      if (this.morto || !this.casca) return
      gltf.scene.updateMatrixWorld(true)
      const pega = (n: string) => gltf.scene.getObjectByName(n) as THREE.Mesh | undefined
      if (!pega("fuga_solido")?.geometry) return
      const neon = new THREE.MeshBasicMaterial({ vertexColors: true })
      const partes: [string, THREE.Material, number][] = [["fuga_solido", mat, NV], ["fuga_neon", neon, NV], ["fugaporta_solido", mat, NV - 1], ["fugaporta_neon", neon, NV - 1]]
      const m4 = new THREE.Matrix4()
      for (const [nome, mt, n] of partes) {
        const o = pega(nome)
        if (!o?.geometry) continue
        const im = new THREE.InstancedMesh(o.geometry, mt, n)
        for (let i = 0; i < n; i++) im.setMatrixAt(i, m4.makeTranslation(0, 0, inicioVagao(i)).multiply(o.matrixWorld))
        im.frustumCulled = false
        im.matrixAutoUpdate = false
        this.cena.add(im)
      }
      this.cena.remove(this.casca)
      this.casca.geometry.dispose()
      this.casca = null
    }, undefined, (e) => console.warn("[cidade-neon] metro.glb (fuga) não carregou; fica a casca de caixas", e))
  }

  // o túnel que passa: as costelas e as lâmpadas, em módulo do espaçamento
  static ESP = 6
  private montarTunel() {
    const n = Math.ceil((Z_FIM + 30) / Cena.ESP) + 2
    const gC = new THREE.BoxGeometry(0.35, 4.6, 0.3); gC.translate(0, 1.2, 0)
    const costelas = new THREE.InstancedMesh(gC, matLuz({ color: "#14161d" }), n * 2)
    const gL = new THREE.BoxGeometry(0.08, 0.1, 0.5)
    const luzes = new THREE.InstancedMesh(gL, new THREE.MeshBasicMaterial({ color: "#ffb24a" }), n * 2)
    let k = 0
    for (let i = 0; i < n; i++) for (const s of [1, -1]) {
      const z = -12 + i * Cena.ESP
      this.m4.makeTranslation(s * 2.42, 0, z); costelas.setMatrixAt(k, this.m4)
      this.m4.makeTranslation(s * 2.36, 1.55, z + Cena.ESP / 2); luzes.setMatrixAt(k, this.m4)
      k++
    }
    costelas.frustumCulled = luzes.frustumCulled = false
    this.tunel.add(costelas, luzes)
    this.cena.add(this.tunel)
  }

  medir(w: number, h: number) {
    if (this.hospedada) return
    this.r.setSize(w, h, false)
    this.cam.aspect = w / Math.max(1, h)
    this.cam.updateProjectionMatrix()
  }

  // a = a fração do passo (interpolação); dt = o tempo do quadro
  desenhar(f: Fuga, a: number, dt: number, tela: number) {
    const v = f.voce, g = f.guarda
    const vx = v.px + (v.x - v.px) * a, vz = v.pz + (v.z - v.pz) * a
    const gx = g.px + (g.x - g.px) * a, gz = g.pz + (g.z - g.pz) * a
    // o túnel passa
    this.tunel.position.z = -(f.odometro % Cena.ESP)
    // a luz: o vagão da luz ruim pisca sozinho; no apagão só sobra o túnel (o estrobo das lâmpadas lá fora)
    const tunelPulso = Math.max(0, 1 - Math.abs(((f.odometro + 2.6) % Cena.ESP) / Cena.ESP - 0.5) * 6)
    const luz = f.luz
    this.ceu.intensity = 0.12 + luz * 2.3 + (1 - luz) * tunelPulso * 0.9
    // hospedada: sem luz, o apagão escurece a cor dos materiais (só quando muda)
    if (this.hospedada && luz !== this.salaLuz) { this.salaLuz = luz; const b = 0.22 + luz * 0.78; for (let i = 0; i < SALA.length; i++) SALA[i].color.setScalar(b) }
    for (let i = 0; i < NV; i++) {
      let l = luz
      if (i === this.piscaVagao && luz > 0.5 && Math.sin(f.odometro * 0.37) > 0.93) l = 0.25
      this.lampadas[i].color.setRGB(0.07 + l * 0.88, 0.07 + l * 0.9, 0.08 + l * 0.92)
    }
    const alarme = f.fase === "pego" ? 1 : luz < 0.5 ? 0.6 + 0.4 * Math.sin(f.t * 12) : 0
    this.emergencia.color.setRGB(0.2 + alarme * 0.8, 0.02, 0.02)

    // as portinhas e a porta da curva
    f.portinhas.forEach((p, i) => for2(this.portinhas[i * 2], this.portinhas[i * 2 + 1], p.aberta))
    this.saidaE.position.z = Z_PORTA - 0.35 - f.saida * 0.66
    this.saidaD.position.z = Z_PORTA + 0.35 + f.saida * 0.66
    this.fora.visible = f.saida > 0 && !this.hospedada

    // quem está em pé
    f.gente.forEach((p, i) => {
      this.e.set(0, Math.PI + Math.sin(p.fase * 0.5) * 0.3, X(p.dir) * p.empurrado * 0.35)
      this.q.setFromEuler(this.e)
      this.m4.compose(this.v3.set(X(p.x), 0, p.z), this.q, this.s3)
      this.gente.setMatrixAt(i, this.m4); this.cabecas.setMatrixAt(i, this.m4)
    })
    this.gente.instanceMatrix.needsUpdate = true; this.cabecas.instanceMatrix.needsUpdate = true
    // o campo acende em quem está perto de você (só na fuga; for simples, nada alocado)
    let nCampo = 0
    if (f.fase === "fuga" || f.fase === "porta") for (let i = 0; i < f.gente.length && nCampo < CAMPOS_MAX; i++) {
      const p = f.gente[i], d = Math.hypot(p.x - vx, p.z - vz)
      if (d > 3.2) continue
      this.campos.setMatrixAt(nCampo, this.m4.makeTranslation(X(p.x), 0, p.z))
      const k = (1 - d / 3.2) * 0.5
      this.campos.setColorAt(nCampo, cor.setRGB(0.25 * k, 0.8 * k, k))
      nCampo++
    }
    this.campos.count = nCampo
    if (nCampo) { this.campos.instanceMatrix.needsUpdate = true; this.campos.instanceColor!.needsUpdate = true }

    // você e ele
    this.voce.g.position.set(X(vx), 0, vz)
    this.voce.g.rotation.y = Math.atan2(X(v.vx), Math.max(0.5, v.vz)) * 0.6
    if (f.sentado) { this.voce.g.position.y = -0.42; this.voce.g.rotation.y = Math.PI / 2; sentar(this.voce) }
    else andar(this.voce, v.passo, f.fase === "pego" ? 0 : Math.hypot(v.vx, v.vz))
    this.guarda.g.position.set(X(gx), 0, gz)
    const gvel = Math.hypot(g.vx, g.vz)
    this.guarda.g.rotation.y = Math.atan2(X(vx - gx), vz - gz)
    andar(this.guarda, g.passo, gvel)
    this.guarda.bd.rotation.x = -1.2 + Math.sin(g.passo) * 0.15 // o braço da lanterna, apontando
    this.sombraV.position.set(X(vx), 0.012, vz); this.sombraG.position.set(X(gx), 0.012, gz)
    // o violão: nas suas costas, ou na mão dele
    if (f.violao === "perdido" && this.caixaViolao.parent !== this.guarda.be) {
      this.guarda.be.add(this.caixaViolao)
      this.caixaViolao.position.set(0, -0.75, 0.1); this.caixaViolao.rotation.set(0.3, 0, 0.1)
    }
    // a lanterna dele aponta pra você
    const ativo = f.fase !== "intro"
    this.lanterna.intensity = ativo ? 14 : 0
    this.lanterna.position.set(X(gx), 1.35, gz + 0.3)
    this.alvoLanterna.position.set(X(vx), 0.6, vz + 0.6)
    this.cone.visible = ativo
    this.cone.position.copy(this.lanterna.position)
    this.cone.lookAt(this.alvoLanterna.position)
    ;(this.cone.material as THREE.MeshBasicMaterial).opacity = 0.03 + (1 - luz) * 0.08

    // a câmera: atrás e acima de você; treme quando ele chega perto; quando te pega, vira pra ele
    const k = 1 - Math.exp(-dt * 7)
    const d = f.distancia
    if (f.sentado) {
      // (09/11) a viagem: do outro lado do corredor, ele sentado e a cidade passando na janela atrás
      this.camPos.lerp(this.v3.set(X(-0.72), 1.42, vz - 1.5), k)
      this.camOlha.lerp(this.v3.set(X(1.6), 1.22, vz + 0.45), k)
    } else if (f.fase === "intro") {
      // o começo: de frente pra você, olhando o fundo do vagão (ele está lá, sentado, olhando)
      this.camPos.lerp(this.v3.set(X(vx - 0.35), 1.72, vz + 2.6), k)
      this.camOlha.lerp(this.v3.set(X(gx), 1.2, gz), k)
    } else if (f.fase === "pego") {
      this.camPos.lerp(this.v3.set(X(vx + 0.9), 1.6, vz + 1.6), 1 - Math.exp(-dt * 3))
      this.camOlha.lerp(this.v3.set(X(gx), 1.5, gz), 1 - Math.exp(-dt * 4))
    } else if (f.fase === "pulou" || f.fase === "porta") {
      // de lado, do outro lado do corredor: você sai pela porta, pra luz
      this.camOlha.lerp(this.v3.set(X(MEIA + 1.2), 1.1, Z_PORTA + 0.2), 1 - Math.exp(-dt * 4))
      this.camPos.lerp(this.v3.set(X(-0.45), 1.85, Z_PORTA - 1.6), 1 - Math.exp(-dt * 3))
    } else {
      // por cima do ombro direito (o poste do meio não fica na frente da câmera)
      this.camPos.lerp(this.v3.set(X(vx * 0.5 + 0.28), 2.1, vz - 2.9), k)
      this.camOlha.lerp(this.v3.set(X(vx * 0.25 + 0.1), 1.1, vz + 4.5), k)
    }
    const medo = ativo && f.fase === "fuga" ? Math.max(0, 1 - d / 4.5) : 0
    const tt = f.odometro
    this.cam.position.copy(this.camPos)
    this.cam.position.x += Math.sin(tt * 0.9) * 0.012 + medo * Math.sin(tt * 7.3) * 0.035
    this.cam.position.y += Math.sin(tt * 1.7) * 0.008 + medo * Math.sin(tt * 9.1) * 0.025
    this.cam.lookAt(this.camOlha)
    this.cam.rotation.z += Math.sin(tt * 0.05) * 0.012
    const fov = 66 + Math.min(1, v.vz / 6.5) * 5 + (f.embalo > 0 ? 4 : 0)
    if (Math.abs(this.cam.fov - fov) > 0.05) { this.cam.fov += (fov - this.cam.fov) * k; this.cam.updateProjectionMatrix() }

    // ele colado na câmera: fica translúcido (senão tampa você e o corredor)
    const dc = Math.hypot(this.cam.position.x - X(gx), this.cam.position.z - gz)
    const op = f.fase === "pego" ? 1 : Math.max(0.22, Math.min(1, (dc - 0.9) / 1.2))
    if (Math.abs(op - this.guarda.opaco) > 0.02) {
      this.guarda.opaco = op
      for (const m of this.guarda.mats) { const t = op < 0.99; if (m.transparent !== t) { m.transparent = t; m.depthWrite = !t; m.needsUpdate = true } m.opacity = op }
    }
    if (this.hospedada) {
      // quem desenha é o canvas do mundo: aqui só sai onde a câmera dele deve ficar
      this.cam.updateMatrix()
      this.m4.multiplyMatrices(this.cena.matrix, this.cam.matrix).decompose(this.posMundo, this.quatMundo, this.escMundo)
      return
    }
    this.r.render(this.cena, this.cam)
    this.calls = this.r.info.render.calls; this.tris = this.r.info.render.triangles
    void tela
  }

  destruir() {
    this.morto = true
    this.cena.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mt = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mt)) mt.forEach((x) => x.dispose()); else mt?.dispose()
    })
    this.cena.parent?.remove(this.cena)
    if (!this.hospedada) this.r.dispose()
  }
}
