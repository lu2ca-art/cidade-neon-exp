import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error") erros.push(m.text().slice(0, 200)) })
await page.addInitScript(() => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (!sessionStorage.getItem("ok")) { sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify({ nome: "teste", estacao: "chuva", pesos: {}, objetos: ["copo", "dopamina"], linha: "", xp: 0, dias: [], sinal: 200, freq: "crypto", completos: ["grupo", "abertura", "copo", "dopamina"], logs: {}, ecosVistos: ["copo", "dopamina"], recordes: {}, legado: [], melhorVolta: 0, jogados: {}, fio: ["chuva"], perfil: "estrada", itens: [], pausas: {}, ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 0 }, reliquias: ["muda"] })) } })
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
const L = 2150
const tentar = async (rot) => {
  await page.evaluate(([f]) => { window.__via("crypto", f); window.__irPara(f, -5); window.__vel(0) }, [1300 / L])
  for (let i = 0; i < 10 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
  const n = await page.locator(".l-cena").count(); console.log(rot, "cena?", n); return n
}
// acordando = 2 voltas. Antes de passar, o beco não abre
if (await tentar("sem volta")) throw new Error("abriu cedo")
for (let v = 1; v <= 2; v++) {
  await page.evaluate(([f]) => { window.__via("crypto", f); window.__irPara(f, 0); window.__vel(25) }, [1200 / L])
  await page.waitForTimeout(9000)
  console.log("volta", v, "passou")
  if (v === 1 && await tentar("1 volta")) throw new Error("abriu com 1 volta")
}
await page.evaluate(([f]) => { window.__via("crypto", f); window.__irPara(f, -5); window.__vel(4) }, [1220 / L])
await page.waitForTimeout(800); await page.screenshot({ path: `${DIR}/beco-chegando.png` })
if (!(await tentar("2 voltas"))) { console.log("NÃO ABRIU"); }
await page.waitForTimeout(1500); await page.screenshot({ path: `${DIR}/beco-1.png` })
for (let k = 0; k < 120; k++) {
  if (await page.locator(".l-ordem").count()) {
    await page.screenshot({ path: `${DIR}/beco-ordem.png` })
    const b = page.locator(".l-ordem-pedacos button")
    // um erro de propósito, depois a ordem certa
    const txts = await b.allInnerTexts(); console.log("  pedaços:", txts)
    const certa = ["se quiser ver", "pare de procurar", "onde todos olham"]
    await clicar(b.filter({ hasText: certa[2] })); await page.waitForTimeout(500)
    console.log("  depois do erro:", await page.locator(".l-ordem-frase").innerText())
    for (const c of certa) { await clicar(b.filter({ hasText: c })); await page.waitForTimeout(400) }
    await page.screenshot({ path: `${DIR}/beco-ordem-ok.png` })
    await page.waitForTimeout(2000); continue
  }
  if (await page.locator(".l-cena-ganha").count()) { console.log("  ganhou:", await page.locator(".l-cena-ganha b").innerText()); await page.screenshot({ path: `${DIR}/beco-ganha.png` }); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
  if (await page.locator(".l-cena-escolhas button").count()) { await page.waitForTimeout(400); await clicar(page.locator(".l-cena-escolhas button").nth(2)); await page.waitForTimeout(300); continue }
  if (await page.locator(".l-cena-fim button").count()) { await clicar(page.locator(".l-cena-fim button")); console.log("FIM"); break }
  await page.mouse.click(200, 400); await page.waitForTimeout(220)
}
await page.waitForTimeout(1500)
const s = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
console.log("reliquias", s.reliquias, "tons", s.tons, "xp", s.xp)
// depois do relicário o beco não abre mais
console.log("reabre?", await tentar("depois"))
console.log("ERROS", erros); await browser.close()
