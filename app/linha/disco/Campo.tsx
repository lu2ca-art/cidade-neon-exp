"use client"

// (T43, 28/10, J2:28) O CAMPO DE FORÇA DOS PRÉDIOS. "O bounce dos prédios tá
// muito ruim [...] um campo de força elétrica meio holográfico mas bem leve em
// volta dos prédios [...] até a altura das pistas. Ao invés de bouncear, o carro
// meio que gruda nela e segue o rumo mais próximo."
//
// A física (grudar, em Corrida.tsx) é o que muda o jogo: a Kombi não quica mais,
// encosta na cerca e desliza pelo lado mais perto. Aqui é só o que se vê, e é
// leve de propósito (regra do dono: desempenho máximo):
//   - UMA malha instanciada (1 draw call), no máximo CAMPO_MAX cercas, só dos
//     prédios a menos de PERTO metros da Kombi, e só com ela fora da pista
//     (voo ou chão do deserto: na pista não tem como encostar num prédio);
//   - a cerca é só as 4 paredes (sem teto nem fundo), do chão até a altura das
//     pistas daquele prédio (ou o topo, se ele for mais baixo);
//   - o shader é aditivo, sem luz, sem textura: uma grade em losango e faixas
//     subindo, que só acendem perto da Kombi e brilham onde ela encosta.

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { compilarSemTravar } from "../estrada/luzes"

// cada prédio nos colisores: x, z, tx, tz, meia largura, meio fundo, topo, chão, topo do campo
export const COL_PASSO = 9
const CAMPO_MAX = 6
const PERTO = 30 // m da parede até a Kombi: dali pra perto a cerca existe
const FOLGA = 0.9 // m da cerca pra fora da parede (a Kombi encosta nela, não no prédio)
const CEL = 48

export type ToqueCampo = { t: number; x: number; y: number; z: number }
type JogoMin = { voo?: boolean; wx?: number; wz?: number; y: number; tempo: number }

const VERT = /* glsl */ `
varying vec3 vW;
varying vec2 vP;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  // x = a volta em metros (contínua de uma parede pra outra), y = 0 no chão, 1 no topo
  vP = vec2(position.x * s.x + position.z * s.z, position.y + 0.5);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const FRAG = /* glsl */ `
uniform vec3 uK;
uniform float uT;
uniform vec4 uToque;
uniform vec3 uCor;
varying vec3 vW;
varying vec2 vP;
void main() {
  float perto = 1.0 - smoothstep(5.0, 26.0, distance(vW, uK));
  float toque = uToque.w * (1.0 - smoothstep(0.0, 11.0, distance(vW, uToque.xyz)));
  if (perto + toque < 0.01) discard;
  // a grade em losango (duas famílias de linhas) tremendo de leve, e as faixas subindo
  float l1 = abs(fract((vP.x + vW.y * 0.58) * 0.3) - 0.5);
  float l2 = abs(fract((vP.x - vW.y * 0.58) * 0.3) - 0.5);
  float grade = (1.0 - smoothstep(0.0, 0.045, min(l1, l2))) * (0.8 + 0.2 * sin(uT * 37.0 + vP.x * 1.7));
  float faixa = smoothstep(0.43, 0.5, abs(fract(vW.y * 0.11 - uT * 0.7) - 0.5));
  // some no topo, com uma linha acesa na borda de cima
  float topo = 1.0 - smoothstep(0.8, 1.0, vP.y);
  float borda = smoothstep(0.975, 0.995, vP.y);
  float a = perto * ((0.04 + 0.32 * grade + 0.2 * faixa) * topo + 0.5 * borda) + toque * (0.3 + 1.1 * grade + 0.4 * faixa) * topo;
  gl_FragColor = vec4(mix(uCor, vec3(1.0), toque * 0.45), a);
}`

// (medição) ?medir&semcampo desliga só o desenho da cerca, pra comparar o custo dela
const SEM_CAMPO = typeof location !== "undefined" && /[?&]medir/.test(location.search) && /[?&]semcampo/.test(location.search)

export function Campo(props: { colisores: number[]; jogo: React.RefObject<JogoMin>; toque: React.RefObject<ToqueCampo> }) {
  return SEM_CAMPO ? null : <CampoVisivel {...props} />
}

function CampoVisivel({ colisores, jogo, toque }: { colisores: number[]; jogo: React.RefObject<JogoMin>; toque: React.RefObject<ToqueCampo> }) {
  const { gl, camera, scene } = useThree()
  const grade = useMemo(() => {
    const g = new Map<string, number[]>()
    for (let k = 0; k < colisores.length; k += COL_PASSO) {
      const key = `${Math.floor(colisores[k] / CEL)},${Math.floor(colisores[k + 1] / CEL)}`
      let l = g.get(key); if (!l) g.set(key, (l = [])); l.push(k)
    }
    return g
  }, [colisores])
  const malha = useMemo(() => {
    // as 4 paredes de uma caixa 1×1×1 (fora as faces de cima e de baixo)
    const caixa = new THREE.BoxGeometry(1, 1, 1)
    const idx = Array.from(caixa.index!.array).filter((_, i) => i < 12 || i >= 24)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", caixa.getAttribute("position"))
    geo.setIndex(idx)
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uK: { value: new THREE.Vector3(0, -1e5, 0) }, uT: { value: 0 }, uToque: { value: new THREE.Vector4(0, -1e5, 0, 0) }, uCor: { value: new THREE.Color("#4fe8ff") } },
    })
    const m = new THREE.InstancedMesh(geo, mat, CAMPO_MAX)
    m.count = 0
    m.frustumCulled = false // as cercas mudam todo quadro: a esfera de corte não vale
    m.renderOrder = 2
    return m
  }, [])
  useEffect(() => () => { malha.geometry.dispose(); (malha.material as THREE.Material).dispose() }, [malha])
  // compila o shader antes (o three compilava na 1ª batida, no meio do voo)
  useEffect(() => { void compilarSemTravar(gl, malha, camera, scene) }, [gl, camera, scene, malha])

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), y: new THREE.Vector3(0, 1, 0), ach: [] as [number, number][] }), [])
  const visto = useRef(false)
  useFrame((st) => {
    const j = jogo.current
    const c = colisores
    let n = 0
    if (j && j.voo && j.wx !== undefined && j.wz !== undefined) {
      const x = j.wx, z = j.wz, cx = Math.floor(x / CEL), cz = Math.floor(z / CEL)
      const ach = tmp.ach; ach.length = 0
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const k of grade.get(`${cx + a},${cz + b}`) ?? []) {
        if (j.y > c[k + 8] + 6 || j.y < c[k + 7] - 6) continue
        const dx = x - c[k], dz = z - c[k + 1], tx = c[k + 2], tz = c[k + 3]
        const lx = Math.abs(dx * tz - dz * tx) - c[k + 4], lz = Math.abs(dx * tx + dz * tz) - c[k + 5]
        const d = Math.hypot(Math.max(0, lx), Math.max(0, lz))
        if (d < PERTO) ach.push([d, k])
      }
      ach.sort((p, q) => p[0] - q[0])
      for (; n < Math.min(CAMPO_MAX, ach.length); n++) {
        const k = ach[n][1], y0 = c[k + 7], h = Math.max(1, c[k + 8] - y0)
        tmp.q.setFromAxisAngle(tmp.y, Math.atan2(c[k + 2], c[k + 3]))
        tmp.p.set(c[k], y0 + h / 2, c[k + 1])
        tmp.s.set(c[k + 4] * 2 + FOLGA * 2, h, c[k + 5] * 2 + FOLGA * 2)
        malha.setMatrixAt(n, tmp.m.compose(tmp.p, tmp.q, tmp.s))
      }
    }
    malha.count = n
    malha.visible = n > 0 || !visto.current
    visto.current = true
    if (!n) return
    malha.instanceMatrix.needsUpdate = true
    const u = (malha.material as THREE.ShaderMaterial).uniforms
    u.uK.value.set(j!.wx!, j!.y + 1, j!.wz!)
    u.uT.value = st.clock.elapsedTime
    const t = toque.current
    const forca = t ? Math.max(0, 1 - (j!.tempo - t.t) / 0.6) : 0
    u.uToque.value.set(t?.x ?? 0, t?.y ?? 0, t?.z ?? 0, forca)
  })
  return <primitive object={malha} />
}
