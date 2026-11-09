"use client"

// O ALOHAN NO GINÁSIO (bíblia §11; o dono, 09/11: "em toda visita ele vai junto de
// verdade"). O mesmo corpo com que ele aparece nas salas (Npc, interior/comum), a cor
// dele (a da estação "ontem"), em pé do lado do jogo. Mora nos três esportes: assim vale
// por qualquer porta (o ginásio do subúrbio, a da cidade, a quadra, a missão).
// Só baixa quando o esporte abre e, se falhar, o jogo segue sem ele.

import { Npc, type V3 } from "../linha/interior/comum"
import { ModeloSeguro } from "../linha/estrada/Seguro"

const COR_ALOHAN = "#ffc857"

export function AlohanJunto({ pos, vira = 0 }: { pos: V3; vira?: number }) {
  return (
    <ModeloSeguro nome="alohan-ginasio" reserva={null}>
      <Npc cor={COR_ALOHAN} pos={pos} vira={vira} />
    </ModeloSeguro>
  )
}
