// Layout da Kombi — interior + exterior. Fonte-única, editada pelo /kombi-editor
// e exportada por LU2CA. Não editar a mão aqui; sempre mexer no editor e
// exportar de novo.
//
// Convenção: chaves em kebab-case = id da peça no editor.

export type Vec3 = readonly [number, number, number]

export interface KombiPart {
  position: Vec3
  rotation: Vec3
  size: Vec3
  color: string
}

export const KOMBI_LAYOUT = {
  // ── Câmera (POV motorista) ──
  cameraMotorista: {
    // POV motorista real — recuada pra ver volante + painel + rádio no frame
    // (antes Z=-0.5 Y=1.15 mostrava só teto/céu no mobile). Z=0.25 põe a
    // câmera no meio do banco do motorista, Y=0.95 na altura dos olhos
    // sentado. Volante fica no terço inferior; rádio no centro do frame.
    position: [-0.4, 0.95, 0.25] as Vec3,
    rotation: [0.05, 0, 0] as Vec3,
    size: [0.12, 0.12, 0.12] as Vec3,
    color: "#ffffff",
  },

  // ── EXTERIOR ──
  carroceria: {
    position: [0, 0.8, 0.25] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.76, 1.4, 3.11] as Vec3,
    color: "#7fb2d4",
  },
  capoDianteiro: {
    position: [0, 0.35, -1.4] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.61, 0.66, 0.11] as Vec3,
    color: "#7fb2d4",
  },
  paraChoqueFrente: {
    position: [0, 0.28, -1.45] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.7, 0.15, 0.1] as Vec3,
    color: "#c0c0c8",
  },
  paraChoqueTras: {
    position: [0, 0.28, 1.8] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.7, 0.15, 0.06] as Vec3,
    color: "#c0c0c8",
  },
  farolEsq: {
    position: [-0.55, 0.6, -1.47] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.22, 0.22, 0.03] as Vec3,
    color: "#fff8c0",
  },
  farolDir: {
    position: [0.55, 0.6, -1.47] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.22, 0.22, 0.03] as Vec3,
    color: "#fff8c0",
  },
  lanternaEsq: {
    position: [-0.55, 0.7, 1.8] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.22, 0.14, 0.03] as Vec3,
    color: "#ff6b35",
  },
  lanternaDir: {
    position: [0.55, 0.7, 1.8] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.22, 0.14, 0.03] as Vec3,
    color: "#ff6b35",
  },
  emblemaFrontal: {
    position: [0, 0.55, -1.47] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.18, 0.18, 0.02] as Vec3,
    color: "#ffcc00",
  },
  rodaFrenteEsq: {
    position: [-0.95, 0.25, -1.15] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.15, 0.5, 0.5] as Vec3,
    color: "#0a0a0a",
  },
  rodaFrenteDir: {
    position: [0.95, 0.25, -1.15] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.15, 0.5, 0.5] as Vec3,
    color: "#0a0a0a",
  },
  rodaTrasEsq: {
    position: [-0.95, 0.25, 1.15] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.15, 0.5, 0.5] as Vec3,
    color: "#0a0a0a",
  },
  rodaTrasDir: {
    position: [0.95, 0.25, 1.15] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.15, 0.5, 0.5] as Vec3,
    color: "#0a0a0a",
  },
  tetoExterno: {
    position: [0, 1.45, 0.4] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.65, 0.05, 3.2] as Vec3,
    color: "#e8e8f0",
  },
  faixaHippie: {
    position: [0, 0.2, 0.2] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.71, 0.15, 3.36] as Vec3,
    color: "#ff5fae",
  },

  // ── INTERIOR ──
  parabrisa: {
    position: [0, 1.1, -1.35] as Vec3,
    rotation: [0.1, 0, 0] as Vec3,
    size: [1.51, 0.56, 0.02] as Vec3,
    color: "#88ddff",
  },
  vidroTras: {
    position: [0, 1.1, 1.8] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.6, 0.46, 0.02] as Vec3,
    color: "#88ddff",
  },
  janelaEsq: {
    position: [-0.9, 1.05, 0.25] as Vec3,
    rotation: [0, 1.5708, 0] as Vec3,
    size: [2.86, 0.46, 0.02] as Vec3,
    color: "#88ddff",
  },
  janelaDir: {
    position: [0.9, 1.05, 0.25] as Vec3,
    rotation: [0, -1.5708, 0] as Vec3,
    size: [2.86, 0.46, 0.02] as Vec3,
    color: "#88ddff",
  },
  portaDir: {
    position: [0.87, 0.55, -0.4] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.03, 0.75, 1.0] as Vec3,
    color: "#5a9ac0",
  },
  painel: {
    position: [0, 0.75, -0.95] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.51, 0.06, 0.16] as Vec3,
    color: "#c9a97a",
  },
  volante: {
    position: [-0.42, 0.85, -0.85] as Vec3,
    rotation: [-0.25, 0, 0] as Vec3,
    size: [0.42, 0.4, 0.05] as Vec3,
    color: "#e8e8f0",
  },
  cambio: {
    position: [0, 0.5, -1] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.06, 0.21, 0.08] as Vec3,
    color: "#3a2410",
  },
  // Posições editadas por LU2CA no /kombi-editor (2026-08-25).
  radio: {
    position: [0.05, 0.75, -0.82] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.28, 0.06, 0.04] as Vec3,
    color: "#3a2410",
  },
  tocaDiscos: {
    position: [0.45, 0.83, -0.92] as Vec3,
    rotation: [0, 0.15, 0] as Vec3,
    size: [0.31, 0.06, 0.16] as Vec3,
    color: "#3a2410",
  },
  padsMPC: {
    position: [0.7, 0.72, -0.65] as Vec3,
    rotation: [0.1, 0, 0] as Vec3,
    size: [0.3, 0.06, 0.3] as Vec3,
    color: "#ffcc00",
  },
  pedestalMPC: {
    position: [0.6, 0.485, -0.65] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.04, 0.45, 0.04] as Vec3,
    color: "#2a1f10",
  },
  retrovisor: {
    position: [0, 1.28, -1.05] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.24, 0.08, 0.04] as Vec3,
    color: "#8a6a3a",
  },
  bancoMotorista: {
    position: [-0.25, 0.4, -0.05] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.11, 0.36, 0.55] as Vec3,
    color: "#4a2510",
  },
  bancoPassageira: {
    position: [0.55, 0.4, -0.05] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.55, 0.36, 0.55] as Vec3,
    color: "#4a2510",
  },
  pisoInterno: {
    position: [0, 0.25, 0.4] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.55, 0.02, 3.0] as Vec3,
    color: "#2a1f10",
  },
  cortinaEsq: {
    position: [-0.86, 1.15, 0.5] as Vec3,
    rotation: [0, 1.5708, 0] as Vec3,
    size: [1.6, 0.3, 0.005] as Vec3,
    color: "#ff5fae",
  },
  cortinaDir: {
    position: [0.86, 1.15, 0.5] as Vec3,
    rotation: [0, -1.5708, 0] as Vec3,
    size: [1.6, 0.3, 0.005] as Vec3,
    color: "#a855f7",
  },
  guirlandaFrente: {
    position: [0, 1.42, -1.0] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.5, 0.03, 0.03] as Vec3,
    color: "#00ffff",
  },
  guirlandaTras: {
    position: [0, 1.42, 1.85] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.5, 0.03, 0.03] as Vec3,
    color: "#ff00ff",
  },
  portaLuvas: {
    position: [0.2, 0.48, -0.95] as Vec3,
    rotation: [0, -0.3, 0] as Vec3,
    size: [0.4, 0.4, 0.28] as Vec3,
    color: "#5a3010",
  },
} as const

// Bounding box da Kombi (baseado na carroceria) — usado pro Rapier
// CuboidCollider do RigidBody. Half-extents.
export const KOMBI_COLLIDER_HALF: Vec3 = [
  KOMBI_LAYOUT.carroceria.size[0] / 2,
  KOMBI_LAYOUT.carroceria.size[1] / 2 + 0.2, // teto + roda considerados
  KOMBI_LAYOUT.carroceria.size[2] / 2 + 0.3, // capô + para-choque
]
