import { expect, test } from "@playwright/test"

const consentimento = () => localStorage.setItem("cidade-neon-analytics-consent", "essential")

for (const rota of ["/", "/?screen=home", "/linha"]) {
  test(`${rota} abre sem erro de JavaScript`, async ({ page }) => {
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    await page.addInitScript(consentimento)
    const r = await page.goto(rota)
    expect(r?.status()).toBe(200)
    await page.waitForTimeout(4000)
    expect(erros).toEqual([])
  })
}

test("/linha mostra o botão de entrar", async ({ page }) => {
  await page.addInitScript(consentimento)
  await page.goto("/linha")
  await expect(page.locator(".l-btn-entrar")).toBeVisible({ timeout: 60_000 })
})
