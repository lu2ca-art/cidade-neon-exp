import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)) })
const base = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 0 }, reliquias: [] }
const QUAL = process.argv[2] || "bar"
await page.addInitScript(([base, QUAL]) => {
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  if (sessionStorage.getItem("ok")) return
  sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora")
  const s = QUAL === "bar"
    ? { ...base, objetos: [], completos: ["grupo", "abertura"], ecosVistos: [], fio: ["copo"], pausas: { copo: 8 } }
    : { ...base, objetos: ["copo", "sexta", "chuva", "dopamina", "ontem", "nectar"], completos: ["grupo", "abertura", "copo", "sexta", "chuva", "dopamina", "ontem", "nectar"], ecosVistos: ["copo", "sexta", "chuva", "dopamina", "ontem", "nectar"], fio: ["chuva"], pausas: {} }
  localStorage.setItem("cn-linha-222", JSON.stringify(s))
}, [base, QUAL])
const shot = (o) => page.screenshot({ ...o, timeout: 90000 }).catch(() => {})
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
if (QUAL === "bar") {
  console.log("hud:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
  await page.evaluate(() => { const f = 1440 / 3772; window.__via("linha", f); window.__irPara(f, -4); window.__vel(4) })
  await page.waitForTimeout(1500); await shot({ path: `${DIR}/passa-pin.png` })
  // passa a toda, na faixa de longe
  await page.evaluate(() => { const f = 1505 / 3772; window.__irPara(f, -5); window.__vel(32) })
  let n = 0; for (let i = 0; i < 40 && !(n = await page.locator(".l-cena").count()); i++) { await page.waitForTimeout(500); if (i % 4 === 0) console.log("  ", JSON.stringify(await page.evaluate(() => { const e = window.__estado(); return { via: e.via, u: e.u, x: e.x, v: e.v } }))) }
  console.log("cena abriu passando a 115 km/h?", n)
  await page.waitForTimeout(2000); await shot({ path: `${DIR}/passa-cena.png` })
} else {
  // sem trava de data: hoje (04/10) o ep. 3 já chama
  await page.evaluate(() => { const f = 1550 / 3772; window.__via("linha", f); window.__irPara(f, 0); window.__vel(0) })
  for (let i = 0; i < 40 && !(await page.locator(".l-painel").count()); i++) await page.waitForTimeout(1000)
  console.log("ep3 chama hoje?", (await page.locator(".l-painel").innerText().catch(() => "nada")).replace(/\s+/g, " ").slice(0, 120))
}
console.log("ERROS", erros); await browser.close()
