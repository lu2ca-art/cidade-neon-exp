import { expect, test, type Page } from "@playwright/test"
import { writeFileSync, mkdirSync } from "node:fs"

// T12: o grafite dos túneis. Abre /teste/grafite, liga os pontos, o spray revela, sem erro.
const PRINTS = process.env.PRINTS ?? "test-results/grafite"
const consentimento = () => localStorage.setItem("cidade-neon-analytics-consent", "essential")

type Dados = { estado: string; pontos: [number, number][]; caixa: { x: number; y: number; s: number }; quadros: number[] }
const dados = (page: Page) => page.evaluate(() => {
  const w = (window as unknown as { __grafite: Dados }).__grafite
  return { estado: w.estado, pontos: w.pontos, caixa: w.caixa, quadros: w.quadros }
})

async function ligarComMouse(page: Page) {
  const { pontos } = await dados(page)
  const box = (await page.locator(".gf-fx").boundingBox())!
  const abs = pontos.map(([x, y]) => [box.x + x, box.y + y] as const)
  await page.mouse.move(abs[0][0], abs[0][1])
  await page.mouse.down()
  for (let i = 1; i < abs.length; i++) await page.mouse.move(abs[i][0], abs[i][1], { steps: 12 })
  await page.mouse.up()
}

test.beforeEach(async ({ page }) => { await page.addInitScript(consentimento) })

test("mouse: abre, liga os pontos, o grafite revela e entra na coleção", async ({ page }) => {
  mkdirSync(PRINTS, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  page.on("console", (m) => { if (m.type() === "error" && !/_vercel|Failed to load resource/.test(m.text())) erros.push(m.text()) })
  await page.goto("/teste/grafite")
  await expect(page.locator(".gf-raiz")).toHaveAttribute("data-estado", "esperando")
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${PRINTS}/1-esperando.png` })
  await ligarComMouse(page)
  await page.waitForTimeout(1800)
  expect((await dados(page)).estado).toBe("revelando")
  await page.screenshot({ path: `${PRINTS}/2-revelando.png` })
  await expect(page.locator(".gf-raiz")).toHaveAttribute("data-estado", "pronto", { timeout: 20_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${PRINTS}/3-pronto.png` })
  const q = (await dados(page)).quadros
  expect(q.length).toBeGreaterThan(30)
  const ord = [...q].sort((a, b) => a - b)
  const media = q.reduce((a, b) => a + b, 0) / q.length
  const num = { quadros: q.length, mediaMs: +media.toFixed(2), p50Ms: +ord[Math.floor(q.length * 0.5)].toFixed(2), p95Ms: +ord[Math.floor(q.length * 0.95)].toFixed(2), piorMs: +ord[q.length - 1].toFixed(2) }
  writeFileSync(`${PRINTS}/desempenho.json`, JSON.stringify(num, null, 1))
  console.log("DESEMPENHO", JSON.stringify(num))
  await expect(page.locator(".gf-item").first().locator("i")).toHaveText("COLECIONADO")
  // os outros dois, pela coleção
  for (const i of [1, 2]) {
    await page.locator(".gf-item").nth(i).click()
    await expect(page.locator(".gf-raiz")).toHaveAttribute("data-estado", "esperando")
    await ligarComMouse(page)
    await expect(page.locator(".gf-raiz")).toHaveAttribute("data-estado", "pronto", { timeout: 20_000 })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${PRINTS}/4-grafite-${i + 1}.png` })
  }
  await expect(page.locator(".gf-item i", { hasText: "COLECIONADO" })).toHaveCount(3)
  expect(erros).toEqual([])
})

test.describe("toque (celular)", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })
  test("toque: arrasta o dedo pelos pontos e o grafite revela", async ({ page }) => {
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    await page.goto("/teste/grafite")
    await expect(page.locator(".gf-raiz")).toHaveAttribute("data-estado", "esperando")
    await page.locator(".gf-item").nth(2).click() // a estrela (5 pontos)
    const { pontos } = await dados(page)
    const box = (await page.locator(".gf-fx").boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const tp = (i: number) => [{ x: box.x + pontos[i][0], y: box.y + pontos[i][1] }]
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp(0) })
    for (let i = 1; i < pontos.length; i++) {
      for (let s = 1; s <= 8; s++) {
        const a = pontos[i - 1], b = pontos[i]
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: box.x + a[0] + ((b[0] - a[0]) * s) / 8, y: box.y + a[1] + ((b[1] - a[1]) * s) / 8 }] })
      }
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
    await expect(page.locator(".gf-raiz")).toHaveAttribute("data-estado", "pronto", { timeout: 20_000 })
    expect(erros).toEqual([])
  })
})
