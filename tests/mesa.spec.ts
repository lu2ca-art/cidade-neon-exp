import { expect, test } from "@playwright/test"
import { MESA, linkDa } from "../app/teste/mesa"
import { PARTES_TESTE } from "../app/linha/parteTeste"

// /teste: a mesa de testes mostra um cartão por item de mesa.ts, o mais novo em
// cima, cada um com o botão "Abrir" no ?parte= certo (e a parte existe)

test("cada cartão da mesa aponta pra uma parte que existe", () => {
  for (const c of MESA) {
    expect(PARTES_TESTE, c.nome).toContain(c.parte)
    for (const m of c.mais ?? []) expect(PARTES_TESTE, m.nome).toContain(m.parte)
    expect(c.data).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  }
  expect(new Set(MESA.map((c) => c.parte)).size).toBe(MESA.length)
})

test("/teste mostra os cartões da mesa", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.setViewportSize({ width: 390, height: 844 })
  const r = await page.goto("/teste")
  expect(r?.status()).toBe(200)
  const cartoes = page.locator(".ms-cartao")
  await expect(cartoes).toHaveCount(MESA.length)
  const datas = await cartoes.locator("time").evaluateAll((ts) => ts.map((t) => t.getAttribute("datetime") ?? ""))
  expect(datas).toEqual([...datas].sort().reverse())
  for (const c of MESA) {
    const card = page.locator(`.ms-cartao[data-parte="${c.parte}"]`)
    await expect(card.getByRole("heading", { name: c.nome })).toBeVisible()
    await expect(card.getByRole("link", { name: "Abrir" })).toHaveAttribute("href", linkDa(c.parte))
  }
  // nada de chave da prévia na página
  expect(await page.content()).not.toContain("x-vercel-protection-bypass")
  // o botão cabe no iPhone (sem rolagem de lado)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  if (process.env.PRINT_MESA) await page.screenshot({ path: process.env.PRINT_MESA, fullPage: false })
  expect(erros).toEqual([])
})
