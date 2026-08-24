// Circuitos das estradas da Cidade Neon.
// Fonte-única: cada circuito é uma lista de pontos-chave (X, Y, Z) em unidades
// de mundo. Y varia pra dar sensação de montanha russa (subidas/descidas).
// Também define saídas — pontos ao longo da spline onde o guard rail é
// interrompido pra dar acesso a áreas externas (desertos, atalhos).
//
// Editar aqui = editar as estradas. Reload da /drive-v2 pega automaticamente.

import * as THREE from "three"

export interface Circuit {
  id: string
  color: string
  points: THREE.Vector3[]
  // Índice dos pontos (em `points`) onde deve haver uma saída (gap no rail
  // + placa de PERIGO). Se vazio, circuito é fechado.
  exits?: number[]
}

// ─── MAGENTA — perímetro externo grande ─────────────────────────────────────
// Percurso longo (~120u de raio), variação Y suave 2→5, ~14 pontos-chave.
export const MAGENTA_CIRCUIT: Circuit = {
  id: "magenta",
  color: "#ff00ff",
  points: [
    new THREE.Vector3(120, 2, 0),
    new THREE.Vector3(115, 3, 45),
    new THREE.Vector3(85, 4, 90),
    new THREE.Vector3(30, 3, 120),
    new THREE.Vector3(-30, 2, 115),
    new THREE.Vector3(-85, 3, 90),
    new THREE.Vector3(-115, 4, 45),
    new THREE.Vector3(-125, 5, -10),
    new THREE.Vector3(-115, 4, -60),
    new THREE.Vector3(-80, 3, -105),
    new THREE.Vector3(-25, 2, -125),
    new THREE.Vector3(30, 3, -115),
    new THREE.Vector3(80, 4, -85),
    new THREE.Vector3(115, 3, -40),
  ],
  exits: [3, 10], // 2 saídas: uma no norte, outra no sul
}

// ─── CYAN — circuito médio, altura variável 3→7 ─────────────────────────────
export const CYAN_CIRCUIT: Circuit = {
  id: "cyan",
  color: "#00ffff",
  points: [
    new THREE.Vector3(70, 3, 0),
    new THREE.Vector3(60, 5, 40),
    new THREE.Vector3(25, 7, 65),
    new THREE.Vector3(-25, 6, 60),
    new THREE.Vector3(-60, 4, 40),
    new THREE.Vector3(-75, 3, 0),
    new THREE.Vector3(-60, 4, -40),
    new THREE.Vector3(-25, 6, -65),
    new THREE.Vector3(25, 7, -60),
    new THREE.Vector3(60, 5, -40),
  ],
  exits: [4], // 1 saída no oeste
}

// ─── AMARELO — figura em oito no centro ─────────────────────────────────────
export const YELLOW_CIRCUIT: Circuit = {
  id: "yellow",
  color: "#ffcc00",
  points: [
    new THREE.Vector3(45, 2, 15),
    new THREE.Vector3(25, 3, 30),
    new THREE.Vector3(-5, 4, 15),
    new THREE.Vector3(-25, 3, -5),
    new THREE.Vector3(-45, 2, -15),
    new THREE.Vector3(-25, 3, -30),
    new THREE.Vector3(5, 4, -15),
    new THREE.Vector3(25, 3, 5),
  ],
  exits: [],
}

export const ALL_CIRCUITS = [MAGENTA_CIRCUIT, CYAN_CIRCUIT, YELLOW_CIRCUIT]
