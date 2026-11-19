import { expect, test } from "@playwright/test"

// T14: as motos das trincheiras. A MOTO é o 4º cartão, trancado por padrão
// (as motos chegam depois); ?motos libera. Escolhe a moto, larga, sobe numa
// parede (o piloto automático com ?parede anda nelas), passa um portão, sem
// erro, contra 4 motos rivais em 2 voltas.
// No Mac roda com a placa de vídeo (Metal); no GitHub, sem ela (swiftshader).
if (!process.env.CI) test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } })

const consentimento = () => localStorage.setItem("cidade-neon-analytics-consent", "essential")
type Est = { fase: string; cp: number; tempo: number; kmh: number; y: number; parede: boolean; paredes: number; volta: number; voltas: number; rivais: { nome: string; d: number }[] }
const estado = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __estado: () => Est }).__estado())
const ate = (page: import("@playwright/test").Page, f: string, timeout = 90_000) => page.waitForFunction(`(() => { const e = window.__estado(); return ${f} })()`, null, { timeout, polling: 100 })

test("a moto vem trancada (as motos chegam depois)", async ({ page }) => {
  await page.addInitScript(consentimento)
  await page.goto("/teste/trincheiras?auto&corrida")
  const card = page.locator('.tr-card[data-veiculo="moto"]')
  await expect(card).toBeVisible()
  await expect(card).toBeDisabled()
  await expect(card).toContainText("trancada")
  // e ?veiculo=moto sem ?motos não larga de moto
  await page.goto("/teste/trincheiras?veiculo=moto")
  await expect(page.locator(".tr-escolha")).toBeVisible()
})

test("de moto: escolhe, larga, sobe na parede e passa o 1º portão", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(consentimento)
  const r = await page.goto("/teste/trincheiras?auto&corrida&motos&parede")
  expect(r?.status()).toBe(200)
  await page.waitForFunction(() => "__estado" in window, null, { timeout: 60_000 })
  const card = page.locator('.tr-card[data-veiculo="moto"]')
  await expect(card).toBeEnabled()
  await card.click()
  await expect(page.locator(".tr-escolha")).toHaveCount(0)
  await ate(page, 'e.fase === "correndo"', 60_000)
  const e0 = await estado(page)
  expect(e0.voltas).toBe(2)
  expect(e0.rivais).toHaveLength(4)
  // sobe numa parede: anda nela, acima da curva
  await ate(page, "e.parede && e.y > 4.5")
  // e passa o portão do RIO SECO A
  await ate(page, "e.cp >= 1")
  const e = await estado(page)
  expect(e.paredes).toBeGreaterThanOrEqual(1)
  expect(e.kmh).toBeGreaterThan(30)
  for (const rv of e.rivais) expect(rv.d).toBeGreaterThan(50)
  await expect(page.locator(".tr-cp")).toContainText("volta 1/2")
  await expect(page.locator(".tr-cp")).toContainText("1/3")
  expect(erros).toEqual([])
})
