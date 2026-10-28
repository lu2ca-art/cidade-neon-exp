// A RECOMPENSA DA PORTA (T30, 28/10). Um lugar só onde a porta de uma missão
// paga tudo o que ela dá:
//
//   a grana        neon$ pra loja de discos (e o resto da loja): economia.ts `ganhar`,
//                  valor em economia-rascunho.ts (PAGA.missao), lido por portas.ts
//   a faixa        liberada no Guitar Driver (os palcos do T20: palcos.ts `menuDo`
//                  lê `musicasDoGuitar`, que lê `h.guitar`)
//   a referência   a faixa de referência no B4TIDA (`h.batida`; o estúdio lista em
//                  `referenciasDoBatida`)
//   a pista        a música da pista passa de prévia/instrumental pra versão
//                  subúrbio (T31, pistasLiberadas.ts, lê `feitas13`)
//   as portas      o que a missão abre (portas.ts `abrirPorta`)
//
// A tabela de quem dá o quê continua sendo a de portas.ts (MISSOES13[].recompensa),
// pro dono ter um lugar só pra mudar. Aqui só se aplica, uma vez por missão.

import type { Save } from "../estado"
import { ganhar } from "../economia"
import { PISTAS } from "../estrada/pistas"
import type { EstacaoId } from "../data"
import { comHistoria, historiaDe } from "./historia"
import { MISSOES13, abrirPorta, feita13, recompensaDe, sincronizar, type MissaoId, type Recompensa13 } from "./portas"

/** a porta abriu: devolve o save com TUDO que a missão dá, e o que mostrar na tela. Duas vezes não paga duas vezes */
export function aplicarRecompensa(s: Save, id: MissaoId, emCarreira = historiaDe(s).fase === "carreira"): { save: Save; recompensa: Recompensa13 | null } {
  if (feita13(historiaDe(s), id)) return { save: s, recompensa: null }
  const m = MISSOES13[id]
  const r = recompensaDe(id)
  // a missão da cidade acende a pista dela pra sempre (o objeto da faixa: as torres)
  const faixaNaCidade = m.faixa && (m.onde === "cidade" || emCarreira) ? (m.faixa as EstacaoId) : null
  const comGrana = ganhar(s, r.neon)
  const save = comHistoria(
    { ...comGrana, objetos: faixaNaCidade && !s.objetos.includes(faixaNaCidade) ? [...s.objetos, faixaNaCidade] : s.objetos, violao: m.abre.includes("violao") ? true : s.violao },
    (h) => abrirPorta(sincronizar(h, s.objetos), id),
  )
  return { save, recompensa: r }
}

// ── o B4TIDA: as referências liberadas ──
export interface ReferenciaBatida { id: string; nome: string; quem: string; bpm: number; src: string; cor: string }
/** as faixas de referência que as missões liberaram, pro estúdio tocar (o instrumental da faixa) */
export function referenciasDoBatida(batida: readonly string[] | undefined): ReferenciaBatida[] {
  const tem = new Set(batida ?? [])
  return PISTAS.filter((p) => tem.has(p.id)).map((p) => {
    const dona = Object.values(MISSOES13).find((m) => m.faixa === p.id)
    return { id: p.id, nome: p.faixa, quem: p.personagem, bpm: p.bpm, src: p.inst, cor: dona?.cor ?? "#ffc857" }
  })
}
