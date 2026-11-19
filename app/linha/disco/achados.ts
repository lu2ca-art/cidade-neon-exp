// (T57) O QUE ESTÁ NO CHÃO AGORA, ALÉM DO ALVO: as peças da reciclagem
// espalhadas no lixão (a missão da oficina) e a boca do túnel. A page.tsx diz
// quais valem agora (chaoAtivos); a cena desenha as peças que faltam
// (LugaresChao) e a Corrida avisa quando a Kombi (ou os patins) passa perto
// (`chao:<id>`, o mesmo aviso do alvo). Um store pequeno, sem prop nova.

import { naBoca } from "../estrada/chao"
import { CHAO_LUGARES, RAIO_CHAO, type LugarChao } from "./historia"

let ATIVOS: readonly LugarChao[] = []
const ouvintes = new Set<() => void>()
export function definirChaoAtivos(ids: readonly LugarChao[]) {
  if (ids.length === ATIVOS.length && ids.every((x, i) => x === ATIVOS[i])) return
  ATIVOS = ids
  ouvintes.forEach((f) => f())
}
export const chaoAtivos = () => ATIVOS
export function ouvirChaoAtivos(f: () => void) {
  ouvintes.add(f)
  return () => { ouvintes.delete(f) }
}

// as peças que se pega passando (não param a Kombi)
export const PECAS_CHAO = ["painel", "lavadora", "ventilador", "radio"] as const satisfies readonly LugarChao[]
export type PecaChao = (typeof PECAS_CHAO)[number]
export const ehPeca = (id: string): id is PecaChao => (PECAS_CHAO as readonly string[]).includes(id)
// o raio pra pegar uma peça (dirigindo, sem parar)
export const RAIO_PECA = 9
// (jogador novo 2) os lugares do chão em que ele está agora (a Corrida enche e esvazia;
// sai a ~3x o raio). A página confere aqui antes de devolver um "entrar" segurado
export const chaoDentro = new Set<string>()

// chegou? a boca do túnel só lá embaixo, na frente da porta; as peças, passando perto
export function pertoDoChao(id: LugarChao, x: number, z: number) {
  if (id === "tuneis") return naBoca(x, z)
  const l = CHAO_LUGARES[id]
  return Math.hypot(x - l.x, z - l.z) < (ehPeca(id) ? RAIO_PECA : RAIO_CHAO)
}
