// A MÚSICA CONTÍNUA (notas 03/11, o dono: "cada música é uma experiência que
// dura o tamanho da faixa"; 08/11, bíblia §3: a música é atrelada à missão).
// Cada pista é uma faixa do vol. 1:
//
// 1. andando numa rua → o INSTRUMENTAL da faixa daquela pista, em loop
// 2. aceitou uma missão com faixa (EPISODIOS) → o INSTRUMENTAL da faixa da
//    missão, em loop, onde quer que ele esteja (o deserto não cala ele).
//    Andando na PISTA da missão → a COMPLETA, com voz, do início. Dali nada a
//    interrompe: nem a troca de pista, nem as peças e cenas, nem turbo ou celular
//    (18/11, o dono: "aceita a missão, o instrumental começa; quando ativa a
//    missão daquela pista, andar por ela faz a música tocar de fato, com voz")
// 3. a completa da missão terminou → o instrumental dela, em loop, até trocar
//    de pista (aí vale o 1)
// 4. missão sem faixa (LIVRES, o final) → segue o 1
// 5. a música não depende de velocidade nem distância (turbo não muda nada)
// 6. rádio ligada manda no som: a completa da missão espera a rádio sair
// 7. faixa sem instrumental → a regra antiga: na rua a completa uma vez, depois
//    ela mesma mais baixa no lugar do instrumental
// 8. comprou o álbum → a completa sempre, em loop; missão/peça/cena no meio
//    troca pro instrumental no mesmo ponto
//
// Aqui é só regra e memória (sem áudio): quem toca é o PistaSom (som.ts).
// Ver docs/musica-continua.md.

import type { Tom } from "../som"

/** duração do crossfade completa ⇄ instrumental e de uma faixa pra outra (s) */
export const CROSSFADE = 1.5
/** volume do "instrumental" quando a faixa não tem um (a completa, mais baixa) */
export const VOL_SEM_INST = 0.55

/** PONTO ÚNICO: quem comprou o álbum ouve a completa sempre (hoje ninguém) */
export function albumComprado(): boolean {
  return false
}

/** o que o toca-discos da pista precisa saber de uma faixa */
export interface FaixaContinua {
  tom: Tom
  id: string
  completa: string // a versão com voz (ou o instrumental, se a voz ainda não saiu)
  inst: string // o instrumental (ou a completa, se não existe)
  semInst: boolean // não tem instrumental próprio: no lugar dele, a completa mais baixa
  dur: number // duração da completa (s), pra saber se ela "já acabou" no fim da missão
}

// as faixas cuja completa já tocou inteira nesta sessão (a página aberta)
const ouvidas = new Set<string>()
export const completaJaTocou = (id: string) => ouvidas.has(id)
// (dbee-sugere) quem quer saber quando uma completa tocou inteira (a D-Bee lembra no save)
const ouvintesCompleta = new Set<(id: string) => void>()
export const aoOuvirCompleta = (f: (id: string) => void) => { ouvintesCompleta.add(f); return () => { ouvintesCompleta.delete(f) } }
export function marcarCompletaOuvida(id: string) {
  if (ouvidas.has(id)) return
  ouvidas.add(id)
  ouvintesCompleta.forEach((f) => f(id))
  // (salvar no app, 03/11) o momento natural: a completa acabou de tocar inteira
  if (faixaRua.id === id) { clearTimeout(brilhoT); mudarRua({ id, brilho: true }); brilhoT = setTimeout(() => { if (faixaRua.brilho) mudarRua({ id: faixaRua.id, brilho: false }) }, BRILHO_MS) }
}

// ── (salvar no app, 03/11) A FAIXA DA RUA, pra tela: qual toca agora e se o
// "♥ salvar" brilha (os ~8 s logo depois da completa acabar). Uma loja fora do
// React: o PistaSom avisa quando a faixa troca; nada por quadro ──
export const BRILHO_MS = 8000
export type FaixaRua = { id: string | null; brilho: boolean }
let faixaRua: FaixaRua = { id: null, brilho: false }
let brilhoT: ReturnType<typeof setTimeout> | undefined
const ouvintesRua = new Set<() => void>()
function mudarRua(x: FaixaRua) {
  if (x.id === faixaRua.id && x.brilho === faixaRua.brilho) return
  faixaRua = x
  ouvintesRua.forEach((f) => f())
}
/** o PistaSom chama quando a faixa da pista troca (null = parou) */
export function definirFaixaRua(id: string | null) {
  if (id === faixaRua.id) return
  clearTimeout(brilhoT)
  mudarRua({ id, brilho: false })
}
export const ouvirFaixaRua = (f: () => void) => { ouvintesRua.add(f); return () => { ouvintesRua.delete(f) } }
export const lerFaixaRua = () => faixaRua

/** entrou na pista: a rua é instrumental (bíblia §3). A completa só pro álbum e
 *  pra faixa sem instrumental que ainda não tocou (a regra de antes dela) */
export function comecaPelaCompleta(f: FaixaContinua): boolean {
  return albumComprado() || (f.semInst && !completaJaTocou(f.id))
}
