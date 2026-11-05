// Os ATALHOS DE TESTE (LU2CA, 14/10): cada um troca o save por um pronto e
// abre o jogo no ponto certo (a Kombi aparece ali quando você entra). Só
// valem fora da produção: no lu2ca.art a página /teste não existe e o
// ?atalho= é ignorado.

import type { FreqId } from "../linha/radio"

// parado: a Kombi aparece parada e segura uns segundos (dá tempo de ver o botão)
export interface Ir { area: FreqId; u: number; parado?: boolean; procurado?: boolean; embacar?: boolean }
export interface Atalho { id: string; nome: string; desc: string; save: Record<string, unknown>; ir: Ir }

// (notas 04/11) os testes gravam no save de teste, separado do de verdade (linha/chaveSave.ts)
export { CHAVE_SAVE_TESTE as CHAVE_SAVE, CHAVE_SAVE_ANTES as CHAVE_REAL } from "../linha/chaveSave"

// alguém que já passou da abertura e do tutorial, com sinal pra abrir todas as saídas
export const BASE_TESTE = {
  versao: 2, casa: true, tutorial: ["fim", "posto"], tanque: 1, nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [],
  sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [],
  ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false,
  dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 3 }, reliquias: [],
  completos: ["grupo", "abertura", "copo"], ecosVistos: ["copo"], objetos: ["copo"], pausas: {}, fio: ["sexta"],
  hora: 22, dia: 3, neon: 30, popularidade: 20,
}

export const ATALHOS: Atalho[] = [
  { id: "parque", nome: "a montanha-russa", desc: "de noite, na avenida, chegando no parque · toca em “andar na montanha-russa”", save: { hora: 21 }, ir: { area: "full", u: 650, parado: true } },
  { id: "ginasio", nome: "entrar no ginásio", desc: "de manhã, na avenida, chegando no ginásio · toca em “entrar”, a cena carrega a página, “sair” volta pra estrada", save: { hora: 10 }, ir: { area: "full", u: 1640, parado: true } },
  { id: "galeria", nome: "entrar na galeria", desc: "de tarde, no mirante, chegando na galeria", save: { hora: 14 }, ir: { area: "crypto", u: 1490, parado: true } },
  { id: "shows", nome: "a casa de shows (pista cheia)", desc: "de noite, perto da arena · entra e vê um amigo da 222 tocando; popularidade 85", save: { hora: 22, popularidade: 85, objetos: ["copo", "chuva", "dopamina"] }, ir: { area: "live", u: 1190, parado: true } },
  { id: "shows-vazio", nome: "a casa de shows (vazia)", desc: "o mesmo show com a 222 desconhecida: popularidade 2", save: { hora: 22, popularidade: 2 }, ir: { area: "live", u: 1190, parado: true } },
  { id: "fliperama", nome: "entrar no fliperama", desc: "de noite, perto da arena, chegando no fliperama", save: { hora: 22 }, ir: { area: "live", u: 1440, parado: true } },
  { id: "flores", nome: "as flores da Ella", desc: "de manhã, no subúrbio, chegando no 1º canteiro · toca em “regar as flores”", save: { hora: 10 }, ir: { area: "suburbio", u: 270, parado: true } },
  { id: "embacado", nome: "o vidro embaçado", desc: "parada na chuva, de noite · em uns segundos o vidro embaça forte: passa o dedo; depois embaça leve: passa de novo", save: { hora: 19, dia: 3, dicas: ["disco-1", "disco-2", "radio-1"] }, ir: { area: "linha", u: 300, parado: true } },
  { id: "respirar", nome: "respirar na caçada", desc: "a polícia atrás de você · despista, segura o freio até parar e respira com o círculo", save: { hora: 23 }, ir: { area: "linha", u: 500, procurado: true } },
  { id: "entardecer", nome: "o relógio e o dormir", desc: "17h30, o sol caindo · espera a noite chegar, testa “cochilar” e “dormir na Kombi”", save: { hora: 17.5 }, ir: { area: "linha", u: 300 } },
  { id: "bar", nome: "a 1ª liberação (o bar)", desc: "antes do 1º objeto, a caminho do bar · bebe, sai, e no fim vê a faixa entrar na 222", save: { completos: ["grupo", "abertura"], objetos: [], ecosVistos: [], pausas: { copo: 8 }, fio: ["copo"], hora: 21, dia: 1, popularidade: 0 }, ir: { area: "linha", u: 1390 } },
  { id: "balada-vazia", nome: "a balada vazia", desc: "popularidade 5 · na pista quase ninguém copia a sua dança", save: { reliquias: ["muda"], itens: ["carona:sexta"], pausas: { sexta: 15 }, popularidade: 5 }, ir: { area: "linha", u: 2045 } },
  { id: "balada-cheia", nome: "a balada cheia", desc: "popularidade 90 · a pista inteira pula junto com você", save: { reliquias: ["muda"], itens: ["carona:sexta"], pausas: { sexta: 15 }, popularidade: 90 }, ir: { area: "linha", u: 2045 } },
]

export const saveDo = (a: Atalho) => ({ ...BASE_TESTE, ...a.save })

// fora da produção? (a Vercel diz o ambiente; e o domínio de verdade nunca)
export function atalhosLiberados() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return false
  if (typeof window !== "undefined" && /(^|\.)lu2ca\.art$/.test(location.hostname)) return false
  return true
}

export const atalhoPorId = (id: string | null) => (id ? ATALHOS.find((a) => a.id === id) ?? null : null)
