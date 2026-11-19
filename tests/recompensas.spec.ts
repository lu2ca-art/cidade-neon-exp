import { expect, test, type Page } from "@playwright/test"
import { existsSync, mkdirSync } from "node:fs"
import { VAZIO } from "../app/linha/estado"
import { PAGA } from "../app/linha/economia-rascunho"
import { PISTAS } from "../app/linha/estrada/pistas"
import { historiaDe, comHistoria } from "../app/linha/disco/historia"
import { IDS13, MISSOES13, concluir } from "../app/linha/disco/portas"
import { PALCOS_CARREIRA, menuDo } from "../app/linha/disco/palcos"
import { aplicarRecompensa, referenciasDoBatida } from "../app/linha/disco/recompensas"
import { PISTAS_LIBERADAS, pistaDoArquivo, srcDaVersao, versaoDaPista, versoesDasPistas } from "../app/linha/disco/pistasLiberadas"

// (T30, T31) a recompensa da porta num lugar só (a grana, a faixa no Guitar Driver,
// a referência no B4TIDA) e a música da pista que vai de prévia a instrumental a
// versão subúrbio pelo trajeto da missão.
const PASTA = "test-results/recompensas"
// o começo (a D-Bee, a oficina) é feito pela história: a porta delas abre antes da carreira
const naCarreira = (id?: string) => comHistoria({ ...VAZIO, agua: 10 }, (h) => ({ ...h, fase: id === "dbee" ? "dunas" : id === "oficina" ? "oficina" : "carreira", holo: true }))

test("a porta paga tudo: a grana, a faixa nos palcos e a referência no B4TIDA", () => {
  // as 9 faixas: cada missão que tem faixa libera a dela nos palcos e no B4TIDA
  for (const id of IDS13.filter((m) => MISSOES13[m].recompensa.guitar)) {
    const faixa = MISSOES13[id].recompensa.guitar!
    const { save, recompensa } = aplicarRecompensa(naCarreira(id), id)
    expect(recompensa?.neon).toBe(MISSOES13[id].recompensa.neon)
    expect(save.agua).toBe(10 + MISSOES13[id].recompensa.neon)
    const h = historiaDe(save)
    // nos palcos (T20): a faixa deixa de ter cadeado em quem a tem no menu
    const palco = PALCOS_CARREIRA.find((p) => p.musicas.includes(faixa))
    if (palco) expect(menuDo(h, palco).find((m) => m.faixa === faixa)!.livre).toBe(true)
    expect(h.guitar).toContain(faixa)
    // no B4TIDA: a referência
    expect(referenciasDoBatida(h.batida).map((r) => r.id)).toContain(faixa)
    expect(h.portas).toEqual(expect.arrayContaining(MISSOES13[id].abre))
  }
})

test("a recompensa paga uma vez só e a Ella dá a CHUVA", () => {
  const antes = naCarreira()
  expect(menuDo(historiaDe(antes), PALCOS_CARREIRA[0]).find((m) => m.faixa === "chuva")!.livre).toBe(false)
  const a = aplicarRecompensa(antes, "ella")
  expect(a.save.agua).toBe(10 + PAGA.missao.ella)
  expect(menuDo(historiaDe(a.save), PALCOS_CARREIRA[0]).find((m) => m.faixa === "chuva")!.livre).toBe(true)
  const b = aplicarRecompensa(a.save, "ella")
  expect(b.recompensa).toBeNull()
  expect(b.save).toBe(a.save)
  // a missão sem faixa (a oficina) só dá a grana e as portas
  const o = aplicarRecompensa(naCarreira("oficina"), "oficina")
  expect(o.save.agua).toBe(10 + PAGA.missao.oficina)
  expect(historiaDe(o.save).guitar ?? []).toEqual([])
})

test("a pista: prévia → instrumental → versão subúrbio pelo trajeto da missão", () => {
  let h = historiaDe(naCarreira())
  // a Ella ainda não foi pegada: a prévia
  expect(versaoDaPista(h, "chuva")).toBe("previa")
  expect(srcDaVersao(PISTAS.find((p) => p.id === "chuva")!, "previa")).toBe("/audio/previews/chuva.mp3")
  // a Nectar (a do LU2CA) é dada desde o começo: a faixa inteira
  expect(versaoDaPista(h, "nectar")).toBe("suburbio")
  // pegou a missão: o instrumental
  h = { ...h, missao: "ella" }
  expect(versaoDaPista(h, "chuva")).toBe("inst")
  expect(versaoDaPista(h, "dopamina")).toBe("previa")
  expect(srcDaVersao(PISTAS.find((p) => p.id === "chuva")!, "inst")).toBe("/audio/pistas/chuva-inst.mp3")
  // a porta abriu: a versão subúrbio (a voz, porque a CHUVA já saiu)
  h = historiaDe(aplicarRecompensa(comHistoria(naCarreira(), () => h), "ella").save)
  expect(versaoDaPista(h, "chuva")).toBe("suburbio")
  expect(srcDaVersao(PISTAS.find((p) => p.id === "chuva")!, "suburbio")).toBe("/audio/pistas/chuva.mp3")
  // a Ojalá ainda não saiu (sem voz): a versão subúrbio é o instrumental
  expect(srcDaVersao(PISTAS.find((p) => p.id === "ojala")!, "suburbio", new Date("2026-10-01").getTime())).toBe("/audio/pistas/ojala-inst.mp3")
  // uma peça feita já libera o instrumental, mesmo sem a missão pegada (instAoPegar desligado exige peça)
  const feita = concluir({ ...historiaDe(naCarreira()) }, "drew", "arte")
  expect(versaoDaPista(feita, "sexta")).toBe("inst")
  // fora da carreira (o prólogo e o depois do fim): a faixa inteira, como sempre
  expect(versaoDaPista({ fase: "livre", holo: true }, "chuva")).toBe("suburbio")
  expect(versaoDaPista(null, "chuva")).toBe("suburbio")
  expect(Object.keys(versoesDasPistas(h))).toHaveLength(PISTAS.length)
  // configurável
  expect(typeof PISTAS_LIBERADAS.tocaForaDaMissao).toBe("boolean")
  // o holo reconhece a prévia
  expect(pistaDoArquivo("/audio/previews/chuva.mp3")).toMatchObject({ versao: "previa" })
})

test("todo arquivo de cada versão existe", () => {
  for (const p of PISTAS) {
    for (const v of ["previa", "inst", "suburbio"] as const) {
      // as faixas que ainda não saíram tocam o instrumental na versão subúrbio
      const src = srcDaVersao(p, v, new Date("2026-10-28").getTime())
      expect(existsSync(`public${src}`), `${p.id} ${v} ${src}`).toBe(true)
    }
  }
})

const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"))

test("no jogo: a porta da Ella paga, libera a CHUVA e a referência aparece no B4TIDA", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto("/linha?mapa=disco&parte=missao.ella")
  const entrar = page.locator(".l-btn-entrar")
  await expect(entrar).toBeVisible({ timeout: 60_000 })
  const antes = (await save(page)).agua ?? 0
  await entrar.click()
  // chegou no lugar da Ella: as peças dela ainda são "em breve", a porta abre direto
  await page.waitForFunction(() => {
    const m = (window as unknown as { __cnMissao?: { chegou: () => unknown } }).__cnMissao
    return !!m && m.chegou() !== false
  }, null, { timeout: 30_000 })
  const r = page.locator(".l-recompensa")
  await expect(r).toBeVisible({ timeout: 30_000 })
  await expect(r).toContainText("CHUVA")
  await page.screenshot({ path: `${PASTA}/ella-porta.png` })
  const s = await save(page)
  expect(s.agua).toBe(antes + PAGA.missao.ella)
  expect(s.disco.guitar).toContain("chuva")
  expect(s.disco.batida).toContain("chuva")
  // o B4TIDA lista a referência
  await page.goto("/batida")
  // a primeira tela do estúdio já lista a referência; tocar liga o áudio
  await expect(page.locator("[data-ref=chuva]")).toBeVisible({ timeout: 30_000 })
  await page.locator("[data-ref=chuva] button").click()
  await expect(page.locator("[data-ref=chuva] b")).toContainText("■")
  await page.screenshot({ path: `${PASTA}/batida-referencias.png` })
  expect(erros).toEqual([])
})
