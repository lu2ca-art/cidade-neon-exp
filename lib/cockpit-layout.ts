// Layout do cockpit — vem direto do /cockpit-editor (LU2CA aprova visualmente
// cada peça). Não editar coord aqui à mão; se precisar mudar, mexe no editor
// e exporta o JSON de novo.
//
// Convenção: chaves em kebab-case = "nome" da peça no editor (não o id, que
// pode divergir do nome — ex.: id "batida" tem nome "toca discos", e vice-versa).
// Sempre use o NOME como fonte-verdade.

export type Vec3 = readonly [number, number, number]

export interface CockpitPart {
  position: Vec3
  rotation: Vec3
  size: Vec3
  color: string
}

export const COCKPIT_LAYOUT = {
  camera: {
    // No editor LU2CA posicionou em Z=2.55 (visualização perfeita da cena
    // inteira, externa). Em runtime alinhamos com os bancos (Z=1.5) pra
    // ser POV motorista real — bancos ficam invisíveis (atrás da câmera)
    // e o enquadramento do painel/volante que ele aprovou fica intacto.
    position: [0, 1, 1.5] as Vec3,
    rotation: [0.1, 0, 0] as Vec3,
  },
  parabrisa: {
    position: [0, 1, -1.3] as Vec3,
    rotation: [0.1, 0, 0] as Vec3,
    size: [1.71, 0.9, 0.02] as Vec3,
    color: "#7a1d99",
  },
  painel: {
    position: [0, 0.6, -0.8] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.4, 0.25, 0.3] as Vec3,
    color: "#000099",
  },
  volante: {
    position: [-0.4, 0.7, -0.4] as Vec3,
    rotation: [-0.2, 0, 0] as Vec3,
    size: [0.31, 0.26, 0.05] as Vec3,
    color: "#d40217",
  },
  retrovisor: {
    position: [0, 1.3, -0.85] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.22, 0.06, 0.03] as Vec3,
    color: "#4c1a8a",
  },
  // display consolidado: rádio + app do hub + mapa
  radioHub: {
    position: [0.2, 0.8, -0.75] as Vec3,
    rotation: [-0.2, 0, 0] as Vec3,
    size: [0.61, 0.26, 0.02] as Vec3,
    color: "#00e5ff",
  },
  // Toca-discos reposicionado — antes ficava DEITADO no chão do carro
  // (fora do campo de visão do motorista). Agora fica EM PÉ no painel à
  // esquerda do rádio, altura do braço, visível pro motorista clicar.
  tocaDiscos: {
    position: [-0.55, 0.72, -0.55] as Vec3,
    rotation: [0, 0.3, 0] as Vec3,
    size: [0.28, 0.06, 0.28] as Vec3,
    color: "#ff6b6b",
  },
  // id "toca-discos" → nome "batida (mpc pads coloridos no ritmo da musica)"
  padsMPC: {
    position: [0.45, 0.4, -0.45] as Vec3,
    rotation: [0.2, 0, 0] as Vec3,
    size: [0.41, 0.11, 0.36] as Vec3,
    color: "#ffcc00",
  },
  // Bancos deslocados pra frente (Z de 1.5 → 1.0) — motorista senta mais
  // próximo do painel/volante, e sobra espaço atrás pro fundo da van.
  bancoMotorista: {
    position: [-0.35, 0.15, 1.0] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.46, 0.16, 0.5] as Vec3,
    color: "#05ad19",
  },
  bancoPassageira: {
    position: [0.35, 0.15, 1.0] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.46, 0.16, 0.5] as Vec3,
    color: "#1d910d",
  },
  // Teto panorâmico — vidro escuro semi-transparente sobre todo o interior,
  // deixa ver as estrelas/luzes de cima. Y=1.5 = altura do teto do cockpit.
  tetoPanoramico: {
    position: [0, 1.5, -0.2] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.4, 0.02, 2.2] as Vec3,
    color: "#0a0518",
  },
  // Janelas laterais — planos transparentes cyan nas portas, deixam ver a
  // cidade ao lado enquanto dirige.
  janelaEsquerda: {
    position: [-0.75, 0.75, 0.4] as Vec3,
    rotation: [0, Math.PI / 2, 0] as Vec3,
    size: [1.8, 0.55, 0.02] as Vec3,
    color: "#00eeff",
  },
  janelaDireita: {
    position: [0.75, 0.75, 0.2] as Vec3,
    rotation: [0, -Math.PI / 2, 0] as Vec3,
    size: [2.4, 0.55, 0.02] as Vec3,
    color: "#00aaff",
  },
  // pequeno display do velocímetro + rpm em cima do volante
  velocRpm: {
    position: [-0.4, 0.8, -0.7] as Vec3,
    rotation: [-0.15, 0, 0] as Vec3,
    size: [0.21, 0.16, 0.06] as Vec3,
    color: "#ffffff",
  },
  portaEsquerda: {
    position: [-0.75, 0.25, 0.4] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.01, 0.46, 2.26] as Vec3,
    color: "#00eeff",
  },
  portaDireita: {
    position: [0.75, 0.25, 0] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.01, 0.46, 3.01] as Vec3,
    color: "#00aaff",
  },
  piso: {
    position: [0, 0, 0.4] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [1.51, 0.01, 2.26] as Vec3,
    color: "#00ad99",
  },
  cambio: {
    position: [0, 0.2, -0.3] as Vec3,
    rotation: [0, 0, 0] as Vec3,
    size: [0.3, 0.3, 0.3] as Vec3,
    color: "#00aaff",
  },
} as const
