"use client"

// A VIDA NAS RUÍNAS DO SUBÚRBIO (05/11). Bíblia, 4: o subúrbio é exponencial, é
// onde rola toda a vida. A lógica (as ruas, quem anda, quem para) está em
// vidaNasRuas.ts; aqui, o desenho. Desempenho primeiro (iPhone):
//   - a gente toda é UMA malha instanciada (72 triângulos cada, silhueta de
//     caixas no estilo do jogo), sem esqueleto: as pernas, os braços, o balanço
//     e a dança são girados no vertex shader;
//   - um useFrame só pra todo mundo: anda cada um no seu trecho de rua e
//     escreve a matriz e um vec4 (o passo, o andar, o jeito, a semente). Quem
//     está escondido nem entra (a contagem da malha encolhe);
//   - sem luz nova: o material é Lambert (as luzes que já existem), e o calor
//     do fogo, do bar e do palco é emissivo somado no shader;
//   - monta dentro do <Perto> das ruínas (é filho do RuinasSuburbio) e some
//     (visible = false, sem conta nenhuma) com a câmera longe do subúrbio.

import { useFrame } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"

import { RUA } from "../disco/corridaRua"
import { CHAO_LUGARES, SUBURBIO } from "../disco/historia"
import { player } from "../som"
import type { LuzesRuinas } from "./luzesRuinas"
import { QUALIDADE } from "./qualidade"
import { ruinasNoMundo } from "./ruinas"
import { U } from "./RuinasLuz"
import { QUANTO, abrirCaminho, andar, criarAndantes, criarParados, naCorrida, recuar, ruasDoSuburbio, semente, type Andante, type Parado } from "./vidaNasRuas"

type MundoMin = Parameters<typeof ruinasNoMundo>[0]

// os uniforms da vida (a noite e o tempo são os das luzes das ruínas)
const UV = { batida: { value: 0 }, pulso: { value: 0 } }

// ── A SILHUETA: 6 caixas (pernas, tronco, braços, cabeça), 72 triângulos ──
// aParte.x: 0 tronco, 1 perna esq, 2 perna dir, 3 braço esq, 4 braço dir, 5 cabeça
// aParte.y: a cor (0 roupa, 1 calça e sapato, 2 pele e cabelo, 3 manga e mão)
function geoPessoa() {
  const caixa = (w: number, h: number, d: number, x: number, y: number, z: number, parte: number, cor: number) => {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed()
    g.translate(x, y, z)
    g.deleteAttribute("uv")
    const n = g.attributes.position.count, a = new Float32Array(n * 2)
    for (let i = 0; i < n; i++) { a[i * 2] = parte; a[i * 2 + 1] = cor }
    g.setAttribute("aParte", new THREE.BufferAttribute(a, 2))
    return g
  }
  return mergeGeometries([
    caixa(0.17, 0.88, 0.19, 0.11, 0.44, 0, 1, 1),
    caixa(0.17, 0.88, 0.19, -0.11, 0.44, 0, 2, 1),
    caixa(0.44, 0.62, 0.25, 0, 1.17, 0, 0, 0),
    caixa(0.11, 0.62, 0.13, 0.285, 1.15, 0, 3, 3),
    caixa(0.11, 0.62, 0.13, -0.285, 1.15, 0, 4, 3),
    caixa(0.22, 0.27, 0.24, 0, 1.625, 0.01, 5, 2),
  ])!
}

// a paleta do subúrbio: roupas (neon gasto e escuros), calças, peles, cabelos
const GLSL_PALETA = `
  const vec3 ROUPA[10] = vec3[10](vec3(0.85,0.2,0.55), vec3(0.15,0.65,0.8), vec3(0.95,0.55,0.15), vec3(0.3,0.75,0.4), vec3(0.5,0.3,0.8),
    vec3(0.8,0.18,0.18), vec3(0.12,0.12,0.15), vec3(0.85,0.82,0.75), vec3(0.95,0.8,0.3), vec3(0.35,0.36,0.42));
  const vec3 CALCA[6] = vec3[6](vec3(0.14,0.2,0.38), vec3(0.1,0.1,0.12), vec3(0.32,0.3,0.27), vec3(0.22,0.28,0.5), vec3(0.4,0.22,0.15), vec3(0.6,0.58,0.55));
  const vec3 PELE[5] = vec3[5](vec3(0.95,0.75,0.6), vec3(0.8,0.56,0.4), vec3(0.6,0.4,0.27), vec3(0.42,0.27,0.18), vec3(0.3,0.19,0.13));
  const vec3 CABELO[5] = vec3[5](vec3(0.05,0.04,0.04), vec3(0.2,0.12,0.07), vec3(0.04,0.04,0.05), vec3(0.95,0.25,0.6), vec3(0.85,0.7,0.35));
  float hashV(float n) { return fract(sin(n * 91.345 + 3.1) * 47453.5453); }
  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
`

function materialPessoa() {
  const m = new THREE.MeshLambertMaterial({ color: "#ffffff" })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTempo = U.tempo
    sh.uniforms.uNoite = U.noite
    sh.uniforms.uBatida = UV.batida
    sh.uniforms.uPulso = UV.pulso
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        attribute vec4 aVida;
        attribute vec2 aParte;
        uniform float uTempo;
        uniform float uBatida;
        uniform float uPulso;
        uniform float uNoite;
        varying vec3 vCorA;
        varying vec3 vCorB;
        varying vec3 vLuzP;
        varying vec2 vPY;
        ${GLSL_PALETA}`)
      // aVida: x o passo (rad), y quanto anda (0–1), z o jeito (0 anda, 1 conversa, 2 dança; +0,25 no fogo, +0,5 no bar), w a semente
      .replace("#include <beginnormal_vertex>", `#include <beginnormal_vertex>
        float parte = aParte.x;
        float fase = aVida.x, anda = aVida.y, sem = aVida.w;
        float jeito = floor(aVida.z + 0.01), onde = aVida.z - jeito;
        float h1 = hashV(sem * 13.1), h2 = hashV(sem * 7.7 + 1.3), h3 = hashV(sem * 3.3 + 7.0), h4 = hashV(sem * 5.9 + 2.0);
        float danca = step(1.5, jeito);
        float conversa = step(0.5, jeito) * (1.0 - danca);
        float sw = sin(fase);
        float pulsoB = 1.0 - uBatida; pulsoB *= pulsoB;
        float ang = 0.0;
        vec3 piv = vec3(0.0);
        if (parte > 0.5 && parte < 2.5) {
          // as pernas: o passo; na dança, dobra alternando no tempo
          piv = vec3(0.0, 0.88, 0.0);
          float lado = parte < 1.5 ? 1.0 : -1.0;
          ang = sw * 0.55 * anda * lado + danca * lado * 0.22 * sin(uBatida * 6.2832 + h1 * 3.0);
        } else if (parte > 2.5 && parte < 4.5) {
          // os braços: contra o passo; conversando, um gesticula de vez em quando
          // (no fogo, as mãos pra frente); dançando, metade levanta, metade bombeia
          piv = vec3(0.0, 1.44, 0.0);
          float lado = parte < 3.5 ? 1.0 : -1.0;
          ang = -sw * 0.45 * anda * lado;
          float gesto = smoothstep(0.55, 0.95, sin(uTempo * (0.5 + h3 * 0.6) + sem * 40.0)) * step(0.0, lado * (h2 - 0.5));
          float fogo = step(0.2, onde) * step(onde, 0.3);
          ang -= conversa * (gesto * (0.85 + 0.3 * sin(uTempo * 5.0 + sem * 9.0)) + 0.1 + fogo * 0.55 * step(0.5, h4));
          ang -= danca * (h1 > 0.5 ? 2.55 + 0.3 * sin(uBatida * 6.2832 + lado * 1.6) : 0.5 + 0.9 * pulsoB);
        } else if (parte > 4.5) {
          // a cabeça: concorda conversando, balança no tempo dançando
          piv = vec3(0.0, 1.5, 0.0);
          ang = conversa * 0.08 * sin(uTempo * 2.2 + sem * 17.0) + danca * 0.16 * pulsoB;
        }
        mat3 R = rotX(ang);
        float giro = conversa * 0.14 * sin(uTempo * 0.6 + sem * 20.0) + danca * 0.4 * sin(uTempo * 0.7 + sem * 30.0);
        mat3 G = rotY(giro);
        objectNormal = G * (R * objectNormal);`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        vec3 pp = R * (transformed - piv) + piv;
        pp.x *= 0.88 + h2 * 0.28;
        transformed = G * pp;
        transformed.y += anda * 0.035 * abs(cos(fase)) + danca * (0.03 + 0.1 * uPulso) * pulsoB * (0.6 + 0.4 * h1);
        // a cor: roupa/manga (A) e o que é pele, calça ou cabelo (B), separados no fragment pela altura
        float cls = aParte.y;
        vec3 roupa = ROUPA[int(h1 * 9.99)], calca = CALCA[int(h2 * 5.99)], pele = PELE[int(h3 * 4.99)];
        vec3 cabelo = CABELO[int(h4 * 4.99)];
        vCorA = cls < 1.5 ? (cls < 0.5 ? roupa : calca) : (cls < 2.5 ? pele : roupa);
        vCorB = cls < 1.5 ? vec3(0.07, 0.065, 0.075) : (cls < 2.5 ? cabelo : pele);
        // corte: sapato embaixo de 0,09 m; cabelo acima de 1,71; mão abaixo de 0,92
        float corte = cls < 0.5 ? -1.0 : cls < 1.5 ? 0.09 : cls < 2.5 ? 1.71 : 0.92;
        vPY = vec2(position.y - corte, cls);
        // o calor de perto (emissivo, sem luz): fogo laranja na frente, a porta do bar, o palco
        float frente = clamp(objectNormal.z * 0.6 + 0.4, 0.0, 1.0);
        vec3 calor = onde > 0.6 ? vec3(0.5, 0.35, 0.18) * 0.5 : onde > 0.4 ? vec3(1.0, 0.75, 0.45) * 0.22 : onde > 0.2 ? vec3(1.0, 0.42, 0.12) * 0.55 * frente : vec3(0.0);
        vLuzP = calor * uNoite;`)
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        varying vec3 vCorA;
        varying vec3 vCorB;
        varying vec3 vLuzP;
        varying vec2 vPY;`)
      .replace("#include <color_fragment>", `#include <color_fragment>
        // a cor B fica embaixo do corte (sapato, mão) ou em cima (cabelo)
        bool emB = vPY.y < 0.5 ? false : (vPY.y > 1.5 && vPY.y < 2.5) ? vPY.x > 0.0 : vPY.x < 0.0;
        diffuseColor.rgb *= emB ? vCorB : vCorA;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        totalEmissiveRadiance += vLuzP * diffuseColor.rgb + vLuzP * 0.08;`)
  }
  m.customProgramCacheKey = () => "vida-pessoa-1"
  return m
}

// ONDE ESTÁ O JOGADOR (pra abrir caminho). Sem mexer no Corrida.tsx: quem quiser
// dar a posição exata escreve aqui (x, z e até quando vale, no relógio do three);
// sem isso, vale a estimativa pela câmera (ela olha pro jogador: onde o olhar
// cruza o chão + 1 m, entre 2,5 e 10 m à frente dela)
export const VIDA_JOGADOR = { x: 0, z: 0, ate: -1 }
const _dir = new THREE.Vector3()
function ondeEstaJogador(cam: THREE.Camera, chao: (x: number, z: number) => number, agora: number, out: { x: number; z: number }) {
  if (VIDA_JOGADOR.ate > agora) { out.x = VIDA_JOGADOR.x; out.z = VIDA_JOGADOR.z; return out }
  cam.getWorldDirection(_dir)
  const p = cam.position, hz = Math.hypot(_dir.x, _dir.z) || 1
  let h = 6
  if (_dir.y < -0.03) h = ((p.y - chao(p.x, p.z) - 1) / -_dir.y) * hz
  h = Math.max(2.5, Math.min(10, h))
  out.x = p.x + (_dir.x / hz) * h; out.z = p.z + (_dir.z / hz) * h
  return out
}

// escreve a matriz (giro em y, escala e posição) direto no array da instância
function escrever(arr: Float32Array, i: number, x: number, y: number, z: number, rumo: number, s: number) {
  const c = Math.cos(rumo) * s, n = Math.sin(rumo) * s, o = i * 16
  arr[o] = c; arr[o + 1] = 0; arr[o + 2] = -n; arr[o + 3] = 0
  arr[o + 4] = 0; arr[o + 5] = s; arr[o + 6] = 0; arr[o + 7] = 0
  arr[o + 8] = n; arr[o + 9] = 0; arr[o + 10] = c; arr[o + 11] = 0
  arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1
}

export function VidaSuburbio({ M, luzes }: { M: MundoMin; luzes: LuzesRuinas }) {
  const vida = useMemo(() => {
    const Q = QUANTO[QUALIDADE.nivel]
    const { colisores } = ruinasNoMundo(M)
    const R = ruasDoSuburbio(M, colisores)
    const rnd = semente(0x51da)
    const andantes = criarAndantes(R, Q.andantes, rnd)
    const parados = criarParados(M, colisores, luzes, Q, rnd)
    const total = Math.max(1, andantes.length + parados.length)
    const geo = geoPessoa()
    const aVida = new THREE.InstancedBufferAttribute(new Float32Array(total * 4), 4)
    aVida.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute("aVida", aVida)
    const mat = materialPessoa()
    const gente = new THREE.InstancedMesh(geo, mat, total)
    gente.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    gente.count = 0
    gente.name = "vida-gente"
    // a esfera de corte: o subúrbio inteiro (a gente se mexe, não dá pra medir uma vez)
    gente.boundingSphere = new THREE.Sphere(new THREE.Vector3(SUBURBIO.x, 0, SUBURBIO.z), SUBURBIO.r + 30)
    gente.geometry.boundingSphere = gente.boundingSphere.clone()
    const yPalco = M.chao(CHAO_LUGARES.palco.x, CHAO_LUGARES.palco.z)
    gente.boundingSphere.center.y = yPalco
    return { R, rnd, andantes, parados, gente, aVida, geo, mat, batida: { media: 0, ultimo: 0, periodo: 0.5 }, jog: { x: 0, z: 0 } }
  }, [M, luzes])
  useEffect(() => () => { vida.geo.dispose(); vida.mat.dispose() }, [vida])

  useFrame((s, dt0) => {
    const { R, rnd, andantes, parados, gente, aVida, batida } = vida
    const cam = s.camera.position
    // longe do subúrbio: nem desenha nem anda
    const dSub = Math.hypot(cam.x - SUBURBIO.x, cam.z - SUBURBIO.z)
    gente.visible = dSub < SUBURBIO.r + 260
    if (!gente.visible) return
    const dt = Math.min(dt0, 0.1)
    const agora = s.clock.elapsedTime

    // a batida da rádio (só com o palco à vista): os graves passam da média = uma batida;
    // o intervalo entre elas vira o período (sem música, um passo calmo de 120 bpm)
    const pl = CHAO_LUGARES.palco
    if (Math.hypot(cam.x - pl.x, cam.z - pl.z) < 180) {
      const g = player.grave()
      batida.media += (g - batida.media) * Math.min(1, dt * 3)
      const desde = agora - batida.ultimo
      if (g > 0.18 && g > batida.media * 1.15 && desde > 0.28) {
        if (desde > 0.3 && desde < 1.0) batida.periodo += (desde - batida.periodo) * 0.25
        batida.ultimo = agora
      }
      if (g < 0.02) batida.periodo += (0.5 - batida.periodo) * Math.min(1, dt)
      UV.batida.value = ((agora - batida.ultimo) % batida.periodo) / batida.periodo
      UV.pulso.value += (Math.min(1, g * 1.5) - UV.pulso.value) * Math.min(1, dt * 6)
    }

    // o jogador (pra abrir caminho) e a corrida de rua (durante ela, ninguém fica no traçado:
    // quem está nele some encolhendo, e quem anda não entra nas ruas dela)
    const P = ondeEstaJogador(s.camera, M.chao, agora, vida.jog)
    const correndo = RUA.e.fase === "contagem" || RUA.e.fase === "valendo"
    const evitar = correndo ? (e: number) => R.ar[e].corrida : undefined
    const kv = Math.min(1, dt * 2.5)

    const mt = gente.instanceMatrix.array as Float32Array, va = aVida.array as Float32Array
    let k = 0
    for (const w of andantes) {
      abrirCaminho(w, P.x, P.z, dt)
      andar(R, w, w.vAgora * dt, rnd, evitar)
      // o passo: um ciclo a cada 1,4 m
      w.fase = (w.fase + (w.vAgora * dt * 6.2832) / 1.4) % 6.2832
      const alvo = correndo && naCorrida(w.x, w.z) ? 0 : 1
      w.vis += (alvo - w.vis) * kv
      if (w.vis < 0.01) continue
      const dx = Math.cos(w.rumo) * w.desvio, dz = -Math.sin(w.rumo) * w.desvio
      escrever(mt, k, w.x + dx, w.y, w.z + dz, w.rumo, w.escala * w.vis)
      va[k * 4] = w.fase; va[k * 4 + 1] = Math.min(1, w.vAgora / 1.2); va[k * 4 + 2] = 0; va[k * 4 + 3] = w.semente
      k++
    }
    for (const p of parados) {
      const alvo = correndo && naCorrida(p.x, p.z) ? 0 : 1
      p.vis += (alvo - p.vis) * kv
      if (p.vis < 0.01) continue
      recuar(p, P.x, P.z, dt)
      escrever(mt, k, p.x + p.dx, p.y, p.z + p.dz, p.rumo, p.escala * p.vis)
      va[k * 4] = 0; va[k * 4 + 1] = 0; va[k * 4 + 2] = p.modo + (p.quando === 0 ? 0.25 : p.quando === 1 ? 0.5 : 0.75); va[k * 4 + 3] = p.semente
      k++
    }
    gente.count = k
    gente.instanceMatrix.clearUpdateRanges(); gente.instanceMatrix.addUpdateRange(0, k * 16); gente.instanceMatrix.needsUpdate = true
    aVida.clearUpdateRanges(); aVida.addUpdateRange(0, k * 4); aVida.needsUpdate = true
  })

  return <primitive object={vida.gente} />
}

export type { Andante, Parado }
