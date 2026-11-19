// OS OUTDOORS DO NÚCLEO (T46, 06/11). Coordenada do dono: "os outdoors são de
// produtos do Núcleo (a corporação da cidade); de vez em quando piscam os
// nomes das músicas do dono, como se estivessem sendo hackeados." Na cidade lá
// em cima (as pistas do disco) os prédios viram outdoors: uma placa colada na
// fachada que olha pra pista. Doc: docs/outdoors.md
//
// Aqui moram os DADOS (a tabela de produtos, o ritmo do hack), o ATLAS (um
// canvas só, gerado uma vez, com todos os anúncios e todas as faixas) e o
// MATERIAL (um shader: o hack é só a conta do uniform de tempo, sem CPU por
// quadro). Quem monta as placas é OutdoorsNucleo.tsx; onde elas ficam sai do
// laço dos prédios em Corrida.tsx (sem sortear nada a mais: a cidade não muda).

import * as THREE from "three"
import { PISTAS } from "./pistas"
import { ANUNCIOS, ANUNCIO_H, ANUNCIO_W } from "./outdoorsArte"

// RASCUNHO: nomes e slogans pro dono revisar (o tom: crítica velada, ironia
// sobre vício, tempo e consumo). Mudar aqui muda todas as placas.
export const PRODUTOS: { nome: string; slogan: string; cor: string }[] = [
  { nome: "SCROLL INFINITO", slogan: "o fim é só mais um pra baixo", cor: "#ff3fb0" },
  { nome: "FOMO+", slogan: "agora com 30% mais medo de perder", cor: "#ffd84a" },
  { nome: "MINUTO DOURADO", slogan: "compre de volta o tempo que te vendemos", cor: "#ffb13d" },
  { nome: "DOPA-COLA", slogan: "sede de mais. sempre.", cor: "#ff4b4b" },
  { nome: "PACIÊNCIA ZERO", slogan: "por que esperar se dá pra querer?", cor: "#2fe8ff" },
  { nome: "SONO LITE", slogan: "durma 4 horas, renda 12", cor: "#9b6bff" },
  { nome: "LIKE EXPRESS", slogan: "aprovação em até 3 segundos", cor: "#ff7ad9" },
  { nome: "SORRISO PADRÃO", slogan: "aprovado pelo Núcleo. use em público.", cor: "#eef3ff" },
  { nome: "NOTIFICA", slogan: "nunca mais fique sozinho com você", cor: "#5dffa0" },
  { nome: "SILÊNCIO PREMIUM", slogan: "assine pra não ouvir nada", cor: "#9fd0ff" },
  { nome: "VIDA AUTOPLAY", slogan: "o próximo episódio já começou", cor: "#ff6a3d" },
  { nome: "MEMÓRIA NUVEM", slogan: "esqueça tudo. a gente lembra (e cobra).", cor: "#7af0ff" },
  { nome: "CÉU AZUL™", slogan: "tela de 40 m². o original saiu de linha.", cor: "#4f8bff" },
  { nome: "OPINIÃO PRONTA", slogan: "pensar cansa. a gente pensa por você.", cor: "#d6ff3d" },
  { nome: "CARRINHO CHEIO", slogan: "pra quando o peito tá vazio", cor: "#ff9ec7" },
]

/** os números pra afinar sem mexer no código */
export const OUTDOORS_CFG = {
  /** chance de um prédio da cidade (alto o bastante, na pista) ganhar placa */
  chance: 0.6,
  /** altura mínima do prédio pra ganhar placa (m) */
  alturaMin: 18,
  /** a placa ocupa esta fração da fachada (o lado que olha a pista), até `largMax` m */
  fracao: 0.82,
  largMax: 26,
  /** cada placa sorteia, a cada `periodo` s (com uma defasagem só dela), se é hackeada */
  periodo: 12,
  /** chance por período (poucas por vez: com ~20 placas à vista, ~1 hackeada de vez em quando) */
  chanceHack: 0.1,
  /** quanto do período o hack dura (0,35 × 12 s ≈ 4 s) */
  dura: 0.35,
  /** o brilho da placa (sem luz nova: ela é emissiva, a névoa apaga de longe) */
  brilho: 0.92,
  /** monta as placas com a câmera a menos disto de uma quadra que tem placa (m) */
  raioPerto: 900,
}

/** uma placa: o meio dela, o giro (y), o tamanho, o anúncio e a faixa que invade */
export type Placa = { x: number; y: number; z: number; rot: number; w: number; h: number; produto: number; faixa: number; semente: number }

// ── o atlas: os 15 produtos e as 9 faixas numa textura só (4 colunas) ──
const COLS = 4, CW = ANUNCIO_W, CH = ANUNCIO_H
export const N_PRODUTOS = PRODUTOS.length
/** a célula da faixa `i` de PISTAS no atlas */
export const celulaFaixa = (i: number) => N_PRODUTOS + i
/** a faixa (índice em PISTAS) pelo nome da pista do disco; -1 se não achar */
export const faixaPeloNome = (nome: string) => PISTAS.findIndex((p) => p.faixa === nome || p.id === nome.toLowerCase())

/** hash determinístico (não usa o sorteio da cidade: os prédios não mudam) */
export const hash2 = (x: number, z: number, k = 0) => {
  const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453
  return s - Math.floor(s)
}

function caber(g: CanvasRenderingContext2D, txt: string, peso: string, tam: number, larg: number) {
  g.font = `${peso} ${tam}px "Arial Black", system-ui, sans-serif`
  while (g.measureText(txt).width > larg && tam > 10) { tam *= 0.93; g.font = `${peso} ${tam}px "Arial Black", system-ui, sans-serif` }
}

let ATLAS: THREE.CanvasTexture | null = null
export function atlasOutdoors(): THREE.CanvasTexture {
  if (ATLAS) return ATLAS
  const n = N_PRODUTOS + PISTAS.length
  const rows = Math.ceil(n / COLS)
  const c = document.createElement("canvas"); c.width = COLS * CW; c.height = rows * CH
  const g = c.getContext("2d")!
  g.textBaseline = "middle"
  for (let i = 0; i < n; i++) {
    const x0 = (i % COLS) * CW, y0 = Math.floor(i / COLS) * CH
    g.save(); g.beginPath(); g.rect(x0, y0, CW, CH); g.clip()
    if (i < N_PRODUTOS) {
      // o anúncio: cada produto tem a peça dele (outdoorsArte.ts)
      g.translate(x0, y0)
      ANUNCIOS[i % ANUNCIOS.length](g, PRODUTOS[i])
    } else {
      // a faixa do LU2CA invadindo: preto, o nome em ciano/magenta deslocados, "sinal invadido"
      const f = PISTAS[i - N_PRODUTOS]
      g.fillStyle = "#020205"; g.fillRect(x0, y0, CW, CH)
      for (let y = 0; y < CH; y += 4) { g.fillStyle = "rgba(255,255,255,0.04)"; g.fillRect(x0, y0 + y, CW, 1) }
      const nome = f.faixa.toUpperCase()
      g.textAlign = "center"
      caber(g, nome, "900", 92, CW - 40)
      g.fillStyle = "#00f0ff"; g.fillText(nome, x0 + CW / 2 - 5, y0 + 108)
      g.fillStyle = "#ff2bd6"; g.fillText(nome, x0 + CW / 2 + 5, y0 + 112)
      g.fillStyle = "#ffffff"; g.fillText(nome, x0 + CW / 2, y0 + 110)
      g.fillStyle = "#ff2bd6"; caber(g, "▶ LU2CA", "900", 34, 300); g.fillText("▶ LU2CA", x0 + CW / 2, y0 + 184)
      g.fillStyle = "#7af0ff"; caber(g, "// SINAL INVADIDO //", "700", 18, 360); g.fillText("// SINAL INVADIDO //", x0 + CW / 2, y0 + 30)
    }
    g.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4
  ATLAS = t
  return t
}

// ── o material: um shader, o hack só pelo uniform de tempo ──
const VERT = /* glsl */ `
attribute vec3 aIdx; // produto, faixa (células do atlas), semente
varying vec2 vUv;
varying vec3 vIdx;
#include <fog_pars_vertex>
void main() {
  vUv = uv; vIdx = aIdx;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
const FRAG = /* glsl */ `
uniform sampler2D uAtlas;
uniform float uTempo, uPeriodo, uDura, uChance, uBrilho;
uniform vec2 uGrade;
varying vec2 vUv;
varying vec3 vIdx;
#include <fog_pars_fragment>
float h1(float n) { return fract(sin(n) * 43758.5453123); }
vec2 celula(float i, vec2 uv) {
  float c = mod(i, uGrade.x), r = floor(i / uGrade.x);
  uv = clamp(uv, 0.006, 0.994);
  return vec2((c + uv.x) / uGrade.x, (uGrade.y - 1.0 - r + uv.y) / uGrade.y);
}
void main() {
  float s = vIdx.z;
  float tt = uTempo / uPeriodo + s;
  float ciclo = floor(tt), fase = fract(tt);
  // hackeada neste ciclo? (poucas: uChance) e só no começo dele (uDura)
  float hack = step(h1(ciclo * 7.13 + s * 91.7), uChance) * step(fase, uDura);
  float f = fase / max(uDura, 0.001);
  // nas pontas do hack o sinal briga: alterna anúncio/faixa e o glitch é forte
  float borda = hack * (1.0 - smoothstep(0.0, 0.14, min(f, 1.0 - f)));
  float tq = floor(uTempo * 24.0);
  float pisca = step(0.5, h1(tq + s * 13.0));
  float mostra = hack * mix(1.0, pisca, borda);
  float g = hack * (0.2 + 0.8 * max(borda, step(0.88, h1(tq * 0.37 + s))));
  vec2 uv = vUv;
  float faixaY = floor(uv.y * 18.0);
  uv.x += (h1(faixaY + tq * 3.1 + s) - 0.5) * 0.2 * g * step(0.55, h1(faixaY * 1.7 + tq));
  float i = mix(vIdx.x, vIdx.y, mostra);
  float sep = 0.014 * g;
  vec3 cor;
  cor.r = texture2D(uAtlas, celula(i, uv + vec2(sep, 0.0))).r;
  cor.g = texture2D(uAtlas, celula(i, uv)).g;
  cor.b = texture2D(uAtlas, celula(i, uv - vec2(sep, 0.0))).b;
  cor *= 1.0 - 0.35 * g * step(0.5, fract(vUv.y * 60.0 + uTempo * 8.0));
  cor += g * 0.18 * vec3(1.0, 0.1, 0.85) * step(0.9, h1(faixaY + tq));
  gl_FragColor = vec4(cor * uBrilho, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

let MAT: THREE.ShaderMaterial | null = null
/** o material único das placas (módulo: remontar não recompila) */
export function materialOutdoors(): THREE.ShaderMaterial {
  if (MAT) return MAT
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uAtlas: { value: null }, uTempo: { value: 0 }, uPeriodo: { value: OUTDOORS_CFG.periodo }, uDura: { value: OUTDOORS_CFG.dura },
    uChance: { value: OUTDOORS_CFG.chanceHack }, uBrilho: { value: OUTDOORS_CFG.brilho }, uGrade: { value: new THREE.Vector2() },
  }])
  const atlas = atlasOutdoors()
  uniforms.uAtlas.value = atlas
  ;(uniforms.uGrade.value as THREE.Vector2).set(COLS, atlas.image.height / CH)
  MAT = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, fog: true, toneMapped: false })
  return MAT
}

/** os centros das quadras que têm placa (pro <Perto>) */
export function quadrasDasPlacas(placas: Placa[], quadra: number) {
  const m = new Map<string, { x: number; z: number; l: Placa[] }>()
  for (const p of placas) {
    const k = `${Math.floor(p.x / quadra)},${Math.floor(p.z / quadra)}`
    let q = m.get(k); if (!q) m.set(k, (q = { x: 0, z: 0, l: [] }))
    q.l.push(p); q.x += p.x; q.z += p.z
  }
  return [...m.values()].map((q) => ({ x: q.x / q.l.length, z: q.z / q.l.length, l: q.l }))
}
