// B4TIDA estúdio — "começa no clima de…": a música já nasce tocando, no BPM
// e no tom da faixa do LU2CA, com o kit da própria faixa (o pack da cidade),
// baixo e acordes. Duas seções (verso e refrão) e um arranjo pronto: em 30
// segundos já soa como música; a pessoa só troca o que quiser.

import { CLIMAS } from "../lib/climas"
import { degreeToMidi, degreeTriadMidi } from "../lib/theory"
import { musicaVazia, novaFaixa, novaSecao, type Evento, type Musica } from "./tipos"

// o BPM de verdade de cada faixa (a grade medida das stems, 06/10)
const BPM_REAL: Record<string, number> = { chuva: 79, copo: 80, dopamina: 125, sexta: 88, ontem: 100 }
const PAD_V1: Record<string, number> = { kick: 0, snare: 1, hat: 2, perc: 5 }

export const OPCOES_CLIMA = CLIMAS.map((c) => ({ id: c.id, nome: c.nome, cor: c.cor, bpm: BPM_REAL[c.id] ?? c.bpm }))

export function musicaNoClima(id: string): Musica {
  const c = CLIMAS.find((x) => x.id === id) ?? CLIMAS[0]
  const m = musicaVazia()
  m.nome = `no clima de ${c.nome.toLowerCase()}`
  m.bpm = BPM_REAL[c.id] ?? c.bpm
  m.tom = c.tom[0]
  m.modo = c.tom[1]
  const bat = novaFaixa("bateria", `pack:${c.id}`)
  const bx = novaFaixa("baixo", `pack:${c.id}`)
  const tec = novaFaixa("teclas", "s:1")
  const pad = novaFaixa("pad", `s:${c.pad}`)
  m.faixas = [bat, bx, tec, pad]
  const verso = novaSecao("verso", 2)
  const refrao = novaSecao("refrão", 2)
  const ritmo = (forte: boolean): Evento[] => {
    const ev: Evento[] = []
    for (let bar = 0; bar < 2; bar++) for (const [row, passos] of Object.entries(c.ritmo)) for (const i of passos) {
      ev.push({ p: bar * 16 + i * 2, n: PAD_V1[row], d: 1, v: row === "hat" ? 0.6 : 0.9 })
      // no refrão a palma dobra a caixa
      if (forte && row === "snare") ev.push({ p: bar * 16 + i * 2, n: 4, d: 1, v: 0.75 })
    }
    if (forte) ev.push({ p: 0, n: 7, d: 1, v: 0.7 })
    return ev
  }
  verso.eventos[bat.id] = ritmo(false)
  refrao.eventos[bat.id] = ritmo(true)
  // baixo: a tônica de cada acorde, no tempo e no contratempo
  const baixo = (): Evento[] => c.graus.flatMap((g, k) => [
    { p: k * 8, n: degreeToMidi(m.tom, m.modo, g, 1), d: 3, v: 0.9 },
    { p: k * 8 + 6, n: degreeToMidi(m.tom, m.modo, g, 1), d: 2, v: 0.7 },
  ])
  verso.eventos[bx.id] = baixo()
  refrao.eventos[bx.id] = baixo()
  // pad segura o acorde; as teclas só entram no refrão
  const acordes = (oit: number, d: number, v: number): Evento[] => c.graus.flatMap((g, k) => degreeTriadMidi(m.tom, m.modo, g, oit).map((n) => ({ p: k * 8, n, d, v })))
  verso.eventos[pad.id] = acordes(3, 8, 0.6)
  refrao.eventos[pad.id] = acordes(3, 8, 0.7)
  refrao.eventos[tec.id] = c.graus.flatMap((g, k) => [0, 3, 6].flatMap((o) => degreeTriadMidi(m.tom, m.modo, g, 4).map((n) => ({ p: k * 8 + o, n, d: 2, v: 0.7 }))))
  m.secoes = [verso, refrao]
  m.arranjo = [verso.id, verso.id, refrao.id, verso.id, refrao.id, refrao.id]
  return m
}
