// O MAPA É UM DISCO (LU2CA, 18/10): cada pista é uma faixa do Vol.1.
// Decisões em ~/vault/projetos/cidade-neon/mapa-disco-decisoes.md
//
// - a velocidade da pista é 2 × BPM (em km/h) e uma volta (ida + balão +
//   volta no mesmo traçado) dura MEIA música: volta (m) = BPM × duração / 3,6
// - a pista é o toca-discos: em contato com ela a faixa toca; parar ou sair
//   = scratch; propulsor = downscratch + vento
// - faixa que ainda não saiu toca o instrumental; a voz entra no lançamento
// - os 3 trechos da pista são as 3 campanhas da faixa (campanhas-vol1.md):
//   a altura segue o sentimento (todo mundo vive nos altos e baixos)
//
// BPM medido na bateria isolada (SLIMBI) e confirmado pelo LU2CA (18/10).
// Tom pelo cromagrama da faixa inteira (scripts/linha-tons.py).

import type { Tom } from "../som"

export type PistaId = "ontem" | "copo" | "swav" | "sexta" | "rollercoaster" | "dopamina" | "chuva" | "ojala" | "nectar"

export interface Pista {
  id: PistaId
  faixa: string
  personagem: string
  objeto: string
  tema: string
  bpm: number
  duracao: number // s, da versão que toca
  voz: string | null // a faixa com voz (null até o lançamento)
  inst: string
  lancamento: string | null // a voz entra nesta data (null = já saiu)
  tom: Tom
  campanhas: [string, string, string]
}

const A = "/audio/pistas/"

export const PISTAS: Pista[] = [
  {
    id: "ontem", faixa: "Sabe Ontem?", personagem: "Alohan", objeto: "o caderno", tema: "shows",
    bpm: 100, duracao: 158.0, voz: A + "ontem.mp3", inst: A + "ontem-inst.mp3", lancamento: null,
    tom: { tonica: 3, modo: "menor" }, campanhas: ["Escuro Total", "Persistência Afrontosa", "Multidão de 1"],
  },
  {
    id: "copo", faixa: "Copo Americano", personagem: "Mubarak", objeto: "o mp3", tema: "músicas",
    bpm: 80, duracao: 174.1, voz: A + "copo.mp3", inst: A + "copo-inst.mp3", lancamento: null,
    tom: { tonica: 10, modo: "menor" }, campanhas: ["Quarto Vazio", "Piada de Mau Gosto", "Em Meio ao Caos, Flor"],
  },
  {
    id: "swav", faixa: "Swav", personagem: "Tony Gordo", objeto: "a lanterna", tema: "álbum",
    bpm: 135, duracao: 188.5, voz: null, inst: A + "swav-inst.mp3", lancamento: "2026-11-13T00:00:00-03:00",
    tom: { tonica: 2, modo: "maior" }, campanhas: ["Criatividade Eminente", "Reflexos", "Salto de Fé"],
  },
  {
    id: "sexta", faixa: "Sexta-Feira", personagem: "Drewboy", objeto: "o espelho", tema: "público",
    bpm: 88, duracao: 201.8, voz: A + "sexta.mp3", inst: A + "sexta-inst.mp3", lancamento: null,
    tom: { tonica: 9, modo: "menor" }, campanhas: ["Multidão Vazia", "Bateria Esgotada", "Aceita e Dança"],
  },
  {
    id: "rollercoaster", faixa: "Rollercoaster", personagem: "Nizzy", objeto: "o guarda-chuva", tema: "filmes",
    bpm: 104, duracao: 295.4, voz: null, inst: A + "rollercoaster-inst.mp3", lancamento: "2026-11-27T00:00:00-03:00",
    tom: { tonica: 6, modo: "menor" }, campanhas: ["Antes de Ir", "Preparando o Solo", "Flor, Fruto, Semente"],
  },
  {
    id: "dopamina", faixa: "DopaminA", personagem: "Notti", objeto: "o relógio", tema: "jogo",
    bpm: 125, duracao: 150.9, voz: A + "dopamina.mp3", inst: A + "dopamina-inst.mp3", lancamento: null,
    tom: { tonica: 5, modo: "menor" }, campanhas: ["Prazer Instantâneo", "Algo de Estranho", "Verde Interior"],
  },
  {
    id: "chuva", faixa: "CHUVA", personagem: "Ella", objeto: "a flor", tema: "missão",
    bpm: 79, duracao: 189.9, voz: A + "chuva.mp3", inst: A + "chuva-inst.mp3", lancamento: null,
    tom: { tonica: 5, modo: "maior" }, campanhas: ["Solo Fértil", "Deserto", "Chuva de Verão"],
  },
  {
    id: "ojala", faixa: "Ojalá", personagem: "D-Bee", objeto: "a camisa da seleção", tema: "propósito",
    bpm: 118, duracao: 168.3, // a versão final é o wav de 2:48 (o instrumental do SLIMBI tem 2:55)
    voz: null, inst: A + "ojala-inst.mp3", lancamento: "2026-10-30T00:00:00-03:00",
    tom: { tonica: 6, modo: "menor" }, campanhas: ["Amor de Carnaval", "Pelé e Maradona", "Fugaz como o Vento"],
  },
  {
    // (18/10, LU2CA) a pista da Nectar é a das FLORES: regar faz a cidade
    // florescer, e a beleza natural (a aurora boreal) enfeita a noite
    id: "nectar", faixa: "Nectar", personagem: "LU2CA", objeto: "o violão", tema: "as flores",
    bpm: 79, duracao: 155.0, voz: A + "nectar.mp3", inst: A + "nectar-inst.mp3", lancamento: null,
    tom: { tonica: 4, modo: "maior" }, campanhas: ["Bicho de 7 Cabeças", "Tentativa e Erro", "Menino Sem Vergonha"],
  },
]

/** velocidade da pista (m/s): 2 × BPM em km/h */
export const velocidade = (p: Pista) => (2 * p.bpm) / 3.6
/** comprimento de uma volta (m): meia música na velocidade da pista */
export const volta = (p: Pista) => velocidade(p) * (p.duracao / 2)
/** o que toca agora: a voz depois do lançamento, senão o instrumental */
export const faixaDaPista = (p: Pista, agora = Date.now()) =>
  p.voz && (!p.lancamento || new Date(p.lancamento).getTime() <= agora) ? p.voz : p.inst
