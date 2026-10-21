import { expect, test } from "@playwright/test"

// A senha vem do ambiente do teste (o mesmo .env.local do servidor); nunca fica escrita aqui.
const certa = process.env.ALBUM_SENHA ?? ""

test("API: senha errada nega, vazia nega, certa libera, e limita tentativas", async ({ request }) => {
  test.skip(!certa, "ALBUM_SENHA não definida no ambiente do teste")
  const post = (senha: string, ip: string) => request.post("/api/album/senha", { data: { senha }, headers: { "x-forwarded-for": ip } })
  expect((await post("errada", "10.0.0.1")).status()).toBe(401)
  expect((await post("", "10.0.0.1")).status()).toBe(401)
  const ok = await post(certa, "10.0.0.2")
  expect(ok.status()).toBe(200)
  expect((await ok.json()).ok).toBe(true)
  for (let i = 0; i < 5; i++) await post("x", "10.0.0.3")
  expect((await post(certa, "10.0.0.3")).status()).toBe(429)
})

test("navegador (mesma origem): errada 401, certa 200 e o valor não aparece no bundle servido", async ({ page }) => {
  test.skip(!certa, "ALBUM_SENHA não definida no ambiente do teste")
  await page.addInitScript(() => localStorage.setItem("cidade-neon-analytics-consent", "essential"))
  const js: string[] = []
  page.on("response", async (r) => { if (r.url().includes("/_next/static/") && r.url().endsWith(".js")) js.push(await r.text().catch(() => "")) })
  await page.goto("/linha")
  await page.waitForTimeout(3000)
  const r1 = await page.evaluate(async () => (await fetch("/api/album/senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha: "nao" }) })).status)
  expect(r1).toBe(401)
  const r2 = await page.evaluate(async (s) => (await fetch("/api/album/senha", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha: s }) })).status, certa)
  expect(r2).toBe(200)
  expect(js.length).toBeGreaterThan(0)
  expect(js.some((t) => t.toLowerCase().includes(certa.toLowerCase()))).toBe(false)
})
