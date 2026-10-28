import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T15, T18, T23, T24, T25, T16 — 28/10) as missões das pessoas, cada uma até a
// porta abrir: a arte → o jogo → a porta → a recompensa, sem erro. As peças que
// são jogos longos (o ping pong, a sintonia, a máquina, a sinuca) terminam pelo
// gancho de teste (__cnMissao, só fora da produção); as artes são jogadas de verdade.
const PASTA = "test-results/missoes-pessoas"

async function abrir(page: Page, parte: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`/linha?mapa=disco&parte=${parte}`)
  const entrar = page.locator(".l-btn-entrar")
  await expect(entrar).toBeVisible({ timeout: 60_000 })
  await entrar.click()
  return erros
}
const save = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"))
const gancho = (page: Page, f: "chegou" | "fimPeca", arg?: string) =>
  page.waitForFunction(([f, arg]) => {
    const m = (window as unknown as { __cnMissao?: Record<string, (a?: string) => unknown> }).__cnMissao
    if (!m) return false
    return m[f!](arg ?? undefined) !== false
  }, [f, arg] as const, { timeout: 20_000 })
async function porta(page: Page, nome: string, porta: string) {
  const r = page.locator(".l-recompensa")
  await expect(r).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${PASTA}/${nome}-porta.png` })
  expect((await save(page)).disco.portas).toContain(porta)
}

test.beforeAll(() => mkdirSync(PASTA, { recursive: true }))

test("T15 · Drew: dançar → (de patins) o ping pong → o ginásio", async ({ page }) => {
  const erros = await abrir(page, "missao.drew.arte")
  const danca = page.locator(".l-peca.is-danca")
  await expect(danca).toBeVisible({ timeout: 30_000 })
  // bate no tempo algumas vezes (espaço) e deixa a música acabar
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(680) }
  await page.screenshot({ path: `${PASTA}/drew-1-danca.png` })
  await expect(danca.locator(".is-seguir")).toBeVisible({ timeout: 30_000 })
  await danca.locator(".is-seguir").click()
  expect((await save(page)).disco.passos13).toContain("drew:arte")
  // ainda na casa dele, o ping pong abre sozinho
  await expect(page.locator(".l-pingpong")).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await gancho(page, "fimPeca")
  await porta(page, "drew", "ginasio")
  expect(erros).toEqual([])
})

test("T18 · Xeriff: a vinheta → sintonizar → a rádio e as frequências", async ({ page }) => {
  const erros = await abrir(page, "missao.xeriff.arte")
  const v = page.locator(".l-peca.is-vinheta")
  await expect(v).toBeVisible({ timeout: 30_000 })
  for (const k of ["1", "2", "3", "1"]) await page.keyboard.press(k)
  await expect(v.locator(".l-vinheta-trilhas li.is-feita")).toHaveCount(4)
  await page.keyboard.press("Enter")
  await expect(v.locator(".l-vinheta-fita.is-rec")).toBeVisible()
  await page.screenshot({ path: `${PASTA}/xeriff-1-vinheta.png` })
  await v.locator("button", { hasText: "levar pro Xeriff" }).click({ timeout: 20_000 })
  expect((await save(page)).disco.obras13["xeriff:arte"]).toHaveLength(4)
  await expect(page.locator(".l-prova-missao")).toBeVisible({ timeout: 15_000 })
  await gancho(page, "fimPeca")
  await porta(page, "xeriff", "radio-frequencias")
  expect(erros).toEqual([])
})
