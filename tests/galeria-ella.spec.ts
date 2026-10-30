import { expect, test } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T22) a missão da Ella, inteira, na casa dela (a galeria): o diálogo, olhar a
// planta, olhar os quadros, pintar na tela, a tela pendurada tocando, a escolha
// e a porta (a galeria). Os gestos em 3D vão pelo gancho de teste (__gesto, só
// fora da produção); a fala avança tocando na legenda, como o jogador.
// Cena 3D: rode no Mac com Chrome de verdade (--use-angle=metal).
const PASTA = "test-results/galeria-ella"
test.beforeAll(() => mkdirSync(PASTA, { recursive: true }))

test("T22 · Ella: a planta → os quadros → pintar → a galeria", async ({ page }) => {
  test.setTimeout(180_000)
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto("/linha?mapa=disco&parte=missao.ella.casa")
  const entrar = page.locator(".l-btn-entrar")
  await expect(entrar).toBeVisible({ timeout: 60_000 })
  await entrar.click()
  // entrou na casa: a sala em 3D e a legenda por cima
  await expect(page.locator(".l-interior")).toBeVisible({ timeout: 30_000 })
  await expect(page.locator(".l-cena")).toBeVisible()
  const fotos = new Set<string>()
  const foto = async (nome: string) => { if (fotos.has(nome)) return; fotos.add(nome); await page.waitForTimeout(1800); await page.screenshot({ path: `${PASTA}/${nome}.png` }) }
  await foto("0-entrada")
  const gestos: string[] = []
  for (let i = 0; i < 160; i++) {
    if (await page.locator(".l-recompensa").isVisible()) break
    const escolha = page.locator(".l-cena-escolhas button")
    if (await escolha.first().isVisible().catch(() => false)) { await escolha.nth(2).click(); continue }
    const dica = page.locator(".l-dica3d small")
    if (await dica.isVisible().catch(() => false)) {
      const txt = (await dica.textContent()) ?? ""
      const qual = /pinta/.test(txt) ? "pintar" : /quadros/.test(txt) ? "quadros" : "planta"
      if (!gestos.includes(qual)) { gestos.push(qual); await foto(`${gestos.length}-${qual}`) }
      await page.evaluate(() => (window as unknown as { __gesto?: () => void }).__gesto?.())
      await page.waitForTimeout(qual === "pintar" ? 2400 : 400)
      if (qual === "pintar") await foto("3b-pendurada")
      continue
    }
    if (await page.locator(".l-cena-legenda, .l-cena-nucleo").first().isVisible().catch(() => false)) {
      await page.locator(".l-cena").click({ position: { x: 40, y: 200 } })
      await page.waitForTimeout(120)
      continue
    }
    await page.waitForTimeout(300)
  }
  expect(gestos).toEqual(["planta", "quadros", "pintar"])
  // a porta: a galeria abre, a CHUVA no Guitar Driver; a obra foi pra parede da galeria
  await expect(page.locator(".l-recompensa")).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${PASTA}/4-porta.png` })
  const s = await page.evaluate(() => ({ save: JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"), obras: JSON.parse(localStorage.getItem("cn-galeria-obras") ?? "[]") }))
  expect(s.save.disco.portas).toContain("galeria")
  expect(s.save.disco.feitas13).toContain("ella")
  expect(s.save.disco.passos13).toEqual(expect.arrayContaining(["ella:jogo", "ella:arte"]))
  expect(s.obras.length).toBeGreaterThan(0)
  expect(erros).toEqual([])
})
