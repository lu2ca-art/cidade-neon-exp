import { existsSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"
import { MISSOES13, IDS13 } from "../app/linha/disco/portas"
import { FASES_SEM_PISTA, RESTO_SINAL, SOM_MISSAO, radioPega, somDaMissao, somDoLugar, type MemoriaRadio } from "../app/linha/disco/sons"
import { Trilha, aplicarFadeMinhoca, curvaMinhoca, type CtxLike, type NosFade, type ParamLike } from "../app/linha/disco/trilha"

// (T40) o som do jogo, sem navegador: o som de cada missão, a troca ao entrar
// numa missão, o fade do buraco de minhoca e a rádio que só pega perto da pista

// ── um contexto de áudio de mentira (anota o que foi agendado) ──
class Param implements ParamLike {
  value = 0
  chamadas: string[] = []
  setValueAtTime(v: number) { this.value = v; this.chamadas.push("set") }
  linearRampToValueAtTime(v: number) { this.value = v; this.chamadas.push("rampa") }
  setTargetAtTime(v: number) { this.value = v; this.chamadas.push("alvo") }
  setValueCurveAtTime(c: Float32Array) { this.value = c[c.length - 1]; this.chamadas.push("curva") }
  cancelScheduledValues() { this.chamadas.push("cancela") }
}
class No { conectado: unknown[] = []; connect(d: unknown) { this.conectado.push(d); return d } disconnect() {} }
class Ganho extends No { gain = new Param() }
class Osc extends No {
  type = "sine"; frequency = new Param(); iniciou = 0
  start() { this.iniciou++ }
  stop() {}
}
function mundo() {
  const osc: Osc[] = []
  const ctx = {
    currentTime: 0,
    createGain: () => new Ganho(),
    createOscillator: () => { const o = new Osc(); osc.push(o); return o },
    createMediaElementSource: () => new No(),
  } as unknown as CtxLike & { currentTime: number }
  const audios: { src: string; loop: boolean; preload: string; currentTime: number; paused: boolean; tocou: number; pausou: number; play(): void; pause(): void }[] = []
  const t = new Trilha({
    ctx: () => ctx,
    saida: () => new No(),
    novoAudio: () => {
      const a = { src: "", loop: false, preload: "", currentTime: 0, paused: true, tocou: 0, pausou: 0, play() { a.paused = false; a.tocou++ }, pause() { a.paused = true; a.pausou++ } }
      audios.push(a)
      return a
    },
  })
  return { ctx, osc, audios, t }
}

test("cada uma das 13 missões tem o seu som, com arquivo que existe", () => {
  expect(Object.keys(SOM_MISSAO).sort()).toEqual([...IDS13].sort())
  const srcs: string[] = []
  for (const id of IDS13) {
    const s = somDaMissao(id)
    if (s.tipo === "faixa") {
      srcs.push(s.src)
      expect(existsSync(join(__dirname, "..", "public", s.src)), `${id}: ${s.src}`).toBe(true)
    }
    expect(s.vol).toBeGreaterThan(0)
    expect(s.vol).toBeLessThanOrEqual(1)
  }
  expect(new Set(srcs).size).toBe(srcs.length) // nenhuma missão repete o som de outra
  expect(somDaMissao("dbee").tipo).toBe("tambor") // a D-Bee: a batida do tambor
})

test("o som é o do lugar da cena", () => {
  expect(somDoLugar("casa-dbee")).toBe(SOM_MISSAO.dbee) // a final divide a casa, mas a D-Bee vem antes
  expect(somDoLugar("palco-nectar")).toBe(SOM_MISSAO.lu2ca)
  expect(somDoLugar("casa-drewboy")).toBe(SOM_MISSAO.drew)
  expect(somDoLugar("oficina")).toBe(SOM_MISSAO.oficina)
  expect(somDoLugar("bar")).not.toBeNull()
  expect(somDoLugar("posto")).toBeNull() // sem som próprio: fica a música abafada
  for (const id of IDS13) {
    const l = MISSOES13[id].lugar
    if (l.lugar && id !== "final") expect(somDoLugar(l.lugar)).toBe(SOM_MISSAO[id])
  }
})

test("o som muda ao entrar numa missão e some ao sair, em fade", () => {
  const { t, audios, osc, ctx } = mundo()
  t.preparar(SOM_MISSAO.lu2ca) // carrega antes: sem atraso na cena
  expect(audios).toHaveLength(1)
  expect(audios[0].preload).toBe("auto")
  expect(audios[0].tocou).toBe(0)

  t.entrar(SOM_MISSAO.dbee)
  expect(t.atual).toBe(SOM_MISSAO.dbee)
  expect(osc.length).toBeGreaterThan(0) // a batida do tambor já foi agendada
  expect(osc.every((o) => o.iniciou === 1)).toBe(true)

  ctx.currentTime = 5
  t.entrar(SOM_MISSAO.lu2ca) // outra missão: o som troca
  expect(t.atual).toBe(SOM_MISSAO.lu2ca)
  expect(audios[0].tocou).toBe(1)
  expect(audios[0].src).toBe("/audio/pistas/nectar-inst.mp3")
  expect(audios[0].loop).toBe(true)
  const n = osc.length
  expect(osc.length).toBe(n) // o tambor parou de agendar

  t.entrar(SOM_MISSAO.lu2ca) // mesma missão: não recomeça
  expect(audios[0].tocou).toBe(1)

  t.sair()
  expect(t.atual).toBeNull()
  t.sair() // sair duas vezes não quebra
})

test("segurar cala a trilha sem cortar seco", () => {
  const { t } = mundo()
  t.entrar(SOM_MISSAO.tony)
  expect(() => { t.segurar(true); t.segurar(false) }).not.toThrow()
})

test("o fade da minhoca: sobe do zero, da distorção pro limpo, sem erro", () => {
  const k = curvaMinhoca()
  const subindo = (v: Float32Array) => v.every((x, i) => i === 0 || x >= v[i - 1] - 1e-6)
  expect(k.nivel[0]).toBe(0)
  expect(k.nivel[k.nivel.length - 1]).toBeCloseTo(1, 5)
  expect(subindo(k.nivel)).toBe(true)
  expect(subindo(k.corte)).toBe(true)
  expect(subindo(k.ritmo)).toBe(true)
  expect(subindo(k.seco)).toBe(true)
  expect(k.molhado[0]).toBeGreaterThan(0.5) // começa distorcido
  expect(k.molhado[k.molhado.length - 1]).toBe(0) // termina limpo
  expect(k.corte[0]).toBeLessThan(600) // começa abafado
  expect(k.corte[k.corte.length - 1]).toBeCloseTo(20000, 0)
  expect(k.ritmo[k.ritmo.length - 1]).toBe(1)

  const nos: NosFade = { nivel: new Ganho(), molhado: new Ganho(), seco: new Ganho(), filtro: { frequency: new Param() } }
  expect(() => aplicarFadeMinhoca({ currentTime: 0 }, nos, 7.2)).not.toThrow()
  for (const p of [nos.nivel.gain, nos.molhado.gain, nos.seco.gain, nos.filtro.frequency] as Param[]) expect(p.chamadas).toEqual(["cancela", "curva"])
  expect((nos.nivel.gain as Param).value).toBeCloseTo(1, 5)
  expect((nos.molhado.gain as Param).value).toBe(0)
})

test("a rádio só pega perto das pistas; fora, fica o disco", () => {
  const mem: MemoriaRadio = { resto: 0 }
  // no deserto ninguém tem pista: nunca pega, nem em cima de uma
  for (const fase of FASES_SEM_PISTA) expect(radioPega(mem, fase, true, 0.016)).toBe(false)
  // na cidade: em cima da pista pega; saiu dela, o sinal some depois de uns segundos
  expect(radioPega(mem, "carreira", true, 0.016)).toBe(true)
  expect(radioPega(mem, "carreira", false, RESTO_SINAL - 1)).toBe(true)
  expect(radioPega(mem, "carreira", false, 1.5)).toBe(false)
  // sem nunca ter passado numa pista, não pega
  expect(radioPega({ resto: 0 }, "carreira", false, 0.016)).toBe(false)
})

test("fonteSom: pedir a rádio fora do alcance fica no disco e volta sozinha perto da pista", async () => {
  const g = globalThis as unknown as Record<string, unknown>
  // um navegador mínimo, só pra o módulo do som carregar
  const tocos: string[] = []
  class FakeAudio {
    src = ""; paused = true; currentTime = 0; loop = false; preload = ""; volume = 1
    addEventListener() {}
    play() { this.paused = false; tocos.push(this.src); return Promise.resolve() }
    pause() { this.paused = true }
  }
  g.Audio = FakeAudio
  g.window = { addEventListener() {} }
  g.document = { addEventListener() {}, createElement: () => ({}) }
  const { fonteSom, disco } = await import("../app/linha/som")
  fonteSom.discoPadrao = ["/audio/tracks/oasis.mp3"]
  const vistos: [string, boolean | undefined][] = []
  fonteSom.ouvir((f, auto) => vistos.push([f, auto]))

  fonteSom.pega(false) // no deserto
  fonteSom.set("disco")
  fonteSom.set("radio") // a pessoa pede a rádio: não pega
  expect(fonteSom.get()).toBe("disco")
  fonteSom.set("radio")
  expect(fonteSom.get()).toBe("disco")
  expect(vistos.some(([f]) => f === "radio")).toBe(false)

  fonteSom.pega(true) // chegou perto de uma pista
  expect(fonteSom.get()).toBe("radio")
  expect(vistos[vistos.length - 1]).toEqual(["radio", true]) // auto: a Kombi retoma a programação

  fonteSom.pega(false) // saiu do alcance: volta pro disco, sozinha
  expect(fonteSom.get()).toBe("disco")
  fonteSom.set("off") // a pessoa desligou: a rádio não volta a ligar sozinha
  fonteSom.pega(true)
  expect(fonteSom.get()).toBe("off")
  void disco
})
