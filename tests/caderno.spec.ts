import { expect, test } from "@playwright/test"

// O caderno do dono: ?caderno liga o ✎ (e ?caderno=sair desliga); /api/caderno
// recebe a nota. O caminho completo (abrir no meio da corrida, pausar, anotar) é
// conferido jogando: na cena 3D headless o clique cai às vezes na troca de tela.

test("a rota do caderno aceita uma nota e recusa corpo vazio", async ({ request }) => {
  const ok = await request.post("/api/caderno", { data: { texto: "teste automático do caderno", tags: ["bug"], estado: { url: "/linha" } } })
  expect([200, 502]).toContain(ok.status()) // 502 = sem PostHog e fora do dev: o aparelho guarda e reenvia
  const vazio = await request.post("/api/caderno", { data: { texto: "  ", tags: [] } })
  expect(vazio.status()).toBe(400)
})

test("o ✎ só aparece com ?caderno, abre, pausa e fecha", async ({ page }) => {
  const erros: string[] = []
  page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))

  await page.goto("/linha")
  await expect(page.locator(".l-btn-entrar")).toBeVisible({ timeout: 60_000 })
  await expect(page.locator(".cdn-btn")).toHaveCount(0)

  await page.goto("/linha?caderno=1")
  await expect(page.locator(".cdn-btn")).toBeVisible({ timeout: 60_000 })
  await page.locator(".cdn-btn").click()
  await expect(page.locator(".cdn-caixa")).toBeVisible()
  // a parte do jogo, com nome de gente
  await expect(page.locator(".cdn-topo span")).toHaveText("a página inicial")
  // o relógio do jogo parou e os quadros não andam
  // (o navegador de teste nem sempre entrega quadros: confere o mecanismo, não a contagem)
  const parado = await page.evaluate(async () => {
    const id = requestAnimationFrame(() => {})
    const a = performance.now()
    await new Promise((r) => setTimeout(r, 500))
    return { andou: performance.now() - a, guardado: id < 0 }
  })
  expect(parado.andou).toBeLessThan(1)
  expect(parado.guardado).toBe(true)
  await page.locator(".cdn-caixa textarea").fill("teste")
  await page.keyboard.press("Escape")
  await expect(page.locator(".cdn-caixa")).toHaveCount(0)
  // descongelou: o relógio volta a andar, sem salto, e os quadros guardados rodam
  const solto = await page.evaluate(async () => {
    const id = requestAnimationFrame(() => {})
    const a = performance.now()
    await new Promise((r) => setTimeout(r, 500))
    return { andou: performance.now() - a, pedido: id > 0 }
  })
  expect(solto.andou).toBeGreaterThan(300)
  expect(solto.andou).toBeLessThan(1500)
  expect(solto.pedido).toBe(true)

  await page.goto("/linha?caderno=sair")
  await expect(page.locator(".l-btn-entrar")).toBeVisible({ timeout: 60_000 })
  await expect(page.locator(".cdn-btn")).toHaveCount(0)
  expect(erros).toEqual([])
})
