import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/private/tmp/claude-501/-Users-lu2ca/aa10520d-08a7-486c-8fbc-6802d684e285/scratchpad/shots"
const s0 = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 0 }, reliquias: [], objetos: ["copo", "chuva"], completos: ["grupo", "abertura", "copo", "chuva"], ecosVistos: ["copo", "chuva"], fio: ["sexta"], pausas: {}, casa: true, neon: 160, discos: [] }
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] })
const page = await (await b.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/AudioContext/.test(m.text())) erros.push(m.text().slice(0, 200)) })
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, s0)
const shot = (n) => page.screenshot({ path: `${DIR}/loja-${n}.png`, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { try { await loc.first().dispatchEvent("click", {}, { timeout: 5000 }); return } catch {} await loc.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {}); const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000); await page.click(".l-btn-entrar"); await page.waitForTimeout(5000)
await page.locator(".l-hud-cel").waitFor({ timeout: 60000 }); await page.locator(".l-hud-cel").dispatchEvent("click"); await page.locator(".l-os").waitFor({ timeout: 30000 }).catch(() => {})
console.log("celular:", await page.locator(".l-os").count(), "apps:", (await page.locator(".l-app-nome").allInnerTexts()).join(", "))
await shot("celular")
await page.locator(".l-app", { hasText: "LOJA DE DISCOS" }).dispatchEvent("click", {}, { timeout: 5000 }); await page.waitForTimeout(1500)
console.log("loja aberta?", await page.locator(".l-loja").count(), "| saldo:", (await page.locator(".l-loja-saldo").innerText().catch(() => "-")).replace(/\s+/g, " "), "| discos:", await page.locator(".l-loja-grade li").count())
await shot("grade")
await clicar(page.locator(".l-loja-grade li", { hasText: "Bossa" }).locator("button")); await page.waitForTimeout(800)
console.log("ficha:", (await page.locator(".l-loja-detalhe h2").innerText().catch(() => "-")), "| faixas:", await page.locator(".l-loja-faixas li").count())
await clicar(page.locator(".l-loja-faixas li").first().locator("button")); await page.waitForTimeout(4000)
console.log("trecho tocando?", await page.evaluate(() => [...document.querySelectorAll("audio")].length), (await page.locator(".l-loja-faixas li").first().locator("button").innerText()))
await shot("ficha")
await clicar(page.locator(".l-loja-btn.is-comprar")); await page.waitForTimeout(1200)
let s = await save(); console.log("comprou:", s.discos, "| neon:", s.neon)
await shot("comprou")
await clicar(page.locator(".l-loja-btn", { hasText: "tocar" })); await page.waitForTimeout(3000)
// segundo disco: saldo insuficiente (60)
await clicar(page.locator(".l-loja-fechar")); await page.waitForTimeout(500)
await clicar(page.locator(".l-loja-grade li", { hasText: "Rock" }).locator("button")); await page.waitForTimeout(800)
console.log("sem saldo:", (await page.locator(".l-loja-falta").innerText().catch(() => "-")).replace(/\s+/g, " "))
console.log("ERROS", erros); await b.close()
