import { chromium } from "playwright-core"
const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`
const DIR = "/tmp/linha-shots"
const QUAL = process.argv[2]
const FASE1 = ["copo", "sexta", "chuva", "dopamina", "ontem"]
const base = { nome: "teste", estacao: "chuva", pesos: {}, linha: "", xp: 0, dias: [], sinal: 400, freq: "linha", logs: {}, recordes: {}, legado: [], melhorVolta: 0, jogados: {}, perfil: "estrada", itens: [], ligacoes: ["dbee-0", "dbee-1"], modos: {}, ultimoModo: "texto", nucleo: { invasoes: 9, caido: false }, jardim: [], papel: false, dicas: ["disco-1", "disco-2", "radio-1"], violao: true, tons: { dormindo: 0, acordando: 1, acordado: 3 }, reliquias: ["muda"], completos: ["grupo", "abertura"], ecosVistos: [] }
const S = {
  balada: { save: { objetos: ["copo"], itens: ["carona:sexta"], pausas: { sexta: 15 }, fio: ["sexta"], freq: "linha" }, via: "linha", u: 2185, L: 3772, x: 5 },
  vagao: { save: { objetos: FASE1, itens: ["carona:nectar"], pausas: { nectar: 12 }, fio: ["nectar"], freq: "linha", reliquias: ["muda", "espelho"] }, via: "linha", u: 2293, L: 3772, x: -5 },
  escondido: { save: { objetos: ["copo"], itens: ["agua:0"], pausas: { chuva: 19 }, fio: ["chuva"], freq: "suburbio" }, via: "suburbio", u: 1300, L: 1754, x: -5 },
  beco: { save: { objetos: ["copo", "dopamina"], pausas: {}, fio: ["chuva"], freq: "crypto", tons: { dormindo: 0, acordando: 0, acordado: 3 } }, via: "crypto", u: 1300, L: 2150, x: -5, voltas: 1 },
  topo: { save: { objetos: ["copo"], pausas: { dopamina: 15 }, fio: ["dopamina"], freq: "crypto" }, via: "crypto", u: 950, L: 2150, x: 5 },
  shows: { save: { objetos: ["copo"], itens: ["pagina:0", "pagina:1", "pagina:2"], pausas: { ontem: 15 }, fio: ["ontem"], freq: "live" }, via: "live", u: 1250, L: 2064, x: 5 },
  posto: { save: { objetos: FASE1, pausas: { nectar: 5 }, fio: ["nectar"], freq: "linha" }, via: "linha", u: 3110, L: 3772, x: 5 },
  drewboy: { save: { objetos: ["copo"], pausas: { sexta: 9 }, fio: ["sexta"], freq: "suburbio" }, via: "suburbio", u: 560, L: 1754, x: -5 },
  dbee: { save: { objetos: [...FASE1, "nectar"], pausas: { ojala: 10 }, fio: ["chuva"], freq: "linha", reliquias: ["muda", "relicario", "espelho", "letra"] }, via: "linha", u: 3260, L: 3772, x: 5, viagem: true },
}[QUAL]
const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })
const page = await (await browser.newContext({ viewport: { width: 400, height: 844 } })).newPage()
const erros = []; page.on("pageerror", (e) => erros.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/AudioContext/.test(m.text())) erros.push(m.text().slice(0, 200)) })
await page.addInitScript((s) => { localStorage.setItem("cidade-neon-analytics-consent", "essential"); if (sessionStorage.getItem("ok")) return; sessionStorage.setItem("ok", "1"); localStorage.setItem("cn-linha-cam", "fora"); localStorage.setItem("cn-linha-222", JSON.stringify(s)) }, { ...base, ...S.save, completos: [...base.completos, ...S.save.objetos], ecosVistos: S.save.objetos })
const shot = (nome) => page.screenshot({ path: `${DIR}/s-${QUAL}-${nome}.png`, timeout: 90000 }).catch(() => {})
const clicar = async (loc) => { const bb = await loc.boundingBox().catch(() => null); if (bb) await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2) }
for (let i = 0; i < 60; i++) { try { const r = await page.goto("http://localhost:3222/linha"); if (r && r.ok()) break } catch {} await page.waitForTimeout(2000) }
await page.waitForTimeout(2000)
await page.click(".l-btn-entrar"); await page.waitForTimeout(6000)
if (S.voltas) for (let v = 0; v < S.voltas; v++) { await page.evaluate(([via, f]) => { window.__via(via, f); window.__irPara(f, 0); window.__vel(25) }, [S.via, (S.u - 60) / S.L]); await page.waitForTimeout(9000) }
await page.evaluate(([via, f, x]) => { window.__via(via, f); window.__irPara(f, x); window.__vel(0) }, [S.via, S.u / S.L, S.x])
if (S.viagem) {
  for (let i = 0; i < 20 && !(await page.locator(".l-estrada-fora").count()); i++) await page.waitForTimeout(500)
  await page.mouse.move(200, 400); await page.mouse.down(); await page.evaluate(() => window.__viagem(1250)); await page.waitForTimeout(6000)
  for (let i = 0; i < 60 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(1000)
  await page.mouse.up()
}
for (let i = 0; i < 30 && !(await page.locator(".l-cena").count()); i++) await page.waitForTimeout(500)
console.log("cena?", await page.locator(".l-cena").count(), "sala?", await page.locator(".l-interior").count())
await page.waitForTimeout(3500); await shot("0")
let fotos = 0, gestos = 0
for (let k = 0; k < 260; k++) {
  if (await page.locator(".l-dica3d").count()) {
    const dica = await page.locator(".l-dica3d small").innerText()
    if (gestos++ === 0 || /CORRE/i.test(dica)) await shot(`gesto-${gestos}`)
    // o gesto: um atalho da sala (__gesto) ou tocar na tela
    const fez = await page.evaluate(() => (window.__gesto ? (window.__gesto(), true) : false))
    if (!fez) for (let i = 0; i < 4; i++) { await page.mouse.click(200, 380); await page.waitForTimeout(140) }
    if (gestos % 6 === 1) console.log("  gesto:", dica)
    await page.waitForTimeout(300); continue
  }
  if (await page.locator(".l-silencio").count()) { await shot("silencio"); for (let i = 0; i < 40 && (await page.locator(".l-silencio").count()); i++) await page.waitForTimeout(700); continue }
  if (await page.locator(".l-cena-prova").count()) { await shot(`prova`); const pular = page.locator(".l-cena-prova button", { hasText: /pular/i }); for (let i = 0; i < 30 && (await page.locator(".l-cena-prova").count()); i++) { if (await pular.count()) await clicar(pular.first()); await page.waitForTimeout(700) } continue }
  if (await page.locator(".l-cena-linha input").count()) { await page.fill(".l-cena-linha input", "a chuva também é minha"); await clicar(page.locator(".l-cena-linha button")); continue }
  if (await page.locator(".l-ordem").count()) { for (const c of ["se quiser ver", "pare de procurar", "onde todos olham"]) { await clicar(page.locator(".l-ordem-pedacos button", { hasText: c })); await page.waitForTimeout(300) } await page.waitForTimeout(1800); continue }
  if (await page.locator(".l-danca").count()) { for (let i = 0; i < 120 && (await page.locator(".l-danca").count()); i++) { await clicar(page.locator(".l-danca")); await page.waitForTimeout(140) } continue }
  if (await page.locator(".l-fuga").count()) { for (let i = 0; i < 30 && (await page.locator(".l-fuga").count()); i++) { await clicar(page.locator(".l-fuga")); await page.waitForTimeout(120) } continue }
  if (await page.locator(".l-cena-ganha").count()) { console.log("  ganhou:", await page.locator(".l-cena-ganha b").innerText()); await shot(`ganha-${fotos++}`); await clicar(page.locator(".l-cena-ganha")); await page.waitForTimeout(400); continue }
  if (await page.locator(".l-cena-escolhas button").count()) { await shot("escolha"); await clicar(page.locator(".l-cena-escolhas button").nth(2)); await page.waitForTimeout(300); continue }
  if (await page.locator(".l-cena-fim button").count()) { await shot("fim"); await clicar(page.locator(".l-cena-fim button")); console.log("FIM"); break }
  const leg = (await page.locator(".l-cena-legenda").innerText().catch(() => "")).replace(/\s+/g, " ")
  if (leg && leg !== globalThis.ult) { globalThis.ult = leg; if (k % 3 === 0 && fotos < 30) { await page.waitForTimeout(1200); await shot(`f${k}`) } }
  await page.mouse.click(200, 400); await page.waitForTimeout(240)
}
await page.waitForTimeout(2000)
const sv = await page.evaluate(() => JSON.parse(localStorage.getItem("cn-linha-222")))
console.log("objetos", sv.objetos, "reliquias", sv.reliquias, "pausas", JSON.stringify(sv.pausas))
console.log("ERROS", erros); await browser.close()
