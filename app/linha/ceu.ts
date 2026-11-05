// O céu na hora do jogo (relogio.ts): as cores, o sol e a lua. Usado pela
// estrada (Corrida) e pela cidade nova (/cidade).

import * as THREE from "three"

// O CÉU NA HORA (06/10, LU2CA): o jogo começa no fim de tarde (18 h, o tom
// de sempre) e vai escurecendo até a noite funda, amanhece e vira dia.
// [hora, topo, meio, tinta do horizonte, noite (estrelas/lua/sódio), luz]
type ChaveCeu = [number, [number, number, number], [number, number, number], number, number, number]
// a referência do dia passando é o Red Dead Redemption 2 (LU2CA, 14/10):
// madrugada roxa, nascer laranja, dia azul, uma hora dourada comprida no fim
// da tarde, o pôr do sol vermelho e a hora azul antes da noite
const CEU_HORAS: ChaveCeu[] = [
  [0, [0.006, 0.007, 0.025], [0.02, 0.028, 0.09], 0.6, 1, 0.75],
  [4.5, [0.006, 0.007, 0.025], [0.02, 0.028, 0.09], 0.6, 1, 0.75],
  [5.5, [0.04, 0.05, 0.14], [0.35, 0.2, 0.3], 1.6, 0.7, 0.85],
  [6.5, [0.14, 0.22, 0.45], [0.95, 0.55, 0.35], 2.4, 0.2, 1.3],
  [8, [0.16, 0.32, 0.62], [0.5, 0.62, 0.8], 1.6, 0, 1.8],
  [15.5, [0.16, 0.32, 0.62], [0.5, 0.62, 0.8], 1.6, 0, 1.8],
  [17, [0.14, 0.24, 0.5], [0.85, 0.55, 0.35], 2, 0.1, 1.55],
  [18.2, [0.07, 0.08, 0.24], [0.9, 0.38, 0.25], 2.4, 0.45, 1.15],
  [19.2, [0.012, 0.014, 0.05], [0.06, 0.07, 0.2], 1, 1, 0.9],
  [21, [0.006, 0.007, 0.025], [0.02, 0.028, 0.09], 0.6, 1, 0.75],
  [24, [0.006, 0.007, 0.025], [0.02, 0.028, 0.09], 0.6, 1, 0.75],
]
// onde estão o sol e a lua: o sol nasce no leste às 6h, passa alto ao meio-dia
// e se põe no oeste às 18h; a lua faz o caminho oposto
export function astros(h: number, sol: THREE.Vector3, lua: THREE.Vector3) {
  const a = ((h - 6) / 12) * Math.PI
  sol.set(Math.cos(a) * 0.9, Math.sin(a) * 0.85, -0.42).normalize()
  lua.set(-Math.cos(a) * 0.8, Math.max(0.12, -Math.sin(a) * 0.75), -0.6).normalize()
}
// (revisão 2) chamado todo quadro por 2–3 quem (o Corrida, as ruínas, Sabe Ontem?):
// devolve SEMPRE o mesmo objeto, reescrito (nada alocado). Leia na hora; não guarde
const SAIDA_CEU = { topo: [0, 0, 0], meio: [0, 0, 0], tinta: 0, noite: 0, luz: 0 }
export function ceuNaHora(h: number): Readonly<typeof SAIDA_CEU> {
  let k = 0
  while (k < CEU_HORAS.length - 2 && h >= CEU_HORAS[k + 1][0]) k++
  const a = CEU_HORAS[k], b = CEU_HORAS[k + 1]
  const t = Math.min(1, Math.max(0, (h - a[0]) / (b[0] - a[0])))
  const o = SAIDA_CEU
  for (let i = 0; i < 3; i++) { o.topo[i] = a[1][i] + (b[1][i] - a[1][i]) * t; o.meio[i] = a[2][i] + (b[2][i] - a[2][i]) * t }
  o.tinta = a[3] + (b[3] - a[3]) * t; o.noite = a[4] + (b[4] - a[4]) * t; o.luz = a[5] + (b[5] - a[5]) * t
  return o
}

