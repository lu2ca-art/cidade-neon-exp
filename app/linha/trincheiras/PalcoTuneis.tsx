"use client"
/* eslint-disable react-hooks/immutability -- three.js: os canhões, os uniforms e a câmera mudam a cada quadro */

// O PALCO DOS TÚNEIS (16/11, disco/showNosTuneis.ts): o show mais colorido do jogo, no
// SALÃO DO METRÔ. "Quem estiver lá vai curtir muito a vista":
//   - o palco com o telão (um shader de cor que corre) e a banda
//   - os canhões de luz varrendo (cones aditivos: nenhuma luz de verdade)
//   - a projeção nas paredes do salão (um arco de cor em volta do palco)
//   - o reflexo na água: uma lâmina d'água no chão da plateia, com as faixas de cor
//     de cada canhão e do telão tremendo nela (sem render de reflexo: é desenhado)
//   - a plateia: a gente que veio (a lotação do povo no degrau dos túneis)
// Sem pós-processamento. Custo zero fora dali: tudo dentro de <Perto> (longe, nada
// existe: sem malha, sem draw call, sem useFrame). Perto: ~14 desenhos, 3 uniforms e
// 8 giros por quadro, nada alocado no quadro.
// Assistindo (SHOW_TUNEIS_AGORA.assistindo), a câmera vai pro meio da plateia.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { Perto } from "../estrada/Perto"
import { Multidao, Npc, type Pessoa } from "../interior/comum"
import { CURVA, SALAO_METRO } from "./mapa"
import { PALCO_TUNEIS, SHOW_TUNEIS_AGORA, SHOW_TUNEIS_CFG } from "../disco/showNosTuneis"

const C = SHOW_TUNEIS_CFG
const RAIO = 170 // a névoa já cobre boa parte a essa distância
const LARG = 26 // a largura do palco
const FUNDO = 10 // a profundidade do palco
const ALTO = 1.4 // a altura do tablado
const TRELICA = 15 // a altura da treliça dos canhões
const N_CANHOES = 8
const BPM = 120 // o pulso da plateia e das luzes, enquanto não há música ligada aqui

const corV = (hex: string) => new THREE.Color(hex)

// o degradê dos canhões (forte na boca, some na ponta), uma textura pra todos
function texturaFeixe() {
  const c = document.createElement("canvas")
  c.width = 4; c.height = 64
  const g = c.getContext("2d")!
  const gr = g.createLinearGradient(0, 0, 0, 64)
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.35, "#777777"); gr.addColorStop(1, "#000000")
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64)
  const t = new THREE.CanvasTexture(c)
  t.needsUpdate = true
  return t
}

// a paleta (as cores do túnel), em vec3 pros shaders
const PALETA = `
vec3 paleta(float k) {
  k = fract(k);
  vec3 a = vec3(1.0, 0.25, 0.69), b = vec3(0.18, 0.91, 1.0), c = vec3(1.0, 0.78, 0.34), d = vec3(0.49, 1.0, 0.69), e = vec3(0.75, 0.55, 1.0);
  float s = k * 5.0;
  if (s < 1.0) return mix(a, b, s);
  if (s < 2.0) return mix(b, c, s - 1.0);
  if (s < 3.0) return mix(c, d, s - 2.0);
  if (s < 4.0) return mix(d, e, s - 3.0);
  return mix(e, a, s - 4.0);
}`

const VERT = `varying vec2 vUv; varying vec3 vP; void main() { vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

// o telão: faixas de cor correndo, a grade de LED por cima
const FRAG_TELAO = `uniform float uT; uniform float uE; varying vec2 vUv; ${PALETA}
void main() {
  vec2 u = vUv;
  float onda = sin(u.x * 9.0 + uT * 1.7) * 0.5 + sin(u.y * 7.0 - uT * 2.3 + u.x * 4.0) * 0.5;
  vec3 col = paleta(u.x * 0.6 + onda * 0.25 + uT * 0.08);
  vec2 g = fract(u * vec2(64.0, 26.0));
  float led = smoothstep(0.0, 0.18, g.x) * smoothstep(1.0, 0.82, g.x) * smoothstep(0.0, 0.18, g.y) * smoothstep(1.0, 0.82, g.y);
  gl_FragColor = vec4(col * (0.55 + 0.6 * uE) * (0.35 + 0.65 * led), 1.0);
}`

// a projeção nas paredes: anéis e raios de cor girando, que somem nas bordas
const FRAG_PAREDE = `uniform float uT; uniform float uE; varying vec2 vUv; ${PALETA}
void main() {
  vec2 p = vec2((vUv.x - 0.5) * 7.0, (vUv.y - 0.45) * 2.2);
  float r = length(p), a = atan(p.y, p.x);
  float raios = sin(a * 9.0 + uT * 0.9) * 0.5 + 0.5;
  float aneis = sin(r * 6.0 - uT * 2.4) * 0.5 + 0.5;
  float m = pow(raios * aneis, 1.6);
  float borda = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
  vec3 col = paleta(r * 0.12 + a * 0.08 + uT * 0.05);
  gl_FragColor = vec4(col * m * borda * (0.25 + 0.55 * uE), 1.0);
}`

// a lâmina d'água: escura, com as faixas de cor dos canhões e do telão tremendo (o reflexo desenhado)
const FRAG_AGUA = `uniform float uT; uniform float uE; uniform float uR; uniform vec3 uCor[${N_CANHOES}]; uniform float uX[${N_CANHOES}]; varying vec3 vP;
void main() {
  // vP.y: do lado do palco (+uR) pra plateia (-uR)
  float d = uR - vP.y;
  float tremor = sin(vP.y * 0.9 + uT * 3.1) * 0.5 + sin(vP.y * 2.3 - uT * 4.7 + vP.x * 0.3) * 0.25;
  vec3 col = vec3(0.012, 0.02, 0.05);
  float soma = 0.0;
  for (int i = 0; i < ${N_CANHOES}; i++) {
    float x = vP.x - uX[i] - tremor * 0.7;
    float f = exp(-x * x / 1.1) * exp(-d / 34.0);
    col += uCor[i] * f * (0.55 + 0.45 * uE);
    soma += f;
  }
  // o telão: uma mancha larga no meio
  float xt = vP.x - tremor * 1.2;
  float ft = exp(-xt * xt / 60.0) * exp(-d / 22.0);
  col += vec3(0.6, 0.45, 1.0) * ft * 0.5 * (0.5 + 0.5 * sin(uT * 1.3));
  // as ondinhas brilhando
  float brilho = pow(max(0.0, sin(vP.x * 1.7 + uT * 2.0) * sin(vP.y * 1.3 - uT * 1.6)), 12.0) * 0.25;
  col += vec3(brilho);
  float borda = smoothstep(uR, uR * 0.82, length(vP.xy));
  gl_FragColor = vec4(col, (0.62 + min(0.35, soma)) * borda);
}`

function Show3D() {
  const camera = useThree((s) => s.camera)
  const feixe = useMemo(() => texturaFeixe(), [])
  const matsFeixe = useMemo(() => C.cores.concat(C.cores).slice(0, N_CANHOES).map((c) => new THREE.MeshBasicMaterial({ color: c, alphaMap: feixe, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false })), [feixe])
  const geoFeixe = useMemo(() => { const g = new THREE.CylinderGeometry(0.25, 3.6, 30, 18, 1, true); g.translate(0, -15, 0); return g }, [])
  const uni = useMemo(() => ({ uT: { value: 0 }, uE: { value: 0.4 } }), [])
  const R_AGUA = 40
  const uAgua = useMemo(() => ({ uT: uni.uT, uE: uni.uE, uR: { value: R_AGUA }, uCor: { value: Array.from({ length: N_CANHOES }, (_, i) => corV(C.cores[i % C.cores.length])) }, uX: { value: Array.from({ length: N_CANHOES }, (_, i) => (i - (N_CANHOES - 1) / 2) * (LARG / N_CANHOES)) } }), [uni])
  const matTelao = useMemo(() => new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG_TELAO, toneMapped: false }), [uni])
  const matParede = useMemo(() => new THREE.ShaderMaterial({ uniforms: uni, vertexShader: VERT, fragmentShader: FRAG_PAREDE, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), [uni])
  const matAgua = useMemo(() => new THREE.ShaderMaterial({ uniforms: uAgua, vertexShader: VERT, fragmentShader: FRAG_AGUA, transparent: true, depthWrite: false, toneMapped: false }), [uAgua])
  // a projeção: um arco da parede em pé do salão, centrado no palco (CylinderGeometry: theta = atan2(x, z))
  const geoParede = useMemo(() => {
    const ang = Math.atan2(PALCO_TUNEIS.x - SALAO_METRO.c.x, PALCO_TUNEIS.z - SALAO_METRO.c.z), span = (150 * Math.PI) / 180
    const alto = SALAO_METRO.alto - CURVA - 6
    const g = new THREE.CylinderGeometry(SALAO_METRO.r - 0.6, SALAO_METRO.r - 0.6, alto, 64, 1, true, ang - span / 2, span)
    g.translate(SALAO_METRO.c.x, CURVA + 1 + alto / 2, SALAO_METRO.c.z)
    return g
  }, [])
  const matTablado = useMemo(() => new THREE.MeshStandardMaterial({ color: "#14101c", roughness: 0.6, metalness: 0.3 }), [])
  const matNeon = useMemo(() => new THREE.MeshBasicMaterial({ color: C.cor, toneMapped: false }), [])
  const matNeon2 = useMemo(() => new THREE.MeshBasicMaterial({ color: C.cores[0], toneMapped: false }), [])
  useEffect(() => () => {
    feixe.dispose(); geoFeixe.dispose(); geoParede.dispose()
    for (const m of [...matsFeixe, matTelao, matParede, matAgua, matTablado, matNeon, matNeon2]) m.dispose()
  }, [feixe, geoFeixe, geoParede, matsFeixe, matTelao, matParede, matAgua, matTablado, matNeon, matNeon2])

  // a plateia: a gente que veio, em leque na frente do palco (pra +z, olhando o palco)
  const n = Math.round(12 + Math.min(100, SHOW_TUNEIS_AGORA.publico) * 1.3)
  const gente = useMemo<Pessoa[]>(() => {
    const out: Pessoa[] = []
    let seed = 11
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < n; i++) {
      const fila = Math.floor(i / 16), k = i % 16
      const x = (k - 7.5) * 1.5 + (r() - 0.5) * 0.7 + (fila % 2) * 0.7
      const z = 5 + fila * 1.6 + (r() - 0.5) * 0.6
      out.push({ x: x * (1 + fila * 0.05), z, vira: Math.PI + (r() - 0.5) * 0.4, cor: C.cores[Math.floor(r() * C.cores.length)] })
    }
    return out
  }, [n])

  const canhoes = useRef<(THREE.Mesh | null)[]>([])
  const pulso = useRef(-9)
  const ultimaBatida = useRef(-1)
  const tmp = useMemo(() => ({ olhar: new THREE.Vector3() }), [])
  useFrame((s, dt) => {
    const t = s.clock.elapsedTime
    const A = SHOW_TUNEIS_AGORA
    // a festa sobe quando alguém assiste
    A.energia += ((A.assistindo ? 1 : 0.35) - A.energia) * Math.min(1, dt * 0.8)
    uni.uT.value = t
    const b = Math.floor((t * BPM) / 60)
    if (b !== ultimaBatida.current) { ultimaBatida.current = b; pulso.current = performance.now() / 1000 }
    const batida = Math.pow(1 - ((t * BPM) / 60 - b), 3)
    uni.uE.value = A.energia * (0.75 + 0.25 * batida)
    for (let i = 0; i < N_CANHOES; i++) {
      const m = canhoes.current[i]
      if (!m) continue
      m.rotation.x = -(0.55 + Math.sin(t * 0.7 + i * 1.3) * 0.35) // pra frente (+z, a plateia)
      m.rotation.z = Math.sin(t * 0.9 + i * 0.8) * 0.5
      ;(m.material as THREE.MeshBasicMaterial).opacity = (0.12 + 0.3 * A.energia) * (0.7 + 0.3 * batida)
    }
    // assistindo: a câmera no meio da plateia, olhando o palco (um balanço leve)
    if (A.assistindo) {
      const P = PALCO_TUNEIS, rec = C.plateia.recuo + Math.sin(t * 0.1) * 4
      const lado = Math.sin(t * 0.08) * 10
      camera.position.set(P.x + P.fx * rec - P.fz * lado, C.plateia.altura + Math.sin(t * 0.13) * 0.8, P.z + P.fz * rec + P.fx * lado)
      tmp.olhar.set(P.x, 7, P.z)
      camera.lookAt(tmp.olhar)
    }
  })

  return (
    <>
      <mesh geometry={geoParede} material={matParede} renderOrder={4} />
      <group position={[PALCO_TUNEIS.x, 0, PALCO_TUNEIS.z]} rotation-y={PALCO_TUNEIS.giro}>
        {/* o tablado e o neon da borda */}
        <mesh position={[0, ALTO / 2, -FUNDO / 2]} material={matTablado}><boxGeometry args={[LARG, ALTO, FUNDO]} /></mesh>
        <mesh position={[0, ALTO + 0.03, -0.1]} material={matNeon}><boxGeometry args={[LARG, 0.08, 0.12]} /></mesh>
        <mesh position={[0, ALTO * 0.5, 0.02]} material={matNeon2}><boxGeometry args={[LARG, 0.06, 0.06]} /></mesh>
        {/* o telão */}
        <mesh position={[0, ALTO + 6.5, -FUNDO + 0.2]} material={matTelao}><planeGeometry args={[19, 8.5]} /></mesh>
        {/* a treliça e os canhões pendurados nela */}
        <mesh position={[-LARG / 2 + 0.4, TRELICA / 2, -FUNDO / 2]} material={matTablado}><boxGeometry args={[0.5, TRELICA, 0.5]} /></mesh>
        <mesh position={[LARG / 2 - 0.4, TRELICA / 2, -FUNDO / 2]} material={matTablado}><boxGeometry args={[0.5, TRELICA, 0.5]} /></mesh>
        <mesh position={[0, TRELICA, -FUNDO / 2]} material={matTablado}><boxGeometry args={[LARG, 0.6, 0.6]} /></mesh>
        <mesh position={[0, TRELICA - 0.35, -FUNDO / 2 + 0.32]} material={matNeon}><boxGeometry args={[LARG - 1, 0.06, 0.06]} /></mesh>
        {matsFeixe.map((m, i) => (
          <mesh key={i} ref={(x) => { canhoes.current[i] = x }} geometry={geoFeixe} material={m} renderOrder={5}
            position={[(i - (N_CANHOES - 1) / 2) * (LARG / N_CANHOES), TRELICA - 0.4, -FUNDO / 2 + 0.4]} />
        ))}
        {/* a banda: o LU2CA no meio, dois do lado (RASCUNHO: só as silhuetas, sem nomes) */}
        <Npc cor={C.cor} pos={[0, ALTO, -2.5]} dancando />
        <Npc cor={C.cores[0]} pos={[-5, ALTO, -4]} dancando />
        <Npc cor={C.cores[2]} pos={[5, ALTO, -4]} dancando />
        {/* a lâmina d'água na plateia (o reflexo desenhado) */}
        <mesh position={[0, 0.04, R_AGUA + 0.5]} rotation-x={-Math.PI / 2} material={matAgua} renderOrder={3}><circleGeometry args={[R_AGUA, 48]} /></mesh>
        <Multidao gente={gente} pulso={pulso} copiam={Math.round(gente.length * 0.7)} fatia={3} />
      </group>
    </>
  )
}

// o palco dos túneis no mundo: só existe com a câmera perto do salão
export function PalcoTuneis() {
  const pontos = useMemo(() => [{ x: PALCO_TUNEIS.x, z: PALCO_TUNEIS.z }, { x: SALAO_METRO.c.x, z: SALAO_METRO.c.z }], [])
  return <Perto nome="palco-tuneis" raio={RAIO} pontos={pontos} aoSair={() => { SHOW_TUNEIS_AGORA.energia = 0 }}><Show3D /></Perto>
}
