import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "./shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message))
const SAVE = { nome: "teste", estacao: "copo", pesos: { copo: 5 }, objetos: ["copo"], linha: "", xp: 300, dias: [], sinal: 40, freq: "linha",
  completos: ["abertura", "grupo", "copo"], logs: {}, ecosVistos: [], recordes: {}, legado: [], melhorVolta: 0, jogados: {},
  fio: ["copo", "sexta", "dopamina", "chuva", "ontem", "nectar"], perfil: "estrada", itens: [], pausas: { sexta: 7 } }
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") } }, SAVE)
await page.goto("http://localhost:3222/linha"); await page.waitForTimeout(1500)
await page.click(".l-btn-entrar"); await page.waitForTimeout(4000)
const st = () => page.evaluate(() => window.__estado())
await page.evaluate(() => window.__irPara(0.3, 0)); await page.waitForTimeout(1500)
const antes = await st()
await page.click(".l-hud-cel"); await page.waitForTimeout(600)
await page.screenshot({ path: `${DIR}/s1-celular.png` })
const durante = await st()
await page.waitForTimeout(3000)
const depois3s = await st()
await page.locator(".l-os-dock button").first().click(); await page.waitForTimeout(700)
const volta = await st()
console.log("u antes", antes.u, "| celular aberto", durante.u, "→ 3s depois", depois3s.u, "| ao voltar", volta.u, "| radio src", volta.src)
// impacto: dentro da saída pro subúrbio, perto da metade
await page.evaluate(() => { window.__via("linha>suburbio", 0.5); window.__irPara(0.5, 0) })
const freqs = []
for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(700)
  const e = await st()
  freqs.push(`${e.via.replace("circuito:", "")}@${(e.u / e.L).toFixed(2)} ${await page.locator(".l-hud-freq").textContent()} ${e.src?.split("/").pop()}`)
  if (e.via === "circuito:suburbio") { await page.waitForTimeout(150); await page.screenshot({ path: `${DIR}/s2-chegada.png` }); freqs.push("CHEGOU"); break }
  if (i === 6) await page.evaluate(() => window.__irPara(0.9, 0))
}
console.log(freqs.join("\n"))
await page.waitForTimeout(1500)
console.log("bairro:", await page.locator(".l-bairro").textContent().catch(() => "—"), "| rádio:", await page.locator(".l-hud-radio").textContent())
console.log("ERROS", erros)
await browser.close()
