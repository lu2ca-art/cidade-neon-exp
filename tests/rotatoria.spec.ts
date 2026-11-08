import { expect, test, type Page } from "@playwright/test"
import { ANEL_CFG, linhasNoAnel } from "../app/linha/estrada/anel"
import { hexRgb } from "../app/linha/estrada/distritos"
import { calcularRotaDisco, espacarNoCirculo, montarMundoDisco } from "../app/linha/estrada/mundoDisco"

// (T61) A rotatória de cima, sem espiral (LU2CA 29/10): em cada torre, um anel
// só, plano, que liga as linhas dela; o jogador escolhe a saída sem rodar
// andares. As bordas do anel: a direita na cor da próxima saída, a esquerda na
// da seguinte (item 4 da ordem combinada). Sem missão pegada, nenhum monumento
// nem cena (08/11: só o da missão ativa).
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

test("T61b: as linhas no chão — a próxima na faixa da direita, a seguinte na do meio; passando, a do meio vai pra direita", () => {
  const sds = [{ u: 0, via: 1, pista: 0, cor: "#ff0000" }, { u: 100, via: 2, pista: 1, cor: "#00ff00" }, { u: 200, via: 3, pista: 2, cor: "#0000ff" }]
  const an = { L: 300 }
  // logo antes da saída verde: a verde na direita, a azul no meio
  const [p1, s1] = linhasNoAnel(an, sds, 95)
  expect(p1!.cor).toEqual(hexRgb("#00ff00")); expect(p1!.x).toBeCloseTo(ANEL_CFG.xDireita)
  expect(s1!.cor).toEqual(hexRgb("#0000ff")); expect(s1!.x).toBeCloseTo(ANEL_CFG.xMeio); expect(s1!.brilho).toBeCloseTo(1)
  // logo depois de passar a verde: a azul (que estava no meio) vira a próxima e começa no meio
  const [p2, s2] = linhasNoAnel(an, sds, 100.5)
  expect(p2!.cor).toEqual(hexRgb("#0000ff")); expect(p2!.x).toBeLessThan(ANEL_CFG.xMeio + 0.2)
  expect(s2).toBeNull()
  // no meio do degradê: a azul a caminho da direita, a vermelha acendendo no meio
  const [p3, s3] = linhasNoAnel(an, sds, 120)
  expect(p3!.x).toBeGreaterThan(ANEL_CFG.xMeio); expect(p3!.x).toBeLessThan(ANEL_CFG.xDireita)
  expect(s3!.cor).toEqual(hexRgb("#ff0000")); expect(s3!.brilho).toBeGreaterThan(0); expect(s3!.brilho).toBeLessThan(1)
  // passando a volta: a próxima é a vermelha (u = 0), na direita
  const [p4] = linhasNoAnel(an, sds, 290)
  expect(p4!.cor).toEqual(hexRgb("#ff0000")); expect(p4!.x).toBeCloseTo(ANEL_CFG.xDireita)
  // sem saída aberta: sem linha
  expect(linhasNoAnel(an, [], 10)).toEqual([null, null])
})

test("T61b: a rotatória central é larga (as 9 saídas com folga entre si)", () => {
  const M = montarMundoDisco()
  const an = M.aneis[0], u = an.saidas.map((s) => s.u).sort((a, b) => a - b)
  expect(an.saidas.length).toBe(9)
  expect(M.torres[0].raio).toBeGreaterThanOrEqual(170)
  for (let k = 0; k < u.length; k++) expect(((u[(k + 1) % u.length] - u[k]) % an.L + an.L) % an.L).toBeGreaterThan(75)
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

  test("?parte=torre: chega na rotatória pela Nectar, dá a volta e sai; sem missão ativa, nenhum monumento pede cena", async ({ page }) => {
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
    // (08/11) o ?parte=torre não tem missão pegada: nenhum monumento nasce
    const cenas = await page.evaluate(() => (window as unknown as W).__cenasPedidas ?? [])
    expect(cenas).toEqual([])
    expect(erros).toEqual([])
  })
})
