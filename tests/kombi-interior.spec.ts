import { expect, test } from "@playwright/test"

// (T59) A Kombi por dentro: o interior modelado (public/models/kombi-interior.glb,
// meshopt) aparece na 1ª pessoa. ?parte=kombi.dentro abre a cidade livre já com a
// câmera de dentro. (a cena 3D: no Mac, metal; no CI ela pula)
test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })

test.describe("T59 na cena", () => {
  test.skip(!!process.env.CI, "a cena 3D: só no Mac")

  test("?parte=kombi.dentro: 1ª pessoa, o interior do Blender carregado e à vista, leve", async ({ page }) => {
    test.setTimeout(180_000)
    const erros: string[] = []
    page.on("pageerror", (e) => erros.push(e.message))
    await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
    await page.goto("/linha?mapa=disco&parte=kombi.dentro&medir")
    expect(await page.evaluate(() => localStorage.getItem("cn-linha-cam"))).toBe("dentro")
    const bt = page.locator(".l-btn-entrar")
    await expect(bt).toBeVisible({ timeout: 60_000 })
    await bt.click()
    await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo, null, { timeout: 60_000 })
    await page.getByText(/dar\s*partida/i).first().click({ force: true, timeout: 5_000 }).catch(() => {})
    // o botão da câmera diz "de fora" (está dentro)
    await expect(page.locator("[data-info=camera].is-dentro")).toHaveCount(1, { timeout: 30_000 })
    // o interior modelado: na cena, com os 7 pedaços (lata, fosco, cromo, brilho, pelo + 2 cascas) e visível
    const info = async () => page.evaluate(() => {
      type O = { name: string; visible: boolean; parent: O | null; children: O[]; geometry?: { index?: { count: number } } }
      const c = (window as unknown as { __cena?: { getObjectByName: (n: string) => O | undefined } }).__cena
      const g = c?.getObjectByName("kombi-interior")
      if (!g) return null
      let vis = true
      for (let o: O | null = g; o; o = o.parent) vis &&= o.visible
      const tris = g.children.reduce((s, m) => s + (m.geometry?.index?.count ?? 0) / 3, 0)
      return { pecas: g.children.length, vis, tris }
    })
    await expect.poll(info, { timeout: 60_000 }).toMatchObject({ pecas: 7, vis: true })
    const r = (await info())!
    // leve: o modelo inteiro (com as 2 cascas do pelo) abaixo de 120 mil triângulos
    expect(r.tris).toBeLessThan(120_000)
    await page.waitForTimeout(2_000)
    await page.screenshot({ path: "test-results/kombi-interior/dentro.png" })
    expect(erros).toEqual([])
  })
})
