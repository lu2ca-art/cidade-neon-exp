import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const base = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 0 }, reliquias: [], objetos: [], completos: ["grupo", "abertura"], ecosVistos: [], fio: ["copo"], pausas: { copo: 8 } }
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/AudioContext/.test(m.text())) erros.push(m.text().slice(0, 200)) })
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, base)
const shot = (n) => page.screenshot({ path: `${DIR}/bar2-${n}.png`, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000); await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
const entrar = async () => { await page.evaluate(() => { const f = 1528 / 3772; window.__via("linha", f); window.__irPara(f, 5); window.__vel(0) }); for (let i = 0; i < 24 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500) }
const ate = async (cond, passoMax = 120) => { for (let k = 0; k < passoMax; k++) { if (await cond()) return true; if (await page.locator(".l-cena-escolhas button").count()) { await clicar(page.locator(".l-cena-escolhas button").nth(1)); await page.waitForTimeout(300); continue } await page.mouse.click(200, 400); await page.waitForTimeout(220) } return false }
// ── 1ª visita: beber
await entrar(); console.log("1ª visita, cena?", await page.locator(".l-cena").count(), "| estrada montada durante a sala?", await page.locator(".l-viagem").count(), "(esperado 0)")
await ate(async () => (await page.locator(".l-dica3d").count()) > 0)
console.log("negar logo de cara?", await page.locator(".l-copos-negar").count(), "(esperado 0)")
await page.evaluate(() => window.__beber(2)); await page.waitForTimeout(800)
await ate(async () => (await page.locator(".l-cena-fim button").count()) > 0, 40)
await shot("depois-de-beber"); console.log("botão sair do bar:", (await page.locator(".l-cena-fim button").innerText().catch(() => "-")))
await clicar(page.locator(".l-cena-fim button")); await page.waitForTimeout(2500)
let s = await save(); console.log("loops:", JSON.stringify(s.loops), "| objetos:", s.objetos, "| pausas:", JSON.stringify(s.pausas))
await page.waitForTimeout(3000)
console.log("estrada de volta?", await page.locator(".l-viagem").count(), "| cena reabriu sozinha?", await page.locator(".l-cena").count(), "(esperado 0)")
console.log("posição:", JSON.stringify(await page.evaluate(() => { const e = window.__estado(); return { via: e.via, u: e.u } })))
console.log("mundo repete?", await page.locator(".l-viagem.is-repete").count()); await shot("mundo-repete")
console.log("HUD ainda manda pro bar:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
// ── 2ª visita: negar (vai embora e volta)
await page.evaluate(() => { const f = 1300 / 3772; window.__irPara(f, 0); window.__vel(0) }); await page.waitForTimeout(1500)
await entrar(); console.log("2ª visita, cena?", await page.locator(".l-cena").count())
await ate(async () => (await page.locator(".l-dica3d").count()) > 0)
console.log("negar de cara na volta?", await page.locator(".l-copos-negar").count(), "(esperado 1)")
await shot("volta"); await clicar(page.locator(".l-copos-negar"))
for (let k = 0; k < 100; k++) {
  if (await page.locator(".l-cena-ganha").count()) { console.log("  ganhou:", await page.locator(".l-cena-ganha b").innerText()); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
  if (await page.locator(".l-cena-escolhas button").count()) { await clicar(page.locator(".l-cena-escolhas button").nth(1)); await page.waitForTimeout(300); continue }
  if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); console.log("FIM"); break }
  await page.mouse.click(200, 400); await page.waitForTimeout(220)
}
await page.waitForTimeout(2500); s = await save()
console.log("objetos:", s.objetos, "reliquias:", s.reliquias, "| mundo repete ainda?", await page.locator(".l-viagem.is-repete").count())
console.log("ERROS", erros); await browser.close()
