import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)) })
// 30/10, meio-dia: Ojalá lançada. Ep. 2 já feito (nectar), fase 1 inteira
await page.addInitScript(() => {
  const AGORA = new Date("2026-10-30T12:00:00-03:00").getTime(); const T0 = Date.now(); const real = Date.now.bind(Date)
  Date.now = () => AGORA + (real() - T0)
  localStorage.setItem("cidade-neon-analytics-consent", "essential")
  if (!sessionStorage.getItem("ok")) { sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify({ nome: "teste", estacao: "chuva", pesos: {}, objetos: ["copo", "sexta", "chuva", "dopamina", "ontem", "nectar"], linha: "a chuva também é minha", xp: 0, dias: [], sinal: 400, freq: "linha", completos: ["grupo", "abertura", "copo", "sexta", "chuva", "dopamina", "ontem", "nectar"], logs: {}, ecosVistos: ["copo", "sexta", "chuva", "dopamina", "ontem", "nectar"], recordes: {}, legado: [], melhorVolta: 0, jogados: {}, fio: ["chuva"], perfil: "historia", itens: [], pausas: {}, ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: false, tons: { dormindo: 0, acordando: 1, acordado: 4 }, reliquias: ["muda", "relicario", "espelho", "letra"] })) }
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
// o chamado da D-Bee: a delação no painel
for (let i = 0; i < 40 && !(await page.locator(".l-painel").count()); i++) await page.waitForTimeout(1000)
console.log("painel?", await page.locator(".l-painel").count(), (await page.locator(".l-painel").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200))
await shot({ path: `${DIR}/ep3-delacao.png` })
let s
for (let i = 0; i < 60; i++) { const o = page.locator(".l-painel-ops button"); const n = await o.count(); if (n) await clicar(n >= 3 ? o.nth(2) : o.first()); await page.waitForTimeout(900); s = await save(); if (s.pausas.ojala === 10) break }
console.log("pausa:", s.pausas.ojala, "tons", JSON.stringify(s.tons))
await page.waitForTimeout(2500)
console.log("cinza?", await page.locator(".l-viagem.is-cinza").count(), "| hud:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
await shot({ path: `${DIR}/ep3-cinza.png` })
// a saída da cidade (depois do posto, direita)
await page.evaluate(() => { const f = 3200 / 3772; window.__via("linha", f); window.__irPara(f, 5); window.__vel(5) })
await page.waitForTimeout(1500); await shot({ path: `${DIR}/ep3-saida.png` })
await page.evaluate(() => { const f = 3260 / 3772; window.__irPara(f, 5); window.__vel(0) })
for (let i = 0; i < 20 && !(await page.locator(".l-estrada-fora").count()); i++) await page.waitForTimeout(500)
console.log("viagem?", await page.locator(".l-estrada-fora").count())
await page.waitForTimeout(3000); await shot({ path: `${DIR}/ep3-viagem-1.png` })
await page.mouse.move(200, 400); await page.mouse.down(); await page.waitForTimeout(6000)
await shot({ path: `${DIR}/ep3-viagem-2.png` })
await page.evaluate(() => window.__viagem(700)); await page.waitForTimeout(4000)
await shot({ path: `${DIR}/ep3-viagem-3.png` })
await page.evaluate(() => window.__viagem(1150)); await page.waitForTimeout(5000)
await shot({ path: `${DIR}/ep3-viagem-4.png` })
for (let i = 0; i < 60 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(1000)
await page.mouse.up()
console.log("cena da casa?", await page.locator(".l-cena").count())
await page.waitForTimeout(1500); await shot({ path: `${DIR}/ep3-casa.png` })
for (let k = 0; k < 160; k++) {
  if (await page.locator(".l-cena-ganha").count()) { console.log("  ganhou:", await page.locator(".l-cena-ganha b").innerText()); await shot({ path: `${DIR}/ep3-ganha-${k}.png` }); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
  if (await page.locator(".l-cena-escolhas button").count()) { await clicar(page.locator(".l-cena-escolhas button").nth(2)); await page.waitForTimeout(300); continue }
  if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); console.log("FIM"); break }
  const leg = (await page.locator(".l-cena-legenda").innerText().catch(() => "")).replace(/\s+/g, " ")
  if (leg && leg !== globalThis.ult) { console.log("   ·", leg.slice(0, 90)); globalThis.ult = leg }
  await page.mouse.click(200, 400); await page.waitForTimeout(220)
}
await page.waitForTimeout(3000)
s = await save()
console.log("objetos", s.objetos, "pausas", JSON.stringify(s.pausas))
console.log("cinza depois?", await page.locator(".l-viagem.is-cinza").count())
await shot({ path: `${DIR}/ep3-depois.png` })
console.log("ERROS", erros); await browser.close()
