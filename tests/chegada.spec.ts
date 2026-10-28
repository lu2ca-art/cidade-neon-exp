import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T37) A chegada: do buraco de minhoca até a porta da casinha.
// Dirige a cena 3D: roda no Mac com --use-angle=metal (fora do CI, que não tem placa).
//   CHROME_PATH=".../Google Chrome" PORTA=3137 bunx playwright test tests/chegada.spec.ts
const PASTA = "test-results/chegada"
if (process.platform === "darwin") {
  test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })
}
test.describe.configure({ mode: "serial" })

async function entrarPeloTunel(page: Page, parte: string, erros: string[]) {
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`/linha?mapa=disco&parte=${parte}`)
  const entrar = page.locator(".l-btn-entrar")
  await expect(entrar).toBeVisible({ timeout: 60_000 })
  await entrar.click()
  // todo login passa pelo túnel; um toque pula
  const tunel = page.locator(".l-minhoca:not(.is-saida)")
  await expect(tunel).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await tunel.click()
  await expect(tunel).toBeHidden({ timeout: 10_000 })
}

const salvo = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))

test("?parte=minhoca: o túnel, a Kombi no chão, a cena de lado, a porta (sem erro)", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  await entrarPeloTunel(page, "minhoca", erros)
  const s = await salvo(page)
  expect(s?.disco?.fase).toBe("casa")
  // o céu da hora real (CHEGADA.ceu = "real")
  const agora = new Date().getHours() + new Date().getMinutes() / 60
  const d = Math.abs((s?.hora ?? -99) - agora)
  expect(Math.min(d, 24 - d)).toBeLessThan(1)
  // a cena de lado: as faixas de cinema entram perto da casa
  await expect(page.locator(".l-corte")).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${PASTA}/1-cena-de-lado.png` })
  // a Kombi para, a porta abre e só então a cena da porta (a D-Bee recebendo ele)
  await expect(page.locator(".l-cena")).toBeVisible({ timeout: 60_000 })
  await expect(page.locator(".l-corte")).toBeHidden()
  expect(erros).toEqual([])
})

test("?parte=casa: quem parou na chegada entra pelo túnel e chega na porta", async ({ page }) => {
  const erros: string[] = []
  await entrarPeloTunel(page, "casa", erros)
  await expect(page.locator(".l-cena")).toBeVisible({ timeout: 90_000 })
  expect((await salvo(page))?.disco?.fase).toBe("casa")
  expect(erros).toEqual([])
})

test("?parte=chegada: com save existente, o login cai na casinha e segue (sem a cena da D-Bee)", async ({ page }) => {
  const erros: string[] = []
  await entrarPeloTunel(page, "chegada", erros)
  await expect(page.locator(".l-corte")).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: `${PASTA}/3-login-porta.png` })
  await expect(page.locator(".l-corte")).toBeHidden({ timeout: 60_000 })
  // não repete a cena da casa: a carreira segue de onde estava
  await page.waitForTimeout(1500)
  await expect(page.locator(".l-cena")).toBeHidden()
  expect((await salvo(page))?.disco?.fase).toBe("carreira")
  expect(erros).toEqual([])
})
