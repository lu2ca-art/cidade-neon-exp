import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T07) O tutorial do drift e do holo, do holo entregue até o fim do tutorial.
// 1) ?parte=casa.holo: a cena da casa a partir da entrega; ele pega o holo da mão
//    dela; lá fora, a tela do holo; o "?" destaca só o ícone do mapa; e os passos
//    das dunas, um por vez (o mapa, o caminho, o GPS, o drift, o anel), cada um só
//    avançando quando ele faz.
// 2) ?parte=subir.voo: depois da oficina, o voo e o turbo.
// Precisa de ?medir (expõe __jogo no build de produção).
const PASTA = "test-results/tutorial-holo"

type J = Record<string, number | boolean | undefined>
const jogo = (page: Page) => page.evaluate(() => (window as unknown as { __jogo: J }).__jogo)
const historia = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem("cn-linha-222") ?? "null")?.disco ?? null) as { fase: string; tutorial?: string[]; drone?: boolean } | null)
// (T56) o passo fala dentro do notch (um notch só)
const passo = (page: Page) => page.locator(".l-holo-letreiro[data-passo]")
const fimTut = (page: Page) => page.locator(".l-holo-letreiro.is-fim")

async function entrar(page: Page, parte: string) {
  await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential") })
  const r = await page.goto(`/linha?mapa=disco&caderno&parte=${parte}&medir`)
  expect(r?.status()).toBe(200)
  const bt = page.locator(".l-btn-entrar")
  await expect(bt).toBeVisible({ timeout: 60_000 })
  await bt.click()
  await expect(bt).toBeHidden({ timeout: 30_000 })
  await page.waitForFunction(() => !!(window as unknown as { __jogo?: unknown }).__jogo, null, { timeout: 60_000 })
}

// o passo de agora vira o próximo (o "✓" aparece no meio)
async function esperarPasso(page: Page, id: string, timeout = 15_000) {
  await expect(passo(page)).toHaveAttribute("data-passo", id, { timeout })
}

test("do holo entregue até o fim do tutorial das dunas", async ({ page }) => {
  test.setTimeout(300_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "casa.holo")

  // a Kombi chega na porta (a chegada sozinha); se demorar, põe ela lá
  const cena = page.locator(".l-cena")
  if (!(await cena.isVisible({ timeout: 25_000 }).catch(() => false))) {
    await page.evaluate(() => { const j = (window as unknown as { __jogo: J }).__jogo; Object.assign(j, { wx: -1990, wz: -1755, v: 0, chegadaCasa: false }) })
  }
  await expect(cena).toBeVisible({ timeout: 30_000 })

  // as falas até a entrega: toca pra seguir; a mão dela com o holo
  const entrega = page.locator(".l-entrega")
  for (let i = 0; i < 20 && !(await entrega.isVisible().catch(() => false)); i++) {
    await cena.click({ position: { x: 200, y: 300 }, force: true }).catch(() => {})
    await page.waitForTimeout(500)
  }
  await expect(entrega).toBeVisible()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${PASTA}/1-entrega.png` })
  // ele toca no holo: vem pra mão dele, e a cena segue
  await page.locator(".l-entrega-holo").click()
  await expect(entrega).toBeHidden({ timeout: 5_000 })
  for (let i = 0; i < 20 && (await cena.isVisible().catch(() => false)); i++) {
    const fim = page.locator(".l-cena-fim button, .l-cena-escolhas button")
    if (await fim.count()) await fim.first().click({ force: true }).catch(() => {})
    else await cena.click({ position: { x: 200, y: 300 }, force: true }).catch(() => {})
    await page.waitForTimeout(500)
  }
  await expect(cena).toBeHidden({ timeout: 10_000 })

  // lá fora: a tela do holo, grande, com o como funciona
  const rec = page.locator(".l-rec-holo")
  await expect(rec).toBeVisible({ timeout: 10_000 })
  await expect(rec.locator(".l-rec-holo-caixa > b")).toHaveText(/o holo/i)
  await expect(rec.locator(".l-rec-holo-como li")).toHaveCount(4)
  expect((await historia(page))?.fase).toBe("dunas")
  await page.screenshot({ path: `${PASTA}/2-recompensa.png` })
  await page.locator(".l-rec-holo-bt").click()
  await expect(rec).toBeHidden()

  // 1) o "?": só o ícone do holo (o mapa) aceso, o resto escuro
  await esperarPasso(page, "mapa")
  const alvo = page.locator(".l-tut-alvo.is-escuro")
  await expect(alvo).toBeVisible()
  const [a, m] = await Promise.all([alvo.boundingBox(), page.locator('[data-info="mapa"]').boundingBox()])
  expect(a && m && Math.abs(a.x + a.width / 2 - (m.x + m.width / 2)) < 6 && Math.abs(a.y + a.height / 2 - (m.y + m.height / 2)) < 6, "o destaque em volta do mapa").toBeTruthy()
  await page.screenshot({ path: `${PASTA}/3-destaque.png` })
  // o passo não avança sozinho
  await page.waitForTimeout(2500)
  await esperarPasso(page, "mapa", 100)
  // tocou no mapa: o drone sobe
  await page.locator('[data-info="mapa"]').click({ force: true })
  await esperarPasso(page, "rota")
  await expect(page.locator(".l-tut-alvo.is-escuro")).toHaveCount(0)
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${PASTA}/4-drone.png` })
  // 2) toca de novo: volta pra rua
  await page.locator('[data-info="mapa"]').click({ force: true })
  await esperarPasso(page, "gps")

  // 3) o GPS: vira a Kombi até o ícone acender no meio (parada na areia)
  await page.waitForTimeout(800)
  const gpsAlvo = page.locator(".l-gps-alvo")
  await expect(gpsAlvo.locator("svg")).toBeVisible({ timeout: 10_000 })
  // primeiro de costas pro alvo: o passo não avança sozinho
  await page.keyboard.press("Shift")
  await page.evaluate(() => { const j = (window as unknown as { __jogo: J }).__jogo; j.v = 0; j.steer = 0; j.rumo = (j.rumo as number) + 2.2 })
  await page.waitForTimeout(1500)
  await esperarPasso(page, "gps", 100)
  for (let i = 0; i < 6; i++) {
    const ang = Number(await gpsAlvo.getAttribute("data-ang"))
    if (Math.abs(ang) < 3) break
    await page.keyboard.press("Shift")
    await page.evaluate((ang) => { const j = (window as unknown as { __jogo: J }).__jogo; j.v = 0; j.steer = 0; j.rumo = (j.rumo as number) - (ang * Math.PI) / 180 }, ang)
    await page.waitForTimeout(400)
  }
  // mirado, parado: ainda não; acelerando com o ícone aceso, sim
  await page.waitForTimeout(1500)
  await esperarPasso(page, "gps", 100)
  await page.keyboard.down("ArrowUp")
  await esperarPasso(page, "drift", 10_000)
  await page.keyboard.up("ArrowUp")

  // 4) o drift: acelera e puxa o freio de mão virando (Q + ←)
  await page.keyboard.down("ArrowUp")
  await page.waitForTimeout(3500)
  for (let k = 0; k < 4 && (await passo(page).getAttribute("data-passo")) === "drift"; k++) {
    await page.keyboard.down("q"); await page.keyboard.down(k % 2 ? "ArrowRight" : "ArrowLeft")
    await page.waitForTimeout(1300)
    await page.keyboard.up("q"); await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowRight")
    await page.waitForTimeout(1500)
  }
  await page.keyboard.up("ArrowUp")
  const drifts = await jogo(page)
  console.log("depois do drift:", JSON.stringify({ v: drifts.v, drift: drifts.drift, passo: await passo(page).getAttribute("data-passo").catch(() => null) }))
  await esperarPasso(page, "anel", 8_000)

  // 5) o anel: o próximo passo
  await page.locator('[data-info="anel"]').click({ force: true })
  await expect(fimTut(page)).toBeVisible({ timeout: 5_000 })
  await expect(fimTut(page).locator(".l-nexo-passo")).toHaveText(/GPS/)
  const h = await historia(page)
  expect(h?.tutorial).toEqual(expect.arrayContaining(["recompensa", "mapa", "rota", "gps", "drift", "anel"]))
  expect(h?.drone).toBe(true)
  await page.screenshot({ path: `${PASTA}/5-fim.png` })
  expect(erros).toEqual([])
})

test("o tutorial do voo e do turbo (depois da oficina)", async ({ page }) => {
  test.setTimeout(180_000)
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await entrar(page, "subir.voo")
  await esperarPasso(page, "voo", 30_000)
  await expect(passo(page)).toContainText(/voa/)
  // segura o espaço: o propulsor liga e ela sobe
  await page.keyboard.down(" ")
  await page.waitForTimeout(2600)
  await page.keyboard.up(" ")
  await esperarPasso(page, "turbo", 8_000)
  // o turbo vazio: espera (o drift e o voo enchem); cheio, um toque
  await page.evaluate(() => { const j = (window as unknown as { __jogo: J }).__jogo; j.carga = 0 })
  await page.waitForTimeout(500)
  await expect(passo(page)).toContainText(/enchem o turbo/)
  await page.evaluate(() => { const j = (window as unknown as { __jogo: J }).__jogo; j.carga = 1 })
  const bt = page.locator('[data-info="turbo"]')
  const b = await bt.boundingBox()
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2)
  await page.mouse.down(); await page.waitForTimeout(450); await page.mouse.up()
  await expect(fimTut(page)).toBeVisible({ timeout: 8_000 })
  await expect(fimTut(page).locator(".l-nexo-passo")).toHaveText(/pista acesa|o mapa diz o resto/)
  const h = await historia(page)
  expect(h?.tutorial).toEqual(expect.arrayContaining(["voo", "turbo"]))
  await page.screenshot({ path: `${PASTA}/6-voo-fim.png` })
  expect(erros).toEqual([])
})
