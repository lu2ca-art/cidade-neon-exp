import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const s0 = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 0 }, reliquias: [], objetos: [], completos: ["grupo", "abertura"], ecosVistos: [], fio: ["chuva", "copo", "dopamina", "sexta", "ontem"], pausas: {} }
const b = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await b.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/AudioContext/.test(m.text())) erros.push(m.text().slice(0, 200)) })
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, s0)
const shot = (n) => page.screenshot({ path: `${DIR}/miss-${n}.png`, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000); await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
console.log("botão MISSÕES:", (await page.locator(".l-btn-missoes").innerText().catch(() => "não tem")).replace(/\s+/g, " "))
await clicar(page.locator(".l-btn-missoes")); await page.waitForTimeout(800)
const itens = await page.locator(".l-missoes li").allInnerTexts(); console.log("lista:\n ", itens.map((t) => t.replace(/\s+/g, " ")).join("\n  "))
await page.waitForTimeout(3000); await shot("painel")
console.log("painel:", JSON.stringify(await page.evaluate(() => { const e = document.querySelector(".l-missoes"); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); const topo = document.elementFromPoint(r.x + 30, r.y + 40); return { r: [r.x, r.y, r.width, r.height].map(Math.round), op: cs.opacity, z: cs.zIndex, vis: cs.visibility, topo: topo ? topo.className : null, pai: e.parentElement.className } })))
const antes = await page.evaluate(() => { const e = window.__estado(); return e.via + " " + e.u })
await clicar(page.locator(".l-missoes li", { hasText: "Notti" }).locator("button")); await page.waitForTimeout(2500)
const depois = await page.evaluate(() => { const e = window.__estado(); return e.via + " " + e.u })
console.log("ir agora (Notti):", antes, "→", depois)
for (let i = 0; i < 30 && !(await page.locator(".l-painel").count()); i++) await page.waitForTimeout(1000)
console.log("a Notti chama?", (await page.locator(".l-painel").innerText().catch(() => "não")).replace(/\s+/g, " ").slice(0, 100))
console.log("HUD:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
await shot("depois")
console.log("ERROS", erros); await b.close()
