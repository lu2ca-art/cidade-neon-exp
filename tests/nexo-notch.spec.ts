import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T56) O NEXO COM UM NOTCH SÓ: no topo há só o notch (nada de cartão do tutorial
// por baixo, nem cartão do "?", nem o "?" solto no canto); o passo do tutorial
// aparece dentro dele com o "1 de 5" discreto. (T41 B2/B3, lote D) tocar no notch
// expande ele (o objetivo inteiro e uma dica) e tocar de novo recolhe; o "?" é
// outra coisa: o notch diz "clique em qualquer lugar para saber mais" e tocar numa
// coisa do holo mostra a explicação POR CIMA dela (.l-explica), sem fazer a ação;
// o "?" de novo sai. ?parte=dunas começa na tela do holo lá fora, antes do tutorial.
const PASTA = "test-results/nexo-notch"

async function entrar(page: Page, parte: string) {
  await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential") })
  const r = await page.goto(`/linha?mapa=disco&parte=${parte}&medir`)
  expect(r?.status()).toBe(200)
  const bt = page.locator(".l-btn-entrar")
  await expect(bt).toBeVisible({ timeout: 60_000 })
  await bt.click()
  await expect(bt).toBeHidden({ timeout: 30_000 })
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo, null, { timeout: 60_000 })
}

test("um notch só: o passo do tutorial fala nele e o ? explica nele", async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "dunas")
  const rec = page.locator(".l-rec-holo")
  await expect(rec).toBeVisible({ timeout: 30_000 })
  await page.locator(".l-rec-holo-bt").click()
  await expect(rec).toBeHidden()

  // só existe um notch, e o passo do tutorial está nele
  const notch = page.locator(".l-ilha")
  await expect(notch).toHaveCount(1)
  const nexo = notch.locator(".l-holo-letreiro")
  await expect(nexo).toHaveAttribute("data-passo", "mapa", { timeout: 15_000 })
  await expect(nexo.locator(".l-nexo-passo")).toContainText(/toca no mapa/)
  await expect(nexo.locator(".l-nexo-conta")).toHaveText(/1 de 5/)
  // nenhum outro cartão do Nexo: nem o do tutorial, nem o do "?", nem o "?" solto
  await expect(page.locator(".l-tut")).toHaveCount(0)
  await expect(page.locator(".l-holo-ajuda")).toHaveCount(0)
  await expect(page.locator(".l-hud-cel.is-ajuda")).toHaveCount(0)
  await expect(page.locator('[data-info="ajuda"]')).toHaveCount(1)
  expect(await page.locator('.l-ilha [data-info="ajuda"]').count()).toBe(1)
  // o destaque escuro em volta do mapa não apaga o notch: ele fica por cima
  await expect(page.locator(".l-tut-alvo.is-escuro")).toBeVisible()
  const zs = await page.evaluate(() => [getComputedStyle(document.querySelector(".l-ilha")!).zIndex, getComputedStyle(document.querySelector(".l-tut-alvo")!).zIndex].map(Number))
  expect(zs[0]).toBeGreaterThan(zs[1])
  await page.waitForTimeout(600)
  await notch.screenshot({ path: `${PASTA}/1-notch-passo.png` })
  await page.screenshot({ path: `${PASTA}/1-tela-passo.png` })

  // tocar no notch: ele expande com o objetivo inteiro (o passo do tutorial: o mapa)
  const altura0 = (await notch.boundingBox())!.height
  await nexo.locator(".l-holo-letreiro-linha > b").click()
  const aberto = nexo.locator(".l-nexo-ajuda")
  await expect(aberto).toBeVisible()
  await expect(nexo).toHaveClass(/is-aberto/)
  await expect(aberto.locator("b")).toContainText(/mapa/i)
  expect((await notch.boundingBox())!.height, "o notch cresceu").toBeGreaterThan(altura0 + 20)
  await expect(page.locator(".l-holo-ajuda")).toHaveCount(0)
  await page.waitForTimeout(400)
  await notch.screenshot({ path: `${PASTA}/2-notch-aberto.png` })
  // tocar de novo recolhe
  await nexo.locator(".l-holo-letreiro-linha > b").click()
  await expect(aberto).toHaveCount(0)
  await expect(nexo).not.toHaveClass(/is-aberto/)

  // o "?": o notch pergunta; tocar numa coisa do holo explica por cima dela (e não faz a ação)
  await nexo.locator(".l-nexo-q").click()
  await expect(nexo).toHaveClass(/is-explica/)
  await expect(nexo.locator(".l-nexo-agora")).toContainText(/clique em qualquer lugar/)
  await expect(aberto).toHaveCount(0)
  await page.locator('[data-info="camera"]').first().click({ force: true })
  const exp = page.locator(".l-explica")
  await expect(exp).toBeVisible()
  await expect(exp.locator("b")).toHaveText(/olho|câmera/i)
  await expect(page.locator(".l-explica-alvo")).toBeVisible()
  await expect(page.locator(".l-ilha")).toHaveCount(1)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${PASTA}/2b-tela-explica.png` })
  // o "?" de novo sai; o passo continua no notch, sem avançar
  await nexo.locator(".l-nexo-q").click()
  await expect(exp).toHaveCount(0)
  await expect(nexo).not.toHaveClass(/is-explica/)
  await expect(nexo).toHaveAttribute("data-passo", "mapa")

  // feito o passo, o próximo entra no mesmo notch ("2 de 5")
  await page.locator('[data-info="mapa"]').click({ force: true })
  await expect(nexo).toHaveAttribute("data-passo", "rota", { timeout: 15_000 })
  await expect(nexo.locator(".l-nexo-conta")).toHaveText(/2 de 5/)
  await expect(nexo.locator(".l-nexo-passo")).toContainText(/faixa acesa/)
  await expect(page.locator(".l-ilha")).toHaveCount(1)
  await page.waitForTimeout(600)
  await notch.screenshot({ path: `${PASTA}/3-notch-2de5.png` })
  await page.screenshot({ path: `${PASTA}/3-tela-2de5.png` })
  expect(erros).toEqual([])
})
