import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T19) a missão do LU2CA, o live: a arte (escrever a letra) → o show (o
// prelúdio → a escolha do instrumento → o cantar com o coeficiente de afinação),
// e o baixo com o toque contínuo. Sem pageerror.
const PASTA = "test-results/show"

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

test("missao.lu2ca: a letra → o prelúdio → cantar, sem erro", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true })
  const erros = await abrir(page, "missao.lu2ca.letra")
  // a arte: escrever a letra (4 versos; o 3º escrito à mão)
  const letra = page.locator(".l-letra")
  await expect(letra).toBeVisible({ timeout: 30_000 })
  await page.screenshot({ path: `${PASTA}/1-letra.png` })
  await letra.locator(".l-letra-opcoes button").first().click()
  await page.keyboard.press("2")
  await letra.locator(".l-letra-opcoes .is-livre").click()
  await letra.locator(".l-letra-livre input").fill("a flor que eu trouxe do deserto")
  await letra.locator(".l-letra-livre button[type=submit]").click()
  await page.keyboard.press("3")
  await expect(letra.locator(".l-letra-papel p.is-escrito")).toHaveCount(4)
  await page.screenshot({ path: `${PASTA}/2-letra-pronta.png` })
  await letra.locator(".is-subir").click()
  await expect(letra).toBeHidden()
  const s = await save(page)
  expect(s.disco.passos13).toContain("lu2ca:arte")
  expect(s.disco.letras.nectar).toHaveLength(4)
  expect(s.disco.letras.nectar[2]).toBe("a flor que eu trouxe do deserto")
  // ainda no palco, o jogo segue sozinho: o show abre com o prelúdio (o filmezinho)
  const preludio = page.locator(".l-show.is-preludio")
  await expect(preludio).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${PASTA}/3-preludio.png` })
  // ele termina sozinho (~5 s) e aparecem as opções de instrumento
  const banda = page.locator(".l-show-banda")
  await expect(banda).toBeVisible({ timeout: 15_000 })
  await expect(preludio).toBeHidden()
  await page.screenshot({ path: `${PASTA}/4-instrumentos.png` })
  // cantar: o afinador com o coeficiente; segura ↑ um pouco e solta
  await banda.locator("button", { hasText: "cantar" }).click()
  await expect(page.locator(".l-show-carrega")).toBeHidden({ timeout: 60_000 })
  await page.keyboard.down("ArrowUp")
  await page.waitForTimeout(800)
  await page.keyboard.up("ArrowUp")
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${PASTA}/5-cantar.png` })
  await expect(page.locator(".l-show-fim", { hasText: "ainda não saiu" })).toHaveCount(0)
  expect(erros).toEqual([])
})

test("missao.lu2ca.show: pular o prelúdio, o baixo com o dedo na tela e ↑ ↓", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true })
  const erros = await abrir(page, "missao.lu2ca.show")
  const preludio = page.locator(".l-show.is-preludio")
  await expect(preludio).toBeVisible({ timeout: 30_000 })
  // um toque pula
  await preludio.click()
  await expect(page.locator(".l-show-banda")).toBeVisible()
  await page.locator(".l-show-banda button", { hasText: "baixo" }).click()
  await expect(page.locator(".l-show-carrega")).toBeHidden({ timeout: 60_000 })
  // o toque contínuo: o dedo desce na tela, anda e fica
  const toque = page.locator(".l-show-toque")
  const box = (await toque.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.7)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.4, { steps: 8 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${PASTA}/6-baixo-dedo.png` })
  await page.mouse.up()
  // as setas: um toque e segurar
  await page.keyboard.press("ArrowDown")
  await page.keyboard.down("ArrowUp")
  await page.waitForTimeout(700)
  await page.keyboard.up("ArrowUp")
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${PASTA}/7-baixo-setas.png` })
  expect(erros).toEqual([])
})
