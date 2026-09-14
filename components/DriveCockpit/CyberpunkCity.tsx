"use client"

// Cidade cyberpunk com ESTRADAS EM SPLINES (curvas suaves ao estilo Horizon Drive).
// - Cada circuito é uma CatmullRomCurve3 fechada, discretizada em segmentos.
// - 3 circuitos coloridos (magenta oval externo, cyan oval interno,
//   amarelo figura-8 conectando os dois).
// - Guardrails neon acompanham a curva nos dois lados.
// - Prédios distribuídos nas áreas livres (fora dos circuitos).

import { RigidBody, CuboidCollider } from "@react-three/rapier"
import React, { useLayoutEffect, useMemo, useRef } from "react"
import * as THREE from "three"
import { useEditedCircuits } from "@/hooks/useEditedCircuits"

export const ROAD_Y = 2
export const ROAD_WIDTH = 16     // pista MUITO mais larga — arcade Horizon
export const ROAD_THICKNESS = 0.4
const RAIL_H = 0.9
const RAIL_VISUAL_H = 0.7
// 120 divisões por pista — curvas MUITO suaves. InstancedMesh compensa.
const SEGMENT_DIVISIONS = 120
// Overlap entre lajes consecutivas (10%) — mata gaps visuais E colliders
// desalinhados que criavam "trancos" no carro nas junções das lajes.
const LAJE_OVERLAP = 1.10

// Circuitos inspirados em pistas reais (aproximações simbólicas, não
// medidas geograficamente exatas — LU2CA pode refinar via /pistas-editor).
// Magenta = Monaco (irregular, curvas apertadas, forma quadrada).
// Ciano   = Suzuka (única figura-8 real no calendário F1 — cruzamento
//           natural que vira viaduto graças aos Y diferentes).
// Amarela = Interlagos (oval alongado com S do Senna e Junção).
// Pistas ESPALHADAS pela cidade inteira (grid -256..+256). Escalas grandes
// pra cobrir toda a área com espaçamento decente entre elas. Alturas por
// terço da altura dos prédios (5, 22, 38) — cada pista em um patamar.
// Rampas conectam as pistas em pontos específicos onde ficam próximas.
const MAGENTA_Y = 6
const CYAN_Y = 22
const YELLOW_Y = 38
// Distância vertical entre andares (16-32u): altura real da Kombi
// (KOMBI_COLLIDER_HALF[1]*2 em lib/kombi-layout.ts) é ~1.8u, então isso já
// é ~9-18x a altura do carro — bem acima do mínimo de 3x pedido. A
// poluição visual das pistas se cruzando não era falta de distância
// vertical, era quantidade de cruzamentos concentrados na mesma região
// (ver offsets abaixo).
// Fator de escala das 3 pistas. Reduzido de 1.15 pra 0.9 — na escala
// maior, mesmo com offsets bem espaçados, Mônaco e Interlagos (os dois
// mais "largos") se cruzavam em planta 8 vezes numa faixa só, o que
// parecia um emaranhado bizarro mesmo com Y bem separado entre andares
// (ver MIN_TIER_CLEARANCE abaixo — a distância vertical nunca foi o
// problema; a quantidade de cruzamentos concentrados numa área pequena é
// que poluía o visual). Com escala menor sobra espaço pra afastar os
// offsets sem estourar o grid da cidade (±256u).
const PERIMETER_SCALE = 0.9
// Nenhuma curva do loop pode virar mais que isso entre um ponto e o
// próximo — mantém a direção fluida (arcade), sem tranco nas ferraduras
// reais (Loews, Spoon etc.) que no traçado real são bem mais fechadas.
const MAX_TRACK_TURN_DEG = 70
// Inclinação lateral máxima (banking) — a pista inclina PRA DENTRO da
// curva, tipo autódromo de verdade, proporcional a quão fechada ela é ali.
const MAX_BANK_DEG = 18
const MAX_BANK_RAD = (MAX_BANK_DEG * Math.PI) / 180
// Offsets que espalham cada pista por uma região diferente da cidade —
// antes as 3 ficavam concêntricas no centro, só empilhadas em Y (por isso
// pareciam compactas/coladas de cima). Reposicionados (junto com a escala
// menor acima) pra minimizar cruzamento em planta entre pistas DIFERENTES
// — Mônaco x Suzuka e Mônaco x Interlagos zeraram, Suzuka x Interlagos caiu
// de 2 pra ainda existir mas bem mais isolado. A distância vertical entre
// andares (16-32u, MIN_TIER_CLEARANCE abaixo) já garante folga de sobra
// nesses pontos que sobraram — o ajuste aqui foi sobre poluição visual,
// não colisão física.
const MONACO_OFFSET: [number, number] = [-108, 62] // oeste
const SUZUKA_OFFSET: [number, number] = [68, -132] // sudeste
const INTERLAGOS_OFFSET: [number, number] = [90, 60] // leste

function translateXZ(points: THREE.Vector3[], dx: number, dz: number): THREE.Vector3[] {
  return points.map((p) => new THREE.Vector3(p.x + dx, p.y, p.z + dz))
}

const magentaPts = smoothAndBridgeTrack(translateXZ(makeMonaco(200 * PERIMETER_SCALE, MAGENTA_Y), ...MONACO_OFFSET))
const cyanPts = smoothAndBridgeTrack(translateXZ(makeSuzuka(180 * PERIMETER_SCALE, CYAN_Y), ...SUZUKA_OFFSET))
const yellowPts = smoothAndBridgeTrack(translateXZ(makeInterlagos(210 * PERIMETER_SCALE, YELLOW_Y), ...INTERLAGOS_OFFSET))

const CIRCUITS = {
  magenta: { color: "#ff00ff", points: magentaPts },
  cyan:    { color: "#00ffff", points: cyanPts },
  yellow:  { color: "#ffcc00", points: yellowPts },
  // Rampas — circuitos ABERTOS (spline não fechada) que conectam patamares.
  // Em vez de um ponto cardinal fixo (só funcionava quando as 3 pistas
  // eram concêntricas), agora conecta onde as pistas vizinhas ficam
  // naturalmente mais próximas no novo layout espalhado — funciona não
  // importa pra onde cada uma se mova.
  rampaMC: { color: "#ff8800", points: makeRampBetweenNearest(magentaPts, cyanPts, MAGENTA_Y, CYAN_Y), closed: false },
  rampaCY: { color: "#88ff00", points: makeRampBetweenNearest(cyanPts, yellowPts, CYAN_Y, YELLOW_Y), closed: false },
} as const

// Monaco (simplificado). Retangular apertado, largada reta na "Boulevard
// Albert 1er", curva Ste-Devote (norte-leste), subida Beau Rivage/Massenet,
// Casino Square, descida Mirabeau + Loews Hairpin (ferradura), Portier,
// Túnel, Nouvelle Chicane, Tabac, Piscine, La Rascasse, Anthony Noghes.
// MONACO — traçado real (sentido horário, referência: aerial map do
// Circuit de Monaco). Norte = -Z, Sul = +Z. Reta principal Boulevard
// Albert I no sul; Casino Square no norte; Loews Hairpin ferradura
// no leste; Piscine/Tabac no oeste.
function makeMonaco(scale: number, y: number): THREE.Vector3[] {
  const pts: [number, number][] = [
    // Reta principal (Boulevard Albert I) — sul, indo pra oeste
    [ 0.9,  0.85], // grid de largada
    [ 0.5,  0.9],
    [ 0.1,  0.92],
    [-0.25, 0.9],
    // Sainte Dévote (curva 1 — direita cerrada)
    [-0.55, 0.82],
    [-0.7,  0.7],
    // Beau Rivage — subida norte
    [-0.75, 0.5],
    [-0.75, 0.25],
    [-0.7,  0.0],
    // Massenet / Casino Square (norte, curva esquerda→direita)
    [-0.6, -0.2],
    [-0.35,-0.35],
    [-0.05,-0.4],  // Casino Square (topo)
    // Descida pro Mirabeau
    [ 0.2, -0.32],
    [ 0.4, -0.15],
    // Mirabeau Haute (direita)
    [ 0.55, 0.0],
    [ 0.6,  0.15],
    // Loews / Grand Hôtel Hairpin — a curva mais famosa (ferradura 180° leste)
    [ 0.72, 0.25],
    [ 0.78, 0.3],
    [ 0.72, 0.38],
    [ 0.55, 0.4],
    // Mirabeau Bas / Portier (direita descendo)
    [ 0.4,  0.35],
    [ 0.25, 0.3],
    // Túnel (curva longa passando por baixo do hotel)
    [ 0.1,  0.35],
    [-0.05, 0.45],
    [-0.15, 0.55],
    // Saída túnel / Nouvelle Chicane (chicane rápido esquerda-direita)
    [-0.15, 0.65],
    [-0.05, 0.7],
    [ 0.05, 0.6],  // apex chicane 2
    // Tabac (esquerda rápida)
    [ 0.15, 0.55],
    [ 0.3,  0.45],
    // Piscine — chicane duplo Louis Chiron
    [ 0.45, 0.5],
    [ 0.55, 0.6],
    [ 0.5,  0.72],
    [ 0.4,  0.78],
    // La Rascasse (direita cerrada)
    [ 0.55, 0.85],
    [ 0.7,  0.88],
    // Anthony Noghès (última curva, direita — volta pra reta)
    [ 0.85, 0.88],
    [ 0.95, 0.85],
  ]
  return pts.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale))
}

// SUZUKA — traçado real (única figura-8 do calendário F1). Sentido horário
// (japonês). Reta principal ao sul; S curves subindo pra NE; Dunlop
// pro oeste; Degner 1+2 (esquerda-direita); hairpin; Spoon (ferradura);
// 130R; Casio Triangle; volta cruzando sobre a reta principal.
function makeSuzuka(scale: number, y: number): THREE.Vector3[] {
  const pts: [number, number][] = [
    // Reta principal (grid, sentido oeste→leste na parte sul)
    [-0.8,  0.85],
    [-0.5,  0.85],
    [-0.15, 0.85],
    // Curva 1 (direita) + Curva 2 (esquerda, primeira parte do S)
    [ 0.15, 0.75],
    [ 0.25, 0.55],
    // S curves 3-4-5-6-7 (Esses do Suzuka — série de esquerda-direita)
    [ 0.15, 0.35],
    [ 0.0,  0.2],
    [-0.15, 0.05],
    [-0.05,-0.1],
    [ 0.15,-0.15],
    // Dunlop curve (curva 7, esquerda longa)
    [ 0.25,-0.3],
    [ 0.2, -0.5],
    // Degner 1 (curva 8 — direita cerrada)
    [ 0.05,-0.6],
    // Degner 2 (curva 9 — direita cerrada, o cruzamento acima virá aqui)
    [-0.15,-0.6],
    // Passagem sob a ponte (o cruzamento em 8 nasce aqui)
    [-0.35,-0.5],
    // Hairpin (curva 11 — esquerda 180°, extremo oeste)
    [-0.55,-0.35],
    [-0.75,-0.35],
    [-0.85,-0.25],
    [-0.85,-0.1],
    [-0.75, 0.05],
    // Curva 200R e Spoon (curva 13-14 — ferradura esquerda longa, oeste)
    [-0.55, 0.15],
    [-0.35, 0.15],
    [-0.15, 0.05],
    [-0.1, -0.1],
    [-0.25,-0.25],
    // 130R (curva 15 — esquerda rápida, muito famosa)
    [-0.2, -0.4],
    [ 0.05,-0.4],
    [ 0.3, -0.35],
    // Casio Triangle (chicane final, curva 16-17)
    [ 0.55,-0.25],
    [ 0.7, -0.1],
    [ 0.75, 0.1],
    // Curva 18 pro pit straight
    [ 0.7,  0.35],
    [ 0.55, 0.55],
    [ 0.3,  0.7],
    [ 0.0,  0.8],
    [-0.4,  0.85],
    [-0.7,  0.85],
  ]
  return pts.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale))
}

// INTERLAGOS (Autódromo José Carlos Pace) — traçado real anti-horário.
// Reta dos boxes (largada) no leste, sobe pro S do Senna (curvas 1-2),
// Curva do Sol (3), reta oposta longa até o Bico de Pato / Descida do Lago
// (4-5), Ferradura (6-7 esquerda longa), Laranjinha (8), Pinheirinho (9),
// Bico de Pato (10-11), Mergulho (12), Junção (13), subida dos boxes.
function makeInterlagos(scale: number, y: number): THREE.Vector3[] {
  const pts: [number, number][] = [
    // Reta dos boxes (largada) — leste, sentido norte
    [ 0.95, 0.55],
    [ 0.95, 0.3],
    [ 0.9,  0.1],
    // S do Senna (curva 1 esquerda cerrada + curva 2 direita)
    [ 0.75, 0.0],
    [ 0.55,-0.05],
    [ 0.35, 0.0],
    // Curva do Sol (esquerda longa)
    [ 0.15, 0.1],
    [ 0.0,  0.2],
    [-0.15, 0.25],
    // Reta oposta (esquerda→norte, quase reta com leve curva)
    [-0.35, 0.15],
    [-0.5,  0.05],
    [-0.6, -0.1],
    // Descida do Lago (esquerda longa)
    [-0.65,-0.3],
    [-0.6, -0.5],
    // Ferradura (esquerda 180°, oeste extremo)
    [-0.5, -0.65],
    [-0.35,-0.7],
    [-0.15,-0.7],
    // Laranjinha (direita)
    [ 0.0, -0.65],
    // Pinheirinho (esquerda)
    [ 0.15,-0.55],
    // Bico de Pato (chicane esquerda-direita)
    [ 0.25,-0.4],
    [ 0.15,-0.3],
    [ 0.05,-0.15],
    // Mergulho (direita descendo)
    [ 0.1,  0.0],
    [ 0.25, 0.1],
    // Junção (esquerda 180° na parte SE)
    [ 0.4,  0.2],
    [ 0.55, 0.35],
    // Subida dos Boxes (longa reta em subida à esquerda voltando pra grid)
    [ 0.65, 0.5],
    [ 0.75, 0.6],
    [ 0.85, 0.6],
    [ 0.95, 0.6],
  ]
  return pts.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale))
}

// Rampa entre duas pistas: acha o par de pontos (um em cada pista) mais
// próximo entre si — respeitando uma distância mínima (`minSpan`) pra não
// ficar quase vertical quando as pistas se encostam de perto — e liga os
// dois com um traçado reto + curva de altura ease-in-out. Funciona pra
// qualquer posição relativa entre as pistas (não depende de estarem
// concêntricas nem de um lado cardinal fixo).
function makeRampBetweenNearest(
  a: THREE.Vector3[],
  b: THREE.Vector3[],
  yFrom: number,
  yTo: number,
  n = 8,
  minSpan = 100,
): THREE.Vector3[] {
  let best: { d: number; pa: THREE.Vector3; pb: THREE.Vector3 } | null = null
  let bestAny: { d: number; pa: THREE.Vector3; pb: THREE.Vector3 } | null = null
  for (const pa of a) {
    for (const pb of b) {
      const d = Math.hypot(pa.x - pb.x, pa.z - pb.z)
      if (!bestAny || d < bestAny.d) bestAny = { d, pa, pb }
      if (d < minSpan) continue
      if (!best || d < best.d) best = { d, pa, pb }
    }
  }
  // se as pistas nunca chegam a `minSpan` de distância em lugar nenhum,
  // usa o par mais próximo mesmo assim (rampa curta, mas ainda conecta)
  const { pa, pb } = best ?? bestAny!
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const yEase = 0.5 - 0.5 * Math.cos(t * Math.PI)
    pts.push(new THREE.Vector3(pa.x + (pb.x - pa.x) * t, yFrom + (yTo - yFrom) * yEase, pa.z + (pb.z - pa.z) * t))
  }
  return pts
}

// ─── Refino do traçado: abre cantos fechados e cria pontes nos cruzamentos ──
// Ângulo de mudança de direção em cada ponto de uma polilinha fechada (XZ).
function turnAnglesXZ(pts: { x: number; z: number }[], closed = true): number[] {
  const n = pts.length
  return pts.map((p1, i) => {
    const p0 = closed ? pts[(i - 1 + n) % n] : pts[Math.max(i - 1, 0)]
    const p2 = closed ? pts[(i + 1) % n] : pts[Math.min(i + 1, n - 1)]
    const ax = p1.x - p0.x, az = p1.z - p0.z
    const bx = p2.x - p1.x, bz = p2.z - p1.z
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz)
    if (la === 0 || lb === 0) return 0
    const cos = Math.min(1, Math.max(-1, (ax * bx + az * bz) / (la * lb)))
    return (Math.acos(cos) * 180) / Math.PI
  })
}

// Remove, um de cada vez, o vértice quase-reverso (>150°) mais extremo que
// sobrar — normalmente artefato de fechamento do loop (o traçado volta
// quase sobre si mesmo perto do ponto de largada), não curva de verdade.
// Corte de canto puro nunca resolve isso (é uma reversão exata numa reta),
// então tem que remover o ponto mesmo.
function removeDegenerateReversals(pts: THREE.Vector2[], snapDeg = 150, maxRemovals = 10): THREE.Vector2[] {
  let out = pts.slice()
  for (let i = 0; i < maxRemovals; i++) {
    const angs = turnAnglesXZ(out.map((p) => ({ x: p.x, z: p.y })))
    let worst = 0
    for (let k = 1; k < angs.length; k++) if (angs[k] > angs[worst]) worst = k
    if (angs[worst] <= snapDeg) break
    out.splice(worst, 1)
  }
  return out
}

// Corte de canto (estilo Chaikin): todo ponto acima de `maxTurnDeg` é
// substituído por 2 pontos interpolados entre ele e cada vizinho (nunca
// extrapola pra fora do triângulo do canto), repetido em passadas até
// nenhum canto passar do limite. Diferente de relaxamento por média, isso
// NUNCA cria os "laçinhos" de overshoot em cantos muito próximos entre si
// (ex: uma chicane com várias curvas fechadas em sequência).
function chaikinOpenCorners(pts: THREE.Vector2[], maxTurnDeg: number, maxPasses = 8, cutRatio = 0.22): THREE.Vector2[] {
  let out = pts.slice()
  for (let pass = 0; pass < maxPasses; pass++) {
    const angs = turnAnglesXZ(out.map((p) => ({ x: p.x, z: p.y })))
    if (Math.max(...angs) <= maxTurnDeg) break
    const n = out.length
    const next: THREE.Vector2[] = []
    for (let i = 0; i < n; i++) {
      if (angs[i] <= maxTurnDeg) {
        next.push(out[i])
        continue
      }
      const prev = out[(i - 1 + n) % n]
      const nxt = out[(i + 1) % n]
      const cur = out[i]
      next.push(new THREE.Vector2(cur.x + cutRatio * (prev.x - cur.x), cur.y + cutRatio * (prev.y - cur.y)))
      next.push(new THREE.Vector2(cur.x + cutRatio * (nxt.x - cur.x), cur.y + cutRatio * (nxt.y - cur.y)))
    }
    out = next
  }
  return out
}

// Interseção de 2 segmentos 2D (t,u em (0,1) = cruzam de verdade, não só
// encostam na ponta).
function segmentIntersection(p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2, p4: THREE.Vector2) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y
  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-9) return null
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom
  if (t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6) return { t, u }
  return null
}

// Acha todo par de arestas não-adjacentes que se cruzam numa polilinha —
// é a pista colidindo com ela mesma no plano (ex: a figura-8 da Suzuka,
// de propósito; ou um cruzamento sem querer que sobrou do traçado
// original aproximado). `closed=false` pras rampas (não fecha o loop —
// sem isso, checava também uma aresta de "fechamento" que não existe).
function findSelfCrossings(pts: THREE.Vector2[], closed = true) {
  const n = pts.length
  const hits: { i: number; j: number; u: number }[] = []
  const edges = closed ? n : n - 1
  for (let i = 0; i < edges; i++) {
    for (let j = i + 2; j < edges; j++) {
      if (closed && i === 0 && j === edges - 1) continue // adjacentes pelo fechamento do loop
      const hit = segmentIntersection(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])
      if (hit) hits.push({ i, j, u: hit.u })
    }
  }
  return hits
}

// Em cada cruzamento encontrado, sobe suavemente a altura (Y) dos pontos
// JÁ DISCRETIZADOS (a curva final, pronta) numa janela ao redor do
// cruzamento — janela de cosseno levantado, sem tocar X/Z. Passa por cima
// da outra pista em vez de colidir, tipo viaduto curto.
//
// Por que aqui e não nos pontos de controle: a primeira versão inseria
// pontos de controle extras ANTES do CatmullRomCurve3 interpolar. Mesmo
// com um perfil de altura suave, meter vários pontos densos no meio de um
// trecho normalmente espaçado bagunça a estimativa de tangente do
// CatmullRom nos pontos vizinhos (a densidade local muda, não só a
// altura), e a curva final ainda dava voltinha/se autocruzava em X/Z bem
// ali — o "X" quebrado perto de algumas curvas. Mexendo em Y DEPOIS que
// X/Z já estão prontos (a curva já interpolada e comprovadamente sem
// autocruzamento), é geometricamente impossível criar um autocruzamento
// novo: só a altura muda.
function applyCrossingBumps(disc: THREE.Vector3[], closed: boolean, clearance = 10, windowSamples = 10): THREE.Vector3[] {
  // Pra curva fechada, getPoints devolve o último ponto igual ao primeiro
  // (fecha o loop) — trabalha só com os pontos únicos e refecha no final.
  const pts = closed && disc.length > 1 ? disc.slice(0, -1) : disc.slice()
  const flat = pts.map((p) => new THREE.Vector2(p.x, p.z))
  const hits = findSelfCrossings(flat, closed)
  if (hits.length === 0) return disc
  const n = pts.length
  const out = pts.map((p) => p.clone())
  for (const { j } of hits) {
    for (let d = -windowSamples; d <= windowSamples; d++) {
      const idx = closed ? (j + d + n) % n : j + d
      if (idx < 0 || idx >= n) continue
      const w = 0.5 + 0.5 * Math.cos((d / windowSamples) * Math.PI) // 1 no centro, 0 nas bordas
      out[idx].y = Math.max(out[idx].y, pts[idx].y + clearance * w)
    }
  }
  if (closed) out.push(out[0].clone())
  return out
}

// Remove pontos consecutivos mais próximos que `minDist` (mantém o
// primeiro, descarta o que vem colado nele) — passada de segurança contra
// pontos quase-duplicados que qualquer etapa anterior possa ter deixado
// (corte de canto perto do fechamento do loop, clamp da ponte na borda de
// um trecho etc). Pontos muito próximos são o que faz o CatmullRomCurve3
// "beliscar"/sumir um pedaço da curva e o collider ficar fino/instável ali
// — exatamente onde o carro engancha.
function enforceMinSpacing(points: THREE.Vector3[], minDist: number, closed = true): THREE.Vector3[] {
  if (points.length === 0) return points
  const out: THREE.Vector3[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const last = out[out.length - 1]
    const p = points[i]
    if (Math.hypot(p.x - last.x, p.z - last.z) >= minDist) out.push(p)
  }
  if (closed && out.length > 1) {
    const first = out[0]
    const last = out[out.length - 1]
    if (Math.hypot(first.x - last.x, first.z - last.z) < minDist) out.pop()
  }
  return out
}

// Pipeline dos pontos de CONTROLE: abre cantos fechados demais (sem
// overshoot) e garante espaçamento mínimo (evita os "beliscões" na curva
// e os colliders degenerados que travavam o carro). A ponte dos
// cruzamentos NÃO entra aqui — ela mexe em Y só depois que essa curva já
// foi interpolada pelo CatmullRomCurve3 (ver applyCrossingBumps), pra
// nunca correr o risco de criar um autocruzamento novo em X/Z.
function smoothAndBridgeTrack(points: THREE.Vector3[], maxTurnDeg = MAX_TRACK_TURN_DEG): THREE.Vector3[] {
  const baseY = points[0]?.y ?? 0
  let flat = points.map((p) => new THREE.Vector2(p.x, p.z))
  flat = removeDegenerateReversals(flat)
  flat = chaikinOpenCorners(flat, maxTurnDeg)
  return enforceMinSpacing(
    flat.map((p) => new THREE.Vector3(p.x, baseY, p.y)),
    8,
  )
}

// ─── Segmento de estrada (visual + collider) ────────────────────────────────
interface SegmentProps {
  from: THREE.Vector3
  to: THREE.Vector3
  color: string
}

function RoadSegment({ from, to, color, y = ROAD_Y }: SegmentProps & { y?: number }) {
  const dx = to.x - from.x
  const dz = to.z - from.z
  const length = Math.sqrt(dx * dx + dz * dz)
  const cx = (from.x + to.x) / 2
  const cz = (from.z + to.z) / 2
  const angle = Math.atan2(dx, dz)
  return (
    <group position={[cx, y, cz]} rotation={[0, angle, 0]}>
      {/* laje + collider (chão) */}
      <RigidBody type="fixed" colliders={false} friction={1.0}>
        <CuboidCollider args={[ROAD_WIDTH / 2, ROAD_THICKNESS / 2, length / 2]} />
        <mesh >
          <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, length]} />
          <meshStandardMaterial color="#1a0533" roughness={0.6} metalness={0.3} />
        </mesh>
      </RigidBody>
      {/* Guard rails DESLIZANTES — friction baixa + restitution alta pra
          Kombi escorregar contra a parede em vez de travar (feel Horizon). */}
      <RigidBody type="fixed" colliders={false} friction={0.005} restitution={0.7}>
        <CuboidCollider
          args={[0.1, RAIL_H / 2, length / 2]}
          position={[-ROAD_WIDTH / 2, RAIL_H / 2, 0]}
        />
      </RigidBody>
      <RigidBody type="fixed" colliders={false} friction={0.005} restitution={0.7}>
        <CuboidCollider
          args={[0.1, RAIL_H / 2, length / 2]}
          position={[ROAD_WIDTH / 2, RAIL_H / 2, 0]}
        />
      </RigidBody>
      {/* Faixa central neon */}
      <mesh position={[0, ROAD_THICKNESS / 2 + 0.005, 0]}>
        <boxGeometry args={[0.35, 0.03, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* Guard rails VISÍVEIS — alto (0.7u), neon vibrante nas duas laterais.
          Barra sólida no meio + topo brilhante + linha luminosa em baixo. */}
      {/* ESQUERDO */}
      <mesh position={[-ROAD_WIDTH / 2 + 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2, 0]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, length]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* topo neon do rail esquerdo (mais brilhante) */}
      <mesh position={[-ROAD_WIDTH / 2 + 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H + 0.02, 0]}>
        <boxGeometry args={[0.16, 0.04, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* DIREITO */}
      <mesh position={[ROAD_WIDTH / 2 - 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2, 0]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, length]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[ROAD_WIDTH / 2 - 0.08, ROAD_THICKNESS / 2 + RAIL_VISUAL_H + 0.02, 0]}>
        <boxGeometry args={[0.16, 0.04, length]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* brilho por baixo (efeito flutuante) */}
      <mesh position={[0, -ROAD_THICKNESS / 2 - 0.02, 0]}>
        <boxGeometry args={[ROAD_WIDTH + 0.6, 0.04, length + 0.6]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.35} />
      </mesh>
    </group>
  )
}

// ─── Placa de seta neon (chevron) — marca curvas fortes ─────────────────────
function CurveArrow({ position, angle }: { position: [number, number, number]; angle: number }) {
  return (
    <group position={position} rotation={[0, angle, 0]}>
      {/* haste em painel vertical baixo */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.06, 1.4, 0.06]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* placa: 3 chevrons empilhados */}
      {[0, 0.35, 0.7].map((offset, i) => (
        <group key={i} position={[offset, 1.6, 0]}>
          <mesh rotation={[0, 0, Math.PI / 6]}>
            <planeGeometry args={[0.6, 0.14]} />
            <meshBasicMaterial color="#ffcc00" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Ângulo de banking num ponto do traçado discretizado: olha um pouco antes
// e um pouco depois (`window` amostras) pra medir curvatura + direção
// (esquerda/direita, pelo sinal do produto vetorial 2D) e devolve o quanto
// a pista deveria inclinar PRA DENTRO da curva ali, clampado no máximo.
function bankAngleAt(disc: THREE.Vector3[], i: number, closed: boolean, window = 5, gain = 2.4): number {
  const n = disc.length
  const idxPrev = closed ? (i - window + n) % n : Math.max(i - window, 0)
  const idxNext = closed ? (i + window) % n : Math.min(i + window, n - 1)
  const prev = disc[idxPrev]
  const cur = disc[i]
  const next = disc[idxNext]
  const v1x = cur.x - prev.x, v1z = cur.z - prev.z
  const v2x = next.x - cur.x, v2z = next.z - cur.z
  const l1 = Math.hypot(v1x, v1z) || 1
  const l2 = Math.hypot(v2x, v2z) || 1
  const cross = Math.max(-1, Math.min(1, (v1x * v2z - v1z * v2x) / (l1 * l2)))
  const turn = Math.asin(cross)
  return Math.max(-MAX_BANK_RAD, Math.min(MAX_BANK_RAD, turn * gain))
}

// Calcula o banking de TODOS os pontos e suaviza a sequência inteira antes
// de usar — cada laje é um segmento RÍGIDO e RETO; se o ângulo de um
// segmento pro próximo mudar rápido demais, a junção entre eles aparece
// como um corte/vinco na pista, mesmo o ângulo em si estando dentro do
// limite. `maxDeltaPerSegment` limita quanto o roll pode variar de um
// segmento pro vizinho (passada pra frente e pra trás, pega os dois
// sentidos da transição).
function smoothedBankAngles(disc: THREE.Vector3[], closed: boolean, maxDeltaPerSegment = 0.025): number[] {
  const n = disc.length
  const raw = disc.map((_, i) => bankAngleAt(disc, i, closed))
  const out = raw.slice()
  const clampStep = (prevVal: number, target: number) => {
    const delta = target - prevVal
    if (delta > maxDeltaPerSegment) return prevVal + maxDeltaPerSegment
    if (delta < -maxDeltaPerSegment) return prevVal - maxDeltaPerSegment
    return target
  }
  // passada pra frente
  for (let i = 1; i < n; i++) out[i] = clampStep(out[i - 1], out[i])
  if (closed) out[0] = clampStep(out[n - 1], out[0])
  // passada pra trás (suaviza a transição nos dois sentidos, não só um)
  for (let i = n - 2; i >= 0; i--) out[i] = clampStep(out[i + 1], out[i])
  if (closed) out[n - 1] = clampStep(out[0], out[n - 1])
  return out
}

// ─── Circuito com InstancedMesh (perf otimizado) ────────────────────────────
// 5 InstancedMesh por circuito (laje, faixa central, rail-esq, rail-dir,
// underglow) em vez de N × 5 meshes separados. 24 draw calls totais em vez
// de 9.600. Colliders agrupados em 1 RigidBody por circuito.
function Circuit({ color, points, closed = true }: { color: string; points: THREE.Vector3[]; closed?: boolean }) {
  const { segData, colliderData, arrows } = useMemo(() => {
    // tension 0.5 (era 0.3) — curvas MAIS SUAVES, orgânicas, sem quinas
    const curve = new THREE.CatmullRomCurve3(points, closed, "chordal", 0.5)
    // Ponte dos cruzamentos mexe em Y DEPOIS da curva pronta — ver
    // applyCrossingBumps pra explicação de por que não faz isso nos
    // pontos de controle (X/Z já garantidamente sem autocruzamento aqui).
    const disc = applyCrossingBumps(curve.getPoints(SEGMENT_DIVISIONS), closed)
    const rolls = smoothedBankAngles(disc, closed)
    // Pra cada segmento: matriz completa (position + rotation + scale).
    // Cada laje INCLINA (pitch) seguindo a rampa entre os dois pontos —
    // sem isso, apareciam degraus onde Y variava entre segmentos.
    const segs: { matrix: THREE.Matrix4; length: number; cx: number; cy: number; cz: number; angle: number; pitch: number; roll: number }[] = []
    const tmpPos = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const tmpEuler = new THREE.Euler()
    const tmpScale = new THREE.Vector3(1, 1, 1)
    for (let i = 0; i < disc.length - 1; i++) {
      const from = disc[i]
      const to = disc[i + 1]
      const dx = to.x - from.x
      const dy = to.y - from.y
      const dz = to.z - from.z
      const horizLen = Math.sqrt(dx * dx + dz * dz)
      // Comprimento 3D real (inclui componente vertical)
      const length = Math.sqrt(horizLen * horizLen + dy * dy)
      const cx = (from.x + to.x) / 2
      const cy = (from.y + to.y) / 2
      const cz = (from.z + to.z) / 2
      const angle = Math.atan2(dx, dz)
      // Pitch: inclina a laje pra cima/baixo seguindo a rampa. Sinal negativo
      // pra que dy>0 (segmento sobe) resulte em pitch negativo (frente sobe).
      const pitch = -Math.atan2(dy, horizLen)
      // Banking: inclina a laje PRA DENTRO da curva ali, proporcional a
      // quão fechada ela é — igual autódromo de verdade, harmoniza a
      // transição entre trechos retos e curvas fechadas. Já vem suavizado
      // (rolls[]) — usar bankAngleAt cru aqui criava corte na junção entre
      // lajes vizinhas quando o ângulo mudava rápido demais de uma pra
      // outra.
      const roll = rolls[i]
      tmpPos.set(cx, cy, cz)
      tmpEuler.set(pitch, angle, roll, "YXZ")
      tmpQuat.setFromEuler(tmpEuler)
      const matrix = new THREE.Matrix4().compose(tmpPos, tmpQuat, tmpScale)
      segs.push({ matrix, length, cx, cy, cz, angle, pitch, roll })
    }

    // Colliders em batch (um RigidBody por circuito, N colliders filhos) —
    // rotação inclui o banking, senão o collider fica plano por baixo do
    // visual inclinado e o carro flutua/afunda na lateral da pista.
    const cols = segs.map((s) => ({
      pos: [s.cx, s.cy, s.cz] as [number, number, number],
      rot: [s.pitch, s.angle, s.roll] as [number, number, number],
      length: s.length,
    }))

    // Setas em curvas fortes (mantém como estava)
    const arr: { pos: [number, number, number]; angle: number }[] = []
    for (let i = 2; i < disc.length - 2; i += 6) {
      const prev = disc[i - 2]
      const cur = disc[i]
      const next = disc[i + 2]
      const v1x = cur.x - prev.x, v1z = cur.z - prev.z
      const v2x = next.x - cur.x, v2z = next.z - cur.z
      const l1 = Math.sqrt(v1x * v1x + v1z * v1z) || 1
      const l2 = Math.sqrt(v2x * v2x + v2z * v2z) || 1
      const cos = (v1x * v2x + v1z * v2z) / (l1 * l2)
      const ang = Math.acos(Math.max(-1, Math.min(1, cos)))
      if (ang > 0.18) {
        const tangX = v2x / l2, tangZ = v2z / l2
        const perpX = -tangZ, perpZ = tangX
        const cross = v1x * v2z - v1z * v2x
        const side = cross > 0 ? -1 : 1
        const offset = (ROAD_WIDTH / 2 + 0.8) * side
        arr.push({
          pos: [cur.x + perpX * offset, 0, cur.z + perpZ * offset],
          angle: Math.atan2(tangX, tangZ),
        })
      }
    }

    return { segData: segs, colliderData: cols, arrows: arr }
  }, [points, closed])

  // Refs pros InstancedMesh: precisamos atualizar matriz de cada instância
  const lajeRef = useRef<THREE.InstancedMesh>(null!)
  const faixaRef = useRef<THREE.InstancedMesh>(null!)
  const railLRef = useRef<THREE.InstancedMesh>(null!)
  const railRRef = useRef<THREE.InstancedMesh>(null!)
  const glowRef = useRef<THREE.InstancedMesh>(null!)

  // Aplica matrizes por instância (posição/rotação/scale-Z do segmento).
  // useLayoutEffect roda no commit — depois que refs são atribuídos.
  // (useMemo aqui rodava antes do ref ser populado → matrizes identity)
  useLayoutEffect(() => {
    const tmp = new THREE.Matrix4()
    const tmpPos = new THREE.Vector3()
    const tmpQuat = new THREE.Quaternion()
    const tmpScale = new THREE.Vector3()
    const tmpEuler = new THREE.Euler()
    const upLocal = new THREE.Vector3(0, 1, 0)
    const downLocal = new THREE.Vector3(0, -1, 0)
    const worldUp = new THREE.Vector3()
    const worldDown = new THREE.Vector3()
    for (let i = 0; i < segData.length; i++) {
      const s = segData[i]
      // Rotação inclui pitch (rampa entre pontos consecutivos) e roll
      // (banking pra dentro da curva) — sem isso apareciam degraus/e a
      // pista ficava sempre plana de lado mesmo nas curvas fechadas.
      tmpEuler.set(s.pitch, s.angle, s.roll, "YXZ")
      tmpQuat.setFromEuler(tmpEuler)
      // Vetor "up" e "down" DA LAJE em coordenadas world (pra offsetar
      // faixa central, underglow e rails perpendiculares corretamente
      // à laje inclinada, não ao mundo).
      worldUp.copy(upLocal).applyQuaternion(tmpQuat)
      worldDown.copy(downLocal).applyQuaternion(tmpQuat)

      // Laje: scale Z=length3D * overlap (comprimento real da rampa).
      tmpPos.set(s.cx, s.cy, s.cz)
      tmpScale.set(1, 1, s.length * LAJE_OVERLAP)
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      lajeRef.current?.setMatrixAt(i, tmp)

      // Faixa central — offset no eixo UP LOCAL da laje (não no Y mundo)
      const faixaOff = ROAD_THICKNESS / 2 + 0.005
      tmpPos.set(
        s.cx + worldUp.x * faixaOff,
        s.cy + worldUp.y * faixaOff,
        s.cz + worldUp.z * faixaOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      faixaRef.current?.setMatrixAt(i, tmp)

      // Rails — offset LATERAL no eixo X local + UP local pra ficarem
      // sempre perpendiculares à laje, mesmo inclinada. Pra achar o eixo
      // X world local, uso um vetor auxiliar.
      const rightLocal = new THREE.Vector3(1, 0, 0).applyQuaternion(tmpQuat)
      const offX = ROAD_WIDTH / 2 - 0.08
      const railUpOff = ROAD_THICKNESS / 2 + RAIL_VISUAL_H / 2
      // ESQUERDO
      tmpPos.set(
        s.cx - rightLocal.x * offX + worldUp.x * railUpOff,
        s.cy - rightLocal.y * offX + worldUp.y * railUpOff,
        s.cz - rightLocal.z * offX + worldUp.z * railUpOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      railLRef.current?.setMatrixAt(i, tmp)
      // DIREITO
      tmpPos.set(
        s.cx + rightLocal.x * offX + worldUp.x * railUpOff,
        s.cy + rightLocal.y * offX + worldUp.y * railUpOff,
        s.cz + rightLocal.z * offX + worldUp.z * railUpOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      railRRef.current?.setMatrixAt(i, tmp)

      // Underglow — DOWN local da laje
      const glowOff = ROAD_THICKNESS / 2 + 0.02
      tmpPos.set(
        s.cx + worldDown.x * glowOff,
        s.cy + worldDown.y * glowOff,
        s.cz + worldDown.z * glowOff,
      )
      tmp.compose(tmpPos, tmpQuat, tmpScale)
      glowRef.current?.setMatrixAt(i, tmp)
    }
    ;[lajeRef, faixaRef, railLRef, railRRef, glowRef].forEach((r) => {
      if (r.current) {
        r.current.instanceMatrix.needsUpdate = true
        r.current.computeBoundingSphere()
      }
    })
  }, [segData])

  const N = segData.length
  if (N === 0) return null

  return (
    <>
      {/* 5 InstancedMesh por circuito (24 draw calls totais pra cidade toda
          em vez de 9.600). Cada instância representa 1 segmento; sua matriz
          contém posição/rotação/scale-Z próprios. */}
      <instancedMesh ref={lajeRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, 1]} />
        <meshStandardMaterial color="#1a0533" roughness={0.6} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={faixaRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.35, 0.03, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={railLRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </instancedMesh>
      <instancedMesh ref={railRRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[0.12, RAIL_VISUAL_H, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </instancedMesh>
      <instancedMesh ref={glowRef} args={[undefined, undefined, N]}>
        <boxGeometry args={[ROAD_WIDTH + 0.6, 0.04, 1]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0.35} />
      </instancedMesh>

      {/* Colliders — um RigidBody por circuito, com N CuboidCollider filhos.
          friction 0.4 na laje (era 1.0) — carro DESLIZA fluido, arcade-style.
          Sem isso a Kombi "grudava" ao curvar.
          IMPORTANTE: usa `quaternion`, não `rotation` — o prop `rotation` do
          r3f/rapier interpreta o array em ordem XYZ por padrão, mas
          pitch/angle/roll foram compostos em ordem YXZ (igual o mesh
          visual). Passar o array direto como `rotation` desalinhava
          collider e visual sempre que pitch OU roll não eram zero — era
          isso que travava o carro em rampas/curvas fechadas mesmo com a
          pista parecendo certa. */}
      <RigidBody type="fixed" colliders={false} friction={0.4}>
        {colliderData.map((c, i) => {
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(c.rot[0], c.rot[1], c.rot[2], "YXZ"))
          return (
            <CuboidCollider
              key={i}
              args={[ROAD_WIDTH / 2, ROAD_THICKNESS / 2, c.length / 2]}
              position={c.pos}
              quaternion={[q.x, q.y, q.z, q.w]}
            />
          )
        })}
      </RigidBody>
      <RigidBody type="fixed" colliders={false} friction={0.005} restitution={0.7}>
        {colliderData.map((c, i) => {
          // Rails alinhados com a laje INCLINADA — usa quaternion pra pegar
          // eixos LOCAIS right/up (pitch+roll inclui rampa e banking). Sem
          // isso, em rampas íngremes ou curvas bancadas os rails ficavam
          // soltos no ar/enterrados.
          const q = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(c.rot[0], c.rot[1], c.rot[2], "YXZ")
          )
          const qArr: [number, number, number, number] = [q.x, q.y, q.z, q.w]
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q)
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q)
          const offX = ROAD_WIDTH / 2
          const upOff = RAIL_H / 2
          return (
            <React.Fragment key={i}>
              <CuboidCollider
                args={[0.1, RAIL_H / 2, c.length / 2]}
                position={[
                  c.pos[0] - right.x * offX + up.x * upOff,
                  c.pos[1] - right.y * offX + up.y * upOff,
                  c.pos[2] - right.z * offX + up.z * upOff,
                ]}
                quaternion={qArr}
              />
              <CuboidCollider
                args={[0.1, RAIL_H / 2, c.length / 2]}
                position={[
                  c.pos[0] + right.x * offX + up.x * upOff,
                  c.pos[1] + right.y * offX + up.y * upOff,
                  c.pos[2] + right.z * offX + up.z * upOff,
                ]}
                quaternion={qArr}
              />
            </React.Fragment>
          )
        })}
      </RigidBody>

      {arrows.map((a, i) => (
        <CurveArrow key={`arrow-${i}`} position={a.pos} angle={a.angle} />
      ))}
    </>
  )
}

// ─── PRNG ───────────────────────────────────────────────────────────────────
function makeRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

interface Building {
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  neonColor: string
  neonSide: 0 | 1 | 2 | 3
}

// (NEON e BUILDING_BASE antigos removidos — cores agora vêm dos BAIRROS abaixo)

// BAIRROS — a cidade dividida em 4 quadrantes cardinais + centro, cada um
// com paleta neon dominante. Assim ao dirigir você percebe claramente onde
// está: "distrito rosa" (NE), "distrito ciano" (NW), "distrito amarelo" (SW),
// "distrito verde" (SE), "centro violeta".
interface Bairro {
  id: string
  base: string[]         // cor da fachada dos prédios
  neon: string[]         // paleta de neon (letreiro + rooftop)
}
const BAIRROS: Record<string, Bairro> = {
  NE: { id: "NE", base: ["#1a0020", "#2a0033", "#22001a"], neon: ["#ff2d78", "#ff00ff", "#ff5fae"] },   // rosa/magenta
  NW: { id: "NW", base: ["#001a2a", "#002033", "#00121e"], neon: ["#00ffff", "#00c8ff", "#66eaff"] },   // ciano/azul-elétrico
  SW: { id: "SW", base: ["#2a1a00", "#332000", "#1a1000"], neon: ["#ffcc00", "#ff9500", "#ffee55"] },   // amarelo/laranja
  SE: { id: "SE", base: ["#002a1a", "#003321", "#001a12"], neon: ["#00ff88", "#22ff22", "#88ff00"] },   // verde/lima
  CENTRO: { id: "CENTRO", base: ["#150015", "#25002a", "#0f001f"], neon: ["#cc00ff", "#a855f7", "#ff00cc"] }, // violeta
}
// Retorna o bairro baseado em (x, z). Centro se |x|+|z| < 90.
function bairroDe(x: number, z: number): Bairro {
  if (Math.abs(x) + Math.abs(z) < 90) return BAIRROS.CENTRO
  if (x >= 0 && z <= 0) return BAIRROS.NE
  if (x < 0 && z <= 0) return BAIRROS.NW
  if (x < 0 && z > 0) return BAIRROS.SW
  return BAIRROS.SE
}

// Testa se um ponto (x, z) está a menos de `margin` unidades de qualquer
// segmento discretizado de qualquer circuito — usado pra impedir prédios
// sobre as estradas. Exportada pra outros componentes (VoxelCity) usarem.
export function computeAllRoadPoints(): [number, number][] {
  const out: [number, number][] = []
  for (const c of Object.values(CIRCUITS)) {
    const closed = "closed" in c ? c.closed : true
    const curve = new THREE.CatmullRomCurve3(c.points as THREE.Vector3[], closed, "chordal", 0.3)
    const disc = curve.getPoints(SEGMENT_DIVISIONS)
    for (const p of disc) out.push([p.x, p.z])
  }
  return out
}

// Interface interna do circuito renderizável (após normalização do editor)
interface RenderCircuit {
  id: string
  color: string
  points: THREE.Vector3[]
  closed?: boolean
}

// ─── Componente principal ───────────────────────────────────────────────────
export interface CyberpunkCityProps {
  seed?: number
}

export function CyberpunkCity({ seed = 42 }: CyberpunkCityProps) {
  // Lê circuitos do /pistas-editor via localStorage. Se não houver, usa
  // os DEFAULTS (magenta/cyan/yellow hardcoded).
  const edited = useEditedCircuits()
  const renderCircuits: RenderCircuit[] = useMemo(() => {
    // Rampas SEMPRE vêm dos defaults hardcoded (o editor só cobre as 3 pistas
    // circulares principais). Sem isso, editar magenta/cyan/yellow no
    // /pistas-editor apagaria as rampas de conexão entre patamares.
    const rampas: RenderCircuit[] = Object.entries(CIRCUITS)
      .filter(([, c]) => "closed" in c && c.closed === false)
      .map(([id, c]) => ({
        id: `ramp-${id}`,
        color: c.color,
        points: c.points as THREE.Vector3[],
        closed: false,
      }))

    if (edited) {
      const editedRender = edited.map((c) => ({
        id: c.id,
        color: c.color,
        points: c.points.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      }))
      return [...editedRender, ...rampas]
    }
    const defaults = Object.entries(CIRCUITS)
      .filter(([, c]) => !("closed" in c) || c.closed !== false)
      .map(([id, c]) => ({
        id,
        color: c.color,
        points: c.points as THREE.Vector3[],
        closed: true,
      }))
    return [...defaults, ...rampas]
  }, [edited])

  // Recalcula pontos de estrada com base nos circuitos ATUAIS (editados)
  const roadPoints = useMemo(() => {
    const out: [number, number][] = []
    for (const c of renderCircuits) {
      if (c.points.length < 2) continue
      const curve = new THREE.CatmullRomCurve3(c.points, c.closed !== false, "chordal", 0.3)
      const disc = curve.getPoints(SEGMENT_DIVISIONS)
      for (const p of disc) out.push([p.x, p.z])
    }
    return out
  }, [renderCircuits])
  const buildings = useMemo(() => {
    const rand = makeRand(seed)
    const list: Building[] = []
    const MARGIN = ROAD_WIDTH / 2 + 20
    const MARGIN_SQ = MARGIN * MARGIN
    // Grid EXPANDIDO pra cobrir cidade até os limites das pistas gigantes.
    // RANGE 14 * CELL 26 = 364u de raio; deserto começa em 360.
    const CELL = 26
    const RANGE = 14
    for (let gx = -RANGE; gx <= RANGE; gx++) {
      for (let gz = -RANGE; gz <= RANGE; gz++) {
        const bx = gx * CELL + (rand() - 0.5) * 8
        const bz = gz * CELL + (rand() - 0.5) * 8
        let tooClose = false
        for (const [rx, rz] of roadPoints) {
          const dx = bx - rx
          const dz = bz - rz
          if (dx * dx + dz * dz < MARGIN_SQ) {
            tooClose = true
            break
          }
        }
        if (tooClose) continue
        const w = 3 + rand() * 5
        const d = 3 + rand() * 5
        const h = 8 + rand() * 42
        // Cor pela paleta do bairro — dominante em ~75% dos prédios; ~25%
        // pega cor de OUTRO bairro (variação, evita monotonia sem quebrar
        // a leitura do distrito).
        const localBairro = bairroDe(bx, bz)
        const useForeign = rand() < 0.25
        const bairro = useForeign
          ? Object.values(BAIRROS)[Math.floor(rand() * 5)]
          : localBairro
        const color = bairro.base[Math.floor(rand() * bairro.base.length)]
        const neonColor = bairro.neon[Math.floor(rand() * bairro.neon.length)]
        const neonSide = Math.floor(rand() * 4) as 0 | 1 | 2 | 3
        list.push({ x: bx, z: bz, w, d, h, color, neonColor, neonSide })
      }
    }
    return list
  }, [seed, roadPoints])

  return (
    <group>
      {/* Chão base */}
      <RigidBody type="fixed" colliders={false} friction={0.9}>
        <CuboidCollider args={[500, 0.1, 500]} position={[0, -0.1, 0]} />
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} >
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#050510" roughness={0.9} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Circuitos em splines — usa dados do editor (localStorage) ou defaults */}
      {renderCircuits.map((c) => (
        <Circuit key={c.id} color={c.color} points={c.points} closed={c.closed} />
      ))}

      {/* Prédios — colliders em chunks + InstancedMesh */}
      <BuildingChunks buildings={buildings} />
    </group>
  )
}

// Renderiza todos os prédios como 3 InstancedMesh globais (box, sign, rooftop)
// e agrupa colliders em ~16 RigidBody (chunks 4×4 na grid -16..16).
function BuildingChunks({ buildings }: { buildings: Building[] }) {
  const boxRef = useRef<THREE.InstancedMesh>(null)
  const signRef = useRef<THREE.InstancedMesh>(null)
  const roofRef = useRef<THREE.InstancedMesh>(null)

  const chunks = useMemo(() => {
    // 4×4 chunks cobrindo grid -16..16 (chunk size = 8 células = ~128 unidades)
    const map = new Map<string, Building[]>()
    for (const b of buildings) {
      const cx = Math.floor(b.x / 128)
      const cz = Math.floor(b.z / 128)
      const key = `${cx},${cz}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return Array.from(map.values())
  }, [buildings])

  useLayoutEffect(() => {
    if (!boxRef.current || !signRef.current || !roofRef.current) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const p = new THREE.Vector3()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    const SIGN_ROT_Y = [0, Math.PI / 2, Math.PI, -Math.PI / 2]

    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i]
      // Box
      p.set(b.x, b.h / 2, b.z)
      q.identity()
      s.set(b.w, b.h, b.d)
      m.compose(p, q, s)
      boxRef.current.setMatrixAt(i, m)
      c.set(b.color)
      boxRef.current.setColorAt(i, c)

      // Sign (posição relativa ao prédio + rotação por lado)
      const eps = 0.02
      const rotY = SIGN_ROT_Y[b.neonSide]
      const half = [b.d / 2 + eps, b.w / 2 + eps, b.d / 2 + eps, b.w / 2 + eps][b.neonSide]
      const cos = Math.cos(rotY)
      const sin = Math.sin(rotY)
      p.set(b.x + sin * half, b.h / 2 + 0.05, b.z + cos * half)
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
      s.set(b.w * 0.55, b.h * 0.35, 1)
      m.compose(p, q, s)
      signRef.current.setMatrixAt(i, m)
      c.set(b.neonColor)
      signRef.current.setColorAt(i, c)

      // Rooftop neon
      p.set(b.x, b.h + 0.05, b.z)
      q.identity()
      s.set(b.w + 0.1, 0.06, b.d + 0.1)
      m.compose(p, q, s)
      roofRef.current.setMatrixAt(i, m)
      roofRef.current.setColorAt(i, c)
    }
    boxRef.current.instanceMatrix.needsUpdate = true
    signRef.current.instanceMatrix.needsUpdate = true
    roofRef.current.instanceMatrix.needsUpdate = true
    if (boxRef.current.instanceColor) boxRef.current.instanceColor.needsUpdate = true
    if (signRef.current.instanceColor) signRef.current.instanceColor.needsUpdate = true
    if (roofRef.current.instanceColor) roofRef.current.instanceColor.needsUpdate = true
  }, [buildings])

  return (
    <>
      <instancedMesh ref={boxRef} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.7} metalness={0.3} />
      </instancedMesh>
      <instancedMesh ref={signRef} args={[undefined, undefined, buildings.length]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={roofRef} args={[undefined, undefined, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.55} />
      </instancedMesh>

      {chunks.map((chunk, ci) => (
        <RigidBody key={ci} type="fixed" colliders={false} friction={0.4}>
          {chunk.map((b, i) => (
            <CuboidCollider
              key={i}
              args={[b.w / 2, b.h / 2, b.d / 2]}
              position={[b.x, b.h / 2, b.z]}
            />
          ))}
        </RigidBody>
      ))}
    </>
  )
}

// ─── Helpers exportados pra spawn ───────────────────────────────────────────
export interface SpawnPose {
  position: [number, number, number]
  /** Rotação Y (yaw) pronta pra jogar no prop `rotation` do RigidBody — já
   * alinhada pra o FORWARD local do carro (-Z, ver VanBody) apontar na
   * direção real da pista ali, não um valor fixo arbitrário. */
  rotation: [number, number, number]
}

// Yaw que faz o forward local do carro (-Z) apontar na direção da pista
// no ponto `idx` de `pts` (olhando pro próximo ponto). Ver derivação: pra
// rotação Y padrão do three.js, local (0,0,-1) vira mundo
// (-sinθ,0,-cosθ) — pra isso bater com a tangente (dx,dz), θ = atan2(-dx,-dz).
function tangentYawAt(pts: THREE.Vector3[], idx: number, closed: boolean): number {
  const n = pts.length
  const nextIdx = closed ? (idx + 1) % n : Math.min(idx + 1, n - 1)
  const a = pts[idx]
  const b = pts[nextIdx]
  const dx = b.x - a.x
  const dz = b.z - a.z
  return Math.atan2(-dx, -dz)
}

/** Retorna posição + rotação seguras na estrada magenta pra spawnar o carro. */
export function magentaSpawn(): SpawnPose {
  // Primeiro ponto do traçado magenta já smoothado/posicionado — sempre em
  // cima da pista de verdade, independente de onde ela esteja na cidade.
  const p = magentaPts[0]
  return {
    position: [p.x, p.y + 1.5, p.z],
    rotation: [0, tangentYawAt(magentaPts, 0, true), 0],
  }
}

/**
 * Ponto + orientação mais próximos de (x,z) em QUALQUER uma das 3 pistas —
 * pra respawn de recuperação (carro caiu/travou) não jogar o jogador de
 * volta pro início fixo da Mônaco toda vez (quebra o fluxo se ele tava
 * dirigindo longe dali, num andar diferente) NEM virado pro lado errado
 * (o carro saía direto da pista de novo, mesmo com a posição certa — a
 * rotação de spawn tem que acompanhar a direção real da pista ali).
 * Sempre em cima da pista de verdade (nunca no chão) porque só busca
 * entre pontos que já são parte de um traçado.
 */
export function nearestTrackSpawn(x: number, z: number): SpawnPose {
  let bestPts: THREE.Vector3[] = magentaPts
  let bestIdx = 0
  let bestDist = Infinity
  for (const pts of [magentaPts, cyanPts, yellowPts]) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const d = (p.x - x) ** 2 + (p.z - z) ** 2
      if (d < bestDist) {
        bestDist = d
        bestPts = pts
        bestIdx = i
      }
    }
  }
  const best = bestPts[bestIdx]
  return {
    position: [best.x, best.y + 1.5, best.z],
    rotation: [0, tangentYawAt(bestPts, bestIdx, true), 0],
  }
}
