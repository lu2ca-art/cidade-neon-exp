"use client"

// AS PEÇAS DAS MISSÕES DAS PESSOAS (T15, T18, T23, T24, T25, T16 — 28/10): o
// que abre por cima do jogo quando a peça da missão é `{ t: "cena", id }`
// (portas.ts). (30/10) A moda é a arte do Drew; a dança e a vinheta saíram do
// mapa e ficam aqui pro link de teste. Cada uma é a ARTE ou o JOGO de alguém; acabou, `onFim(true)` e
// a missão segue sozinha (a próxima peça ou a porta). Os rascunhos: conf.ts.

import type { CenaId } from "../portas"
import { Danca } from "./Danca"
import { Moda } from "./Moda"
import { Vinheta } from "./Vinheta"
import { Trilha8 } from "./Trilha8"
import { Maquina } from "./Maquina"
import { Clipe } from "./Clipe"
import { Cozinhar } from "./Cozinhar"
import { DiscoAntigo } from "./DiscoAntigo"
import { SinucaMissao } from "./SinucaMissao"
import "./pecas.css"

// `obra`: o que a arte deixou (os cortes do clipe, a trilha, o prato…), vai pro save
export interface PecaProps { cor: string; quem: string; onFim: (ok: boolean, obra?: string[]) => void }

const PECAS: Record<CenaId, { titulo: string; C: (p: PecaProps) => React.ReactNode; tela?: "cheia" | "mundo" }> = {
  danca: { titulo: "dançar na balada", C: Danca },
  moda: { titulo: "o look reciclado", C: Moda },
  vinheta: { titulo: "gravar a vinheta", C: Vinheta },
  trilha8: { titulo: "a trilha de 8 bits", C: Trilha8 },
  maquina: { titulo: "a máquina do Notti", C: Maquina, tela: "cheia" },
  clipe: { titulo: "filmar o clipe", C: Clipe },
  cozinhar: { titulo: "cozinhar com o que veio da feira", C: Cozinhar, tela: "mundo" },
  "disco-antigo": { titulo: "um disco antigo", C: DiscoAntigo },
  sinuca: { titulo: "a sinuca", C: SinucaMissao, tela: "cheia" },
}

export function Peca({ id, qual, cor, quem, onFim }: { id: CenaId; qual: "arte" | "jogo" } & PecaProps) {
  const p = PECAS[id]
  const C = p.C
  if (p.tela === "cheia") {
    return (
      <div className={`l-peca is-cheia is-${id}`} style={{ ["--cor" as string]: cor }} role="dialog" aria-label={`a missão de ${quem}: ${p.titulo}`} onPointerDown={(e) => e.stopPropagation()}>
        <C cor={cor} quem={quem} onFim={onFim} />
      </div>
    )
  }
  // (09/11) acontece no lugar: nada por cima além dos controles (a cozinha do Tony)
  if (p.tela === "mundo") {
    return (
      <div className={`l-peca is-mundo is-${id}`} style={{ ["--cor" as string]: cor }} role="group" aria-label={`a missão de ${quem}: ${p.titulo}`} onPointerDown={(e) => e.stopPropagation()}>
        <C cor={cor} quem={quem} onFim={onFim} />
      </div>
    )
  }
  return (
    <div className={`l-peca is-${id}`} style={{ ["--cor" as string]: cor }} role="dialog" aria-label={`a missão de ${quem}: ${p.titulo}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="l-peca-caixa">
        <small>a missão de {quem} · {qual === "arte" ? "a arte" : "o jogo"}</small>
        <b>{p.titulo}</b>
        <C cor={cor} quem={quem} onFim={onFim} />
      </div>
    </div>
  )
}
