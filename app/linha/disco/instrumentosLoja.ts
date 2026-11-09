// OS INSTRUMENTOS DA LOJA NO TREM (09/11, decisão do dono): perdeu o violão no metrô
// e comprou outro instrumento, é esse que ele toca sentado no trem (disco/Violao.tsx).
// RASCUNHO: os timbres são palpite sintetizado (como os de instrumentos.ts); pra trocar
// por sample, é só mudar a voz aqui. Nome e preço moram em economia-rascunho.ts.

import type { Save } from "../estado"
import { INSTRUMENTOS } from "../economia-rascunho"
import { violao } from "../som"
import { bip, ruido } from "./pecas/sons"

export interface Comprado {
  id: string
  nome: string
  // a voz usa a corda do violão (Karplus-Strong): vale aquecer as notas ao abrir
  aquece?: true
  tocar: (f: number, vol?: number, quando?: number) => void
}
type Voz = Pick<Comprado, "aquece" | "tocar">

// nos de bater, a altura da nota escolhe a peça (grave, médio, agudo). RASCUNHO
const CORTE = { grave: 262, medio: 392 }

const VOZES: Record<string, Voz> = {
  guitarra: { aquece: true, tocar: (f, v = 0.32, q = 0) => { violao(f, v, q); bip(f, 0.35, "sawtooth", v * 0.12, q) } },
  baixo: { tocar: (f, v = 0.32, q = 0) => bip(f / 2, 0.5, "triangle", v * 1.1, q) },
  teclado: { tocar: (f, v = 0.32, q = 0) => { bip(f, 0.4, "square", v * 0.25, q); bip(f * 2, 0.25, "sine", v * 0.2, q) } },
  sampler: { tocar: (f, v = 0.32, q = 0) => {
    if (f < CORTE.grave) bip(90, 0.22, "sine", v * 1.6, q, 45)
    else if (f < CORTE.medio) { ruido(0.12, v * 0.7, q, 3000); bip(180, 0.08, "triangle", v * 0.5, q) }
    else ruido(0.04, v * 0.4, q, 9000)
  } },
  tambor: { tocar: (f, v = 0.32, q = 0) => {
    if (f < CORTE.grave) bip(110, 0.35, "sine", v * 1.4, q, 50)
    else if (f < CORTE.medio) bip(220, 0.18, "sine", v, q, 160)
    else ruido(0.07, v * 0.9, q, 5000)
  } },
}

const COMPRADOS = new Map<string, Comprado>(INSTRUMENTOS.filter((i) => VOZES[i.id]).map((i) => [`instrumento:${i.id}`, { id: i.id, nome: i.nome, ...VOZES[i.id] }]))

// o que ele toca no trem sem o violão: o último instrumento que comprou (null = nenhum)
export function instrumentoDoTrem(s: Pick<Save, "compras">): Comprado | null {
  const c = s.compras ?? []
  for (let i = c.length - 1; i >= 0; i--) {
    const x = COMPRADOS.get(c[i])
    if (x) return x
  }
  return null
}
