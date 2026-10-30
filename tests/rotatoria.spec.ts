import { expect, test, type Page } from "@playwright/test"
import { corNoAnel } from "../app/linha/estrada/anel"
import { hexRgb } from "../app/linha/estrada/distritos"
import { calcularRotaDisco, espacarNoCirculo, montarMundoDisco } from "../app/linha/estrada/mundoDisco"

// (T61) A rotatória de cima, sem espiral (LU2CA 29/10): em cada torre, um anel
// só, plano, que liga as linhas dela; o jogador escolhe a saída sem rodar
// andares. As bordas do anel: a direita na cor da próxima saída, a esquerda na
// da seguinte (item 4 da ordem combinada). Os monumentos em cima das missões e
// o gancho da cena (os 3 primeiros nascem).
// (a cena 3D: no Mac, metal; no CI ela pula)
test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })

test("T61: cada torre é um anel plano e fechado, sem espiral; toda saída se alcança em menos de uma volta", () => {
  const M = montarMundoDisco()
  // nada de espiral (sobe/desce/transf): só o anel
  const partes = new Set(M.info.map((f) => f.parte))
  expect([...partes].sort()).toEqual(["anel", "entrada", "ida", "saida", "volta"])
  expect(M.conflitos).toEqual([])
  expect(M.aneis.length).toBe(M.torres.length)
  for (const an of M.aneis) {
    const tw = M.torres[an.torre]
    // plano, na altura da torre (a rotatória de cima)
    for (const vi of an.vias) { const v = M.vias[vi]; for (let i = 0; i < v.n; i++) expect(Math.abs(v.py[i] - tw.topo)).toBeLessThan(0.01) }
    // uma saída por linha da torre (3 nas pontas, 9 na central) e o anel fecha
    expect(an.saidas.length).toBe(tw.andares.length)
    expect(an.vias.length).toBe(2 * tw.andares.length)
    for (let k = 0; k < an.vias.length; k++) {
      const v = M.vias[an.vias[k]], prox = M.vias[an.vias[(k + 1) % an.vias.length]]
      expect(M.ligacoes.saidas[v.rede!.para]).toContain(an.vias[(k + 1) % an.vias.length])
      expect(Math.hypot(v.px[v.n - 1] - prox.px[0], v.pz[v.n - 1] - prox.pz[0])).toBeLessThan(0.5)
    }
    // de cada chegada, cada saída da mesma torre: menos de uma volta no anel
    const chegadas = M.info.map((f, vi) => (f.parte === "entrada" && f.torre === an.torre ? vi : -1)).filter((vi) => vi >= 0)
    for (const de of chegadas) for (const sd of an.saidas) {
      if (M.info[de].pista === sd.pista) continue
      const r = calcularRotaDisco(M, { via: de, u: 0 }, { via: sd.via, u: 1 })!
      const noAnel = r.trechos.filter((t) => M.info[t.via].parte === "anel").reduce((s, t) => s + t.u1 - t.u0, 0)
      expect(noAnel).toBeLessThan(an.L)
    }
  }
})

test("T61: os Qs se espaçam no círculo sem trocar a ordem", () => {
  const a = espacarNoCirculo([0, 0.05, 0.1, 3], 0.6)
  for (let i = 0; i < 3; i++) expect(a[i + 1] - a[i]).toBeGreaterThan(0.6 - 1e-3)
  expect(a[3]).toBeCloseTo(3, 1)
})

test("T61: as bordas do anel — direita a próxima saída, esquerda a seguinte, em degradê", () => {
  const sds = [{ u: 0, via: 1, pista: 0, cor: "#ff0000" }, { u: 100, via: 2, pista: 1, cor: "#00ff00" }, { u: 200, via: 3, pista: 2, cor: "#0000ff" }]
  const an = { L: 300 }
  // logo antes da saída verde: a direita é verde, a esquerda azul
  expect(corNoAnel(an, sds, 95, 1)).toEqual(hexRgb("#00ff00"))
  expect(corNoAnel(an, sds, 95, -1)).toEqual(hexRgb("#0000ff"))
  // logo depois de passar a verde, as cores escorregam: a direita vai pra azul, a esquerda pra vermelha
  const d = corNoAnel(an, sds, 110, 1)!, e = corNoAnel(an, sds, 110, -1)!
  expect(d[1]).toBeGreaterThan(0.5); expect(d[2]).toBeGreaterThan(0)
  expect(e[2]).toBeGreaterThan(0.5); expect(e[0]).toBeGreaterThan(0)
  // passando a volta (u depois da última): a próxima é a vermelha (u = 0)
  expect(corNoAnel(an, sds, 290, 1)).toEqual(hexRgb("#ff0000"))
  // sem saída aberta: sem cor (fica a da torre)
  expect(corNoAnel(an, [], 10, 1)).toBeNull()
})

// ── a cena 3D (no Mac, metal; o CI não tem placa) ──
test.describe("T61 na cena", () => {
  test.skip(!!process.env.CI, "dirige a cena 3D: só no Mac")

  type J = { via: number; u: number; v: number; x: number }
  type W = { __jogo: J; __M: { info: { parte: string; torre: number; pista: number }[]; pistas: { nome: string }[] }; __cenasPedidas?: { linha: string; n: number }[] }
  async function entrar(page: Page, url: string) {
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
    await page.goto(url)
    const bt = page.locator(".l-btn-entrar")
    await expect(bt).toBeVisible({ timeout: 60_000 })
    await bt.click()
    await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo, null, { timeout: 60_000 })
    return erros
  }

  test("?parte=torre: chega na rotatória pela Nectar, dá a volta e sai; os 2 monumentos feitos nascem e pedem cena", async ({ page }) => {
    test.setTimeout(240_000)
    const erros = await entrar(page, "/linha?mapa=disco&parte=torre&medir")
    const onde = () => page.evaluate(() => { const w = window as unknown as W; const f = w.__M.info[w.__jogo.via]; return { parte: f.parte, torre: f.torre, pista: f.pista >= 0 ? w.__M.pistas[f.pista].nome : "" } })
    expect(await onde()).toEqual({ parte: "entrada", torre: 0, pista: "Nectar" })
    // anda: entra no anel e, sem mexer, segue na rotatória (não cai numa saída sozinho)
    const partes = new Set<string>()
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => { const j = (window as unknown as W).__jogo; j.v = Math.max(j.v, 22); j.x = 2 })
      partes.add((await onde()).parte)
      await page.waitForTimeout(250)
    }
    expect(partes.has("anel")).toBe(true)
    await page.screenshot({ path: "test-results/rotatoria/anel.png" })
    // os monumentos: Nectar e Sexta-Feira feitas (as 2 primeiras) pedem a cena, nessa ordem
    const cenas = await page.evaluate(() => (window as unknown as W).__cenasPedidas ?? [])
    expect(cenas.map((c) => [c.linha, c.n])).toEqual([["Nectar", 1], ["Sexta-Feira", 2]])
    expect(erros).toEqual([])
  })
})
