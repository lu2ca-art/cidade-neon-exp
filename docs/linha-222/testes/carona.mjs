import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)) })
await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify({ nome: "teste", estacao: "chuva", pesos: {}, objetos: ["copo"], linha: "", xp: 0, dias: [], sinal: 200, freq: "suburbio", completos: ["grupo", "abertura", "copo"], logs: {}, ecosVistos: ["copo"], recordes: {}, legado: [], melhorVolta: 0, jogados: {}, fio: ["sexta", "chuva"], perfil: "estrada", itens: [], pausas: { sexta: 9 }, ligacoes: ["dbee-0", "dbee-1"], modos: { sexta: "texto" }, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 0, acordado: 0 }, reliquias: ["muda"] })) } })
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
const shot = (o) => page.screenshot({ ...o, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const cenaAte = async (nome) => {
  for (let k = 0; k < 160; k++) {
    if (await page.locator(".l-dica3d").count()) { const fez = await page.evaluate(() => (window.__gesto ? (window.__gesto(), true) : false)); if (!fez) for (let i = 0; i < 4; i++) { await page.mouse.click(200, 380); await page.waitForTimeout(140) } await page.waitForTimeout(400); continue }
    if (await page.locator(".l-danca").count()) { await shot({ path: `${DIR}/${nome}-danca.png` }); for (let i = 0; i < 120 && (await page.locator(".l-danca").count()); i++) { await clicar(page.locator(".l-danca")); await page.waitForTimeout(110) } continue }
    if (await page.locator(".l-cena-ganha").count()) { console.log("  ganhou:", (await page.locator(".l-cena-ganha b").innerText())); await shot({ path: `${DIR}/${nome}-ganha.png` }); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
    if (await page.locator(".l-cena-escolhas button").count()) { await page.waitForTimeout(400); await shot({ path: `${DIR}/${nome}-escolha.png` }); await clicar(page.locator(".l-cena-escolhas button").nth(1)); await page.waitForTimeout(400); continue }
    if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); return true }
    await page.mouse.click(200, 400); await page.waitForTimeout(220)
  }
  return false
}
console.log("hud:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
// a casa do Drewboy (subúrbio, esquerda)
await page.evaluate(() => { const f = 560 / 1754; window.__via("suburbio", f); window.__irPara(f, -5); window.__vel(0) })
for (let i = 0; i < 20 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
console.log("cena da casa?", await page.locator(".l-cena").count()); await page.waitForTimeout(1200)
await shot({ path: `${DIR}/dw1-casa.png` })
console.log("fim casa:", await cenaAte("dw-casa"))
await page.waitForTimeout(1500)
let s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
console.log("itens", s.itens, "hud:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
await page.click(".l-hud-cam", { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(1500)
await page.evaluate(() => window.__olhar && window.__olhar(0.9, 0)); await page.waitForTimeout(1800)
await shot({ path: `${DIR}/dw2-banco.png` })
await page.click(".l-hud-cam", { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(800)
// a crise chega no caminho (~25 s)
for (let i = 0; i < 45 && !(await page.locator(".l-painel").count()); i++) await page.waitForTimeout(1000)
console.log("crise no painel?", await page.locator(".l-painel").count(), (await page.locator(".l-painel").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 120))
for (let i = 0; i < 40; i++) { const o = page.locator(".l-painel-ops button"); if (await o.count()) await clicar(o.first()); await page.waitForTimeout(800); s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222"))); if (s.pausas.sexta === 15) break }
console.log("pausa depois da crise:", s.pausas.sexta)
// a balada (cidade neon, direita)
await page.evaluate(() => { const f = 2185 / 3772; window.__via("linha", f); window.__irPara(f, 5); window.__vel(0) })
for (let i = 0; i < 20 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
console.log("cena da balada?", await page.locator(".l-cena").count()); await page.waitForTimeout(1200)
await shot({ path: `${DIR}/dw3-balada.png` })
console.log("fim balada:", await cenaAte("dw-balada"))
await page.waitForTimeout(1500)
s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
console.log("objetos", s.objetos, "reliquias", s.reliquias, "pausas", JSON.stringify(s.pausas), "completos", s.completos)
console.log("ERROS", erros)
await browser.close()
