import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"
import { CORREDORES, RACHA_CFG, chegadaNaPista, premioRacha, registrarRacha, velRival } from "../app/linha/disco/corredores"
import type { Save } from "../app/linha/estado"

// (T44) Os rachas: os carros do mecânico.
// 1) as contas (sem navegador): o elástico do rival, a chegada na pista, o prêmio no save;
// 2) no jogo (?medir expõe __jogo, __M e __rachas): um carro aparece, emparelhou
//    pisca "tirar um racha", o racha começa (3, 2, 1), a Kombi chega primeiro e
//    ganha (paga neon$ e prestígio); depois outro corredor, e esse ganha (não paga).
const PASTA = "test-results/rachas"
// dirige a cena 3D: no Mac com --use-angle=metal (o CI só roda as contas, pelo tsc)
test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })

test("as contas do racha: elástico, chegada, prêmio", () => {
  const c = CORREDORES[0]
  // lado a lado: o ritmo da Kombi × o nível
  expect(velRival(c, 50, 0)).toBeCloseTo(50 * c.nivel, 5)
  // ele na frente (folga > 0) alivia; atrás, aperta
  expect(velRival(c, 50, 40)).toBeLessThan(velRival(c, 50, 0))
  expect(velRival(c, 50, -40)).toBeGreaterThan(velRival(c, 50, 0))
  // a Kombi parada não para ele (o ritmo mínimo), e nada passa dos limites
  expect(velRival(c, 0, 0)).toBeGreaterThanOrEqual(RACHA_CFG.vMin)
  expect(velRival(c, 500, -9999)).toBeLessThanOrEqual(RACHA_CFG.vMax)
  // a chegada: pra frente na mesma pista; pista curta demais, sem racha
  expect(chegadaNaPista(100, 3000)).toBe(100 + RACHA_CFG.distancia)
  expect(chegadaNaPista(100, 700)).toBe(660)
  expect(chegadaNaPista(100, 400)).toBeNull()
  // o prêmio: só quem ganha leva
  const ganhou = premioRacha(c, true, 31.234), perdeu = premioRacha(c, false, 40)
  expect(ganhou).toMatchObject({ corredor: c.id, venceu: true, neon: c.premio, prestigio: c.prestigio, tempo: 31.2 })
  expect(perdeu).toMatchObject({ venceu: false, neon: 0, prestigio: 0 })
  const s0 = { neon: 10, popularidade: 99 } as Save
  const s1 = registrarRacha(s0, ganhou)
  expect(s1.neon).toBe(10 + c.premio)
  expect(s1.popularidade).toBe(100) // a fama não passa de 100
  expect(s1.rachas?.[c.id]).toEqual({ v: 1, d: 0 })
  const s2 = registrarRacha(s1, perdeu)
  expect(s2.neon).toBe(s1.neon)
  expect(s2.rachas?.[c.id]).toEqual({ v: 1, d: 1 })
  // os corredores: nomes únicos e o que a tela usa
  expect(new Set(CORREDORES.map((x) => x.id)).size).toBe(CORREDORES.length)
  for (const x of CORREDORES) for (const k of ["nome", "carro", "desafio", "ganhou", "perdeu"] as const) expect(x[k].length).toBeGreaterThan(0)
})

type Racha = { fase: string; quem: number; alvo: { via: number; u: number } | null; resultado: { venceu: boolean; neon: number; prestigio: number; corredor: string } | null }
type W = {
  __jogo: Record<string, number | boolean | undefined>
  __M: { vias: { L: number }[]; pistas: { nome: string; ida: number }[] }
  __rachas: { vias: () => number[]; estado: () => Racha; carros: () => { vivo: boolean; via: number; u: number }[]; perto: (i?: number, frente?: number) => boolean }
}

async function entrar(page: Page, parte: string) {
  await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential") })
  const r = await page.goto(`/linha?mapa=disco&caderno&parte=${parte}&medir`)
  expect(r?.status()).toBe(200)
  const bt = page.locator(".l-btn-entrar")
  await expect(bt).toBeVisible({ timeout: 60_000 })
  await bt.click()
  await expect(bt).toBeHidden({ timeout: 30_000 })
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown; __rachas?: unknown }).__jogo && !!(window as unknown as { __rachas?: unknown }).__rachas, null, { timeout: 60_000 })
  for (let i = 0; i < 30; i++) {
    if (!(await page.locator(".l-cena").count())) break
    const fim = page.locator(".l-cena-fim button, .l-cena-escolhas button")
    if (await fim.count()) await fim.first().click({ force: true }).catch(() => {})
    else await page.mouse.click(200, 400)
    await page.waitForTimeout(400)
  }
  for (let i = 0; i < 16; i++) {
    const op = page.locator(".l-painel-ops button, .l-opcoes button")
    if (!(await op.count())) { if (i > 3) break; await page.waitForTimeout(700); continue }
    await op.first().click({ force: true }).catch(() => {})
    await page.waitForTimeout(900)
  }
  await page.getByText(/dar\s*partida/i).first().click({ force: true, timeout: 3_000 }).catch(() => {})
  await page.waitForTimeout(800)
}

// a Kombi no começo de uma pista (a ida da 1ª pista), andando
const naPista = (page: Page, u = 120) => page.evaluate((u) => {
  const w = window as unknown as W
  // uma pista acesa onde eles rodam, comprida
  const via = w.__rachas.vias().find((vi) => w.__M.vias[vi].L > 1500) ?? w.__rachas.vias()[0]
  Object.assign(w.__jogo, { via, u, x: 0, v: 30, voo: false, ar: false, encaixar: true, desligada: false })
  return via
}, u)
const estado = (page: Page) => page.evaluate(() => (window as unknown as W).__rachas.estado())
const neonDoSave = (page: Page) => page.evaluate(() => { const s = JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"); return { neon: s.neon ?? 0, pop: s.popularidade ?? 0, rachas: s.rachas ?? {} } })

test("o racha: o carro aparece, o botão pisca, começa, termina e paga", async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "rachas")

  // 1) os carros do mecânico estão rodando (o 1º nasce logo à frente da Kombi)
  await page.waitForFunction(() => (window as unknown as W).__rachas.carros().filter((c) => c.vivo).length >= 2, null, { timeout: 30_000 })
  const vivos = await page.evaluate(() => (window as unknown as W).__rachas.carros().filter((c) => c.vivo).length)
  const k0 = await page.evaluate(() => { const w = window as unknown as W; const c = w.__rachas.carros()[0]; return { via: w.__jogo.via, c0: c.via, frente: Math.round(c.u - (w.__jogo.u as number)) } })
  console.log(`carros do mecânico rodando: ${vivos}; a Kombi na via ${k0.via}, o 1º na via ${k0.c0} (${k0.frente} m à frente)`)

  // 2) emparelhou: pisca "tirar um racha"
  const via = await naPista(page)
  await page.waitForTimeout(300)
  await page.evaluate(() => (window as unknown as W).__rachas.perto(0, 4))
  const bt = page.locator(".l-racha-btn")
  await expect(bt).toBeVisible({ timeout: 10_000 })
  await expect(bt).toContainText(/tirar um racha/i)
  await expect(bt).toContainText(CORREDORES[0].nome)
  expect(await bt.evaluate((el) => getComputedStyle(el).animationName)).toBe("l-racha-pisca")
  await page.screenshot({ path: `${PASTA}/1-pisca.png` })
  const antes = await neonDoSave(page)

  // 3) aceitou: a contagem, o valendo, a chegada no GPS
  await bt.click()
  await page.waitForFunction(() => ["contagem", "valendo"].includes((window as unknown as W).__rachas.estado().fase), null, { timeout: 10_000 })
  const e1 = await estado(page)
  expect(e1.quem).toBe(0)
  expect(e1.alvo?.via).toBe(via)
  await expect(page.locator(".l-racha-placar")).toBeVisible()
  await expect(page.locator(".l-gps-barra")).toHaveAttribute("aria-label", new RegExp(`a chegada · ${CORREDORES[0].nome}`))
  await page.waitForFunction(() => (window as unknown as W).__rachas.estado().fase === "valendo", null, { timeout: 30_000 })
  await page.screenshot({ path: `${PASTA}/2-valendo.png` })

  // 4) a Kombi chega primeiro: ganha e paga
  await page.evaluate((u) => { Object.assign((window as unknown as W).__jogo, { u, encaixar: true }) }, e1.alvo!.u - 8)
  await page.waitForFunction(() => (window as unknown as W).__rachas.estado().fase === "fim", null, { timeout: 15_000 })
  const e2 = await estado(page)
  expect(e2.resultado).toMatchObject({ venceu: true, neon: CORREDORES[0].premio, prestigio: CORREDORES[0].prestigio, corredor: CORREDORES[0].id })
  await expect(page.locator(".l-racha-fim")).toContainText(`+${CORREDORES[0].premio} neon$`)
  await page.screenshot({ path: `${PASTA}/3-ganhou.png` })
  await expect.poll(async () => (await neonDoSave(page)).neon, { timeout: 10_000 }).toBe(antes.neon + CORREDORES[0].premio)
  const depois = await neonDoSave(page)
  expect(depois.pop).toBe(Math.min(100, antes.pop + CORREDORES[0].prestigio))
  expect(depois.rachas[CORREDORES[0].id]).toEqual({ v: 1, d: 0 })

  // 5) outro corredor, e esse ganha: não paga
  await page.waitForFunction(() => (window as unknown as W).__rachas.estado().fase === "solto", null, { timeout: 20_000 })
  await naPista(page)
  await page.waitForTimeout(300)
  await page.evaluate(() => (window as unknown as W).__rachas.perto(1, -3))
  await expect(bt).toBeVisible({ timeout: 10_000 })
  await expect(bt).toContainText(CORREDORES[1].nome)
  await bt.click()
  await page.waitForFunction(() => (window as unknown as W).__rachas.estado().fase === "valendo", null, { timeout: 30_000 })
  const e3 = await estado(page)
  // o rival passa da chegada antes da Kombi
  await page.evaluate((uA) => { const w = window as unknown as W; return w.__rachas.perto(1, uA - (w.__jogo.u as number) + 2) }, e3.alvo!.u)
  await page.waitForFunction(() => (window as unknown as W).__rachas.estado().fase === "fim", null, { timeout: 15_000 })
  expect((await estado(page)).resultado).toMatchObject({ venceu: false, neon: 0, corredor: CORREDORES[1].id })
  await expect(page.locator(".l-racha-fim")).toContainText(`${CORREDORES[1].nome} levou essa`)
  await expect.poll(async () => (await neonDoSave(page)).rachas[CORREDORES[1].id], { timeout: 10_000 }).toEqual({ v: 0, d: 1 })
  expect((await neonDoSave(page)).neon).toBe(depois.neon)
  expect(erros).toEqual([])
})

// (T27) a Kombi no conserto (de patins): os rachas não oferecem racha
test("no conserto não tem racha", async ({ page }) => {
  test.setTimeout(240_000)
  await entrar(page, "quebra.oficina")
  await naPista(page)
  for (let i = 0; i < 6; i++) { await page.evaluate(() => (window as unknown as W).__rachas.perto(0, 4)); await page.waitForTimeout(400) }
  expect((await estado(page)).fase).toBe("solto")
  await expect(page.locator(".l-racha-btn")).toHaveCount(0)
})
