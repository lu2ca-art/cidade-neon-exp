import { expect, test } from "@playwright/test"

// T13: a corrida nas trincheiras. Escolhe cada veículo, larga, passa o 1º
// portão (o do RIO SECO A), sem erro. Os rivais andam. E uma volta inteira de
// patins: chega e guarda o recorde no aparelho.
// No Mac roda com a placa de vídeo (Metal); no GitHub, sem ela (swiftshader).
if (!process.env.CI) test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] } })

const consentimento = () => localStorage.setItem("cidade-neon-analytics-consent", "essential")
type Est = { fase: string; cp: number; tempo: number; kmh: number; lugar: number; rivais: { nome: string; d: number; fim: number | null }[]; resultado: { tempo: number; novo: boolean } | null }
const estado = (page: import("@playwright/test").Page) => page.evaluate(() => (window as unknown as { __estado: () => Est }).__estado())

for (const v of ["bmx", "patins", "skate"] as const) {
  test(`corrida de ${v}: escolhe, larga e passa o 1º portão`, async ({ page }) => {
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    await page.addInitScript(consentimento)
    const r = await page.goto("/teste/trincheiras?auto&corrida")
    expect(r?.status()).toBe(200)
    await expect(page.getByText("A CORRIDA DAS TRINCHEIRAS")).toBeVisible()
    await page.waitForFunction(() => "__estado" in window, null, { timeout: 60_000 })
    expect((await estado(page)).fase).toBe("escolha")
    await page.locator(`.tr-card[data-veiculo="${v}"]`).click()
    await expect(page.locator(".tr-escolha")).toHaveCount(0)
    expect(["contagem", "correndo"]).toContain((await estado(page)).fase)
    await page.waitForFunction(() => (window as unknown as { __estado: () => Est }).__estado().fase === "correndo", null, { timeout: 60_000 })
    await page.waitForFunction(() => (window as unknown as { __estado: () => Est }).__estado().cp >= 1, null, { timeout: 90_000 })
    const e = await estado(page)
    expect(e.cp).toBeGreaterThanOrEqual(1)
    expect(e.tempo).toBeGreaterThan(3)
    expect(e.kmh).toBeGreaterThan(30)
    // os 3 rivais saíram da largada
    expect(e.rivais).toHaveLength(3)
    for (const rv of e.rivais) expect(rv.d).toBeGreaterThan(50)
    await expect(page.locator(".tr-tempo")).not.toHaveText("0:00.00")
    await expect(page.locator(".tr-cp")).toContainText("1/3")
    expect(erros).toEqual([])
  })
}

test("uma volta de patins: chega, mostra o resultado e guarda o recorde", async ({ page }) => {
  test.skip(!!process.env.CI, "volta inteira (1 min) só no Mac, com placa de vídeo")
  test.setTimeout(180_000)
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(consentimento)
  await page.goto("/teste/trincheiras?auto&veiculo=patins")
  await page.waitForFunction(() => "__estado" in window, null, { timeout: 60_000 })
  await page.waitForFunction(() => (window as unknown as { __estado: () => Est }).__estado().fase === "chegou", null, { timeout: 150_000, polling: 500 })
  const e = await estado(page)
  expect(e.cp).toBe(3)
  expect(e.resultado?.novo).toBe(true)
  await expect(page.locator(".tr-fim")).toBeVisible()
  await expect(page.getByText("NOVO RECORDE")).toBeVisible()
  const rec = await page.evaluate(() => JSON.parse(localStorage.getItem("trincheiras-corrida-v1") ?? "{}"))
  expect(rec.patins.ms).toBeGreaterThan(30_000)
  expect(rec.patins.rastro.length).toBeGreaterThan(400)
  // correr de novo: o fantasma (o recorde) corre junto
  await page.getByRole("button", { name: "correr de novo" }).click()
  await expect(page.getByText("o fantasma corre junto")).toBeVisible()
  expect(erros).toEqual([])
})
