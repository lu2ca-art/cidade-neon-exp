import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/private/tmp/claude-501/-Users-lu2ca/aa10520d-08a7-486c-8fbc-6802d684e285/scratchpad/shots"
// o save logo depois da casa da D-Bee (o que o onFim da casa grava)
const s0 = { versao: 2, nome: "Teste", estacao: null, pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: null, itens: [], ligacoes: ["dbee-0", "dbee-1", "dbee-a", "dbee-b"], modos: { copo: "texto" }, ultimoModo: null, nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: {}, reliquias: [], objetos: [], completos: ["grupo", "abertura"], ecosVistos: [], fio: [], pausas: { copo: 9 }, casa: true, foco: "copo", tutorial: ["ouvir", "missoes"], loops: {} }
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] })
const page = await (await b.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/AudioContext|speech/i.test(m.text())) erros.push(m.text().slice(0, 200)) })
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, s0)
const shot = (n) => page.screenshot({ path: `${DIR}/tut2-${n}.png`, timeout: 90000 }).catch(() => {})
const tap = (loc) => loc.first().dispatchEvent("click", {}, { timeout: 4000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.first().boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
const check = async () => (await page.locator(".l-check").innerText().catch(() => "-")).replace(/\s+/g, " ")
const aviso = async () => (await page.locator(".l-aviso").innerText().catch(() => "")).replace(/\s+/g, " ")
const avisos = new Set()
const olhaAviso = async () => { const a = await aviso(); if (a && !avisos.has(a)) { avisos.add(a); console.log("   aviso:", a) } }
// atende ligação e responde, ou anda na conversa do painel
const responder = async () => {
  const lig = page.locator(".l-lig")
  if (await lig.count()) {
    const quem = await page.locator(".l-lig-quem").innerText().catch(() => "")
    if (await page.locator(".l-lig-bts .is-atende").count()) { console.log("   ligação:", quem.replace(/\s+/g, " ")); await tap(page.locator(".l-lig-bts .is-atende")); return true }
    const op = page.locator(".l-lig-op, .l-lig button.l-opcao, .l-lig-ops button")
    if (await op.count()) { console.log("     →", await op.first().innerText()); await tap(op); return true }
    return true
  }
  if (await page.locator(".l-input input").count()) { await page.fill(".l-input input", "Teste"); await page.locator(".l-input").evaluate((f) => f.requestSubmit()); console.log("   digitou o nome"); return true }
  const ops = page.locator(".l-painel-ops button, .l-opcao, .l-tarefa-acoes .l-btn-fim")
  if (await ops.count()) { await tap(ops); return true }
  const sobe = page.locator("button", { hasText: "responder no celular" })
  if (await sobe.count()) { await tap(sobe); return true }
  return false
}
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000); await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
console.log("checklist:", await check()); await shot("1-entrou")
let s
// o bar: negar o copo
await page.evaluate(() => { const f = 1528 / 3772; window.__via("linha", f); window.__irPara(f, 5); window.__vel(0) }); for (let i = 0; i < 30 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
console.log("cena do bar?", await page.locator(".l-cena").count())
for (let k = 0; k < 200; k++) {
  if (await page.locator(".l-copos-negar").count()) { console.log("negou o copo"); await tap(page.locator(".l-copos-negar")); await page.waitForTimeout(400); continue }
  // o gesto dos copos: não tocar na tela (tocar = beber). Espera a saída
  if (await page.locator(".l-dica3d").count()) { await page.waitForTimeout(1000); continue }
  if (await page.locator(".l-cena-ganha").count()) { await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
  if (await page.locator(".l-cena-escolhas button").count()) { await clicar(page.locator(".l-cena-escolhas button").nth(1)); await page.waitForTimeout(300); continue }
  if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); console.log("saiu do bar"); break }
  await page.mouse.click(200, 400); await page.waitForTimeout(220)
}
for (let i = 0; i < 10; i++) { await olhaAviso(); await page.waitForTimeout(800) }
console.log("alguém chamando no painel?", await page.locator(".l-painel").count(), (await page.locator(".l-painel").innerText().catch(() => "")).split("\n")[0]); s = await save(); console.log("objetos:", s.objetos, "| neon:", s.neon, "| checklist:", await check()); await shot("4-acordou")
// bloco 3: a D-Bee fala do neon, compra um disco
for (let i = 0; i < 60; i++) { await responder(); await olhaAviso(); s = await save(); if (s.ligacoes.includes("dbee-c") && !(await page.locator(".l-lig").count())) break; await page.waitForTimeout(700) }
console.log("dbee-c:", s.ligacoes.includes("dbee-c"))
await page.locator(".l-hud-cel").dispatchEvent("click"); await page.locator(".l-os").waitFor({ timeout: 30000 }).catch(() => {})
await tap(page.locator(".l-app", { hasText: "LOJA DE DISCOS" })); await page.waitForTimeout(1200)
await tap(page.locator(".l-loja-grade li", { hasText: "Funky" }).locator("button")); await page.waitForTimeout(600)
await tap(page.locator(".l-loja-btn.is-comprar")); await page.waitForTimeout(600)
for (let i = 0; i < 9; i++) { await olhaAviso(); await page.waitForTimeout(800) }
s = await save(); console.log("discos:", s.discos, "| neon:", s.neon, "| tutorial:", s.tutorial, "| foco:", s.foco)
await tap(page.locator(".l-loja .l-app-topo button").first()); await page.waitForTimeout(800)
await tap(page.locator(".l-os-voltar, .l-home-kombi, button", { hasText: "kombi" })); await page.waitForTimeout(2000)
console.log("checklist depois:", await check(), "| missões abertas:", await page.locator(".l-btn-missoes em").innerText().catch(() => "-"))
await shot("5-fim")
console.log("ERROS", erros); await b.close()
