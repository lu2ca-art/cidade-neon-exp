// A GOTA COMO JOIA (LU2CA 20/10): "uma joia em formato de gota, 3D,
// iridescente, 1/8 do tamanho da Kombi", lapidada, com o tom da pista por cima
// da iridescência. Uma malha instanciada só (as perto da câmera), um shader
// barato: sem luz de cena, a cor sai da faceta × o olhar (o furta-cor) e um
// brilho de lapidação que pisca quando uma faceta pega o "sol".

import * as THREE from "three"

// a Kombi tem ~4,4 m: a gota ~0,6 m de altura (um pouco acima de 1/8 pra
// ler como joia lá de cima, com a câmera alta)
export const ALTURA_JOIA = 0.62

// o perfil da gota lapidada: o fundo redondo em 4 anéis de facetas, o ombro e
// a ponta. 8 lados (a lapidação "pera"); sem vértice compartilhado, cada
// face tem a sua normal (as facetas aparecem)
export function geoJoia() {
  const h = ALTURA_JOIA, r = h * 0.36
  const perfil: [number, number][] = [
    [0, -0.5], [0.55, -0.44], [0.9, -0.26], [1, -0.04], [0.86, 0.16], [0.5, 0.34], [0, 0.5],
  ]
  const pts = perfil.map(([x, y]) => new THREE.Vector2(x * r, y * h))
  const g = new THREE.LatheGeometry(pts, 8).toNonIndexed()
  g.computeVertexNormals()
  g.deleteAttribute("uv")
  return g
}

export function matJoia() {
  return new THREE.ShaderMaterial({
    fog: true,
    toneMapped: false,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), tempo: { value: 0 }, brilho: { value: 1 } },
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vC;
      void main() {
        mat4 mi = modelMatrix;
        #ifdef USE_INSTANCING
          mi = modelMatrix * instanceMatrix;
        #endif
        vec4 wp = mi * vec4(position, 1.0);
        vN = normalize(mat3(mi) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #else
          vC = vec3(0.3, 0.8, 1.0);
        #endif
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      uniform float tempo;
      uniform float brilho;
      varying vec3 vN;
      varying vec3 vV;
      varying vec3 vC;
      void main() {
        vec3 n = normalize(vN), v = normalize(vV);
        float nv = abs(dot(n, v));
        float fr = 1.0 - nv;
        // o furta-cor: a cor gira com o ângulo da faceta e o olhar (filme fino de mentira)
        float fase = fr * 1.9 + n.y * 0.55 + n.x * 0.3 - n.z * 0.2 + tempo * 0.15;
        vec3 iri = 0.5 + 0.5 * cos(6.28318 * (fase + vec3(0.0, 0.33, 0.67)));
        // o tom da pista por cima: o miolo é a cor dela, a borda o arco-íris
        vec3 cor = mix(vC, iri * (0.55 + 0.6 * vC), 0.38 + 0.45 * fr);
        // cada faceta com o seu valor (a lapidação: claro, escuro, claro)
        float faceta = fract(sin(dot(floor(n * 4.0 + 0.5), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        // e acende quando reflete o céu de cima (cintila girando)
        vec3 r = reflect(-v, n);
        float lasca = pow(max(dot(r, normalize(vec3(0.35, 0.9, 0.25))), 0.0), 24.0);
        float fundo = 0.24 + 0.46 * faceta + 0.7 * pow(fr, 1.3);
        gl_FragColor = vec4((cor * fundo + vec3(lasca) * 2.2) * brilho, 1.0);
        #include <fog_fragment>
      }
    `,
  })
}
