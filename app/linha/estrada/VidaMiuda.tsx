// AS COISAS PEQUENAS VIVAS DAS RUÍNAS (05/11): gatos e cachorros andando,
// roupa no varal balançando e a fumaça dos tambores de fogo. Só construtores
// (sem React, sem useFrame): o VidaSuburbio.tsx monta e mexe (um useFrame só
// pra toda a vida do subúrbio). Tudo instanciado, a animação no shader, sem luz.

import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import { CHAO_LUGARES } from "../disco/historia"
import type { LuzesRuinas } from "./luzesRuinas"
import { U } from "./RuinasLuz"
import { semente } from "./vidaNasRuas"

const GLSL_ROT = `
  float hashB(float n) { return fract(sin(n * 91.345 + 3.1) * 47453.5453); }
  mat3 rotXb(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotYb(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
`

// ── BICHOS: gato (pequeno, rabo pra cima) e cachorro (maior, abana o rabo).
// 7 caixas, 84 triângulos. aParte: 0 corpo, 1–4 pernas (FE, FD, TE, TD), 5 rabo, 6 cabeça ──
export function geoBicho() {
  const caixa = (w: number, h: number, d: number, x: number, y: number, z: number, parte: number) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed()
    g.translate(x, y, z)
    g.deleteAttribute("uv")
    g.setAttribute("aParte", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(parte), 1))
    return g
  }
  return mergeGeometries([
    caixa(0.2, 0.19, 0.5, 0, 0.33, 0, 0),
    caixa(0.06, 0.26, 0.06, 0.065, 0.13, 0.19, 1),
    caixa(0.06, 0.26, 0.06, -0.065, 0.13, 0.19, 2),
    caixa(0.06, 0.26, 0.06, 0.065, 0.13, -0.19, 3),
    caixa(0.06, 0.26, 0.06, -0.065, 0.13, -0.19, 4),
    caixa(0.04, 0.04, 0.3, 0, 0.4, -0.38, 5),
    caixa(0.16, 0.16, 0.17, 0, 0.47, 0.3, 6),
  ])!
}

// aVida: x o passo, y quanto anda, z 0 gato / 1 cachorro, w a semente
export function materialBicho() {
  const m = new THREE.MeshLambertMaterial({ color: "#ffffff" })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTempo = U.tempo
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        attribute vec4 aVida;
        attribute float aParte;
        uniform float uTempo;
        varying vec3 vCorB;
        ${GLSL_ROT}
        const vec3 GATO[4] = vec3[4](vec3(0.06,0.06,0.07), vec3(0.9,0.5,0.18), vec3(0.45,0.45,0.48), vec3(0.88,0.86,0.82));
        const vec3 CAO[4] = vec3[4](vec3(0.72,0.5,0.28), vec3(0.08,0.07,0.07), vec3(0.85,0.8,0.7), vec3(0.4,0.26,0.16));`)
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        float fase = aVida.x, anda = aVida.y, cao = aVida.z, sem = aVida.w;
        float pp = aParte;
        mat3 Rb = mat3(1.0);
        vec3 pivB = vec3(0.0);
        if (pp > 0.5 && pp < 4.5) {
          // trote: as diagonais juntas (FE com TD, FD com TE)
          float diag = (pp < 1.5 || pp > 3.5) ? 0.0 : 3.1416;
          pivB = vec3(0.0, 0.26, pp < 2.5 ? 0.19 : -0.19);
          Rb = rotXb(sin(fase + diag) * 0.6 * anda);
        } else if (pp > 4.5 && pp < 5.5) {
          // o rabo: o gato levanta e balança devagar; o cachorro abana
          pivB = vec3(0.0, 0.4, -0.23);
          Rb = cao > 0.5 ? rotYb(sin(uTempo * 13.0 + sem * 30.0) * 0.55) * rotXb(-0.35)
                         : rotYb(sin(uTempo * 1.3 + sem * 30.0) * 0.35) * rotXb(-1.1);
        } else if (pp > 5.5) {
          // a cabeça: olha pros lados quando para
          pivB = vec3(0.0, 0.42, 0.22);
          Rb = rotYb(sin(uTempo * 0.8 + sem * 11.0) * 0.6 * (1.0 - anda));
        }
        objectNormal = Rb * objectNormal;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed = Rb * (transformed - pivB) + pivB;
        transformed.y += anda * 0.02 * abs(sin(fase));
        vCorB = cao > 0.5 ? CAO[int(hashB(sem * 5.1) * 3.99)] : GATO[int(hashB(sem * 5.1) * 3.99)];`)
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vCorB;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        diffuseColor.rgb *= vCorB;`)
  }
  m.customProgramCacheKey = () => "vida-bicho-1"
  return m
}

// ── ROUPA NO VARAL: nos varais de luz (luzesRuinas.ts) mais perto do bar, peças
// penduradas entre as lâmpadas (camiseta, toalha, calça, lençol, meia), cada
// uma um quadrado (4 triângulos) que balança no vento no vertex shader. Fixas:
// nenhuma conta por quadro ──
const CORES_ROUPA = ["#d94a8c", "#3fb6d8", "#f0b23a", "#e8e2d0", "#5c7bd9", "#c23b3b", "#7ad06b", "#efe9f2", "#2a2a33", "#f08a3a"]
const PECAS: [number, number, number][] = [[0.55, 0.62, 5], [0.7, 0.85, 3], [0.38, 0.95, 3], [1.15, 1.05, 1], [0.14, 0.3, 2]] // largura, altura, peso no sorteio

export function criarRoupas(luzes: LuzesRuinas, n: number) {
  const rnd = semente(0x7a2a1)
  const bar = CHAO_LUGARES.bar
  const varais = [...luzes.varais]
    .sort((a, b) => Math.hypot((a.ax + a.bx) / 2 - bar.x, (a.az + a.bz) / 2 - bar.z) - Math.hypot((b.ax + b.bx) / 2 - bar.x, (b.az + b.bz) / 2 - bar.z))
    .slice(0, n)
  type R = { x: number; y: number; z: number; giro: number; w: number; h: number; fase: number; cor: number }
  const rs: R[] = []
  const somaPeso = PECAS.reduce((s, p) => s + p[2], 0)
  for (const va of varais) {
    const dx = va.bx - va.ax, dz = va.bz - va.az, comp = Math.hypot(dx, dz)
    const giro = Math.atan2(-dz, dx)
    let t = 0.1 + rnd() * 0.05
    while (t < 0.9) {
      let r = rnd() * somaPeso, k = 0
      while (r > PECAS[k][2]) { r -= PECAS[k][2]; k++ }
      const [w, h] = PECAS[k]
      const tm = t + w / 2 / comp
      if (tm > 0.9) break
      // um vão de vez em quando (o varal não é cheio)
      if (rnd() < 0.8) {
        const y = va.ay + (va.by - va.ay) * tm - va.flecha * 4 * tm * (1 - tm)
        rs.push({ x: va.ax + dx * tm, y: y - 0.03, z: va.az + dz * tm, giro, w, h, fase: rnd(), cor: Math.floor(rnd() * CORES_ROUPA.length) })
      }
      t += (w + 0.12 + rnd() * 0.35) / comp
    }
  }
  const geo = new THREE.PlaneGeometry(1, 1, 1, 2)
  geo.translate(0, -0.5, 0)
  geo.setAttribute("aFase", new THREE.InstancedBufferAttribute(new Float32Array(rs.map((r) => r.fase)), 1))
  const mat = new THREE.MeshLambertMaterial({ color: "#ffffff", side: THREE.DoubleSide })
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTempo = U.tempo
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        attribute float aFase;
        uniform float uTempo;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        // o vento: a peça gira em volta do fio (o topo) e a barra tremula
        float aR = (0.16 + 0.1 * sin(uTempo * 0.31 + aFase * 9.0)) * sin(uTempo * 1.7 + aFase * 6.2832);
        float baixo = -position.y;
        float cR = cos(aR), sR = sin(aR);
        transformed = vec3(transformed.x, transformed.y * cR - transformed.z * sR, transformed.y * sR + transformed.z * cR);
        transformed.z += sin(uTempo * 5.0 + position.x * 5.0 + aFase * 20.0) * 0.06 * baixo;`)
  }
  mat.customProgramCacheKey = () => "vida-roupa-1"
  const malha = new THREE.InstancedMesh(geo, mat, Math.max(1, rs.length))
  malha.count = rs.length
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), e = new THREE.Vector3(), cor = new THREE.Color(), eixoY = new THREE.Vector3(0, 1, 0)
  rs.forEach((r, i) => {
    malha.setMatrixAt(i, m4.compose(v.set(r.x, r.y, r.z), q.setFromAxisAngle(eixoY, r.giro), e.set(r.w, r.h, 1)))
    malha.setColorAt(i, cor.set(CORES_ROUPA[r.cor]))
  })
  if (!rs.length) malha.setColorAt(0, cor.set("#000"))
  malha.name = "vida-roupas"
  malha.computeBoundingSphere()
  if (malha.boundingSphere) malha.boundingSphere.radius += 1.5
  malha.matrixAutoUpdate = false
  return { malha, geo, mat }
}

// ── FUMAÇA DOS TAMBORES: quadrados de frente pra câmera que sobem, crescem e
// somem (a vida de cada um é fract(tempo + fase), no shader). Mistura normal,
// sem escrever profundidade; só de noite (o fogo só acende de noite) ──
export function criarFumaca(luzes: LuzesRuinas, porTambor: number, maxTambores: number) {
  const bar = CHAO_LUGARES.bar
  const tambores = [...luzes.tambores]
    .sort((a, b) => (a.x - bar.x) ** 2 + (a.z - bar.z) ** 2 - ((b.x - bar.x) ** 2 + (b.z - bar.z) ** 2))
    .slice(0, maxTambores)
  const n = tambores.length * porTambor
  const geo = new THREE.PlaneGeometry(1, 1)
  const malhaN = Math.max(1, n)
  const fases = new Float32Array(malhaN)
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTempo: U.tempo, uNoite: U.noite },
    vertexShader: `
      attribute float aFase;
      uniform float uTempo;
      uniform float uNoite;
      varying vec2 vUv;
      varying float vA;
      varying float vVida;
      varying float vNevoa;
      void main() {
        float vida = fract(uTempo * 0.15 + aFase);
        vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float ang = aFase * 6.2832;
        c.xyz += vec3(sin(ang), 0.0, cos(ang)) * vida * vida * 1.8 + vec3(0.0, 0.95 + vida * 5.0, 0.0);
        float tam = 0.45 + vida * 2.3;
        float g = ang + uTempo * 0.25;
        vec2 q = mat2(cos(g), sin(g), -sin(g), cos(g)) * position.xy;
        vec4 mv = viewMatrix * c;
        mv.xy += q * tam;
        vNevoa = -mv.z;
        vA = smoothstep(0.0, 0.12, vida) * (1.0 - vida) * uNoite;
        vVida = vida;
        vUv = uv;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec2 vUv;
      varying float vA;
      varying float vVida;
      varying float vNevoa;
      #ifdef USE_FOG
        uniform float fogNear;
        uniform float fogFar;
      #endif
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = dot(p, p);
        float a = exp(-r * 3.5) * smoothstep(1.0, 0.55, r) * vA * 0.3;
        #ifdef USE_FOG
          a *= 1.0 - smoothstep(fogNear, fogFar, vNevoa);
        #endif
        if (a < 0.004) discard;
        // embaixo, o laranja do fogo; em cima, cinza
        vec3 cor = mix(vec3(0.85, 0.42, 0.16), vec3(0.3, 0.29, 0.31), smoothstep(0.0, 0.3, vVida));
        gl_FragColor = vec4(cor, a);
      }`,
  })
  const malha = new THREE.InstancedMesh(geo, mat, malhaN)
  malha.count = n
  const m4 = new THREE.Matrix4()
  tambores.forEach((t, i) => {
    for (let k = 0; k < porTambor; k++) {
      const j = i * porTambor + k
      malha.setMatrixAt(j, m4.makeTranslation(t.x, t.y, t.z))
      fases[j] = (t.fase + k / porTambor) % 1
    }
  })
  geo.setAttribute("aFase", new THREE.InstancedBufferAttribute(fases, 1))
  malha.name = "vida-fumaca"
  malha.computeBoundingSphere()
  if (malha.boundingSphere) malha.boundingSphere.radius += 8
  malha.matrixAutoUpdate = false
  malha.renderOrder = 2
  return { malha, geo, mat }
}
