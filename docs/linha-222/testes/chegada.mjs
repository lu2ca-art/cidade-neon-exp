import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await b.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential") })
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000); await page.click(".l-btn-entrar"); const t0 = Date.now()
let cinzaIni = null, cinzaFim = null
for (let k = 0; k < 60; k++) {
  const c = await page.locator(".l-viagem.is-cinza").count()
  const t = Math.round((Date.now() - t0) / 1000)
  if (c && cinzaIni === null) cinzaIni = t
  if (!c && cinzaIni !== null && cinzaFim === null) cinzaFim = t
  if (cinzaFim !== null) break
  await page.waitForTimeout(1000)
}
console.log(`cinza começou aos ${cinzaIni}s e acabou aos ${cinzaFim}s (dura ${cinzaFim - cinzaIni}s)`)
console.log("ERROS", erros); await b.close()
