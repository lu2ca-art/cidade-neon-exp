import { expect, test } from "@playwright/test"
import { MESA, linkDa, mesaOrdenada } from "../app/teste/mesa"
import { PARTES_TESTE } from "../app/linha/parteTeste"

// /teste: a mesa de testes mostra um cartão por item de mesa.ts, o mais novo em
// cima (por dia, 05/11), cada um com o botão "Abrir" no ?parte= certo (e a parte existe)

test("cada cartão da mesa aponta pra uma parte que existe", () => {
  for (const c of MESA) {
    expect(PARTES_TESTE, c.nome).toContain(c.parte)
    for (const m of c.mais ?? []) expect(PARTES_TESTE, m.nome).toContain(m.parte)
    expect(c.data).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  }
  // a mesma parte pode abrir mais de um cartão (ex.: "livre", "bar"); o que não pode repetir é nome+data
  expect(new Set(MESA.map((c) => `${c.nome}|${c.data}`)).size).toBe(MESA.length)
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
  // (05/11) separada por dia: uma seção por data, a mais nova em cima
  const dias = [...new Set(MESA.map((c) => c.data))].sort().reverse()
  await expect(page.locator(".ms-dia")).toHaveCount(dias.length)
  // a mesma parte aparece em mais de um cartão: cada cartão é achado pela parte + data + nome
  for (const c of MESA) {
    const card = page.locator(`.ms-cartao[data-parte="${c.parte}"]`)
      .filter({ has: page.locator(`time[datetime="${c.data}"]`) })
      .filter({ has: page.getByRole("heading", { name: c.nome, exact: true }) })
    await expect(card, `${c.data} ${c.nome}`).toHaveCount(1)
    await expect(card.getByRole("link", { name: "Abrir" })).toHaveAttribute("href", linkDa(c.parte))
  }
  // nada de chave da prévia na página
  expect(await page.content()).not.toContain("x-vercel-protection-bypass")
  // o botão cabe no iPhone (sem rolagem de lado)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  if (process.env.PRINT_MESA) await page.screenshot({ path: process.env.PRINT_MESA, fullPage: false })
  expect(erros).toEqual([])
})

test("/teste: \"✓ testei\" recolhe o cartão, fica guardado e \"só os não testados\" desliga", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  await page.goto("/teste")
  const cartoes = page.locator(".ms-cartao")
  await expect(cartoes).toHaveCount(MESA.length)
  const primeiro = mesaOrdenada()[0]
  await cartoes.first().getByRole("button", { name: "✓ testei" }).click()
  // com o filtro ligado (o normal): o testado vira uma linha recolhida, com "desfazer"
  await expect(cartoes).toHaveCount(MESA.length - 1)
  const recolhido = page.locator(".ms-recolhido")
  await expect(recolhido).toHaveCount(1)
  await expect(recolhido.getByRole("link", { name: primeiro.nome, exact: true })).toHaveAttribute("href", linkDa(primeiro.parte))
  // guardado no aparelho: recarregou, continua testado
  await page.reload()
  await expect(page.locator(".ms-recolhido")).toHaveCount(1)
  // filtro desligado: tudo inteiro, o testado apagadinho
  await page.getByRole("checkbox", { name: "só os não testados" }).uncheck()
  await expect(cartoes).toHaveCount(MESA.length)
  await expect(page.locator(".ms-cartao-feito")).toHaveCount(1)
  // desfazer
  await page.locator(".ms-cartao-feito").getByRole("button", { name: "✓ testado · desfazer" }).click()
  await expect(page.locator(".ms-cartao-feito")).toHaveCount(0)
})
