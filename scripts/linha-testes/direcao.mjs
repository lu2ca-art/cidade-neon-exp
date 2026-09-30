import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "./shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
const SAVE = { nome: "teste", estacao: "copo", pesos: {}, objetos: ["copo"], linha: "", xp: 0, dias: [], sinal: 200, freq: "linha",
  completos: ["abertura", "grupo", "copo"], logs: {}, ecosVistos: [], recordes: {}, legado: [], melhorVolta: 0, jogados: {},
  fio: ["copo", "sexta"], perfil: "estrada", itens: [], pausas: {} }
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") } }, SAVE)
await page.goto("http://localhost:3222/linha"); await page.waitForTimeout(1500)
await page.click(".l-btn-entrar"); await page.waitForTimeout(4000)
const st = () => page.evaluate(() => window.__estado())
console.log("parado:", (await st()).v, "aviso:", await page.locator(".l-hud-parado.is-on").count())
await page.screenshot({ path: `${DIR}/d0-parado.png` })
await page.keyboard.down("ArrowUp"); await page.waitForTimeout(5000)
console.log("acelerando:", JSON.stringify(await st()))
// drift: curva + espaço
await page.keyboard.down("ArrowRight"); await page.keyboard.down(" "); await page.waitForTimeout(3000)
console.log("drift:", JSON.stringify(await st()), await page.locator(".l-hud-marcha").textContent())
await page.screenshot({ path: `${DIR}/d1-drift.png` })
await page.keyboard.up(" "); await page.keyboard.up("ArrowRight"); await page.waitForTimeout(250)
console.log("mini-turbo:", JSON.stringify(await st()))
await page.keyboard.up("ArrowUp")
await page.keyboard.down("ArrowDown"); await page.waitForTimeout(6000)
console.log("ré:", JSON.stringify(await st()), await page.locator(".l-hud-marcha").textContent())
await page.keyboard.up("ArrowDown")
// dentro da saída pro subúrbio, quase no começo: ré tem que voltar pro centro
await page.evaluate(() => window.__via("linha>suburbio", 0.01)); await page.waitForTimeout(500)
await page.keyboard.down("ArrowDown")
for (let i = 0; i < 12; i++) { await page.waitForTimeout(1000); const e = await st(); if (e.via === "circuito:linha") { console.log("VOLTOU DE RÉ PRO CENTRO:", JSON.stringify(e)); break } if (i === 11) console.log("não voltou", JSON.stringify(e)) }
await page.keyboard.up("ArrowDown")
console.log("ERROS", erros)
await browser.close()
