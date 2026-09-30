import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--autoplay-policy=no-user-gesture-required"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
const SAVE = { nome: "teste", estacao: "copo", pesos: { copo: 5 }, objetos: ["copo", "chuva"], linha: "", xp: 300, dias: [], sinal: 40, freq: "linha",
  completos: ["abertura", "grupo", "copo", "chuva"], logs: {}, ecosVistos: [], recordes: {}, legado: [], melhorVolta: 0, jogados: {},
  fio: ["copo", "chuva", "sexta", "dopamina", "ontem", "nectar"], perfil: "estrada", itens: [], pausas: {} }
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") } }, SAVE)
await page.goto("http://localhost:3222/linha"); await page.waitForTimeout(1500)
await page.click(".l-btn-entrar"); await page.waitForTimeout(3000)
const seq = []
for (let i = 0; i < 12; i++) {
  const e = await page.evaluate(() => window.__estado())
  const toast = await page.locator(".l-toast").allTextContents()
  const r = JSON.parse(await page.evaluate(() => localStorage.getItem("cn-linha-222-radio")))
  const sc = r.sacolas.linha
  seq.push(`${e.src.split("/").pop().slice(0,8)} i=${sc.i} n=${r.n} [${sc.ordem.map((x) => x.split("/").pop().slice(0, 5)).join(",")}]`)
  await page.evaluate(() => window.__pular()); await page.waitForTimeout(2500)
}
console.log(seq.join("\n"))
console.log(JSON.stringify(await page.evaluate(() => localStorage.getItem("cn-linha-222-radio"))).slice(0, 300))
console.log("ERROS", erros)
await browser.close()
