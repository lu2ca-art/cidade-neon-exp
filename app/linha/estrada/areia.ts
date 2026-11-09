// (T39) A AREIA COM CARA DE AREIA (o dono, 29/10: "textura de verdade nas
// dunas e no chão, nada de bloco bege liso"). Um material só, o mesmo
// MeshStandardMaterial de antes com um pedaço de shader por cima:
//   - as ondulações do vento (marcas de 1,3 m e as maiores, de 7 m), no rumo
//     das cristas, tortas pelo ruído; viram relevo de verdade (mexem na normal)
//     e somem sozinhas quando ficam menores que um pixel (fwidth: sem serrilhado)
//   - o grão (uma textura de ruído pequena, 128 px, repetida; a mipmap apaga o
//     grão de longe de graça)
//   - manchas de cor (areia mais clara, mais ruiva, mais acinzentada)
//   - o brilho leve: uns grãos que piscam quando a câmera anda
// Barato: 3 leituras de uma textura de 64 KB e umas contas por pixel, nada por
// quadro na CPU. No lixão (máscara no atributo "areia") fica como era.

import * as THREE from "three"
import { QUALIDADE } from "./qualidade"

const T = 128
let TEX: THREE.DataTexture | null = null
// o ruído repetível (a borda emenda): R e G, manchas suaves; B, o grão; A, as faíscas
function texAreia() {
  if (TEX) return TEX
  const d = new Uint8Array(T * T * 4)
  const h = (x: number, y: number, s: number) => { const v = Math.sin(((x % T) + T) % T * 127.1 + (((y % T) + T) % T) * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v) }
  // ruído de valor repetível com período p (em células)
  const suave = (x: number, y: number, p: number, s: number) => {
    const c = T / p, fx = x / c, fy = y / c, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy
    const k = (a: number, b: number) => h((a % p) * 7, (b % p) * 13, s)
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty)
    const a = k(ix, iy), b = k(ix + 1, iy), cc = k(ix, iy + 1), e = k(ix + 1, iy + 1)
    return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + e) * sx * sy
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (y * T + x) * 4
    d[i] = 255 * (suave(x, y, 4, 1) * 0.6 + suave(x, y, 8, 2) * 0.3 + suave(x, y, 16, 3) * 0.1)
    d[i + 1] = 255 * (suave(x, y, 4, 4) * 0.55 + suave(x, y, 8, 5) * 0.3 + suave(x, y, 32, 6) * 0.15)
    d[i + 2] = 255 * (h(x, y, 7) * 0.7 + suave(x, y, 32, 8) * 0.3)
    const f = h(x, y, 9)
    d[i + 3] = f > 0.985 ? 255 : f * 120
  }
  const t = new THREE.DataTexture(d, T, T, THREE.RGBAFormat)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.anisotropy = 4
  t.needsUpdate = true
  return (TEX = t)
}

const VENTO = 0.6 // o rumo das cristas (chao.ts)

// (09/11, o final) A AREIA QUE FICA VERDE: o raio (m) da frente verde em volta da
// casa da D-Bee (0 = areia, como sempre; a floresta: estrada/Floresta.tsx). Uniforme
// compartilhado: não pede material novo e sem final não muda nada
export const AREIA_VERDE = { value: 0 }
export const CENTRO_VERDE = { x: -1980, z: -1740 } // disco/historia.ts, CASA

// o material do chão de areia. mascara: a geometria traz o atributo "areia"
// (1 areia, 0 lixão); sem ele, é areia em toda parte (o chão até o horizonte)
export function materialAreia(o: { vertexColors?: boolean; color?: THREE.ColorRepresentation; mascara?: boolean } = {}) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: !!o.vertexColors, color: o.color ?? "#ffffff", roughness: 0.95, emissive: "#3a2614", emissiveIntensity: 0.55 })
  const leve = QUALIDADE.nivel === "baixo"
  m.defines = { ...(m.defines ?? {}), ...(o.mascara ? { AREIA_MASCARA: "" } : {}), ...(leve ? { AREIA_LEVE: "" } : {}) }
  const uTex = { value: texAreia() }
  m.customProgramCacheKey = () => `areia${o.mascara ? 1 : 0}${leve ? 1 : 0}`
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tAreia = uTex
    sh.uniforms.uVerde = AREIA_VERDE
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
        varying vec3 vAreiaW;
        #ifdef AREIA_MASCARA
          attribute float areia;
          varying float vAreia;
        #endif`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
        vAreiaW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #ifdef AREIA_MASCARA
          vAreia = areia;
        #endif`)
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
        uniform sampler2D tAreia;
        uniform float uVerde;
        varying vec3 vAreiaW;
        #ifdef AREIA_MASCARA
          varying float vAreia;
        #endif
        float areiaK; // a força da areia aqui (0 no lixão)
        float areiaLuz; // o claro-escuro das ondulações (pra o emissivo também)
        vec2 areiaGrad; // a inclinação das ondulações (mundo, xz)
        `)
      // a cor: manchas, grão e o claro-escuro das ondulações
      .replace("#include <color_fragment>", `#include <color_fragment>
        {
          #ifdef AREIA_MASCARA
            areiaK = vAreia;
          #else
            areiaK = 1.0;
          #endif
          vec2 p = vAreiaW.xz;
          vec4 n1 = texture2D(tAreia, p / 260.0);
          vec4 n2 = texture2D(tAreia, p / 41.0 + 0.37);
          vec4 g = texture2D(tAreia, p * 1.9);
          // as manchas: mais clara/pálida, mais ruiva, mais cinza
          float mc = (n1.r - 0.5) * 2.0, mr = (n2.g - 0.5) * 2.0;
          vec3 tom = vec3(1.0 + 0.10 * mc + 0.05 * mr, 1.0 + 0.08 * mc, 1.0 + 0.04 * mc - 0.08 * mr);
          // o grão (a mipmap leva pra 0.5 de longe)
          float grao = 0.88 + 0.24 * g.b;
          areiaLuz = 0.0;
          areiaGrad = vec2(0.0);
          #ifndef AREIA_LEVE
            vec2 w = vec2(cos(${VENTO.toFixed(2)}), sin(${VENTO.toFixed(2)}));
            float u = dot(p, w), v = dot(p, vec2(-w.y, w.x));
            float torto = (n2.r - 0.5) * 5.0 + (n1.g - 0.5) * 16.0;
            // as marcas pequenas (~1,3 m): a crista afiada, o vale largo
            float f1 = 6.2832 / 1.3, ph1 = (u + 0.08 * v + torto) * f1;
            float a1 = 1.0 - smoothstep(0.35, 1.6, fwidth(ph1));
            float d1 = cos(ph1 + 0.65 * sin(ph1)) * (1.0 + 0.65 * cos(ph1)) * f1;
            // as grandes (~7 m), quase no mesmo rumo
            float f2 = 6.2832 / 7.0, ph2 = (u * 0.97 - 0.15 * v + torto * 2.2) * f2;
            float a2 = 1.0 - smoothstep(0.35, 1.6, fwidth(ph2));
            float d2 = cos(ph2 + 0.75 * sin(ph2)) * (1.0 + 0.75 * cos(ph2)) * f2;
            // nem todo lugar tem ondulação marcada (manchas)
            float onde = smoothstep(0.25, 0.65, n1.g);
            float du = (d1 * 0.022 * a1 * (0.4 + 0.6 * onde) + d2 * 0.05 * a2 * (0.15 + 0.85 * onde)) * areiaK;
            areiaGrad = w * du;
            // o sol baixo assado (o mesmo do chao.ts): a encosta da ondulação virada pra ele clareia
            areiaLuz = clamp(-(areiaGrad.x * -0.55 + areiaGrad.y * -0.56) * 1.4, -0.35, 0.35);
          #endif
          vec3 k = mix(vec3(1.0), tom * grao * (1.0 + areiaLuz), areiaK);
          diffuseColor.rgb *= k;
          // (o final) a frente verde: só fora da cidade (de 1300 a 2200 m do centro)
          if (uVerde > 0.0) {
            float dC = length(p - vec2(${CENTRO_VERDE.x.toFixed(1)}, ${CENTRO_VERDE.z.toFixed(1)}));
            float fora = smoothstep(1300.0, 2200.0, length(p));
            float vk = (1.0 - smoothstep(uVerde - 160.0, uVerde, dC)) * fora * areiaK * (0.65 + 0.35 * n1.g);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.2, 0.08) * grao, vk);
          }
        }`)
      // a normal: o relevo das ondulações (vira luz de verdade com o sol e os faróis)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        #ifndef AREIA_LEVE
          normal = normalize(normal + (viewMatrix * vec4(-areiaGrad.x, 0.0, -areiaGrad.y, 0.0)).xyz);
        #endif`)
      // o emissivo (a luz própria fraquinha do chão) segue a textura, e as faíscas
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        {
          totalEmissiveRadiance *= mix(1.0, (0.9 + 0.2 * texture2D(tAreia, vAreiaW.xz / 41.0 + 0.37).g) * (1.0 + areiaLuz), areiaK);
          #ifndef AREIA_LEVE
            vec3 olhar = normalize(vAreiaW - cameraPosition);
            float fa = texture2D(tAreia, vAreiaW.xz * 0.12 + olhar.xz * 0.25).a;
            float perto = 1.0 - smoothstep(8.0, 45.0, length(vAreiaW - cameraPosition));
            totalEmissiveRadiance += vec3(1.0, 0.9, 0.72) * smoothstep(0.96, 1.0, fa) * perto * 0.55 * areiaK;
          #endif
        }`)
  }
  return m
}
