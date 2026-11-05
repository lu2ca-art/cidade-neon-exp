import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T56) O NEXO COM UM NOTCH SÓ: no topo há só o notch (nada de cartão por baixo,
// nem cartão do "?", nem o "?" solto no canto). (missões claras, 02/11) com uma
// missão pegada, o notch diz "Agora: …" (o próximo passo concreto). (T41 B2/B3,
// lote D) tocar no notch expande ele (o objetivo inteiro e uma dica) e tocar de
// novo recolhe; o "?" é outra coisa: o notch diz "clique em qualquer lugar para
// saber mais" e tocar numa coisa do holo mostra a explicação POR CIMA dela
// (.l-explica), sem fazer a ação; o "?" de novo sai.
// (05/11) o tutorial no notch ("1 de 5") e a tela de recompensa do holo saíram:
// quem ensina é a trilha de pedras (disco/TrilhaPedrasTela.tsx). Este teste foi
// atualizado sem rodar (o dono roda).
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
  // pula as cenas que aparecerem (fala, escolhas), como no gps.spec
  for (let i = 0; i < 30; i++) {
    if (!(await page.locator(".l-cena").count())) break
    const fim = page.locator(".l-cena-fim button, .l-cena-escolhas button")
    if (await fim.count()) await fim.first().click({ force: true }).catch(() => {})
    else await page.mouse.click(200, 400)
    await page.waitForTimeout(400)
  }
}

test("um notch só: o Agora fala nele e o ? explica nele", async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  // uma missão pegada (a do Drew): o notch tem o próximo passo
  await entrar(page, "missao.drew")

  // só existe um notch, e o próximo passo da missão está nele ("Agora: …")
  const notch = page.locator(".l-ilha")
  await expect(notch).toHaveCount(1)
  const nexo = notch.locator(".l-holo-letreiro")
  const agora = nexo.locator(".l-nexo-agora")
  await expect(agora).toContainText(/^Agora: \S/, { timeout: 15_000 })
  // sem o tutorial antigo no notch nem a tela de recompensa do holo
  await expect(nexo).not.toHaveAttribute("data-passo", /.+/)
  await expect(nexo.locator(".l-nexo-passo")).toHaveCount(0)
  await expect(page.locator(".l-rec-holo")).toHaveCount(0)
  await expect(page.locator(".l-tut-alvo")).toHaveCount(0)
  // nenhum outro cartão do Nexo: nem o do tutorial, nem o do "?", nem o "?" solto
  await expect(page.locator(".l-tut")).toHaveCount(0)
  await expect(page.locator(".l-holo-ajuda")).toHaveCount(0)
  await expect(page.locator(".l-hud-cel.is-ajuda")).toHaveCount(0)
  await expect(page.locator('[data-info="ajuda"]')).toHaveCount(1)
  expect(await page.locator('.l-ilha [data-info="ajuda"]').count()).toBe(1)
  await page.waitForTimeout(600)
  await notch.screenshot({ path: `${PASTA}/1-notch-agora.png` })
  await page.screenshot({ path: `${PASTA}/1-tela-agora.png` })

  // tocar no notch: ele expande com o objetivo inteiro (a missão)
  const altura0 = (await notch.boundingBox())!.height
  await nexo.locator(".l-holo-letreiro-linha > b").click()
  const aberto = nexo.locator(".l-nexo-ajuda")
  await expect(aberto).toBeVisible()
  await expect(nexo).toHaveClass(/is-aberto/)
  await expect(aberto.locator("b")).not.toBeEmpty()
  await expect(aberto.locator("span")).toContainText(/agora:/)
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
  await expect(agora).toContainText(/clique em qualquer lugar/)
  await expect(aberto).toHaveCount(0)
  await page.locator('[data-info="camera"]').first().click({ force: true })
  const exp = page.locator(".l-explica")
  await expect(exp).toBeVisible()
  await expect(exp.locator("b")).toHaveText(/olho|câmera/i)
  await expect(page.locator(".l-explica-alvo")).toBeVisible()
  await expect(page.locator(".l-ilha")).toHaveCount(1)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${PASTA}/2b-tela-explica.png` })
  // o "?" de novo sai; o notch volta pro "Agora: …"
  await nexo.locator(".l-nexo-q").click()
  await expect(exp).toHaveCount(0)
  await expect(nexo).not.toHaveClass(/is-explica/)
  await expect(agora).toContainText(/^Agora: \S/)
  await notch.screenshot({ path: `${PASTA}/3-notch-de-volta.png` })
  expect(erros).toEqual([])
})
