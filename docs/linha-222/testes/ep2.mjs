import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)) })
// 30/10, meio-dia: Ojalá lançada. Ep. 2 já feito (nectar), fase 1 inteira
await page.addInitScript(() => {
  const AGORA = new Date("2026-10-16T12:00:00-03:00").getTime(); const T0 = Date.now(); const real = Date.now.bind(Date)
  Date.now = () => AGORA + (real() - T0)
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  if (!sessionStorage.getItem("ok")) { sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify({ nome: "teste", estacao: "chuva", pesos: {}, objetos: ["copo", "sexta", "chuva", "dopamina", "ontem"], linha: "a chuva também é minha", xp: 0, dias: [], sinal: 400, freq: "linha", completos: ["grupo", "abertura", "copo", "sexta", "chuva", "dopamina", "ontem"], logs: {}, ecosVistos: ["copo", "sexta", "chuva", "dopamina", "ontem"], recordes: {}, legado: [], melhorVolta: 0, jogados: {}, fio: ["chuva"], perfil: "historia", itens: [], pausas: {}, ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 4 }, reliquias: ["muda", "relicario", "espelho"] })) }
})
const shot = (o) => page.screenshot({ ...o, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
// um trecho quieto da cidade (longe das bifurcações), parado
await page.evaluate(() => { const f = 1550 / 3772; window.__via("linha", f); window.__irPara(f, 0); window.__vel(0) })
console.log("hud:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
const cenaAte = async (nome) => {
  for (let k = 0; k < 200; k++) {
    if (await page.locator(".l-danca").count()) { await shot({ path: `${DIR}/${nome}-danca.png` }); for (let i = 0; i < 150 && (await page.locator(".l-danca").count()); i++) { await clicar(page.locator(".l-danca")); await page.waitForTimeout(140) } continue }
    if (await page.locator(".l-fuga").count()) { await shot({ path: `${DIR}/${nome}-fuga.png` }); for (let i = 0; i < 30 && (await page.locator(".l-fuga").count()); i++) { await clicar(page.locator(".l-fuga")); await page.waitForTimeout(120) } continue }
    if (await page.locator(".l-cena-ganha").count()) { console.log("  ganhou:", await page.locator(".l-cena-ganha b").innerText()); await shot({ path: `${DIR}/${nome}-ganha.png` }); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
    if (await page.locator(".l-cena-escolhas button").count()) { await clicar(page.locator(".l-cena-escolhas button").nth(1)); await page.waitForTimeout(300); continue }
    if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); return true }
    const leg = (await page.locator(".l-cena-legenda").innerText().catch(() => "")).replace(/\s+/g, " ")
    if (leg && leg !== globalThis.ult) { console.log("   ·", leg.slice(0, 90)); globalThis.ult = leg }
    await page.mouse.click(200, 400); await page.waitForTimeout(220)
  }
  return false
}
const painelAte = async (id, alvo) => { let s; for (let i = 0; i < 80; i++) { const o = page.locator(".l-painel-ops button"); const n = await o.count(); if (n) await clicar(n >= 2 ? o.nth(1) : o.first()); await page.waitForTimeout(900); s = await save(); if (s.pausas[id] === alvo) break } return s }
for (let i = 0; i < 40 && !(await page.locator(".l-painel").count()); i++) await page.waitForTimeout(1000)
console.log("painel?", (await page.locator(".l-painel").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 160))
let s = await painelAte("nectar", 5)
console.log("pausa:", s.pausas.nectar)
// o posto
await page.evaluate(() => { const f = 3110 / 3772; window.__via("linha", f); window.__irPara(f, 5); window.__vel(0) })
for (let i = 0; i < 20 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
console.log("cena do posto?", await page.locator(".l-cena").count()); await shot({ path: `${DIR}/ep2-posto.png` })
console.log("fim posto:", await cenaAte("ep2-posto"))
await page.waitForTimeout(1500); s = await save(); console.log("itens", s.itens)
// segue viagem com ele no banco: um trecho quieto (longe das bifurcações)
await page.evaluate(() => { const f = 1550 / 3772; window.__via("linha", f); window.__irPara(f, 0); window.__vel(0) })
// a crise no caminho (~25 s)
for (let i = 0; i < 45 && !(await page.locator(".l-painel").count()); i++) await page.waitForTimeout(1000)
console.log("crise?", (await page.locator(".l-painel").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 120))
s = await painelAte("nectar", 12); console.log("pausa:", s.pausas.nectar)
// a estação 6 (esquerda)
await page.evaluate(() => { const f = 2293 / 3772; window.__via("linha", f); window.__irPara(f, -5); window.__vel(0) })
for (let i = 0; i < 20 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
console.log("cena do vagão?", await page.locator(".l-cena").count()); await shot({ path: `${DIR}/ep2-vagao.png` })
console.log("fim vagão:", await cenaAte("ep2-vagao"))
await page.waitForTimeout(2500)
s = await save()
console.log("objetos", s.objetos, "violao", s.violao, "reliquias", s.reliquias, "pausas", JSON.stringify(s.pausas))
console.log("ERROS", erros); await browser.close()
