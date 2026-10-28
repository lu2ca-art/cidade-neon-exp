import { expect, test, type Page } from "@playwright/test"
import type { HistoriaDisco } from "../app/linha/disco/historia"
import { CHAO_FIXOS, CHAO_LUGARES } from "../app/linha/disco/historia"
import { BANCADA, MECANICO, OFICINA_CFG, PLANO, alvoOficina, pagamentoMotor, passoOficina, sonsDoContador } from "../app/linha/disco/oficina"
import { abrirPorta, checklist13, concluir, feita13, portaAberta } from "../app/linha/disco/portas"
import { PAGINAS } from "../app/linha/paginas"
import { LUGARES } from "../app/linha/lugares"

// (T04, T09) a oficina só no subúrbio e a missão dela: a cena (só o plano) → a
// bancada (a arte: a reciclagem) → o painel no lixão e a goteira (o jogo) → o
// mecânico pago em água → a porta (as melhorias da Kombi)

test("T04: a oficina não está mais na cidade nem vende pintura", () => {
  expect(PAGINAS.map((p) => p.id)).not.toContain("oficina")
  expect(LUGARES.oficina.soChao).toBe(true)
  expect(CHAO_FIXOS).toContain("oficina")
})

test("T09: os passos da missão, na ordem, e pra onde cada um manda", () => {
  let h: HistoriaDisco = { fase: "oficina", holo: true, passos13: ["dbee:arte", "dbee:jogo"] }
  expect(passoOficina(h)).toBe("chegar")
  expect(alvoOficina(h)).toBe("oficina")
  h = { ...h, oficina: { cena: true } }
  expect(passoOficina(h)).toBe("reciclar")
  expect(alvoOficina(h)).toBe("oficina")
  expect(checklist13(h, "oficina").map((x) => x.estado)).toEqual(["agora", "depois", "depois"])
  h = concluir(h, "oficina", "arte")
  expect(passoOficina(h)).toBe("painel")
  expect(alvoOficina(h)).toBe("painel")
  h = { ...h, oficina: { ...h.oficina, painel: true } }
  expect(passoOficina(h)).toBe("goteira")
  expect(alvoOficina(h)).toBe("goteira")
  h = concluir(h, "oficina", "jogo")
  expect(passoOficina(h)).toBe("montar")
  expect(alvoOficina(h)).toBe("oficina")
  h = abrirPorta(h, "oficina")
  expect(feita13(h, "oficina")).toBe(true)
  expect(portaAberta(h, "kombi-melhorias")).toBe(true)
  expect(passoOficina(h)).toBe("feita")
  expect(alvoOficina(h)).toBeNull()
  // os achados ficam fora dos lugares fixos (o mapa, os feixes do drone)
  expect(CHAO_FIXOS).not.toContain("painel")
  expect(CHAO_FIXOS).not.toContain("goteira")
})

test("T09: o mecânico é pago em água, e o contador pinga a cada 10", () => {
  // a água da D-Bee paga o serviço inteiro (J2: 18)
  expect(OFICINA_CFG.aguaDaDbee).toBeGreaterThanOrEqual(OFICINA_CFG.precoMotor)
  expect(pagamentoMotor(OFICINA_CFG.aguaDaDbee)).toEqual({ de: 60, para: 0, pago: 60, falta: 0 })
  expect(pagamentoMotor(85)).toEqual({ de: 85, para: 25, pago: 60, falta: 0 })
  // faltou água: ele monta com o que tem (nada trava)
  expect(pagamentoMotor(23)).toEqual({ de: 23, para: 0, pago: 23, falta: 37 })
  expect(pagamentoMotor(-4).pago).toBe(0)
  // 60 → 0: passa por 50, 40, 30, 20, 10 e 0 (J2: 19)
  expect(sonsDoContador(60, 0)).toBe(6)
  expect(sonsDoContador(85, 25)).toBe(6)
  expect(sonsDoContador(5, 0)).toBe(1)
  // a bancada esconde as três peças do plano
  expect(BANCADA.map((b) => b.vira).filter(Boolean).sort()).toEqual([...PLANO].sort())
  expect(MECANICO.nome.length).toBeGreaterThan(0)
  expect(CHAO_LUGARES.painel && CHAO_LUGARES.goteira).toBeTruthy()
})

// ── no navegador: a missão inteira pelos links ?parte=oficina.* ──
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
  await page.waitForFunction(() => typeof (window as unknown as { __cnChao?: unknown }).__cnChao === "function")
  return erros
}

test("?parte=oficina.bancada: a arte, a reciclagem", async ({ page }) => {
  const erros = await abrir(page, "oficina.bancada")
  await chegar(page, "oficina")
  const banc = page.getByRole("dialog", { name: "a bancada da reciclagem" })
  await expect(banc).toBeVisible()
  // um lixo que não serve não conta
  await banc.locator('[data-lixo="pneu"]').click()
  for (const it of BANCADA.filter((b) => b.vira)) { await banc.locator(`[data-lixo="${it.id}"]`).click(); await page.waitForTimeout(800) }
  await banc.getByRole("button", { name: "pronto →" }).click()
  await expect(banc).toBeHidden()
  const s = await saveDe(page)
  expect(s.disco.passos13).toContain("oficina:arte")
  expect(erros).toEqual([])
})

test("?parte=oficina.painel e ?parte=oficina.goteira: o jogo", async ({ page }) => {
  const erros = await abrir(page, "oficina.painel")
  await chegar(page, "painel")
  const cova = page.getByRole("dialog", { name: "o painel no lixão" })
  await expect(cova).toBeVisible()
  for (let i = 0; i < OFICINA_CFG.cavadas; i++) await cova.locator("[data-cavar]").click()
  await cova.getByRole("button", { name: "levar o painel →" }).click()
  expect((await saveDe(page)).disco.oficina.painel).toBe(true)
  // a goteira: o balde vai pra coluna da gota até o tanque encher
  await chegar(page, "goteira")
  const got = page.getByRole("dialog", { name: "a goteira" })
  await expect(got).toBeVisible()
  const fim = Date.now() + 60_000
  while (Date.now() < fim) {
    if (await got.getByRole("button", { name: "levar a água →" }).isVisible().catch(() => false)) break
    const col = await got.locator(".l-oficina-coluna").evaluateAll((els) => els.findIndex((e) => e.querySelector(".l-oficina-gota")))
    if (col >= 0) await got.locator(".l-oficina-coluna").nth(col).click()
    await page.waitForTimeout(150)
  }
  await got.getByRole("button", { name: "levar a água →" }).click()
  const s = await saveDe(page)
  expect(s.disco.passos13).toContain("oficina:jogo")
  expect(s.disco.oficina.tanque).toBe(OFICINA_CFG.gotasDaGoteira)
  expect(erros).toEqual([])
})

test("?parte=oficina.pagar: o mecânico pago em água e a porta das melhorias", async ({ page }) => {
  const erros = await abrir(page, "oficina.pagar")
  expect((await saveDe(page)).agua).toBe(60)
  await chegar(page, "oficina")
  const pg = page.getByRole("dialog", { name: "o pagamento do mecânico" })
  await expect(pg).toBeVisible()
  // a água sai do save na hora; o contador desce na tela até 0
  await expect.poll(async () => (await saveDe(page)).agua).toBe(0)
  await expect(pg.locator("[data-agua]")).toHaveAttribute("data-agua", "0", { timeout: 10_000 })
  await pg.getByRole("button", { name: "montar o motor →" }).click()
  const porta = page.getByRole("dialog", { name: "a porta abriu" })
  await expect(porta).toBeVisible()
  await expect(porta).toContainText("as melhorias da Kombi")
  const s = await saveDe(page)
  expect(s.disco.fase).toBe("subir")
  expect(s.disco.feitas13).toContain("oficina")
  expect(s.disco.mods).toEqual(expect.arrayContaining(["solar", "turbo", "propulsao"]))
  expect(erros).toEqual([])
})
