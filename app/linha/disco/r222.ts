// A 222FM (25–26/11, o dono; LU2CA/projetos/cidade-neon/radio/radios.md).
// "Subúrbio Xenom virou a 222FM, que toca as músicas do LU2CA e as brisas que eu
// quiser colocar." Cada música que entra é sorteada por CATEGORIA, cada uma com a
// sua chance. Por enquanto (26/11) só as 9 músicas do Cidade Neon: as categorias
// sem faixa ficam de fora e a chance delas se divide entre as que têm.
//
// Só regra (sem áudio): quem toca é a rádio (disco/radios.ts).

import { PISTAS, type PistaId } from "../estrada/pistas"

export type Categoria222 =
  | "inst" // instrumentais do Cidade Neon Vol. 1
  | "previa" // prévias do álbum (22 s); o locutor anuncia
  | "xenom" // faixas do Subúrbio Xenom
  | "dominio" // domínio público (22 s)
  | "feat" // feats
  | "vol2" // snippets do Vol. 2
  | "inedita" // inéditas e guias (se as pessoas deixarem)

/** a chance de cada categoria (aprovada pelo dono em 25/11) */
export const CHANCES_222: Record<Categoria222, number> = {
  inst: 35, previa: 25, xenom: 15, dominio: 10, feat: 7, vol2: 5, inedita: 3,
}

export interface Faixa222 { titulo: string; src: string; pista?: PistaId; cat: Categoria222 }

const saiu = (lancamento: string | null, agora: number) => !lancamento || new Date(lancamento).getTime() <= agora

/** o repertório de cada categoria agora. As vazias ficam fora do sorteio */
export function repertorio222(agora = Date.now()): Record<Categoria222, Faixa222[]> {
  return {
    inst: PISTAS.map((p) => ({ titulo: `${p.faixa} · inst`, src: p.inst, pista: p.id, cat: "inst" as const })),
    // a prévia só depois do lançamento: o locutor diz que ela já está disponível
    previa: PISTAS.filter((p) => saiu(p.lancamento, agora)).map((p) => ({ titulo: p.faixa, src: `/audio/previews/${p.id}.mp3`, pista: p.id, cat: "previa" as const })),
    // ainda sem material (26/11: "por enquanto só as 9 músicas do cidade neon")
    xenom: [], dominio: [], feat: [], vol2: [], inedita: [],
  }
}

/** sorteia a categoria pela chance, só entre as que têm faixa. `r` em [0, 1) */
export function sortearCategoria(rep: Record<Categoria222, Faixa222[]>, r = Math.random()): Categoria222 | null {
  const cats = (Object.keys(CHANCES_222) as Categoria222[]).filter((c) => rep[c].length > 0)
  const total = cats.reduce((s, c) => s + CHANCES_222[c], 0)
  if (!total) return null
  let x = r * total
  for (const c of cats) { x -= CHANCES_222[c]; if (x < 0) return c }
  return cats[cats.length - 1]
}
