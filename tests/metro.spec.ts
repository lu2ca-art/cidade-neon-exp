import { expect, test, type Page } from "@playwright/test"

// o metrô (T26) na página de teste: abre, corre, chega na porta ou é pego, sem erro.
// No Mac usa a GPU de verdade (Metal); fora dele, o swiftshader da config.
type Est = { fase: string; z: number; dist: number; violao: string; esbarroes: number; t: number; progresso: number }
declare global { interface Window { __metro: { estado: () => Est; fuga: { voce: { x: number } } } } }

const PRINTS = process.env.PRINTS
if (process.platform === "darwin") test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] } })

async function abrir(page: Page, url: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(url)
  await page.waitForFunction(() => !!window.__metro)
  return erros
}
const fimDa = (page: Page) => expect.poll(() => page.evaluate(() => window.__metro.estado().fase), { timeout: 60_000, intervals: [250] })

test("metro: o piloto foge e pula na porta da curva", async ({ page }) => {
  const erros = await abrir(page, "/teste/metro?auto=0&semente=222")
  await page.waitForTimeout(2500)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/metro-correndo.png` })
  const meio = await page.evaluate(() => window.__metro.estado())
  expect(meio.fase).toBe("fuga")
  expect(meio.z).toBeGreaterThan(8)
  await fimDa(page).toMatch(/pulou|pego/)
  const e = await page.evaluate(() => window.__metro.estado())
  expect(e.fase).toBe("pulou")
  await expect(page.locator(".mt-fim h1")).toHaveText("você pulou", { timeout: 5_000 })
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/metro-pulou.png` })
  expect(erros).toEqual([])
})

test("metro: no celular, toca em corre, corre reto e o guarda pega", async ({ page }) => {
  const erros = await abrir(page, "/teste/metro?semente=7")
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/metro-intro.png` })
  await page.getByRole("button", { name: "corre" }).click()
  await expect.poll(() => page.evaluate(() => window.__metro.estado().fase)).toBe("fuga")
  // um arrasto pro lado (o dedo desvia) e depois solta: segue reto até alguém no caminho
  const vp = page.viewportSize()!
  await page.mouse.move(vp.width / 2, vp.height * 0.6)
  await page.mouse.down()
  await page.mouse.move(vp.width / 2 + 40, vp.height * 0.6, { steps: 4 })
  await page.waitForTimeout(300)
  await page.mouse.up()
  await fimDa(page).toMatch(/pulou|pego/)
  const e = await page.evaluate(() => window.__metro.estado())
  expect(e.fase).toBe("pego")
  expect(e.violao).toBe("perdido")
  await expect(page.locator(".mt-fim h1")).toHaveText("te pegaram", { timeout: 5_000 })
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/metro-pego.png` })
  // de novo: volta pro começo
  await page.getByRole("button", { name: "de novo" }).click()
  await expect(page.getByRole("button", { name: "corre" })).toBeVisible()
  expect(erros).toEqual([])
})

test("metro: no computador, espaço começa e as setas desviam", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  const erros = await abrir(page, "/teste/metro?semente=3")
  await page.keyboard.press("Space")
  await expect.poll(() => page.evaluate(() => window.__metro.estado().fase)).toBe("fuga")
  await page.keyboard.down("ArrowLeft")
  await page.waitForTimeout(400)
  const e1 = await page.evaluate(() => window.__metro.fuga.voce.x)
  await page.keyboard.up("ArrowLeft")
  expect(e1).toBeLessThan(-0.2)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/metro-desktop.png` })
  await fimDa(page).toMatch(/pulou|pego/)
  expect(erros).toEqual([])
})
