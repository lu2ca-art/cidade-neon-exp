import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// A fumaça do mapa-disco jogado (portão antes de juntar no branch).
// Rota: /linha?mapa=disco, com o mesmo consentimento da fumaca.spec.ts.
// O save é semeado na fase "carreira" (já com o holo): a feira de missões só
// existe depois do prólogo (minhoca, casa, dunas, bar, oficina), que é longo e
// roteirizado demais pra uma fumaça sem hack frágil.
const PASTA = "test-results/fumaca-disco"
const SAVE = { versao: 2, disco: { fase: "carreira", holo: true } }

test.describe.configure({ mode: "serial" })

test("mapa-disco jogado: entrar, dirigir, feira, holo, sem pageerror", async ({ page }) => {
  mkdirSync(PASTA, { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript((save) => {
    localStorage.setItem("cidade-neon-analytics-consent", "essential")
    if (!localStorage.getItem("cn-linha-222")) localStorage.setItem("cn-linha-222", JSON.stringify(save))
  }, SAVE)

  const tempos: string[] = []
  const passo = async (nome: string, f: () => Promise<void>) => {
    const t0 = Date.now()
    await test.step(nome, f)
    await page.screenshot({ path: `${PASTA}/${nome.split(" ")[0]}.png` })
    tempos.push(`${nome}: ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  }

  await passo("1-entrar", async () => {
    const r = await page.goto("/linha?mapa=disco")
    expect(r?.status()).toBe(200)
    const entrar = page.locator(".l-btn-entrar")
    await expect(entrar).toBeVisible({ timeout: 60_000 })
    await entrar.click()
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60_000 })
    await expect(entrar).toBeHidden({ timeout: 30_000 })
    await page.waitForTimeout(3000)
  })

  await passo("2-dirigir", async () => {
    await page.keyboard.down("ArrowUp")
    await page.waitForTimeout(2500)
    await page.keyboard.down("ArrowRight")
    await page.waitForTimeout(1000)
    await page.keyboard.up("ArrowRight")
    await page.waitForTimeout(1500)
    await page.keyboard.up("ArrowUp")
    await page.waitForTimeout(500)
  })

  await passo("3-feira", async () => {
    // (holo-v2) a feira mora no mapa: o anel (ou o mapa) abre a mesma tela, com as missões
    // (o mapa-mini cobre o miolo do anel: toca na borda de cima, onde gira o texto)
    await page.locator(".l-holo-anel-bt").click({ position: { x: 75, y: 5 } })
    // (27/10) o mapa virou o drone: as missões abrem por cima da vista do alto (o 2D só com ?mapa2d)
    const feira = page.locator(".l-drone .l-mapa-missoes, .l-mapa-grande .l-mapa-missoes")
    await expect(feira).toBeVisible({ timeout: 30_000 })
    await page.screenshot({ path: `${PASTA}/3a-feira-aberta.png` })
    await feira.locator(".l-feira-bts button:not(.is-largar)").first().click()
    await expect(page.locator(".l-mapa-grande")).toBeHidden()
    await expect(page.locator(".l-drone .l-mapa-missoes")).toBeHidden()
    // pegou: o anel abre como o Omnitrix (a checklist girando em volta da bolinha)
    await expect(page.locator(".l-holo-anel.is-abre")).toBeVisible()
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "{}"))
    expect(save.disco?.missao).toBeTruthy()
  })

  await passo("4-holo", async () => {
    // o holo já nasce ligado na carreira: desliga (tecla H) e liga de novo pelo botão do óculos
    // (name exato: "ligar o holo" também casa por substring com "desligar o holo")
    await expect(page.getByRole("button", { name: "desligar o holo", exact: true })).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press("h")
    const ligar = page.getByRole("button", { name: "ligar o holo", exact: true })
    await expect(ligar).toBeVisible()
    await ligar.click()
    await expect(page.getByRole("button", { name: "desligar o holo", exact: true })).toBeVisible()
    // com a missão pegada: o 1º toque no anel abre a checklist em volta; o 2º abre o mapa com ela
    const anel = page.locator(".l-holo-anel-bt")
    await anel.click({ position: { x: 75, y: 5 } })
    await expect(page.locator(".l-holo-anel.is-abre")).toBeVisible()
    await anel.click({ position: { x: 75, y: 5 }, force: true })
    const painel = page.locator(".l-drone .l-mapa-missoes, .l-mapa-grande .l-mapa-missoes")
    await expect(painel).toBeVisible()
    await expect(painel.locator(".l-missoes-check li").first()).toBeVisible()
    await page.waitForTimeout(800)
  })

  await passo("5-sem-erros", async () => {
    expect(erros).toEqual([])
  })
  console.log("TEMPOS\n" + tempos.join("\n"))
})

// Fica de fora: o save zerado jogando o prólogo inteiro (minhoca, casa da D-Bee,
// dunas, bar, oficina) até a feira aparecer. É roteirizado, tem cenas e minijogos
// (ping pong, robôs) e precisa de input preciso; sem hack frágil não dá.
test.fixme("do zero: o prólogo até a feira abrir", async () => {})
// Pegar a feira e CUMPRIR a missão (peça jogável + show + jornal): mesmo motivo.
test.fixme("cumprir uma missão da feira até o jornal", async () => {})
