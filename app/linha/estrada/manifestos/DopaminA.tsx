"use client"

// DOPAMINA (faixa 2, o vício): a rua que pede mais um.
//
// Ao longo da rua, telas (celulares em pé e outdoors) que pipocam: notificação,
// coração batendo na batida da faixa, número subindo. Quanto mais tempo na rua,
// e mais ainda acelerando/no turbo, mais telas acendem, empilham e saturam, até
// o excesso: a imagem "estoura" (tremida, eco atrás de cada tela, branco
// queimando na batida). Soltou o acelerador / freou / desacelerou: tudo esvazia
// e volta o silêncio visual (umas poucas telas apagadas).
// Tocar numa tela "dá like": um pico curtinho de brilho... e logo o vazio (ela,
// e a rua toda, ficam mais apagadas que antes por uns segundos). Sem texto.
//
// Custo: 1 InstancedMesh (≈ 2 × telas, a metade é o eco, colapsado a zero
// enquanto não estoura), 1 ShaderMaterial, sem textura, sem luz. Matrizes
// escritas UMA vez na montagem; por quadro só uniforms. O toque projeta as
// telas acesas só no momento do toque.

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { PropsManifesto } from "./tipos"
import { MEIA_PISTA, NEVOA_FRAG, NEVOA_FRAG_PARS, NEVOA_VERT_PARS, aoLado, densidadeRua, semente, viradoPraRua } from "./comum"

export const DOPAMINA_CFG = {
  passo: 19, // m entre os pontos de tela ao longo da rua
  niveis: 3, // até 3 telas empilhadas no mesmo ponto
  fomeTempo: 1 / 80, // por segundo na rua (≈ 80 s até o excesso, só existindo)
  fomeTurbo: 0.14, // por segundo de turbo
  fomeRapido: 0.05, // por segundo, por múltiplo acima do ritmo da pista
  esvazia: 0.65, // por segundo, soltou/freou (cheio → vazio em ~1,5 s)
  like: 0.06, // o like também alimenta
  raioToque: 72, // px: o toque pega a tela acesa mais perto, dentro disso
}

const VERT = /* glsl */ `
attribute vec4 aD;     // semente, limiar, tipo (0 notificação, 1 coração, 2 número), aspecto (l/a)
attribute float aIdx;  // o número da tela (o like)
attribute float aEco;  // 1 = o eco (só aparece no excesso)
uniform float uT; uniform float uFome; uniform float uEstouro; uniform float uDentro;
varying vec2 vUv; varying vec4 vD; varying float vIdx; varying float vEco; varying float vOn;
${NEVOA_VERT_PARS}
void main() {
  vUv = uv; vD = aD; vIdx = aIdx; vEco = aEco;
  float on = smoothstep(aD.y, aD.y + 0.07, uFome) * uDentro;
  vOn = on;
  // pipoca: passa do tamanho e volta
  float pop = on * (1.0 + 0.35 * sin(clamp(on, 0.0, 1.0) * 3.14159));
  float eco = aEco * step(0.02, uEstouro);
  float esc = pop * mix(1.0, 1.0 + 0.16 * uEstouro + 0.05 * sin(uT * 9.0 + aD.x * 40.0), aEco) * mix(1.0, eco, aEco);
  vec3 p = position * esc;
  // o zumbido: tremida fina no excesso (o eco treme mais)
  p.xy += uEstouro * 0.05 * (1.0 + 3.0 * aEco) * vec2(sin(uT * 61.0 + aD.x * 91.0), cos(uT * 53.0 + aD.x * 37.0));
  p.z -= aEco * 0.35;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const FRAG = /* glsl */ `
uniform float uT; uniform float uBat; uniform float uFome; uniform float uEstouro;
uniform float uLikeIdx; uniform float uLikeT; uniform float uLikeG;
varying vec2 vUv; varying vec4 vD; varying float vIdx; varying float vEco; varying float vOn;
${NEVOA_FRAG_PARS}
float dot2(vec2 v) { return dot(v, v); }
float caixa(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float coracao(vec2 p) {
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(dot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(dot2(p - vec2(0.0, 1.0)), dot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
float traco(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
// um dígito de 7 segmentos numa caixa 1 × 2
float digito(vec2 p, float d) {
  float m = d < 0.5 ? 63.0 : d < 1.5 ? 6.0 : d < 2.5 ? 91.0 : d < 3.5 ? 79.0 : d < 4.5 ? 102.0 : d < 5.5 ? 109.0 : d < 6.5 ? 125.0 : d < 7.5 ? 7.0 : d < 8.5 ? 127.0 : 111.0;
  float s = 9.0;
  if (mod(m, 2.0) > 0.5) s = min(s, traco(p, vec2(0.15, 1.85), vec2(0.85, 1.85)));
  if (mod(floor(m / 2.0), 2.0) > 0.5) s = min(s, traco(p, vec2(0.85, 1.85), vec2(0.85, 1.0)));
  if (mod(floor(m / 4.0), 2.0) > 0.5) s = min(s, traco(p, vec2(0.85, 1.0), vec2(0.85, 0.15)));
  if (mod(floor(m / 8.0), 2.0) > 0.5) s = min(s, traco(p, vec2(0.15, 0.15), vec2(0.85, 0.15)));
  if (mod(floor(m / 16.0), 2.0) > 0.5) s = min(s, traco(p, vec2(0.15, 0.15), vec2(0.15, 1.0)));
  if (mod(floor(m / 32.0), 2.0) > 0.5) s = min(s, traco(p, vec2(0.15, 1.0), vec2(0.15, 1.85)));
  if (mod(floor(m / 64.0), 2.0) > 0.5) s = min(s, traco(p, vec2(0.15, 1.0), vec2(0.85, 1.0)));
  return 1.0 - smoothstep(0.08, 0.16, s);
}
void main() {
  float semente = vD.x, tipo = vD.z, asp = vD.w;
  // coordenadas da tela com o aspecto certo (x em -asp..asp, y em -1..1)
  vec2 q = (vUv - 0.5) * 2.0; q.x *= asp;
  float borda = caixa(q, vec2(asp, 1.0), 0.18);
  if (borda > 0.0 || vOn < 0.002) discard;
  float bat = exp(-fract(uBat) * 5.0); // o soco de cada batida
  vec3 rosa = vec3(1.0, 0.18, 0.62), verm = vec3(1.0, 0.16, 0.3), ciano = vec3(0.2, 0.9, 1.0);
  vec3 fundo = vec3(0.025, 0.02, 0.045);
  vec3 cor = fundo; float luz = 0.0;
  if (tipo < 0.5) {
    // notificações subindo: pílulas com bolinha (quem mandou) e barra (o texto que não se lê)
    float vel = 0.12 + 0.9 * uFome;
    float y = q.y + uT * vel + semente * 7.0;
    float fila = floor(y / 0.42), fy = fract(y / 0.42) * 0.42 - 0.21;
    float h = fract(sin(fila * 12.9898 + semente * 78.233) * 43758.5453);
    float pilula = caixa(vec2(q.x, fy), vec2(asp * 0.82, 0.15), 0.12);
    float bolinha = length(vec2(q.x + asp * 0.6, fy)) - 0.09;
    float barra = caixa(vec2(q.x - asp * 0.1 + (1.0 - h) * asp * 0.25, fy), vec2(asp * 0.45 * (0.4 + 0.6 * h), 0.028), 0.02);
    vec3 cp = mix(ciano, rosa, step(0.5, h));
    cor = mix(cor, vec3(0.1, 0.08, 0.16), 1.0 - smoothstep(0.0, 0.02, pilula));
    cor = mix(cor, cp, 1.0 - smoothstep(0.0, 0.02, bolinha));
    cor = mix(cor, vec3(0.75), (1.0 - smoothstep(0.0, 0.02, barra)) * 0.7);
    // o badge vermelho no canto, batendo
    float badge = length(q - vec2(asp * 0.72, 0.8)) - (0.13 + 0.05 * bat);
    cor = mix(cor, verm * (1.2 + bat), 1.0 - smoothstep(0.0, 0.02, badge));
    luz = 0.6;
  } else if (tipo < 1.5) {
    // o coração batendo na batida da faixa, e os pequenos subindo
    float s = 1.0 + 0.22 * bat + 0.15 * uFome;
    float c = coracao((q - vec2(0.0, -0.45)) / (0.75 * s) * vec2(1.0, 1.0));
    cor = mix(cor, verm * (1.0 + 0.8 * bat), 1.0 - smoothstep(0.0, 0.03, c));
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float ty = fract(uT * (0.2 + 0.5 * uFome) + fi * 0.33 + semente);
      vec2 pc = q - vec2(sin(fi * 2.1 + semente * 9.0) * asp * 0.6, -1.0 + ty * 2.2);
      float ci = coracao(pc / 0.22 + vec2(0.0, 0.5));
      cor = mix(cor, rosa, (1.0 - smoothstep(0.0, 0.15, ci)) * (1.0 - ty) * step(fi / 3.0, uFome + 0.2));
    }
    luz = 0.7;
  } else {
    // o número que só sobe (curtidas, seguidores, o placar)
    float n = floor(uT * (1.5 + 60.0 * uFome * uFome) + semente * 9000.0);
    vec2 pd = (q + vec2(asp * 0.9, 0.55)) / vec2(asp * 1.8, 1.1); // 0–1 na faixa dos dígitos
    float i = floor(pd.x * 5.0);
    if (i >= 0.0 && i < 5.0 && pd.y > 0.0 && pd.y < 1.0) {
      float d = mod(floor(n / pow(10.0, 4.0 - i)), 10.0);
      vec2 pl = vec2(fract(pd.x * 5.0) * 1.25 - 0.125, pd.y * 2.0);
      cor = mix(cor, mix(ciano, vec3(1.0), 0.3 * bat), digito(pl, d));
    }
    // a setinha pra cima
    float seta = traco(q, vec2(-asp * 0.75, 0.62), vec2(-asp * 0.6, 0.8));
    seta = min(seta, traco(q, vec2(-asp * 0.45, 0.62), vec2(-asp * 0.6, 0.8)));
    cor = mix(cor, vec3(0.3, 1.0, 0.5), 1.0 - smoothstep(0.03, 0.06, seta));
    luz = 0.6;
  }
  // a moldura acesa (o vidro do celular)
  cor += rosa * (1.0 - smoothstep(0.0, 0.06, abs(borda + 0.03))) * (0.25 + 0.5 * uFome);
  // a saturação e o brilho sobem com a fome
  float cinza = dot(cor, vec3(0.299, 0.587, 0.114));
  cor = mix(vec3(cinza), cor, 0.2 + 0.8 * uFome);
  float brilho = (0.35 + 1.4 * uFome) * (0.4 + luz);
  // o like: um pico curto na tela tocada... e o vazio depois (ela e a rua toda)
  float dl = uT - uLikeT;
  float minha = 1.0 - step(0.5, abs(vIdx - uLikeIdx));
  float pico = dl >= 0.0 ? exp(-dl * 6.0) : 0.0;
  float vazio = dl >= 0.0 ? smoothstep(0.2, 0.7, dl) * (1.0 - smoothstep(3.0, 6.5, dl)) : 0.0;
  brilho *= 1.0 + minha * 4.0 * pico + uLikeG * 0.5 * pico - (0.7 * minha + 0.3 * uLikeG) * vazio;
  // o excesso: branco queimando na batida, as cores se separando
  cor = mix(cor, vec3(1.0, 0.95, 1.0), uEstouro * (0.25 + 0.5 * bat));
  cor.r *= 1.0 + 0.6 * uEstouro * sin(uT * 37.0 + vUv.y * 40.0);
  cor.b *= 1.0 + 0.6 * uEstouro * cos(uT * 29.0 + vUv.y * 33.0);
  float a = vOn * mix(0.92, 0.22 * uEstouro, vEco);
  gl_FragColor = vec4(cor * brilho, a);
  ${NEVOA_FRAG}
}`

export function DopaminA({ M, k, ctx }: PropsManifesto) {
  const C = DOPAMINA_CFG
  const { camera, gl } = useThree()

  // as telas: escritas uma vez, ao longo da ida (a volta é o mesmo eixo)
  const telas = useMemo(() => {
    const v = M.vias[M.pistas[k].ida]
    const r = semente(2_2025 + k)
    const mats: THREE.Matrix4[] = [], dados: number[] = [], centros: THREE.Vector3[] = []
    const q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), esc = new THREE.Vector3()
    const passoI = Math.max(1, Math.round(C.passo / densidadeRua() / 2)) // (revisão 2) no leve, metade das telas
    for (let i = 8; i < v.n - 8; i += passoI + Math.floor(r() * 4)) {
      const lado = r() < 0.5 ? -1 : 1
      const lat = (MEIA_PISTA + 3 + r() * 14) * lado
      const celular = r() < 0.62
      const larg = celular ? 2.2 + r() * 1.6 : 5 + r() * 4
      const alt = celular ? larg * 1.85 : larg * (0.5 + r() * 0.12)
      let y = 2 + r() * 8
      const rumo = viradoPraRua(v, i, lado) + (r() - 0.5) * 0.5
      for (let n = 0; n < C.niveis; n++) {
        // os níveis de cima só acendem com mais fome; o de baixo às vezes já existe
        const limiar = n === 0 ? r() * 0.55 : n === 1 ? 0.35 + r() * 0.4 : 0.62 + r() * 0.3
        if (n > 0 && r() < 0.3) break
        aoLado(v, i, lat + (r() - 0.5) * 2, y + alt / 2, pos)
        e.set((r() - 0.5) * 0.12, rumo, (r() - 0.5) * 0.1)
        q.setFromEuler(e)
        esc.set(larg, alt, 1)
        mats.push(new THREE.Matrix4().compose(pos, q, esc))
        centros.push(pos.clone())
        const tipo = r() < 0.4 ? 0 : r() < 0.55 ? 1 : 2
        dados.push(r(), limiar, tipo, larg / alt)
        y += alt + 0.8 + r() * 2
      }
    }
    return { mats, dados, centros }
  }, [M, k, C.passo, C.niveis])

  const obj = useMemo(() => {
    const n = telas.mats.length
    const g = new THREE.PlaneGeometry(1, 1)
    const aD = new Float32Array(n * 2 * 4), aIdx = new Float32Array(n * 2), aEco = new Float32Array(n * 2)
    for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) {
      const o = c * n + i
      aD.set(telas.dados.slice(i * 4, i * 4 + 4), o * 4)
      aIdx[o] = i
      aEco[o] = c
    }
    g.setAttribute("aD", new THREE.InstancedBufferAttribute(aD, 4))
    g.setAttribute("aIdx", new THREE.InstancedBufferAttribute(aIdx, 1))
    g.setAttribute("aEco", new THREE.InstancedBufferAttribute(aEco, 1))
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uT: { value: 0 }, uBat: { value: 0 }, uFome: { value: 0 }, uEstouro: { value: 0 }, uDentro: { value: 0 },
        uLikeIdx: { value: -1 }, uLikeT: { value: -99 }, uLikeG: { value: 0 },
      }]),
    })
    mat.name = "manifesto-dopamina"
    const m = new THREE.InstancedMesh(g, mat, n * 2)
    for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) m.setMatrixAt(c * n + i, telas.mats[i])
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false // as telas cobrem a rua inteira: uma caixa só não ajuda
    m.renderOrder = 3
    return { m, mat }
  }, [telas])
  useEffect(() => () => { obj.m.geometry.dispose(); obj.mat.dispose(); obj.m.dispose() }, [obj])

  // a fome (0–1) e o excesso: estado do manifesto, fora do React
  const st = useRef({ fome: 0, estouro: 0, likeT: -99 }).current

  // o like: no toque, a tela acesa mais perto do dedo (projeção só agora, nunca por quadro)
  useEffect(() => {
    const el = gl.domElement
    const v = new THREE.Vector3()
    const tocar = (ev: PointerEvent) => {
      if (ctx.dentro < 0.5) return
      const rc = el.getBoundingClientRect()
      const px = ev.clientX - rc.left, py = ev.clientY - rc.top
      let melhor = -1, dMin = C.raioToque * C.raioToque
      for (let i = 0; i < telas.centros.length; i++) {
        if (telas.dados[i * 4 + 1] > st.fome) continue // apagada
        v.copy(telas.centros[i]).project(camera)
        if (v.z < -1 || v.z > 1) continue
        const sx = (v.x * 0.5 + 0.5) * rc.width, sy = (-v.y * 0.5 + 0.5) * rc.height
        const d = (sx - px) ** 2 + (sy - py) ** 2
        if (d < dMin) { dMin = d; melhor = i }
      }
      if (melhor < 0) return
      const U = obj.mat.uniforms
      U.uLikeIdx.value = melhor
      U.uLikeT.value = ctx.relogio
      st.likeT = ctx.relogio
      st.fome = Math.min(1, st.fome + C.like)
    }
    el.addEventListener("pointerdown", tocar)
    return () => el.removeEventListener("pointerdown", tocar)
  }, [gl, camera, telas, obj, ctx, st, C.raioToque, C.like])

  useFrame((_, dtCru) => {
    const dt = Math.min(0.1, dtCru)
    // a rua pede mais um: o tempo alimenta, o turbo e a pressa alimentam mais
    const soltou = ctx.freio || ctx.acel < -2.5 || ctx.mult < 0.72
    if (soltou) st.fome = Math.max(0, st.fome - C.esvazia * dt)
    else st.fome = Math.min(1, st.fome + dt * (C.fomeTempo + (ctx.turbo ? C.fomeTurbo : 0) + Math.max(0, ctx.mult - 1.05) * C.fomeRapido))
    // o excesso começa em ~85% e pulsa com a batida
    const alvoEst = Math.max(0, (st.fome - 0.85) / 0.15)
    st.estouro += (alvoEst - st.estouro) * Math.min(1, dt * (alvoEst > st.estouro ? 1.5 : 5))
    const U = obj.mat.uniforms
    U.uT.value = ctx.relogio
    U.uBat.value = ctx.batida
    U.uFome.value = st.fome
    U.uEstouro.value = st.estouro * ctx.dentro
    U.uDentro.value = ctx.dentro
    U.uLikeG.value = ctx.relogio - st.likeT < 8 ? 1 : 0
  })

  return <primitive object={obj.m} />
}
