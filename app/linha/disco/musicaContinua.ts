// A MÚSICA CONTÍNUA (notas 03/11, o dono): "cada música é uma experiência que
// dura o tamanho da faixa". Cada pista é uma faixa do vol. 1:
//
// 1. entrou numa pista → a faixa dela, do início, versão completa (com voz)
// 2. a completa toca UMA vez inteira; nada pausa (missão, peça, cena, turbo,
//    celular): no máximo abaixa o volume e volta
// 3. missão/peça/cena no meio → crossfade (~1,5 s) pro INSTRUMENTAL da mesma
//    faixa no MESMO ponto; acabou a missão → volta pra completa no ponto atual
// 4. a completa terminou → só o instrumental, em loop, até trocar de pista
// 5. trocar de pista → a faixa nova do início; pista cuja completa já tocou
//    nesta sessão → só o instrumental
// 6. a música não depende de velocidade nem distância (turbo não muda nada)
// 7. faixa sem instrumental → a completa mais baixa no lugar dele
//
// Aqui é só regra e memória (sem áudio): quem toca é o PistaSom (som.ts).
// Ver docs/musica-continua.md.

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

/** entrou na pista: começa pela completa ou (já tocou) direto pelo instrumental */
export function comecaPelaCompleta(id: string): boolean {
  return albumComprado() || !completaJaTocou(id)
}
