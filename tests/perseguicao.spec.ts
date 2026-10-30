import { expect, test, type Page } from "@playwright/test"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import { CONFIG_PERSEGUICAO, VEICULOS, escolherVeiculo, emPerseguicao, kombiJogada, perseguir, podePerseguir, temKombi, veiculoDe } from "../app/linha/disco/perseguicao"
import { podeQuebrar } from "../app/linha/disco/quebra"

// (T28) a perseguição da Kombi, uma vez só. Regras puras (sem navegador) e, no Mac
// (Chrome com Metal), o caminho inteiro: a polícia vem, pega, o helicóptero joga a
// Kombi lá de cima, de patins até os 3 veículos, encostou num, pega.
//   CHROME_PATH=".../Google Chrome" PORTA=3128 bunx playwright test tests/perseguicao.spec.ts
if (process.platform === "darwin") {
  test.use({ launchOptions: { executablePath: process.env.CHROME_PATH || undefined, args: ["--use-angle=metal", "--autoplay-policy=no-user-gesture-required"] } })
}
test.describe.configure({ mode: "serial" })

const FEITAS = ["dbee", "oficina", "lu2ca", "drew", "quadra", "tuneis"] as NonNullable<HistoriaDisco["feitas13"]>
const PRONTO: HistoriaDisco = { fase: "carreira", holo: true, feitas13: FEITAS }
const POP = CONFIG_PERSEGUICAO.popularidade

test("o gatilho: fama e movimento, na carreira, uma vez só", () => {
  expect(podePerseguir(PRONTO, POP)).toBe(true)
  expect(podePerseguir(PRONTO, POP - 1)).toBe(false)
  expect(podePerseguir({ ...PRONTO, feitas13: FEITAS.slice(0, CONFIG_PERSEGUICAO.feitasMin - 1) }, 100)).toBe(false)
  // nunca no meio de uma missão, com a Kombi quebrada ou fora da carreira
  expect(podePerseguir({ ...PRONTO, missao: "ella" }, 100)).toBe(false)
  expect(podePerseguir({ ...PRONTO, quebra: { quebrada: true } }, 100)).toBe(false)
  expect(podePerseguir({ ...PRONTO, fase: "livre" }, 100)).toBe(false)
  // começou: não começa de novo
  const h = perseguir(PRONTO)
  expect(emPerseguicao(h)).toBe(true)
  expect(podePerseguir(h, 100)).toBe(false)
})

test("perde sempre: a Kombi vai embora, escolhe um dos 3, nunca mais", () => {
  expect(VEICULOS).toHaveLength(3)
  let h = perseguir(PRONTO)
  expect(temKombi(h)).toBe(true)
  // escolher antes de jogarem a Kombi não vale
  expect(escolherVeiculo(h, VEICULOS[0].id)).toBe(h)
  h = kombiJogada(h)
  expect(h.perseguicao?.fase).toBe("escolher")
  expect(temKombi(h)).toBe(false)
  // sem Kombi não tem quebra (T27)
  expect(podeQuebrar(h)).toBe(false)
  // um que não existe não vale
  expect(escolherVeiculo(h, "tanque")).toBe(h)
  h = escolherVeiculo(h, VEICULOS[2].id)
  expect(veiculoDe(h)?.id).toBe(VEICULOS[2].id)
  expect(podePerseguir(h, 100)).toBe(false)
  expect(podeQuebrar(h)).toBe(CONFIG_PERSEGUICAO.quebraNoVeiculo)
})

// ── no navegador ──
const saveDe = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222") ?? "null"))
const texto = (page: Page, t: string, timeout = 30_000) => page.waitForFunction((x) => document.body.innerText.toLowerCase().includes(x), t, { timeout })

async function abrir(page: Page, parte: string) {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto(`/linha?mapa=disco&parte=${parte}`)
  await page.waitForTimeout(2500)
  const entrar = page.locator(".l-btn-entrar")
  if (await entrar.isVisible().catch(() => false)) { await entrar.click(); await page.waitForTimeout(3000) }
  return erros
}

// de patins, pra frente até encostar num veículo (o botão de pegar aparece)
async function ateUmVeiculo(page: Page) {
  const btn = page.locator(".l-racha-btn")
  for (let i = 0; i < 40 && !(await btn.isVisible().catch(() => false)); i++) {
    await page.keyboard.down("ArrowUp"); await page.waitForTimeout(160); await page.keyboard.up("ArrowUp")
    await page.waitForTimeout(260)
  }
  await expect(btn).toBeVisible({ timeout: 5000 })
  return btn
}

test("?parte=perseguicao: a polícia pega, jogam a Kombi lá de cima, de patins até os 3, pega um", async ({ page }) => {
  test.setTimeout(150_000)
  const erros = await abrir(page, "perseguicao")
  expect((await saveDe(page)).disco.perseguicao.fase).toBe("agora")
  // o Núcleo detecta; a polícia vem (e o helicóptero)
  await texto(page, "movimento diferente")
  // pegaram (a caça some do estado) → o helicóptero ergue a Kombi
  await page.waitForFunction(() => (window as unknown as { __estado: () => { caca: number | null } }).__estado().caca !== null, null, { timeout: 30_000 })
  await page.waitForFunction(() => (window as unknown as { __estado: () => { caca: number | null } }).__estado().caca === null, null, { timeout: (CONFIG_PERSEGUICAO.pegaEmS + 10) * 1000 })
  await page.waitForTimeout(2800)
  await page.screenshot({ path: "test-results/perseguicao/1-erguida.png" })
  // soltou, caiu: a hora de escolher
  await texto(page, "devolvido à origem", 15_000)
  await expect.poll(async () => (await saveDe(page)).disco.perseguicao.fase, { timeout: 15_000 }).toBe("escolher")
  await texto(page, "carros parados", 15_000)
  await page.waitForTimeout(800)
  await page.screenshot({ path: "test-results/perseguicao/2-os-tres.png" })
  const btn = await ateUmVeiculo(page)
  const nome = (await btn.getAttribute("aria-label")) ?? ""
  await btn.click()
  await expect.poll(async () => (await saveDe(page)).disco.perseguicao.fase, { timeout: 10_000 }).toBe("feita")
  const id = (await saveDe(page)).disco.perseguicao.veiculo
  const v = VEICULOS.find((x) => x.id === id)!
  expect(nome).toContain(v.nome)
  await page.waitForTimeout(1500)
  await page.keyboard.down("ArrowUp"); await page.waitForTimeout(1500); await page.keyboard.up("ArrowUp")
  await page.screenshot({ path: "test-results/perseguicao/3-no-veiculo.png" })
  expect(erros).toEqual([])
})

test("?parte=perseguicao.escolher: recarregou na hora de escolher, os 3 continuam lá", async ({ page }) => {
  const erros = await abrir(page, "perseguicao.escolher")
  await page.waitForTimeout(2000)
  const v = await page.evaluate(() => (window as unknown as { __veiculos?: () => { lugares: unknown[] } }).__veiculos?.())
  expect(v?.lugares).toHaveLength(3)
  await ateUmVeiculo(page)
  expect(erros).toEqual([])
})
