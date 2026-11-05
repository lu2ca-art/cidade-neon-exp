// (T22b) os FILMINHOS do jogo, pelo nome (o gancho: estrada/ganchoCena.ts; quem
// toca: CenaFilme.tsx). O roteiro de cada um mora com a missão dele.
import { FILME_ELLA } from "./disco/ella"
import { FILME_DESPEDIDA } from "./disco/final"
import type { Filme, FilmeId } from "./estrada/ganchoCena"

export const FILMES: Record<FilmeId, Filme> = {
  "ella-planta": FILME_ELLA,
  "final-despedida": FILME_DESPEDIDA,
}
