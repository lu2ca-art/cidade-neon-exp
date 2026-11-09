import { expect, test, type Page } from "@playwright/test"
import { mkdirSync } from "node:fs"

// (T15, T18, T23, T24, T25, T16 — 28/10) as missões das pessoas, cada uma até a
// porta abrir: a arte → o jogo → a porta → a recompensa, sem erro. As peças que
// são jogos longos (o ping pong, a sintonia, a máquina, a sinuca) terminam pelo
// gancho de teste (__cnMissao, só fora da produção); as artes são jogadas de verdade.
const PASTA = "test-results/missoes-pessoas"

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
const gancho = (page: Page, f: "chegou" | "fimPeca", arg?: string) =>
  page.waitForFunction(([f, arg]) => {
    const m = (window as unknown as { __cnMissao?: Record<string, (a?: string) => unknown> }).__cnMissao
    if (!m) return false
    return m[f!](arg ?? undefined) !== false
  }, [f, arg] as const, { timeout: 20_000 })
async function porta(page: Page, nome: string, porta: string) {
  const r = page.locator(".l-recompensa")
  await expect(r).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${PASTA}/${nome}-porta.png` })
  expect((await save(page)).disco.portas).toContain(porta)
}

test.beforeAll(() => mkdirSync(PASTA, { recursive: true }))

test("T15 · Drew: dançar → (de patins) o ping pong → o ginásio", async ({ page }) => {
  const erros = await abrir(page, "missao.drew.arte")
  const danca = page.locator(".l-peca.is-danca")
  await expect(danca).toBeVisible({ timeout: 30_000 })
  // bate no tempo algumas vezes (espaço) e deixa a música acabar
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(680) }
  await page.screenshot({ path: `${PASTA}/drew-1-danca.png` })
  await expect(danca.locator(".is-seguir")).toBeVisible({ timeout: 30_000 })
  await danca.locator(".is-seguir").click()
  expect((await save(page)).disco.passos13).toContain("drew:arte")
  // ainda na casa dele, o ping pong abre sozinho
  await expect(page.locator(".l-pingpong")).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await gancho(page, "fimPeca")
  await porta(page, "drew", "ginasio")
  expect(erros).toEqual([])
})

test("T18 · Xeriff: a vinheta → sintonizar → a rádio e as frequências", async ({ page }) => {
  const erros = await abrir(page, "missao.xeriff.arte")
  const v = page.locator(".l-peca.is-vinheta")
  await expect(v).toBeVisible({ timeout: 30_000 })
  for (const k of ["1", "2", "3", "1"]) await page.keyboard.press(k)
  await expect(v.locator(".l-vinheta-trilhas li.is-feita")).toHaveCount(4)
  await page.keyboard.press("Enter")
  await expect(v.locator(".l-vinheta-fita.is-rec")).toBeVisible()
  await page.screenshot({ path: `${PASTA}/xeriff-1-vinheta.png` })
  await v.locator("button", { hasText: "levar pro Xeriff" }).click({ timeout: 20_000 })
  expect((await save(page)).disco.obras13["xeriff:arte"]).toHaveLength(4)
  await expect(page.locator(".l-prova-missao")).toBeVisible({ timeout: 15_000 })
  await gancho(page, "fimPeca")
  await porta(page, "xeriff", "radio-frequencias")
  expect(erros).toEqual([])
})

test("T23 · Notti: a trilha 8 bits → a máquina → as 7 máquinas", async ({ page }) => {
  const erros = await abrir(page, "missao.notti.arte")
  const t = page.locator(".l-peca.is-trilha8")
  await expect(t).toBeVisible({ timeout: 30_000 })
  const celulas = t.locator(".l-trilha8-linha button")
  for (const i of [0, 2, 4, 6, 9, 13]) await celulas.nth(i).click()
  await page.screenshot({ path: `${PASTA}/notti-1-trilha.png` })
  await t.locator(".is-seguir").click()
  const maq = page.locator(".l-peca.is-maquina")
  await expect(maq).toBeVisible({ timeout: 15_000 })
  await maq.locator(".is-seguir").click()
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${PASTA}/notti-2-maquina.png` })
  await gancho(page, "fimPeca")
  await porta(page, "notti", "fliperama")
  expect(erros).toEqual([])
})

test("T24 · Nizzy: o clipe → a montanha-russa → o parque", async ({ page }) => {
  const erros = await abrir(page, "missao.nizzy.arte")
  const c = page.locator(".l-peca.is-clipe")
  await expect(c).toBeVisible({ timeout: 30_000 })
  for (const k of ["2", "3", "1", "2", "3", "1", "2", "3"]) { await page.keyboard.press(k); await page.waitForTimeout(300) }
  await expect(c.locator(".l-clipe-fita li")).toHaveCount(8)
  await page.screenshot({ path: `${PASTA}/nizzy-1-clipe.png` })
  await c.locator(".is-seguir").click()
  // o jogo é na rua: andar na montanha-russa (o evento), depois a porta no palco dela
  await page.waitForFunction(() => !!(window as unknown as { __cnMissao?: unknown }).__cnMissao)
  await page.evaluate(() => (window as unknown as { __cnMissao: { evento: (e: string) => void } }).__cnMissao.evento("montanha"))
  await expect.poll(async () => (await save(page)).disco.passos13).toContain("nizzy:jogo")
  await gancho(page, "chegou")
  await porta(page, "nizzy", "parque")
  expect(erros).toEqual([])
})

// (09/11, ep. 5) a barganha é no 3D da feira (corte com o dedo): aqui, do prato em diante
test("T25 · Tony Gordo: cozinhar o que veio da feira → os canteiros", async ({ page }) => {
  const erros = await abrir(page, "missao.tony.arte")
  const cz = page.locator(".l-peca.is-cozinhar")
  await expect(cz).toBeVisible({ timeout: 15_000 })
  for (const k of ["1", "2", "3"]) await page.keyboard.press(k)
  await page.keyboard.press("Enter")
  await page.keyboard.down("Space"); await page.waitForTimeout(2200); await page.keyboard.up("Space")
  await expect(cz.locator(".l-cozinhar-prato")).toBeVisible()
  await page.screenshot({ path: `${PASTA}/tony-2-prato.png` })
  await cz.locator(".is-seguir").click()
  await porta(page, "tony", "canteiros")
  expect(erros).toEqual([])
})

test("T16 · Mubarak: o disco antigo → a sinuca → a loja de discos (abre a loja)", async ({ page }) => {
  const erros = await abrir(page, "missao.mubarak.arte")
  const d = page.locator(".l-peca.is-disco-antigo")
  await expect(d).toBeVisible({ timeout: 30_000 })
  await page.keyboard.press("1")
  await d.locator(".l-peca-fim .is-seguir").click()
  await expect(d.locator(".l-disco-vitrola.is-tocando")).toBeVisible()
  await page.screenshot({ path: `${PASTA}/mubarak-1-disco.png` })
  await d.locator(".l-peca-fim .is-seguir", { hasText: "seguir" }).click({ timeout: 25_000 })
  const s = page.locator(".l-peca.is-sinuca .sn-raiz")
  await expect(s).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${PASTA}/mubarak-2-sinuca.png` })
  await gancho(page, "fimPeca")
  await porta(page, "mubarak", "loja-discos")
  await page.locator(".l-recompensa-caixa > button").click()
  await expect(page.locator(".l-loja")).toBeVisible({ timeout: 10_000 })
  expect(erros).toEqual([])
})
