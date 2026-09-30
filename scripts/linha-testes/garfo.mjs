// bifurcação: marca a saída com UM toque e confere se a Kombi entra sozinha
import { chromium } from "playwright-core"

const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = process.env.SHOTS ?? "./shots"
const BASE = "http://localhost:3222"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []
page.on("pageerror", (e) => erros.push("pageerror: " + e.message))
const SAVE = {
  nome: "teste", estacao: "copo", pesos: { copo: 5, sexta: 3 }, objetos: ["copo"], linha: "", xp: 300, dias: [], sinal: 40, freq: "linha",
  completos: ["abertura", "grupo", "copo"], logs: {}, ecosVistos: [], recordes: {}, legado: [], melhorVolta: 0, jogados: {},
  fio: ["copo", "sexta", "dopamina", "chuva", "ontem", "nectar"], perfil: "estrada", itens: [], pausas: { sexta: 7 },
}
await page.addInitScript((s) => {
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  if (!sessionStorage.getItem("ok")) { localStorage.setItem("cn-linha-222", JSON.stringify(s)); sessionStorage.setItem("ok", "1") }
}, SAVE)
await page.goto(`${BASE}/linha`)
await page.waitForTimeout(1500)
await page.click(".l-btn-entrar")
await page.waitForTimeout(800)
console.log("banner:", await page.locator(".l-os-banner").textContent())
await page.click(".l-os-banner")
await page.waitForTimeout(4000)
const st = () => page.evaluate(() => window.__estado())
const L = (await st()).L
console.log("estado inicial", await st(), "hud:", await page.locator(".l-hud-falta").textContent())
// 280m antes da primeira divisão (L-60), a 30 m/s, no meio da pista
await page.evaluate((f) => window.__irPara(f, 0), (L - 60 - 150) / L)
await page.waitForTimeout(1500)
await page.screenshot({ path: `${DIR}/g1-aproxima.png` })
console.log("perto:", await st(), await page.locator(".l-garfo").textContent().catch(() => "sem cartão"))
// UM toque pra direita
await page.keyboard.down("ArrowRight")
await page.waitForTimeout(120)
await page.keyboard.up("ArrowRight")
await page.waitForTimeout(1200)
await page.screenshot({ path: `${DIR}/g2-marcou.png` })
console.log("marcou:", await st(), await page.locator(".l-garfo header").textContent().catch(() => "—"))
for (let k = 0; k < 30; k++) {
  await page.waitForTimeout(1500)
  const e = await st()
  if (!e.via.startsWith("circuito:linha")) { console.log("PEGOU A SAÍDA:", JSON.stringify(e)); break }
  if (k === 29) console.log("não saiu", e)
}
await page.waitForTimeout(1500)
await page.screenshot({ path: `${DIR}/g3-saida.png` })
console.log("hud saída:", await page.locator(".l-hud-falta").textContent(), "|", await page.locator(".l-hud-radio small").textContent())

// segundo teste: marca e desmarca — tem que ficar
await page.evaluate(() => window.__via("linha", 0.5))
await page.waitForTimeout(500)
await page.evaluate((f) => window.__irPara(f, 0), (L - 60 - 150) / L)
await page.waitForTimeout(800)
for (const k of ["ArrowRight", "ArrowLeft"]) { await page.keyboard.down(k); await page.waitForTimeout(100); await page.keyboard.up(k); await page.waitForTimeout(300) }
for (let k = 0; k < 30; k++) {
  await page.waitForTimeout(1500)
  const e = await st()
  if (e.u < 400 || !e.via.startsWith("circuito:linha")) { console.log("desmarcado → depois da divisão:", JSON.stringify(e)); break }
}
console.log("ERROS", erros)
await browser.close()
