import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "./shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const base = { nome: "teste", estacao: "copo", pesos: {}, linha: "", xp: 0, dias: [], sinal: 50, freq: "linha", logs: {}, ecosVistos: ["copo", "chuva", "sexta"], recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], pausas: {} }
async function rodar(save, nome, lutar) {
  const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
  const erros = []; page.on("pageerror", (e) => erros.push(e.message))
  await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") } }, save)
  await page.goto("http://localhost:3222/linha"); await page.waitForTimeout(1500)
  await page.click(".l-btn-entrar")
  await page.waitForSelector(".l-inv", { state: "attached", timeout: 40000 })
  await page.waitForTimeout(3500)
  await page.screenshot({ path: `${DIR}/${nome}-1.png` })
  if (lutar) for (let i = 0; i < 120; i++) { await page.evaluate(() => { const b = [...document.querySelectorAll(".l-inv-jan header button")]; b.at(-1)?.click() }); await page.waitForTimeout(250); if (!(await page.locator(".l-inv").count())) break }
  await page.waitForTimeout(4000)
  await page.screenshot({ path: `${DIR}/${nome}-2.png` })
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
  console.log(nome, "nucleo", JSON.stringify(s.nucleo), "sinal", s.sinal, "| rádio:", await page.locator(".l-hud-radio").textContent().catch(() => "-"), "| chip:", await page.locator(".l-hud-missao").textContent().catch(() => "-"))
  return { page, erros }
}
const a = await rodar({ ...base, objetos: ["copo", "chuva"], completos: ["abertura", "grupo", "copo", "chuva"], fio: ["copo", "chuva", "sexta", "dopamina", "ontem", "nectar"], nucleo: { invasoes: 0, caido: false } }, "fraca", true)
console.log("erros fraca", a.erros)
const b = await rodar({ ...base, objetos: ["copo", "chuva", "sexta"], completos: ["abertura", "grupo", "copo", "chuva", "sexta"], fio: ["copo", "chuva", "sexta", "dopamina", "ontem", "nectar"], nucleo: { invasoes: 1, caido: false } }, "forte", false)
const m = await b.page.evaluate(() => window.__marcos())
console.log("marcos", JSON.stringify(m))
await b.page.evaluate((f) => { window.__via("linha", f - 0.004); window.__irPara(f - 0.004, 0) }, m[0].f)
await b.page.waitForTimeout(5000)
const s = await b.page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
await b.page.screenshot({ path: `${DIR}/forte-3.png` })
console.log("depois da antena", JSON.stringify(s.nucleo), "sinal", s.sinal, "| rádio:", await b.page.locator(".l-hud-radio").textContent())
console.log("erros forte", b.erros)
await browser.close()
