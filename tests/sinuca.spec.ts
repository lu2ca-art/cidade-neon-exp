import { expect, test } from "@playwright/test"

// a sinuca (T17) na página de teste: abre, dá a quebra puxando o taco de verdade, as bolas andam e param, sem erro
type Est = { fase: string; vez: number; fim: unknown; bolas: { id: number; x: number; y: number; ativa: boolean }[] }
declare global { interface Window { __sinuca: { estado: () => Est; tacar: (a: number, f: number) => boolean; jogo: { ang: number } } } }

const PRINTS = process.env.PRINTS

test("sinuca: treino, a quebra pelo puxador", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.goto("/teste/sinuca?modo=pratica")
  await page.waitForFunction(() => !!window.__sinuca)
  await page.waitForTimeout(500)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/sinuca-celular-inicio.png` })
  const antes = await page.evaluate(() => window.__sinuca.estado())
  expect(antes.bolas.filter((b) => b.ativa)).toHaveLength(16)
  // puxa o taco no puxador e solta
  const box = (await page.locator(".sn-puxador").boundingBox())!
  await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width - 10 - i * 30, box.y + box.height / 2)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/sinuca-celular-puxando.png` })
  await page.mouse.up()
  await expect.poll(() => page.evaluate(() => window.__sinuca.estado().fase)).toBe("rolando")
  await page.waitForTimeout(350)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/sinuca-celular-quebra.png` })
  await expect.poll(() => page.evaluate(() => window.__sinuca.estado().fase), { timeout: 30_000 }).not.toBe("rolando")
  const depois = await page.evaluate(() => window.__sinuca.estado())
  const mexeu = depois.bolas.filter((b) => { const a = antes.bolas.find((x) => x.id === b.id)!; return !b.ativa || Math.hypot(a.x - b.x, a.y - b.y) > 0.01 })
  expect(mexeu.length).toBeGreaterThan(8)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/sinuca-celular-depois.png` })
  expect(erros).toEqual([])
})

test("sinuca: contra o Mubarak, ele joga a vez dele", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.goto("/teste/sinuca?modo=mubarak")
  await page.waitForFunction(() => !!window.__sinuca)
  await page.evaluate(() => window.__sinuca.tacar(0, 1))
  // joga fraquinho até a vez passar pro Mubarak; espera ele tacar e devolver
  let viuIA = false
  for (let k = 0; k < 120 && !viuIA; k++) {
    const e = await page.evaluate(() => window.__sinuca.estado())
    if (e.fim) break
    if (e.fase === "ia") viuIA = true
    else if (e.fase === "mirar" && e.vez === 0) await page.evaluate(() => window.__sinuca.tacar(window.__sinuca.jogo.ang, 0.12))
    await page.waitForTimeout(500)
  }
  expect(viuIA).toBe(true)
  await expect.poll(() => page.evaluate(() => { const e = window.__sinuca.estado(); return !!e.fim || (e.fase === "mirar" && e.vez === 0) }), { timeout: 60_000 }).toBe(true)
  if (PRINTS) await page.screenshot({ path: `${PRINTS}/sinuca-celular-mubarak.png` })
  expect(erros).toEqual([])
})
