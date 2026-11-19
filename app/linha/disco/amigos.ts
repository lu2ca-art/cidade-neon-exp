// OS AMIGOS NO NOTCH (09/11, bíblia §14): quem está na lista e quem manda agora.
// Os textos moram em amigosTextos.ts; quem decide a HORA é o DbeeSugere (a mesma
// olhada de 3 s e as mesmas travas: nada por quadro).
//
//   a lista   D-Bee e Mubarak desde o começo; o LU2CA depois do show da Nectar
//             (é ali que a gente o conhece); o resto ao fechar o episódio dele
//   a escolha quem mandou menos pesa mais; dentro da pessoa, a frase que passou
//             menos. Quem acabou de entrar na lista aparece logo
//
// Sem save novo: a lista é derivada da história (EPISODIOS) e as contas usam a
// memória da D-Bee (`dbee.n`, chave "amigo:<quem>:<id>"). O save antigo só abre.

import { EPISODIOS, MARCOS, episodioFeito } from "./episodios"
import type { HistoriaDisco } from "./historia"
import { MENSAGENS_AMIGOS, type MsgAmigo, type QuemAmigo } from "./amigosTextos"
import { PALCOS_CARREIRA, nomeDoPalco, palcoAberto } from "./palcos"
import { DBEE_CFG, comecoDaCarreira, type CtxDbee, type OpcaoDbee } from "./sugestoesDbee"

// RASCUNHO: quanto cada um manda em relação aos outros (o resto, "esporádico")
const PESO: Partial<Record<QuemAmigo, number>> = { "D-Bee": 1, Mubarak: 1.5, LU2CA: 1 }
const PESO_RESTO = 0.6

const INICIAIS: QuemAmigo[] = ["D-Bee", "Mubarak"]
const QUEM = Object.keys(MENSAGENS_AMIGOS) as QuemAmigo[]
const corDe = (q: QuemAmigo) => EPISODIOS.find((e) => e.quem === q)?.cor ?? DBEE_CFG.cor

/** ele já é amigo? (derivado do save) */
export function naLista(h: HistoriaDisco, q: QuemAmigo): boolean {
  if (INICIAIS.includes(q)) return true
  if (q === "LU2CA") return MARCOS["show-nectar"].feito(h)
  const ep = EPISODIOS.find((e) => e.quem === q)
  return !!ep && episodioFeito(h, ep)
}
export const amigosNaLista = (h: HistoriaDisco) => QUEM.filter((q) => naLista(h, q))

// as frases que valem agora: {no} vira uma por palco aberto da carreira
function frasesDe(h: HistoriaDisco, q: QuemAmigo): { m: MsgAmigo; chave: string; texto: string }[] {
  const raiz = `amigo:${q.toLowerCase().replace(/\s+/g, "-")}`
  const abertos = PALCOS_CARREIRA.filter((p) => palcoAberto(h, p))
  return MENSAGENS_AMIGOS[q].filter((m) => !m.se || m.se(h)).flatMap((m) => (m.texto.includes("{no}")
    ? abertos.map((p) => ({ m, chave: `${raiz}:${m.id}:${p.id}`, texto: m.texto.replace("{no}", nomeDoPalco(p).no) }))
    : [{ m, chave: `${raiz}:${m.id}`, texto: m.texto }]))
}

/** a mensagem de um amigo agora; null = ninguém tem o que mandar */
export function escolherAmigo(c: Pick<CtxDbee, "fase" | "h" | "mem">, sorteioQuem = Math.random(), sorteioFrase = Math.random()): OpcaoDbee | null {
  const h = c.h
  // (jogador novo 2) o começo da carreira é só o próximo passo
  if (!h || (c.fase !== "carreira" && c.fase !== "livre") || comecoDaCarreira(c)) return null
  const vezes = (chave: string) => c.mem.n[chave] ?? 0
  const quem = amigosNaLista(h).map((q) => {
    const todas = frasesDe(h, q)
    return { q, frases: todas.filter((f) => f.chave !== c.mem.ultima), peso: (PESO[q] ?? PESO_RESTO) / (1 + todas.reduce((a, f) => a + vezes(f.chave), 0)) }
  }).filter((x) => x.frases.length)
  if (!quem.length) return null
  let r = sorteioQuem * quem.reduce((a, x) => a + x.peso, 0)
  const x = quem.find((y) => (r -= y.peso) <= 0) ?? quem[quem.length - 1]
  const menos = Math.min(...x.frases.map((f) => vezes(f.chave)))
  const novas = x.frases.filter((f) => vezes(f.chave) === menos)
  const f = novas[Math.min(novas.length - 1, Math.floor(sorteioFrase * novas.length))]
  return { chave: f.chave, texto: f.texto, alvo: f.m.alvo ?? null, nome: f.m.nome, cor: corDe(x.q), quem: x.q, peso: 1, repete: true }
}
