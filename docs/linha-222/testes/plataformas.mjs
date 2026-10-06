// Teste dos botões de plataforma (06/10): app OUVIR, ficha da estação, rádio tocando
import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "/tmp"
const PORTA = process.env.PORTA ?? "3222"
const s0 = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 0 }, reliquias: [], objetos: ["copo", "chuva", "ontem"], completos: ["grupo", "abertura", "copo", "chuva", "ontem"], ecosVistos: ["copo", "chuva"], fio: ["sexta"], pausas: {}, casa: true, neon: 160, discos: [] }
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] })
const page = await (await b.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, s0)
const shot = (n) => page.screenshot({ path: `${DIR}/plat-${n}.png`, timeout: 90000 }).catch(() => {})
for (let i = 0; i < 60; i++) { try { const r = await page.goto(`http://localhost:${PORTA}/linha`); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000); await page.click(".l-btn-entrar"); await page.waitForTimeout(5000)
await page.locator(".l-hud-cel").waitFor({ timeout: 90000 }); await page.locator(".l-hud-cel").dispatchEvent("click"); await page.locator(".l-os").waitFor({ timeout: 30000 }).catch(() => {})
console.log("apps:", (await page.locator(".l-app-nome").allInnerTexts()).join(", "))
await page.locator(".l-app", { hasText: "OUVIR" }).first().dispatchEvent("click"); await page.waitForTimeout(1500)
const faixas = await page.locator(".l-ouvir-faixa").evaluateAll((els) => els.map((e) => e.querySelector(".l-ouvir-nome")?.textContent + " → " + e.querySelectorAll(".l-plats a").length + " links"))
console.log("OUVIR:\n " + faixas.join("\n "))
const hrefs = await page.locator(".l-ouvir-faixa").nth(4).locator(".l-plats a").evaluateAll((as) => as.map((a) => a.textContent + " " + a.getAttribute("href")))
console.log("Sabe Ontem?:\n " + hrefs.join("\n "))
console.log("pré-save:", await page.locator(".l-ouvir .l-presave").evaluateAll((as) => as.map((a) => a.closest(".l-ouvir-faixa").querySelector(".l-ouvir-nome span").textContent + " → " + a.getAttribute("href"))))
await shot("ouvir")
// rádio com uma faixa do LU2CA tocando
await page.getByText("início").first().dispatchEvent("click"); await page.waitForTimeout(800)
await page.locator('.l-os-dock .l-app').nth(3).dispatchEvent("click").catch(() => {}); await page.waitForTimeout(1200)
// (o "tocando agora" precisa de música do LU2CA tocando; o save de teste não libera a 222, então isso só aparece com um gancho local no som.ts)
await page.evaluate(() => window.__som?.player.tocar("/audio/tracks/live-sabe-ontem.mp3")); await page.waitForTimeout(3000)
console.log("rádio, tocando agora:", (await page.locator(".l-radio-agora").innerText().catch(() => "—")).replace(/\s+/g, " "))
await shot("radio")
// ficha da estação (LINHA 9 → Sabe Ontem?)
await page.getByText("início").first().dispatchEvent("click"); await page.waitForTimeout(800)
await page.locator('.l-os-dock .l-app').nth(2).dispatchEvent("click").catch(() => {}); await page.waitForTimeout(1500)
await page.getByText("Sabe Ontem?").first().dispatchEvent("click").catch(() => {}); await page.waitForTimeout(1500)
console.log("ficha:", (await page.locator(".l-ficha h2").first().innerText().catch(() => "—")), "| botões:", await page.locator(".l-ficha .l-plats a").count())
await shot("ficha")
console.log("ERROS", erros.slice(0, 5)); await b.close()
