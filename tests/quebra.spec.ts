import { expect, test, type Page } from "@playwright/test"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import { CONFIG_QUEBRA, consertar, pagamentoConserto, podeQuebrar, quebrada, quebrar, sortearQuebra } from "../app/linha/disco/quebra"
import { kombiNoConserto } from "../app/linha/disco/portas"

// (T27) a Kombi quebra. Regras puras (sem navegador) e, no Mac (Chrome com Metal), o
// caminho inteiro: forçar a quebra → seguir de patins → pagar o mecânico → a Kombi volta.
//   CHROME_PATH=".../Google Chrome" PORTA=3127 bunx playwright test tests/quebra.spec.ts
if (process.platform === "darwin") {
  test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })
}
test.describe.configure({ mode: "serial" })

const LIVRE: HistoriaDisco = { fase: "carreira", holo: true, feitas13: ["dbee", "oficina"] }

test("é rara e só quebra quando pode: carreira, sem missão no meio", () => {
  expect(CONFIG_QUEBRA.chance).toBeLessThanOrEqual(0.2)
  expect(podeQuebrar(LIVRE)).toBe(true)
  // sorteio baixo quebra; alto não
  expect(sortearQuebra(LIVRE, 0.01).quebrou).toBe(true)
  expect(sortearQuebra(LIVRE, 0.99).quebrou).toBe(false)
  // nunca no meio de uma missão (pegada e ainda não feita)
  const missao: HistoriaDisco = { ...LIVRE, missao: "drew" }
  expect(podeQuebrar(missao)).toBe(false)
  expect(sortearQuebra(missao, 0).quebrou).toBe(false)
  // missão já feita não segura
  expect(podeQuebrar({ ...missao, feitas13: [...(LIVRE.feitas13 ?? []), "drew"] })).toBe(true)
  // fora da carreira (prólogo, livre) nunca
  for (const fase of ["casa", "bar", "oficina", "subir", "livre"] as const) expect(podeQuebrar({ ...LIVRE, fase })).toBe(false)
})

test("nunca 2 vezes seguidas: depois do conserto vem a folga", () => {
  let h = quebrar(LIVRE)
  expect(quebrada(h)).toBe(true)
  expect(h.quebra?.vezes).toBe(1)
  // quebrada, não quebra de novo nem sorteia
  expect(sortearQuebra(h, 0).quebrou).toBe(false)
  h = consertar(h)
  expect(quebrada(h)).toBe(false)
  expect(h.quebra?.folga).toBe(CONFIG_QUEBRA.folga)
  // os próximos `folga` sorteios, mesmo com sorte ruim (0), não quebram
  for (let i = 0; i < CONFIG_QUEBRA.folga; i++) {
    const r = sortearQuebra(h, 0)
    expect(r.quebrou).toBe(false)
    h = r.h
  }
  expect(sortearQuebra(h, 0).quebrou).toBe(true)
  // a contagem das vezes sobrevive ao conserto
  expect(quebrar(consertar(quebrar(LIVRE))).quebra?.vezes).toBe(2)
})

test("o conserto é pago em água e nunca trava (fiado)", () => {
  expect(pagamentoConserto(60)).toEqual({ de: 60, para: 60 - CONFIG_QUEBRA.precoAgua, pago: CONFIG_QUEBRA.precoAgua, falta: 0 })
  expect(pagamentoConserto(5)).toMatchObject({ pago: 5, para: 0, falta: CONFIG_QUEBRA.precoAgua - 5 })
  expect(pagamentoConserto(0).pago).toBe(0)
  // a missão do Drew continua levando de patins sem estar "quebrada"
  expect(kombiNoConserto(quebrar(LIVRE))).toBe(false)
})

// ── no navegador ──
const saveDe = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))
const chegar = (page: Page, id: string) => page.evaluate((x) => (window as unknown as { __cnChao: (id: string) => void }).__cnChao(x), id)

async function abrir(page: Page, parte: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`/linha?mapa=disco&parte=${parte}`)
  await page.waitForTimeout(2500)
  const entrar = page.locator(".l-btn-entrar")
  if (await entrar.isVisible().catch(() => false)) { await entrar.click(); await page.waitForTimeout(3000) }
  await page.waitForFunction(() => typeof (window as unknown as { __cnQuebrar?: unknown }).__cnQuebrar === "function")
  return erros
}

test("?parte=quebra: forçar a quebra, seguir de patins até a oficina, pagar e a Kombi volta", async ({ page }) => {
  const erros = await abrir(page, "quebra")
  expect((await saveDe(page)).disco.quebra).toBeUndefined()
  // força a quebra
  await page.evaluate(() => (window as unknown as { __cnQuebrar: () => void }).__cnQuebrar())
  await expect.poll(async () => (await saveDe(page)).disco.quebra?.quebrada, { timeout: 10_000 }).toBe(true)
  // o aviso e, em seguida, o jogador segue de patins
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("pifou") || document.body.innerText.toLowerCase().includes("tossiu"), null, { timeout: 20_000 })
  await page.waitForTimeout(5000)
  // chegou na oficina: o mecânico cobra em água
  const agua0 = (await saveDe(page)).agua
  await chegar(page, "oficina")
  const pag = page.getByRole("dialog", { name: "o pagamento do mecânico" })
  await expect(pag).toBeVisible({ timeout: 10_000 })
  await expect(pag.getByRole("button", { name: "pegar a Kombi →" })).toBeVisible({ timeout: 10_000 })
  await pag.getByRole("button", { name: "pegar a Kombi →" }).click()
  await expect(pag).toBeHidden()
  const s = await saveDe(page)
  expect(s.disco.quebra.quebrada).toBeUndefined()
  expect(s.disco.quebra.folga).toBe(CONFIG_QUEBRA.folga)
  expect(s.agua).toBe(agua0 - CONFIG_QUEBRA.precoAgua)
  // a Kombi voltou da oficina
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("voltou do conserto"), null, { timeout: 15_000 })
  expect(erros).toEqual([])
})

test("?parte=quebra.oficina: já quebrada, o jogo abre sem erro e a oficina espera", async ({ page }) => {
  const erros = await abrir(page, "quebra.oficina")
  expect((await saveDe(page)).disco.quebra.quebrada).toBe(true)
  await chegar(page, "oficina")
  await expect(page.getByRole("dialog", { name: "o pagamento do mecânico" })).toBeVisible({ timeout: 10_000 })
  expect(erros).toEqual([])
})
