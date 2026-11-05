"use client"

// A NOITE DAS RUÍNAS DO SUBÚRBIO (05/11). Bíblia, 4: o subúrbio é exponencial,
// é onde rola toda a vida. As ruínas ficavam escuras de noite; aqui elas
// acendem SEM luz pontual nenhuma (desempenho):
//   - janelas: as janelas desenhadas na fachada assada acendem no próprio
//     shader das ruínas (0 triângulo, 0 draw call a mais);
//   - letreiros e tubos de neon, tambores de fogo e varais de luz (abaixo).
// Tudo sorteado com semente fixa (sempre igual) e só de noite: `U.noite` segue
// o céu (ceuNaHora(h).noite), atualizado pelo RuinasSuburbio.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

import { N_PALAVRAS, type LuzesRuinas } from "./luzesRuinas"

// os uniforms de todas as luzes das ruínas (um objeto só, compartilhado)
export const U = { noite: { value: 0 }, tempo: { value: 0 } }

// quanto acende: 0 de dia, 1 de noite (a noite do céu vai de 0 a 1 entre 17 h e 19 h)
export const acesoNaNoite = (noite: number) => {
  const t = Math.min(1, Math.max(0, (noite - 0.3) / 0.6))
  return t * t * (3 - 2 * t)
}

// JANELAS ACESAS. A textura das ruínas (1024, fachada assada) tem as janelas
// como retângulos quase pretos na parede clara. Um texel acende se:
//   - está na parte da fachada do atlas (u < 0,868; à direita é concreto e
//     entulho, com rachaduras escuras que não são janela);
//   - é escuro, e os vizinhos a 8 texels dos DOIS lados (na horizontal ou na
//     vertical) são claros: assim a borda das ilhas (o preto do atlas de um
//     lado só) e os buracos grandes não acendem;
//   - o sorteio da célula do mundo (1,8 × 2,8 m, uma janela) deixa: ~40% das
//     janelas, e um prédio em cada cinco fica todo apagado.
// Cor: âmbar quente na maioria, branco quente, laranja, e umas neon (rosa,
// ciano); 3% piscam como TV ligada.
export function janelasAcesas(base: THREE.Material): THREE.Material {
  const m = (base as THREE.MeshStandardMaterial).clone()
  m.name = "RUINAS_NOITE"
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNoite = U.noite
    sh.uniforms.uTempo = U.tempo
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        varying vec3 vJanW;`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
        vJanW = (modelMatrix * vec4(transformed, 1.0)).xyz;`)
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform float uNoite;
        uniform float uTempo;
        varying vec3 vJanW;
        float hashJ(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`)
      // (depois do uniform "map", que é declarado no map_pars)
      .replace("#include <map_pars_fragment>", `#include <map_pars_fragment>
        #ifdef USE_MAP
        float lumJ(vec2 uv, float lod) { return dot(textureLod(map, uv, lod).rgb, vec3(0.2126, 0.7152, 0.0722)); }
        #endif`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        #ifdef USE_MAP
        if (uNoite > 0.001 && vMapUv.x < 0.868 && vMapUv.x > 0.0) {
          vec2 tam = vec2(textureSize(map, 0));
          vec2 px = vMapUv * tam;
          // até 1 mip: de longe a janela ainda acende (borrada, ela some)
          float lod = clamp(log2(max(length(dFdx(px)), length(dFdy(px)))), 0.0, 1.0);
          float c0 = lumJ(vMapUv, lod);
          if (c0 < 0.016) {
            vec2 d = 8.0 / tam;
            bool hz = min(lumJ(vMapUv + vec2(d.x, 0.0), lod), lumJ(vMapUv - vec2(d.x, 0.0), lod)) > 0.03;
            bool vt = min(lumJ(vMapUv + vec2(0.0, d.y), lod), lumJ(vMapUv - vec2(0.0, d.y), lod)) > 0.03;
            vec3 cel = floor(vJanW / vec3(1.8, 2.8, 1.8));
            float r = hashJ(cel);
            float predio = hashJ(floor(vJanW / 22.0) + 7.1);
            if ((hz || vt) && r < 0.4 && predio > 0.2) {
              float r2 = hashJ(cel + 17.3);
              vec3 cor = r2 < 0.55 ? vec3(1.0, 0.56, 0.22) : r2 < 0.75 ? vec3(1.0, 0.8, 0.52) : r2 < 0.85 ? vec3(1.0, 0.38, 0.1) : r2 < 0.93 ? vec3(1.0, 0.2, 0.62) : vec3(0.22, 0.82, 1.0);
              float tv = r2 > 0.97 ? 0.55 + 0.45 * sin(uTempo * 9.0 + r * 40.0) * sin(uTempo * 3.1 + r * 11.0) : 1.0;
              totalEmissiveRadiance += cor * (1.7 * uNoite * tv * (1.0 - smoothstep(0.006, 0.016, c0)));
            }
          }
        }
        #endif`)
  }
  m.customProgramCacheKey = () => "ruinas-janelas-2"
  return m
}

// ---------------------------------------------------------------------------
// O RESTO DA NOITE (sorteado em luzesRuinas.ts), em 4 draw calls no total:
//   - letreiros e tubos de neon: um InstancedMesh de quadrados num atlas de
//     palavras desenhado no canvas (tubo de neon = traço fino + brilho);
//   - brilhos: um InstancedMesh de quadrados de frente pra câmera (as lâmpadas
//     dos varais e as chamas) e deitados no chão (o clarão do fogo);
//   - tambores: um InstancedMesh de cilindro aberto, 16 triângulos cada;
//   - fios dos varais: um LineSegments só (curva com 8 pedaços cada).
// Os dois primeiros somem de dia (visible = false: 0 draw call).

// a paleta neon do bairro (rosa, ciano, âmbar, verde, violeta, vermelho)
const NEON: [number, number, number][] = [[1, 0.18, 0.68], [0.2, 0.88, 1], [1, 0.6, 0.15], [0.3, 1, 0.5], [0.66, 0.36, 1], [1, 0.18, 0.2]]
const PALAVRAS = ["BAR", "LANCHES", "DISCOS", "BAILE", "BRECHÓ", "FLORES", "24H", "HOTEL", "SALÃO", "ABERTO", "OFICINA", "BEAT"]

// o atlas: 2 colunas × 8 linhas de 512 × 128. Canal R = brilho (borrado), G = o tubo (fino).
function atlasLetreiros() {
  const c = document.createElement("canvas")
  c.width = 1024; c.height = 1024
  const g = c.getContext("2d")!
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024)
  g.globalCompositeOperation = "lighter"
  g.lineJoin = "round"; g.lineCap = "round"
  const celula = (i: number, desenho: () => void) => {
    g.save()
    g.translate((i % 2) * 512, Math.floor(i / 2) * 128)
    g.beginPath(); g.rect(0, 0, 512, 128); g.clip()
    // brilho (vermelho) e depois o tubo (verde)
    g.strokeStyle = g.fillStyle = "#f00"; g.shadowColor = "#f00"; g.shadowBlur = 16; g.lineWidth = 9
    desenho()
    g.shadowBlur = 0; g.strokeStyle = g.fillStyle = "#0f0"; g.lineWidth = 3.5
    desenho()
    g.restore()
  }
  PALAVRAS.forEach((p, i) => celula(i, () => {
    g.font = `800 78px "Arial Narrow", "Helvetica Neue", system-ui, sans-serif`
    g.textAlign = "center"; g.textBaseline = "middle"
    g.strokeText(p, 256, 66, 440)
    if (i % 3 === 0) { g.beginPath(); g.roundRect(14, 12, 484, 104, 22); g.stroke() }
  }))
  const tubos: (() => void)[] = [
    () => { g.beginPath(); g.moveTo(20, 64); g.lineTo(492, 64); g.stroke() },
    () => { g.beginPath(); g.moveTo(20, 46); g.lineTo(492, 46); g.moveTo(20, 84); g.lineTo(492, 84); g.stroke() },
    () => { g.beginPath(); for (let k = 0; k < 4; k++) { g.moveTo(40 + k * 115, 30); g.lineTo(90 + k * 115, 64); g.lineTo(40 + k * 115, 98) } g.stroke() },
    () => { g.beginPath(); g.moveTo(20, 64); for (let k = 0; k <= 16; k++) g.lineTo(20 + k * 29.5, k % 2 ? 34 : 94); g.stroke() },
  ]
  tubos.forEach((t, k) => celula(N_PALAVRAS + k, t))
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  return tex
}

const NEVOA_GLSL = {
  vert: `varying float vNevoa;`,
  frag: `
    varying float vNevoa;
    #ifdef USE_FOG
      uniform float fogNear;
      uniform float fogFar;
    #endif
    // somado (aditivo): a névoa apaga em vez de pintar
    float nevoa() {
      #ifdef USE_FOG
        return 1.0 - smoothstep(fogNear, fogFar, vNevoa);
      #else
        return 1.0;
      #endif
    }`,
}
const uniformsComNevoa = (extra: Record<string, THREE.IUniform>) => ({ ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uNoite: U.noite, uTempo: U.tempo, ...extra })
const aditivo = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, toneMapped: false } as const

function materialLetreiros(mapa: THREE.Texture) {
  return new THREE.ShaderMaterial({
    ...aditivo,
    side: THREE.DoubleSide,
    uniforms: uniformsComNevoa({ uMapa: { value: mapa } }),
    vertexShader: `
      attribute float aCel;
      attribute float aFase;
      varying vec2 vUv;
      varying vec3 vCor;
      varying float vFase;
      ${NEVOA_GLSL.vert}
      void main() {
        vUv = (vec2(mod(aCel, 2.0), 7.0 - floor(aCel / 2.0)) + uv) / vec2(2.0, 8.0);
        vCor = instanceColor;
        vFase = aFase;
        vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vNevoa = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMapa;
      uniform float uNoite;
      uniform float uTempo;
      varying vec2 vUv;
      varying vec3 vCor;
      varying float vFase;
      ${NEVOA_GLSL.frag}
      void main() {
        vec2 t = texture2D(uMapa, vUv).rg;
        // 1 em 10 tem mau contato: apaga aos trancos
        float pisca = vFase > 0.9 ? step(0.22, fract(sin(floor(uTempo * 11.0 + vFase * 50.0) * 12.9898) * 43758.5453)) : 1.0;
        vec3 cor = vCor * t.r * 1.5 + mix(vCor, vec3(1.0), 0.6) * t.g * 1.1;
        gl_FragColor = vec4(cor * uNoite * max(pisca, 0.12) * nevoa(), 1.0);
      }`,
  })
}

// tipo 0: lâmpada (bola macia), 1: chama (gota que tremula, base embaixo), 2: clarão deitado no chão
function materialBrilhos() {
  return new THREE.ShaderMaterial({
    ...aditivo,
    uniforms: uniformsComNevoa({}),
    vertexShader: `
      attribute float aTipo;
      attribute float aFase;
      uniform float uTempo;
      varying vec2 vUv;
      varying vec3 vCor;
      varying float vTipo;
      varying float vForca;
      ${NEVOA_GLSL.vert}
      void main() {
        vUv = uv;
        vCor = instanceColor;
        vTipo = aTipo;
        vec4 c = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        float sx = length(instanceMatrix[0].xyz), sy = length(instanceMatrix[1].xyz);
        float t = uTempo * 7.0 + aFase * 30.0;
        vec4 mv;
        if (aTipo < 0.5) {
          vForca = 0.8 + 0.2 * sin(uTempo * 1.7 + aFase * 6.2832);
          mv = viewMatrix * c;
          mv.xy += position.xy * sx;
        } else if (aTipo < 1.5) {
          vForca = 0.85 + 0.1 * sin(t) + 0.06 * sin(t * 2.3 + 1.0);
          mv = viewMatrix * c;
          mv.x += position.x * sx * (0.9 + 0.1 * sin(t * 1.7));
          mv.y += (position.y + 0.5) * sy * vForca;
        } else {
          vForca = 0.85 + 0.12 * sin(t * 0.9);
          mv = viewMatrix * (c + vec4(position.x * sx, 0.0, -position.y * sx, 0.0));
        }
        vNevoa = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uNoite;
      uniform float uTempo;
      varying vec2 vUv;
      varying vec3 vCor;
      varying float vTipo;
      varying float vForca;
      ${NEVOA_GLSL.frag}
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        vec3 cor;
        if (vTipo < 0.5) {
          float r = length(p);
          cor = vCor * (exp(-r * r * 9.0) * 0.9 + smoothstep(0.22, 0.0, r) * 0.9);
        } else if (vTipo < 1.5) {
          // a gota: larga embaixo, fina em cima, o miolo amarelo-branco
          float y = vUv.y;
          float w = mix(0.95, 0.05, pow(y, 0.8));
          float x = abs(p.x) / w;
          float a = smoothstep(1.0, 0.15, x) * smoothstep(1.0, 0.45, y) * smoothstep(0.0, 0.1, y);
          float miolo = smoothstep(0.55, 0.0, x) * smoothstep(0.7, 0.1, y);
          cor = vCor * a * 1.3 + vec3(1.0, 0.85, 0.5) * miolo * a;
        } else {
          float r = length(p);
          cor = vCor * pow(max(0.0, 1.0 - r), 2.2) * 0.55;
        }
        gl_FragColor = vec4(cor * vForca * uNoite * nevoa(), 1.0);
      }`,
  })
}

export function RuinasLuz({ luzes }: { luzes: LuzesRuinas }) {
  const brilhosRef = useRef<THREE.InstancedMesh>(null)
  const letreirosRef = useRef<THREE.InstancedMesh>(null)
  const { letreiros, brilhos, tambores, fios, mats } = useMemo(() => {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), e = new THREE.Vector3(), cor = new THREE.Color()
    const eixoY = new THREE.Vector3(0, 1, 0)

    // letreiros
    const L = luzes.letreiros
    const gL = new THREE.PlaneGeometry(1, 1)
    gL.setAttribute("aCel", new THREE.InstancedBufferAttribute(new Float32Array(L.map((l) => l.cel)), 1))
    gL.setAttribute("aFase", new THREE.InstancedBufferAttribute(new Float32Array(L.map((l) => l.fase)), 1))
    const tex = atlasLetreiros()
    const mL = materialLetreiros(tex)
    const letreiros = new THREE.InstancedMesh(gL, mL, Math.max(1, L.length))
    letreiros.count = L.length
    L.forEach((l, i) => {
      m4.compose(v.set(l.x, l.y, l.z), q.setFromAxisAngle(eixoY, l.rumo), e.set(l.larg, l.alt, 1))
      letreiros.setMatrixAt(i, m4)
      letreiros.setColorAt(i, cor.setRGB(...NEON[l.cor]))
    })
    if (!L.length) letreiros.setColorAt(0, cor.setRGB(0, 0, 0)) // (o shader pede a cor por instância)
    letreiros.name = "ruinas-letreiros"

    // brilhos: lâmpadas dos varais, chamas e clarões dos tambores
    type B = { x: number; y: number; z: number; sx: number; sy: number; tipo: number; fase: number; c: [number, number, number] }
    const bs: B[] = []
    const QUENTE: [number, number, number] = [1, 0.7, 0.32]
    const fios: number[] = []
    for (const va of luzes.varais) {
      const dx = va.bx - va.ax, dz = va.bz - va.az, comp = Math.hypot(dx, dz)
      const em = (t: number): [number, number, number] => [va.ax + dx * t, va.ay + (va.by - va.ay) * t - va.flecha * 4 * t * (1 - t), va.az + dz * t]
      for (let k = 0; k < 8; k++) fios.push(...em(k / 8), ...em((k + 1) / 8))
      const n = Math.max(3, Math.floor(comp / 1.1))
      for (let k = 1; k < n; k++) {
        const [x, y, z] = em(k / n)
        // varal 0: todo quente; 1: colorido; 2: quente com uma colorida a cada três
        // (ci 05/11) o varal do lado negativo do x dava índice negativo (o % do JS
        // mantém o sinal): cor undefined e o subúrbio caía com "e.c is not iterable"
        const c = va.cores === 0 ? QUENTE : va.cores === 1 ? NEON[(((k + Math.round(va.ax)) % NEON.length) + NEON.length) % NEON.length] : k % 3 ? QUENTE : NEON[k % NEON.length]
        bs.push({ x, y: y - 0.12, z, sx: 0.55, sy: 0.55, tipo: 0, fase: (k * 0.37 + va.ax) % 1, c })
      }
    }
    for (const t of luzes.tambores) {
      bs.push({ x: t.x, y: t.y + 0.86, z: t.z, sx: 0.75, sy: 1.25, tipo: 1, fase: t.fase, c: [1, 0.42, 0.1] })
      bs.push({ x: t.x, y: t.y + 0.06, z: t.z, sx: 3.2, sy: 3.2, tipo: 2, fase: t.fase, c: [1, 0.45, 0.12] })
    }
    const gB = new THREE.PlaneGeometry(1, 1)
    gB.setAttribute("aTipo", new THREE.InstancedBufferAttribute(new Float32Array(bs.map((b) => b.tipo)), 1))
    gB.setAttribute("aFase", new THREE.InstancedBufferAttribute(new Float32Array(bs.map((b) => b.fase)), 1))
    const mB = materialBrilhos()
    const brilhos = new THREE.InstancedMesh(gB, mB, Math.max(1, bs.length))
    brilhos.count = bs.length
    q.identity()
    bs.forEach((b, i) => {
      brilhos.setMatrixAt(i, m4.compose(v.set(b.x, b.y, b.z), q, e.set(b.sx, b.sy, 1)))
      brilhos.setColorAt(i, cor.setRGB(...b.c))
    })
    if (!bs.length) brilhos.setColorAt(0, cor.setRGB(0, 0, 0))
    brilhos.name = "ruinas-brilhos"
    // o quadrado vira de frente pra câmera no shader: a esfera de corte cobre o maior brilho
    brilhos.computeBoundingSphere()
    if (brilhos.boundingSphere) brilhos.boundingSphere.radius += 3

    // tambores: cilindro aberto (o fogo sai de dentro), enferrujado
    const gT = new THREE.CylinderGeometry(0.31, 0.29, 0.9, 8, 1, true)
    gT.translate(0, 0.45, 0)
    const mT = new THREE.MeshStandardMaterial({ color: "#3b2216", roughness: 0.85, metalness: 0.3, side: THREE.DoubleSide, emissive: "#ff5a14", emissiveIntensity: 0 })
    // a boca do tambor brilha por dentro de noite (emissivo só no alto da lata, no shader)
    mT.onBeforeCompile = (sh) => {
      sh.uniforms.uNoite = U.noite
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", `#include <common>
          varying float vAltT;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          vAltT = position.y;`)
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          uniform float uNoite;
          varying float vAltT;`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(1.0, 0.36, 0.08) * uNoite * (gl_FrontFacing ? smoothstep(0.55, 0.9, vAltT) * 0.6 : 0.4 + vAltT);`)
    }
    mT.customProgramCacheKey = () => "ruinas-tambor-1"
    const tambores = new THREE.InstancedMesh(gT, mT, Math.max(1, luzes.tambores.length))
    tambores.count = luzes.tambores.length
    luzes.tambores.forEach((t, i) => tambores.setMatrixAt(i, m4.compose(v.set(t.x, t.y, t.z), q.setFromAxisAngle(eixoY, t.fase * 6.28), e.set(1, 1, 1))))
    tambores.name = "ruinas-tambores"
    tambores.computeBoundingSphere()

    // os fios dos varais
    const gF = new THREE.BufferGeometry()
    gF.setAttribute("position", new THREE.Float32BufferAttribute(fios, 3))
    const mF = new THREE.LineBasicMaterial({ color: "#14121a" })
    const linhas = new THREE.LineSegments(gF, mF)
    linhas.name = "ruinas-fios"

    return { letreiros, brilhos, tambores, fios: linhas, mats: { tex, mL, mB, mT, mF, gL, gB, gT, gF } }
  }, [luzes])

  // de dia o que só brilha nem desenha
  useFrame(() => {
    const ligado = U.noite.value > 0.002
    if (brilhosRef.current) brilhosRef.current.visible = ligado && brilhos.count > 0
    if (letreirosRef.current) letreirosRef.current.visible = ligado && letreiros.count > 0
  })
  useEffect(() => () => { for (const x of Object.values(mats)) x.dispose() }, [mats])
  return (
    <group name="ruinas-luz">
      <primitive ref={letreirosRef} object={letreiros} />
      <primitive ref={brilhosRef} object={brilhos} />
      {tambores.count > 0 && <primitive object={tambores} />}
      <primitive object={fios} />
    </group>
  )
}
