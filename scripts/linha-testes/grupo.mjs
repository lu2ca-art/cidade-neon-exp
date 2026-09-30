import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
// save ANTIGO: fez o quiz no grupo, pegou o mp3, sem fio/pausas/itens
const OLD = { nome: "velho", estacao: "chuva", pesos: { chuva: 6, ontem: 4, copo: 1 }, objetos: ["copo"], linha: "", xp: 400, dias: [], sinal: 5, freq: "linha",
  completos: ["abertura", "grupo", "copo"], logs: { grupo: [{ k: "sistema", texto: "D-Bee adicionou você" }] }, ecosVistos: [], recordes: {}, legado: [], melhorVolta: 0, jogados: {} }
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") } }, OLD)
await page.goto("http://localhost:3222/linha"); await page.waitForTimeout(1500)
await page.click(".l-btn-entrar"); await page.waitForTimeout(800)
console.log("banners:", await page.locator(".l-os-banner").textContent())
await page.click(".l-os-dock .l-os-central"); await page.waitForTimeout(400)
console.log("central:", (await page.locator(".l-central li").allTextContents()).join(" | "))
await page.mouse.click(200, 60); await page.waitForTimeout(300)
await page.locator(".l-os-dock button").nth(1).click(); await page.waitForTimeout(500)
console.log("n3xo:", (await page.locator(".l-n3xo li").allTextContents()).join(" | "))
await page.locator(".l-n3xo li button").first().click()
for (let i = 0; i < 20; i++) { await page.locator(".l-chat-corpo").click({ position: { x: 10, y: 10 } }).catch(() => {}); await page.waitForTimeout(300) }
console.log("grupo:", (await page.locator(".l-chat-corpo > *").allTextContents()).join(" / "))
console.log("status:", await page.locator(".l-chat-quem small").textContent())
const s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
console.log("fio migrado:", s.fio, "ecosVistos", s.ecosVistos)
console.log("ERROS", erros)
await browser.close()
