import { expect, test } from "@playwright/test"

// T11: as trincheiras abrem, o patinador anda (no teclado e no piloto
// automático) e nada quebra
const consentimento = () => localStorage.setItem("cidade-neon-analytics-consent", "essential")
type Est = { x: number; z: number; y: number; kmh: number; dist: number; ar: boolean; onde: string; voos: number }
const estado = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __estado: () => Est }).__estado())

test("/teste/trincheiras abre e anda de patins sem erro", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(consentimento)
  const r = await page.goto("/teste/trincheiras")
  expect(r?.status()).toBe(200)
  await expect(page.getByText("AS TRINCHEIRAS")).toBeVisible()
  await page.waitForFunction(() => "__estado" in window, null, { timeout: 60_000 })
  const antes = await estado(page)
  expect(antes.onde).toContain("TORRE 1")
  // acelera reto, vira um pouco e pula
  // (sem placa de vídeo o quadro é lento e a física anda devagar: espera pelo estado, não pelo relógio)
  await page.keyboard.down("ArrowUp")
  await page.waitForFunction(() => (window as unknown as { __estado: () => Est }).__estado().kmh > 20, null, { timeout: 60_000 })
  await page.keyboard.down("ArrowLeft"); await page.waitForTimeout(300); await page.keyboard.up("ArrowLeft")
  await page.keyboard.press("Space")
  await page.waitForFunction(() => (window as unknown as { __estado: () => Est }).__estado().dist > 15, null, { timeout: 60_000 })
  const depois = await estado(page)
  await page.keyboard.up("ArrowUp")
  expect(depois.kmh).toBeGreaterThan(20)
  expect(depois.dist).toBeGreaterThan(15)
  expect(Math.hypot(depois.x - antes.x, depois.z - antes.z)).toBeGreaterThan(10)
  // nunca atravessa o chão nem sobe além da parede
  expect(depois.y).toBeGreaterThanOrEqual(0)
  await expect(page.locator(".tr-intro")).toHaveCount(0)
  expect(erros).toEqual([])
})

test("/teste/trincheiras?auto dá a volta pelos rios secos", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(consentimento)
  await page.goto("/teste/trincheiras?auto")
  await page.waitForFunction(() => "__estado" in window, null, { timeout: 60_000 })
  // sai da torre 1 e entra no rio A
  await page.waitForFunction(() => (window as unknown as { __estado: () => Est }).__estado().onde === "RIO SECO A", null, { timeout: 60_000 })
  expect(erros).toEqual([])
})
