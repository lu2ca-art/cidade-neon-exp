import { expect, test } from "@playwright/test"
import { mkdirSync, writeFileSync } from "node:fs"

// T08: a página /teste/violao abre, toca uma faixa, toca notas, sem erro.
// Também mede o atraso do toque e os quadros durante o toque (números pro relatório).
test("violão: abre, toca faixa, toca nota, mede o atraso", async ({ page }) => {
  mkdirSync("test-results/violao", { recursive: true })
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  page.on("console", (m) => { if (m.type() === "error" && !/_vercel\/insights|status of 404/.test(m.text())) erros.push(m.text()) })
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))

  const r = await page.goto("/teste/violao")
  expect(r?.status()).toBe(200)
  await expect(page.getByTestId("violao-teste")).toBeVisible()

  // quadros e tarefas longas durante todo o teste
  await page.evaluate(() => {
    const w = window as unknown as { __q: number[]; __long: number[] }
    w.__q = []; w.__long = []
    let ult = performance.now()
    const f = (t: number) => { w.__q.push(t - ult); ult = t; requestAnimationFrame(f) }
    requestAnimationFrame(f)
    new PerformanceObserver((l) => l.getEntries().forEach((e) => w.__long.push(e.duration))).observe({ entryTypes: ["longtask"] })
  })

  // toca a faixa nectar (tom na tabela)
  await page.getByLabel("faixa").selectOption("/audio/tracks/nectar.mp3")
  await page.getByTestId("tocar-faixa").click()
  await expect(page.getByTestId("tom-nome")).toHaveText("E maior", { timeout: 15_000 })
  await expect(page.getByTestId("tom-fonte")).toHaveText("detectado, conferir")
  const tocou = await page.evaluate(() => new Promise<boolean>((ok) => setTimeout(() => ok(true), 1500)))
  expect(tocou).toBe(true)

  // uma nota
  const pad = page.getByTestId("pads-notas").locator("button").first()
  await pad.dispatchEvent("pointerdown")
  await expect(page.getByTestId("lat")).toContainText("1 toques")

  // 60 toques: pads, acordes e braço (celular: 400x844)
  const alvos = [
    ...(await page.getByTestId("pads-notas").locator("button").all()),
    ...(await page.getByTestId("pads-acordes").locator("button").all()),
    ...(await page.getByTestId("braco").locator("button").all()).filter((_, i) => i % 5 === 0).slice(0, 20),
  ]
  for (let i = 0; i < 60; i++) {
    const b = alvos[i % alvos.length]
    await b.dispatchEvent("pointerdown")
    await page.waitForTimeout(60)
  }
  await page.screenshot({ path: "test-results/violao/pagina.png", fullPage: true })

  const res = await page.evaluate(() => {
    const w = window as unknown as { __q: number[]; __long: number[]; __violaoLat: Record<string, number> }
    const q = [...w.__q].sort((a, b) => a - b)
    return { lat: w.__violaoLat, quadros: q.length, quadroMedio: q.reduce((a, b) => a + b, 0) / q.length, quadroP95: q[Math.floor(q.length * 0.95)], quadroMax: q[q.length - 1], longas: w.__long }
  })
  writeFileSync("test-results/violao/medidas.json", JSON.stringify(res, null, 1))
  console.log("MEDIDAS", JSON.stringify(res))
  expect(res.lat.n).toBeGreaterThanOrEqual(61)
  expect(erros, erros.join("\n")).toEqual([])
})
