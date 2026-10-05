import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)) })
// as três missões já aceitas, com as coisas no mapa já pegas (cantil, páginas)
await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify({ nome: "teste", estacao: "chuva", pesos: {}, objetos: ["copo", "sexta"], linha: "", xp: 0, dias: [], sinal: 200, freq: "suburbio", completos: ["grupo", "abertura", "copo", "sexta"], logs: {}, ecosVistos: ["copo", "sexta"], recordes: {}, legado: [], melhorVolta: 0, jogados: {}, fio: ["chuva", "dopamina", "ontem"], perfil: "estrada", itens: ["agua:0", "pagina:0", "pagina:1", "pagina:2"], pausas: { chuva: 19, dopamina: 15, ontem: 15 }, ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 0, acordado: 0 }, reliquias: ["muda", "espelho"] })) } })
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
const log = (...a) => console.log(...a)
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
async function cena(nome) {
  for (let k = 0; k < 160; k++) {
    if (await page.locator(".l-silencio").count()) { log("  silêncio…"); await page.screenshot({ path: `${DIR}/${nome}-silencio.png` }); for (let i = 0; i < 40 && (await page.locator(".l-silencio").count()); i++) await page.waitForTimeout(700); continue }
    if (await page.locator(".l-cena-prova").count()) {
      log("  prova:", (await page.locator(".l-cena-prova").innerText()).replace(/\s+/g, " ").slice(0, 60)); await page.screenshot({ path: `${DIR}/${nome}-prova.png` })
      const pular = page.locator(".l-cena-prova button", { hasText: /pular/i })
      for (let i = 0; i < 30 && (await page.locator(".l-cena-prova").count()); i++) { if (await pular.count()) { await clicar(pular.first()); } await page.waitForTimeout(700) }
      continue
    }
    if (await page.locator(".l-cena-linha input").count()) { await page.fill(".l-cena-linha input", "a chuva também é minha"); await clicar(page.locator(".l-cena-linha button")); log("  escreveu a linha"); continue }
    if (await page.locator(".l-cena-ganha").count()) { log("  ganhou:", await page.locator(".l-cena-ganha b").innerText()); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(300); continue }
    if (await page.locator(".l-cena-escolhas button").count()) { await page.waitForTimeout(400); await clicar(page.locator(".l-cena-escolhas button").nth(2)); await page.waitForTimeout(300); continue }
    if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); return true }
    await page.mouse.click(200, 400); await page.waitForTimeout(200)
  }
  return false
}
for (const [nome, via, u, L, x] of [["ella", "suburbio", 1300, 1754, -5], ["notti", "crypto", 950, 2150, 5], ["alohan", "live", 1250, 2064, 5]]) {
  await page.evaluate(([via, f, x]) => { window.__via(via, f); window.__irPara(f, x); window.__vel(0) }, [via, u / L, x])
  for (let i = 0; i < 24 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
  const abriu = await page.locator(".l-cena").count()
  log(nome, "cena abriu?", abriu, "| hud:", (await page.locator(".l-hud-missao").innerText().catch(() => "-")).replace(/\s+/g, " "))
  if (!abriu) { await page.screenshot({ path: `${DIR}/${nome}-falhou.png` }); continue }
  await page.waitForTimeout(1000); await page.screenshot({ path: `${DIR}/${nome}-cena.png` })
  log(nome, "fim:", await cena(nome))
  await page.waitForTimeout(1500)
}
const s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
log("objetos", s.objetos, "linha:", s.linha, "pausas", JSON.stringify(s.pausas))
log("ERROS", erros)
await browser.close()
