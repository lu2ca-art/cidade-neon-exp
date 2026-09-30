import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "./shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
const SAVE = { nome: "teste", estacao: "copo", pesos: { copo: 5 }, objetos: ["copo"], linha: "", xp: 300, dias: [], sinal: 5, freq: "linha",
  completos: ["abertura", "grupo", "copo"], logs: {}, ecosVistos: [], recordes: {}, legado: [], melhorVolta: 0, jogados: {},
  fio: ["copo", "sexta", "dopamina", "chuva", "ontem", "nectar"], perfil: "estrada", itens: [], pausas: {} }
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") } }, SAVE)
await page.goto("http://localhost:3222/linha"); await page.waitForTimeout(1500)
await page.click(".l-btn-entrar"); await page.waitForTimeout(5000)
console.log("na estrada?", await page.locator(".l-viagem").count(), "ícone cel:", await page.locator(".l-hud-cel").textContent())
// perto da estação 4 (sexta), que é a missão (chamado) → botão descer
const est = await page.evaluate(() => window.__estado())
await page.evaluate(() => window.__sinal(1))
await page.screenshot({ path: `${DIR}/c1.png` })
// passa por uma estação qualquer (1ª) e pela 4
const L = est.L
const ests = await page.evaluate(() => window.__estacoes())
for (const e of ests.filter((x) => x.id === "chuva" || x.id === "sexta")) { await page.evaluate((x) => window.__irPara(x, 0), e.f - 0.002); await page.waitForTimeout(2500)
  await page.screenshot({ path: `${DIR}/c-${e.id}.png` })
  console.log("missão:", await page.locator(".l-hud-missao").textContent().catch(() => "—"), "| chegada:", await page.locator(".l-chegada").count())
  const r = await page.locator(".l-hud-radio").textContent(); const d = await page.locator(".l-descer").count(); console.log(e.id, "rádio:", r, "descer:", d) }
await page.waitForTimeout(10000)
await page.screenshot({ path: `${DIR}/c2.png` })
console.log("chegada depois:", await page.locator(".l-chegada").textContent().catch(() => "—"))
await page.click(".l-hud-cel"); await page.waitForTimeout(800)
console.log("abriu celular?", await page.locator(".l-os").count())
await page.locator(".l-os-dock button").first().click(); await page.waitForTimeout(3000)
console.log("voltou pra kombi?", await page.locator(".l-viagem").count())
console.log("ERROS", erros)
await browser.close()
