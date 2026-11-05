"use client"

// A NOITE DAS RUÍNAS DO SUBÚRBIO (05/11). Bíblia, 4: o subúrbio é exponencial,
// é onde rola toda a vida. As ruínas ficavam escuras de noite; aqui elas
// acendem SEM luz pontual nenhuma (desempenho):
//   - janelas: as janelas desenhadas na fachada assada acendem no próprio
//     shader das ruínas (0 triângulo, 0 draw call a mais);
// Tudo sorteado com semente fixa (sempre igual) e só de noite: `U.noite` segue
// o céu (ceuNaHora(h).noite), atualizado pelo RuinasSuburbio.

import * as THREE from "three"

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
        float hashJ(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float lumJ(vec2 uv, float lod) { return dot(textureLod(map, uv, lod).rgb, vec3(0.2126, 0.7152, 0.0722)); }`)
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
  m.customProgramCacheKey = () => "ruinas-janelas-1"
  return m
}
